/**
 * Modulo Montaje - Sistema Axones
 * Primera fase de produccion: montaje de cliche y cilindro antes de impresion.
 *
 * Funciones:
 *   - Selector de OT con resumen de impresion
 *   - Temporizador Play/Finalizar (simple, sin pausa)
 *   - Alerta automatica si supera 1 hora
 *   - Material usado (cintas, pegamentos, etc.)
 *   - Historial de montajes
 *
 * Al finalizar montaje, la OT cambia a estado "impresion" en Kanban.
 * Almacenamiento: sync_store key 'axones_montajes'
 */

const Montaje = {
    ordenes: [],
    montajes: [],
    _timer: null,
    _timerInicio: null,
    _alertaMostrada: false,
    _otSeleccionada: null,

    UMBRAL_ALERTA_MS: 60 * 60 * 1000,  // 1 hora
    SYNC_KEY: 'axones_montajes',

    init: async function() {
        if (typeof AxonesDB !== 'undefined' && !AxonesDB.isReady()) {
            await AxonesDB.init();
        }
        await this.cargarDatos();
        this.setupEvents();
        this.restaurarSesion();

        window.addEventListener('axones-sync', async () => {
            await this.cargarDatos();
        });
    },

    cargarDatos: async function() {
        try {
            if (typeof AxonesDB !== 'undefined' && AxonesDB.isReady()) {
                this.ordenes = await AxonesDB.ordenesHelper.cargar() || [];
                const { data } = await AxonesDB.client.from('sync_store')
                    .select('value').eq('key', this.SYNC_KEY).maybeSingle();
                this.montajes = data?.value ? JSON.parse(data.value) : [];
            }
        } catch(e) { console.warn('Montaje: Error cargando datos:', e); }

        this.poblarSelectorOT();
        this.renderHistorial();
    },

    poblarSelectorOT: function() {
        const sel = document.getElementById('montajeOT');
        if (!sel) return;
        sel.innerHTML = '<option value="">-- Seleccionar OT --</option>';

        // OTs en estado pendiente o montaje
        const filtradas = this.ordenes.filter(o =>
            ['pendiente', 'montaje'].includes(o.estadoOrden)
        ).sort((a, b) => (b.numeroOrden || '').localeCompare(a.numeroOrden || ''));

        filtradas.forEach(ot => {
            const num = ot.numeroOrden || ot.nombreOT || ot.id;
            const opt = document.createElement('option');
            opt.value = num;
            opt.textContent = `${num} - ${ot.cliente || ''} - ${ot.producto || ''}`;
            opt.dataset.ot = JSON.stringify(ot);
            sel.appendChild(opt);
        });
    },

    setupEvents: function() {
        document.getElementById('montajeOT')?.addEventListener('change', (e) => {
            const opt = e.target.options[e.target.selectedIndex];
            if (opt?.dataset.ot) this.seleccionarOT(JSON.parse(opt.dataset.ot));
            else this.ocultarSecciones();
        });

        document.getElementById('btnIniciar')?.addEventListener('click', () => this.iniciarMontaje());
        document.getElementById('btnFinalizar')?.addEventListener('click', () => this.finalizarMontaje());
        document.getElementById('btnGuardarMontaje')?.addEventListener('click', () => this.guardar());

        // Autosave cada 5 seg
        setInterval(() => this.autosave(), 5000);
    },

    seleccionarOT: function(ot) {
        this._otSeleccionada = ot;
        const setText = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = val || '-'; };
        setText('ot-cliente', ot.cliente);
        setText('ot-producto', ot.producto);
        setText('ot-cpe', ot.cpe || ot.sku);
        setText('ot-maquina', ot.maquina);
        setText('ot-estructura', ot.estructuraMaterial || ot.tipoMaterial);
        setText('ot-ancho', ot.ancho);
        setText('ot-desarrollo', ot.desarrollo);
        setText('ot-figura', ot.figuraEmb || ot.figuraEmbobinado);
        setText('ot-pinon', ot.pinon);

        // Colores
        const colores = [];
        for (let i = 1; i <= 8; i++) {
            const c = ot['color' + i] || ot['impColor' + i];
            if (c) colores.push(i + ':' + c);
        }
        setText('ot-colores', colores.length ? colores.join(' | ') : '-');

        document.getElementById('resumenOT').style.display = '';
        document.getElementById('seccionMontaje').style.display = '';

        // Si ya hay una fila de material, dejarla, sino crear una
        const body = document.getElementById('bodyMaterialesMontaje');
        if (body && body.children.length === 0) this.agregarMaterial();
    },

    ocultarSecciones: function() {
        document.getElementById('resumenOT').style.display = 'none';
        document.getElementById('seccionMontaje').style.display = 'none';
        this._otSeleccionada = null;
    },

    iniciarMontaje: function() {
        if (!this._otSeleccionada) { alert('Seleccione una OT primero'); return; }
        const operador = document.getElementById('montajeOperador')?.value?.trim();
        if (!operador) { alert('Indique el operador de montaje'); return; }

        this._timerInicio = Date.now();
        this._alertaMostrada = false;
        this._actualizarTimer();
        this._timer = setInterval(() => this._actualizarTimer(), 1000);

        document.getElementById('btnIniciar').classList.add('d-none');
        document.getElementById('btnFinalizar').classList.remove('d-none');

        this.autosave();
    },

    finalizarMontaje: function() {
        if (!this._timer) return;
        clearInterval(this._timer);
        this._timer = null;

        const duracion = Date.now() - this._timerInicio;
        const duracionMin = Math.round(duracion / 60000);

        document.getElementById('btnIniciar').classList.add('d-none');
        document.getElementById('btnFinalizar').classList.add('d-none');

        if (confirm(`Montaje finalizado en ${this._formatTiempo(duracion)} (${duracionMin} min). Desea guardar ahora?`)) {
            this.guardar();
        }
    },

    _actualizarTimer: function() {
        if (!this._timerInicio) return;
        const elapsed = Date.now() - this._timerInicio;
        const display = document.getElementById('timerDisplay');
        if (display) display.textContent = this._formatTiempo(elapsed);

        // Alerta si supera 1 hora
        if (elapsed > this.UMBRAL_ALERTA_MS && !this._alertaMostrada) {
            this._alertaMostrada = true;
            document.getElementById('alertaTiempo').classList.remove('d-none');
            this._crearAlertaSistema();
        }
    },

    _formatTiempo: function(ms) {
        const s = Math.floor(ms / 1000);
        const h = Math.floor(s / 3600);
        const m = Math.floor((s % 3600) / 60);
        const sec = s % 60;
        return `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}:${String(sec).padStart(2,'0')}`;
    },

    _crearAlertaSistema: async function() {
        try {
            if (AxonesDB.isReady()) {
                await AxonesDB.client.from('alertas').insert({
                    tipo: 'warning',
                    titulo: `Montaje lento - OT ${this._otSeleccionada?.numeroOrden}`,
                    mensaje: `El montaje de la OT ${this._otSeleccionada?.numeroOrden} (${this._otSeleccionada?.cliente}) ha superado 1 hora.`,
                    modulo: 'montaje',
                });
            }
        } catch(e) { console.warn('Montaje: Error creando alerta:', e); }
    },

    agregarMaterial: function() {
        const body = document.getElementById('bodyMaterialesMontaje');
        if (!body) return;
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>
                <select class="form-select form-select-sm mat-tipo">
                    <option value="cinta">Cinta</option>
                    <option value="pegamento">Pegamento</option>
                    <option value="solvente">Solvente</option>
                    <option value="polyester">Polyester</option>
                    <option value="otro">Otro</option>
                </select>
            </td>
            <td><input type="text" class="form-control form-control-sm mat-desc" placeholder="Ej: Cinta 3M, Pegamento cianoacrilato..."></td>
            <td><input type="number" class="form-control form-control-sm mat-cant" min="0" step="0.01" value="0"></td>
            <td>
                <select class="form-select form-select-sm mat-unidad">
                    <option value="Unidad">Unidad</option>
                    <option value="Metro">Metro</option>
                    <option value="Kg">Kg</option>
                    <option value="Gr">Gr</option>
                    <option value="Lt">Lt</option>
                    <option value="Ml">Ml</option>
                </select>
            </td>
            <td class="text-center">
                <button type="button" class="btn btn-sm btn-outline-danger" onclick="this.closest('tr').remove()">
                    <i class="bi bi-x"></i>
                </button>
            </td>`;
        body.appendChild(tr);
    },

    recopilarMateriales: function() {
        const mats = [];
        document.querySelectorAll('#bodyMaterialesMontaje tr').forEach(tr => {
            const desc = tr.querySelector('.mat-desc')?.value?.trim();
            const cant = parseFloat(tr.querySelector('.mat-cant')?.value) || 0;
            if (desc && cant > 0) {
                mats.push({
                    tipo: tr.querySelector('.mat-tipo')?.value || 'otro',
                    descripcion: desc,
                    cantidad: cant,
                    unidad: tr.querySelector('.mat-unidad')?.value || 'Unidad',
                });
            }
        });
        return mats;
    },

    guardar: async function() {
        if (!this._otSeleccionada) { alert('No hay OT seleccionada'); return; }

        const operador = document.getElementById('montajeOperador')?.value?.trim();
        if (!operador) { alert('Indique el operador'); return; }

        const duracion = this._timerInicio ? Date.now() - this._timerInicio : 0;
        const duracionMin = Math.round(duracion / 60000);

        // Si supero 1h, exigir observaciones
        const obs = document.getElementById('observaciones')?.value?.trim() || '';
        if (duracion > this.UMBRAL_ALERTA_MS && !obs) {
            alert('Como el montaje supero 1 hora, es obligatorio indicar el motivo en observaciones.');
            document.getElementById('observaciones')?.focus();
            return;
        }

        const materiales = this.recopilarMateriales();

        const montaje = {
            id: Date.now().toString(36) + Math.random().toString(36).substr(2, 5),
            otNumero: this._otSeleccionada.numeroOrden || this._otSeleccionada.nombreOT,
            otId: this._otSeleccionada.id,
            cliente: this._otSeleccionada.cliente,
            producto: this._otSeleccionada.producto,
            maquina: this._otSeleccionada.maquina,
            operador,
            ayudante: document.getElementById('ayudante')?.value?.trim() || '',
            turno: document.getElementById('turno')?.value || '',
            numCliche: document.getElementById('numCliche')?.value?.trim() || '',
            numCilindro: document.getElementById('numCilindro')?.value?.trim() || '',
            fechaInicio: this._timerInicio ? new Date(this._timerInicio).toISOString() : new Date().toISOString(),
            fechaFin: new Date().toISOString(),
            duracionMs: duracion,
            duracionMin: duracionMin,
            superoUmbral: duracion > this.UMBRAL_ALERTA_MS,
            materiales,
            observaciones: obs,
            timestamp: new Date().toISOString(),
        };

        this.montajes.unshift(montaje);
        await this.guardarTodos();

        // Cambiar estado OT a "impresion"
        try {
            if (AxonesDB.isReady() && AxonesDB.ordenesHelper) {
                await AxonesDB.ordenesHelper.actualizar(this._otSeleccionada.id, {
                    ...this._otSeleccionada,
                    estadoOrden: 'impresion',
                    fechaMontajeFin: new Date().toISOString(),
                });
            }
        } catch(e) { console.warn('Montaje: Error actualizando estado OT:', e); }

        // Limpiar
        this._limpiarSesion();
        this.resetForm();
        await this.cargarDatos();

        alert(`Montaje de ${montaje.otNumero} guardado. Duracion: ${duracionMin} min. OT pasa a Impresion.`);
    },

    guardarTodos: async function() {
        const json = JSON.stringify(this.montajes);
        localStorage.setItem(this.SYNC_KEY, json);
        try {
            if (AxonesDB.isReady()) {
                await AxonesDB.client.from('sync_store').upsert({
                    key: this.SYNC_KEY,
                    value: json,
                    updated_at: new Date().toISOString()
                }, { onConflict: 'key' });
            }
        } catch(e) { console.error('Montaje: Error guardando:', e); }
    },

    cancelar: function() {
        if (this._timer) clearInterval(this._timer);
        this._timer = null;
        this._timerInicio = null;
        if (confirm('Cancelar este montaje? Se perdera lo registrado.')) {
            this._limpiarSesion();
            this.resetForm();
        }
    },

    resetForm: function() {
        document.getElementById('montajeOT').value = '';
        document.getElementById('montajeOperador').value = '';
        document.getElementById('ayudante').value = '';
        document.getElementById('turno').value = '';
        document.getElementById('numCliche').value = '';
        document.getElementById('numCilindro').value = '';
        document.getElementById('observaciones').value = '';
        document.getElementById('timerDisplay').textContent = '00:00:00';
        document.getElementById('btnIniciar').classList.remove('d-none');
        document.getElementById('btnFinalizar').classList.add('d-none');
        document.getElementById('alertaTiempo').classList.add('d-none');
        document.getElementById('bodyMaterialesMontaje').innerHTML = '';
        this.ocultarSecciones();
    },

    // === Autosave / Sesion persistente ===
    autosave: function() {
        if (!this._otSeleccionada) return;
        const state = {
            otNumero: this._otSeleccionada?.numeroOrden,
            operador: document.getElementById('montajeOperador')?.value,
            ayudante: document.getElementById('ayudante')?.value,
            turno: document.getElementById('turno')?.value,
            numCliche: document.getElementById('numCliche')?.value,
            numCilindro: document.getElementById('numCilindro')?.value,
            observaciones: document.getElementById('observaciones')?.value,
            timerInicio: this._timerInicio,
            materiales: this.recopilarMateriales(),
            timestamp: Date.now(),
        };
        localStorage.setItem('axones_montaje_autosave', JSON.stringify(state));
    },

    restaurarSesion: function() {
        try {
            const raw = localStorage.getItem('axones_montaje_autosave');
            if (!raw) return;
            const state = JSON.parse(raw);

            // Max 12 horas
            if (Date.now() - state.timestamp > 12 * 60 * 60 * 1000) {
                this._limpiarSesion();
                return;
            }

            if (!state.otNumero) return;

            if (confirm(`Hay un montaje en progreso de la OT ${state.otNumero}. Desea recuperarlo?`)) {
                const ot = this.ordenes.find(o =>
                    o.numeroOrden === state.otNumero || o.nombreOT === state.otNumero
                );
                if (ot) {
                    document.getElementById('montajeOT').value = state.otNumero;
                    this.seleccionarOT(ot);

                    document.getElementById('montajeOperador').value = state.operador || '';
                    document.getElementById('ayudante').value = state.ayudante || '';
                    document.getElementById('turno').value = state.turno || '';
                    document.getElementById('numCliche').value = state.numCliche || '';
                    document.getElementById('numCilindro').value = state.numCilindro || '';
                    document.getElementById('observaciones').value = state.observaciones || '';

                    // Restaurar materiales
                    const body = document.getElementById('bodyMaterialesMontaje');
                    if (body) body.innerHTML = '';
                    (state.materiales || []).forEach(m => {
                        this.agregarMaterial();
                        const lastRow = body.lastElementChild;
                        if (lastRow) {
                            lastRow.querySelector('.mat-tipo').value = m.tipo;
                            lastRow.querySelector('.mat-desc').value = m.descripcion;
                            lastRow.querySelector('.mat-cant').value = m.cantidad;
                            lastRow.querySelector('.mat-unidad').value = m.unidad;
                        }
                    });

                    // Restaurar timer si estaba corriendo
                    if (state.timerInicio) {
                        this._timerInicio = state.timerInicio;
                        this._actualizarTimer();
                        this._timer = setInterval(() => this._actualizarTimer(), 1000);
                        document.getElementById('btnIniciar').classList.add('d-none');
                        document.getElementById('btnFinalizar').classList.remove('d-none');
                    }
                }
            } else {
                this._limpiarSesion();
            }
        } catch(e) { console.warn('Montaje: Error restaurando sesion:', e); }
    },

    _limpiarSesion: function() {
        localStorage.removeItem('axones_montaje_autosave');
        this._timerInicio = null;
        if (this._timer) clearInterval(this._timer);
        this._timer = null;
    },

    // === Historial ===
    renderHistorial: function() {
        const tbody = document.getElementById('tablaHistorialMontaje');
        if (!tbody) return;

        const count = document.getElementById('countHistorial');
        if (count) count.textContent = this.montajes.length;

        if (this.montajes.length === 0) {
            tbody.innerHTML = '<tr><td colspan="8" class="text-center text-muted py-4">No hay montajes registrados</td></tr>';
            return;
        }

        tbody.innerHTML = this.montajes.slice(0, 50).map(m => {
            const estado = m.superoUmbral
                ? '<span class="badge bg-warning text-dark">Lento</span>'
                : '<span class="badge bg-success">OK</span>';
            const fecha = m.fechaInicio ? new Date(m.fechaInicio).toLocaleString('es-VE') : '-';
            return `<tr>
                <td><small>${fecha}</small></td>
                <td><strong>${m.otNumero || '-'}</strong></td>
                <td><small>${m.cliente || '-'}</small></td>
                <td>${m.maquina || '-'}</td>
                <td>${m.operador || '-'}</td>
                <td class="text-end">${m.duracionMin} min</td>
                <td class="text-center">${estado}</td>
                <td class="text-center">
                    <button class="btn btn-sm btn-outline-info" onclick="Montaje.verDetalle('${m.id}')">
                        <i class="bi bi-eye"></i>
                    </button>
                </td>
            </tr>`;
        }).join('');
    },

    verDetalle: function(id) {
        const m = this.montajes.find(mon => mon.id === id);
        if (!m) return;
        const mats = (m.materiales || []).map(mt => `  - ${mt.descripcion}: ${mt.cantidad} ${mt.unidad}`).join('\n');
        const info = [
            `OT: ${m.otNumero}`,
            `Cliente: ${m.cliente}`,
            `Producto: ${m.producto}`,
            `Maquina: ${m.maquina}`,
            `Operador: ${m.operador}${m.ayudante ? ' + ' + m.ayudante : ''}`,
            `Turno: ${m.turno || '-'}`,
            `Cliche: ${m.numCliche || '-'} | Cilindro: ${m.numCilindro || '-'}`,
            `Duracion: ${m.duracionMin} min ${m.superoUmbral ? '(SUPERO 1H)' : ''}`,
            `Inicio: ${new Date(m.fechaInicio).toLocaleString('es-VE')}`,
            `Fin: ${new Date(m.fechaFin).toLocaleString('es-VE')}`,
            '',
            `MATERIALES USADOS (${(m.materiales || []).length}):`,
            mats || '  (ninguno)',
            '',
            `OBSERVACIONES: ${m.observaciones || '(ninguna)'}`,
        ].join('\n');
        alert(info);
    },
};

document.addEventListener('DOMContentLoaded', () => {
    setTimeout(() => Montaje.init(), 300);
});
