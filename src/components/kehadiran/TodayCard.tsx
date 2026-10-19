"use client";

import { useCallback, useEffect, useState } from "react";

import { Banner } from "@/components/ui/Banner";
import { StatusBadge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { PageHeader } from "@/components/ui/PageHeader";
import { Skeleton } from "@/components/ui/Skeleton";
import { useToast } from "@/components/ui/Toast";
import { ApiError } from "@/lib/api/client";
import { checkIn, checkOut, getToday, getWorkSettings } from "@/lib/api/kehadiran";
import { homeFor } from "@/lib/auth/constants";
import { formatDateLong, formatTime } from "@/lib/format";
import type { TodayAttendance, WorkSettings } from "@/lib/types";

export function TodayCard() {
  const { push } = useToast();
  const [attendance, setAttendance] = useState<TodayAttendance | null>(null);
  const [settings, setSettings] = useState<WorkSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const [today, workSettings] = await Promise.all([getToday(), getWorkSettings()]);
      setAttendance(today);
      setSettings(workSettings);
    } catch (error) {
      setLoadError(error instanceof ApiError ? error.message : "Gagal memuat kehadiran hari ini.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function submit(action: "check-in" | "check-out") {
    setSubmitting(true);
    try {
      const updated = action === "check-in" ? await checkIn() : await checkOut();
      setAttendance(updated);
      push({
        variant: "success",
        title: action === "check-in" ? "Check-in tercatat" : "Check-out tercatat",
        description:
          action === "check-in" && updated.isLate
            ? `Anda terlambat ${updated.lateMinutes} menit.`
            : "Waktu tercatat memakai jam server WIB.",
      });
    } catch (error) {
      const message = error instanceof ApiError ? error.message : "Koneksi terputus. Coba lagi.";
      // AC M13-US2#2: percobaan check-in kedua ditolak sistem.
      push({ variant: "danger", title: "Gagal mencatat kehadiran", description: message });
      void load();
    } finally {
      setSubmitting(false);
    }
  }

  const checkedIn = Boolean(attendance?.checkInAt);
  const checkedOut = Boolean(attendance?.checkOutAt);

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        breadcrumb={[{ label: "Kehadiran", href: homeFor("karyawan") }, { label: "Hari ini" }]}
        title="Kehadiran hari ini"
      />

      {loadError ? <Banner message={loadError} onRetry={() => void load()} /> : null}

      {loading ? (
        <Card className="mx-auto flex w-full max-w-card flex-col gap-4 p-5">
          <Skeleton className="h-5 w-40" />
          <Skeleton className="h-4 w-48" />
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-control w-full" />
        </Card>
      ) : null}

      {!loading && !loadError && attendance && settings ? (
        <Card className="mx-auto flex w-full max-w-card flex-col gap-5 p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-h3 text-text">{formatDateLong(attendance.date)}</p>
            {attendance.status === "hadir" || attendance.status === "terlambat" ? (
              <StatusBadge status={attendance.status} />
            ) : (
              <span className="text-caption text-muted">Belum check-in</span>
            )}
          </div>

          <p className="text-body text-muted">
            {settings.workStart}–{settings.workEnd} · Toleransi {settings.lateToleranceMinutes} menit
          </p>

          {attendance.isLate ? (
            <p className="text-body text-pending-fg">Anda terlambat {attendance.lateMinutes} menit.</p>
          ) : null}

          <dl className="flex flex-col gap-2 text-body">
            <div className="flex items-center justify-between gap-4">
              <dt className="text-muted">Masuk</dt>
              <dd className="tabular-nums">{attendance.checkInAt ? formatTime(attendance.checkInAt) : "—"}</dd>
            </div>
            <div className="flex items-center justify-between gap-4">
              <dt className="text-muted">Pulang</dt>
              <dd className="tabular-nums">{attendance.checkOutAt ? formatTime(attendance.checkOutAt) : "—"}</dd>
            </div>
          </dl>

          {checkedOut ? (
            <p className="text-body text-muted">Kehadiran hari ini sudah lengkap.</p>
          ) : (
            <Button
              className="w-full"
              loading={submitting}
              loadingText="Memproses…"
              onClick={() => void submit(checkedIn ? "check-out" : "check-in")}
            >
              {checkedIn ? "Check-out" : "Check-in"}
            </Button>
          )}
        </Card>
      ) : null}
    </div>
  );
}
