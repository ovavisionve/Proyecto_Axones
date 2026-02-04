/**
 * Modulo Programacion de Produccion - Sistema Axones
 * Cola de produccion estilo Kanban para gestionar OTs
 */

const Programacion = {
    // Ordenes de trabajo
    ordenes: [],

    /**
     * Inicializa el modulo
     */
    init: function() {
        console.log('Inicializando modulo Programacion');

        this.setDefaultDate();
        this.cargarOrdenes();
        this.renderizarColas();
        this.setupDragDrop();
    },

    /**
     * Establece fecha actual en filtro
     */
    setDefaultDate: function() {
        const fechaInput = document.getElementById('filtroFecha');
        if (fechaInput) {
            fechaInput.value = new Date().toISOString().split('T')[0];
        }
    },

    /**
     * Carga ordenes desde localStorage o genera demo
     */
    cargarOrdenes: function() {
        const stored = localStorage.getItem(CONFIG.CACHE.PREFIJO + 'programacion');
        if (stored) {
            this.ordenes = JSON.parse(stored);
        } else {
            // Datos demo
            this.ordenes = [
                {
                    id: 'OT-2024-001',
                    cliente: 'Alimentos del Valle',
                    producto: 'Empaque Galletas 250g',
                    cantidad: 1500,
                    fechaEntrega: '2024-02-10',
                    area: 'impresion',
                    flujo: 'normal',
                    prioridad: 3,
                    estado: 'pendiente',
                    observaciones: 'Cliente frecuente'
                },
                {
                    id: 'OT-2024-002',
                    cliente: 'Lacteos Premium',
                    producto: 'Bolsa Leche 1L',
                    cantidad: 2000,
                    fechaEntrega: '2024-02-08',
                    area: 'impresion',
                    flujo: 'normal',
                    prioridad: 4,
                    estado: 'en-proceso',
                    observaciones: 'URGENTE - Cliente prioritario'
                },
                {
                    id: 'OT-2024-003',
                    cliente: 'Snacks Andinos',
                    producto: 'Empaque Chips 150g',
                    cantidad: 800,
                    fechaEntrega: '2024-02-12',
                    area: 'laminacion',
                    flujo: 'normal',
                    prioridad: 2,
                    estado: 'pendiente',
                    observaciones: ''
                },
                {
                    id: 'OT-2024-004',
                    cliente: 'Cafe Selecto',
                    producto: 'Bolsa Cafe 500g',
                    cantidad: 1200,
                    fechaEntrega: '2024-02-15',
                    area: 'corte',
                    flujo: 'normal',
                    prioridad: 1,
                    estado: 'pendiente',
                    observaciones: ''
                },
                {
                    id: 'OT-2024-005',
                    cliente: 'Panaderia Central',
                    producto: 'Bolsa Pan Molde',
                    cantidad: 500,
                    fechaEntrega: '2024-02-09',
                    area: 'impresion',
                    flujo: 'superficie',
                    prioridad: 2,
                    estado: 'pendiente',
                    observaciones: 'Sin laminacion'
                }
            ];
            this.guardarOrdenes();
        }
    },

    /**
     * Guarda ordenes en localStorage
     */
    guardarOrdenes: function() {
        localStorage.setItem(CONFIG.CACHE.PREFIJO + 'programacion', JSON.stringify(this.ordenes));
    },

    /**
     * Renderiza las colas de produccion
     */
    renderizarColas: function() {
        const areas = ['impresion', 'laminacion', 'corte'];

        areas.forEach(area => {
            const container = document.getElementById(`cola${area.charAt(0).toUpperCase() + area.slice(1)}`);
            if (!container) return;

            const ordenes = this.ordenes.filter(o => o.area === area && o.estado !== 'completado');
            ordenes.sort((a, b) => b.prioridad - a.prioridad);

            if (ordenes.length === 0) {
                container.innerHTML = '<div class="text-center text-muted py-4"><i class="bi bi-inbox fs-1"></i><p class="small mt-2">Sin ordenes pendientes</p></div>';
            } else {
                container.innerHTML = ordenes.map(o => this.renderizarTarjeta(o)).join('');
            }

            // Actualizar contador
            const countEl = document.getElementById(`count${area.charAt(0).toUpperCase() + area.slice(1)}`);
            if (countEl) countEl.textContent = ordenes.length;
        });

        this.actualizarResumen();
    },

    /**
     * Renderiza una tarjeta de OT
     */
    renderizarTarjeta: function(orden) {
        const prioridadColor = {
            1: 'bg-secondary',
            2: 'bg-info',
            3: 'bg-warning',
            4: 'bg-danger'
        };

        const estadoClass = orden.estado === 'en-proceso' ? 'en-proceso' : (orden.prioridad === 4 ? 'urgente' : '');

        const diasRestantes = this.calcularDiasRestantes(orden.fechaEntrega);
        const diasBadge = diasRestantes < 0
            ? '<span class="badge bg-danger">Vencido</span>'
            : diasRestantes === 0
                ? '<span class="badge bg-warning text-dark">Hoy</span>'
                : diasRestantes <= 2
                    ? `<span class="badge bg-warning text-dark">${diasRestantes}d</span>`
                    : `<span class="badge bg-light text-dark">${diasRestantes}d</span>`;

        return `
            <div class="card queue-card mb-2 ${estadoClass}" draggable="true" data-id="${orden.id}">
                <div class="card-body p-2">
                    <div class="d-flex justify-content-between align-items-start mb-1">
                        <div>
                            <span class="priority-badge ${prioridadColor[orden.prioridad]}">${orden.prioridad}</span>
                            <strong class="ms-2 small">${orden.id}</strong>
                        </div>
                        <div>
                            ${diasBadge}
                            <div class="dropdown d-inline">
                                <button class="btn btn-sm btn-link p-0 ms-1" data-bs-toggle="dropdown">
                                    <i class="bi bi-three-dots-vertical"></i>
                                </button>
                                <ul class="dropdown-menu dropdown-menu-end">
                                    <li><a class="dropdown-item small" href="#" onclick="Programacion.cambiarEstado('${orden.id}', 'en-proceso')"><i class="bi bi-play-circle me-2"></i>Iniciar</a></li>
                                    <li><a class="dropdown-item small" href="#" onclick="Programacion.avanzarArea('${orden.id}')"><i class="bi bi-arrow-right-circle me-2"></i>Avanzar</a></li>
                                    <li><a class="dropdown-item small" href="#" onclick="Programacion.cambiarEstado('${orden.id}', 'completado')"><i class="bi bi-check-circle me-2"></i>Completar</a></li>
                                    <li><hr class="dropdown-divider"></li>
                                    <li><a class="dropdown-item small text-danger" href="#" onclick="Programacion.eliminar('${orden.id}')"><i class="bi bi-trash me-2"></i>Eliminar</a></li>
                                </ul>
                            </div>
                        </div>
                    </div>
                    <div class="small fw-medium">${orden.cliente}</div>
                    <div class="small text-muted text-truncate">${orden.producto}</div>
                    <div class="d-flex justify-content-between mt-2 small">
                        <span><i class="bi bi-box me-1"></i>${orden.cantidad} Kg</span>
                        <span class="badge ${orden.estado === 'en-proceso' ? 'bg-success' : 'bg-secondary'}">${orden.estado}</span>
                    </div>
                    ${orden.observaciones ? `<div class="small text-muted mt-1 fst-italic"><i class="bi bi-chat me-1"></i>${orden.observaciones}</div>` : ''}
                </div>
            </div>
        `;
    },

    /**
     * Calcula dias restantes hasta fecha de entrega
     */
    calcularDiasRestantes: function(fechaEntrega) {
        const hoy = new Date();
        hoy.setHours(0, 0, 0, 0);
        const entrega = new Date(fechaEntrega);
        entrega.setHours(0, 0, 0, 0);
        const diff = entrega - hoy;
        return Math.ceil(diff / (1000 * 60 * 60 * 24));
    },

    /**
     * Actualiza el resumen de estadisticas
     */
    actualizarResumen: function() {
        const pendientes = this.ordenes.filter(o => o.estado === 'pendiente').length;
        const enProceso = this.ordenes.filter(o => o.estado === 'en-proceso').length;
        const completados = this.ordenes.filter(o => o.estado === 'completado').length;
        const urgentes = this.ordenes.filter(o => o.prioridad === 4 && o.estado !== 'completado').length;

        document.getElementById('totalPendientes').textContent = pendientes;
        document.getElementById('totalEnProceso').textContent = enProceso;
        document.getElementById('totalCompletados').textContent = completados;
        document.getElementById('totalUrgentes').textContent = urgentes;
    },

    /**
     * Configura drag and drop
     */
    setupDragDrop: function() {
        document.querySelectorAll('.queue-container').forEach(container => {
            container.addEventListener('dragover', (e) => {
                e.preventDefault();
                container.classList.add('bg-light');
            });

            container.addEventListener('dragleave', () => {
                container.classList.remove('bg-light');
            });

            container.addEventListener('drop', (e) => {
                e.preventDefault();
                container.classList.remove('bg-light');
                const id = e.dataTransfer.getData('text/plain');
                const nuevaArea = container.dataset.area;
                this.moverOrden(id, nuevaArea);
            });
        });

        // Evento en tarjetas (delegado)
        document.addEventListener('dragstart', (e) => {
            if (e.target.classList.contains('queue-card')) {
                e.target.classList.add('dragging');
                e.dataTransfer.setData('text/plain', e.target.dataset.id);
            }
        });

        document.addEventListener('dragend', (e) => {
            if (e.target.classList.contains('queue-card')) {
                e.target.classList.remove('dragging');
            }
        });
    },

    /**
     * Mueve una orden a otra area
     */
    moverOrden: function(id, nuevaArea) {
        const orden = this.ordenes.find(o => o.id === id);
        if (orden && orden.area !== nuevaArea) {
            orden.area = nuevaArea;
            this.guardarOrdenes();
            this.renderizarColas();
            Axones.showSuccess(`OT ${id} movida a ${nuevaArea}`);
        }
    },

    /**
     * Cambia el estado de una orden
     */
    cambiarEstado: function(id, nuevoEstado) {
        const orden = this.ordenes.find(o => o.id === id);
        if (orden) {
            orden.estado = nuevoEstado;
            if (nuevoEstado === 'completado') {
                orden.fechaCompletado = new Date().toISOString();
            }
            this.guardarOrdenes();
            this.renderizarColas();
            Axones.showSuccess(`OT ${id} marcada como ${nuevoEstado}`);
        }
    },

    /**
     * Avanza una orden al siguiente proceso del flujo
     */
    avanzarArea: function(id) {
        const orden = this.ordenes.find(o => o.id === id);
        if (!orden) return;

        const flujos = {
            normal: ['impresion', 'laminacion', 'corte'],
            superficie: ['impresion', 'corte'],
            'solo-corte': ['corte']
        };

        const flujo = flujos[orden.flujo] || flujos.normal;
        const indexActual = flujo.indexOf(orden.area);

        if (indexActual < flujo.length - 1) {
            orden.area = flujo[indexActual + 1];
            orden.estado = 'pendiente';
            this.guardarOrdenes();
            this.renderizarColas();
            Axones.showSuccess(`OT ${id} avanzada a ${orden.area}`);
        } else {
            // Ya esta en el ultimo proceso
            this.cambiarEstado(id, 'completado');
        }
    },

    /**
     * Elimina una orden
     */
    eliminar: function(id) {
        if (!confirm(`¿Eliminar la orden ${id}?`)) return;

        this.ordenes = this.ordenes.filter(o => o.id !== id);
        this.guardarOrdenes();
        this.renderizarColas();
        Axones.showSuccess(`OT ${id} eliminada`);
    },

    /**
     * Agrega una nueva OT desde el modal
     */
    agregarOT: function() {
        const form = document.getElementById('formNuevaOT');
        if (!form.checkValidity()) {
            form.reportValidity();
            return;
        }

        const nuevaOrden = {
            id: document.getElementById('nuevaOT').value.trim(),
            cliente: document.getElementById('nuevoCliente').value.trim(),
            producto: document.getElementById('nuevoProducto').value.trim(),
            cantidad: parseFloat(document.getElementById('nuevaCantidad').value),
            fechaEntrega: document.getElementById('nuevaFechaEntrega').value,
            area: document.getElementById('nuevaArea').value,
            flujo: document.getElementById('nuevoFlujo').value,
            prioridad: parseInt(document.getElementById('nuevaPrioridad').value),
            estado: 'pendiente',
            observaciones: document.getElementById('nuevasObservaciones').value.trim(),
            fechaCreacion: new Date().toISOString()
        };

        // Verificar duplicado
        if (this.ordenes.some(o => o.id === nuevaOrden.id)) {
            Axones.showError('Ya existe una OT con ese numero');
            return;
        }

        this.ordenes.push(nuevaOrden);
        this.guardarOrdenes();
        this.renderizarColas();

        // Cerrar modal y limpiar
        const modal = bootstrap.Modal.getInstance(document.getElementById('modalNuevaOT'));
        modal.hide();
        form.reset();

        Axones.showSuccess(`OT ${nuevaOrden.id} creada correctamente`);
    },

    /**
     * Filtra las ordenes
     */
    filtrar: function() {
        const fecha = document.getElementById('filtroFecha').value;
        const area = document.getElementById('filtroArea').value;
        const estado = document.getElementById('filtroEstado').value;
        const cliente = document.getElementById('filtroCliente').value.toLowerCase();

        // Recargar todas y filtrar
        this.cargarOrdenes();

        if (area) {
            this.ordenes = this.ordenes.filter(o => o.area === area);
        }

        if (estado) {
            this.ordenes = this.ordenes.filter(o => o.estado === estado);
        }

        if (cliente) {
            this.ordenes = this.ordenes.filter(o =>
                o.cliente.toLowerCase().includes(cliente) ||
                o.producto.toLowerCase().includes(cliente) ||
                o.id.toLowerCase().includes(cliente)
            );
        }

        this.renderizarColas();
    },

    /**
     * Limpia los filtros
     */
    limpiarFiltros: function() {
        document.getElementById('filtroArea').value = '';
        document.getElementById('filtroEstado').value = '';
        document.getElementById('filtroCliente').value = '';
        this.setDefaultDate();
        this.cargarOrdenes();
        this.renderizarColas();
    }
};

// Inicializar
document.addEventListener('DOMContentLoaded', () => {
    if (document.getElementById('vistaKanban')) {
        Programacion.init();
    }
});

// Exportar
if (typeof window !== 'undefined') {
    window.Programacion = Programacion;
}
