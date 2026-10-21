"use client";

import { useEffect, useState } from "react";

import { Card } from "@/components/ui/Card";
import { Skeleton } from "@/components/ui/Skeleton";
import { Palmtree } from "lucide-react";
import { getLeaveQuota } from "@/lib/api/kehadiran";
import type { LeaveQuota } from "@/lib/types";

/** Kartu "Sisa Kuota Cuti Tahunan" sesuai mockup: angka besar + konteks total/terpakai. */
export function KuotaCutiTahunan() {
  const [quota, setQuota] = useState<LeaveQuota | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    getLeaveQuota()
      .then((q) => {
        if (!cancelled) setQuota(q);
      })
      .catch(() => {
        if (!cancelled) setError("Gagal memuat kuota cuti.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  if (loading) {
    return (
      <Card className="flex flex-col gap-2 p-5">
        <Skeleton className="h-4 w-32" />
        <Skeleton className="h-8 w-24" />
      </Card>
    );
  }

  if (error || !quota) {
    return (
      <Card className="flex flex-col gap-2 p-5">
        <p className="text-h3 text-text">Sisa Kuota Cuti</p>
        <p className="text-body text-danger-fg">{error ?? "Belum tersedia."}</p>
      </Card>
    );
  }

  return (
    <Card className="flex flex-col gap-2 p-5">
      <p className="flex items-center gap-2 text-caption text-muted">
        <Palmtree aria-hidden size={14} /> Sisa Kuota Cuti Tahunan
      </p>
      <p className="text-display tabular-nums text-primary">
        {quota.remaining}
        <span className="ml-2 text-body text-muted">hari</span>
      </p>
      <p className="text-caption text-muted">
        {quota.used} dari {quota.total} hari terpakai
      </p>
    </Card>
  );
}
