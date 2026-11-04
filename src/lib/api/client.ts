import type { ApiErrorBody } from "@/lib/types";
import { M13_TOKEN_COOKIE, TOKEN_COOKIE } from "@/lib/auth/constants";

/**
 * API client — mode BE asli (laboratorium-backend.vercel.app).
 * URL 100% dari env NEXT_PUBLIC_API_BASE_URL; tanpa hardcoded fallback.
 *
 * Dua token:
 * - `araya_token` (M12) → hanya untuk route proxy FE sendiri ({ local: true }).
 * - `araya_token_m13` (M13) → untuk semua endpoint BE M13; didapat dari
 *   POST /api/auth/exchange (BE M13 memverifikasi token ke M12, jadi
 *   username/password tetap milik M12).
 */
const API_BASE = (process.env.NEXT_PUBLIC_API_BASE_URL ?? "").replace(/\/+$/, "");

/** Baca token Bearer dari cookie sesi. */
function readTokenCookie(name: string): string {
  if (typeof document === "undefined") return "";
  const match = document.cookie
    .split("; ")
    .find((row) => row.startsWith(`${name}=`));
  return match ? decodeURIComponent(match.split("=").slice(1).join("=")) : "";
}

function setTokenCookie(name: string, value: string) {
  if (typeof document === "undefined") return;
  document.cookie = `${name}=${encodeURIComponent(value)}; path=/; max-age=43200; samesite=lax`;
}

/** POST /api/auth/exchange — tukar token M12 menjadi token M13. Balas "" bila gagal. */
async function exchangeM13Token(tokenM12: string): Promise<string> {
  try {
    const res = await fetch(apiUrl("/api/auth/exchange"), {
      method: "POST",
      headers: { Authorization: `Bearer ${tokenM12}`, "Content-Type": "application/json" },
      body: "{}",
      cache: "no-store",
    });
    if (!res.ok) return "";
    const data = (await res.json()) as { token?: string };
    return typeof data.token === "string" ? data.token : "";
  } catch {
    return "";
  }
}

export class ApiError extends Error {
  status: number;
  code: string;
  fields?: Record<string, string>;

  constructor(status: number, code: string, message: string, fields?: Record<string, string>) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.code = code;
    this.fields = fields;
  }
}

/** path selalu memakai bentuk kontrak BE (mis. "/api/attendance/today"). */
export function apiUrl(path: string): string {
  const qIndex = path.indexOf("?");
  const rawPath = qIndex === -1 ? path : path.slice(0, qIndex);
  const search = qIndex === -1 ? "" : path.slice(qIndex);
  return `${API_BASE}${rawPath}${search}`;
}

export async function request<T>(
  path: string,
  init?: RequestInit,
  /** local: true → panggil route handler FE sendiri (same-origin), bukan BE. */
  options?: { local?: boolean },
): Promise<T> {
  const isLocal = options?.local === true;
  const target = isLocal ? path : apiUrl(path);

  const buildHeaders = (token: string): Record<string, string> => ({
    ...(init?.body ? { "Content-Type": "application/json" } : {}),
    ...(init?.headers ? Object.fromEntries(new Headers(init.headers).entries()) : {}),
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  });

  let response: Response;
  try {
    response = await fetch(target, {
      ...init,
      headers: buildHeaders(readTokenCookie(isLocal ? TOKEN_COOKIE : M13_TOKEN_COOKIE)),
      body: init?.body,
      cache: "no-store",
    });
  } catch {
    throw new ApiError(0, "NETWORK_ERROR", "Koneksi terputus. Coba lagi.");
  }

  // 401 dari BE M13 → token M13 mungkin hilang/kedaluwarsa padahal sesi M12
  // masih sah. Tukar sekali (POST /api/auth/exchange) lalu ulangi permintaan.
  if (response.status === 401 && !isLocal) {
    const tokenM12 = readTokenCookie(TOKEN_COOKIE);
    if (tokenM12) {
      const tokenM13 = await exchangeM13Token(tokenM12);
      if (tokenM13) {
        setTokenCookie(M13_TOKEN_COOKIE, tokenM13);
        try {
          response = await fetch(target, {
            ...init,
            headers: buildHeaders(tokenM13),
            body: init?.body,
            cache: "no-store",
          });
        } catch {
          throw new ApiError(0, "NETWORK_ERROR", "Koneksi terputus. Coba lagi.");
        }
      }
    }
  }

  if (response.status === 204) return undefined as T;

  const body = (await response.json().catch(() => null)) as
    | (ApiErrorBody & { fields?: Record<string, string> })
    | { error?: string; details?: string; message?: string }
    | null;

  if (!response.ok) {
    // BE live bentuk error: { error: "pesan" } atau { error: { code, message } }
    let errorMessage: string;
    let errorFields: Record<string, string> | undefined;
    let errorCode: string;

    const err = body as unknown as {
      error?: string | { code?: string; message?: string; fields?: Record<string, string> };
      details?: string;
      message?: string;
      code?: string;
      fields?: Record<string, string>;
    } | null;

    if (err?.error && typeof err.error === "object") {
      // bentuk { error: { code, message, fields } }
      errorCode = err.error.code ?? "BE_ERROR";
      errorMessage = err.error.message ?? "Permintaan gagal diproses. Coba lagi.";
      errorFields = err.error.fields;
    } else if (typeof err?.error === "string") {
      // bentuk { error: "pesan", details?: "..." }
      errorCode = "BE_ERROR";
      errorMessage = err.error;
    } else if (err?.message) {
      errorCode = err.code ?? "BE_ERROR";
      errorMessage = err.message;
      errorFields = err.fields;
    } else {
      errorCode = "BE_ERROR";
      errorMessage = "Permintaan gagal diproses. Coba lagi.";
    }

    throw new ApiError(response.status, errorCode, errorMessage, errorFields);
  }

  return body as T;
}
