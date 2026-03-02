/**
 * Modulo Incidencias - Sistema Axones
 * Registro y seguimiento de incidencias en produccion
 * Categorias: Cliente, Inventario, Maquina, Otro
 */

const Incidencias = {
    STORAGE_KEY: 'axones_incidencias',

    // Categorias de incidencias
    CATEGORIAS: [
        { id: 'cliente', nombre: 'Cliente', icono: 'bi-person-x', color: 'danger' },
        { id: 'inventario', nombre: 'Inventario', icono: 'bi-box-seam', color: 'warning' },
        { id: 'maquina', nombre: 'Maquina', icono: 'bi-gear', color: 'info' },
        { id: 'calidad', nombre: 'Calidad', icono: 'bi-patch-exclamation', color: 'danger' },
        { id: 'proceso', nombre: 'Proceso', icono: 'bi-diagram-3', color: 'primary' },
        { id: 'otro', nombre: 'Otro', icono: 'bi-question-circle', color: 'secondary' }
    ],

    // Niveles de severidad
    SEVERIDADES: [
        { id: 'baja', nombre: 'Baja', color: 'success' },
        { id: 'media', nombre: 'Media', color: 'warning' },
        { id: 'alta', nombre: 'Alta', color: 'danger' },
        { id: 'critica', nombre: 'Critica', color: 'dark' }
    ],

    // Estados
    ESTADOS: [
        { id: 'abierta', nombre: 'Abierta', color: 'danger' },
        { id: 'en_proceso', nombre: 'En Proceso', color: 'warning' },
        { id: 'resuelta', nombre: 'Resuelta', color: 'success' },
        { id: 'cerrada', nombre: 'Cerrada', color: 'secondary' }
    ],

    // Datos
    incidencias: [],
    filteredIncidencias: [],

    /**
     * Inicializa el modulo
     */
    init: function() {
        console.log('Inicializando modulo Incidencias');

        this.loadIncidencias();
        this.setupEventListeners();
        this.poblarSelectores();
        this.renderIncidencias();
        this.updateContadores();
    },

    /**
     * Carga incidencias desde localStorage
     */
    loadIncidencias: function() {
        try {
            this.incidencias = JSON.parse(localStorage.getItem(this.STORAGE_KEY) || '[]');
        } catch (e) {
            this.incidencias = [];
        }
        this.filteredIncidencias = [...this.incidencias];
    },

    /**
     * Guarda incidencias en localStorage
     */
    saveIncidencias: function() {
        localStorage.setItem(this.STORAGE_KEY, JSON.stringify(this.incidencias));
    },

    /**
     * Configura event listeners
     */
    setupEventListeners: function() {
        // Boton nueva incidencia
        const btnNueva = document.getElementById('btnNuevaIncidencia');
        if (btnNueva) {
            btnNueva.addEventListener('click', () => this.abrirModalNueva());
        }

        // Guardar incidencia
        const btnGuardar = document.getElementById('btnGuardarIncidencia');
        if (btnGuardar) {
            btnGuardar.addEventListener('click', () => this.guardarIncidencia());
        }

        // Filtros
        ['filtroCategoria', 'filtroSeveridad', 'filtroEstado', 'buscarIncidencia'].forEach(id => {
            const el = document.getElementById(id);
            if (el) {
                el.addEventListener('change', () => this.aplicarFiltros());
                el.addEventListener('input', () => this.aplicarFiltros());
            }
        });

        // Categoria cambia opciones relacionadas
        const categoriaSelect = document.getElementById('incCategoria');
        if (categoriaSelect) {
            categoriaSelect.addEventListener('change', (e) => this.onCategoriaChange(e.target.value));
        }
    },

    /**
     * Pobla los selectores del formulario
     */
    poblarSelectores: function() {
        // Categorias
        const categoriaSelect = document.getElementById('incCategoria');
        const filtroCat = document.getElementById('filtroCategoria');
        if (categoriaSelect) {
            categoriaSelect.innerHTML = '<option value="">Seleccione categoria...</option>' +
                this.CATEGORIAS.map(c => `<option value="${c.id}">${c.nombre}</option>`).join('');
        }
        if (filtroCat) {
            filtroCat.innerHTML = '<option value="">Todas</option>' +
                this.CATEGORIAS.map(c => `<option value="${c.id}">${c.nombre}</option>`).join('');
        }

        // Severidades
        const severidadSelect = document.getElementById('incSeveridad');
        const filtroSev = document.getElementById('filtroSeveridad');
        if (severidadSelect) {
            severidadSelect.innerHTML = '<option value="">Seleccione severidad...</option>' +
                this.SEVERIDADES.map(s => `<option value="${s.id}">${s.nombre}</option>`).join('');
        }
        if (filtroSev) {
            filtroSev.innerHTML = '<option value="">Todas</option>' +
                this.SEVERIDADES.map(s => `<option value="${s.id}">${s.nombre}</option>`).join('');
        }

        // Estados (solo filtro)
        const filtroEst = document.getElementById('filtroEstado');
        if (filtroEst) {
            filtroEst.innerHTML = '<option value="">Todos</option>' +
                this.ESTADOS.map(e => `<option value="${e.id}">${e.nombre}</option>`).join('');
        }

        // Cargar clientes para relacion
        this.cargarClientesYMaquinas();
    },

    /**
     * Carga clientes y maquinas para relacionar
     */
    cargarClientesYMaquinas: function() {
        const relacionSelect = document.getElementById('incRelacion');
        if (!relacionSelect) return;

        // Por defecto, mostrar mensaje
        relacionSelect.innerHTML = '<option value="">Seleccione categoria primero...</option>';
    },

    /**
     * Cuando cambia la categoria, actualiza opciones de relacion
     */
    onCategoriaChange: function(categoria) {
        const relacionSelect = document.getElementById('incRelacion');
        const relacionLabel = document.getElementById('labelRelacion');
        if (!relacionSelect) return;

        let opciones = [];
        let label = 'Relacionado con';

        switch (categoria) {
            case 'cliente':
                label = 'Cliente afectado';
                const clientes = CONFIG?.CLIENTES || ['PEPSICO', 'NESTLE', 'POLAR', 'MARY'];
                opciones = clientes.map(c => ({ id: c, nombre: c }));
                break;

            case 'inventario':
                label = 'Material afectado';
                opciones = [
                    { id: 'BOPP NORMAL', nombre: 'BOPP NORMAL' },
                    { id: 'BOPP MATE', nombre: 'BOPP MATE' },
                    { id: 'CAST', nombre: 'CAST' },
                    { id: 'METAL', nombre: 'METAL' },
                    { id: 'PEBD', nombre: 'PEBD' },
                    { id: 'TINTAS', nombre: 'Tintas' },
                    { id: 'ADHESIVOS', nombre: 'Adhesivos/Quimicos' }
                ];
                break;

            case 'maquina':
                label = 'Maquina afectada';
                const maquinas = CONFIG?.MAQUINAS || [
                    'COMEXI FW1', 'COMEXI FW2', 'COMEXI FP',
                    'Laminadora 1', 'Laminadora 2',
                    'Cortadora 1', 'Cortadora 2', 'Cortadora 3'
                ];
                opciones = maquinas.map(m => ({ id: m, nombre: m }));
                break;

            case 'calidad':
                label = 'Tipo de defecto';
                opciones = [
                    { id: 'registro', nombre: 'Fuera de registro' },
                    { id: 'color', nombre: 'Variacion de color' },
                    { id: 'impresion', nombre: 'Defecto de impresion' },
                    { id: 'sellado', nombre: 'Defecto de sellado' },
                    { id: 'corte', nombre: 'Defecto de corte' },
                    { id: 'otro', nombre: 'Otro defecto' }
                ];
                break;

            case 'proceso':
                label = 'Fase del proceso';
                opciones = [
                    { id: 'impresion', nombre: 'Impresion' },
                    { id: 'laminacion', nombre: 'Laminacion' },
                    { id: 'corte', nombre: 'Corte' },
                    { id: 'embalaje', nombre: 'Embalaje' }
                ];
                break;

            default:
                label = 'Relacionado con';
                opciones = [];
        }

        if (labelRelacion) labelRelacion.textContent = label;

        relacionSelect.innerHTML = '<option value="">Seleccione...</option>' +
            opciones.map(o => `<option value="${o.id}">${o.nombre}</option>`).join('');
    },

    /**
     * Abre modal para nueva incidencia
     */
    abrirModalNueva: function() {
        // Limpiar formulario
        document.getElementById('formIncidencia')?.reset();
        document.getElementById('incidenciaId').value = '';
        document.getElementById('modalIncidenciaLabel').textContent = 'Nueva Incidencia';

        // Setear fecha actual
        const fechaInput = document.getElementById('incFecha');
        if (fechaInput) {
            fechaInput.value = new Date().toISOString().slice(0, 16);
        }

        // Abrir modal
        const modal = new bootstrap.Modal(document.getElementById('modalIncidencia'));
        modal.show();
    },

    /**
     * Guarda una incidencia
     */
    guardarIncidencia: async function() {
        const form = document.getElementById('formIncidencia');
        if (!form.checkValidity()) {
            form.reportValidity();
            return;
        }

        const incidenciaId = document.getElementById('incidenciaId').value;
        const esEdicion = !!incidenciaId;

        const incidencia = {
            id: incidenciaId || 'INC_' + Date.now(),
            categoria: document.getElementById('incCategoria').value,
            severidad: document.getElementById('incSeveridad').value,
            relacion: document.getElementById('incRelacion').value,
            ordenTrabajo: document.getElementById('incOrdenTrabajo').value || null,
            titulo: document.getElementById('incTitulo').value,
            descripcion: document.getElementById('incDescripcion').value,
            fecha: document.getElementById('incFecha').value,
            reportadoPor: document.getElementById('incReportadoPor').value,
            estado: esEdicion ? this.incidencias.find(i => i.id === incidenciaId)?.estado : 'abierta',
            fechaCreacion: esEdicion ? this.incidencias.find(i => i.id === incidenciaId)?.fechaCreacion : new Date().toISOString(),
            fechaModificacion: new Date().toISOString(),
            historial: []
        };

        if (esEdicion) {
            const index = this.incidencias.findIndex(i => i.id === incidenciaId);
            if (index !== -1) {
                incidencia.historial = this.incidencias[index].historial || [];
                incidencia.historial.push({
                    fecha: new Date().toISOString(),
                    accion: 'Editada',
                    usuario: incidencia.reportadoPor
                });
                this.incidencias[index] = incidencia;
            }
        } else {
            incidencia.historial.push({
                fecha: new Date().toISOString(),
                accion: 'Creada',
                usuario: incidencia.reportadoPor
            });
            this.incidencias.unshift(incidencia);
        }

        this.saveIncidencias();
        this.filteredIncidencias = [...this.incidencias];
        this.renderIncidencias();
        this.updateContadores();

        // Enviar a API/Sheets
        await this.enviarASheets(incidencia);

        // Cerrar modal
        bootstrap.Modal.getInstance(document.getElementById('modalIncidencia'))?.hide();

        if (typeof Axones !== 'undefined') {
            Axones.showSuccess(esEdicion ? 'Incidencia actualizada' : 'Incidencia registrada');
        }
    },

    /**
     * Envia incidencia a Google Sheets
     */
    enviarASheets: async function(incidencia) {
        if (typeof AxonesAPI === 'undefined') return;

        try {
            const categoria = this.CATEGORIAS.find(c => c.id === incidencia.categoria);
            const severidad = this.SEVERIDADES.find(s => s.id === incidencia.severidad);
            const estado = this.ESTADOS.find(e => e.id === incidencia.estado);

            await AxonesAPI.post('registrarIncidencia', {
                id: incidencia.id,
                fecha: incidencia.fecha,
                categoria: categoria?.nombre || incidencia.categoria,
                severidad: severidad?.nombre || incidencia.severidad,
                estado: estado?.nombre || incidencia.estado,
                relacion: incidencia.relacion,
                ordenTrabajo: incidencia.ordenTrabajo,
                titulo: incidencia.titulo,
                descripcion: incidencia.descripcion,
                reportadoPor: incidencia.reportadoPor
            });
            console.log('Incidencia enviada a Sheets');
        } catch (e) {
            console.warn('Error enviando incidencia a Sheets:', e);
        }
    },

    /**
     * Aplica filtros
     */
    aplicarFiltros: function() {
        const categoria = document.getElementById('filtroCategoria')?.value || '';
        const severidad = document.getElementById('filtroSeveridad')?.value || '';
        const estado = document.getElementById('filtroEstado')?.value || '';
        const busqueda = document.getElementById('buscarIncidencia')?.value.toLowerCase() || '';

        this.filteredIncidencias = this.incidencias.filter(inc => {
            if (categoria && inc.categoria !== categoria) return false;
            if (severidad && inc.severidad !== severidad) return false;
            if (estado && inc.estado !== estado) return false;
            if (busqueda) {
                const texto = `${inc.titulo} ${inc.descripcion} ${inc.relacion} ${inc.ordenTrabajo}`.toLowerCase();
                if (!texto.includes(busqueda)) return false;
            }
            return true;
        });

        this.renderIncidencias();
    },

    /**
     * Renderiza la lista de incidencias
     */
    renderIncidencias: function() {
        const contenedor = document.getElementById('listaIncidencias');
        if (!contenedor) return;

        if (this.filteredIncidencias.length === 0) {
            contenedor.innerHTML = `
                <div class="text-center text-muted py-5">
                    <i class="bi bi-inbox display-4 d-block mb-3"></i>
                    <p>No hay incidencias registradas</p>
                </div>
            `;
            return;
        }

        contenedor.innerHTML = this.filteredIncidencias.map(inc => {
            const categoria = this.CATEGORIAS.find(c => c.id === inc.categoria);
            const severidad = this.SEVERIDADES.find(s => s.id === inc.severidad);
            const estado = this.ESTADOS.find(e => e.id === inc.estado);

            return `
                <div class="card mb-2 border-start border-4 border-${severidad?.color || 'secondary'}">
                    <div class="card-body py-2">
                        <div class="d-flex justify-content-between align-items-start">
                            <div class="flex-grow-1">
                                <div class="d-flex align-items-center gap-2 mb-1">
                                    <span class="badge bg-${categoria?.color || 'secondary'}">
                                        <i class="bi ${categoria?.icono || 'bi-tag'} me-1"></i>
                                        ${categoria?.nombre || inc.categoria}
                                    </span>
                                    <span class="badge bg-${severidad?.color || 'secondary'}">${severidad?.nombre || inc.severidad}</span>
                                    <span class="badge bg-${estado?.color || 'secondary'}">${estado?.nombre || inc.estado}</span>
                                    ${inc.ordenTrabajo ? `<span class="badge bg-info">${inc.ordenTrabajo}</span>` : ''}
                                </div>
                                <h6 class="mb-1">${inc.titulo}</h6>
                                <p class="text-muted small mb-1">${inc.descripcion.substring(0, 100)}${inc.descripcion.length > 100 ? '...' : ''}</p>
                                <div class="small text-muted">
                                    <i class="bi bi-clock me-1"></i>${new Date(inc.fecha).toLocaleString('es-VE')}
                                    <span class="ms-2"><i class="bi bi-person me-1"></i>${inc.reportadoPor}</span>
                                    ${inc.relacion ? `<span class="ms-2"><i class="bi bi-link-45deg me-1"></i>${inc.relacion}</span>` : ''}
                                </div>
                            </div>
                            <div class="btn-group btn-group-sm">
                                <button class="btn btn-outline-primary" onclick="Incidencias.verDetalle('${inc.id}')" title="Ver detalle">
                                    <i class="bi bi-eye"></i>
                                </button>
                                <button class="btn btn-outline-warning" onclick="Incidencias.cambiarEstado('${inc.id}')" title="Cambiar estado">
                                    <i class="bi bi-arrow-repeat"></i>
                                </button>
                                <button class="btn btn-outline-danger" onclick="Incidencias.eliminar('${inc.id}')" title="Eliminar">
                                    <i class="bi bi-trash"></i>
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            `;
        }).join('');
    },

    /**
     * Actualiza contadores del dashboard
     */
    updateContadores: function() {
        const abiertas = this.incidencias.filter(i => i.estado === 'abierta').length;
        const enProceso = this.incidencias.filter(i => i.estado === 'en_proceso').length;
        const criticas = this.incidencias.filter(i => i.severidad === 'critica' && i.estado !== 'cerrada').length;
        const total = this.incidencias.length;

        document.getElementById('contAbiertas')?.textContent && (document.getElementById('contAbiertas').textContent = abiertas);
        document.getElementById('contEnProceso')?.textContent && (document.getElementById('contEnProceso').textContent = enProceso);
        document.getElementById('contCriticas')?.textContent && (document.getElementById('contCriticas').textContent = criticas);
        document.getElementById('contTotal')?.textContent && (document.getElementById('contTotal').textContent = total);
    },

    /**
     * Ver detalle de incidencia
     */
    verDetalle: function(id) {
        const inc = this.incidencias.find(i => i.id === id);
        if (!inc) return;

        const categoria = this.CATEGORIAS.find(c => c.id === inc.categoria);
        const severidad = this.SEVERIDADES.find(s => s.id === inc.severidad);
        const estado = this.ESTADOS.find(e => e.id === inc.estado);

        const modalHTML = `
            <div class="modal fade" id="modalDetalle" tabindex="-1">
                <div class="modal-dialog modal-lg">
                    <div class="modal-content">
                        <div class="modal-header bg-${severidad?.color || 'secondary'} text-white">
                            <h5 class="modal-title">
                                <i class="bi ${categoria?.icono || 'bi-tag'} me-2"></i>
                                ${inc.titulo}
                            </h5>
                            <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal"></button>
                        </div>
                        <div class="modal-body">
                            <div class="row mb-3">
                                <div class="col-md-3">
                                    <small class="text-muted">Categoria</small>
                                    <p class="mb-0"><span class="badge bg-${categoria?.color}">${categoria?.nombre}</span></p>
                                </div>
                                <div class="col-md-3">
                                    <small class="text-muted">Severidad</small>
                                    <p class="mb-0"><span class="badge bg-${severidad?.color}">${severidad?.nombre}</span></p>
                                </div>
                                <div class="col-md-3">
                                    <small class="text-muted">Estado</small>
                                    <p class="mb-0"><span class="badge bg-${estado?.color}">${estado?.nombre}</span></p>
                                </div>
                                <div class="col-md-3">
                                    <small class="text-muted">Fecha</small>
                                    <p class="mb-0">${new Date(inc.fecha).toLocaleString('es-VE')}</p>
                                </div>
                            </div>
                            <div class="mb-3">
                                <small class="text-muted">Descripcion</small>
                                <p>${inc.descripcion}</p>
                            </div>
                            <div class="row mb-3">
                                <div class="col-md-4">
                                    <small class="text-muted">Reportado por</small>
                                    <p class="mb-0">${inc.reportadoPor}</p>
                                </div>
                                <div class="col-md-4">
                                    <small class="text-muted">Relacionado con</small>
                                    <p class="mb-0">${inc.relacion || '-'}</p>
                                </div>
                                <div class="col-md-4">
                                    <small class="text-muted">Orden de Trabajo</small>
                                    <p class="mb-0">${inc.ordenTrabajo || '-'}</p>
                                </div>
                            </div>
                            ${inc.historial && inc.historial.length > 0 ? `
                            <div>
                                <small class="text-muted">Historial</small>
                                <ul class="list-unstyled small">
                                    ${inc.historial.map(h => `
                                        <li class="border-start border-2 ps-2 mb-1">
                                            <strong>${h.accion}</strong> - ${new Date(h.fecha).toLocaleString('es-VE')}
                                            <span class="text-muted">por ${h.usuario}</span>
                                        </li>
                                    `).join('')}
                                </ul>
                            </div>
                            ` : ''}
                        </div>
                        <div class="modal-footer">
                            <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cerrar</button>
                            <button type="button" class="btn btn-primary" onclick="Incidencias.editar('${inc.id}')">
                                <i class="bi bi-pencil me-1"></i>Editar
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        `;

        // Eliminar modal anterior si existe
        document.getElementById('modalDetalle')?.remove();
        document.body.insertAdjacentHTML('beforeend', modalHTML);

        const modal = new bootstrap.Modal(document.getElementById('modalDetalle'));
        modal.show();
    },

    /**
     * Editar incidencia
     */
    editar: function(id) {
        const inc = this.incidencias.find(i => i.id === id);
        if (!inc) return;

        // Cerrar modal de detalle
        bootstrap.Modal.getInstance(document.getElementById('modalDetalle'))?.hide();

        // Llenar formulario
        document.getElementById('incidenciaId').value = inc.id;
        document.getElementById('incCategoria').value = inc.categoria;
        this.onCategoriaChange(inc.categoria);
        setTimeout(() => {
            document.getElementById('incRelacion').value = inc.relacion || '';
        }, 100);
        document.getElementById('incSeveridad').value = inc.severidad;
        document.getElementById('incOrdenTrabajo').value = inc.ordenTrabajo || '';
        document.getElementById('incTitulo').value = inc.titulo;
        document.getElementById('incDescripcion').value = inc.descripcion;
        document.getElementById('incFecha').value = inc.fecha;
        document.getElementById('incReportadoPor').value = inc.reportadoPor;

        document.getElementById('modalIncidenciaLabel').textContent = 'Editar Incidencia';

        const modal = new bootstrap.Modal(document.getElementById('modalIncidencia'));
        modal.show();
    },

    /**
     * Cambiar estado de incidencia
     */
    cambiarEstado: function(id) {
        const inc = this.incidencias.find(i => i.id === id);
        if (!inc) return;

        const estadosOrden = ['abierta', 'en_proceso', 'resuelta', 'cerrada'];
        const indexActual = estadosOrden.indexOf(inc.estado);
        const nuevoEstado = estadosOrden[(indexActual + 1) % estadosOrden.length];

        inc.estado = nuevoEstado;
        inc.fechaModificacion = new Date().toISOString();
        inc.historial = inc.historial || [];
        inc.historial.push({
            fecha: new Date().toISOString(),
            accion: `Estado cambiado a: ${this.ESTADOS.find(e => e.id === nuevoEstado)?.nombre}`,
            usuario: 'Usuario'
        });

        this.saveIncidencias();
        this.renderIncidencias();
        this.updateContadores();

        // Enviar actualizacion a Sheets
        this.enviarASheets(inc);

        if (typeof Axones !== 'undefined') {
            Axones.showSuccess(`Estado cambiado a: ${this.ESTADOS.find(e => e.id === nuevoEstado)?.nombre}`);
        }
    },

    /**
     * Eliminar incidencia
     */
    eliminar: function(id) {
        if (!confirm('¿Eliminar esta incidencia?')) return;

        this.incidencias = this.incidencias.filter(i => i.id !== id);
        this.filteredIncidencias = this.filteredIncidencias.filter(i => i.id !== id);
        this.saveIncidencias();
        this.renderIncidencias();
        this.updateContadores();

        if (typeof Axones !== 'undefined') {
            Axones.showSuccess('Incidencia eliminada');
        }
    },

    /**
     * Exportar incidencias a CSV
     */
    exportarCSV: function() {
        const headers = ['ID', 'Fecha', 'Categoria', 'Severidad', 'Estado', 'Titulo', 'Descripcion', 'Relacion', 'OT', 'Reportado Por'];
        const rows = this.incidencias.map(inc => [
            inc.id,
            new Date(inc.fecha).toLocaleString('es-VE'),
            this.CATEGORIAS.find(c => c.id === inc.categoria)?.nombre || inc.categoria,
            this.SEVERIDADES.find(s => s.id === inc.severidad)?.nombre || inc.severidad,
            this.ESTADOS.find(e => e.id === inc.estado)?.nombre || inc.estado,
            inc.titulo,
            inc.descripcion.replace(/"/g, '""'),
            inc.relacion || '',
            inc.ordenTrabajo || '',
            inc.reportadoPor
        ]);

        let csv = headers.join(',') + '\n';
        rows.forEach(row => {
            csv += row.map(cell => `"${cell}"`).join(',') + '\n';
        });

        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = `incidencias_axones_${new Date().toISOString().split('T')[0]}.csv`;
        link.click();

        if (typeof Axones !== 'undefined') {
            Axones.showSuccess('Incidencias exportadas');
        }
    }
};

// Inicializar cuando el DOM este listo
document.addEventListener('DOMContentLoaded', () => {
    if (document.getElementById('listaIncidencias')) {
        Incidencias.init();
    }
});

// Exportar globalmente
if (typeof window !== 'undefined') {
    window.Incidencias = Incidencias;
}
