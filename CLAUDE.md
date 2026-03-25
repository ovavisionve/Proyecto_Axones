# CLAUDE.md - Sistema Axones

## Descripcion del Proyecto
Sistema integral de gestion y control de produccion para **Inversiones Axones 2008, C.A.** - empresa de empaques flexibles plasticos en Venezuela.

**Version:** 1.6.0
**Ultima actualizacion:** 2026-03-25

## URLs de Vercel
- **Desarrollo:** https://proyecto-axones-git-claude-setup-axones-project-ja8zk-ova1.vercel.app/
- **Produccion:** https://proyecto-axones.vercel.app/ (rama main)

## Datos de la Empresa
```
Razon Social: INVERSIONES AXONES 2008, C.A.
RIF: J-40081341-7
Direccion: Calle Parcelamiento Industrial Guere, local 35, sector La Julia, Turmero, Aragua
Telefono: 0424-316.96.12
Emails: axones2008@gmail.com, gerenciaaxones@gmail.com
```

## Estructura del Proyecto
```
public/
├── login.html              # Pagina de login obligatorio (gate de acceso)
├── index.html              # Dashboard principal
├── ordenes.html            # Gestion de ordenes de trabajo (formulario completo)
├── impresion.html          # Modulo de impresion (COMEXI 1/COMEXI 3)
├── laminacion.html         # Modulo de laminacion (NEXUS)
├── corte.html              # Modulo de corte (3 cortadoras)
├── inventario.html         # Inventario (158 productos reales)
├── programacion.html       # Programacion Kanban de ordenes
├── tintas.html             # Gestion de tintas (4 tabs: Consumo, Inventario, Cementerio, Mezclas)
├── certificado.html        # Certificados de calidad
├── etiquetas.html          # Generador de etiquetas
├── reportes.html           # Reportes y estadisticas
├── alertas.html            # Sistema de alertas
├── checklist.html          # Checklists de produccion
├── incidencias.html        # Registro de incidencias
├── chatbot.html            # Asistente IA (Groq LLaMA)
├── admin.html              # Administracion de usuarios
├── test-orden.html         # Pruebas de ordenes
├── src/js/
│   ├── main.js             # Punto de entrada principal
│   ├── modules/
│   │   ├── ordenes.js      # Logica de ordenes de trabajo
│   │   ├── impresion.js    # Logica de impresion
│   │   ├── laminacion.js   # Logica de laminacion
│   │   ├── corte.js        # Logica de corte
│   │   ├── inventario.js   # Inventario con 158 productos reales
│   │   ├── programacion.js # Kanban de programacion
│   │   ├── tintas.js       # Gestion de tintas (reescrito: 4 tabs con Supabase)
│   │   ├── certificado.js  # Certificados de calidad
│   │   ├── etiquetas.js    # Generador de etiquetas
│   │   ├── reportes.js     # Reportes
│   │   ├── alertas.js      # Sistema de alertas
│   │   ├── dashboard.js    # Dashboard principal
│   │   ├── chatbot.js      # Asistente IA
│   │   ├── admin.js        # Administracion
│   │   ├── checklist.js    # Checklists
│   │   ├── incidencias.js  # Incidencias
│   │   └── home.js         # Pagina inicial
│   └── utils/
│       ├── config.js           # Configuracion global (IMPORTANTE)
│       ├── control-tiempo.js   # Control de tiempo Play/Pausa/Completar
│       ├── demoData.js         # Datos de demo (DESACTIVADO - Supabase es fuente de verdad)
│       ├── auth.js             # Autenticacion de usuarios
│       ├── api.js              # API legacy (Google Sheets ELIMINADO - solo queda archivo vacio/stub)
│       ├── supabase-client.js  # Cliente Supabase (fuente unica de verdad)
│       ├── sync-realtime.js    # Sincronizacion localStorage <-> Supabase en tiempo real
│       ├── cliente-memoria.js  # Memoria de clientes
│       ├── inventario-service.js # Servicio de inventario
│       └── theme.js            # Tema oscuro/claro
supabase/
├── seed-inventario.sql     # Seed SQL: 158 materiales, 58 tintas, 7 adhesivos
```

## Inventario Real
- **158 materiales + 58 tintas + 7 adhesivos** en Supabase (seed SQL)
- Backup en `inventario.js` funcion `getDatosEjemplo()` (158 productos desde Excel 26-02-2026)
- Tipos de material: BOPP NORMAL, BOPP MATE, BOPP PASTA, CAST, METAL, PERLADO, PEBD, PEBD PIGMENT
- **IMPORTANTE:** `demoData.js` ahora LIMPIA datos demo en vez de generarlos (commit 0ba947a)

### SKU y Codigos de Barras
Cada producto tiene:
- **SKU**: Formato `PREFIJO-MICRAS-ANCHO` (ej: `BN-20-610` = BOPP Normal 20 micras 610mm)
- **Codigo de Barras**: EAN-13 (759 + 0001 + secuencial + verificador)

#### Prefijos de Material
| Material | Prefijo |
|----------|---------|
| BOPP NORMAL | BN |
| BOPP MATE | BM |
| BOPP PASTA | BP |
| BOPP PERLADO | BPE |
| METAL | MT |
| PERLADO | PE |
| CAST | CA |
| PEBD | PB |
| PEBD PIGMENT | PBP |

### Pre-llenado de Ordenes
Al seleccionar un producto del inventario en una orden de trabajo, se pre-llenan automaticamente:
- CPE (codigo) = SKU
- Codigo de barras
- Estructura material
- Tipo de material
- Micras
- Ancho
- Kg disponibles
- Densidad para calculos
- **Metros estimados** (calculado cuando se llena pedidoKg)

## Maquinas (Ficha Tecnica 2026-03-18)
### Impresoras
- **COMEXI 1**: Ancho max 830mm, Velocidad 130 m/min
- **COMEXI 3**: Ancho max 1200mm, Velocidad 130 m/min

### Laminadoras
- **NEXUS**: Ancho max 1200mm, Velocidad 100 m/min

### Cortadoras
- **Cortadora China**: Velocidad 400 m/min
- **Cortadora Permaco**: Velocidad 140 m/min
- **Cortadora Novograf**: Velocidad 200 m/min

## Turnos de Trabajo (Ficha Tecnica)
| Turno | Horario | Codigo |
|-------|---------|--------|
| Diurno | 7:00 AM - 4:00 PM | D |
| Diurno H.E. | 4:00 PM - 7:00 PM | DHE |
| Nocturno | 7:00 PM - 4:00 AM | N |
| Nocturno H.E. | 4:00 AM - 7:00 AM | NHE |

## Login Obligatorio
- **Pagina de login:** `login.html` - acceso obligatorio antes de usar el sistema
- **Todas las paginas** redirigen a `login.html` si no hay sesion activa
- Sesion dura 8 horas, almacenada en `axones_session` (localStorage)
- Al hacer logout, redirige a `login.html`
- `sessionStorage.axones_return_to` guarda la pagina original para volver despues del login

## Control de Acceso por Roles (IMPLEMENTADO)

