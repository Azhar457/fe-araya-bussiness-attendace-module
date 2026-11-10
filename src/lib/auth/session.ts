import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { TOKEN_COOKIE, homeFor } from "@/lib/auth/constants";
import type { M13MeResponse } from "@/lib/api/kehadiran";
import type { Role } from "@/lib/types";

/**
 * Sesi M13 — identitas & role datang dari **BE M13 langsung**:
 * login `POST /api/auth/login` (BE M13 yang memverifikasi password ke M12,
 * FE tidak pernah memanggil M12) → token Bearer M13 disimpan di cookie
 * `araya_token`; guard memvalidasi sesi via `GET /api/auth/me`.
 *
 * Bila token tidak valid / tidak ada: `getSession()` membalas null →
 * dialihkan ke `/login`.
 */

/** Base URL BE M13 (env publik, terbaca juga di server). */
const APP_BASE = (
  process.env.NEXT_PUBLIC_API_BASE_URL ?? "https://laboratorium-backend.vercel.app"
).replace(/\/+$/, "");

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
    const res = await fetch(`${APP_BASE}/api/auth/me`, {
      headers: { Authorization: `Bearer ${token}`, Accept: "application/json" },
      cache: "no-store",
    });
    if (!res.ok) return null;
    const me = (await res.json()) as M13MeResponse | null;
    if (!me || typeof me !== "object" || me.karyawanId == null) return null;
    return {
      employeeId: String(me.karyawanId),
      nik: me.nik ?? "",
      name: me.nama,
      role: me.role,
    };
  } catch {
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
 * Blacklist token M13 di BE M13 (POST /api/auth/logout), lalu bersihkan
 * cookie. M12 tidak dilibatkan — token M12 tidak pernah dimiliki FE.
 * Jalankan server-side; redirect ke /login ditangani pemanggil.
 */
export async function logoutAndClear(): Promise<void> {
  const store = await cookies();
  const token = store.get(TOKEN_COOKIE)?.value;
  if (token) {
    try {
      await fetch(`${APP_BASE}/api/auth/logout`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: "{}",
        cache: "no-store",
      });
    } catch {
      // BE gagal/mati: tetap bersihkan cookie lokal.
    }
  }
  store.delete(TOKEN_COOKIE);
}
