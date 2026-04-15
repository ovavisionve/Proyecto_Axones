/**
 * Navbar Unificado - Sistema Axones
 * UN SOLO navbar para todas las paginas. Se inyecta en el elemento #navbar-placeholder.
 *
 * Para cambiar el menu:
 *   1. Edita el HTML de NavbarAxones.HTML abajo
 *   2. Los cambios aplican automaticamente a TODAS las paginas en el proximo refresh
 *
 * Uso en HTML:
 *   <nav id="navbar-placeholder"></nav>
 *   ...
 *   <script src="src/js/utils/navbar.js"></script>
 *
 * Auto-marca el link activo segun la pagina actual.
 */

const NavbarAxones = {
    /** HTML del navbar (UNICA fuente de verdad) */
    HTML: `
    <nav class="navbar navbar-expand-lg navbar-dark bg-dark fixed-top">
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
                        <a class="nav-link" data-page="index.html" href="index.html">
                            <i class="bi bi-house-door me-1"></i> Inicio
                        </a>
                    </li>
                    <li class="nav-item dropdown">
                        <a class="nav-link dropdown-toggle" data-group="produccion" href="#" data-bs-toggle="dropdown">
                            <i class="bi bi-clipboard-data me-1"></i> Produccion
                        </a>
                        <ul class="dropdown-menu">
                            <li><a class="dropdown-item" data-page="ordenes.html" href="ordenes.html"><i class="bi bi-clipboard-check me-2"></i>Ordenes de Trabajo</a></li>
                            <li><a class="dropdown-item" data-page="programacion.html" href="programacion.html"><i class="bi bi-kanban me-2"></i>Programacion</a></li>
                            <li><hr class="dropdown-divider"></li>
                            <li><a class="dropdown-item" data-page="montaje.html" href="montaje.html"><i class="bi bi-puzzle me-2"></i>Montaje</a></li>
                            <li><a class="dropdown-item" data-page="impresion.html" href="impresion.html"><i class="bi bi-printer me-2"></i>Impresion</a></li>
                            <li><a class="dropdown-item" data-page="laminacion.html" href="laminacion.html"><i class="bi bi-layers me-2"></i>Laminacion</a></li>
                            <li><a class="dropdown-item" data-page="corte.html" href="corte.html"><i class="bi bi-scissors me-2"></i>Corte</a></li>
                            <li><hr class="dropdown-divider"></li>
                            <li><a class="dropdown-item" data-page="tintas.html" href="tintas.html"><i class="bi bi-droplet me-2"></i>Tintas</a></li>
                        </ul>
                    </li>
                    <li class="nav-item dropdown">
                        <a class="nav-link dropdown-toggle" data-group="calidad" href="#" data-bs-toggle="dropdown">
                            <i class="bi bi-check2-square me-1"></i> Calidad
                        </a>
                        <ul class="dropdown-menu">
                            <li><a class="dropdown-item" data-page="checklist.html" href="checklist.html"><i class="bi bi-list-check me-2"></i>Lista de Chequeo</a></li>
                            <li><a class="dropdown-item" data-page="certificado.html" href="certificado.html"><i class="bi bi-award me-2"></i>Certificado de Calidad</a></li>
                            <li><a class="dropdown-item" data-page="etiquetas.html" href="etiquetas.html"><i class="bi bi-tag me-2"></i>Etiquetas</a></li>
                        </ul>
                    </li>
                    <li class="nav-item">
                        <a class="nav-link" data-page="inventario.html" href="inventario.html">
                            <i class="bi bi-box-seam me-1"></i> Inventario
                        </a>
                    </li>
                    <li class="nav-item">
                        <a class="nav-link" data-page="solicitud-despacho.html" href="solicitud-despacho.html">
                            <i class="bi bi-cart-plus me-1"></i> Solicitudes
                        </a>
                    </li>
                    <li class="nav-item">
                        <a class="nav-link" data-page="despacho.html" href="despacho.html">
                            <i class="bi bi-truck me-1"></i> Despacho
                        </a>
                    </li>
                    <li class="nav-item">
                        <a class="nav-link" data-page="movimientos-orden.html" href="movimientos-orden.html">
                            <i class="bi bi-arrow-repeat me-1"></i> Movimientos OT
                        </a>
                    </li>
                    <li class="nav-item dropdown">
                        <a class="nav-link dropdown-toggle" data-group="datos" href="#" data-bs-toggle="dropdown">
                            <i class="bi bi-database me-1"></i> Datos Maestros
                        </a>
                        <ul class="dropdown-menu">
                            <li><a class="dropdown-item" data-page="clientes.html" href="clientes.html"><i class="bi bi-people me-2"></i>Clientes</a></li>
                            <li><a class="dropdown-item" data-page="proveedores.html" href="proveedores.html"><i class="bi bi-truck me-2"></i>Proveedores</a></li>
                            <li><a class="dropdown-item" data-page="productos.html" href="productos.html"><i class="bi bi-box me-2"></i>Productos</a></li>
                            <li><hr class="dropdown-divider"></li>
                            <li><a class="dropdown-item" data-page="ordenes.html" href="ordenes.html"><i class="bi bi-clipboard-check me-2"></i>Ordenes de Clientes</a></li>
                            <li><a class="dropdown-item" data-page="ordenes-compra.html" href="ordenes-compra.html"><i class="bi bi-cart-check me-2"></i>Ordenes de Compra</a></li>
                        </ul>
                    </li>
                    <li class="nav-item">
                        <a class="nav-link" data-page="alertas.html" href="alertas.html">
                            <i class="bi bi-bell me-1"></i> Alertas
                            <span class="badge bg-danger ms-1" id="alertasBadge" style="display:none;">0</span>
                        </a>
                    </li>
                    <li class="nav-item">
                        <a class="nav-link" data-page="reportes.html" href="reportes.html">
                            <i class="bi bi-file-earmark-bar-graph me-1"></i> Reportes
                        </a>
                    </li>
                    <li class="nav-item dropdown">
                        <a class="nav-link dropdown-toggle" href="#" data-bs-toggle="dropdown">
                            <i class="bi bi-three-dots"></i>
                        </a>
                        <ul class="dropdown-menu dropdown-menu-end">
                            <li><a class="dropdown-item" data-page="incidencias.html" href="incidencias.html"><i class="bi bi-exclamation-triangle me-2"></i>Incidencias</a></li>
                            <li><a class="dropdown-item" data-page="chatbot.html" href="chatbot.html"><i class="bi bi-chat-dots me-2"></i>Chatbot IA</a></li>
                            <li><hr class="dropdown-divider"></li>
                            <li><a class="dropdown-item" data-page="admin.html" href="admin.html"><i class="bi bi-gear me-2"></i>Administracion</a></li>
                        </ul>
                    </li>
                </ul>
                <div class="d-flex align-items-center">
                    <span class="text-light me-3" id="userInfo">
                        <i class="bi bi-person-circle me-1"></i>
                        <span id="userName">Usuario</span>
                    </span>
                    <button class="btn btn-outline-light btn-sm" id="btnLogout" onclick="if(typeof Auth!=='undefined')Auth.logout(); else window.location.href='login.html';">
                        <i class="bi bi-box-arrow-right me-1"></i> Salir
                    </button>
                </div>
            </div>
        </div>
    </nav>`,

    /** Inyecta el navbar en el placeholder y marca la pagina activa */
    render: function() {
        const placeholder = document.getElementById('navbar-placeholder');
        if (!placeholder) return;

        placeholder.outerHTML = this.HTML;

        // Marcar pagina activa
        const paginaActual = window.location.pathname.split('/').pop() || 'index.html';
        document.querySelectorAll('[data-page]').forEach(link => {
            if (link.dataset.page === paginaActual) {
                link.classList.add('active');
                // Si esta dentro de un dropdown, marcar el dropdown parent
                const dropdownParent = link.closest('.dropdown');
                if (dropdownParent) {
                    const parentLink = dropdownParent.querySelector('.nav-link.dropdown-toggle');
                    if (parentLink) parentLink.classList.add('active');
                }
            }
        });
    },
};

// Render automatico al cargar DOM
if (typeof window !== 'undefined') {
    window.NavbarAxones = NavbarAxones;
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => NavbarAxones.render());
    } else {
        NavbarAxones.render();
    }
}
