"use client";

import Link from "next/link";
import { useState } from "react";

import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { FormField, Input, RadioGroup, Textarea } from "@/components/ui/FormField";
import { PageHeader } from "@/components/ui/PageHeader";
import { useToast } from "@/components/ui/Toast";
import { ApiError } from "@/lib/api/client";
import { createAbsenceRequest } from "@/lib/api/kehadiran";
import { homeFor } from "@/lib/auth/constants";
import { formatDate } from "@/lib/format";
import { REASON_MAX, validateAbsence, type AbsenceInput, type FieldErrors } from "@/lib/validation";
import type { AbsenceType } from "@/lib/types";

const TYPE_OPTIONS = [
  { value: "izin", label: "Izin" },
  { value: "sakit", label: "Sakit" },
];

const EMPTY_FORM: AbsenceInput = { type: "izin", startDate: "", endDate: "", reason: "" };

/** M13-US3 — form pengajuan. Riwayat dipisah ke /kehadiran/izin/riwayat. */
export function AbsenceFormPage() {
  const { push } = useToast();
  const [form, setForm] = useState<AbsenceInput>(EMPTY_FORM);
  const [errors, setErrors] = useState<FieldErrors<AbsenceInput>>({});
  const [submitting, setSubmitting] = useState(false);

  function validateField(field: keyof AbsenceInput) {
    const all = validateAbsence(form);
    setErrors((prev) => ({ ...prev, [field]: all[field] }));
  }

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const fieldErrors = validateAbsence(form);
    setErrors(fieldErrors);
    if (Object.keys(fieldErrors).length > 0) return;

    setSubmitting(true);
    try {
      const created = await createAbsenceRequest({ ...form, reason: form.reason.trim() });
      setForm(EMPTY_FORM);
      setErrors({});
      push({
        variant: "success",
        title: "Pengajuan terkirim",
        description: `${created.type === "izin" ? "Izin" : "Sakit"} ${formatDate(created.startDate)} menunggu persetujuan.`,
      });
    } catch (error) {
      if (error instanceof ApiError && error.fields) {
        setErrors(error.fields as FieldErrors<AbsenceInput>);
      }
      push({
        variant: "danger",
        title: "Pengajuan gagal dikirim",
        description: error instanceof ApiError ? error.message : "Koneksi terputus. Coba lagi.",
      });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        breadcrumb={[{ label: "Kehadiran", href: homeFor("karyawan") }, { label: "Izin & sakit" }]}
        title="Ajukan izin atau sakit"
      />

      <div className="grid items-start gap-5 lg:grid-cols-2">
        <form onSubmit={onSubmit} noValidate>
          <Card className="flex flex-col gap-5 p-5">
            <RadioGroup
              id="jenis"
              name="jenis"
              legend="Jenis"
              required
              options={TYPE_OPTIONS}
              value={form.type}
              onChange={(value) => setForm({ ...form, type: value as AbsenceType })}
              error={errors.type}
            />

            <FormField id="startDate" label="Tanggal mulai" required error={errors.startDate}>
              <Input
                type="date"
                value={form.startDate}
                onChange={(event) => setForm({ ...form, startDate: event.target.value })}
                onBlur={() => validateField("startDate")}
              />
            </FormField>

            <FormField id="endDate" label="Tanggal selesai" required error={errors.endDate}>
              <Input
                type="date"
                value={form.endDate}
                onChange={(event) => setForm({ ...form, endDate: event.target.value })}
                onBlur={() => validateField("endDate")}
              />
            </FormField>

            <FormField
              id="reason"
              label="Alasan"
              required
              error={errors.reason}
              hint={
                <span className="tabular-nums">
                  {form.reason.length}/{REASON_MAX}
                </span>
              }
            >
              <Textarea
                rows={4}
                maxLength={REASON_MAX}
                value={form.reason}
                placeholder="Tulis alasan singkat, misalnya keperluan keluarga."
                onChange={(event) => setForm({ ...form, reason: event.target.value })}
                onBlur={() => validateField("reason")}
              />
            </FormField>

            {/* Tombol di dalam kartu form (Panduan UI 3 · Form). */}
            <div className="flex justify-end gap-3 border-t border-line pt-5">
              <Button
                type="button"
                variant="secondary"
                disabled={submitting}
                onClick={() => {
                  setForm(EMPTY_FORM);
                  setErrors({});
                }}
              >
                Batal
              </Button>
              <Button type="submit" loading={submitting} loadingText="Mengirim…">
                Kirim pengajuan
              </Button>
            </div>
          </Card>
        </form>

        <Card className="flex flex-col gap-3 p-5">
          <h2 className="text-h3 text-text">Aturan pengajuan</h2>
          <ul className="flex list-disc flex-col gap-2 pl-5 text-body text-muted">
            <li>Pengajuan izin atau sakit wajib punya tanggal dan alasan.</li>
            <li>Status awal selalu Menunggu, diproses Admin HR.</li>
            <li>Hari izin dan sakit dihitung di rekap bulanan hanya setelah disetujui.</li>
            <li>Pengajuan yang masih Menunggu bisa dibatalkan dari riwayat.</li>
          </ul>
          <Link href="/kehadiran/izin/riwayat" className="mt-2 text-label text-primary">
            Lihat riwayat pengajuan
          </Link>
        </Card>
      </div>
    </div>
  );
}
