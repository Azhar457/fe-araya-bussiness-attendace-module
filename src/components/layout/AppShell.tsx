"use client";

import { usePathname } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";

import { Navbar } from "@/components/layout/Navbar";
import { Sidebar } from "@/components/layout/Sidebar";
import { Button } from "@/components/ui/Button";
import { CloseIcon } from "@/components/ui/Icons";
import { ToastProvider } from "@/components/ui/Toast";
import type { Role } from "@/lib/types";

export type AppShellProps = {
  role: Role;
  userName: string;
  children: ReactNode;
};

/** Kerangka halaman sama untuk semua modul (Panduan UI 4 · Struktur halaman). */
export function AppShell({ role, userName, children }: AppShellProps) {
  const pathname = usePathname();
  const [drawerOpen, setDrawerOpen] = useState(false);

  useEffect(() => {
    setDrawerOpen(false);
  }, [pathname]);

  return (
    <ToastProvider>
      <div className="min-h-dvh bg-page">
        <header className="fixed inset-x-0 top-0 z-40 border-b border-line bg-surface">
          <Navbar userName={userName} role={role} onOpenMenu={() => setDrawerOpen(true)} />
        </header>

        <aside className="fixed bottom-0 left-0 top-navbar z-30 hidden w-sidebar border-r border-line bg-surface lg:block">
          <Sidebar role={role} pathname={pathname} />
        </aside>

        {drawerOpen ? (
          <div className="fixed inset-0 z-50 lg:hidden">
            {/* Permukaan transparan penangkap klik: tutup laci dengan klik di luar. */}
            <button
              type="button"
              aria-label="Tutup menu"
              onClick={() => setDrawerOpen(false)}
              className="absolute inset-0 bg-overlay"
            />
            <div className="absolute bottom-0 left-0 top-0 w-sidebar border-r border-line bg-surface">
              <div className="flex h-navbar items-center justify-end px-4">
              <Button
                variant="tertiary"
                size="icon"
                aria-label="Tutup menu"
                onClick={() => setDrawerOpen(false)}
                leftIcon={<CloseIcon size={24} />}
              />
              </div>
              <Sidebar role={role} pathname={pathname} onNavigate={() => setDrawerOpen(false)} />
            </div>
          </div>
        ) : null}

        <div className="pt-navbar lg:pl-sidebar">
          <main id="konten" className="mx-auto max-w-content px-4 py-4 sm:px-5 sm:py-5">
            {children}
          </main>
        </div>
      </div>
    </ToastProvider>
  );
}
