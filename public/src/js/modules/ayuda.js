/**
 * Modulo de Ayuda y Tutorial - Sistema Axones
 * Bot de asistencia con conocimiento del manual
 */

const AyudaBot = {
    // Base de conocimiento del manual
    manual: {
        general: {
            titulo: 'Sistema Axones - Control de Produccion',
            descripcion: 'Sistema integral para gestion y control de produccion en planta de impresion flexografica.',
            modulos: ['Dashboard', 'Impresion', 'Laminacion', 'Corte', 'Tintas', 'Checklist', 'Certificado', 'Programacion', 'Etiquetas', 'Inventario', 'Alertas', 'Reportes']
        },
        dashboard: {
            titulo: 'Panel de Control (Dashboard)',
            pasos: [
                'El dashboard muestra un resumen de la produccion del dia',
                'Los KPIs principales son: Produccion (Kg), Refil Promedio (%), Alertas Pendientes, Inventario Total',
                'Las tarjetas de colores indican el estado: Verde=OK, Amarillo=Advertencia, Rojo=Critico',
                'Haz clic en "Alertas" para ver los problemas pendientes',
                'Las "Acciones Rapidas" te llevan directamente a los modulos principales'
            ],
            tips: [
                'Revisa el dashboard al inicio de cada turno',
                'Presta atencion a las alertas rojas - requieren accion inmediata',
                'El estado de maquinas muestra cuales estan activas'
            ]
        },
        impresion: {
            titulo: 'Control de Impresion',
            pasos: [
                '1. Selecciona el TURNO (D, 1, 2, 3)',
                '2. La FECHA se llena automaticamente (puedes cambiarla)',
                '3. Ingresa el numero de ORDEN DE TRABAJO (OT)',
                '4. Selecciona la MAQUINA (COMEXI 1, 2 o 3)',
                '5. Ingresa tu nombre como OPERADOR',
                '6. En MATERIAL DE ENTRADA, registra los pesos de las bobinas madres',
                '7. En MATERIAL DE SALIDA, registra los pesos de las bobinas producidas',
                '8. Registra el SCRAP (transparente e impreso)',
                '9. El sistema calcula automaticamente la MERMA y el % REFIL',
                '10. Haz clic en GUARDAR para registrar'
            ],
            tips: [
                'El Refil maximo aceptado es 5-6%',
                'Si el Refil supera 5%, se genera una alerta automatica',
                'Puedes buscar OTs anteriores para ver el historial',
                'Registra las horas de inicio/fin para calcular tiempo muerto'
            ],
            campos: {
                turno: 'Turno de trabajo: D=Dia, 1=Primer turno, 2=Segundo turno, 3=Tercer turno',
                ot: 'Orden de Trabajo - Numero unico que identifica el pedido',
                refil: 'Porcentaje de desperdicio. Formula: (Entrada - Salida) / Entrada * 100',
                scrap: 'Material de desperdicio separado en transparente (sin imprimir) e impreso'
            }
        },
        corte: {
            titulo: 'Control de Corte',
            pasos: [
                '1. Selecciona el TURNO',
                '2. Ingresa la ORDEN DE TRABAJO',
                '3. Selecciona la CORTADORA (China, Permaco, Novograf)',
                '4. Registra las BOBINAS MADRE de entrada',
                '5. Registra las BOBINAS de salida',
                '6. El sistema calcula la merma automaticamente',
                '7. Guarda el registro'
            ],
            tips: [
                'Verifica que las bobinas madre coincidan con la OT',
                'El corte tiene menor porcentaje de refil que impresion'
            ]
        },
        tintas: {
            titulo: 'Consumo de Tintas y Solventes',
            pasos: [
                '1. Selecciona la fecha y OT',
                '2. Indica el cliente y producto',
                '3. Registra los Kg de produccion',
                '4. En TINTAS DE LAMINACION, ingresa el consumo de cada color en Kg',
                '5. En TINTAS DE SUPERFICIE, ingresa el consumo de cada color en Kg',
                '6. En SOLVENTES, registra Alcohol, Metoxi y Acetato en Litros',
                '7. El sistema calcula los totales automaticamente',
                '8. Guarda el registro'
            ],
            tips: [
                'Los colores mas comunes son: Amarillo, Cyan, Magenta, Negro, Blanco',
                'El consumo de tintas ayuda a calcular costos por OT',
                'Registra con precision para mantener el inventario actualizado'
            ]
        },
        inventario: {
            titulo: 'Inventario de Sustratos',
            pasos: [
                '1. Ve a la seccion de Inventario',
                '2. Usa los filtros para buscar por material, micras o cliente',
                '3. Para agregar stock: haz clic en "+ Agregar"',
                '4. Para editar: haz clic en el icono de lapiz',
                '5. Los items con stock bajo aparecen resaltados en amarillo/rojo'
            ],
            tips: [
                'Materiales comunes: BOPP, CAST, PEBD, METAL',
                'Las micras tipicas van de 12 a 100',
                'Configura el stock minimo para recibir alertas automaticas'
            ]
        },
        alertas: {
            titulo: 'Sistema de Alertas',
            pasos: [
                '1. Las alertas se generan automaticamente cuando:',
                '   - El Refil supera 5% (amarilla) o 6% (roja)',
                '   - El tiempo muerto supera 20%',
                '   - El stock de un material esta bajo',
                '2. Revisa las alertas pendientes diariamente',
                '3. Para resolver una alerta, haz clic en "Marcar Resuelta"',
                '4. Puedes filtrar por tipo, nivel o estado'
            ],
            tips: [
                'Las alertas rojas son criticas - requieren atencion inmediata',
                'Documenta la causa al resolver una alerta',
                'El historial de alertas ayuda a identificar patrones'
            ]
        },
        reportes: {
            titulo: 'Reportes y Exportacion',
            pasos: [
                '1. Selecciona el rango de fechas',
                '2. Opcionalmente filtra por maquina',
                '3. Elige el tipo de reporte:',
                '   - Produccion: Resumen de OTs y Kg producidos',
                '   - Analisis Refil: Detalle de desperdicios',
                '   - Inventario: Estado actual del stock',
                '   - Tintas: Consumo de tintas y solventes',
                '4. Haz clic en el boton del reporte deseado',
                '5. Se descargara un archivo CSV que puedes abrir en Excel'
            ],
            tips: [
                'Exporta reportes semanales para analisis',
                'El CSV se puede importar a Power BI para graficos avanzados',
                'Compara periodos para identificar mejoras'
            ]
        },
        admin: {
            titulo: 'Panel de Administracion',
            pasos: [
                '1. Configuracion de Backend:',
                '   - Backend: Supabase (fuente unica de verdad)',
                '   - API Key de Groq: Habilita el chatbot con IA',
                '2. Umbrales de Refil:',
                '   - Advertencia: Genera alerta amarilla (default 5%)',
                '   - Maximo: Genera alerta roja (default 6%)',
                '3. Usuarios: Gestiona operadores y permisos',
                '4. Datos de Prueba: Genera datos demo para testing',
                '5. Backup: Exporta/importa datos del sistema'
            ],
            tips: [
                'Solo administradores tienen acceso a esta seccion',
                'Guarda un backup antes de hacer cambios importantes',
                'La API Key de Groq es opcional (solo para chatbot IA)'
            ]
        },
        checklist: {
            titulo: 'Lista de Chequeo de Calidad',
            pasos: [
                '1. Selecciona el AREA (Impresion, Laminacion o Corte)',
                '2. Selecciona la MAQUINA correspondiente',
                '3. Completa la informacion general (fecha, turno, operador)',
                '4. Revisa cada punto del checklist y marca OK o Falla',
                '5. Si hay fallas, documenta en las observaciones',
                '6. Firma digitalmente en el canvas',
                '7. Guarda el checklist - se genera alerta si hay fallas'
            ],
            tips: [
                'Realiza el checklist al inicio de cada turno',
                'Un checklist con mas de 2 fallas genera alerta critica',
                'Puedes ver el historial de checklists anteriores',
                'El grafico muestra el progreso en tiempo real'
            ]
        },
        programacion: {
            titulo: 'Programacion de Produccion',
            pasos: [
                '1. Vista Kanban: Las OTs se organizan por area (Impresion, Laminacion, Corte)',
                '2. Para agregar una OT: Haz clic en "Nueva OT"',
                '3. Completa los datos: cliente, producto, cantidad, fecha entrega',
                '4. Selecciona la prioridad (1=Normal, 4=Urgente)',
                '5. Para mover una OT: Arrastra y suelta entre columnas',
                '6. Para avanzar al siguiente proceso: Menu > Avanzar',
                '7. Para completar: Menu > Completar'
            ],
            tips: [
                'Las OTs urgentes (prioridad 4) se destacan en rojo',
                'El badge muestra dias restantes para entrega',
                'Puedes filtrar por area, estado o cliente',
                'El flujo Normal es: Impresion > Laminacion > Corte',
                'El flujo Superficie es: Impresion > Corte (sin laminacion)'
            ]
        },
        etiquetas: {
            titulo: 'Generador de Etiquetas',
            pasos: [
                '1. Ingresa la informacion de la Orden de Trabajo',
                '2. Completa los datos del cliente y producto',
                '3. Ingresa la informacion de la bobina (numero, peso, dimensiones)',
                '4. Selecciona el tipo de material',
                '5. Indica la cantidad de etiquetas a generar',
                '6. Haz clic en "Vista Previa" para ver el resultado',
                '7. Haz clic en "Imprimir" para enviar a la impresora'
            ],
            tips: [
                'El codigo de bobina se genera automaticamente',
                'Puedes generar multiples etiquetas consecutivas',
                'La vista previa se actualiza automaticamente',
                'Consulta el historial para ver etiquetas anteriores'
            ]
        },
        certificado: {
            titulo: 'Certificado de Control de Calidad',
            pasos: [
                '1. El numero de certificado se genera automaticamente',
                '2. Ingresa la informacion del cliente y producto',
                '3. En Especificaciones Tecnicas:',
                '   - Columna "Espec." = valor especificado por el cliente',
                '   - Columna "Medido" = valor real medido',
                '4. Marca los items de Inspeccion Visual',
                '5. Ingresa el nombre del Inspector y Supervisor',
                '6. Haz clic en "Vista Previa" para ver el certificado',
                '7. Haz clic en "Imprimir" para generar el PDF'
            ],
            tips: [
                'Verde = dentro de tolerancia (±5%)',
                'Amarillo = fuera de tolerancia pero cerca',
                'Rojo = fuera de especificacion',
                'El sello APROBADO/RECHAZADO se coloca automaticamente',
                'Guarda el historial de certificados emitidos'
            ]
        },
        laminacion: {
            titulo: 'Control de Laminacion',
            pasos: [
                '1. Selecciona el TURNO y la FECHA',
                '2. Ingresa la ORDEN DE TRABAJO',
                '3. Selecciona la LAMINADORA',
                '4. En CONTROL DE ADHESIVO registra:',
                '   - Entrada y Sobro de Adhesivo, Catalizador y Acetato',
                '5. En BOBINAS DE ENTRADA registra los pesos',
                '6. En BOBINAS DE SALIDA registra los pesos producidos',
                '7. Registra el SCRAP (Refile y Laminado)',
                '8. El sistema calcula automaticamente los consumos'
            ],
            tips: [
                'El consumo de adhesivo se calcula automaticamente',
                'Productos "Superficie" no pasan por laminacion',
                'Registra las horas de inicio y fin del proceso',
                'Puedes buscar OTs de impresion para continuar el flujo'
            ]
        },
        glosario: {
            'OT': 'Orden de Trabajo - Documento que especifica que producir',
            'Refil': 'Desperdicio o scrap - Material que no se convierte en producto final',
            'Merma': 'Diferencia entre material de entrada y salida',
            'BOPP': 'Polipropileno Biorientado - Material plastico comun',
            'CAST': 'Pelicula cast - Material flexible',
            'PEBD': 'Polietileno de Baja Densidad',
            'Micras': 'Unidad de espesor del material (1 micra = 0.001 mm)',
            'Flexografia': 'Tecnica de impresion con planchas flexibles',
            'Laminacion': 'Union de dos o mas capas de material',
            'Bobina madre': 'Rollo grande de material de entrada',
            'Scrap transparente': 'Desperdicio de material sin imprimir',
            'Scrap impreso': 'Desperdicio de material ya impreso'
        }
    },

    // Respuestas predefinidas
    respuestas: {
        saludo: '¡Hola! Soy el asistente de Axones. ¿En que puedo ayudarte?\n\nPuedes preguntarme sobre:\n- Como usar cualquier modulo\n- Que significa un termino\n- Como resolver un problema\n\nO escribe "menu" para ver las opciones.',
        menu: 'Selecciona un tema:\n\n1. Dashboard\n2. Control de Impresion\n3. Control de Corte\n4. Consumo de Tintas\n5. Inventario\n6. Alertas\n7. Reportes\n8. Administracion\n9. Glosario de terminos\n\nEscribe el numero o el nombre del tema.',
        despedida: 'Si tienes mas preguntas, no dudes en consultarme. ¡Exito en tu trabajo!',
        noEntiendo: 'No estoy seguro de entender tu pregunta. Intenta con:\n- "como uso impresion"\n- "que es refil"\n- "ayuda con alertas"\n- "menu" para ver opciones'
    },

    // Inicializar
    init() {
        this.crearBotonAyuda();
        this.crearModalAyuda();
        this.detectarPagina();
    },

    // Crear boton flotante de ayuda
    crearBotonAyuda() {
        if (document.getElementById('btnAyudaFlotante')) return;

        const btn = document.createElement('button');
        btn.id = 'btnAyudaFlotante';
        btn.className = 'btn btn-primary rounded-circle shadow-lg';
        btn.innerHTML = '<i class="bi bi-question-lg fs-4"></i>';
        btn.style.cssText = `
            position: fixed;
            bottom: 20px;
            right: 20px;
            width: 56px;
            height: 56px;
            z-index: 1050;
            transition: transform 0.2s;
        `;
        btn.onclick = () => this.abrirAyuda();
        btn.onmouseenter = () => btn.style.transform = 'scale(1.1)';
        btn.onmouseleave = () => btn.style.transform = 'scale(1)';

        document.body.appendChild(btn);
    },

    // Crear modal de ayuda
    crearModalAyuda() {
        if (document.getElementById('modalAyuda')) return;

        const modal = document.createElement('div');
        modal.id = 'modalAyuda';
        modal.className = 'modal fade';
        modal.innerHTML = `
            <div class="modal-dialog modal-dialog-scrollable modal-lg">
                <div class="modal-content">
                    <div class="modal-header bg-primary text-white">
                        <h5 class="modal-title">
                            <i class="bi bi-robot me-2"></i>Asistente Axones
                        </h5>
                        <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal"></button>
                    </div>
                    <div class="modal-body p-0">
                        <div class="row g-0" style="height: 500px;">
                            <!-- Menu lateral -->
                            <div class="col-4 border-end bg-light" style="overflow-y: auto;">
                                <div class="list-group list-group-flush">
                                    <button class="list-group-item list-group-item-action" onclick="AyudaBot.mostrarSeccion('general')">
                                        <i class="bi bi-house me-2"></i>Inicio
                                    </button>
                                    <button class="list-group-item list-group-item-action" onclick="AyudaBot.mostrarSeccion('dashboard')">
                                        <i class="bi bi-speedometer2 me-2"></i>Dashboard
                                    </button>
                                    <button class="list-group-item list-group-item-action" onclick="AyudaBot.mostrarSeccion('impresion')">
                                        <i class="bi bi-printer me-2"></i>Impresion
                                    </button>
                                    <button class="list-group-item list-group-item-action" onclick="AyudaBot.mostrarSeccion('laminacion')">
                                        <i class="bi bi-layers me-2"></i>Laminacion
                                    </button>
                                    <button class="list-group-item list-group-item-action" onclick="AyudaBot.mostrarSeccion('corte')">
                                        <i class="bi bi-scissors me-2"></i>Corte
                                    </button>
                                    <button class="list-group-item list-group-item-action" onclick="AyudaBot.mostrarSeccion('tintas')">
                                        <i class="bi bi-droplet me-2"></i>Tintas
                                    </button>
                                    <button class="list-group-item list-group-item-action" onclick="AyudaBot.mostrarSeccion('checklist')">
                                        <i class="bi bi-list-check me-2"></i>Checklist
                                    </button>
                                    <button class="list-group-item list-group-item-action" onclick="AyudaBot.mostrarSeccion('certificado')">
                                        <i class="bi bi-award me-2"></i>Certificado
                                    </button>
                                    <button class="list-group-item list-group-item-action" onclick="AyudaBot.mostrarSeccion('programacion')">
                                        <i class="bi bi-calendar3 me-2"></i>Programacion
                                    </button>
                                    <button class="list-group-item list-group-item-action" onclick="AyudaBot.mostrarSeccion('etiquetas')">
                                        <i class="bi bi-tag me-2"></i>Etiquetas
                                    </button>
                                    <button class="list-group-item list-group-item-action" onclick="AyudaBot.mostrarSeccion('inventario')">
                                        <i class="bi bi-box-seam me-2"></i>Inventario
                                    </button>
                                    <button class="list-group-item list-group-item-action" onclick="AyudaBot.mostrarSeccion('alertas')">
                                        <i class="bi bi-bell me-2"></i>Alertas
                                    </button>
                                    <button class="list-group-item list-group-item-action" onclick="AyudaBot.mostrarSeccion('reportes')">
                                        <i class="bi bi-file-earmark-bar-graph me-2"></i>Reportes
                                    </button>
                                    <button class="list-group-item list-group-item-action" onclick="AyudaBot.mostrarSeccion('admin')">
                                        <i class="bi bi-gear me-2"></i>Admin
                                    </button>
                                    <button class="list-group-item list-group-item-action" onclick="AyudaBot.mostrarSeccion('glosario')">
                                        <i class="bi bi-book me-2"></i>Glosario
                                    </button>
                                </div>
                            </div>
                            <!-- Contenido -->
                            <div class="col-8 d-flex flex-column">
                                <div id="ayudaContenido" class="flex-grow-1 p-3" style="overflow-y: auto;">
                                    <!-- Contenido dinamico -->
                                </div>
                                <!-- Chat input -->
                                <div class="border-top p-2">
                                    <div class="input-group">
                                        <input type="text" id="ayudaInput" class="form-control"
                                               placeholder="Escribe tu pregunta..."
                                               onkeypress="if(event.key==='Enter') AyudaBot.procesarPregunta()">
                                        <button class="btn btn-primary" onclick="AyudaBot.procesarPregunta()">
                                            <i class="bi bi-send"></i>
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;

        document.body.appendChild(modal);
    },

    // Detectar pagina actual para ayuda contextual
    detectarPagina() {
        const path = window.location.pathname;
        if (path.includes('impresion')) return 'impresion';
        if (path.includes('corte')) return 'corte';
        if (path.includes('tintas')) return 'tintas';
        if (path.includes('inventario')) return 'inventario';
        if (path.includes('alertas')) return 'alertas';
        if (path.includes('reportes')) return 'reportes';
        if (path.includes('admin')) return 'admin';
        if (path.includes('chatbot')) return 'general';
        return 'dashboard';
    },

    // Abrir modal de ayuda
    abrirAyuda() {
        const pagina = this.detectarPagina();
        this.mostrarSeccion(pagina);

        const modal = new bootstrap.Modal(document.getElementById('modalAyuda'));
        modal.show();
    },

    // Mostrar seccion del manual
    mostrarSeccion(seccion) {
        const contenido = document.getElementById('ayudaContenido');
        const data = this.manual[seccion];

        if (!data) {
            contenido.innerHTML = '<p class="text-muted">Seccion no encontrada</p>';
            return;
        }

        // Glosario tiene formato especial
        if (seccion === 'glosario') {
            let html = '<h5 class="mb-3"><i class="bi bi-book me-2"></i>Glosario de Terminos</h5>';
            html += '<div class="list-group">';
            for (const [termino, definicion] of Object.entries(data)) {
                html += `
                    <div class="list-group-item">
                        <strong class="text-primary">${termino}</strong>
                        <p class="mb-0 small">${definicion}</p>
                    </div>
                `;
            }
            html += '</div>';
            contenido.innerHTML = html;
            return;
        }

        // General tiene formato diferente
        if (seccion === 'general') {
            contenido.innerHTML = `
                <div class="text-center mb-4">
                    <i class="bi bi-gear-wide-connected display-1 text-primary"></i>
                    <h4 class="mt-2">${data.titulo}</h4>
                    <p class="text-muted">${data.descripcion}</p>
                </div>
                <div class="alert alert-info">
                    <i class="bi bi-lightbulb me-2"></i>
                    <strong>Tip:</strong> Selecciona un modulo del menu izquierdo para ver instrucciones detalladas.
                </div>
                <h6>Modulos disponibles:</h6>
                <div class="row g-2">
                    ${data.modulos.map(m => `
                        <div class="col-4">
                            <button class="btn btn-outline-primary btn-sm w-100"
                                    onclick="AyudaBot.mostrarSeccion('${m.toLowerCase()}')">
                                ${m}
                            </button>
                        </div>
                    `).join('')}
                </div>
            `;
            return;
        }

        // Formato estandar para otros modulos
        let html = `<h5 class="mb-3"><i class="bi bi-info-circle me-2"></i>${data.titulo}</h5>`;

        if (data.pasos) {
            html += '<div class="card mb-3"><div class="card-header bg-primary text-white py-2">Pasos a seguir</div>';
            html += '<ul class="list-group list-group-flush">';
            data.pasos.forEach(paso => {
                html += `<li class="list-group-item small">${paso}</li>`;
            });
            html += '</ul></div>';
        }

        if (data.tips) {
            html += '<div class="alert alert-warning">';
            html += '<h6><i class="bi bi-lightbulb me-2"></i>Tips utiles</h6>';
            html += '<ul class="mb-0 small">';
            data.tips.forEach(tip => {
                html += `<li>${tip}</li>`;
            });
            html += '</ul></div>';
        }

        if (data.campos) {
            html += '<div class="card"><div class="card-header py-2">Campos importantes</div>';
            html += '<div class="card-body small">';
            for (const [campo, desc] of Object.entries(data.campos)) {
                html += `<p class="mb-1"><strong>${campo}:</strong> ${desc}</p>`;
            }
            html += '</div></div>';
        }

        contenido.innerHTML = html;
    },

    // Procesar pregunta del usuario
    procesarPregunta() {
        const input = document.getElementById('ayudaInput');
        const pregunta = input.value.trim().toLowerCase();

        if (!pregunta) return;
        input.value = '';

        const contenido = document.getElementById('ayudaContenido');

        // Agregar pregunta del usuario
        contenido.innerHTML += `
            <div class="d-flex justify-content-end mb-2">
                <div class="bg-primary text-white rounded px-3 py-2 small" style="max-width: 80%;">
                    ${pregunta}
                </div>
            </div>
        `;

        // Buscar respuesta
        const respuesta = this.buscarRespuesta(pregunta);

        // Agregar respuesta del bot
        setTimeout(() => {
            contenido.innerHTML += `
                <div class="d-flex mb-2">
                    <div class="bg-light rounded px-3 py-2 small" style="max-width: 80%;">
                        <i class="bi bi-robot text-primary me-1"></i>
                        ${respuesta}
                    </div>
                </div>
            `;
            contenido.scrollTop = contenido.scrollHeight;
        }, 300);
    },

    // Buscar respuesta en la base de conocimiento
    buscarRespuesta(pregunta) {
        // Detectar intencion
        if (pregunta.includes('hola') || pregunta.includes('ayuda')) {
            return this.respuestas.saludo;
        }

        if (pregunta === 'menu' || pregunta.includes('opciones')) {
            return this.respuestas.menu;
        }

        if (pregunta.includes('gracias') || pregunta.includes('adios')) {
            return this.respuestas.despedida;
        }

        // Buscar por modulo
        const modulos = ['dashboard', 'impresion', 'corte', 'tintas', 'inventario', 'alertas', 'reportes', 'admin'];
        for (const modulo of modulos) {
            if (pregunta.includes(modulo)) {
                const data = this.manual[modulo];
                if (data) {
                    this.mostrarSeccion(modulo);
                    return `Te muestro la informacion sobre <strong>${data.titulo}</strong>. Revisa el panel de la izquierda.`;
                }
            }
        }

        // Buscar en glosario
        if (pregunta.includes('que es') || pregunta.includes('significa') || pregunta.includes('definicion')) {
            for (const [termino, definicion] of Object.entries(this.manual.glosario)) {
                if (pregunta.includes(termino.toLowerCase())) {
                    return `<strong>${termino}:</strong> ${definicion}`;
                }
            }
        }

        // Buscar por numero de menu
        const numeros = {'1': 'dashboard', '2': 'impresion', '3': 'corte', '4': 'tintas', '5': 'inventario', '6': 'alertas', '7': 'reportes', '8': 'admin', '9': 'glosario'};
        if (numeros[pregunta]) {
            this.mostrarSeccion(numeros[pregunta]);
            return `Mostrando informacion sobre ${numeros[pregunta]}.`;
        }

        // Buscar por palabras clave
        if (pregunta.includes('refil') || pregunta.includes('desperdicio') || pregunta.includes('scrap')) {
            return `<strong>Refil/Desperdicio:</strong> ${this.manual.glosario['Refil']}\n\nEl maximo aceptado es 5-6%. Si superas este umbral, se genera una alerta automatica.`;
        }

        if (pregunta.includes('guardar') || pregunta.includes('registro')) {
            return 'Para guardar un registro:\n1. Completa todos los campos requeridos\n2. Verifica que los datos sean correctos\n3. Haz clic en el boton "Guardar"\n4. Espera la confirmacion';
        }

        if (pregunta.includes('alerta') || pregunta.includes('problema')) {
            this.mostrarSeccion('alertas');
            return 'Las alertas se generan automaticamente cuando hay problemas. Ve a la seccion de Alertas para mas detalles.';
        }

        if (pregunta.includes('exportar') || pregunta.includes('excel') || pregunta.includes('csv')) {
            this.mostrarSeccion('reportes');
            return 'Para exportar datos: Ve a Reportes, selecciona fechas y tipo de reporte, luego haz clic en el boton correspondiente. Se descargara un archivo CSV compatible con Excel.';
        }

        return this.respuestas.noEntiendo;
    },

    // Mostrar tour/tutorial inicial
    mostrarTour() {
        const pasos = [
            { elemento: null, titulo: 'Bienvenido a Sistema Axones', texto: 'Este sistema te ayuda a controlar la produccion de la planta. Te mostraremos las funciones principales.' },
            { elemento: '.stat-card', titulo: 'KPIs del Dashboard', texto: 'Aqui ves los indicadores principales: produccion, refil, alertas e inventario.' },
            { elemento: '.quick-action', titulo: 'Acciones Rapidas', texto: 'Usa estos botones para acceder rapidamente a los modulos de produccion.' },
            { elemento: '#alertasRecientes', titulo: 'Alertas', texto: 'Las alertas te notifican problemas como refil alto o stock bajo.' },
            { elemento: '#btnAyudaFlotante', titulo: 'Boton de Ayuda', texto: 'Haz clic aqui en cualquier momento para obtener ayuda contextual.' }
        ];

        let pasoActual = 0;

        const overlay = document.createElement('div');
        overlay.id = 'tourOverlay';
        overlay.style.cssText = 'position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,0.7);z-index:2000;';

        const tooltip = document.createElement('div');
        tooltip.id = 'tourTooltip';
        tooltip.style.cssText = 'position:fixed;background:white;padding:20px;border-radius:8px;max-width:350px;z-index:2001;box-shadow:0 4px 20px rgba(0,0,0,0.3);';

        const mostrarPaso = () => {
            const paso = pasos[pasoActual];

            tooltip.innerHTML = `
                <h6 class="text-primary mb-2">${paso.titulo}</h6>
                <p class="mb-3 small">${paso.texto}</p>
                <div class="d-flex justify-content-between align-items-center">
                    <small class="text-muted">${pasoActual + 1} de ${pasos.length}</small>
                    <div>
                        ${pasoActual > 0 ? '<button class="btn btn-sm btn-outline-secondary me-2" onclick="AyudaBot.tourAnterior()">Anterior</button>' : ''}
                        ${pasoActual < pasos.length - 1
                            ? '<button class="btn btn-sm btn-primary" onclick="AyudaBot.tourSiguiente()">Siguiente</button>'
                            : '<button class="btn btn-sm btn-success" onclick="AyudaBot.finalizarTour()">Finalizar</button>'
                        }
                    </div>
                </div>
            `;

            // Posicionar tooltip
            if (paso.elemento) {
                const el = document.querySelector(paso.elemento);
                if (el) {
                    const rect = el.getBoundingClientRect();
                    tooltip.style.top = (rect.bottom + 10) + 'px';
                    tooltip.style.left = Math.max(10, rect.left) + 'px';
                    el.style.position = 'relative';
                    el.style.zIndex = '2001';
                    el.style.background = 'white';
                    el.style.borderRadius = '4px';
                }
            } else {
                tooltip.style.top = '50%';
                tooltip.style.left = '50%';
                tooltip.style.transform = 'translate(-50%, -50%)';
            }
        };

        this.tourPasoActual = pasoActual;
        this.tourPasos = pasos;
        this.tourOverlay = overlay;
        this.tourTooltip = tooltip;
        this.mostrarPasoTour = mostrarPaso;

        document.body.appendChild(overlay);
        document.body.appendChild(tooltip);
        mostrarPaso();
    },

    tourSiguiente() {
        this.tourPasoActual++;
        this.mostrarPasoTour();
    },

    tourAnterior() {
        this.tourPasoActual--;
        this.mostrarPasoTour();
    },

    finalizarTour() {
        document.getElementById('tourOverlay')?.remove();
        document.getElementById('tourTooltip')?.remove();
        localStorage.setItem('axones_tour_completado', 'true');
    }
};

// Inicializar cuando el DOM este listo
document.addEventListener('DOMContentLoaded', () => {
    AyudaBot.init();

    // Mostrar tour si es primera vez
    if (!localStorage.getItem('axones_tour_completado') && window.location.pathname.includes('index')) {
        setTimeout(() => {
            if (confirm('¿Te gustaria ver un tour rapido del sistema?')) {
                AyudaBot.mostrarTour();
            } else {
                localStorage.setItem('axones_tour_completado', 'true');
            }
        }, 1000);
    }
});

// Exportar
if (typeof window !== 'undefined') {
    window.AyudaBot = AyudaBot;
}
