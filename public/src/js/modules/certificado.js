/**
 * Modulo Certificado de Control de Calidad - Sistema Axones
 * Genera certificados de calidad para productos
 */

const Certificado = {
    // Tolerancia porcentual para evaluacion
    tolerancia: 5, // 5%

    /**
     * Inicializa el modulo
     */
    init: function() {
        console.log('Inicializando modulo Certificado');
        this.setDefaultValues();
        this.setupEventListeners();
    },

    /**
     * Establece valores por defecto
     */
    setDefaultValues: function() {
        const fechaInput = document.getElementById('fecha');
        if (fechaInput) {
            fechaInput.value = new Date().toISOString().split('T')[0];
        }

        // Generar numero de certificado
        const numCert = document.getElementById('numCertificado');
        if (numCert) {
            const fecha = new Date();
            const year = fecha.getFullYear();
            const seq = (JSON.parse(localStorage.getItem(CONFIG.CACHE.PREFIJO + 'certificados') || '[]').length + 1).toString().padStart(4, '0');
            numCert.value = `CC-${year}-${seq}`;
        }
    },

    /**
     * Configura event listeners
     */
    setupEventListeners: function() {
        // Auto-actualizar preview
        const campos = ['cliente', 'producto', 'ordenTrabajo'];
        campos.forEach(id => {
            const el = document.getElementById(id);
            if (el) {
                el.addEventListener('input', () => this.generarPreview());
            }
        });
    },

    /**
     * Recopila los datos del formulario
     */
    recopilarDatos: function() {
        const especificaciones = [
            { param: 'Espesor', spec: document.getElementById('espesorSpec').value, med: document.getElementById('espesorMed').value, unidad: 'micras' },
            { param: 'Gramaje', spec: document.getElementById('gramajeSpec').value, med: document.getElementById('gramajeMed').value, unidad: 'g/m2' },
            { param: 'Ancho', spec: document.getElementById('anchoSpec').value, med: document.getElementById('anchoMed').value, unidad: 'mm' },
            { param: 'Frecuencia', spec: document.getElementById('frecuenciaSpec').value, med: document.getElementById('frecuenciaMed').value, unidad: 'mm' },
            { param: 'Diametro', spec: document.getElementById('diametroSpec').value, med: document.getElementById('diametroMed').value, unidad: 'mm' },
            { param: 'Peso Neto', spec: document.getElementById('pesoSpec').value, med: document.getElementById('pesoMed').value, unidad: 'Kg' }
        ];

        const inspeccionVisual = [
            { item: 'Impresion correcta', ok: document.getElementById('checkImpresion').checked },
            { item: 'Registro de colores', ok: document.getElementById('checkRegistro').checked },
            { item: 'Adherencia de tinta', ok: document.getElementById('checkAdherencia').checked },
            { item: 'Laminacion sin burbujas', ok: document.getElementById('checkLaminacion').checked },
            { item: 'Bobinado uniforme', ok: document.getElementById('checkBobinado').checked },
            { item: 'Sin contaminantes', ok: document.getElementById('checkLimpieza').checked }
        ];

        return {
            numCertificado: document.getElementById('numCertificado').value,
            fecha: document.getElementById('fecha').value,
            ordenTrabajo: document.getElementById('ordenTrabajo').value,
            lote: document.getElementById('lote').value,
            cliente: document.getElementById('cliente').value,
            producto: document.getElementById('producto').value,
            material: document.getElementById('material').value,
            cantidad: document.getElementById('cantidad').value,
            especificaciones: especificaciones,
            inspeccionVisual: inspeccionVisual,
            inspector: document.getElementById('inspector').value,
            supervisor: document.getElementById('supervisor').value,
            observaciones: document.getElementById('observaciones').value
        };
    },

    /**
     * Evalua si un valor medido esta dentro de tolerancia
     */
    evaluarEspecificacion: function(spec, med) {
        if (!spec || !med) return 'pending';
        const especificado = parseFloat(spec);
        const medido = parseFloat(med);
        const toleranciaAbs = especificado * (this.tolerancia / 100);

        if (Math.abs(medido - especificado) <= toleranciaAbs) {
            return 'ok';
        } else if (Math.abs(medido - especificado) <= toleranciaAbs * 2) {
            return 'warning';
        }
        return 'fail';
    },

    /**
     * Genera la vista previa del certificado
     */
    generarPreview: function() {
        const datos = this.recopilarDatos();
        const fechaFormateada = datos.fecha ? new Date(datos.fecha).toLocaleDateString('es-ES', { year: 'numeric', month: 'long', day: 'numeric' }) : '-';

        // Evaluar especificaciones
        let especOk = 0;
        let especTotal = 0;
        const especHtml = datos.especificaciones.map(e => {
            if (e.spec && e.med) {
                especTotal++;
                const estado = this.evaluarEspecificacion(e.spec, e.med);
                if (estado === 'ok') especOk++;
                const clase = estado === 'ok' ? 'spec-ok' : (estado === 'warning' ? 'spec-warning' : 'spec-fail');
                return `<tr>
                    <td>${e.param}</td>
                    <td>${e.spec}</td>
                    <td class="${clase}">${e.med}</td>
                    <td>${e.unidad}</td>
                </tr>`;
            }
            return `<tr>
                <td>${e.param}</td>
                <td>${e.spec || '-'}</td>
                <td>${e.med || '-'}</td>
                <td>${e.unidad}</td>
            </tr>`;
        }).join('');

        // Evaluar inspeccion visual
        const visualOk = datos.inspeccionVisual.filter(i => i.ok).length;
        const visualTotal = datos.inspeccionVisual.length;
        const visualHtml = datos.inspeccionVisual.map(i => `
            <span class="badge ${i.ok ? 'bg-success' : 'bg-danger'} me-1 mb-1">
                <i class="bi bi-${i.ok ? 'check' : 'x'} me-1"></i>${i.item}
            </span>
        `).join('');

        // Determinar aprobacion
        const aprobado = (especTotal === 0 || especOk === especTotal) && visualOk === visualTotal;
        const selloHtml = aprobado
            ? '<div class="sello-calidad" style="border-color: #198754; color: #198754;"><i class="bi bi-check-circle fs-4"></i><br>APROBADO</div>'
            : '<div class="sello-calidad" style="border-color: #dc3545; color: #dc3545;"><i class="bi bi-x-circle fs-4"></i><br>RECHAZADO</div>';

        const html = `
            <div class="certificado-preview position-relative">
                ${selloHtml}
                <div class="certificado-header">
                    <div class="certificado-titulo">
                        <i class="bi bi-gear-wide-connected me-2"></i>AXONES
                    </div>
                    <div class="certificado-subtitulo">Empaques Flexibles de Alta Calidad</div>
                    <h4 class="mt-3 mb-0">CERTIFICADO DE CONTROL DE CALIDAD</h4>
                    <div class="small text-muted">N° ${datos.numCertificado}</div>
                </div>

                <div class="row mb-3">
                    <div class="col-6">
                        <p class="mb-1"><strong>Cliente:</strong> ${datos.cliente || '-'}</p>
                        <p class="mb-1"><strong>Producto:</strong> ${datos.producto || '-'}</p>
                        <p class="mb-1"><strong>Material:</strong> ${datos.material}</p>
                    </div>
                    <div class="col-6 text-end">
                        <p class="mb-1"><strong>Orden de Trabajo:</strong> ${datos.ordenTrabajo || '-'}</p>
                        <p class="mb-1"><strong>Lote:</strong> ${datos.lote || '-'}</p>
                        <p class="mb-1"><strong>Cantidad:</strong> ${datos.cantidad || '-'} Kg</p>
                    </div>
                </div>

                <h6 class="text-uppercase mb-2"><i class="bi bi-rulers me-2"></i>Especificaciones Tecnicas</h6>
                <table class="spec-table">
                    <thead>
                        <tr>
                            <th>Parametro</th>
                            <th>Especificado</th>
                            <th>Medido</th>
                            <th>Unidad</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${especHtml}
                    </tbody>
                </table>
                <p class="small text-muted mb-3">Tolerancia: ±${this.tolerancia}%</p>

                <h6 class="text-uppercase mb-2"><i class="bi bi-eye me-2"></i>Inspeccion Visual</h6>
                <div class="mb-3">
                    ${visualHtml}
                </div>

                ${datos.observaciones ? `
                    <h6 class="text-uppercase mb-2"><i class="bi bi-chat me-2"></i>Observaciones</h6>
                    <p class="small border p-2 rounded">${datos.observaciones}</p>
                ` : ''}

                <div class="firma-section">
                    <div class="firma-box">
                        <div class="firma-linea"></div>
                        <div class="small"><strong>Inspector de Calidad</strong></div>
                        <div class="small">${datos.inspector || '_____________'}</div>
                    </div>
                    <div class="firma-box">
                        <div class="firma-linea"></div>
                        <div class="small"><strong>Supervisor</strong></div>
                        <div class="small">${datos.supervisor || '_____________'}</div>
                    </div>
                </div>

                <div class="text-center mt-4 small text-muted">
                    <p class="mb-0">Fecha de emision: ${fechaFormateada}</p>
                    <p class="mb-0">Este documento certifica que el producto cumple con los estandares de calidad de Axones.</p>
                </div>
            </div>
        `;

        document.getElementById('certificadoPreview').innerHTML = html;
    },

    /**
     * Imprime el certificado
     */
    imprimir: function() {
        const form = document.getElementById('formCertificado');
        if (!form.checkValidity()) {
            form.reportValidity();
            return;
        }

        // Asegurar que preview esta actualizado
        this.generarPreview();

        const datos = this.recopilarDatos();

        // Guardar en historial
        this.guardarHistorial(datos);

        // Abrir ventana de impresion
        const printContent = document.getElementById('certificadoPreview').innerHTML;

        const printWindow = window.open('', '_blank');
        printWindow.document.write(`
            <!DOCTYPE html>
            <html>
            <head>
                <title>Certificado ${datos.numCertificado}</title>
                <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.2/dist/css/bootstrap.min.css" rel="stylesheet">
                <link href="https://cdn.jsdelivr.net/npm/bootstrap-icons@1.11.1/font/bootstrap-icons.css" rel="stylesheet">
                <style>
                    body { font-family: Arial, sans-serif; padding: 20px; }
                    .certificado-preview {
                        background: white;
                        border: 3px double #20c997;
                        padding: 30px;
                        max-width: 800px;
                        margin: 0 auto;
                        position: relative;
                    }
                    .certificado-header {
                        text-align: center;
                        border-bottom: 2px solid #20c997;
                        padding-bottom: 15px;
                        margin-bottom: 20px;
                    }
                    .certificado-titulo {
                        font-size: 1.8rem;
                        font-weight: bold;
                        color: #20c997;
                    }
                    .spec-table {
                        width: 100%;
                        border-collapse: collapse;
                        margin: 15px 0;
                    }
                    .spec-table th, .spec-table td {
                        border: 1px solid #dee2e6;
                        padding: 8px 12px;
                        text-align: center;
                    }
                    .spec-table th { background: #f8f9fa; }
                    .spec-ok { background: #d1e7dd; color: #0f5132; }
                    .spec-warning { background: #fff3cd; color: #664d03; }
                    .spec-fail { background: #f8d7da; color: #842029; }
                    .firma-section {
                        display: flex;
                        justify-content: space-around;
                        margin-top: 30px;
                        padding-top: 20px;
                        border-top: 1px solid #dee2e6;
                    }
                    .firma-box { text-align: center; width: 200px; }
                    .firma-linea { border-bottom: 1px solid #000; height: 40px; margin-bottom: 5px; }
                    .sello-calidad {
                        position: absolute;
                        top: 50%;
                        right: 30px;
                        transform: translateY(-50%) rotate(-15deg);
                        border: 3px solid;
                        border-radius: 50%;
                        padding: 15px 20px;
                        font-weight: bold;
                        font-size: 0.9rem;
                        text-align: center;
                        opacity: 0.8;
                    }
                    @media print {
                        body { padding: 0; }
                        @page { margin: 15mm; }
                    }
                </style>
            </head>
            <body>
                ${printContent}
                <script>
                    window.onload = function() {
                        window.print();
                        window.onafterprint = function() { window.close(); };
                    };
                </script>
            </body>
            </html>
        `);
        printWindow.document.close();

        Axones.showSuccess(`Certificado ${datos.numCertificado} generado`);
    },

    /**
     * Guarda en historial
     */
    guardarHistorial: function(datos) {
        datos.timestamp = new Date().toISOString();

        // Calcular estado
        const especOk = datos.especificaciones.filter(e => e.spec && e.med && this.evaluarEspecificacion(e.spec, e.med) === 'ok').length;
        const especTotal = datos.especificaciones.filter(e => e.spec && e.med).length;
        const visualOk = datos.inspeccionVisual.filter(i => i.ok).length;
        datos.aprobado = (especTotal === 0 || especOk === especTotal) && visualOk === datos.inspeccionVisual.length;

        const historial = JSON.parse(localStorage.getItem(CONFIG.CACHE.PREFIJO + 'certificados') || '[]');
        historial.unshift(datos);
        localStorage.setItem(CONFIG.CACHE.PREFIJO + 'certificados', JSON.stringify(historial.slice(0, 200)));

        // Actualizar numero para siguiente certificado
        this.setDefaultValues();
    },

    /**
     * Muestra historial
     */
    verHistorial: function() {
        const historial = JSON.parse(localStorage.getItem(CONFIG.CACHE.PREFIJO + 'certificados') || '[]');

        let html = '<div class="table-responsive"><table class="table table-sm table-striped">';
        html += '<thead><tr><th>N° Certificado</th><th>Fecha</th><th>Cliente</th><th>OT</th><th>Estado</th></tr></thead><tbody>';

        if (historial.length === 0) {
            html += '<tr><td colspan="5" class="text-center text-muted">No hay registros</td></tr>';
        } else {
            historial.slice(0, 30).forEach(c => {
                const estado = c.aprobado
                    ? '<span class="badge bg-success">Aprobado</span>'
                    : '<span class="badge bg-danger">Rechazado</span>';
                html += `<tr>
                    <td>${c.numCertificado}</td>
                    <td>${new Date(c.timestamp).toLocaleDateString()}</td>
                    <td>${c.cliente}</td>
                    <td>${c.ordenTrabajo}</td>
                    <td>${estado}</td>
                </tr>`;
            });
        }

        html += '</tbody></table></div>';

        const modal = document.createElement('div');
        modal.innerHTML = `
            <div class="modal fade" id="modalHistorialCert" tabindex="-1">
                <div class="modal-dialog modal-lg">
                    <div class="modal-content">
                        <div class="modal-header">
                            <h5 class="modal-title"><i class="bi bi-clock-history me-2"></i>Historial de Certificados</h5>
                            <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                        </div>
                        <div class="modal-body">${html}</div>
                    </div>
                </div>
            </div>
        `;
        document.body.appendChild(modal);
        const bsModal = new bootstrap.Modal(document.getElementById('modalHistorialCert'));
        bsModal.show();
        document.getElementById('modalHistorialCert').addEventListener('hidden.bs.modal', () => modal.remove());
    }
};

// Inicializar
document.addEventListener('DOMContentLoaded', () => {
    if (document.getElementById('formCertificado')) {
        Certificado.init();
    }
});

// Exportar
if (typeof window !== 'undefined') {
    window.Certificado = Certificado;
}
