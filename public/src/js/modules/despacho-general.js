/**
 * DespachoGeneral - Notas de Salida General
 *
 * Para despachar items que NO son producto terminado (no van a Despacho OT):
 *   - Desperdicio (refile, scrap acumulado)
 *   - Tambores vacios
 *   - Devoluciones a proveedor
 *   - Bobinas malas
 *   - Material obsoleto
 *   - Muestras
 *
 * Genera nota imprimible tipo Nota de Despacho con descripcion editable.
 *
 * Almacenamiento: sync_store key 'axones_notas_salida_general'
 */

const DespachoGeneral = {
    notas: [],
    SYNC_KEY: 'axones_notas_salida_general',

    init: async function() {
        if (typeof AxonesDB !== 'undefined' && !AxonesDB.isReady()) {
            await AxonesDB.init();
        }
        await this.cargar();
        this.setupForm();
        this.renderHistorial();
    },

    cargar: async function() {
        try {
            if (AxonesDB.isReady()) {
                const { data } = await AxonesDB.client.from('sync_store')
                    .select('value').eq('key', this.SYNC_KEY).maybeSingle();
                this.notas = data?.value ? JSON.parse(data.value) : [];
            }
            if (this.notas.length === 0) {
                this.notas = JSON.parse(localStorage.getItem(this.SYNC_KEY) || '[]');
            }
        } catch(e) { console.warn('NSG: error cargando', e); this.notas = []; }
    },

    setupForm: function() {
        document.getElementById('nsgFecha').value = new Date().toISOString().split('T')[0];
        this.actualizarCorrelativo();
        if (document.querySelectorAll('#bodyItemsNSG tr').length === 0) {
            this.agregarItem();
        }
    },

    actualizarCorrelativo: function() {
        const year = new Date().getFullYear();
        const mismas = this.notas.filter(n => (n.correlativo || '').startsWith(`NS-${year}-`));
        const next = `NS-${year}-${String(mismas.length + 1).padStart(4, '0')}`;
        const el = document.getElementById('nsgCorrelativo');
        if (el) el.textContent = next + ' (preview)';
        return next;
    },

    agregarItem: function() {
        const body = document.getElementById('bodyItemsNSG');
        if (!body) return;
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td><input type="text" class="form-control form-control-sm nsg-desc" placeholder="Ej: Desperdicio impresion, Tambor vacio Adhesivo, etc."></td>
            <td><input type="number" class="form-control form-control-sm nsg-cant" min="0" step="0.01" value="1"></td>
            <td>
                <select class="form-select form-select-sm nsg-unidad">
                    <option value="Kg">Kg</option>
                    <option value="Unidad">Unidad</option>
                    <option value="Lt">Lt</option>
                    <option value="Tambor">Tambor</option>
                    <option value="Bobina">Bobina</option>
                    <option value="Caja">Caja</option>
                    <option value="Saco">Saco</option>
                </select>
            </td>
            <td class="text-center"><button type="button" class="btn btn-sm btn-outline-danger" onclick="this.closest('tr').remove()"><i class="bi bi-x"></i></button></td>
        `;
        body.appendChild(tr);
    },

    limpiar: function() {
        ['nsgTipo', 'nsgDestino', 'nsgChoferNombre', 'nsgCedula', 'nsgPlaca',
         'nsgAutorizado', 'nsgDespachado', 'nsgVerificado', 'nsgObservaciones'].forEach(id => {
            const el = document.getElementById(id); if (el) el.value = '';
        });
        document.getElementById('bodyItemsNSG').innerHTML = '';
        this.agregarItem();
        this.setupForm();
    },

    guardar: async function(imprimir) {
        const tipo = document.getElementById('nsgTipo')?.value;
        if (!tipo) { alert('Seleccione el tipo de salida'); return; }

        const items = [];
        document.querySelectorAll('#bodyItemsNSG tr').forEach(tr => {
            const desc = tr.querySelector('.nsg-desc')?.value?.trim();
            const cant = parseFloat(tr.querySelector('.nsg-cant')?.value) || 0;
            const unidad = tr.querySelector('.nsg-unidad')?.value || 'Unidad';
            if (desc && cant > 0) items.push({ descripcion: desc, cantidad: cant, unidad });
        });
        if (items.length === 0) { alert('Agregue al menos un item con descripcion y cantidad'); return; }

        const correlativo = this.actualizarCorrelativo();
        const nota = {
            id: Date.now().toString(36) + Math.random().toString(36).substr(2, 5),
            correlativo,
            fecha: document.getElementById('nsgFecha').value || new Date().toISOString().split('T')[0],
            tipo,
            destino: document.getElementById('nsgDestino')?.value || '',
            items,
            chofer: {
                nombre: document.getElementById('nsgChoferNombre')?.value || '',
                cedula: document.getElementById('nsgCedula')?.value || '',
                placa: document.getElementById('nsgPlaca')?.value || '',
            },
            autorizadoPor: document.getElementById('nsgAutorizado')?.value || '',
            despachadoPor: document.getElementById('nsgDespachado')?.value || '',
            verificadoPor: document.getElementById('nsgVerificado')?.value || '',
            observaciones: document.getElementById('nsgObservaciones')?.value || '',
            timestamp: new Date().toISOString(),
        };

        this.notas.unshift(nota);
        await this._guardarNotas();
        await this._registrarMovimiento(nota);

        alert(`Nota ${correlativo} guardada`);
        if (imprimir) this.imprimir(nota);

        this.limpiar();
        this.renderHistorial();
    },

    _guardarNotas: async function() {
        const json = JSON.stringify(this.notas);
        localStorage.setItem(this.SYNC_KEY, json);
        try {
            if (AxonesDB.isReady()) {
                await AxonesDB.client.from('sync_store').upsert({
                    key: this.SYNC_KEY,
                    value: json,
                    updated_at: new Date().toISOString()
                }, { onConflict: 'key' });
            }
        } catch(e) { console.error('NSG: error guardando', e); }
    },

    _registrarMovimiento: async function(nota) {
        try {
            const { data: existing } = await AxonesDB.client.from('sync_store')
                .select('value').eq('key', 'axones_movimientos_almacen').maybeSingle();
            const movs = existing?.value ? JSON.parse(existing.value) : [];
            movs.unshift({
                id: 'mov-nsg-' + nota.id,
                fecha: nota.fecha,
                tipo: 'salida',
                referencia: nota.correlativo,
                cliente: nota.destino,
                cantidad: nota.items.reduce((s, i) => s + i.cantidad, 0),
                unidad: nota.items[0]?.unidad || 'Unidad',
                descripcion: `Salida General (${nota.tipo}): ${nota.items.map(i => i.descripcion).join(', ')}`,
                timestamp: nota.timestamp,
            });
            if (movs.length > 1000) movs.length = 1000;
            const json = JSON.stringify(movs);
            localStorage.setItem('axones_movimientos_almacen', json);
            await AxonesDB.client.from('sync_store').upsert({
                key: 'axones_movimientos_almacen',
                value: json,
                updated_at: new Date().toISOString()
            }, { onConflict: 'key' });
        } catch(e) { console.warn('NSG: error registrando movimiento', e); }
    },

    renderHistorial: function() {
        const tbody = document.getElementById('tablaHistorialNSG');
        const badge = document.getElementById('badgeHistNSG');
        if (!tbody) return;
        if (badge) badge.textContent = this.notas.length;

        if (this.notas.length === 0) {
            tbody.innerHTML = '<tr><td colspan="7" class="text-center text-muted py-4">No hay notas de salida registradas</td></tr>';
            return;
        }

        const tipoLabel = {
            desperdicio: 'Desperdicio',
            tambores_vacios: 'Tambores Vacios',
            devolucion_proveedor: 'Devolucion',
            bobinas_malas: 'Bobinas Malas',
            material_obsoleto: 'Material Obsoleto',
            muestra: 'Muestra',
            otro: 'Otro',
        };

        tbody.innerHTML = this.notas.slice(0, 100).map(n => `
            <tr>
                <td><strong>${n.correlativo}</strong></td>
                <td>${n.fecha}</td>
                <td><span class="badge bg-warning text-dark">${tipoLabel[n.tipo] || n.tipo}</span></td>
                <td><small>${n.destino || '-'}</small></td>
                <td><small>${n.items.length} item(s)</small></td>
                <td><small>${n.chofer?.nombre || '-'}</small></td>
                <td class="text-center">
                    <button class="btn btn-sm btn-outline-primary" onclick='DespachoGeneral.imprimir(${JSON.stringify(n).replace(/'/g, "&apos;")})' title="Imprimir">
                        <i class="bi bi-printer"></i>
                    </button>
                </td>
            </tr>
        `).join('');
    },

    imprimir: function(nota) {
        const tipoLabel = {
            desperdicio: 'Desperdicio', tambores_vacios: 'Tambores Vacios',
            devolucion_proveedor: 'Devolucion a Proveedor', bobinas_malas: 'Bobinas Malas',
            material_obsoleto: 'Material Obsoleto', muestra: 'Muestra', otro: 'Otro',
        };
        const itemsHtml = nota.items.map(i =>
            `<tr><td>${i.descripcion}</td><td class="text-end">${i.cantidad}</td><td>${i.unidad}</td></tr>`
        ).join('');
        const w = window.open('', '_blank');
        w.document.write(`
            <html><head><title>Nota Salida ${nota.correlativo}</title>
            <style>
                body { font-family: Arial; padding: 20px; max-width: 800px; margin: 0 auto; }
                h1 { color: #fd7e14; text-align: center; margin-bottom: 5px; }
                .empresa { text-align: center; margin-bottom: 20px; font-size: 12px; }
                .info { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin: 15px 0; }
                table { width: 100%; border-collapse: collapse; margin: 15px 0; }
                th, td { border: 1px solid #333; padding: 8px; }
                th { background: #f0f0f0; }
                .firmas { margin-top: 60px; display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 30px; }
                .firma { text-align: center; }
                .firma hr { margin-bottom: 5px; }
                .badge { background: #fd7e14; color: white; padding: 3px 10px; border-radius: 4px; }
            </style></head><body>
                <h1>NOTA DE SALIDA GENERAL</h1>
                <div class="empresa">
                    <strong>INVERSIONES AXONES 2008, C.A.</strong><br>
                    RIF: J-40081341-7 | Turmero, Aragua | Tel: 0424-316.96.12
                </div>
                <div class="info">
                    <div><strong>N° NS:</strong> <span class="badge">${nota.correlativo}</span></div>
                    <div><strong>Fecha:</strong> ${nota.fecha}</div>
                    <div><strong>Tipo:</strong> ${tipoLabel[nota.tipo] || nota.tipo}</div>
                    <div><strong>Destino:</strong> ${nota.destino || '-'}</div>
                </div>
                <h3>Items Despachados</h3>
                <table>
                    <thead><tr><th>Descripcion</th><th class="text-end">Cantidad</th><th>Unidad</th></tr></thead>
                    <tbody>${itemsHtml}</tbody>
                </table>
                <h3>Transporte</h3>
                <div class="info">
                    <div><strong>Chofer:</strong> ${nota.chofer?.nombre || '-'}</div>
                    <div><strong>Cedula:</strong> ${nota.chofer?.cedula || '-'}</div>
                    <div><strong>Placa:</strong> ${nota.chofer?.placa || '-'}</div>
                </div>
                ${nota.observaciones ? `<p><strong>Observaciones:</strong> ${nota.observaciones}</p>` : ''}
                <div class="firmas">
                    <div class="firma"><hr><small>Autorizado por<br>${nota.autorizadoPor || ''}</small></div>
                    <div class="firma"><hr><small>Despachado por<br>${nota.despachadoPor || ''}</small></div>
                    <div class="firma"><hr><small>Recibido por<br>(Chofer / Receptor)</small></div>
                </div>
            </body></html>`);
        w.document.close();
        setTimeout(() => w.print(), 500);
    },
};

if (typeof window !== 'undefined') window.DespachoGeneral = DespachoGeneral;
document.addEventListener('DOMContentLoaded', () => DespachoGeneral.init());
