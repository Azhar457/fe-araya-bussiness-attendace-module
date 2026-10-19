import { AbsenceHistoryPage } from "@/components/kehadiran/AbsenceHistoryPage";
import { requireRole } from "@/lib/auth/session";

/** M13-US3 — riwayat pengajuan milik karyawan. */
export default async function IzinRiwayatPage() {
  await requireRole("karyawan");
  return <AbsenceHistoryPage />;
}
