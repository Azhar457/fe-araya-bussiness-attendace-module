import { WorkSettingsForm } from "@/components/kehadiran/WorkSettingsForm";
import { requireRole } from "@/lib/auth/session";

/** M13-US1 — hanya Admin HR. */
export default async function PengaturanPage() {
  await requireRole("admin_hr");
  return <WorkSettingsForm />;
}
