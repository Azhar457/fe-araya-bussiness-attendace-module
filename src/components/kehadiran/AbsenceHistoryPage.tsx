"use client";

import { useCallback, useEffect, useState } from "react";

import Link from "next/link";
import { CalendarDays, Inbox } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { PageHeader } from "@/components/ui/PageHeader";
import { Table, type Column } from "@/components/ui/Table";
import { ApiError } from "@/lib/api/client";
import { listLeaves } from "@/lib/api/kehadiran";
import { formatDate } from "@/lib/format";
import type { LiveLeaveList } from "@/lib/types";

type LeaveRow = LiveLeaveList["data"][number];

/**
 * M13-US3 — riwayat pengajuan izin/sakit milik karyawan (tabel penuh).
 * Sumber data BE LIVE: listLeaves (GET /api/leave-permissions, Bearer token M12).
 */
export function AbsenceHistoryPage() {
  const [rows, setRows] = useState<LeaveRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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

  const sorted = [...rows].sort((a, b) => b.tanggal.localeCompare(a.tanggal));

  const columns: Column<LeaveRow>[] = [
    {
      key: "tanggal",
      header: "Tanggal",
      render: (row) => <span className="text-body text-text tabular-nums">{formatDate(row.tanggal)}</span>,
    },
    {
      key: "jenis",
      header: "Jenis",
      render: (row) => <span className="text-body capitalize text-text">{row.jenis}</span>,
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
        row.status ? <Badge tone={statusTone(row.status)}>{statusLabel(row.status)}</Badge> : <span className="text-body text-muted">—</span>,
    },
  ];

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        breadcrumb={[{ label: "Kehadiran", href: "/kehadiran/hari-ini" }, { label: "Izin & Sakit" }, { label: "Riwayat" }]}
        title="Riwayat Izin & Sakit"
      />

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
      ) : sorted.length === 0 ? (
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
          rows={sorted}
          rowKey={(row) => `${row.tanggal}-${row.jenis}-${row.id ?? row.alasan}`}
        />
      )}
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
