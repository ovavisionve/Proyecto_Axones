/**
 * API Helper - Sistema Axones
 * Maneja las llamadas al backend de Google Apps Script
 * Incluye cache-busting y timeout para evitar problemas con deployments cacheados
 */

const AxonesAPI = {
    // Estado de conexion
    isOnline: false,
    // Timeout por defecto (15 segundos)
    TIMEOUT_MS: 15000,
    // Clave para la cola offline
    OFFLINE_QUEUE_KEY: 'axones_offline_queue',

    /**
     * Inicializar y verificar conexion
     */
    init: async function() {
        try {
            const result = await this.ping();
            this.isOnline = result.success;
            console.log('API Status:', this.isOnline ? 'Online' : 'Offline');

            // Si estamos online, procesar cola pendiente
            if (this.isOnline) {
                this.processOfflineQueue();
            }

            // Escuchar eventos de conexion
            window.addEventListener('online', () => {
                console.log('Conexion restaurada - procesando cola offline');
                this.isOnline = true;
                this.processOfflineQueue();
            });
            window.addEventListener('offline', () => {
                console.log('Conexion perdida');
                this.isOnline = false;
            });

            return this.isOnline;
        } catch (e) {
            this.isOnline = false;
            return false;
        }
    },

    /**
     * Agregar a cola offline
     */
    addToOfflineQueue: function(action, data) {
        const queue = JSON.parse(localStorage.getItem(this.OFFLINE_QUEUE_KEY) || '[]');
        queue.push({
            id: Date.now(),
            action: action,
            data: data,
            timestamp: new Date().toISOString(),
            retries: 0
        });
        localStorage.setItem(this.OFFLINE_QUEUE_KEY, JSON.stringify(queue));
        console.log('Agregado a cola offline:', action);
    },

    /**
     * Procesar cola offline
     */
    processOfflineQueue: async function() {
        const queue = JSON.parse(localStorage.getItem(this.OFFLINE_QUEUE_KEY) || '[]');
        if (queue.length === 0) return;

        console.log('Procesando cola offline:', queue.length, 'items');
        const newQueue = [];
        let successCount = 0;

        for (const item of queue) {
            try {
                let result;
                switch (item.action) {
                    case 'createProduccion':
                        result = await this.post('createProduccion', item.data);
                        break;
                    case 'createInventario':
                        result = await this.post('createInventario', item.data);
                        break;
                    case 'createAlerta':
                        result = await this.post('createAlerta', item.data);
                        break;
                    case 'createConsumoTinta':
                        result = await this.post('createConsumoTinta', item.data);
                        break;
                    case 'createDespacho':
                        result = await this.post('createDespacho', item.data);
                        break;
                    case 'createUsuario':
                        result = await this.post('createUsuario', item.data);
                        break;
                    default:
                        console.warn('Accion desconocida en cola:', item.action);
                        continue;
                }

                if (result && result.success) {
                    successCount++;
                    console.log('Cola offline: exito', item.action);
                } else {
                    // Reintentar mas tarde
                    item.retries++;
                    if (item.retries < 3) {
                        newQueue.push(item);
                    }
                }
            } catch (e) {
                item.retries++;
                if (item.retries < 3) {
                    newQueue.push(item);
                }
                console.warn('Cola offline: error', item.action, e);
            }
        }

        localStorage.setItem(this.OFFLINE_QUEUE_KEY, JSON.stringify(newQueue));

        if (successCount > 0) {
            console.log('Cola offline: sincronizados', successCount, 'registros');
            // Mostrar notificacion si Axones esta disponible
            if (typeof Axones !== 'undefined' && Axones.showSuccess) {
                Axones.showSuccess(`Sincronizados ${successCount} registros pendientes`);
            }
        }
    },

    /**
     * Obtener cantidad de items en cola
     */
    getOfflineQueueCount: function() {
        const queue = JSON.parse(localStorage.getItem(this.OFFLINE_QUEUE_KEY) || '[]');
        return queue.length;
    },

    /**
     * Ping al servidor
     */
    ping: async function() {
        return await this.get('ping');
    },

    /**
     * Fetch con timeout - evita que las llamadas queden colgadas
     */
    fetchWithTimeout: async function(url, options = {}) {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), this.TIMEOUT_MS);

        try {
            const response = await fetch(url, {
                ...options,
                signal: controller.signal
            });
            clearTimeout(timeoutId);
            return response;
        } catch (error) {
            clearTimeout(timeoutId);
            if (error.name === 'AbortError') {
                throw new Error('Timeout: el servidor no respondio a tiempo');
            }
            throw error;
        }
    },

    /**
     * GET request con cache-busting
     */
    get: async function(action, params = {}) {
        if (!CONFIG.API.BASE_URL) {
            throw new Error('API no configurada');
        }

        const url = new URL(CONFIG.API.BASE_URL);
        url.searchParams.append('action', action);
        // Cache-busting: evita que el navegador o CDN devuelva respuestas cacheadas
        url.searchParams.append('_t', Date.now());

        Object.keys(params).forEach(key => {
            if (params[key] !== undefined && params[key] !== null) {
                url.searchParams.append(key, params[key]);
            }
        });

        const response = await this.fetchWithTimeout(url.toString(), {
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
     * Con soporte para cola offline
     */
    post: async function(action, data, options = {}) {
        const url = new URL(CONFIG.API.BASE_URL);
        url.searchParams.append('action', action);
        url.searchParams.append('data', JSON.stringify(data));
        url.searchParams.append('_t', Date.now());

        try {
            const response = await this.fetchWithTimeout(url.toString(), {
                method: 'GET',
                redirect: 'follow'
            });

            const result = await response.json();
            this.isOnline = true;
            return result;
        } catch (error) {
            this.isOnline = false;
            // Agregar a cola offline para reintento posterior (solo acciones de creacion)
            if (!options.skipQueue && action.startsWith('create')) {
                this.addToOfflineQueue(action, data);
                return { success: false, offline: true, error: 'Guardado en cola offline' };
            }
            throw error;
        }
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
    },

    // ==================== ORDENES DE TRABAJO ====================

    getOrdenes: async function(params = {}) {
        return await this.get('getOrdenes', params);
    },

    createOrden: async function(data) {
        return await this.post('createOrden', data);
    },

    updateOrden: async function(id, data) {
        const params = { id, data: JSON.stringify(data) };
        return await this.get('updateOrden', params);
    },

    // ==================== ALERTAS POR EMAIL ====================

    /**
     * Envia alerta por email cuando hay inventario insuficiente
     * para una orden proxima a su fecha de inicio
     */
    enviarAlertaEmail: async function(data) {
        return await this.post('enviarAlertaEmail', data);
    },

    /**
     * Envia notificacion por email generica
     */
    enviarNotificacionEmail: async function(data) {
        return await this.post('enviarNotificacionEmail', data);
    }
};

// Exportar
if (typeof window !== 'undefined') {
    window.AxonesAPI = AxonesAPI;
}
