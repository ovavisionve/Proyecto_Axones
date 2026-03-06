# FICHA TECNICA - SISTEMA AXONES
## Datos para Pre-cargar en el Sistema

**Fecha de solicitud:** 2026-03-06
**Completar y devolver a:** [Desarrollo]

---

## 1. USUARIOS Y PERMISOS

### 1.1 Lista de Usuarios
Completar la siguiente tabla con TODOS los usuarios que usaran el sistema:

| # | Nombre Completo | Usuario | Clave | Cargo | Area | Rol Sistema |
|---|-----------------|---------|-------|-------|------|-------------|
| 1 | | | | | | |
| 2 | | | | | | |
| 3 | | | | | | |
| 4 | | | | | | |
| 5 | | | | | | |
| 6 | | | | | | |
| 7 | | | | | | |
| 8 | | | | | | |
| 9 | | | | | | |
| 10 | | | | | | |

**Roles disponibles:**
- `operador` - Solo puede ver su produccion y alertas propias
- `supervisor` - Puede ver toda la produccion, gestionar alertas, ver operadores
- `jefe_operaciones` - Acceso completo a produccion y dashboard
- `administrador` - Acceso total al sistema incluyendo configuracion

**Areas disponibles:**
- Impresion
- Laminacion
- Corte
- Calidad
- Despacho
- Administracion

---

## 2. DESCRIPCION DE TINTAS - VALORES POR DEFECTO

### 2.1 Tintas de Laminacion
Completar ANILOX y VISCOSIDAD estandar para cada color:

| # | COLOR | ANILOX | VISCOSIDAD | % ESTANDAR |
|---|-------|--------|------------|------------|
| 1 | BLANCO | | | |
| 2 | NEGRO | | | |
| 3 | AMARILLO PROCESO | | | |
| 4 | CYAN | | | |
| 5 | MAGENTA | | | |
| 6 | ROJO 485 2X | | | |
| 7 | ROJO 485 C | | | |
| 8 | AZUL REFLEX | | | |
| 9 | AZUL PROCESO | | | |
| 10 | NARANJA 021 | | | |
| 11 | NARANJA MARY | | | |
| 12 | VERDE C | | | |
| 13 | VIOLETA PANTONE | | | |
| 14 | DORADO ALVARIGUA | | | |
| 15 | EXTENDER | | | |

### 2.2 Tintas de Superficie
| # | COLOR | ANILOX | VISCOSIDAD | % ESTANDAR |
|---|-------|--------|------------|------------|
| 1 | BLANCO | | | |
| 2 | NEGRO | | | |
| 3 | AMARILLO | | | |
| 4 | CYAN | | | |
| 5 | MAGENTA | | | |
| 6 | ROJO 485 2X | | | |
| 7 | AZUL REFLEX | | | |
| 8 | NARANJA 021 | | | |
| 9 | DORADO ALVARIGUA | | | |
| 10 | BARNIZ S/IMP | | | |
| 11 | VERDE C | | | |

---

## 3. CONFIGURACION DE MAQUINAS

### 3.1 Impresoras
| Maquina | Nombre Sistema | Ancho Max (mm) | Velocidad Max | Estado |
|---------|---------------|----------------|---------------|--------|
| COMEXI 067 | COMEXI 1 | | | Activa/Inactiva |
| COMEXI 045 | COMEXI 2 | | | Activa/Inactiva |

### 3.2 Laminadoras
| Maquina | Nombre Sistema | Ancho Max (mm) | Velocidad Max | Estado |
|---------|---------------|----------------|---------------|--------|
| Laminadora | | | | Activa/Inactiva |

### 3.3 Cortadoras
| Maquina | Nombre Sistema | Ancho Max (mm) | Velocidad Max | Estado |
|---------|---------------|----------------|---------------|--------|
| Cortadora China | | | | Activa/Inactiva |
| Cortadora Permaco | | | | Activa/Inactiva |
| Cortadora Novograf | | | | Activa/Inactiva |

---

## 4. TURNOS DE TRABAJO

### 4.1 Definicion de Turnos
| Turno | Nombre | Hora Inicio | Hora Fin |
|-------|--------|-------------|----------|
| 1 | Diurno | 7:00 AM | 7:00 PM |
| 2 | Nocturno | 7:00 PM | 7:00 AM |

**Confirmar si estos turnos son correctos:** [ ] Si  [ ] No

Si no, especificar los turnos correctos:
_____________________________________________________________

---

## 5. CLIENTES

### 5.1 Lista de Clientes Activos
| # | Razon Social | RIF | Contacto | Telefono | Email |
|---|--------------|-----|----------|----------|-------|
| 1 | | | | | |
| 2 | | | | | |
| 3 | | | | | |
| 4 | | | | | |
| 5 | | | | | |
| 6 | | | | | |
| 7 | | | | | |
| 8 | | | | | |
| 9 | | | | | |
| 10 | | | | | |

*(Agregar mas filas si es necesario)*

---

## 6. PROVEEDORES DE MATERIA PRIMA

### 6.1 Proveedores de Sustratos
| # | Proveedor | RIF | Materiales que Suministra | Contacto |
|---|-----------|-----|---------------------------|----------|
| 1 | | | | |
| 2 | | | | |
| 3 | | | | |
| 4 | | | | |
| 5 | | | | |

### 6.2 Proveedores de Tintas
| # | Proveedor | RIF | Tipos de Tinta | Contacto |
|---|-----------|-----|----------------|----------|
| 1 | | | | |
| 2 | | | | |
| 3 | | | | |

