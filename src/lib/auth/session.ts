import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { DEMO_COOKIE, DEMO_IDENTITIES, TOKEN_COOKIE, homeFor } from "@/lib/auth/constants";
import { logout } from "@/lib/api/kehadiran";
import type { M12Session, Role } from "@/lib/types";

/**
 * Sesi M13 — identitas & role **datang dari M12 (Kel. C3)**, bukan dari M13.
 *
 * Alur:
 *  1. FE login di `LoginPage` → `login(email, password)` (via proxy
 *     `/api/m12/auth/login` → M12 `POST /api/login`) → simpan Bearer token
 *     M12 di cookie non-HttpOnly `araya_token`.
 *  2. Guard (`requireSession`, `requireRole`) memanggil `getSession()` yang
 *     memvalidasi sesi lewat `getMe()` (via proxy `/api/m12/auth/me` →
 *     M12 `GET /api/me`) dan normalisasi role M12 (`Admin HR` / `Employee`)
 *     ke role internal M13 (`admin_hr` / `karyawan`).
 *  3. Endpoint proteksi M13 (check-in/out, rekap, working-hours, izin)
 *     dikirim dengan `Authorization: Bearer <token M12>` — M13 BE wajib
 *     menerima token M12 (lihat REQUEST_FROM_M13_TO_M13_BE.md).
 *
 * Bila M12 mati: `getSession()` membalas null → dialihkan ke `/masuk`.
 */

/**
 * Normalisasi role M12 ke role M13 internal.
 * Respons M12 `GET /api/me` memakai label `role` ("Admin HR" | "Employee");
 * FE M13 memetakan ke "admin_hr" | "karyawan".
 */
function normalizeRole(role: string | undefined | null): Role {
  const r = (role ?? "").trim().toLowerCase();
  return r.includes("hr") || r.includes("admin") ? "admin_hr" : "karyawan";
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

  // Sesi demo (/user, /hr): identitas statis dari DEMO_IDENTITIES. Dipakai
  // hanya untuk showcase — BE M13 menerima fallback header `X-Employee-Id`.
  const demoId = store.get(DEMO_COOKIE)?.value;
  if (demoId && DEMO_IDENTITIES[demoId]) {
    const identity = DEMO_IDENTITIES[demoId];
    return {
      employeeId: identity.employeeId,
      nik: identity.nik,
      name: identity.name,
      role: identity.role,
    };
  }

  const token = store.get(TOKEN_COOKIE)?.value;
  if (!token) return null;

  try {
    // Server-side: panggil M12 `GET /api/me` **langsung** (bukan lewat proxy
    // FE) — fetch server-side tidak kena aturan CORS browser, dan URL relatif
    // `"/api/m12/auth/me"` dari server component tidak ter-rute ke proxy route
    // FE di dev server. Token M12 Bearer dikirim eksplisit.
    const m12Base = (
      process.env.M12_API_BASE_URL ??
      "https://kelompok4-m12-sistem-hr-manajemen-d.vercel.app"
    ).replace(/\/+$/, "");
    const response = await fetch(`${m12Base}/api/me`, {
      headers: { Authorization: `Bearer ${token}`, Accept: "application/json" },
      cache: "no-store",
    });
    if (!response.ok) return null;
    const result: M12Session = await response.json();
    if (!result || !result.success) return null;
    return {
      employeeId: String(result.employee_id),
      nik: result.nik ?? String(result.employee_id),
      name: result.nama ?? `Karyawan #${result.employee_id}`,
      role: normalizeRole(result.role),
    };
  } catch {
    // M12 mati / token tidak valid: masih login, tapi tidak ada sesi valid.
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

/** Keluar dari M12 (token dicabut di M12), lalu bersihkan cookie lokal. */
export async function logoutAndClear(): Promise<void> {
  try {
    await logout();
  } catch {
    // Bahkan M12 mati, FE tetap boleh log out lokal.
  }
  (await cookies()).delete(TOKEN_COOKIE);
}
