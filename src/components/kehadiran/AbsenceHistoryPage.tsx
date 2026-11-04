"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import Link from "next/link";
import { Briefcase, CalendarDays, Download, FileText, Inbox, Paperclip, Stethoscope } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { PageHeader } from "@/components/ui/PageHeader";
import { Table, type Column } from "@/components/ui/Table";
import { ApiError, downloadFile } from "@/lib/api/client";
import { listLeaves } from "@/lib/api/kehadiran";
import { formatDate } from "@/lib/format";
import type { LiveLeaveList } from "@/lib/types";

type LeaveRow = LiveLeaveList["data"][number];

/** Satu pengajuan (pengajuan_id) — BE menyimpan 1 baris per tanggal. */
type Pengajuan = {
  key: string;
  mulai: string;
  selesai: string;
  jumlah: number;
  jenis: string;
  alasan: string;
  status?: string;
  reviewerNote?: string | null;
  attachment?: LeaveRow["attachment"];
};

const JENIS_LABEL: Record<string, string> = {
  izin: "Izin Pribadi",
  sakit: "Sakit",
  tugas_khusus: "Tugas Khusus",
};

/**
 * M13-US3 — riwayat pengajuan izin/sakit/tugas khusus milik karyawan.
 * Baris per-tanggal dari BE dikelompokkan per pengajuan_id agar rentang
 * multi-hari tampil sebagai satu pengajuan.
 */
export function AbsenceHistoryPage() {
  const [rows, setRows] = useState<LeaveRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [downloading, setDownloading] = useState<string | null>(null);
  const [selected, setSelected] = useState<Pengajuan | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await listLeaves();
      setRows(result.data ?? []);
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : "Gagal memuat riwayat pengajuan.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const pengajuanList = useMemo<Pengajuan[]>(() => {
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
        const withAttachment = sorted.find((row) => row.attachment);
        return {
          key,
          mulai: sorted[0].tanggal,
          selesai: sorted[sorted.length - 1].tanggal,
          jumlah: sorted.length,
          jenis: sorted[0].jenis,
          alasan: sorted[0].alasan,
          status: sorted[0].status,
          reviewerNote: sorted[0].reviewer_note,
          attachment: withAttachment?.attachment ?? null,
        };
      })
      .sort((a, b) => b.mulai.localeCompare(a.mulai));
  }, [rows]);

  async function unduhLampiran(p: Pengajuan) {
    if (!p.attachment) return;
    setDownloading(p.key);
    try {
      const ekstensi = p.attachment.url.endsWith(".pdf") ? "pdf" : "jpg";
      await downloadFile(p.attachment.url, `SKD-${p.mulai}.${ekstensi}`);
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : "Gagal mengunduh lampiran.");
    } finally {
      setDownloading(null);
    }
  }

  const columns: Column<Pengajuan>[] = [
    {
      key: "tanggal",
      header: "Tanggal",
      render: (row) => (
        <span className="text-body text-text tabular-nums">
          {row.jumlah > 1 ? `${formatDate(row.mulai)} – ${formatDate(row.selesai)}` : formatDate(row.mulai)}
          {row.jumlah > 1 ? <span className="text-caption text-muted"> · {row.jumlah} hari</span> : null}
        </span>
      ),
    },    {
      key: "jenis",
      header: "Jenis",
      render: (row) => {
        const Icon = row.jenis === "sakit" ? Stethoscope : row.jenis === "tugas_khusus" ? Briefcase : CalendarDays;
        return (
          <span className="flex items-center gap-2 text-body text-text">
            <Icon aria-hidden size={15} className="text-muted" />
            {JENIS_LABEL[row.jenis] ?? row.jenis}
          </span>
        );
      },
    },
    {
      key: "alasan",
      header: "Alasan",
      render: (row) => <span className="text-body text-muted">{row.alasan || "—"}</span>,
    },
    {
      key: "status",
      header: "Status",
      render: (row) =>
        row.status ? (
          <span className="flex flex-col gap-1 items-start">
            <Badge tone={statusTone(row.status)}>{statusLabel(row.status)}</Badge>
            {row.reviewerNote ? (
              <span className="text-caption text-muted">Catatan: {row.reviewerNote}</span>
            ) : null}
          </span>
        ) : (
          <span className="text-body text-muted">—</span>
        ),
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
      key: "aksi",
      header: "Detail",
      align: "right",
      render: (row) => (
        <button
          type="button"
          onClick={() => setSelected(row)}
          className="inline-flex items-center gap-1 text-label text-primary hover:text-primary-hover"
        >
          <FileText aria-hidden size={14} />
          Lihat
        </button>
      ),
    },
  ];

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        breadcrumb={[{ label: "Kehadiran", href: "/kehadiran/hari-ini" }, { label: "Izin & Sakit" }, { label: "Riwayat" }]}
        title="Riwayat Izin & Sakit"
      />

      {selected ? (
        <PengajuanDetailCard
          detail={selected}
          onClose={() => setSelected(null)}
          onUnduh={(p) => void unduhLampiran(p)}
          downloading={downloading}
        />
      ) : null}

      {loading ? (
        <Card className="flex flex-col items-center gap-3 p-10">
          <Inbox aria-hidden size={32} className="text-muted" />
          <p className="text-body text-muted">Memuat riwayat pengajuan…</p>
        </Card>
      ) : error ? (
        <Card className="flex flex-col gap-3 p-5">
          <p className="text-body text-danger-fg">{error}</p>
          <button type="button" onClick={() => void load()} className="text-label text-primary hover:text-primary-hover">
            Coba lagi
          </button>
        </Card>
      ) : pengajuanList.length === 0 ? (
        <Card className="flex flex-col items-center gap-4 p-10 text-center">
          <div className="flex size-12 items-center justify-center rounded-full bg-surface-2 text-muted">
            <CalendarDays aria-hidden size={24} />
          </div>
          <div className="flex flex-col gap-1">
            <p className="text-h3 text-text">Belum ada pengajuan</p>
            <p className="text-body text-muted">Anda belum pernah mengajukan izin atau sakit.</p>
          </div>
          <Link
            href="/kehadiran/izin"
            className="inline-flex items-center gap-2 rounded-sm bg-primary px-4 py-2 text-label text-on-primary hover:bg-primary-hover"
          >
            Ajukan lewat menu Izin &amp; Sakit
          </Link>
        </Card>
      ) : (
        <Table
          caption="Riwayat pengajuan izin/sakit"
          columns={columns}
          rows={pengajuanList}
          rowKey={(row) => row.key}
        />
      )}
    </div>
  );
}

