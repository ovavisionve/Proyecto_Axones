/**
 * Modulo Control de Impresion - Sistema Axones
 * Maneja el formulario digital de Control de Produccion de Impresion
 * Incluye conexion con inventario y generacion automatica de alertas
 */

const Impresion = {
    // Cache de datos
    inventarioCache: [],
    clientesCache: [],
    productosCache: [],

    /**
     * Inicializa el modulo
     */
    init: function() {
        console.log('Inicializando modulo Control de Impresion');

        this.setDefaultDate();
        this.cargarDatosIniciales();
        this.setupEventListeners();
        this.setupCalculations();
        this.setupClienteProductoConnection();
    },

    /**
     * Carga datos iniciales (inventario, clientes, productos)
     */
    cargarDatosIniciales: function() {
        // Cargar inventario desde localStorage
        this.inventarioCache = JSON.parse(localStorage.getItem('axones_inventario') || '[]');

        // Cargar clientes desde CONFIG
        this.clientesCache = CONFIG.CLIENTES || [];

        // Cargar historial de produccion para autocompletado
        const produccion = JSON.parse(localStorage.getItem('axones_impresion') || '[]');
        this.productosCache = [...new Set(produccion.map(p => p.producto).filter(Boolean))];
    },

    /**
     * Configura la conexion cliente-producto-inventario
     */
    setupClienteProductoConnection: function() {
        const clienteSelect = document.getElementById('cliente');
        const productoInput = document.getElementById('producto');
        const otInput = document.getElementById('ordenTrabajo');

        if (clienteSelect) {
            // Poblar select de clientes
            this.poblarSelectClientes(clienteSelect);

            // Al cambiar cliente, filtrar productos e inventario
            clienteSelect.addEventListener('change', (e) => {
                this.onClienteChange(e.target.value);
            });
        }

        if (otInput) {
            // Al ingresar OT, buscar datos relacionados
            otInput.addEventListener('blur', (e) => {
                this.buscarDatosOT(e.target.value);
            });
        }

        // Agregar boton para ver inventario disponible
        this.agregarBotonInventario();
    },

    /**
     * Poblar select de clientes
     */
    poblarSelectClientes: function(select) {
        // Mantener la opcion por defecto
        const defaultOption = select.querySelector('option[value=""]');

        // Limpiar opciones existentes excepto la primera
        select.innerHTML = '';
        if (defaultOption) {
            select.appendChild(defaultOption);
        } else {
            const opt = document.createElement('option');
            opt.value = '';
            opt.textContent = 'Seleccione cliente...';
            select.appendChild(opt);
        }

        // Agregar clientes de CONFIG
        this.clientesCache.forEach(cliente => {
            const option = document.createElement('option');
            option.value = cliente;
            option.textContent = cliente;
            select.appendChild(option);
        });
    },

    /**
     * Manejador de cambio de cliente
     */
    onClienteChange: function(cliente) {
        if (!cliente) return;

        // Buscar inventario disponible para este cliente
        const inventarioCliente = this.inventarioCache.filter(item =>
            item.cliente === cliente || !item.cliente
        );

        // Mostrar notificacion si hay inventario asignado
        const asignado = inventarioCliente.filter(i => i.cliente === cliente);
        if (asignado.length > 0) {
            const totalKg = asignado.reduce((sum, i) => sum + (parseFloat(i.kg) || 0), 0);
            this.mostrarInfoInventario(cliente, asignado.length, totalKg);
        }
    },

    /**
     * Busca datos relacionados a una OT
     */
    buscarDatosOT: function(ot) {
        if (!ot) return;

        // Buscar en historial de produccion
        const produccion = JSON.parse(localStorage.getItem('axones_impresion') || '[]');
        const registroAnterior = produccion.find(p => p.ordenTrabajo === ot);

        if (registroAnterior) {
            // Preguntar si desea cargar datos anteriores
            if (confirm(`Se encontro un registro anterior para OT ${ot}. ¿Desea cargar los datos del producto?`)) {
                this.cargarDatosOT(registroAnterior);
            }
        }

        // Buscar consumo de tintas asociado
        const tintas = JSON.parse(localStorage.getItem('axones_tintas') || '[]');
        const tintasOT = tintas.find(t => t.ot === ot);
        if (tintasOT) {
            console.log('Tintas encontradas para OT:', tintasOT);
        }
    },

    /**
     * Carga datos de una OT anterior
     */
    cargarDatosOT: function(registro) {
        // Cargar datos basicos
        const campos = ['producto', 'cliente', 'maquina'];
        campos.forEach(campo => {
            const input = document.getElementById(campo);
            if (input && registro[campo]) {
                input.value = registro[campo];
            }
        });

        // Disparar evento change en cliente para actualizar inventario
        const clienteSelect = document.getElementById('cliente');
        if (clienteSelect && registro.cliente) {
            clienteSelect.value = registro.cliente;
            clienteSelect.dispatchEvent(new Event('change'));
        }
    },

    /**
     * Agrega boton para ver inventario disponible
     */
    agregarBotonInventario: function() {
        const productoGroup = document.getElementById('producto')?.closest('.col-md-3, .col-md-4, .mb-3');
        if (!productoGroup) return;

        // Verificar si ya existe el boton
        if (productoGroup.querySelector('.btn-ver-inventario')) return;

        const btnInventario = document.createElement('button');
        btnInventario.type = 'button';
        btnInventario.className = 'btn btn-outline-info btn-sm btn-ver-inventario mt-1';
        btnInventario.innerHTML = '<i class="bi bi-box-seam me-1"></i>Ver Inventario';
        btnInventario.addEventListener('click', () => this.mostrarModalInventario());

        productoGroup.appendChild(btnInventario);
    },

    /**
     * Muestra modal con inventario disponible
     */
    mostrarModalInventario: function() {
        const cliente = document.getElementById('cliente')?.value;

        // Filtrar inventario
        let inventario = this.inventarioCache;
        if (cliente) {
            inventario = inventario.filter(i => i.cliente === cliente || !i.cliente);
        }

        // Crear modal
        const modalHtml = `
            <div class="modal fade" id="modalInventario" tabindex="-1">
                <div class="modal-dialog modal-lg">
                    <div class="modal-content">
                        <div class="modal-header">
                            <h5 class="modal-title">
                                <i class="bi bi-box-seam me-2"></i>Inventario Disponible
                                ${cliente ? `- ${cliente}` : ''}
                            </h5>
                            <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                        </div>
                        <div class="modal-body">
                            ${this.generarTablaInventario(inventario)}
                        </div>
                        <div class="modal-footer">
                            <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cerrar</button>
                        </div>
                    </div>
                </div>
            </div>
        `;

        // Remover modal anterior si existe
        const modalExistente = document.getElementById('modalInventario');
        if (modalExistente) modalExistente.remove();

        // Insertar y mostrar modal
        document.body.insertAdjacentHTML('beforeend', modalHtml);
        const modal = new bootstrap.Modal(document.getElementById('modalInventario'));
        modal.show();
    },

    /**
     * Genera tabla HTML de inventario
     */
    generarTablaInventario: function(inventario) {
        if (inventario.length === 0) {
            return '<div class="alert alert-info">No hay inventario disponible</div>';
        }

        let html = `
            <div class="table-responsive">
                <table class="table table-sm table-hover">
                    <thead class="table-light">
                        <tr>
                            <th>Material</th>
                            <th>Micras</th>
                            <th>Ancho</th>
                            <th class="text-end">Kg</th>
                            <th>Producto</th>
                            <th>Cliente</th>
                        </tr>
                    </thead>
                    <tbody>
        `;

        inventario.forEach(item => {
            const stockClass = parseFloat(item.kg) < 100 ? 'table-warning' : '';
            html += `
                <tr class="${stockClass}">
                    <td><strong>${item.material || '-'}</strong></td>
                    <td>${item.micras || '-'}</td>
                    <td>${item.ancho || '-'}</td>
                    <td class="text-end">${parseFloat(item.kg).toLocaleString('es-VE')}</td>
                    <td>${item.producto || '-'}</td>
                    <td>${item.cliente || '<em>General</em>'}</td>
                </tr>
            `;
        });

        html += '</tbody></table></div>';

        // Agregar total
        const totalKg = inventario.reduce((sum, i) => sum + (parseFloat(i.kg) || 0), 0);
        html += `<div class="text-end mt-2"><strong>Total: ${totalKg.toLocaleString('es-VE')} Kg</strong></div>`;

        return html;
    },

    /**
     * Muestra informacion de inventario asignado
     */
    mostrarInfoInventario: function(cliente, items, totalKg) {
        // Crear o actualizar badge de inventario
        let badge = document.getElementById('badgeInventario');
        if (!badge) {
            badge = document.createElement('div');
            badge.id = 'badgeInventario';
            badge.className = 'alert alert-info py-2 mt-2';

            const clienteSelect = document.getElementById('cliente');
            if (clienteSelect) {
                clienteSelect.closest('.col-md-3, .col-md-4, .mb-3')?.appendChild(badge);
            }
        }

        badge.innerHTML = `
            <small>
                <i class="bi bi-info-circle me-1"></i>
                <strong>${items}</strong> items en inventario
                (<strong>${totalKg.toLocaleString('es-VE')} Kg</strong>)
            </small>
        `;
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
        const scrapRefile = parseFloat(document.getElementById('scrapRefile').value) || 0;
        const scrapImpreso = parseFloat(document.getElementById('scrapImpreso').value) || 0;
        const totalScrap = scrapRefile + scrapImpreso;
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

        // Mostrar indicador de carga
        const btnGuardar = document.getElementById('btnGuardar');
        const btnText = btnGuardar ? btnGuardar.innerHTML : '';
        if (btnGuardar) {
            btnGuardar.disabled = true;
            btnGuardar.innerHTML = '<span class="spinner-border spinner-border-sm me-1"></span>Guardando...';
        }

        try {
            // Usar el API helper que maneja CORS y fallbacks
            const result = await AxonesAPI.save('saveImpresion', datos, 'produccion');

            if (result.success) {
                if (result.mode === 'localStorage') {
                    Axones.showSuccess('Registro guardado localmente');
                } else {
                    Axones.showSuccess('Registro guardado en Google Sheets');
                }

                // Verificar alertas
                this.verificarAlertas(datos);

                // Limpiar formulario
                this.limpiar();
            } else {
                throw new Error(result.error || 'Error desconocido');
            }
        } catch (error) {
            console.error('Error guardando registro:', error);
            // Guardar localmente como fallback
            this.guardarLocal(datos);
            Axones.showWarning('Guardado localmente: ' + error.message);
        } finally {
            // Restaurar boton
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
            cliente: document.getElementById('cliente')?.value || '',
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
            scrapRefile: parseFloat(document.getElementById('scrapRefile').value) || 0,
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
        // Guardar en produccion
        const registros = JSON.parse(localStorage.getItem('axones_produccion') || '[]');
        registros.unshift(datos);
        localStorage.setItem('axones_produccion', JSON.stringify(registros));

        // Tambien guardar en key especifica de impresion
        const impresion = JSON.parse(localStorage.getItem('axones_impresion') || '[]');
        impresion.unshift(datos);
        localStorage.setItem('axones_impresion', JSON.stringify(impresion));
    },

    /**
     * Verifica y genera alertas segun los datos
     */
    verificarAlertas: function(datos) {
        const umbral = CONFIG.UMBRALES_REFIL.default;
        const porcentajeRefil = parseFloat(datos.porcentajeRefil) || 0;

        // Alerta por Refil alto
        if (porcentajeRefil > umbral.advertencia) {
            this.generarAlerta(datos);
        }

        // Alerta por tiempo muerto excesivo
        this.verificarTiempoMuerto(datos);

        // Actualizar contadores de produccion si HomeModule esta disponible
        if (typeof HomeModule !== 'undefined') {
            HomeModule.cargarKPIs();
            HomeModule.cargarProduccionHoy();
        }
    },

    /**
     * Genera una alerta por refil excedido
     */
    generarAlerta: function(datos) {
        const porcentaje = parseFloat(datos.porcentajeRefil) || 0;
        const umbral = CONFIG.UMBRALES_REFIL.default;

        // Determinar tipo y nivel de alerta
        const esCritico = porcentaje > umbral.maximo;
        const tipo = esCritico ? 'refil_critico' : 'refil_alto';
        const nivel = esCritico ? 'critical' : 'warning';

        const alerta = {
            id: Date.now(),
            fecha: new Date().toISOString(),
            tipo: tipo,
            nivel: nivel,
            maquina: datos.maquina,
            ot: datos.ordenTrabajo,
            mensaje: `Refil ${porcentaje.toFixed(1)}% en OT ${datos.ordenTrabajo} - ${datos.maquina} - Producto: ${datos.producto}`,
            estado: 'pendiente',
            datos: {
                porcentajeRefil: porcentaje,
                umbral: umbral.maximo,
                producto: datos.producto,
                cliente: datos.cliente,
                operador: datos.operador
            }
        };

        // Guardar alerta
        const alertas = JSON.parse(localStorage.getItem('axones_alertas') || '[]');
        alertas.unshift(alerta);
        localStorage.setItem('axones_alertas', JSON.stringify(alertas));

        // Actualizar badge de alertas si existe
        this.actualizarBadgeAlertas();

        // Mostrar notificacion visual
        this.mostrarNotificacionAlerta(alerta);
    },

    /**
     * Actualiza el badge de alertas en el navbar
     */
    actualizarBadgeAlertas: function() {
        const badge = document.getElementById('alertasBadge');
        if (!badge) return;

        const alertas = JSON.parse(localStorage.getItem('axones_alertas') || '[]');
        const pendientes = alertas.filter(a => a.estado === 'pendiente' || a.estado === 'activa').length;

        if (pendientes > 0) {
            badge.textContent = pendientes;
            badge.style.display = 'inline-block';
        } else {
            badge.style.display = 'none';
        }
    },

    /**
     * Muestra notificacion visual de alerta
     */
    mostrarNotificacionAlerta: function(alerta) {
        // Crear toast container si no existe
        let toastContainer = document.querySelector('.toast-container');
        if (!toastContainer) {
            toastContainer = document.createElement('div');
            toastContainer.className = 'toast-container position-fixed top-0 end-0 p-3';
            toastContainer.style.zIndex = '1100';
            document.body.appendChild(toastContainer);
        }

        const bgClass = alerta.nivel === 'critical' ? 'bg-danger' : 'bg-warning';
        const textClass = alerta.nivel === 'critical' ? 'text-white' : 'text-dark';

        const toastHtml = `
            <div class="toast align-items-center ${bgClass} ${textClass} border-0" role="alert">
                <div class="d-flex">
                    <div class="toast-body">
                        <i class="bi bi-exclamation-triangle me-2"></i>
                        <strong>ALERTA ${alerta.nivel === 'critical' ? 'CRITICA' : ''}:</strong>
                        Refil ${alerta.datos.porcentajeRefil.toFixed(1)}% excedido
                        <br>
                        <small>OT: ${alerta.ot} - ${alerta.maquina}</small>
                    </div>
                    <button type="button" class="btn-close ${alerta.nivel === 'critical' ? 'btn-close-white' : ''} me-2 m-auto" data-bs-dismiss="toast"></button>
                </div>
            </div>
        `;

        toastContainer.insertAdjacentHTML('beforeend', toastHtml);
        const toastEl = toastContainer.lastElementChild;
        const toast = new bootstrap.Toast(toastEl, { autohide: true, delay: 8000 });
        toast.show();

        toastEl.addEventListener('hidden.bs.toast', () => toastEl.remove());
    },

    /**
     * Verifica tiempo muerto excesivo
     */
    verificarTiempoMuerto: function(datos) {
        const tiempoMuerto = parseInt(datos.tiempoMuerto) || 0;
        const tiempoEfectivo = parseInt(datos.tiempoEfectivo) || 0;

        // Si tiempo muerto es mayor al 20% del tiempo efectivo, generar alerta
        if (tiempoEfectivo > 0 && tiempoMuerto > 0) {
            const porcentajeTiempoMuerto = (tiempoMuerto / (tiempoMuerto + tiempoEfectivo)) * 100;
            if (porcentajeTiempoMuerto > 20) {
                const alerta = {
                    id: Date.now() + 1,
                    fecha: new Date().toISOString(),
                    tipo: 'tiempo_muerto_alto',
                    nivel: 'info',
                    maquina: datos.maquina,
                    ot: datos.ordenTrabajo,
                    mensaje: `Tiempo muerto ${porcentajeTiempoMuerto.toFixed(0)}% en OT ${datos.ordenTrabajo}`,
                    estado: 'pendiente',
                    datos: {
                        tiempoMuerto: tiempoMuerto,
                        tiempoEfectivo: tiempoEfectivo,
                        porcentaje: porcentajeTiempoMuerto
                    }
                };

                const alertas = JSON.parse(localStorage.getItem('axones_alertas') || '[]');
                alertas.unshift(alerta);
                localStorage.setItem('axones_alertas', JSON.stringify(alertas));
            }
        }
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
