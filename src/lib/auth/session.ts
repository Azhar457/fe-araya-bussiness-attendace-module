import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { TOKEN_COOKIE, homeFor } from "@/lib/auth/constants";
import type { LiveSession, Role } from "@/lib/types";

const API_BASE = (process.env.NEXT_PUBLIC_API_BASE_URL ?? "").replace(/\/+$/, "");

/**
 * Sesi diverifikasi ke BE (`GET /api/auth/me`) memakai token di cookie.
 * Peran dan nama berasal dari BE, bukan disimpan di cookie — tidak bisa dipalsukan
 * dari browser.
 */
export async function getSession(): Promise<LiveSession | null> {
  const token = (await cookies()).get(TOKEN_COOKIE)?.value;
  if (!token) return null;

  try {
    const response = await fetch(`${API_BASE}/api/auth/me`, {
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
    });

    if (!response.ok) return null;

    const user = (await response.json()) as {
      karyawanId: number;
      nik: string;
      nama: string;
      role: Role;
    };

    return {
      employeeId: String(user.karyawanId),
      nik: user.nik,
      name: user.nama,
      role: user.role === "admin_hr" ? "admin_hr" : "karyawan",
    };
  } catch {
    // BE tidak dapat dihubungi: perlakukan sebagai belum masuk, bukan halaman rusak.
    return null;
  }
}

export async function requireSession(): Promise<LiveSession> {
  const session = await getSession();
  if (!session) redirect("/masuk");
  return session;
}

export async function requireRole(role: Role): Promise<LiveSession> {
  const session = await requireSession();
  if (session.role !== role) redirect(homeFor(session.role));
  return session;
}
