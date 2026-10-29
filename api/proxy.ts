// Vercel Function: `/api/v1/*` is rewritten here (see vercel.json) as `/api/proxy?path=*`.
import { proxyToSubbal, splitProxyUrl } from '../server/proxy.js';

async function handle(request: Request): Promise<Response> {
  const { apiPath, search } = splitProxyUrl(request.url);
  return proxyToSubbal(request, apiPath, search, process.env);
}

export const GET = handle;
export const POST = handle;
export const PUT = handle;
export const PATCH = handle;
export const DELETE = handle;
