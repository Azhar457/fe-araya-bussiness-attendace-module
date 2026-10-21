"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import { Badge, StatusBadge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { Skeleton } from "@/components/ui/Skeleton";
import { BarChart3, History } from "lucide-react";
import { getMonthlySummary, getAttendanceHistory } from "@/lib/api/kehadiran";
import { onAttendanceChanged } from "@/lib/attendance-events";
import { currentMonth, formatMonthLabel } from "@/lib/format";
import type { AttendanceHistoryRow, MonthlySummary } from "@/lib/types";

/**
 * Kartu "Rekapitulasi Bulanan" + tabel "Riwayat 5 Presensi Terakhir" sesuai mockup:
 * 4 kartu angka (tepat waktu, terlambat, mangkir, cuti/izin) + tabel 5 baris.
 */
/** scope per-karyawan: baris milik employeeId sendiri; fallback baris pertama bila id tidak cocok
    (mis. mode BE saat karyawan_id di DB beda format dengan cookie sesi). */
export function RekapitulasiBulan({ employeeId }: { employeeId: string }) {
  const month = currentMonth();
  const [summary, setSummary] = useState<MonthlySummary | null>(null);
  const [history, setHistory] = useState<AttendanceHistoryRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [recap, rows] = await Promise.all([
        getMonthlySummary(month),
        getAttendanceHistory(),
      ]);
      setSummary(recap);
      setHistory(rows);
    } catch {
      setError("Gagal memuat rekapitulasi. Coba lagi.");
    } finally {
      setLoading(false);
    }
  }, [month]);

  useEffect(() => {
    void load();
  }, [load]);

  // Riwayat baris hari ini ikut terbaru setelah check-in/out di kartu CTA.
  useEffect(() => onAttendanceChanged(() => void load()), [load]);

  const row = useMemo(() => {
    const rows = summary?.rows ?? [];
    return rows.find((r) => r.employeeId === employeeId) ?? rows[0] ?? null;
  }, [summary, employeeId]);

  const totalCutiIzin = row ? row.cuti + row.izin + row.sakit : 0;

  if (loading) {
    return (
      <Card className="flex flex-col gap-3 p-5">
        <Skeleton className="h-4 w-48" />
        <Skeleton className="h-24 w-full" />
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="flex flex-col gap-2 p-5">
        <p className="text-body text-danger-fg">{error}</p>
        <button type="button" onClick={() => void load()} className="text-body text-primary hover:underline">
          Muat ulang
        </button>
      </Card>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <Card className="p-5">
        <div className="flex items-center justify-between">
          <h2 className="flex items-center gap-2 text-h3 text-text">
            <BarChart3 aria-hidden size={16} /> Rekapitulasi {formatMonthLabel(month)}
          </h2>
          <Badge tone="neutral">Bulan berjalan</Badge>
        </div>
        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <StatBox label="Tepat Waktu" value={row?.present ?? 0} tone="success" />
          <StatBox label="Terlambat" value={row?.late ?? 0} tone="pending" />
          <StatBox label="Mangkir" value={row?.alpa ?? 0} tone="danger" />
          <StatBox label="Cuti / Izin" value={totalCutiIzin} tone="info" />
        </div>
      </Card>

      <Card className="p-5">
        <h2 className="flex items-center gap-2 text-h3 text-text">
          <History aria-hidden size={16} /> Riwayat 5 Presensi Terakhir
        </h2>
        {history.length === 0 ? (
          <p className="mt-3 text-body text-muted">Belum ada riwayat presensi bulan ini.</p>
        ) : (
          <div className="table-scroll mt-3">
          <table className="w-full border-collapse text-body">
            <thead>
              <tr className="border-b border-line text-left text-caption text-muted">
                <th scope="col" className="py-2 pr-3 font-semibold">Tanggal</th>
                <th scope="col" className="py-2 pr-3 font-semibold">Masuk</th>
                <th scope="col" className="py-2 pr-3 font-semibold">Keluar</th>
                <th scope="col" className="py-2 pr-3 font-semibold">Lokasi</th>
                <th scope="col" className="py-2 font-semibold">Status</th>
              </tr>
            </thead>
            <tbody>
              {history.map((r, i) => (
                <tr key={`${r.tanggal}-${i}`} className="border-b border-line last:border-0">
                  <td className="py-2 pr-3 tabular-nums">{r.tanggal === "—" ? "—" : r.tanggal}</td>
                  <td className="py-2 pr-3 tabular-nums">{r.jam_check_in ?? "—"}</td>
                  <td className="py-2 pr-3 tabular-nums">{r.jam_check_out ?? "—"}</td>
                  <td className="py-2 pr-3 text-muted">{r.lokasi ?? "—"}</td>
                  <td className="py-2">
                    {r.status === "hadir" || r.status === "terlambat" ? (
                      <StatusBadge status={r.status} />
                    ) : (
                      <Badge tone="info">{r.status === "izin" ? "Izin" : "Alpa"}</Badge>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          </div>
        )}
      </Card>
    </div>
  );
}

function StatBox({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone: "success" | "pending" | "danger" | "info";
}) {
  const bg: Record<string, string> = {
    success: "bg-success-bg text-success-fg",
    pending: "bg-pending-bg text-pending-fg",
    danger: "bg-danger-bg text-danger-fg",
    info: "bg-info-bg text-info-fg",
  };
  return (
    <div className={`flex flex-col gap-1 rounded-lg p-3 ${bg[tone]}`}>
      <span className="text-caption font-semibold">{label}</span>
      <span className="text-display tabular-nums">{value}</span>
    </div>
  );
}
