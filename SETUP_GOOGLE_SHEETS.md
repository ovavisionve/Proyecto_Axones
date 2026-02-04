# Configuracion Completa de Google Sheets + Apps Script
## Sistema Axones - Inversiones Axones 2008, C.A.

---

## PASO 1: Crear el Google Sheets

1. Ve a [Google Sheets](https://sheets.google.com)
2. Crea una nueva hoja de calculo
3. Renombrala como: **"Sistema Axones - Base de Datos"**
4. Copia el ID del Sheets de la URL (es el texto largo entre `/d/` y `/edit`)
   - Ejemplo: `https://docs.google.com/spreadsheets/d/ESTE_ES_EL_ID/edit`

---

## PASO 2: Crear las Hojas (Pestanas)

Crea las siguientes hojas con estos nombres EXACTOS:

| # | Nombre de Hoja | Descripcion |
|---|----------------|-------------|
| 1 | PRODUCCION | Registros de produccion |
| 2 | USUARIOS | Usuarios del sistema |
| 3 | CLIENTES | Lista de clientes |
| 4 | INVENTARIO | Inventario de materiales |
| 5 | ALERTAS | Alertas del sistema |
| 6 | CONFIGURACION | Parametros del sistema |
| 7 | MAQUINAS | Registro de maquinas |
| 8 | DESPACHOS | Registro de despachos |
| 9 | AUDITORIA | Log de cambios |
| 10 | CONSUMO_TINTAS | Consumo de tintas y solventes |

---

## PASO 3: Estructura de cada Hoja

### HOJA: USUARIOS (Fila 1 = Encabezados)
```
A1: id
B1: usuario
C1: password
D1: nombre
E1: rol
F1: activo
G1: fecha_creacion
H1: ultimo_acceso
```

**Datos iniciales (Fila 2):**
```
A2: 1
B2: admin
C2: admin123
D2: Administrador
E2: administrador
F2: true
G2: =NOW()
H2: (dejar vacio)
```

**Usuarios adicionales sugeridos (Filas 3-6):**
```
Fila 3: 2, supervisor, super123, Supervisor Planta, supervisor, true, =NOW()
Fila 4: 3, jefe, jefe123, Jefe Operaciones, jefe_operaciones, true, =NOW()
Fila 5: 4, operador1, op123, Juan Perez, operador, true, =NOW()
Fila 6: 5, operador2, op123, Maria Garcia, operador, true, =NOW()
```

---

### HOJA: CLIENTES (Fila 1 = Encabezados)
```
A1: id
B1: nombre
C1: rif
D1: direccion
E1: telefono
F1: email
G1: activo
```

**Datos iniciales (Filas 2-13):**
```
1, Alivensa, J-12345678-9, Caracas, 0212-1234567, , true
2, Amacorp, J-23456789-0, Valencia, 0241-2345678, , true
3, Agua Blanca, J-34567890-1, Maracay, 0243-3456789, , true
4, Alimentos Alvarigua, J-45678901-2, Barquisimeto, 0251-4567890, , true
5, Industrias Rico Mundo, J-56789012-3, Caracas, 0212-5678901, , true
6, Inproa Santoni, J-67890123-4, Valencia, 0241-6789012, , true
7, Alimentos El Toro, J-78901234-5, Maracay, 0243-7890123, , true
8, Pasta La Sirena, J-89012345-6, Caracas, 0212-8901234, , true
9, FDLM (Fior di Latte), J-90123456-7, Valencia, 0241-9012345, , true
10, Procesadora de Alimentos Viuz, J-01234567-8, Barquisimeto, 0251-0123456, , true
11, Corporacion de Alimentos Regina, J-11234567-9, Caracas, 0212-1123456, , true
12, Representaciones Saj, J-21234567-0, Valencia, 0241-2123456, , true
```

---

### HOJA: PRODUCCION (Fila 1 = Encabezados)
```
A1: id
B1: fecha
C1: turno
D1: maquina
E1: proceso
F1: cliente
G1: producto
H1: ot
I1: kilos_producidos
J1: kilos_entrada
K1: refil_kg
L1: refil_porcentaje
M1: tiempo_trabajo_min
N1: tiempo_muerto_min
O1: operador
P1: observaciones
Q1: estado
R1: created_at
S1: updated_at
```

---

### HOJA: INVENTARIO (Fila 1 = Encabezados)
```
A1: id
B1: tipo
C1: material
D1: cantidad
E1: unidad
F1: ubicacion
G1: lote
H1: fecha_entrada
I1: proveedor
J1: observaciones
```

---

### HOJA: ALERTAS (Fila 1 = Encabezados)
```
A1: id
B1: tipo
C1: nivel
D1: mensaje
E1: fecha
F1: leida
G1: usuario_id
H1: referencia_id
I1: referencia_tipo
```

---

### HOJA: MAQUINAS (Fila 1 = Encabezados)
```
A1: id
B1: codigo
C1: nombre
D1: tipo
E1: estado
F1: ubicacion
G1: ultima_mantenimiento
```

**Datos iniciales:**
```
1, comexi_1, COMEXI 1, impresora, activa, Planta
2, comexi_2, COMEXI 2, impresora, activa, Planta
3, comexi_3, COMEXI 3, impresora, activa, Planta
4, laminadora_1, Laminadora, laminadora, activa, Planta
5, cortadora_china, China, cortadora, activa, Planta
6, cortadora_permaco, Permaco, cortadora, activa, Planta
7, cortadora_novograf, Novograf, cortadora, activa, Planta
```

---

### HOJA: DESPACHOS (Fila 1 = Encabezados)
```
A1: id
B1: fecha
C1: cliente
D1: producto
E1: cantidad
F1: unidad
G1: guia
H1: transporte
I1: destino
J1: observaciones
K1: created_by
```

---

### HOJA: CONFIGURACION (Fila 1 = Encabezados)
```
A1: clave
B1: valor
C1: descripcion
```

**Datos iniciales:**
```
refil_maximo, 6.0, Porcentaje maximo de refil aceptado
refil_advertencia, 5.0, Porcentaje de advertencia de refil
empresa_nombre, Inversiones Axones 2008 C.A., Nombre de la empresa
empresa_rif, J-12345678-9, RIF de la empresa
```

---

### HOJA: CONSUMO_TINTAS (Fila 1 = Encabezados)
```
A1: id
B1: fecha
C1: turno
D1: maquina
E1: produccion_id
F1: tinta_tipo
G1: tinta_nombre
H1: cantidad_kg
I1: operador
```

---

### HOJA: AUDITORIA (Fila 1 = Encabezados)
```
A1: id
B1: fecha
C1: usuario
D1: accion
E1: tabla
F1: registro_id
G1: datos_anteriores
H1: datos_nuevos
```

---

## PASO 4: Configurar Apps Script

1. En el Google Sheets, ve a **Extensiones > Apps Script**
2. Borra todo el codigo existente
3. Crea los siguientes archivos:

---

### Archivo: Code.gs (Principal)

```javascript
/**
 * Sistema Axones - Google Apps Script Backend
 * Inversiones Axones 2008, C.A.
 * API para el sistema de produccion
 */

// ID del Sheets (se configura automaticamente)
const SHEETS_ID = SpreadsheetApp.getActiveSpreadsheet().getId();

// Configuracion de CORS
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
        result = { success: true, message: 'API Axones funcionando', timestamp: new Date().toISOString(), sheetsId: SHEETS_ID };
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
  });
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
    u.activo === true
  );

  if (user) {
    // Actualizar ultimo acceso
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
  const clientes = getSheetData('CLIENTES').filter(c => c.activo !== false);
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

  // Filtros opcionales
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

  return { success: true, data: data };
}

function createProduccion(data) {
  data.id = getNextId('PRODUCCION');
  data.created_at = new Date().toISOString();
  data.updated_at = data.created_at;

  // Calcular refil porcentaje si no viene
  if (data.kilos_entrada && data.refil_kg && !data.refil_porcentaje) {
    data.refil_porcentaje = ((data.refil_kg / data.kilos_entrada) * 100).toFixed(2);
  }

  appendToSheet('PRODUCCION', data);

  // Verificar si hay alerta de refil
  const config = getConfiguracion().data;
  const maxRefil = parseFloat(config.refil_maximo) || 6.0;

  if (parseFloat(data.refil_porcentaje) > maxRefil) {
    createAlerta({
      tipo: 'refil_alto',
      nivel: 'warning',
      mensaje: `Refil alto (${data.refil_porcentaje}%) en produccion #${data.id} - ${data.cliente}`,
      usuario_id: null,
      referencia_id: data.id,
      referencia_tipo: 'produccion'
    });
  }

  registrarAuditoria(data.operador || 'sistema', 'crear', 'PRODUCCION', data.id, null, data);

  return { success: true, id: data.id };
}

