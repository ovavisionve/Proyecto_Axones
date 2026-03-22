/**
 * MIGRACION localStorage -> Supabase
 * Ejecutar una sola vez desde la consola del navegador:
 *   await MigracionSupabase.ejecutar();
 */

const MigracionSupabase = {
    log: [],

    _log: function(msg) {
        console.log('[Migracion]', msg);
        this.log.push(msg);
    },

    /**
     * Ejecutar migracion completa
     */
    ejecutar: async function() {
        if (!AxonesDB.isReady()) {
            alert('Supabase no esta configurado. Configura SUPABASE_CONFIG en supabase-client.js');
            return;
        }

        this.log = [];
        this._log('=== INICIO MIGRACION ===');

        try {
            await this.migrarInventario();
            await this.migrarClientes();
            await this.migrarOrdenes();
            await this.migrarProduccion();

            this._log('=== MIGRACION COMPLETADA ===');
            console.table(this.log);
            alert('Migracion completada. Ver consola para detalles.');
        } catch (error) {
            this._log('ERROR: ' + error.message);
            console.error('Error en migracion:', error);
            alert('Error en migracion: ' + error.message);
        }
    },

    /**
     * Migrar inventario de materiales (158 productos)
     */
    migrarInventario: async function() {
        this._log('--- Migrando inventario ---');

        const inventario = JSON.parse(localStorage.getItem('axones_inventario') || '[]');
        if (inventario.length === 0) {
            this._log('No hay inventario en localStorage');
            return;
        }

        let migrados = 0;
        let errores = 0;

        for (const item of inventario) {
            try {
                await AxonesDB.client.from('materiales').upsert({
                    sku: item.sku || item.id,
                    codigo_barras: item.codigoBarra || item.codigoBarras,
                    material: item.material || item.tipo,
                    tipo: item.tipo || item.material,
                    micras: parseFloat(item.micras) || null,
                    ancho: parseFloat(item.ancho) || null,
                    densidad: parseFloat(item.densidad) || 0.90,
                    stock_kg: parseFloat(item.cantidad || item.stockKg || item.kg) || 0,
                    activo: true
                }, { onConflict: 'sku' });
                migrados++;
            } catch (e) {
                errores++;
                this._log(`Error migrando material ${item.sku}: ${e.message}`);
            }
        }

        this._log(`Inventario: ${migrados} migrados, ${errores} errores de ${inventario.length} total`);
    },

    /**
     * Migrar clientes (extraer de ordenes existentes)
     */
    migrarClientes: async function() {
        this._log('--- Migrando clientes ---');

        // Extraer clientes unicos de las ordenes
        const ordenes = JSON.parse(localStorage.getItem('axones_ordenes_trabajo') || '[]');
        const clientesUnicos = new Map();

        ordenes.forEach(o => {
            if (o.cliente && !clientesUnicos.has(o.cliente)) {
                clientesUnicos.set(o.cliente, {
                    nombre: o.cliente,
                    activo: true
                });
            }
        });

        // Agregar clientes de memoria
        const memoria = JSON.parse(localStorage.getItem('axones_clientes_memoria') || '[]');
        memoria.forEach(c => {
            const nombre = typeof c === 'string' ? c : c.nombre;
            if (nombre && !clientesUnicos.has(nombre)) {
                clientesUnicos.set(nombre, {
                    nombre: nombre,
                    rif: c.rif || null,
                    telefono: c.telefono || null,
                    activo: true
                });
            }
        });

        let migrados = 0;
        for (const [, cliente] of clientesUnicos) {
            try {
                await AxonesDB.clientes.crear(cliente);
                migrados++;
            } catch (e) {
                // Puede ser duplicado, ignorar
            }
        }

        this._log(`Clientes: ${migrados} migrados de ${clientesUnicos.size} unicos`);
    },

    /**
     * Migrar ordenes de trabajo
     */
    migrarOrdenes: async function() {
        this._log('--- Migrando ordenes ---');

        const ordenes = JSON.parse(localStorage.getItem('axones_ordenes_trabajo') || '[]');
        if (ordenes.length === 0) {
            this._log('No hay ordenes en localStorage');
            return;
        }

        let migrados = 0;
        for (const o of ordenes) {
            try {
                await AxonesDB.client.from('ordenes_trabajo').upsert({
                    numero_ot: o.ot || o.numeroOrden,
                    cliente_nombre: o.cliente,
                    producto: o.producto,
                    pedido_kg: parseFloat(o.pedidoKg) || null,
                    cpe: o.cpe,
                    codigo_barra: o.codigoBarra,
                    estructura_material: o.estructuraMaterial,
                    prioridad: o.prioridad || 'normal',
                    estado: o.estadoOrden || o.estado || 'pendiente',
                    tipo_material: o.tipoMaterial,
                    micras_material: parseFloat(o.micrasMaterial) || null,
                    ancho_material: parseFloat(o.anchoMaterial) || null,
                    frecuencia: parseFloat(o.frecuencia) || null,
                    ancho_corte: parseFloat(o.anchoCorte) || null,
                    num_bandas: parseInt(o.numBandas) || null,
                    desarrollo: parseFloat(o.desarrollo) || null,
                    tipo_impresion: o.tipoImpresion,
                    pinon: parseFloat(o.pinon) || null,
                    figura_embobinado_lam: o.figuraEmbobinadoLam,
                    gramaje_adhesivo: o.gramajeAdhesivo,
                    relacion_mezcla: o.relacionMezcla,
                    ancho_corte_final: parseFloat(o.anchoCorteFinal) || null,
                    tipo_empalme: o.tipoEmpalme,
                    peso_bobina: parseFloat(o.pesoBobina) || null,
                    diametro_core: o.diametroCore,
                    ficha_tipo_mat1: o.fichaTipoMat1,
                    ficha_micras1: parseFloat(o.fichaMicras1) || null,
                    ficha_densidad1: parseFloat(o.fichaDensidad1) || null,
                    ficha_kg1: parseFloat(o.fichaKg1) || null,
                    ficha_tipo_adhesivo: o.fichaTipoAdhesivo,
                    ficha_gramaje_adhesivo: o.fichaGramajeAdhesivo,
                    ficha_kg_adhesivo: parseFloat(o.fichaKgAdhesivo) || null,
                    ficha_kg_catalizador: parseFloat(o.fichaKgCatalizador) || null,
                    ficha_tipo_mat2: o.fichaTipoMat2,
                    ficha_micras2: parseFloat(o.fichaMicras2) || null,
                    fecha_inicio: o.fechaInicio || null,
                    fecha_entrega: o.fechaEntrega || null,
                    observaciones_generales: o.observacionesGenerales
                }, { onConflict: 'numero_ot' });
                migrados++;
            } catch (e) {
                this._log(`Error migrando OT ${o.ot}: ${e.message}`);
            }
        }

        this._log(`Ordenes: ${migrados} migradas de ${ordenes.length} total`);
    },

    /**
     * Migrar registros de produccion
     */
    migrarProduccion: async function() {
        this._log('--- Migrando produccion ---');

        const produccion = JSON.parse(localStorage.getItem('axones_produccion') || '[]');

        let impMigrados = 0, lamMigrados = 0, corteMigrados = 0;

        for (const p of produccion) {
            try {
                if (p.tipo === 'impresion') {
                    await AxonesDB.client.from('produccion_impresion').insert({
                        numero_ot: p.ordenTrabajo,
                        fecha: p.fecha || null,
                        turno: p.turno,
                        maquina: p.maquina,
                        operador: p.operador,
                        bobinas_entrada: p.materialesEntrada || [],
                        total_entrada: p.totalMaterialEntrada || p.totalEntrada || 0,
                        bobinas_salida: p.bobinasSalida || [],
                        total_scrap: p.totalScrap || 0,
                        merma: p.merma || 0,
                        metraje: p.metraje || 0,
                        observaciones: p.observaciones,
                        registrado_por_nombre: p.registradoPorNombre
                    });
                    impMigrados++;
                } else if (p.tipo === 'laminacion') {
                    await AxonesDB.client.from('produccion_laminacion').insert({
                        numero_ot: p.ordenTrabajo,
                        fecha: p.fecha || null,
                        turno: p.turno,
                        maquina: p.maquina,
                        operador: p.operador,
                        bobinas_entrada: p.bobinasEntrada || [],
                        total_entrada: p.totalEntrada || 0,
                        bobinas_virgen: p.bobinasVirgen || [],
                        total_entrada_virgen: p.totalEntradaVirgen || 0,
                        consumo_adhesivo: p.consumoAdhesivo || 0,
                        consumo_catalizador: p.consumoCatalizador || 0,
                        consumo_acetato: p.consumoAcetato || 0,
                        bobinas_salida: p.bobinasSalida || [],
                        total_scrap: p.totalScrap || 0,
                        merma: p.merma || 0,
                        observaciones: p.observaciones,
                        registrado_por_nombre: p.registradoPorNombre
                    });
                    lamMigrados++;
                } else if (p.tipo === 'corte') {
                    await AxonesDB.client.from('produccion_corte').insert({
                        numero_ot: p.ordenTrabajo,
                        fecha: p.fecha || null,
                        turno: p.turno,
                        maquina: p.maquina,
                        operador: p.operador,
                        bobinas_entrada: p.bobinasEntrada || [],
                        total_entrada: p.totalEntrada || 0,
                        paletas: p.paletas || [],
                        total_scrap: p.totalScrap || 0,
                        merma: p.merma || 0,
                        observaciones: p.observaciones,
                        registrado_por_nombre: p.registradoPorNombre
                    });
                    corteMigrados++;
                }
            } catch (e) {
                this._log(`Error migrando produccion ${p.id}: ${e.message}`);
            }
        }

        this._log(`Produccion: Impresion=${impMigrados}, Laminacion=${lamMigrados}, Corte=${corteMigrados}`);
    }
};

window.MigracionSupabase = MigracionSupabase;
