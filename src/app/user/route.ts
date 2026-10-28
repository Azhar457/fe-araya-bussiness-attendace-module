import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { DEMO_COOKIE, DEMO_IDENTITIES } from "@/lib/auth/constants";

/**
 * Akses demo sebagai KARYAWAN (showcase).
 *
 * Tanpa login M12/M13: set cookie demo `araya_demo=user` lalu lempar ke
 * halaman utama karyawan (/kehadiran/hari-ini). Semua pemanggilan BE M13
 * memakai fallback header `X-Employee-Id` (employeeId 101 — sudah ada di
 * tabel attendance_users BE).
 *
 * Catatan: ini JALUR DEMO, bukan pengganti login produksi. Untuk demo
 * besok, dosen/penguji cukup buka `/user` atau `/hr`.
 */
export const dynamic = "force-dynamic";

export async function GET() {
  const identity = DEMO_IDENTITIES.user;
  const store = await cookies();
  store.set(DEMO_COOKIE, "user", {
    httpOnly: false,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 8,
  });
  // employeeId dikirim lewat cookie demo; halaman tujuan ditentukan role.
  void identity;
  redirect("/kehadiran/hari-ini");
}
