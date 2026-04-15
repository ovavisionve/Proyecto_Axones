/**
 * BobinasSelector - Widget reutilizable para seleccionar bobinas en produccion
 *
 * Uso:
 *   BobinasSelector.renderIn('containerId', { numeroOT: 'OT-2026-0001', fase: 'impresion' });
 *
 * Se integra en impresion.html, laminacion.html, corte.html como seccion opcional.
 * Al guardar la produccion, llama a BobinasSelector.getSeleccionadas() para obtener
 * las bobinas marcadas y luego se usan BobinasService.iniciarUso / consumir / rechazar.
 */

const BobinasSelector = {
    _contenedorId: null,
    _numeroOT: null,
    _fase: null,
    _bobinasDisponibles: [],
    _bobinasAsignadas: [],

    renderIn: async function(contenedorId, opts = {}) {
        this._contenedorId = contenedorId;
        this._numeroOT = opts.numeroOT || null;
        this._fase = opts.fase || null;

        const cont = document.getElementById(contenedorId);
        if (!cont) return;

        if (typeof BobinasService === 'undefined' || !AxonesDB.isReady()) {
            cont.innerHTML = `<div class="alert alert-warning small">
                <i class="bi bi-exclamation-triangle me-1"></i>
                Sistema de bobinas no disponible. Ejecute migracion SQL 006.
            </div>`;
            return;
        }

        cont.innerHTML = `
            <div class="card border-info mb-3">
                <div class="card-header bg-info bg-opacity-25 py-2">
                    <h6 class="mb-0">
                        <i class="bi bi-upc-scan me-1"></i> Bobinas Individuales
                        <small class="text-muted">(opcional - marque las bobinas fisicas usadas)</small>
                    </h6>
                </div>
                <div class="card-body p-2">
                    <div class="row g-2 mb-2">
                        <div class="col-md-4">
                            <input type="text" class="form-control form-control-sm" id="bobSelBusqueda-${contenedorId}" placeholder="Buscar codigo, material, proveedor...">
                        </div>
                        <div class="col-md-3">
                            <select class="form-select form-select-sm" id="bobSelFiltroMat-${contenedorId}">
                                <option value="">Todos los materiales</option>
                            </select>
                        </div>
                        <div class="col-md-3">
                            <button type="button" class="btn btn-sm btn-outline-primary" id="bobSelRefresh-${contenedorId}">
                                <i class="bi bi-arrow-clockwise"></i> Refrescar
                            </button>
                        </div>
                        <div class="col-md-2 text-end">
                            <span class="badge bg-success">Sel: <span id="bobSelCount-${contenedorId}">0</span></span>
                            <span class="badge bg-info">Kg: <span id="bobSelKg-${contenedorId}">0</span></span>
                        </div>
                    </div>

                    <!-- Disponibles -->
                    <details open>
                        <summary class="small fw-bold mb-1">Bobinas Disponibles</summary>
                        <div class="table-responsive" style="max-height:250px; overflow-y:auto;">
                            <table class="table table-sm table-bordered mb-0" style="font-size:0.8rem;">
                                <thead class="table-light sticky-top">
                                    <tr>
                                        <th style="width:30px"></th>
                                        <th>Codigo</th>
                                        <th>Material</th>
                                        <th>µ x mm</th>
                                        <th class="text-end">Kg</th>
                                        <th>Proveedor</th>
                                        <th>Lote</th>
                                    </tr>
                                </thead>
                                <tbody id="bobSelDisponibles-${contenedorId}">
                                    <tr><td colspan="7" class="text-center text-muted py-2">Cargando...</td></tr>
                                </tbody>
                            </table>
                        </div>
                    </details>

                    <!-- Ya asignadas a esta OT -->
                    <details>
                        <summary class="small fw-bold mt-2 text-primary">Bobinas ya asignadas a esta OT</summary>
                        <div id="bobSelAsignadas-${contenedorId}" class="small">-</div>
                    </details>
                </div>
            </div>
        `;

        // Setup eventos
        document.getElementById(`bobSelBusqueda-${contenedorId}`)?.addEventListener('input', () => this.renderLista());
        document.getElementById(`bobSelFiltroMat-${contenedorId}`)?.addEventListener('change', () => this.renderLista());
        document.getElementById(`bobSelRefresh-${contenedorId}`)?.addEventListener('click', () => this.cargar());

        await this.cargar();
    },

    cargar: async function() {
        try {
            this._bobinasDisponibles = await BobinasService.listarDisponibles({
                tipo: 'sustrato',
                limit: 200,
            });
            this._bobinasAsignadas = this._numeroOT
                ? await BobinasService.listar({ orden_trabajo: this._numeroOT, limit: 100 })
                : [];

            // Poblar filtro de materiales
            const mats = [...new Set(this._bobinasDisponibles.map(b => b.material).filter(Boolean))];
            const sel = document.getElementById(`bobSelFiltroMat-${this._contenedorId}`);
            if (sel) {
                const current = sel.value;
                sel.innerHTML = '<option value="">Todos los materiales</option>' +
                    mats.map(m => `<option value="${m}">${m}</option>`).join('');
                sel.value = current;
            }
        } catch(e) {
            console.warn('BobinasSelector: Error cargando:', e);
            const tbody = document.getElementById(`bobSelDisponibles-${this._contenedorId}`);
            if (tbody) tbody.innerHTML = `<tr><td colspan="7" class="text-center text-warning py-2">
                <i class="bi bi-exclamation-triangle me-1"></i> Tabla bobinas no existe. Ejecute migracion SQL 006.
            </td></tr>`;
            return;
        }

        this.renderLista();
        this.renderAsignadas();
    },

    renderLista: function() {
        const tbody = document.getElementById(`bobSelDisponibles-${this._contenedorId}`);
        if (!tbody) return;

        const busq = (document.getElementById(`bobSelBusqueda-${this._contenedorId}`)?.value || '').toLowerCase();
        const filtroMat = document.getElementById(`bobSelFiltroMat-${this._contenedorId}`)?.value || '';

        let filtradas = this._bobinasDisponibles;
        if (filtroMat) filtradas = filtradas.filter(b => b.material === filtroMat);
        if (busq) filtradas = filtradas.filter(b =>
            (b.codigo || '').toLowerCase().includes(busq) ||
            (b.material || '').toLowerCase().includes(busq) ||
            (b.proveedor || '').toLowerCase().includes(busq) ||
            (b.referencia_proveedor || '').toLowerCase().includes(busq)
        );

        if (filtradas.length === 0) {
            tbody.innerHTML = '<tr><td colspan="7" class="text-center text-muted py-2">No hay bobinas disponibles con estos filtros</td></tr>';
            return;
        }

        tbody.innerHTML = filtradas.map(b => `
            <tr>
                <td class="text-center">
                    <input type="checkbox" class="form-check-input bob-sel-check" data-id="${b.id}" data-kg="${b.peso_actual_kg}" onchange="BobinasSelector.actualizarContador()">
                </td>
                <td><code>${b.codigo}</code></td>
                <td>${b.material || '-'}</td>
                <td>${b.micras || '-'} x ${b.ancho_mm || '-'}</td>
                <td class="text-end fw-bold">${(parseFloat(b.peso_actual_kg) || 0).toFixed(2)}</td>
                <td><small>${b.proveedor || '-'}</small></td>
                <td><small>${b.referencia_proveedor || '-'}</small></td>
            </tr>
        `).join('');

        this.actualizarContador();
    },

    renderAsignadas: function() {
        const cont = document.getElementById(`bobSelAsignadas-${this._contenedorId}`);
        if (!cont) return;
        if (this._bobinasAsignadas.length === 0) {
            cont.innerHTML = '<span class="text-muted">Ninguna bobina asignada a esta OT aun</span>';
            return;
        }
        cont.innerHTML = '<ul class="list-unstyled mb-0">' +
            this._bobinasAsignadas.map(b => `
                <li><span class="badge bg-secondary me-1">${b.estado}</span>
                    <code>${b.codigo}</code> | ${b.material} ${b.micras}µ x ${b.ancho_mm}mm | ${b.peso_actual_kg}Kg
                </li>
            `).join('') +
            '</ul>';
    },

    actualizarContador: function() {
        const checks = document.querySelectorAll(`#bobSelDisponibles-${this._contenedorId} .bob-sel-check:checked`);
        let count = 0, kg = 0;
        checks.forEach(c => {
            count++;
            kg += parseFloat(c.dataset.kg) || 0;
        });
        const cEl = document.getElementById(`bobSelCount-${this._contenedorId}`);
        const kEl = document.getElementById(`bobSelKg-${this._contenedorId}`);
        if (cEl) cEl.textContent = count;
        if (kEl) kEl.textContent = kg.toFixed(2);
    },

    /** Devuelve array de IDs de bobinas seleccionadas */
    getSeleccionadas: function() {
        const checks = document.querySelectorAll(`#bobSelDisponibles-${this._contenedorId} .bob-sel-check:checked`);
        return Array.from(checks).map(c => c.dataset.id);
    },

    /** Al guardar produccion: marca bobinas como en_uso y luego como consumidas o rechazadas */
    procesarSeleccion: async function(opts = {}) {
        const ids = this.getSeleccionadas();
        if (ids.length === 0 || !this._numeroOT) return { asignadas: 0, consumidas: 0 };

        let asignadas = 0;
        for (const id of ids) {
            try {
                await BobinasService.asignarAOT(id, this._numeroOT, this._fase);
                if (opts.marcarConsumida) {
                    await BobinasService.consumir(id, { fase: this._fase });
                }
                asignadas++;
            } catch(e) { console.warn('BobinasSelector: Error procesando bobina', id, e); }
        }
        return { asignadas };
    },
};

if (typeof window !== 'undefined') window.BobinasSelector = BobinasSelector;
