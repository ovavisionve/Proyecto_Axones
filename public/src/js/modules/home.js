/**
 * Modulo Home - Dashboard Principal
 * Sistema Axones - Inversiones Axones 2008, C.A.
 * Funcionalidad del panel de control
 */

const HomeModule = {
    // Configuracion
    config: {
        refreshInterval: 60000, // Actualizar cada minuto
        stockMinimo: 100, // Kg minimo antes de alerta
    },

    // Inicializar modulo
    init() {
        console.log('Inicializando modulo Home...');
        this.actualizarFechaHora();
        this.verificarConexion();
        this.cargarDatos();
        this.iniciarActualizacionAutomatica();
    },

    // Verificar conexion con Google Sheets API
    async verificarConexion() {
        const badge = document.getElementById('conexionBadge');
        if (!badge) return;

        // Verificar si CONFIG existe y tiene URL
        if (typeof CONFIG === 'undefined' || !CONFIG.API || !CONFIG.API.BASE_URL) {
            badge.className = 'ms-2 badge bg-secondary';
            badge.innerHTML = '<i class="bi bi-database-x me-1"></i>Sin configurar';
            return;
        }

        try {
            const response = await fetch(CONFIG.API.BASE_URL + '?action=ping', {
                method: 'GET',
                mode: 'cors'
            });

            if (response.ok) {
                const data = await response.json();
                if (data.success) {
                    badge.className = 'ms-2 badge bg-success';
                    badge.innerHTML = '<i class="bi bi-cloud-check me-1"></i>Conectado a Sheets';
                    console.log('Conexion a Google Sheets exitosa:', data);
                } else {
                    throw new Error(data.error || 'Error en respuesta');
                }
            } else {
                throw new Error('HTTP ' + response.status);
            }
        } catch (error) {
            badge.className = 'ms-2 badge bg-danger';
            badge.innerHTML = '<i class="bi bi-cloud-slash me-1"></i>Sin conexion';
            console.error('Error de conexion:', error.message);
        }
    },

    // Actualizar fecha y hora
    actualizarFechaHora() {
        const ahora = new Date();
        const opciones = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
        const fecha = ahora.toLocaleDateString('es-VE', opciones);
        const hora = ahora.toLocaleTimeString('es-VE', { hour: '2-digit', minute: '2-digit' });

        const fechaEl = document.getElementById('currentDate');
        const horaEl = document.getElementById('currentTime');

        if (fechaEl) fechaEl.textContent = fecha.charAt(0).toUpperCase() + fecha.slice(1);
        if (horaEl) horaEl.textContent = hora;

        // Actualizar hora cada segundo
        setInterval(() => {
            const now = new Date();
            const time = now.toLocaleTimeString('es-VE', { hour: '2-digit', minute: '2-digit' });
            if (horaEl) horaEl.textContent = time;
        }, 1000);
    },

    // Cargar todos los datos del dashboard
    async cargarDatos() {
        // Siempre cargar datos locales primero para mostrar KPIs inmediatamente
        this.cargarDatosDesdeLocal();

        // Luego intentar mejorar con datos de la API
        try {
            await this.cargarDatosDesdeAPI();
        } catch (error) {
            console.warn('API no disponible, usando datos locales:', error.message);
        }
    },

    // Cargar datos desde la API de Google Sheets
    async cargarDatosDesdeAPI() {
        try {
            const dashboardData = await AxonesAPI.getDashboardData();

            if (dashboardData.success && dashboardData.data) {
                const data = dashboardData.data;

                // Actualizar KPIs
                const statProduccion = document.getElementById('statProduccion');
                const statRefil = document.getElementById('statRefil');
                const refilStatus = document.getElementById('refilStatus');
                const statAlertas = document.getElementById('statAlertas');

                if (statProduccion) {
                    statProduccion.textContent = this.formatearNumero(data.resumen.total_kilos_producidos);
                }

                if (statRefil) {
                    const refil = parseFloat(data.resumen.promedio_refil_porcentaje) || 0;
                    statRefil.textContent = refil.toFixed(1) + '%';

                    if (refilStatus) {
                        if (refil > 6) {
                            refilStatus.className = 'text-danger';
                            refilStatus.innerHTML = '<i class="bi bi-exclamation-triangle me-1"></i>Alto';
                        } else if (refil > 5) {
                            refilStatus.className = 'text-warning';
                            refilStatus.innerHTML = '<i class="bi bi-exclamation-circle me-1"></i>Advertencia';
                        } else {
                            refilStatus.className = 'text-success';
                            refilStatus.innerHTML = '<i class="bi bi-check-circle me-1"></i>OK';
                        }
                    }
                }

                if (statAlertas) {
                    statAlertas.textContent = data.resumen.alertas_pendientes || 0;

                    // Badge en navbar
                    const alertasBadge = document.getElementById('alertasBadge');
                    if (alertasBadge) {
                        if (data.resumen.alertas_pendientes > 0) {
                            alertasBadge.textContent = data.resumen.alertas_pendientes;
                            alertasBadge.style.display = 'inline-block';
                        } else {
                            alertasBadge.style.display = 'none';
                        }
                    }
                }

                // Cargar grafico por maquina
                this.cargarGraficoDesdeAPI(data.por_maquina, data.por_cliente);

                // Cargar produccion por maquina en la tabla
                this.cargarProduccionPorMaquina(data.por_maquina);
            }

            // Cargar alertas desde API
            await this.cargarAlertasDesdeAPI();

            // Cargar maquinas desde API
            await this.cargarMaquinasDesdeAPI();

            // Inventario desde API
            await this.cargarInventarioDesdeAPI();

            // Graficos Power BI (usa localStorage como cache)
            this.cargarGraficosPowerBI();

        } catch (error) {
            throw error;
        }
    },

    // Cargar alertas desde API
    async cargarAlertasDesdeAPI() {
        try {
            const response = await AxonesAPI.getAlertas({ no_leidas: 'true' });
            if (response.success && response.data) {
                const container = document.getElementById('alertasRecientes');
                if (!container) return;

                const alertas = response.data.slice(0, 5);

                if (alertas.length === 0) {
                    container.innerHTML = `
                        <div class="text-center text-muted py-4">
                            <i class="bi bi-check-circle display-6 text-success d-block mb-2"></i>
                            <p class="mb-0">No hay alertas pendientes</p>
                        </div>
                    `;
                    return;
                }

                container.innerHTML = alertas.map(alerta => {
                    const icono = this.obtenerIconoAlerta(alerta.tipo);
                    const clase = alerta.nivel === 'danger' || alerta.nivel === 'critical' ? 'danger' : 'warning';
                    return `
                        <div class="alert-item ${clase} p-3 border-bottom">
                            <div class="d-flex align-items-start">
                                <i class="bi ${icono} me-2 mt-1 text-${clase}"></i>
                                <div class="flex-grow-1">
                                    <p class="mb-1 small fw-medium">${alerta.mensaje}</p>
                                    <small class="text-muted">
                                        <i class="bi bi-clock me-1"></i>${this.formatearFecha(alerta.fecha)}
                                    </small>
                                </div>
                            </div>
                        </div>
                    `;
                }).join('');
            }
        } catch (error) {
            console.warn('Error cargando alertas:', error);
        }
    },

    // Cargar maquinas desde API
    async cargarMaquinasDesdeAPI() {
        try {
            const response = await AxonesAPI.getMaquinas();
            if (response.success && response.data) {
                const container = document.getElementById('listaMaquinas');
                if (!container) return;

                container.innerHTML = response.data.map(m => {
                    const estadoClase = m.estado === 'activa' ? 'active' : m.estado === 'espera' ? 'idle' : 'stopped';
                    const badgeClase = m.estado === 'activa' ? 'bg-success' : m.estado === 'espera' ? 'bg-warning text-dark' : 'bg-danger';
                    const estadoTexto = m.estado === 'activa' ? 'Activa' : m.estado === 'espera' ? 'En espera' : 'Detenida';

                    return `
                        <li class="list-group-item d-flex justify-content-between align-items-center">
                            <span><span class="machine-status ${estadoClase} me-2"></span>${m.nombre}</span>
                            <span class="badge ${badgeClase}">${estadoTexto}</span>
                        </li>
                    `;
                }).join('');
            }
        } catch (error) {
            console.warn('Error cargando maquinas:', error);
            this.cargarEstadoMaquinas();
        }
    },

    // Cargar inventario desde API
    async cargarInventarioDesdeAPI() {
        try {
            const response = await AxonesAPI.getInventario();
            if (response.success && response.data) {
                const inventario = response.data;
                const tbody = document.getElementById('inventarioBajo');
                if (!tbody) return;

                const stockBajo = inventario.filter(item => parseFloat(item.cantidad) < 100);

                // Actualizar stat de inventario
                const statInventario = document.getElementById('statInventario');
                if (statInventario) {
                    const total = inventario.reduce((sum, i) => sum + (parseFloat(i.cantidad) || 0), 0);
                    statInventario.textContent = this.formatearNumero(total);
                }

                if (stockBajo.length === 0) {
                    tbody.innerHTML = `
                        <tr>
                            <td colspan="6" class="text-center text-muted py-3">
                                <i class="bi bi-check-circle text-success me-2"></i>
                                Todo el inventario esta en niveles adecuados
                            </td>
                        </tr>
                    `;
                    return;
                }

                tbody.innerHTML = stockBajo.slice(0, 5).map(item => {
                    const estado = parseFloat(item.cantidad) < 50 ?
                        '<span class="badge bg-danger">Critico</span>' :
                        '<span class="badge bg-warning text-dark">Bajo</span>';

                    return `
                        <tr>
                            <td><strong>${item.material || '-'}</strong></td>
                            <td class="text-center">${item.tipo || '-'}</td>
                            <td class="text-center">-</td>
                            <td class="text-end">${this.formatearNumero(item.cantidad)}</td>
                            <td>${item.ubicacion || '-'}</td>
                            <td class="text-center">${estado}</td>
                        </tr>
                    `;
                }).join('');
            }
        } catch (error) {
            console.warn('Error cargando inventario:', error);
            this.cargarInventarioBajo();
        }
    },

    // Cargar produccion por maquina (tabla)
    cargarProduccionPorMaquina(porMaquina) {
        const container = document.getElementById('produccionHoy');
        const totalOTsHoy = document.getElementById('totalOTsHoy');
        if (!container) return;

        const maquinas = Object.keys(porMaquina);

        if (totalOTsHoy) {
            const total = Object.values(porMaquina).reduce((a, b) => a + b, 0);
            totalOTsHoy.textContent = `${this.formatearNumero(total)} Kg`;
        }

        if (maquinas.length === 0) {
            container.innerHTML = `
                <div class="text-center text-muted py-3">
                    <i class="bi bi-inbox display-6 d-block mb-2"></i>
                    <p class="mb-0">No hay registros de produccion este mes</p>
                    <a href="impresion.html" class="btn btn-primary btn-sm mt-2">
                        <i class="bi bi-plus me-1"></i>Crear registro
                    </a>
                </div>
            `;
            return;
        }

        let html = '<div class="table-responsive"><table class="table table-sm mb-0">';
        html += '<thead class="table-light"><tr><th>Maquina</th><th class="text-end">Kg Producidos</th></tr></thead>';
        html += '<tbody>';

        maquinas.forEach(maq => {
            html += `
                <tr>
                    <td><i class="bi bi-cpu me-1 text-muted"></i>${maq}</td>
                    <td class="text-end">${this.formatearNumero(porMaquina[maq])}</td>
                </tr>
            `;
        });

        html += '</tbody></table></div>';
        container.innerHTML = html;
    },

    // Cargar graficos desde datos de API
    cargarGraficoDesdeAPI(porMaquina, porCliente) {
        // Grafico de produccion por maquina
        const canvasRefil = document.getElementById('chartRefil');
        if (canvasRefil && porMaquina) {
            if (this.charts.refil) {
                this.charts.refil.destroy();
            }

            const labels = Object.keys(porMaquina);
            const data = Object.values(porMaquina);

            if (labels.length > 0) {
                this.charts.refil = new Chart(canvasRefil, {
                    type: 'doughnut',
                    data: {
                        labels: labels,
                        datasets: [{
                            data: data,
                            backgroundColor: [
                                'rgba(25, 135, 84, 0.8)',
                                'rgba(13, 110, 253, 0.8)',
                                'rgba(255, 193, 7, 0.8)',
                                'rgba(220, 53, 69, 0.8)',
                                'rgba(111, 66, 193, 0.8)',
                                'rgba(23, 162, 184, 0.8)'
                            ],
                            borderWidth: 2,
                            borderColor: '#fff'
                        }]
                    },
                    options: {
                        responsive: true,
                        maintainAspectRatio: false,
                        plugins: {
                            legend: {
                                position: 'bottom'
                            },
                            title: {
                                display: true,
                                text: 'Produccion por Maquina'
                            }
                        }
                    }
                });
            }
        }

        // Grafico de produccion (barras) - por cliente
        const canvasProd = document.getElementById('chartProduccion');
        if (canvasProd && porCliente) {
            if (this.charts.produccion) {
                this.charts.produccion.destroy();
            }

            const labels = Object.keys(porCliente).slice(0, 7);
            const data = labels.map(l => porCliente[l]);

            if (labels.length > 0) {
                this.charts.produccion = new Chart(canvasProd, {
                    type: 'bar',
                    data: {
                        labels: labels,
                        datasets: [{
                            label: 'Produccion (Kg)',
                            data: data,
                            backgroundColor: 'rgba(25, 135, 84, 0.7)',
                            borderColor: 'rgb(25, 135, 84)',
                            borderWidth: 1
                        }]
                    },
                    options: {
                        responsive: true,
                        maintainAspectRatio: false,
                        plugins: {
                            legend: { display: false },
                            title: {
                                display: true,
                                text: 'Produccion por Cliente (Mes)'
                            }
                        },
                        scales: {
                            y: { beginAtZero: true }
                        }
                    }
                });
            }
        }
    },

    // Cargar datos desde localStorage (fallback)
    cargarDatosDesdeLocal() {
        this.cargarKPIs();
        this.cargarAlertasRecientes();
        this.cargarProduccionHoy();
        this.cargarInventarioBajo();
        this.cargarEstadoMaquinas();
        this.cargarGraficos();
        this.cargarGraficosPowerBI();
    },

    // Graficos
    charts: {},

    // Cargar graficos
    cargarGraficos() {
        this.cargarGraficoProduccion();
        this.cargarGraficoRefil();
    },

    // Grafico de produccion ultimos 7 dias
    cargarGraficoProduccion() {
        const canvas = document.getElementById('chartProduccion');
        if (!canvas) return;

        // Destruir grafico anterior si existe
        if (this.charts.produccion) {
            this.charts.produccion.destroy();
        }

        const produccion = JSON.parse(localStorage.getItem('axones_produccion') || '[]');

        // Obtener ultimos 7 dias
        const labels = [];
        const dataKg = [];
        const dataRefil = [];

        for (let i = 6; i >= 0; i--) {
            const fecha = new Date();
            fecha.setDate(fecha.getDate() - i);
            const fechaStr = fecha.toLocaleDateString('es-VE', { weekday: 'short', day: 'numeric' });
            labels.push(fechaStr);

            // Filtrar produccion de ese dia
            const registrosDia = produccion.filter(r => {
                const fechaReg = new Date(r.fecha).toDateString();
                return fechaReg === fecha.toDateString();
            });

            const totalKg = registrosDia.reduce((sum, r) => sum + (parseFloat(r.totalSalida) || 0), 0);
            const avgRefil = registrosDia.length > 0
                ? registrosDia.reduce((sum, r) => sum + (parseFloat(r.porcentajeRefil) || 0), 0) / registrosDia.length
                : 0;

            dataKg.push(totalKg);
            dataRefil.push(avgRefil);
        }

        this.charts.produccion = new Chart(canvas, {
            type: 'bar',
            data: {
                labels: labels,
                datasets: [
                    {
                        label: 'Produccion (Kg)',
                        data: dataKg,
                        backgroundColor: 'rgba(25, 135, 84, 0.7)',
                        borderColor: 'rgb(25, 135, 84)',
                        borderWidth: 1,
                        yAxisID: 'y'
                    },
                    {
                        label: 'Refil (%)',
                        data: dataRefil,
                        type: 'line',
                        borderColor: 'rgb(255, 193, 7)',
                        backgroundColor: 'rgba(255, 193, 7, 0.1)',
                        tension: 0.3,
                        fill: true,
                        yAxisID: 'y1'
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'top',
                    }
                },
                scales: {
                    y: {
                        type: 'linear',
                        position: 'left',
                        title: {
                            display: true,
                            text: 'Kg'
                        },
                        beginAtZero: true
                    },
                    y1: {
                        type: 'linear',
                        position: 'right',
                        title: {
                            display: true,
                            text: 'Refil %'
                        },
                        beginAtZero: true,
                        max: 15,
                        grid: {
                            drawOnChartArea: false
                        }
                    }
                }
            }
        });
    },

    // Grafico de refil por maquina
    cargarGraficoRefil() {
        const canvas = document.getElementById('chartRefil');
        if (!canvas) return;

        // Destruir grafico anterior si existe
        if (this.charts.refil) {
            this.charts.refil.destroy();
        }

        const produccion = JSON.parse(localStorage.getItem('axones_produccion') || '[]');

        // Agrupar por maquina
        const porMaquina = {};
        produccion.forEach(r => {
            const maq = r.maquina || 'Sin asignar';
            if (!porMaquina[maq]) {
                porMaquina[maq] = [];
            }
            porMaquina[maq].push(parseFloat(r.porcentajeRefil) || 0);
        });

        const labels = Object.keys(porMaquina);
        const data = labels.map(maq => {
            const refils = porMaquina[maq];
            return refils.reduce((a, b) => a + b, 0) / refils.length;
        });

        // Colores basados en umbral
        const colors = data.map(val => {
            if (val > CONFIG.UMBRALES_REFIL.default.maximo) return 'rgba(220, 53, 69, 0.8)';
            if (val > CONFIG.UMBRALES_REFIL.default.advertencia) return 'rgba(255, 193, 7, 0.8)';
            return 'rgba(25, 135, 84, 0.8)';
        });

        this.charts.refil = new Chart(canvas, {
            type: 'doughnut',
            data: {
                labels: labels.length > 0 ? labels : ['Sin datos'],
                datasets: [{
                    data: data.length > 0 ? data : [1],
                    backgroundColor: colors.length > 0 ? colors : ['#e9ecef'],
                    borderWidth: 2,
                    borderColor: '#fff'
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'bottom',
                        labels: {
                            boxWidth: 12,
                            padding: 8
                        }
                    },
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                return context.label + ': ' + context.raw.toFixed(1) + '%';
                            }
                        }
                    }
                }
            }
        });
    },

    // ==================== GRAFICOS POWER BI ====================

    // Cargar todos los graficos Power BI
    cargarGraficosPowerBI() {
        const produccion = JSON.parse(localStorage.getItem('axones_produccion') || '[]');
        const tintas = JSON.parse(localStorage.getItem('axones_tintas') || '[]');

        this.renderChartPorCliente(produccion);
        this.renderChartRefilTendencia(produccion);
        this.renderChartPorProceso(produccion);
        this.renderChartTintas(tintas);
        this.renderChartEficiencia(produccion);
    },

    // Grafico: Produccion por Cliente (horizontal bar)
    renderChartPorCliente(produccion) {
        const canvas = document.getElementById('chartPorCliente');
        if (!canvas) return;
        if (this.charts.porCliente) this.charts.porCliente.destroy();

        const porCliente = {};
        produccion.forEach(p => {
            const cliente = p.cliente || 'Sin cliente';
            porCliente[cliente] = (porCliente[cliente] || 0) + (parseFloat(p.pesoTotal) || parseFloat(p.totalSalida) || 0);
        });

        // Top 10 clientes
        const sorted = Object.entries(porCliente).sort((a, b) => b[1] - a[1]).slice(0, 10);
        const labels = sorted.map(s => s[0].length > 20 ? s[0].substring(0, 18) + '...' : s[0]);
        const data = sorted.map(s => Math.round(s[1]));

        const colors = [
            '#0d6efd', '#198754', '#ffc107', '#dc3545', '#6f42c1',
            '#0dcaf0', '#fd7e14', '#20c997', '#6610f2', '#d63384'
        ];

        if (sorted.length === 0) {
            this.charts.porCliente = new Chart(canvas, {
                type: 'bar', data: { labels: ['Sin datos'], datasets: [{ data: [0], backgroundColor: '#e9ecef' }] },
                options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } } }
            });
            return;
        }

        this.charts.porCliente = new Chart(canvas, {
            type: 'bar',
            data: {
                labels: labels,
                datasets: [{
                    label: 'Produccion (Kg)',
                    data: data,
                    backgroundColor: colors,
                    borderWidth: 0,
                    borderRadius: 4
                }]
            },
            options: {
                indexAxis: 'y',
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { display: false },
                    tooltip: {
                        callbacks: {
                            label: ctx => new Intl.NumberFormat('es-VE').format(ctx.raw) + ' Kg'
                        }
                    }
                },
                scales: {
                    x: { beginAtZero: true, grid: { display: false } },
                    y: { grid: { display: false } }
                }
            }
        });
    },

    // Grafico: Tendencia de Refil (line chart con linea de umbral)
    renderChartRefilTendencia(produccion) {
        const canvas = document.getElementById('chartRefilTendencia');
        if (!canvas) return;
        if (this.charts.refilTendencia) this.charts.refilTendencia.destroy();

        // Agrupar refil por dia (ultimos 30 dias)
        const porDia = {};
        const hoy = new Date();
        for (let i = 29; i >= 0; i--) {
            const fecha = new Date(hoy);
            fecha.setDate(fecha.getDate() - i);
            const key = fecha.toISOString().split('T')[0];
            porDia[key] = { total: 0, count: 0 };
        }

        produccion.forEach(p => {
            const fecha = (p.fecha || '').split('T')[0];
            const refil = parseFloat(p.porcentajeRefil) || 0;
            if (porDia[fecha] && refil > 0) {
                porDia[fecha].total += refil;
                porDia[fecha].count++;
            }
        });

        const labels = Object.keys(porDia).map(d => {
            const parts = d.split('-');
            return parts[2] + '/' + parts[1];
        });
        const dataRefil = Object.values(porDia).map(d => d.count > 0 ? +(d.total / d.count).toFixed(1) : null);
        const umbralMax = Array(30).fill(CONFIG.UMBRALES_REFIL.default.maximo);
        const umbralAdv = Array(30).fill(CONFIG.UMBRALES_REFIL.default.advertencia);

        this.charts.refilTendencia = new Chart(canvas, {
            type: 'line',
            data: {
                labels: labels,
                datasets: [
                    {
                        label: 'Refil Promedio (%)',
                        data: dataRefil,
                        borderColor: '#0d6efd',
                        backgroundColor: 'rgba(13, 110, 253, 0.1)',
                        fill: true,
                        tension: 0.4,
                        spanGaps: true,
                        pointRadius: 3,
                        pointBackgroundColor: '#0d6efd',
                        borderWidth: 2
                    },
                    {
                        label: 'Umbral Maximo (6%)',
                        data: umbralMax,
                        borderColor: '#dc3545',
                        borderDash: [8, 4],
                        borderWidth: 2,
                        pointRadius: 0,
                        fill: false
                    },
                    {
                        label: 'Umbral Advertencia (5%)',
                        data: umbralAdv,
                        borderColor: '#ffc107',
                        borderDash: [4, 4],
                        borderWidth: 1,
                        pointRadius: 0,
                        fill: false
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { position: 'bottom', labels: { boxWidth: 12, padding: 8 } },
                    tooltip: { callbacks: { label: ctx => ctx.dataset.label + ': ' + (ctx.raw || 0) + '%' } }
                },
                scales: {
                    y: { beginAtZero: true, max: 12, title: { display: true, text: '%' } },
                    x: { grid: { display: false }, ticks: { maxTicksLimit: 10 } }
                }
            }
        });
    },

    // Grafico: Produccion por Proceso (doughnut)
    renderChartPorProceso(produccion) {
        const canvas = document.getElementById('chartPorProceso');
        if (!canvas) return;
        if (this.charts.porProceso) this.charts.porProceso.destroy();

        const porProceso = {};
        produccion.forEach(p => {
            const proc = p.tipo || p.proceso || 'impresion';
            const nombre = proc === 'impresion' ? 'Impresion' : proc === 'laminacion' ? 'Laminacion' : proc === 'corte' ? 'Corte' : proc;
            porProceso[nombre] = (porProceso[nombre] || 0) + (parseFloat(p.pesoTotal) || parseFloat(p.totalSalida) || 0);
        });

        const labels = Object.keys(porProceso);
        const data = Object.values(porProceso).map(v => Math.round(v));
        const colors = ['#0d6efd', '#6f42c1', '#198754', '#fd7e14', '#0dcaf0'];

        this.charts.porProceso = new Chart(canvas, {
            type: 'doughnut',
            data: {
                labels: labels.length > 0 ? labels : ['Sin datos'],
                datasets: [{
                    data: data.length > 0 ? data : [1],
                    backgroundColor: data.length > 0 ? colors.slice(0, labels.length) : ['#e9ecef'],
                    borderWidth: 2,
                    borderColor: '#fff'
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                cutout: '60%',
                plugins: {
                    legend: { position: 'bottom', labels: { boxWidth: 12, padding: 8 } },
                    tooltip: {
                        callbacks: {
                            label: ctx => ctx.label + ': ' + new Intl.NumberFormat('es-VE').format(ctx.raw) + ' Kg'
                        }
                    }
                }
            }
        });
    },

    // Grafico: Consumo de Tintas (stacked bar)
    renderChartTintas(tintas) {
        const canvas = document.getElementById('chartTintas');
        if (!canvas) return;
        if (this.charts.tintas) this.charts.tintas.destroy();

        // Agrupar por semana
        const porSemana = {};
        tintas.forEach(t => {
            const fecha = new Date(t.fecha);
            const semana = 'S' + this.getWeekNumber(fecha);
            if (!porSemana[semana]) {
                porSemana[semana] = { laminacion: 0, superficie: 0, solventes: 0 };
            }
            porSemana[semana].laminacion += parseFloat(t.totalTintasLaminacion) || 0;
            porSemana[semana].superficie += parseFloat(t.totalTintasSuperficie) || 0;
            porSemana[semana].solventes += parseFloat(t.totalSolventes) || 0;
        });

        const labels = Object.keys(porSemana).slice(-8);
        const dataLam = labels.map(s => +(porSemana[s]?.laminacion || 0).toFixed(1));
        const dataSup = labels.map(s => +(porSemana[s]?.superficie || 0).toFixed(1));
        const dataSolv = labels.map(s => +(porSemana[s]?.solventes || 0).toFixed(1));

        this.charts.tintas = new Chart(canvas, {
            type: 'bar',
            data: {
                labels: labels.length > 0 ? labels : ['Sin datos'],
                datasets: [
                    { label: 'Tintas Laminacion', data: dataLam, backgroundColor: '#6f42c1', borderRadius: 2 },
                    { label: 'Tintas Superficie', data: dataSup, backgroundColor: '#0dcaf0', borderRadius: 2 },
                    { label: 'Solventes', data: dataSolv, backgroundColor: '#fd7e14', borderRadius: 2 }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { position: 'bottom', labels: { boxWidth: 10, padding: 6, font: { size: 10 } } }
                },
                scales: {
                    x: { stacked: true, grid: { display: false } },
                    y: { stacked: true, beginAtZero: true, title: { display: true, text: 'Kg' } }
                }
            }
        });
    },

    // Grafico: Eficiencia por Maquina (radar)
    renderChartEficiencia(produccion) {
        const canvas = document.getElementById('chartEficiencia');
        if (!canvas) return;
        if (this.charts.eficiencia) this.charts.eficiencia.destroy();

        // Calcular eficiencia por maquina (salida / entrada * 100)
        const porMaquina = {};
        produccion.forEach(p => {
            const maq = p.maquina || 'Sin asignar';
            if (!porMaquina[maq]) {
                porMaquina[maq] = { entrada: 0, salida: 0, tiempoEfectivo: 0, tiempoMuerto: 0 };
            }
            porMaquina[maq].entrada += parseFloat(p.totalMaterialEntrada) || parseFloat(p.totalEntrada) || 0;
            porMaquina[maq].salida += parseFloat(p.pesoTotal) || parseFloat(p.totalSalida) || 0;
            porMaquina[maq].tiempoEfectivo += parseFloat(p.tiempoEfectivo) || 0;
            porMaquina[maq].tiempoMuerto += parseFloat(p.tiempoMuerto) || 0;
        });

        const labels = Object.keys(porMaquina);
        const eficienciaMaterial = labels.map(m => {
            const d = porMaquina[m];
            return d.entrada > 0 ? +((d.salida / d.entrada) * 100).toFixed(1) : 0;
        });
        const eficienciaTiempo = labels.map(m => {
            const d = porMaquina[m];
            const total = d.tiempoEfectivo + d.tiempoMuerto;
            return total > 0 ? +((d.tiempoEfectivo / total) * 100).toFixed(1) : 0;
        });

        this.charts.eficiencia = new Chart(canvas, {
            type: 'radar',
            data: {
                labels: labels.length > 0 ? labels : ['Sin datos'],
                datasets: [
                    {
                        label: 'Eficiencia Material (%)',
                        data: eficienciaMaterial.length > 0 ? eficienciaMaterial : [0],
                        backgroundColor: 'rgba(13, 110, 253, 0.2)',
                        borderColor: '#0d6efd',
                        pointBackgroundColor: '#0d6efd',
                        borderWidth: 2
                    },
                    {
                        label: 'Eficiencia Tiempo (%)',
                        data: eficienciaTiempo.length > 0 ? eficienciaTiempo : [0],
                        backgroundColor: 'rgba(25, 135, 84, 0.2)',
                        borderColor: '#198754',
                        pointBackgroundColor: '#198754',
                        borderWidth: 2
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { position: 'bottom', labels: { boxWidth: 10, padding: 6, font: { size: 10 } } }
                },
                scales: {
                    r: {
                        beginAtZero: true,
                        max: 100,
                        ticks: { stepSize: 20 }
                    }
                }
            }
        });
    },

    // Obtener numero de semana del año
    getWeekNumber(date) {
        const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
        d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7));
        const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
        return Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
    },

    // Cargar KPIs principales
    cargarKPIs() {
        const produccion = this.obtenerProduccionHoy();
        const alertas = this.obtenerAlertasPendientes();
        const inventario = this.obtenerTotalInventario();
        const refilPromedio = this.calcularRefilPromedio();

        // Actualizar elementos
        const statProduccion = document.getElementById('statProduccion');
        const statRefil = document.getElementById('statRefil');
        const refilStatus = document.getElementById('refilStatus');
        const statAlertas = document.getElementById('statAlertas');
        const statInventario = document.getElementById('statInventario');
        const alertasBadge = document.getElementById('alertasBadge');

        if (statProduccion) statProduccion.textContent = this.formatearNumero(produccion.totalKg);
        if (statRefil) statRefil.textContent = refilPromedio.toFixed(1) + '%';

        if (refilStatus) {
            if (refilPromedio > CONFIG.UMBRALES_REFIL.default.maximo) {
                refilStatus.className = 'text-danger';
                refilStatus.innerHTML = '<i class="bi bi-exclamation-triangle me-1"></i>Alto';
            } else if (refilPromedio > CONFIG.UMBRALES_REFIL.default.advertencia) {
                refilStatus.className = 'text-warning';
                refilStatus.innerHTML = '<i class="bi bi-exclamation-circle me-1"></i>Advertencia';
            } else {
                refilStatus.className = 'text-success';
                refilStatus.innerHTML = '<i class="bi bi-check-circle me-1"></i>OK';
            }
        }

        if (statAlertas) statAlertas.textContent = alertas.length;
        if (statInventario) statInventario.textContent = this.formatearNumero(inventario);

        // Badge de alertas en navbar
        if (alertasBadge) {
            if (alertas.length > 0) {
                alertasBadge.textContent = alertas.length;
                alertasBadge.style.display = 'inline-block';
            } else {
                alertasBadge.style.display = 'none';
            }
        }
    },

    // Obtener produccion del dia
    obtenerProduccionHoy() {
        const hoy = new Date().toLocaleDateString('es-VE');
        const registros = JSON.parse(localStorage.getItem('axones_produccion') || '[]');

        const registrosHoy = registros.filter(r => {
            const fechaRegistro = new Date(r.fecha).toLocaleDateString('es-VE');
            return fechaRegistro === hoy;
        });

        const totalKg = registrosHoy.reduce((sum, r) => sum + (parseFloat(r.totalSalida) || 0), 0);

        return {
            registros: registrosHoy,
            totalKg: totalKg,
            cantidad: registrosHoy.length
        };
    },

    // Obtener alertas pendientes
    obtenerAlertasPendientes() {
        const alertas = JSON.parse(localStorage.getItem('axones_alertas') || '[]');
        return alertas.filter(a => a.estado === 'pendiente' || a.estado === 'activa');
    },

    // Obtener total de inventario
    obtenerTotalInventario() {
        const inventario = JSON.parse(localStorage.getItem('axones_inventario') || '[]');
        return inventario.reduce((sum, item) => sum + (parseFloat(item.kg) || 0), 0);
    },

    // Calcular promedio de refil del dia
    calcularRefilPromedio() {
        const produccionHoy = this.obtenerProduccionHoy();
        if (produccionHoy.cantidad === 0) return 0;

        const totalRefil = produccionHoy.registros.reduce((sum, r) => {
            return sum + (parseFloat(r.porcentajeRefil) || 0);
        }, 0);

        return totalRefil / produccionHoy.cantidad;
    },

    // Cargar alertas recientes
    cargarAlertasRecientes() {
        const container = document.getElementById('alertasRecientes');
        if (!container) return;

        const alertas = this.obtenerAlertasPendientes().slice(0, 5);

        if (alertas.length === 0) {
            container.innerHTML = `
                <div class="text-center text-muted py-4">
                    <i class="bi bi-check-circle display-6 text-success d-block mb-2"></i>
                    <p class="mb-0">No hay alertas pendientes</p>
                </div>
            `;
            return;
        }

        container.innerHTML = alertas.map(alerta => {
            const icono = this.obtenerIconoAlerta(alerta.tipo);
            const clase = alerta.nivel === 'danger' || alerta.nivel === 'critical' ? 'danger' : 'warning';
            return `
                <div class="alert-item ${clase} p-3 border-bottom">
                    <div class="d-flex align-items-start">
                        <i class="bi ${icono} me-2 mt-1 text-${clase}"></i>
                        <div class="flex-grow-1">
                            <p class="mb-1 small fw-medium">${alerta.mensaje}</p>
                            <small class="text-muted">
                                <i class="bi bi-clock me-1"></i>${this.formatearFecha(alerta.fecha)}
                                ${alerta.maquina ? `<span class="ms-2"><i class="bi bi-cpu me-1"></i>${alerta.maquina}</span>` : ''}
                            </small>
                        </div>
                    </div>
                </div>
            `;
        }).join('');
    },

    // Cargar produccion del dia
    cargarProduccionHoy() {
        const container = document.getElementById('produccionHoy');
        const totalOTsHoy = document.getElementById('totalOTsHoy');
        if (!container) return;

        const produccion = this.obtenerProduccionHoy();

        if (totalOTsHoy) {
            totalOTsHoy.textContent = `${produccion.cantidad} OTs`;
        }

        if (produccion.cantidad === 0) {
            container.innerHTML = `
                <div class="text-center text-muted py-3">
                    <i class="bi bi-inbox display-6 d-block mb-2"></i>
                    <p class="mb-0">No hay registros de produccion hoy</p>
                    <a href="impresion.html" class="btn btn-primary btn-sm mt-2">
                        <i class="bi bi-plus me-1"></i>Crear registro
                    </a>
                </div>
            `;
            return;
        }

        // Mostrar resumen por maquina
        const porMaquina = {};
        produccion.registros.forEach(r => {
            const maq = r.maquina || 'Sin asignar';
            if (!porMaquina[maq]) {
                porMaquina[maq] = { cantidad: 0, kg: 0, refil: [] };
            }
            porMaquina[maq].cantidad++;
            porMaquina[maq].kg += parseFloat(r.totalSalida) || 0;
            porMaquina[maq].refil.push(parseFloat(r.porcentajeRefil) || 0);
        });

        let html = '<div class="table-responsive"><table class="table table-sm mb-0">';
        html += '<thead class="table-light"><tr><th>Maquina</th><th class="text-center">OTs</th><th class="text-end">Kg</th><th class="text-end">Refil %</th></tr></thead>';
        html += '<tbody>';

        Object.keys(porMaquina).forEach(maq => {
            const data = porMaquina[maq];
            const refilProm = data.refil.reduce((a, b) => a + b, 0) / data.refil.length;
            const refilClass = refilProm > CONFIG.UMBRALES_REFIL.default.maximo ? 'text-danger' :
                             refilProm > CONFIG.UMBRALES_REFIL.default.advertencia ? 'text-warning' : 'text-success';

            html += `
                <tr>
                    <td><i class="bi bi-cpu me-1 text-muted"></i>${maq}</td>
                    <td class="text-center">${data.cantidad}</td>
                    <td class="text-end">${this.formatearNumero(data.kg)}</td>
                    <td class="text-end ${refilClass}">${refilProm.toFixed(1)}%</td>
                </tr>
            `;
        });

        html += '</tbody></table></div>';
        container.innerHTML = html;
    },

    // Cargar inventario con stock bajo
    cargarInventarioBajo() {
        const tbody = document.getElementById('inventarioBajo');
        if (!tbody) return;

        const inventario = JSON.parse(localStorage.getItem('axones_inventario') || '[]');
        const stockBajo = inventario.filter(item => parseFloat(item.kg) < this.config.stockMinimo);

        if (stockBajo.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="6" class="text-center text-muted py-3">
                        <i class="bi bi-check-circle text-success me-2"></i>
                        Todo el inventario esta en niveles adecuados
                    </td>
                </tr>
            `;
            return;
        }

        tbody.innerHTML = stockBajo.slice(0, 5).map(item => {
            const estado = parseFloat(item.kg) < 50 ?
                '<span class="badge bg-danger">Critico</span>' :
                '<span class="badge bg-warning text-dark">Bajo</span>';

            return `
                <tr>
                    <td><strong>${item.material}</strong></td>
                    <td class="text-center">${item.micras || '-'}</td>
                    <td class="text-center">${item.ancho || '-'}</td>
                    <td class="text-end">${this.formatearNumero(item.kg)}</td>
                    <td>${item.producto || '-'}</td>
                    <td class="text-center">${estado}</td>
                </tr>
            `;
        }).join('');
    },

    // Cargar estado de maquinas
    cargarEstadoMaquinas() {
        const container = document.getElementById('listaMaquinas');
        if (!container) return;

        // Obtener estado de maquinas de localStorage o usar valores por defecto
        const estadoMaquinas = JSON.parse(localStorage.getItem('axones_maquinas_estado') || 'null');

        if (!estadoMaquinas) {
            // Crear estado inicial basado en CONFIG
            const maquinasInicial = [];

            CONFIG.MAQUINAS.IMPRESORAS.forEach(m => {
                maquinasInicial.push({ id: m.id, nombre: m.nombre, estado: 'active' });
            });
            CONFIG.MAQUINAS.LAMINADORAS.forEach(m => {
                maquinasInicial.push({ id: m.id, nombre: m.nombre, estado: 'active' });
            });
            CONFIG.MAQUINAS.CORTADORAS.forEach(m => {
                maquinasInicial.push({ id: m.id, nombre: m.nombre, estado: 'active' });
            });

            localStorage.setItem('axones_maquinas_estado', JSON.stringify(maquinasInicial));
            this.renderizarMaquinas(maquinasInicial);
        } else {
            this.renderizarMaquinas(estadoMaquinas);
        }
    },

    // Renderizar lista de maquinas
    renderizarMaquinas(maquinas) {
        const container = document.getElementById('listaMaquinas');
        if (!container) return;

        container.innerHTML = maquinas.map(m => {
            const estadoClase = m.estado === 'active' ? 'active' :
                              m.estado === 'idle' ? 'idle' : 'stopped';
            const badgeClase = m.estado === 'active' ? 'bg-success' :
                             m.estado === 'idle' ? 'bg-warning text-dark' : 'bg-danger';
            const estadoTexto = m.estado === 'active' ? 'Activa' :
                              m.estado === 'idle' ? 'En espera' : 'Detenida';

            return `
                <li class="list-group-item d-flex justify-content-between align-items-center">
                    <span><span class="machine-status ${estadoClase} me-2"></span>${m.nombre}</span>
                    <span class="badge ${badgeClase}">${estadoTexto}</span>
                </li>
            `;
        }).join('');
    },

    // Iniciar actualizacion automatica
    iniciarActualizacionAutomatica() {
        setInterval(() => {
            this.cargarDatos();
        }, this.config.refreshInterval);
    },

    // Obtener icono segun tipo de alerta
    obtenerIconoAlerta(tipo) {
        const iconos = {
            'refil_alto': 'bi-exclamation-triangle',
            'refil_critico': 'bi-x-octagon',
            'produccion_baja': 'bi-graph-down',
            'maquina_detenida': 'bi-cpu',
            'tiempo_muerto_alto': 'bi-clock-history',
            'stock_bajo': 'bi-box',
        };
        return iconos[tipo] || 'bi-bell';
    },

    // Formatear numero con separadores
    formatearNumero(num) {
        return new Intl.NumberFormat('es-VE').format(Math.round(num));
    },

    // Formatear fecha
    formatearFecha(fecha) {
        if (!fecha) return '';
        const d = new Date(fecha);
        return d.toLocaleDateString('es-VE', {
            day: '2-digit',
            month: '2-digit',
            hour: '2-digit',
            minute: '2-digit'
        });
    },

    // Crear alerta (metodo utilitario para otros modulos)
    crearAlerta(tipo, mensaje, datos = {}) {
        const alertas = JSON.parse(localStorage.getItem('axones_alertas') || '[]');

        const nuevaAlerta = {
            id: Date.now(),
            tipo: tipo,
            mensaje: mensaje,
            fecha: new Date().toISOString(),
            estado: 'pendiente',
            nivel: datos.nivel || 'warning',
            maquina: datos.maquina || null,
            ot: datos.ot || null,
            datos: datos
        };

        alertas.unshift(nuevaAlerta);
        localStorage.setItem('axones_alertas', JSON.stringify(alertas));

        // Actualizar dashboard si esta visible
        this.cargarKPIs();
        this.cargarAlertasRecientes();

        return nuevaAlerta;
    },

    /**
     * Imprime o exporta el dashboard
     */
    imprimirDashboard() {
        // Crear estilos de impresion
        const printStyles = `
            @media print {
                body { font-size: 12px; }
                .navbar, #btnLogin, .btn, footer, .toast-container { display: none !important; }
                main { margin-top: 0 !important; }
                .card { break-inside: avoid; margin-bottom: 10px; }
                .chart-container, canvas { max-height: 200px !important; }
                @page { margin: 1cm; }
            }
        `;

        // Agregar estilos temporales
        const styleEl = document.createElement('style');
        styleEl.id = 'printStyles';
        styleEl.textContent = printStyles;
        document.head.appendChild(styleEl);

        // Mostrar titulo con fecha
        const fecha = new Date().toLocaleDateString('es-VE', {
            weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
        });

        // Crear encabezado de impresion
        const printHeader = document.createElement('div');
        printHeader.id = 'printHeader';
        printHeader.innerHTML = `
            <div style="text-align: center; margin-bottom: 20px; border-bottom: 2px solid #0d6efd; padding-bottom: 10px;">
                <h2 style="margin: 0;">Sistema Axones - Dashboard</h2>
                <p style="margin: 5px 0;">Inversiones Axones 2008, C.A.</p>
                <p style="margin: 0; font-size: 0.9em; color: #666;">${fecha}</p>
            </div>
        `;
        document.querySelector('main').insertBefore(printHeader, document.querySelector('main').firstChild);

        // Imprimir
        window.print();

        // Remover elementos temporales despues de imprimir
        setTimeout(() => {
            document.getElementById('printStyles')?.remove();
            document.getElementById('printHeader')?.remove();
        }, 1000);
    },

    /**
     * Muestra el modal con detalle de refil por cliente y proceso
     */
    async mostrarDetalleRefil() {
        const modal = new bootstrap.Modal(document.getElementById('modalDetalleRefil'));

        // Obtener datos de produccion
        let produccion = [];

        try {
            // Intentar obtener de API
            if (typeof AxonesAPI !== 'undefined') {
                const response = await AxonesAPI.getProduccion({});
                if (response.success && response.data) {
                    produccion = response.data;
                }
            }
        } catch (e) {
            console.warn('Usando datos locales para detalle de refil');
        }

        // Si no hay datos de API, usar localStorage
        if (produccion.length === 0) {
            produccion = JSON.parse(localStorage.getItem('axones_produccion') || '[]');
        }

        // Calcular totales generales
        let totalEntrada = 0;
        let totalMerma = 0;
        let totalRegistros = produccion.length;

        produccion.forEach(r => {
            const entrada = parseFloat(r.totalEntrada) || 0;
            const salida = parseFloat(r.totalSalida) || 0;
            totalEntrada += entrada;
            totalMerma += (entrada - salida);
        });

        const promedioGeneral = totalEntrada > 0 ? (totalMerma / totalEntrada * 100) : 0;

        // Actualizar resumen
        document.getElementById('modalRefilPromedio').textContent = promedioGeneral.toFixed(1) + '%';
        document.getElementById('modalRefilRegistros').textContent = totalRegistros;
        document.getElementById('modalRefilMerma').textContent = this.formatearNumero(totalMerma) + ' Kg';

        // Calcular refil por cliente
        const porCliente = {};
        produccion.forEach(r => {
            const cliente = r.cliente || 'Sin Cliente';
            if (!porCliente[cliente]) {
                porCliente[cliente] = { registros: 0, entrada: 0, merma: 0 };
            }
            const entrada = parseFloat(r.totalEntrada) || 0;
            const salida = parseFloat(r.totalSalida) || 0;
            porCliente[cliente].registros++;
            porCliente[cliente].entrada += entrada;
            porCliente[cliente].merma += (entrada - salida);
        });

        // Renderizar tabla de clientes
        const tablaClientes = document.getElementById('tablaRefilClientes');
        if (Object.keys(porCliente).length === 0) {
            tablaClientes.innerHTML = '<tr><td colspan="5" class="text-center text-muted">Sin datos disponibles</td></tr>';
        } else {
            tablaClientes.innerHTML = Object.keys(porCliente)
                .sort((a, b) => {
                    const refilA = porCliente[a].entrada > 0 ? (porCliente[a].merma / porCliente[a].entrada * 100) : 0;
                    const refilB = porCliente[b].entrada > 0 ? (porCliente[b].merma / porCliente[b].entrada * 100) : 0;
                    return refilB - refilA; // Ordenar de mayor a menor refil
                })
                .map(cliente => {
                    const data = porCliente[cliente];
                    const refil = data.entrada > 0 ? (data.merma / data.entrada * 100) : 0;
                    const refilClass = refil > 6 ? 'text-danger fw-bold' : refil > 5 ? 'text-warning' : 'text-success';
                    return `
                        <tr>
                            <td>${cliente}</td>
                            <td class="text-center">${data.registros}</td>
                            <td class="text-end">${this.formatearNumero(data.entrada)}</td>
                            <td class="text-end">${this.formatearNumero(data.merma)}</td>
                            <td class="text-end ${refilClass}">${refil.toFixed(1)}%</td>
                        </tr>
                    `;
                }).join('');
        }

        // Calcular refil por proceso (impresion, laminacion, corte)
        const porProceso = {
            'Impresion': { registros: 0, entrada: 0, merma: 0 },
            'Laminacion': { registros: 0, entrada: 0, merma: 0 },
            'Corte': { registros: 0, entrada: 0, merma: 0 }
        };

        produccion.forEach(r => {
            let proceso = r.proceso || r.tipo || 'Impresion';
            // Normalizar nombre del proceso
            if (proceso.toLowerCase().includes('lam')) {
                proceso = 'Laminacion';
            } else if (proceso.toLowerCase().includes('corte')) {
                proceso = 'Corte';
            } else {
                proceso = 'Impresion';
            }

            const entrada = parseFloat(r.totalEntrada) || 0;
            const salida = parseFloat(r.totalSalida) || 0;
            porProceso[proceso].registros++;
            porProceso[proceso].entrada += entrada;
            porProceso[proceso].merma += (entrada - salida);
        });

        // Renderizar tabla de procesos
        const tablaProcesos = document.getElementById('tablaRefilProcesos');
        tablaProcesos.innerHTML = Object.keys(porProceso).map(proceso => {
            const data = porProceso[proceso];
            const refil = data.entrada > 0 ? (data.merma / data.entrada * 100) : 0;
            const refilClass = refil > 6 ? 'text-danger fw-bold' : refil > 5 ? 'text-warning' : 'text-success';
            const icono = proceso === 'Impresion' ? 'bi-printer' : proceso === 'Laminacion' ? 'bi-layers' : 'bi-scissors';
            return `
                <tr>
                    <td><i class="bi ${icono} me-2 text-muted"></i>${proceso}</td>
                    <td class="text-center">${data.registros}</td>
                    <td class="text-end">${this.formatearNumero(data.entrada)}</td>
                    <td class="text-end">${this.formatearNumero(data.merma)}</td>
                    <td class="text-end ${refilClass}">${refil.toFixed(1)}%</td>
                </tr>
            `;
        }).join('');

        // Mostrar modal
        modal.show();
    }
};

// Inicializar cuando el DOM este listo
document.addEventListener('DOMContentLoaded', () => {
    HomeModule.init();
});

// Exportar para uso global
if (typeof window !== 'undefined') {
    window.HomeModule = HomeModule;
}
