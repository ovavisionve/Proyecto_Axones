/**
 * SyncManager - Sincronizacion bidireccional con Google Sheets
 * Polling cada 10 segundos para detectar cambios en Sheets
 * y actualizar la plataforma automaticamente
 */

const SyncManager = {
    // Intervalo de polling en ms (10 segundos)
    INTERVAL: 10000,
    // Timer ID
    _timerId: null,
    // Ultima sincronizacion exitosa
    _lastSync: null,
    // Conteo de errores consecutivos
    _errorCount: 0,
    // Maximo de errores antes de pausar
    MAX_ERRORS: 5,
    // Callbacks registrados por modulo
    _listeners: {},
    // Estado
    _running: false,
    // Indicador visual element ID
    INDICATOR_ID: 'syncIndicator',

    /**
     * Inicia el polling de sincronizacion
     */
    start: function() {
        if (this._running) return;

        // Verificar que AxonesAPI este disponible
        if (typeof AxonesAPI === 'undefined') {
            console.warn('[SyncManager] AxonesAPI no disponible, sync deshabilitado');
            return;
        }

        this._running = true;
        this._lastSync = new Date().toISOString();
        this._errorCount = 0;

        // Crear indicador visual
        this.createIndicator();

        // Primer sync inmediato
        this.sync();

        // Polling cada 10 segundos
        this._timerId = setInterval(() => this.sync(), this.INTERVAL);

        console.log('[SyncManager] Iniciado - polling cada ' + (this.INTERVAL / 1000) + 's');
    },

    /**
     * Detiene el polling
     */
    stop: function() {
        if (this._timerId) {
            clearInterval(this._timerId);
            this._timerId = null;
        }
        this._running = false;
        this.updateIndicator('offline');
        console.log('[SyncManager] Detenido');
    },

    /**
     * Registra un listener para cambios en una hoja
     * @param {string} key - Clave de la hoja (ordenes, inventario, etc)
     * @param {function} callback - Funcion a llamar cuando hay cambios
     */
    on: function(key, callback) {
        if (!this._listeners[key]) {
            this._listeners[key] = [];
        }
        this._listeners[key].push(callback);
    },

    /**
     * Ejecuta un ciclo de sincronizacion
     */
    sync: async function() {
        if (!this._running) return;

        try {
            this.updateIndicator('syncing');

            var params = {
                since: this._lastSync || new Date(Date.now() - 60000).toISOString(),
                getData: 'true'
            };

            var result = await AxonesAPI.get('getSyncData', params, { skipCache: true });

            if (!result || !result.success) {
                throw new Error(result?.error || 'Respuesta invalida');
            }

            // Resetear errores
            this._errorCount = 0;
            this._lastSync = result.serverTime || new Date().toISOString();

            // Procesar cambios
            var totalChanges = 0;
            var changes = result.changes || {};

            for (var key in changes) {
                if (changes[key].modifiedSince > 0) {
                    totalChanges += changes[key].modifiedSince;
                }
            }

            // Si hay datos nuevos, actualizar localStorage y notificar listeners
            if (result.data) {
                this.processChanges(result.data, changes);
            }

            if (totalChanges > 0) {
                this.updateIndicator('changed', totalChanges);
                console.log('[SyncManager] ' + totalChanges + ' cambio(s) detectado(s)');
            } else {
                this.updateIndicator('ok');
            }

        } catch (error) {
            this._errorCount++;
            console.warn('[SyncManager] Error #' + this._errorCount + ':', error.message);
            this.updateIndicator('error');

            // Si muchos errores consecutivos, reducir frecuencia
            if (this._errorCount >= this.MAX_ERRORS) {
                console.warn('[SyncManager] Demasiados errores, pausando 60s');
                this.stop();
                setTimeout(() => {
                    this._errorCount = 0;
                    this.start();
                }, 60000);
            }
        }
    },

    /**
     * Procesa datos nuevos recibidos del servidor
     */
    processChanges: function(data, changes) {
        // --- ORDENES ---
        if (data.ordenes && data.ordenes.length > 0) {
            this.mergeOrdenes(data.ordenes);
            this.notifyListeners('ordenes', data.ordenes);
        }

        // --- INVENTARIO ---
        if (data.inventario && data.inventario.length > 0) {
            this.mergeInventario(data.inventario);
            this.notifyListeners('inventario', data.inventario);
        }

        // --- PRODUCCION ---
        ['produccion_impresion', 'produccion_laminacion', 'produccion_corte'].forEach(key => {
            if (data[key] && data[key].length > 0) {
                this.mergeProduccion(key, data[key]);
                this.notifyListeners(key, data[key]);
            }
        });

        // --- ALERTAS ---
        if (data.alertas && data.alertas.length > 0) {
            this.mergeAlertas(data.alertas);
            this.notifyListeners('alertas', data.alertas);
        }

        // --- DESPACHOS ---
        if (data.despachos && data.despachos.length > 0) {
            this.notifyListeners('despachos', data.despachos);
        }

        // --- PRODUCTO TERMINADO ---
        if (data.producto_terminado && data.producto_terminado.length > 0) {
            this.mergeProductoTerminado(data.producto_terminado);
            this.notifyListeners('producto_terminado', data.producto_terminado);
        }

        // --- HISTORIAL ---
        if (data.historial && data.historial.length > 0) {
            this.notifyListeners('historial', data.historial);
        }
    },

    /**
     * Merge ordenes del servidor con localStorage
     */
    mergeOrdenes: function(nuevas) {
        var local = JSON.parse(localStorage.getItem('axones_ordenes_trabajo') || '[]');
        var changed = false;

        nuevas.forEach(function(nueva) {
            // Parsear datosCompletos
            if (nueva.datosCompletos && typeof nueva.datosCompletos === 'string') {
                try { nueva.datosCompletos = JSON.parse(nueva.datosCompletos); } catch (e) {}
            }

            var obj = nueva.datosCompletos && typeof nueva.datosCompletos === 'object'
                ? { ...nueva.datosCompletos, id: nueva.id, estado: nueva.estado, etapa: nueva.etapa }
                : nueva;

            var idx = local.findIndex(function(o) { return o.id === nueva.id; });
            if (idx >= 0) {
                // Actualizar si es mas reciente
                var localTs = local[idx].fechaModificacion || local[idx].fechaCreacion || '';
                var serverTs = nueva.fechaModificacion || nueva.timestamp || '';
                if (serverTs > localTs) {
                    local[idx] = obj;
                    changed = true;
                }
            } else {
                local.push(obj);
                changed = true;
            }
        });

        if (changed) {
            localStorage.setItem('axones_ordenes_trabajo', JSON.stringify(local));
        }
    },

    /**
     * Merge inventario del servidor con localStorage
     */
    mergeInventario: function(nuevos) {
        var local = JSON.parse(localStorage.getItem('axones_inventario') || '[]');
        var changed = false;

        nuevos.forEach(function(nuevo) {
            var idx = local.findIndex(function(i) { return i.id === nuevo.id; });
            if (idx >= 0) {
                // Solo actualizar kg y campos modificables
                if (nuevo.kg !== undefined) {
                    local[idx].kg = parseFloat(nuevo.kg) || 0;
                    changed = true;
                }
            } else {
                local.push({
                    id: nuevo.id,
                    sku: nuevo.sku || '',
                    codigoBarra: nuevo.codigoBarra || '',
                    material: nuevo.material || '',
                    micras: nuevo.micras || '',
                    ancho: nuevo.ancho || '',
                    kg: parseFloat(nuevo.kg) || 0,
                    producto: nuevo.producto || '',
                    importado: nuevo.importado === 'SI' || nuevo.importado === true,
                    densidad: parseFloat(nuevo.densidad) || 0
                });
                changed = true;
            }
        });

        if (changed) {
            localStorage.setItem('axones_inventario', JSON.stringify(local));
        }
    },

    /**
     * Merge produccion del servidor
     */
    mergeProduccion: function(key, nuevos) {
        var storageKey = 'axones_produccion';
        var local = JSON.parse(localStorage.getItem(storageKey) || '[]');
        var changed = false;

        nuevos.forEach(function(nuevo) {
            var idx = local.findIndex(function(p) { return p.id === nuevo.id; });
            if (idx < 0) {
                local.unshift(nuevo);
                changed = true;
            }
        });

        if (changed) {
            localStorage.setItem(storageKey, JSON.stringify(local));
        }
    },

    /**
     * Merge alertas del servidor
     */
    mergeAlertas: function(nuevas) {
        var local = JSON.parse(localStorage.getItem('axones_alertas') || '[]');
        var changed = false;

        nuevas.forEach(function(nueva) {
            var idx = local.findIndex(function(a) { return a.id === nueva.id; });
            if (idx >= 0) {
                if (nueva.estado !== local[idx].estado) {
                    local[idx].estado = nueva.estado;
                    changed = true;
                }
            } else {
                local.unshift(nueva);
                changed = true;
            }
        });

        if (changed) {
            localStorage.setItem('axones_alertas', JSON.stringify(local));
        }
    },

    /**
     * Merge producto terminado
     */
    mergeProductoTerminado: function(nuevos) {
        var local = JSON.parse(localStorage.getItem('axones_producto_terminado') || '[]');
        var changed = false;

        nuevos.forEach(function(nuevo) {
            var idx = local.findIndex(function(p) { return p.id === nuevo.id; });
            if (idx < 0) {
                local.unshift(nuevo);
                changed = true;
            }
        });

        if (changed) {
            localStorage.setItem('axones_producto_terminado', JSON.stringify(local));
        }
    },

    /**
     * Notifica a los listeners registrados
     */
    notifyListeners: function(key, data) {
        var listeners = this._listeners[key] || [];
        listeners.forEach(function(cb) {
            try {
                cb(data);
            } catch (e) {
                console.warn('[SyncManager] Error en listener ' + key + ':', e);
            }
        });
    },

    /**
     * Crea el indicador visual de sincronizacion
     */
    createIndicator: function() {
        if (document.getElementById(this.INDICATOR_ID)) return;

        var indicator = document.createElement('div');
        indicator.id = this.INDICATOR_ID;
        indicator.style.cssText = 'position:fixed;bottom:10px;left:10px;z-index:9999;' +
            'padding:4px 10px;border-radius:20px;font-size:11px;font-weight:600;' +
            'display:flex;align-items:center;gap:5px;cursor:pointer;' +
            'background:rgba(255,255,255,0.95);border:1px solid #dee2e6;box-shadow:0 2px 8px rgba(0,0,0,0.1);' +
            'transition:all 0.3s ease;';
        indicator.title = 'Sincronizacion con Google Sheets';
        indicator.innerHTML = '<span class="sync-dot" style="width:8px;height:8px;border-radius:50%;background:#28a745;display:inline-block;"></span>' +
            '<span class="sync-text">Sincronizado</span>';

        // Click para forzar sync
        indicator.addEventListener('click', () => {
            this.sync();
        });

        document.body.appendChild(indicator);
    },

    /**
     * Actualiza el indicador visual
     */
    updateIndicator: function(status, count) {
        var el = document.getElementById(this.INDICATOR_ID);
        if (!el) return;

        var dot = el.querySelector('.sync-dot');
        var text = el.querySelector('.sync-text');

        switch (status) {
            case 'syncing':
                dot.style.background = '#ffc107';
                dot.style.animation = 'pulse 1s infinite';
                text.textContent = 'Sincronizando...';
                break;
            case 'ok':
                dot.style.background = '#28a745';
                dot.style.animation = 'none';
                text.textContent = 'Sincronizado';
                break;
            case 'changed':
                dot.style.background = '#0d6efd';
                dot.style.animation = 'none';
                text.textContent = count + ' cambio(s)';
                // Volver a verde despues de 3s
                setTimeout(() => this.updateIndicator('ok'), 3000);
                break;
            case 'error':
                dot.style.background = '#dc3545';
                dot.style.animation = 'none';
                text.textContent = 'Sin conexion';
                break;
            case 'offline':
                dot.style.background = '#6c757d';
                dot.style.animation = 'none';
                text.textContent = 'Desconectado';
                break;
        }
    },

    /**
     * Fuerza una recarga completa de todos los datos desde Sheets
     */
    forceFullSync: async function() {
        console.log('[SyncManager] Recarga completa forzada');
        this._lastSync = new Date(0).toISOString(); // Desde el inicio
        await this.sync();
    }
};

// Agregar CSS para animacion pulse
(function() {
    var style = document.createElement('style');
    style.textContent = '@keyframes pulse{0%,100%{opacity:1}50%{opacity:0.4}}';
    document.head.appendChild(style);
})();

// Auto-iniciar cuando DOM este listo
if (typeof document !== 'undefined') {
    document.addEventListener('DOMContentLoaded', function() {
        // Solo iniciar si hay sesion activa
        setTimeout(function() {
            if (typeof Auth !== 'undefined' && Auth.isAuthenticated()) {
                SyncManager.start();
            }
        }, 2000); // Esperar 2s para que todo cargue
    });
}

// Exportar
if (typeof window !== 'undefined') {
    window.SyncManager = SyncManager;
}
