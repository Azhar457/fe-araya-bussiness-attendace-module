"use client";

import { useState } from "react";

import { Banner } from "@/components/ui/Banner";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { FormField, Input } from "@/components/ui/FormField";
import { PageHeader } from "@/components/ui/PageHeader";
import { useToast } from "@/components/ui/Toast";
import { ApiError } from "@/lib/api/client";
import { saveWorkingHours } from "@/lib/api/kehadiran";

/** M13-US1 — HR: set aturan jam kerja global via POST /api/working-hours. */
export function WorkSettingsForm() {
  const { push } = useToast();
  const [jamMasuk, setJamMasuk] = useState("08:00");
  const [jamPulang, setJamPulang] = useState("17:00");
  const [toleransi, setToleransi] = useState(15);
  const [saving, setSaving] = useState(false);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    try {
      const result = await saveWorkingHours({
        jam_masuk: jamMasuk,
        jam_pulang: jamPulang,
        toleransi_keterlambatan: toleransi,
      });
      push({ variant: "success", title: "Simpan berhasil", description: result.message });
    } catch (caught) {
      push({
        variant: "danger",
        title: "Gagal menyimpan",
        description: caught instanceof ApiError ? caught.message : "Koneksi terputus. Coba lagi.",
      });
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        breadcrumb={[{ label: "Kehadiran" }, { label: "Pengaturan jam kerja" }]}
        title="Pengaturan jam kerja"
      />

      <Banner
        variant="info"
        message="Aturan tidak dapat dimuat (endpoint GET belum ada); isi nilai baru lalu simpan."
      />

      <Card className="p-5 sm:p-6">
        <form onSubmit={onSubmit} className="flex flex-col gap-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <FormField id="jam-masuk" label="Jam masuk" required>
              <Input
                id="jam-masuk"
                type="time"
                value={jamMasuk}
                onChange={(event) => setJamMasuk(event.target.value)}
              />
            </FormField>

            <FormField id="jam-pulang" label="Jam pulang" required>
              <Input
                id="jam-pulang"
                type="time"
                value={jamPulang}
                onChange={(event) => setJamPulang(event.target.value)}
              />
            </FormField>

            <FormField
              id="toleransi"
              label="Toleransi keterlambatan"
              hint="Maksimal 60 menit"
            >
              <Input
                id="toleransi"
                type="number"
                min={0}
                max={60}
                value={toleransi}
                onChange={(event) => setToleransi(Number(event.target.value))}
              />
            </FormField>
          </div>

          <div className="flex justify-end">
            <Button type="submit" loading={saving} loadingText="Menyimpan…">
              Simpan aturan
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
