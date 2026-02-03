/**
 * Modulo de Tema - Sistema Axones
 * Manejo de modo oscuro/claro
 */

const ThemeManager = {
    // Clave de localStorage
    STORAGE_KEY: 'axones_theme',

    // Inicializar
    init() {
        this.loadTheme();
        this.createToggleButton();
    },

    // Cargar tema guardado
    loadTheme() {
        const savedTheme = localStorage.getItem(this.STORAGE_KEY);

        if (savedTheme) {
            this.setTheme(savedTheme);
        } else {
            // Detectar preferencia del sistema
            const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
            this.setTheme(prefersDark ? 'dark' : 'light');
        }

        // Escuchar cambios en preferencia del sistema
        window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
            if (!localStorage.getItem(this.STORAGE_KEY)) {
                this.setTheme(e.matches ? 'dark' : 'light');
            }
        });
    },

    // Establecer tema
    setTheme(theme) {
        document.documentElement.setAttribute('data-theme', theme);
        localStorage.setItem(this.STORAGE_KEY, theme);
        this.updateToggleButton(theme);
    },

    // Alternar tema
    toggleTheme() {
        const currentTheme = document.documentElement.getAttribute('data-theme') || 'light';
        const newTheme = currentTheme === 'light' ? 'dark' : 'light';
        this.setTheme(newTheme);

        // Mostrar notificacion
        this.showNotification(newTheme === 'dark' ? 'Modo oscuro activado' : 'Modo claro activado');
    },

    // Crear boton de toggle
    createToggleButton() {
        // Buscar el navbar
        const navbar = document.querySelector('.navbar .d-flex.align-items-center');
        if (!navbar) return;

        // Verificar si ya existe
        if (document.getElementById('themeToggle')) return;

        const btn = document.createElement('button');
        btn.id = 'themeToggle';
        btn.className = 'btn btn-link text-light theme-toggle me-2';
        btn.title = 'Cambiar tema';
        btn.onclick = () => this.toggleTheme();

        const currentTheme = document.documentElement.getAttribute('data-theme') || 'light';
        btn.innerHTML = currentTheme === 'dark'
            ? '<i class="bi bi-sun-fill fs-5"></i>'
            : '<i class="bi bi-moon-fill fs-5"></i>';

        navbar.insertBefore(btn, navbar.firstChild);
    },

    // Actualizar icono del boton
    updateToggleButton(theme) {
        const btn = document.getElementById('themeToggle');
        if (btn) {
            btn.innerHTML = theme === 'dark'
                ? '<i class="bi bi-sun-fill fs-5"></i>'
                : '<i class="bi bi-moon-fill fs-5"></i>';
        }
    },

    // Mostrar notificacion
    showNotification(message) {
        let container = document.querySelector('.toast-container');
        if (!container) {
            container = document.createElement('div');
            container.className = 'toast-container position-fixed bottom-0 end-0 p-3';
            document.body.appendChild(container);
        }

        const toast = document.createElement('div');
        toast.className = 'toast align-items-center bg-primary text-white border-0';
        toast.innerHTML = `
            <div class="d-flex">
                <div class="toast-body">
                    <i class="bi bi-palette me-2"></i>${message}
                </div>
                <button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast"></button>
            </div>
        `;

        container.appendChild(toast);
        const bsToast = new bootstrap.Toast(toast, { delay: 2000 });
        bsToast.show();

        toast.addEventListener('hidden.bs.toast', () => toast.remove());
    },

    // Obtener tema actual
    getCurrentTheme() {
        return document.documentElement.getAttribute('data-theme') || 'light';
    }
};

// Inicializar cuando el DOM este listo
document.addEventListener('DOMContentLoaded', () => {
    ThemeManager.init();
});

// Exportar
if (typeof window !== 'undefined') {
    window.ThemeManager = ThemeManager;
}
