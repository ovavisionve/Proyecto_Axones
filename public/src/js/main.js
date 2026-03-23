/**
 * Script principal - Sistema Axones
 * Inicializacion y funciones globales
 */

// Namespace global de la aplicacion
const Axones = {
    // Estado global
    state: {
        initialized: false,
        loading: false,
    },

    /**
     * Inicializa la aplicacion
     */
    init: async function() {
        if (this.state.initialized) return;

        console.log('Inicializando Sistema Axones v' + CONFIG.APP_VERSION);

        // Actualizar fecha y hora
        this.updateDateTime();
        setInterval(() => this.updateDateTime(), 1000);

        // Cargar datos iniciales si el usuario esta autenticado
        if (Auth.isAuthenticated()) {
            await this.loadInitialData();
        }

        // Configurar eventos globales
        this.setupGlobalEvents();

        this.state.initialized = true;
        console.log('Sistema Axones inicializado correctamente');
    },

    /**
     * Actualiza fecha y hora en la UI
     */
    updateDateTime: function() {
        const now = new Date();

        const dateEl = document.getElementById('currentDate');
        const timeEl = document.getElementById('currentTime');

        if (dateEl) {
            dateEl.textContent = now.toLocaleDateString('es-VE', {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric'
            });
        }

        if (timeEl) {
            timeEl.textContent = now.toLocaleTimeString('es-VE', {
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit'
            });
        }
    },

    /**
     * Carga datos iniciales del sistema
     */
    loadInitialData: async function() {
        this.state.loading = true;
        this.showLoading();

        try {
            // Cargar estadisticas del dashboard
            await this.loadDashboardStats();

            // Cargar alertas recientes
            await this.loadRecentAlerts();
        } catch (error) {
            console.error('Error cargando datos iniciales:', error);
            this.showError('Error al cargar datos. Por favor, recargue la pagina.');
        } finally {
            this.state.loading = false;
            this.hideLoading();
        }
    },

    /**
     * Carga estadisticas del dashboard desde datos reales
     */
    loadDashboardStats: async function() {
        // Cargar estadisticas reales desde localStorage
        const stats = this.calcularEstadisticasReales();
        this.updateStats(stats);

        // Datos sincronizados via Supabase (AxonesSync)
    },

    /**
     * Calcula estadisticas reales desde localStorage
     */
    calcularEstadisticasReales: function() {
        // Obtener alertas pendientes
        const alertas = JSON.parse(localStorage.getItem('axones_alertas') || '[]');
        const alertasPendientes = alertas.filter(a => a.estado === 'pendiente' || a.estado === 'activa').length;

        // Obtener ordenes
        const ordenes = JSON.parse(localStorage.getItem('axones_ordenes') || '[]');
        const ordenesActivas = ordenes.filter(o => o.estado !== 'completado' && o.estado !== 'cancelado').length;

        // Calcular produccion del inventario
        const inventario = JSON.parse(localStorage.getItem('axones_inventario') || '[]');
        const totalKg = inventario.reduce((sum, item) => sum + (parseFloat(item.kg) || 0), 0);

        // Calcular desperdicio promedio de ordenes completadas
        const ordenesCompletadas = ordenes.filter(o => o.estado === 'completado' && o.refil);
        let desperdicioPromedio = 0;
        if (ordenesCompletadas.length > 0) {
            desperdicioPromedio = ordenesCompletadas.reduce((sum, o) => sum + (parseFloat(o.refil) || 0), 0) / ordenesCompletadas.length;
        }

        return {
            produccion: this.formatNumber(totalKg),
            desperdicio: desperdicioPromedio.toFixed(1),
            alertas: alertasPendientes.toString(),
            operadores: ordenesActivas.toString(),
        };
    },

    /**
     * Formatea numero con separadores de miles
     */
    formatNumber: function(num) {
        return num.toLocaleString('es-VE', { maximumFractionDigits: 0 });
    },

    /**
     * Actualiza las estadisticas en la UI
     */
    updateStats: function(stats) {
        const elements = {
            statProduccion: stats.produccion,
            statDesperdicio: stats.desperdicio + '%',
            statAlertas: stats.alertas,
            statOperadores: stats.operadores,
        };

        for (const [id, value] of Object.entries(elements)) {
            const el = document.getElementById(id);
            if (el) {
                el.textContent = value;
            }
        }
    },

    /**
     * Carga alertas recientes desde localStorage
     */
    loadRecentAlerts: async function() {
        const tbody = document.getElementById('alertasRecientes');
        if (!tbody) return;

        // Cargar alertas reales desde localStorage
        const alertasStorage = JSON.parse(localStorage.getItem('axones_alertas') || '[]');

        // Convertir formato y tomar las 5 mas recientes
        const alertasRecientes = alertasStorage
            .slice(0, 5)
            .map(a => ({
                fecha: this.formatearFechaAlerta(a.fecha),
                tipo: this.obtenerTipoAlertaTexto(a.tipo),
                maquina: a.maquina || '-',
                operador: a.datos?.operador || '-',
                mensaje: a.mensaje,
                estado: a.estado,
            }));

        if (alertasRecientes.length > 0) {
            this.renderAlerts(alertasRecientes);
        } else {
            // Mostrar mensaje si no hay alertas
            tbody.innerHTML = `
                <tr>
                    <td colspan="4" class="text-center text-muted py-4">
                        <i class="bi bi-check-circle fs-4 d-block mb-2"></i>
                        No hay alertas pendientes
                    </td>
                </tr>
            `;
        }

        // Alertas sincronizadas via Supabase (AxonesSync)
    },

    /**
     * Formatea fecha de alerta
     */
    formatearFechaAlerta: function(fechaISO) {
        if (!fechaISO) return '-';
        const fecha = new Date(fechaISO);
        return fecha.toLocaleDateString('es-VE', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    },

    /**
     * Obtiene texto legible del tipo de alerta
     */
    obtenerTipoAlertaTexto: function(tipo) {
        const tipos = {
            'stock_bajo': 'Stock Bajo',
            'stock_bajo_material': 'Stock Bajo Material',
            'stock_bajo_tinta': 'Stock Bajo Tinta',
            'stock_bajo_adhesivo': 'Stock Bajo Quimico',
            'refil_alto': 'Refil Alto',
            'refil_critico': 'Refil Critico',
            'tiempo_muerto_alto': 'Tiempo Muerto',
            'produccion_baja': 'Produccion Baja',
            'maquina_detenida': 'Maquina Detenida',
        };
        return tipos[tipo] || tipo || 'Alerta';
    },

    /**
     * Renderiza alertas en la tabla
     */
    renderAlerts: function(alertas) {
        const tbody = document.getElementById('alertasRecientes');
        if (!tbody) return;

        if (alertas.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="6" class="text-center text-muted py-4">
                        <i class="bi bi-check-circle display-6 d-block mb-2 text-success"></i>
                        No hay alertas pendientes
                    </td>
                </tr>
            `;
            return;
        }

        tbody.innerHTML = alertas.map(alerta => `
            <tr>
                <td><small>${alerta.fecha}</small></td>
                <td>
                    <span class="badge bg-warning text-dark">
                        <i class="bi bi-exclamation-triangle me-1"></i>
                        ${alerta.tipo}
                    </span>
                </td>
                <td>${alerta.maquina}</td>
                <td>${alerta.operador}</td>
                <td><small>${alerta.mensaje}</small></td>
                <td>
                    ${alerta.estado === 'pendiente'
                        ? '<span class="badge bg-danger">Pendiente</span>'
                        : '<span class="badge bg-success">Atendida</span>'
                    }
                </td>
            </tr>
        `).join('');
    },

    /**
     * Configura eventos globales
     */
    setupGlobalEvents: function() {
        // Manejar errores de red
        window.addEventListener('offline', () => {
            this.showError('Sin conexion a internet');
        });

        window.addEventListener('online', () => {
            this.showSuccess('Conexion restaurada');
            this.loadInitialData();
        });

        // Escuchar cambios del SyncManager para alertas y dashboard
        if (typeof SyncManager !== 'undefined') {
            SyncManager.on('alertas', () => {
                this.loadRecentAlerts();
            });
            SyncManager.on('ordenes', () => {
                this.loadDashboardStats();
            });
            SyncManager.on('inventario', () => {
                this.loadDashboardStats();
            });
        }
    },

    /**
     * Muestra indicador de carga
     */
    showLoading: function() {
        // Se puede implementar un overlay de carga global
        document.body.classList.add('loading');
    },

    /**
     * Oculta indicador de carga
     */
    hideLoading: function() {
        document.body.classList.remove('loading');
    },

    /**
     * Muestra mensaje de error
     */
    showError: function(mensaje) {
        this.showToast(mensaje, 'danger');
    },

    /**
     * Muestra mensaje de exito
     */
    showSuccess: function(mensaje) {
        this.showToast(mensaje, 'success');
    },

    /**
     * Muestra mensaje de advertencia
     */
    showWarning: function(mensaje) {
        this.showToast(mensaje, 'warning');
    },

    /**
     * Muestra un toast de notificacion
     */
    showToast: function(mensaje, tipo = 'info') {
        // Crear contenedor de toasts si no existe
        let container = document.getElementById('toastContainer');
        if (!container) {
            container = document.createElement('div');
            container.id = 'toastContainer';
            container.className = 'toast-container position-fixed bottom-0 end-0 p-3';
            document.body.appendChild(container);
        }

        const toastId = 'toast_' + Date.now();
        const toastHtml = `
            <div id="${toastId}" class="toast align-items-center text-white bg-${tipo} border-0" role="alert">
                <div class="d-flex">
                    <div class="toast-body">
                        ${mensaje}
                    </div>
                    <button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast"></button>
                </div>
            </div>
        `;

        container.insertAdjacentHTML('beforeend', toastHtml);

        const toastEl = document.getElementById(toastId);
        const toast = new bootstrap.Toast(toastEl, { delay: 5000 });
        toast.show();

        toastEl.addEventListener('hidden.bs.toast', () => {
            toastEl.remove();
        });
    },

    /**
     * Formatea un numero como moneda
     */
    formatCurrency: function(value) {
        return new Intl.NumberFormat('es-VE', {
            style: 'currency',
            currency: 'USD',
        }).format(value);
    },

    /**
     * Formatea un numero con separadores de miles
     */
    formatNumber: function(value, decimals = 0) {
        return new Intl.NumberFormat('es-VE', {
            minimumFractionDigits: decimals,
            maximumFractionDigits: decimals,
        }).format(value);
    },

    /**
     * Formatea una fecha
     */
    formatDate: function(date, format = 'short') {
        const d = new Date(date);
        if (format === 'short') {
            return d.toLocaleDateString('es-VE');
        }
        return d.toLocaleDateString('es-VE', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric',
        });
    },
};

// Inicializar cuando el DOM este listo
document.addEventListener('DOMContentLoaded', () => {
    // DemoData se auto-inicializa al cargar el script (antes de DOMContentLoaded)
    // Solo generar datos complementarios (produccion, alertas) si es primera vez
    if (typeof DemoData !== 'undefined') {
        if (!localStorage.getItem('axones_produccion')) {
            DemoData.generarProduccion();
        }
        if (!localStorage.getItem('axones_maquinas_estado')) {
            DemoData.generarEstadoMaquinas();
        }
    }

    // Asegurar que los 23 usuarios reales estan cargados
    const usuarios = JSON.parse(localStorage.getItem('axones_usuarios') || '[]');
    if (usuarios.length < 10) {
        localStorage.removeItem('axones_usuarios');
    }

    Axones.init();
});

// Exportar para uso externo
if (typeof module !== 'undefined' && module.exports) {
    module.exports = Axones;
}
