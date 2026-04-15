/**
 * BobinasService - Sistema Axones
 * Helper para gestionar bobinas como entidades unicas.
 *
 * Uso:
 *   const bob = await BobinasService.crear({ material: 'BOPP NORMAL', peso_inicial_kg: 250, proveedor: 'Siplast' });
 *   await BobinasService.asignarAOT(bobinaId, 'OT-2026-0123');
 *   await BobinasService.consumir(bobinaId, { fase: 'impresion' });
 *   await BobinasService.rechazar(bobinaId, 'Bordes dañados');
 *   const stock = await BobinasService.listarDisponibles({ material: 'BOPP NORMAL' });
 *
 * Estados:
 *   - disponible : esta en almacen, lista para usar
 *   - reservada  : asignada a una OT pero aun no se uso
 *   - en_uso     : actualmente siendo procesada
 *   - consumida  : se uso completamente
 *   - rechazada  : no sirve para produccion normal (puede usarse para calibrar)
 *   - devuelta   : material devuelto al proveedor
 *   - despachada : producto terminado entregado al cliente
 *   - muerta     : tinta muerta que no se va a usar mas
 */

const BobinasService = {
    ESTADOS: {
        DISPONIBLE: 'disponible',
        RESERVADA: 'reservada',
        EN_USO: 'en_uso',
        CONSUMIDA: 'consumida',
        RECHAZADA: 'rechazada',
        DEVUELTA: 'devuelta',
        DESPACHADA: 'despachada',
        MUERTA: 'muerta',
    },

    TIPOS: {
        SUSTRATO: 'sustrato',
        TINTA: 'tinta',
        QUIMICO: 'quimico',
        PRODUCTO_TERMINADO: 'producto_terminado',
    },

    /** Crea una bobina nueva (recepcion de material) */
    crear: async function(datos) {
        if (!AxonesDB.isReady()) throw new Error('Supabase no inicializado');

        const bobina = {
            tipo: datos.tipo || 'sustrato',
            material: datos.material || null,
            micras: datos.micras || null,
            ancho_mm: datos.ancho_mm || datos.ancho || null,
            sku: datos.sku || null,
            peso_inicial_kg: parseFloat(datos.peso_inicial_kg || datos.peso || 0),
            peso_actual_kg: parseFloat(datos.peso_inicial_kg || datos.peso || 0),
            proveedor: datos.proveedor || null,
            orden_compra: datos.orden_compra || null,
            referencia_proveedor: datos.referencia_proveedor || datos.ref_proveedor || null,
            factura_recepcion: datos.factura || datos.factura_recepcion || null,
            fecha_recepcion: datos.fecha_recepcion || new Date().toISOString().split('T')[0],
            tratamiento_interno: datos.tratamiento_interno || null,
            tratamiento_externo: datos.tratamiento_externo || null,
            estado: 'disponible',
            observaciones: datos.observaciones || null,
            created_by: datos.created_by || null,
        };

        const { data, error } = await AxonesDB.client
            .from('bobinas')
            .insert(bobina)
            .select()
            .single();

        if (error) { console.error('BobinasService: Error creando bobina:', error); throw error; }
        return data;
    },

    /** Crea N bobinas iguales (util en recepcion) */
    crearLote: async function(datos, cantidad) {
        const bobinas = [];
        for (let i = 0; i < cantidad; i++) {
            try {
                const b = await this.crear(datos);
                bobinas.push(b);
            } catch(e) { console.error('BobinasService: Error en lote item', i, e); }
        }
        return bobinas;
    },

    /** Lista bobinas con filtros opcionales */
    listar: async function(filtros = {}) {
        if (!AxonesDB.isReady()) return [];
        let q = AxonesDB.client.from('bobinas').select('*');
        if (filtros.estado) q = q.eq('estado', filtros.estado);
        if (filtros.tipo) q = q.eq('tipo', filtros.tipo);
        if (filtros.material) q = q.ilike('material', `%${filtros.material}%`);
        if (filtros.orden_trabajo) q = q.eq('orden_trabajo', filtros.orden_trabajo);
        if (filtros.proveedor) q = q.eq('proveedor', filtros.proveedor);
        if (filtros.orden_compra) q = q.eq('orden_compra', filtros.orden_compra);
        q = q.order('created_at', { ascending: false });
        if (filtros.limit) q = q.limit(filtros.limit);
        const { data, error } = await q;
        if (error) { console.error('BobinasService: Error listando:', error); return []; }
        return data || [];
    },

    /** Bobinas disponibles de un material (para seleccionar al arrancar produccion) */
    listarDisponibles: async function(filtros = {}) {
        return this.listar({ ...filtros, estado: 'disponible' });
    },

    /** Obtiene una bobina por ID o codigo */
    obtener: async function(idOrCodigo) {
        if (!AxonesDB.isReady()) return null;
        const esUuid = /^[0-9a-f-]{36}$/i.test(idOrCodigo);
        const { data } = esUuid
            ? await AxonesDB.client.from('bobinas').select('*').eq('id', idOrCodigo).maybeSingle()
            : await AxonesDB.client.from('bobinas').select('*').eq('codigo', idOrCodigo).maybeSingle();
        return data;
    },

    /** Cambia el estado de una bobina */
    cambiarEstado: async function(id, nuevoEstado, extra = {}) {
        if (!AxonesDB.isReady()) throw new Error('Supabase no inicializado');
        const update = { estado: nuevoEstado, ...extra };
        const { data, error } = await AxonesDB.client
            .from('bobinas').update(update).eq('id', id).select().single();
        if (error) throw error;
        return data;
    },

    /** Asigna bobina a una OT (reservada) */
    asignarAOT: async function(id, numeroOT, fase) {
        return this.cambiarEstado(id, 'reservada', {
            orden_trabajo: numeroOT,
            fase_produccion: fase || null,
            fecha_asignacion: new Date().toISOString(),
        });
    },

    /** Marca bobina como en_uso cuando arranca produccion */
    iniciarUso: async function(id, fase) {
        return this.cambiarEstado(id, 'en_uso', { fase_produccion: fase });
    },

    /** Marca bobina como consumida (se uso completamente) */
    consumir: async function(id, datos = {}) {
        return this.cambiarEstado(id, 'consumida', {
            peso_actual_kg: 0,
            fecha_consumo: new Date().toISOString(),
            fase_produccion: datos.fase || null,
        });
    },

    /** Marca bobina como rechazada */
    rechazar: async function(id, motivo) {
        return this.cambiarEstado(id, 'rechazada', {
            motivo_rechazo: motivo || 'Sin motivo especificado',
        });
    },

    /** Devolucion al proveedor */
    devolver: async function(id, motivo) {
        return this.cambiarEstado(id, 'devuelta', {
            motivo_rechazo: motivo,
        });
    },

    /** Marca bobina como despachada (producto terminado entregado) */
    despachar: async function(id, numeroND) {
        return this.cambiarEstado(id, 'despachada', {
            despacho_numero: numeroND,
        });
    },

    /** Actualiza peso actual (para devoluciones parciales) */
    actualizarPeso: async function(id, nuevoPeso) {
        return this.cambiarEstado(id, null, {
            peso_actual_kg: parseFloat(nuevoPeso),
        });
    },

    /** Stock agregado por material */
    stockPorMaterial: async function() {
        if (!AxonesDB.isReady()) return [];
        const { data } = await AxonesDB.client.from('vista_stock_bobinas').select('*');
        return data || [];
    },

    /** Historial de una bobina */
    historialBobina: async function(bobinaId) {
        if (!AxonesDB.isReady()) return [];
        const { data } = await AxonesDB.client
            .from('bobinas_historial')
            .select('*')
            .eq('bobina_id', bobinaId)
            .order('timestamp', { ascending: false });
        return data || [];
    },

    /** Historial completo por OT */
    historialOT: async function(numeroOT) {
        if (!AxonesDB.isReady()) return [];
        const { data } = await AxonesDB.client
            .from('bobinas_historial')
            .select('*')
            .eq('orden_trabajo', numeroOT)
            .order('timestamp', { ascending: false });
        return data || [];
    },

    /** Format label de bobina para mostrar en selectors */
    formatLabel: function(b) {
        return `${b.codigo} | ${b.material || ''} ${b.micras || ''}µ x ${b.ancho_mm || ''}mm | ${b.peso_actual_kg}Kg${b.proveedor ? ' | ' + b.proveedor : ''}`;
    },
};

// Expose globally
if (typeof window !== 'undefined') window.BobinasService = BobinasService;
