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
        console.log('Inicializando modulo Control de Impresion');

        // Asegurar que AxonesDB esta inicializado
        if (typeof AxonesDB !== 'undefined' && !AxonesDB.isReady()) {
            await AxonesDB.init();
        }

        await this.cargarDatosIniciales();
        this.setupEventListeners();
        this.setupCalculations();
        this.initDevolucionRechazada();

        // Poblar selector de OTs y verificar si viene una por URL
        await this.poblarSelectorOT();
        await this.cargarDesdeOrden();

        // Inicializar controles de tiempo
        this.inicializarControlTiempo();

        // Inicializar checklist
        this.setupChecklist();

        // Inicializar 3 temporizadores (Preparacion, Produccion, Desmontaje)
        this.initTemporizadores();

        // Flechitas de etiquetas en bobinas
        this.setupEtiquetasBobinas();

        // Autosave: restaurar datos si hay sesion guardada
        this.restaurarAutosave();
        // Autosave: guardar cada 10 segundos
        this._autosaveInterval = setInterval(() => this.autosave(), 10000);

        // Escuchar re-sync del cloud para recargar datos
        window.addEventListener('axones-sync', async () => {
            await this.cargarDatosIniciales();
            await this.poblarSelectorOT();
        });
    },

    /**
     * Inicializa los controles de tiempo (Play/Pausa/Completado)
     */
    inicializarControlTiempo: function() {
        const form = document.getElementById('formImpresion');
        if (!form || document.getElementById('controlTiempoImpresion')) return;

        // Solo insertar panel de Control de Tiempo (Play/Pausa/Completar/Despacho)
        // El selector de OT ahora es el dropdown principal, no el panel de comandas
        const panelHTML = `
            <div id="controlTiempoImpresion" class="card mb-3 border-primary" style="display: none;">
                <div class="card-header bg-primary text-white py-2">
                    <div class="d-flex align-items-center justify-content-between">
                        <span><i class="bi bi-stopwatch me-2"></i>Tiempo de Arranque</span>
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
    /**
     * Pobla el selector de OT con ordenes pendientes/en-proceso
     */
    poblarSelectorOT: async function() {
        const select = document.getElementById('ordenTrabajo');
        if (!select) return;

        let ordenes = [];
        try {
            ordenes = AxonesDB.isReady() ? await AxonesDB.ordenesHelper.cargar() : [];
        } catch (e) {
            ordenes = [];
        }

        // Store for later lookup
        this._ordenesCache = ordenes;

        // Filtrar ordenes no completadas
        const disponibles = ordenes.filter(o => o.estadoOrden !== 'completada');

        // Guardar valor actual
        const valorActual = select.value;

        // Limpiar y poblar
        select.innerHTML = '<option value="">Seleccionar OT...</option>';
        disponibles.forEach(o => {
            const opt = document.createElement('option');
            opt.value = o.numeroOrden || o.ot;
            opt.textContent = `${o.numeroOrden || o.ot} | ${o.cliente || '---'} | ${o.producto || '---'} | ${(o.pedidoKg || 0).toLocaleString()} Kg`;
            opt.dataset.ot = o.ot || o.numeroOrden;
            select.appendChild(opt);
        });

        // Restaurar valor si existia
        if (valorActual) select.value = valorActual;

        // Event listener (solo una vez)
        if (!select._listenerAdded) {
            select._listenerAdded = true;
            select.addEventListener('change', () => {
                const otId = select.value;
                if (!otId) {
                    this.ocultarResumenYForm();
                    return;
                }
                const orden = disponibles.find(o => (o.numeroOrden || o.ot) === otId) ||
                              ordenes.find(o => (o.numeroOrden || o.ot) === otId);
                if (orden) {
                    this.seleccionarOrden(orden);
                }
            });
        }

        // Si no hay ordenes, mostrar mensaje
        const badge = document.getElementById('estadoOT');
        if (badge) {
            badge.textContent = disponibles.length > 0
                ? `${disponibles.length} OTs disponibles`
                : 'No hay OTs pendientes';
            badge.className = disponibles.length > 0 ? 'badge bg-primary' : 'badge bg-secondary';
        }
    },

    /**
     * Carga OT desde URL (?ot=OT-2026-0001) si viene con parametro
     */
    cargarDesdeOrden: async function() {
        const params = new URLSearchParams(window.location.search);
        const ot = params.get('ot');
        if (!ot) return;

        // Use cached ordenes from poblarSelectorOT, or fetch fresh
        let ordenes = this._ordenesCache || [];
        if (ordenes.length === 0) {
            try {
                ordenes = AxonesDB.isReady() ? await AxonesDB.ordenesHelper.cargar() : [];
            } catch (e) { ordenes = []; }
        }

        const orden = ordenes.find(o => o.ot === ot || o.numeroOrden === ot);
        if (orden) {
            // Seleccionar en el dropdown
            const select = document.getElementById('ordenTrabajo');
            if (select) select.value = orden.numeroOrden || orden.ot;
            this.seleccionarOrden(orden);
        }
    },

    /**
     * Selecciona una OT: muestra resumen spreadsheet y habilita formulario
     */
    seleccionarOrden: function(orden) {
        this.ordenCargada = orden;
        this.ordenCargada.pedidoKgOriginal = orden.pedidoKg;

        // Renderizar resumen read-only
        this.renderResumenOT(orden);

        // Mostrar formulario de produccion
        const form = document.getElementById('formImpresion');
        if (form) form.style.display = '';

        // Pre-llenar colores y anilox desde la OT
        this.preLlenarColoresDesdeOT(orden);

        // Actualizar badge
        const badge = document.getElementById('estadoOT');
        if (badge) {
            badge.textContent = orden.numeroOrden || orden.ot;
            badge.className = 'badge bg-success';
        }

        // Mostrar y actualizar control de tiempo (Play/Pausa/Completar/Despacho)
        const panelTiempo = document.getElementById('controlTiempoImpresion');
        if (panelTiempo) panelTiempo.style.display = 'block';
        this.actualizarControlTiempo(orden.id || orden.ot, orden.numeroOrden || orden.ot);

        console.log('[Impresion] OT seleccionada:', orden.numeroOrden || orden.ot);
    },

    /**
     * Oculta resumen y formulario cuando no hay OT seleccionada
     */
    ocultarResumenYForm: function() {
        this.ordenCargada = null;
        const resumen = document.getElementById('resumenOT');
        const form = document.getElementById('formImpresion');
        if (resumen) resumen.classList.remove('visible');
        if (form) form.style.display = 'none';

        const badge = document.getElementById('estadoOT');
        if (badge) {
            badge.textContent = 'Sin OT seleccionada';
            badge.className = 'badge bg-secondary';
        }
    },

    /**
     * Renderiza el resumen read-only de la OT en formato spreadsheet
     */
    renderResumenOT: function(orden) {
        const resumen = document.getElementById('resumenOT');
        if (!resumen) return;

        const v = (val) => (val !== undefined && val !== null && val !== '') ? val : '-';
        const n = (val) => (val && !isNaN(val)) ? Number(val).toLocaleString() : '-';

        // Header
        const header = document.getElementById('otNumeroHeader');
        if (header) header.textContent = v(orden.numeroOrden || orden.ot);

        // Datos del Pedido
        document.getElementById('otFecha').textContent = v(orden.fechaOrden);
        document.getElementById('otPedidoKg').textContent = n(orden.pedidoKg) + ' Kg';
        document.getElementById('otMetrosEst').textContent = n(orden.metrosImp || orden.metrosEstimados);
        document.getElementById('otMaquina').textContent = v(orden.maquina);
        document.getElementById('otEstructura').textContent = v(orden.estructuraMaterial);

        // Datos del Producto
        document.getElementById('otCliente').textContent = v(orden.cliente);
        document.getElementById('otClienteRif').textContent = v(orden.clienteRif);
        document.getElementById('otProducto').textContent = v(orden.producto);
        document.getElementById('otCpe').textContent = v(orden.cpe);

        // Area de Montaje
        document.getElementById('otFrecuencia').textContent = v(orden.frecuencia);
        document.getElementById('otAnchoCorte').textContent = v(orden.anchoCorte);
        document.getElementById('otNumBandas').textContent = v(orden.numBandas);
        document.getElementById('otRepeticiones').textContent = v(orden.numRepeticion);
        document.getElementById('otDesarrollo').textContent = v(orden.desarrollo);
        document.getElementById('otFiguraEmb').textContent = v(orden.figuraEmbobinadoMontaje);
        document.getElementById('otTipoImpresion').textContent = v(orden.tipoImpresion);
        document.getElementById('otNumColores').textContent = v(orden.numColores);
        document.getElementById('otAnchoMontaje').textContent = v(orden.anchoMontaje);
        document.getElementById('otObsMontaje').textContent = v(orden.obsMontaje);

        // Area de Impresion
        const pinon = orden.pinon || (orden.desarrollo ? Math.round(orden.desarrollo / 5) : '-');
        document.getElementById('otPinon').textContent = v(pinon);
        document.getElementById('otLineaCorte').textContent = v(orden.lineaCorte);
        document.getElementById('otSustrato').textContent = v(orden.sustratosVirgen);
        document.getElementById('otMetrosImp').textContent = n(orden.metrosImp);

        // Ficha Tecnica
        document.getElementById('otTipoMat').textContent = v(orden.fichaTipoMat1 || orden.tipoMaterial);
        document.getElementById('otMicras').textContent = v(orden.fichaMicras1 || orden.micrasMaterial);
        document.getElementById('otAncho').textContent = v(orden.fichaAncho1 || orden.anchoMaterial);
        document.getElementById('otDensidad').textContent = v(orden.fichaDensidad1);
        document.getElementById('otKgNecesarios').textContent = n(orden.fichaKg1);

        // Tintas
        const tintasContainer = document.getElementById('otTintasContainer');
        const tintasBody = document.getElementById('otTintasBody');
        if (tintasContainer && tintasBody && orden.tintas && orden.tintas.length > 0) {
            tintasContainer.style.display = '';
            tintasBody.innerHTML = orden.tintas.map(t =>
                `<tr><td>${t.posicion}</td><td>${v(t.color)}</td><td>${v(t.anilox)}</td><td>${v(t.viscosidad)}</td><td>${v(t.porcentaje)}</td></tr>`
            ).join('');
        } else if (tintasContainer) {
            tintasContainer.style.display = 'none';
        }

        // Mostrar el resumen
        resumen.classList.add('visible');
    },

    /**
     * Carga datos iniciales (inventario, clientes, productos)
     */
    cargarDatosIniciales: async function() {
        // Cargar clientes desde CONFIG
        this.clientesCache = CONFIG.CLIENTES || [];

        // Cargar inventario desde Supabase y normalizar campos
        try {
            const raw = AxonesDB.isReady() ? await AxonesDB.materiales.listar() : [];
            this.inventarioCache = raw.map(m => ({
                ...m,
                kg: m.stock_kg || 0,
                cantidad: m.stock_kg || 0,
                stockKg: m.stock_kg || 0,
                codigoBarra: m.codigo_barras || m.codigoBarra,
                producto: m.notas || ''
            }));
        } catch (e) {
            console.warn('Error cargando inventario:', e);
            this.inventarioCache = [];
        }

        // Cargar historial de produccion para autocompletado
        try {
            if (AxonesDB.isReady()) {
                const { data } = await AxonesDB.client.from('produccion_impresion').select('datos');
                const produccion = (data || []).map(r => r.datos || {});
                this.productosCache = [...new Set(produccion.map(p => p.producto).filter(Boolean))];
            } else {
                this.productosCache = [];
            }
        } catch (e) {
            console.warn('Error cargando historial impresion:', e);
            this.productosCache = [];
        }

        // Poblar datalist de clientes despues de cargar
        await this.poblarSelectClientes();
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
    poblarSelectClientes: async function() {
        const datalist = document.getElementById('listaClientes');
        if (!datalist) return;

        // Agregar clientes de registros anteriores de impresion desde Supabase
        try {
            if (AxonesDB.isReady()) {
                const { data } = await AxonesDB.client.from('produccion_impresion').select('datos');
                const impresiones = (data || []).map(r => r.datos || {});
                const clientesDeImpresion = impresiones
                    .map(i => i.cliente)
                    .filter(c => c && !this.clientesCache.includes(c));
                this.clientesCache = [...new Set([...this.clientesCache, ...clientesDeImpresion])].sort();
            }
        } catch (e) {
            console.warn('Error cargando clientes de impresion:', e);
        }

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
    buscarDatosOT: async function(ot) {
        if (!ot) return;

        // Buscar en historial de produccion desde Supabase
        let produccion = [];
        try {
            if (AxonesDB.isReady()) {
                const { data } = await AxonesDB.client.from('produccion_impresion').select('datos');
                produccion = (data || []).map(r => r.datos || {});
            }
        } catch (e) {
            console.warn('Error buscando historial impresion:', e);
        }
        const registroAnterior = produccion.find(p => p.ordenTrabajo === ot);

        if (registroAnterior) {
            // Preguntar si desea cargar datos anteriores
            if (confirm(`Se encontro un registro anterior para OT ${ot}. ¿Desea cargar los datos del producto?`)) {
                this.cargarDatosOT(registroAnterior);
            }
        }

        // Buscar consumo de tintas asociado desde Supabase
        let tintas = [];
        try {
            if (AxonesDB.isReady()) {
                const { data } = await AxonesDB.client.from('consumo_tintas').select('*').eq('ot', ot);
                tintas = data || [];
            }
        } catch (e) {
            console.warn('Error buscando tintas OT:', e);
        }
        if (tintas.length > 0) {
            console.log('Tintas encontradas para OT:', tintas);
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
        // Boton guardar (arriba y abajo)
        const btnGuardar = document.getElementById('btnGuardar');
        if (btnGuardar) {
            btnGuardar.addEventListener('click', (e) => {
                e.preventDefault();
                this.guardar();
            });
        }
        const btnGuardarBottom = document.getElementById('btnGuardarBottom');
        if (btnGuardarBottom) {
            btnGuardarBottom.addEventListener('click', (e) => {
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

        // Calcular al cambiar devolucion buena
        const devBuenaInput = document.getElementById('devolucionBuenaKg');
        if (devBuenaInput) {
            devBuenaInput.addEventListener('input', () => this.calcularTotales());
        }

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

        // Obtener inventario desde cache (cargado en cargarDatosIniciales)
        let inventario = this.inventarioCache || [];

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

        // Scrap (Transparente + Impreso)
        const scrapTransparente = parseFloat(document.getElementById('scrapTransparente')?.value) || 0;
        const scrapImpreso = parseFloat(document.getElementById('scrapImpreso')?.value) || 0;
        const totalScrap = scrapTransparente + scrapImpreso;
        document.getElementById('totalScrap').value = totalScrap.toFixed(2);

        // Devolucion buena y rechazada
        const devBuena = parseFloat(document.getElementById('devolucionBuenaKg')?.value) || 0;
        const devRechazada = this.calcularTotalDevolucionRechazada();

        // Total devuelto = buena + rechazada
        const totalDevuelto = devBuena + devRechazada;

        // Consumido = Entrada - Devolucion Buena - Devolucion Rechazada
        const totalConsumido = totalEntrada - totalDevuelto;

        const merma = totalEntrada - totalSalida - totalScrap;
        document.getElementById('merma').value = merma.toFixed(2);

        // Porcentaje de Scrap
        let porcentajeRefil = 0;
        if (totalEntrada > 0) {
            porcentajeRefil = ((merma + totalScrap) / totalEntrada) * 100;
        }
        document.getElementById('porcentajeRefil').value = porcentajeRefil.toFixed(2) + '%';

        // Actualizar indicador de refil
        this.actualizarIndicadorRefil(porcentajeRefil, totalEntrada);

        // Actualizar badges de devolucion
        const totalDevBuenoEl = document.getElementById('totalDevueltoBueno');
        if (totalDevBuenoEl) totalDevBuenoEl.textContent = devBuena.toFixed(2);
        const totalDevRechazadoEl = document.getElementById('totalDevueltoRechazado');
        if (totalDevRechazadoEl) totalDevRechazadoEl.textContent = devRechazada.toFixed(2);
        const totalConsumidoEl = document.getElementById('totalConsumido');
        if (totalConsumidoEl) totalConsumidoEl.textContent = totalConsumido.toFixed(2);

        // Actualizar Resumen de Produccion
        const resEntrada = document.getElementById('resumenEntrada');
        const resDevBuena = document.getElementById('resumenDevBuena');
        const resDevRechazada = document.getElementById('resumenDevRechazada');
        const resConsumido = document.getElementById('resumenConsumido');
        const resSalida = document.getElementById('resumenSalida');
        const resScrap = document.getElementById('resumenScrap');
        const resMerma = document.getElementById('resumenMermaCalc');
        const resRefil = document.getElementById('resumenRefilCalc');
        if (resEntrada) resEntrada.textContent = totalEntrada.toFixed(2) + ' Kg';
        if (resDevBuena) resDevBuena.textContent = devBuena.toFixed(2) + ' Kg';
        if (resDevRechazada) resDevRechazada.textContent = devRechazada.toFixed(2) + ' Kg';
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
     * Inicializa la seccion de consumo de tintas
     */
    // Nota: Consumo de tintas/solventes se gestiona desde el modulo Tintas (tintas.html)

    /**
     * Obtiene tintas del inventario para el selector
     */
    obtenerTintasInventario: async function() {
        try {
            if (AxonesDB.isReady()) {
                return await AxonesDB.tintas.listar({soloActivos: false});
            }
            return [];
        } catch (e) {
            console.warn('Error obteniendo tintas:', e);
            return [];
        }
    },

    /**
     * Genera opciones HTML del selector de tintas desde el inventario
     */
    generarOpcionesTintas: async function() {
        const tintas = await this.obtenerTintasInventario();
        this._tintasCache = tintas; // Cache for descontarTintas
        let opciones = '<option value="">-- Seleccionar tinta --</option>';
        tintas.forEach((t, idx) => {
            const nombre = t.nombre || t.color || t.tipo || 'Tinta ' + (idx + 1);
            const stock = parseFloat(t.cantidad || t.kg || 0).toFixed(2);
            opciones += `<option value="${idx}" data-stock="${stock}" data-nombre="${nombre}" data-id="${t.id || ''}">${nombre} (${stock} Kg)</option>`;
        });
        return opciones;
    },

    /**
     * Agrega fila a tabla de consumo o devolucion de tintas
     */
    agregarFilaTinta: async function(tipo) {
        const bodyId = tipo === 'consumo' ? 'bodyConsumoTintas' : 'bodyDevolucionTintas';
        const tbody = document.getElementById(bodyId);
        if (!tbody) return;

        const opciones = await this.generarOpcionesTintas();
        const fila = document.createElement('tr');

        if (tipo === 'consumo') {
            fila.innerHTML = `
                <td><select class="form-select form-select-sm tinta-selector">${opciones}</select></td>
                <td><input type="number" class="form-control form-control-sm tinta-kg-consumo" step="0.01" min="0" value="0"></td>
                <td class="text-center tinta-stock-cell">-</td>
                <td><button type="button" class="btn btn-sm btn-outline-danger btn-quitar-tinta" title="Quitar"><i class="bi bi-x"></i></button></td>
            `;
        } else {
            fila.innerHTML = `
                <td><select class="form-select form-select-sm tinta-dev-selector">${opciones}</select></td>
                <td><input type="number" class="form-control form-control-sm tinta-kg-devolucion" step="0.01" min="0" value="0"></td>
                <td><button type="button" class="btn btn-sm btn-outline-danger btn-quitar-tinta" title="Quitar"><i class="bi bi-x"></i></button></td>
            `;
        }

        // Evento para quitar fila
        fila.querySelector('.btn-quitar-tinta').addEventListener('click', () => {
            fila.remove();
            this.calcularTotalTintas();
        });

        // Evento para actualizar stock al seleccionar tinta
        const selector = fila.querySelector('.tinta-selector, .tinta-dev-selector');
        if (selector) {
            selector.addEventListener('change', () => {
                const opt = selector.selectedOptions[0];
                const stockCell = fila.querySelector('.tinta-stock-cell');
                if (stockCell && opt && opt.dataset.stock) {
                    stockCell.textContent = opt.dataset.stock + ' Kg';
                } else if (stockCell) {
                    stockCell.textContent = '-';
                }
            });
        }

        // Evento para recalcular totales
        const kgInput = fila.querySelector('.tinta-kg-consumo, .tinta-kg-devolucion');
        if (kgInput) {
            kgInput.addEventListener('input', () => this.calcularTotalTintas());
        }

        tbody.appendChild(fila);
    },

    /**
     * Calcula totales de consumo y devolucion de tintas
     */
    calcularTotalTintas: function() {
        let totalConsumo = 0;
        document.querySelectorAll('.tinta-kg-consumo').forEach(input => {
            totalConsumo += parseFloat(input.value) || 0;
        });
        const totalConsumoEl = document.getElementById('totalConsumoTintas');
        if (totalConsumoEl) totalConsumoEl.textContent = totalConsumo.toFixed(2);

        let totalDevolucion = 0;
        document.querySelectorAll('.tinta-kg-devolucion').forEach(input => {
            totalDevolucion += parseFloat(input.value) || 0;
        });
        const totalDevEl = document.getElementById('totalDevolucionTintas');
        if (totalDevEl) totalDevEl.textContent = totalDevolucion.toFixed(2);
    },

    /**
     * Recopila datos de colores y anilox del operador (8 posiciones)
     */
    recopilarColoresAnilox: function() {
        const datos = [];
        for (let i = 1; i <= 8; i++) {
            const color = document.getElementById(`impColor${i}`)?.value || '';
            if (color) {
                datos.push({
                    posicion: i,
                    color: color,
                    anilox: document.getElementById(`impAnilox${i}`)?.value || '',
                    viscosidad: parseFloat(document.getElementById(`impVisc${i}`)?.value) || null,
                    observaciones: document.getElementById(`impColorObs${i}`)?.value || ''
                });
            }
        }
        return datos;
    },

    /**
     * Pre-llena colores y anilox desde la OT seleccionada
     */
    preLlenarColoresDesdeOT: function(orden) {
        if (!orden || !orden.tintas) return;
        const tintas = Array.isArray(orden.tintas) ? orden.tintas : [];
        tintas.forEach(t => {
            const pos = t.posicion;
            if (pos >= 1 && pos <= 8) {
                const colorEl = document.getElementById(`impColor${pos}`);
                const aniloxEl = document.getElementById(`impAnilox${pos}`);
                const viscEl = document.getElementById(`impVisc${pos}`);
                const obsEl = document.getElementById(`impColorObs${pos}`);
                if (colorEl) colorEl.value = t.color || '';
                if (aniloxEl) aniloxEl.value = t.anilox || '';
                if (viscEl && t.viscosidad) viscEl.value = t.viscosidad;
                if (obsEl) obsEl.value = t.observaciones || '';
            }
        });
    },

    /**
     * Inicializa la seccion de devolucion rechazada
     */
    initDevolucionRechazada: function() {
        const btnAgregar = document.getElementById('btnAgregarRechazo');
        if (btnAgregar) {
            btnAgregar.addEventListener('click', () => this.agregarFilaRechazo());
        }
        const btnReporte = document.getElementById('btnReporteRechazo');
        if (btnReporte) {
            btnReporte.addEventListener('click', () => this.generarReporteRechazo());
        }
    },

    /**
     * Agrega una fila a la tabla de devolucion rechazada
     */
    agregarFilaRechazo: function() {
        const tbody = document.getElementById('bodyDevolucionRechazada');
        if (!tbody) return;

        const hoy = new Date().toISOString().split('T')[0];
        const ahora = new Date().toTimeString().slice(0, 5);
        const fila = document.createElement('tr');
        fila.innerHTML = `
            <td><input type="text" class="form-control form-control-sm rechazo-proveedor" placeholder="Proveedor"></td>
            <td><input type="text" class="form-control form-control-sm rechazo-ref" placeholder="Ref. bobina"></td>
            <td><input type="number" class="form-control form-control-sm rechazo-kg" step="0.01" min="0" value="0"></td>
            <td><select class="form-select form-select-sm rechazo-motivo">
                <option value="">Seleccionar</option>
                <option value="Material defectuoso">Material defectuoso</option>
                <option value="Fuera de especificacion">Fuera de especificacion</option>
                <option value="Inicio de bobina malo">Inicio de bobina malo</option>
                <option value="Final de bobina malo">Final de bobina malo</option>
                <option value="Problemas de tratamiento">Problemas de tratamiento</option>
                <option value="Contaminacion">Contaminacion</option>
                <option value="Otro">Otro</option>
            </select></td>
            <td><input type="date" class="form-control form-control-sm rechazo-fecha" value="${hoy}"></td>
            <td><input type="time" class="form-control form-control-sm rechazo-hora" value="${ahora}"></td>
            <td><button type="button" class="btn btn-sm btn-outline-danger btn-quitar-rechazo" title="Quitar"><i class="bi bi-x"></i></button></td>
        `;

        // Evento para quitar fila
        fila.querySelector('.btn-quitar-rechazo').addEventListener('click', () => {
            fila.remove();
            this.calcularTotales();
        });

        // Evento para recalcular al cambiar kg
        fila.querySelector('.rechazo-kg').addEventListener('input', () => this.calcularTotales());

        tbody.appendChild(fila);
    },

    /**
     * Calcula el total de kg de devolucion rechazada
     */
    calcularTotalDevolucionRechazada: function() {
        let total = 0;
        document.querySelectorAll('.rechazo-kg').forEach(input => {
            total += parseFloat(input.value) || 0;
        });
        const totalEl = document.getElementById('totalDevolucionRechazada');
        if (totalEl) totalEl.textContent = total.toFixed(2);
        return total;
    },

    /**
     * Recopila datos de la tabla de devolucion rechazada
     */
    recopilarDevolucionRechazada: function() {
        const filas = document.querySelectorAll('#bodyDevolucionRechazada tr');
        const datos = [];
        filas.forEach(fila => {
            const kg = parseFloat(fila.querySelector('.rechazo-kg')?.value) || 0;
            if (kg > 0) {
                datos.push({
                    proveedor: fila.querySelector('.rechazo-proveedor')?.value || '',
                    referencia: fila.querySelector('.rechazo-ref')?.value || '',
                    kg: kg,
                    motivo: fila.querySelector('.rechazo-motivo')?.value || '',
                    fecha: fila.querySelector('.rechazo-fecha')?.value || '',
                    hora: fila.querySelector('.rechazo-hora')?.value || ''
                });
            }
        });
        return datos;
    },

    /**
     * Genera reporte de bobinas rechazadas agrupado por proveedor
     */
    generarReporteRechazo: async function() {
        const datos = this.recopilarDevolucionRechazada();
        if (datos.length === 0) {
            this.mostrarToast('No hay bobinas rechazadas para reportar', 'warning');
            return;
        }

        // Agrupar por proveedor
        const porProveedor = {};
        datos.forEach(d => {
            const prov = d.proveedor || 'Sin proveedor';
            if (!porProveedor[prov]) porProveedor[prov] = [];
            porProveedor[prov].push(d);
        });

        // Datos de la OT
        const ot = this.ordenCargada || {};
        const numOT = ot.numeroOrden || ot.ot || document.getElementById('ordenTrabajo')?.value || 'N/A';

        // Generar HTML del reporte
        let html = `
            <div style="font-family: Arial, sans-serif; max-width: 800px; margin: 0 auto; padding: 20px;">
                <div style="text-align: center; margin-bottom: 20px;">
                    <h2 style="margin:0">INVERSIONES AXONES 2008, C.A.</h2>
                    <p style="margin:2px 0">RIF: J-40081341-7</p>
                    <h3 style="margin:10px 0; color: #dc3545;">REPORTE DE MATERIAL RECHAZADO</h3>
                    <p style="margin:2px 0">Orden de Trabajo: <strong>${numOT}</strong></p>
                    <p style="margin:2px 0">Fecha de emision: ${new Date().toLocaleDateString('es-VE')}</p>
                </div>
        `;

        Object.keys(porProveedor).forEach(proveedor => {
            const items = porProveedor[proveedor];
            const totalKg = items.reduce((sum, d) => sum + d.kg, 0);

            html += `
                <div style="margin-bottom: 20px; border: 1px solid #dc3545; border-radius: 6px; padding: 12px;">
                    <h4 style="color: #dc3545; margin: 0 0 10px 0;">Proveedor: ${proveedor}</h4>
                    <table style="width:100%; border-collapse: collapse; font-size: 13px;">
                        <thead>
                            <tr style="background: #f8d7da;">
                                <th style="border:1px solid #ddd; padding:6px;">Ref. Bobina</th>
                                <th style="border:1px solid #ddd; padding:6px;">Kg</th>
                                <th style="border:1px solid #ddd; padding:6px;">Motivo</th>
                                <th style="border:1px solid #ddd; padding:6px;">Fecha</th>
                                <th style="border:1px solid #ddd; padding:6px;">Hora</th>
                            </tr>
                        </thead>
                        <tbody>
            `;

            items.forEach(item => {
                html += `
                            <tr>
                                <td style="border:1px solid #ddd; padding:6px;">${item.referencia}</td>
                                <td style="border:1px solid #ddd; padding:6px; text-align:right;">${item.kg.toFixed(2)}</td>
                                <td style="border:1px solid #ddd; padding:6px;">${item.motivo}</td>
                                <td style="border:1px solid #ddd; padding:6px;">${item.fecha}</td>
                                <td style="border:1px solid #ddd; padding:6px;">${item.hora}</td>
                            </tr>
                `;
            });

            html += `
                        </tbody>
                        <tfoot>
                            <tr style="background: #f8d7da; font-weight: bold;">
                                <td style="border:1px solid #ddd; padding:6px; text-align:right;">Total:</td>
                                <td style="border:1px solid #ddd; padding:6px; text-align:right;">${totalKg.toFixed(2)} Kg</td>
                                <td colspan="3" style="border:1px solid #ddd; padding:6px;"></td>
                            </tr>
                        </tfoot>
                    </table>
                </div>
            `;
        });

        html += `
                <div style="margin-top: 30px; display: flex; justify-content: space-between;">
                    <div style="text-align: center; width: 40%;">
                        <div style="border-top: 1px solid #333; padding-top: 5px;">Responsable de Produccion</div>
                    </div>
                    <div style="text-align: center; width: 40%;">
                        <div style="border-top: 1px solid #333; padding-top: 5px;">Jefe de Operaciones</div>
                    </div>
                </div>
            </div>
        `;

        // Abrir ventana de impresion
        const ventana = window.open('', '_blank', 'width=850,height=600');
        ventana.document.write('<html><head><title>Reporte Material Rechazado - ' + numOT + '</title></head><body>');
        ventana.document.write(html);
        ventana.document.write('</body></html>');
        ventana.document.close();
        ventana.print();

        // Guardar en Supabase sync_store para acceso desde reportes.html
        try {
            if (AxonesDB.isReady()) {
                const { data: existing } = await AxonesDB.client.from('sync_store').select('value').eq('key', 'axones_reportes_rechazo').single();
                const reportes = (existing?.value) ? JSON.parse(existing.value) : [];
                reportes.unshift({
                    id: 'RR_' + Date.now(),
                    timestamp: new Date().toISOString(),
                    ordenTrabajo: numOT,
                    datos: this.recopilarDevolucionRechazada(),
                    totalKg: this.calcularTotalDevolucionRechazada()
                });
                await AxonesDB.client.from('sync_store').upsert({ key: 'axones_reportes_rechazo', value: JSON.stringify(reportes) });
            }
        } catch (error) {
            console.warn('Error guardando reporte de rechazo en Supabase:', error);
        }
    },

    /**
     * Valida campos requeridos con mensajes personalizados
     */
    validarCamposRequeridos: function() {
        const errores = [];
        const turno = document.querySelector('input[name="turno"]:checked');
        const operador = document.getElementById('operador')?.value;

        // La OT debe estar seleccionada
        if (!this.ordenCargada) errores.push('Seleccione una Orden de Trabajo');
        if (!turno) errores.push('Seleccione un turno');
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
    guardar: async function() {
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
            // Guardar en Supabase
            await this.guardarLocal(datos);

            // Descontar material del inventario automaticamente
            await this.descontarInventario(datos);

            // Registrar bobinas rechazadas en inventario de bobinas malas
            await this.registrarBobinasMalas(datos);

            // Verificar alertas
            await this.verificarAlertas(datos);

            this.limpiarAutosave();
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

        // Obtener devolucion rechazada
        const devolucionRechazada = this.recopilarDevolucionRechazada();

        // Obtener bobinas de salida
        const bobinasSalida = [];
        for (let i = 1; i <= 22; i++) {
            const valor = parseFloat(document.getElementById('bob' + i).value) || 0;
            if (valor > 0) {
                bobinasSalida.push({ posicion: i, peso: valor });
            }
        }

        // Datos de la OT (referencia, no copia)
        const ot = this.ordenCargada || {};

        return {
            // Metadatos
            id: 'IMP_' + Date.now(),
            timestamp: new Date().toISOString(),
            tipo: 'impresion',

            // Referencia a la OT (vinculo, no duplicacion)
            ordenTrabajo: ot.numeroOrden || ot.ot || document.getElementById('ordenTrabajo')?.value || '',
            otId: ot.id || ot.ot || '',

            // Datos de la OT (read-only, para referencia rapida)
            cliente: ot.cliente || '',
            producto: ot.producto || '',
            maquina: ot.maquina || '',
            pedidoKg: ot.pedidoKg || 0,

            // Datos de produccion (llenados por el operador)
            turno: turnoSeleccionado ? turnoSeleccionado.value : '',
            operador: document.getElementById('operador').value,
            ayudante: document.getElementById('ayudante').value,
            supervisor: document.getElementById('supervisor').value,
            horaInicio: document.getElementById('horaInicio').value,
            horaArranque: document.getElementById('horaArranque').value,

            // Material de entrada
            materialesEntrada: materialesEntrada,
            totalMaterialEntrada: parseFloat(document.getElementById('totalMaterialEntrada').value) || 0,

            // Devolucion
            devolucionBuenaKg: parseFloat(document.getElementById('devolucionBuenaKg')?.value) || 0,
            devolucionBuenaFecha: document.getElementById('devolucionBuenaFecha')?.value || '',
            devolucionBuenaHora: document.getElementById('devolucionBuenaHora')?.value || '',
            devolucionBuenaObs: document.getElementById('devolucionBuenaObs')?.value || '',
            devolucionRechazada: devolucionRechazada,
            totalDevolucionRechazada: this.calcularTotalDevolucionRechazada(),
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

            // Scrap (Transparente + Impreso)
            scrapTransparente: parseFloat(document.getElementById('scrapTransparente')?.value) || 0,
            scrapImpreso: parseFloat(document.getElementById('scrapImpreso')?.value) || 0,
            totalScrap: parseFloat(document.getElementById('totalScrap')?.value) || 0,
            porcentajeScrap: parseFloat(document.getElementById('porcentajeRefil')?.value) || 0,

            // Tiempos (temporizador de produccion)
            tiempoTotal: this._timer.inicio ? (Date.now() - this._timer.inicio) : 0,
            tiempoMuerto: this._timer.tiempoMuerto + (this._timer.estado === 'pausado' && this._timer.pausaInicio ? (Date.now() - this._timer.pausaInicio) : 0),
            tiempoEfectivo: this._timer.inicio ? Math.max(0, (Date.now() - this._timer.inicio) - this._timer.tiempoMuerto) : 0,
            paradasProduccion: this._timer.pausas,
            tiempoDesmontaje: this._timerDesm.total || (this._timerDesm.inicio ? (Date.now() - this._timerDesm.inicio) : 0),

            // Colores y Anilox (registro del operador)
            coloresAnilox: this.recopilarColoresAnilox(),

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
     * Guarda registro de produccion en Supabase
     */
    guardarLocal: async function(datos) {
        if (AxonesDB.isReady()) {
            // Guardar en tabla produccion_impresion con columna datos JSONB
            await AxonesDB.client.from('produccion_impresion').insert({
                orden_id: datos.otId || null,
                numero_ot: datos.ordenTrabajo || null,
                datos: datos
            });
            console.log('Registro de impresion guardado en Supabase');
        } else {
            console.warn('Supabase no disponible, registro no guardado');
        }
    },

    /**
     * Descuenta material del inventario y repone devolucion buena
     */
    descontarInventario: async function(datos) {
        try {
            const inventario = this.inventarioCache || [];
            // Descontar totalMaterialEntrada (todo lo que se saco del inventario)
            const cantidadUsada = parseFloat(datos.totalMaterialEntrada) || 0;

            if (cantidadUsada <= 0) return;

            // Buscar material que coincida (por producto/cliente asociado)
            let descontado = false;
            let restante = cantidadUsada;

            for (let i = 0; i < inventario.length && restante > 0; i++) {
                const item = inventario[i];

                const coincideProducto = item.producto &&
                    (item.producto.toLowerCase().includes(datos.producto?.toLowerCase() || '') ||
                     datos.producto?.toLowerCase().includes(item.producto.toLowerCase()));

                if (coincideProducto || !item.producto) {
                    const disponible = parseFloat(item.kg) || 0;

                    if (disponible > 0) {
                        const aDescontar = Math.min(disponible, restante);
                        item.kg = disponible - aDescontar;
                        restante -= aDescontar;
                        descontado = true;

                        console.log(`Inventario: Descontados ${aDescontar} Kg de ${item.material} (Quedan: ${item.kg} Kg)`);

                        // Actualizar en Supabase
                        if (AxonesDB.isReady() && item.id) {
                            await AxonesDB.client.from('materiales').update({ kg: item.kg }).eq('id', item.id);
                        }
                    }
                }
            }

            // Reponer devolucion buena al inventario
            const devBuena = parseFloat(datos.devolucionBuenaKg) || 0;
            if (devBuena > 0) {
                let repuesto = false;
                for (let i = 0; i < inventario.length; i++) {
                    const item = inventario[i];
                    const coincideProducto = item.producto &&
                        (item.producto.toLowerCase().includes(datos.producto?.toLowerCase() || '') ||
                         datos.producto?.toLowerCase().includes(item.producto.toLowerCase()));

                    if (coincideProducto) {
                        item.kg = (parseFloat(item.kg) || 0) + devBuena;
                        repuesto = true;
                        console.log(`Inventario: Repuestos ${devBuena} Kg (devolucion buena) a ${item.material} (Total: ${item.kg} Kg)`);

                        // Actualizar en Supabase
                        if (AxonesDB.isReady() && item.id) {
                            await AxonesDB.client.from('materiales').update({ kg: item.kg }).eq('id', item.id);
                        }
                        break;
                    }
                }
                if (!repuesto) {
                    console.warn('No se encontro material para reponer devolucion buena');
                }
                descontado = true;
            }

            if (descontado) {
                console.log('Inventario actualizado en Supabase despues de produccion');
                await this.verificarStockBajo(inventario);
            }
        } catch (error) {
            console.warn('Error al descontar inventario:', error);
        }
    },

    /**
     * Registra bobinas rechazadas en inventario de bobinas malas (para calibrar)
     */
    registrarBobinasMalas: async function(datos) {
        if (!datos.devolucionRechazada || datos.devolucionRechazada.length === 0) return;
        if (!AxonesDB.isReady()) return;

        try {
            // Cargar inventario existente de bobinas malas
            const { data: existing } = await AxonesDB.client.from('sync_store')
                .select('value').eq('key', 'axones_bobinas_malas').single();
            const bobinas = existing?.value ? JSON.parse(existing.value) : [];

            // Agregar cada bobina rechazada
            datos.devolucionRechazada.forEach(r => {
                bobinas.push({
                    id: 'BM_' + Date.now() + '_' + Math.random().toString(36).substr(2, 4),
                    fecha: r.fecha || new Date().toISOString().split('T')[0],
                    proveedor: r.proveedor || '',
                    referencia: r.referencia || '',
                    kg: parseFloat(r.kg) || 0,
                    motivo: r.motivo || '',
                    ordenTrabajo: datos.ordenTrabajo || '',
                    proceso: 'impresion',
                    estado: 'disponible', // disponible para calibrar
                    registradoPor: datos.registradoPorNombre || ''
                });
            });

            await AxonesDB.client.from('sync_store')
                .upsert({ key: 'axones_bobinas_malas', value: JSON.stringify(bobinas) });

            console.log(`Registradas ${datos.devolucionRechazada.length} bobinas malas para calibrar`);
        } catch (e) {
            console.warn('Error registrando bobinas malas:', e);
        }
    },

    /**
     * Verifica si hay materiales con stock bajo y genera alertas
     */
    verificarStockBajo: async function(inventario) {
        const STOCK_MINIMO = 200; // Kg

        // Cargar alertas existentes desde Supabase
        let alertas = [];
        try {
            if (AxonesDB.isReady()) {
                const { data } = await AxonesDB.client.from('alertas').select('*');
                alertas = data || [];
            }
        } catch (e) {
            console.warn('Error cargando alertas:', e);
        }

        for (const item of inventario) {
            if ((item.kg || 0) < STOCK_MINIMO && (item.kg || 0) > 0) {
                // Verificar si ya existe una alerta reciente para este material
                const alertaExistente = alertas.find(a =>
                    a.tipo === 'stock_bajo' &&
                    a.datos?.material === item.material &&
                    new Date(a.fecha || a.created_at) > new Date(Date.now() - 24 * 60 * 60 * 1000)
                );

                if (!alertaExistente) {
                    const alerta = {
                        tipo: 'stock_bajo',
                        nivel: item.kg < 50 ? 'danger' : 'warning',
                        titulo: 'Stock bajo',
                        mensaje: `Stock bajo: ${item.material} ${item.micras || ''}µ - Quedan ${item.kg?.toFixed(1) || 0} Kg`,
                        fecha: new Date().toISOString(),
                        estado: 'pendiente',
                        datos: { material: item.material, cantidad: item.kg }
                    };

                    if (AxonesDB.isReady()) {
                        await AxonesDB.client.from('alertas').insert(alerta);
                    }
                    console.log('Alerta de stock bajo generada para', item.material);
                }
            }
        }
    },

    /**
     * Verifica y genera alertas segun los datos
     */
    verificarAlertas: async function(datos) {
        const umbral = CONFIG.UMBRALES_REFIL.default;
        const porcentajeRefil = parseFloat(datos.porcentajeRefil) || 0;

        // Alerta por Refil alto
        if (porcentajeRefil > umbral.advertencia) {
            await this.generarAlerta(datos);
        }

        // Alerta por tiempo muerto excesivo
        await this.verificarTiempoMuerto(datos);

        // Actualizar contadores de produccion si HomeModule esta disponible
        if (typeof HomeModule !== 'undefined') {
            HomeModule.cargarKPIs();
            HomeModule.cargarProduccionHoy();
        }
    },

    /**
     * Genera una alerta por refil excedido
     */
    generarAlerta: async function(datos) {
        const porcentaje = parseFloat(datos.porcentajeRefil) || 0;
        const umbral = CONFIG.UMBRALES_REFIL.default;

        // Determinar tipo y nivel de alerta
        const esCritico = porcentaje > umbral.maximo;
        const tipo = esCritico ? 'refil_critico' : 'refil_alto';
        const nivel = esCritico ? 'critical' : 'warning';

        const alerta = {
            tipo: tipo,
            nivel: nivel,
            titulo: esCritico ? 'Refil critico' : 'Refil alto',
            mensaje: `Refil ${porcentaje.toFixed(1)}% en OT ${datos.ordenTrabajo} - ${datos.maquina} - Producto: ${datos.producto}`,
            fecha: new Date().toISOString(),
            estado: 'pendiente',
            datos: {
                porcentajeRefil: porcentaje,
                umbral: umbral.maximo,
                producto: datos.producto,
                cliente: datos.cliente,
                operador: datos.operador,
                maquina: datos.maquina,
                ot: datos.ordenTrabajo
            }
        };

        // Guardar alerta en Supabase
        try {
            if (AxonesDB.isReady()) {
                await AxonesDB.client.from('alertas').insert(alerta);
            }
        } catch (error) {
            console.warn('Error guardando alerta en Supabase:', error);
        }

        // Actualizar badge de alertas si existe
        await this.actualizarBadgeAlertas();

        // Mostrar notificacion visual
        this.mostrarNotificacionAlerta(alerta);
    },

    /**
     * Actualiza el badge de alertas en el navbar
     */
    actualizarBadgeAlertas: async function() {
        const badge = document.getElementById('alertasBadge');
        if (!badge) return;

        let pendientes = 0;
        try {
            if (AxonesDB.isReady()) {
                const { data, count } = await AxonesDB.client.from('alertas')
                    .select('id', { count: 'exact', head: true })
                    .in('estado', ['pendiente', 'activa']);
                pendientes = count || 0;
            }
        } catch (e) {
            console.warn('Error contando alertas:', e);
        }

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
    verificarTiempoMuerto: async function(datos) {
        const tiempoMuerto = parseInt(datos.tiempoMuerto) || 0;
        const tiempoEfectivo = parseInt(datos.tiempoEfectivo) || 0;

        // Si tiempo muerto es mayor al 20% del tiempo efectivo, generar alerta
        if (tiempoEfectivo > 0 && tiempoMuerto > 0) {
            const porcentajeTiempoMuerto = (tiempoMuerto / (tiempoMuerto + tiempoEfectivo)) * 100;
            if (porcentajeTiempoMuerto > 20) {
                const alerta = {
                    tipo: 'tiempo_muerto_alto',
                    nivel: 'info',
                    titulo: 'Tiempo muerto alto',
                    mensaje: `Tiempo muerto ${porcentajeTiempoMuerto.toFixed(0)}% en OT ${datos.ordenTrabajo}`,
                    fecha: new Date().toISOString(),
                    estado: 'pendiente',
                    datos: {
                        tiempoMuerto: tiempoMuerto,
                        tiempoEfectivo: tiempoEfectivo,
                        porcentaje: porcentajeTiempoMuerto,
                        maquina: datos.maquina,
                        ot: datos.ordenTrabajo
                    }
                };

                try {
                    if (AxonesDB.isReady()) {
                        await AxonesDB.client.from('alertas').insert(alerta);
                    }
                } catch (error) {
                    console.warn('Error guardando alerta tiempo muerto:', error);
                }
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

    guardarChecklist: async function() {
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

        // Guardar en Supabase sync_store
        try {
            if (AxonesDB.isReady()) {
                const { data: existing } = await AxonesDB.client.from('sync_store').select('value').eq('key', 'axones_checklists').single();
                const checklists = (existing?.value) ? JSON.parse(existing.value) : [];
                checklists.unshift(datos);
                await AxonesDB.client.from('sync_store').upsert({ key: 'axones_checklists', value: JSON.stringify(checklists) });
            }
        } catch (error) {
            console.warn('Error guardando checklist en Supabase:', error);
        }

        this.mostrarToast('Checklist guardado correctamente', 'success');

        // Cerrar modal
        const modal = bootstrap.Modal.getInstance(document.getElementById('modalChecklist'));
        if (modal) modal.hide();
    },

    /**
     * Configura calculo automatico del tiempo de preparacion
     */
    // Estado de los 3 temporizadores locales
    // Timer de produccion: el reloj NUNCA se detiene al pausar.
    // Pausa solo registra motivo. Tiempo Muerto = suma de pausas. Efectivo = Total - Muerto.
    // Timer de desmontaje (simple: play/stop)
    _timerDesm: { estado: 'pendiente', inicio: null, total: 0, interval: null },

    _timer: {
        estado: 'pendiente', // pendiente, corriendo, pausado, detenido
        inicio: null,        // timestamp de cuando se inicio
        tiempoMuerto: 0,     // ms acumulado de pausas
        pausaInicio: null,   // timestamp de cuando empezo la pausa actual
        pausas: [],          // [{timestamp, motivo, duracion}]
        interval: null
    },

    initTemporizadores: function() {
        const self = this;

        // Iniciar
        document.getElementById('btnProdPlay')?.addEventListener('click', () => {
            if (self._timer.estado === 'detenido') return;
            self._timer.estado = 'corriendo';
            self._timer.inicio = self._timer.inicio || Date.now();
            document.getElementById('timerProdPausaForm').style.display = 'none';
            self.timerUpdateUI();
            if (self._timer.interval) clearInterval(self._timer.interval);
            self._timer.interval = setInterval(() => self.timerTick(), 1000);
        });

        // Pausar - muestra formulario pero el reloj SIGUE
        document.getElementById('btnProdPause')?.addEventListener('click', () => {
            if (self._timer.estado !== 'corriendo') return;
            self._timer.estado = 'pausado';
            self._timer.pausaInicio = Date.now();
            document.getElementById('timerProdPausaForm').style.display = '';
            self.timerUpdateUI();
            // El interval SIGUE corriendo - el reloj no se detiene
        });

        // Confirmar motivo de pausa -> registrar y volver a corriendo
        document.getElementById('btnProdConfirmPause')?.addEventListener('click', () => {
            const motivo = document.getElementById('timerProdPausaMotivo')?.value;
            if (!motivo) { alert('Seleccione un motivo de parada'); return; }
            const obs = document.getElementById('timerProdPausaObs')?.value || '';
            const duracion = Date.now() - (self._timer.pausaInicio || Date.now());
            self._timer.tiempoMuerto += duracion;
            self._timer.pausas.push({
                timestamp: new Date(self._timer.pausaInicio).toISOString(),
                motivo: motivo + (obs ? ': ' + obs : ''),
                duracion: duracion
            });
            self._timer.estado = 'corriendo';
            self._timer.pausaInicio = null;
            document.getElementById('timerProdPausaForm').style.display = 'none';
            document.getElementById('timerProdPausaMotivo').value = '';
            document.getElementById('timerProdPausaObs').value = '';
            self.timerUpdateUI();
            self.renderPausasProduccion();
        });

        // "Otro" motivo
        document.getElementById('timerProdPausaMotivo')?.addEventListener('change', function() {
            const o = document.getElementById('timerProdPausaObs');
            if (o) o.style.display = this.value === 'Otro' ? '' : 'none';
        });

        // Detener
        document.getElementById('btnProdStop')?.addEventListener('click', () => {
            // Si estaba pausado, registrar ultima pausa
            if (self._timer.estado === 'pausado' && self._timer.pausaInicio) {
                self._timer.tiempoMuerto += Date.now() - self._timer.pausaInicio;
                self._timer.pausas.push({ timestamp: new Date(self._timer.pausaInicio).toISOString(), motivo: 'Fin de produccion', duracion: Date.now() - self._timer.pausaInicio });
            }
            self._timer.estado = 'detenido';
            if (self._timer.interval) { clearInterval(self._timer.interval); self._timer.interval = null; }
            self.timerTick(); // ultima actualizacion
            self.timerUpdateUI();
        });

        // --- DESMONTAJE (simple play/stop) ---
        document.getElementById('btnDesmPlay')?.addEventListener('click', () => {
            if (self._timerDesm.estado === 'detenido') return;
            self._timerDesm.estado = 'corriendo';
            self._timerDesm.inicio = Date.now();
            document.getElementById('btnDesmPlay').disabled = true;
            document.getElementById('btnDesmStop').disabled = false;
            if (self._timerDesm.interval) clearInterval(self._timerDesm.interval);
            self._timerDesm.interval = setInterval(() => {
                const el = document.getElementById('timerDesmDisplay');
                if (el) el.textContent = self.formatearTiempoMs(Date.now() - self._timerDesm.inicio);
            }, 1000);
        });
        document.getElementById('btnDesmStop')?.addEventListener('click', () => {
            self._timerDesm.total = Date.now() - self._timerDesm.inicio;
            self._timerDesm.estado = 'detenido';
            if (self._timerDesm.interval) { clearInterval(self._timerDesm.interval); self._timerDesm.interval = null; }
            document.getElementById('btnDesmPlay').disabled = true;
            document.getElementById('btnDesmStop').disabled = true;
        });
    },

    timerTick: function() {
        const t = this._timer;
        if (!t.inicio) return;
        const tiempoTotal = Date.now() - t.inicio;
        const tiempoMuerto = t.tiempoMuerto + (t.estado === 'pausado' && t.pausaInicio ? (Date.now() - t.pausaInicio) : 0);
        const tiempoEfectivo = Math.max(0, tiempoTotal - tiempoMuerto);

        const elTotal = document.getElementById('timerProdDisplay');
        const elMuerto = document.getElementById('timerMuertoDisplay');
        const elEfectivo = document.getElementById('timerEfectivoDisplay');
        const elKgH = document.getElementById('timerKgHora');

        if (elTotal) elTotal.textContent = this.formatearTiempoMs(tiempoTotal);
        if (elMuerto) elMuerto.textContent = this.formatearTiempoMs(tiempoMuerto);
        if (elEfectivo) elEfectivo.textContent = this.formatearTiempoMs(tiempoEfectivo);

        // Kg/hora estimado basado en peso total de salida y tiempo efectivo
        if (elKgH && tiempoEfectivo > 60000) {
            const pesoTotal = parseFloat(document.getElementById('pesoTotal')?.value) || 0;
            const horas = tiempoEfectivo / 3600000;
            elKgH.textContent = horas > 0 ? (pesoTotal / horas).toFixed(0) : '0';
        }
    },

    timerUpdateUI: function() {
        const t = this._timer;
        const badge = document.getElementById('timerProdEstado');
        if (badge) {
            const labels = { pendiente: 'Pendiente', corriendo: 'En Produccion', pausado: 'Parada', detenido: 'Detenido' };
            const colors = { pendiente: 'bg-secondary', corriendo: 'bg-success', pausado: 'bg-warning text-dark', detenido: 'bg-primary' };
            badge.textContent = labels[t.estado] || t.estado;
            badge.className = 'badge ' + (colors[t.estado] || 'bg-secondary');
        }
        const play = document.getElementById('btnProdPlay');
        const pause = document.getElementById('btnProdPause');
        const stop = document.getElementById('btnProdStop');
        if (play) play.disabled = t.estado === 'corriendo' || t.estado === 'detenido';
        if (pause) pause.disabled = t.estado !== 'corriendo';
        if (stop) stop.disabled = t.estado === 'pendiente' || t.estado === 'detenido';
    },

    renderPausasProduccion: function() {
        const container = document.getElementById('timerProdPausas');
        if (!container) return;
        const pausas = this._timer.pausas;
        if (pausas.length === 0) { container.innerHTML = ''; return; }
        let html = '<div class="small mt-1"><strong>Paradas registradas:</strong><ul class="mb-0" style="padding-left:1.2rem;">';
        pausas.forEach(p => {
            const hora = new Date(p.timestamp).toLocaleTimeString('es-VE', { hour: '2-digit', minute: '2-digit' });
            html += `<li>${hora} - ${p.motivo} <small class="text-muted">(${this.formatearTiempoMs(p.duracion)})</small></li>`;
        });
        html += '</ul></div>';
        container.innerHTML = html;
    },

    formatearTiempoMs: function(ms) {
        const totalSeg = Math.floor(ms / 1000);
        const h = Math.floor(totalSeg / 3600);
        const m = Math.floor((totalSeg % 3600) / 60);
        const s = totalSeg % 60;
        return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
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

    // ==================== AUTOSAVE ====================
    AUTOSAVE_KEY: 'axones_autosave_impresion',

    /**
     * Guarda el estado actual del formulario en localStorage cada 10 seg
     */
    autosave: function() {
        const form = document.getElementById('formImpresion');
        if (!form || form.style.display === 'none') return;
        if (!this.ordenCargada) return;

        const data = {
            timestamp: Date.now(),
            ordenId: this.ordenCargada?.id || '',
            ordenNumero: this.ordenCargada?.numeroOrden || this.ordenCargada?.nombreOT || '',
            campos: {}
        };

        // Guardar todos los inputs/selects/textareas del formulario
        form.querySelectorAll('input, select, textarea').forEach(el => {
            if (el.id && el.type !== 'hidden') {
                if (el.type === 'checkbox' || el.type === 'radio') {
                    data.campos[el.id] = el.checked;
                } else {
                    data.campos[el.id] = el.value;
                }
            }
        });

        // Guardar timer
        data.timer = { ...this._timer, interval: null };
        data.timerDesm = { ...this._timerDesm, interval: null };

        localStorage.setItem(this.AUTOSAVE_KEY, JSON.stringify(data));
    },

    /**
     * Restaura datos guardados si hay una sesion previa
     */
    restaurarAutosave: function() {
        const saved = localStorage.getItem(this.AUTOSAVE_KEY);
        if (!saved) return;

        try {
            const data = JSON.parse(saved);
            // Solo restaurar si es reciente (menos de 12 horas)
            if (Date.now() - data.timestamp > 12 * 60 * 60 * 1000) {
                localStorage.removeItem(this.AUTOSAVE_KEY);
                return;
            }

            // Preguntar al usuario
            const hace = Math.floor((Date.now() - data.timestamp) / 60000);
            const msg = `Se encontraron datos sin guardar de la OT ${data.ordenNumero} (hace ${hace} min).\n\n¿Desea recuperarlos?`;
            if (!confirm(msg)) {
                localStorage.removeItem(this.AUTOSAVE_KEY);
                return;
            }

            // Seleccionar la OT en el dropdown
            const select = document.getElementById('ordenTrabajo');
            if (select && data.ordenId) {
                for (let i = 0; i < select.options.length; i++) {
                    if (select.options[i].value === data.ordenId || select.options[i].textContent.includes(data.ordenNumero)) {
                        select.selectedIndex = i;
                        select.dispatchEvent(new Event('change'));
                        break;
                    }
                }
            }

            // Restaurar campos con un pequeño delay para que el formulario se muestre
            setTimeout(() => {
                const form = document.getElementById('formImpresion');
                if (!form) return;

                Object.entries(data.campos || {}).forEach(([id, value]) => {
                    const el = document.getElementById(id);
                    if (!el) return;
                    if (el.type === 'checkbox' || el.type === 'radio') {
                        el.checked = value;
                    } else {
                        el.value = value;
                    }
                });

                // Restaurar timer
                if (data.timer) {
                    this._timer = { ...data.timer, interval: null };
                    if (this._timer.estado === 'corriendo' && this._timer.inicio) {
                        this._timer.interval = setInterval(() => this.timerTick(), 1000);
                    }
                    this.timerUpdateUI();
                    this.timerTick();
                }

                console.log('[Impresion] Datos restaurados del autosave');
                if (typeof showToast === 'function') showToast('Datos recuperados de la sesion anterior', 'info');
            }, 500);

        } catch (e) {
            console.warn('[Impresion] Error restaurando autosave:', e);
            localStorage.removeItem(this.AUTOSAVE_KEY);
        }
    },

    /**
     * Limpia el autosave (al guardar exitosamente o al limpiar)
     */
    limpiarAutosave: function() {
        localStorage.removeItem(this.AUTOSAVE_KEY);
    },

    /**
     * Limpia el formulario
     */
    limpiar: function() {
        this.limpiarAutosave();
        const form = document.getElementById('formImpresion');
        if (form) {
            form.reset();

            // Limpiar campos calculados
            const campos = ['totalMaterialEntrada', 'numBobinas', 'pesoTotal', 'merma', 'totalScrap', 'porcentajeRefil', 'totalRestante', 'totalConsumido'];
            campos.forEach(id => {
                const el = document.getElementById(id);
                if (el) el.tagName === 'INPUT' ? el.value = '' : el.textContent = '0';
            });

            // Resetear indicador
            const indicador = document.getElementById('indicadorRefil');
            if (indicador) {
                indicador.className = 'alert alert-secondary py-1 px-2 mb-0 small text-center';
                indicador.innerHTML = '<i class="bi bi-dash-circle me-1"></i> Sin datos';
            }

            // Resetear footer
            ['footerEntrada', 'footerSalida', 'footerMerma', 'footerRefil'].forEach(id => {
                const el = document.getElementById(id);
                if (el) el.textContent = '0';
            });

            // Resetear resumen
            ['resumenEntrada', 'resumenRestante', 'resumenConsumido', 'resumenSalida', 'resumenScrap', 'resumenMermaCalc', 'resumenRefilCalc'].forEach(id => {
                const el = document.getElementById(id);
                if (el) el.textContent = '0.00 Kg';
            });
        }

        // Resetear seleccion de OT
        const select = document.getElementById('ordenTrabajo');
        if (select) select.value = '';
        this.ocultarResumenYForm();
    },
};

// Inicializar cuando el DOM este listo
document.addEventListener('DOMContentLoaded', () => {
    if (document.getElementById('selectorOT') || document.getElementById('formImpresion')) {
        Impresion.init();
    }
});

// Exportar modulo
if (typeof module !== 'undefined' && module.exports) {
    module.exports = Impresion;
}
