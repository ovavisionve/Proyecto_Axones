/**
 * Servicio de Memoria de Clientes - Sistema Axones
 * Aprende de ordenes anteriores para sugerir datos automaticamente
 */

const ClienteMemoria = {
    STORAGE_KEY: 'axones_cliente_memoria',

    /**
     * Obtiene la memoria guardada
     */
    _memoriaCache: null,

    getMemoria: function() {
        return this._memoriaCache || {};
    },

    /**
     * Carga la memoria desde Supabase
     */
    loadMemoria: async function() {
        try {
            const { data } = await AxonesDB.client.from('sync_store').select('value').eq('key', this.STORAGE_KEY).single();
            this._memoriaCache = (data && data.value) ? (typeof data.value === 'string' ? JSON.parse(data.value) : data.value) : {};
        } catch (e) {
            this._memoriaCache = {};
        }
        return this._memoriaCache;
    },

    /**
     * Guarda la memoria en Supabase
     */
    saveMemoria: async function(memoria) {
        this._memoriaCache = memoria;
        try {
            await AxonesDB.client.from('sync_store').upsert({ key: this.STORAGE_KEY, value: memoria, updated_at: new Date().toISOString() }, { onConflict: 'key' });
        } catch (e) {
            console.warn('ClienteMemoria: Error guardando en Supabase', e);
        }
    },

    /**
     * Aprende de una orden guardada
     */
    aprenderDeOrden: async function(orden) {
        if (!orden.cliente) return;

        const memoria = this.getMemoria();
        const cliente = orden.cliente;

        if (!memoria[cliente]) {
            memoria[cliente] = {
                productos: {},
                materiales: {},
                tintas: {},
                configuraciones: [],
                ultimaOrden: null
            };
        }

        // Registrar producto
        if (orden.producto) {
            if (!memoria[cliente].productos[orden.producto]) {
                memoria[cliente].productos[orden.producto] = {
                    count: 0,
                    ultimaConfig: {}
                };
            }
            memoria[cliente].productos[orden.producto].count++;
            memoria[cliente].productos[orden.producto].ultimaConfig = {
                cpe: orden.cpe,
                mpps: orden.mpps,
                codigoBarra: orden.codigoBarra,
                estructuraMaterial: orden.estructuraMaterial,
                tipoMaterial: orden.tipoMaterial,
                micrasMaterial: orden.micrasMaterial,
                anchoMaterial: orden.anchoMaterial,
                frecuencia: orden.frecuencia,
                desarrollo: orden.desarrollo,
                numColores: orden.numColores,
                tintas: orden.tintas
            };
        }

        // Registrar material preferido
        if (orden.tipoMaterial) {
            const materialKey = `${orden.tipoMaterial}-${orden.micrasMaterial || ''}-${orden.anchoMaterial || ''}`;
            memoria[cliente].materiales[materialKey] = (memoria[cliente].materiales[materialKey] || 0) + 1;
        }

        // Registrar configuracion completa (ultimas 10)
        const config = {
            fecha: new Date().toISOString(),
            producto: orden.producto,
            maquina: orden.maquina,
            tipoMaterial: orden.tipoMaterial,
            micrasMaterial: orden.micrasMaterial,
            anchoMaterial: orden.anchoMaterial,
            frecuencia: orden.frecuencia,
            desarrollo: orden.desarrollo,
            numColores: orden.numColores,
            numBandas: orden.numBandas,
            anchoCorte: orden.anchoCorte,
            tintas: orden.tintas
        };

        memoria[cliente].configuraciones.unshift(config);
        if (memoria[cliente].configuraciones.length > 10) {
            memoria[cliente].configuraciones = memoria[cliente].configuraciones.slice(0, 10);
        }

        memoria[cliente].ultimaOrden = new Date().toISOString();

        await this.saveMemoria(memoria);
        console.log(`ClienteMemoria: Aprendido de orden para ${cliente}`);
    },

    /**
     * Obtiene sugerencias para un cliente
     */
    getSugerencias: function(cliente) {
        const memoria = this.getMemoria();
        if (!memoria[cliente]) {
            return null;
        }

        const clienteData = memoria[cliente];

        // Productos mas frecuentes
        const productosOrdenados = Object.entries(clienteData.productos)
            .sort((a, b) => b[1].count - a[1].count)
            .slice(0, 5)
            .map(([nombre, data]) => ({
                nombre,
                count: data.count,
                config: data.ultimaConfig
            }));

        // Materiales mas usados
        const materialesOrdenados = Object.entries(clienteData.materiales)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 3)
            .map(([key, count]) => {
                const [tipo, micras, ancho] = key.split('-');
                return { tipo, micras, ancho, count };
            });

        return {
            productos: productosOrdenados,
            materiales: materialesOrdenados,
            ultimasConfiguraciones: clienteData.configuraciones.slice(0, 3),
            ultimaOrden: clienteData.ultimaOrden
        };
    },

    /**
     * Obtiene la configuracion de un producto especifico
     */
    getConfigProducto: function(cliente, producto) {
        const memoria = this.getMemoria();
        if (!memoria[cliente] || !memoria[cliente].productos[producto]) {
            return null;
        }
        return memoria[cliente].productos[producto].ultimaConfig;
    },

    /**
     * Obtiene lista de productos conocidos para un cliente
     */
    getProductosCliente: function(cliente) {
        const memoria = this.getMemoria();
        if (!memoria[cliente]) return [];

        return Object.entries(memoria[cliente].productos)
            .sort((a, b) => b[1].count - a[1].count)
            .map(([nombre, data]) => nombre);
    },

    /**
     * Reconstruye memoria desde ordenes existentes
     */
    reconstruirDesdeOrdenes: async function() {
        try {
            const ordenes = await AxonesDB.ordenesHelper.cargar() || [];
            for (const orden of ordenes) {
                await this.aprenderDeOrden(orden);
            }
            console.log(`ClienteMemoria: Reconstruida desde ${ordenes.length} ordenes`);
        } catch (e) {
            console.warn('Error reconstruyendo memoria:', e);
        }
    },

    /**
     * Limpia memoria de un cliente
     */
    limpiarCliente: async function(cliente) {
        const memoria = this.getMemoria();
        delete memoria[cliente];
        await this.saveMemoria(memoria);
    },

    /**
     * Obtiene estadisticas generales
     */
    getEstadisticas: function() {
        const memoria = this.getMemoria();
        const clientes = Object.keys(memoria);

        return {
            totalClientes: clientes.length,
            clientes: clientes.map(c => ({
                nombre: c,
                productos: Object.keys(memoria[c].productos).length,
                ordenes: memoria[c].configuraciones.length,
                ultimaOrden: memoria[c].ultimaOrden
            }))
        };
    }
};

// Exportar globalmente
if (typeof window !== 'undefined') {
    window.ClienteMemoria = ClienteMemoria;
}
