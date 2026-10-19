import { TodayCard } from "@/components/kehadiran/TodayCard";
import { requireRole } from "@/lib/auth/session";

/** M13-US2 — hanya Karyawan. */
export default async function HariIniPage() {
  await requireRole("karyawan");
  return <TodayCard />;
}
