/**
 * Modulo Ordenes de Trabajo - Sistema Axones
 * Gestion de ordenes pre-cargadas con verificacion de inventario
 */

const Ordenes = {
    // Datos
    ordenes: [],
    filteredOrdenes: [],
    inventario: [],
    tintas: [],
    adhesivos: [],

    /**
     * Inicializa el modulo
     */
    init: async function() {
        console.log('Inicializando modulo Ordenes de Trabajo');

        await this.loadOrdenes();
        await this.loadInventario();
        this.setupEventListeners();
        this.cargarClientes();
        this.renderOrdenes();
        this.updateCounts();
    },

    /**
     * Carga ordenes desde localStorage
     */
    loadOrdenes: async function() {
        const stored = localStorage.getItem('axones_ordenes');
        if (stored) {
            this.ordenes = JSON.parse(stored);
        } else {
            this.ordenes = this.getDatosEjemplo();
            this.saveOrdenes();
        }
        this.filteredOrdenes = [...this.ordenes];
    },

    /**
     * Datos de ejemplo de ordenes
     */
    getDatosEjemplo: function() {
        return [
            {
                id: 'ORD001',
                ot: 'OT-2024-001',
                cliente: 'PEPSICO ALIMENTOS',
                producto: 'Bolsa Snacks 200g',
                cantidad: 500,
                proceso: 'impresion',
                material: 'BOPP',
                micras: 25,
                ancho: 680,
                colores: ['Blanco', 'Amarillo', 'Rojo'],
                tipoTinta: 'laminacion',
                fechaCreacion: new Date().toISOString(),
                fechaEntrega: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
                estado: 'pendiente',
                observaciones: ''
            },
            {
                id: 'ORD002',
                ot: 'OT-2024-002',
                cliente: 'NESTLE VENEZUELA',
                producto: 'Empaque Galletas 150g',
                cantidad: 800,
                proceso: 'laminacion',
                material: 'BOPP MATE',
                micras: 20,
                ancho: 700,
                colores: [],
                tipoTinta: '',
                fechaCreacion: new Date().toISOString(),
                fechaEntrega: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
                estado: 'en-proceso',
                observaciones: 'Urgente'
            },
            {
                id: 'ORD003',
                ot: 'OT-2024-003',
                cliente: 'EMPRESAS POLAR',
                producto: 'Bolsa Harina 1kg',
                cantidad: 1200,
                proceso: 'impresion',
                material: 'PEBD',
                micras: 50,
                ancho: 660,
                colores: ['Blanco', 'Azul', 'Amarillo'],
                tipoTinta: 'superficie',
                fechaCreacion: new Date().toISOString(),
                fechaEntrega: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
                estado: 'pendiente',
                observaciones: ''
            }
        ];
    },

    /**
     * Guarda ordenes en localStorage
     */
    saveOrdenes: function() {
        localStorage.setItem('axones_ordenes', JSON.stringify(this.ordenes));
    },

    /**
     * Carga inventario desde localStorage
     */
    loadInventario: async function() {
        // Inventario de materiales
        const invStored = localStorage.getItem('axones_inventario');
        this.inventario = invStored ? JSON.parse(invStored) : [];

        // Tintas
        const tintasStored = localStorage.getItem('axones_tintas_inventario');
        this.tintas = tintasStored ? JSON.parse(tintasStored) : [];

        // Adhesivos
        const adhStored = localStorage.getItem('axones_adhesivos_inventario');
        this.adhesivos = adhStored ? JSON.parse(adhStored) : [];
    },

    /**
     * Configura event listeners
     */
    setupEventListeners: function() {
        // Busqueda
        const buscar = document.getElementById('buscarOrden');
        if (buscar) {
            buscar.addEventListener('input', () => this.aplicarFiltros());
        }

        // Filtros
        ['filtroEstado', 'filtroCliente', 'filtroProceso'].forEach(id => {
            const el = document.getElementById(id);
            if (el) {
                el.addEventListener('change', () => this.aplicarFiltros());
            }
        });

        // Guardar orden
        const btnGuardar = document.getElementById('btnGuardarOrden');
        if (btnGuardar) {
            btnGuardar.addEventListener('click', () => this.crearOrden());
        }

        // Verificar inventario global
        const btnVerificar = document.getElementById('btnVerificarInventario');
        if (btnVerificar) {
            btnVerificar.addEventListener('click', () => this.verificarInventarioGlobal());
        }

        // Mostrar/ocultar seccion tintas segun proceso
        const ordenProceso = document.getElementById('ordenProceso');
        if (ordenProceso) {
            ordenProceso.addEventListener('change', () => {
                const seccionTintas = document.getElementById('seccionTintas');
                if (seccionTintas) {
                    seccionTintas.style.display = ordenProceso.value === 'impresion' ? 'block' : 'none';
                }
            });
        }

        // Verificar inventario al cambiar material/cantidad
        ['ordenMaterial', 'ordenMicras', 'ordenAncho', 'ordenCantidad'].forEach(id => {
            const el = document.getElementById(id);
            if (el) {
                el.addEventListener('change', () => this.verificarInventarioEnFormulario());
            }
        });

        // Iniciar produccion
        const btnIniciar = document.getElementById('btnIniciarProduccion');
        if (btnIniciar) {
            btnIniciar.addEventListener('click', () => this.iniciarProduccion());
        }
    },

    /**
     * Carga clientes en los selects
     */
    cargarClientes: function() {
        const clientes = CONFIG.CLIENTES || [
            'PEPSICO ALIMENTOS', 'NESTLE VENEZUELA', 'EMPRESAS POLAR',
            'KRAFT HEINZ', 'ALFONZO RIVAS', 'MONDELEZ', 'MARY'
        ];

        ['ordenCliente', 'filtroCliente'].forEach(id => {
            const select = document.getElementById(id);
            if (select) {
                const currentValue = select.value;
                const firstOption = select.options[0];
                select.innerHTML = '';
                select.appendChild(firstOption);

                clientes.forEach(cliente => {
                    const option = document.createElement('option');
                    option.value = cliente;
                    option.textContent = cliente;
                    select.appendChild(option);
                });

                select.value = currentValue;
            }
        });
    },

    /**
     * Aplica filtros a las ordenes
     */
    aplicarFiltros: function() {
        const busqueda = document.getElementById('buscarOrden')?.value.toLowerCase() || '';
        const estado = document.getElementById('filtroEstado')?.value || '';
        const cliente = document.getElementById('filtroCliente')?.value || '';
        const proceso = document.getElementById('filtroProceso')?.value || '';

        this.filteredOrdenes = this.ordenes.filter(orden => {
            if (busqueda) {
                const texto = `${orden.ot} ${orden.cliente} ${orden.producto}`.toLowerCase();
                if (!texto.includes(busqueda)) return false;
            }
            if (estado && orden.estado !== estado) return false;
            if (cliente && orden.cliente !== cliente) return false;
            if (proceso && orden.proceso !== proceso) return false;
            return true;
        });

        this.renderOrdenes();
    },

    /**
     * Renderiza la tabla de ordenes
     */
    renderOrdenes: function() {
        const tbody = document.getElementById('tablaOrdenes');
        if (!tbody) return;

        if (this.filteredOrdenes.length === 0) {
            tbody.innerHTML = '<tr><td colspan="9" class="text-center text-muted py-3">No hay ordenes registradas</td></tr>';
            return;
        }

        tbody.innerHTML = this.filteredOrdenes.map(orden => {
            const inventarioCheck = this.verificarInventarioOrden(orden);
            const estadoClass = orden.estado === 'completada' ? 'bg-success' :
                               orden.estado === 'en-proceso' ? 'bg-primary' : 'bg-warning text-dark';
            const estadoTexto = orden.estado === 'completada' ? 'Completada' :
                               orden.estado === 'en-proceso' ? 'En Proceso' : 'Pendiente';

            return `
                <tr class="${inventarioCheck.alerta ? 'table-danger' : ''}">
                    <td><strong>${orden.ot}</strong></td>
                    <td>${orden.cliente}</td>
                    <td>
                        ${orden.producto}
                        ${orden.colores && orden.colores.length > 0 ?
                            `<br><small class="text-muted">${orden.colores.join(', ')}</small>` : ''}
                    </td>
                    <td class="text-center">
                        <span class="badge ${this.getProcesoClass(orden.proceso)}">${this.formatProceso(orden.proceso)}</span>
                    </td>
                    <td class="text-center">
                        <span class="spec-badge badge bg-secondary">${orden.material}</span>
                        ${orden.micras ? `<br><small>${orden.micras}µ x ${orden.ancho}mm</small>` : ''}
                    </td>
                    <td class="text-end">${this.formatNumber(orden.cantidad)} Kg</td>
                    <td class="text-center">
                        <span class="inventory-check ${inventarioCheck.class}">
                            <i class="bi ${inventarioCheck.icon}"></i>
                            ${inventarioCheck.texto}
                        </span>
                    </td>
                    <td class="text-center">
                        <span class="badge ${estadoClass}">${estadoTexto}</span>
                    </td>
                    <td class="text-center">
                        <button class="btn btn-sm btn-outline-primary me-1" onclick="Ordenes.verDetalle('${orden.id}')" title="Ver detalle">
                            <i class="bi bi-eye"></i>
                        </button>
                        ${orden.estado !== 'completada' ? `
                            <button class="btn btn-sm btn-outline-success" onclick="Ordenes.cambiarEstado('${orden.id}')" title="Cambiar estado">
                                <i class="bi bi-arrow-right-circle"></i>
                            </button>
                        ` : ''}
                    </td>
                </tr>
            `;
        }).join('');
    },

    /**
     * Verifica inventario para una orden
     */
    verificarInventarioOrden: function(orden) {
        // Buscar material en inventario
        const materialDisponible = this.inventario.filter(item => {
            const matchMaterial = item.material.includes(orden.material);
            const matchMicras = !orden.micras || item.micras === orden.micras;
            const matchAncho = !orden.ancho || item.ancho === orden.ancho;
            return matchMaterial && matchMicras && matchAncho;
        });

        const totalDisponible = materialDisponible.reduce((sum, item) => sum + (item.kg || 0), 0);
        const requerido = orden.cantidad;

        if (totalDisponible >= requerido) {
            return { class: 'ok', icon: 'bi-check-circle-fill', texto: 'OK', alerta: false };
        } else if (totalDisponible >= requerido * 0.5) {
            return { class: 'warning', icon: 'bi-exclamation-triangle-fill', texto: 'Bajo', alerta: false };
        } else {
            return { class: 'danger', icon: 'bi-x-circle-fill', texto: 'Falta', alerta: true };
        }
    },

    /**
     * Verifica inventario en el formulario de nueva orden
     */
    verificarInventarioEnFormulario: function() {
        const material = document.getElementById('ordenMaterial')?.value;
        const micras = parseInt(document.getElementById('ordenMicras')?.value) || 0;
        const ancho = parseInt(document.getElementById('ordenAncho')?.value) || 0;
        const cantidad = parseFloat(document.getElementById('ordenCantidad')?.value) || 0;

        const alertDiv = document.getElementById('verificacionInventario');
        if (!alertDiv || !material) return;

        // Buscar en inventario
        const disponible = this.inventario.filter(item => {
            const matchMaterial = item.material.includes(material);
            const matchMicras = !micras || item.micras === micras;
            const matchAncho = !ancho || item.ancho === ancho;
            return matchMaterial && matchMicras && matchAncho;
        });

        const totalDisponible = disponible.reduce((sum, item) => sum + (item.kg || 0), 0);

        if (totalDisponible >= cantidad && cantidad > 0) {
            alertDiv.className = 'alert alert-success py-2 mb-0';
            alertDiv.innerHTML = `<i class="bi bi-check-circle me-1"></i> Inventario disponible: <strong>${this.formatNumber(totalDisponible)} Kg</strong> (Requerido: ${this.formatNumber(cantidad)} Kg)`;
        } else if (totalDisponible > 0) {
            alertDiv.className = 'alert alert-warning py-2 mb-0';
            alertDiv.innerHTML = `<i class="bi bi-exclamation-triangle me-1"></i> Inventario insuficiente: <strong>${this.formatNumber(totalDisponible)} Kg</strong> disponibles (Requerido: ${this.formatNumber(cantidad)} Kg)`;
        } else {
            alertDiv.className = 'alert alert-danger py-2 mb-0';
            alertDiv.innerHTML = `<i class="bi bi-x-circle me-1"></i> No hay inventario disponible para ${material} ${micras ? micras + 'µ' : ''} ${ancho ? 'x ' + ancho + 'mm' : ''}`;
        }
    },

    /**
     * Crea una nueva orden
     */
    crearOrden: async function() {
        const form = document.getElementById('formNuevaOrden');
        if (!form.checkValidity()) {
            form.reportValidity();
            return;
        }

        const coloresStr = document.getElementById('ordenColores')?.value || '';
        const colores = coloresStr.split(',').map(c => c.trim()).filter(c => c);

        const nuevaOrden = {
            id: 'ORD' + Date.now(),
            ot: document.getElementById('ordenOT').value,
            cliente: document.getElementById('ordenCliente').value,
            producto: document.getElementById('ordenProducto').value,
            cantidad: parseFloat(document.getElementById('ordenCantidad').value),
            proceso: document.getElementById('ordenProceso').value,
            material: document.getElementById('ordenMaterial').value,
            micras: parseInt(document.getElementById('ordenMicras').value) || null,
            ancho: parseInt(document.getElementById('ordenAncho').value) || null,
            colores: colores,
            tipoTinta: document.getElementById('ordenTipoTinta')?.value || '',
            fechaCreacion: new Date().toISOString(),
            fechaEntrega: document.getElementById('ordenFechaEntrega').value || null,
            estado: 'pendiente',
            observaciones: document.getElementById('ordenObservaciones').value
        };

        // Verificar inventario antes de crear
        const inventarioCheck = this.verificarInventarioOrden(nuevaOrden);
        if (inventarioCheck.alerta) {
            const confirmar = confirm('ALERTA: No hay suficiente inventario para esta orden. Continuar de todos modos?');
            if (!confirmar) return;

            // Crear alerta de bajo stock
            this.crearAlertaBajoStock(nuevaOrden);
        }

        this.ordenes.push(nuevaOrden);
        this.saveOrdenes();
        this.filteredOrdenes = [...this.ordenes];
        this.renderOrdenes();
        this.updateCounts();

        // Cerrar modal y limpiar
        bootstrap.Modal.getInstance(document.getElementById('modalNuevaOrden')).hide();
        form.reset();
        document.getElementById('seccionTintas').style.display = 'none';
        document.getElementById('verificacionInventario').className = 'alert alert-info py-2 mb-0';
        document.getElementById('verificacionInventario').innerHTML = '<i class="bi bi-info-circle me-1"></i> Complete los datos para verificar disponibilidad de inventario';

        if (typeof Axones !== 'undefined') {
            Axones.showSuccess('Orden creada exitosamente');
        }
    },

    /**
     * Crea alerta de bajo stock
     */
    crearAlertaBajoStock: function(orden) {
        const alertas = JSON.parse(localStorage.getItem('axones_alertas') || '[]');
        alertas.unshift({
            id: Date.now(),
            tipo: 'stock_bajo',
            nivel: 'danger',
            mensaje: `Inventario insuficiente para OT ${orden.ot}: ${orden.material} ${orden.micras || ''}µ - Requerido: ${orden.cantidad} Kg`,
            fecha: new Date().toISOString(),
            estado: 'pendiente',
            datos: { orden: orden.id }
        });
        localStorage.setItem('axones_alertas', JSON.stringify(alertas));
    },

    /**
     * Ver detalle de orden
     */
    verDetalle: function(id) {
        const orden = this.ordenes.find(o => o.id === id);
        if (!orden) return;

        this.ordenActual = orden;

        document.getElementById('detalleOrdenTitulo').innerHTML = `
            <i class="bi bi-clipboard-check me-2"></i>Orden ${orden.ot}
        `;

        const inventarioCheck = this.verificarInventarioOrden(orden);

        document.getElementById('detalleOrdenContenido').innerHTML = `
            <div class="row">
                <div class="col-md-6">
                    <h6 class="text-muted">Informacion General</h6>
                    <table class="table table-sm">
                        <tr><td><strong>Cliente:</strong></td><td>${orden.cliente}</td></tr>
                        <tr><td><strong>Producto:</strong></td><td>${orden.producto}</td></tr>
                        <tr><td><strong>Cantidad:</strong></td><td>${this.formatNumber(orden.cantidad)} Kg</td></tr>
                        <tr><td><strong>Proceso:</strong></td><td>${this.formatProceso(orden.proceso)}</td></tr>
                        <tr><td><strong>Estado:</strong></td><td><span class="badge ${orden.estado === 'completada' ? 'bg-success' : orden.estado === 'en-proceso' ? 'bg-primary' : 'bg-warning text-dark'}">${orden.estado}</span></td></tr>
                        <tr><td><strong>Fecha Entrega:</strong></td><td>${orden.fechaEntrega || 'No especificada'}</td></tr>
                    </table>
                </div>
                <div class="col-md-6">
                    <h6 class="text-muted">Especificaciones de Material</h6>
                    <table class="table table-sm">
                        <tr><td><strong>Material:</strong></td><td>${orden.material}</td></tr>
                        <tr><td><strong>Micras:</strong></td><td>${orden.micras || '-'}</td></tr>
                        <tr><td><strong>Ancho:</strong></td><td>${orden.ancho ? orden.ancho + ' mm' : '-'}</td></tr>
                        ${orden.colores && orden.colores.length > 0 ? `<tr><td><strong>Colores:</strong></td><td>${orden.colores.join(', ')}</td></tr>` : ''}
                        ${orden.tipoTinta ? `<tr><td><strong>Tipo Tinta:</strong></td><td>${orden.tipoTinta}</td></tr>` : ''}
                    </table>
                </div>
            </div>
            <div class="alert ${inventarioCheck.class === 'ok' ? 'alert-success' : inventarioCheck.class === 'warning' ? 'alert-warning' : 'alert-danger'} mt-3">
                <i class="bi ${inventarioCheck.icon} me-2"></i>
                <strong>Estado de Inventario:</strong> ${inventarioCheck.texto}
                ${inventarioCheck.alerta ? '<br><small>Se recomienda verificar y reabastecer el inventario antes de iniciar produccion.</small>' : ''}
            </div>
            ${orden.observaciones ? `<div class="mt-3"><strong>Observaciones:</strong><br>${orden.observaciones}</div>` : ''}
        `;

        const btnIniciar = document.getElementById('btnIniciarProduccion');
        btnIniciar.style.display = orden.estado === 'pendiente' ? 'inline-block' : 'none';

        new bootstrap.Modal(document.getElementById('modalDetalleOrden')).show();
    },

    /**
     * Iniciar produccion para la orden actual
     */
    iniciarProduccion: function() {
        if (!this.ordenActual) return;

        // Redirigir a la pagina de produccion correspondiente con los datos precargados
        const params = new URLSearchParams({
            ot: this.ordenActual.ot,
            cliente: this.ordenActual.cliente,
            producto: this.ordenActual.producto,
            material: this.ordenActual.material,
            cantidad: this.ordenActual.cantidad
        });

        let pagina = 'impresion.html';
        if (this.ordenActual.proceso === 'laminacion') pagina = 'laminacion.html';
        else if (this.ordenActual.proceso === 'corte') pagina = 'corte.html';

        // Guardar orden como en proceso
        this.ordenActual.estado = 'en-proceso';
        this.saveOrdenes();

        window.location.href = `${pagina}?${params.toString()}`;
    },

    /**
     * Cambiar estado de orden
     */
    cambiarEstado: function(id) {
        const orden = this.ordenes.find(o => o.id === id);
        if (!orden) return;

        const estados = ['pendiente', 'en-proceso', 'completada'];
        const indexActual = estados.indexOf(orden.estado);
        const nuevoEstado = estados[(indexActual + 1) % estados.length];

        if (confirm(`Cambiar estado de "${orden.estado}" a "${nuevoEstado}"?`)) {
            orden.estado = nuevoEstado;
            this.saveOrdenes();
            this.renderOrdenes();
            this.updateCounts();

            if (typeof Axones !== 'undefined') {
                Axones.showSuccess(`Estado actualizado a: ${nuevoEstado}`);
            }
        }
    },

    /**
     * Verifica inventario global
     */
    verificarInventarioGlobal: function() {
        const alertas = [];

        this.ordenes.filter(o => o.estado !== 'completada').forEach(orden => {
            const check = this.verificarInventarioOrden(orden);
            if (check.alerta) {
                alertas.push(`OT ${orden.ot}: ${orden.material} - Falta inventario`);
            }
        });

        if (alertas.length === 0) {
            alert('Todas las ordenes tienen inventario suficiente.');
        } else {
            alert(`Alertas de inventario (${alertas.length}):\n\n${alertas.join('\n')}`);
        }
    },

    /**
     * Actualiza contadores
     */
    updateCounts: function() {
        const pendientes = this.ordenes.filter(o => o.estado === 'pendiente').length;
        const enProceso = this.ordenes.filter(o => o.estado === 'en-proceso').length;
        const hoy = new Date().toISOString().split('T')[0];
        const completadas = this.ordenes.filter(o => o.estado === 'completada').length;
        const alertas = this.ordenes.filter(o => o.estado !== 'completada' && this.verificarInventarioOrden(o).alerta).length;

        document.getElementById('countPendientes')?.textContent && (document.getElementById('countPendientes').textContent = pendientes);
        document.getElementById('countEnProceso')?.textContent && (document.getElementById('countEnProceso').textContent = enProceso);
        document.getElementById('countCompletadas')?.textContent && (document.getElementById('countCompletadas').textContent = completadas);
        document.getElementById('countAlertas')?.textContent && (document.getElementById('countAlertas').textContent = alertas);
    },

    /**
     * Helpers
     */
    getProcesoClass: function(proceso) {
        const clases = {
            'impresion': 'bg-primary',
            'laminacion': 'bg-info',
            'corte': 'bg-secondary'
        };
        return clases[proceso] || 'bg-secondary';
    },

    formatProceso: function(proceso) {
        const nombres = {
            'impresion': 'Impresion',
            'laminacion': 'Laminacion',
            'corte': 'Corte'
        };
        return nombres[proceso] || proceso;
    },

    formatNumber: function(num) {
        return new Intl.NumberFormat('es-VE', {
            minimumFractionDigits: 0,
            maximumFractionDigits: 2
        }).format(num);
    }
};

// Inicializar cuando el DOM este listo
document.addEventListener('DOMContentLoaded', () => {
    if (document.getElementById('tablaOrdenes')) {
        Ordenes.init();
    }
});

// Exportar modulo
if (typeof window !== 'undefined') {
    window.Ordenes = Ordenes;
}
