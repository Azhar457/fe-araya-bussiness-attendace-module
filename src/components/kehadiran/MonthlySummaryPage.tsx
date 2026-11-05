"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import { Banner } from "@/components/ui/Banner";
import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { FormField, Select } from "@/components/ui/FormField";
import { PageHeader } from "@/components/ui/PageHeader";
import { Table, type Column } from "@/components/ui/Table";
import { ApiError } from "@/lib/api/client";
import { getAttendanceMonth, getRecap } from "@/lib/api/kehadiran";
import { currentMonth, formatDate, formatMonthLabel, formatTime } from "@/lib/format";
import type { LiveRecap, M13AttendanceMonth } from "@/lib/types";

const BULAN_LABEL = [
  "Januari", "Februari", "Maret", "April", "Mei", "Juni",
  "Juli", "Agustus", "September", "Oktober", "November", "Desember",
];

const TAHUN_LIST = [2025, 2026, 2027];

type RecapRow = NonNullable<LiveRecap["data"]>["rekap"][number];
type RecapViewRow = RecapRow & { nama: string };
type DailyRow = M13AttendanceMonth["items"][number];

const KATEGORI_LABEL: Record<string, string> = {
  hadir: "Hadir",
  terlambat: "Terlambat",
  izin_sakit: "Izin / Sakit",
  cuti: "Cuti",
  alpa: "Alpa",
};

/** Label + tone badge per status presensi harian. */
const STATUS_HARIAN: Record<string, { label: string; tone: "success" | "pending" | "info" | "danger" | "neutral" }> = {
  hadir: { label: "Hadir", tone: "success" },
  terlambat: { label: "Terlambat", tone: "pending" },
  izin: { label: "Izin", tone: "info" },
  sakit: { label: "Sakit", tone: "info" },
  cuti: { label: "Cuti", tone: "info" },
  alpa: { label: "Alpa", tone: "danger" },
};

const DAILY_COLUMNS: Column<DailyRow>[] = [
  {
    key: "tanggal",
    header: "Tanggal",
    render: (row) => <span className="text-body text-text tabular-nums">{formatDate(row.date)}</span>,
  },
  {
    key: "status",
    header: "Status",
    render: (row) => {
      const status = row.status ? STATUS_HARIAN[row.status] : undefined;
      if (!status) return <span className="text-body text-muted">—</span>;
      const label =
        row.status === "terlambat" && row.lateMinutes > 0
          ? `${status.label} +${row.lateMinutes} mnt`
          : status.label;
      return <Badge tone={status.tone}>{label}</Badge>;
    },
  },
  {
    key: "masuk",
    header: "Jam Masuk",
    render: (row) => <span className="text-body text-text tabular-nums">{row.checkInAt ? formatTime(row.checkInAt) : "—"}</span>,
  },
  {
    key: "keluar",
    header: "Jam Keluar",
    render: (row) => <span className="text-body text-text tabular-nums">{row.checkOutAt ? formatTime(row.checkOutAt) : "—"}</span>,
  },
];

function defaultBulanTahun(): { bulan: number; tahun: number } {
  const [tahun, bulan] = currentMonth().split("-").map(Number);
  return { bulan, tahun };
}

/**
 * M13-US5 — rekap bulanan 5 kategori.
 * Karyawan: filter baris rekap oleh karyawan_id === session.employeeId.
 * HR: tampilkan semua baris, ringkasan total, dan aksi kirim ke M14.
 *
 * Nama & nik langsung dari BE M13 (di-join dengan COALESCE
 * attendance_users / m12_karyawan di sisi BE). Tanpa M12 pull FE —
 * id-space M12 dan M13 berbeda sehingga join di FE tidak dapat diandalkan.
 */
