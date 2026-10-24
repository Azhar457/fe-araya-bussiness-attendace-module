import { HariIniLive } from "@/components/kehadiran/HariIniLive";
import { requireRole } from "@/lib/auth/session";

/** M13-US2 — halaman tipis (server): guard karyawan lalu render kartu live. */
export default async function HariIniPage() {
  const session = await requireRole("karyawan");

  return <HariIniLive employeeName={session.name} employeeId={session.employeeId} />;
}
