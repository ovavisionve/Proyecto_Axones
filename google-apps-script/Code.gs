/**
 * Sistema Axones - Google Apps Script Backend
 * Inversiones Axones 2008, C.A.
 * Maneja todas las operaciones con Google Sheets
 */

// Configuracion del Spreadsheet
const SPREADSHEET_ID = ''; // Configurar con el ID del Sheets

// Nombres de las hojas
const SHEETS = {
  // Produccion
  IMPRESION: 'IMPRESION',
  CORTE: 'CORTE',
  LAMINACION: 'LAMINACION',

  // Consumos
  TINTAS: 'CONSUMO_TINTAS',

  // Inventario
  INVENTARIO: 'INVENTARIO',

  // Maestros
  CLIENTES: 'CLIENTES',
  MAQUINAS: 'MAQUINAS',
  MATERIALES: 'MATERIALES',
  PRODUCTOS: 'PRODUCTOS',

  // Sistema
  ALERTAS: 'ALERTAS',
  CONFIGURACION: 'CONFIGURACION',
  USUARIOS: 'USUARIOS',
  AUDITORIA: 'AUDITORIA',

  // Financiero
  CUENTAS_COBRAR: 'CUENTAS_COBRAR',

  // Despachos
  DESPACHOS: 'DESPACHOS',

  // Resumen
  RESUMEN_PRODUCCION: 'RESUMEN_PRODUCCION'
};

// Umbrales de Refil por defecto
const UMBRALES_REFIL = {
  default: {
    maximo: 6.0,
    advertencia: 5.0
  }
};

/**
 * Maneja las solicitudes GET
 */
function doGet(e) {
  const action = e.parameter.action;
  let result;

  try {
    switch (action) {
      // Dashboard
      case 'getStats':
        result = getStats();
        break;
      case 'getRecentAlerts':
        result = getRecentAlerts(e.parameter.limit || 10);
        break;
      case 'getProduccionHoy':
        result = getProduccionHoy();
        break;

      // Produccion
      case 'getImpresion':
        result = getImpresion(e.parameter);
        break;
      case 'getCorte':
        result = getCorte(e.parameter);
        break;
      case 'getLaminacion':
        result = getLaminacion(e.parameter);
        break;

      // Consumos
      case 'getTintas':
        result = getConsumoTintas(e.parameter);
        break;

      // Inventario
      case 'getInventario':
        result = getInventario(e.parameter);
        break;
      case 'getInventarioBajo':
        result = getInventarioBajo(e.parameter.minimo || 100);
        break;

      // Maestros
      case 'getClientes':
        result = getClientes();
        break;
      case 'getMateriales':
        result = getMateriales();
        break;
      case 'getMaquinas':
        result = getMaquinas();
        break;
      case 'getProductos':
        result = getProductos(e.parameter.cliente);
        break;

      // Configuracion
      case 'getUmbrales':
        result = getUmbrales();
        break;

      // Alertas
      case 'getAlertas':
        result = getAlertas(e.parameter);
        break;

      // Financiero
      case 'getCuentasCobrar':
        result = getCuentasCobrar(e.parameter);
        break;

      // Auth
      case 'login':
        result = handleLogin();
        break;

      default:
        result = { error: 'Accion no reconocida: ' + action };
    }
  } catch (error) {
    result = { error: error.message, stack: error.stack };
  }

  return ContentService
    .createTextOutput(JSON.stringify(result))
    .setMimeType(ContentService.MimeType.JSON);
}

/**
 * Maneja las solicitudes POST
 */
function doPost(e) {
  const action = e.parameter.action;
  let data;
  let result;

  try {
    data = JSON.parse(e.postData.contents);

    switch (action) {
      // Produccion
      case 'saveImpresion':
        result = saveImpresion(data);
        break;
      case 'saveCorte':
        result = saveCorte(data);
        break;
      case 'saveLaminacion':
        result = saveLaminacion(data);
        break;

      // Consumos
      case 'saveTintas':
        result = saveConsumoTintas(data);
        break;

      // Inventario
      case 'saveInventario':
        result = saveInventario(data);
        break;
      case 'updateInventario':
        result = updateInventario(data);
        break;

      // Alertas
      case 'saveAlerta':
        result = saveAlerta(data);
        break;
      case 'updateAlerta':
        result = updateAlerta(data);
        break;
      case 'resolverAlerta':
        result = resolverAlerta(data);
        break;

      // Despachos
      case 'saveDespacho':
        result = saveDespacho(data);
        break;

      default:
        result = { error: 'Accion no reconocida: ' + action };
    }
  } catch (error) {
    result = { error: error.message, stack: error.stack };
  }

  return ContentService
    .createTextOutput(JSON.stringify(result))
    .setMimeType(ContentService.MimeType.JSON);
}

