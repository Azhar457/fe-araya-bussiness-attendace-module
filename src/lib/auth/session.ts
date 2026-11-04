import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { M13_TOKEN_COOKIE, TOKEN_COOKIE, homeFor } from "@/lib/auth/constants";
import { normalizeRole, type M12MeResponse } from "@/lib/api/kehadiran";
import type { Role } from "@/lib/types";

/**
 * Sesi M13 — identitas & role **datang dari M12** (proxy FE
 * `/api/m12/auth/me`), token Bearer M12 dikirim ke semua endpoint BE M13.
 *
 * Alur:
 *  1. FE login di `LoginPage` → `m12Login(email, password)` (proxy → M12)
 *     → simpan token M12 di cookie non-HttpOnly `araya_token`.
 *  2. Guard (`requireSession`, `requireRole`) memanggil `getSession()` yang
 *     memvalidasi sesi lewat `GET /api/m12/auth/me` (proxy server-side,
 *     tanpa kena CORS) + normalisasi role M12 ke role internal FE.
 *  3. Endpoint proteksi BE M13 dikirim dengan `Authorization: Bearer <token M12>`.
 *
 * Bila token tidak valid / M12 mati: `getSession()` membalas null →
 * dialihkan ke `/login`.
 */

async function m12MeDirect(token: string) {
  const m12Base = (
    process.env.M12_API_BASE_URL ?? "https://kelompok4-m12-sistem-hr-manajemen-d.vercel.app"
  ).replace(/\/+$/, "");
  const res = await fetch(`${m12Base}/api/me`, {
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/json",
    },
    cache: "no-store",
  });
  const text = await res.text();
  let body: unknown;
  try {
    body = text ? JSON.parse(text) : null;
  } catch {
    body = { error: text || `M12 /api/me membalas HTTP ${res.status}` };
  }
  return { ok: res.ok, body } as { ok: boolean; body: M12MeResponse | Record<string, string> | null };
}

export async function getSession(): Promise<
  | {
      employeeId: string;
      nik: string;
      name: string;
      role: Role;
    }
  | null
> {
  const store = await cookies();
  const token = store.get(TOKEN_COOKIE)?.value;
  if (!token) return null;

  try {
    const { ok, body } = await m12MeDirect(token);
    if (!ok || !body || typeof body === "string") return null;
    const me = body as M12MeResponse;
    if (!("success" in me) || me.success === false || me.employee_id == null) return null;
    return {
      employeeId: String(me.employee_id),
      nik: me.nik ?? "",
      name: me.name,
      role: normalizeRole(me.role),
    };
  } catch {
    // Token tidak valid / M12 mati: tidak ada sesi valid.
    return null;
  }
}

export async function requireSession() {
  const session = await getSession();
  if (!session) redirect("/login");
  return session;
}

export async function requireRole(role: Role) {
  const session = await requireSession();
  if (session.role !== role) redirect(homeFor(session.role));
  return session;
}

/**
 * Keluar dari M12 (token dicabut di M12 via POST /api/logout lewat proxy),
 * lalu bersihkan cookie lokal. Jalankan server-side; cookie token
 * dihapus, redirect ke /login.
 */
export async function logoutAndClear(): Promise<void> {
  const store = await cookies();
  const token = store.get(TOKEN_COOKIE)?.value;
  if (token) {
    try {
      const m12Base = (
        process.env.M12_API_BASE_URL ?? "https://kelompok4-m12-sistem-hr-manajemen-d.vercel.app"
      ).replace(/\/+$/, "");
      await fetch(`${m12Base}/api/logout`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: "{}",
        cache: "no-store",
      });
    } catch {
      // M12 mati: tetap bersihkan cookie lokal.
    }
  }
  store.delete(TOKEN_COOKIE);
  store.delete(M13_TOKEN_COOKIE);
}
