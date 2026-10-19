import type { AttendanceStatus, AbsenceStatus } from "@/lib/types";

type Tone = "success" | "pending" | "danger" | "info" | "neutral";

/** Kelas literal (bukan interpolasi) supaya ikut ter-scan Tailwind. */
const TONES: Record<Tone, { pill: string; dot: string }> = {
  success: { pill: "bg-success-bg text-success-fg", dot: "bg-success-solid" },
  pending: { pill: "bg-pending-bg text-pending-fg", dot: "bg-pending-solid" },
  danger: { pill: "bg-danger-bg text-danger-fg", dot: "bg-danger-solid" },
  info: { pill: "bg-info-bg text-info-fg", dot: "bg-info-solid" },
  neutral: { pill: "bg-neutral-bg text-neutral-fg", dot: "bg-neutral-solid" },
};

export function Badge({ tone, children }: { tone: Tone; children: string }) {
  return (
    <span
      className={`inline-flex h-control-sm items-center gap-2 rounded-full px-3 text-caption font-semibold ${TONES[tone].pill}`}
    >
      <span aria-hidden className={`size-2 rounded-full ${TONES[tone].dot}`} />
      {children}
    </span>
  );
}

/** Pemetaan status kehadiran → 5 warna baku (design.md bagian 2). */
const ATTENDANCE: Record<AttendanceStatus, { label: string; tone: Tone }> = {
  hadir: { label: "Hadir", tone: "success" },
  terlambat: { label: "Terlambat", tone: "pending" },
  izin: { label: "Izin", tone: "info" },
  sakit: { label: "Sakit", tone: "info" },
  // TBD design.md: cuti boleh info atau neutral. Ubah di satu tempat ini.
  cuti: { label: "Cuti", tone: "info" },
  alpa: { label: "Alpa", tone: "danger" },
};

export function StatusBadge({ status }: { status: AttendanceStatus }) {
  const { label, tone } = ATTENDANCE[status];
  return (
    <span aria-label={`Status: ${label.toLowerCase()}`}>
      <Badge tone={tone}>{label}</Badge>
    </span>
  );
}

const APPROVAL: Record<AbsenceStatus, { label: string; tone: Tone }> = {
  pending: { label: "Menunggu", tone: "pending" },
  approved: { label: "Disetujui", tone: "success" },
  rejected: { label: "Ditolak", tone: "danger" },
};

export function ApprovalBadge({ status }: { status: AbsenceStatus }) {
  const { label, tone } = APPROVAL[status];
  return (
    <span aria-label={`Status pengajuan: ${label.toLowerCase()}`}>
      <Badge tone={tone}>{label}</Badge>
    </span>
  );
}
