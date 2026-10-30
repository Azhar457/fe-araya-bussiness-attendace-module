import { LeaveDetailPage } from "@/components/kehadiran/LeaveDetailPage";
import { requireRole } from "@/lib/auth/session";

/** M13-US3 — detail perizinan per tanggal. Karyawan. */
export default async function IzinDetailPage() {
  await requireRole("karyawan");
  return <LeaveDetailPage />;
}
