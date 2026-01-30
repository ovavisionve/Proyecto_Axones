/**
 * Sistema Axones - Google Apps Script Backend
 * Maneja todas las operaciones con Google Sheets
 */

// Configuracion del Spreadsheet
const SPREADSHEET_ID = ''; // Configurar con el ID del Sheets

// Nombres de las hojas
const SHEETS = {
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
  AUDITORIA: 'AUDITORIA'
};

/**
 * Maneja las solicitudes GET
 */
function doGet(e) {
  const action = e.parameter.action;
  let result;

  try {
    switch (action) {
      case 'getStats':
        result = getStats();
        break;
      case 'getRecentAlerts':
        result = getRecentAlerts(e.parameter.limit || 10);
        break;
      case 'getProduccion':
        result = getProduccion(e.parameter);
        break;
      case 'getClientes':
        result = getClientes();
        break;
      case 'getMateriales':
        result = getMateriales();
        break;
      case 'getMaquinas':
        result = getMaquinas();
        break;
      case 'getUmbrales':
        result = getUmbrales();
        break;
      case 'getCuentasCobrar':
        result = getCuentasCobrar(e.parameter);
        break;
      case 'login':
        result = handleLogin();
        break;
      default:
        result = { error: 'Accion no reconocida' };
    }
  } catch (error) {
    result = { error: error.message };
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
      case 'saveProduccion':
        result = saveProduccion(data);
        break;
      case 'saveAlerta':
        result = saveAlerta(data);
        break;
      case 'updateAlerta':
        result = updateAlerta(data);
        break;
      case 'saveDespacho':
        result = saveDespacho(data);
        break;
      default:
        result = { error: 'Accion no reconocida' };
    }
  } catch (error) {
    result = { error: error.message };
  }

  return ContentService
    .createTextOutput(JSON.stringify(result))
    .setMimeType(ContentService.MimeType.JSON);
}

/**
 * Obtiene estadisticas generales
 */
function getStats() {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const produccionSheet = ss.getSheetByName(SHEETS.PRODUCCION);
  const alertasSheet = ss.getSheetByName(SHEETS.ALERTAS);

  // Fecha de hoy
  const hoy = new Date();
  const hoyStr = Utilities.formatDate(hoy, 'America/Caracas', 'yyyy-MM-dd');

  // Produccion del dia
  const produccionData = produccionSheet.getDataRange().getValues();
  const headers = produccionData[0];
  const fechaIdx = headers.indexOf('fecha');
  const cantidadIdx = headers.indexOf('cantidadFinal');
  const desperdicioIdx = headers.indexOf('desperdicioPct');

  let produccionHoy = 0;
  let desperdicioTotal = 0;
  let registrosHoy = 0;

  for (let i = 1; i < produccionData.length; i++) {
    const fecha = Utilities.formatDate(new Date(produccionData[i][fechaIdx]), 'America/Caracas', 'yyyy-MM-dd');
    if (fecha === hoyStr) {
      produccionHoy += produccionData[i][cantidadIdx] || 0;
      desperdicioTotal += produccionData[i][desperdicioIdx] || 0;
      registrosHoy++;
    }
  }

  const desperdicioPromedio = registrosHoy > 0 ? (desperdicioTotal / registrosHoy) : 0;

  // Alertas pendientes
  const alertasData = alertasSheet.getDataRange().getValues();
  const estadoIdx = alertasData[0].indexOf('estado');
  const alertasPendientes = alertasData.slice(1).filter(row => row[estadoIdx] === 'pendiente').length;

  // Operadores activos (simplificado)
  const operadoresActivos = 4;

  return {
    produccion: produccionHoy.toLocaleString(),
    desperdicio: desperdicioPromedio.toFixed(1),
    alertas: alertasPendientes,
    operadores: operadoresActivos
  };
}

/**
 * Obtiene alertas recientes
 */
function getRecentAlerts(limit) {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const sheet = ss.getSheetByName(SHEETS.ALERTAS);
  const data = sheet.getDataRange().getValues();
  const headers = data[0];

  const alertas = data.slice(1).map(row => {
    const obj = {};
    headers.forEach((header, idx) => {
      obj[header] = row[idx];
    });
    return obj;
  });

  // Ordenar por fecha descendente y limitar
  alertas.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
  return alertas.slice(0, parseInt(limit));
}

