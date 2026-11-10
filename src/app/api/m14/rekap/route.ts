import { NextResponse } from "next/server";

/**
 * PUSH rekap M13 ke M14 (Kel. C5) — M13-US5 "(kirim data ke M14)".
 *
 * Alur: tarik rekap dari BE M13 → susun payload → POST ke M14.
 *
 * M14 belum menetapkan endpoint penerima, jadi selama `M14_RECAP_ENDPOINT`
 * kosong route ini membalas 200 `{ sent: false }` beserta payload yang siap
 * dikirim. Jadi demo tetap bisa menunjukkan isi kontrak, tanpa data palsu.
 */
const M13_BASE = (
  process.env.NEXT_PUBLIC_API_BASE_URL ?? "https://laboratorium-backend.vercel.app"
).replace(/\/+$/, "");

const M14_ENDPOINT = process.env.M14_RECAP_ENDPOINT ?? "";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  let bulan: number;
  let tahun: number;

  try {
    const body = (await request.json()) as { bulan?: unknown; tahun?: unknown };
    bulan = Number(body.bulan);
    tahun = Number(body.tahun);
  } catch {
    return NextResponse.json({ sent: false, message: "Body harus JSON { bulan, tahun }." }, { status: 400 });
  }

  if (!Number.isInteger(bulan) || bulan < 1 || bulan > 12 || !Number.isInteger(tahun)) {
    return NextResponse.json({ sent: false, message: "Bulan (1-12) dan tahun wajib diisi." }, { status: 400 });
  }

  // 1. Tarik rekap dari BE M13 — perlu Bearer token M13 dari pemanggil.
  let recap: unknown;
  try {
    const auth = request.headers.get("Authorization") ?? "";
    if (!auth) {
      return NextResponse.json({ sent: false, message: "Sesi tidak valid. Silakan masuk kembali." }, { status: 401 });
    }
    const response = await fetch(
      `${M13_BASE}/api/attendance/recap?month=${tahun}-${String(bulan).padStart(2, "0")}`,
      { cache: "no-store", headers: { Accept: "application/json", Authorization: auth } },
    );
    if (!response.ok) {
      return NextResponse.json(
        { sent: false, message: `Data rekap tidak dapat diambil (HTTP ${response.status}).` },
        { status: 502 },
      );
    }
    recap = await response.json();
  } catch {
    return NextResponse.json({ sent: false, message: "Server kehadiran tidak dapat dihubungi." }, { status: 502 });
  }

  const payload = { bulan, tahun, rekap: recap };

  // 2. Kirim ke M14 bila endpoint sudah disepakati.
  if (!M14_ENDPOINT) {
    return NextResponse.json({
      sent: false,
      message: "Tujuan penggajian belum dikonfigurasi. Data rekap sudah siap dikirim.",
      detail: payload,
    });
  }

  try {
    const response = await fetch(M14_ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify(payload),
      cache: "no-store",
    });
    const detail = await response.json().catch(() => null);

    if (!response.ok) {
      return NextResponse.json(
        { sent: false, message: `Penggajian menolak data rekap (HTTP ${response.status}).`, detail },
        { status: 502 },
      );
    }

    return NextResponse.json({ sent: true, message: "Rekap berhasil dikirim ke penggajian.", detail });
  } catch {
    return NextResponse.json({ sent: false, message: "Server penggajian tidak dapat dihubungi." }, { status: 502 });
  }
}
