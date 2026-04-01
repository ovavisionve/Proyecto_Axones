/**
 * Modulo Almacen - Sistema Axones
 * Despacho OT, Recepcion de Material, Despacho Miscelaneos, Trazabilidad
 */
const Almacen = {
    ordenes: [],

    init: async function() {
        console.log('[Almacen] Inicializando modulo');
        if (typeof AxonesDB !== 'undefined' && !AxonesDB.isReady()) {
            await AxonesDB.init();
        }
        await this.cargarDatos();
        this.setupEvents();
        this.setDefaultDates();
    },

    cargarDatos: async function() {
        if (!AxonesDB.isReady()) return;
        try {
            this.ordenes = await AxonesDB.ordenesHelper.cargar() || [];
            this.renderOTsPendientes();
            await this.cargarMovimientos();
        } catch (e) { console.warn('[Almacen] Error cargando datos:', e); }
    },

    setDefaultDates: function() {
        const hoy = new Date().toISOString().split('T')[0];
        const el = document.getElementById('recepcionFecha');
        if (el) el.value = hoy;
        const desde = document.getElementById('movFechaDesde');
        if (desde) { const d = new Date(); d.setMonth(d.getMonth() - 1); desde.value = d.toISOString().split('T')[0]; }
        const hasta = document.getElementById('movFechaHasta');
        if (hasta) hasta.value = hoy;
    },

    setupEvents: function() {
        // Despacho OT
        document.getElementById('btnGuardarDespachoOT')?.addEventListener('click', () => this.guardarDespachoOT());
        document.getElementById('btnCancelarDespachoOT')?.addEventListener('click', () => this.cancelarDespacho());
        // Recepcion
        document.getElementById('btnAgregarItemRecepcion')?.addEventListener('click', () => this.agregarFilaRecepcion());
        document.getElementById('formRecepcion')?.addEventListener('submit', (e) => { e.preventDefault(); this.registrarRecepcion(); });
        // Miscelaneos
        document.getElementById('btnAgregarItemMisc')?.addEventListener('click', () => this.agregarFilaMiscelaneo());
        document.getElementById('formMiscelaneos')?.addEventListener('submit', (e) => { e.preventDefault(); this.registrarMiscelaneo(); });
        // Movimientos filtros
        document.getElementById('btnLimpiarFiltrosMov')?.addEventListener('click', () => { this.setDefaultDates(); this.cargarMovimientos(); });
        ['movFechaDesde', 'movFechaHasta', 'movFiltroTipo', 'movBuscar'].forEach(id => {
            document.getElementById(id)?.addEventListener('change', () => this.cargarMovimientos());
            document.getElementById(id)?.addEventListener('input', () => this.cargarMovimientos());
        });
    },

    // ==================== TAB 1: DESPACHO OT ====================

    renderOTsPendientes: function() {
        const tbody = document.getElementById('tablaOTsDespacho');
        if (!tbody) return;
        const pendientes = this.ordenes.filter(o => o.estadoOrden !== 'completada' && o.estadoOrden !== 'despachada');
        if (pendientes.length === 0) {
            tbody.innerHTML = '<tr><td colspan="7" class="text-center text-muted py-4">No hay OTs pendientes de despacho</td></tr>';
            return;
        }
        tbody.innerHTML = pendientes.map(o => {
            const ec = { pendiente: 'bg-warning text-dark', montaje: 'bg-secondary', impresion: 'bg-primary', laminacion: 'bg-info', corte: 'bg-success' };
            return `<tr>
                <td><strong>${o.numeroOrden || o.nombreOT || '-'}</strong></td>
                <td>${o.cliente || '-'}</td>
                <td>${o.producto || '-'}</td>
                <td>${o.tipoMaterial || '-'}</td>
                <td class="text-end fw-bold">${o.pedidoKg || 0} Kg</td>
                <td class="text-center"><span class="badge ${ec[o.estadoOrden] || 'bg-secondary'}">${o.estadoOrden || 'pendiente'}</span></td>
                <td class="text-center">
                    <button class="btn btn-sm btn-outline-success" onclick="Almacen.mostrarFormDespacho('${o.id}')">
                        <i class="bi bi-box-arrow-right me-1"></i>Despachar
                    </button>
                </td>
            </tr>`;
        }).join('');
    },

    mostrarFormDespacho: function(otId) {
        const ot = this.ordenes.find(o => o.id === otId);
        if (!ot) return;
        const form = document.getElementById('formDespachoOT');
        if (!form) return;
        form.style.display = '';
        form.dataset.otId = otId;
        document.getElementById('despachoOTNumero').textContent = ot.numeroOrden || ot.nombreOT || '';
        document.getElementById('despachoProducto').textContent = ot.producto || '-';
        document.getElementById('despachoKgPedidos').textContent = (ot.pedidoKg || 0) + ' Kg';
        document.getElementById('despachoMaterial').textContent = ot.tipoMaterial || '-';
        document.getElementById('despachoKg').value = '';
        document.getElementById('despachoObservaciones').value = '';
        document.getElementById('despachoKg').focus();
    },

    guardarDespachoOT: async function() {
        const form = document.getElementById('formDespachoOT');
        const otId = form?.dataset.otId;
        const kg = parseFloat(document.getElementById('despachoKg')?.value) || 0;
        const obs = document.getElementById('despachoObservaciones')?.value || '';
        if (!otId || kg <= 0) { alert('Ingrese los Kg a despachar'); return; }
        const ot = this.ordenes.find(o => o.id === otId);
        if (!ot) return;

        await this.registrarMovimiento({
            tipo: 'salida',
            referencia: ot.numeroOrden || ot.nombreOT || '',
            descripcion: `Despacho OT: ${ot.tipoMaterial || ot.producto || ''} para ${ot.cliente || ''}`,
            cantidad: kg, unidad: 'Kg',
            proveedor_destino: ot.cliente || '',
            observaciones: obs
        });

        // Descontar del inventario
        if (AxonesDB.isReady() && ot.tipoMaterial) {
            try {
                const { data: materiales } = await AxonesDB.client.from('materiales')
                    .select('id, stock_kg, material').ilike('material', `%${ot.tipoMaterial}%`)
                    .gt('stock_kg', 0).order('stock_kg', { ascending: false }).limit(1);
                if (materiales && materiales[0]) {
                    const mat = materiales[0];
                    const nuevoStock = Math.max(0, (mat.stock_kg || 0) - kg);
                    await AxonesDB.client.from('materiales').update({ stock_kg: nuevoStock }).eq('id', mat.id);
                }
            } catch (e) { console.warn('[Almacen] Error descontando:', e); }
        }

        form.style.display = 'none';
        if (typeof showToast === 'function') showToast(`Despachados ${kg} Kg para ${ot.numeroOrden || ''}`, 'success');
    },

    cancelarDespacho: function() {
        const form = document.getElementById('formDespachoOT');
        if (form) form.style.display = 'none';
    },

    // ==================== TAB 2: RECEPCION ====================

    agregarFilaRecepcion: function() {
        const tbody = document.getElementById('tablaItemsRecepcion');
        if (!tbody) return;
        const fila = document.createElement('tr');
        fila.innerHTML = `
            <td><input type="text" class="form-control form-control-sm rec-desc" placeholder="Descripcion" required></td>
            <td><select class="form-select form-select-sm rec-tipo">
                <option value="Sustrato">Sustrato</option><option value="Tinta">Tinta</option>
                <option value="Quimico">Quimico</option><option value="Consumible">Consumible</option><option value="Otro">Otro</option>
            </select></td>
            <td><input type="number" class="form-control form-control-sm rec-cant" step="0.01" min="0" required></td>
            <td><select class="form-select form-select-sm rec-unidad">
                <option value="Kg">Kg</option><option value="Lt">Lt</option><option value="Unidad">Unidad</option>
            </select></td>
            <td><button type="button" class="btn btn-sm btn-outline-danger" onclick="this.closest('tr').remove()"><i class="bi bi-x"></i></button></td>`;
        tbody.appendChild(fila);
    },

    registrarRecepcion: async function() {
        const proveedor = document.getElementById('recepcionProveedor')?.value?.trim();
        const factura = document.getElementById('recepcionFactura')?.value?.trim() || '';
        const fecha = document.getElementById('recepcionFecha')?.value || new Date().toISOString().split('T')[0];
        const oc = document.getElementById('recepcionOrdenCompra')?.value?.trim() || '';
        const obs = document.getElementById('recepcionObservaciones')?.value?.trim() || '';
        if (!proveedor) { alert('El proveedor es obligatorio'); return; }

        const items = [];
        document.querySelectorAll('#tablaItemsRecepcion tr').forEach(row => {
            const desc = row.querySelector('[name="itemDescripcion"]')?.value?.trim() || row.querySelector('.rec-desc')?.value?.trim();
            const tipo = row.querySelector('[name="itemTipo"]')?.value || row.querySelector('.rec-tipo')?.value;
            const cant = parseFloat(row.querySelector('[name="itemCantidad"]')?.value || row.querySelector('.rec-cant')?.value) || 0;
            const unidad = row.querySelector('[name="itemUnidad"]')?.value || row.querySelector('.rec-unidad')?.value;
            if (desc && cant > 0) items.push({ descripcion: desc, tipo, cantidad: cant, unidad });
        });
        if (items.length === 0) { alert('Agregue al menos un item'); return; }

        for (const item of items) {
            await this.registrarMovimiento({
                tipo: 'entrada',
                referencia: `FAC: ${factura} | OC: ${oc}`,
                descripcion: `${item.tipo}: ${item.descripcion}`,
                cantidad: item.cantidad, unidad: item.unidad,
                proveedor_destino: proveedor,
                observaciones: obs
            });

            if (item.tipo === 'Sustrato' && AxonesDB.isReady()) {
                try {
                    const { data: existentes } = await AxonesDB.client.from('materiales')
                        .select('id, stock_kg, material')
                        .ilike('material', `%${item.descripcion.split(' ')[0]}%`).limit(1);
                    if (existentes && existentes[0]) {
                        const mat = existentes[0];
                        await AxonesDB.client.from('materiales').update({ stock_kg: (mat.stock_kg || 0) + item.cantidad }).eq('id', mat.id);
                    }
                } catch (e) { console.warn('[Almacen] Error actualizando inventario:', e); }
            }
        }

        document.getElementById('formRecepcion')?.reset();
        document.getElementById('tablaItemsRecepcion').innerHTML = '';
        this.setDefaultDates();
        if (typeof showToast === 'function') showToast(`Recepcion registrada: ${items.length} items de ${proveedor}`, 'success');
    },

    // ==================== TAB 3: MISCELANEOS ====================

    agregarFilaMiscelaneo: function() {
        const tbody = document.getElementById('tablaItemsMisc');
        if (!tbody) return;
        const fila = document.createElement('tr');
        fila.innerHTML = `
            <td><input type="text" class="form-control form-control-sm misc-desc" placeholder="Ej: Hojillas, cinta..." required></td>
            <td><input type="number" class="form-control form-control-sm misc-cant" step="0.01" min="0" required></td>
            <td><input type="text" class="form-control form-control-sm misc-unidad" value="Unidad"></td>
            <td><button type="button" class="btn btn-sm btn-outline-danger" onclick="this.closest('tr').remove()"><i class="bi bi-x"></i></button></td>`;
        tbody.appendChild(fila);
    },

    registrarMiscelaneo: async function() {
        const solicitadoPor = document.getElementById('miscSolicitadoPor')?.value?.trim();
        const area = document.getElementById('miscArea')?.value || '';
        const obs = document.getElementById('miscObservaciones')?.value?.trim() || '';
        if (!solicitadoPor) { alert('Indique quien solicita'); return; }

        const items = [];
        document.querySelectorAll('#tablaItemsMisc tr').forEach(row => {
            const desc = row.querySelector('[name="miscDescripcion"]')?.value?.trim() || row.querySelector('.misc-desc')?.value?.trim();
            const cant = parseFloat(row.querySelector('[name="miscCantidad"]')?.value || row.querySelector('.misc-cant')?.value) || 0;
            const unidad = row.querySelector('[name="miscUnidad"]')?.value || row.querySelector('.misc-unidad')?.value || 'Unidad';
            if (desc && cant > 0) items.push({ descripcion: desc, cantidad: cant, unidad });
        });
        if (items.length === 0) { alert('Agregue al menos un item'); return; }

        for (const item of items) {
            await this.registrarMovimiento({
                tipo: 'salida',
                referencia: `MISC - ${area}`,
                descripcion: `Consumible: ${item.descripcion}`,
                cantidad: item.cantidad, unidad: item.unidad,
                proveedor_destino: `${solicitadoPor} (${area})`,
                observaciones: obs
            });
        }

        document.getElementById('formMiscelaneos')?.reset();
        document.getElementById('tablaItemsMisc').innerHTML = '';
        if (typeof showToast === 'function') showToast(`Despacho miscelaneo: ${items.length} items para ${solicitadoPor}`, 'success');
    },

    // ==================== TAB 4: MOVIMIENTOS ====================

    registrarMovimiento: async function(datos) {
        const mov = {
            id: 'MOV_' + Date.now() + '_' + Math.random().toString(36).substr(2, 4),
            timestamp: new Date().toISOString(),
            fecha: new Date().toISOString().split('T')[0],
            tipo: datos.tipo,
            referencia: datos.referencia || '',
            descripcion: datos.descripcion || '',
            cantidad: datos.cantidad || 0,
            unidad: datos.unidad || 'Kg',
            proveedor_destino: datos.proveedor_destino || '',
            observaciones: datos.observaciones || '',
            usuario: (typeof Auth !== 'undefined' && Auth.getUser()) ? Auth.getUser().nombre : 'Sistema'
        };

        if (AxonesDB.isReady()) {
            try {
                const { data: existing } = await AxonesDB.client.from('sync_store')
                    .select('value').eq('key', 'axones_movimientos_almacen').single();
                const movs = existing?.value ? (typeof existing.value === 'string' ? JSON.parse(existing.value) : existing.value) : [];
                movs.unshift(mov);
                if (movs.length > 1000) movs.length = 1000;
                await AxonesDB.client.from('sync_store').upsert({
                    key: 'axones_movimientos_almacen',
                    value: JSON.stringify(movs),
                    updated_at: new Date().toISOString()
                }, { onConflict: 'key' });
            } catch (e) { console.warn('[Almacen] Error guardando movimiento:', e); }
        }
        await this.cargarMovimientos();
    },

    cargarMovimientos: async function() {
        const tbody = document.getElementById('tablaMovimientos');
        if (!tbody) return;

        let movs = [];
        if (AxonesDB.isReady()) {
            try {
                const { data } = await AxonesDB.client.from('sync_store')
                    .select('value').eq('key', 'axones_movimientos_almacen').single();
                movs = data?.value ? (typeof data.value === 'string' ? JSON.parse(data.value) : data.value) : [];
            } catch (e) {}
        }

        const desde = document.getElementById('movFechaDesde')?.value;
        const hasta = document.getElementById('movFechaHasta')?.value;
        const tipo = document.getElementById('movFiltroTipo')?.value;
        const buscar = document.getElementById('movBuscar')?.value?.toLowerCase();

        if (desde) movs = movs.filter(m => m.fecha >= desde);
        if (hasta) movs = movs.filter(m => m.fecha <= hasta);
        if (tipo) movs = movs.filter(m => m.tipo === tipo);
        if (buscar) movs = movs.filter(m =>
            (m.descripcion || '').toLowerCase().includes(buscar) ||
            (m.referencia || '').toLowerCase().includes(buscar) ||
            (m.proveedor_destino || '').toLowerCase().includes(buscar)
        );

        if (movs.length === 0) {
            tbody.innerHTML = '<tr><td colspan="8" class="text-center text-muted py-4"><i class="bi bi-inbox me-2"></i>No hay movimientos registrados</td></tr>';
            return;
        }

        const tc = { entrada: 'bg-success', salida: 'bg-danger', ajuste: 'bg-warning text-dark', devolucion: 'bg-info' };
        tbody.innerHTML = movs.slice(0, 200).map(m => `
            <tr>
                <td>${m.fecha || '-'}</td>
                <td><span class="badge ${tc[m.tipo] || 'bg-secondary'}">${(m.tipo || '').toUpperCase()}</span></td>
                <td>${m.referencia || '-'}</td>
                <td>${m.descripcion || '-'}</td>
                <td class="text-end fw-bold">${m.cantidad || 0} ${m.unidad || 'Kg'}</td>
                <td>${m.proveedor_destino || '-'}</td>
                <td>${m.usuario || '-'}</td>
                <td><small>${m.observaciones || '-'}</small></td>
            </tr>
        `).join('');
    }
};

document.addEventListener('DOMContentLoaded', () => Almacen.init());
if (typeof window !== 'undefined') window.Almacen = Almacen;
