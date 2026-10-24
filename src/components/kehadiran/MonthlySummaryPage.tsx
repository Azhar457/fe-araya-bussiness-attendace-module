"use client";

import { useCallback, useEffect, useState } from "react";

import { Banner } from "@/components/ui/Banner";
import { Card } from "@/components/ui/Card";
import { FormField, Select } from "@/components/ui/FormField";
import { PageHeader } from "@/components/ui/PageHeader";
import { Table, type Column } from "@/components/ui/Table";
import { ApiError } from "@/lib/api/client";
import { getRecap } from "@/lib/api/kehadiran";
import { currentMonth, formatMonthLabel } from "@/lib/format";
import type { LiveRecap } from "@/lib/types";

const BULAN_LABEL = [
  "Januari", "Februari", "Maret", "April", "Mei", "Juni",
  "Juli", "Agustus", "September", "Oktober", "November", "Desember",
];

const TAHUN_LIST = [2025, 2026, 2027];

type RecapRow = NonNullable<LiveRecap["data"]>["rekap"][number];

function defaultBulanTahun(): { bulan: number; tahun: number } {
  const [tahun, bulan] = currentMonth().split("-").map(Number);
  return { bulan, tahun };
}

/**
 * M13-US5 — rekap bulanan.
 * Karyawan: filter baris rekap oleh karyawan_id === session.employeeId.
 * HR: tampilkan semua baris + ringkasan total.
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
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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

  // Filter baris sesuai scope
  const rows: RecapRow[] = (() => {
    if (!recap) return [];
    if (scope === "mine") {
      const numericId = Number(employeeId);
      if (Number.isNaN(numericId)) return []; // HR id (mis. "hr-1") tidak punya baris rekap
      return recap.rekap.filter((row) => row.karyawan_id === numericId);
    }
    return recap.rekap;
  })();

  const ringkasan = recap?.ringkasan;

  const columns: Column<RecapRow>[] = [
    { key: "karyawan_id", header: "Karyawan ID", align: "right", render: (row) => <span className="tabular-nums">{row.karyawan_id}</span> },
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

      {/* Picker bulan & tahun */}
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

      {/* Tabel rekap */}
      <Table
        caption={`Rekap ${formatMonthLabel(`${tahun}-${String(bulan).padStart(2, "0")}`)}`}
        columns={columns}
        rows={rows}
        rowKey={(row) => String(row.karyawan_id)}
        loading={loading}
        empty={
          scope === "mine" ? (
            <p className="text-body text-muted">Belum ada data rekap untuk bulan ini.</p>
          ) : (
            <p className="text-body text-muted">Belum ada data rekap untuk periode ini.</p>
          )
        }
      />

      {/* Ringkasan total — hanya HR */}
      {scope === "team" && ringkasan && Object.keys(ringkasan).length > 0 ? (
        <Card className="p-5 sm:p-6">
          <h2 className="text-h3 text-text">Ringkasan total</h2>
          <div className="mt-3 grid grid-cols-2 gap-x-6 gap-y-2 sm:grid-cols-3">
            {Object.entries(ringkasan).map(([key, value]) => (
              <div key={key} className="flex items-center justify-between">
                <span className="text-body text-muted">{key}</span>
                <span className="text-body text-text tabular-nums">{value}</span>
              </div>
            ))}
          </div>
        </Card>
      ) : null}
    </div>
  );
}
