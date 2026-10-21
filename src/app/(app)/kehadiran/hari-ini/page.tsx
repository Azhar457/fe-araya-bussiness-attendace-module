import { KuotaCutiTahunan } from "@/components/kehadiran/KuotaCutiTahunan";
import { PresensiCTA } from "@/components/kehadiran/PresensiCTA";
import { RekapitulasiBulan } from "@/components/kehadiran/RekapitulasiBulan";
import { SapaanHeader } from "@/components/kehadiran/SapaanHeader";
import { TerminalPresensiHariIni } from "@/components/kehadiran/TerminalPresensiHariIni";
import { ValidasiLokasiKerja } from "@/components/kehadiran/ValidasiLokasiKerja";
import { requireRole } from "@/lib/auth/session";

/** M13-US2 — dashboard karyawan: semua kartu sesuai mockup UI/UX. */
export default async function HariIniPage() {
  const session = await requireRole("karyawan");

  return (
    <div className="flex flex-col gap-5">
      <SapaanHeader userName={session.name} />

      {/* Baris 1: terminal presensi + validasi geofence */}
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        <TerminalPresensiHariIni />
        <ValidasiLokasiKerja />
      </div>

      {/* Baris 2: CTA presensi besar + kuota cuti */}
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        <PresensiCTA />
        <KuotaCutiTahunan />
      </div>

      {/* Baris 3: rekapitulasi + riwayat 5 terakhir (full-width) */}
      <RekapitulasiBulan employeeId={session.id} />
    </div>
  );
}
