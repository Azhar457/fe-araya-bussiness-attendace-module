import { Button } from "@/components/ui/Button";
import { Input, Select } from "@/components/ui/FormField";
import { MenuIcon, SearchIcon } from "@/components/ui/Icons";
import { ROLE_COOKIE, ROLE_LABEL } from "@/lib/auth/constants";
import type { Role } from "@/lib/types";

export type NavbarProps = {
  userName: string;
  role: Role;
  onOpenMenu: () => void;
};

export function Navbar({ userName, role, onOpenMenu }: NavbarProps) {
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

      <div className="mx-auto hidden max-w-form flex-1 items-center md:flex">
        <label htmlFor="global-search" className="sr-only">
          Cari
        </label>
        <span className="relative flex w-full items-center">
          <span className="absolute left-3 text-muted" aria-hidden>
            <SearchIcon size={20} />
          </span>
          <Input
            id="global-search"
            type="search"
            disabled
            placeholder="Cari…"
            className="pl-6"
          />
        </span>
      </div>

      <div className="ml-auto flex items-center gap-3">
        {/* Simulasi session: penukar peran hanya ada saat mode mock. */}
        <label htmlFor="role-switcher" className="sr-only">
          Peran (demo)
        </label>
        <Select
          id="role-switcher"
          defaultValue={role}
          onChange={(event) => {
            document.cookie = `${ROLE_COOKIE}=${event.target.value}; path=/; max-age=604800`;
            window.location.reload();
          }}
          className="w-auto text-caption"
        >
          <option value="admin_hr">Admin HR</option>
          <option value="karyawan">Karyawan</option>
        </Select>

        <div className="flex items-center gap-2">
          <span className="hidden text-caption text-muted sm:inline">
            {userName} · {ROLE_LABEL[role]}
          </span>
          <span
            aria-hidden
            className="flex size-6 items-center justify-center rounded-full bg-primary-soft text-caption font-semibold text-primary"
          >
            {userName.charAt(0)}
          </span>
        </div>
      </div>
    </div>
  );
}
