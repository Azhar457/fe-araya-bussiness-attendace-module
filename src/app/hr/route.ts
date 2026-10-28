import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { DEMO_COOKIE, DEMO_IDENTITIES } from "@/lib/auth/constants";

/**
 * Akses demo sebagai ADMIN HR (showcase).
 *
 * Tanpa login M12/M13: set cookie demo `araya_demo=hr` lalu lempar ke
 * halaman utama HR (/kehadiran/pengaturan). Semua pemanggilan BE M13
 * memakai fallback header `X-Employee-Id` (employeeId 1 — admin_hr,
 * sudah ada di tabel attendance_users BE).
 *
 * Catatan: ini JALUR DEMO, bukan pengganti login produksi. Untuk demo
 * besok, dosen/penguji cukup buka `/hr` atau `/user`.
 */
export const dynamic = "force-dynamic";

export async function GET() {
  const identity = DEMO_IDENTITIES.hr;
  const store = await cookies();
  store.set(DEMO_COOKIE, "hr", {
    httpOnly: false,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 8,
  });
  void identity;
  redirect("/kehadiran/pengaturan");
}
