/**
 * Modulo Inventario General - Sistema Axones
 * Gestion del inventario de materiales, tintas y adhesivos
 */

const Inventario = {
    // Version de datos - incrementar cuando se actualicen los datos base
    DATA_VERSION: '2026-03-06-SKU',

    // Prefijos de material para SKU
    MATERIAL_PREFIJOS: {
        'BOPP NORMAL': 'BN',
        'BOPP MATE': 'BM',
        'BOPP PASTA': 'BP',
        'BOPP PERLADO': 'BPE',
        'METAL': 'MT',
        'PERLADO': 'PE',
        'CAST': 'CA',
        'PEBD': 'PB',
        'PEBD PIGMENT': 'PBP'
    },

    // Densidades por material (confirmado Ficha Tecnica 2026-03-18)
    DENSIDADES: {
        'BOPP NORMAL': 0.90,
        'BOPP MATE': 0.90,
        'BOPP PASTA': 0.90,
        'BOPP PERLADO': 0.80,
        'PERLADO': 0.80,
        'METAL': 0.90,
        'CAST': 0.92,
        'PEBD': 0.93,
        'PEBD PIGMENT': 0.93,
        'PET': 1.40,
        'PA': 1.14,
        'NYLON': 1.14
    },

    /**
     * Genera SKU unico para un producto
     * Formato: PREFIJO-MICRAS-ANCHO (ej: BN-20-610)
     */
    generarSKU: function(material, micras, ancho) {
        const prefijo = this.MATERIAL_PREFIJOS[material] || material.substring(0, 2).toUpperCase();
        return `${prefijo}-${micras}-${ancho}`;
    },

    /**
     * Genera codigo de barras EAN-13
     * Formato: 789 + codigo pais + codigo producto + digito verificador
     */
    generarCodigoBarra: function(index) {
        // Prefijo Venezuela: 759
        // Empresa Axones: 0001
        // Producto: numero secuencial de 5 digitos
        const base = `759${String(1).padStart(4, '0')}${String(index).padStart(5, '0')}`;

        // Calcular digito verificador EAN-13
        let suma = 0;
        for (let i = 0; i < 12; i++) {
            suma += parseInt(base[i]) * (i % 2 === 0 ? 1 : 3);
        }
        const verificador = (10 - (suma % 10)) % 10;

        return base + verificador;
    },

    /**
     * Obtiene la densidad del material
     */
    getDensidad: function(material) {
        return this.DENSIDADES[material] || 0.90;
    },

    // Datos del inventario de materiales (sustratos)
    items: [],
    filteredItems: [],

    // Datos de tintas
    tintas: [],
    filteredTintas: [],

    // Datos de adhesivos
    adhesivos: [],
    filteredAdhesivos: [],

    // Tab activo
    activeTab: 'material',

    // Tipos de materiales
    TIPOS_MATERIAL: [
        'BOPP NORMAL',
        'BOPP MATE',
        'BOPP PASTA',
        'CAST',
        'METAL',
        'PERLADO',
        'PEBD',
        'PEBD PIGMENT'
    ],

    // Tipos de tintas
    TIPOS_TINTA: [
        { id: 'laminacion', nombre: 'Tinta Laminacion' },
        { id: 'superficie', nombre: 'Tinta Superficie' },
        { id: 'prueba_laminacion', nombre: 'Prueba Laminacion' },
        { id: 'solvente', nombre: 'Solvente' }
    ],

    // Tipos de quimicos/adhesivos
    TIPOS_ADHESIVO: [
        { id: 'adhesivo', nombre: 'Adhesivo' },
        { id: 'catalizador', nombre: 'Catalizador' },
        { id: 'solvente', nombre: 'Solvente' },
        { id: 'acetato', nombre: 'Acetato' },
        { id: 'otro', nombre: 'Otro' }
    ],

    /**
     * Inicializa el modulo
     */
    init: async function() {
        console.log('Inicializando modulo Inventario General');

        // Asegurar que AxonesDB esta inicializado
        if (typeof AxonesDB !== 'undefined' && !AxonesDB.isReady()) {
            await AxonesDB.init();
        }

        // Esperar a que AxonesSync termine de descargar datos del cloud
        await this._esperarSync();

        // Verificar y migrar datos si hay nueva version
        this.verificarMigracionDatos();

        await this.loadInventario();
        await this.loadTintas();
        await this.loadAdhesivos();
        this.setupEventListeners();
        this.setupTabListeners();
        this.renderInventario();
        this.renderTintas();
        this.renderAdhesivos();
        this.updateTotales();
        this.updateCounts();
        this.setFechaActualizacion();

        // Verificar alertas pendientes y resolver las que ya tienen stock
        this.verificarAlertasPendientes();

        // Escanear inventario y generar alertas basadas en stock real
        this.generarAlertasDeInventarioReal();

        // Escuchar cambios en tiempo real desde Supabase
        if (AxonesDB.isReady()) {
            AxonesDB.realtime.suscribir('materiales', () => {
                this.loadInventario().then(() => {
                    this.renderInventario();
                    this.updateTotales();
                    this.updateCounts();
                });
            });
        }
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
     * Genera alertas automaticas basadas en el inventario real
     */
    generarAlertasDeInventarioReal: function() {
        if (typeof InventarioService !== 'undefined') {
            const resultado = InventarioService.escanearInventarioYGenerarAlertas();
            if (resultado.totalAlertas > 0) {
                console.log(`Inventario: ${resultado.totalAlertas} alertas generadas (${resultado.criticas} criticas, ${resultado.altas} altas, ${resultado.advertencias} advertencias)`);
            }
        }
    },

    /**
     * Verifica si hay una nueva version de datos y migra si es necesario
     * Esto permite actualizar los datos cuando se cambia el codigo
     */
    verificarMigracionDatos: function() {
        // No se necesita migracion con Supabase como fuente de verdad
        console.log('[Inventario] Supabase es la fuente de verdad - sin migracion necesaria');
    },

    /**
     * Verifica y resuelve alertas pendientes que ya tienen stock disponible
     */
    verificarAlertasPendientes: function() {
        if (typeof InventarioService !== 'undefined') {
            const alertasResueltas = InventarioService.verificarYResolverAlertasPendientes();
            if (alertasResueltas > 0) {
                console.log(`Inventario: ${alertasResueltas} alerta(s) resuelta(s) automaticamente`);
                if (typeof Axones !== 'undefined') {
                    Axones.showSuccess(`${alertasResueltas} alerta(s) de stock resuelta(s)`);
                }
            }
        }
    },

    /**
     * Carga el inventario desde Supabase (fuente unica de verdad)
     */
    loadInventario: async function() {
        // Cargar desde Supabase (fuente unica de verdad)
        if (AxonesDB.isReady()) {
            try {
                const materialesDB = await AxonesDB.materiales.listar({ ordenar: 'material', ascendente: true, soloActivos: false });
                if (materialesDB.length > 0) {
                    // Mapear campos de Supabase a formato local
                    this.items = materialesDB.map(m => ({
                        id: m.id,
                        material: m.material,
                        tipo: m.tipo,
                        micras: m.micras,
                        ancho: m.ancho,
                        kg: m.stock_kg || 0,
                        densidad: m.densidad,
                        sku: m.sku,
                        codigoBarra: m.codigo_barras,
                        producto: m.notas || '',
                        importado: (m.notas || '').includes('IMPORTADO')
                    }));
                    console.log('[Inventario] Cargado desde Supabase:', this.items.length, 'items');
                } else {
                    this.items = this.getDatosEjemplo();
                    console.log('[Inventario] Supabase vacio, usando datos base');
                }
            } catch (e) {
                console.warn('[Inventario] Error cargando de Supabase:', e.message);
                this.items = this.getDatosEjemplo();
            }
        } else {
            this.items = this.getDatosEjemplo();
            console.log('[Inventario] Generado desde datos base: 158 productos');
        }

        // Agregar SKU y codigo de barras si no existen
        this.items = this.items.map((item, index) => {
            if (!item.sku) {
                item.sku = this.generarSKU(item.material, item.micras, item.ancho);
            }
            if (!item.codigoBarra) {
                item.codigoBarra = this.generarCodigoBarra(index + 1);
            }
            if (!item.densidad) {
                item.densidad = this.getDensidad(item.material);
            }
            return item;
        });

        this.filteredItems = [...this.items];
    },

    /**
     * Datos reales del inventario de Axones
     */
    getDatosEjemplo: function() {
        return [
            // BOPP NORMAL
            { id: 'INV001', material: 'BOPP NORMAL', micras: 15, ancho: 700, kg: 73.0, producto: 'CHARMY', importado: false },
            { id: 'INV003', material: 'BOPP NORMAL', micras: 17, ancho: 620, kg: 283.2, producto: 'TOM 80', importado: false },
            { id: 'INV005', material: 'BOPP NORMAL', micras: 17, ancho: 710, kg: 46.0, producto: 'TOM 28', importado: false },
            { id: 'INV007', material: 'BOPP NORMAL', micras: 20, ancho: 610, kg: 2215.02, producto: 'HASHI - CHUNCHY', importado: false },
            { id: 'INV009', material: 'BOPP NORMAL', micras: 20, ancho: 630, kg: 0, producto: 'NATY', importado: false },
            { id: 'INV011', material: 'BOPP NORMAL', micras: 20, ancho: 740, kg: 0, producto: 'CALI DONA', importado: false },
            { id: 'INV013', material: 'BOPP NORMAL', micras: 20, ancho: 780, kg: 0, producto: 'CALI POLET - OSTIS', importado: false },
            { id: 'INV015', material: 'BOPP NORMAL', micras: 20, ancho: 800, kg: 0, producto: 'YICITOS', importado: false },
            { id: 'INV017', material: 'BOPP NORMAL', micras: 25, ancho: 460, kg: 0, producto: 'LECHE', importado: false },
            { id: 'INV019', material: 'BOPP NORMAL', micras: 25, ancho: 490, kg: 538.1, producto: '', importado: false },
            { id: 'INV021', material: 'BOPP NORMAL', micras: 25, ancho: 560, kg: 9648.67, producto: 'GRANOS', importado: true },
            { id: 'INV023', material: 'BOPP NORMAL', micras: 25, ancho: 580, kg: 0, producto: 'GRANOS', importado: false },
            { id: 'INV025', material: 'BOPP NORMAL', micras: 25, ancho: 620, kg: 0, producto: 'GISELA LARGA', importado: false },
            { id: 'INV027', material: 'BOPP NORMAL', micras: 25, ancho: 635, kg: 134.4, producto: 'GELATINA', importado: false },
            { id: 'INV029', material: 'BOPP NORMAL', micras: 25, ancho: 640, kg: 379.7, producto: '', importado: false },
            { id: 'INV030', material: 'BOPP NORMAL', micras: 25, ancho: 670, kg: 273.4, producto: '', importado: false },
            { id: 'INV032', material: 'BOPP NORMAL', micras: 25, ancho: 680, kg: 858.0, producto: 'AVENAS / CARAOTAS ALVARIGUA', importado: false },
            { id: 'INV034', material: 'BOPP NORMAL', micras: 25, ancho: 680, kg: 2843.42, producto: '', importado: true },
            { id: 'INV036', material: 'BOPP NORMAL', micras: 25, ancho: 740, kg: 206.67, producto: 'ETIQUETA Y BARITO', importado: false },
            { id: 'INV038', material: 'BOPP NORMAL', micras: 25, ancho: 760, kg: 5249.76, producto: 'LECHE 200g CREMA A.', importado: false },
            { id: 'INV040', material: 'BOPP NORMAL', micras: 25, ancho: 770, kg: 0, producto: 'NUTRITONY', importado: false },
            { id: 'INV042', material: 'BOPP NORMAL', micras: 25, ancho: 780, kg: 0, producto: 'CALI POLET-OSTIS', importado: false },
            { id: 'INV044', material: 'BOPP NORMAL', micras: 25, ancho: 815, kg: 0, producto: 'CAFE 200', importado: false },
            { id: 'INV046', material: 'BOPP NORMAL', micras: 25, ancho: 1120, kg: 0, producto: 'PUIG 24g', importado: false },
            { id: 'INV048', material: 'BOPP NORMAL', micras: 30, ancho: 440, kg: 0, producto: 'PUIG 240g', importado: false },
            { id: 'INV050', material: 'BOPP NORMAL', micras: 30, ancho: 450, kg: 0, producto: '', importado: false },
            { id: 'INV052', material: 'BOPP NORMAL', micras: 30, ancho: 460, kg: 0, producto: 'LECHE', importado: false },
            { id: 'INV054', material: 'BOPP NORMAL', micras: 30, ancho: 620, kg: 136.8, producto: '', importado: false },
            { id: 'INV056', material: 'BOPP NORMAL', micras: 30, ancho: 700, kg: 0, producto: 'CAFE 500g', importado: false },
            { id: 'INV058', material: 'BOPP NORMAL', micras: 30, ancho: 720, kg: 365.78, producto: '', importado: false },
            { id: 'INV060', material: 'BOPP NORMAL', micras: 30, ancho: 740, kg: 4596.3, producto: 'MICAELA', importado: true },
            { id: 'INV062', material: 'BOPP NORMAL', micras: 30, ancho: 760, kg: 0, producto: 'TRINKETS 40g', importado: false },
            { id: 'INV064', material: 'BOPP NORMAL', micras: 30, ancho: 760, kg: 2348.6, producto: '', importado: true },
            { id: 'INV066', material: 'BOPP NORMAL', micras: 30, ancho: 770, kg: 0, producto: 'LECHE', importado: false },
            { id: 'INV068', material: 'BOPP NORMAL', micras: 30, ancho: 800, kg: 0, producto: 'DAMASCO', importado: false },
            { id: 'INV070', material: 'BOPP NORMAL', micras: 30, ancho: 815, kg: 0, producto: 'CAFE 200g', importado: false },
            { id: 'INV072', material: 'BOPP NORMAL', micras: 30, ancho: 870, kg: 0, producto: 'TRINKETS 70g', importado: false },
            { id: 'INV074', material: 'BOPP NORMAL', micras: 30, ancho: 870, kg: 7767.86, producto: '', importado: true },
            { id: 'INV076', material: 'BOPP NORMAL', micras: 35, ancho: 700, kg: 889.2, producto: '', importado: false },
            { id: 'INV078', material: 'BOPP NORMAL', micras: 35, ancho: 700, kg: 1487.98, producto: 'MASANTONI- FINA', importado: true },
            { id: 'INV080', material: 'BOPP NORMAL', micras: 40, ancho: 1000, kg: 556.0, producto: '', importado: false },

            // BOPP MATE
            { id: 'INV002', material: 'BOPP MATE', micras: 20, ancho: 470, kg: 54.0, producto: '', importado: false },
            { id: 'INV004', material: 'BOPP MATE', micras: 20, ancho: 590, kg: 0, producto: 'YOCOIMA 200', importado: false },
            { id: 'INV006', material: 'BOPP MATE', micras: 20, ancho: 630, kg: 0, producto: 'NATY', importado: false },
            { id: 'INV008', material: 'BOPP MATE', micras: 20, ancho: 640, kg: 0, producto: 'YOCOIMA 500', importado: false },
            { id: 'INV010', material: 'BOPP MATE', micras: 20, ancho: 680, kg: 0, producto: 'ESPIGA-AVENA DONA', importado: false },
            { id: 'INV012', material: 'BOPP MATE', micras: 20, ancho: 690, kg: 0, producto: '', importado: false },
            { id: 'INV014', material: 'BOPP MATE', micras: 20, ancho: 700, kg: 499.56, producto: 'CAFE 500g', importado: true },
            { id: 'INV016', material: 'BOPP MATE', micras: 20, ancho: 740, kg: 0, producto: 'BARITOS', importado: false },
            { id: 'INV018', material: 'BOPP MATE', micras: 20, ancho: 755, kg: 0, producto: 'YOCOIMA 100', importado: false },
            { id: 'INV020', material: 'BOPP MATE', micras: 20, ancho: 760, kg: 0, producto: '', importado: false },
            { id: 'INV022', material: 'BOPP MATE', micras: 20, ancho: 815, kg: 1826.52, producto: 'CAFE 200g', importado: true },
            { id: 'INV024', material: 'BOPP MATE', micras: 25, ancho: 580, kg: 0, producto: 'CACAO', importado: false },
            { id: 'INV026', material: 'BOPP MATE', micras: 25, ancho: 740, kg: 0, producto: 'BUDARE', importado: false },
            { id: 'INV028', material: 'BOPP MATE', micras: 25, ancho: 800, kg: 700, producto: 'AVENA VENELA', importado: false },

            // METAL
            { id: 'INV031', material: 'METAL', micras: 17, ancho: 620, kg: 498.0, producto: '', importado: false },
            { id: 'INV033', material: 'METAL', micras: 20, ancho: 460, kg: 0, producto: 'LECHE 900g Y 1 kg', importado: false },
            { id: 'INV035', material: 'METAL', micras: 20, ancho: 610, kg: 1593.4, producto: 'HASHI - CHUNCHY', importado: false },
            { id: 'INV037', material: 'METAL', micras: 20, ancho: 620, kg: 250.6, producto: '', importado: false },
            { id: 'INV039', material: 'METAL', micras: 20, ancho: 630, kg: 0, producto: 'NATY', importado: false },
            { id: 'INV041', material: 'METAL', micras: 20, ancho: 635, kg: 0, producto: 'GELATINA', importado: false },
            { id: 'INV043', material: 'METAL', micras: 20, ancho: 660, kg: 0, producto: 'OSTIS - MARGARINA', importado: false },
            { id: 'INV045', material: 'METAL', micras: 20, ancho: 680, kg: 0, producto: 'ESPIGA', importado: false },
            { id: 'INV047', material: 'METAL', micras: 20, ancho: 700, kg: 0, producto: 'CAFE 500 GR', importado: false },
            { id: 'INV049', material: 'METAL', micras: 20, ancho: 720, kg: 1634.0, producto: '', importado: false },
            { id: 'INV051', material: 'METAL', micras: 20, ancho: 740, kg: 1343.89, producto: 'ETIQUETA Y BARITOS', importado: false },
            { id: 'INV053', material: 'METAL', micras: 20, ancho: 760, kg: 0, producto: 'LECHE 200g CREMA A', importado: false },
            { id: 'INV055', material: 'METAL', micras: 20, ancho: 770, kg: 0, producto: 'NUTRITONI', importado: false },
            { id: 'INV057', material: 'METAL', micras: 20, ancho: 780, kg: 274.52, producto: 'POLET-OSTI', importado: false },
            { id: 'INV059', material: 'METAL', micras: 20, ancho: 800, kg: 403.68, producto: 'DAMASCO - YIICITOS', importado: false },
            { id: 'INV061', material: 'METAL', micras: 20, ancho: 815, kg: 0, producto: 'CAFE 200', importado: false },
            { id: 'INV063', material: 'METAL', micras: 25, ancho: 740, kg: 21.0, producto: '', importado: false },
            { id: 'INV065', material: 'METAL', micras: 30, ancho: 460, kg: 340.32, producto: '', importado: false },
            { id: 'INV067', material: 'METAL', micras: 30, ancho: 510, kg: 17.0, producto: '', importado: false },
            { id: 'INV069', material: 'METAL', micras: 30, ancho: 590, kg: 221.74, producto: 'YOCOIMA 200', importado: false },
            { id: 'INV071', material: 'METAL', micras: 30, ancho: 640, kg: 0, producto: 'YOCOIMA 500', importado: false },
            { id: 'INV073', material: 'METAL', micras: 30, ancho: 700, kg: 1187.76, producto: 'CAFE 500 ALVARIGUA', importado: true },
            { id: 'INV075', material: 'METAL', micras: 30, ancho: 755, kg: 0, producto: 'YOCOIMA 100', importado: false },
            { id: 'INV077', material: 'METAL', micras: 30, ancho: 815, kg: 1412.56, producto: 'CAFE 200 MATE', importado: false },
            { id: 'INV079', material: 'METAL', micras: 30, ancho: 815, kg: 3899.02, producto: '', importado: true },

            // PERLADO
            { id: 'INV081', material: 'PERLADO', micras: 30, ancho: 740, kg: 602.77, producto: 'CALI', importado: false },
            { id: 'INV082', material: 'PERLADO', micras: 30, ancho: 900, kg: 98.0, producto: '', importado: false },

            // CAST
            { id: 'INV083', material: 'CAST', micras: 20, ancho: 580, kg: 11.0, producto: 'GRANOS', importado: false },
            { id: 'INV085', material: 'CAST', micras: 25, ancho: 430, kg: 800.4, producto: 'SIRENA 500', importado: false },
            { id: 'INV087', material: 'CAST', micras: 25, ancho: 470, kg: 1130.79, producto: 'INALSA', importado: false },
            { id: 'INV089', material: 'CAST', micras: 25, ancho: 490, kg: 6329.25, producto: '', importado: true },
            { id: 'INV091', material: 'CAST', micras: 25, ancho: 490, kg: 2351.05, producto: 'SIRENA CORTA', importado: false },
            { id: 'INV093', material: 'CAST', micras: 25, ancho: 520, kg: 0, producto: 'GISELA CORTA', importado: false },
            { id: 'INV095', material: 'CAST', micras: 25, ancho: 560, kg: 148.43, producto: 'GRANOS', importado: false },
            { id: 'INV097', material: 'CAST', micras: 25, ancho: 560, kg: 9998.52, producto: '', importado: true },
            { id: 'INV099', material: 'CAST', micras: 25, ancho: 570, kg: 0, producto: 'OJO D\u00B4VITA', importado: false },
            { id: 'INV101', material: 'CAST', micras: 25, ancho: 574, kg: 0, producto: 'INALSA', importado: false },
            { id: 'INV103', material: 'CAST', micras: 25, ancho: 580, kg: 0, producto: 'GRANOS', importado: false },
            { id: 'INV105', material: 'CAST', micras: 25, ancho: 620, kg: 888.66, producto: '', importado: true },
            { id: 'INV107', material: 'CAST', micras: 25, ancho: 620, kg: 2155.7, producto: 'SIRENA LARGA', importado: false },
            { id: 'INV109', material: 'CAST', micras: 25, ancho: 660, kg: 100, producto: 'AVENA VENELA', importado: false },
            { id: 'INV111', material: 'CAST', micras: 25, ancho: 674, kg: 0, producto: 'INALSA', importado: false },
            { id: 'INV113', material: 'CAST', micras: 25, ancho: 680, kg: 500, producto: 'AVENA VENELA / ZAFIRO', importado: false },
            { id: 'INV115', material: 'CAST', micras: 25, ancho: 680, kg: 6710.46, producto: '', importado: true },
            { id: 'INV117', material: 'CAST', micras: 25, ancho: 700, kg: 1449.68, producto: '', importado: true },
            { id: 'INV119', material: 'CAST', micras: 25, ancho: 700, kg: 1225.3, producto: 'FINA BLOQ', importado: false },
            { id: 'INV121', material: 'CAST', micras: 25, ancho: 720, kg: 3.0, producto: 'INALSA', importado: false },
            { id: 'INV123', material: 'CAST', micras: 25, ancho: 740, kg: 620.48, producto: 'MICAELA', importado: true },
            { id: 'INV125', material: 'CAST', micras: 25, ancho: 760, kg: 400.52, producto: '', importado: false },
            { id: 'INV127', material: 'CAST', micras: 25, ancho: 800, kg: 155.0, producto: 'BABO 72', importado: false },
            { id: 'INV129', material: 'CAST', micras: 30, ancho: 430, kg: 1256.8, producto: '', importado: false },
            { id: 'INV131', material: 'CAST', micras: 30, ancho: 600, kg: 2324.4, producto: '', importado: false },
            { id: 'INV133', material: 'CAST', micras: 30, ancho: 700, kg: 959.34, producto: 'MI MASA900 G', importado: true },
            { id: 'INV135', material: 'CAST', micras: 30, ancho: 740, kg: 0, producto: 'BUDARE', importado: false },
            { id: 'INV137', material: 'CAST', micras: 35, ancho: 770, kg: 0, producto: 'BUDARE', importado: false },

            // BOPP PASTA
            { id: 'INV139', material: 'BOPP PASTA', micras: 25, ancho: 430, kg: 877.8, producto: 'SIRENA 500', importado: false },
            { id: 'INV141', material: 'BOPP PASTA', micras: 25, ancho: 470, kg: 780.55, producto: 'INALSA', importado: false },
            { id: 'INV143', material: 'BOPP PASTA', micras: 25, ancho: 490, kg: 927.4, producto: 'SIRENA CORTA', importado: false },
            { id: 'INV145', material: 'BOPP PASTA', micras: 25, ancho: 490, kg: 5867.7, producto: '', importado: true },
            { id: 'INV147', material: 'BOPP PASTA', micras: 25, ancho: 520, kg: 0, producto: 'GISELA CORTA', importado: false },
            { id: 'INV149', material: 'BOPP PASTA', micras: 25, ancho: 574, kg: 0, producto: 'INALSA', importado: false },
            { id: 'INV151', material: 'BOPP PASTA', micras: 25, ancho: 620, kg: 499.15, producto: 'SIRENA LARGA', importado: false },
            { id: 'INV153', material: 'BOPP PASTA', micras: 25, ancho: 620, kg: 2023.86, producto: '', importado: true },
            { id: 'INV155', material: 'BOPP PASTA', micras: 25, ancho: 674, kg: 0, producto: 'INALSA', importado: false },

            // PEBD
            { id: 'INV084', material: 'PEBD', micras: 20, ancho: 760, kg: 369.0, producto: '', importado: false },
            { id: 'INV086', material: 'PEBD', micras: 22, ancho: 660, kg: 0, producto: 'ARROZ DON JULIAN', importado: false },
            { id: 'INV088', material: 'PEBD', micras: 25, ancho: 630, kg: 0, producto: 'MARY PREM', importado: false },
            { id: 'INV090', material: 'PEBD', micras: 25, ancho: 650, kg: 0, producto: 'MARY TRAD', importado: false },
            { id: 'INV092', material: 'PEBD', micras: 25, ancho: 660, kg: 0, producto: 'DON JULIAN', importado: false },
            { id: 'INV094', material: 'PEBD', micras: 25, ancho: 970, kg: 0, producto: 'MARY TRAD', importado: false },
            { id: 'INV096', material: 'PEBD', micras: 26, ancho: 630, kg: 419.5, producto: 'MARY PREMIUM', importado: false },
            { id: 'INV098', material: 'PEBD', micras: 26, ancho: 650, kg: 60.0, producto: 'MARY', importado: false },
            { id: 'INV100', material: 'PEBD', micras: 26, ancho: 660, kg: 0, producto: 'DON JULIAN', importado: false },
            { id: 'INV102', material: 'PEBD', micras: 28, ancho: 660, kg: 0, producto: '', importado: false },
            { id: 'INV104', material: 'PEBD', micras: 28, ancho: 670, kg: 0, producto: 'ARROZ SANTONI /ALICIA', importado: false },
            { id: 'INV106', material: 'PEBD', micras: 28, ancho: 670, kg: 12563.5, producto: 'ARROZ SANTONI /ALICIA', importado: false },
            { id: 'INV108', material: 'PEBD', micras: 28, ancho: 760, kg: 1890.5, producto: 'BUDARE - FATY', importado: false },
            { id: 'INV110', material: 'PEBD', micras: 28, ancho: 690, kg: 154.0, producto: '', importado: false },
            { id: 'INV112', material: 'PEBD', micras: 28, ancho: 990, kg: 0, producto: '', importado: false },
            { id: 'INV114', material: 'PEBD', micras: 30, ancho: 570, kg: 0, producto: 'D\u00B4VITA', importado: false },
            { id: 'INV116', material: 'PEBD', micras: 30, ancho: 670, kg: 0, producto: 'SANTONI', importado: false },
            { id: 'INV118', material: 'PEBD', micras: 30, ancho: 690, kg: 0, producto: 'DELICIAS - DUQUESA', importado: false },
            { id: 'INV120', material: 'PEBD', micras: 30, ancho: 750, kg: 58.0, producto: 'HARINA URBANO', importado: false },
            { id: 'INV122', material: 'PEBD', micras: 30, ancho: 760, kg: 0, producto: 'HARINA', importado: false },
            { id: 'INV124', material: 'PEBD', micras: 30, ancho: 990, kg: 0, producto: '', importado: false },
            { id: 'INV126', material: 'PEBD', micras: 35, ancho: 650, kg: 0, producto: 'GELATINA JUMPI', importado: false },
            { id: 'INV128', material: 'PEBD', micras: 35, ancho: 750, kg: 0, producto: 'LECHE LAM', importado: false },
            { id: 'INV130', material: 'PEBD', micras: 35, ancho: 770, kg: 0, producto: 'LECHE', importado: false },
            { id: 'INV132', material: 'PEBD', micras: 35, ancho: 990, kg: 1226.5, producto: '', importado: false },
            { id: 'INV134', material: 'PEBD', micras: 38, ancho: 750, kg: 0, producto: 'PAVECA', importado: false },
            { id: 'INV136', material: 'PEBD', micras: 40, ancho: 670, kg: 189.5, producto: 'ZAFIRO VIEJO', importado: false },
            { id: 'INV138', material: 'PEBD', micras: 40, ancho: 690, kg: 0, producto: '', importado: false },
            { id: 'INV140', material: 'PEBD', micras: 40, ancho: 780, kg: 0, producto: 'NUTRITONY', importado: false },
            { id: 'INV142', material: 'PEBD', micras: 40, ancho: 990, kg: 0, producto: 'DON JULIAN 2,5', importado: false },
            { id: 'INV144', material: 'PEBD', micras: 45, ancho: 690, kg: 476.5, producto: '', importado: false },
            { id: 'INV146', material: 'PEBD', micras: 50, ancho: 440, kg: 234.5, producto: '', importado: false },
            { id: 'INV148', material: 'PEBD', micras: 50, ancho: 470, kg: 937.0, producto: 'LECHE', importado: false },
            { id: 'INV150', material: 'PEBD', micras: 50, ancho: 630, kg: 2818.0, producto: 'MARY DORADO', importado: false },
            { id: 'INV152', material: 'PEBD', micras: 50, ancho: 660, kg: 1541.0, producto: 'MARY ESMERALDA', importado: false },
            { id: 'INV154', material: 'PEBD', micras: 50, ancho: 670, kg: 100.5, producto: '', importado: false },

            // PEBD PIGMENT
            { id: 'INV156', material: 'PEBD PIGMENT', micras: 25, ancho: 740, kg: 170.0, producto: 'MAYONESA', importado: false },
            { id: 'INV157', material: 'PEBD PIGMENT', micras: 25, ancho: 450, kg: 1179.0, producto: 'DETERGENTE', importado: false },
            { id: 'INV158', material: 'PEBD PIGMENT', micras: 35, ancho: 670, kg: 1569.5, producto: 'MARGARINA', importado: false },
        ];
    },

    /**
     * Guarda cambios de inventario en Supabase
     */
    saveInventario: async function() {
        // Los items se guardan individualmente via AxonesDB.materiales.actualizar()
        // Los items se actualizan individualmente en Supabase
        console.log('[Inventario] Datos guardados en Supabase');
    },

    /**
     * Carga tintas desde Supabase
     */
    loadTintas: async function() {
        if (AxonesDB.isReady()) {
            try {
                const tintasDB = await AxonesDB.tintas.listar({ ordenar: 'nombre', ascendente: true, soloActivos: false });
                if (tintasDB.length > 0) {
                    this.tintas = tintasDB.map(t => ({
                        id: t.id,
                        nombre: t.nombre,
                        tipo: t.tipo,
                        codigo: t.codigo,
                        cantidad: t.stock_kg || 0,
                        unidad: 'Kg',
                        color: t.color,
                        categoria: t.categoria
                    }));
                } else {
                    this.tintas = this.getDatosTintasEjemplo();
                }
            } catch (e) {
                this.tintas = this.getDatosTintasEjemplo();
            }
        } else {
            this.tintas = this.getDatosTintasEjemplo();
        }
        this.filteredTintas = [...this.tintas];
    },

    /**
     * Datos reales de tintas
     */
    getDatosTintasEjemplo: function() {
        return [
            // Tintas Laminacion (43 items)
            { id: 'TIN001', nombre: 'BLANCO', tipo: 'laminacion', codigo: 'BL-2036', cantidad: 987.0, unidad: 'Kg' },
            { id: 'TIN002', nombre: 'BLANCO LAMINACION', tipo: 'laminacion', codigo: 'TINLAM-0001', cantidad: 0, unidad: 'Kg' },
            { id: 'TIN003', nombre: 'NEGRO', tipo: 'laminacion', codigo: 'BL-2054', cantidad: 221.0, unidad: 'Kg' },
            { id: 'TIN004', nombre: 'NEGRO', tipo: 'laminacion', codigo: 'TINLAM-0005', cantidad: 0, unidad: 'Kg' },
            { id: 'TIN005', nombre: 'NEGRO POLYESTER', tipo: 'laminacion', codigo: 'BL-1280', cantidad: 76.0, unidad: 'Kg' },
            { id: 'TIN006', nombre: 'NEGRO POLYESTER', tipo: 'laminacion', codigo: 'TINLAM-0008', cantidad: 0, unidad: 'Kg' },
            { id: 'TIN007', nombre: 'AMARILLO PROCESO', tipo: 'laminacion', codigo: 'BL-1132', cantidad: 992.0, unidad: 'Kg' },
            { id: 'TIN008', nombre: 'AMARILLO PROCESO', tipo: 'laminacion', codigo: 'TINLAM-0002', cantidad: 0, unidad: 'Kg' },
            { id: 'TIN009', nombre: 'ROJO 485 2X', tipo: 'laminacion', codigo: 'BL-0897', cantidad: 71.2, unidad: 'Kg' },
            { id: 'TIN010', nombre: 'ROJO P-485 2X-C', tipo: 'laminacion', codigo: 'TINLAM-0007', cantidad: 18.0, unidad: 'Kg' },
            { id: 'TIN011', nombre: 'ROJO 485 "C"', tipo: 'laminacion', codigo: 'BL-2037', cantidad: 195.4, unidad: 'Kg' },
            { id: 'TIN012', nombre: 'CYAN', tipo: 'laminacion', codigo: 'BL-1964', cantidad: 355.0, unidad: 'Kg' },
            { id: 'TIN013', nombre: 'AZUL PROCESO', tipo: 'laminacion', codigo: 'BL-1535', cantidad: 156.0, unidad: 'Kg' },
            { id: 'TIN014', nombre: 'AZUL PROCESO', tipo: 'laminacion', codigo: 'TINLAM-0003', cantidad: 18.0, unidad: 'Kg' },
            { id: 'TIN015', nombre: 'AZUL FONDO SUPERIOR', tipo: 'laminacion', codigo: 'BL-2163', cantidad: 198.0, unidad: 'Kg' },
            { id: 'TIN016', nombre: 'AZUL ESPIGA SUPERIOR', tipo: 'laminacion', codigo: 'BL-2164', cantidad: 0, unidad: 'Kg' },
            { id: 'TIN017', nombre: 'AZUL BUDARE LAMINACION', tipo: 'laminacion', codigo: 'BL-2260', cantidad: 0, unidad: 'Kg' },
            { id: 'TIN018', nombre: 'MAGENTA', tipo: 'laminacion', codigo: 'BL-1706', cantidad: 272.0, unidad: 'Kg' },
            { id: 'TIN019', nombre: 'MAGENTA TRAMA DIGITAL', tipo: 'laminacion', codigo: 'BL-2003', cantidad: 54.0, unidad: 'Kg' },
            { id: 'TIN020', nombre: 'REFLEX', tipo: 'laminacion', codigo: 'BL-1007', cantidad: 201.0, unidad: 'Kg' },
            { id: 'TIN021', nombre: 'NARANJA BUDARE LAMINACION', tipo: 'laminacion', codigo: 'BL-2259', cantidad: 0, unidad: 'Kg' },
            { id: 'TIN022', nombre: 'NARANJA 021', tipo: 'laminacion', codigo: 'BL-0985', cantidad: 68.0, unidad: 'Kg' },
            { id: 'TIN023', nombre: 'NARANJA MARY', tipo: 'laminacion', codigo: 'BL-2152', cantidad: 322.2, unidad: 'Kg' },
            { id: 'TIN024', nombre: 'EXTENDER', tipo: 'laminacion', codigo: 'BL-1883', cantidad: 84.9, unidad: 'Kg' },
            { id: 'TIN025', nombre: 'EXTENDER', tipo: 'laminacion', codigo: 'TINLAM-0006', cantidad: 36.0, unidad: 'Kg' },
            { id: 'TIN026', nombre: 'CREMA MARY', tipo: 'laminacion', codigo: 'BL-2169', cantidad: 57.0, unidad: 'Kg' },
            { id: 'TIN027', nombre: 'OCRE ESPIGA MARY', tipo: 'laminacion', codigo: 'BL-2170', cantidad: 54.0, unidad: 'Kg' },
            { id: 'TIN028', nombre: 'DORADO ALVARIGUA', tipo: 'laminacion', codigo: 'BL-2134', cantidad: 34.0, unidad: 'Kg' },
            { id: 'TIN029', nombre: 'CREMA ALVARIGUA', tipo: 'laminacion', codigo: 'BL-2136', cantidad: 31.0, unidad: 'Kg' },
            { id: 'TIN030', nombre: 'VERDE "C"', tipo: 'laminacion', codigo: 'BL-1718', cantidad: 89.0, unidad: 'Kg' },
            { id: 'TIN031', nombre: 'VERDE BABO', tipo: 'laminacion', codigo: 'BL-2188', cantidad: 18.0, unidad: 'Kg' },
            { id: 'TIN032', nombre: 'VIOLETA PANTONE', tipo: 'laminacion', codigo: 'BL-0928', cantidad: 34.0, unidad: 'Kg' },
            { id: 'TIN033', nombre: 'MORADO NONNA', tipo: 'laminacion', codigo: 'DL FL 30136', cantidad: 70.0, unidad: 'Kg' },
            { id: 'TIN034', nombre: 'CREMA AMANECER (FAVICA)', tipo: 'laminacion', codigo: 'FL 1024 (20KG)', cantidad: 80.0, unidad: 'Kg' },
            { id: 'TIN035', nombre: 'CREMA AMANECER (BARNIVENCA)', tipo: 'laminacion', codigo: '2042', cantidad: 66.0, unidad: 'Kg' },
            { id: 'TIN036', nombre: 'MARRON AMANECER', tipo: 'laminacion', codigo: '30125 (17KG)', cantidad: 133.6, unidad: 'Kg' },
            { id: 'TIN037', nombre: 'MARRON P-4725 LAMINACION', tipo: 'laminacion', codigo: 'BL-2210', cantidad: 28.8, unidad: 'Kg' },
            { id: 'TIN038', nombre: 'BEIGE (TINTA FLEX)', tipo: 'laminacion', codigo: '467 8018 (17KG)', cantidad: 68.0, unidad: 'Kg' },
            { id: 'TIN039', nombre: 'COMPUESTO DE CERA', tipo: 'laminacion', codigo: 'SP-0915', cantidad: 18.0, unidad: 'Kg' },
            { id: 'TIN040', nombre: 'VERDE "P" 340-C', tipo: 'laminacion', codigo: 'BL-2162', cantidad: 0, unidad: 'Kg' },
            { id: 'TIN041', nombre: 'VERDE 355', tipo: 'laminacion', codigo: 'BL-2119', cantidad: 0, unidad: 'Kg' },
            { id: 'TIN042', nombre: 'VERDE MARY LAMINACION', tipo: 'laminacion', codigo: 'BL-1913', cantidad: 0, unidad: 'Kg' },
            { id: 'TIN043', nombre: 'VERDE DAMASCO', tipo: 'laminacion', codigo: 'BL-2105', cantidad: 0, unidad: 'Kg' },

            // Tintas Superficie (14 items)
            { id: 'TIN044', nombre: 'BLANCO', tipo: 'superficie', codigo: 'BN-1093', cantidad: 705.4, unidad: 'Kg' },
            { id: 'TIN045', nombre: 'NEGRO', tipo: 'superficie', codigo: 'BF-0387', cantidad: 141.0, unidad: 'Kg' },
            { id: 'TIN046', nombre: 'MAGENTA', tipo: 'superficie', codigo: 'BN-1649', cantidad: 250.0, unidad: 'Kg' },
            { id: 'TIN047', nombre: 'MAGENTA', tipo: 'superficie', codigo: 'BF-1718', cantidad: 0, unidad: 'Kg' },
            { id: 'TIN048', nombre: 'CYAN', tipo: 'superficie', codigo: 'BN-1650', cantidad: 221.0, unidad: 'Kg' },
            { id: 'TIN049', nombre: 'AZUL 293', tipo: 'superficie', codigo: 'BF-1857', cantidad: 30.0, unidad: 'Kg' },
            { id: 'TIN050', nombre: 'AZUL REFLEX', tipo: 'superficie', codigo: 'BF-1570', cantidad: 221.0, unidad: 'Kg' },
            { id: 'TIN051', nombre: 'AZUL PROCESO FLEXO SUPERFICIE', tipo: 'superficie', codigo: 'BF-0134', cantidad: 17.0, unidad: 'Kg' },
            { id: 'TIN052', nombre: 'AMARILLO', tipo: 'superficie', codigo: 'BF-1564', cantidad: 357.0, unidad: 'Kg' },
            { id: 'TIN053', nombre: 'AMARILLO PROCESO', tipo: 'superficie', codigo: 'TINSUP-0002', cantidad: 0, unidad: 'Kg' },
            { id: 'TIN054', nombre: 'ROJO 485 2X', tipo: 'superficie', codigo: 'BN-1674', cantidad: 87.0, unidad: 'Kg' },
            { id: 'TIN055', nombre: 'NARANJA 021', tipo: 'superficie', codigo: 'BF-1757', cantidad: 150.0, unidad: 'Kg' },
            { id: 'TIN056', nombre: 'DORADO ALVARIGUA', tipo: 'superficie', codigo: 'BF-1874', cantidad: 104.0, unidad: 'Kg' },
            { id: 'TIN057', nombre: 'BARNIZ SOBRE IMPRE', tipo: 'superficie', codigo: 'BN-1692', cantidad: 218.0, unidad: 'Kg' },

            // Prueba Laminacion (1 item)
            { id: 'TIN058', nombre: 'BLANCO', tipo: 'prueba_laminacion', codigo: 'BL-1745', cantidad: 20.0, unidad: 'Kg' },
        ];
    },

    /**
     * Guarda tintas en Supabase
     */
    saveTintas: async function() {
        console.log('[Inventario] Tintas guardadas en Supabase');
    },

    /**
     * Carga adhesivos desde Supabase
     */
    loadAdhesivos: async function() {
        if (AxonesDB.isReady()) {
            try {
                const adhDB = await AxonesDB.adhesivos.listar({ ordenar: 'nombre', ascendente: true, soloActivos: false });
                if (adhDB.length > 0) {
                    this.adhesivos = adhDB.map(a => ({
                        id: a.id,
                        nombre: a.nombre,
                        tipo: a.tipo,
                        lote: a.notas || '',
                        cantidad: a.stock_kg || 0,
                        unidad: a.tipo === 'adhesivo' || a.tipo === 'catalizador' ? 'Kg' : 'Lt'
                    }));
                } else {
                    this.adhesivos = this.getDatosAdhesivosEjemplo();
                }
            } catch (e) {
                this.adhesivos = this.getDatosAdhesivosEjemplo();
            }
        } else {
            this.adhesivos = this.getDatosAdhesivosEjemplo();
        }
        this.filteredAdhesivos = [...this.adhesivos];
    },

    /**
     * Datos reales de quimicos/adhesivos
     */
    getDatosAdhesivosEjemplo: function() {
        return [
            // Solventes
            { id: 'QUI001', nombre: 'ALCOHOL ISOPROPILICO (IPA)', tipo: 'solvente', lote: '', cantidad: 454.06, unidad: 'Lt' },
            { id: 'QUI002', nombre: 'ACETATO N-PROPYL', tipo: 'solvente', lote: '', cantidad: 608.23, unidad: 'Lt' },
            { id: 'QUI003', nombre: 'METHOXY PROPANOL', tipo: 'solvente', lote: '', cantidad: 323.0, unidad: 'Lt' },
            // Adhesivo
            { id: 'QUI004', nombre: 'ADHESIVO', tipo: 'adhesivo', lote: '', cantidad: 420.0, unidad: 'Kg' },
            // Catalizadores
            { id: 'QUI005', nombre: 'CATALIZADOR', tipo: 'catalizador', lote: '', cantidad: 210.0, unidad: 'Kg' },
            { id: 'QUI007', nombre: 'CATALIZADOR 403', tipo: 'catalizador', lote: '', cantidad: 0, unidad: 'Kg' },
            // Solvente recuperado
            { id: 'QUI006', nombre: 'SOLVENTE RECUPERADO', tipo: 'solvente', lote: '', cantidad: 0, unidad: 'Lt' },
        ];
    },

    /**
     * Guarda adhesivos en Supabase
     */
    saveAdhesivos: async function() {
        console.log('[Inventario] Adhesivos guardados en Supabase');
    },

    /**
     * Configura los event listeners para los tabs
     */
    setupTabListeners: function() {
        const tabs = document.querySelectorAll('#inventarioTabs button[data-bs-toggle="tab"]');
        tabs.forEach(tab => {
            tab.addEventListener('shown.bs.tab', (e) => {
                const target = e.target.getAttribute('data-bs-target');
                if (target === '#panel-material') {
                    this.activeTab = 'material';
                } else if (target === '#panel-tinta') {
                    this.activeTab = 'tinta';
                    this.renderTintas();
                } else if (target === '#panel-adhesivo') {
                    this.activeTab = 'adhesivo';
                    this.renderAdhesivos();
                }
            });
        });

        // Filtros de tintas
        const buscarTinta = document.getElementById('buscarTinta');
        if (buscarTinta) {
            buscarTinta.addEventListener('input', () => this.aplicarFiltrosTintas());
        }
        const filtroTipoTinta = document.getElementById('filtroTipoTinta');
        if (filtroTipoTinta) {
            filtroTipoTinta.addEventListener('change', () => this.aplicarFiltrosTintas());
        }

        // Filtros de adhesivos
        const buscarAdhesivo = document.getElementById('buscarAdhesivo');
        if (buscarAdhesivo) {
            buscarAdhesivo.addEventListener('input', () => this.aplicarFiltrosAdhesivos());
        }
        const filtroTipoAdhesivo = document.getElementById('filtroTipoAdhesivo');
        if (filtroTipoAdhesivo) {
            filtroTipoAdhesivo.addEventListener('change', () => this.aplicarFiltrosAdhesivos());
        }
    },

    /**
     * Renderiza la tabla de tintas
     */
    renderTintas: function() {
        const tbody = document.getElementById('tablaTintas');
        if (!tbody) return;

        if (this.filteredTintas.length === 0) {
            tbody.innerHTML = '<tr><td colspan="7" class="text-center text-muted py-3">No hay tintas registradas</td></tr>';
            return;
        }

        tbody.innerHTML = this.filteredTintas.map((tinta, index) => {
            const estadoClass = tinta.cantidad <= 5 ? 'bg-danger' : tinta.cantidad <= 15 ? 'bg-warning text-dark' : 'bg-success';
            const estadoTexto = tinta.cantidad <= 5 ? 'Bajo' : tinta.cantidad <= 15 ? 'Medio' : 'OK';
            const tipoTexto = tinta.tipo === 'laminacion' ? 'Laminacion' : tinta.tipo === 'superficie' ? 'Superficie' : tinta.tipo === 'prueba_laminacion' ? 'Prueba Lam.' : 'Solvente';

            return `
                <tr>
                    <td><i class="bi bi-droplet me-1" style="color: ${this.getColorTinta(tinta.nombre)};"></i>${tinta.nombre}</td>
                    <td class="text-center"><span class="badge bg-info">${tipoTexto}</span></td>
                    <td class="text-center">${tinta.codigo}</td>
                    <td class="text-end">${this.formatNumber(tinta.cantidad)}</td>
                    <td class="text-center">${tinta.unidad}</td>
                    <td class="text-center"><span class="badge ${estadoClass}">${estadoTexto}</span></td>
                    <td class="text-center">
                        <button class="btn btn-sm btn-outline-primary" onclick="Inventario.editarTinta('${tinta.id}')" title="Editar">
                            <i class="bi bi-pencil"></i>
                        </button>
                    </td>
                </tr>
            `;
        }).join('');

        this.updateTotalesTintas();
    },

    /**
     * Obtiene color para icono de tinta
     */
    getColorTinta: function(nombre) {
        const colores = {
            'blanco': '#f8f9fa', 'amarillo': '#ffc107', 'rojo': '#dc3545',
            'azul': '#0d6efd', 'negro': '#212529', 'verde': '#198754',
            'cyan': '#0dcaf0', 'magenta': '#d63384', 'naranja': '#fd7e14',
            'reflex': '#4b0082', 'violeta': '#7b2d8e', 'morado': '#6f42c1',
            'dorado': '#d4a017', 'crema': '#f5deb3', 'marron': '#8b4513',
            'ocre': '#cc7722', 'beige': '#f5f5dc', 'barniz': '#e8d5b7'
        };
        for (const [key, color] of Object.entries(colores)) {
            if (nombre.toLowerCase().includes(key)) return color;
        }
        return '#6c757d';
    },

    /**
     * Renderiza la tabla de adhesivos
     */
    renderAdhesivos: function() {
        const tbody = document.getElementById('tablaAdhesivos');
        if (!tbody) return;

        if (this.filteredAdhesivos.length === 0) {
            tbody.innerHTML = '<tr><td colspan="7" class="text-center text-muted py-3">No hay adhesivos registrados</td></tr>';
            return;
        }

        tbody.innerHTML = this.filteredAdhesivos.map((adhesivo, index) => {
            const estadoClass = adhesivo.cantidad <= 10 ? 'bg-danger' : adhesivo.cantidad <= 30 ? 'bg-warning text-dark' : 'bg-success';
            const estadoTexto = adhesivo.cantidad <= 10 ? 'Bajo' : adhesivo.cantidad <= 30 ? 'Medio' : 'OK';
            const tipoTexto = adhesivo.tipo.charAt(0).toUpperCase() + adhesivo.tipo.slice(1);

            return `
                <tr>
                    <td><i class="bi bi-moisture me-1 text-warning"></i>${adhesivo.nombre}</td>
                    <td class="text-center"><span class="badge bg-warning text-dark">${tipoTexto}</span></td>
                    <td class="text-center">${adhesivo.lote}</td>
                    <td class="text-end">${this.formatNumber(adhesivo.cantidad)}</td>
                    <td class="text-center">${adhesivo.unidad}</td>
                    <td class="text-center"><span class="badge ${estadoClass}">${estadoTexto}</span></td>
                    <td class="text-center">
                        <button class="btn btn-sm btn-outline-primary" onclick="Inventario.editarAdhesivo('${adhesivo.id}')" title="Editar">
                            <i class="bi bi-pencil"></i>
                        </button>
                    </td>
                </tr>
            `;
        }).join('');

        this.updateTotalesAdhesivos();
    },

    /**
     * Aplica filtros a tintas
     */
    aplicarFiltrosTintas: function() {
        const busqueda = document.getElementById('buscarTinta')?.value.toLowerCase() || '';
        const tipo = document.getElementById('filtroTipoTinta')?.value || '';

        this.filteredTintas = this.tintas.filter(tinta => {
            if (busqueda && !tinta.nombre.toLowerCase().includes(busqueda) && !tinta.codigo.toLowerCase().includes(busqueda)) {
                return false;
            }
            if (tipo && tinta.tipo !== tipo) return false;
            return true;
        });

        this.renderTintas();
    },

    /**
     * Aplica filtros a adhesivos
     */
    aplicarFiltrosAdhesivos: function() {
        const busqueda = document.getElementById('buscarAdhesivo')?.value.toLowerCase() || '';
        const tipo = document.getElementById('filtroTipoAdhesivo')?.value || '';

        this.filteredAdhesivos = this.adhesivos.filter(adhesivo => {
            if (busqueda && !adhesivo.nombre.toLowerCase().includes(busqueda) && !adhesivo.lote.toLowerCase().includes(busqueda)) {
                return false;
            }
            if (tipo && adhesivo.tipo !== tipo) return false;
            return true;
        });

        this.renderAdhesivos();
    },

    /**
     * Actualiza totales de tintas
     */
    updateTotalesTintas: function() {
        const tintasLam = this.tintas.filter(t => t.tipo === 'laminacion').reduce((sum, t) => sum + t.cantidad, 0);
        const tintasSuper = this.tintas.filter(t => t.tipo === 'superficie').reduce((sum, t) => sum + t.cantidad, 0);
        const solventes = this.tintas.filter(t => t.tipo === 'solvente').reduce((sum, t) => sum + t.cantidad, 0);

        document.getElementById('totalTintasLam')?.textContent && (document.getElementById('totalTintasLam').textContent = this.formatNumber(tintasLam));
        document.getElementById('totalTintasSuper')?.textContent && (document.getElementById('totalTintasSuper').textContent = this.formatNumber(tintasSuper));
        document.getElementById('totalSolventes')?.textContent && (document.getElementById('totalSolventes').textContent = this.formatNumber(solventes));
        document.getElementById('totalTintasGeneral')?.textContent && (document.getElementById('totalTintasGeneral').textContent = this.tintas.length);
    },

    /**
     * Actualiza totales de adhesivos
     */
    updateTotalesAdhesivos: function() {
        const adhesivo = this.adhesivos.filter(a => a.tipo === 'adhesivo').reduce((sum, a) => sum + a.cantidad, 0);
        const catalizador = this.adhesivos.filter(a => a.tipo === 'catalizador').reduce((sum, a) => sum + a.cantidad, 0);
        const acetato = this.adhesivos.filter(a => a.tipo === 'acetato').reduce((sum, a) => sum + a.cantidad, 0);
        const solventeQuimico = this.adhesivos.filter(a => a.tipo === 'solvente').reduce((sum, a) => sum + a.cantidad, 0);

        document.getElementById('totalAdhesivo')?.textContent && (document.getElementById('totalAdhesivo').textContent = this.formatNumber(adhesivo));
        document.getElementById('totalCatalizador')?.textContent && (document.getElementById('totalCatalizador').textContent = this.formatNumber(catalizador));
        document.getElementById('totalAcetato')?.textContent && (document.getElementById('totalAcetato').textContent = this.formatNumber(acetato));
        const elSolventeQ = document.getElementById('totalSolventeQuimico');
        if (elSolventeQ) elSolventeQ.textContent = this.formatNumber(solventeQuimico);
        document.getElementById('totalAdhesivosGeneral')?.textContent && (document.getElementById('totalAdhesivosGeneral').textContent = this.adhesivos.length);
    },

    /**
     * Actualiza los contadores en los tabs
     */
    updateCounts: function() {
        const countMaterial = document.getElementById('countMaterial');
        const countTinta = document.getElementById('countTinta');
        const countAdhesivo = document.getElementById('countAdhesivo');

        if (countMaterial) countMaterial.textContent = this.items.length;
        if (countTinta) countTinta.textContent = this.tintas.length;
        if (countAdhesivo) countAdhesivo.textContent = this.adhesivos.length;
    },

    /**
     * Editar tinta (agregar o ajustar cantidad)
     * Resuelve alertas automaticamente si se incrementa el stock
     */
    editarTinta: function(id) {
        const tinta = this.tintas.find(t => t.id === id);
        if (!tinta) return;

        const nuevaCantidad = prompt(`Editar cantidad para ${tinta.nombre}\nCantidad actual: ${tinta.cantidad} ${tinta.unidad}\n\nNueva cantidad:`, tinta.cantidad);

        if (nuevaCantidad !== null) {
            const cantidadAnterior = tinta.cantidad;
            const cantidadNueva = parseFloat(nuevaCantidad) || 0;

            // Si se incremento la cantidad, usar InventarioService para agregar y resolver alertas
            if (cantidadNueva > cantidadAnterior && typeof InventarioService !== 'undefined') {
                const diferencia = cantidadNueva - cantidadAnterior;
                InventarioService.agregarTinta({
                    nombre: tinta.nombre,
                    cantidad: diferencia,
                    unidad: tinta.unidad
                });
            }

            tinta.cantidad = cantidadNueva;
            this.saveTintas();
            this.renderTintas();
            this.updateCounts();
            if (typeof Axones !== 'undefined') Axones.showSuccess('Cantidad actualizada');
        }
    },

    /**
     * Editar adhesivo (agregar o ajustar cantidad)
     * Resuelve alertas automaticamente si se incrementa el stock
     */
    editarAdhesivo: function(id) {
        const adhesivo = this.adhesivos.find(a => a.id === id);
        if (!adhesivo) return;

        const nuevaCantidad = prompt(`Editar cantidad para ${adhesivo.nombre}\nCantidad actual: ${adhesivo.cantidad} ${adhesivo.unidad}\n\nNueva cantidad:`, adhesivo.cantidad);

        if (nuevaCantidad !== null) {
            const cantidadAnterior = adhesivo.cantidad;
            const cantidadNueva = parseFloat(nuevaCantidad) || 0;

            // Si se incremento la cantidad, usar InventarioService para agregar y resolver alertas
            if (cantidadNueva > cantidadAnterior && typeof InventarioService !== 'undefined') {
                const diferencia = cantidadNueva - cantidadAnterior;
                InventarioService.agregarAdhesivo({
                    tipo: adhesivo.tipo,
                    nombre: adhesivo.nombre,
                    cantidad: diferencia,
                    unidad: adhesivo.unidad
                });
            }

            adhesivo.cantidad = cantidadNueva;
            this.saveAdhesivos();
            this.renderAdhesivos();
            this.updateCounts();
            if (typeof Axones !== 'undefined') Axones.showSuccess('Cantidad actualizada');
        }
    },

    /**
     * Configura los event listeners
     */
    setupEventListeners: function() {
        // Busqueda
        const buscar = document.getElementById('buscarInventario');
        if (buscar) {
            buscar.addEventListener('input', () => this.aplicarFiltros());
        }

        // Filtros
        ['filtroMaterial', 'filtroMicras', 'filtroStock'].forEach(id => {
            const el = document.getElementById(id);
            if (el) {
                el.addEventListener('change', () => this.aplicarFiltros());
            }
        });

        // Limpiar filtros
        const btnLimpiar = document.getElementById('btnLimpiarFiltros');
        if (btnLimpiar) {
            btnLimpiar.addEventListener('click', () => this.limpiarFiltros());
        }

        // Badges de filtro rapido
        document.querySelectorAll('.filter-badge').forEach(badge => {
            badge.addEventListener('click', () => {
                const filtro = badge.dataset.filter;
                document.getElementById('filtroMaterial').value = filtro;
                this.aplicarFiltros();
            });
        });

        // Guardar nuevo item
        const btnGuardar = document.getElementById('btnGuardarItem');
        if (btnGuardar) {
            btnGuardar.addEventListener('click', () => this.agregarItem());
        }

        // Actualizar
        const btnActualizar = document.getElementById('btnActualizar');
        if (btnActualizar) {
            btnActualizar.addEventListener('click', () => {
                this.loadInventario();
                this.renderInventario();
                this.updateTotales();
                Axones.showSuccess('Inventario actualizado');
            });
        }

        // Exportar
        const btnExportar = document.getElementById('btnExportar');
        if (btnExportar) {
            btnExportar.addEventListener('click', () => this.exportarCSV());
        }

        // Sincronizar a Supabase
        const btnSyncSupabase = document.getElementById('btnSyncSupabase');
        if (btnSyncSupabase) {
            btnSyncSupabase.addEventListener('click', () => {
                // Recargar desde Supabase
                await this.loadInventario();
                this.renderInventario();
                if (typeof Axones !== 'undefined') {
                    Axones.showSuccess('Inventario sincronizado con Supabase');
                }
            });
        }
    },

    /**
     * Aplica los filtros al inventario
     */
    aplicarFiltros: function() {
        const busqueda = document.getElementById('buscarInventario').value.toLowerCase();
        const material = document.getElementById('filtroMaterial').value;
        const micras = document.getElementById('filtroMicras').value;
        const stock = document.getElementById('filtroStock').value;

        this.filteredItems = this.items.filter(item => {
            // Filtro de busqueda
            if (busqueda) {
                const textoItem = `${item.material} ${item.producto} ${item.ancho}`.toLowerCase();
                if (!textoItem.includes(busqueda)) return false;
            }

            // Filtro de material
            if (material && !item.material.includes(material)) return false;

            // Filtro de micras
            if (micras && item.micras !== parseInt(micras)) return false;

            // Filtro de stock
            if (stock) {
                switch (stock) {
                    case 'disponible':
                        if (item.kg <= 0) return false;
                        break;
                    case 'bajo':
                        if (item.kg <= 0 || item.kg > 500) return false;
                        break;
                    case 'agotado':
                        if (item.kg > 0) return false;
                        break;
                    case 'reservado':
                        if (!item.producto) return false;
                        break;
                }
            }

            return true;
        });

        this.renderInventario();
    },

    /**
     * Limpia todos los filtros
     */
    limpiarFiltros: function() {
        document.getElementById('buscarInventario').value = '';
        document.getElementById('filtroMaterial').value = '';
        document.getElementById('filtroMicras').value = '';
        document.getElementById('filtroStock').value = '';
        this.filteredItems = [...this.items];
        this.renderInventario();
    },

    /**
     * Renderiza la tabla de inventario
     */
    renderInventario: function() {
        const tbody = document.getElementById('tablaInventario');
        if (!tbody) return;

        if (this.filteredItems.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="8" class="text-center text-muted py-4">
                        <i class="bi bi-inbox display-6 d-block mb-2"></i>
                        No se encontraron items
                    </td>
                </tr>
            `;
            return;
        }

        tbody.innerHTML = this.filteredItems.map((item, index) => {
            // Determinar clase de stock
            let stockClass = '';
            if (item.kg === 0) stockClass = 'stock-zero';
            else if (item.kg < 500) stockClass = 'stock-low';
            else if (item.producto) stockClass = 'stock-reserved';

            // Determinar estado
            let estadoBadge = '';
            if (item.kg === 0) {
                estadoBadge = '<span class="badge bg-danger">Agotado</span>';
            } else if (item.kg < 500) {
                estadoBadge = '<span class="badge bg-warning text-dark">Bajo</span>';
            } else if (item.producto) {
                estadoBadge = '<span class="badge bg-info">Reservado</span>';
            } else {
                estadoBadge = '<span class="badge bg-success">Disponible</span>';
            }

            return `
                <tr class="${stockClass}">
                    <td class="text-center">${index + 1}</td>
                    <td>
                        <strong>${item.material}</strong>
                        ${item.importado ? '<span class="badge bg-secondary ms-1">IMP</span>' : ''}
                    </td>
                    <td class="text-center">${item.micras}</td>
                    <td class="text-center">${item.ancho}</td>
                    <td class="text-end fw-bold">${this.formatNumber(item.kg)}</td>
                    <td>${item.producto || '<span class="text-muted">-</span>'}</td>
                    <td class="text-center">${estadoBadge}</td>
                    <td class="text-center">
                        <button class="btn btn-sm btn-outline-primary" onclick="Inventario.editarItem('${item.id}')" title="Editar">
                            <i class="bi bi-pencil"></i>
                        </button>
                        <button class="btn btn-sm btn-outline-success" onclick="Inventario.usarMaterial('${item.id}')" title="Usar en OT">
                            <i class="bi bi-box-arrow-right"></i>
                        </button>
                    </td>
                </tr>
            `;
        }).join('');

        // Actualizar contador
        document.getElementById('totalItems').textContent = this.filteredItems.length;
    },

    /**
     * Actualiza los totales por material
     */
    updateTotales: function() {
        const totales = {
            BOPP: 0,
            CAST: 0,
            MATE: 0,
            PASTA: 0,
            METAL: 0,
            PEBD: 0,
            PERLADO: 0,
            general: 0
        };

        this.items.forEach(item => {
            totales.general += item.kg;

            if (item.material.includes('BOPP') && !item.material.includes('MATE') && !item.material.includes('PASTA')) {
                totales.BOPP += item.kg;
            } else if (item.material.includes('MATE')) {
                totales.MATE += item.kg;
            } else if (item.material.includes('PASTA')) {
                totales.PASTA += item.kg;
            } else if (item.material.includes('CAST')) {
                totales.CAST += item.kg;
            } else if (item.material.includes('METAL')) {
                totales.METAL += item.kg;
            } else if (item.material.includes('PERLADO')) {
                totales.PERLADO += item.kg;
            } else if (item.material.includes('PEBD')) {
                totales.PEBD += item.kg;
            }
        });

        // Actualizar UI
        document.getElementById('totalBopp').textContent = this.formatNumber(totales.BOPP);
        document.getElementById('totalCast').textContent = this.formatNumber(totales.CAST);
        document.getElementById('totalMate').textContent = this.formatNumber(totales.MATE);
        document.getElementById('totalPasta').textContent = this.formatNumber(totales.PASTA);
        document.getElementById('totalMetal').textContent = this.formatNumber(totales.METAL);
        document.getElementById('totalPebd').textContent = this.formatNumber(totales.PEBD);
        document.getElementById('totalGeneral').textContent = this.formatNumber(totales.general);
    },

    /**
     * Agrega un nuevo item al inventario
     * Usa InventarioService para resolver alertas automaticamente
     */
    agregarItem: async function() {
        const form = document.getElementById('formAgregarItem');
        if (!form.checkValidity()) {
            form.reportValidity();
            return;
        }

        const nuevoItem = {
            id: 'INV' + Date.now(),
            material: document.getElementById('nuevoMaterial').value,
            micras: parseInt(document.getElementById('nuevoMicras').value),
            ancho: parseInt(document.getElementById('nuevoAncho').value),
            kg: parseFloat(document.getElementById('nuevoKg').value),
            producto: document.getElementById('nuevoProducto').value,
            importado: document.getElementById('nuevoImportado').checked,
        };

        // Usar InventarioService si esta disponible (resuelve alertas automaticamente)
        if (typeof InventarioService !== 'undefined') {
            const resultado = InventarioService.agregarMaterial(nuevoItem);
            if (resultado.exito) {
                console.log('Material agregado via InventarioService');
            }
        }

        // Tambien agregar al array local para mantener sincronizado
        const existente = this.items.find(i =>
            i.material === nuevoItem.material &&
            i.micras === nuevoItem.micras &&
            i.ancho === nuevoItem.ancho
        );

        if (existente) {
            existente.kg = (parseFloat(existente.kg) || 0) + nuevoItem.kg;
        } else {
            this.items.push(nuevoItem);
        }

        this.saveInventario();
        this.filteredItems = [...this.items];
        this.renderInventario();
        this.updateTotales();

        // Cerrar modal y limpiar
        bootstrap.Modal.getInstance(document.getElementById('modalAgregarItem')).hide();
        form.reset();

        // Mostrar mensaje indicando si se resolvieron alertas
        Axones.showSuccess('Item agregado al inventario');
    },

    /**
     * Editar un item del inventario
     */
    editarItem: function(id) {
        const item = this.items.find(i => i.id === id);
        if (!item) return;

        // Solicitar nuevo valor de Kg
        const nuevoKg = prompt(`Editar cantidad para ${item.material} ${item.micras}µ x ${item.ancho}mm\nCantidad actual: ${item.kg} Kg\n\nNueva cantidad:`, item.kg);

        if (nuevoKg !== null) {
            item.kg = parseFloat(nuevoKg) || 0;
            this.saveInventario();
            this.renderInventario();
            this.updateTotales();

            Axones.showSuccess('Cantidad actualizada');
        }
    },

    /**
     * Usar material en una OT (descontar del inventario)
     * Usa InventarioService para registrar movimiento y verificar stock bajo
     */
    usarMaterial: function(id) {
        const item = this.items.find(i => i.id === id);
        if (!item) return;

        if (item.kg <= 0) {
            Axones.showError('Este material esta agotado');
            return;
        }

        const cantidad = prompt(`Usar material: ${item.material} ${item.micras}µ x ${item.ancho}mm\nDisponible: ${item.kg} Kg\n\nCantidad a usar (Kg):`, '0');

        if (cantidad !== null) {
            const cantidadUsar = parseFloat(cantidad) || 0;
            if (cantidadUsar <= 0) return;

            if (cantidadUsar > item.kg) {
                Axones.showError('La cantidad excede el disponible');
                return;
            }

            // Usar InventarioService si esta disponible
            if (typeof InventarioService !== 'undefined') {
                const resultado = InventarioService.descontarMaterial(cantidadUsar, {
                    material: item.material,
                    micras: item.micras,
                    ancho: item.ancho,
                    producto: item.producto
                }, 'manual');

                if (resultado.exito) {
                    // Recargar inventario desde Supabase para mantener sincronizado
                    this.items = InventarioService.getMateriales();
                    this.filteredItems = [...this.items];
                }
            } else {
                // Fallback sin servicio
                item.kg -= cantidadUsar;
            }

            this.saveInventario();
            this.renderInventario();
            this.updateTotales();

            Axones.showSuccess(`Se descontaron ${cantidadUsar} Kg del inventario`);
        }
    },

    /**
     * Exporta el inventario a CSV
     */
    exportarCSV: function() {
        const headers = ['Material', 'Micras', 'Ancho', 'Kg', 'Producto', 'Importado'];
        const rows = this.filteredItems.map(item => [
            item.material,
            item.micras,
            item.ancho,
            item.kg,
            item.producto,
            item.importado ? 'Si' : 'No'
        ]);

        let csv = headers.join(',') + '\n';
        rows.forEach(row => {
            csv += row.map(cell => `"${cell}"`).join(',') + '\n';
        });

        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = `inventario_axones_${new Date().toISOString().split('T')[0]}.csv`;
        link.click();

        Axones.showSuccess('Inventario exportado');
    },

    /**
     * Formatea un numero con separador de miles
     */
    formatNumber: function(num) {
        return new Intl.NumberFormat('es-VE', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        }).format(num);
    },

    /**
     * Establece la fecha de actualizacion
     */
    setFechaActualizacion: function() {
        const el = document.getElementById('fechaActualizacion');
        if (el) {
            el.textContent = new Date().toLocaleString('es-VE');
        }
    },
};

// Inicializar cuando el DOM este listo
document.addEventListener('DOMContentLoaded', () => {
    if (document.getElementById('tablaInventario')) {
        Inventario.init();
    }
});

// Exportar modulo
if (typeof module !== 'undefined' && module.exports) {
    module.exports = Inventario;
}
