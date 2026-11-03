import { API_URL, TOKEN_KEY } from '../config/env';

export class ApiError extends Error {
  status: number;
  details?: unknown;
  constructor(status: number, message: string, details?: unknown) {
    super(message);
    this.status = status;
    this.details = details;
  }
}

export const tokenStore = {
  get(): string | null {
    try { return localStorage.getItem(TOKEN_KEY); } catch { return null; }
  },
  set(token: string) {
    try { localStorage.setItem(TOKEN_KEY, token); } catch { /* ignore */ }
  },
  clear() {
    try { localStorage.removeItem(TOKEN_KEY); } catch { /* ignore */ }
  },
};

let onUnauthorized: (() => void) | null = null;
/** AuthContext registers a handler so an expired session logs the user out everywhere. */
export const setUnauthorizedHandler = (fn: (() => void) | null) => { onUnauthorized = fn; };

export interface RequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  body?: unknown;
  query?: Record<string, string | number | boolean | undefined | null>;
  auth?: boolean; // send the JWT when available (default true)
  signal?: AbortSignal;
}

export function buildUrl(path: string, query?: RequestOptions['query']): string {
  let url = `${API_URL.replace(/\/$/, '')}${path}`;
  if (query) {
    const params = new URLSearchParams();
    Object.entries(query).forEach(([k, v]) => {
      if (v !== undefined && v !== null && v !== '') params.append(k, String(v));
    });
    const qs = params.toString();
    if (qs) url += `?${qs}`;
  }
  return url;
}

export async function request<T = any>(path: string, opts: RequestOptions = {}): Promise<T> {
  const headers: Record<string, string> = { Accept: 'application/json' };
  if (opts.body !== undefined) headers['Content-Type'] = 'application/json';
  const token = tokenStore.get();
  if (token && opts.auth !== false) headers.Authorization = `Bearer ${token}`;

  let res: Response;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 30000);
  const abortFromCaller = () => controller.abort();
  if (opts.signal?.aborted) controller.abort();
  opts.signal?.addEventListener('abort', abortFromCaller);
  try {
    res = await fetch(buildUrl(path, opts.query), {
      method: opts.method || 'GET',
      headers,
      body: opts.body !== undefined ? JSON.stringify(opts.body) : undefined,
      signal: controller.signal,
    });
  } catch (e: any) {
    throw new ApiError(
      0,
      e && e.name === 'AbortError'
        ? 'The server took too long to respond. Please try again.'
        : 'Cannot reach the server. Check your connection and that the backend is running.'
    );
  } finally {
    clearTimeout(timer);
    opts.signal?.removeEventListener('abort', abortFromCaller);
  }

  const text = await res.text();
  let data: any = null;
  if (text) {
    try { data = JSON.parse(text); } catch { data = null; }
  }
  if (!res.ok) {
    if (res.status === 401 && token && onUnauthorized) onUnauthorized();
    throw new ApiError(res.status, (data && data.error) || `Request failed (${res.status})`, data && data.details);
  }
  return data as T;
}

/** Downloads a protected file (e.g. database backup) using the JWT. */
export async function downloadFile(path: string, filename: string): Promise<void> {
  const token = tokenStore.get();
  const res = await fetch(buildUrl(path), { headers: token ? { Authorization: `Bearer ${token}` } : {} });
  if (!res.ok) throw new ApiError(res.status, `Download failed (${res.status})`);
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export const errorMessage = (err: unknown): string =>
  err instanceof Error ? err.message : 'Something went wrong';


export async function uploadFile<T>(
  path: string,
  file: File,
  metadata: {
    documentType: string;
    visibility: 'STAFF_ONLY' | 'CUSTOMER';
    documentNumber?: string;
    issuer?: string;
    issuedAt?: string;
    expiresAt?: string;
  }
): Promise<T> {
  const headers: Record<string, string> = {
    Accept: 'application/json',
    'Content-Type': 'application/octet-stream',
    'X-Document-Type': metadata.documentType,
    'X-Document-Mime': file.type || 'application/octet-stream',
    'X-Document-Name': encodeURIComponent(file.name),
    'X-Document-Visibility': metadata.visibility,
  };

  const token = tokenStore.get();
  if (token) headers.Authorization = `Bearer ${token}`;

  if (metadata.documentNumber) headers['X-Document-Number'] = metadata.documentNumber;
  if (metadata.issuer) headers['X-Document-Issuer'] = metadata.issuer;
  if (metadata.issuedAt) headers['X-Document-Issued-At'] = metadata.issuedAt;
  if (metadata.expiresAt) headers['X-Document-Expires-At'] = metadata.expiresAt;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 120_000);

  let response: Response;
  try {
    response = await fetch(buildUrl(path), {
      method: 'POST',
      headers,
      body: file,
      signal: controller.signal,
    });
  } catch (error: any) {
    throw new ApiError(
      0,
      error?.name === 'AbortError'
        ? 'The upload took too long. Please try again.'
        : 'Cannot reach the server. Check your connection and that the backend is running.'
    );
  } finally {
    clearTimeout(timer);
  }

  const text = await response.text();
  let data: any = null;

  if (text) {
    try {
      data = JSON.parse(text);
    } catch {
      data = null;
    }
  }

  if (!response.ok) {
    if (response.status === 401 && token && onUnauthorized) onUnauthorized();
    throw new ApiError(
      response.status,
      (data && data.error) || `Upload failed (${response.status})`,
      data && data.details
    );
  }

  return data as T;
}