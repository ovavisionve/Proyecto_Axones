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
        this.cargarDatos();
        this.iniciarActualizacionAutomatica();
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
        this.cargarKPIs();
        this.cargarAlertasRecientes();
        this.cargarProduccionHoy();
        this.cargarInventarioBajo();
        this.cargarEstadoMaquinas();
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
