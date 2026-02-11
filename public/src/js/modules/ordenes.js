/**
 * Modulo Ordenes de Trabajo - Sistema Axones
 * Gestion completa de ordenes de trabajo con todas las especificaciones
 * Incluye alertas por email 5 dias antes de fecha de inicio
 */

const Ordenes = {
    // Datos
    ordenes: [],
    filteredOrdenes: [],
    inventario: [],
    ordenActual: null,

    // Configuracion de alertas
    DIAS_ALERTA_ANTICIPADA: 5,

    // Mapeo de campos del formulario completo
    CAMPOS_ORDEN: {
        // DATOS DEL PEDIDO
        maquina: 'maquina',
        planchas: 'planchas',
        fechaOrden: 'fechaOrden',
        numeroOrden: 'numeroOrden',
        pedidoKg: 'pedidoKg',

        // DATOS DEL PRODUCTO
        cliente: 'cliente',
        clienteRif: 'clienteRif',
        producto: 'producto',
        cpe: 'cpe',
        mpps: 'mpps',
        codigoBarra: 'codigoBarra',
        estructuraMaterial: 'estructuraMaterial',

        // AREA DE MONTAJE
        frecuencia: 'frecuencia',
        anchoCorte: 'anchoCorte',
        anchoMontaje: 'anchoMontaje',
        numBandas: 'numBandas',
        numRepeticion: 'numRepeticion',
        figuraEmbobinadoMontaje: 'figuraEmbobinadoMontaje',
        tipoImpresion: 'tipoImpresion',
        desarrollo: 'desarrollo',
        numColores: 'numColores',
        obsMontaje: 'obsMontaje',

        // AREA DE IMPRESION
        pinon: 'pinon',
        lineaCorte: 'lineaCorte',
        ubicFotoceldaImp: 'ubicFotoceldaImp',
        gramajeTinta: 'gramajeTinta',
        sustratosVirgen: 'sustratosVirgen',
        kgIngresadoImp: 'kgIngresadoImp',
        kgSalidaImp: 'kgSalidaImp',
        mermaImp: 'mermaImp',
        metrosImp: 'metrosImp',

        // AREA DE LAMINACION
        figuraEmbobinadoLam: 'figuraEmbobinadoLam',
        gramajeAdhesivo: 'gramajeAdhesivo',
        relacionMezcla: 'relacionMezcla',
        obsLaminacion: 'obsLaminacion',
        adhesivoKg: 'adhesivoKg',
        adhesivoMetros: 'adhesivoMetros',
        catalizadorKg: 'catalizadorKg',
        catalizadorMetros: 'catalizadorMetros',
        boppKg: 'boppKg',
        boppMetros: 'boppMetros',
        castKg: 'castKg',
        castMetros: 'castMetros',

        // DESCRIPCION MATERIA PRIMA
        tipoMaterial: 'tipoMaterial',
        micrasMaterial: 'micrasMaterial',
        anchoMaterial: 'anchoMaterial',
        kgDisponible: 'kgDisponible',
        proveedorMaterial: 'proveedorMaterial',
        obsMateriaPrima: 'obsMateriaPrima',

        // AREA DE CORTE/EMBALAJE
        anchoCorteFinal: 'anchoCorteFinal',
        ubicFotoceldaCorte: 'ubicFotoceldaCorte',
        distFotoceldaBorde: 'distFotoceldaBorde',
        tipoEmpalme: 'tipoEmpalme',
        maxEmpalmes: 'maxEmpalmes',
        pesoBobina: 'pesoBobina',
        metrosBobina: 'metrosBobina',
        diametroBobina: 'diametroBobina',
        anchoCore: 'anchoCore',
        cantidadCores: 'cantidadCores',
        diametroCore: 'diametroCore',
        orientacionEmbalaje: 'orientacionEmbalaje',

        // OBSERVACIONES Y PROGRAMACION
        observacionesGenerales: 'observacionesGenerales',
        fechaInicio: 'fechaInicio',
        fechaEntrega: 'fechaEntrega',
        prioridad: 'prioridad',
        estadoOrden: 'estadoOrden'
    },

    /**
     * Inicializa el modulo
     */
    init: async function() {
        console.log('Inicializando modulo Ordenes de Trabajo');

        await this.loadOrdenes();
        await this.loadInventario();
        this.setupEventListeners();
        this.cargarClientes();
        this.setFechaActual();
        this.generarNumeroOrden();

        // Verificar si estamos editando una orden existente
        this.checkEditMode();

        // Verificar ordenes proximas y enviar alertas por email si es necesario
        this.verificarOrdenesProximas();
    },

    /**
     * Establece la fecha actual
     */
    setFechaActual: function() {
        const hoy = new Date().toISOString().split('T')[0];
        const fechaOrden = document.getElementById('fechaOrden');
        if (fechaOrden && !fechaOrden.value) {
            fechaOrden.value = hoy;
        }
    },

    /**
     * Genera un numero de orden automatico
     */
    generarNumeroOrden: function() {
        const numeroOrden = document.getElementById('numeroOrden');
        if (numeroOrden && !numeroOrden.value) {
            const year = new Date().getFullYear();
            const count = this.ordenes.length + 1;
            numeroOrden.value = `OT-${year}-${String(count).padStart(4, '0')}`;
        }
    },

    /**
     * Carga ordenes desde localStorage
     */
    loadOrdenes: async function() {
        const stored = localStorage.getItem('axones_ordenes_trabajo');
        if (stored) {
            this.ordenes = JSON.parse(stored);
        } else {
            this.ordenes = [];
        }
        this.filteredOrdenes = [...this.ordenes];
    },

    /**
     * Guarda ordenes en localStorage
     */
    saveOrdenes: function() {
        localStorage.setItem('axones_ordenes_trabajo', JSON.stringify(this.ordenes));
    },

    /**
     * Carga inventario desde localStorage
     */
    loadInventario: async function() {
        const invStored = localStorage.getItem('axones_inventario');
        this.inventario = invStored ? JSON.parse(invStored) : [];
    },

    /**
     * Configura event listeners
     */
    setupEventListeners: function() {
        // Guardar orden
        const btnGuardar = document.getElementById('btnGuardarOrden');
        if (btnGuardar) {
            btnGuardar.addEventListener('click', () => this.guardarOrden());
        }

        // Limpiar formulario
        const btnLimpiar = document.getElementById('btnLimpiar');
        if (btnLimpiar) {
            btnLimpiar.addEventListener('click', () => this.limpiarFormulario());
        }

        // Calcular merma automaticamente
        const kgIngresado = document.getElementById('kgIngresadoImp');
        const kgSalida = document.getElementById('kgSalidaImp');
        if (kgIngresado && kgSalida) {
            kgIngresado.addEventListener('input', () => this.calcularMerma());
            kgSalida.addEventListener('input', () => this.calcularMerma());
        }

        // Verificar inventario al seleccionar material
        const tipoMaterial = document.getElementById('tipoMaterial');
        const micrasMaterial = document.getElementById('micrasMaterial');
        const anchoMaterial = document.getElementById('anchoMaterial');
        [tipoMaterial, micrasMaterial, anchoMaterial].forEach(el => {
            if (el) {
                el.addEventListener('change', () => this.verificarInventarioMaterial());
            }
        });

        // Cliente RIF auto-fill
        const clienteSelect = document.getElementById('cliente');
        if (clienteSelect) {
            clienteSelect.addEventListener('change', () => this.cargarDatosCliente());
        }

        // Filtros en modal
        ['buscarOrden', 'filtroEstado', 'filtroCliente', 'filtroPrioridad'].forEach(id => {
            const el = document.getElementById(id);
            if (el) {
                el.addEventListener('input', () => this.aplicarFiltros());
                el.addEventListener('change', () => this.aplicarFiltros());
            }
        });

        // Cargar ordenes al abrir modal
        const modalOrdenes = document.getElementById('modalListaOrdenes');
        if (modalOrdenes) {
            modalOrdenes.addEventListener('show.bs.modal', () => this.renderTablaOrdenes());
        }
    },

    /**
     * Carga clientes en el select
     */
    cargarClientes: function() {
        const clientes = CONFIG?.CLIENTES || [
            'PEPSICO ALIMENTOS', 'NESTLE VENEZUELA', 'EMPRESAS POLAR',
            'KRAFT HEINZ', 'ALFONZO RIVAS', 'MONDELEZ', 'MARY',
            'PLUMROSE', 'KELLOGG\'S', 'BIMBO'
        ];

        ['cliente', 'filtroCliente'].forEach(id => {
            const select = document.getElementById(id);
            if (select) {
                const firstOption = select.options[0];
                select.innerHTML = '';
                select.appendChild(firstOption);

                clientes.forEach(cliente => {
                    const option = document.createElement('option');
                    option.value = cliente;
                    option.textContent = cliente;
                    select.appendChild(option);
                });
            }
        });
    },

    /**
     * Carga datos del cliente seleccionado
     */
    cargarDatosCliente: function() {
        const cliente = document.getElementById('cliente')?.value;
        const rifInput = document.getElementById('clienteRif');

        // Datos de ejemplo - en produccion vendrian de la base de datos
        const clientesRif = {
            'PEPSICO ALIMENTOS': 'J-30123456-7',
            'NESTLE VENEZUELA': 'J-00032456-0',
            'EMPRESAS POLAR': 'J-00028679-8',
            'KRAFT HEINZ': 'J-30287654-1',
            'ALFONZO RIVAS': 'J-00112233-4',
            'MONDELEZ': 'J-30998877-6',
            'MARY': 'J-00445566-2'
        };

        if (rifInput && cliente) {
            rifInput.value = clientesRif[cliente] || '';
        }
    },

    /**
     * Calcula la merma de impresion
     */
    calcularMerma: function() {
        const kgIngresado = parseFloat(document.getElementById('kgIngresadoImp')?.value) || 0;
        const kgSalida = parseFloat(document.getElementById('kgSalidaImp')?.value) || 0;
        const mermaInput = document.getElementById('mermaImp');

        if (mermaInput && kgIngresado > 0) {
            const merma = ((kgIngresado - kgSalida) / kgIngresado) * 100;
            mermaInput.value = merma.toFixed(2);
        }
    },

    /**
     * Verifica inventario disponible para el material seleccionado
     */
    verificarInventarioMaterial: function() {
        const tipoMaterial = document.getElementById('tipoMaterial')?.value;
        const micras = parseFloat(document.getElementById('micrasMaterial')?.value) || 0;
        const ancho = parseFloat(document.getElementById('anchoMaterial')?.value) || 0;
        const kgDisponible = document.getElementById('kgDisponible');

        if (!tipoMaterial || !kgDisponible) return;

        // Buscar en inventario
        const disponible = this.inventario.filter(item => {
            const matchMaterial = item.material?.includes(tipoMaterial);
            const matchMicras = !micras || item.micras === micras;
            const matchAncho = !ancho || item.ancho === ancho;
            return matchMaterial && matchMicras && matchAncho;
        });

        const totalKg = disponible.reduce((sum, item) => sum + (item.kg || 0), 0);
        kgDisponible.value = totalKg.toFixed(2);

        // Cambiar color segun disponibilidad
        const pedidoKg = parseFloat(document.getElementById('pedidoKg')?.value) || 0;
        if (totalKg >= pedidoKg) {
            kgDisponible.classList.remove('bg-danger', 'bg-warning', 'text-white');
            kgDisponible.classList.add('bg-success', 'text-white');
        } else if (totalKg > 0) {
            kgDisponible.classList.remove('bg-danger', 'bg-success', 'text-white');
            kgDisponible.classList.add('bg-warning');
        } else {
            kgDisponible.classList.remove('bg-success', 'bg-warning');
            kgDisponible.classList.add('bg-danger', 'text-white');
        }
    },

    /**
     * Guarda la orden de trabajo
     */
    guardarOrden: function() {
        const form = document.getElementById('formOrdenTrabajo');
        if (!form.checkValidity()) {
            form.reportValidity();
            return;
        }

        // Recopilar todos los datos del formulario
        const ordenData = this.recopilarDatosFormulario();

        // Verificar si es edicion o nueva orden
        const ordenId = document.getElementById('ordenId')?.value;

        if (ordenId) {
            // Editar orden existente
            const index = this.ordenes.findIndex(o => o.id === ordenId);
            if (index !== -1) {
                ordenData.id = ordenId;
                ordenData.fechaModificacion = new Date().toISOString();
                this.ordenes[index] = ordenData;
            }
        } else {
            // Nueva orden
            ordenData.id = 'OT_' + Date.now();
            ordenData.fechaCreacion = new Date().toISOString();
            this.ordenes.push(ordenData);
        }

        this.saveOrdenes();

        // Verificar inventario
        this.verificarYCrearAlertas(ordenData);

        // Mostrar mensaje de exito
        if (typeof Axones !== 'undefined') {
            Axones.showSuccess(`Orden ${ordenData.numeroOrden} guardada exitosamente`);
        } else {
            alert(`Orden ${ordenData.numeroOrden} guardada exitosamente`);
        }

        // Limpiar formulario para nueva orden
        this.limpiarFormulario();
        this.generarNumeroOrden();
    },

    /**
     * Recopila todos los datos del formulario
     */
    recopilarDatosFormulario: function() {
        const data = {};

        // Campos simples
        Object.keys(this.CAMPOS_ORDEN).forEach(campo => {
            const el = document.getElementById(campo);
            if (el) {
                if (el.type === 'number') {
                    data[campo] = el.value ? parseFloat(el.value) : null;
                } else {
                    data[campo] = el.value || null;
                }
            }
        });

        // Tabla de tintas (8 posiciones)
        data.tintas = [];
        for (let i = 1; i <= 8; i++) {
            const color = document.getElementById(`tinta${i}Color`)?.value;
            if (color) {
                data.tintas.push({
                    posicion: i,
                    color: color,
                    anilox: document.getElementById(`tinta${i}Anilox`)?.value || '',
                    viscosidad: parseFloat(document.getElementById(`tinta${i}Visc`)?.value) || null,
                    porcentaje: parseFloat(document.getElementById(`tinta${i}Pct`)?.value) || null,
                    observaciones: document.getElementById(`tinta${i}Obs`)?.value || ''
                });
            }
        }

        return data;
    },

    /**
     * Verifica inventario y crea alertas si es necesario
     */
    verificarYCrearAlertas: function(orden) {
        const tipoMaterial = orden.tipoMaterial;
        const pedidoKg = orden.pedidoKg;

        if (!tipoMaterial || !pedidoKg) return;

        const disponible = this.inventario.filter(item =>
            item.material?.includes(tipoMaterial)
        ).reduce((sum, item) => sum + (item.kg || 0), 0);

        if (disponible < pedidoKg) {
            this.crearAlertaBajoStock(orden, disponible);
        }
    },

    /**
     * Crea alerta de bajo stock
     */
    crearAlertaBajoStock: function(orden, disponible) {
        const alertas = JSON.parse(localStorage.getItem('axones_alertas') || '[]');
        alertas.unshift({
            id: Date.now(),
            tipo: 'stock_bajo',
            nivel: 'danger',
            mensaje: `Inventario insuficiente para ${orden.numeroOrden}: ${orden.tipoMaterial} - Requerido: ${orden.pedidoKg} Kg, Disponible: ${disponible.toFixed(2)} Kg`,
            fecha: new Date().toISOString(),
            estado: 'pendiente',
            datos: { ordenId: orden.id }
        });
        localStorage.setItem('axones_alertas', JSON.stringify(alertas));
    },

    /**
     * Limpia el formulario
     */
    limpiarFormulario: function() {
        document.getElementById('formOrdenTrabajo')?.reset();
        document.getElementById('ordenId').value = '';
        this.setFechaActual();
        this.generarNumeroOrden();

        // Resetear campo kg disponible
        const kgDisponible = document.getElementById('kgDisponible');
        if (kgDisponible) {
            kgDisponible.value = '';
            kgDisponible.classList.remove('bg-success', 'bg-warning', 'bg-danger', 'text-white');
        }
    },

    /**
     * Verifica si estamos en modo edicion
     */
    checkEditMode: function() {
        const params = new URLSearchParams(window.location.search);
        const ordenId = params.get('edit');

        if (ordenId) {
            const orden = this.ordenes.find(o => o.id === ordenId);
            if (orden) {
                this.cargarOrdenEnFormulario(orden);
            }
        }
    },

    /**
     * Carga una orden en el formulario para edicion
     */
    cargarOrdenEnFormulario: function(orden) {
        document.getElementById('ordenId').value = orden.id;

        // Cargar campos simples
        Object.keys(this.CAMPOS_ORDEN).forEach(campo => {
            const el = document.getElementById(campo);
            if (el && orden[campo] !== undefined && orden[campo] !== null) {
                el.value = orden[campo];
            }
        });

        // Cargar tintas
        if (orden.tintas && Array.isArray(orden.tintas)) {
            orden.tintas.forEach(tinta => {
                const i = tinta.posicion;
                if (document.getElementById(`tinta${i}Color`)) {
                    document.getElementById(`tinta${i}Color`).value = tinta.color || '';
                    document.getElementById(`tinta${i}Anilox`).value = tinta.anilox || '';
                    document.getElementById(`tinta${i}Visc`).value = tinta.viscosidad || '';
                    document.getElementById(`tinta${i}Pct`).value = tinta.porcentaje || '';
                    document.getElementById(`tinta${i}Obs`).value = tinta.observaciones || '';
                }
            });
        }

        // Verificar inventario
        this.verificarInventarioMaterial();
    },

    /**
     * Aplica filtros a la lista de ordenes
     */
    aplicarFiltros: function() {
        const busqueda = document.getElementById('buscarOrden')?.value.toLowerCase() || '';
        const estado = document.getElementById('filtroEstado')?.value || '';
        const cliente = document.getElementById('filtroCliente')?.value || '';
        const prioridad = document.getElementById('filtroPrioridad')?.value || '';

        this.filteredOrdenes = this.ordenes.filter(orden => {
            if (busqueda) {
                const texto = `${orden.numeroOrden} ${orden.cliente} ${orden.producto}`.toLowerCase();
                if (!texto.includes(busqueda)) return false;
            }
            if (estado && orden.estadoOrden !== estado) return false;
            if (cliente && orden.cliente !== cliente) return false;
            if (prioridad && orden.prioridad !== prioridad) return false;
            return true;
        });

        this.renderTablaOrdenes();
    },

    /**
     * Renderiza la tabla de ordenes en el modal
     */
    renderTablaOrdenes: function() {
        const tbody = document.getElementById('tablaOrdenes');
        if (!tbody) return;

        if (this.filteredOrdenes.length === 0) {
            tbody.innerHTML = '<tr><td colspan="9" class="text-center text-muted py-3">No hay ordenes registradas</td></tr>';
            return;
        }

        tbody.innerHTML = this.filteredOrdenes.map(orden => {
            const estadoClass = orden.estadoOrden === 'completada' ? 'bg-success' :
                               orden.estadoOrden === 'en-proceso' ? 'bg-primary' : 'bg-warning text-dark';
            const prioridadClass = orden.prioridad === 'urgente' ? 'bg-danger' :
                                  orden.prioridad === 'alta' ? 'bg-warning text-dark' : 'bg-secondary';

            return `
                <tr>
                    <td><strong>${orden.numeroOrden || '-'}</strong></td>
                    <td>${orden.fechaOrden || '-'}</td>
                    <td>${orden.cliente || '-'}</td>
                    <td>${orden.producto || '-'}</td>
                    <td class="text-center"><span class="badge bg-info">${orden.maquina || '-'}</span></td>
                    <td class="text-end">${orden.pedidoKg ? this.formatNumber(orden.pedidoKg) : '-'}</td>
                    <td class="text-center"><span class="badge ${prioridadClass}">${orden.prioridad || 'normal'}</span></td>
                    <td class="text-center"><span class="badge ${estadoClass}">${orden.estadoOrden || 'pendiente'}</span></td>
                    <td class="text-center">
                        <button class="btn btn-sm btn-outline-primary me-1" onclick="Ordenes.editarOrden('${orden.id}')" title="Editar">
                            <i class="bi bi-pencil"></i>
                        </button>
                        <button class="btn btn-sm btn-outline-danger" onclick="Ordenes.eliminarOrden('${orden.id}')" title="Eliminar">
                            <i class="bi bi-trash"></i>
                        </button>
                    </td>
                </tr>
            `;
        }).join('');
    },

    /**
     * Edita una orden existente
     */
    editarOrden: function(id) {
        const orden = this.ordenes.find(o => o.id === id);
        if (!orden) return;

        // Cerrar modal
        bootstrap.Modal.getInstance(document.getElementById('modalListaOrdenes'))?.hide();

        // Cargar orden en formulario
        this.cargarOrdenEnFormulario(orden);

        // Scroll al inicio del formulario
        window.scrollTo({ top: 0, behavior: 'smooth' });
    },

    /**
     * Elimina una orden
     */
    eliminarOrden: function(id) {
        const orden = this.ordenes.find(o => o.id === id);
        if (!orden) return;

        if (confirm(`Eliminar orden ${orden.numeroOrden}?`)) {
            this.ordenes = this.ordenes.filter(o => o.id !== id);
            this.filteredOrdenes = this.filteredOrdenes.filter(o => o.id !== id);
            this.saveOrdenes();
            this.renderTablaOrdenes();

            if (typeof Axones !== 'undefined') {
                Axones.showSuccess('Orden eliminada');
            }
        }
    },

    /**
     * Verifica ordenes proximas a su fecha de inicio
     */
    verificarOrdenesProximas: async function() {
        console.log('Verificando ordenes proximas a fecha de inicio...');

        const hoy = new Date();
        hoy.setHours(0, 0, 0, 0);

        const ordenesProximas = this.ordenes.filter(orden => {
            if (orden.estadoOrden === 'completada') return false;
            if (!orden.fechaInicio && !orden.fechaEntrega) return false;

            const fechaOrden = new Date(orden.fechaInicio || orden.fechaEntrega);
            fechaOrden.setHours(0, 0, 0, 0);

            const diasRestantes = Math.ceil((fechaOrden - hoy) / (1000 * 60 * 60 * 24));
            return diasRestantes <= this.DIAS_ALERTA_ANTICIPADA && diasRestantes >= 0;
        });

        if (ordenesProximas.length === 0) {
            console.log('No hay ordenes proximas que requieran verificacion');
            return;
        }

        console.log(`Encontradas ${ordenesProximas.length} ordenes proximas a verificar`);

        for (const orden of ordenesProximas) {
            const disponible = this.inventario.filter(item =>
                item.material?.includes(orden.tipoMaterial)
            ).reduce((sum, item) => sum + (item.kg || 0), 0);

            if (disponible < (orden.pedidoKg || 0)) {
                const alertaEnviada = this.verificarAlertaEmailEnviada(orden.id);
                if (!alertaEnviada) {
                    await this.enviarAlertaEmailInventario(orden, disponible);
                }
            }
        }
    },

    /**
     * Verifica si ya se envio alerta email hoy
     */
    verificarAlertaEmailEnviada: function(ordenId) {
        const alertasEmail = JSON.parse(localStorage.getItem('axones_alertas_email') || '[]');
        const hoy = new Date().toISOString().split('T')[0];
        return alertasEmail.some(a => a.ordenId === ordenId && a.fecha.startsWith(hoy));
    },

    /**
     * Registra alerta email enviada
     */
    registrarAlertaEmailEnviada: function(ordenId) {
        const alertasEmail = JSON.parse(localStorage.getItem('axones_alertas_email') || '[]');
        alertasEmail.push({
            ordenId: ordenId,
            fecha: new Date().toISOString()
        });
        if (alertasEmail.length > 100) {
            alertasEmail.splice(0, alertasEmail.length - 100);
        }
        localStorage.setItem('axones_alertas_email', JSON.stringify(alertasEmail));
    },

    /**
     * Envia alerta por email
     */
    enviarAlertaEmailInventario: async function(orden, disponible) {
        console.log(`Enviando alerta por email para orden ${orden.numeroOrden}...`);

        const fechaOrden = new Date(orden.fechaInicio || orden.fechaEntrega);
        const hoy = new Date();
        const diasRestantes = Math.ceil((fechaOrden - hoy) / (1000 * 60 * 60 * 24));

        const datosAlerta = {
            tipo: 'inventario_insuficiente_email',
            nivel: 'critical',
            numeroOrden: orden.numeroOrden,
            cliente: orden.cliente,
            producto: orden.producto,
            material: orden.tipoMaterial,
            cantidadRequerida: orden.pedidoKg,
            cantidadDisponible: disponible,
            fechaEntrega: orden.fechaEntrega,
            diasRestantes: diasRestantes,
            mensaje: `URGENTE: La orden ${orden.numeroOrden} para ${orden.cliente} tiene fecha en ${diasRestantes} dias y NO hay suficiente inventario de ${orden.tipoMaterial}. Requerido: ${orden.pedidoKg} Kg, Disponible: ${disponible.toFixed(2)} Kg.`,
            enviarEmail: true
        };

        try {
            if (typeof AxonesAPI !== 'undefined') {
                const result = await AxonesAPI.post('enviarAlertaEmail', datosAlerta);
                if (result.success) {
                    console.log('Alerta por email enviada exitosamente');
                    this.registrarAlertaEmailEnviada(orden.id);
                }
            }
            // Crear alerta local
            this.crearAlertaConEmail(orden, diasRestantes, disponible);
        } catch (error) {
            console.error('Error enviando alerta por email:', error);
            this.crearAlertaConEmail(orden, diasRestantes, disponible);
        }
    },

    /**
     * Crea alerta con indicador de email
     */
    crearAlertaConEmail: function(orden, diasRestantes, disponible) {
        const alertas = JSON.parse(localStorage.getItem('axones_alertas') || '[]');
        const alertaExistente = alertas.find(a =>
            a.tipo === 'inventario_insuficiente_email' &&
            a.datos?.ordenId === orden.id &&
            new Date(a.fecha) > new Date(Date.now() - 24 * 60 * 60 * 1000)
        );

        if (alertaExistente) return;

        alertas.unshift({
            id: Date.now(),
            tipo: 'inventario_insuficiente_email',
            nivel: 'critical',
            mensaje: `ALERTA: ${orden.numeroOrden} (${orden.cliente}) - Sin inventario de ${orden.tipoMaterial}. Fecha: ${orden.fechaEntrega} (${diasRestantes} dias). Disponible: ${disponible.toFixed(2)} Kg`,
            fecha: new Date().toISOString(),
            estado: 'pendiente',
            emailEnviado: true,
            datos: {
                ordenId: orden.id,
                numeroOrden: orden.numeroOrden,
                cliente: orden.cliente,
                material: orden.tipoMaterial,
                fechaEntrega: orden.fechaEntrega,
                diasRestantes: diasRestantes
            }
        });

        localStorage.setItem('axones_alertas', JSON.stringify(alertas));
    },

    /**
     * Obtiene ordenes pendientes para produccion
     */
    getOrdenesPendientes: function(proceso = null) {
        let ordenes = this.ordenes.filter(o => o.estadoOrden !== 'completada');

        // Filtrar por proceso/maquina si se especifica
        if (proceso) {
            ordenes = ordenes.filter(o => {
                if (proceso === 'impresion') {
                    return o.maquina?.includes('COMEXI');
                } else if (proceso === 'laminacion') {
                    return o.maquina?.includes('Laminadora');
                } else if (proceso === 'corte') {
                    return o.maquina?.includes('Cortadora');
                }
                return true;
            });
        }

        return ordenes.sort((a, b) => {
            // Primero por prioridad
            const prioridadOrder = { 'urgente': 0, 'alta': 1, 'normal': 2 };
            const prioridadA = prioridadOrder[a.prioridad] || 2;
            const prioridadB = prioridadOrder[b.prioridad] || 2;
            if (prioridadA !== prioridadB) return prioridadA - prioridadB;

            // Luego por fecha
            const fechaA = new Date(a.fechaEntrega || '9999-12-31');
            const fechaB = new Date(b.fechaEntrega || '9999-12-31');
            return fechaA - fechaB;
        });
    },

    /**
     * Obtiene una orden por numero de OT
     */
    getOrdenByNumero: function(numero) {
        return this.ordenes.find(o => o.numeroOrden === numero);
    },

    /**
     * Obtiene una orden por ID
     */
    getOrdenById: function(id) {
        return this.ordenes.find(o => o.id === id);
    },

    /**
     * Formatea numero
     */
    formatNumber: function(num) {
        return new Intl.NumberFormat('es-VE', {
            minimumFractionDigits: 0,
            maximumFractionDigits: 2
        }).format(num);
    }
};

// Inicializar cuando el DOM este listo
document.addEventListener('DOMContentLoaded', () => {
    if (document.getElementById('formOrdenTrabajo')) {
        Ordenes.init();
    }
});

// Exportar modulo
if (typeof window !== 'undefined') {
    window.Ordenes = Ordenes;
}
