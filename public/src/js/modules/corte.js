/**
 * Modulo Control de Corte - Sistema Axones
 * Maneja el formulario digital de Control de Produccion de Corte
 * Actualizado para paletas dinamicas ilimitadas con cantidad de rollos
 */

const Corte = {
    // Configuracion de paletas - ahora dinamica
    BOBINAS_POR_PALETA: 48,
    paletas: [], // Array de paletas dinamicas
    contadorPaletas: 0,

    // Temporizador
    temporizador: null,
    tiempoInicio: null,
    tiempoAcumulado: 0,
    temporizadorActivo: false,

    // Orden cargada desde el modulo de ordenes
    ordenCargada: null,

    // Colores para paletas
    coloresPaletas: [
        { border: 'success', bg: 'success', text: 'white' },
        { border: 'primary', bg: 'primary', text: 'white' },
        { border: 'warning', bg: 'warning', text: 'dark' },
        { border: 'info', bg: 'info', text: 'white' },
        { border: 'danger', bg: 'danger', text: 'white' },
        { border: 'secondary', bg: 'secondary', text: 'white' },
        { border: 'dark', bg: 'dark', text: 'white' },
        { border: 'primary', bg: 'primary', text: 'white' },
    ],

    /**
     * Inicializa el modulo
     */
    init: function() {
        console.log('Inicializando modulo Control de Corte');

        this.setDefaultDate();
        this.inicializarPaletasDinamicas();
        this.setupEventListeners();
        this.setupCalculations();
        this.setupTemporizador();

        // Verificar si viene de una orden y cargar datos automaticamente
        this.cargarDesdeOrden();

        // Inicializar controles de tiempo
        this.inicializarControlTiempo();

        // Inicializar checklist
        this.setupChecklist();

        // Calcular tiempo de preparacion automatico
        this.setupTiempoPreparacion();
    },

    /**
     * Inicializa el sistema de paletas dinamicas
     */
    inicializarPaletasDinamicas: function() {
        // Agregar 4 paletas iniciales
        for (let i = 0; i < 4; i++) {
            this.agregarPaleta();
        }
        this.actualizarResumenPaletas();
    },

    /**
     * Agrega una nueva paleta
     */
    agregarPaleta: function() {
        this.contadorPaletas++;
        const numPaleta = this.contadorPaletas;
        const colorIndex = (numPaleta - 1) % this.coloresPaletas.length;
        const color = this.coloresPaletas[colorIndex];

        const paleta = {
            id: numPaleta,
            bobinas: [],
            rollos: 0,
            total: 0
        };
        this.paletas.push(paleta);

        const container = document.getElementById('paletasContainer');
        if (!container) return;

        const paletaHTML = `
            <div class="col-lg-3 col-md-6" id="paletaWrapper${numPaleta}">
                <div class="card border-${color.border}">
                    <div class="card-header bg-${color.bg} text-${color.text} py-2">
                        <div class="d-flex justify-content-between align-items-center">
                            <strong>Paleta #${String(numPaleta).padStart(2, '0')}</strong>
                            <div>
                                <span class="badge bg-light text-dark me-1" id="countPaleta${numPaleta}">0/${this.BOBINAS_POR_PALETA}</span>
                                <button type="button" class="btn btn-sm btn-light" onclick="Corte.eliminarPaleta(${numPaleta})" title="Eliminar paleta">
                                    <i class="bi bi-trash"></i>
                                </button>
                            </div>
                        </div>
                    </div>
                    <div class="card-body p-2">
                        <div class="row g-1 mb-2">
                            <div class="col-6">
                                <label class="form-label small mb-0">Rollos</label>
                                <input type="number" class="form-control form-control-sm" id="rollosPaleta${numPaleta}"
                                       min="0" value="0" onchange="Corte.actualizarRollos(${numPaleta})">
                            </div>
                            <div class="col-6">
                                <label class="form-label small mb-0">Total Kg</label>
                                <input type="text" class="form-control form-control-sm total-highlight text-center"
                                       id="totalPaleta${numPaleta}" readonly value="0">
                            </div>
                        </div>
                        <div class="row g-1" id="paleta${numPaleta}Container" style="max-height: 300px; overflow-y: auto;">
                            ${this.generarInputsBobinas(numPaleta)}
                        </div>
                    </div>
                </div>
            </div>
        `;

        container.insertAdjacentHTML('beforeend', paletaHTML);

        // Agregar event listeners para las bobinas
        document.querySelectorAll(`.bobina-paleta${numPaleta}`).forEach(input => {
            input.addEventListener('input', () => this.calcularTotalesPaleta(numPaleta));
        });

        this.actualizarResumenPaletas();
        this.calcularTotales();
    },

    /**
     * Genera los inputs de bobinas para una paleta
     */
    generarInputsBobinas: function(numPaleta) {
        let html = '';
        for (let b = 1; b <= this.BOBINAS_POR_PALETA; b++) {
            html += `
                <div class="paleta-col">
                    <span class="paleta-bobina-label">${b}</span>
                    <input type="number" class="form-control form-control-sm paleta-bobina bobina-paleta${numPaleta}"
                           id="p${numPaleta}b${b}" step="0.01" min="0" placeholder="0">
                </div>
            `;
        }
        return html;
    },

    /**
     * Elimina una paleta
     */
    eliminarPaleta: function(numPaleta) {
        if (this.paletas.length <= 1) {
            alert('Debe mantener al menos una paleta');
            return;
        }

        if (!confirm(`¿Eliminar Paleta #${String(numPaleta).padStart(2, '0')}?`)) {
            return;
        }

        // Remover del DOM
        const wrapper = document.getElementById(`paletaWrapper${numPaleta}`);
        if (wrapper) wrapper.remove();

        // Remover del array
        this.paletas = this.paletas.filter(p => p.id !== numPaleta);

        this.actualizarResumenPaletas();
        this.calcularTotales();
    },

    /**
     * Actualiza los rollos de una paleta
     */
    actualizarRollos: function(numPaleta) {
        const input = document.getElementById(`rollosPaleta${numPaleta}`);
        const paleta = this.paletas.find(p => p.id === numPaleta);
        if (paleta && input) {
            paleta.rollos = parseInt(input.value) || 0;
        }
        this.actualizarResumenPaletas();
        this.calcularTotales();
    },

    /**
     * Actualiza la tabla de resumen de paletas
     */
    actualizarResumenPaletas: function() {
        const tbody = document.getElementById('resumenPaletasBody');
        if (!tbody) return;

        let html = '';
        this.paletas.forEach(paleta => {
            const colorIndex = (paleta.id - 1) % this.coloresPaletas.length;
            const color = this.coloresPaletas[colorIndex];
            const bobinas = this.contarBobinasPaleta(paleta.id);
            const peso = this.calcularPesoPaleta(paleta.id);
            const rollos = document.getElementById(`rollosPaleta${paleta.id}`)?.value || 0;

            html += `
                <tr>
                    <td><span class="badge bg-${color.bg} text-${color.text}">Paleta #${String(paleta.id).padStart(2, '0')}</span></td>
                    <td class="text-center">${bobinas}</td>
                    <td class="text-center">${rollos}</td>
                    <td class="text-end">${peso.toFixed(2)}</td>
                    <td class="text-center">
                        <button type="button" class="btn btn-sm btn-outline-danger" onclick="Corte.eliminarPaleta(${paleta.id})">
                            <i class="bi bi-trash"></i>
                        </button>
                    </td>
                </tr>
            `;
        });

        tbody.innerHTML = html;
    },

    /**
     * Cuenta bobinas con valor en una paleta
     */
    contarBobinasPaleta: function(numPaleta) {
        let count = 0;
        document.querySelectorAll(`.bobina-paleta${numPaleta}`).forEach(input => {
            if (parseFloat(input.value) > 0) count++;
        });
        return count;
    },

    /**
     * Calcula peso total de una paleta
     */
    calcularPesoPaleta: function(numPaleta) {
        let total = 0;
        document.querySelectorAll(`.bobina-paleta${numPaleta}`).forEach(input => {
            total += parseFloat(input.value) || 0;
        });
        return total;
    },

    /**
     * Configura el temporizador de turno
     */
    setupTemporizador: function() {
        const btnIniciar = document.getElementById('btnIniciarTemporizador');
        const btnPausar = document.getElementById('btnPausarTemporizador');
        const btnDetener = document.getElementById('btnDetenerTemporizador');

        if (btnIniciar) {
            btnIniciar.addEventListener('click', () => this.iniciarTemporizador());
        }
        if (btnPausar) {
            btnPausar.addEventListener('click', () => this.pausarTemporizador());
        }
        if (btnDetener) {
            btnDetener.addEventListener('click', () => this.detenerTemporizador());
        }

        // Restaurar temporizador si habia uno activo
        this.restaurarTemporizador();
    },

    /**
     * Inicia el temporizador
     */
    iniciarTemporizador: function() {
        if (this.temporizadorActivo) return;

        this.temporizadorActivo = true;
        this.tiempoInicio = Date.now();

        // Guardar estado
        localStorage.setItem('corte_temporizador_inicio', this.tiempoInicio);
        localStorage.setItem('corte_temporizador_acumulado', this.tiempoAcumulado);

        this.temporizador = setInterval(() => this.actualizarTemporizador(), 1000);

        document.getElementById('btnIniciarTemporizador').disabled = true;
        document.getElementById('btnPausarTemporizador').disabled = false;
        document.getElementById('btnDetenerTemporizador').disabled = false;
    },

    /**
     * Pausa el temporizador
     */
    pausarTemporizador: function() {
        if (!this.temporizadorActivo) return;

        this.temporizadorActivo = false;
        this.tiempoAcumulado += Date.now() - this.tiempoInicio;
        clearInterval(this.temporizador);

        localStorage.setItem('corte_temporizador_acumulado', this.tiempoAcumulado);
        localStorage.removeItem('corte_temporizador_inicio');

        document.getElementById('btnIniciarTemporizador').disabled = false;
        document.getElementById('btnPausarTemporizador').disabled = true;
    },

    /**
     * Detiene y reinicia el temporizador
     */
    detenerTemporizador: function() {
        if (!confirm('¿Detener y reiniciar el temporizador?')) return;

        this.temporizadorActivo = false;
        this.tiempoAcumulado = 0;
        this.tiempoInicio = null;
        clearInterval(this.temporizador);

        localStorage.removeItem('corte_temporizador_inicio');
        localStorage.removeItem('corte_temporizador_acumulado');

        document.getElementById('temporizadorDisplay').textContent = '00:00:00';
        document.getElementById('kgPorHora').value = '0';
        document.getElementById('tiempoEfectivo').value = '00:00';

        document.getElementById('btnIniciarTemporizador').disabled = false;
        document.getElementById('btnPausarTemporizador').disabled = true;
        document.getElementById('btnDetenerTemporizador').disabled = true;
    },

    /**
     * Actualiza la visualizacion del temporizador
     */
    actualizarTemporizador: function() {
        const tiempoTotal = this.tiempoAcumulado + (this.temporizadorActivo ? Date.now() - this.tiempoInicio : 0);
        const segundos = Math.floor(tiempoTotal / 1000);
        const horas = Math.floor(segundos / 3600);
        const minutos = Math.floor((segundos % 3600) / 60);
        const segs = segundos % 60;

        document.getElementById('temporizadorDisplay').textContent =
            `${String(horas).padStart(2, '0')}:${String(minutos).padStart(2, '0')}:${String(segs).padStart(2, '0')}`;

        document.getElementById('tiempoEfectivo').value =
            `${String(horas).padStart(2, '0')}:${String(minutos).padStart(2, '0')}`;

        // Calcular kg/hora
        const pesoTotal = parseFloat(document.getElementById('pesoTotalSalida')?.value) || 0;
        if (horas > 0 || minutos > 0) {
            const horasDecimal = horas + (minutos / 60);
            const kgHora = horasDecimal > 0 ? (pesoTotal / horasDecimal).toFixed(1) : '0';
            document.getElementById('kgPorHora').value = kgHora;
        }
    },

    /**
     * Restaura el temporizador si habia uno activo
     */
    restaurarTemporizador: function() {
        const inicio = localStorage.getItem('corte_temporizador_inicio');
        const acumulado = localStorage.getItem('corte_temporizador_acumulado');

        if (acumulado) {
            this.tiempoAcumulado = parseInt(acumulado) || 0;
        }

        if (inicio) {
            this.tiempoInicio = parseInt(inicio);
            this.temporizadorActivo = true;
            this.temporizador = setInterval(() => this.actualizarTemporizador(), 1000);

            document.getElementById('btnIniciarTemporizador').disabled = true;
            document.getElementById('btnPausarTemporizador').disabled = false;
            document.getElementById('btnDetenerTemporizador').disabled = false;

            this.actualizarTemporizador();
        } else if (this.tiempoAcumulado > 0) {
            this.actualizarTemporizador();
            document.getElementById('btnDetenerTemporizador').disabled = false;
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

        // Boton agregar paleta
        const btnAgregarPaleta = document.getElementById('btnAgregarPaleta');
        if (btnAgregarPaleta) {
            btnAgregarPaleta.addEventListener('click', () => this.agregarPaleta());
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

        // Calcular total de scrap
        document.querySelectorAll('.scrap-input').forEach(input => {
            input.addEventListener('input', () => this.calcularTotales());
        });

        // Calcular metros por bobina cuando cambia peso o ancho
        const pesoBobinaInput = document.getElementById('pesoBobina');
        const anchoCortInput = document.getElementById('anchoCorte');
        if (pesoBobinaInput) {
            pesoBobinaInput.addEventListener('input', () => this.calcularMetrosBobina());
        }
        if (anchoCortInput) {
            anchoCortInput.addEventListener('input', () => this.calcularMetrosBobina());
        }

        // Cargar clientes en datalist
        this.cargarClientesDatalist();
    },

    /**
     * Carga clientes en el datalist
     */
    cargarClientesDatalist: function() {
        const datalist = document.getElementById('listaClientes');
        if (!datalist) return;

        let clientes = [];
        const ordenesData = localStorage.getItem('axones_ordenes_trabajo');
        if (ordenesData) {
            try {
                const ordenes = JSON.parse(ordenesData);
                const clienteSet = new Set();
                ordenes.forEach(o => {
                    if (o.cliente) clienteSet.add(o.cliente);
                });
                clientes = Array.from(clienteSet);
            } catch (e) {}
        }

        datalist.innerHTML = '';
        clientes.forEach(c => {
            const option = document.createElement('option');
            option.value = c;
            datalist.appendChild(option);
        });
    },

    /**
     * Calcula metros por bobina
     * Formula: Metros = (Peso × 1000) / Gramaje
     * Gramaje = Ancho(m) × Micras × Densidad
     */
    calcularMetrosBobina: function() {
        const metrosEl = document.getElementById('metrosBobina');
        if (!metrosEl) return;

        const peso = parseFloat(document.getElementById('pesoBobina')?.value) || 0;
        const ancho = parseFloat(document.getElementById('anchoCorte')?.value) || 0;
        // Usar valores del material si existen, sino valores por defecto
        const micras = parseFloat(document.getElementById('materialMicraje')?.value) || 25;
        const densidad = parseFloat(document.getElementById('materialDensidad')?.value) || 0.90;

        if (peso > 0 && ancho > 0 && micras > 0) {
            // Gramaje = Ancho(m) × Micras × Densidad
            const gramaje = (ancho / 1000) * micras * densidad;
            // Metros = Peso × 1000 / Gramaje
            const metros = (peso * 1000) / gramaje;
            metrosEl.value = metros.toLocaleString('es-VE', { maximumFractionDigits: 0 }) + ' m';
        } else {
            metrosEl.value = '';
        }
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

        // Actualizar resumen de paletas
        this.actualizarResumenPaletas();

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
        const totalEntradaInput = document.getElementById('totalEntrada');
        if (totalEntradaInput) totalEntradaInput.value = totalEntrada.toFixed(2);

        // Totales de salida (suma de todas las paletas)
        let pesoSalida = 0;
        let bobinasSalida = 0;
        let rollosSalida = 0;
        let paletasConDatos = 0;

        this.paletas.forEach(paleta => {
            const peso = this.calcularPesoPaleta(paleta.id);
            const bobinas = this.contarBobinasPaleta(paleta.id);
            const rollos = parseInt(document.getElementById(`rollosPaleta${paleta.id}`)?.value) || 0;

            pesoSalida += peso;
            bobinasSalida += bobinas;
            rollosSalida += rollos;
            if (peso > 0 || bobinas > 0) paletasConDatos++;
        });

        // Actualizar campos de resumen
        const numBobinasSalida = document.getElementById('numBobinasSalida');
        const numRollosSalida = document.getElementById('numRollosSalida');
        const pesoTotalSalida = document.getElementById('pesoTotalSalida');
        const numPaletas = document.getElementById('numPaletas');

        if (numBobinasSalida) numBobinasSalida.value = bobinasSalida;
        if (numRollosSalida) numRollosSalida.value = rollosSalida;
        if (pesoTotalSalida) pesoTotalSalida.value = pesoSalida.toFixed(2);
        if (numPaletas) numPaletas.value = paletasConDatos;

        // Actualizar totales en resumen de tabla
        const resumenBobTotal = document.getElementById('resumenBobTotal');
        const resumenRollosTotal = document.getElementById('resumenRollosTotal');
        const resumenPesoTotal = document.getElementById('resumenPesoTotal');

        if (resumenBobTotal) resumenBobTotal.textContent = bobinasSalida;
        if (resumenRollosTotal) resumenRollosTotal.textContent = rollosSalida;
        if (resumenPesoTotal) resumenPesoTotal.textContent = pesoSalida.toFixed(2);

        // Calcular scrap
        let totalScrap = 0;
        document.querySelectorAll('.scrap-input').forEach(input => {
            totalScrap += parseFloat(input.value) || 0;
        });
        const totalScrapInput = document.getElementById('totalScrap');
        if (totalScrapInput) totalScrapInput.value = totalScrap.toFixed(2);

        // Calcular merma
        const merma = totalEntrada - pesoSalida - totalScrap;
        const mermaInput = document.getElementById('merma');
        const porcentajeMerma = document.getElementById('porcentajeMerma');
        if (mermaInput) mermaInput.value = merma.toFixed(2);
        if (porcentajeMerma && totalEntrada > 0) {
            porcentajeMerma.value = ((merma / totalEntrada) * 100).toFixed(2) + '%';
        }

        // Calcular porcentaje de refil
        if (totalEntrada > 0) {
            const pctRefil = (totalScrap / totalEntrada) * 100;
            const porcentajeRefil = document.getElementById('porcentajeRefil');
            if (porcentajeRefil) porcentajeRefil.value = pctRefil.toFixed(2) + '%';

            // Actualizar indicador
            const indicador = document.getElementById('indicadorRefil');
            if (indicador) {
                if (pctRefil <= 3) {
                    indicador.className = 'alert alert-success py-1 px-2 mb-0 small text-center';
                    indicador.innerHTML = '<i class="bi bi-check-circle me-1"></i> Excelente';
                } else if (pctRefil <= 5) {
                    indicador.className = 'alert alert-warning py-1 px-2 mb-0 small text-center';
                    indicador.innerHTML = '<i class="bi bi-exclamation-triangle me-1"></i> Aceptable';
                } else {
                    indicador.className = 'alert alert-danger py-1 px-2 mb-0 small text-center';
                    indicador.innerHTML = '<i class="bi bi-x-circle me-1"></i> Alto';
                }
            }
        }

        // Actualizar footer
        this.actualizarFooter(totalEntrada, pesoSalida, merma, totalScrap, paletasConDatos, bobinasSalida);

        // Actualizar kg/hora si temporizador activo
        if (this.temporizadorActivo) {
            this.actualizarTemporizador();
        }
    },

    /**
     * Actualiza el footer con totales
     */
    actualizarFooter: function(entrada, salida, merma, scrap, paletas, bobinas) {
        const footerEntrada = document.getElementById('footerEntrada');
        const footerSalida = document.getElementById('footerSalida');
        const footerMerma = document.getElementById('footerMerma');
        const footerRefil = document.getElementById('footerRefil');
        const footerPaletas = document.getElementById('footerPaletas');
        const footerBobinas = document.getElementById('footerBobinas');

        if (footerEntrada) footerEntrada.textContent = entrada.toFixed(2);
        if (footerSalida) footerSalida.textContent = salida.toFixed(2);
        if (footerMerma) footerMerma.textContent = merma.toFixed(2);
        if (footerRefil && entrada > 0) footerRefil.textContent = ((scrap / entrada) * 100).toFixed(2);
        if (footerPaletas) footerPaletas.textContent = paletas;
        if (footerBobinas) footerBobinas.textContent = bobinas;
    },

    /**
     * Inicializa los controles de tiempo (Play/Pausa/Completado)
     */
    inicializarControlTiempo: function() {
        const form = document.getElementById('formCorte');
        if (!form || document.getElementById('panelComandasCorte')) return;

        const panelHTML = `
            <!-- Panel de Comandas (Selector de OT tipo restaurante) -->
            <div id="panelComandasCorte" class="mb-3"></div>

            <!-- Panel de Control de Tiempo -->
            <div id="controlTiempoCorte" class="card mb-3 border-success" style="display: none;">
                <div class="card-header bg-success text-white py-2">
                    <div class="d-flex align-items-center justify-content-between">
                        <span><i class="bi bi-stopwatch me-2"></i>Control de Tiempo - Corte</span>
                        <span id="ordenActivaCorte" class="badge bg-light text-success">Sin orden</span>
                    </div>
                </div>
                <div class="card-body py-2" id="contenedorControlTiempoCorte" data-orden-id="" data-fase="corte">
                    <div class="text-center text-muted py-3">
                        <i class="bi bi-info-circle me-2"></i>
                        Seleccione una orden de trabajo arriba
                    </div>
                </div>
            </div>
        `;

        form.insertAdjacentHTML('afterbegin', panelHTML);

        // Renderizar panel de comandas
        if (typeof ControlTiempo !== 'undefined') {
            ControlTiempo.renderPanelComandas('corte', 'panelComandasCorte', (orden) => {
                this.ordenCargada = orden;
                this.precargarCamposOrden(orden);
                this.mostrarBannerOrdenCargada(orden);

                // Mostrar panel de control de tiempo
                const panelTiempo = document.getElementById('controlTiempoCorte');
                if (panelTiempo) panelTiempo.style.display = 'block';
            });
        }
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

        const clienteSelect = document.getElementById('clienteOrden') || document.getElementById('cliente');
        if (clienteSelect && orden.cliente) {
            clienteSelect.value = orden.cliente;
            clienteSelect.style.backgroundColor = '#e8f4e8';
            clienteSelect.style.borderColor = '#198754';
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
            'cliente': 'clienteOrden',
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
        console.log('[Corte] agregarSelectorOrdenes - INICIO');

        const otInput = document.getElementById('ordenTrabajo');
        if (!otInput) {
            console.warn('[Corte] No se encontro el campo ordenTrabajo');
            return;
        }

        if (document.getElementById('selectorOrden')) {
            console.log('[Corte] selectorOrden ya existe');
            return;
        }

        // Obtener ordenes pendientes
        let ordenes = [];
        try {
            ordenes = JSON.parse(localStorage.getItem('axones_ordenes_trabajo') || '[]');
        } catch (e) {
            console.warn('[Corte] Error parseando ordenes:', e);
            ordenes = [];
        }

        console.log('[Corte] Ordenes en localStorage:', ordenes.length);

        // Filtrar ordenes no completadas
        const ordenesDisponibles = ordenes.filter(o => o.estadoOrden !== 'completada');
        console.log('[Corte] Ordenes disponibles:', ordenesDisponibles.length);

        // Crear el div del selector
        const selectorDiv = document.createElement('div');
        selectorDiv.id = 'selectorOrden';
        selectorDiv.className = 'mt-2';

        if (ordenesDisponibles.length === 0) {
            selectorDiv.innerHTML = `
                <div class="alert alert-info py-1 small mb-0">
                    <i class="bi bi-info-circle me-1"></i>No hay ordenes pendientes.
                    <a href="ordenes.html" class="alert-link">Crear nueva OT</a>
                </div>
            `;
        } else {
            selectorDiv.innerHTML = `
                <label class="form-label small fw-bold text-success mb-1">
                    <i class="bi bi-list-check me-1"></i>Ordenes Pendientes (${ordenesDisponibles.length})
                </label>
                <select class="form-select form-select-sm border-success" id="selectOrdenPendiente">
                    <option value="">-- Seleccionar orden de trabajo --</option>
                    ${ordenesDisponibles.map(o => `
                        <option value="${o.numeroOrden || o.ot}" data-orden='${JSON.stringify(o).replace(/'/g, "&#39;")}'>
                            ${o.numeroOrden || o.ot} | ${o.cliente} | ${o.producto || 'Sin producto'} | ${(o.pedidoKg || 0).toLocaleString()}kg
                        </option>
                    `).join('')}
                </select>
            `;
        }

        // Insertar directamente despues del input ordenTrabajo
        otInput.insertAdjacentElement('afterend', selectorDiv);
        console.log('[Corte] Selector insertado correctamente');

        // Event listener para cargar orden seleccionada
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
                        console.warn('[Corte] Error parseando orden seleccionada:', err);
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
            cliente: (document.getElementById('clienteOrden') || document.getElementById('cliente'))?.value || '',
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
     * Configura el checklist integrado
     */
    setupChecklist: function() {
        const fechaSpan = document.getElementById('checklistFecha');
        if (fechaSpan) {
            fechaSpan.textContent = new Date().toLocaleDateString('es-VE');
        }

        document.querySelectorAll('.checklist-item').forEach(cb => {
            cb.addEventListener('change', () => this.actualizarProgresoChecklist());
        });

        const btnGuardar = document.getElementById('btnGuardarChecklist');
        if (btnGuardar) {
            btnGuardar.addEventListener('click', () => this.guardarChecklist());
        }
    },

    actualizarProgresoChecklist: function() {
        const total = document.querySelectorAll('.checklist-item').length;
        const marcados = document.querySelectorAll('.checklist-item:checked').length;
        const badge = document.getElementById('checklistProgreso');
        if (badge) badge.textContent = `${marcados}/${total} completados`;
    },

    guardarChecklist: function() {
        const items = [];
        document.querySelectorAll('.checklist-item').forEach(cb => {
            items.push({ item: cb.value, completado: cb.checked });
        });

        const estado = document.querySelector('input[name="checklistEstado"]:checked');
        const datos = {
            id: 'CHK_CRT_' + Date.now(),
            area: 'corte',
            fecha: new Date().toISOString(),
            ordenTrabajo: document.getElementById('ordenTrabajo')?.value || '',
            items: items,
            estado: estado ? estado.value : '',
            observaciones: document.getElementById('checklistObservaciones')?.value || '',
            elaboradoPor: document.getElementById('checklistElaborado')?.value || '',
            revisadoPor: document.getElementById('checklistRevisado')?.value || '',
            aprobadoPor: document.getElementById('checklistAprobadoPor')?.value || ''
        };

        const checklists = JSON.parse(localStorage.getItem('axones_checklists') || '[]');
        checklists.unshift(datos);
        localStorage.setItem('axones_checklists', JSON.stringify(checklists));

        // Toast
        let toastContainer = document.querySelector('.toast-container');
        if (!toastContainer) {
            toastContainer = document.createElement('div');
            toastContainer.className = 'toast-container position-fixed bottom-0 end-0 p-3';
            document.body.appendChild(toastContainer);
        }
        const toastHtml = `<div class="toast align-items-center bg-success text-white border-0" role="alert"><div class="d-flex"><div class="toast-body">Checklist guardado correctamente</div><button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast"></button></div></div>`;
        toastContainer.insertAdjacentHTML('beforeend', toastHtml);
        const toastEl = toastContainer.lastElementChild;
        const toast = new bootstrap.Toast(toastEl, { autohide: true, delay: 3000 });
        toast.show();
        toastEl.addEventListener('hidden.bs.toast', () => toastEl.remove());

        const modal = bootstrap.Modal.getInstance(document.getElementById('modalChecklist'));
        if (modal) modal.hide();
    },

    /**
     * Configura calculo automatico del tiempo de preparacion
     */
    setupTiempoPreparacion: function() {
        const horaInicio = document.getElementById('horaInicio');
        const horaArranque = document.getElementById('horaArranque');

        const calcular = () => {
            const inicio = horaInicio?.value;
            const arranque = horaArranque?.value;
            const span = document.getElementById('tiempoPreparacionCalc');
            if (!span) return;

            if (inicio && arranque) {
                const [hi, mi] = inicio.split(':').map(Number);
                const [ha, ma] = arranque.split(':').map(Number);
                let diffMin = (ha * 60 + ma) - (hi * 60 + mi);
                if (diffMin < 0) diffMin += 24 * 60;
                const horas = Math.floor(diffMin / 60);
                const mins = diffMin % 60;
                span.textContent = horas > 0 ? `${horas}h ${mins}min` : `${mins} min`;
            } else {
                span.textContent = '--';
            }
        };

        if (horaInicio) horaInicio.addEventListener('change', calcular);
        if (horaArranque) horaArranque.addEventListener('change', calcular);
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
