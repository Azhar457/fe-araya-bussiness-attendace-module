"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Briefcase,
  CalendarDays,
  ClipboardList,
  Paperclip,
  Phone,
  Plus,
  Send,
  Stethoscope,
  type LucideIcon,
} from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { FormField, Input, Textarea } from "@/components/ui/FormField";
import { PageHeader } from "@/components/ui/PageHeader";
import { useToast } from "@/components/ui/Toast";
import { ApiError } from "@/lib/api/client";
import {
  getEmergencyContact,
  listLeaves,
  listLeaveQuotas,
  submitLeave,
  uploadLeaveAttachment,
  type LeaveJenis,
} from "@/lib/api/kehadiran";
import { wibNow } from "@/lib/format";
import type { LiveEmergencyContact, LiveLeaveList, LiveLeaveQuota } from "@/lib/types";

type LeaveRow = LiveLeaveList["data"][number];

type JenisOption = { value: LeaveJenis; label: string; desc: string; icon: LucideIcon };

const JENIS_OPTIONS: JenisOption[] = [
  { value: "izin", label: "Izin Pribadi", desc: "Keperluan keluarga / pribadi", icon: ClipboardList },
  { value: "sakit", label: "Sakit", desc: "Dengan / tanpa surat dokter", icon: Stethoscope },
  { value: "tugas_khusus", label: "Tugas Khusus", desc: "Dinas luar / penugasan kantor", icon: Briefcase },
];

const EMPTY = { mulai: "", selesai: "", jenis: "izin" as LeaveJenis, alasan: "", file: null as File | null };

/** Sama dengan batas BE (MAX_RENTANG_HARI). */
const MAKS_HARI = 90;

/** Daftar hari kerja (Sen–Jin) dalam rentang inklusif, format YYYY-MM-DD. */
function workdays(mulai: string, selesai: string): string[] {
  const out: string[] = [];
  const cursor = new Date(`${mulai}T00:00:00Z`);
  const end = new Date(`${selesai}T00:00:00Z`);
  while (cursor <= end) {
    const day = cursor.getUTCDay();
    if (day !== 0 && day !== 6) out.push(cursor.toISOString().slice(0, 10));
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }
  return out;
}

/**
 * M13-US3 — form pengajuan izin/sakit/tugas khusus (karyawan) + riwayat terkini.
 * Data 100% dari BE LIVE: submitLeave (POST /api/leave-permissions, rentang
 * dipecah BE per hari kerja), uploadLeaveAttachment (lampiran SKD),
 * listLeaveQuotas (sisa cuti), getEmergencyContact (kontak darurat).
 */
