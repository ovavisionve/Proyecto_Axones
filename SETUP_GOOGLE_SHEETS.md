# Configuracion Google Sheets - Sistema Axones
## Solo 3 pasos simples

---

## PASO 1: Crear Google Sheets vacio

1. Ve a [Google Sheets](https://sheets.google.com)
2. Crea una hoja nueva (en blanco)
3. Renombrala: **"Sistema Axones - Base de Datos"**

---

## PASO 2: Copiar el Apps Script

1. En tu Sheets, ve a **Extensiones > Apps Script**
2. Borra todo el codigo que aparece
3. Copia y pega TODO el codigo de abajo:

```javascript
/**
 * ============================================
 * SISTEMA AXONES - Google Apps Script Backend
 * Inversiones Axones 2008, C.A.
 * ============================================
 *
 * INSTRUCCIONES:
 * 1. Copiar este codigo completo
 * 2. Ir a Extensiones > Apps Script
 * 3. Pegar y guardar (Ctrl+S)
 * 4. Ejecutar: inicializarSistema()
 * 5. Desplegar como Web App
 */

// ==================== INICIALIZACION ====================

/**
 * EJECUTAR PRIMERO - Crea todas las hojas y datos iniciales
 */
function inicializarSistema() {
  const ui = SpreadsheetApp.getUi();

  ui.alert('Inicializando Sistema Axones',
    'Se crearan todas las hojas necesarias con sus datos iniciales.\n\nEsto puede tomar unos segundos...',
    ui.ButtonSet.OK);

  try {
    // Crear todas las hojas
    crearHojaUsuarios();
    crearHojaClientes();
    crearHojaProduccion();
    crearHojaInventario();
    crearHojaAlertas();
    crearHojaMaquinas();
    crearHojaDespachos();
    crearHojaConfiguracion();
    crearHojaConsumoTintas();
    crearHojaAuditoria();

    // Eliminar hoja por defecto si existe
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const defaultSheet = ss.getSheetByName('Hoja 1') || ss.getSheetByName('Sheet1');
    if (defaultSheet && ss.getSheets().length > 1) {
      ss.deleteSheet(defaultSheet);
    }

    ui.alert('Sistema Inicializado',
      'Todas las hojas han sido creadas correctamente.\n\n' +
      'Ahora debe desplegar el Web App:\n' +
      '1. Clic en Implementar > Nueva implementacion\n' +
      '2. Tipo: Aplicacion web\n' +
      '3. Ejecutar como: Tu cuenta\n' +
      '4. Acceso: Cualquier persona\n' +
      '5. Clic en Implementar\n' +
      '6. Copiar la URL generada',
      ui.ButtonSet.OK);

  } catch (error) {
    ui.alert('Error', 'Ocurrio un error: ' + error.toString(), ui.ButtonSet.OK);
  }
}

/**
 * Crea una hoja si no existe
 */
function crearHoja(nombre, encabezados, datos) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(nombre);

  if (!sheet) {
    sheet = ss.insertSheet(nombre);
  } else {
    sheet.clear();
  }

  // Encabezados
  if (encabezados && encabezados.length > 0) {
    sheet.getRange(1, 1, 1, encabezados.length).setValues([encabezados]);
    sheet.getRange(1, 1, 1, encabezados.length)
      .setBackground('#4285f4')
      .setFontColor('#ffffff')
      .setFontWeight('bold');
    sheet.setFrozenRows(1);
  }

  // Datos iniciales
  if (datos && datos.length > 0) {
    sheet.getRange(2, 1, datos.length, datos[0].length).setValues(datos);
  }

  // Ajustar columnas
  if (encabezados) {
    for (let i = 1; i <= encabezados.length; i++) {
      sheet.autoResizeColumn(i);
    }
  }

  return sheet;
}

// ==================== CREAR HOJAS ====================

function crearHojaUsuarios() {
  const encabezados = ['id', 'usuario', 'password', 'nombre', 'rol', 'activo', 'fecha_creacion', 'ultimo_acceso'];
  const datos = [
    [1, 'admin', 'admin123', 'Administrador', 'administrador', true, new Date().toISOString(), ''],
    [2, 'supervisor', 'super123', 'Supervisor Planta', 'supervisor', true, new Date().toISOString(), ''],
    [3, 'jefe', 'jefe123', 'Jefe Operaciones', 'jefe_operaciones', true, new Date().toISOString(), ''],
    [4, 'operador1', 'op123', 'Juan Perez', 'operador', true, new Date().toISOString(), ''],
    [5, 'operador2', 'op123', 'Maria Garcia', 'operador', true, new Date().toISOString(), ''],
  ];
  crearHoja('USUARIOS', encabezados, datos);
}

function crearHojaClientes() {
  const encabezados = ['id', 'nombre', 'rif', 'direccion', 'telefono', 'email', 'activo'];
  const datos = [
    [1, 'Alivensa', 'J-12345678-9', 'Caracas', '0212-1234567', '', true],
    [2, 'Amacorp', 'J-23456789-0', 'Valencia', '0241-2345678', '', true],
    [3, 'Agua Blanca', 'J-34567890-1', 'Maracay', '0243-3456789', '', true],
    [4, 'Alimentos Alvarigua', 'J-45678901-2', 'Barquisimeto', '0251-4567890', '', true],
    [5, 'Industrias Rico Mundo', 'J-56789012-3', 'Caracas', '0212-5678901', '', true],
    [6, 'Inproa Santoni', 'J-67890123-4', 'Valencia', '0241-6789012', '', true],
    [7, 'Alimentos El Toro', 'J-78901234-5', 'Maracay', '0243-7890123', '', true],
    [8, 'Pasta La Sirena', 'J-89012345-6', 'Caracas', '0212-8901234', '', true],
    [9, 'FDLM (Fior di Latte)', 'J-90123456-7', 'Valencia', '0241-9012345', '', true],
    [10, 'Procesadora de Alimentos Viuz', 'J-01234567-8', 'Barquisimeto', '0251-0123456', '', true],
    [11, 'Corporacion de Alimentos Regina', 'J-11234567-9', 'Caracas', '0212-1123456', '', true],
    [12, 'Representaciones Saj', 'J-21234567-0', 'Valencia', '0241-2123456', '', true],
  ];
  crearHoja('CLIENTES', encabezados, datos);
}

function crearHojaProduccion() {
  const encabezados = [
    'id', 'fecha', 'turno', 'maquina', 'proceso', 'cliente', 'producto', 'ot',
    'kilos_producidos', 'kilos_entrada', 'refil_kg', 'refil_porcentaje',
    'tiempo_trabajo_min', 'tiempo_muerto_min', 'operador', 'observaciones',
    'estado', 'created_at', 'updated_at'
  ];
  crearHoja('PRODUCCION', encabezados, []);
}

function crearHojaInventario() {
  const encabezados = ['id', 'tipo', 'material', 'cantidad', 'unidad', 'ubicacion', 'lote', 'fecha_entrada', 'proveedor', 'observaciones'];
  crearHoja('INVENTARIO', encabezados, []);
}

function crearHojaAlertas() {
  const encabezados = ['id', 'tipo', 'nivel', 'mensaje', 'fecha', 'leida', 'usuario_id', 'referencia_id', 'referencia_tipo'];
  crearHoja('ALERTAS', encabezados, []);
}

function crearHojaMaquinas() {
  const encabezados = ['id', 'codigo', 'nombre', 'tipo', 'estado', 'ubicacion', 'ultimo_mantenimiento'];
  const datos = [
    [1, 'comexi_1', 'COMEXI 1', 'impresora', 'activa', 'Planta', ''],
    [2, 'comexi_2', 'COMEXI 2', 'impresora', 'activa', 'Planta', ''],
    [3, 'comexi_3', 'COMEXI 3', 'impresora', 'activa', 'Planta', ''],
    [4, 'laminadora_1', 'Laminadora', 'laminadora', 'activa', 'Planta', ''],
    [5, 'cortadora_china', 'China', 'cortadora', 'activa', 'Planta', ''],
    [6, 'cortadora_permaco', 'Permaco', 'cortadora', 'activa', 'Planta', ''],
    [7, 'cortadora_novograf', 'Novograf', 'cortadora', 'activa', 'Planta', ''],
  ];
  crearHoja('MAQUINAS', encabezados, datos);
}

function crearHojaDespachos() {
  const encabezados = ['id', 'fecha', 'cliente', 'producto', 'cantidad', 'unidad', 'guia', 'transporte', 'destino', 'observaciones', 'created_by'];
  crearHoja('DESPACHOS', encabezados, []);
}

function crearHojaConfiguracion() {
  const encabezados = ['clave', 'valor', 'descripcion'];
  const datos = [
    ['refil_maximo', '6.0', 'Porcentaje maximo de refil aceptado'],
    ['refil_advertencia', '5.0', 'Porcentaje de advertencia de refil'],
    ['empresa_nombre', 'Inversiones Axones 2008, C.A.', 'Nombre de la empresa'],
    ['empresa_rif', 'J-29882122-7', 'RIF de la empresa'],
  ];
  crearHoja('CONFIGURACION', encabezados, datos);
}

function crearHojaConsumoTintas() {
  const encabezados = ['id', 'fecha', 'turno', 'maquina', 'produccion_id', 'tinta_tipo', 'tinta_nombre', 'cantidad_kg', 'operador'];
  crearHoja('CONSUMO_TINTAS', encabezados, []);
}

function crearHojaAuditoria() {
  const encabezados = ['id', 'fecha', 'usuario', 'accion', 'tabla', 'registro_id', 'datos_anteriores', 'datos_nuevos'];
  crearHoja('AUDITORIA', encabezados, []);
}

// ==================== API WEB ====================

function doGet(e) {
  return handleRequest(e);
}

function doPost(e) {
  return handleRequest(e);
}

function handleRequest(e) {
  const output = ContentService.createTextOutput();
  output.setMimeType(ContentService.MimeType.JSON);

  try {
    const params = e.parameter;
    const action = params.action || 'ping';

    let result;

    switch(action) {
      // Autenticacion
      case 'login':
        result = login(params.usuario, params.password);
        break;

      // CRUD Usuarios
      case 'getUsuarios':
        result = getUsuarios();
        break;
      case 'createUsuario':
        result = createUsuario(JSON.parse(params.data));
        break;

      // CRUD Produccion
      case 'getProduccion':
        result = getProduccion(params);
        break;
      case 'createProduccion':
        result = createProduccion(JSON.parse(params.data));
        break;
      case 'updateProduccion':
        result = updateProduccion(params.id, JSON.parse(params.data));
        break;

      // CRUD Clientes
      case 'getClientes':
        result = getClientes();
        break;
      case 'createCliente':
        result = createCliente(JSON.parse(params.data));
        break;

      // CRUD Inventario
      case 'getInventario':
        result = getInventario(params);
        break;
      case 'createInventario':
        result = createInventario(JSON.parse(params.data));
        break;
      case 'updateInventario':
        result = updateInventario(params.id, JSON.parse(params.data));
        break;

      // CRUD Alertas
      case 'getAlertas':
        result = getAlertas(params);
        break;
      case 'createAlerta':
        result = createAlerta(JSON.parse(params.data));
        break;
      case 'marcarAlertaLeida':
        result = marcarAlertaLeida(params.id);
        break;

      // CRUD Maquinas
      case 'getMaquinas':
        result = getMaquinas();
        break;

      // CRUD Despachos
      case 'getDespachos':
        result = getDespachos(params);
        break;
      case 'createDespacho':
        result = createDespacho(JSON.parse(params.data));
        break;

      // Configuracion
      case 'getConfiguracion':
        result = getConfiguracion();
        break;
      case 'updateConfiguracion':
        result = updateConfiguracion(params.clave, params.valor);
        break;

      // Consumo de Tintas
      case 'getConsumoTintas':
        result = getConsumoTintas(params);
        break;
      case 'createConsumoTinta':
        result = createConsumoTinta(JSON.parse(params.data));
        break;

      // Dashboard/Reportes
      case 'getDashboardData':
        result = getDashboardData(params);
        break;
      case 'getResumenProduccion':
        result = getResumenProduccion(params);
        break;

      // Auditoria
      case 'getAuditoria':
        result = getAuditoria(params);
        break;

      // Ping/Test
      case 'ping':
        result = {
          success: true,
          message: 'API Sistema Axones funcionando correctamente',
          timestamp: new Date().toISOString(),
          sheetsId: SpreadsheetApp.getActiveSpreadsheet().getId(),
          version: '1.0.0'
        };
        break;

      default:
        result = { success: false, error: 'Accion no reconocida: ' + action };
    }

    output.setContent(JSON.stringify(result));

  } catch (error) {
    output.setContent(JSON.stringify({
      success: false,
      error: error.toString(),
      stack: error.stack
    }));
  }

  return output;
}

// ==================== UTILIDADES ====================

function getSheet(nombre) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  return ss.getSheetByName(nombre);
}

function getSheetData(nombre) {
  const sheet = getSheet(nombre);
  if (!sheet) return [];

  const data = sheet.getDataRange().getValues();
  if (data.length <= 1) return [];

  const headers = data[0];
  const rows = data.slice(1);

  return rows.map((row, index) => {
    const obj = { _rowIndex: index + 2 };
    headers.forEach((header, i) => {
      obj[header] = row[i];
    });
    return obj;
  }).filter(row => row.id !== '' && row.id !== null);
}

function appendToSheet(nombre, data) {
  const sheet = getSheet(nombre);
  if (!sheet) throw new Error('Hoja no encontrada: ' + nombre);

  const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  const newRow = headers.map(h => data[h] !== undefined ? data[h] : '');

  sheet.appendRow(newRow);
  return sheet.getLastRow();
}

function updateSheetRow(nombre, rowIndex, data) {
  const sheet = getSheet(nombre);
  if (!sheet) throw new Error('Hoja no encontrada: ' + nombre);

  const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];

  headers.forEach((header, colIndex) => {
    if (data[header] !== undefined) {
      sheet.getRange(rowIndex, colIndex + 1).setValue(data[header]);
    }
  });

  return true;
}

function getNextId(nombre) {
  const data = getSheetData(nombre);
  if (data.length === 0) return 1;
  const maxId = Math.max(...data.map(r => parseInt(r.id) || 0));
  return maxId + 1;
}

function registrarAuditoria(usuario, accion, tabla, registroId, datosAnteriores, datosNuevos) {
  try {
    appendToSheet('AUDITORIA', {
      id: getNextId('AUDITORIA'),
      fecha: new Date().toISOString(),
      usuario: usuario,
      accion: accion,
      tabla: tabla,
      registro_id: registroId,
      datos_anteriores: JSON.stringify(datosAnteriores || {}),
      datos_nuevos: JSON.stringify(datosNuevos || {})
    });
  } catch (e) {
    console.error('Error en auditoria:', e);
  }
}

// ==================== AUTENTICACION ====================

function login(usuario, password) {
  const usuarios = getSheetData('USUARIOS');
  const user = usuarios.find(u =>
    u.usuario === usuario &&
    u.password === password &&
    (u.activo === true || u.activo === 'TRUE' || u.activo === 'true')
  );

  if (user) {
    updateSheetRow('USUARIOS', user._rowIndex, { ultimo_acceso: new Date().toISOString() });

    return {
      success: true,
      usuario: {
        id: user.id,
        usuario: user.usuario,
        nombre: user.nombre,
        rol: user.rol
      }
    };
  }

  return { success: false, error: 'Credenciales invalidas' };
}

// ==================== USUARIOS ====================

function getUsuarios() {
  const usuarios = getSheetData('USUARIOS');
  return {
    success: true,
    data: usuarios.map(u => ({
      id: u.id,
      usuario: u.usuario,
      nombre: u.nombre,
      rol: u.rol,
      activo: u.activo,
      fecha_creacion: u.fecha_creacion,
      ultimo_acceso: u.ultimo_acceso
    }))
  };
}

function createUsuario(data) {
  data.id = getNextId('USUARIOS');
  data.fecha_creacion = new Date().toISOString();
  data.activo = true;

  appendToSheet('USUARIOS', data);
  registrarAuditoria('sistema', 'crear', 'USUARIOS', data.id, null, data);

  return { success: true, id: data.id };
}

// ==================== CLIENTES ====================

function getClientes() {
  const clientes = getSheetData('CLIENTES').filter(c =>
    c.activo === true || c.activo === 'TRUE' || c.activo === 'true'
  );
  return { success: true, data: clientes };
}

function createCliente(data) {
  data.id = getNextId('CLIENTES');
  data.activo = true;

  appendToSheet('CLIENTES', data);
  registrarAuditoria('sistema', 'crear', 'CLIENTES', data.id, null, data);

  return { success: true, id: data.id };
}

// ==================== PRODUCCION ====================

function getProduccion(params) {
  let data = getSheetData('PRODUCCION');

  if (params.fecha_desde) {
    data = data.filter(r => new Date(r.fecha) >= new Date(params.fecha_desde));
  }
  if (params.fecha_hasta) {
    data = data.filter(r => new Date(r.fecha) <= new Date(params.fecha_hasta));
  }
  if (params.maquina) {
    data = data.filter(r => r.maquina === params.maquina);
  }
  if (params.cliente) {
    data = data.filter(r => r.cliente === params.cliente);
  }
  if (params.turno) {
    data = data.filter(r => r.turno === params.turno);
  }
  if (params.proceso) {
    data = data.filter(r => r.proceso === params.proceso);
  }

  return { success: true, data: data };
}

function createProduccion(data) {
  data.id = getNextId('PRODUCCION');
  data.created_at = new Date().toISOString();
  data.updated_at = data.created_at;
  data.estado = data.estado || 'completado';

  // Calcular refil porcentaje
  if (data.kilos_entrada && data.refil_kg) {
    data.refil_porcentaje = ((parseFloat(data.refil_kg) / parseFloat(data.kilos_entrada)) * 100).toFixed(2);
  }

  appendToSheet('PRODUCCION', data);

  // Verificar alerta de refil
  const config = getConfiguracion().data;
  const maxRefil = parseFloat(config.refil_maximo) || 6.0;

  if (parseFloat(data.refil_porcentaje) > maxRefil) {
    createAlerta({
      tipo: 'refil_alto',
      nivel: 'warning',
      mensaje: 'Refil alto (' + data.refil_porcentaje + '%) en produccion #' + data.id + ' - ' + data.cliente,
      usuario_id: null,
      referencia_id: data.id,
      referencia_tipo: 'produccion'
    });
  }

  registrarAuditoria(data.operador || 'sistema', 'crear', 'PRODUCCION', data.id, null, data);

  return { success: true, id: data.id, refil_porcentaje: data.refil_porcentaje };
}

function updateProduccion(id, data) {
  const produccion = getSheetData('PRODUCCION');
  const registro = produccion.find(p => p.id == id);

  if (!registro) {
    return { success: false, error: 'Registro no encontrado' };
  }

  data.updated_at = new Date().toISOString();

  if (data.kilos_entrada && data.refil_kg) {
    data.refil_porcentaje = ((parseFloat(data.refil_kg) / parseFloat(data.kilos_entrada)) * 100).toFixed(2);
  }

  updateSheetRow('PRODUCCION', registro._rowIndex, data);
  registrarAuditoria('sistema', 'actualizar', 'PRODUCCION', id, registro, data);

  return { success: true };
}

// ==================== INVENTARIO ====================

function getInventario(params) {
  let data = getSheetData('INVENTARIO');

  if (params.tipo) {
    data = data.filter(r => r.tipo === params.tipo);
  }
  if (params.material) {
    data = data.filter(r => r.material === params.material);
  }

  return { success: true, data: data };
}

function createInventario(data) {
  data.id = getNextId('INVENTARIO');
  data.fecha_entrada = data.fecha_entrada || new Date().toISOString();

  appendToSheet('INVENTARIO', data);
  registrarAuditoria('sistema', 'crear', 'INVENTARIO', data.id, null, data);

  return { success: true, id: data.id };
}

function updateInventario(id, data) {
  const inventario = getSheetData('INVENTARIO');
  const registro = inventario.find(i => i.id == id);

  if (!registro) {
    return { success: false, error: 'Registro no encontrado' };
  }

  updateSheetRow('INVENTARIO', registro._rowIndex, data);
  registrarAuditoria('sistema', 'actualizar', 'INVENTARIO', id, registro, data);

  return { success: true };
}

// ==================== ALERTAS ====================

function getAlertas(params) {
  let data = getSheetData('ALERTAS');

  if (params.no_leidas === 'true') {
    data = data.filter(a => a.leida !== true && a.leida !== 'TRUE' && a.leida !== 'true');
  }
  if (params.tipo) {
    data = data.filter(a => a.tipo === params.tipo);
  }

  data.sort((a, b) => new Date(b.fecha) - new Date(a.fecha));

  return { success: true, data: data };
}

function createAlerta(data) {
  data.id = getNextId('ALERTAS');
  data.fecha = new Date().toISOString();
  data.leida = false;

  appendToSheet('ALERTAS', data);

  return { success: true, id: data.id };
}

function marcarAlertaLeida(id) {
  const alertas = getSheetData('ALERTAS');
  const alerta = alertas.find(a => a.id == id);

  if (!alerta) {
    return { success: false, error: 'Alerta no encontrada' };
  }

  updateSheetRow('ALERTAS', alerta._rowIndex, { leida: true });

  return { success: true };
}

// ==================== MAQUINAS ====================

function getMaquinas() {
  const maquinas = getSheetData('MAQUINAS');
  return { success: true, data: maquinas };
}

// ==================== DESPACHOS ====================

function getDespachos(params) {
  let data = getSheetData('DESPACHOS');

  if (params.fecha_desde) {
    data = data.filter(r => new Date(r.fecha) >= new Date(params.fecha_desde));
  }
  if (params.fecha_hasta) {
    data = data.filter(r => new Date(r.fecha) <= new Date(params.fecha_hasta));
  }
  if (params.cliente) {
    data = data.filter(r => r.cliente === params.cliente);
  }

  return { success: true, data: data };
}

function createDespacho(data) {
  data.id = getNextId('DESPACHOS');
  data.fecha = data.fecha || new Date().toISOString();

  appendToSheet('DESPACHOS', data);
  registrarAuditoria(data.created_by || 'sistema', 'crear', 'DESPACHOS', data.id, null, data);

  return { success: true, id: data.id };
}

// ==================== CONFIGURACION ====================

function getConfiguracion() {
  const config = getSheetData('CONFIGURACION');
  const obj = {};
  config.forEach(c => {
    obj[c.clave] = c.valor;
  });
  return { success: true, data: obj };
}

function updateConfiguracion(clave, valor) {
  const config = getSheetData('CONFIGURACION');
  const registro = config.find(c => c.clave === clave);

  if (registro) {
    updateSheetRow('CONFIGURACION', registro._rowIndex, { valor: valor });
  } else {
    appendToSheet('CONFIGURACION', { clave: clave, valor: valor, descripcion: '' });
  }

  return { success: true };
}

// ==================== CONSUMO TINTAS ====================

function getConsumoTintas(params) {
  let data = getSheetData('CONSUMO_TINTAS');

  if (params.fecha_desde) {
    data = data.filter(r => new Date(r.fecha) >= new Date(params.fecha_desde));
  }
  if (params.fecha_hasta) {
    data = data.filter(r => new Date(r.fecha) <= new Date(params.fecha_hasta));
  }
  if (params.tinta_tipo) {
    data = data.filter(r => r.tinta_tipo === params.tinta_tipo);
  }

  return { success: true, data: data };
}

function createConsumoTinta(data) {
  data.id = getNextId('CONSUMO_TINTAS');
  data.fecha = data.fecha || new Date().toISOString();

  appendToSheet('CONSUMO_TINTAS', data);

  return { success: true, id: data.id };
}

// ==================== DASHBOARD / REPORTES ====================

function getDashboardData(params) {
  const hoy = new Date();
  const inicioMes = new Date(hoy.getFullYear(), hoy.getMonth(), 1);

  const produccion = getSheetData('PRODUCCION').filter(p =>
    new Date(p.fecha) >= inicioMes
  );

  const totalKilos = produccion.reduce((sum, p) => sum + (parseFloat(p.kilos_producidos) || 0), 0);
  const totalRefil = produccion.reduce((sum, p) => sum + (parseFloat(p.refil_kg) || 0), 0);
  const totalEntrada = produccion.reduce((sum, p) => sum + (parseFloat(p.kilos_entrada) || 0), 0);
  const promedioRefil = totalEntrada > 0 ? ((totalRefil / totalEntrada) * 100).toFixed(2) : 0;

  const porMaquina = {};
  produccion.forEach(p => {
    if (!porMaquina[p.maquina]) porMaquina[p.maquina] = 0;
    porMaquina[p.maquina] += parseFloat(p.kilos_producidos) || 0;
  });

  const porCliente = {};
  produccion.forEach(p => {
    if (!porCliente[p.cliente]) porCliente[p.cliente] = 0;
    porCliente[p.cliente] += parseFloat(p.kilos_producidos) || 0;
  });

  const alertasNoLeidas = getSheetData('ALERTAS').filter(a =>
    a.leida !== true && a.leida !== 'TRUE' && a.leida !== 'true'
  ).length;

  return {
    success: true,
    data: {
      periodo: {
        inicio: inicioMes.toISOString(),
        fin: hoy.toISOString()
      },
      resumen: {
        total_kilos_producidos: totalKilos,
        total_refil_kg: totalRefil,
        promedio_refil_porcentaje: promedioRefil,
        total_registros: produccion.length,
        alertas_pendientes: alertasNoLeidas
      },
      por_maquina: porMaquina,
      por_cliente: porCliente
    }
  };
}

function getResumenProduccion(params) {
  let produccion = getSheetData('PRODUCCION');

  if (params.fecha_desde) {
    produccion = produccion.filter(p => new Date(p.fecha) >= new Date(params.fecha_desde));
  }
  if (params.fecha_hasta) {
    produccion = produccion.filter(p => new Date(p.fecha) <= new Date(params.fecha_hasta));
  }

  const resumen = {};
  produccion.forEach(p => {
    const cliente = p.cliente || 'Sin Cliente';
    if (!resumen[cliente]) {
      resumen[cliente] = {
        cliente: cliente,
        total_kilos: 0,
        total_refil: 0,
        registros: 0
      };
    }
    resumen[cliente].total_kilos += parseFloat(p.kilos_producidos) || 0;
    resumen[cliente].total_refil += parseFloat(p.refil_kg) || 0;
    resumen[cliente].registros++;
  });

  return {
    success: true,
    data: Object.values(resumen)
  };
}

// ==================== AUDITORIA ====================

function getAuditoria(params) {
  let data = getSheetData('AUDITORIA');

  if (params.fecha_desde) {
    data = data.filter(r => new Date(r.fecha) >= new Date(params.fecha_desde));
  }
  if (params.tabla) {
    data = data.filter(r => r.tabla === params.tabla);
  }

  data.sort((a, b) => new Date(b.fecha) - new Date(a.fecha));

  const limit = parseInt(params.limit) || 100;
  data = data.slice(0, limit);

  return { success: true, data: data };
}

// ==================== MENU PERSONALIZADO ====================

function onOpen() {
  const ui = SpreadsheetApp.getUi();
  ui.createMenu('Sistema Axones')
    .addItem('Inicializar Sistema', 'inicializarSistema')
    .addSeparator()
    .addItem('Probar API (ping)', 'testPing')
    .addToUi();
}

function testPing() {
  const ui = SpreadsheetApp.getUi();
  const result = {
    success: true,
    message: 'API funcionando',
    sheetsId: SpreadsheetApp.getActiveSpreadsheet().getId()
  };
  ui.alert('Test API', JSON.stringify(result, null, 2), ui.ButtonSet.OK);
}
```

4. Guarda el proyecto (Ctrl+S)

---

## PASO 3: Ejecutar e Implementar

### 3.1 Crear las hojas automaticamente:
1. En el menu de Apps Script, selecciona la funcion **`inicializarSistema`**
2. Clic en **Ejecutar** (boton de play)
3. Autoriza los permisos cuando lo solicite
4. Espera a que termine (te mostrara un mensaje de confirmacion)

### 3.2 Desplegar el Web App:

**IMPORTANTE: SIEMPRE crear una NUEVA implementacion. NUNCA editar una existente.**

Google Apps Script cachea las implementaciones. Si editas el codigo y actualizas una
implementacion existente, puede seguir ejecutando el codigo viejo. La unica forma
segura es crear una implementacion NUEVA.

1. Clic en **Implementar > Nueva implementacion**
2. Clic en el engranaje (icono de configuracion) y selecciona **Aplicacion web**
3. Configura:
   - Descripcion: `API Sistema Axones`
   - Ejecutar como: **Tu cuenta**
   - Quien tiene acceso: **Cualquier persona**
4. Clic en **Implementar**
5. **COPIA LA URL** que te genera (la necesitaras)

### SI NECESITAS ACTUALIZAR EL CODIGO DESPUES:
1. Edita el codigo en Apps Script
2. Guarda (Ctrl+S)
3. **NO** vayas a "Administrar implementaciones" para editar la existente
4. En su lugar, ve a **Implementar > Nueva implementacion** (crea una NUEVA)
5. Copia la URL nueva y actualiza config.js con ella
6. La URL antigua dejara de funcionar automaticamente si la eliminas desde
   **Implementar > Administrar implementaciones**

---

## PASO 4: Actualizar config.js

Abre el archivo `public/src/js/utils/config.js` y actualiza:

```javascript
API: {
    BASE_URL: 'PEGAR_URL_DEL_WEB_APP_AQUI',
    SHEETS_ID: 'PEGAR_ID_DEL_SHEETS_AQUI',
},
```

El ID del Sheets esta en la URL:
`https://docs.google.com/spreadsheets/d/ESTE_ES_EL_ID/edit`

---

## Probar que funciona

Abre en el navegador:
```
TU_URL_WEB_APP?action=ping
```

Debe responder:
```json
{
  "success": true,
  "message": "API Sistema Axones funcionando correctamente",
  "timestamp": "...",
  "sheetsId": "...",
  "version": "1.0.0"
}
```

Probar login:
```
TU_URL_WEB_APP?action=login&usuario=admin&password=admin123
```

Debe responder:
```json
{
  "success": true,
  "usuario": { "id": 1, "usuario": "admin", "nombre": "Administrador", "rol": "administrador" }
}
```

**Si ves un error como `{"error":"No se pudo obtener el usuario"}` significa que el Web App
esta ejecutando codigo viejo cacheado. Debes crear una NUEVA implementacion (ver paso 3.2).**

---

## Usuarios por defecto

| Usuario | Password | Rol |
|---------|----------|-----|
| admin | admin123 | Administrador |
| supervisor | super123 | Supervisor |
| jefe | jefe123 | Jefe Operaciones |
| operador1 | op123 | Operador |
| operador2 | op123 | Operador |

**Nota:** El login en la aplicacion funciona PRIMERO con validacion local (estos
mismos usuarios estan hardcodeados en el frontend), y despues intenta con la API.
Esto garantiza que el login siempre funcione aunque la API tenga problemas.

---

## Endpoints disponibles

| Endpoint | Descripcion |
|----------|-------------|
| `?action=ping` | Probar conexion |
| `?action=login&usuario=X&password=Y` | Iniciar sesion |
| `?action=getClientes` | Lista de clientes |
| `?action=getMaquinas` | Lista de maquinas |
| `?action=getProduccion` | Registros de produccion |
| `?action=getDashboardData` | Datos del dashboard |
| `?action=getAlertas` | Alertas del sistema |
| `?action=getInventario` | Inventario |
| `?action=getConsumoTintas` | Consumo de tintas |
| `?action=getDespachos` | Despachos |
| `?action=getConfiguracion` | Configuracion del sistema |

---

## Solucion de problemas

### La API responde con error viejo / codigo cacheado
- Crear una NUEVA implementacion (Implementar > Nueva implementacion)
- Copiar la URL nueva a config.js

### Error de CORS o redireccion
- Verificar que "Quien tiene acceso" sea **Cualquier persona**
- Las llamadas deben usar `redirect: 'follow'` (ya configurado en api.js)

### El ping funciona pero otras acciones no
- Verificar que ejecutaste `inicializarSistema()` para crear las hojas
- Abrir el Sheets y verificar que las hojas USUARIOS, CLIENTES, etc. existen

### El login no funciona
- El login local (hardcodeado en el frontend) siempre debe funcionar
- Usuarios: admin/admin123, supervisor/super123, jefe/jefe123, operador1/op123
