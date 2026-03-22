/**
 * Sistema Axones - Google Apps Script Backend
 * Inversiones Axones 2008, C.A.
 * Backend completo alineado con frontend (api.js)
 * Todas las operaciones via GET (el frontend evita POST por CORS)
 */

// ============================================
// CONFIGURACION
// ============================================

const SPREADSHEET_ID = '1TOpqDc-X4kthwYNzduGYO6MpN1dOdvbjqIIoW_oYL88';

const SHEETS = {
  ORDENES: 'ORDENES',
  HISTORIAL_OT: 'HISTORIAL_OT',
  IMPRESION: 'IMPRESION',
  CORTE: 'CORTE',
  LAMINACION: 'LAMINACION',
  TINTAS: 'CONSUMO_TINTAS',
  INVENTARIO: 'INVENTARIO',
  TINTAS_INVENTARIO: 'TINTAS_INVENTARIO',
  ADHESIVOS_INVENTARIO: 'ADHESIVOS_INVENTARIO',
  PRODUCTO_TERMINADO: 'PRODUCTO_TERMINADO',
  CLIENTES: 'CLIENTES',
  MAQUINAS: 'MAQUINAS',
  MATERIALES: 'MATERIALES',
  PRODUCTOS: 'PRODUCTOS',
  ALERTAS: 'ALERTAS',
  CONFIGURACION: 'CONFIGURACION',
  USUARIOS: 'USUARIOS',
  AUDITORIA: 'AUDITORIA',
  CUENTAS_COBRAR: 'CUENTAS_COBRAR',
  DESPACHOS: 'DESPACHOS',
  CONTROL_TIEMPO: 'CONTROL_TIEMPO',
  RESUMEN_PRODUCCION: 'RESUMEN_PRODUCCION'
};

const UMBRALES_REFIL = {
  default: { maximo: 6.0, advertencia: 5.0 }
};

// ============================================
// HEADERS POR HOJA
// ============================================

const ORDENES_HEADERS = [
  'id', 'timestamp', 'numeroOrden', 'fechaOrden', 'fechaCreacion', 'fechaModificacion',
  'estado', 'etapa', 'prioridad',
  'cliente', 'clienteRif', 'producto', 'cpe', 'mpps', 'codigoBarra', 'estructuraMaterial',
  'maquina', 'planchas', 'pedidoKg',
  'frecuencia', 'anchoCorte', 'anchoMontaje', 'numBandas', 'numRepeticion',
  'figuraEmbobinadoMontaje', 'tipoImpresion', 'desarrollo', 'numColores', 'obsMontaje',
  'pinon', 'lineaCorte',
  'tipoMaterial', 'micras', 'ancho', 'densidad', 'metrosEstimados',
  'fechaInicio', 'fechaEntrega',
  'observaciones', 'creadoPor', 'datosCompletos'
];

const HISTORIAL_OT_HEADERS = [
  'id', 'timestamp', 'ordenId', 'numeroOrden', 'accion', 'detalle',
  'usuario', 'usuarioNombre', 'modulo', 'datosAntes', 'datosDespues'
];

const IMPRESION_HEADERS = [
  'id', 'timestamp', 'fecha', 'turno', 'maquina', 'operador', 'operadorNombre',
  'ot', 'cliente', 'producto', 'ancho', 'calibre', 'repeticion', 'pistas',
  'totalEntrada', 'totalSalida', 'merma', 'porcentajeRefil',
  'scrapTransparente', 'scrapImpreso',
  'tiempoMuerto', 'tiempoEfectivo', 'tiempoPreparacion',
  'observaciones', 'estado', 'datosCompletos'
];

const CORTE_HEADERS = [
  'id', 'timestamp', 'fecha', 'turno', 'maquina', 'operador', 'operadorNombre',
  'ot', 'cliente', 'producto', 'ancho',
  'totalEntrada', 'totalSalida', 'merma', 'porcentajeRefil',
  'scrapRefile', 'scrapImpreso',
  'observaciones', 'estado', 'datosCompletos'
];

const LAMINACION_HEADERS = [
  'id', 'timestamp', 'fecha', 'turno', 'maquina', 'operador', 'operadorNombre',
  'ot', 'cliente', 'producto',
  'totalEntrada', 'totalSalida', 'merma', 'porcentajeRefil',
  'adhesivo', 'observaciones', 'estado', 'datosCompletos'
];

const TINTAS_HEADERS = [
  'id', 'timestamp', 'fecha', 'ot', 'cliente', 'producto', 'maquina', 'operador',
  'tintasLaminacion', 'tintasSuperficie', 'solventes',
  'totalTintasLaminacion', 'totalTintasSuperficie', 'totalSolventes',
  'observaciones'
];

const INVENTARIO_HEADERS = [
  'id', 'sku', 'codigoBarra', 'material', 'micras', 'ancho', 'kg',
  'producto', 'importado', 'densidad',
  'proveedor', 'ubicacion', 'lote', 'fechaIngreso', 'estado', 'ultimaActualizacion'
];

const ALERTAS_HEADERS = [
  'id', 'timestamp', 'tipo', 'nivel', 'maquina', 'ot', 'mensaje',
  'estado', 'datos', 'resueltaPor', 'fechaResolucion'
];

const DESPACHOS_HEADERS = [
  'id', 'timestamp', 'fecha', 'notaEntrega', 'ot', 'ordenCompra', 'cliente', 'productos',
  'cantidadTotal', 'kgDespachados', 'paletas', 'vehiculo', 'conductor',
  'autorizadoPor', 'despachadoPor', 'observaciones', 'registradoPor', 'estado'
];

const USUARIOS_HEADERS = [
  'id', 'usuario', 'password', 'nombre', 'apellido', 'rol', 'area',
  'email', 'activo', 'fechaCreacion', 'ultimoAcceso'
];

const PRODUCTO_TERMINADO_HEADERS = [
  'id', 'timestamp', 'ot', 'cliente', 'producto', 'maquina',
  'paleta', 'bobinas', 'pesoTotal', 'metros',
  'operador', 'estado', 'datosCompletos'
];

const CONTROL_TIEMPO_HEADERS = [
  'id', 'timestamp', 'ot', 'fase', 'accion', 'operador',
  'tiempoAcumulado', 'motivoPausa', 'datos'
];

// ============================================
// HELPER: Parsear data del query param
// ============================================

function parseData(e) {
  if (e.parameter.data) {
    try {
      return JSON.parse(e.parameter.data);
    } catch (err) {
      return null;
    }
  }
  return null;
}

// ============================================
// HELPER: Leer hoja como array de objetos
// ============================================

function readSheet(sheetName, params) {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const sheet = ss.getSheetByName(sheetName);

  if (!sheet || sheet.getLastRow() <= 1) {
    return [];
  }

  const data = sheet.getDataRange().getValues();
  const headers = data[0];

  return data.slice(1).map(function(row) {
    var obj = {};
    headers.forEach(function(header, idx) {
      obj[header] = row[idx];
    });
    return obj;
  });
}

// ============================================
// HELPER: Escribir fila en hoja
// ============================================

function appendToSheet(sheetName, expectedHeaders, data) {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  var sheet = ss.getSheetByName(sheetName);

  if (!sheet) {
    sheet = ss.insertSheet(sheetName);
    sheet.appendRow(expectedHeaders);
  }

  var headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  var row = headers.map(function(header) {
    return data[header] !== undefined ? data[header] : '';
  });
  sheet.appendRow(row);
  return data;
}

// ============================================
// HELPER: Actualizar fila por ID
// ============================================

function updateRowById(sheetName, id, newData) {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const sheet = ss.getSheetByName(sheetName);

  if (!sheet) {
    return { success: false, error: 'Hoja no encontrada: ' + sheetName };
  }

  const dataRange = sheet.getDataRange();
  const values = dataRange.getValues();
  const headers = values[0];
  const idIdx = headers.indexOf('id');

  for (var i = 1; i < values.length; i++) {
    if (String(values[i][idIdx]) === String(id)) {
      headers.forEach(function(header, idx) {
        if (newData[header] !== undefined && header !== 'id') {
          sheet.getRange(i + 1, idx + 1).setValue(newData[header]);
        }
      });
      return { success: true };
    }
  }

  return { success: false, error: 'Registro no encontrado: ' + id };
}

// ============================================
// doGet - ROUTER PRINCIPAL
// El frontend envia TODO por GET (incluso escrituras)
// Escrituras usan ?action=xxx&data={JSON}
// ============================================

function doGet(e) {
  var action = e.parameter.action;
  var result;

  try {
    var data = parseData(e);

    switch (action) {

      // --- SISTEMA ---
      case 'ping':
        result = { success: true, timestamp: new Date().toISOString(), version: '2.0.0' };
        break;

      // --- AUTH ---
      case 'login':
        result = handleLogin(e.parameter.usuario, e.parameter.password);
        break;

      // --- ORDENES ---
      case 'getOrdenes':
        result = { success: true, data: getOrdenes(e.parameter) };
        break;
      case 'createOrden':
        result = createOrden(data);
        break;
      case 'updateOrden':
        result = updateOrden(e.parameter.id, data || JSON.parse(e.parameter.data || '{}'));
        break;
      case 'deleteOrden':
        result = deleteOrden(e.parameter.id);
        break;
      case 'getHistorialOrden':
        result = { success: true, data: getHistorialOrden(e.parameter.ordenId || e.parameter.id) };
        break;
      case 'logHistorialOrden':
        result = logHistorialOrden(data);
        break;
      case 'getSyncData':
        result = getSyncData(e.parameter);
        break;

      // --- PRODUCCION (generico) ---
      case 'getProduccion':
        result = { success: true, data: getProduccion(e.parameter) };
        break;
      case 'createProduccion':
        result = createProduccion(data);
        break;
      case 'updateProduccion':
        result = updateProduccion(e.parameter.id, data || JSON.parse(e.parameter.data || '{}'));
        break;

      // --- INVENTARIO ---
      case 'getInventario':
        result = { success: true, data: getInventario(e.parameter) };
        break;
      case 'createInventario':
        result = createInventario(data);
        break;
      case 'updateInventario':
        result = updateInventarioItem(e.parameter.id, data || JSON.parse(e.parameter.data || '{}'));
        break;
      case 'descontarInventario':
        result = descontarInventario(data);
        break;

      // --- ALERTAS ---
      case 'getAlertas':
        result = { success: true, data: getAlertas(e.parameter) };
        break;
      case 'createAlerta':
        result = createAlerta(data);
        break;
      case 'marcarAlertaLeida':
        result = marcarAlertaLeida(e.parameter.id);
        break;

      // --- DESPACHOS ---
      case 'getDespachos':
        result = { success: true, data: getDespachos(e.parameter) };
        break;
      case 'createDespacho':
        result = createDespacho(data);
        break;

      // --- TINTAS ---
      case 'getConsumoTintas':
        result = { success: true, data: getConsumoTintas(e.parameter) };
        break;
      case 'createConsumoTinta':
        result = createConsumoTinta(data);
        break;

      // --- PRODUCTO TERMINADO ---
      case 'getProductoTerminado':
        result = { success: true, data: getProductoTerminado(e.parameter) };
        break;
      case 'createProductoTerminado':
        result = createProductoTerminado(data);
        break;

      // --- CONTROL DE TIEMPO ---
      case 'getControlTiempo':
        result = { success: true, data: getControlTiempo(e.parameter) };
        break;
      case 'saveControlTiempo':
        result = saveControlTiempo(data);
        break;

      // --- DASHBOARD ---
      case 'getDashboardData':
        result = { success: true, data: getDashboardData() };
        break;
      case 'getResumenProduccion':
        result = { success: true, data: getResumenProduccion(e.parameter) };
        break;

      // --- MAESTROS ---
      case 'getClientes':
        result = { success: true, data: getClientes() };
        break;
      case 'getMaquinas':
        result = { success: true, data: getMaquinas() };
        break;
      case 'getMateriales':
        result = { success: true, data: getMateriales() };
        break;
      case 'getProductos':
        result = { success: true, data: getProductos(e.parameter.cliente) };
        break;
      case 'getConfiguracion':
        result = { success: true, data: getConfiguracion() };
        break;

      // --- CARGA MASIVA ---
      case 'cargarInventarioInicial':
        result = cargarInventarioDesdeAPI();
        break;
      case 'syncInventarioCompleto':
        result = syncInventarioCompleto(data);
        break;
      case 'cargarTintasInicial':
        result = cargarTintasDesdeAPI();
        break;
      case 'cargarAdhesivosInicial':
        result = cargarAdhesivosDesdeAPI();
        break;

      // --- USUARIOS ---
      case 'getUsuarios':
        result = { success: true, data: getUsuarios() };
        break;
      case 'createUsuario':
        result = createUsuario(data);
        break;

      // --- EMAIL ---
      case 'enviarAlertaEmail':
        result = enviarAlertaEmailHandler(data);
        break;
      case 'enviarNotificacionEmail':
        result = enviarNotificacionEmailHandler(data);
        break;

      default:
        result = { success: false, error: 'Accion no reconocida: ' + action };
    }
  } catch (error) {
    result = { success: false, error: error.message };
  }

  return ContentService
    .createTextOutput(JSON.stringify(result))
    .setMimeType(ContentService.MimeType.JSON);
}

// doPost redirige a doGet para compatibilidad
function doPost(e) {
  if (e.postData && e.postData.contents) {
    e.parameter.data = e.postData.contents;
  }
  return doGet(e);
}

// ============================================
// AUTH / LOGIN
// ============================================

function handleLogin(usuario, password) {
  if (!usuario || !password) {
    return { success: false, error: 'Usuario y password requeridos' };
  }

  var registros = readSheet(SHEETS.USUARIOS);

  for (var i = 0; i < registros.length; i++) {
    var u = registros[i];
    if (String(u.usuario).toLowerCase() === String(usuario).toLowerCase() &&
        String(u.password) === String(password) &&
        (u.activo === true || u.activo === 'true' || u.activo === 'SI' || u.activo === 1)) {

      // Actualizar ultimo acceso
      try {
        updateRowById(SHEETS.USUARIOS, u.id, { ultimoAcceso: new Date().toISOString() });
      } catch (err) { /* no bloquear login por esto */ }

      return {
        success: true,
        user: {
          id: u.id,
          usuario: u.usuario,
          nombre: u.nombre || '',
          apellido: u.apellido || '',
          rol: u.rol || 'operador',
          area: u.area || '',
          email: u.email || ''
        }
      };
    }
  }

  return { success: false, error: 'Usuario o password incorrectos' };
}

// ============================================
// ORDENES DE TRABAJO
// ============================================

function getOrdenes(params) {
  var registros = readSheet(SHEETS.ORDENES);

  if (params) {
    if (params.estado) {
      registros = registros.filter(function(r) { return r.estado === params.estado; });
    }
    if (params.cliente) {
      registros = registros.filter(function(r) { return r.cliente === params.cliente; });
    }
    if (params.id) {
      registros = registros.filter(function(r) { return r.id === params.id; });
    }
    if (params.numeroOrden) {
      registros = registros.filter(function(r) { return r.numeroOrden === params.numeroOrden; });
    }
  }

  // Parsear datosCompletos de JSON
  registros.forEach(function(r) {
    if (r.datosCompletos && typeof r.datosCompletos === 'string') {
      try { r.datosCompletos = JSON.parse(r.datosCompletos); } catch (e) {}
    }
  });

  return registros.sort(function(a, b) {
    return new Date(b.timestamp || b.fechaCreacion) - new Date(a.timestamp || a.fechaCreacion);
  });
}

function createOrden(data) {
  if (!data) return { success: false, error: 'Datos requeridos' };

  data.id = data.id || ('OT_' + new Date().getTime());
  data.timestamp = new Date().toISOString();
  data.fechaCreacion = data.fechaCreacion || data.timestamp;
  data.estado = data.estado || 'pendiente';
  data.etapa = data.etapa || 'pendiente';

  // Guardar datos completos como JSON en una columna
  var datosCompletos = JSON.stringify(data);
  data.datosCompletos = datosCompletos;

  appendToSheet(SHEETS.ORDENES, ORDENES_HEADERS, data);
  logAuditoria('CREAR', 'ORDENES', data.id, data.creadoPor || 'sistema');

  return { success: true, id: data.id };
}

