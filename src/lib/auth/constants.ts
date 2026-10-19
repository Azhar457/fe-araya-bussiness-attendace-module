import type { Role } from "@/lib/types";

/** Konstanta auth yang aman dipakai di klien maupun server. */

export const ROLE_COOKIE = "araya_role";

export const ROLE_LABEL: Record<Role, string> = {
  admin_hr: "Admin HR",
  karyawan: "Karyawan",
};

export const DEFAULT_ROLE: Role = process.env.NEXT_PUBLIC_DEFAULT_ROLE === "karyawan" ? "karyawan" : "admin_hr";

export function isRole(value: string | undefined | null): value is Role {
  return value === "admin_hr" || value === "karyawan";
}

/** Halaman utama per peran — dipakai guard dan tautan jejak halaman. */
export function homeFor(role: Role): string {
  return role === "admin_hr" ? "/kehadiran/pengaturan" : "/kehadiran/hari-ini";
}
