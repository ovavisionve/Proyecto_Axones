/**
 * Modulo Dashboard - Sistema Axones
 * Maneja la visualizacion de metricas y KPIs
 */

const Dashboard = {
    // Configuracion de graficos
    charts: {},

    /**
     * Inicializa el modulo de dashboard
     */
    init: function() {
        console.log('Inicializando modulo Dashboard');
        // La inicializacion completa se hace cuando se carga la pagina de dashboard
    },

    /**
     * Carga y renderiza todos los datos del dashboard
     */
    load: async function() {
        if (!Auth.isAuthenticated()) {
            console.warn('Usuario no autenticado');
            return;
        }

        try {
            await Promise.all([
                this.loadKPIs(),
                this.loadProduccionChart(),
                this.loadDesperdicioChart(),
                this.loadOperadoresRanking(),
            ]);
        } catch (error) {
            console.error('Error cargando dashboard:', error);
        }
    },

    /**
     * Carga los KPIs principales desde datos reales
     */
    loadKPIs: async function() {
        // Calcular KPIs desde datos reales en localStorage
        const kpis = this.calcularKPIsReales();
        this.renderKPIs(kpis);
    },

    /**
     * Calcula KPIs desde datos reales
     */
    calcularKPIsReales: function() {
        // Inventario
        const inventario = JSON.parse(localStorage.getItem('axones_inventario') || '[]');
        const produccionTotal = inventario.reduce((sum, item) => sum + (parseFloat(item.kg) || 0), 0);

        // Ordenes
        const ordenes = JSON.parse(localStorage.getItem('axones_ordenes') || '[]');
        const ordenesCompletadas = ordenes.filter(o => o.estado === 'completado');
        const pedidosPendientes = ordenes.filter(o => o.estado !== 'completado' && o.estado !== 'cancelado').length;

        // Calcular desperdicio promedio
        let desperdicioPromedio = 0;
        if (ordenesCompletadas.length > 0) {
            const totalRefil = ordenesCompletadas.reduce((sum, o) => sum + (parseFloat(o.refil) || 0), 0);
            desperdicioPromedio = totalRefil / ordenesCompletadas.length;
        }

        // Alertas pendientes
        const alertas = JSON.parse(localStorage.getItem('axones_alertas') || '[]');
        const alertasPendientes = alertas.filter(a => a.estado === 'pendiente' || a.estado === 'activa').length;

        // Clientes unicos de ordenes
        const clientesUnicos = new Set(ordenes.map(o => o.cliente).filter(c => c));

        // Meta de produccion (estimada basada en inventario inicial)
        const produccionMeta = Math.max(produccionTotal * 1.1, 50000);

        // Eficiencia (basada en ordenes completadas vs totales)
        let eficienciaGeneral = 100;
        if (ordenes.length > 0) {
            eficienciaGeneral = (ordenesCompletadas.length / ordenes.length) * 100;
        }

        return {
            produccionTotal: produccionTotal,
            produccionMeta: produccionMeta,
            desperdicioPromedio: desperdicioPromedio,
            desperdicioMeta: 5.0,
            eficienciaGeneral: eficienciaGeneral,
            alertasPendientes: alertasPendientes,
            clientesActivos: clientesUnicos.size,
            pedidosPendientes: pedidosPendientes,
        };
    },

    /**
     * Renderiza los KPIs en la UI
     */
    renderKPIs: function(kpis) {
        // Produccion vs Meta
        const produccionPct = (kpis.produccionTotal / kpis.produccionMeta * 100).toFixed(1);
        this.updateKPICard('kpiProduccion', {
            value: Axones.formatNumber(kpis.produccionTotal),
            subtitle: `${produccionPct}% de meta (${Axones.formatNumber(kpis.produccionMeta)} kg)`,
            trend: produccionPct >= 100 ? 'up' : 'down',
        });

        // Desperdicio
        const desperdicioStatus = kpis.desperdicioPromedio <= kpis.desperdicioMeta ? 'success' : 'danger';
        this.updateKPICard('kpiDesperdicio', {
            value: kpis.desperdicioPromedio + '%',
            subtitle: `Meta: ${kpis.desperdicioMeta}%`,
            status: desperdicioStatus,
        });

        // Eficiencia
        this.updateKPICard('kpiEficiencia', {
            value: kpis.eficienciaGeneral + '%',
            subtitle: 'Eficiencia operativa',
            status: kpis.eficienciaGeneral >= 90 ? 'success' : 'warning',
        });

        // Alertas
        this.updateKPICard('kpiAlertas', {
            value: kpis.alertasPendientes,
            subtitle: 'Alertas pendientes',
            status: kpis.alertasPendientes > 0 ? 'danger' : 'success',
        });
    },

    /**
     * Actualiza una tarjeta de KPI
     */
    updateKPICard: function(elementId, data) {
        const el = document.getElementById(elementId);
        if (!el) return;

        const valueEl = el.querySelector('.kpi-value');
        const subtitleEl = el.querySelector('.kpi-subtitle');

        if (valueEl) valueEl.textContent = data.value;
        if (subtitleEl) subtitleEl.textContent = data.subtitle;

        if (data.status) {
            el.classList.remove('border-success', 'border-warning', 'border-danger');
            el.classList.add('border-' + data.status);
        }
    },

    /**
     * Carga datos para el grafico de produccion desde ordenes reales
     */
    loadProduccionChart: async function() {
        const labels = this.getLast7Days();
        const data = this.calcularProduccionPorDia();

        this.renderProduccionChart(labels, data);
    },

    /**
     * Calcula produccion real por dia de los ultimos 7 dias
     */
    calcularProduccionPorDia: function() {
        const ordenes = JSON.parse(localStorage.getItem('axones_ordenes') || '[]');
        const hoy = new Date();
        const produccionPorDia = [];

        for (let i = 6; i >= 0; i--) {
            const fecha = new Date(hoy);
            fecha.setDate(fecha.getDate() - i);
            const fechaStr = fecha.toISOString().split('T')[0];

            // Sumar produccion de ordenes de ese dia
            const produccionDia = ordenes
                .filter(o => {
                    if (!o.fechaCreacion) return false;
                    const fechaOrden = new Date(o.fechaCreacion).toISOString().split('T')[0];
                    return fechaOrden === fechaStr;
                })
                .reduce((sum, o) => sum + (parseFloat(o.pedidoKg) || 0), 0);

            produccionPorDia.push(produccionDia);
        }

        return produccionPorDia;
    },

    /**
     * Renderiza el grafico de produccion
     */
    renderProduccionChart: function(labels, data) {
        const canvas = document.getElementById('chartProduccion');
        if (!canvas) return;

        // Si existe un grafico previo, destruirlo
        if (this.charts.produccion) {
            this.charts.produccion.destroy();
        }

        // Se requiere Chart.js para graficos
        if (typeof Chart === 'undefined') {
            console.warn('Chart.js no esta cargado');
            return;
        }

        this.charts.produccion = new Chart(canvas, {
            type: 'bar',
            data: {
                labels: labels,
                datasets: [{
                    label: 'Produccion (kg)',
                    data: data,
                    backgroundColor: 'rgba(13, 110, 253, 0.7)',
                    borderColor: 'rgba(13, 110, 253, 1)',
                    borderWidth: 1,
                }],
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        display: false,
                    },
                },
                scales: {
                    y: {
                        beginAtZero: true,
                    },
                },
            },
        });
    },

    /**
     * Carga datos para el grafico de desperdicio desde ordenes reales
     */
    loadDesperdicioChart: async function() {
        const labels = this.getLast7Days();
        const data = this.calcularDesperdicioPorDia();
        const umbral = 5.0;

        this.renderDesperdicioChart(labels, data, umbral);
    },

    /**
     * Calcula desperdicio real por dia de los ultimos 7 dias
     */
    calcularDesperdicioPorDia: function() {
        const ordenes = JSON.parse(localStorage.getItem('axones_ordenes') || '[]');
        const hoy = new Date();
        const desperdicioPorDia = [];

        for (let i = 6; i >= 0; i--) {
            const fecha = new Date(hoy);
            fecha.setDate(fecha.getDate() - i);
            const fechaStr = fecha.toISOString().split('T')[0];

            // Calcular promedio de refil de ordenes de ese dia
            const ordenesDia = ordenes.filter(o => {
                if (!o.fechaCreacion) return false;
                const fechaOrden = new Date(o.fechaCreacion).toISOString().split('T')[0];
                return fechaOrden === fechaStr && o.refil !== undefined;
            });

            let promedioDia = 0;
            if (ordenesDia.length > 0) {
                const totalRefil = ordenesDia.reduce((sum, o) => sum + (parseFloat(o.refil) || 0), 0);
                promedioDia = totalRefil / ordenesDia.length;
            }

            desperdicioPorDia.push(parseFloat(promedioDia.toFixed(2)));
        }

        return desperdicioPorDia;
    },

    /**
     * Renderiza el grafico de desperdicio
     */
    renderDesperdicioChart: function(labels, data, umbral) {
        const canvas = document.getElementById('chartDesperdicio');
        if (!canvas) return;

        if (this.charts.desperdicio) {
            this.charts.desperdicio.destroy();
        }

        if (typeof Chart === 'undefined') {
            console.warn('Chart.js no esta cargado');
            return;
        }

        this.charts.desperdicio = new Chart(canvas, {
            type: 'line',
            data: {
                labels: labels,
                datasets: [
                    {
                        label: 'Desperdicio (%)',
                        data: data,
                        borderColor: 'rgba(255, 193, 7, 1)',
                        backgroundColor: 'rgba(255, 193, 7, 0.1)',
                        fill: true,
                        tension: 0.3,
                    },
                    {
                        label: 'Umbral maximo',
                        data: Array(labels.length).fill(umbral),
                        borderColor: 'rgba(220, 53, 69, 0.7)',
                        borderDash: [5, 5],
                        pointRadius: 0,
                        fill: false,
                    },
                ],
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'bottom',
                    },
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        max: 10,
                    },
                },
            },
        });
    },

    /**
     * Carga ranking de operadores desde datos reales
     */
    loadOperadoresRanking: async function() {
        const operadores = this.calcularRankingOperadores();
        this.renderOperadoresRanking(operadores);
    },

    /**
     * Calcula ranking de operadores desde ordenes reales
     */
    calcularRankingOperadores: function() {
        const ordenes = JSON.parse(localStorage.getItem('axones_ordenes') || '[]');

        // Agrupar por operador/registrador
        const operadoresMap = {};

        ordenes.forEach(orden => {
            const nombre = orden.registradoPorNombre || orden.operador || 'Sin asignar';
            if (!operadoresMap[nombre]) {
                operadoresMap[nombre] = {
                    nombre: nombre,
                    ordenes: 0,
                    ordenesCompletadas: 0,
                    totalRefil: 0,
                    totalKg: 0
                };
            }
            operadoresMap[nombre].ordenes++;
            operadoresMap[nombre].totalKg += parseFloat(orden.pedidoKg) || 0;
            if (orden.estado === 'completado') {
                operadoresMap[nombre].ordenesCompletadas++;
                operadoresMap[nombre].totalRefil += parseFloat(orden.refil) || 0;
            }
        });

        // Convertir a array y calcular metricas
        const operadores = Object.values(operadoresMap).map(op => ({
            nombre: op.nombre,
            desperdicio: op.ordenesCompletadas > 0 ? (op.totalRefil / op.ordenesCompletadas) : 0,
            produccion: op.totalKg,
            eficiencia: op.ordenes > 0 ? Math.round((op.ordenesCompletadas / op.ordenes) * 100) : 0
        }));

        // Ordenar por menor desperdicio (mejor)
        operadores.sort((a, b) => a.desperdicio - b.desperdicio);

        // Si no hay datos, mostrar mensaje
        if (operadores.length === 0) {
            return [{
                nombre: 'Sin datos',
                desperdicio: 0,
                produccion: 0,
                eficiencia: 0
            }];
        }

        // Limitar a top 5
        return operadores.slice(0, 5);
    },

    /**
     * Renderiza el ranking de operadores
     */
    renderOperadoresRanking: function(operadores) {
        const container = document.getElementById('rankingOperadores');
        if (!container) return;

        container.innerHTML = operadores.map((op, index) => {
            const badgeClass = index === 0 ? 'bg-success' : (index === operadores.length - 1 ? 'bg-danger' : 'bg-secondary');
            const icon = index === 0 ? 'trophy' : 'person';

            return `
                <div class="d-flex align-items-center justify-content-between py-2 ${index < operadores.length - 1 ? 'border-bottom' : ''}">
                    <div class="d-flex align-items-center">
                        <span class="badge ${badgeClass} me-2">${index + 1}</span>
                        <i class="bi bi-${icon} me-2"></i>
                        <span>${op.nombre}</span>
                    </div>
                    <div class="text-end">
                        <small class="d-block text-muted">Desperdicio: ${op.desperdicio}%</small>
                        <small class="d-block text-muted">Eficiencia: ${op.eficiencia}%</small>
                    </div>
                </div>
            `;
        }).join('');
    },

    /**
     * Obtiene los ultimos 7 dias como labels
     */
    getLast7Days: function() {
        const days = [];
        const today = new Date();

        for (let i = 6; i >= 0; i--) {
            const date = new Date(today);
            date.setDate(date.getDate() - i);
            days.push(date.toLocaleDateString('es-VE', { weekday: 'short', day: 'numeric' }));
        }

        return days;
    },

    /**
     * Exporta datos del dashboard a CSV
     */
    exportToCSV: function(data, filename) {
        if (!Auth.tienePermiso('dashboard.exportar')) {
            Axones.showError('No tiene permisos para exportar');
            return;
        }

        // Implementar exportacion a CSV
        console.log('Exportando a CSV:', filename);
    },
};

// Inicializar cuando el DOM este listo
document.addEventListener('DOMContentLoaded', () => {
    Dashboard.init();
});

// Exportar modulo
if (typeof module !== 'undefined' && module.exports) {
    module.exports = Dashboard;
}
