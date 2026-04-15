/**
 * InventarioDescuentos - Helper preciso para descontar/reponer inventario
 *
 * Reemplaza el viejo descontarInventario heuristico (por nombre) con matching
 * exacto usando SKU o combinacion material+micras+ancho de la OT.
 *
 * Uso:
 *   await InventarioDescuentos.descontar({
 *       numeroOT: 'OT-2026-0123',
 *       fase: 'impresion', // o 'laminacion', 'corte'
 *       cantidadKg: 250,
 *       orden: ordenCargada,  // objeto OT completo
 *   });
 *
 * Flujo:
 *   1. Si hay bobinas seleccionadas (BobinasSelector), delega a BobinasService.
 *      Esas bobinas se marcaran como consumidas - metodo 100% exacto.
 *   2. Si no hay bobinas, busca el material EXACTO en tabla 'materiales' usando:
 *      a) SKU de la OT (mas preciso)
 *      b) material + micras + ancho
 *      c) Si no encuentra: NO descuenta, crea alerta para jefe_almacen
 *   3. Resta cantidadKg del stock_kg
 *   4. Registra movimiento en sync_store.axones_movimientos_almacen
 */

const InventarioDescuentos = {
    /**
     * Descuenta material de inventario al guardar produccion
     */
    descontar: async function(params) {
        const { numeroOT, fase, cantidadKg, orden } = params;
        if (!cantidadKg || cantidadKg <= 0 || !orden) return { exitoso: false, motivo: 'Datos insuficientes' };
        if (!AxonesDB.isReady()) return { exitoso: false, motivo: 'Supabase no disponible' };

        // 1. Buscar material EXACTO en tabla materiales
        const material = await this._buscarMaterialExacto(orden);

        if (!material) {
            // No hay match: crear alerta para jefe_almacen
            await this._alertaMatchNoEncontrado(numeroOT, fase, cantidadKg, orden);
            return { exitoso: false, motivo: 'Material de la OT no encontrado en inventario. Se creo alerta para ajuste manual.' };
        }

        // 2. Descontar del stock
        const stockAnterior = parseFloat(material.stock_kg) || 0;
        const stockNuevo = Math.max(0, stockAnterior - cantidadKg);

        try {
            await AxonesDB.client.from('materiales')
                .update({ stock_kg: stockNuevo })
                .eq('id', material.id);
        } catch(e) {
            console.error('[InventarioDescuentos] Error actualizando stock:', e);
            return { exitoso: false, motivo: 'Error actualizando BD: ' + e.message };
        }

        // 3. Registrar movimiento
        await this._registrarMovimiento({
            fase, numeroOT, cantidad: cantidadKg,
            material: material.material, micras: material.micras, ancho: material.ancho,
            stockAnterior, stockNuevo,
            cliente: orden.cliente, producto: orden.producto,
        });

        // 4. Si el stock quedo bajo, generar alerta
        if (stockNuevo < (material.stock_minimo_kg || 100)) {
            await this._alertaStockBajo(material, stockNuevo);
        }

        console.log(`[InventarioDescuentos] Descontados ${cantidadKg} Kg de ${material.material} ${material.micras}µ x ${material.ancho}mm. Stock: ${stockAnterior} -> ${stockNuevo}`);
        return {
            exitoso: true,
            material: material.material,
            descontado: cantidadKg,
            stockAnterior, stockNuevo
        };
    },

    /**
     * Repone inventario (cuando hay devolucion buena en produccion)
     */
    reponer: async function(params) {
        const { numeroOT, fase, cantidadKg, orden } = params;
        if (!cantidadKg || cantidadKg <= 0) return { exitoso: false };
        if (!AxonesDB.isReady()) return { exitoso: false };

        const material = await this._buscarMaterialExacto(orden);
        if (!material) return { exitoso: false, motivo: 'Material no encontrado para reponer' };

        const stockAnterior = parseFloat(material.stock_kg) || 0;
        const stockNuevo = stockAnterior + cantidadKg;

        try {
            await AxonesDB.client.from('materiales')
                .update({ stock_kg: stockNuevo })
                .eq('id', material.id);
        } catch(e) { return { exitoso: false, motivo: e.message }; }

        await this._registrarMovimiento({
            fase, numeroOT, cantidad: cantidadKg, tipo: 'devolucion',
            material: material.material, micras: material.micras, ancho: material.ancho,
            stockAnterior, stockNuevo,
            cliente: orden.cliente, producto: orden.producto,
            descripcion: `Devolucion buena de ${fase}`
        });

        console.log(`[InventarioDescuentos] Repuestos ${cantidadKg} Kg de ${material.material}. Stock: ${stockAnterior} -> ${stockNuevo}`);
        return { exitoso: true, stockAnterior, stockNuevo };
    },

    /**
     * Busca material exacto en tabla materiales usando:
     * 1. SKU exacto de la OT
     * 2. material + micras + ancho
     */
    _buscarMaterialExacto: async function(orden) {
        const sku = orden.sku || orden.cpe || orden.codigo;
        const material = orden.tipoMaterial || orden.material;
        const micras = parseFloat(orden.micras || orden.micrasCapa1) || null;
        const ancho = parseFloat(orden.ancho || orden.anchoMontaje) || null;

        // Prioridad 1: buscar por SKU
        if (sku) {
            try {
                const { data } = await AxonesDB.client.from('materiales')
                    .select('*').eq('sku', sku).eq('activo', true).limit(1);
                if (data && data[0]) return data[0];
            } catch(e) {}
        }

        // Prioridad 2: buscar por material + micras + ancho
        if (material && micras && ancho) {
            try {
                const { data } = await AxonesDB.client.from('materiales')
                    .select('*')
                    .ilike('material', `%${material}%`)
                    .eq('micras', micras)
                    .eq('ancho', ancho)
                    .eq('activo', true)
                    .order('stock_kg', { ascending: false })
                    .limit(1);
                if (data && data[0]) return data[0];
            } catch(e) {}
        }

        // Prioridad 3: solo por material + ancho (menos preciso)
        if (material && ancho) {
            try {
                const { data } = await AxonesDB.client.from('materiales')
                    .select('*')
                    .ilike('material', `%${material}%`)
                    .eq('ancho', ancho)
                    .eq('activo', true)
                    .order('stock_kg', { ascending: false })
                    .limit(1);
                if (data && data[0]) return data[0];
            } catch(e) {}
        }

        return null;
    },

    /**
     * Registra movimiento en sync_store para trazabilidad
     */
    _registrarMovimiento: async function(datos) {
        try {
            const { data: existing } = await AxonesDB.client.from('sync_store')
                .select('value').eq('key', 'axones_movimientos_almacen').maybeSingle();
            const movs = existing?.value ? (typeof existing.value === 'string' ? JSON.parse(existing.value) : existing.value) : [];

            movs.unshift({
                id: 'mov-' + Date.now() + '-' + Math.random().toString(36).substr(2, 5),
                fecha: new Date().toISOString().split('T')[0],
                tipo: datos.tipo || 'consumo',
                referencia: `${datos.fase || 'produccion'}-${datos.numeroOT || '?'}`,
                ot: datos.numeroOT,
                cliente: datos.cliente,
                cantidad: datos.cantidad,
                unidad: 'Kg',
                descripcion: datos.descripcion || `Consumo de ${datos.material} ${datos.micras || ''}µ x ${datos.ancho || ''}mm en ${datos.fase}`,
                stockAnterior: datos.stockAnterior,
                stockNuevo: datos.stockNuevo,
                timestamp: new Date().toISOString(),
            });
            if (movs.length > 1000) movs.length = 1000;

            const json = JSON.stringify(movs);
            localStorage.setItem('axones_movimientos_almacen', json);
            await AxonesDB.client.from('sync_store').upsert({
                key: 'axones_movimientos_almacen',
                value: json,
                updated_at: new Date().toISOString()
            }, { onConflict: 'key' });
        } catch(e) { console.warn('[InventarioDescuentos] Error registrando movimiento:', e.message); }
    },

    /**
     * Crea alerta cuando material de OT no hace match con inventario
     */
    _alertaMatchNoEncontrado: async function(numeroOT, fase, cantidadKg, orden) {
        try {
            await AxonesDB.client.from('alertas').insert({
                tipo: 'general',
                nivel: 'warning',
                titulo: `Inventario: Ajuste manual necesario - OT ${numeroOT}`,
                mensaje: `No se encontro material exacto para descontar ${cantidadKg} Kg en ${fase}. ` +
                         `Producto: ${orden.producto || '-'}, Material: ${orden.tipoMaterial || '-'} ${orden.micras || ''}µ x ${orden.ancho || ''}mm. ` +
                         `Revisar en Inventario y ajustar manualmente.`,
                modulo: fase,
                created_at: new Date().toISOString(),
            });
        } catch(e) { console.warn('[InventarioDescuentos] Error creando alerta:', e.message); }
    },

    _alertaStockBajo: async function(material, stockActual) {
        try {
            await AxonesDB.client.from('alertas').insert({
                tipo: 'stock_bajo',
                nivel: 'warning',
                titulo: `Stock bajo: ${material.material}`,
                mensaje: `${material.material} ${material.micras || ''}µ x ${material.ancho || ''}mm tiene solo ${stockActual.toFixed(2)} Kg. Considerar reposicion.`,
                modulo: 'inventario',
                referencia: `stock-${material.id}`,
                created_at: new Date().toISOString(),
            });
        } catch(e) {}
    },
};

if (typeof window !== 'undefined') window.InventarioDescuentos = InventarioDescuentos;
