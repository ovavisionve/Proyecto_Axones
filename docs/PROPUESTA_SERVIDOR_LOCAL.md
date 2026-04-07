# Propuesta: Servidor Local para Sistema de Gestion de Produccion

**Para:** Inversiones Axones 2008, C.A.
**Asunto:** Migracion del backend del sistema a un servidor en planta

---

## Resumen Ejecutivo

Actualmente, todos los datos del sistema (ordenes de trabajo, inventario, registros de produccion, despachos, etc.) se almacenan en un servicio en la nube. Esto funciona bien, pero entendemos la necesidad de **mantener los datos fisicamente en sus instalaciones de Maracay** para tener control total sobre la informacion de la empresa.

Esta propuesta describe la solucion mas simple para lograr ese objetivo, manteniendo el sistema funcionando exactamente igual que ahora.

---

## Que va a cambiar

**Para los usuarios del sistema: NADA.**

Los operadores, supervisores y administradores van a seguir entrando al sistema desde sus tablets y computadoras igual que siempre. Mismo login, mismas pantallas, mismas funciones.

**Lo unico que cambia:** los datos dejan de viajar a internet y se quedan dentro de la planta, en una computadora dedicada que ustedes controlan.

---

## Que necesitamos de Axones

### 1. Una computadora dedicada (servidor)

No tiene que ser una computadora especial ni costosa. Una PC de oficina moderna es suficiente. Estas son las caracteristicas minimas recomendadas:

**Especificaciones:**
- Procesador: Intel Core i5 (de los ultimos 5 anos) o AMD Ryzen 5
- Memoria RAM: 16 GB
- Disco duro solido (SSD): 500 GB
- Sistema operativo: Windows 10 Pro o Windows 11 Pro (no Home)
- Conexion a la red de la planta por cable (no WiFi)

**Costo aproximado:** Entre 400 y 600 dolares si se compra nueva. Si ya tienen una PC con estas caracteristicas, se puede reutilizar.

### 2. Un sistema de respaldo de energia (UPS / no-break)

**Esto es critico.** Los cortes de luz repentinos pueden dañar la base de datos y se pierde informacion.

**Especificaciones:**
- UPS de 1000 VA o superior
- Que de al menos 15 minutos de autonomia

**Costo aproximado:** Entre 80 y 150 dolares.

### 3. Un disco externo para respaldos automaticos

Cada noche el sistema va a hacer una copia de seguridad de todos los datos a este disco. Si la PC principal se daña, podemos recuperar todo.

**Especificaciones:**
- Disco USB externo de 1 TB
- USB 3.0

**Costo aproximado:** Entre 50 y 80 dolares.

### 4. Conexion a la red de la planta

La PC servidor tiene que estar conectada por cable de red al switch principal de la planta, y necesita una direccion IP fija (esto lo configura el tecnico de redes en 5 minutos).

Las tablets de los operadores se van a conectar a esta PC desde la red WiFi de la planta. No necesitan internet para que el sistema funcione.

### 5. Un espacio fisico

La PC servidor debe estar en un lugar fresco, ventilado y donde no la apaguen accidentalmente. Idealmente:
- En la oficina de sistemas o una sala de servidores si tienen
- Conectada al UPS
- Cerca del switch de red principal

---

## Que vamos a hacer nosotros

Una vez que la PC este lista, nosotros nos encargamos de:

1. **Instalar el software necesario** (es gratis, sin licencias que pagar)
2. **Migrar todos los datos actuales** del servidor en la nube al servidor local
3. **Configurar los respaldos automaticos** al disco externo
4. **Actualizar el sistema** para que apunte al nuevo servidor
5. **Hacer pruebas con los operadores** para verificar que todo funciona

**Tiempo estimado de instalacion:** 1 dia completo + medio dia de pruebas con los operadores.

---

## Resumen de costos

| Concepto | Costo aproximado |
|----------|-----------------|
| PC con specs requeridas (si la compran nueva) | $400 - $600 |
| UPS de respaldo | $80 - $150 |
| Disco externo USB 1 TB | $50 - $80 |
| Software | $0 (todo gratis) |
| Instalacion y migracion | (a coordinar) |
| **Total hardware** | **$530 - $830** |

---

## Beneficios de esta solucion

1. **Control total de los datos**: toda la informacion queda fisicamente en sus instalaciones.
2. **Sin dependencia de internet**: el sistema funciona aunque se caiga el internet de la planta.
3. **Mayor velocidad**: al estar en la red local, la respuesta es mas rapida que ir a internet.
4. **Sin costos mensuales**: no hay suscripcion al servicio en la nube.
5. **Privacidad**: los datos de produccion, clientes y proveedores nunca salen de la planta.
6. **Cumplimiento**: ideal si necesitan certificaciones o auditorias que requieran datos en sitio.

---

## Que pasa si la PC servidor se daña

Tenemos dos niveles de proteccion:

1. **Respaldo automatico nocturno** al disco externo USB. Si la PC principal falla, conectamos el disco a otra PC y restauramos el sistema en pocas horas.

2. **El sistema en la nube actual queda como respaldo** durante las primeras semanas, hasta que verifiquemos que todo funciona perfectamente en local. Despues se puede mantener sincronizado o desconectar.

---

## Riesgos y consideraciones

**Mantenimiento basico:** Una vez instalado, el sistema necesita poco mantenimiento. Pero alguien debe encargarse de:
- Verificar que el respaldo nocturno se hace correctamente (5 minutos al dia)
- Reemplazar el disco externo si se llena (cada varios meses)
- Reiniciar la PC si hay problemas (poco frecuente)

Recomendamos asignar a una persona del area de sistemas para esta tarea, o nosotros podemos ofrecer soporte mensual.

**Acceso remoto:** Si en el futuro quieren acceder al sistema desde fuera de la planta (por ejemplo, gerencia desde su casa), se puede configurar mas adelante con una conexion VPN segura.

---

## Proximos pasos

1. **Axones confirma** si esta de acuerdo con esta propuesta
2. **Axones consigue** el hardware (PC, UPS, disco externo)
3. **Coordinamos fecha** de instalacion (1 dia laboral)
4. **Hacemos la instalacion** y migracion de datos
5. **Pruebas** con los operadores
6. **Sistema operativo** desde el servidor local

---

**Tiempo total desde la confirmacion hasta tener todo funcionando:** 1 a 2 semanas (depende de la disponibilidad del hardware).

---

Cualquier duda, estamos a la orden.
