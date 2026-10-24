import type { LucideIcon } from "lucide-react";
import { CalendarDays, CheckCircle2, Clock, History, Settings2 } from "lucide-react";

import type { Role } from "@/lib/types";

export type NavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
};

/** Isi sidebar boleh berbeda antar modul (Panduan UI bagian "Boleh beda"). */
export const NAV_BY_ROLE: Record<Role, NavItem[]> = {
  admin_hr: [
    { href: "/kehadiran/pengaturan", label: "Pengaturan jam kerja", icon: Settings2 },
    { href: "/kehadiran/approval", label: "Persetujuan izin & sakit", icon: CheckCircle2 },
    { href: "/kehadiran/riwayat", label: "Riwayat kehadiran", icon: History },
    { href: "/kehadiran/rekap", label: "Rekap kehadiran", icon: CalendarDays },
  ],
  karyawan: [
    { href: "/kehadiran/hari-ini", label: "Presensi Karyawan", icon: Clock },
    { href: "/kehadiran/rekap", label: "Riwayat & Rekap Saya", icon: History },
    { href: "/kehadiran/izin", label: "Izin & Sakit", icon: CalendarDays },
  ],
};

export const MODULE_NAME = "Kehadiran";
