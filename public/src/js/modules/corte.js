/**
 * Modulo Control de Corte - Sistema Axones
 * Maneja el formulario digital de Control de Produccion de Corte
 * Actualizado para 4 paletas con 48 bobinas cada una
 */

const Corte = {
    // Configuracion de paletas
    NUM_PALETAS: 4,
    BOBINAS_POR_PALETA: 48,

    // Orden cargada desde el modulo de ordenes
    ordenCargada: null,

    /**
     * Inicializa el modulo
     */
    init: function() {
        console.log('Inicializando modulo Control de Corte');

        this.setDefaultDate();
        this.generarInputsPaletas();
        this.setupEventListeners();
        this.setupCalculations();

        // Verificar si viene de una orden y cargar datos automaticamente
        this.cargarDesdeOrden();

        // Inicializar controles de tiempo
        this.inicializarControlTiempo();
    },

    /**
     * Inicializa los controles de tiempo (Play/Pausa/Completado)
     */
    inicializarControlTiempo: function() {
        const form = document.getElementById('formCorte');
        if (!form || document.getElementById('controlTiempoCorte')) return;

        const panelHTML = `
            <div id="controlTiempoCorte" class="card mb-3 border-success">
                <div class="card-header bg-success text-white py-2">
                    <div class="d-flex align-items-center justify-content-between">
                        <span><i class="bi bi-stopwatch me-2"></i>Control de Tiempo - Corte</span>
                        <span id="ordenActivaCorte" class="badge bg-light text-success">Sin orden</span>
                    </div>
                </div>
                <div class="card-body py-2" id="contenedorControlTiempoCorte" data-orden-id="" data-fase="corte">
                    <div class="text-center text-muted py-3">
                        <i class="bi bi-info-circle me-2"></i>
                        Seleccione o ingrese una orden de trabajo para activar el cronometro
                    </div>
                </div>
            </div>
        `;

        form.insertAdjacentHTML('afterbegin', panelHTML);
    },

    /**
     * Actualiza el control de tiempo cuando se carga una orden
     */
    actualizarControlTiempo: function(ordenId, numeroOrden) {
        const contenedor = document.getElementById('contenedorControlTiempoCorte');
        const labelOrden = document.getElementById('ordenActivaCorte');

        if (!contenedor) return;

        if (ordenId && typeof ControlTiempo !== 'undefined') {
            contenedor.setAttribute('data-orden-id', ordenId);
            labelOrden.textContent = numeroOrden || ordenId;
            ControlTiempo.renderControles(ordenId, 'corte', 'contenedorControlTiempoCorte');
        } else {
            contenedor.innerHTML = `
                <div class="text-center text-muted py-3">
                    <i class="bi bi-info-circle me-2"></i>
                    Seleccione o ingrese una orden de trabajo para activar el cronometro
                </div>
            `;
            labelOrden.textContent = 'Sin orden';
        }
    },

    /**
     * Carga datos desde una orden si viene con parametros en la URL
     */
    cargarDesdeOrden: function() {
        const params = new URLSearchParams(window.location.search);
        const ot = params.get('ot');

        if (ot) {
            console.log('Cargando datos desde orden:', ot);

            let ordenes = [];
            try {
                ordenes = JSON.parse(localStorage.getItem('axones_ordenes_trabajo') || '[]');
            } catch (e) {
                console.warn('Error parseando ordenes:', e);
                ordenes = [];
            }
            const orden = ordenes.find(o => o.ot === ot);

            if (orden) {
                this.ordenCargada = orden;
                this.precargarCamposOrden(orden);
                this.mostrarBannerOrdenCargada(orden);
            } else {
                this.precargarDesdeParametros(params);
            }
        }

        this.agregarSelectorOrdenes();
    },

    /**
     * Precarga campos del formulario desde una orden
     */
    precargarCamposOrden: function(orden) {
        const camposOrden = {
            'ordenTrabajo': orden.ot || orden.numeroOrden,
            'cliente': orden.cliente,
            'producto': orden.producto
        };

        Object.entries(camposOrden).forEach(([campo, valor]) => {
            const input = document.getElementById(campo);
            if (input && valor) {
                input.value = valor;
                input.classList.add('precargado-orden');
                input.setAttribute('readonly', true);
                input.style.backgroundColor = '#e8f4e8';
            }
        });

        const clienteSelect = document.getElementById('cliente');
        if (clienteSelect && orden.cliente) {
            clienteSelect.value = orden.cliente;
        }

        // Actualizar control de tiempo
        this.actualizarControlTiempo(orden.id || orden.ot, orden.numeroOrden || orden.ot);
    },

    /**
     * Precarga desde parametros de URL
     */
    precargarDesdeParametros: function(params) {
        const mapping = {
            'ot': 'ordenTrabajo',
            'cliente': 'cliente',
            'producto': 'producto'
        };

        Object.entries(mapping).forEach(([param, campo]) => {
            const valor = params.get(param);
            if (valor) {
                const input = document.getElementById(campo);
                if (input) {
                    input.value = valor;
                    input.classList.add('precargado-orden');
                    input.setAttribute('readonly', true);
                    input.style.backgroundColor = '#e8f4e8';
                }
            }
        });
    },

    /**
     * Muestra banner indicando que se cargo una orden
     */
    mostrarBannerOrdenCargada: function(orden) {
        const form = document.getElementById('formCorte');
        if (!form || document.getElementById('bannerOrdenCargada')) return;

        const banner = document.createElement('div');
        banner.id = 'bannerOrdenCargada';
        banner.className = 'alert alert-success py-2 mb-3';
        banner.innerHTML = `
            <div class="d-flex align-items-center justify-content-between">
                <div>
                    <i class="bi bi-clipboard-check me-2"></i>
                    <strong>Orden cargada:</strong> ${orden.ot} - ${orden.cliente}
                    <br><small class="text-muted">Los campos verdes estan precargados. Solo complete los campos restantes.</small>
                </div>
                <button type="button" class="btn btn-sm btn-outline-secondary" onclick="Corte.descargarOrden()">
                    <i class="bi bi-x-circle me-1"></i>Descargar orden
                </button>
            </div>
        `;

        const firstSection = form.querySelector('.form-section');
        if (firstSection) {
            firstSection.parentNode.insertBefore(banner, firstSection);
        }
    },

    /**
     * Descarga la orden y limpia campos precargados
     */
    descargarOrden: function() {
        this.ordenCargada = null;

        document.querySelectorAll('.precargado-orden').forEach(input => {
            input.value = '';
            input.classList.remove('precargado-orden');
            input.removeAttribute('readonly');
            input.style.backgroundColor = '';
        });

        const banner = document.getElementById('bannerOrdenCargada');
        if (banner) banner.remove();

        window.history.replaceState({}, document.title, window.location.pathname);
    },

    /**
     * Agrega selector de ordenes pendientes al formulario
     */
    agregarSelectorOrdenes: function() {
        const otInput = document.getElementById('ordenTrabajo');
        if (!otInput || document.getElementById('selectorOrden')) return;

        let ordenes = [];
        try {
            ordenes = JSON.parse(localStorage.getItem('axones_ordenes_trabajo') || '[]');
        } catch (e) {
            console.warn('Error parseando ordenes:', e);
            return;
        }

        // Filtrar ordenes pendientes (usan estadoOrden y maquina con Cortadora)
        const ordenesPendientes = ordenes.filter(o =>
            o.estadoOrden !== 'completada' &&
            (o.maquina?.includes('Cortadora') || !o.maquina)
        );

        if (ordenesPendientes.length === 0) return;

        const grupo = otInput.closest('.col-md-3, .col-md-4, .mb-3');
        if (!grupo) return;

        const selectorDiv = document.createElement('div');
        selectorDiv.id = 'selectorOrden';
        selectorDiv.className = 'mt-1';
        selectorDiv.innerHTML = `
            <select class="form-select form-select-sm" id="selectOrdenPendiente">
                <option value="">-- Seleccionar orden pendiente --</option>
                ${ordenesPendientes.map(o => `
                    <option value="${o.numeroOrden || o.ot}" data-orden='${JSON.stringify(o).replace(/'/g, "&#39;")}'>
                        ${o.numeroOrden || o.ot} - ${o.cliente} - ${o.producto}
                    </option>
                `).join('')}
            </select>
            <small class="text-muted">O ingrese una OT manualmente arriba</small>
        `;

        grupo.appendChild(selectorDiv);

        // Event listener (elemento ya existe en DOM)
        const selectElement = document.getElementById('selectOrdenPendiente');
        if (selectElement) {
            selectElement.addEventListener('change', (e) => {
                if (e.target.value) {
                    const option = e.target.selectedOptions[0];
                    try {
                        const orden = JSON.parse(option.dataset.orden.replace(/&#39;/g, "'"));
                        this.ordenCargada = orden;
                        this.precargarCamposOrden(orden);
                        this.mostrarBannerOrdenCargada(orden);
                    } catch (err) {
                        console.warn('Error parseando orden seleccionada:', err);
                    }
                }
            });
        }
    },

    /**
     * Establece la fecha actual por defecto
     */
    setDefaultDate: function() {
        const fechaInput = document.getElementById('fecha');
        if (fechaInput) {
            fechaInput.value = new Date().toISOString().split('T')[0];
        }
    },

    /**
     * Genera los inputs de bobinas para cada paleta
     */
    generarInputsPaletas: function() {
        for (let p = 1; p <= this.NUM_PALETAS; p++) {
            const container = document.getElementById(`paleta${p}Container`);
            if (!container) continue;

            let html = '';
            for (let b = 1; b <= this.BOBINAS_POR_PALETA; b++) {
                html += `
                    <div class="paleta-col">
                        <span class="paleta-bobina-label">${b}</span>
                        <input type="number" class="form-control form-control-sm paleta-bobina bobina-paleta${p}"
                               id="p${p}b${b}" step="0.01" min="0" placeholder="0">
                    </div>
                `;
            }
            container.innerHTML = html;
        }
    },

    /**
     * Configura los event listeners
     */
    setupEventListeners: function() {
        // Boton guardar
        const btnGuardar = document.getElementById('btnGuardar');
        if (btnGuardar) {
            btnGuardar.addEventListener('click', (e) => {
                e.preventDefault();
                this.guardar();
            });
        }

        // Boton limpiar
        const btnLimpiar = document.getElementById('btnLimpiar');
        if (btnLimpiar) {
            btnLimpiar.addEventListener('click', () => this.limpiar());
        }

        // Submit del formulario
        const form = document.getElementById('formCorte');
        if (form) {
            form.addEventListener('submit', (e) => {
                e.preventDefault();
                this.guardar();
            });
        }
    },

    /**
     * Configura los calculos automaticos
     */
    setupCalculations: function() {
        // Calcular total de bobinas de entrada
        document.querySelectorAll('.bobina-entrada').forEach(input => {
            input.addEventListener('input', () => this.calcularTotales());
        });

        // Calcular con bobinas de salida (paletas)
        for (let p = 1; p <= this.NUM_PALETAS; p++) {
            document.querySelectorAll(`.bobina-paleta${p}`).forEach(input => {
                input.addEventListener('input', () => this.calcularTotalesPaleta(p));
            });
        }

        // Calcular total de scrap
        document.querySelectorAll('.scrap-input').forEach(input => {
            input.addEventListener('input', () => this.calcularTotales());
        });
    },

    /**
     * Calcula los totales de una paleta especifica
     */
    calcularTotalesPaleta: function(numPaleta) {
        let total = 0;
        let count = 0;

        document.querySelectorAll(`.bobina-paleta${numPaleta}`).forEach(input => {
            const valor = parseFloat(input.value) || 0;
            if (valor > 0) {
                total += valor;
                count++;
            }
        });

        // Actualizar total de la paleta
        const totalInput = document.getElementById(`totalPaleta${numPaleta}`);
        if (totalInput) {
            totalInput.value = total.toFixed(2);
        }

        // Actualizar contador de bobinas
        const countBadge = document.getElementById(`countPaleta${numPaleta}`);
        if (countBadge) {
            countBadge.textContent = `${count}/${this.BOBINAS_POR_PALETA}`;
        }

        // Actualizar resumen
        const resumenBob = document.getElementById(`resumenBob${numPaleta}`);
        const resumenPeso = document.getElementById(`resumenPeso${numPaleta}`);
        if (resumenBob) resumenBob.textContent = count;
        if (resumenPeso) resumenPeso.textContent = total.toFixed(2);

        // Recalcular totales generales
        this.calcularTotales();
    },

    /**
     * Calcula todos los totales
     */
    calcularTotales: function() {
        // Total bobinas de entrada
        let totalEntrada = 0;
        document.querySelectorAll('.bobina-entrada').forEach(input => {
            totalEntrada += parseFloat(input.value) || 0;
        });
        document.getElementById('totalEntrada').value = totalEntrada.toFixed(2);

        // Totales de salida (suma de todas las paletas)
        let pesoSalida = 0;
        let bobinasSalida = 0;
        let paletasUsadas = 0;

        for (let p = 1; p <= this.NUM_PALETAS; p++) {
            let totalPaleta = 0;
            let countPaleta = 0;

            document.querySelectorAll(`.bobina-paleta${p}`).forEach(input => {
                const valor = parseFloat(input.value) || 0;
                if (valor > 0) {
                    totalPaleta += valor;
                    countPaleta++;
                }
            });

            pesoSalida += totalPaleta;
            bobinasSalida += countPaleta;
            if (countPaleta > 0) paletasUsadas++;
        }

        // Actualizar campos de resumen
        document.getElementById('pesoTotalSalida').value = pesoSalida.toFixed(2);
        document.getElementById('numBobinasSalida').value = bobinasSalida;
        document.getElementById('numPaletas').value = paletasUsadas;

        // Actualizar resumen total
        const resumenBobTotal = document.getElementById('resumenBobTotal');
        const resumenPesoTotal = document.getElementById('resumenPesoTotal');
        if (resumenBobTotal) resumenBobTotal.textContent = bobinasSalida;
        if (resumenPesoTotal) resumenPesoTotal.textContent = pesoSalida.toFixed(2);

        // Total scrap
        const scrapRefile = parseFloat(document.getElementById('scrapRefile').value) || 0;
        const scrapImpreso = parseFloat(document.getElementById('scrapImpreso').value) || 0;
        const totalScrap = scrapRefile + scrapImpreso;
        document.getElementById('totalScrap').value = totalScrap.toFixed(2);

        // Merma
        const merma = totalEntrada - pesoSalida - totalScrap;
        document.getElementById('merma').value = merma.toFixed(2);

        // Porcentaje de Refil
        let porcentajeRefil = 0;
        if (totalEntrada > 0) {
            porcentajeRefil = ((merma + totalScrap) / totalEntrada) * 100;
        }
        document.getElementById('porcentajeRefil').value = porcentajeRefil.toFixed(2) + '%';

        // Actualizar indicador
        this.actualizarIndicadorRefil(porcentajeRefil, totalEntrada);

        // Actualizar footer
        document.getElementById('footerEntrada').textContent = totalEntrada.toFixed(0);
        document.getElementById('footerSalida').textContent = pesoSalida.toFixed(0);
        document.getElementById('footerMerma').textContent = merma.toFixed(2);
        document.getElementById('footerRefil').textContent = porcentajeRefil.toFixed(2);
        document.getElementById('footerPaletas').textContent = paletasUsadas;
        document.getElementById('footerBobinas').textContent = bobinasSalida;
    },

    /**
     * Actualiza el indicador visual de refil
     */
    actualizarIndicadorRefil: function(porcentaje, totalEntrada) {
        const indicador = document.getElementById('indicadorRefil');
        if (!indicador) return;

        if (totalEntrada === 0) {
            indicador.className = 'alert alert-secondary py-1 px-2 mb-0 small text-center';
            indicador.innerHTML = '<i class="bi bi-dash-circle me-1"></i> Sin datos';
            return;
        }

        const umbral = CONFIG.UMBRALES_REFIL.default;

        if (porcentaje <= umbral.advertencia) {
            indicador.className = 'alert alert-success py-1 px-2 mb-0 small text-center';
            indicador.innerHTML = '<i class="bi bi-check-circle me-1"></i> Refil OK';
        } else if (porcentaje <= umbral.maximo) {
            indicador.className = 'alert alert-warning py-1 px-2 mb-0 small text-center';
            indicador.innerHTML = '<i class="bi bi-exclamation-triangle me-1"></i> Refil en advertencia';
        } else {
            indicador.className = 'alert alert-danger py-1 px-2 mb-0 small text-center';
            indicador.innerHTML = '<i class="bi bi-x-circle me-1"></i> Refil excedido';
        }
    },

    /**
     * Valida campos requeridos con mensajes personalizados
     */
    validarCamposRequeridos: function() {
        const errores = [];
        const fecha = document.getElementById('fecha')?.value;
        const turno = document.querySelector('input[name="turno"]:checked');
        const maquina = document.getElementById('maquina')?.value;
        const ordenTrabajo = document.getElementById('ordenTrabajo')?.value;
        const operador = document.getElementById('operador')?.value;

        if (!fecha) errores.push('Fecha es requerida');
        if (!turno) errores.push('Seleccione un turno');
        if (!maquina) errores.push('Seleccione una maquina');
        if (!ordenTrabajo || ordenTrabajo.trim().length < 3) errores.push('Ingrese la orden de trabajo (minimo 3 caracteres)');
        if (!operador || operador.trim().length < 3) errores.push('Ingrese el nombre del operador (minimo 3 caracteres)');

        // Validar que haya al menos una bobina de entrada
        let totalEntrada = 0;
        for (let i = 1; i <= 14; i++) {
            totalEntrada += parseFloat(document.getElementById('bob' + i)?.value) || 0;
        }
        if (totalEntrada <= 0) errores.push('Ingrese al menos una bobina de entrada');

        return errores;
    },

    /**
     * Guarda el registro
     */
    guardar: async function() {
        // Validacion personalizada
        const errores = this.validarCamposRequeridos();
        if (errores.length > 0) {
            this.mostrarToast('Errores: ' + errores.join(', '), 'danger');
            return;
        }

        const form = document.getElementById('formCorte');
        if (!form.checkValidity()) {
            form.reportValidity();
            return;
        }

        if (!Auth.isAuthenticated()) {
            Axones.showError('Debe iniciar sesion para guardar registros');
            return;
        }

        const datos = this.recopilarDatos();

        // Mostrar indicador de carga
        const btnGuardar = document.getElementById('btnGuardar');
        const btnText = btnGuardar ? btnGuardar.innerHTML : '';
        if (btnGuardar) {
            btnGuardar.disabled = true;
            btnGuardar.innerHTML = '<span class="spinner-border spinner-border-sm me-1"></span>Guardando...';
        }

        try {
            // Preparar datos para API
            const datosAPI = {
                fecha: datos.fecha,
                turno: datos.turno,
                maquina: datos.maquina,
                proceso: 'corte',
                cliente: datos.cliente || '',
                producto: datos.producto || '',
                ot: datos.ordenTrabajo,
                kilos_producidos: datos.totalSalida || 0,
                kilos_entrada: datos.totalEntrada || 0,
                refil_kg: datos.merma || 0,
                tiempo_trabajo_min: datos.tiempoEfectivo || 0,
                tiempo_muerto_min: datos.tiempoMuerto || 0,
                operador: datos.operador,
                observaciones: datos.observaciones || ''
            };

            const result = await AxonesAPI.createProduccion(datosAPI);

            if (result.success) {
                this.mostrarToast('Registro de corte guardado en Google Sheets (ID: ' + result.id + ')', 'success');
                this.guardarLocal(datos);

                // Descontar material del inventario
                this.descontarInventario(datos);

                const porcentajeRefil = parseFloat(datos.porcentajeRefil) || 0;
                const umbral = CONFIG.UMBRALES_REFIL.default;
                if (porcentajeRefil > umbral.maximo) {
                    this.generarAlerta(datos);
                }
            } else {
                throw new Error(result.error || 'Error desconocido');
            }
        } catch (error) {
            console.error('Error guardando registro:', error);
            this.guardarLocal(datos);
            Axones.showWarning('Guardado localmente: ' + error.message);
        } finally {
            if (btnGuardar) {
                btnGuardar.disabled = false;
                btnGuardar.innerHTML = btnText;
            }
        }
    },

    /**
     * Recopila todos los datos del formulario
     */
    recopilarDatos: function() {
        const turnoSeleccionado = document.querySelector('input[name="turno"]:checked');

        // Obtener bobinas de entrada
        const bobinasEntrada = [];
        for (let i = 1; i <= 14; i++) {
            const valor = parseFloat(document.getElementById('bob' + i).value) || 0;
            if (valor > 0) {
                bobinasEntrada.push({ posicion: i, peso: valor });
            }
        }

        // Obtener bobinas de salida por paleta
        const paletas = [];
        for (let p = 1; p <= this.NUM_PALETAS; p++) {
            const bobinas = [];
            let totalPaleta = 0;

            for (let b = 1; b <= this.BOBINAS_POR_PALETA; b++) {
                const input = document.getElementById(`p${p}b${b}`);
                const valor = input ? parseFloat(input.value) || 0 : 0;
                if (valor > 0) {
                    bobinas.push({ posicion: b, peso: valor });
                    totalPaleta += valor;
                }
            }

            paletas.push({
                numero: p,
                bobinas: bobinas,
                totalBobinas: bobinas.length,
                pesoTotal: totalPaleta,
            });
        }

        return {
            id: 'COR_' + Date.now(),
            timestamp: new Date().toISOString(),
            tipo: 'corte',

            turno: turnoSeleccionado ? turnoSeleccionado.value : '',
            producto: document.getElementById('producto').value,
            maquina: document.getElementById('maquina').value,
            fecha: document.getElementById('fecha').value,
            ordenTrabajo: document.getElementById('ordenTrabajo').value,
            operador: document.getElementById('operador').value,
            ayudante: document.getElementById('ayudante').value,
            supervisor: document.getElementById('supervisor').value,
            horaInicio: document.getElementById('horaInicio').value,
            horaArranque: document.getElementById('horaArranque').value,
            horaFinal: document.getElementById('horaFinal').value,

            bobinasEntrada: bobinasEntrada,
            totalEntrada: parseFloat(document.getElementById('totalEntrada').value) || 0,

            paletas: paletas,
            numPaletas: parseInt(document.getElementById('numPaletas').value) || 0,
            numBobinasSalida: parseInt(document.getElementById('numBobinasSalida').value) || 0,
            pesoTotalSalida: parseFloat(document.getElementById('pesoTotalSalida').value) || 0,
            merma: parseFloat(document.getElementById('merma').value) || 0,

            scrapRefile: parseFloat(document.getElementById('scrapRefile').value) || 0,
            scrapImpreso: parseFloat(document.getElementById('scrapImpreso').value) || 0,
            totalScrap: parseFloat(document.getElementById('totalScrap').value) || 0,
            porcentajeRefil: parseFloat(document.getElementById('porcentajeRefil').value) || 0,

            motivosParadas: document.getElementById('motivosParadas').value,
            observaciones: document.getElementById('observaciones').value,

            registradoPor: Auth.getUser() ? Auth.getUser().id : 'unknown',
            registradoPorNombre: Auth.getUser() ? Auth.getUser().nombre : 'Unknown',
        };
    },

    /**
     * Muestra un toast de notificacion
     */
    mostrarToast: function(mensaje, tipo = 'info') {
        let container = document.querySelector('.toast-container');
        if (!container) {
            container = document.createElement('div');
            container.className = 'toast-container position-fixed bottom-0 end-0 p-3';
            document.body.appendChild(container);
        }

        const bgClass = tipo === 'success' ? 'bg-success' : tipo === 'warning' ? 'bg-warning' : tipo === 'danger' ? 'bg-danger' : 'bg-info';
        const textClass = tipo === 'warning' ? 'text-dark' : 'text-white';

        const toastHtml = `
            <div class="toast align-items-center ${bgClass} ${textClass} border-0" role="alert">
                <div class="d-flex">
                    <div class="toast-body">${mensaje}</div>
                    <button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast"></button>
                </div>
            </div>
        `;

        container.insertAdjacentHTML('beforeend', toastHtml);
        const toastEl = container.lastElementChild;
        const toast = new bootstrap.Toast(toastEl, { autohide: true, delay: 5000 });
        toast.show();
        toastEl.addEventListener('hidden.bs.toast', () => toastEl.remove());
    },

    /**
     * Guarda en localStorage
     */
    guardarLocal: function(datos) {
        const registros = JSON.parse(localStorage.getItem(CONFIG.CACHE.PREFIJO + 'corte') || '[]');
        registros.unshift(datos);
        localStorage.setItem(CONFIG.CACHE.PREFIJO + 'corte', JSON.stringify(registros));
    },

    /**
     * Descuenta material del inventario despues de corte
     */
    descontarInventario: function(datos) {
        try {
            const inventario = JSON.parse(localStorage.getItem('axones_inventario') || '[]');
            const cantidadUsada = parseFloat(datos.totalEntrada) || 0;

            if (cantidadUsada <= 0) return;

            let descontado = false;
            let restante = cantidadUsada;

            for (let i = 0; i < inventario.length && restante > 0; i++) {
                const item = inventario[i];

                // Intentar coincidir por producto o cliente
                const coincideProducto = item.producto &&
                    (item.producto.toLowerCase().includes(datos.producto?.toLowerCase() || '') ||
                     datos.producto?.toLowerCase().includes(item.producto.toLowerCase()));

                if (coincideProducto || !item.producto) {
                    const disponible = parseFloat(item.kg) || 0;
                    if (disponible > 0) {
                        const aDescontar = Math.min(disponible, restante);
                        item.kg = disponible - aDescontar;
                        restante -= aDescontar;
                        descontado = true;
                        console.log(`Inventario (Corte): Descontados ${aDescontar} Kg de ${item.material} (Quedan: ${item.kg} Kg)`);
                    }
                }
            }

            if (descontado) {
                localStorage.setItem('axones_inventario', JSON.stringify(inventario));
                console.log('Inventario actualizado despues de corte');

                // Verificar stock bajo y generar alertas
                this.verificarStockBajo(inventario);
            }
        } catch (error) {
            console.warn('Error al descontar inventario en corte:', error);
        }
    },

    /**
     * Verifica si hay materiales con stock bajo y genera alertas
     */
    verificarStockBajo: function(inventario) {
        const STOCK_MINIMO = 200; // Kg
        const alertas = JSON.parse(localStorage.getItem('axones_alertas') || '[]');

        inventario.forEach(item => {
            if ((item.kg || 0) < STOCK_MINIMO && (item.kg || 0) > 0) {
                // Verificar si ya existe una alerta reciente para este material
                const alertaExistente = alertas.find(a =>
                    a.tipo === 'stock_bajo' &&
                    a.datos?.material === item.material &&
                    new Date(a.fecha) > new Date(Date.now() - 24 * 60 * 60 * 1000) // Ultimas 24 horas
                );

                if (!alertaExistente) {
                    alertas.unshift({
                        id: Date.now(),
                        tipo: 'stock_bajo',
                        nivel: item.kg < 50 ? 'danger' : 'warning',
                        mensaje: `Stock bajo en corte: ${item.material} ${item.micras || ''}µ - Quedan ${(item.kg || 0).toFixed(1)} Kg`,
                        fecha: new Date().toISOString(),
                        estado: 'pendiente',
                        datos: { material: item.material, cantidad: item.kg }
                    });
                    console.log('Alerta de stock bajo generada para', item.material);
                }
            }
        });

        localStorage.setItem('axones_alertas', JSON.stringify(alertas));
    },

    /**
     * Genera una alerta por refil excedido
     */
    generarAlerta: function(datos) {
        const alerta = {
            id: 'ALT_' + Date.now(),
            timestamp: new Date().toISOString(),
            tipo: CONFIG.ALERTAS.TIPOS.REFIL_ALTO,
            nivel: datos.porcentajeRefil > CONFIG.UMBRALES_REFIL.default.maximo * 1.5
                ? CONFIG.ALERTAS.NIVELES.CRITICAL
                : CONFIG.ALERTAS.NIVELES.WARNING,
            maquina: datos.maquina,
            operador: datos.operador,
            mensaje: `Refil ${datos.porcentajeRefil.toFixed(1)}% en Corte OT ${datos.ordenTrabajo}`,
            estado: 'pendiente',
            registro_id: datos.id,
        };

        const alertas = JSON.parse(localStorage.getItem(CONFIG.CACHE.PREFIJO + 'alertas') || '[]');
        alertas.unshift(alerta);
        localStorage.setItem(CONFIG.CACHE.PREFIJO + 'alertas', JSON.stringify(alertas));

        // Enviar alerta a API en background
        if (typeof AxonesAPI !== 'undefined') {
            AxonesAPI.createAlerta({
                tipo: alerta.tipo,
                nivel: alerta.nivel,
                maquina: alerta.maquina,
                ot: datos.ordenTrabajo,
                mensaje: alerta.mensaje,
                refil_porcentaje: datos.porcentajeRefil,
                producto: datos.producto || '',
                cliente: datos.cliente || '',
                operador: datos.operador
            }).then(result => {
                if (result.success) console.log('Alerta corte enviada a Sheets:', result.id);
            }).catch(e => console.warn('Error enviando alerta corte a API:', e));
        }

        Axones.showToast(
            `ALERTA: Refil ${datos.porcentajeRefil.toFixed(1)}% excedido en corte`,
            alerta.nivel === CONFIG.ALERTAS.NIVELES.CRITICAL ? 'danger' : 'warning'
        );
    },

    /**
     * Limpia el formulario
     */
    limpiar: function() {
        const form = document.getElementById('formCorte');
        if (form) {
            form.reset();
            this.setDefaultDate();

            document.getElementById('totalEntrada').value = '';
            document.getElementById('merma').value = '';
            document.getElementById('totalScrap').value = '';
            document.getElementById('porcentajeRefil').value = '';
            document.getElementById('pesoTotalSalida').value = '';
            document.getElementById('numBobinasSalida').value = '0';
            document.getElementById('numPaletas').value = '0';

            // Limpiar totales de paletas
            for (let p = 1; p <= this.NUM_PALETAS; p++) {
                const totalInput = document.getElementById(`totalPaleta${p}`);
                if (totalInput) totalInput.value = '0';

                const countBadge = document.getElementById(`countPaleta${p}`);
                if (countBadge) countBadge.textContent = `0/${this.BOBINAS_POR_PALETA}`;

                const resumenBob = document.getElementById(`resumenBob${p}`);
                const resumenPeso = document.getElementById(`resumenPeso${p}`);
                if (resumenBob) resumenBob.textContent = '0';
                if (resumenPeso) resumenPeso.textContent = '0.00';
            }

            // Limpiar resumen total
            const resumenBobTotal = document.getElementById('resumenBobTotal');
            const resumenPesoTotal = document.getElementById('resumenPesoTotal');
            if (resumenBobTotal) resumenBobTotal.textContent = '0';
            if (resumenPesoTotal) resumenPesoTotal.textContent = '0.00';

            const indicador = document.getElementById('indicadorRefil');
            if (indicador) {
                indicador.className = 'alert alert-secondary py-1 px-2 mb-0 small text-center';
                indicador.innerHTML = '<i class="bi bi-dash-circle me-1"></i> Sin datos';
            }

            document.getElementById('footerEntrada').textContent = '0';
            document.getElementById('footerSalida').textContent = '0';
            document.getElementById('footerMerma').textContent = '0';
            document.getElementById('footerRefil').textContent = '0';
            document.getElementById('footerPaletas').textContent = '0';
            document.getElementById('footerBobinas').textContent = '0';
        }
    },
};

// Inicializar cuando el DOM este listo
document.addEventListener('DOMContentLoaded', () => {
    if (document.getElementById('formCorte')) {
        Corte.init();
    }
});

// Exportar modulo
if (typeof module !== 'undefined' && module.exports) {
    module.exports = Corte;
}
