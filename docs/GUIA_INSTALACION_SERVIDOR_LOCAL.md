# Guia Tecnica: Instalacion de Servidor Local Self-Hosted Supabase

**Para:** Tu uso personal como guia paso a paso
**Sistema:** Self-hosted Supabase en Windows con Docker Desktop
**Tiempo estimado:** 1 dia laboral

---

## Antes de empezar - Checklist

Verifica que tienes todo esto antes de ir a Maracay:

- [ ] Acceso a la PC servidor (usuario administrador en Windows)
- [ ] Conexion a internet en la PC (necesaria SOLO para instalar, despues no)
- [ ] La PC tiene minimo 16 GB RAM y 500 GB SSD
- [ ] La PC esta conectada por cable de red al switch
- [ ] El UPS esta conectado y funcionando
- [ ] El disco externo USB esta conectado
- [ ] Tienes acceso al panel de Supabase actual (lzjuzfbzgyjazhzhfhzv.supabase.co)
- [ ] Tienes acceso al repositorio de GitHub del proyecto
- [ ] Tienes acceso al router para asignar IP fija (o que el tecnico de red lo haga)

---

## FASE 1: Preparacion de la PC servidor (30 min)

### 1.1 Configurar Windows

**Habilitar virtualizacion en BIOS** (si no esta activada):
1. Reiniciar la PC y entrar al BIOS (F2 o DEL al arrancar)
2. Buscar "Intel VT-x" o "AMD-V" o "Virtualization"
3. Habilitarlo
4. Guardar y salir

**Habilitar WSL 2** (Windows Subsystem for Linux, lo necesita Docker):

Abrir PowerShell como Administrador y ejecutar:

```powershell
wsl --install
```

Reiniciar la PC.

Despues del reinicio, abrir PowerShell de nuevo y verificar:

```powershell
wsl --status
```

Debe decir que la version por defecto es 2. Si no:

```powershell
wsl --set-default-version 2
```

### 1.2 Asignar IP fija

Coordinar con el tecnico de red de Axones para que asigne una IP fija a la PC servidor. Por ejemplo:

```
IP: 192.168.1.100
Mascara: 255.255.255.0
Gateway: 192.168.1.1
DNS: 8.8.8.8
```

**Apuntate la IP que asignen** porque la vas a necesitar mas tarde.

### 1.3 Crear carpeta de trabajo

Abrir el Explorador de Windows y crear:

```
C:\axones-server\
```

Aqui va a estar todo lo relacionado al servidor.

---

## FASE 2: Instalar Docker Desktop (15 min)

### 2.1 Descargar Docker Desktop

1. Ir a: https://www.docker.com/products/docker-desktop/
2. Click en "Download for Windows"
3. Ejecutar el instalador descargado
4. Aceptar las opciones por defecto
5. Reiniciar la PC cuando lo pida

### 2.2 Configurar Docker Desktop

1. Abrir Docker Desktop
2. Aceptar terminos de servicio
3. Saltarse el login (no es necesario crear cuenta)
4. Esperar a que diga "Docker Desktop is running" (icono verde abajo a la derecha)

### 2.3 Verificar que funciona

Abrir PowerShell o CMD y ejecutar:

```bash
docker --version
docker compose version
```

Ambos deben mostrar un numero de version. Si funcionan, listo.

### 2.4 Aumentar recursos asignados a Docker

1. Abrir Docker Desktop
2. Click en el icono de engranaje (Settings)
3. Ir a "Resources"
4. Ajustar:
   - **CPUs**: al menos 4
   - **Memory**: al menos 8 GB
   - **Disk image size**: al menos 100 GB
5. Click en "Apply & Restart"

---

## FASE 3: Instalar Git y descargar Supabase (15 min)

### 3.1 Instalar Git

1. Ir a: https://git-scm.com/download/win
2. Descargar e instalar
3. Aceptar todas las opciones por defecto

### 3.2 Descargar el codigo de Supabase

