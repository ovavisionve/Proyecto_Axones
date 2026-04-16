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
        // ELIMINADOS: ubicFotoceldaImp, gramajeTinta (segun feedback equipo Axones)
        sustratosVirgen: 'sustratosVirgen',
        kgUtilizarImp: 'kgUtilizarImp',
        kgIngresadoImp: 'kgIngresadoImp',
        kgSalidaImp: 'kgSalidaImp',
        mermaImp: 'mermaImp',
        metrosImp: 'metrosImp',

        // AREA DE LAMINACION
        figuraEmbobinadoLam: 'figuraEmbobinadoLam',
        gramajeAdhesivo: 'gramajeAdhesivo',
        relacionMezcla: 'relacionMezcla',
        kgEntradaLam: 'kgEntradaLam',
        kgSalidaLam: 'kgSalidaLam',
        metrajeLam: 'metrajeLam',
        mermaLam: 'mermaLam',
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
        distFiguraContrario: 'distFiguraContrario',
        distFiguraFotocelda: 'distFiguraFotocelda',
        tipoEmpalme: 'tipoEmpalme',
        maxEmpalmes: 'maxEmpalmes',
        pesoBobina: 'pesoBobina',
        metrosBobina: 'metrosBobina',
        diametroBobina: 'diametroBobina',
        anchoCore: 'anchoCore',
        cantidadCores: 'cantidadCores',
        diametroCore: 'diametroCore',
        orientacionEmbalaje: 'orientacionEmbalaje',
        kgIngresadosCorte: 'kgIngresadosCorte',
        kgSalidaCorte: 'kgSalidaCorte',
        kgMermaCorte: 'kgMermaCorte',
        metrajeCorte: 'metrajeCorte',

        // OBSERVACIONES Y PROGRAMACION
        observacionesGenerales: 'observacionesGenerales',
        fechaInicio: 'fechaInicio',
        fechaEntrega: 'fechaEntrega',
        prioridad: 'prioridad',
        estadoOrden: 'estadoOrden',

        // FICHA TECNICA - Estructura del producto
        fichaTipoMat1: 'fichaTipoMat1',
        fichaMicras1: 'fichaMicras1',
        fichaDensidad1: 'fichaDensidad1',
        fichaKg1: 'fichaKg1',
        fichaSku1: 'fichaSku1',
        fichaTipoAdhesivo: 'fichaTipoAdhesivo',
        fichaGramajeAdhesivo: 'fichaGramajeAdhesivo',
        fichaGramajeAdhesivoHasta: 'fichaGramajeAdhesivoHasta',
        fichaRelacionCatalizador: 'fichaRelacionCatalizador',
        fichaKgAdhesivo: 'fichaKgAdhesivo',
        fichaKgCatalizador: 'fichaKgCatalizador',
        fichaTipoMat2: 'fichaTipoMat2',
        fichaMicras2: 'fichaMicras2',
        fichaDensidad2: 'fichaDensidad2',
        fichaKg2: 'fichaKg2',
        fichaSku2: 'fichaSku2',
        fichaAncho1: 'fichaAncho1',
        fichaAncho2: 'fichaAncho2'
    },

    // Densidades por tipo de material
    DENSIDADES: {
        'BOPP NORMAL': 0.90,
        'BOPP MATE': 0.90,
        'BOPP PASTA': 0.90,
        'BOPP PERLADO': 0.80,
        'PET': 1.38,
        'PA': 1.14,
        'CAST': 0.93,
        'PEBD': 0.93,
        'PEBD PIGMENT': 0.93,
        'PERLADO': 0.80,
        'METAL': 0.90,
        'POLIETILENO': 0.92
    },

    /**
     * Inicializa el modulo
     */
    init: async function() {
        console.log('Inicializando modulo Ordenes de Trabajo');

        // Inicializar Supabase directamente
        await AxonesDB.init();

        await this.loadOrdenes();
        await this.loadInventario();
        this.setupEventListeners();
        await this.cargarClientes();
        this.setFechaActual();
        await this.generarNumeroOrden();

        // Inicializar memoria de clientes desde ordenes existentes
        if (typeof ClienteMemoria !== 'undefined') {
            ClienteMemoria.reconstruirDesdeOrdenes();
        }

        // Cargar productos del inventario en el selector
        // Nota: cargarProductosDelInventario desactivado - producto es texto libre

        // Cargar colores de tintas del inventario en datalist
        this.cargarTintasColor();

        // Verificar si estamos editando una orden existente
        this.checkEditMode();

        // Verificar ordenes proximas y enviar alertas por email si es necesario
        this.verificarOrdenesProximas();

        // Escuchar cambios en tiempo real desde Supabase
        if (AxonesDB.isReady()) {
            AxonesDB.realtime.suscribir('ordenes_trabajo', () => {
                this.loadOrdenes().then(() => {
                    this.generarNumeroOrden();
                    this.renderTablaOrdenes();
                });
            });
        }
        // Autosave OT no terminada
        this.restaurarAutosaveOT();
        setInterval(() => this.autosaveOT(), 5000);
        window.addEventListener('beforeunload', () => this.autosaveOT());
        document.addEventListener('visibilitychange', () => { if (document.hidden) this.autosaveOT(); });
    },

    AUTOSAVE_OT_KEY: 'axones_autosave_ot',

    autosaveOT: function() {
        const form = document.getElementById('formOrdenTrabajo');
        if (!form) return;
        const numOT = document.getElementById('numeroOrden')?.value;
        if (!numOT) return;
        // Solo guardar si hay al menos un campo con datos
        const cliente = document.getElementById('cliente')?.value;
        const producto = document.getElementById('producto')?.value;
        if (!cliente && !producto) return;

        const data = { timestamp: Date.now(), campos: {} };
        form.querySelectorAll('input, select, textarea').forEach(el => {
            if (el.id && el.type !== 'hidden') {
                data.campos[el.id] = el.type === 'checkbox' || el.type === 'radio' ? el.checked : el.value;
            }
        });
        localStorage.setItem(this.AUTOSAVE_OT_KEY, JSON.stringify(data));
    },

    restaurarAutosaveOT: function() {
        const saved = localStorage.getItem(this.AUTOSAVE_OT_KEY);
        if (!saved) return;
        try {
            const data = JSON.parse(saved);
            if (Date.now() - data.timestamp > 12 * 60 * 60 * 1000) { localStorage.removeItem(this.AUTOSAVE_OT_KEY); return; }
            const hace = Math.floor((Date.now() - data.timestamp) / 60000);
            const numOT = data.campos?.numeroOrden || 'OT en progreso';
            if (!confirm(`Se encontro una OT sin guardar (${numOT}, hace ${hace} min).\n\n¿Desea recuperarla?`)) {
                localStorage.removeItem(this.AUTOSAVE_OT_KEY);
                return;
            }
            const form = document.getElementById('formOrdenTrabajo');
            if (!form) return;
            Object.entries(data.campos || {}).forEach(([id, v]) => {
                const el = document.getElementById(id);
                if (!el) return;
                if (el.type === 'checkbox' || el.type === 'radio') el.checked = v;
                else el.value = v;
            });
            if (typeof showToast === 'function') showToast('OT recuperada', 'info');
        } catch (e) { localStorage.removeItem(this.AUTOSAVE_OT_KEY); }
    },

    limpiarAutosaveOT: function() {
        localStorage.removeItem(this.AUTOSAVE_OT_KEY);
    },
    _esperarSync: async function() {
        if (typeof AxonesSync !== 'undefined' && AxonesSync._isReady && AxonesSync._isReady()) {
            return; // Ya esta listo
        }

        return new Promise(resolve => {
            let resuelto = false;

            // Escuchar evento de sync completado
            const handler = () => {
                if (!resuelto) {
                    resuelto = true;
                    resolve();
                }
            };
            window.addEventListener('axones-sync', handler, { once: true });

            // Timeout de seguridad: no esperar mas de 5 segundos
            setTimeout(() => {
                if (!resuelto) {
                    resuelto = true;
                    window.removeEventListener('axones-sync', handler);
                    console.log('[Ordenes] Timeout esperando sync - continuando con datos locales');
                    resolve();
                }
            }, 5000);
        });
    },

    /**
     * Carga los productos del inventario en el datalist (permite escribir nuevos o seleccionar)
     */
    cargarProductosDelInventario: function() {
        const datalist = document.getElementById('listaProductos');
        const productoInput = document.getElementById('producto');
        if (!datalist || !productoInput) return;

        // Obtener inventario
        const inventario = this.inventario || [];

        // Obtener productos de ordenes anteriores (para no perder productos personalizados)
        const productosDeOrdenes = this.ordenes
            .map(o => o.producto)
            .filter(p => p);

        // Combinar productos del inventario + ordenes anteriores
        const todosProductos = new Map();

        // Primero agregar productos del inventario con sus datos completos
        inventario.forEach(item => {
            const sku = item.sku || `${item.material}-${item.micras}-${item.ancho}`;
            const nombreDisplay = item.producto
                ? `${item.material} ${item.micras}µ x ${item.ancho}mm - ${item.producto} | ${sku}`
                : `${item.material} ${item.micras}µ x ${item.ancho}mm | ${sku}`;

            todosProductos.set(nombreDisplay, {
                id: item.id,
                sku: sku,
                codigoBarra: item.codigoBarra || '',
                material: item.material,
                micras: item.micras,
                ancho: item.ancho,
                kg: item.kg,
                producto: item.producto || '',
                densidad: item.densidad || this.obtenerDensidadMaterial(item.material),
                proveedor: item.proveedor || ''
            });
        });

        // Agregar productos de ordenes anteriores que no esten en inventario
        productosDeOrdenes.forEach(producto => {
            if (!Array.from(todosProductos.keys()).some(k => k.includes(producto))) {
                todosProductos.set(producto, { producto: producto });
            }
        });

        // Guardar mapa para busqueda posterior
        this.productosMap = todosProductos;

        // Cargar en datalist
        datalist.innerHTML = '';
        Array.from(todosProductos.keys()).sort().forEach(nombre => {
            const item = todosProductos.get(nombre);
            const option = document.createElement('option');
            option.value = nombre;
            if (item.kg) {
                option.textContent = `Stock: ${item.kg} Kg`;
            }
            datalist.appendChild(option);
        });

        // Evento cuando se selecciona/escribe un producto
        productoInput.addEventListener('input', () => this.onProductoInput());
        productoInput.addEventListener('blur', () => this.onProductoSeleccionado());

        console.log(`Productos cargados: ${todosProductos.size} items (inventario + ordenes anteriores)`);
    },

    /**
     * Carga colores de tintas del inventario en datalist para las 8 posiciones
     */
    cargarTintasColor: async function() {
        const datalist = document.getElementById('listaTintasColor');
        if (!datalist) return;

        let tintas = [];
        if (AxonesDB.isReady()) {
            try {
                tintas = await AxonesDB.tintas.listar({ ordenar: 'material', ascendente: true });
            } catch (e) {
                console.warn('[Ordenes] Error cargando tintas:', e.message);
            }
        }

        // Fallback: tintas de localStorage
        if (tintas.length === 0) {
            try {
                const tintasLocal = JSON.parse(localStorage.getItem('axones_tintas_inventario') || '[]');
                tintas = tintasLocal;
            } catch (e) { /* ignorar */ }
        }

        datalist.innerHTML = '';
        const coloresUnicos = new Set();

        tintas.forEach(t => {
            const color = t.material || t.color || t.nombre || '';
            const tipo = t.tipo || '';
            const stock = t.stock_kg || t.cantidad || 0;
            const displayName = tipo ? `${color} (${tipo}) - ${stock}kg` : `${color} - ${stock}kg`;

            if (color && !coloresUnicos.has(color.toUpperCase())) {
                coloresUnicos.add(color.toUpperCase());
                const option = document.createElement('option');
                option.value = color;
                option.textContent = displayName;
                datalist.appendChild(option);
            }
        });

        console.log(`[Ordenes] Tintas color cargadas: ${coloresUnicos.size} colores`);
    },

    /**
     * Maneja el input de producto (para limpiar campos si cambia)
     */
    onProductoInput: function() {
        // Al escribir, limpiar campos pre-llenados para que se actualicen al perder foco
    },

    /**
     * Maneja la seleccion de un producto - Pre-llena TODOS los campos relacionados
     */
    onProductoSeleccionado: function() {
        const productoInput = document.getElementById('producto');
        const productoValor = productoInput?.value?.trim();

        if (!productoValor) return;

        // Buscar en el mapa de productos
        const data = this.productosMap?.get(productoValor);

        // Si no hay datos del inventario, es un producto nuevo - no pre-llenar
        if (!data || !data.material) {
            console.log(`Producto nuevo/personalizado: ${productoValor}`);
            return;
        }

        // === PRE-LLENAR CAMPOS desde datos del inventario ===

        // Codigo de producto (CPE) = SKU
        const cpe = document.getElementById('cpe');
        if (cpe) cpe.value = data.sku || '';

        // Codigo de barras
        const codigoBarra = document.getElementById('codigoBarra');
        if (codigoBarra) codigoBarra.value = data.codigoBarra || '';

        // Estructura Material
        const estructuraMaterial = document.getElementById('estructuraMaterial');
        if (estructuraMaterial) {
            estructuraMaterial.value = `${data.material} ${data.micras}`;
        }

        // Tipo de material
        const tipoMaterial = document.getElementById('tipoMaterial');
        if (tipoMaterial) tipoMaterial.value = data.material || '';

        // Micras
        const micrasMaterial = document.getElementById('micrasMaterial');
        if (micrasMaterial) micrasMaterial.value = data.micras || '';

        // Ancho
        const anchoMaterial = document.getElementById('anchoMaterial');
        if (anchoMaterial) anchoMaterial.value = data.ancho || '';

        // anchoCorte y anchoMontaje NO se pre-llenan desde inventario
        // anchoCorte es dato de diseño (manual), anchoMontaje = anchoCorte × numBandas (calculado)

        // Kg disponible
        const kgDisponible = document.getElementById('kgDisponible');
        if (kgDisponible && data.kg) {
            kgDisponible.value = parseFloat(data.kg).toFixed(2);
            // Color segun disponibilidad
            const pedidoKg = parseFloat(document.getElementById('pedidoKg')?.value) || 0;
            if (parseFloat(data.kg) >= pedidoKg && pedidoKg > 0) {
                kgDisponible.classList.remove('bg-danger', 'bg-warning');
                kgDisponible.classList.add('bg-success', 'text-white');
            } else if (parseFloat(data.kg) > 0) {
                kgDisponible.classList.remove('bg-danger', 'bg-success');
                kgDisponible.classList.add('bg-warning');
            } else {
                kgDisponible.classList.remove('bg-success', 'bg-warning');
                kgDisponible.classList.add('bg-danger', 'text-white');
            }
        }

        // Proveedor del material
        const proveedorMaterial = document.getElementById('proveedorMaterial');
        if (proveedorMaterial && data.proveedor) {
            proveedorMaterial.value = data.proveedor;
        }

        // Guardar densidad para calculos
        const densidadHidden = document.getElementById('sustratosVirgenDensidad');
        if (densidadHidden) densidadHidden.value = data.densidad || '0.90';

        // Resaltar campos pre-llenados
        ['cpe', 'codigoBarra', 'estructuraMaterial', 'tipoMaterial', 'micrasMaterial', 'anchoMaterial', 'proveedorMaterial'].forEach(id => {
            const el = document.getElementById(id);
            if (el && el.value) {
                el.classList.add('bg-light', 'border-success');
                el.setAttribute('title', 'Pre-llenado desde inventario');
            }
        });

        console.log(`Producto seleccionado: SKU=${data.sku}, Material=${data.material}, ${data.micras}µ x ${data.ancho}mm, Stock=${data.kg}Kg`);

        // Calcular metros estimados si ya hay pedidoKg
        this.calcularMetrosEstimados();

        // Mostrar mensaje informativo
        if (typeof Axones !== 'undefined' && data.sku) {
            Axones.showSuccess(`Datos cargados: ${data.sku} - ${data.material} ${data.micras}µ x ${data.ancho}mm`);
        }
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
     * Genera un numero de orden automatico correlativo
     * Formato: OT-YYYY-XXXX donde XXXX es el siguiente numero disponible
     */
    /**
     * Genera numero de OT unico consultando Supabase en tiempo real.
     * Usado al guardar (no al cargar form) para evitar duplicate key.
     * @param {number} offset - sumar N al maximo encontrado (para reintentos)
     */
    _generarNumeroOTUnico: async function(offset = 1) {
        const year = new Date().getFullYear();
        let maxNum = 0;
        if (typeof AxonesDB !== 'undefined' && AxonesDB.isReady()) {
            try {
                const { data } = await AxonesDB.client.from('ordenes_trabajo')
                    .select('numero_ot')
                    .like('numero_ot', `OT-${year}-%`);
                (data || []).forEach(ot => {
                    const m = (ot.numero_ot || '').match(/OT-\d{4}-(\d+)/);
                    if (m) {
                        const n = parseInt(m[1]);
                        if (n > maxNum) maxNum = n;
                    }
                });
            } catch (e) { console.warn('[OT] Error generando numero unico:', e); }
        }
        return `OT-${year}-${String(maxNum + offset).padStart(4, '0')}`;
    },

    generarNumeroOrden: async function() {
        const numeroOrden = document.getElementById('numeroOrden');
        if (!numeroOrden) return;

        // Solo generar si esta vacio o es una nueva orden
        if (numeroOrden.value && this.ordenActual) return;

        const year = new Date().getFullYear();
        let maxNum = 0;

        // 1. Consultar Supabase directamente
        if (typeof AxonesDB !== 'undefined' && AxonesDB.isReady()) {
            try {
                const { data, error } = await AxonesDB.client.from('ordenes_trabajo')
                    .select('numero_ot');
                if (!error && data) {
                    data.forEach(ot => {
                        if (ot.numero_ot) {
                            const match = ot.numero_ot.match(/OT-(\d{4})-(\d+)/);
                            if (match && parseInt(match[1]) === year) {
                                const num = parseInt(match[2]);
                                if (num > maxNum) maxNum = num;
                            }
                        }
                    });
                    console.log(`[OT] Supabase: ${data.length} OTs, max correlativo ${year}: ${maxNum}`);
                } else {
                    console.warn('[OT] Error en query Supabase:', error);
                }
            } catch (e) {
                console.warn('[OT] Error consultando Supabase:', e);
            }
        } else {
            console.warn('[OT] AxonesDB no ready, esperando...');
            // Intentar inicializar y reintentar
            if (typeof AxonesDB !== 'undefined') {
                try {
                    await AxonesDB.init();
                    const { data } = await AxonesDB.client.from('ordenes_trabajo').select('numero_ot');
                    if (data) {
                        data.forEach(ot => {
                            if (ot.numero_ot) {
                                const match = ot.numero_ot.match(/OT-(\d{4})-(\d+)/);
                                if (match && parseInt(match[1]) === year) {
                                    const num = parseInt(match[2]);
                                    if (num > maxNum) maxNum = num;
                                }
                            }
                        });
                        console.log(`[OT] Supabase (reintento): max correlativo ${year}: ${maxNum}`);
                    }
                } catch (e) { console.warn('[OT] Reintento fallo:', e); }
            }
        }

        // 2. Fallback: buscar en array local (this.ordenes)
        if (maxNum === 0 && this.ordenes.length > 0) {
            this.ordenes.forEach(orden => {
                const numOT = orden.numeroOrden || orden.nombreOT || orden.numero_ot || '';
                const match = numOT.match(/OT-(\d{4})-(\d+)/);
                if (match && parseInt(match[1]) === year) {
                    const num = parseInt(match[2]);
                    if (num > maxNum) maxNum = num;
                }
            });
            console.log(`[OT] Array local: ${this.ordenes.length} OTs, max: ${maxNum}`);
        }

        // 3. Fallback: sync_store
        if (maxNum === 0 && typeof AxonesDB !== 'undefined' && AxonesDB.isReady()) {
            try {
                const { data } = await AxonesDB.client.from('sync_store')
                    .select('value').eq('key', 'axones_ordenes_trabajo').single();
                if (data?.value) {
                    const ordenes = typeof data.value === 'string' ? JSON.parse(data.value) : data.value;
                    if (Array.isArray(ordenes)) {
                        ordenes.forEach(o => {
                            const numOT = o.numeroOrden || o.nombreOT || '';
                            const match = numOT.match(/OT-(\d{4})-(\d+)/);
                            if (match && parseInt(match[1]) === year) {
                                const num = parseInt(match[2]);
                                if (num > maxNum) maxNum = num;
                            }
                        });
                        console.log(`[OT] sync_store: ${ordenes.length} OTs, max: ${maxNum}`);
                    }
                }
            } catch (e) {}
        }

        const nextNum = maxNum + 1;
        numeroOrden.value = `OT-${year}-${String(nextNum).padStart(4, '0')}`;
        console.log(`[OT] Correlativo final: OT-${year}-${String(nextNum).padStart(4, '0')}`);
    },

    /**
     * Carga ordenes desde Supabase (fuente unica de verdad)
     */
    loadOrdenes: async function() {
        if (AxonesDB.isReady()) {
            this.ordenes = await AxonesDB.ordenesHelper.cargar();
        } else {
            this.ordenes = [];
            console.warn('[Ordenes] Supabase no disponible');
        }
        this.filteredOrdenes = [...this.ordenes];
    },

    /**
     * Carga inventario desde Supabase y mapea campos a nombres locales
     */
    loadInventario: async function() {
        if (AxonesDB.isReady()) {
            const materialesDB = await AxonesDB.materiales.listar({ ordenar: 'material', ascendente: true });
            // Mapear campos Supabase a nombres locales (igual que inventario.js)
            this.inventario = materialesDB.map(m => ({
                id: m.id,
                material: m.material,
                tipo: m.tipo,
                micras: m.micras,
                ancho: m.ancho,
                kg: m.stock_kg || 0,
                densidad: m.densidad,
                sku: m.sku,
                codigoBarra: m.codigo_barras || '',
                producto: m.notas || '',
                proveedor_id: m.proveedor_id || null
            }));

            // Cargar proveedores para resolver nombres
            try {
                const proveedoresDB = await AxonesDB.proveedores.listar({ ordenar: 'nombre', ascendente: true });
                this.proveedoresMap = {};
                proveedoresDB.forEach(p => {
                    this.proveedoresMap[p.id] = p.nombre;
                });
                // Asignar nombre de proveedor a cada material
                this.inventario.forEach(item => {
                    if (item.proveedor_id && this.proveedoresMap[item.proveedor_id]) {
                        item.proveedor = this.proveedoresMap[item.proveedor_id];
                    }
                });
            } catch (e) {
                console.warn('[Ordenes] Error cargando proveedores:', e.message);
            }

            // Cargar clientes completos para RIF lookup
            try {
                const clientesDB = await AxonesDB.clientes.listar({ ordenar: 'nombre', ascendente: true });
                this.clientesMap = {};
                clientesDB.forEach(c => {
                    this.clientesMap[c.nombre] = c;
                });
            } catch (e) {
                console.warn('[Ordenes] Error cargando clientes para RIF:', e.message);
            }
        } else {
            this.inventario = [];
        }
    },

    /**
     * Configura event listeners
     */
    setupEventListeners: function() {
        // Guardar orden (arriba y abajo)
        const btnGuardar = document.getElementById('btnGuardarOrden');
        if (btnGuardar) {
            btnGuardar.addEventListener('click', () => this.guardarOrden());
        }
        const btnGuardarBottom = document.getElementById('btnGuardarOrdenBottom');
        if (btnGuardarBottom) {
            btnGuardarBottom.addEventListener('click', () => this.guardarOrden());
        }

        // Limpiar formulario
        const btnLimpiar = document.getElementById('btnLimpiar');
        if (btnLimpiar) {
            btnLimpiar.addEventListener('click', () => this.limpiarFormulario());
        }

        // Mostrar/ocultar planchas segun maquina seleccionada
        const maquinaSelect = document.getElementById('maquina');
        if (maquinaSelect) {
            maquinaSelect.addEventListener('change', () => this.togglePlanchas());
        }

        // Desarrollo = Frecuencia × N° Repeticion (automatico)
        const frecuenciaInput = document.getElementById('frecuencia');
        const numRepeticionInput = document.getElementById('numRepeticion');
        if (frecuenciaInput) {
            frecuenciaInput.addEventListener('input', () => this.calcularDesarrollo());
        }
        if (numRepeticionInput) {
            numRepeticionInput.addEventListener('input', () => this.calcularDesarrollo());
        }

        // Ancho Montaje = Ancho Corte × N° Bandas (automatico)
        const anchoCorteMontaje = document.getElementById('anchoCorte');
        const numBandasSelect = document.getElementById('numBandas');
        if (anchoCorteMontaje) {
            anchoCorteMontaje.addEventListener('input', () => this.calcularAnchoMontaje());
        }
        if (numBandasSelect) {
            numBandasSelect.addEventListener('change', () => this.calcularAnchoMontaje());
        }

        // Sincronizar Montaje → Impresion (Piñon y Fig. Embobinado)
        const figEmbMontaje = document.getElementById('figuraEmbobinadoMontaje');
        if (figEmbMontaje) {
            figEmbMontaje.addEventListener('change', () => this.sincronizarMontajeImpresion());
        }

        // Cargar sustratos virgen del inventario
        this.cargarSustratosVirgen();
        this.cargarSustratosVirgenLam();

        // Recargar sustrato virgen al hacer click (por si no cargo al inicio)
        const selectSustrato = document.getElementById('sustratosVirgen');
        if (selectSustrato) {
            selectSustrato.addEventListener('focus', () => {
                if (selectSustrato.options.length <= 1) this.cargarSustratosVirgen();
            });
        }

        // Boton agregar otro sustrato virgen
        document.getElementById('btnAgregarSustratoVirgen')?.addEventListener('click', () => this.agregarSustratoVirgen());

        // Sustratos virgen laminacion
        document.getElementById('btnAgregarSustratoVirgenLam')?.addEventListener('click', () => this.agregarSustratoVirgenLam());
        const selectSustratoLam = document.getElementById('sustratosVirgenLam1');
        if (selectSustratoLam) {
            selectSustratoLam.addEventListener('focus', () => {
                if (selectSustratoLam.options.length <= 1) this.cargarSustratosVirgenLam();
            });
        }

        // Calcular metros cuando cambia sustrato o kg ingresado
        const sustratosSelect = document.getElementById('sustratosVirgen');
        const kgIngresado = document.getElementById('kgIngresadoImp');
        const kgSalida = document.getElementById('kgSalidaImp');
        if (sustratosSelect) {
            sustratosSelect.addEventListener('change', () => this.onSustratoChange());
        }
        // Nota: calcularMetros y calcularMerma eliminados - Merma y Metros son editables manualmente

        // Verificar inventario al seleccionar material
        const tipoMaterial = document.getElementById('tipoMaterial');
        const micrasMaterial = document.getElementById('micrasMaterial');
        const anchoMaterial = document.getElementById('anchoMaterial');
        [tipoMaterial, micrasMaterial, anchoMaterial].forEach(el => {
            if (el) {
                el.addEventListener('change', () => this.verificarInventarioMaterial());
            }
        });

        // Calcular metros estimados cuando cambia pedidoKg
        const pedidoKgInput = document.getElementById('pedidoKg');
        if (pedidoKgInput) {
            pedidoKgInput.addEventListener('input', () => this.calcularMetrosEstimados());
            pedidoKgInput.addEventListener('input', () => this.calcularMaterialesFichaTecnica());
        }

        // FICHA TECNICA - Event listeners
        this.setupFichaTecnicaEvents();

        // Nota: calcularMetrosBobina eliminado - metros/bobina se escribe manualmente

        // Ancho Corte Final -> Ancho Core auto-sync
        const anchoCorteFinalInput = document.getElementById('anchoCorteFinal');
        if (anchoCorteFinalInput) {
            anchoCorteFinalInput.addEventListener('input', () => {
                const anchoCorteVal = anchoCorteFinalInput.value;
                const anchoCoreInput = document.getElementById('anchoCore');
                if (anchoCoreInput && !anchoCoreInput.dataset.manual) {
                    // Extraer solo el numero (puede tener ±0)
                    const num = parseFloat(anchoCorteVal.replace(/[^\d.,]/g, '').replace(',', '.')) || '';
                    anchoCoreInput.value = num;
                }
            });
        }
        // Marcar anchoCore como manual si el usuario lo edita directamente
        const anchoCoreInput = document.getElementById('anchoCore');
        if (anchoCoreInput) {
            anchoCoreInput.addEventListener('focus', () => { anchoCoreInput.dataset.manual = '1'; });
        }

        // Figura Embobinado visual preview (Area Corte)
        const figEmbCorte = document.getElementById('orientacionEmbalaje');
        if (figEmbCorte) {
            figEmbCorte.addEventListener('change', () => this.renderFiguraEmbobinadoPreview('orientacionEmbalaje', 'figuraEmbobinadoPreview'));
        }

        // Figura Embobinado visual preview (Area Montaje)
        const figEmbMontajeEl = document.getElementById('figuraEmbobinadoMontaje');
        if (figEmbMontajeEl) {
            figEmbMontajeEl.addEventListener('change', () => this.renderFiguraEmbobinadoPreview('figuraEmbobinadoMontaje', 'figuraEmbobinadoMontajePreview'));
        }

        // Kg Ingresados Corte auto-fill from pedidoKg
        const pedidoKgForCorte = document.getElementById('pedidoKg');
        if (pedidoKgForCorte) {
            pedidoKgForCorte.addEventListener('input', () => {
                const kgIng = document.getElementById('kgIngresadosCorte');
                if (kgIng) kgIng.value = pedidoKgForCorte.value;
            });
        }

        // Kg Merma Corte = Ingresados - Salida
        const kgSalidaCorteInput = document.getElementById('kgSalidaCorte');
        if (kgSalidaCorteInput) {
            kgSalidaCorteInput.addEventListener('input', () => {
                const ingresados = parseFloat(document.getElementById('kgIngresadosCorte')?.value) || 0;
                const salida = parseFloat(kgSalidaCorteInput.value) || 0;
                const mermaEl = document.getElementById('kgMermaCorte');
                if (mermaEl && ingresados > 0) {
                    const merma = ingresados - salida;
                    const pct = ((merma / ingresados) * 100).toFixed(1);
                    mermaEl.value = merma.toFixed(1) + ' / ' + pct + '%';
                }
            });
        }

        // Cliente RIF auto-fill (ahora es input editable, usar blur para detectar cambio)
        const clienteInput = document.getElementById('cliente');
        if (clienteInput) {
            clienteInput.addEventListener('blur', () => this.cargarDatosCliente());
            clienteInput.addEventListener('input', () => {
                // Limpiar RIF si cambia el cliente (se llenara al perder foco)
                const rifInput = document.getElementById('clienteRif');
                if (rifInput) rifInput.value = '';
            });
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

        // Crear nuevo producto
        const btnGuardarNuevoProducto = document.getElementById('btnGuardarNuevoProducto');
        if (btnGuardarNuevoProducto) {
            btnGuardarNuevoProducto.addEventListener('click', () => this.crearNuevoProducto());
        }

        // Estructura del material: logica de tipo impresion
        const estructuraRevSelect = document.getElementById('estructuraMaterialRev');
        if (estructuraRevSelect) {
            estructuraRevSelect.addEventListener('change', () => {
                const detalle = document.getElementById('estructuraMaterialRevDetalle');
                if (detalle) detalle.style.display = estructuraRevSelect.value === 'otro' ? '' : 'none';
                this.actualizarEstructuraMaterial();
            });
        }
        const estructuraSup = document.getElementById('estructuraMaterialSup');
        if (estructuraSup) {
            estructuraSup.addEventListener('input', () => this.actualizarEstructuraMaterial());
        }
        const estructuraRevDetalle = document.getElementById('estructuraMaterialRevDetalle');
        if (estructuraRevDetalle) {
            estructuraRevDetalle.addEventListener('input', () => this.actualizarEstructuraMaterial());
        }
    },

    /**
     * Genera la estructura del material leyendo la ficha tecnica
     * Formato: "BOPP NORMAL 560 X 25 µ (430 Kg) + CAST 560 X 25 µ (430 Kg)"
     */
    /**
     * Muestra/oculta campos segun tipo de impresion seleccionado
     */
    onTipoImpresionEstructura: function() {
        const tipo = document.getElementById('tipoImpresionEstructura')?.value;
        const supDiv = document.getElementById('estructuraSuperficie');
        const revDiv = document.getElementById('estructuraReverso');

        if (supDiv) supDiv.style.display = tipo === 'superficie' ? '' : 'none';
        if (revDiv) revDiv.style.display = tipo === 'reverso' ? '' : 'none';

        // Laminacion: si es superficie no aplica -> gris
        const seccionesLam = document.querySelectorAll('[data-seccion="laminacion"]');
        seccionesLam.forEach(el => {
            if (tipo === 'superficie') {
                el.style.opacity = '0.4';
                el.style.pointerEvents = 'none';
                el.title = 'No aplica para impresion de superficie';
            } else {
                el.style.opacity = '1';
                el.style.pointerEvents = '';
                el.title = '';
            }
        });

        this.actualizarEstructuraMaterial();
    },

    actualizarEstructuraMaterial: function() {
        const tipo = document.getElementById('tipoImpresionEstructura')?.value;
        const hidden = document.getElementById('estructuraMaterial');
        if (!hidden) return;

        if (tipo === 'superficie') {
            hidden.value = document.getElementById('estructuraCapa1')?.value || '';
        } else if (tipo === 'reverso') {
            const c1 = document.getElementById('estructuraCapa1Rev')?.value || '';
            const c2 = document.getElementById('estructuraCapa2Rev')?.value || '';
            const c3 = document.getElementById('estructuraCapa3Rev')?.value || '';
            const capas = [c1, c2, c3].filter(Boolean);
            hidden.value = capas.join(' + ');
        } else {
            hidden.value = '';
        }
    },

    generarEstructuraDesdeFichaTecnica: function() {
        const capas = [];

        // Capa 1
        const tipo1 = document.getElementById('fichaTipoMat1')?.value;
        if (tipo1) {
            const ancho1 = document.getElementById('fichaAncho1')?.value || '';
            const micras1 = document.getElementById('fichaMicras1')?.value || '';
            const kg1 = document.getElementById('fichaKg1')?.value || '';
            const partes = [tipo1];
            if (ancho1) partes.push(`${ancho1} X`);
            if (micras1) partes.push(`${micras1} µ`);
            let linea = partes.join(' ');
            if (kg1) linea += ` (${parseFloat(kg1).toFixed(0)} Kg)`;
            capas.push(linea);
        }

        // Adhesivo (solo si tiene tipo)
        const adhesivo = document.getElementById('fichaTipoAdhesivo')?.value;
        const kgAdh = document.getElementById('fichaKgAdhesivo')?.value || '';
        if (adhesivo) {
            let lineaAdh = `+ Adhesivo ${adhesivo}`;
            if (kgAdh) lineaAdh += ` (${parseFloat(kgAdh).toFixed(1)} Kg)`;
            capas.push(lineaAdh);
        }

        // Capa 2
        const tipo2 = document.getElementById('fichaTipoMat2')?.value;
        if (tipo2) {
            const ancho2 = document.getElementById('fichaAncho2')?.value || '';
            const micras2 = document.getElementById('fichaMicras2')?.value || '';
            const kg2 = document.getElementById('fichaKg2')?.value || '';
            const partes = [tipo2];
            if (ancho2) partes.push(`${ancho2} X`);
            if (micras2) partes.push(`${micras2} µ`);
            let linea = partes.join(' ');
            if (kg2) linea += ` (${parseFloat(kg2).toFixed(0)} Kg)`;
            capas.push('+ ' + linea);
        }

        // Capas adicionales (3+)
        for (let i = 3; i <= 10; i++) {
            const tipo = document.getElementById(`fichaTipoMat${i}`)?.value;
            if (tipo) {
                const ancho = document.getElementById(`fichaAncho${i}`)?.value || '';
                const micras = document.getElementById(`fichaMicras${i}`)?.value || '';
                const kg = document.getElementById(`fichaKg${i}`)?.value || '';
                const partes = [tipo];
                if (ancho) partes.push(`${ancho} X`);
                if (micras) partes.push(`${micras} µ`);
                let linea = partes.join(' ');
                if (kg) linea += ` (${parseFloat(kg).toFixed(0)} Kg)`;
                capas.push('+ ' + linea);
            }
        }

        if (capas.length === 0) {
            alert('Primero llena la Ficha Tecnica (Capa 1, Capa 2, etc.)');
            return;
        }

        const estructuraTxt = capas.join('\n');
        const input = document.getElementById('estructuraMaterial');
        if (input) input.value = estructuraTxt;
    },

    /**
     * Muestra/oculta campo de planchas segun maquina
     */
    togglePlanchas: function() {
        const maquina = document.getElementById('maquina')?.value || '';
        const planchasContainer = document.getElementById('planchasContainer');
        if (planchasContainer) {
            // Mostrar planchas solo para maquinas COMEXI
            if (maquina.toUpperCase().includes('COMEXI')) {
                planchasContainer.style.display = 'block';
            } else {
                planchasContainer.style.display = 'none';
                document.getElementById('planchas').value = '';
            }
        }
    },

    /**
     * Calcula Desarrollo = Frecuencia × N° Repeticion
     * Luego recalcula Piñon en cascada y sincroniza con Impresion
     */
    calcularDesarrollo: function() {
        const frecuenciaRaw = document.getElementById('frecuencia')?.value || '';
        // Extraer solo el numero de frecuencia (puede tener ±2 al final)
        const frecuencia = parseFloat(frecuenciaRaw.replace(/[^\d.,]/g, '').replace(',', '.')) || 0;
        const numRepeticion = parseFloat(document.getElementById('numRepeticion')?.value) || 0;
        const desarrolloInput = document.getElementById('desarrollo');

        if (desarrolloInput && frecuencia > 0 && numRepeticion > 0) {
            const desarrollo = frecuencia * numRepeticion;
            desarrolloInput.value = desarrollo;
        } else if (desarrolloInput) {
            desarrolloInput.value = '';
        }

        // Cascada: recalcular Piñon
        this.calcularPinon();
    },

    /**
     * Calcula Ancho Montaje = Ancho Corte × N° Bandas
     */
    calcularAnchoMontaje: function() {
        const anchoCorteRaw = document.getElementById('anchoCorte')?.value || '';
        // Extraer solo el numero (puede tener ±2 al final)
        const anchoCorte = parseFloat(anchoCorteRaw.replace(/[^\d.,]/g, '').replace(',', '.')) || 0;
        const numBandas = parseFloat(document.getElementById('numBandas')?.value) || 0;
        const anchoMontajeInput = document.getElementById('anchoMontaje');

        if (anchoMontajeInput && anchoCorte > 0 && numBandas > 0) {
            anchoMontajeInput.value = anchoCorte * numBandas;
        } else if (anchoMontajeInput) {
            anchoMontajeInput.value = '';
        }
    },

    /**
     * Sincroniza datos de Montaje hacia Area de Impresion
     * - Piñon (Montaje) → Piñon Imp (display)
     * - Figura Embobinado (Montaje) → Fig. Emb. Imp (display)
     */
    sincronizarMontajeImpresion: function() {
        // Piñon (sí se sincroniza, es el mismo valor)
        const pinon = document.getElementById('pinon')?.value || '';
        const pinonImp = document.getElementById('pinonImpDisplay');
        if (pinonImp) pinonImp.value = pinon;

        // Figura Embobinado: NO sincronizar - puede ser distinta entre montaje
        // e impresion segun feedback de operadora (Roxana 16/04/2026).
        // El operador define la figura de impresion manualmente en el area de Impresion.
    },

    /**
     * Calcula pinon automaticamente (desarrollo / 5)
     * Luego sincroniza con Impresion
     */
    calcularPinon: function() {
        const desarrollo = parseFloat(document.getElementById('desarrollo')?.value) || 0;
        const pinonInput = document.getElementById('pinon');
        if (pinonInput && desarrollo > 0) {
            pinonInput.value = Math.round(desarrollo / 5);
        } else if (pinonInput) {
            pinonInput.value = '';
        }

        // Sincronizar con Impresion
        this.sincronizarMontajeImpresion();
    },

    /**
     * Carga sustratos virgen desde el inventario
     */
    _sustratoCount: 1,

    agregarSustratoVirgen: function() {
        this._sustratoCount++;
        const n = this._sustratoCount;
        const container = document.getElementById('contenedorSustratosVirgen');
        if (!container) return;

        // Copiar opciones del primer select
        const primerSelect = document.getElementById('sustratosVirgen');
        const opciones = primerSelect ? primerSelect.innerHTML : '<option value="">Seleccionar...</option>';

        const div = document.createElement('div');
        div.className = 'ot-grid';
        div.style.gridTemplateColumns = '3fr 1fr auto';
        div.dataset.sustrato = n;
        div.innerHTML = `
            <div class="ot-field">
                <label class="form-label">Sustrato ${n}</label>
                <select class="form-select form-select-sm sustrato-select">${opciones}</select>
            </div>
            <div class="ot-field">
                <label class="form-label">Kg a utilizar</label>
                <input type="text" class="form-control form-control-sm" placeholder="Kg">
            </div>
            <div class="ot-field" style="align-self: end;">
                <button type="button" class="btn btn-sm btn-outline-danger" onclick="this.closest('[data-sustrato]').remove()"><i class="bi bi-x"></i></button>
            </div>
        `;

        // Recargar opciones al hacer focus
        const newSelect = div.querySelector('select');
        if (newSelect) {
            newSelect.addEventListener('focus', () => {
                if (newSelect.options.length <= 1 && primerSelect) {
                    newSelect.innerHTML = primerSelect.innerHTML;
                }
            });
        }

        container.appendChild(div);
    },

    _sustratoLamCount: 1,

    agregarSustratoVirgenLam: async function() {
        this._sustratoLamCount++;
        const n = this._sustratoLamCount;
        const container = document.getElementById('contenedorSustratosVirgenLam');
        if (!container) return;

        // Asegurar que el inventario esta cargado
        await this.cargarSustratosVirgenLam();
        const primerSelect = document.getElementById('sustratosVirgenLam1');
        const opciones = primerSelect ? primerSelect.innerHTML : '<option value="">Seleccionar...</option>';

        const div = document.createElement('div');
        div.className = 'row g-2 mb-2';
        div.dataset.sustratoLam = n;
        div.innerHTML = `
            <div class="col-md-7">
                <label class="form-label small">Sustrato ${n}</label>
                <select class="form-select form-select-sm sustrato-select-lam">${opciones}</select>
            </div>
            <div class="col-md-3">
                <label class="form-label small">Kg a utilizar</label>
                <input type="text" class="form-control form-control-sm" placeholder="Kg">
            </div>
            <div class="col-md-2 d-flex align-items-end">
                <button type="button" class="btn btn-sm btn-outline-danger" onclick="this.closest('[data-sustrato-lam]').remove()"><i class="bi bi-x"></i> Quitar</button>
            </div>
        `;
        container.appendChild(div);
    },

    cargarSustratosVirgenLam: async function() {
        const select = document.getElementById('sustratosVirgenLam1');
        if (!select || select.options.length > 1) return;

        select.innerHTML = '<option value="">Cargando...</option>';

        // Cargar inventario si no está cargado
        let inventario = this.inventario || [];
        if (inventario.length === 0 && typeof AxonesDB !== 'undefined' && AxonesDB.isReady()) {
            try {
                const materialesDB = await AxonesDB.materiales.listar({ ordenar: 'material', ascendente: true });
                inventario = materialesDB.map(m => ({
                    id: m.id, material: m.material, micras: m.micras, ancho: m.ancho,
                    kg: m.stock_kg || 0, sku: m.sku
                }));
                this.inventario = inventario;
            } catch (e) {}
        }

        select.innerHTML = '<option value="">Seleccionar del inventario...</option>';
        inventario.forEach(item => {
            if (item.material) {
                const option = document.createElement('option');
                option.value = JSON.stringify({ sku: item.sku || item.id, material: item.material, ancho: item.ancho, micraje: item.micras, kg: item.kg });
                option.textContent = `${item.sku || ''} - ${item.material} ${item.ancho}mm x ${item.micras}mic (${item.kg || 0} kg)`;
                select.appendChild(option);
            }
        });
    },

    cargarSustratosVirgen: async function() {
        const select = document.getElementById('sustratosVirgen');
        if (!select) return;

        select.innerHTML = '<option value="">Cargando inventario...</option>';

        // Si inventario local vacio, cargar directo de Supabase
        let inventario = this.inventario || [];
        if (inventario.length === 0 && typeof AxonesDB !== 'undefined' && AxonesDB.isReady()) {
            try {
                const materialesDB = await AxonesDB.materiales.listar({ ordenar: 'material', ascendente: true });
                inventario = materialesDB.map(m => ({
                    id: m.id, material: m.material, micras: m.micras, ancho: m.ancho,
                    kg: m.stock_kg || 0, sku: m.sku, densidad: m.densidad
                }));
                this.inventario = inventario;
            } catch (e) { console.warn('[OT] Error cargando inventario para sustrato:', e); }
        }

        select.innerHTML = '<option value="">Seleccionar del inventario...</option>';

        // Filtrar solo sustratos y agregar al select
        inventario.forEach(item => {
            if (item.tipo === 'sustrato' || item.categoria === 'sustratos' || item.material) {
                const option = document.createElement('option');
                const ancho = item.ancho || item.anchoMm || '';
                const micraje = item.micraje || item.micras || '';
                const material = item.material || item.nombre || '';
                const sku = item.sku || item.codigo || item.id || '';

                option.value = JSON.stringify({
                    sku: sku,
                    ancho: parseFloat(ancho) || 0,
                    micraje: parseFloat(micraje) || 0,
                    material: material,
                    kg: parseFloat(item.kg) || 0
                });
                option.textContent = `${sku} - ${material} ${ancho}mm x ${micraje}mic (${item.kg || 0} kg)`;
                select.appendChild(option);
            }
        });

        // Si no hay sustratos, mostrar mensaje
        if (select.options.length === 1) {
            const option = document.createElement('option');
            option.value = '';
            option.textContent = '-- No hay sustratos en inventario --';
            option.disabled = true;
            select.appendChild(option);
        }
    },

    /**
     * Maneja cambio de sustrato seleccionado
     */
    onSustratoChange: function() {
        const select = document.getElementById('sustratosVirgen');
        const infoSpan = document.getElementById('sustratosVirgenInfo');
        if (!select || !select.value) {
            if (infoSpan) infoSpan.textContent = '';
            return;
        }

        try {
            const data = JSON.parse(select.value);

            // Guardar datos en campos ocultos para calculos
            document.getElementById('sustratosVirgenAncho').value = data.ancho;
            document.getElementById('sustratosVirgenMicraje').value = data.micraje;
            document.getElementById('sustratosVirgenTipo').value = data.material;

            // Determinar densidad segun material
            const densidad = this.obtenerDensidadMaterial(data.material);
            document.getElementById('sustratosVirgenDensidad').value = densidad;

            // Mostrar info
            if (infoSpan) {
                infoSpan.textContent = `Ancho: ${data.ancho}mm | Micraje: ${data.micraje} | Densidad: ${densidad}`;
            }

            // Calcular metros si hay kg ingresado
            this.calcularMetros();
        } catch (e) {
            console.warn('Error parseando sustrato:', e);
        }
    },

    /**
     * Obtiene densidad segun tipo de material
     */
    obtenerDensidadMaterial: function(material) {
        const mat = (material || '').toUpperCase();
        if (mat.includes('BOPP') || mat.includes('OPP')) {
            if (mat.includes('PERLADO')) return 0.80;
            return 0.90;
        }
        if (mat.includes('PE') || mat.includes('PEBD') || mat.includes('PEAD')) {
            return 0.93;
        }
        if (mat.includes('PET')) return 1.38;
        if (mat.includes('PA') || mat.includes('NYLON')) return 1.14;
        if (mat.includes('CAST')) return 0.92;
        // Default para otros materiales
        return 0.90;
    },

    /**
     * Calcula metros segun formula:
     * Gramaje (g/m lineal) = Ancho(m) x Micras x Densidad
     * Metros = Kg x 1000 / Gramaje
     *
     * Ejemplo: BOPP 20µ x 610mm, 1000kg
     * Gramaje = 0.61 x 20 x 0.90 = 10.98 g/m
     * Metros = 1000 x 1000 / 10.98 = 91,074 metros
     */
    calcularMetros: function() {
        const kgIngresado = parseFloat(document.getElementById('kgIngresadoImp')?.value) || 0;
        const ancho = parseFloat(document.getElementById('sustratosVirgenAncho')?.value) ||
                      parseFloat(document.getElementById('anchoMaterial')?.value) || 0;
        const micraje = parseFloat(document.getElementById('sustratosVirgenMicraje')?.value) ||
                        parseFloat(document.getElementById('micrasMaterial')?.value) || 0;
        const densidad = parseFloat(document.getElementById('sustratosVirgenDensidad')?.value) || 0.90;

        const metrosInput = document.getElementById('metrosImp');
        if (!metrosInput || kgIngresado <= 0 || ancho <= 0 || micraje <= 0) {
            if (metrosInput) metrosInput.value = '';
            return;
        }

        // Convertir ancho a metros (viene en mm)
        const anchoM = ancho / 1000;

        // Calcular gramaje (gramos por metro lineal)
        const gramaje = anchoM * micraje * densidad;

        // Calcular metros: Kg * 1000 (convertir a gramos) / gramaje
        const metros = (kgIngresado * 1000) / gramaje;

        metrosInput.value = metros.toFixed(2);
    },

    /**
     * Calcula metros ESTIMADOS basado en pedidoKg (para planificacion)
     * Se ejecuta cuando se selecciona producto o cambia pedidoKg
     */
    calcularMetrosEstimados: function() {
        const pedidoKg = parseFloat(document.getElementById('pedidoKg')?.value) || 0;
        const ancho = parseFloat(document.getElementById('anchoMaterial')?.value) || 0;
        const micraje = parseFloat(document.getElementById('micrasMaterial')?.value) || 0;
        const densidad = parseFloat(document.getElementById('sustratosVirgenDensidad')?.value) || 0.90;

        // Mostrar en campo de metros estimados si existe, o en un span informativo
        let metrosEstimadosEl = document.getElementById('metrosEstimados');

        if (pedidoKg <= 0 || ancho <= 0 || micraje <= 0) {
            if (metrosEstimadosEl) metrosEstimadosEl.textContent = '-';
            return;
        }

        // Convertir ancho a metros
        const anchoM = ancho / 1000;

        // Calcular gramaje (g/m lineal)
        const gramaje = anchoM * micraje * densidad;

        // Calcular metros estimados
        const metrosEstimados = (pedidoKg * 1000) / gramaje;

        if (metrosEstimadosEl) {
            metrosEstimadosEl.textContent = metrosEstimados.toLocaleString('es-VE', { maximumFractionDigits: 0 }) + ' m';
        }

        console.log(`Metros estimados: ${pedidoKg}Kg / (${anchoM}m x ${micraje}µ x ${densidad}) = ${metrosEstimados.toFixed(0)} metros`);
    },

    /**
     * Configura eventos de la Ficha Tecnica
     */
    setupFichaTecnicaEvents: function() {
        // Boton calcular materiales
        const btnCalcular = document.getElementById('btnCalcularMateriales');
        if (btnCalcular) {
            btnCalcular.addEventListener('click', () => this.calcularMaterialesFichaTecnica());
        }

        // Auto-asignar densidad cuando cambia tipo de material
        const tipoMat1 = document.getElementById('fichaTipoMat1');
        const tipoMat2 = document.getElementById('fichaTipoMat2');

        if (tipoMat1) {
            tipoMat1.addEventListener('change', () => {
                this.cargarSkusPorTipo('fichaSku1', tipoMat1.value);
            });
            // Tambien escuchar input para datalist
            tipoMat1.addEventListener('input', () => {
                this.cargarSkusPorTipo('fichaSku1', tipoMat1.value);
            });
        }

        if (tipoMat2) {
            tipoMat2.addEventListener('change', () => {
                this.cargarSkusPorTipo('fichaSku2', tipoMat2.value);
            });
            tipoMat2.addEventListener('input', () => {
                this.cargarSkusPorTipo('fichaSku2', tipoMat2.value);
            });
        }

        // SKU es solo para seleccionar del inventario (no pre-llena otros campos)

        // Recalcular cuando cambian los valores
        ['fichaMicras1', 'fichaMicras2', 'fichaAncho1', 'fichaAncho2', 'fichaGramajeAdhesivo', 'fichaGramajeAdhesivoHasta', 'fichaRelacionCatalizador'].forEach(id => {
            const el = document.getElementById(id);
            if (el) {
                el.addEventListener('input', () => this.calcularMaterialesFichaTecnica());
                el.addEventListener('change', () => this.calcularMaterialesFichaTecnica());
            }
        });

        // Boton agregar capa adicional
        this.capasAdicionalesCount = 0;
        const btnAgregarCapa = document.getElementById('btnAgregarCapa');
        if (btnAgregarCapa) {
            btnAgregarCapa.addEventListener('click', () => this.agregarCapaAdicional());
        }
    },

    /**
     * Agrega una capa adicional (3, 4, 5...) dinamicamente
     */
    agregarCapaAdicional: function() {
        this.capasAdicionalesCount++;
        const numCapa = this.capasAdicionalesCount + 2; // Capa 3, 4, 5...
        const container = document.getElementById('capasAdicionalesContainer');
        if (!container) return;

        const capaDiv = document.createElement('div');
        capaDiv.className = 'row g-2 mt-2';
        capaDiv.id = `fichaCapaExtra${numCapa}`;

        const colores = ['info', 'secondary', 'dark', 'danger'];
        const color = colores[(numCapa - 3) % colores.length];

        capaDiv.innerHTML = `
            <div class="col-12">
                <label class="form-label fw-bold text-${color}">
                    <i class="bi bi-${numCapa}-circle me-1"></i>Capa ${numCapa} - Material Adicional
                    <button type="button" class="btn btn-outline-danger btn-sm ms-2 py-0 px-1" onclick="OrdenesModule.eliminarCapaAdicional(${numCapa})" title="Eliminar capa">
                        <i class="bi bi-x-lg"></i>
                    </button>
                </label>
            </div>
            <div class="col-md-3">
                <label class="form-label">Tipo Material Capa ${numCapa}</label>
                <select class="form-select form-select-sm" id="fichaTipoMat${numCapa}">
                    <option value="">Seleccionar...</option>
                    <option value="BOPP NORMAL">BOPP NORMAL</option>
                    <option value="BOPP MATE">BOPP MATE</option>
                    <option value="BOPP PASTA">BOPP PASTA</option>
                    <option value="BOPP PERLADO">BOPP PERLADO</option>
                    <option value="CAST">CAST</option>
                    <option value="PEBD">PEBD</option>
                    <option value="PEBD PIGMENT">PEBD PIGMENT</option>
                    <option value="POLIETILENO">POLIETILENO (PB)</option>
                    <option value="PERLADO">PERLADO</option>
                    <option value="METAL">METAL</option>
                    <option value="PET">PET</option>
                    <option value="PA">PA (Nylon)</option>
                </select>
            </div>
            <div class="col-md-2">
                <label class="form-label">Micras Capa ${numCapa}</label>
                <input type="number" class="form-control form-control-sm" id="fichaMicras${numCapa}" step="0.1" placeholder="ej: 25">
            </div>
            <div class="col-md-2">
                <label class="form-label">Ancho Bobina (mm)</label>
                <input type="number" class="form-control form-control-sm" id="fichaAncho${numCapa}" step="1" placeholder="ej: 660">
            </div>
            <div class="col-md-1">
                <label class="form-label">Densidad</label>
                <input type="number" class="form-control form-control-sm" id="fichaDensidad${numCapa}" step="0.01" value="0.93" readonly style="background-color: #e9ecef;">
            </div>
            <div class="col-md-2">
                <label class="form-label">Kg Necesarios</label>
                <input type="number" class="form-control form-control-sm" id="fichaKg${numCapa}" style="background-color: #e0f7fa; font-weight: bold;">
            </div>
            <div class="col-md-3">
                <label class="form-label">SKU del Inventario</label>
                <select class="form-select form-select-sm" id="fichaSku${numCapa}">
                    <option value="">Buscar en inventario...</option>
                </select>
            </div>
        `;

        container.appendChild(capaDiv);

        // Eventos para la nueva capa
        const tipoMatSelect = document.getElementById(`fichaTipoMat${numCapa}`);
        if (tipoMatSelect) {
            tipoMatSelect.addEventListener('change', () => {
                const densidad = this.DENSIDADES[tipoMatSelect.value] || 0.93;
                const densidadInput = document.getElementById(`fichaDensidad${numCapa}`);
                if (densidadInput) densidadInput.value = densidad;
                this.cargarSkusPorTipo(`fichaSku${numCapa}`, tipoMatSelect.value);
                this.calcularMaterialesFichaTecnica();
            });
        }

        const micrasInput = document.getElementById(`fichaMicras${numCapa}`);
        if (micrasInput) {
            micrasInput.addEventListener('input', () => this.calcularMaterialesFichaTecnica());
        }

        const anchoInput = document.getElementById(`fichaAncho${numCapa}`);
        if (anchoInput) {
            anchoInput.addEventListener('input', () => this.calcularMaterialesFichaTecnica());
        }
    },

    /**
     * Elimina una capa adicional
     */
    eliminarCapaAdicional: function(numCapa) {
        const capaDiv = document.getElementById(`fichaCapaExtra${numCapa}`);
        if (capaDiv) {
            capaDiv.remove();
            this.calcularMaterialesFichaTecnica();
        }
    },

    /**
     * Carga SKUs del inventario filtrados por tipo de material
     */
    cargarSkusPorTipo: function(selectId, tipoMaterial) {
        const select = document.getElementById(selectId);
        if (!select || !tipoMaterial) return;

        // Limpiar opciones
        select.innerHTML = '<option value="">Buscar en inventario...</option>';

        // Filtrar inventario por tipo
        const filtrados = this.inventario.filter(item => {
            const tipo = item.tipo || item.material || '';
            return tipo.toUpperCase().includes(tipoMaterial.toUpperCase().split(' ')[0]);
        });

        filtrados.forEach(item => {
            const option = document.createElement('option');
            option.value = item.sku || item.id;
            option.textContent = `${item.sku || ''} - ${item.micras}µ x ${item.ancho}mm (${item.kg || 0}kg)`;
            option.dataset.kg = item.kg || 0;
            option.dataset.ancho = item.ancho;
            option.dataset.micras = item.micras;
            select.appendChild(option);
        });
    },

    /**
     * Calcula los kg necesarios de cada material basado en los kg pedidos
     * Formula:
     * - metrosTotales = kgProductoFinal / gramajeTotal
     * - kgCapa = metrosTotales * gramajeCapa / 1000
     */
    calcularMaterialesFichaTecnica: function() {
        const pedidoKg = parseFloat(document.getElementById('pedidoKg')?.value) || 0;

        // Ancho del producto laminado (anchoMontaje es el ancho comun de todas las capas durante laminacion)
        const anchoMontajeMm = parseFloat(document.getElementById('anchoMontaje')?.value) ||
                               parseFloat(document.getElementById('anchoMaterial')?.value) || 0;

        // Datos capa 1 - con ancho propio de bobina
        const micras1 = parseFloat(document.getElementById('fichaMicras1')?.value) || 0;
        const densidad1 = parseFloat(document.getElementById('fichaDensidad1')?.value) || 0.90;
        const anchoCapa1Mm = parseFloat(document.getElementById('fichaAncho1')?.value) || anchoMontajeMm;

        // Datos capa 2 - con ancho propio de bobina
        const micras2 = parseFloat(document.getElementById('fichaMicras2')?.value) || 0;
        const densidad2 = parseFloat(document.getElementById('fichaDensidad2')?.value) || 0.93;
        const anchoCapa2Mm = parseFloat(document.getElementById('fichaAncho2')?.value) || anchoMontajeMm;

        // Datos adhesivo - soporte para rango (desde/hasta)
        const gramajeAdhDesde = parseFloat(document.getElementById('fichaGramajeAdhesivo')?.value?.toString().replace(',', '.')) || 0;
        const gramajeAdhHasta = parseFloat(document.getElementById('fichaGramajeAdhesivoHasta')?.value?.toString().replace(',', '.')) || gramajeAdhDesde;
        const gramajeAdhesivo = gramajeAdhHasta > gramajeAdhDesde ? (gramajeAdhDesde + gramajeAdhHasta) / 2 : gramajeAdhDesde;
        const relacionCatalizador = parseFloat(document.getElementById('fichaRelacionCatalizador')?.value) || 0;

        // Actualizar indicador de kg pedidos
        const kgPedidoEl = document.getElementById('fichaKgPedido');
        if (kgPedidoEl) kgPedidoEl.textContent = pedidoKg.toLocaleString('es-VE');

        if (pedidoKg <= 0) {
            this.limpiarCalculosFicha();
            return;
        }

        // Necesitamos al menos un ancho para calcular
        if (anchoMontajeMm <= 0 && anchoCapa1Mm <= 0) {
            this.limpiarCalculosFicha();
            return;
        }

        // ============================================================
        // LOGICA DE CALCULO:
        // 1. pedidoKg = peso PRODUCTO TERMINADO (todas las capas juntas)
        // 2. Calcular gramajeTotal al ancho de laminacion (anchoMontaje)
        // 3. metros = pedidoKg * 1000 / gramajeTotal
        // 4. Cada capa calcula Kg a su propio ancho de bobina (puede ser mayor)
        // ============================================================

        const anchoCapa1M = anchoCapa1Mm / 1000;
        const anchoCapa2M = anchoCapa2Mm / 1000;
        // Ancho de laminacion: es el ancho del producto final (anchoMontaje)
        const anchoLamMm = anchoMontajeMm > 0 ? anchoMontajeMm : Math.min(anchoCapa1Mm, anchoCapa2Mm || anchoCapa1Mm);
        const anchoLamM = anchoLamMm / 1000;

        // Gramajes al ancho de LAMINACION (para calcular metros del producto final)
        const gramajeCapa1Lam = micras1 > 0 ? anchoLamM * micras1 * densidad1 : 0;
        const gramajeCapa2Lam = micras2 > 0 ? anchoLamM * micras2 * densidad2 : 0;
        const gramajeAdhLam = gramajeAdhesivo > 0 ? anchoLamM * gramajeAdhesivo : 0;

        const gramajeTotalLam = gramajeCapa1Lam + gramajeCapa2Lam + gramajeAdhLam;

        if (gramajeTotalLam <= 0) {
            this.limpiarCalculosFicha();
            return;
        }

        // Metros del producto terminado
        const metrosTotales = (pedidoKg * 1000) / gramajeTotalLam;

        // Kg de cada capa a su ANCHO DE BOBINA real (puede ser mas ancha que el laminado)
        const gramajeCapa1Bob = micras1 > 0 ? anchoCapa1M * micras1 * densidad1 : 0;
        const kgCapa1 = gramajeCapa1Bob > 0 ? (metrosTotales * gramajeCapa1Bob) / 1000 : 0;

        const gramajeCapa2Bob = micras2 > 0 ? anchoCapa2M * micras2 * densidad2 : 0;
        const kgCapa2 = gramajeCapa2Bob > 0 ? (metrosTotales * gramajeCapa2Bob) / 1000 : 0;

        // Adhesivo: aplicado al ancho de laminacion
        const gramajeAdhesivoLineal = gramajeAdhLam;
        const totalMezclaAdhesivo = gramajeAdhesivoLineal > 0 ? (metrosTotales * gramajeAdhesivoLineal) / 1000 : 0;

        // Separar mezcla en adhesivo base y catalizador
        let kgAdhesivo, kgCatalizador;
        if (relacionCatalizador > 0 && totalMezclaAdhesivo > 0) {
            const partesBase = relacionCatalizador;
            const partesCat = 1;
            const totalPartes = partesBase + partesCat;
            kgAdhesivo = totalMezclaAdhesivo * partesBase / totalPartes;
            kgCatalizador = totalMezclaAdhesivo * partesCat / totalPartes;
        } else {
            kgAdhesivo = totalMezclaAdhesivo;
            kgCatalizador = 0;
        }

        // Capas adicionales (3, 4, 5...)
        const capasExtraData = [];
        for (let i = 3; i <= 10; i++) {
            const micrasEl = document.getElementById(`fichaMicras${i}`);
            const densidadEl = document.getElementById(`fichaDensidad${i}`);
            const anchoEl = document.getElementById(`fichaAncho${i}`);
            if (micrasEl && micrasEl.closest('#capasAdicionalesContainer')) {
                const micras = parseFloat(micrasEl.value) || 0;
                const densidad = parseFloat(densidadEl?.value) || 0.93;
                const anchoCapa = parseFloat(anchoEl?.value) || anchoCapa2Mm || anchoMontajeMm;
                const anchoCapaM = anchoCapa / 1000;
                const gramaje = micras > 0 ? anchoCapaM * micras * densidad : 0;
                const kgCapa = gramaje > 0 ? (metrosTotales * gramaje) / 1000 : 0;
                capasExtraData.push({ num: i, gramaje, micras, kgCapa });
            }
        }

        // Solo actualizar campos que NO tienen valor manual
        // Si el usuario ya escribio un valor, respetarlo
        this.actualizarCampoSiVacio('fichaKg1', kgCapa1.toFixed(2));
        this.actualizarCampoSiVacio('fichaKg2', kgCapa2.toFixed(2));
        this.actualizarCampoSiVacio('fichaKgAdhesivo', kgAdhesivo.toFixed(2));
        this.actualizarCampoSiVacio('fichaKgCatalizador', kgCatalizador.toFixed(2));

        // Leer valores finales (pueden ser los manuales o los calculados)
        const kgCapa1Final = parseFloat(document.getElementById('fichaKg1')?.value) || kgCapa1;
        const kgCapa2Final = parseFloat(document.getElementById('fichaKg2')?.value) || kgCapa2;
        const kgAdhFinal = parseFloat(document.getElementById('fichaKgAdhesivo')?.value) || kgAdhesivo;
        const kgCatFinal = parseFloat(document.getElementById('fichaKgCatalizador')?.value) || kgCatalizador;

        // Capas extra
        let resumenExtraHTML = '';
        capasExtraData.forEach(capa => {
            if (capa.kgCapa > 0) {
                this.actualizarCampoSiVacio(`fichaKg${capa.num}`, capa.kgCapa.toFixed(2));
                const kgFinal = parseFloat(document.getElementById(`fichaKg${capa.num}`)?.value) || capa.kgCapa;
                resumenExtraHTML += `<span>Capa ${capa.num}: <strong>${kgFinal.toFixed(1)}</strong> kg</span> `;
            }
        });

        // Agregar resumen
        const resumenContainer = document.getElementById('fichaResumenCapas');
        if (resumenContainer) {
            let html = `<div class="d-flex gap-4 flex-wrap">
                <span>Capa 1: <strong id="fichaResumen1">${kgCapa1Final.toFixed(1)}</strong> kg</span>
                <span>Adhesivo: <strong id="fichaResumenAdh">${kgAdhFinal.toFixed(1)}</strong> kg</span>
                <span>Catalizador: <strong id="fichaResumenCat">${kgCatFinal.toFixed(1)}</strong> kg</span>
                ${kgCatFinal > 0 ? `<span class="text-muted">(Mezcla: <strong>${(kgAdhFinal + kgCatFinal).toFixed(1)}</strong> kg)</span>` : ''}
                <span>Capa 2: <strong id="fichaResumen2">${kgCapa2Final.toFixed(1)}</strong> kg</span>
                ${resumenExtraHTML}
                <span class="text-info"><i class="bi bi-rulers me-1"></i>${metrosTotales.toFixed(0).replace(/\B(?=(\d{3})+(?!\d))/g, '.')} metros</span>
            </div>`;
            resumenContainer.innerHTML = html;
        }

        console.log(`Ficha Tecnica: ${pedidoKg}kg pedido => Capa1: ${kgCapa1.toFixed(1)}kg, Capa2: ${kgCapa2.toFixed(1)}kg, Adhesivo: ${kgAdhesivo.toFixed(1)}kg, Catalizador: ${kgCatalizador.toFixed(1)}kg, Capas extra: ${capasExtraData.length}`);
    },

    actualizarCampoSiVacio: function(id, valor) {
        const el = document.getElementById(id);
        if (!el) return;
        // Solo actualizar si el campo esta vacio o tiene valor 0
        const current = el.value.trim();
        if (current === '' || current === '0' || current === '0.00') {
            el.value = valor;
        }
    },

    actualizarCampo: function(id, valor) {
        const el = document.getElementById(id);
        if (el) el.value = valor;
    },

    actualizarTexto: function(id, texto) {
        const el = document.getElementById(id);
        if (el) el.textContent = texto;
    },

    limpiarCalculosFicha: function() {
        ['fichaKg1', 'fichaKg2', 'fichaKgAdhesivo', 'fichaKgCatalizador'].forEach(id => {
            this.actualizarCampo(id, '');
        });
        ['fichaResumen1', 'fichaResumen2', 'fichaResumenAdh', 'fichaResumenCat'].forEach(id => {
            this.actualizarTexto(id, '-');
        });
    },

    /**
     * Calcula metros por bobina basado en peso y gramaje del material
     * Formula: Metros = (Kg * 1000) / Gramaje
     * Gramaje = Ancho(m) * Micras * Densidad
     */
    calcularMetrosBobina: function() {
        const pesoBobina = parseFloat(document.getElementById('pesoBobina')?.value) || 0;
        const anchoCorteMm = parseFloat(document.getElementById('anchoCorteFinal')?.value) ||
                             parseFloat(document.getElementById('anchoMaterial')?.value) || 0;
        const micras = parseFloat(document.getElementById('micrasMaterial')?.value) || 0;

        // Obtener densidad del material seleccionado
        const tipoMaterial = document.getElementById('tipoMaterial')?.value || '';
        const densidad = this.DENSIDADES[tipoMaterial] || 0.90;

        const metrosBobinaInput = document.getElementById('metrosBobina');
        if (!metrosBobinaInput || pesoBobina <= 0 || anchoCorteMm <= 0 || micras <= 0) {
            if (metrosBobinaInput) metrosBobinaInput.value = '';
            return;
        }

        const anchoM = anchoCorteMm / 1000;
        const gramaje = anchoM * micras * densidad;
        const metros = (pesoBobina * 1000) / gramaje;

        metrosBobinaInput.value = metros.toFixed(2);
    },

    /**
     * Renderiza la vista previa visual de la figura de embobinado (1-8)
     * Muestra un SVG con el numero dentro de un dibujo de bobina
     */
    renderFiguraEmbobinadoPreview: function(selectId, previewId) {
        selectId = selectId || 'orientacionEmbalaje';
        previewId = previewId || 'figuraEmbobinadoPreview';
        const container = document.getElementById(previewId);
        const val = document.getElementById(selectId)?.value;
        if (!container) return;
        if (!val) {
            container.innerHTML = '';
            return;
        }
        // SVG bobina con numero - simula la vista del Excel
        container.innerHTML = `<svg viewBox="0 0 40 40" xmlns="http://www.w3.org/2000/svg">
            <rect x="2" y="4" width="36" height="32" rx="4" fill="#f8f9fa" stroke="#333" stroke-width="1.5"/>
            <circle cx="20" cy="20" r="10" fill="none" stroke="#666" stroke-width="1"/>
            <circle cx="20" cy="20" r="3" fill="#666"/>
            <text x="20" y="24" text-anchor="middle" font-size="14" font-weight="bold" fill="#333">${val}</text>
        </svg>`;
    },

    /**
     * Crea un nuevo producto desde el modal y lo agrega al inventario en Supabase
     */
    crearNuevoProducto: async function() {
        const nombre = document.getElementById('nuevoProductoNombre')?.value.trim();
        const tipo = document.getElementById('nuevoProductoTipo')?.value;
        const micras = parseFloat(document.getElementById('nuevoProductoMicras')?.value) || 0;
        const ancho = parseFloat(document.getElementById('nuevoProductoAncho')?.value) || 0;
        const estructura = document.getElementById('nuevoProductoEstructura')?.value.trim() || '';
        const kg = parseFloat(document.getElementById('nuevoProductoKg')?.value) || 0;
        const proveedor = document.getElementById('nuevoProductoProveedor')?.value.trim() || '';
        const cliente = document.getElementById('nuevoProductoCliente')?.value.trim() || '';

        if (!nombre || !tipo || !micras || !ancho) {
            if (typeof showToast === 'function') {
                showToast('Completa los campos obligatorios: Nombre, Tipo Material, Micras y Ancho', 'danger');
            } else {
                alert('Completa los campos obligatorios: Nombre, Tipo Material, Micras y Ancho');
            }
            return;
        }

        // Generar SKU
        const PREFIJOS = { 'BOPP NORMAL': 'BN', 'BOPP MATE': 'BM', 'BOPP PASTA': 'BP', 'BOPP PERLADO': 'BPE', 'METAL': 'MT', 'PERLADO': 'PE', 'CAST': 'CA', 'PEBD': 'PB', 'PEBD PIGMENT': 'PBP', 'PET': 'PT' };
        const prefijo = PREFIJOS[tipo] || tipo.substring(0, 2).toUpperCase();
        const sku = `${prefijo}-${micras}-${ancho}`;
        const densidad = this.DENSIDADES[tipo] || 0.90;

        const nuevoMaterial = {
            material: tipo,
            micras: micras,
            ancho: ancho,
            kg: kg,
            producto: nombre,
            sku: sku,
            densidad: densidad,
            proveedor: proveedor,
            estructura: estructura,
            cliente: cliente
        };

        // Guardar en Supabase
        try {
            if (AxonesDB.isReady()) {
                await AxonesDB.client.from('materiales').insert([nuevoMaterial]);
            }
        } catch (e) {
            console.warn('Error guardando producto en Supabase:', e.message);
        }

        // Agregar al inventario local
        this.inventario.push(nuevoMaterial);

        // Recargar datalist de productos
        this.cargarProductosDelInventario();

        // Pre-llenar campos de la OT con el nuevo producto
        const productoInput = document.getElementById('producto');
        if (productoInput) {
            productoInput.value = `${tipo} ${micras}µ x ${ancho}mm - ${nombre} | ${sku}`;
            // Trigger the selection handler
            this.onProductoSeleccionado();
        }
        const estructuraInput = document.getElementById('estructuraMaterial');
        if (estructuraInput && estructura) estructuraInput.value = estructura;

        // Cerrar modal
        const modal = bootstrap.Modal.getInstance(document.getElementById('modalCrearProducto'));
        if (modal) modal.hide();

        // Limpiar campos del modal
        ['nuevoProductoNombre', 'nuevoProductoTipo', 'nuevoProductoMicras', 'nuevoProductoAncho', 'nuevoProductoEstructura', 'nuevoProductoKg', 'nuevoProductoProveedor', 'nuevoProductoCliente'].forEach(id => {
            const el = document.getElementById(id);
            if (el) el.value = '';
        });

        if (typeof showToast === 'function') {
            showToast(`Producto "${nombre}" creado con SKU: ${sku}`, 'success');
        }
    },

    /**
     * Carga clientes en el datalist (permite escribir nuevos o seleccionar existentes)
     */
    cargarClientes: async function() {
        // Cargar clientes desde Supabase (fuente de verdad)
        let clientes = [];
        if (AxonesDB.isReady()) {
            try {
                const clientesDB = await AxonesDB.clientes.listar({ ordenar: 'nombre', ascendente: true });
                clientes = clientesDB.map(c => c.nombre).filter(Boolean);
                // Guardar mapa completo de clientes para RIF lookup
                if (!this.clientesMap) this.clientesMap = {};
                clientesDB.forEach(c => {
                    if (c.nombre) this.clientesMap[c.nombre] = c;
                });
            } catch (e) {
                console.warn('Error cargando clientes de Supabase:', e.message);
            }
        }

        // Fallback: clientes de CONFIG si Supabase no tiene datos
        if (clientes.length === 0) {
            clientes = CONFIG?.CLIENTES || [
                'PEPSICO ALIMENTOS', 'NESTLE VENEZUELA', 'EMPRESAS POLAR',
                'KRAFT HEINZ', 'ALFONZO RIVAS', 'MONDELEZ', 'MARY',
                'PLUMROSE', 'KELLOGG\'S', 'BIMBO'
            ];
        }

        // Agregar clientes de ordenes existentes (para no perder clientes nuevos)
        const clientesDeOrdenes = this.ordenes
            .map(o => o.cliente)
            .filter(c => c && !clientes.includes(c));
        clientes = [...new Set([...clientes, ...clientesDeOrdenes])].sort();

        // Cargar en datalist para el campo cliente (input editable)
        const datalist = document.getElementById('listaClientes');
        if (datalist) {
            datalist.innerHTML = '';
            clientes.forEach(cliente => {
                const option = document.createElement('option');
                option.value = cliente;
                datalist.appendChild(option);
            });
        }

        // Cargar en select de filtro (modal lista ordenes)
        const filtroSelect = document.getElementById('filtroCliente');
        if (filtroSelect) {
            const firstOption = filtroSelect.options[0];
            filtroSelect.innerHTML = '';
            filtroSelect.appendChild(firstOption);

            clientes.forEach(cliente => {
                const option = document.createElement('option');
                option.value = cliente;
                option.textContent = cliente;
                filtroSelect.appendChild(option);
            });
        }
    },

    /**
     * Carga datos del cliente seleccionado
     * Incluye sugerencias basadas en ordenes anteriores
     */
    cargarDatosCliente: function() {
        const cliente = document.getElementById('cliente')?.value;
        const rifInput = document.getElementById('clienteRif');

        if (rifInput && cliente) {
            // Buscar RIF desde datos de Supabase (cargados en loadInventario)
            if (this.clientesMap && this.clientesMap[cliente]) {
                rifInput.value = this.clientesMap[cliente].rif || '';
            } else {
                // Busqueda parcial por nombre (case insensitive)
                const clienteUpper = cliente.toUpperCase();
                const match = this.clientesMap && Object.keys(this.clientesMap).find(
                    k => k.toUpperCase() === clienteUpper
                );
                rifInput.value = match ? (this.clientesMap[match].rif || '') : '';
            }
        }

        // Cargar sugerencias de memoria si esta disponible
        if (cliente && typeof ClienteMemoria !== 'undefined') {
            this.mostrarSugerenciasCliente(cliente);
        }
    },

    /**
     * Muestra sugerencias basadas en ordenes anteriores del cliente
     */
    mostrarSugerenciasCliente: function(cliente) {
        const sugerencias = ClienteMemoria.getSugerencias(cliente);
        if (!sugerencias || sugerencias.productos.length === 0) return;

        // Eliminar panel anterior si existe
        const panelAnterior = document.getElementById('panelSugerencias');
        if (panelAnterior) panelAnterior.remove();

        // Crear panel de sugerencias
        const clienteSelect = document.getElementById('cliente');
        const panel = document.createElement('div');
        panel.id = 'panelSugerencias';
        panel.className = 'alert alert-info py-2 mt-2';
        panel.innerHTML = `
            <div class="d-flex align-items-center justify-content-between mb-2">
                <span><i class="bi bi-lightbulb me-2"></i><strong>Sugerencias para ${cliente}</strong></span>
                <button type="button" class="btn-close btn-sm" onclick="document.getElementById('panelSugerencias').remove()"></button>
            </div>
            <div class="mb-2">
                <small class="text-muted">Productos anteriores:</small>
                <div class="d-flex flex-wrap gap-1 mt-1">
                    ${sugerencias.productos.map(p => `
                        <button type="button" class="btn btn-sm btn-outline-primary"
                                onclick="Ordenes.aplicarSugerenciaProducto('${cliente}', '${p.nombre.replace(/'/g, "\\'")}')">
                            ${p.nombre} <span class="badge bg-secondary">${p.count}</span>
                        </button>
                    `).join('')}
                </div>
            </div>
            ${sugerencias.materiales.length > 0 ? `
            <div>
                <small class="text-muted">Materiales frecuentes:</small>
                <div class="d-flex flex-wrap gap-1 mt-1">
                    ${sugerencias.materiales.map(m => `
                        <span class="badge bg-secondary">${m.tipo} ${m.micras}u x ${m.ancho}mm</span>
                    `).join('')}
                </div>
            </div>
            ` : ''}
        `;

        // Insertar despues del selector de cliente
        clienteSelect.closest('.col-md-6, .col-md-4, .mb-3')?.appendChild(panel);
    },

    /**
     * Aplica sugerencia de producto seleccionado
     */
    aplicarSugerenciaProducto: function(cliente, producto) {
        const config = ClienteMemoria.getConfigProducto(cliente, producto);
        if (!config) return;

        // Llenar producto
        const productoInput = document.getElementById('producto');
        if (productoInput) productoInput.value = producto;

        // Llenar campos de configuracion
        const camposConfig = {
            'cpe': config.cpe,
            'mpps': config.mpps,
            'codigoBarra': config.codigoBarra,
            'estructuraMaterial': config.estructuraMaterial,
            'tipoMaterial': config.tipoMaterial,
            'micrasMaterial': config.micrasMaterial,
            'anchoMaterial': config.anchoMaterial,
            'frecuencia': config.frecuencia,
            'desarrollo': config.desarrollo,
            'numColores': config.numColores
        };

        Object.entries(camposConfig).forEach(([campo, valor]) => {
            const input = document.getElementById(campo);
            if (input && valor) {
                input.value = valor;
                // Resaltar campos pre-llenados
                input.classList.add('bg-light', 'border-info');
                input.setAttribute('title', 'Pre-llenado desde orden anterior');
            }
        });

        // Llenar tintas si existen
        if (config.tintas && Array.isArray(config.tintas)) {
            config.tintas.forEach(tinta => {
                const i = tinta.posicion;
                const colorInput = document.getElementById(`tinta${i}Color`);
                if (colorInput) {
                    colorInput.value = tinta.color || '';
                    document.getElementById(`tinta${i}Anilox`).value = tinta.anilox || '';
                    document.getElementById(`tinta${i}Visc`).value = tinta.viscosidad || '';
                    document.getElementById(`tinta${i}Pct`).value = tinta.porcentaje || '';
                }
            });
        }

        // Verificar inventario con los nuevos datos
        this.verificarInventarioMaterial();

        // Cerrar panel de sugerencias
        document.getElementById('panelSugerencias')?.remove();

        if (typeof Axones !== 'undefined') {
            Axones.showSuccess(`Datos de "${producto}" cargados desde orden anterior`);
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
     * Usa el servicio centralizado de inventario si esta disponible
     */
    verificarInventarioMaterial: function() {
        const tipoMaterial = document.getElementById('tipoMaterial')?.value;
        const micras = parseFloat(document.getElementById('micrasMaterial')?.value) || 0;
        const ancho = parseFloat(document.getElementById('anchoMaterial')?.value) || 0;
        const kgDisponible = document.getElementById('kgDisponible');
        const pedidoKg = parseFloat(document.getElementById('pedidoKg')?.value) || 0;

        if (!tipoMaterial || !kgDisponible) return;

        let totalKg = 0;

        // Usar servicio centralizado si esta disponible
        if (typeof InventarioService !== 'undefined') {
            const resultado = InventarioService.verificarDisponibilidad({
                tipoMaterial,
                micrasMaterial: micras,
                anchoMaterial: ancho,
                pedidoKg
            });
            totalKg = resultado.disponible;

            // Mostrar mensaje informativo si hay problemas de stock
            if (!resultado.suficiente && pedidoKg > 0) {
                this.mostrarAlertaInventario(resultado.mensaje, resultado.faltante);
            }
        } else {
            // Fallback: buscar en inventario local
            const disponible = this.inventario.filter(item => {
                const matchMaterial = item.material?.includes(tipoMaterial);
                const matchMicras = !micras || item.micras === micras;
                const matchAncho = !ancho || item.ancho === ancho;
                return matchMaterial && matchMicras && matchAncho;
            });
            totalKg = disponible.reduce((sum, item) => sum + (item.kg || 0), 0);
        }

        kgDisponible.value = totalKg.toFixed(2);

        // Cambiar color segun disponibilidad
        if (totalKg >= pedidoKg && pedidoKg > 0) {
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
     * Muestra alerta de inventario insuficiente
     */
    mostrarAlertaInventario: function(mensaje, faltante) {
        // Eliminar alerta anterior si existe
        const alertaAnterior = document.getElementById('alertaInventarioOrden');
        if (alertaAnterior) alertaAnterior.remove();

        const kgDisponible = document.getElementById('kgDisponible');
        if (!kgDisponible) return;

        const alerta = document.createElement('div');
        alerta.id = 'alertaInventarioOrden';
        alerta.className = 'alert alert-warning py-1 mt-1 small';
        alerta.innerHTML = `
            <i class="bi bi-exclamation-triangle me-1"></i>
            <strong>Atencion:</strong> ${mensaje}
            <br><small>Faltan aproximadamente ${faltante.toFixed(2)} Kg de material para esta orden.</small>
        `;

        kgDisponible.closest('.col-md-3, .col-md-4, .mb-3')?.appendChild(alerta);
    },

    /**
     * Valida las fechas de la orden
     * @returns {object} - {valido: boolean, mensaje: string}
     */
    validarFechas: function() {
        const fechaOrden = document.getElementById('fechaOrden')?.value;
        const fechaInicio = document.getElementById('fechaInicio')?.value;
        const fechaEntrega = document.getElementById('fechaEntrega')?.value;

        if (!fechaOrden) {
            return { valido: false, mensaje: 'La fecha de orden es requerida' };
        }

        if (fechaInicio && fechaOrden > fechaInicio) {
            return { valido: false, mensaje: 'La fecha de inicio no puede ser anterior a la fecha de orden' };
        }

        if (fechaEntrega && fechaInicio && fechaInicio > fechaEntrega) {
            return { valido: false, mensaje: 'La fecha de entrega no puede ser anterior a la fecha de inicio' };
        }

        if (fechaEntrega && fechaOrden > fechaEntrega) {
            return { valido: false, mensaje: 'La fecha de entrega no puede ser anterior a la fecha de orden' };
        }

        return { valido: true };
    },

    /**
     * Valida que el numero de orden sea unico
     * @returns {object} - {valido: boolean, mensaje: string}
     */
    validarNumeroOrdenUnico: function() {
        const numeroOrden = document.getElementById('numeroOrden')?.value;
        const ordenId = document.getElementById('ordenId')?.value;

        if (!numeroOrden) {
            return { valido: false, mensaje: 'El numero de orden es requerido' };
        }

        // Verificar si ya existe una orden con este numero (excluyendo la actual si es edicion)
        const ordenExistente = this.ordenes.find(o =>
            o.numeroOrden === numeroOrden && o.id !== ordenId
        );

        if (ordenExistente) {
            return { valido: false, mensaje: `Ya existe una orden con el numero ${numeroOrden}` };
        }

        return { valido: true };
    },

    /**
     * Valida que pedidoKg sea mayor a 0
     * @returns {object} - {valido: boolean, mensaje: string}
     */
    validarCantidad: function() {
        const pedidoKg = parseFloat(document.getElementById('pedidoKg')?.value) || 0;

        if (pedidoKg <= 0) {
            return { valido: false, mensaje: 'La cantidad del pedido debe ser mayor a 0 Kg' };
        }

        return { valido: true };
    },

    /**
     * Guarda la orden de trabajo
     */
    guardarOrden: async function() {
        // PREVENIR DOBLE CLICK
        if (this._guardandoOrden) {
            console.warn('[OT] Ya se esta guardando, ignorando click duplicado');
            return;
        }
        this._guardandoOrden = true;

        // Deshabilitar botones de guardar para evitar dobles clicks
        const btns = document.querySelectorAll('#btnGuardarOrden, #btnGuardarOrdenBottom, [onclick*="guardarOrden"]');
        btns.forEach(b => b.disabled = true);

        try {
            return await this._guardarOrdenInterno();
        } finally {
            this._guardandoOrden = false;
            btns.forEach(b => b.disabled = false);
        }
    },

    _guardarOrdenInterno: async function() {
        const form = document.getElementById('formOrdenTrabajo');
        if (!form.checkValidity()) {
            form.reportValidity();
            return;
        }

        // Validaciones adicionales
        const validacionFechas = this.validarFechas();
        if (!validacionFechas.valido) {
            if (typeof Axones !== 'undefined') {
                Axones.showError(validacionFechas.mensaje);
            } else {
                alert(validacionFechas.mensaje);
            }
            return;
        }

        const validacionNumero = this.validarNumeroOrdenUnico();
        if (!validacionNumero.valido) {
            if (typeof Axones !== 'undefined') {
                Axones.showError(validacionNumero.mensaje);
            } else {
                alert(validacionNumero.mensaje);
            }
            return;
        }

        const validacionCantidad = this.validarCantidad();
        if (!validacionCantidad.valido) {
            if (typeof Axones !== 'undefined') {
                Axones.showError(validacionCantidad.mensaje);
            } else {
                alert(validacionCantidad.mensaje);
            }
            return;
        }

        // Recopilar todos los datos del formulario
        const ordenData = this.recopilarDatosFormulario();

        // Verificar si es edicion o nueva orden
        const ordenId = document.getElementById('ordenId')?.value;

        try {
            if (ordenId) {
                // Editar orden existente en Supabase
                ordenData.id = ordenId;
                ordenData.fechaModificacion = new Date().toISOString();
                await AxonesDB.ordenesHelper.actualizar(ordenId, ordenData);
                // Actualizar en memoria
                const index = this.ordenes.findIndex(o => o.id === ordenId);
                if (index !== -1) this.ordenes[index] = ordenData;
            } else {
                // Nueva orden - estado inicial "nueva" (por revisar en Kanban)
                ordenData.fechaCreacion = new Date().toISOString();
                if (!ordenData.estadoOrden || ordenData.estadoOrden === 'pendiente') {
                    ordenData.estadoOrden = 'nueva';
                }

                // ANTES DE INSERTAR: regenerar numero_ot consultando Supabase
                // (evita duplicate key cuando varias tablets crean OT al mismo tiempo)
                ordenData.numeroOrden = await this._generarNumeroOTUnico();
                document.getElementById('numeroOrden').value = ordenData.numeroOrden;

                let intentos = 0;
                let guardada = null;
                while (intentos < 5) {
                    try {
                        guardada = await AxonesDB.ordenesHelper.crear(ordenData);
                        break;  // exito
                    } catch (err) {
                        // Caso 1: check constraint estado
                        if (err?.message?.includes('estado_check') || err?.code === '23514') {
                            console.warn('[Ordenes] Check constraint no permite estado, reintentando con "pendiente"');
                            ordenData.estadoOrden = 'pendiente';
                            continue;
                        }
                        // Caso 2: duplicate key en numero_ot (regenerar +1 y reintentar)
                        if (err?.message?.includes('numero_ot') || err?.code === '23505') {
                            intentos++;
                            console.warn(`[Ordenes] N° OT duplicado (${ordenData.numeroOrden}), regenerando intento ${intentos}/5`);
                            ordenData.numeroOrden = await this._generarNumeroOTUnico(intentos);
                            document.getElementById('numeroOrden').value = ordenData.numeroOrden;
                            continue;
                        }
                        // Otro error: re-lanzar
                        throw err;
                    }
                }
                if (!guardada) {
                    throw new Error('No se pudo generar un numero de OT unico despues de 5 intentos');
                }
                ordenData.id = guardada.id;
                this.ordenes.push(ordenData);
            }
        } catch (error) {
            console.error('Error guardando orden en Supabase:', error);
            if (typeof Axones !== 'undefined') {
                Axones.showError('Error guardando orden: ' + error.message);
            } else {
                alert('Error guardando orden: ' + error.message);
            }
            return;
        }

        this.filteredOrdenes = [...this.ordenes];

        // Aprender de esta orden para sugerencias futuras
        if (typeof ClienteMemoria !== 'undefined') {
            ClienteMemoria.aprenderDeOrden(ordenData);
        }

        // Verificar inventario
        this.verificarYCrearAlertas(ordenData);

        // Limpiar autosave
        this.limpiarAutosaveOT();

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

        // Capas adicionales (3+)
        data.capasAdicionales = [];
        for (let i = 3; i <= 10; i++) {
            const tipoEl = document.getElementById(`fichaTipoMat${i}`);
            if (tipoEl && tipoEl.closest('#capasAdicionalesContainer')) {
                data.capasAdicionales.push({
                    capa: i,
                    tipoMaterial: tipoEl.value || '',
                    micras: parseFloat(document.getElementById(`fichaMicras${i}`)?.value) || 0,
                    ancho: parseFloat(document.getElementById(`fichaAncho${i}`)?.value) || 0,
                    densidad: parseFloat(document.getElementById(`fichaDensidad${i}`)?.value) || 0,
                    kg: parseFloat(document.getElementById(`fichaKg${i}`)?.value) || 0,
                    sku: document.getElementById(`fichaSku${i}`)?.value || ''
                });
            }
        }

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
     * Verifica inventario al crear/editar OT.
     * Permite crear la OT aunque no haya material, pero emite alerta + email.
     * Ahora revisa TODOS los materiales de la ficha tecnica (capas, adhesivo, tintas).
     */
    verificarYCrearAlertas: async function(orden) {
        // Desactivado mientras estan en pruebas - activar en config.js: ALERTAS_EMAIL_ACTIVO: true
        if (typeof CONFIG !== 'undefined' && !CONFIG.ALERTAS_EMAIL_ACTIVO) return;

        const pedidoKg = parseFloat(orden.pedidoKg) || 0;
        if (!pedidoKg) return;

        const faltantes = [];

        // 1. Material principal (Capa 1 / tipo de material)
        const tipoMaterial = orden.tipoMaterial;
        if (tipoMaterial) {
            const disponible = this.inventario.filter(item =>
                item.material?.toUpperCase().includes(tipoMaterial.toUpperCase())
            ).reduce((sum, item) => sum + (parseFloat(item.kg) || 0), 0);

            const kgNecesarios = parseFloat(orden.fichaKg1) || pedidoKg;
            if (disponible < kgNecesarios) {
                faltantes.push({
                    material: tipoMaterial,
                    necesario: kgNecesarios,
                    disponible: disponible,
                    faltante: kgNecesarios - disponible,
                    tipo: 'sustrato'
                });
            }
        }

        // 2. Capa 2 (si es laminado)
        const tipoMat2 = orden.fichaTipoMat2;
        if (tipoMat2) {
            const disponible2 = this.inventario.filter(item =>
                item.material?.toUpperCase().includes(tipoMat2.toUpperCase())
            ).reduce((sum, item) => sum + (parseFloat(item.kg) || 0), 0);

            const kgNecesarios2 = parseFloat(orden.fichaKg2) || 0;
            if (kgNecesarios2 > 0 && disponible2 < kgNecesarios2) {
                faltantes.push({
                    material: tipoMat2,
                    necesario: kgNecesarios2,
                    disponible: disponible2,
                    faltante: kgNecesarios2 - disponible2,
                    tipo: 'sustrato'
                });
            }
        }

        // 3. Capas adicionales (3+)
        if (orden.capasAdicionales) {
            orden.capasAdicionales.forEach(capa => {
                if (capa.tipoMaterial && capa.kg > 0) {
                    const disp = this.inventario.filter(item =>
                        item.material?.toUpperCase().includes(capa.tipoMaterial.toUpperCase())
                    ).reduce((sum, item) => sum + (parseFloat(item.kg) || 0), 0);

                    if (disp < capa.kg) {
                        faltantes.push({
                            material: capa.tipoMaterial,
                            necesario: capa.kg,
                            disponible: disp,
                            faltante: capa.kg - disp,
                            tipo: 'sustrato'
                        });
                    }
                }
            });
        }

        // 4. Adhesivo
        const kgAdhesivo = parseFloat(orden.fichaKgAdhesivo) || 0;
        if (kgAdhesivo > 0) {
            let adhesivos = [];
            if (AxonesDB.isReady()) {
                try {
                    adhesivos = await AxonesDB.client.from('adhesivos').select('*');
                    adhesivos = adhesivos.data || [];
                } catch(e) {}
            }
            const dispAdh = adhesivos.reduce((sum, a) => sum + (parseFloat(a.kg) || 0), 0);
            if (dispAdh < kgAdhesivo) {
                faltantes.push({
                    material: orden.fichaTipoAdhesivo || 'Adhesivo',
                    necesario: kgAdhesivo,
                    disponible: dispAdh,
                    faltante: kgAdhesivo - dispAdh,
                    tipo: 'adhesivo'
                });
            }
        }

        // Si hay faltantes, crear alerta y enviar email
        if (faltantes.length > 0) {
            await this.crearAlertaSolicitudMaterial(orden, faltantes);
        }
    },

    /**
     * Crea alerta detallada de solicitud de material y envia email al encargado de inventario
     */
    crearAlertaSolicitudMaterial: async function(orden, faltantes) {
        const nivel = faltantes.some(f => f.disponible === 0) ? 'danger' : 'warning';

        // Construir tabla de materiales faltantes
        let tablaFaltantes = '';
        let tablaTexto = '';
        faltantes.forEach(f => {
            tablaFaltantes += `<tr><td>${f.material}</td><td>${f.necesario.toFixed(1)} Kg</td><td>${f.disponible.toFixed(1)} Kg</td><td style="color:red;font-weight:bold;">${f.faltante.toFixed(1)} Kg</td></tr>`;
            tablaTexto += `  - ${f.material}: Necesario ${f.necesario.toFixed(1)} Kg, Disponible ${f.disponible.toFixed(1)} Kg, FALTANTE: ${f.faltante.toFixed(1)} Kg\n`;
        });

        const fechaEntrega = orden.fechaEntrega ? new Date(orden.fechaEntrega) : null;
        const diasRestantes = fechaEntrega ? Math.ceil((fechaEntrega - new Date()) / (1000 * 60 * 60 * 24)) : '?';

        // Mensaje para Supabase (texto plano)
        const mensajeTexto = `SOLICITUD DE MATERIAL - ${orden.numeroOrden}\n` +
            `Cliente: ${orden.cliente || 'N/A'}\n` +
            `Producto: ${orden.producto || 'N/A'}\n` +
            `Maquina: ${orden.maquina || 'N/A'}\n` +
            `Pedido: ${orden.pedidoKg} Kg\n` +
            `Fecha Entrega: ${orden.fechaEntrega || 'N/A'} (${diasRestantes} dias)\n` +
            `Estructura: ${orden.estructuraMaterial || 'N/A'}\n\n` +
            `MATERIALES FALTANTES:\n${tablaTexto}` +
            `\nPor favor gestionar la compra o despacho desde almacen.`;

        // 1. Guardar alerta en Supabase (tabla alertas)
        if (AxonesDB.isReady()) {
            try {
                await AxonesDB.client.from('alertas').insert({
                    tipo: 'stock_bajo',
                    nivel: nivel,
                    titulo: `Solicitud Material: ${orden.numeroOrden} - ${orden.cliente}`,
                    mensaje: mensajeTexto
                });
            } catch (e) {
                console.warn('Error creando alerta:', e.message);
            }
        }

        // 2. Construir email HTML bonito
        const emailHTML = this.construirEmailSolicitudMaterial(orden, faltantes, diasRestantes);

        // 3. Intentar enviar email via EmailJS (si está configurado)
        const emailEnviado = await this.enviarEmailSolicitudMaterial(orden, emailHTML, mensajeTexto);

        // 4. Mostrar aviso visual al usuario
        const faltantesResumen = faltantes.map(f => `${f.material}: ${f.faltante.toFixed(0)} Kg`).join(', ');
        const msgBase = `Orden ${orden.numeroOrden} creada.\nMATERIAL FALTANTE: ${faltantesResumen}`;
        const msgEmail = emailEnviado
            ? '\nSe envio alerta por email al encargado de inventario.'
            : '\nAlerta guardada en el sistema. Configure EmailJS para envio automatico por correo.';

        if (typeof showToast === 'function') {
            showToast(msgBase + msgEmail, nivel === 'danger' ? 'danger' : 'warning');
        }
    },

    /**
     * Construye el HTML del email de solicitud de material
     */
    construirEmailSolicitudMaterial: function(orden, faltantes, diasRestantes) {
        let filasTabla = '';
        faltantes.forEach(f => {
            const color = f.disponible === 0 ? '#dc3545' : '#ffc107';
            filasTabla += `<tr>
                <td style="padding:6px;border:1px solid #ddd;">${f.material}</td>
                <td style="padding:6px;border:1px solid #ddd;text-align:right;">${f.necesario.toFixed(1)} Kg</td>
                <td style="padding:6px;border:1px solid #ddd;text-align:right;">${f.disponible.toFixed(1)} Kg</td>
                <td style="padding:6px;border:1px solid #ddd;text-align:right;color:${color};font-weight:bold;">${f.faltante.toFixed(1)} Kg</td>
            </tr>`;
        });

        return `
        <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;">
            <div style="background:#0d6efd;color:white;padding:15px;text-align:center;">
                <h2 style="margin:0;">SOLICITUD DE MATERIAL</h2>
                <p style="margin:5px 0 0;">${orden.numeroOrden}</p>
            </div>
            <div style="padding:15px;background:#f8f9fa;">
                <table style="width:100%;border-collapse:collapse;margin-bottom:15px;">
                    <tr><td style="padding:4px;font-weight:bold;width:140px;">Cliente:</td><td>${orden.cliente || 'N/A'}</td></tr>
                    <tr><td style="padding:4px;font-weight:bold;">Producto:</td><td>${orden.producto || 'N/A'}</td></tr>
                    <tr><td style="padding:4px;font-weight:bold;">Maquina:</td><td>${orden.maquina || 'N/A'}</td></tr>
                    <tr><td style="padding:4px;font-weight:bold;">Pedido:</td><td>${orden.pedidoKg} Kg</td></tr>
                    <tr><td style="padding:4px;font-weight:bold;">Estructura:</td><td>${orden.estructuraMaterial || 'N/A'}</td></tr>
                    <tr><td style="padding:4px;font-weight:bold;">Fecha Entrega:</td><td>${orden.fechaEntrega || 'N/A'} <strong>(${diasRestantes} dias)</strong></td></tr>
                </table>
                <h3 style="color:#dc3545;margin:10px 0 5px;">Materiales Faltantes</h3>
                <table style="width:100%;border-collapse:collapse;background:white;">
                    <thead>
                        <tr style="background:#f0c040;">
                            <th style="padding:6px;border:1px solid #ddd;text-align:left;">Material</th>
                            <th style="padding:6px;border:1px solid #ddd;">Necesario</th>
                            <th style="padding:6px;border:1px solid #ddd;">Disponible</th>
                            <th style="padding:6px;border:1px solid #ddd;">Faltante</th>
                        </tr>
                    </thead>
                    <tbody>${filasTabla}</tbody>
                </table>
                <p style="margin-top:15px;padding:10px;background:#fff3cd;border-radius:4px;">
                    <strong>Accion requerida:</strong> Por favor gestionar la compra o despacho desde almacen para cumplir con esta orden de trabajo.
                </p>
            </div>
            <div style="background:#333;color:#ccc;padding:10px;text-align:center;font-size:12px;">
                Sistema Axones - Inversiones Axones 2008, C.A.<br>
                Generado automaticamente el ${new Date().toLocaleString('es-VE')}
            </div>
        </div>`;
    },

    /**
     * Envia email de solicitud de material via EmailJS
     * Si EmailJS no esta configurado, abre mailto como fallback
     *
     * Template de EmailJS debe tener estas variables:
     *   {{to_email}}     - Destinatario
     *   {{subject}}      - Asunto del correo
     *   {{from_name}}    - "Sistema Axones"
     *   {{numero_ot}}    - Numero de OT
     *   {{cliente}}      - Nombre del cliente
     *   {{producto}}     - Nombre del producto
     *   {{maquina}}      - Maquina asignada
     *   {{pedido_kg}}    - Kg del pedido
     *   {{estructura}}   - Estructura del material
     *   {{fecha_entrega}}- Fecha de entrega
     *   {{dias_restantes}}- Dias para la entrega
     *   {{tabla_faltantes}}- Tabla HTML con materiales faltantes
     *   {{message}}      - Mensaje en texto plano (backup)
     */
    enviarEmailSolicitudMaterial: async function(orden, htmlContent, textoPlano) {
        // Obtener destinatarios
        const destinatarios = (typeof CONFIG !== 'undefined' && CONFIG.NOTIFICACIONES_EMAILS?.stock_bajo)
            ? CONFIG.NOTIFICACIONES_EMAILS.stock_bajo
            : ['gerenciaaxones@gmail.com', 'anl.almacenaxones@gmail.com'];

        const fechaEntrega = orden.fechaEntrega || 'N/A';
        const diasRestantes = fechaEntrega !== 'N/A'
            ? Math.ceil((new Date(fechaEntrega) - new Date()) / (1000 * 60 * 60 * 24))
            : '?';

        // Intentar EmailJS (solo si PUBLIC_KEY esta configurada)
        if (typeof emailjs !== 'undefined' &&
            typeof CONFIG !== 'undefined' &&
            CONFIG.EMAILJS_PUBLIC_KEY &&
            CONFIG.EMAILJS_SERVICE_ID) {
            try {
                for (const email of destinatarios) {
                    await emailjs.send(CONFIG.EMAILJS_SERVICE_ID, CONFIG.EMAILJS_TEMPLATE_ID, {
                        to_email: email,
                        subject: `[SOLICITUD MATERIAL] ${orden.numeroOrden} - ${orden.cliente || 'Sin cliente'}`,
                        from_name: 'Sistema Axones',
                        numero_ot: orden.numeroOrden || '',
                        cliente: orden.cliente || 'N/A',
                        producto: orden.producto || 'N/A',
                        maquina: orden.maquina || 'N/A',
                        pedido_kg: orden.pedidoKg || '0',
                        estructura: orden.estructuraMaterial || 'N/A',
                        fecha_entrega: fechaEntrega,
                        dias_restantes: diasRestantes,
                        tabla_faltantes: htmlContent,
                        message: textoPlano
                    });
                }
                console.log(`[EmailJS] Email enviado a ${destinatarios.length} destinatarios`);
                return true;
            } catch (e) {
                console.warn('[EmailJS] Error enviando email:', e);
                // Caer al fallback mailto
            }
        }

        // Fallback: mailto link (abre cliente de correo del usuario)
        try {
            const asunto = encodeURIComponent(`[SOLICITUD MATERIAL] ${orden.numeroOrden} - ${orden.cliente || ''}`);
            const cuerpo = encodeURIComponent(textoPlano);
            const mailto = `mailto:${destinatarios.join(',')}?subject=${asunto}&body=${cuerpo}`;

            const link = document.createElement('a');
            link.href = mailto;
            link.style.display = 'none';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            console.log('[Email] Abriendo cliente de correo con solicitud de material');
            return true;
        } catch (e) {
            console.warn('[Email] No se pudo abrir cliente de correo:', e);
            return false;
        }
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

        // Cargar capas adicionales (3+)
        if (orden.capasAdicionales && Array.isArray(orden.capasAdicionales)) {
            orden.capasAdicionales.forEach(capa => {
                this.agregarCapaAdicional();
                const num = capa.capa;
                const tipoEl = document.getElementById(`fichaTipoMat${num}`);
                if (tipoEl) tipoEl.value = capa.tipoMaterial || '';
                const micrasEl = document.getElementById(`fichaMicras${num}`);
                if (micrasEl) micrasEl.value = capa.micras || '';
                const anchoEl = document.getElementById(`fichaAncho${num}`);
                if (anchoEl) anchoEl.value = capa.ancho || '';
                const densidadEl = document.getElementById(`fichaDensidad${num}`);
                if (densidadEl) densidadEl.value = capa.densidad || 0.93;
                const kgEl = document.getElementById(`fichaKg${num}`);
                if (kgEl) kgEl.value = capa.kg || '';
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
                        <button class="btn btn-sm btn-outline-info me-1" onclick="Ordenes.verHistorial('${orden.id}')" title="Historial">
                            <i class="bi bi-clock-history"></i>
                        </button>
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
    eliminarOrden: async function(id) {
        const orden = this.ordenes.find(o => o.id === id);
        if (!orden) return;

        if (confirm(`Eliminar orden ${orden.numeroOrden}?`)) {
            try {
                await AxonesDB.ordenesHelper.eliminar(id);
                this.ordenes = this.ordenes.filter(o => o.id !== id);
                this.filteredOrdenes = this.filteredOrdenes.filter(o => o.id !== id);
                this.renderTablaOrdenes();

                if (typeof Axones !== 'undefined') {
                    Axones.showSuccess('Orden eliminada');
                }
            } catch (error) {
                console.error('Error eliminando orden:', error);
            }
        }
    },

    /**
     * Verifica ordenes proximas a su fecha de inicio
     * Reutiliza verificarYCrearAlertas para cada orden proxima
     */
    verificarOrdenesProximas: async function() {
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

        if (ordenesProximas.length === 0) return;

        console.log(`Verificando ${ordenesProximas.length} ordenes proximas a fecha de inicio`);
        for (const orden of ordenesProximas) {
            await this.verificarYCrearAlertas(orden);
        }
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
    },

    // ==================== HISTORIAL DE ORDENES ====================

    /**
     * Muestra el historial detallado de una orden
     */
    verHistorial: async function(id) {
        const orden = this.ordenes.find(o => o.id === id);
        if (!orden) return;

        // Crear modal si no existe
        let modal = document.getElementById('modalHistorialOT');
        if (!modal) {
            modal = document.createElement('div');
            modal.id = 'modalHistorialOT';
            modal.className = 'modal fade';
            modal.setAttribute('tabindex', '-1');
            modal.innerHTML = `
                <div class="modal-dialog modal-lg modal-dialog-scrollable">
                    <div class="modal-content">
                        <div class="modal-header bg-info text-white">
                            <h5 class="modal-title"><i class="bi bi-clock-history me-2"></i>Historial de Orden</h5>
                            <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal"></button>
                        </div>
                        <div class="modal-body" id="historialOTBody">
                            <div class="text-center py-4">
                                <div class="spinner-border text-primary" role="status"></div>
                                <p class="mt-2">Cargando historial...</p>
                            </div>
                        </div>
                        <div class="modal-footer">
                            <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cerrar</button>
                        </div>
                    </div>
                </div>
            `;
            document.body.appendChild(modal);
        }

        // Mostrar modal
        const bsModal = new bootstrap.Modal(modal);
        bsModal.show();

        // Header con datos de la orden
        const body = document.getElementById('historialOTBody');
        body.innerHTML = `
            <div class="card mb-3 border-primary">
                <div class="card-body">
                    <div class="row">
                        <div class="col-md-3">
                            <strong class="text-primary">${orden.numeroOrden || '-'}</strong><br>
                            <small class="text-muted">Numero de Orden</small>
                        </div>
                        <div class="col-md-3">
                            <strong>${orden.cliente || '-'}</strong><br>
                            <small class="text-muted">Cliente</small>
                        </div>
                        <div class="col-md-3">
                            <strong>${orden.producto || '-'}</strong><br>
                            <small class="text-muted">Producto</small>
                        </div>
                        <div class="col-md-3">
                            <strong>${orden.pedidoKg ? this.formatNumber(orden.pedidoKg) + ' Kg' : '-'}</strong><br>
                            <small class="text-muted">Pedido</small>
                        </div>
                    </div>
                    <hr class="my-2">
                    <div class="row">
                        <div class="col-md-3">
                            <small><strong>Estado:</strong> <span class="badge ${orden.estadoOrden === 'completada' ? 'bg-success' : orden.estadoOrden === 'en-proceso' ? 'bg-primary' : 'bg-warning text-dark'}">${orden.estadoOrden || 'pendiente'}</span></small>
                        </div>
                        <div class="col-md-3">
                            <small><strong>Maquina:</strong> ${orden.maquina || '-'}</small>
                        </div>
                        <div class="col-md-3">
                            <small><strong>Creada:</strong> ${this.formatFecha(orden.fechaCreacion)}</small>
                        </div>
                        <div class="col-md-3">
                            <small><strong>Entrega:</strong> ${orden.fechaEntrega || '-'}</small>
                        </div>
                    </div>
                </div>
            </div>
            <h6 class="mb-3"><i class="bi bi-list-ul me-1"></i>Linea de Tiempo</h6>
            <div id="historialTimeline" class="text-center py-3">
                <div class="spinner-border spinner-border-sm text-primary"></div> Cargando...
            </div>
        `;

        // Renderizar historial local
        this.renderTimeline([], orden);
    },

    /**
     * Renderiza la linea de tiempo del historial
     */
    renderTimeline: function(historial, orden) {
        const container = document.getElementById('historialTimeline');
        if (!container) return;

        // Agregar evento de creacion si no esta en el historial
        if (orden.fechaCreacion && !historial.find(h => h.accion === 'CREADA')) {
            historial.push({
                timestamp: orden.fechaCreacion,
                accion: 'CREADA',
                detalle: 'Orden de trabajo creada',
                usuario: orden.creadoPor || 'sistema',
                modulo: 'ordenes'
            });
        }

        // Ordenar cronologicamente (mas reciente primero)
        historial.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

        if (historial.length === 0) {
            container.innerHTML = '<p class="text-muted text-center">Sin historial registrado</p>';
            return;
        }

        container.innerHTML = '<div class="timeline">' +
            historial.map(h => {
                const icon = this.getHistorialIcon(h.accion);
                const color = this.getHistorialColor(h.accion);
                const fecha = this.formatFechaCompleta(h.timestamp);

                return `
                    <div class="d-flex mb-3 align-items-start">
                        <div class="flex-shrink-0 me-3 text-center" style="width:40px">
                            <div class="rounded-circle d-flex align-items-center justify-content-center mx-auto"
                                 style="width:36px;height:36px;background:${color}15;border:2px solid ${color}">
                                <i class="bi ${icon}" style="color:${color};font-size:14px"></i>
                            </div>
                        </div>
                        <div class="flex-grow-1">
                            <div class="d-flex justify-content-between align-items-center">
                                <strong style="color:${color}">${this.getHistorialLabel(h.accion)}</strong>
                                <small class="text-muted">${fecha}</small>
                            </div>
                            <p class="mb-1 text-secondary" style="font-size:0.85rem">${h.detalle || ''}</p>
                            <div class="d-flex gap-3">
                                ${h.usuario ? `<small class="text-muted"><i class="bi bi-person"></i> ${h.usuarioNombre || h.usuario}</small>` : ''}
                                ${h.modulo ? `<small class="text-muted"><i class="bi bi-box"></i> ${h.modulo}</small>` : ''}
                            </div>
                        </div>
                    </div>
                `;
            }).join('') +
        '</div>';
    },

    /**
     * Timeline local basico cuando no hay conexion
     */
    renderTimelineLocal: function(orden) {
        const container = document.getElementById('historialTimeline');
        if (!container) return;

        const eventos = [];
        if (orden.fechaCreacion) eventos.push({ ts: orden.fechaCreacion, accion: 'CREADA', detalle: 'Orden creada' });
        if (orden.fechaModificacion) eventos.push({ ts: orden.fechaModificacion, accion: 'EDITADA', detalle: 'Ultima modificacion' });

        container.innerHTML = eventos.length > 0
            ? eventos.map(e => `<div class="mb-2"><small class="text-muted">${this.formatFechaCompleta(e.ts)}</small> - <strong>${e.accion}</strong>: ${e.detalle}</div>`).join('')
            : '<p class="text-muted">Sin datos de historial local</p>';
    },

    /**
     * Iconos por tipo de accion
     */
    getHistorialIcon: function(accion) {
        const iconos = {
            'CREADA': 'bi-plus-circle',
            'EDITADA': 'bi-pencil',
            'CAMBIO_ESTADO': 'bi-arrow-repeat',
            'CAMBIO_ETAPA': 'bi-signpost-split',
            'MOVIDA_KANBAN': 'bi-kanban',
            'ELIMINADA': 'bi-trash',
            'PRODUCCION_REGISTRADA': 'bi-gear',
            'DESPACHO': 'bi-truck',
            'PRODUCTO_TERMINADO': 'bi-box-seam',
            'PAUSA': 'bi-pause-circle',
            'PLAY': 'bi-play-circle',
            'COMPLETADA': 'bi-check-circle'
        };
        return iconos[accion] || 'bi-circle';
    },

    /**
     * Colores por tipo de accion
     */
    getHistorialColor: function(accion) {
        const colores = {
            'CREADA': '#28a745',
            'EDITADA': '#0d6efd',
            'CAMBIO_ESTADO': '#6f42c1',
            'CAMBIO_ETAPA': '#fd7e14',
            'MOVIDA_KANBAN': '#17a2b8',
            'ELIMINADA': '#dc3545',
            'PRODUCCION_REGISTRADA': '#20c997',
            'DESPACHO': '#6610f2',
            'PRODUCTO_TERMINADO': '#198754',
            'PAUSA': '#ffc107',
            'PLAY': '#0dcaf0',
            'COMPLETADA': '#28a745'
        };
        return colores[accion] || '#6c757d';
    },

    /**
     * Labels legibles por tipo de accion
     */
    getHistorialLabel: function(accion) {
        const labels = {
            'CREADA': 'Orden Creada',
            'EDITADA': 'Orden Editada',
            'CAMBIO_ESTADO': 'Cambio de Estado',
            'CAMBIO_ETAPA': 'Cambio de Etapa',
            'MOVIDA_KANBAN': 'Movida en Kanban',
            'ELIMINADA': 'Orden Eliminada',
            'PRODUCCION_REGISTRADA': 'Produccion Registrada',
            'DESPACHO': 'Despacho Realizado',
            'PRODUCTO_TERMINADO': 'Producto Terminado',
            'PAUSA': 'Produccion Pausada',
            'PLAY': 'Produccion Iniciada',
            'COMPLETADA': 'Fase Completada'
        };
        return labels[accion] || accion;
    },

    /**
     * Formatea fecha corta
     */
    formatFecha: function(fechaISO) {
        if (!fechaISO) return '-';
        return new Date(fechaISO).toLocaleDateString('es-VE');
    },

    /**
     * Formatea fecha completa con hora
     */
    formatFechaCompleta: function(fechaISO) {
        if (!fechaISO) return '-';
        return new Date(fechaISO).toLocaleString('es-VE', {
            day: '2-digit', month: '2-digit', year: 'numeric',
            hour: '2-digit', minute: '2-digit'
        });
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
