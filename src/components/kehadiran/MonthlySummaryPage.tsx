"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import { Banner } from "@/components/ui/Banner";
import { Card } from "@/components/ui/Card";
import { FormField, Input } from "@/components/ui/FormField";
import { PageHeader } from "@/components/ui/PageHeader";
import { Pagination } from "@/components/ui/Pagination";
import { Table, type Column } from "@/components/ui/Table";
import { ApiError } from "@/lib/api/client";
import { getApprovedLeave, getMonthlySummary } from "@/lib/api/kehadiran";
import { homeFor } from "@/lib/auth/constants";
import { currentMonth, formatDate, formatMonthLabel, monthRange } from "@/lib/format";
import type { ApprovedLeave, MonthlySummary, MonthlySummaryRow } from "@/lib/types";

/** Angka rata kanan + sejajar (Panduan UI bagian "Angka di tabel"). */
function num(value: number) {
  return <span className="tabular-nums">{value}</span>;
}

export function MonthlySummaryPage() {
  const [month, setMonth] = useState(currentMonth());
  const [summary, setSummary] = useState<MonthlySummary | null>(null);
  const [leave, setLeave] = useState<ApprovedLeave[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const load = useCallback(async (targetMonth: string) => {
    setLoading(true);
    setError(null);
    try {
      const { from, to } = monthRange(targetMonth);
      const [summaryData, leaveData] = await Promise.all([
        getMonthlySummary(targetMonth),
        getApprovedLeave(from, to),
      ]);
      setSummary(summaryData);
      setLeave(leaveData);
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : "Gagal memuat rekap kehadiran.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load(month);
  }, [load, month]);

  const filtered = useMemo(() => {
    const rows = summary?.rows ?? [];
    const keyword = query.trim().toLowerCase();
    if (!keyword) return rows;
    return rows.filter(
      (row) => row.name.toLowerCase().includes(keyword) || row.division.toLowerCase().includes(keyword),
    );
  }, [summary, query]);

  const pageCount = Math.max(1, Math.ceil(filtered.length / pageSize));
  const currentPage = Math.min(page, pageCount);
  const pageRows = filtered.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  const columns: Column<MonthlySummaryRow>[] = [
    { key: "name", header: "Karyawan", render: (row) => <span className="whitespace-nowrap">{row.name}</span> },
    { key: "division", header: "Divisi", render: (row) => <span className="whitespace-nowrap">{row.division}</span> },
    { key: "present", header: "Hadir", align: "right", render: (row) => num(row.present) },
    { key: "late", header: "Terlambat", align: "right", render: (row) => num(row.late) },
    { key: "izin", header: "Izin", align: "right", render: (row) => num(row.izin) },
    { key: "sakit", header: "Sakit", align: "right", render: (row) => num(row.sakit) },
    { key: "cuti", header: "Cuti", align: "right", render: (row) => num(row.cuti) },
    { key: "alpa", header: "Alpa", align: "right", render: (row) => num(row.alpa) },
    {
      key: "total",
      header: "Total hari kerja",
      align: "right",
      render: (row) => num(row.totalWorkDays),
    },
  ];

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        breadcrumb={[{ label: "Kehadiran", href: homeFor("admin_hr") }, { label: "Rekap" }]}
        title="Rekap kehadiran bulanan"
      />

      <Card className="flex flex-col gap-3 p-4 sm:flex-row sm:items-end">
        <FormField id="bulan" label="Bulan">
          <Input
            type="month"
            value={month}
            onChange={(event) => {
              setMonth(event.target.value || currentMonth());
              setPage(1);
            }}
          />
        </FormField>
        <FormField id="cari-karyawan" label="Cari karyawan">
          <Input
            type="search"
            placeholder="Cari nama atau divisi"
            value={query}
            onChange={(event) => {
              setQuery(event.target.value);
              setPage(1);
            }}
          />
        </FormField>
      </Card>

      {/* M13-US4: cuti dihitung dari cuti disetujui milik M12, bukan dari input manual. */}
      <p className="text-caption text-muted">
        {formatMonthLabel(month)} · {leave.length} hari cuti berstatus disetujui dari modul M12 ikut dihitung sebagai
        cuti{leave.length > 0 ? ` (${leave.slice(0, 3).map((item) => formatDate(item.date)).join(", ")}${leave.length > 3 ? ", …" : ""})` : ""}.
      </p>

      {!error && summary && !summary.hasData ? (
        <Banner variant="info" message="Belum ada data kehadiran pada bulan ini." />
      ) : null}

      <Table
        caption={`Rekap kehadiran ${formatMonthLabel(month)}`}
        columns={columns}
        rows={pageRows}
        rowKey={(row) => row.employeeId}
        loading={loading}
        error={error}
        onRetry={() => void load(month)}
        empty={<p>Tidak ada karyawan yang cocok dengan pencarian.</p>}
        footer={
          <Pagination
            total={filtered.length}
            page={currentPage}
            pageSize={pageSize}
            onPageChange={setPage}
            onPageSizeChange={(size) => {
              setPageSize(size);
              setPage(1);
            }}
          />
        }
      />
    </div>
  );
}
