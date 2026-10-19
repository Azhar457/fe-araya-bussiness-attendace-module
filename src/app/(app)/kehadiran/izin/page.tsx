import { AbsenceFormPage } from "@/components/kehadiran/AbsenceFormPage";
import { requireRole } from "@/lib/auth/session";

/** M13-US3 — hanya Karyawan. */
export default async function IzinPage() {
  await requireRole("karyawan");
  return <AbsenceFormPage />;
}
