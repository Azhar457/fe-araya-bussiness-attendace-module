import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { TOKEN_COOKIE, homeFor } from "@/lib/auth/constants";
import { getMe } from "@/lib/api/kehadiran";
import type { Role } from "@/lib/types";

/**
 * Sesi M13 — identitas & role **datang dari BE M13** (login nik+password,
 * Bearer token). Satu-satunya sumber auth adalah M13 BE
 * (`POST /api/auth/login` → token, `GET /api/auth/me` → profil).
 *
 * Alur:
 *  1. FE login di `LoginPage` → `login(nik, password)` (BE M13) → simpan
 *     Bearer token M13 di cookie non-HttpOnly `araya_token`.
 *  2. Guard (`requireSession`, `requireRole`) memanggil `getSession()` yang
 *     memvalidasi sesi lewat `GET /api/auth/me` (BE M13, server-side fetch
 *     tanpa kena CORS) dan normalisasi role M13 ke role internal.
 *  3. Endpoint proteksi M13 dikirim dengan `Authorization: Bearer <token M13>`.
 *
 * Bila token tidak valid / BE M13 mati: `getSession()` membalas null →
 * dialihkan ke `/masuk`.
 */

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
    const me = await getMe();
    return {
      employeeId: String(me.karyawanId),
      nik: me.nik,
      name: me.nama,
      role: me.role,
    };
  } catch {
    // Token tidak valid / BE M13 mati: tidak ada sesi valid.
    return null;
  }
}

export async function requireSession() {
  const session = await getSession();
  if (!session) redirect("/masuk");
  return session;
}

export async function requireRole(role: Role) {
  const session = await requireSession();
  if (session.role !== role) redirect(homeFor(session.role));
  return session;
}

/**
 * Keluar dari M13 (token dicabut di BE M13 via POST /api/auth/logout),
 * lalu bersihkan cookie lokal. Jalankan server-side; cookie token
 * dihapus, redirect ke /masuk.
 */
export async function logoutAndClear(): Promise<void> {
  const store = await cookies();
  const token = store.get(TOKEN_COOKIE)?.value;
  if (token) {
    try {
      const base = (process.env.NEXT_PUBLIC_API_BASE_URL ?? "").replace(/\/+$/, "");
      await fetch(`${base}/api/auth/logout`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: "{}",
        cache: "no-store",
      });
    } catch {
      // BE mati: tetap bersihkan cookie lokal.
    }
  }
  store.delete(TOKEN_COOKIE);
}