function statusLabel(status: string): string {
  const map: Record<string, string> = { pending: "Menunggu", approved: "Disetujui", rejected: "Ditolak" };
  return map[status] ?? status;
}

/** Kartu detail satu pengajuan (muncul di atas tabel saat baris diklik "Lihat"). */
function PengajuanDetailCard({
  detail,
  onClose,
  onUnduh,
  downloading,
}: {
  detail: Pengajuan;
  onClose: () => void;
  onUnduh: (p: Pengajuan) => void;
  downloading: string | null;
}) {
  return (
    <Card className="p-5">
      <div className="flex items-start justify-between gap-4">
        <div className="flex flex-col gap-1">
          <p className="text-caption font-semibold uppercase tracking-wide text-muted">Detail Pengajuan</p>
          <div className="flex flex-wrap items-center gap-3">
            <h3 className="text-h3 text-text tabular-nums">
              {detail.jumlah > 1
                ? `${formatDate(detail.mulai)} – ${formatDate(detail.selesai)}`
                : formatDate(detail.mulai)}
            </h3>
            <Badge tone="info">{JENIS_LABEL[detail.jenis] ?? detail.jenis}</Badge>
            {detail.status ? <Badge tone={statusTone(detail.status)}>{statusLabel(detail.status)}</Badge> : null}
          </div>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Tutup detail"
          className="text-body text-muted hover:text-text"
        >
          Tutup ×
        </button>
      </div>

      <dl className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-1">
          <dt className="text-caption text-muted">Jumlah Hari</dt>
          <dd className="text-body text-text">{detail.jumlah} hari kerja</dd>
        </div>
        <div className="flex flex-col gap-1">
          <dt className="text-caption text-muted">Status</dt>
          <dd className="text-body text-text">{detail.status ? statusLabel(detail.status) : "—"}</dd>
        </div>
        <div className="flex flex-col gap-1 sm:col-span-2">
          <dt className="text-caption text-muted">Alasan</dt>
          <dd className="text-body text-text">{detail.alasan || "—"}</dd>
        </div>
        {detail.reviewerNote ? (
          <div className="flex flex-col gap-1 sm:col-span-2">
            <dt className="text-caption text-muted">Catatan Verifikator</dt>
            <dd className="text-body text-text">{detail.reviewerNote}</dd>
          </div>
        ) : null}
        <div className="flex flex-col gap-1">
          <dt className="text-caption text-muted">Lampiran</dt>
          <dd className="text-body text-text">
            {detail.attachment ? (
              <button
                type="button"
                onClick={() => onUnduh(detail)}
                disabled={downloading === detail.key}
                className="inline-flex items-center gap-1 text-label text-primary hover:text-primary-hover disabled:opacity-50"
              >
                <Download aria-hidden size={14} /> Unduh lampiran
              </button>
            ) : (
              "—"
            )}
          </dd>
        </div>
      </dl>
    </Card>
  );
}

function statusTone(status: string): "success" | "pending" | "danger" | "info" | "neutral" {
  const map: Record<string, "success" | "pending" | "danger" | "info" | "neutral"> = {
    pending: "pending",
    approved: "success",
    rejected: "danger",
  };
  return map[status] ?? "neutral";
}
