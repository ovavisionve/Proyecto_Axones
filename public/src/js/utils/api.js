/**
 * API Helper - Sistema Axones
 * Maneja las llamadas al backend de Google Apps Script
 */

const AxonesAPI = {
    // Estado de conexion
    isOnline: false,

    /**
     * Inicializar y verificar conexion
     */
    init: async function() {
        try {
            const result = await this.ping();
            this.isOnline = result.success;
            console.log('API Status:', this.isOnline ? 'Online' : 'Offline');
            return this.isOnline;
        } catch (e) {
            this.isOnline = false;
            return false;
        }
    },

    /**
     * Ping al servidor
     */
    ping: async function() {
        return await this.get('ping');
    },

    /**
     * GET request
     */
    get: async function(action, params = {}) {
        if (!CONFIG.API.BASE_URL) {
            throw new Error('API no configurada');
        }

        const url = new URL(CONFIG.API.BASE_URL);
        url.searchParams.append('action', action);

        Object.keys(params).forEach(key => {
            if (params[key] !== undefined && params[key] !== null) {
                url.searchParams.append(key, params[key]);
            }
        });

        const response = await fetch(url.toString(), {
            method: 'GET',
            redirect: 'follow'
        });

        if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
        }

        return await response.json();
    },

    /**
     * POST via GET (para evitar CORS en Apps Script)
     */
    post: async function(action, data) {
        const url = new URL(CONFIG.API.BASE_URL);
        url.searchParams.append('action', action);
        url.searchParams.append('data', JSON.stringify(data));

        const response = await fetch(url.toString(), {
            method: 'GET',
            redirect: 'follow'
        });

        return await response.json();
    },

    // ==================== AUTENTICACION ====================

    login: async function(usuario, password) {
        return await this.get('login', { usuario, password });
    },

    // ==================== CLIENTES ====================

    getClientes: async function() {
        return await this.get('getClientes');
    },

    // ==================== MAQUINAS ====================

    getMaquinas: async function() {
        return await this.get('getMaquinas');
    },

    // ==================== PRODUCCION ====================

    getProduccion: async function(params = {}) {
        return await this.get('getProduccion', params);
    },

    createProduccion: async function(data) {
        return await this.post('createProduccion', data);
    },

    updateProduccion: async function(id, data) {
        const params = { id, data: JSON.stringify(data) };
        return await this.get('updateProduccion', params);
    },

    // ==================== INVENTARIO ====================

    getInventario: async function(params = {}) {
        return await this.get('getInventario', params);
    },

    createInventario: async function(data) {
        return await this.post('createInventario', data);
    },

    updateInventario: async function(id, data) {
        const params = { id, data: JSON.stringify(data) };
        return await this.get('updateInventario', params);
    },

    // ==================== ALERTAS ====================

    getAlertas: async function(params = {}) {
        return await this.get('getAlertas', params);
    },

    createAlerta: async function(data) {
        return await this.post('createAlerta', data);
    },

    marcarAlertaLeida: async function(id) {
        return await this.get('marcarAlertaLeida', { id });
    },

    // ==================== DESPACHOS ====================

    getDespachos: async function(params = {}) {
        return await this.get('getDespachos', params);
    },

    createDespacho: async function(data) {
        return await this.post('createDespacho', data);
    },

    // ==================== CONSUMO TINTAS ====================

    getConsumoTintas: async function(params = {}) {
        return await this.get('getConsumoTintas', params);
    },

    createConsumoTinta: async function(data) {
        return await this.post('createConsumoTinta', data);
    },

    // ==================== DASHBOARD ====================

    getDashboardData: async function() {
        return await this.get('getDashboardData');
    },

    getResumenProduccion: async function(params = {}) {
        return await this.get('getResumenProduccion', params);
    },

    // ==================== CONFIGURACION ====================

    getConfiguracion: async function() {
        return await this.get('getConfiguracion');
    },

    // ==================== USUARIOS ====================

    getUsuarios: async function() {
        return await this.get('getUsuarios');
    },

    createUsuario: async function(data) {
        return await this.post('createUsuario', data);
    }
};

// Exportar
if (typeof window !== 'undefined') {
    window.AxonesAPI = AxonesAPI;
}
