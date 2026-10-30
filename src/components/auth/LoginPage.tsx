"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { Banner } from "@/components/ui/Banner";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { FormField, Input } from "@/components/ui/FormField";
import { ApiError } from "@/lib/api/client";
import { login } from "@/lib/api/kehadiran";
import { TOKEN_COOKIE, homeFor } from "@/lib/auth/constants";

/**
 * Halaman masuk M13: login ke BE M13 (nik + password → Bearer token).
 *
 *  - Endpoint: POST /api/auth/login (BE M13 langsung)
 *  - Field: nik + password
 *  - Respons: { token, user: { karyawanId, nik, nama, role, jabatan, divisi }, expiresIn }
 *  - Token disimpan di cookie non-HttpOnly `araya_token` → dipakai
 *    `Authorization: Bearer <token>` di semua endpoint BE M13
 */
function setCookie(name: string, value: string, maxAge = 43200) {
  document.cookie = `${name}=${encodeURIComponent(value)}; path=/; max-age=${maxAge}; samesite=lax`;
}

export function LoginPage() {
  const router = useRouter();
  const [nik, setNik] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!nik.trim() || !password) {
      setError("NIK dan password wajib diisi.");
      return;
    }

    setError(null);
    setSubmitting(true);
    try {
      const result = await login(nik.trim(), password);
      setCookie(TOKEN_COOKIE, result.token, result.expiresIn);
      // BE M13 sudah mengirim `role` yang benar ("admin_hr" | "karyawan").
      const role = result.user.role;
      router.replace(homeFor(role));
      router.refresh();
    } catch (caught) {
      setError(
        caught instanceof ApiError ? caught.message : "Tidak dapat masuk. Coba lagi.",
      );
      setSubmitting(false);
    }
  }

  return (
    <main id="konten" className="flex min-h-dvh items-center justify-center bg-page p-4">
      <Card className="w-full max-w-form">
        <div className="bg-primary px-6 py-5">
          <h1 className="text-h1 text-on-primary">Araya Business Hub</h1>
          <p className="text-body text-on-primary/70">Modul Kehadiran</p>
        </div>

        <div className="flex flex-col gap-5 p-5 sm:p-6">
          {error ? <Banner variant="danger" message={error} /> : null}

          <form onSubmit={onSubmit} className="flex flex-col gap-4">
            <FormField id="masuk-nik" label="NIK">
              <Input
                id="masuk-nik"
                type="text"
                autoComplete="username"
                placeholder="EMP101"
                value={nik}
                onChange={(event) => setNik(event.target.value)}
              />
            </FormField>

            <FormField id="masuk-password" label="Password">
              <Input
                id="masuk-password"
                type="password"
                autoComplete="current-password"
                placeholder="••••••••"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
              />
            </FormField>

            <Button
              type="submit"
              variant="primary"
              loading={submitting}
              loadingText="Memproses…"
              className="w-full"
            >
              Masuk
            </Button>
          </form>
        </div>
      </Card>
    </main>
  );
}
