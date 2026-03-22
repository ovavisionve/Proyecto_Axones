# CLAUDE.md - Sistema Axones

## Descripcion del Proyecto
Sistema integral de gestion y control de produccion para **Inversiones Axones 2008, C.A.** - empresa de empaques flexibles plasticos en Venezuela.

**Version:** 1.2.0
**Ultima actualizacion:** 2026-03-20

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
├── tintas.html             # Gestion de tintas y solventes
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
│   │   ├── tintas.js       # Gestion de tintas
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
│       ├── demoData.js         # Datos de demo (NO sobrescribe inventario)
│       ├── auth.js             # Autenticacion de usuarios
│       ├── api.js              # Conexion con Google Sheets
│       ├── cliente-memoria.js  # Memoria de clientes
│       ├── inventario-service.js # Servicio de inventario
│       └── theme.js            # Tema oscuro/claro
```

## Inventario Real
- **158 productos** cargados desde Excel (26-02-2026)
- Ubicado en `inventario.js` funcion `getDatosEjemplo()`
- Tipos de material: BOPP NORMAL, BOPP MATE, BOPP PASTA, CAST, METAL, PERLADO, PEBD, PEBD PIGMENT
- **IMPORTANTE:** `demoData.js` NO debe sobrescribir el inventario

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

### Panel de Comandas (Selector tipo restaurante)
- Aparece al inicio de cada modulo de produccion (Impresion, Laminacion, Corte)
- Muestra OTs pendientes como "comandas" de restaurante
- Cards visuales con colores por prioridad:
  - **Rojo (danger):** Urgente
  - **Amarillo (warning):** Alta prioridad
  - **Azul (primary):** Normal
- Informacion mostrada: numero OT, cliente, producto, kg pedidos, tiempo acumulado
- Al hacer click en una comanda se carga la OT y se muestra el panel de tiempo
- Funcion: `ControlTiempo.renderPanelComandas(fase, contenedorId, callback)`

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
ControlTiempo.renderPanelComandas(fase, contenedorId, callback)
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

### Google Sheets
```javascript
CONFIG.API.BASE_URL = 'https://script.google.com/macros/s/AKfycbx5ahuSXRS7D6NZM4eLa2ay32A2RHcQcOoTOb7nfVI0KorzAltcVLUU2otjhFd9jHcw/exec'
CONFIG.API.SHEETS_ID = '1TOpqDc-X4kthwYNzduGYO6MpN1dOdvbjqIIoW_oYL88'
```

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
- [x] Panel de Comandas (selector tipo restaurante) en todos los modulos - IMPLEMENTADO
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

### TINTAS Y SOLVENTES (PENDIENTE)
- [ ] Atados a orden de trabajo pero editables
- [ ] Preparados dentro de produccion
- [ ] Solventes: agregar varias medidas/consumos de acetatos
- [ ] Colorista puede crear colores nuevos (mezcla de N kg de cada tinta)

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
```

### Prefijo de Cache
Usar `CONFIG.CACHE.PREFIJO` = `'axones_'`

### Formato de OT
`OT-{YYYY}-{NNNN}` (ej: OT-2026-0001)

## Comandos Git
```bash
# Push a rama de desarrollo
git push -u origin claude/setup-axones-project-Ja8zK

# Para sincronizar con produccion (main)
git checkout main
git merge claude/setup-axones-project-Ja8zK
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
- **control-tiempo.js**: Sistema de cronometros y despachos parciales
- **ordenes.js**: Logica de ordenes de trabajo
- **inventario.js**: Inventario con SKU y codigos de barras

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
| Capsula "Restante de bobinas usadas" en impresion (rest1-rest26) | COMPLETADO |
| Capsula "Restante de bobinas usadas" en laminacion (restEnt1-restEnt14) | COMPLETADO |
| Capsula "Restante de bobinas usadas" en corte (rest1-rest14) | COMPLETADO |
| JS: calculo automatico totalRestante y totalConsumido | COMPLETADO |
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

### Campos de Etiqueta de Bobina
**Entrada** (9 campos): Proveedor, Referencia Bobina, Medida/Ancho, Micraje, Trat. Interno, Trat. Externo, Fecha, Maquina Origen, Pedido/Lote
**Salida** (6 campos): Peso (auto), Fecha, Metraje, Hora, Empalmes, Operador

## Commits Recientes (Referencia)
```
c51cac3 feat: Control de acceso por roles - filtrado de navbar y proteccion de paginas
03c890c feat: Login obligatorio - pagina dedicada login.html como gate de acceso
cfbce4d feat: Fase 4 - Producto terminado de corte a inventario
b183241 feat: Fase 3 - Restante de bobinas usadas + Resumen de produccion
43c1874 feat: Fase 2 - Flechitas de etiquetas en bobinas de entrada y salida
cbd07ec feat: Fase 1 - Reorganizar modulos en capsulas claras + checklist integrado
```
