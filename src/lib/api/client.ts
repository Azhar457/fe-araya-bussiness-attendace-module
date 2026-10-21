import type { ApiErrorBody } from "@/lib/types";
import { EMPLOYEE_COOKIE } from "@/lib/auth/constants";
import type { GeoCapture } from "@/lib/geo";

/** true = pakai route handler mock, false = pakai BE asli (NEXT_PUBLIC_API_BASE_URL). */
export const USE_MOCK = process.env.NEXT_PUBLIC_USE_MOCK !== "false";

/**
 * URL basis BE — 100% dari env (NEXT_PUBLIC_API_BASE_URL), tanpa hardcoded fallback.
 * Tidak ada nilai default: jika env belum diisi, fetch akan gagal dengan pesan jelas.
 */
const API_BASE = (process.env.NEXT_PUBLIC_API_BASE_URL ?? "").replace(/\/+$/, "");

const MOCK_PREFIX = "/api/mock";

/**
 * Pemetaan path kontrak BE → route mock, hanya untuk yang namanya berbeda.
 * Path berprefix "/api/" otomatis dipotong prefix-nya saat mode mock,
 * jadi "/api/attendance/today" → "/api/mock/attendance/today".
 */
const MOCK_PATH_ALIASES: Record<string, string> = {
  "/api/working-hours": "/attendance/work-settings",
  "/api/leave-permissions": "/attendance/absence-requests",
};

/** Baca id karyawan dari cookie sesi (dipakai untuk header X-Employee-Id di BE mode). */
function readEmployeeCookie(): string {
  if (typeof document === "undefined") return "";
  const match = document.cookie
    .split("; ")
    .find((row) => row.startsWith(`${EMPLOYEE_COOKIE}=`));
  return match ? match.split("=").slice(1).join("=") : "";
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
  if (!USE_MOCK) return `${API_BASE}${path}`;
  const qIndex = path.indexOf("?");
  const rawPath = qIndex === -1 ? path : path.slice(0, qIndex);
  const search = qIndex === -1 ? "" : path.slice(qIndex);
  const mapped =
    MOCK_PATH_ALIASES[rawPath] ??
    (rawPath.startsWith("/api/") ? rawPath.slice(4) : rawPath);
  return `${MOCK_PREFIX}${mapped}${search}`;
}

export async function request<T>(
  path: string,
  init?: RequestInit & { geo?: GeoCapture },
): Promise<T> {
  let response: Response;
  try {
    const geo = init?.geo;
    const employeeId = readEmployeeCookie();
    const headerInit = init?.headers
      ? Object.fromEntries(
          new Headers(init.headers).entries(),
        )
      : {};
    const headers: Record<string, string> = {
      ...(init?.body ? { "Content-Type": "application/json" } : {}),
      ...headerInit,
    };
    if (employeeId) headers["X-Employee-Id"] = employeeId;
    let body = init?.body;
    if (geo && body) {
      const parsed: Record<string, unknown> =
        typeof body === "string" ? JSON.parse(body) : { ...(body as object) };
      body = JSON.stringify({
        ...parsed,
        latitude: geo.latitude,
        longitude: geo.longitude,
        accuracy_m: Math.round(geo.accuracyMeters),
        geo_timestamp: new Date(geo.timestampMs).toISOString(),
        spoof_suspect: geo.spoof.suspect,
        spoof_reasons: geo.spoof.reasons,
      });
    }
    response = await fetch(apiUrl(path), {
      ...init,
      headers,
      body,
      cache: "no-store",
    });
  } catch {
    throw new ApiError(0, "NETWORK_ERROR", "Koneksi terputus. Coba lagi.");
  }

  if (response.status === 204) return undefined as T;

  const body = (await response.json().catch(() => null)) as
    | (ApiErrorBody & { fields?: Record<string, string> })
    | { error?: string; details?: string }
    | null;

  if (!response.ok) {
    // BE asli bentuk error: { error: "pesan" }; mock bentuk: { code, message, fields }
    const errorMessage =
      "message" in (body ?? {}) ? (body as { message: string }).message
      : "error" in (body ?? {}) ? (body as { error: string }).error
      : "Permintaan gagal diproses. Coba lagi.";
    const fields = "fields" in (body ?? {}) ? (body as { fields?: Record<string, string> }).fields : undefined;
    throw new ApiError(
      response.status,
      "code" in (body ?? {}) ? (body as { code: string }).code : "BE_ERROR",
      errorMessage,
      fields,
    );
  }

  return body as T;
}
