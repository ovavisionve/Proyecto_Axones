/**
 * Modulo Control de Impresion - Sistema Axones
 * Maneja el formulario digital de Control de Produccion de Impresion
 * Incluye conexion con inventario y generacion automatica de alertas
 */

const Impresion = {
    // Cache de datos
    inventarioCache: [],
    clientesCache: [],
    productosCache: [],

    // Orden cargada desde el modulo de ordenes
    ordenCargada: null,

    /**
     * Inicializa el modulo
     */
    init: async function() {
        // Esperar a que AxonesSync termine de descargar datos del cloud
        await this._esperarSync();

        console.log('Inicializando modulo Control de Impresion');

        this.setDefaultDate();
        this.cargarDatosIniciales();
        this.setupEventListeners();
        this.setupCalculations();
        this.setupClienteProductoConnection();

        // Verificar si viene de una orden y cargar datos automaticamente
        this.cargarDesdeOrden();

        // Inicializar controles de tiempo
        this.inicializarControlTiempo();

        // Inicializar checklist
        this.setupChecklist();

        // Calcular tiempo de preparacion automatico
        this.setupTiempoPreparacion();

        // Flechitas de etiquetas en bobinas
        this.setupEtiquetasBobinas();

        // Escuchar re-sync del cloud para recargar datos
        window.addEventListener('axones-sync', () => {
            this.cargarDatosIniciales();
        });
    },

    /**
     * Espera a que AxonesSync termine la descarga inicial (max 5 segundos)
     */
    _esperarSync: async function() {
        if (typeof AxonesSync !== 'undefined' && AxonesSync._isReady && AxonesSync._isReady()) {
            return;
        }
        return new Promise(resolve => {
            let resuelto = false;
            const handler = () => { if (!resuelto) { resuelto = true; resolve(); } };
            window.addEventListener('axones-sync', handler, { once: true });
            setTimeout(() => {
                if (!resuelto) { resuelto = true; window.removeEventListener('axones-sync', handler); resolve(); }
            }, 5000);
        });
    },

    /**
     * Inicializa los controles de tiempo (Play/Pausa/Completado)
     */
    inicializarControlTiempo: function() {
        const form = document.getElementById('formImpresion');
        if (!form || document.getElementById('panelComandasImpresion')) return;

        // Insertar panel de comandas + control de tiempo al inicio
        const panelHTML = `
            <!-- Panel de Comandas (Selector de OT tipo restaurante) -->
            <div id="panelComandasImpresion" class="mb-3"></div>

            <!-- Panel de Control de Tiempo -->
            <div id="controlTiempoImpresion" class="card mb-3 border-primary" style="display: none;">
                <div class="card-header bg-primary text-white py-2">
                    <div class="d-flex align-items-center justify-content-between">
                        <span><i class="bi bi-stopwatch me-2"></i>Control de Tiempo - Impresion</span>
                        <span id="ordenActivaImpresion" class="badge bg-light text-primary">Sin orden</span>
                    </div>
                </div>
                <div class="card-body py-2" id="contenedorControlTiempo" data-orden-id="" data-fase="impresion">
                    <div class="text-center text-muted py-3">
                        <i class="bi bi-info-circle me-2"></i>
                        Seleccione una orden de trabajo arriba
                    </div>
                </div>
            </div>
        `;

        form.insertAdjacentHTML('afterbegin', panelHTML);

        // Renderizar panel de comandas
        if (typeof ControlTiempo !== 'undefined') {
            ControlTiempo.renderPanelComandas('impresion', 'panelComandasImpresion', (orden) => {
                this.ordenCargada = orden;
                this.precargarCamposOrden(orden);
                this.mostrarBannerOrdenCargada(orden);

                // Mostrar panel de control de tiempo
                const panelTiempo = document.getElementById('controlTiempoImpresion');
                if (panelTiempo) panelTiempo.style.display = 'block';
            });
        }
    },

    /**
     * Actualiza el control de tiempo cuando se carga una orden
     */
    actualizarControlTiempo: function(ordenId, numeroOrden) {
        const contenedor = document.getElementById('contenedorControlTiempo');
        const labelOrden = document.getElementById('ordenActivaImpresion');

        if (!contenedor) return;

        if (ordenId && typeof ControlTiempo !== 'undefined') {
            contenedor.setAttribute('data-orden-id', ordenId);
            labelOrden.textContent = numeroOrden || ordenId;
            ControlTiempo.renderControles(ordenId, 'impresion', 'contenedorControlTiempo');
        } else {
            contenedor.innerHTML = `
                <div class="text-center text-muted py-3">
                    <i class="bi bi-info-circle me-2"></i>
                    Seleccione o ingrese una orden de trabajo para activar el cronometro
                </div>
            `;
            labelOrden.textContent = 'Sin orden';
        }
    },

    /**
     * Carga datos desde una orden si viene con parametros en la URL
     */
    cargarDesdeOrden: function() {
        const params = new URLSearchParams(window.location.search);
        const ot = params.get('ot');

        if (ot) {
            console.log('Cargando datos desde orden:', ot);

            // Intentar obtener la orden completa desde localStorage
            let ordenes = [];
            try {
                ordenes = JSON.parse(localStorage.getItem('axones_ordenes_trabajo') || '[]');
            } catch (e) {
                console.warn('Error parseando ordenes:', e);
                ordenes = [];
            }
            const orden = ordenes.find(o => o.ot === ot);

            if (orden) {
                this.ordenCargada = orden;
                this.precargarCamposOrden(orden);
                this.mostrarBannerOrdenCargada(orden);
            } else {
                // Si no encuentra la orden completa, usar parametros de URL
                this.precargarDesdeParametros(params);
            }
        }

        // Tambien agregar selector de ordenes si hay ordenes pendientes
        this.agregarSelectorOrdenes();
    },

    /**
     * Precarga campos del formulario desde una orden de trabajo
     */
    precargarCamposOrden: function(orden) {
        console.log('Precargando datos de orden:', orden);

        // Helper para precargar un campo
        const precargar = (id, valor) => {
            if (!valor && valor !== 0) return;
            const el = document.getElementById(id);
            if (!el) return;

            if (el.tagName === 'SELECT') {
                // Para selects, verificar que la opcion exista
                const opciones = Array.from(el.options).map(o => o.value);
                if (opciones.includes(String(valor))) {
                    el.value = String(valor);
                } else {
                    return; // No precargar si la opcion no existe
                }
            } else {
                el.value = valor;
            }
            el.classList.add('precargado-orden');
            el.style.backgroundColor = '#e8f4e8';
            el.style.borderColor = '#198754';
        };

        // === INFORMACION DE ORDEN ===
        precargar('ordenTrabajo', orden.numeroOrden || orden.ot);
        precargar('producto', orden.producto);
        precargar('fecha', orden.fechaOrden);
        precargar('totalColores', orden.numColores);
        precargar('numPistas', orden.numBandas);

        // Precargar campo de cliente
        const clienteInput = document.getElementById('cliente');
        if (clienteInput && orden.cliente) {
            clienteInput.value = orden.cliente;
            clienteInput.classList.add('precargado-orden');
            clienteInput.style.backgroundColor = '#e8f4e8';
            clienteInput.style.borderColor = '#198754';
            this.onClienteChange(orden.cliente);
        }

        // Precargar select de maquina
        const maquinaSelect = document.getElementById('maquina');
        if (maquinaSelect && orden.maquina) {
            const maquinaMap = {
                'COMEXI 1': 'comexi1',
                'COMEXI 2': 'comexi2',
                'COMEXI 3': 'comexi3',
                'COMEXI 067': 'comexi1',
                'COMEXI 045': 'comexi2'
            };
            const maquinaValue = maquinaMap[orden.maquina] || orden.maquina.toLowerCase().replace(/\s+/g, '');
            if (Array.from(maquinaSelect.options).some(opt => opt.value === maquinaValue)) {
                maquinaSelect.value = maquinaValue;
            } else if (Array.from(maquinaSelect.options).some(opt => opt.value === orden.maquina)) {
                maquinaSelect.value = orden.maquina;
            }
            maquinaSelect.classList.add('precargado-orden');
            maquinaSelect.style.backgroundColor = '#e8f4e8';
        }

        // === ESPECIFICACIONES TECNICAS (desde OT) ===
        precargar('frecuencia', orden.frecuencia);
        precargar('repeticiones', orden.numRepeticion);
        precargar('anchoCorte', orden.anchoCorte);
        precargar('figuraEmbobinado', orden.figuraEmbobinadoMontaje);
        precargar('tipoImpresion', orden.tipoImpresion);
        precargar('desarrollo', orden.desarrollo);
        precargar('lineaCorte', orden.lineaCorte);

        // Pinon (auto-calculado desde desarrollo)
        if (orden.pinon || orden.desarrollo) {
            const pinonVal = orden.pinon || (orden.desarrollo ? Math.round(orden.desarrollo / 5) : null);
            precargar('pinon', pinonVal);
        }

        // Metros estimados
        if (orden.metrosImp) {
            precargar('metrosEstimados', orden.metrosImp);
            precargar('metraje', orden.metrosImp);
        }

        // Sustratos virgen (select del inventario)
        if (orden.sustratosVirgen) {
            const sustratosSelect = document.getElementById('sustratosVirgen');
            if (sustratosSelect) {
                // Intentar match por valor exacto o parcial
                const opciones = Array.from(sustratosSelect.options);
                const match = opciones.find(o => o.value === orden.sustratosVirgen) ||
                              opciones.find(o => o.value && o.value.includes(orden.sustratosVirgen)) ||
                              opciones.find(o => o.textContent && o.textContent.includes(orden.sustratosVirgen));
                if (match) {
                    sustratosSelect.value = match.value;
                    sustratosSelect.classList.add('precargado-orden');
                    sustratosSelect.style.backgroundColor = '#e8f4e8';
                    sustratosSelect.style.borderColor = '#198754';
                    // Disparar change para que cargue datos del material
                    sustratosSelect.dispatchEvent(new Event('change'));
                }
            }
        }

        // === TINTAS (8 posiciones) ===
        if (orden.tintas && Array.isArray(orden.tintas)) {
            orden.tintas.forEach(tinta => {
                const i = tinta.posicion;
                precargar(`tinta${i}Color`, tinta.color);
                precargar(`tinta${i}Anilox`, tinta.anilox);
                precargar(`tinta${i}Visc`, tinta.viscosidad);
                precargar(`tinta${i}Pct`, tinta.porcentaje);
                precargar(`tinta${i}Obs`, tinta.observaciones);
            });
        }

        // Guardar referencia de la orden para calculos
        this.ordenCargada = orden;
        this.ordenCargada.pedidoKgOriginal = orden.pedidoKg;

        // Actualizar control de tiempo
        this.actualizarControlTiempo(orden.id || orden.ot, orden.numeroOrden || orden.ot);

        console.log('Orden precargada exitosamente:', orden.numeroOrden);
    },

    /**
     * Precarga desde parametros de URL cuando no se encuentra la orden completa
     */
    precargarDesdeParametros: function(params) {
        const mapping = {
            'ot': 'ordenTrabajo',
            'cliente': 'cliente',
            'producto': 'producto',
            'material': 'material',
            'cantidad': 'cantidad'
        };

        Object.entries(mapping).forEach(([param, campo]) => {
            const valor = params.get(param);
            if (valor) {
                const input = document.getElementById(campo);
                if (input) {
                    input.value = valor;
                    input.classList.add('precargado-orden');
                    input.setAttribute('readonly', true);
                    input.style.backgroundColor = '#e8f4e8';
                }
            }
        });
    },

    /**
     * Muestra banner indicando que se cargo una orden
     */
    mostrarBannerOrdenCargada: function(orden) {
        const form = document.getElementById('formImpresion');
        if (!form) return;

        // Verificar si ya existe el banner
        if (document.getElementById('bannerOrdenCargada')) return;

        const banner = document.createElement('div');
        banner.id = 'bannerOrdenCargada';
        banner.className = 'alert alert-success py-2 mb-3';
        banner.innerHTML = `
            <div class="d-flex align-items-center justify-content-between">
                <div>
                    <i class="bi bi-clipboard-check me-2"></i>
                    <strong>Orden cargada:</strong> ${orden.ot} - ${orden.cliente}
                    <br><small class="text-muted">Los campos verdes estan precargados. Solo complete los campos restantes.</small>
                </div>
                <button type="button" class="btn btn-sm btn-outline-secondary" onclick="Impresion.descargarOrden()">
                    <i class="bi bi-x-circle me-1"></i>Descargar orden
                </button>
            </div>
        `;

        // Insertar al inicio del formulario
        const firstSection = form.querySelector('.form-section');
        if (firstSection) {
            firstSection.parentNode.insertBefore(banner, firstSection);
        }
    },

    /**
     * Descarga la orden y limpia campos precargados
     */
    descargarOrden: function() {
        this.ordenCargada = null;

        // Limpiar campos precargados
        document.querySelectorAll('.precargado-orden').forEach(input => {
            input.value = '';
            input.classList.remove('precargado-orden');
            input.removeAttribute('readonly');
            input.style.backgroundColor = '';
        });

        // Eliminar banner
        const banner = document.getElementById('bannerOrdenCargada');
        if (banner) banner.remove();

        // Limpiar URL
        window.history.replaceState({}, document.title, window.location.pathname);
    },

    /**
     * Agrega selector de ordenes pendientes al formulario
     */
    agregarSelectorOrdenes: function() {
        console.log('[Impresion] agregarSelectorOrdenes - INICIO');

        const otInput = document.getElementById('ordenTrabajo');
        if (!otInput) {
            console.warn('[Impresion] No se encontro el campo ordenTrabajo');
            return;
        }

        if (document.getElementById('selectorOrden')) {
            console.log('[Impresion] selectorOrden ya existe');
            return;
        }

        // Obtener ordenes pendientes desde localStorage primero
        let ordenes = [];
        try {
            ordenes = JSON.parse(localStorage.getItem('axones_ordenes_trabajo') || '[]');
        } catch (e) {
            console.warn('[Impresion] Error parseando ordenes:', e);
            ordenes = [];
        }

        console.log('[Impresion] Ordenes en localStorage:', ordenes.length);

        // Renderizar con datos locales
        this._renderSelectorOrdenes(ordenes);
    },

    _renderSelectorOrdenes: function(ordenes) {
        const otInput = document.getElementById('ordenTrabajo');
        if (!otInput) return;

        // Filtrar ordenes no completadas
        const ordenesDisponibles = ordenes.filter(o => o.estadoOrden !== 'completada');
        console.log('[Impresion] Ordenes disponibles:', ordenesDisponibles.length);

        // Crear el div del selector
        const selectorDiv = document.createElement('div');
        selectorDiv.id = 'selectorOrden';
        selectorDiv.className = 'mt-2';

        if (ordenesDisponibles.length === 0) {
            selectorDiv.innerHTML = `
                <div class="alert alert-info py-1 small mb-0">
                    <i class="bi bi-info-circle me-1"></i>No hay ordenes pendientes.
                    <a href="ordenes.html" class="alert-link">Crear nueva OT</a>
                </div>
            `;
        } else {
            selectorDiv.innerHTML = `
                <label class="form-label small fw-bold text-primary mb-1">
                    <i class="bi bi-list-check me-1"></i>Ordenes Pendientes (${ordenesDisponibles.length})
                </label>
                <select class="form-select form-select-sm border-primary" id="selectOrdenPendiente">
                    <option value="">-- Seleccionar orden de trabajo --</option>
                    ${ordenesDisponibles.map(o => `
                        <option value="${o.numeroOrden || o.ot}" data-orden='${JSON.stringify(o).replace(/'/g, "&#39;")}'>
                            ${o.numeroOrden || o.ot} | ${o.cliente} | ${o.producto || 'Sin producto'} | ${(o.pedidoKg || 0).toLocaleString()}kg
                        </option>
                    `).join('')}
                </select>
            `;
        }

        // Insertar directamente despues del input ordenTrabajo
        otInput.insertAdjacentElement('afterend', selectorDiv);
        console.log('[Impresion] Selector insertado correctamente');

        // Event listener para cargar orden seleccionada
        const selectElement = document.getElementById('selectOrdenPendiente');
        if (selectElement) {
            selectElement.addEventListener('change', (e) => {
                if (e.target.value) {
                    const option = e.target.selectedOptions[0];
                    try {
                        const orden = JSON.parse(option.dataset.orden.replace(/&#39;/g, "'"));
                        this.ordenCargada = orden;
                        this.precargarCamposOrden(orden);
                        this.mostrarBannerOrdenCargada(orden);
                    } catch (err) {
                        console.warn('[Impresion] Error parseando orden seleccionada:', err);
                    }
                }
            });
        }
    },

    /**
     * Carga datos iniciales (inventario, clientes, productos)
     */
    cargarDatosIniciales: function() {
        // Cargar clientes desde CONFIG
        this.clientesCache = CONFIG.CLIENTES || [];

        // Cargar inventario desde localStorage (sincronizado con Supabase)
        this.inventarioCache = JSON.parse(localStorage.getItem('axones_inventario') || '[]');

        // Cargar historial de produccion para autocompletado
        const produccion = JSON.parse(localStorage.getItem('axones_impresion') || '[]');
        this.productosCache = [...new Set(produccion.map(p => p.producto).filter(Boolean))];

        // Poblar datalist de clientes despues de cargar
        this.poblarSelectClientes();
    },

    /**
     * Configura la conexion cliente-producto-inventario
     */
    setupClienteProductoConnection: function() {
        const clienteSelect = document.getElementById('cliente');
        const productoInput = document.getElementById('producto');
        const otInput = document.getElementById('ordenTrabajo');

        if (clienteSelect) {
            // Poblar datalist de clientes
            this.poblarSelectClientes();

            // Al cambiar cliente (blur en input), filtrar productos e inventario
            clienteSelect.addEventListener('blur', (e) => {
                this.onClienteChange(e.target.value);
            });
        }

        if (otInput) {
            // Al ingresar OT, buscar datos relacionados
            otInput.addEventListener('blur', (e) => {
                this.buscarDatosOT(e.target.value);
            });
        }

        // Agregar boton para ver inventario disponible
        this.agregarBotonInventario();
    },

    /**
     * Poblar datalist de clientes (permite escribir nuevos o seleccionar existentes)
     */
    poblarSelectClientes: function() {
        const datalist = document.getElementById('listaClientes');
        if (!datalist) return;

        // Agregar clientes de registros anteriores de impresion
        const impresiones = JSON.parse(localStorage.getItem('axones_impresion') || '[]');
        const clientesDeImpresion = impresiones
            .map(i => i.cliente)
            .filter(c => c && !this.clientesCache.includes(c));
        this.clientesCache = [...new Set([...this.clientesCache, ...clientesDeImpresion])].sort();

        // Cargar en datalist
        datalist.innerHTML = '';
        this.clientesCache.forEach(cliente => {
            const option = document.createElement('option');
            option.value = cliente;
            datalist.appendChild(option);
        });
    },

    /**
     * Manejador de cambio de cliente
     */
    onClienteChange: function(cliente) {
        if (!cliente) return;

        // Buscar inventario disponible para este cliente
        const inventarioCliente = this.inventarioCache.filter(item =>
            item.cliente === cliente || !item.cliente
        );

        // Mostrar notificacion si hay inventario asignado
        const asignado = inventarioCliente.filter(i => i.cliente === cliente);
        if (asignado.length > 0) {
            const totalKg = asignado.reduce((sum, i) => sum + (parseFloat(i.kg) || 0), 0);
            this.mostrarInfoInventario(cliente, asignado.length, totalKg);
        }
    },

    /**
     * Busca datos relacionados a una OT
     */
    buscarDatosOT: function(ot) {
        if (!ot) return;

        // Buscar en historial de produccion
        const produccion = JSON.parse(localStorage.getItem('axones_impresion') || '[]');
        const registroAnterior = produccion.find(p => p.ordenTrabajo === ot);

        if (registroAnterior) {
            // Preguntar si desea cargar datos anteriores
            if (confirm(`Se encontro un registro anterior para OT ${ot}. ¿Desea cargar los datos del producto?`)) {
                this.cargarDatosOT(registroAnterior);
            }
        }

        // Buscar consumo de tintas asociado
        const tintas = JSON.parse(localStorage.getItem('axones_tintas') || '[]');
        const tintasOT = tintas.find(t => t.ot === ot);
        if (tintasOT) {
            console.log('Tintas encontradas para OT:', tintasOT);
        }
    },

    /**
     * Carga datos de una OT anterior
     */
    cargarDatosOT: function(registro) {
        // Cargar datos basicos
        const campos = ['producto', 'cliente', 'maquina'];
        campos.forEach(campo => {
            const input = document.getElementById(campo);
            if (input && registro[campo]) {
                input.value = registro[campo];
            }
        });

        // Disparar evento change en cliente para actualizar inventario
        const clienteSelect = document.getElementById('cliente');
        if (clienteSelect && registro.cliente) {
            clienteSelect.value = registro.cliente;
            clienteSelect.dispatchEvent(new Event('change'));
        }
    },

    /**
     * Agrega boton para ver inventario disponible
     */
    agregarBotonInventario: function() {
        const productoGroup = document.getElementById('producto')?.closest('.col-md-3, .col-md-4, .mb-3');
        if (!productoGroup) return;

        // Verificar si ya existe el boton
        if (productoGroup.querySelector('.btn-ver-inventario')) return;

        const btnInventario = document.createElement('button');
        btnInventario.type = 'button';
        btnInventario.className = 'btn btn-outline-info btn-sm btn-ver-inventario mt-1';
        btnInventario.innerHTML = '<i class="bi bi-box-seam me-1"></i>Ver Inventario';
        btnInventario.addEventListener('click', () => this.mostrarModalInventario());

        productoGroup.appendChild(btnInventario);
    },

    /**
     * Muestra modal con inventario disponible
     */
    mostrarModalInventario: function() {
        const cliente = document.getElementById('cliente')?.value;

        // Filtrar inventario
        let inventario = this.inventarioCache;
        if (cliente) {
            inventario = inventario.filter(i => i.cliente === cliente || !i.cliente);
        }

        // Crear modal
        const modalHtml = `
            <div class="modal fade" id="modalInventario" tabindex="-1">
                <div class="modal-dialog modal-lg">
                    <div class="modal-content">
                        <div class="modal-header">
                            <h5 class="modal-title">
                                <i class="bi bi-box-seam me-2"></i>Inventario Disponible
                                ${cliente ? `- ${cliente}` : ''}
                            </h5>
                            <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                        </div>
                        <div class="modal-body">
                            ${this.generarTablaInventario(inventario)}
                        </div>
                        <div class="modal-footer">
                            <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cerrar</button>
                        </div>
                    </div>
                </div>
            </div>
        `;

        // Remover modal anterior si existe
        const modalExistente = document.getElementById('modalInventario');
        if (modalExistente) modalExistente.remove();

        // Insertar y mostrar modal
        document.body.insertAdjacentHTML('beforeend', modalHtml);
        const modal = new bootstrap.Modal(document.getElementById('modalInventario'));
        modal.show();
    },

    /**
     * Genera tabla HTML de inventario
     */
    generarTablaInventario: function(inventario) {
        if (inventario.length === 0) {
            return '<div class="alert alert-info">No hay inventario disponible</div>';
        }

        let html = `
            <div class="table-responsive">
                <table class="table table-sm table-hover">
                    <thead class="table-light">
                        <tr>
                            <th>Material</th>
                            <th>Micras</th>
                            <th>Ancho</th>
                            <th class="text-end">Kg</th>
                            <th>Producto</th>
                            <th>Cliente</th>
                        </tr>
                    </thead>
                    <tbody>
        `;

        inventario.forEach(item => {
            const stockClass = parseFloat(item.kg) < 100 ? 'table-warning' : '';
            html += `
                <tr class="${stockClass}">
                    <td><strong>${item.material || '-'}</strong></td>
                    <td>${item.micras || '-'}</td>
                    <td>${item.ancho || '-'}</td>
                    <td class="text-end">${parseFloat(item.kg).toLocaleString('es-VE')}</td>
                    <td>${item.producto || '-'}</td>
                    <td>${item.cliente || '<em>General</em>'}</td>
                </tr>
            `;
        });

        html += '</tbody></table></div>';

        // Agregar total
        const totalKg = inventario.reduce((sum, i) => sum + (parseFloat(i.kg) || 0), 0);
        html += `<div class="text-end mt-2"><strong>Total: ${totalKg.toLocaleString('es-VE')} Kg</strong></div>`;

        return html;
    },

    /**
     * Muestra informacion de inventario asignado
     */
    mostrarInfoInventario: function(cliente, items, totalKg) {
        // Crear o actualizar badge de inventario
        let badge = document.getElementById('badgeInventario');
        if (!badge) {
            badge = document.createElement('div');
            badge.id = 'badgeInventario';
            badge.className = 'alert alert-info py-2 mt-2';

            const clienteSelect = document.getElementById('cliente');
            if (clienteSelect) {
                clienteSelect.closest('.col-md-3, .col-md-4, .mb-3')?.appendChild(badge);
            }
        }

        badge.innerHTML = `
            <small>
                <i class="bi bi-info-circle me-1"></i>
                <strong>${items}</strong> items en inventario
                (<strong>${totalKg.toLocaleString('es-VE')} Kg</strong>)
            </small>
        `;
    },

    /**
     * Establece la fecha actual por defecto
     */
    setDefaultDate: function() {
        const fechaInput = document.getElementById('fecha');
        if (fechaInput) {
            fechaInput.value = new Date().toISOString().split('T')[0];
        }
    },

    /**
     * Configura los event listeners
     */
    setupEventListeners: function() {
        // Boton guardar
        const btnGuardar = document.getElementById('btnGuardar');
        if (btnGuardar) {
            btnGuardar.addEventListener('click', (e) => {
                e.preventDefault();
                this.guardar();
            });
        }

        // Boton limpiar
        const btnLimpiar = document.getElementById('btnLimpiar');
        if (btnLimpiar) {
            btnLimpiar.addEventListener('click', () => this.limpiar());
        }

        // Submit del formulario
        const form = document.getElementById('formImpresion');
        if (form) {
            form.addEventListener('submit', (e) => {
                e.preventDefault();
                this.guardar();
            });
        }
    },

    /**
     * Configura los calculos automaticos
     */
    setupCalculations: function() {
        // Calcular total de material de entrada
        document.querySelectorAll('.material-entrada').forEach(input => {
            input.addEventListener('input', () => this.calcularTotales());
        });

        // Calcular total de bobinas de salida
        document.querySelectorAll('.bobina-salida').forEach(input => {
            input.addEventListener('input', () => this.calcularTotales());
        });

        // Calcular total de restante
        document.querySelectorAll('.restante-entrada').forEach(input => {
            input.addEventListener('input', () => this.calcularTotales());
        });

        // Calcular total de scrap
        document.querySelectorAll('.scrap-input').forEach(input => {
            input.addEventListener('input', () => this.calcularTotales());
        });

        // Piñón automático: Desarrollo / 5
        const desarrolloInput = document.getElementById('desarrollo');
        const pinonInput = document.getElementById('pinon');
        if (desarrolloInput && pinonInput) {
            desarrolloInput.addEventListener('input', () => {
                const desarrollo = parseFloat(desarrolloInput.value) || 0;
                pinonInput.value = desarrollo > 0 ? (desarrollo / 5).toFixed(2) : '';
            });
        }

        // Sustratos virgen - cargar del inventario
        const sustratosSelect = document.getElementById('sustratosVirgen');
        if (sustratosSelect) {
            this.cargarSustratosVirgen();
            sustratosSelect.addEventListener('change', (e) => this.onSustratoSeleccionado(e));
        }
    },

    /**
     * Carga los sustratos virgen del inventario
     */
    cargarSustratosVirgen: function() {
        const select = document.getElementById('sustratosVirgen');
        if (!select) return;

        // Obtener inventario
        let inventario = [];
        const invData = localStorage.getItem('axones_inventario');
        if (invData) {
            try {
                inventario = JSON.parse(invData);
            } catch (e) {}
        }

        // Limpiar opciones excepto la primera
        select.innerHTML = '<option value="">Seleccionar del inventario...</option>';

        // Ordenar por tipo y ancho
        inventario.sort((a, b) => {
            if (a.material !== b.material) return a.material.localeCompare(b.material);
            return (a.ancho || 0) - (b.ancho || 0);
        });

        // Agregar opciones
        inventario.forEach(item => {
            if (item.cantidad > 0 || item.stockKg > 0) {
                const stock = item.cantidad || item.stockKg || 0;
                const sku = item.sku || item.id || '';
                const option = document.createElement('option');
                option.value = item.id || sku;
                option.dataset.material = item.material || '';
                option.dataset.ancho = item.ancho || '';
                option.dataset.micras = item.micras || '';
                option.dataset.densidad = item.densidad || this.getDensidadMaterial(item.material);
                option.dataset.stock = stock;
                option.textContent = `${sku} - ${item.material} ${item.ancho}mm x ${item.micras}µ (${stock.toFixed(0)} Kg)`;
                select.appendChild(option);
            }
        });
    },

    /**
     * Obtiene la densidad según el tipo de material
     */
    getDensidadMaterial: function(material) {
        const densidades = {
            'BOPP NORMAL': 0.90, 'BOPP MATE': 0.90, 'BOPP PASTA': 0.90,
            'BOPP PERLADO': 0.80, 'PERLADO': 0.80,
            'CAST': 0.92, 'METAL': 0.90,
            'PEBD': 0.93, 'PEBD PIGMENT': 0.93,
            'PET': 1.40, 'PA': 1.14, 'NYLON': 1.14
        };
        for (const [key, val] of Object.entries(densidades)) {
            if (material && material.toUpperCase().includes(key)) return val;
        }
        return 0.90;
    },

    /**
     * Maneja la selección de un sustrato
     */
    onSustratoSeleccionado: function(e) {
        const option = e.target.selectedOptions[0];
        if (!option || !option.value) {
            document.getElementById('sustratosVirgenInfo').textContent = '';
            return;
        }

        const material = option.dataset.material;
        const ancho = parseFloat(option.dataset.ancho) || 0;
        const micras = parseFloat(option.dataset.micras) || 0;
        const densidad = parseFloat(option.dataset.densidad) || 0.90;
        const stock = parseFloat(option.dataset.stock) || 0;

        // Guardar en campos ocultos
        document.getElementById('sustratosVirgenAncho').value = ancho;
        document.getElementById('sustratosVirgenMicraje').value = micras;
        document.getElementById('sustratosVirgenTipo').value = material;
        document.getElementById('sustratosVirgenDensidad').value = densidad;

        // Mostrar info
        const info = document.getElementById('sustratosVirgenInfo');
        if (info) {
            info.textContent = `${material} | ${ancho}mm x ${micras}µ | Densidad: ${densidad} | Stock: ${stock.toFixed(0)} Kg`;
        }

        // Calcular metros estimados si hay kg de entrada
        this.calcularMetrosEstimados();
    },

    /**
     * Calcula los metros estimados
     */
    calcularMetrosEstimados: function() {
        const totalEntradaEl = document.getElementById('totalMaterialEntrada');
        const metrosEl = document.getElementById('metrosEstimados');
        if (!totalEntradaEl || !metrosEl) return;

        const kg = parseFloat(totalEntradaEl.value) || 0;
        const ancho = parseFloat(document.getElementById('sustratosVirgenAncho')?.value) || 0;
        const micras = parseFloat(document.getElementById('sustratosVirgenMicraje')?.value) || 0;
        const densidad = parseFloat(document.getElementById('sustratosVirgenDensidad')?.value) || 0.90;

        if (kg > 0 && ancho > 0 && micras > 0) {
            // Gramaje = Ancho(m) x Micras x Densidad
            const gramaje = (ancho / 1000) * micras * densidad;
            // Metros = Kg * 1000 / Gramaje
            const metros = (kg * 1000) / gramaje;
            metrosEl.value = metros.toLocaleString('es-VE', { maximumFractionDigits: 0 }) + ' m';
        } else {
            metrosEl.value = '';
        }
    },

    /**
     * Calcula todos los totales
     */
    calcularTotales: function() {
        // Total material de entrada
        let totalEntrada = 0;
        document.querySelectorAll('.material-entrada').forEach(input => {
            totalEntrada += parseFloat(input.value) || 0;
        });
        document.getElementById('totalMaterialEntrada').value = totalEntrada.toFixed(2);

        // Total bobinas de salida y conteo
        let totalSalida = 0;
        let numBobinas = 0;
        document.querySelectorAll('.bobina-salida').forEach(input => {
            const valor = parseFloat(input.value) || 0;
            if (valor > 0) {
                totalSalida += valor;
                numBobinas++;
            }
        });
        document.getElementById('pesoTotal').value = totalSalida.toFixed(2);
        document.getElementById('numBobinas').value = numBobinas;

        // Merma (entrada - salida - scrap)
        const scrapRefile = parseFloat(document.getElementById('scrapRefile').value) || 0;
        const scrapImpreso = parseFloat(document.getElementById('scrapImpreso').value) || 0;
        const totalScrap = scrapRefile + scrapImpreso;
        document.getElementById('totalScrap').value = totalScrap.toFixed(2);

        const merma = totalEntrada - totalSalida - totalScrap;
        document.getElementById('merma').value = merma.toFixed(2);

        // Porcentaje de Refil
        let porcentajeRefil = 0;
        if (totalEntrada > 0) {
            // Refil = (Merma + Scrap) / Entrada * 100
            porcentajeRefil = ((merma + totalScrap) / totalEntrada) * 100;
        }
        document.getElementById('porcentajeRefil').value = porcentajeRefil.toFixed(2) + '%';

        // Actualizar indicador de refil
        this.actualizarIndicadorRefil(porcentajeRefil, totalEntrada);

        // Total restante
        let totalRestante = 0;
        document.querySelectorAll('.restante-entrada').forEach(input => {
            totalRestante += parseFloat(input.value) || 0;
        });
        const totalRestanteEl = document.getElementById('totalRestante');
        if (totalRestanteEl) totalRestanteEl.value = totalRestante.toFixed(2);

        const totalConsumido = totalEntrada - totalRestante;
        const totalConsumidoEl = document.getElementById('totalConsumido');
        if (totalConsumidoEl) totalConsumidoEl.textContent = totalConsumido.toFixed(2);

        // Actualizar Resumen de Produccion
        const resEntrada = document.getElementById('resumenEntrada');
        const resRestante = document.getElementById('resumenRestante');
        const resConsumido = document.getElementById('resumenConsumido');
        const resSalida = document.getElementById('resumenSalida');
        const resScrap = document.getElementById('resumenScrap');
        const resMerma = document.getElementById('resumenMermaCalc');
        const resRefil = document.getElementById('resumenRefilCalc');
        if (resEntrada) resEntrada.textContent = totalEntrada.toFixed(2) + ' Kg';
        if (resRestante) resRestante.textContent = totalRestante.toFixed(2) + ' Kg';
        if (resConsumido) resConsumido.textContent = totalConsumido.toFixed(2) + ' Kg';
        if (resSalida) resSalida.textContent = totalSalida.toFixed(2) + ' Kg';
        if (resScrap) resScrap.textContent = totalScrap.toFixed(2) + ' Kg';
        const mermaResumen = totalConsumido - totalSalida - totalScrap;
        if (resMerma) resMerma.textContent = mermaResumen.toFixed(2) + ' Kg';
        let refilResumen = 0;
        if (totalConsumido > 0) {
            refilResumen = (totalScrap / totalConsumido) * 100;
        }
        if (resRefil) resRefil.textContent = refilResumen.toFixed(2) + '%';

        // Actualizar footer
        document.getElementById('footerEntrada').textContent = totalEntrada.toFixed(0);
        document.getElementById('footerSalida').textContent = totalSalida.toFixed(0);
        document.getElementById('footerMerma').textContent = merma.toFixed(2);
        document.getElementById('footerRefil').textContent = porcentajeRefil.toFixed(2);

        // Recalcular metros estimados
        this.calcularMetrosEstimados();
    },

    /**
     * Actualiza el indicador visual de refil
     */
    actualizarIndicadorRefil: function(porcentaje, totalEntrada) {
        const indicador = document.getElementById('indicadorRefil');
        if (!indicador) return;

        if (totalEntrada === 0) {
            indicador.className = 'alert alert-secondary py-1 px-2 mb-0 small text-center';
            indicador.innerHTML = '<i class="bi bi-dash-circle me-1"></i> Sin datos';
            return;
        }

        // Obtener umbral (por ahora usamos el default, pendiente definir con el cliente)
        const umbral = CONFIG.UMBRALES_REFIL.default;

        if (porcentaje <= umbral.advertencia) {
            indicador.className = 'alert alert-success py-1 px-2 mb-0 small text-center';
            indicador.innerHTML = '<i class="bi bi-check-circle me-1"></i> Refil OK';
        } else if (porcentaje <= umbral.maximo) {
            indicador.className = 'alert alert-warning py-1 px-2 mb-0 small text-center';
            indicador.innerHTML = '<i class="bi bi-exclamation-triangle me-1"></i> Refil en advertencia';
        } else {
            indicador.className = 'alert alert-danger py-1 px-2 mb-0 small text-center';
            indicador.innerHTML = '<i class="bi bi-x-circle me-1"></i> Refil excedido';
        }
    },

    /**
     * Valida campos requeridos con mensajes personalizados
     */
    validarCamposRequeridos: function() {
        const errores = [];
        const fecha = document.getElementById('fecha')?.value;
        const turno = document.querySelector('input[name="turno"]:checked');
        const maquina = document.getElementById('maquina')?.value;
        const cliente = document.getElementById('cliente')?.value;
        const producto = document.getElementById('producto')?.value;
        const ordenTrabajo = document.getElementById('ordenTrabajo')?.value;
        const operador = document.getElementById('operador')?.value;

        if (!fecha) errores.push('Fecha es requerida');
        if (!turno) errores.push('Seleccione un turno');
        if (!maquina) errores.push('Seleccione una maquina');
        if (!cliente) errores.push('Seleccione un cliente');
        if (!producto || producto.trim().length < 2) errores.push('Ingrese el nombre del producto (minimo 2 caracteres)');
        if (!ordenTrabajo || ordenTrabajo.trim().length < 3) errores.push('Ingrese la orden de trabajo (minimo 3 caracteres)');
        if (!operador || operador.trim().length < 3) errores.push('Ingrese el nombre del operador (minimo 3 caracteres)');

        // Validar que haya al menos una bobina de entrada
        let totalEntrada = 0;
        for (let i = 1; i <= 14; i++) {
            totalEntrada += parseFloat(document.getElementById('bob' + i)?.value) || 0;
        }
        if (totalEntrada <= 0) errores.push('Ingrese al menos una bobina de entrada');

        return errores;
    },

    /**
     * Guarda el registro
     */
    guardar: function() {
        // Validacion personalizada
        const errores = this.validarCamposRequeridos();
        if (errores.length > 0) {
            this.mostrarToast('Errores: ' + errores.join(', '), 'danger');
            return;
        }

        // Validar formulario HTML5
        const form = document.getElementById('formImpresion');
        if (!form.checkValidity()) {
            form.reportValidity();
            return;
        }

        // Recopilar datos
        const datos = this.recopilarDatos();

        // Mostrar indicador de carga
        const btnGuardar = document.getElementById('btnGuardar');
        const btnText = btnGuardar ? btnGuardar.innerHTML : '';
        if (btnGuardar) {
            btnGuardar.disabled = true;
            btnGuardar.innerHTML = '<span class="spinner-border spinner-border-sm me-1"></span>Guardando...';
        }

        try {
            // Guardar en localStorage (sincronizado con Supabase via sync-realtime)
            this.guardarLocal(datos);

            // Descontar material del inventario automaticamente
            this.descontarInventario(datos);

            // Verificar alertas
            this.verificarAlertas(datos);

            this.mostrarToast('Registro guardado', 'success');

            // Limpiar formulario
            this.limpiar();
        } catch (error) {
            console.error('Error guardando registro:', error);
            this.mostrarToast('Error al guardar: ' + error.message, 'danger');
        } finally {
            // Restaurar boton
            if (btnGuardar) {
                btnGuardar.disabled = false;
                btnGuardar.innerHTML = btnText;
            }
        }
    },

    /**
     * Muestra un toast de notificacion
     */
    mostrarToast: function(mensaje, tipo = 'info') {
        let toastContainer = document.querySelector('.toast-container');
        if (!toastContainer) {
            toastContainer = document.createElement('div');
            toastContainer.className = 'toast-container position-fixed bottom-0 end-0 p-3';
            document.body.appendChild(toastContainer);
        }

        const bgClass = tipo === 'success' ? 'bg-success' : tipo === 'warning' ? 'bg-warning' : tipo === 'danger' ? 'bg-danger' : 'bg-info';
        const textClass = tipo === 'warning' ? 'text-dark' : 'text-white';

        const toastHtml = `
            <div class="toast align-items-center ${bgClass} ${textClass} border-0" role="alert">
                <div class="d-flex">
                    <div class="toast-body">${mensaje}</div>
                    <button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast"></button>
                </div>
            </div>
        `;

        toastContainer.insertAdjacentHTML('beforeend', toastHtml);
        const toastEl = toastContainer.lastElementChild;
        const toast = new bootstrap.Toast(toastEl, { autohide: true, delay: 5000 });
        toast.show();
        toastEl.addEventListener('hidden.bs.toast', () => toastEl.remove());
    },

    /**
     * Recopila todos los datos del formulario
     */
    recopilarDatos: function() {
        // Obtener turno seleccionado
        const turnoSeleccionado = document.querySelector('input[name="turno"]:checked');

        // Obtener materiales de entrada
        const materialesEntrada = [];
        for (let i = 1; i <= 26; i++) {
            const valor = parseFloat(document.getElementById('mat' + i).value) || 0;
            if (valor > 0) {
                materialesEntrada.push({ posicion: i, peso: valor });
            }
        }

        // Obtener restante de bobinas
        const materialesRestante = [];
        for (let i = 1; i <= 26; i++) {
            const valor = parseFloat(document.getElementById('rest' + i)?.value) || 0;
            if (valor > 0) {
                materialesRestante.push({ posicion: i, peso: valor });
            }
        }

        // Obtener bobinas de salida
        const bobinasSalida = [];
        for (let i = 1; i <= 22; i++) {
            const valor = parseFloat(document.getElementById('bob' + i).value) || 0;
            if (valor > 0) {
                bobinasSalida.push({ posicion: i, peso: valor });
            }
        }

        return {
            // Metadatos
            id: 'IMP_' + Date.now(),
            timestamp: new Date().toISOString(),
            tipo: 'impresion',

            // Datos generales
            turno: turnoSeleccionado ? turnoSeleccionado.value : '',
            cliente: document.getElementById('cliente')?.value || '',
            producto: document.getElementById('producto').value,
            maquina: document.getElementById('maquina').value,
            fecha: document.getElementById('fecha').value,
            ordenTrabajo: document.getElementById('ordenTrabajo').value,
            totalColores: parseInt(document.getElementById('totalColores')?.value) || 0,
            numPistas: parseInt(document.getElementById('numPistas')?.value) || 0,
            operador: document.getElementById('operador').value,
            ayudante: document.getElementById('ayudante').value,
            supervisor: document.getElementById('supervisor').value,
            horaInicio: document.getElementById('horaInicio').value,
            horaArranque: document.getElementById('horaArranque').value,

            // Material de entrada
            materialesEntrada: materialesEntrada,
            totalMaterialEntrada: parseFloat(document.getElementById('totalMaterialEntrada').value) || 0,

            // Restante de bobinas
            materialesRestante: materialesRestante,
            totalRestante: parseFloat(document.getElementById('totalRestante')?.value) || 0,
            totalConsumido: parseFloat(document.getElementById('totalConsumido')?.textContent) || 0,

            // Pesaje
            numPesaje: document.getElementById('numPesaje').value,
            pesajeApertura: document.getElementById('pesajeApertura').value,
            pesajeCierre: document.getElementById('pesajeCierre').value,

            // Bobinas de salida
            bobinasSalida: bobinasSalida,
            numBobinas: parseInt(document.getElementById('numBobinas').value) || 0,
            pesoTotal: parseFloat(document.getElementById('pesoTotal').value) || 0,
            merma: parseFloat(document.getElementById('merma').value) || 0,
            metraje: parseFloat(document.getElementById('metraje').value) || 0,

            // Scrap / Refil
            scrapRefile: parseFloat(document.getElementById('scrapRefile').value) || 0,
            scrapImpreso: parseFloat(document.getElementById('scrapImpreso').value) || 0,
            totalScrap: parseFloat(document.getElementById('totalScrap').value) || 0,
            porcentajeRefil: parseFloat(document.getElementById('porcentajeRefil').value) || 0,

            // Tiempos
            horaInicio: document.getElementById('horaInicio')?.value || '',
            horaArranque: document.getElementById('horaArranque')?.value || '',

            // Paradas y observaciones
            motivosParadas: document.getElementById('motivosParadas').value,
            observaciones: document.getElementById('observaciones').value,

            // Etiquetas de bobinas
            etiquetasEntrada: this.etiquetasData.entrada,
            etiquetasSalida: this.etiquetasData.salida,

            // Usuario
            registradoPor: Auth.getUser() ? Auth.getUser().id : 'unknown',
            registradoPorNombre: Auth.getUser() ? Auth.getUser().nombre : 'Unknown',
        };
    },

    /**
     * Guarda en localStorage (desarrollo)
     */
    guardarLocal: function(datos) {
        // Guardar en produccion
        const registros = JSON.parse(localStorage.getItem('axones_produccion') || '[]');
        registros.unshift(datos);
        localStorage.setItem('axones_produccion', JSON.stringify(registros));

        // Tambien guardar en key especifica de impresion
        const impresion = JSON.parse(localStorage.getItem('axones_impresion') || '[]');
        impresion.unshift(datos);
        localStorage.setItem('axones_impresion', JSON.stringify(impresion));
    },

    /**
     * Descuenta automaticamente el material utilizado del inventario
     */
    descontarInventario: function(datos) {
        try {
            const inventario = JSON.parse(localStorage.getItem('axones_inventario') || '[]');
            // Usar totalConsumido (entrada - restante) en vez de totalEntrada
            const cantidadUsada = parseFloat(datos.totalConsumido) || parseFloat(datos.totalMaterialEntrada) || 0;

            if (cantidadUsada <= 0) return;

            // Buscar material que coincida (por producto/cliente asociado)
            let descontado = false;
            let restante = cantidadUsada;

            for (let i = 0; i < inventario.length && restante > 0; i++) {
                const item = inventario[i];

                // Intentar coincidir por producto o por caracteristicas generales
                const coincideProducto = item.producto &&
                    (item.producto.toLowerCase().includes(datos.producto?.toLowerCase() || '') ||
                     datos.producto?.toLowerCase().includes(item.producto.toLowerCase()));

                // Si coincide el producto o es material generico sin asignar
                if (coincideProducto || !item.producto) {
                    const disponible = parseFloat(item.kg) || 0;

                    if (disponible > 0) {
                        const aDescontar = Math.min(disponible, restante);
                        item.kg = disponible - aDescontar;
                        restante -= aDescontar;
                        descontado = true;

                        console.log(`Inventario: Descontados ${aDescontar} Kg de ${item.material} (Quedan: ${item.kg} Kg)`);
                    }
                }
            }

            if (descontado) {
                localStorage.setItem('axones_inventario', JSON.stringify(inventario));
                console.log('Inventario actualizado despues de produccion');

                // Verificar si hay stock bajo y generar alerta
                this.verificarStockBajo(inventario);
            }
        } catch (error) {
            console.warn('Error al descontar inventario:', error);
        }
    },

    /**
     * Verifica si hay materiales con stock bajo y genera alertas
     */
    verificarStockBajo: function(inventario) {
        const STOCK_MINIMO = 200; // Kg
        const alertas = JSON.parse(localStorage.getItem('axones_alertas') || '[]');

        inventario.forEach(item => {
            if ((item.kg || 0) < STOCK_MINIMO && (item.kg || 0) > 0) {
                // Verificar si ya existe una alerta reciente para este material
                const alertaExistente = alertas.find(a =>
                    a.tipo === 'stock_bajo' &&
                    a.datos?.material === item.material &&
                    new Date(a.fecha) > new Date(Date.now() - 24 * 60 * 60 * 1000) // Ultimas 24 horas
                );

                if (!alertaExistente) {
                    alertas.unshift({
                        id: Date.now(),
                        tipo: 'stock_bajo',
                        nivel: item.kg < 50 ? 'danger' : 'warning',
                        mensaje: `Stock bajo: ${item.material} ${item.micras || ''}µ - Quedan ${item.kg?.toFixed(1) || 0} Kg`,
                        fecha: new Date().toISOString(),
                        estado: 'pendiente',
                        datos: { material: item.material, cantidad: item.kg }
                    });
                    console.log('Alerta de stock bajo generada para', item.material);
                }
            }
        });

        localStorage.setItem('axones_alertas', JSON.stringify(alertas));
    },

    /**
     * Verifica y genera alertas segun los datos
     */
    verificarAlertas: function(datos) {
        const umbral = CONFIG.UMBRALES_REFIL.default;
        const porcentajeRefil = parseFloat(datos.porcentajeRefil) || 0;

        // Alerta por Refil alto
        if (porcentajeRefil > umbral.advertencia) {
            this.generarAlerta(datos);
        }

        // Alerta por tiempo muerto excesivo
        this.verificarTiempoMuerto(datos);

        // Actualizar contadores de produccion si HomeModule esta disponible
        if (typeof HomeModule !== 'undefined') {
            HomeModule.cargarKPIs();
            HomeModule.cargarProduccionHoy();
        }
    },

    /**
     * Genera una alerta por refil excedido
     */
    generarAlerta: function(datos) {
        const porcentaje = parseFloat(datos.porcentajeRefil) || 0;
        const umbral = CONFIG.UMBRALES_REFIL.default;

        // Determinar tipo y nivel de alerta
        const esCritico = porcentaje > umbral.maximo;
        const tipo = esCritico ? 'refil_critico' : 'refil_alto';
        const nivel = esCritico ? 'critical' : 'warning';

        const alerta = {
            id: Date.now(),
            fecha: new Date().toISOString(),
            tipo: tipo,
            nivel: nivel,
            maquina: datos.maquina,
            ot: datos.ordenTrabajo,
            mensaje: `Refil ${porcentaje.toFixed(1)}% en OT ${datos.ordenTrabajo} - ${datos.maquina} - Producto: ${datos.producto}`,
            estado: 'pendiente',
            datos: {
                porcentajeRefil: porcentaje,
                umbral: umbral.maximo,
                producto: datos.producto,
                cliente: datos.cliente,
                operador: datos.operador
            }
        };

        // Guardar alerta localmente
        const alertas = JSON.parse(localStorage.getItem('axones_alertas') || '[]');
        alertas.unshift(alerta);
        localStorage.setItem('axones_alertas', JSON.stringify(alertas));

        // Actualizar badge de alertas si existe
        this.actualizarBadgeAlertas();

        // Mostrar notificacion visual
        this.mostrarNotificacionAlerta(alerta);
    },

    /**
     * Actualiza el badge de alertas en el navbar
     */
    actualizarBadgeAlertas: function() {
        const badge = document.getElementById('alertasBadge');
        if (!badge) return;

        const alertas = JSON.parse(localStorage.getItem('axones_alertas') || '[]');
        const pendientes = alertas.filter(a => a.estado === 'pendiente' || a.estado === 'activa').length;

        if (pendientes > 0) {
            badge.textContent = pendientes;
            badge.style.display = 'inline-block';
        } else {
            badge.style.display = 'none';
        }
    },

    /**
     * Muestra notificacion visual de alerta
     */
    mostrarNotificacionAlerta: function(alerta) {
        // Crear toast container si no existe
        let toastContainer = document.querySelector('.toast-container');
        if (!toastContainer) {
            toastContainer = document.createElement('div');
            toastContainer.className = 'toast-container position-fixed top-0 end-0 p-3';
            toastContainer.style.zIndex = '1100';
            document.body.appendChild(toastContainer);
        }

        const bgClass = alerta.nivel === 'critical' ? 'bg-danger' : 'bg-warning';
        const textClass = alerta.nivel === 'critical' ? 'text-white' : 'text-dark';

        const toastHtml = `
            <div class="toast align-items-center ${bgClass} ${textClass} border-0" role="alert">
                <div class="d-flex">
                    <div class="toast-body">
                        <i class="bi bi-exclamation-triangle me-2"></i>
                        <strong>ALERTA ${alerta.nivel === 'critical' ? 'CRITICA' : ''}:</strong>
                        Refil ${alerta.datos.porcentajeRefil.toFixed(1)}% excedido
                        <br>
                        <small>OT: ${alerta.ot} - ${alerta.maquina}</small>
                    </div>
                    <button type="button" class="btn-close ${alerta.nivel === 'critical' ? 'btn-close-white' : ''} me-2 m-auto" data-bs-dismiss="toast"></button>
                </div>
            </div>
        `;

        toastContainer.insertAdjacentHTML('beforeend', toastHtml);
        const toastEl = toastContainer.lastElementChild;
        const toast = new bootstrap.Toast(toastEl, { autohide: true, delay: 8000 });
        toast.show();

        toastEl.addEventListener('hidden.bs.toast', () => toastEl.remove());
    },

    /**
     * Verifica tiempo muerto excesivo
     */
    verificarTiempoMuerto: function(datos) {
        const tiempoMuerto = parseInt(datos.tiempoMuerto) || 0;
        const tiempoEfectivo = parseInt(datos.tiempoEfectivo) || 0;

        // Si tiempo muerto es mayor al 20% del tiempo efectivo, generar alerta
        if (tiempoEfectivo > 0 && tiempoMuerto > 0) {
            const porcentajeTiempoMuerto = (tiempoMuerto / (tiempoMuerto + tiempoEfectivo)) * 100;
            if (porcentajeTiempoMuerto > 20) {
                const alerta = {
                    id: Date.now() + 1,
                    fecha: new Date().toISOString(),
                    tipo: 'tiempo_muerto_alto',
                    nivel: 'info',
                    maquina: datos.maquina,
                    ot: datos.ordenTrabajo,
                    mensaje: `Tiempo muerto ${porcentajeTiempoMuerto.toFixed(0)}% en OT ${datos.ordenTrabajo}`,
                    estado: 'pendiente',
                    datos: {
                        tiempoMuerto: tiempoMuerto,
                        tiempoEfectivo: tiempoEfectivo,
                        porcentaje: porcentajeTiempoMuerto
                    }
                };

                const alertas = JSON.parse(localStorage.getItem('axones_alertas') || '[]');
                alertas.unshift(alerta);
                localStorage.setItem('axones_alertas', JSON.stringify(alertas));
            }
        }
    },

    /**
     * Configura el checklist integrado
     */
    setupChecklist: function() {
        // Fecha del checklist
        const fechaSpan = document.getElementById('checklistFecha');
        if (fechaSpan) {
            fechaSpan.textContent = new Date().toLocaleDateString('es-VE');
        }

        // Progreso del checklist
        document.querySelectorAll('.checklist-item').forEach(cb => {
            cb.addEventListener('change', () => this.actualizarProgresoChecklist());
        });

        // Boton guardar checklist
        const btnGuardar = document.getElementById('btnGuardarChecklist');
        if (btnGuardar) {
            btnGuardar.addEventListener('click', () => this.guardarChecklist());
        }
    },

    actualizarProgresoChecklist: function() {
        const total = document.querySelectorAll('.checklist-item').length;
        const marcados = document.querySelectorAll('.checklist-item:checked').length;
        const badge = document.getElementById('checklistProgreso');
        if (badge) {
            badge.textContent = `${marcados}/${total} completados`;
        }
    },

    guardarChecklist: function() {
        const items = [];
        document.querySelectorAll('.checklist-item').forEach(cb => {
            items.push({ item: cb.value, completado: cb.checked });
        });

        const estado = document.querySelector('input[name="checklistEstado"]:checked');
        const datos = {
            id: 'CHK_IMP_' + Date.now(),
            area: 'impresion',
            fecha: new Date().toISOString(),
            ordenTrabajo: document.getElementById('ordenTrabajo')?.value || '',
            items: items,
            estado: estado ? estado.value : '',
            observaciones: document.getElementById('checklistObservaciones')?.value || '',
            elaboradoPor: document.getElementById('checklistElaborado')?.value || '',
            revisadoPor: document.getElementById('checklistRevisado')?.value || '',
            aprobadoPor: document.getElementById('checklistAprobadoPor')?.value || ''
        };

        // Guardar en localStorage
        const checklists = JSON.parse(localStorage.getItem('axones_checklists') || '[]');
        checklists.unshift(datos);
        localStorage.setItem('axones_checklists', JSON.stringify(checklists));

        this.mostrarToast('Checklist guardado correctamente', 'success');

        // Cerrar modal
        const modal = bootstrap.Modal.getInstance(document.getElementById('modalChecklist'));
        if (modal) modal.hide();
    },

    /**
     * Configura calculo automatico del tiempo de preparacion
     */
    setupTiempoPreparacion: function() {
        const horaInicio = document.getElementById('horaInicio');
        const horaArranque = document.getElementById('horaArranque');

        const calcular = () => {
            const inicio = horaInicio?.value;
            const arranque = horaArranque?.value;
            const span = document.getElementById('tiempoPreparacionCalc');
            if (!span) return;

            if (inicio && arranque) {
                const [hi, mi] = inicio.split(':').map(Number);
                const [ha, ma] = arranque.split(':').map(Number);
                let diffMin = (ha * 60 + ma) - (hi * 60 + mi);
                if (diffMin < 0) diffMin += 24 * 60;
                const horas = Math.floor(diffMin / 60);
                const mins = diffMin % 60;
                span.textContent = horas > 0 ? `${horas}h ${mins}min` : `${mins} min`;
            } else {
                span.textContent = '--';
            }
        };

        if (horaInicio) horaInicio.addEventListener('change', calcular);
        if (horaArranque) horaArranque.addEventListener('change', calcular);
    },

    /**
     * Datos de etiquetas de bobinas (entrada y salida)
     */
    etiquetasData: { entrada: {}, salida: {} },

    /**
     * Configura flechitas de etiquetas en bobinas de entrada y salida
     */
    setupEtiquetasBobinas: function() {
        const self = this;
        const entradaFields = ['Proveedor', 'Referencia', 'Medida', 'Micraje', 'TratInt', 'TratExt', 'Fecha', 'Maquina', 'Pedido'];
        const salidaFields = ['Peso', 'Fecha', 'Metraje', 'Hora', 'Empalmes', 'Operador'];

        // Inyectar flechitas en bobinas de entrada (mat1-mat26)
        for (let i = 1; i <= 26; i++) {
            const input = document.getElementById('mat' + i);
            if (!input) continue;
            const label = input.previousElementSibling;
            if (!label || label.querySelector('.bobina-arrow')) continue;
            const wrapper = document.createElement('span');
            wrapper.className = 'bobina-label-wrapper';
            wrapper.innerHTML = label.innerHTML;
            const arrow = document.createElement('i');
            arrow.className = 'bi bi-caret-down-fill bobina-arrow';
            arrow.dataset.tipo = 'entrada';
            arrow.dataset.bobina = 'mat' + i;
            arrow.dataset.numero = i;
            arrow.title = 'Etiqueta bobina ' + i;
            wrapper.appendChild(arrow);
            label.innerHTML = '';
            label.appendChild(wrapper);
        }

        // Inyectar flechitas en bobinas de salida (bob1-bob22)
        for (let i = 1; i <= 22; i++) {
            const input = document.getElementById('bob' + i);
            if (!input) continue;
            const label = input.previousElementSibling;
            if (!label || label.querySelector('.bobina-arrow')) continue;
            const wrapper = document.createElement('span');
            wrapper.className = 'bobina-label-wrapper';
            wrapper.innerHTML = label.innerHTML;
            const arrow = document.createElement('i');
            arrow.className = 'bi bi-caret-down-fill bobina-arrow';
            arrow.dataset.tipo = 'salida';
            arrow.dataset.bobina = 'bob' + i;
            arrow.dataset.numero = i;
            arrow.title = 'Etiqueta bobina ' + i;
            wrapper.appendChild(arrow);
            label.innerHTML = '';
            label.appendChild(wrapper);
        }

        // Delegated click handler for arrows
        document.addEventListener('click', function(e) {
            const arrow = e.target.closest('.bobina-arrow');
            if (!arrow) return;
            const tipo = arrow.dataset.tipo;
            const bobinaId = arrow.dataset.bobina;
            const numero = arrow.dataset.numero;

            if (tipo === 'entrada') {
                document.getElementById('etqEntBobinaId').value = bobinaId;
                document.getElementById('etqEntNumero').textContent = numero;
                const data = self.etiquetasData.entrada[bobinaId] || {};
                entradaFields.forEach(f => {
                    const el = document.getElementById('etqEnt' + f);
                    if (el) el.value = data[f] || '';
                });
                new bootstrap.Modal(document.getElementById('modalEtiquetaEntrada')).show();
            } else if (tipo === 'salida') {
                document.getElementById('etqSalBobinaId').value = bobinaId;
                document.getElementById('etqSalNumero').textContent = numero;
                const data = self.etiquetasData.salida[bobinaId] || {};
                salidaFields.forEach(f => {
                    const el = document.getElementById('etqSal' + f);
                    if (el) el.value = data[f] || '';
                });
                // Auto-fill peso from the bobina input
                const pesoInput = document.getElementById(bobinaId);
                if (pesoInput && pesoInput.value && !data.Peso) {
                    document.getElementById('etqSalPeso').value = pesoInput.value;
                }
                new bootstrap.Modal(document.getElementById('modalEtiquetaSalida')).show();
            }
        });

        // Save button for entrada
        const btnEnt = document.getElementById('btnGuardarEtqEnt');
        if (btnEnt) {
            btnEnt.addEventListener('click', function() {
                const bobinaId = document.getElementById('etqEntBobinaId').value;
                const data = {};
                let hasData = false;
                entradaFields.forEach(f => {
                    const val = document.getElementById('etqEnt' + f)?.value || '';
                    data[f] = val;
                    if (val) hasData = true;
                });
                self.etiquetasData.entrada[bobinaId] = data;
                // Mark arrow
                const arrow = document.querySelector(`.bobina-arrow[data-bobina="${bobinaId}"]`);
                if (arrow) arrow.classList.toggle('has-data', hasData);
                bootstrap.Modal.getInstance(document.getElementById('modalEtiquetaEntrada'))?.hide();
            });
        }

        // Save button for salida
        const btnSal = document.getElementById('btnGuardarEtqSal');
        if (btnSal) {
            btnSal.addEventListener('click', function() {
                const bobinaId = document.getElementById('etqSalBobinaId').value;
                const data = {};
                let hasData = false;
                salidaFields.forEach(f => {
                    const val = document.getElementById('etqSal' + f)?.value || '';
                    data[f] = val;
                    if (val) hasData = true;
                });
                self.etiquetasData.salida[bobinaId] = data;
                const arrow = document.querySelector(`.bobina-arrow[data-bobina="${bobinaId}"]`);
                if (arrow) arrow.classList.toggle('has-data', hasData);
                bootstrap.Modal.getInstance(document.getElementById('modalEtiquetaSalida'))?.hide();
            });
        }
    },

    /**
     * Limpia el formulario
     */
    limpiar: function() {
        const form = document.getElementById('formImpresion');
        if (form) {
            form.reset();
            this.setDefaultDate();

            // Limpiar campos calculados
            document.getElementById('totalMaterialEntrada').value = '';
            document.getElementById('numBobinas').value = '';
            document.getElementById('pesoTotal').value = '';
            document.getElementById('merma').value = '';
            document.getElementById('totalScrap').value = '';
            document.getElementById('porcentajeRefil').value = '';

            // Resetear indicador
            const indicador = document.getElementById('indicadorRefil');
            if (indicador) {
                indicador.className = 'alert alert-secondary py-1 px-2 mb-0 small text-center';
                indicador.innerHTML = '<i class="bi bi-dash-circle me-1"></i> Sin datos';
            }

            // Resetear footer
            document.getElementById('footerEntrada').textContent = '0';
            document.getElementById('footerSalida').textContent = '0';
            document.getElementById('footerMerma').textContent = '0';
            document.getElementById('footerRefil').textContent = '0';
        }
    },
};

// Inicializar cuando el DOM este listo
document.addEventListener('DOMContentLoaded', () => {
    if (document.getElementById('formImpresion')) {
        Impresion.init();
    }
});

// Exportar modulo
if (typeof module !== 'undefined' && module.exports) {
    module.exports = Impresion;
}
