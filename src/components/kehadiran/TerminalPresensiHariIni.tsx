"use client";

import { useCallback, useEffect, useState } from "react";

import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { Skeleton } from "@/components/ui/Skeleton";
import { Button } from "@/components/ui/Button";
import { AlertIcon, CheckIcon } from "@/components/ui/Icons";
import { Timer } from "lucide-react";
import { getWorkSettings, getToday } from "@/lib/api/kehadiran";
import { timeToMinutes } from "@/lib/format";
import { onAttendanceChanged } from "@/lib/attendance-events";
import { useWibClock } from "@/lib/useWibClock";
import { ApiError } from "@/lib/api/client";
import type { TodayAttendance, WorkSettings } from "@/lib/types";

/**
 * Kartu "Terminal Presensi Harian" sesuai mockup:
 * - Jam masuk & target pulang dari pengaturan kerja
 * - Sisa waktu live sampai target pulang
 * - Tombol besar CTA presensi (check-in / check-out)
 */
export function TerminalPresensiHariIni() {
  const [attendance, setAttendance] = useState<TodayAttendance | null>(null);
  const [settings, setSettings] = useState<WorkSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [today, workSettings] = await Promise.all([getToday(), getWorkSettings()]);
      setAttendance(today);
      setSettings(workSettings);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Gagal memuat data kehadiran.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  // Ikut muat ulang saat CTA presensi mengubah kehadiran hari ini.
  useEffect(() => onAttendanceChanged(() => void load()), [load]);

  const clock = useWibClock();
  const nowMin = timeToMinutes(clock.slice(0, 5));

  const sisaMenit =
    attendance?.checkInAt && settings ? Math.max(0, timeToMinutes(settings.workEnd) - nowMin) : 0;
  const sisaJam = Math.floor(sisaMenit / 60);
  const sisaMenitSisa = sisaMenit % 60;

  const jamAktual = attendance?.checkInAt ? attendance.checkInAt.slice(11, 16) : "—";

  if (loading) {
    return (
      <Card className="flex flex-col gap-3 p-5">
        <Skeleton className="h-4 w-40" />
        <Skeleton className="h-4 w-56" />
        <Skeleton className="h-control w-full" />
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="flex flex-col gap-3 p-5">
        <p className="flex items-center gap-2 text-body text-danger-fg">
          <AlertIcon aria-hidden /> {error}
        </p>
        <Button variant="secondary" size="sm" onClick={() => void load()}>
          Coba lagi
        </Button>
      </Card>
    );
  }

  const sudahCheckIn = Boolean(attendance?.checkInAt);
  const sudahKeluar = Boolean(attendance?.checkOutAt);

  return (
    <Card className="flex flex-col gap-4 p-5">
      <div>
        <h2 className="flex items-center gap-2 text-h3 text-text">
          <Timer aria-hidden size={16} /> Terminal Presensi Harian
        </h2>
        <p className="text-caption text-muted">Status kehadiran hari ini</p>
      </div>

      <dl className="grid grid-cols-2 gap-4">
        <div className="flex flex-col gap-1">
          <dt className="text-caption text-muted">Jam Masuk</dt>
          <dd className="text-h3 tabular-nums text-text">{settings?.workStart ?? "—"}</dd>
        </div>
        <div className="flex flex-col gap-1">
          <dt className="text-caption text-muted">Estimasi Pulang</dt>
          <dd className="text-h3 tabular-nums text-text">{settings?.workEnd ?? "—"}</dd>
        </div>
        <div className="flex flex-col gap-1">
          <dt className="text-caption text-muted">Waktu Masuk Aktual</dt>
          <dd className="text-h3 tabular-nums text-text">{jamAktual}</dd>
        </div>
        <div className="flex flex-col gap-1">
          <dt className="text-caption text-muted">Sisa Waktu Kerja</dt>
          <dd className="text-h3 tabular-nums text-text">
            {sudahCheckIn ? `${sisaJam} j ${sisaMenitSisa} m` : "—"}
          </dd>
        </div>
      </dl>

      {sudahKeluar ? (
        <p className="flex items-center gap-2 text-body text-success-fg">
          <CheckIcon aria-hidden /> Kehadiran hari ini sudah lengkap.
        </p>
      ) : (
        <Badge tone={sudahCheckIn ? "success" : "info"}>
          {sudahCheckIn ? "Sudah check-in" : "Belum check-in"}
        </Badge>
      )}
    </Card>
  );
}