// ============================================
// DASHBOARD
// ============================================

/**
 * Obtiene estadisticas generales del dashboard
 */
function getStats() {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const hoy = new Date();
  const hoyStr = Utilities.formatDate(hoy, 'America/Caracas', 'yyyy-MM-dd');

  // Produccion del dia (Impresion + Corte)
  let produccionHoy = 0;
  let refilTotal = 0;
  let registrosHoy = 0;

  // Impresion
  const impresionSheet = ss.getSheetByName(SHEETS.IMPRESION);
  if (impresionSheet && impresionSheet.getLastRow() > 1) {
    const impresionData = impresionSheet.getDataRange().getValues();
    const headers = impresionData[0];
    const fechaIdx = headers.indexOf('fecha');
    const salidaIdx = headers.indexOf('totalSalida');
    const refilIdx = headers.indexOf('porcentajeRefil');

    for (let i = 1; i < impresionData.length; i++) {
      const fecha = Utilities.formatDate(new Date(impresionData[i][fechaIdx]), 'America/Caracas', 'yyyy-MM-dd');
      if (fecha === hoyStr) {
        produccionHoy += parseFloat(impresionData[i][salidaIdx]) || 0;
        refilTotal += parseFloat(impresionData[i][refilIdx]) || 0;
        registrosHoy++;
      }
    }
  }

  // Corte
  const corteSheet = ss.getSheetByName(SHEETS.CORTE);
  if (corteSheet && corteSheet.getLastRow() > 1) {
    const corteData = corteSheet.getDataRange().getValues();
    const headers = corteData[0];
    const fechaIdx = headers.indexOf('fecha');
    const salidaIdx = headers.indexOf('totalSalida');
    const refilIdx = headers.indexOf('porcentajeRefil');

    for (let i = 1; i < corteData.length; i++) {
      const fecha = Utilities.formatDate(new Date(corteData[i][fechaIdx]), 'America/Caracas', 'yyyy-MM-dd');
      if (fecha === hoyStr) {
        produccionHoy += parseFloat(corteData[i][salidaIdx]) || 0;
        refilTotal += parseFloat(corteData[i][refilIdx]) || 0;
        registrosHoy++;
      }
    }
  }

  const refilPromedio = registrosHoy > 0 ? (refilTotal / registrosHoy) : 0;

  // Alertas pendientes
  let alertasPendientes = 0;
  const alertasSheet = ss.getSheetByName(SHEETS.ALERTAS);
  if (alertasSheet && alertasSheet.getLastRow() > 1) {
    const alertasData = alertasSheet.getDataRange().getValues();
    const estadoIdx = alertasData[0].indexOf('estado');
    alertasPendientes = alertasData.slice(1).filter(row =>
      row[estadoIdx] === 'pendiente' || row[estadoIdx] === 'activa'
    ).length;
  }

  // Inventario total
  let inventarioTotal = 0;
  const inventarioSheet = ss.getSheetByName(SHEETS.INVENTARIO);
  if (inventarioSheet && inventarioSheet.getLastRow() > 1) {
    const inventarioData = inventarioSheet.getDataRange().getValues();
    const kgIdx = inventarioData[0].indexOf('kg');
    inventarioTotal = inventarioData.slice(1).reduce((sum, row) => sum + (parseFloat(row[kgIdx]) || 0), 0);
  }

  return {
    produccion: Math.round(produccionHoy),
    refilPromedio: refilPromedio.toFixed(1),
    alertas: alertasPendientes,
    inventario: Math.round(inventarioTotal),
    registrosHoy: registrosHoy
  };
}

/**
 * Obtiene produccion del dia agrupada por maquina
 */
