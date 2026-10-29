import { loadEnv, type Plugin } from 'vite';
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import type { IncomingMessage } from 'node:http';
import { proxyToSubbal, type ProxyEnv } from './server/proxy';

/** Mounts the same proxy used by the Vercel Function, so `npm run dev` matches production. */
function subbalProxy(env: ProxyEnv): Plugin {
  return {
    name: 'subbal-proxy',
    configureServer(server) {
      server.middlewares.use('/api/v1', async (req, res) => {
        try {
          const url = new URL(req.url ?? '/', 'http://localhost');
          const body = await readBody(req);
          const request = new Request(url, {
            method: req.method,
            headers: requestHeaders(req),
            body: body.length ? body : undefined,
          });
          const response = await proxyToSubbal(request, url.pathname, url.searchParams, env);
          res.statusCode = response.status;
          response.headers.forEach((value, key) => res.setHeader(key, value));
          res.end(Buffer.from(await response.arrayBuffer()));
        } catch (err) {
          res.statusCode = 500;
          res.setHeader('content-type', 'application/json');
          res.end(JSON.stringify({ statusCode: 500, message: String(err) }));
        }
      });
    },
  };
}

const HOP_BY_HOP = new Set(['host', 'connection', 'content-length', 'transfer-encoding', 'keep-alive']);

function requestHeaders(req: IncomingMessage): Record<string, string> {
  return Object.fromEntries(
    Object.entries(req.headers).filter(
      (e): e is [string, string] => typeof e[1] === 'string' && !HOP_BY_HOP.has(e[0]),
    ),
  );
}

function readBody(req: IncomingMessage): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    req.on('data', (c: Buffer) => chunks.push(c));
    req.on('end', () => resolve(Buffer.concat(chunks)));
    req.on('error', reject);
  });
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  return {
    plugins: [react(), subbalProxy(env)],
    test: { environment: 'node' },
  };
});
