/**
 * Modulo de Reportes - Sistema Axones
 * Generacion de reportes y exportacion de datos
 */

const ReportesModule = {
    // Datos filtrados
    datosFiltrados: [],
    tipoReporteActual: 'produccion',

    // Inicializar
    init() {
        console.log('Inicializando modulo de Reportes...');
        this.setFechasDefault();
        this.cargarMaquinas();
        this.aplicarFiltros();
    },

    // Establecer fechas por defecto (ultimo mes)
    setFechasDefault() {
        const hoy = new Date();
        const hace30Dias = new Date();
        hace30Dias.setDate(hace30Dias.getDate() - 30);

        const fechaInicio = document.getElementById('fechaInicio');
        const fechaFin = document.getElementById('fechaFin');

        if (fechaInicio) fechaInicio.value = hace30Dias.toISOString().split('T')[0];
        if (fechaFin) fechaFin.value = hoy.toISOString().split('T')[0];
    },

    // Cargar maquinas en filtro
    cargarMaquinas() {
        const select = document.getElementById('filtroMaquina');
        if (!select) return;

        const maquinas = [
            ...CONFIG.MAQUINAS.IMPRESORAS,
            ...CONFIG.MAQUINAS.LAMINADORAS,
            ...CONFIG.MAQUINAS.CORTADORAS,
        ];

        maquinas.forEach(m => {
            const option = document.createElement('option');
            option.value = m.nombre;
            option.textContent = m.nombre;
            select.appendChild(option);
        });
    },

    // Aplicar filtros
    aplicarFiltros() {
        const fechaInicio = document.getElementById('fechaInicio')?.value;
        const fechaFin = document.getElementById('fechaFin')?.value;
        const maquina = document.getElementById('filtroMaquina')?.value;

        // Obtener datos de produccion
        const produccion = JSON.parse(localStorage.getItem('axones_produccion') || '[]');

        // Filtrar por fecha
        this.datosFiltrados = produccion.filter(item => {
            const fecha = item.fecha || item.timestamp?.split('T')[0];
            if (!fecha) return false;

            if (fechaInicio && fecha < fechaInicio) return false;
            if (fechaFin && fecha > fechaFin) return false;
            if (maquina && item.maquina !== maquina) return false;

            return true;
        });

        this.actualizarEstadisticas();
        this.renderizarTabla();
    },

    // Actualizar estadisticas del periodo
    actualizarEstadisticas() {
        const datos = this.datosFiltrados;

        // Produccion total
        const produccionTotal = datos.reduce((sum, item) => {
            return sum + (parseFloat(item.pesoTotal) || parseFloat(item.totalSalida) || 0);
        }, 0);

        // Refil promedio
        let refilTotal = 0;
        let refilCount = 0;
        datos.forEach(item => {
            const refil = parseFloat(item.porcentajeRefil) || 0;
            if (refil > 0) {
                refilTotal += refil;
                refilCount++;
            }
        });
        const refilPromedio = refilCount > 0 ? (refilTotal / refilCount) : 0;

        // Alertas del periodo
        const fechaInicio = document.getElementById('fechaInicio')?.value;
        const fechaFin = document.getElementById('fechaFin')?.value;
        const alertas = JSON.parse(localStorage.getItem('axones_alertas') || '[]');
        const alertasPeriodo = alertas.filter(a => {
            const fecha = a.fecha?.split('T')[0];
            if (!fecha) return false;
            if (fechaInicio && fecha < fechaInicio) return false;
            if (fechaFin && fecha > fechaFin) return false;
            return true;
        }).length;

        // Actualizar UI
        const statProduccionTotal = document.getElementById('statProduccionTotal');
        const statRegistros = document.getElementById('statRegistros');
        const statRefilPromedio = document.getElementById('statRefilPromedio');
        const statAlertasPeriodo = document.getElementById('statAlertasPeriodo');

        if (statProduccionTotal) statProduccionTotal.textContent = this.formatearNumero(produccionTotal);
        if (statRegistros) statRegistros.textContent = datos.length;
        if (statRefilPromedio) {
            statRefilPromedio.textContent = refilPromedio.toFixed(1) + '%';
            statRefilPromedio.className = 'stat-number ' +
                (refilPromedio > 6 ? 'text-danger' : refilPromedio > 5 ? 'text-warning' : 'text-success');
        }
        if (statAlertasPeriodo) statAlertasPeriodo.textContent = alertasPeriodo;
    },

    // Renderizar tabla de datos
    renderizarTabla() {
        const tbody = document.getElementById('tablaDatos');
        if (!tbody) return;

        if (this.datosFiltrados.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="8" class="text-center text-muted py-4">
                        No hay datos para el periodo seleccionado
                    </td>
                </tr>
            `;
            return;
        }

        tbody.innerHTML = this.datosFiltrados.map(item => {
            const refil = parseFloat(item.porcentajeRefil) || 0;
            const refilClass = refil > 6 ? 'text-danger' : refil > 5 ? 'text-warning' : 'text-success';

            return `
                <tr>
                    <td>${this.formatearFecha(item.fecha)}</td>
                    <td><strong>${item.ordenTrabajo || '-'}</strong></td>
                    <td>${item.cliente || '-'}</td>
                    <td>${item.producto || '-'}</td>
                    <td>${item.maquina || '-'}</td>
                    <td class="text-end">${this.formatearNumero(item.totalMaterialEntrada || item.totalEntrada || 0)}</td>
                    <td class="text-end">${this.formatearNumero(item.pesoTotal || item.totalSalida || 0)}</td>
                    <td class="text-end ${refilClass}"><strong>${refil.toFixed(1)}%</strong></td>
                </tr>
            `;
        }).join('');
    },

    // Generar reporte especifico
    generarReporte(tipo) {
        this.tipoReporteActual = tipo;

        switch (tipo) {
            case 'produccion':
                this.exportarReporteProduccion();
                break;
            case 'refil':
                this.exportarReporteRefil();
                break;
            case 'inventario':
                this.exportarReporteInventario();
                break;
            case 'tintas':
                this.exportarReporteTintas();
                break;
        }
    },

    // Exportar reporte de produccion
    exportarReporteProduccion() {
        const datos = this.datosFiltrados.map(item => ({
            'Fecha': item.fecha,
            'Turno': item.turno,
            'OT': item.ordenTrabajo,
            'Cliente': item.cliente,
            'Producto': item.producto,
            'Maquina': item.maquina,
            'Operador': item.operador,
            'Entrada (Kg)': item.totalMaterialEntrada || item.totalEntrada || 0,
            'Salida (Kg)': item.pesoTotal || item.totalSalida || 0,
            'Merma (Kg)': item.merma || 0,
            'Refil %': item.porcentajeRefil || 0,
            'Tiempo Muerto (min)': item.tiempoMuerto || 0,
            'Tiempo Efectivo (min)': item.tiempoEfectivo || 0,
        }));

        this.descargarCSV(datos, 'reporte_produccion');
        this.mostrarNotificacion('Reporte de produccion generado', 'success');
    },

    // Exportar reporte de refil
    exportarReporteRefil() {
        const datos = this.datosFiltrados
            .filter(item => parseFloat(item.porcentajeRefil) > 0)
            .sort((a, b) => parseFloat(b.porcentajeRefil) - parseFloat(a.porcentajeRefil))
            .map(item => ({
                'Fecha': item.fecha,
                'OT': item.ordenTrabajo,
                'Maquina': item.maquina,
                'Operador': item.operador,
                'Producto': item.producto,
                'Entrada (Kg)': item.totalMaterialEntrada || item.totalEntrada || 0,
                'Salida (Kg)': item.pesoTotal || item.totalSalida || 0,
                'Scrap Transp (Kg)': item.scrapTransparente || 0,
                'Scrap Impreso (Kg)': item.scrapImpreso || 0,
                'Merma (Kg)': item.merma || 0,
                'Refil %': item.porcentajeRefil || 0,
                'Estado': parseFloat(item.porcentajeRefil) > 6 ? 'EXCEDIDO' : parseFloat(item.porcentajeRefil) > 5 ? 'ADVERTENCIA' : 'OK',
            }));

        this.descargarCSV(datos, 'reporte_refil');
        this.mostrarNotificacion('Reporte de refil generado', 'success');
    },

    // Exportar reporte de inventario
    exportarReporteInventario() {
        const inventario = JSON.parse(localStorage.getItem('axones_inventario') || '[]');

        const datos = inventario.map(item => ({
            'Material': item.material,
            'Micras': item.micras,
            'Ancho': item.ancho,
            'Kg': item.kg,
            'Producto': item.producto,
            'Cliente': item.cliente,
            'Estado': parseFloat(item.kg) < 50 ? 'CRITICO' : parseFloat(item.kg) < 100 ? 'BAJO' : 'OK',
        }));

        this.descargarCSV(datos, 'reporte_inventario');
        this.mostrarNotificacion('Reporte de inventario generado', 'success');
    },

    // Exportar reporte de tintas
    exportarReporteTintas() {
        const tintas = JSON.parse(localStorage.getItem('axones_tintas') || '[]');

        const datos = tintas.map(item => ({
            'Fecha': item.fecha,
            'OT': item.ot,
            'Cliente': item.cliente,
            'Producto': item.producto,
            'Maquina': item.maquina,
            'Total Tintas Laminacion (Kg)': item.totalTintasLaminacion || 0,
            'Total Tintas Superficie (Kg)': item.totalTintasSuperficie || 0,
            'Total Solventes (Kg)': item.totalSolventes || 0,
        }));

        this.descargarCSV(datos, 'reporte_tintas');
        this.mostrarNotificacion('Reporte de tintas generado', 'success');
    },

    // Exportar tabla actual como CSV
    exportarCSV() {
        const datos = this.datosFiltrados.map(item => ({
            'Fecha': item.fecha,
            'OT': item.ordenTrabajo,
            'Cliente': item.cliente,
            'Producto': item.producto,
            'Maquina': item.maquina,
            'Entrada (Kg)': item.totalMaterialEntrada || item.totalEntrada || 0,
            'Salida (Kg)': item.pesoTotal || item.totalSalida || 0,
            'Refil %': item.porcentajeRefil || 0,
        }));

        this.descargarCSV(datos, 'datos_produccion');
    },

    // Exportar como Excel (genera CSV compatible)
    exportarExcel() {
        // Por ahora genera CSV que Excel puede abrir
        this.exportarCSV();
        this.mostrarNotificacion('Archivo generado. Abrir con Excel.', 'info');
    },

    // Descargar archivo CSV
    descargarCSV(datos, nombreArchivo) {
        if (datos.length === 0) {
            this.mostrarNotificacion('No hay datos para exportar', 'warning');
            return;
        }

        // Obtener headers
        const headers = Object.keys(datos[0]);

        // Crear contenido CSV
        let csv = headers.join(',') + '\n';
        datos.forEach(row => {
            csv += headers.map(header => {
                let value = row[header];
                // Escapar comillas y encerrar en comillas si contiene comas
                if (typeof value === 'string' && (value.includes(',') || value.includes('"'))) {
                    value = '"' + value.replace(/"/g, '""') + '"';
                }
                return value;
            }).join(',') + '\n';
        });

        // Crear blob y descargar
        const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        const fecha = new Date().toISOString().split('T')[0];

        link.href = URL.createObjectURL(blob);
        link.download = `${nombreArchivo}_${fecha}.csv`;
        link.click();

        URL.revokeObjectURL(link.href);
    },

    // Formatear numero
    formatearNumero(num) {
        return new Intl.NumberFormat('es-VE').format(Math.round(num));
    },

    // Formatear fecha
    formatearFecha(fecha) {
        if (!fecha) return '-';
        const d = new Date(fecha);
        return d.toLocaleDateString('es-VE');
    },

    // Mostrar notificacion
    mostrarNotificacion(mensaje, tipo = 'success') {
        let toastContainer = document.querySelector('.toast-container');
        if (!toastContainer) {
            toastContainer = document.createElement('div');
            toastContainer.className = 'toast-container position-fixed bottom-0 end-0 p-3';
            document.body.appendChild(toastContainer);
        }

        const bgClass = tipo === 'success' ? 'bg-success' :
                       tipo === 'warning' ? 'bg-warning' :
                       tipo === 'danger' ? 'bg-danger' : 'bg-info';

        const toast = document.createElement('div');
        toast.className = `toast align-items-center text-white ${bgClass} border-0`;
        toast.innerHTML = `
            <div class="d-flex">
                <div class="toast-body">${mensaje}</div>
                <button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast"></button>
            </div>
        `;

        toastContainer.appendChild(toast);
        const bsToast = new bootstrap.Toast(toast);
        bsToast.show();

        toast.addEventListener('hidden.bs.toast', () => toast.remove());
    }
};

// Inicializar cuando el DOM este listo
document.addEventListener('DOMContentLoaded', () => {
    ReportesModule.init();
});

// Exportar para uso global
if (typeof window !== 'undefined') {
    window.ReportesModule = ReportesModule;
}
