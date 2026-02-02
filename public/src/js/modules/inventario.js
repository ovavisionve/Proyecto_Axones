/**
 * Modulo Inventario de Sustratos - Sistema Axones
 * Gestion del inventario de materiales (BOPP, CAST, PEBD, etc.)
 */

const Inventario = {
    // Datos del inventario
    items: [],
    filteredItems: [],

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

    /**
     * Inicializa el modulo
     */
    init: function() {
        console.log('Inicializando modulo Inventario de Sustratos');

        this.loadInventario();
        this.setupEventListeners();
        this.renderInventario();
        this.updateTotales();
        this.setFechaActualizacion();
    },

    /**
     * Carga el inventario (de localStorage o datos de ejemplo)
     */
    loadInventario: function() {
        const stored = localStorage.getItem(CONFIG.CACHE.PREFIJO + 'inventario');
        if (stored) {
            this.items = JSON.parse(stored);
        } else {
            // Datos de ejemplo basados en el inventario real de Axones
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
    agregarItem: function() {
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
