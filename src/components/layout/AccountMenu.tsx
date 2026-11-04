"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

import { m12Logout } from "@/lib/api/kehadiran";
import { M13_TOKEN_COOKIE, ROLE_LABEL, TOKEN_COOKIE } from "@/lib/auth/constants";
import type { Role } from "@/lib/types";

/** Menu akun di kanan navbar (Panduan UI 4 · Kerangka halaman). */
export function AccountMenu({ userName, role }: { userName: string; role: Role }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const wrapper = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onPointerDown(event: MouseEvent) {
      if (!wrapper.current?.contains(event.target as Node)) setOpen(false);
    }
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  function onLogout() {
    setBusy(true);
    // Cabut token di M12; cookie tetap dihapus walau panggilan gagal.
    m12Logout().catch(() => undefined);
    document.cookie = `${TOKEN_COOKIE}=; path=/; max-age=0`;
    document.cookie = `${M13_TOKEN_COOKIE}=; path=/; max-age=0`;
    router.push("/login");
    router.refresh();
  }

  return (
    <div ref={wrapper} className="relative">
      <button
        type="button"
        aria-expanded={open}
        aria-haspopup="menu"
        onClick={() => setOpen((value) => !value)}
        className="flex items-center gap-2 rounded-sm py-1 pl-1 pr-2 text-body text-text hover:bg-surface-2"
      >
        <span
          aria-hidden
          className="flex size-6 items-center justify-center rounded-full bg-primary-soft text-caption font-semibold text-primary"
        >
          {userName.charAt(0)}
        </span>
        <span className="hidden whitespace-nowrap sm:inline">{userName}</span>
      </button>

      {open ? (
        <div
          role="menu"
          aria-label="Akun"
          className="absolute right-0 top-[calc(100%+0.5rem)] z-50 w-56 rounded-lg border border-line bg-surface p-2 shadow"
        >
          <div className="px-2 py-2">
            <p className="text-label text-text">{userName}</p>
            <p className="text-caption text-muted">{ROLE_LABEL[role]}</p>
          </div>
          <div className="my-1 h-px bg-line" />
          <button
            type="button"
            role="menuitem"
            onClick={onLogout}
            disabled={busy}
            className="flex h-control-sm w-full items-center rounded-sm px-2 text-left text-body text-text hover:bg-surface-2 disabled:text-muted"
          >
            {busy ? "Keluar…" : "Keluar"}
          </button>
        </div>
      ) : null}
    </div>
  );
}
