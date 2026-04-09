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
        document.getElementById('btnGuardarDespachoOT')?.addEventListener('click', () => this.guardarDespachoOT(false));
        document.getElementById('btnImprimirDespachoOT')?.addEventListener('click', () => this.guardarDespachoOT(true));
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

    mostrarFormDespacho: async function(otId) {
        const ot = this.ordenes.find(o => o.id === otId);
        if (!ot) return;
        const form = document.getElementById('formDespachoOT');
        if (!form) return;
        form.style.display = '';
        form.dataset.otId = otId;

        // Datos de la OT (read-only)
        document.getElementById('despachoOTNumero').textContent = ot.numeroOrden || ot.nombreOT || '';
        document.getElementById('despachoProducto').textContent = ot.producto || '-';
        document.getElementById('despachoKgPedidos').textContent = (ot.pedidoKg || 0) + ' Kg';
        document.getElementById('despachoMaterial').textContent = ot.tipoMaterial || '-';

        // Auto-llenar datos del cliente desde Supabase
        document.getElementById('despachoCliente').value = ot.cliente || '';
        document.getElementById('despachoClienteRif').value = ot.clienteRif || ot.rifCliente || '';
        document.getElementById('despachoClienteTelefono').value = '';
        document.getElementById('despachoDireccion').value = '';

        // Buscar datos completos del cliente en Supabase
        if (ot.cliente && AxonesDB.isReady()) {
            try {
                const { data: clientes } = await AxonesDB.client.from('clientes')
                    .select('*').ilike('nombre', `%${ot.cliente}%`).limit(1);
                if (clientes && clientes[0]) {
                    const cli = clientes[0];
                    document.getElementById('despachoClienteRif').value = cli.rif || ot.clienteRif || '';
                    document.getElementById('despachoClienteTelefono').value = cli.telefono || '';
                    document.getElementById('despachoDireccion').value = cli.direccion || '';
                }
            } catch (e) { console.warn('[Almacen] Error cargando datos cliente:', e); }
        }

        // Limpiar campos
        ['despachoBobinas', 'despachoKg', 'despachoPaletas', 'despachoChoferNombre',
         'despachoChoferCedula', 'despachoPlaca', 'despachoTransporte',
         'despachoDespachadoPor', 'despachoVerificadoPor', 'despachoAutorizadoPor',
         'despachoObservaciones'].forEach(id => {
            const el = document.getElementById(id); if (el) el.value = '';
        });

        // Fecha por defecto: hoy
        document.getElementById('despachoFecha').value = new Date().toISOString().split('T')[0];

        // Generar correlativo preview
        this.generarCorrelativoND().then(corr => {
            document.getElementById('despachoCorrelativo').textContent = corr + ' (preview)';
        });

        document.getElementById('despachoBobinas').focus();
        // Scroll al formulario
        form.scrollIntoView({ behavior: 'smooth', block: 'start' });
    },

    /**
     * Genera correlativo para nota de despacho: ND-2026-XXXX
     */
    generarCorrelativoND: async function() {
        const year = new Date().getFullYear();
        let despachos = [];
        if (AxonesDB.isReady()) {
            try {
                const { data } = await AxonesDB.client.from('sync_store')
                    .select('value').eq('key', 'axones_notas_despacho').single();
                despachos = data?.value ? (typeof data.value === 'string' ? JSON.parse(data.value) : data.value) : [];
            } catch (e) {}
        }
        const delAnio = despachos.filter(d => (d.correlativo || '').startsWith(`ND-${year}-`));
        const siguiente = delAnio.length + 1;
        return `ND-${year}-${String(siguiente).padStart(4, '0')}`;
    },

    guardarDespachoOT: async function(imprimir) {
        const form = document.getElementById('formDespachoOT');
        const otId = form?.dataset.otId;
        if (!otId) { alert('No hay OT seleccionada'); return; }
        const ot = this.ordenes.find(o => o.id === otId);
        if (!ot) return;

        // Recopilar datos
        const bobinas = parseInt(document.getElementById('despachoBobinas')?.value) || 0;
        const kg = parseFloat(document.getElementById('despachoKg')?.value) || 0;
        const paletas = parseInt(document.getElementById('despachoPaletas')?.value) || 0;
        const fecha = document.getElementById('despachoFecha')?.value || new Date().toISOString().split('T')[0];
        const direccion = document.getElementById('despachoDireccion')?.value?.trim();
        const choferNombre = document.getElementById('despachoChoferNombre')?.value?.trim();
        const choferCedula = document.getElementById('despachoChoferCedula')?.value?.trim();

        // Validaciones
        if (bobinas <= 0) { alert('Indique la cantidad de bobinas'); return; }
        if (kg <= 0) { alert('Indique los Kg totales'); return; }
        if (!direccion) { alert('La direccion del cliente es obligatoria'); return; }
        if (!choferNombre) { alert('El nombre del chofer es obligatorio'); return; }
        if (!choferCedula) { alert('La cedula del chofer es obligatoria'); return; }

        // Generar correlativo
        const correlativo = await this.generarCorrelativoND();

        const nota = {
            id: 'ND_' + Date.now(),
            correlativo: correlativo,
            timestamp: new Date().toISOString(),
            fecha: fecha,
            // Datos OT
            otId: otId,
            otNumero: ot.numeroOrden || ot.nombreOT || '',
            producto: ot.producto || '',
            material: ot.tipoMaterial || '',
            kgPedidos: ot.pedidoKg || 0,
            // Cliente
            cliente: document.getElementById('despachoCliente')?.value?.trim() || ot.cliente || '',
            clienteRif: document.getElementById('despachoClienteRif')?.value?.trim() || '',
            clienteTelefono: document.getElementById('despachoClienteTelefono')?.value?.trim() || '',
            direccion: direccion,
            // Material despachado
            bobinas: bobinas,
            kg: kg,
            paletas: paletas,
            // Chofer
            choferNombre: choferNombre,
            choferCedula: choferCedula,
            placa: document.getElementById('despachoPlaca')?.value?.trim() || '',
            transporte: document.getElementById('despachoTransporte')?.value?.trim() || '',
            // Responsables
            despachadoPor: document.getElementById('despachoDespachadoPor')?.value?.trim() || '',
            verificadoPor: document.getElementById('despachoVerificadoPor')?.value?.trim() || '',
            autorizadoPor: document.getElementById('despachoAutorizadoPor')?.value?.trim() || '',
            observaciones: document.getElementById('despachoObservaciones')?.value?.trim() || '',
            usuario: (typeof Auth !== 'undefined' && Auth.getUser()) ? Auth.getUser().nombre : 'Sistema'
        };

        // Guardar la nota completa en sync_store
        if (AxonesDB.isReady()) {
            try {
                const { data: existing } = await AxonesDB.client.from('sync_store')
                    .select('value').eq('key', 'axones_notas_despacho').single();
                const notas = existing?.value ? (typeof existing.value === 'string' ? JSON.parse(existing.value) : existing.value) : [];
                notas.unshift(nota);
                if (notas.length > 1000) notas.length = 1000;
                await AxonesDB.client.from('sync_store').upsert({
                    key: 'axones_notas_despacho',
                    value: JSON.stringify(notas),
                    updated_at: new Date().toISOString()
                }, { onConflict: 'key' });
            } catch (e) { console.warn('[Almacen] Error guardando ND:', e); }
        }

        // Registrar movimiento
        await this.registrarMovimiento({
            tipo: 'salida',
            referencia: correlativo,
            descripcion: `Despacho OT ${nota.otNumero}: ${bobinas} bobinas (${kg} Kg) para ${nota.cliente}`,
            cantidad: kg,
            unidad: 'Kg',
            proveedor_destino: nota.cliente,
            observaciones: `Chofer: ${choferNombre} (${choferCedula}) ${nota.placa ? '- ' + nota.placa : ''}`,
            notaDespachoId: nota.id
        });

        // Descontar del inventario
        if (AxonesDB.isReady() && ot.tipoMaterial) {
            try {
                const { data: materiales } = await AxonesDB.client.from('materiales')
                    .select('id, stock_kg, material').ilike('material', `%${ot.tipoMaterial}%`)
                    .gt('stock_kg', 0).order('stock_kg', { ascending: false }).limit(1);
                if (materiales && materiales[0]) {
                    const mat = materiales[0];
                    await AxonesDB.client.from('materiales').update({ stock_kg: Math.max(0, (mat.stock_kg || 0) - kg) }).eq('id', mat.id);
                }
            } catch (e) { console.warn('[Almacen] Error descontando:', e); }
        }

        form.style.display = 'none';
        if (typeof showToast === 'function') {
            showToast(`Nota de despacho ${correlativo} guardada`, 'success');
        } else {
            alert(`Nota de despacho ${correlativo} guardada`);
        }

        // Si solicito imprimir, abrir ventana
        if (imprimir) this.imprimirNotaDespacho(nota);
    },

    /**
     * Genera ventana imprimible con la nota de despacho
     */
    imprimirNotaDespacho: function(nota) {
        const html = `<!DOCTYPE html>
<html><head><meta charset="UTF-8"><title>${nota.correlativo}</title>
<style>
body { font-family: Arial, sans-serif; padding: 20px; max-width: 800px; margin: 0 auto; color: #333; }
.header { text-align: center; border-bottom: 3px solid #0d6efd; padding-bottom: 10px; margin-bottom: 20px; }
.header h1 { margin: 0; color: #0d6efd; font-size: 24px; }
.header h2 { margin: 5px 0; font-size: 16px; }
.header p { margin: 2px 0; font-size: 11px; }
.correlativo { background: #fff3cd; padding: 8px; border: 2px solid #ffc107; text-align: center; font-size: 18px; font-weight: bold; margin-bottom: 15px; }
table { width: 100%; border-collapse: collapse; margin-bottom: 12px; font-size: 12px; }
table th, table td { border: 1px solid #999; padding: 6px 8px; text-align: left; }
table th { background: #f0f0f0; font-weight: bold; width: 30%; }
.section-title { background: #0d6efd; color: white; padding: 5px 8px; font-size: 12px; font-weight: bold; margin-top: 15px; margin-bottom: 0; }
.firmas { display: flex; justify-content: space-between; margin-top: 50px; }
.firma { width: 30%; text-align: center; }
.firma-line { border-top: 1px solid #333; padding-top: 5px; font-size: 11px; }
.firma-name { font-weight: bold; font-size: 11px; }
.footer { margin-top: 30px; text-align: center; font-size: 10px; color: #666; border-top: 1px solid #ccc; padding-top: 10px; }
@media print { body { padding: 10px; } .no-print { display: none; } }
</style></head><body>
<div class="header">
    <h1>NOTA DE DESPACHO</h1>
    <h2>INVERSIONES AXONES 2008, C.A.</h2>
    <p>RIF: J-40081341-7 | Calle Parcelamiento Industrial Guere, local 35, sector La Julia, Turmero, Aragua</p>
    <p>Telefono: 0424-316.96.12 | axones2008@gmail.com</p>
</div>

<div class="correlativo">N° ${nota.correlativo}</div>

<div class="section-title">DATOS DEL CLIENTE</div>
<table>
    <tr><th>Cliente</th><td>${nota.cliente || '-'}</td></tr>
    <tr><th>RIF</th><td>${nota.clienteRif || '-'}</td></tr>
    <tr><th>Telefono</th><td>${nota.clienteTelefono || '-'}</td></tr>
    <tr><th>Direccion de Entrega</th><td>${nota.direccion || '-'}</td></tr>
</table>

<div class="section-title">DATOS DE LA ORDEN</div>
<table>
    <tr><th>OT N°</th><td>${nota.otNumero || '-'}</td></tr>
    <tr><th>Producto</th><td>${nota.producto || '-'}</td></tr>
    <tr><th>Material</th><td>${nota.material || '-'}</td></tr>
    <tr><th>Fecha de Despacho</th><td>${nota.fecha || '-'}</td></tr>
</table>

<div class="section-title">MATERIAL DESPACHADO</div>
<table>
    <tr><th>Cantidad de Bobinas</th><td><strong>${nota.bobinas || 0}</strong></td></tr>
    <tr><th>Kg Totales</th><td><strong>${nota.kg || 0} Kg</strong></td></tr>
    <tr><th>N° Paletas</th><td>${nota.paletas || 0}</td></tr>
</table>

<div class="section-title">DATOS DEL TRANSPORTE</div>
<table>
    <tr><th>Chofer</th><td>${nota.choferNombre || '-'}</td></tr>
    <tr><th>Cedula</th><td>${nota.choferCedula || '-'}</td></tr>
    <tr><th>Placa Vehiculo</th><td>${nota.placa || '-'}</td></tr>
    <tr><th>Empresa Transporte</th><td>${nota.transporte || '-'}</td></tr>
</table>

${nota.observaciones ? `<div class="section-title">OBSERVACIONES</div><p style="font-size:12px;padding:8px;background:#f8f9fa;border:1px solid #ddd;">${nota.observaciones}</p>` : ''}

<div class="firmas">
    <div class="firma">
        <div class="firma-line">
            <div class="firma-name">${nota.despachadoPor || ''}</div>
            <div>Autorizado por</div>
        </div>
    </div>
    <div class="firma">
        <div class="firma-line">
            <div class="firma-name">${nota.verificadoPor || ''}</div>
            <div>Despachado por</div>
        </div>
    </div>
    <div class="firma">
        <div class="firma-line">
            <div class="firma-name">${nota.autorizadoPor || ''}</div>
            <div>Recibido por</div>
        </div>
    </div>
</div>

<div class="firmas" style="margin-top: 60px;">
    <div class="firma" style="width: 60%;">
        <div class="firma-line">
            <div class="firma-name">${nota.choferNombre || ''} - C.I: ${nota.choferCedula || ''}</div>
            <div>Recibido por (Chofer)</div>
        </div>
    </div>
    <div class="firma">
        <div class="firma-line">
            <div>Sello / Fecha</div>
        </div>
    </div>
</div>

<div class="footer">
    Sistema Axones - Generado el ${new Date().toLocaleString('es-VE')} por ${nota.usuario || 'Sistema'}
</div>

<div class="no-print" style="text-align:center;margin-top:20px;">
    <button onclick="window.print()" style="padding:10px 20px;font-size:14px;background:#0d6efd;color:white;border:none;border-radius:4px;cursor:pointer;">Imprimir</button>
    <button onclick="window.close()" style="padding:10px 20px;font-size:14px;background:#6c757d;color:white;border:none;border-radius:4px;cursor:pointer;margin-left:10px;">Cerrar</button>
</div>

</body></html>`;
        const w = window.open('', '_blank', 'width=900,height=700');
        w.document.write(html);
        w.document.close();
        setTimeout(() => w.print(), 300);
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
                <datalist id="listaMaterialesRec_${n}"></datalist>
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

    onTipoRecepcionChange: async function(select) {
        const row = select.closest('tr');
        const micrasInput = row.querySelector('.rec-micras');
        const anchoInput = row.querySelector('.rec-ancho');
        const descInput = row.querySelector('.rec-desc');
        const datalist = descInput ? document.getElementById(descInput.getAttribute('list')) : null;
        const tipo = select.value;
        const isSustrato = tipo === 'Sustrato';

        if (micrasInput) { micrasInput.style.display = isSustrato ? '' : 'none'; }
        if (anchoInput) { anchoInput.style.display = isSustrato ? '' : 'none'; }

        // Cargar opciones del inventario segun tipo
        if (!datalist || !tipo) return;
        datalist.innerHTML = '';

        if (!AxonesDB.isReady()) return;

        try {
            if (tipo === 'Sustrato') {
                const { data } = await AxonesDB.client.from('materiales').select('material, micras, ancho, stock_kg, sku').order('material');
                const unicos = new Set();
                (data || []).forEach(m => {
                    const nombre = m.material || '';
                    if (!unicos.has(nombre)) {
                        unicos.add(nombre);
                        datalist.innerHTML += `<option value="${nombre}">`;
                    }
                });
            } else if (tipo === 'Tinta') {
                const { data } = await AxonesDB.client.from('tintas').select('nombre, tipo, stock_kg').eq('activo', true).order('nombre');
                (data || []).forEach(t => {
                    datalist.innerHTML += `<option value="${t.nombre || ''} (${t.tipo || ''})">`;
                });
            } else if (tipo === 'Quimico') {
                const { data } = await AxonesDB.client.from('adhesivos').select('nombre, tipo, stock_kg').order('nombre');
                (data || []).forEach(a => {
                    datalist.innerHTML += `<option value="${a.nombre || ''}">`;
                });
            }
            // Consumible y Otro: no tienen tabla, el usuario escribe libre
        } catch (e) { console.warn('[Almacen] Error cargando inventario para tipo:', e); }
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
            descripcion: `Recepcion ${proveedor}: ${items.map(i => `${i.descripcion} (${i.cantidad} ${i.unidad})`).join(', ')}`,
            cantidad: recepcion.totalCantidad,
            unidad: items[0]?.unidad || 'Kg',
            proveedor_destino: proveedor,
            observaciones: `FAC: ${factura} | OC: ${oc}${obs ? ' | ' + obs : ''}`,
            recepcionId: recepcion.id
        });

        // Actualizar inventario para TODOS los tipos de items
        if (AxonesDB.isReady()) {
            for (const item of items) {
                try {
                    if (item.tipo === 'Sustrato') {
                        const desc = item.material || item.descripcion || '';
                        let encontrado = false;

                        // Buscar por nombre exacto + micras + ancho
                        if (item.micras && item.ancho) {
                            const { data } = await AxonesDB.client.from('materiales')
                                .select('id, stock_kg').ilike('material', `%${desc}%`)
                                .eq('micras', parseFloat(item.micras)).eq('ancho', parseFloat(item.ancho)).limit(1);
                            if (data && data[0]) {
                                await AxonesDB.client.from('materiales').update({ stock_kg: (data[0].stock_kg || 0) + item.cantidad }).eq('id', data[0].id);
                                encontrado = true;
                            }
                        }
                        // Buscar por nombre
                        if (!encontrado) {
                            const { data } = await AxonesDB.client.from('materiales')
                                .select('id, stock_kg').ilike('material', `%${desc.split(' ')[0]}%`)
                                .order('stock_kg', { ascending: false }).limit(1);
                            if (data && data[0]) {
                                await AxonesDB.client.from('materiales').update({ stock_kg: (data[0].stock_kg || 0) + item.cantidad }).eq('id', data[0].id);
                                encontrado = true;
                            }
                        }
                        // CREAR si no existe
                        if (!encontrado) {
                            await AxonesDB.client.from('materiales').insert({
                                material: desc, micras: parseFloat(item.micras) || null,
                                ancho: parseFloat(item.ancho) || null, stock_kg: item.cantidad, activo: true
                            });
                            console.log(`[Almacen] Nuevo material creado: ${desc}`);
                        }
                    } else if (item.tipo === 'Tinta') {
                        const nombre = (item.descripcion || '').split('(')[0].trim();
                        const { data } = await AxonesDB.client.from('tintas')
                            .select('id, stock_kg').ilike('nombre', `%${nombre}%`).limit(1);
                        if (data && data[0]) {
                            await AxonesDB.client.from('tintas').update({ stock_kg: (data[0].stock_kg || 0) + item.cantidad }).eq('id', data[0].id);
                        } else {
                            await AxonesDB.client.from('tintas').insert({ nombre: nombre, stock_kg: item.cantidad, activo: true });
                            console.log(`[Almacen] Nueva tinta creada: ${nombre}`);
                        }
                    } else if (item.tipo === 'Quimico') {
                        const nombre = item.descripcion || '';
                        const { data } = await AxonesDB.client.from('adhesivos')
                            .select('id, stock_kg').ilike('nombre', `%${nombre.split(' ')[0]}%`).limit(1);
                        if (data && data[0]) {
                            await AxonesDB.client.from('adhesivos').update({ stock_kg: (data[0].stock_kg || 0) + item.cantidad }).eq('id', data[0].id);
                        } else {
                            await AxonesDB.client.from('adhesivos').insert({ nombre: nombre, stock_kg: item.cantidad, activo: true });
                            console.log(`[Almacen] Nuevo quimico creado: ${nombre}`);
                        }
                    }
                    // Consumibles y Otros no actualizan inventario (no tienen tabla)
                } catch (e) { console.warn(`[Almacen] Error actualizando inventario para ${item.descripcion}:`, e); }
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
            <td><select class="form-select form-select-sm misc-unidad">
                <option value="Unidad">Unidad</option><option value="Kg">Kg</option><option value="Lt">Lt</option><option value="Rollo">Rollo</option><option value="Caja">Caja</option><option value="Par">Par</option>
            </select></td>
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
        tbody.innerHTML = movs.slice(0, 200).map((m, idx) => {
            const esRec = (m.referencia || '').startsWith('REC-') && m.recepcionId;
            const esMisc = (m.referencia || '').startsWith('MISC-') && m.despachoId;
            const esND = (m.referencia || '').startsWith('ND-') && m.notaDespachoId;
            const onclick = esRec ? `Almacen.verDetalleRecepcion('${m.recepcionId}')` :
                            esMisc ? `Almacen.verDetalleMisc('${m.despachoId}')` :
                            esND ? `Almacen.verDetalleND('${m.notaDespachoId}')` :
                            `Almacen.verDetalleMovimiento(${idx})`;
            return `
            <tr style="cursor:pointer;" onclick="${onclick}">
                <td>${m.fecha || '-'}</td>
                <td><span class="badge ${tc[m.tipo] || 'bg-secondary'}">${(m.tipo || '').toUpperCase()}</span></td>
                <td><strong>${m.referencia || '-'}</strong> <i class="bi bi-eye ms-1 text-primary"></i></td>
                <td>${m.descripcion || '-'}</td>
                <td class="text-end fw-bold">${m.cantidad || 0} ${m.unidad || 'Kg'}</td>
                <td>${m.proveedor_destino || '-'}</td>
                <td>${m.usuario || '-'}</td>
                <td><small>${m.observaciones || '-'}</small></td>
            </tr>`;
        }).join('');

        // Guardar movimientos filtrados para acceso por indice
        this._movimientosFiltrados = movs;
    },

    /**
     * Muestra modal con detalle de una recepcion (todos los items)
     */
    /**
     * Muestra detalle de un movimiento generico (sin recepcion/despacho asociado)
     */
    verDetalleMovimiento: function(idx) {
        const m = (this._movimientosFiltrados || [])[idx];
        if (!m) return;

        document.getElementById('modalDetalleAlmacen')?.remove();

        const tc = { entrada: 'bg-success', salida: 'bg-danger', ajuste: 'bg-warning text-dark' };
        const html = `
        <div class="modal fade" id="modalDetalleAlmacen" tabindex="-1">
            <div class="modal-dialog">
                <div class="modal-content">
                    <div class="modal-header py-2">
                        <h6 class="modal-title"><i class="bi bi-file-text me-2"></i>Detalle del Movimiento</h6>
                        <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                    </div>
                    <div class="modal-body">
                        <div class="row g-2">
                            <div class="col-6"><small class="text-muted d-block">Fecha</small><strong>${m.fecha || '-'}</strong></div>
                            <div class="col-6"><small class="text-muted d-block">Tipo</small><span class="badge ${tc[m.tipo] || 'bg-secondary'}">${(m.tipo || '').toUpperCase()}</span></div>
                            <div class="col-6"><small class="text-muted d-block">Referencia</small><strong>${m.referencia || '-'}</strong></div>
                            <div class="col-6"><small class="text-muted d-block">Cantidad</small><strong>${m.cantidad || 0} ${m.unidad || 'Kg'}</strong></div>
                            <div class="col-12"><small class="text-muted d-block">Descripcion</small><strong>${m.descripcion || '-'}</strong></div>
                            <div class="col-6"><small class="text-muted d-block">Proveedor / Destino</small><strong>${m.proveedor_destino || '-'}</strong></div>
                            <div class="col-6"><small class="text-muted d-block">Usuario</small><strong>${m.usuario || '-'}</strong></div>
                            ${m.observaciones ? `<div class="col-12"><small class="text-muted d-block">Observaciones</small><p class="mb-0">${m.observaciones}</p></div>` : ''}
                            <div class="col-12"><small class="text-muted d-block">Hora</small>${m.timestamp ? new Date(m.timestamp).toLocaleString('es-VE') : '-'}</div>
                        </div>
                    </div>
                    <div class="modal-footer py-1">
                        <button type="button" class="btn btn-outline-primary btn-sm" onclick="const b=document.querySelector('#modalDetalleAlmacen .modal-body');if(b){const w=window.open('','_blank');w.document.write('<html><head><title>Detalle Movimiento</title><link href=\\'https://cdn.jsdelivr.net/npm/bootstrap@5.3.2/dist/css/bootstrap.min.css\\' rel=\\'stylesheet\\'></head><body class=\\'p-3\\'>'+b.innerHTML+'</body></html>');w.document.close();setTimeout(()=>w.print(),300);}"><i class="bi bi-printer me-1"></i>Imprimir</button>
                        <button type="button" class="btn btn-secondary btn-sm" data-bs-dismiss="modal">Cerrar</button>
                    </div>
                </div>
            </div>
        </div>`;
        document.body.insertAdjacentHTML('beforeend', html);
        new bootstrap.Modal(document.getElementById('modalDetalleAlmacen')).show();
    },

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
     * Muestra detalle de una nota de despacho (re-imprimir)
     */
    verDetalleND: async function(notaId) {
        if (!AxonesDB.isReady()) return;
        try {
            const { data } = await AxonesDB.client.from('sync_store')
                .select('value').eq('key', 'axones_notas_despacho').single();
            const notas = data?.value ? (typeof data.value === 'string' ? JSON.parse(data.value) : data.value) : [];
            const nota = notas.find(n => n.id === notaId);
            if (!nota) { alert('Nota de despacho no encontrada'); return; }
            this.imprimirNotaDespacho(nota);
        } catch (e) { console.warn('Error cargando nota:', e); }
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
                        <button type="button" class="btn btn-primary btn-sm" onclick="const b=document.querySelector('#modalDetalleAlmacen .modal-body');if(b){const w=window.open('','_blank');w.document.write('<html><head><title>Detalle</title><link href=\\'https://cdn.jsdelivr.net/npm/bootstrap@5.3.2/dist/css/bootstrap.min.css\\' rel=\\'stylesheet\\'></head><body class=\\'p-3\\'>'+b.innerHTML+'</body></html>');w.document.close();setTimeout(()=>w.print(),300);}"><i class="bi bi-printer me-1"></i>Imprimir</button>
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
