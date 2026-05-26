import { env } from "./env";
import { HttpError } from "./api-error";
import { tokenStorage } from "./token-storage";
import type { ApiError, TokenPair } from "@/types";

type Json = Record<string, unknown> | unknown[];

type RequestOptions = {
  method?: "GET" | "POST" | "PATCH" | "PUT" | "DELETE";
  body?: Json | FormData | URLSearchParams;
  query?: Record<string, string | number | boolean | null | undefined>;
  auth?: boolean;
  signal?: AbortSignal;
  headers?: Record<string, string>;
};

type AuthListener = (tokens: TokenPair | null) => void;

class ApiClient {
  private baseUrl = env.apiBaseUrl;
  private listeners = new Set<AuthListener>();
  private refreshing: Promise<TokenPair | null> | null = null;

  setTokens(tokens: TokenPair | null) {
    if (tokens) tokenStorage.save(tokens);
    else tokenStorage.clear();
    for (const fn of this.listeners) fn(tokens);
  }

  getTokens(): TokenPair | null {
    return tokenStorage.load();
  }

  onAuthChange(fn: AuthListener): () => void {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }

  async request<T>(path: string, opts: RequestOptions = {}): Promise<T> {
    const tokens = opts.auth === false ? null : this.getTokens();
    const res = await this.send(path, opts, tokens?.access_token);
    if (res.status === 401 && opts.auth !== false && tokens) {
      const refreshed = await this.tryRefresh(tokens);
      if (refreshed) {
        const retry = await this.send(path, opts, refreshed.access_token);
        return this.parse<T>(retry);
      }
      this.setTokens(null);
    }
    return this.parse<T>(res);
  }

  private async send(
    path: string,
    opts: RequestOptions,
    accessToken: string | undefined,
  ): Promise<Response> {
    const url = this.buildUrl(path, opts.query);
    const headers: Record<string, string> = { Accept: "application/json", ...opts.headers };
    let body: BodyInit | undefined;
    if (opts.body instanceof FormData || opts.body instanceof URLSearchParams) {
      body = opts.body;
    } else if (opts.body !== undefined) {
      headers["Content-Type"] = "application/json";
      body = JSON.stringify(opts.body);
    }
    if (accessToken) headers.Authorization = `Bearer ${accessToken}`;
    return fetch(url, {
      method: opts.method ?? "GET",
      headers,
      body,
      signal: opts.signal,
    });
  }

  private async parse<T>(res: Response): Promise<T> {
    if (res.status === 204) return undefined as T;
    const text = await res.text();
    const data = text ? safeJson(text) : null;
    if (!res.ok) {
      const body = isApiError(data)
        ? data
        : ({
            code: `http_${res.status}`,
            message: typeof data === "string" ? data : res.statusText,
            details: {},
          } satisfies ApiError);
      throw new HttpError(res.status, body);
    }
    return data as T;
  }

  private buildUrl(path: string, query: RequestOptions["query"]): string {
    const target = path.startsWith("http") ? path : `${this.baseUrl}${path}`;
    const url = /^https?:\/\//.test(target) ? new URL(target) : new URL(target, window.location.origin);
    if (query) {
      for (const [k, v] of Object.entries(query)) {
        if (v === undefined || v === null || v === "") continue;
        url.searchParams.set(k, String(v));
      }
    }
    return url.toString();
  }

  private async tryRefresh(current: TokenPair): Promise<TokenPair | null> {
    if (!this.refreshing) {
      this.refreshing = (async () => {
        try {
          const res = await fetch(`${this.baseUrl}/auth/refresh`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ refresh_token: current.refresh_token }),
          });
          if (!res.ok) return null;
          const next = (await res.json()) as TokenPair;
          this.setTokens(next);
          return next;
        } catch {
          return null;
        } finally {
          this.refreshing = null;
        }
      })();
    }
    return this.refreshing;
  }
}

const safeJson = (text: string): unknown => {
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
};

const isApiError = (data: unknown): data is ApiError =>
  typeof data === "object" &&
  data !== null &&
  "code" in data &&
  "message" in data &&
  typeof (data as ApiError).code === "string" &&
  typeof (data as ApiError).message === "string";

export const apiClient = new ApiClient();