### Proteccion a nivel de pagina
`Auth.PERMISOS_PAGINA` en `auth.js` define que permiso necesita cada pagina:
- `null` = cualquier usuario autenticado puede acceder (index, alertas, checklist, incidencias)
- `'ordenes.ver'` = ordenes.html, programacion.html
- `'impresion.ver'` = impresion.html
- `'laminacion.ver'` = laminacion.html
- `'corte.ver'` = corte.html
- `'inventario.ver'` = inventario.html
- `'tintas.ver'` = tintas.html
- `'calidad.ver'` = certificado.html, etiquetas.html
- `'reportes.ver'` = reportes.html
- `'chatbot.acceso'` = chatbot.html
- `'usuarios.gestionar'` = admin.html

### Filtrado de Navbar
`Auth.NAV_PERMISOS` oculta automaticamente los links del navbar que el usuario no puede acceder. Se aplica via JS en `applyRolePermissions()`.

### Flujo de acceso denegado
1. Usuario intenta acceder a pagina sin permiso
2. Se guarda pagina en `sessionStorage.axones_acceso_denegado`
3. Se redirige a `index.html`
4. Se muestra alerta amarilla: "No tienes permiso para acceder a X"

### Jerarquia de Roles (menor a mayor)
operador < colorista < jefe_almacen < supervisor < planificador < jefe_operaciones < administrador

### Que ve cada rol (resumen)
| Rol | Paginas visibles |
|-----|-----------------|
| operador | Dashboard, su area de produccion, alertas, checklist, incidencias |
| colorista | Dashboard, impresion, tintas, alertas, checklist, incidencias |
| jefe_almacen | Dashboard, inventario, ordenes, alertas, checklist, incidencias |
| supervisor | Dashboard, ordenes, impresion, laminacion, corte, inventario, calidad, reportes, alertas, checklist, incidencias |
| planificador | Dashboard, ordenes, programacion, impresion, laminacion, corte, inventario, reportes, alertas, checklist, incidencias |
| jefe_operaciones | Todo excepto admin |
| administrador | Todo |

## Usuarios del Sistema (22 usuarios reales)
- Login con: primera letra nombre + apellido (ej: rparra, ajaure)
- Password temporal: axones2026
- Roles: operador, supervisor, jefe_operaciones, jefe_almacen, planificador, colorista, administrador

### Permisos por Rol
Ver `config.js` seccion `PERMISOS` para la matriz completa de permisos.

## Formulas de Produccion

### Calculo de Metros (CORREGIDO)
```
Gramaje (g/m lineal) = Ancho (m) × Micras × Densidad
Metros = Kg × 1000 / Gramaje

Ejemplo: BOPP 20µ x 610mm, 1000kg
Gramaje = 0.61 × 20 × 0.90 = 10.98 g/m
Metros = 1000 × 1000 / 10.98 = 91,074 metros
```

### Densidades por Material (Confirmado Ficha Tecnica)
| Material | Densidad |
|----------|----------|
| BOPP (Normal, Mate, Pasta) | 0.90 |
| BOPP Perlado / Perlado | 0.80 |
| CAST | 0.92 |
| METAL | 0.90 |
| PE/PEBD | 0.93 |
| PEBD Pigment | 0.93 |
| PET | 1.40 |
| PA (Nylon) | 1.14 |

### Pinon Automatico
```
Pinon = Desarrollo / 5
```

### Calculo de Materiales - Ficha Tecnica
Para productos laminados (BOPP + Adhesivo + Cast):
```
Gramaje Total = Gramaje Capa1 + Gramaje Adhesivo + Gramaje Capa2
Metros Totales = (Kg Pedidos × 1000) / Gramaje Total

Kg Capa1 = (Metros Totales × Gramaje Capa1) / 1000
Kg Adhesivo = (Metros Totales × Gramaje Adhesivo Lineal) / 1000
Kg Catalizador = Kg Adhesivo / Relacion (ej: 10:1)
Kg Capa2 = (Metros Totales × Gramaje Capa2) / 1000
```

### Calculo Metros/Bobina (Area Corte)
```
Metros/Bobina = (Peso Bobina × 1000) / Gramaje
Gramaje = Ancho(m) × Micras × Densidad
```
*Se calcula automaticamente al llenar Peso Bobina*

## Sistema de Control de Tiempo (IMPLEMENTADO)

### Archivo Principal
`public/src/js/utils/control-tiempo.js`

### Funcionalidades
- **Play/Pausa/Completar**: Cronometro para cada orden en cada fase
- **Estados**: pendiente, en_progreso, pausada, completada
- **Almacenamiento**: localStorage key `axones_control_tiempo`

### Selector de OT con Resumen Spreadsheet (REEMPLAZA Panel de Comandas)
- **Panel de Comandas ELIMINADO** en los 3 modulos (Fase 8)
- Reemplazado por **dropdown de OT** + **resumen spreadsheet read-only** (estilo ordenes.html)
- Flujo: Operador selecciona OT del dropdown -> aparece resumen con datos del pedido -> aparece formulario de produccion
- Resumen muestra: Datos del Pedido, Datos del Producto, Area especifica (Impresion/Laminacion/Corte), Ficha Tecnica
- Formulario de produccion solo muestra campos que llena el operador (turno, bobinas, scrap, etc.)
- Control de Tiempo (Play/Pausa/Completar) se muestra al seleccionar OT
- Funciones: `poblarSelectorOT()`, `seleccionarOrden()`, `renderResumenOT()`, `ocultarResumenYForm()`

### Modal Obligatorio de Pausa
- Al pausar una OT se muestra modal que OBLIGA a indicar motivo
- No se puede cerrar sin seleccionar un motivo
- Motivos predefinidos:
  - Cambio de bobina
  - Ajuste de maquina
  - Falla mecanica / Falla electrica
  - Cambio de tinta
  - Limpieza de rodillos
  - Problema de calidad
  - Falta de material
  - Almuerzo/Descanso
  - Reunion/Capacitacion
  - Otro (especificar)
- Funcion: `ControlTiempo.pausaConMotivo(ordenId, fase)`

### Despachos Parciales (IMPLEMENTADO)
- Permite registrar entregas parciales de una orden grande
- Ejemplo: Cliente pide 10,000 Kg pero paga por partes, se despachan 3,000 Kg hoy
- Boton "Registrar Despacho Parcial" en el panel de control de tiempo
- Modal para ingresar: Kg a despachar, Cliente, Nota de entrega, Observaciones
- Muestra informacion: Pedido | Despachado | Pendiente
- Historial de despachos visible en el panel
- Funcion: `ControlTiempo.registrarDespacho(ordenId, fase)`

### Funciones Principales de ControlTiempo
```javascript
ControlTiempo.play(ordenId, fase, operador)      // Iniciar cronometro
ControlTiempo.pausa(ordenId, fase, motivo)       // Pausar con motivo
ControlTiempo.pausaConMotivo(ordenId, fase)      // Modal obligatorio
ControlTiempo.completar(ordenId, fase, datos)    // Completar fase
ControlTiempo.getTiempoActual(ordenId, fase)     // Obtener tiempo en ms
ControlTiempo.formatearTiempo(ms)                // Formatear a HH:MM:SS
ControlTiempo.renderControles(ordenId, fase, contenedorId)
ControlTiempo.getResumenOrden(ordenId)           // Resumen de todas las fases
```

### Regla Importante
**TODOS los cambios solicitados en un modulo de produccion deben aplicarse a los 3 modulos:**
- Impresion (`impresion.js`, `impresion.html`)
- Laminacion (`laminacion.js`, `laminacion.html`)
- Corte (`corte.js`, `corte.html`)

