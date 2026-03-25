/**
 * Modulo de Reportes - Sistema Axones
 * Parte 1: Init + Carga + Tab Ordenes + Filtros + KPIs
 */

const ReportesModule = {
    tabActual: 'ordenes',
    ordenes: [],
    prodImpresion: [],
    prodLaminacion: [],
    prodCorte: [],
    controlTiempo: [],
    charts: {},

    init: async function() {
        console.log('[Reportes] Inicializando...');
        try {
            if (typeof AxonesDB !== 'undefined') {
                if (!AxonesDB.isReady()) await AxonesDB.init();
                console.log('[Reportes] AxonesDB ready:', AxonesDB.isReady());
            } else {
                console.warn('[Reportes] AxonesDB no definido');
            }
        } catch (e) {
            console.error('[Reportes] Error init AxonesDB:', e);
        }
        this.setFechasDefault();
        await this.cargarDatos();
        this.aplicarFiltros();

        window.addEventListener('axones-sync', async () => {
            console.log('[Reportes] Re-sync detectado, recargando...');
            await this.cargarDatos();
            this.aplicarFiltros();
        });
    },

    cargarDatos: async function() {
        try {
            if (typeof AxonesDB === 'undefined' || !AxonesDB.isReady()) {
                console.warn('[Reportes] AxonesDB no disponible, reintentando init...');
                if (typeof AxonesDB !== 'undefined') await AxonesDB.init();
                if (!AxonesDB.isReady()) { console.error('[Reportes] No se pudo conectar a Supabase'); return; }
            }
            const [ordenes, imp, lam, cor, ct] = await Promise.all([
                AxonesDB.ordenesHelper.cargar(),
                AxonesDB.client.from('produccion_impresion').select('*').order('created_at', { ascending: false }),
                AxonesDB.client.from('produccion_laminacion').select('*').order('created_at', { ascending: false }),
                AxonesDB.client.from('produccion_corte').select('*').order('created_at', { ascending: false }),
                AxonesDB.client.from('control_tiempo').select('*')
            ]);
            this.ordenes = ordenes || [];
            this.prodImpresion = (imp.data || []).map(r => ({ ...r, ...(r.datos || {}) }));
            this.prodLaminacion = (lam.data || []).map(r => ({ ...r, ...(r.datos || {}) }));
            this.prodCorte = (cor.data || []).map(r => ({ ...r, ...(r.datos || {}) }));
            this.controlTiempo = ct.data || [];
            console.log('[Reportes] Datos:', this.ordenes.length, 'OTs,', this.prodImpresion.length, 'imp,', this.prodLaminacion.length, 'lam,', this.prodCorte.length, 'cor');
        } catch (e) {
            console.error('[Reportes] Error cargando datos:', e);
        }
    },

    setFechasDefault: function() {
        const hoy = new Date();
        const hace90 = new Date();
        hace90.setDate(hace90.getDate() - 90);
        const en90 = new Date();
        en90.setDate(en90.getDate() + 90);
        const fi = document.getElementById('fechaInicio');
        const ff = document.getElementById('fechaFin');
        if (fi) fi.value = hace90.toISOString().split('T')[0];
        if (ff) ff.value = en90.toISOString().split('T')[0];
    },

    aplicarFiltros: function() {
        this.actualizarKPIs();
        this.renderTab();
    },

    cambiarTab: function(tab, event) {
        if (event) event.preventDefault();
        this.tabActual = tab;
        document.querySelectorAll('#reportesTabs .nav-link').forEach(el => {
            el.classList.toggle('active', el.dataset.tab === tab);
        });
        const tg = document.getElementById('tabGraficos');
        const tc = document.getElementById('tabContent');
        if (tg) tg.style.display = tab === 'graficos' ? 'block' : 'none';
        if (tc) tc.style.display = tab === 'graficos' ? 'none' : 'block';
        this.renderTab();
    },

    getFiltros: function() {
        return {
            desde: document.getElementById('fechaInicio')?.value || '',
            hasta: document.getElementById('fechaFin')?.value || '',
            estado: document.getElementById('filtroEstado')?.value || '',
            busqueda: document.getElementById('filtroBusqueda')?.value?.toLowerCase() || ''
        };
    },

    filtrarOrdenes: function() {
        const f = this.getFiltros();
        const resultado = this.ordenes.filter(o => {
            // Usar created_at como referencia principal (fechaInicio puede ser futura)
            const fecha = (o.created_at || o.fechaInicio || o.fechaEntrega || '').split('T')[0];
            // Si no hay fecha, no filtrar por fecha (mostrar siempre)
            if (fecha) {
                if (f.desde && fecha < f.desde) return false;
                if (f.hasta && fecha > f.hasta) return false;
            }
            if (f.estado && o.estadoOrden !== f.estado) return false;
            if (f.busqueda) {
                const texto = [o.numeroOrden, o.cliente, o.producto].filter(Boolean).join(' ').toLowerCase();
                if (!texto.includes(f.busqueda)) return false;
            }
            return true;
        });
        return resultado;
    },

    actualizarKPIs: function() {
        const ots = this.filtrarOrdenes();
        const totalProd = this.prodImpresion.length + this.prodLaminacion.length + this.prodCorte.length;
        const kgTotal = ots.reduce((s, o) => s + (parseFloat(o.pedidoKg) || 0), 0);

        const el = (id, val) => { const e = document.getElementById(id); if (e) e.textContent = val; };
        el('kpiTotalOTs', ots.length);
        el('kpiKgProducidos', Math.round(kgTotal).toLocaleString('es-VE'));
        el('kpiRegistros', totalProd);
        el('kpiScrapProm', '—');
        el('kpiIncidencias', '—');
        el('kpiAlertas', '—');
    },

    renderTab: function() {
        const tc = document.getElementById('tabContent');
        if (!tc) return;
        switch (this.tabActual) {
            case 'ordenes': this.renderTabOrdenes(tc); break;
            case 'impresion': this.renderTabProduccion(tc, 'impresion', this.prodImpresion); break;
            case 'laminacion': this.renderTabProduccion(tc, 'laminacion', this.prodLaminacion); break;
            case 'corte': this.renderTabProduccion(tc, 'corte', this.prodCorte); break;
            case 'graficos': this.renderGraficos(); break;
        }
    },

    // ==================== TAB ORDENES ====================
    renderTabOrdenes: function(container) {
        const ots = this.filtrarOrdenes();
        if (ots.length === 0) {
            container.innerHTML = '<div class="text-center text-muted py-5">No hay ordenes en el rango seleccionado</div>';
            return;
        }
        let html = `<div class="table-responsive"><table class="table table-hover table-sm align-middle">
            <thead class="table-light"><tr>
                <th>OT</th><th>Cliente</th><th>Producto</th><th>Kg</th><th>Estado</th><th>Fecha</th><th>Prioridad</th>
            </tr></thead><tbody>`;
        ots.forEach((o, i) => {
            const badge = this.badgeEstado(o.estadoOrden);
            const prioridad = this.badgePrioridad(o.prioridad);
            const fecha = this.fmtFecha(o.fechaInicio || o.created_at);
            html += `<tr class="ot-row" style="cursor:pointer" onclick="ReportesModule.abrirDetalleOT(${i})">
                <td><strong>${o.numeroOrden || '—'}</strong></td>
                <td>${o.cliente || '—'}</td>
                <td class="text-truncate" style="max-width:200px">${o.producto || '—'}</td>
                <td class="text-end">${this.fmtNum(o.pedidoKg)}</td>
                <td>${badge}</td>
                <td>${fecha}</td>
                <td>${prioridad}</td>
            </tr>`;
        });
        html += '</tbody></table></div>';
        container.innerHTML = html;
    },

    abrirDetalleOT: async function(index) {
        const ots = this.filtrarOrdenes();
        const o = ots[index];
        if (!o) return;

        const numOT = o.numeroOrden;
        document.getElementById('modalDetalleOTTitle').textContent = 'Detalle: ' + numOT;

        // Buscar produccion relacionada
        const imp = this.prodImpresion.filter(r => r.numero_ot === numOT || r.ordenTrabajo === numOT);
        const lam = this.prodLaminacion.filter(r => r.numero_ot === numOT || r.ordenTrabajo === numOT);
        const cor = this.prodCorte.filter(r => r.numero_ot === numOT || r.ordenTrabajo === numOT);
        const ct = this.controlTiempo.filter(r => r.numero_ot === numOT);

        let body = '';

        // Datos de la OT
        body += `<div class="detail-section">
            <div class="detail-section-title">Datos de la Orden</div>
            <div class="row g-2">
                ${this.campo('OT', numOT)}
                ${this.campo('Cliente', o.cliente)}
                ${this.campo('RIF', o.rifCliente)}
                ${this.campo('Producto', o.producto)}
                ${this.campo('Kg Pedido', this.fmtNum(o.pedidoKg))}
                ${this.campo('Metros Estimados', this.fmtNum(o.metrosEstimados))}
                ${this.campo('Material', o.tipoMaterial)}
                ${this.campo('Micras', o.micrasMaterial)}
                ${this.campo('Ancho', o.anchoMaterial)}
                ${this.campo('Maquina', o.maquina)}
                ${this.campo('Estructura', o.estructuraMaterial)}
                ${this.campo('Estado', o.estadoOrden)}
                ${this.campo('Prioridad', o.prioridad)}
                ${this.campo('Fecha Inicio', this.fmtFecha(o.fechaInicio))}
                ${this.campo('Fecha Entrega', this.fmtFecha(o.fechaEntrega))}
                ${this.campo('Observaciones', o.observacionesGenerales)}
            </div>
        </div>`;

        // Ficha tecnica si existe
        if (o.fichaTecnica || o.tipoMaterial) {
            body += `<div class="detail-section">
                <div class="detail-section-title">Ficha Tecnica</div>
                <div class="row g-2">
                    ${this.campo('Tipo Material', o.tipoMaterial)}
                    ${this.campo('Densidad', o.densidadMaterial)}
                    ${this.campo('CPE/SKU', o.cpe)}
                    ${this.campo('Codigo Barras', o.codigoBarra)}
                    ${this.campo('Desarrollo', o.desarrollo)}
                    ${this.campo('Pinon', o.pinon)}
                    ${this.campo('Tipo Impresion', o.tipoImpresion)}
                    ${this.campo('Colores', (o.colores || []).filter(Boolean).join(', '))}
                    ${this.campo('Figura Embobinado', o.figuraEmbobinado)}
                </div>
            </div>`;
        }

        // Produccion Impresion
        if (imp.length > 0) {
            body += this.renderSeccionProduccion('Impresion', imp, 'primary');
        }

        // Produccion Laminacion
        if (lam.length > 0) {
            body += this.renderSeccionProduccion('Laminacion', lam, 'purple');
        }

        // Produccion Corte
        if (cor.length > 0) {
            body += this.renderSeccionProduccion('Corte', cor, 'success');
        }

        // Control de Tiempo
        if (ct.length > 0) {
            body += `<div class="detail-section">
                <div class="detail-section-title">Control de Tiempo</div>`;
            ct.forEach(t => {
                const datos = t.datos || {};
                const pausas = datos.pausas || [];
                const despachos = datos.despachos || [];
                const estado = datos.estado || t.estado || '—';
                const tiempoMs = datos.tiempoTotal || 0;
                body += `<div class="mb-2"><strong>Fase: ${t.fase || datos.fase || '—'}</strong> | Estado: ${this.badgeEstado(estado)} | Tiempo: ${this.fmtTiempo(tiempoMs)}</div>`;

                if (pausas.length > 0) {
                    body += '<div class="ms-3 mb-2"><small class="text-muted">Pausas:</small>';
                    pausas.forEach(p => {
                        body += `<div class="timeline-item pausa"><small>${p.motivo || '—'} — ${this.fmtFecha(p.timestamp)} ${p.duracion ? '(' + this.fmtTiempo(p.duracion) + ')' : ''}</small></div>`;
                    });
                    body += '</div>';
                }

                if (despachos.length > 0) {
                    body += '<div class="ms-3 mb-2"><small class="text-muted">Despachos:</small><table class="table table-sm table-bordered mt-1"><thead><tr><th>Fecha</th><th>Kg</th><th>Cliente</th><th>Nota Entrega</th></tr></thead><tbody>';
                    despachos.forEach(d => {
                        body += `<tr><td>${d.fecha || '—'}</td><td>${d.kg || '—'}</td><td>${d.cliente || '—'}</td><td>${d.notaEntrega || '—'}</td></tr>`;
                    });
                    body += '</tbody></table></div>';
                }
            });
            body += '</div>';
        }

        // Sin produccion
        if (imp.length === 0 && lam.length === 0 && cor.length === 0 && ct.length === 0) {
            body += '<div class="text-center text-muted py-3">Esta OT no tiene registros de produccion aun</div>';
        }

        document.getElementById('modalDetalleOTBody').innerHTML = body;
        new bootstrap.Modal(document.getElementById('modalDetalleOT')).show();
    },

    renderSeccionProduccion: function(titulo, registros, color) {
        let html = `<div class="detail-section">
            <div class="detail-section-title" style="border-bottom-color:${color === 'purple' ? '#6f42c1' : ''}">${titulo} (${registros.length} registro${registros.length > 1 ? 's' : ''})</div>`;
        registros.forEach((r, i) => {
            html += `<div class="card mb-2"><div class="card-body py-2 px-3">
                <div class="row g-2">
                    ${this.campo('Turno', r.turno)}
                    ${this.campo('Operador', r.operador)}
                    ${this.campo('Maquina', r.maquina)}
                    ${this.campo('Fecha', this.fmtFecha(r.fecha || r.created_at))}
                    ${this.campo('Total Entrada', this.fmtNum(r.totalMaterialEntrada || r.totalEntrada))}
                    ${this.campo('Total Salida', this.fmtNum(r.pesoTotal || r.totalSalida))}
                    ${this.campo('Scrap', this.fmtNum(r.scrapTransparente || r.scrapRefile))}
                    ${this.campo('Observaciones', r.observaciones)}
                </div>
            </div></div>`;
        });
        html += '</div>';
        return html;
    },

    // ==================== TAB PRODUCCION (IMP/LAM/COR) ====================
    renderTabProduccion: function(container, tipo, registros) {
        const f = this.getFiltros();
        const filtrados = registros.filter(r => {
            const fecha = (r.fecha || r.created_at || '').split('T')[0];
            if (f.desde && fecha < f.desde) return false;
            if (f.hasta && fecha > f.hasta) return false;
            if (f.busqueda) {
                const texto = [r.numero_ot, r.ordenTrabajo, r.operador, r.maquina].filter(Boolean).join(' ').toLowerCase();
                if (!texto.includes(f.busqueda)) return false;
            }
            return true;
        });

        if (filtrados.length === 0) {
            container.innerHTML = `<div class="text-center text-muted py-5">No hay registros de ${tipo}</div>`;
            return;
        }

        let html = `<div class="table-responsive"><table class="table table-hover table-sm align-middle">
            <thead class="table-light"><tr>
                <th>OT</th><th>Fecha</th><th>Turno</th><th>Operador</th><th>Maquina</th><th>Entrada Kg</th><th>Salida Kg</th><th>Scrap</th>
            </tr></thead><tbody>`;
        filtrados.forEach((r, i) => {
            const scrap = parseFloat(r.scrapTransparente || r.scrapRefile || r.scrapTotal || 0);
            html += `<tr class="ot-row" style="cursor:pointer" onclick="ReportesModule.abrirDetalleProd('${tipo}', ${i})">
                <td><strong>${r.numero_ot || r.ordenTrabajo || '—'}</strong></td>
                <td>${this.fmtFecha(r.fecha || r.created_at)}</td>
                <td>${r.turno || '—'}</td>
                <td>${r.operador || '—'}</td>
                <td>${r.maquina || '—'}</td>
                <td class="text-end">${this.fmtNum(r.totalMaterialEntrada || r.totalEntrada)}</td>
                <td class="text-end">${this.fmtNum(r.pesoTotal || r.totalSalida)}</td>
                <td class="text-end">${scrap > 0 ? scrap.toFixed(1) + ' kg' : '—'}</td>
            </tr>`;
        });
        html += '</tbody></table></div>';
        container.innerHTML = html;
    },

    abrirDetalleProd: function(tipo, index) {
        const registros = tipo === 'impresion' ? this.prodImpresion : tipo === 'laminacion' ? this.prodLaminacion : this.prodCorte;
        const r = registros[index];
        if (!r) return;

        document.getElementById('modalDetalleProdTitle').innerHTML = `<i class="bi bi-file-text me-2"></i>Detalle ${tipo.charAt(0).toUpperCase() + tipo.slice(1)} — ${r.numero_ot || r.ordenTrabajo || ''}`;

        let body = `<div class="detail-section"><div class="detail-section-title">Datos del Registro</div><div class="row g-2">`;
        const campos = Object.entries(r).filter(([k]) => !['id', 'datos', 'created_at', 'updated_at', 'orden_id'].includes(k));
        campos.forEach(([k, v]) => {
            if (v !== null && v !== undefined && v !== '' && typeof v !== 'object') {
                body += this.campo(k.replace(/_/g, ' '), v);
            }
        });
        body += '</div></div>';

        // Bobinas entrada
        const bobEntrada = r.materialesEntrada || r.bobinasEntrada || [];
        if (Array.isArray(bobEntrada) && bobEntrada.length > 0) {
            body += `<div class="detail-section"><div class="detail-section-title">Bobinas de Entrada (${bobEntrada.length})</div>`;
            body += '<table class="table table-sm"><thead><tr><th>#</th><th>Peso Kg</th></tr></thead><tbody>';
            bobEntrada.forEach((b, i) => {
                const peso = typeof b === 'object' ? (b.peso || b.kg || '—') : b;
                body += `<tr><td>${i + 1}</td><td>${peso}</td></tr>`;
            });
            body += '</tbody></table></div>';
        }

        // Bobinas salida
        const bobSalida = r.bobinasSalida || [];
        if (Array.isArray(bobSalida) && bobSalida.length > 0) {
            body += `<div class="detail-section"><div class="detail-section-title">Bobinas de Salida (${bobSalida.length})</div>`;
            body += '<table class="table table-sm"><thead><tr><th>#</th><th>Peso Kg</th></tr></thead><tbody>';
            bobSalida.forEach((b, i) => {
                const peso = typeof b === 'object' ? (b.peso || b.kg || '—') : b;
                body += `<tr><td>${i + 1}</td><td>${peso}</td></tr>`;
            });
            body += '</tbody></table></div>';
        }

        // Tintas consumidas
        const tintas = r.consumoTintas || [];
        if (Array.isArray(tintas) && tintas.length > 0) {
            body += `<div class="detail-section"><div class="detail-section-title">Consumo de Tintas</div>`;
            body += '<table class="table table-sm"><thead><tr><th>Tinta</th><th>Kg</th></tr></thead><tbody>';
            tintas.forEach(t => {
                body += `<tr><td>${t.nombre || t.tinta || '—'}</td><td>${t.kg || t.cantidad || '—'}</td></tr>`;
            });
            body += '</tbody></table></div>';
        }

        // Paletas (corte)
        const paletas = r.paletas || [];
        if (Array.isArray(paletas) && paletas.length > 0) {
            body += `<div class="detail-section"><div class="detail-section-title">Paletas (${paletas.length})</div>`;
            paletas.forEach((p, i) => {
                const bobs = p.bobinas || [];
                body += `<div class="mb-1"><strong>Paleta ${i + 1}</strong> — Peso: ${p.pesoTotal || '—'} Kg, Bobinas: ${bobs.length}</div>`;
            });
            body += '</div>';
        }

        document.getElementById('modalDetalleProdBody').innerHTML = body;
        new bootstrap.Modal(document.getElementById('modalDetalleProd')).show();
    },

    // ==================== GRAFICOS ====================
    renderGraficos: function() {
        this.chartProduccionProceso();
        this.chartScrapMaquina();
        this.chartTendencia();
        this.chartTopClientes();
    },

    chartProduccionProceso: function() {
        const canvas = document.getElementById('chartProduccionProceso');
        if (!canvas) return;
        if (this.charts.pp) this.charts.pp.destroy();
        this.charts.pp = new Chart(canvas, {
            type: 'doughnut',
            data: {
                labels: ['Impresion', 'Laminacion', 'Corte'],
                datasets: [{ data: [this.prodImpresion.length, this.prodLaminacion.length, this.prodCorte.length], backgroundColor: ['#0d6efd', '#6f42c1', '#198754'], borderWidth: 0 }]
            },
            options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'bottom' } } }
        });
    },

    chartScrapMaquina: function() {
        const canvas = document.getElementById('chartRefilMaquina');
        if (!canvas) return;
        if (this.charts.sm) this.charts.sm.destroy();
        const todos = [...this.prodImpresion, ...this.prodLaminacion, ...this.prodCorte];
        const porMaq = {};
        todos.forEach(r => {
            const m = r.maquina || 'Sin asignar';
            const s = parseFloat(r.scrapTransparente || r.scrapRefile || 0);
            if (!porMaq[m]) porMaq[m] = { total: 0, count: 0 };
            porMaq[m].total += s;
            porMaq[m].count++;
        });
        const labels = Object.keys(porMaq);
        const data = labels.map(m => porMaq[m].count > 0 ? porMaq[m].total / porMaq[m].count : 0);
        this.charts.sm = new Chart(canvas, {
            type: 'bar',
            data: { labels, datasets: [{ label: 'Scrap Prom Kg', data, backgroundColor: '#ffc107', borderRadius: 4 }] },
            options: { responsive: true, maintainAspectRatio: false, indexAxis: 'y', plugins: { legend: { display: false } } }
        });
    },

    chartTendencia: function() {
        const canvas = document.getElementById('chartTendenciaDiaria');
        if (!canvas) return;
        if (this.charts.td) this.charts.td.destroy();
        const porFecha = {};
        [...this.prodImpresion, ...this.prodLaminacion, ...this.prodCorte].forEach(r => {
            const f = (r.fecha || r.created_at || '').split('T')[0];
            if (f) porFecha[f] = (porFecha[f] || 0) + 1;
        });
        const fechas = Object.keys(porFecha).sort();
        this.charts.td = new Chart(canvas, {
            type: 'line',
            data: { labels: fechas.map(f => f.slice(5)), datasets: [{ label: 'Registros', data: fechas.map(f => porFecha[f]), borderColor: '#0d6efd', backgroundColor: 'rgba(13,110,253,0.1)', fill: true, tension: 0.4 }] },
            options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { y: { beginAtZero: true } } }
        });
    },

    chartTopClientes: function() {
        const canvas = document.getElementById('chartTopClientes');
        if (!canvas) return;
        if (this.charts.tc) this.charts.tc.destroy();
        const porCliente = {};
        this.ordenes.forEach(o => {
            const c = o.cliente || 'Sin cliente';
            porCliente[c] = (porCliente[c] || 0) + (parseFloat(o.pedidoKg) || 0);
        });
        const sorted = Object.entries(porCliente).sort((a, b) => b[1] - a[1]).slice(0, 5);
        this.charts.tc = new Chart(canvas, {
            type: 'bar',
            data: { labels: sorted.map(s => s[0]), datasets: [{ label: 'Kg', data: sorted.map(s => s[1]), backgroundColor: ['#0d6efd', '#6f42c1', '#198754', '#ffc107', '#dc3545'], borderRadius: 4 }] },
            options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { y: { beginAtZero: true } } }
        });
    },

    // ==================== EXPORT ====================
    exportarCSV: function() {
        const datos = this.tabActual === 'ordenes' ? this.filtrarOrdenes().map(o => ({
            'OT': o.numeroOrden, 'Cliente': o.cliente, 'Producto': o.producto, 'Kg': o.pedidoKg, 'Estado': o.estadoOrden, 'Fecha': o.fechaInicio
        })) : [...this.prodImpresion, ...this.prodLaminacion, ...this.prodCorte].map(r => ({
            'OT': r.numero_ot || r.ordenTrabajo, 'Fecha': r.fecha, 'Turno': r.turno, 'Operador': r.operador, 'Maquina': r.maquina
        }));
        this.descargarCSV(datos, 'reporte_' + this.tabActual);
    },

    exportarExcel: function() { this.exportarCSV(); },

    descargarCSV: function(datos, nombre) {
        if (!datos.length) return;
        const headers = Object.keys(datos[0]);
        let csv = headers.join(',') + '\n';
        datos.forEach(row => {
            csv += headers.map(h => { let v = row[h] ?? ''; if (String(v).includes(',')) v = '"' + String(v).replace(/"/g, '""') + '"'; return v; }).join(',') + '\n';
        });
        const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = nombre + '_' + new Date().toISOString().split('T')[0] + '.csv';
        link.click();
        URL.revokeObjectURL(link.href);
    },

    imprimirDetalle: function() {
        const body = document.getElementById('modalDetalleOTBody');
        if (!body) return;
        const w = window.open('', '_blank');
        w.document.write('<html><head><title>Detalle OT</title><link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.2/dist/css/bootstrap.min.css" rel="stylesheet"><style>.detail-section{background:#f8f9fa;border-radius:8px;padding:12px;margin-bottom:12px}.detail-section-title{font-weight:600;font-size:.85rem;text-transform:uppercase;border-bottom:2px solid #0d6efd;padding-bottom:6px;margin-bottom:10px}</style></head><body class="p-3">' + body.innerHTML + '</body></html>');
        w.document.close();
        setTimeout(() => { w.print(); }, 300);
    },

    imprimirDetalleProd: function() {
        const body = document.getElementById('modalDetalleProdBody');
        if (!body) return;
        const w = window.open('', '_blank');
        w.document.write('<html><head><title>Detalle Produccion</title><link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.2/dist/css/bootstrap.min.css" rel="stylesheet"><style>.detail-section{background:#f8f9fa;border-radius:8px;padding:12px;margin-bottom:12px}.detail-section-title{font-weight:600;font-size:.85rem;text-transform:uppercase;border-bottom:2px solid #0d6efd;padding-bottom:6px;margin-bottom:10px}</style></head><body class="p-3">' + body.innerHTML + '</body></html>');
        w.document.close();
        setTimeout(() => { w.print(); }, 300);
    },

    // ==================== HELPERS ====================
    campo: function(label, valor) {
        if (!valor && valor !== 0) return '';
        return `<div class="col-md-3 col-6"><small class="text-muted d-block">${label}</small><strong>${valor}</strong></div>`;
    },

    badgeEstado: function(estado) {
        const m = { pendiente: 'warning', en_progreso: 'primary', montaje: 'secondary', impresion: 'info', laminacion: 'info', corte: 'info', completada: 'success', completado: 'success' };
        return `<span class="badge bg-${m[estado] || 'secondary'}">${(estado || '—').replace(/_/g, ' ')}</span>`;
    },

    badgePrioridad: function(p) {
        const m = { alta: 'danger', urgente: 'danger', normal: 'primary', baja: 'secondary' };
        return `<span class="badge bg-${m[p] || 'secondary'}">${p || 'normal'}</span>`;
    },

    fmtFecha: function(f) {
        if (!f) return '—';
        try { return new Date(f).toLocaleDateString('es-VE'); } catch { return f; }
    },

    fmtNum: function(n) {
        const v = parseFloat(n);
        if (isNaN(v)) return '—';
        return Math.round(v).toLocaleString('es-VE');
    },

    fmtTiempo: function(ms) {
        if (!ms) return '0:00:00';
        const s = Math.floor(ms / 1000);
        const h = Math.floor(s / 3600);
        const m = Math.floor((s % 3600) / 60);
        const sec = s % 60;
        return `${h}:${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
    }
};

// Inicializar
document.addEventListener('DOMContentLoaded', () => { ReportesModule.init(); });
if (typeof window !== 'undefined') window.ReportesModule = ReportesModule;