function getProduccionHoy() {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const hoy = new Date();
  const hoyStr = Utilities.formatDate(hoy, 'America/Caracas', 'yyyy-MM-dd');

  const porMaquina = {};

  // Impresion
  const impresionSheet = ss.getSheetByName(SHEETS.IMPRESION);
  if (impresionSheet && impresionSheet.getLastRow() > 1) {
    const data = impresionSheet.getDataRange().getValues();
    const headers = data[0];
    const fechaIdx = headers.indexOf('fecha');
    const maquinaIdx = headers.indexOf('maquina');
    const salidaIdx = headers.indexOf('totalSalida');
    const refilIdx = headers.indexOf('porcentajeRefil');

    for (let i = 1; i < data.length; i++) {
      const fecha = Utilities.formatDate(new Date(data[i][fechaIdx]), 'America/Caracas', 'yyyy-MM-dd');
      if (fecha === hoyStr) {
        const maquina = data[i][maquinaIdx] || 'Sin asignar';
        if (!porMaquina[maquina]) {
          porMaquina[maquina] = { cantidad: 0, kg: 0, refil: [] };
        }
        porMaquina[maquina].cantidad++;
        porMaquina[maquina].kg += parseFloat(data[i][salidaIdx]) || 0;
        porMaquina[maquina].refil.push(parseFloat(data[i][refilIdx]) || 0);
      }
    }
  }

  // Corte
  const corteSheet = ss.getSheetByName(SHEETS.CORTE);
  if (corteSheet && corteSheet.getLastRow() > 1) {
    const data = corteSheet.getDataRange().getValues();
    const headers = data[0];
    const fechaIdx = headers.indexOf('fecha');
    const maquinaIdx = headers.indexOf('maquina');
    const salidaIdx = headers.indexOf('totalSalida');
    const refilIdx = headers.indexOf('porcentajeRefil');

    for (let i = 1; i < data.length; i++) {
      const fecha = Utilities.formatDate(new Date(data[i][fechaIdx]), 'America/Caracas', 'yyyy-MM-dd');
      if (fecha === hoyStr) {
        const maquina = data[i][maquinaIdx] || 'Sin asignar';
        if (!porMaquina[maquina]) {
          porMaquina[maquina] = { cantidad: 0, kg: 0, refil: [] };
        }
        porMaquina[maquina].cantidad++;
        porMaquina[maquina].kg += parseFloat(data[i][salidaIdx]) || 0;
        porMaquina[maquina].refil.push(parseFloat(data[i][refilIdx]) || 0);
      }
    }
  }

  return porMaquina;
}

// ============================================
// IMPRESION
// ============================================

/**
 * Headers para hoja de impresion
 */
const IMPRESION_HEADERS = [
  'id', 'timestamp', 'fecha', 'turno', 'maquina', 'operador', 'operadorNombre',
  'ot', 'cliente', 'producto', 'ancho', 'calibre', 'repeticion', 'pistas',
  'totalEntrada', 'totalSalida', 'merma', 'porcentajeRefil',
  'scrapTransparente', 'scrapImpreso',
  'tiempoMuerto', 'tiempoEfectivo', 'tiempoPreparacion',
  'observaciones', 'estado'
];

/**
 * Obtiene registros de impresion
 */
function getImpresion(params) {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const sheet = ss.getSheetByName(SHEETS.IMPRESION);

  if (!sheet || sheet.getLastRow() <= 1) {
    return [];
  }

  const data = sheet.getDataRange().getValues();
  const headers = data[0];

  let registros = data.slice(1).map(row => {
    const obj = {};
    headers.forEach((header, idx) => {
      obj[header] = row[idx];
    });
    return obj;
  });

  // Filtros
  if (params) {
    if (params.fecha) {
      registros = registros.filter(r => {
        const fecha = Utilities.formatDate(new Date(r.fecha), 'America/Caracas', 'yyyy-MM-dd');
        return fecha === params.fecha;
      });
    }
    if (params.maquina) {
      registros = registros.filter(r => r.maquina === params.maquina);
    }
    if (params.ot) {
      registros = registros.filter(r => r.ot === params.ot);
    }
  }

  return registros.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
}

/**
 * Guarda un registro de impresion
 */
function saveImpresion(data) {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  let sheet = ss.getSheetByName(SHEETS.IMPRESION);

  // Crear hoja si no existe
  if (!sheet) {
    sheet = ss.insertSheet(SHEETS.IMPRESION);
    sheet.appendRow(IMPRESION_HEADERS);
  }

  // Generar ID
  data.id = 'IMP_' + new Date().getTime();
  data.timestamp = new Date().toISOString();
  data.estado = 'registrado';

  // Calcular porcentaje de Refil si no viene calculado
  if (!data.porcentajeRefil && data.totalEntrada > 0) {
    data.porcentajeRefil = ((data.merma / data.totalEntrada) * 100).toFixed(2);
  }

  // Crear fila
  const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  const row = headers.map(header => data[header] !== undefined ? data[header] : '');
  sheet.appendRow(row);

  // Registrar auditoria
  logAuditoria('CREAR', 'IMPRESION', data.id, data.operador);

  // Verificar si requiere alerta por Refil alto
  const porcentajeRefil = parseFloat(data.porcentajeRefil) || 0;
  if (porcentajeRefil > UMBRALES_REFIL.default.advertencia) {
    const nivel = porcentajeRefil > UMBRALES_REFIL.default.maximo ? 'critical' : 'warning';
    const tipo = porcentajeRefil > UMBRALES_REFIL.default.maximo ? 'refil_critico' : 'refil_alto';

    saveAlerta({
      tipo: tipo,
      nivel: nivel,
      maquina: data.maquina,
      ot: data.ot,
      mensaje: `Refil ${porcentajeRefil}% en OT ${data.ot} - ${data.maquina}`,
      datos: {
        porcentajeRefil: porcentajeRefil,
        umbral: UMBRALES_REFIL.default.maximo
      }
    });
  }

  return { success: true, id: data.id };
}