## Proveedores (Ficha Tecnica)

### Sustratos
- Fabrica Siplast, C.A. (J-29586594-5)
- Plasticos la Dinastia, C.A. (J-50176198-1)
- Teleplastic, C.A. (J-00054015-2)
- Technofilm, S.A.
- Total Flex, C.A. (J-50374325-5)
- Flexipack Solutions, C.A. (J-50519062-8)
- Inversiones J&D, C.A.
- Venefoil, C.A. (J-06001261-9)

### Tintas
- Barnices Venezolanos, C.A. (J-07540293-6)
- Favika, C.A. (J-29746614-2)
- Inversiones Cabeoli, C.A. (J-40839412-0)
- Tintas Venezolanas, C.A. (J-50576017-3)

### Solventes y Adhesivos
- ALPHA Industrias Quimicas, C.A. (J-50180349-8) - Adhesivos FLEXTRA
- A.J. Lara Suministros Quimicos, C.A. (J-30827597-2)
- Quimicos la Barraca, C.A. (J-07544200-8)
- Inversiones Venproquim, C.A. (J-40454107-1)

## APIs y Servicios Externos

### Supabase (FUENTE UNICA DE VERDAD)
```javascript
SUPABASE_URL = 'https://lzjuzfbzgyjazhzhfhzv.supabase.co'
```
- **Supabase reemplaza localStorage y Google Sheets** como fuente de verdad
- `supabase-client.js`: cliente con CRUD generico para todas las tablas
- `sync-realtime.js`: intercepta localStorage, sincroniza con tabla `sync_store` en Supabase
- Al cargar cada pagina, descarga datos desde Supabase (la nube siempre gana)
- `sync-realtime.js` esta incluido en las **20 paginas HTML**
- Badge del sistema cambiado: "Conectado a Sheets" -> "Conectado a Supabase"

#### Tablas Supabase (19 tablas - TODAS CREADAS Y ACTIVAS)
| Tabla | Descripcion | Registros iniciales |
|-------|-------------|---------------------|
| usuarios | Cuentas de usuario con roles | 23 usuarios |
| clientes | Datos maestros de clientes | Vacia (llenar desde UI) |
| proveedores | Datos maestros de proveedores | Vacia (llenar desde UI) |
| materiales | Inventario de sustratos | 158 materiales |
| tintas | Inventario de tintas | 58 tintas |
| adhesivos | Adhesivos, catalizadores, solventes | 7 items |
| ordenes_trabajo | Ordenes de trabajo | Dinamica |
| produccion_impresion | Registros de produccion impresion | Dinamica |
| produccion_laminacion | Registros de produccion laminacion | Dinamica |
| produccion_corte | Registros de produccion corte | Dinamica |
| despachos | Despachos parciales/totales | Dinamica |
| alertas | Alertas del sistema | Dinamica |
| control_tiempo | Cronometros Play/Pausa por OT | Dinamica |
| presencia | Usuarios conectados en tiempo real | Dinamica |
| movimientos_inventario | Trazabilidad de movimientos de stock | Dinamica |
| sync_store | Cache key-value para sync localStorage | Dinamica |
| consumo_tintas | Registro de consumo de tintas por OT | Dinamica |
| tintas_cementerio | Tintas archivadas (soft-delete) | Dinamica |
| tintas_mezclas | Recetas de mezclas del colorista | Dinamica |

#### Modulos de Datos Maestros (UI)
| Modulo | Pagina | JS | Tabla Supabase | Acceso Navbar |
|--------|--------|-----|----------------|---------------|
| Clientes | clientes.html | clientes.js | clientes | Datos Maestros > Clientes |
| Proveedores | proveedores.html | proveedores.js | proveedores | Datos Maestros > Proveedores |
| Usuarios | admin.html | admin.js | usuarios | ... > Administracion |
| Inventario | inventario.html | inventario.js | materiales + tintas + adhesivos | Inventario |
| Tintas | tintas.html | tintas.js | tintas + consumo_tintas + tintas_cementerio + tintas_mezclas | Produccion > Tintas |

#### SQL Ejecutados en Supabase (4 scripts en orden)

**Script 1: Schema principal** (`supabase/schema.sql`)
- Crea las 15 tablas core: usuarios, clientes, proveedores, materiales, tintas, adhesivos, ordenes_trabajo, produccion_impresion, produccion_laminacion, produccion_corte, despachos, alertas, control_tiempo, presencia, movimientos_inventario
- Indices de rendimiento (16 indices)
- Triggers: update_updated_at (auto-actualiza updated_at), generar_numero_ot (OT-YYYY-NNNN automatico)
- RLS habilitado en todas las tablas con politica "Acceso total autenticados"
- Realtime habilitado para: ordenes_trabajo, presencia, alertas, control_tiempo, materiales, produccion_impresion, produccion_laminacion, produccion_corte, despachos

**Script 2: Tablas de tintas extendidas**
- Agrega columnas a tintas: categoria (original/solventada/arreglada), color_hex, lote, tinta_base, proporcion, proveedor_nombre
- Crea tabla tintas_cementerio (archivado de tintas con motivo)
- Crea tabla tintas_mezclas (recetas del colorista con componentes JSONB)
- Crea tabla consumo_tintas (registro de consumo por OT, no descuenta inventario)
- Realtime habilitado para las 4 tablas de tintas

**Script 3: Seed de inventario** (`supabase/seed-inventario.sql`)
- 158 materiales (BOPP Normal, BOPP Mate, BOPP Pasta, Metal, Perlado, Cast, PEBD, PEBD Pigment)
- 58 tintas (laminacion y superficie, con codigos reales)
- 7 adhesivos/solventes (IPA, Acetato, Methoxy, Adhesivo, Catalizadores, Solvente Recuperado)
- Usa ON CONFLICT para ser idempotente (seguro ejecutar multiples veces)

**Script 4: Tabla sync_store**
- Tabla key-value para sincronizar localStorage entre usuarios
- RLS habilitado, Realtime habilitado
- Usada por sync-realtime.js para mantener datos sincronizados

#### Seed SQL
`supabase/seed-inventario.sql` contiene la carga inicial: 158 materiales, 58 tintas, 7 adhesivos.

### Google Sheets (ELIMINADO)
- **Todas las referencias a Google Sheets y Excel fueron eliminadas** (commit 457c174, 2026-03-23)
- `CONFIG.API` ya no existe en main.js
- Supabase es la unica fuente de datos

### Chatbot (Groq LLaMA)
```javascript
CONFIG.CHATBOT.API_URL = 'https://api.groq.com/openai/v1/chat/completions'
CONFIG.CHATBOT.MODEL = 'llama-3.3-70b-versatile'
```

## Feedback Pendiente del Equipo (2026-03-20)

### CRITICOS - Cambios de Flujo
- [ ] Area de corte por TURNO (7am-7pm, 7pm-7am), no por orden de trabajo
- [x] Nombres de orden por correlativo automatico (sin elegir nombre) - IMPLEMENTADO
- [x] Etapa MONTAJE agregada entre Pendiente e Impresion en Kanban - IMPLEMENTADO
- [x] Selector de OT visible en TODOS los modulos de produccion - CORREGIDO
- [x] Panel de Comandas (selector tipo restaurante) en todos los modulos - IMPLEMENTADO -> REEMPLAZADO por Dropdown OT + Resumen Spreadsheet (Fase 8)
- [x] Modal obligatorio de pausa con motivos predefinidos - IMPLEMENTADO
- [ ] Paletas ilimitadas en corte (agregar dinamicamente)
- [ ] Cantidad de rollos en corte
- [ ] Temporizador para kg en corte

