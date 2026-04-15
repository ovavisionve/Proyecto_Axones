/**
 * Modulo Solicitud de Despacho - Sistema Axones
 * Permite a TODOS los trabajadores solicitar materiales o miscelaneos al almacen.
 * Leonardo (jefe_almacen) recibe notificacion y procesa desde aqui.
 *
 * Tipos de solicitud:
 *   - material: casado con OT (materia prima, sustratos, tintas, quimicos)
 *   - miscelaneo: sin OT (hojillas, cintas, herramientas, etc.)
 *
 * Flujo: Trabajador crea solicitud -> estado "pendiente" ->
 *        Almacen aprueba/rechaza -> si aprueba, despacha desde almacen
 *
 * Almacenamiento: sync_store key 'axones_solicitudes_despacho'
 */

const SolicitudDespacho = {
    solicitudes: [],
    ordenes: [],
    materiales: [],
    tintas: [],
    quimicos: [],
    _usuario: null,
    _rolUsuario: null,

    SYNC_KEY: 'axones_solicitudes_despacho',
    ALERTA_KEY: 'axones_alertas',

    // Roles que pueden aprobar/rechazar solicitudes
    ROLES_ALMACEN: ['jefe_almacen', 'jefe_operaciones', 'administrador'],

    init: async function() {
        // Asegurar AxonesDB
        if (typeof AxonesDB !== 'undefined' && !AxonesDB.isReady()) {
            await AxonesDB.init();
        }

        // Obtener usuario actual
        this._usuario = this._getUsuario();
        this._rolUsuario = this._getRol();

        // Cargar datos
        await this.cargarDatos();

        // Setup UI
        this.setupEvents();
        this.configurarVistaRol();

        // Escuchar re-sync
        window.addEventListener('axones-sync', async () => {
            await this.cargarDatos();
            this.renderMisSolicitudes();
            this.renderPendientes();
        });

        console.log('SolicitudDespacho: Modulo inicializado');
    },

    _getUsuario: function() {
        try {
            const sesion = JSON.parse(localStorage.getItem('axones_session') || '{}');
            return sesion.nombre || sesion.usuario || 'Usuario';
        } catch(e) { return 'Usuario'; }
    },

    _getRol: function() {
        try {
            const sesion = JSON.parse(localStorage.getItem('axones_session') || '{}');
            return sesion.rol || 'operador';
        } catch(e) { return 'operador'; }
    },

    cargarDatos: async function() {
        try {
            // Cargar solicitudes desde sync_store
            if (typeof AxonesDB !== 'undefined' && AxonesDB.isReady()) {
                const { data } = await AxonesDB.client
                    .from('sync_store')
                    .select('value')
                    .eq('key', this.SYNC_KEY)
                    .maybeSingle();
                this.solicitudes = data?.value ? JSON.parse(data.value) : [];
            } else {
                this.solicitudes = JSON.parse(localStorage.getItem(this.SYNC_KEY) || '[]');
            }

            // Cargar OTs
            if (typeof AxonesDB !== 'undefined' && AxonesDB.isReady() && AxonesDB.ordenesHelper) {
                this.ordenes = await AxonesDB.ordenesHelper.cargar() || [];
            } else {
                this.ordenes = JSON.parse(localStorage.getItem('axones_ordenes_trabajo') || '[]');
            }

            // Cargar inventarios para selector de materiales
            if (typeof AxonesDB !== 'undefined' && AxonesDB.isReady()) {
                const [mat, tin, qui] = await Promise.all([
                    AxonesDB.client.from('materiales').select('*').eq('activo', true),
                    AxonesDB.client.from('tintas').select('*'),
                    AxonesDB.client.from('adhesivos').select('*'),
                ]);
                this.materiales = mat?.data || [];
                this.tintas = tin?.data || [];
                this.quimicos = qui?.data || [];
            }
        } catch(e) {
            console.error('SolicitudDespacho: Error cargando datos:', e);
        }

        // Render
        this.renderMisSolicitudes();
        this.renderPendientes();
        this.poblarSelectorOT();
    },

    guardarSolicitudes: async function() {
        const json = JSON.stringify(this.solicitudes);
        localStorage.setItem(this.SYNC_KEY, json);
        try {
            if (typeof AxonesDB !== 'undefined' && AxonesDB.isReady()) {
                await AxonesDB.client.from('sync_store').upsert({
                    key: this.SYNC_KEY,
                    value: json,
                    updated_at: new Date().toISOString()
                }, { onConflict: 'key' });
            }
        } catch(e) {
            console.error('SolicitudDespacho: Error guardando:', e);
        }
    },

    setupEvents: function() {
        const self = this;

        // Tipo de solicitud cambia
        const tipoSel = document.getElementById('tipoSolicitud');
        if (tipoSel) tipoSel.addEventListener('change', function() {
            const tipo = this.value;
            const secMat = document.getElementById('seccionMaterial');
            const secMisc = document.getElementById('seccionMiscelaneo');
            const secObs = document.getElementById('seccionObservaciones');
            const secEnv = document.getElementById('seccionEnviar');
            if (secMat) secMat.style.display = tipo === 'material' ? 'block' : 'none';
            if (secMisc) secMisc.style.display = tipo === 'miscelaneo' ? 'block' : 'none';
            if (secObs) secObs.style.display = tipo ? 'block' : 'none';
            if (secEnv) secEnv.style.display = tipo ? 'block' : 'none';
            // Agregar primera fila automatica
            if (tipo === 'material') {
                const body = document.getElementById('bodyMaterialesSolicitud');
                if (body && body.children.length === 0) self.agregarFilaMaterial();
            } else if (tipo === 'miscelaneo') {
                const body = document.getElementById('bodyMiscelaneosSolicitud');
                if (body && body.children.length === 0) self.agregarFilaMiscelaneo();
            }
        });

        // Selector OT cambia -> mostrar resumen
        const otSel = document.getElementById('solicitudOT');
        if (otSel) otSel.addEventListener('change', function() {
            const ot = self.ordenes.find(o => o.numeroOrden === this.value || o.id === this.value);
            const resumen = document.getElementById('resumenOTSolicitud');
            if (ot && resumen) {
                resumen.style.display = 'block';
                const s = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = val || '--'; };
                s('solOTCliente', ot.cliente);
                s('solOTProducto', ot.producto);
                s('solOTKg', ot.pedidoKg ? ot.pedidoKg + ' Kg' : '--');
                s('solOTMaterial', ot.estructuraMaterial || ot.tipoMaterial || '--');
                s('solOTMaquina', ot.maquina || '--');
                s('solOTEstado', ot.estadoOrden || 'pendiente');
            } else if (resumen) {
                resumen.style.display = 'none';
            }
        });

        // Agregar items
        const btnMat = document.getElementById('btnAgregarItemMaterial');
        if (btnMat) btnMat.addEventListener('click', () => self.agregarFilaMaterial());

        const btnMisc = document.getElementById('btnAgregarItemMisc');
        if (btnMisc) btnMisc.addEventListener('click', () => self.agregarFilaMiscelaneo());

        // Enviar solicitud
        const btnEnviar = document.getElementById('btnEnviarSolicitud');
        if (btnEnviar) btnEnviar.addEventListener('click', () => self.enviarSolicitud());

        // Nueva solicitud (reset form)
        const btnNueva = document.getElementById('btnNuevaSolicitud');
        if (btnNueva) btnNueva.addEventListener('click', () => {
            // Ir al tab Nueva
            const tabNueva = document.getElementById('tab-nueva');
            if (tabNueva) new bootstrap.Tab(tabNueva).show();
            self.resetFormulario();
        });

        // Filtros mis solicitudes
        const buscarMis = document.getElementById('buscarMisSolicitudes');
        if (buscarMis) buscarMis.addEventListener('input', () => self.renderMisSolicitudes());
        const filtroEstado = document.getElementById('filtroEstadoMis');
        if (filtroEstado) filtroEstado.addEventListener('change', () => self.renderMisSolicitudes());

        // Filtros pendientes
        const buscarPend = document.getElementById('buscarPendientes');
        if (buscarPend) buscarPend.addEventListener('input', () => self.renderPendientes());
        const filtroTipo = document.getElementById('filtroTipoPendientes');
        if (filtroTipo) filtroTipo.addEventListener('change', () => self.renderPendientes());
        const filtroUrg = document.getElementById('filtroUrgencia');
        if (filtroUrg) filtroUrg.addEventListener('change', () => self.renderPendientes());
    },

    configurarVistaRol: function() {
        const esAlmacen = this.ROLES_ALMACEN.includes(this._rolUsuario);
        // Mostrar tab pendientes solo para almacen/admin
        const tabPend = document.getElementById('tab-pendientes');
        if (tabPend) tabPend.style.display = esAlmacen ? 'block' : 'none';
    },

    poblarSelectorOT: function() {
        const sel = document.getElementById('solicitudOT');
        if (!sel) return;
        sel.innerHTML = '<option value="">-- Seleccionar OT --</option>';
        const otsFiltradas = this.ordenes.filter(o =>
            o.estadoOrden !== 'cancelada'
        ).sort((a, b) => (b.numeroOrden || '').localeCompare(a.numeroOrden || ''));

        otsFiltradas.forEach(ot => {
            const opt = document.createElement('option');
            opt.value = ot.numeroOrden || ot.id;
            opt.textContent = `${ot.numeroOrden || ot.id} - ${ot.cliente || 'Sin cliente'} - ${ot.producto || 'Sin producto'}`;
            sel.appendChild(opt);
        });
    },

    agregarFilaMaterial: function() {
        const body = document.getElementById('bodyMaterialesSolicitud');
        if (!body) return;
        const idx = body.children.length;
        const tr = document.createElement('tr');

        // Opciones de materiales para datalist
        let opcionesMat = '';
        this.materiales.forEach(m => {
            const desc = `${m.material || m.tipo || ''} ${m.micras || ''}µ x ${m.ancho || ''}mm`;
            opcionesMat += `<option value="${desc}">`;
        });
        this.tintas.forEach(t => {
            opcionesMat += `<option value="Tinta: ${t.color || t.codigo || t.material || ''}">`;
        });
        this.quimicos.forEach(q => {
            opcionesMat += `<option value="Quimico: ${q.material || q.tipo || ''}">`;
        });

        tr.innerHTML = `
            <td>
                <select class="form-select form-select-sm sol-tipo-mat" name="tipoMat${idx}">
                    <option value="sustrato">Sustrato</option>
                    <option value="tinta">Tinta</option>
                    <option value="quimico">Quimico</option>
                </select>
            </td>
            <td>
                <input type="text" class="form-control form-control-sm sol-desc-mat" list="dlMatSol${idx}" placeholder="Material...">
                <datalist id="dlMatSol${idx}">${opcionesMat}</datalist>
            </td>
            <td>
                <input type="number" class="form-control form-control-sm sol-cant-mat" min="0" step="0.1" placeholder="Kg">
            </td>
            <td class="text-center">
                <button type="button" class="btn btn-outline-danger btn-sm" onclick="this.closest('tr').remove()">
                    <i class="bi bi-x"></i>
                </button>
            </td>`;
        body.appendChild(tr);
    },

    agregarFilaMiscelaneo: function() {
        const body = document.getElementById('bodyMiscelaneosSolicitud');
        if (!body) return;
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>
                <input type="text" class="form-control form-control-sm sol-desc-misc" placeholder="Descripcion del item..." list="dlMiscItems">
                <datalist id="dlMiscItems">
                    <option value="Hojillas">
                    <option value="Cinta adhesiva">
                    <option value="Cinta de embalaje">
                    <option value="Guantes">
                    <option value="Mascarillas">
                    <option value="Trapos">
                    <option value="Lija">
                    <option value="Racla">
                    <option value="Cuchilla">
                    <option value="Rodillo">
                    <option value="Bolsas">
                    <option value="Stretch film">
                    <option value="Marcadores">
                </datalist>
            </td>
            <td>
                <input type="number" class="form-control form-control-sm sol-cant-misc" min="1" step="1" value="1">
            </td>
            <td>
                <select class="form-select form-select-sm sol-unidad-misc">
                    <option value="Unidad">Unidad</option>
                    <option value="Kg">Kg</option>
                    <option value="Lt">Lt</option>
                    <option value="Rollo">Rollo</option>
                    <option value="Caja">Caja</option>
                    <option value="Par">Par</option>
                    <option value="Metro">Metro</option>
                </select>
            </td>
            <td class="text-center">
                <button type="button" class="btn btn-outline-danger btn-sm" onclick="this.closest('tr').remove()">
                    <i class="bi bi-x"></i>
                </button>
            </td>`;
        body.appendChild(tr);
    },

    generarCorrelativo: function(tipo) {
        const year = new Date().getFullYear();
        const prefix = tipo === 'material' ? 'SOL-MAT' : 'SOL-MISC';
        const mismas = this.solicitudes.filter(s =>
            s.correlativo && s.correlativo.startsWith(`${prefix}-${year}`)
        );
        const num = mismas.length + 1;
        return `${prefix}-${year}-${String(num).padStart(4, '0')}`;
    },

    enviarSolicitud: async function() {
        const tipo = document.getElementById('tipoSolicitud')?.value;
        if (!tipo) { this.showToast('Selecciona el tipo de solicitud', 'danger'); return; }

        const prioridad = document.getElementById('prioridad')?.value || 'normal';
        const observaciones = document.getElementById('observacionesSolicitud')?.value || '';
        let area = '';
        let items = [];
        let otNumero = '';
        let otData = null;

        if (tipo === 'material') {
            otNumero = document.getElementById('solicitudOT')?.value || '';
            area = document.getElementById('areaSolicitante')?.value || '';
            if (!otNumero) { this.showToast('Selecciona una Orden de Trabajo', 'danger'); return; }
            if (!area) { this.showToast('Selecciona el area solicitante', 'danger'); return; }
            otData = this.ordenes.find(o => o.numeroOrden === otNumero || o.id === otNumero);

            // Recopilar items material
            const filas = document.querySelectorAll('#bodyMaterialesSolicitud tr');
            filas.forEach(tr => {
                const tipoMat = tr.querySelector('.sol-tipo-mat')?.value || 'sustrato';
                const desc = tr.querySelector('.sol-desc-mat')?.value || '';
                const cant = parseFloat(tr.querySelector('.sol-cant-mat')?.value) || 0;
                if (desc && cant > 0) items.push({ tipo: tipoMat, descripcion: desc, cantidad: cant, unidad: 'Kg' });
            });
            if (items.length === 0) { this.showToast('Agrega al menos un material', 'danger'); return; }
        } else {
            area = document.getElementById('areaSolicitanteMisc')?.value || '';
            if (!area) { this.showToast('Selecciona el area solicitante', 'danger'); return; }

            // Recopilar items miscelaneo
            const filas = document.querySelectorAll('#bodyMiscelaneosSolicitud tr');
            filas.forEach(tr => {
                const desc = tr.querySelector('.sol-desc-misc')?.value || '';
                const cant = parseFloat(tr.querySelector('.sol-cant-misc')?.value) || 0;
                const unidad = tr.querySelector('.sol-unidad-misc')?.value || 'Unidad';
                if (desc && cant > 0) items.push({ tipo: 'miscelaneo', descripcion: desc, cantidad: cant, unidad });
            });
            if (items.length === 0) { this.showToast('Agrega al menos un item', 'danger'); return; }
        }

        const correlativo = this.generarCorrelativo(tipo);
        const solicitud = {
            id: Date.now().toString(36) + Math.random().toString(36).substr(2, 5),
            correlativo,
            tipo,
            prioridad,
            area,
            otNumero: otNumero || null,
            otCliente: otData?.cliente || null,
            otProducto: otData?.producto || null,
            items,
            observaciones,
            estado: 'pendiente',
            solicitante: this._usuario,
            rolSolicitante: this._rolUsuario,
            fechaCreacion: new Date().toISOString(),
            fechaRespuesta: null,
            respondidoPor: null,
            motivoRechazo: null,
        };

        this.solicitudes.push(solicitud);
        await this.guardarSolicitudes();

        // Crear alerta para almacen
        await this.crearAlertaAlmacen(solicitud);

        this.showToast(`Solicitud ${correlativo} enviada a almacen`, 'success');
        this.resetFormulario();
        this.renderMisSolicitudes();
        this.renderPendientes();

        // Ir a tab Mis Solicitudes
        const tabMis = document.getElementById('tab-mis-solicitudes');
        if (tabMis) new bootstrap.Tab(tabMis).show();
    },

    crearAlertaAlmacen: async function(sol) {
        try {
            const alerta = {
                id: 'alerta-sol-' + sol.id,
                tipo: sol.prioridad === 'urgente' ? 'danger' : 'warning',
                titulo: `Solicitud de ${sol.tipo === 'material' ? 'Material' : 'Miscelaneo'}: ${sol.correlativo}`,
                mensaje: `${sol.solicitante} (${sol.area}) solicita ${sol.items.length} item(s). ${sol.otNumero ? 'OT: ' + sol.otNumero : ''} ${sol.prioridad === 'urgente' ? '- URGENTE' : ''}`,
                fecha: new Date().toISOString(),
                leida: false,
                modulo: 'solicitud-despacho',
                referencia: sol.correlativo,
            };

            // Guardar en alertas
            if (typeof AxonesDB !== 'undefined' && AxonesDB.isReady()) {
                await AxonesDB.client.from('alertas').insert({
                    tipo: alerta.tipo,
                    titulo: alerta.titulo,
                    mensaje: alerta.mensaje,
                    modulo: alerta.modulo,
                    created_at: alerta.fecha
                });
            }
        } catch(e) {
            console.error('SolicitudDespacho: Error creando alerta:', e);
        }
    },

    resetFormulario: function() {
        const tipoSel = document.getElementById('tipoSolicitud');
        if (tipoSel) tipoSel.value = '';
        const prio = document.getElementById('prioridad');
        if (prio) prio.value = 'normal';
        const obs = document.getElementById('observacionesSolicitud');
        if (obs) obs.value = '';
        const otSel = document.getElementById('solicitudOT');
        if (otSel) otSel.value = '';
        const area1 = document.getElementById('areaSolicitante');
        if (area1) area1.value = '';
        const area2 = document.getElementById('areaSolicitanteMisc');
        if (area2) area2.value = '';
        const resumen = document.getElementById('resumenOTSolicitud');
        if (resumen) resumen.style.display = 'none';

        // Limpiar tablas
        const bodyMat = document.getElementById('bodyMaterialesSolicitud');
        if (bodyMat) bodyMat.innerHTML = '';
        const bodyMisc = document.getElementById('bodyMiscelaneosSolicitud');
        if (bodyMisc) bodyMisc.innerHTML = '';

        // Ocultar secciones
        ['seccionMaterial', 'seccionMiscelaneo', 'seccionObservaciones', 'seccionEnviar'].forEach(id => {
            const el = document.getElementById(id);
            if (el) el.style.display = 'none';
        });
    },

    renderMisSolicitudes: function() {
        const container = document.getElementById('listaMisSolicitudes');
        if (!container) return;

        const busq = (document.getElementById('buscarMisSolicitudes')?.value || '').toLowerCase();
        const filtroEst = document.getElementById('filtroEstadoMis')?.value || '';

        let mis = this.solicitudes.filter(s => s.solicitante === this._usuario);
        if (filtroEst) mis = mis.filter(s => s.estado === filtroEst);
        if (busq) mis = mis.filter(s =>
            (s.correlativo || '').toLowerCase().includes(busq) ||
            (s.otNumero || '').toLowerCase().includes(busq) ||
            (s.items || []).some(i => (i.descripcion || '').toLowerCase().includes(busq))
        );

        mis.sort((a, b) => new Date(b.fechaCreacion) - new Date(a.fechaCreacion));

        // Actualizar badge
        const badge = document.getElementById('badgeMisSolicitudes');
        if (badge) badge.textContent = mis.length;

        if (mis.length === 0) {
            container.innerHTML = `<div class="text-center text-muted py-4">
                <i class="bi bi-inbox display-4"></i>
                <p class="mt-2">No tienes solicitudes registradas</p>
            </div>`;
            return;
        }

        container.innerHTML = mis.map(s => this._renderCardSolicitud(s)).join('');
    },

    renderPendientes: function() {
        const container = document.getElementById('listaPendientes');
        if (!container) return;

        const busq = (document.getElementById('buscarPendientes')?.value || '').toLowerCase();
        const filtroTipo = document.getElementById('filtroTipoPendientes')?.value || '';
        const filtroUrg = document.getElementById('filtroUrgencia')?.value || '';

        let pend = this.solicitudes.filter(s => s.estado === 'pendiente');
        if (filtroTipo) pend = pend.filter(s => s.tipo === filtroTipo);
        if (filtroUrg) pend = pend.filter(s => s.prioridad === filtroUrg);
        if (busq) pend = pend.filter(s =>
            (s.correlativo || '').toLowerCase().includes(busq) ||
            (s.solicitante || '').toLowerCase().includes(busq) ||
            (s.otNumero || '').toLowerCase().includes(busq)
        );

        // Urgentes primero, luego por fecha
        pend.sort((a, b) => {
            if (a.prioridad === 'urgente' && b.prioridad !== 'urgente') return -1;
            if (b.prioridad === 'urgente' && a.prioridad !== 'urgente') return 1;
            return new Date(b.fechaCreacion) - new Date(a.fechaCreacion);
        });

        const badge = document.getElementById('badgePendientes');
        if (badge) badge.textContent = pend.length;

        if (pend.length === 0) {
            container.innerHTML = `<div class="text-center text-muted py-4">
                <i class="bi bi-check-circle display-4 text-success"></i>
                <p class="mt-2">No hay solicitudes pendientes</p>
            </div>`;
            return;
        }

        container.innerHTML = pend.map(s => this._renderCardSolicitud(s, true)).join('');
    },

    _renderCardSolicitud: function(s, mostrarAcciones) {
        const fecha = s.fechaCreacion ? new Date(s.fechaCreacion).toLocaleString('es-VE') : '--';
        const estadoBadge = {
            'pendiente': '<span class="badge bg-warning text-dark">Pendiente</span>',
            'aprobada': '<span class="badge bg-success">Aprobada</span>',
            'despachada': '<span class="badge bg-info">Despachada</span>',
            'rechazada': '<span class="badge bg-danger">Rechazada</span>',
        }[s.estado] || '<span class="badge bg-secondary">--</span>';

        const tipoBadge = s.tipo === 'material'
            ? '<span class="badge tipo-material">Material</span>'
            : '<span class="badge tipo-miscelaneo">Miscelaneo</span>';

        const urgenteBadge = s.prioridad === 'urgente'
            ? ' <span class="badge bg-danger badge-urgente">URGENTE</span>' : '';

        const itemsList = (s.items || []).map(i =>
            `<small class="d-block text-muted">- ${i.descripcion} (${i.cantidad} ${i.unidad})</small>`
        ).join('');

        const acciones = mostrarAcciones && this.ROLES_ALMACEN.includes(this._rolUsuario)
            ? `<div class="mt-2">
                <button class="btn btn-success btn-sm me-1" onclick="SolicitudDespacho.aprobarSolicitud('${s.id}')">
                    <i class="bi bi-check-lg me-1"></i>Aprobar
                </button>
                <button class="btn btn-danger btn-sm" onclick="SolicitudDespacho.rechazarSolicitud('${s.id}')">
                    <i class="bi bi-x-lg me-1"></i>Rechazar
                </button>
               </div>` : '';

        return `
        <div class="card mb-2 solicitud-card status-${s.estado}" onclick="SolicitudDespacho.verDetalle('${s.id}')">
            <div class="card-body py-2">
                <div class="d-flex justify-content-between align-items-start">
                    <div>
                        <strong>${s.correlativo}</strong> ${tipoBadge}${urgenteBadge}
                        <small class="text-muted ms-2">${fecha}</small>
                        ${s.otNumero ? `<small class="d-block text-primary">OT: ${s.otNumero} - ${s.otCliente || ''}</small>` : ''}
                        <small class="d-block">Area: ${s.area} | Solicitante: ${s.solicitante}</small>
                        ${itemsList}
                    </div>
                    <div class="text-end">
                        ${estadoBadge}
                    </div>
                </div>
                ${acciones}
            </div>
        </div>`;
    },

    verDetalle: function(id) {
        const sol = this.solicitudes.find(s => s.id === id);
        if (!sol) return;

        const modal = document.getElementById('modalDetalleSolicitud');
        if (!modal) return;

        const corrEl = document.getElementById('modalSolCorrelativo');
        if (corrEl) corrEl.textContent = sol.correlativo;

        const body = document.getElementById('modalSolBody');
        const fecha = sol.fechaCreacion ? new Date(sol.fechaCreacion).toLocaleString('es-VE') : '--';
        const fechaResp = sol.fechaRespuesta ? new Date(sol.fechaRespuesta).toLocaleString('es-VE') : '--';

        const itemsHtml = (sol.items || []).map(i => `
            <tr>
                <td>${i.tipo || '--'}</td>
                <td>${i.descripcion}</td>
                <td class="text-end">${i.cantidad}</td>
                <td>${i.unidad}</td>
            </tr>`).join('');

        body.innerHTML = `
            <div class="row mb-3">
                <div class="col-md-4"><strong>Tipo:</strong> ${sol.tipo === 'material' ? 'Material (OT)' : 'Miscelaneo'}</div>
                <div class="col-md-4"><strong>Prioridad:</strong> ${sol.prioridad === 'urgente' ? '<span class="text-danger fw-bold">URGENTE</span>' : 'Normal'}</div>
                <div class="col-md-4"><strong>Estado:</strong> ${sol.estado}</div>
            </div>
            <div class="row mb-3">
                <div class="col-md-4"><strong>Area:</strong> ${sol.area}</div>
                <div class="col-md-4"><strong>Solicitante:</strong> ${sol.solicitante}</div>
                <div class="col-md-4"><strong>Fecha:</strong> ${fecha}</div>
            </div>
            ${sol.otNumero ? `<div class="row mb-3">
                <div class="col-md-4"><strong>OT:</strong> ${sol.otNumero}</div>
                <div class="col-md-4"><strong>Cliente:</strong> ${sol.otCliente || '--'}</div>
                <div class="col-md-4"><strong>Producto:</strong> ${sol.otProducto || '--'}</div>
            </div>` : ''}
            <h6 class="mt-3">Items Solicitados</h6>
            <div class="table-responsive">
                <table class="table table-sm table-bordered">
                    <thead class="table-light"><tr><th>Tipo</th><th>Descripcion</th><th class="text-end">Cant.</th><th>Unidad</th></tr></thead>
                    <tbody>${itemsHtml}</tbody>
                </table>
            </div>
            ${sol.observaciones ? `<p><strong>Observaciones:</strong> ${sol.observaciones}</p>` : ''}
            ${sol.estado === 'rechazada' ? `<div class="alert alert-danger"><strong>Motivo rechazo:</strong> ${sol.motivoRechazo || '--'}</div>` : ''}
            ${sol.respondidoPor ? `<p class="small text-muted">Respondido por: ${sol.respondidoPor} el ${fechaResp}</p>` : ''}
        `;

        // Footer con botones segun rol y estado
        const footer = document.getElementById('modalSolFooter');
        if (footer) {
            let btns = '<button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cerrar</button>';
            if (sol.estado === 'pendiente' && this.ROLES_ALMACEN.includes(this._rolUsuario)) {
                btns = `
                    <button class="btn btn-success" onclick="SolicitudDespacho.aprobarSolicitud('${sol.id}'); bootstrap.Modal.getInstance(document.getElementById('modalDetalleSolicitud')).hide();">
                        <i class="bi bi-check-lg me-1"></i>Aprobar y Despachar
                    </button>
                    <button class="btn btn-danger" onclick="SolicitudDespacho.rechazarSolicitud('${sol.id}'); bootstrap.Modal.getInstance(document.getElementById('modalDetalleSolicitud')).hide();">
                        <i class="bi bi-x-lg me-1"></i>Rechazar
                    </button>` + btns;
            }
            footer.innerHTML = btns;
        }

        new bootstrap.Modal(modal).show();
    },

    aprobarSolicitud: async function(id) {
        const sol = this.solicitudes.find(s => s.id === id);
        if (!sol) return;
        sol.estado = 'aprobada';
        sol.fechaRespuesta = new Date().toISOString();
        sol.respondidoPor = this._usuario;
        await this.guardarSolicitudes();
        this.showToast(`Solicitud ${sol.correlativo} aprobada`, 'success');
        this.renderMisSolicitudes();
        this.renderPendientes();
    },

    rechazarSolicitud: async function(id) {
        const motivo = prompt('Motivo del rechazo:');
        if (motivo === null) return;
        const sol = this.solicitudes.find(s => s.id === id);
        if (!sol) return;
        sol.estado = 'rechazada';
        sol.fechaRespuesta = new Date().toISOString();
        sol.respondidoPor = this._usuario;
        sol.motivoRechazo = motivo || 'Sin motivo especificado';
        await this.guardarSolicitudes();
        this.showToast(`Solicitud ${sol.correlativo} rechazada`, 'warning');
        this.renderMisSolicitudes();
        this.renderPendientes();
    },

    showToast: function(msg, tipo) {
        if (typeof window.showToast === 'function') window.showToast(msg, tipo);
        else alert(msg);
    }
};

// Auto-init
document.addEventListener('DOMContentLoaded', () => {
    setTimeout(() => SolicitudDespacho.init(), 300);
});
