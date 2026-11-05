"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import { CalendarDays, Inbox } from "lucide-react";
import { AttendanceMap, type MapDay } from "@/components/kehadiran/AttendanceMap";
import { Badge, StatusBadge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { FormField, Select } from "@/components/ui/FormField";
import { PageHeader } from "@/components/ui/PageHeader";
import { Skeleton } from "@/components/ui/Skeleton";
import { Table, type Column } from "@/components/ui/Table";
import { ApiError } from "@/lib/api/client";
import { getDailyRecap } from "@/lib/api/kehadiran";
import { currentMonth, formatDate, formatMonthLabel, formatTime, lastMonths, wibNow } from "@/lib/format";
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
  const [selected, setSelected] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback((m: string) => {
    setLoading(true);
    setError(null);
    setSelected(null);
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
    const hariIni = wibNow().dateKey;
    const map = new Map<string, DailyRow[]>();
    for (const row of items) {
      // BE mengirim grid penuh bulan (termasuk tanggal mendatang & akhir pekan).
      // Tanggal mendatang selalu "alpa" dan akhir pekan memang libur — jangan
      // ditampilkan sebagai pelanggaran.
      if (row.tanggal > hariIni) continue;
      const hari = new Date(`${row.tanggal}T00:00:00Z`).getUTCDay();
      if (hari === 0 || hari === 6) continue;
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

  const activeDate = selected ?? groups[0]?.[0] ?? null;
  const activeRows = activeDate ? (groups.find(([date]) => date === activeDate)?.[1] ?? []) : [];

  // Isi sel peta: jumlah karyawan masuk/telat/cuti/alpa per tanggal.
  const mapDays = useMemo<Record<string, MapDay>>(() => {
    const perTanggal = new Map<string, { hadir: number; terlambat: number; lain: number; alpa: number }>();
    for (const row of items) {
      const hitung = perTanggal.get(row.tanggal) ?? { hadir: 0, terlambat: 0, lain: 0, alpa: 0 };
      if (row.status === "hadir") hitung.hadir += 1;
      else if (row.status === "terlambat") hitung.terlambat += 1;
      else if (row.status === "alpa") hitung.alpa += 1;
      else hitung.lain += 1;
      perTanggal.set(row.tanggal, hitung);
    }

    const result: Record<string, MapDay> = {};
    for (const [date, hitung] of perTanggal) {
      const masuk = hitung.hadir + hitung.terlambat;
      const cuti = hitung.lain > 0 ? ` · ${hitung.lain} cuti` : "";
      result[date] = {
        tone: masuk > 0 ? (hitung.terlambat > 0 ? "pending" : "success") : hitung.alpa > 0 ? "danger" : "info",
        label:
          masuk > 0
            ? `${masuk} masuk${hitung.terlambat > 0 ? ` · ${hitung.terlambat} telat` : ""}${cuti}`
            : hitung.alpa > 0
              ? `${hitung.alpa} alpa${cuti}`
              : `${hitung.lain} cuti`,
      };
    }
    return result;
  }, [items]);

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        breadcrumb={[
          { label: "Kehadiran", href: "/kehadiran/pengaturan" },
          { label: "Rekap kehadiran", href: "/kehadiran/rekap" },
          { label: "Rekap harian" },
        ]}
        title="Rekap Harian"
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
      ) : groups.length === 0 ? (
        <Card className="flex flex-col items-center gap-4 p-10 text-center">
          <div className="flex size-12 items-center justify-center rounded-full bg-surface-2 text-muted">
            <CalendarDays aria-hidden size={24} />
          </div>
          <p className="text-body text-muted">Belum ada data kehadiran di {formatMonthLabel(month)}.</p>
        </Card>
      ) : (
        /* Peta kehadiran bulan berjalan; klik tanggal untuk melihat tabel
           karyawan hari itu di bawahnya. */
        <div className="flex flex-col gap-4">
          <AttendanceMap
            month={month}
            days={mapDays}
            selected={activeDate}
            onSelect={(date) => setSelected(date)}
          />

          <div className="flex flex-col gap-2">
            {activeDate ? (
              <>
                <h2 className="text-h3 text-text">
                  {formatDate(activeDate)}
                  <span className="ml-2 text-caption text-muted">
                    {activeRows.length} karyawan tercatat
                  </span>
                </h2>
                <Table
                  caption={`Detail kehadiran ${formatDate(activeDate)}`}
                  columns={columns}
                  rows={activeRows}
                  rowKey={(row) => `${row.tanggal}-${row.karyawanId}`}
                />
              </>
            ) : (
              <p className="text-body text-muted">Pilih tanggal pada peta di atas.</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
