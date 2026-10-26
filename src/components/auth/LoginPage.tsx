"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

import { Banner } from "@/components/ui/Banner";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { FormField, Input, Select } from "@/components/ui/FormField";
import { getKaryawanAktif } from "@/lib/api/kehadiran";
import { EMPLOYEE_COOKIE, NAME_COOKIE, ROLE_COOKIE, ROLE_LABEL, homeFor } from "@/lib/auth/constants";
import type { M12Employee, Role } from "@/lib/types";

/**
 * Halaman masuk.
 *
 * Tidak ada US login di SSOT dan tidak ada endpoint auth di M12/M13, jadi
 * identitas dipilih dari daftar karyawan aktif M12 (pull). Peran ditentukan
 * pengguna karena M12 hanya menyimpan `jabatan` sebagai teks bebas.
 *
 * shortcut: cookie non-HttpOnly, bisa diubah dari browser.
 * Ganti ke token/SSO begitu platform menyediakannya.
 */

/** Tebak peran dari teks jabatan M12 (datanya tidak konsisten: "HR", "SDm", "SDM"). */
function guessRole(jabatan: string): Role {
  return /hr|sdm/i.test(jabatan) ? "admin_hr" : "karyawan";
}

function setCookie(name: string, value: string) {
  document.cookie = `${name}=${encodeURIComponent(value)}; path=/; max-age=43200; samesite=lax`;
}

export function LoginPage() {
  const router = useRouter();
  const [employees, setEmployees] = useState<M12Employee[]>([]);
  const [notice, setNotice] = useState<string | null>(null);
  const [employeeId, setEmployeeId] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    let alive = true;
    void getKaryawanAktif()
      .then((result) => {
        if (!alive) return;
        setEmployees(result.data);
        if (result.error) setNotice(result.error);
        if (result.data.length > 0) setEmployeeId(String(result.data[0].id));
      })
      .catch(() => {
        if (alive) setNotice("Daftar karyawan tidak dapat dimuat. Isi ID manual.");
      });
    return () => {
      alive = false;
    };
  }, []);

  const selected = useMemo(
    () => employees.find((item) => String(item.id) === employeeId) ?? null,
    [employees, employeeId],
  );

  // Peran mengikuti data karyawan, bukan pilihan bebas pengguna.
  const role: Role = selected ? guessRole(selected.jabatan) : "karyawan";

  function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const id = employeeId.trim();
    if (!/^\d+$/.test(id)) {
      setError("ID karyawan harus berupa angka.");
      return;
    }

    setSubmitting(true);
    setCookie(EMPLOYEE_COOKIE, id);
    setCookie(ROLE_COOKIE, selected ? guessRole(selected.jabatan) : "karyawan");
    setCookie(NAME_COOKIE, selected?.nama ?? `Karyawan #${id}`);
    router.replace(homeFor(role));
    router.refresh();
  }

  return (
    <main id="konten" className="flex min-h-dvh items-center justify-center bg-page p-4">
      <Card className="w-full max-w-[520px] overflow-hidden">
        <div className="bg-primary px-6 py-5">
          <h1 className="text-h1 text-on-primary">Araya Business Hub</h1>
          <p className="text-body text-on-primary/70">Modul Kehadiran</p>
        </div>

        <form onSubmit={onSubmit} className="flex flex-col gap-4 p-5 sm:p-6">
          <div>
            <h2 className="text-h2 text-text">Masuk</h2>
            <p className="mt-1 text-body text-muted">
              Pilih karyawan untuk melanjutkan.
            </p>
          </div>

          {notice ? <Banner variant="info" message={notice} /> : null}
          {error ? <Banner variant="danger" message={error} /> : null}

          {employees.length > 0 ? (
            <FormField id="karyawan" label="Karyawan" required>
              <Select
                id="karyawan"
                value={employeeId}
                onChange={(event) => setEmployeeId(event.target.value)}
              >
                {employees.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.nama} · {item.jabatan} · {item.divisi}
                  </option>
                ))}
              </Select>
            </FormField>
          ) : (
            <FormField id="karyawan-id" label="ID karyawan" hint="Angka, sesuai X-Employee-Id" required>
              <Input
                id="karyawan-id"
                inputMode="numeric"
                value={employeeId}
                onChange={(event) => setEmployeeId(event.target.value)}
                placeholder="101"
              />
            </FormField>
          )}

          <div className="flex items-center gap-3 rounded-lg border border-line bg-surface-2 px-3 py-2.5">
            <span className="text-caption text-muted">Hak akses</span>
            <span className="ml-auto rounded-full bg-primary-soft px-3 py-1 text-caption font-semibold text-primary">
              {ROLE_LABEL[role]}
            </span>
          </div>
          <p className="-mt-1 text-caption text-muted">
            {role === "admin_hr"
              ? "Akses penuh: pengaturan jam kerja dan rekap seluruh tim."
              : "Akses presensi harian, pengajuan izin/sakit, dan rekap pribadi."}
          </p>

          <Button type="submit" loading={submitting} loadingText="Masuk…" className="w-full">
            Masuk
          </Button>

          <p className="text-caption text-muted">
            Pilih nama Anda dan peran akses. Sesi berlaku 12 jam, setelah itu Anda perlu masuk
            kembali.
          </p>
        </form>
      </Card>
    </main>
  );
}
