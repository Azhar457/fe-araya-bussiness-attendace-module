"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import { Fingerprint, Clock } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { Skeleton } from "@/components/ui/Skeleton";
import { useToast } from "@/components/ui/Toast";
import { ApiError } from "@/lib/api/client";
import { checkIn, checkOut, getRecap, getToday } from "@/lib/api/kehadiran";
import { onAttendanceChanged, notifyAttendanceChanged } from "@/lib/attendance-events";
import { currentMonth, formatDate, formatDateLong, wibNow } from "@/lib/format";
import { useWibClock, wibGreeting } from "@/lib/useWibClock";
import type { LiveRecap, LiveToday } from "@/lib/types";

/**
 * Dashboard kehadiran karyawan (M13-US2) — layout mengikuti referensi UI/UX stitch.
 * Seluruh data dari BE LIVE: getToday (jam presensi/status/keterlambatan) +
 * getRecap (rekapitulasi bulan berjalan, baris milik karyawan sendiri).
 */
export function HariIniLive({ employeeName, employeeId }: { employeeName: string; employeeId: string }) {
  const [today, setToday] = useState<LiveToday | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [recap, setRecap] = useState<LiveRecap | null>(null);
  const [punching, setPunching] = useState(false);

  const clock = useWibClock();
  const { push } = useToast();

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setToday(await getToday());
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : "Gagal memuat data kehadiran.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  // Muat ulang kartu saat CTA presensi mengubah status hari ini.
  useEffect(() => onAttendanceChanged(() => void load()), [load]);

  // Rekapitulasi bulan berjalan (dipanggil terpisah: getRecap butuh bulan+tahun).
  useEffect(() => {
    const [tahun, bulan] = currentMonth().split("-").map(Number);
    getRecap(bulan, tahun)
      .then(setRecap)
      .catch(() => setRecap(null));
  }, []);

  // Baris rekap milik karyawan sendiri (karyawan_id numerik = cookie sesi).
  const recapRow = useMemo(() => {
    if (!recap?.data.rekap) return null;
    return recap.data.rekap.find((row) => row.karyawan_id === Number(employeeId)) ?? null;
  }, [recap, employeeId]);

  async function punch() {
    const attendance = today?.attendance;
    const action = attendance?.checkInAt && !attendance.checkOutAt ? checkOut : checkIn;
    setPunching(true);
    try {
      const result = await action();
      notifyAttendanceChanged();
      push({ variant: "success", title: "Presensi berhasil", description: result.message });
      await load();
    } catch (caught) {
      notifyAttendanceChanged();
      if (caught instanceof ApiError && caught.status === 422 && caught.code === "NOT_WORKDAY") {
        push({ variant: "danger", title: "Tidak dapat presensi", description: "Hari ini bukan hari kerja." });
      } else if (caught instanceof ApiError && caught.status === 409) {
        push({ variant: "info", title: "Sudah di-presensi", description: caught.message });
      } else {
        const message = caught instanceof ApiError ? caught.message : "Gagal memproses presensi.";
        push({ variant: "danger", title: "Gagal presensi", description: message });
      }
    } finally {
      setPunching(false);
    }
  }

  if (loading) {
    return (
      <div className="flex flex-col gap-5">
        <Card className="flex flex-col gap-3 p-5">
          <Skeleton className="h-6 w-56" />
          <Skeleton className="h-10 w-40" />
        </Card>
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-12">
          <Skeleton className="h-64 rounded-lg lg:col-span-7" />
          <Skeleton className="h-64 rounded-lg lg:col-span-5" />
        </div>
      </div>
    );
  }

  if (error || !today) {
    return (
      <Card className="flex flex-col gap-2 p-5">
        <p className="text-h3 text-text">Kehadiran Hari Ini</p>
        <p className="text-body text-danger-fg">{error ?? "Data belum tersedia."}</p>
        <button type="button" onClick={() => void load()} className="text-label text-primary hover:text-primary-hover">
          Coba lagi
        </button>
      </Card>
    );
  }

  const attendance = today.attendance;
  const isCheckedIn = Boolean(attendance?.checkInAt);
  const isCheckedOut = Boolean(attendance?.checkOutAt);
  const isLate = Boolean(attendance?.isLate);
  const lateMinutes = attendance?.lateMinutes ?? 0;

  const greeting = wibGreeting(Math.floor(wibNow().minutes / 60));

  // Status pill banner.
  let pillText = "Belum presensi";
  let pillTone: "pending" | "success" = "pending";
  if (isCheckedOut) {
    pillText = `Sudah keluar ${attendance!.checkOutAt?.slice(11, 16) ?? ""}`.replace("  ", " ");
    pillTone = "success";
  } else if (isCheckedIn) {
    pillText = `Sudah masuk ${attendance!.checkInAt?.slice(11, 16) ?? ""}`.replace("  ", " ");
    pillTone = "success";
  }

  // Tombol presensi: transisi state.
  let buttonLabel = "Presensi Masuk Sekarang";
  let buttonVariant: "primary" | "danger" | "neutral" = "primary";
  let buttonDisabled = false;
  if (isCheckedOut) {
    buttonLabel = "Hari Kerja Selesai";
    buttonVariant = "neutral";
    buttonDisabled = true;
  } else if (isCheckedIn) {
    buttonLabel = "Presensi Keluar";
    buttonVariant = "danger";
  }
  if (!today.isWorkday) {
    buttonLabel = "Hari Ini Bukan Hari Kerja";
    buttonVariant = "neutral";
    buttonDisabled = true;
  }

  return (
    <div className="flex flex-col gap-5">
      {/* Banner identitas + jam live WIB. */}
      <Card className="relative flex flex-col gap-4 overflow-hidden p-5 md:flex-row md:items-center md:justify-between">
        <div className="flex flex-col gap-1">
          <span className="flex w-fit items-center gap-2 rounded-full bg-surface-2 px-3 py-1 text-caption text-muted uppercase tracking-wide">
            <span aria-hidden className={`size-2 rounded-full ${today.isWorkday ? "bg-success-solid" : "bg-danger-solid"}`} />
            {today.isWorkday ? "Hari Kerja Aktif" : "Bukan Hari Kerja"}
          </span>
          <p className="text-h2 text-text">
            {greeting}, {employeeName}
          </p>
          <p className="text-body text-muted">
            Karyawan • Kehadiran M13 • {formatDateLong(today.date)}
          </p>
          {today.isWorkday ? (
            <Badge tone={pillTone}>{pillText}</Badge>
          ) : (
            <Badge tone="danger">Hari ini bukan hari kerja</Badge>
          )}
        </div>
        <div className="flex items-center gap-4 rounded-lg bg-surface-2 p-4">
          <div className="flex flex-col items-end">
            <span className="text-caption text-muted uppercase tracking-wide">Waktu Server (WIB)</span>
            <span className="text-display font-head tabular-nums text-primary">{clock}</span>
            <span className="text-body text-muted">{formatDateLong(today.date)}</span>
          </div>
          <div className="flex size-10 items-center justify-center rounded-lg bg-primary-soft text-primary">
            <Clock aria-hidden size={22} />
          </div>
        </div>
      </Card>

      {/* Grid utama: terminal presensi (kiri) + ringkasan & rekapitulasi (kanan). */}
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-12">
        {/* Terminal Presensi. */}
        <Card className="flex flex-col gap-4 p-5 lg:col-span-7">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-caption text-muted uppercase tracking-wide">Terminal Presensi Mandiri</p>
              <h2 className="mt-1 text-h3 text-text">Presensi Harian Anda</h2>
            </div>
            <Badge tone={isCheckedOut ? "neutral" : isCheckedIn ? "success" : "pending"}>
              {isCheckedOut ? "Selesai" : isCheckedIn ? "Sudah Masuk" : "Belum Presensi"}
            </Badge>
          </div>

          {/* Jadwal & status dari LiveToday.attendance saja. */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-1 rounded-lg bg-surface-2 p-4">
              <span className="text-caption text-muted uppercase tracking-wide">Jam Masuk</span>
              <span className="text-h3 text-text tabular-nums">
                {attendance?.checkInAt ? formatDateSafe(attendance.checkInAt) : "—"}
              </span>
              {attendance?.checkInAt ? <span className="text-caption text-muted">Waktu presensi masuk</span> : null}
            </div>
            <div className="flex flex-col gap-1 rounded-lg bg-surface-2 p-4">
              <span className="text-caption text-muted uppercase tracking-wide">Jam Keluar</span>
              <span className="text-h3 text-text tabular-nums">
                {attendance?.checkOutAt ? formatDateSafe(attendance.checkOutAt) : "—"}
              </span>
              {attendance?.checkOutAt ? <span className="text-caption text-muted">Waktu presensi keluar</span> : null}
            </div>
          </div>

          {isLate ? (
            <div className="flex items-center gap-2 rounded-lg bg-pending-bg p-3 text-pending-fg">
              <Badge tone="pending">{"Terlambat " + lateMinutes + " menit"}</Badge>
            </div>
          ) : null}

          {/* Tombol presensi besar. */}
          <button
            type="button"
            onClick={punch}
            disabled={buttonDisabled || punching}
            className={[
              "flex h-[56px] w-full items-center justify-center gap-2 rounded-lg text-label transition-all disabled:cursor-not-allowed",
              buttonVariant === "primary" && "bg-primary text-on-primary shadow hover:bg-primary-hover active:scale-[0.99]",
              buttonVariant === "danger" && "bg-danger-action text-on-danger-action shadow hover:opacity-90 active:scale-[0.99]",
              buttonVariant === "neutral" && "bg-surface-2 text-muted",
              buttonVariant === "primary" ? "" : "",
            ]
              .filter(Boolean)
              .join(" ")}
          >
            <Fingerprint aria-hidden size={24} />
            {punching ? "Memproses…" : buttonLabel}
          </button>
        </Card>

        {/* Kolon kanan: ringkasan hari ini + rekapitulasi bulan. */}
        <div className="flex flex-col gap-5 lg:col-span-5">
          <Card className="flex flex-col gap-4 p-5">
            <p className="text-caption text-muted uppercase tracking-wide">Ringkasan Hari Ini</p>
            <div className="flex flex-col gap-3">
              <SummaryRow label="Waktu Masuk" value={attendance?.checkInAt ? formatDateSafe(attendance.checkInAt) : "—"} />
              <SummaryRow label="Waktu Keluar" value={attendance?.checkOutAt ? formatDateSafe(attendance.checkOutAt) : "—"} />
              <div className="flex items-center justify-between">
                <span className="text-body text-muted">Status</span>
                {attendance?.status ? (
                  <Badge tone={statusTone(attendance.status)}>{statusLabel(attendance.status)}</Badge>
                ) : (
                  <span className="text-body text-muted">Belum presensi</span>
                )}
              </div>
              {isLate ? (
                <div className="flex items-center justify-between">
                  <span className="text-body text-muted">Keterlambatan</span>
                  <span className="text-body text-pending-fg tabular-nums">{lateMinutes} menit</span>
                </div>
              ) : null}
            </div>
          </Card>

          <Card className="flex flex-col gap-4 p-5">
            <p className="text-caption text-muted uppercase tracking-wide">Rekapitulasi Bulan Ini</p>
            {recapRow ? (
              <div className="grid grid-cols-2 gap-3">
                <RecapBox label="Tepat Waktu" value={recapRow.hadir} tone="success" />
                <RecapBox label="Terlambat" value={recapRow.terlambat} tone="pending" />
                <RecapBox label="Izin / Sakit" value={recapRow.izin_sakit} tone="info" />
                <RecapBox label="Alpa" value={recapRow.alpa} tone="danger" />
              </div>
            ) : (
              <p className="text-body text-muted">Rekapitulasi bulan ini belum tersedia.</p>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}

/* ── Helper di bawah (tidak diekspor). ── */

/** Ambil HH:MM dari ISO/+07:00 atau string "YYYY-MM-DDTHH:MM". */
function formatDateSafe(input: string): string {
  return input.slice(11, 16) || input;
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-body text-muted">{label}</span>
      <span className="text-body text-text tabular-nums">{value}</span>
    </div>
  );
}

function RecapBox({ label, value, tone }: { label: string; value: number; tone: "success" | "pending" | "info" | "danger" }) {
  const bg = { success: "bg-success-bg", pending: "bg-pending-bg", info: "bg-info-bg", danger: "bg-danger-bg" }[tone];
  const fg = { success: "text-success-fg", pending: "text-pending-fg", info: "text-info-fg", danger: "text-danger-fg" }[tone];
  return (
    <div className={`flex flex-col gap-1 rounded-lg p-3 ${bg}`}>
      <span className={`text-caption ${fg}`}>{label}</span>
      <span className={`text-h3 ${fg} tabular-nums`}>{value}</span>
    </div>
  );
}

function statusLabel(status: NonNullable<LiveToday["attendance"]>["status"]): string {
  const map: Record<string, string> = {
    hadir: "Hadir",
    terlambat: "Terlambat",
    izin: "Izin",
    sakit: "Sakit",
    cuti: "Cuti",
    alpa: "Alpa",
  };
  return map[status ?? ""] ?? "Belum presensi";
}

function statusTone(status: NonNullable<LiveToday["attendance"]>["status"]): "success" | "pending" | "info" | "danger" | "neutral" {
  const map: Record<string, "success" | "pending" | "info" | "danger" | "neutral"> = {
    hadir: "success",
    terlambat: "pending",
    izin: "info",
    sakit: "info",
    cuti: "info",
    alpa: "danger",
  };
  return map[status ?? ""] ?? "neutral";
}