export function AbsenceFormPage() {
  const { push } = useToast();
  const [form, setForm] = useState(EMPTY);
  const [errors, setErrors] = useState<Partial<Record<"mulai" | "selesai" | "alasan" | "file", string>>>({});
  const [submitting, setSubmitting] = useState(false);
  const [leaves, setLeaves] = useState<LeaveRow[]>([]);
  const [listLoading, setListLoading] = useState(true);
  const [listError, setListError] = useState<string | null>(null);
  const [quota, setQuota] = useState<LiveLeaveQuota["data"] | null>(null);
  const [kontak, setKontak] = useState<LiveEmergencyContact["data"] | null>(null);

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
    listLeaveQuotas(new Date().getFullYear()).then((q) => setQuota(q.data)).catch(() => undefined);
    getEmergencyContact().then((k) => setKontak(k.data)).catch(() => undefined);
  }, [load]);

  const durasi = useMemo(
    () => (form.mulai && form.selesai ? workdays(form.mulai, form.selesai).length : 0),
    [form.mulai, form.selesai],
  );

  function validate(): boolean {
    const next: typeof errors = {};
    if (!form.mulai) next.mulai = "Tanggal mulai wajib diisi.";
    else if (form.mulai < todayKey) next.mulai = "Tanggal tidak boleh lebih dulu dari hari ini.";
    if (!form.selesai) next.selesai = "Tanggal selesai wajib diisi.";
    else if (form.selesai < form.mulai) next.selesai = "Tanggal selesai tidak boleh sebelum tanggal mulai.";

    if (!next.mulai && !next.selesai) {
      const days = workdays(form.mulai, form.selesai);
      if (days.length === 0) next.selesai = "Rentang ini tidak memuat hari kerja (Sabtu & Minggu tidak dihitung).";
      else if (days.length > MAKS_HARI) next.selesai = `Maksimal ${MAKS_HARI} hari kerja per pengajuan.`;
    }

    if (!form.alasan.trim()) next.alasan = "Alasan tidak boleh kosong.";

    if (form.file) {
      const okTipe = ["image/jpeg", "image/png", "image/webp", "application/pdf"].includes(form.file.type);
      const okUkuran = form.file.size <= 5 * 1024 * 1024;
      if (!okTipe) next.file = "Lampiran harus gambar (JPG/PNG/WEBP) atau PDF.";
      else if (!okUkuran) next.file = "Ukuran lampiran maksimal 5 MB.";
    }

    setErrors(next);
    return Object.keys(next).length === 0;
  }

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!validate()) return;

    setSubmitting(true);
    try {
      const result = await submitLeave({
        mulai: form.mulai,
        selesai: form.selesai,
        jenis: form.jenis,
        alasan: form.alasan.trim(),
      });
      const { dibuat, dilewati, pengajuan_id } = result.data;

      // Lampiran (SKD) diunggah ke baris pertama pengajuan ini.
      let lampiranGagal = false;
      if (form.file && dibuat > 0) {
        try {
          const list = await listLeaves();
          const target = (list.data ?? []).find((row) => row.pengajuan_id === pengajuan_id);
          if (target?.id) await uploadLeaveAttachment(target.id, form.file);
          else lampiranGagal = true;
        } catch {
          lampiranGagal = true;
        }
      }

      if (dibuat === 0) {
        push({
          variant: "info",
          title: "Tidak ada hari baru yang diajukan",
          description: `${dilewati} hari sudah pernah diajukan sebelumnya.`,
        });
      } else {
        push({
          variant: lampiranGagal ? "info" : "success",
          title: `${dibuat} hari pengajuan terkirim`,
          description: lampiranGagal
            ? "Pengajuan tersimpan, tetapi lampiran gagal diunggah. Coba unggah ulang dari riwayat."
            : dilewati > 0
              ? `${dilewati} hari dilewati karena sudah pernah diajukan. Menunggu verifikasi Admin HR (1×24 jam).`
              : "Menunggu verifikasi Admin HR (1×24 jam).",
        });
      }

      setForm(EMPTY);
      setErrors({});
      await load();
    } catch (caught) {
      push({
        variant: "danger",
        title: "Pengajuan gagal",
        description: caught instanceof ApiError ? caught.message : "Coba lagi.",
      });
    } finally {
      setSubmitting(false);
    }
  }

  const latest = useMemo(() => {
    // Satu pengajuan (pengajuan_id) = satu entri riwayat; ambil tanggal terakhir & pertama.
    const byPengajuan = new Map<number, LeaveRow[]>();
    for (const row of leaves) {
      const key = row.pengajuan_id ?? row.id ?? 0;
      const bucket = byPengajuan.get(key);
      if (bucket) bucket.push(row);
      else byPengajuan.set(key, [row]);
    }
    return [...byPengajuan.values()]
      .map((rows) => rows.sort((a, b) => a.tanggal.localeCompare(b.tanggal)))
      .sort((a, b) => b[0].tanggal.localeCompare(a[0].tanggal))
      .slice(0, 3);
  }, [leaves]);

  const jenisLabel: Record<LeaveJenis, string> = {
    izin: "Izin Pribadi",
    sakit: "Sakit",
    tugas_khusus: "Tugas Khusus",
  };

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-1">
        <PageHeader
          breadcrumb={[{ label: "Kehadiran", href: "/kehadiran/hari-ini" }, { label: "Izin & Sakit" }]}
          title="Ajukan Izin & Sakit"
        />
        <p className="text-body text-muted">
          Formulir permohonan ketidakhadiran mandiri untuk keperluan izin pribadi, sakit resmi dengan
          surat keterangan dokter, atau tugas khusus dari kantor.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-12">
        {/* Form pengajuan. */}
        <Card className="flex flex-col gap-4 p-5 lg:col-span-7">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="flex size-9 items-center justify-center rounded-lg bg-primary-soft text-primary">
                <CalendarDays aria-hidden size={18} />
              </div>
              <div>
                <h2 className="text-h3 text-text">Formulir Pengajuan Ketidakhadiran</h2>
                <p className="text-caption text-muted">
                  Lengkapi data di bawah ini secara akurat untuk diverifikasi Admin HR.
                </p>
              </div>
            </div>
            <Badge tone="info">Verifikasi 1×24 Jam</Badge>
          </div>

          <form onSubmit={onSubmit} className="flex flex-col gap-4" noValidate>
            <fieldset className="flex flex-col gap-2">
              <legend className="text-label text-text">
                Jenis Pengajuan <span className="text-danger-fg" aria-hidden>*</span>
              </legend>
              <div role="radiogroup" aria-label="Jenis Pengajuan" className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                {JENIS_OPTIONS.map((option) => {
                  const selected = form.jenis === option.value;
                  const Icon = option.icon;
                  return (
                    <label
                      key={option.value}
                      className={`flex cursor-pointer flex-col gap-1 rounded-lg border p-3 transition-colors ${
                        selected ? "border-primary bg-primary-soft" : "border-line bg-surface hover:border-primary/40"
                      }`}
                    >
                      <input
                        type="radio"
                        name="jenis"
                        value={option.value}
                        checked={selected}
                        onChange={() => setForm((prev) => ({ ...prev, jenis: option.value }))}
                        className="sr-only"
                      />
                      <span className="flex items-center gap-2 text-label text-text">
                        <Icon aria-hidden size={16} className={selected ? "text-primary" : "text-muted"} />
                        {option.label}
                      </span>
                      <span className="text-caption text-muted">{option.desc}</span>
                    </label>
                  );
                })}
              </div>
            </fieldset>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <FormField id="mulai" label="Tanggal Mulai" required error={errors.mulai}>
                <Input
                  id="mulai"
                  type="date"
                  min={todayKey}
                  value={form.mulai}
                  aria-invalid={Boolean(errors.mulai) || undefined}
                  onChange={(event) => {
                    const mulai = event.target.value;
                    setForm((prev) => ({
                      ...prev,
                      mulai,
                      // Selesai mengikuti mulai bila masih kosong/terbalik.
                      selesai: !prev.selesai || prev.selesai < mulai ? mulai : prev.selesai,
                    }));
                  }}
                />
              </FormField>
              <FormField id="selesai" label="Tanggal Selesai" required error={errors.selesai}>
                <Input
                  id="selesai"
                  type="date"
                  min={form.mulai || todayKey}
                  value={form.selesai}
                  aria-invalid={Boolean(errors.selesai) || undefined}
                  onChange={(event) => setForm((prev) => ({ ...prev, selesai: event.target.value }))}
                />
              </FormField>
            </div>

            {durasi > 0 ? (
              <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-primary-soft px-3 py-2" role="status">
                <span className="text-label text-primary">
                  Total Durasi Pengajuan: {durasi} Hari Kerja
                </span>
                <span className="text-caption text-muted">Sabtu &amp; Minggu tidak dihitung</span>
              </div>
            ) : null}

            <FormField id="alasan" label="Alasan Pengajuan" required error={errors.alasan}>
              <Textarea
                id="alasan"
                rows={4}
                maxLength={500}
                placeholder="Tuliskan alasan lengkap, misalnya: Keperluan keluarga mendesak di luar kota atau mengalami demam tinggi dan butuh istirahat rawat jalan."
                aria-invalid={Boolean(errors.alasan) || undefined}
                value={form.alasan}
                onChange={(event) => setForm((prev) => ({ ...prev, alasan: event.target.value }))}
              />
            </FormField>
            <span className="self-end text-caption text-muted tabular-nums">{form.alasan.length}/500</span>

            {form.jenis === "sakit" ? (
              <FormField
                id="lampiran"
                label="Lampiran Surat Keterangan Dokter (SKD)"
                error={errors.file}
                hint="Gambar (JPG/PNG/WEBP) atau PDF, maksimal 5 MB. Wajib untuk sakit lebih dari 1 hari."
              >
                <Input
                  id="lampiran"
                  type="file"
                  accept="image/jpeg,image/png,image/webp,application/pdf"
                  onChange={(event) => setForm((prev) => ({ ...prev, file: event.target.files?.[0] ?? null }))}
                />
              </FormField>
            ) : null}

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
              <Button
                type="submit"
                variant="primary"
                loading={submitting}
                loadingText="Mengirim…"
                leftIcon={<Send aria-hidden size={18} />}
              >
                Kirim Pengajuan
              </Button>
            </div>
          </form>
        </Card>

        {/* Kolom kanan: aturan + kuota + kontak darurat + riwayat terkini. */}
        <div className="flex flex-col gap-5 lg:col-span-5">
          <Card className="flex flex-col gap-3 p-5">
            <div className="flex items-center gap-2">
              <CalendarDays aria-hidden size={18} className="text-primary" />
              <h2 className="text-h3 text-text">Aturan Pengajuan</h2>
            </div>
            <ul className="flex flex-col gap-2 text-body text-muted">
              <li className="flex items-start gap-2">
                <span aria-hidden className="mt-1 size-1 shrink-0 rounded-full bg-primary" />
                Pengajuan izin atau sakit wajib punya tanggal yang jelas dan keterangan alasan yang valid.
              </li>
              <li className="flex items-start gap-2">
                <span aria-hidden className="mt-1 size-1 shrink-0 rounded-full bg-primary" />
                Pengajuan sakit lebih dari 1 hari wajib menyertakan Surat Keterangan Dokter (SKD) resmi.
              </li>
              <li className="flex items-start gap-2">
                <span aria-hidden className="mt-1 size-1 shrink-0 rounded-full bg-primary" />
                Status awal pengajuan selalu <strong className="font-medium text-text">Menunggu Persetujuan</strong>, dan akan diverifikasi langsung oleh Admin HR.
              </li>
              <li className="flex items-start gap-2">
                <span aria-hidden className="mt-1 size-1 shrink-0 rounded-full bg-primary" />
                Hari izin dan sakit dihitung di rekap bulanan hanya setelah diverifikasi dan disetujui.
              </li>
            </ul>
            <Link href="/kehadiran/izin/riwayat" className="inline-flex items-center gap-1 text-label text-primary hover:text-primary-hover">
              <Plus aria-hidden size={16} /> Lihat riwayat pengajuan lengkap
            </Link>
          </Card>

          {quota ? (
            <Card className="flex flex-col gap-2 p-5">
              <h2 className="text-h3 text-text">Sisa Cuti Tahunan {quota.tahun}</h2>
              <div className="flex items-baseline gap-2">
                <span className="text-h1 text-primary tabular-nums">{quota.sisa}</span>
                <span className="text-body text-muted">/ {quota.kuota_total} hari</span>
              </div>
              <p className="text-caption text-muted">
                Terpakai {quota.terpakai} hari • Izin {quota.pengajuan_lain.izin ?? 0}× • Sakit{" "}
                {quota.pengajuan_lain.sakit ?? 0}× • Tugas khusus {quota.pengajuan_lain.tugas_khusus ?? 0}×
              </p>
            </Card>
          ) : null}

          {kontak?.nama ? (
            <Card className="flex flex-col gap-2 p-5">
              <div className="flex items-center gap-2">
                <Phone aria-hidden size={18} className="text-primary" />
                <h2 className="text-h3 text-text">Kontak Darurat</h2>
              </div>
              <p className="text-body text-text">
                {kontak.nama}
                {kontak.hubungan ? <span className="text-muted"> — {kontak.hubungan}</span> : null}
              </p>
              <p className="text-body text-muted tabular-nums">{kontak.telepon}</p>
            </Card>
          ) : null}

          <Card className="flex flex-col gap-3 p-5">
            <div className="flex items-center justify-between">
              <h2 className="text-h3 text-text">Riwayat Pengajuan Terkini</h2>
              {!listLoading && !listError && leaves.length > 0 ? (
                <Badge tone="neutral">3 terakhir</Badge>
              ) : null}
            </div>

            {listLoading ? (
              <p className="text-body text-muted">Memuat riwayat…</p>
            ) : listError ? (
              <p className="text-body text-danger-fg">{listError}</p>
            ) : latest.length === 0 ? (
              <p className="text-body text-muted">Belum ada pengajuan izin/sakit.</p>
            ) : (
              <div className="flex flex-col gap-2">
                {latest.map((rows) => {
                  const first = rows[0];
                  const Icon =
                    first.jenis === "sakit" ? Stethoscope : first.jenis === "tugas_khusus" ? Briefcase : ClipboardList;
                  const jenis = jenisLabel[first.jenis as LeaveJenis] ?? first.jenis;
                  const rentang =
                    rows.length > 1 ? `${rows[0].tanggal} – ${rows[rows.length - 1].tanggal}` : rows[0].tanggal;
                  return (
                    <div
                      key={first.pengajuan_id ?? first.id}
                      className="flex items-center justify-between gap-3 rounded-lg bg-surface-2 p-3"
                    >
                      <div className="flex min-w-0 items-center gap-3">
                        <span
                          aria-hidden
                          className={`flex size-8 shrink-0 items-center justify-center rounded-lg ${
                            first.jenis === "sakit" ? "bg-danger-soft text-danger-fg" : "bg-primary-soft text-primary"
                          }`}
                        >
                          <Icon size={16} />
                        </span>
                        <div className="flex min-w-0 flex-col">
                          <span className="text-label text-text">
                            {jenis}
                            {rows.length > 1 ? ` • ${rows.length} hari` : ""}
                          </span>
                          <span className="text-caption text-muted tabular-nums">
                            {rentang} • {first.alasan ? `${first.alasan.slice(0, 40)}${first.alasan.length > 40 ? "…" : ""}` : "—"}
                          </span>
                        </div>
                      </div>
                      {first.status ? <Badge tone={statusTone(first.status)}>{statusLabel(first.status)}</Badge> : null}
                    </div>
                  );
                })}
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
