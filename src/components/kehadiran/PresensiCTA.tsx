"use client";

import { useCallback, useEffect, useState } from "react";

import { Download, LogIn, LogOut } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Skeleton } from "@/components/ui/Skeleton";
import { useToast } from "@/components/ui/Toast";
import { ApiError } from "@/lib/api/client";
import {
  checkIn,
  checkOut,
  getAttendanceHistory,
  getToday,
} from "@/lib/api/kehadiran";
import { getCurrentPosition, GeoError } from "@/lib/geo";
import { notifyAttendanceChanged } from "@/lib/attendance-events";
import type { AttendanceHistoryRow, TodayAttendance } from "@/lib/types";

/**
 * Kartu CTA presensi besar + tombol "Export Log" sesuai mockup:
 * tombol utama full-width besar + tombol sekunder export CSV riwayat 5 terakhir.
 */
export function PresensiCTA() {
  const { push } = useToast();
  const [attendance, setAttendance] = useState<TodayAttendance | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setAttendance(await getToday());
    } catch (err) {
      push({
        variant: "danger",
        title: "Gagal memuat status",
        description: err instanceof ApiError ? err.message : "Koneksi terputus.",
      });
      setAttendance(null);
    } finally {
      setLoading(false);
    }
  }, [push]);

  useEffect(() => {
    void load();
  }, [load]);

  const sudahCheckIn = Boolean(attendance?.checkInAt);
  const sudahKeluar = Boolean(attendance?.checkOutAt);

  async function submit() {
    setSubmitting(true);
    try {
      const geo = await getCurrentPosition();
      const updated = sudahCheckIn
        ? await checkOut(geo)
        : await checkIn(geo);
      setAttendance((prev) =>
        prev
          ? { ...prev, ...updated }
          : updated,
      );
      notifyAttendanceChanged();

      if (geo.spoof.suspect) {
        push({
          variant: "pending",
          title: "Geolokasi terlihat tidak wajar",
          description: geo.spoof.reasons.join("; "),
        });
      }

      push({
        variant: "success",
        title: sudahCheckIn ? "Check-out tercatat" : "Check-in tercatat",
        description: sudahKeluar
          ? "Hari ini selesai."
          : "Waktu tercatat memakai jam server WIB.",
      });
    } catch (err) {
      let msg = "Koneksi terputus. Coba lagi.";
      if (err instanceof GeoError) {
        msg = `Geolokasi gagal (${err.code}). Pastikan izin lokasi aktif.`;
      } else if (err instanceof ApiError) {
        msg = err.message;
      }
      push({ variant: "danger", title: "Gagal mencatat kehadiran", description: msg });
      // Sinkronkan status dengan server: mis. 409 "sudah check-in" → tombol ikut berubah.
      void load();
      notifyAttendanceChanged();
    } finally {
      setSubmitting(false);
    }
  }

  async function exportLog() {
    try {
      const rows = await getAttendanceHistory();
      const header = "tanggal,jam_check_in,jam_check_out,status,lokasi";
      const lines = rows.map((r: AttendanceHistoryRow) =>
        [r.tanggal, r.jam_check_in ?? "", r.jam_check_out ?? "", r.status, r.lokasi ?? ""].join(","),
      );
      const csv = [header, ...lines].join("\n");
      const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `presensi-log.csv`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      push({
        variant: "success",
        title: "Log diekspor",
        description: "5 presensi terakhir disimpan sebagai CSV.",
      });
    } catch {
      push({
        variant: "danger",
        title: "Gagal export log",
        description: "Riwayat tidak tersedia saat ini.",
      });
    }
  }

  if (loading) {
    return (
      <Card className="flex flex-col gap-3 p-5">
        <Skeleton className="h-4 w-40" />
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-9 w-full" />
      </Card>
    );
  }

  return (
    <Card className="flex flex-col gap-4 p-5">
      <h2 className="text-h3 text-text">Terminal Presensi</h2>

      {sudahKeluar ? (
        <p className="text-body text-success-fg">Presensi hari ini sudah lengkap.</p>
      ) : (
        <Button
          variant="primary"
          loading={submitting}
          loadingText="Memproses…"
          onClick={() => void submit()}
          leftIcon={sudahCheckIn ? <LogOut aria-hidden size={16} /> : <LogIn aria-hidden size={16} />}
          className="w-full h-control"
        >
          {sudahCheckIn ? "Presensi Keluar Sekarang" : "Presensi Masuk Sekarang"}
        </Button>
      )}

      <Button
        variant="secondary"
        size="sm"
        leftIcon={<Download aria-hidden size={16} />}
        className="w-full"
        onClick={() => void exportLog()}
      >
        Export Log (CSV)
      </Button>
    </Card>
  );
}
