# Manual de Pruebas y Feedback - Sistema Axones

**Version:** 1.0
**Fecha:** Febrero 2026
**Para:** Inversiones Axones 2008, C.A.

---

## Instrucciones Generales

1. **Navegador recomendado:** Google Chrome (evitar Opera)
2. **Credenciales de prueba:**
   - Administrador: `admin` / `admin123`
   - Supervisor: `supervisor` / `super123`
   - Operador: `operador1` / `op123`

3. **Como dar feedback:** Complete cada seccion marcando si funciona correctamente o describiendo el problema encontrado.

---

## MODULO 1: LOGIN Y AUTENTICACION

### Pruebas a realizar:
| # | Prueba | Funciona? | Comentarios |
|---|--------|-----------|-------------|
| 1.1 | Iniciar sesion con admin/admin123 | [ ] Si [ ] No | |
| 1.2 | Iniciar sesion con credenciales incorrectas (debe mostrar error) | [ ] Si [ ] No | |
| 1.3 | Cerrar sesion (boton en navbar) | [ ] Si [ ] No | |
| 1.4 | Verificar que muestra el nombre del usuario en el navbar | [ ] Si [ ] No | |

### Feedback adicional:
```
(Escriba aqui cualquier observacion sobre el login)


```

---

## MODULO 2: DASHBOARD (INICIO)

### Pruebas a realizar:
| # | Prueba | Funciona? | Comentarios |
|---|--------|-----------|-------------|
| 2.1 | Se muestran las 4 tarjetas de KPIs (Produccion, Refil, Alertas, Inventario) | [ ] Si [ ] No | |
| 2.2 | Los graficos Power BI cargan correctamente | [ ] Si [ ] No | |
| 2.3 | La fecha y hora se actualizan | [ ] Si [ ] No | |
| 2.4 | El badge "Conectado a Sheets" aparece en verde | [ ] Si [ ] No | |
| 2.5 | El boton "Imprimir" genera vista de impresion | [ ] Si [ ] No | |
| 2.6 | Las alertas recientes se muestran | [ ] Si [ ] No | |
| 2.7 | El modo oscuro funciona (icono sol/luna en navbar) | [ ] Si [ ] No | |

### Feedback adicional:
```
(Escriba aqui cualquier observacion sobre el dashboard)


```

---

## MODULO 3: CONTROL DE IMPRESION

### Pruebas a realizar:
| # | Prueba | Funciona? | Comentarios |
|---|--------|-----------|-------------|
| 3.1 | Seleccionar fecha, turno, maquina | [ ] Si [ ] No | |
| 3.2 | Seleccionar cliente de la lista | [ ] Si [ ] No | |
| 3.3 | Ingresar producto y orden de trabajo | [ ] Si [ ] No | |
| 3.4 | Ingresar bobinas de entrada (se calcula el total) | [ ] Si [ ] No | |
| 3.5 | Ingresar bobinas de salida (se calcula el total) | [ ] Si [ ] No | |
| 3.6 | El % de refil se calcula automaticamente | [ ] Si [ ] No | |
| 3.7 | Guardar registro (debe aparecer en Google Sheets) | [ ] Si [ ] No | |
| 3.8 | Si refil > 6%, se genera alerta automatica | [ ] Si [ ] No | |
| 3.9 | Validacion: no permite guardar sin campos obligatorios | [ ] Si [ ] No | |

### Feedback adicional:
```
(Escriba aqui cualquier observacion sobre impresion)


```

---

## MODULO 4: CONTROL DE LAMINACION

### Pruebas a realizar:
| # | Prueba | Funciona? | Comentarios |
|---|--------|-----------|-------------|
| 4.1 | Seleccionar fecha, turno, maquina | [ ] Si [ ] No | |
| 4.2 | Ingresar OT de impresion de origen | [ ] Si [ ] No | |
| 4.3 | Ingresar bobinas de entrada y salida | [ ] Si [ ] No | |
| 4.4 | Ingresar consumo de adhesivo, catalizador, acetato | [ ] Si [ ] No | |
| 4.5 | El % de refil se calcula automaticamente | [ ] Si [ ] No | |
| 4.6 | Guardar registro (debe aparecer en Google Sheets) | [ ] Si [ ] No | |
| 4.7 | Validacion de campos obligatorios funciona | [ ] Si [ ] No | |

### Feedback adicional:
```
(Escriba aqui cualquier observacion sobre laminacion)


```

---

## MODULO 5: CONTROL DE CORTE

