import type { Role } from "@/lib/types";

/** Konstanta auth yang aman dipakai di klien maupun server. */

/**
 * Cookie sesi: token Bearer **M13** (didapat POST /api/auth/login BE M13 —
 * BE yang memverifikasi kredensial ke M12; FE tidak memegang token M12).
 * Dipakai semua endpoint BE M13, juga proxy local (/api/m14/rekap).
 */
export const TOKEN_COOKIE = "araya_token";

export const ROLE_LABEL: Record<Role, string> = {
  admin_hr: "Admin HR",
  karyawan: "Karyawan",
};

/** Halaman utama per peran — dipakai guard dan tautan jejak halaman. */
export function homeFor(role: Role): string {
  return role === "admin_hr" ? "/kehadiran/pengaturan" : "/kehadiran/hari-ini";
}
