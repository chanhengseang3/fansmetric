import type { TokenResponse } from './types';

const STORAGE_KEY = 'fm.session';
const API = '/api/v1';

export interface Session {
  accessToken: string;
  refreshToken: string;
  expiresAt: number;
}

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
    public body?: unknown,
  ) {
    super(message);
  }
}

let session: Session | null = readSession();
const listeners = new Set<(s: Session | null) => void>();

function readSession(): Session | null {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as Session) : null;
  } catch {
    return null;
  }
}

function setSession(next: Session | null) {
  session = next;
  try {
    if (next) sessionStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    else sessionStorage.removeItem(STORAGE_KEY);
  } catch {
    // storage unavailable (private mode): keep the in-memory session
  }
  listeners.forEach((l) => l(next));
}

export function getSession() {
  return session;
}

export function onSessionChange(listener: (s: Session | null) => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function toSession(t: TokenResponse): Session {
  return {
    accessToken: t.access_token,
    refreshToken: t.refresh_token,
    expiresAt: Date.now() + (t.expires_in ?? 3600) * 1000,
  };
}

async function errorFrom(res: Response): Promise<ApiError> {
  let body: unknown;
  let message = `${res.status} ${res.statusText}`;
  try {
    body = await res.json();
    const b = body as { message?: string | string[]; error_description?: string; error?: string };
    const m = b.error_description ?? b.message ?? b.error;
    if (m) message = Array.isArray(m) ? m.join(', ') : m;
  } catch {
    // non-JSON error body
  }
  return new ApiError(res.status, message, body);
}

async function tokenRequest(path: string, form: Record<string, string>): Promise<Session> {
  // client_id / client_secret are added server-side by the proxy
  const res = await fetch(`${API}/oauth/${path}`, {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams(form).toString(),
  });
  if (!res.ok) throw await errorFrom(res);
  return toSession((await res.json()) as TokenResponse);
}

export async function login(username: string, password: string) {
  setSession(await tokenRequest('token', { username, password }));
}

export async function logout() {
  const current = session;
  setSession(null);
  if (current) {
    fetch(`${API}/oauth/invalidate`, {
      method: 'POST',
      headers: { authorization: `Bearer ${current.accessToken}` },
    }).catch(() => undefined);
  }
}

let refreshing: Promise<boolean> | null = null;

function refresh(): Promise<boolean> {
  if (!session) return Promise.resolve(false);
  refreshing ??= tokenRequest('refresh', { refresh_token: session.refreshToken })
    .then((s) => {
      setSession(s);
      return true;
    })
    .catch(() => {
      setSession(null);
      return false;
    })
    .finally(() => {
      refreshing = null;
    });
  return refreshing;
}

type Query = Record<string, string | number | undefined | null>;

function buildUrl(path: string, query?: Query) {
  const qs = new URLSearchParams();
  for (const [k, v] of Object.entries(query ?? {})) {
    if (v !== undefined && v !== null && v !== '') qs.set(k, String(v));
  }
  const s = qs.toString();
  return `${API}/${path}${s ? `?${s}` : ''}`;
}

async function send(method: string, path: string, query?: Query, body?: unknown, retried = false): Promise<Response> {
  if (!session) throw new ApiError(401, 'Not signed in');
  if (!retried && session.expiresAt - Date.now() < 30_000) await refresh();
  // FormData sets its own multipart content-type (with boundary)
  const json = body !== undefined && !(body instanceof FormData);
  const res = await fetch(buildUrl(path, query), {
    method,
    headers: {
      authorization: `Bearer ${session?.accessToken ?? ''}`,
      ...(json ? { 'content-type': 'application/json' } : {}),
    },
    body: json ? JSON.stringify(body) : (body as FormData | undefined),
  });
  if (res.status === 401 && !retried && (await refresh())) {
    return send(method, path, query, body, true);
  }
  if (res.status === 401) setSession(null);
  if (!res.ok) throw await errorFrom(res);
  return res;
}

export async function apiGet<T>(path: string, query?: Query): Promise<T> {
  return (await send('GET', path, query)).json() as Promise<T>;
}

export async function apiPost<T>(path: string, body: unknown): Promise<T> {
  return (await send('POST', path, undefined, body)).json() as Promise<T>;
}

/** Fetch a file endpoint (PDF/CSV) and save it under the server-provided filename. */
export async function apiDownload(path: string, query: Query, fallbackName: string) {
  const res = await send('GET', path, query);
  const blob = await res.blob();
  if (blob.size === 0 || res.headers.get('content-type')?.includes('application/json')) {
    throw new ApiError(204, 'No data for the selected period');
  }
  const disposition = res.headers.get('content-disposition') ?? '';
  const name = /filename="?([^";]+)"?/.exec(disposition)?.[1] ?? fallbackName;
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
