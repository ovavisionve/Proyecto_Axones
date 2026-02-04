/**
 * Modulo Consumo de Tintas y Solventes - Sistema Axones
 * Registro de consumo por Orden de Trabajo
 */

const Tintas = {
    /**
     * Inicializa el modulo
     */
    init: function() {
        console.log('Inicializando modulo Consumo de Tintas y Solventes');

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

        // Boton historial
        const btnHistorial = document.getElementById('btnHistorial');
        if (btnHistorial) {
            btnHistorial.addEventListener('click', () => this.mostrarHistorial());
        }

        // Submit del formulario
        const form = document.getElementById('formTintas');
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
        // Tintas de laminacion
        document.querySelectorAll('.tinta-lam').forEach(input => {
            input.addEventListener('input', () => this.calcularTotales());
        });

        // Tintas de superficie
        document.querySelectorAll('.tinta-sup').forEach(input => {
            input.addEventListener('input', () => this.calcularTotales());
        });

        // Solventes
        document.querySelectorAll('.solvente-input').forEach(input => {
            input.addEventListener('input', () => this.calcularTotales());
        });
    },

    /**
     * Calcula todos los totales
     */
    calcularTotales: function() {
        // Total tintas de laminacion
        let totalLam = 0;
        document.querySelectorAll('.tinta-lam').forEach(input => {
            totalLam += parseFloat(input.value) || 0;
        });
        document.getElementById('totalLaminacion').value = totalLam.toFixed(2);

        // Total tintas de superficie
        let totalSup = 0;
        document.querySelectorAll('.tinta-sup').forEach(input => {
            totalSup += parseFloat(input.value) || 0;
        });
        document.getElementById('totalSuperficie').value = totalSup.toFixed(2);

        // Total solventes
        const alcohol = parseFloat(document.getElementById('alcohol').value) || 0;
        const metoxi = parseFloat(document.getElementById('metoxi').value) || 0;
        const acetato = parseFloat(document.getElementById('acetato').value) || 0;
        const totalSolv = alcohol + metoxi + acetato;
        document.getElementById('totalSolventes').textContent = totalSolv.toFixed(2);

        // Resumen
        document.getElementById('totalTintas').textContent = (totalLam + totalSup).toFixed(2);
        document.getElementById('totalSolventesResumen').textContent = totalSolv.toFixed(2);
    },

    /**
     * Guarda el registro de consumo
     */
    guardar: async function() {
        // Validar campos requeridos
        const fecha = document.getElementById('fecha').value;
        const ordenTrabajo = document.getElementById('ordenTrabajo').value;

        if (!fecha || !ordenTrabajo) {
            Axones.showError('Fecha y Orden de Trabajo son requeridos');
            return;
        }

        // Verificar autenticacion
        if (!Auth.isAuthenticated()) {
            Axones.showError('Debe iniciar sesion para guardar registros');
            return;
        }

        const datos = this.recopilarDatos();

        try {
            // Preparar datos para API
            const datosAPI = {
                fecha: datos.fecha,
                turno: datos.turno,
                maquina: datos.maquina,
                produccion_id: '',
                tinta_tipo: 'mixto',
                tinta_nombre: 'Laminacion: ' + datos.totalLaminacion + ' Kg, Superficie: ' + datos.totalSuperficie + ' Kg',
                cantidad_kg: datos.totalLaminacion + datos.totalSuperficie,
                operador: datos.operador || ''
            };

            const result = await AxonesAPI.createConsumoTinta(datosAPI);

            if (result.success) {
                this.mostrarToast('Consumo de tintas guardado en Google Sheets', 'success');
                this.guardarLocal(datos);
                this.limpiar();
                return;
            }

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
        return {
            id: 'TIN_' + Date.now(),
            timestamp: new Date().toISOString(),

            // Datos de OT
            fecha: document.getElementById('fecha').value,
            ordenTrabajo: document.getElementById('ordenTrabajo').value,
            kgProduccion: parseFloat(document.getElementById('kgProduccion').value) || 0,
            cliente: document.getElementById('cliente').value,
            producto: document.getElementById('producto').value,
            status: document.getElementById('status').value,
            maquina: document.getElementById('maquina').value,

            // Tintas de Laminacion
            tintasLaminacion: {
                amarillo: parseFloat(document.getElementById('lamAmarillo').value) || 0,
                cyan: parseFloat(document.getElementById('lamCyan').value) || 0,
                magenta: parseFloat(document.getElementById('lamMagenta').value) || 0,
                negro: parseFloat(document.getElementById('lamNegro').value) || 0,
                blanco: parseFloat(document.getElementById('lamBlanco').value) || 0,
                rojo485_2x: parseFloat(document.getElementById('lamRojo485').value) || 0,
                azulReflex: parseFloat(document.getElementById('lamAzulReflex').value) || 0,
                naranja021: parseFloat(document.getElementById('lamNaranja021').value) || 0,
                extender: parseFloat(document.getElementById('lamExtender').value) || 0,
                naranjaMary: parseFloat(document.getElementById('lamNaranjaMary').value) || 0,
                violeta: parseFloat(document.getElementById('lamVioleta').value) || 0,
                verdeC: parseFloat(document.getElementById('lamVerdeC').value) || 0,
                compCera: parseFloat(document.getElementById('lamCompCera').value) || 0,
                doradoALV: parseFloat(document.getElementById('lamDorado').value) || 0,
                rojo485C: parseFloat(document.getElementById('lamRojo485C').value) || 0,
            },
            totalLaminacion: parseFloat(document.getElementById('totalLaminacion').value) || 0,

            // Tintas de Superficie
            tintasSuperficie: {
                amarillo: parseFloat(document.getElementById('supAmarillo').value) || 0,
                cyan: parseFloat(document.getElementById('supCyan').value) || 0,
                magenta: parseFloat(document.getElementById('supMagenta').value) || 0,
                negro: parseFloat(document.getElementById('supNegro').value) || 0,
                blanco: parseFloat(document.getElementById('supBlanco').value) || 0,
                rojo485_2x: parseFloat(document.getElementById('supRojo485').value) || 0,
                azulReflex: parseFloat(document.getElementById('supAzulReflex').value) || 0,
                naranja021: parseFloat(document.getElementById('supNaranja021').value) || 0,
                extender: parseFloat(document.getElementById('supExtender').value) || 0,
                barniz: parseFloat(document.getElementById('supBarniz').value) || 0,
                verdeC: parseFloat(document.getElementById('supVerdeC').value) || 0,
            },
            totalSuperficie: parseFloat(document.getElementById('totalSuperficie').value) || 0,

            // Solventes
            solventes: {
                alcohol: parseFloat(document.getElementById('alcohol').value) || 0,
                metoxi: parseFloat(document.getElementById('metoxi').value) || 0,
                acetato: parseFloat(document.getElementById('acetato').value) || 0,
            },
            totalSolventes: parseFloat(document.getElementById('totalSolventes').textContent) || 0,

            observaciones: document.getElementById('observaciones').value,

            // Usuario
            registradoPor: Auth.getUser() ? Auth.getUser().id : 'unknown',
            registradoPorNombre: Auth.getUser() ? Auth.getUser().nombre : 'Unknown',
        };
    },

    /**
     * Guarda en localStorage
     */
    guardarLocal: function(datos) {
        const registros = JSON.parse(localStorage.getItem(CONFIG.CACHE.PREFIJO + 'tintas') || '[]');
        registros.unshift(datos);
        localStorage.setItem(CONFIG.CACHE.PREFIJO + 'tintas', JSON.stringify(registros));
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
     * Muestra el historial de registros
     */
    mostrarHistorial: function() {
        const registros = JSON.parse(localStorage.getItem(CONFIG.CACHE.PREFIJO + 'tintas') || '[]');

        if (registros.length === 0) {
            Axones.showToast('No hay registros en el historial', 'info');
            return;
        }

        // Crear contenido del modal
        let contenido = '<div class="table-responsive"><table class="table table-sm table-hover">';
        contenido += '<thead><tr><th>Fecha</th><th>OT</th><th>Cliente</th><th>Tintas</th><th>Solventes</th></tr></thead><tbody>';

        registros.slice(0, 20).forEach(reg => {
            const fecha = new Date(reg.timestamp).toLocaleDateString('es-VE');
            const totalTintas = (reg.totalLaminacion + reg.totalSuperficie).toFixed(2);
            contenido += `
                <tr>
                    <td>${fecha}</td>
                    <td>${reg.ordenTrabajo}</td>
                    <td>${reg.cliente || '-'}</td>
                    <td>${totalTintas} Kg</td>
                    <td>${reg.totalSolventes.toFixed(2)} Lt</td>
                </tr>
            `;
        });

        contenido += '</tbody></table></div>';

        // Mostrar en un modal simple (usando alert por simplicidad)
        const modalHtml = `
            <div class="modal fade" id="modalHistorial" tabindex="-1">
                <div class="modal-dialog modal-lg">
                    <div class="modal-content">
                        <div class="modal-header">
                            <h5 class="modal-title"><i class="bi bi-clock-history me-2"></i>Historial de Consumos</h5>
                            <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                        </div>
                        <div class="modal-body">${contenido}</div>
                    </div>
                </div>
            </div>
        `;

        // Agregar y mostrar modal
        let modalEl = document.getElementById('modalHistorial');
        if (modalEl) modalEl.remove();

        document.body.insertAdjacentHTML('beforeend', modalHtml);
        modalEl = document.getElementById('modalHistorial');
        const modal = new bootstrap.Modal(modalEl);
        modal.show();

        modalEl.addEventListener('hidden.bs.modal', () => modalEl.remove());
    },

    /**
     * Limpia el formulario
     */
    limpiar: function() {
        const form = document.getElementById('formTintas');
        if (form) {
            form.reset();
            this.setDefaultDate();

            // Resetear totales
            document.getElementById('totalLaminacion').value = '0.00';
            document.getElementById('totalSuperficie').value = '0.00';
            document.getElementById('totalSolventes').textContent = '0.00';
            document.getElementById('totalTintas').textContent = '0.00';
            document.getElementById('totalSolventesResumen').textContent = '0.00';

            // Resetear todos los inputs numericos a 0
            document.querySelectorAll('.tinta-lam, .tinta-sup, .solvente-input').forEach(input => {
                input.value = '0';
            });
        }
    },
};

// Inicializar cuando el DOM este listo
document.addEventListener('DOMContentLoaded', () => {
    if (document.getElementById('formTintas')) {
        Tintas.init();
    }
});

// Exportar modulo
if (typeof module !== 'undefined' && module.exports) {
    module.exports = Tintas;
}
