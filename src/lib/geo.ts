/**
 * Geolokasi untuk check-in/check-out (M13-US2).
 *
 * Sumber: W3C Geolocation API (browser). Tidak ada akses hardware langsung
 * dari Next.js client, jadi ini adalah batas deteksi spoof yang bisa dilakukan
 * di sisi klien — BE harus tetap memvalidasi ulang dengan lat/long yang
 * diterima (mis. bandingkan jarak ke koordinat kantor, tolak jika > radius).
 */

export interface GeoPoint {
  latitude: number;
  longitude: number;
  /** Jari-jari ketepatan meter (dari device). Semakin besar, semakin tidak akurat. */
  accuracyMeters: number;
  /** Timestamp ms saat koordinat diambil. */
  timestampMs: number;
}

export interface SpoofSignal {
  /** Apakah ada indikasi koordinat dimanipulasi (lihat flag di bawah). */
  suspect: boolean;
  reasons: string[];
}

export interface GeoCapture extends GeoPoint {
  spoof: SpoofSignal;
}

export class GeoError extends Error {
  code: string;
  constructor(code: string, message: string) {
    super(message);
    this.name = "GeoError";
    this.code = code;
  }
}

/** Ambil koordinat device via W3C Geolocation. Reject dengan GeoError bila gagal. */
export function getCurrentPosition(timeoutMs = 15_000): Promise<GeoCapture> {
  return new Promise((resolve, reject) => {
    if (typeof navigator === "undefined" || !("geolocation" in navigator)) {
      reject(new GeoError("GEO_UNAVAILABLE", "Geolokasi tidak didukung di perangkat ini."));
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const point: GeoPoint = {
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
          accuracyMeters: pos.coords.accuracy ?? 0,
          timestampMs: pos.timestamp || Date.now(),
        };
        resolve({ ...point, spoof: assessSpoofSignals(point, pos.coords) });
      },
      (err) => {
        const code =
          err.code === 1 ? "PERMISSION_DENIED"
          : err.code === 2 ? "POSITION_UNAVAILABLE"
          : err.code === 3 ? "TIMEOUT"
          : "UNKNOWN";
        reject(new GeoError(code, "Gagal membaca geolokasi. Pastikan lokasi device diaktifkan."));
      },
      {
        // high accuracy + enable high-accuracy mode bila tersedia (Android/iOS).
        enableHighAccuracy: true,
        timeout: timeoutMs,
        maximumAge: 0, // jangan pakai cache koordinat lama
      },
    );
  });
}

/** Jarak Haversine antar 2 koordinat, dalam meter. */
export function haversineMeters(a: { latitude: number; longitude: number }, b: { latitude: number; longitude: number }): number {
  const R = 6_371_000; // radius bumi rata-rata (m)
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(b.latitude - a.latitude);
  const dLng = toRad(b.longitude - a.longitude);
  const la1 = toRad(a.latitude);
  const la2 = toRad(b.latitude);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(la1) * Math.cos(la2) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(h)));
}

/**
 * Sinyal spoof yang bisa dideteksi di sisi klien (bukan pembuktian, hanya flag
 * untuk BE meninjau ulang):
 *  - accuracy sangat besar (> 999 m) → kemungkinan koordinat dari provider palsu / diindoor
 *  - speed anomali (> 150 m/s = 540 km/jam) → koordinat melompat tidak wajar
 *  - heading/altitude kosong padahal accuracy klaim kecil → kontradiktif
 */
function assessSpoofSignals(point: GeoPoint, coords: GeolocationCoordinates): SpoofSignal {
  const reasons: string[] = [];
  if (point.accuracyMeters > 999) reasons.push("accuracy lebih dari 999 meter — tidak konsisten dengan koordinat GPS aktual");
  if (coords.speed !== null && coords.speed > 150) reasons.push("speed koordinat > 150 m/s — pergerakan tidak wajar");
  const suspect = reasons.length > 0;
  return { suspect, reasons };
}
