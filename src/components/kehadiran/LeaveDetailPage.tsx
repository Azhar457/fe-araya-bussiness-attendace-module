"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import { CalendarDays, FileText, Inbox } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { FormField, Select } from "@/components/ui/FormField";
import { PageHeader } from "@/components/ui/PageHeader";
import { Skeleton } from "@/components/ui/Skeleton";
import { Table, type Column } from "@/components/ui/Table";
import { ApiError } from "@/lib/api/client";
import { listLeavesMonth } from "@/lib/api/kehadiran";
import { currentMonth, formatDate, formatDateLong, formatMonthLabel } from "@/lib/format";
import type { LiveLeaveList } from "@/lib/types";

type LeaveRow = LiveLeaveList["data"][number];
type LeaveDetail = LeaveRow & { createdAt?: string };

const BULAN_LIST = Array.from({ length: 12 }, (_, i) => {
  const m = new Date();
  m.setMonth(m.getMonth() - i);
  return `${m.getFullYear()}-${String(m.getMonth() + 1).padStart(2, "0")}`;
});

/**
 * M13-US3 — Detail Perizinan (karyawan).
 *
 * Pilih bulan → daftar pengajuan izin/sakit bulan itu (GET
 * /api/leave-permissions?month=YYYY-MM). Klik satu baris → detail:
 * tanggal, jenis, alasan, status, waktu diajukan.
 */
export function LeaveDetailPage() {
  const [month, setMonth] = useState(currentMonth());
  const [rows, setRows] = useState<LeaveRow[]>([]);
  const [selected, setSelected] = useState<LeaveDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (m: string) => {
    setLoading(true);
    setError(null);
    setSelected(null);
    try {
      const result = await listLeavesMonth(m);
      setRows([...(result.data ?? [])].sort((a, b) => b.tanggal.localeCompare(a.tanggal)));
    } catch (caught) {
      setRows([]);
      setError(caught instanceof ApiError ? caught.message : "Gagal memuat data izin.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load(month);
  }, [month, load]);

  const columns: Column<LeaveRow>[] = [
    {
      key: "tanggal",
      header: "Tanggal",
      render: (row) => <span className="text-body text-text tabular-nums">{formatDate(row.tanggal)}</span>,
    },
    {
      key: "jenis",
      header: "Jenis",
      render: (row) => (
        <Badge tone="info">{row.jenis === "izin" ? "Izin" : row.jenis === "sakit" ? "Sakit" : row.jenis}</Badge>
      ),
    },
    {
      key: "status",
      header: "Status",
      render: (row) =>
        row.status ? (
          <Badge tone={leaveStatusTone(row.status)}>{leaveStatusLabel(row.status)}</Badge>
        ) : (
          <span className="text-body text-muted">—</span>
        ),
    },
    {
      key: "aksi",
      header: "Detail",
      align: "right",
      render: (row) => (
        <button
          type="button"
          onClick={() => setSelected(row as LeaveDetail)}
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
        breadcrumb={[{ label: "Kehadiran", href: "/kehadiran/hari-ini" }, { label: "Detail Perizinan" }]}
        title="Detail Perizinan"
      />

      <div className="flex flex-col gap-4 sm:flex-row sm:items-end">
        <FormField id="leave-month" label="Pilih Bulan">
          <Select
            id="leave-month"
            value={month}
            onChange={(e) => setMonth(e.target.value)}
            className="w-full sm:w-48"
          >
            {BULAN_LIST.map((m) => (
              <option key={m} value={m}>
                {formatMonthLabel(m)}
              </option>
            ))}
          </Select>
        </FormField>
      </div>

      {selected ? (
        <LeaveDetailCard detail={selected} onClose={() => setSelected(null)} />
      ) : null}

      {loading ? (
        <Card className="flex flex-col items-center gap-3 p-10">
          <Inbox aria-hidden size={32} className="text-muted" />
          <p className="text-body text-muted">Memuat data izin…</p>
          <Skeleton className="h-4 w-40" />
        </Card>
      ) : error ? (
        <Card className="flex flex-col gap-3 p-5">
          <p className="text-body text-danger-fg">{error}</p>
          <button
            type="button"
            onClick={() => void load(month)}
            className="text-label text-primary hover:text-primary-hover"
          >
            Coba lagi
          </button>
        </Card>
      ) : (
        <Table
          caption="Daftar izin/sakit bulan terpilih"
          columns={columns}
          rows={rows}
          rowKey={(row) => `${row.tanggal}-${row.jenis}-${row.id ?? row.alasan}`}
          empty={
            <div className="flex flex-col items-center gap-2">
              <CalendarDays aria-hidden size={24} />
              <p className="text-body">Belum ada pengajuan di {formatMonthLabel(month)}.</p>
            </div>
          }
        />
      )}
    </div>
  );
}

function LeaveDetailCard({ detail, onClose }: { detail: LeaveDetail; onClose: () => void }) {
  return (
    <Card className="p-5">
      <div className="flex items-start justify-between gap-4">
        <div className="flex flex-col gap-1">
          <p className="text-caption font-semibold uppercase tracking-wide text-muted">
            Detail Pengajuan
          </p>
          <div className="flex items-center gap-3">
            <h3 className="text-h3 text-text">{formatDateLong(detail.tanggal)}</h3>
            <Badge tone="info">{detail.jenis === "izin" ? "Izin" : detail.jenis === "sakit" ? "Sakit" : detail.jenis}</Badge>
            {detail.status ? (
              <Badge tone={leaveStatusTone(detail.status)}>{leaveStatusLabel(detail.status)}</Badge>
            ) : null}
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
          <dt className="text-caption text-muted">Tanggal</dt>
          <dd className="text-body text-text">{formatDateLong(detail.tanggal)}</dd>
        </div>
        <div className="flex flex-col gap-1">
          <dt className="text-caption text-muted">Jenis</dt>
          <dd className="text-body text-text">
            {detail.jenis === "izin" ? "Izin" : detail.jenis === "sakit" ? "Sakit" : detail.jenis}
          </dd>
        </div>
        <div className="flex flex-col gap-1 sm:col-span-2">
          <dt className="text-caption text-muted">Alasan</dt>
          <dd className="text-body text-text">{detail.alasan || "—"}</dd>
        </div>
        <div className="flex flex-col gap-1">
          <dt className="text-caption text-muted">Waktu Diajukan</dt>
          <dd className="text-body text-text tabular-nums">
            {detail.created_at ? new Date(detail.created_at).toLocaleString("id-ID") : "—"}
          </dd>
        </div>
      </dl>
    </Card>
  );
}

function leaveStatusLabel(status: string): string {
  const map: Record<string, string> = { pending: "Menunggu", approved: "Disetujui", rejected: "Ditolak" };
  return map[status] ?? status;
}

function leaveStatusTone(status: string): "success" | "pending" | "danger" | "info" | "neutral" {
  const map: Record<string, "success" | "pending" | "danger" | "info" | "neutral"> = {
    pending: "pending",
    approved: "success",
    rejected: "danger",
  };
  return map[status] ?? "neutral";
}