### FICHA TECNICA
- [x] Seccion agregada con estructura del producto (Capa1 + Adhesivo + Capa2)
- [x] Calculo automatico de kg necesarios de cada material
- [x] Busqueda de SKU del inventario por tipo de material
- [x] Densidades automaticas por tipo de material
- [ ] **PENDIENTE:** Respuestas del equipo sobre gramaje adhesivo, relacion catalizador, y ejemplo real

### CAMPOS EN IMPRESION (IMPLEMENTADOS)
- [x] Numero de banda (despues de ancho de corte)
- [x] Repeticiones (despues de frecuencia)
- [x] Figura de Embobinado: opciones 1-8
- [x] Tipo de impresion: Superficie y Reverso
- [x] Colores: 8 posiciones (1=color, 2=color, etc.)
- [x] Pinon automatico: desarrollo / 5
- [x] Linea de corte: 3mm y 5mm
- [x] ELIMINADOS: Ubicacion de Fotocelda, Gramaje en tinta
- [x] Sustratos virgen: buscar SKU del inventario
- [x] Metros estimados: se calculan al seleccionar producto + pedidoKg

### LAMINACION (IMPLEMENTADOS)
- [x] Gramaje adhesivo: permitir coma decimal
- [x] Materiales: elegir tipo de adhesivo del inventario
- [x] Tipo de laminado: Bilaminado/Trilaminado
- [x] Figura de embobinado: opciones 1-8
- [x] Material virgen desde inventario

### AREA DE CORTE/EMBALAJE
- [x] Metros/Bobina: calculado automaticamente (Peso / Gramaje)

### TINTAS Y SOLVENTES (REESCRITO)
- [x] Modulo tintas reescrito con 4 tabs - IMPLEMENTADO
- [x] Tab Consumo por OT: registro de consumo (no descuenta inventario) - IMPLEMENTADO
- [x] Tab Inventario: CRUD con filtros (original/solventada/arreglada) - IMPLEMENTADO
- [x] Tab Cementerio: archivar/restaurar tintas via Supabase - IMPLEMENTADO
- [x] Tab Mezclas: colorista crea recetas con N componentes - IMPLEMENTADO
- [ ] Solventes: agregar varias medidas/consumos de acetatos

### INVENTARIO (PENDIENTE)
- [ ] Enlazado con orden de compra
- [ ] Relacion con ordenes de produccion
- [ ] Varios materiales por orden
- [ ] Material sobrante debe reponerse
- [x] Codigo de producto y codigo de barra por producto - IMPLEMENTADO
- [x] Codificacion por diferencia, micras, anchos - IMPLEMENTADO
- [ ] Adhesivos: despachar kg sin necesidad de orden

### CALIDAD Y DESPACHO (PENDIENTE)
- [ ] Alimentarse con orden de trabajo
- [ ] Listado de despacho
- [x] Orden de entrega (entregas parciales) - IMPLEMENTADO via Despachos Parciales
- [ ] Solicitud de material y repuestos para produccion
- [ ] Nota de entrega asociada a ordenes
- [ ] Certificado de calidad automatico (editable, imprimible, firmable)
- [ ] Seleccionar paletas/bobinas a despachar

## Convenciones de Codigo

### localStorage Keys
```javascript
'axones_ordenes_trabajo'    // Ordenes de trabajo
'axones_inventario'         // Inventario de materiales
'axones_tintas_inventario'  // Inventario de tintas
'axones_adhesivos_inventario' // Inventario de adhesivos
'axones_produccion'         // Registros de produccion
'axones_alertas'            // Alertas del sistema
'axones_control_tiempo'     // Control de tiempo (Play/Pausa)
'axones_tiempo_historial'   // Historial de tiempos reiniciados
'axones_producto_terminado' // Producto terminado (paletas de corte)
'axones_consumo_tintas'     // Consumo de tintas por OT
'axones_tintas_mezclas'     // Mezclas del colorista
'axones_reportes_rechazo'   // Reportes de material rechazado por proveedor
```

**Nota:** Todas las keys de localStorage funcionan como cache local. Supabase es la fuente de verdad y se sincroniza via `sync-realtime.js`.

### Prefijo de Cache
Usar `CONFIG.CACHE.PREFIJO` = `'axones_'`

### Formato de OT
`OT-{YYYY}-{NNNN}` (ej: OT-2026-0001)

## Comandos Git
```bash
# Push a rama de desarrollo actual
git push -u origin claude/setup-ot-001-guide-Qdepe

# Ramas anteriores (referencia)
# git push -u origin claude/continue-axones-dev-DECnf
# git push -u origin claude/setup-axones-project-Ja8zK

# Para sincronizar con produccion (main)
git checkout main
git merge claude/setup-ot-001-guide-Qdepe
git push origin main
```

## Notas Importantes
1. El puerto 3000 esta OCUPADO - preguntar al usuario antes de elegir puerto
2. La app en Vercel esta protegida - no se puede acceder via WebFetch
3. No correr servidores locales sin preguntar - el usuario no tiene terminal abierta
4. Siempre preguntar cuando algo no este claro antes de implementar
5. Revisar `config.js` para todas las constantes y configuraciones del sistema
6. Los cambios en un modulo de produccion deben replicarse en los otros 2

## Archivos Clave para Referencia
- **config.js**: Todas las constantes, roles, permisos, maquinas, materiales
- **supabase-client.js**: Cliente Supabase, CRUD generico, fuente unica de verdad
- **sync-realtime.js**: Sincronizacion bidireccional localStorage <-> Supabase
- **control-tiempo.js**: Sistema de cronometros y despachos parciales
- **ordenes.js**: Logica de ordenes de trabajo
- **inventario.js**: Inventario con SKU y codigos de barras
- **tintas.js**: Modulo tintas reescrito (4 tabs: Consumo, Inventario, Cementerio, Mezclas)

## Progreso de Cambios Solicitados por Valeria (19/03/2026)

### Fase 1: Reorganizar modulos en capsulas + Checklist integrado
| Cambio | Estado |
|--------|--------|
| Reorganizar campos en capsulas claras (Orden, Turno, Produccion, Tiempo) | COMPLETADO |
| Eliminar campos redundantes (tiempoMuerto, tiempoEfectivo, tiempoPreparacion) | COMPLETADO |
| Tiempo de preparacion = Hora Arranque - Hora Inicio (automatico) | COMPLETADO |
| Boton de Checklist integrado en header de cada modulo | COMPLETADO |
| Checklist con items reales de Axones por area | COMPLETADO |
| Aplicado a: impresion, laminacion, corte | COMPLETADO |

