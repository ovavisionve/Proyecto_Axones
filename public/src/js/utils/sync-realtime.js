/**
 * AxonesSync - Sincronizacion en tiempo real via Supabase
 *
 * Intercepta localStorage para las keys axones_* y sincroniza
 * automaticamente con una tabla sync_store en Supabase.
 * Usa Supabase Realtime para push instantaneo a todos los clientes.
 *
 * Si Supabase no esta disponible, no hace nada (localStorage sigue funcionando).
 */
const AxonesSync = (() => {
    // Keys de localStorage que se sincronizan
    const SYNC_KEYS = [
        'axones_ordenes_trabajo',
        'axones_inventario',
        'axones_tintas',
        'axones_tintas_inventario',
        'axones_tintas_cementerio',
        'axones_tintas_mezclas',
        'axones_produccion',
        'axones_control_tiempo',
        'axones_tiempo_historial',
        'axones_producto_terminado',
        'axones_alertas',
        'axones_clientes_memoria',
        'axones_adhesivos_inventario'
    ];

    let _syncing = false;       // Flag para evitar loops infinitos
    let _timers = {};           // Debounce timers por key
    let _channel = null;        // Canal Supabase Realtime
    let _ready = false;         // Si el sync esta activo
    let _origSetItem = null;    // Referencia al setItem original

    return {
        /**
         * Inicializa el sistema de sincronizacion
         */
        async init() {
            if (_ready) return;

            // Esperar a que AxonesDB este disponible
            if (typeof AxonesDB === 'undefined') {
                console.log('[AxonesSync] AxonesDB no disponible');
                return;
            }

            try {
                await AxonesDB.init();
            } catch (e) {
                console.log('[AxonesSync] No se pudo inicializar AxonesDB');
                return;
            }

            if (!AxonesDB.isReady()) {
                console.log('[AxonesSync] Supabase no configurado, solo localStorage local');
                return;
            }

            // Verificar que la tabla sync_store exista
            try {
                const { error } = await AxonesDB.client
                    .from('sync_store')
                    .select('key')
                    .limit(1);

                if (error && error.code === '42P01') {
                    console.warn('[AxonesSync] Tabla sync_store no existe. Creandola...');
                    // Intentar crearla via RPC (si hay permisos)
                    await this._crearTabla();
                } else if (error) {
                    console.warn('[AxonesSync] Error verificando sync_store:', error.message);
                    return;
                }
            } catch (e) {
                console.warn('[AxonesSync] Error:', e.message);
                return;
            }

            // Monkey-patch localStorage.setItem
            this._patchLocalStorage();

            // Suscribirse a cambios en tiempo real
            this._subscribe();

            // Descargar datos iniciales del cloud
            await this._download();

            _ready = true;
            this._showIndicator();
            console.log('[AxonesSync] Sincronizacion en tiempo real ACTIVA');
        },

        /**
         * Intenta crear la tabla sync_store via SQL
         */
        async _crearTabla() {
            try {
                // Intentar via rpc si existe
                await AxonesDB.client.rpc('exec_sql', {
                    query: `CREATE TABLE IF NOT EXISTS sync_store (
                        key TEXT PRIMARY KEY,
                        value JSONB NOT NULL DEFAULT '{}',
                        updated_at TIMESTAMPTZ DEFAULT NOW(),
                        updated_by TEXT DEFAULT 'sistema'
                    );
                    ALTER TABLE sync_store ENABLE ROW LEVEL SECURITY;
                    CREATE POLICY "sync_store_all" ON sync_store FOR ALL USING (true) WITH CHECK (true);
                    ALTER PUBLICATION supabase_realtime ADD TABLE sync_store;`
                });
            } catch (e) {
                console.warn('[AxonesSync] No se pudo crear sync_store automaticamente. Ejecute el SQL manualmente.');
            }
        },

        /**
         * Intercepta localStorage.setItem para sincronizar automaticamente
         */
        _patchLocalStorage() {
            if (_origSetItem) return; // Ya parcheado

            _origSetItem = localStorage.setItem.bind(localStorage);
            const self = this;

            localStorage.setItem = function (key, val) {
                _origSetItem(key, val);

                // Solo sincronizar keys de Axones y si no estamos recibiendo sync
                if (!_syncing && SYNC_KEYS.includes(key)) {
                    clearTimeout(_timers[key]);
                    _timers[key] = setTimeout(() => self._upload(key, val), 400);
                }
            };
        },

        /**
         * Sube un key/value a Supabase
         */
        async _upload(key, val) {
            try {
                let parsed;
                try {
                    parsed = JSON.parse(val);
                } catch (e) {
                    parsed = val;
                }

                const usuario = AxonesDB.usuario || {};
                const sessionUser = JSON.parse(localStorage.getItem('axones_session') || '{}');

                await AxonesDB.client
                    .from('sync_store')
                    .upsert({
                        key: key,
                        value: parsed,
                        updated_at: new Date().toISOString(),
                        updated_by: usuario.nombre || sessionUser.nombre || 'sistema'
                    }, { onConflict: 'key' });

            } catch (e) {
                // Silencioso - no bloquear la app si falla el sync
                console.warn('[AxonesSync] Upload error:', key, e.message);
            }
        },

        /**
         * Descarga todos los datos del cloud al localStorage
         * SUPABASE ES LA FUENTE DE VERDAD - siempre gana el cloud
         */
        async _download() {
            try {
                const { data, error } = await AxonesDB.client
                    .from('sync_store')
                    .select('key, value, updated_at');

                if (error) throw error;

                // Limpiar keys de Axones en localStorage antes de cargar del cloud
                // Esto evita que datos demo o viejos persistan
                _syncing = true;
                for (const key of SYNC_KEYS) {
                    _origSetItem(key, '[]');
                }

                if (!data || data.length === 0) {
                    console.log('[AxonesSync] sync_store vacio - localStorage limpio');
                    _syncing = false;
                    return;
                }

                // Aplicar datos del cloud al localStorage (cloud SIEMPRE gana)
                let count = 0;
                for (const row of data) {
                    if (SYNC_KEYS.includes(row.key) && row.value != null) {
                        const cloudVal = JSON.stringify(row.value);
                        _origSetItem(row.key, cloudVal);
                        _origSetItem(row.key + '_sync_ts', row.updated_at);
                        count++;
                    }
                }
                _syncing = false;

                if (count > 0) {
                    console.log(`[AxonesSync] ${count} keys descargadas del cloud`);
                    window.dispatchEvent(new CustomEvent('axones-sync', {
                        detail: { type: 'download', count: count }
                    }));
                }

            } catch (e) {
                _syncing = false;
                console.warn('[AxonesSync] Download error:', e.message);
            }
        },

        /**
         * Sube todos los datos locales al cloud
         * DESHABILITADO: Supabase es la fuente de verdad, no se sube basura local
         */
        async _uploadAll() {
            console.log('[AxonesSync] _uploadAll deshabilitado - Supabase es fuente de verdad');
        },

        /**
         * Compara timestamps para saber si el cloud es mas reciente
         */
        _isCloudNewer(key, cloudTs) {
            const localTs = localStorage.getItem(key + '_sync_ts');
            if (!localTs) return true;
            return new Date(cloudTs) > new Date(localTs);
        },

        /**
         * Suscribirse a cambios en tiempo real via Supabase Realtime
         */
        _subscribe() {
            if (_channel) return;

            _channel = AxonesDB.client
                .channel('axones-sync-realtime')
                .on('postgres_changes', {
                    event: '*',
                    schema: 'public',
                    table: 'sync_store'
                }, (payload) => {
                    const row = payload.new;
                    if (!row || !row.key || !SYNC_KEYS.includes(row.key)) return;

                    // Verificar que no sea nuestro propio cambio
                    const usuario = AxonesDB.usuario || {};
                    const sessionUser = JSON.parse(localStorage.getItem('axones_session') || '{}');
                    const myName = usuario.nombre || sessionUser.nombre || '';

                    // Aplicar cambio al localStorage
                    _syncing = true;
                    _origSetItem(row.key, JSON.stringify(row.value));
                    _origSetItem(row.key + '_sync_ts', row.updated_at);
                    _syncing = false;

                    // Notificar a la UI
                    window.dispatchEvent(new CustomEvent('axones-sync', {
                        detail: {
                            type: 'realtime',
                            key: row.key,
                            by: row.updated_by,
                            isOwn: row.updated_by === myName
                        }
                    }));

                    // Flash visual del indicador
                    this._flashIndicator(row.key, row.updated_by);
                })
                .subscribe();
        },

        /**
         * Muestra indicador visual de sync activo
         */
        _showIndicator() {
            let el = document.getElementById('axonesSyncIndicator');
            if (el) return;

            el = document.createElement('div');
            el.id = 'axonesSyncIndicator';
            el.style.cssText = 'position:fixed;bottom:10px;left:10px;z-index:9999;' +
                'padding:4px 10px;border-radius:20px;font-size:11px;font-weight:600;' +
                'display:flex;align-items:center;gap:5px;cursor:pointer;' +
                'background:rgba(255,255,255,0.95);border:1px solid #198754;box-shadow:0 2px 8px rgba(0,0,0,0.1);' +
                'transition:all 0.3s ease;';
            el.title = 'Sincronizacion en tiempo real activa';
            el.innerHTML = '<span style="width:8px;height:8px;border-radius:50%;background:#198754;display:inline-block;' +
                'animation:syncPulse 2s infinite;"></span>' +
                '<span class="sync-label">Tiempo Real</span>';

            // Click para forzar sync
            el.addEventListener('click', () => this._download());

            document.body.appendChild(el);

            // CSS animation
            if (!document.getElementById('syncPulseCSS')) {
                const style = document.createElement('style');
                style.id = 'syncPulseCSS';
                style.textContent = '@keyframes syncPulse{0%,100%{opacity:1}50%{opacity:0.5}}' +
                    '@keyframes syncFlash{0%{background:#198754}50%{background:#0d6efd}100%{background:#198754}}';
                document.head.appendChild(style);
            }

            // Ocultar el indicador viejo de SyncManager si existe
            const oldIndicator = document.getElementById('syncIndicator');
            if (oldIndicator) oldIndicator.style.display = 'none';
        },

        /**
         * Flash visual cuando llega un cambio
         */
        _flashIndicator(key, by) {
            const el = document.getElementById('axonesSyncIndicator');
            if (!el) return;

            const dot = el.querySelector('span');
            const label = el.querySelector('.sync-label');

            if (dot) dot.style.animation = 'syncFlash 0.5s ease 2';
            if (label) {
                const keyName = key.replace('axones_', '').replace(/_/g, ' ');
                label.textContent = `${keyName} (${by || 'otro usuario'})`;
                setTimeout(() => {
                    if (label) label.textContent = 'Tiempo Real';
                    if (dot) dot.style.animation = 'syncPulse 2s infinite';
                }, 3000);
            }
        },

        /**
         * Limpieza
         */
        destroy() {
            if (_channel) {
                AxonesDB.client.removeChannel(_channel);
                _channel = null;
            }
            _ready = false;
        },

        /**
         * Verifica si el sync esta activo
         */
        isActive() {
            return _ready;
        }
    };
})();

