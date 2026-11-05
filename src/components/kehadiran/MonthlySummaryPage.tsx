"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import { Banner } from "@/components/ui/Banner";
import { Badge, StatusBadge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { PageHeader } from "@/components/ui/PageHeader";
import { Table, type Column } from "@/components/ui/Table";
import { ApiError } from "@/lib/api/client";
import { getAttendanceMonth, getDailyRecap, getRecap } from "@/lib/api/kehadiran";
import { currentMonth, formatDate, formatMonthLabel, formatTime, wibNow } from "@/lib/format";
import type { LiveRecap, M13AttendanceMonth, M13DailyRecap } from "@/lib/types";

type DailyRow = M13AttendanceMonth["items"][number];
type TeamRow = M13DailyRecap["data"]["items"][number];
type DailyViewRow = { date: string; row?: DailyRow };

const KATEGORI_LABEL: Record<string, string> = {
  hadir: "Hadir",
  terlambat: "Terlambat",
  izin_sakit: "Izin / Sakit",
  cuti: "Cuti",
  alpa: "Alpa",
};

const STATUS_HARIAN: Record<string, { label: string; tone: "success" | "pending" | "info" | "danger" | "neutral" }> = {
  hadir: { label: "Hadir", tone: "success" },
  terlambat: { label: "Terlambat", tone: "pending" },
  izin: { label: "Izin", tone: "info" },
  sakit: { label: "Sakit", tone: "info" },
  cuti: { label: "Cuti", tone: "info" },
  alpa: { label: "Alpa", tone: "danger" },
};

const DAILY_COLUMNS: Column<DailyViewRow>[] = [
  {
    key: "tanggal",
    header: "Tanggal",
    render: (row) => <span className="text-body text-text tabular-nums">{formatDate(row.date)}</span>,
  },
  {
    key: "status",
    header: "Status",
    render: (row) => {
      const data = row.row;
      const status = data?.status ? STATUS_HARIAN[data.status] : undefined;
      if (status && data) {
        const label =
          data.status === "terlambat" && data.lateMinutes > 0
            ? `${status.label} +${data.lateMinutes} mnt`
            : status.label;
        return <Badge tone={status.tone}>{label}</Badge>;
      }
      // Hari tanpa data: akhir pekan (Sen–Jin hari kerja) atau belum ada presensi.
      const hari = new Date(`${row.date}T00:00:00Z`).getUTCDay();
      const libur = hari === 0 || hari === 6;
      return <Badge tone="neutral">{libur ? "Akhir pekan" : "Tidak ada presensi"}</Badge>;
    },
  },
  {
    key: "masuk",
    header: "Jam Masuk",
    render: (row) => <span className="text-body text-text tabular-nums">{row.row?.checkInAt ? formatTime(row.row.checkInAt) : "—"}</span>,
  },
  {
    key: "keluar",
    header: "Jam Keluar",
    render: (row) => <span className="text-body text-text tabular-nums">{row.row?.checkOutAt ? formatTime(row.row.checkOutAt) : "—"}</span>,
  },
];

/** Rincian kehadiran hari ini (HR): nama, jam masuk, status, jam keluar. */
const TEAM_COLUMNS: Column<TeamRow>[] = [
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
    key: "masuk",
    header: "Jam Masuk",
    render: (row) => (
      <span className="text-body text-text tabular-nums">
        {row.checkInAt ? formatTime(row.checkInAt) : "—"}
      </span>
    ),
  },
  {
    key: "status",
    header: "Status",
    render: (row) =>
      row.status ? <StatusBadge status={row.status} /> : <span className="text-body text-muted">—</span>,
  },
  {
    key: "keluar",
    header: "Jam Keluar",
    render: (row) => {
      if (row.checkOutAt) {
        return <span className="text-body text-text tabular-nums">{formatTime(row.checkOutAt)}</span>;
      }
      // Sudah masuk tapi belum check-out: shift belum selesai.
      if (row.status === "hadir" || row.status === "terlambat") {
        return <span className="text-caption text-muted">Belum Waktu Pulang</span>;
      }
      return <span className="text-body text-muted">—</span>;
    },
  },
];

/**
 * M13-US5 — rekap bulanan (ringkasan 5 kategori).
 * HR: ringkasan tim + rincian presensi hari ini (nama, masuk, status, keluar).
 * Karyawan: ringkasan sendiri + daftar presensi per tanggal.
 * Pilihan bulan ada di halaman Detail rekap per hari.
 */
