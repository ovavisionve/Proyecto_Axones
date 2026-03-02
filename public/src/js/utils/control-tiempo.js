/**
 * Servicio de Control de Tiempo - Sistema Axones
 * Maneja cronometros de Play/Pausa/Completado para ordenes de trabajo
 */

const ControlTiempo = {
    STORAGE_KEY: 'axones_control_tiempo',

    // Intervalos activos para actualizacion de cronometros
    intervalos: {},

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
                notas: []
            };
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
        const cronometroEl = document.getElementById(`cronometro_${ordenId}_${fase}`);
        if (cronometroEl) {
            const tiempo = this.getTiempoActual(ordenId, fase);
            cronometroEl.textContent = this.formatearTiempo(tiempo);
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
     * Pausa con motivo (modal)
     */
    pausaConMotivo: function(ordenId, fase) {
        const motivo = prompt('Motivo de la pausa (opcional):');
        const resultado = this.pausa(ordenId, fase, motivo);

        if (resultado.exito) {
            // Actualizar UI
            const contenedor = document.querySelector(`[data-orden-id="${ordenId}"][data-fase="${fase}"]`);
            if (contenedor) {
                this.renderControles(ordenId, fase, contenedor.id);
            }

            if (typeof Axones !== 'undefined') {
                Axones.showWarning('Orden pausada');
            }
        }

        return resultado;
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
    }
};

// Exportar globalmente
if (typeof window !== 'undefined') {
    window.ControlTiempo = ControlTiempo;
}
