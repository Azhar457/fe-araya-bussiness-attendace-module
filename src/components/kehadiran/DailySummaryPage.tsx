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

const KATEGORI_LABEL: Record<string, string> = {
  hadir: "Hadir",
  terlambat: "Terlambat",
  izin_sakit: "Izin / Sakit",
  cuti: "Cuti",
  alpa: "Alpa",
};

/** Rincian presensi hari ini (Karyawan): hanya baris milik sendiri. */
const MINE_COLUMNS: Column<DailyRow>[] = [
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
      if (row.status === "hadir" || row.status === "terlambat") {
        return <span className="text-caption text-muted">Belum Waktu Pulang</span>;
      }
      return <span className="text-body text-muted">—</span>;
    },
  },
];

/** Rincian kehadiran hari ini (HR): nama, jam masuk, status, jam keluar. */
function buildTeamColumns(hariIni: string): Column<TeamRow>[] {
  return [
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
      render: (row) => {
        if (row.status) return <StatusBadge status={row.status} />;
        // Hari ini belum bisa dinilai alpa → tulis apa adanya.
        return row.tanggal === hariIni ? (
          <Badge tone="neutral">Belum presensi</Badge>
        ) : (
          <span className="text-body text-muted">—</span>
        );
      },
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
}

/**
 * M13-US5 — ringkasan rekap bulan berjalan + rincian presensi HARI INI.
 * HR: ringkasan tim + rincian seluruh karyawan hari ini.
 * Karyawan: ringkasan sendiri + rincian presensi sendiri hari ini.
 * Pilihan bulan & rekap per tanggal ada di halaman Rekap Bulanan.
 */
export function DailySummaryPage({
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

  const akhirPekan = useMemo(
    () => [0, 6].includes(new Date(`${hariIni}T00:00:00Z`).getUTCDay()),
    [hariIni],
  );

  // HR: baris grid tanggal hari ini. Karyawan: baris presensi sendiri hari ini.
  const { teamHariIni, mineHariIni, belumPresensi } = useMemo(() => {
    if (akhirPekan) return { teamHariIni: [] as TeamRow[], mineHariIni: [] as DailyRow[], belumPresensi: 0 };
    const team = teamItems.filter((row) => row.tanggal === hariIni);
    const mine = daily.filter((row) => row.date === hariIni);
    // Hari ini tanpa presensi = "belum presensi", bukan alpa. Angka ini juga
    // dikurangkan dari ringkasan BE yang masih menghitung today sebagai alpa.
    const belum = loading
      ? 0
      : scope === "team"
        ? team.filter((row) => !row.status).length
        : mine.length > 0
          ? 0
          : 1;
    return { teamHariIni: team, mineHariIni: mine, belumPresensi: belum };
  }, [akhirPekan, teamItems, daily, hariIni, loading, scope]);

  const ringkasanTampil = useMemo(() => {
    const sumber = ringkasan ?? {};
    return { ...sumber, alpa: Math.max(0, (sumber.alpa ?? 0) - belumPresensi) };
  }, [ringkasan, belumPresensi]);

  const teamColumns = useMemo(() => buildTeamColumns(hariIni), [hariIni]);

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        breadcrumb={[{ label: "Kehadiran" }, { label: scope === "team" ? "Rekap Harian" : "Rekap Saya" }]}
        title={scope === "team" ? "Rekap Harian" : "Rekap Saya"}
      />

      {error ? <Banner variant="danger" message={error} /> : null}

      {/* Ringkasan total bulan berjalan. */}
      <Card className="p-5 sm:p-6">
        <h2 className="text-h3 text-text">Ringkasan total</h2>
        <p className="mt-1 text-caption text-muted">
          {scope === "team" ? "Seluruh karyawan · " : ""}
          {formatMonthLabel(monthKey)}
        </p>
        <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-5">
          {Object.entries(ringkasanTampil).map(
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
          caption={`Rincian kehadiran hari ini · ${formatDate(hariIni)}`}
          columns={teamColumns}
          rows={teamHariIni}
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
          caption={`Presensi saya hari ini · ${formatDate(hariIni)}`}
          columns={MINE_COLUMNS}
          rows={mineHariIni}
          rowKey={(row) => String(row.id)}
          loading={loading}
          empty={
            <p className="text-body text-muted">
              {akhirPekan
                ? "Hari ini akhir pekan — tidak ada presensi."
                : "Belum ada presensi tercatat hari ini."}
            </p>
          }
        />
      )}

      <p className="text-caption text-muted">
        Ringkasan berisi 5 kategori sesuai dokumen studi kasus: hadir, terlambat, izin/sakit,
        cuti, alpa. Untuk melihat kehadiran per tanggal, buka halaman{" "}
        <strong>Rekap Bulanan</strong>.
      </p>
    </div>
  );
}
