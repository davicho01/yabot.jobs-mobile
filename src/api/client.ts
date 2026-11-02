import Constants from "expo-constants";
import * as SecureStore from "expo-secure-store";

// EXPO_PUBLIC_API_BASE_URL wins (set per build/EAS profile); app.json's
// extra.apiBaseUrl is the local-dev fallback.
export const API_BASE_URL: string =
  process.env.EXPO_PUBLIC_API_BASE_URL ?? (Constants.expoConfig?.extra?.apiBaseUrl as string) ?? "http://localhost:8000";

const TOKEN_KEY = "yabot_token";

let cachedToken: string | null = null;
let onUnauthorized: (() => void) | null = null;

export async function loadToken(): Promise<string | null> {
  cachedToken = await SecureStore.getItemAsync(TOKEN_KEY);
  return cachedToken;
}

export async function saveToken(token: string): Promise<void> {
  cachedToken = token;
  await SecureStore.setItemAsync(TOKEN_KEY, token);
}

export async function clearToken(): Promise<void> {
  cachedToken = null;
  await SecureStore.deleteItemAsync(TOKEN_KEY);
}

/** Called when an authenticated request comes back 401 (token revoked or expired). */
export function setUnauthorizedHandler(handler: (() => void) | null): void {
  onUnauthorized = handler;
}

export class ApiError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

async function parseErrorDetail(response: Response): Promise<string> {
  try {
    const data = await response.json();
    if (typeof data.detail === "string") return data.detail;
    if (Array.isArray(data.detail)) {
      return data.detail.map((d: { msg?: string }) => d.msg).join(", ");
    }
  } catch {
    // fall through
  }
  return response.statusText || "Request failed";
}

type Query = Record<string, string | number | boolean | undefined>;

type RequestOptions = {
  method?: string;
  body?: unknown;
  query?: Query;
  isFormData?: boolean;
};

export function buildUrl(path: string, query?: Query): string {
  const url = new URL(API_BASE_URL + path);
  if (query) {
    for (const [key, value] of Object.entries(query)) {
      if (value !== undefined && value !== "") url.searchParams.set(key, String(value));
    }
  }
  return url.toString();
}

export function authHeaders(): Record<string, string> {
  return cachedToken ? { Authorization: `Bearer ${cachedToken}` } : {};
}

async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { method = "GET", body, query, isFormData } = options;

  const headers: Record<string, string> = { ...authHeaders() };
  let payload: BodyInit | undefined;

  if (body !== undefined) {
    if (isFormData) {
      payload = body as FormData;
    } else {
      headers["Content-Type"] = "application/json";
      payload = JSON.stringify(body);
    }
  }

  const response = await fetch(buildUrl(path, query), { method, headers, body: payload });

  if (!response.ok) {
    // A 401 while holding a token means it's no longer good: sign out.
    // Without one it's just a signed-out request (e.g. a wrong code is 400).
    if (response.status === 401 && cachedToken) onUnauthorized?.();
    throw new ApiError(response.status, await parseErrorDetail(response));
  }

  if (response.status === 204) {
    return undefined as T;
  }

  const contentType = response.headers.get("content-type") ?? "";
  if (contentType.includes("application/json")) {
    return (await response.json()) as T;
  }
  return undefined as T;
}

export const api = {
  get: <T>(path: string, query?: Query) => request<T>(path, { method: "GET", query }),
  post: <T>(path: string, body?: unknown, query?: Query) => request<T>(path, { method: "POST", body, query }),
  postForm: <T>(path: string, body: FormData) => request<T>(path, { method: "POST", body, isFormData: true }),
  patch: <T>(path: string, body?: unknown) => request<T>(path, { method: "PATCH", body }),
  put: <T>(path: string, body?: unknown) => request<T>(path, { method: "PUT", body }),
  delete: <T>(path: string) => request<T>(path, { method: "DELETE" }),
};
