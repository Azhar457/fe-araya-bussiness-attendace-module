import type { LucideIcon } from "lucide-react";
import { CalendarDays, Clock, FileText, History, Settings2 } from "lucide-react";

import type { Role } from "@/lib/types";

export type NavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
};

/**
 * Isi sidebar mengikuti Studi Kasus Capstone (M13, 5 user story):
 * US1 pengaturan jam kerja, US2 check-in/out, US3 izin & sakit, US5 rekap.
 *
 * M13-US6 — rekapitulasi perizinan (peninjauan HR atas pengajuan izin/sakit)
 * juga ditampilkan.
 */
export const NAV_BY_ROLE: Record<Role, NavItem[]> = {
  admin_hr: [
    { href: "/kehadiran/pengaturan", label: "Pengaturan jam kerja", icon: Settings2 },
    { href: "/kehadiran/izin/rekapitulasi", label: "Rekapitulasi Perizinan", icon: FileText },
    { href: "/kehadiran/rekap", label: "Rekap kehadiran", icon: CalendarDays },
    { href: "/kehadiran/rekap/daily", label: "Rekap harian", icon: History },
  ],
  karyawan: [
    { href: "/kehadiran/hari-ini", label: "Presensi Karyawan", icon: Clock },
    { href: "/kehadiran/detail", label: "Detail Kehadiran", icon: History },
    { href: "/kehadiran/izin", label: "Izin & Sakit", icon: CalendarDays },
    { href: "/kehadiran/izin/riwayat", label: "Riwayat Izin & Sakit", icon: FileText },
    { href: "/kehadiran/rekap", label: "Rekap Saya", icon: History },
  ],
};
