"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import { useSearch, useSearchTarget } from "@/components/layout/search-context";
import { ApprovalBadge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { PageHeader } from "@/components/ui/PageHeader";
import { Pagination } from "@/components/ui/Pagination";
import { Table, type Column } from "@/components/ui/Table";
import { useToast } from "@/components/ui/Toast";
import { ApiError } from "@/lib/api/client";
import { decideApproval, listPendingApprovals } from "@/lib/api/kehadiran";
import { homeFor } from "@/lib/auth/constants";
import { formatDate } from "@/lib/format";
import type { AbsenceRequestWithMeta } from "@/lib/types";

type Filter = "pending" | "approved" | "rejected" | "all";

/** M13-US1 — HR: pantau & putuskan pengajuan izin/sakit karyawan. */
export function ApprovalPage() {
  const { push } = useToast();
  const { query } = useSearch();
  useSearchTarget("Cari nama karyawan atau alasan");

  const [rows, setRows] = useState<AbsenceRequestWithMeta[]>([]);
  const [filter, setFilter] = useState<Filter>("pending");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [decidingId, setDecidingId] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const load = useCallback(async (target: Filter) => {
    setLoading(true);
    setError(null);
    try {
      setRows(await listPendingApprovals(target));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Gagal memuat daftar pengajuan.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load(filter);
  }, [load, filter]);

  useEffect(() => {
    setPage(1);
  }, [query, filter]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter(
      (r) =>
        r.employeeName.toLowerCase().includes(q) ||
        r.employeeDivision.toLowerCase().includes(q) ||
        r.reason.toLowerCase().includes(q),
    );
  }, [rows, query]);

  const pageCount = Math.max(1, Math.ceil(filtered.length / pageSize));
  const currentPage = Math.min(page, pageCount);
  const pageRows = filtered.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  async function decide(row: AbsenceRequestWithMeta, decision: "approved" | "rejected") {
    setDecidingId(row.id);
    try {
      await decideApproval(row.id, decision);
      setRows((current) => current.map((r) => (r.id === row.id ? { ...r, status: decision } : r)));
      push({
        variant: decision === "approved" ? "success" : "pending",
        title: decision === "approved" ? "Pengajuan disetujui" : "Pengajuan ditolak",
        description: `${row.employeeName} — ${row.type}, ${formatDate(row.startDate)}.`,
      });
    } catch (err) {
      push({
        variant: "danger",
        title: "Gagal memproses",
        description: err instanceof ApiError ? err.message : "Koneksi terputus.",
      });
    } finally {
      setDecidingId(null);
    }
  }

  const columns: Column<AbsenceRequestWithMeta>[] = [
    { key: "karyawan", header: "Karyawan", render: (r) => r.employeeName },
    { key: "divisi", header: "Divisi", render: (r) => r.employeeDivision },
    { key: "jenis", header: "Jenis", render: (r) => (r.type === "izin" ? "Izin" : "Sakit") },
    {
      key: "tanggal",
      header: "Tanggal",
      render: (r) =>
        r.startDate === r.endDate
          ? formatDate(r.startDate)
          : `${formatDate(r.startDate)} – ${formatDate(r.endDate)}`,
    },
    { key: "alasan", header: "Alasan", render: (r) => r.reason },
    { key: "status", header: "Status", render: (r) => <ApprovalBadge status={r.status} /> },
    {
      key: "aksi",
      header: "Aksi",
      align: "right",
      render: (r) =>
        r.status === "pending" ? (
          <div className="flex items-center justify-end gap-2">
            <Button
              variant="secondary"
              size="sm"
              disabled={decidingId !== null}
              loading={decidingId === r.id}
              onClick={() => void decide(r, "rejected")}
            >
              Tolak
            </Button>
            <Button
              size="sm"
              disabled={decidingId !== null}
              loading={decidingId === r.id}
              onClick={() => void decide(r, "approved")}
            >
              Setujui
            </Button>
          </div>
        ) : (
          <span className="text-caption text-muted">Sudah diproses</span>
        ),
    },
  ];

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        breadcrumb={[{ label: "Kehadiran", href: homeFor("admin_hr") }, { label: "Persetujuan" }]}
        title="Persetujuan izin & sakit"
      />

      <div className="flex flex-wrap items-center gap-2">
        {(["pending", "approved", "rejected", "all"] as const).map((value) => (
          <Button
            key={value}
            variant={filter === value ? "primary" : "tertiary"}
            size="sm"
            onClick={() => {
              setFilter(value);
              setPage(1);
            }}
          >
            {value === "pending" ? "Menunggu" : value === "approved" ? "Disetujui" : value === "rejected" ? "Ditolak" : "Semua"}
          </Button>
        ))}
      </div>

      <Table
        caption="Daftar pengajuan izin dan sakit karyawan"
        columns={columns}
        rows={pageRows}
        rowKey={(row) => row.id}
        loading={loading}
        error={error}
        onRetry={() => void load(filter)}
        empty={<p>Belum ada pengajuan di filter ini.</p>}
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