// ============================================
// CORTE
// ============================================

/**
 * Headers para hoja de corte
 */
const CORTE_HEADERS = [
  'id', 'timestamp', 'fecha', 'turno', 'maquina', 'operador', 'operadorNombre',
  'ot', 'cliente', 'producto', 'ancho',
  'totalEntrada', 'totalSalida', 'merma', 'porcentajeRefil',
  'scrapRefile', 'scrapImpreso',
  'observaciones', 'estado'
];

/**
 * Obtiene registros de corte
 */
function getCorte(params) {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const sheet = ss.getSheetByName(SHEETS.CORTE);

  if (!sheet || sheet.getLastRow() <= 1) {
    return [];
  }

  const data = sheet.getDataRange().getValues();
  const headers = data[0];

  let registros = data.slice(1).map(row => {
    const obj = {};
    headers.forEach((header, idx) => {
      obj[header] = row[idx];
    });
    return obj;
  });

  // Filtros
  if (params) {
    if (params.fecha) {
      registros = registros.filter(r => {
        const fecha = Utilities.formatDate(new Date(r.fecha), 'America/Caracas', 'yyyy-MM-dd');
        return fecha === params.fecha;
      });
    }
    if (params.maquina) {
      registros = registros.filter(r => r.maquina === params.maquina);
    }
  }

  return registros.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
}

/**
 * Guarda un registro de corte
 */
function saveCorte(data) {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  let sheet = ss.getSheetByName(SHEETS.CORTE);

  if (!sheet) {
    sheet = ss.insertSheet(SHEETS.CORTE);
    sheet.appendRow(CORTE_HEADERS);
  }

  data.id = 'CRT_' + new Date().getTime();
  data.timestamp = new Date().toISOString();
  data.estado = 'registrado';

  if (!data.porcentajeRefil && data.totalEntrada > 0) {
    data.porcentajeRefil = ((data.merma / data.totalEntrada) * 100).toFixed(2);
  }

  const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  const row = headers.map(header => data[header] !== undefined ? data[header] : '');
  sheet.appendRow(row);

  logAuditoria('CREAR', 'CORTE', data.id, data.operador);

  // Verificar alerta
  const porcentajeRefil = parseFloat(data.porcentajeRefil) || 0;
  if (porcentajeRefil > UMBRALES_REFIL.default.advertencia) {
    const nivel = porcentajeRefil > UMBRALES_REFIL.default.maximo ? 'critical' : 'warning';
    const tipo = porcentajeRefil > UMBRALES_REFIL.default.maximo ? 'refil_critico' : 'refil_alto';

    saveAlerta({
      tipo: tipo,
      nivel: nivel,
      maquina: data.maquina,
      ot: data.ot,
      mensaje: `Refil ${porcentajeRefil}% en corte OT ${data.ot} - ${data.maquina}`,
      datos: { porcentajeRefil: porcentajeRefil }
    });
  }

  return { success: true, id: data.id };
}

// ============================================
// LAMINACION
// ============================================

/**
 * Headers para hoja de laminacion
 */
const LAMINACION_HEADERS = [
  'id', 'timestamp', 'fecha', 'turno', 'maquina', 'operador', 'operadorNombre',
  'ot', 'cliente', 'producto',
  'totalEntrada', 'totalSalida', 'merma', 'porcentajeRefil',
  'adhesivo', 'observaciones', 'estado'
];

/**
 * Obtiene registros de laminacion
 */
function getLaminacion(params) {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const sheet = ss.getSheetByName(SHEETS.LAMINACION);

  if (!sheet || sheet.getLastRow() <= 1) {
    return [];
  }

  const data = sheet.getDataRange().getValues();
  const headers = data[0];

  return data.slice(1).map(row => {
    const obj = {};
    headers.forEach((header, idx) => {
      obj[header] = row[idx];
    });
    return obj;
  });
}

/**
 * Guarda un registro de laminacion
 */
function saveLaminacion(data) {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  let sheet = ss.getSheetByName(SHEETS.LAMINACION);

  if (!sheet) {
    sheet = ss.insertSheet(SHEETS.LAMINACION);
    sheet.appendRow(LAMINACION_HEADERS);
  }

  data.id = 'LAM_' + new Date().getTime();
  data.timestamp = new Date().toISOString();
  data.estado = 'registrado';

  const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  const row = headers.map(header => data[header] !== undefined ? data[header] : '');
  sheet.appendRow(row);

  logAuditoria('CREAR', 'LAMINACION', data.id, data.operador);

  return { success: true, id: data.id };
}

