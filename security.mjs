import {isIP} from 'node:net';

const normalizeIp = value => value?.startsWith('::ffff:') ? value.slice(7) : value;
export const clientAddress = req => req.security?.ip || normalizeIp(req.socket.remoteAddress) || 'unknown';
export const isSecure = req => req.security?.secure ?? Boolean(req.socket.encrypted);

export function sameOrigin(req) {
  try {
    const expected = req.security?.origin || `${isSecure(req) ? 'https' : 'http'}://${req.headers.host}`;
    return new URL(req.headers.origin).origin === expected && req.headers['sec-fetch-site'] !== 'cross-site';
  } catch { return false; }
}

export function requestSecurity(env = process.env) {
  const production = env.NODE_ENV === 'production';
  const publicUrl = env.PUBLIC_ORIGIN ? new URL(env.PUBLIC_ORIGIN) : null;
  if(publicUrl && (!['http:', 'https:'].includes(publicUrl.protocol) || publicUrl.username || publicUrl.password || publicUrl.pathname !== '/' || publicUrl.search || publicUrl.hash)) throw Error('PUBLIC_ORIGIN deve conter somente a origem do site.');
  if(production && publicUrl?.protocol !== 'https:') throw Error('Produção exige PUBLIC_ORIGIN com HTTPS.');
  const proxies = new Set((env.TRUSTED_PROXY_IPS || '').split(',').map(value => normalizeIp(value.trim())).filter(Boolean));
  for(const ip of proxies) if(!isIP(ip)) throw Error('TRUSTED_PROXY_IPS aceita somente endereços IP exatos.');
  return (req, res) => {
    const remote = normalizeIp(req.socket.remoteAddress);
    const trusted = proxies.has(remote);
    // Somente o proxy explicitamente configurado pode informar o visitante e o protocolo.
    const forwardedIp = trusted ? String(req.headers['x-forwarded-for'] || '').split(',').at(-1).trim() : '';
    const secure = Boolean(req.socket.encrypted) || trusted && req.headers['x-forwarded-proto'] === 'https';
    req.security = {ip: isIP(forwardedIp) ? normalizeIp(forwardedIp) : remote, secure, origin: publicUrl?.origin || `${secure ? 'https' : 'http'}://${req.headers.host}`};
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=(), payment=()');
    res.setHeader('Content-Security-Policy', "default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data:; font-src 'self'; media-src 'self'; connect-src 'self'; object-src 'none'; base-uri 'none'; frame-ancestors 'none'; form-action 'self'");
    res.setHeader('Cache-Control', req.url.startsWith('/admin') || req.url.startsWith('/api/') ? 'no-store' : 'no-cache');
    if(secure) res.setHeader('Strict-Transport-Security', 'max-age=31536000');
    if(req.url.startsWith('/admin') || req.url.startsWith('/api/')) res.setHeader('X-Robots-Tag', 'noindex, nofollow');
    const health = req.url === '/healthz' && ['127.0.0.1', '::1'].includes(remote) && ['GET', 'HEAD'].includes(req.method);
    if(publicUrl && !health && req.headers.host !== publicUrl.host) {
      res.writeHead(421); res.end('Host não permitido.'); return false;
    }
    if(production && !secure && !health) {
      res.writeHead(400); res.end('HTTPS obrigatório.'); return false;
    }
    return true;
  };
}

export class RequestError extends Error {
  constructor(status, message) { super(message); this.status = status; }
}

export function readJson(req) {
  if(!/^application\/json(?:;|$)/i.test(req.headers['content-type'] || '')) return Promise.reject(new RequestError(415, 'Formato inválido.'));
  if(Number(req.headers['content-length']) > 8192) return Promise.reject(new RequestError(413, 'Solicitação muito grande.'));
  return new Promise((resolve, reject) => {
    let size = 0; const chunks = [];
    const cleanup = () => {clearTimeout(timer); req.off('data', onData); req.off('end', onEnd); req.off('error', onError); req.off('aborted', onAborted);};
    const fail = error => {cleanup(); req.pause(); reject(error);};
    const onError = () => fail(new RequestError(400, 'Solicitação interrompida.'));
    const onAborted = onError;
    const onData = chunk => {size += chunk.length; if(size > 8192) fail(new RequestError(413, 'Solicitação muito grande.')); else chunks.push(chunk);};
    const onEnd = () => {
      cleanup();
      try {
        const value = JSON.parse(Buffer.concat(chunks).toString('utf8'));
        if(!value || typeof value !== 'object' || Array.isArray(value)) throw Error();
        resolve(value);
      } catch {reject(new RequestError(400, 'Dados inválidos.'));}
    };
    const timer = setTimeout(() => fail(new RequestError(408, 'Tempo de envio esgotado.')), 10000);
    timer.unref();
    req.on('data', onData); req.once('end', onEnd); req.once('error', onError); req.once('aborted', onAborted);
  });
}
