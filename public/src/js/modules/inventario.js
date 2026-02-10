/**
 * Modulo Inventario General - Sistema Axones
 * Gestion del inventario de materiales, tintas y adhesivos
 */

const Inventario = {
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
        'BOPP',
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
        { id: 'solvente', nombre: 'Solvente' }
    ],

    // Tipos de adhesivos
    TIPOS_ADHESIVO: [
        { id: 'adhesivo', nombre: 'Adhesivo' },
        { id: 'catalizador', nombre: 'Catalizador' },
        { id: 'acetato', nombre: 'Acetato' },
        { id: 'otro', nombre: 'Otro' }
    ],

    /**
     * Inicializa el modulo
     */
    init: async function() {
        console.log('Inicializando modulo Inventario General');

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
    },

    /**
     * Carga el inventario desde API o localStorage
     */
    loadInventario: async function() {
        // Intentar cargar desde API primero
        try {
            const response = await AxonesAPI.getInventario();
            if (response.success && response.data && response.data.length > 0) {
                // Mapear datos de API a formato local
                this.items = response.data.map(item => ({
                    id: item.id,
                    material: item.tipo || item.material,
                    micras: item.micras || '',
                    ancho: item.ancho || '',
                    kg: parseFloat(item.cantidad) || 0,
                    producto: item.ubicacion || '',
                    importado: false,
                    lote: item.lote || ''
                }));
                console.log('Inventario cargado desde API:', this.items.length, 'items');
                this.filteredItems = [...this.items];
                return;
            }
        } catch (error) {
            console.warn('Error cargando inventario de API:', error);
        }

        // Fallback a localStorage
        const stored = localStorage.getItem(CONFIG.CACHE.PREFIJO + 'inventario');
        if (stored) {
            this.items = JSON.parse(stored);
        } else {
            this.items = this.getDatosEjemplo();
            this.saveInventario();
        }
        this.filteredItems = [...this.items];
    },

    /**
     * Datos de ejemplo basados en el inventario de Axones
     */
    getDatosEjemplo: function() {
        return [
            // BOPP
            { id: 'INV001', material: 'BOPP', micras: 15, ancho: 700, kg: 73.00, producto: 'CHARMY', importado: false },
            { id: 'INV002', material: 'BOPP', micras: 17, ancho: 620, kg: 283.20, producto: 'TOM 80', importado: false },
            { id: 'INV003', material: 'BOPP', micras: 17, ancho: 710, kg: 46.00, producto: 'TOM 28', importado: false },
            { id: 'INV004', material: 'BOPP', micras: 17, ancho: 610, kg: 2215.02, producto: 'HASHI - CHUNKY', importado: false },
            { id: 'INV005', material: 'BOPP', micras: 17, ancho: 630, kg: 690.98, producto: 'NATY', importado: false },
            { id: 'INV006', material: 'BOPP', micras: 20, ancho: 740, kg: 0, producto: 'CALI DONA', importado: false },
            { id: 'INV007', material: 'BOPP', micras: 25, ancho: 560, kg: 6256.43, producto: 'GRANOS', importado: true },
            { id: 'INV008', material: 'BOPP', micras: 25, ancho: 680, kg: 1150.40, producto: 'AVENAS / CARAOTAS ALVARIGUA', importado: false },
            { id: 'INV009', material: 'BOPP', micras: 25, ancho: 680, kg: 1860.50, producto: '', importado: true },
            { id: 'INV010', material: 'BOPP', micras: 30, ancho: 740, kg: 4596.30, producto: 'MICAELA', importado: true },
            { id: 'INV011', material: 'BOPP', micras: 35, ancho: 700, kg: 4206.36, producto: 'MASANTON', importado: true },
            { id: 'INV012', material: 'BOPP', micras: 40, ancho: 1000, kg: 556.00, producto: '', importado: false },

            // BOPP MATE
            { id: 'INV020', material: 'BOPP MATE', micras: 17, ancho: 620, kg: 1246.10, producto: '', importado: false },
            { id: 'INV021', material: 'BOPP MATE', micras: 17, ancho: 460, kg: 267.68, producto: 'LECHE 900g Y 1 kg', importado: false },
            { id: 'INV022', material: 'BOPP MATE', micras: 20, ancho: 700, kg: 499.56, producto: 'CAFE 500g', importado: true },
            { id: 'INV023', material: 'BOPP MATE', micras: 25, ancho: 815, kg: 1826.52, producto: 'CAFE 200g', importado: true },
            { id: 'INV024', material: 'BOPP MATE', micras: 25, ancho: 740, kg: 2274.10, producto: 'BUDARE', importado: false },

            // CAST
            { id: 'INV030', material: 'CAST', micras: 20, ancho: 580, kg: 11.00, producto: 'GRANOS', importado: false },
            { id: 'INV031', material: 'CAST', micras: 25, ancho: 620, kg: 2155.70, producto: 'SIRENA LARGA', importado: false },
            { id: 'INV032', material: 'CAST', micras: 25, ancho: 680, kg: 5915.34, producto: '', importado: true },
            { id: 'INV033', material: 'CAST', micras: 25, ancho: 700, kg: 1449.68, producto: '', importado: true },
            { id: 'INV034', material: 'CAST', micras: 30, ancho: 600, kg: 170.00, producto: '', importado: false },
            { id: 'INV035', material: 'CAST', micras: 30, ancho: 700, kg: 959.34, producto: 'MI MASA 90', importado: true },

            // BOPP PASTA
            { id: 'INV040', material: 'BOPP PASTA', micras: 25, ancho: 430, kg: 877.80, producto: 'SIRENA 500', importado: false },
            { id: 'INV041', material: 'BOPP PASTA', micras: 25, ancho: 470, kg: 780.55, producto: 'INALSA', importado: false },
            { id: 'INV042', material: 'BOPP PASTA', micras: 25, ancho: 490, kg: 4657.95, producto: '', importado: true },
            { id: 'INV043', material: 'BOPP PASTA', micras: 25, ancho: 620, kg: 2023.86, producto: '', importado: true },

            // METAL
            { id: 'INV050', material: 'METAL', micras: 20, ancho: 610, kg: 2332.92, producto: 'HASHI - CHUNKY', importado: false },
            { id: 'INV051', material: 'METAL', micras: 20, ancho: 620, kg: 250.60, producto: '', importado: false },
            { id: 'INV052', material: 'METAL', micras: 20, ancho: 740, kg: 1343.89, producto: 'ETIQUETA Y BARITOS', importado: false },
            { id: 'INV053', material: 'METAL', micras: 20, ancho: 780, kg: 274.52, producto: 'POLET-OSTI', importado: false },

            // PERLADO
            { id: 'INV060', material: 'PERLADO', micras: 30, ancho: 740, kg: 602.77, producto: 'CALI', importado: false },
            { id: 'INV061', material: 'PERLADO', micras: 30, ancho: 900, kg: 98.00, producto: '', importado: false },

            // PEBD
            { id: 'INV070', material: 'PEBD', micras: 25, ancho: 650, kg: 0, producto: 'DON JULIAN', importado: false },
            { id: 'INV071', material: 'PEBD', micras: 28, ancho: 670, kg: 6820.50, producto: 'ARROZ SANTONI / ALICIA', importado: false },
            { id: 'INV072', material: 'PEBD', micras: 28, ancho: 760, kg: 1865.00, producto: 'BUDARE - FATY', importado: false },
            { id: 'INV073', material: 'PEBD', micras: 30, ancho: 690, kg: 0, producto: 'DELICIAS - DUQUESA', importado: false },
            { id: 'INV074', material: 'PEBD', micras: 30, ancho: 990, kg: 1301.50, producto: '', importado: false },
            { id: 'INV075', material: 'PEBD', micras: 35, ancho: 750, kg: 0, producto: 'LECHE LAM', importado: false },
            { id: 'INV076', material: 'PEBD', micras: 38, ancho: 750, kg: 0, producto: 'PAVECA', importado: false },
            { id: 'INV077', material: 'PEBD', micras: 50, ancho: 630, kg: 2818.00, producto: 'MARY DORADO', importado: false },
            { id: 'INV078', material: 'PEBD', micras: 50, ancho: 660, kg: 1541.00, producto: 'MARY ESMERALDA', importado: false },

            // PEBD PIGMENT
            { id: 'INV080', material: 'PEBD PIGMENT', micras: 25, ancho: 740, kg: 170.00, producto: 'MAYONESA', importado: false },
            { id: 'INV081', material: 'PEBD PIGMENT', micras: 25, ancho: 450, kg: 1179.00, producto: 'DETERGENTE', importado: false },
            { id: 'INV082', material: 'PEBD PIGMENT', micras: 35, ancho: 670, kg: 1569.50, producto: 'MARGARINA', importado: false },
        ];
    },

    /**
     * Guarda el inventario en localStorage
     */
    saveInventario: function() {
        localStorage.setItem(CONFIG.CACHE.PREFIJO + 'inventario', JSON.stringify(this.items));
    },

    /**
     * Carga tintas desde localStorage
     */
    loadTintas: async function() {
        const stored = localStorage.getItem(CONFIG.CACHE.PREFIJO + 'tintas_inventario');
        if (stored) {
            this.tintas = JSON.parse(stored);
        } else {
            this.tintas = this.getDatosTintasEjemplo();
            this.saveTintas();
        }
        this.filteredTintas = [...this.tintas];
    },

    /**
     * Datos de ejemplo de tintas
     */
    getDatosTintasEjemplo: function() {
        return [
            // Tintas Laminacion
            { id: 'TIN001', nombre: 'Blanco Lam', tipo: 'laminacion', codigo: 'BL-001', cantidad: 25.5, unidad: 'Kg' },
            { id: 'TIN002', nombre: 'Amarillo Lam', tipo: 'laminacion', codigo: 'AM-001', cantidad: 12.3, unidad: 'Kg' },
            { id: 'TIN003', nombre: 'Rojo Lam', tipo: 'laminacion', codigo: 'RJ-001', cantidad: 8.7, unidad: 'Kg' },
            { id: 'TIN004', nombre: 'Azul Lam', tipo: 'laminacion', codigo: 'AZ-001', cantidad: 15.2, unidad: 'Kg' },
            { id: 'TIN005', nombre: 'Negro Lam', tipo: 'laminacion', codigo: 'NG-001', cantidad: 20.0, unidad: 'Kg' },
            { id: 'TIN006', nombre: 'Verde Lam', tipo: 'laminacion', codigo: 'VD-001', cantidad: 5.5, unidad: 'Kg' },
            // Tintas Superficie
            { id: 'TIN010', nombre: 'Blanco Sup', tipo: 'superficie', codigo: 'BS-001', cantidad: 18.0, unidad: 'Kg' },
            { id: 'TIN011', nombre: 'Amarillo Sup', tipo: 'superficie', codigo: 'AS-001', cantidad: 9.5, unidad: 'Kg' },
            { id: 'TIN012', nombre: 'Rojo Sup', tipo: 'superficie', codigo: 'RS-001', cantidad: 6.2, unidad: 'Kg' },
            { id: 'TIN013', nombre: 'Azul Sup', tipo: 'superficie', codigo: 'ZS-001', cantidad: 11.0, unidad: 'Kg' },
            // Solventes
            { id: 'TIN020', nombre: 'Acetato de Etilo', tipo: 'solvente', codigo: 'SOL-001', cantidad: 50.0, unidad: 'Lt' },
            { id: 'TIN021', nombre: 'Alcohol Isopropilico', tipo: 'solvente', codigo: 'SOL-002', cantidad: 35.0, unidad: 'Lt' },
        ];
    },

    /**
     * Guarda tintas en localStorage
     */
    saveTintas: function() {
        localStorage.setItem(CONFIG.CACHE.PREFIJO + 'tintas_inventario', JSON.stringify(this.tintas));
    },

    /**
     * Carga adhesivos desde localStorage
     */
    loadAdhesivos: async function() {
        const stored = localStorage.getItem(CONFIG.CACHE.PREFIJO + 'adhesivos_inventario');
        if (stored) {
            this.adhesivos = JSON.parse(stored);
        } else {
            this.adhesivos = this.getDatosAdhesivosEjemplo();
            this.saveAdhesivos();
        }
        this.filteredAdhesivos = [...this.adhesivos];
    },

    /**
     * Datos de ejemplo de adhesivos
     */
    getDatosAdhesivosEjemplo: function() {
        return [
            { id: 'ADH001', nombre: 'Adhesivo Base', tipo: 'adhesivo', lote: 'LOT-2024-001', cantidad: 150.0, unidad: 'Kg' },
            { id: 'ADH002', nombre: 'Adhesivo Laminacion', tipo: 'adhesivo', lote: 'LOT-2024-002', cantidad: 80.5, unidad: 'Kg' },
            { id: 'ADH003', nombre: 'Catalizador A', tipo: 'catalizador', lote: 'CAT-2024-001', cantidad: 25.0, unidad: 'Kg' },
            { id: 'ADH004', nombre: 'Catalizador B', tipo: 'catalizador', lote: 'CAT-2024-002', cantidad: 18.5, unidad: 'Kg' },
            { id: 'ADH005', nombre: 'Acetato Limpieza', tipo: 'acetato', lote: 'ACE-2024-001', cantidad: 60.0, unidad: 'Lt' },
            { id: 'ADH006', nombre: 'Acetato Industrial', tipo: 'acetato', lote: 'ACE-2024-002', cantidad: 45.0, unidad: 'Lt' },
        ];
    },

    /**
     * Guarda adhesivos en localStorage
     */
    saveAdhesivos: function() {
        localStorage.setItem(CONFIG.CACHE.PREFIJO + 'adhesivos_inventario', JSON.stringify(this.adhesivos));
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
            const tipoTexto = tinta.tipo === 'laminacion' ? 'Laminacion' : tinta.tipo === 'superficie' ? 'Superficie' : 'Solvente';

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
            'azul': '#0d6efd', 'negro': '#212529', 'verde': '#198754'
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

        document.getElementById('totalAdhesivo')?.textContent && (document.getElementById('totalAdhesivo').textContent = this.formatNumber(adhesivo));
        document.getElementById('totalCatalizador')?.textContent && (document.getElementById('totalCatalizador').textContent = this.formatNumber(catalizador));
        document.getElementById('totalAcetato')?.textContent && (document.getElementById('totalAcetato').textContent = this.formatNumber(acetato));
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
     * Editar tinta
     */
    editarTinta: function(id) {
        const tinta = this.tintas.find(t => t.id === id);
        if (!tinta) return;

        const nuevaCantidad = prompt(`Editar cantidad para ${tinta.nombre}\nCantidad actual: ${tinta.cantidad} ${tinta.unidad}\n\nNueva cantidad:`, tinta.cantidad);

        if (nuevaCantidad !== null) {
            tinta.cantidad = parseFloat(nuevaCantidad) || 0;
            this.saveTintas();
            this.renderTintas();
            this.updateCounts();
            if (typeof Axones !== 'undefined') Axones.showSuccess('Cantidad actualizada');
        }
    },

    /**
     * Editar adhesivo
     */
    editarAdhesivo: function(id) {
        const adhesivo = this.adhesivos.find(a => a.id === id);
        if (!adhesivo) return;

        const nuevaCantidad = prompt(`Editar cantidad para ${adhesivo.nombre}\nCantidad actual: ${adhesivo.cantidad} ${adhesivo.unidad}\n\nNueva cantidad:`, adhesivo.cantidad);

        if (nuevaCantidad !== null) {
            adhesivo.cantidad = parseFloat(nuevaCantidad) || 0;
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

        this.items.push(nuevoItem);
        this.saveInventario();
        this.filteredItems = [...this.items];
        this.renderInventario();
        this.updateTotales();

        // Enviar a API
        if (typeof AxonesAPI !== 'undefined') {
            try {
                await AxonesAPI.createInventario({
                    tipo: nuevoItem.material,
                    material: nuevoItem.material + ' ' + nuevoItem.micras + 'µ x ' + nuevoItem.ancho + 'mm',
                    cantidad: nuevoItem.kg,
                    unidad: 'Kg',
                    ubicacion: nuevoItem.producto || 'Almacen',
                    lote: '',
                    proveedor: nuevoItem.importado ? 'Importado' : 'Nacional',
                    observaciones: ''
                });
                console.log('Inventario guardado en Google Sheets');
            } catch (e) {
                console.warn('Error guardando inventario en API:', e);
            }
        }

        // Cerrar modal y limpiar
        bootstrap.Modal.getInstance(document.getElementById('modalAgregarItem')).hide();
        form.reset();

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
            if (cantidadUsar > item.kg) {
                Axones.showError('La cantidad excede el disponible');
                return;
            }

            item.kg -= cantidadUsar;
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