### Pruebas a realizar:
| # | Prueba | Funciona? | Comentarios |
|---|--------|-----------|-------------|
| 5.1 | Seleccionar fecha, turno, maquina | [ ] Si [ ] No | |
| 5.2 | Ingresar bobinas de entrada (14 posiciones) | [ ] Si [ ] No | |
| 5.3 | Ingresar bobinas por paleta (4 paletas x 48 bobinas) | [ ] Si [ ] No | |
| 5.4 | Se calcula total por paleta y total general | [ ] Si [ ] No | |
| 5.5 | El resumen de paletas se actualiza | [ ] Si [ ] No | |
| 5.6 | Guardar registro (debe aparecer en Google Sheets) | [ ] Si [ ] No | |

### Feedback adicional:
```
(Escriba aqui cualquier observacion sobre corte)


```

---

## MODULO 6: CONSUMO DE TINTAS

### Pruebas a realizar:
| # | Prueba | Funciona? | Comentarios |
|---|--------|-----------|-------------|
| 6.1 | Seleccionar OT, cliente, producto, maquina | [ ] Si [ ] No | |
| 6.2 | Ingresar tintas de laminacion (multiples colores) | [ ] Si [ ] No | |
| 6.3 | Ingresar tintas de superficie | [ ] Si [ ] No | |
| 6.4 | Ingresar solventes | [ ] Si [ ] No | |
| 6.5 | Los totales se calculan automaticamente | [ ] Si [ ] No | |
| 6.6 | Guardar registro (debe aparecer en Google Sheets) | [ ] Si [ ] No | |

### Feedback adicional:
```
(Escriba aqui cualquier observacion sobre tintas)


```

---

## MODULO 7: INVENTARIO

### Pruebas a realizar:
| # | Prueba | Funciona? | Comentarios |
|---|--------|-----------|-------------|
| 7.1 | Ver lista de materiales en inventario | [ ] Si [ ] No | |
| 7.2 | Agregar nuevo material (boton +) | [ ] Si [ ] No | |
| 7.3 | Filtrar por tipo de material | [ ] Si [ ] No | |
| 7.4 | Buscar material por nombre | [ ] Si [ ] No | |
| 7.5 | Los materiales con stock bajo se resaltan | [ ] Si [ ] No | |
| 7.6 | Guardar material (debe aparecer en Google Sheets) | [ ] Si [ ] No | |

### Feedback adicional:
```
(Escriba aqui cualquier observacion sobre inventario)


```

---

## MODULO 8: ALERTAS

### Pruebas a realizar:
| # | Prueba | Funciona? | Comentarios |
|---|--------|-----------|-------------|
| 8.1 | Ver lista de alertas activas | [ ] Si [ ] No | |
| 8.2 | Las alertas criticas se muestran en rojo | [ ] Si [ ] No | |
| 8.3 | Las alertas de advertencia se muestran en amarillo | [ ] Si [ ] No | |
| 8.4 | Marcar alerta como resuelta | [ ] Si [ ] No | |
| 8.5 | Filtrar alertas por estado | [ ] Si [ ] No | |
| 8.6 | El contador de alertas en el navbar se actualiza | [ ] Si [ ] No | |

### Feedback adicional:
```
(Escriba aqui cualquier observacion sobre alertas)


```

---

## MODULO 9: REPORTES

### Pruebas a realizar:
| # | Prueba | Funciona? | Comentarios |
|---|--------|-----------|-------------|
| 9.1 | Seleccionar rango de fechas | [ ] Si [ ] No | |
| 9.2 | Filtrar por proceso, maquina, cliente | [ ] Si [ ] No | |
| 9.3 | Los 4 graficos cargan con datos filtrados | [ ] Si [ ] No | |
| 9.4 | La tabla de datos muestra registros | [ ] Si [ ] No | |
| 9.5 | Exportar a CSV funciona (descarga archivo) | [ ] Si [ ] No | |
| 9.6 | Generar reporte de produccion | [ ] Si [ ] No | |
| 9.7 | Generar reporte de refil | [ ] Si [ ] No | |
| 9.8 | Generar reporte de inventario | [ ] Si [ ] No | |
| 9.9 | Generar reporte de tintas | [ ] Si [ ] No | |

### Feedback adicional:
```
(Escriba aqui cualquier observacion sobre reportes)


```

---

## MODULO 10: ETIQUETAS

### Pruebas a realizar:
| # | Prueba | Funciona? | Comentarios |
|---|--------|-----------|-------------|
| 10.1 | Ingresar informacion de orden (OT, fecha, cliente) | [ ] Si [ ] No | |
| 10.2 | Ingresar informacion de bobina | [ ] Si [ ] No | |
| 10.3 | Vista previa de etiqueta se genera | [ ] Si [ ] No | |
| 10.4 | Imprimir etiqueta | [ ] Si [ ] No | |
| 10.5 | Ver historial de etiquetas generadas | [ ] Si [ ] No | |

