"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import { CalendarDays, Clock, Inbox } from "lucide-react";
import { Badge, StatusBadge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Dialog } from "@/components/ui/Dialog";
import { FormField, Select } from "@/components/ui/FormField";
import { PageHeader } from "@/components/ui/PageHeader";
import { Skeleton } from "@/components/ui/Skeleton";
import { Table, type Column } from "@/components/ui/Table";
import { useToast } from "@/components/ui/Toast";
import { ApiError, downloadFile } from "@/lib/api/client";
import { deleteLeave, getAttendanceMonth, listLeaves } from "@/lib/api/kehadiran";
import { currentMonth, formatDate, formatDateLong, formatMonthLabel, formatTime, lastMonths, wibNow } from "@/lib/format";
import type { LiveLeaveList, M13AttendanceItem } from "@/lib/types";

const BULAN_LIST = lastMonths();

/** Status presensi yang berasal dari pengajuan izin/sakit. */
const LEAVE_STATUSES = new Set(["izin", "sakit"]);
const JENIS_LABEL: Record<string, string> = {
  izin: "Izin",
  sakit: "Sakit",
  tugas_khusus: "Tugas Khusus",
};

/** Ambil HH:MM dari ISO "+07:00" atau string "YYYY-MM-DDTHH:MM:SS+07:00". */
function timeOfDay(input: string | null): string {
  if (!input) return "—";
  return input.slice(11, 16);
}

function isLateRow(item: M13AttendanceItem): boolean {
  return item.isLate || item.status === "terlambat";
}

/**
 * M13-US2 — Detail Kehadiran (karyawan).
 *
 * Pilih bulan → daftar presensi per tanggal (GET /api/attendance?month=).
 * Klik satu baris → detail per tanggal: jam masuk, jam pulang, status,
 * keterlambatan. Juga berfungsi untuk hari yang sudah lewat (riwayat).
 */
