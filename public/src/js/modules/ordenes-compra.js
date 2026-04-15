/**
 * Modulo Ordenes de Compra - Sistema Axones
 * Material solicitado a proveedores, casado con OT o standalone
 * Almacenamiento: sync_store key 'axones_ordenes_compra'
 */

const OrdenesCompra = {
    ocs: [],
    proveedores: [],
    ordenes: [],
    SYNC_KEY: 'axones_ordenes_compra',

    init: async function() {
        if (typeof AxonesDB !== 'undefined' && !AxonesDB.isReady()) {
            await AxonesDB.init();
        }
        await this.cargar();
        await this.cargarProveedores();
        await this.cargarOTs();
        this.setupEvents();
        this.render();

        window.addEventListener('axones-sync', async () => {
            await this.cargar();
            this.render();
        });
    },

    cargar: async function() {
        try {
            if (typeof AxonesDB !== 'undefined' && AxonesDB.isReady()) {
                const { data } = await AxonesDB.client.from('sync_store')
                    .select('value').eq('key', this.SYNC_KEY).maybeSingle();
                this.ocs = data?.value ? JSON.parse(data.value) : [];
            }
            if (this.ocs.length === 0) {
                this.ocs = JSON.parse(localStorage.getItem(this.SYNC_KEY) || '[]');
            }
        } catch(e) {
            console.warn('OC: Error cargando:', e);
            this.ocs = JSON.parse(localStorage.getItem(this.SYNC_KEY) || '[]');
        }
    },

    cargarProveedores: async function() {
        try {
            if (typeof AxonesDB !== 'undefined' && AxonesDB.isReady()) {
                const { data } = await AxonesDB.client.from('proveedores').select('nombre, rif').eq('activo', true);
                this.proveedores = data || [];
            }
        } catch(e) { console.warn('OC: Error cargando proveedores:', e); }

        const dl = document.getElementById('dlProveedoresOC');
        if (dl) {
            dl.innerHTML = this.proveedores.map(p =>
                `<option value="${p.nombre}${p.rif ? ' (' + p.rif + ')' : ''}">`
            ).join('');
        }
    },

    cargarOTs: async function() {
        try {
            if (typeof AxonesDB !== 'undefined' && AxonesDB.isReady() && AxonesDB.ordenesHelper) {
                this.ordenes = await AxonesDB.ordenesHelper.cargar() || [];
            }
        } catch(e) { console.warn('OC: Error cargando OTs:', e); }

        const dl = document.getElementById('dlOTsOC');
        if (dl) {
            dl.innerHTML = this.ordenes
                .filter(o => o.estadoOrden !== 'cancelada')
                .map(o => `<option value="${o.numeroOrden}">${o.numeroOrden} - ${o.cliente || ''} - ${o.producto || ''}</option>`)
                .join('');
        }
    },

    guardarTodas: async function() {
        const json = JSON.stringify(this.ocs);
        localStorage.setItem(this.SYNC_KEY, json);
        try {
            if (typeof AxonesDB !== 'undefined' && AxonesDB.isReady()) {
                await AxonesDB.client.from('sync_store').upsert({
                    key: this.SYNC_KEY,
                    value: json,
                    updated_at: new Date().toISOString()
                }, { onConflict: 'key' });
            }
        } catch(e) { console.error('OC: Error guardando:', e); }
    },

    setupEvents: function() {
        document.getElementById('buscarOC')?.addEventListener('input', () => this.render());
        document.getElementById('filtroEstado')?.addEventListener('change', () => this.render());
        document.getElementById('ocSinOT')?.addEventListener('change', (e) => {
            const sec = document.getElementById('seccionMotivoSinOT');
            const otInput = document.getElementById('ocOT');
            if (e.target.checked) {
                sec.style.display = 'block';
                if (otInput) { otInput.value = ''; otInput.disabled = true; }
            } else {
                sec.style.display = 'none';
                if (otInput) otInput.disabled = false;
            }
        });
    },

    generarNumero: function() {
        const year = new Date().getFullYear();
        const mismas = this.ocs.filter(o => o.numero && o.numero.startsWith(`OC-${year}-`));
        return `OC-${year}-${String(mismas.length + 1).padStart(4, '0')}`;
    },

    render: function() {
        const tbody = document.getElementById('tablaOC');
        if (!tbody) return;

        const busq = (document.getElementById('buscarOC')?.value || '').toLowerCase();
        const filtroEst = document.getElementById('filtroEstado')?.value || '';

        let filtradas = this.ocs;
        if (filtroEst) filtradas = filtradas.filter(o => o.estado === filtroEst);
        if (busq) filtradas = filtradas.filter(o =>
            (o.numero || '').toLowerCase().includes(busq) ||
            (o.proveedor || '').toLowerCase().includes(busq) ||
            (o.ot || '').toLowerCase().includes(busq)
        );

        filtradas.sort((a, b) => (b.numero || '').localeCompare(a.numero || ''));

        // Stats
        document.getElementById('totalOC').textContent = this.ocs.length;
        document.getElementById('pendientesOC').textContent = this.ocs.filter(o => o.estado === 'pendiente').length;
        document.getElementById('parcialesOC').textContent = this.ocs.filter(o => o.estado === 'parcial').length;
        document.getElementById('recibidasOC').textContent = this.ocs.filter(o => o.estado === 'recibida').length;

        if (filtradas.length === 0) {
            tbody.innerHTML = `<tr><td colspan="8" class="text-center py-4 text-muted">
                ${busq || filtroEst ? 'No se encontraron ordenes de compra' : 'No hay OCs registradas. Haz clic en "Nueva OC" para crear.'}
            </td></tr>`;
            return;
        }

        const badge = {
            pendiente: 'bg-warning text-dark',
            parcial: 'bg-info',
            recibida: 'bg-success',
            cancelada: 'bg-danger'
        };

        tbody.innerHTML = filtradas.map(o => {
            const totalEstimado = (o.items || []).reduce((s, i) => s + ((i.cantidad || 0) * (i.precioUnitario || 0)), 0);
            return `<tr>
                <td><strong>${o.numero || '-'}</strong></td>
                <td>${o.fecha || '-'}</td>
                <td>${o.proveedor || '-'}</td>
                <td>${o.ot || (o.sinOT ? '<span class="badge bg-secondary">Sin OT</span>' : '-')}</td>
                <td><small>${(o.items || []).length} item(s)</small></td>
                <td class="text-end">${totalEstimado > 0 ? totalEstimado.toFixed(2) : '-'}</td>
                <td class="text-center"><span class="badge ${badge[o.estado] || 'bg-secondary'}">${o.estado}</span></td>
                <td class="text-center">
                    <button class="btn btn-sm btn-outline-primary" onclick="OrdenesCompra.editar('${o.id}')" title="Editar">
                        <i class="bi bi-pencil"></i>
                    </button>
                    <button class="btn btn-sm btn-outline-secondary" onclick="OrdenesCompra.editar('${o.id}'); setTimeout(() => OrdenesCompra.imprimir(), 300);" title="Imprimir">
                        <i class="bi bi-printer"></i>
                    </button>
                    <button class="btn btn-sm btn-outline-danger" onclick="OrdenesCompra.eliminar('${o.id}')" title="Eliminar">
                        <i class="bi bi-trash"></i>
                    </button>
                </td>
            </tr>`;
        }).join('');
    },

    mostrarModal: function(oc) {
        const titulo = document.getElementById('modalOCTitulo');
        titulo.innerHTML = oc
            ? '<i class="bi bi-pencil me-2"></i>Editar Orden de Compra'
            : '<i class="bi bi-cart-plus me-2"></i>Nueva Orden de Compra';

        document.getElementById('ocId').value = oc?.id || '';
        document.getElementById('ocNumero').value = oc?.numero || this.generarNumero();
        document.getElementById('ocFecha').value = oc?.fecha || new Date().toISOString().split('T')[0];
        document.getElementById('ocFechaEntrega').value = oc?.fechaEntrega || '';
        document.getElementById('ocEstado').value = oc?.estado || 'pendiente';
        document.getElementById('ocProveedor').value = oc?.proveedor || '';
        document.getElementById('ocOT').value = oc?.ot || '';
        document.getElementById('ocSinOT').checked = oc?.sinOT || false;
        document.getElementById('ocMotivoSinOT').value = oc?.motivoSinOT || '';
        document.getElementById('seccionMotivoSinOT').style.display = oc?.sinOT ? 'block' : 'none';
        document.getElementById('ocOT').disabled = oc?.sinOT || false;
        document.getElementById('ocObservaciones').value = oc?.observaciones || '';

        // Items
        const body = document.getElementById('bodyItemsOC');
        body.innerHTML = '';
        (oc?.items || []).forEach(item => this.agregarItem(item));
        if ((oc?.items || []).length === 0) this.agregarItem();

        this.calcularTotal();
        new bootstrap.Modal(document.getElementById('modalOC')).show();
    },

    agregarItem: function(item) {
        const body = document.getElementById('bodyItemsOC');
        if (!body) return;
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>
                <select class="form-select form-select-sm oc-tipo">
                    <option value="sustrato" ${item?.tipo === 'sustrato' ? 'selected' : ''}>Sustrato</option>
                    <option value="tinta" ${item?.tipo === 'tinta' ? 'selected' : ''}>Tinta</option>
                    <option value="quimico" ${item?.tipo === 'quimico' ? 'selected' : ''}>Quimico</option>
                    <option value="miscelaneo" ${item?.tipo === 'miscelaneo' ? 'selected' : ''}>Miscelaneo</option>
                    <option value="otro" ${item?.tipo === 'otro' ? 'selected' : ''}>Otro</option>
                </select>
            </td>
            <td><input type="text" class="form-control form-control-sm oc-desc" value="${item?.descripcion || ''}" placeholder="Ej: BOPP Normal 20u x 610mm"></td>
            <td><input type="number" class="form-control form-control-sm oc-cant" min="0" step="0.01" value="${item?.cantidad || ''}" onchange="OrdenesCompra.calcularTotal()"></td>
            <td>
                <select class="form-select form-select-sm oc-unidad">
                    <option value="Kg" ${item?.unidad === 'Kg' ? 'selected' : ''}>Kg</option>
                    <option value="Lt" ${item?.unidad === 'Lt' ? 'selected' : ''}>Lt</option>
                    <option value="Unidad" ${item?.unidad === 'Unidad' ? 'selected' : ''}>Unidad</option>
                    <option value="Rollo" ${item?.unidad === 'Rollo' ? 'selected' : ''}>Rollo</option>
                    <option value="Metro" ${item?.unidad === 'Metro' ? 'selected' : ''}>Metro</option>
                </select>
            </td>
            <td><input type="number" class="form-control form-control-sm oc-precio" min="0" step="0.01" value="${item?.precioUnitario || ''}" onchange="OrdenesCompra.calcularTotal()"></td>
            <td class="text-end oc-total">0.00</td>
            <td class="text-center"><button type="button" class="btn btn-sm btn-outline-danger" onclick="this.closest('tr').remove();OrdenesCompra.calcularTotal();"><i class="bi bi-x"></i></button></td>
        `;
        body.appendChild(tr);
        this.calcularTotal();
    },

    calcularTotal: function() {
        let total = 0;
        document.querySelectorAll('#bodyItemsOC tr').forEach(tr => {
            const cant = parseFloat(tr.querySelector('.oc-cant')?.value) || 0;
            const precio = parseFloat(tr.querySelector('.oc-precio')?.value) || 0;
            const subtotal = cant * precio;
            const totalCell = tr.querySelector('.oc-total');
            if (totalCell) totalCell.textContent = subtotal.toFixed(2);
            total += subtotal;
        });
        const totalEl = document.getElementById('ocTotalEstimado');
        if (totalEl) totalEl.textContent = total.toFixed(2);
    },

    guardar: async function() {
        const proveedor = document.getElementById('ocProveedor')?.value?.trim();
        if (!proveedor) { alert('El proveedor es obligatorio'); return; }

        const sinOT = document.getElementById('ocSinOT')?.checked;
        const motivoSinOT = document.getElementById('ocMotivoSinOT')?.value?.trim();
        if (sinOT && !motivoSinOT) { alert('Indique el motivo cuando no hay OT asociada'); return; }

        const ot = sinOT ? '' : document.getElementById('ocOT')?.value?.trim();
        if (!sinOT && !ot) { alert('Seleccione la OT o marque "Sin OT"'); return; }

        // Recopilar items
        const items = [];
        document.querySelectorAll('#bodyItemsOC tr').forEach(tr => {
            const desc = tr.querySelector('.oc-desc')?.value?.trim();
            const cant = parseFloat(tr.querySelector('.oc-cant')?.value) || 0;
            if (desc && cant > 0) {
                items.push({
                    tipo: tr.querySelector('.oc-tipo')?.value || 'otro',
                    descripcion: desc,
                    cantidad: cant,
                    unidad: tr.querySelector('.oc-unidad')?.value || 'Kg',
                    precioUnitario: parseFloat(tr.querySelector('.oc-precio')?.value) || 0,
                    cantidadRecibida: 0,
                });
            }
        });
        if (items.length === 0) { alert('Agregue al menos un item'); return; }

        const id = document.getElementById('ocId')?.value;
        const datos = {
            id: id || Date.now().toString(36) + Math.random().toString(36).substr(2, 5),
            numero: document.getElementById('ocNumero')?.value || this.generarNumero(),
            fecha: document.getElementById('ocFecha')?.value || new Date().toISOString().split('T')[0],
            fechaEntrega: document.getElementById('ocFechaEntrega')?.value || '',
            estado: document.getElementById('ocEstado')?.value || 'pendiente',
            proveedor,
            ot,
            sinOT,
            motivoSinOT: sinOT ? motivoSinOT : '',
            items,
            observaciones: document.getElementById('ocObservaciones')?.value?.trim() || '',
            updated_at: new Date().toISOString(),
        };

        if (id) {
            const idx = this.ocs.findIndex(o => o.id === id);
            if (idx >= 0) {
                datos.created_at = this.ocs[idx].created_at;
                this.ocs[idx] = datos;
            }
        } else {
            datos.created_at = new Date().toISOString();
            this.ocs.push(datos);
        }

        await this.guardarTodas();
        this.render();
        bootstrap.Modal.getInstance(document.getElementById('modalOC'))?.hide();
        if (typeof showToast === 'function') showToast(`OC ${datos.numero} guardada`, 'success');
        else alert(`OC ${datos.numero} guardada`);
    },

    editar: function(id) {
        const oc = this.ocs.find(o => o.id === id);
        if (oc) this.mostrarModal(oc);
    },

    eliminar: async function(id) {
        if (!confirm('Eliminar esta orden de compra?')) return;
        this.ocs = this.ocs.filter(o => o.id !== id);
        await this.guardarTodas();
        this.render();
    },

    imprimir: function() {
        const numero = document.getElementById('ocNumero')?.value;
        const fecha = document.getElementById('ocFecha')?.value;
        const proveedor = document.getElementById('ocProveedor')?.value;
        const ot = document.getElementById('ocOT')?.value || 'Sin OT';
        const observaciones = document.getElementById('ocObservaciones')?.value || '';

        let itemsHtml = '';
        let total = 0;
        document.querySelectorAll('#bodyItemsOC tr').forEach(tr => {
            const desc = tr.querySelector('.oc-desc')?.value || '';
            const cant = parseFloat(tr.querySelector('.oc-cant')?.value) || 0;
            const unidad = tr.querySelector('.oc-unidad')?.value || '';
            const precio = parseFloat(tr.querySelector('.oc-precio')?.value) || 0;
            const subtotal = cant * precio;
            total += subtotal;
            if (desc) itemsHtml += `<tr><td>${desc}</td><td class="text-end">${cant}</td><td>${unidad}</td><td class="text-end">${precio.toFixed(2)}</td><td class="text-end">${subtotal.toFixed(2)}</td></tr>`;
        });

        const w = window.open('', '_blank');
        w.document.write(`
            <html><head><title>OC ${numero}</title>
            <style>
                body { font-family: Arial; padding: 20px; }
                h1 { color: #0d6efd; margin-bottom: 10px; }
                table { width: 100%; border-collapse: collapse; margin-top: 20px; }
                th, td { border: 1px solid #333; padding: 8px; text-align: left; }
                th { background: #f0f0f0; }
                .info { margin: 15px 0; }
                .info div { margin: 4px 0; }
                .firma { margin-top: 60px; display: flex; justify-content: space-around; }
                .firma div { text-align: center; min-width: 200px; }
                .firma hr { margin: 0 auto 5px; width: 90%; }
            </style></head><body>
                <h1>ORDEN DE COMPRA</h1>
                <p><strong>INVERSIONES AXONES 2008, C.A.</strong><br>
                RIF: J-40081341-7<br>
                Turmero, Aragua - Tel: 0424-316.96.12</p>
                <hr>
                <div class="info">
                    <div><strong>N° OC:</strong> ${numero}</div>
                    <div><strong>Fecha:</strong> ${fecha}</div>
                    <div><strong>Proveedor:</strong> ${proveedor}</div>
                    <div><strong>OT Asociada:</strong> ${ot}</div>
                </div>
                <table>
                    <thead><tr><th>Descripcion</th><th class="text-end">Cantidad</th><th>Unidad</th><th class="text-end">P.Unit</th><th class="text-end">Total</th></tr></thead>
                    <tbody>${itemsHtml}</tbody>
                    <tfoot><tr><td colspan="4" style="text-align:right;"><strong>TOTAL:</strong></td><td class="text-end"><strong>${total.toFixed(2)}</strong></td></tr></tfoot>
                </table>
                ${observaciones ? `<p style="margin-top:20px;"><strong>Observaciones:</strong> ${observaciones}</p>` : ''}
                <div class="firma">
                    <div><hr>Solicitado por</div>
                    <div><hr>Autorizado por</div>
                    <div><hr>Proveedor</div>
                </div>
            </body></html>`);
        w.document.close();
        setTimeout(() => w.print(), 500);
    },
};

document.addEventListener('DOMContentLoaded', () => {
    setTimeout(() => OrdenesCompra.init(), 300);
});
