/**
 * Reportes Mensuales Descargables - Sistema Axones
 * Genera reportes en Excel (SheetJS) y PDF (print window) segun spec de Valeria.
 *
 * Reportes:
 *   - produccionGeneral: consolidado de impresion, laminacion, corte
 *   - merma: merma del mes + por orden
 *   - despachos: notas de entrega del mes
 *   - consumoTintas: tintas mensual + por orden
 *   - materialPorOrden: resumen de material por OT
 *   - rendimiento: turnos y maquinas
 *   - bobinasRechazadas: inventario de bobinas rechazadas
 *   - movimientos: entradas y salidas de almacen
 */

const ReportesMensuales = {
    _inicializado: false,

    init: function() {
        if (this._inicializado) return;
        this._inicializado = true;
        this.setPeriodoRapido('mes');
    },

    setPeriodoRapido: function(tipo) {
        const hoy = new Date();
        let desde, hasta = new Date(hoy);

        switch(tipo) {
            case 'hoy':
                desde = new Date(hoy);
                break;
            case 'semana':
                desde = new Date(hoy);
                desde.setDate(hoy.getDate() - hoy.getDay());
                break;
            case 'mes':
                desde = new Date(hoy.getFullYear(), hoy.getMonth(), 1);
                break;
            case 'mes_anterior':
                desde = new Date(hoy.getFullYear(), hoy.getMonth() - 1, 1);
                hasta = new Date(hoy.getFullYear(), hoy.getMonth(), 0);
                break;
            case 'trimestre':
                const q = Math.floor(hoy.getMonth() / 3);
                desde = new Date(hoy.getFullYear(), q * 3, 1);
                break;
            case 'año':
                desde = new Date(hoy.getFullYear(), 0, 1);
                break;
            default: return;
        }

        const d = document.getElementById('repDesde');
        const h = document.getElementById('repHasta');
        if (d) d.value = desde.toISOString().split('T')[0];
        if (h) h.value = hasta.toISOString().split('T')[0];
    },

    getPeriodo: function() {
        return {
            desde: document.getElementById('repDesde')?.value || '',
            hasta: document.getElementById('repHasta')?.value || '',
        };
    },

    /** Filtra registros por fecha entre [desde, hasta] */
    filtrarPorFecha: function(registros, campoFecha) {
        const p = this.getPeriodo();
        return (registros || []).filter(r => {
            const f = (r[campoFecha] || r.fecha || r.created_at || '').split('T')[0];
            if (!f) return true;
            if (p.desde && f < p.desde) return false;
            if (p.hasta && f > p.hasta) return false;
            return true;
        });
    },

    /** Carga datos de Supabase para generar un reporte */
    cargarDatos: async function(tabla) {
        if (!AxonesDB.isReady()) return [];
        try {
            const { data } = await AxonesDB.client.from(tabla).select('*').limit(5000);
            return data || [];
        } catch(e) {
            console.warn(`ReportesMensuales: Error cargando ${tabla}:`, e);
            return [];
        }
    },

    /** Carga JSON de sync_store */
    cargarSyncStore: async function(clave) {
        if (!AxonesDB.isReady()) return [];
        try {
            const { data } = await AxonesDB.client.from('sync_store')
                .select('value').eq('key', clave).maybeSingle();
            return data?.value ? JSON.parse(data.value) : [];
        } catch(e) { return []; }
    },

    /** Descarga datos como Excel (requiere SheetJS global XLSX) */
    descargarExcel: function(nombre, hojas) {
        if (typeof XLSX === 'undefined') {
            alert('Libreria Excel no disponible. Intente recargar la pagina.');
            return;
        }
        const wb = XLSX.utils.book_new();
        for (const [nombreHoja, filas] of Object.entries(hojas)) {
            const ws = XLSX.utils.json_to_sheet(filas);
            XLSX.utils.book_append_sheet(wb, ws, nombreHoja.substring(0, 31));
        }
        const fecha = new Date().toISOString().split('T')[0];
        XLSX.writeFile(wb, `${nombre}_${fecha}.xlsx`);
    },

    /** Imprime PDF via print window */
    descargarPDF: function(titulo, secciones) {
        const p = this.getPeriodo();
        let html = `<html><head><title>${titulo}</title>
            <style>
                body { font-family: Arial; padding: 20px; max-width: 1100px; margin: 0 auto; }
                h1 { color: #0d6efd; margin-bottom: 5px; }
                .empresa { text-align: center; margin-bottom: 15px; font-size: 11px; }
                .periodo { background: #f0f0f0; padding: 6px 12px; margin: 10px 0; border-left: 4px solid #0d6efd; }
                h2 { color: #495057; border-bottom: 2px solid #0d6efd; padding-bottom: 4px; margin-top: 20px; font-size: 14px; }
                table { width: 100%; border-collapse: collapse; margin: 10px 0; font-size: 10px; }
                th, td { border: 1px solid #333; padding: 4px 6px; text-align: left; }
                th { background: #e9ecef; font-weight: bold; }
                .total-row { background: #d1e7dd; font-weight: bold; }
                .small { font-size: 9px; color: #666; }
                @media print { body { padding: 10px; } }
            </style></head><body>
            <h1>${titulo}</h1>
            <div class="empresa">
                <strong>INVERSIONES AXONES 2008, C.A.</strong> | RIF: J-40081341-7 | Turmero, Aragua
            </div>
            <div class="periodo">Periodo: ${p.desde || 'inicio'} al ${p.hasta || 'hoy'} - Generado: ${new Date().toLocaleString('es-VE')}</div>`;

        for (const sec of secciones) {
            html += `<h2>${sec.titulo}</h2>`;
            if (sec.resumen) html += `<p class="small">${sec.resumen}</p>`;
            if (sec.filas && sec.filas.length > 0) {
                const keys = Object.keys(sec.filas[0]);
                html += '<table><thead><tr>';
                keys.forEach(k => html += `<th>${k}</th>`);
                html += '</tr></thead><tbody>';
                sec.filas.forEach(fila => {
                    html += '<tr>';
                    keys.forEach(k => html += `<td>${fila[k] !== null && fila[k] !== undefined ? fila[k] : ''}</td>`);
                    html += '</tr>';
                });
                if (sec.total) {
                    html += '<tr class="total-row">';
                    keys.forEach((k, i) => html += `<td>${sec.total[k] || (i === 0 ? 'TOTAL' : '')}</td>`);
                    html += '</tr>';
                }
                html += '</tbody></table>';
            } else {
                html += '<p class="small"><em>Sin datos en el periodo</em></p>';
            }
        }
        html += '</body></html>';

        const w = window.open('', '_blank');
        w.document.write(html);
        w.document.close();
        setTimeout(() => w.print(), 500);
    },

    // === PRODUCCION GENERAL ===
    produccionGeneral: async function(formato) {
        const [imp, lam, cor] = await Promise.all([
            this.cargarDatos('produccion_impresion'),
            this.cargarDatos('produccion_laminacion'),
            this.cargarDatos('produccion_corte'),
        ]);

        const impF = this.filtrarPorFecha(imp, 'fecha');
        const lamF = this.filtrarPorFecha(lam, 'fecha');
        const corF = this.filtrarPorFecha(cor, 'fecha');

        const mkFila = (r, fase) => ({
            'Fase': fase,
            'Fecha': r.fecha || '',
            'Turno': r.turno || '',
            'Maquina': r.maquina || '',
            'OT': r.numero_ot || '',
            'Operador': r.operador || '',
            'Kg Entrada': (parseFloat(r.total_entrada) || 0).toFixed(2),
            'Kg Salida': (parseFloat(r.peso_total_salida || r.peso_total || r.total_salida) || 0).toFixed(2),
            'Merma (Kg)': (parseFloat(r.merma) || 0).toFixed(2),
            '% Merma': this._calcMermaPct(r),
            'Scrap': (parseFloat(r.total_scrap || r.scrap_refile) || 0).toFixed(2),
        });

        const filasTodas = [
            ...impF.map(r => mkFila(r, 'Impresion')),
            ...lamF.map(r => mkFila(r, 'Laminacion')),
            ...corF.map(r => mkFila(r, 'Corte')),
        ].sort((a, b) => (b.Fecha || '').localeCompare(a.Fecha || ''));

        const resumen = [
            { Fase: 'Impresion', 'Num Registros': impF.length,
              'Total Kg Entrada': this._sum(impF, 'total_entrada'),
              'Total Kg Salida': this._sum(impF, 'peso_total_salida') || this._sum(impF, 'peso_total'),
              'Total Merma': this._sum(impF, 'merma') },
            { Fase: 'Laminacion', 'Num Registros': lamF.length,
              'Total Kg Entrada': this._sum(lamF, 'total_entrada'),
              'Total Kg Salida': this._sum(lamF, 'peso_total_salida') || this._sum(lamF, 'peso_total'),
              'Total Merma': this._sum(lamF, 'merma') },
            { Fase: 'Corte', 'Num Registros': corF.length,
              'Total Kg Entrada': this._sum(corF, 'total_entrada'),
              'Total Kg Salida': this._sum(corF, 'peso_total_salida'),
              'Total Merma': this._sum(corF, 'merma') },
        ];

        if (formato === 'xlsx') {
            this.descargarExcel('Produccion_General', {
                'Resumen': resumen,
                'Detalle': filasTodas,
            });
        } else {
            this.descargarPDF('Reporte de Produccion General', [
                { titulo: 'Resumen por Fase', filas: resumen },
                { titulo: 'Detalle de Registros', filas: filasTodas.slice(0, 200) }
            ]);
        }
    },

    _calcMermaPct: function(r) {
        const ent = parseFloat(r.total_entrada) || 0;
        const merma = parseFloat(r.merma) || 0;
        return ent > 0 ? ((merma / ent) * 100).toFixed(2) + '%' : '0%';
    },

    _sum: function(arr, campo) {
        return arr.reduce((s, r) => s + (parseFloat(r[campo]) || 0), 0).toFixed(2);
    },

    // === MERMA ===
    merma: async function(formato) {
        const [imp, lam, cor] = await Promise.all([
            this.cargarDatos('produccion_impresion'),
            this.cargarDatos('produccion_laminacion'),
            this.cargarDatos('produccion_corte'),
        ]);

        const todos = [
            ...this.filtrarPorFecha(imp, 'fecha').map(r => ({ ...r, _fase: 'Impresion' })),
            ...this.filtrarPorFecha(lam, 'fecha').map(r => ({ ...r, _fase: 'Laminacion' })),
            ...this.filtrarPorFecha(cor, 'fecha').map(r => ({ ...r, _fase: 'Corte' })),
        ];

        // Agrupar por OT
        const porOT = {};
        todos.forEach(r => {
            const ot = r.numero_ot || 'SIN_OT';
            if (!porOT[ot]) porOT[ot] = { ot, entrada: 0, salida: 0, merma: 0, scrap: 0, registros: 0 };
            porOT[ot].entrada += parseFloat(r.total_entrada) || 0;
            porOT[ot].salida += parseFloat(r.peso_total_salida || r.peso_total || r.total_salida) || 0;
            porOT[ot].merma += parseFloat(r.merma) || 0;
            porOT[ot].scrap += parseFloat(r.total_scrap || r.scrap_refile) || 0;
            porOT[ot].registros++;
        });

        const filasPorOT = Object.values(porOT)
            .filter(o => o.entrada > 0 || o.merma > 0)
            .map(o => ({
                'OT': o.ot,
                'Registros': o.registros,
                'Kg Entrada': o.entrada.toFixed(2),
                'Kg Salida': o.salida.toFixed(2),
                'Merma (Kg)': o.merma.toFixed(2),
                '% Merma': o.entrada > 0 ? ((o.merma / o.entrada) * 100).toFixed(2) + '%' : '0%',
                'Scrap (Kg)': o.scrap.toFixed(2),
                'Alerta': (o.entrada > 0 && (o.merma / o.entrada) > 0.05) ? 'MERMA ELEVADA (>5%)' : '',
            })).sort((a, b) => parseFloat(b['Merma (Kg)']) - parseFloat(a['Merma (Kg)']));

        // Totales por fase
        const porFase = ['Impresion', 'Laminacion', 'Corte'].map(fase => {
            const items = todos.filter(r => r._fase === fase);
            const ent = items.reduce((s, r) => s + (parseFloat(r.total_entrada) || 0), 0);
            const mer = items.reduce((s, r) => s + (parseFloat(r.merma) || 0), 0);
            return {
                'Fase': fase,
                'Registros': items.length,
                'Kg Entrada': ent.toFixed(2),
                'Kg Merma': mer.toFixed(2),
                '% Merma': ent > 0 ? ((mer / ent) * 100).toFixed(2) + '%' : '0%',
            };
        });

        if (formato === 'xlsx') {
            this.descargarExcel('Merma', { 'Por Fase': porFase, 'Por Orden': filasPorOT });
        } else {
            this.descargarPDF('Reporte de Merma', [
                { titulo: 'Merma por Fase', filas: porFase },
                { titulo: 'Merma por Orden', filas: filasPorOT }
            ]);
        }
    },

    // === DESPACHOS ===
    despachos: async function(formato) {
        const notas = await this.cargarSyncStore('axones_notas_despacho');
        const filtradas = this.filtrarPorFecha(notas, 'fecha');

        const filas = filtradas.map(n => ({
            'ND': n.correlativo || '',
            'Fecha': n.fecha || '',
            'OT': n.otNumero || '',
            'Cliente': n.cliente || '',
            'RIF': n.clienteRif || '',
            'Producto': n.producto || '',
            'Bobinas': n.totalBobinas || 0,
            'Kg Despachados': (parseFloat(n.totalKg) || 0).toFixed(2),
            'Paletas': (n.paletas || []).length,
            'Chofer': n.chofer?.nombre || '',
            'Cedula': n.chofer?.cedula || '',
            'Placa': n.placa || '',
            'Direccion': n.direccion || '',
        })).sort((a, b) => (b.Fecha || '').localeCompare(a.Fecha || ''));

        const totalKg = filtradas.reduce((s, n) => s + (parseFloat(n.totalKg) || 0), 0);
        const totalBob = filtradas.reduce((s, n) => s + (n.totalBobinas || 0), 0);

        const resumen = [{
            'Total Despachos': filtradas.length,
            'Total Bobinas': totalBob,
            'Total Kg': totalKg.toFixed(2),
            'Clientes unicos': new Set(filtradas.map(n => n.cliente)).size,
        }];

        if (formato === 'xlsx') {
            this.descargarExcel('Despachos', { 'Resumen': resumen, 'Detalle': filas });
        } else {
            this.descargarPDF('Reporte de Despachos', [
                { titulo: 'Resumen', filas: resumen },
                { titulo: 'Detalle de Notas de Entrega', filas }
            ]);
        }
    },

    // === CONSUMO DE TINTAS ===
    consumoTintas: async function(formato) {
        const consumos = await this.cargarSyncStore('axones_consumo_tintas');
        const filtrados = this.filtrarPorFecha(consumos, 'fecha');

        const filasDetalle = [];
        filtrados.forEach(c => {
            (c.tintas || []).forEach(t => {
                filasDetalle.push({
                    'Fecha': c.fecha || '',
                    'OT': c.ordenTrabajo || '',
                    'Cliente': c.cliente || '',
                    'Maquina': c.maquina || '',
                    'Codigo Tinta': t.codigo || '',
                    'Color': t.nombre || '',
                    'Tipo': t.tipo || '',
                    'Proveedor': t.proveedor || '',
                    'Kg Usado': (parseFloat(t.kgUsado) || 0).toFixed(3),
                });
            });
        });

        // Agrupar por OT
        const porOT = {};
        filtrados.forEach(c => {
            const ot = c.ordenTrabajo || 'SIN_OT';
            if (!porOT[ot]) porOT[ot] = { ot, cliente: c.cliente, kgTotal: 0, kgLam: 0, kgSup: 0, kgSolv: 0 };
            porOT[ot].kgTotal += parseFloat(c.totalTintas) || 0;
            (c.tintas || []).forEach(t => {
                const kg = parseFloat(t.kgUsado) || 0;
                if ((t.tipo || '').toLowerCase().includes('superficie')) porOT[ot].kgSup += kg;
                else porOT[ot].kgLam += kg;
            });
            porOT[ot].kgSolv += parseFloat(c.totalSolventes) || 0;
        });
        const filasOT = Object.values(porOT).map(o => ({
            'OT': o.ot,
            'Cliente': o.cliente || '',
            'Kg Total Tintas': o.kgTotal.toFixed(3),
            'Kg Laminacion': o.kgLam.toFixed(3),
            'Kg Superficie': o.kgSup.toFixed(3),
            'Lt Solventes': o.kgSolv.toFixed(2),
        })).sort((a, b) => parseFloat(b['Kg Total Tintas']) - parseFloat(a['Kg Total Tintas']));

        // Resumen mensual
        const totalLam = filasOT.reduce((s, o) => s + parseFloat(o['Kg Laminacion']), 0);
        const totalSup = filasOT.reduce((s, o) => s + parseFloat(o['Kg Superficie']), 0);
        const totalSolv = filasOT.reduce((s, o) => s + parseFloat(o['Lt Solventes']), 0);
        const resumen = [{
            'Periodo': `${this.getPeriodo().desde} a ${this.getPeriodo().hasta}`,
            'Registros': filtrados.length,
            'OTs con consumo': filasOT.length,
            'Kg Tintas Laminacion': totalLam.toFixed(3),
            'Kg Tintas Superficie': totalSup.toFixed(3),
            'Kg Tintas Total': (totalLam + totalSup).toFixed(3),
            'Lt Solventes Total': totalSolv.toFixed(2),
        }];

        if (formato === 'xlsx') {
            this.descargarExcel('Consumo_Tintas', {
                'Resumen Mensual': resumen,
                'Por Orden': filasOT,
                'Detalle': filasDetalle,
            });
        } else {
            this.descargarPDF('Reporte de Consumo de Tintas', [
                { titulo: 'Resumen Mensual', filas: resumen },
                { titulo: 'Consumo por Orden', filas: filasOT },
                { titulo: 'Detalle de Consumos', filas: filasDetalle.slice(0, 300) }
            ]);
        }
    },

    // === MATERIAL POR ORDEN ===
    materialPorOrden: async function(formato) {
        const [imp, lam, cor] = await Promise.all([
            this.cargarDatos('produccion_impresion'),
            this.cargarDatos('produccion_laminacion'),
            this.cargarDatos('produccion_corte'),
        ]);

        const impF = this.filtrarPorFecha(imp, 'fecha');
        const lamF = this.filtrarPorFecha(lam, 'fecha');
        const corF = this.filtrarPorFecha(cor, 'fecha');

        // Agrupar por OT
        const porOT = {};
        const ensure = (ot) => {
            if (!porOT[ot]) porOT[ot] = {
                ot, kgImp: 0, kgLam: 0, kgCor: 0,
                salImp: 0, salLam: 0, salCor: 0,
                mermaImp: 0, mermaLam: 0, mermaCor: 0,
            };
            return porOT[ot];
        };

        impF.forEach(r => {
            const o = ensure(r.numero_ot || 'SIN_OT');
            o.kgImp += parseFloat(r.total_entrada) || 0;
            o.salImp += parseFloat(r.peso_total_salida || r.peso_total || r.total_salida) || 0;
            o.mermaImp += parseFloat(r.merma) || 0;
        });
        lamF.forEach(r => {
            const o = ensure(r.numero_ot || 'SIN_OT');
            o.kgLam += parseFloat(r.total_entrada) || 0;
            o.salLam += parseFloat(r.peso_total_salida || r.peso_total || r.total_salida) || 0;
            o.mermaLam += parseFloat(r.merma) || 0;
        });
        corF.forEach(r => {
            const o = ensure(r.numero_ot || 'SIN_OT');
            o.kgCor += parseFloat(r.total_entrada) || 0;
            o.salCor += parseFloat(r.peso_total_salida) || 0;
            o.mermaCor += parseFloat(r.merma) || 0;
        });

        const filas = Object.values(porOT).map(o => ({
            'OT': o.ot,
            'Kg Entrada Impresion': o.kgImp.toFixed(2),
            'Kg Salida Impresion': o.salImp.toFixed(2),
            'Merma Impresion': o.mermaImp.toFixed(2),
            'Kg Entrada Laminacion': o.kgLam.toFixed(2),
            'Kg Salida Laminacion': o.salLam.toFixed(2),
            'Merma Laminacion': o.mermaLam.toFixed(2),
            'Kg Entrada Corte': o.kgCor.toFixed(2),
            'Kg Salida Corte': o.salCor.toFixed(2),
            'Merma Corte': o.mermaCor.toFixed(2),
            'Total Material Consumido': (o.kgImp + o.kgLam + o.kgCor).toFixed(2),
            'Total Producto Terminado': o.salCor.toFixed(2),
            'Merma Total': (o.mermaImp + o.mermaLam + o.mermaCor).toFixed(2),
        })).sort((a, b) => (a.OT || '').localeCompare(b.OT || ''));

        if (formato === 'xlsx') {
            this.descargarExcel('Material_Por_Orden', { 'Por Orden': filas });
        } else {
            this.descargarPDF('Resumen de Material por Orden', [
                { titulo: 'Material consumido por cada OT en el periodo', filas }
            ]);
        }
    },

    // === RENDIMIENTO TURNOS Y MAQUINAS ===
    rendimiento: async function(formato) {
        const [imp, lam, cor] = await Promise.all([
            this.cargarDatos('produccion_impresion'),
            this.cargarDatos('produccion_laminacion'),
            this.cargarDatos('produccion_corte'),
        ]);

        const todos = [
            ...this.filtrarPorFecha(imp, 'fecha').map(r => ({ ...r, _fase: 'Impresion' })),
            ...this.filtrarPorFecha(lam, 'fecha').map(r => ({ ...r, _fase: 'Laminacion' })),
            ...this.filtrarPorFecha(cor, 'fecha').map(r => ({ ...r, _fase: 'Corte' })),
        ];

        // Por turno
        const turnos = { D: 'Diurno 7-16', DHE: 'Diurno HE 16-19', N: 'Nocturno 19-4', NHE: 'Nocturno HE 4-7' };
        const porTurno = {};
        todos.forEach(r => {
            const t = r.turno || 'SIN';
            if (!porTurno[t]) porTurno[t] = { turno: turnos[t] || t, registros: 0, kgSalida: 0, merma: 0 };
            porTurno[t].registros++;
            porTurno[t].kgSalida += parseFloat(r.peso_total_salida || r.peso_total || r.total_salida) || 0;
            porTurno[t].merma += parseFloat(r.merma) || 0;
        });
        const filasTurno = Object.values(porTurno).map(t => ({
            'Turno': t.turno,
            'Registros': t.registros,
            'Kg Producidos': t.kgSalida.toFixed(2),
            'Kg Merma': t.merma.toFixed(2),
            'Kg Prom/Registro': t.registros > 0 ? (t.kgSalida / t.registros).toFixed(2) : '0',
        }));

        // Por maquina
        const porMaq = {};
        todos.forEach(r => {
            const m = r.maquina || 'SIN';
            if (!porMaq[m]) porMaq[m] = { maquina: m, fase: r._fase, registros: 0, kgSalida: 0, merma: 0, horas: 0 };
            porMaq[m].registros++;
            porMaq[m].kgSalida += parseFloat(r.peso_total_salida || r.peso_total || r.total_salida) || 0;
            porMaq[m].merma += parseFloat(r.merma) || 0;
            // Horas aproximadas desde observaciones (si tienen timer data)
        });
        const filasMaquina = Object.values(porMaq).map(m => ({
            'Maquina': m.maquina,
            'Fase': m.fase,
            'Registros': m.registros,
            'Kg Producidos': m.kgSalida.toFixed(2),
            'Kg Prom/Registro': m.registros > 0 ? (m.kgSalida / m.registros).toFixed(2) : '0',
            'Merma (Kg)': m.merma.toFixed(2),
            '% Merma': m.kgSalida > 0 ? ((m.merma / (m.kgSalida + m.merma)) * 100).toFixed(2) + '%' : '0%',
        }));

        // Por operador
        const porOp = {};
        todos.forEach(r => {
            const o = r.operador || 'SIN';
            if (!porOp[o]) porOp[o] = { operador: o, registros: 0, kgSalida: 0, merma: 0 };
            porOp[o].registros++;
            porOp[o].kgSalida += parseFloat(r.peso_total_salida || r.peso_total || r.total_salida) || 0;
            porOp[o].merma += parseFloat(r.merma) || 0;
        });
        const filasOp = Object.values(porOp)
            .filter(o => o.operador !== 'SIN')
            .map(o => ({
                'Operador': o.operador,
                'Registros': o.registros,
                'Kg Producidos': o.kgSalida.toFixed(2),
                'Merma (Kg)': o.merma.toFixed(2),
            })).sort((a, b) => parseFloat(b['Kg Producidos']) - parseFloat(a['Kg Producidos']));

        if (formato === 'xlsx') {
            this.descargarExcel('Rendimiento', {
                'Por Turno': filasTurno,
                'Por Maquina': filasMaquina,
                'Por Operador': filasOp,
            });
        } else {
            this.descargarPDF('Rendimiento Turnos y Maquinas', [
                { titulo: 'Por Turno', filas: filasTurno },
                { titulo: 'Por Maquina', filas: filasMaquina },
                { titulo: 'Por Operador', filas: filasOp },
            ]);
        }
    },

    // === BOBINAS RECHAZADAS ===
    bobinasRechazadas: async function(formato) {
        // Desde tabla bobinas (si existe migration 006) + sync_store fallback
        let bobinas = [];
        try {
            if (typeof BobinasService !== 'undefined') {
                bobinas = await BobinasService.listar({ estado: 'rechazada', limit: 1000 });
            }
        } catch(e) {}
        const bobinasMalas = await this.cargarSyncStore('axones_bobinas_malas');

        const filasBob = bobinas.map(b => ({
            'Codigo': b.codigo || '',
            'Tipo': b.tipo || '',
            'Material': b.material || '',
            'Micras x mm': `${b.micras || '-'} x ${b.ancho_mm || '-'}`,
            'Peso (Kg)': (parseFloat(b.peso_actual_kg) || 0).toFixed(2),
            'Proveedor': b.proveedor || '',
            'OC': b.orden_compra || '',
            'Lote': b.referencia_proveedor || '',
            'OT donde se rechazo': b.orden_trabajo || '',
            'Motivo': b.motivo_rechazo || '',
            'Fecha': b.fecha_recepcion || '',
        }));

        const filasMalas = (bobinasMalas || []).map(b => ({
            'Proceso': b.proceso || '',
            'Proveedor': b.proveedor || '',
            'Referencia': b.referencia || '',
            'Peso (Kg)': (parseFloat(b.kg) || 0).toFixed(2),
            'Motivo': b.motivo || '',
            'OT': b.ordenTrabajo || '',
            'Fecha': b.fecha || '',
            'Estado': b.estado || '',
        }));

        const resumen = [{
            'Bobinas tabla bobinas (rechazadas)': filasBob.length,
            'Bobinas malas (sync_store)': filasMalas.length,
            'Kg Total Rechazados': (
                filasBob.reduce((s, b) => s + parseFloat(b['Peso (Kg)']), 0) +
                filasMalas.reduce((s, b) => s + parseFloat(b['Peso (Kg)']), 0)
            ).toFixed(2),
        }];

        if (formato === 'xlsx') {
            this.descargarExcel('Bobinas_Rechazadas', {
                'Resumen': resumen,
                'Bobinas (tabla bobinas)': filasBob,
                'Bobinas Malas': filasMalas,
            });
        } else {
            this.descargarPDF('Bobinas Rechazadas', [
                { titulo: 'Resumen', filas: resumen },
                { titulo: 'Bobinas Rechazadas (tabla bobinas)', filas: filasBob },
                { titulo: 'Bobinas Malas (reportes)', filas: filasMalas }
            ]);
        }
    },

    // === MOVIMIENTOS INVENTARIO ===
    movimientos: async function(formato) {
        const movs = await this.cargarSyncStore('axones_movimientos_almacen');
        const filtrados = this.filtrarPorFecha(movs, 'fecha');

        const filas = filtrados.map(m => ({
            'Fecha': m.fecha || '',
            'Tipo': m.tipo || '',
            'Referencia': m.referencia || '',
            'OT': m.ot || '',
            'Cliente': m.cliente || '',
            'Proveedor': m.proveedor_destino || m.proveedor || '',
            'Descripcion': m.descripcion || '',
            'Cantidad': (parseFloat(m.cantidad) || 0).toFixed(2),
            'Unidad': m.unidad || '',
            'Observaciones': m.observaciones || '',
        })).sort((a, b) => (b.Fecha || '').localeCompare(a.Fecha || ''));

        const entradas = filtrados.filter(m => m.tipo === 'entrada').length;
        const salidas = filtrados.filter(m => m.tipo === 'salida' || m.tipo === 'despacho').length;

        const resumen = [{
            'Total Movimientos': filtrados.length,
            'Entradas': entradas,
            'Salidas/Despachos': salidas,
            'Periodo': `${this.getPeriodo().desde} a ${this.getPeriodo().hasta}`,
        }];

        if (formato === 'xlsx') {
            this.descargarExcel('Movimientos_Inventario', { 'Resumen': resumen, 'Detalle': filas });
        } else {
            this.descargarPDF('Movimientos de Inventario', [
                { titulo: 'Resumen', filas: resumen },
                { titulo: 'Movimientos', filas }
            ]);
        }
    },
};

if (typeof window !== 'undefined') window.ReportesMensuales = ReportesMensuales;
