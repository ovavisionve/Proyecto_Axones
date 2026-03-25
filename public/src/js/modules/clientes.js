/**
 * MODULO CLIENTES - Sistema Axones
 * CRUD completo de clientes - 100% Supabase (sin localStorage)
 */

const ClientesModule = {
    clientes: [],
    _realtimeChannel: null,

    init: async function() {
        // Verificar auth
        if (typeof Auth !== 'undefined') {
            Auth.checkSession();
            Auth.applyRolePermissions();
            const user = Auth.getUser();
            if (user) {
                const userInfo = document.getElementById('userInfo');
                if (userInfo) userInfo.textContent = user.nombre || user.id;
            }
        }

        // Inicializar Supabase
        try {
            await AxonesDB.init();
            console.log('[Clientes] AxonesDB.init() completado, isReady:', AxonesDB.isReady());
        } catch (e) {
            console.error('[Clientes] Error en AxonesDB.init():', e);
        }

        if (!AxonesDB.isReady()) {
            this._toast('Error: No se pudo conectar a Supabase. Verifique su conexion.', 'danger');
            console.error('[Clientes] AxonesDB NO esta ready despues de init');
            const statusDB = document.getElementById('statusDB');
            if (statusDB) {
                statusDB.innerHTML = '<i class="bi bi-circle-fill me-1" style="font-size:0.5rem;"></i> Sin conexion';
                statusDB.className = 'badge bg-danger';
            }
            return;
        }

        // Cargar clientes desde Supabase
        await this.cargar();

        // Busqueda
        const buscar = document.getElementById('buscarCliente');
        if (buscar) {
            buscar.addEventListener('input', () => this.filtrar(buscar.value));
        }

        // Suscribirse a cambios en tiempo real
        this._realtimeChannel = AxonesDB.realtime.suscribir('clientes', (payload) => {
            console.log('Clientes: cambio en tiempo real', payload.eventType);
            this.cargar();
            this._mostrarNotificacion(payload);
        });

        // Status DB
        const statusDB = document.getElementById('statusDB');
        if (statusDB) {
            statusDB.innerHTML = '<i class="bi bi-circle-fill me-1" style="font-size:0.5rem;"></i> Supabase Conectado';
            statusDB.className = 'badge bg-success';
        }

        // Presencia
        AxonesDB.presencia.conectar('clientes');
        AxonesDB.presenciaWidget.render();
    },

    /**
     * Cargar clientes desde Supabase
     */
    cargar: async function() {
        console.log('[Clientes] cargar() - AxonesDB.isReady():', AxonesDB.isReady());
        try {
            this.clientes = await AxonesDB.clientes.listar({
                ordenar: 'nombre',
                ascendente: true,
                soloActivos: false
            });
            console.log('[Clientes] Cargados desde Supabase:', this.clientes.length, 'clientes');
        } catch (error) {
            console.error('[Clientes] Error cargando:', error);
            this.clientes = [];
            this._toast('Error cargando clientes: ' + error.message, 'danger');
        }

        this.renderTabla(this.clientes);
        this.actualizarStats();
    },

    /**
     * Renderizar tabla de clientes
     */
    renderTabla: function(lista) {
        const tbody = document.getElementById('tablaClientes');
        if (!tbody) return;

        if (lista.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="7" class="text-center py-4 text-muted">
                        <i class="bi bi-people me-2"></i>No hay clientes registrados.
                        <br><button class="btn btn-sm btn-primary mt-2" onclick="ClientesModule.mostrarModal()">
                            <i class="bi bi-plus-lg me-1"></i> Agregar primer cliente
                        </button>
                    </td>
                </tr>`;
            return;
        }

        tbody.innerHTML = lista.map(c => {
            const activo = c.activo !== false;
            return `
            <tr class="${activo ? '' : 'table-secondary'}">
                <td>
                    <div class="fw-bold">${this._escape(c.nombre)}</div>
                    ${c.direccion ? `<small class="text-muted">${this._escape(c.direccion)}</small>` : ''}
                </td>
                <td>${c.rif || '-'}</td>
                <td>${c.telefono || '-'}</td>
                <td>${c.email || '-'}</td>
                <td>
                    ${c.contacto_nombre || '-'}
                    ${c.contacto_telefono ? `<br><small class="text-muted">${c.contacto_telefono}</small>` : ''}
                </td>
                <td class="text-center">
                    <span class="badge ${activo ? 'bg-success' : 'bg-secondary'}">
                        ${activo ? 'Activo' : 'Inactivo'}
                    </span>
                </td>
                <td class="text-center">
                    <div class="btn-group btn-group-sm">
                        <button class="btn btn-outline-primary" onclick="ClientesModule.editar('${c.id}')" title="Editar">
                            <i class="bi bi-pencil"></i>
                        </button>
                        <button class="btn btn-outline-${activo ? 'danger' : 'success'}"
                                onclick="ClientesModule.toggleActivo('${c.id}', ${!activo})"
                                title="${activo ? 'Desactivar' : 'Activar'}">
                            <i class="bi bi-${activo ? 'x-circle' : 'check-circle'}"></i>
                        </button>
                    </div>
                </td>
            </tr>`;
        }).join('');
    },

    /**
     * Filtrar clientes por texto
     */
    filtrar: function(texto) {
        if (!texto) {
            this.renderTabla(this.clientes);
            return;
        }
        const t = texto.toLowerCase();
        const filtrados = this.clientes.filter(c =>
            (c.nombre || '').toLowerCase().includes(t) ||
            (c.rif || '').toLowerCase().includes(t) ||
            (c.email || '').toLowerCase().includes(t) ||
            (c.telefono || '').includes(t) ||
            (c.contacto_nombre || '').toLowerCase().includes(t)
        );
        this.renderTabla(filtrados);
    },

    /**
     * Mostrar modal para crear/editar
     */
    mostrarModal: function(datos = null) {
        const titulo = document.getElementById('modalClienteTitulo');
        if (datos) {
            titulo.innerHTML = '<i class="bi bi-pencil me-2"></i>Editar Cliente';
            document.getElementById('clienteId').value = datos.id;
            document.getElementById('clienteNombre').value = datos.nombre || '';
            document.getElementById('clienteRif').value = datos.rif || '';
            document.getElementById('clienteDireccion').value = datos.direccion || '';
            document.getElementById('clienteTelefono').value = datos.telefono || '';
            document.getElementById('clienteEmail').value = datos.email || '';
            document.getElementById('clienteContactoNombre').value = datos.contacto_nombre || '';
            document.getElementById('clienteContactoTelefono').value = datos.contacto_telefono || '';
            document.getElementById('clienteNotas').value = datos.notas || '';
        } else {
            titulo.innerHTML = '<i class="bi bi-person-plus me-2"></i>Nuevo Cliente';
            document.getElementById('formCliente').reset();
            document.getElementById('clienteId').value = '';
        }

        const modal = new bootstrap.Modal(document.getElementById('modalCliente'));
        modal.show();
    },

    /**
     * Editar un cliente existente
     */
    editar: function(id) {
        const cliente = this.clientes.find(c => c.id === id);
        if (cliente) this.mostrarModal(cliente);
    },

    /**
     * Guardar cliente (crear o actualizar) - directo a Supabase
     */
    guardar: async function() {
        const nombre = document.getElementById('clienteNombre').value.trim();
        if (!nombre) {
            alert('El nombre es obligatorio');
            return;
        }

        const datos = {
            nombre: nombre,
            rif: document.getElementById('clienteRif').value.trim(),
            direccion: document.getElementById('clienteDireccion').value.trim(),
            telefono: document.getElementById('clienteTelefono').value.trim(),
            email: document.getElementById('clienteEmail').value.trim(),
            contacto_nombre: document.getElementById('clienteContactoNombre').value.trim(),
            contacto_telefono: document.getElementById('clienteContactoTelefono').value.trim(),
            notas: document.getElementById('clienteNotas').value.trim()
        };

        const id = document.getElementById('clienteId').value;

        try {
            if (id) {
                await AxonesDB.clientes.actualizar(id, datos);
            } else {
                await AxonesDB.clientes.crear(datos);
            }

            // Cerrar modal y recargar desde Supabase
            bootstrap.Modal.getInstance(document.getElementById('modalCliente')).hide();
            await this.cargar();

            this._toast(id ? 'Cliente actualizado' : 'Cliente creado exitosamente', 'success');
        } catch (error) {
            console.error('Error guardando cliente:', error);
            this._toast('Error al guardar: ' + error.message, 'danger');
        }
    },

    /**
     * Activar/desactivar cliente
     */
    toggleActivo: async function(id, nuevoEstado) {
        try {
            await AxonesDB.clientes.actualizar(id, { activo: nuevoEstado });
            await this.cargar();
            this._toast(`Cliente ${nuevoEstado ? 'activado' : 'desactivado'}`, 'info');
        } catch (error) {
            this._toast('Error: ' + error.message, 'danger');
        }
    },

    /**
     * Actualizar estadisticas
     */
    actualizarStats: function() {
        const total = this.clientes.length;
        const activos = this.clientes.filter(c => c.activo !== false).length;

        const el1 = document.getElementById('totalClientes');
        const el2 = document.getElementById('clientesActivos');
        if (el1) el1.textContent = total;
        if (el2) el2.textContent = activos;
    },

    /**
     * Mostrar notificacion de cambio en tiempo real
     */
    _mostrarNotificacion: function(payload) {
        const tipo = payload.eventType;
        const nombre = payload.new?.nombre || payload.old?.nombre || '';
        let msg = '';
        if (tipo === 'INSERT') msg = `Nuevo cliente: ${nombre}`;
        else if (tipo === 'UPDATE') msg = `Cliente actualizado: ${nombre}`;
        else if (tipo === 'DELETE') msg = `Cliente eliminado: ${nombre}`;
        if (msg) this._toast(msg, 'info');
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
            </div>
        `);
        const toast = new bootstrap.Toast(document.getElementById(id), { delay: 3000 });
        toast.show();
    }
};

// Inicializar
document.addEventListener('DOMContentLoaded', () => ClientesModule.init());
