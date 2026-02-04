/**
 * API Helper - Sistema Axones
 * Maneja las llamadas al backend de Google Apps Script
 * Solucion CORS para Apps Script Web Apps
 */

const AxonesAPI = {
    /**
     * Hace una solicitud GET al backend
     */
    get: async function(action, params = {}) {
        const url = new URL(CONFIG.API.BASE_URL);
        url.searchParams.append('action', action);

        // Agregar parametros adicionales
        Object.keys(params).forEach(key => {
            if (params[key] !== undefined && params[key] !== null) {
                url.searchParams.append(key, params[key]);
            }
        });

        try {
            const response = await fetch(url.toString(), {
                method: 'GET',
                redirect: 'follow'
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            return await response.json();
        } catch (error) {
            console.error('API GET Error:', error);
            throw error;
        }
    },

    /**
     * Hace una solicitud POST al backend
     * Google Apps Script requiere enviar datos como form-data o en URL
     */
    post: async function(action, data) {
        const url = CONFIG.API.BASE_URL + '?action=' + action;

        try {
            // Para Apps Script, usamos POST con el body como string JSON
            // y mode: 'no-cors' no funciona bien, asi que usamos el truco del redirect
            const response = await fetch(url, {
                method: 'POST',
                redirect: 'follow',
                headers: {
                    'Content-Type': 'text/plain;charset=utf-8',
                },
                body: JSON.stringify(data)
            });

            // Apps Script puede retornar un redirect, seguimos la respuesta
            const text = await response.text();

            try {
                return JSON.parse(text);
            } catch (e) {
                // Si no es JSON, intentar extraer del HTML (Apps Script a veces envuelve la respuesta)
                const jsonMatch = text.match(/\{.*\}/s);
                if (jsonMatch) {
                    return JSON.parse(jsonMatch[0]);
                }
                throw new Error('Respuesta no valida del servidor');
            }
        } catch (error) {
            console.error('API POST Error:', error);

            // Fallback: intentar con GET y datos en URL (para datos pequenos)
            if (JSON.stringify(data).length < 2000) {
                console.log('Intentando fallback con GET...');
                return await this.postViaGet(action, data);
            }

            throw error;
        }
    },

    /**
     * Fallback: Enviar POST como GET con datos codificados
     * Util cuando CORS bloquea POST
     */
    postViaGet: async function(action, data) {
        const url = new URL(CONFIG.API.BASE_URL);
        url.searchParams.append('action', action);
        url.searchParams.append('data', JSON.stringify(data));
        url.searchParams.append('method', 'POST');

        const response = await fetch(url.toString(), {
            method: 'GET',
            redirect: 'follow'
        });

        return await response.json();
    },

    /**
     * Verifica si el backend esta disponible
     */
    healthCheck: async function() {
        try {
            if (!CONFIG.API.BASE_URL) {
                return { online: false, mode: 'localStorage' };
            }

            const result = await this.get('getStats');
            return { online: true, mode: 'sheets', data: result };
        } catch (error) {
            console.warn('Backend no disponible, usando localStorage:', error.message);
            return { online: false, mode: 'localStorage', error: error.message };
        }
    },

    /**
     * Guarda datos con fallback a localStorage
     */
    save: async function(action, data, localStorageKey) {
        // Si no hay URL de API, usar localStorage directamente
        if (!CONFIG.API.BASE_URL) {
            return this.saveToLocalStorage(data, localStorageKey);
        }

        try {
            const result = await this.post(action, data);
            if (result.success) {
                // Tambien guardar en localStorage como backup
                this.saveToLocalStorage(data, localStorageKey);
                return result;
            } else {
                throw new Error(result.error || 'Error desconocido');
            }
        } catch (error) {
            console.warn('Error guardando en Sheets, usando localStorage:', error);
            // Fallback a localStorage
            this.saveToLocalStorage(data, localStorageKey);
            return {
                success: true,
                id: data.id,
                mode: 'localStorage',
                warning: 'Guardado localmente. Se sincronizara cuando haya conexion.'
            };
        }
    },

    /**
     * Guarda en localStorage
     */
    saveToLocalStorage: function(data, key) {
        const storageKey = CONFIG.CACHE.PREFIJO + key;
        const registros = JSON.parse(localStorage.getItem(storageKey) || '[]');
        registros.unshift(data);
        localStorage.setItem(storageKey, JSON.stringify(registros));
        return { success: true, id: data.id, mode: 'localStorage' };
    },

    /**
     * Obtiene datos con fallback a localStorage
     */
    fetch: async function(action, params, localStorageKey) {
        // Si no hay URL de API, usar localStorage directamente
        if (!CONFIG.API.BASE_URL) {
            return this.getFromLocalStorage(localStorageKey);
        }

        try {
            const result = await this.get(action, params);
            return { data: result, source: 'sheets' };
        } catch (error) {
            console.warn('Error obteniendo de Sheets, usando localStorage:', error);
            const localData = this.getFromLocalStorage(localStorageKey);
            return { data: localData, source: 'localStorage' };
        }
    },

    /**
     * Obtiene de localStorage
     */
    getFromLocalStorage: function(key) {
        const storageKey = CONFIG.CACHE.PREFIJO + key;
        return JSON.parse(localStorage.getItem(storageKey) || '[]');
    },

    /**
     * Sincroniza datos pendientes de localStorage a Sheets
     */
    syncPendingData: async function() {
        const pendingKeys = ['produccion_pending', 'corte_pending', 'laminacion_pending'];
        const results = [];

        for (const key of pendingKeys) {
            const pending = JSON.parse(localStorage.getItem(CONFIG.CACHE.PREFIJO + key) || '[]');

            for (const item of pending) {
                try {
                    let action;
                    if (key.includes('produccion')) action = 'saveImpresion';
                    else if (key.includes('corte')) action = 'saveCorte';
                    else if (key.includes('laminacion')) action = 'saveLaminacion';

                    const result = await this.post(action, item);
                    if (result.success) {
                        results.push({ id: item.id, synced: true });
                    }
                } catch (error) {
                    results.push({ id: item.id, synced: false, error: error.message });
                }
            }

            // Limpiar pendientes sincronizados
            const stillPending = pending.filter(p =>
                results.some(r => r.id === p.id && !r.synced)
            );
            localStorage.setItem(CONFIG.CACHE.PREFIJO + key, JSON.stringify(stillPending));
        }

        return results;
    }
};

// Exportar
if (typeof window !== 'undefined') {
    window.AxonesAPI = AxonesAPI;
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = AxonesAPI;
}
