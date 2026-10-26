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
 * Halaman masuk: NIK + password diverifikasi BE (`POST /api/auth/login`).
 * Peran tidak dipilih pengguna — BE mengirim peran milik akun.
 *
 * shortcut: token disimpan di cookie non-HttpOnly agar bisa dipakai fetch di
 * browser. Lindungi dari XSS; pindah ke route handler + cookie HttpOnly kalau
 * semua panggilan BE diproksikan lewat server.
 */
function setCookie(name: string, value: string) {
  document.cookie = `${name}=${encodeURIComponent(value)}; path=/; max-age=43200; samesite=lax`;
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
      setCookie(TOKEN_COOKIE, result.token);
      router.replace(homeFor(result.user.role));
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
      <Card className="w-full max-w-[520px] overflow-hidden">
        <div className="bg-primary px-6 py-5">
          <h1 className="text-h1 text-on-primary">Araya Business Hub</h1>
          <p className="text-body text-on-primary/70">Modul Kehadiran</p>
        </div>

        <form onSubmit={onSubmit} className="flex flex-col gap-4 p-5 sm:p-6">
          <div>
            <h2 className="text-h2 text-text">Masuk</h2>
            <p className="mt-1 text-body text-muted">
              Gunakan NIK dan password akun kepegawaian Anda.
            </p>
          </div>

          {error ? <Banner variant="danger" message={error} /> : null}

          <FormField id="nik" label="NIK" required>
            <Input
              id="nik"
              name="nik"
              autoComplete="username"
              autoCapitalize="characters"
              value={nik}
              onChange={(event) => setNik(event.target.value)}
              placeholder="EMP029"
            />
          </FormField>

          <FormField id="password" label="Password" required>
            <Input
              id="password"
              name="password"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="••••••••"
            />
          </FormField>

          <Button
            type="submit"
            loading={submitting}
            loadingText="Memeriksa…"
            className="w-full"
          >
            Masuk
          </Button>

          <p className="text-caption text-muted">
            Peran dan hak akses mengikuti akun Anda. Sesi berlaku 12 jam, setelah itu Anda perlu
            masuk kembali.
          </p>
        </form>
      </Card>
    </main>
  );
}