export function MonthlySummaryPage({
  scope,
  employeeId,
}: {
  scope: "team" | "mine";
  employeeId: string;
}) {
  const initial = defaultBulanTahun();
  const [bulan, setBulan] = useState(initial.bulan);
  const [tahun, setTahun] = useState(initial.tahun);
  const [recap, setRecap] = useState<LiveRecap["data"] | null>(null);
  const [daily, setDaily] = useState<DailyRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (targetBulan: number, targetTahun: number) => {
    setLoading(true);
    setError(null);
    try {
      // BE M13 (post-PR) sudah menampilkan semua karyawan aktif dengan angka 0
      // bila belum ada presensi/izin/cuti — FE tinggal mengambilnya.
      const monthKey = `${targetTahun}-${String(targetBulan).padStart(2, "0")}`;
      const [result, dailyResult] = await Promise.all([
        getRecap(targetBulan, targetTahun),
        // Riwayat presensi per tanggal (karyawan: baris sendiri; HR: semua —
        // tapi detail per-tanggal hanya ditampilkan untuk scope "mine").
        getAttendanceMonth(monthKey).catch(() => null),
      ]);
      setRecap(result.data);
      setDaily(dailyResult?.items ?? []);
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : "Gagal memuat rekap.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load(bulan, tahun);
  }, [load, bulan, tahun]);

  /**
   * Baris rekap dari BE M13. Sejak PR rekap di BE, semua karyawan aktif
   * (m12_karyawan + attendance_users) sudah tampil di response rekap,
   * termasuk yang belum ada presensi/izin/cuti (angka 0). FE tinggal
   * menampilkan apa adanya — tanpa merge roster M12.
   */
  const rows: RecapViewRow[] =
    recap?.rekap
      .filter((row) => (scope === "mine" ? String(row.karyawan_id) === employeeId : true))
      .map((row) => ({
        ...row,
        nama: row.nama ?? `Karyawan #${row.karyawan_id}`,
      })) ?? [];

  const ringkasan = recap?.ringkasan;

  // Ringkasan sendiri dihitung dari baris harian agar konsisten dengan tabel
  // per-tanggal di bawahnya (bukan dari ringkasan BE yang berisi semua tim).
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

  const dailySorted = useMemo(
    () => [...daily].sort((a, b) => a.date.localeCompare(b.date)),
    [daily],
  );

  const columns: Column<RecapViewRow>[] = [
    { key: "nama", header: "Karyawan", render: (row) => <span className="text-text">{row.nama}</span> },
    { key: "hadir", header: "Hadir", align: "right", render: (row) => <span className="tabular-nums">{row.hadir}</span> },
    { key: "terlambat", header: "Terlambat", align: "right", render: (row) => <span className="tabular-nums">{row.terlambat}</span> },
    { key: "izin_sakit", header: "Izin / Sakit", align: "right", render: (row) => <span className="tabular-nums">{row.izin_sakit}</span> },
    { key: "cuti", header: "Cuti", align: "right", render: (row) => <span className="tabular-nums">{row.cuti}</span> },
    { key: "alpa", header: "Alpa", align: "right", render: (row) => <span className="tabular-nums">{row.alpa}</span> },
  ];

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        breadcrumb={[{ label: "Kehadiran" }, { label: "Rekap kehadiran" }]}
        title="Rekap Kehadiran"
      />

      <Card className="p-4 sm:p-5">
        <div className="flex flex-wrap items-end gap-4">
          <FormField id="rekap-bulan" label="Bulan">
            <Select
              id="rekap-bulan"
              value={bulan}
              onChange={(event) => setBulan(Number(event.target.value))}
            >
              {BULAN_LABEL.map((label, index) => (
                <option key={label} value={index + 1}>
                  {label}
                </option>
              ))}
            </Select>
          </FormField>

          <FormField id="rekap-tahun" label="Tahun">
            <Select
              id="rekap-tahun"
              value={tahun}
              onChange={(event) => setTahun(Number(event.target.value))}
            >
              {TAHUN_LIST.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </Select>
          </FormField>


        </div>
      </Card>

      {error ? <Banner variant="danger" message={error} /> : null}

      {scope === "mine" && !loading ? (
        <>
          {/* Ringkasan bulan terpilih (dihitung dari baris harian di bawah). */}
          <Card className="p-5 sm:p-6">
            <h2 className="text-h3 text-text">Ringkasan {formatMonthLabel(`${tahun}-${String(bulan).padStart(2, "0")}`)}</h2>
            <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-5">
              {Object.entries(ringkasanSendiri).map(([key, value]) => (
                <div key={key} className="rounded-lg bg-surface-2 p-3">
                  <p className="text-caption text-muted">{KATEGORI_LABEL[key] ?? key}</p>
                  <p className="mt-1 text-h3 text-text tabular-nums">{value}</p>
                </div>
              ))}
            </div>
          </Card>

          {/* Detail per tanggal: hanya hari yang tercatat di BE. */}
          <Table
            caption={`Presensi harian ${formatMonthLabel(`${tahun}-${String(bulan).padStart(2, "0")}`)}`}
            columns={DAILY_COLUMNS}
            rows={dailySorted}
            rowKey={(row) => String(row.id)}
            empty={
              <p className="text-body text-muted">
                Belum ada presensi tercatat pada bulan ini.
              </p>
            }
          />
        </>
      ) : null}

      <Table
        caption={`Rekap ${formatMonthLabel(`${tahun}-${String(bulan).padStart(2, "0")}`)}`}
        columns={columns}
        rows={rows}
        rowKey={(row) => String(row.karyawan_id)}
        loading={loading}
        empty={
          <p className="text-body text-muted">
            {scope === "mine"
              ? "Belum ada data rekap untuk bulan ini."
              : "Belum ada data kehadiran pada periode ini."}
          </p>
        }
      />

      {scope === "team" && ringkasan && Object.keys(ringkasan).length > 0 ? (
        <Card className="p-5 sm:p-6">
          <h2 className="text-h3 text-text">Ringkasan total</h2>
          <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-5">
            {Object.entries(ringkasan).map(([key, value]) => (
              <div key={key} className="rounded-lg bg-surface-2 p-3">
                <p className="text-caption text-muted">{KATEGORI_LABEL[key] ?? key}</p>
                <p className="mt-1 text-h3 text-text tabular-nums">{value}</p>
              </div>
            ))}
          </div>
        </Card>
      ) : null}

      <p className="text-caption text-muted">
        Rekap berisi 5 kategori sesuai dokumen studi kasus: hadir, terlambat, izin/sakit,
        cuti, alpa. Kolom <strong>cuti</strong> baru terisi setelah data cuti dari modul
        kepegawaian tersedia.
      </p>
    </div>
  );
}
