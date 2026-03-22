/**
 * MODULO CLIENTES - Sistema Axones
 * CRUD completo de clientes con soporte Supabase + localStorage fallback
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

        // Inicializar Supabase si esta configurado
        await AxonesDB.init();

        // Cargar clientes
        await this.cargar();

        // Busqueda
        const buscar = document.getElementById('buscarCliente');
        if (buscar) {
            buscar.addEventListener('input', () => this.filtrar(buscar.value));
        }

        // Suscribirse a cambios en tiempo real
        if (AxonesDB.isReady()) {
            this._realtimeChannel = AxonesDB.realtime.suscribir('clientes', (payload) => {
                console.log('Clientes: cambio en tiempo real', payload.eventType);
                this.cargar(); // Recargar tabla
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
        } else {
            const statusDB = document.getElementById('statusDB');
            if (statusDB) {
                statusDB.innerHTML = '<i class="bi bi-circle-fill me-1" style="font-size:0.5rem;"></i> localStorage';
                statusDB.className = 'badge bg-warning text-dark';
            }
        }
    },

    /**
     * Cargar clientes desde Supabase o localStorage
     */
    cargar: async function() {
        if (AxonesDB.isReady()) {
            this.clientes = await AxonesDB.clientes.listar({
                ordenar: 'nombre',
                ascendente: true,
                soloActivos: false
            });
        } else {
            // Fallback localStorage
            this.clientes = JSON.parse(localStorage.getItem('axones_clientes') || '[]');
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
                    ${c.contacto_nombre || c.contactoNombre || '-'}
                    ${(c.contacto_telefono || c.contactoTelefono) ? `<br><small class="text-muted">${c.contacto_telefono || c.contactoTelefono}</small>` : ''}
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
            (c.contacto_nombre || c.contactoNombre || '').toLowerCase().includes(t)
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
            document.getElementById('clienteContactoNombre').value = datos.contacto_nombre || datos.contactoNombre || '';
            document.getElementById('clienteContactoTelefono').value = datos.contacto_telefono || datos.contactoTelefono || '';
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
     * Guardar cliente (crear o actualizar)
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
            if (AxonesDB.isReady()) {
                if (id) {
                    await AxonesDB.clientes.actualizar(id, datos);
                } else {
                    await AxonesDB.clientes.crear(datos);
                }
            } else {
                // Fallback localStorage
                if (id) {
                    const idx = this.clientes.findIndex(c => c.id === id);
                    if (idx >= 0) this.clientes[idx] = { ...this.clientes[idx], ...datos };
                } else {
                    datos.id = 'CLI_' + Date.now();
                    datos.activo = true;
                    datos.created_at = new Date().toISOString();
                    this.clientes.push(datos);
                }
                localStorage.setItem('axones_clientes', JSON.stringify(this.clientes));
            }

            // Cerrar modal y recargar
            bootstrap.Modal.getInstance(document.getElementById('modalCliente')).hide();
            await this.cargar();

            this._toast(id ? 'Cliente actualizado' : 'Cliente creado', 'success');
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
            if (AxonesDB.isReady()) {
                await AxonesDB.clientes.actualizar(id, { activo: nuevoEstado });
            } else {
                const idx = this.clientes.findIndex(c => c.id === id);
                if (idx >= 0) {
                    this.clientes[idx].activo = nuevoEstado;
                    localStorage.setItem('axones_clientes', JSON.stringify(this.clientes));
                }
            }
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

        // Contar clientes con ordenes
        const ordenes = JSON.parse(localStorage.getItem('axones_ordenes_trabajo') || '[]');
        const clientesConOrdenes = new Set(ordenes.map(o => o.cliente)).size;
        const el3 = document.getElementById('clientesConOrdenes');
        if (el3) el3.textContent = clientesConOrdenes;
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
