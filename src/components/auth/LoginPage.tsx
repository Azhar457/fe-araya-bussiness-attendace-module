"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { Banner } from "@/components/ui/Banner";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { FormField, Input } from "@/components/ui/FormField";
import { ApiError } from "@/lib/api/client";
import { m12Login, normalizeRole } from "@/lib/api/kehadiran";
import { TOKEN_COOKIE, homeFor } from "@/lib/auth/constants";

/**
 * Halaman masuk M13 — login ke M12 (Kel. C3) via proxy FE
 * `POST /api/m12/auth/login`, lalu token M12 disimpan di cookie
 * `araya_token` dan dikirim ke semua endpoint BE M13.
 *
 *  - Endpoint: POST /api/m12/auth/login (proxy → M12 /api/login)
 *  - Field: email + password
 *  - Respons: { success, token, role, employee_id, name, nik, ... }
 *  - Role M12 ("Admin HR" | "Employee") dinormalisasi ke Role FE.
 */
function setCookie(name: string, value: string, maxAge = 43200) {
  document.cookie = `${name}=${encodeURIComponent(value)}; path=/; max-age=${maxAge}; samesite=lax`;
}

export function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!email.trim() || !password) {
      setError("Email dan password wajib diisi.");
      return;
    }

    setError(null);
    setSubmitting(true);
    try {
      const result = await m12Login(email.trim(), password);
      setCookie(TOKEN_COOKIE, result.token);
      const role = normalizeRole(result.role);
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
            <FormField id="masuk-email" label="Email">
              <Input
                id="masuk-email"
                type="email"
                autoComplete="username"
                placeholder="hr@araya.com"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
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
