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
    init: async function() {
        // Esperar a que AxonesSync termine de descargar datos del cloud
        await this._esperarSync();

        console.log('Inicializando modulo Control de Laminacion');

        this.setupEventListeners();
        this.setupCalculations();
        this.initDevolucionRechazada();
        this.initConsumoTintas();
        this.initSolventes();

        // Poblar selector de OTs y verificar si viene una por URL
        this.poblarSelectorOT();
        this.cargarDesdeOrden();

        // Inicializar controles de tiempo
        this.inicializarControlTiempo();

        // Inicializar checklist
        this.setupChecklist();

        // Calcular tiempo de preparacion automatico
        this.setupTiempoPreparacion();

        // Flechitas de etiquetas en bobinas
        this.setupEtiquetasBobinas();

        // Escuchar re-sync del cloud para recargar datos
        window.addEventListener('axones-sync', () => {
            this.poblarSelectorOT();
        });
    },

    /**
     * Espera a que AxonesSync termine la descarga inicial (max 5 segundos)
     */
    _esperarSync: async function() {
        if (typeof AxonesSync !== 'undefined' && AxonesSync._isReady && AxonesSync._isReady()) {
            return;
        }
        return new Promise(resolve => {
            let resuelto = false;
            const handler = () => { if (!resuelto) { resuelto = true; resolve(); } };
            window.addEventListener('axones-sync', handler, { once: true });
            setTimeout(() => {
                if (!resuelto) { resuelto = true; window.removeEventListener('axones-sync', handler); resolve(); }
            }, 5000);
        });
    },

    /**
     * Inicializa los controles de tiempo (Play/Pausa/Completado)
     */
    inicializarControlTiempo: function() {
        const form = document.getElementById('formLaminacion');
        if (!form || document.getElementById('controlTiempoLaminacion')) return;

        // Solo insertar panel de Control de Tiempo (Play/Pausa/Completar/Despacho)
        // El selector de OT ahora es el dropdown principal, no el panel de comandas
        const panelHTML = `
            <div id="controlTiempoLaminacion" class="card mb-3" style="display: none; border-color: #6f42c1;">
                <div class="card-header py-2" style="background-color: #6f42c1; color: white;">
                    <div class="d-flex align-items-center justify-content-between">
                        <span><i class="bi bi-stopwatch me-2"></i>Control de Tiempo - Laminacion</span>
                        <span id="ordenActivaLaminacion" class="badge bg-light" style="color: #6f42c1;">Sin orden</span>
                    </div>
                </div>
                <div class="card-body py-2" id="contenedorControlTiempoLam" data-orden-id="" data-fase="laminacion">
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
     * Pobla el selector de OT con ordenes pendientes/en-proceso
     */
    poblarSelectorOT: function() {
        const select = document.getElementById('ordenTrabajo');
        if (!select) return;

        let ordenes = [];
        try {
            ordenes = JSON.parse(localStorage.getItem('axones_ordenes_trabajo') || '[]');
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
            badge.className = disponibles.length > 0 ? 'badge bg-primary' : 'badge bg-secondary';
        }
    },

    /**
     * Carga OT desde URL (?ot=OT-2026-0001) si viene con parametro
     */
    cargarDesdeOrden: function() {
        const params = new URLSearchParams(window.location.search);
        const ot = params.get('ot');
        if (!ot) return;

        let ordenes = [];
        try {
            ordenes = JSON.parse(localStorage.getItem('axones_ordenes_trabajo') || '[]');
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
        const form = document.getElementById('formLaminacion');
        if (form) form.style.display = '';

        // Actualizar badge
        const badge = document.getElementById('estadoOT');
        if (badge) {
            badge.textContent = orden.numeroOrden || orden.ot;
            badge.className = 'badge bg-success';
        }

        // Mostrar y actualizar control de tiempo (Play/Pausa/Completar/Despacho)
        const panelTiempo = document.getElementById('controlTiempoLaminacion');
        if (panelTiempo) panelTiempo.style.display = 'block';
        this.actualizarControlTiempo(orden.id || orden.ot, orden.numeroOrden || orden.ot);

        console.log('[Laminacion] OT seleccionada:', orden.numeroOrden || orden.ot);
    },

    /**
     * Oculta resumen y formulario cuando no hay OT seleccionada
     */
    ocultarResumenYForm: function() {
        this.ordenCargada = null;
        const resumen = document.getElementById('resumenOT');
        const form = document.getElementById('formLaminacion');
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
        document.getElementById('otMetrosEst').textContent = n(orden.metrosImp || orden.metrosEstimados || orden.metrosLam);
        document.getElementById('otMaquina').textContent = v(orden.maquina);
        document.getElementById('otEstructura').textContent = v(orden.estructuraMaterial);

        // Datos del Producto
        document.getElementById('otCliente').textContent = v(orden.cliente);
        document.getElementById('otClienteRif').textContent = v(orden.clienteRif);
        document.getElementById('otProducto').textContent = v(orden.producto);
        document.getElementById('otCpe').textContent = v(orden.cpe);

        // Area de Laminacion
        // Tipo laminado: inferir de ficha tecnica si no viene directo
        let tipoLaminado = orden.tipoLaminado || '';
        if (!tipoLaminado) {
            if (orden.fichaTipoMat2 && !orden.fichaTipoMat3) {
                tipoLaminado = 'Bilaminado';
            } else if (orden.fichaTipoMat3 || (orden.capasAdicionales && orden.capasAdicionales.length > 0)) {
                tipoLaminado = 'Trilaminado';
            }
        }
        document.getElementById('otTipoLaminado').textContent = v(tipoLaminado);
        document.getElementById('otFiguraEmb').textContent = v(orden.figuraEmbobinadoMontaje || orden.figuraEmbobinadoLam);
        document.getElementById('otGramajeAdhDesde').textContent = v(orden.fichaGramajeAdhesivo || orden.gramajeAdhesivo);
        document.getElementById('otGramajeAdhHasta').textContent = v(orden.fichaGramajeAdhesivoHasta);

        // Relacion mezcla
        let relacionMezcla = orden.relacionMezcla || '';
        if (!relacionMezcla && orden.fichaRelacionCatalizador) {
            const mapRelacion = { '1.25': '100/80', '10': '10:1', '5': '5:1', '3': '3:1' };
            relacionMezcla = mapRelacion[String(orden.fichaRelacionCatalizador)] || orden.fichaRelacionCatalizador;
        }
        document.getElementById('otRelacionMezcla').textContent = v(relacionMezcla);
        document.getElementById('otMaterialVirgen').textContent = v(orden.sustratosVirgen || orden.materialVirgen);

        // Metros estimados para laminacion
        let metrosLam = orden.metrosLam || orden.metrosImp || orden.metrosEstimados || '';
        if (!metrosLam && orden.pedidoKg && orden.fichaMicras1 && orden.fichaAncho1) {
            const ancho = parseFloat(orden.fichaAncho1) / 1000;
            const micras = parseFloat(orden.fichaMicras1);
            const densidad = parseFloat(orden.fichaDensidad1) || 0.90;
            const gramaje = ancho * micras * densidad;
            if (gramaje > 0) {
                metrosLam = Math.round((parseFloat(orden.pedidoKg) * 1000) / gramaje);
            }
        }
        document.getElementById('otMetrosLam').textContent = n(metrosLam);

        // Ficha Tecnica
        document.getElementById('otTipoMat').textContent = v(orden.fichaTipoMat1 || orden.tipoMaterial);
        document.getElementById('otMicras').textContent = v(orden.fichaMicras1 || orden.micrasMaterial);
        document.getElementById('otAncho').textContent = v(orden.fichaAncho1 || orden.anchoMaterial);
        document.getElementById('otDensidad').textContent = v(orden.fichaDensidad1);
        document.getElementById('otKgNecesarios').textContent = n(orden.fichaKg1);

        // Mostrar el resumen
        resumen.classList.add('visible');
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

        // Calcular al cambiar devolucion buena
        const devBuenaInput = document.getElementById('devolucionBuenaKg');
        if (devBuenaInput) {
            devBuenaInput.addEventListener('input', () => this.calcularTotales());
        }

        // Calcular total de scrap
        document.querySelectorAll('.scrap-input').forEach(input => {
            input.addEventListener('input', () => this.calcularTotales());
        });

        // Calcular total de bobinas virgen (materia prima)
        document.querySelectorAll('.bobina-virgen').forEach(input => {
            input.addEventListener('input', () => this.calcularTotales());
        });

        // Calcular total de restante virgen
        document.querySelectorAll('.restante-virgen').forEach(input => {
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
        const scrapTransparente = parseFloat(document.getElementById('scrapTransparente')?.value) || 0;
        const scrapImpreso = parseFloat(document.getElementById('scrapImpreso')?.value) || 0;
        const scrapLaminado = parseFloat(document.getElementById('scrapLaminado')?.value) || 0;
        const totalScrap = scrapTransparente + scrapImpreso + scrapLaminado;
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

        // Devolucion buena y rechazada
        const devBuena = parseFloat(document.getElementById('devolucionBuenaKg')?.value) || 0;
        const devRechazada = this.calcularTotalDevolucionRechazada();
        const totalDevuelto = devBuena + devRechazada;
        const totalConsumido = totalEntrada - totalDevuelto;

        // Actualizar badges de devolucion
        const totalDevBuenoEl = document.getElementById('totalDevueltoBueno');
        if (totalDevBuenoEl) totalDevBuenoEl.textContent = devBuena.toFixed(2);
        const totalDevRechazadoEl = document.getElementById('totalDevueltoRechazado');
        if (totalDevRechazadoEl) totalDevRechazadoEl.textContent = devRechazada.toFixed(2);
        const totalConsumidoEl = document.getElementById('totalConsumido');
        if (totalConsumidoEl) totalConsumidoEl.textContent = totalConsumido.toFixed(2);

        // Total bobinas virgen (materia prima)
        let totalEntradaVirgen = 0;
        document.querySelectorAll('.bobina-virgen').forEach(input => {
            totalEntradaVirgen += parseFloat(input.value) || 0;
        });
        const totalEntradaVirgenEl = document.getElementById('totalEntradaVirgen');
        if (totalEntradaVirgenEl) totalEntradaVirgenEl.value = totalEntradaVirgen.toFixed(2);

        // Total restante virgen
        let totalRestanteVirgen = 0;
        document.querySelectorAll('.restante-virgen').forEach(input => {
            totalRestanteVirgen += parseFloat(input.value) || 0;
        });
        const totalRestanteVirgenEl = document.getElementById('totalRestanteVirgen');
        if (totalRestanteVirgenEl) totalRestanteVirgenEl.value = totalRestanteVirgen.toFixed(2);

        const totalConsumidoVirgen = totalEntradaVirgen - totalRestanteVirgen;
        const totalConsumidoVirgenEl = document.getElementById('totalConsumidoVirgen');
        if (totalConsumidoVirgenEl) totalConsumidoVirgenEl.textContent = totalConsumidoVirgen.toFixed(2);

        // Consumo adhesivo para resumen
        const consumoAdhesivo = parseFloat(document.getElementById('consumoAdhesivo')?.textContent) || 0;

        // Actualizar Resumen de Produccion
        const resEntrada = document.getElementById('resumenEntrada');
        const resDevBuena = document.getElementById('resumenDevBuena');
        const resDevRechazada = document.getElementById('resumenDevRechazada');
        const resConsumido = document.getElementById('resumenConsumido');
        const resSalida = document.getElementById('resumenSalida');
        const resScrap = document.getElementById('resumenScrap');
        const resAdhesivo = document.getElementById('resumenAdhesivo');
        const resMerma = document.getElementById('resumenMermaCalc');
        const resRefil = document.getElementById('resumenRefilCalc');
        if (resEntrada) resEntrada.textContent = totalEntrada.toFixed(2) + ' Kg';
        if (resDevBuena) resDevBuena.textContent = devBuena.toFixed(2) + ' Kg';
        if (resDevRechazada) resDevRechazada.textContent = devRechazada.toFixed(2) + ' Kg';
        if (resConsumido) resConsumido.textContent = totalConsumido.toFixed(2) + ' Kg';
        // Resumen virgen
        const resEntradaVirgen = document.getElementById('resumenEntradaVirgen');
        const resRestanteVirgen = document.getElementById('resumenRestanteVirgen');
        const resConsumidoVirgen = document.getElementById('resumenConsumidoVirgen');
        if (resEntradaVirgen) resEntradaVirgen.textContent = totalEntradaVirgen.toFixed(2) + ' Kg';
        if (resRestanteVirgen) resRestanteVirgen.textContent = totalRestanteVirgen.toFixed(2) + ' Kg';
        if (resConsumidoVirgen) resConsumidoVirgen.textContent = totalConsumidoVirgen.toFixed(2) + ' Kg';
        if (resSalida) resSalida.textContent = totalSalida.toFixed(2) + ' Kg';
        if (resScrap) resScrap.textContent = totalScrap.toFixed(2) + ' Kg';
        if (resAdhesivo) resAdhesivo.textContent = consumoAdhesivo.toFixed(2) + ' Kg';
        const mermaResumen = totalConsumido - totalSalida - totalScrap;
        if (resMerma) resMerma.textContent = mermaResumen.toFixed(2) + ' Kg';
        let refilResumen = 0;
        if (totalConsumido > 0) {
            refilResumen = (totalScrap / totalConsumido) * 100;
        }
        if (resRefil) resRefil.textContent = refilResumen.toFixed(2) + '%';

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
    // ==========================================
    // DEVOLUCION RECHAZADA
    // ==========================================

    initDevolucionRechazada: function() {
        const btnAgregar = document.getElementById('btnAgregarRechazo');
        if (btnAgregar) {
            btnAgregar.addEventListener('click', () => this.agregarFilaRechazo());
        }
        const btnReporte = document.getElementById('btnReporteRechazo');
        if (btnReporte) {
            btnReporte.addEventListener('click', () => this.generarReporteRechazo());
        }
    },

    agregarFilaRechazo: function() {
        const tbody = document.getElementById('bodyDevolucionRechazada');
        if (!tbody) return;
        const hoy = new Date().toISOString().split('T')[0];
        const ahora = new Date().toTimeString().slice(0, 5);
        const fila = document.createElement('tr');
        fila.innerHTML = `
            <td><input type="text" class="form-control form-control-sm rechazo-proveedor" placeholder="Proveedor"></td>
            <td><input type="text" class="form-control form-control-sm rechazo-ref" placeholder="Ref. bobina"></td>
            <td><input type="number" class="form-control form-control-sm rechazo-kg" step="0.01" min="0" value="0"></td>
            <td><select class="form-select form-select-sm rechazo-motivo">
                <option value="">Seleccionar</option>
                <option value="Material defectuoso">Material defectuoso</option>
                <option value="Fuera de especificacion">Fuera de especificacion</option>
                <option value="Inicio de bobina malo">Inicio de bobina malo</option>
                <option value="Final de bobina malo">Final de bobina malo</option>
                <option value="Problemas de tratamiento">Problemas de tratamiento</option>
                <option value="Contaminacion">Contaminacion</option>
                <option value="Otro">Otro</option>
            </select></td>
            <td><input type="date" class="form-control form-control-sm rechazo-fecha" value="${hoy}"></td>
            <td><input type="time" class="form-control form-control-sm rechazo-hora" value="${ahora}"></td>
            <td><button type="button" class="btn btn-sm btn-outline-danger btn-quitar-rechazo" title="Quitar"><i class="bi bi-x"></i></button></td>
        `;
        fila.querySelector('.btn-quitar-rechazo').addEventListener('click', () => { fila.remove(); this.calcularTotales(); });
        fila.querySelector('.rechazo-kg').addEventListener('input', () => this.calcularTotales());
        tbody.appendChild(fila);
    },

    calcularTotalDevolucionRechazada: function() {
        let total = 0;
        document.querySelectorAll('.rechazo-kg').forEach(input => { total += parseFloat(input.value) || 0; });
        const totalEl = document.getElementById('totalDevolucionRechazada');
        if (totalEl) totalEl.textContent = total.toFixed(2);
        return total;
    },

    recopilarDevolucionRechazada: function() {
        const filas = document.querySelectorAll('#bodyDevolucionRechazada tr');
        const datos = [];
        filas.forEach(fila => {
            const kg = parseFloat(fila.querySelector('.rechazo-kg')?.value) || 0;
            if (kg > 0) {
                datos.push({
                    proveedor: fila.querySelector('.rechazo-proveedor')?.value || '',
                    referencia: fila.querySelector('.rechazo-ref')?.value || '',
                    kg: kg,
                    motivo: fila.querySelector('.rechazo-motivo')?.value || '',
                    fecha: fila.querySelector('.rechazo-fecha')?.value || '',
                    hora: fila.querySelector('.rechazo-hora')?.value || ''
                });
            }
        });
        return datos;
    },

    generarReporteRechazo: function() {
        const datos = this.recopilarDevolucionRechazada();
        if (datos.length === 0) {
            if (typeof showToast === 'function') showToast('No hay bobinas rechazadas para reportar', 'warning');
            return;
        }
        const porProveedor = {};
        datos.forEach(d => {
            const prov = d.proveedor || 'Sin proveedor';
            if (!porProveedor[prov]) porProveedor[prov] = [];
            porProveedor[prov].push(d);
        });
        const numOT = document.getElementById('ordenTrabajo')?.value || 'N/A';
        let html = `<div style="font-family: Arial, sans-serif; max-width: 800px; margin: 0 auto; padding: 20px;">
            <div style="text-align: center; margin-bottom: 20px;">
                <h2 style="margin:0">INVERSIONES AXONES 2008, C.A.</h2>
                <p style="margin:2px 0">RIF: J-40081341-7</p>
                <h3 style="margin:10px 0; color: #dc3545;">REPORTE DE MATERIAL RECHAZADO - LAMINACION</h3>
                <p style="margin:2px 0">Orden de Trabajo: <strong>${numOT}</strong></p>
                <p style="margin:2px 0">Fecha de emision: ${new Date().toLocaleDateString('es-VE')}</p>
            </div>`;
        Object.keys(porProveedor).forEach(proveedor => {
            const items = porProveedor[proveedor];
            const totalKg = items.reduce((sum, d) => sum + d.kg, 0);
            html += `<div style="margin-bottom: 20px; border: 1px solid #dc3545; border-radius: 6px; padding: 12px;">
                <h4 style="color: #dc3545; margin: 0 0 10px 0;">Proveedor: ${proveedor}</h4>
                <table style="width:100%; border-collapse: collapse; font-size: 13px;">
                    <thead><tr style="background: #f8d7da;">
                        <th style="border:1px solid #ddd; padding:6px;">Ref. Bobina</th>
                        <th style="border:1px solid #ddd; padding:6px;">Kg</th>
                        <th style="border:1px solid #ddd; padding:6px;">Motivo</th>
                        <th style="border:1px solid #ddd; padding:6px;">Fecha</th>
                        <th style="border:1px solid #ddd; padding:6px;">Hora</th>
                    </tr></thead><tbody>`;
            items.forEach(item => {
                html += `<tr>
                    <td style="border:1px solid #ddd; padding:6px;">${item.referencia}</td>
                    <td style="border:1px solid #ddd; padding:6px; text-align:right;">${item.kg.toFixed(2)}</td>
                    <td style="border:1px solid #ddd; padding:6px;">${item.motivo}</td>
                    <td style="border:1px solid #ddd; padding:6px;">${item.fecha}</td>
                    <td style="border:1px solid #ddd; padding:6px;">${item.hora}</td>
                </tr>`;
            });
            html += `</tbody><tfoot><tr style="background: #f8d7da; font-weight: bold;">
                <td style="border:1px solid #ddd; padding:6px; text-align:right;">Total:</td>
                <td style="border:1px solid #ddd; padding:6px; text-align:right;">${totalKg.toFixed(2)} Kg</td>
                <td colspan="3" style="border:1px solid #ddd; padding:6px;"></td>
            </tr></tfoot></table></div>`;
        });
        html += `<div style="margin-top: 30px; display: flex; justify-content: space-between;">
            <div style="text-align: center; width: 40%;"><div style="border-top: 1px solid #333; padding-top: 5px;">Responsable de Produccion</div></div>
            <div style="text-align: center; width: 40%;"><div style="border-top: 1px solid #333; padding-top: 5px;">Jefe de Operaciones</div></div>
        </div></div>`;
        const ventana = window.open('', '_blank', 'width=850,height=600');
        ventana.document.write('<html><head><title>Reporte Material Rechazado - ' + numOT + '</title></head><body>');
        ventana.document.write(html);
        ventana.document.write('</body></html>');
        ventana.document.close();
        ventana.print();
        const reportes = JSON.parse(localStorage.getItem('axones_reportes_rechazo') || '[]');
        reportes.unshift({ id: 'RR_' + Date.now(), timestamp: new Date().toISOString(), ordenTrabajo: numOT, modulo: 'laminacion', datos: this.recopilarDevolucionRechazada(), totalKg: this.calcularTotalDevolucionRechazada() });
        localStorage.setItem('axones_reportes_rechazo', JSON.stringify(reportes));
    },

    // ==========================================
    // CONSUMO Y DEVOLUCION DE TINTAS
    // ==========================================

    initConsumoTintas: function() {
        const btnAgregar = document.getElementById('btnAgregarTinta');
        if (btnAgregar) btnAgregar.addEventListener('click', () => this.agregarFilaTinta('consumo'));
        const btnDevTinta = document.getElementById('btnAgregarDevTinta');
        if (btnDevTinta) btnDevTinta.addEventListener('click', () => this.agregarFilaTinta('devolucion'));
    },

    obtenerTintasInventario: function() {
        try { return JSON.parse(localStorage.getItem('axones_tintas_inventario') || '[]'); }
        catch (e) { return []; }
    },

    generarOpcionesTintas: function() {
        const tintas = this.obtenerTintasInventario();
        let opciones = '<option value="">-- Seleccionar tinta --</option>';
        tintas.forEach((t, idx) => {
            const nombre = t.nombre || t.color || t.tipo || 'Tinta ' + (idx + 1);
            const stock = parseFloat(t.cantidad || t.kg || 0).toFixed(2);
            opciones += `<option value="${idx}" data-stock="${stock}" data-nombre="${nombre}">${nombre} (${stock} Kg)</option>`;
        });
        return opciones;
    },

    agregarFilaTinta: function(tipo) {
        const bodyId = tipo === 'consumo' ? 'bodyConsumoTintas' : 'bodyDevolucionTintas';
        const tbody = document.getElementById(bodyId);
        if (!tbody) return;
        const opciones = this.generarOpcionesTintas();
        const fila = document.createElement('tr');
        if (tipo === 'consumo') {
            fila.innerHTML = `
                <td><select class="form-select form-select-sm tinta-selector">${opciones}</select></td>
                <td><input type="number" class="form-control form-control-sm tinta-kg-consumo" step="0.01" min="0" value="0"></td>
                <td class="text-center tinta-stock-cell">-</td>
                <td><button type="button" class="btn btn-sm btn-outline-danger btn-quitar-tinta" title="Quitar"><i class="bi bi-x"></i></button></td>`;
        } else {
            fila.innerHTML = `
                <td><select class="form-select form-select-sm tinta-dev-selector">${opciones}</select></td>
                <td><input type="number" class="form-control form-control-sm tinta-kg-devolucion" step="0.01" min="0" value="0"></td>
                <td><button type="button" class="btn btn-sm btn-outline-danger btn-quitar-tinta" title="Quitar"><i class="bi bi-x"></i></button></td>`;
        }
        fila.querySelector('.btn-quitar-tinta').addEventListener('click', () => { fila.remove(); this.calcularTotalTintas(); });
        const selector = fila.querySelector('.tinta-selector, .tinta-dev-selector');
        if (selector) {
            selector.addEventListener('change', () => {
                const opt = selector.selectedOptions[0];
                const stockCell = fila.querySelector('.tinta-stock-cell');
                if (stockCell && opt && opt.dataset.stock) stockCell.textContent = opt.dataset.stock + ' Kg';
                else if (stockCell) stockCell.textContent = '-';
            });
        }
        const kgInput = fila.querySelector('.tinta-kg-consumo, .tinta-kg-devolucion');
        if (kgInput) kgInput.addEventListener('input', () => this.calcularTotalTintas());
        tbody.appendChild(fila);
    },

    calcularTotalTintas: function() {
        let totalConsumo = 0;
        document.querySelectorAll('.tinta-kg-consumo').forEach(input => { totalConsumo += parseFloat(input.value) || 0; });
        const totalConsumoEl = document.getElementById('totalConsumoTintas');
        if (totalConsumoEl) totalConsumoEl.textContent = totalConsumo.toFixed(2);
        let totalDev = 0;
        document.querySelectorAll('.tinta-kg-devolucion').forEach(input => { totalDev += parseFloat(input.value) || 0; });
        const totalDevEl = document.getElementById('totalDevolucionTintas');
        if (totalDevEl) totalDevEl.textContent = totalDev.toFixed(2);
    },

    recopilarConsumoTintas: function() {
        const filas = document.querySelectorAll('#bodyConsumoTintas tr');
        const datos = [];
        filas.forEach(fila => {
            const selector = fila.querySelector('.tinta-selector');
            const kg = parseFloat(fila.querySelector('.tinta-kg-consumo')?.value) || 0;
            if (kg > 0 && selector?.value) {
                const opt = selector.selectedOptions[0];
                datos.push({ indice: parseInt(selector.value), nombre: opt?.dataset?.nombre || '', kg: kg });
            }
        });
        return datos;
    },

    recopilarDevolucionTintas: function() {
        const filas = document.querySelectorAll('#bodyDevolucionTintas tr');
        const datos = [];
        filas.forEach(fila => {
            const selector = fila.querySelector('.tinta-dev-selector');
            const kg = parseFloat(fila.querySelector('.tinta-kg-devolucion')?.value) || 0;
            if (kg > 0 && selector?.value) {
                const opt = selector.selectedOptions[0];
                datos.push({ indice: parseInt(selector.value), nombre: opt?.dataset?.nombre || '', kg: kg });
            }
        });
        return datos;
    },

    descontarTintas: function(datos) {
        try {
            const tintas = this.obtenerTintasInventario();
            let actualizado = false;
            if (datos.consumoTintas) {
                datos.consumoTintas.forEach(item => {
                    if (tintas[item.indice]) {
                        const campo = tintas[item.indice].cantidad !== undefined ? 'cantidad' : 'kg';
                        const actual = parseFloat(tintas[item.indice][campo] || 0);
                        tintas[item.indice][campo] = Math.max(0, actual - item.kg);
                        actualizado = true;
                        console.log(`Tintas: Descontados ${item.kg} Kg de ${item.nombre}`);
                    }
                });
            }
            if (datos.devolucionTintas) {
                datos.devolucionTintas.forEach(item => {
                    if (tintas[item.indice]) {
                        const campo = tintas[item.indice].cantidad !== undefined ? 'cantidad' : 'kg';
                        const actual = parseFloat(tintas[item.indice][campo] || 0);
                        tintas[item.indice][campo] = actual + item.kg;
                        actualizado = true;
                        console.log(`Tintas: Repuestos ${item.kg} Kg de ${item.nombre}`);
                    }
                });
            }
            if (actualizado) {
                localStorage.setItem('axones_tintas_inventario', JSON.stringify(tintas));
                console.log('Inventario de tintas actualizado despues de laminacion');
            }
        } catch (error) { console.warn('Error al actualizar inventario de tintas:', error); }
    },

    // ==========================================
    // SOLVENTES
    // ==========================================

    initSolventes: function() {
        document.querySelectorAll('.solvente-input').forEach(input => {
            input.addEventListener('input', () => this.calcularTotalSolventes());
        });
    },

    calcularTotalSolventes: function() {
        let total = 0;
        document.querySelectorAll('.solvente-input').forEach(input => { total += parseFloat(input.value) || 0; });
        const el = document.getElementById('totalSolventes');
        if (el) el.textContent = total.toFixed(2);
    },

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
            this.guardarLocal(datos);

            // Descontar materiales del inventario (adhesivo, catalizador, acetato)
            this.descontarInventarioLaminacion(datos);

            const porcentajeRefil = parseFloat(datos.porcentajeRefil) || 0;
            const umbral = CONFIG.UMBRALES_REFIL.default;
            if (porcentajeRefil > umbral.maximo) {
                this.generarAlerta(datos);
            }

            this.mostrarToast('Registro de laminacion guardado', 'success');
            this.limpiar();
        } catch (error) {
            console.error('Error guardando registro:', error);
            this.guardarLocal(datos);
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
            const valor = parseFloat(document.getElementById('bobEnt' + i).value) || 0;
            if (valor > 0) {
                bobinasEntrada.push({ posicion: i, peso: valor });
            }
        }

        // Obtener devolucion rechazada
        const devolucionRechazada = this.recopilarDevolucionRechazada();

        // Obtener bobinas virgen (materia prima)
        const bobinasVirgen = [];
        for (let i = 1; i <= 14; i++) {
            const valor = parseFloat(document.getElementById('bobVirg' + i)?.value) || 0;
            if (valor > 0) {
                bobinasVirgen.push({ posicion: i, peso: valor });
            }
        }

        // Obtener restante de bobinas virgen
        const bobinasRestanteVirgen = [];
        for (let i = 1; i <= 14; i++) {
            const valor = parseFloat(document.getElementById('restVirg' + i)?.value) || 0;
            if (valor > 0) {
                bobinasRestanteVirgen.push({ posicion: i, peso: valor });
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

        // Datos de la OT (referencia, no copia)
        const ot = this.ordenCargada || {};

        return {
            // Metadatos
            id: 'LAM_' + Date.now(),
            timestamp: new Date().toISOString(),
            tipo: 'laminacion',

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
            horaInicio: document.getElementById('horaInicio').value,
            horaArranque: document.getElementById('horaArranque').value,
            horaFinal: document.getElementById('horaFinal').value,

            bobinasEntrada: bobinasEntrada,
            totalEntrada: parseFloat(document.getElementById('totalEntrada').value) || 0,

            // Devolucion de material
            devolucionBuenaKg: parseFloat(document.getElementById('devolucionBuenaKg')?.value) || 0,
            devolucionBuenaFecha: document.getElementById('devolucionBuenaFecha')?.value || '',
            devolucionBuenaHora: document.getElementById('devolucionBuenaHora')?.value || '',
            devolucionRechazada: devolucionRechazada,
            totalDevolucionRechazada: this.calcularTotalDevolucionRechazada(),
            totalConsumido: parseFloat(document.getElementById('totalConsumido')?.textContent) || 0,

            // Bobinas virgen (materia prima) - se descuentan del inventario
            bobinasVirgen: bobinasVirgen,
            totalEntradaVirgen: parseFloat(document.getElementById('totalEntradaVirgen')?.value) || 0,
            bobinasRestanteVirgen: bobinasRestanteVirgen,
            totalRestanteVirgen: parseFloat(document.getElementById('totalRestanteVirgen')?.value) || 0,
            totalConsumidoVirgen: parseFloat(document.getElementById('totalConsumidoVirgen')?.textContent) || 0,

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

            scrapTransparente: parseFloat(document.getElementById('scrapTransparente')?.value) || 0,
            scrapImpreso: parseFloat(document.getElementById('scrapImpreso')?.value) || 0,
            scrapLaminado: parseFloat(document.getElementById('scrapLaminado')?.value) || 0,
            totalScrap: parseFloat(document.getElementById('totalScrap').value) || 0,
            porcentajeRefil: parseFloat(document.getElementById('porcentajeRefil').value) || 0,

            // Consumo y devolucion de tintas
            consumoTintas: this.recopilarConsumoTintas(),
            totalConsumoTintas: parseFloat(document.getElementById('totalConsumoTintas')?.textContent) || 0,
            devolucionTintas: this.recopilarDevolucionTintas(),
            totalDevolucionTintas: parseFloat(document.getElementById('totalDevolucionTintas')?.textContent) || 0,

            // Solventes
            solAlcohol: parseFloat(document.getElementById('solAlcohol')?.value) || 0,
            solMetoxi: parseFloat(document.getElementById('solMetoxi')?.value) || 0,
            solAcetato: parseFloat(document.getElementById('solAcetato')?.value) || 0,
            totalSolventes: parseFloat(document.getElementById('totalSolventes')?.textContent) || 0,

            motivosParadas: document.getElementById('motivosParadas').value,
            observaciones: document.getElementById('observaciones').value,

            // Etiquetas de bobinas
            etiquetasEntrada: this.etiquetasData.entrada,
            etiquetasSalida: this.etiquetasData.salida,

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

            // 2. Descontar material VIRGEN (materia prima) del inventario
            const inventario = JSON.parse(localStorage.getItem('axones_inventario') || '[]');
            const cantidadUsada = parseFloat(datos.totalConsumidoVirgen) || parseFloat(datos.totalEntradaVirgen) || 0;
            let invActualizado = false;

            if (cantidadUsada > 0) {
                let restante = cantidadUsada;

                for (let i = 0; i < inventario.length && restante > 0; i++) {
                    const item = inventario[i];
                    const coincideProducto = item.producto &&
                        (item.producto.toLowerCase().includes(datos.producto?.toLowerCase() || '') ||
                         datos.producto?.toLowerCase().includes(item.producto.toLowerCase()));

                    if (coincideProducto || !item.producto) {
                        const disponible = parseFloat(item.kg) || 0;
                        if (disponible > 0) {
                            const aDescontar = Math.min(disponible, restante);
                            item.kg = disponible - aDescontar;
                            restante -= aDescontar;
                            invActualizado = true;
                            console.log(`Inventario: Descontados ${aDescontar} Kg de ${item.material} (Quedan: ${item.kg} Kg)`);
                        }
                    }
                }
            }

            // 3. Reponer devolucion buena al inventario
            const devBuena = parseFloat(datos.devolucionBuenaKg) || 0;
            if (devBuena > 0) {
                for (let i = 0; i < inventario.length; i++) {
                    const item = inventario[i];
                    const coincideProducto = item.producto &&
                        (item.producto.toLowerCase().includes(datos.producto?.toLowerCase() || '') ||
                         datos.producto?.toLowerCase().includes(item.producto.toLowerCase()));
                    if (coincideProducto) {
                        item.kg = (parseFloat(item.kg) || 0) + devBuena;
                        invActualizado = true;
                        console.log(`Inventario: Repuestos ${devBuena} Kg (devolucion buena) a ${item.material} (Total: ${item.kg} Kg)`);
                        break;
                    }
                }
            }

            if (invActualizado) {
                localStorage.setItem('axones_inventario', JSON.stringify(inventario));
                console.log('Inventario de materiales actualizado despues de laminacion');
                this.verificarStockBajoMaterial(inventario);
            }

            // 4. Descontar/reponer tintas
            this.descontarTintas(datos);
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
            id: 'CHK_LAM_' + Date.now(),
            area: 'laminacion',
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

        this.mostrarToast('Checklist guardado correctamente', 'success');
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
     * Datos de etiquetas de bobinas (entrada y salida)
     */
    etiquetasData: { entrada: {}, salida: {} },

    /**
     * Configura flechitas de etiquetas en bobinas de entrada y salida
     */
    setupEtiquetasBobinas: function() {
        const self = this;
        const entradaFields = ['Proveedor', 'Referencia', 'Medida', 'Micraje', 'TratInt', 'TratExt', 'Fecha', 'Maquina', 'Pedido'];
        const salidaFields = ['Peso', 'Fecha', 'Metraje', 'Hora', 'Empalmes', 'Operador'];

        // Inyectar flechitas en bobinas de entrada (bobEnt1-bobEnt14)
        for (let i = 1; i <= 14; i++) {
            const input = document.getElementById('bobEnt' + i);
            if (!input) continue;
            const label = input.previousElementSibling;
            if (!label || label.querySelector('.bobina-arrow')) continue;
            const wrapper = document.createElement('span');
            wrapper.className = 'bobina-label-wrapper';
            wrapper.innerHTML = label.innerHTML;
            const arrow = document.createElement('i');
            arrow.className = 'bi bi-caret-down-fill bobina-arrow';
            arrow.dataset.tipo = 'entrada';
            arrow.dataset.bobina = 'bobEnt' + i;
            arrow.dataset.numero = i;
            arrow.title = 'Etiqueta bobina ' + i;
            wrapper.appendChild(arrow);
            label.innerHTML = '';
            label.appendChild(wrapper);
        }

        // Inyectar flechitas en bobinas de salida (bobSal1-bobSal22)
        for (let i = 1; i <= 22; i++) {
            const input = document.getElementById('bobSal' + i);
            if (!input) continue;
            const label = input.previousElementSibling;
            if (!label || label.querySelector('.bobina-arrow')) continue;
            const wrapper = document.createElement('span');
            wrapper.className = 'bobina-label-wrapper';
            wrapper.innerHTML = label.innerHTML;
            const arrow = document.createElement('i');
            arrow.className = 'bi bi-caret-down-fill bobina-arrow';
            arrow.dataset.tipo = 'salida';
            arrow.dataset.bobina = 'bobSal' + i;
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
            const tipo = arrow.dataset.tipo;
            const bobinaId = arrow.dataset.bobina;
            const numero = arrow.dataset.numero;

            if (tipo === 'entrada') {
                document.getElementById('etqEntBobinaId').value = bobinaId;
                document.getElementById('etqEntNumero').textContent = numero;
                const data = self.etiquetasData.entrada[bobinaId] || {};
                entradaFields.forEach(f => {
                    const el = document.getElementById('etqEnt' + f);
                    if (el) el.value = data[f] || '';
                });
                new bootstrap.Modal(document.getElementById('modalEtiquetaEntrada')).show();
            } else if (tipo === 'salida') {
                document.getElementById('etqSalBobinaId').value = bobinaId;
                document.getElementById('etqSalNumero').textContent = numero;
                const data = self.etiquetasData.salida[bobinaId] || {};
                salidaFields.forEach(f => {
                    const el = document.getElementById('etqSal' + f);
                    if (el) el.value = data[f] || '';
                });
                // Auto-fill peso from the bobina input
                const pesoInput = document.getElementById(bobinaId);
                if (pesoInput && pesoInput.value && !data.Peso) {
                    document.getElementById('etqSalPeso').value = pesoInput.value;
                }
                new bootstrap.Modal(document.getElementById('modalEtiquetaSalida')).show();
            }
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

        // Save button for salida
        const btnSal = document.getElementById('btnGuardarEtqSal');
        if (btnSal) {
            btnSal.addEventListener('click', function() {
                const bobinaId = document.getElementById('etqSalBobinaId').value;
                const data = {};
                let hasData = false;
                salidaFields.forEach(f => {
                    const val = document.getElementById('etqSal' + f)?.value || '';
                    data[f] = val;
                    if (val) hasData = true;
                });
                self.etiquetasData.salida[bobinaId] = data;
                const arrow = document.querySelector(`.bobina-arrow[data-bobina="${bobinaId}"]`);
                if (arrow) arrow.classList.toggle('has-data', hasData);
                bootstrap.Modal.getInstance(document.getElementById('modalEtiquetaSalida'))?.hide();
            });
        }
    },

    /**
     * Limpia el formulario
     */
    limpiar: function() {
        const form = document.getElementById('formLaminacion');
        if (form) {
            form.reset();

            // Limpiar campos calculados
            const campos = ['totalEntrada', 'numBobinas', 'pesoTotal', 'merma', 'totalScrap', 'porcentajeRefil', 'totalRestante', 'totalConsumido', 'totalEntradaVirgen', 'totalRestanteVirgen'];
            campos.forEach(id => {
                const el = document.getElementById(id);
                if (el) el.tagName === 'INPUT' ? el.value = '' : el.textContent = '0';
            });

            document.getElementById('consumoAdhesivo').textContent = '0';
            document.getElementById('consumoCatalizador').textContent = '0';
            document.getElementById('consumoAcetato').textContent = '0';

            const totalConsumidoVirgen = document.getElementById('totalConsumidoVirgen');
            if (totalConsumidoVirgen) totalConsumidoVirgen.textContent = '0';

            // Resetear indicador
            const indicador = document.getElementById('indicadorRefil');
            if (indicador) {
                indicador.className = 'alert alert-secondary py-1 px-2 mb-0 small text-center';
                indicador.innerHTML = '<i class="bi bi-dash-circle me-1"></i> Sin datos';
            }

            // Resetear footer
            ['footerEntrada', 'footerSalida', 'footerMerma', 'footerRefil'].forEach(id => {
                const el = document.getElementById(id);
                if (el) el.textContent = '0';
            });

            // Resetear resumen
            ['resumenEntrada', 'resumenRestante', 'resumenConsumido', 'resumenSalida', 'resumenScrap', 'resumenMermaCalc', 'resumenRefilCalc', 'resumenEntradaVirgen', 'resumenRestanteVirgen', 'resumenConsumidoVirgen', 'resumenAdhesivo'].forEach(id => {
                const el = document.getElementById(id);
                if (el) el.textContent = '0.00 Kg';
            });
        }

        // Resetear seleccion de OT
        const select = document.getElementById('ordenTrabajo');
        if (select) select.value = '';
        this.ocultarResumenYForm();
    },
};

// Inicializar cuando el DOM este listo
document.addEventListener('DOMContentLoaded', () => {
    if (document.getElementById('selectorOT') || document.getElementById('formLaminacion')) {
        Laminacion.init();
    }
});

// Exportar modulo
if (typeof module !== 'undefined' && module.exports) {
    module.exports = Laminacion;
}
