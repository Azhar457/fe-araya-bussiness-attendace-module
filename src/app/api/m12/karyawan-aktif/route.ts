import { NextResponse } from "next/server";

/**
 * PULL data karyawan aktif dari M12 (Kel. C3).
 *
 * M12 tidak mengirim header CORS (diverifikasi 26/10/2026), sehingga browser
 * tidak boleh memanggilnya langsung. Route ini jadi proxy same-origin.
 *
 * Selalu membalas 200 supaya UI bisa degradasi: bila M12 mati, `data` kosong
 * dan `error` berisi alasannya.
 */
const M12_BASE = (
  process.env.M12_API_BASE_URL ?? "https://kelompok4-m12-sistem-hr-manajemen-d.vercel.app"
).replace(/\/+$/, "");

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const response = await fetch(`${M12_BASE}/api/karyawan/aktif`, {
      cache: "no-store",
      headers: { Accept: "application/json" },
    });

    if (!response.ok) {
      return NextResponse.json({
        data: [],
        error: `Data karyawan tidak dapat diambil (HTTP ${response.status}).`,
      });
    }

    const body = (await response.json()) as { data?: unknown };
    return NextResponse.json({
      data: Array.isArray(body?.data) ? body.data : [],
    });
  } catch {
    return NextResponse.json({
      data: [],
      error: "Server data karyawan tidak dapat dihubungi.",
    });
  }
}
