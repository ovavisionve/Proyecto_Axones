/**
 * Servicio de Control de Tiempo - Sistema Axones
 * Maneja cronometros de Play/Pausa/Completado para ordenes de trabajo
 */

const ControlTiempo = {
    STORAGE_KEY: 'axones_control_tiempo',

    // Intervalos activos para actualizacion de cronometros
    intervalos: {},

    // Sync: timer para polling de estado remoto
    _syncTimerId: null,
    _syncInterval: 5000, // 5 segundos
    _lastSyncTimestamp: 0,
    _syncEnCurso: false,

    /**
     * Obtiene todos los registros de tiempo
     */
    getRegistros: function() {
        try {
            return JSON.parse(localStorage.getItem(this.STORAGE_KEY) || '{}');
        } catch (e) {
            return {};
        }
    },

    /**
     * Guarda registros
     */
    saveRegistros: function(registros) {
        localStorage.setItem(this.STORAGE_KEY, JSON.stringify(registros));
    },

    /**
     * Obtiene o crea registro para una orden en una fase
     */
    getRegistroOrden: function(ordenId, fase) {
        const registros = this.getRegistros();
        const key = `${ordenId}_${fase}`;

        if (!registros[key]) {
            registros[key] = {
                ordenId: ordenId,
                fase: fase,
                estado: 'pendiente', // pendiente, en_progreso, pausada, completada
                tiempoTotal: 0, // milisegundos acumulados
                inicios: [], // timestamps de cada inicio
                pausas: [], // timestamps de cada pausa
                completado: null,
                operadores: [],
                notas: [],
                despachos: [] // despachos parciales {fecha, kg, cliente, notaEntrega, observaciones}
            };
            this.saveRegistros(registros);
        }
        // Asegurar que despachos exista en registros antiguos
        if (!registros[key].despachos) {
            registros[key].despachos = [];
            this.saveRegistros(registros);
        }

        return registros[key];
    },

    /**
     * Inicia el cronometro (Play)
     */
    play: function(ordenId, fase, operador = null) {
        const registros = this.getRegistros();
        const key = `${ordenId}_${fase}`;
        const registro = this.getRegistroOrden(ordenId, fase);

        if (registro.estado === 'completada') {
            console.warn('No se puede iniciar una orden completada');
            return { exito: false, mensaje: 'Orden ya completada' };
        }

        if (registro.estado === 'en_progreso') {
            return { exito: false, mensaje: 'Ya esta en progreso' };
        }

        // Registrar inicio
        const ahora = Date.now();
        registro.inicios.push({
            timestamp: ahora,
            operador: operador
        });
        registro.estado = 'en_progreso';

        if (operador && !registro.operadores.includes(operador)) {
            registro.operadores.push(operador);
        }

        registros[key] = registro;
        this.saveRegistros(registros);

        // Iniciar intervalo de actualizacion
        this.iniciarIntervalo(ordenId, fase);

        // Re-renderizar controles para actualizar botones
        const contenedorId = `contenedorControlTiempo${fase.charAt(0).toUpperCase() + fase.slice(1)}`;
        const contenedor = document.getElementById(contenedorId) || document.getElementById('contenedorControlTiempo');
        if (contenedor) {
            this.renderControles(ordenId, fase, contenedor.id);
        }

        // Sincronizar con API para que otros usuarios vean el cambio
        this.sincronizarConAPI();

        console.log(`ControlTiempo: PLAY ${ordenId} - ${fase}`);
        return { exito: true, mensaje: 'Cronometro iniciado', registro };
    },

    /**
     * Pausa el cronometro
     */
    pausa: function(ordenId, fase, motivo = null) {
        const registros = this.getRegistros();
        const key = `${ordenId}_${fase}`;
        const registro = registros[key];

        if (!registro || registro.estado !== 'en_progreso') {
            return { exito: false, mensaje: 'No hay cronometro en progreso' };
        }

        const ahora = Date.now();
        const ultimoInicio = registro.inicios[registro.inicios.length - 1];

        // Calcular tiempo de esta sesion
        const tiempoSesion = ahora - ultimoInicio.timestamp;
        registro.tiempoTotal += tiempoSesion;

        registro.pausas.push({
            timestamp: ahora,
            tiempoSesion: tiempoSesion,
            motivo: motivo
        });

        registro.estado = 'pausada';
        registros[key] = registro;
        this.saveRegistros(registros);

        // Detener intervalo
        this.detenerIntervalo(ordenId, fase);

        // Sincronizar con API para que otros usuarios vean el cambio
        this.sincronizarConAPI();

        console.log(`ControlTiempo: PAUSA ${ordenId} - ${fase} (${this.formatearTiempo(registro.tiempoTotal)})`);
        return { exito: true, mensaje: 'Cronometro pausado', registro };
    },

    /**
     * Completa la orden
     */
    completar: function(ordenId, fase, datosFinales = {}) {
        const registros = this.getRegistros();
        const key = `${ordenId}_${fase}`;
        let registro = registros[key];

        if (!registro) {
            registro = this.getRegistroOrden(ordenId, fase);
        }

        const ahora = Date.now();

        // Si estaba en progreso, calcular ultimo tiempo
        if (registro.estado === 'en_progreso' && registro.inicios.length > 0) {
            const ultimoInicio = registro.inicios[registro.inicios.length - 1];
            registro.tiempoTotal += ahora - ultimoInicio.timestamp;
        }

        registro.estado = 'completada';
        registro.completado = {
            timestamp: ahora,
            datos: datosFinales
        };

        registros[key] = registro;
        this.saveRegistros(registros);

        // Detener intervalo
        this.detenerIntervalo(ordenId, fase);

        // Enviar a API si esta disponible
        this.enviarTiempoAPI(registro);

        // Sincronizar estado completo con API
        this.sincronizarConAPI();

        console.log(`ControlTiempo: COMPLETADO ${ordenId} - ${fase} (Total: ${this.formatearTiempo(registro.tiempoTotal)})`);
        return { exito: true, mensaje: 'Orden completada', registro };
    },

    /**
     * Obtiene el tiempo actual (incluido tiempo en progreso)
     */
    getTiempoActual: function(ordenId, fase) {
        const registro = this.getRegistroOrden(ordenId, fase);
        let tiempo = registro.tiempoTotal;

        if (registro.estado === 'en_progreso' && registro.inicios.length > 0) {
            const ultimoInicio = registro.inicios[registro.inicios.length - 1];
            tiempo += Date.now() - ultimoInicio.timestamp;
        }

        return tiempo;
    },

    /**
     * Formatea tiempo en HH:MM:SS
     */
    formatearTiempo: function(ms) {
        const totalSegundos = Math.floor(ms / 1000);
        const horas = Math.floor(totalSegundos / 3600);
        const minutos = Math.floor((totalSegundos % 3600) / 60);
        const segundos = totalSegundos % 60;

        return `${String(horas).padStart(2, '0')}:${String(minutos).padStart(2, '0')}:${String(segundos).padStart(2, '0')}`;
    },

    /**
     * Inicia intervalo para actualizar UI
     */
    iniciarIntervalo: function(ordenId, fase) {
        const key = `${ordenId}_${fase}`;

        // Limpiar intervalo existente
        if (this.intervalos[key]) {
            clearInterval(this.intervalos[key]);
        }

        // Crear nuevo intervalo (actualiza cada segundo)
        this.intervalos[key] = setInterval(() => {
            this.actualizarUI(ordenId, fase);
        }, 1000);
    },

    /**
     * Detiene intervalo de actualizacion
     */
    detenerIntervalo: function(ordenId, fase) {
        const key = `${ordenId}_${fase}`;
        if (this.intervalos[key]) {
            clearInterval(this.intervalos[key]);
            delete this.intervalos[key];
        }
    },

    /**
     * Actualiza la UI del cronometro
     */
    actualizarUI: function(ordenId, fase) {
        const tiempo = this.getTiempoActual(ordenId, fase);
        const tiempoFormateado = this.formatearTiempo(tiempo);

        // Actualizar cronometro en panel de control
        const cronometroEl = document.getElementById(`cronometro_${ordenId}_${fase}`);
        if (cronometroEl) {
            cronometroEl.textContent = tiempoFormateado;
        }

        // Actualizar tiempo en la comanda (card)
        const comandaTime = document.querySelector(`[data-comanda-tiempo="${ordenId}_${fase}"]`);
        if (comandaTime) {
            comandaTime.textContent = tiempoFormateado;
        }
    },

    /**
     * Renderiza controles de tiempo para una orden
     */
    renderControles: function(ordenId, fase, contenedorId) {
        const contenedor = document.getElementById(contenedorId);
        if (!contenedor) return;

        const registro = this.getRegistroOrden(ordenId, fase);
        const tiempo = this.getTiempoActual(ordenId, fase);

        const estadoClases = {
            'pendiente': 'text-muted',
            'en_progreso': 'text-success',
            'pausada': 'text-warning',
            'completada': 'text-primary'
        };

        const estadoIconos = {
            'pendiente': 'bi-clock',
            'en_progreso': 'bi-play-circle-fill',
            'pausada': 'bi-pause-circle-fill',
            'completada': 'bi-check-circle-fill'
        };

        // Calcular despachos
        const despachos = registro.despachos || [];
        const totalDespachado = despachos.reduce((sum, d) => sum + (d.kg || 0), 0);

        contenedor.innerHTML = `
            <div class="control-tiempo-panel p-2 border rounded bg-light">
                <div class="d-flex align-items-center justify-content-between mb-2">
                    <span class="badge ${registro.estado === 'completada' ? 'bg-success' : registro.estado === 'en_progreso' ? 'bg-primary' : registro.estado === 'pausada' ? 'bg-warning text-dark' : 'bg-secondary'}">
                        <i class="bi ${estadoIconos[registro.estado]} me-1"></i>
                        ${registro.estado === 'en_progreso' ? 'En Progreso' : registro.estado === 'pausada' ? 'Pausada' : registro.estado === 'completada' ? 'Completada' : 'Pendiente'}
                    </span>
                    <span id="cronometro_${ordenId}_${fase}" class="font-monospace fs-5 fw-bold ${estadoClases[registro.estado]}">
                        ${this.formatearTiempo(tiempo)}
                    </span>
                </div>
                <div class="btn-group w-100" role="group">
                    <button type="button" class="btn btn-sm ${registro.estado === 'en_progreso' ? 'btn-success disabled' : 'btn-outline-success'}"
                            onclick="ControlTiempo.play('${ordenId}', '${fase}')"
                            ${registro.estado === 'completada' || registro.estado === 'en_progreso' ? 'disabled' : ''}>
                        <i class="bi bi-play-fill"></i> Play
                    </button>
                    <button type="button" class="btn btn-sm ${registro.estado === 'pausada' ? 'btn-warning disabled' : 'btn-outline-warning'}"
                            onclick="ControlTiempo.pausaConMotivo('${ordenId}', '${fase}')"
                            ${registro.estado !== 'en_progreso' ? 'disabled' : ''}>
                        <i class="bi bi-pause-fill"></i> Pausa
                    </button>
                    <button type="button" class="btn btn-sm ${registro.estado === 'completada' ? 'btn-primary disabled' : 'btn-outline-primary'}"
                            onclick="ControlTiempo.completarConDatos('${ordenId}', '${fase}')"
                            ${registro.estado === 'completada' ? 'disabled' : ''}>
                        <i class="bi bi-check-lg"></i> Completar
                    </button>
                </div>
                <!-- Boton de Despacho Parcial -->
                <div class="mt-2">
                    <button type="button" class="btn btn-sm btn-outline-info w-100"
                            onclick="ControlTiempo.registrarDespacho('${ordenId}', '${fase}')"
                            ${registro.estado === 'completada' ? 'disabled' : ''}>
                        <i class="bi bi-truck me-1"></i> Registrar Despacho Parcial
                        ${totalDespachado > 0 ? `<span class="badge bg-info ms-1">${totalDespachado.toLocaleString()} Kg despachados</span>` : ''}
                    </button>
                </div>
                ${despachos.length > 0 ? `
                <div class="mt-2">
                    <small class="text-muted d-block mb-1"><i class="bi bi-list-check me-1"></i>Despachos registrados:</small>
                    <div class="list-group list-group-flush" style="max-height: 100px; overflow-y: auto;">
                        ${despachos.map((d, i) => `
                            <div class="list-group-item py-1 px-2 small d-flex justify-content-between align-items-center">
                                <span><i class="bi bi-box-seam me-1"></i>${d.kg.toLocaleString()} Kg - ${d.cliente || 'N/A'}</span>
                                <span class="text-muted">${new Date(d.fecha).toLocaleDateString()}</span>
                            </div>
                        `).join('')}
                    </div>
                </div>
                ` : ''}
                ${registro.operadores.length > 0 ? `
                <div class="mt-2 small text-muted">
                    <i class="bi bi-person"></i> ${registro.operadores.join(', ')}
                </div>
                ` : ''}
            </div>
        `;

        // Si esta en progreso, iniciar actualizacion
        if (registro.estado === 'en_progreso') {
            this.iniciarIntervalo(ordenId, fase);
        }
    },

    /**
     * Pausa con motivo (modal OBLIGATORIO)
     */
    pausaConMotivo: function(ordenId, fase) {
        // Crear modal si no existe
        let modal = document.getElementById('modalMotivoPausa');
        if (!modal) {
            const modalHTML = `
                <div class="modal fade" id="modalMotivoPausa" tabindex="-1" data-bs-backdrop="static" data-bs-keyboard="false">
                    <div class="modal-dialog modal-dialog-centered">
                        <div class="modal-content">
                            <div class="modal-header bg-warning text-dark">
                                <h5 class="modal-title">
                                    <i class="bi bi-pause-circle me-2"></i>Motivo de la Pausa
                                </h5>
                            </div>
                            <div class="modal-body">
                                <p class="text-muted mb-3">
                                    <i class="bi bi-info-circle me-1"></i>
                                    Es <strong>obligatorio</strong> indicar el motivo de la pausa para continuar.
                                </p>
                                <div class="mb-3">
                                    <label class="form-label fw-bold">Seleccione el motivo:</label>
                                    <select class="form-select mb-2" id="selectMotivoPausa">
                                        <option value="">-- Seleccionar motivo --</option>
                                        <option value="Cambio de bobina">Cambio de bobina</option>
                                        <option value="Ajuste de maquina">Ajuste de maquina</option>
                                        <option value="Falla mecanica">Falla mecanica</option>
                                        <option value="Falla electrica">Falla electrica</option>
                                        <option value="Cambio de tinta">Cambio de tinta</option>
                                        <option value="Limpieza de rodillos">Limpieza de rodillos</option>
                                        <option value="Problema de calidad">Problema de calidad</option>
                                        <option value="Falta de material">Falta de material</option>
                                        <option value="Almuerzo/Descanso">Almuerzo/Descanso</option>
                                        <option value="Reunion/Capacitacion">Reunion/Capacitacion</option>
                                        <option value="otro">Otro (especificar)</option>
                                    </select>
                                </div>
                                <div class="mb-3" id="containerOtroMotivo" style="display: none;">
                                    <label class="form-label">Especifique el motivo:</label>
                                    <textarea class="form-control" id="txtOtroMotivo" rows="2"
                                              placeholder="Describa el motivo de la pausa..."></textarea>
                                </div>
                                <div class="alert alert-danger py-2 d-none" id="alertMotivoPausa">
                                    <i class="bi bi-exclamation-triangle me-1"></i>
                                    Debe seleccionar o ingresar un motivo
                                </div>
                            </div>
                            <div class="modal-footer">
                                <button type="button" class="btn btn-secondary" data-bs-dismiss="modal" id="btnCancelarPausa">
                                    <i class="bi bi-x-circle me-1"></i>Cancelar
                                </button>
                                <button type="button" class="btn btn-warning" id="btnConfirmarPausa">
                                    <i class="bi bi-pause-fill me-1"></i>Confirmar Pausa
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            `;
            document.body.insertAdjacentHTML('beforeend', modalHTML);
            modal = document.getElementById('modalMotivoPausa');

            // Event listener para mostrar/ocultar campo "otro"
            document.getElementById('selectMotivoPausa').addEventListener('change', function() {
                const containerOtro = document.getElementById('containerOtroMotivo');
                containerOtro.style.display = this.value === 'otro' ? 'block' : 'none';
            });
        }

        // Guardar datos de la orden actual
        modal.dataset.ordenId = ordenId;
        modal.dataset.fase = fase;

        // Limpiar campos
        document.getElementById('selectMotivoPausa').value = '';
        document.getElementById('txtOtroMotivo').value = '';
        document.getElementById('containerOtroMotivo').style.display = 'none';
        document.getElementById('alertMotivoPausa').classList.add('d-none');

        // Configurar boton confirmar
        const btnConfirmar = document.getElementById('btnConfirmarPausa');
        const self = this;

        // Remover listeners anteriores
        const newBtnConfirmar = btnConfirmar.cloneNode(true);
        btnConfirmar.parentNode.replaceChild(newBtnConfirmar, btnConfirmar);

        newBtnConfirmar.addEventListener('click', function() {
            const select = document.getElementById('selectMotivoPausa');
            const txtOtro = document.getElementById('txtOtroMotivo');
            const alert = document.getElementById('alertMotivoPausa');

            let motivo = select.value;
            if (motivo === 'otro') {
                motivo = txtOtro.value.trim();
            }

            if (!motivo) {
                alert.classList.remove('d-none');
                select.focus();
                return;
            }

            alert.classList.add('d-none');

            // Ejecutar pausa
            const ordenIdActual = modal.dataset.ordenId;
            const faseActual = modal.dataset.fase;
            const resultado = self.pausa(ordenIdActual, faseActual, motivo);

            if (resultado.exito) {
                // Cerrar modal
                const bsModal = bootstrap.Modal.getInstance(modal);
                if (bsModal) bsModal.hide();

                // Re-renderizar controles para actualizar botones
                const contenedorId = `contenedorControlTiempo${faseActual.charAt(0).toUpperCase() + faseActual.slice(1)}`;
                const contenedor = document.getElementById(contenedorId) || document.getElementById('contenedorControlTiempo');
                if (contenedor) {
                    self.renderControles(ordenIdActual, faseActual, contenedor.id);
                }

                // Mostrar notificacion
                self.mostrarNotificacion(`Pausa registrada: ${motivo}`, 'warning');
            }
        });

        // Mostrar modal
        const bsModal = new bootstrap.Modal(modal);
        bsModal.show();
    },

    /**
     * Registrar despacho parcial
     */
    registrarDespacho: function(ordenId, fase) {
        // Obtener datos de la orden
        let ordenes = [];
        try {
            ordenes = JSON.parse(localStorage.getItem('axones_ordenes_trabajo') || '[]');
        } catch (e) {
            ordenes = [];
        }
        const orden = ordenes.find(o => (o.id || o.numeroOrden) === ordenId);
        const pedidoKg = orden ? (orden.pedidoKg || 0) : 0;
        const cliente = orden ? orden.cliente : '';

        // Obtener despachos anteriores
        const registro = this.getRegistroOrden(ordenId, fase);
        const despachosAnteriores = registro.despachos || [];
        const totalDespachado = despachosAnteriores.reduce((sum, d) => sum + (d.kg || 0), 0);
        const pendiente = pedidoKg - totalDespachado;

        // Crear modal si no existe
        let modal = document.getElementById('modalDespacho');
        if (!modal) {
            const modalHTML = `
                <div class="modal fade" id="modalDespacho" tabindex="-1">
                    <div class="modal-dialog modal-dialog-centered">
                        <div class="modal-content">
                            <div class="modal-header bg-info text-white">
                                <h5 class="modal-title">
                                    <i class="bi bi-truck me-2"></i>Registrar Despacho Parcial
                                </h5>
                                <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal"></button>
                            </div>
                            <div class="modal-body">
                                <div class="alert alert-info py-2 mb-3" id="alertInfoDespacho">
                                    <i class="bi bi-info-circle me-1"></i>
                                    <span id="infoDespacho"></span>
                                </div>
                                <div class="row g-3">
                                    <div class="col-md-6">
                                        <label class="form-label fw-bold">Kg a Despachar <span class="text-danger">*</span></label>
                                        <input type="number" class="form-control" id="kgDespacho"
                                               placeholder="Ej: 3000" min="0" step="0.01" required>
                                    </div>
                                    <div class="col-md-6">
                                        <label class="form-label fw-bold">Cliente</label>
                                        <input type="text" class="form-control" id="clienteDespacho"
                                               placeholder="Nombre del cliente">
                                    </div>
                                    <div class="col-12">
                                        <label class="form-label fw-bold">Nota de Entrega</label>
                                        <input type="text" class="form-control" id="notaEntregaDespacho"
                                               placeholder="Numero de nota de entrega">
                                    </div>
                                    <div class="col-12">
                                        <label class="form-label">Observaciones</label>
                                        <textarea class="form-control" id="obsDespacho" rows="2"
                                                  placeholder="Observaciones adicionales..."></textarea>
                                    </div>
                                </div>
                                <div class="alert alert-danger py-2 d-none mt-3" id="alertErrorDespacho">
                                    <i class="bi bi-exclamation-triangle me-1"></i>
                                    <span id="msgErrorDespacho"></span>
                                </div>
                            </div>
                            <div class="modal-footer">
                                <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">
                                    <i class="bi bi-x-circle me-1"></i>Cancelar
                                </button>
                                <button type="button" class="btn btn-info" id="btnConfirmarDespacho">
                                    <i class="bi bi-truck me-1"></i>Registrar Despacho
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            `;
            document.body.insertAdjacentHTML('beforeend', modalHTML);
            modal = document.getElementById('modalDespacho');
        }

        // Actualizar info
        document.getElementById('infoDespacho').innerHTML = `
            <strong>Pedido:</strong> ${pedidoKg.toLocaleString()} Kg |
            <strong>Despachado:</strong> ${totalDespachado.toLocaleString()} Kg |
            <strong>Pendiente:</strong> ${pendiente.toLocaleString()} Kg
        `;

        // Guardar datos de la orden actual
        modal.dataset.ordenId = ordenId;
        modal.dataset.fase = fase;

        // Limpiar campos
        document.getElementById('kgDespacho').value = '';
        document.getElementById('clienteDespacho').value = cliente;
        document.getElementById('notaEntregaDespacho').value = '';
        document.getElementById('obsDespacho').value = '';
        document.getElementById('alertErrorDespacho').classList.add('d-none');

        // Configurar boton confirmar
        const btnConfirmar = document.getElementById('btnConfirmarDespacho');
        const self = this;

        // Remover listeners anteriores
        const newBtnConfirmar = btnConfirmar.cloneNode(true);
        btnConfirmar.parentNode.replaceChild(newBtnConfirmar, btnConfirmar);

        newBtnConfirmar.addEventListener('click', function() {
            const kgInput = document.getElementById('kgDespacho');
            const clienteInput = document.getElementById('clienteDespacho');
            const notaInput = document.getElementById('notaEntregaDespacho');
            const obsInput = document.getElementById('obsDespacho');
            const alertError = document.getElementById('alertErrorDespacho');
            const msgError = document.getElementById('msgErrorDespacho');

            const kg = parseFloat(kgInput.value) || 0;

            if (kg <= 0) {
                msgError.textContent = 'Debe ingresar una cantidad de Kg valida';
                alertError.classList.remove('d-none');
                kgInput.focus();
                return;
            }

            alertError.classList.add('d-none');

            // Guardar despacho
            const ordenIdActual = modal.dataset.ordenId;
            const faseActual = modal.dataset.fase;

            const registros = self.getRegistros();
            const key = `${ordenIdActual}_${faseActual}`;
            const registro = registros[key];

            if (!registro.despachos) {
                registro.despachos = [];
            }

            registro.despachos.push({
                fecha: new Date().toISOString(),
                kg: kg,
                cliente: clienteInput.value.trim(),
                notaEntrega: notaInput.value.trim(),
                observaciones: obsInput.value.trim()
            });

            registros[key] = registro;
            self.saveRegistros(registros);

            // Sincronizar con API
            self.sincronizarConAPI();

            // Cerrar modal
            const bsModal = bootstrap.Modal.getInstance(modal);
            if (bsModal) bsModal.hide();

            // Re-renderizar controles
            const contenedorId = `contenedorControlTiempo${faseActual.charAt(0).toUpperCase() + faseActual.slice(1)}`;
            const contenedor = document.getElementById(contenedorId) || document.getElementById('contenedorControlTiempo');
            if (contenedor) {
                self.renderControles(ordenIdActual, faseActual, contenedor.id);
            }

            // Mostrar notificacion
            self.mostrarNotificacion(`Despacho registrado: ${kg.toLocaleString()} Kg`, 'success');
        });

        // Mostrar modal
        const bsModal = new bootstrap.Modal(modal);
        bsModal.show();
    },

    /**
     * Muestra notificacion toast
     */
    mostrarNotificacion: function(mensaje, tipo = 'info') {
        let container = document.querySelector('.toast-container');
        if (!container) {
            container = document.createElement('div');
            container.className = 'toast-container position-fixed bottom-0 end-0 p-3';
            document.body.appendChild(container);
        }

        const bgClass = tipo === 'success' ? 'bg-success' :
                       tipo === 'warning' ? 'bg-warning text-dark' :
                       tipo === 'danger' ? 'bg-danger' : 'bg-info';

        const toastHtml = `
            <div class="toast align-items-center ${bgClass} border-0" role="alert">
                <div class="d-flex">
                    <div class="toast-body">${mensaje}</div>
                    <button type="button" class="btn-close me-2 m-auto" data-bs-dismiss="toast"></button>
                </div>
            </div>
        `;

        container.insertAdjacentHTML('beforeend', toastHtml);
        const toastEl = container.lastElementChild;
        const toast = new bootstrap.Toast(toastEl, { autohide: true, delay: 4000 });
        toast.show();
        toastEl.addEventListener('hidden.bs.toast', () => toastEl.remove());
    },

    /**
     * Completar con datos adicionales
     */
    completarConDatos: function(ordenId, fase) {
        if (!confirm('¿Confirmar que esta fase esta completada?')) {
            return;
        }

        const resultado = this.completar(ordenId, fase, {
            completadoPor: 'Usuario', // En produccion seria el usuario logueado
            fechaCompletado: new Date().toISOString()
        });

        if (resultado.exito) {
            // Actualizar UI
            const contenedor = document.querySelector(`[data-orden-id="${ordenId}"][data-fase="${fase}"]`);
            if (contenedor) {
                this.renderControles(ordenId, fase, contenedor.id);
            }

            if (typeof Axones !== 'undefined') {
                Axones.showSuccess(`Fase completada. Tiempo total: ${this.formatearTiempo(resultado.registro.tiempoTotal)}`);
            }
        }

        return resultado;
    },

    /**
     * Envia tiempo a la API
     */
    enviarTiempoAPI: async function(registro) {
        if (typeof AxonesAPI === 'undefined') return;

        try {
            await AxonesAPI.post('registrarTiempo', {
                ordenId: registro.ordenId,
                fase: registro.fase,
                tiempoTotal: registro.tiempoTotal,
                tiempoFormateado: this.formatearTiempo(registro.tiempoTotal),
                operadores: registro.operadores,
                fechaCompletado: registro.completado?.timestamp,
                sesiones: registro.inicios.length
            });
            console.log('Tiempo enviado a API');
        } catch (e) {
            console.warn('Error enviando tiempo a API:', e);
        }
    },

    /**
     * Obtiene resumen de tiempos para una orden
     */
    getResumenOrden: function(ordenId) {
        const registros = this.getRegistros();
        const fases = ['impresion', 'laminacion', 'corte'];
        const resumen = {};
        let tiempoTotal = 0;

        fases.forEach(fase => {
            const key = `${ordenId}_${fase}`;
            if (registros[key]) {
                resumen[fase] = {
                    estado: registros[key].estado,
                    tiempo: registros[key].tiempoTotal,
                    tiempoFormateado: this.formatearTiempo(registros[key].tiempoTotal)
                };
                tiempoTotal += registros[key].tiempoTotal;
            }
        });

        resumen.total = {
            tiempo: tiempoTotal,
            tiempoFormateado: this.formatearTiempo(tiempoTotal)
        };

        return resumen;
    },

    /**
     * Obtiene ordenes actualmente en progreso
     */
    getOrdenesEnProgreso: function() {
        const registros = this.getRegistros();
        return Object.values(registros)
            .filter(r => r.estado === 'en_progreso')
            .map(r => ({
                ordenId: r.ordenId,
                fase: r.fase,
                tiempoActual: this.formatearTiempo(this.getTiempoActual(r.ordenId, r.fase))
            }));
    },

    /**
     * Reinicia registro de una orden (para retrabajos)
     */
    reiniciar: function(ordenId, fase) {
        const registros = this.getRegistros();
        const key = `${ordenId}_${fase}`;

        // Guardar historial
        if (registros[key]) {
            const historialKey = 'axones_tiempo_historial';
            const historial = JSON.parse(localStorage.getItem(historialKey) || '[]');
            historial.push({
                ...registros[key],
                fechaReinicio: new Date().toISOString()
            });
            localStorage.setItem(historialKey, JSON.stringify(historial));
        }

        // Crear nuevo registro
        delete registros[key];
        this.saveRegistros(registros);
        this.detenerIntervalo(ordenId, fase);

        return { exito: true, mensaje: 'Registro reiniciado' };
    },

    /**
     * Renderiza panel de comandas (selector de OT tipo restaurante)
     */
    renderPanelComandas: function(fase, contenedorId, onSeleccionarOrden) {
        const contenedor = document.getElementById(contenedorId);
        if (!contenedor) return;

        // Obtener ordenes disponibles desde localStorage primero
        let ordenes = [];
        try {
            ordenes = JSON.parse(localStorage.getItem('axones_ordenes_trabajo') || '[]');
        } catch (e) {
            ordenes = [];
        }

        // Cargar desde API en background y actualizar panel (solo una vez)
        if (typeof AxonesAPI !== 'undefined' && !this._comandasLoading) {
            this._comandasLoading = true;
            AxonesAPI.getOrdenes().then(result => {
                this._comandasLoading = false;
                if (result && result.success && Array.isArray(result.data) && result.data.length > 0) {
                    const ordenesAPI = result.data.map(o => {
                        if (o.datosCompletos && typeof o.datosCompletos === 'object') {
                            return { ...o.datosCompletos, id: o.id, estado: o.estado, etapa: o.etapa };
                        }
                        return o;
                    });
                    const idsAPI = new Set(ordenesAPI.map(o => o.id));
                    const soloLocales = ordenes.filter(o => !idsAPI.has(o.id));
                    const ordenesMerged = [...ordenesAPI, ...soloLocales];
                    localStorage.setItem('axones_ordenes_trabajo', JSON.stringify(ordenesMerged));
                    console.log('[ControlTiempo] Ordenes sincronizadas desde Sheets:', ordenesAPI.length);
                    // Re-renderizar panel con datos actualizados
                    this.renderPanelComandas(fase, contenedorId, onSeleccionarOrden);
                }
            }).catch(e => {
                this._comandasLoading = false;
                console.warn('[ControlTiempo] Error cargando ordenes desde API:', e.message);
            });
        }

        const ordenesDisponibles = ordenes.filter(o => o.estadoOrden !== 'completada');

        // Colores por prioridad
        const coloresPrioridad = {
            'urgente': { bg: 'danger', text: 'white', icon: 'exclamation-triangle-fill' },
            'alta': { bg: 'warning', text: 'dark', icon: 'exclamation-circle' },
            'normal': { bg: 'primary', text: 'white', icon: 'clipboard-check' }
        };

        let cardsHTML = '';
        if (ordenesDisponibles.length === 0) {
            cardsHTML = `
                <div class="col-12 text-center py-4">
                    <i class="bi bi-inbox fs-1 text-muted d-block mb-2"></i>
                    <p class="text-muted mb-2">No hay ordenes de trabajo pendientes</p>
                    <a href="ordenes.html" class="btn btn-primary btn-sm">
                        <i class="bi bi-plus-circle me-1"></i>Crear Nueva OT
                    </a>
                </div>
            `;
        } else {
            ordenesDisponibles.forEach(orden => {
                const prioridad = orden.prioridad || 'normal';
                const color = coloresPrioridad[prioridad] || coloresPrioridad.normal;
                const tiempoRegistro = this.getRegistroOrden(orden.id || orden.numeroOrden, fase);
                const tiempoActual = this.formatearTiempo(this.getTiempoActual(orden.id || orden.numeroOrden, fase));

                cardsHTML += `
                    <div class="col-md-4 col-lg-3 mb-2">
                        <div class="card comanda-card h-100 border-${color.bg} cursor-pointer"
                             onclick="ControlTiempo.seleccionarComanda('${orden.id || orden.numeroOrden}', '${fase}', '${contenedorId}')"
                             style="cursor: pointer; transition: transform 0.2s;"
                             onmouseover="this.style.transform='scale(1.02)'"
                             onmouseout="this.style.transform='scale(1)'">
                            <div class="card-header bg-${color.bg} text-${color.text} py-2">
                                <div class="d-flex justify-content-between align-items-center">
                                    <strong><i class="bi bi-${color.icon} me-1"></i>${orden.numeroOrden || orden.ot}</strong>
                                    <span class="badge bg-light text-dark">${prioridad.toUpperCase()}</span>
                                </div>
                            </div>
                            <div class="card-body py-2">
                                <p class="mb-1 fw-bold text-truncate" title="${orden.cliente}">${orden.cliente}</p>
                                <p class="mb-1 small text-muted text-truncate" title="${orden.producto || 'Sin producto'}">${orden.producto || 'Sin producto'}</p>
                                <div class="d-flex justify-content-between align-items-center">
                                    <span class="badge bg-secondary">${(orden.pedidoKg || 0).toLocaleString()} Kg</span>
                                    <span class="badge ${tiempoRegistro.estado === 'en_progreso' ? 'bg-success' : tiempoRegistro.estado === 'pausada' ? 'bg-warning text-dark' : 'bg-light text-muted'}"
                                          data-comanda-tiempo="${orden.id || orden.numeroOrden}_${fase}">
                                        <i class="bi bi-clock me-1"></i><span>${tiempoActual}</span>
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>
                `;
            });
        }

        contenedor.innerHTML = `
            <div class="card mb-3 border-0 shadow-sm">
                <div class="card-header bg-dark text-white py-2">
                    <div class="d-flex justify-content-between align-items-center">
                        <span>
                            <i class="bi bi-journal-text me-2"></i>
                            <strong>Seleccione una Orden de Trabajo</strong>
                        </span>
                        <span class="badge bg-light text-dark">${ordenesDisponibles.length} ordenes</span>
                    </div>
                </div>
                <div class="card-body py-3" style="max-height: 300px; overflow-y: auto;">
                    <div class="row g-2" id="comandasContainer">
                        ${cardsHTML}
                    </div>
                </div>
            </div>
        `;

        // Guardar callback
        if (onSeleccionarOrden) {
            this._callbackSeleccionComanda = onSeleccionarOrden;
        }
    },

    /**
     * Maneja la seleccion de una comanda
     */
    seleccionarComanda: function(ordenId, fase, contenedorId) {
        // Obtener la orden
        let ordenes = [];
        try {
            ordenes = JSON.parse(localStorage.getItem('axones_ordenes_trabajo') || '[]');
        } catch (e) {
            ordenes = [];
        }

        const orden = ordenes.find(o => (o.id || o.numeroOrden) === ordenId);
        if (!orden) return;

        // Ejecutar callback si existe
        if (this._callbackSeleccionComanda) {
            this._callbackSeleccionComanda(orden);
        }

        // Marcar visualmente la comanda seleccionada
        document.querySelectorAll('.comanda-card').forEach(card => {
            card.classList.remove('border-3', 'selected');
        });

        const contenedor = document.getElementById(contenedorId);
        if (contenedor) {
            const cardSeleccionada = contenedor.querySelector(`[onclick*="'${ordenId}'"]`);
            if (cardSeleccionada) {
                cardSeleccionada.classList.add('border-3', 'selected');
            }
        }

        this.mostrarNotificacion(`Orden ${orden.numeroOrden || orden.ot} seleccionada`, 'success');
    },

    // ==================== SINCRONIZACION ENTRE USUARIOS ====================

    /**
     * Inicia la sincronizacion periodica de temporizadores con la API
     * Permite que multiples usuarios vean el mismo estado del timer
     */
    iniciarSync: function() {
        if (this._syncTimerId) return; // Ya esta corriendo

        console.log('[ControlTiempo] Iniciando sincronizacion de timers cada ' + (this._syncInterval / 1000) + 's');

        // Sync inmediato al iniciar
        this.sincronizarConAPI();

        // Polling periodico
        this._syncTimerId = setInterval(() => {
            this.recibirSyncRemoto();
        }, this._syncInterval);
    },

    /**
     * Detiene la sincronizacion
     */
    detenerSync: function() {
        if (this._syncTimerId) {
            clearInterval(this._syncTimerId);
            this._syncTimerId = null;
        }
    },

    /**
     * Envia el estado COMPLETO de todos los timers a la API
     * Se llama en cada play/pausa/completar/despacho
     */
    sincronizarConAPI: async function() {
        if (typeof AxonesAPI === 'undefined') return;
        if (this._syncEnCurso) return;

        this._syncEnCurso = true;
        try {
            const registros = this.getRegistros();
            const usuario = (typeof Auth !== 'undefined' && Auth.getUsuarioActual)
                ? Auth.getUsuarioActual()?.usuario || 'desconocido'
                : 'desconocido';

            await AxonesAPI.post('saveControlTiempo', {
                registros: registros,
                timestamp: Date.now(),
                usuario: usuario
            });

            this._lastSyncTimestamp = Date.now();
            console.log('[ControlTiempo] Estado sincronizado con API');
        } catch (e) {
            console.warn('[ControlTiempo] Error sincronizando con API:', e.message);
        } finally {
            this._syncEnCurso = false;
        }
    },

    /**
     * Recibe estado de timers desde la API y merge con el estado local
     * Resuelve conflictos: el estado mas reciente gana
     */
    recibirSyncRemoto: async function() {
        if (typeof AxonesAPI === 'undefined') return;

        try {
            const result = await AxonesAPI.get('getControlTiempo', {
                since: this._lastSyncTimestamp || 0
            }, { skipCache: true });

            if (!result || !result.success || !result.data) return;

            const remoto = result.data;
            if (!remoto.registros || !remoto.timestamp) return;

            // Solo procesar si es mas reciente que nuestro ultimo sync
            if (remoto.timestamp <= this._lastSyncTimestamp) return;

            const registrosLocales = this.getRegistros();
            const registrosRemotos = remoto.registros;
            let cambios = false;

            // Merge: para cada key, el registro con mas actividad reciente gana
            Object.keys(registrosRemotos).forEach(key => {
                const remotoReg = registrosRemotos[key];
                const localReg = registrosLocales[key];

                if (!localReg) {
                    // No existe localmente - adoptar el remoto
                    registrosLocales[key] = remotoReg;
                    cambios = true;
                    return;
                }

                // Determinar cual es mas reciente
                const ultimoRemoto = this._getUltimaActividad(remotoReg);
                const ultimoLocal = this._getUltimaActividad(localReg);

                if (ultimoRemoto > ultimoLocal) {
                    // El remoto es mas reciente - adoptar
                    registrosLocales[key] = remotoReg;
                    cambios = true;
                }
            });

            if (cambios) {
                this.saveRegistros(registrosLocales);
                this._lastSyncTimestamp = remoto.timestamp;

                // Re-renderizar los controles activos en pantalla
                this._actualizarUISync(registrosLocales);

                console.log('[ControlTiempo] Estado actualizado desde otro usuario');
            } else {
                this._lastSyncTimestamp = remoto.timestamp;
            }

        } catch (e) {
            // Silencioso - no interrumpir UX por error de sync
            console.warn('[ControlTiempo] Error recibiendo sync:', e.message);
        }
    },

    /**
     * Obtiene el timestamp de la ultima actividad de un registro
     */
    _getUltimaActividad: function(registro) {
        let ultimo = 0;

        if (registro.completado && registro.completado.timestamp) {
            ultimo = Math.max(ultimo, registro.completado.timestamp);
        }

        if (registro.inicios && registro.inicios.length > 0) {
            const ultimoInicio = registro.inicios[registro.inicios.length - 1];
            ultimo = Math.max(ultimo, ultimoInicio.timestamp || 0);
        }

        if (registro.pausas && registro.pausas.length > 0) {
            const ultimaPausa = registro.pausas[registro.pausas.length - 1];
            ultimo = Math.max(ultimo, ultimaPausa.timestamp || 0);
        }

        if (registro.despachos && registro.despachos.length > 0) {
            const ultimoDespacho = registro.despachos[registro.despachos.length - 1];
            const ts = new Date(ultimoDespacho.fecha).getTime();
            if (!isNaN(ts)) ultimo = Math.max(ultimo, ts);
        }

        return ultimo;
    },

    /**
     * Actualiza la UI despues de recibir cambios remotos
     */
    _actualizarUISync: function(registros) {
        // Buscar contenedores de control de tiempo visibles
        const fases = ['Impresion', 'Laminacion', 'Corte'];

        fases.forEach(faseCapital => {
            const fase = faseCapital.toLowerCase();
            const contenedorId = `contenedorControlTiempo${faseCapital}`;
            const contenedor = document.getElementById(contenedorId);

            if (contenedor) {
                const ordenId = contenedor.getAttribute('data-orden-id');
                if (ordenId) {
                    const key = `${ordenId}_${fase}`;
                    const registro = registros[key];

                    if (registro) {
                        // Re-renderizar controles
                        this.renderControles(ordenId, fase, contenedorId);

                        // Si esta en progreso, reiniciar intervalo
                        if (registro.estado === 'en_progreso') {
                            this.iniciarIntervalo(ordenId, fase);
                        } else {
                            this.detenerIntervalo(ordenId, fase);
                        }
                    }
                }
            }
        });

        // Actualizar tiempos en las comandas
        Object.keys(registros).forEach(key => {
            const reg = registros[key];
            const tiempoEl = document.querySelector(`[data-comanda-tiempo="${key}"]`);
            if (tiempoEl) {
                const tiempo = this.getTiempoActual(reg.ordenId, reg.fase);
                tiempoEl.querySelector('span').textContent = this.formatearTiempo(tiempo);
            }
        });
    }
};

// Exportar globalmente
if (typeof window !== 'undefined') {
    window.ControlTiempo = ControlTiempo;
}

// Auto-iniciar sync cuando se carga la pagina
document.addEventListener('DOMContentLoaded', function() {
    // Esperar a que AxonesAPI se inicialice
    setTimeout(function() {
        if (typeof ControlTiempo !== 'undefined') {
            ControlTiempo.iniciarSync();
        }
    }, 3000);
});
