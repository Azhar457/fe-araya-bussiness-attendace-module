import { MonthlySummaryPage } from "@/components/kehadiran/MonthlySummaryPage";
import { requireRole } from "@/lib/auth/session";

/** M13-US5 (+ M13-US4) — hanya Admin HR. */
export default async function RekapPage() {
  await requireRole("admin_hr");
  return <MonthlySummaryPage />;
}