Abrir PowerShell o CMD en `C:\axones-server\`:

```bash
cd C:\axones-server
git clone --depth 1 https://github.com/supabase/supabase
cd supabase\docker
```

### 3.3 Copiar archivo de configuracion

Estando en `C:\axones-server\supabase\docker`:

```bash
copy .env.example .env
```

---

## FASE 4: Configurar Supabase local (30 min)

### 4.1 Generar contrasenas seguras

Necesitamos generar varias contrasenas. Usar este sitio o un generador local:
https://supabase.com/docs/guides/self-hosting/docker#generate-api-keys

O ejecutar en PowerShell para generar una contrasena aleatoria:

```powershell
-join ((65..90) + (97..122) + (48..57) | Get-Random -Count 32 | % {[char]$_})
```

Generar 4 contrasenas distintas y apuntarlas en un lugar seguro:
- POSTGRES_PASSWORD
- JWT_SECRET (debe tener exactamente 40 caracteres)
- ANON_KEY (se genera con JWT_SECRET)
- SERVICE_ROLE_KEY (se genera con JWT_SECRET)

**Para generar las API keys (ANON_KEY y SERVICE_ROLE_KEY)** desde el JWT_SECRET, ir a:
https://supabase.com/docs/guides/self-hosting/docker#api-keys

Pegar el JWT_SECRET y descargar las dos keys generadas.

### 4.2 Editar el archivo .env

Abrir `C:\axones-server\supabase\docker\.env` con un editor de texto (Notepad++, VSCode, o el Bloc de Notas).

Modificar estas lineas (las demas se quedan como estan):

```
POSTGRES_PASSWORD=<la contrasena que generaste>
JWT_SECRET=<el JWT secret que generaste>
ANON_KEY=<la anon key generada>
SERVICE_ROLE_KEY=<la service role key generada>

DASHBOARD_USERNAME=admin
DASHBOARD_PASSWORD=<otra contrasena para el panel de admin>

API_EXTERNAL_URL=http://192.168.1.100:8000
SUPABASE_PUBLIC_URL=http://192.168.1.100:8000
```

**IMPORTANTE:** reemplaza `192.168.1.100` con la IP fija que te asigno el tecnico de red.

Guardar el archivo.

### 4.3 Iniciar Supabase

En la misma carpeta `C:\axones-server\supabase\docker`:

```bash
docker compose pull
docker compose up -d
```

La primera vez tarda entre 5 y 15 minutos descargando todas las imagenes. Espera con paciencia.

### 4.4 Verificar que esta corriendo

```bash
docker compose ps
```

Debes ver una lista de servicios todos con estado "running" o "healthy". Los principales son:
- `supabase-db` (PostgreSQL)
- `supabase-kong` (API Gateway)
- `supabase-auth` (Autenticacion)
- `supabase-rest` (API REST)
- `supabase-realtime` (Realtime)
- `supabase-studio` (Panel de admin)

### 4.5 Probar el panel de admin

Abrir en el navegador (en la misma PC):
```
http://localhost:8000
```

Debe pedir usuario y contrasena: usar `DASHBOARD_USERNAME` y `DASHBOARD_PASSWORD` del .env.

Si entras, ves el panel de Supabase Studio. Esta es la misma interfaz que usas en supabase.com pero corriendo localmente.

---

## FASE 5: Migrar datos del Supabase actual al local (1-2 horas)

### 5.1 Exportar el schema de la base actual

1. Entrar al panel del Supabase actual: https://supabase.com/dashboard/project/lzjuzfbzgyjazhzhfhzv
2. Ir a Database → Backups
3. Click en "Download backup" (descarga un archivo .sql)

Si no tienes opcion de backup en el plan gratis, usa pg_dump desde tu PC:

Instalar PostgreSQL client en tu PC (no en el servidor): https://www.postgresql.org/download/

Luego ejecutar:

```bash
pg_dump "postgresql://postgres:[CONTRASENA]@db.lzjuzfbzgyjazhzhfhzv.supabase.co:5432/postgres" > axones-backup.sql
```

(la contrasena la sacas del panel de Supabase: Project Settings → Database → Connection string)

### 5.2 Limpiar el dump

El archivo `.sql` exportado puede tener cosas especificas de Supabase Cloud que no necesitas. Abre el archivo con un editor de texto y elimina:

- Las lineas que empiezan con `CREATE EXTENSION` que ya existan en el local
- Las referencias a roles de Supabase Cloud (ej: `supabase_admin`, `supabase_auth_admin`)
- Cualquier `CREATE SCHEMA` que ya exista

**Tip:** Si no estas seguro, deja el archivo como esta y veras que errores tira al importar. Los puedes ignorar o limpiar despues.

### 5.3 Importar al servidor local

Copiar el archivo `axones-backup.sql` a `C:\axones-server\`.

Conectar al PostgreSQL del servidor local:

```bash
docker exec -i supabase-db psql -U postgres -d postgres < C:\axones-server\axones-backup.sql
```

(Si falla por algun error, lee el mensaje. La mayoria son recuperables: roles que ya existen, etc.)

### 5.4 Verificar que los datos estan

Abrir el panel del servidor local: `http://localhost:8000`