function updateOrden(id, newData) {
  if (!id) return { success: false, error: 'ID requerido' };

  if (typeof newData === 'string') {
    try { newData = JSON.parse(newData); } catch (e) {
      return { success: false, error: 'Datos invalidos' };
    }
  }

  newData.fechaModificacion = new Date().toISOString();

  // Actualizar datosCompletos si vienen datos del formulario
  if (Object.keys(newData).length > 3) {
    newData.datosCompletos = JSON.stringify(newData);
  }

  var result = updateRowById(SHEETS.ORDENES, id, newData);

  if (result.success) {
    logAuditoria('ACTUALIZAR', 'ORDENES', id, newData.modificadoPor || 'sistema');
  }

  return result;
}

function deleteOrden(id) {
  if (!id) return { success: false, error: 'ID requerido' };

  var ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  var sheet = ss.getSheetByName(SHEETS.ORDENES);
  if (!sheet) return { success: false, error: 'Hoja no encontrada' };

  var data = sheet.getDataRange().getValues();
  var headers = data[0];
  var idIdx = headers.indexOf('id');

  for (var i = 1; i < data.length; i++) {
    if (String(data[i][idIdx]) === String(id)) {
      sheet.deleteRow(i + 1);
      logAuditoria('ELIMINAR', 'ORDENES', id, 'sistema');
      return { success: true };
    }
  }

  return { success: false, error: 'Orden no encontrada' };
}

// ============================================
// PRODUCCION (generico - rutea a hoja correcta)
// ============================================

function getProduccion(params) {
  var proceso = (params && params.proceso) ? params.proceso.toLowerCase() : '';
  var resultados = [];

  // Si se especifica proceso, leer solo esa hoja
  if (proceso === 'impresion') {
    resultados = readSheet(SHEETS.IMPRESION);
  } else if (proceso === 'corte') {
    resultados = readSheet(SHEETS.CORTE);
  } else if (proceso === 'laminacion') {
    resultados = readSheet(SHEETS.LAMINACION);
  } else {
    // Leer todas
    var imp = readSheet(SHEETS.IMPRESION).map(function(r) { r.proceso = 'impresion'; return r; });
    var cor = readSheet(SHEETS.CORTE).map(function(r) { r.proceso = 'corte'; return r; });
    var lam = readSheet(SHEETS.LAMINACION).map(function(r) { r.proceso = 'laminacion'; return r; });
    resultados = imp.concat(cor).concat(lam);
  }

  // Filtros
  if (params) {
    if (params.fecha) {
      resultados = resultados.filter(function(r) {
        try {
          var fecha = Utilities.formatDate(new Date(r.fecha), 'America/Caracas', 'yyyy-MM-dd');
          return fecha === params.fecha;
        } catch (e) { return false; }
      });
    }
    if (params.maquina) {
      resultados = resultados.filter(function(r) { return r.maquina === params.maquina; });
    }
    if (params.ot) {
      resultados = resultados.filter(function(r) { return r.ot === params.ot; });
    }
  }

  // Parsear datosCompletos
  resultados.forEach(function(r) {
    if (r.datosCompletos && typeof r.datosCompletos === 'string') {
      try { r.datosCompletos = JSON.parse(r.datosCompletos); } catch (e) {}
    }
  });

  return resultados.sort(function(a, b) {
    return new Date(b.timestamp) - new Date(a.timestamp);
  });
}

function createProduccion(data) {
  if (!data) return { success: false, error: 'Datos requeridos' };

  var proceso = (data.proceso || 'impresion').toLowerCase();
  var sheetName, headers, prefix;

  if (proceso === 'corte') {
    sheetName = SHEETS.CORTE;
    headers = CORTE_HEADERS;
    prefix = 'CRT_';
  } else if (proceso === 'laminacion') {
    sheetName = SHEETS.LAMINACION;
    headers = LAMINACION_HEADERS;
    prefix = 'LAM_';
  } else {
    sheetName = SHEETS.IMPRESION;
    headers = IMPRESION_HEADERS;
    prefix = 'IMP_';
  }

  data.id = prefix + new Date().getTime();
  data.timestamp = new Date().toISOString();
  data.estado = data.estado || 'registrado';

  // Calcular refil si no viene
  if (!data.porcentajeRefil && parseFloat(data.totalEntrada) > 0) {
    data.porcentajeRefil = ((parseFloat(data.merma || 0) / parseFloat(data.totalEntrada)) * 100).toFixed(2);
  }

  // Guardar datos completos como JSON
  data.datosCompletos = JSON.stringify(data);

  appendToSheet(sheetName, headers, data);
  logAuditoria('CREAR', sheetName, data.id, data.operador || 'sistema');

  // Alerta por refil alto
  var porcentajeRefil = parseFloat(data.porcentajeRefil) || 0;
  if (porcentajeRefil > UMBRALES_REFIL.default.advertencia) {
    var nivel = porcentajeRefil > UMBRALES_REFIL.default.maximo ? 'critical' : 'warning';
    createAlerta({
      tipo: porcentajeRefil > UMBRALES_REFIL.default.maximo ? 'refil_critico' : 'refil_alto',
      nivel: nivel,
      maquina: data.maquina,
      ot: data.ot,
      mensaje: 'Refil ' + porcentajeRefil + '% en ' + proceso + ' OT ' + data.ot + ' - ' + data.maquina,
      datos: { porcentajeRefil: porcentajeRefil }
    });
  }

  // Descontar inventario si viene totalConsumido
  if (data.materialId && parseFloat(data.totalConsumido) > 0) {
    descontarInventario({
      id: data.materialId,
      kgDescontar: parseFloat(data.totalConsumido),
      motivo: 'Produccion ' + proceso + ' - ' + data.ot
    });
  }

  return { success: true, id: data.id };
}

function updateProduccion(id, newData) {
  if (!id) return { success: false, error: 'ID requerido' };

  if (typeof newData === 'string') {
    try { newData = JSON.parse(newData); } catch (e) {
      return { success: false, error: 'Datos invalidos' };
    }
  }

  // Determinar hoja por prefijo del ID
  var sheetName = SHEETS.IMPRESION;
  if (id.indexOf('CRT_') === 0) sheetName = SHEETS.CORTE;
  else if (id.indexOf('LAM_') === 0) sheetName = SHEETS.LAMINACION;

  var result = updateRowById(sheetName, id, newData);

  if (result.success) {
    logAuditoria('ACTUALIZAR', sheetName, id, newData.operador || 'sistema');
  }

  return result;
}

// ============================================
// INVENTARIO
// ============================================

function getInventario(params) {
  var registros = readSheet(SHEETS.INVENTARIO);

  if (params) {
    if (params.material) {
      registros = registros.filter(function(r) { return r.material === params.material; });
    }
    if (params.cliente) {
      registros = registros.filter(function(r) { return r.cliente === params.cliente; });
    }
    if (params.tipo) {
      var tipo = params.tipo.toLowerCase();
      if (tipo === 'tintas') {
        registros = readSheet(SHEETS.TINTAS_INVENTARIO);
      } else if (tipo === 'adhesivos') {
        registros = readSheet(SHEETS.ADHESIVOS_INVENTARIO);
      }
    }
  }

  return registros;
}

function createInventario(data) {
  if (!data) return { success: false, error: 'Datos requeridos' };

  // Determinar hoja segun tipo
  var tipo = (data.tipoInventario || 'sustratos').toLowerCase();
  var sheetName = SHEETS.INVENTARIO;
  var prefix = 'INV_';

  if (tipo === 'tintas') {
    sheetName = SHEETS.TINTAS_INVENTARIO;
    prefix = 'TIN_';
  } else if (tipo === 'adhesivos') {
    sheetName = SHEETS.ADHESIVOS_INVENTARIO;
    prefix = 'ADH_';
  }

  data.id = data.id || (prefix + new Date().getTime());
  data.fechaIngreso = data.fechaIngreso || new Date().toISOString();
  data.ultimaActualizacion = new Date().toISOString();
  data.estado = data.estado || 'disponible';

  appendToSheet(sheetName, INVENTARIO_HEADERS, data);
  logAuditoria('CREAR', 'INVENTARIO', data.id, data.usuario || 'sistema');

  return { success: true, id: data.id };
}

function updateInventarioItem(id, newData) {
  if (!id) return { success: false, error: 'ID requerido' };

  if (typeof newData === 'string') {
    try { newData = JSON.parse(newData); } catch (e) {
      return { success: false, error: 'Datos invalidos' };
    }
  }

  newData.ultimaActualizacion = new Date().toISOString();

  // Determinar hoja por prefijo
  var sheetName = SHEETS.INVENTARIO;
  if (String(id).indexOf('TIN_') === 0) sheetName = SHEETS.TINTAS_INVENTARIO;
  else if (String(id).indexOf('ADH_') === 0) sheetName = SHEETS.ADHESIVOS_INVENTARIO;

  var result = updateRowById(sheetName, id, newData);

  if (result.success) {
    logAuditoria('ACTUALIZAR', 'INVENTARIO', id, newData.usuario || 'sistema');

    // Alerta stock bajo
    var kg = parseFloat(newData.kg) || 0;
    if (kg > 0 && kg < 100) {
      createAlerta({
        tipo: 'stock_bajo',
        nivel: kg < 50 ? 'critical' : 'warning',
        mensaje: 'Stock bajo: ' + (newData.material || id) + ' - ' + kg + ' Kg',
        datos: { id: id, kg: kg }
      });
    }
  }

  return result;
}

function descontarInventario(data) {
  if (!data || !data.id) return { success: false, error: 'ID de material requerido' };

  var kgDescontar = parseFloat(data.kgDescontar) || 0;
  if (kgDescontar <= 0) return { success: false, error: 'Cantidad a descontar debe ser mayor a 0' };

  // Leer item actual
  var sheetName = SHEETS.INVENTARIO;
  if (String(data.id).indexOf('TIN_') === 0) sheetName = SHEETS.TINTAS_INVENTARIO;
  else if (String(data.id).indexOf('ADH_') === 0) sheetName = SHEETS.ADHESIVOS_INVENTARIO;

  var ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  var sheet = ss.getSheetByName(sheetName);
  if (!sheet) return { success: false, error: 'Hoja no encontrada' };

  var values = sheet.getDataRange().getValues();
  var headers = values[0];
  var idIdx = headers.indexOf('id');
  var kgIdx = headers.indexOf('kg');
  if (kgIdx === -1) kgIdx = headers.indexOf('cantidad');

  for (var i = 1; i < values.length; i++) {
    if (String(values[i][idIdx]) === String(data.id)) {
      var kgActual = parseFloat(values[i][kgIdx]) || 0;
      var kgNuevo = Math.max(0, kgActual - kgDescontar);

      sheet.getRange(i + 1, kgIdx + 1).setValue(kgNuevo);

      var ultimaIdx = headers.indexOf('ultimaActualizacion');
      if (ultimaIdx >= 0) {
        sheet.getRange(i + 1, ultimaIdx + 1).setValue(new Date().toISOString());
      }

      logAuditoria('DESCONTAR', 'INVENTARIO', data.id,
        (data.motivo || 'Descuento') + ' | -' + kgDescontar + 'Kg | Antes:' + kgActual + ' Despues:' + kgNuevo);

      // Alerta stock bajo
      if (kgNuevo > 0 && kgNuevo < 100) {
        var materialIdx = headers.indexOf('material');
        createAlerta({
          tipo: 'stock_bajo',
          nivel: kgNuevo < 50 ? 'critical' : 'warning',
          mensaje: 'Stock bajo: ' + (values[i][materialIdx] || data.id) + ' - ' + kgNuevo + ' Kg',
          datos: { id: data.id, kgAnterior: kgActual, kgActual: kgNuevo, descuento: kgDescontar }
        });
      }

      return { success: true, kgAnterior: kgActual, kgActual: kgNuevo };
    }
  }

  return { success: false, error: 'Material no encontrado: ' + data.id };
}

// ============================================
// ALERTAS
// ============================================

function getAlertas(params) {
  var registros = readSheet(SHEETS.ALERTAS);

  // Parsear datos JSON
  registros.forEach(function(r) {
    if (r.datos && typeof r.datos === 'string') {
      try { r.datos = JSON.parse(r.datos); } catch (e) { r.datos = {}; }
    }
  });

  if (params) {
    if (params.estado) {
      registros = registros.filter(function(r) { return r.estado === params.estado; });
    }
    if (params.tipo) {
      registros = registros.filter(function(r) { return r.tipo === params.tipo; });
    }
    if (params.maquina) {
      registros = registros.filter(function(r) { return r.maquina === params.maquina; });
    }
  }

  return registros.sort(function(a, b) {
    return new Date(b.timestamp) - new Date(a.timestamp);
  });
}

function createAlerta(data) {
  if (!data) return { success: false, error: 'Datos requeridos' };

  data.id = 'ALT_' + new Date().getTime();
  data.timestamp = new Date().toISOString();
  data.estado = 'pendiente';

  if (typeof data.datos === 'object') {
    data.datos = JSON.stringify(data.datos);
  }

  appendToSheet(SHEETS.ALERTAS, ALERTAS_HEADERS, data);

  // Email si es critica
  if (data.nivel === 'critical') {
    try { enviarNotificacionEmailHandler(data); } catch (e) {}
  }

  return { success: true, id: data.id };
}

function marcarAlertaLeida(id) {
  if (!id) return { success: false, error: 'ID requerido' };
  return updateRowById(SHEETS.ALERTAS, id, {
    estado: 'leida',
    fechaResolucion: new Date().toISOString()
  });
}

// ============================================
// DESPACHOS
// ============================================

function getDespachos(params) {
  var registros = readSheet(SHEETS.DESPACHOS);

  registros.forEach(function(r) {
    if (r.productos && typeof r.productos === 'string') {
      try { r.productos = JSON.parse(r.productos); } catch (e) {}
    }
  });

  if (params) {
    if (params.ot) {
      registros = registros.filter(function(r) { return r.ot === params.ot; });
    }
    if (params.cliente) {
      registros = registros.filter(function(r) { return r.cliente === params.cliente; });
    }
  }

  return registros.sort(function(a, b) {
    return new Date(b.timestamp) - new Date(a.timestamp);
  });
}

function createDespacho(data) {
  if (!data) return { success: false, error: 'Datos requeridos' };

  data.id = 'DSP_' + new Date().getTime();
  data.timestamp = new Date().toISOString();
  data.estado = data.estado || 'despachado';

  if (typeof data.productos === 'object') {
    data.productos = JSON.stringify(data.productos);
  }

  appendToSheet(SHEETS.DESPACHOS, DESPACHOS_HEADERS, data);
  logAuditoria('CREAR', 'DESPACHOS', data.id, data.registradoPor || 'sistema');

  return { success: true, id: data.id };
}

// ============================================
// CONSUMO DE TINTAS
// ============================================

function getConsumoTintas(params) {
  var registros = readSheet(SHEETS.TINTAS);

  registros.forEach(function(r) {
    ['tintasLaminacion', 'tintasSuperficie', 'solventes'].forEach(function(campo) {
      if (r[campo] && typeof r[campo] === 'string') {
        try { r[campo] = JSON.parse(r[campo]); } catch (e) { r[campo] = {}; }
      }
    });
  });

  if (params && params.ot) {
    registros = registros.filter(function(r) { return r.ot === params.ot; });
  }

  return registros;
}

function createConsumoTinta(data) {
  if (!data) return { success: false, error: 'Datos requeridos' };

  data.id = 'TNT_' + new Date().getTime();
  data.timestamp = new Date().toISOString();

  ['tintasLaminacion', 'tintasSuperficie', 'solventes'].forEach(function(campo) {
    if (typeof data[campo] === 'object') {
      data[campo] = JSON.stringify(data[campo]);
    }
  });

  appendToSheet(SHEETS.TINTAS, TINTAS_HEADERS, data);
  logAuditoria('CREAR', 'TINTAS', data.id, data.operador || 'sistema');

  return { success: true, id: data.id };
}

// ============================================
// PRODUCTO TERMINADO
// ============================================

function getProductoTerminado(params) {
  var registros = readSheet(SHEETS.PRODUCTO_TERMINADO);

  registros.forEach(function(r) {
    if (r.datosCompletos && typeof r.datosCompletos === 'string') {
      try { r.datosCompletos = JSON.parse(r.datosCompletos); } catch (e) {}
    }
    if (r.bobinas && typeof r.bobinas === 'string') {
      try { r.bobinas = JSON.parse(r.bobinas); } catch (e) {}
    }
  });

  if (params) {
    if (params.ot) {
      registros = registros.filter(function(r) { return r.ot === params.ot; });
    }
    if (params.cliente) {
      registros = registros.filter(function(r) { return r.cliente === params.cliente; });
    }
  }

  return registros;
}