function updateProduccion(id, data) {
  const produccion = getSheetData('PRODUCCION');
  const registro = produccion.find(p => p.id == id);

  if (!registro) {
    return { success: false, error: 'Registro no encontrado' };
  }

  data.updated_at = new Date().toISOString();

  // Recalcular refil si es necesario
  if (data.kilos_entrada && data.refil_kg) {
    data.refil_porcentaje = ((data.refil_kg / data.kilos_entrada) * 100).toFixed(2);
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
    data = data.filter(a => a.leida !== true && a.leida !== 'true');
  }
  if (params.tipo) {
    data = data.filter(a => a.tipo === params.tipo);
  }

  // Ordenar por fecha descendente
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

  // Produccion del mes
  const produccion = getSheetData('PRODUCCION').filter(p =>
    new Date(p.fecha) >= inicioMes
  );

  // Calcular metricas
  const totalKilos = produccion.reduce((sum, p) => sum + (parseFloat(p.kilos_producidos) || 0), 0);
  const totalRefil = produccion.reduce((sum, p) => sum + (parseFloat(p.refil_kg) || 0), 0);
  const totalEntrada = produccion.reduce((sum, p) => sum + (parseFloat(p.kilos_entrada) || 0), 0);
  const promedioRefil = totalEntrada > 0 ? ((totalRefil / totalEntrada) * 100).toFixed(2) : 0;

  // Produccion por maquina
  const porMaquina = {};
  produccion.forEach(p => {
    if (!porMaquina[p.maquina]) porMaquina[p.maquina] = 0;
    porMaquina[p.maquina] += parseFloat(p.kilos_producidos) || 0;
  });

  // Produccion por cliente
  const porCliente = {};
  produccion.forEach(p => {
    if (!porCliente[p.cliente]) porCliente[p.cliente] = 0;
    porCliente[p.cliente] += parseFloat(p.kilos_producidos) || 0;
  });

  // Alertas no leidas
  const alertasNoLeidas = getSheetData('ALERTAS').filter(a =>
    a.leida !== true && a.leida !== 'true'
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

  // Agrupar por cliente
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

  // Ordenar por fecha descendente
  data.sort((a, b) => new Date(b.fecha) - new Date(a.fecha));

  // Limitar resultados
  const limit = parseInt(params.limit) || 100;
  data = data.slice(0, limit);

  return { success: true, data: data };
}
```

---

## PASO 5: Desplegar el Apps Script

1. En el editor de Apps Script, guarda el proyecto (Ctrl+S)
2. Haz clic en **Implementar > Nueva implementacion**
3. Selecciona tipo: **Aplicacion web**
4. Configura:
   - Descripcion: "API Sistema Axones v1"
   - Ejecutar como: **Tu cuenta**
   - Quien tiene acceso: **Cualquier persona**
5. Haz clic en **Implementar**
6. Copia la URL del Web App (empieza con `https://script.google.com/macros/s/...`)

---

## PASO 6: Probar la API

Abre en el navegador la URL del Web App agregando `?action=ping`:

```
https://script.google.com/macros/s/TU_ID/exec?action=ping
```

Debe responder algo como:
```json
{
  "success": true,
  "message": "API Axones funcionando",
  "timestamp": "2026-02-04T...",
  "sheetsId": "TU_SHEETS_ID"
}
```

---

## PASO 7: Actualizar config.js con los datos reales

Una vez que tengas:
1. El ID del Google Sheets
2. La URL del Web App

Actualiza el archivo `public/src/js/utils/config.js` con esos valores.

---

## Endpoints Disponibles

| Action | Metodo | Descripcion |
|--------|--------|-------------|
| `ping` | GET | Verificar conexion |
| `login` | GET | Autenticar usuario |
| `getUsuarios` | GET | Lista de usuarios |
| `getClientes` | GET | Lista de clientes |
| `getProduccion` | GET | Registros de produccion |
| `createProduccion` | GET/POST | Crear registro |
| `updateProduccion` | GET/POST | Actualizar registro |
| `getInventario` | GET | Inventario |
| `getAlertas` | GET | Alertas del sistema |
| `getMaquinas` | GET | Maquinas |
| `getDespachos` | GET | Despachos |
| `getDashboardData` | GET | Datos del dashboard |
| `getConfiguracion` | GET | Configuracion |

---

## Ejemplo de uso desde JavaScript

```javascript
// Ping
fetch(CONFIG.API.BASE_URL + '?action=ping')
  .then(r => r.json())
  .then(console.log);

// Login
fetch(CONFIG.API.BASE_URL + '?action=login&usuario=admin&password=admin123')
  .then(r => r.json())
  .then(console.log);

// Obtener clientes
fetch(CONFIG.API.BASE_URL + '?action=getClientes')
  .then(r => r.json())
  .then(console.log);

// Crear produccion
const data = {
  fecha: '2026-02-04',
  turno: '1',
  maquina: 'comexi_1',
  cliente: 'Alivensa',
  kilos_producidos: 500,
  kilos_entrada: 520,
  refil_kg: 20
};
fetch(CONFIG.API.BASE_URL + '?action=createProduccion&data=' + encodeURIComponent(JSON.stringify(data)))
  .then(r => r.json())
  .then(console.log);
```