// ============================================================
// AUTO-REFRESH: Escuchar eventos de sync y refrescar la UI
// ============================================================
window.addEventListener('axones-sync', (e) => {
    const { type, key, by, isOwn } = e.detail || {};

    // No refrescar si fue nuestro propio cambio
    if (isOwn) return;

    // Refrescar la pagina actual segun que datos cambiaron
    const refreshMap = {
        'axones_ordenes_trabajo': ['ordenes', 'programacion', 'impresion', 'laminacion', 'corte'],
        'axones_inventario': ['inventario', 'ordenes'],
        'axones_tintas': ['tintas'],
        'axones_tintas_inventario': ['tintas'],
        'axones_tintas_cementerio': ['tintas'],
        'axones_tintas_mezclas': ['tintas'],
        'axones_produccion': ['impresion', 'laminacion', 'corte', 'reportes'],
        'axones_control_tiempo': ['impresion', 'laminacion', 'corte', 'programacion'],
        'axones_alertas': ['alertas', 'index'],
        'axones_producto_terminado': ['corte', 'inventario']
    };

    const currentPage = window.location.pathname.split('/').pop().replace('.html', '') || 'index';
    const affectedPages = refreshMap[key] || [];

    if (affectedPages.includes(currentPage) || type === 'download') {
        // Mostrar notificacion de actualizacion
        if (by && type === 'realtime') {
            _showSyncToast(`${by} actualizo ${key.replace('axones_', '').replace(/_/g, ' ')}`);
        }

        // Refrescar datos en la pagina actual
        // Cada modulo puede escuchar este evento para refrescarse
        window.dispatchEvent(new CustomEvent('axones-data-refresh', {
            detail: { key, by }
        }));

        // Si el modulo actual tiene un metodo de recarga, llamarlo
        if (typeof Ordenes !== 'undefined' && key === 'axones_ordenes_trabajo') {
            try { Ordenes.cargarOrdenes && Ordenes.cargarOrdenes(); } catch (e) {}
        }
        if (typeof Inventario !== 'undefined' && key === 'axones_inventario') {
            try { Inventario.cargar && Inventario.cargar(); } catch (e) {}
        }
        if (typeof Programacion !== 'undefined' && key === 'axones_ordenes_trabajo') {
            try { Programacion.cargarOrdenes && Programacion.cargarOrdenes(); } catch (e) {}
        }
        if (typeof Tintas !== 'undefined' && (key.startsWith('axones_tintas'))) {
            try { Tintas.refrescar && Tintas.refrescar(); } catch (e) {}
        }
        if (typeof ControlTiempo !== 'undefined' && key === 'axones_control_tiempo') {
            try {
                // Refrescar timers si hay comanda activa
                const paneles = document.querySelectorAll('[id^="panel-comandas"]');
                if (paneles.length > 0) {
                    ControlTiempo._actualizarUISync && ControlTiempo._actualizarUISync(ControlTiempo.getRegistros());
                }
            } catch (e) {}
        }
    }
});

