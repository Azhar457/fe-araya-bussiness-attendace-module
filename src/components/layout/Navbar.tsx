"use client";

import { usePathname } from "next/navigation";
import { useEffect } from "react";

import { AccountMenu } from "@/components/layout/AccountMenu";
import { useSearch } from "@/components/layout/search-context";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/FormField";
import { MenuIcon, SearchIcon } from "@/components/ui/Icons";
import type { Role } from "@/lib/types";

export type NavbarProps = {
  userName: string;
  role: Role;
  onOpenMenu: () => void;
};

export function Navbar({ userName, role, onOpenMenu }: NavbarProps) {
  const pathname = usePathname();
  const { query, setQuery, target } = useSearch();

  // Pencarian mulai kosong setiap pindah halaman.
  useEffect(() => {
    setQuery("");
  }, [pathname, setQuery]);

  return (
    <div className="flex h-navbar items-center gap-4 px-4">
      <Button
        variant="tertiary"
        size="icon"
        aria-label="Buka menu"
        leftIcon={<MenuIcon size={24} />}
        className="lg:hidden"
      />

      <p className="text-h3 whitespace-nowrap text-text">Araya Business Hub</p>

      {/* Halaman yang tidak punya daftar tidak menampilkan kolom cari (tidak ada kontrol mati). */}
      {target ? (
        <div className="mx-auto hidden max-w-form flex-1 items-center md:flex">
          <label htmlFor="global-search" className="sr-only">
            {target}
          </label>
          <span className="relative flex w-full items-center">
            <span className="absolute left-3 text-muted" aria-hidden>
              <SearchIcon size={20} />
            </span>
            <Input
              id="global-search"
              type="search"
              placeholder={target}
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              className="pl-6"
            />
          </span>
        </div>
      ) : null}

      <div className="ml-auto flex items-center gap-3">
        <AccountMenu userName={userName} role={role} />
      </div>
    </div>
  );
}
