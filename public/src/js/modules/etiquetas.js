/**
 * Modulo Generador de Etiquetas - Sistema Axones
 * Genera e imprime etiquetas para bobinas de produccion
 */

const Etiquetas = {
    // Etiquetas generadas en la sesion
    etiquetasGeneradas: [],

    /**
     * Inicializa el modulo
     */
    init: async function() {
        console.log('Inicializando modulo Etiquetas');
        this.setDefaultDate();
        this.setupEventListeners();
    },

    /**
     * Establece fecha actual
     */
    setDefaultDate: function() {
        const fechaInput = document.getElementById('fecha');
        if (fechaInput) {
            fechaInput.value = new Date().toISOString().split('T')[0];
        }
    },

    /**
     * Configura event listeners
     */
    setupEventListeners: function() {
        // Auto-actualizar preview cuando cambian los campos principales
        const campos = ['ordenTrabajo', 'cliente', 'producto', 'numBobina', 'pesoBruto', 'pesoNeto'];
        campos.forEach(id => {
            const el = document.getElementById(id);
            if (el) {
                el.addEventListener('input', () => this.generarPreview());
            }
        });
    },

    /**
     * Genera la vista previa de la etiqueta
     */
    generarPreview: function() {
        const datos = this.recopilarDatos();
        if (!datos.ordenTrabajo || !datos.cliente) {
            return; // No generar si faltan datos basicos
        }

        const etiquetaHtml = this.generarEtiquetaHTML(datos);
        document.getElementById('previewContainer').innerHTML = etiquetaHtml;
    },

    /**
     * Recopila los datos del formulario
     */
    recopilarDatos: function() {
        return {
            ordenTrabajo: document.getElementById('ordenTrabajo').value.trim(),
            fecha: document.getElementById('fecha').value,
            cliente: document.getElementById('cliente').value.trim(),
            producto: document.getElementById('producto').value.trim(),
            numBobina: document.getElementById('numBobina').value || '1',
            pesoBruto: document.getElementById('pesoBruto').value || '0',
            pesoNeto: document.getElementById('pesoNeto').value || '0',
            ancho: document.getElementById('ancho').value || '-',
            largo: document.getElementById('largo').value || '-',
            calibre: document.getElementById('calibre').value || '-',
            material: document.getElementById('material').value,
            tratamiento: document.getElementById('tratamiento').value.trim() || '-',
            lote: document.getElementById('lote').value.trim() || '-',
            operador: document.getElementById('operador').value.trim() || '-'
        };
    },

    /**
     * Genera el HTML de una etiqueta
     */
    generarEtiquetaHTML: function(datos, numeroBobina = null) {
        const numBob = numeroBobina || datos.numBobina;
        const codigo = this.generarCodigo(datos.ordenTrabajo, numBob);
        const fechaFormateada = datos.fecha ? new Date(datos.fecha).toLocaleDateString('es-ES') : '-';

        return `
            <div class="etiqueta-bobina">
                <div class="etiqueta-header">
                    <div class="etiqueta-logo">AXONES</div>
                    <div class="small">Empaques Flexibles</div>
                </div>

                <div class="etiqueta-row">
                    <span class="etiqueta-label">ORDEN DE TRABAJO:</span>
                    <span class="etiqueta-value fw-bold">${datos.ordenTrabajo}</span>
                </div>

                <div class="etiqueta-row">
                    <span class="etiqueta-label">CLIENTE:</span>
                    <span class="etiqueta-value">${datos.cliente}</span>
                </div>

                <div class="etiqueta-row">
                    <span class="etiqueta-label">PRODUCTO:</span>
                    <span class="etiqueta-value">${datos.producto}</span>
                </div>

                <div class="etiqueta-row">
                    <span class="etiqueta-label">MATERIAL:</span>
                    <span class="etiqueta-value">${datos.material} ${datos.tratamiento !== '-' ? '- ' + datos.tratamiento : ''}</span>
                </div>

                <div class="etiqueta-row">
                    <span class="etiqueta-label">CALIBRE:</span>
                    <span class="etiqueta-value">${datos.calibre} micras</span>
                </div>

                <div class="etiqueta-row">
                    <span class="etiqueta-label">ANCHO x LARGO:</span>
                    <span class="etiqueta-value">${datos.ancho} mm x ${datos.largo} m</span>
                </div>

                <div class="etiqueta-row" style="background: #f8f9fa;">
                    <span class="etiqueta-label">BOBINA N°:</span>
                    <span class="etiqueta-value fw-bold fs-5">${numBob}</span>
                </div>

                <div class="etiqueta-row">
                    <span class="etiqueta-label">PESO BRUTO:</span>
                    <span class="etiqueta-value">${datos.pesoBruto} Kg</span>
                </div>

                <div class="etiqueta-row" style="background: #e7f3ff;">
                    <span class="etiqueta-label">PESO NETO:</span>
                    <span class="etiqueta-value fw-bold">${datos.pesoNeto} Kg</span>
                </div>

                <div class="etiqueta-row">
                    <span class="etiqueta-label">LOTE:</span>
                    <span class="etiqueta-value">${datos.lote}</span>
                </div>

                <div class="etiqueta-row">
                    <span class="etiqueta-label">FECHA:</span>
                    <span class="etiqueta-value">${fechaFormateada}</span>
                </div>

                <div class="etiqueta-row">
                    <span class="etiqueta-label">OPERADOR:</span>
                    <span class="etiqueta-value">${datos.operador}</span>
                </div>

                <div class="etiqueta-barcode">
                    <div class="barcode-text">${codigo}</div>
                    <div class="small text-muted">Codigo de Identificacion</div>
                </div>
            </div>
        `;
    },

    /**
     * Genera codigo unico para la bobina
     */
    generarCodigo: function(ot, numBobina) {
        const fecha = new Date();
        const year = fecha.getFullYear().toString().slice(-2);
        const month = (fecha.getMonth() + 1).toString().padStart(2, '0');
        const day = fecha.getDate().toString().padStart(2, '0');
        const otClean = ot.replace(/[^a-zA-Z0-9]/g, '').slice(-4).toUpperCase();
        const bobina = numBobina.toString().padStart(3, '0');

        return `${year}${month}${day}-${otClean}-${bobina}`;
    },

    /**
     * Imprime las etiquetas
     */
    imprimir: async function() {
        const form = document.getElementById('formEtiqueta');
        if (!form.checkValidity()) {
            form.reportValidity();
            return;
        }

        const datos = this.recopilarDatos();
        const cantidad = parseInt(document.getElementById('cantidad').value) || 1;
        const numBobinaInicial = parseInt(datos.numBobina) || 1;

        // Generar etiquetas
        let etiquetasHtml = '';
        for (let i = 0; i < cantidad; i++) {
            const numBobina = numBobinaInicial + i;
            etiquetasHtml += `
                <div style="page-break-after: always; padding: 20px;">
                    ${this.generarEtiquetaHTML(datos, numBobina)}
                </div>
            `;

            // Guardar en historial
            this.etiquetasGeneradas.push({
                ...datos,
                numBobina: numBobina,
                codigo: this.generarCodigo(datos.ordenTrabajo, numBobina),
                timestamp: new Date().toISOString()
            });
        }

        // Guardar en Supabase
        await this.guardarHistorial();

        // Mostrar etiquetas generadas
        this.mostrarEtiquetasGeneradas();

        // Abrir ventana de impresion
        const printWindow = window.open('', '_blank');
        printWindow.document.write(`
            <!DOCTYPE html>
            <html>
            <head>
                <title>Etiquetas - ${datos.ordenTrabajo}</title>
                <style>
                    body { font-family: 'Courier New', monospace; margin: 0; padding: 0; }
                    .etiqueta-bobina {
                        width: 100%;
                        max-width: 400px;
                        border: 2px solid #000;
                        padding: 10px;
                        margin: 0 auto;
                        background: white;
                    }
                    .etiqueta-header {
                        border-bottom: 2px solid #000;
                        padding-bottom: 8px;
                        margin-bottom: 8px;
                        text-align: center;
                    }
                    .etiqueta-logo { font-size: 1.5rem; font-weight: bold; }
                    .etiqueta-row {
                        display: flex;
                        justify-content: space-between;
                        border-bottom: 1px solid #ccc;
                        padding: 4px 0;
                    }
                    .etiqueta-row:last-child { border-bottom: none; }
                    .etiqueta-label { font-weight: bold; font-size: 0.75rem; }
                    .etiqueta-value { font-size: 0.85rem; }
                    .etiqueta-barcode {
                        text-align: center;
                        margin-top: 10px;
                        padding: 10px;
                        background: #f8f9fa;
                    }
                    .barcode-text { font-size: 1.2rem; letter-spacing: 3px; font-weight: bold; }
                    .fw-bold { font-weight: bold; }
                    .fs-5 { font-size: 1.1rem; }
                    .small { font-size: 0.8rem; }
                    .text-muted { color: #6c757d; }
                    @media print {
                        @page { margin: 10mm; }
                    }
                </style>
            </head>
            <body>
                ${etiquetasHtml}
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

        Axones.showSuccess(`${cantidad} etiqueta(s) enviada(s) a impresion`);
    },

    /**
     * Guarda el historial en Supabase sync_store
     */
    guardarHistorial: async function() {
        let historial = [];
        try {
            const { data } = await AxonesDB.client.from('sync_store').select('value').eq('key', 'axones_etiquetas').single();
            historial = (data && data.value) ? (typeof data.value === 'string' ? JSON.parse(data.value) : data.value) : [];
        } catch (e) { /* empty */ }
        historial.unshift(...this.etiquetasGeneradas);
        // Mantener solo los ultimos 500 registros
        try {
            await AxonesDB.client.from('sync_store').upsert({ key: 'axones_etiquetas', value: historial.slice(0, 500), updated_at: new Date().toISOString() }, { onConflict: 'key' });
        } catch (e) { console.warn('Etiquetas: Error guardando en Supabase', e); }
    },

    /**
     * Muestra las etiquetas generadas en la sesion
     */
    mostrarEtiquetasGeneradas: function() {
        const container = document.getElementById('etiquetasGeneradas');
        if (!container) return;

        if (this.etiquetasGeneradas.length === 0) {
            container.innerHTML = '<div class="col-12 text-center text-muted py-3"><i class="bi bi-inbox"></i> No hay etiquetas generadas</div>';
            return;
        }

        const ultimas = this.etiquetasGeneradas.slice(-6); // Mostrar ultimas 6
        container.innerHTML = ultimas.map(e => `
            <div class="col-md-4 col-6">
                <div class="card">
                    <div class="card-body p-2 text-center">
                        <div class="small fw-bold">${e.codigo}</div>
                        <div class="small text-muted">Bob #${e.numBobina}</div>
                        <div class="small">${e.pesoNeto} Kg</div>
                    </div>
                </div>
            </div>
        `).join('');
    },

    /**
     * Muestra el historial de etiquetas
     */
    verHistorial: async function() {
        let historial = [];
        try {
            const { data } = await AxonesDB.client.from('sync_store').select('value').eq('key', 'axones_etiquetas').single();
            historial = (data && data.value) ? (typeof data.value === 'string' ? JSON.parse(data.value) : data.value) : [];
        } catch (e) { /* empty */ }

        let html = '<div class="table-responsive"><table class="table table-sm table-striped">';
        html += '<thead><tr><th>Codigo</th><th>OT</th><th>Cliente</th><th>Bobina</th><th>Peso</th><th>Fecha</th></tr></thead><tbody>';

        if (historial.length === 0) {
            html += '<tr><td colspan="6" class="text-center text-muted">No hay registros</td></tr>';
        } else {
            historial.slice(0, 50).forEach(e => {
                html += `<tr>
                    <td class="small">${e.codigo}</td>
                    <td>${e.ordenTrabajo}</td>
                    <td>${e.cliente}</td>
                    <td class="text-center">${e.numBobina}</td>
                    <td>${e.pesoNeto} Kg</td>
                    <td class="small">${new Date(e.timestamp).toLocaleDateString()}</td>
                </tr>`;
            });
        }

        html += '</tbody></table></div>';

        // Mostrar en modal
        const modal = document.createElement('div');
        modal.innerHTML = `
            <div class="modal fade" id="modalHistorialEtiquetas" tabindex="-1">
                <div class="modal-dialog modal-lg">
                    <div class="modal-content">
                        <div class="modal-header">
                            <h5 class="modal-title"><i class="bi bi-clock-history me-2"></i>Historial de Etiquetas</h5>
                            <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                        </div>
                        <div class="modal-body">${html}</div>
                        <div class="modal-footer">
                            <button type="button" class="btn btn-outline-danger btn-sm" onclick="Etiquetas.limpiarHistorial()">
                                <i class="bi bi-trash me-1"></i>Limpiar Historial
                            </button>
                            <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cerrar</button>
                        </div>
                    </div>
                </div>
            </div>
        `;
        document.body.appendChild(modal);
        const bsModal = new bootstrap.Modal(document.getElementById('modalHistorialEtiquetas'));
        bsModal.show();
        document.getElementById('modalHistorialEtiquetas').addEventListener('hidden.bs.modal', () => modal.remove());
    },

    /**
     * Limpia el historial
     */
    limpiarHistorial: async function() {
        if (!confirm('¿Eliminar todo el historial de etiquetas?')) return;
        try {
            await AxonesDB.client.from('sync_store').upsert({ key: 'axones_etiquetas', value: [], updated_at: new Date().toISOString() }, { onConflict: 'key' });
        } catch (e) { console.warn('Etiquetas: Error limpiando historial', e); }
        this.etiquetasGeneradas = [];
        bootstrap.Modal.getInstance(document.getElementById('modalHistorialEtiquetas')).hide();
        Axones.showSuccess('Historial eliminado');
    }
};

// Inicializar
document.addEventListener('DOMContentLoaded', () => {
    if (document.getElementById('formEtiqueta')) {
        Etiquetas.init();
    }
});

// Exportar
if (typeof window !== 'undefined') {
    window.Etiquetas = Etiquetas;
}
