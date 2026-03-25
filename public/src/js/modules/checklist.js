/**
 * Modulo Lista de Chequeo - Sistema Axones
 * Checklist de verificacion de calidad por area
 */

const Checklist = {
    // Items de checklist por area
    items: {
        impresion: [
            { id: 1, texto: 'Verificar limpieza general del area de trabajo', categoria: 'limpieza' },
            { id: 2, texto: 'Revisar estado de los rodillos anilox', categoria: 'equipo' },
            { id: 3, texto: 'Comprobar tension de la banda correcta', categoria: 'operacion' },
            { id: 4, texto: 'Verificar viscosidad de tintas', categoria: 'materiales' },
            { id: 5, texto: 'Revisar alineacion de los colores (registro)', categoria: 'calidad' },
            { id: 6, texto: 'Comprobar funcionamiento del secador', categoria: 'equipo' },
            { id: 7, texto: 'Verificar presion de los cilindros', categoria: 'operacion' },
            { id: 8, texto: 'Revisar estado de las cuchillas doctor blade', categoria: 'equipo' },
            { id: 9, texto: 'Comprobar sistema de enfriamiento', categoria: 'equipo' },
            { id: 10, texto: 'Verificar calibracion del sustrato', categoria: 'materiales' },
            { id: 11, texto: 'Revisar sistema de rebobinado', categoria: 'equipo' },
            { id: 12, texto: 'Comprobar iluminacion del area', categoria: 'seguridad' },
            { id: 13, texto: 'Verificar EPP del operador', categoria: 'seguridad' },
            { id: 14, texto: 'Revisar orden de trabajo y especificaciones', categoria: 'documentacion' },
            { id: 15, texto: 'Realizar prueba de impresion inicial', categoria: 'calidad' }
        ],
        laminacion: [
            { id: 1, texto: 'Verificar limpieza de rodillos laminadores', categoria: 'limpieza' },
            { id: 2, texto: 'Revisar temperatura del sistema', categoria: 'equipo' },
            { id: 3, texto: 'Comprobar presion de laminado', categoria: 'operacion' },
            { id: 4, texto: 'Verificar mezcla adhesivo/catalizador', categoria: 'materiales' },
            { id: 5, texto: 'Revisar alineacion de materiales', categoria: 'calidad' },
            { id: 6, texto: 'Comprobar sistema de aplicacion de adhesivo', categoria: 'equipo' },
            { id: 7, texto: 'Verificar velocidad de laminacion', categoria: 'operacion' },
            { id: 8, texto: 'Revisar tension de entrada y salida', categoria: 'operacion' },
            { id: 9, texto: 'Comprobar ausencia de burbujas', categoria: 'calidad' },
            { id: 10, texto: 'Verificar curado del adhesivo', categoria: 'calidad' },
            { id: 11, texto: 'Revisar sistema de corte lateral', categoria: 'equipo' },
            { id: 12, texto: 'Comprobar ventilacion del area', categoria: 'seguridad' },
            { id: 13, texto: 'Verificar EPP del operador', categoria: 'seguridad' },
            { id: 14, texto: 'Revisar especificaciones del producto', categoria: 'documentacion' },
            { id: 15, texto: 'Realizar prueba de adherencia', categoria: 'calidad' }
        ],
        corte: [
            { id: 1, texto: 'Verificar limpieza de la cortadora', categoria: 'limpieza' },
            { id: 2, texto: 'Revisar filo de las cuchillas', categoria: 'equipo' },
            { id: 3, texto: 'Comprobar alineacion del material', categoria: 'operacion' },
            { id: 4, texto: 'Verificar medidas de corte programadas', categoria: 'operacion' },
            { id: 5, texto: 'Revisar tension del desbobinador', categoria: 'equipo' },
            { id: 6, texto: 'Comprobar contador de metros', categoria: 'equipo' },
            { id: 7, texto: 'Verificar sistema de rebobinado', categoria: 'equipo' },
            { id: 8, texto: 'Revisar calidad del corte (bordes limpios)', categoria: 'calidad' },
            { id: 9, texto: 'Comprobar velocidad de corte', categoria: 'operacion' },
            { id: 10, texto: 'Verificar embobinado uniforme', categoria: 'calidad' },
            { id: 11, texto: 'Revisar etiquetado de bobinas', categoria: 'documentacion' },
            { id: 12, texto: 'Comprobar peso de bobinas', categoria: 'calidad' },
            { id: 13, texto: 'Verificar EPP del operador', categoria: 'seguridad' },
            { id: 14, texto: 'Revisar orden de trabajo', categoria: 'documentacion' },
            { id: 15, texto: 'Verificar destino de scrap', categoria: 'limpieza' }
        ]
    },

    // Maquinas por area
    maquinas: {
        impresion: ['COMEXI 1', 'COMEXI 2', 'COMEXI 3'],
        laminacion: ['Laminadora 1', 'Laminadora 2'],
        corte: ['Cortadora China', 'Cortadora Permaco', 'Cortadora Novograf']
    },

    // Estado de los items
    estado: {},

    // Canvas de firma
    firmaCtx: null,
    firmaDibujando: false,

    /**
     * Inicializa el modulo
     */
    init: function() {
        console.log('Inicializando modulo Checklist');

        this.setDefaultDate();
        this.setupEventListeners();
        this.setupFirma();
        this.initChart();
    },

    /**
     * Establece fecha actual
     */
    setDefaultDate: function() {
        const fechaInput = document.getElementById('fecha');
        if (fechaInput) {
            fechaInput.value = new Date().toISOString().split('T')[0];
        }
    },

    /**
     * Configura event listeners
     */
    setupEventListeners: function() {
        // Cambio de area
        const areaSelect = document.getElementById('area');
        if (areaSelect) {
            areaSelect.addEventListener('change', () => this.cargarArea());
        }

        // Formulario
        const form = document.getElementById('formChecklist');
        if (form) {
            form.addEventListener('submit', (e) => {
                e.preventDefault();
                this.guardar();
            });
        }

        // Boton limpiar
        const btnLimpiar = document.getElementById('btnLimpiar');
        if (btnLimpiar) {
            btnLimpiar.addEventListener('click', () => this.limpiar());
        }
    },

    /**
     * Carga items y maquinas del area seleccionada
     */
    cargarArea: function() {
        const area = document.getElementById('area').value;
        if (!area) return;

        // Cargar maquinas
        const maquinaSelect = document.getElementById('maquina');
        maquinaSelect.innerHTML = '<option value="">Seleccionar...</option>';
        if (this.maquinas[area]) {
            this.maquinas[area].forEach(m => {
                maquinaSelect.innerHTML += `<option value="${m}">${m}</option>`;
            });
        }

        // Cargar items de checklist
        this.renderizarItems(area);
    },

    /**
     * Renderiza los items del checklist
     */
    renderizarItems: function(area) {
        const container = document.getElementById('checklistContainer');
        const items = this.items[area] || [];

        // Reiniciar estado
        this.estado = {};

        let html = '';
        items.forEach(item => {
            this.estado[item.id] = null; // null = pendiente
            html += `
                <div class="check-item d-flex align-items-center" id="item${item.id}">
                    <span class="check-number">${item.id}</span>
                    <div class="flex-grow-1">
                        <div class="fw-medium small">${item.texto}</div>
                        <span class="badge bg-light text-secondary" style="font-size: 0.65rem;">${item.categoria}</span>
                    </div>
                    <div class="btn-group ms-2">
                        <button type="button" class="btn btn-outline-success btn-sm" onclick="Checklist.marcar(${item.id}, true)" title="OK">
                            <i class="bi bi-check-lg"></i>
                        </button>
                        <button type="button" class="btn btn-outline-danger btn-sm" onclick="Checklist.marcar(${item.id}, false)" title="Falla">
                            <i class="bi bi-x-lg"></i>
                        </button>
                    </div>
                    <span class="check-status ms-2" id="status${item.id}">
                        <i class="bi bi-circle text-secondary"></i>
                    </span>
                </div>
            `;
        });

        container.innerHTML = html || '<p class="text-muted text-center">Selecciona un area para ver el checklist</p>';
        this.actualizarResumen();
    },

    /**
     * Marca un item como OK o Falla
     */
    marcar: function(id, ok) {
        this.estado[id] = ok;

        const item = document.getElementById(`item${id}`);
        const status = document.getElementById(`status${id}`);

        // Actualizar clases
        item.classList.remove('checked', 'failed');
        item.classList.add(ok ? 'checked' : 'failed');

        // Actualizar icono
        if (ok) {
            status.innerHTML = '<i class="bi bi-check-circle-fill text-success"></i>';
        } else {
            status.innerHTML = '<i class="bi bi-x-circle-fill text-danger"></i>';
        }

        this.actualizarResumen();
    },

    /**
     * Actualiza el resumen y grafico
     */
    actualizarResumen: function() {
        const valores = Object.values(this.estado);
        const total = valores.length;
        const ok = valores.filter(v => v === true).length;
        const fail = valores.filter(v => v === false).length;
        const pending = valores.filter(v => v === null).length;

        // Actualizar contadores
        document.getElementById('countOk').textContent = ok;
        document.getElementById('countFail').textContent = fail;
        document.getElementById('countPending').textContent = pending;

        document.getElementById('footerOk').textContent = ok;
        document.getElementById('footerFail').textContent = fail;
        document.getElementById('footerPending').textContent = pending;

        // Porcentaje completado
        const completado = total > 0 ? Math.round(((ok + fail) / total) * 100) : 0;
        document.getElementById('porcentajeCompletado').textContent = completado + '%';

        // Actualizar grafico
        this.updateChart(ok, fail, pending);

        // Estado general
        this.actualizarEstadoGeneral(ok, fail, pending, total);
    },

    /**
     * Actualiza el indicador de estado general
     */
    actualizarEstadoGeneral: function(ok, fail, pending, total) {
        const estado = document.getElementById('estadoGeneral');

        if (total === 0) {
            estado.className = 'alert alert-secondary text-center mb-0';
            estado.innerHTML = '<i class="bi bi-hourglass-split me-2"></i>Selecciona un area';
            return;
        }

        if (pending > 0) {
            estado.className = 'alert alert-secondary text-center mb-0';
            estado.innerHTML = '<i class="bi bi-hourglass-split me-2"></i>Pendiente de completar';
        } else if (fail === 0) {
            estado.className = 'alert alert-success text-center mb-0';
            estado.innerHTML = '<i class="bi bi-check-circle me-2"></i>APROBADO - Todo OK';
        } else if (fail <= 2) {
            estado.className = 'alert alert-warning text-center mb-0';
            estado.innerHTML = '<i class="bi bi-exclamation-triangle me-2"></i>OBSERVACIONES - Revisar fallas';
        } else {
            estado.className = 'alert alert-danger text-center mb-0';
            estado.innerHTML = '<i class="bi bi-x-circle me-2"></i>NO APROBADO - Multiples fallas';
        }
    },

    // Chart instance
    chart: null,

    /**
     * Inicializa el grafico circular
     */
    initChart: function() {
        const ctx = document.getElementById('progressChart');
        if (!ctx) return;

        this.chart = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: ['OK', 'Fallas', 'Pendientes'],
                datasets: [{
                    data: [0, 0, 1],
                    backgroundColor: ['#198754', '#dc3545', '#6c757d'],
                    borderWidth: 0
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: true,
                cutout: '70%',
                plugins: {
                    legend: { display: false }
                }
            }
        });
    },

    /**
     * Actualiza el grafico
     */
    updateChart: function(ok, fail, pending) {
        if (!this.chart) return;

        this.chart.data.datasets[0].data = [ok, fail, pending || 0.1];
        this.chart.update();
    },

    /**
     * Configura el canvas de firma
     */
    setupFirma: function() {
        const canvas = document.getElementById('firmaCanvas');
        if (!canvas) return;

        this.firmaCtx = canvas.getContext('2d');
        this.firmaCtx.strokeStyle = '#000';
        this.firmaCtx.lineWidth = 2;
        this.firmaCtx.lineCap = 'round';

        // Mouse events
        canvas.addEventListener('mousedown', (e) => this.iniciarFirma(e));
        canvas.addEventListener('mousemove', (e) => this.dibujarFirma(e));
        canvas.addEventListener('mouseup', () => this.finFirma());
        canvas.addEventListener('mouseout', () => this.finFirma());

        // Touch events
        canvas.addEventListener('touchstart', (e) => {
            e.preventDefault();
            this.iniciarFirma(e.touches[0]);
        });
        canvas.addEventListener('touchmove', (e) => {
            e.preventDefault();
            this.dibujarFirma(e.touches[0]);
        });
        canvas.addEventListener('touchend', () => this.finFirma());
    },

    iniciarFirma: function(e) {
        this.firmaDibujando = true;
        const rect = e.target.getBoundingClientRect();
        this.firmaCtx.beginPath();
        this.firmaCtx.moveTo(e.clientX - rect.left, e.clientY - rect.top);
    },

    dibujarFirma: function(e) {
        if (!this.firmaDibujando) return;
        const canvas = document.getElementById('firmaCanvas');
        const rect = canvas.getBoundingClientRect();
        this.firmaCtx.lineTo(e.clientX - rect.left, e.clientY - rect.top);
        this.firmaCtx.stroke();
    },

    finFirma: function() {
        this.firmaDibujando = false;
    },

    limpiarFirma: function() {
        const canvas = document.getElementById('firmaCanvas');
        if (canvas && this.firmaCtx) {
            this.firmaCtx.clearRect(0, 0, canvas.width, canvas.height);
        }
    },

    /**
     * Guarda el checklist
     */
    guardar: async function() {
        const form = document.getElementById('formChecklist');
        if (!form.checkValidity()) {
            form.reportValidity();
            return;
        }

        // Verificar que todos los items esten marcados
        const pendientes = Object.values(this.estado).filter(v => v === null).length;
        if (pendientes > 0) {
            Axones.showError(`Faltan ${pendientes} items por verificar`);
            return;
        }

        const turnoSeleccionado = document.querySelector('input[name="turno"]:checked');

        const datos = {
            id: 'CHK_' + Date.now(),
            timestamp: new Date().toISOString(),
            tipo: 'checklist',

            area: document.getElementById('area').value,
            maquina: document.getElementById('maquina').value,
            fecha: document.getElementById('fecha').value,
            turno: turnoSeleccionado ? turnoSeleccionado.value : '',
            operador: document.getElementById('operador').value,
            supervisor: document.getElementById('supervisor').value,

            items: this.estado,
            totalOk: Object.values(this.estado).filter(v => v === true).length,
            totalFail: Object.values(this.estado).filter(v => v === false).length,

            observaciones: document.getElementById('observaciones').value,
            firma: document.getElementById('firmaCanvas').toDataURL(),

            aprobado: Object.values(this.estado).filter(v => v === false).length === 0,

            registradoPor: Auth.getUser() ? Auth.getUser().id : 'unknown',
            registradoPorNombre: Auth.getUser() ? Auth.getUser().nombre : 'Unknown'
        };

        // Guardar en Supabase sync_store
        let registros = [];
        try {
            const { data: existing } = await AxonesDB.client.from('sync_store').select('value').eq('key', 'axones_checklist').single();
            registros = (existing && existing.value) ? (typeof existing.value === 'string' ? JSON.parse(existing.value) : existing.value) : [];
        } catch (e) { /* empty */ }
        registros.unshift(datos);
        try {
            await AxonesDB.client.from('sync_store').upsert({ key: 'axones_checklist', value: registros, updated_at: new Date().toISOString() }, { onConflict: 'key' });
        } catch (e) { console.warn('Checklist: Error guardando en Supabase', e); }

        Axones.showSuccess('Checklist guardado correctamente');

        // Si hay fallas, generar alerta
        if (datos.totalFail > 0) {
            this.generarAlerta(datos);
        }
    },

    /**
     * Genera alerta por fallas en checklist
     */
    generarAlerta: async function(datos) {
        const alerta = {
            id: 'ALT_' + Date.now(),
            timestamp: new Date().toISOString(),
            tipo: 'checklist_falla',
            nivel: datos.totalFail > 2 ? 'critical' : 'warning',
            maquina: datos.maquina,
            operador: datos.operador,
            mensaje: `Checklist ${datos.area}: ${datos.totalFail} falla(s) detectada(s)`,
            estado: 'pendiente',
            registro_id: datos.id
        };

        let alertas = [];
        try {
            const { data: existing } = await AxonesDB.client.from('sync_store').select('value').eq('key', 'axones_alertas').single();
            alertas = (existing && existing.value) ? (typeof existing.value === 'string' ? JSON.parse(existing.value) : existing.value) : [];
        } catch (e) { /* empty */ }
        alertas.unshift(alerta);
        try {
            await AxonesDB.client.from('sync_store').upsert({ key: 'axones_alertas', value: alertas, updated_at: new Date().toISOString() }, { onConflict: 'key' });
        } catch (e) { console.warn('Checklist: Error guardando alerta en Supabase', e); }

        Axones.showToast(`ALERTA: ${alerta.mensaje}`, alerta.nivel === 'critical' ? 'danger' : 'warning');
    },

    /**
     * Limpia el formulario
     */
    limpiar: function() {
        const form = document.getElementById('formChecklist');
        if (form) {
            form.reset();
            this.setDefaultDate();
            document.getElementById('checklistContainer').innerHTML = '<p class="text-muted text-center">Selecciona un area para ver el checklist</p>';
            document.getElementById('maquina').innerHTML = '<option value="">Seleccionar...</option>';
            this.estado = {};
            this.actualizarResumen();
            this.limpiarFirma();
        }
    },

    /**
     * Muestra historial de checklists
     */
    verHistorial: async function() {
        let registros = [];
        try {
            const { data } = await AxonesDB.client.from('sync_store').select('value').eq('key', 'axones_checklist').single();
            registros = (data && data.value) ? (typeof data.value === 'string' ? JSON.parse(data.value) : data.value) : [];
        } catch (e) { /* empty */ }

        let html = '<div class="table-responsive"><table class="table table-sm table-striped">';
        html += '<thead><tr><th>Fecha</th><th>Area</th><th>Maquina</th><th>Operador</th><th>Estado</th></tr></thead><tbody>';

        if (registros.length === 0) {
            html += '<tr><td colspan="5" class="text-center text-muted">No hay registros</td></tr>';
        } else {
            registros.slice(0, 20).forEach(r => {
                const estado = r.aprobado
                    ? '<span class="badge bg-success">Aprobado</span>'
                    : '<span class="badge bg-danger">No Aprobado</span>';
                html += `<tr>
                    <td>${new Date(r.timestamp).toLocaleDateString()}</td>
                    <td>${r.area}</td>
                    <td>${r.maquina}</td>
                    <td>${r.operador}</td>
                    <td>${estado}</td>
                </tr>`;
            });
        }

        html += '</tbody></table></div>';

        // Mostrar en modal
        const modal = document.createElement('div');
        modal.innerHTML = `
            <div class="modal fade" id="modalHistorial" tabindex="-1">
                <div class="modal-dialog modal-lg">
                    <div class="modal-content">
                        <div class="modal-header">
                            <h5 class="modal-title"><i class="bi bi-clock-history me-2"></i>Historial de Checklists</h5>
                            <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                        </div>
                        <div class="modal-body">${html}</div>
                    </div>
                </div>
            </div>
        `;
        document.body.appendChild(modal);
        const bsModal = new bootstrap.Modal(document.getElementById('modalHistorial'));
        bsModal.show();
        document.getElementById('modalHistorial').addEventListener('hidden.bs.modal', () => modal.remove());
    }
};

// Inicializar
document.addEventListener('DOMContentLoaded', () => {
    if (document.getElementById('formChecklist')) {
        Checklist.init();
    }
});

// Exportar
if (typeof window !== 'undefined') {
    window.Checklist = Checklist;
}