// ============================================
// CONSUMO DE TINTAS Y SOLVENTES
// ============================================

/**
 * Headers para consumo de tintas
 */
const TINTAS_HEADERS = [
  'id', 'timestamp', 'fecha', 'ot', 'cliente', 'producto', 'maquina', 'operador',
  'tintasLaminacion', 'tintasSuperficie', 'solventes',
  'totalTintasLaminacion', 'totalTintasSuperficie', 'totalSolventes',
  'observaciones'
];

/**
 * Obtiene consumo de tintas
 */
function getConsumoTintas(params) {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const sheet = ss.getSheetByName(SHEETS.TINTAS);

  if (!sheet || sheet.getLastRow() <= 1) {
    return [];
  }

  const data = sheet.getDataRange().getValues();
  const headers = data[0];

  let registros = data.slice(1).map(row => {
    const obj = {};
    headers.forEach((header, idx) => {
      // Parsear JSON para tintas y solventes
      if (['tintasLaminacion', 'tintasSuperficie', 'solventes'].includes(header)) {
        try {
          obj[header] = JSON.parse(row[idx] || '{}');
        } catch (e) {
          obj[header] = {};
        }
      } else {
        obj[header] = row[idx];
      }
    });
    return obj;
  });

  if (params && params.ot) {
    registros = registros.filter(r => r.ot === params.ot);
  }

  return registros;
}

/**
 * Guarda consumo de tintas
 */
function saveConsumoTintas(data) {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  let sheet = ss.getSheetByName(SHEETS.TINTAS);

  if (!sheet) {
    sheet = ss.insertSheet(SHEETS.TINTAS);
    sheet.appendRow(TINTAS_HEADERS);
  }

  data.id = 'TNT_' + new Date().getTime();
  data.timestamp = new Date().toISOString();

  // Convertir objetos a JSON string
  if (typeof data.tintasLaminacion === 'object') {
    data.tintasLaminacion = JSON.stringify(data.tintasLaminacion);
  }
  if (typeof data.tintasSuperficie === 'object') {
    data.tintasSuperficie = JSON.stringify(data.tintasSuperficie);
  }
  if (typeof data.solventes === 'object') {
    data.solventes = JSON.stringify(data.solventes);
  }

  const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  const row = headers.map(header => data[header] !== undefined ? data[header] : '');
  sheet.appendRow(row);

  logAuditoria('CREAR', 'TINTAS', data.id, data.operador);

  return { success: true, id: data.id };
}

// ============================================
// INVENTARIO
// ============================================

/**
 * Headers para inventario
 */
const INVENTARIO_HEADERS = [
  'id', 'material', 'micras', 'ancho', 'kg', 'producto', 'cliente',
  'ubicacion', 'lote', 'fechaIngreso', 'estado', 'ultimaActualizacion'
];

/**
 * Obtiene inventario
 */
function getInventario(params) {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const sheet = ss.getSheetByName(SHEETS.INVENTARIO);

  if (!sheet || sheet.getLastRow() <= 1) {
    return [];
  }

  const data = sheet.getDataRange().getValues();
  const headers = data[0];

  let registros = data.slice(1).map(row => {
    const obj = {};
    headers.forEach((header, idx) => {
      obj[header] = row[idx];
    });
    return obj;
  });

  // Filtros
  if (params) {
    if (params.material) {
      registros = registros.filter(r => r.material === params.material);
    }
    if (params.cliente) {
      registros = registros.filter(r => r.cliente === params.cliente);
    }
  }

  return registros;
}

/**
 * Obtiene items de inventario con stock bajo
 */
function getInventarioBajo(minimo) {
  const inventario = getInventario();
  return inventario.filter(item => parseFloat(item.kg) < minimo);
}

/**
 * Guarda item de inventario
 */
function saveInventario(data) {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  let sheet = ss.getSheetByName(SHEETS.INVENTARIO);

  if (!sheet) {
    sheet = ss.insertSheet(SHEETS.INVENTARIO);
    sheet.appendRow(INVENTARIO_HEADERS);
  }

  data.id = 'INV_' + new Date().getTime();
  data.fechaIngreso = new Date().toISOString();
  data.ultimaActualizacion = data.fechaIngreso;
  data.estado = 'disponible';

  const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  const row = headers.map(header => data[header] !== undefined ? data[header] : '');
  sheet.appendRow(row);

  logAuditoria('CREAR', 'INVENTARIO', data.id, data.usuario || 'sistema');

  return { success: true, id: data.id };
}

/**
 * Actualiza item de inventario
 */
