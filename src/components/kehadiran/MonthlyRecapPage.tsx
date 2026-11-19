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
import { currentMonth, formatDate, formatMonthLabel, lastMonths, wibNow } from "@/lib/format";
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
export function MonthlyRecapPage() {
  const hariIni = wibNow().dateKey;
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
          (result.data?.items ?? []).toSorted(
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

  const { groups, mapDays } = useMemo(() => {
    // Satu lintasan untuk keduanya: saring tanggal mendatang & akhir pekan,
    // kelompokkan per tanggal, sekaligus hitung isi sel peta.
    const perTanggal = new Map<string, DailyRow[]>();
    for (const row of items) {
      if (row.tanggal > hariIni) continue;
      const hari = new Date(`${row.tanggal}T00:00:00Z`).getUTCDay();
      if (hari === 0 || hari === 6) continue;
      const arr = perTanggal.get(row.tanggal) ?? [];
      arr.push(row);
      perTanggal.set(row.tanggal, arr);
    }

    const peta: Record<string, MapDay> = {};
    for (const [date, rows] of perTanggal) {
      let hadir = 0;
      let terlambat = 0;
      let lain = 0;
      let alpa = 0;
      for (const row of rows) {
        if (row.status === "hadir") hadir += 1;
        else if (row.status === "terlambat") terlambat += 1;
        else if (row.status === "alpa") alpa += 1;
        else if (row.status) lain += 1;
      }
      const masuk = hadir + terlambat;
      const cuti = lain > 0 ? ` · ${lain} cuti` : "";
      peta[date] =
        masuk > 0
          ? {
              tone: terlambat > 0 ? "pending" : "success",
              label: `${masuk} masuk${terlambat > 0 ? ` · ${terlambat} telat` : ""}${cuti}`,
            }
          : alpa > 0
            ? { tone: "danger", label: `${alpa} alpa${cuti}` }
            : date === hariIni
              ? { tone: "neutral", label: "Belum presensi" }
              : { tone: "neutral", label: "—" };
    }

    return {
      groups: [...perTanggal.entries()].sort(([a], [b]) => b.localeCompare(a)),
      mapDays: peta,
    };
  }, [items, hariIni]);

  const columns = useMemo<Column<DailyRow>[]>(
    () => [
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
        render: (row) => {
          if (row.status) return <StatusBadge status={row.status} />;
          if (row.tanggal === hariIni) return <Badge tone="neutral">Belum presensi</Badge>;
          return <span className="text-body text-muted">—</span>;
        },
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
    ],
    [hariIni],
  );

  const activeDate = selected ?? groups[0]?.[0] ?? null;
  const activeRows = activeDate ? (groups.find(([date]) => date === activeDate)?.[1] ?? []) : [];

  // Isi sel peta sudah dihitung bersama `groups` di atas.

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        breadcrumb={[
          { label: "Kehadiran", href: "/kehadiran/pengaturan" },
          { label: "Rekap Harian", href: "/kehadiran/rekap" },
          { label: "Rekap Bulanan" },
        ]}
        title="Rekap Bulanan"
      />

      <div className="flex flex-col gap-4 sm:flex-row sm:items-end">
        <FormField id="daily-month" label="Pilih Bulan">
          <Select
            id="daily-month"
            value={month}
            onChange={(e) => setMonth(e.target.value)}
            className="w-full sm:w-[192px]"
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
        <Card className="flex flex-col items-center gap-3 p-7">
          <Inbox aria-hidden size={32} className="text-muted" />
          <p className="text-body text-muted">Memuat data detail per hari…</p>
          <Skeleton className="h-4 w-[160px]" />
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
        <Card className="flex flex-col items-center gap-4 p-7 text-center">
          <div className="flex size-7 items-center justify-center rounded-full bg-surface-2 text-muted">
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