function createProductoTerminado(data) {
  if (!data) return { success: false, error: 'Datos requeridos' };

  data.id = 'PT_' + new Date().getTime();
  data.timestamp = new Date().toISOString();
  data.estado = data.estado || 'disponible';

  if (typeof data.bobinas === 'object') {
    data.bobinas = JSON.stringify(data.bobinas);
  }
  if (typeof data.datosCompletos === 'object') {
    data.datosCompletos = JSON.stringify(data.datosCompletos);
  }

  appendToSheet(SHEETS.PRODUCTO_TERMINADO, PRODUCTO_TERMINADO_HEADERS, data);
  logAuditoria('CREAR', 'PRODUCTO_TERMINADO', data.id, data.operador || 'sistema');

  return { success: true, id: data.id };
}

// ============================================
// CONTROL DE TIEMPO
// ============================================

function getControlTiempo(params) {
  var registros = readSheet(SHEETS.CONTROL_TIEMPO);

  registros.forEach(function(r) {
    if (r.datos && typeof r.datos === 'string') {
      try { r.datos = JSON.parse(r.datos); } catch (e) {}
    }
  });

  if (params) {
    if (params.ot) {
      registros = registros.filter(function(r) { return r.ot === params.ot; });
    }
    if (params.fase) {
      registros = registros.filter(function(r) { return r.fase === params.fase; });
    }
  }

  return registros;
}

function saveControlTiempo(data) {
  if (!data) return { success: false, error: 'Datos requeridos' };

  data.id = 'CT_' + new Date().getTime();
  data.timestamp = new Date().toISOString();

  if (typeof data.datos === 'object') {
    data.datos = JSON.stringify(data.datos);
  }

  appendToSheet(SHEETS.CONTROL_TIEMPO, CONTROL_TIEMPO_HEADERS, data);

  return { success: true, id: data.id };
}

// ============================================
// DASHBOARD
// ============================================

function getDashboardData() {
  var ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  var hoy = new Date();
  var hoyStr = Utilities.formatDate(hoy, 'America/Caracas', 'yyyy-MM-dd');

  var produccionHoy = 0;
  var refilTotal = 0;
  var registrosHoy = 0;

  // Contar produccion de hoy en impresion y corte
  ['IMPRESION', 'CORTE', 'LAMINACION'].forEach(function(nombre) {
    var sheet = ss.getSheetByName(nombre);
    if (sheet && sheet.getLastRow() > 1) {
      var data = sheet.getDataRange().getValues();
      var headers = data[0];
      var fechaIdx = headers.indexOf('fecha');
      var salidaIdx = headers.indexOf('totalSalida');
      var refilIdx = headers.indexOf('porcentajeRefil');

      for (var i = 1; i < data.length; i++) {
        try {
          var fecha = Utilities.formatDate(new Date(data[i][fechaIdx]), 'America/Caracas', 'yyyy-MM-dd');
          if (fecha === hoyStr) {
            produccionHoy += parseFloat(data[i][salidaIdx]) || 0;
            refilTotal += parseFloat(data[i][refilIdx]) || 0;
            registrosHoy++;
          }
        } catch (e) {}
      }
    }
  });

  // Alertas pendientes
  var alertasPendientes = 0;
  var alertasSheet = ss.getSheetByName(SHEETS.ALERTAS);
  if (alertasSheet && alertasSheet.getLastRow() > 1) {
    var alertasData = alertasSheet.getDataRange().getValues();
    var estadoIdx = alertasData[0].indexOf('estado');
    alertasPendientes = alertasData.slice(1).filter(function(row) {
      return row[estadoIdx] === 'pendiente' || row[estadoIdx] === 'activa';
    }).length;
  }

  // Inventario total
  var inventarioTotal = 0;
  var inventarioSheet = ss.getSheetByName(SHEETS.INVENTARIO);
  if (inventarioSheet && inventarioSheet.getLastRow() > 1) {
    var invData = inventarioSheet.getDataRange().getValues();
    var kgIdx = invData[0].indexOf('kg');
    inventarioTotal = invData.slice(1).reduce(function(sum, row) {
      return sum + (parseFloat(row[kgIdx]) || 0);
    }, 0);
  }

  // Ordenes activas
  var ordenesActivas = 0;
  var ordenesSheet = ss.getSheetByName(SHEETS.ORDENES);
  if (ordenesSheet && ordenesSheet.getLastRow() > 1) {
    var ordData = ordenesSheet.getDataRange().getValues();
    var estIdx = ordData[0].indexOf('estado');
    ordenesActivas = ordData.slice(1).filter(function(row) {
      return row[estIdx] !== 'completada' && row[estIdx] !== 'cancelada';
    }).length;
  }

  return {
    produccionHoyKg: Math.round(produccionHoy),
    refilPromedio: registrosHoy > 0 ? (refilTotal / registrosHoy).toFixed(1) : '0.0',
    alertasPendientes: alertasPendientes,
    inventarioTotalKg: Math.round(inventarioTotal),
    registrosHoy: registrosHoy,
    ordenesActivas: ordenesActivas
  };
}

function getResumenProduccion(params) {
  var registros = getProduccion(params);

  var resumen = {
    totalRegistros: registros.length,
    totalEntrada: 0,
    totalSalida: 0,
    totalMerma: 0,
    porProceso: {},
    porMaquina: {}
  };

  registros.forEach(function(r) {
    resumen.totalEntrada += parseFloat(r.totalEntrada) || 0;
    resumen.totalSalida += parseFloat(r.totalSalida) || 0;
    resumen.totalMerma += parseFloat(r.merma) || 0;

    var proc = r.proceso || 'sin_proceso';
    if (!resumen.porProceso[proc]) resumen.porProceso[proc] = { cantidad: 0, kg: 0 };
    resumen.porProceso[proc].cantidad++;
    resumen.porProceso[proc].kg += parseFloat(r.totalSalida) || 0;

    var maq = r.maquina || 'sin_maquina';
    if (!resumen.porMaquina[maq]) resumen.porMaquina[maq] = { cantidad: 0, kg: 0 };
    resumen.porMaquina[maq].cantidad++;
    resumen.porMaquina[maq].kg += parseFloat(r.totalSalida) || 0;
  });

  return resumen;
}

// ============================================
// MAESTROS
// ============================================

function getClientes() {
  return readSheet(SHEETS.CLIENTES);
}

function getMaquinas() {
  return readSheet(SHEETS.MAQUINAS);
}

function getMateriales() {
  return readSheet(SHEETS.MATERIALES);
}

function getProductos(cliente) {
  var productos = readSheet(SHEETS.PRODUCTOS);
  if (cliente) {
    productos = productos.filter(function(p) { return p.cliente === cliente; });
  }
  return productos;
}

function getConfiguracion() {
  var config = readSheet(SHEETS.CONFIGURACION);
  if (config.length === 0) return UMBRALES_REFIL;

  var umbrales = {};
  config.forEach(function(row) {
    if (row.material) {
      umbrales[row.material] = {
        maximo: parseFloat(row.umbral_maximo) || 6.0,
        advertencia: parseFloat(row.umbral_advertencia) || 5.0
      };
    }
  });

  return Object.keys(umbrales).length > 0 ? umbrales : UMBRALES_REFIL;
}

// ============================================
// USUARIOS
// ============================================

function getUsuarios() {
  var usuarios = readSheet(SHEETS.USUARIOS);
  // No enviar passwords al frontend
  return usuarios.map(function(u) {
    return {
      id: u.id,
      usuario: u.usuario,
      nombre: u.nombre,
      apellido: u.apellido,
      rol: u.rol,
      area: u.area,
      email: u.email,
      activo: u.activo,
      fechaCreacion: u.fechaCreacion,
      ultimoAcceso: u.ultimoAcceso
    };
  });
}

function createUsuario(data) {
  if (!data) return { success: false, error: 'Datos requeridos' };

  // Verificar que no exista
  var existentes = readSheet(SHEETS.USUARIOS);
  var existe = existentes.some(function(u) {
    return String(u.usuario).toLowerCase() === String(data.usuario).toLowerCase();
  });

  if (existe) {
    return { success: false, error: 'El usuario ya existe: ' + data.usuario };
  }

  data.id = 'USR_' + new Date().getTime();
  data.fechaCreacion = new Date().toISOString();
  data.activo = data.activo !== undefined ? data.activo : true;

  appendToSheet(SHEETS.USUARIOS, USUARIOS_HEADERS, data);
  logAuditoria('CREAR', 'USUARIOS', data.id, data.creadoPor || 'sistema');

  return { success: true, id: data.id };
}

// ============================================
// EMAIL
// ============================================

