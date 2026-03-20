/**
 * Modulo de Autenticacion - Sistema Axones
 * Maneja login con Google OAuth 2.0 y gestion de sesiones
 */

const Auth = {
    // Estado actual del usuario
    currentUser: null,

    // Pagina de login (excluida del redirect)
    PAGINA_LOGIN: 'login.html',

    /**
     * Inicializa el modulo de autenticacion
     */
    init: function() {
        this.checkSession();
        this.verificarAccesoProtegido();
        this.setupLoginButton();
    },

    /**
     * Verifica si el usuario tiene sesion activa.
     * Si no la tiene, redirige a login.html (excepto si ya esta en login.html)
     */
    verificarAccesoProtegido: function() {
        const paginaActual = window.location.pathname.split('/').pop() || 'index.html';

        // No redirigir si ya esta en login.html
        if (paginaActual === this.PAGINA_LOGIN || paginaActual === '') return;

        if (!this.currentUser) {
            // Guardar pagina actual para volver despues del login
            sessionStorage.setItem('axones_return_to', paginaActual);
            window.location.href = this.PAGINA_LOGIN;
        }
    },

    /**
     * Muestra modal de login obligatorio (no se puede cerrar sin iniciar sesion)
     */
    mostrarLoginObligatorio: function() {
        // Remover modal existente
        const existente = document.getElementById('modalLoginObligatorio');
        if (existente) existente.remove();

        const modalHtml = `
            <div class="modal fade" id="modalLoginObligatorio" tabindex="-1" data-bs-backdrop="static" data-bs-keyboard="false">
                <div class="modal-dialog modal-sm modal-dialog-centered">
                    <div class="modal-content">
                        <div class="modal-header bg-warning text-dark">
                            <h5 class="modal-title"><i class="bi bi-shield-lock me-2"></i>Acceso Restringido</h5>
                        </div>
                        <div class="modal-body">
                            <div class="alert alert-info py-2 mb-3">
                                <i class="bi bi-info-circle me-1"></i>
                                Esta seccion requiere iniciar sesion para continuar.
                            </div>
                            <form id="formLoginObligatorio">
                                <div class="mb-3">
                                    <label class="form-label">Usuario</label>
                                    <input type="text" class="form-control" id="loginUsuarioOblig" required placeholder="Ingrese usuario">
                                </div>
                                <div class="mb-3">
                                    <label class="form-label">Contrasena</label>
                                    <input type="password" class="form-control" id="loginPasswordOblig" required placeholder="Ingrese contrasena">
                                </div>
                                <div id="loginErrorOblig" class="alert alert-danger py-2 d-none"></div>
                                <div class="d-grid gap-2">
                                    <button type="submit" class="btn btn-primary" id="btnSubmitLoginOblig">
                                        <i class="bi bi-box-arrow-in-right me-1"></i>Ingresar
                                    </button>
                                    <a href="index.html" class="btn btn-outline-secondary">
                                        <i class="bi bi-house me-1"></i>Volver al Inicio
                                    </a>
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

        const modal = new bootstrap.Modal(document.getElementById('modalLoginObligatorio'), {
            backdrop: 'static',
            keyboard: false
        });
        modal.show();

        // Configurar formulario
        document.getElementById('formLoginObligatorio').addEventListener('submit', async (e) => {
            e.preventDefault();
            await this.procesarLoginObligatorio(modal);
        });
    },

    /**
     * Procesa el login obligatorio
     */
    procesarLoginObligatorio: async function(modal) {
        const usuario = document.getElementById('loginUsuarioOblig').value;
        const password = document.getElementById('loginPasswordOblig').value;
        const errorDiv = document.getElementById('loginErrorOblig');
        const btnSubmit = document.getElementById('btnSubmitLoginOblig');

        btnSubmit.disabled = true;
        btnSubmit.innerHTML = '<span class="spinner-border spinner-border-sm me-1"></span>Verificando...';
        errorDiv.classList.add('d-none');

        // Intentar login local primero
        const loginLocal = this.loginLocal(usuario, password);
        if (loginLocal) {
            this.setSession(loginLocal);
            modal.hide();
            this.mostrarToast('Bienvenido, ' + loginLocal.nombre, 'success');
            btnSubmit.disabled = false;
            btnSubmit.innerHTML = '<i class="bi bi-box-arrow-in-right me-1"></i>Ingresar';
            // Recargar la pagina para aplicar permisos
            window.location.reload();
            return;
        }

        // Intentar con API
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
                modal.hide();
                this.mostrarToast('Bienvenido, ' + user.nombre, 'success');
                window.location.reload();
                return;
            }
        } catch (e) {
            console.warn('API login error:', e);
        }

        // Error
        errorDiv.textContent = 'Usuario o contrasena incorrectos';
        errorDiv.classList.remove('d-none');
        btnSubmit.disabled = false;
        btnSubmit.innerHTML = '<i class="bi bi-box-arrow-in-right me-1"></i>Ingresar';
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
            // Gerencia
            { id: 1, usuario: 'rparra', password: 'axones2026', nombre: 'ROBERT PARRA', rol: 'jefe_operaciones', area: 'Gerencia', cargo: 'Gerente General' },
            // Produccion
            { id: 2, usuario: 'ajaure', password: 'axones2026', nombre: 'ALEXIS JAURE', rol: 'jefe_operaciones', area: 'Produccion', cargo: 'Gerente de Operaciones' },
            { id: 3, usuario: 'aanare', password: 'axones2026', nombre: 'ANGEL ANARE', rol: 'planificador', area: 'Produccion', cargo: 'Planificador' },
            { id: 4, usuario: 'rguape', password: 'axones2026', nombre: 'ROXANA GUAPE', rol: 'supervisor', area: 'Produccion', cargo: 'Supervisora de Calidad' },
            { id: 5, usuario: 'harzola', password: 'axones2026', nombre: 'HENRY ARZOLA', rol: 'supervisor', area: 'Produccion', cargo: 'Supervisor de Produccion' },
            // Almacen
            { id: 6, usuario: 'lgonzalez', password: 'axones2026', nombre: 'LEONARDO GONZALEZ', rol: 'jefe_almacen', area: 'Almacen', cargo: 'Almacenista' },
            // Impresion
            { id: 7, usuario: 'gmujica', password: 'axones2026', nombre: 'GONZALO MUJICA', rol: 'operador', area: 'Impresion', cargo: 'Operador de Impresion' },
            { id: 8, usuario: 'ncamacaro', password: 'axones2026', nombre: 'NELSON CAMACARO', rol: 'operador', area: 'Impresion', cargo: 'Operador de Impresion' },
            { id: 9, usuario: 'scobos', password: 'axones2026', nombre: 'STIVEN COBOS', rol: 'operador', area: 'Impresion', cargo: 'Operador de Impresion' },
            { id: 10, usuario: 'nnino', password: 'axones2026', nombre: 'NESTOR NINO', rol: 'operador', area: 'Impresion', cargo: 'Operador de Impresion' },
            { id: 11, usuario: 'mnieves', password: 'axones2026', nombre: 'MIGUEL NIEVES', rol: 'operador', area: 'Impresion', cargo: 'Operador de Impresion' },
            // Laminacion
            { id: 12, usuario: 'jcolmenares', password: 'axones2026', nombre: 'JACSON COLMENARES', rol: 'operador', area: 'Laminacion', cargo: 'Operador de Laminacion' },
            { id: 13, usuario: 'arodriguez', password: 'axones2026', nombre: 'ANGEL RODRIGUEZ', rol: 'operador', area: 'Laminacion', cargo: 'Operador de Laminacion' },
            { id: 14, usuario: 'yaranguren', password: 'axones2026', nombre: 'YSAIAS ARANGUREN', rol: 'operador', area: 'Laminacion', cargo: 'Operador de Laminacion' },
            // Corte
            { id: 15, usuario: 'jguzman', password: 'axones2026', nombre: 'JUAN GUZMAN', rol: 'operador', area: 'Corte', cargo: 'Operador de Corte' },
            { id: 16, usuario: 'apinero', password: 'axones2026', nombre: 'ALIS PINERO', rol: 'operador', area: 'Corte', cargo: 'Operador de Corte' },
            { id: 17, usuario: 'imonroy', password: 'axones2026', nombre: 'IAN MONROY', rol: 'operador', area: 'Corte', cargo: 'Operador de Corte' },
            { id: 18, usuario: 'fabarca', password: 'axones2026', nombre: 'FERNANDO ABARCA', rol: 'operador', area: 'Corte', cargo: 'Operador de Corte' },
            { id: 19, usuario: 'rpena', password: 'axones2026', nombre: 'RAMIRO PENA', rol: 'operador', area: 'Corte', cargo: 'Operador de Corte' },
            { id: 20, usuario: 'emarquez', password: 'axones2026', nombre: 'EFREN MARQUEZ', rol: 'operador', area: 'Corte', cargo: 'Operador de Corte' },
            { id: 21, usuario: 'jmartinez', password: 'axones2026', nombre: 'JESUS MARTINEZ', rol: 'operador', area: 'Corte', cargo: 'Operador de Corte' },
            // Colorista
            { id: 22, usuario: 'alaya', password: 'axones2026', nombre: 'ASDRUBAL LAYA', rol: 'colorista', area: 'Produccion', cargo: 'Colorista' },
            // Admin del sistema (acceso de desarrollo)
            { id: 99, usuario: 'admin', password: 'admin123', nombre: 'Administrador', rol: 'administrador', area: 'Administracion', cargo: 'Administrador del Sistema' },
        ];

        const user = usuarios.find(u => u.usuario === usuario && u.password === password);
        if (user) {
            return {
                id: user.id,
                usuario: user.usuario,
                nombre: user.nombre,
                rol: user.rol,
                area: user.area || '',
                cargo: user.cargo || ''
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

        // Redirigir a login
        const paginaActual = window.location.pathname.split('/').pop() || '';
        if (paginaActual !== this.PAGINA_LOGIN) {
            window.location.href = this.PAGINA_LOGIN;
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
