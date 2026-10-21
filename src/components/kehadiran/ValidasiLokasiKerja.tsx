"use client";

import { useCallback, useEffect, useState } from "react";
import { MapPin } from "lucide-react";

import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Skeleton } from "@/components/ui/Skeleton";
import { WarningIcon } from "@/components/ui/Icons";
import { getWorkSettings } from "@/lib/api/kehadiran";
import { getCurrentPosition, GeoError, haversineMeters } from "@/lib/geo";
import type { WorkSettings } from "@/lib/types";

/**
 * Validasi lokasi kerja (geofence) sesuai mockup.
 * Koordinat kantor diambil dari env NEXT_PUBLIC_OFFICE_LAT/LNG (jika sudah di-set).
 * Radius default 50 m — sesuai angka di mockup UI.
 * Status:
 *  - "aman"      (jarak ≤ radius)      → success
 *  - "dekat"     (radius < jarak ≤ 500m) → pending
 *  - "di luar"   (jarak > 500 m)        → danger
 *  - "tidak_ada" (env / geo gagal)      → neutral + info
 */
const OFFICE_LAT_RAW = process.env.NEXT_PUBLIC_OFFICE_LAT;
const OFFICE_LNG_RAW = process.env.NEXT_PUBLIC_OFFICE_LNG;
const OFFICE_RADIUS_M = Number(process.env.NEXT_PUBLIC_OFFICE_RADIUS_M ?? "50");

/** Env kosong / "0" berarti belum di-set, bukan koordinat (0,0) di equator. */
function parseCoord(raw: string | undefined): number | null {
  if (!raw || raw.trim() === "") return null;
  const n = Number(raw);
  return Number.isFinite(n) ? n : null;
}

const OFFICE_LAT = parseCoord(OFFICE_LAT_RAW);
const OFFICE_LNG = parseCoord(OFFICE_LNG_RAW);
const HAS_OFFICE = OFFICE_LAT !== null && OFFICE_LNG !== null;

type GeoState =
  | { kind: "idle" }
  | { kind: "checking" }
  | { kind: "done"; distanceMeters: number; suspect: boolean; reasons: string[] }
  | { kind: "error"; message: string }
  | { kind: "no_office" };

export function ValidasiLokasiKerja() {
  const [state, setState] = useState<GeoState>({ kind: "idle" });

  const check = useCallback(async () => {
    if (!HAS_OFFICE) {
      setState({ kind: "no_office" });
      return;
    }
    setState({ kind: "checking" });
    try {
      const geo = await getCurrentPosition();
      const distance = haversineMeters(
        { latitude: OFFICE_LAT!, longitude: OFFICE_LNG! },
        { latitude: geo.latitude, longitude: geo.longitude },
      );
      setState({
        kind: "done",
        distanceMeters: distance,
        suspect: geo.spoof.suspect,
        reasons: geo.spoof.reasons,
      });
    } catch (err) {
      if (err instanceof GeoError) {
        setState({ kind: "error", message: err.message });
      } else {
        setState({ kind: "error", message: "Gagal membaca koordinat." });
      }
    }
  }, []);

  useEffect(() => {
    if (HAS_OFFICE) void check();
    else setState({ kind: "no_office" });
  }, [check, HAS_OFFICE]);

  let tone: "success" | "pending" | "danger" | "neutral" = "neutral";
  let label = "Belum diperiksa";
  let detail = "";

  if (state.kind === "done") {
    const d = state.distanceMeters;
    if (d <= OFFICE_RADIUS_M) {
      tone = "success";
      label = "Aman & Sesuai";
      detail = `Jarak ${Math.round(d)} m dari kantor (radius ${OFFICE_RADIUS_M} m).`;
    } else if (d <= 500) {
      tone = "pending";
      label = "Dekat — di luar radius";
      detail = `Jarak ${Math.round(d)} m dari kantor. Radius valid ${OFFICE_RADIUS_M} m.`;
    } else {
      tone = "danger";
      label = "Di luar area";
      detail = `Jarak ${Math.round(d)} m dari kantor. Presensi mungkin ditolak.`;
    }
    if (state.suspect) {
      detail += ` Sinyal: ${state.reasons.join("; ")}`;
    }
  } else if (state.kind === "checking") {
    tone = "neutral";
    label = "Membaca koordinat…";
  } else if (state.kind === "error") {
    tone = "danger";
    label = "Geolokasi gagal";
    detail = state.message;
  } else if (state.kind === "no_office") {
    tone = "neutral";
    label = "Koordinat kantor belum di-set";
    detail = "Hubungi HR untuk mengkonfigurasi NEXT_PUBLIC_OFFICE_LAT/LNG di env.";
  }

  return (
    <Card className="flex flex-col gap-3 p-5">
      <div className="flex items-center justify-between">
        <h2 className="flex items-center gap-2 text-h3 text-text">
          <MapPin aria-hidden size={16} /> Validasi Lokasi Kerja
        </h2>
        <Badge tone={tone}>{label}</Badge>
      </div>

      <p className="text-body text-muted">{detail}</p>

      {HAS_OFFICE ? (
        <div className="flex flex-col gap-1">
          <p className="text-caption text-muted">
            The Araya Business &amp; Marketing Office · Jl. Blimbing Indah Megah No. 1, Malang
          </p>
          <div className="overflow-hidden rounded-sm border border-line">
            <iframe
              title="Peta lokasi kantor The Araya"
              src={`https://www.openstreetmap.org/export/embed.html?bbox=${(OFFICE_LNG - 0.0012).toFixed(5)}%2C${(OFFICE_LAT - 0.0008).toFixed(5)}%2C${(OFFICE_LNG + 0.0012).toFixed(5)}%2C${(OFFICE_LAT + 0.0008).toFixed(5)}&layer=mapnik&marker=${OFFICE_LAT}%2C${OFFICE_LNG}`}
              className="h-40 w-full border-0"
              loading="lazy"
            />
          </div>
        </div>
      ) : null}

      <div className="flex items-center gap-3">
        <p className="text-caption text-muted">
          Radius valid geofence: {OFFICE_RADIUS_M} m
        </p>
        {state.kind !== "checking" && HAS_OFFICE ? (
          <Button variant="tertiary" size="sm" leftIcon={<MapPin aria-hidden size={14} />} onClick={() => void check()}>
            Periksakan lagi
          </Button>
        ) : null}
      </div>

      {state.kind === "done" && state.suspect ? (
        <p className="flex items-center gap-2 text-body text-pending-fg">
          <WarningIcon aria-hidden />
          Koordinat terindikasi tidak wajar — tetap dikirim ke BE untuk verifikasi server.
        </p>
      ) : null}
    </Card>
  );
}
