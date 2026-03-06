# Plan de Desarrollo - Sistema Axones
## Organizacion por Fases

---

## FASE 1: ORDENES DE TRABAJO (Formulario Completo)

### 1.1 Estructura del Formulario de Orden
El formulario de orden de trabajo se divide en secciones:

#### SECCION A: Datos Basicos (Auto-generados)
- [ ] **Numero de orden correlativo automatico** (sin que el usuario elija nombre)
  - Formato: `OT-AAAA-NNNN` (ej: OT-2026-0001)
  - Se genera al crear, no editable

#### SECCION B: Datos del Cliente/Producto
- [ ] Cliente (con memoria - autocompletado)
- [ ] RIF del cliente
- [ ] Producto
- [ ] Codigo de producto (enlazado con inventario)
- [ ] Codigo de barra

#### SECCION C: Datos de Produccion
- [ ] Maquina (COMEXI 067 o COMEXI 045)
- [ ] Pedido en Kg
- [ ] Fecha de orden
- [ ] Prioridad

#### SECCION D: Area de Montaje
- [ ] Frecuencia
- [ ] Ancho de corte
- [ ] **Numero de banda** (despues de ancho de corte)
- [ ] Ancho de montaje
- [ ] **Repeticiones** (despues de frecuencia)
- [ ] **Figura de Embobinado** (opciones 1-8)
- [ ] **Tipo de impresion** (Superficie / Reverso)
- [ ] Desarrollo
- [ ] Numero de colores

#### SECCION E: Colores (hasta 8 posiciones)
- [ ] Color 1: [nombre del color]
- [ ] Color 2: [nombre del color]
- [ ] Color 3: [nombre del color]
- [ ] Color 4: [nombre del color]
- [ ] Color 5: [nombre del color]
- [ ] Color 6: [nombre del color]
- [ ] Color 7: [nombre del color]
- [ ] Color 8: [nombre del color]

#### SECCION F: Area de Impresion
- [ ] **Pinon** (automatico: desarrollo / 5)
- [ ] **Linea de corte** (opciones: 3mm, 5mm)
- [ ] ~~Ubicacion de Fotocelda~~ (ELIMINAR)
- [ ] ~~Gramaje en tinta~~ (ELIMINAR)
- [ ] **Sustratos virgen** (buscar SKU del inventario, formato: Ancho x Micraje)

#### SECCION G: Material
- [ ] Tipo de material (BOPP, PE, Perlado, etc.)
- [ ] Micras
- [ ] Ancho

---

## FASE 2: IMPRESION (Registro de Produccion)

### 2.1 Campos del Formulario
- [ ] Seleccionar orden de trabajo (del listado)
- [ ] Los datos de la orden se cargan automaticamente
- [ ] Kg de entrada (del inventario)
- [ ] **Kg de salida** (solo al TERMINAR la orden, no antes)
- [ ] Calculo automatico de metros:
  ```
  Densidad: BOPP=0.90, PE=0.93, Perlado=0.80
  Gramaje = Ancho(m) x Micras x Densidad
  Metros = Kg_salida / Gramaje
  ```

### 2.2 Tintas y Solventes
- [ ] Atados a la orden de trabajo
- [ ] Pero editables durante produccion
- [ ] Preparados: el colorista puede crear colores nuevos
  - Al crear color: pide N kg de tinta A + N kg de tinta B + ...
- [ ] Solventes: poder agregar multiples consumos de acetato

### 2.3 Flujo Superficie vs Reverso
- [ ] Si es **Superficie**: va de Impresion directo a Corte (sin Laminacion)
- [ ] Si es **Reverso**: va Impresion -> Laminacion -> Corte

---

## FASE 3: LAMINACION

### 3.1 Campos
- [ ] **Gramaje adhesivo**: permitir coma decimal (ej: 2,5)
- [ ] **Materiales**: al finalizar, elegir tipo de adhesivo del inventario

---

## FASE 4: CORTE (Cambio de Flujo Importante)

### 4.1 Cambio Principal: Por TURNO, no por Orden
- [ ] El area de corte trabaja por **turno**, no por orden de trabajo
- [ ] Turnos: 7am-7pm (Dia) y 7pm-7am (Noche)
- [ ] Un operador registra TODO lo que corto en su turno

