# Sistema Axones - Control de Produccion

Sistema integral de gestion y control de produccion para manufactura de plasticos.

## Descripcion

Plataforma web que digitaliza y optimiza los procesos de produccion con:
- Control automatizado de desperdicios con alertas en tiempo real
- Analisis de datos mediante integracion con Google Sheets y Power BI
- Gestion financiera mediante chatbot inteligente

## Stack Tecnologico

| Componente | Tecnologia |
|------------|------------|
| Frontend | HTML5, CSS3, JavaScript, Bootstrap 5 |
| Backend | Google Apps Script |
| Base de Datos | Google Sheets |
| Hosting | GitHub + Vercel |
| BI | Power BI |
| Chatbot IA | Groq (Llama 3.3) |
| Autenticacion | Google OAuth 2.0 |

## Estructura del Proyecto

```
Proyecto_Axones/
├── public/                  # Archivos publicos (HTML)
│   ├── index.html          # Pagina principal
│   ├── produccion.html     # Modulo de produccion
│   ├── chatbot.html        # Chatbot financiero
│   └── ...
├── src/
│   ├── css/
│   │   └── main.css        # Estilos principales
│   ├── js/
│   │   ├── main.js         # Script principal
│   │   ├── utils/
│   │   │   ├── config.js   # Configuracion global
│   │   │   └── auth.js     # Autenticacion
│   │   └── modules/
│   │       ├── produccion.js
│   │       ├── dashboard.js
│   │       └── chatbot.js
│   └── assets/             # Imagenes e iconos
├── google-apps-script/
│   └── Code.gs             # Backend en Apps Script
├── docs/                   # Documentacion
├── package.json
├── vercel.json
└── README.md
```

## Modulos

### 1. Control de Desperdicios
- Formulario digital con validacion automatica
- Calculo de % desperdicio por material
- Alertas multinivel (warning/critical)
- Dashboard del operador

### 2. Integracion y Analisis
- Google Sheets como base de datos
- Hojas: PRODUCCION, CLIENTES, INSUMOS, ALERTAS, etc.
- Dashboards en Power BI

### 3. Chatbot Financiero
- Consultas en lenguaje natural
- Saldos de clientes
- Facturas pendientes/vencidas
- Ranking de deudores

## Roles de Usuario

| Rol | Permisos |
|-----|----------|
| Operador | Registrar datos propios, ver dashboard personal |
| Supervisor | Ver todos los datos, gestionar alertas |
| Administrador | Acceso total, configuracion, chatbot financiero |

## Instalacion

### Desarrollo Local

```bash
# Clonar repositorio
git clone https://github.com/ovavisionve/Proyecto_Axones.git
cd Proyecto_Axones

# Instalar dependencias
npm install

# Iniciar servidor de desarrollo
npm run dev
```

### Configuracion de Google Sheets

1. Crear un nuevo Google Sheets
2. Copiar el ID del documento
3. Configurar en `src/js/utils/config.js`
4. Crear las hojas requeridas (PRODUCCION, CLIENTES, etc.)

### Despliegue en Vercel

1. Conectar repositorio de GitHub a Vercel
2. Configurar variables de entorno si es necesario
3. Desplegar automaticamente

### Google Apps Script

1. Ir a [script.google.com](https://script.google.com)
2. Crear nuevo proyecto
3. Copiar el contenido de `google-apps-script/Code.gs`
4. Configurar el SPREADSHEET_ID
5. Desplegar como Web App

## Configuracion

### Variables de Entorno

```javascript
// En config.js
CONFIG.API.BASE_URL = 'URL_DEL_WEB_APP';
CONFIG.API.SHEETS_ID = 'ID_DEL_SHEETS';
```

### Umbrales de Desperdicio

Configurar en la hoja CONFIGURACION de Google Sheets:
- Material
- Umbral maximo (%)
- Umbral de advertencia (%)

## Uso

1. Acceder a la aplicacion
2. Iniciar sesion con cuenta Google autorizada
3. Navegar a los diferentes modulos segun el rol

## Seguridad

- Autenticacion OAuth 2.0
- HTTPS obligatorio
- Log de auditoria completo
- Permisos granulares por rol

## Licencia

MIT

## Contacto

Para soporte o consultas sobre el proyecto.
