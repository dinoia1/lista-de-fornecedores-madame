const clean = value => typeof value === 'string' ? value.trim().replace(/[\x00-\x1f\x7f]/g, '').slice(0, 120) : '';
export function attribution(input = {}) {
  if (!input || typeof input !== 'object') input = {};
  let referrer = '';
  try { const url = new URL(input.referrer); if (['https:', 'http:'].includes(url.protocol)) referrer = url.hostname; } catch {}
  const sessionId = /^[a-f0-9-]{36}$/i.test(input.sessionId || '') ? input.sessionId : '';
  return {sessionId, source: clean(input.source) || referrer || 'Direto / não identificado', medium: clean(input.medium), campaign: clean(input.campaign), content: clean(input.content), referrer, device: ['mobile','desktop'].includes(input.device) ? input.device : 'Não identificado'};
}
