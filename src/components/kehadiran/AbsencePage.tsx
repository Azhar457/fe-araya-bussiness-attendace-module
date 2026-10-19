"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import { ApprovalBadge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Dialog } from "@/components/ui/Dialog";
import { FormField, Input, RadioGroup, Select, Textarea } from "@/components/ui/FormField";
import { PageHeader } from "@/components/ui/PageHeader";
import { Pagination } from "@/components/ui/Pagination";
import { Table, type Column } from "@/components/ui/Table";
import { useToast } from "@/components/ui/Toast";
import { ApiError } from "@/lib/api/client";
import { cancelAbsenceRequest, createAbsenceRequest, listAbsenceRequests } from "@/lib/api/kehadiran";
import { homeFor } from "@/lib/auth/constants";
import { formatDate } from "@/lib/format";
import { REASON_MAX, validateAbsence, type AbsenceInput, type FieldErrors } from "@/lib/validation";
import type { AbsenceRequest, AbsenceType } from "@/lib/types";

const TYPE_OPTIONS = [
  { value: "izin", label: "Izin" },
  { value: "sakit", label: "Sakit" },
];

const EMPTY_FORM: AbsenceInput = { type: "izin", startDate: "", endDate: "", reason: "" };

export function AbsencePage() {
  const { push } = useToast();

  const [form, setForm] = useState<AbsenceInput>(EMPTY_FORM);
  const [errors, setErrors] = useState<FieldErrors<AbsenceInput>>({});
  const [submitting, setSubmitting] = useState(false);

  const [rows, setRows] = useState<AbsenceRequest[]>([]);
  const [listLoading, setListLoading] = useState(true);
  const [listError, setListError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const [cancelling, setCancelling] = useState<AbsenceRequest | null>(null);
  const [cancelLoading, setCancelLoading] = useState(false);

  const loadList = useCallback(async () => {
    setListLoading(true);
    setListError(null);
    try {
      setRows(await listAbsenceRequests());
    } catch (error) {
      setListError(error instanceof ApiError ? error.message : "Gagal memuat riwayat pengajuan.");
    } finally {
      setListLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadList();
  }, [loadList]);

  function validateField(field: keyof AbsenceInput) {
    const all = validateAbsence(form);
    setErrors((prev) => ({ ...prev, [field]: all[field] }));
  }

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const fieldErrors = validateAbsence(form);
    setErrors(fieldErrors);
    if (Object.keys(fieldErrors).length > 0) return;

    setSubmitting(true);
    try {
      const created = await createAbsenceRequest({ ...form, reason: form.reason.trim() });
      setForm(EMPTY_FORM);
      setErrors({});
      setPage(1);
      await loadList();
      push({
        variant: "success",
        title: "Pengajuan terkirim",
        description: `${created.type === "izin" ? "Izin" : "Sakit"} ${formatDate(created.startDate)} menunggu persetujuan.`,
      });
    } catch (error) {
      if (error instanceof ApiError && error.fields) {
        setErrors(error.fields as FieldErrors<AbsenceInput>);
      }
      push({
        variant: "danger",
        title: "Pengajuan gagal dikirim",
        description: error instanceof ApiError ? error.message : "Koneksi terputus. Coba lagi.",
      });
    } finally {
      setSubmitting(false);
    }
  }

  async function onConfirmCancel() {
    if (!cancelling) return;
    setCancelLoading(true);
    try {
      await cancelAbsenceRequest(cancelling.id);
      setCancelling(null);
      await loadList();
      push({ variant: "success", title: "Pengajuan dibatalkan", description: "Pengajuan dihapus dari daftar." });
    } catch (error) {
      push({
        variant: "danger",
        title: "Pengajuan gagal dibatalkan",
        description: error instanceof ApiError ? error.message : "Koneksi terputus. Coba lagi.",
      });
    } finally {
      setCancelLoading(false);
    }
  }

  const filtered = useMemo(() => {
    const keyword = query.trim().toLowerCase();
    return rows
      .filter((row) => !statusFilter || row.status === statusFilter)
      .filter((row) => !keyword || row.reason.toLowerCase().includes(keyword));
  }, [rows, query, statusFilter]);

  const pageCount = Math.max(1, Math.ceil(filtered.length / pageSize));
  const currentPage = Math.min(page, pageCount);
  const pageRows = filtered.slice((currentPage - 1) * pageSize, currentPage * pageSize);

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
        breadcrumb={[{ label: "Kehadiran", href: homeFor("karyawan") }, { label: "Izin & sakit" }]}
        title="Ajukan izin atau sakit"
      />

      <form onSubmit={onSubmit} noValidate className="flex flex-col gap-5">
        <Card className="flex max-w-form flex-col gap-5 p-5">
          <RadioGroup
            id="jenis"
            name="jenis"
            legend="Jenis"
            required
            options={TYPE_OPTIONS}
            value={form.type}
            onChange={(value) => setForm({ ...form, type: value as AbsenceType })}
            error={errors.type}
          />

          <FormField id="startDate" label="Tanggal mulai" required error={errors.startDate}>
            <Input
              type="date"
              value={form.startDate}
              onChange={(event) => setForm({ ...form, startDate: event.target.value })}
              onBlur={() => validateField("startDate")}
            />
          </FormField>

          <FormField id="endDate" label="Tanggal selesai" required error={errors.endDate}>
            <Input
              type="date"
              value={form.endDate}
              onChange={(event) => setForm({ ...form, endDate: event.target.value })}
              onBlur={() => validateField("endDate")}
            />
          </FormField>

          <FormField
            id="reason"
            label="Alasan"
            required
            error={errors.reason}
            hint={
              <span className="tabular-nums">
                {form.reason.length}/{REASON_MAX}
              </span>
            }
          >
            <Textarea
              rows={4}
              maxLength={REASON_MAX}
              value={form.reason}
              placeholder="Tulis alasan singkat, misalnya keperluan keluarga."
              onChange={(event) => setForm({ ...form, reason: event.target.value })}
              onBlur={() => validateField("reason")}
            />
          </FormField>
        </Card>

        <div className="flex max-w-form justify-end gap-3">
          <Button
            type="button"
            variant="secondary"
            disabled={submitting}
            onClick={() => {
              setForm(EMPTY_FORM);
              setErrors({});
            }}
          >
            Batal
          </Button>
          <Button type="submit" loading={submitting} loadingText="Mengirim…">
            Kirim pengajuan
          </Button>
        </div>
      </form>

      <h2 className="text-h2 text-text">Riwayat pengajuan</h2>

      <Card className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center">
        <FormField id="cari-riwayat" label="Cari alasan">
          <Input
            type="search"
            placeholder="Cari alasan pengajuan"
            value={query}
            onChange={(event) => {
              setQuery(event.target.value);
              setPage(1);
            }}
          />
        </FormField>
        <FormField id="filter-status" label="Filter status">
          <Select
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
        loading={listLoading}
        error={listError}
        onRetry={() => void loadList()}
        empty={
          <>
            <p>Belum ada pengajuan.</p>
            <Button variant="secondary" size="sm" onClick={() => document.getElementById("jenis-izin")?.focus()}>
              Isi pengajuan
            </Button>
          </>
        }
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
