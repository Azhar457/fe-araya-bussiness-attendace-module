"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import { CalendarDays, Clock, Inbox } from "lucide-react";
import { Badge, StatusBadge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { FormField, Select } from "@/components/ui/FormField";
import { PageHeader } from "@/components/ui/PageHeader";
import { Skeleton } from "@/components/ui/Skeleton";
import { Table, type Column } from "@/components/ui/Table";
import { ApiError } from "@/lib/api/client";
import { getAttendanceMonth } from "@/lib/api/kehadiran";
import { currentMonth, formatDate, formatDateLong, formatMonthLabel, formatTime } from "@/lib/format";
import type { M13AttendanceItem } from "@/lib/types";

const BULAN_LIST = Array.from({ length: 12 }, (_, i) => {
  const m = new Date();
  m.setMonth(m.getMonth() - i);
  return `${m.getFullYear()}-${String(m.getMonth() + 1).padStart(2, "0")}`;
});

/** Ambil HH:MM dari ISO "+07:00" atau string "YYYY-MM-DDTHH:MM:SS+07:00". */
function timeOfDay(input: string | null): string {
  if (!input) return "—";
  return input.slice(11, 16);
}

function isLateRow(item: M13AttendanceItem): boolean {
  return item.isLate || item.status === "terlambat";
}

/**
 * M13-US2 — Detail Kehadiran (karyawan).
 *
 * Pilih bulan → daftar presensi per tanggal (GET /api/attendance?month=).
 * Klik satu baris → detail per tanggal: jam masuk, jam pulang, status,
 * keterlambatan. Juga berfungsi untuk hari yang sudah lewat (riwayat).
 */
export function AttendanceDetailPage({ employeeName }: { employeeName: string }) {
  const [month, setMonth] = useState(currentMonth());
  const [items, setItems] = useState<M13AttendanceItem[]>([]);
  const [selected, setSelected] = useState<M13AttendanceItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (m: string) => {
    setLoading(true);
    setError(null);
    setSelected(null);
    try {
      const result = await getAttendanceMonth(m);
      setItems([...(result.items ?? [])].sort((a, b) => b.date.localeCompare(a.date)));
    } catch (caught) {
      setItems([]);
      setError(caught instanceof ApiError ? caught.message : "Gagal memuat data kehadiran.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load(month);
  }, [month, load]);

  const columns: Column<M13AttendanceItem>[] = [
    {
      key: "date",
      header: "Tanggal",
      render: (row) => <span className="text-body text-text tabular-nums">{formatDate(row.date)}</span>,
    },
    {
      key: "checkInAt",
      header: "Jam Masuk",
      align: "right",
      render: (row) => (
        <span className="text-body text-text tabular-nums">{timeOfDay(row.checkInAt)}</span>
      ),
    },
    {
      key: "checkOutAt",
      header: "Jam Pulang",
      align: "right",
      render: (row) => (
        <span className="text-body text-text tabular-nums">{timeOfDay(row.checkOutAt)}</span>
      ),
    },
    {
      key: "status",
      header: "Status",
      render: (row) =>
        row.status ? (
          <StatusBadge status={row.status} />
        ) : (
          <span className="text-body text-muted">—</span>
        ),
    },
    {
      key: "late",
      header: "Terlambat",
      align: "right",
      render: (row) =>
        row.lateMinutes > 0 ? (
          <Badge tone="pending">{`${row.lateMinutes} mnt`}</Badge>
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
          onClick={() => setSelected(row)}
          className="inline-flex items-center gap-1 text-label text-primary hover:text-primary-hover"
        >
          <Clock aria-hidden size={14} />
          Lihat
        </button>
      ),
    },
  ];

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        breadcrumb={[
          { label: "Kehadiran", href: "/kehadiran/hari-ini" },
          { label: "Detail Kehadiran" },
        ]}
        title={`Detail Kehadiran — ${employeeName}`}
      />

      <div className="flex flex-col gap-4 sm:flex-row sm:items-end">
        <FormField id="attendance-month" label="Pilih Bulan">
          <Select
            id="attendance-month"
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
        <Card className="p-5">
          <div className="flex items-start justify-between gap-4">
            <div className="flex flex-col gap-1">
              <p className="text-caption font-semibold uppercase tracking-wide text-muted">
                {isTodayDate(selected.date) ? "Hari Ini" : "Hari Lewat"}
              </p>
              <div className="flex flex-wrap items-center gap-3">
                <h3 className="text-h3 text-text">{formatDateLong(selected.date)}</h3>
                {selected.status ? (
                  <StatusBadge status={selected.status} />
                ) : null}
                {selected.lateMinutes > 0 ? (
                  <Badge tone="pending">{`Terlambat ${selected.lateMinutes} mnt`}</Badge>
                ) : null}
              </div>
            </div>
            <button
              type="button"
              onClick={() => setSelected(null)}
              aria-label="Tutup detail"
              className="text-body text-muted hover:text-text"
            >
              Tutup ×
            </button>
          </div>

          <dl className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-4">
            <div className="flex flex-col gap-1">
              <dt className="text-caption text-muted">Jam Masuk</dt>
              <dd className="text-body text-text tabular-nums">{formatTime(timeOfDay(selected.checkInAt))}</dd>
            </div>
            <div className="flex flex-col gap-1">
              <dt className="text-caption text-muted">Jam Pulang</dt>
              <dd className="text-body text-text tabular-nums">{formatTime(timeOfDay(selected.checkOutAt))}</dd>
            </div>
            <div className="flex flex-col gap-1">
              <dt className="text-caption text-muted">Status</dt>
              <dd className="text-body text-text capitalize">
                {selected.status ?? "—"}
              </dd>
            </div>
            <div className="flex flex-col gap-1">
              <dt className="text-caption text-muted">Keterlambatan</dt>
              <dd className="text-body text-text tabular-nums">
                {selected.lateMinutes > 0 ? `${selected.lateMinutes} mnt` : "0 mnt"}
              </dd>
            </div>
          </dl>
        </Card>
      ) : null}

      {loading ? (
        <Card className="flex flex-col items-center gap-3 p-10">
          <Inbox aria-hidden size={32} className="text-muted" />
          <p className="text-body text-muted">Memuat data kehadiran…</p>
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
          caption="Riwayat kehadiran bulan terpilih"
          columns={columns}
          rows={items}
          rowKey={(row) => `${row.date}-${row.id}`}
          empty={
            <div className="flex flex-col items-center gap-2">
              <CalendarDays aria-hidden size={24} />
              <p className="text-body">Belum ada data kehadiran di {formatMonthLabel(month)}.</p>
            </div>
          }
        />
      )}
    </div>
  );
}

function isTodayDate(dateKey: string): boolean {
  const now = new Date();
  const key = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(
    now.getDate(),
  ).padStart(2, "0")}`;
  return dateKey === key;
}
