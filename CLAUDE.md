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

## Maquinas
- **Impresion:** COMEXI 067, COMEXI 045
- **Laminacion:** Laminadora
- **Corte:** Cortadora China, Cortadora Permaco, Cortadora Novograf

## Formulas de Produccion

### Calculo de Metros
```
Gramaje = Ancho (m) × Micras × Densidad
Metros = Kg de salida / Gramaje
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

## Feedback Pendiente del Equipo (04-03-2026)

### CRITICOS - Cambios de Flujo
- [ ] Area de corte por TURNO (7am-7pm, 7pm-7am), no por orden de trabajo
- [ ] Nombres de orden por correlativo automatico (sin elegir nombre)
- [ ] Paletas ilimitadas en corte (agregar dinamicamente)
- [ ] Cantidad de rollos en corte
- [ ] Temporizador para kg en corte

### CAMPOS A MODIFICAR EN IMPRESION
- [ ] Despues de ancho de corte: numero de banda
- [ ] Despues de frecuencia: repeticiones
- [ ] Figura de Embobinado: opciones 1-8
- [ ] Tipo de impresion: Superficie y Reverso
- [ ] Colores: 8 posiciones (1=color, 2=color, etc.)
- [ ] Pinon automatico: desarrollo / 5
- [ ] Linea de corte: 3mm y 5mm
- [ ] ELIMINAR: Ubicacion de Fotocelda, Gramaje en tinta
- [ ] Sustratos virgen: buscar SKU del inventario (Ancho x Micraje)
- [ ] Kg de Salida: solo al terminar la orden

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
