"use client";
import { useCallback, useEffect, useState } from "react";

import { Banner } from "@/components/ui/Banner";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { FormField, Input } from "@/components/ui/FormField";
import { PageHeader } from "@/components/ui/PageHeader";
import { useToast } from "@/components/ui/Toast";
import { ApiError } from "@/lib/api/client";
import { getWorkingHours, saveWorkingHours } from "@/lib/api/kehadiran";

/** M13-US1 — HR: set aturan jam kerja global via POST /api/working-hours. */
export function WorkSettingsForm() {
  const { push } = useToast();
  const [jamMasuk, setJamMasuk] = useState("08:00");
  const [jamPulang, setJamPulang] = useState("17:00");
  const [toleransi, setToleransi] = useState(15);
  const [saving, setSaving] = useState(false);
  const [jamPulangError, setJamPulangError] = useState<string | null>(null);
  const [aturanAktif, setAturanAktif] = useState<{ jam: string; toleransi: number } | null>(null);
  const [aturanMendatang, setAturanMendatang] = useState<{ jam: string; toleransi: number; mulai: string } | null>(null);
  const [aturanBelumAda, setAturanBelumAda] = useState(false);
  // Muat aturan berlaku dari BE (GET /api/working-hours) untuk ditampilkan
  // dan dipakai sebagai prefill form. 404 = belum pernah diatur.
  const muatAturan = useCallback(() => {
    getWorkingHours()
      .then((rule) => {
        if (rule?.workStart) setJamMasuk(rule.workStart.slice(0, 5));
        if (rule?.workEnd) setJamPulang(rule.workEnd.slice(0, 5));
        if (typeof rule?.lateToleranceMinutes === "number") setToleransi(rule.lateToleranceMinutes);
        if (rule?.workStart && rule?.workEnd) {
          setAturanAktif({
            jam: `${rule.workStart.slice(0, 5)} – ${rule.workEnd.slice(0, 5)}`,
            toleransi: rule.lateToleranceMinutes ?? 0,
          });
        }
        if (rule?.mendatang?.workStart && rule.mendatang.workEnd) {
          setAturanMendatang({
            jam: `${rule.mendatang.workStart.slice(0, 5)} – ${rule.mendatang.workEnd.slice(0, 5)}`,
            toleransi: rule.mendatang.lateToleranceMinutes ?? 0,
            mulai: rule.mendatang.berlakuMulai ?? "",
          });
        }
      })
      .catch((caught) => {
        if (caught instanceof ApiError && caught.status === 404) setAturanBelumAda(true);
      });
  }, []);

  useEffect(() => {
    muatAturan();
  }, [muatAturan]);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    // AC M13-US1 #2: jam pulang lebih awal dari jam masuk harus ditolak.
    // BE juga menolak (HTTP 400), tapi dicek di sini supaya tidak tampak seperti error server.
    if (jamPulang <= jamMasuk) {
      setJamPulangError("Jam pulang harus lebih lambat dari jam masuk.");
      return;
    }
    setJamPulangError(null);

    setSaving(true);
    try {
      const result = await saveWorkingHours({
        jam_masuk: jamMasuk,
        jam_pulang: jamPulang,
        toleransi_keterlambatan: toleransi,
      });
      push({ variant: "success", title: "Simpan berhasil", description: result.message });
      // Muat ulang agar banner aturan berlaku / terjadwal ikut terbarui.
      muatAturan();
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

      {aturanAktif ? (
        <Banner
          variant="info"
          message={`Aturan berlaku saat ini: jam kerja ${aturanAktif.jam} WIB, toleransi keterlambatan ${aturanAktif.toleransi} menit. Perubahan yang disimpan berlaku mulai besok agar presensi hari ini tidak berubah.`}
        />
      ) : aturanBelumAda ? (
        <Banner
          variant="info"
          message="Belum ada aturan jam kerja yang diatur. Isi form di bawah lalu simpan untuk menetapkannya."
        />
      ) : null}

      {aturanMendatang ? (
        <Banner
          variant="pending"
          message={`Perubahan terjadwal${aturanMendatang.mulai ? ` mulai ${aturanMendatang.mulai}` : ""}: jam kerja ${aturanMendatang.jam} WIB, toleransi ${aturanMendatang.toleransi} menit. Simpan lagi untuk mengubah jadwal ini.`}
        />
      ) : null}

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

            <FormField id="jam-pulang" label="Jam pulang" required error={jamPulangError ?? undefined}>
              <Input
                id="jam-pulang"
                type="time"
                value={jamPulang}
                aria-invalid={Boolean(jamPulangError) || undefined}
                onChange={(event) => {
                  setJamPulang(event.target.value);
                  setJamPulangError(null);
                }}
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
