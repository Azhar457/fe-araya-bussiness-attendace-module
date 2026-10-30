"use client";

import { useCallback, useEffect, useState } from "react";

import { Banner } from "@/components/ui/Banner";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { FormField, Select } from "@/components/ui/FormField";
import { PageHeader } from "@/components/ui/PageHeader";
import { Table, type Column } from "@/components/ui/Table";
import { useToast } from "@/components/ui/Toast";
import { ApiError } from "@/lib/api/client";
import { getRecap, pushRekapKeM14 } from "@/lib/api/kehadiran";
import { currentMonth, formatMonthLabel } from "@/lib/format";
import type { LiveRecap } from "@/lib/types";

const BULAN_LABEL = [
  "Januari", "Februari", "Maret", "April", "Mei", "Juni",
  "Juli", "Agustus", "September", "Oktober", "November", "Desember",
];

const TAHUN_LIST = [2025, 2026, 2027];

type RecapRow = NonNullable<LiveRecap["data"]>["rekap"][number];
type RecapViewRow = RecapRow & { nama: string };

const KATEGORI_LABEL: Record<string, string> = {
  hadir: "Hadir",
  terlambat: "Terlambat",
  izin_sakit: "Izin / Sakit",
  cuti: "Cuti",
  alpa: "Alpa",
};

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
  const { push } = useToast();
  const initial = defaultBulanTahun();
  const [bulan, setBulan] = useState(initial.bulan);
  const [tahun, setTahun] = useState(initial.tahun);
  const [recap, setRecap] = useState<LiveRecap["data"] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);

  const load = useCallback(async (targetBulan: number, targetTahun: number) => {
    setLoading(true);
    setError(null);
    try {
      const result = await getRecap(targetBulan, targetTahun);
      setRecap(result.data);
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
   * Baris rekap dari M13. Nama + nik sudah digabung di BE (COALESCE
   * attendance_users / m12_karyawan). scope="mine" hanya baris milik
   * session.employeeId; scope="team" menampilkan semua baris.
   */
  const rows: RecapViewRow[] =
    recap?.rekap
      .filter((row) => (scope === "mine" ? String(row.karyawan_id) === employeeId : true))
      .map((row) => ({
        ...row,
        nama: row.nama ?? `Karyawan #${row.karyawan_id}`,
      })) ?? [];

  const ringkasan = recap?.ringkasan;
  const kosong = rows.length === 0;

  async function onSendToM14() {
    setSending(true);
    try {
      const result = await pushRekapKeM14(bulan, tahun);
      push({
        variant: result.sent ? "success" : "info",
        title: result.sent ? "Rekap terkirim" : "Belum terkirim",
        description: result.message,
      });
    } catch (caught) {
      push({
        variant: "danger",
        title: "Gagal mengirim",
        description: caught instanceof ApiError ? caught.message : "Koneksi terputus.",
      });
    } finally {
      setSending(false);
    }
  }

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

          {scope === "team" ? (
            <Button
              variant="secondary"
              onClick={() => void onSendToM14()}
              loading={sending}
              loadingText="Mengirim…"
              disabled={kosong}
            >
              Kirim ke Penggajian
            </Button>
          ) : null}
        </div>
      </Card>

      {error ? <Banner variant="danger" message={error} /> : null}

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
