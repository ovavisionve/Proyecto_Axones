# CLAUDE.md - Sistema Axones

## Descripcion del Proyecto
Sistema integral de gestion y control de produccion para **Inversiones Axones 2008, C.A.** - empresa de empaques flexibles plasticos en Venezuela.

## URLs de Vercel
- **Desarrollo:** https://proyecto-axones-git-claude-setup-axones-project-ja8zk-ova1.vercel.app/
- **Produccion:** https://proyecto-axones.vercel.app/ (rama main)

## Estructura del Proyecto
```
public/
├── index.html          # Dashboard principal
├── ordenes.html        # Gestion de ordenes de trabajo
├── impresion.html      # Modulo de impresion (Comexi 067/045)
├── laminacion.html     # Modulo de laminacion
├── corte.html          # Modulo de corte
├── inventario.html     # Inventario (158 productos reales)
├── src/js/
│   ├── modules/
│   │   ├── ordenes.js      # Logica de ordenes de trabajo
│   │   ├── impresion.js    # Logica de impresion
│   │   ├── laminacion.js   # Logica de laminacion
│   │   ├── corte.js        # Logica de corte
│   │   └── inventario.js   # Inventario con 158 productos reales del Excel
│   └── utils/
│       ├── demoData.js     # Datos de demo (NO sobrescribe inventario)
│       ├── config.js       # Configuracion global
│       └── api.js          # Conexion con Google Sheets
```

## Inventario Real
- **158 productos** cargados desde Excel (26-02-2026)
- Ubicado en `inventario.js` funcion `getDatosEjemplo()`
- Tipos de material: BOPP NORMAL, BOPP MATE, BOPP PASTA, CAST, METAL, PERLADO, PEBD, PEBD PIGMENT
- **IMPORTANTE:** `demoData.js` NO debe sobrescribir el inventario

### SKU y Codigos de Barras (NUEVO)
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

## Maquinas
- **Impresion:** COMEXI 067, COMEXI 045
- **Laminacion:** Laminadora
- **Corte:** Cortadora China, Cortadora Permaco, Cortadora Novograf

## Formulas de Produccion

### Calculo de Metros (CORREGIDO)
```
Gramaje (g/m lineal) = Ancho (m) × Micras × Densidad
Metros = Kg × 1000 / Gramaje

Ejemplo: BOPP 20µ x 610mm, 1000kg
Gramaje = 0.61 × 20 × 0.90 = 10.98 g/m
Metros = 1000 × 1000 / 10.98 = 91,074 metros
```

### Densidades por Material
| Material | Densidad |
|----------|----------|
| BOPP     | 0.90     |
| PE/PEBD  | 0.93     |
| Perlado  | 0.80     |

### Pinon Automatico
```
Pinon = Desarrollo / 5
```

### Calculo de Materiales - Ficha Tecnica (NUEVO 06-03-2026)
Para productos laminados (BOPP + Adhesivo + Cast):
```
Gramaje Total = Gramaje Capa1 + Gramaje Adhesivo + Gramaje Capa2
Metros Totales = (Kg Pedidos × 1000) / Gramaje Total

Kg Capa1 = (Metros Totales × Gramaje Capa1) / 1000
Kg Adhesivo = (Metros Totales × Gramaje Adhesivo Lineal) / 1000
Kg Catalizador = Kg Adhesivo / Relacion (ej: 10:1)
Kg Capa2 = (Metros Totales × Gramaje Capa2) / 1000
```

**Preguntas pendientes para el equipo:**
1. Gramaje tipico del adhesivo (g/m²)?
2. Relacion catalizador (10:1, 5:1, etc)?
3. Ejemplo real para validar formula
4. Agregar % merma?

### Calculo Metros/Bobina (Area Corte)
```
Metros/Bobina = (Peso Bobina × 1000) / Gramaje
Gramaje = Ancho(m) × Micras × Densidad
```
*Se calcula automaticamente al llenar Peso Bobina*

## Sistema de Control de Tiempo (IMPLEMENTADO 06-03-2026)

### Panel de Comandas (Selector tipo restaurante)
- Aparece al inicio de cada modulo de produccion (Impresion, Laminacion, Corte)
- Muestra OTs pendientes como "comandas" de restaurante
- Cards visuales con colores por prioridad:
  - **Rojo (danger):** Urgente
  - **Amarillo (warning):** Alta prioridad
  - **Azul (primary):** Normal
