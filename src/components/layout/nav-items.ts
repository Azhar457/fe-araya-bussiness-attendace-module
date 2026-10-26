import type { LucideIcon } from "lucide-react";
import { CalendarDays, Clock, History, Settings2 } from "lucide-react";

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
 * Fitur di luar SSOT (persetujuan izin HR, riwayat harian, hari libur,
 * GPS, koreksi presensi) sengaja tidak ditampilkan.
 */
export const NAV_BY_ROLE: Record<Role, NavItem[]> = {
  admin_hr: [
    { href: "/kehadiran/pengaturan", label: "Pengaturan jam kerja", icon: Settings2 },
    { href: "/kehadiran/rekap", label: "Rekap kehadiran", icon: CalendarDays },
  ],
  karyawan: [
    { href: "/kehadiran/hari-ini", label: "Presensi Karyawan", icon: Clock },
    { href: "/kehadiran/izin", label: "Izin & Sakit", icon: CalendarDays },
    { href: "/kehadiran/rekap", label: "Rekap Saya", icon: History },
  ],
};
