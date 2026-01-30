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
     * Carga los KPIs principales
     */
    loadKPIs: async function() {
        // En desarrollo, usar datos de ejemplo
        const kpis = {
            produccionTotal: 45600,
            produccionMeta: 50000,
            desperdicioPromedio: 3.8,
            desperdicioMeta: 5.0,
            eficienciaGeneral: 91.2,
            alertasPendientes: 3,
            clientesActivos: 24,
            pedidosPendientes: 12,
        };

        this.renderKPIs(kpis);
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
     * Carga datos para el grafico de produccion
     */
    loadProduccionChart: async function() {
        // Datos de ejemplo - ultimos 7 dias
        const labels = this.getLast7Days();
        const data = [3200, 3450, 2980, 3600, 3800, 3200, 2800];

        this.renderProduccionChart(labels, data);
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
     * Carga datos para el grafico de desperdicio
     */
    loadDesperdicioChart: async function() {
        const labels = this.getLast7Days();
        const data = [3.2, 4.1, 2.8, 5.2, 3.6, 4.8, 3.4];
        const umbral = 5.0;

        this.renderDesperdicioChart(labels, data, umbral);
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
     * Carga ranking de operadores
     */
    loadOperadoresRanking: async function() {
        // Datos de ejemplo
        const operadores = [
            { nombre: 'Maria Garcia', desperdicio: 2.8, produccion: 4200, eficiencia: 94 },
            { nombre: 'Carlos Perez', desperdicio: 3.2, produccion: 3900, eficiencia: 91 },
            { nombre: 'Ana Martinez', desperdicio: 3.5, produccion: 3800, eficiencia: 89 },
            { nombre: 'Luis Rodriguez', desperdicio: 4.1, produccion: 3600, eficiencia: 86 },
            { nombre: 'Pedro Sanchez', desperdicio: 4.8, produccion: 3400, eficiencia: 82 },
        ];

        this.renderOperadoresRanking(operadores);
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
