/**
 * Modulo Movimientos de Orden - Sistema Axones
 * Muestra el historial completo de una OT: cada fase, material usado, alertas, despachos.
 *
 * Consulta todas las tablas relacionadas con una OT:
 *   - ordenes_trabajo (datos maestros)
 *   - produccion_impresion / laminacion / corte
 *   - bobinas + bobinas_historial (trazabilidad)
 *   - sync_store: axones_montajes, axones_notas_despacho, axones_consumo_tintas
 *   - alertas (filtradas por referencia o mensaje que contenga el OT)
 */

const MovimientosOrden = {
    ordenes: [],
    otSeleccionada: null,
    movimientos: [],

    init: async function() {
        if (typeof AxonesDB !== 'undefined' && !AxonesDB.isReady()) {
            await AxonesDB.init();
        }
        await this.cargarOTs();
        this.setupEvents();

        window.addEventListener('axones-sync', async () => {
            await this.cargarOTs();
        });
    },

    cargarOTs: async function() {
        try {
            if (AxonesDB.isReady() && AxonesDB.ordenesHelper) {
                this.ordenes = await AxonesDB.ordenesHelper.cargar() || [];
            }
        } catch(e) { console.warn('MovOrden: Error cargando OTs:', e); }

        const sel = document.getElementById('selectorOT');
        if (!sel) return;
        sel.innerHTML = '<option value="">-- Seleccionar OT --</option>';
        this.ordenes.sort((a,b) => (b.numeroOrden || '').localeCompare(a.numeroOrden || ''));
        this.ordenes.forEach(ot => {
            const num = ot.numeroOrden || ot.nombreOT || ot.id;
            const opt = document.createElement('option');
            opt.value = num;
            opt.textContent = `${num} - ${ot.cliente || ''} - ${ot.producto || ''}`;
            sel.appendChild(opt);
        });
    },

    setupEvents: function() {
        document.getElementById('selectorOT')?.addEventListener('change', (e) => {
            if (e.target.value) this.seleccionarOT(e.target.value);
            else this.ocultar();
        });
        document.getElementById('btnRefresh')?.addEventListener('click', async () => {
            await this.cargarOTs();
            if (this.otSeleccionada) await this.seleccionarOT(this.otSeleccionada.numeroOrden || this.otSeleccionada.nombreOT);
        });
        document.getElementById('btnExportar')?.addEventListener('click', () => this.exportarPDF());
    },

    ocultar: function() {
        document.getElementById('contenidoOT').style.display = 'none';
        document.getElementById('sinOT').style.display = '';
        document.getElementById('btnExportar').disabled = true;
        this.otSeleccionada = null;
    },

    seleccionarOT: async function(numeroOT) {
        const ot = this.ordenes.find(o => (o.numeroOrden === numeroOT) || (o.nombreOT === numeroOT) || (o.id === numeroOT));
        if (!ot) { alert('OT no encontrada'); return; }
        this.otSeleccionada = ot;

        document.getElementById('sinOT').style.display = 'none';
        document.getElementById('contenidoOT').style.display = '';
        document.getElementById('btnExportar').disabled = false;

        this.renderEncabezado(ot);
        await this.cargarYRenderizarMovimientos(ot);
    },

    renderEncabezado: function(ot) {
        const set = (id, v) => { const el = document.getElementById(id); if (el) el.textContent = v || '-'; };
        set('otNumero', ot.numeroOrden || ot.nombreOT);
        set('otEstado', ot.estadoOrden || 'pendiente');
        set('otCliente', ot.cliente);
        set('otRif', ot.rifCliente || ot.clienteRif);
        set('otFechaEntrega', ot.fechaEntrega);
        set('otProducto', ot.producto);
        set('otCpe', ot.cpe || ot.sku);
        set('otPedido', (ot.pedidoKg || 0) + ' Kg');
        set('otEstructura', ot.estructuraMaterial || ot.tipoMaterial);
        set('otMaquina', ot.maquina);
        set('otAncho', ot.ancho);
    },
    cargarYRenderizarMovimientos: async function(ot) {
        const numOT = ot.numeroOrden || ot.nombreOT;
        const movs = [];

        // 1. OT creada
        if (ot.created_at || ot.fechaInicio) {
            movs.push({
                fase: 'ordenes',
                fecha: ot.created_at || ot.fechaInicio,
                titulo: `OT ${numOT} creada`,
                descripcion: `Cliente: ${ot.cliente || '-'}. Pedido: ${ot.pedidoKg || 0} Kg de ${ot.producto || '-'}.`,
                datos: ot,
            });
        }

        // 2. Montajes desde sync_store
        try {
            if (AxonesDB.isReady()) {
                const { data } = await AxonesDB.client.from('sync_store')
                    .select('valor').eq('clave', 'axones_montajes').maybeSingle();
                const montajes = data?.valor ? JSON.parse(data.valor) : [];
                montajes.filter(m => m.otNumero === numOT).forEach(m => {
                    movs.push({
                        fase: 'montaje',
                        fecha: m.fechaInicio,
                        titulo: `Montaje - ${m.maquina || '-'}`,
                        descripcion: `Operador: ${m.operador}. Duracion: ${m.duracionMin} min ${m.superoUmbral ? '(SUPERO 1h)' : ''}. Cliche: ${m.numCliche || '-'} | Cilindro: ${m.numCilindro || '-'}.`,
                        detalles: [
                            { label: 'Fecha inicio', valor: m.fechaInicio ? new Date(m.fechaInicio).toLocaleString('es-VE') : '-' },
                            { label: 'Fecha fin', valor: m.fechaFin ? new Date(m.fechaFin).toLocaleString('es-VE') : '-' },
                            { label: 'Materiales usados', valor: (m.materiales || []).map(mt => `${mt.descripcion} (${mt.cantidad} ${mt.unidad})`).join(', ') || '(ninguno)' },
                            { label: 'Observaciones', valor: m.observaciones || '-' },
                        ],
                    });
                });
            }
        } catch(e) { console.warn('MovOrden: montajes:', e); }

        // 3. Produccion de cada fase
        for (const [tabla, fase] of [
            ['produccion_impresion', 'impresion'],
            ['produccion_laminacion', 'laminacion'],
            ['produccion_corte', 'corte'],
        ]) {
            try {
                const { data } = await AxonesDB.client.from(tabla).select('*').eq('numero_ot', numOT);
                (data || []).forEach(r => {
                    const entrada = parseFloat(r.total_entrada) || 0;
                    const salida = parseFloat(r.peso_total_salida || r.total_salida) || 0;
                    const merma = parseFloat(r.merma) || 0;
                    const pct = entrada > 0 ? ((merma / entrada) * 100).toFixed(1) : '0';
                    movs.push({
                        fase: fase,
                        fecha: r.fecha,
                        titulo: `${fase.charAt(0).toUpperCase() + fase.slice(1)} - ${r.maquina || '-'} (${r.turno || '-'})`,
                        descripcion: `Operador: ${r.operador || '-'}. Entrada: ${entrada.toFixed(2)} Kg | Salida: ${salida.toFixed(2)} Kg | Merma: ${merma.toFixed(2)} Kg (${pct}%).`,
                        detalles: [
                            { label: 'Fecha', valor: r.fecha || '-' },
                            { label: 'Turno', valor: r.turno || '-' },
                            { label: 'Kg Entrada', valor: entrada.toFixed(2) },
                            { label: 'Kg Salida', valor: salida.toFixed(2) },
                            { label: 'Merma', valor: merma.toFixed(2) + ' Kg (' + pct + '%)' },
                            { label: 'Scrap', valor: (parseFloat(r.total_scrap || r.scrap_refile) || 0).toFixed(2) + ' Kg' },
                            { label: 'Num paletas', valor: r.num_paletas || '-' },
                        ],
                        _tipo: 'produccion',
                        _registro: r,
                    });
                });
            } catch(e) { console.warn('MovOrden: ' + tabla, e); }
        }

        // 4. Consumo de tintas
        try {
            const { data } = await AxonesDB.client.from('sync_store')
                .select('valor').eq('clave', 'axones_consumo_tintas').maybeSingle();
            const consumos = data?.valor ? JSON.parse(data.valor) : [];
            consumos.filter(c => c.ordenTrabajo === numOT).forEach(c => {
                movs.push({
                    fase: 'impresion',
                    fecha: c.fecha,
                    titulo: `Consumo de tintas`,
                    descripcion: `${(c.tintas || []).length} tinta(s). Total: ${(c.totalTintas || 0).toFixed(2)} Kg. Solventes: ${(c.totalSolventes || 0).toFixed(2)} Lt.`,
                    detalles: (c.tintas || []).map(t => ({
                        label: t.nombre || t.codigo,
                        valor: `${t.kgUsado || 0} Kg (${t.tipo || '-'}, ${t.proveedor || '-'})`
                    })),
                });
            });
        } catch(e) { console.warn('MovOrden: tintas:', e); }

        // 5. Despachos
        try {
            const { data } = await AxonesDB.client.from('sync_store')
                .select('valor').eq('clave', 'axones_notas_despacho').maybeSingle();
            const notas = data?.valor ? JSON.parse(data.valor) : [];
            notas.filter(n => n.otNumero === numOT).forEach(n => {
                movs.push({
                    fase: 'despacho',
                    fecha: n.fecha,
                    titulo: `Despacho ${n.correlativo}`,
                    descripcion: `${n.totalBobinas} bobinas, ${(n.totalKg || 0).toFixed(2)} Kg. Chofer: ${n.chofer?.nombre || '-'} (${n.placa || '-'}).`,
                    detalles: [
                        { label: 'Nota de entrega', valor: n.correlativo },
                        { label: 'Cliente', valor: n.cliente },
                        { label: 'Direccion', valor: n.direccion },
                        { label: 'Chofer', valor: `${n.chofer?.nombre || '-'} / Cedula: ${n.chofer?.cedula || '-'}` },
                        { label: 'Paletas', valor: (n.paletas || []).length + ' paletas' },
                    ],
                });
            });
        } catch(e) { console.warn('MovOrden: despachos:', e); }

        // 6. Alertas relacionadas con esta OT
        try {
            const { data } = await AxonesDB.client.from('alertas')
                .select('*').ilike('mensaje', `%${numOT}%`).order('created_at', { ascending: false }).limit(50);
            (data || []).forEach(a => {
                movs.push({
                    fase: 'alerta',
                    fecha: a.created_at,
                    titulo: `Alerta: ${a.titulo}`,
                    descripcion: a.mensaje,
                    _alerta: true,
                    _nivel: a.tipo,
                });
            });
        } catch(e) { console.warn('MovOrden: alertas:', e); }

        // Ordenar cronologicamente
        movs.sort((a, b) => new Date(a.fecha || 0) - new Date(b.fecha || 0));
        this.movimientos = movs;

        this.renderResumenFase(movs);
        this.renderKPIs(movs);
        this.renderTimeline(movs);
    },

    renderKPIs: function(movs) {
        const prod = movs.filter(m => m._tipo === 'produccion');
        let materialUsado = 0, productoTerminado = 0, mermaTotal = 0, kgDespachados = 0;

        prod.forEach(m => {
            const r = m._registro;
            const entrada = parseFloat(r.total_entrada) || 0;
            const salida = parseFloat(r.peso_total_salida || r.total_salida) || 0;
            const merma = parseFloat(r.merma) || 0;
            if (m.fase === 'impresion') materialUsado += entrada;
            if (m.fase === 'corte') productoTerminado += salida;
            mermaTotal += merma;
        });
        movs.filter(m => m.fase === 'despacho').forEach(m => {
            const match = m.descripcion.match(/,\s*([\d.]+)\s*Kg/);
            if (match) kgDespachados += parseFloat(match[1]);
        });
        const alertas = movs.filter(m => m._alerta).length;
        const pctMerma = materialUsado > 0 ? ((mermaTotal / materialUsado) * 100).toFixed(1) + '%' : '0%';

        const set = (id, v) => { const el = document.getElementById(id); if (el) el.textContent = v; };
        set('kpiMaterialUsado', materialUsado.toFixed(0));
        set('kpiProductoTerminado', productoTerminado.toFixed(0));
        set('kpiMermaTotal', mermaTotal.toFixed(0));
        set('kpiPctMerma', pctMerma);
        set('kpiKgDespachados', kgDespachados.toFixed(0));
        set('kpiAlertas', alertas);
    },

    renderResumenFase: function(movs) {
        const tbody = document.getElementById('tablaResumenFase');
        if (!tbody) return;
        const fases = ['montaje', 'impresion', 'laminacion', 'corte', 'despacho'];
        const filas = fases.map(fase => {
            const items = movs.filter(m => m.fase === fase && m._tipo === 'produccion');
            const entrada = items.reduce((s, m) => s + (parseFloat(m._registro?.total_entrada) || 0), 0);
            const salida = items.reduce((s, m) => s + (parseFloat(m._registro?.peso_total_salida || m._registro?.total_salida) || 0), 0);
            const merma = items.reduce((s, m) => s + (parseFloat(m._registro?.merma) || 0), 0);
            const pct = entrada > 0 ? ((merma / entrada) * 100).toFixed(1) + '%' : '-';
            const count = movs.filter(m => m.fase === fase).length;
            const ultima = movs.filter(m => m.fase === fase).sort((a,b) => new Date(b.fecha||0) - new Date(a.fecha||0))[0];
            return `<tr>
                <td><span class="badge bg-secondary">${fase}</span></td>
                <td>${count}</td>
                <td class="text-end">${entrada ? entrada.toFixed(2) : '-'}</td>
                <td class="text-end">${salida ? salida.toFixed(2) : '-'}</td>
                <td class="text-end">${merma ? merma.toFixed(2) : '-'}</td>
                <td class="text-end">${pct}</td>
                <td><small>${ultima?.fecha ? new Date(ultima.fecha).toLocaleString('es-VE') : '-'}</small></td>
            </tr>`;
        });
        tbody.innerHTML = filas.join('');
    },

    renderTimeline: function(movs) {
        const cont = document.getElementById('timeline');
        if (!cont) return;
        if (movs.length === 0) {
            cont.innerHTML = '<div class="text-center text-muted py-4">No hay movimientos registrados para esta OT</div>';
            return;
        }
        cont.innerHTML = movs.map(m => {
            const fecha = m.fecha ? new Date(m.fecha).toLocaleString('es-VE') : '-';
            const detallesHtml = (m.detalles || []).map(d =>
                `<div class="small"><strong>${d.label}:</strong> ${d.valor}</div>`
            ).join('');
            const alertaBadge = m._alerta ? `<span class="badge bg-${m._nivel || 'warning'} ms-1">ALERTA</span>` : '';
            return `<div class="timeline-item">
                <div class="timeline-dot fase-${m.fase}"></div>
                <div class="card border-0 shadow-sm">
                    <div class="card-body py-2">
                        <div class="d-flex justify-content-between align-items-start">
                            <div>
                                <strong>${m.titulo}</strong>${alertaBadge}
                                <div class="small text-muted">${fecha}</div>
                            </div>
                            <span class="badge bg-light text-dark text-capitalize">${m.fase}</span>
                        </div>
                        <p class="small mb-1 mt-1">${m.descripcion}</p>
                        ${detallesHtml ? `<div class="mt-2 p-2 bg-light rounded">${detallesHtml}</div>` : ''}
                    </div>
                </div>
            </div>`;
        }).join('');
    },

    exportarPDF: function() {
        if (!this.otSeleccionada) return;
        const ot = this.otSeleccionada;
        const numOT = ot.numeroOrden || ot.nombreOT;

        const movsHtml = this.movimientos.map(m => {
            const fecha = m.fecha ? new Date(m.fecha).toLocaleString('es-VE') : '-';
            const det = (m.detalles || []).map(d => `<li><strong>${d.label}:</strong> ${d.valor}</li>`).join('');
            return `<div class="mov" style="border-left:3px solid #0d6efd; padding-left:10px; margin-bottom:10px;">
                <strong>${m.titulo}</strong> <span class="badge">${m.fase}</span>
                <div class="small">${fecha}</div>
                <p>${m.descripcion}</p>
                ${det ? `<ul>${det}</ul>` : ''}
            </div>`;
        }).join('');

        const w = window.open('', '_blank');
        w.document.write(`<html><head><title>Movimientos OT ${numOT}</title>
            <style>
                body { font-family: Arial; padding: 20px; max-width: 900px; margin: 0 auto; }
                h1 { color: #0d6efd; }
                .empresa { text-align: center; margin-bottom: 15px; font-size: 11px; }
                .info { background: #f0f0f0; padding: 10px; margin: 10px 0; }
                .small { font-size: 10px; color: #666; }
                .badge { background: #6c757d; color: white; padding: 2px 6px; border-radius: 3px; font-size: 10px; }
                ul { font-size: 11px; }
            </style></head><body>
            <h1>Movimientos de Orden ${numOT}</h1>
            <div class="empresa"><strong>INVERSIONES AXONES 2008, C.A.</strong> | RIF: J-40081341-7</div>
            <div class="info">
                <div><strong>Cliente:</strong> ${ot.cliente || '-'}</div>
                <div><strong>Producto:</strong> ${ot.producto || '-'}</div>
                <div><strong>Kg pedidos:</strong> ${ot.pedidoKg || '-'}</div>
                <div><strong>Estructura:</strong> ${ot.estructuraMaterial || '-'}</div>
                <div><strong>Maquina:</strong> ${ot.maquina || '-'}</div>
                <div><strong>Estado:</strong> ${ot.estadoOrden || '-'}</div>
            </div>
            <h3>Cronologia (${this.movimientos.length} movimientos)</h3>
            ${movsHtml}
        </body></html>`);
        w.document.close();
        setTimeout(() => w.print(), 500);
    },
};

if (typeof window !== 'undefined') window.MovimientosOrden = MovimientosOrden;

document.addEventListener('DOMContentLoaded', () => {
    setTimeout(() => MovimientosOrden.init(), 300);
});