### Feedback adicional:
```
(Escriba aqui cualquier observacion sobre etiquetas)


```

---

## MODULO 11: PROGRAMACION

### Pruebas a realizar:
| # | Prueba | Funciona? | Comentarios |
|---|--------|-----------|-------------|
| 11.1 | Ver ordenes programadas | [ ] Si [ ] No | |
| 11.2 | Agregar nueva orden | [ ] Si [ ] No | |
| 11.3 | Arrastrar y soltar para reordenar (si aplica) | [ ] Si [ ] No | |
| 11.4 | Cambiar estado de orden | [ ] Si [ ] No | |

### Feedback adicional:
```
(Escriba aqui cualquier observacion sobre programacion)


```

---

## MODULO 12: CALIDAD (CHECKLIST Y CERTIFICADO)

### Pruebas a realizar:
| # | Prueba | Funciona? | Comentarios |
|---|--------|-----------|-------------|
| 12.1 | Checklist: Cargar lista de verificacion | [ ] Si [ ] No | |
| 12.2 | Checklist: Marcar items como completados | [ ] Si [ ] No | |
| 12.3 | Checklist: Guardar checklist | [ ] Si [ ] No | |
| 12.4 | Certificado: Ingresar datos del producto | [ ] Si [ ] No | |
| 12.5 | Certificado: Generar vista previa | [ ] Si [ ] No | |
| 12.6 | Certificado: Imprimir certificado | [ ] Si [ ] No | |

### Feedback adicional:
```
(Escriba aqui cualquier observacion sobre calidad)


```

---

## MODULO 13: CHATBOT IA

### Pruebas a realizar:
| # | Prueba | Funciona? | Comentarios |
|---|--------|-----------|-------------|
| 13.1 | Enviar mensaje al chatbot | [ ] Si [ ] No | |
| 13.2 | Preguntar "Cual es la produccion de hoy?" | [ ] Si [ ] No | |
| 13.3 | Preguntar "Como esta el refil?" | [ ] Si [ ] No | |
| 13.4 | Preguntar "Quienes son los top deudores?" | [ ] Si [ ] No | |
| 13.5 | Usar botones de consultas rapidas | [ ] Si [ ] No | |
| 13.6 | Limpiar chat | [ ] Si [ ] No | |

### Feedback adicional:
```
(Escriba aqui cualquier observacion sobre el chatbot)


```

---

## MODULO 14: ADMINISTRACION

### Pruebas a realizar:
| # | Prueba | Funciona? | Comentarios |
|---|--------|-----------|-------------|
| 14.1 | Ver configuracion del sistema | [ ] Si [ ] No | |
| 14.2 | Probar conexion a Google Sheets | [ ] Si [ ] No | |
| 14.3 | Cambiar umbrales de refil (advertencia/maximo) | [ ] Si [ ] No | |
| 14.4 | Ver lista de usuarios | [ ] Si [ ] No | |
| 14.5 | Agregar nuevo usuario | [ ] Si [ ] No | |
| 14.6 | Activar/desactivar usuario | [ ] Si [ ] No | |
| 14.7 | Generar datos de prueba (boton) | [ ] Si [ ] No | |
| 14.8 | Exportar backup (JSON) | [ ] Si [ ] No | |
| 14.9 | Importar backup | [ ] Si [ ] No | |
| 14.10 | Ver estadisticas de registros | [ ] Si [ ] No | |

### Feedback adicional:
```
(Escriba aqui cualquier observacion sobre administracion)


```

---

## MODULO 15: MODO OSCURO

### Pruebas a realizar:
| # | Prueba | Funciona? | Comentarios |
|---|--------|-----------|-------------|
| 15.1 | Toggle de modo oscuro no redirige a otra pagina | [ ] Si [ ] No | |
| 15.2 | Dashboard se ve bien en modo oscuro | [ ] Si [ ] No | |
| 15.3 | Formularios de produccion se ven bien | [ ] Si [ ] No | |
| 15.4 | Tablas se ven bien | [ ] Si [ ] No | |
| 15.5 | Modales se ven bien | [ ] Si [ ] No | |
| 15.6 | Pagina de etiquetas se ve bien | [ ] Si [ ] No | |

### Paginas con problemas de modo oscuro (especificar):
```


```

---

## RESUMEN DE FEEDBACK

### Modulos que funcionan correctamente:
```


```

### Modulos con problemas (listar):
```


```

### Sugerencias de mejora:
```


```

### Funcionalidades adicionales deseadas:
```


```

---

## INFORMACION DE LA PRUEBA

- **Fecha de prueba:** _______________
- **Realizada por:** _______________
- **Navegador usado:** _______________
- **Dispositivo:** _______________

---

*Gracias por su feedback. Esto nos ayuda a mejorar el sistema.*
