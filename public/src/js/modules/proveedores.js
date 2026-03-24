/**
 * MODULO PROVEEDORES - Sistema Axones
 * CRUD completo de proveedores - 100% Supabase (sin localStorage)
 */

const ProveedoresModule = {
    proveedores: [],

    init: async function() {
        if (typeof Auth !== 'undefined') {
            Auth.checkSession();
            Auth.applyRolePermissions();
            const user = Auth.getUser();
            if (user) {
                const userInfo = document.getElementById('userInfo');
                if (userInfo) userInfo.textContent = user.nombre || user.id;
            }
        }

        await AxonesDB.init();

        if (!AxonesDB.isReady()) {
            this._toast('Error: No se pudo conectar a Supabase. Verifique su conexion.', 'danger');
            return;
        }

        await this.cargar();

        // Busqueda
        const buscar = document.getElementById('buscarProveedor');
        if (buscar) buscar.addEventListener('input', () => this.aplicarFiltros());

        // Filtro por tipo
        const filtroTipo = document.getElementById('filtroTipo');
        if (filtroTipo) filtroTipo.addEventListener('change', () => this.aplicarFiltros());

        // Real-time
        AxonesDB.realtime.suscribir('proveedores', () => this.cargar());
        AxonesDB.presencia.conectar('proveedores');
        AxonesDB.presenciaWidget.render();
    },

    cargar: async function() {
        try {
            this.proveedores = await AxonesDB.proveedores.listar({
                ordenar: 'nombre',
                ascendente: true,
                soloActivos: false
            });
        } catch (error) {
            console.error('Error cargando proveedores:', error);
            this.proveedores = [];
            this._toast('Error cargando proveedores: ' + error.message, 'danger');
        }
        this.renderTabla(this.proveedores);
    },

    renderTabla: function(lista) {
        const tbody = document.getElementById('tablaProveedores');
        if (!tbody) return;

        if (lista.length === 0) {
            tbody.innerHTML = `
                <tr><td colspan="8" class="text-center py-4 text-muted">
                    <i class="bi bi-truck me-2"></i>No hay proveedores registrados.
                    <br><button class="btn btn-sm btn-warning mt-2" onclick="ProveedoresModule.mostrarModal()">
                        <i class="bi bi-plus-lg me-1"></i> Agregar proveedor
                    </button>
                </td></tr>`;
            return;
        }

        tbody.innerHTML = lista.map(p => {
            const activo = p.activo !== false;
            const tipoBadge = `tipo-badge-${p.tipo || 'otros'}`;
            return `
            <tr class="${activo ? '' : 'table-secondary'}">
                <td class="fw-bold">${this._escape(p.nombre)}</td>
                <td>${p.rif || '-'}</td>
                <td><span class="badge ${tipoBadge}">${(p.tipo || 'otros').charAt(0).toUpperCase() + (p.tipo || 'otros').slice(1)}</span></td>
                <td>${p.telefono || '-'}</td>
                <td>${p.email || '-'}</td>
                <td>${p.contacto_nombre || '-'}</td>
                <td class="text-center">
                    <span class="badge ${activo ? 'bg-success' : 'bg-secondary'}">${activo ? 'Activo' : 'Inactivo'}</span>
                </td>
                <td class="text-center">
                    <div class="btn-group btn-group-sm">
                        <button class="btn btn-outline-primary" onclick="ProveedoresModule.editar('${p.id}')"><i class="bi bi-pencil"></i></button>
                        <button class="btn btn-outline-${activo ? 'danger' : 'success'}"
                                onclick="ProveedoresModule.toggleActivo('${p.id}', ${!activo})">
                            <i class="bi bi-${activo ? 'x-circle' : 'check-circle'}"></i>
                        </button>
                    </div>
                </td>
            </tr>`;
        }).join('');
    },

    aplicarFiltros: function() {
        const texto = (document.getElementById('buscarProveedor')?.value || '').toLowerCase();
        const tipo = document.getElementById('filtroTipo')?.value || '';

        let filtrados = this.proveedores;

        if (tipo) {
            filtrados = filtrados.filter(p => p.tipo === tipo);
        }

        if (texto) {
            filtrados = filtrados.filter(p =>
                (p.nombre || '').toLowerCase().includes(texto) ||
                (p.rif || '').toLowerCase().includes(texto) ||
                (p.contacto_nombre || '').toLowerCase().includes(texto)
            );
        }

        this.renderTabla(filtrados);
    },

    mostrarModal: function(datos = null) {
        const titulo = document.getElementById('modalProveedorTitulo');
        if (datos) {
            titulo.innerHTML = '<i class="bi bi-pencil me-2"></i>Editar Proveedor';
            document.getElementById('proveedorId').value = datos.id;
            document.getElementById('proveedorNombre').value = datos.nombre || '';
            document.getElementById('proveedorRif').value = datos.rif || '';
            document.getElementById('proveedorTipo').value = datos.tipo || '';
            document.getElementById('proveedorDireccion').value = datos.direccion || '';
            document.getElementById('proveedorTelefono').value = datos.telefono || '';
            document.getElementById('proveedorEmail').value = datos.email || '';
            document.getElementById('proveedorContacto').value = datos.contacto_nombre || '';
            document.getElementById('proveedorNotas').value = datos.notas || '';
        } else {
            titulo.innerHTML = '<i class="bi bi-truck me-2"></i>Nuevo Proveedor';
            document.getElementById('formProveedor').reset();
            document.getElementById('proveedorId').value = '';
        }
        new bootstrap.Modal(document.getElementById('modalProveedor')).show();
    },

    editar: function(id) {
        const prov = this.proveedores.find(p => p.id === id);
        if (prov) this.mostrarModal(prov);
    },

    /**
     * Guardar proveedor - directo a Supabase
     */
    guardar: async function() {
        const nombre = document.getElementById('proveedorNombre').value.trim();
        const tipo = document.getElementById('proveedorTipo').value;
        if (!nombre) { alert('El nombre es obligatorio'); return; }
        if (!tipo) { alert('Seleccione un tipo'); return; }

        const datos = {
            nombre,
            rif: document.getElementById('proveedorRif').value.trim(),
            tipo,
            direccion: document.getElementById('proveedorDireccion').value.trim(),
            telefono: document.getElementById('proveedorTelefono').value.trim(),
            email: document.getElementById('proveedorEmail').value.trim(),
            contacto_nombre: document.getElementById('proveedorContacto').value.trim(),
            notas: document.getElementById('proveedorNotas').value.trim()
        };

        const id = document.getElementById('proveedorId').value;

        try {
            if (id) {
                await AxonesDB.proveedores.actualizar(id, datos);
            } else {
                await AxonesDB.proveedores.crear(datos);
            }

            bootstrap.Modal.getInstance(document.getElementById('modalProveedor')).hide();
            await this.cargar();
            this._toast(id ? 'Proveedor actualizado' : 'Proveedor creado exitosamente', 'success');
        } catch (error) {
            this._toast('Error: ' + error.message, 'danger');
        }
    },

    toggleActivo: async function(id, nuevoEstado) {
        try {
            await AxonesDB.proveedores.actualizar(id, { activo: nuevoEstado });
            await this.cargar();
            this._toast(`Proveedor ${nuevoEstado ? 'activado' : 'desactivado'}`, 'info');
        } catch (error) {
            this._toast('Error: ' + error.message, 'danger');
        }
    },

    _escape: function(str) {
        if (!str) return '';
        const div = document.createElement('div');
        div.textContent = str;
        return div.innerHTML;
    },

    _toast: function(mensaje, tipo = 'info') {
        let container = document.querySelector('.toast-container');
        if (!container) {
            container = document.createElement('div');
            container.className = 'toast-container position-fixed bottom-0 end-0 p-3';
            container.style.zIndex = '1060';
            document.body.appendChild(container);
        }
        const id = 'toast_' + Date.now();
        const bgClass = tipo === 'success' ? 'bg-success' : tipo === 'danger' ? 'bg-danger' : 'bg-info';
        container.insertAdjacentHTML('beforeend', `
            <div id="${id}" class="toast align-items-center text-white ${bgClass} border-0" role="alert">
                <div class="d-flex">
                    <div class="toast-body">${mensaje}</div>
                    <button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast"></button>
                </div>
            </div>`);
        new bootstrap.Toast(document.getElementById(id), { delay: 3000 }).show();
    }
};

document.addEventListener('DOMContentLoaded', () => ProveedoresModule.init());
