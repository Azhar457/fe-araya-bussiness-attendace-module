import { AttendanceDetailPage } from "@/components/kehadiran/AttendanceDetailPage";
import { requireRole } from "@/lib/auth/session";

/** M13-US2 — detail kehadiran per tanggal (hari berjalan / hari lewat). Karyawan. */
export default async function KehadiranDetailPage() {
  const session = await requireRole("karyawan");
  return <AttendanceDetailPage employeeName={session.name} />;
}
