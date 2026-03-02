/**
 * Modulo Control de Laminacion - Sistema Axones
 * Maneja el formulario digital de Control de Produccion de Laminacion
 * Proceso intermedio entre Impresion y Corte
 */

const Laminacion = {
    // Cache de datos
    clientesCache: [],

    // Orden cargada desde el modulo de ordenes
    ordenCargada: null,

    /**
     * Inicializa el modulo
     */
    init: function() {
        console.log('Inicializando modulo Control de Laminacion');

        this.setDefaultDate();
        this.cargarClientes();
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
        const form = document.getElementById('formLaminacion');
        if (!form || document.getElementById('controlTiempoLaminacion')) return;

        const panelHTML = `
            <div id="controlTiempoLaminacion" class="card mb-3 border-warning">
                <div class="card-header bg-warning text-dark py-2">
                    <div class="d-flex align-items-center justify-content-between">
                        <span><i class="bi bi-stopwatch me-2"></i>Control de Tiempo - Laminacion</span>
                        <span id="ordenActivaLaminacion" class="badge bg-dark">Sin orden</span>
                    </div>
                </div>
                <div class="card-body py-2" id="contenedorControlTiempoLam" data-orden-id="" data-fase="laminacion">
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
        const contenedor = document.getElementById('contenedorControlTiempoLam');
        const labelOrden = document.getElementById('ordenActivaLaminacion');

        if (!contenedor) return;

        if (ordenId && typeof ControlTiempo !== 'undefined') {
            contenedor.setAttribute('data-orden-id', ordenId);
            labelOrden.textContent = numeroOrden || ordenId;
            ControlTiempo.renderControles(ordenId, 'laminacion', 'contenedorControlTiempoLam');
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
            clienteSelect.dispatchEvent(new Event('change'));
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
        const form = document.getElementById('formLaminacion');
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
                <button type="button" class="btn btn-sm btn-outline-secondary" onclick="Laminacion.descargarOrden()">
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

        // Filtrar ordenes pendientes (usan estadoOrden y maquina con Laminadora)
        const ordenesPendientes = ordenes.filter(o =>
            o.estadoOrden !== 'completada' &&
            (o.maquina?.includes('Laminadora') || !o.maquina)
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
     * Carga clientes desde API o CONFIG
     */
    cargarClientes: async function() {
        const clienteSelect = document.getElementById('cliente');
        if (!clienteSelect) return;

        try {
            const response = await AxonesAPI.getClientes();
            if (response.success && response.data) {
                this.clientesCache = response.data.map(c => c.nombre);
            } else {
                this.clientesCache = CONFIG.CLIENTES || [];
            }
        } catch (error) {
            this.clientesCache = CONFIG.CLIENTES || [];
        }

        this.clientesCache.forEach(cliente => {
            const option = document.createElement('option');
            option.value = cliente;
            option.textContent = cliente;
            clienteSelect.appendChild(option);
        });
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
        const form = document.getElementById('formLaminacion');
        if (form) {
            form.addEventListener('submit', (e) => {
                e.preventDefault();
                this.guardar();
            });
        }

        // Buscar OT de impresion
        const otImpresion = document.getElementById('otImpresion');
        if (otImpresion) {
            otImpresion.addEventListener('blur', (e) => {
                this.buscarOTImpresion(e.target.value);
            });
        }
    },

    /**
     * Busca datos de una OT de impresion para prellenar
     */
    buscarOTImpresion: function(ot) {
        if (!ot) return;

        const impresiones = JSON.parse(localStorage.getItem('axones_impresion') || '[]');
        const registro = impresiones.find(i => i.ordenTrabajo === ot);

        if (registro) {
            // Prellenar datos
            const clienteSelect = document.getElementById('cliente');
            if (clienteSelect && registro.cliente) {
                clienteSelect.value = registro.cliente;
            }

            const producto = document.getElementById('producto');
            if (producto && registro.producto) {
                producto.value = registro.producto;
            }

            this.mostrarNotificacion(`Datos cargados de OT ${ot}`, 'success');
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

        // Calcular total de bobinas de salida
        document.querySelectorAll('.bobina-salida').forEach(input => {
            input.addEventListener('input', () => this.calcularTotales());
        });

        // Calcular total de scrap
        document.querySelectorAll('.scrap-input').forEach(input => {
            input.addEventListener('input', () => this.calcularTotales());
        });

        // Calcular consumo de adhesivo
        document.querySelectorAll('.adhesivo-input').forEach(input => {
            input.addEventListener('input', () => this.calcularConsumoAdhesivo());
        });
    },

    /**
     * Calcula consumo de adhesivo, catalizador y acetato
     */
    calcularConsumoAdhesivo: function() {
        const adhesivoEntrada = parseFloat(document.getElementById('adhesivoEntrada').value) || 0;
        const adhesivoSobro = parseFloat(document.getElementById('adhesivoSobro').value) || 0;
        const consumoAdhesivo = adhesivoEntrada - adhesivoSobro;

        const catalizadorEntrada = parseFloat(document.getElementById('catalizadorEntrada').value) || 0;
        const catalizadorSobro = parseFloat(document.getElementById('catalizadorSobro').value) || 0;
        const consumoCatalizador = catalizadorEntrada - catalizadorSobro;

        const acetatoEntrada = parseFloat(document.getElementById('acetatoEntrada').value) || 0;
        const acetatoSobro = parseFloat(document.getElementById('acetatoSobro').value) || 0;
        const consumoAcetato = acetatoEntrada - acetatoSobro;

        document.getElementById('consumoAdhesivo').textContent = consumoAdhesivo.toFixed(2);
        document.getElementById('consumoCatalizador').textContent = consumoCatalizador.toFixed(2);
        document.getElementById('consumoAcetato').textContent = consumoAcetato.toFixed(2);
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

        // Total bobinas de salida y conteo
        let totalSalida = 0;
        let numBobinas = 0;
        document.querySelectorAll('.bobina-salida').forEach(input => {
            const valor = parseFloat(input.value) || 0;
            if (valor > 0) {
                totalSalida += valor;
                numBobinas++;
            }
        });
        document.getElementById('pesoTotal').value = totalSalida.toFixed(2);
        document.getElementById('numBobinas').value = numBobinas;

        // Total scrap
        const scrapRefile = parseFloat(document.getElementById('scrapRefile').value) || 0;
        const scrapLaminado = parseFloat(document.getElementById('scrapLaminado').value) || 0;
        const totalScrap = scrapRefile + scrapLaminado;
        document.getElementById('totalScrap').value = totalScrap.toFixed(2);

        // Merma
        const merma = totalEntrada - totalSalida - totalScrap;
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
        document.getElementById('footerSalida').textContent = totalSalida.toFixed(0);
        document.getElementById('footerMerma').textContent = merma.toFixed(2);
        document.getElementById('footerRefil').textContent = porcentajeRefil.toFixed(2);
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
        const cliente = document.getElementById('cliente')?.value;
        const producto = document.getElementById('producto')?.value;
        const ordenTrabajo = document.getElementById('ordenTrabajo')?.value;
        const operador = document.getElementById('operador')?.value;

        if (!fecha) errores.push('Fecha es requerida');
        if (!turno) errores.push('Seleccione un turno');
        if (!maquina) errores.push('Seleccione una maquina');
        if (!cliente) errores.push('Seleccione un cliente');
        if (!producto || producto.trim().length < 2) errores.push('Ingrese el nombre del producto (minimo 2 caracteres)');
        if (!ordenTrabajo || ordenTrabajo.trim().length < 3) errores.push('Ingrese la orden de trabajo (minimo 3 caracteres)');
        if (!operador || operador.trim().length < 3) errores.push('Ingrese el nombre del operador (minimo 3 caracteres)');

        // Validar que haya al menos una bobina de entrada
        let totalEntrada = 0;
        for (let i = 1; i <= 14; i++) {
            totalEntrada += parseFloat(document.getElementById('bobEnt' + i)?.value) || 0;
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
            this.mostrarNotificacion('Errores: ' + errores.join(', '), 'danger');
            return;
        }

        const form = document.getElementById('formLaminacion');
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
                maquina: datos.maquina || 'Laminadora',
                proceso: 'laminacion',
                cliente: datos.cliente,
                producto: datos.producto,
                ot: datos.ordenTrabajo,
                kilos_producidos: datos.pesoTotal || 0,
                kilos_entrada: datos.totalEntrada || 0,
                refil_kg: (datos.totalEntrada || 0) - (datos.pesoTotal || 0),
                tiempo_trabajo_min: datos.tiempoEfectivo || 0,
                tiempo_muerto_min: datos.tiempoMuerto || 0,
                operador: datos.operador,
                observaciones: datos.observaciones || ''
            };

            const result = await AxonesAPI.createProduccion(datosAPI);

            if (result.success) {
                this.mostrarToast('Registro de laminacion guardado en Google Sheets (ID: ' + result.id + ')', 'success');
                this.guardarLocal(datos);

                // Descontar materiales del inventario (adhesivo, catalizador, acetato)
                this.descontarInventarioLaminacion(datos);

                const porcentajeRefil = parseFloat(datos.porcentajeRefil) || 0;
                const umbral = CONFIG.UMBRALES_REFIL.default;
                if (porcentajeRefil > umbral.maximo) {
                    this.generarAlerta(datos);
                }

                this.limpiar();
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
            const valor = parseFloat(document.getElementById('bobEnt' + i).value) || 0;
            if (valor > 0) {
                bobinasEntrada.push({ posicion: i, peso: valor });
            }
        }

        // Obtener bobinas de salida
        const bobinasSalida = [];
        for (let i = 1; i <= 22; i++) {
            const valor = parseFloat(document.getElementById('bobSal' + i).value) || 0;
            if (valor > 0) {
                bobinasSalida.push({ posicion: i, peso: valor });
            }
        }

        return {
            id: 'LAM_' + Date.now(),
            timestamp: new Date().toISOString(),
            tipo: 'laminacion',

            turno: turnoSeleccionado ? turnoSeleccionado.value : '',
            cliente: document.getElementById('cliente')?.value || '',
            producto: document.getElementById('producto').value,
            maquina: document.getElementById('maquina').value,
            fecha: document.getElementById('fecha').value,
            ordenTrabajo: document.getElementById('ordenTrabajo').value,
            otImpresion: document.getElementById('otImpresion').value,
            operador: document.getElementById('operador').value,
            ayudante: document.getElementById('ayudante').value,
            supervisor: document.getElementById('supervisor').value,
            horaInicio: document.getElementById('horaInicio').value,
            horaArranque: document.getElementById('horaArranque').value,
            horaFinal: document.getElementById('horaFinal').value,

            bobinasEntrada: bobinasEntrada,
            totalEntrada: parseFloat(document.getElementById('totalEntrada').value) || 0,

            // Adhesivo
            adhesivoEntrada: parseFloat(document.getElementById('adhesivoEntrada').value) || 0,
            adhesivoSobro: parseFloat(document.getElementById('adhesivoSobro').value) || 0,
            consumoAdhesivo: parseFloat(document.getElementById('consumoAdhesivo').textContent) || 0,
            catalizadorEntrada: parseFloat(document.getElementById('catalizadorEntrada').value) || 0,
            catalizadorSobro: parseFloat(document.getElementById('catalizadorSobro').value) || 0,
            consumoCatalizador: parseFloat(document.getElementById('consumoCatalizador').textContent) || 0,
            acetatoEntrada: parseFloat(document.getElementById('acetatoEntrada').value) || 0,
            acetatoSobro: parseFloat(document.getElementById('acetatoSobro').value) || 0,
            consumoAcetato: parseFloat(document.getElementById('consumoAcetato').textContent) || 0,

            bobinasSalida: bobinasSalida,
            numBobinas: parseInt(document.getElementById('numBobinas').value) || 0,
            pesoTotal: parseFloat(document.getElementById('pesoTotal').value) || 0,
            merma: parseFloat(document.getElementById('merma').value) || 0,
            metraje: parseFloat(document.getElementById('metraje').value) || 0,

            scrapRefile: parseFloat(document.getElementById('scrapRefile').value) || 0,
            scrapLaminado: parseFloat(document.getElementById('scrapLaminado').value) || 0,
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
        // Guardar en produccion general
        const produccion = JSON.parse(localStorage.getItem('axones_produccion') || '[]');
        produccion.unshift(datos);
        localStorage.setItem('axones_produccion', JSON.stringify(produccion));

        // Guardar en key especifica de laminacion
        const laminacion = JSON.parse(localStorage.getItem('axones_laminacion') || '[]');
        laminacion.unshift(datos);
        localStorage.setItem('axones_laminacion', JSON.stringify(laminacion));
    },

    /**
     * Descuenta adhesivo, catalizador, acetato y material del inventario
     */
    descontarInventarioLaminacion: function(datos) {
        try {
            // 1. Descontar adhesivos/catalizador/acetato
            const adhesivos = JSON.parse(localStorage.getItem('axones_adhesivos_inventario') || '[]');
            let adhesivosActualizados = false;

            // Descontar adhesivo (usar consumoAdhesivo del formulario)
            const consumoAdhesivo = datos.consumoAdhesivo || 0;
            if (consumoAdhesivo > 0) {
                const adhesivoItem = adhesivos.find(a => a.tipo === 'adhesivo');
                if (adhesivoItem) {
                    adhesivoItem.cantidad = Math.max(0, (adhesivoItem.cantidad || 0) - consumoAdhesivo);
                    adhesivosActualizados = true;
                    console.log(`Inventario: Descontados ${consumoAdhesivo} Kg de adhesivo (Quedan: ${adhesivoItem.cantidad} Kg)`);
                }
            }

            // Descontar catalizador (usar consumoCatalizador del formulario)
            const consumoCatalizador = datos.consumoCatalizador || 0;
            if (consumoCatalizador > 0) {
                const catalizadorItem = adhesivos.find(a => a.tipo === 'catalizador');
                if (catalizadorItem) {
                    catalizadorItem.cantidad = Math.max(0, (catalizadorItem.cantidad || 0) - consumoCatalizador);
                    adhesivosActualizados = true;
                    console.log(`Inventario: Descontados ${consumoCatalizador} Kg de catalizador (Quedan: ${catalizadorItem.cantidad} Kg)`);
                }
            }

            // Descontar acetato (usar consumoAcetato del formulario)
            const consumoAcetato = datos.consumoAcetato || 0;
            if (consumoAcetato > 0) {
                const acetatoItem = adhesivos.find(a => a.tipo === 'acetato');
                if (acetatoItem) {
                    acetatoItem.cantidad = Math.max(0, (acetatoItem.cantidad || 0) - consumoAcetato);
                    adhesivosActualizados = true;
                    console.log(`Inventario: Descontados ${consumoAcetato} Lt de acetato (Quedan: ${acetatoItem.cantidad} Lt)`);
                }
            }

            if (adhesivosActualizados) {
                localStorage.setItem('axones_adhesivos_inventario', JSON.stringify(adhesivos));
                console.log('Inventario de adhesivos actualizado despues de laminacion');
                this.verificarStockBajoAdhesivos(adhesivos);
            }

            // 2. Descontar material de sustrato (bobinas de entrada)
            const inventario = JSON.parse(localStorage.getItem('axones_inventario') || '[]');
            const cantidadUsada = parseFloat(datos.totalEntrada) || 0;

            if (cantidadUsada > 0) {
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
                            console.log(`Inventario: Descontados ${aDescontar} Kg de ${item.material} (Quedan: ${item.kg} Kg)`);
                        }
                    }
                }

                if (descontado) {
                    localStorage.setItem('axones_inventario', JSON.stringify(inventario));
                    console.log('Inventario de materiales actualizado despues de laminacion');
                    this.verificarStockBajoMaterial(inventario);
                }
            }
        } catch (error) {
            console.warn('Error al descontar inventario de laminacion:', error);
        }
    },

    /**
     * Verifica si hay materiales con stock bajo
     */
    verificarStockBajoMaterial: function(inventario) {
        const STOCK_MINIMO = 200; // Kg
        const alertas = JSON.parse(localStorage.getItem('axones_alertas') || '[]');

        inventario.forEach(item => {
            if ((item.kg || 0) < STOCK_MINIMO && (item.kg || 0) > 0) {
                const alertaExistente = alertas.find(a =>
                    a.tipo === 'stock_bajo' &&
                    a.datos?.material === item.material &&
                    new Date(a.fecha) > new Date(Date.now() - 24 * 60 * 60 * 1000)
                );

                if (!alertaExistente) {
                    alertas.unshift({
                        id: Date.now(),
                        tipo: 'stock_bajo',
                        nivel: item.kg < 50 ? 'danger' : 'warning',
                        mensaje: `Stock bajo en laminacion: ${item.material} ${item.micras || ''}µ - Quedan ${(item.kg || 0).toFixed(1)} Kg`,
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
     * Verifica si hay adhesivos con stock bajo
     */
    verificarStockBajoAdhesivos: function(adhesivos) {
        const STOCK_MINIMO = 20; // Kg
        const alertas = JSON.parse(localStorage.getItem('axones_alertas') || '[]');

        adhesivos.forEach(item => {
            if ((item.cantidad || 0) < STOCK_MINIMO) {
                const alertaExistente = alertas.find(a =>
                    a.tipo === 'stock_bajo' &&
                    a.datos?.nombre === item.nombre &&
                    new Date(a.fecha) > new Date(Date.now() - 24 * 60 * 60 * 1000)
                );

                if (!alertaExistente) {
                    alertas.unshift({
                        id: Date.now(),
                        tipo: 'stock_bajo',
                        nivel: item.cantidad < 5 ? 'danger' : 'warning',
                        mensaje: `Stock bajo: ${item.nombre} - Quedan ${(item.cantidad || 0).toFixed(1)} ${item.unidad}`,
                        fecha: new Date().toISOString(),
                        estado: 'pendiente',
                        datos: { nombre: item.nombre, cantidad: item.cantidad }
                    });
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
            fecha: new Date().toISOString(),
            tipo: CONFIG.ALERTAS.TIPOS.REFIL_ALTO,
            nivel: datos.porcentajeRefil > CONFIG.UMBRALES_REFIL.default.maximo * 1.5
                ? CONFIG.ALERTAS.NIVELES.CRITICAL
                : CONFIG.ALERTAS.NIVELES.WARNING,
            maquina: datos.maquina,
            ot: datos.ordenTrabajo,
            operador: datos.operador,
            mensaje: `Refil ${datos.porcentajeRefil.toFixed(1)}% en Laminacion OT ${datos.ordenTrabajo}`,
            estado: 'pendiente',
            registro_id: datos.id,
            datos: {
                porcentajeRefil: datos.porcentajeRefil,
                producto: datos.producto,
                cliente: datos.cliente
            }
        };

        const alertas = JSON.parse(localStorage.getItem('axones_alertas') || '[]');
        alertas.unshift(alerta);
        localStorage.setItem('axones_alertas', JSON.stringify(alertas));

        // Enviar alerta a API en background
        if (typeof AxonesAPI !== 'undefined') {
            AxonesAPI.createAlerta({
                tipo: alerta.tipo,
                nivel: alerta.nivel,
                maquina: alerta.maquina,
                ot: alerta.ot,
                mensaje: alerta.mensaje,
                refil_porcentaje: datos.porcentajeRefil,
                producto: datos.producto,
                cliente: datos.cliente,
                operador: datos.operador
            }).then(result => {
                if (result.success) console.log('Alerta laminacion enviada a Sheets:', result.id);
            }).catch(e => console.warn('Error enviando alerta laminacion a API:', e));
        }

        this.mostrarNotificacion(
            `ALERTA: Refil ${datos.porcentajeRefil.toFixed(1)}% excedido en laminacion`,
            alerta.nivel === CONFIG.ALERTAS.NIVELES.CRITICAL ? 'danger' : 'warning'
        );
    },

    /**
     * Muestra notificacion toast
     */
    mostrarNotificacion: function(mensaje, tipo = 'success') {
        let toastContainer = document.querySelector('.toast-container');
        if (!toastContainer) {
            toastContainer = document.createElement('div');
            toastContainer.className = 'toast-container position-fixed bottom-0 end-0 p-3';
            document.body.appendChild(toastContainer);
        }

        const bgClass = tipo === 'success' ? 'bg-success' :
                       tipo === 'warning' ? 'bg-warning' :
                       tipo === 'danger' ? 'bg-danger' : 'bg-info';

        const toast = document.createElement('div');
        toast.className = `toast align-items-center text-white ${bgClass} border-0`;
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
    },

    /**
     * Limpia el formulario
     */
    limpiar: function() {
        const form = document.getElementById('formLaminacion');
        if (form) {
            form.reset();
            this.setDefaultDate();

            // Limpiar campos calculados
            document.getElementById('totalEntrada').value = '';
            document.getElementById('numBobinas').value = '';
            document.getElementById('pesoTotal').value = '';
            document.getElementById('merma').value = '';
            document.getElementById('totalScrap').value = '';
            document.getElementById('porcentajeRefil').value = '';
            document.getElementById('consumoAdhesivo').textContent = '0';
            document.getElementById('consumoCatalizador').textContent = '0';
            document.getElementById('consumoAcetato').textContent = '0';

            const indicador = document.getElementById('indicadorRefil');
            if (indicador) {
                indicador.className = 'alert alert-secondary py-1 px-2 mb-0 small text-center';
                indicador.innerHTML = '<i class="bi bi-dash-circle me-1"></i> Sin datos';
            }

            document.getElementById('footerEntrada').textContent = '0';
            document.getElementById('footerSalida').textContent = '0';
            document.getElementById('footerMerma').textContent = '0';
            document.getElementById('footerRefil').textContent = '0';
        }
    },
};

// Inicializar cuando el DOM este listo
document.addEventListener('DOMContentLoaded', () => {
    if (document.getElementById('formLaminacion')) {
        Laminacion.init();
    }
});

// Exportar modulo
if (typeof module !== 'undefined' && module.exports) {
    module.exports = Laminacion;
}
