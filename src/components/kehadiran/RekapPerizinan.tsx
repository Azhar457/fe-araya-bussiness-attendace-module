"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import { CheckCircle2, Download, Inbox, Paperclip, XCircle } from "lucide-react";

import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { PageHeader } from "@/components/ui/PageHeader";
import { Table, type Column } from "@/components/ui/Table";
import { useToast } from "@/components/ui/Toast";
import { ApiError, downloadFile } from "@/lib/api/client";
import { approveLeave, listLeavesForHR } from "@/lib/api/kehadiran";
import { formatDate } from "@/lib/format";
import type { LiveLeaveList } from "@/lib/types";

type LeaveRow = LiveLeaveList["data"][number];

/* ---------- Enkapsulasi data & tipe ---------- */

/* ---------- Tipe internal (enkapsulasi data per rekap perizinan) ---------- */

/** Satu pengajuan (pengajuan_id) dikelompokkan dari baris per-tanggal BE. */
type RekapPerizinan = {
  key: string;
  pengajuan_id: number | null;
  mulai: string;
  selesai: string;
  jumlah: number;
  jenis: string;
  alasan: string;
  status?: string;
  reviewerNote?: string | null;
  attachment?: LeaveRow["attachment"];
  namaKaryawan?: string;
  nik?: string;
};

const JENIS_LABEL: Record<string, string> = {
  izin: "Izin Pribadi",
  sakit: "Sakit",
  tugas_khusus: "Tugas Khusus",
};

/**
 * M13-US6 — rekapitulasi perizinan di halaman izin, khusus Admin HR.
 *
 * - List semua pengajuan izin/sakit yang diproses HR (pending → "Menunggu",
 *   approved → "Disetujui", rejected → "Ditolak").
 * - Per pengajuan ada kolom lampiran & keputusan (setujui / tolak).
 * - Endpoint `?scope=all` dan `PUT {id}` menunggu dibuat di BE; bila
 *   belum tersedia, UI menampilkan pesan "belum tersedia".
 */
