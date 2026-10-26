import Link from "next/link";

import { NAV_BY_ROLE } from "@/components/layout/nav-items";
import type { Role } from "@/lib/types";

export type SidebarProps = {
  role: Role;
  pathname: string;
  /** Dipanggil setelah item diklik (dipakai untuk menutup laci di layar kecil). */
  onNavigate?: () => void;
};

export function Sidebar({ role, pathname, onNavigate }: SidebarProps) {
  return (
    <nav aria-label="Menu modul" className="flex h-full flex-col gap-4 overflow-y-auto p-4">
      <div className="flex items-center gap-3 px-1">
        <div className="flex flex-col leading-tight">
          <span className="text-h3 text-text">Kehadiran</span>
          <span className="text-caption text-muted">HRIS Platform</span>
        </div>
      </div>
      <p className="px-1 text-caption font-semibold uppercase tracking-wide text-muted">
        {role === "admin_hr" ? "Administrasi HR" : "Navigasi Pegawai"}
      </p>
      <ul className="flex flex-col gap-1">
        {NAV_BY_ROLE[role].map((item) => {
          const active = pathname === item.href;
          const Icon = item.icon;
          return (
            <li key={item.href}>
              <Link
                href={item.href}
                onClick={onNavigate}
                aria-current={active ? "page" : undefined}
                className={`flex h-control items-center gap-2.5 rounded-sm px-3 text-body ${
                  active ? "bg-primary-soft font-semibold text-primary" : "text-text hover:bg-surface-2"
                }`}
              >
                <Icon aria-hidden size={16} className="shrink-0" />
                {item.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
