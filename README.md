# Sistema Axones - Control de Produccion

Sistema Integral de Gestion y Control de Produccion para Inversiones Axones 2008, C.A.

## Descripcion

Plataforma web para control de produccion en planta de impresion flexografica y conversion de empaques plasticos. Incluye:

- **Control de Impresion**: Registro de produccion en impresoras COMEXI (1, 2, 3)
- **Control de Corte**: Registro de produccion en cortadoras (China, Permaco, Novograf)
- **Consumo de Tintas**: Seguimiento de consumo de tintas y solventes por OT
- **Inventario de Sustratos**: Gestion de materiales (BOPP, CAST, PEBD, etc.)
- **Sistema de Alertas**: Alertas automaticas por refil alto (>5-6%) y tiempo muerto
- **Reportes**: Exportacion de datos a CSV/Excel
- **Chatbot Financiero**: Consultas de cuentas por cobrar con IA (Groq)

## Stack Tecnologico

| Componente | Tecnologia |
|------------|------------|
| Frontend | HTML5, CSS3, JavaScript, Bootstrap 5 |
| Backend | Google Apps Script |
| Base de Datos | Google Sheets / localStorage |
| PWA | Service Worker, manifest.json |
| Hosting | GitHub + Vercel |
| BI | Power BI |
| Chatbot IA | Groq (Llama 3.3) |

## Estructura del Proyecto

```
Proyecto_Axones/
├── public/                     # Archivos publicos (HTML)
│   ├── index.html             # Dashboard principal
│   ├── impresion.html         # Control de impresion
│   ├── corte.html             # Control de corte
│   ├── tintas.html            # Consumo de tintas
│   ├── inventario.html        # Inventario de sustratos
│   ├── alertas.html           # Centro de alertas
│   ├── reportes.html          # Reportes y exportacion
│   ├── chatbot.html           # Chatbot financiero
│   ├── admin.html             # Panel de administracion
│   ├── offline.html           # Pagina offline (PWA)
│   ├── manifest.json          # Manifest PWA
│   ├── sw.js                  # Service Worker
│   └── icons/                 # Iconos de la app
├── src/
│   ├── css/
│   │   └── main.css           # Estilos principales
│   └── js/
│       ├── modules/           # Modulos por funcionalidad
│       │   ├── home.js        # Dashboard
│       │   ├── impresion.js   # Control de impresion
│       │   ├── corte.js       # Control de corte
│       │   ├── tintas.js      # Consumo de tintas
│       │   ├── inventario.js  # Inventario
│       │   ├── alertas.js     # Sistema de alertas
│       │   ├── reportes.js    # Reportes
│       │   ├── chatbot.js     # Chatbot IA
│       │   └── admin.js       # Administracion
│       ├── utils/
│       │   ├── config.js      # Configuracion global
│       │   ├── auth.js        # Autenticacion
│       │   └── demoData.js    # Generador de datos demo
│       └── main.js            # Inicializacion general
└── google-apps-script/
    └── Code.gs                # Backend Google Apps Script
```

## Instalacion Rapida (Desarrollo)

### Requisitos
- Navegador web moderno (Chrome, Firefox, Edge, Safari)
- Servidor local (Live Server, Python, Node.js)

### Pasos

1. Clonar el repositorio:
```bash
git clone https://github.com/ovavisionve/Proyecto_Axones.git
cd Proyecto_Axones
```

2. Servir los archivos. Opciones:

   **VS Code Live Server:**
   - Instalar extension "Live Server"
   - Click derecho en `public/index.html` > "Open with Live Server"

   **Python:**
   ```bash
   cd public
   python -m http.server 8080
   ```

   **Node.js:**
   ```bash
   npx serve public
   ```

3. Abrir `http://localhost:8080` en el navegador

4. El sistema funciona en modo desarrollo usando localStorage.

## Generar Datos de Prueba

1. Ir a **Admin** (icono de engranaje)
2. Hacer clic en **Generar Datos Demo**
3. Se generan datos realistas de 30 dias

