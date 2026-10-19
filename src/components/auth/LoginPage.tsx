"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

import { Banner } from "@/components/ui/Banner";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { FormField, Select } from "@/components/ui/FormField";
import { Skeleton } from "@/components/ui/Skeleton";
import { ApiError } from "@/lib/api/client";
import { listAccounts, login } from "@/lib/api/auth";
import { ROLE_LABEL, homeFor } from "@/lib/auth/constants";
import type { Account } from "@/lib/types";

/** Halaman masuk: satu-satunya layar tanpa navbar (Panduan UI 4 · Struktur halaman). */
export function LoginPage() {
  const router = useRouter();
  const [accounts, setAccounts] = useState<Account[] | null>(null);
  const [employeeId, setEmployeeId] = useState("");
  const [loadError, setLoadError] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const load = useCallback(async () => {
    setLoadError(null);
    try {
      const data = await listAccounts();
      setAccounts(data);
      setEmployeeId((current) => current || (data[0]?.id ?? ""));
    } catch (caught) {
      setLoadError(caught instanceof ApiError ? caught.message : "Gagal memuat daftar akun.");
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const session = await login(employeeId);
      router.replace(homeFor(session.role));
      router.refresh();
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : "Koneksi terputus. Coba lagi.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main id="konten" className="flex min-h-dvh items-center justify-center bg-page p-4">
      <div className="w-full max-w-card">
        <p className="text-h3 text-text">Araya Business Hub</p>
        <p className="mt-1 text-body text-muted">Modul Kehadiran</p>

        <Card className="mt-5 flex flex-col gap-5 p-5">
          <div>
            <h1 className="text-h2 text-text">Masuk</h1>
            <p className="mt-2 text-body text-muted">Pilih akun untuk melanjutkan.</p>
          </div>

          {loadError ? <Banner message={loadError} onRetry={() => void load()} /> : null}

          {accounts === null ? (
            <div className="flex flex-col gap-2">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-control w-full" />
            </div>
          ) : (
            <form onSubmit={onSubmit} noValidate className="flex flex-col gap-5">
              {error ? <Banner message={error} /> : null}

              <FormField id="employeeId" label="Akun" required>
                <Select
                  value={employeeId}
                  onChange={(event) => setEmployeeId(event.target.value)}
                >
                  {accounts.map((account) => (
                    <option key={account.id} value={account.id}>
                      {account.name} · {ROLE_LABEL[account.role]}
                    </option>
                  ))}
                </Select>
              </FormField>

              <Button type="submit" loading={submitting} loadingText="Masuk…" className="w-full">
                Masuk
              </Button>
            </form>
          )}
        </Card>

        <p className="mt-4 text-caption text-muted">
          Mode demo: masuk tanpa kata sandi, akun diambil dari data contoh. Di BE asli diganti SSO/token.
        </p>
      </div>
    </main>
  );
}
