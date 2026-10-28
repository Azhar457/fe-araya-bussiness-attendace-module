import type { Role } from "@/lib/types";

/** Konstanta auth yang aman dipakai di klien maupun server. */

/** Cookie sesi: berisi token Bearer dari BE (diset halaman /masuk). */
export const TOKEN_COOKIE = "araya_token";

/** Cookie sesi demo: berisi employeeId M13 (fallback `X-Employee-Id` BE). */
export const DEMO_COOKIE = "araya_demo";

/**
 * Identitas demo untuk akses cepat (/user, /hr) tanpa login M12/M13.
 * employeeId wajib ada di tabel `attendance_users` BE M13 (seed: EMP001/101/102).
 */
export const DEMO_IDENTITIES: Record<string, { employeeId: string; nik: string; name: string; role: Role }> = {
  user: { employeeId: "101", nik: "EMP101", name: "Dimas Pratama", role: "karyawan" },
  hr: { employeeId: "1", nik: "EMP001", name: "Rani (Admin HR)", role: "admin_hr" },
};

export const ROLE_LABEL: Record<Role, string> = {
  admin_hr: "Admin HR",
  karyawan: "Karyawan",
};

/** Halaman utama per peran — dipakai guard dan tautan jejak halaman. */
export function homeFor(role: Role): string {
  return role === "admin_hr" ? "/kehadiran/pengaturan" : "/kehadiran/hari-ini";
}
