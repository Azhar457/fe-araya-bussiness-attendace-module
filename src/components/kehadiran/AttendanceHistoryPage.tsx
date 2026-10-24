"use client";

import { useCallback, useEffect, useState } from "react";

import { Banner } from "@/components/ui/Banner";
import { Card } from "@/components/ui/Card";
import { PageHeader } from "@/components/ui/PageHeader";
import { StatusBadge } from "@/components/ui/Badge";
import { ApiError } from "@/lib/api/client";
import { getToday } from "@/lib/api/kehadiran";
import { formatDateTime } from "@/lib/format";
import type { LiveToday } from "@/lib/types";

/**
 * M13-US2/US4 — riwayat kehadiran. BE live belum punya endpoint riwayat bulanan;
 * hanya data hari ini (getToday) ditampilkan.
 */
export function AttendanceHistoryPage() {
  const [today, setToday] = useState<LiveToday | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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

  const attendance = today?.attendance ?? null;

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        breadcrumb={[{ label: "Kehadiran" }, { label: "Riwayat kehadiran" }]}
        title="Riwayat Kehadiran"
      />

      {error ? <Banner variant="danger" message={error} /> : null}

      {/* Kartu kehadiran hari ini */}
      <Card className="p-5 sm:p-6">
        <h2 className="text-h3 text-text">Hadir hari ini</h2>

        {loading ? (
          <p className="mt-3 text-body text-muted">Memuat…</p>
        ) : today?.hasCheckedIn && attendance ? (
          <div className="mt-4 flex flex-col gap-3">
            <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
              <div className="flex flex-col">
                <span className="text-caption text-muted">Jam masuk</span>
                <span className="text-body text-text">
                  {attendance.checkInAt ? formatDateTime(attendance.checkInAt) : "—"}
                </span>
              </div>
              <div className="flex flex-col">
                <span className="text-caption text-muted">Jam pulang</span>
                <span className="text-body text-text">
                  {attendance.checkOutAt ? formatDateTime(attendance.checkOutAt) : "Belum checkout"}
                </span>
              </div>
              {attendance.status ? (
                <StatusBadge status={attendance.status} />
              ) : null}
            </div>
          </div>
        ) : (
          <p className="mt-3 text-body text-muted">Belum ada kehadiran hari ini.</p>
        )}
      </Card>

      {/* Empty state riwayat bulanan */}
      <Card className="p-5 sm:p-6">
        <h2 className="text-h3 text-text">Riwayat bulanan</h2>
        <div className="mt-4 rounded-lg border border-line bg-surface-2 p-5 text-center">
          <p className="text-body text-muted">
            Riwayat bulanan belum tersedia di server.
          </p>
        </div>
      </Card>
    </div>
  );
}
