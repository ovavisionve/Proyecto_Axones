/**
 * Modulo de Administracion - Sistema Axones
 * Panel de configuracion y gestion del sistema
 * Con integracion API para usuarios y datos de prueba
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

    // Probar conexion usando AxonesAPI
    async probarConexion() {
        const statusEl = document.getElementById('conexionStatus');

        if (typeof AxonesAPI === 'undefined') {
            statusEl.innerHTML = '<span class="text-warning"><i class="bi bi-exclamation-circle me-1"></i>API no disponible</span>';
            return;
        }

        statusEl.innerHTML = '<span class="text-muted"><i class="bi bi-arrow-repeat spin me-1"></i>Probando...</span>';

        try {
            const result = await AxonesAPI.ping();
            if (result.success) {
                statusEl.innerHTML = '<span class="text-success"><i class="bi bi-check-circle me-1"></i>Conexion exitosa</span>';
            } else {
                throw new Error(result.error || 'Error en respuesta');
            }
        } catch (error) {
            statusEl.innerHTML = `<span class="text-danger"><i class="bi bi-x-circle me-1"></i>Error: ${error.message}</span>`;
        }
    },

    // Cargar usuarios desde API y localStorage
    async cargarUsuarios() {
        const tbody = document.getElementById('tablaUsuarios');
        if (!tbody) return;

        let usuarios = [];

        // Intentar cargar desde API
        try {
            if (typeof AxonesAPI !== 'undefined') {
                const response = await AxonesAPI.getUsuarios();
                if (response.success && response.data && response.data.length > 0) {
                    usuarios = response.data.map(u => ({
                        id: u.id,
                        nombre: u.nombre,
                        usuario: u.usuario || u.email || '',
                        rol: u.rol,
                        activo: u.activo !== false && u.activo !== 'false'
                    }));
                    console.log('Usuarios cargados desde API:', usuarios.length);
                }
            }
        } catch (e) {
            console.warn('Error cargando usuarios de API:', e);
        }

        // Fallback a localStorage
        if (usuarios.length === 0) {
            usuarios = JSON.parse(localStorage.getItem('axones_usuarios') || '[]');
        }

        if (usuarios.length === 0) {
            // Cargar los 22 usuarios reales de Axones + admin del sistema
            usuarios = [
                // Gerencia
                { id: 1, nombre: 'ROBERT PARRA', usuario: 'rparra', rol: 'jefe_operaciones', area: 'Gerencia', cargo: 'Gerente General', activo: true },
                // Produccion
                { id: 2, nombre: 'ALEXIS JAURE', usuario: 'ajaure', rol: 'jefe_operaciones', area: 'Produccion', cargo: 'Gerente de Operaciones', activo: true },
                { id: 3, nombre: 'ANGEL ANARE', usuario: 'aanare', rol: 'planificador', area: 'Produccion', cargo: 'Planificador', activo: true },
                { id: 4, nombre: 'ROXANA GUAPE', usuario: 'rguape', rol: 'supervisor', area: 'Produccion', cargo: 'Supervisora de Calidad', activo: true },
                { id: 5, nombre: 'HENRY ARZOLA', usuario: 'harzola', rol: 'supervisor', area: 'Produccion', cargo: 'Supervisor de Produccion', activo: true },
                // Almacen
                { id: 6, nombre: 'LEONARDO GONZALEZ', usuario: 'lgonzalez', rol: 'jefe_almacen', area: 'Almacen', cargo: 'Almacenista', activo: true },
                // Impresion
                { id: 7, nombre: 'GONZALO MUJICA', usuario: 'gmujica', rol: 'operador', area: 'Impresion', cargo: 'Operador de Impresion', activo: true },
                { id: 8, nombre: 'NELSON CAMACARO', usuario: 'ncamacaro', rol: 'operador', area: 'Impresion', cargo: 'Operador de Impresion', activo: true },
                { id: 9, nombre: 'STIVEN COBOS', usuario: 'scobos', rol: 'operador', area: 'Impresion', cargo: 'Operador de Impresion', activo: true },
                { id: 10, nombre: 'NESTOR NINO', usuario: 'nnino', rol: 'operador', area: 'Impresion', cargo: 'Operador de Impresion', activo: true },
                { id: 11, nombre: 'MIGUEL NIEVES', usuario: 'mnieves', rol: 'operador', area: 'Impresion', cargo: 'Operador de Impresion', activo: true },
                // Laminacion
                { id: 12, nombre: 'JACSON COLMENARES', usuario: 'jcolmenares', rol: 'operador', area: 'Laminacion', cargo: 'Operador de Laminacion', activo: true },
                { id: 13, nombre: 'ANGEL RODRIGUEZ', usuario: 'arodriguez', rol: 'operador', area: 'Laminacion', cargo: 'Operador de Laminacion', activo: true },
                { id: 14, nombre: 'YSAIAS ARANGUREN', usuario: 'yaranguren', rol: 'operador', area: 'Laminacion', cargo: 'Operador de Laminacion', activo: true },
                // Corte
                { id: 15, nombre: 'JUAN GUZMAN', usuario: 'jguzman', rol: 'operador', area: 'Corte', cargo: 'Operador de Corte', activo: true },
                { id: 16, nombre: 'ALIS PINERO', usuario: 'apinero', rol: 'operador', area: 'Corte', cargo: 'Operador de Corte', activo: true },
                { id: 17, nombre: 'IAN MONROY', usuario: 'imonroy', rol: 'operador', area: 'Corte', cargo: 'Operador de Corte', activo: true },
                { id: 18, nombre: 'FERNANDO ABARCA', usuario: 'fabarca', rol: 'operador', area: 'Corte', cargo: 'Operador de Corte', activo: true },
                { id: 19, nombre: 'RAMIRO PENA', usuario: 'rpena', rol: 'operador', area: 'Corte', cargo: 'Operador de Corte', activo: true },
                { id: 20, nombre: 'EFREN MARQUEZ', usuario: 'emarquez', rol: 'operador', area: 'Corte', cargo: 'Operador de Corte', activo: true },
                { id: 21, nombre: 'JESUS MARTINEZ', usuario: 'jmartinez', rol: 'operador', area: 'Corte', cargo: 'Operador de Corte', activo: true },
                // Colorista
                { id: 22, nombre: 'ASDRUBAL LAYA', usuario: 'alaya', rol: 'colorista', area: 'Produccion', cargo: 'Colorista', activo: true },
                // Admin del sistema
                { id: 99, nombre: 'Administrador', usuario: 'admin', rol: 'administrador', area: 'Administracion', cargo: 'Administrador del Sistema', activo: true },
            ];
            localStorage.setItem('axones_usuarios', JSON.stringify(usuarios));
        }

        // Contador de usuarios
        const totalUsuarios = usuarios.length;
        const activos = usuarios.filter(u => u.activo).length;
        const headerInfo = document.querySelector('.card-header .badge');
        if (headerInfo) {
            headerInfo.textContent = `${activos}/${totalUsuarios}`;
        }

        tbody.innerHTML = usuarios.map(u => {
            const rolBadge = this.getRolBadge(u.rol);
            const estadoBadge = u.activo
                ? '<span class="badge bg-success">Activo</span>'
                : '<span class="badge bg-secondary">Inactivo</span>';

            return `
                <tr>
                    <td>
                        <strong>${u.nombre}</strong>
                        ${u.cargo ? '<br><small class="text-muted">' + u.cargo + '</small>' : ''}
                    </td>
                    <td>${u.usuario || '-'}</td>
                    <td>${rolBadge}</td>
                    <td>
                        <small class="text-muted">${u.area || '-'}</small>
                    </td>
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
            'jefe_operaciones': '<span class="badge bg-info">Jefe Operaciones</span>',
            'supervisor': '<span class="badge bg-warning text-dark">Supervisor</span>',
            'planificador': '<span class="badge bg-primary">Planificador</span>',
            'jefe_almacen': '<span class="badge bg-success">Jefe Almacen</span>',
            'colorista': '<span class="badge bg-purple" style="background:#9c27b0!important">Colorista</span>',
            'operador': '<span class="badge bg-secondary">Operador</span>',
        };
        return roles[rol] || '<span class="badge bg-light text-dark">' + (rol || 'Desconocido') + '</span>';
    },

    // Mostrar modal de usuario
    mostrarModalUsuario() {
        document.getElementById('usuarioNombre').value = '';
        document.getElementById('usuarioUsername').value = '';
        document.getElementById('usuarioPassword').value = '';
        const emailField = document.getElementById('usuarioEmail');
        if (emailField) emailField.value = '';
        document.getElementById('usuarioRol').value = 'operador';

        const modal = new bootstrap.Modal(document.getElementById('modalUsuario'));
        modal.show();
    },

    // Guardar usuario (API + localStorage)
    async guardarUsuario() {
        const nombre = document.getElementById('usuarioNombre')?.value?.trim();
        const usuario = document.getElementById('usuarioUsername')?.value?.trim();
        const password = document.getElementById('usuarioPassword')?.value?.trim();
        const email = document.getElementById('usuarioEmail')?.value?.trim() || '';
        const rol = document.getElementById('usuarioRol')?.value;

        if (!nombre || !usuario || !password) {
            this.mostrarNotificacion('Complete todos los campos obligatorios (Nombre, Usuario, Password)', 'warning');
            return;
        }

        if (usuario.length < 3) {
            this.mostrarNotificacion('El nombre de usuario debe tener al menos 3 caracteres', 'warning');
            return;
        }

        if (password.length < 3) {
            this.mostrarNotificacion('La contraseña debe tener al menos 3 caracteres', 'warning');
            return;
        }

        const usuarios = JSON.parse(localStorage.getItem('axones_usuarios') || '[]');

        // Verificar usuario duplicado
        if (usuarios.some(u => u.usuario === usuario)) {
            this.mostrarNotificacion('El nombre de usuario ya esta registrado', 'warning');
            return;
        }

        const nuevoUsuario = {
            id: Date.now(),
            nombre: nombre,
            usuario: usuario,
            password: password,
            email: email,
            rol: rol,
            activo: true
        };

        // Guardar en API
        try {
            if (typeof AxonesAPI !== 'undefined') {
                const result = await AxonesAPI.createUsuario({
                    nombre: nombre,
                    usuario: usuario,
                    password: password,
                    email: email,
                    rol: rol
                });
                if (result.success) {
                    this.mostrarNotificacion('Usuario guardado en Google Sheets', 'success');
                }
            }
        } catch (e) {
            console.warn('Error guardando usuario en API:', e);
        }

        // Guardar en localStorage
        usuarios.push(nuevoUsuario);
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

    // Actualizar estadisticas (from API + localStorage)
    async actualizarEstadisticas() {
        let prodCount = 0;
        let invCount = 0;
        let alertCount = 0;
        let tintaCount = 0;

        // Try API first
        try {
            if (typeof AxonesAPI !== 'undefined') {
                const [prodResp, invResp, alertResp, tintaResp] = await Promise.allSettled([
                    AxonesAPI.getProduccion({}),
                    AxonesAPI.getInventario({}),
                    AxonesAPI.getAlertas({}),
                    AxonesAPI.getConsumoTintas({})
                ]);
                if (prodResp.status === 'fulfilled' && prodResp.value.success) prodCount = prodResp.value.data?.length || 0;
                if (invResp.status === 'fulfilled' && invResp.value.success) invCount = invResp.value.data?.length || 0;
                if (alertResp.status === 'fulfilled' && alertResp.value.success) alertCount = alertResp.value.data?.length || 0;
                if (tintaResp.status === 'fulfilled' && tintaResp.value.success) tintaCount = tintaResp.value.data?.length || 0;
            }
        } catch (e) {
            // Fallback below
        }

        // Fallback to localStorage counts
        if (prodCount === 0) prodCount = JSON.parse(localStorage.getItem('axones_produccion') || '[]').length;
        if (invCount === 0) invCount = JSON.parse(localStorage.getItem('axones_inventario') || '[]').length;
        if (alertCount === 0) alertCount = JSON.parse(localStorage.getItem('axones_alertas') || '[]').length;
        if (tintaCount === 0) tintaCount = JSON.parse(localStorage.getItem('axones_tintas') || '[]').length;

        const statProduccion = document.getElementById('statProduccion');
        const statInventario = document.getElementById('statInventario');
        const statAlertas = document.getElementById('statAlertas');
        const statTintas = document.getElementById('statTintas');

        if (statProduccion) statProduccion.textContent = prodCount;
        if (statInventario) statInventario.textContent = invCount;
        if (statAlertas) statAlertas.textContent = alertCount;
        if (statTintas) statTintas.textContent = tintaCount;
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
            this.mostrarNotificacion('Datos de prueba generados y sincronizando con Google Sheets...', 'success');
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
