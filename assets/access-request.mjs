/** FormSubmit is the delivery service. No credentials or SMTP secrets belong in this file. */
export class AccessRequestError extends Error {
  constructor(code) { super(code); this.name = 'AccessRequestError'; this.code = code; }
}

export function requestPayload(values) {
  const name = String(values.name || '').trim();
  const email = String(values.email || '').trim();
  const device = values.device;
  if (!name || name.length > 100 || email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || /[\r\n]/.test(name + email) || !['Android', 'iPhone'].includes(device) || values._honey) {
    throw new AccessRequestError('invalid');
  }
  return {
    name, email, device,
    language: String(values.language || 'es').slice(0, 12),
    _replyto: email,
    _subject: String(values._subject || 'Solicitud de acceso de prueba — Metonik').replace(/[\r\n]/g, '').slice(0, 180),
    _template: 'table',
    _honey: ''
  };
}

export async function sendAccessRequest(endpoint, values, {fetchImpl = globalThis.fetch, timeoutMs = 20000} = {}) {
  const payload = requestPayload(values);
  const url = new URL(endpoint);
  if (url.origin !== 'https://formsubmit.co' || !url.pathname.startsWith('/ajax/')) throw new AccessRequestError('unavailable');
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetchImpl(url.href, {
      method: 'POST',
      headers: {'Content-Type': 'application/json', 'Accept': 'application/json'},
      credentials: 'omit',
      referrerPolicy: 'strict-origin-when-cross-origin',
      body: JSON.stringify(payload),
      signal: controller.signal
    });
    if (!response.ok) throw new AccessRequestError('error');
    const data = await response.json();
    // An activation email is not a delivered application. Never present it as success.
    if (/activat|confirm\s+(your|the)\s+(email|form)|verif(y|ication)/i.test(String(data.message || ''))) throw new AccessRequestError('unavailable');
    if (data.success !== true && data.success !== 'true') throw new AccessRequestError('error');
    return {sent: true};
  } catch (error) {
    if (error instanceof AccessRequestError) throw error;
    throw new AccessRequestError('error');
  } finally {
    clearTimeout(timer);
  }
}
