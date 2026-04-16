/**
 * Modulo Despacho - Sistema Axones
 * Genera notas de entrega desde paletas de corte.
 * Una OT puede tener multiples registros de corte (varios turnos), y el despacho
 * puede agrupar paletas de varios corte para generar una sola nota de entrega.
 *
 * Almacenamiento:
 *   - sync_store key 'axones_notas_despacho' (historial)
 *   - sync_store key 'axones_movimientos_almacen' (movimientos)
 */

const Despacho = {
    ordenes: [],
    cortes: [],  // Registros de produccion_corte
    notas: [],
    _otSeleccionada: null,

    init: async function() {
        if (typeof AxonesDB !== 'undefined' && !AxonesDB.isReady()) {
            await AxonesDB.init();
        }
        await this.cargarDatos();
        this.setupEvents();

        window.addEventListener('axones-sync', async () => {
            await this.cargarDatos();
        });
    },

    cargarDatos: async function() {
        try {
            if (typeof AxonesDB !== 'undefined' && AxonesDB.isReady()) {
                // Cargar OTs
                this.ordenes = await AxonesDB.ordenesHelper.cargar() || [];
                // Cargar registros de corte
                const { data: cortes } = await AxonesDB.client.from('produccion_corte').select('*');
                this.cortes = cortes || [];
                // Cargar historial
                const { data: notas } = await AxonesDB.client.from('sync_store')
                    .select('value').eq('key', 'axones_notas_despacho').maybeSingle();
                this.notas = notas?.value ? JSON.parse(notas.value) : [];
            }
        } catch(e) { console.warn('Despacho: Error cargando datos:', e); }

        this.renderPendientes();
        this.renderHistorial();
    },

    setupEvents: function() {
        document.getElementById('checkAllPaletas')?.addEventListener('change', (e) => {
            document.querySelectorAll('.d-paleta-check').forEach(cb => cb.checked = e.target.checked);
            this.calcularTotales();
        });
        document.getElementById('tablaPaletasDespacho')?.addEventListener('change', (e) => {
            if (e.target.classList.contains('d-paleta-check')) this.calcularTotales();
        });
        document.getElementById('buscarHistorial')?.addEventListener('input', () => this.renderHistorial());
    },

    /** Re-renderiza paletas usando el modo seleccionado (original / unificada) */
    _renderPaletas: function(ot) {
        const numOT = ot.numeroOrden || ot.nombreOT;
        let paletas = this.paletasDeOT(numOT);

        const modo = document.getElementById('dModoEmpaque')?.value || 'original';
        const bobinasPorPaleta = parseInt(document.getElementById('dBobinasPorPaleta')?.value) || 36;

        if (modo === 'unificada' && paletas.length > 0) {
            paletas = this.unificarPaletas(paletas, bobinasPorPaleta);
        }

        const tbody = document.getElementById('tablaPaletasDespacho');
        if (!tbody) return;

        if (paletas.length === 0) {
            tbody.innerHTML = '<tr><td colspan="5" class="text-center text-warning py-2">Esta OT no tiene paletas registradas en corte</td></tr>';
            this.calcularTotales();
            return;
        }

        tbody.innerHTML = paletas.map((p, idx) => `
            <tr data-idx="${idx}" data-corte-id="${p.corteId || ''}">
                <td class="text-center"><input type="checkbox" class="form-check-input d-paleta-check" checked></td>
                <td class="fw-bold text-center">${p.numero}</td>
                <td><input type="number" class="form-control form-control-sm d-bob" value="${p.totalBobinas}" onchange="Despacho.calcularTotales()"></td>
                <td><input type="number" class="form-control form-control-sm d-kg" value="${p.pesoTotal.toFixed(2)}" step="0.01" onchange="Despacho.calcularTotales()"></td>
                <td><small class="text-muted">${modo === 'unificada' ? 'Unificada (' + p.totalBobinas + ' bob)' : 'Corte ' + (p.corteFecha || '') + ' - ' + (p.corteTurno || '')}</small></td>
            </tr>`).join('');

        this.calcularTotales();
    },

    /** Boton "Aplicar modo": re-renderiza paletas con el modo nuevo */
    recargarPaletas: function() {
        if (!this._otSeleccionada) return;
        this._renderPaletas(this._otSeleccionada);
    },

    /**
     * Unifica un array de paletas en grupos de N bobinas cada uno (lista de empaque).
     * Ejemplo: si hay 5 paletas con [10, 5, 36, 12, 8] bobinas y N=36,
     * devuelve paletas de exactamente 36 bobinas cada una hasta agotar.
     */
    unificarPaletas: function(paletas, bobinasPorPaleta) {
        // Aplanar todas las bobinas de todas las paletas
        const todasBobinas = [];
        paletas.forEach(p => {
            (p.bobinas || []).forEach(b => {
                if (b && (b.peso || b.kg || 0) > 0) {
                    todasBobinas.push({ ...b, _origenCorte: p.corteId });
                }
            });
            // Si no hay array bobinas[], expandir por contador
            if (!p.bobinas || p.bobinas.length === 0) {
                const numBob = p.totalBobinas || 0;
                const pesoProm = numBob > 0 ? (p.pesoTotal || 0) / numBob : 0;
                for (let i = 0; i < numBob; i++) {
                    todasBobinas.push({ peso: pesoProm, _origenCorte: p.corteId });
                }
            }
        });

        // Agrupar en paletas de N bobinas
        const result = [];
        let paletaActual = { numero: 1, bobinas: [], totalBobinas: 0, pesoTotal: 0, corteId: null };
        todasBobinas.forEach((bob, idx) => {
            paletaActual.bobinas.push(bob);
            paletaActual.totalBobinas++;
            paletaActual.pesoTotal += parseFloat(bob.peso || bob.kg) || 0;
            if (!paletaActual.corteId) paletaActual.corteId = bob._origenCorte;

            if (paletaActual.totalBobinas >= bobinasPorPaleta || idx === todasBobinas.length - 1) {
                result.push(paletaActual);
                paletaActual = { numero: result.length + 1, bobinas: [], totalBobinas: 0, pesoTotal: 0, corteId: null };
            }
        });

        return result;
    },

    /** Extrae paletas de todos los registros de corte para una OT */
    paletasDeOT: function(numOT) {
        const paletas = [];
        this.cortes.filter(c => c.numero_ot === numOT).forEach(reg => {
            let pals = reg.paletas || [];
            if (typeof pals === 'string') { try { pals = JSON.parse(pals); } catch(e) { pals = []; } }
            if (pals.length === 0 && reg.observaciones) {
                try {
                    const obs = JSON.parse(reg.observaciones);
                    pals = obs.paletas || [];
                } catch(e) {}
            }
            pals.forEach((p, idx) => {
                const numBob = p.totalBobinas || p.bobinas?.length || 0;
                const peso = p.pesoTotal || 0;
                if (peso > 0 || numBob > 0) {
                    paletas.push({
                        corteId: reg.id,
                        corteFecha: reg.fecha,
                        corteTurno: reg.turno,
                        numero: p.numero || idx + 1,
                        totalBobinas: numBob,
                        pesoTotal: peso,
                        bobinas: p.bobinas || []
                    });
                }
            });
        });
        return paletas;
    },

    /** Calcula Kg ya despachados para una OT */
    kgDespachados: function(numOT) {
        return this.notas
            .filter(n => n.otNumero === numOT)
            .reduce((s, n) => s + (parseFloat(n.totalKg) || 0), 0);
    },

    renderPendientes: function() {
        const tbody = document.getElementById('tablaOTsDespacho');
        if (!tbody) return;

        // Filtrar OTs que tienen registros de corte
        const otsConCorte = this.ordenes.filter(o => {
            const numOT = o.numeroOrden || o.nombreOT || '';
            return this.cortes.some(c => c.numero_ot === numOT);
        });

        document.getElementById('countPendientes').textContent = otsConCorte.length;

        if (otsConCorte.length === 0) {
            tbody.innerHTML = '<tr><td colspan="8" class="text-center text-muted py-4">No hay OTs con paletas listas para despacho</td></tr>';
            return;
        }

        tbody.innerHTML = otsConCorte.map(o => {
            const numOT = o.numeroOrden || o.nombreOT;
            const paletas = this.paletasDeOT(numOT);
            const kgCortados = paletas.reduce((s, p) => s + p.pesoTotal, 0);
            const kgDesp = this.kgDespachados(numOT);
            const pedido = parseFloat(o.pedidoKg) || 0;

            return `<tr>
                <td><strong>${numOT}</strong></td>
                <td>${o.cliente || '-'}</td>
                <td><small>${o.producto || '-'}</small></td>
                <td class="text-end">${pedido} Kg</td>
                <td class="text-end text-success">${kgCortados.toFixed(2)} Kg</td>
                <td class="text-end text-info">${kgDesp.toFixed(2)} Kg</td>
                <td class="text-center"><span class="badge bg-primary">${paletas.length}</span></td>
                <td class="text-center">
                    <button class="btn btn-sm btn-success" onclick="Despacho.iniciarDespacho('${o.id}')">
                        <i class="bi bi-box-arrow-right me-1"></i>Despachar
                    </button>
                </td>
            </tr>`;
        }).join('');
    },

    iniciarDespacho: async function(otId) {
        const ot = this.ordenes.find(o => o.id === otId);
        if (!ot) return;
        this._otSeleccionada = ot;

        const form = document.getElementById('formDespacho');
        if (form) form.style.display = 'block';

        document.getElementById('dOTNumero').textContent = ot.numeroOrden || ot.nombreOT || '';

        // Auto-llenar datos cliente
        document.getElementById('dCliente').value = ot.cliente || '';
        document.getElementById('dClienteRif').value = ot.clienteRif || ot.rifCliente || '';
        document.getElementById('dClienteTelefono').value = '';
        document.getElementById('dDireccion').value = '';

        // Buscar datos cliente en Supabase
        if (ot.cliente && AxonesDB.isReady()) {
            try {
                const { data } = await AxonesDB.client.from('clientes')
                    .select('*').ilike('nombre', `%${ot.cliente}%`).limit(1);
                if (data && data[0]) {
                    document.getElementById('dClienteRif').value = data[0].rif || '';
                    document.getElementById('dClienteTelefono').value = data[0].telefono || '';
                    document.getElementById('dDireccion').value = data[0].direccion || '';
                }
            } catch(e) {}
        }

        // Cargar paletas (usando modo seleccionado)
        this._renderPaletas(ot);

        document.getElementById('dFecha').value = new Date().toISOString().split('T')[0];
        document.getElementById('dCorrelativo').textContent = this.generarCorrelativo() + ' (preview)';

        // Limpiar campos chofer
        ['dChoferNombre', 'dChoferCedula', 'dPlaca', 'dTransporte',
         'dAutorizado', 'dDespachado', 'dVerificado', 'dObservaciones'].forEach(id => {
            const el = document.getElementById(id); if (el) el.value = '';
        });

        this.calcularTotales();
        form.scrollIntoView({ behavior: 'smooth', block: 'start' });
    },

    calcularTotales: function() {
        let bob = 0, kg = 0;
        document.querySelectorAll('#tablaPaletasDespacho tr[data-idx]').forEach(tr => {
            const check = tr.querySelector('.d-paleta-check');
            if (check && !check.checked) return;
            bob += parseInt(tr.querySelector('.d-bob')?.value) || 0;
            kg += parseFloat(tr.querySelector('.d-kg')?.value) || 0;
        });
        document.getElementById('dTotalBobinas').textContent = bob;
        document.getElementById('dTotalKg').textContent = kg.toFixed(2);
    },

    generarCorrelativo: function() {
        const year = new Date().getFullYear();
        const mismas = this.notas.filter(n => n.correlativo && n.correlativo.startsWith(`ND-${year}-`));
        return `ND-${year}-${String(mismas.length + 1).padStart(4, '0')}`;
    },

    cancelar: function() {
        const form = document.getElementById('formDespacho');
        if (form) form.style.display = 'none';
        this._otSeleccionada = null;
    },

    guardar: async function(imprimir) {
        const ot = this._otSeleccionada;
        if (!ot) { alert('No hay OT seleccionada'); return; }

        const direccion = document.getElementById('dDireccion')?.value?.trim();
        const choferNombre = document.getElementById('dChoferNombre')?.value?.trim();
        const choferCedula = document.getElementById('dChoferCedula')?.value?.trim();

        if (!direccion) { alert('La direccion del cliente es obligatoria'); return; }
        if (!choferNombre) { alert('El nombre del chofer es obligatorio'); return; }
        if (!choferCedula) { alert('La cedula del chofer es obligatoria'); return; }

        // Recopilar paletas seleccionadas
        const paletas = [];
        document.querySelectorAll('#tablaPaletasDespacho tr[data-idx]').forEach(tr => {
            const check = tr.querySelector('.d-paleta-check');
            if (check && !check.checked) return;
            const bob = parseInt(tr.querySelector('.d-bob')?.value) || 0;
            const kg = parseFloat(tr.querySelector('.d-kg')?.value) || 0;
            if (bob > 0 || kg > 0) {
                paletas.push({
                    numero: tr.cells[1].textContent,
                    bobinas: bob,
                    kg,
                    origenCorte: tr.dataset.corteId || ''
                });
            }
        });

        if (paletas.length === 0) { alert('Seleccione al menos una paleta para despachar'); return; }

        const totalBob = paletas.reduce((s, p) => s + p.bobinas, 0);
        const totalKg = paletas.reduce((s, p) => s + p.kg, 0);

        const nota = {
            id: Date.now().toString(36) + Math.random().toString(36).substr(2, 5),
            correlativo: this.generarCorrelativo(),
            fecha: document.getElementById('dFecha')?.value || new Date().toISOString().split('T')[0],
            otId: ot.id,
            otNumero: ot.numeroOrden || ot.nombreOT || '',
            cliente: document.getElementById('dCliente')?.value || '',
            clienteRif: document.getElementById('dClienteRif')?.value || '',
            clienteTelefono: document.getElementById('dClienteTelefono')?.value || '',
            direccion,
            producto: ot.producto || '',
            paletas,
            totalBobinas: totalBob,
            totalKg,
            chofer: { nombre: choferNombre, cedula: choferCedula },
            placa: document.getElementById('dPlaca')?.value || '',
            transporte: document.getElementById('dTransporte')?.value || '',
            autorizadoPor: document.getElementById('dAutorizado')?.value || '',
            despachadoPor: document.getElementById('dDespachado')?.value || '',
            verificadoPor: document.getElementById('dVerificado')?.value || '',
            observaciones: document.getElementById('dObservaciones')?.value || '',
            timestamp: new Date().toISOString(),
        };

        this.notas.unshift(nota);
        await this.guardarNotas();

        // Registrar movimiento
        await this.registrarMovimiento(nota);

        alert(`Nota ${nota.correlativo} guardada`);

        if (imprimir) this.imprimirNota(nota);

        this.cancelar();
        await this.cargarDatos();
    },

    guardarNotas: async function() {
        const json = JSON.stringify(this.notas);
        localStorage.setItem('axones_notas_despacho', json);
        try {
            if (typeof AxonesDB !== 'undefined' && AxonesDB.isReady()) {
                await AxonesDB.client.from('sync_store').upsert({
                    key: 'axones_notas_despacho',
                    value: json,
                    updated_at: new Date().toISOString()
                }, { onConflict: 'key' });
            }
        } catch(e) { console.error('Despacho: Error guardando:', e); }
    },

    registrarMovimiento: async function(nota) {
        try {
            let movs = [];
            if (AxonesDB.isReady()) {
                const { data } = await AxonesDB.client.from('sync_store')
                    .select('value').eq('key', 'axones_movimientos_almacen').maybeSingle();
                movs = data?.value ? JSON.parse(data.value) : [];
            }
            movs.unshift({
                id: 'mov-' + nota.id,
                fecha: nota.fecha,
                tipo: 'despacho',
                referencia: nota.correlativo,
                ot: nota.otNumero,
                cliente: nota.cliente,
                cantidad: nota.totalKg,
                unidad: 'Kg',
                descripcion: `Despacho OT ${nota.otNumero} - ${nota.totalBobinas} bobinas`,
                timestamp: nota.timestamp,
            });
            if (movs.length > 1000) movs = movs.slice(0, 1000);
            const json = JSON.stringify(movs);
            localStorage.setItem('axones_movimientos_almacen', json);
            if (AxonesDB.isReady()) {
                await AxonesDB.client.from('sync_store').upsert({
                    key: 'axones_movimientos_almacen',
                    value: json,
                    updated_at: new Date().toISOString()
                }, { onConflict: 'key' });
            }
        } catch(e) { console.error('Despacho: Error registrando movimiento:', e); }
    },

    renderHistorial: function() {
        const tbody = document.getElementById('tablaHistorial');
        if (!tbody) return;
        const busq = (document.getElementById('buscarHistorial')?.value || '').toLowerCase();
        let filtradas = this.notas;
        if (busq) filtradas = filtradas.filter(n =>
            (n.correlativo || '').toLowerCase().includes(busq) ||
            (n.otNumero || '').toLowerCase().includes(busq) ||
            (n.cliente || '').toLowerCase().includes(busq)
        );

        if (filtradas.length === 0) {
            tbody.innerHTML = '<tr><td colspan="8" class="text-center text-muted py-4">No hay despachos registrados</td></tr>';
            return;
        }

        tbody.innerHTML = filtradas.slice(0, 100).map(n => `
            <tr>
                <td><strong>${n.correlativo}</strong></td>
                <td>${n.fecha || '-'}</td>
                <td>${n.otNumero || '-'}</td>
                <td><small>${n.cliente || '-'}</small></td>
                <td class="text-end">${n.totalBobinas || 0}</td>
                <td class="text-end fw-bold">${(n.totalKg || 0).toFixed(2)}</td>
                <td><small>${n.chofer?.nombre || '-'}</small></td>
                <td class="text-center">
                    <button class="btn btn-sm btn-outline-primary" onclick='Despacho.imprimirNota(${JSON.stringify(n).replace(/'/g,"&apos;")})'>
                        <i class="bi bi-printer"></i>
                    </button>
                </td>
            </tr>`).join('');
    },

    imprimirNota: function(nota) {
        const paletasHtml = (nota.paletas || []).map(p =>
            `<tr><td class="text-center">${p.numero}</td><td class="text-end">${p.bobinas}</td><td class="text-end">${p.kg.toFixed(2)}</td></tr>`
        ).join('');

        const w = window.open('', '_blank');
        w.document.write(`
            <html><head><title>Nota de Despacho ${nota.correlativo}</title>
            <style>
                body { font-family: Arial; padding: 20px; max-width: 800px; margin: 0 auto; }
                h1 { color: #0d6efd; text-align: center; margin-bottom: 5px; }
                .empresa { text-align: center; margin-bottom: 20px; font-size: 12px; }
                .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin: 15px 0; }
                .info-grid div { padding: 4px 0; }
                table { width: 100%; border-collapse: collapse; margin: 15px 0; }
                th, td { border: 1px solid #333; padding: 8px; }
                th { background: #e9ecef; }
                .totales { background: #d1e7dd; font-weight: bold; }
                .firmas { margin-top: 60px; display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 40px; }
                .firma { text-align: center; }
                .firma hr { margin-bottom: 5px; }
                .badge { background: #ffc107; color: #000; padding: 3px 10px; border-radius: 4px; }
            </style></head><body>
                <h1>NOTA DE DESPACHO</h1>
                <div class="empresa">
                    <strong>INVERSIONES AXONES 2008, C.A.</strong><br>
                    RIF: J-40081341-7 | Turmero, Aragua | Tel: 0424-316.96.12
                </div>
                <div class="info-grid">
                    <div><strong>N° ND:</strong> <span class="badge">${nota.correlativo}</span></div>
                    <div><strong>Fecha:</strong> ${nota.fecha}</div>
                    <div><strong>OT:</strong> ${nota.otNumero}</div>
                    <div><strong>Producto:</strong> ${nota.producto || '-'}</div>
                </div>
                <h3>Cliente</h3>
                <div class="info-grid">
                    <div><strong>Razon Social:</strong> ${nota.cliente}</div>
                    <div><strong>RIF:</strong> ${nota.clienteRif || '-'}</div>
                    <div><strong>Telefono:</strong> ${nota.clienteTelefono || '-'}</div>
                    <div><strong>Direccion:</strong> ${nota.direccion}</div>
                </div>
                <h3>Paletas Despachadas</h3>
                <table>
                    <thead><tr><th>Paleta</th><th>N° Bobinas</th><th>Kg</th></tr></thead>
                    <tbody>${paletasHtml}</tbody>
                    <tfoot><tr class="totales"><td>TOTALES</td><td class="text-end">${nota.totalBobinas}</td><td class="text-end">${nota.totalKg.toFixed(2)}</td></tr></tfoot>
                </table>
                <h3>Transporte</h3>
                <div class="info-grid">
                    <div><strong>Chofer:</strong> ${nota.chofer?.nombre || '-'}</div>
                    <div><strong>Cedula:</strong> ${nota.chofer?.cedula || '-'}</div>
                    <div><strong>Placa:</strong> ${nota.placa || '-'}</div>
                    <div><strong>Empresa:</strong> ${nota.transporte || '-'}</div>
                </div>
                ${nota.observaciones ? `<p><strong>Observaciones:</strong> ${nota.observaciones}</p>` : ''}
                <div class="firmas">
                    <div class="firma"><hr><small>Autorizado por<br>${nota.autorizadoPor || ''}</small></div>
                    <div class="firma"><hr><small>Despachado por<br>${nota.despachadoPor || ''}</small></div>
                    <div class="firma"><hr><small>Recibido por<br>(Chofer / Cliente)</small></div>
                </div>
            </body></html>`);
        w.document.close();
        setTimeout(() => w.print(), 500);
    },
};

document.addEventListener('DOMContentLoaded', () => {
    setTimeout(() => Despacho.init(), 300);
});
