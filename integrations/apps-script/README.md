# Conexión segura del formulario con Google Sheets

El formulario envía JSON directamente a la Web App de Apps Script indicada en `js/modules/formulario-contacto.js`. El flujo es:

`Formulario -> Google Apps Script -> Google Sheets`

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
4. Selecciona `authorizeAccess` en el editor y ejecútala una vez. Revisa que el nombre de la pestaña sea el esperado y concede los permisos de Google solicitados.
5. Ve a **Implementar > Nueva implementación > Aplicación web**. Configura **Ejecutar como: Yo** y **Quién tiene acceso: Cualquier persona** para que el navegador pueda enviar solicitudes anónimas.
6. Implementa y confirma que la URL `/exec` sea `https://script.google.com/macros/s/AKfycbwkR-fFkwcZds7l57ULehPYBFy8zytL9g93qobb85DH98mqUsTBPmWdxCq9rogkoOzR6g/exec`. Si esta URL ya corresponde a una implementación anterior, actualiza esa implementación con una versión nueva de `Code.gs` para conservar la URL.

No ejecutes `doPost` desde el botón Ejecutar: esa función necesita un evento de solicitud que solo existe al recibir un POST.

## 3. Probar antes de usar

1. Envía una solicitud con datos ficticios desde la landing desplegada.
2. Confirma la redirección a `gracias.html` y que se agregó una fila en la pestaña correcta.
3. Comprueba las columnas J-L: consentimiento, origen y fecha.
4. Comprueba que una solicitud sin consentimiento, con correo inválido o con el honeypot lleno no agregue fila.
5. Si no aparece la fila, revisa el historial de ejecuciones de Apps Script y las autorizaciones de la hoja.

El HTML conserva Netlify Forms como alternativa si JavaScript no carga; esa ruta guarda el envío en Netlify, no en Sheets. La escritura directa a Sheets requiere JavaScript y la Web App publicada.

## Límites de seguridad

La Web App queda invocable públicamente y no lleva CAPTCHA ni token secreto: esta es una consecuencia de enviar directamente desde el navegador. El honeypot y las validaciones del script ayudan, pero no impiden llamadas automatizadas. Mantén la hoja privada y revisa cuotas e historial de Apps Script. `mode: "no-cors"` hace que el navegador no pueda leer la respuesta de Google; la página puede mostrar que intentó enviar, pero no confirmar que la fila quedó guardada.

El envío automático del PDF requiere agregar posteriormente un paso de correo condicionado a `Ayuda = Quiero recibir la ficha informativa en PDF por correo` y disponer del archivo PDF.
