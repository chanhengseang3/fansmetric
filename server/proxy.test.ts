import { describe, expect, it, vi } from 'vitest';
import { proxyToSubbal, splitProxyUrl, type ProxyEnv } from './proxy';

const env: ProxyEnv = {
  SUBBAL_API_BASE_URL: 'https://api.example.test/',
  SUBBAL_TENANT_ID: 'tenant-1',
  SUBBAL_CLIENT_ID: 'client-x',
  SUBBAL_CLIENT_SECRET: 's3cret',
};

function mockFetch(response = new Response('{}', { status: 200, headers: { 'content-type': 'application/json' } })) {
  return vi.fn<typeof fetch>().mockResolvedValue(response);
}

describe('proxyToSubbal', () => {
  it('forwards to the base URL with tenantid and auth, keeping the query string', async () => {
    const f = mockFetch();
    const req = new Request('http://app/api/proxy', { headers: { authorization: 'Bearer abc', cookie: 'x=1' } });
    await proxyToSubbal(req, 'accounts/5/transactions', new URLSearchParams('limit=5&offset=0'), env, f);

    const [url, init] = f.mock.calls[0];
    expect(url).toBe('https://api.example.test/api/v1/accounts/5/transactions?limit=5&offset=0');
    const headers = init!.headers as Headers;
    expect(headers.get('tenantid')).toBe('tenant-1');
    expect(headers.get('authorization')).toBe('Bearer abc');
    expect(headers.get('cookie')).toBeNull();
    expect(init!.method).toBe('GET');
    expect(init!.body).toBeUndefined();
  });

  it('injects client credentials into the OAuth token form, overriding client-sent values', async () => {
    const f = mockFetch();
    const req = new Request('http://app/api/proxy', {
      method: 'POST',
      headers: { 'content-type': 'application/x-www-form-urlencoded' },
      body: 'username=a%40b.com&password=p%40ss&client_secret=evil',
    });
    await proxyToSubbal(req, 'oauth/token', new URLSearchParams(), env, f);

    const form = new URLSearchParams(f.mock.calls[0][1]!.body as string);
    expect(form.get('username')).toBe('a@b.com');
    expect(form.get('password')).toBe('p@ss');
    expect(form.get('client_id')).toBe('client-x');
    expect(form.get('client_secret')).toBe('s3cret');
  });

  it('passes JSON bodies through untouched for other endpoints', async () => {
    const f = mockFetch();
    const body = JSON.stringify({ amount: 1 });
    const req = new Request('http://app/api/proxy', { method: 'POST', headers: { 'content-type': 'application/json' }, body });
    await proxyToSubbal(req, 'transfers', new URLSearchParams(), env, f);

    const init = f.mock.calls[0][1]!;
    expect(new TextDecoder().decode(init.body as ArrayBuffer)).toBe(body);
    expect((init.headers as Headers).get('content-type')).toBe('application/json');
  });

  it.each(['../health', 'accounts/../../x', 'a/./b', 'accounts?x=1', 'a\\b', ''])('rejects unsafe path %j', async (p) => {
    const f = mockFetch();
    const res = await proxyToSubbal(new Request('http://app/'), p, new URLSearchParams(), env, f);
    expect(res.status).toBe(400);
    expect(f).not.toHaveBeenCalled();
  });

  it('never leaves the configured host, even for protocol-relative paths', async () => {
    const f = mockFetch();
    await proxyToSubbal(new Request('http://app/'), '//evil.com/x', new URLSearchParams(), env, f);
    expect(f.mock.calls[0][0]).toBe('https://api.example.test/api/v1/evil.com/x');
  });

  it('returns 500 when the base URL is not configured', async () => {
    const res = await proxyToSubbal(new Request('http://app/'), 'accounts', new URLSearchParams(), {}, mockFetch());
    expect(res.status).toBe(500);
  });

  it('streams binary responses with content-disposition and status intact', async () => {
    const pdf = new Uint8Array([0x25, 0x50, 0x44, 0x46, 0x00, 0xff]);
    const f = mockFetch(
      new Response(pdf, {
        status: 200,
        headers: { 'content-type': 'application/pdf', 'content-disposition': 'attachment; filename="s.pdf"', 'set-cookie': 'a=b' },
      }),
    );
    const res = await proxyToSubbal(new Request('http://app/'), 'accounts/statement', new URLSearchParams(), env, f);
    expect(res.headers.get('content-type')).toBe('application/pdf');
    expect(res.headers.get('content-disposition')).toBe('attachment; filename="s.pdf"');
    expect(res.headers.get('set-cookie')).toBeNull();
    expect(new Uint8Array(await res.arrayBuffer())).toEqual(pdf);
  });

  it('passes upstream error statuses through', async () => {
    const f = mockFetch(new Response('{"error":"invalid_grant"}', { status: 401, headers: { 'content-type': 'application/json' } }));
    const res = await proxyToSubbal(new Request('http://app/'), 'agencies', new URLSearchParams(), env, f);
    expect(res.status).toBe(401);
    expect(await res.json()).toEqual({ error: 'invalid_grant' });
  });

  it('maps network failures to 502', async () => {
    const f = vi.fn<typeof fetch>().mockRejectedValue(new Error('ECONNRESET'));
    const res = await proxyToSubbal(new Request('http://app/'), 'agencies', new URLSearchParams(), env, f);
    expect(res.status).toBe(502);
  });
});

describe('splitProxyUrl', () => {
  it('separates the rewrite path from the forwarded query', () => {
    const { apiPath, search } = splitProxyUrl('https://app.vercel.app/api/proxy?path=accounts/5&limit=5');
    expect(apiPath).toBe('accounts/5');
    expect(search.toString()).toBe('limit=5');
  });
});
