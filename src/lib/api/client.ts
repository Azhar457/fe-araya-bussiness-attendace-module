import type { ApiErrorBody } from "@/lib/types";

/** true = pakai route handler mock, false = pakai BE asli (NEXT_PUBLIC_API_BASE_URL). */
export const USE_MOCK = process.env.NEXT_PUBLIC_USE_MOCK !== "false";
const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? "";
const MOCK_PREFIX = "/api/mock";

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

/** path selalu memakai bentuk kontrak BE (mis. "/attendance/today"). */
export function apiUrl(path: string): string {
  return USE_MOCK ? `${MOCK_PREFIX}${path}` : `${API_BASE}${path}`;
}

export async function request<T>(path: string, init?: RequestInit): Promise<T> {
  let response: Response;
  try {
    response = await fetch(apiUrl(path), {
      ...init,
      headers: init?.body ? { "Content-Type": "application/json", ...init?.headers } : init?.headers,
      cache: "no-store",
    });
  } catch {
    throw new ApiError(0, "NETWORK_ERROR", "Koneksi terputus. Coba lagi.");
  }

  if (response.status === 204) return undefined as T;

  const body = (await response.json().catch(() => null)) as (ApiErrorBody & { fields?: Record<string, string> }) | null;

  if (!response.ok) {
    throw new ApiError(
      response.status,
      body?.code ?? "UNKNOWN_ERROR",
      body?.message ?? "Permintaan gagal diproses. Coba lagi.",
      body?.fields,
    );
  }

  return body as T;
}
