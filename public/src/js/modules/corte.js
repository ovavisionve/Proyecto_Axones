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

    // Timer state (replaces localStorage corte_temporizador_*)
    _timerInicio: null,
    _timerAcumulado: 0,

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
    init: async function() {
        console.log('Inicializando modulo Control de Corte');

        // Asegurar que AxonesDB esta inicializado
        if (typeof AxonesDB !== 'undefined' && !AxonesDB.isReady()) {
            await AxonesDB.init();
        }

        this.inicializarPaletasDinamicas();
        this.setupEventListeners();
        this.setupCalculations();
        this.setupTemporizador();

        // Poblar selector de OTs y verificar si viene una por URL
        await this.poblarSelectorOT();
        await this.cargarDesdeOrden();

        // Inicializar controles de tiempo
        this.inicializarControlTiempo();

        // Inicializar checklist
        this.setupChecklist();

        // Inicializar 3 temporizadores
        this.initTemporizadores();

        // Flechitas de etiquetas en bobinas de entrada
        this.setupEtiquetasBobinas();

        // Autosave
        this.restaurarAutosave();
        this._autosaveInterval = setInterval(() => this.autosave(), 5000);
        window.addEventListener('beforeunload', () => this.autosave());
        document.addEventListener('visibilitychange', () => { if (document.hidden) this.autosave(); });

        // Escuchar re-sync del cloud para recargar datos
        window.addEventListener('axones-sync', async () => {
            await this.poblarSelectorOT();
        });
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

        // Guardar estado en module-level variables
        this._timerInicio = this.tiempoInicio;
        this._timerAcumulado = this.tiempoAcumulado;

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

        this._timerAcumulado = this.tiempoAcumulado;
        this._timerInicio = null;

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

        this._timerInicio = null;
        this._timerAcumulado = 0;

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
        const inicio = this._timerInicio;
        const acumulado = this._timerAcumulado;

        if (acumulado) {
            this.tiempoAcumulado = acumulado;
        }

        if (inicio) {
            this.tiempoInicio = inicio;
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
        // Boton guardar (arriba y abajo)
        const btnGuardar = document.getElementById('btnGuardar');
        if (btnGuardar) {
            btnGuardar.addEventListener('click', (e) => {
                e.preventDefault();
                this.guardar();
            });
        }
        const btnGuardarBottom = document.getElementById('btnGuardarBottom');
        if (btnGuardarBottom) {
            btnGuardarBottom.addEventListener('click', (e) => {
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

        // Contar bobinas de entrada usadas (las que tienen valor > 0)
        let bobinasEntradaUsadas = 0;
        document.querySelectorAll('.bobina-entrada').forEach(input => {
            if (parseFloat(input.value) > 0) bobinasEntradaUsadas++;
        });

        // Actualizar campos de resumen
        const numBobinasEntrada = document.getElementById('numBobinasEntrada');
        const numBobinasSalida = document.getElementById('numBobinasSalida');
        const numRollosSalida = document.getElementById('numRollosSalida');
        const pesoTotalSalida = document.getElementById('pesoTotalSalida');
        const numPaletas = document.getElementById('numPaletas');

        if (numBobinasEntrada) numBobinasEntrada.value = bobinasEntradaUsadas;
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

        // Total consumido = total entrada (restante de bobinas eliminado)
        const totalRestante = 0;
        const totalConsumido = totalEntrada;

        // Actualizar Resumen de Produccion
        const resEntrada = document.getElementById('resumenEntrada');
        const resConsumido = document.getElementById('resumenConsumido');
        const resSalida = document.getElementById('resumenSalida');
        const resScrap = document.getElementById('resumenScrap');
        const resMerma = document.getElementById('resumenMermaCalc');
        const resRefil = document.getElementById('resumenRefilCalc');
        if (resEntrada) resEntrada.textContent = totalEntrada.toFixed(2) + ' Kg';
        if (resConsumido) resConsumido.textContent = totalConsumido.toFixed(2) + ' Kg';
        if (resSalida) resSalida.textContent = pesoSalida.toFixed(2) + ' Kg';
        if (resScrap) resScrap.textContent = totalScrap.toFixed(2) + ' Kg';
        const mermaResumen = totalConsumido - pesoSalida - totalScrap;
        if (resMerma) resMerma.textContent = mermaResumen.toFixed(2) + ' Kg';
        let refilResumen = 0;
        if (totalConsumido > 0) {
            refilResumen = (totalScrap / totalConsumido) * 100;
        }
        if (resRefil) resRefil.textContent = refilResumen.toFixed(2) + '%';

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
        if (!form || document.getElementById('controlTiempoCorte')) return;

        // Solo insertar panel de Control de Tiempo (Play/Pausa/Completar/Despacho)
        // El selector de OT ahora es el dropdown principal, no el panel de comandas
        const panelHTML = `
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
     * Pobla el selector de OT con ordenes pendientes/en-proceso
     */
    poblarSelectorOT: async function() {
        const select = document.getElementById('ordenTrabajo');
        if (!select) return;

        let ordenes = [];
        try {
            ordenes = (typeof AxonesDB !== 'undefined' && AxonesDB.isReady()) ? await AxonesDB.ordenesHelper.cargar() : [];
        } catch (e) {
            ordenes = [];
        }

        // Filtrar ordenes no completadas
        const disponibles = ordenes.filter(o => o.estadoOrden !== 'completada');

        // Guardar valor actual
        const valorActual = select.value;

        // Limpiar y poblar
        select.innerHTML = '<option value="">Seleccionar OT...</option>';
        disponibles.forEach(o => {
            const opt = document.createElement('option');
            opt.value = o.numeroOrden || o.ot;
            opt.textContent = `${o.numeroOrden || o.ot} | ${o.cliente || '---'} | ${o.producto || '---'} | ${(o.pedidoKg || 0).toLocaleString()} Kg`;
            opt.dataset.ot = o.ot || o.numeroOrden;
            select.appendChild(opt);
        });

        // Restaurar valor si existia
        if (valorActual) select.value = valorActual;

        // Event listener (solo una vez)
        if (!select._listenerAdded) {
            select._listenerAdded = true;
            select.addEventListener('change', () => {
                const otId = select.value;
                if (!otId) {
                    this.ocultarResumenYForm();
                    return;
                }
                const orden = disponibles.find(o => (o.numeroOrden || o.ot) === otId) ||
                              ordenes.find(o => (o.numeroOrden || o.ot) === otId);
                if (orden) {
                    this.seleccionarOrden(orden);
                }
            });
        }

        // Si no hay ordenes, mostrar mensaje
        const badge = document.getElementById('estadoOT');
        if (badge) {
            badge.textContent = disponibles.length > 0
                ? `${disponibles.length} OTs disponibles`
                : 'No hay OTs pendientes';
            badge.className = disponibles.length > 0 ? 'badge bg-success' : 'badge bg-secondary';
        }
    },

    /**
     * Carga OT desde URL (?ot=OT-2026-0001) si viene con parametro
     */
    cargarDesdeOrden: async function() {
        const params = new URLSearchParams(window.location.search);
        const ot = params.get('ot');
        if (!ot) return;

        let ordenes = [];
        try {
            ordenes = (typeof AxonesDB !== 'undefined' && AxonesDB.isReady()) ? await AxonesDB.ordenesHelper.cargar() : [];
        } catch (e) { ordenes = []; }

        const orden = ordenes.find(o => o.ot === ot || o.numeroOrden === ot);
        if (orden) {
            // Seleccionar en el dropdown
            const select = document.getElementById('ordenTrabajo');
            if (select) select.value = orden.numeroOrden || orden.ot;
            this.seleccionarOrden(orden);
        }
    },

    /**
     * Selecciona una OT: muestra resumen spreadsheet y habilita formulario
     */
    seleccionarOrden: function(orden) {
        this.ordenCargada = orden;
        this.ordenCargada.pedidoKgOriginal = orden.pedidoKg;

        // Renderizar resumen read-only
        this.renderResumenOT(orden);

        // Mostrar formulario de produccion
        const form = document.getElementById('formCorte');
        if (form) form.style.display = '';

        // Actualizar badge
        const badge = document.getElementById('estadoOT');
        if (badge) {
            badge.textContent = orden.numeroOrden || orden.ot;
            badge.className = 'badge bg-success';
        }

        // Mostrar y actualizar control de tiempo (Play/Pausa/Completar/Despacho)
        const panelTiempo = document.getElementById('controlTiempoCorte');
        if (panelTiempo) panelTiempo.style.display = 'block';
        this.actualizarControlTiempo(orden.id || orden.ot, orden.numeroOrden || orden.ot);

        // Set hidden material fields for metros/bobina calculation
        const materialAncho = document.getElementById('materialAncho');
        const materialMicraje = document.getElementById('materialMicraje');
        const materialDensidad = document.getElementById('materialDensidad');
        if (materialAncho) materialAncho.value = orden.fichaAncho1 || orden.anchoMaterial || orden.anchoCorteFinal || '';
        if (materialMicraje) materialMicraje.value = orden.fichaMicras1 || orden.micrasMaterial || '';
        if (materialDensidad) {
            const densidad = orden.fichaDensidad1 || this.getDensidadMaterial(orden.fichaTipoMat1 || orden.tipoMaterial);
            materialDensidad.value = densidad || '';
        }

        console.log('[Corte] OT seleccionada:', orden.numeroOrden || orden.ot);
    },

    /**
     * Oculta resumen y formulario cuando no hay OT seleccionada
     */
    ocultarResumenYForm: function() {
        this.ordenCargada = null;
        const resumen = document.getElementById('resumenOT');
        const form = document.getElementById('formCorte');
        if (resumen) resumen.classList.remove('visible');
        if (form) form.style.display = 'none';

        const badge = document.getElementById('estadoOT');
        if (badge) {
            badge.textContent = 'Sin OT seleccionada';
            badge.className = 'badge bg-secondary';
        }
    },

    /**
     * Renderiza el resumen read-only de la OT en formato spreadsheet
     */
    renderResumenOT: function(orden) {
        const resumen = document.getElementById('resumenOT');
        if (!resumen) return;

        const v = (val) => (val !== undefined && val !== null && val !== '') ? val : '-';
        const n = (val) => (val && !isNaN(val)) ? Number(val).toLocaleString() : '-';

        // Header
        const header = document.getElementById('otNumeroHeader');
        if (header) header.textContent = v(orden.numeroOrden || orden.ot);

        // Datos del Pedido
        document.getElementById('otFecha').textContent = v(orden.fechaOrden);
        document.getElementById('otPedidoKg').textContent = n(orden.pedidoKg) + ' Kg';
        document.getElementById('otMetrosEst').textContent = n(orden.metrosImp || orden.metrosEstimados);
        document.getElementById('otMaquina').textContent = v(orden.maquina);
        document.getElementById('otEstructura').textContent = v(orden.estructuraMaterial);

        // Datos del Producto
        document.getElementById('otCliente').textContent = v(orden.cliente);
        document.getElementById('otClienteRif').textContent = v(orden.clienteRif);
        document.getElementById('otProducto').textContent = v(orden.producto);
        document.getElementById('otCpe').textContent = v(orden.cpe);

        // Area de Corte
        document.getElementById('otAnchoCorte').textContent = v(orden.anchoCorte);
        document.getElementById('otAnchoMontaje').textContent = v(orden.anchoMontaje);
        document.getElementById('otNumBandas').textContent = v(orden.numBandas);
        document.getElementById('otFrecuencia').textContent = v(orden.frecuencia);
        document.getElementById('otFiguraEmb').textContent = v(orden.figuraEmbobinadoMontaje);
        document.getElementById('otDesarrollo').textContent = v(orden.desarrollo);

        // Ficha Tecnica
        document.getElementById('otTipoMat').textContent = v(orden.fichaTipoMat1 || orden.tipoMaterial);
        document.getElementById('otMicras').textContent = v(orden.fichaMicras1 || orden.micrasMaterial);
        document.getElementById('otAncho').textContent = v(orden.fichaAncho1 || orden.anchoMaterial);
        document.getElementById('otDensidad').textContent = v(orden.fichaDensidad1);
        document.getElementById('otKgNecesarios').textContent = n(orden.fichaKg1);

        // Cargar acumulado de produccion
        this.cargarAcumuladoOT(orden);

        // Mostrar el resumen
        resumen.classList.add('visible');
    },

    /**
     * Carga y muestra el acumulado de produccion de la OT (suma de todos los turnos anteriores)
     */
    cargarAcumuladoOT: async function(orden) {
        const numOT = orden.numeroOrden || orden.nombreOT || orden.ot;
        const pedidoKg = parseFloat(orden.pedidoKg) || 0;
        if (!numOT) return;

        document.getElementById('acumuladoOTPanel')?.remove();

        let registros = [];
        if (typeof AxonesDB !== 'undefined' && AxonesDB.isReady()) {
            try {
                const { data } = await AxonesDB.client.from('produccion_corte')
                    .select('*').eq('numero_ot', numOT).order('created_at', { ascending: false });
                registros = data || [];
            } catch (e) { console.warn('[Corte] Error cargando acumulado:', e); }
        }

        const totalPesoSalida = registros.reduce((s, r) => s + (parseFloat(r.peso_total_salida) || parseFloat(r.peso_total) || 0), 0);
        const totalScrap = registros.reduce((s, r) => s + (parseFloat(r.total_scrap) || 0), 0);
        const totalEntrada = registros.reduce((s, r) => s + (parseFloat(r.total_entrada) || 0), 0);
        const totalPaletas = registros.reduce((s, r) => s + (parseInt(r.num_paletas) || 0), 0);
        const faltante = Math.max(0, pedidoKg - totalPesoSalida);
        const porcentaje = pedidoKg > 0 ? Math.min(100, (totalPesoSalida / pedidoKg) * 100) : 0;
        const ultimoRegistro = registros[0];

        let barColor = 'bg-warning';
        if (porcentaje >= 100) barColor = 'bg-success';
        else if (porcentaje >= 70) barColor = 'bg-info';
        else if (porcentaje >= 30) barColor = 'bg-primary';

        const ultimoTexto = ultimoRegistro
            ? `${ultimoRegistro.fecha || '-'} | Turno: ${ultimoRegistro.turno || '-'} | Operador: ${ultimoRegistro.operador || '-'}`
            : 'Sin corte previo';

        const panelHTML = `
        <div id="acumuladoOTPanel" class="card border-info mb-3" style="border-width: 2px;">
            <div class="card-header bg-info text-white py-2">
                <strong><i class="bi bi-graph-up me-1"></i>ACUMULADO DE LA ORDEN (todos los turnos)</strong>
            </div>
            <div class="card-body py-2">
                <div class="row g-2 mb-2">
                    <div class="col-md-3"><small class="text-muted d-block">Pedido Total</small><strong style="font-size:1.1rem;">${pedidoKg.toLocaleString('es-VE')} Kg</strong></div>
                    <div class="col-md-3"><small class="text-muted d-block">Cortado</small><strong style="font-size:1.1rem;color:#198754;">${totalPesoSalida.toFixed(1)} Kg</strong></div>
                    <div class="col-md-3"><small class="text-muted d-block">Falta por Cortar</small><strong style="font-size:1.1rem;color:${faltante > 0 ? '#dc3545' : '#198754'};">${faltante.toFixed(1)} Kg</strong></div>
                    <div class="col-md-3"><small class="text-muted d-block">Paletas Total</small><strong style="font-size:1.1rem;">${totalPaletas}</strong></div>
                </div>
                <div class="progress mb-2" style="height:24px;">
                    <div class="progress-bar ${barColor}" role="progressbar" style="width:${porcentaje}%; font-weight:bold;">${porcentaje.toFixed(1)}% completado</div>
                </div>
                <div class="row g-2 small">
                    <div class="col-md-4"><strong>Total Entrada acumulada:</strong> ${totalEntrada.toFixed(1)} Kg</div>
                    <div class="col-md-4"><strong>Total Scrap acumulado:</strong> ${totalScrap.toFixed(1)} Kg</div>
                    <div class="col-md-4"><strong>Ultimo turno:</strong> ${ultimoTexto}</div>
                </div>
                ${faltante <= 0 ? '<div class="alert alert-success mt-2 mb-0 py-1 small"><i class="bi bi-check-circle me-1"></i><strong>OT COMPLETADA</strong> - No hace falta seguir cortando</div>' : ''}
            </div>
        </div>`;
        const form = document.getElementById('formCorte');
        if (form) form.insertAdjacentHTML('beforebegin', panelHTML);
    },

    // precargarCamposOrden removed - data now comes from resumenOT spreadsheet

    /**
     * Devuelve la densidad segun el tipo de material
     */
    getDensidadMaterial: function(material) {
        if (!material) return 0.90;
        const densidades = {
            'BOPP NORMAL': 0.90, 'BOPP MATE': 0.90, 'BOPP PASTA': 0.90,
            'BOPP PERLADO': 0.80, 'PERLADO': 0.80,
            'CAST': 0.92, 'METAL': 0.90,
            'PEBD': 0.93, 'PEBD PIGMENT': 0.93,
            'PET': 1.40, 'PA': 1.14, 'NYLON': 1.14
        };
        for (const [key, val] of Object.entries(densidades)) {
            if (material.toUpperCase().includes(key)) return val;
        }
        return 0.90;
    },

    // precargarDesdeParametros, mostrarBannerOrdenCargada, descargarOrden,
    // agregarSelectorOrdenes, _renderSelectorOrdenes, setDefaultDate removed
    // - replaced by poblarSelectorOT, seleccionarOrden, renderResumenOT, ocultarResumenYForm

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
        const turno = document.querySelector('input[name="turno"]:checked');
        const operador = document.getElementById('operador')?.value;

        // La OT debe estar seleccionada
        if (!this.ordenCargada) errores.push('Seleccione una Orden de Trabajo');
        if (!turno) errores.push('Seleccione un turno');
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
            await this.guardarLocal(datos);
            this.limpiarAutosave();
            this.mostrarToast('Registro de corte guardado', 'success');

            // Descontar material del inventario
            await this.descontarInventario(datos);

            // Registrar producto terminado en inventario
            await this.registrarProductoTerminado(datos);

            const porcentajeRefil = parseFloat(datos.porcentajeRefil) || 0;
            const umbral = CONFIG.UMBRALES_REFIL.default;
            if (porcentajeRefil > umbral.maximo) {
                await this.generarAlerta(datos);
            }

            // Ofrecer generar Nota de Entrega
            this.ofrecerNotaEntrega(datos);
        } catch (error) {
            console.error('Error guardando registro:', error);
            Axones.showWarning('Error al guardar: ' + error.message);
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

        // Obtener restante de bobinas
        const bobinasRestante = [];
        for (let i = 1; i <= 14; i++) {
            const valor = parseFloat(document.getElementById('rest' + i)?.value) || 0;
            if (valor > 0) {
                bobinasRestante.push({ posicion: i, peso: valor });
            }
        }

        // Obtener bobinas de salida por paleta
        const paletas = [];
        this.paletas.forEach(pal => {
            const p = pal.id;
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

            const rollos = parseInt(document.getElementById(`rollosPaleta${p}`)?.value) || 0;

            paletas.push({
                numero: p,
                bobinas: bobinas,
                totalBobinas: bobinas.length,
                pesoTotal: totalPaleta,
                rollos: rollos,
            });
        });

        // Datos de la OT (referencia, no copia)
        const ot = this.ordenCargada || {};

        return {
            // Metadatos
            id: 'COR_' + Date.now(),
            timestamp: new Date().toISOString(),
            tipo: 'corte',

            // Referencia a la OT (vinculo, no duplicacion)
            ordenTrabajo: ot.numeroOrden || ot.ot || document.getElementById('ordenTrabajo')?.value || '',
            otId: ot.id || ot.ot || '',

            // Datos de la OT (read-only, para referencia rapida)
            cliente: ot.cliente || '',
            producto: ot.producto || '',
            maquina: ot.maquina || '',
            pedidoKg: ot.pedidoKg || 0,

            // Datos de produccion (llenados por el operador)
            turno: turnoSeleccionado ? turnoSeleccionado.value : '',
            operador: document.getElementById('operador').value,
            ayudante: document.getElementById('ayudante').value,
            supervisor: document.getElementById('supervisor').value,
            // Tiempos (temporizador de produccion)
            tiempoTotal: this._timer.inicio ? (Date.now() - this._timer.inicio) : 0,
            tiempoMuerto: this._timer.tiempoMuerto + (this._timer.estado === 'pausado' && this._timer.pausaInicio ? (Date.now() - this._timer.pausaInicio) : 0),
            tiempoEfectivo: this._timer.inicio ? Math.max(0, (Date.now() - this._timer.inicio) - this._timer.tiempoMuerto) : 0,
            paradasProduccion: this._timer.pausas,
            fecha: new Date().toISOString().split('T')[0],

            bobinasEntrada: bobinasEntrada,
            totalEntrada: parseFloat(document.getElementById('totalEntrada').value) || 0,

            // Restante de bobinas
            bobinasRestante: bobinasRestante,
            totalRestante: parseFloat(document.getElementById('totalRestante')?.value) || 0,
            totalConsumido: parseFloat(document.getElementById('totalConsumido')?.textContent) || 0,

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

            // Etiquetas de bobinas de entrada
            etiquetasEntrada: this.etiquetasData.entrada,

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
     * Guarda en Supabase (produccion_corte)
     */
    guardarLocal: async function(datos) {
        try {
            if (typeof AxonesDB !== 'undefined' && AxonesDB.isReady()) {
                await AxonesDB.client.from('produccion_corte').insert({
                    orden_id: datos.otId || null,
                    numero_ot: datos.ordenTrabajo || '',
                    fecha: datos.fecha || new Date().toISOString().split('T')[0],
                    turno: datos.turno || '',
                    maquina: datos.maquina || '',
                    operador: datos.operador || '',
                    ayudante: datos.ayudante || '',
                    supervisor: datos.supervisor || '',
                    bobinas_entrada: datos.bobinasEntrada || [],
                    total_entrada: datos.totalEntrada || 0,
                    paletas: datos.paletas || [],
                    num_paletas: datos.numPaletas || 0,
                    peso_total_salida: datos.pesoTotalSalida || datos.pesoTotal || 0,
                    scrap_refile: datos.scrapRefile || datos.scrapTransparente || 0,
                    total_scrap: datos.totalScrap || 0,
                    merma: datos.merma || 0,
                    porcentaje_refil: datos.porcentajeRefil || 0,
                    etiquetas_entrada: datos.etiquetasEntrada || {},
                    observaciones: JSON.stringify(datos),
                    registrado_por_nombre: datos.registradoPorNombre || ''
                });
                console.log('[Corte] Registro guardado en Supabase');
            }
        } catch (error) {
            console.error('[Corte] Error guardando en Supabase:', error);
            alert('Error al guardar: ' + error.message);
        }
    },

    /**
     * Descuenta material del inventario despues de corte
     */
    descontarInventario: async function(datos) {
        try {
            let inventario = [];
            if (typeof AxonesDB !== 'undefined' && AxonesDB.isReady()) {
                inventario = await AxonesDB.materiales.listar() || [];
            }
            // Usar totalConsumido (entrada - restante) en vez de totalEntrada
            const cantidadUsada = parseFloat(datos.totalConsumido) || parseFloat(datos.totalEntrada) || 0;

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

                        // Update in Supabase
                        if (typeof AxonesDB !== 'undefined' && AxonesDB.isReady() && item.id) {
                            await AxonesDB.client.from('materiales').update({ stock_kg: item.kg }).eq('id', item.id);
                        }
                    }
                }
            }

            if (descontado) {
                console.log('Inventario actualizado despues de corte');

                // Verificar stock bajo y generar alertas
                await this.verificarStockBajo(inventario);
            }
        } catch (error) {
            console.warn('Error al descontar inventario en corte:', error);
        }
    },

    /**
     * Verifica si hay materiales con stock bajo y genera alertas
     */
    verificarStockBajo: async function(inventario) {
        const STOCK_MINIMO = 200; // Kg

        for (const item of inventario) {
            if ((item.kg || 0) < STOCK_MINIMO && (item.kg || 0) > 0) {
                try {
                    if (typeof AxonesDB !== 'undefined' && AxonesDB.isReady()) {
                        // Check for recent alert for this material
                        const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
                        const { data: existing } = await AxonesDB.client.from('alertas')
                            .select('id')
                            .eq('tipo', 'stock_bajo')
                            .gte('created_at', cutoff)
                            .like('mensaje', `%${item.material}%`)
                            .limit(1);

                        if (!existing || existing.length === 0) {
                            await AxonesDB.client.from('alertas').insert({
                                tipo: 'stock_bajo',
                                nivel: item.kg < 50 ? 'danger' : 'warning',
                                titulo: 'Stock bajo en corte',
                                mensaje: `Stock bajo en corte: ${item.material} ${item.micras || ''}µ - Quedan ${(item.kg || 0).toFixed(1)} Kg`,
                            });
                            console.log('Alerta de stock bajo generada para', item.material);
                        }
                    }
                } catch (e) {
                    console.warn('[Corte] Error generando alerta stock bajo:', e);
                }
            }
        }
    },

    /**
     * Genera una alerta por refil excedido
     */
    generarAlerta: async function(datos) {
        const nivel = datos.porcentajeRefil > CONFIG.UMBRALES_REFIL.default.maximo * 1.5
            ? CONFIG.ALERTAS.NIVELES.CRITICAL
            : CONFIG.ALERTAS.NIVELES.WARNING;

        try {
            if (typeof AxonesDB !== 'undefined' && AxonesDB.isReady()) {
                await AxonesDB.client.from('alertas').insert({
                    tipo: CONFIG.ALERTAS.TIPOS.REFIL_ALTO,
                    nivel: nivel,
                    titulo: 'Refil excedido en corte',
                    mensaje: `Refil ${datos.porcentajeRefil.toFixed(1)}% en Corte OT ${datos.ordenTrabajo}`,
                });
            }
        } catch (e) {
            console.warn('[Corte] Error generando alerta refil:', e);
        }

        Axones.showToast(
            `ALERTA: Refil ${datos.porcentajeRefil.toFixed(1)}% excedido en corte`,
            nivel === CONFIG.ALERTAS.NIVELES.CRITICAL ? 'danger' : 'warning'
        );
    },

    /**
     * Ofrece al usuario generar una Nota de Entrega despues de guardar corte
     */
    ofrecerNotaEntrega: function(datos) {
        const ot = datos.ordenTrabajo || '';
        if (!ot) return;

        // Mostrar boton flotante para generar nota de entrega
        const existente = document.getElementById('btnNotaEntrega');
        if (existente) existente.remove();

        const btn = document.createElement('div');
        btn.id = 'btnNotaEntrega';
        btn.innerHTML = `
            <div class="position-fixed bottom-0 end-0 p-3" style="z-index: 9999;">
                <div class="alert alert-success shadow-lg d-flex align-items-center gap-2" role="alert">
                    <i class="bi bi-file-earmark-text fs-4"></i>
                    <div>
                        <strong>Corte completado!</strong><br>
                        <small>Generar Nota de Entrega para ${ot}?</small>
                    </div>
                    <a href="nota-entrega.html?ot=${encodeURIComponent(ot)}" class="btn btn-success btn-sm ms-2">
                        <i class="bi bi-file-earmark-text me-1"></i>Nota de Entrega
                    </a>
                    <button class="btn-close ms-2" onclick="this.closest('#btnNotaEntrega').remove()"></button>
                </div>
            </div>
        `;
        document.body.appendChild(btn);

        // Auto-cerrar despues de 30 segundos
        setTimeout(() => {
            const el = document.getElementById('btnNotaEntrega');
            if (el) el.remove();
        }, 30000);
    },

    /**
     * Registra el producto terminado de corte en inventario de producto terminado
     */
    registrarProductoTerminado: async function(datos) {
        try {
            const pesoSalida = parseFloat(datos.pesoTotalSalida) || 0;
            if (pesoSalida <= 0) return;

            // Load existing producto terminado from sync_store
            let productoTerminado = [];
            if (typeof AxonesDB !== 'undefined' && AxonesDB.isReady()) {
                try {
                    const { data } = await AxonesDB.client.from('sync_store').select('value').eq('key', 'axones_producto_terminado').single();
                    if (data && data.value) productoTerminado = data.value;
                } catch (e) { /* key may not exist yet */ }
            }

            // Crear registro por cada paleta con datos
            const paletasConDatos = (datos.paletas || []).filter(p => p.pesoTotal > 0);

            paletasConDatos.forEach(paleta => {
                productoTerminado.unshift({
                    id: 'PT_' + Date.now() + '_P' + paleta.numero,
                    registroCorteId: datos.id,
                    fecha: datos.fecha,
                    timestamp: new Date().toISOString(),
                    ordenTrabajo: datos.ordenTrabajo,
                    cliente: datos.cliente,
                    producto: datos.producto,
                    maquina: datos.maquina,
                    operador: datos.operador,
                    paleta: paleta.numero,
                    numBobinas: paleta.totalBobinas,
                    pesoTotal: paleta.pesoTotal,
                    bobinas: paleta.bobinas,
                    estado: 'disponible',
                    ubicacion: 'Almacen',
                    registradoPor: datos.registradoPor,
                    registradoPorNombre: datos.registradoPorNombre,
                });
            });

            // Save to sync_store
            if (typeof AxonesDB !== 'undefined' && AxonesDB.isReady()) {
                await AxonesDB.client.from('sync_store').upsert(
                    { key: 'axones_producto_terminado', value: productoTerminado },
                    { onConflict: 'key' }
                );
            }

            const totalPaletas = paletasConDatos.length;
            const totalBobinas = paletasConDatos.reduce((sum, p) => sum + p.totalBobinas, 0);
            console.log(`Producto terminado: ${totalPaletas} paletas, ${totalBobinas} bobinas, ${pesoSalida.toFixed(2)} Kg registrados`);

            this.mostrarToast(
                `Producto terminado registrado: ${totalPaletas} paleta(s), ${totalBobinas} bobina(s), ${pesoSalida.toFixed(2)} Kg`,
                'success'
            );
        } catch (error) {
            console.warn('Error al registrar producto terminado:', error);
        }
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

    guardarChecklist: async function() {
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

        // Save to sync_store
        try {
            if (typeof AxonesDB !== 'undefined' && AxonesDB.isReady()) {
                let checklists = [];
                try {
                    const { data } = await AxonesDB.client.from('sync_store').select('value').eq('key', 'axones_checklists').single();
                    if (data && data.value) checklists = data.value;
                } catch (e) { /* key may not exist yet */ }
                checklists.unshift(datos);
                await AxonesDB.client.from('sync_store').upsert(
                    { key: 'axones_checklists', value: checklists },
                    { onConflict: 'key' }
                );
            }
        } catch (e) {
            console.warn('[Corte] Error guardando checklist:', e);
        }

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
    _timer: { estado: 'pendiente', inicio: null, tiempoMuerto: 0, pausaInicio: null, pausas: [], interval: null },
    initTemporizadores: function() {
        const self = this;
        document.getElementById('btnProdPlay')?.addEventListener('click', () => {
            if (self._timer.estado === 'detenido') return;
            self._timer.estado = 'corriendo'; self._timer.inicio = self._timer.inicio || Date.now();
            document.getElementById('timerProdPausaForm').style.display = 'none'; self.timerUpdateUI();
            if (self._timer.interval) clearInterval(self._timer.interval);
            self._timer.interval = setInterval(() => self.timerTick(), 1000);
        });
        document.getElementById('btnProdPause')?.addEventListener('click', () => {
            if (self._timer.estado !== 'corriendo') return;
            self._timer.estado = 'pausado'; self._timer.pausaInicio = Date.now();
            document.getElementById('timerProdPausaForm').style.display = ''; self.timerUpdateUI();
        });
        document.getElementById('btnProdConfirmPause')?.addEventListener('click', () => {
            const motivo = document.getElementById('timerProdPausaMotivo')?.value;
            if (!motivo) { alert('Seleccione un motivo'); return; }
            const obs = document.getElementById('timerProdPausaObs')?.value || '';
            const dur = Date.now() - (self._timer.pausaInicio || Date.now());
            self._timer.tiempoMuerto += dur;
            self._timer.pausas.push({ timestamp: new Date(self._timer.pausaInicio).toISOString(), motivo: motivo + (obs ? ': ' + obs : ''), duracion: dur });
            self._timer.estado = 'corriendo'; self._timer.pausaInicio = null;
            document.getElementById('timerProdPausaForm').style.display = 'none';
            document.getElementById('timerProdPausaMotivo').value = ''; document.getElementById('timerProdPausaObs').value = '';
            self.timerUpdateUI(); self.renderPausasProduccion();
        });
        document.getElementById('timerProdPausaMotivo')?.addEventListener('change', function() {
            const o = document.getElementById('timerProdPausaObs'); if (o) o.style.display = this.value === 'Otro' ? '' : 'none';
        });
        // Fin de Turno - guarda registro del turno y limpia para el siguiente
        document.getElementById('btnProdStop')?.addEventListener('click', async () => {
            if (!confirm('¿Confirma fin de turno?\n\nSe guardara el registro de este turno y se limpiara el formulario para el siguiente turno.')) return;
            // Cerrar pausa si hay
            if (self._timer.estado === 'pausado' && self._timer.pausaInicio) {
                self._timer.tiempoMuerto += Date.now() - self._timer.pausaInicio;
                self._timer.pausas.push({ timestamp: new Date(self._timer.pausaInicio).toISOString(), motivo: 'Fin de turno', duracion: Date.now() - self._timer.pausaInicio });
            }
            self._timer.estado = 'detenido';
            if (self._timer.interval) { clearInterval(self._timer.interval); self._timer.interval = null; }
            self.timerTick(); self.timerUpdateUI();

            // GUARDAR el turno automaticamente
            try {
                const datos = self.recopilarDatos();
                await self.guardarLocal(datos);
                await self.descontarInventario(datos);
                self.limpiarAutosave();
                if (typeof showToast === 'function') showToast('Turno guardado exitosamente. Formulario listo para el siguiente turno.', 'success');
            } catch (e) {
                console.error('[Corte] Error guardando turno:', e);
                alert('Error al guardar el turno: ' + e.message);
                return;
            }

            // Limpiar formulario PERO mantener la OT seleccionada
            const ordenCargadaBackup = self.ordenCargada;
            const form = document.getElementById('formCorte');
            if (form) {
                form.querySelectorAll('input[type=number], input[type=text], textarea').forEach(el => {
                    if (el.id !== 'ordenTrabajo') el.value = '';
                });
                form.querySelectorAll('input[type=radio], input[type=checkbox]').forEach(el => el.checked = false);
                ['totalMaterialEntrada', 'totalScrap', 'pesoTotal', 'numBobinas'].forEach(id => {
                    const el = document.getElementById(id); if (el) el.value = '';
                });
            }

            // Resetear timer para el nuevo turno
            self._timer = { estado: 'pendiente', inicio: null, tiempoMuerto: 0, pausaInicio: null, pausas: [], interval: null };
            self.timerUpdateUI();
            const timerDisplay = document.getElementById('timerProdDisplay');
            if (timerDisplay) timerDisplay.textContent = '00:00:00';
            const muertoDisplay = document.getElementById('timerMuertoDisplay');
            if (muertoDisplay) muertoDisplay.textContent = '00:00:00';
            const efectivoDisplay = document.getElementById('timerEfectivoDisplay');
            if (efectivoDisplay) efectivoDisplay.textContent = '00:00:00';

            // Restaurar OT y recargar acumulado
            self.ordenCargada = ordenCargadaBackup;
            if (ordenCargadaBackup) await self.cargarAcumuladoOT(ordenCargadaBackup);

            // Ocultar seccion finalizar si estaba visible
            const secFin = document.getElementById('seccionFinalizarOrden');
            if (secFin) secFin.style.display = 'none';
        });

        // Finalizar Orden - muestra resumen de produccion
        document.getElementById('btnFinalizarOrden')?.addEventListener('click', () => {
            const seccion = document.getElementById('seccionFinalizarOrden');
            if (seccion) {
                seccion.style.display = '';
                seccion.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }
            if (typeof showToast === 'function') showToast('Revise el resumen de produccion para finalizar la orden.', 'info');
        });
    },
    timerTick: function() {
        const t = this._timer; if (!t.inicio) return;
        const total = Date.now() - t.inicio;
        const muerto = t.tiempoMuerto + (t.estado === 'pausado' && t.pausaInicio ? (Date.now() - t.pausaInicio) : 0);
        const efectivo = Math.max(0, total - muerto);
        const el = document.getElementById('timerProdDisplay'); if (el) el.textContent = this.formatearTiempoMs(total);
        const em = document.getElementById('timerMuertoDisplay'); if (em) em.textContent = this.formatearTiempoMs(muerto);
        const ee = document.getElementById('timerEfectivoDisplay'); if (ee) ee.textContent = this.formatearTiempoMs(efectivo);
        const ek = document.getElementById('timerKgHora');
        if (ek && efectivo > 60000) { const p = parseFloat(document.getElementById('pesoTotal')?.value) || 0; ek.textContent = (p / (efectivo / 3600000)).toFixed(0); }
    },
    timerUpdateUI: function() {
        const t = this._timer; const b = document.getElementById('timerProdEstado');
        if (b) { const l = { pendiente: 'Pendiente', corriendo: 'En Produccion', pausado: 'Parada', detenido: 'Detenido' };
        const c = { pendiente: 'bg-secondary', corriendo: 'bg-success', pausado: 'bg-warning text-dark', detenido: 'bg-primary' };
        b.textContent = l[t.estado] || t.estado; b.className = 'badge ' + (c[t.estado] || 'bg-secondary'); }
        const p = document.getElementById('btnProdPlay'), pa = document.getElementById('btnProdPause'), s = document.getElementById('btnProdStop');
        if (p) p.disabled = t.estado === 'corriendo' || t.estado === 'detenido';
        if (pa) pa.disabled = t.estado !== 'corriendo';
        if (s) s.disabled = t.estado === 'pendiente' || t.estado === 'detenido';
        const finalizar = document.getElementById('btnFinalizarOrden');
        if (finalizar) finalizar.disabled = t.estado === 'pendiente';
    },
    renderPausasProduccion: function() {
        const c = document.getElementById('timerProdPausas'); if (!c) return;
        const p = this._timer.pausas; if (!p.length) { c.innerHTML = ''; return; }
        let h = '<div class="small mt-1"><strong>Paradas:</strong><ul class="mb-0" style="padding-left:1.2rem;">';
        p.forEach(x => { const hr = new Date(x.timestamp).toLocaleTimeString('es-VE', { hour: '2-digit', minute: '2-digit' });
        h += `<li>${hr} - ${x.motivo} <small class="text-muted">(${this.formatearTiempoMs(x.duracion)})</small></li>`; });
        h += '</ul></div>'; c.innerHTML = h;
    },
    formatearTiempoMs: function(ms) {
        const s = Math.floor(ms / 1000), h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), ss = s % 60;
        return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(ss).padStart(2, '0')}`;
    },

    /**
     * Datos de etiquetas de bobinas de entrada
     */
    etiquetasData: { entrada: {} },

    /**
     * Configura flechitas de etiquetas en bobinas de entrada
     */
    setupEtiquetasBobinas: function() {
        const self = this;
        const entradaFields = ['Proveedor', 'Referencia', 'Medida', 'Micraje', 'TratInt', 'TratExt', 'Fecha', 'Maquina', 'Pedido'];

        // Inyectar flechitas en bobinas de entrada (bob1-bob14)
        for (let i = 1; i <= 14; i++) {
            const input = document.getElementById('bob' + i);
            if (!input) continue;
            const label = input.previousElementSibling;
            if (!label || label.querySelector('.bobina-arrow')) continue;
            const wrapper = document.createElement('span');
            wrapper.className = 'bobina-label-wrapper';
            wrapper.innerHTML = label.innerHTML;
            const arrow = document.createElement('i');
            arrow.className = 'bi bi-caret-down-fill bobina-arrow';
            arrow.dataset.tipo = 'entrada';
            arrow.dataset.bobina = 'bob' + i;
            arrow.dataset.numero = i;
            arrow.title = 'Etiqueta bobina ' + i;
            wrapper.appendChild(arrow);
            label.innerHTML = '';
            label.appendChild(wrapper);
        }

        // Delegated click handler for arrows
        document.addEventListener('click', function(e) {
            const arrow = e.target.closest('.bobina-arrow');
            if (!arrow) return;
            const bobinaId = arrow.dataset.bobina;
            const numero = arrow.dataset.numero;

            document.getElementById('etqEntBobinaId').value = bobinaId;
            document.getElementById('etqEntNumero').textContent = numero;
            const data = self.etiquetasData.entrada[bobinaId] || {};
            entradaFields.forEach(f => {
                const el = document.getElementById('etqEnt' + f);
                if (el) el.value = data[f] || '';
            });
            new bootstrap.Modal(document.getElementById('modalEtiquetaEntrada')).show();
        });

        // Save button for entrada
        const btnEnt = document.getElementById('btnGuardarEtqEnt');
        if (btnEnt) {
            btnEnt.addEventListener('click', function() {
                const bobinaId = document.getElementById('etqEntBobinaId').value;
                const data = {};
                let hasData = false;
                entradaFields.forEach(f => {
                    const val = document.getElementById('etqEnt' + f)?.value || '';
                    data[f] = val;
                    if (val) hasData = true;
                });
                self.etiquetasData.entrada[bobinaId] = data;
                const arrow = document.querySelector(`.bobina-arrow[data-bobina="${bobinaId}"]`);
                if (arrow) arrow.classList.toggle('has-data', hasData);
                bootstrap.Modal.getInstance(document.getElementById('modalEtiquetaEntrada'))?.hide();
            });
        }
    },

    /**
     * Limpia el formulario
     */
    AUTOSAVE_KEY: 'axones_autosave_corte',
    autosave: function() {
        const form = document.getElementById('formCorte');
        if (!form || form.style.display === 'none' || !this.ordenCargada) return;
        const data = { timestamp: Date.now(), ordenId: this.ordenCargada?.id || '', ordenNumero: this.ordenCargada?.numeroOrden || this.ordenCargada?.nombreOT || '', campos: {} };
        form.querySelectorAll('input, select, textarea').forEach(el => {
            if (el.id && el.type !== 'hidden') { data.campos[el.id] = el.type === 'checkbox' || el.type === 'radio' ? el.checked : el.value; }
        });
        data.timer = { ...this._timer, interval: null };
        localStorage.setItem(this.AUTOSAVE_KEY, JSON.stringify(data));
    },
    restaurarAutosave: function() {
        const saved = localStorage.getItem(this.AUTOSAVE_KEY);
        if (!saved) return;
        try {
            const data = JSON.parse(saved);
            if (Date.now() - data.timestamp > 12 * 60 * 60 * 1000) { localStorage.removeItem(this.AUTOSAVE_KEY); return; }
            const hace = Math.floor((Date.now() - data.timestamp) / 60000);
            if (!confirm(`Se encontraron datos sin guardar de la OT ${data.ordenNumero} (hace ${hace} min).\n\n¿Desea recuperarlos?`)) { localStorage.removeItem(this.AUTOSAVE_KEY); return; }
            const select = document.getElementById('ordenTrabajo');
            if (select && data.ordenId) { for (let i = 0; i < select.options.length; i++) { if (select.options[i].value === data.ordenId || select.options[i].textContent.includes(data.ordenNumero)) { select.selectedIndex = i; select.dispatchEvent(new Event('change')); break; } } }
            setTimeout(() => {
                const f = document.getElementById('formCorte'); if (!f) return;
                Object.entries(data.campos || {}).forEach(([id, v]) => { const el = document.getElementById(id); if (!el) return; if (el.type === 'checkbox' || el.type === 'radio') el.checked = v; else el.value = v; });
                if (data.timer) {
                    this._timer = { ...data.timer, interval: null };
                    if ((this._timer.estado === 'corriendo' || this._timer.estado === 'pausado') && this._timer.inicio) {
                        this._timer.interval = setInterval(() => this.timerTick(), 1000);
                        if (this._timer.estado === 'pausado') {
                            const pf = document.getElementById('timerProdPausaForm'); if (pf) pf.style.display = '';
                        }
                    }
                    this.timerUpdateUI(); this.timerTick();
                }
                if (typeof showToast === 'function') showToast('Datos recuperados de la sesion anterior', 'info');
            }, 500);
        } catch (e) { localStorage.removeItem(this.AUTOSAVE_KEY); }
    },
    limpiarAutosave: function() { localStorage.removeItem(this.AUTOSAVE_KEY); },

    limpiar: function() {
        this.limpiarAutosave();
        const form = document.getElementById('formCorte');
        if (form) {
            form.reset();

            // Limpiar campos calculados
            const campos = ['totalEntrada', 'merma', 'totalScrap', 'porcentajeRefil', 'pesoTotalSalida'];
            campos.forEach(id => {
                const el = document.getElementById(id);
                if (el) el.value = '';
            });

            const numCampos = ['numBobinasSalida', 'numPaletas', 'numRollosSalida'];
            numCampos.forEach(id => {
                const el = document.getElementById(id);
                if (el) el.value = '0';
            });

            // Limpiar totales de paletas
            this.paletas.forEach(paleta => {
                const totalInput = document.getElementById(`totalPaleta${paleta.id}`);
                if (totalInput) totalInput.value = '0';

                const countBadge = document.getElementById(`countPaleta${paleta.id}`);
                if (countBadge) countBadge.textContent = `0/${this.BOBINAS_POR_PALETA}`;
            });

            // Limpiar resumen total
            const resumenBobTotal = document.getElementById('resumenBobTotal');
            const resumenRollosTotal = document.getElementById('resumenRollosTotal');
            const resumenPesoTotal = document.getElementById('resumenPesoTotal');
            if (resumenBobTotal) resumenBobTotal.textContent = '0';
            if (resumenRollosTotal) resumenRollosTotal.textContent = '0';
            if (resumenPesoTotal) resumenPesoTotal.textContent = '0.00';

            const indicador = document.getElementById('indicadorRefil');
            if (indicador) {
                indicador.className = 'alert alert-secondary py-1 px-2 mb-0 small text-center';
                indicador.innerHTML = '<i class="bi bi-dash-circle me-1"></i> Sin datos';
            }

            // Resetear footer
            ['footerEntrada', 'footerSalida', 'footerMerma', 'footerRefil', 'footerPaletas', 'footerBobinas'].forEach(id => {
                const el = document.getElementById(id);
                if (el) el.textContent = '0';
            });

            // Resetear resumen de produccion
            ['resumenEntrada', 'resumenConsumido', 'resumenSalida', 'resumenScrap', 'resumenMermaCalc', 'resumenRefilCalc'].forEach(id => {
                const el = document.getElementById(id);
                if (el) el.textContent = '0.00 Kg';
            });

            // totalConsumido element removed (restante section eliminated)
        }

        // Resetear seleccion de OT
        const select = document.getElementById('ordenTrabajo');
        if (select) select.value = '';
        this.ocultarResumenYForm();
    },
};

// Inicializar cuando el DOM este listo
document.addEventListener('DOMContentLoaded', () => {
    if (document.getElementById('selectorOT') || document.getElementById('formCorte')) {
        Corte.init();
    }
});

// Exportar modulo
if (typeof module !== 'undefined' && module.exports) {
    module.exports = Corte;
}
