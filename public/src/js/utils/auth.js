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
     * Inicia el proceso de login con Google
     * En produccion, esto redirige a Google OAuth
     */
    login: function() {
        // En desarrollo, simulamos el login
        if (CONFIG.API.BASE_URL === '') {
            this.simulateLogin();
            return;
        }

        // En produccion, redirigir a Google OAuth via Apps Script
        window.location.href = CONFIG.API.BASE_URL + '?action=login';
    },

    /**
     * Simula un login para desarrollo
     */
    simulateLogin: function() {
        const mockUser = {
            id: 'user_001',
            email: 'operador@axones.com',
            nombre: 'Usuario Demo',
            rol: CONFIG.ROLES.OPERADOR,
            avatar: null,
        };

        // Mostrar modal de seleccion de rol para desarrollo
        const roles = Object.values(CONFIG.ROLES);
        const rolSeleccionado = prompt(
            'Seleccione rol para desarrollo:\n' +
            roles.map((r, i) => `${i + 1}. ${r}`).join('\n'),
            '1'
        );

        const index = parseInt(rolSeleccionado) - 1;
        if (index >= 0 && index < roles.length) {
            mockUser.rol = roles[index];
            mockUser.nombre = `Demo ${roles[index].charAt(0).toUpperCase() + roles[index].slice(1)}`;
        }

        this.setSession(mockUser);
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
