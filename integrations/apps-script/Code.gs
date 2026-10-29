const EXPECTED_HEADERS = [
  'Nombre',
  'Apellidos',
  'Correo',
  'Pais',
  'Telefono',
  'Empresa',
  'Ayuda',
  'Etapa',
  'Necesidad',
  'Consentimiento',
  'Origen',
  'Fecha'
];

const ALLOWED_REASONS = [
  'Quiero más información sobre el curso',
  'Tengo dudas y necesito ayuda con la inscripción',
  'Quiero recibir la ficha informativa en PDF por correo',
  'Busco capacitación para mi empresa o equipo',
  'Otra consulta'
];

const ALLOWED_STAGES = [
  '',
  'Estoy investigando opciones',
  'Quiero iniciar un emprendimiento',
  'Ya tengo un negocio en marcha',
  'Represento a una empresa o institución'
];

function jsonResponse(payload) {
  return ContentService
    .createTextOutput(JSON.stringify(payload))
    .setMimeType(ContentService.MimeType.JSON);
}

function authorizeAccess() {
  const properties = PropertiesService.getScriptProperties();
  const spreadsheetId = properties.getProperty('SPREADSHEET_ID');
  const sheetId = Number(properties.getProperty('SHEET_GID') || '0');
  const sheet = SpreadsheetApp.openById(spreadsheetId).getSheetById(sheetId);

  if (!sheet) throw new Error('No se encontró la pestaña configurada.');
  return sheet.getName();
}

function cleanCell(value, maxLength) {
  const text = String(value || '').trim().slice(0, maxLength);
  return /^[=+\-@\t\r]/.test(text) ? `'${text}` : text;
}

function doPost(event) {
  const lock = LockService.getScriptLock();

  try {
    const properties = PropertiesService.getScriptProperties();
    const spreadsheetId = properties.getProperty('SPREADSHEET_ID');
    const sheetId = Number(properties.getProperty('SHEET_GID') || '0');

    if (!spreadsheetId) {
      return jsonResponse({ success: false, error: 'server_not_configured' });
    }

    if (!event || !event.postData || !event.postData.contents) {
      return jsonResponse({ success: false, error: 'invalid_request' });
    }

    const data = JSON.parse(event.postData.contents);
    if (!data || typeof data !== 'object') return jsonResponse({ success: false, error: 'invalid_request' });

    if (String(data['bot-field'] || '').trim()) {
      return jsonResponse({ success: false, error: 'invalid_request' });
    }

    const lead = {
      nombre: String(data.nombre || '').trim(),
      apellidos: String(data.apellidos || '').trim(),
      correo: String(data.correo || data.email || '').trim().toLowerCase(),
      pais: String(data.pais || '').trim(),
      telefono: String(data.telefono || '').trim(),
      empresa: String(data.empresa || '').trim(),
      ayuda: String(data.ayuda || '').trim(),
      etapa: String(data.etapa || '').trim(),
      necesidad: String(data.necesidad || data.mensaje || '').trim(),
      consentimiento: String(data.consentimiento || '').trim(),
      origen: String(data.origen || '').trim()
    };

    const emailIsValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(lead.correo);
    const phoneIsValid = /^[+\d][\d\s().-]{6,23}$/.test(lead.telefono);
    const requiredValues = [lead.nombre, lead.apellidos, lead.pais, lead.ayuda, lead.necesidad];

    if (
      requiredValues.some(function (value) { return !value; }) ||
      lead.nombre.length > 80 ||
      lead.apellidos.length > 100 ||
      lead.correo.length > 254 ||
      lead.pais.length > 80 ||
      !emailIsValid ||
      !phoneIsValid ||
      lead.empresa.length > 120 ||
      ALLOWED_REASONS.indexOf(lead.ayuda) === -1 ||
      ALLOWED_STAGES.indexOf(lead.etapa) === -1 ||
      lead.necesidad.length < 10 ||
      lead.necesidad.length > 700 ||
      lead.consentimiento !== 'autorizado'
    ) {
      return jsonResponse({ success: false, error: 'invalid_fields' });
    }

    if (!lock.tryLock(5000)) {
      return jsonResponse({ success: false, error: 'busy' });
    }

    const digest = Utilities.computeDigest(
      Utilities.DigestAlgorithm.SHA_256,
      JSON.stringify(lead)
    );
    const cacheKey = `lead-${Utilities.base64EncodeWebSafe(digest).replace(/=+$/g, '').slice(0, 40)}`;
    const cache = CacheService.getScriptCache();

    if (cache.get(cacheKey)) {
      return jsonResponse({ success: true, duplicate: true });
    }

    const spreadsheet = SpreadsheetApp.openById(spreadsheetId);
    const sheet = spreadsheet.getSheetById(sheetId);

    if (!sheet) {
      return jsonResponse({ success: false, error: 'sheet_not_found' });
    }

    const headers = sheet.getRange(1, 1, 1, EXPECTED_HEADERS.length).getDisplayValues()[0];
    if (EXPECTED_HEADERS.some(function (header, index) { return headers[index] !== header; })) {
      return jsonResponse({ success: false, error: 'sheet_headers_mismatch' });
    }

    sheet.appendRow([
      cleanCell(lead.nombre, 80),
      cleanCell(lead.apellidos, 100),
      cleanCell(lead.correo, 254),
      cleanCell(lead.pais, 80),
      cleanCell(lead.telefono, 25),
      cleanCell(lead.empresa, 120),
      cleanCell(lead.ayuda, 120),
      cleanCell(lead.etapa, 100),
      cleanCell(lead.necesidad, 700),
      lead.consentimiento,
      cleanCell(lead.origen, 100),
      new Date()
    ]);

    cache.put(cacheKey, '1', 60);
    return jsonResponse({ success: true });
  } catch (error) {
    console.error('Form submission failed:', error);
    return jsonResponse({ success: false, error: 'submission_failed' });
  } finally {
    if (lock.hasLock()) lock.releaseLock();
  }
}
