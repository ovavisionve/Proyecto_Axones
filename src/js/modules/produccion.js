/**
 * Modulo Produccion - Sistema Axones
 * Maneja el registro y gestion de datos de produccion
 */

const Produccion = {
    // Umbrales de desperdicio por material
    umbrales: {},

    /**
     * Inicializa el modulo de produccion
     */
    init: function() {
        console.log('Inicializando modulo Produccion');

        this.loadUmbrales();
        this.setupForm();
        this.setupCalculations();
        this.loadUltimosRegistros();
        this.setDefaultDate();
    },

    /**
     * Carga los umbrales de desperdicio
     */
    loadUmbrales: async function() {
        // En desarrollo, usar umbrales por defecto
        this.umbrales = {
            'bopp_azul': { maximo: 5.0, advertencia: 3.5 },
            'bopp_transparente': { maximo: 5.0, advertencia: 3.5 },
            'pebd_transparente': { maximo: 5.0, advertencia: 3.5 },
            'pebd_blanco': { maximo: 5.0, advertencia: 3.5 },
            'pet_cristal': { maximo: 4.0, advertencia: 3.0 },
            'polipropileno': { maximo: 4.5, advertencia: 3.0 },
            'default': { maximo: 5.0, advertencia: 3.5 },
        };

        this.renderUmbrales();
    },

    /**
     * Renderiza los umbrales en el panel lateral
     */
    renderUmbrales: function() {
        const container = document.getElementById('listaUmbrales');
        if (!container) return;

        const materialesNombres = {
            'bopp_azul': 'BOPP Azul',
            'bopp_transparente': 'BOPP Transparente',
            'pebd_transparente': 'PEBD Transparente',
            'pebd_blanco': 'PEBD Blanco',
            'pet_cristal': 'PET Cristal',
            'polipropileno': 'Polipropileno',
        };

        let html = '';
        for (const [key, umbral] of Object.entries(this.umbrales)) {
            if (key === 'default') continue;
            const nombre = materialesNombres[key] || key;
            html += `
                <div class="d-flex justify-content-between align-items-center mb-2">
                    <span>${nombre}</span>
                    <span class="badge bg-warning">Max: ${umbral.maximo}%</span>
                </div>
            `;
        }

        container.innerHTML = html;
    },

    /**
     * Configura el formulario
     */
    setupForm: function() {
        const form = document.getElementById('formProduccion');
        if (!form) return;

        form.addEventListener('submit', (e) => {
            e.preventDefault();
            this.guardarRegistro();
        });

        // Boton limpiar
        const btnLimpiar = document.getElementById('btnLimpiar');
        if (btnLimpiar) {
            btnLimpiar.addEventListener('click', () => this.limpiarFormulario());
        }

        // Boton nuevo registro
        const btnNuevo = document.getElementById('btnNuevoRegistro');
        if (btnNuevo) {
            btnNuevo.addEventListener('click', () => {
                this.limpiarFormulario();
                document.getElementById('fecha').focus();
            });
        }
    },

    /**
     * Configura los calculos automaticos
     */
    setupCalculations: function() {
        const cantidadInicial = document.getElementById('cantidadInicial');
        const cantidadFinal = document.getElementById('cantidadFinal');

        if (cantidadInicial && cantidadFinal) {
            cantidadInicial.addEventListener('input', () => this.calcularDesperdicio());
            cantidadFinal.addEventListener('input', () => this.calcularDesperdicio());
        }

        // Recalcular al cambiar material
        const material = document.getElementById('material');
        if (material) {
            material.addEventListener('change', () => this.calcularDesperdicio());
        }
    },

    /**
     * Calcula el desperdicio
     */
    calcularDesperdicio: function() {
        const cantidadInicial = parseFloat(document.getElementById('cantidadInicial').value) || 0;
        const cantidadFinal = parseFloat(document.getElementById('cantidadFinal').value) || 0;
        const material = document.getElementById('material').value;

        const desperdicioKg = cantidadInicial - cantidadFinal;
        const desperdicioPct = cantidadInicial > 0 ? (desperdicioKg / cantidadInicial * 100) : 0;

        // Actualizar campos
        document.getElementById('desperdicioKg').value = desperdicioKg.toFixed(2);
        document.getElementById('desperdicioPct').value = desperdicioPct.toFixed(2) + '%';

        // Determinar estado
        const umbral = this.umbrales[material] || this.umbrales['default'];
        const statusEl = document.getElementById('desperdicioStatus');

        if (statusEl) {
            statusEl.className = 'input-group-text';
            if (desperdicioKg < 0) {
                statusEl.innerHTML = '<i class="bi bi-exclamation-circle text-danger"></i>';
                statusEl.title = 'Error: produccion mayor que entrada';
            } else if (desperdicioPct > umbral.maximo) {
                statusEl.innerHTML = '<i class="bi bi-x-circle text-danger"></i>';
                statusEl.title = 'Desperdicio excede el umbral maximo';
            } else if (desperdicioPct > umbral.advertencia) {
                statusEl.innerHTML = '<i class="bi bi-exclamation-triangle text-warning"></i>';
                statusEl.title = 'Desperdicio en nivel de advertencia';
            } else {
                statusEl.innerHTML = '<i class="bi bi-check-circle text-success"></i>';
                statusEl.title = 'Desperdicio dentro de parametros';
            }
        }

        return { kg: desperdicioKg, porcentaje: desperdicioPct };
    },

    /**
     * Establece la fecha por defecto (hoy)
     */
    setDefaultDate: function() {
        const fechaInput = document.getElementById('fecha');
        if (fechaInput) {
            const today = new Date().toISOString().split('T')[0];
            fechaInput.value = today;
        }
    },

    /**
     * Guarda el registro de produccion
     */
    guardarRegistro: async function() {
        if (!Auth.isAuthenticated()) {
            Axones.showError('Debe iniciar sesion para guardar registros');
            return;
        }

        const form = document.getElementById('formProduccion');
        if (!form.checkValidity()) {
            form.reportValidity();
            return;
        }

        // Recopilar datos
        const registro = {
            timestamp: new Date().toISOString(),
            fecha: document.getElementById('fecha').value,
            turno: document.getElementById('turno').value,
            maquina: document.getElementById('maquina').value,
            cliente: document.getElementById('cliente').value,
            producto: document.getElementById('producto').value,
            material: document.getElementById('material').value,
            cantidadInicial: parseFloat(document.getElementById('cantidadInicial').value),
            cantidadFinal: parseFloat(document.getElementById('cantidadFinal').value),
            desperdicioKg: parseFloat(document.getElementById('desperdicioKg').value),
            desperdicioPct: parseFloat(document.getElementById('desperdicioPct').value),
            tinta: parseFloat(document.getElementById('tinta').value) || 0,
            solvente: parseFloat(document.getElementById('solvente').value) || 0,
            adhesivo: parseFloat(document.getElementById('adhesivo').value) || 0,
            observaciones: document.getElementById('observaciones').value,
            operador: Auth.getUser().id,
            operadorNombre: Auth.getUser().nombre,
        };

        // Validar desperdicio
        const desperdicio = this.calcularDesperdicio();
        if (desperdicio.kg < 0) {
            Axones.showError('Error: La cantidad producida no puede ser mayor que la cantidad inicial');
            return;
        }

        // Verificar si genera alerta
        const umbral = this.umbrales[registro.material] || this.umbrales['default'];
        const generaAlerta = desperdicio.porcentaje > umbral.maximo;

        try {
            // En desarrollo, guardar en localStorage
            if (CONFIG.API.BASE_URL === '') {
                this.guardarLocal(registro);
                Axones.showSuccess('Registro guardado correctamente');

                if (generaAlerta) {
                    this.generarAlerta(registro, umbral);
                }

                this.limpiarFormulario();
                this.loadUltimosRegistros();
                return;
            }

            // En produccion, enviar a Apps Script
            const response = await fetch(CONFIG.API.BASE_URL + '?action=saveProduccion', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(registro),
            });

            const result = await response.json();
            if (result.success) {
                Axones.showSuccess('Registro guardado correctamente');
                this.limpiarFormulario();
                this.loadUltimosRegistros();
            } else {
                throw new Error(result.error || 'Error desconocido');
            }
        } catch (error) {
            console.error('Error guardando registro:', error);
            Axones.showError('Error al guardar: ' + error.message);
        }
    },

    /**
     * Guarda registro en localStorage (desarrollo)
     */
    guardarLocal: function(registro) {
        const registros = JSON.parse(localStorage.getItem(CONFIG.CACHE.PREFIJO + 'produccion') || '[]');
        registro.id = 'PRD_' + Date.now();
        registros.unshift(registro);
        localStorage.setItem(CONFIG.CACHE.PREFIJO + 'produccion', JSON.stringify(registros));
    },

    /**
     * Genera una alerta por desperdicio excesivo
     */
    generarAlerta: function(registro, umbral) {
        const alerta = {
            id: 'ALT_' + Date.now(),
            timestamp: new Date().toISOString(),
            tipo: CONFIG.ALERTAS.TIPOS.DESPERDICIO_ALTO,
            nivel: registro.desperdicioPct > umbral.maximo * 1.5
                ? CONFIG.ALERTAS.NIVELES.CRITICAL
                : CONFIG.ALERTAS.NIVELES.WARNING,
            maquina: registro.maquina,
            operador: registro.operadorNombre,
            mensaje: `Desperdicio ${registro.desperdicioPct.toFixed(1)}% excede umbral de ${umbral.maximo}%`,
            estado: 'pendiente',
            registro_id: registro.id,
        };

        // Guardar alerta
        const alertas = JSON.parse(localStorage.getItem(CONFIG.CACHE.PREFIJO + 'alertas') || '[]');
        alertas.unshift(alerta);
        localStorage.setItem(CONFIG.CACHE.PREFIJO + 'alertas', JSON.stringify(alertas));

        // Mostrar notificacion
        Axones.showToast(
            `ALERTA: ${alerta.mensaje}`,
            alerta.nivel === CONFIG.ALERTAS.NIVELES.CRITICAL ? 'danger' : 'warning'
        );
    },

    /**
     * Limpia el formulario
     */
    limpiarFormulario: function() {
        const form = document.getElementById('formProduccion');
        if (form) {
            form.reset();
            this.setDefaultDate();
            document.getElementById('desperdicioKg').value = '';
            document.getElementById('desperdicioPct').value = '';
            document.getElementById('desperdicioStatus').innerHTML = '<i class="bi bi-circle"></i>';
        }
    },

    /**
     * Carga los ultimos registros
     */
    loadUltimosRegistros: function() {
        const container = document.getElementById('ultimosRegistros');
        if (!container) return;

        // Cargar de localStorage
        const registros = JSON.parse(localStorage.getItem(CONFIG.CACHE.PREFIJO + 'produccion') || '[]');
        const ultimos = registros.slice(0, 5);

        if (ultimos.length === 0) {
            container.innerHTML = `
                <li class="list-group-item text-center text-muted py-4">
                    <i class="bi bi-inbox display-6 d-block mb-2"></i>
                    No hay registros recientes
                </li>
            `;
            return;
        }

        container.innerHTML = ultimos.map(reg => {
            const fecha = new Date(reg.timestamp);
            const hora = fecha.toLocaleTimeString('es-VE', { hour: '2-digit', minute: '2-digit' });
            const umbral = this.umbrales[reg.material] || this.umbrales['default'];
            const statusClass = reg.desperdicioPct > umbral.maximo ? 'text-danger' : 'text-success';

            return `
                <li class="list-group-item">
                    <div class="d-flex justify-content-between align-items-start">
                        <div>
                            <small class="text-muted">${hora}</small>
                            <div class="fw-medium">${reg.producto}</div>
                            <small class="text-muted">${reg.cantidadFinal} kg</small>
                        </div>
                        <span class="badge ${statusClass === 'text-danger' ? 'bg-danger' : 'bg-success'}">
                            ${reg.desperdicioPct.toFixed(1)}%
                        </span>
                    </div>
                </li>
            `;
        }).join('');

        // Actualizar resumen del turno
        this.actualizarResumenTurno(registros);
    },

    /**
     * Actualiza el resumen del turno
     */
    actualizarResumenTurno: function(registros) {
        const hoy = new Date().toISOString().split('T')[0];
        const registrosHoy = registros.filter(r => r.fecha === hoy);

        const totalProduccion = registrosHoy.reduce((sum, r) => sum + r.cantidadFinal, 0);
        const totalDesperdicio = registrosHoy.reduce((sum, r) => sum + r.desperdicioKg, 0);
        const totalInicial = registrosHoy.reduce((sum, r) => sum + r.cantidadInicial, 0);
        const pctDesperdicio = totalInicial > 0 ? (totalDesperdicio / totalInicial * 100) : 0;

        document.getElementById('turnoProduccion').textContent = Axones.formatNumber(totalProduccion, 0);
        document.getElementById('turnoRegistros').textContent = registrosHoy.length;
        document.getElementById('turnoDesperdicio').textContent = pctDesperdicio.toFixed(1) + '%';
        document.getElementById('turnoEficiencia').textContent =
            totalInicial > 0 ? ((totalProduccion / totalInicial) * 100).toFixed(0) + '%' : '--';
    },
};

// Inicializar cuando el DOM este listo
document.addEventListener('DOMContentLoaded', () => {
    if (document.getElementById('formProduccion')) {
        Produccion.init();
    }
});

// Exportar modulo
if (typeof module !== 'undefined' && module.exports) {
    module.exports = Produccion;
}
