"use client";

import { useCallback, useEffect, useState } from "react";

import { Banner } from "@/components/ui/Banner";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { FormField, Input } from "@/components/ui/FormField";
import { PageHeader } from "@/components/ui/PageHeader";
import { Skeleton } from "@/components/ui/Skeleton";
import { useToast } from "@/components/ui/Toast";
import { ApiError } from "@/lib/api/client";
import { getWorkSettings, updateWorkSettings } from "@/lib/api/kehadiran";
import { homeFor } from "@/lib/auth/constants";
import { formatDateTime } from "@/lib/format";
import { validateWorkSettings, type FieldErrors, type WorkSettingsInput } from "@/lib/validation";

type FormState = { workStart: string; workEnd: string; lateToleranceMinutes: string };

const EMPTY: FormState = { workStart: "", workEnd: "", lateToleranceMinutes: "" };

function toInput(form: FormState): Partial<WorkSettingsInput> {
  return {
    workStart: form.workStart,
    workEnd: form.workEnd,
    lateToleranceMinutes: form.lateToleranceMinutes.trim() === "" ? undefined : Number(form.lateToleranceMinutes),
  };
}

export function WorkSettingsForm() {
  const { push } = useToast();
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [updatedAt, setUpdatedAt] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY);
  const [savedForm, setSavedForm] = useState<FormState>(EMPTY);
  const [errors, setErrors] = useState<FieldErrors<WorkSettingsInput>>({});

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const data = await getWorkSettings();
      const next: FormState = {
        workStart: data.workStart,
        workEnd: data.workEnd,
        lateToleranceMinutes: String(data.lateToleranceMinutes),
      };
      setForm(next);
      setSavedForm(next);
      setUpdatedAt(data.updatedAt);
    } catch (error) {
      setLoadError(error instanceof ApiError ? error.message : "Gagal memuat pengaturan jam kerja.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  /** Validasi per kolom saat pengguna pindah kolom — bukan saat mengetik. */
  function validateField(field: keyof WorkSettingsInput) {
    const all = validateWorkSettings(toInput(form));
    setErrors((prev) => ({ ...prev, [field]: all[field] }));
  }

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const input = toInput(form);
    const fieldErrors = validateWorkSettings(input);
    setErrors(fieldErrors);
    if (Object.keys(fieldErrors).length > 0) return;

    setSaving(true);
    try {
      const data = await updateWorkSettings(input as WorkSettingsInput);
      const next: FormState = {
        workStart: data.workStart,
        workEnd: data.workEnd,
        lateToleranceMinutes: String(data.lateToleranceMinutes),
      };
      setForm(next);
      setSavedForm(next);
      setUpdatedAt(data.updatedAt);
      push({
        variant: "success",
        title: "Pengaturan tersimpan",
        description: "Aturan ini dipakai untuk menilai kehadiran.",
      });
    } catch (error) {
      if (error instanceof ApiError && error.fields) {
        setErrors(error.fields as FieldErrors<WorkSettingsInput>);
      }
      push({
        variant: "danger",
        title: "Pengaturan gagal disimpan",
        description: error instanceof ApiError ? error.message : "Koneksi terputus. Coba lagi.",
      });
    } finally {
      setSaving(false);
    }
  }

  function onCancel() {
    setForm(savedForm);
    setErrors({});
  }

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        breadcrumb={[{ label: "Kehadiran", href: homeFor("admin_hr") }, { label: "Pengaturan" }]}
        title="Pengaturan jam kerja"
      />

      {loadError ? <Banner message={loadError} onRetry={() => void load()} /> : null}

      {loading ? (
        <div className="grid items-start gap-5 lg:grid-cols-2">
          <Card className="flex flex-col gap-5 p-5">
            {[0, 1, 2].map((row) => (
              <div key={row} className="flex flex-col gap-2">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-control w-full" />
              </div>
            ))}
          </Card>
          <Card className="flex flex-col gap-3 p-5">
            <Skeleton className="h-4 w-40" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-32" />
          </Card>
        </div>
      ) : null}

      {!loading && !loadError ? (
        <div className="grid items-start gap-5 lg:grid-cols-2">
          <form onSubmit={onSubmit} noValidate>
            <Card className="flex flex-col gap-5 p-5">
              <FormField id="workStart" label="Jam masuk" required error={errors.workStart}>
                <Input
                  type="time"
                  value={form.workStart}
                  onChange={(event) => setForm({ ...form, workStart: event.target.value })}
                  onBlur={() => validateField("workStart")}
                />
              </FormField>

              <FormField id="workEnd" label="Jam pulang" required error={errors.workEnd}>
                <Input
                  type="time"
                  value={form.workEnd}
                  onChange={(event) => setForm({ ...form, workEnd: event.target.value })}
                  onBlur={() => validateField("workEnd")}
                />
              </FormField>

              <FormField
                id="lateToleranceMinutes"
                label="Toleransi keterlambatan"
                required
                error={errors.lateToleranceMinutes}
              >
                <div className="relative">
                  <Input
                    type="number"
                    min={0}
                    step={1}
                    inputMode="numeric"
                    className="pr-7"
                    value={form.lateToleranceMinutes}
                    onChange={(event) => setForm({ ...form, lateToleranceMinutes: event.target.value })}
                    onBlur={() => validateField("lateToleranceMinutes")}
                  />
                  <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-body text-muted">
                    menit
                  </span>
                </div>
              </FormField>

              {/* Tombol di dalam kartu form (Panduan UI 3 · Form). */}
              <div className="flex justify-end gap-3 border-t border-line pt-5">
                <Button type="button" variant="secondary" onClick={onCancel} disabled={saving}>
                  Batal
                </Button>
                <Button type="submit" loading={saving} loadingText="Menyimpan…">
                  Simpan
                </Button>
              </div>
            </Card>
          </form>

          <Card className="flex flex-col gap-3 p-5">
            <h2 className="text-h3 text-text">Aturan yang sedang berlaku</h2>
            <dl className="flex flex-col gap-2 text-body">
              <div className="flex justify-between gap-4">
                <dt className="text-muted">Jam masuk</dt>
                <dd className="tabular-nums">{savedForm.workStart || "—"}</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-muted">Jam pulang</dt>
                <dd className="tabular-nums">{savedForm.workEnd || "—"}</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-muted">Toleransi keterlambatan</dt>
                <dd className="tabular-nums">{savedForm.lateToleranceMinutes || "0"} menit</dd>
              </div>
            </dl>
            <p className="text-body text-muted">
              Check-in setelah jam masuk ditambah toleransi dicatat sebagai terlambat, dan nilainya muncul di kolom
              Terlambat pada rekap bulanan.
            </p>
            <p className="text-caption text-muted">
              Terakhir diperbarui: {updatedAt ? formatDateTime(updatedAt) : "belum pernah"}
            </p>
          </Card>
        </div>
      ) : null}
    </div>
  );
}