## Configuracion de Produccion

### 1. Crear Google Spreadsheet

1. Ir a [Google Sheets](https://sheets.google.com)
2. Crear nuevo Spreadsheet
3. Copiar el ID de la URL: `/d/[ESTE-ES-EL-ID]/edit`

### 2. Configurar Google Apps Script

1. En el Spreadsheet: **Extensiones > Apps Script**
2. Copiar el contenido de `google-apps-script/Code.gs`
3. Guardar y **Implementar > Nueva implementacion**
4. Tipo: **Aplicacion web**
5. Acceso: **Cualquier persona**
6. Copiar la URL de implementacion

### 3. Conectar el Sistema

1. Abrir `public/admin.html`
2. Pegar URL de Apps Script y ID del Spreadsheet
3. Hacer clic en "Guardar"
4. Probar conexion

## Modulos Principales

### Control de Impresion
- Formulario digital basado en hojas fisicas
- Registro de material de entrada (hasta 26 bobinas)
- Registro de salida (hasta 22 bobinas)
- Calculo automatico de merma y refil
- Alertas automaticas si refil > 5%

### Control de Corte
- Similar a impresion para cortadoras
- Registro de bobinas madres de entrada
- Resumen de turno con bobinas de salida

### Inventario de Sustratos
- Stock por material (BOPP, CAST, PEBD, METAL, etc.)
- Filtros por micras, ancho, cliente
- Alertas de stock bajo

### Sistema de Alertas
- Generacion automatica por:
  - Refil > 5% (amarillo) o > 6% (rojo)
  - Tiempo muerto > 20%
  - Stock bajo
- Estados: Pendiente, Resuelta
- Filtros y paginacion

### Reportes
- Filtros por fecha y maquina
- Tipos: Produccion, Refil, Inventario, Tintas
- Exportacion CSV/Excel

## Umbrales de Refil

Configurables en **Admin > Umbrales de Refil**:
- **Advertencia**: 5% (genera alerta amarilla)
- **Critico**: 6% (genera alerta roja)

## PWA (Uso Offline en Tablets)

El sistema funciona como Progressive Web App:

1. Abrir en Chrome/Edge
2. Clic en icono de instalacion
3. La app funciona offline con datos en cache
4. Sincroniza automaticamente al reconectar

## Chatbot Financiero (Opcional)

Para habilitar consultas con IA:

1. Obtener API Key en [Groq Console](https://console.groq.com)
2. En Admin, pegar la API Key
3. El chatbot responde sobre:
   - Saldos de clientes
   - Facturas pendientes/vencidas
   - Produccion por cliente

## Backup y Restauracion

**Exportar:**
1. Admin > Exportar Backup
2. Descarga JSON con todos los datos

**Importar:**
1. Admin > Importar Backup
2. Seleccionar archivo JSON

## Personalizacion

### Agregar Maquinas

En `src/js/utils/config.js`:
```javascript
CONFIG.MAQUINAS.IMPRESORAS = [
    { id: 'comexi_1', nombre: 'COMEXI 1', tipo: 'flexo' },
    // Agregar nuevas aqui
];
```

### Modificar Materiales

En `src/js/utils/config.js`:
```javascript
CONFIG.MATERIALES = ['BOPP', 'CAST', 'PEBD', ...];
```

## Roles de Usuario

| Rol | Permisos |
|-----|----------|
| Operador | Registrar produccion propia |
| Supervisor | Ver todos los datos, gestionar alertas |
| Jefe Operaciones | Reportes y analisis |
| Administrador | Configuracion completa |

## Seguridad

- Autenticacion OAuth 2.0 (con Google Sheets)
- Datos locales en localStorage (desarrollo)
- HTTPS obligatorio en produccion

## Soporte

Para reportar problemas o sugerencias, contactar al equipo de desarrollo.

---

**Version**: 1.0.0
**Empresa**: Inversiones Axones 2008, C.A.
**Ano**: 2026
