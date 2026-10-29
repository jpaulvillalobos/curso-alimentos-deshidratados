# Conexión segura del formulario con Google Sheets

El navegador no llama directamente a Apps Script. Cloudflare Turnstile valida a la persona en el navegador y Netlify vuelve a verificar el token en el servidor antes de reenviar los datos. El flujo es:

`Formulario + Turnstile -> Netlify Function + verificación Turnstile -> Apps Script -> Google Sheets`

La Function de Netlify mantiene el token fuera del código público. Apps Script valida ese token antes de escribir.

## 1. Preparar la hoja

La pestaña indicada por `gid=0` debe tener estos encabezados exactos en la fila 1:

| Columna | Encabezado |
| --- | --- |
| A | Nombre |
| B | Apellidos |
| C | Correo |
| D | Pais |
| E | Telefono |
| F | Empresa |
| G | Ayuda |
| H | Etapa |
| I | Necesidad |
| J | Consentimiento |
| K | Origen |
| L | Fecha |

Conserva la hoja privada. No actives "Cualquier persona con el enlace".

## 2. Crear el proyecto Apps Script

1. Abre la hoja y entra en **Extensiones > Apps Script**.
2. Reemplaza el contenido del editor con [`Code.gs`](Code.gs) y guarda.
3. En **Configuración del proyecto > Propiedades del script**, agrega:
   - `SPREADSHEET_ID`: el ID que aparece entre `/d/` y `/edit` en la URL de la hoja.
   - `SHEET_GID`: `0`, correspondiente a `gid=0`.
   - `API_TOKEN`: un valor aleatorio largo (mínimo 32 caracteres), generado en un gestor de contraseñas.
4. Selecciona `authorizeAccess` en el editor y ejecútala una vez. Revisa que el nombre de la pestaña sea el esperado y concede los permisos de Google solicitados.
5. Ve a **Implementar > Nueva implementación > Aplicación web**. Configura **Ejecutar como: Yo** y **Quién tiene acceso: Cualquier persona**. La aplicación necesita ser invocable por la Function de Netlify; el token de servidor es el control que autoriza la escritura.
6. Implementa y copia la URL terminada en `/exec`.

No ejecutes `doPost` desde el botón Ejecutar: esa función necesita un evento de solicitud que solo existe al recibir un POST.

## 3. Crear la verificación anti-spam

1. En Cloudflare Turnstile crea un widget para el hostname público exacto de la landing, por ejemplo `tu-sitio.netlify.app` (sin `https://` ni rutas).
2. Copia la **Site Key** pública en el atributo `data-turnstile-sitekey` del formulario en `index.html`, reemplazando `REEMPLAZAR_CON_SITE_KEY_PUBLICA`.
3. Conserva la **Secret Key** solo como variable de entorno de Netlify; nunca la pegues en HTML, JavaScript o este repositorio.

El formulario no se enviará si Turnstile no está configurado. La Function valida el token con Cloudflare y comprueba el hostname y la acción `lead_form`.

## 4. Configurar Netlify

En la configuración del sitio, agrega estas variables de entorno con alcance **Functions**:

| Variable | Valor |
| --- | --- |
| `APPS_SCRIPT_URL` | URL `/exec` de la Web App desplegada |
| `APPS_SCRIPT_TOKEN` | El mismo valor de `API_TOKEN` en Apps Script |
| `SITE_ORIGIN` | Origen público de la landing, por ejemplo `https://tu-sitio.netlify.app` (sin ruta ni barra final) |
| `TURNSTILE_SECRET_KEY` | Secret Key privada de Turnstile |

No pongas `APPS_SCRIPT_TOKEN` en `index.html`, `js/` ni en variables `VITE_`/`PUBLIC_`. No lo compartas por chat. Guarda los cambios y vuelve a desplegar el sitio para que Netlify publique la Function.

La URL de función utilizada por el formulario es `/.netlify/functions/solicitud-informacion`. La verificación de `Origin` acepta solo el origen configurado; los deploy previews necesitarán su propio `SITE_ORIGIN` y un hostname permitido en Turnstile si se van a probar.

## 5. Probar antes de usar

1. Envía una solicitud con datos ficticios desde la landing desplegada.
2. Confirma la redirección a `gracias.html` y que se agregó una fila en la pestaña correcta.
3. Comprueba las columnas J-L: consentimiento, origen y fecha.
4. Comprueba que una solicitud sin consentimiento, con correo inválido, sin token de Turnstile o sin token API no agregue fila.
5. Revisa los registros de Netlify Function si una prueba falla; no registres allí datos personales ni el token.

El HTML conserva Netlify Forms como alternativa si JavaScript no carga; esa ruta guarda el envío en Netlify, no en Sheets. La automatización a Google Sheets requiere JavaScript, Turnstile y la Function configurada.

## Límites de seguridad

La Web App de Apps Script queda invocable públicamente para aceptar solicitudes anónimas. Mantén acceso restringido a la hoja, usa tokens aleatorios largos, rota ambos secretos si se exponen y revisa el uso/cuotas de Apps Script. Turnstile y la comprobación de `Origin` reducen spam, pero ningún endpoint público elimina por completo abuso o ataques de denegación de servicio.

El envío automático del PDF requiere agregar posteriormente un paso de correo condicionado a `Ayuda = Quiero recibir la ficha informativa en PDF por correo` y disponer del archivo PDF.
