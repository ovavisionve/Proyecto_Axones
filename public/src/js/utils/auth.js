/**
 * Modulo de Autenticacion - Sistema Axones
 * Maneja login con Google OAuth 2.0 y gestion de sesiones
 */

const Auth = {
    // Estado actual del usuario
    currentUser: null,

    /**
     * Inicializa el modulo de autenticacion
     */
    init: function() {
        this.checkSession();
        this.setupLoginButton();
    },

    /**
     * Verifica si hay una sesion activa
     */
    checkSession: function() {
        const sessionData = localStorage.getItem(CONFIG.CACHE.PREFIJO + 'session');
        if (sessionData) {
            try {
                const session = JSON.parse(sessionData);
                // Verificar si la sesion no ha expirado
                if (session.expiry > Date.now()) {
                    this.currentUser = session.user;
                    this.updateUI();
                    return true;
                } else {
                    this.logout();
                }
            } catch (e) {
                console.error('Error parseando sesion:', e);
                this.logout();
            }
        }
        return false;
    },

    /**
     * Configura el boton de login
     */
    setupLoginButton: function() {
        const btnLogin = document.getElementById('btnLogin');
        if (btnLogin) {
            btnLogin.addEventListener('click', () => {
                if (this.currentUser) {
                    this.logout();
                } else {
                    this.login();
                }
            });
        }
    },

    /**
     * Inicia el proceso de login
     */
    login: function() {
        this.mostrarModalLogin();
    },

    /**
     * Muestra modal de login
     */
    mostrarModalLogin: function() {
        // Remover modal existente
        const existente = document.getElementById('modalLogin');
        if (existente) existente.remove();

        const modalHtml = `
            <div class="modal fade" id="modalLogin" tabindex="-1">
                <div class="modal-dialog modal-sm">
                    <div class="modal-content">
                        <div class="modal-header bg-primary text-white">
                            <h5 class="modal-title"><i class="bi bi-person-lock me-2"></i>Iniciar Sesion</h5>
                            <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal"></button>
                        </div>
                        <div class="modal-body">
                            <form id="formLogin">
                                <div class="mb-3">
                                    <label class="form-label">Usuario</label>
                                    <input type="text" class="form-control" id="loginUsuario" required placeholder="Ingrese usuario">
                                </div>
                                <div class="mb-3">
                                    <label class="form-label">Contrasena</label>
                                    <input type="password" class="form-control" id="loginPassword" required placeholder="Ingrese contrasena">
                                </div>
                                <div id="loginError" class="alert alert-danger py-2 d-none"></div>
                                <div class="d-grid">
                                    <button type="submit" class="btn btn-primary" id="btnSubmitLogin">
                                        <i class="bi bi-box-arrow-in-right me-1"></i>Ingresar
                                    </button>
                                </div>
                            </form>
                        </div>
                        <div class="modal-footer justify-content-center">
                            <small class="text-muted">Sistema Axones v1.0</small>
                        </div>
                    </div>
                </div>
            </div>
        `;

        document.body.insertAdjacentHTML('beforeend', modalHtml);

        const modal = new bootstrap.Modal(document.getElementById('modalLogin'));
        modal.show();

        // Configurar formulario
        document.getElementById('formLogin').addEventListener('submit', async (e) => {
            e.preventDefault();
            await this.procesarLogin();
        });
    },

    /**
     * Procesa el login - primero local, luego API
     */
    procesarLogin: async function() {
        const usuario = document.getElementById('loginUsuario').value;
        const password = document.getElementById('loginPassword').value;
        const errorDiv = document.getElementById('loginError');
        const btnSubmit = document.getElementById('btnSubmitLogin');

        btnSubmit.disabled = true;
        btnSubmit.innerHTML = '<span class="spinner-border spinner-border-sm me-1"></span>Verificando...';
        errorDiv.classList.add('d-none');

        // PASO 1: Siempre intentar login local primero
        const loginLocal = this.loginLocal(usuario, password);
        if (loginLocal) {
            this.setSession(loginLocal);
            const modal = bootstrap.Modal.getInstance(document.getElementById('modalLogin'));
            modal.hide();
            this.mostrarToast('Bienvenido, ' + loginLocal.nombre, 'success');
            btnSubmit.disabled = false;
            btnSubmit.innerHTML = '<i class="bi bi-box-arrow-in-right me-1"></i>Ingresar';
            return;
        }

        // PASO 2: Si no hay match local, intentar con API
        try {
            const response = await AxonesAPI.login(usuario, password);
            if (response && response.success && response.usuario) {
                const user = {
                    id: response.usuario.id,
                    usuario: response.usuario.usuario,
                    nombre: response.usuario.nombre,
                    rol: response.usuario.rol,
                };
                this.setSession(user);
                const modal = bootstrap.Modal.getInstance(document.getElementById('modalLogin'));
                modal.hide();
                this.mostrarToast('Bienvenido, ' + user.nombre, 'success');
                return;
            }
        } catch (e) {
            console.warn('API login error:', e);
        }

        // PASO 3: Si nada funciono, mostrar error
        errorDiv.textContent = 'Usuario o contrasena incorrectos';
        errorDiv.classList.remove('d-none');
        btnSubmit.disabled = false;
        btnSubmit.innerHTML = '<i class="bi bi-box-arrow-in-right me-1"></i>Ingresar';
    },

    /**
     * Login local - fallback cuando la API no responde correctamente
     */
    loginLocal: function(usuario, password) {
        const usuarios = [
            { id: 1, usuario: 'admin', password: 'admin123', nombre: 'Administrador', rol: 'administrador' },
            { id: 2, usuario: 'supervisor', password: 'super123', nombre: 'Supervisor Planta', rol: 'supervisor' },
            { id: 3, usuario: 'jefe', password: 'jefe123', nombre: 'Jefe Operaciones', rol: 'jefe_operaciones' },
            { id: 4, usuario: 'operador1', password: 'op123', nombre: 'Juan Perez', rol: 'operador' },
            { id: 5, usuario: 'operador2', password: 'op123', nombre: 'Maria Garcia', rol: 'operador' },
        ];

        const user = usuarios.find(u => u.usuario === usuario && u.password === password);
        if (user) {
            return {
                id: user.id,
                usuario: user.usuario,
                nombre: user.nombre,
                rol: user.rol
            };
        }
        return null;
    },

    /**
     * Muestra toast de notificacion
     */
    mostrarToast: function(mensaje, tipo = 'info') {
        let container = document.querySelector('.toast-container');
        if (!container) {
            container = document.createElement('div');
            container.className = 'toast-container position-fixed bottom-0 end-0 p-3';
            document.body.appendChild(container);
        }

        const bgClass = tipo === 'success' ? 'bg-success' : tipo === 'danger' ? 'bg-danger' : 'bg-info';

        const toastHtml = `
            <div class="toast align-items-center ${bgClass} text-white border-0" role="alert">
                <div class="d-flex">
                    <div class="toast-body">${mensaje}</div>
                    <button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast"></button>
                </div>
            </div>
        `;

        container.insertAdjacentHTML('beforeend', toastHtml);
        const toastEl = container.lastElementChild;
        const toast = new bootstrap.Toast(toastEl);
        toast.show();
        toastEl.addEventListener('hidden.bs.toast', () => toastEl.remove());
    },

    /**
     * Guarda la sesion del usuario
     */
    setSession: function(user) {
        this.currentUser = user;
        const session = {
            user: user,
            expiry: Date.now() + (8 * 60 * 60 * 1000), // 8 horas
        };
        localStorage.setItem(CONFIG.CACHE.PREFIJO + 'session', JSON.stringify(session));
        this.updateUI();
    },

    /**
     * Cierra la sesion del usuario
     */
    logout: function() {
        this.currentUser = null;
        localStorage.removeItem(CONFIG.CACHE.PREFIJO + 'session');
        this.updateUI();

        // Redirigir a la pagina principal
        if (window.location.pathname !== '/index.html' && window.location.pathname !== '/') {
            window.location.href = 'index.html';
        }
    },

    /**
     * Actualiza la interfaz segun el estado de autenticacion
     */
    updateUI: function() {
        const userNameEl = document.getElementById('userName');
        const btnLogin = document.getElementById('btnLogin');
        const userInfo = document.getElementById('userInfo');

        if (this.currentUser) {
            if (userNameEl) {
                userNameEl.textContent = this.currentUser.nombre;
            }
            if (btnLogin) {
                btnLogin.innerHTML = '<i class="bi bi-box-arrow-right me-1"></i> Salir';
                btnLogin.classList.remove('btn-outline-light');
                btnLogin.classList.add('btn-outline-danger');
            }
            if (userInfo) {
                userInfo.classList.remove('d-none');
            }

            // Mostrar/ocultar elementos segun rol
            this.applyRolePermissions();
        } else {
            if (userNameEl) {
                userNameEl.textContent = 'Usuario';
            }
            if (btnLogin) {
                btnLogin.innerHTML = '<i class="bi bi-box-arrow-in-right me-1"></i> Ingresar';
                btnLogin.classList.remove('btn-outline-danger');
                btnLogin.classList.add('btn-outline-light');
            }
        }
    },

    /**
     * Aplica permisos visuales segun el rol del usuario
     */
    applyRolePermissions: function() {
        if (!this.currentUser) return;

        const permisos = CONFIG.PERMISOS[this.currentUser.rol] || [];

        // Ocultar elementos que requieren permisos especificos
        document.querySelectorAll('[data-permiso]').forEach(el => {
            const permisoRequerido = el.dataset.permiso;
            if (!permisos.includes(permisoRequerido)) {
                el.style.display = 'none';
            } else {
                el.style.display = '';
            }
        });

        // Ocultar modulos segun rol
        document.querySelectorAll('[data-rol-minimo]').forEach(el => {
            const rolMinimo = el.dataset.rolMinimo;
            const rolesOrdenados = [CONFIG.ROLES.OPERADOR, CONFIG.ROLES.SUPERVISOR, CONFIG.ROLES.ADMINISTRADOR];
            const indexMinimo = rolesOrdenados.indexOf(rolMinimo);
            const indexActual = rolesOrdenados.indexOf(this.currentUser.rol);

            if (indexActual < indexMinimo) {
                el.style.display = 'none';
            } else {
                el.style.display = '';
            }
        });

        // Ocultar chatbot para no-administradores
        this.ocultarChatbotParaNoAdmins();
    },

    /**
     * Oculta el enlace del chatbot si el usuario no es administrador
     */
    ocultarChatbotParaNoAdmins: function() {
        const esAdmin = this.currentUser && this.currentUser.rol === 'administrador';

        // Buscar enlaces al chatbot en el navbar
        document.querySelectorAll('a[href="chatbot.html"]').forEach(link => {
            const parentLi = link.closest('li.nav-item');
            if (parentLi) {
                parentLi.style.display = esAdmin ? '' : 'none';
            } else {
                link.style.display = esAdmin ? '' : 'none';
            }
        });
    },

    /**
     * Verifica si el usuario tiene un permiso especifico
     */
    tienePermiso: function(permiso) {
        if (!this.currentUser) return false;
        const permisos = CONFIG.PERMISOS[this.currentUser.rol] || [];
        return permisos.includes(permiso);
    },

    /**
     * Verifica si el usuario tiene al menos el rol especificado
     */
    tieneRol: function(rolMinimo) {
        if (!this.currentUser) return false;
        const rolesOrdenados = [CONFIG.ROLES.OPERADOR, CONFIG.ROLES.SUPERVISOR, CONFIG.ROLES.ADMINISTRADOR];
        const indexMinimo = rolesOrdenados.indexOf(rolMinimo);
        const indexActual = rolesOrdenados.indexOf(this.currentUser.rol);
        return indexActual >= indexMinimo;
    },

    /**
     * Obtiene el usuario actual
     */
    getUser: function() {
        return this.currentUser;
    },

    /**
     * Verifica si hay un usuario autenticado
     */
    isAuthenticated: function() {
        return this.currentUser !== null;
    },
};

// Inicializar cuando el DOM este listo
document.addEventListener('DOMContentLoaded', () => {
    Auth.init();
});

// Exportar modulo
if (typeof module !== 'undefined' && module.exports) {
    module.exports = Auth;
}
