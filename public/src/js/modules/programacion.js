/**
 * Modulo Programacion de Produccion - Sistema Axones
 * Tablero Kanban con drag & drop para gestionar ordenes de trabajo
 */

const Programacion = {
    // Datos
    ordenes: [],
    ordenActual: null,

    // Mapeo de estados/columnas
    COLUMNAS: {
        'pendiente': 'colPendientes',
        'montaje': 'colMontaje',
        'impresion': 'colImpresion',
        'laminacion': 'colLaminacion',
        'corte': 'colCorte',
        'completada': 'colCompletado'
    },

    /**
     * Inicializa el modulo
     */
    init: async function() {
        console.log('Inicializando modulo Programacion');

        // Esperar a que AxonesSync termine de descargar datos del cloud
        await this._esperarSync();

        this.cargarOrdenes();
        this.renderizarTablero();
        this.setupDragDrop();
        this.actualizarContadores();

        // Escuchar cambios del SyncManager para actualizar Kanban
        if (typeof SyncManager !== 'undefined') {
            SyncManager.on('ordenes', () => {
                const stored = localStorage.getItem('axones_ordenes_trabajo');
                if (stored) {
                    this.ordenes = JSON.parse(stored);
                    this.renderizarTablero();
                    this.actualizarContadores();
                    console.log('[Programacion] Kanban actualizado via SyncManager');
                }
            });
        }

        // Escuchar re-sync del cloud para recargar datos
        window.addEventListener('axones-sync', () => {
            this.cargarOrdenes();
            this.renderizarTablero();
            this.actualizarContadores();
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
     * Carga ordenes desde localStorage (sincronizado con Supabase via SyncManager)
     */
    cargarOrdenes: function() {
        // Cargar desde localStorage (sincronizado con Supabase)
        const stored = localStorage.getItem('axones_ordenes_trabajo');
        if (stored) {
            this.ordenes = JSON.parse(stored);
        } else {
            this.ordenes = [];
        }

        // Ordenar por prioridad y fecha
        this.ordenes.sort((a, b) => {
            const prioridadOrder = { 'urgente': 0, 'alta': 1, 'normal': 2 };
            const prioA = prioridadOrder[a.prioridad] || 2;
            const prioB = prioridadOrder[b.prioridad] || 2;

            if (prioA !== prioB) return prioA - prioB;

            const fechaA = new Date(a.fechaEntrega || '9999-12-31');
            const fechaB = new Date(b.fechaEntrega || '9999-12-31');
            return fechaA - fechaB;
        });
    },

    /**
     * Guarda ordenes en localStorage (sincronizado con Supabase via SyncManager)
     */
    guardarOrdenes: function() {
        localStorage.setItem('axones_ordenes_trabajo', JSON.stringify(this.ordenes));
    },

    /**
     * Renderiza el tablero completo
     */
    renderizarTablero: function() {
        // Limpiar todas las columnas
        Object.values(this.COLUMNAS).forEach(colId => {
            const col = document.getElementById(colId);
            if (col) col.innerHTML = '';
        });

        // Distribuir ordenes en columnas segun su estado actual
        this.ordenes.forEach(orden => {
            const columna = this.determinarColumna(orden);
            const container = document.getElementById(this.COLUMNAS[columna]);

            if (container) {
                container.innerHTML += this.crearTarjetaOrden(orden);
            }
        });

        // Agregar placeholder en columnas vacias
        Object.values(this.COLUMNAS).forEach(colId => {
            const col = document.getElementById(colId);
            if (col && col.children.length === 0) {
                col.innerHTML = `
                    <div class="text-center text-muted py-4">
                        <i class="bi bi-inbox fs-2 d-block mb-2"></i>
                        <small>Sin ordenes</small>
                    </div>
                `;
            }
        });

        this.actualizarContadores();
    },

    /**
     * Determina la columna para una orden segun su estado y proceso actual
     */
    determinarColumna: function(orden) {
        const estado = orden.estadoOrden || orden.estado || 'pendiente';

        if (estado === 'completada') return 'completada';
        if (estado === 'pendiente') return 'pendiente';
        if (estado === 'montaje') return 'montaje';

        // Si esta en proceso, determinar por la maquina asignada o proceso actual
        const maquina = (orden.maquina || '').toUpperCase();
        const procesoActual = (orden.procesoActual || '').toLowerCase();

        // Primero revisar procesoActual si existe
        if (procesoActual === 'montaje') return 'montaje';
        if (procesoActual === 'impresion') return 'impresion';
        if (procesoActual === 'laminacion') return 'laminacion';
        if (procesoActual === 'corte') return 'corte';

        // Si no hay procesoActual, determinar por maquina
        if (maquina.includes('COMEXI')) return 'impresion';
        if (maquina.includes('LAMINADORA')) return 'laminacion';
        if (maquina.includes('CORTADORA')) return 'corte';

        return 'pendiente';
    },

    /**
     * Crea el HTML de una tarjeta de orden
     */
    crearTarjetaOrden: function(orden) {
        const prioridad = orden.prioridad || 'normal';
        const prioridadClass = `priority-${prioridad}`;
        const cardClass = prioridad === 'urgente' ? 'urgente' : prioridad === 'alta' ? 'alta' : 'normal';

        // Calcular dias restantes
        const diasRestantes = this.calcularDiasRestantes(orden.fechaEntrega);
        let fechaClass = '';
        let fechaIcon = 'bi-calendar';

        if (diasRestantes !== null) {
            if (diasRestantes < 0) {
                fechaClass = 'late';
                fechaIcon = 'bi-exclamation-triangle-fill';
            } else if (diasRestantes === 0) {
                fechaClass = 'today';
                fechaIcon = 'bi-clock-fill';
            }
        }

        const fechaTexto = orden.fechaEntrega
            ? this.formatearFecha(orden.fechaEntrega)
            : 'Sin fecha';

        return `
            <div class="order-card ${cardClass}" draggable="true" data-id="${orden.id}">
                <div class="order-card-header">
                    <span class="order-number">${orden.numeroOrden || '-'}</span>
                    <span class="order-priority ${prioridadClass}">${prioridad.toUpperCase()}</span>
                </div>
                <div class="order-client">${orden.cliente || 'Sin cliente'}</div>
                <div class="order-product">${orden.producto || 'Sin producto'}</div>
                <div class="order-details">
                    ${orden.pedidoKg ? `
                        <span class="order-detail">
                            <i class="bi bi-box-seam"></i>
                            ${this.formatNumber(orden.pedidoKg)} Kg
                        </span>
                    ` : ''}
                    ${orden.maquina ? `
                        <span class="order-detail">
                            <i class="bi bi-gear"></i>
                            ${orden.maquina}
                        </span>
                    ` : ''}
                    ${orden.tipoMaterial ? `
                        <span class="order-detail">
                            <i class="bi bi-layers"></i>
                            ${orden.tipoMaterial}
                        </span>
                    ` : ''}
                </div>
                <div class="order-footer">
                    <span class="order-date ${fechaClass}">
                        <i class="bi ${fechaIcon} me-1"></i>${fechaTexto}
                        ${diasRestantes !== null && diasRestantes >= 0 ? `(${diasRestantes}d)` : diasRestantes < 0 ? '(Vencido)' : ''}
                    </span>
                    <div class="order-actions">
                        <button class="btn btn-outline-primary" onclick="Programacion.verOrden('${orden.id}')" title="Ver detalle">
                            <i class="bi bi-eye"></i>
                        </button>
                        <button class="btn btn-outline-success" onclick="Programacion.avanzarOrden('${orden.id}')" title="Avanzar">
                            <i class="bi bi-arrow-right"></i>
                        </button>
                    </div>
                </div>
            </div>
        `;
    },

    /**
     * Calcula dias restantes hasta la fecha de entrega
     */
    calcularDiasRestantes: function(fecha) {
        if (!fecha) return null;

        const hoy = new Date();
        hoy.setHours(0, 0, 0, 0);
        const entrega = new Date(fecha);
        entrega.setHours(0, 0, 0, 0);

        const diff = entrega - hoy;
        return Math.ceil(diff / (1000 * 60 * 60 * 24));
    },

    /**
     * Formatea una fecha
     */
    formatearFecha: function(fecha) {
        if (!fecha) return '-';
        const d = new Date(fecha);
        return d.toLocaleDateString('es-VE', { day: '2-digit', month: 'short' });
    },

    /**
     * Formatea numeros
     */
    formatNumber: function(num) {
        return new Intl.NumberFormat('es-VE', {
            minimumFractionDigits: 0,
            maximumFractionDigits: 2
        }).format(num);
    },

    /**
     * Configura drag and drop
     */
    setupDragDrop: function() {
        // Drag start
        document.addEventListener('dragstart', (e) => {
            if (e.target.classList.contains('order-card')) {
                e.target.classList.add('dragging');
                e.dataTransfer.setData('text/plain', e.target.dataset.id);
                e.dataTransfer.effectAllowed = 'move';
            }
        });

        // Drag end
        document.addEventListener('dragend', (e) => {
            if (e.target.classList.contains('order-card')) {
                e.target.classList.remove('dragging');
            }
            document.querySelectorAll('.kanban-body').forEach(col => {
                col.classList.remove('drag-over');
            });
        });

        // Drag over (allow drop)
        document.querySelectorAll('.kanban-body').forEach(container => {
            container.addEventListener('dragover', (e) => {
                e.preventDefault();
                e.dataTransfer.dropEffect = 'move';
                container.classList.add('drag-over');
            });

            container.addEventListener('dragleave', (e) => {
                // Solo quitar clase si salimos del contenedor
                if (!container.contains(e.relatedTarget)) {
                    container.classList.remove('drag-over');
                }
            });

            container.addEventListener('drop', (e) => {
                e.preventDefault();
                container.classList.remove('drag-over');

                const ordenId = e.dataTransfer.getData('text/plain');
                const nuevoEstado = container.dataset.status;

                this.moverOrden(ordenId, nuevoEstado);
            });
        });
    },

    /**
     * Mueve una orden a un nuevo estado/columna
     */
    moverOrden: function(ordenId, nuevoEstado) {
        const orden = this.ordenes.find(o => o.id === ordenId);
        if (!orden) return;

        const estadoAnterior = this.determinarColumna(orden);

        if (estadoAnterior === nuevoEstado) return;

        // Actualizar estado y proceso actual
        if (nuevoEstado === 'completada') {
            orden.estadoOrden = 'completada';
            orden.fechaCompletado = new Date().toISOString();
        } else if (nuevoEstado === 'pendiente') {
            orden.estadoOrden = 'pendiente';
            orden.procesoActual = null;
        } else {
            orden.estadoOrden = 'en-proceso';
            orden.procesoActual = nuevoEstado;
        }

        this.guardarOrdenes();
        this.renderizarTablero();

        const nombreEstado = this.getNombreEstado(nuevoEstado);
        if (typeof Axones !== 'undefined') {
            Axones.showSuccess(`Orden ${orden.numeroOrden} movida a ${nombreEstado}`);
        }
    },

    /**
     * Obtiene nombre legible del estado
     */
    getNombreEstado: function(estado) {
        const nombres = {
            'pendiente': 'Pendientes',
            'montaje': 'Montaje',
            'impresion': 'Impresion',
            'laminacion': 'Laminacion',
            'corte': 'Corte',
            'completada': 'Completado'
        };
        return nombres[estado] || estado;
    },

    /**
     * Avanza una orden al siguiente proceso
     * Flujo: Pendiente -> Montaje -> Impresion -> Laminacion -> Corte -> Completado
     */
    avanzarOrden: function(ordenId) {
        const orden = this.ordenes.find(o => o.id === ordenId);
        if (!orden) return;

        const columnaActual = this.determinarColumna(orden);
        const flujo = ['pendiente', 'montaje', 'impresion', 'laminacion', 'corte', 'completada'];

        const indexActual = flujo.indexOf(columnaActual);

        if (indexActual < flujo.length - 1) {
            const siguienteEstado = flujo[indexActual + 1];
            this.moverOrden(ordenId, siguienteEstado);
        }
    },

    /**
     * Muestra el detalle de una orden en modal
     */
    verOrden: function(ordenId) {
        const orden = this.ordenes.find(o => o.id === ordenId);
        if (!orden) return;

        this.ordenActual = orden;

        // Titulo
        document.getElementById('modalOrdenTitulo').textContent = orden.numeroOrden || 'Orden de Trabajo';

        // Contenido
        const contenido = document.getElementById('modalOrdenContenido');
        contenido.innerHTML = `
            <div class="row">
                <div class="col-md-6">
                    <h6 class="border-bottom pb-2 mb-3"><i class="bi bi-receipt me-2"></i>Datos del Pedido</h6>
                    <table class="table table-sm">
                        <tr><td class="text-muted" style="width:40%">Maquina:</td><td><strong>${orden.maquina || '-'}</strong></td></tr>
                        <tr><td class="text-muted">Fecha:</td><td>${orden.fechaOrden || '-'}</td></tr>
                        <tr><td class="text-muted">Pedido:</td><td><strong>${orden.pedidoKg ? this.formatNumber(orden.pedidoKg) + ' Kg' : '-'}</strong></td></tr>
                        <tr><td class="text-muted">Prioridad:</td><td><span class="badge priority-${orden.prioridad || 'normal'}">${(orden.prioridad || 'normal').toUpperCase()}</span></td></tr>
                        <tr><td class="text-muted">Estado:</td><td><span class="badge ${orden.estadoOrden === 'completada' ? 'bg-success' : orden.estadoOrden === 'en-proceso' ? 'bg-primary' : 'bg-warning text-dark'}">${orden.estadoOrden || 'pendiente'}</span></td></tr>
                    </table>
                </div>
                <div class="col-md-6">
                    <h6 class="border-bottom pb-2 mb-3"><i class="bi bi-box me-2"></i>Datos del Producto</h6>
                    <table class="table table-sm">
                        <tr><td class="text-muted" style="width:40%">Cliente:</td><td><strong>${orden.cliente || '-'}</strong></td></tr>
                        <tr><td class="text-muted">RIF:</td><td>${orden.clienteRif || '-'}</td></tr>
                        <tr><td class="text-muted">Producto:</td><td>${orden.producto || '-'}</td></tr>
                        <tr><td class="text-muted">Estructura:</td><td>${orden.estructuraMaterial || '-'}</td></tr>
                        <tr><td class="text-muted">Cod. Barra:</td><td>${orden.codigoBarra || '-'}</td></tr>
                    </table>
                </div>
            </div>

            ${orden.tipoMaterial ? `
            <div class="row mt-3">
                <div class="col-12">
                    <h6 class="border-bottom pb-2 mb-3"><i class="bi bi-archive me-2"></i>Materia Prima</h6>
                    <div class="row">
                        <div class="col-md-3"><small class="text-muted">Material:</small><br><strong>${orden.tipoMaterial}</strong></div>
                        <div class="col-md-3"><small class="text-muted">Micras:</small><br><strong>${orden.micrasMaterial || '-'}</strong></div>
                        <div class="col-md-3"><small class="text-muted">Ancho:</small><br><strong>${orden.anchoMaterial ? orden.anchoMaterial + ' mm' : '-'}</strong></div>
                        <div class="col-md-3"><small class="text-muted">Proveedor:</small><br><strong>${orden.proveedorMaterial || '-'}</strong></div>
                    </div>
                </div>
            </div>
            ` : ''}

            ${orden.tintas && orden.tintas.length > 0 ? `
            <div class="row mt-3">
                <div class="col-12">
                    <h6 class="border-bottom pb-2 mb-3"><i class="bi bi-droplet me-2"></i>Tintas (${orden.tintas.length} colores)</h6>
                    <div class="d-flex flex-wrap gap-2">
                        ${orden.tintas.map(t => `<span class="badge bg-secondary">${t.color}</span>`).join('')}
                    </div>
                </div>
            </div>
            ` : ''}

            <div class="row mt-3">
                <div class="col-md-6">
                    <h6 class="border-bottom pb-2 mb-3"><i class="bi bi-calendar-check me-2"></i>Programacion</h6>
                    <table class="table table-sm">
                        <tr><td class="text-muted">Fecha Inicio:</td><td>${orden.fechaInicio || '-'}</td></tr>
                        <tr><td class="text-muted">Fecha Entrega:</td><td><strong>${orden.fechaEntrega || '-'}</strong></td></tr>
                    </table>
                </div>
                <div class="col-md-6">
                    ${orden.observacionesGenerales ? `
                    <h6 class="border-bottom pb-2 mb-3"><i class="bi bi-chat-text me-2"></i>Observaciones</h6>
                    <p class="small">${orden.observacionesGenerales}</p>
                    ` : ''}
                </div>
            </div>
        `;

        // Boton editar
        document.getElementById('btnEditarOrden').href = `ordenes.html?edit=${orden.id}`;

        // Mostrar modal
        new bootstrap.Modal(document.getElementById('modalVerOrden')).show();
    },

    /**
     * Actualiza todos los contadores
     */
    actualizarContadores: function() {
        // Contadores por columna
        const conteos = {
            pendiente: 0,
            montaje: 0,
            impresion: 0,
            laminacion: 0,
            corte: 0,
            completada: 0
        };

        this.ordenes.forEach(orden => {
            const columna = this.determinarColumna(orden);
            conteos[columna]++;
        });

        // Actualizar badges en columnas
        Object.keys(conteos).forEach(col => {
            const countEl = document.getElementById(`count${col.charAt(0).toUpperCase() + col.slice(1)}${col === 'completada' ? '' : ''}`);
            if (countEl) countEl.textContent = conteos[col];
        });

        // Corregir IDs especificos
        const countPendientes = document.getElementById('countPendientes');
        const countMontaje = document.getElementById('countMontaje');
        const countCompletado = document.getElementById('countCompletado');
        if (countPendientes) countPendientes.textContent = conteos.pendiente;
        if (countMontaje) countMontaje.textContent = conteos.montaje;
        if (countCompletado) countCompletado.textContent = conteos.completada;

        // Resumen superior
        const totalPendientes = conteos.pendiente;
        const totalEnProceso = conteos.montaje + conteos.impresion + conteos.laminacion + conteos.corte;
        const totalCompletadas = conteos.completada;
        const totalUrgentes = this.ordenes.filter(o =>
            o.prioridad === 'urgente' && this.determinarColumna(o) !== 'completada'
        ).length;

        document.getElementById('sumPendientes').textContent = totalPendientes;
        document.getElementById('sumEnProceso').textContent = totalEnProceso;
        document.getElementById('sumCompletadas').textContent = totalCompletadas;
        document.getElementById('sumUrgentes').textContent = totalUrgentes;

        // Badges de columna especificos
        document.getElementById('countImpresion').textContent = conteos.impresion;
        document.getElementById('countLaminacion').textContent = conteos.laminacion;
        document.getElementById('countCorte').textContent = conteos.corte;
    },

    /**
     * Refresca el tablero
     */
    refrescar: function() {
        this.cargarOrdenes();
        this.renderizarTablero();

        if (typeof Axones !== 'undefined') {
            Axones.showSuccess('Tablero actualizado');
        }
    }
};

// Inicializar cuando el DOM este listo
document.addEventListener('DOMContentLoaded', () => {
    if (document.getElementById('kanbanBoard')) {
        Programacion.init();
    }
});

// Exportar modulo
if (typeof window !== 'undefined') {
    window.Programacion = Programacion;
}
