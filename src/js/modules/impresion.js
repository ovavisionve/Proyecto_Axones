/**
 * Modulo Control de Impresion - Sistema Axones
 * Maneja el formulario digital de Control de Produccion de Impresion
 */

const Impresion = {
    /**
     * Inicializa el modulo
     */
    init: function() {
        console.log('Inicializando modulo Control de Impresion');

        this.setDefaultDate();
        this.setupEventListeners();
        this.setupCalculations();
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
        const form = document.getElementById('formImpresion');
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
        // Calcular total de material de entrada
        document.querySelectorAll('.material-entrada').forEach(input => {
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
    },

    /**
     * Calcula todos los totales
     */
    calcularTotales: function() {
        // Total material de entrada
        let totalEntrada = 0;
        document.querySelectorAll('.material-entrada').forEach(input => {
            totalEntrada += parseFloat(input.value) || 0;
        });
        document.getElementById('totalMaterialEntrada').value = totalEntrada.toFixed(2);

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

        // Merma (entrada - salida - scrap)
        const scrapTransp = parseFloat(document.getElementById('scrapTransparente').value) || 0;
        const scrapImpreso = parseFloat(document.getElementById('scrapImpreso').value) || 0;
        const totalScrap = scrapTransp + scrapImpreso;
        document.getElementById('totalScrap').value = totalScrap.toFixed(2);

        const merma = totalEntrada - totalSalida - totalScrap;
        document.getElementById('merma').value = merma.toFixed(2);

        // Porcentaje de Refil
        let porcentajeRefil = 0;
        if (totalEntrada > 0) {
            // Refil = (Merma + Scrap) / Entrada * 100
            porcentajeRefil = ((merma + totalScrap) / totalEntrada) * 100;
        }
        document.getElementById('porcentajeRefil').value = porcentajeRefil.toFixed(2) + '%';

        // Actualizar indicador de refil
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

        // Obtener umbral (por ahora usamos el default, pendiente definir con el cliente)
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
     * Guarda el registro
     */
    guardar: async function() {
        // Validar formulario
        const form = document.getElementById('formImpresion');
        if (!form.checkValidity()) {
            form.reportValidity();
            return;
        }

        // Verificar autenticacion
        if (!Auth.isAuthenticated()) {
            Axones.showError('Debe iniciar sesion para guardar registros');
            return;
        }

        // Recopilar datos
        const datos = this.recopilarDatos();

        try {
            // Guardar (en desarrollo usa localStorage)
            if (CONFIG.API.BASE_URL === '') {
                this.guardarLocal(datos);
                Axones.showSuccess('Registro guardado correctamente');

                // Verificar si genera alerta por refil excedido
                const porcentajeRefil = parseFloat(datos.porcentajeRefil) || 0;
                const umbral = CONFIG.UMBRALES_REFIL.default;
                if (porcentajeRefil > umbral.maximo) {
                    this.generarAlerta(datos);
                }

                return;
            }

            // En produccion, enviar a Apps Script
            const response = await fetch(CONFIG.API.BASE_URL + '?action=saveImpresion', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(datos),
            });

            const result = await response.json();
            if (result.success) {
                Axones.showSuccess('Registro guardado correctamente');
            } else {
                throw new Error(result.error || 'Error desconocido');
            }
        } catch (error) {
            console.error('Error guardando registro:', error);
            Axones.showError('Error al guardar: ' + error.message);
        }
    },

    /**
     * Recopila todos los datos del formulario
     */
    recopilarDatos: function() {
        // Obtener turno seleccionado
        const turnoSeleccionado = document.querySelector('input[name="turno"]:checked');

        // Obtener materiales de entrada
        const materialesEntrada = [];
        for (let i = 1; i <= 26; i++) {
            const valor = parseFloat(document.getElementById('mat' + i).value) || 0;
            if (valor > 0) {
                materialesEntrada.push({ posicion: i, peso: valor });
            }
        }

        // Obtener bobinas de salida
        const bobinasSalida = [];
        for (let i = 1; i <= 22; i++) {
            const valor = parseFloat(document.getElementById('bob' + i).value) || 0;
            if (valor > 0) {
                bobinasSalida.push({ posicion: i, peso: valor });
            }
        }

        return {
            // Metadatos
            id: 'IMP_' + Date.now(),
            timestamp: new Date().toISOString(),
            tipo: 'impresion',

            // Datos generales
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

            // Material de entrada
            materialesEntrada: materialesEntrada,
            totalMaterialEntrada: parseFloat(document.getElementById('totalMaterialEntrada').value) || 0,

            // Pesaje
            numPesaje: document.getElementById('numPesaje').value,
            pesajeApertura: document.getElementById('pesajeApertura').value,
            pesajeCierre: document.getElementById('pesajeCierre').value,

            // Bobinas de salida
            bobinasSalida: bobinasSalida,
            numBobinas: parseInt(document.getElementById('numBobinas').value) || 0,
            pesoTotal: parseFloat(document.getElementById('pesoTotal').value) || 0,
            merma: parseFloat(document.getElementById('merma').value) || 0,
            metraje: parseFloat(document.getElementById('metraje').value) || 0,

            // Scrap / Refil
            scrapTransparente: parseFloat(document.getElementById('scrapTransparente').value) || 0,
            scrapImpreso: parseFloat(document.getElementById('scrapImpreso').value) || 0,
            totalScrap: parseFloat(document.getElementById('totalScrap').value) || 0,
            porcentajeRefil: parseFloat(document.getElementById('porcentajeRefil').value) || 0,

            // Tiempos
            tiempoMuerto: parseInt(document.getElementById('tiempoMuerto').value) || 0,
            tiempoEfectivo: parseInt(document.getElementById('tiempoEfectivo').value) || 0,
            tiempoPreparacion: parseInt(document.getElementById('tiempoPreparacion').value) || 0,

            // Paradas y observaciones
            motivosParadas: document.getElementById('motivosParadas').value,
            observaciones: document.getElementById('observaciones').value,

            // Usuario
            registradoPor: Auth.getUser() ? Auth.getUser().id : 'unknown',
            registradoPorNombre: Auth.getUser() ? Auth.getUser().nombre : 'Unknown',
        };
    },

    /**
     * Guarda en localStorage (desarrollo)
     */
    guardarLocal: function(datos) {
        const registros = JSON.parse(localStorage.getItem(CONFIG.CACHE.PREFIJO + 'impresion') || '[]');
        registros.unshift(datos);
        localStorage.setItem(CONFIG.CACHE.PREFIJO + 'impresion', JSON.stringify(registros));
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
            mensaje: `Refil ${datos.porcentajeRefil.toFixed(1)}% en OT ${datos.ordenTrabajo} - Producto: ${datos.producto}`,
            estado: 'pendiente',
            registro_id: datos.id,
        };

        // Guardar alerta
        const alertas = JSON.parse(localStorage.getItem(CONFIG.CACHE.PREFIJO + 'alertas') || '[]');
        alertas.unshift(alerta);
        localStorage.setItem(CONFIG.CACHE.PREFIJO + 'alertas', JSON.stringify(alertas));

        // Mostrar notificacion
        Axones.showToast(
            `ALERTA: Refil ${datos.porcentajeRefil.toFixed(1)}% excedido`,
            alerta.nivel === CONFIG.ALERTAS.NIVELES.CRITICAL ? 'danger' : 'warning'
        );
    },

    /**
     * Limpia el formulario
     */
    limpiar: function() {
        const form = document.getElementById('formImpresion');
        if (form) {
            form.reset();
            this.setDefaultDate();

            // Limpiar campos calculados
            document.getElementById('totalMaterialEntrada').value = '';
            document.getElementById('numBobinas').value = '';
            document.getElementById('pesoTotal').value = '';
            document.getElementById('merma').value = '';
            document.getElementById('totalScrap').value = '';
            document.getElementById('porcentajeRefil').value = '';

            // Resetear indicador
            const indicador = document.getElementById('indicadorRefil');
            if (indicador) {
                indicador.className = 'alert alert-secondary py-1 px-2 mb-0 small text-center';
                indicador.innerHTML = '<i class="bi bi-dash-circle me-1"></i> Sin datos';
            }

            // Resetear footer
            document.getElementById('footerEntrada').textContent = '0';
            document.getElementById('footerSalida').textContent = '0';
            document.getElementById('footerMerma').textContent = '0';
            document.getElementById('footerRefil').textContent = '0';
        }
    },
};

// Inicializar cuando el DOM este listo
document.addEventListener('DOMContentLoaded', () => {
    if (document.getElementById('formImpresion')) {
        Impresion.init();
    }
});

// Exportar modulo
if (typeof module !== 'undefined' && module.exports) {
    module.exports = Impresion;
}
