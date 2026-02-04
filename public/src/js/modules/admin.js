/**
 * Modulo de Administracion - Sistema Axones
 * Panel de configuracion y gestion del sistema
 */

const AdminModule = {
    // Inicializar
    init() {
        console.log('Inicializando modulo de Administracion...');
        this.cargarConfiguracion();
        this.cargarUsuarios();
        this.actualizarEstadisticas();
        this.actualizarStorage();
    },

    // Cargar configuracion (solo lectura desde CONFIG)
    cargarConfiguracion() {
        const config = JSON.parse(localStorage.getItem('axones_config') || '{}');

        // Mostrar configuracion desde CONFIG global (solo lectura)
        const apiUrl = document.getElementById('apiUrl');
        if (apiUrl && typeof CONFIG !== 'undefined') {
            apiUrl.value = CONFIG.API.BASE_URL || 'No configurado';
        }

        const sheetsId = document.getElementById('sheetsId');
        if (sheetsId && typeof CONFIG !== 'undefined') {
            sheetsId.value = CONFIG.API.SHEETS_ID || 'No configurado';
        }

        // Umbrales
        const umbralAdvertencia = document.getElementById('umbralAdvertencia');
        const umbralMaximo = document.getElementById('umbralMaximo');
        if (umbralAdvertencia) umbralAdvertencia.value = config.umbralAdvertencia || 5;
        if (umbralMaximo) umbralMaximo.value = config.umbralMaximo || 6;

        // Modo sistema - siempre produccion si hay CONFIG
        const modoSistema = document.getElementById('modoSistema');
        if (modoSistema && typeof CONFIG !== 'undefined' && CONFIG.API.BASE_URL) {
            modoSistema.textContent = 'Produccion';
            modoSistema.className = 'badge bg-success';
        } else if (modoSistema) {
            modoSistema.textContent = 'Desarrollo';
            modoSistema.className = 'badge bg-warning text-dark';
        }

        // Ultima actualizacion
        const ultimaActualizacion = document.getElementById('ultimaActualizacion');
        if (ultimaActualizacion) {
            ultimaActualizacion.textContent = config.ultimaActualizacion
                ? new Date(config.ultimaActualizacion).toLocaleString('es-VE')
                : 'Sistema configurado';
        }
    },

    // Guardar umbrales
    guardarUmbrales() {
        const umbralAdvertencia = parseFloat(document.getElementById('umbralAdvertencia')?.value) || 5;
        const umbralMaximo = parseFloat(document.getElementById('umbralMaximo')?.value) || 6;

        if (umbralAdvertencia >= umbralMaximo) {
            this.mostrarNotificacion('El umbral de advertencia debe ser menor al maximo', 'warning');
            return;
        }

        const config = JSON.parse(localStorage.getItem('axones_config') || '{}');
        config.umbralAdvertencia = umbralAdvertencia;
        config.umbralMaximo = umbralMaximo;
        config.ultimaActualizacion = new Date().toISOString();

        localStorage.setItem('axones_config', JSON.stringify(config));

        // Actualizar CONFIG global si existe
        if (typeof CONFIG !== 'undefined' && CONFIG.UMBRALES_REFIL) {
            CONFIG.UMBRALES_REFIL.default.advertencia = umbralAdvertencia;
            CONFIG.UMBRALES_REFIL.default.maximo = umbralMaximo;
        }

        this.mostrarNotificacion('Umbrales guardados correctamente', 'success');
    },

    // Probar conexion usando CONFIG global
    async probarConexion() {
        const statusEl = document.getElementById('conexionStatus');
        const apiUrl = (typeof CONFIG !== 'undefined') ? CONFIG.API.BASE_URL : null;

        if (!apiUrl) {
            statusEl.innerHTML = '<span class="text-warning"><i class="bi bi-exclamation-circle me-1"></i>API no configurada</span>';
            return;
        }

        statusEl.innerHTML = '<span class="text-muted"><i class="bi bi-arrow-repeat spin me-1"></i>Probando...</span>';

        try {
            const response = await fetch(apiUrl + '?action=ping', {
                method: 'GET',
                mode: 'cors'
            });

            if (response.ok) {
                const data = await response.json();
                if (data.success) {
                    statusEl.innerHTML = '<span class="text-success"><i class="bi bi-check-circle me-1"></i>Conexion exitosa</span>';
                } else {
                    throw new Error(data.error || 'Error en respuesta');
                }
            } else {
                throw new Error('Error ' + response.status);
            }
        } catch (error) {
            statusEl.innerHTML = `<span class="text-danger"><i class="bi bi-x-circle me-1"></i>Error: ${error.message}</span>`;
        }
    },

    // Cargar usuarios
    cargarUsuarios() {
        const usuarios = JSON.parse(localStorage.getItem('axones_usuarios') || '[]');
        const tbody = document.getElementById('tablaUsuarios');

        if (!tbody) return;

        if (usuarios.length === 0) {
            // Crear usuarios de ejemplo
            const usuariosDemo = [
                { id: 1, nombre: 'Administrador', email: 'admin@axones.com', rol: 'administrador', activo: true },
                { id: 2, nombre: 'Supervisor General', email: 'supervisor@axones.com', rol: 'supervisor', activo: true },
                { id: 3, nombre: 'Jefe de Operaciones', email: 'operaciones@axones.com', rol: 'jefe_operaciones', activo: true },
                { id: 4, nombre: 'Operador 1', email: 'operador1@axones.com', rol: 'operador', activo: true },
                { id: 5, nombre: 'Operador 2', email: 'operador2@axones.com', rol: 'operador', activo: false },
            ];
            localStorage.setItem('axones_usuarios', JSON.stringify(usuariosDemo));
            this.cargarUsuarios();
            return;
        }

        tbody.innerHTML = usuarios.map(u => {
            const rolBadge = this.getRolBadge(u.rol);
            const estadoBadge = u.activo
                ? '<span class="badge bg-success">Activo</span>'
                : '<span class="badge bg-secondary">Inactivo</span>';

            return `
                <tr>
                    <td><strong>${u.nombre}</strong></td>
                    <td>${u.email}</td>
                    <td>${rolBadge}</td>
                    <td>${estadoBadge}</td>
                    <td>
                        <button class="btn btn-sm btn-outline-secondary" onclick="AdminModule.toggleUsuario(${u.id})">
                            <i class="bi bi-toggle-${u.activo ? 'on' : 'off'}"></i>
                        </button>
                    </td>
                </tr>
            `;
        }).join('');
    },

    // Obtener badge de rol
    getRolBadge(rol) {
        const roles = {
            'administrador': '<span class="badge bg-danger">Administrador</span>',
            'supervisor': '<span class="badge bg-warning text-dark">Supervisor</span>',
            'jefe_operaciones': '<span class="badge bg-info">Jefe Operaciones</span>',
            'operador': '<span class="badge bg-secondary">Operador</span>',
        };
        return roles[rol] || '<span class="badge bg-light text-dark">Desconocido</span>';
    },

    // Mostrar modal de usuario
    mostrarModalUsuario() {
        document.getElementById('usuarioNombre').value = '';
        document.getElementById('usuarioEmail').value = '';
        document.getElementById('usuarioRol').value = 'operador';

        const modal = new bootstrap.Modal(document.getElementById('modalUsuario'));
        modal.show();
    },

    // Guardar usuario
    guardarUsuario() {
        const nombre = document.getElementById('usuarioNombre')?.value;
        const email = document.getElementById('usuarioEmail')?.value;
        const rol = document.getElementById('usuarioRol')?.value;

        if (!nombre || !email) {
            this.mostrarNotificacion('Complete todos los campos', 'warning');
            return;
        }

        const usuarios = JSON.parse(localStorage.getItem('axones_usuarios') || '[]');

        // Verificar email duplicado
        if (usuarios.some(u => u.email === email)) {
            this.mostrarNotificacion('El email ya esta registrado', 'warning');
            return;
        }

        usuarios.push({
            id: Date.now(),
            nombre: nombre,
            email: email,
            rol: rol,
            activo: true
        });

        localStorage.setItem('axones_usuarios', JSON.stringify(usuarios));

        bootstrap.Modal.getInstance(document.getElementById('modalUsuario')).hide();
        this.cargarUsuarios();
        this.mostrarNotificacion('Usuario agregado correctamente', 'success');
    },

    // Toggle estado usuario
    toggleUsuario(id) {
        const usuarios = JSON.parse(localStorage.getItem('axones_usuarios') || '[]');
        const index = usuarios.findIndex(u => u.id === id);

        if (index !== -1) {
            usuarios[index].activo = !usuarios[index].activo;
            localStorage.setItem('axones_usuarios', JSON.stringify(usuarios));
            this.cargarUsuarios();
        }
    },

    // Actualizar estadisticas
    actualizarEstadisticas() {
        const produccion = JSON.parse(localStorage.getItem('axones_produccion') || '[]');
        const inventario = JSON.parse(localStorage.getItem('axones_inventario') || '[]');
        const alertas = JSON.parse(localStorage.getItem('axones_alertas') || '[]');
        const tintas = JSON.parse(localStorage.getItem('axones_tintas') || '[]');

        const statProduccion = document.getElementById('statProduccion');
        const statInventario = document.getElementById('statInventario');
        const statAlertas = document.getElementById('statAlertas');
        const statTintas = document.getElementById('statTintas');

        if (statProduccion) statProduccion.textContent = produccion.length;
        if (statInventario) statInventario.textContent = inventario.length;
        if (statAlertas) statAlertas.textContent = alertas.length;
        if (statTintas) statTintas.textContent = tintas.length;
    },

    // Actualizar uso de storage
    actualizarStorage() {
        let total = 0;
        for (let key in localStorage) {
            if (localStorage.hasOwnProperty(key) && key.startsWith('axones_')) {
                total += localStorage.getItem(key).length * 2; // UTF-16
            }
        }

        const usedKB = (total / 1024).toFixed(1);
        const maxKB = 5120; // 5MB aproximado
        const porcentaje = Math.min((total / 1024 / maxKB) * 100, 100);

        const storageUsed = document.getElementById('storageUsed');
        const storageBar = document.getElementById('storageBar');

        if (storageUsed) storageUsed.textContent = usedKB;
        if (storageBar) {
            storageBar.style.width = porcentaje + '%';
            storageBar.className = 'progress-bar ' +
                (porcentaje > 80 ? 'bg-danger' : porcentaje > 50 ? 'bg-warning' : 'bg-success');
        }
    },

    // Generar datos de prueba
    generarDatosPrueba() {
        if (!confirm('Esto generara datos de prueba. Los datos actuales seran preservados. ¿Continuar?')) {
            return;
        }

        if (typeof DemoData !== 'undefined') {
            DemoData.init();
            this.actualizarEstadisticas();
            this.actualizarStorage();
            this.mostrarNotificacion('Datos de prueba generados correctamente', 'success');
        } else {
            this.mostrarNotificacion('Modulo DemoData no disponible', 'danger');
        }
    },

    // Limpiar datos
    limpiarDatos() {
        if (!confirm('¿Esta seguro de eliminar TODOS los datos? Esta accion no se puede deshacer.')) {
            return;
        }

        if (!confirm('ULTIMA ADVERTENCIA: Se eliminaran todos los registros de produccion, inventario, alertas y tintas.')) {
            return;
        }

        if (typeof DemoData !== 'undefined') {
            DemoData.limpiar();
        } else {
            localStorage.removeItem('axones_inventario');
            localStorage.removeItem('axones_produccion');
            localStorage.removeItem('axones_impresion');
            localStorage.removeItem('axones_alertas');
            localStorage.removeItem('axones_tintas');
            localStorage.removeItem('axones_maquinas_estado');
        }

        this.actualizarEstadisticas();
        this.actualizarStorage();
        this.mostrarNotificacion('Datos eliminados correctamente', 'success');
    },

    // Exportar datos (backup)
    exportarDatos() {
        const backup = {
            fecha: new Date().toISOString(),
            version: '1.0',
            datos: {}
        };

        // Recopilar todos los datos
        const keys = ['axones_config', 'axones_usuarios', 'axones_inventario', 'axones_produccion',
                     'axones_impresion', 'axones_alertas', 'axones_tintas', 'axones_maquinas_estado'];

        keys.forEach(key => {
            const data = localStorage.getItem(key);
            if (data) {
                backup.datos[key] = JSON.parse(data);
            }
        });

        // Descargar
        const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `axones_backup_${new Date().toISOString().split('T')[0]}.json`;
        a.click();
        URL.revokeObjectURL(url);

        this.mostrarNotificacion('Backup exportado correctamente', 'success');
    },

    // Importar datos
    importarDatos(input) {
        const file = input.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const backup = JSON.parse(e.target.result);

                if (!backup.datos) {
                    throw new Error('Formato de backup invalido');
                }

                if (!confirm(`Importar backup del ${new Date(backup.fecha).toLocaleString()}? Los datos actuales seran reemplazados.`)) {
                    return;
                }

                // Restaurar datos
                Object.keys(backup.datos).forEach(key => {
                    localStorage.setItem(key, JSON.stringify(backup.datos[key]));
                });

                this.cargarConfiguracion();
                this.cargarUsuarios();
                this.actualizarEstadisticas();
                this.actualizarStorage();
                this.mostrarNotificacion('Backup importado correctamente', 'success');

            } catch (error) {
                this.mostrarNotificacion('Error al importar: ' + error.message, 'danger');
            }
        };
        reader.readAsText(file);

        // Reset input
        input.value = '';
    },

    // Toggle password visibility
    togglePassword(inputId) {
        const input = document.getElementById(inputId);
        if (input) {
            input.type = input.type === 'password' ? 'text' : 'password';
        }
    },

    // Mostrar notificacion
    mostrarNotificacion(mensaje, tipo = 'info') {
        let toastContainer = document.querySelector('.toast-container');
        if (!toastContainer) {
            toastContainer = document.createElement('div');
            toastContainer.className = 'toast-container position-fixed bottom-0 end-0 p-3';
            document.body.appendChild(toastContainer);
        }

        const bgClass = tipo === 'success' ? 'bg-success' :
                       tipo === 'warning' ? 'bg-warning' :
                       tipo === 'danger' ? 'bg-danger' : 'bg-info';
        const textClass = tipo === 'warning' ? 'text-dark' : 'text-white';

        const toast = document.createElement('div');
        toast.className = `toast align-items-center ${bgClass} ${textClass} border-0`;
        toast.innerHTML = `
            <div class="d-flex">
                <div class="toast-body">${mensaje}</div>
                <button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast"></button>
            </div>
        `;

        toastContainer.appendChild(toast);
        const bsToast = new bootstrap.Toast(toast);
        bsToast.show();

        toast.addEventListener('hidden.bs.toast', () => toast.remove());
    }
};

// Inicializar cuando el DOM este listo
document.addEventListener('DOMContentLoaded', () => {
    AdminModule.init();
});

// Exportar para uso global
if (typeof window !== 'undefined') {
    window.AdminModule = AdminModule;
}
