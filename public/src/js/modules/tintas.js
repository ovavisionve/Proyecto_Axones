/**
 * Modulo Tintas y Solventes - Sistema Axones
 * Fase 2A: Tab Consumo por OT
 */

const Tintas = {
    // =========================================================
    // INICIALIZACION
    // =========================================================
    init: function() {
        console.log('Inicializando modulo Tintas y Solventes');
        this.initConsumo();
        this.initInventario();
        this.initCementerio();
        this.initMezclas();
    },

    // =========================================================
    // TAB 1: CONSUMO POR OT
    // =========================================================
    initConsumo: function() {
        this.renderGridLaminacion();
        this.renderGridSuperficie();
        this.renderGridRestante();
        this.setDefaultDate();
        this.cargarOTs();
        this.setupConsumoEvents();
    },

    setDefaultDate: function() {
        const el = document.getElementById('consumoFecha');
        if (el) el.value = new Date().toISOString().split('T')[0];
    },

    /** Carga OTs desde localStorage al select */
    cargarOTs: function() {
        const select = document.getElementById('consumoOT');
        if (!select) return;

        const ordenes = JSON.parse(localStorage.getItem('axones_ordenes_trabajo') || '[]');
        select.innerHTML = '<option value="">Seleccionar OT...</option>';

        ordenes.forEach(ot => {
            const nombre = ot.nombreOT || ot.id || '';
            const cliente = ot.cliente || '';
            const opt = document.createElement('option');
            opt.value = nombre;
            opt.textContent = nombre + (cliente ? ' - ' + cliente : '');
            opt.dataset.ot = JSON.stringify(ot);
            select.appendChild(opt);
        });
    },

    /** Pre-llena campos al seleccionar OT */
    precargarOT: function(otJson) {
        if (!otJson) return;
        try {
            const ot = JSON.parse(otJson);
            const set = (id, val) => { const el = document.getElementById(id); if (el) el.value = val || ''; };
            set('consumoCliente', ot.cliente);
            set('consumoProducto', ot.producto || ot.nombreProducto);
            set('consumoKg', ot.pedidoKg || ot.kgPedidos);
        } catch(e) { console.error('Error precargando OT:', e); }
    },

    /** Genera grid de tintas de laminacion desde CONFIG */
    renderGridLaminacion: function() {
        const container = document.getElementById('gridLaminacion');
        if (!container) return;

        const tintas = (typeof CONFIG !== 'undefined' && CONFIG.TINTAS_LAMINACION) || [];
        const colorMap = {
            'BLANCO': '#f0f0f0', 'NEGRO': '#333', 'AMARILLO': '#FFD700', 'AMARILLO PROCESO': '#FFD700',
            'CYAN': '#00CED1', 'MAGENTA': '#FF00FF', 'ROJO': '#FF0000', 'AZUL': '#0000FF',
            'NARANJA': '#FF8C00', 'VERDE': '#228B22', 'VIOLETA': '#8B00FF', 'DORADO': '#DAA520',
            'EXTENDER': '#ccc', 'BARNIZ': '#E8D5B7', 'COMP. CERA': '#F5F5DC'
        };

        let html = '<div class="row g-1">';
        tintas.forEach(t => {
            const color = Object.keys(colorMap).find(k => t.nombre.includes(k));
            const hex = color ? colorMap[color] : '#999';
            const textColor = ['BLANCO', 'EXTENDER', 'AMARILLO', 'AMARILLO PROCESO', 'DORADO'].some(c => t.nombre.includes(c)) ? '#333' : '#fff';

            html += `
                <div class="col-4 col-md-3 col-lg-2 mb-1">
                    <label class="tinta-label">
                        <span class="color-dot" style="background:${hex};border:1px solid #ccc;"></span>
                        ${t.nombre}
                    </label>
                    <input type="number" class="form-control form-control-sm tinta-input tinta-lam"
                        id="lam_${t.id}" data-tinta="${t.id}" step="0.01" min="0" value="0">
                </div>`;
        });
        html += `
            <div class="col-12 mt-2">
                <div class="alert alert-light py-2 mb-0 d-flex justify-content-between">
                    <span><strong>Total Laminacion:</strong></span>
                    <span><strong id="totalLaminacion">0.00</strong> Kg</span>
                </div>
            </div>
        </div>`;
        container.innerHTML = html;
    },

    /** Genera grid de tintas de superficie desde CONFIG */
    renderGridSuperficie: function() {
        const container = document.getElementById('gridSuperficie');
        if (!container) return;

        const tintas = (typeof CONFIG !== 'undefined' && CONFIG.TINTAS_SUPERFICIE) || [];
        const colorMap = {
            'BLANCO': '#f0f0f0', 'NEGRO': '#333', 'AMARILLO': '#FFD700',
            'CYAN': '#00CED1', 'MAGENTA': '#FF00FF', 'ROJO': '#FF0000', 'AZUL': '#0000FF',
            'NARANJA': '#FF8C00', 'VERDE': '#228B22', 'DORADO': '#DAA520', 'BARNIZ': '#E8D5B7'
        };

        let html = '<div class="row g-1">';
        tintas.forEach(t => {
            const color = Object.keys(colorMap).find(k => t.nombre.includes(k));
            const hex = color ? colorMap[color] : '#999';

            html += `
                <div class="col-4 col-md-3 col-lg-2 mb-1">
                    <label class="tinta-label">
                        <span class="color-dot" style="background:${hex};border:1px solid #ccc;"></span>
                        ${t.nombre}
                    </label>
                    <input type="number" class="form-control form-control-sm tinta-input tinta-sup"
                        id="sup_${t.id}" data-tinta="${t.id}" step="0.01" min="0" value="0">
                </div>`;
        });
        html += `
            <div class="col-12 mt-2">
                <div class="alert alert-light py-2 mb-0 d-flex justify-content-between">
                    <span><strong>Total Superficie:</strong></span>
                    <span><strong id="totalSuperficie">0.00</strong> Kg</span>
                </div>
            </div>
        </div>`;
        container.innerHTML = html;
    },

    /** Genera grid de restante de tintas */
    renderGridRestante: function() {
        const container = document.getElementById('gridRestante');
        if (!container) return;

        const allTintas = [
            ...(typeof CONFIG !== 'undefined' && CONFIG.TINTAS_LAMINACION || []),
            ...(typeof CONFIG !== 'undefined' && CONFIG.TINTAS_SUPERFICIE || [])
        ];

        let html = '<div class="row g-1">';
        allTintas.forEach(t => {
            html += `
                <div class="col-4 col-md-3 col-lg-2 mb-1">
                    <label class="tinta-label">${t.nombre}</label>
                    <input type="number" class="form-control form-control-sm tinta-input tinta-rest"
                        id="rest_${t.id}" data-tinta="${t.id}" step="0.01" min="0" value="0">
                </div>`;
        });
        html += '</div>';
        container.innerHTML = html;
    },

    /** Event listeners para tab Consumo */
    setupConsumoEvents: function() {
        // Selector de OT -> precarga
        const selectOT = document.getElementById('consumoOT');
        if (selectOT) {
            selectOT.addEventListener('change', () => {
                const opt = selectOT.options[selectOT.selectedIndex];
                if (opt && opt.dataset.ot) this.precargarOT(opt.dataset.ot);
            });
        }

        // Calculos automaticos tintas laminacion
        document.querySelectorAll('#gridLaminacion').forEach(grid => {
            grid.addEventListener('input', () => this.calcularTotales());
        });

        // Calculos automaticos tintas superficie
        document.querySelectorAll('#gridSuperficie').forEach(grid => {
            grid.addEventListener('input', () => this.calcularTotales());
        });

        // Solventes
        document.querySelectorAll('.solvente-input').forEach(input => {
            input.addEventListener('input', () => this.calcularTotales());
        });

        // Restante
        document.querySelectorAll('#gridRestante').forEach(grid => {
            grid.addEventListener('input', () => this.calcularRestante());
        });

        // Boton guardar consumo
        const btnGuardar = document.getElementById('btnGuardarConsumo');
        if (btnGuardar) {
            btnGuardar.addEventListener('click', (e) => {
                e.preventDefault();
                this.guardarConsumo();
            });
        }

        // Boton limpiar
        const btnLimpiar = document.getElementById('btnLimpiar');
        if (btnLimpiar) {
            btnLimpiar.addEventListener('click', () => this.limpiarConsumo());
        }

        // Boton historial
        const btnHistorial = document.getElementById('btnHistorial');
        if (btnHistorial) {
            btnHistorial.addEventListener('click', () => this.mostrarHistorial());
        }

        // Form submit
        const form = document.getElementById('formConsumo');
        if (form) {
            form.addEventListener('submit', (e) => {
                e.preventDefault();
                this.guardarConsumo();
            });
        }
    },

    /** Calcula totales de tintas y solventes */
    calcularTotales: function() {
        let totalLam = 0;
        document.querySelectorAll('.tinta-lam').forEach(input => {
            totalLam += parseFloat(input.value) || 0;
        });
        const elLam = document.getElementById('totalLaminacion');
        if (elLam) elLam.textContent = totalLam.toFixed(2);

        let totalSup = 0;
        document.querySelectorAll('.tinta-sup').forEach(input => {
            totalSup += parseFloat(input.value) || 0;
        });
        const elSup = document.getElementById('totalSuperficie');
        if (elSup) elSup.textContent = totalSup.toFixed(2);

        const alcohol = parseFloat(document.getElementById('solAlcohol')?.value) || 0;
        const metoxi = parseFloat(document.getElementById('solMetoxi')?.value) || 0;
        const acetato = parseFloat(document.getElementById('solAcetato')?.value) || 0;
        const totalSolv = alcohol + metoxi + acetato;

        const elSolv = document.getElementById('totalSolventes');
        if (elSolv) elSolv.textContent = totalSolv.toFixed(2);

        const elSolvR = document.getElementById('totalSolventesResumen');
        if (elSolvR) elSolvR.textContent = totalSolv.toFixed(2);
    },

    /** Calcula total de restante */
    calcularRestante: function() {
        let total = 0;
        document.querySelectorAll('.tinta-rest').forEach(input => {
            total += parseFloat(input.value) || 0;
        });
        const el = document.getElementById('totalRestante');
        if (el) el.textContent = total.toFixed(2);
    },

    /** Recopila datos del formulario de consumo */
    recopilarConsumo: function() {
        const tintasLam = {};
        document.querySelectorAll('.tinta-lam').forEach(input => {
            const val = parseFloat(input.value) || 0;
            if (val > 0) tintasLam[input.dataset.tinta] = val;
        });

        const tintasSup = {};
        document.querySelectorAll('.tinta-sup').forEach(input => {
            const val = parseFloat(input.value) || 0;
            if (val > 0) tintasSup[input.dataset.tinta] = val;
        });

        const restante = {};
        document.querySelectorAll('.tinta-rest').forEach(input => {
            const val = parseFloat(input.value) || 0;
            if (val > 0) restante[input.dataset.tinta] = val;
        });

        return {
            id: 'CON_' + Date.now(),
            timestamp: new Date().toISOString(),
            fecha: document.getElementById('consumoFecha')?.value || '',
            ordenTrabajo: document.getElementById('consumoOT')?.value || '',
            kgProduccion: parseFloat(document.getElementById('consumoKg')?.value) || 0,
            cliente: document.getElementById('consumoCliente')?.value || '',
            producto: document.getElementById('consumoProducto')?.value || '',
            maquina: document.getElementById('consumoMaquina')?.value || '',
            turno: document.getElementById('consumoTurno')?.value || '',
            status: document.getElementById('consumoStatus')?.value || '',
            tintasLaminacion: tintasLam,
            totalLaminacion: parseFloat(document.getElementById('totalLaminacion')?.textContent) || 0,
            tintasSuperficie: tintasSup,
            totalSuperficie: parseFloat(document.getElementById('totalSuperficie')?.textContent) || 0,
            solventes: {
                alcohol: parseFloat(document.getElementById('solAlcohol')?.value) || 0,
                metoxi: parseFloat(document.getElementById('solMetoxi')?.value) || 0,
                acetato: parseFloat(document.getElementById('solAcetato')?.value) || 0,
            },
            totalSolventes: parseFloat(document.getElementById('totalSolventes')?.textContent) || 0,
            restante: restante,
            totalRestante: parseFloat(document.getElementById('totalRestante')?.textContent) || 0,
            observaciones: document.getElementById('consumoObservaciones')?.value || '',
            registradoPor: (typeof Auth !== 'undefined' && Auth.getUser()) ? Auth.getUser().id : 'unknown',
            registradoPorNombre: (typeof Auth !== 'undefined' && Auth.getUser()) ? Auth.getUser().nombre : 'Unknown',
        };
    },

    /** Guarda el consumo (solo registro, no descuenta inventario) */
    guardarConsumo: function() {
        const datos = this.recopilarConsumo();

        if (!datos.fecha || !datos.ordenTrabajo) {
            this.mostrarToast('Fecha y Orden de Trabajo son requeridos', 'warning');
            return;
        }

        // Guardar en localStorage
        const registros = JSON.parse(localStorage.getItem('axones_consumo_tintas') || '[]');
        registros.unshift(datos);
        localStorage.setItem('axones_consumo_tintas', JSON.stringify(registros));

        this.mostrarToast('Consumo registrado correctamente (solo registro, no descuenta inventario)', 'success');
        this.limpiarConsumo();
    },

    /** Limpia el formulario de consumo */
    limpiarConsumo: function() {
        const form = document.getElementById('formConsumo');
        if (form) form.reset();
        this.setDefaultDate();

        document.querySelectorAll('.tinta-lam, .tinta-sup, .solvente-input, .tinta-rest').forEach(input => {
            input.value = '0';
        });

        ['totalLaminacion', 'totalSuperficie', 'totalSolventes', 'totalSolventesResumen', 'totalRestante'].forEach(id => {
            const el = document.getElementById(id);
            if (el) el.textContent = '0.00';
        });
    },

    /** Muestra historial de consumos en modal */
    mostrarHistorial: function() {
        const registros = JSON.parse(localStorage.getItem('axones_consumo_tintas') || '[]');
        const contenido = document.getElementById('historialContenido');
        if (!contenido) return;

        if (registros.length === 0) {
            contenido.innerHTML = '<p class="text-muted text-center py-3">No hay registros de consumo</p>';
        } else {
            let html = '<div class="table-responsive"><table class="table table-sm table-hover">';
            html += '<thead><tr><th>Fecha</th><th>OT</th><th>Cliente</th><th>Tintas Lam</th><th>Tintas Sup</th><th>Solventes</th><th>Restante</th></tr></thead><tbody>';

            registros.slice(0, 30).forEach(reg => {
                html += `<tr>
                    <td>${reg.fecha || '-'}</td>
                    <td>${reg.ordenTrabajo || '-'}</td>
                    <td>${reg.cliente || '-'}</td>
                    <td>${(reg.totalLaminacion || 0).toFixed(2)} Kg</td>
                    <td>${(reg.totalSuperficie || 0).toFixed(2)} Kg</td>
                    <td>${(reg.totalSolventes || 0).toFixed(2)} Lt</td>
                    <td>${(reg.totalRestante || 0).toFixed(2)} Kg</td>
                </tr>`;
            });
            html += '</tbody></table></div>';
            contenido.innerHTML = html;
        }

        const modal = new bootstrap.Modal(document.getElementById('modalHistorial'));
        modal.show();
    },

    // =========================================================
    // TAB 2: INVENTARIO (Fase 2B - placeholder)
    // =========================================================
    initInventario: function() {
        // TODO: Fase 2B
    },

    // =========================================================
    // TAB 3: CEMENTERIO (Fase 2C - placeholder)
    // =========================================================
    initCementerio: function() {
        // TODO: Fase 2C
    },

    // =========================================================
    // TAB 4: MEZCLAS (Fase 2D - placeholder)
    // =========================================================
    initMezclas: function() {
        // TODO: Fase 2D
    },

    // =========================================================
    // UTILIDADES
    // =========================================================
    mostrarToast: function(mensaje, tipo) {
        tipo = tipo || 'info';
        let container = document.querySelector('.toast-container');
        if (!container) {
            container = document.createElement('div');
            container.className = 'toast-container position-fixed bottom-0 end-0 p-3';
            document.body.appendChild(container);
        }

        const bgClass = tipo === 'success' ? 'bg-success' : tipo === 'warning' ? 'bg-warning' : tipo === 'danger' ? 'bg-danger' : 'bg-info';
        const textClass = tipo === 'warning' ? 'text-dark' : 'text-white';

        const html = `
            <div class="toast align-items-center ${bgClass} ${textClass} border-0" role="alert">
                <div class="d-flex">
                    <div class="toast-body">${mensaje}</div>
                    <button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast"></button>
                </div>
            </div>`;

        container.insertAdjacentHTML('beforeend', html);
        const toastEl = container.lastElementChild;
        const toast = new bootstrap.Toast(toastEl, { autohide: true, delay: 5000 });
        toast.show();
        toastEl.addEventListener('hidden.bs.toast', () => toastEl.remove());
    },
};

// Inicializar cuando el DOM este listo
document.addEventListener('DOMContentLoaded', () => {
    if (document.getElementById('tintasTabs') || document.getElementById('formConsumo')) {
        Tintas.init();
    }
});
