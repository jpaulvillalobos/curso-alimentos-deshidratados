export function initSolicitudForm() {
  const form = document.querySelector('#solicitud-informacion-curso');
  const status = document.querySelector('#form-submit-status');
  const submitButton = form?.querySelector('[type="submit"]');
  const tokenInput = form?.elements.namedItem('turnstileToken');
  const widget = document.querySelector('#turnstile-widget');

  if (!form || !status || !submitButton || !tokenInput || !widget) return;

  const siteKey = form.dataset.turnstileSitekey;
  const hasSiteKey = siteKey && !siteKey.startsWith('REEMPLAZAR_');
  let turnstileWidgetId;

  if (hasSiteKey) {
    const placeholder = widget.querySelector('.turnstile-unconfigured');
    placeholder?.remove();

    const renderWidget = () => {
      if (!window.turnstile) {
        status.textContent = 'No se pudo cargar la verificación anti-spam. Recarga la página e inténtalo de nuevo.';
        status.classList.add('is-error');
        return;
      }

      turnstileWidgetId = window.turnstile.render(widget, {
        sitekey: siteKey,
        action: 'lead_form',
        callback: (token) => {
          tokenInput.value = token;
          status.textContent = '';
          status.classList.remove('is-error');
        },
        'expired-callback': () => {
          tokenInput.value = '';
        },
        'error-callback': () => {
          tokenInput.value = '';
          status.textContent = 'La verificación expiró o falló. Vuelve a intentarlo.';
          status.classList.add('is-error');
        }
      });
    };

    if (window.turnstile) {
      renderWidget();
    } else {
      const script = document.createElement('script');
      script.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';
      script.async = true;
      script.defer = true;
      script.onload = renderWidget;
      script.onerror = () => {
        status.textContent = 'No se pudo cargar la verificación anti-spam. Recarga la página e inténtalo de nuevo.';
        status.classList.add('is-error');
      };
      document.head.append(script);
    }
  }

  form.addEventListener('submit', async (event) => {
    event.preventDefault();

    if (!form.reportValidity()) return;

    if (!hasSiteKey || !tokenInput.value) {
      status.textContent = 'Completa la verificación anti-spam antes de enviar.';
      status.classList.add('is-error');
      return;
    }

    submitButton.disabled = true;
    form.setAttribute('aria-busy', 'true');
    status.textContent = 'Enviando tu solicitud…';
    status.classList.remove('is-error');

    try {
      const response = await fetch('/.netlify/functions/solicitud-informacion', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(Object.fromEntries(new FormData(form).entries()))
      });
      const result = await response.json();

      if (!response.ok || result.success !== true) {
        throw new Error('No se pudo registrar la solicitud.');
      }

      document.dispatchEvent(new CustomEvent('lobolink:lead_submitted'));
      window.location.assign('/gracias.html');
    } catch {
      status.textContent = 'No pudimos registrar tu solicitud. Intenta de nuevo o contáctanos por WhatsApp.';
      status.classList.add('is-error');
      tokenInput.value = '';
      if (window.turnstile && turnstileWidgetId !== undefined) {
        window.turnstile.reset(turnstileWidgetId);
      }
      submitButton.disabled = false;
      form.removeAttribute('aria-busy');
    }
  });
}