function updateInventario(data) {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const sheet = ss.getSheetByName(SHEETS.INVENTARIO);

  if (!sheet) {
    return { error: 'Hoja de inventario no encontrada' };
  }

  const dataRange = sheet.getDataRange();
  const values = dataRange.getValues();
  const headers = values[0];
  const idIdx = headers.indexOf('id');

  for (let i = 1; i < values.length; i++) {
    if (values[i][idIdx] === data.id) {
      // Actualizar campos
      headers.forEach((header, idx) => {
        if (data[header] !== undefined && header !== 'id') {
          sheet.getRange(i + 1, idx + 1).setValue(data[header]);
        }
      });

      // Actualizar timestamp
      const ultimaIdx = headers.indexOf('ultimaActualizacion');
      if (ultimaIdx >= 0) {
        sheet.getRange(i + 1, ultimaIdx + 1).setValue(new Date().toISOString());
      }

      logAuditoria('ACTUALIZAR', 'INVENTARIO', data.id, data.usuario || 'sistema');

      // Verificar stock bajo
      const kgIdx = headers.indexOf('kg');
      const kg = parseFloat(data.kg || values[i][kgIdx]) || 0;
      if (kg < 100 && kg > 0) {
        const materialIdx = headers.indexOf('material');
        saveAlerta({
          tipo: 'stock_bajo',
          nivel: kg < 50 ? 'critical' : 'warning',
          mensaje: `Stock bajo de ${values[i][materialIdx]}: ${kg} Kg`,
          datos: { material: values[i][materialIdx], kg: kg }
        });
      }

      return { success: true };
    }
  }

  return { error: 'Item no encontrado' };
}

// ============================================
// ALERTAS
// ============================================

/**
 * Headers para alertas
 */
const ALERTAS_HEADERS = [
  'id', 'timestamp', 'tipo', 'nivel', 'maquina', 'ot', 'mensaje',
  'estado', 'datos', 'resueltaPor', 'fechaResolucion'
];

/**
 * Obtiene alertas
 */
function getAlertas(params) {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const sheet = ss.getSheetByName(SHEETS.ALERTAS);

  if (!sheet || sheet.getLastRow() <= 1) {
    return [];
  }

  const data = sheet.getDataRange().getValues();
  const headers = data[0];

  let alertas = data.slice(1).map(row => {
    const obj = {};
    headers.forEach((header, idx) => {
      if (header === 'datos') {
        try {
          obj[header] = JSON.parse(row[idx] || '{}');
        } catch (e) {
          obj[header] = {};
        }
      } else {
        obj[header] = row[idx];
      }
    });
    return obj;
  });

  // Filtros
  if (params) {
    if (params.estado) {
      alertas = alertas.filter(a => a.estado === params.estado);
    }
    if (params.tipo) {
      alertas = alertas.filter(a => a.tipo === params.tipo);
    }
    if (params.maquina) {
      alertas = alertas.filter(a => a.maquina === params.maquina);
    }
  }

  return alertas.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
}

/**
 * Obtiene alertas recientes
 */
function getRecentAlerts(limit) {
  const alertas = getAlertas({ estado: 'pendiente' });
  return alertas.slice(0, parseInt(limit));
}

/**
 * Guarda una alerta
 */
function saveAlerta(data) {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  let sheet = ss.getSheetByName(SHEETS.ALERTAS);

  if (!sheet) {
    sheet = ss.insertSheet(SHEETS.ALERTAS);
    sheet.appendRow(ALERTAS_HEADERS);
  }

  data.id = 'ALT_' + new Date().getTime();
  data.timestamp = new Date().toISOString();
  data.estado = 'pendiente';

  if (typeof data.datos === 'object') {
    data.datos = JSON.stringify(data.datos);
  }

  const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  const row = headers.map(header => data[header] !== undefined ? data[header] : '');
  sheet.appendRow(row);

  // Enviar email si es critica
  if (data.nivel === 'critical') {
    enviarNotificacionEmail(data);
  }

  return { success: true, id: data.id };
}

/**
 * Actualiza una alerta
 */
function updateAlerta(data) {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const sheet = ss.getSheetByName(SHEETS.ALERTAS);

  if (!sheet) {
    return { error: 'Hoja de alertas no encontrada' };
  }

  const dataRange = sheet.getDataRange();
  const values = dataRange.getValues();
  const headers = values[0];
  const idIdx = headers.indexOf('id');

  for (let i = 1; i < values.length; i++) {
    if (values[i][idIdx] === data.id) {
      headers.forEach((header, idx) => {
        if (data[header] !== undefined && header !== 'id') {
          sheet.getRange(i + 1, idx + 1).setValue(data[header]);
        }
      });

      logAuditoria('ACTUALIZAR', 'ALERTAS', data.id, data.usuario || 'sistema');
      return { success: true };
    }
  }

  return { error: 'Alerta no encontrada' };
}

