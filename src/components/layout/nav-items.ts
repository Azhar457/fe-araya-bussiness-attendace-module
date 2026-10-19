import type { Role } from "@/lib/types";

export type NavItem = { href: string; label: string };

/** Isi sidebar boleh berbeda antar modul (Panduan UI bagian "Boleh beda"). */
export const NAV_BY_ROLE: Record<Role, NavItem[]> = {
  admin_hr: [
    { href: "/kehadiran/pengaturan", label: "Pengaturan jam kerja" },
    { href: "/kehadiran/rekap", label: "Rekap kehadiran" },
  ],
  karyawan: [
    { href: "/kehadiran/hari-ini", label: "Kehadiran hari ini" },
    { href: "/kehadiran/izin", label: "Ajukan izin & sakit" },
    { href: "/kehadiran/izin/riwayat", label: "Riwayat pengajuan" },
  ],
};

export const MODULE_NAME = "Kehadiran";
