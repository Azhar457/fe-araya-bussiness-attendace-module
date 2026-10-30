"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import { CalendarDays, Inbox } from "lucide-react";
import { Badge, StatusBadge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { FormField, Select } from "@/components/ui/FormField";
import { PageHeader } from "@/components/ui/PageHeader";
import { Skeleton } from "@/components/ui/Skeleton";
import { Table, type Column } from "@/components/ui/Table";
import { ApiError } from "@/lib/api/client";
import { getDailyRecap } from "@/lib/api/kehadiran";
import { currentMonth, formatDate, formatMonthLabel, formatTime, lastMonths } from "@/lib/format";
import type { M13DailyRecap } from "@/lib/types";

const BULAN_LIST = lastMonths();

function timeOfDay(input: string | null): string {
  if (!input) return "—";
  return input.slice(11, 16);
}

type DailyRow = M13DailyRecap["data"]["items"][number];

/**
 * M13-US5 — Rekapitulasi detail per hari (HANYA HR).
 *
 * Data dari BE: GET /api/attendance/recap/daily?month=YYYY-MM
 * (endpoint baru di BE, perlu deploy oleh tim BE). Setiap baris = satu
 * (karyawan × tanggal) berisi status, jam masuk/pulang, keterlambatan.
 * Bila endpoint belum di-deploy (404), tampilkan pesan informatif.
 */
export function DailyRecapPage() {
  const [month, setMonth] = useState(currentMonth());
  const [items, setItems] = useState<DailyRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback((m: string) => {
    setLoading(true);
    setError(null);
    getDailyRecap(m)
      .then((result) => {
        setItems(
          [...(result.data?.items ?? [])].sort(
            (a, b) => b.tanggal.localeCompare(a.tanggal) || a.nama.localeCompare(b.nama),
          ),
        );
      })
      .catch((caught) => {
        setItems([]);
        if (caught instanceof ApiError) {
          // 404 = endpoint baru di BE belum deploy; beri pesan jelas.
          setError(
            caught.status === 404
              ? "Endpoint detail per hari belum tersedia di BE (perlu deploy /api/attendance/recap/daily). Coba lagi setelah BE di-deploy."
              : caught.message,
          );
        } else {
          setError("Gagal memuat data detail per hari.");
        }
      })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    load(month);
  }, [month, load]);

  const groups = useMemo(() => {
    const map = new Map<string, DailyRow[]>();
    for (const row of items) {
      const arr = map.get(row.tanggal) ?? [];
      arr.push(row);
      map.set(row.tanggal, arr);
    }
    return [...map.entries()].sort(([a], [b]) => b.localeCompare(a));
  }, [items]);

  const columns: Column<DailyRow>[] = [
    {
      key: "nama",
      header: "Karyawan",
      render: (row) => (
        <div className="flex flex-col leading-tight">
          <span className="text-body text-text">{row.nama}</span>
          {row.nik ? <span className="text-caption text-muted">{row.nik}</span> : null}
        </div>
      ),
    },
    {
      key: "checkInAt",
      header: "Jam Masuk",
      align: "right",
      render: (row) => <span className="text-body text-text tabular-nums">{timeOfDay(row.checkInAt)}</span>,
    },
    {
      key: "checkOutAt",
      header: "Jam Pulang",
      align: "right",
      render: (row) => <span className="text-body text-text tabular-nums">{timeOfDay(row.checkOutAt)}</span>,
    },
    {
      key: "status",
      header: "Status",
      render: (row) =>
        row.status ? <StatusBadge status={row.status} /> : <span className="text-body text-muted">—</span>,
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
  ];

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        breadcrumb={[
          { label: "Kehadiran", href: "/kehadiran/pengaturan" },
          { label: "Rekap kehadiran", href: "/kehadiran/rekap" },
          { label: "Detail per hari" },
        ]}
        title="Rekapitulasi Detail per Hari"
      />

      <div className="flex flex-col gap-4 sm:flex-row sm:items-end">
        <FormField id="daily-month" label="Pilih Bulan">
          <Select
            id="daily-month"
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

      {loading ? (
        <Card className="flex flex-col items-center gap-3 p-10">
          <Inbox aria-hidden size={32} className="text-muted" />
          <p className="text-body text-muted">Memuat data detail per hari…</p>
          <Skeleton className="h-4 w-40" />
        </Card>
      ) : error ? (
        <Card className="flex flex-col gap-3 p-5">
          <p className="text-body text-danger-fg">{error}</p>
          <button
            type="button"
            onClick={() => load(month)}
            className="text-label text-primary hover:text-primary-hover"
          >
            Coba lagi
          </button>
        </Card>
      ) : items.length === 0 ? (
        <Card className="flex flex-col items-center gap-4 p-10 text-center">
          <div className="flex size-12 items-center justify-center rounded-full bg-surface-2 text-muted">
            <CalendarDays aria-hidden size={24} />
          </div>
          <p className="text-body text-muted">Belum ada data kehadiran di {formatMonthLabel(month)}.</p>
        </Card>
      ) : (
        <div className="flex flex-col gap-5">
          {groups.map(([date, rows]) => (
            <section key={date} aria-label={date} className="flex flex-col gap-2">
              <h2 className="text-h3 text-text">
                {formatDate(date)}
                <span className="ml-2 text-caption text-muted">
                  {rows.length} karyawan tercatat
                </span>
              </h2>
              <Table
                caption={`Detail kehadiran ${formatDate(date)}`}
                columns={columns}
                rows={rows}
                rowKey={(row) => `${row.tanggal}-${row.karyawanId}`}
              />
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