function enviarAlertaEmailHandler(data) {
  if (!data) return { success: false, error: 'Datos requeridos' };

  try {
    var destinatarios = [];

    // Buscar supervisores y admins
    var usuarios = readSheet(SHEETS.USUARIOS);
    usuarios.forEach(function(u) {
      if ((u.rol === 'supervisor' || u.rol === 'administrador' || u.rol === 'jefe_operaciones') &&
          (u.activo === true || u.activo === 'true' || u.activo === 'SI' || u.activo === 1) &&
          u.email) {
        destinatarios.push(u.email);
      }
    });

    // Agregar emails fijos de la empresa
    destinatarios.push('axones2008@gmail.com');
    destinatarios.push('gerenciaaxones@gmail.com');

    // Eliminar duplicados
    destinatarios = destinatarios.filter(function(v, i, a) { return a.indexOf(v) === i; });

    if (destinatarios.length === 0) {
      return { success: false, error: 'No hay destinatarios' };
    }

    var asunto = data.asunto || '[ALERTA] Sistema Axones - ' + (data.tipo || 'Notificacion');
    var cuerpo = data.mensaje || data.cuerpo || 'Alerta del Sistema Axones';

    if (data.ot) cuerpo += '\nOT: ' + data.ot;
    if (data.maquina) cuerpo += '\nMaquina: ' + data.maquina;
    cuerpo += '\nFecha: ' + new Date().toISOString();
    cuerpo += '\n\n--\nSistema Axones\nInversiones Axones 2008, C.A.';

    destinatarios.forEach(function(email) {
      try {
        MailApp.sendEmail(email, asunto, cuerpo);
      } catch (e) {}
    });

    return { success: true, enviados: destinatarios.length };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

function enviarNotificacionEmailHandler(data) {
  return enviarAlertaEmailHandler(data);
}

// ============================================
// AUDITORIA
// ============================================

function logAuditoria(accion, entidad, entidadId, usuario) {
  try {
    var ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    var sheet = ss.getSheetByName(SHEETS.AUDITORIA);

    if (!sheet) {
      sheet = ss.insertSheet(SHEETS.AUDITORIA);
      sheet.appendRow(['timestamp', 'accion', 'entidad', 'entidadId', 'usuario']);
    }

    sheet.appendRow([
      new Date().toISOString(),
      accion,
      entidad,
      entidadId,
      usuario || 'sistema'
    ]);
  } catch (e) {
    // No bloquear operaciones por fallo en auditoria
  }
}

// ============================================
// INICIALIZACION
// ============================================

function inicializarHojas() {
  var ss = SpreadsheetApp.openById(SPREADSHEET_ID);

  var hojas = [
    { nombre: SHEETS.ORDENES, headers: ORDENES_HEADERS },
    { nombre: SHEETS.HISTORIAL_OT, headers: HISTORIAL_OT_HEADERS },
    { nombre: SHEETS.IMPRESION, headers: IMPRESION_HEADERS },
    { nombre: SHEETS.CORTE, headers: CORTE_HEADERS },
    { nombre: SHEETS.LAMINACION, headers: LAMINACION_HEADERS },
    { nombre: SHEETS.TINTAS, headers: TINTAS_HEADERS },
    { nombre: SHEETS.INVENTARIO, headers: INVENTARIO_HEADERS },
    { nombre: SHEETS.TINTAS_INVENTARIO, headers: ['id', 'nombre', 'tipo', 'codigo', 'cantidad', 'unidad', 'proveedor', 'ultimaActualizacion'] },
    { nombre: SHEETS.ADHESIVOS_INVENTARIO, headers: ['id', 'nombre', 'tipo', 'codigo', 'cantidad', 'unidad', 'proveedor', 'ultimaActualizacion'] },
    { nombre: SHEETS.ALERTAS, headers: ALERTAS_HEADERS },
    { nombre: SHEETS.DESPACHOS, headers: DESPACHOS_HEADERS },
    { nombre: SHEETS.USUARIOS, headers: USUARIOS_HEADERS },
    { nombre: SHEETS.PRODUCTO_TERMINADO, headers: PRODUCTO_TERMINADO_HEADERS },
    { nombre: SHEETS.CONTROL_TIEMPO, headers: CONTROL_TIEMPO_HEADERS },
    { nombre: SHEETS.AUDITORIA, headers: ['timestamp', 'accion', 'entidad', 'entidadId', 'usuario'] },
    { nombre: SHEETS.CLIENTES, headers: ['id', 'nombre', 'rif', 'direccion', 'telefono', 'email', 'contacto'] },
    { nombre: SHEETS.MAQUINAS, headers: ['id', 'nombre', 'tipo', 'area', 'anchoMax', 'velocidadMax', 'estado'] },
  ];

  var creadas = 0;
  hojas.forEach(function(hoja) {
    var sheet = ss.getSheetByName(hoja.nombre);
    if (!sheet) {
      sheet = ss.insertSheet(hoja.nombre);
      sheet.appendRow(hoja.headers);
      creadas++;
    }
  });

  return { success: true, message: 'Hojas inicializadas. Creadas: ' + creadas };
}

// ============================================
// HISTORIAL DE ORDENES DE TRABAJO
// Cada accion sobre una OT se registra aqui
// ============================================

/**
 * Registra un evento en el historial de una OT
 */
function logHistorialOrden(data) {
  if (!data || !data.ordenId) return { success: false, error: 'ordenId requerido' };

  var registro = {
    id: 'HIST_' + new Date().getTime(),
    timestamp: new Date().toISOString(),
    ordenId: data.ordenId,
    numeroOrden: data.numeroOrden || '',
    accion: data.accion || 'ACCION',
    detalle: data.detalle || '',
    usuario: data.usuario || 'sistema',
    usuarioNombre: data.usuarioNombre || '',
    modulo: data.modulo || '',
    datosAntes: data.datosAntes ? JSON.stringify(data.datosAntes) : '',
    datosDespues: data.datosDespues ? JSON.stringify(data.datosDespues) : ''
  };

  appendToSheet(SHEETS.HISTORIAL_OT, HISTORIAL_OT_HEADERS, registro);
  return { success: true, id: registro.id };
}

/**
 * Obtiene el historial completo de una OT
 */
function getHistorialOrden(ordenId) {
  if (!ordenId) return [];

  var registros = readSheet(SHEETS.HISTORIAL_OT);
  var historial = registros.filter(function(r) {
    return String(r.ordenId) === String(ordenId);
  });

  // Parsear datos JSON
  historial.forEach(function(h) {
    if (h.datosAntes && typeof h.datosAntes === 'string') {
      try { h.datosAntes = JSON.parse(h.datosAntes); } catch (e) {}
    }
    if (h.datosDespues && typeof h.datosDespues === 'string') {
      try { h.datosDespues = JSON.parse(h.datosDespues); } catch (e) {}
    }
  });

  return historial.sort(function(a, b) {
    return new Date(b.timestamp) - new Date(a.timestamp);
  });
}

// ============================================
// SYNC DATA - Endpoint para polling eficiente
// Retorna timestamps de ultima modificacion por hoja
// para que el frontend sepa si hay cambios
// ============================================

function getSyncData(params) {
  var since = params && params.since ? new Date(params.since) : null;
  var result = {
    success: true,
    serverTime: new Date().toISOString(),
    changes: {}
  };

  // Hojas a monitorear
  var hojasMonitor = [
    { key: 'ordenes', nombre: SHEETS.ORDENES },
    { key: 'inventario', nombre: SHEETS.INVENTARIO },
    { key: 'produccion_impresion', nombre: SHEETS.IMPRESION },
    { key: 'produccion_laminacion', nombre: SHEETS.LAMINACION },
    { key: 'produccion_corte', nombre: SHEETS.CORTE },
    { key: 'alertas', nombre: SHEETS.ALERTAS },
    { key: 'despachos', nombre: SHEETS.DESPACHOS },
    { key: 'producto_terminado', nombre: SHEETS.PRODUCTO_TERMINADO },
    { key: 'historial', nombre: SHEETS.HISTORIAL_OT }
  ];

  var ss = SpreadsheetApp.openById(SPREADSHEET_ID);

  hojasMonitor.forEach(function(hoja) {
    var sheet = ss.getSheetByName(hoja.nombre);
    if (!sheet) {
      result.changes[hoja.key] = { count: 0, lastModified: null };
      return;
    }

    var lastRow = sheet.getLastRow();
    var count = Math.max(0, lastRow - 1);

    // Si se pide "since", contar filas modificadas despues de esa fecha
    var modifiedSince = 0;
    if (since && count > 0) {
      var data = sheet.getDataRange().getValues();
      var headers = data[0];
      var tsIdx = headers.indexOf('timestamp');
      var modIdx = headers.indexOf('ultimaActualizacion');
      var fmIdx = headers.indexOf('fechaModificacion');

      for (var i = 1; i < data.length; i++) {
        var rowTs = data[i][tsIdx] || data[i][modIdx] || data[i][fmIdx];
        if (rowTs && new Date(rowTs) > since) {
          modifiedSince++;
        }
      }
    }

    result.changes[hoja.key] = {
      count: count,
      modifiedSince: since ? modifiedSince : count
    };
  });

  // Si se pide datos completos de hojas modificadas
  if (params && params.getData === 'true' && since) {
    result.data = {};
    hojasMonitor.forEach(function(hoja) {
      if (result.changes[hoja.key].modifiedSince > 0) {
        var registros = readSheet(hoja.nombre);
        // Solo enviar registros modificados desde 'since'
        result.data[hoja.key] = registros.filter(function(r) {
          var ts = r.timestamp || r.ultimaActualizacion || r.fechaModificacion;
          return ts && new Date(ts) > since;
        });
      }
    });
  }

  return result;
}

// ============================================
// Funciones de historial automatico en ordenes
// ============================================

// Sobreescribir createOrden para loggear automaticamente
var _originalCreateOrden = createOrden;
function createOrden(data) {
  var result = _originalCreateOrden(data);
  if (result.success) {
    logHistorialOrden({
      ordenId: data.id || result.id,
      numeroOrden: data.numeroOrden,
      accion: 'CREADA',
      detalle: 'Orden de trabajo creada. Cliente: ' + (data.cliente || '') + ', Producto: ' + (data.producto || '') + ', Kg: ' + (data.pedidoKg || ''),
      usuario: data.creadoPor || 'sistema',
      usuarioNombre: data.creadoPorNombre || '',
      modulo: 'ordenes'
    });
  }
  return result;
}

var _originalUpdateOrden = updateOrden;
function updateOrden(id, newData) {
  // Capturar datos antes del cambio
  var antes = {};
  try {
    var ordenActual = getOrdenes({ id: id });
    if (ordenActual.length > 0) {
      antes = { estado: ordenActual[0].estado, etapa: ordenActual[0].etapa };
    }
  } catch (e) {}

  var result = _originalUpdateOrden(id, newData);
  if (result.success) {
    var accion = 'EDITADA';
    var detalle = 'Orden actualizada';

    // Detectar tipo de cambio
    if (newData.estado && newData.estado !== antes.estado) {
      accion = 'CAMBIO_ESTADO';
      detalle = 'Estado: ' + (antes.estado || '?') + ' → ' + newData.estado;
    }
    if (newData.etapa && newData.etapa !== antes.etapa) {
      accion = 'CAMBIO_ETAPA';
      detalle = 'Etapa: ' + (antes.etapa || '?') + ' → ' + newData.etapa;
    }
    if (newData.procesoActual) {
      accion = 'MOVIDA_KANBAN';
      detalle = 'Movida a: ' + newData.procesoActual;
    }

    logHistorialOrden({
      ordenId: id,
      numeroOrden: newData.numeroOrden || '',
      accion: accion,
      detalle: detalle,
      usuario: newData.modificadoPor || 'sistema',
      usuarioNombre: newData.modificadoPorNombre || '',
      modulo: newData.modulo || 'ordenes',
      datosAntes: antes,
      datosDespues: { estado: newData.estado, etapa: newData.etapa }
    });
  }
  return result;
}

var _originalDeleteOrden = deleteOrden;
function deleteOrden(id) {
  // Capturar datos antes de eliminar
  var antes = {};
  try {
    var ordenActual = getOrdenes({ id: id });
    if (ordenActual.length > 0) antes = { numeroOrden: ordenActual[0].numeroOrden, cliente: ordenActual[0].cliente };
  } catch (e) {}

  var result = _originalDeleteOrden(id);
  if (result.success) {
    logHistorialOrden({
      ordenId: id,
      numeroOrden: antes.numeroOrden || '',
      accion: 'ELIMINADA',
      detalle: 'Orden eliminada. Cliente: ' + (antes.cliente || ''),
      usuario: 'sistema',
      modulo: 'ordenes'
    });
  }
  return result;
}

// Agregar historial cuando se crea produccion vinculada a una OT
var _originalCreateProduccion = createProduccion;
function createProduccion(data) {
  var result = _originalCreateProduccion(data);
  if (result.success && data.ot) {
    logHistorialOrden({
      ordenId: data.ot,
      numeroOrden: data.ot,
      accion: 'PRODUCCION_REGISTRADA',
      detalle: (data.proceso || '').toUpperCase() + ' - Maquina: ' + (data.maquina || '') +
               ', Entrada: ' + (data.totalEntrada || 0) + ' Kg, Salida: ' + (data.totalSalida || 0) +
               ' Kg, Merma: ' + (data.porcentajeRefil || 0) + '%',
      usuario: data.operador || 'sistema',
      usuarioNombre: data.operadorNombre || '',
      modulo: data.proceso || 'produccion'
    });
  }
  return result;
}

// Agregar historial cuando se crea despacho vinculado a una OT
var _originalCreateDespacho = createDespacho;
function createDespacho(data) {
  var result = _originalCreateDespacho(data);
  if (result.success && data.ot) {
    logHistorialOrden({
      ordenId: data.ot,
      numeroOrden: data.ot,
      accion: 'DESPACHO',
      detalle: 'Despacho: ' + (data.kgDespachados || 0) + ' Kg. Nota: ' + (data.notaEntrega || '-'),
      usuario: data.registradoPor || 'sistema',
      modulo: 'despachos'
    });
  }
  return result;
}

// Agregar historial cuando se crea producto terminado vinculado a una OT
var _originalCreateProductoTerminado = createProductoTerminado;
function createProductoTerminado(data) {
  var result = _originalCreateProductoTerminado(data);
  if (result.success && data.ot) {
    logHistorialOrden({
      ordenId: data.ot,
      numeroOrden: data.ot,
      accion: 'PRODUCTO_TERMINADO',
      detalle: 'Paleta #' + (data.paleta || '?') + ' - ' + (data.pesoTotal || 0) + ' Kg',
      usuario: data.operador || 'sistema',
      modulo: 'corte'
    });
  }
  return result;
}

// ============================================
// CARGA INICIAL DEL INVENTARIO (158 productos)
// Ejecutar UNA VEZ desde el editor de Apps Script
// ============================================

/**
 * Genera SKU: PREFIJO-MICRAS-ANCHO
 */
function generarSKU_(material, micras, ancho) {
  var prefijos = {
    'BOPP NORMAL': 'BN', 'BOPP MATE': 'BM', 'BOPP PASTA': 'BP',
    'BOPP PERLADO': 'BPE', 'METAL': 'MT', 'PERLADO': 'PE',
    'CAST': 'CA', 'PEBD': 'PB', 'PEBD PIGMENT': 'PBP'
  };
  var pre = prefijos[material] || material.substring(0, 2).toUpperCase();
  return pre + '-' + micras + '-' + ancho;
}

/**
 * Genera codigo de barras EAN-13: 759 + 0001 + secuencial + verificador
 */
function generarCodigoBarra_(index) {
  var base = '759' + ('0001') + String(index).padStart(5, '0');
  var suma = 0;
  for (var i = 0; i < 12; i++) {
    suma += parseInt(base[i]) * (i % 2 === 0 ? 1 : 3);
  }
  var verificador = (10 - (suma % 10)) % 10;
  return base + verificador;
}

/**
 * Densidad por tipo de material
 */
function getDensidad_(material) {
  var densidades = {
    'BOPP NORMAL': 0.90, 'BOPP MATE': 0.90, 'BOPP PASTA': 0.90,
    'BOPP PERLADO': 0.80, 'PERLADO': 0.80, 'METAL': 0.90,
    'CAST': 0.92, 'PEBD': 0.93, 'PEBD PIGMENT': 0.93
  };
  return densidades[material] || 0.90;
}

/**
 * EJECUTAR UNA VEZ: Carga los 158 productos del inventario real de Axones
 * Basado en Excel 26-02-2026
 * Formato identico al frontend (inventario.js getDatosEjemplo)
 */
function cargarInventarioInicial() {
  var datos = [
    // BOPP NORMAL
    { id: 'INV001', material: 'BOPP NORMAL', micras: 15, ancho: 700, kg: 73.0, producto: 'CHARMY', importado: false },
    { id: 'INV003', material: 'BOPP NORMAL', micras: 17, ancho: 620, kg: 283.2, producto: 'TOM 80', importado: false },
    { id: 'INV005', material: 'BOPP NORMAL', micras: 17, ancho: 710, kg: 46.0, producto: 'TOM 28', importado: false },
    { id: 'INV007', material: 'BOPP NORMAL', micras: 20, ancho: 610, kg: 2215.02, producto: 'HASHI - CHUNCHY', importado: false },
    { id: 'INV009', material: 'BOPP NORMAL', micras: 20, ancho: 630, kg: 0, producto: 'NATY', importado: false },
    { id: 'INV011', material: 'BOPP NORMAL', micras: 20, ancho: 740, kg: 0, producto: 'CALI DONA', importado: false },
    { id: 'INV013', material: 'BOPP NORMAL', micras: 20, ancho: 780, kg: 0, producto: 'CALI POLET - OSTIS', importado: false },
    { id: 'INV015', material: 'BOPP NORMAL', micras: 20, ancho: 800, kg: 0, producto: 'YICITOS', importado: false },
    { id: 'INV017', material: 'BOPP NORMAL', micras: 25, ancho: 460, kg: 0, producto: 'LECHE', importado: false },
    { id: 'INV019', material: 'BOPP NORMAL', micras: 25, ancho: 490, kg: 538.1, producto: '', importado: false },
    { id: 'INV021', material: 'BOPP NORMAL', micras: 25, ancho: 560, kg: 9648.67, producto: 'GRANOS', importado: true },
    { id: 'INV023', material: 'BOPP NORMAL', micras: 25, ancho: 580, kg: 0, producto: 'GRANOS', importado: false },
    { id: 'INV025', material: 'BOPP NORMAL', micras: 25, ancho: 620, kg: 0, producto: 'GISELA LARGA', importado: false },
    { id: 'INV027', material: 'BOPP NORMAL', micras: 25, ancho: 635, kg: 134.4, producto: 'GELATINA', importado: false },
    { id: 'INV029', material: 'BOPP NORMAL', micras: 25, ancho: 640, kg: 379.7, producto: '', importado: false },
    { id: 'INV030', material: 'BOPP NORMAL', micras: 25, ancho: 670, kg: 273.4, producto: '', importado: false },
    { id: 'INV032', material: 'BOPP NORMAL', micras: 25, ancho: 680, kg: 858.0, producto: 'AVENAS / CARAOTAS ALVARIGUA', importado: false },
    { id: 'INV034', material: 'BOPP NORMAL', micras: 25, ancho: 680, kg: 2843.42, producto: '', importado: true },
    { id: 'INV036', material: 'BOPP NORMAL', micras: 25, ancho: 740, kg: 206.67, producto: 'ETIQUETA Y BARITO', importado: false },
    { id: 'INV038', material: 'BOPP NORMAL', micras: 25, ancho: 760, kg: 5249.76, producto: 'LECHE 200g CREMA A.', importado: false },
    { id: 'INV040', material: 'BOPP NORMAL', micras: 25, ancho: 770, kg: 0, producto: 'NUTRITONY', importado: false },
    { id: 'INV042', material: 'BOPP NORMAL', micras: 25, ancho: 780, kg: 0, producto: 'CALI POLET-OSTIS', importado: false },
    { id: 'INV044', material: 'BOPP NORMAL', micras: 25, ancho: 815, kg: 0, producto: 'CAFE 200', importado: false },
    { id: 'INV046', material: 'BOPP NORMAL', micras: 25, ancho: 1120, kg: 0, producto: 'PUIG 24g', importado: false },
    { id: 'INV048', material: 'BOPP NORMAL', micras: 30, ancho: 440, kg: 0, producto: 'PUIG 240g', importado: false },
    { id: 'INV050', material: 'BOPP NORMAL', micras: 30, ancho: 450, kg: 0, producto: '', importado: false },
    { id: 'INV052', material: 'BOPP NORMAL', micras: 30, ancho: 460, kg: 0, producto: 'LECHE', importado: false },
    { id: 'INV054', material: 'BOPP NORMAL', micras: 30, ancho: 620, kg: 136.8, producto: '', importado: false },
    { id: 'INV056', material: 'BOPP NORMAL', micras: 30, ancho: 700, kg: 0, producto: 'CAFE 500g', importado: false },
    { id: 'INV058', material: 'BOPP NORMAL', micras: 30, ancho: 720, kg: 365.78, producto: '', importado: false },
    { id: 'INV060', material: 'BOPP NORMAL', micras: 30, ancho: 740, kg: 4596.3, producto: 'MICAELA', importado: true },
    { id: 'INV062', material: 'BOPP NORMAL', micras: 30, ancho: 760, kg: 0, producto: 'TRINKETS 40g', importado: false },
    { id: 'INV064', material: 'BOPP NORMAL', micras: 30, ancho: 760, kg: 2348.6, producto: '', importado: true },
    { id: 'INV066', material: 'BOPP NORMAL', micras: 30, ancho: 770, kg: 0, producto: 'LECHE', importado: false },
    { id: 'INV068', material: 'BOPP NORMAL', micras: 30, ancho: 800, kg: 0, producto: 'DAMASCO', importado: false },
    { id: 'INV070', material: 'BOPP NORMAL', micras: 30, ancho: 815, kg: 0, producto: 'CAFE 200g', importado: false },
    { id: 'INV072', material: 'BOPP NORMAL', micras: 30, ancho: 870, kg: 0, producto: 'TRINKETS 70g', importado: false },
    { id: 'INV074', material: 'BOPP NORMAL', micras: 30, ancho: 870, kg: 7767.86, producto: '', importado: true },
    { id: 'INV076', material: 'BOPP NORMAL', micras: 35, ancho: 700, kg: 889.2, producto: '', importado: false },
    { id: 'INV078', material: 'BOPP NORMAL', micras: 35, ancho: 700, kg: 1487.98, producto: 'MASANTONI- FINA', importado: true },
    { id: 'INV080', material: 'BOPP NORMAL', micras: 40, ancho: 1000, kg: 556.0, producto: '', importado: false },
    // BOPP MATE
    { id: 'INV002', material: 'BOPP MATE', micras: 20, ancho: 470, kg: 54.0, producto: '', importado: false },
    { id: 'INV004', material: 'BOPP MATE', micras: 20, ancho: 590, kg: 0, producto: 'YOCOIMA 200', importado: false },
    { id: 'INV006', material: 'BOPP MATE', micras: 20, ancho: 630, kg: 0, producto: 'NATY', importado: false },
    { id: 'INV008', material: 'BOPP MATE', micras: 20, ancho: 640, kg: 0, producto: 'YOCOIMA 500', importado: false },
    { id: 'INV010', material: 'BOPP MATE', micras: 20, ancho: 680, kg: 0, producto: 'ESPIGA-AVENA DONA', importado: false },
    { id: 'INV012', material: 'BOPP MATE', micras: 20, ancho: 690, kg: 0, producto: '', importado: false },
    { id: 'INV014', material: 'BOPP MATE', micras: 20, ancho: 700, kg: 499.56, producto: 'CAFE 500g', importado: true },
    { id: 'INV016', material: 'BOPP MATE', micras: 20, ancho: 740, kg: 0, producto: 'BARITOS', importado: false },
    { id: 'INV018', material: 'BOPP MATE', micras: 20, ancho: 755, kg: 0, producto: 'YOCOIMA 100', importado: false },
    { id: 'INV020', material: 'BOPP MATE', micras: 20, ancho: 760, kg: 0, producto: '', importado: false },
    { id: 'INV022', material: 'BOPP MATE', micras: 20, ancho: 815, kg: 1826.52, producto: 'CAFE 200g', importado: true },
    { id: 'INV024', material: 'BOPP MATE', micras: 25, ancho: 580, kg: 0, producto: 'CACAO', importado: false },
    { id: 'INV026', material: 'BOPP MATE', micras: 25, ancho: 740, kg: 0, producto: 'BUDARE', importado: false },
    { id: 'INV028', material: 'BOPP MATE', micras: 25, ancho: 800, kg: 0, producto: '', importado: false },
    // METAL
    { id: 'INV031', material: 'METAL', micras: 17, ancho: 620, kg: 498.0, producto: '', importado: false },
    { id: 'INV033', material: 'METAL', micras: 20, ancho: 460, kg: 0, producto: 'LECHE 900g Y 1 kg', importado: false },
    { id: 'INV035', material: 'METAL', micras: 20, ancho: 610, kg: 1593.4, producto: 'HASHI - CHUNCHY', importado: false },
    { id: 'INV037', material: 'METAL', micras: 20, ancho: 620, kg: 250.6, producto: '', importado: false },
    { id: 'INV039', material: 'METAL', micras: 20, ancho: 630, kg: 0, producto: 'NATY', importado: false },
    { id: 'INV041', material: 'METAL', micras: 20, ancho: 635, kg: 0, producto: 'GELATINA', importado: false },
    { id: 'INV043', material: 'METAL', micras: 20, ancho: 660, kg: 0, producto: 'OSTIS - MARGARINA', importado: false },
    { id: 'INV045', material: 'METAL', micras: 20, ancho: 680, kg: 0, producto: 'ESPIGA', importado: false },
    { id: 'INV047', material: 'METAL', micras: 20, ancho: 700, kg: 0, producto: 'CAFE 500 GR', importado: false },
    { id: 'INV049', material: 'METAL', micras: 20, ancho: 720, kg: 1634.0, producto: '', importado: false },
    { id: 'INV051', material: 'METAL', micras: 20, ancho: 740, kg: 1343.89, producto: 'ETIQUETA Y BARITOS', importado: false },
    { id: 'INV053', material: 'METAL', micras: 20, ancho: 760, kg: 0, producto: 'LECHE 200g CREMA A', importado: false },
    { id: 'INV055', material: 'METAL', micras: 20, ancho: 770, kg: 0, producto: 'NUTRITONI', importado: false },
    { id: 'INV057', material: 'METAL', micras: 20, ancho: 780, kg: 274.52, producto: 'POLET-OSTI', importado: false },
    { id: 'INV059', material: 'METAL', micras: 20, ancho: 800, kg: 403.68, producto: 'DAMASCO - YIICITOS', importado: false },
    { id: 'INV061', material: 'METAL', micras: 20, ancho: 815, kg: 0, producto: 'CAFE 200', importado: false },
    { id: 'INV063', material: 'METAL', micras: 25, ancho: 740, kg: 21.0, producto: '', importado: false },
    { id: 'INV065', material: 'METAL', micras: 30, ancho: 460, kg: 340.32, producto: '', importado: false },
    { id: 'INV067', material: 'METAL', micras: 30, ancho: 510, kg: 17.0, producto: '', importado: false },
    { id: 'INV069', material: 'METAL', micras: 30, ancho: 590, kg: 221.74, producto: 'YOCOIMA 200', importado: false },
    { id: 'INV071', material: 'METAL', micras: 30, ancho: 640, kg: 0, producto: 'YOCOIMA 500', importado: false },
    { id: 'INV073', material: 'METAL', micras: 30, ancho: 700, kg: 1187.76, producto: 'CAFE 500 ALVARIGUA', importado: true },
    { id: 'INV075', material: 'METAL', micras: 30, ancho: 755, kg: 0, producto: 'YOCOIMA 100', importado: false },
    { id: 'INV077', material: 'METAL', micras: 30, ancho: 815, kg: 1412.56, producto: 'CAFE 200 MATE', importado: false },
    { id: 'INV079', material: 'METAL', micras: 30, ancho: 815, kg: 3899.02, producto: '', importado: true },
    // PERLADO
    { id: 'INV081', material: 'PERLADO', micras: 30, ancho: 740, kg: 602.77, producto: 'CALI', importado: false },
    { id: 'INV082', material: 'PERLADO', micras: 30, ancho: 900, kg: 98.0, producto: '', importado: false },
    // CAST
    { id: 'INV083', material: 'CAST', micras: 20, ancho: 580, kg: 11.0, producto: 'GRANOS', importado: false },
    { id: 'INV085', material: 'CAST', micras: 25, ancho: 430, kg: 800.4, producto: 'SIRENA 500', importado: false },
    { id: 'INV087', material: 'CAST', micras: 25, ancho: 470, kg: 1130.79, producto: 'INALSA', importado: false },
    { id: 'INV089', material: 'CAST', micras: 25, ancho: 490, kg: 6329.25, producto: '', importado: true },
    { id: 'INV091', material: 'CAST', micras: 25, ancho: 490, kg: 2351.05, producto: 'SIRENA CORTA', importado: false },
    { id: 'INV093', material: 'CAST', micras: 25, ancho: 520, kg: 0, producto: 'GISELA CORTA', importado: false },
    { id: 'INV095', material: 'CAST', micras: 25, ancho: 560, kg: 148.43, producto: 'GRANOS', importado: false },
    { id: 'INV097', material: 'CAST', micras: 25, ancho: 560, kg: 9998.52, producto: '', importado: true },
    { id: 'INV099', material: 'CAST', micras: 25, ancho: 570, kg: 0, producto: 'OJO D\'VITA', importado: false },
    { id: 'INV101', material: 'CAST', micras: 25, ancho: 574, kg: 0, producto: 'INALSA', importado: false },
    { id: 'INV103', material: 'CAST', micras: 25, ancho: 580, kg: 0, producto: 'GRANOS', importado: false },
    { id: 'INV105', material: 'CAST', micras: 25, ancho: 620, kg: 888.66, producto: '', importado: true },
    { id: 'INV107', material: 'CAST', micras: 25, ancho: 620, kg: 2155.7, producto: 'SIRENA LARGA', importado: false },
    { id: 'INV109', material: 'CAST', micras: 25, ancho: 660, kg: 0, producto: '', importado: false },
    { id: 'INV111', material: 'CAST', micras: 25, ancho: 674, kg: 0, producto: 'INALSA', importado: false },
    { id: 'INV113', material: 'CAST', micras: 25, ancho: 680, kg: 370.72, producto: 'AVENA Y ZAFIRO', importado: false },
    { id: 'INV115', material: 'CAST', micras: 25, ancho: 680, kg: 6710.46, producto: '', importado: true },
    { id: 'INV117', material: 'CAST', micras: 25, ancho: 700, kg: 1449.68, producto: '', importado: true },
    { id: 'INV119', material: 'CAST', micras: 25, ancho: 700, kg: 1225.3, producto: 'FINA BLOQ', importado: false },
    { id: 'INV121', material: 'CAST', micras: 25, ancho: 720, kg: 3.0, producto: 'INALSA', importado: false },
    { id: 'INV123', material: 'CAST', micras: 25, ancho: 740, kg: 620.48, producto: 'MICAELA', importado: true },
    { id: 'INV125', material: 'CAST', micras: 25, ancho: 760, kg: 400.52, producto: '', importado: false },
    { id: 'INV127', material: 'CAST', micras: 25, ancho: 800, kg: 155.0, producto: 'BABO 72', importado: false },
    { id: 'INV129', material: 'CAST', micras: 30, ancho: 430, kg: 1256.8, producto: '', importado: false },
    { id: 'INV131', material: 'CAST', micras: 30, ancho: 600, kg: 2324.4, producto: '', importado: false },
    { id: 'INV133', material: 'CAST', micras: 30, ancho: 700, kg: 959.34, producto: 'MI MASA900 G', importado: true },
    { id: 'INV135', material: 'CAST', micras: 30, ancho: 740, kg: 0, producto: 'BUDARE', importado: false },
    { id: 'INV137', material: 'CAST', micras: 35, ancho: 770, kg: 0, producto: 'BUDARE', importado: false },
    // BOPP PASTA
    { id: 'INV139', material: 'BOPP PASTA', micras: 25, ancho: 430, kg: 877.8, producto: 'SIRENA 500', importado: false },
    { id: 'INV141', material: 'BOPP PASTA', micras: 25, ancho: 470, kg: 780.55, producto: 'INALSA', importado: false },
    { id: 'INV143', material: 'BOPP PASTA', micras: 25, ancho: 490, kg: 927.4, producto: 'SIRENA CORTA', importado: false },
    { id: 'INV145', material: 'BOPP PASTA', micras: 25, ancho: 490, kg: 5867.7, producto: '', importado: true },
    { id: 'INV147', material: 'BOPP PASTA', micras: 25, ancho: 520, kg: 0, producto: 'GISELA CORTA', importado: false },
    { id: 'INV149', material: 'BOPP PASTA', micras: 25, ancho: 574, kg: 0, producto: 'INALSA', importado: false },
    { id: 'INV151', material: 'BOPP PASTA', micras: 25, ancho: 620, kg: 499.15, producto: 'SIRENA LARGA', importado: false },
    { id: 'INV153', material: 'BOPP PASTA', micras: 25, ancho: 620, kg: 2023.86, producto: '', importado: true },
    { id: 'INV155', material: 'BOPP PASTA', micras: 25, ancho: 674, kg: 0, producto: 'INALSA', importado: false },
    // PEBD
    { id: 'INV084', material: 'PEBD', micras: 20, ancho: 760, kg: 369.0, producto: '', importado: false },
    { id: 'INV086', material: 'PEBD', micras: 22, ancho: 660, kg: 0, producto: 'ARROZ DON JULIAN', importado: false },
    { id: 'INV088', material: 'PEBD', micras: 25, ancho: 630, kg: 0, producto: 'MARY PREM', importado: false },
    { id: 'INV090', material: 'PEBD', micras: 25, ancho: 650, kg: 0, producto: 'MARY TRAD', importado: false },
    { id: 'INV092', material: 'PEBD', micras: 25, ancho: 660, kg: 0, producto: 'DON JULIAN', importado: false },
    { id: 'INV094', material: 'PEBD', micras: 25, ancho: 970, kg: 0, producto: 'MARY TRAD', importado: false },
    { id: 'INV096', material: 'PEBD', micras: 26, ancho: 630, kg: 419.5, producto: 'MARY PREMIUM', importado: false },
    { id: 'INV098', material: 'PEBD', micras: 26, ancho: 650, kg: 60.0, producto: 'MARY', importado: false },
    { id: 'INV100', material: 'PEBD', micras: 26, ancho: 660, kg: 0, producto: 'DON JULIAN', importado: false },
    { id: 'INV102', material: 'PEBD', micras: 28, ancho: 660, kg: 0, producto: '', importado: false },
    { id: 'INV104', material: 'PEBD', micras: 28, ancho: 670, kg: 0, producto: 'ARROZ SANTONI /ALICIA', importado: false },
    { id: 'INV106', material: 'PEBD', micras: 28, ancho: 670, kg: 12563.5, producto: 'ARROZ SANTONI /ALICIA', importado: false },
    { id: 'INV108', material: 'PEBD', micras: 28, ancho: 760, kg: 1890.5, producto: 'BUDARE - FATY', importado: false },
    { id: 'INV110', material: 'PEBD', micras: 28, ancho: 690, kg: 154.0, producto: '', importado: false },
    { id: 'INV112', material: 'PEBD', micras: 28, ancho: 990, kg: 0, producto: '', importado: false },
    { id: 'INV114', material: 'PEBD', micras: 30, ancho: 570, kg: 0, producto: 'D\'VITA', importado: false },
    { id: 'INV116', material: 'PEBD', micras: 30, ancho: 670, kg: 0, producto: 'SANTONI', importado: false },
    { id: 'INV118', material: 'PEBD', micras: 30, ancho: 690, kg: 0, producto: 'DELICIAS - DUQUESA', importado: false },
    { id: 'INV120', material: 'PEBD', micras: 30, ancho: 750, kg: 58.0, producto: 'HARINA URBANO', importado: false },
    { id: 'INV122', material: 'PEBD', micras: 30, ancho: 760, kg: 0, producto: 'HARINA', importado: false },
    { id: 'INV124', material: 'PEBD', micras: 30, ancho: 990, kg: 0, producto: '', importado: false },
    { id: 'INV126', material: 'PEBD', micras: 35, ancho: 650, kg: 0, producto: 'GELATINA JUMPI', importado: false },
    { id: 'INV128', material: 'PEBD', micras: 35, ancho: 750, kg: 0, producto: 'LECHE LAM', importado: false },
    { id: 'INV130', material: 'PEBD', micras: 35, ancho: 770, kg: 0, producto: 'LECHE', importado: false },
    { id: 'INV132', material: 'PEBD', micras: 35, ancho: 990, kg: 1226.5, producto: '', importado: false },
    { id: 'INV134', material: 'PEBD', micras: 38, ancho: 750, kg: 0, producto: 'PAVECA', importado: false },
    { id: 'INV136', material: 'PEBD', micras: 40, ancho: 670, kg: 189.5, producto: 'ZAFIRO VIEJO', importado: false },
    { id: 'INV138', material: 'PEBD', micras: 40, ancho: 690, kg: 0, producto: '', importado: false },
    { id: 'INV140', material: 'PEBD', micras: 40, ancho: 780, kg: 0, producto: 'NUTRITONY', importado: false },
    { id: 'INV142', material: 'PEBD', micras: 40, ancho: 990, kg: 0, producto: 'DON JULIAN 2,5', importado: false },
    { id: 'INV144', material: 'PEBD', micras: 45, ancho: 690, kg: 476.5, producto: '', importado: false },
    { id: 'INV146', material: 'PEBD', micras: 50, ancho: 440, kg: 234.5, producto: '', importado: false },
    { id: 'INV148', material: 'PEBD', micras: 50, ancho: 470, kg: 937.0, producto: 'LECHE', importado: false },
    { id: 'INV150', material: 'PEBD', micras: 50, ancho: 630, kg: 2818.0, producto: 'MARY DORADO', importado: false },
    { id: 'INV152', material: 'PEBD', micras: 50, ancho: 660, kg: 1541.0, producto: 'MARY ESMERALDA', importado: false },
    { id: 'INV154', material: 'PEBD', micras: 50, ancho: 670, kg: 100.5, producto: '', importado: false },
    // PEBD PIGMENT
    { id: 'INV156', material: 'PEBD PIGMENT', micras: 25, ancho: 740, kg: 170.0, producto: 'MAYONESA', importado: false },
    { id: 'INV157', material: 'PEBD PIGMENT', micras: 25, ancho: 450, kg: 1179.0, producto: 'DETERGENTE', importado: false },
    { id: 'INV158', material: 'PEBD PIGMENT', micras: 35, ancho: 670, kg: 1569.5, producto: 'MARGARINA', importado: false }
  ];

  var ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  var sheet = ss.getSheetByName(SHEETS.INVENTARIO);

  if (!sheet) {
    sheet = ss.insertSheet(SHEETS.INVENTARIO);
    sheet.appendRow(INVENTARIO_HEADERS);
  }

  // Verificar si ya hay datos (mas de solo headers)
  var lastRow = sheet.getLastRow();
  if (lastRow > 1) {
    var ui = SpreadsheetApp.getUi();
    var resp = ui.alert(
      'Inventario ya tiene ' + (lastRow - 1) + ' filas.',
      'Desea BORRAR todo y recargar los 158 productos?',
      ui.ButtonSet.YES_NO
    );
    if (resp !== ui.Button.YES) {
      return { success: false, message: 'Cancelado por usuario' };
    }
    // Limpiar datos existentes (mantener headers)
    if (lastRow > 1) {
      sheet.deleteRows(2, lastRow - 1);
    }
  }

  // Preparar filas en lote (mucho mas rapido que appendRow individual)
  var rows = [];
  var ahora = new Date().toISOString();

  for (var i = 0; i < datos.length; i++) {
    var d = datos[i];
    var sku = generarSKU_(d.material, d.micras, d.ancho);
    var codigoBarra = generarCodigoBarra_(i + 1);
    var densidad = getDensidad_(d.material);

    // Orden debe coincidir con INVENTARIO_HEADERS:
    // id, sku, codigoBarra, material, micras, ancho, kg, producto, importado, densidad,
    // proveedor, ubicacion, lote, fechaIngreso, estado, ultimaActualizacion
    rows.push([
      d.id,
      sku,
      codigoBarra,
      d.material,
      d.micras,
      d.ancho,
      d.kg,
      d.producto,
      d.importado ? 'SI' : 'NO',
      densidad,
      d.importado ? 'Importado' : '',  // proveedor
      'Almacen',                        // ubicacion
      '',                               // lote
      ahora,                            // fechaIngreso
      'disponible',                     // estado
      ahora                             // ultimaActualizacion
    ]);
  }

  // Escribir todas las filas de golpe
  sheet.getRange(2, 1, rows.length, INVENTARIO_HEADERS.length).setValues(rows);

  // Formatear la hoja
  sheet.setFrozenRows(1);
  sheet.getRange(1, 1, 1, INVENTARIO_HEADERS.length)
    .setFontWeight('bold')
    .setBackground('#4285f4')
    .setFontColor('white');

  // Auto-resize columnas
  for (var c = 1; c <= INVENTARIO_HEADERS.length; c++) {
    sheet.autoResizeColumn(c);
  }

  Logger.log('Inventario cargado: ' + datos.length + ' productos');
  return { success: true, message: 'Inventario cargado: ' + datos.length + ' productos' };
}

/**
 * Version sin UI de cargarInventarioInicial - se puede llamar desde la API o el editor
 * Borra el inventario existente y recarga los 158 productos
 * NO usa SpreadsheetApp.getUi() - seguro para cualquier contexto
 */
function cargarInventarioDesdeAPI() {
  var ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  var sheet = ss.getSheetByName(SHEETS.INVENTARIO);

  if (!sheet) {
    sheet = ss.insertSheet(SHEETS.INVENTARIO);
    sheet.appendRow(INVENTARIO_HEADERS);
  }

  // Limpiar datos existentes (mantener headers)
  var lastRow = sheet.getLastRow();
  if (lastRow > 1) {
    sheet.deleteRows(2, lastRow - 1);
  }

  // Los 158 productos reales de Axones
  var datos = [
    // BOPP NORMAL
    { id: 'INV001', material: 'BOPP NORMAL', micras: 15, ancho: 700, kg: 73.0, producto: 'CHARMY', importado: false },
    { id: 'INV003', material: 'BOPP NORMAL', micras: 17, ancho: 620, kg: 283.2, producto: 'TOM 80', importado: false },
    { id: 'INV005', material: 'BOPP NORMAL', micras: 17, ancho: 710, kg: 46.0, producto: 'TOM 28', importado: false },
    { id: 'INV007', material: 'BOPP NORMAL', micras: 20, ancho: 610, kg: 2215.02, producto: 'HASHI - CHUNCHY', importado: false },
    { id: 'INV009', material: 'BOPP NORMAL', micras: 20, ancho: 630, kg: 0, producto: 'NATY', importado: false },
    { id: 'INV011', material: 'BOPP NORMAL', micras: 20, ancho: 740, kg: 0, producto: 'CALI DONA', importado: false },
    { id: 'INV013', material: 'BOPP NORMAL', micras: 20, ancho: 780, kg: 0, producto: 'CALI POLET - OSTIS', importado: false },
    { id: 'INV015', material: 'BOPP NORMAL', micras: 20, ancho: 800, kg: 0, producto: 'YICITOS', importado: false },
    { id: 'INV017', material: 'BOPP NORMAL', micras: 25, ancho: 460, kg: 0, producto: 'LECHE', importado: false },
    { id: 'INV019', material: 'BOPP NORMAL', micras: 25, ancho: 490, kg: 538.1, producto: '', importado: false },
    { id: 'INV021', material: 'BOPP NORMAL', micras: 25, ancho: 560, kg: 9648.67, producto: 'GRANOS', importado: true },
    { id: 'INV023', material: 'BOPP NORMAL', micras: 25, ancho: 580, kg: 0, producto: 'GRANOS', importado: false },
    { id: 'INV025', material: 'BOPP NORMAL', micras: 25, ancho: 620, kg: 0, producto: 'GISELA LARGA', importado: false },
    { id: 'INV027', material: 'BOPP NORMAL', micras: 25, ancho: 635, kg: 134.4, producto: 'GELATINA', importado: false },
    { id: 'INV029', material: 'BOPP NORMAL', micras: 25, ancho: 640, kg: 379.7, producto: '', importado: false },
    { id: 'INV030', material: 'BOPP NORMAL', micras: 25, ancho: 670, kg: 273.4, producto: '', importado: false },
    { id: 'INV032', material: 'BOPP NORMAL', micras: 25, ancho: 680, kg: 858.0, producto: 'AVENAS / CARAOTAS ALVARIGUA', importado: false },
    { id: 'INV034', material: 'BOPP NORMAL', micras: 25, ancho: 680, kg: 2843.42, producto: '', importado: true },
    { id: 'INV036', material: 'BOPP NORMAL', micras: 25, ancho: 740, kg: 206.67, producto: 'ETIQUETA Y BARITO', importado: false },
    { id: 'INV038', material: 'BOPP NORMAL', micras: 25, ancho: 760, kg: 5249.76, producto: 'LECHE 200g CREMA A.', importado: false },
    { id: 'INV040', material: 'BOPP NORMAL', micras: 25, ancho: 770, kg: 0, producto: 'NUTRITONY', importado: false },
    { id: 'INV042', material: 'BOPP NORMAL', micras: 25, ancho: 780, kg: 0, producto: 'CALI POLET-OSTIS', importado: false },
    { id: 'INV044', material: 'BOPP NORMAL', micras: 25, ancho: 815, kg: 0, producto: 'CAFE 200', importado: false },
    { id: 'INV046', material: 'BOPP NORMAL', micras: 25, ancho: 1120, kg: 0, producto: 'PUIG 24g', importado: false },
    { id: 'INV048', material: 'BOPP NORMAL', micras: 30, ancho: 440, kg: 0, producto: 'PUIG 240g', importado: false },
    { id: 'INV050', material: 'BOPP NORMAL', micras: 30, ancho: 450, kg: 0, producto: '', importado: false },
    { id: 'INV052', material: 'BOPP NORMAL', micras: 30, ancho: 460, kg: 0, producto: 'LECHE', importado: false },
    { id: 'INV054', material: 'BOPP NORMAL', micras: 30, ancho: 620, kg: 136.8, producto: '', importado: false },
    { id: 'INV056', material: 'BOPP NORMAL', micras: 30, ancho: 700, kg: 0, producto: 'CAFE 500g', importado: false },
    { id: 'INV058', material: 'BOPP NORMAL', micras: 30, ancho: 720, kg: 365.78, producto: '', importado: false },
    { id: 'INV060', material: 'BOPP NORMAL', micras: 30, ancho: 740, kg: 4596.3, producto: 'MICAELA', importado: true },
    { id: 'INV062', material: 'BOPP NORMAL', micras: 30, ancho: 760, kg: 0, producto: 'TRINKETS 40g', importado: false },
    { id: 'INV064', material: 'BOPP NORMAL', micras: 30, ancho: 760, kg: 2348.6, producto: '', importado: true },
    { id: 'INV066', material: 'BOPP NORMAL', micras: 30, ancho: 770, kg: 0, producto: 'LECHE', importado: false },
    { id: 'INV068', material: 'BOPP NORMAL', micras: 30, ancho: 800, kg: 0, producto: 'DAMASCO', importado: false },
    { id: 'INV070', material: 'BOPP NORMAL', micras: 30, ancho: 815, kg: 0, producto: 'CAFE 200g', importado: false },
    { id: 'INV072', material: 'BOPP NORMAL', micras: 30, ancho: 870, kg: 0, producto: 'TRINKETS 70g', importado: false },
    { id: 'INV074', material: 'BOPP NORMAL', micras: 30, ancho: 870, kg: 7767.86, producto: '', importado: true },
    { id: 'INV076', material: 'BOPP NORMAL', micras: 35, ancho: 700, kg: 889.2, producto: '', importado: false },
    { id: 'INV078', material: 'BOPP NORMAL', micras: 35, ancho: 700, kg: 1487.98, producto: 'MASANTONI- FINA', importado: true },
    { id: 'INV080', material: 'BOPP NORMAL', micras: 40, ancho: 1000, kg: 556.0, producto: '', importado: false },
    // BOPP MATE
    { id: 'INV002', material: 'BOPP MATE', micras: 20, ancho: 470, kg: 54.0, producto: '', importado: false },
    { id: 'INV004', material: 'BOPP MATE', micras: 20, ancho: 590, kg: 0, producto: 'YOCOIMA 200', importado: false },
    { id: 'INV006', material: 'BOPP MATE', micras: 20, ancho: 630, kg: 0, producto: 'NATY', importado: false },
    { id: 'INV008', material: 'BOPP MATE', micras: 20, ancho: 640, kg: 0, producto: 'YOCOIMA 500', importado: false },
    { id: 'INV010', material: 'BOPP MATE', micras: 20, ancho: 680, kg: 0, producto: 'ESPIGA-AVENA DONA', importado: false },
    { id: 'INV012', material: 'BOPP MATE', micras: 20, ancho: 690, kg: 0, producto: '', importado: false },
    { id: 'INV014', material: 'BOPP MATE', micras: 20, ancho: 700, kg: 499.56, producto: 'CAFE 500g', importado: true },
    { id: 'INV016', material: 'BOPP MATE', micras: 20, ancho: 740, kg: 0, producto: 'BARITOS', importado: false },
    { id: 'INV018', material: 'BOPP MATE', micras: 20, ancho: 755, kg: 0, producto: 'YOCOIMA 100', importado: false },
    { id: 'INV020', material: 'BOPP MATE', micras: 20, ancho: 760, kg: 0, producto: '', importado: false },
    { id: 'INV022', material: 'BOPP MATE', micras: 20, ancho: 815, kg: 1826.52, producto: 'CAFE 200g', importado: true },
    { id: 'INV024', material: 'BOPP MATE', micras: 25, ancho: 580, kg: 0, producto: 'CACAO', importado: false },
    { id: 'INV026', material: 'BOPP MATE', micras: 25, ancho: 740, kg: 0, producto: 'BUDARE', importado: false },
    { id: 'INV028', material: 'BOPP MATE', micras: 25, ancho: 800, kg: 0, producto: '', importado: false },
    // METAL
    { id: 'INV031', material: 'METAL', micras: 17, ancho: 620, kg: 498.0, producto: '', importado: false },
    { id: 'INV033', material: 'METAL', micras: 20, ancho: 460, kg: 0, producto: 'LECHE 900g Y 1 kg', importado: false },
    { id: 'INV035', material: 'METAL', micras: 20, ancho: 610, kg: 1593.4, producto: 'HASHI - CHUNCHY', importado: false },
    { id: 'INV037', material: 'METAL', micras: 20, ancho: 620, kg: 250.6, producto: '', importado: false },
    { id: 'INV039', material: 'METAL', micras: 20, ancho: 630, kg: 0, producto: 'NATY', importado: false },
    { id: 'INV041', material: 'METAL', micras: 20, ancho: 635, kg: 0, producto: 'GELATINA', importado: false },
    { id: 'INV043', material: 'METAL', micras: 20, ancho: 660, kg: 0, producto: 'OSTIS - MARGARINA', importado: false },
    { id: 'INV045', material: 'METAL', micras: 20, ancho: 680, kg: 0, producto: 'ESPIGA', importado: false },
    { id: 'INV047', material: 'METAL', micras: 20, ancho: 700, kg: 0, producto: 'CAFE 500 GR', importado: false },
    { id: 'INV049', material: 'METAL', micras: 20, ancho: 720, kg: 1634.0, producto: '', importado: false },
    { id: 'INV051', material: 'METAL', micras: 20, ancho: 740, kg: 1343.89, producto: 'ETIQUETA Y BARITOS', importado: false },
    { id: 'INV053', material: 'METAL', micras: 20, ancho: 760, kg: 0, producto: 'LECHE 200g CREMA A', importado: false },
    { id: 'INV055', material: 'METAL', micras: 20, ancho: 770, kg: 0, producto: 'NUTRITONI', importado: false },
    { id: 'INV057', material: 'METAL', micras: 20, ancho: 780, kg: 274.52, producto: 'POLET-OSTI', importado: false },
    { id: 'INV059', material: 'METAL', micras: 20, ancho: 800, kg: 403.68, producto: 'DAMASCO - YIICITOS', importado: false },
    { id: 'INV061', material: 'METAL', micras: 20, ancho: 815, kg: 0, producto: 'CAFE 200', importado: false },
    { id: 'INV063', material: 'METAL', micras: 25, ancho: 740, kg: 21.0, producto: '', importado: false },
    { id: 'INV065', material: 'METAL', micras: 30, ancho: 460, kg: 340.32, producto: '', importado: false },
    { id: 'INV067', material: 'METAL', micras: 30, ancho: 510, kg: 17.0, producto: '', importado: false },
    { id: 'INV069', material: 'METAL', micras: 30, ancho: 590, kg: 221.74, producto: 'YOCOIMA 200', importado: false },
    { id: 'INV071', material: 'METAL', micras: 30, ancho: 640, kg: 0, producto: 'YOCOIMA 500', importado: false },
    { id: 'INV073', material: 'METAL', micras: 30, ancho: 700, kg: 1187.76, producto: 'CAFE 500 ALVARIGUA', importado: true },
    { id: 'INV075', material: 'METAL', micras: 30, ancho: 755, kg: 0, producto: 'YOCOIMA 100', importado: false },
    { id: 'INV077', material: 'METAL', micras: 30, ancho: 815, kg: 1412.56, producto: 'CAFE 200 MATE', importado: false },
    { id: 'INV079', material: 'METAL', micras: 30, ancho: 815, kg: 3899.02, producto: '', importado: true },
    // PERLADO
    { id: 'INV081', material: 'PERLADO', micras: 30, ancho: 740, kg: 602.77, producto: 'CALI', importado: false },
    { id: 'INV082', material: 'PERLADO', micras: 30, ancho: 900, kg: 98.0, producto: '', importado: false },
    // CAST
    { id: 'INV083', material: 'CAST', micras: 20, ancho: 580, kg: 11.0, producto: 'GRANOS', importado: false },
    { id: 'INV085', material: 'CAST', micras: 25, ancho: 430, kg: 800.4, producto: 'SIRENA 500', importado: false },
    { id: 'INV087', material: 'CAST', micras: 25, ancho: 470, kg: 1130.79, producto: 'INALSA', importado: false },
    { id: 'INV089', material: 'CAST', micras: 25, ancho: 490, kg: 6329.25, producto: '', importado: true },
    { id: 'INV091', material: 'CAST', micras: 25, ancho: 490, kg: 2351.05, producto: 'SIRENA CORTA', importado: false },
    { id: 'INV093', material: 'CAST', micras: 25, ancho: 520, kg: 0, producto: 'GISELA CORTA', importado: false },
    { id: 'INV095', material: 'CAST', micras: 25, ancho: 560, kg: 148.43, producto: 'GRANOS', importado: false },
    { id: 'INV097', material: 'CAST', micras: 25, ancho: 560, kg: 9998.52, producto: '', importado: true },
    { id: 'INV099', material: 'CAST', micras: 25, ancho: 570, kg: 0, producto: 'OJO D\'VITA', importado: false },
    { id: 'INV101', material: 'CAST', micras: 25, ancho: 574, kg: 0, producto: 'INALSA', importado: false },
    { id: 'INV103', material: 'CAST', micras: 25, ancho: 580, kg: 0, producto: 'GRANOS', importado: false },
    { id: 'INV105', material: 'CAST', micras: 25, ancho: 620, kg: 888.66, producto: '', importado: true },
    { id: 'INV107', material: 'CAST', micras: 25, ancho: 620, kg: 2155.7, producto: 'SIRENA LARGA', importado: false },
    { id: 'INV109', material: 'CAST', micras: 25, ancho: 660, kg: 0, producto: '', importado: false },
    { id: 'INV111', material: 'CAST', micras: 25, ancho: 674, kg: 0, producto: 'INALSA', importado: false },
    { id: 'INV113', material: 'CAST', micras: 25, ancho: 680, kg: 370.72, producto: 'AVENA Y ZAFIRO', importado: false },
    { id: 'INV115', material: 'CAST', micras: 25, ancho: 680, kg: 6710.46, producto: '', importado: true },
    { id: 'INV117', material: 'CAST', micras: 25, ancho: 700, kg: 1449.68, producto: '', importado: true },
    { id: 'INV119', material: 'CAST', micras: 25, ancho: 700, kg: 1225.3, producto: 'FINA BLOQ', importado: false },
    { id: 'INV121', material: 'CAST', micras: 25, ancho: 720, kg: 3.0, producto: 'INALSA', importado: false },
    { id: 'INV123', material: 'CAST', micras: 25, ancho: 740, kg: 620.48, producto: 'MICAELA', importado: true },
    { id: 'INV125', material: 'CAST', micras: 25, ancho: 760, kg: 400.52, producto: '', importado: false },
    { id: 'INV127', material: 'CAST', micras: 25, ancho: 800, kg: 155.0, producto: 'BABO 72', importado: false },
    { id: 'INV129', material: 'CAST', micras: 30, ancho: 430, kg: 1256.8, producto: '', importado: false },
    { id: 'INV131', material: 'CAST', micras: 30, ancho: 600, kg: 2324.4, producto: '', importado: false },
    { id: 'INV133', material: 'CAST', micras: 30, ancho: 700, kg: 959.34, producto: 'MI MASA900 G', importado: true },
    { id: 'INV135', material: 'CAST', micras: 30, ancho: 740, kg: 0, producto: 'BUDARE', importado: false },
    { id: 'INV137', material: 'CAST', micras: 35, ancho: 770, kg: 0, producto: 'BUDARE', importado: false },
    // BOPP PASTA
    { id: 'INV139', material: 'BOPP PASTA', micras: 25, ancho: 430, kg: 877.8, producto: 'SIRENA 500', importado: false },
    { id: 'INV141', material: 'BOPP PASTA', micras: 25, ancho: 470, kg: 780.55, producto: 'INALSA', importado: false },
    { id: 'INV143', material: 'BOPP PASTA', micras: 25, ancho: 490, kg: 927.4, producto: 'SIRENA CORTA', importado: false },
    { id: 'INV145', material: 'BOPP PASTA', micras: 25, ancho: 490, kg: 5867.7, producto: '', importado: true },
    { id: 'INV147', material: 'BOPP PASTA', micras: 25, ancho: 520, kg: 0, producto: 'GISELA CORTA', importado: false },
    { id: 'INV149', material: 'BOPP PASTA', micras: 25, ancho: 574, kg: 0, producto: 'INALSA', importado: false },
    { id: 'INV151', material: 'BOPP PASTA', micras: 25, ancho: 620, kg: 499.15, producto: 'SIRENA LARGA', importado: false },
    { id: 'INV153', material: 'BOPP PASTA', micras: 25, ancho: 620, kg: 2023.86, producto: '', importado: true },
    { id: 'INV155', material: 'BOPP PASTA', micras: 25, ancho: 674, kg: 0, producto: 'INALSA', importado: false },
    // PEBD
    { id: 'INV084', material: 'PEBD', micras: 20, ancho: 760, kg: 369.0, producto: '', importado: false },
    { id: 'INV086', material: 'PEBD', micras: 22, ancho: 660, kg: 0, producto: 'ARROZ DON JULIAN', importado: false },
    { id: 'INV088', material: 'PEBD', micras: 25, ancho: 630, kg: 0, producto: 'MARY PREM', importado: false },
    { id: 'INV090', material: 'PEBD', micras: 25, ancho: 650, kg: 0, producto: 'MARY TRAD', importado: false },
    { id: 'INV092', material: 'PEBD', micras: 25, ancho: 660, kg: 0, producto: 'DON JULIAN', importado: false },
    { id: 'INV094', material: 'PEBD', micras: 25, ancho: 970, kg: 0, producto: 'MARY TRAD', importado: false },
    { id: 'INV096', material: 'PEBD', micras: 26, ancho: 630, kg: 419.5, producto: 'MARY PREMIUM', importado: false },
    { id: 'INV098', material: 'PEBD', micras: 26, ancho: 650, kg: 60.0, producto: 'MARY', importado: false },
    { id: 'INV100', material: 'PEBD', micras: 26, ancho: 660, kg: 0, producto: 'DON JULIAN', importado: false },
    { id: 'INV102', material: 'PEBD', micras: 28, ancho: 660, kg: 0, producto: '', importado: false },
    { id: 'INV104', material: 'PEBD', micras: 28, ancho: 670, kg: 0, producto: 'ARROZ SANTONI /ALICIA', importado: false },
    { id: 'INV106', material: 'PEBD', micras: 28, ancho: 670, kg: 12563.5, producto: 'ARROZ SANTONI /ALICIA', importado: false },
    { id: 'INV108', material: 'PEBD', micras: 28, ancho: 760, kg: 1890.5, producto: 'BUDARE - FATY', importado: false },
    { id: 'INV110', material: 'PEBD', micras: 28, ancho: 690, kg: 154.0, producto: '', importado: false },
    { id: 'INV112', material: 'PEBD', micras: 28, ancho: 990, kg: 0, producto: '', importado: false },
    { id: 'INV114', material: 'PEBD', micras: 30, ancho: 570, kg: 0, producto: 'D\'VITA', importado: false },
    { id: 'INV116', material: 'PEBD', micras: 30, ancho: 670, kg: 0, producto: 'SANTONI', importado: false },
    { id: 'INV118', material: 'PEBD', micras: 30, ancho: 690, kg: 0, producto: 'DELICIAS - DUQUESA', importado: false },
    { id: 'INV120', material: 'PEBD', micras: 30, ancho: 750, kg: 58.0, producto: 'HARINA URBANO', importado: false },
    { id: 'INV122', material: 'PEBD', micras: 30, ancho: 760, kg: 0, producto: 'HARINA', importado: false },
    { id: 'INV124', material: 'PEBD', micras: 30, ancho: 990, kg: 0, producto: '', importado: false },
    { id: 'INV126', material: 'PEBD', micras: 35, ancho: 650, kg: 0, producto: 'GELATINA JUMPI', importado: false },
    { id: 'INV128', material: 'PEBD', micras: 35, ancho: 750, kg: 0, producto: 'LECHE LAM', importado: false },
    { id: 'INV130', material: 'PEBD', micras: 35, ancho: 770, kg: 0, producto: 'LECHE', importado: false },
    { id: 'INV132', material: 'PEBD', micras: 35, ancho: 990, kg: 1226.5, producto: '', importado: false },
    { id: 'INV134', material: 'PEBD', micras: 38, ancho: 750, kg: 0, producto: 'PAVECA', importado: false },
    { id: 'INV136', material: 'PEBD', micras: 40, ancho: 670, kg: 189.5, producto: 'ZAFIRO VIEJO', importado: false },
    { id: 'INV138', material: 'PEBD', micras: 40, ancho: 690, kg: 0, producto: '', importado: false },
    { id: 'INV140', material: 'PEBD', micras: 40, ancho: 780, kg: 0, producto: 'NUTRITONY', importado: false },
    { id: 'INV142', material: 'PEBD', micras: 40, ancho: 990, kg: 0, producto: 'DON JULIAN 2,5', importado: false },
    { id: 'INV144', material: 'PEBD', micras: 45, ancho: 690, kg: 476.5, producto: '', importado: false },
    { id: 'INV146', material: 'PEBD', micras: 50, ancho: 440, kg: 234.5, producto: '', importado: false },
    { id: 'INV148', material: 'PEBD', micras: 50, ancho: 470, kg: 937.0, producto: 'LECHE', importado: false },
    { id: 'INV150', material: 'PEBD', micras: 50, ancho: 630, kg: 2818.0, producto: 'MARY DORADO', importado: false },
    { id: 'INV152', material: 'PEBD', micras: 50, ancho: 660, kg: 1541.0, producto: 'MARY ESMERALDA', importado: false },
    { id: 'INV154', material: 'PEBD', micras: 50, ancho: 670, kg: 100.5, producto: '', importado: false },
    // PEBD PIGMENT
    { id: 'INV156', material: 'PEBD PIGMENT', micras: 25, ancho: 740, kg: 170.0, producto: 'MAYONESA', importado: false },
    { id: 'INV157', material: 'PEBD PIGMENT', micras: 25, ancho: 450, kg: 1179.0, producto: 'DETERGENTE', importado: false },
    { id: 'INV158', material: 'PEBD PIGMENT', micras: 35, ancho: 670, kg: 1569.5, producto: 'MARGARINA', importado: false }
  ];

  // Preparar filas en lote
  var rows = [];
  var ahora = new Date().toISOString();

  for (var i = 0; i < datos.length; i++) {
    var d = datos[i];
    var sku = generarSKU_(d.material, d.micras, d.ancho);
    var codigoBarra = generarCodigoBarra_(i + 1);
    var densidad = getDensidad_(d.material);

    rows.push([
      d.id,
      sku,
      codigoBarra,
      d.material,
      d.micras,
      d.ancho,
      d.kg,
      d.producto,
      d.importado ? 'SI' : 'NO',
      densidad,
      d.importado ? 'Importado' : '',
      'Almacen',
      '',
      ahora,
      'disponible',
      ahora
    ]);
  }

  // Escribir todas las filas de golpe
  sheet.getRange(2, 1, rows.length, INVENTARIO_HEADERS.length).setValues(rows);

  // Formatear la hoja
  sheet.setFrozenRows(1);
  sheet.getRange(1, 1, 1, INVENTARIO_HEADERS.length)
    .setFontWeight('bold')
    .setBackground('#4285f4')
    .setFontColor('white');

  for (var c = 1; c <= INVENTARIO_HEADERS.length; c++) {
    sheet.autoResizeColumn(c);
  }

  Logger.log('Inventario cargado desde API: ' + datos.length + ' productos');
  return { success: true, message: 'Inventario cargado: ' + datos.length + ' productos', count: datos.length };
}

/**
 * Recibe TODO el inventario del frontend (localStorage) y lo sube al Sheets
 * Esto sincroniza el estado actual de la plataforma al Sheets
 */
function syncInventarioCompleto(data) {
  if (!data || !data.items || !Array.isArray(data.items)) {
    return { success: false, error: 'Se requiere data.items como array' };
  }

  var ss = SpreadsheetApp.openById(SPREADSHEET_ID);

  // Borrar y recrear para evitar desfase de headers
  var sheet = ss.getSheetByName(SHEETS.INVENTARIO);
  if (sheet) { ss.deleteSheet(sheet); }
  sheet = ss.insertSheet(SHEETS.INVENTARIO);
  sheet.appendRow(INVENTARIO_HEADERS);

  // Preparar filas
  var rows = [];
  var ahora = new Date().toISOString();

  data.items.forEach(function(item) {
    // Orden: id, sku, codigoBarra, material, micras, ancho, kg, producto, importado, densidad,
    //        proveedor, ubicacion, lote, fechaIngreso, estado, ultimaActualizacion
    rows.push([
      item.id || '',
      item.sku || '',
      item.codigoBarra || '',
      item.material || '',
      item.micras || '',
      item.ancho || '',
      item.kg || 0,
      item.producto || '',
      item.importado === true || item.importado === 'SI' ? 'SI' : 'NO',
      item.densidad || '',
      item.proveedor || '',
      item.ubicacion || 'Almacen',
      item.lote || '',
      item.fechaIngreso || ahora,
      item.estado || 'disponible',
      ahora
    ]);
  });

  if (rows.length > 0) {
    sheet.getRange(2, 1, rows.length, INVENTARIO_HEADERS.length).setValues(rows);
  }

  // Formatear
  sheet.setFrozenRows(1);
  sheet.getRange(1, 1, 1, INVENTARIO_HEADERS.length)
    .setFontWeight('bold')
    .setBackground('#4285f4')
    .setFontColor('white');

  logAuditoria('SYNC_INVENTARIO', 'INVENTARIO', 'COMPLETO', data.usuario || 'sistema');

  return { success: true, message: 'Inventario sincronizado: ' + rows.length + ' productos', count: rows.length };
}

// ============================================
// CARGA INICIAL DE TINTAS (58 productos)
// Basado en Excel 26-02-2026
// ============================================

function cargarTintasDesdeAPI() {
  var ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  var sheetName = SHEETS.TINTAS_INVENTARIO;
  var headers = ['id', 'nombre', 'tipo', 'codigo', 'cantidad', 'unidad', 'proveedor', 'ultimaActualizacion'];

  // Borrar y recrear para evitar desfase de headers
  var sheet = ss.getSheetByName(sheetName);
  if (sheet) { ss.deleteSheet(sheet); }
  sheet = ss.insertSheet(sheetName);
  sheet.appendRow(headers);

  var datos = [
    // Tintas Laminacion (43 items)
    { id: 'TIN001', nombre: 'BLANCO', tipo: 'laminacion', codigo: 'BL-2036', cantidad: 987.0, unidad: 'Kg' },
    { id: 'TIN002', nombre: 'BLANCO LAMINACION', tipo: 'laminacion', codigo: 'TINLAM-0001', cantidad: 0, unidad: 'Kg' },
    { id: 'TIN003', nombre: 'NEGRO', tipo: 'laminacion', codigo: 'BL-2054', cantidad: 221.0, unidad: 'Kg' },
    { id: 'TIN004', nombre: 'NEGRO', tipo: 'laminacion', codigo: 'TINLAM-0005', cantidad: 0, unidad: 'Kg' },
    { id: 'TIN005', nombre: 'NEGRO POLYESTER', tipo: 'laminacion', codigo: 'BL-1280', cantidad: 76.0, unidad: 'Kg' },
    { id: 'TIN006', nombre: 'NEGRO POLYESTER', tipo: 'laminacion', codigo: 'TINLAM-0008', cantidad: 0, unidad: 'Kg' },
    { id: 'TIN007', nombre: 'AMARILLO PROCESO', tipo: 'laminacion', codigo: 'BL-1132', cantidad: 992.0, unidad: 'Kg' },
    { id: 'TIN008', nombre: 'AMARILLO PROCESO', tipo: 'laminacion', codigo: 'TINLAM-0002', cantidad: 0, unidad: 'Kg' },
    { id: 'TIN009', nombre: 'ROJO 485 2X', tipo: 'laminacion', codigo: 'BL-0897', cantidad: 71.2, unidad: 'Kg' },
    { id: 'TIN010', nombre: 'ROJO P-485 2X-C', tipo: 'laminacion', codigo: 'TINLAM-0007', cantidad: 18.0, unidad: 'Kg' },
    { id: 'TIN011', nombre: 'ROJO 485 "C"', tipo: 'laminacion', codigo: 'BL-2037', cantidad: 195.4, unidad: 'Kg' },
    { id: 'TIN012', nombre: 'CYAN', tipo: 'laminacion', codigo: 'BL-1964', cantidad: 355.0, unidad: 'Kg' },
    { id: 'TIN013', nombre: 'AZUL PROCESO', tipo: 'laminacion', codigo: 'BL-1535', cantidad: 156.0, unidad: 'Kg' },
    { id: 'TIN014', nombre: 'AZUL PROCESO', tipo: 'laminacion', codigo: 'TINLAM-0003', cantidad: 18.0, unidad: 'Kg' },
    { id: 'TIN015', nombre: 'AZUL FONDO SUPERIOR', tipo: 'laminacion', codigo: 'BL-2163', cantidad: 198.0, unidad: 'Kg' },
    { id: 'TIN016', nombre: 'AZUL ESPIGA SUPERIOR', tipo: 'laminacion', codigo: 'BL-2164', cantidad: 0, unidad: 'Kg' },
    { id: 'TIN017', nombre: 'AZUL BUDARE LAMINACION', tipo: 'laminacion', codigo: 'BL-2260', cantidad: 0, unidad: 'Kg' },
    { id: 'TIN018', nombre: 'MAGENTA', tipo: 'laminacion', codigo: 'BL-1706', cantidad: 272.0, unidad: 'Kg' },
    { id: 'TIN019', nombre: 'MAGENTA TRAMA DIGITAL', tipo: 'laminacion', codigo: 'BL-2003', cantidad: 54.0, unidad: 'Kg' },
    { id: 'TIN020', nombre: 'REFLEX', tipo: 'laminacion', codigo: 'BL-1007', cantidad: 201.0, unidad: 'Kg' },
    { id: 'TIN021', nombre: 'NARANJA BUDARE LAMINACION', tipo: 'laminacion', codigo: 'BL-2259', cantidad: 0, unidad: 'Kg' },
    { id: 'TIN022', nombre: 'NARANJA 021', tipo: 'laminacion', codigo: 'BL-0985', cantidad: 68.0, unidad: 'Kg' },
    { id: 'TIN023', nombre: 'NARANJA MARY', tipo: 'laminacion', codigo: 'BL-2152', cantidad: 322.2, unidad: 'Kg' },
    { id: 'TIN024', nombre: 'EXTENDER', tipo: 'laminacion', codigo: 'BL-1883', cantidad: 84.9, unidad: 'Kg' },
    { id: 'TIN025', nombre: 'EXTENDER', tipo: 'laminacion', codigo: 'TINLAM-0006', cantidad: 36.0, unidad: 'Kg' },
    { id: 'TIN026', nombre: 'CREMA MARY', tipo: 'laminacion', codigo: 'BL-2169', cantidad: 57.0, unidad: 'Kg' },
    { id: 'TIN027', nombre: 'OCRE ESPIGA MARY', tipo: 'laminacion', codigo: 'BL-2170', cantidad: 54.0, unidad: 'Kg' },
    { id: 'TIN028', nombre: 'DORADO ALVARIGUA', tipo: 'laminacion', codigo: 'BL-2134', cantidad: 34.0, unidad: 'Kg' },
    { id: 'TIN029', nombre: 'CREMA ALVARIGUA', tipo: 'laminacion', codigo: 'BL-2136', cantidad: 31.0, unidad: 'Kg' },
    { id: 'TIN030', nombre: 'VERDE "C"', tipo: 'laminacion', codigo: 'BL-1718', cantidad: 89.0, unidad: 'Kg' },
    { id: 'TIN031', nombre: 'VERDE BABO', tipo: 'laminacion', codigo: 'BL-2188', cantidad: 18.0, unidad: 'Kg' },
    { id: 'TIN032', nombre: 'VIOLETA PANTONE', tipo: 'laminacion', codigo: 'BL-0928', cantidad: 34.0, unidad: 'Kg' },
    { id: 'TIN033', nombre: 'MORADO NONNA', tipo: 'laminacion', codigo: 'DL FL 30136', cantidad: 70.0, unidad: 'Kg' },
    { id: 'TIN034', nombre: 'CREMA AMANECER (FAVICA)', tipo: 'laminacion', codigo: 'FL 1024 (20KG)', cantidad: 80.0, unidad: 'Kg' },
    { id: 'TIN035', nombre: 'CREMA AMANECER (BARNIVENCA)', tipo: 'laminacion', codigo: '2042', cantidad: 66.0, unidad: 'Kg' },
    { id: 'TIN036', nombre: 'MARRON AMANECER', tipo: 'laminacion', codigo: '30125 (17KG)', cantidad: 133.6, unidad: 'Kg' },
    { id: 'TIN037', nombre: 'MARRON P-4725 LAMINACION', tipo: 'laminacion', codigo: 'BL-2210', cantidad: 28.8, unidad: 'Kg' },
    { id: 'TIN038', nombre: 'BEIGE (TINTA FLEX)', tipo: 'laminacion', codigo: '467 8018 (17KG)', cantidad: 68.0, unidad: 'Kg' },
    { id: 'TIN039', nombre: 'COMPUESTO DE CERA', tipo: 'laminacion', codigo: 'SP-0915', cantidad: 18.0, unidad: 'Kg' },
    { id: 'TIN040', nombre: 'VERDE "P" 340-C', tipo: 'laminacion', codigo: 'BL-2162', cantidad: 0, unidad: 'Kg' },
    { id: 'TIN041', nombre: 'VERDE 355', tipo: 'laminacion', codigo: 'BL-2119', cantidad: 0, unidad: 'Kg' },
    { id: 'TIN042', nombre: 'VERDE MARY LAMINACION', tipo: 'laminacion', codigo: 'BL-1913', cantidad: 0, unidad: 'Kg' },
    { id: 'TIN043', nombre: 'VERDE DAMASCO', tipo: 'laminacion', codigo: 'BL-2105', cantidad: 0, unidad: 'Kg' },
    // Tintas Superficie (14 items)
    { id: 'TIN044', nombre: 'BLANCO', tipo: 'superficie', codigo: 'BN-1093', cantidad: 705.4, unidad: 'Kg' },
    { id: 'TIN045', nombre: 'NEGRO', tipo: 'superficie', codigo: 'BF-0387', cantidad: 141.0, unidad: 'Kg' },
    { id: 'TIN046', nombre: 'MAGENTA', tipo: 'superficie', codigo: 'BN-1649', cantidad: 250.0, unidad: 'Kg' },
    { id: 'TIN047', nombre: 'MAGENTA', tipo: 'superficie', codigo: 'BF-1718', cantidad: 0, unidad: 'Kg' },
    { id: 'TIN048', nombre: 'CYAN', tipo: 'superficie', codigo: 'BN-1650', cantidad: 221.0, unidad: 'Kg' },
    { id: 'TIN049', nombre: 'AZUL 293', tipo: 'superficie', codigo: 'BF-1857', cantidad: 30.0, unidad: 'Kg' },
    { id: 'TIN050', nombre: 'AZUL REFLEX', tipo: 'superficie', codigo: 'BF-1570', cantidad: 221.0, unidad: 'Kg' },
    { id: 'TIN051', nombre: 'AZUL PROCESO FLEXO SUPERFICIE', tipo: 'superficie', codigo: 'BF-0134', cantidad: 17.0, unidad: 'Kg' },
    { id: 'TIN052', nombre: 'AMARILLO', tipo: 'superficie', codigo: 'BF-1564', cantidad: 357.0, unidad: 'Kg' },
    { id: 'TIN053', nombre: 'AMARILLO PROCESO', tipo: 'superficie', codigo: 'TINSUP-0002', cantidad: 0, unidad: 'Kg' },
    { id: 'TIN054', nombre: 'ROJO 485 2X', tipo: 'superficie', codigo: 'BN-1674', cantidad: 87.0, unidad: 'Kg' },
    { id: 'TIN055', nombre: 'NARANJA 021', tipo: 'superficie', codigo: 'BF-1757', cantidad: 150.0, unidad: 'Kg' },
    { id: 'TIN056', nombre: 'DORADO ALVARIGUA', tipo: 'superficie', codigo: 'BF-1874', cantidad: 104.0, unidad: 'Kg' },
    { id: 'TIN057', nombre: 'BARNIZ SOBRE IMPRE', tipo: 'superficie', codigo: 'BN-1692', cantidad: 218.0, unidad: 'Kg' },
    // Prueba Laminacion (1 item)
    { id: 'TIN058', nombre: 'BLANCO', tipo: 'prueba_laminacion', codigo: 'BL-1745', cantidad: 20.0, unidad: 'Kg' }
  ];

  var rows = [];
  var ahora = new Date().toISOString();

  datos.forEach(function(d) {
    // headers: id, nombre, tipo, codigo, cantidad, unidad, proveedor, ultimaActualizacion
    rows.push([
      d.id,
      d.nombre,
      d.tipo,
      d.codigo,
      d.cantidad,
      d.unidad,
      '',       // proveedor
      ahora
    ]);
  });

  if (rows.length > 0) {
    sheet.getRange(2, 1, rows.length, headers.length).setValues(rows);
  }

  // Formatear
  sheet.setFrozenRows(1);
  sheet.getRange(1, 1, 1, headers.length)
    .setFontWeight('bold')
    .setBackground('#e65100')
    .setFontColor('white');

  for (var c = 1; c <= headers.length; c++) {
    sheet.autoResizeColumn(c);
  }

  Logger.log('Tintas cargadas: ' + datos.length + ' items');
  return { success: true, message: 'Tintas cargadas: ' + datos.length + ' items', count: datos.length };
}

// ============================================
// CARGA INICIAL DE ADHESIVOS/QUIMICOS (7 productos)
// Basado en Excel 26-02-2026
// ============================================

function cargarAdhesivosDesdeAPI() {
  var ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  var sheetName = SHEETS.ADHESIVOS_INVENTARIO;
  var headers = ['id', 'nombre', 'tipo', 'codigo', 'cantidad', 'unidad', 'proveedor', 'ultimaActualizacion'];

  // Borrar y recrear para evitar desfase de headers
  var sheet = ss.getSheetByName(sheetName);
  if (sheet) { ss.deleteSheet(sheet); }
  sheet = ss.insertSheet(sheetName);
  sheet.appendRow(headers);

  var datos = [
    // Solventes
    { id: 'QUI001', nombre: 'ALCOHOL ISOPROPILICO (IPA)', tipo: 'solvente', cantidad: 454.06, unidad: 'Lt' },
    { id: 'QUI002', nombre: 'ACETATO N-PROPYL', tipo: 'solvente', cantidad: 608.23, unidad: 'Lt' },
    { id: 'QUI003', nombre: 'METHOXY PROPANOL', tipo: 'solvente', cantidad: 323.0, unidad: 'Lt' },
    // Adhesivo
    { id: 'QUI004', nombre: 'ADHESIVO', tipo: 'adhesivo', cantidad: 420.0, unidad: 'Kg' },
    // Catalizadores
    { id: 'QUI005', nombre: 'CATALIZADOR', tipo: 'catalizador', cantidad: 210.0, unidad: 'Kg' },
    { id: 'QUI007', nombre: 'CATALIZADOR 403', tipo: 'catalizador', cantidad: 0, unidad: 'Kg' },
    // Solvente recuperado
    { id: 'QUI006', nombre: 'SOLVENTE RECUPERADO', tipo: 'solvente', cantidad: 0, unidad: 'Lt' }
  ];

  var rows = [];
  var ahora = new Date().toISOString();

  datos.forEach(function(d) {
    rows.push([
      d.id,
      d.nombre,
      d.tipo,
      '',       // codigo
      d.cantidad,
      d.unidad,
      '',       // proveedor
      ahora
    ]);
  });

  if (rows.length > 0) {
    sheet.getRange(2, 1, rows.length, headers.length).setValues(rows);
  }

  // Formatear
  sheet.setFrozenRows(1);
  sheet.getRange(1, 1, 1, headers.length)
    .setFontWeight('bold')
    .setBackground('#1565c0')
    .setFontColor('white');

  for (var c = 1; c <= headers.length; c++) {
    sheet.autoResizeColumn(c);
  }

  Logger.log('Adhesivos/Quimicos cargados: ' + datos.length + ' items');
  return { success: true, message: 'Adhesivos/Quimicos cargados: ' + datos.length + ' items', count: datos.length };
}

/**
 * Funcion auxiliar: Carga TODO de una vez (inventario + tintas + adhesivos)
 * Ejecutar desde el editor de Apps Script
 */
function cargarTodosLosDatos() {
  var resultados = [];
  resultados.push(cargarInventarioDesdeAPI());
  resultados.push(cargarTintasDesdeAPI());
  resultados.push(cargarAdhesivosDesdeAPI());
  resultados.push(cargarUsuariosDesdeAPI());
  Logger.log('Resultados: ' + JSON.stringify(resultados));
  return { success: true, resultados: resultados };
}

// ============================================
// CARGA INICIAL DE USUARIOS (23 usuarios reales)
// Equipo Inversiones Axones 2008, C.A.
// ============================================

function cargarUsuariosDesdeAPI() {
  var ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  var sheetName = SHEETS.USUARIOS;

  // Borrar hoja vieja y crear nueva para evitar desfase de headers
  var sheet = ss.getSheetByName(sheetName);
  if (sheet) {
    ss.deleteSheet(sheet);
  }
  sheet = ss.insertSheet(sheetName);
  sheet.appendRow(USUARIOS_HEADERS);

  var usuarios = [
    // Gerencia
    { id: 1, usuario: 'rparra', password: 'axones2026', nombre: 'ROBERT', apellido: 'PARRA', rol: 'jefe_operaciones', area: 'Gerencia', email: '', activo: true },
    // Produccion
    { id: 2, usuario: 'ajaure', password: 'axones2026', nombre: 'ALEXIS', apellido: 'JAURE', rol: 'jefe_operaciones', area: 'Produccion', email: '', activo: true },
    { id: 3, usuario: 'aanare', password: 'axones2026', nombre: 'ANGEL', apellido: 'ANARE', rol: 'planificador', area: 'Produccion', email: '', activo: true },
    { id: 4, usuario: 'rguape', password: 'axones2026', nombre: 'ROXANA', apellido: 'GUAPE', rol: 'supervisor', area: 'Produccion', email: '', activo: true },
    { id: 5, usuario: 'harzola', password: 'axones2026', nombre: 'HENRY', apellido: 'ARZOLA', rol: 'supervisor', area: 'Produccion', email: '', activo: true },
    // Almacen
    { id: 6, usuario: 'lgonzalez', password: 'axones2026', nombre: 'LEONARDO', apellido: 'GONZALEZ', rol: 'jefe_almacen', area: 'Almacen', email: '', activo: true },
    // Impresion
    { id: 7, usuario: 'gmujica', password: 'axones2026', nombre: 'GONZALO', apellido: 'MUJICA', rol: 'operador', area: 'Impresion', email: '', activo: true },
    { id: 8, usuario: 'ncamacaro', password: 'axones2026', nombre: 'NELSON', apellido: 'CAMACARO', rol: 'operador', area: 'Impresion', email: '', activo: true },
    { id: 9, usuario: 'scobos', password: 'axones2026', nombre: 'STIVEN', apellido: 'COBOS', rol: 'operador', area: 'Impresion', email: '', activo: true },
    { id: 10, usuario: 'nnino', password: 'axones2026', nombre: 'NESTOR', apellido: 'NINO', rol: 'operador', area: 'Impresion', email: '', activo: true },
    { id: 11, usuario: 'mnieves', password: 'axones2026', nombre: 'MIGUEL', apellido: 'NIEVES', rol: 'operador', area: 'Impresion', email: '', activo: true },
    // Laminacion
    { id: 12, usuario: 'jcolmenares', password: 'axones2026', nombre: 'JACSON', apellido: 'COLMENARES', rol: 'operador', area: 'Laminacion', email: '', activo: true },
    { id: 13, usuario: 'arodriguez', password: 'axones2026', nombre: 'ANGEL', apellido: 'RODRIGUEZ', rol: 'operador', area: 'Laminacion', email: '', activo: true },
    { id: 14, usuario: 'yaranguren', password: 'axones2026', nombre: 'YSAIAS', apellido: 'ARANGUREN', rol: 'operador', area: 'Laminacion', email: '', activo: true },
    // Corte
    { id: 15, usuario: 'jguzman', password: 'axones2026', nombre: 'JUAN', apellido: 'GUZMAN', rol: 'operador', area: 'Corte', email: '', activo: true },
    { id: 16, usuario: 'apinero', password: 'axones2026', nombre: 'ALIS', apellido: 'PINERO', rol: 'operador', area: 'Corte', email: '', activo: true },
    { id: 17, usuario: 'imonroy', password: 'axones2026', nombre: 'IAN', apellido: 'MONROY', rol: 'operador', area: 'Corte', email: '', activo: true },
    { id: 18, usuario: 'fabarca', password: 'axones2026', nombre: 'FERNANDO', apellido: 'ABARCA', rol: 'operador', area: 'Corte', email: '', activo: true },
    { id: 19, usuario: 'rpena', password: 'axones2026', nombre: 'RAMIRO', apellido: 'PENA', rol: 'operador', area: 'Corte', email: '', activo: true },
    { id: 20, usuario: 'emarquez', password: 'axones2026', nombre: 'EFREN', apellido: 'MARQUEZ', rol: 'operador', area: 'Corte', email: '', activo: true },
    { id: 21, usuario: 'jmartinez', password: 'axones2026', nombre: 'JESUS', apellido: 'MARTINEZ', rol: 'operador', area: 'Corte', email: '', activo: true },
    // Colorista
    { id: 22, usuario: 'alaya', password: 'axones2026', nombre: 'ASDRUBAL', apellido: 'LAYA', rol: 'colorista', area: 'Produccion', email: '', activo: true },
    // Admin del sistema
    { id: 99, usuario: 'admin', password: 'admin123', nombre: 'Administrador', apellido: 'Sistema', rol: 'administrador', area: 'Administracion', email: 'axones2008@gmail.com', activo: true }
  ];

  var rows = [];
  var ahora = new Date().toISOString();

  usuarios.forEach(function(u) {
    rows.push([
      u.id,
      u.usuario,
      u.password,
      u.nombre,
      u.apellido,
      u.rol,
      u.area,
      u.email,
      u.activo ? 'SI' : 'NO',
      ahora,
      ''
    ]);
  });

  if (rows.length > 0) {
    sheet.getRange(2, 1, rows.length, USUARIOS_HEADERS.length).setValues(rows);
  }

  // Formatear
  sheet.setFrozenRows(1);
  sheet.getRange(1, 1, 1, USUARIOS_HEADERS.length)
    .setFontWeight('bold')
    .setBackground('#2e7d32')
    .setFontColor('white');

  for (var c = 1; c <= USUARIOS_HEADERS.length; c++) {
    sheet.autoResizeColumn(c);
  }

  Logger.log('Usuarios cargados: ' + usuarios.length);
  return { success: true, message: 'Usuarios cargados: ' + usuarios.length, count: usuarios.length };
}
