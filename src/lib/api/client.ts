import type { ApiErrorBody } from "@/lib/types";
import { TOKEN_COOKIE } from "@/lib/auth/constants";

/**
 * API client — mode BE asli (laboratorium-backend.vercel.app).
 * URL 100% dari env NEXT_PUBLIC_API_BASE_URL; tanpa hardcoded fallback.
 *
 * Satu token: `araya_token` = Bearer token M13 dari POST /api/auth/login,
 * dipakai semua endpoint BE M13 maupun proxy FE sendiri (/api/m14/rekap).
 */
const API_BASE = (process.env.NEXT_PUBLIC_API_BASE_URL ?? "").replace(/\/+$/, "");

/** Baca token Bearer dari cookie sesi. */
function readTokenCookie(): string {
  if (typeof document === "undefined") return "";
  const match = document.cookie
    .split("; ")
    .find((row) => row.startsWith(`${TOKEN_COOKIE}=`));
  return match ? decodeURIComponent(match.split("=").slice(1).join("=")) : "";
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

/** Unduh file dari BE M13 (butuh Bearer) lalu simpan sebagai file browser. */
export async function downloadFile(path: string, filename: string): Promise<void> {
  let response: Response;
  try {
    response = await fetch(apiUrl(path), {
      headers: { Authorization: `Bearer ${readTokenCookie()}` },
      cache: "no-store",
    });
  } catch {
    throw new ApiError(0, "NETWORK_ERROR", "Koneksi terputus. Coba lagi.");
  }
  if (!response.ok) throw new ApiError(response.status, "BE_ERROR", "Gagal mengunduh lampiran.");
  const blob = await response.blob();
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
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
    // FormData → biarkan browser set Content-Type + boundary multipart sendiri.
    ...(init?.body && !(init.body instanceof FormData) ? { "Content-Type": "application/json" } : {}),
    ...(init?.headers ? Object.fromEntries(new Headers(init.headers).entries()) : {}),
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  });

  let response: Response;
  try {
    response = await fetch(target, {
      ...init,
      headers: buildHeaders(readTokenCookie()),
      body: init?.body,
      cache: "no-store",
    });
  } catch {
    throw new ApiError(0, "NETWORK_ERROR", "Koneksi terputus. Coba lagi.");
  }

  // Token M13 kedaluwarsa / dicabut → 401 diteruskan ke pemanggil (UI
  // menampilkan pesan; guard server-side akan redirect ke /login berikutnya).

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
