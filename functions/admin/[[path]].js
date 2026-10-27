// Cloudflare Pages Function: sirve el panel de administración de Metonik en
// https://www.metonik.com/admin reenviando /admin y /admin/** al backend de Render.
//
// Variable de entorno del proyecto de Pages (Settings → Variables and Secrets, tipo Secret):
//   ADMIN_PROXY_KEY = el MISMO valor aleatorio que ADMIN_PROXY_KEY en Render.
// Sin ella el proxy responde 503 (no reenvía nada a medias).

const UPSTREAM = 'https://gptuner-api.onrender.com';

// Solo se reenvían las cabeceras que el panel necesita; nada de cf-*, x-forwarded-* ni otras que
// el visitante pudiera inventarse para hacerse pasar por otra IP.
const PASS_REQUEST = ['accept', 'accept-language', 'content-type', 'cookie', 'user-agent', 'if-none-match', 'if-modified-since'];

export async function onRequest({ request, env }) {
  if (!env.ADMIN_PROXY_KEY) {
    return new Response('Panel no configurado (falta ADMIN_PROXY_KEY).', { status: 503 });
  }
  const url = new URL(request.url);
  const headers = new Headers();
  for (const name of PASS_REQUEST) {
    const v = request.headers.get(name);
    if (v !== null) headers.set(name, v);
  }
  headers.set('X-Metonik-Proxy-Key', env.ADMIN_PROXY_KEY);
  headers.set('X-Metonik-Client-IP', request.headers.get('CF-Connecting-IP') || '');

  const hasBody = request.method !== 'GET' && request.method !== 'HEAD';
  let upstream;
  try {
    upstream = await fetch(UPSTREAM + url.pathname + url.search, {
      method: request.method,
      headers,
      body: hasBody ? request.body : undefined,
      redirect: 'manual',
    });
  } catch {
    // Render plan free se duerme: el primer acceso puede tardar ~1 min en despertar.
    return new Response('El servidor del panel no responde. Reintenta en unos segundos.', { status: 502 });
  }

  const out = new Response(upstream.body, upstream);
  const location = out.headers.get('Location');
  if (location && location.startsWith(UPSTREAM)) {
    out.headers.set('Location', location.slice(UPSTREAM.length) || '/');
  }
  // El panel no debe quedarse en cachés intermedias ni indexarse.
  if (url.pathname.startsWith('/admin/console/') || !/\.(png|ico)$/.test(url.pathname)) {
    out.headers.set('Cache-Control', 'no-store');
  }
  out.headers.set('X-Robots-Tag', 'noindex, nofollow');
  return out;
}
