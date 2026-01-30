/**
 * Configuracion global del Sistema Axones
 * Parametros y constantes del sistema
 */

const CONFIG = {
    // Informacion del sistema
    APP_NAME: 'Sistema Axones',
    APP_VERSION: '1.0.0',

    // URLs de Google Apps Script (se configuraran en produccion)
    API: {
        BASE_URL: '', // URL del Web App de Google Apps Script
        SHEETS_ID: '', // ID del Google Sheets principal
    },

    // Configuracion de Groq para el chatbot
    CHATBOT: {
        API_URL: 'https://api.groq.com/openai/v1/chat/completions',
        MODEL: 'llama-3.3-70b-versatile',
        MAX_TOKENS: 1024,
        TEMPERATURE: 0.7,
    },

    // Roles del sistema
    ROLES: {
        OPERADOR: 'operador',
        SUPERVISOR: 'supervisor',
        ADMINISTRADOR: 'administrador',
    },

    // Permisos por rol
    PERMISOS: {
        operador: [
            'produccion.crear',
            'produccion.ver_propio',
            'alertas.ver_propias',
            'dashboard.ver_propio',
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

    // Umbrales de desperdicio por defecto (se cargan de Sheets)
    UMBRALES_DESPERDICIO: {
        // Estos son valores por defecto, se sobrescriben con la configuracion de Sheets
        'default': {
            maximo: 5.0, // porcentaje
            advertencia: 3.5, // porcentaje
        },
    },

    // Configuracion de alertas
    ALERTAS: {
        TIPOS: {
            DESPERDICIO_ALTO: 'desperdicio_alto',
            DESPERDICIO_CRITICO: 'desperdicio_critico',
            PRODUCCION_BAJA: 'produccion_baja',
            MAQUINA_DETENIDA: 'maquina_detenida',
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
        CLIENTES: 'CLIENTES',
        INSUMOS: 'INSUMOS',
        ALERTAS: 'ALERTAS',
        CONFIGURACION: 'CONFIGURACION',
        CUENTAS_COBRAR: 'CUENTAS_COBRAR',
        USUARIOS: 'USUARIOS',
        MAQUINAS: 'MAQUINAS',
        MATERIALES: 'MATERIALES',
        DESPACHOS: 'DESPACHOS',
        INVENTARIO: 'INVENTARIO',
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
};

// Funcion para obtener configuracion dinamica desde Sheets
async function cargarConfiguracionRemota() {
    try {
        // Esta funcion se implementara para cargar umbrales y catalagos desde Sheets
        console.log('Cargando configuracion remota...');
        // Por ahora retorna la configuracion por defecto
        return CONFIG;
    } catch (error) {
        console.error('Error cargando configuracion:', error);
        return CONFIG;
    }
}

// Exportar configuracion
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { CONFIG, cargarConfiguracionRemota };
}