export function RekapPerizinan() {
  const { push: toast } = useToast();
  const [rows, setRows] = useState<LeaveRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [downloading, setDownloading] = useState<string | null>(null);
  const [acting, setActing] = useState<{ key: string; action: "setuju" | "tolak" } | null>(null);
  const [beUnavailable, setBeUnavailable] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await listLeavesForHR();
      setRows(result.data ?? []);
      setBeUnavailable(false);
    } catch (caught) {
      // Endpoint belum ada di BE → 404/405, tampilkan UI empty state khusus.
      if (caught instanceof ApiError && (caught.status === 404 || caught.status === 405)) {
        setBeUnavailable(true);
      } else {
        setError(caught instanceof ApiError ? caught.message : "Gagal memuat pengajuan izin.");
      }
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  /* Enkapsulasi: kelompokkan baris BE per pengajuan_id */
  const rekapList = useMemo<RekapPerizinan[]>(() => {
    const byId = new Map<string, LeaveRow[]>();
    for (const row of rows) {
      const key = String(row.pengajuan_id ?? row.id ?? row.tanggal);
      const bucket = byId.get(key);
      if (bucket) bucket.push(row);
      else byId.set(key, [row]);
    }
    return [...byId.entries()]
      .map(([key, group]) => {
        const sorted = [...group].sort((a, b) => a.tanggal.localeCompare(b.tanggal));
        const withAttachment = sorted.find((r) => r.attachment);
        const withKaryawan = sorted.find(
          (r) => (r as unknown as { namaKaryawan?: string }).namaKaryawan,
        ) as unknown as { namaKaryawan?: string; nik?: string } | undefined;
        return {
          key,
          pengajuan_id: sorted[0].pengajuan_id ?? null,
          mulai: sorted[0].tanggal,
          selesai: sorted[sorted.length - 1].tanggal,
          jumlah: sorted.length,
          jenis: sorted[0].jenis,
          alasan: sorted[0].alasan,
          status: sorted[0].status,
          reviewerNote: sorted[0].reviewer_note,
          attachment: withAttachment?.attachment ?? null,
          namaKaryawan: withKaryawan?.namaKaryawan,
          nik: withKaryawan?.nik,
        };
      })
      .sort((a, b) => b.mulai.localeCompare(a.mulai));
  }, [rows]);

  /** Hanya pengajuan pending yang butuh keputusan. */
  const pending = rekapList.filter((p) => !p.status || p.status === "pending");

  /* ---------- Aksi ---------- */

  async function unduhLampiran(p: RekapPerizinan) {
    if (!p.attachment) return;
    setDownloading(p.key);
    try {
      const ekstensi = p.attachment.url.endsWith(".pdf") ? "pdf" : "jpg";
      await downloadFile(
        p.attachment.url,
        `lampiran-${p.namaKaryawan ?? p.nik ?? p.key}-${p.mulai}.${ekstensi}`,
      );
    } catch (caught) {
      toast({ variant: "danger", title: caught instanceof ApiError ? caught.message : "Gagal mengunduh lampiran." });
    } finally {
      setDownloading(null);
    }
  }

  async function putuskan(p: RekapPerizinan, action: "setuju" | "tolak") {
    if (p.pengajuan_id == null) return;
    setActing({ key: p.key, action });
    try {
      const note =
        action === "tolak"
          ? globalThis.prompt("Alasan penolakan (opsional, maks 200 huruf):")?.trim().slice(0, 200) ?? ""
          : "Disetujui";
      const result = await approveLeave(
        p.pengajuan_id,
        action === "setuju" ? "disetujui" : "ditolak",
        note || undefined,
      );
      if (result?.success === false) {
        toast({ variant: "danger", title: result.message ?? "Gagal menyimpan keputusan." });
      } else {
        toast({
          variant: "success",
          title: action === "setuju" ? "Pengajuan disetujui." : "Pengajuan ditolak.",
        });
        await load();
      }
    } catch (caught) {
      const msg = caught instanceof ApiError ? caught.message : "Gagal menyimpan keputusan.";
      toast(
        caught instanceof ApiError && (caught.status === 404 || caught.status === 405)
          ? { variant: "pending", title: "Endpoint persetujuan belum tersedia di BE." }
          : { variant: "danger", title: msg },
      );
    } finally {
      setActing(null);
    }
  }

  /* ---------- Kolom tabel ---------- */

  const columns: Column<RekapPerizinan>[] = [
    {
      key: "karyawan",
      header: "Karyawan",
      render: (row) => <span className="text-body text-text">{row.namaKaryawan ?? row.nik ?? "—"}</span>,
    },
    {
      key: "tanggal",
      header: "Tanggal",
      render: (row) => (
        <span className="text-body text-text tabular-nums">
          {row.jumlah > 1 ? `${formatDate(row.mulai)} – ${formatDate(row.selesai)}` : formatDate(row.mulai)}
          {row.jumlah > 1 ? <span className="ml-1 text-caption text-muted">· {row.jumlah} hari</span> : null}
        </span>
      ),
    },
    {
      key: "jenis",
      header: "Jenis",
      render: (row) => <Badge tone="info">{JENIS_LABEL[row.jenis] ?? row.jenis}</Badge>,
    },
    {
      key: "alasan",
      header: "Alasan",
      render: (row) => <span className="text-body text-muted">{row.alasan || "—"}</span>,
    },
    {
      key: "lampiran",
      header: "Lampiran",
      render: (row) =>
        row.attachment ? (
          <button
            type="button"
            onClick={() => void unduhLampiran(row)}
            disabled={downloading === row.key}
            className="inline-flex items-center gap-1 text-label text-primary hover:text-primary-hover disabled:opacity-50"
          >
            {downloading === row.key ? <Inbox aria-hidden size={14} /> : <Download aria-hidden size={14} />}
            Unduh
          </button>
        ) : (
          <span className="inline-flex items-center gap-1 text-caption text-muted">
            <Paperclip aria-hidden size={13} /> —
          </span>
        ),
    },
    {
      key: "keputusan",
      header: "Keputusan",
      align: "right",
      render: (row) => {
        const isPending = !row.status || row.status === "pending";
        const busy = acting?.key === row.key;
        if (!isPending) {
          return <span className="text-caption text-muted">Sudah diproses</span>;
        }
        return (
          <div className="flex items-center justify-end gap-2">
            <Button
              variant="tertiary"
              size="sm"
              onClick={() => void putuskan(row, "setuju")}
              disabled={busy || row.pengajuan_id == null}
              leftIcon={busy && acting?.action === "setuju" ? <Inbox aria-hidden size={14} /> : <CheckCircle2 aria-hidden size={14} />}
            >
              {busy && acting?.action === "setuju" ? "Menyimpan…" : "Setujui"}
            </Button>
            <Button
              variant="danger"
              size="sm"
              onClick={() => void putuskan(row, "tolak")}
              disabled={busy || row.pengajuan_id == null}
              leftIcon={busy && acting?.action === "tolak" ? <Inbox aria-hidden size={14} /> : <XCircle aria-hidden size={14} />}
            >
              {busy && acting?.action === "tolak" ? "Menyimpan…" : "Tolak"}
            </Button>
          </div>
        );
      },
    },
  ];

  /* ---------- Render ---------- */

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        breadcrumb={[{ label: "Kehadiran", href: "/kehadiran/hari-ini" }, { label: "Izin & Sakit" }, { label: "Rekapitulasi Perizinan" }]}
        title="Rekapitulasi Perizinan"
      />

      <div className="flex flex-col gap-2 rounded-lg border border-line bg-surface p-4">
        <p className="text-h3 text-text">Pengajuan menunggu keputusan ({pending.length})</p>
        <p className="text-body text-muted">
          Pengajuan yang Anda setujui/tolak hanya berlaku untuk baris yang masih berstatus{" "}
          <em>Menunggu</em>. Alasan penolakan wajib diisi bila ditolak.
        </p>
      </div>

      {loading ? (
        <Card className="flex flex-col items-center gap-3 p-10">
          <Inbox aria-hidden size={32} className="text-muted" />
          <p className="text-body text-muted">Memuat rekapitulasi perizinan…</p>
        </Card>
      ) : beUnavailable ? (
        <Card className="flex flex-col gap-3 p-5">
          <p className="text-body text-pending-fg">
            Modul persetujuan izin/sakit menunggu endpoint backend (<code>GET /api/leave-permissions?scope=all</code>{" "}
            &amp; <code>PUT /api/leave-permissions/{'{id}'}</code>). Halaman ini akan otomatis berfungsi setelah
            endpoint tersedia.
          </p>
          <Button type="button" variant="tertiary" onClick={() => void load()}>
            Coba lagi
          </Button>
        </Card>
      ) : error ? (
        <Card className="flex flex-col gap-3 p-5">
          <p className="text-body text-danger-fg">{error}</p>
          <Button type="button" variant="tertiary" onClick={() => void load()}>
            Coba lagi
          </Button>
        </Card>
      ) : pending.length === 0 ? (
        <Card className="flex flex-col items-center gap-4 p-10 text-center">
          <div className="flex size-12 items-center justify-center rounded-full bg-surface-2 text-muted">
            <CheckCircle2 aria-hidden size={24} />
          </div>
          <div className="flex flex-col gap-1">
            <p className="text-h3 text-text">Tidak ada pengajuan menunggu</p>
            <p className="text-body text-muted">
              Semua pengajuan sudah diproses. Gunakan <a className="text-primary hover:underline" href="/kehadiran/izin/riwayat">Riwayat</a>{" "}
              untuk melihat keputusan yang sudah dibuat.
            </p>
          </div>
        </Card>
      ) : (
        <Table
          caption="Rekapitulasi perizinan menunggu keputusan HR"
          columns={columns}
          rows={pending}
          rowKey={(row) => row.key}
        />
      )}
    </div>
  );
}