- Informacion mostrada: numero OT, cliente, producto, kg pedidos, tiempo acumulado
- Al hacer click en una comanda se carga la OT y se muestra el panel de tiempo
- Ubicado en `control-tiempo.js` funcion `renderPanelComandas()`

### Modal Obligatorio de Pausa
- Al pausar una OT se muestra modal que OBLIGA a indicar motivo
- No se puede cerrar sin seleccionar un motivo
- Motivos predefinidos:
  - Cambio de bobina
  - Ajuste de maquina
  - Falta de material
  - Cambio de turno
  - Mantenimiento
  - Problema de calidad
  - Almuerzo/Descanso
  - Otro (especificar)
- Si selecciona "Otro", debe escribir el motivo manualmente
- Motivo se guarda en el registro de la orden
- Ubicado en `control-tiempo.js` funcion `pausaConMotivo()`

### Regla Importante
**TODOS los cambios solicitados en un modulo de produccion deben aplicarse a los 3 modulos:**
- Impresion (`impresion.js`)
- Laminacion (`laminacion.js`)
- Corte (`corte.js`)

## Feedback Pendiente del Equipo (06-03-2026)

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

### FICHA TECNICA (NUEVO 06-03-2026)
- [x] Seccion agregada con estructura del producto (Capa1 + Adhesivo + Capa2)
- [x] Calculo automatico de kg necesarios de cada material
- [x] Busqueda de SKU del inventario por tipo de material
- [x] Densidades automaticas por tipo de material
- [ ] **PENDIENTE:** Respuestas del equipo sobre gramaje adhesivo, relacion catalizador, y ejemplo real

### AREA DE CORTE/EMBALAJE
- [x] Metros/Bobina: calculado automaticamente (Peso / Gramaje)

### CAMPOS A MODIFICAR EN IMPRESION
- [ ] Despues de ancho de corte: numero de banda
- [ ] Despues de frecuencia: repeticiones
- [ ] Figura de Embobinado: opciones 1-8
- [ ] Tipo de impresion: Superficie y Reverso
- [ ] Colores: 8 posiciones (1=color, 2=color, etc.)
- [x] Pinon automatico: desarrollo / 5 (IMPLEMENTADO)
- [ ] Linea de corte: 3mm y 5mm
- [x] ELIMINAR: Ubicacion de Fotocelda, Gramaje en tinta (ELIMINADOS)
- [ ] Sustratos virgen: buscar SKU del inventario (Ancho x Micraje)
- [ ] Kg de Salida: solo al terminar la orden
- [x] Metros estimados: se calculan al seleccionar producto + pedidoKg (IMPLEMENTADO)

### TINTAS Y SOLVENTES
- [ ] Atados a orden de trabajo pero editables
- [ ] Preparados dentro de produccion
- [ ] Solventes: agregar varias medidas/consumos de acetatos
- [ ] Colorista puede crear colores nuevos (mezcla de N kg de cada tinta)

### INVENTARIO
- [ ] Enlazado con orden de compra
- [ ] Relacion con ordenes de produccion
- [ ] Varios materiales por orden
- [ ] Material sobrante debe reponerse
- [ ] Codigo de producto y codigo de barra por producto
- [ ] Codificacion por diferencia, micras, anchos
- [ ] Adhesivos: despachar kg sin necesidad de orden

### CALIDAD Y DESPACHO
- [ ] Alimentarse con orden de trabajo
- [ ] Listado de despacho
- [ ] Orden de entrega (entregas parciales de una orden grande)
- [ ] Solicitud de material y repuestos para produccion
- [ ] Nota de entrega asociada a ordenes
- [ ] Certificado de calidad automatico (editable, imprimible, firmable)
- [ ] Seleccionar paletas/bobinas a despachar

### LAMINACION
- [ ] Gramaje adhesivo: permitir coma decimal
- [ ] Materiales: elegir tipo de adhesivo del inventario al finalizar

## Convenciones de Codigo

### localStorage Keys
- `axones_ordenes_trabajo` - Ordenes de trabajo
- `axones_inventario` - Inventario de materiales
- `axones_tintas_inventario` - Inventario de tintas
- `axones_adhesivos_inventario` - Inventario de adhesivos
- `axones_produccion` - Registros de produccion
- `axones_alertas` - Alertas del sistema

### Prefijo de Cache
Usar `CONFIG.CACHE.PREFIJO` = `'axones_'`

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