export function MonthlySummaryPage({
  scope,
}: {
  scope: "team" | "mine";
  employeeId: string;
}) {
  const monthKey = currentMonth();
  const hariIni = wibNow().dateKey;
  const [recap, setRecap] = useState<LiveRecap["data"] | null>(null);
  const [daily, setDaily] = useState<DailyRow[]>([]);
  // HR: grid rekap harian (semua karyawan × tanggal) — diambil untuk tabel hari ini.
  const [teamItems, setTeamItems] = useState<TeamRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      // BE M13 sudah menampilkan semua karyawan aktif dengan angka 0 bila belum
      // ada presensi/izin/cuti — FE tinggal mengambilnya.
      const [tahun, bulan] = monthKey.split("-").map(Number);
      const [result, dailyResult, teamResult] = await Promise.all([
        getRecap(bulan, tahun),
        // Karyawan: GET /api/attendance hanya mengembalikan baris sendiri.
        scope === "mine" ? getAttendanceMonth(monthKey).catch(() => null) : Promise.resolve(null),
        // HR: rincian per karyawan → rekap harian (khusus HR).
        scope === "team" ? getDailyRecap(monthKey).catch(() => null) : Promise.resolve(null),
      ]);
      setRecap(result.data);
      setDaily(dailyResult?.items ?? []);
      setTeamItems(teamResult?.data?.items ?? []);
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : "Gagal memuat rekap.");
    } finally {
      setLoading(false);
    }
  }, [monthKey, scope]);

  useEffect(() => {
    void load();
  }, [load]);

  const ringkasan = recap?.ringkasan;

  // Ringkasan karyawan dihitung dari baris harian agar konsisten dengan tabel.
  const ringkasanSendiri = useMemo(() => {
    const hitung = { hadir: 0, terlambat: 0, izin_sakit: 0, cuti: 0, alpa: 0 };
    for (const row of daily) {
      if (row.status === "hadir") hitung.hadir += 1;
      else if (row.status === "terlambat") hitung.terlambat += 1;
      else if (row.status === "izin" || row.status === "sakit") hitung.izin_sakit += 1;
      else if (row.status === "cuti") hitung.cuti += 1;
      else if (row.status === "alpa") hitung.alpa += 1;
    }
    return hitung;
  }, [daily]);

  // Grid tanggal 1 s.d. hari ini; hari tanpa data tetap tampil sebagai baris kosong.
  const dailyGrid = useMemo<DailyViewRow[]>(() => {
    const [tahun, bulan] = monthKey.split("-").map(Number);
    const akhirBulan = new Date(Date.UTC(tahun, bulan, 0)).getUTCDate();
    const sampai = monthKey === hariIni.slice(0, 7) ? Number(hariIni.slice(8, 10)) : akhirBulan;
    const byDate = new Map(daily.map((row) => [row.date, row]));
    const grid: DailyViewRow[] = [];
    for (let d = 1; d <= sampai; d += 1) {
      const date = `${monthKey}-${String(d).padStart(2, "0")}`;
      grid.push({ date, row: byDate.get(date) });
    }
    return grid;
  }, [daily, monthKey, hariIni]);

  const akhirPekan = [0, 6].includes(new Date(`${hariIni}T00:00:00Z`).getUTCDay());
  const hariIniRows = akhirPekan
    ? []
    : teamItems.filter((row) => row.tanggal === hariIni);

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        breadcrumb={[{ label: "Kehadiran" }, { label: "Rekap kehadiran" }]}
        title="Rekap Kehadiran"
      />

      {error ? <Banner variant="danger" message={error} /> : null}

      {/* Ringkasan total bulan berjalan. */}
      <Card className="p-5 sm:p-6">
        <h2 className="text-h3 text-text">Ringkasan total</h2>
        <p className="mt-1 text-caption text-muted">{formatMonthLabel(monthKey)}</p>
        <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-5">
          {Object.entries(scope === "mine" ? ringkasanSendiri : (ringkasan ?? {})).map(
            ([key, value]) => (
              <div key={key} className="rounded-lg bg-surface-2 p-3">
                <p className="text-caption text-muted">{KATEGORI_LABEL[key] ?? key}</p>
                <p className="mt-1 text-h3 text-text tabular-nums">{value}</p>
              </div>
            ),
          )}
        </div>
      </Card>

      {scope === "team" ? (
        <Table
          caption={`Rincian kehadiran ${formatDate(hariIni)}`}
          columns={TEAM_COLUMNS}
          rows={hariIniRows}
          rowKey={(row) => `${row.tanggal}-${row.karyawanId}`}
          loading={loading}
          empty={
            <p className="text-body text-muted">
              {akhirPekan
                ? "Hari ini akhir pekan — tidak ada presensi."
                : "Belum ada presensi tercatat hari ini."}
            </p>
          }
        />
      ) : (
        <Table
          caption={`Presensi harian ${formatMonthLabel(monthKey)}`}
          columns={DAILY_COLUMNS}
          rows={dailyGrid}
          rowKey={(row) => row.date}
          loading={loading}
          empty={
            <p className="text-body text-muted">
              Belum ada presensi tercatat pada bulan ini.
            </p>
          }
        />
      )}

      <p className="text-caption text-muted">
        Rekap berisi 5 kategori sesuai dokumen studi kasus: hadir, terlambat, izin/sakit,
        cuti, alpa. Kolom <strong>cuti</strong> baru terisi setelah data cuti dari modul
        kepegawaian tersedia.
      </p>
    </div>
  );
}