Ir a Table Editor y revisar que las tablas tienen datos:
- `usuarios` debe tener 22 registros
- `materiales` debe tener 158 registros
- `tintas` debe tener 58 registros
- etc.

---

## FASE 6: Actualizar el sistema para que apunte al servidor local (15 min)

### 6.1 Modificar config.js

Editar el archivo `public/src/js/utils/supabase-client.js` del proyecto Axones.

Buscar:
```javascript
const SUPABASE_CONFIG = {
    url: 'https://lzjuzfbzgyjazhzhfhzv.supabase.co',
    anonKey: 'eyJhbGciOiJIUzI1NiIsIn...'
};
```

Cambiar a:
```javascript
const SUPABASE_CONFIG = {
    url: 'http://192.168.1.100:8000',  // IP del servidor local
    anonKey: '<la ANON_KEY que generaste en el paso 4.1>'
};
```

### 6.2 Commit y deploy

```bash
git add public/src/js/utils/supabase-client.js
git commit -m "fix: apuntar a servidor local en Maracay"
git push
```

GitHub Pages se actualiza solo en unos minutos.

### 6.3 Probar desde una tablet en la planta

1. Abrir el sistema en una tablet conectada a la red de la planta
2. Hacer login con cualquier usuario
3. Verificar que ves los datos (las OTs, el inventario, etc.)
4. Crear una OT de prueba
5. Ver que se guarda (revisar en el panel del servidor local)

Si todo funciona, **el sistema ya esta operando contra el servidor local**.

---

## FASE 7: Configurar respaldos automaticos (30 min)

### 7.1 Crear script de backup

Crear archivo `C:\axones-server\backup.bat`:

```batch
@echo off
set FECHA=%date:~6,4%-%date:~3,2%-%date:~0,2%
set BACKUP_DIR=E:\axones-backups
if not exist "%BACKUP_DIR%" mkdir "%BACKUP_DIR%"

echo Iniciando backup %FECHA%...
docker exec supabase-db pg_dump -U postgres postgres > "%BACKUP_DIR%\axones-%FECHA%.sql"

echo Backup completado en %BACKUP_DIR%\axones-%FECHA%.sql

REM Mantener solo los ultimos 30 backups
forfiles /p "%BACKUP_DIR%" /m *.sql /d -30 /c "cmd /c del @path" 2>nul

echo Listo.
```

**IMPORTANTE:** Cambia `E:\axones-backups` por la letra correcta del disco externo.

### 7.2 Programar tarea diaria

1. Abrir "Programador de tareas" de Windows
2. Click en "Crear tarea basica"
3. Nombre: "Backup Axones"
4. Cuando: "Diariamente"
5. Hora: 02:00 AM (cuando no hay nadie usando el sistema)
6. Accion: "Iniciar un programa"
7. Programa: `C:\axones-server\backup.bat`
8. Finalizar

### 7.3 Probar el backup manualmente

Doble click en `backup.bat` y verificar que:
- Crea el archivo en el disco externo
- El archivo tiene mas de 1 MB

---

## FASE 8: Verificacion final y entrega (1 hora)

### 8.1 Checklist de verificacion

