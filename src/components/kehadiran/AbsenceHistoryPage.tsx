"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import { useSearch, useSearchTarget } from "@/components/layout/search-context";
import { ApprovalBadge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Dialog } from "@/components/ui/Dialog";
import { FormField, Select } from "@/components/ui/FormField";
import { PageHeader } from "@/components/ui/PageHeader";
import { Pagination } from "@/components/ui/Pagination";
import { Table, type Column } from "@/components/ui/Table";
import { useToast } from "@/components/ui/Toast";
import { ApiError } from "@/lib/api/client";
import { cancelAbsenceRequest, listAbsenceRequests } from "@/lib/api/kehadiran";
import { homeFor } from "@/lib/auth/constants";
import { formatDate } from "@/lib/format";
import type { AbsenceRequest } from "@/lib/types";

/** M13-US3 — riwayat pengajuan milik karyawan yang sedang masuk. */
export function AbsenceHistoryPage() {
  const { push } = useToast();
  const { query } = useSearch();
  useSearchTarget("Cari alasan pengajuan");

  const [rows, setRows] = useState<AbsenceRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const [cancelling, setCancelling] = useState<AbsenceRequest | null>(null);
  const [cancelLoading, setCancelLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setRows(await listAbsenceRequests());
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : "Gagal memuat riwayat pengajuan.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const filtered = useMemo(() => {
    const keyword = query.trim().toLowerCase();
    return rows
      .filter((row) => !statusFilter || row.status === statusFilter)
      .filter((row) => !keyword || row.reason.toLowerCase().includes(keyword));
  }, [rows, query, statusFilter]);

  const pageCount = Math.max(1, Math.ceil(filtered.length / pageSize));
  const currentPage = Math.min(page, pageCount);
  const pageRows = filtered.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  async function onConfirmCancel() {
    if (!cancelling) return;
    setCancelLoading(true);
    try {
      await cancelAbsenceRequest(cancelling.id);
      setCancelling(null);
      await load();
      push({ variant: "success", title: "Pengajuan dibatalkan", description: "Pengajuan dihapus dari daftar." });
    } catch (caught) {
      push({
        variant: "danger",
        title: "Pengajuan gagal dibatalkan",
        description: caught instanceof ApiError ? caught.message : "Koneksi terputus. Coba lagi.",
      });
    } finally {
      setCancelLoading(false);
    }
  }

  const columns: Column<AbsenceRequest>[] = [
    {
      key: "tanggal",
      header: "Tanggal",
      render: (row) => (
        <span className="whitespace-nowrap">
          {row.startDate === row.endDate
            ? formatDate(row.startDate)
            : `${formatDate(row.startDate)} – ${formatDate(row.endDate)}`}
        </span>
      ),
    },
    {
      key: "jenis",
      header: "Jenis",
      render: (row) => (row.type === "izin" ? "Izin" : "Sakit"),
    },
    {
      key: "alasan",
      header: "Alasan",
      render: (row) => (
        <span className="block max-w-form truncate" title={row.reason}>
          {row.reason}
        </span>
      ),
    },
    {
      key: "status",
      header: "Status",
      render: (row) => <ApprovalBadge status={row.status} />,
    },
    {
      key: "aksi",
      header: "Aksi",
      align: "right",
      render: (row) =>
        row.status === "pending" ? (
          <Button variant="tertiary" size="sm" onClick={() => setCancelling(row)}>
            Batalkan
          </Button>
        ) : (
          <span className="text-muted">—</span>
        ),
    },
  ];

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        breadcrumb={[
          { label: "Kehadiran", href: homeFor("karyawan") },
          { label: "Izin & sakit", href: "/kehadiran/izin" },
          { label: "Riwayat" },
        ]}
        title="Riwayat pengajuan"
      />

      <Card className="flex flex-col gap-3 p-4 sm:flex-row sm:items-end">
        <FormField id="filter-status" label="Filter status">
          <Select
            className="sm:w-56"
            value={statusFilter}
            onChange={(event) => {
              setStatusFilter(event.target.value);
              setPage(1);
            }}
          >
            <option value="">Semua status</option>
            <option value="pending">Menunggu</option>
            <option value="approved">Disetujui</option>
            <option value="rejected">Ditolak</option>
          </Select>
        </FormField>
      </Card>

      <Table
        caption="Riwayat pengajuan izin dan sakit"
        columns={columns}
        rows={pageRows}
        rowKey={(row) => row.id}
        loading={loading}
        error={error}
        onRetry={() => void load()}
        empty={<p>Tidak ada pengajuan yang cocok.</p>}
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

      <Dialog
        open={Boolean(cancelling)}
        title={
          cancelling
            ? `Batalkan pengajuan ${cancelling.type} tanggal ${formatDate(cancelling.startDate)}?`
            : ""
        }
        description="Pengajuan yang dibatalkan tidak bisa dikembalikan."
        confirmLabel="Batalkan pengajuan"
        loading={cancelLoading}
        onConfirm={() => void onConfirmCancel()}
        onCancel={() => setCancelling(null)}
      />
    </div>
  );
}