/**
 * Toast de sincronizacion
 */
function _showSyncToast(msg) {
    let container = document.querySelector('.sync-toast-container');
    if (!container) {
        container = document.createElement('div');
        container.className = 'sync-toast-container';
        container.style.cssText = 'position:fixed;top:70px;right:20px;z-index:9999;';
        document.body.appendChild(container);
    }

    const toast = document.createElement('div');
    toast.style.cssText = 'background:#198754;color:#fff;padding:8px 16px;border-radius:8px;' +
        'font-size:12px;margin-bottom:8px;box-shadow:0 2px 8px rgba(0,0,0,0.2);' +
        'animation:slideIn 0.3s ease;display:flex;align-items:center;gap:6px;';
    toast.innerHTML = `<i class="bi bi-arrow-repeat"></i> ${msg}`;
    container.appendChild(toast);

    setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transition = 'opacity 0.3s';
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

// CSS para slideIn
(function () {
    if (!document.getElementById('syncToastCSS')) {
        const s = document.createElement('style');
        s.id = 'syncToastCSS';
        s.textContent = '@keyframes slideIn{from{transform:translateX(100%);opacity:0}to{transform:translateX(0);opacity:1}}';
        document.head.appendChild(s);
    }
})();

// Auto-iniciar despues de que todo cargue
document.addEventListener('DOMContentLoaded', () => {
    setTimeout(() => {
        AxonesSync.init().catch(e => console.warn('[AxonesSync] Init error:', e.message));
    }, 2000);
});

// Exportar
window.AxonesSync = AxonesSync;
