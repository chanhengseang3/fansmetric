/**
 * Same-origin proxy to the Subbal Middleware.
 *
 * The deployed middleware only allows *.mbanq.cloud / *.subbal.com origins, so the
 * browser talks to this proxy instead. It also keeps the OAuth client secret and the
 * tenant id server-side: both are injected here, never shipped in the bundle.
 */

export interface ProxyEnv {
  SUBBAL_API_BASE_URL?: string;
  SUBBAL_TENANT_ID?: string;
  SUBBAL_CLIENT_ID?: string;
  SUBBAL_CLIENT_SECRET?: string;
}

const FORWARD_REQUEST_HEADERS = [
  'authorization',
  'content-type',
  'accept',
  'x-request-id',
  '2fa-token',
  'device-type',
];

const FORWARD_RESPONSE_HEADERS = ['content-type', 'content-disposition', 'x-request-id'];

const OAUTH_CLIENT_PATHS = new Set(['oauth/token', 'oauth/refresh']);

// Only plain path segments: no traversal, no scheme/host smuggling.
const SAFE_PATH = /^[A-Za-z0-9._~-]+(\/[A-Za-z0-9._~-]+)*$/;

function json(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}

/**
 * @param req      incoming request (method, headers, body)
 * @param apiPath  path after `/api/v1/`, e.g. `accounts/5702/transactions`
 * @param search   query string to forward (without the proxy's own `path` param)
 */
export async function proxyToSubbal(
  req: Request,
  apiPath: string,
  search: URLSearchParams,
  env: ProxyEnv,
  fetchImpl: typeof fetch = fetch,
): Promise<Response> {
  const base = env.SUBBAL_API_BASE_URL?.replace(/\/+$/, '');
  if (!base) return json(500, { statusCode: 500, message: 'SUBBAL_API_BASE_URL is not configured' });

  const path = apiPath.replace(/^\/+/, '');
  if (!SAFE_PATH.test(path) || path.split('/').some((s) => s === '..' || s === '.')) {
    return json(400, { statusCode: 400, message: 'Invalid API path' });
  }

  const qs = search.toString();
  const target = `${base}/api/v1/${path}${qs ? `?${qs}` : ''}`;

  const headers = new Headers();
  for (const name of FORWARD_REQUEST_HEADERS) {
    const value = req.headers.get(name);
    if (value) headers.set(name, value);
  }
  if (env.SUBBAL_TENANT_ID) headers.set('tenantid', env.SUBBAL_TENANT_ID);

  const method = req.method.toUpperCase();
  let body: BodyInit | undefined;
  if (method !== 'GET' && method !== 'HEAD') {
    if (method === 'POST' && OAUTH_CLIENT_PATHS.has(path)) {
      const form = new URLSearchParams(await req.text());
      if (env.SUBBAL_CLIENT_ID) form.set('client_id', env.SUBBAL_CLIENT_ID);
      if (env.SUBBAL_CLIENT_SECRET) form.set('client_secret', env.SUBBAL_CLIENT_SECRET);
      headers.set('content-type', 'application/x-www-form-urlencoded');
      body = form.toString();
    } else {
      const buf = await req.arrayBuffer();
      body = buf.byteLength ? buf : undefined;
    }
  }

  let upstream: Response;
  try {
    upstream = await fetchImpl(target, { method, headers, body, redirect: 'manual' });
  } catch (err) {
    return json(502, {
      statusCode: 502,
      message: 'Subbal API unreachable',
      error: err instanceof Error ? err.message : String(err),
    });
  }

  const outHeaders = new Headers({ 'cache-control': 'no-store' });
  for (const name of FORWARD_RESPONSE_HEADERS) {
    const value = upstream.headers.get(name);
    if (value) outHeaders.set(name, value);
  }
  return new Response(upstream.body, { status: upstream.status, headers: outHeaders });
}

/** Read the proxy's `path` param and split it from the query that should be forwarded. */
export function splitProxyUrl(url: string): { apiPath: string; search: URLSearchParams } {
  const u = new URL(url, 'http://localhost');
  const search = new URLSearchParams(u.search);
  const apiPath = search.get('path') ?? '';
  search.delete('path');
  return { apiPath, search };
}
