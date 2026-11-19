import { MonthlyRecapPage } from "@/components/kehadiran/MonthlyRecapPage";
import { requireRole } from "@/lib/auth/session";

/** M13-US5 — rekapitulasi detail per hari, hanya Admin HR. */
export default async function RekapDetailPage() {
  await requireRole("admin_hr");
  return <MonthlyRecapPage />;
}
