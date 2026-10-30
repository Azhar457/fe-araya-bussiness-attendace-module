import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { TOKEN_COOKIE, homeFor } from "@/lib/auth/constants";
import { getM12Me, normalizeRole } from "@/lib/api/kehadiran";
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
    const me = await getM12Me();
    if (!me.success || me.employee_id == null) return null;
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
  if (!session) redirect("/masuk");
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
 * dihapus, redirect ke /masuk.
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
}