export function AttendanceDetailPage({ employeeName }: { employeeName: string }) {
  const [month, setMonth] = useState(currentMonth());
  const [items, setItems] = useState<M13AttendanceItem[]>([]);
  const [selected, setSelected] = useState<M13AttendanceItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [leaves, setLeaves] = useState<LiveLeaveList["data"]>([]);
  const [leaveLoading, setLeaveLoading] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const { push: toast } = useToast();

  const load = useCallback(async (m: string) => {
    setLoading(true);
    setError(null);
    setSelected(null);
    try {
      const result = await getAttendanceMonth(m);
      setItems((result.items ?? []).toSorted((a, b) => b.date.localeCompare(a.date)));
    } catch (caught) {
      setItems([]);
      setError(caught instanceof ApiError ? caught.message : "Gagal memuat data kehadiran.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load(month);
  }, [month, load]);

  // Pengajuan izin hanya dimuat saat baris yang dibuka memang berasal dari izin.
  useEffect(() => {
    if (!selected || !LEAVE_STATUSES.has(selected.status ?? "")) {
      setLeaves([]);
      setConfirmDelete(false);
      return;
    }

    let alive = true;
    setLeaveLoading(true);
    listLeaves()
      .then((res) => {
        if (alive) setLeaves(res.data ?? []);
      })
      .catch(() => {
        if (alive) setLeaves([]);
      })
      .finally(() => {
        if (alive) setLeaveLoading(false);
      });

    return () => {
      alive = false;
    };
  }, [selected]);

  const leaveRows = useMemo(
    () => leaves.filter((row) => row.tanggal === selected?.date),
    [leaves, selected],
  );
  const leave = leaveRows[0];

  // Hanya pengajuan yang masih menunggu dan belum lewat yang boleh dibatalkan.
  const canCancel = Boolean(
    leave &&
      (!leave.status || leave.status === "pending") &&
      (selected?.date ?? "") >= wibNow().dateKey,
  );

  const hapusPengajuan = useCallback(async () => {
    if (!leave) return;

    const key = String(leave.pengajuan_id ?? leave.id ?? "");
    const ids = leaves
      .filter((row) => String(row.pengajuan_id ?? row.id ?? "") === key)
      .map((row) => row.id)
      .filter((id): id is number => typeof id === "number");

    if (ids.length === 0) {
      toast({ variant: "danger", title: "Pengajuan tidak ditemukan, tidak ada yang dibatalkan." });
      setConfirmDelete(false);
      return;
    }

    setDeleting(true);
    const hasil = await Promise.allSettled(ids.map((id) => deleteLeave(id)));
    setDeleting(false);
    setConfirmDelete(false);

    const gagal = hasil.filter((h) => h.status === "rejected").length;
    if (gagal > 0) {
      toast({
        variant: "pending",
        title: `Pengajuan dibatalkan sebagian (${hasil.length - gagal} dari ${hasil.length}).`,
        description: "Muat ulang halaman untuk memeriksa sisanya.",
      });
    } else {
      toast({ variant: "success", title: "Pengajuan dibatalkan." });
    }

    await load(month);
  }, [leave, leaves, load, month, toast]);

  const columns: Column<M13AttendanceItem>[] = [
    {
      key: "date",
      header: "Tanggal",
      render: (row) => <span className="text-body text-text tabular-nums">{formatDate(row.date)}</span>,
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
      render: (row) =>
        row.status ? (
          <StatusBadge status={row.status} />
        ) : (
          <span className="text-body text-muted">—</span>
        ),
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
    {
      key: "aksi",
      header: "Detail",
      align: "right",
      render: (row) => (
        <button
          type="button"
          onClick={() => setSelected(row)}
          className="inline-flex items-center gap-1 text-label text-primary hover:text-primary-hover"
        >
          <Clock aria-hidden size={14} />
          Lihat
        </button>
      ),
    },
  ];

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        breadcrumb={[
          { label: "Kehadiran", href: "/kehadiran/hari-ini" },
          { label: "Detail Kehadiran" },
        ]}
        title={`Detail Kehadiran — ${employeeName}`}
      />

      <div className="flex flex-col gap-4 sm:flex-row sm:items-end">
        <FormField id="attendance-month" label="Pilih Bulan">
          <Select
            id="attendance-month"
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

      {selected ? (
        <Card className="p-5">
          <div className="flex items-start justify-between gap-4">
            <div className="flex flex-col gap-1">
              <p className="text-caption font-semibold uppercase tracking-wide text-muted">
                {isTodayDate(selected.date) ? "Hari Ini" : "Hari Lewat"}
              </p>
              <div className="flex flex-wrap items-center gap-3">
                <h3 className="text-h3 text-text">{formatDateLong(selected.date)}</h3>
                {selected.status ? (
                  <StatusBadge status={selected.status} />
                ) : null}
                {selected.lateMinutes > 0 ? (
                  <Badge tone="pending">{`Terlambat ${selected.lateMinutes} mnt`}</Badge>
                ) : null}
              </div>
            </div>
            <button
              type="button"
              onClick={() => setSelected(null)}
              aria-label="Tutup detail"
              className="text-body text-muted hover:text-text"
            >
              Tutup ×
            </button>
          </div>

          <dl className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-4">
            <div className="flex flex-col gap-1">
              <dt className="text-caption text-muted">Jam Masuk</dt>
              <dd className="text-body text-text tabular-nums">{formatTime(timeOfDay(selected.checkInAt))}</dd>
            </div>
            <div className="flex flex-col gap-1">
              <dt className="text-caption text-muted">Jam Pulang</dt>
              <dd className="text-body text-text tabular-nums">{formatTime(timeOfDay(selected.checkOutAt))}</dd>
            </div>
            <div className="flex flex-col gap-1">
              <dt className="text-caption text-muted">Status</dt>
              <dd className="text-body text-text capitalize">
                {selected.status ?? "—"}
              </dd>
            </div>
            <div className="flex flex-col gap-1">
              <dt className="text-caption text-muted">Keterlambatan</dt>
              <dd className="text-body text-text tabular-nums">
                {selected.lateMinutes > 0 ? `${selected.lateMinutes} mnt` : "0 mnt"}
              </dd>
            </div>
          </dl>

          {LEAVE_STATUSES.has(selected.status ?? "") ? (
            <div className="mt-4 flex flex-col gap-3 border-t border-line pt-4">
              <p className="text-caption font-semibold uppercase tracking-wide text-muted">
                Detail Perizinan
              </p>

              {leaveLoading ? (
                <span className="text-caption text-muted">Memuat pengajuan…</span>
              ) : leave ? (
                <>
                  <dl className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                    <div className="flex flex-col gap-1">
                      <dt className="text-caption text-muted">Jenis</dt>
                      <dd className="text-body text-text">
                        {JENIS_LABEL[leave.jenis] ?? leave.jenis}
                      </dd>
                    </div>
                    <div className="flex flex-col gap-1">
                      <dt className="text-caption text-muted">Status Pengajuan</dt>
                      <dd className="text-body text-text">
                        {leave.status === "disetujui"
                          ? "Disetujui"
                          : leave.status === "ditolak"
                            ? "Ditolak"
                            : "Menunggu"}
                      </dd>
                    </div>
                    <div className="col-span-2 flex flex-col gap-1">
                      <dt className="text-caption text-muted">Alasan</dt>
                      <dd className="text-body text-text">{leave.alasan || "—"}</dd>
                    </div>
                  </dl>

                  {leave.reviewer_note ? (
                    <p className="text-caption text-muted">
                      Catatan peninjau: {leave.reviewer_note}
                    </p>
                  ) : null}

                  <div className="flex flex-wrap gap-3">
                    {leave.attachment ? (
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => {
                          if (leave.attachment) {
                            void downloadFile(
                              leave.attachment.url,
                              `lampiran-${selected.date}.${
                                leave.attachment.url.endsWith(".pdf") ? "pdf" : "jpg"
                              }`,
                            );
                          }
                        }}
                      >
                        Unduh Lampiran
                      </Button>
                    ) : null}
                    {canCancel ? (
                      <Button variant="danger" size="sm" onClick={() => setConfirmDelete(true)}>
                        Batalkan Pengajuan
                      </Button>
                    ) : null}
                  </div>

                  {!canCancel && (!leave.status || leave.status === "pending") ? (
                    <p className="text-caption text-muted">
                      Pengajuan sudah lewat dan tidak dapat dibatalkan.
                    </p>
                  ) : null}
                </>
              ) : (
                <p className="text-caption text-muted">
                  Pengajuan izin tidak ditemukan untuk tanggal ini.
                </p>
              )}
            </div>
          ) : null}
        </Card>
      ) : null}

      {loading ? (
        <Card className="flex flex-col items-center gap-3 p-7">
          <Inbox aria-hidden size={32} className="text-muted" />
          <p className="text-body text-muted">Memuat data kehadiran…</p>
          <Skeleton className="h-4 w-[160px]" />
        </Card>
      ) : error ? (
        <Card className="flex flex-col gap-3 p-5">
          <p className="text-body text-danger-fg">{error}</p>
          <button
            type="button"
            onClick={() => void load(month)}
            className="text-label text-primary hover:text-primary-hover"
          >
            Coba lagi
          </button>
        </Card>
      ) : (
        <Table
          caption="Riwayat kehadiran bulan terpilih"
          columns={columns}
          rows={items}
          rowKey={(row) => `${row.date}-${row.id}`}
          empty={
            <div className="flex flex-col items-center gap-2">
              <CalendarDays aria-hidden size={24} />
              <p className="text-body">Belum ada data kehadiran di {formatMonthLabel(month)}.</p>
            </div>
          }
        />
      )}

      <Dialog
        open={confirmDelete}
        title="Batalkan pengajuan?"
        description={
          leave
            ? `Pengajuan ${JENIS_LABEL[leave.jenis] ?? leave.jenis} beserta seluruh tanggalnya akan dihapus dan tidak dapat dikembalikan.`
            : undefined
        }
        confirmLabel="Ya, Batalkan"
        loading={deleting}
        onConfirm={() => void hapusPengajuan()}
        onCancel={() => setConfirmDelete(false)}
      />
    </div>
  );
}

/** Bandingkan dengan tanggal WIB, bukan zona waktu browser. */
function isTodayDate(dateKey: string): boolean {
  return dateKey === wibNow().dateKey;
}