### 4.2 Campos
- [ ] **Paletas ilimitadas** (agregar dinamicamente con boton "+")
- [ ] **Cantidad de rollos** por paleta
- [ ] **Temporizador** para saber cuantos kg salieron

### 4.3 Reportes
- [ ] Reporte por turno
- [ ] Reporte por maquina

---

## FASE 5: INVENTARIO

### 5.1 Estructura
- [ ] **Codigo de producto** por cada item
- [ ] **Codigo de barra** por cada item
- [ ] Codificacion por: diferencia, micras, anchos
- [ ] Esta codificacion se pre-carga en las ordenes

### 5.2 Relacion con Produccion
- [ ] Enlazado con ordenes de compra
- [ ] Una orden puede pedir 10,000 kg pero usar solo 8,000
- [ ] El sobrante (2,000 kg) se debe **reponer** al inventario
- [ ] Resumen al completar orden: material usado vs sobrante

### 5.3 Asignacion de Material
- [ ] Si hay 5 ordenes que piden 10,000 kg c/u y llegan solo 10,000 kg
- [ ] El encargado de inventario decide a cual orden asignar ese material
- [ ] Se pueden usar **varios materiales** por orden

### 5.4 Adhesivos
- [ ] Poder despachar kg de adhesivos **sin necesidad** de orden de produccion

---

## FASE 6: CALIDAD Y DESPACHO

### 6.1 Despachos Parciales
- [ ] Una orden de 100,000 kg puede entregarse en partes
- [ ] Hoy entrego 20,000 kg, manana otros 30,000 kg, etc.
- [ ] Crear **listado de despacho**
- [ ] Crear **orden de entrega** con los kg despachados

### 6.2 Seleccion de Paletas
- [ ] Desde la seccion de corte, seleccionar paletas a despachar
- [ ] Cada paleta tiene su cantidad de bobinas
- [ ] Elegir cuales paletas se despachan

### 6.3 Nota de Entrega
- [ ] Asociada a la orden de trabajo
- [ ] Al elegir kg a entregar, se genera automaticamente

### 6.4 Certificado de Calidad
- [ ] Se genera **automatico** al despachar
- [ ] Debe ser **editable**
- [ ] Debe ser **imprimible**
- [ ] Espacio para **firma**

### 6.5 Solicitudes
- [ ] Crear **solicitud de material y repuestos** para produccion

---

## FASE 7: REPORTES

### 7.1 Tipos de Reporte
- [ ] Por turno (7am-7pm, 7pm-7am)
- [ ] Por maquina
- [ ] Por orden de trabajo
- [ ] Por cliente

---

## Orden de Implementacion Sugerido

1. **FASE 1** - Ordenes de trabajo (formulario completo)
2. **FASE 5** - Inventario (codigos y relacion con ordenes)
3. **FASE 2** - Impresion (con formulas y tintas)
4. **FASE 3** - Laminacion
5. **FASE 4** - Corte (por turno)
6. **FASE 6** - Calidad y despacho
7. **FASE 7** - Reportes

---

## Estado Actual

| Fase | Estado | Notas |
|------|--------|-------|
| Fase 1 | En progreso | Falta correlativo auto, campos nuevos |
| Fase 2 | Parcial | Falta formula metros, kg salida al final |
| Fase 3 | Parcial | Falta coma decimal en gramaje |
| Fase 4 | Requiere rediseno | Cambiar de orden a turno |
| Fase 5 | Parcial | 158 productos cargados, faltan codigos |
| Fase 6 | No iniciado | - |
| Fase 7 | Parcial | Algunos reportes existen |

---

## Proximos Pasos

**Empezar por FASE 1**: Completar el formulario de ordenes de trabajo con todos los campos correctos.

¿Cual seccion de la Fase 1 trabajamos primero?
- A) Correlativo automatico
- B) Campos de montaje (banda, repeticiones, figura embobinado)
- C) Colores (8 posiciones)
- D) Campos de impresion (pinon auto, linea corte, sustratos)
