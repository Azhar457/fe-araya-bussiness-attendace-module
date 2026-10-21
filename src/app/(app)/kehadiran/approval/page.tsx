import { ApprovalPage } from "@/components/kehadiran/ApprovalPage";
import { requireRole } from "@/lib/auth/session";

/** M13-US1 — hanya HR. */
export default async function ApprovalRoute() {
  await requireRole("admin_hr");
  return <ApprovalPage />;
}
