/**
 * Modulo Tintas y Solventes - Sistema Axones
 * Fase 2A: Tab Consumo por OT
 */

const Tintas = {
    // =========================================================
    // INICIALIZACION
    // =========================================================
    init: async function() {
        console.log('Inicializando modulo Tintas y Solventes');

        // Asegurar que AxonesDB esta inicializado
        if (typeof AxonesDB !== 'undefined' && !AxonesDB.isReady()) {
            await AxonesDB.init();
        }

        await this.initConsumo();
        await this.initInventario();
        await this.initCementerio();
        await this.initMezclas();
    },

    // =========================================================
    // TAB 1: CONSUMO POR OT
    // =========================================================
    initConsumo: async function() {
        this.setDefaultDate();
        await this.cargarOTs();
        await this.cargarTintasInventario();
        this.setupConsumoEvents();
    },

    /** Carga tintas del inventario y cementerio para los selectores */
    cargarTintasInventario: async function() {
        this._tintasInv = [];
        this._tintasCem = [];
        if (typeof AxonesDB !== 'undefined' && AxonesDB.isReady()) {
            try {
                const res = await AxonesDB.tintas.listar({ soloActivos: true });
                this._tintasInv = res || [];
                const resCem = await AxonesDB.client.from('tintas_cementerio').select('*');
                this._tintasCem = resCem.data || [];
            } catch (e) { console.warn('Error cargando tintas:', e); }
        }
    },

    /** Genera opciones HTML para selector de tinta (inventario + cementerio) */
    generarOpcionesTintaSelector: function(tipo) {
        let opciones = '<option value="">-- Escribir o seleccionar --</option>';
        opciones += '<optgroup label="Inventario">';
        this._tintasInv.filter(t => !tipo || (t.tipo || '').includes(tipo === 'lam' ? 'laminacion' : 'superficie'))
            .forEach(t => {
                const nombre = t.nombre || t.color || '';
                const stock = parseFloat(t.cantidad || t.stock_kg || 0).toFixed(1);
                opciones += `<option value="inv_${t.id}" data-nombre="${nombre}">${nombre} (${stock} Kg)</option>`;
            });
        opciones += '</optgroup>';
        if (this._tintasCem.length > 0) {
            opciones += '<optgroup label="Cementerio">';
            this._tintasCem.filter(t => !tipo || (t.tipo || '').includes(tipo === 'lam' ? 'laminacion' : 'superficie'))
                .forEach(t => {
                    const nombre = t.nombre || t.color || '';
                    const stock = parseFloat(t.stock_final || 0).toFixed(1);
                    opciones += `<option value="cem_${t.id}" data-nombre="${nombre}">🏚 ${nombre} (${stock} Kg)</option>`;
                });
            opciones += '</optgroup>';
        }
        return opciones;
    },

    setDefaultDate: function() {
        const el = document.getElementById('consumoFecha');
        if (el) el.value = new Date().toISOString().split('T')[0];
    },

    /** Carga OTs desde Supabase al select */
    cargarOTs: async function() {
        const select = document.getElementById('consumoOT');
        if (!select) return;

        let ordenes = [];
        try {
            ordenes = await AxonesDB.ordenesHelper.cargar() || [];
        } catch (e) {
            console.warn('Tintas: Error cargando OTs desde Supabase', e);
        }
        select.innerHTML = '<option value="">Seleccionar OT...</option>';

        ordenes.sort((a, b) => (b.numeroOrden || '').localeCompare(a.numeroOrden || ''));
        ordenes.forEach(ot => {
            const numOT = ot.numeroOrden || ot.nombreOT || ot.id || '';
            const cliente = ot.cliente || '';
            const producto = ot.producto || '';
            const opt = document.createElement('option');
            opt.value = numOT;
            opt.textContent = `${numOT} - ${cliente}${producto ? ' - ' + producto : ''}`;
            opt.dataset.ot = JSON.stringify(ot);
            select.appendChild(opt);
        });
    },

    /** Pre-llena campos al seleccionar OT - resumen spreadsheet como otros modulos */
    precargarOT: function(otJson) {
        const resumen = document.getElementById('resumenOTTintas');
        const badge = document.getElementById('consumoEstadoOT');
        if (!otJson) {
            if (resumen) resumen.style.display = 'none';
            if (badge) { badge.textContent = 'Sin OT'; badge.className = 'badge bg-secondary d-block py-2'; }
            this._ordenCargada = null;
            return;
        }
        try {
            const ot = JSON.parse(otJson);
            this._ordenCargada = ot;
            const setText = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = val || '-'; };
            setText('consumoCliente', ot.cliente);
            setText('consumoRIF', ot.rifCliente || ot.rif || '-');
            setText('consumoProducto', ot.producto || ot.nombreProducto);
            setText('consumoCPE', ot.cpe || ot.sku || '-');
            setText('consumoMaterial', ot.tipoMaterial || '-');
            setText('consumoEstructura', ot.estructuraMaterial || '-');
            setText('consumoMaquina', ot.maquina);
            setText('consumoKg', ot.pedidoKg || ot.kgPedidos);
            // Colores de tintas desde la OT
            const colores = [];
            for (let i = 1; i <= 8; i++) {
                const c = ot['color' + i] || ot['impColor' + i];
                if (c) colores.push(i + ': ' + c);
            }
            setText('consumoColores', colores.length > 0 ? colores.join(' | ') : '-');
            if (resumen) resumen.style.display = '';
            if (badge) {
                badge.textContent = ot.numeroOrden || ot.nombreOT || ot.id;
                badge.className = 'badge bg-success d-block py-2';
            }
        } catch(e) { console.error('Error precargando OT:', e); }
    },

    /** Agrega una fila de tinta editable a la tabla unificada */
    agregarFilaTintaConsumo: function() {
        const tbody = document.getElementById('bodyConsumoTintas');
        if (!tbody) return;

        const opciones = this.generarOpcionesTintaSelector();
        const n = tbody.querySelectorAll('tr').length;
        const fila = document.createElement('tr');
        fila.innerHTML = `
            <td><input type="text" class="form-control form-control-sm tinta-codigo" placeholder="Codigo" style="width:100%;"></td>
            <td>
                <input type="text" class="form-control form-control-sm tinta-nombre" list="listaTintasConsumo_${n}" placeholder="Color...">
                <datalist id="listaTintasConsumo_${n}">${opciones.replace(/<\/?optgroup[^>]*>/g, '')}</datalist>
            </td>
            <td><input type="text" class="form-control form-control-sm tinta-proveedor" placeholder="Proveedor"></td>
            <td>
                <select class="form-select form-select-sm tinta-tipo" style="font-size:0.7rem;">
                    <option value="laminada">Laminada</option>
                    <option value="superficie">Superficie</option>
                </select>
            </td>
            <td>
                <select class="form-select form-select-sm tinta-fuente" style="font-size:0.7rem;">
                    <option value="original">Original</option>
                    <option value="cementerio">Cementerio</option>
                </select>
            </td>
            <td><input type="number" class="form-control form-control-sm tinta-kg-usado" step="0.01" min="0" value="0"></td>
            <td><button type="button" class="btn btn-sm btn-outline-danger" onclick="this.closest('tr').remove();Tintas.calcularTotalesConsumo();"><i class="bi bi-x"></i></button></td>
        `;
        fila.querySelectorAll('input[type=number]').forEach(inp => {
            inp.addEventListener('input', () => this.calcularTotalesConsumo());
        });

        // Auto-llenar campos al seleccionar tinta del datalist
        const nombreInput = fila.querySelector('.tinta-nombre');
        if (nombreInput) {
            nombreInput.addEventListener('input', () => {
                const val = nombreInput.value;
                // Buscar en inventario
                const inv = (this._tintasInv || []).find(t =>
                    val.includes(t.nombre || t.color || '') || val.includes(t.id)
                );
                // Buscar en cementerio
                const cem = !inv ? (this._tintasCem || []).find(t =>
                    val.includes(t.nombre || t.color || '') || val.includes(t.id)
                ) : null;

                const found = inv || cem;
                if (found) {
                    const codigoEl = fila.querySelector('.tinta-codigo');
                    const proveedorEl = fila.querySelector('.tinta-proveedor');
                    const tipoEl = fila.querySelector('.tinta-tipo');
                    const fuenteEl = fila.querySelector('.tinta-fuente');

                    if (codigoEl) codigoEl.value = found.codigo || found.id || '';
                    if (proveedorEl) proveedorEl.value = found.proveedor || found.proveedor_nombre || '';
                    if (tipoEl) {
                        const tipo = (found.tipo || '').toLowerCase();
                        tipoEl.value = tipo.includes('superficie') ? 'superficie' : 'laminada';
                    }
                    if (fuenteEl) fuenteEl.value = cem ? 'cementerio' : 'original';
                }
            });
        }

        tbody.appendChild(fila);
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

        // Boton agregar tinta (tabla unificada)
        document.getElementById('btnAgregarTintaConsumo')?.addEventListener('click', () => this.agregarFilaTintaConsumo());

        // Boton agregar devolucion de tinta
        document.getElementById('btnAgregarTintaDevolucion')?.addEventListener('click', () => this.agregarFilaTintaDevolucion());

        // Solventes
        document.querySelectorAll('.solvente-input').forEach(input => {
            input.addEventListener('input', () => this.calcularTotalesConsumo());
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

    /** Calcula totales de tintas y solventes (nueva version con tablas editables) */
    calcularTotalesConsumo: function() {
        // Tabla unificada de consumo
        let totalUsado = 0;
        let totalLam = 0, totalSup = 0;
        document.querySelectorAll('#bodyConsumoTintas tr').forEach(row => {
            const kg = parseFloat(row.querySelector('.tinta-kg-usado')?.value) || 0;
            const tipo = row.querySelector('.tinta-tipo')?.value || 'laminada';
            totalUsado += kg;
            if (tipo === 'laminada') totalLam += kg; else totalSup += kg;
        });
        const elUsado = document.getElementById('totalTintasUsadas');
        if (elUsado) elUsado.textContent = totalUsado.toFixed(2);
        const elLam = document.getElementById('totalLaminacion');
        if (elLam) elLam.textContent = totalLam.toFixed(2);
        const elSup = document.getElementById('totalSuperficie');
        if (elSup) elSup.textContent = totalSup.toFixed(2);

        // Tabla de devolucion
        let totalDevuelto = 0;
        document.querySelectorAll('#bodyDevolucionTintas tr').forEach(row => {
            totalDevuelto += parseFloat(row.querySelector('.tinta-kg-devuelto')?.value) || 0;
        });
        const elDev = document.getElementById('totalTintasDevueltas');
        if (elDev) elDev.textContent = totalDevuelto.toFixed(2);

        // Solventes
        const alcohol = parseFloat(document.getElementById('solAlcohol')?.value) || 0;
        const metoxi = parseFloat(document.getElementById('solMetoxi')?.value) || 0;
        const acetato = parseFloat(document.getElementById('solAcetato')?.value) || 0;
        const totalSolv = alcohol + metoxi + acetato;
        const elSolv = document.getElementById('totalSolventes');
        if (elSolv) elSolv.textContent = totalSolv.toFixed(2);
        const elSolvR = document.getElementById('totalSolventesResumen');
        if (elSolvR) elSolvR.textContent = totalSolv.toFixed(2);
    },

    /** Agrega fila de devolucion de tinta */
    agregarFilaTintaDevolucion: function() {
        const tbody = document.getElementById('bodyDevolucionTintas');
        if (!tbody) return;

        const opciones = this.generarOpcionesTintaSelector();
        const n = tbody.querySelectorAll('tr').length;
        const fila = document.createElement('tr');
        fila.innerHTML = `
            <td><input type="text" class="form-control form-control-sm tinta-dev-codigo" placeholder="Codigo" style="width:100%;"></td>
            <td>
                <input type="text" class="form-control form-control-sm tinta-dev-nombre" list="listaTintasDev_${n}" placeholder="Color...">
                <datalist id="listaTintasDev_${n}">${opciones.replace(/<\/?optgroup[^>]*>/g, '')}</datalist>
            </td>
            <td><input type="text" class="form-control form-control-sm tinta-dev-proveedor" placeholder="Proveedor"></td>
            <td>
                <select class="form-select form-select-sm tinta-dev-tipo" style="font-size:0.7rem;">
                    <option value="laminada">Laminada</option>
                    <option value="superficie">Superficie</option>
                </select>
            </td>
            <td>
                <select class="form-select form-select-sm tinta-dev-fuente" style="font-size:0.7rem;">
                    <option value="original">Original</option>
                    <option value="cementerio">Cementerio</option>
                </select>
            </td>
            <td><input type="number" class="form-control form-control-sm tinta-kg-devuelto" step="0.01" min="0" value="0"></td>
            <td><button type="button" class="btn btn-sm btn-outline-danger" onclick="this.closest('tr').remove();Tintas.calcularTotalesConsumo();"><i class="bi bi-x"></i></button></td>
        `;
        fila.querySelectorAll('input[type=number]').forEach(inp => {
            inp.addEventListener('input', () => this.calcularTotalesConsumo());
        });

        // Auto-llenar campos al seleccionar tinta del datalist
        const nombreInput = fila.querySelector('.tinta-dev-nombre');
        if (nombreInput) {
            nombreInput.addEventListener('input', () => {
                const val = nombreInput.value;
                const inv = (this._tintasInv || []).find(t =>
                    val.includes(t.nombre || t.color || '') || val.includes(t.id)
                );
                const cem = !inv ? (this._tintasCem || []).find(t =>
                    val.includes(t.nombre || t.color || '') || val.includes(t.id)
                ) : null;
                const found = inv || cem;
                if (found) {
                    const codigoEl = fila.querySelector('.tinta-dev-codigo');
                    const proveedorEl = fila.querySelector('.tinta-dev-proveedor');
                    const tipoEl = fila.querySelector('.tinta-dev-tipo');
                    const fuenteEl = fila.querySelector('.tinta-dev-fuente');
                    if (codigoEl) codigoEl.value = found.codigo || found.id || '';
                    if (proveedorEl) proveedorEl.value = found.proveedor || found.proveedor_nombre || '';
                    if (tipoEl) tipoEl.value = (found.tipo || '').toLowerCase().includes('superficie') ? 'superficie' : 'laminada';
                    if (fuenteEl) fuenteEl.value = cem ? 'cementerio' : 'original';
                }
            });
        }
        tbody.appendChild(fila);
    },

    /** Backward compat alias */
    calcularTotales: function() { this.calcularTotalesConsumo(); },
    calcularRestante: function() {
        let total = 0;
        document.querySelectorAll('.tinta-rest, .tinta-kg-restante').forEach(input => {
            total += parseFloat(input.value) || 0;
        });
        const el = document.getElementById('totalRestante');
        if (el) el.textContent = total.toFixed(2);
    },

    /** Recopila datos de filas de tinta de la tabla unificada */
    recopilarFilasTinta: function() {
        const rows = document.querySelectorAll('#bodyConsumoTintas tr');
        const datos = [];
        rows.forEach(row => {
            const codigo = row.querySelector('.tinta-codigo')?.value || '';
            const nombre = row.querySelector('.tinta-nombre')?.value || '';
            const proveedor = row.querySelector('.tinta-proveedor')?.value || '';
            const tipo = row.querySelector('.tinta-tipo')?.value || 'laminada';
            const fuente = row.querySelector('.tinta-fuente')?.value || 'original';
            const kgUsado = parseFloat(row.querySelector('.tinta-kg-usado')?.value) || 0;
            const kgRestante = parseFloat(row.querySelector('.tinta-kg-restante')?.value) || 0;
            if ((nombre || codigo) && kgUsado > 0) {
                datos.push({ codigo, nombre, proveedor, tipo, fuente, kgUsado, kgRestante });
            }
        });
        return datos;
    },

    /** Recopila datos del formulario de consumo */
    recopilarConsumo: function() {
        const tintas = this.recopilarFilasTinta();

        // Recopilar filas de devolucion
        const devolucion = [];
        document.querySelectorAll('#bodyDevolucionTintas tr').forEach(row => {
            const kg = parseFloat(row.querySelector('.tinta-kg-devuelto')?.value) || 0;
            if (kg > 0) {
                devolucion.push({
                    codigo: row.querySelector('.tinta-dev-codigo')?.value || '',
                    nombre: row.querySelector('.tinta-dev-nombre')?.value || '',
                    proveedor: row.querySelector('.tinta-dev-proveedor')?.value || '',
                    tipo: row.querySelector('.tinta-dev-tipo')?.value || 'laminada',
                    fuente: row.querySelector('.tinta-dev-fuente')?.value || 'original',
                    kgDevuelto: kg,
                });
            }
        });

        return {
            id: 'CON_' + Date.now(),
            timestamp: new Date().toISOString(),
            fecha: document.getElementById('consumoFecha')?.value || '',
            ordenTrabajo: document.getElementById('consumoOT')?.value || '',
            kgProduccion: parseFloat(this._ordenCargada?.pedidoKg || this._ordenCargada?.kgPedidos) || 0,
            cliente: this._ordenCargada?.cliente || '',
            producto: this._ordenCargada?.producto || this._ordenCargada?.nombreProducto || '',
            maquina: this._ordenCargada?.maquina || '',
            turno: this._ordenCargada?.turno || '',
            material: this._ordenCargada?.tipoMaterial || '',
            tintas: tintas,
            totalTintas: parseFloat(document.getElementById('totalTintasUsadas')?.textContent) || 0,
            devolucion: devolucion,
            totalDevolucion: parseFloat(document.getElementById('totalTintasDevueltas')?.textContent) || 0,
            solventes: {
                alcohol: parseFloat(document.getElementById('solAlcohol')?.value) || 0,
                metoxi: parseFloat(document.getElementById('solMetoxi')?.value) || 0,
                acetato: parseFloat(document.getElementById('solAcetato')?.value) || 0,
            },
            totalSolventes: parseFloat(document.getElementById('totalSolventes')?.textContent) || 0,
            observaciones: document.getElementById('consumoObservaciones')?.value || '',
            registradoPor: (typeof Auth !== 'undefined' && Auth.getUser()) ? Auth.getUser().id : 'unknown',
            registradoPorNombre: (typeof Auth !== 'undefined' && Auth.getUser()) ? Auth.getUser().nombre : 'Unknown',
        };
    },

    /** Guarda el consumo (solo registro, no descuenta inventario) */
    guardarConsumo: async function() {
        const datos = this.recopilarConsumo();

        if (!datos.fecha || !datos.ordenTrabajo) {
            this.mostrarToast('Fecha y Orden de Trabajo son requeridos', 'warning');
            return;
        }

        try {
            // Save to Supabase sync_store
            const { data: existing } = await AxonesDB.client.from('sync_store').select('value').eq('key', 'axones_consumo_tintas').single();
            const registros = (existing && existing.value) ? (typeof existing.value === 'string' ? JSON.parse(existing.value) : existing.value) : [];
            registros.unshift(datos);
            await AxonesDB.client.from('sync_store').upsert({ key: 'axones_consumo_tintas', value: registros, updated_at: new Date().toISOString() }, { onConflict: 'key' });
        } catch (e) {
            console.warn('Tintas: Error guardando consumo en Supabase', e);
        }

        // Fase 5: Verificar alerta de consumo elevado
        if (typeof AlertasEngine !== 'undefined') {
            AlertasEngine.verificarTintas(datos).catch(e => console.warn(e));
        }

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

        // Limpiar tablas dinamicas
        const bodyConsumo = document.getElementById('bodyConsumoTintas');
        if (bodyConsumo) bodyConsumo.innerHTML = '';
        const bodyDev = document.getElementById('bodyDevolucionTintas');
        if (bodyDev) bodyDev.innerHTML = '';

        // Ocultar resumen OT
        const resumen = document.getElementById('resumenOTTintas');
        if (resumen) resumen.style.display = 'none';
        const badge = document.getElementById('consumoEstadoOT');
        if (badge) { badge.textContent = 'Sin OT'; badge.className = 'badge bg-secondary d-block py-2'; }
        this._ordenCargada = null;

        ['totalLaminacion', 'totalSuperficie', 'totalSolventes', 'totalSolventesResumen', 'totalTintasUsadas', 'totalTintasDevueltas'].forEach(id => {
            const el = document.getElementById(id);
            if (el) el.textContent = '0.00';
        });
    },

    /** Muestra historial de consumos en modal */
    mostrarHistorial: async function() {
        let registros = [];
        try {
            const { data } = await AxonesDB.client.from('sync_store').select('value').eq('key', 'axones_consumo_tintas').single();
            registros = (data && data.value) ? (typeof data.value === 'string' ? JSON.parse(data.value) : data.value) : [];
        } catch (e) {
            console.warn('Tintas: Error cargando historial desde Supabase', e);
        }
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

    initInventario: async function() {
        await this._loadInventario();
        this.renderInventario();
        this.setupInventarioEvents();
    },

    /** Obtiene inventario de tintas desde Supabase (cached) */
    _inventarioCache: null,
    getInventario: function() {
        return this._inventarioCache || [];
    },

    /** Carga inventario de tintas desde Supabase */
    _loadInventario: async function() {
        try {
            const data = await AxonesDB.tintas.listar({ soloActivos: true });
            this._inventarioCache = data || [];
        } catch (e) {
            console.warn('Tintas: Error cargando inventario desde Supabase', e);
            this._inventarioCache = [];
        }
        return this._inventarioCache;
    },

    /** Guarda inventario de tintas en Supabase sync_store */
    saveInventario: async function(data) {
        this._inventarioCache = data;
        try {
            await AxonesDB.client.from('sync_store').upsert({ key: 'axones_tintas_inventario', value: data, updated_at: new Date().toISOString() }, { onConflict: 'key' });
        } catch (e) {
            console.warn('Tintas: Error guardando inventario en Supabase', e);
        }
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
        setCount('countSolventadas', all.filter(t => t.categoria === 'solventada' || t.categoria === 'arreglada').length);

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
    // TAB 3: CEMENTERIO (Fase 2C)
    // =========================================================
    initCementerio: async function() {
        // Setup confirmar archivar button
        const btnConfirmar = document.getElementById('btnConfirmarArchivar');
        if (btnConfirmar) {
            btnConfirmar.addEventListener('click', async () => {
                const id = document.getElementById('archivarId')?.value;
                const motivo = document.getElementById('archivarMotivo')?.value || 'agotada';
                if (!id) return;

                await this.archivarTinta(id, motivo);

                // Close the modal
                const modalEl = document.getElementById('modalArchivar');
                if (modalEl) {
                    const modal = bootstrap.Modal.getInstance(modalEl);
                    if (modal) modal.hide();
                }
            });
        }

        // Render cementerio table
        await this.renderCementerio();
    },

    /** Archive a tinta: move from tintas to tintas_cementerio */
    archivarTinta: async function(id, motivo) {
        if (!AxonesDB.isReady()) {
            // Fallback sync_store
            const items = this.getInventario();
            const idx = items.findIndex(t => t.id === id);
            if (idx < 0) return;

            const tinta = items[idx];
            items.splice(idx, 1);
            await this.saveInventario(items);

            let cementerio = [];
            try {
                const { data } = await AxonesDB.client.from('sync_store').select('value').eq('key', 'axones_tintas_cementerio').single();
                cementerio = (data && data.value) ? (typeof data.value === 'string' ? JSON.parse(data.value) : data.value) : [];
            } catch (e) { /* empty */ }
            cementerio.unshift({
                ...tinta,
                motivo: motivo,
                archivado_por: (typeof Auth !== 'undefined' && Auth.getUser()) ? Auth.getUser().nombre : 'Unknown',
                archivado_en: new Date().toISOString(),
            });
            try {
                await AxonesDB.client.from('sync_store').upsert({ key: 'axones_tintas_cementerio', value: cementerio, updated_at: new Date().toISOString() }, { onConflict: 'key' });
            } catch (e) { console.warn('Tintas: Error saving cementerio', e); }

            this.renderInventario();
            await this.renderCementerio();
            this.mostrarToast('Tinta archivada', 'success');
            return;
        }

        try {
            // Get the tinta from Supabase
            const { data: tinta, error: fetchError } = await AxonesDB.client
                .from('tintas')
                .select('*')
                .eq('id', id)
                .single();

            if (fetchError || !tinta) {
                this.mostrarToast('Error al obtener la tinta', 'danger');
                return;
            }

            const usuario = (typeof Auth !== 'undefined' && Auth.getUser()) ? Auth.getUser() : null;

            // Insert into tintas_cementerio
            const { error: insertError } = await AxonesDB.client
                .from('tintas_cementerio')
                .insert({
                    tinta_id: tinta.id,
                    nombre: tinta.nombre,
                    color: tinta.color,
                    tipo: tinta.tipo,
                    categoria: tinta.categoria,
                    stock_final: tinta.stock || 0,
                    proveedor: tinta.proveedor,
                    lote: tinta.lote,
                    notas: tinta.notas,
                    motivo: motivo,
                    archivado_por: usuario ? usuario.nombre : 'Unknown',
                    archivado_por_id: usuario ? usuario.id : null,
                });

            if (insertError) {
                console.error('Error archivando tinta:', insertError);
                this.mostrarToast('Error al archivar: ' + insertError.message, 'danger');
                return;
            }

            // Soft delete from tintas (set activo=false)
            const { error: deleteError } = await AxonesDB.client
                .from('tintas')
                .update({ activo: false })
                .eq('id', id);

            if (deleteError) {
                console.error('Error desactivando tinta:', deleteError);
            }

            // Also remove from local cache
            const items = this.getInventario();
            const localIdx = items.findIndex(t => t.id === id);
            if (localIdx >= 0) {
                items.splice(localIdx, 1);
                this._inventarioCache = items;
            }

            this.renderInventario();
            await this.renderCementerio();
            this.mostrarToast('Tinta archivada', 'success');
        } catch (err) {
            console.error('Error en archivarTinta:', err);
            this.mostrarToast('Error al archivar tinta', 'danger');
        }
    },

    /** Restore a tinta from cementerio back to inventory */
    restaurarTinta: async function(id) {
        if (!AxonesDB.isReady()) {
            // Fallback sync_store
            let cementerio = [];
            try {
                const { data } = await AxonesDB.client.from('sync_store').select('value').eq('key', 'axones_tintas_cementerio').single();
                cementerio = (data && data.value) ? (typeof data.value === 'string' ? JSON.parse(data.value) : data.value) : [];
            } catch (e) { /* empty */ }
            const idx = cementerio.findIndex(t => t.id === id);
            if (idx < 0) return;

            const archived = cementerio[idx];
            cementerio.splice(idx, 1);
            try {
                await AxonesDB.client.from('sync_store').upsert({ key: 'axones_tintas_cementerio', value: cementerio, updated_at: new Date().toISOString() }, { onConflict: 'key' });
            } catch (e) { console.warn('Tintas: Error saving cementerio', e); }

            // Remove cementerio-specific fields and restore
            const restored = { ...archived };
            delete restored.motivo;
            delete restored.archivado_por;
            delete restored.archivado_en;
            restored.updatedAt = new Date().toISOString();

            const items = this.getInventario();
            items.unshift(restored);
            await this.saveInventario(items);

            this.renderInventario();
            await this.renderCementerio();
            this.mostrarToast('Tinta restaurada al inventario', 'success');
            return;
        }

        try {
            // Get the archived record
            const { data: archived, error: fetchError } = await AxonesDB.client
                .from('tintas_cementerio')
                .select('*')
                .eq('id', id)
                .single();

            if (fetchError || !archived) {
                this.mostrarToast('Error al obtener registro archivado', 'danger');
                return;
            }

            // Reactivate in tintas table if tinta_id exists
            if (archived.tinta_id) {
                const { error: updateError } = await AxonesDB.client
                    .from('tintas')
                    .update({ activo: true, stock_kg: archived.stock_final || 0 })
                    .eq('id', archived.tinta_id);

                if (updateError) {
                    // If update fails (record doesn't exist), insert new
                    const { error: insertError } = await AxonesDB.client
                        .from('tintas')
                        .insert({
                            nombre: archived.nombre,
                            color: archived.color,
                            tipo: archived.tipo,
                            categoria: archived.categoria,
                            stock_kg: archived.stock_final || 0,
                            proveedor: archived.proveedor,
                            lote: archived.lote,
                            notas: archived.notas,
                            activo: true,
                        });

                    if (insertError) {
                        console.error('Error restaurando tinta:', insertError);
                        this.mostrarToast('Error al restaurar: ' + insertError.message, 'danger');
                        return;
                    }
                }
            }

            // Delete from tintas_cementerio
            const { error: deleteError } = await AxonesDB.client
                .from('tintas_cementerio')
                .delete()
                .eq('id', id);

            if (deleteError) {
                console.error('Error eliminando de cementerio:', deleteError);
            }

            this.renderInventario();
            await this.renderCementerio();
            this.mostrarToast('Tinta restaurada al inventario', 'success');
        } catch (err) {
            console.error('Error en restaurarTinta:', err);
            this.mostrarToast('Error al restaurar tinta', 'danger');
        }
    },

    /** Render the cementerio table from Supabase */
    renderCementerio: async function() {
        const body = document.getElementById('bodyCementerio');
        if (!body) return;

        let items = [];

        if (AxonesDB.isReady()) {
            try {
                const { data, error } = await AxonesDB.client
                    .from('tintas_cementerio')
                    .select('*')
                    .order('created_at', { ascending: false });

                if (!error && data) {
                    items = data;
                }
            } catch (err) {
                console.error('Error cargando cementerio:', err);
            }
        } else {
            // Fallback sync_store
            try {
                const { data } = await AxonesDB.client.from('sync_store').select('value').eq('key', 'axones_tintas_cementerio').single();
                items = (data && data.value) ? (typeof data.value === 'string' ? JSON.parse(data.value) : data.value) : [];
            } catch (e) { items = []; }
        }

        // Update badge count
        const badge = document.getElementById('cementerioCount');
        if (badge) badge.textContent = items.length;

        if (items.length === 0) {
            body.innerHTML = '<tr><td colspan="7" class="text-center text-muted py-4"><i class="bi bi-archive me-2"></i>No hay tintas archivadas</td></tr>';
            return;
        }

        const motivoLabels = {
            'agotada': 'Agotada',
            'vencida': 'Vencida',
            'contaminada': 'Contaminada',
            'descontinuada': 'Descontinuada',
            'otro': 'Otro',
        };

        const motivoBadgeClass = {
            'agotada': 'bg-secondary',
            'vencida': 'bg-warning text-dark',
            'contaminada': 'bg-danger',
            'descontinuada': 'bg-dark',
            'otro': 'bg-info',
        };

        body.innerHTML = items.map(item => {
            const fecha = item.created_at || item.archivado_en || '';
            const fechaStr = fecha ? new Date(fecha).toLocaleDateString('es-VE') : '-';
            const motivoText = motivoLabels[item.motivo] || item.motivo || '-';
            const motivoClass = motivoBadgeClass[item.motivo] || 'bg-secondary';
            const stock = parseFloat(item.stock_final) || 0;

            return `<tr>
                <td><span class="color-dot" style="background:${item.color || '#999'};border:1px solid #ccc;"></span></td>
                <td><strong>${item.nombre || ''}</strong></td>
                <td><small>${item.tipo === 'laminacion' ? 'Laminacion' : 'Superficie'}</small></td>
                <td><span class="badge ${motivoClass}">${motivoText}</span></td>
                <td><small>${fechaStr}</small></td>
                <td>${stock.toFixed(2)} Kg</td>
                <td>
                    <button class="btn btn-sm btn-outline-success btn-restaurar-tinta" data-id="${item.id}" title="Restaurar al inventario">
                        <i class="bi bi-arrow-counterclockwise"></i> Restaurar
                    </button>
                </td>
            </tr>`;
        }).join('');

        // Attach restore event listeners
        body.querySelectorAll('.btn-restaurar-tinta').forEach(btn => {
            btn.addEventListener('click', () => {
                this.restaurarTinta(btn.dataset.id);
            });
        });
    },

    // =========================================================
    // TAB 4: MEZCLAS (COLORISTA)
    // =========================================================
    _componenteCount: 0,

    initMezclas: function() {
        this.agregarComponente();
        this.setupMezclasEvents();
        this.cargarOTsMezclas();
        this.renderMezclas();
    },

    /** Carga OTs en el selector de mezclas y el filtro */
    cargarOTsMezclas: async function() {
        let ordenes = [];
        try {
            if (AxonesDB.isReady() && AxonesDB.ordenesHelper) {
                ordenes = await AxonesDB.ordenesHelper.cargar() || [];
            }
        } catch(e) { console.warn('Tintas mezclas: error cargando OTs', e); }

        ordenes.sort((a, b) => (b.numeroOrden || '').localeCompare(a.numeroOrden || ''));

        const sel = document.getElementById('mezclaOT');
        if (sel) {
            sel.innerHTML = '<option value="">-- Sin OT (receta general) --</option>';
            ordenes.filter(o => o.estadoOrden !== 'cancelada').forEach(ot => {
                const num = ot.numeroOrden || ot.nombreOT;
                const opt = document.createElement('option');
                opt.value = num;
                opt.textContent = `${num} - ${ot.cliente || ''} - ${ot.producto || ''}`;
                sel.appendChild(opt);
            });
        }

        const filtro = document.getElementById('filtroMezclaOT');
        if (filtro) {
            filtro.innerHTML = '<option value="">Todas las OT</option>';
            ordenes.forEach(ot => {
                const num = ot.numeroOrden || ot.nombreOT;
                const opt = document.createElement('option');
                opt.value = num;
                opt.textContent = num;
                filtro.appendChild(opt);
            });
        }
    },

    setupMezclasEvents: function() {
        document.getElementById('btnAgregarComponente')?.addEventListener('click', () => this.agregarComponente());
        document.getElementById('btnGuardarMezcla')?.addEventListener('click', () => this.guardarMezcla());

        // Detectar Pantone existente al escribir
        const nombreInp = document.getElementById('mezclaNombre');
        if (nombreInp) {
            nombreInp.addEventListener('input', () => this.sugerirRecetaExistente());
            nombreInp.addEventListener('change', () => this.sugerirRecetaExistente());
        }

        // Filtros del historial
        ['filtroMezclaBusq', 'filtroMezclaOT', 'filtroMezclaVista'].forEach(id => {
            const el = document.getElementById(id);
            if (el) {
                el.addEventListener('input', () => this.renderMezclas());
                el.addEventListener('change', () => this.renderMezclas());
            }
        });
    },

    /** Muestra sugerencia si el Pantone escrito ya tiene una receta guardada */
    sugerirRecetaExistente: function() {
        const nombre = (document.getElementById('mezclaNombre')?.value || '').trim().toLowerCase();
        const sug = document.getElementById('sugerenciaReceta');
        if (!nombre || !sug) { if (sug) sug.style.display = 'none'; return; }
        const existente = (this._mezclas || []).find(m =>
            (m.nombre || '').toLowerCase() === nombre
        );
        if (existente) {
            this._recetaSugerida = existente;
            document.getElementById('sugPantone').textContent = existente.nombre;
            sug.style.display = '';
        } else {
            sug.style.display = 'none';
            this._recetaSugerida = null;
        }
    },

    /** Carga una receta existente en el formulario */
    reutilizarReceta: function() {
        const r = this._recetaSugerida;
        if (!r) return;
        document.getElementById('mezclaTipo').value = r.tipo || 'laminacion';
        document.getElementById('mezclaSolvente').value = r.solvente || '';
        document.getElementById('mezclaSolventeCant').value = r.solventeCant || 0;
        document.getElementById('mezclaNotas').value = r.notas ? `[Reutilizada de mezcla ${r.id}]\n${r.notas}` : '';

        // Limpiar componentes actuales
        const cont = document.getElementById('mezclaComponentes');
        if (cont) cont.innerHTML = '';
        this._componenteCount = 0;

        (r.componentes || []).forEach(c => {
            this.agregarComponente();
            const rows = document.querySelectorAll('.mezcla-item');
            const last = rows[rows.length - 1];
            if (last) {
                last.querySelector('.comp-nombre').value = c.nombre;
                last.querySelector('.comp-kg').value = c.kg;
            }
        });
        this.mostrarToast('Receta cargada. Modifica y asocia a la OT actual.', 'info');
    },

    agregarComponente: function() {
        const container = document.getElementById('mezclaComponentes');
        if (!container) return;

        this._componenteCount++;
        const idx = this._componenteCount;

        const html = `
            <div class="mezcla-item d-flex gap-2 align-items-center" id="comp_${idx}">
                <input type="text" class="form-control form-control-sm comp-nombre" placeholder="Nombre tinta" style="flex:2;">
                <input type="number" class="form-control form-control-sm comp-kg" placeholder="Kg" step="0.01" min="0" style="flex:1;">
                <button class="btn btn-sm btn-outline-danger" onclick="document.getElementById('comp_${idx}').remove();">
                    <i class="bi bi-x"></i>
                </button>
            </div>`;
        container.insertAdjacentHTML('beforeend', html);
    },

    recopilarComponentes: function() {
        const items = [];
        document.querySelectorAll('.mezcla-item').forEach(el => {
            const nombre = el.querySelector('.comp-nombre')?.value?.trim();
            const kg = parseFloat(el.querySelector('.comp-kg')?.value) || 0;
            if (nombre && kg > 0) {
                items.push({ nombre, kg });
            }
        });
        return items;
    },

    guardarMezcla: async function() {
        const nombre = document.getElementById('mezclaNombre')?.value?.trim();
        if (!nombre) {
            this.mostrarToast('El nombre de la mezcla es requerido', 'warning');
            return;
        }

        const componentes = this.recopilarComponentes();
        if (componentes.length === 0) {
            this.mostrarToast('Agrega al menos un componente con Kg', 'warning');
            return;
        }

        const totalKg = componentes.reduce((sum, c) => sum + c.kg, 0);

        const mezcla = {
            nombre: nombre,
            tipo: document.getElementById('mezclaTipo')?.value || 'laminacion',
            numero_ot: document.getElementById('mezclaOT')?.value || null,
            componentes: componentes,
            solvente: document.getElementById('mezclaSolvente')?.value || null,
            solvente_cantidad: parseFloat(document.getElementById('mezclaSolventeCant')?.value) || 0,
            total_kg: totalKg,
            notas: document.getElementById('mezclaNotas')?.value || '',
            creado_por: (typeof Auth !== 'undefined' && Auth.getUser()) ? Auth.getUser().id : null,
            creado_por_nombre: (typeof Auth !== 'undefined' && Auth.getUser()) ? Auth.getUser().nombre : 'Unknown',
        };

        try {
            if (typeof AxonesDB !== 'undefined' && AxonesDB.isReady()) {
                await AxonesDB.client.from('tintas_mezclas').insert(mezcla);
            } else {
                let mezclas = [];
                try {
                    const { data } = await AxonesDB.client.from('sync_store').select('value').eq('key', 'axones_tintas_mezclas').single();
                    mezclas = (data && data.value) ? (typeof data.value === 'string' ? JSON.parse(data.value) : data.value) : [];
                } catch (e) { /* empty */ }
                mezcla.id = 'MEZ_' + Date.now();
                mezcla.created_at = new Date().toISOString();
                mezclas.unshift(mezcla);
                await AxonesDB.client.from('sync_store').upsert({ key: 'axones_tintas_mezclas', value: mezclas, updated_at: new Date().toISOString() }, { onConflict: 'key' });
            }

            this.mostrarToast('Mezcla guardada correctamente', 'success');
            this.limpiarFormMezcla();
            this.renderMezclas();
        } catch (err) {
            console.error('Error guardando mezcla:', err);
            this.mostrarToast('Error al guardar mezcla', 'danger');
        }
    },

    limpiarFormMezcla: function() {
        ['mezclaNombre', 'mezclaOT', 'mezclaNotas'].forEach(id => {
            const el = document.getElementById(id);
            if (el) el.value = '';
        });
        document.getElementById('mezclaSolventeCant').value = '0';
        document.getElementById('mezclaSolvente').value = '';
        document.getElementById('mezclaTipo').value = 'laminacion';

        const container = document.getElementById('mezclaComponentes');
        if (container) container.innerHTML = '';
        this._componenteCount = 0;
        this.agregarComponente();
    },

    renderMezclas: async function() {
        const container = document.getElementById('listaMezclas');
        if (!container) return;

        let mezclas = [];
        try {
            if (typeof AxonesDB !== 'undefined' && AxonesDB.isReady()) {
                const { data } = await AxonesDB.client
                    .from('tintas_mezclas')
                    .select('*')
                    .eq('activo', true)
                    .order('created_at', { ascending: false })
                    .limit(50);
                mezclas = data || [];
            } else {
                try {
                    const { data } = await AxonesDB.client.from('sync_store').select('value').eq('key', 'axones_tintas_mezclas').single();
                    mezclas = (data && data.value) ? (typeof data.value === 'string' ? JSON.parse(data.value) : data.value) : [];
                } catch (e) { mezclas = []; }
            }
        } catch (err) {
            console.error('Error cargando mezclas:', err);
            mezclas = [];
        }

        // Guardar cache y poblar datalist de Pantones existentes
        this._mezclas = mezclas;
        const dl = document.getElementById('dlPantonesExistentes');
        if (dl) {
            const nombres = [...new Set(mezclas.map(m => m.nombre).filter(Boolean))];
            dl.innerHTML = nombres.map(n => `<option value="${n}">`).join('');
        }

        // Actualizar contador
        const count = document.getElementById('countMezclas');
        if (count) count.textContent = mezclas.length;

        // Filtros
        const busq = (document.getElementById('filtroMezclaBusq')?.value || '').toLowerCase();
        const filtroOT = document.getElementById('filtroMezclaOT')?.value || '';
        const vista = document.getElementById('filtroMezclaVista')?.value || 'por-ot';

        let filtradas = mezclas;
        if (filtroOT) filtradas = filtradas.filter(m => m.numero_ot === filtroOT);
        if (busq) filtradas = filtradas.filter(m =>
            (m.nombre || '').toLowerCase().includes(busq) ||
            (m.numero_ot || '').toLowerCase().includes(busq) ||
            (m.componentes || []).some(c => (c.nombre || '').toLowerCase().includes(busq))
        );

        if (filtradas.length === 0) {
            container.innerHTML = '<p class="text-muted text-center py-3">No hay mezclas con estos filtros</p>';
            return;
        }

        const renderItem = (m) => {
            const comps = (m.componentes || []).map(c =>
                `<span class="badge bg-light text-dark me-1">${c.nombre}: ${c.kg} Kg</span>`
            ).join('');
            const fecha = m.created_at ? new Date(m.created_at).toLocaleDateString('es-VE') : '-';
            const solvInfo = m.solvente ? `<small class="text-muted">Solvente: ${m.solvente} (${m.solvente_cantidad || m.solventeCant || 0} Lt)</small>` : '';
            return `
                <div class="mezcla-item">
                    <div class="d-flex justify-content-between align-items-start">
                        <div>
                            <strong>${m.nombre}</strong>
                            <span class="badge bg-${m.tipo === 'laminacion' ? 'primary' : 'warning'} ms-2">${m.tipo}</span>
                            ${m.numero_ot ? '<span class="badge bg-secondary ms-1">' + m.numero_ot + '</span>' : ''}
                        </div>
                        <div>
                            <strong>${(m.total_kg || 0).toFixed(2)} Kg</strong>
                            <button class="btn btn-sm btn-outline-primary ms-1 btn-reutilizar-mezcla" data-id="${m.id}" title="Reutilizar esta receta">
                                <i class="bi bi-arrow-repeat"></i>
                            </button>
                            <button class="btn btn-sm btn-outline-danger btn-eliminar-mezcla" data-id="${m.id}" title="Eliminar">
                                <i class="bi bi-trash"></i>
                            </button>
                        </div>
                    </div>
                    <div class="mt-1">${comps}</div>
                    ${solvInfo}
                    <div class="mt-1">
                        <small class="text-muted">${fecha} - ${m.creado_por_nombre || 'Sistema'}</small>
                        ${m.notas ? '<br><small class="text-muted fst-italic">' + m.notas + '</small>' : ''}
                    </div>
                </div>`;
        };

        if (vista === 'por-ot') {
            const grupos = {};
            filtradas.forEach(m => {
                const k = m.numero_ot || 'Sin OT (general)';
                (grupos[k] = grupos[k] || []).push(m);
            });
            container.innerHTML = Object.entries(grupos).map(([ot, items]) => `
                <div class="mb-3">
                    <h6 class="mt-2 mb-1 text-primary"><i class="bi bi-clipboard-check me-1"></i>${ot} <span class="badge bg-primary">${items.length}</span></h6>
                    ${items.map(renderItem).join('')}
                </div>
            `).join('');
        } else if (vista === 'por-pantone') {
            const grupos = {};
            filtradas.forEach(m => {
                const k = m.nombre || 'Sin nombre';
                (grupos[k] = grupos[k] || []).push(m);
            });
            container.innerHTML = Object.entries(grupos).map(([pantone, items]) => `
                <div class="mb-3">
                    <h6 class="mt-2 mb-1"><i class="bi bi-palette me-1"></i>${pantone} <span class="badge bg-secondary">${items.length} uso(s)</span></h6>
                    ${items.map(renderItem).join('')}
                </div>
            `).join('');
        } else {
            container.innerHTML = filtradas.map(renderItem).join('');
        }

        // Reutilizar receta desde historial
        container.querySelectorAll('.btn-reutilizar-mezcla').forEach(btn => {
            btn.addEventListener('click', () => {
                const mezcla = (this._mezclas || []).find(m => String(m.id) === btn.dataset.id);
                if (mezcla) {
                    this._recetaSugerida = mezcla;
                    document.getElementById('mezclaNombre').value = mezcla.nombre;
                    this.reutilizarReceta();
                    document.getElementById('mezclaNombre')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
                }
            });
        });

        // Eliminar mezcla
        container.querySelectorAll('.btn-eliminar-mezcla').forEach(btn => {
            btn.addEventListener('click', async () => {
                if (!confirm('¿Eliminar esta mezcla?')) return;
                try {
                    if (typeof AxonesDB !== 'undefined' && AxonesDB.isReady()) {
                        await AxonesDB.client.from('tintas_mezclas').update({ activo: false }).eq('id', btn.dataset.id);
                    } else {
                        let mezclas = [];
                        try {
                            const { data } = await AxonesDB.client.from('sync_store').select('value').eq('key', 'axones_tintas_mezclas').single();
                            mezclas = (data && data.value) ? (typeof data.value === 'string' ? JSON.parse(data.value) : data.value) : [];
                        } catch (e) { /* empty */ }
                        mezclas = mezclas.filter(m => m.id !== btn.dataset.id);
                        await AxonesDB.client.from('sync_store').upsert({ key: 'axones_tintas_mezclas', value: mezclas, updated_at: new Date().toISOString() }, { onConflict: 'key' });
                    }
                    this.mostrarToast('Mezcla eliminada', 'success');
                    this.renderMezclas();
                } catch (err) {
                    this.mostrarToast('Error al eliminar', 'danger');
                }
            });
        });
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
