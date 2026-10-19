import type { Role } from "@/lib/types";

/** Konstanta auth yang aman dipakai di klien maupun server. */

/** Cookie sesi: berisi id karyawan yang sedang masuk (diset POST /session). */
export const EMPLOYEE_COOKIE = "araya_employee";

export const ROLE_LABEL: Record<Role, string> = {
  admin_hr: "Admin HR",
  karyawan: "Karyawan",
};

/** Halaman utama per peran — dipakai guard dan tautan jejak halaman. */
export function homeFor(role: Role): string {
  return role === "admin_hr" ? "/kehadiran/pengaturan" : "/kehadiran/hari-ini";
}