/**
 * Resuelve una alerta
 */
function resolverAlerta(data) {
  data.estado = 'resuelta';
  data.fechaResolucion = new Date().toISOString();
  return updateAlerta(data);
}

// ============================================
// MAESTROS
// ============================================

/**
 * Obtiene lista de clientes
 */
function getClientes() {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const sheet = ss.getSheetByName(SHEETS.CLIENTES);

  if (!sheet || sheet.getLastRow() <= 1) {
    return [];
  }

  const data = sheet.getDataRange().getValues();
  const headers = data[0];

  return data.slice(1).map(row => {
    const obj = {};
    headers.forEach((header, idx) => {
      obj[header] = row[idx];
    });
    return obj;
  });
}

/**
 * Obtiene lista de materiales
 */
function getMateriales() {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const sheet = ss.getSheetByName(SHEETS.MATERIALES);

  if (!sheet || sheet.getLastRow() <= 1) {
    return [];
  }

  const data = sheet.getDataRange().getValues();
  const headers = data[0];

  return data.slice(1).map(row => {
    const obj = {};
    headers.forEach((header, idx) => {
      obj[header] = row[idx];
    });
    return obj;
  });
}

/**
 * Obtiene lista de maquinas
 */
function getMaquinas() {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const sheet = ss.getSheetByName(SHEETS.MAQUINAS);

  if (!sheet || sheet.getLastRow() <= 1) {
    return [];
  }

  const data = sheet.getDataRange().getValues();
  const headers = data[0];

  return data.slice(1).map(row => {
    const obj = {};
    headers.forEach((header, idx) => {
      obj[header] = row[idx];
    });
    return obj;
  });
}

/**
 * Obtiene productos de un cliente
 */
function getProductos(cliente) {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const sheet = ss.getSheetByName(SHEETS.PRODUCTOS);

  if (!sheet || sheet.getLastRow() <= 1) {
    return [];
  }

  const data = sheet.getDataRange().getValues();
  const headers = data[0];

  let productos = data.slice(1).map(row => {
    const obj = {};
    headers.forEach((header, idx) => {
      obj[header] = row[idx];
    });
    return obj;
  });

  if (cliente) {
    productos = productos.filter(p => p.cliente === cliente);
  }

  return productos;
}

/**
 * Obtiene umbrales de configuracion
 */
function getUmbrales() {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const sheet = ss.getSheetByName(SHEETS.CONFIGURACION);

  if (!sheet || sheet.getLastRow() <= 1) {
    return UMBRALES_REFIL;
  }

  const data = sheet.getDataRange().getValues();
  const headers = data[0];
  const umbrales = {};

  const materialIdx = headers.indexOf('material');
  const maximoIdx = headers.indexOf('umbral_maximo');
  const advertenciaIdx = headers.indexOf('umbral_advertencia');

  for (let i = 1; i < data.length; i++) {
    umbrales[data[i][materialIdx]] = {
      maximo: parseFloat(data[i][maximoIdx]) || 6.0,
      advertencia: parseFloat(data[i][advertenciaIdx]) || 5.0
    };
  }

  return Object.keys(umbrales).length > 0 ? umbrales : UMBRALES_REFIL;
}

// ============================================
// FINANCIERO
// ============================================

/**
 * Obtiene cuentas por cobrar
 */
function getCuentasCobrar(params) {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const sheet = ss.getSheetByName(SHEETS.CUENTAS_COBRAR);

  if (!sheet || sheet.getLastRow() <= 1) {
    return [];
  }

  const data = sheet.getDataRange().getValues();
  const headers = data[0];

  let cuentas = data.slice(1).map(row => {
    const obj = {};
    headers.forEach((header, idx) => {
      obj[header] = row[idx];
    });
    return obj;
  });

  if (params && params.cliente) {
    cuentas = cuentas.filter(c =>
      c.cliente.toLowerCase().includes(params.cliente.toLowerCase())
    );
  }

  return cuentas;
}

// ============================================
// DESPACHOS
// ============================================

/**
 * Headers para despachos
 */
const DESPACHOS_HEADERS = [
  'id', 'timestamp', 'fecha', 'notaEntrega', 'cliente', 'productos',
  'cantidadTotal', 'observaciones', 'registradoPor', 'estado'
];

/**
 * Guarda un despacho
 */