- [ ] El sistema funciona desde una tablet en la planta
- [ ] Se puede hacer login con un usuario real
- [ ] Se ven todas las OTs existentes
- [ ] Se ve el inventario completo
- [ ] Se puede crear una OT nueva
- [ ] Se puede registrar produccion
- [ ] El backup nocturno esta programado
- [ ] El UPS esta conectado y funcionando
- [ ] El disco externo esta conectado y tiene espacio

### 8.2 Documento para Axones

Entregar un documento con:
- IP del servidor local
- Usuario y contrasena del panel admin
- Como hacer un backup manual (doble click en backup.bat)
- Como reiniciar Docker si hay problemas
- Numero de contacto de soporte (tu)

### 8.3 Capacitacion al encargado

Sentarse 30 minutos con el encargado de sistemas de Axones y mostrarle:
- Como verificar que el servidor esta corriendo (Docker Desktop)
- Como hacer un backup manual
- Como saber si el backup nocturno se hizo bien
- Como contactarte si hay problemas

---

## Comandos utiles para mantenimiento

### Ver el estado de los servicios

```bash
cd C:\axones-server\supabase\docker
docker compose ps
```

### Ver los logs si algo falla

```bash
docker compose logs -f
```

### Reiniciar todo

```bash
docker compose restart
```

### Detener el servidor

```bash
docker compose down
```

### Iniciar el servidor (despues de un reinicio de la PC)

```bash
cd C:\axones-server\supabase\docker
docker compose up -d
```

### Hacer un backup manual

```bash
docker exec supabase-db pg_dump -U postgres postgres > backup-manual.sql
```

### Restaurar desde un backup

```bash
docker exec -i supabase-db psql -U postgres -d postgres < backup.sql
```

---

## Problemas comunes y soluciones

### "Docker Desktop is starting" se queda colgado

- Reiniciar Docker Desktop
- Si persiste, reiniciar la PC
- Verificar que la virtualizacion esta activada en BIOS
- Verificar que WSL 2 esta instalado: `wsl --status`

### Las tablets no pueden conectarse al servidor

- Verificar que la PC servidor tiene la IP fija asignada
- Verificar que el firewall de Windows permite el puerto 8000:
  ```powershell
  New-NetFirewallRule -DisplayName "Axones Server" -Direction Inbound -Protocol TCP -LocalPort 8000 -Action Allow
  ```
- Probar desde otra PC en la misma red: abrir `http://192.168.1.100:8000`

### El sistema dice "Network Error"

- Verificar que la URL en `supabase-client.js` es correcta
- Verificar que la PC servidor esta encendida
- Verificar que Docker Desktop esta corriendo
- Verificar que los servicios estan up: `docker compose ps`

### Se llena el disco

- Mover backups viejos del disco externo a otro lado
- Limpiar imagenes Docker no usadas: `docker system prune -a`

### Olvidaste la contrasena del panel admin

- Editar el archivo `.env` con la contrasena nueva
- Reiniciar: `docker compose restart`

---

## Mantenimiento mensual recomendado

1. **Verificar backups**: revisar que el disco externo tiene los ultimos 30 backups
2. **Actualizar Supabase**: cada 2-3 meses revisar nuevas versiones
   ```bash
   git pull
   docker compose pull
   docker compose up -d
   ```
3. **Limpiar logs viejos**: Docker acumula logs, limpiar cada cierto tiempo
4. **Verificar UPS**: que la bateria sigue dando autonomia

---

## Plan B: Si todo falla

Si por alguna razon el servidor local deja de funcionar y necesitan que el sistema vuelva a operar inmediatamente:

1. Editar `public/src/js/utils/supabase-client.js`
2. Cambiar la URL de vuelta a la del Supabase en la nube
3. Commit y push
4. El sistema vuelve a funcionar contra la nube en 5 minutos

Mientras tanto, debugear el problema del servidor local con calma.

---

## Recursos

- **Documentacion Supabase Self-Hosting**: https://supabase.com/docs/guides/self-hosting/docker
- **Docker Desktop**: https://docs.docker.com/desktop/
- **PostgreSQL**: https://www.postgresql.org/docs/
- **Comunidad Supabase**: https://github.com/supabase/supabase/discussions

---

**Fecha de creacion:** 2026-04-08
**Version:** 1.0
