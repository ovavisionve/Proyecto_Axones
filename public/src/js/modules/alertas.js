/**
 * Modulo de Alertas - Centro de Alertas
 * Sistema Axones - Inversiones Axones 2008, C.A.
 * Gestion centralizada de alertas del sistema
 */

const AlertasModule = {
    // Version de alertas - incrementar para forzar regeneracion
    ALERTAS_VERSION: '2026-03-02',

    // Configuracion
    config: {
        alertasPorPagina: 10,
        paginaActual: 1,
        filtroEstado: 'todas',
        filtroTipo: '',
        filtroMaquina: '',
        filtroFecha: '',
        alertaSeleccionada: null,
    },

    // Cache local de alertas
    _alertasCache: [],

    // Inicializar modulo
    async init() {
        console.log('Inicializando modulo de Alertas...');

        await this._cargarAlertas();

        // Verificar si necesita regenerar alertas
        await this.verificarVersionAlertas();

        this.cargarMaquinas();
        this.cargarAlertas();
        this.configurarEventos();
        await this.generarAlertasDemo();
    },

    /**
     * Carga alertas desde Supabase sync_store
     */
    async _cargarAlertas() {
        try {
            const { data } = await AxonesDB.client.from('sync_store').select('value').eq('key', 'axones_alertas').single();
            this._alertasCache = (data && data.value) ? (typeof data.value === 'string' ? JSON.parse(data.value) : data.value) : [];
        } catch (e) {
            this._alertasCache = [];
        }
    },

    /**
     * Guarda alertas en Supabase sync_store
     */
    async _guardarAlertas(alertas) {
        this._alertasCache = alertas;
        try {
            await AxonesDB.client.from('sync_store').upsert({ key: 'axones_alertas', value: alertas, updated_at: new Date().toISOString() }, { onConflict: 'key' });
        } catch (e) {
            console.warn('AlertasModule: Error guardando alertas en Supabase', e);
        }
    },

    // Verifica si hay una nueva version y limpia alertas viejas
    async verificarVersionAlertas() {
        let versionActual = null;
        try {
            const { data } = await AxonesDB.client.from('sync_store').select('value').eq('key', 'axones_alertas_version').single();
            versionActual = (data && data.value) ? data.value : null;
        } catch (e) { /* empty */ }

        if (versionActual !== this.ALERTAS_VERSION) {
            console.log(`AlertasModule: Migrando alertas de version ${versionActual || 'antigua'} a ${this.ALERTAS_VERSION}`);

            // Limpiar alertas viejas de demo para regenerar con datos reales
            await this._guardarAlertas([]);
            await AxonesDB.client.from('sync_store').upsert({ key: 'axones_alertas_version', value: this.ALERTAS_VERSION, updated_at: new Date().toISOString() }, { onConflict: 'key' });

            console.log('AlertasModule: Alertas limpiadas. Se generaran alertas del inventario real.');
        }
    },

    // Configurar eventos
    configurarEventos() {
        // Filtros de estado
        document.querySelectorAll('.filter-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
                e.target.classList.add('active');
                this.config.filtroEstado = e.target.dataset.filter;
                this.config.paginaActual = 1;
                this.cargarAlertas();
            });
        });

        // Filtro tipo
        const filtroTipo = document.getElementById('filtroTipo');
        if (filtroTipo) {
            filtroTipo.addEventListener('change', (e) => {
                this.config.filtroTipo = e.target.value;
                this.config.paginaActual = 1;
                this.cargarAlertas();
            });
        }

        // Filtro maquina
        const filtroMaquina = document.getElementById('filtroMaquina');
        if (filtroMaquina) {
            filtroMaquina.addEventListener('change', (e) => {
                this.config.filtroMaquina = e.target.value;
                this.config.paginaActual = 1;
                this.cargarAlertas();
            });
        }

        // Filtro fecha
        const filtroFecha = document.getElementById('filtroFecha');
        if (filtroFecha) {
            filtroFecha.addEventListener('change', (e) => {
                this.config.filtroFecha = e.target.value;
                this.config.paginaActual = 1;
                this.cargarAlertas();
            });
        }

        // Paginacion
        const btnAnterior = document.getElementById('btnAnterior');
        const btnSiguiente = document.getElementById('btnSiguiente');

        if (btnAnterior) {
            btnAnterior.addEventListener('click', () => {
                if (this.config.paginaActual > 1) {
                    this.config.paginaActual--;
                    this.cargarAlertas();
                }
            });
        }

        if (btnSiguiente) {
            btnSiguiente.addEventListener('click', () => {
                this.config.paginaActual++;
                this.cargarAlertas();
            });
        }
    },

    // Cargar maquinas en filtro
    cargarMaquinas() {
        const select = document.getElementById('filtroMaquina');
        if (!select) return;

        const maquinas = [
            ...CONFIG.MAQUINAS.IMPRESORAS,
            ...CONFIG.MAQUINAS.LAMINADORAS,
            ...CONFIG.MAQUINAS.CORTADORAS,
        ];

        maquinas.forEach(m => {
            const option = document.createElement('option');
            option.value = m.nombre;
            option.textContent = m.nombre;
            select.appendChild(option);
        });
    },

    // Cargar alertas desde Supabase
    async cargarAlertas() {
        const alertas = this.obtenerAlertasFiltradas();
        this.actualizarEstadisticas(alertas);
        this.renderizarAlertas(alertas);
        this.actualizarPaginacion(alertas);
        this.actualizarBadge();
    },

    // Obtener alertas filtradas
    obtenerAlertasFiltradas() {
        let alertas = [...this._alertasCache];

        // Filtrar por estado
        if (this.config.filtroEstado !== 'todas') {
            alertas = alertas.filter(a => a.estado === this.config.filtroEstado);
        }

        // Filtrar por tipo
        if (this.config.filtroTipo) {
            alertas = alertas.filter(a => a.tipo === this.config.filtroTipo);
        }

        // Filtrar por maquina
        if (this.config.filtroMaquina) {
            alertas = alertas.filter(a => a.maquina === this.config.filtroMaquina);
        }

        // Filtrar por fecha
        if (this.config.filtroFecha) {
            const fechaFiltro = new Date(this.config.filtroFecha).toLocaleDateString('es-VE');
            alertas = alertas.filter(a => {
                const fechaAlerta = new Date(a.fecha).toLocaleDateString('es-VE');
                return fechaAlerta === fechaFiltro;
            });
        }

        // Ordenar por fecha descendente
        alertas.sort((a, b) => new Date(b.fecha) - new Date(a.fecha));

        return alertas;
    },

    // Actualizar estadisticas
    actualizarEstadisticas(alertasFiltradas) {
        const todas = [...this._alertasCache];
        const hoy = new Date().toLocaleDateString('es-VE');

        const criticas = todas.filter(a =>
            (a.nivel === 'critical' || a.nivel === 'danger') &&
            (a.estado === 'pendiente' || a.estado === 'activa')
        ).length;

        const advertencias = todas.filter(a =>
            a.nivel === 'warning' &&
            (a.estado === 'pendiente' || a.estado === 'activa')
        ).length;

        const info = todas.filter(a =>
            a.nivel === 'info' &&
            (a.estado === 'pendiente' || a.estado === 'activa')
        ).length;

        const resueltasHoy = todas.filter(a => {
            if (a.estado !== 'resuelta' || !a.fechaResolucion) return false;
            const fechaRes = new Date(a.fechaResolucion).toLocaleDateString('es-VE');
            return fechaRes === hoy;
        }).length;

        // Actualizar elementos
        const statCriticas = document.getElementById('statCriticas');
        const statAdvertencias = document.getElementById('statAdvertencias');
        const statInfo = document.getElementById('statInfo');
        const statResueltas = document.getElementById('statResueltas');

        if (statCriticas) statCriticas.textContent = criticas;
        if (statAdvertencias) statAdvertencias.textContent = advertencias;
        if (statInfo) statInfo.textContent = info;
        if (statResueltas) statResueltas.textContent = resueltasHoy;
    },

    // Renderizar lista de alertas
    renderizarAlertas(alertas) {
        const container = document.getElementById('listaAlertas');
        const sinAlertas = document.getElementById('sinAlertas');

        if (!container) return;

        // Paginar
        const inicio = (this.config.paginaActual - 1) * this.config.alertasPorPagina;
        const fin = inicio + this.config.alertasPorPagina;
        const alertasPagina = alertas.slice(inicio, fin);

        if (alertasPagina.length === 0) {
            container.innerHTML = '';
            if (sinAlertas) sinAlertas.style.display = 'block';
            return;
        }

        if (sinAlertas) sinAlertas.style.display = 'none';

        container.innerHTML = alertasPagina.map(alerta => {
            const nivelClase = this.obtenerClaseNivel(alerta.nivel);
            const icono = this.obtenerIconoTipo(alerta.tipo);
            const tipoTexto = this.obtenerTextoTipo(alerta.tipo);

            return `
                <div class="card alert-card ${nivelClase} border-0 shadow-sm mb-3" onclick="AlertasModule.verDetalle(${alerta.id})">
                    <div class="card-body">
                        <div class="row align-items-center">
                            <div class="col-auto">
                                <div class="rounded-circle bg-${nivelClase === 'critical' ? 'danger' : nivelClase} bg-opacity-10 p-3">
                                    <i class="bi ${icono} text-${nivelClase === 'critical' ? 'danger' : nivelClase} fs-4"></i>
                                </div>
                            </div>
                            <div class="col">
                                <div class="d-flex justify-content-between align-items-start mb-1">
                                    <h6 class="mb-0">${alerta.mensaje}</h6>
                                    ${alerta.estado === 'resuelta' ?
                                        '<span class="badge bg-success">Resuelta</span>' :
                                        `<span class="badge bg-${nivelClase === 'critical' ? 'danger' : nivelClase}">${this.obtenerTextoNivel(alerta.nivel)}</span>`
                                    }
                                </div>
                                <div class="d-flex flex-wrap gap-3 text-muted small">
                                    <span><i class="bi bi-tag me-1"></i>${tipoTexto}</span>
                                    ${alerta.maquina ? `<span><i class="bi bi-cpu me-1"></i>${alerta.maquina}</span>` : ''}
                                    ${alerta.ot ? `<span><i class="bi bi-file-text me-1"></i>OT: ${alerta.ot}</span>` : ''}
                                    <span><i class="bi bi-clock me-1"></i>${this.formatearFecha(alerta.fecha)}</span>
                                </div>
                            </div>
                            <div class="col-auto">
                                <i class="bi bi-chevron-right text-muted"></i>
                            </div>
                        </div>
                    </div>
                </div>
            `;
        }).join('');
    },

    // Actualizar paginacion
    actualizarPaginacion(alertas) {
        const totalAlertas = alertas.length;
        const totalPaginas = Math.ceil(totalAlertas / this.config.alertasPorPagina);
        const inicio = ((this.config.paginaActual - 1) * this.config.alertasPorPagina) + 1;
        const fin = Math.min(this.config.paginaActual * this.config.alertasPorPagina, totalAlertas);

        const mostrando = document.getElementById('mostrando');
        const total = document.getElementById('totalAlertas');
        const btnAnterior = document.getElementById('btnAnterior');
        const btnSiguiente = document.getElementById('btnSiguiente');

        if (mostrando) mostrando.textContent = totalAlertas > 0 ? `${inicio}-${fin}` : '0';
        if (total) total.textContent = totalAlertas;

        if (btnAnterior) btnAnterior.disabled = this.config.paginaActual <= 1;
        if (btnSiguiente) btnSiguiente.disabled = this.config.paginaActual >= totalPaginas;
    },

    // Actualizar badge del navbar
    actualizarBadge() {
        const badge = document.getElementById('alertasBadge');
        if (!badge) return;

        const pendientes = this._alertasCache.filter(a => a.estado === 'pendiente' || a.estado === 'activa').length;

        if (pendientes > 0) {
            badge.textContent = pendientes;
            badge.style.display = 'inline-block';
        } else {
            badge.style.display = 'none';
        }
    },

    // Ver detalle de alerta
    verDetalle(id) {
        const alerta = this._alertasCache.find(a => a.id === id);

        if (!alerta) return;

        this.config.alertaSeleccionada = id;

        const body = document.getElementById('modalDetalleBody');
        const btnResolver = document.getElementById('btnResolver');

        if (!body) return;

        const nivelClase = this.obtenerClaseNivel(alerta.nivel);

        body.innerHTML = `
            <div class="alert alert-${nivelClase === 'critical' ? 'danger' : nivelClase} mb-3">
                <div class="d-flex align-items-center">
                    <i class="bi ${this.obtenerIconoTipo(alerta.tipo)} me-2 fs-4"></i>
                    <div>
                        <strong>${this.obtenerTextoTipo(alerta.tipo)}</strong>
                        <span class="badge bg-${nivelClase === 'critical' ? 'danger' : nivelClase} ms-2">${this.obtenerTextoNivel(alerta.nivel)}</span>
                    </div>
                </div>
            </div>

            <h6 class="mb-3">${alerta.mensaje}</h6>

            <div class="table-responsive">
                <table class="table table-sm">
                    <tbody>
                        <tr>
                            <td class="text-muted" style="width: 40%;">Fecha</td>
                            <td>${this.formatearFechaCompleta(alerta.fecha)}</td>
                        </tr>
                        ${alerta.maquina ? `
                        <tr>
                            <td class="text-muted">Maquina</td>
                            <td>${alerta.maquina}</td>
                        </tr>` : ''}
                        ${alerta.ot ? `
                        <tr>
                            <td class="text-muted">Orden de Trabajo</td>
                            <td>${alerta.ot}</td>
                        </tr>` : ''}
                        <tr>
                            <td class="text-muted">Estado</td>
                            <td>
                                ${alerta.estado === 'resuelta' ?
                                    '<span class="badge bg-success">Resuelta</span>' :
                                    '<span class="badge bg-warning text-dark">Pendiente</span>'
                                }
                            </td>
                        </tr>
                        ${alerta.fechaResolucion ? `
                        <tr>
                            <td class="text-muted">Fecha Resolucion</td>
                            <td>${this.formatearFechaCompleta(alerta.fechaResolucion)}</td>
                        </tr>` : ''}
                        ${alerta.datos && alerta.datos.porcentajeRefil ? `
                        <tr>
                            <td class="text-muted">% Refil</td>
                            <td class="text-danger fw-bold">${alerta.datos.porcentajeRefil}%</td>
                        </tr>` : ''}
                    </tbody>
                </table>
            </div>
        `;

        // Mostrar/ocultar boton resolver
        if (btnResolver) {
            btnResolver.style.display = alerta.estado === 'resuelta' ? 'none' : 'inline-block';
        }

        // Mostrar modal
        const modal = new bootstrap.Modal(document.getElementById('modalDetalle'));
        modal.show();
    },

    // Resolver alerta
    async resolverAlerta() {
        if (!this.config.alertaSeleccionada) return;

        const alertas = [...this._alertasCache];
        const index = alertas.findIndex(a => a.id === this.config.alertaSeleccionada);

        if (index !== -1) {
            alertas[index].estado = 'resuelta';
            alertas[index].fechaResolucion = new Date().toISOString();
            await this._guardarAlertas(alertas);

            // Cerrar modal
            const modal = bootstrap.Modal.getInstance(document.getElementById('modalDetalle'));
            if (modal) modal.hide();

            // Recargar
            this.cargarAlertas();

            // Mostrar mensaje
            this.mostrarNotificacion('Alerta marcada como resuelta', 'success');
        }
    },

    // Marcar todas como leidas
    async marcarTodasLeidas() {
        const alertas = [...this._alertasCache];

        alertas.forEach(a => {
            if (a.estado === 'pendiente' || a.estado === 'activa') {
                a.estado = 'resuelta';
                a.fechaResolucion = new Date().toISOString();
            }
        });

        await this._guardarAlertas(alertas);
        this.cargarAlertas();
        this.mostrarNotificacion('Todas las alertas marcadas como resueltas', 'success');
    },

    // Crear nueva alerta (metodo publico para otros modulos)
    async crearAlerta(tipo, mensaje, datos = {}) {
        await this._cargarAlertas();
        const alertas = [...this._alertasCache];

        const nuevaAlerta = {
            id: Date.now(),
            tipo: tipo,
            mensaje: mensaje,
            fecha: new Date().toISOString(),
            estado: 'pendiente',
            nivel: datos.nivel || 'warning',
            maquina: datos.maquina || null,
            ot: datos.ot || null,
            datos: datos
        };

        alertas.unshift(nuevaAlerta);
        await this._guardarAlertas(alertas);

        return nuevaAlerta;
    },

    // Generar alertas de demo (solo si no hay inventario real)
    async generarAlertasDemo() {
        // Verificar si hay inventario real cargado
        let inventario = [];
        try {
            inventario = await AxonesDB.materiales.listar() || [];
        } catch (e) { /* empty */ }

        // Si hay inventario real con mas de 10 items, no generar demo
        if (inventario.length > 10) {
            console.log('AlertasModule: Inventario real detectado, saltando alertas demo');
            if (this._alertasCache.length === 0 && typeof InventarioService !== 'undefined') {
                InventarioService.escanearInventarioYGenerarAlertas();
                await this._cargarAlertas();
                this.cargarAlertas();
            }
            return;
        }

        // Solo generar si no hay alertas
        if (this._alertasCache.length > 0) return;

        const alertasDemo = [
            {
                id: Date.now() - 1000,
                tipo: 'refil_alto',
                mensaje: 'Refil por encima del 5% en orden de trabajo OT-2024-001',
                fecha: new Date(Date.now() - 3600000).toISOString(),
                estado: 'pendiente',
                nivel: 'warning',
                maquina: 'COMEXI 1',
                ot: 'OT-2024-001',
                datos: { porcentajeRefil: 5.8 }
            },
            {
                id: Date.now() - 2000,
                tipo: 'refil_critico',
                mensaje: 'Refil CRITICO al 8.2% en orden OT-2024-002',
                fecha: new Date(Date.now() - 7200000).toISOString(),
                estado: 'pendiente',
                nivel: 'critical',
                maquina: 'COMEXI 2',
                ot: 'OT-2024-002',
                datos: { porcentajeRefil: 8.2 }
            },
            {
                id: Date.now() - 3000,
                tipo: 'stock_bajo',
                mensaje: 'Stock bajo de BOPP Transparente 20 micras',
                fecha: new Date(Date.now() - 86400000).toISOString(),
                estado: 'pendiente',
                nivel: 'warning',
                maquina: null,
                ot: null,
                datos: { material: 'BOPP Transparente', kg: 45 }
            },
            {
                id: Date.now() - 4000,
                tipo: 'tiempo_muerto_alto',
                mensaje: 'Tiempo muerto elevado en turno 1 - COMEXI 3',
                fecha: new Date(Date.now() - 172800000).toISOString(),
                estado: 'resuelta',
                nivel: 'info',
                maquina: 'COMEXI 3',
                ot: null,
                fechaResolucion: new Date(Date.now() - 86400000).toISOString(),
                datos: { tiempoMuerto: 45 }
            },
        ];

        await this._guardarAlertas(alertasDemo);
    },

    // Utilidades
    obtenerClaseNivel(nivel) {
        const clases = {
            'info': 'info',
            'warning': 'warning',
            'danger': 'danger',
            'critical': 'critical',
        };
        return clases[nivel] || 'warning';
    },

    obtenerTextoNivel(nivel) {
        const textos = {
            'info': 'Informativa',
            'warning': 'Advertencia',
            'danger': 'Alta',
            'critical': 'Critica',
        };
        return textos[nivel] || 'Advertencia';
    },

    obtenerIconoTipo(tipo) {
        const iconos = {
            'refil_alto': 'bi-exclamation-triangle',
            'refil_critico': 'bi-x-octagon',
            'produccion_baja': 'bi-graph-down',
            'maquina_detenida': 'bi-cpu',
            'tiempo_muerto_alto': 'bi-clock-history',
            'stock_bajo': 'bi-box',
            'stock_bajo_material': 'bi-box-seam',
            'stock_bajo_tinta': 'bi-paint-bucket',
            'stock_bajo_adhesivo': 'bi-droplet',
            'inventario_insuficiente': 'bi-exclamation-diamond',
        };
        return iconos[tipo] || 'bi-bell';
    },

    obtenerTextoTipo(tipo) {
        const textos = {
            'refil_alto': 'Refil Alto',
            'refil_critico': 'Refil Critico',
            'produccion_baja': 'Produccion Baja',
            'maquina_detenida': 'Maquina Detenida',
            'tiempo_muerto_alto': 'Tiempo Muerto Alto',
            'stock_bajo': 'Stock Bajo',
            'stock_bajo_material': 'Stock Bajo Material',
            'stock_bajo_tinta': 'Stock Bajo Tinta',
            'stock_bajo_adhesivo': 'Stock Bajo Quimico',
            'inventario_insuficiente': 'Inventario Insuficiente',
        };
        return textos[tipo] || 'Alerta';
    },

    formatearFecha(fecha) {
        if (!fecha) return '';
        const d = new Date(fecha);
        return d.toLocaleDateString('es-VE', {
            day: '2-digit',
            month: '2-digit',
            hour: '2-digit',
            minute: '2-digit'
        });
    },

    formatearFechaCompleta(fecha) {
        if (!fecha) return '';
        const d = new Date(fecha);
        return d.toLocaleDateString('es-VE', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    },

    mostrarNotificacion(mensaje, tipo = 'success') {
        // Crear toast
        const toastContainer = document.querySelector('.toast-container') ||
            (() => {
                const container = document.createElement('div');
                container.className = 'toast-container position-fixed bottom-0 end-0 p-3';
                document.body.appendChild(container);
                return container;
            })();

        const toast = document.createElement('div');
        toast.className = `toast align-items-center text-white bg-${tipo} border-0`;
        toast.setAttribute('role', 'alert');
        toast.innerHTML = `
            <div class="d-flex">
                <div class="toast-body">${mensaje}</div>
                <button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast"></button>
            </div>
        `;

        toastContainer.appendChild(toast);
        const bsToast = new bootstrap.Toast(toast);
        bsToast.show();

        toast.addEventListener('hidden.bs.toast', () => toast.remove());
    }
};

// Inicializar cuando el DOM este listo
document.addEventListener('DOMContentLoaded', () => {
    AlertasModule.init();
});

// Exportar para uso global
if (typeof window !== 'undefined') {
    window.AlertasModule = AlertasModule;
}
