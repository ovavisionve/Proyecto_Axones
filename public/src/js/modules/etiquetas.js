/**
 * Modulo Generador de Etiquetas - Sistema Axones
 * Genera e imprime etiquetas de produccion vinculadas a OT y despachos
 * Formato basado en etiqueta fisica real de Inversiones Axones
 */

const Etiquetas = {
    etiquetasGeneradas: [],
    ordenes: [],
    ordenSeleccionada: null,

    /**
     * Inicializa el modulo
     */
    init: async function() {
        console.log('Inicializando modulo Etiquetas');
        await AxonesDB.init();
        await this.cargarOrdenes();
        this.setupEventListeners();
        this.setDefaults();
    },

    /**
     * Carga ordenes desde Supabase
     */
    cargarOrdenes: async function() {
        if (AxonesDB.isReady()) {
            this.ordenes = await AxonesDB.ordenesHelper.cargar();
        } else {
            try {
                this.ordenes = JSON.parse(localStorage.getItem('axones_ordenes_trabajo') || '[]');
            } catch (e) { this.ordenes = []; }
        }
        this.poblarSelectorOT();
    },

    /**
     * Pobla el dropdown de ordenes de trabajo
     */
    poblarSelectorOT: function() {
        const select = document.getElementById('selectorOT');
        if (!select) return;

        select.innerHTML = '<option value="">-- Seleccionar OT --</option>';
        this.ordenes
            .sort((a, b) => (b.numeroOrden || '').localeCompare(a.numeroOrden || ''))
            .forEach(orden => {
                const option = document.createElement('option');
                option.value = orden.id || orden.numeroOrden;
                const estado = orden.estadoOrden || 'pendiente';
                option.textContent = `${orden.numeroOrden} - ${orden.cliente || 'Sin cliente'} - ${orden.producto || 'Sin producto'} [${estado}]`;
                select.appendChild(option);
            });
    },

    /**
     * Establece valores por defecto
     */
    setDefaults: function() {
        const fechaInput = document.getElementById('etFecha');
        if (fechaInput) {
            fechaInput.value = new Date().toISOString().split('T')[0];
        }
        const horaInput = document.getElementById('etHora');
        if (horaInput) {
            const now = new Date();
            horaInput.value = now.getHours().toString().padStart(2, '0') + ':' + now.getMinutes().toString().padStart(2, '0');
        }
        // Operador desde sesion
        const operadorInput = document.getElementById('etOperador');
        if (operadorInput) {
            try {
                const session = JSON.parse(localStorage.getItem('axones_session') || '{}');
                operadorInput.value = session.nombre || '';
            } catch (e) { /* ignorar */ }
        }
    },

    /**
     * Configura event listeners
     */
    setupEventListeners: function() {
        // Selector OT
        const selectorOT = document.getElementById('selectorOT');
        if (selectorOT) {
            selectorOT.addEventListener('change', () => this.onOTSeleccionada());
        }

        // Selector despacho
        const selectorDespacho = document.getElementById('selectorDespacho');
        if (selectorDespacho) {
            selectorDespacho.addEventListener('change', () => this.onDespachoSeleccionado());
        }

        // Calcular Tara = Bruto - Neto
        const brutoInput = document.getElementById('etPesoBruto');
        const netoInput = document.getElementById('etPesoNeto');
        if (brutoInput) brutoInput.addEventListener('input', () => this.calcularTara());
        if (netoInput) netoInput.addEventListener('input', () => this.calcularTara());

        // Auto-preview en campos clave
        ['etPesoBruto', 'etPesoNeto', 'etPaleta', 'etBobinas', 'etMetros'].forEach(id => {
            const el = document.getElementById(id);
            if (el) el.addEventListener('input', () => this.generarPreview());
        });
    },

    /**
     * Al seleccionar una OT, auto-llenar todos los campos
     */
    onOTSeleccionada: function() {
        const select = document.getElementById('selectorOT');
        const val = select?.value;

        if (!val) {
            this.ordenSeleccionada = null;
            this.limpiarCamposOT();
            return;
        }

        const orden = this.ordenes.find(o => (o.id || o.numeroOrden) === val);
        if (!orden) return;

        this.ordenSeleccionada = orden;

        // Auto-llenar campos
        this.setCampo('etOT', orden.numeroOrden || '');
        this.setCampo('etCliente', orden.cliente || '');
        this.setCampo('etProducto', orden.producto || '');
        this.setCampo('etMaquina', orden.maquina || '');
        this.setCampo('etMaterial', `${orden.tipoMaterial || orden.estructuraMaterial || ''} ${orden.micrasMaterial || ''}µ`);

        // Proceso basado en la maquina
        const maquina = (orden.maquina || '').toUpperCase();
        let proceso = 'PRODUCCION';
        if (maquina.includes('COMEXI')) proceso = 'BOB IMP';
        else if (maquina.includes('NEXUS')) proceso = 'BOB LAM';
        // Si tiene cortadora asignada
        if (maquina.includes('CORTADORA') || maquina.includes('NOVOGRAF') || maquina.includes('PERMACO') || maquina.includes('CHINA')) proceso = 'BOB CORT';

        // Si es laminado x corte
        const estructura = (orden.estructuraMaterial || '').toUpperCase();
        if (estructura.includes('LAMINADO') || (orden.fichaTipoMat2 && orden.fichaTipoMat1)) {
            proceso = 'BOB LAM X CORT';
        }

        this.setCampo('etProceso', proceso);

        // Cargar despachos asociados
        this.cargarDespachos(orden);

        // Generar preview
        this.generarPreview();
    },

    /**
     * Carga despachos parciales de la OT seleccionada
     */
    cargarDespachos: function(orden) {
        const select = document.getElementById('selectorDespacho');
        if (!select) return;

        select.innerHTML = '<option value="">Sin despacho (etiqueta general)</option>';

        // Buscar despachos en control_tiempo
        try {
            const registros = JSON.parse(localStorage.getItem('axones_control_tiempo') || '{}');
            const fases = ['impresion', 'laminacion', 'corte'];
            let despachoIndex = 0;

            fases.forEach(fase => {
                const key = `${orden.id || orden.numeroOrden}_${fase}`;
                const registro = registros[key];
                if (registro && registro.despachos && registro.despachos.length > 0) {
                    registro.despachos.forEach((d, i) => {
                        despachoIndex++;
                        const option = document.createElement('option');
                        option.value = JSON.stringify(d);
                        const fechaDesp = d.fecha ? new Date(d.fecha).toLocaleDateString('es-VE') : '';
                        option.textContent = `Despacho #${despachoIndex} - ${d.kg}Kg - NE: ${d.notaEntrega || 'S/N'} - ${fechaDesp}`;
                        select.appendChild(option);
                    });
                }
            });
        } catch (e) {
            console.warn('[Etiquetas] Error cargando despachos:', e);
        }
    },

    /**
     * Al seleccionar un despacho, llenar datos de nota de entrega
     */
    onDespachoSeleccionado: function() {
        const select = document.getElementById('selectorDespacho');
        if (!select?.value) {
            this.setCampo('etNotaEntrega', '');
            return;
        }

        try {
            const despacho = JSON.parse(select.value);
            this.setCampo('etNotaEntrega', despacho.notaEntrega || '');
            if (despacho.kg) {
                this.setCampo('etPesoNeto', despacho.kg);
            }
        } catch (e) { /* ignorar */ }

        this.generarPreview();
    },

    /**
     * Calcula Tara = Bruto - Neto
     */
    calcularTara: function() {
        const bruto = parseFloat(document.getElementById('etPesoBruto')?.value) || 0;
        const neto = parseFloat(document.getElementById('etPesoNeto')?.value) || 0;
        const tara = bruto > 0 && neto > 0 ? (bruto - neto) : 0;
        this.setCampo('etTara', tara > 0 ? tara.toFixed(1) : '');
        this.generarPreview();
    },

    /**
     * Recopila datos del formulario
     */
    recopilarDatos: function() {
        return {
            proceso: document.getElementById('etProceso')?.value?.trim() || '',
            ot: document.getElementById('etOT')?.value?.trim() || '',
            paleta: document.getElementById('etPaleta')?.value || '1',
            cliente: document.getElementById('etCliente')?.value?.trim() || '',
            producto: document.getElementById('etProducto')?.value?.trim() || '',
            material: document.getElementById('etMaterial')?.value?.trim() || '',
            maquina: document.getElementById('etMaquina')?.value?.trim() || '',
            operador: document.getElementById('etOperador')?.value?.trim() || '',
            fecha: document.getElementById('etFecha')?.value || '',
            hora: document.getElementById('etHora')?.value || '',
            tara: document.getElementById('etTara')?.value || '0',
            pesoNeto: document.getElementById('etPesoNeto')?.value || '0',
            pesoBruto: document.getElementById('etPesoBruto')?.value || '0',
            bobinas: document.getElementById('etBobinas')?.value || '0',
            metros: document.getElementById('etMetros')?.value || '0',
            notaEntrega: document.getElementById('etNotaEntrega')?.value?.trim() || ''
        };
    },

    /**
     * Genera vista previa
     */
    generarPreview: function() {
        const datos = this.recopilarDatos();
        const container = document.getElementById('previewContainer');
        if (!container) return;

        if (!datos.ot) {
            container.innerHTML = '<div class="text-center text-muted"><i class="bi bi-tag fs-1"></i><p class="mt-2">Seleccione una OT para generar la etiqueta</p></div>';
            return;
        }

        container.innerHTML = this.generarEtiquetaHTML(datos);
    },

    /**
     * Genera HTML de la etiqueta - formato real de Inversiones Axones
     */
    generarEtiquetaHTML: function(datos) {
        const fechaFormateada = datos.fecha ? new Date(datos.fecha + 'T12:00:00').toLocaleDateString('es-VE') : '';
        const codigo = this.generarCodigo(datos.ot, datos.paleta);

        return `
            <div class="etiqueta-axones">
                <div class="et-header">
                    <div class="et-empresa">Inversiones Axones</div>
                    <div class="et-subtitulo">Empaques Flexibles Plasticos</div>
                </div>

                <div class="et-body">
                    <div class="et-row-doble">
                        <div class="et-celda">
                            <span class="et-lbl">Proceso:</span>
                            <span class="et-val">${datos.proceso}</span>
                        </div>
                        <div class="et-celda et-paleta">
                            <span class="et-lbl">Paleta</span>
                            <span class="et-val-grande">#${String(datos.paleta).padStart(2, '0')}</span>
                        </div>
                    </div>

                    <div class="et-row">
                        <span class="et-lbl">OT:</span>
                        <span class="et-val fw-bold">${datos.ot}</span>
                    </div>

                    <div class="et-row">
                        <span class="et-lbl">Producto:</span>
                        <span class="et-val">${datos.producto}</span>
                    </div>

                    <div class="et-row-doble">
                        <div class="et-celda">
                            <span class="et-lbl">Tara:</span>
                            <span class="et-val">${datos.tara} Kg</span>
                        </div>
                        <div class="et-celda">
                            <span class="et-lbl">Fecha:</span>
                            <span class="et-val">${fechaFormateada}</span>
                        </div>
                    </div>

                    <div class="et-row-doble">
                        <div class="et-celda">
                            <span class="et-lbl">P. Neto:</span>
                            <span class="et-val et-peso-neto">${datos.pesoNeto} Kg</span>
                        </div>
                        <div class="et-celda">
                            <span class="et-lbl">Bobinas:</span>
                            <span class="et-val">${datos.bobinas}</span>
                        </div>
                    </div>

                    <div class="et-row-doble">
                        <div class="et-celda">
                            <span class="et-lbl">P. Bruto:</span>
                            <span class="et-val">${datos.pesoBruto} Kg</span>
                        </div>
                        <div class="et-celda">
                            <span class="et-lbl">Hora:</span>
                            <span class="et-val">${datos.hora}</span>
                        </div>
                    </div>

                    <div class="et-row-doble">
                        <div class="et-celda">
                            <span class="et-lbl">Nombre del Operador:</span>
                            <span class="et-val">${datos.operador}</span>
                        </div>
                        <div class="et-celda">
                            <span class="et-lbl">Maquina:</span>
                            <span class="et-val">${datos.maquina}</span>
                        </div>
                    </div>

                    <div class="et-row-doble">
                        <div class="et-celda">
                            <span class="et-lbl">Mts:</span>
                            <span class="et-val">${datos.metros}</span>
                        </div>
                        <div class="et-celda">
                            <span class="et-lbl">Material:</span>
                            <span class="et-val">${datos.material}</span>
                        </div>
                    </div>

                    ${datos.notaEntrega ? `
                    <div class="et-row et-nota">
                        <span class="et-lbl">Nota de Entrega:</span>
                        <span class="et-val fw-bold">${datos.notaEntrega}</span>
                    </div>
                    ` : ''}
                </div>

                <div class="et-footer">
                    <div class="et-codigo">${codigo}</div>
                </div>
            </div>
        `;
    },

    /**
     * Genera codigo unico
     */
    generarCodigo: function(ot, paleta) {
        const fecha = new Date();
        const yy = fecha.getFullYear().toString().slice(-2);
        const mm = (fecha.getMonth() + 1).toString().padStart(2, '0');
        const dd = fecha.getDate().toString().padStart(2, '0');
        const otClean = (ot || '').replace(/[^a-zA-Z0-9]/g, '').slice(-6).toUpperCase();
        const pal = String(paleta).padStart(2, '0');
        return `${yy}${mm}${dd}-${otClean}-P${pal}`;
    },

    /**
     * Imprime etiquetas
     */
    imprimir: async function() {
        const datos = this.recopilarDatos();

        if (!datos.ot) {
            Axones.showError('Seleccione una Orden de Trabajo');
            return;
        }

        const cantidad = parseInt(document.getElementById('etCantidad')?.value) || 1;
        const paletaInicial = parseInt(datos.paleta) || 1;

        let etiquetasHtml = '';
        for (let i = 0; i < cantidad; i++) {
            const datosEtiqueta = { ...datos, paleta: paletaInicial + i };
            etiquetasHtml += `
                <div style="page-break-after: always; padding: 10px; display: flex; justify-content: center;">
                    ${this.generarEtiquetaHTML(datosEtiqueta)}
                </div>
            `;

            this.etiquetasGeneradas.push({
                ...datosEtiqueta,
                codigo: this.generarCodigo(datos.ot, paletaInicial + i),
                timestamp: new Date().toISOString()
            });
        }

        // Guardar historial
        await this.guardarHistorial();
        this.mostrarEtiquetasGeneradas();

        // Abrir ventana de impresion
        const printWindow = window.open('', '_blank');
        printWindow.document.write(`
            <!DOCTYPE html>
            <html>
            <head>
                <title>Etiqueta - ${datos.ot} - Paleta ${paletaInicial}</title>
                <style>
                    ${this.getEstilosImpresion()}
                </style>
            </head>
            <body>
                ${etiquetasHtml}
                <script>
                    window.onload = function() {
                        window.print();
                        window.onafterprint = function() { window.close(); };
                    };
                <\/script>
            </body>
            </html>
        `);
        printWindow.document.close();

        Axones.showSuccess(`${cantidad} etiqueta(s) enviada(s) a impresion`);
    },

    /**
     * Estilos para la ventana de impresion
     */
    getEstilosImpresion: function() {
        return `
            body { font-family: Arial, Helvetica, sans-serif; margin: 0; padding: 0; }
            .etiqueta-axones {
                width: 100%; max-width: 420px; border: 2px solid #000;
                margin: 0 auto; background: white; font-size: 12px;
            }
            .et-header {
                background: #000; color: #fff; text-align: center;
                padding: 6px 10px; border-bottom: 2px solid #000;
            }
            .et-empresa { font-size: 16px; font-weight: bold; letter-spacing: 1px; }
            .et-subtitulo { font-size: 10px; }
            .et-body { padding: 4px 8px; }
            .et-row {
                display: flex; justify-content: space-between; align-items: center;
                border-bottom: 1px solid #999; padding: 3px 0; min-height: 22px;
            }
            .et-row-doble {
                display: flex; border-bottom: 1px solid #999;
            }
            .et-celda {
                flex: 1; display: flex; align-items: center; gap: 4px;
                padding: 3px 4px; min-height: 22px;
            }
            .et-celda:first-child { border-right: 1px solid #999; }
            .et-paleta {
                flex: 0 0 100px; justify-content: center; flex-direction: column;
                align-items: center; background: #f0f0f0;
            }
            .et-lbl { font-weight: bold; font-size: 10px; white-space: nowrap; }
            .et-val { font-size: 12px; }
            .et-val-grande { font-size: 20px; font-weight: bold; }
            .et-peso-neto { font-weight: bold; font-size: 14px; }
            .et-nota { background: #fffde7; }
            .et-footer {
                text-align: center; padding: 4px;
                border-top: 2px solid #000; font-size: 11px;
                letter-spacing: 2px; font-weight: bold;
            }
            .fw-bold { font-weight: bold; }
            @media print { @page { margin: 5mm; } }
        `;
    },

    /**
     * Guarda historial en Supabase
     */
    guardarHistorial: async function() {
        let historial = [];
        try {
            const { data } = await AxonesDB.client.from('sync_store').select('value').eq('key', 'axones_etiquetas').single();
            historial = (data && data.value) ? (typeof data.value === 'string' ? JSON.parse(data.value) : data.value) : [];
        } catch (e) { /* empty */ }
        historial.unshift(...this.etiquetasGeneradas);
        try {
            await AxonesDB.client.from('sync_store').upsert({ key: 'axones_etiquetas', value: historial.slice(0, 500), updated_at: new Date().toISOString() }, { onConflict: 'key' });
        } catch (e) { console.warn('[Etiquetas] Error guardando historial:', e); }
    },

    /**
     * Muestra etiquetas generadas en la sesion
     */
    mostrarEtiquetasGeneradas: function() {
        const container = document.getElementById('etiquetasGeneradas');
        if (!container) return;

        if (this.etiquetasGeneradas.length === 0) {
            container.innerHTML = '<div class="col-12 text-center text-muted py-3"><i class="bi bi-inbox"></i> No hay etiquetas generadas</div>';
            return;
        }

        const ultimas = this.etiquetasGeneradas.slice(-6);
        container.innerHTML = ultimas.map(e => `
            <div class="col-md-4 col-6">
                <div class="card">
                    <div class="card-body p-2 text-center">
                        <div class="small fw-bold">${e.codigo}</div>
                        <div class="small text-muted">Paleta #${e.paleta}</div>
                        <div class="small">${e.pesoNeto} Kg</div>
                        <div class="small text-muted">${e.ot}</div>
                    </div>
                </div>
            </div>
        `).join('');
    },

    /**
     * Historial completo en modal
     */
    verHistorial: async function() {
        let historial = [];
        try {
            const { data } = await AxonesDB.client.from('sync_store').select('value').eq('key', 'axones_etiquetas').single();
            historial = (data && data.value) ? (typeof data.value === 'string' ? JSON.parse(data.value) : data.value) : [];
        } catch (e) { /* empty */ }

        let html = '<div class="table-responsive"><table class="table table-sm table-striped">';
        html += '<thead><tr><th>Codigo</th><th>OT</th><th>Cliente</th><th>Paleta</th><th>P.Neto</th><th>NE</th><th>Fecha</th></tr></thead><tbody>';

        if (historial.length === 0) {
            html += '<tr><td colspan="7" class="text-center text-muted">No hay registros</td></tr>';
        } else {
            historial.slice(0, 50).forEach(e => {
                html += `<tr>
                    <td class="small">${e.codigo || ''}</td>
                    <td>${e.ot || e.ordenTrabajo || ''}</td>
                    <td>${e.cliente || ''}</td>
                    <td class="text-center">${e.paleta || e.numBobina || ''}</td>
                    <td>${e.pesoNeto || ''} Kg</td>
                    <td class="small">${e.notaEntrega || '-'}</td>
                    <td class="small">${e.timestamp ? new Date(e.timestamp).toLocaleDateString() : ''}</td>
                </tr>`;
            });
        }

        html += '</tbody></table></div>';

        const existing = document.getElementById('modalHistorialEtiquetas');
        if (existing) existing.remove();

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
     * Limpia historial
     */
    limpiarHistorial: async function() {
        if (!confirm('Eliminar todo el historial de etiquetas?')) return;
        try {
            await AxonesDB.client.from('sync_store').upsert({ key: 'axones_etiquetas', value: [], updated_at: new Date().toISOString() }, { onConflict: 'key' });
        } catch (e) { console.warn('[Etiquetas] Error limpiando historial:', e); }
        this.etiquetasGeneradas = [];
        const modalEl = document.getElementById('modalHistorialEtiquetas');
        if (modalEl) bootstrap.Modal.getInstance(modalEl)?.hide();
        Axones.showSuccess('Historial eliminado');
    },

    /**
     * Utilidades
     */
    setCampo: function(id, valor) {
        const el = document.getElementById(id);
        if (el) el.value = valor;
    },

    limpiarCamposOT: function() {
        ['etOT', 'etCliente', 'etProducto', 'etMaquina', 'etMaterial', 'etProceso', 'etNotaEntrega'].forEach(id => {
            this.setCampo(id, '');
        });
        const select = document.getElementById('selectorDespacho');
        if (select) select.innerHTML = '<option value="">Sin despacho (etiqueta general)</option>';
        this.generarPreview();
    }
};

// Inicializar
document.addEventListener('DOMContentLoaded', () => {
    if (document.getElementById('formEtiqueta')) {
        Etiquetas.init();
    }
});

if (typeof window !== 'undefined') {
    window.Etiquetas = Etiquetas;
}
