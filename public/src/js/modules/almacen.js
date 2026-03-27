/**
 * Modulo Almacen - Sistema Axones
 * Despacho OT, Recepcion de Material, Despacho Miscelaneos, Trazabilidad
 */
const Almacen = {
    ordenes: [],
    movimientos: [],

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
        const el = document.getElementById('recFecha');
        if (el) el.value = hoy;
        const desde = document.getElementById('filtroDesde');
        if (desde) { const d = new Date(); d.setMonth(d.getMonth() - 1); desde.value = d.toISOString().split('T')[0]; }
        const hasta = document.getElementById('filtroHasta');
        if (hasta) hasta.value = hoy;
    },

    setupEvents: function() {
        // Recepcion
        document.getElementById('btnAgregarItemRec')?.addEventListener('click', () => this.agregarFilaRecepcion());
        document.getElementById('btnRegistrarRecepcion')?.addEventListener('click', () => this.registrarRecepcion());
        // Miscelaneos
        document.getElementById('btnAgregarItemMisc')?.addEventListener('click', () => this.agregarFilaMiscelaneo());
        document.getElementById('btnRegistrarMisc')?.addEventListener('click', () => this.registrarMiscelaneo());
        // Movimientos filtros
        document.getElementById('btnFiltrarMov')?.addEventListener('click', () => this.cargarMovimientos());
        document.getElementById('btnLimpiarFiltros')?.addEventListener('click', () => { this.setDefaultDates(); this.cargarMovimientos(); });
    },

    // ==================== TAB 1: DESPACHO OT ====================

    renderOTsPendientes: function() {
        const tbody = document.getElementById('tablaOTsPendientes');
        if (!tbody) return;

        const pendientes = this.ordenes.filter(o =>
            o.estadoOrden !== 'completada' && o.estadoOrden !== 'despachada'
        );

        if (pendientes.length === 0) {
            tbody.innerHTML = '<tr><td colspan="8" class="text-center text-muted py-4">No hay OTs pendientes de despacho</td></tr>';
            return;
        }

        tbody.innerHTML = pendientes.map(o => {
            const estadoClass = { pendiente: 'bg-warning text-dark', montaje: 'bg-secondary', impresion: 'bg-primary', laminacion: 'bg-info', corte: 'bg-success' };
            return `<tr>
                <td><strong>${o.numeroOrden || o.nombreOT || '-'}</strong></td>
                <td>${o.cliente || '-'}</td>
                <td>${o.producto || '-'}</td>
                <td>${o.tipoMaterial || '-'}</td>
                <td class="text-end fw-bold">${o.pedidoKg || 0} Kg</td>
                <td class="text-center"><span class="badge ${estadoClass[o.estadoOrden] || 'bg-secondary'}">${o.estadoOrden || 'pendiente'}</span></td>
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
        document.getElementById('despachoOTInfo').innerHTML = `
            <strong>${ot.numeroOrden || ot.nombreOT}</strong> - ${ot.cliente || ''} | ${ot.producto || ''} | Pedido: ${ot.pedidoKg || 0} Kg
        `;
        document.getElementById('despachoKg').value = '';
        document.getElementById('despachoObs').value = '';
        document.getElementById('despachoKg').focus();
    },

    guardarDespachoOT: async function() {
        const form = document.getElementById('formDespachoOT');
        const otId = form?.dataset.otId;
        const kg = parseFloat(document.getElementById('despachoKg')?.value) || 0;
        const obs = document.getElementById('despachoObs')?.value || '';

        if (!otId || kg <= 0) { alert('Ingrese los Kg a despachar'); return; }

        const ot = this.ordenes.find(o => o.id === otId);
        if (!ot) return;

        // Registrar movimiento
        await this.registrarMovimiento({
            tipo: 'salida',
            referencia: ot.numeroOrden || ot.nombreOT || '',
            descripcion: `Despacho OT: ${ot.tipoMaterial || ot.producto || ''} para ${ot.cliente || ''}`,
            cantidad: kg,
            unidad: 'Kg',
            proveedor_destino: ot.cliente || '',
            observaciones: obs
        });

        // Descontar del inventario
        if (AxonesDB.isReady() && ot.tipoMaterial) {
            try {
                const { data: materiales } = await AxonesDB.client.from('materiales')
                    .select('id, stock_kg, material, micras, ancho')
                    .ilike('material', `%${ot.tipoMaterial}%`)
                    .gt('stock_kg', 0)
                    .order('stock_kg', { ascending: false })
                    .limit(1);

                if (materiales && materiales[0]) {
                    const mat = materiales[0];
                    const nuevoStock = Math.max(0, (mat.stock_kg || 0) - kg);
                    await AxonesDB.client.from('materiales').update({ stock_kg: nuevoStock }).eq('id', mat.id);
                    console.log(`[Almacen] Descontados ${kg} Kg de ${mat.material} (${mat.stock_kg} -> ${nuevoStock})`);
                }
            } catch (e) { console.warn('[Almacen] Error descontando inventario:', e); }
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
        const tbody = document.getElementById('bodyItemsRecepcion');
        if (!tbody) return;
        const fila = document.createElement('tr');
        fila.innerHTML = `
            <td><input type="text" class="form-control form-control-sm rec-desc" placeholder="Descripcion del producto" required></td>
            <td><select class="form-select form-select-sm rec-tipo">
                <option value="Sustrato">Sustrato</option><option value="Tinta">Tinta</option>
                <option value="Quimico">Quimico</option><option value="Consumible">Consumible</option><option value="Otro">Otro</option>
            </select></td>
            <td><input type="number" class="form-control form-control-sm rec-cant" step="0.01" min="0" required></td>
            <td><select class="form-select form-select-sm rec-unidad">
                <option value="Kg">Kg</option><option value="Lt">Lt</option><option value="Unidad">Unidad</option>
            </select></td>
            <td><button type="button" class="btn btn-sm btn-outline-danger" onclick="this.closest('tr').remove()"><i class="bi bi-x"></i></button></td>
        `;
        tbody.appendChild(fila);
    },

    registrarRecepcion: async function() {
        const proveedor = document.getElementById('recProveedor')?.value?.trim();
        const factura = document.getElementById('recFactura')?.value?.trim() || '';
        const fecha = document.getElementById('recFecha')?.value || new Date().toISOString().split('T')[0];
        const oc = document.getElementById('recOC')?.value?.trim() || '';
        const obs = document.getElementById('recObservaciones')?.value?.trim() || '';

        if (!proveedor) { alert('El proveedor es obligatorio'); return; }

        // Recopilar items
        const items = [];
        document.querySelectorAll('#bodyItemsRecepcion tr').forEach(row => {
            const desc = row.querySelector('.rec-desc')?.value?.trim();
            const tipo = row.querySelector('.rec-tipo')?.value;
            const cant = parseFloat(row.querySelector('.rec-cant')?.value) || 0;
            const unidad = row.querySelector('.rec-unidad')?.value;
            if (desc && cant > 0) items.push({ descripcion: desc, tipo, cantidad: cant, unidad });
        });

        if (items.length === 0) { alert('Agregue al menos un item'); return; }

        // Registrar cada item como movimiento
        for (const item of items) {
            await this.registrarMovimiento({
                tipo: 'entrada',
                referencia: `FAC: ${factura} | OC: ${oc}`,
                descripcion: `${item.tipo}: ${item.descripcion}`,
                cantidad: item.cantidad,
                unidad: item.unidad,
                proveedor_destino: proveedor,
                observaciones: obs
            });

            // Si es Sustrato, actualizar inventario de materiales
            if (item.tipo === 'Sustrato' && AxonesDB.isReady()) {
                try {
                    // Buscar material similar o crear nuevo
                    const { data: existentes } = await AxonesDB.client.from('materiales')
                        .select('id, stock_kg, material')
                        .ilike('material', `%${item.descripcion.split(' ')[0]}%`)
                        .limit(1);

                    if (existentes && existentes[0]) {
                        const mat = existentes[0];
                        const nuevoStock = (mat.stock_kg || 0) + item.cantidad;
                        await AxonesDB.client.from('materiales').update({ stock_kg: nuevoStock }).eq('id', mat.id);
                        console.log(`[Almacen] Recepcion: +${item.cantidad} Kg a ${mat.material}`);
                    }
                } catch (e) { console.warn('[Almacen] Error actualizando inventario:', e); }
            }
        }

        // Limpiar formulario
        document.getElementById('recProveedor').value = '';
        document.getElementById('recFactura').value = '';
        document.getElementById('recOC').value = '';
        document.getElementById('recObservaciones').value = '';
        document.getElementById('bodyItemsRecepcion').innerHTML = '';
        this.setDefaultDates();

        if (typeof showToast === 'function') showToast(`Recepcion registrada: ${items.length} items de ${proveedor}`, 'success');
    },

    // ==================== TAB 3: MISCELANEOS ====================

    agregarFilaMiscelaneo: function() {
        const tbody = document.getElementById('bodyItemsMisc');
        if (!tbody) return;
        const fila = document.createElement('tr');
        fila.innerHTML = `
            <td><input type="text" class="form-control form-control-sm misc-desc" placeholder="Ej: Hojillas, cinta plastica..." required></td>
            <td><input type="number" class="form-control form-control-sm misc-cant" step="0.01" min="0" required></td>
            <td><input type="text" class="form-control form-control-sm misc-unidad" value="Unidad"></td>
            <td><button type="button" class="btn btn-sm btn-outline-danger" onclick="this.closest('tr').remove()"><i class="bi bi-x"></i></button></td>
        `;
        tbody.appendChild(fila);
    },

    registrarMiscelaneo: async function() {
        const solicitadoPor = document.getElementById('miscSolicitante')?.value?.trim();
        const area = document.getElementById('miscArea')?.value || '';
        const obs = document.getElementById('miscObservaciones')?.value?.trim() || '';

        if (!solicitadoPor) { alert('Indique quien solicita'); return; }

        const items = [];
        document.querySelectorAll('#bodyItemsMisc tr').forEach(row => {
            const desc = row.querySelector('.misc-desc')?.value?.trim();
            const cant = parseFloat(row.querySelector('.misc-cant')?.value) || 0;
            const unidad = row.querySelector('.misc-unidad')?.value || 'Unidad';
            if (desc && cant > 0) items.push({ descripcion: desc, cantidad: cant, unidad });
        });

        if (items.length === 0) { alert('Agregue al menos un item'); return; }

        for (const item of items) {
            await this.registrarMovimiento({
                tipo: 'salida',
                referencia: `MISC - ${area}`,
                descripcion: `Consumible: ${item.descripcion}`,
                cantidad: item.cantidad,
                unidad: item.unidad,
                proveedor_destino: `${solicitadoPor} (${area})`,
                observaciones: obs
            });
        }

        document.getElementById('miscSolicitante').value = '';
        document.getElementById('miscObservaciones').value = '';
        document.getElementById('bodyItemsMisc').innerHTML = '';

        if (typeof showToast === 'function') showToast(`Despacho miscelaneo: ${items.length} items para ${solicitadoPor}`, 'success');
    },

    // ==================== TAB 4: MOVIMIENTOS ====================

    registrarMovimiento: async function(datos) {
        const mov = {
            id: 'MOV_' + Date.now() + '_' + Math.random().toString(36).substr(2, 4),
            timestamp: new Date().toISOString(),
            fecha: new Date().toISOString().split('T')[0],
            tipo: datos.tipo, // entrada, salida
            referencia: datos.referencia || '',
            descripcion: datos.descripcion || '',
            cantidad: datos.cantidad || 0,
            unidad: datos.unidad || 'Kg',
            proveedor_destino: datos.proveedor_destino || '',
            observaciones: datos.observaciones || '',
            usuario: (typeof Auth !== 'undefined' && Auth.getUser()) ? Auth.getUser().nombre : 'Sistema'
        };

        // Guardar en sync_store
        if (AxonesDB.isReady()) {
            try {
                const { data: existing } = await AxonesDB.client.from('sync_store')
                    .select('value').eq('key', 'axones_movimientos_almacen').single();
                const movs = existing?.value ? (typeof existing.value === 'string' ? JSON.parse(existing.value) : existing.value) : [];
                movs.unshift(mov);
                // Mantener solo los ultimos 1000 movimientos
                if (movs.length > 1000) movs.length = 1000;
                await AxonesDB.client.from('sync_store').upsert({
                    key: 'axones_movimientos_almacen',
                    value: JSON.stringify(movs),
                    updated_at: new Date().toISOString()
                }, { onConflict: 'key' });
            } catch (e) { console.warn('[Almacen] Error guardando movimiento:', e); }
        }

        // Recargar movimientos
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

        // Aplicar filtros
        const desde = document.getElementById('filtroDesde')?.value;
        const hasta = document.getElementById('filtroHasta')?.value;
        const tipo = document.getElementById('filtroTipoMov')?.value;
        const buscar = document.getElementById('filtroBuscarMov')?.value?.toLowerCase();

        if (desde) movs = movs.filter(m => m.fecha >= desde);
        if (hasta) movs = movs.filter(m => m.fecha <= hasta);
        if (tipo) movs = movs.filter(m => m.tipo === tipo);
        if (buscar) movs = movs.filter(m =>
            (m.descripcion || '').toLowerCase().includes(buscar) ||
            (m.referencia || '').toLowerCase().includes(buscar) ||
            (m.proveedor_destino || '').toLowerCase().includes(buscar)
        );

        // Actualizar contador
        const badge = document.getElementById('countMovimientos');
        if (badge) badge.textContent = movs.length;

        if (movs.length === 0) {
            tbody.innerHTML = '<tr><td colspan="8" class="text-center text-muted py-4"><i class="bi bi-inbox me-2"></i>No hay movimientos registrados</td></tr>';
            return;
        }

        const tipoColors = { entrada: 'bg-success', salida: 'bg-danger', ajuste: 'bg-warning text-dark', devolucion: 'bg-info' };

        tbody.innerHTML = movs.slice(0, 200).map(m => `
            <tr>
                <td>${m.fecha || '-'}</td>
                <td><span class="badge ${tipoColors[m.tipo] || 'bg-secondary'}">${(m.tipo || '').toUpperCase()}</span></td>
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

// Inicializar
document.addEventListener('DOMContentLoaded', () => Almacen.init());
if (typeof window !== 'undefined') window.Almacen = Almacen;
