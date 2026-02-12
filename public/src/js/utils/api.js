/**
 * API Helper - Sistema Axones
 * Maneja las llamadas al backend de Google Apps Script
 * Incluye cache local, estrategia stale-while-revalidate, y cola offline
 */

const AxonesAPI = {
    // Estado de conexion
    isOnline: false,
    // Timeout por defecto (8 segundos - reducido para mejor UX)
    TIMEOUT_MS: 8000,
    // Clave para la cola offline
    OFFLINE_QUEUE_KEY: 'axones_offline_queue',
    // Prefijo para cache
    CACHE_PREFIX: 'axones_cache_',
    // TTL del cache en milisegundos (5 minutos por defecto)
    CACHE_TTL: 5 * 60 * 1000,
    // TTL especificos por tipo de dato
    CACHE_TTL_CONFIG: {
        'getClientes': 30 * 60 * 1000,      // 30 min - clientes cambian poco
        'getMaquinas': 60 * 60 * 1000,      // 1 hora - maquinas casi nunca cambian
        'getConfiguracion': 60 * 60 * 1000, // 1 hora
        'getInventario': 2 * 60 * 1000,     // 2 min - inventario cambia frecuente
        'getProduccion': 1 * 60 * 1000,     // 1 min - produccion es tiempo real
        'getAlertas': 1 * 60 * 1000,        // 1 min
        'getDashboardData': 1 * 60 * 1000,  // 1 min
        'getOrdenes': 2 * 60 * 1000,        // 2 min
    },

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

    // ==================== SISTEMA DE CACHE ====================

    /**
     * Obtiene datos del cache si estan vigentes
     * @param {string} key - Clave del cache
     * @returns {object|null} - Datos cacheados o null si expiro/no existe
     */
    getFromCache: function(key) {
        try {
            const cached = localStorage.getItem(this.CACHE_PREFIX + key);
            if (!cached) return null;

            const { data, timestamp, ttl } = JSON.parse(cached);
            const age = Date.now() - timestamp;

            // Si no ha expirado, retornar datos
            if (age < ttl) {
                return { data, fresh: true, age };
            }

            // Si expiro pero hay datos, retornar como stale
            return { data, fresh: false, age };
        } catch (e) {
            return null;
        }
    },

    /**
     * Guarda datos en cache con TTL
     * @param {string} key - Clave del cache
     * @param {any} data - Datos a cachear
     * @param {number} ttl - Tiempo de vida en ms (opcional)
     */
    saveToCache: function(key, data, ttl = null) {
        try {
            const cacheTTL = ttl || this.CACHE_TTL_CONFIG[key] || this.CACHE_TTL;
            const cacheEntry = {
                data,
                timestamp: Date.now(),
                ttl: cacheTTL
            };
            localStorage.setItem(this.CACHE_PREFIX + key, JSON.stringify(cacheEntry));
        } catch (e) {
            // Si localStorage esta lleno, limpiar cache viejo
            this.clearOldCache();
        }
    },

    /**
     * Limpia entradas de cache expiradas
     */
    clearOldCache: function() {
        const keysToRemove = [];
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key && key.startsWith(this.CACHE_PREFIX)) {
                try {
                    const cached = JSON.parse(localStorage.getItem(key));
                    if (Date.now() - cached.timestamp > cached.ttl * 2) {
                        keysToRemove.push(key);
                    }
                } catch (e) {
                    keysToRemove.push(key);
                }
            }
        }
        keysToRemove.forEach(key => localStorage.removeItem(key));
        console.log('Cache limpiado:', keysToRemove.length, 'entradas');
    },

    /**
     * Invalida cache para una accion especifica
     */
    invalidateCache: function(action) {
        localStorage.removeItem(this.CACHE_PREFIX + action);
    },

    // ==================== COLA OFFLINE ====================

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
     * GET request con cache local y estrategia stale-while-revalidate
     * - Retorna datos del cache inmediatamente si existen (rapido)
     * - Si el cache esta stale, actualiza en background
     * - Si no hay cache, espera la respuesta del servidor
     *
     * @param {string} action - Accion del API
     * @param {object} params - Parametros adicionales
     * @param {object} options - {skipCache: false, forceRefresh: false}
     */
    get: async function(action, params = {}, options = {}) {
        if (!CONFIG.API.BASE_URL) {
            throw new Error('API no configurada');
        }

        // Generar clave de cache unica incluyendo parametros
        const cacheKey = action + (Object.keys(params).length > 0 ? '_' + JSON.stringify(params) : '');

        // Verificar cache primero (excepto ping y si se fuerza refresh)
        if (action !== 'ping' && !options.skipCache && !options.forceRefresh) {
            const cached = this.getFromCache(cacheKey);

            if (cached) {
                // Si el cache esta fresco, retornar inmediatamente
                if (cached.fresh) {
                    console.log(`[Cache HIT] ${action} (age: ${Math.round(cached.age/1000)}s)`);
                    return cached.data;
                }

                // Si el cache esta stale, retornar datos viejos Y actualizar en background
                console.log(`[Cache STALE] ${action} - retornando cache y actualizando en background`);

                // Actualizar en background (no esperamos)
                this.fetchAndCache(action, params, cacheKey).catch(e => {
                    console.warn('Error actualizando cache en background:', e.message);
                });

                // Retornar datos stale inmediatamente
                return cached.data;
            }
        }

        // No hay cache o se forzo refresh - hacer fetch y esperar
        return await this.fetchAndCache(action, params, cacheKey);
    },

    /**
     * Hace fetch al servidor y guarda en cache
     */
    fetchAndCache: async function(action, params, cacheKey) {
        const url = new URL(CONFIG.API.BASE_URL);
        url.searchParams.append('action', action);
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

        const data = await response.json();

        // Guardar en cache si la respuesta fue exitosa
        if (data && data.success !== false) {
            this.saveToCache(cacheKey, data);
            console.log(`[Cache SAVE] ${action}`);
        }

        this.isOnline = true;
        return data;
    },

    /**
     * Fuerza actualizacion de cache para una accion
     */
    refreshCache: async function(action, params = {}) {
        return await this.get(action, params, { forceRefresh: true });
    },

    /**
     * POST via GET (para evitar CORS en Apps Script)
     * Con soporte para cola offline e invalidacion de cache
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

            // Invalidar cache relacionado cuando se crea/actualiza algo
            if (result && result.success) {
                this.invalidateRelatedCache(action);
            }

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

    /**
     * Invalida cache relacionado segun la accion
     */
    invalidateRelatedCache: function(action) {
        const cacheMap = {
            'createProduccion': ['getProduccion', 'getDashboardData', 'getResumenProduccion'],
            'updateProduccion': ['getProduccion', 'getDashboardData', 'getResumenProduccion'],
            'createInventario': ['getInventario'],
            'updateInventario': ['getInventario'],
            'createAlerta': ['getAlertas'],
            'createDespacho': ['getDespachos'],
            'createConsumoTinta': ['getConsumoTintas'],
            'createOrden': ['getOrdenes'],
            'updateOrden': ['getOrdenes'],
            'createUsuario': ['getUsuarios'],
        };

        const keysToInvalidate = cacheMap[action] || [];
        keysToInvalidate.forEach(key => {
            // Invalidar todas las variantes del cache (con y sin parametros)
            for (let i = 0; i < localStorage.length; i++) {
                const storageKey = localStorage.key(i);
                if (storageKey && storageKey.startsWith(this.CACHE_PREFIX + key)) {
                    localStorage.removeItem(storageKey);
                    console.log(`[Cache INVALIDATE] ${storageKey}`);
                }
            }
        });
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
