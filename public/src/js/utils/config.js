/**
 * Configuracion global del Sistema Axones
 * Inversiones Axones 2008, C.A.
 * Parametros y constantes del sistema
 * Actualizado con Ficha Tecnica 2026-03-18
 */

const CONFIG = {
    // Informacion del sistema
    APP_NAME: 'Sistema Axones',
    APP_VERSION: '1.2.0',
    EMPRESA: 'Inversiones Axones 2008, C.A.',

    // Datos de la empresa para documentos
    EMPRESA_DATOS: {
        razonSocial: 'INVERSIONES AXONES 2008, C.A.',
        rif: 'J-40081341-7',
        direccion: 'Calle Parcelamiento Industrial Guere, local 35, sector La Julia, Turmero, Aragua',
        telefono: '0424-316.96.12',
        emails: ['axones2008@gmail.com', 'gerenciaaxones@gmail.com'],
    },

    // Configuracion de Groq para el chatbot (HARDCODEADO - NO EDITABLE DESDE UI)
    CHATBOT: {
        API_URL: 'https://api.groq.com/openai/v1/chat/completions',
        API_KEY: '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',
        MODEL: 'llama-3.3-70b-versatile',
        MAX_TOKENS: 1024,
        TEMPERATURE: 0.7,
    },

    // Roles del sistema (actualizado con Ficha Tecnica)
    ROLES: {
        OPERADOR: 'operador',
        SUPERVISOR: 'supervisor',
        JEFE_OPERACIONES: 'jefe_operaciones',
        JEFE_ALMACEN: 'jefe_almacen',
        PLANIFICADOR: 'planificador',
        COLORISTA: 'colorista',
        ADMINISTRADOR: 'administrador',
    },

    // Permisos por rol (matriz de la Ficha Tecnica seccion 13)
    PERMISOS: {
        operador: [
            'ordenes.ver',
            'ordenes.editar',
            'impresion.ver',
            'impresion.editar',
            'laminacion.ver',
            'laminacion.editar',
            'corte.ver',
            'corte.editar',
            'produccion.ver_propio',
            'alertas.ver_propias',
        ],
        supervisor: [
            'ordenes.ver',
            'ordenes.editar',
            'impresion.ver',
            'impresion.editar',
            'laminacion.ver',
            'laminacion.editar',
            'corte.ver',
            'corte.editar',
            'produccion.crear',
            'produccion.ver_todos',
            'produccion.editar',
            'alertas.ver_todas',
            'alertas.gestionar',
            'calidad.ver',
            'calidad.editar',
            'reportes.ver',
            'dashboard.ver_completo',
            'operadores.ver',
        ],
        jefe_operaciones: [
            'dashboard.ver_completo',
            'ordenes.ver',
            'ordenes.editar',
            'ordenes.crear',
            'impresion.ver',
            'impresion.editar',
            'laminacion.ver',
            'laminacion.editar',
            'corte.ver',
            'corte.editar',
            'inventario.ver',
            'inventario.editar',
            'produccion.crear',
            'produccion.ver_todos',
            'produccion.editar',
            'alertas.ver_todas',
            'alertas.gestionar',
            'calidad.ver',
            'calidad.editar',
            'despacho.ver',
            'despacho.editar',
            'reportes.ver',
            'operadores.ver',
        ],
        jefe_almacen: [
            'inventario.ver',
            'inventario.editar',
            'alertas.ver_todas',
            'alertas.gestionar',
            'calidad.ver',
            'calidad.editar',
            'despacho.ver',
            'despacho.editar',
        ],
        planificador: [
            'dashboard.ver_completo',
            'ordenes.ver',
            'ordenes.editar',
            'ordenes.crear',
            'impresion.ver',
            'impresion.editar',
            'laminacion.ver',
            'laminacion.editar',
            'corte.ver',
            'corte.editar',
            'inventario.ver',
            'inventario.editar',
            'alertas.ver_todas',
            'calidad.ver',
            'calidad.editar',
            'despacho.ver',
            'despacho.editar',
            'reportes.ver',
        ],
        colorista: [
            'ordenes.ver',
            'ordenes.editar',
            'tintas.ver',
            'tintas.editar',
            'tintas.crear_color',
        ],
        administrador: [
            'dashboard.ver_completo',
            'dashboard.exportar',
            'ordenes.ver',
            'ordenes.editar',
            'ordenes.crear',
            'ordenes.eliminar',
            'impresion.ver',
            'impresion.editar',
            'laminacion.ver',
            'laminacion.editar',
            'corte.ver',
            'corte.editar',
            'inventario.ver',
            'inventario.editar',
            'tintas.ver',
            'tintas.editar',
            'tintas.crear_color',
            'produccion.crear',
            'produccion.ver_todos',
            'produccion.editar',
            'produccion.eliminar',
            'alertas.ver_todas',
            'alertas.gestionar',
            'alertas.configurar',
            'calidad.ver',
            'calidad.editar',
            'despacho.ver',
            'despacho.editar',
            'reportes.ver',
            'operadores.ver',
            'operadores.gestionar',
            'chatbot.acceso',
            'configuracion.acceso',
            'usuarios.gestionar',
        ],
    },

    // Areas de la planta
    AREAS: ['Impresion', 'Laminacion', 'Corte', 'Calidad', 'Despacho', 'Almacen', 'Produccion', 'Gerencia', 'Administracion'],

    // Turnos de trabajo (Ficha Tecnica seccion 4)
    TURNOS: {
        DIURNO: { nombre: 'Diurno', codigo: 'D', horaInicio: '07:00', horaFin: '16:00', orden: 1 },
        DIURNO_HE: { nombre: 'Diurno H.E.', codigo: 'DHE', horaInicio: '16:00', horaFin: '19:00', orden: 2 },
        NOCTURNO: { nombre: 'Nocturno', codigo: 'N', horaInicio: '19:00', horaFin: '04:00', orden: 3 },
        NOCTURNO_HE: { nombre: 'Nocturno H.E.', codigo: 'NHE', horaInicio: '04:00', horaFin: '07:00', orden: 4 },
    },

    // Maquinas de la planta (Ficha Tecnica seccion 3)
    MAQUINAS: {
        IMPRESORAS: [
            { id: 'comexi_1', nombre: 'COMEXI 1 (Planchas 067)', tipo: 'impresora', anchoMax: 830, velocidadMax: 130, estado: 'activa' },
            { id: 'comexi_3', nombre: 'COMEXI 3 (Planchas 045)', tipo: 'impresora', anchoMax: 1200, velocidadMax: 130, estado: 'activa' },
        ],
        LAMINADORAS: [
            { id: 'nexus', nombre: 'NEXUS', tipo: 'laminadora', anchoMax: 1200, velocidadMax: 100, estado: 'activa' },
        ],
        CORTADORAS: [
            { id: 'cortadora_china', nombre: 'Cortadora China', tipo: 'cortadora', anchoMax: 1200, velocidadMax: 400, estado: 'activa' },
            { id: 'cortadora_permaco', nombre: 'Cortadora Permaco', tipo: 'cortadora', anchoMax: 1200, velocidadMax: 140, estado: 'activa' },
            { id: 'cortadora_novograf', nombre: 'Cortadora Novograf', tipo: 'cortadora', anchoMax: 1200, velocidadMax: 200, estado: 'activa' },
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
        OTROS: [
            { id: 'pet', nombre: 'PET', abreviatura: 'PET' },
            { id: 'pa_nylon', nombre: 'PA (Nylon)', abreviatura: 'Nylon' },
        ],
        LAMINACION: [
            { id: 'adhesivo', nombre: 'Adhesivo', unidad: 'Kg' },
            { id: 'catalizador', nombre: 'Catalizador', unidad: 'Kg' },
            { id: 'acetato', nombre: 'Acetato', unidad: 'Lt' },
        ],
    },

    // Densidades de materiales (Ficha Tecnica seccion 11 - CONFIRMADO)
    DENSIDADES: {
        'BOPP NORMAL': 0.90,
        'BOPP MATE': 0.90,
        'BOPP PASTA': 0.90,
        'BOPP PERLADO': 0.80,
        'PERLADO': 0.80,
        'CAST': 0.92,
        'METAL': 0.90,
        'PEBD': 0.93,
        'PEBD PIGMENT': 0.93,
        'PET': 1.40,
        'PA': 1.14,
        'NYLON': 1.14,
    },

    // Tintas de Laminacion (Ficha Tecnica seccion 2.1)
    TINTAS_LAMINACION: [
        { id: 'blanco_lam', nombre: 'BLANCO', anilox: '', viscosidad: '', estandar: '' },
        { id: 'negro_lam', nombre: 'NEGRO', anilox: '', viscosidad: '', estandar: '' },
        { id: 'amarillo_proceso_lam', nombre: 'AMARILLO PROCESO', anilox: '', viscosidad: '', estandar: '' },
        { id: 'cyan_lam', nombre: 'CYAN', anilox: '', viscosidad: '', estandar: '' },
        { id: 'magenta_lam', nombre: 'MAGENTA', anilox: '', viscosidad: '', estandar: '' },
        { id: 'rojo_485_2x_lam', nombre: 'ROJO 485 2X', anilox: '', viscosidad: '', estandar: '' },
        { id: 'rojo_485_c_lam', nombre: 'ROJO 485 C', anilox: '', viscosidad: '', estandar: '' },
        { id: 'azul_reflex_lam', nombre: 'AZUL REFLEX', anilox: '', viscosidad: '', estandar: '' },
        { id: 'azul_proceso_lam', nombre: 'AZUL PROCESO', anilox: '', viscosidad: '', estandar: '' },
        { id: 'naranja_021_lam', nombre: 'NARANJA 021', anilox: '', viscosidad: '', estandar: '' },
        { id: 'naranja_mary_lam', nombre: 'NARANJA MARY', anilox: '', viscosidad: '', estandar: '' },
        { id: 'verde_c_lam', nombre: 'VERDE C', anilox: '', viscosidad: '', estandar: '' },
        { id: 'violeta_pantone_lam', nombre: 'VIOLETA PANTONE', anilox: '', viscosidad: '', estandar: '' },
        { id: 'dorado_alvarigua_lam', nombre: 'DORADO ALVARIGUA', anilox: '', viscosidad: '', estandar: '' },
        { id: 'extender_lam', nombre: 'EXTENDER', anilox: '', viscosidad: '', estandar: '' },
    ],

    // Tintas de Superficie (Ficha Tecnica seccion 2.2)
    TINTAS_SUPERFICIE: [
        { id: 'blanco_sup', nombre: 'BLANCO', anilox: '', viscosidad: '', estandar: '' },
        { id: 'negro_sup', nombre: 'NEGRO', anilox: '', viscosidad: '', estandar: '' },
        { id: 'amarillo_sup', nombre: 'AMARILLO', anilox: '', viscosidad: '', estandar: '' },
        { id: 'cyan_sup', nombre: 'CYAN', anilox: '', viscosidad: '', estandar: '' },
        { id: 'magenta_sup', nombre: 'MAGENTA', anilox: '', viscosidad: '', estandar: '' },
        { id: 'rojo_485_2x_sup', nombre: 'ROJO 485 2X', anilox: '', viscosidad: '', estandar: '' },
        { id: 'azul_reflex_sup', nombre: 'AZUL REFLEX', anilox: '', viscosidad: '', estandar: '' },
        { id: 'naranja_021_sup', nombre: 'NARANJA 021', anilox: '', viscosidad: '', estandar: '' },
        { id: 'dorado_alvarigua_sup', nombre: 'DORADO ALVARIGUA', anilox: '', viscosidad: '', estandar: '' },
        { id: 'barniz_s_imp_sup', nombre: 'BARNIZ S/IMP', anilox: '', viscosidad: '', estandar: '' },
        { id: 'verde_c_sup', nombre: 'VERDE C', anilox: '', viscosidad: '', estandar: '' },
    ],

    // Solventes (Ficha Tecnica seccion 6.3)
    SOLVENTES: [
        { id: 'alcohol_ipa', nombre: 'ALCOHOL ISOPROPILICO (IPA)', unidad: 'Kg' },
        { id: 'acetato_npropyl', nombre: 'ACETATO N-PROPYL', unidad: 'Kg' },
        { id: 'methoxy_propanol', nombre: 'METHOXY PROPANOL (DOWANOL)', unidad: 'Kg' },
    ],

    // Adhesivos (Ficha Tecnica seccion 7.1)
    ADHESIVOS: [
        { id: 'flextra_sl332', nombre: 'FLEXTRA SL332', proveedor: 'ALPHA Industrias Quimicas, C.A.', unidad: 'Kg' },
        { id: 'flextra_sl342', nombre: 'FLEXTRA SL342', proveedor: 'ALPHA Industrias Quimicas, C.A.', unidad: 'Kg' },
        { id: 'flextra_sl8314', nombre: 'FLEXTRA SL8314', proveedor: 'ALPHA Industrias Quimicas, C.A.', unidad: 'Kg' },
    ],

    // Catalizadores (Ficha Tecnica seccion 7.2)
    CATALIZADORES: [
        { id: 'flextra_r408', nombre: 'FLEXTRA R408', proveedor: 'ALPHA Industrias Quimicas, C.A.', unidad: 'Kg' },
        { id: 'flextra_xr1410', nombre: 'FLEXTRA XR1410', proveedor: 'ALPHA Industrias Quimicas, C.A.', unidad: 'Kg' },
        { id: 'flextra_r402', nombre: 'FLEXTRA R402', proveedor: 'ALPHA Industrias Quimicas, C.A.', unidad: 'Kg' },
    ],

    // Proveedores (Ficha Tecnica seccion 6)
    PROVEEDORES: {
        SUSTRATOS: [
            { id: 'siplast', nombre: 'Fabrica Siplast, C.A.', rif: 'J-29586594-5', materiales: ['BOPP TRANSPARENTE', 'BOPP MATE', 'BOPP METAL', 'CAST'] },
            { id: 'dinastia', nombre: 'Plasticos la Dinastia, C.A.', rif: 'J-50176198-1', materiales: ['PEBD', 'PEBD PIGMENTADO'] },
            { id: 'teleplastic', nombre: 'Teleplastic, C.A.', rif: 'J-00054015-2', materiales: ['BOPP TRANSPARENTE', 'BOPP MATE', 'BOPP METAL', 'CAST'] },
            { id: 'technofilm', nombre: 'Technofilm, S.A.', rif: '', materiales: ['BOPP TRANSPARENTE', 'BOPP MATE', 'BOPP METAL', 'CAST'] },
            { id: 'totalflex', nombre: 'Total Flex, C.A.', rif: 'J-50374325-5', materiales: ['BOPP TRANSPARENTE', 'BOPP MATE', 'BOPP METAL', 'CAST'] },
            { id: 'flexipack', nombre: 'Flexipack Solutions, C.A.', rif: 'J-50519062-8', materiales: ['BOPP TRANSPARENTE', 'BOPP MATE', 'BOPP METAL', 'CAST'] },
            { id: 'jyd', nombre: 'Inversiones J&D, C.A.', rif: '', materiales: ['BOPP TRANSPARENTE', 'BOPP MATE', 'BOPP METAL', 'CAST'] },
            { id: 'venefoil', nombre: 'Venefoil, C.A.', rif: 'J-06001261-9', materiales: ['CAST'] },
        ],
        TINTAS: [
            { id: 'barnices_vzla', nombre: 'Barnices Venezolanos, C.A.', rif: 'J-07540293-6', tipos: ['Tintas Laminacion', 'Tintas Superficie'] },
            { id: 'favika', nombre: 'Favika, C.A.', rif: 'J-29746614-2', tipos: ['Tintas Laminacion', 'Tintas Superficie'] },
            { id: 'cabeoli', nombre: 'Inversiones Cabeoli, C.A.', rif: 'J-40839412-0', tipos: ['Tintas Laminacion', 'Tintas Superficie'] },
            { id: 'tintas_vzla', nombre: 'Tintas Venezolanas, C.A.', rif: 'J-50576017-3', tipos: ['Tintas Laminacion', 'Tintas Superficie'] },
        ],
        SOLVENTES: [
            { id: 'alpha', nombre: 'ALPHA Industrias Quimicas, C.A.', rif: 'J-50180349-8', productos: ['Catalizador FLEXTRA R408', 'Catalizador FLEXTRA XR1410', 'Catalizador FLEXTRA R402', 'Adhesivo FLEXTRA SL332', 'Adhesivo FLEXTRA SL342', 'Adhesivo FLEXTRA SL8314'] },
            { id: 'aj_lara', nombre: 'A.J. Lara Suministros Quimicos, C.A.', rif: 'J-30827597-2', productos: ['ALCOHOL ISOPROPILICO (IPA)', 'ACETATO N-PROPYL', 'METHOXY PROPANOL-DOWANOL'] },
            { id: 'la_barraca', nombre: 'Quimicos la Barraca, C.A.', rif: 'J-07544200-8', productos: ['ALCOHOL ISOPROPILICO (IPA)', 'ACETATO N-PROPYL', 'METHOXY PROPANOL-DOWANOL'] },
            { id: 'venproquim', nombre: 'Inversiones Venproquim, C.A.', rif: 'J-40454107-1', productos: ['ALCOHOL ISOPROPILICO (IPA)', 'ACETATO N-PROPYL', 'METHOXY PROPANOL-DOWANOL'] },
        ],
    },

    // ============================================
    // EmailJS - Configuracion para envio de correos
    // ============================================
    // Pasos para configurar:
    // 1. Crear cuenta en https://www.emailjs.com/ (gratis hasta 200 emails/mes)
    // 2. Email Services > Add New Service > Gmail > conectar gerenciaaxones@gmail.com
    // 3. Email Templates > Create New Template (ver instrucciones abajo)
    // 4. Copiar los IDs aqui
    EMAILJS_SERVICE_ID: 'service_axones',       // ID del servicio (Email Services > Service ID)
    EMAILJS_TEMPLATE_ID: 'template_solicitud',  // ID del template (Email Templates > Template ID)
    EMAILJS_PUBLIC_KEY: '',                      // Public Key (Account > API Keys > Public Key)
    // IMPORTANTE: Dejar EMAILJS_PUBLIC_KEY vacio hasta configurar la cuenta.
    // Cuando este vacio, el sistema usa mailto:// como fallback (abre Gmail del usuario).

    // Emails para notificaciones (Ficha Tecnica seccion 12.2)
    NOTIFICACIONES_EMAILS: {
        stock_bajo: [
            'gerenciaaxones@gmail.com',
            'operacionesaxones@gmail.com',
            'produccionaxones1@gmail.com',
            'anl.almacenaxones@gmail.com',
        ],
    },

    // Parametros de produccion (Ficha Tecnica seccion 8)
    PRODUCCION_PARAMS: {
        FIGURA_EMBOBINADO: [1, 2, 3, 4, 5, 6, 7, 8],
        LINEA_CORTE: ['3mm', '5mm'],
        TIPO_IMPRESION: ['Superficie', 'Reverso'],
        POSICIONES_COLOR: 8, // 8 posiciones para colores en impresion
    },

    // Clientes (se cargan dinamicamente de Sheets, estos son ejemplos)
    CLIENTES_EJEMPLO: [
        'Alivensa',
        'ALTROM, C.A.',
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

    // RIF de clientes conocidos
    CLIENTES_RIF: {
        'ALTROM, C.A.': 'J-30582298-0',
    },

    // Umbrales de desperdicio (Ficha Tecnica seccion 9.1)
    UMBRALES_REFIL: {
        'default': {
            advertencia: 9.0, // porcentaje de advertencia (amarillo)
            maximo: 10.0, // porcentaje critico (rojo)
        },
    },

    // Alertas de stock minimo (Ficha Tecnica seccion 9.2)
    ALERTAS_STOCK: {
        SOLVENTES: {
            'ALCOHOL ISOPROPILICO (IPA)': 2000,
            'ACETATO N-PROPYL': 500,
            'METHOXY PROPANOL': 180,
        },
        ADHESIVOS: {
            'ADHESIVO': 600,
            'CATALIZADOR': 380,
        },
        TINTAS_LAMINACION: {
            'BLANCO': 1000,
            'NEGRO': 100,
            'AMARILLO PROCESO': 250,
            'ROJO 485 2X': 120,
            'ROJO 485 C': 50,
            'CYAN': 100,
            'AZUL PROCESO': 100,
            'MAGENTA': 100,
            'AZUL REFLEX': 50,
            'EXTENDER': 100,
            'NARANJA 021': 50,
            'VERDE C': 50,
            'VIOLETA PANTONE': 18,
            'NARANJA MARY': 100,
            'DORADO ALVARIGUA': 34,
        },
        TINTAS_SUPERFICIE: {
            'BLANCO': 500,
            'NEGRO': 50,
            'AMARILLO': 150,
            'CYAN': 50,
            'MAGENTA': 50,
            'ROJO 485 2X': 70,
            'AZUL REFLEX': 50,
            'NARANJA 021': 50,
            'DORADO ALVARIGUA': 34,
            'BARNIZ S/IMP': 100,
        },
    },

    // Tipos de Scrap/Refil
    TIPOS_SCRAP: [
        { id: 'refile', nombre: 'Refile', descripcion: 'Recorte de bordes' },
        { id: 'impreso', nombre: 'Impreso', descripcion: 'Material impreso defectuoso' },
        { id: 'laminado', nombre: 'Laminado', descripcion: 'Desperdicio de laminacion' },
    ],

    // Flujo de trabajo Axones
    FLUJO_TRABAJO: {
        NORMAL: ['impresion', 'laminacion', 'corte'],
        SUPERFICIE: ['impresion', 'corte'],
    },

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
            STOCK_BAJO_TINTAS: 'stock_bajo_tintas',
            STOCK_BAJO_SOLVENTES: 'stock_bajo_solventes',
            STOCK_BAJO_ADHESIVO: 'stock_bajo_adhesivo',
        },
        NIVELES: {
            INFO: 'info',
            WARNING: 'warning',
            DANGER: 'danger',
            CRITICAL: 'critical',
        },
    },

    // Formato de documentos (Ficha Tecnica seccion 10)
    DOCUMENTOS: {
        FORMATO_OT: 'OT-{YYYY}-{NNNN}', // OT-2026-0001
        REINICIO_ANUAL: true,
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
        MAX_BOBINAS_ENTRADA: 26,
        MAX_BOBINAS_SALIDA: 22,
    },
};

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
        ...(CONFIG.MATERIALES.OTROS || []),
        ...CONFIG.MATERIALES.LAMINACION,
    ];
}

// Funcion para obtener densidad de un material
function getDensidadMaterial(tipoMaterial) {
    if (!tipoMaterial) return 0.90;
    const tipo = tipoMaterial.toUpperCase().trim();
    // Buscar coincidencia exacta
    if (CONFIG.DENSIDADES[tipo]) return CONFIG.DENSIDADES[tipo];
    // Buscar coincidencia parcial
    for (const [key, val] of Object.entries(CONFIG.DENSIDADES)) {
        if (tipo.includes(key) || key.includes(tipo)) return val;
    }
    return 0.90; // default BOPP
}

// Funcion para obtener stock minimo de un producto
function getStockMinimo(producto, categoria) {
    if (!producto || !categoria) return 0;
    const stocks = CONFIG.ALERTAS_STOCK[categoria];
    if (!stocks) return 0;
    return stocks[producto.toUpperCase()] || 0;
}

// Exportar configuracion
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { CONFIG, getTodasLasMaquinas, getTodosLosMateriales, getDensidadMaterial, getStockMinimo };
}
