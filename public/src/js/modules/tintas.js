/**
 * Modulo Tintas y Solventes - Sistema Axones
 * Fase 2A: Tab Consumo por OT
 */

const Tintas = {
    // =========================================================
    // INICIALIZACION
    // =========================================================
    init: function() {
        console.log('Inicializando modulo Tintas y Solventes');
        this.initConsumo();
        this.initInventario();
        this.initCementerio();
        this.initMezclas();
    },

    // =========================================================
    // TAB 1: CONSUMO POR OT
    // =========================================================
    initConsumo: function() {
        this.renderGridLaminacion();
        this.renderGridSuperficie();
        this.renderGridRestante();
        this.setDefaultDate();
        this.cargarOTs();
        this.setupConsumoEvents();
    },

    setDefaultDate: function() {
        const el = document.getElementById('consumoFecha');
        if (el) el.value = new Date().toISOString().split('T')[0];
    },

    /** Carga OTs desde localStorage al select */
    cargarOTs: function() {
        const select = document.getElementById('consumoOT');
        if (!select) return;

        const ordenes = JSON.parse(localStorage.getItem('axones_ordenes_trabajo') || '[]');
        select.innerHTML = '<option value="">Seleccionar OT...</option>';

        ordenes.forEach(ot => {
            const nombre = ot.nombreOT || ot.id || '';
            const cliente = ot.cliente || '';
            const opt = document.createElement('option');
            opt.value = nombre;
            opt.textContent = nombre + (cliente ? ' - ' + cliente : '');
            opt.dataset.ot = JSON.stringify(ot);
            select.appendChild(opt);
        });
    },

    /** Pre-llena campos al seleccionar OT */
    precargarOT: function(otJson) {
        if (!otJson) return;
        try {
            const ot = JSON.parse(otJson);
            const set = (id, val) => { const el = document.getElementById(id); if (el) el.value = val || ''; };
            set('consumoCliente', ot.cliente);
            set('consumoProducto', ot.producto || ot.nombreProducto);
            set('consumoKg', ot.pedidoKg || ot.kgPedidos);
        } catch(e) { console.error('Error precargando OT:', e); }
    },

    /** Genera grid de tintas de laminacion desde CONFIG */
    renderGridLaminacion: function() {
        const container = document.getElementById('gridLaminacion');
        if (!container) return;

        const tintas = (typeof CONFIG !== 'undefined' && CONFIG.TINTAS_LAMINACION) || [];
        const colorMap = {
            'BLANCO': '#f0f0f0', 'NEGRO': '#333', 'AMARILLO': '#FFD700', 'AMARILLO PROCESO': '#FFD700',
            'CYAN': '#00CED1', 'MAGENTA': '#FF00FF', 'ROJO': '#FF0000', 'AZUL': '#0000FF',
            'NARANJA': '#FF8C00', 'VERDE': '#228B22', 'VIOLETA': '#8B00FF', 'DORADO': '#DAA520',
            'EXTENDER': '#ccc', 'BARNIZ': '#E8D5B7', 'COMP. CERA': '#F5F5DC'
        };

        let html = '<div class="row g-1">';
        tintas.forEach(t => {
            const color = Object.keys(colorMap).find(k => t.nombre.includes(k));
            const hex = color ? colorMap[color] : '#999';
            const textColor = ['BLANCO', 'EXTENDER', 'AMARILLO', 'AMARILLO PROCESO', 'DORADO'].some(c => t.nombre.includes(c)) ? '#333' : '#fff';

            html += `
                <div class="col-4 col-md-3 col-lg-2 mb-1">
                    <label class="tinta-label">
                        <span class="color-dot" style="background:${hex};border:1px solid #ccc;"></span>
                        ${t.nombre}
                    </label>
                    <input type="number" class="form-control form-control-sm tinta-input tinta-lam"
                        id="lam_${t.id}" data-tinta="${t.id}" step="0.01" min="0" value="0">
                </div>`;
        });
        html += `
            <div class="col-12 mt-2">
                <div class="alert alert-light py-2 mb-0 d-flex justify-content-between">
                    <span><strong>Total Laminacion:</strong></span>
                    <span><strong id="totalLaminacion">0.00</strong> Kg</span>
                </div>
            </div>
        </div>`;
        container.innerHTML = html;
    },

    /** Genera grid de tintas de superficie desde CONFIG */
    renderGridSuperficie: function() {
        const container = document.getElementById('gridSuperficie');
        if (!container) return;

        const tintas = (typeof CONFIG !== 'undefined' && CONFIG.TINTAS_SUPERFICIE) || [];
        const colorMap = {
            'BLANCO': '#f0f0f0', 'NEGRO': '#333', 'AMARILLO': '#FFD700',
            'CYAN': '#00CED1', 'MAGENTA': '#FF00FF', 'ROJO': '#FF0000', 'AZUL': '#0000FF',
            'NARANJA': '#FF8C00', 'VERDE': '#228B22', 'DORADO': '#DAA520', 'BARNIZ': '#E8D5B7'
        };

        let html = '<div class="row g-1">';
        tintas.forEach(t => {
            const color = Object.keys(colorMap).find(k => t.nombre.includes(k));
            const hex = color ? colorMap[color] : '#999';

            html += `
                <div class="col-4 col-md-3 col-lg-2 mb-1">
                    <label class="tinta-label">
                        <span class="color-dot" style="background:${hex};border:1px solid #ccc;"></span>
                        ${t.nombre}
                    </label>
                    <input type="number" class="form-control form-control-sm tinta-input tinta-sup"
                        id="sup_${t.id}" data-tinta="${t.id}" step="0.01" min="0" value="0">
                </div>`;
        });
        html += `
            <div class="col-12 mt-2">
                <div class="alert alert-light py-2 mb-0 d-flex justify-content-between">
                    <span><strong>Total Superficie:</strong></span>
                    <span><strong id="totalSuperficie">0.00</strong> Kg</span>
                </div>
            </div>
        </div>`;
        container.innerHTML = html;
    },

    /** Genera grid de restante de tintas */
    renderGridRestante: function() {
        const container = document.getElementById('gridRestante');
        if (!container) return;

        const allTintas = [
            ...(typeof CONFIG !== 'undefined' && CONFIG.TINTAS_LAMINACION || []),
            ...(typeof CONFIG !== 'undefined' && CONFIG.TINTAS_SUPERFICIE || [])
        ];

        let html = '<div class="row g-1">';
        allTintas.forEach(t => {
            html += `
                <div class="col-4 col-md-3 col-lg-2 mb-1">
                    <label class="tinta-label">${t.nombre}</label>
                    <input type="number" class="form-control form-control-sm tinta-input tinta-rest"
                        id="rest_${t.id}" data-tinta="${t.id}" step="0.01" min="0" value="0">
                </div>`;
        });
        html += '</div>';
        container.innerHTML = html;
    },

    /** Event listeners para tab Consumo */
    setupConsumoEvents: function() {
        // Selector de OT -> precarga
        const selectOT = document.getElementById('consumoOT');
        if (selectOT) {
            selectOT.addEventListener('change', () => {
                const opt = selectOT.options[selectOT.selectedIndex];
                if (opt && opt.dataset.ot) this.precargarOT(opt.dataset.ot);
            });
        }

        // Calculos automaticos tintas laminacion
        document.querySelectorAll('#gridLaminacion').forEach(grid => {
            grid.addEventListener('input', () => this.calcularTotales());
        });

        // Calculos automaticos tintas superficie
        document.querySelectorAll('#gridSuperficie').forEach(grid => {
            grid.addEventListener('input', () => this.calcularTotales());
        });

        // Solventes
        document.querySelectorAll('.solvente-input').forEach(input => {
            input.addEventListener('input', () => this.calcularTotales());
        });

        // Restante
        document.querySelectorAll('#gridRestante').forEach(grid => {
            grid.addEventListener('input', () => this.calcularRestante());
        });

        // Boton guardar consumo
        const btnGuardar = document.getElementById('btnGuardarConsumo');
        if (btnGuardar) {
            btnGuardar.addEventListener('click', (e) => {
                e.preventDefault();
                this.guardarConsumo();
            });
        }

        // Boton limpiar
        const btnLimpiar = document.getElementById('btnLimpiar');
        if (btnLimpiar) {
            btnLimpiar.addEventListener('click', () => this.limpiarConsumo());
        }

        // Boton historial
        const btnHistorial = document.getElementById('btnHistorial');
        if (btnHistorial) {
            btnHistorial.addEventListener('click', () => this.mostrarHistorial());
        }

        // Form submit
        const form = document.getElementById('formConsumo');
        if (form) {
            form.addEventListener('submit', (e) => {
                e.preventDefault();
                this.guardarConsumo();
            });
        }
    },

    /** Calcula totales de tintas y solventes */
    calcularTotales: function() {
        let totalLam = 0;
        document.querySelectorAll('.tinta-lam').forEach(input => {
            totalLam += parseFloat(input.value) || 0;
        });
        const elLam = document.getElementById('totalLaminacion');
        if (elLam) elLam.textContent = totalLam.toFixed(2);

        let totalSup = 0;
        document.querySelectorAll('.tinta-sup').forEach(input => {
            totalSup += parseFloat(input.value) || 0;
        });
        const elSup = document.getElementById('totalSuperficie');
        if (elSup) elSup.textContent = totalSup.toFixed(2);

        const alcohol = parseFloat(document.getElementById('solAlcohol')?.value) || 0;
        const metoxi = parseFloat(document.getElementById('solMetoxi')?.value) || 0;
        const acetato = parseFloat(document.getElementById('solAcetato')?.value) || 0;
        const totalSolv = alcohol + metoxi + acetato;

        const elSolv = document.getElementById('totalSolventes');
        if (elSolv) elSolv.textContent = totalSolv.toFixed(2);

        const elSolvR = document.getElementById('totalSolventesResumen');
        if (elSolvR) elSolvR.textContent = totalSolv.toFixed(2);
    },

    /** Calcula total de restante */
    calcularRestante: function() {
        let total = 0;
        document.querySelectorAll('.tinta-rest').forEach(input => {
            total += parseFloat(input.value) || 0;
        });
        const el = document.getElementById('totalRestante');
        if (el) el.textContent = total.toFixed(2);
    },

    /** Recopila datos del formulario de consumo */
    recopilarConsumo: function() {
        const tintasLam = {};
        document.querySelectorAll('.tinta-lam').forEach(input => {
            const val = parseFloat(input.value) || 0;
            if (val > 0) tintasLam[input.dataset.tinta] = val;
        });

        const tintasSup = {};
        document.querySelectorAll('.tinta-sup').forEach(input => {
            const val = parseFloat(input.value) || 0;
            if (val > 0) tintasSup[input.dataset.tinta] = val;
        });

        const restante = {};
        document.querySelectorAll('.tinta-rest').forEach(input => {
            const val = parseFloat(input.value) || 0;
            if (val > 0) restante[input.dataset.tinta] = val;
        });

        return {
            id: 'CON_' + Date.now(),
            timestamp: new Date().toISOString(),
            fecha: document.getElementById('consumoFecha')?.value || '',
            ordenTrabajo: document.getElementById('consumoOT')?.value || '',
            kgProduccion: parseFloat(document.getElementById('consumoKg')?.value) || 0,
            cliente: document.getElementById('consumoCliente')?.value || '',
            producto: document.getElementById('consumoProducto')?.value || '',
            maquina: document.getElementById('consumoMaquina')?.value || '',
            turno: document.getElementById('consumoTurno')?.value || '',
            status: document.getElementById('consumoStatus')?.value || '',
            tintasLaminacion: tintasLam,
            totalLaminacion: parseFloat(document.getElementById('totalLaminacion')?.textContent) || 0,
            tintasSuperficie: tintasSup,
            totalSuperficie: parseFloat(document.getElementById('totalSuperficie')?.textContent) || 0,
            solventes: {
                alcohol: parseFloat(document.getElementById('solAlcohol')?.value) || 0,
                metoxi: parseFloat(document.getElementById('solMetoxi')?.value) || 0,
                acetato: parseFloat(document.getElementById('solAcetato')?.value) || 0,
            },
            totalSolventes: parseFloat(document.getElementById('totalSolventes')?.textContent) || 0,
            restante: restante,
            totalRestante: parseFloat(document.getElementById('totalRestante')?.textContent) || 0,
            observaciones: document.getElementById('consumoObservaciones')?.value || '',
            registradoPor: (typeof Auth !== 'undefined' && Auth.getUser()) ? Auth.getUser().id : 'unknown',
            registradoPorNombre: (typeof Auth !== 'undefined' && Auth.getUser()) ? Auth.getUser().nombre : 'Unknown',
        };
    },

    /** Guarda el consumo (solo registro, no descuenta inventario) */
    guardarConsumo: function() {
        const datos = this.recopilarConsumo();

        if (!datos.fecha || !datos.ordenTrabajo) {
            this.mostrarToast('Fecha y Orden de Trabajo son requeridos', 'warning');
            return;
        }

        // Guardar en localStorage
        const registros = JSON.parse(localStorage.getItem('axones_consumo_tintas') || '[]');
        registros.unshift(datos);
        localStorage.setItem('axones_consumo_tintas', JSON.stringify(registros));

        this.mostrarToast('Consumo registrado correctamente (solo registro, no descuenta inventario)', 'success');
        this.limpiarConsumo();
    },

    /** Limpia el formulario de consumo */
    limpiarConsumo: function() {
        const form = document.getElementById('formConsumo');
        if (form) form.reset();
        this.setDefaultDate();

        document.querySelectorAll('.tinta-lam, .tinta-sup, .solvente-input, .tinta-rest').forEach(input => {
            input.value = '0';
        });

        ['totalLaminacion', 'totalSuperficie', 'totalSolventes', 'totalSolventesResumen', 'totalRestante'].forEach(id => {
            const el = document.getElementById(id);
            if (el) el.textContent = '0.00';
        });
    },

    /** Muestra historial de consumos en modal */
    mostrarHistorial: function() {
        const registros = JSON.parse(localStorage.getItem('axones_consumo_tintas') || '[]');
        const contenido = document.getElementById('historialContenido');
        if (!contenido) return;

        if (registros.length === 0) {
            contenido.innerHTML = '<p class="text-muted text-center py-3">No hay registros de consumo</p>';
        } else {
            let html = '<div class="table-responsive"><table class="table table-sm table-hover">';
            html += '<thead><tr><th>Fecha</th><th>OT</th><th>Cliente</th><th>Tintas Lam</th><th>Tintas Sup</th><th>Solventes</th><th>Restante</th></tr></thead><tbody>';

            registros.slice(0, 30).forEach(reg => {
                html += `<tr>
                    <td>${reg.fecha || '-'}</td>
                    <td>${reg.ordenTrabajo || '-'}</td>
                    <td>${reg.cliente || '-'}</td>
                    <td>${(reg.totalLaminacion || 0).toFixed(2)} Kg</td>
                    <td>${(reg.totalSuperficie || 0).toFixed(2)} Kg</td>
                    <td>${(reg.totalSolventes || 0).toFixed(2)} Lt</td>
                    <td>${(reg.totalRestante || 0).toFixed(2)} Kg</td>
                </tr>`;
            });
            html += '</tbody></table></div>';
            contenido.innerHTML = html;
        }

        const modal = new bootstrap.Modal(document.getElementById('modalHistorial'));
        modal.show();
    },

    // =========================================================
    // TAB 2: INVENTARIO
    // =========================================================
    _filtroActivo: 'todas',

    initInventario: function() {
        this.renderInventario();
        this.setupInventarioEvents();
    },

    /** Obtiene inventario de tintas desde localStorage */
    getInventario: function() {
        return JSON.parse(localStorage.getItem('axones_tintas_inventario') || '[]');
    },

    /** Guarda inventario de tintas en localStorage */
    saveInventario: function(data) {
        localStorage.setItem('axones_tintas_inventario', JSON.stringify(data));
    },

    /** Renderiza la tabla de inventario con filtros */
    renderInventario: function() {
        const body = document.getElementById('bodyInventario');
        if (!body) return;

        let items = this.getInventario();
        const busqueda = (document.getElementById('buscarTinta')?.value || '').toLowerCase();

        // Filtrar por categoria
        if (this._filtroActivo !== 'todas') {
            items = items.filter(t => t.categoria === this._filtroActivo);
        }

        // Filtrar por busqueda
        if (busqueda) {
            items = items.filter(t =>
                (t.nombre || '').toLowerCase().includes(busqueda) ||
                (t.proveedor || '').toLowerCase().includes(busqueda) ||
                (t.lote || '').toLowerCase().includes(busqueda)
            );
        }

        // Actualizar contadores
        const all = this.getInventario();
        const setCount = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = val; };
        setCount('countTodas', all.length);
        setCount('countOriginales', all.filter(t => t.categoria === 'original').length);
        setCount('countSolventadas', all.filter(t => t.categoria === 'solventada').length);
        setCount('countArregladas', all.filter(t => t.categoria === 'arreglada').length);

        if (items.length === 0) {
            body.innerHTML = '<tr><td colspan="8" class="text-center text-muted py-4">No hay tintas en inventario</td></tr>';
            return;
        }

        body.innerHTML = items.map(t => {
            const badgeClass = t.categoria === 'original' ? 'badge-original' :
                               t.categoria === 'solventada' ? 'badge-solventada' : 'badge-arreglada';
            const stock = parseFloat(t.stock) || 0;
            const stockMin = parseFloat(t.stockMin) || 0;
            const pct = stockMin > 0 ? Math.min(100, (stock / stockMin) * 100) : 100;
            const barColor = pct < 30 ? '#dc3545' : pct < 60 ? '#ffc107' : '#198754';

            return `<tr class="tinta-row" data-id="${t.id}">
                <td><span class="color-dot" style="background:${t.color || '#999'};border:1px solid #ccc;"></span></td>
                <td><strong>${t.nombre || ''}</strong></td>
                <td><small>${t.tipo === 'laminacion' ? 'Laminacion' : 'Superficie'}</small></td>
                <td><span class="badge ${badgeClass}">${t.categoria || 'original'}</span></td>
                <td>
                    <strong>${stock.toFixed(2)}</strong> Kg
                    <div class="stock-bar mt-1"><div class="stock-bar-fill" style="width:${pct}%;background:${barColor};"></div></div>
                </td>
                <td><small>${t.proveedor || '-'}</small></td>
                <td><small>${t.lote || '-'}</small></td>
                <td>
                    <button class="btn btn-sm btn-outline-primary btn-edit-tinta" data-id="${t.id}" title="Editar">
                        <i class="bi bi-pencil"></i>
                    </button>
                    <button class="btn btn-sm btn-outline-danger btn-archivar-tinta" data-id="${t.id}" title="Archivar">
                        <i class="bi bi-archive"></i>
                    </button>
                </td>
            </tr>`;
        }).join('');
    },

    /** Event listeners para tab Inventario */
    setupInventarioEvents: function() {
        // Filtros
        document.querySelectorAll('.filter-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                this._filtroActivo = btn.dataset.filter;
                this.renderInventario();
            });
        });

        // Busqueda
        const buscar = document.getElementById('buscarTinta');
        if (buscar) {
            buscar.addEventListener('input', () => this.renderInventario());
        }

        // Boton nueva tinta
        const btnAgregar = document.getElementById('btnAgregarTinta');
        if (btnAgregar) {
            btnAgregar.addEventListener('click', () => this.abrirModalTinta());
        }

        // Mostrar/ocultar campos solventada
        const catSelect = document.getElementById('tintaCategoria');
        if (catSelect) {
            catSelect.addEventListener('change', () => {
                const campos = document.getElementById('camposSolventada');
                if (campos) {
                    campos.style.display = (catSelect.value === 'solventada' || catSelect.value === 'arreglada') ? 'block' : 'none';
                }
            });
        }

        // Guardar tinta desde modal
        const btnGuardar = document.getElementById('btnGuardarTinta');
        if (btnGuardar) {
            btnGuardar.addEventListener('click', () => this.guardarTinta());
        }

        // Delegacion de eventos en tabla
        const tabla = document.getElementById('tablaInventario');
        if (tabla) {
            tabla.addEventListener('click', (e) => {
                const btnEdit = e.target.closest('.btn-edit-tinta');
                const btnArch = e.target.closest('.btn-archivar-tinta');

                if (btnEdit) {
                    this.abrirModalTinta(btnEdit.dataset.id);
                } else if (btnArch) {
                    this.abrirModalArchivar(btnArch.dataset.id);
                }
            });
        }
    },

    /** Abre modal para nueva tinta o editar existente */
    abrirModalTinta: function(id) {
        const title = document.getElementById('modalTintaTitle');
        const editId = document.getElementById('tintaEditId');

        // Reset form
        ['tintaNombre', 'tintaLote', 'tintaBase', 'tintaProporcion', 'tintaNotas'].forEach(fid => {
            const el = document.getElementById(fid);
            if (el) el.value = '';
        });
        document.getElementById('tintaStock').value = '0';
        document.getElementById('tintaStockMin').value = '0';
        document.getElementById('tintaColor').value = '#00CED1';
        document.getElementById('tintaTipo').value = 'laminacion';
        document.getElementById('tintaCategoria').value = 'original';
        document.getElementById('tintaProveedor').value = '';
        const campos = document.getElementById('camposSolventada');
        if (campos) campos.style.display = 'none';

        if (id) {
            // Editar
            const items = this.getInventario();
            const tinta = items.find(t => t.id === id);
            if (!tinta) return;

            if (title) title.innerHTML = '<i class="bi bi-pencil me-2"></i>Editar Tinta';
            if (editId) editId.value = id;

            document.getElementById('tintaNombre').value = tinta.nombre || '';
            document.getElementById('tintaColor').value = tinta.color || '#00CED1';
            document.getElementById('tintaTipo').value = tinta.tipo || 'laminacion';
            document.getElementById('tintaCategoria').value = tinta.categoria || 'original';
            document.getElementById('tintaStock').value = tinta.stock || 0;
            document.getElementById('tintaStockMin').value = tinta.stockMin || 0;
            document.getElementById('tintaProveedor').value = tinta.proveedor || '';
            document.getElementById('tintaLote').value = tinta.lote || '';
            document.getElementById('tintaNotas').value = tinta.notas || '';

            if (tinta.categoria === 'solventada' || tinta.categoria === 'arreglada') {
                if (campos) campos.style.display = 'block';
                document.getElementById('tintaBase').value = tinta.tintaBase || '';
                document.getElementById('tintaProporcion').value = tinta.proporcion || '';
            }
        } else {
            if (title) title.innerHTML = '<i class="bi bi-droplet me-2"></i>Nueva Tinta';
            if (editId) editId.value = '';
        }

        const modal = new bootstrap.Modal(document.getElementById('modalTinta'));
        modal.show();
    },

    /** Guarda tinta nueva o editada */
    guardarTinta: function() {
        const nombre = document.getElementById('tintaNombre')?.value?.trim();
        if (!nombre) {
            this.mostrarToast('El nombre es requerido', 'warning');
            return;
        }

        const editId = document.getElementById('tintaEditId')?.value;
        const items = this.getInventario();

        const tintaData = {
            id: editId || 'TINTA_' + Date.now(),
            nombre: nombre,
            color: document.getElementById('tintaColor')?.value || '#00CED1',
            tipo: document.getElementById('tintaTipo')?.value || 'laminacion',
            categoria: document.getElementById('tintaCategoria')?.value || 'original',
            stock: parseFloat(document.getElementById('tintaStock')?.value) || 0,
            stockMin: parseFloat(document.getElementById('tintaStockMin')?.value) || 0,
            proveedor: document.getElementById('tintaProveedor')?.value || '',
            lote: document.getElementById('tintaLote')?.value || '',
            notas: document.getElementById('tintaNotas')?.value || '',
            tintaBase: document.getElementById('tintaBase')?.value || '',
            proporcion: document.getElementById('tintaProporcion')?.value || '',
            updatedAt: new Date().toISOString(),
        };

        if (editId) {
            const idx = items.findIndex(t => t.id === editId);
            if (idx >= 0) {
                tintaData.createdAt = items[idx].createdAt;
                items[idx] = tintaData;
            }
        } else {
            tintaData.createdAt = new Date().toISOString();
            items.unshift(tintaData);
        }

        this.saveInventario(items);
        this.renderInventario();

        bootstrap.Modal.getInstance(document.getElementById('modalTinta'))?.hide();
        this.mostrarToast(editId ? 'Tinta actualizada' : 'Tinta agregada al inventario', 'success');
    },

    /** Abre modal para archivar tinta (enviar a cementerio) */
    abrirModalArchivar: function(id) {
        const el = document.getElementById('archivarId');
        if (el) el.value = id;
        document.getElementById('archivarMotivo').value = 'agotada';

        const modal = new bootstrap.Modal(document.getElementById('modalArchivar'));
        modal.show();
    },

    // =========================================================
    // TAB 3: CEMENTERIO (Fase 2C - placeholder)
    // =========================================================
    initCementerio: function() {
        // TODO: Fase 2C
    },

    // =========================================================
    // TAB 4: MEZCLAS (Fase 2D - placeholder)
    // =========================================================
    initMezclas: function() {
        // TODO: Fase 2D
    },

    // =========================================================
    // UTILIDADES
    // =========================================================
    mostrarToast: function(mensaje, tipo) {
        tipo = tipo || 'info';
        let container = document.querySelector('.toast-container');
        if (!container) {
            container = document.createElement('div');
            container.className = 'toast-container position-fixed bottom-0 end-0 p-3';
            document.body.appendChild(container);
        }

        const bgClass = tipo === 'success' ? 'bg-success' : tipo === 'warning' ? 'bg-warning' : tipo === 'danger' ? 'bg-danger' : 'bg-info';
        const textClass = tipo === 'warning' ? 'text-dark' : 'text-white';

        const html = `
            <div class="toast align-items-center ${bgClass} ${textClass} border-0" role="alert">
                <div class="d-flex">
                    <div class="toast-body">${mensaje}</div>
                    <button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast"></button>
                </div>
            </div>`;

        container.insertAdjacentHTML('beforeend', html);
        const toastEl = container.lastElementChild;
        const toast = new bootstrap.Toast(toastEl, { autohide: true, delay: 5000 });
        toast.show();
        toastEl.addEventListener('hidden.bs.toast', () => toastEl.remove());
    },
};

// Inicializar cuando el DOM este listo
document.addEventListener('DOMContentLoaded', () => {
    if (document.getElementById('tintasTabs') || document.getElementById('formConsumo')) {
        Tintas.init();
    }
});
