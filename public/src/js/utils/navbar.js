/**
 * Navbar compartido - Sistema Axones
 * Genera el menu de navegacion consistente en todas las paginas
 */
const NavbarModule = {
    // Detectar pagina actual desde la URL
    getPaginaActual() {
        const path = window.location.pathname;
        const archivo = path.substring(path.lastIndexOf('/') + 1) || 'index.html';
        return archivo;
    },

    // Generar el navbar HTML
    render() {
        const pagina = this.getPaginaActual();
        const nav = document.getElementById('mainNavbar');
        if (!nav) return;

        // Determinar que esta activo
        const esInicio = pagina === 'index.html' || pagina === '';
        const esProduccion = ['impresion.html', 'laminacion.html', 'corte.html', 'tintas.html', 'ordenes.html', 'programacion.html'].includes(pagina);
        const esCalidad = ['checklist.html', 'certificado.html', 'etiquetas.html'].includes(pagina);
        const esInventario = pagina === 'inventario.html';
        const esAlertas = pagina === 'alertas.html';
        const esIncidencias = pagina === 'incidencias.html';
        const esReportes = pagina === 'reportes.html';
        const esChatbot = pagina === 'chatbot.html';
        const esAdmin = pagina === 'admin.html';

        nav.className = 'navbar navbar-expand-lg navbar-dark bg-primary fixed-top';
        nav.innerHTML = `
        <div class="container-fluid">
            <a class="navbar-brand d-flex align-items-center" href="index.html">
                <i class="bi bi-gear-wide-connected me-2"></i>
                <span class="fw-bold">AXONES</span>
            </a>
            <button class="navbar-toggler" type="button" data-bs-toggle="collapse" data-bs-target="#navbarMain">
                <span class="navbar-toggler-icon"></span>
            </button>
            <div class="collapse navbar-collapse" id="navbarMain">
                <ul class="navbar-nav me-auto mb-2 mb-lg-0">
                    <li class="nav-item">
                        <a class="nav-link ${esInicio ? 'active' : ''}" href="index.html">
                            <i class="bi bi-house-door me-1"></i> Inicio
                        </a>
                    </li>
                    <li class="nav-item dropdown">
                        <a class="nav-link dropdown-toggle ${esProduccion ? 'active' : ''}" href="#" data-bs-toggle="dropdown">
                            <i class="bi bi-clipboard-data me-1"></i> Produccion
                        </a>
                        <ul class="dropdown-menu">
                            <li><a class="dropdown-item ${pagina === 'impresion.html' ? 'active' : ''}" href="impresion.html"><i class="bi bi-printer me-2"></i>Impresion</a></li>
                            <li><a class="dropdown-item ${pagina === 'laminacion.html' ? 'active' : ''}" href="laminacion.html"><i class="bi bi-layers me-2"></i>Laminacion</a></li>
                            <li><a class="dropdown-item ${pagina === 'corte.html' ? 'active' : ''}" href="corte.html"><i class="bi bi-scissors me-2"></i>Corte</a></li>
                            <li><hr class="dropdown-divider"></li>
                            <li><a class="dropdown-item ${pagina === 'tintas.html' ? 'active' : ''}" href="tintas.html"><i class="bi bi-droplet me-2"></i>Tintas y Solventes</a></li>
                            <li><hr class="dropdown-divider"></li>
                            <li><a class="dropdown-item ${pagina === 'ordenes.html' ? 'active' : ''}" href="ordenes.html"><i class="bi bi-clipboard-check me-2"></i>Ordenes de Trabajo</a></li>
                            <li><a class="dropdown-item ${pagina === 'programacion.html' ? 'active' : ''}" href="programacion.html"><i class="bi bi-kanban me-2"></i>Programacion</a></li>
                        </ul>
                    </li>
                    <li class="nav-item dropdown">
                        <a class="nav-link dropdown-toggle ${esCalidad ? 'active' : ''}" href="#" data-bs-toggle="dropdown">
                            <i class="bi bi-check2-square me-1"></i> Calidad
                        </a>
                        <ul class="dropdown-menu">
                            <li><a class="dropdown-item ${pagina === 'checklist.html' ? 'active' : ''}" href="checklist.html"><i class="bi bi-list-check me-2"></i>Lista de Chequeo</a></li>
                            <li><a class="dropdown-item ${pagina === 'certificado.html' ? 'active' : ''}" href="certificado.html"><i class="bi bi-award me-2"></i>Certificado</a></li>
                            <li><a class="dropdown-item ${pagina === 'etiquetas.html' ? 'active' : ''}" href="etiquetas.html"><i class="bi bi-tag me-2"></i>Etiquetas</a></li>
                        </ul>
                    </li>
                    <li class="nav-item">
                        <a class="nav-link ${esInventario ? 'active' : ''}" href="inventario.html">
                            <i class="bi bi-box-seam me-1"></i> Inventario
                        </a>
                    </li>
                    <li class="nav-item">
                        <a class="nav-link ${esAlertas ? 'active' : ''}" href="alertas.html">
                            <i class="bi bi-bell me-1"></i> Alertas
                            <span class="badge bg-danger ms-1" id="alertasBadge" style="display: none;">0</span>
                        </a>
                    </li>
                    <li class="nav-item">
                        <a class="nav-link ${esIncidencias ? 'active' : ''}" href="incidencias.html">
                            <i class="bi bi-exclamation-triangle me-1"></i> Incidencias
                        </a>
                    </li>
                    <li class="nav-item">
                        <a class="nav-link ${esReportes ? 'active' : ''}" href="reportes.html">
                            <i class="bi bi-bar-chart me-1"></i> Reportes
                        </a>
                    </li>
                    <li class="nav-item dropdown">
                        <a class="nav-link dropdown-toggle ${esChatbot || esAdmin ? 'active' : ''}" href="#" data-bs-toggle="dropdown">
                            <i class="bi bi-three-dots me-1"></i>
                        </a>
                        <ul class="dropdown-menu dropdown-menu-end">
                            <li><a class="dropdown-item ${esChatbot ? 'active' : ''}" href="chatbot.html"><i class="bi bi-chat-dots me-2"></i>Chatbot IA</a></li>
                            <li><a class="dropdown-item" href="ayuda.html"><i class="bi bi-question-circle me-2"></i>Ayuda</a></li>
                            <li><hr class="dropdown-divider"></li>
                            <li><a class="dropdown-item ${esAdmin ? 'active' : ''}" href="admin.html"><i class="bi bi-gear me-2"></i>Administracion</a></li>
                        </ul>
                    </li>
                </ul>
                <div class="d-flex align-items-center">
                    <span class="text-light me-3" id="userInfo">
                        <i class="bi bi-person-circle me-1"></i>
                        <span id="userName">Usuario</span>
                    </span>
                    <button class="btn btn-outline-light btn-sm" id="btnLogin">
                        <i class="bi bi-box-arrow-in-right me-1"></i> Ingresar
                    </button>
                </div>
            </div>
        </div>
        `;

        // Actualizar badge de alertas
        this.actualizarBadgeAlertas();
    },

    // Actualizar badge de alertas pendientes
    actualizarBadgeAlertas() {
        const badge = document.getElementById('alertasBadge');
        if (!badge) return;

        const alertas = JSON.parse(localStorage.getItem('axones_alertas') || '[]');
        const pendientes = alertas.filter(a => a.estado === 'pendiente' || a.estado === 'activa').length;

        if (pendientes > 0) {
            badge.textContent = pendientes;
            badge.style.display = 'inline-block';
        } else {
            badge.style.display = 'none';
        }
    }
};

// Renderizar navbar al cargar el DOM
document.addEventListener('DOMContentLoaded', () => {
    NavbarModule.render();
});