### Fase 2: Flechitas expandibles en bobinas para info de etiqueta
| Cambio | Estado |
|--------|--------|
| CSS para flechitas (.bobina-arrow) en los 3 modulos | COMPLETADO |
| Modal etiqueta entrada (9 campos) en impresion.html | COMPLETADO |
| Modal etiqueta salida (6 campos) en impresion.html | COMPLETADO |
| Modal etiqueta entrada en laminacion.html | COMPLETADO |
| Modal etiqueta salida en laminacion.html | COMPLETADO |
| Modal etiqueta entrada en corte.html | COMPLETADO |
| JS: inyeccion dinamica de flechitas en impresion.js | COMPLETADO |
| JS: inyeccion dinamica de flechitas en laminacion.js | COMPLETADO |
| JS: inyeccion dinamica de flechitas en corte.js | COMPLETADO |
| JS: guardar/cargar data de etiquetas por bobina | COMPLETADO |
| JS: flechita verde cuando tiene datos (.has-data) | COMPLETADO |
| JS: etiquetasData incluido en recopilarDatos() | COMPLETADO |

### Fase 3: Restante de bobinas + Resumen con calculo de inventario
| Cambio | Estado |
|--------|--------|
| ~~Capsula "Restante de bobinas usadas" en impresion (rest1-rest26)~~ | REEMPLAZADO por Resumen de Devolucion (Fase 8) |
| Capsula "Restante de bobinas usadas" en laminacion (restEnt1-restEnt14) | COMPLETADO |
| Capsula "Restante de bobinas usadas" en corte (rest1-rest14) | COMPLETADO |
| ~~JS: calculo automatico totalRestante y totalConsumido~~ | REEMPLAZADO por devolucion buena/rechazada (Fase 8) |
| Capsula "Resumen de Produccion" (tabla) en impresion | COMPLETADO |
| Capsula "Resumen de Produccion" (tabla) en laminacion | COMPLETADO |
| Capsula "Resumen de Produccion" (tabla) en corte | COMPLETADO |
| JS: actualizacion en tiempo real del resumen | COMPLETADO |
| Datos restante incluidos en recopilarDatos() | COMPLETADO |
| Nota: deduccion inventario al guardar (usar totalConsumido) | COMPLETADO |

### Fase 4: Scrap con 3 categorias en laminacion + Producto terminado desde corte
| Cambio | Estado |
|--------|--------|
| Scrap 3 categorias en laminacion (Transparente, Impreso, Laminado) | COMPLETADO |
| Producto terminado de corte a inventario (axones_producto_terminado) | COMPLETADO |
| registrarProductoTerminado() guarda paletas con bobinas como PT | COMPLETADO |
| descontarInventario usa totalConsumido en los 3 modulos | COMPLETADO |

### Fase 5: Login obligatorio + Control de acceso por roles
| Cambio | Estado |
|--------|--------|
| Pagina de login dedicada (login.html) | COMPLETADO |
| Redireccion a login.html si no hay sesion activa | COMPLETADO |
| Mapa PERMISOS_PAGINA en auth.js (pagina -> permiso) | COMPLETADO |
| Mapa NAV_PERMISOS para filtrar navbar segun rol | COMPLETADO |
| Redireccion a index.html + alerta si sin permiso | COMPLETADO |
| tieneRol() con jerarquia de 7 roles | COMPLETADO |
| logout() redirige a login.html | COMPLETADO |

### Fase 6: Migracion a Supabase + Reescritura modulo Tintas
| Cambio | Estado |
|--------|--------|
| Infraestructura Supabase: schema, cliente, CRUD | COMPLETADO |
| supabase-client.js con URL y anon key | COMPLETADO |
| sync-realtime.js: intercepta localStorage, sincroniza con Supabase | COMPLETADO |
| sync-realtime.js agregado a las 20 paginas HTML | COMPLETADO |
| demoData.js auto-init desactivado | COMPLETADO |
| Badge "Conectado a Sheets" -> "Conectado a Supabase" | COMPLETADO |
| seed-inventario.sql: 158 materiales, 58 tintas, 7 adhesivos | COMPLETADO |
| Tab Consumo por OT (solo registro, no descuenta inventario) | COMPLETADO |
| Tab Inventario CRUD con filtros (original/solventada/arreglada) | COMPLETADO |
| Tab Cementerio (archivar/restaurar tintas via Supabase) | COMPLETADO |
| Tab Mezclas colorista (crear recetas con N componentes) | COMPLETADO |
| Tablas Supabase: tintas_cementerio, tintas_mezclas, consumo_tintas | COMPLETADO |

