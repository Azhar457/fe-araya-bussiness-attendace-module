import type { Role } from "@/lib/types";

/** Konstanta auth yang aman dipakai di klien maupun server. */

/** Cookie sesi: berisi token Bearer dari BE (diset halaman /login). */
export const TOKEN_COOKIE = "araya_token";

/**
 * Cookie token M13 (hasil POST /api/auth/exchange di BE M13).
 * Token M12 hanya untuk proxy M12; endpoint BE M13 wajib token M13.
 */
export const M13_TOKEN_COOKIE = "araya_token_m13";

export const ROLE_LABEL: Record<Role, string> = {
  admin_hr: "Admin HR",
  karyawan: "Karyawan",
};

/** Halaman utama per peran — dipakai guard dan tautan jejak halaman. */
export function homeFor(role: Role): string {
  return role === "admin_hr" ? "/kehadiran/pengaturan" : "/kehadiran/hari-ini";
}
