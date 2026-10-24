"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { CalendarDays, FileText, Plus, Send } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { FormField, Input, Select, Textarea } from "@/components/ui/FormField";
import { PageHeader } from "@/components/ui/PageHeader";
import { useToast } from "@/components/ui/Toast";
import { ApiError } from "@/lib/api/client";
import { listLeaves, submitLeave, type LeaveInput } from "@/lib/api/kehadiran";
import { wibNow } from "@/lib/format";
import type { LiveLeaveList } from "@/lib/types";

type LeaveRow = LiveLeaveList["data"][number];

const EMPTY: LeaveInput = { karyawan_id: 0, tanggal: "", jenis: "izin", alasan: "" };

/**
 * M13-US3 — form pengajuan izin/sakit (karyawan) + riwayat singkat di bawah.
 * Data 100% dari BE LIVE: listLeaves (GET) + submitLeave (POST /api/leave-permissions).
 */
export function AbsenceFormPage({ employeeId }: { employeeId: string }) {
  const { push } = useToast();
  const [form, setForm] = useState<LeaveInput>(EMPTY);
  const [errors, setErrors] = useState<Partial<Record<keyof LeaveInput, string>>>({});
  const [submitting, setSubmitting] = useState(false);
  const [leaves, setLeaves] = useState<LeaveRow[]>([]);
  const [listLoading, setListLoading] = useState(true);
  const [listError, setListError] = useState<string | null>(null);

  const todayKey = wibNow().dateKey;

  const load = useCallback(async () => {
    setListLoading(true);
    setListError(null);
    try {
      const result = await listLeaves();
      setLeaves(result.data ?? []);
    } catch (caught) {
      setListError(caught instanceof ApiError ? caught.message : "Gagal memuat riwayat pengajuan.");
    } finally {
      setListLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  function validate(): boolean {
    const next: Partial<Record<keyof LeaveInput, string>> = {};
    if (!form.tanggal) next.tanggal = "Tanggal wajib diisi.";
    else if (form.tanggal < todayKey) next.tanggal = "Tanggal tidak boleh lebih dulu dari hari ini.";
    if (!form.alasan.trim()) next.alasan = "Alasan tidak boleh kosong.";
    setErrors(next);
    return Object.keys(next).length === 0;
  }

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!validate()) return;
    setSubmitting(true);
    try {
      const result = await submitLeave({ ...form, karyawan_id: Number(employeeId), alasan: form.alasan.trim() });
      push({ variant: "success", title: "Pengajuan terkirim", description: result.message });
      setForm(EMPTY);
      setErrors({});
      await load();
    } catch (caught) {
      if (caught instanceof ApiError && caught.status === 400) {
        setErrors({ alasan: caught.message });
        push({ variant: "danger", title: "Pengajuan ditolak", description: caught.message });
      } else {
        const message = caught instanceof ApiError ? caught.message : "Gagal mengirim pengajuan.";
        push({ variant: "danger", title: "Gagal mengirim pengajuan", description: message });
      }
    } finally {
      setSubmitting(false);
    }
  }

  const latest = useMemo(() => [...leaves].sort((a, b) => b.tanggal.localeCompare(a.tanggal)), [leaves]);

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        breadcrumb={[{ label: "Kehadiran", href: "/kehadiran/hari-ini" }, { label: "Izin & Sakit" }]}
        title="Ajukan Izin & Sakit"
      />

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-12">
        {/* Form pengajuan. */}
        <Card className="flex flex-col gap-4 p-5 lg:col-span-7">
          <div className="flex items-center gap-3">
            <div className="flex size-9 items-center justify-center rounded-lg bg-primary-soft text-primary">
              <FileText aria-hidden size={18} />
            </div>
            <div>
              <h2 className="text-h3 text-text">Formulir Pengajuan</h2>
              <p className="text-caption text-muted">Kerahkan data ketidakhadiran untuk diverifikasi Admin HR.</p>
            </div>
          </div>

          <form onSubmit={onSubmit} className="flex flex-col gap-4" noValidate>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <FormField id="tanggal" label="Tanggal" required error={errors.tanggal}>
                <Input
                  id="tanggal"
                  type="date"
                  min={todayKey}
                  value={form.tanggal}
                  aria-invalid={Boolean(errors.tanggal) || undefined}
                  onChange={(event) => setForm((prev) => ({ ...prev, tanggal: event.target.value }))}
                />
              </FormField>
              <FormField id="jenis" label="Jenis" required>
                <Select
                  id="jenis"
                  value={form.jenis}
                  onChange={(event) => setForm((prev) => ({ ...prev, jenis: event.target.value as "izin" | "sakit" }))}
                >
                  <option value="izin">Izin</option>
                  <option value="sakit">Sakit</option>
                </Select>
              </FormField>
            </div>

            <FormField id="alasan" label="Alasan" required error={errors.alasan}>
              <Textarea
                id="alasan"
                rows={4}
                maxLength={500}
                placeholder="Tuliskan alasan lengkap pengajuan."
                aria-invalid={Boolean(errors.alasan) || undefined}
                value={form.alasan}
                onChange={(event) => setForm((prev) => ({ ...prev, alasan: event.target.value }))}
              />
            </FormField>

            <div className="flex items-center justify-end gap-3">
              <Button
                type="button"
                variant="secondary"
                onClick={() => {
                  setForm(EMPTY);
                  setErrors({});
                }}
              >
                Batal
              </Button>
              <Button type="submit" variant="primary" loading={submitting} loadingText="Mengirim…" leftIcon={<Send aria-hidden size={18} />}>
                Kirim Pengajuan
              </Button>
            </div>
          </form>
        </Card>

        {/* Kolon kanan: aturan singkat + riwayat terkini. */}
        <div className="flex flex-col gap-5 lg:col-span-5">
          <Card className="flex flex-col gap-3 p-5">
            <div className="flex items-center gap-2">
              <CalendarDays aria-hidden size={18} className="text-primary" />
              <h2 className="text-h3 text-text">Aturan Pengajuan</h2>
            </div>
            <ul className="flex flex-col gap-2 text-body text-muted">
              <li className="flex items-start gap-2">
                <span aria-hidden className="mt-1 size-1 shrink-0 rounded-full bg-primary" />
                Tanggal dan alasan wajib jelas; pengajuan diverifikasi Admin HR.
              </li>
              <li className="flex items-start gap-2">
                <span aria-hidden className="mt-1 size-1 shrink-0 rounded-full bg-primary" />
                Hari izin/sakit dihitung di rekap hanya setelah disetujui.
              </li>
              <li className="flex items-start gap-2">
                <span aria-hidden className="mt-1 size-1 shrink-0 rounded-full bg-primary" />
                Pengajuan berstatus Menunggu dapat dibatalkan lewat riwayat.
              </li>
            </ul>
            <Link href="/kehadiran/izin/riwayat" className="inline-flex items-center gap-1 text-label text-primary hover:text-primary-hover">
              <Plus aria-hidden size={16} /> Lihat riwayat lengkap
            </Link>
          </Card>

          <Card className="flex flex-col gap-3 p-5">
            <div className="flex items-center justify-between">
              <h2 className="text-h3 text-text">Riwayat Pengajuan</h2>
              {!listLoading && !listError ? <Badge tone="neutral">{`${leaves.length} baris`}</Badge> : null}
            </div>

            {listLoading ? (
              <p className="text-body text-muted">Memuat riwayat…</p>
            ) : listError ? (
              <p className="text-body text-danger-fg">{listError}</p>
            ) : latest.length === 0 ? (
              <p className="text-body text-muted">Belum ada pengajuan izin/sakit.</p>
            ) : (
              <div className="flex flex-col gap-2">
                {latest.map((row, index) => (
                  <div key={`${row.tanggal}-${row.jenis}-${index}`} className="flex items-center justify-between gap-3 rounded-lg bg-surface-2 p-3">
                    <div className="flex min-w-0 flex-col">
                      <span className="text-label text-text capitalize">{row.jenis}</span>
                      <span className="text-caption text-muted">
                        {row.tanggal} • {row.alasan ? `${row.alasan.slice(0, 40)}${row.alasan.length > 40 ? "…" : ""}` : "—"}
                      </span>
                    </div>
                    {row.status ? <Badge tone={statusTone(row.status)}>{statusLabel(row.status)}</Badge> : null}
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}

function statusLabel(status: string): string {
  const map: Record<string, string> = { pending: "Menunggu", approved: "Disetujui", rejected: "Ditolak" };
  return map[status] ?? status;
}

function statusTone(status: string): "success" | "pending" | "danger" | "info" | "neutral" {
  const map: Record<string, "success" | "pending" | "danger" | "info" | "neutral"> = {
    pending: "pending",
    approved: "success",
    rejected: "danger",
  };
  return map[status] ?? "neutral";
}