/**
 * Guarda un registro de produccion
 */
function saveProduccion(data) {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const sheet = ss.getSheetByName(SHEETS.PRODUCCION);

  // Obtener headers o crear si no existen
  let headers = [];
  if (sheet.getLastRow() === 0) {
    headers = [
      'id', 'timestamp', 'fecha', 'turno', 'maquina', 'cliente', 'producto',
      'material', 'cantidadInicial', 'cantidadFinal', 'desperdicioKg',
      'desperdicioPct', 'tinta', 'solvente', 'adhesivo', 'observaciones',
      'operador', 'operadorNombre'
    ];
    sheet.appendRow(headers);
  } else {
    headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  }

  // Generar ID
  data.id = 'PRD_' + new Date().getTime();

  // Crear fila con los datos
  const row = headers.map(header => data[header] || '');
  sheet.appendRow(row);

  // Registrar en auditoria
  logAuditoria('CREAR', 'PRODUCCION', data.id, data.operador);

  // Verificar si requiere alerta
  const umbral = getUmbralMaterial(data.material);
  if (data.desperdicioPct > umbral.maximo) {
    const alerta = {
      timestamp: new Date().toISOString(),
      tipo: 'desperdicio_alto',
      nivel: data.desperdicioPct > umbral.maximo * 1.5 ? 'critical' : 'warning',
      maquina: data.maquina,
      operador: data.operadorNombre,
      mensaje: `Desperdicio ${data.desperdicioPct.toFixed(1)}% excede umbral de ${umbral.maximo}%`,
      estado: 'pendiente',
      registro_id: data.id
    };
    saveAlerta(alerta);
  }

  return { success: true, id: data.id };
}

/**
 * Guarda una alerta
 */
function saveAlerta(data) {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const sheet = ss.getSheetByName(SHEETS.ALERTAS);

  let headers = [];
  if (sheet.getLastRow() === 0) {
    headers = ['id', 'timestamp', 'tipo', 'nivel', 'maquina', 'operador', 'mensaje', 'estado', 'registro_id', 'atendida_por', 'atendida_timestamp'];
    sheet.appendRow(headers);
  } else {
    headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  }

  data.id = 'ALT_' + new Date().getTime();
  const row = headers.map(header => data[header] || '');
  sheet.appendRow(row);

  // Enviar notificacion por email si es critica
  if (data.nivel === 'critical') {
    enviarNotificacionEmail(data);
  }

  return { success: true, id: data.id };
}

/**
 * Actualiza el estado de una alerta
 */
function updateAlerta(data) {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const sheet = ss.getSheetByName(SHEETS.ALERTAS);
  const dataRange = sheet.getDataRange();
  const values = dataRange.getValues();
  const headers = values[0];

  const idIdx = headers.indexOf('id');
  const estadoIdx = headers.indexOf('estado');
  const atendidaPorIdx = headers.indexOf('atendida_por');
  const atendidaTimestampIdx = headers.indexOf('atendida_timestamp');

  for (let i = 1; i < values.length; i++) {
    if (values[i][idIdx] === data.id) {
      sheet.getRange(i + 1, estadoIdx + 1).setValue(data.estado);
      sheet.getRange(i + 1, atendidaPorIdx + 1).setValue(data.atendida_por);
      sheet.getRange(i + 1, atendidaTimestampIdx + 1).setValue(new Date().toISOString());

      logAuditoria('ACTUALIZAR', 'ALERTAS', data.id, data.atendida_por);
      return { success: true };
    }
  }

  return { error: 'Alerta no encontrada' };
}

/**
 * Obtiene los umbrales de desperdicio
 */
function getUmbrales() {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const sheet = ss.getSheetByName(SHEETS.CONFIGURACION);
  const data = sheet.getDataRange().getValues();
  const headers = data[0];

  const umbrales = {};
  const materialIdx = headers.indexOf('material');
  const maximoIdx = headers.indexOf('umbral_maximo');
  const advertenciaIdx = headers.indexOf('umbral_advertencia');

  for (let i = 1; i < data.length; i++) {
    umbrales[data[i][materialIdx]] = {
      maximo: data[i][maximoIdx],
      advertencia: data[i][advertenciaIdx]
    };
  }

  return umbrales;
}

/**
 * Obtiene el umbral de un material especifico
 */
