import { AttendanceHistoryPage } from "@/components/kehadiran/AttendanceHistoryPage";
import { requireSession } from "@/lib/auth/session";

/** M13-US2/US4 — riwayat kehadiran (semua peran). */
export default async function RiwayatPage() {
  await requireSession();
  return <AttendanceHistoryPage />;
}
