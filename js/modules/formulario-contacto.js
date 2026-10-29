const GOOGLE_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbwkR-fFkwcZds7l57ULehPYBFy8zytL9g93qobb85DH98mqUsTBPmWdxCq9rogkoOzR6g/exec';

export function initSolicitudForm() {
  const form = document.querySelector('#solicitud-informacion-curso');
  const status = document.querySelector('#form-submit-status');
  const submitButton = form?.querySelector('[type="submit"]');

  if (!form || !status || !submitButton) return;

  form.addEventListener('submit', async (event) => {
    event.preventDefault();

    if (!form.reportValidity()) return;

    submitButton.disabled = true;
    form.setAttribute('aria-busy', 'true');
    status.textContent = 'Enviando tu solicitud…';
    status.classList.remove('is-error');

    try {
      const fields = new FormData(form);
      const correo = String(fields.get('Correo') || '').trim();
      const necesidad = String(fields.get('Necesidad') || '').trim();
      const data = {
        nombre: String(fields.get('Nombre') || '').trim(),
        apellidos: String(fields.get('Apellidos') || '').trim(),
        correo,
        email: correo,
        pais: String(fields.get('Pais') || '').trim(),
        telefono: String(fields.get('Telefono') || '').trim(),
        empresa: String(fields.get('Empresa') || '').trim(),
        ayuda: String(fields.get('Ayuda') || '').trim(),
        etapa: String(fields.get('Etapa') || '').trim(),
        necesidad,
        mensaje: necesidad,
        consentimiento: String(fields.get('Consentimiento') || '').trim(),
        origen: String(fields.get('origen') || '').trim(),
        'bot-field': String(fields.get('bot-field') || '').trim()
      };

      await fetch(GOOGLE_SCRIPT_URL, {
        method: 'POST',
        mode: 'no-cors',
        body: JSON.stringify(data)
      });

      form.reset();
      status.textContent = 'Solicitud enviada. Google no permite confirmar el registro desde esta página; si no recibes contacto, escríbenos por WhatsApp para verificarlo.';
      submitButton.disabled = false;
      form.removeAttribute('aria-busy');
    } catch {
      status.textContent = 'No pudimos registrar tu solicitud. Intenta de nuevo o contáctanos por WhatsApp.';
      status.classList.add('is-error');
      submitButton.disabled = false;
      form.removeAttribute('aria-busy');
    }
  });
}