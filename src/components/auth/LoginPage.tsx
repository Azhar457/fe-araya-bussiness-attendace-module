"use client";

import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { AlertIcon } from "@/components/ui/Icons";

/**
 * Halaman masuk — menunggu endpoint login dari BE.
 * Tidak ada daftar akun demo: setelah Ikmal menambah `POST /api/auth/login`
 * (atau SSO/token), form login diisi di sini (nama + role → cookie `araya_employee`).
 */
export function LoginPage() {
  return (
    <main id="konten" className="flex min-h-dvh items-center justify-center bg-page p-4">
      <Card className="w-full max-w-[520px] overflow-hidden">
        {/* Header merek */}
        <div className="bg-primary px-6 py-5">
          <h1 className="text-h1 text-on-primary">Araya Business Hub</h1>
          <p className="text-body text-on-primary/70">Modul Kehadiran</p>
        </div>

        <div className="flex flex-col gap-4 p-5 sm:p-6">
          <div className="flex items-start gap-3 rounded-lg bg-warning-bg p-4">
            <AlertIcon aria-hidden className="mt-0.5 shrink-0 text-pending-fg" />
            <div className="flex flex-col gap-1">
              <p className="text-label text-text">Endpoint login belum tersedia di BE</p>
              <p className="text-body text-muted">
                Halaman ini menunggu `POST /api/auth/login` dari backend.
                Setelah endpoint tersedia, form masuk (kredensial → sesi)
                akan dipasang di sini.
              </p>
            </div>
          </div>

          <p className="text-caption text-muted">
            Status: menunggu kontrak login dari tim BE (Ikmal).
          </p>

          <Button variant="secondary" className="w-full" disabled>
            Masuk — menunggu endpoint BE
          </Button>
        </div>
      </Card>
    </main>
  );
}
