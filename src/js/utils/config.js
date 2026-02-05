/**
 * Configuracion global del Sistema Axones
 * Inversiones Axones 2008, C.A.
 * Parametros y constantes del sistema
 */

const CONFIG = {
    // Informacion del sistema
    APP_NAME: 'Sistema Axones',
    APP_VERSION: '1.0.0',
    EMPRESA: 'Inversiones Axones 2008, C.A.',

    // URLs de Google Apps Script (se configuraran en produccion)
    API: {
        BASE_URL: 'https://script.google.com/macros/s/AKfycbxucwsxPdSffRuid9IKKuQJZKfrwi-PnU8uFx2ISI1Oifay6vwhIKqdIsT2cLjjXHxc/exec', // URL del Web App de Google Apps Script
        SHEETS_ID: '1TOpqDc-X4kthwYNzduGYO6MpN1dOdvbjqIIoW_oYL88', // ID del Google Sheets principal
    },

    // Configuracion de Groq para el chatbot
    CHATBOT: {
        API_URL: 'https://api.groq.com/openai/v1/chat/completions',
        API_KEY: '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', // Se configura en Admin o localStorage
        MODEL: 'llama-3.3-70b-versatile',
        MAX_TOKENS: 1024,
        TEMPERATURE: 0.7,
    },

    // Roles del sistema
    ROLES: {
        OPERADOR: 'operador',
        JEFE_OPERACIONES: 'jefe_operaciones',
        SUPERVISOR: 'supervisor',
        ADMINISTRADOR: 'administrador',
    },

    // Permisos por rol
    PERMISOS: {
        operador: [
            'produccion.ver_propio',
            'alertas.ver_propias',
            'dashboard.ver_propio',
        ],
        jefe_operaciones: [
            'produccion.crear',
            'produccion.ver_todos',
            'produccion.editar',
            'alertas.ver_todas',
            'dashboard.ver_completo',
        ],
        supervisor: [
            'produccion.crear',
            'produccion.ver_todos',
            'produccion.editar',
            'alertas.ver_todas',
            'alertas.gestionar',
            'dashboard.ver_completo',
            'operadores.ver',
        ],
        administrador: [
            'produccion.crear',
            'produccion.ver_todos',
            'produccion.editar',
            'produccion.eliminar',
            'alertas.ver_todas',
            'alertas.gestionar',
            'alertas.configurar',
            'dashboard.ver_completo',
            'dashboard.exportar',
            'operadores.ver',
            'operadores.gestionar',
            'chatbot.acceso',
            'configuracion.acceso',
            'usuarios.gestionar',
        ],
    },

    // Turnos de trabajo
    TURNOS: {
        D: { nombre: 'Dia', codigo: 'D', orden: 0 },
        1: { nombre: 'Primer Turno', codigo: '1', orden: 1 },
        2: { nombre: 'Segundo Turno', codigo: '2', orden: 2 },
        3: { nombre: 'Tercer Turno', codigo: '3', orden: 3 },
    },

    // Maquinas de la planta
    MAQUINAS: {
        IMPRESORAS: [
            { id: 'comexi_1', nombre: 'COMEXI 1', tipo: 'impresora' },
            { id: 'comexi_2', nombre: 'COMEXI 2', tipo: 'impresora' },
            { id: 'comexi_3', nombre: 'COMEXI 3', tipo: 'impresora' },
        ],
        LAMINADORAS: [
            { id: 'laminadora_1', nombre: 'Laminadora', tipo: 'laminadora' },
        ],
        CORTADORAS: [
            { id: 'cortadora_china', nombre: 'China', tipo: 'cortadora' },
            { id: 'cortadora_permaco', nombre: 'Permaco', tipo: 'cortadora' },
            { id: 'cortadora_novograf', nombre: 'Novograf', tipo: 'cortadora' },
        ],
    },

    // Procesos de produccion
    PROCESOS: [
        { id: 'imp', nombre: 'Impresion', abreviatura: 'IMP' },
        { id: 'imp_x_lam', nombre: 'Impresion x Laminacion', abreviatura: 'IMP X LAM' },
        { id: 'bob_imp_x_lam', nombre: 'Bobinado Impresion x Laminacion', abreviatura: 'BOB IMP X LAM' },
        { id: 'lam', nombre: 'Laminacion', abreviatura: 'LAM' },
        { id: 'corte', nombre: 'Corte', abreviatura: 'CORTE' },
    ],

    // Materiales
    MATERIALES: {
        BOPP: [
            { id: 'bopp_transp', nombre: 'BOPP Transparente', abreviatura: 'Transp' },
            { id: 'bopp_pasta', nombre: 'BOPP Pasta', abreviatura: 'Pasta' },
            { id: 'bopp_cast', nombre: 'BOPP Cast', abreviatura: 'Cast' },
            { id: 'bopp_met', nombre: 'BOPP Metalizado', abreviatura: 'Met' },
            { id: 'bopp_mate', nombre: 'BOPP Mate', abreviatura: 'Mate' },
            { id: 'bopp_perlado', nombre: 'BOPP Perlado', abreviatura: 'Perlado' },
        ],
        PEBD: [
            { id: 'pebd_transp', nombre: 'PEBD Transparente', abreviatura: 'Transp' },
            { id: 'pebd_pigm_bl', nombre: 'PEBD Pigmentado Blanco', abreviatura: 'Pigm. BL' },
        ],
        LAMINACION: [
            { id: 'adhesivo', nombre: 'Adhesivo', unidad: 'Kg' },
            { id: 'catalizador', nombre: 'Catalizador', unidad: 'Kg' },
            { id: 'acetato', nombre: 'Acetato', unidad: 'Lt' },
        ],
    },

    // Tintas de Laminacion
    TINTAS_LAMINACION: [
        { id: 'amarillo_lam', nombre: 'Amarillo' },
        { id: 'cyan_lam', nombre: 'Cyan' },
        { id: 'magenta_lam', nombre: 'Magenta' },
        { id: 'negro_lam', nombre: 'Negro' },
        { id: 'blanco_lam', nombre: 'Blanco' },
        { id: 'rojo_485_2x_lam', nombre: 'Rojo 485 2X' },
        { id: 'azul_reflex_lam', nombre: 'Azul Reflex' },
        { id: 'naranja_021_lam', nombre: 'Naranja 021' },
        { id: 'extender_lam', nombre: 'Extender' },
        { id: 'naranja_mary_lam', nombre: 'Naranja Mary' },
        { id: 'violeta_lam', nombre: 'Violeta' },
        { id: 'verde_c_lam', nombre: 'Verde C' },
        { id: 'compuesta_cera_lam', nombre: 'Compuesta de Cera' },
        { id: 'dorado_alv_lam', nombre: 'Dorado ALV' },
        { id: 'rojo_485_c_lam', nombre: 'Rojo 485 C' },
    ],

    // Tintas de Superficie
    TINTAS_SUPERFICIE: [
        { id: 'amarillo_sup', nombre: 'Amarillo' },
        { id: 'cyan_sup', nombre: 'Cyan' },
        { id: 'magenta_sup', nombre: 'Magenta' },
        { id: 'negro_sup', nombre: 'Negro' },
        { id: 'blanco_sup', nombre: 'Blanco' },
        { id: 'rojo_485_2x_sup', nombre: 'Rojo 485 2X' },
        { id: 'azul_reflex_sup', nombre: 'Azul Reflex' },
        { id: 'naranja_021_sup', nombre: 'Naranja 021' },
        { id: 'extender_sup', nombre: 'Extender' },
        { id: 'barniz_s_imp', nombre: 'Barniz S/IMP' },
        { id: 'verde_c_sup', nombre: 'Verde C' },
    ],

    // Solventes
    SOLVENTES: [
        { id: 'alcohol', nombre: 'Alcohol', unidad: 'Lt' },
        { id: 'metoxi', nombre: 'Metoxi', unidad: 'Lt' },
        { id: 'acetato_solv', nombre: 'Acetato', unidad: 'Lt' },
    ],

    // Clientes (se cargan dinamicamente de Sheets, estos son ejemplos)
    CLIENTES_EJEMPLO: [
        'Alivensa',
        'Amacorp',
        'Agua Blanca',
        'Alimentos Alvarigua',
        'Industrias Rico Mundo',
        'Inproa Santoni',
        'Alimentos El Toro',
        'Pasta La Sirena',
        'FDLM (Fior di Latte)',
        'Procesadora de Alimentos Viuz',
        'Corporacion de Alimentos Regina',
        'Representaciones Saj',
    ],

    // Umbrales de Refil por defecto (se cargan de Sheets)
    // Refil maximo aceptado: 5-6% segun Axones
    UMBRALES_REFIL: {
        'default': {
            maximo: 6.0, // porcentaje maximo aceptado
            advertencia: 5.0, // porcentaje de advertencia
        },
    },

    // Tipos de Scrap/Refil
    TIPOS_SCRAP: [
        { id: 'refile', nombre: 'Refile' },
        { id: 'impreso', nombre: 'Impreso' },
        { id: 'transparente', nombre: 'Transparente' },
        { id: 'laminado', nombre: 'Laminado' },
    ],

    // Estados de Orden de Trabajo
    ESTADOS_OT: [
        { id: 'en_proceso', nombre: 'En Proceso' },
        { id: 'finalizo', nombre: 'Finalizo' },
        { id: 'finalizo_rebobinado', nombre: 'Finalizo Rebobinado' },
        { id: 'pausado', nombre: 'Pausado' },
        { id: 'cancelado', nombre: 'Cancelado' },
    ],

    // Configuracion de alertas
    ALERTAS: {
        TIPOS: {
            REFIL_ALTO: 'refil_alto',
            REFIL_CRITICO: 'refil_critico',
            PRODUCCION_BAJA: 'produccion_baja',
            MAQUINA_DETENIDA: 'maquina_detenida',
            TIEMPO_MUERTO_ALTO: 'tiempo_muerto_alto',
        },
        NIVELES: {
            INFO: 'info',
            WARNING: 'warning',
            DANGER: 'danger',
            CRITICAL: 'critical',
        },
    },

    // Nombres de las hojas en Google Sheets
    SHEETS: {
        PRODUCCION: 'PRODUCCION',
        RESUMEN_CLIENTE: 'RESUMEN PRODUCCION POR CLIENTE',
        CONSUMO_TINTAS: 'CONSUMO DE TINTAS Y SOLVENTES',
        CLIENTES: 'CLIENTES',
        ALERTAS: 'ALERTAS',
        CONFIGURACION: 'CONFIGURACION',
        CUENTAS_COBRAR: 'CUENTAS_COBRAR',
        USUARIOS: 'USUARIOS',
        MAQUINAS: 'MAQUINAS',
        MATERIALES: 'MATERIALES',
        DESPACHOS: 'DESPACHOS',
        INVENTARIO: 'INVENTARIO',
        AUDITORIA: 'AUDITORIA',
    },

    // Formato de fechas
    FORMATO_FECHA: 'DD/MM/YYYY',
    FORMATO_HORA: 'HH:mm',
    FORMATO_DATETIME: 'DD/MM/YYYY HH:mm',

    // Configuracion de cache local
    CACHE: {
        DURACION_MINUTOS: 5,
        PREFIJO: 'axones_',
    },

    // Configuracion de formularios
    FORMULARIOS: {
        MAX_BOBINAS_ENTRADA: 26, // Maximo de bobinas madres en entrada
        MAX_BOBINAS_SALIDA: 22, // Maximo de bobinas en salida
    },
};

// Funcion para obtener configuracion dinamica desde Sheets
async function cargarConfiguracionRemota() {
    try {
        console.log('Cargando configuracion remota...');
        // Por ahora retorna la configuracion por defecto
        return CONFIG;
    } catch (error) {
        console.error('Error cargando configuracion:', error);
        return CONFIG;
    }
}

// Funcion para obtener todas las maquinas como array plano
function getTodasLasMaquinas() {
    return [
        ...CONFIG.MAQUINAS.IMPRESORAS,
        ...CONFIG.MAQUINAS.LAMINADORAS,
        ...CONFIG.MAQUINAS.CORTADORAS,
    ];
}

// Funcion para obtener todos los materiales como array plano
function getTodosLosMateriales() {
    return [
        ...CONFIG.MATERIALES.BOPP,
        ...CONFIG.MATERIALES.PEBD,
        ...CONFIG.MATERIALES.LAMINACION,
    ];
}

// Exportar configuracion
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { CONFIG, cargarConfiguracionRemota, getTodasLasMaquinas, getTodosLosMateriales };
}
