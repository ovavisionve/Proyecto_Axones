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
        const n = tbody.querySelectorAll('tr').length;
        const fila = document.createElement('tr');
        fila.innerHTML = `
            <td><select class="form-select form-select-sm rec-tipo" onchange="Almacen.onTipoRecepcionChange(this)">
                <option value="">Tipo...</option>
                <option value="Sustrato">Sustrato</option><option value="Tinta">Tinta</option>
                <option value="Quimico">Quimico</option><option value="Consumible">Consumible</option><option value="Otro">Otro</option>
            </select></td>
            <td><input type="text" class="form-control form-control-sm rec-desc" list="listaMaterialesRec_${n}" placeholder="Escribir o seleccionar...">
                <datalist id="listaMaterialesRec_${n}">
                    <option value="BOPP NORMAL"><option value="BOPP MATE"><option value="BOPP PASTA">
                    <option value="BOPP PERLADO"><option value="CAST"><option value="PEBD">
                    <option value="PEBD PIGMENT"><option value="METAL"><option value="PERLADO">
                    <option value="PET"><option value="PA (Nylon)">
                </datalist>
            </td>
            <td><input type="number" class="form-control form-control-sm rec-micras" step="0.1" placeholder="µ"></td>
            <td><input type="number" class="form-control form-control-sm rec-ancho" step="1" placeholder="mm"></td>
            <td><input type="number" class="form-control form-control-sm rec-cant" step="0.01" min="0" placeholder="0"></td>
            <td><select class="form-select form-select-sm rec-unidad">
                <option value="Kg">Kg</option><option value="Lt">Lt</option><option value="Unidad">Unidad</option>
            </select></td>
            <td><button type="button" class="btn btn-sm btn-outline-danger" onclick="this.closest('tr').remove()"><i class="bi bi-x"></i></button></td>`;
        // Prevenir Enter para que no submitee el form
        fila.querySelectorAll('input, select').forEach(el => {
            el.addEventListener('keydown', (e) => { if (e.key === 'Enter') e.preventDefault(); });
        });
        tbody.appendChild(fila);
    },

    onTipoRecepcionChange: function(select) {
        const row = select.closest('tr');
        const micrasInput = row.querySelector('.rec-micras');
        const anchoInput = row.querySelector('.rec-ancho');
        const isSustrato = select.value === 'Sustrato';
        if (micrasInput) { micrasInput.style.display = isSustrato ? '' : 'none'; micrasInput.placeholder = isSustrato ? 'µ' : ''; }
        if (anchoInput) { anchoInput.style.display = isSustrato ? '' : 'none'; anchoInput.placeholder = isSustrato ? 'mm' : ''; }
    },

    /**
     * Genera correlativo para recepcion: REC-2026-XXXX
     */
    generarCorrelativoRecepcion: async function() {
        const year = new Date().getFullYear();
        let recepciones = [];
        if (AxonesDB.isReady()) {
            try {
                const { data } = await AxonesDB.client.from('sync_store')
                    .select('value').eq('key', 'axones_recepciones_almacen').single();
                recepciones = data?.value ? (typeof data.value === 'string' ? JSON.parse(data.value) : data.value) : [];
            } catch (e) {}
        }
        const delAnio = recepciones.filter(r => (r.correlativo || '').startsWith(`REC-${year}-`));
        const siguiente = delAnio.length + 1;
        return `REC-${year}-${String(siguiente).padStart(4, '0')}`;
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
            const tipo = row.querySelector('.rec-tipo')?.value || row.querySelector('[name="itemTipo"]')?.value;
            const desc = row.querySelector('.rec-desc')?.value?.trim() || row.querySelector('[name="itemDescripcion"]')?.value?.trim();
            const micras = row.querySelector('.rec-micras')?.value || '';
            const ancho = row.querySelector('.rec-ancho')?.value || '';
            const cant = parseFloat(row.querySelector('.rec-cant')?.value || row.querySelector('[name="itemCantidad"]')?.value) || 0;
            const unidad = row.querySelector('.rec-unidad')?.value || row.querySelector('[name="itemUnidad"]')?.value;
            if (desc && cant > 0) {
                const descripcionCompleta = tipo === 'Sustrato' && micras && ancho
                    ? `${desc} ${micras}µ x ${ancho}mm`
                    : desc;
                items.push({ descripcion: descripcionCompleta, tipo, cantidad: cant, unidad, material: desc, micras, ancho });
            }
        });
        if (items.length === 0) { alert('Agregue al menos un item'); return; }

        // Generar correlativo y armar documento de recepcion
        const correlativo = await this.generarCorrelativoRecepcion();
        const recepcion = {
            id: 'REC_' + Date.now(),
            correlativo: correlativo,
            timestamp: new Date().toISOString(),
            fecha: fecha,
            proveedor: proveedor,
            factura: factura,
            ordenCompra: oc,
            items: items,
            totalItems: items.length,
            totalCantidad: items.reduce((s, i) => s + (parseFloat(i.cantidad) || 0), 0),
            observaciones: obs,
            usuario: (typeof Auth !== 'undefined' && Auth.getUser()) ? Auth.getUser().nombre : 'Sistema'
        };

        // Guardar recepcion completa en sync_store
        if (AxonesDB.isReady()) {
            try {
                const { data: existing } = await AxonesDB.client.from('sync_store')
                    .select('value').eq('key', 'axones_recepciones_almacen').single();
                const recepciones = existing?.value ? (typeof existing.value === 'string' ? JSON.parse(existing.value) : existing.value) : [];
                recepciones.unshift(recepcion);
                if (recepciones.length > 1000) recepciones.length = 1000;
                await AxonesDB.client.from('sync_store').upsert({
                    key: 'axones_recepciones_almacen',
                    value: JSON.stringify(recepciones),
                    updated_at: new Date().toISOString()
                }, { onConflict: 'key' });
            } catch (e) { console.warn('[Almacen] Error guardando recepcion:', e); }
        }

        // Registrar UN solo movimiento por toda la recepcion
        await this.registrarMovimiento({
            tipo: 'entrada',
            referencia: correlativo,
            descripcion: `Recepcion ${proveedor} (${items.length} items)`,
            cantidad: recepcion.totalCantidad,
            unidad: items[0]?.unidad || 'Kg',
            proveedor_destino: proveedor,
            observaciones: `FAC: ${factura} | OC: ${oc}${obs ? ' | ' + obs : ''}`,
            recepcionId: recepcion.id
        });

        // Actualizar inventario para items tipo Sustrato
        if (AxonesDB.isReady()) {
            for (const item of items) {
                if (item.tipo === 'Sustrato') {
                    try {
                        const { data: existentes } = await AxonesDB.client.from('materiales')
                            .select('id, stock_kg, material')
                            .ilike('material', `%${(item.material || item.descripcion).split(' ')[0]}%`).limit(1);
                        if (existentes && existentes[0]) {
                            const mat = existentes[0];
                            await AxonesDB.client.from('materiales').update({ stock_kg: (mat.stock_kg || 0) + item.cantidad }).eq('id', mat.id);
                        }
                    } catch (e) { console.warn('[Almacen] Error actualizando inventario:', e); }
                }
            }
        }

        document.getElementById('formRecepcion')?.reset();
        document.getElementById('tablaItemsRecepcion').innerHTML = '';
        this.setDefaultDates();
        if (typeof showToast === 'function') {
            showToast(`Recepcion ${correlativo} registrada: ${items.length} items de ${proveedor}`, 'success');
        } else {
            alert(`Recepcion ${correlativo} registrada: ${items.length} items de ${proveedor}`);
        }
    },

    // ==================== TAB 3: MISCELANEOS ====================

    agregarFilaMiscelaneo: function() {
        const tbody = document.getElementById('tablaItemsMisc');
        if (!tbody) return;
        const fila = document.createElement('tr');
        fila.innerHTML = `
            <td><input type="text" class="form-control form-control-sm misc-desc" placeholder="Ej: Hojillas, cinta..."></td>
            <td><input type="number" class="form-control form-control-sm misc-cant" step="0.01" min="0" placeholder="0"></td>
            <td><input type="text" class="form-control form-control-sm misc-unidad" value="Unidad"></td>
            <td><button type="button" class="btn btn-sm btn-outline-danger" onclick="this.closest('tr').remove()"><i class="bi bi-x"></i></button></td>`;
        // Prevenir Enter para que no submitee el form
        fila.querySelectorAll('input, select').forEach(el => {
            el.addEventListener('keydown', (e) => { if (e.key === 'Enter') e.preventDefault(); });
        });
        tbody.appendChild(fila);
    },

    /**
     * Genera correlativo para despacho miscelaneo: MISC-2026-XXXX
     */
    generarCorrelativoMisc: async function() {
        const year = new Date().getFullYear();
        let despachos = [];
        if (AxonesDB.isReady()) {
            try {
                const { data } = await AxonesDB.client.from('sync_store')
                    .select('value').eq('key', 'axones_miscelaneos_almacen').single();
                despachos = data?.value ? (typeof data.value === 'string' ? JSON.parse(data.value) : data.value) : [];
            } catch (e) {}
        }
        const delAnio = despachos.filter(d => (d.correlativo || '').startsWith(`MISC-${year}-`));
        const siguiente = delAnio.length + 1;
        return `MISC-${year}-${String(siguiente).padStart(4, '0')}`;
    },

    registrarMiscelaneo: async function() {
        const solicitadoPor = document.getElementById('miscSolicitadoPor')?.value?.trim();
        const area = document.getElementById('miscArea')?.value || '';
        const obs = document.getElementById('miscObservaciones')?.value?.trim() || '';
        if (!solicitadoPor) { alert('Indique quien solicita'); return; }

        const items = [];
        document.querySelectorAll('#tablaItemsMisc tr').forEach(row => {
            const desc = row.querySelector('.misc-desc')?.value?.trim() || row.querySelector('[name="miscDescripcion"]')?.value?.trim();
            const cant = parseFloat(row.querySelector('.misc-cant')?.value || row.querySelector('[name="miscCantidad"]')?.value) || 0;
            const unidad = row.querySelector('.misc-unidad')?.value || row.querySelector('[name="miscUnidad"]')?.value || 'Unidad';
            if (desc && cant > 0) items.push({ descripcion: desc, cantidad: cant, unidad });
        });
        if (items.length === 0) { alert('Agregue al menos un item'); return; }

        // Generar correlativo y armar documento
        const correlativo = await this.generarCorrelativoMisc();
        const despacho = {
            id: 'MISC_' + Date.now(),
            correlativo: correlativo,
            timestamp: new Date().toISOString(),
            fecha: new Date().toISOString().split('T')[0],
            solicitadoPor: solicitadoPor,
            area: area,
            items: items,
            totalItems: items.length,
            observaciones: obs,
            usuario: (typeof Auth !== 'undefined' && Auth.getUser()) ? Auth.getUser().nombre : 'Sistema'
        };

        // Guardar en sync_store
        if (AxonesDB.isReady()) {
            try {
                const { data: existing } = await AxonesDB.client.from('sync_store')
                    .select('value').eq('key', 'axones_miscelaneos_almacen').single();
                const despachos = existing?.value ? (typeof existing.value === 'string' ? JSON.parse(existing.value) : existing.value) : [];
                despachos.unshift(despacho);
                if (despachos.length > 1000) despachos.length = 1000;
                await AxonesDB.client.from('sync_store').upsert({
                    key: 'axones_miscelaneos_almacen',
                    value: JSON.stringify(despachos),
                    updated_at: new Date().toISOString()
                }, { onConflict: 'key' });
            } catch (e) { console.warn('[Almacen] Error guardando misc:', e); }
        }

        // Registrar UN solo movimiento por todo el despacho
        const totalCantidad = items.reduce((s, i) => s + (parseFloat(i.cantidad) || 0), 0);
        const itemsTexto = items.map(i => `${i.descripcion} (${i.cantidad} ${i.unidad})`).join(', ');
        await this.registrarMovimiento({
            tipo: 'salida',
            referencia: correlativo,
            descripcion: `Despacho miscelaneo (${items.length} items): ${itemsTexto}`,
            cantidad: totalCantidad,
            unidad: items[0]?.unidad || 'Unidad',
            proveedor_destino: `${solicitadoPor} (${area})`,
            observaciones: obs,
            despachoId: despacho.id
        });

        document.getElementById('formMiscelaneos')?.reset();
        document.getElementById('tablaItemsMisc').innerHTML = '';
        if (typeof showToast === 'function') {
            showToast(`Despacho ${correlativo} registrado: ${items.length} items para ${solicitadoPor}`, 'success');
        } else {
            alert(`Despacho ${correlativo} registrado: ${items.length} items para ${solicitadoPor}`);
        }
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
        tbody.innerHTML = movs.slice(0, 200).map(m => {
            const esRec = (m.referencia || '').startsWith('REC-') && m.recepcionId;
            const esMisc = (m.referencia || '').startsWith('MISC-') && m.despachoId;
            const clickable = esRec || esMisc;
            const onclick = esRec ? `Almacen.verDetalleRecepcion('${m.recepcionId}')` :
                            esMisc ? `Almacen.verDetalleMisc('${m.despachoId}')` : '';
            const cursor = clickable ? 'cursor:pointer;' : '';
            const hint = clickable ? '<i class="bi bi-eye ms-1 text-primary"></i>' : '';
            return `
            <tr style="${cursor}" ${clickable ? `onclick="${onclick}"` : ''}>
                <td>${m.fecha || '-'}</td>
                <td><span class="badge ${tc[m.tipo] || 'bg-secondary'}">${(m.tipo || '').toUpperCase()}</span></td>
                <td><strong>${m.referencia || '-'}</strong>${hint}</td>
                <td>${m.descripcion || '-'}</td>
                <td class="text-end fw-bold">${m.cantidad || 0} ${m.unidad || 'Kg'}</td>
                <td>${m.proveedor_destino || '-'}</td>
                <td>${m.usuario || '-'}</td>
                <td><small>${m.observaciones || '-'}</small></td>
            </tr>`;
        }).join('');
    },

    /**
     * Muestra modal con detalle de una recepcion (todos los items)
     */
    verDetalleRecepcion: async function(recepcionId) {
        if (!AxonesDB.isReady()) return;
        try {
            const { data } = await AxonesDB.client.from('sync_store')
                .select('value').eq('key', 'axones_recepciones_almacen').single();
            const recepciones = data?.value ? (typeof data.value === 'string' ? JSON.parse(data.value) : data.value) : [];
            const rec = recepciones.find(r => r.id === recepcionId);
            if (!rec) { alert('Recepcion no encontrada'); return; }
            this.mostrarModalDetalle({
                titulo: `Recepcion ${rec.correlativo}`,
                tipo: 'recepcion',
                datos: rec
            });
        } catch (e) { console.warn('Error cargando detalle:', e); }
    },

    /**
     * Muestra modal con detalle de un despacho miscelaneo
     */
    verDetalleMisc: async function(despachoId) {
        if (!AxonesDB.isReady()) return;
        try {
            const { data } = await AxonesDB.client.from('sync_store')
                .select('value').eq('key', 'axones_miscelaneos_almacen').single();
            const despachos = data?.value ? (typeof data.value === 'string' ? JSON.parse(data.value) : data.value) : [];
            const desp = despachos.find(d => d.id === despachoId);
            if (!desp) { alert('Despacho no encontrado'); return; }
            this.mostrarModalDetalle({
                titulo: `Despacho Miscelaneo ${desp.correlativo}`,
                tipo: 'misc',
                datos: desp
            });
        } catch (e) { console.warn('Error cargando detalle:', e); }
    },

    /**
     * Renderiza un modal con el detalle de una recepcion o despacho
     */
    mostrarModalDetalle: function({ titulo, tipo, datos }) {
        // Eliminar modal previo si existe
        document.getElementById('modalDetalleAlmacen')?.remove();

        const isRec = tipo === 'recepcion';
        const headerInfo = isRec ? `
            <div class="row g-2 mb-3">
                <div class="col-md-4"><small class="text-muted d-block">Proveedor</small><strong>${datos.proveedor || '-'}</strong></div>
                <div class="col-md-2"><small class="text-muted d-block">Factura</small><strong>${datos.factura || '-'}</strong></div>
                <div class="col-md-2"><small class="text-muted d-block">Orden Compra</small><strong>${datos.ordenCompra || '-'}</strong></div>
                <div class="col-md-2"><small class="text-muted d-block">Fecha</small><strong>${datos.fecha || '-'}</strong></div>
                <div class="col-md-2"><small class="text-muted d-block">Usuario</small><strong>${datos.usuario || '-'}</strong></div>
            </div>` : `
            <div class="row g-2 mb-3">
                <div class="col-md-4"><small class="text-muted d-block">Solicitado por</small><strong>${datos.solicitadoPor || '-'}</strong></div>
                <div class="col-md-3"><small class="text-muted d-block">Area</small><strong>${datos.area || '-'}</strong></div>
                <div class="col-md-3"><small class="text-muted d-block">Fecha</small><strong>${datos.fecha || '-'}</strong></div>
                <div class="col-md-2"><small class="text-muted d-block">Usuario</small><strong>${datos.usuario || '-'}</strong></div>
            </div>`;

        const itemsHTML = (datos.items || []).map((item, i) => {
            if (isRec) {
                return `<tr>
                    <td>${i + 1}</td>
                    <td><span class="badge bg-info">${item.tipo || '-'}</span></td>
                    <td>${item.descripcion || '-'}</td>
                    <td class="text-end">${item.cantidad || 0}</td>
                    <td>${item.unidad || '-'}</td>
                </tr>`;
            } else {
                return `<tr>
                    <td>${i + 1}</td>
                    <td>${item.descripcion || '-'}</td>
                    <td class="text-end">${item.cantidad || 0}</td>
                    <td>${item.unidad || '-'}</td>
                </tr>`;
            }
        }).join('');

        const headerCols = isRec ? '<th>#</th><th>Tipo</th><th>Descripcion</th><th class="text-end">Cantidad</th><th>Unidad</th>'
                                 : '<th>#</th><th>Descripcion</th><th class="text-end">Cantidad</th><th>Unidad</th>';

        const modalHTML = `
        <div class="modal fade" id="modalDetalleAlmacen" tabindex="-1">
            <div class="modal-dialog modal-lg modal-dialog-scrollable">
                <div class="modal-content">
                    <div class="modal-header bg-${isRec ? 'success' : 'primary'} text-white py-2">
                        <h6 class="modal-title"><i class="bi bi-${isRec ? 'box-arrow-in-down' : 'send'} me-2"></i>${titulo}</h6>
                        <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal"></button>
                    </div>
                    <div class="modal-body">
                        ${headerInfo}
                        <h6 class="mt-3 mb-2">Items (${datos.totalItems || datos.items?.length || 0})</h6>
                        <div class="table-responsive">
                            <table class="table table-sm table-bordered">
                                <thead class="table-light"><tr>${headerCols}</tr></thead>
                                <tbody>${itemsHTML}</tbody>
                            </table>
                        </div>
                        ${datos.observaciones ? `<div class="alert alert-light mt-2"><strong>Observaciones:</strong> ${datos.observaciones}</div>` : ''}
                    </div>
                    <div class="modal-footer py-1">
                        <button type="button" class="btn btn-outline-secondary btn-sm" data-bs-dismiss="modal">Cerrar</button>
                        <button type="button" class="btn btn-primary btn-sm" onclick="window.print()"><i class="bi bi-printer me-1"></i>Imprimir</button>
                    </div>
                </div>
            </div>
        </div>`;
        document.body.insertAdjacentHTML('beforeend', modalHTML);
        new bootstrap.Modal(document.getElementById('modalDetalleAlmacen')).show();
    }
};

document.addEventListener('DOMContentLoaded', () => Almacen.init());
if (typeof window !== 'undefined') window.Almacen = Almacen;
