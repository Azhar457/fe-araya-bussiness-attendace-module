import { LeaveRecapPage } from "@/components/kehadiran/LeaveRecapPage";
import { requireRole } from "@/lib/auth/session";

/** M13-US6 — rekapitulasi perizinan, hanya Admin HR. */
export default async function IzinRekapitulasiPage() {
  await requireRole("admin_hr");
  return <LeaveRecapPage />;
}