function saveDespacho(data) {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  let sheet = ss.getSheetByName(SHEETS.DESPACHOS);

  if (!sheet) {
    sheet = ss.insertSheet(SHEETS.DESPACHOS);
    sheet.appendRow(DESPACHOS_HEADERS);
  }

  data.id = 'DSP_' + new Date().getTime();
  data.timestamp = new Date().toISOString();
  data.estado = 'despachado';

  if (typeof data.productos === 'object') {
    data.productos = JSON.stringify(data.productos);
  }

  const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  const row = headers.map(header => data[header] !== undefined ? data[header] : '');
  sheet.appendRow(row);

  logAuditoria('CREAR', 'DESPACHOS', data.id, data.registradoPor);

  return { success: true, id: data.id };
}

// ============================================
// AUDITORIA Y UTILIDADES
// ============================================

/**
 * Registra accion en log de auditoria
 */
function logAuditoria(accion, entidad, entidadId, usuario) {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  let sheet = ss.getSheetByName(SHEETS.AUDITORIA);

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
}

/**
 * Envia notificacion por email
 */
function enviarNotificacionEmail(alerta) {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const sheet = ss.getSheetByName(SHEETS.USUARIOS);

  if (!sheet || sheet.getLastRow() <= 1) {
    return;
  }

  const data = sheet.getDataRange().getValues();
  const headers = data[0];

  const emailIdx = headers.indexOf('email');
  const rolIdx = headers.indexOf('rol');
  const activoIdx = headers.indexOf('activo');

  const supervisores = data.slice(1)
    .filter(row =>
      (row[rolIdx] === 'supervisor' || row[rolIdx] === 'administrador') &&
      row[activoIdx]
    )
    .map(row => row[emailIdx])
    .filter(email => email);

  if (supervisores.length === 0) return;

  const asunto = `[ALERTA ${alerta.nivel.toUpperCase()}] Sistema Axones - ${alerta.tipo}`;
  const cuerpo = `
Se ha generado una alerta en el Sistema Axones:

Tipo: ${alerta.tipo}
Nivel: ${alerta.nivel}
Maquina: ${alerta.maquina || 'N/A'}
OT: ${alerta.ot || 'N/A'}
Mensaje: ${alerta.mensaje}
Fecha/Hora: ${alerta.timestamp}

Por favor revise el sistema para mas detalles.

--
Sistema Axones
Inversiones Axones 2008, C.A.
  `;

  supervisores.forEach(email => {
    try {
      MailApp.sendEmail(email, asunto, cuerpo);
    } catch (e) {
      console.error('Error enviando email a ' + email + ': ' + e.message);
    }
  });
}

/**
 * Maneja el login
 */
function handleLogin() {
  const user = Session.getActiveUser();
  const email = user.getEmail();

  if (!email) {
    return { error: 'No se pudo obtener el usuario' };
  }

  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const sheet = ss.getSheetByName(SHEETS.USUARIOS);

  if (!sheet || sheet.getLastRow() <= 1) {
    return { error: 'Configuracion de usuarios no encontrada' };
  }

  const data = sheet.getDataRange().getValues();
  const headers = data[0];

  const emailIdx = headers.indexOf('email');
  const nombreIdx = headers.indexOf('nombre');
  const rolIdx = headers.indexOf('rol');
  const activoIdx = headers.indexOf('activo');

  for (let i = 1; i < data.length; i++) {
    if (data[i][emailIdx] === email && data[i][activoIdx]) {
      return {
        success: true,
        user: {
          id: 'user_' + i,
          email: email,
          nombre: data[i][nombreIdx],
          rol: data[i][rolIdx]
        }
      };
    }
  }

  return { error: 'Usuario no autorizado' };
}

// ============================================
// FUNCIONES DE INICIALIZACION
// ============================================

/**
 * Crea las hojas necesarias si no existen
 */
function inicializarHojas() {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);

  const hojas = [
    { nombre: SHEETS.IMPRESION, headers: IMPRESION_HEADERS },
    { nombre: SHEETS.CORTE, headers: CORTE_HEADERS },
    { nombre: SHEETS.LAMINACION, headers: LAMINACION_HEADERS },
    { nombre: SHEETS.TINTAS, headers: TINTAS_HEADERS },
    { nombre: SHEETS.INVENTARIO, headers: INVENTARIO_HEADERS },
    { nombre: SHEETS.ALERTAS, headers: ALERTAS_HEADERS },
    { nombre: SHEETS.DESPACHOS, headers: DESPACHOS_HEADERS },
  ];

  hojas.forEach(hoja => {
    let sheet = ss.getSheetByName(hoja.nombre);
    if (!sheet) {
      sheet = ss.insertSheet(hoja.nombre);
      sheet.appendRow(hoja.headers);
      console.log('Hoja creada: ' + hoja.nombre);
    }
  });

  return { success: true, message: 'Hojas inicializadas correctamente' };
}