function getUmbralMaterial(material) {
  const umbrales = getUmbrales();
  return umbrales[material] || umbrales['default'] || { maximo: 5, advertencia: 3.5 };
}

/**
 * Obtiene las cuentas por cobrar
 */
function getCuentasCobrar(params) {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const sheet = ss.getSheetByName(SHEETS.CUENTAS_COBRAR);
  const data = sheet.getDataRange().getValues();
  const headers = data[0];

  const cuentas = data.slice(1).map(row => {
    const obj = {};
    headers.forEach((header, idx) => {
      obj[header] = row[idx];
    });
    return obj;
  });

  // Filtrar por cliente si se especifica
  if (params && params.cliente) {
    return cuentas.filter(c => c.cliente.toLowerCase().includes(params.cliente.toLowerCase()));
  }

  return cuentas;
}

/**
 * Obtiene lista de clientes
 */
function getClientes() {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const sheet = ss.getSheetByName(SHEETS.CLIENTES);
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
 * Registra una accion en el log de auditoria
 */
function logAuditoria(accion, entidad, entidadId, usuario) {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  let sheet = ss.getSheetByName(SHEETS.AUDITORIA);

  if (!sheet) {
    sheet = ss.insertSheet(SHEETS.AUDITORIA);
    sheet.appendRow(['timestamp', 'accion', 'entidad', 'entidad_id', 'usuario', 'ip']);
  }

  sheet.appendRow([
    new Date().toISOString(),
    accion,
    entidad,
    entidadId,
    usuario,
    ''
  ]);
}

/**
 * Envia notificacion por email
 */
function enviarNotificacionEmail(alerta) {
  // Obtener emails de supervisores de la hoja de usuarios
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const sheet = ss.getSheetByName(SHEETS.USUARIOS);
  const data = sheet.getDataRange().getValues();
  const headers = data[0];

  const emailIdx = headers.indexOf('email');
  const rolIdx = headers.indexOf('rol');
  const activoIdx = headers.indexOf('activo');

  const supervisores = data.slice(1)
    .filter(row => (row[rolIdx] === 'supervisor' || row[rolIdx] === 'administrador') && row[activoIdx])
    .map(row => row[emailIdx]);

  if (supervisores.length === 0) return;

  const asunto = `[ALERTA ${alerta.nivel.toUpperCase()}] Sistema Axones - ${alerta.tipo}`;
  const cuerpo = `
    Se ha generado una alerta en el Sistema Axones:

    Tipo: ${alerta.tipo}
    Nivel: ${alerta.nivel}
    Maquina: ${alerta.maquina}
    Operador: ${alerta.operador}
    Mensaje: ${alerta.mensaje}
    Fecha/Hora: ${alerta.timestamp}

    Por favor revise el sistema para mas detalles.

    --
    Sistema Axones
    Control de Produccion
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
 * Maneja el proceso de login
 */
function handleLogin() {
  const user = Session.getActiveUser();
  const email = user.getEmail();

  if (!email) {
    return { error: 'No se pudo obtener el usuario' };
  }

  // Buscar usuario en la hoja de usuarios
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const sheet = ss.getSheetByName(SHEETS.USUARIOS);
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

/**
 * Guarda un despacho
 */
function saveDespacho(data) {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const sheet = ss.getSheetByName(SHEETS.DESPACHOS);

  let headers = [];
  if (sheet.getLastRow() === 0) {
    headers = [
      'id', 'timestamp', 'fecha', 'nota_entrega', 'cliente', 'productos',
      'cantidad_total', 'observaciones', 'registrado_por'
    ];
    sheet.appendRow(headers);
  } else {
    headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  }

  data.id = 'DSP_' + new Date().getTime();
  data.timestamp = new Date().toISOString();

  const row = headers.map(header => data[header] || '');
  sheet.appendRow(row);

  // Actualizar inventario
  actualizarInventario(data);

  logAuditoria('CREAR', 'DESPACHOS', data.id, data.registrado_por);

  return { success: true, id: data.id };
}

/**
 * Actualiza el inventario al registrar un despacho
 */
function actualizarInventario(despacho) {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const sheet = ss.getSheetByName(SHEETS.INVENTARIO);

  // Logica para actualizar inventario basado en el despacho
  // Esto dependerá de la estructura específica del inventario

  logAuditoria('ACTUALIZAR', 'INVENTARIO', 'despacho_' + despacho.id, despacho.registrado_por);
}
