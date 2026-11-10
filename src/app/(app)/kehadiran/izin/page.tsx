import { AbsenceFormPage } from "@/components/kehadiran/AbsenceFormPage";
import { getSession } from "@/lib/auth/session";

/**
 * M13-US3 — Halaman izin & sakit.
 * - Karyawan: form pengajuan (AbsenceFormPage).
 * - Admin HR: navigasi ke rekapitulasi perizinan (M13-US6) di bawah.
 */
export default async function IzinPage() {
  const session = await getSession();
  if (session?.role === "admin_hr") {
    // HR tidak membuat pengajuan izin — arahkan ke rekapitulasi.
    const { RekapPerizinan } = await import("@/components/kehadiran/RekapPerizinan");
    return <RekapPerizinan />;
  }
  return <AbsenceFormPage />;
}
