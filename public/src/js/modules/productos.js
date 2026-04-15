/**
 * Modulo Productos - Datos Maestros
 * Catalogo de productos terminados de Axones
 * Almacenamiento: sync_store key 'axones_productos'
 */

const ProductosModule = {
    productos: [],
    clientes: [],
    SYNC_KEY: 'axones_productos',

    init: async function() {
        if (typeof AxonesDB !== 'undefined' && !AxonesDB.isReady()) {
            await AxonesDB.init();
        }
        await this.cargar();
        await this.cargarClientes();
        this.render();
        this.setupEvents();
    },

    cargar: async function() {
        try {
            if (typeof AxonesDB !== 'undefined' && AxonesDB.isReady()) {
                const { data } = await AxonesDB.client.from('sync_store')
                    .select('value').eq('key', this.SYNC_KEY).maybeSingle();
                this.productos = data?.value ? JSON.parse(data.value) : [];
            }
            if (this.productos.length === 0) {
                this.productos = JSON.parse(localStorage.getItem(this.SYNC_KEY) || '[]');
            }
        } catch(e) {
            console.warn('Productos: Error cargando:', e);
            this.productos = JSON.parse(localStorage.getItem(this.SYNC_KEY) || '[]');
        }
    },

    cargarClientes: async function() {
        try {
            if (typeof AxonesDB !== 'undefined' && AxonesDB.isReady()) {
                const { data } = await AxonesDB.client.from('clientes').select('nombre, rif').eq('activo', true);
                this.clientes = data || [];
            }
        } catch(e) { console.warn('Productos: Error cargando clientes:', e); }

        // Poblar datalist de clientes
        const dl = document.getElementById('dlClientes');
        if (dl) {
            dl.innerHTML = this.clientes.map(c =>
                `<option value="${c.nombre}${c.rif ? ' (' + c.rif + ')' : ''}">`
            ).join('');
        }
    },

    guardarTodos: async function() {
        const json = JSON.stringify(this.productos);
        localStorage.setItem(this.SYNC_KEY, json);
        try {
            if (typeof AxonesDB !== 'undefined' && AxonesDB.isReady()) {
                await AxonesDB.client.from('sync_store').upsert({
                    key: this.SYNC_KEY,
                    value: json,
                    updated_at: new Date().toISOString()
                }, { onConflict: 'key' });
            }
        } catch(e) { console.error('Productos: Error guardando:', e); }
    },

    setupEvents: function() {
        const buscar = document.getElementById('buscarProducto');
        if (buscar) buscar.addEventListener('input', () => this.render());
    },

    render: function() {
        const tbody = document.getElementById('tablaProductos');
        if (!tbody) return;

        const busq = (document.getElementById('buscarProducto')?.value || '').toLowerCase();
        let filtrados = this.productos;
        if (busq) {
            filtrados = filtrados.filter(p =>
                (p.nombre || '').toLowerCase().includes(busq) ||
                (p.sku || '').toLowerCase().includes(busq) ||
                (p.cliente || '').toLowerCase().includes(busq) ||
                (p.estructura || '').toLowerCase().includes(busq)
            );
        }

        // Stats
        const total = document.getElementById('totalProductos');
        if (total) total.textContent = this.productos.length;
        const activos = document.getElementById('productosActivos');
        if (activos) activos.textContent = this.productos.filter(p => p.activo !== false).length;
        const clientesUnicos = [...new Set(this.productos.map(p => p.cliente).filter(Boolean))];
        const totalCli = document.getElementById('totalClientes');
        if (totalCli) totalCli.textContent = clientesUnicos.length;

        if (filtrados.length === 0) {
            tbody.innerHTML = `<tr><td colspan="8" class="text-center py-4 text-muted">
                ${busq ? 'No se encontraron productos' : 'No hay productos registrados. Haz clic en "Nuevo Producto" para agregar.'}
            </td></tr>`;
            return;
        }

        tbody.innerHTML = filtrados.map(p => {
            const estado = p.activo !== false
                ? '<span class="badge bg-success">Activo</span>'
                : '<span class="badge bg-secondary">Inactivo</span>';
            return `<tr>
                <td><strong>${p.nombre || '-'}</strong></td>
                <td><code>${p.sku || '-'}</code></td>
                <td>${p.cliente || '-'}</td>
                <td><small>${p.estructura || '-'}</small></td>
                <td>${p.tipoImpresion || '-'}</td>
                <td>${p.ancho || '-'}</td>
                <td class="text-center">${estado}</td>
                <td class="text-center">
                    <button class="btn btn-sm btn-outline-primary" onclick="ProductosModule.editar('${p.id}')" title="Editar">
                        <i class="bi bi-pencil"></i>
                    </button>
                    <button class="btn btn-sm btn-outline-danger" onclick="ProductosModule.eliminar('${p.id}')" title="Eliminar">
                        <i class="bi bi-trash"></i>
                    </button>
                </td>
            </tr>`;
        }).join('');
    },

    mostrarModal: function(producto) {
        const titulo = document.getElementById('modalProductoTitulo');
        if (titulo) titulo.innerHTML = producto
            ? '<i class="bi bi-pencil me-2"></i>Editar Producto'
            : '<i class="bi bi-box me-2"></i>Nuevo Producto';

        document.getElementById('productoId').value = producto?.id || '';
        document.getElementById('productoNombre').value = producto?.nombre || '';
        document.getElementById('productoSKU').value = producto?.sku || '';
        document.getElementById('productoCliente').value = producto?.cliente || '';
        document.getElementById('productoEstructura').value = producto?.estructura || '';
        document.getElementById('productoTipoImpresion').value = producto?.tipoImpresion || '';
        document.getElementById('productoAncho').value = producto?.ancho || '';
        document.getElementById('productoDesarrollo').value = producto?.desarrollo || '';
        document.getElementById('productoNumColores').value = producto?.numColores || 0;
        document.getElementById('productoFiguraEmb').value = producto?.figuraEmb || '';
        document.getElementById('productoCodigoBarras').value = producto?.codigoBarras || '';
        document.getElementById('productoNotas').value = producto?.notas || '';

        new bootstrap.Modal(document.getElementById('modalProducto')).show();
    },

    guardar: async function() {
        const nombre = document.getElementById('productoNombre')?.value?.trim();
        if (!nombre) {
            alert('El nombre del producto es obligatorio');
            return;
        }

        const id = document.getElementById('productoId')?.value;
        const datos = {
            id: id || Date.now().toString(36) + Math.random().toString(36).substr(2, 5),
            nombre,
            sku: document.getElementById('productoSKU')?.value?.trim() || '',
            cliente: document.getElementById('productoCliente')?.value?.trim() || '',
            estructura: document.getElementById('productoEstructura')?.value?.trim() || '',
            tipoImpresion: document.getElementById('productoTipoImpresion')?.value || '',
            ancho: parseInt(document.getElementById('productoAncho')?.value) || 0,
            desarrollo: parseFloat(document.getElementById('productoDesarrollo')?.value) || 0,
            numColores: parseInt(document.getElementById('productoNumColores')?.value) || 0,
            figuraEmb: document.getElementById('productoFiguraEmb')?.value?.trim() || '',
            codigoBarras: document.getElementById('productoCodigoBarras')?.value?.trim() || '',
            notas: document.getElementById('productoNotas')?.value?.trim() || '',
            activo: true,
            updated_at: new Date().toISOString(),
        };

        if (id) {
            const idx = this.productos.findIndex(p => p.id === id);
            if (idx >= 0) {
                datos.created_at = this.productos[idx].created_at;
                this.productos[idx] = datos;
            }
        } else {
            datos.created_at = new Date().toISOString();
            this.productos.push(datos);
        }

        await this.guardarTodos();
        this.render();

        bootstrap.Modal.getInstance(document.getElementById('modalProducto'))?.hide();
        if (typeof showToast === 'function') showToast('Producto guardado', 'success');
        else alert('Producto guardado');
    },

    editar: function(id) {
        const producto = this.productos.find(p => p.id === id);
        if (producto) this.mostrarModal(producto);
    },

    eliminar: async function(id) {
        if (!confirm('Desea eliminar este producto?')) return;
        this.productos = this.productos.filter(p => p.id !== id);
        await this.guardarTodos();
        this.render();
        if (typeof showToast === 'function') showToast('Producto eliminado', 'warning');
    },
};

// Auto-init
document.addEventListener('DOMContentLoaded', () => {
    setTimeout(() => ProductosModule.init(), 300);
});