### Fase 7: Limpieza Google Sheets + Deploy GitHub Pages (2026-03-23)
| Cambio | Estado |
|--------|--------|
| Eliminar TODAS las referencias a Google Sheets y Excel del codigo | COMPLETADO |
| demoData.js ahora LIMPIA datos demo en vez de generarlos | COMPLETADO |
| Eliminar CONFIG.API references en main.js | COMPLETADO |
| GitHub Actions workflow para deploy a GitHub Pages | COMPLETADO |
| Fix deploy desde ramas claude/* | COMPLETADO |

### Fase 8: Resumen de Devolucion en Impresion y Laminacion (2026-03-24)
| Cambio | Estado |
|--------|--------|
| Eliminar grilla "Restante de Bobinas Usadas" en impresion y laminacion | COMPLETADO |
| Nueva seccion "Resumen de Devolucion" con Devolucion Buena (Kg+Fecha+Hora) | COMPLETADO |
| Tabla dinamica "Devolucion Rechazada" (Proveedor, Ref, Kg, Motivo, Fecha, Hora) | COMPLETADO |
| Boton "Reporte por proveedor" que abre ventana de impresion | COMPLETADO |
| Scrap: renombrar "Refile" a "Transparente" en impresion | COMPLETADO |
| Resumen de Produccion actualizado con filas Devolucion Buena/Rechazada | COMPLETADO |
| descontarInventario() repone devolucion buena al material correspondiente | COMPLETADO |
| Reportes de rechazo guardados en axones_reportes_rechazo (localStorage) | COMPLETADO |
| Aplicado a impresion y laminacion | COMPLETADO |
| Corte NO lleva estos cambios (proceso mecanico, sin devolucion de material) | N/A |

### Fase 9: Consumo y Devolucion de Tintas + Solventes (2026-03-24)
| Cambio | Estado |
|--------|--------|
| Seccion "Consumo de Tintas" con selector del inventario (axones_tintas_inventario) | COMPLETADO |
| Selector muestra Tipo/Color y stock actual de cada tinta | COMPLETADO |
| Seccion "Solventes" (Alcohol IPA, Metoxi, Acetato) con total automatico | COMPLETADO |
| Seccion "Devolucion de Tintas" con selector del inventario + Kg devueltos | COMPLETADO |
| descontarTintas() descuenta consumo y repone devolucion al inventario | COMPLETADO |
| Datos de tintas y solventes incluidos en recopilarDatos() | COMPLETADO |
| Aplicado a impresion y laminacion | COMPLETADO |
| Corte NO lleva tintas/solventes (proceso mecanico) | N/A |

### Fase 10: Resumen OT Spreadsheet en modulos de produccion (2026-03-24)
| Cambio | Estado |
|--------|--------|
| Ordenes.js: fix race condition sync Supabase antes de inicializar | COMPLETADO |
| Auto-seed inventario cuando sistema esta completamente vacio | COMPLETADO |
| Impresion.html: Selector OT dropdown + Resumen Spreadsheet read-only + Form produccion | COMPLETADO |
| Impresion.js: poblarSelectorOT, seleccionarOrden, renderResumenOT, ocultarResumenYForm | COMPLETADO |
| Impresion.js: eliminar panel de comandas duplicado, mantener control de tiempo | COMPLETADO |
| Laminacion.html: Selector OT + Resumen Spreadsheet (Area Laminacion) + Form produccion | COMPLETADO |
| Laminacion.js: poblarSelectorOT, seleccionarOrden, renderResumenOT, ocultarResumenYForm | COMPLETADO |
| Laminacion.js: eliminar funciones legacy (precargarCamposOrden, agregarSelectorOrdenes, etc.) | COMPLETADO |
| Corte.html: Selector OT + Resumen Spreadsheet (Area Corte) + Form produccion | COMPLETADO |
| Corte.js: poblarSelectorOT, seleccionarOrden, renderResumenOT, ocultarResumenYForm | COMPLETADO |
| Corte.js: preservar paletas dinamicas y producto terminado | COMPLETADO |
| Validacion: solo requiere OT seleccionada + turno + operador (no fecha/maquina/cliente) | COMPLETADO |
| recopilarDatos(): toma datos de ordenCargada, agrega otId como referencia | COMPLETADO |
| Patron unificado en los 3 modulos: dropdown -> resumen -> formulario -> control tiempo | COMPLETADO |

### Campos de Etiqueta de Bobina
**Entrada** (9 campos): Proveedor, Referencia Bobina, Medida/Ancho, Micraje, Trat. Interno, Trat. Externo, Fecha, Maquina Origen, Pedido/Lote
**Salida** (6 campos): Peso (auto), Fecha, Metraje, Hora, Empalmes, Operador

### Fase 11: Migracion localStorage -> Supabase directo (2026-03-25)
**Objetivo:** Eliminar `sync-realtime.js` como intermediario. Todos los modulos ahora leen/escriben directamente a Supabase sin pasar por localStorage.

| Cambio | Estado |
|--------|--------|
| Navbar con dropdown Datos Maestros (Clientes + Proveedores) en todas las paginas | COMPLETADO |
| Documentar 19 tablas Supabase + 4 scripts SQL | COMPLETADO |
| clientes.js y proveedores.js: eliminar localStorage, solo Supabase directo | COMPLETADO |
| ordenes.js: migrar a AxonesDB.ordenesHelper (cargar/guardar/actualizar) | COMPLETADO |
| programacion.js: migrar a AxonesDB.ordenesHelper (cargar/mover estado) | COMPLETADO |
| control-tiempo.js: migrar a AxonesDB.client.from('control_tiempo') | COMPLETADO |
| impresion.js: guardar en produccion_impresion, cargar sin localStorage | COMPLETADO |
| laminacion.js: guardar en produccion_laminacion, cargar sin localStorage | COMPLETADO |
| corte.js: guardar en produccion_corte, cargar sin localStorage | COMPLETADO |
| dashboard.js, alertas.js, reportes.js, certificado.js: migrar a Supabase | COMPLETADO |
| chatbot.js, checklist.js, incidencias.js, etiquetas.js: migrar a Supabase | COMPLETADO |
| inventario.js: migrar a AxonesDB.materiales/tintas/adhesivos | COMPLETADO |
| admin.js: migrar a AxonesDB.client.from('usuarios') | COMPLETADO |
| home.js: migrar a Supabase (stats del dashboard) | COMPLETADO |
| nota-entrega.js: migrar a Supabase | COMPLETADO |
| Fix SyntaxError: await en callback no-async en inventario.js | COMPLETADO |
| Fix CDN Supabase como script estatico en todos los HTML | COMPLETADO |
| Fix race condition: AxonesDB.init() antes de isReady() en todos los modulos | COMPLETADO |

### Fase 12: Fixes de OT y UX (2026-03-25)
| Cambio | Estado |
|--------|--------|
| Precarga de proveedor en selector de OT | COMPLETADO |
| RIF del cliente se auto-llena al seleccionar cliente | COMPLETADO |
| Codigo de barras y SKU del producto se auto-llenan | COMPLETADO |
| Colores de tintas se pre-cargan en OT | COMPLETADO |
| Boton "Guardar" agregado al fondo de OT y modulos de produccion | COMPLETADO |

### Fase 13: Etiquetas reescritas (2026-03-25)
| Cambio | Estado |
|--------|--------|
| etiquetas.html reescrito: selector de OT, selector de despacho, formato real | COMPLETADO |
| etiquetas.js reescrito: auto-llenado desde OT, vinculo con despachos parciales | COMPLETADO |
| Formato etiqueta real Axones: Proceso, Paleta#, OT, Producto, Tara, P.Neto/Bruto, Fecha, Hora, Operador, Maquina, Mts, Material, Nota de Entrega | COMPLETADO |
| Tara calculada automaticamente (Bruto - Neto) | COMPLETADO |
| Proceso auto-detectado segun maquina (COMEXI=IMP, NEXUS=LAM, Cortadora=CORT) | COMPLETADO |
| N° Paleta se incrementa al imprimir multiples etiquetas | COMPLETADO |
| Fix init: esperar AxonesDB + escuchar axones-sync + fallback localStorage | COMPLETADO |

### Fase 14: Reportes y Trazabilidad (2026-03-25) - EN PROGRESO
| Cambio | Estado |
|--------|--------|
| reportes.html reescrito: 5 tabs, filtros, KPIs, modales detalle | COMPLETADO |
| reportes.js: logica completa de tabs, carga de datos, modales, graficos, export | **PENDIENTE** |

## Commits Recientes (Referencia)
```
# 2026-03-25 - Sesion: Etiquetas + Reportes + Migracion localStorage -> Supabase directo
d51fc43 docs: Actualizar CLAUDE.md con estado de trabajo para continuar en otra sesion
2431ce5 feat: Reescribir modulo etiquetas - vinculado a OT y despachos parciales
1fe3e67 feat: Agregar boton Guardar al fondo de OT y modulos de produccion
ae42508 fix: Precarga de proveedor, RIF cliente, codigo barras, SKU y colores tintas en OT
11287a2 fix: Inventario vacio por SyntaxError - await en callback no-async
268a930 fix: Agregar CDN Supabase como script estatico en todos los HTML
c936dde fix: Race condition - AxonesDB.init() antes de isReady() en todos los modulos
3fe5267 feat: Migrar nota-entrega.js a Supabase - 0 localStorage en modulos de negocio
f15aab0 feat: Migrar admin.js y home.js a Supabase - eliminar localStorage
e884b6b feat: Migrar inventario.js, nota-entrega.js y admin.js (parcial) a Supabase
1a00abe feat: Fases 4-6 migracion - 11 modulos sin localStorage
116f3e6 feat: Fase 3 migracion - impresion, laminacion y corte sin localStorage
bc34c2f feat: Fase 2 migracion - control-tiempo.js sin localStorage
8dd3649 feat: Fase 1 migracion - ordenes.js y programacion.js sin localStorage
7bcfbc3 fix: Eliminar localStorage de clientes y proveedores - solo Supabase directo
6192c7c fix: Clientes y proveedores no persistian - agregar cache localStorage + sync keys
03cbfc5 docs: Documentar estado completo de Supabase - 19 tablas activas y 4 scripts SQL
e152d22 feat: Agregar dropdown Datos Maestros (Clientes + Proveedores) al navbar de todas las paginas

# 2026-03-24 - Devolucion + Tintas + Solventes
20e8e22 feat: Consumo/devolucion tintas + solventes + devolucion material en impresion y laminacion
98a51c5 feat: Reemplazar Restante de Bobinas por Resumen de Devolucion en impresion

# 2026-03-24 - Fase 10: Resumen OT Spreadsheet
98d02ab feat: Laminacion JS - Resumen OT spreadsheet + formulario solo producción
91cb9aa wip: Laminacion HTML - spreadsheet OT summary structure (JS pending)
d3defaa feat: Corte - Resumen OT spreadsheet + formulario solo producción
2e70a9b fix: Remove panel de comandas duplicate in impresion + partial HTML for laminacion/corte
cafe9a2 feat: Fase 1 Impresión - Resumen OT spreadsheet + formulario solo producción

# 2026-03-24 - Fixes de sync y estabilidad
d2e6df2 fix: Todos los módulos ahora esperan sync de Supabase antes de inicializar
03789fe fix: Ordenes no se guardaban por race condition entre sync y modulos
93884f5 fix: Dropdown productos siempre muestra material primero
9d753e8 feat: Auto-seed inventario cuando sistema esta completamente vacio
814a0e6 fix: DemoData ya no borra datos reales del localStorage
9ce1e27 feat: Auto-seed sync_store cuando esta vacio + preservar datos locales
93ecb52 fix: Actualizar anon key de Supabase con JWT real
0899dca fix: Corregir error DemoData + mejorar diagnostico sync Supabase

# 2026-03-24 - Ordenes reorganizadas
0944eba feat: Fase 1C - Formulas automaticas y unificacion de materiales
5b99515 feat: Fase 1B - Reorganizar campos OT para coincidir con Excel real

# 2026-03-23 - Limpieza Sheets + Deploy
3dfb8a9 fix: Eliminar CONFIG.API references en main.js que causaban error
457c174 feat: Eliminar TODAS las referencias a Google Sheets y Excel
0ba947a fix: demoData.js ahora LIMPIA datos demo en vez de generarlos
bde5f38 fix: Deploy GitHub Pages desde cualquier rama claude/*
c3b496f fix: Deploy GitHub Pages desde rama default del repo
8606e93 fix: GitHub Pages deploy solo desde main (no desde ramas claude/)
dbdbf0b docs: Fase 3 - Actualizar CLAUDE.md con cambios Supabase y tintas

# 2026-03-23 - Supabase + Tintas
cf23240 feat: Supabase como fuente unica de verdad, eliminar demo data y Sheets
b09f59a feat: Fase 2D - Tab Mezclas colorista + SQL seed inventario
1a41435 feat: Fase 2C - tintas.js Tab Cementerio (archivar/restaurar via Supabase)
17031c5 feat: Fase 2B - tintas.js Tab Inventario CRUD
0456a2d feat: Fase 2A - tintas.js Tab Consumo por OT
6bd6dc2 fix: Remove duplicate sync-realtime.js in tintas.html
2260720 feat: Fase 1 - Agregar sync-realtime.js a las 20 paginas HTML
c05680c feat: Sync real-time via Supabase + Rediseño tintas.html + Schema sync_store

# Anteriores
e3f9824 feat: Configurar Supabase con credenciales reales y agregar script a todas las paginas
60952d8 feat: Infraestructura Supabase - schema, cliente, CRUD clientes/proveedores, migracion
c51cac3 feat: Control de acceso por roles - filtrado de navbar y proteccion de paginas
03c890c feat: Login obligatorio - pagina dedicada login.html como gate de acceso
cfbce4d feat: Fase 4 - Producto terminado de corte a inventario
b183241 feat: Fase 3 - Restante de bobinas usadas + Resumen de produccion
43c1874 feat: Fase 2 - Flechitas de etiquetas en bobinas de entrada y salida
cbd07ec feat: Fase 1 - Reorganizar modulos en capsulas claras + checklist integrado
```

## Arquitectura de Modulos de Produccion (Fase 8)

### Patron Unificado (impresion, laminacion, corte)
Cada modulo de produccion sigue el mismo flujo visual:

```
1. Dropdown OT (#ordenTrabajo) + Badge estado (#estadoOT)
2. Resumen OT (#resumenOT) - read-only spreadsheet, oculto por defecto
   ├── Datos del Pedido (fecha, kg, metros, maquina, estructura)
   ├── Datos del Producto (cliente, RIF, producto, CPE)
   ├── Area Especifica (campos propios de impresion/laminacion/corte)
   └── Ficha Tecnica (tipo material, micras, ancho, densidad, kg necesarios)
3. Formulario de Produccion (#formXxx) - oculto hasta seleccionar OT
   ├── Turno y Operador
   ├── Control de Tiempo (Play/Pausa/Completar)
   ├── Bobinas de Entrada + Etiquetas
   ├── Bobinas de Salida + Etiquetas
   ├── Restante de Bobinas
   ├── Scrap
   ├── Resumen de Produccion (calculado en tiempo real)
   └── Observaciones
```

### Funciones Clave por Modulo
```javascript
poblarSelectorOT()           // Carga OTs pendientes en dropdown
seleccionarOrden(orden)      // Muestra resumen + formulario + control tiempo
renderResumenOT(orden)       // Llena campos read-only del resumen
ocultarResumenYForm()        // Oculta todo cuando no hay OT seleccionada
inicializarControlTiempo()   // Solo card de control tiempo (sin panel comandas)
recopilarDatos()             // Toma datos de ordenCargada + formulario
validarCamposRequeridos()    // Solo valida: OT + turno + operador
```

### Diferencias entre Modulos
| Campo en Resumen | Impresion | Laminacion | Corte |
|-----------------|-----------|------------|-------|
| Area especifica | Tipo impresion, colores, pinon, figura emb, desarrollo, bandas | Tipo laminado, figura emb, gramaje adhesivo, relacion mezcla | Num pistas, ancho corte, metros/bobina |
| Bobinas entrada | 26 bobinas | 14 impresas + 14 virgen | 14 bobinas |
| Bobinas salida | 26 bobinas | 14 bobinas | Paletas dinamicas (ilimitadas) |
| Scrap | Simple (kg) | 3 categorias (transparente, impreso, laminado) | Simple (kg) |

## Sistema de Notificaciones en UI (NO se necesita F12)
El sistema tiene notificaciones visuales integradas, **no es necesario abrir la consola del navegador (F12)**:

### Indicadores Visuales
- **Punto verde pulsante** (esquina inferior izquierda): indica sync activo con Supabase
- **Toast notifications** (esquina superior derecha): muestra cuando otro usuario actualiza datos
- **showToast()** en main.js: notificaciones de exito/error/info en toda la app
- **mostrarNotificacion()** en control-tiempo.js: notificaciones de pausas y despachos

### Funciones de Toast Disponibles
```javascript
showToast(mensaje, tipo)              // main.js - global (danger, success, info)
Auth.mostrarToast(mensaje, tipo)      // auth.js - autenticacion
ControlTiempo.mostrarNotificacion()   // control-tiempo.js - produccion
```

### Para Desarrollo/Debug
Si se necesita ver logs tecnicos, el sistema usa prefijos en consola:
- `[AxonesSync]` - logs de sincronizacion
- `AxonesDB:` - logs de operaciones Supabase

## TRABAJO EN PROGRESO (2026-03-25) - Rama: claude/review-claude-printing-task-MQf2H

### Fase 11: Etiquetas reescritas - COMPLETADO (commit 2431ce5)
- `etiquetas.html` y `etiquetas.js` reescritos completamente
- Selector de OT que auto-llena: cliente, producto, maquina, material, proceso
- Selector de despacho parcial vinculado a nota de entrega
- Formato de etiqueta real de Inversiones Axones: Proceso, Paleta#, OT, Producto, Tara, P.Neto, P.Bruto, Fecha, Bobinas, Hora, Operador, Maquina, Mts, Material, Nota de Entrega
- Tara calculada automaticamente (Bruto - Neto)
- Proceso auto-detectado segun maquina (COMEXI=IMP, NEXUS=LAM, Cortadora=CORT)
- N° Paleta se incrementa al imprimir multiples etiquetas
- Fix: `AxonesDB.init()` se espera correctamente antes de cargar OTs
- Fix: Escucha evento `axones-sync` para recargar OTs cuando sync termina
- Fix: Fallback a localStorage si Supabase no tiene ordenes

### Fase 12: Reportes y Trazabilidad - EN PROGRESO
**Estado:** `reportes.html` YA REESCRITO (commit pendiente). `reportes.js` PENDIENTE DE ESCRIBIR.

**Lo que se hizo:**
- `reportes.html` reescrito con nuevo layout:
  - 5 tabs: Ordenes de Trabajo | Impresion | Laminacion | Corte | Graficos
  - Filtros: fecha desde/hasta, estado, busqueda texto libre
  - 6 KPIs: OTs, Kg Producidos, Registros, Scrap Prom, Incidencias, Alertas
  - Modal detalle OT (modal-xl, scrollable) para ver OT completa
  - Modal detalle produccion para registros individuales
  - Botones imprimir en ambos modales
  - Botones exportar CSV/Excel en header

**Lo que FALTA escribir en `reportes.js`:**
1. **Tab Ordenes**: Tabla listando TODAS las OTs desde Supabase (`AxonesDB.ordenesHelper.cargar()`). Cada fila clickeable abre modal detalle.
2. **Modal Detalle OT**: Al hacer click en una OT, mostrar:
   - Datos completos de la orden (cliente, producto, material, maquina, kg pedido, etc.)
   - Registros de produccion de CADA fase (impresion, laminacion, corte) desde tablas `produccion_impresion`, `produccion_laminacion`, `produccion_corte` filtrados por `numero_ot`
   - Control de tiempo: pausas con motivos, tiempos acumulados desde `control_tiempo` table
   - Despachos parciales desde control_tiempo localStorage key `axones_control_tiempo`
   - Incidencias relacionadas desde sync_store key `axones_incidencias`
   - Alertas desde sync_store key `axones_alertas`
3. **Tabs Impresion/Laminacion/Corte**: Tabla con todos los registros de produccion de esa area. Cada fila clickeable abre modal con detalle del registro (bobinas entrada/salida, scrap, tintas, solventes, devolucion, observaciones).
4. **Tab Graficos**: Reutilizar charts existentes (Chart.js) - produccion por proceso, scrap por maquina, tendencia diaria, top clientes.
5. **Exportar CSV/Excel**: Basado en tab activo y filtros aplicados.

**Estructura de datos para el modal detalle OT:**
```javascript
// Ordenes: AxonesDB.ordenesHelper.cargar() -> array de objetos con todos los campos de la OT
// Produccion impresion: AxonesDB.client.from('produccion_impresion').select('*').eq('numero_ot', ot)
// Produccion laminacion: AxonesDB.client.from('produccion_laminacion').select('*').eq('numero_ot', ot)
// Produccion corte: AxonesDB.client.from('produccion_corte').select('*').eq('numero_ot', ot)
// Control tiempo: AxonesDB.client.from('control_tiempo').select('*').eq('numero_ot', ot)
// Incidencias: sync_store key 'axones_incidencias' -> filtrar por ordenTrabajo
// Alertas: sync_store key 'axones_alertas' -> filtrar por ot/ordenTrabajo
```

**Campos clave en registros de produccion (datos JSONB):**
- Impresion: tipo='impresion', turno, operador, materialesEntrada[], bobinasSalida[], scrapTransparente, scrapImpreso, consumoTintas[], devolucionTintas[], solAlcohol/solMetoxi/solAcetato, devolucionBuenaKg, devolucionRechazada[], observaciones
- Laminacion: tipo='laminacion', turno, operador, bobinasEntrada[], bobinasVirgen[], bobinasSalida[], scrapTransparente/scrapImpreso/scrapLaminado, adhesivoEntrada/consumoAdhesivo, consumoTintas[], devolucionBuenaKg, devolucionRechazada[], observaciones
- Corte: tipo='corte', turno, operador, bobinasEntrada[], paletas[{bobinas[], pesoTotal}], scrapRefile, bobinasRestante[], observaciones

**Control de tiempo estructura:**
- Estado: pendiente/en_progreso/pausada/completada
- Pausas: [{timestamp, motivo, duracion}] - motivos obligatorios
- Despachos: [{fecha, kg, cliente, notaEntrega, observaciones}]
- tiempoTotal en ms

**Incidencias estructura:**
- id, categoria, severidad, titulo, descripcion, ordenTrabajo, estado, historial[], reportadoPor

### Patron de inicializacion correcto para modulos
```javascript
init: async function() {
    // 1. Asegurar AxonesDB
    if (typeof AxonesDB !== 'undefined' && !AxonesDB.isReady()) {
        await AxonesDB.init();
    }
    // 2. Cargar datos
    await this.cargarDatos();
    // 3. Setup UI
    this.setupUI();
    // 4. Escuchar re-sync
    window.addEventListener('axones-sync', async () => {
        await this.cargarDatos();
    });
}
```

### Commits de esta sesion (2026-03-25)
```
d51fc43 docs: Actualizar CLAUDE.md con estado de trabajo
2431ce5 feat: Reescribir modulo etiquetas - vinculado a OT y despachos parciales
1fe3e67 feat: Agregar boton Guardar al fondo de OT y modulos de produccion
ae42508 fix: Precarga de proveedor, RIF cliente, codigo barras, SKU y colores tintas en OT
11287a2 fix: Inventario vacio por SyntaxError - await en callback no-async
268a930 fix: Agregar CDN Supabase como script estatico en todos los HTML
c936dde fix: Race condition - AxonesDB.init() antes de isReady() en todos los modulos
3fe5267 feat: Migrar nota-entrega.js a Supabase - 0 localStorage en modulos de negocio
f15aab0 feat: Migrar admin.js y home.js a Supabase - eliminar localStorage
e884b6b feat: Migrar inventario.js, nota-entrega.js y admin.js (parcial) a Supabase
1a00abe feat: Fases 4-6 migracion - 11 modulos sin localStorage
116f3e6 feat: Fase 3 migracion - impresion, laminacion y corte sin localStorage
bc34c2f feat: Fase 2 migracion - control-tiempo.js sin localStorage
8dd3649 feat: Fase 1 migracion - ordenes.js y programacion.js sin localStorage
7bcfbc3 fix: Eliminar localStorage de clientes y proveedores - solo Supabase directo
6192c7c fix: Clientes y proveedores no persistian - agregar cache localStorage + sync keys
03cbfc5 docs: Documentar estado completo de Supabase - 19 tablas activas y 4 scripts SQL
e152d22 feat: Agregar dropdown Datos Maestros (Clientes + Proveedores) al navbar
```
