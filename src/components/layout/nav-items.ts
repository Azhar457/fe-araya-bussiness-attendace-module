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
    { href: "/kehadiran/rekap", label: "Rekap kehadiran", icon: CalendarDays },
  ],
  karyawan: [
    { href: "/kehadiran/hari-ini", label: "Kehadiran hari ini", icon: Clock },
    { href: "/kehadiran/rekap", label: "Rekap kehadiran saya", icon: CalendarDays },
    { href: "/kehadiran/izin", label: "Ajukan izin & sakit", icon: History },
  ],
};

export const MODULE_NAME = "Kehadiran";
