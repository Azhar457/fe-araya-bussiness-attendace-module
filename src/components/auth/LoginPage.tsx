"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { Banner } from "@/components/ui/Banner";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { FormField, Input } from "@/components/ui/FormField";
import { ApiError } from "@/lib/api/client";
import { login } from "@/lib/api/kehadiran";
import { DEMO_COOKIE, TOKEN_COOKIE, homeFor } from "@/lib/auth/constants";

/**
 * Halaman masuk M13: login ke M12 (Kel. C3) — satu-satunya sumber identitas &
 * role di ERP. M13 tidak lagi punya endpoint auth sendiri.
 *
 *  - Endpoint: POST /api/m12/auth/login (proxy same-origin → M12 /api/login)
 *  - Field: email + password (sesuai M12, bukan NIK)
 *  - Respons: { token, role: "Admin HR" | "Employee", employee_id, name, nik }
 *  - Token disimpan di cookie non-HttpOnly `araya_token` → dipakai
 *    `Authorization: Bearer <token>` di semua endpoint M12 & M13
 *  - Role dinormalisasi: "Admin HR" → admin_hr, "Employee" → karyawan
 */
function setCookie(name: string, value: string) {
  document.cookie = `${name}=${encodeURIComponent(value)}; path=/; max-age=43200; samesite=lax`;
}

function normalizeRole(rawRole: string): "admin_hr" | "karyawan" {
  // M12 mengirim "Admin HR" / "Employee" (sesuai dok Swagger). Defensif:
  // terima juga bentuk kecil/sering muncul di respons JSON lain.
  const r = (rawRole ?? "").trim().toLowerCase();
  if (r.includes("hr") || r.includes("admin")) return "admin_hr";
  return "karyawan";
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
      const result = await login(email.trim(), password);
      setCookie(TOKEN_COOKIE, result.token);
      // Bersihkan jalur demo bila ada.
      document.cookie = `${DEMO_COOKIE}=; path=/; max-age=0`;
      // M12 kirim `role` ("Admin HR" | "Employee"). FE M13 normalisasi ke
      // `Role` (admin_hr | karyawan). `homeFor` lalu menentukan halaman awal.
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

  function goDemo(kind: "user" | "hr") {
    // /user dan /hr: route handler server set cookie demo `araya_demo`
    // lalu redirect ke halaman utama sesuai role.
    router.push(kind === "user" ? "/user" : "/hr");
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
                autoComplete="email"
                placeholder="nama@araya.com"
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

          {/* Jalur demo untuk showcase — tanpa nunggu login M12/M13 sehat. */}
          <div className="flex flex-col gap-2 border-t border-line pt-4">
            <p className="text-caption text-muted">Akses cepat demo (showcase):</p>
            <div className="grid grid-cols-2 gap-3">
              <Button variant="secondary" onClick={() => goDemo("user")}>Masuk sebagai Karyawan</Button>
              <Button variant="secondary" onClick={() => goDemo("hr")}>Masuk sebagai Admin HR</Button>
            </div>
          </div>
        </div>
      </Card>
    </main>
  );
}
