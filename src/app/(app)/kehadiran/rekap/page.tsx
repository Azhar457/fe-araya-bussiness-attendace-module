import { MonthlySummaryPage } from "@/components/kehadiran/MonthlySummaryPage";
import { requireSession } from "@/lib/auth/session";

/** M13-US5 — HR melihat seluruh tim; Karyawan hanya melihat rekapnya sendiri. */
export default async function RekapPage() {
  const session = await requireSession();
  return (
    <MonthlySummaryPage
      scope={session.role === "admin_hr" ? "team" : "mine"}
      employeeId={session.employeeId}
    />
  );
}
