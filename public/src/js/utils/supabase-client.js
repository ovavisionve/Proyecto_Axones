/**
 * SUPABASE CLIENT - Sistema Axones
 * Cliente centralizado para Supabase con soporte real-time
 *
 * Uso:
 *   await AxonesDB.init();
 *   const clientes = await AxonesDB.clientes.listar();
 *   AxonesDB.realtime.suscribir('ordenes_trabajo', callback);
 */

// ============================================================
// CONFIGURACION - Actualizar con datos del proyecto Supabase
// ============================================================
const SUPABASE_CONFIG = {
    url: 'https://lzjuzfbzgyjazhzhfhzv.supabase.co',
    anonKey: 'sb_publishable_2qO868gEzBLLUyO2GmvgIg_69IhUvb7',
};

// ============================================================
// CLIENTE PRINCIPAL
// ============================================================
const AxonesDB = {
    client: null,
    usuario: null,
    _suscripciones: [],
    _presenciaInterval: null,
    _inicializado: false,

    /**
     * Inicializa el cliente Supabase
     */
    init: async function() {
        if (this._inicializado) return this.client;

        if (!SUPABASE_CONFIG.url || !SUPABASE_CONFIG.anonKey) {
            console.warn('AxonesDB: Supabase no configurado. Usando modo localStorage.');
            return null;
        }

        // Cargar la libreria de Supabase si no esta cargada
        if (typeof supabase === 'undefined') {
            await this._cargarScript('https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/dist/umd/supabase.min.js');
        }

        this.client = supabase.createClient(SUPABASE_CONFIG.url, SUPABASE_CONFIG.anonKey);
        this._inicializado = true;

        console.log('AxonesDB: Cliente Supabase inicializado');
        return this.client;
    },

    /**
     * Verifica si Supabase esta configurado y disponible
     */
    isReady: function() {
        return this._inicializado && this.client !== null;
    },

    /**
     * Carga un script externo dinamicamente
     */
    _cargarScript: function(src) {
        return new Promise((resolve, reject) => {
            if (document.querySelector(`script[src="${src}"]`)) {
                resolve();
                return;
            }
            const script = document.createElement('script');
            script.src = src;
            script.onload = resolve;
            script.onerror = reject;
            document.head.appendChild(script);
        });
    },

    // ============================================================
    // AUTENTICACION (login propio, no Supabase Auth)
    // ============================================================
    auth: {
        /**
         * Login con username/password contra tabla usuarios
         */
        login: async function(username, password) {
            if (!AxonesDB.isReady()) return null;

            const { data, error } = await AxonesDB.client
                .from('usuarios')
                .select('*')
                .eq('username', username)
                .eq('activo', true)
                .single();

            if (error || !data) return null;

            // Verificar password (en produccion usar bcrypt)
            if (data.password_hash !== password) return null;

            AxonesDB.usuario = data;
            return data;
        },

        getUsuario: function() {
            return AxonesDB.usuario;
        }
    },

    // ============================================================
    // CRUD GENERICO
    // ============================================================
    _crud: function(tabla) {
        return {
            /**
             * Listar registros con filtros opcionales
             */
            listar: async function(opciones = {}) {
                if (!AxonesDB.isReady()) return [];

                let query = AxonesDB.client.from(tabla).select(opciones.select || '*');

                // Filtros
                if (opciones.filtros) {
                    for (const [campo, valor] of Object.entries(opciones.filtros)) {
                        query = query.eq(campo, valor);
                    }
                }

                // Solo activos por defecto
                if (opciones.soloActivos !== false) {
                    query = query.eq('activo', true);
                }

                // Ordenar
                if (opciones.ordenar) {
                    query = query.order(opciones.ordenar, { ascending: opciones.ascendente !== false });
                } else {
                    query = query.order('created_at', { ascending: false });
                }

                // Limite
                if (opciones.limite) {
                    query = query.limit(opciones.limite);
                }

                const { data, error } = await query;
                if (error) {
                    console.error(`AxonesDB: Error listando ${tabla}:`, error);
                    return [];
                }
                return data || [];
            },

            /**
             * Obtener un registro por ID
             */
            obtener: async function(id) {
                if (!AxonesDB.isReady()) return null;

                const { data, error } = await AxonesDB.client
                    .from(tabla)
                    .select('*')
                    .eq('id', id)
                    .single();

                if (error) {
                    console.error(`AxonesDB: Error obteniendo ${tabla}/${id}:`, error);
                    return null;
                }
                return data;
            },

            /**
             * Crear un nuevo registro
             */
            crear: async function(datos) {
                if (!AxonesDB.isReady()) return null;

                const { data, error } = await AxonesDB.client
                    .from(tabla)
                    .insert(datos)
                    .select()
                    .single();

                if (error) {
                    console.error(`AxonesDB: Error creando en ${tabla}:`, error);
                    throw error;
                }
                return data;
            },

            /**
             * Actualizar un registro
             */
            actualizar: async function(id, datos) {
                if (!AxonesDB.isReady()) return null;

                const { data, error } = await AxonesDB.client
                    .from(tabla)
                    .update(datos)
                    .eq('id', id)
                    .select()
                    .single();

                if (error) {
                    console.error(`AxonesDB: Error actualizando ${tabla}/${id}:`, error);
                    throw error;
                }
                return data;
            },

            /**
             * Eliminar (soft delete - marcar como inactivo)
             */
            eliminar: async function(id) {
                if (!AxonesDB.isReady()) return false;

                const { error } = await AxonesDB.client
                    .from(tabla)
                    .update({ activo: false })
                    .eq('id', id);

                if (error) {
                    console.error(`AxonesDB: Error eliminando ${tabla}/${id}:`, error);
                    return false;
                }
                return true;
            },

            /**
             * Buscar por texto en un campo
             */
            buscar: async function(campo, texto) {
                if (!AxonesDB.isReady()) return [];

                const { data, error } = await AxonesDB.client
                    .from(tabla)
                    .select('*')
                    .ilike(campo, `%${texto}%`)
                    .eq('activo', true)
                    .limit(50);

                if (error) return [];
                return data || [];
            }
        };
    },

    // ============================================================
    // MODULOS ESPECIFICOS (atajos con CRUD)
    // ============================================================

    get usuarios() { return this._crud('usuarios'); },
    get clientes() { return this._crud('clientes'); },
    get proveedores() { return this._crud('proveedores'); },
    get materiales() { return this._crud('materiales'); },
    get tintas() { return this._crud('tintas'); },
    get adhesivos() { return this._crud('adhesivos'); },
    get ordenes() { return this._crud('ordenes_trabajo'); },
    get alertas() { return this._crud('alertas'); },

    // Produccion (sin campo 'activo', override soloActivos)
    get produccionImpresion() {
        const crud = this._crud('produccion_impresion');
        const listarOriginal = crud.listar;
        crud.listar = (opts = {}) => listarOriginal({ ...opts, soloActivos: false });
        return crud;
    },
    get produccionLaminacion() {
        const crud = this._crud('produccion_laminacion');
        const listarOriginal = crud.listar;
        crud.listar = (opts = {}) => listarOriginal({ ...opts, soloActivos: false });
        return crud;
    },
    get produccionCorte() {
        const crud = this._crud('produccion_corte');
        const listarOriginal = crud.listar;
        crud.listar = (opts = {}) => listarOriginal({ ...opts, soloActivos: false });
        return crud;
    },

    // ============================================================
    // INVENTARIO - Operaciones especiales
    // ============================================================
    inventario: {
        /**
         * Descontar material del inventario con trazabilidad
         */
        descontar: async function(materialId, cantidadKg, referencia, motivo) {
            if (!AxonesDB.isReady()) return false;

            // Obtener stock actual
            const material = await AxonesDB.materiales.obtener(materialId);
            if (!material) return false;

            const stockAnterior = parseFloat(material.stock_kg) || 0;
            const stockNuevo = Math.max(0, stockAnterior - cantidadKg);

            // Actualizar stock
            await AxonesDB.materiales.actualizar(materialId, { stock_kg: stockNuevo });

            // Registrar movimiento
            await AxonesDB.client.from('movimientos_inventario').insert({
                material_id: materialId,
                tipo: 'salida',
                cantidad_kg: cantidadKg,
                stock_anterior: stockAnterior,
                stock_nuevo: stockNuevo,
                referencia: referencia,
                motivo: motivo,
                usuario_id: AxonesDB.usuario?.id,
                usuario_nombre: AxonesDB.usuario?.nombre
            });

            // Verificar stock bajo
            if (stockNuevo <= (material.stock_minimo_kg || 0)) {
                await AxonesDB.client.from('alertas').insert({
                    tipo: 'stock_bajo',
                    nivel: 'warning',
                    titulo: `Stock bajo: ${material.material} ${material.ancho}mm`,
                    mensaje: `Quedan ${stockNuevo.toFixed(1)} Kg de ${material.sku || material.material}. Minimo: ${material.stock_minimo_kg || 0} Kg`
                });
            }

            return true;
        },

        /**
         * Ingresar material al inventario con trazabilidad
         */
        ingresar: async function(materialId, cantidadKg, referencia, motivo) {
            if (!AxonesDB.isReady()) return false;

            const material = await AxonesDB.materiales.obtener(materialId);
            if (!material) return false;

            const stockAnterior = parseFloat(material.stock_kg) || 0;
            const stockNuevo = stockAnterior + cantidadKg;

            await AxonesDB.materiales.actualizar(materialId, { stock_kg: stockNuevo });

            await AxonesDB.client.from('movimientos_inventario').insert({
                material_id: materialId,
                tipo: 'entrada',
                cantidad_kg: cantidadKg,
                stock_anterior: stockAnterior,
                stock_nuevo: stockNuevo,
                referencia: referencia,
                motivo: motivo,
                usuario_id: AxonesDB.usuario?.id,
                usuario_nombre: AxonesDB.usuario?.nombre
            });

            return true;
        },

        /**
         * Obtener movimientos de un material
         */
        movimientos: async function(materialId, limite = 50) {
            if (!AxonesDB.isReady()) return [];

            const { data } = await AxonesDB.client
                .from('movimientos_inventario')
                .select('*')
                .eq('material_id', materialId)
                .order('created_at', { ascending: false })
                .limit(limite);

            return data || [];
        }
    },

    // ============================================================
    // REAL-TIME
    // ============================================================
    realtime: {
        /**
         * Suscribirse a cambios en una tabla
         * @param {string} tabla - Nombre de la tabla
         * @param {function} callback - Funcion(payload) llamada en cada cambio
         * @param {string} evento - 'INSERT', 'UPDATE', 'DELETE', o '*' (todos)
         * @returns {object} Suscripcion (para cancelar)
         */
        suscribir: function(tabla, callback, evento = '*') {
            if (!AxonesDB.isReady()) return null;

            const channel = AxonesDB.client
                .channel(`realtime:${tabla}:${Date.now()}`)
                .on('postgres_changes',
                    { event: evento, schema: 'public', table: tabla },
                    (payload) => {
                        console.log(`AxonesDB Realtime [${tabla}]:`, payload.eventType, payload);
                        callback(payload);
                    }
                )
                .subscribe();

            AxonesDB._suscripciones.push(channel);
            return channel;
        },

        /**
         * Suscribirse a cambios en una orden especifica
         */
        suscribirOrden: function(ordenId, callback) {
            if (!AxonesDB.isReady()) return null;

            const channel = AxonesDB.client
                .channel(`orden:${ordenId}`)
                .on('postgres_changes',
                    {
                        event: 'UPDATE',
                        schema: 'public',
                        table: 'ordenes_trabajo',
                        filter: `id=eq.${ordenId}`
                    },
                    callback
                )
                .subscribe();

            AxonesDB._suscripciones.push(channel);
            return channel;
        },

        /**
         * Cancelar una suscripcion
         */
        cancelar: function(channel) {
            if (channel) {
                AxonesDB.client.removeChannel(channel);
                const idx = AxonesDB._suscripciones.indexOf(channel);
                if (idx > -1) AxonesDB._suscripciones.splice(idx, 1);
            }
        },

        /**
         * Cancelar todas las suscripciones
         */
        cancelarTodas: function() {
            AxonesDB._suscripciones.forEach(ch => {
                AxonesDB.client.removeChannel(ch);
            });
            AxonesDB._suscripciones = [];
        }
    },

    // ============================================================
    // PRESENCIA (quien esta conectado y donde)
    // ============================================================
    presencia: {
        /**
         * Registrar presencia del usuario actual
         */
        conectar: async function(pagina) {
            if (!AxonesDB.isReady() || !AxonesDB.usuario) return;

            // Buscar registro existente
            const { data: existente } = await AxonesDB.client
                .from('presencia')
                .select('id')
                .eq('usuario_id', AxonesDB.usuario.id)
                .single();

            if (existente) {
                await AxonesDB.client
                    .from('presencia')
                    .update({
                        pagina: pagina,
                        ultimo_ping: new Date().toISOString(),
                        conectado: true
                    })
                    .eq('id', existente.id);
            } else {
                await AxonesDB.client
                    .from('presencia')
                    .insert({
                        usuario_id: AxonesDB.usuario.id,
                        usuario_nombre: AxonesDB.usuario.nombre,
                        pagina: pagina,
                        conectado: true
                    });
            }

            // Ping cada 30 segundos
            if (AxonesDB._presenciaInterval) clearInterval(AxonesDB._presenciaInterval);
            AxonesDB._presenciaInterval = setInterval(() => {
                this._ping(pagina);
            }, 30000);

            // Desconectar al cerrar pagina
            window.addEventListener('beforeunload', () => this.desconectar());
        },

        _ping: async function(pagina) {
            if (!AxonesDB.isReady() || !AxonesDB.usuario) return;

            await AxonesDB.client
                .from('presencia')
                .update({
                    pagina: pagina,
                    ultimo_ping: new Date().toISOString(),
                    conectado: true
                })
                .eq('usuario_id', AxonesDB.usuario.id);
        },

        /**
         * Marcar que el usuario esta editando una orden
         */
        editando: async function(numeroOt) {
            if (!AxonesDB.isReady() || !AxonesDB.usuario) return;

            await AxonesDB.client
                .from('presencia')
                .update({ orden_editando: numeroOt })
                .eq('usuario_id', AxonesDB.usuario.id);
        },

        /**
         * Obtener usuarios conectados
         */
        conectados: async function() {
            if (!AxonesDB.isReady()) return [];

            // Solo los que hicieron ping en los ultimos 2 minutos
            const hace2min = new Date(Date.now() - 2 * 60 * 1000).toISOString();

            const { data } = await AxonesDB.client
                .from('presencia')
                .select('*')
                .eq('conectado', true)
                .gte('ultimo_ping', hace2min);

            return data || [];
        },

        /**
         * Suscribirse a cambios de presencia
         */
        suscribir: function(callback) {
            return AxonesDB.realtime.suscribir('presencia', callback);
        },

        /**
         * Desconectar al usuario
         */
        desconectar: async function() {
            if (!AxonesDB.isReady() || !AxonesDB.usuario) return;

            if (AxonesDB._presenciaInterval) {
                clearInterval(AxonesDB._presenciaInterval);
                AxonesDB._presenciaInterval = null;
            }

            // Usar sendBeacon para que funcione en beforeunload
            const url = `${SUPABASE_CONFIG.url}/rest/v1/presencia?usuario_id=eq.${AxonesDB.usuario.id}`;
            const body = JSON.stringify({ conectado: false, orden_editando: null });

            if (navigator.sendBeacon) {
                const blob = new Blob([body], { type: 'application/json' });
                // sendBeacon no soporta headers custom, usar fetch con keepalive
                fetch(url, {
                    method: 'PATCH',
                    headers: {
                        'Content-Type': 'application/json',
                        'apikey': SUPABASE_CONFIG.anonKey,
                        'Authorization': `Bearer ${SUPABASE_CONFIG.anonKey}`,
                        'Prefer': 'return=minimal'
                    },
                    body: body,
                    keepalive: true
                }).catch(() => {});
            } else {
                await AxonesDB.client
                    .from('presencia')
                    .update({ conectado: false, orden_editando: null })
                    .eq('usuario_id', AxonesDB.usuario.id);
            }
        }
    },

    // ============================================================
    // WIDGET DE PRESENCIA (UI component)
    // ============================================================
    presenciaWidget: {
        _channel: null,
        _container: null,

        /**
         * Renderizar widget de usuarios conectados
         * @param {string} containerId - ID del elemento donde renderizar
         */
        render: async function(containerId) {
            this._container = document.getElementById(containerId);
            if (!this._container) {
                // Crear contenedor flotante
                this._container = document.createElement('div');
                this._container.id = 'axones-presencia-widget';
                this._container.style.cssText = 'position:fixed;bottom:20px;right:20px;z-index:1050;';
                document.body.appendChild(this._container);
            }

            await this._actualizar();

            // Suscribirse a cambios
            this._channel = AxonesDB.presencia.suscribir(() => {
                this._actualizar();
            });
        },

        _actualizar: async function() {
            if (!this._container) return;

            const conectados = await AxonesDB.presencia.conectados();
            const yo = AxonesDB.usuario?.id;

            const otros = conectados.filter(u => u.usuario_id !== yo);

            if (otros.length === 0) {
                this._container.innerHTML = '';
                return;
            }

            const avatares = otros.map(u => {
                const iniciales = (u.usuario_nombre || 'U')
                    .split(' ')
                    .map(p => p[0])
                    .join('')
                    .substring(0, 2)
                    .toUpperCase();

                const pagina = u.pagina || 'desconocida';
                const editando = u.orden_editando ? ` | Editando: ${u.orden_editando}` : '';
                const titulo = `${u.usuario_nombre} - ${pagina}${editando}`;

                return `<span class="badge rounded-pill bg-success me-1" style="cursor:pointer;font-size:0.75rem;"
                         title="${titulo}" data-bs-toggle="tooltip">${iniciales}</span>`;
            }).join('');

            this._container.innerHTML = `
                <div class="card shadow-sm" style="min-width:200px;">
                    <div class="card-body py-2 px-3">
                        <small class="text-muted d-block mb-1">
                            <i class="bi bi-people-fill me-1"></i>${otros.length + 1} conectado${otros.length > 0 ? 's' : ''}
                        </small>
                        ${avatares}
                    </div>
                </div>`;

            // Activar tooltips
            if (typeof bootstrap !== 'undefined') {
                this._container.querySelectorAll('[data-bs-toggle="tooltip"]').forEach(el => {
                    new bootstrap.Tooltip(el);
                });
            }
        },

        destroy: function() {
            if (this._channel) {
                AxonesDB.realtime.cancelar(this._channel);
                this._channel = null;
            }
        }
    },

    // ============================================================
    // UTILIDADES
    // ============================================================

    /**
     * Desconectar y limpiar todo
     */
    destroy: async function() {
        this.realtime.cancelarTodas();
        await this.presencia.desconectar();
        this.presenciaWidget.destroy();
        this._inicializado = false;
        this.client = null;
        this.usuario = null;
    }
};

// Exportar globalmente
window.AxonesDB = AxonesDB;
