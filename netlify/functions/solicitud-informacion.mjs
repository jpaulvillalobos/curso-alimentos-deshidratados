const allowedReasons = new Set([
  'Quiero más información sobre el curso',
  'Tengo dudas y necesito ayuda con la inscripción',
  'Quiero recibir la ficha informativa en PDF por correo',
  'Busco capacitación para mi empresa o equipo',
  'Otra consulta'
]);

const allowedStages = new Set([
  '',
  'Estoy investigando opciones',
  'Quiero iniciar un emprendimiento',
  'Ya tengo un negocio en marcha',
  'Represento a una empresa o institución'
]);

function jsonResponse(status, body) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-store'
    }
  });
}

function readText(value, maxLength) {
  return typeof value === 'string' ? value.trim().slice(0, maxLength) : '';
}

export default async function handler(request) {
  if (request.method !== 'POST') {
    return jsonResponse(405, { success: false });
  }

  const scriptUrl = process.env.APPS_SCRIPT_URL;
  const apiToken = process.env.APPS_SCRIPT_TOKEN;
  const siteOrigin = process.env.SITE_ORIGIN;
  const turnstileSecret = process.env.TURNSTILE_SECRET_KEY;

  if (!scriptUrl || !apiToken || !siteOrigin || !turnstileSecret) {
    return jsonResponse(503, { success: false, error: 'service_not_configured' });
  }

  let expectedOrigin;
  let parsedScriptUrl;

  try {
    expectedOrigin = new URL(siteOrigin).origin;
    parsedScriptUrl = new URL(scriptUrl);
  } catch {
    return jsonResponse(503, { success: false, error: 'service_not_configured' });
  }

  if (
    parsedScriptUrl.protocol !== 'https:' ||
    parsedScriptUrl.hostname !== 'script.google.com' ||
    !parsedScriptUrl.pathname.startsWith('/macros/s/') ||
    !parsedScriptUrl.pathname.endsWith('/exec')
  ) {
    return jsonResponse(503, { success: false, error: 'service_not_configured' });
  }

  if (request.headers.get('origin') !== expectedOrigin) {
    return jsonResponse(403, { success: false, error: 'origin_not_allowed' });
  }

  const contentLength = Number(request.headers.get('content-length') || 0);
  if (contentLength > 12000) {
    return jsonResponse(413, { success: false, error: 'request_too_large' });
  }

  let submitted;
  try {
    submitted = await request.json();
  } catch {
    return jsonResponse(400, { success: false, error: 'invalid_request' });
  }

  if (JSON.stringify(submitted).length > 12000) {
    return jsonResponse(413, { success: false, error: 'request_too_large' });
  }

  if (readText(submitted['bot-field'], 200)) {
    return jsonResponse(400, { success: false, error: 'invalid_request' });
  }

  const lead = {
    Nombre: readText(submitted.Nombre, 80),
    Apellidos: readText(submitted.Apellidos, 100),
    Correo: readText(submitted.Correo, 254).toLowerCase(),
    Pais: readText(submitted.Pais, 80),
    Telefono: readText(submitted.Telefono, 25),
    Empresa: readText(submitted.Empresa, 120),
    Ayuda: readText(submitted.Ayuda, 120),
    Etapa: readText(submitted.Etapa, 100),
    Necesidad: readText(submitted.Necesidad, 700),
    Consentimiento: readText(submitted.Consentimiento, 30),
    Origen: readText(submitted.origen, 100)
  };
  const turnstileToken = readText(submitted.turnstileToken, 2048);

  const emailIsValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(lead.Correo);
  const phoneIsValid = /^[+\d][\d\s().-]{6,23}$/.test(lead.Telefono);
  const requiredValues = [
    lead.Nombre,
    lead.Apellidos,
    lead.Pais,
    lead.Ayuda,
    lead.Necesidad
  ];

  if (
    requiredValues.some((value) => !value) ||
    !emailIsValid ||
    !phoneIsValid ||
    !turnstileToken ||
    !allowedReasons.has(lead.Ayuda) ||
    !allowedStages.has(lead.Etapa) ||
    lead.Necesidad.length < 10 ||
    lead.Consentimiento !== 'autorizado'
  ) {
    return jsonResponse(400, { success: false, error: 'invalid_fields' });
  }

  try {
    const verificationResponse = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ secret: turnstileSecret, response: turnstileToken }),
      signal: AbortSignal.timeout(10000)
    });
    const verification = await verificationResponse.json();
    const expectedHostname = new URL(siteOrigin).hostname;

    if (
      !verificationResponse.ok ||
      verification.success !== true ||
      verification.hostname !== expectedHostname ||
      verification.action !== 'lead_form'
    ) {
      return jsonResponse(403, { success: false, error: 'verification_failed' });
    }

    const upstreamResponse = await fetch(parsedScriptUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...lead, apiToken }),
      signal: AbortSignal.timeout(12000)
    });
    const upstreamBody = await upstreamResponse.text();

    let result;
    try {
      result = JSON.parse(upstreamBody);
    } catch {
      return jsonResponse(502, { success: false, error: 'upstream_invalid_response' });
    }

    if (!upstreamResponse.ok || result.success !== true) {
      return jsonResponse(502, { success: false, error: 'upstream_rejected_request' });
    }

    return jsonResponse(200, { success: true });
  } catch {
    return jsonResponse(502, { success: false, error: 'upstream_unavailable' });
  }
}