### 6.3 Proveedores de Adhesivos/Solventes
| # | Proveedor | RIF | Productos | Contacto |
|---|-----------|-----|-----------|----------|
| 1 | | | | |
| 2 | | | | |
| 3 | | | | |

---

## 7. ADHESIVOS Y QUIMICOS

### 7.1 Tipos de Adhesivo
| # | Nombre Comercial | Proveedor | Unidad | Relacion Mezcla |
|---|------------------|-----------|--------|-----------------|
| 1 | | | Kg | |
| 2 | | | Kg | |
| 3 | | | Kg | |

### 7.2 Catalizadores
| # | Nombre | Proveedor | Unidad |
|---|--------|-----------|--------|
| 1 | | | Kg |
| 2 | | | Kg |

### 7.3 Solventes
| # | Nombre | Proveedor | Unidad |
|---|--------|-----------|--------|
| 1 | ALCOHOL ISOPROPILICO (IPA) | | Lt |
| 2 | ACETATO N-PROPYL | | Lt |
| 3 | METHOXY PROPANOL | | Lt |
| 4 | | | |

---

## 8. PARAMETROS DE PRODUCCION

### 8.1 Figura de Embobinado
Confirmar las 8 opciones de embobinado (agregar imagen o descripcion):

| Opcion | Descripcion/Imagen |
|--------|-------------------|
| 1 | |
| 2 | |
| 3 | |
| 4 | |
| 5 | |
| 6 | |
| 7 | |
| 8 | |

### 8.2 Linea de Corte
| Opcion | Valor |
|--------|-------|
| 1 | 3mm |
| 2 | 5mm |
| 3 | (otro?) |

### 8.3 Tipo de Impresion
| Opcion | Descripcion |
|--------|-------------|
| 1 | Superficie |
| 2 | Reverso |
| 3 | (otro?) |

---

## 9. CONFIGURACION DE ALERTAS

### 9.1 Umbrales de Refil/Scrap
| Parametro | Valor Actual | Valor Deseado |
|-----------|-------------|---------------|
| Advertencia (amarillo) | 5.0% | |
| Critico (rojo) | 6.0% | |

### 9.2 Alertas de Inventario
| Material | Stock Minimo (Kg) para Alerta |
|----------|------------------------------|
| BOPP NORMAL | |
| BOPP MATE | |
| BOPP PASTA | |
| CAST | |
| METAL | |
| PEBD | |
| (otros) | |

### 9.3 Dias de Anticipacion para Alertas de Entrega
Cuantos dias antes de la fecha de entrega debe alertar el sistema: ______ dias

---

## 10. FORMATO DE DOCUMENTOS

### 10.1 Numeracion de Ordenes de Trabajo
Formato actual: `OT-001`, `OT-002`, etc.

Prefijo deseado: __________
Inicio de numeracion: __________
Reinicio anual: [ ] Si  [ ] No

### 10.2 Datos de la Empresa para Documentos
| Campo | Valor |
|-------|-------|
| Razon Social | INVERSIONES AXONES 2008, C.A. |
| RIF | |
| Direccion | |
| Telefono | |
| Email | |
| Logo (adjuntar archivo) | |

---

## 11. DENSIDADES DE MATERIALES

Confirmar o corregir las densidades:

| Material | Densidad Actual | Densidad Correcta |
|----------|-----------------|-------------------|
| BOPP (Normal, Mate, Pasta) | 0.90 | |
| BOPP PERLADO | 0.80 | |
| PERLADO | 0.80 | |
| CAST | 0.92 | |
| PEBD | 0.93 | |
| PEBD PIGMENT | 0.93 | |
| PET | 1.40 | |
| PA (Nylon) | 1.14 | |
| METAL | 0.90 | |

---

## 12. INTEGRACIONES

### 12.1 Google Sheets
ID de la hoja actual: `1tuNSBnBvfRw2QYVuaBMbyHmxuCRPOVgc9W6V7oF-9Zk`

Confirmar acceso: [ ] Si  [ ] No

### 12.2 Emails para Notificaciones
| Tipo de Alerta | Emails que Reciben |
|----------------|-------------------|
| Stock bajo | |
| Ordenes urgentes | |
| Produccion diaria | |
| Errores del sistema | |

---

## 13. PERMISOS POR MODULO

Marcar con X los modulos que puede acceder cada rol:

| Modulo | Operador | Supervisor | Jefe Op. | Admin |
|--------|----------|------------|----------|-------|
| Dashboard | | | | X |
| Ordenes de Trabajo | | | | X |
| Impresion | | | | X |
| Laminacion | | | | X |
| Corte | | | | X |
| Inventario | | | | X |
| Tintas | | | | X |
| Alertas | | | | X |
| Reportes | | | | X |
| Despacho | | | | X |
| Calidad | | | | X |
| Configuracion | | | | X |

---

## 14. OBSERVACIONES ADICIONALES

Cualquier informacion adicional que deba considerarse:

_______________________________________________________________
_______________________________________________________________
_______________________________________________________________
_______________________________________________________________
_______________________________________________________________

---

## FIRMAS

| Rol | Nombre | Firma | Fecha |
|-----|--------|-------|-------|
| Solicitado por | | | |
| Revisado por | | | |
| Aprobado por | | | |

---

**INSTRUCCIONES:**
1. Completar TODOS los campos aplicables
2. Si un campo no aplica, escribir "N/A"
3. Adjuntar archivos adicionales si es necesario (logo, imagenes de embobinado, etc.)
4. Devolver este documento completado para cargar los datos en el sistema

**Contacto para dudas:** [Agregar contacto de desarrollo]
