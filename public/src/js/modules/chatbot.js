/**
 * Modulo Chatbot - Sistema Axones
 * Chatbot con IA para consultas de cuentas por cobrar
 */

const Chatbot = {
    // Historial de conversacion
    conversationHistory: [],

    // Datos de cuentas por cobrar (se cargan de Sheets)
    cuentasPorCobrar: [],

    // Datos de produccion (se cargan de localStorage/API)
    datosProduccion: [],

    /**
     * Inicializa el modulo de chatbot
     * Solo accesible para administradores
     */
    init: function() {
        console.log('Inicializando modulo Chatbot');

        // Verificar que el usuario sea administrador
        if (!this.verificarAccesoAdmin()) {
            this.mostrarAccesoDenegado();
            return;
        }

        this.setupForm();
        this.setupQuickQueries();
        this.loadCuentasPorCobrar();
        this.loadDatosProduccion();
        this.loadResumenCartera();
    },

    /**
     * Verifica si el usuario actual es administrador
     */
    verificarAccesoAdmin: function() {
        // Verificar si Auth existe y hay usuario logueado
        if (typeof Auth !== 'undefined' && Auth.currentUser) {
            return Auth.currentUser.rol === 'administrador';
        }

        // Si no hay Auth, verificar session storage
        const session = JSON.parse(sessionStorage.getItem('axones_session') || '{}');
        if (session && session.user) {
            return session.user.rol === 'administrador';
        }

        return false;
    },

    /**
     * Muestra mensaje de acceso denegado
     */
    mostrarAccesoDenegado: function() {
        const mainContent = document.querySelector('main.container-fluid');
        if (mainContent) {
            mainContent.innerHTML = `
                <div class="row justify-content-center mt-5">
                    <div class="col-md-6">
                        <div class="card border-warning">
                            <div class="card-body text-center py-5">
                                <i class="bi bi-shield-lock text-warning" style="font-size: 4rem;"></i>
                                <h3 class="mt-3">Acceso Restringido</h3>
                                <p class="text-muted mb-4">
                                    El chatbot de IA solo esta disponible para administradores.
                                </p>
                                <a href="index.html" class="btn btn-primary">
                                    <i class="bi bi-house me-2"></i>Volver al Inicio
                                </a>
                            </div>
                        </div>
                    </div>
                </div>
            `;
        }
    },

    /**
     * Carga datos de produccion desde localStorage y API
     */
    loadDatosProduccion: async function() {
        // Cargar de localStorage
        this.datosProduccion = JSON.parse(localStorage.getItem('axones_produccion') || '[]');

        // Intentar cargar de API si AxonesAPI esta disponible
        try {
            if (typeof AxonesAPI !== 'undefined') {
                const response = await AxonesAPI.getProduccion({});
                if (response.success && response.data && response.data.length > 0) {
                    this.datosProduccion = response.data;
                    console.log('Chatbot: cargados', this.datosProduccion.length, 'registros de produccion');
                }
            }
        } catch (e) {
            console.warn('Chatbot: usando datos locales de produccion');
        }
    },

    /**
     * Configura el formulario del chat
     */
    setupForm: function() {
        const form = document.getElementById('formChat');
        if (!form) return;

        form.addEventListener('submit', (e) => {
            e.preventDefault();
            this.enviarMensaje();
        });

        // Boton limpiar chat
        const btnLimpiar = document.getElementById('btnLimpiarChat');
        if (btnLimpiar) {
            btnLimpiar.addEventListener('click', () => this.limpiarChat());
        }

        // Focus en el input
        document.getElementById('chatInput').focus();
    },

    /**
     * Configura los botones de consultas rapidas
     */
    setupQuickQueries: function() {
        document.querySelectorAll('.quick-query').forEach(btn => {
            btn.addEventListener('click', () => {
                const query = btn.dataset.query;
                document.getElementById('chatInput').value = query;
                this.enviarMensaje();
            });
        });
    },

    /**
     * Carga las cuentas por cobrar
     */
    loadCuentasPorCobrar: async function() {
        // En desarrollo, usar datos de ejemplo
        this.cuentasPorCobrar = [
            {
                cliente: 'Rosa Azul C.A.',
                clienteId: 'rosa_azul',
                facturas: [
                    { numero: 'FAC-2024-001', monto: 15000, fecha: '2025-11-15', vencimiento: '2025-12-15', estado: 'vencida', diasMora: 46 },
                    { numero: 'FAC-2024-015', monto: 8500, fecha: '2025-12-20', vencimiento: '2026-01-20', estado: 'vencida', diasMora: 10 },
                    { numero: 'FAC-2025-003', monto: 12000, fecha: '2026-01-10', vencimiento: '2026-02-10', estado: 'pendiente', diasMora: 0 },
                ],
                totalDeuda: 35500,
                totalVencido: 23500,
            },
            {
                cliente: 'Alimentos del Sur',
                clienteId: 'alimentos_del_sur',
                facturas: [
                    { numero: 'FAC-2024-008', monto: 22000, fecha: '2025-10-01', vencimiento: '2025-11-01', estado: 'vencida', diasMora: 90 },
                    { numero: 'FAC-2025-001', monto: 5000, fecha: '2026-01-05', vencimiento: '2026-02-05', estado: 'pendiente', diasMora: 0 },
                ],
                totalDeuda: 27000,
                totalVencido: 22000,
            },
            {
                cliente: 'Plasticos Nacionales',
                clienteId: 'plasticos_nacionales',
                facturas: [
                    { numero: 'FAC-2025-002', monto: 18000, fecha: '2026-01-08', vencimiento: '2026-02-08', estado: 'pendiente', diasMora: 0 },
                ],
                totalDeuda: 18000,
                totalVencido: 0,
            },
            {
                cliente: 'Envases Premium',
                clienteId: 'envases_premium',
                facturas: [
                    { numero: 'FAC-2024-012', monto: 9500, fecha: '2025-12-01', vencimiento: '2026-01-01', estado: 'vencida', diasMora: 29 },
                    { numero: 'FAC-2025-004', monto: 7500, fecha: '2026-01-15', vencimiento: '2026-02-15', estado: 'pendiente', diasMora: 0 },
                ],
                totalDeuda: 17000,
                totalVencido: 9500,
            },
        ];
    },

    /**
     * Carga el resumen de cartera
     */
    loadResumenCartera: function() {
        const totalCartera = this.cuentasPorCobrar.reduce((sum, c) => sum + c.totalDeuda, 0);
        const totalVencido = this.cuentasPorCobrar.reduce((sum, c) => sum + c.totalVencido, 0);
        const clientesDeudores = this.cuentasPorCobrar.length;
        const facturasVencidas = this.cuentasPorCobrar.reduce((sum, c) =>
            sum + c.facturas.filter(f => f.estado === 'vencida').length, 0);

        document.getElementById('totalCartera').textContent = '$' + Axones.formatNumber(totalCartera);
        document.getElementById('totalVencido').textContent = '$' + Axones.formatNumber(totalVencido);
        document.getElementById('clientesDeudores').textContent = clientesDeudores;
        document.getElementById('facturasVencidas').textContent = facturasVencidas;
    },

    /**
     * Envia un mensaje al chatbot
     */
    enviarMensaje: async function() {
        const input = document.getElementById('chatInput');
        const mensaje = input.value.trim();

        if (!mensaje) return;

        // Verificar autenticacion
        if (!Auth.isAuthenticated()) {
            this.agregarMensajeBot('Por favor, inicie sesion para usar el chatbot.');
            return;
        }

        // Verificar permisos
        if (!Auth.tienePermiso('chatbot.acceso')) {
            this.agregarMensajeBot('Lo siento, no tiene permisos para acceder al chatbot financiero. Contacte a su administrador.');
            return;
        }

        // Limpiar input
        input.value = '';

        // Agregar mensaje del usuario
        this.agregarMensajeUsuario(mensaje);

        // Mostrar indicador de escritura
        this.mostrarEscribiendo();

        try {
            // Procesar consulta
            const respuesta = await this.procesarConsulta(mensaje);
            this.ocultarEscribiendo();
            this.agregarMensajeBot(respuesta);
        } catch (error) {
            console.error('Error procesando consulta:', error);
            this.ocultarEscribiendo();
            this.agregarMensajeBot('Lo siento, hubo un error procesando tu consulta. Por favor, intenta de nuevo.');
        }
    },

    /**
     * Procesa una consulta del usuario
     */
    procesarConsulta: async function(consulta) {
        const consultaLower = consulta.toLowerCase();

        // Detectar tipo de consulta y responder
        // Top deudores
        if (consultaLower.includes('top') || consultaLower.includes('mayor deuda') || consultaLower.includes('mas deben')) {
            return this.responderTopDeudores();
        }

        // Facturas vencidas
        if (consultaLower.includes('vencid')) {
            if (this.extraerCliente(consultaLower)) {
                return this.responderFacturasVencidasCliente(this.extraerCliente(consultaLower));
            }
            return this.responderFacturasVencidas();
        }

        // Total por cobrar
        if (consultaLower.includes('total') && (consultaLower.includes('cobrar') || consultaLower.includes('cartera'))) {
            return this.responderTotalCartera();
        }

        // Antiguedad de cartera
        if (consultaLower.includes('antigüedad') || consultaLower.includes('antiguedad') || consultaLower.includes('mora')) {
            return this.responderAntiguedadCartera();
        }

        // ========== CONSULTAS DE PRODUCCION ==========
        // Produccion total/hoy/mes
        if (consultaLower.includes('produccion') && (consultaLower.includes('total') || consultaLower.includes('hoy') || consultaLower.includes('mes'))) {
            return this.responderProduccionResumen();
        }

        // Refil/merma
        if (consultaLower.includes('refil') || consultaLower.includes('merma') || consultaLower.includes('desperdicio')) {
            return this.responderRefilResumen();
        }

        // Maquinas
        if (consultaLower.includes('maquina') || consultaLower.includes('impresora') || consultaLower.includes('laminadora') || consultaLower.includes('cortadora')) {
            return this.responderProduccionPorMaquina();
        }

        // Consulta de cliente especifico
        const clienteConsultado = this.extraerCliente(consultaLower);
        if (clienteConsultado) {
            if (consultaLower.includes('debe') || consultaLower.includes('saldo') || consultaLower.includes('deuda')) {
                return this.responderDeudaCliente(clienteConsultado);
            }
            if (consultaLower.includes('factura')) {
                return this.responderFacturasCliente(clienteConsultado);
            }
            if (consultaLower.includes('produj') || consultaLower.includes('produccion')) {
                return this.responderProduccionCliente(clienteConsultado);
            }
            // Por defecto, mostrar deuda
            return this.responderDeudaCliente(clienteConsultado);
        }

        // Pagos recientes
        if (consultaLower.includes('pago')) {
            return this.responderPagosRecientes();
        }

        // Consulta no reconocida - usar IA si esta configurada (API key desde CONFIG)
        const apiKey = CONFIG.CHATBOT.API_KEY;
        if (CONFIG.CHATBOT.API_URL && apiKey && !apiKey.includes('REEMPLAZAR')) {
            return await this.consultarIA(consulta, apiKey);
        }

        return this.respuestaNoReconocida();
    },

    /**
     * Responde con resumen de produccion
     */
    responderProduccionResumen: function() {
        if (this.datosProduccion.length === 0) {
            return 'No hay datos de produccion disponibles.';
        }

        const hoy = new Date().toISOString().split('T')[0];
        const hace30Dias = new Date();
        hace30Dias.setDate(hace30Dias.getDate() - 30);
        const fechaHace30 = hace30Dias.toISOString().split('T')[0];

        let totalMes = 0;
        let totalHoy = 0;
        let registrosMes = 0;

        this.datosProduccion.forEach(p => {
            const fecha = p.fecha || p.timestamp?.split('T')[0];
            const kg = parseFloat(p.kilos_producidos) || parseFloat(p.pesoTotal) || 0;
            if (fecha >= fechaHace30) {
                totalMes += kg;
                registrosMes++;
            }
            if (fecha === hoy) {
                totalHoy += kg;
            }
        });

        let respuesta = '**Resumen de Produccion**\n\n';
        respuesta += `- **Hoy:** ${Axones.formatNumber(totalHoy)} Kg\n`;
        respuesta += `- **Ultimos 30 dias:** ${Axones.formatNumber(totalMes)} Kg\n`;
        respuesta += `- **Registros en el mes:** ${registrosMes}\n`;
        respuesta += `- **Promedio diario:** ${Axones.formatNumber(totalMes / 30)} Kg\n`;

        return respuesta;
    },

    /**
     * Responde con resumen de refil
     */
    responderRefilResumen: function() {
        if (this.datosProduccion.length === 0) {
            return 'No hay datos de refil disponibles.';
        }

        let totalRefil = 0;
        let countRefil = 0;
        let alertasRefil = 0;

        this.datosProduccion.forEach(p => {
            const refil = parseFloat(p.refil_porcentaje) || parseFloat(p.porcentajeRefil) || 0;
            if (refil > 0) {
                totalRefil += refil;
                countRefil++;
                if (refil > 6) alertasRefil++;
            }
        });

        const promedioRefil = countRefil > 0 ? totalRefil / countRefil : 0;

        let respuesta = '**Analisis de Refil**\n\n';
        respuesta += `- **Refil promedio:** ${promedioRefil.toFixed(2)}%\n`;
        respuesta += `- **Registros analizados:** ${countRefil}\n`;
        respuesta += `- **Alertas (>6%):** ${alertasRefil}\n`;
        respuesta += `- **Estado:** ${promedioRefil > 6 ? 'CRITICO' : promedioRefil > 5 ? 'ADVERTENCIA' : 'OK'}\n`;

        return respuesta;
    },

    /**
     * Responde con produccion por maquina
     */
    responderProduccionPorMaquina: function() {
        if (this.datosProduccion.length === 0) {
            return 'No hay datos de produccion por maquina disponibles.';
        }

        const porMaquina = {};
        this.datosProduccion.forEach(p => {
            const maquina = p.maquina || 'Sin asignar';
            const kg = parseFloat(p.kilos_producidos) || parseFloat(p.pesoTotal) || 0;
            porMaquina[maquina] = (porMaquina[maquina] || 0) + kg;
        });

        let respuesta = '**Produccion por Maquina**\n\n';
        const sorted = Object.entries(porMaquina).sort((a, b) => b[1] - a[1]);
        sorted.slice(0, 10).forEach(([maquina, kg], i) => {
            respuesta += `${i + 1}. **${maquina}:** ${Axones.formatNumber(kg)} Kg\n`;
        });

        return respuesta;
    },

    /**
     * Extrae el nombre del cliente de la consulta
     */
    extraerCliente: function(consulta) {
        const clientes = {
            'rosa azul': 'Rosa Azul C.A.',
            'alimentos del sur': 'Alimentos del Sur',
            'plasticos nacionales': 'Plasticos Nacionales',
            'envases premium': 'Envases Premium',
        };

        for (const [key, value] of Object.entries(clientes)) {
            if (consulta.includes(key)) {
                return value;
            }
        }
        return null;
    },

    /**
     * Responde con el top de deudores
     */
    responderTopDeudores: function() {
        const ordenados = [...this.cuentasPorCobrar].sort((a, b) => b.totalDeuda - a.totalDeuda);
        const top5 = ordenados.slice(0, 5);

        let respuesta = 'Los 5 clientes con mayor deuda son:\n\n';
        top5.forEach((cliente, index) => {
            respuesta += `${index + 1}. **${cliente.cliente}**: $${Axones.formatNumber(cliente.totalDeuda)}`;
            if (cliente.totalVencido > 0) {
                respuesta += ` (vencido: $${Axones.formatNumber(cliente.totalVencido)})`;
            }
            respuesta += '\n';
        });

        const total = top5.reduce((sum, c) => sum + c.totalDeuda, 0);
        respuesta += `\n**Total de estos 5 clientes:** $${Axones.formatNumber(total)}`;

        return respuesta;
    },

    /**
     * Responde sobre facturas vencidas
     */
    responderFacturasVencidas: function() {
        let respuesta = 'Facturas vencidas:\n\n';
        let totalVencido = 0;
        let cantidadVencidas = 0;

        this.cuentasPorCobrar.forEach(cliente => {
            const vencidas = cliente.facturas.filter(f => f.estado === 'vencida');
            if (vencidas.length > 0) {
                respuesta += `**${cliente.cliente}:**\n`;
                vencidas.forEach(f => {
                    respuesta += `- ${f.numero}: $${Axones.formatNumber(f.monto)} (${f.diasMora} dias de mora)\n`;
                    totalVencido += f.monto;
                    cantidadVencidas++;
                });
                respuesta += '\n';
            }
        });

        if (cantidadVencidas === 0) {
            return 'No hay facturas vencidas actualmente.';
        }

        respuesta += `**Total vencido:** $${Axones.formatNumber(totalVencido)} en ${cantidadVencidas} facturas.`;
        return respuesta;
    },

    /**
     * Responde sobre la deuda de un cliente
     */
    responderDeudaCliente: function(nombreCliente) {
        const cliente = this.cuentasPorCobrar.find(c =>
            c.cliente.toLowerCase().includes(nombreCliente.toLowerCase())
        );

        if (!cliente) {
            return `No encontre informacion del cliente "${nombreCliente}". Verifique el nombre e intente de nuevo.`;
        }

        let respuesta = `**${cliente.cliente}**\n\n`;
        respuesta += `- **Deuda total:** $${Axones.formatNumber(cliente.totalDeuda)}\n`;
        respuesta += `- **Monto vencido:** $${Axones.formatNumber(cliente.totalVencido)}\n`;
        respuesta += `- **Facturas:** ${cliente.facturas.length}\n\n`;

        respuesta += 'Detalle de facturas:\n';
        cliente.facturas.forEach(f => {
            const estadoBadge = f.estado === 'vencida' ? '[VENCIDA]' : '[Pendiente]';
            respuesta += `- ${f.numero}: $${Axones.formatNumber(f.monto)} ${estadoBadge}`;
            if (f.diasMora > 0) {
                respuesta += ` - ${f.diasMora} dias de mora`;
            }
            respuesta += '\n';
        });

        return respuesta;
    },

    /**
     * Responde sobre facturas de un cliente
     */
    responderFacturasCliente: function(nombreCliente) {
        return this.responderDeudaCliente(nombreCliente);
    },

    /**
     * Responde sobre facturas vencidas de un cliente
     */
    responderFacturasVencidasCliente: function(nombreCliente) {
        const cliente = this.cuentasPorCobrar.find(c =>
            c.cliente.toLowerCase().includes(nombreCliente.toLowerCase())
        );

        if (!cliente) {
            return `No encontre informacion del cliente "${nombreCliente}".`;
        }

        const vencidas = cliente.facturas.filter(f => f.estado === 'vencida');
        if (vencidas.length === 0) {
            return `${cliente.cliente} no tiene facturas vencidas.`;
        }

        let respuesta = `Facturas vencidas de **${cliente.cliente}**:\n\n`;
        vencidas.forEach(f => {
            respuesta += `- ${f.numero}: $${Axones.formatNumber(f.monto)} - ${f.diasMora} dias de mora\n`;
        });

        const totalVencido = vencidas.reduce((sum, f) => sum + f.monto, 0);
        respuesta += `\n**Total vencido:** $${Axones.formatNumber(totalVencido)}`;

        return respuesta;
    },

    /**
     * Responde con el total de cartera
     */
    responderTotalCartera: function() {
        const totalCartera = this.cuentasPorCobrar.reduce((sum, c) => sum + c.totalDeuda, 0);
        const totalVencido = this.cuentasPorCobrar.reduce((sum, c) => sum + c.totalVencido, 0);
        const clientesDeudores = this.cuentasPorCobrar.length;

        let respuesta = '**Resumen de Cartera por Cobrar**\n\n';
        respuesta += `- **Total por cobrar:** $${Axones.formatNumber(totalCartera)}\n`;
        respuesta += `- **Total vencido:** $${Axones.formatNumber(totalVencido)} (${((totalVencido/totalCartera)*100).toFixed(1)}%)\n`;
        respuesta += `- **Clientes con deuda:** ${clientesDeudores}\n`;
        respuesta += `- **Cartera vigente:** $${Axones.formatNumber(totalCartera - totalVencido)}`;

        return respuesta;
    },

    /**
     * Responde sobre antigüedad de cartera
     */
    responderAntiguedadCartera: function() {
        let rangos = {
            '0-30 dias': { monto: 0, facturas: 0 },
            '31-60 dias': { monto: 0, facturas: 0 },
            '61-90 dias': { monto: 0, facturas: 0 },
            'Mas de 90 dias': { monto: 0, facturas: 0 },
        };

        this.cuentasPorCobrar.forEach(cliente => {
            cliente.facturas.forEach(f => {
                if (f.diasMora <= 30) {
                    rangos['0-30 dias'].monto += f.monto;
                    rangos['0-30 dias'].facturas++;
                } else if (f.diasMora <= 60) {
                    rangos['31-60 dias'].monto += f.monto;
                    rangos['31-60 dias'].facturas++;
                } else if (f.diasMora <= 90) {
                    rangos['61-90 dias'].monto += f.monto;
                    rangos['61-90 dias'].facturas++;
                } else {
                    rangos['Mas de 90 dias'].monto += f.monto;
                    rangos['Mas de 90 dias'].facturas++;
                }
            });
        });

        let respuesta = '**Antigüedad de Cartera**\n\n';
        for (const [rango, datos] of Object.entries(rangos)) {
            if (datos.facturas > 0) {
                respuesta += `- **${rango}:** $${Axones.formatNumber(datos.monto)} (${datos.facturas} facturas)\n`;
            }
        }

        return respuesta;
    },

    /**
     * Responde sobre produccion de un cliente
     */
    responderProduccionCliente: function(nombreCliente) {
        // Datos de ejemplo - en produccion se cargarian de Sheets
        return `Produccion del mes anterior para **${nombreCliente}**:\n\n` +
               `- **Kg procesados:** 12,450 kg\n` +
               `- **Pedidos completados:** 8\n` +
               `- **Valor total:** $18,500\n\n` +
               `Correlacion con pagos: El cliente tiene $35,500 en facturas pendientes.`;
    },

    /**
     * Responde sobre pagos recientes
     */
    responderPagosRecientes: function() {
        // Datos de ejemplo
        return '**Pagos recibidos esta semana:**\n\n' +
               '- 28/01: Plasticos Nacionales - $5,000\n' +
               '- 27/01: Rosa Azul C.A. - $3,500\n' +
               '- 25/01: Envases Premium - $2,000\n\n' +
               '**Total de la semana:** $10,500';
    },

    /**
     * Respuesta cuando no se reconoce la consulta
     */
    respuestaNoReconocida: function() {
        return 'No pude entender completamente tu consulta. Puedes preguntarme sobre:\n\n' +
               '**Produccion:**\n' +
               '- "Cual es la produccion de hoy?"\n' +
               '- "Como esta el refil este mes?"\n' +
               '- "Produccion por maquina"\n\n' +
               '**Finanzas:**\n' +
               '- "Cuanto debe [nombre del cliente]?"\n' +
               '- "Quienes son los 5 clientes con mayor deuda?"\n' +
               '- "Hay facturas vencidas?"\n' +
               '- "Cual es el total de cuentas por cobrar?"\n\n' +
               'Intenta reformular tu pregunta o usa los botones de consultas rapidas.';
    },

    /**
     * Consulta a la IA (Groq)
     */
    consultarIA: async function(consulta, apiKey) {
        // Preparar contexto con datos de cuentas por cobrar
        const contextoFinanciero = JSON.stringify(this.cuentasPorCobrar, null, 2);

        // Preparar resumen de produccion (ultimos 20 registros para no exceder tokens)
        const produccionReciente = this.datosProduccion.slice(0, 20).map(p => ({
            fecha: p.fecha,
            maquina: p.maquina,
            proceso: p.proceso,
            cliente: p.cliente,
            kg_producidos: p.kilos_producidos || p.pesoTotal,
            refil_pct: p.refil_porcentaje || p.porcentajeRefil
        }));
        const contextoProduccion = JSON.stringify(produccionReciente, null, 2);

        const mensajes = [
            {
                role: 'system',
                content: `Eres un asistente de la empresa Inversiones Axones 2008, C.A., una fabrica de empaques flexibles en Venezuela.
                         Puedes responder sobre produccion (impresion, laminacion, corte), refil/merma, y finanzas (cuentas por cobrar).
                         Responde en espanol de forma clara y concisa.

                         Datos de cuentas por cobrar: ${contextoFinanciero}

                         Datos recientes de produccion: ${contextoProduccion}`
            },
            {
                role: 'user',
                content: consulta
            }
        ];

        try {
            const response = await fetch(CONFIG.CHATBOT.API_URL, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${apiKey}`
                },
                body: JSON.stringify({
                    model: CONFIG.CHATBOT.MODEL,
                    messages: mensajes,
                    max_tokens: CONFIG.CHATBOT.MAX_TOKENS,
                    temperature: CONFIG.CHATBOT.TEMPERATURE
                })
            });

            const data = await response.json();
            return data.choices[0].message.content;
        } catch (error) {
            console.error('Error consultando IA:', error);
            throw error;
        }
    },

    /**
     * Agrega un mensaje del usuario al chat
     */
    agregarMensajeUsuario: function(mensaje) {
        const container = document.getElementById('chatMessages');
        const div = document.createElement('div');
        div.className = 'chat-message user';
        div.textContent = mensaje;
        container.appendChild(div);
        this.scrollToBottom();
    },

    /**
     * Agrega un mensaje del bot al chat
     */
    agregarMensajeBot: function(mensaje) {
        const container = document.getElementById('chatMessages');
        const div = document.createElement('div');
        div.className = 'chat-message bot';

        // Parsear markdown simple
        const htmlMensaje = mensaje
            .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
            .replace(/\n/g, '<br>');

        div.innerHTML = `
            <div class="d-flex align-items-start">
                <i class="bi bi-robot text-info me-2 mt-1"></i>
                <div>${htmlMensaje}</div>
            </div>
        `;

        container.appendChild(div);
        this.scrollToBottom();
    },

    /**
     * Muestra indicador de "escribiendo"
     */
    mostrarEscribiendo: function() {
        const container = document.getElementById('chatMessages');
        const div = document.createElement('div');
        div.id = 'typingIndicator';
        div.className = 'chat-message bot';
        div.innerHTML = `
            <div class="d-flex align-items-center">
                <i class="bi bi-robot text-info me-2"></i>
                <div class="typing-dots">
                    <span></span><span></span><span></span>
                </div>
            </div>
        `;
        container.appendChild(div);
        this.scrollToBottom();
    },

    /**
     * Oculta indicador de "escribiendo"
     */
    ocultarEscribiendo: function() {
        const indicator = document.getElementById('typingIndicator');
        if (indicator) {
            indicator.remove();
        }
    },

    /**
     * Hace scroll al final del chat
     */
    scrollToBottom: function() {
        const container = document.getElementById('chatMessages');
        container.scrollTop = container.scrollHeight;
    },

    /**
     * Limpia el historial del chat
     */
    limpiarChat: function() {
        const container = document.getElementById('chatMessages');
        container.innerHTML = `
            <div class="chat-message bot">
                <div class="d-flex align-items-start">
                    <i class="bi bi-robot text-info me-2 mt-1"></i>
                    <div>
                        <p class="mb-0">Chat limpiado. En que puedo ayudarte?</p>
                    </div>
                </div>
            </div>
        `;
        this.conversationHistory = [];
    },
};

// Inicializar cuando el DOM este listo
document.addEventListener('DOMContentLoaded', () => {
    if (document.getElementById('formChat')) {
        Chatbot.init();
    }
});

// Exportar modulo
if (typeof module !== 'undefined' && module.exports) {
    module.exports = Chatbot;
}
