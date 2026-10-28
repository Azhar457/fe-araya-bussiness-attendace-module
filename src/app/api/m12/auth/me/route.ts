import { NextResponse } from "next/server";

/**
 * Proxy GET /api/me ke M12 (Kel. C3).
 *
 * Dipakai `src/lib/auth/session.ts` (server) untuk memvalidasi sesi +
 * mengambil identitas (karyawanId, nik, nama, role) dari cookie sesi FE.
 */
const M12_BASE = (
  process.env.M12_API_BASE_URL ?? "https://kelompok4-m12-sistem-hr-manajemen-d.vercel.app"
).replace(/\/+$/, "");

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization") ?? "";
  if (!authHeader) {
    return NextResponse.json({ error: "Belum login." }, { status: 401 });
  }

  try {
    const response = await fetch(`${M12_BASE}/api/me`, {
      headers: {
        Authorization: authHeader,
        Accept: "application/json",
      },
      cache: "no-store",
    });

    const text = await response.text();
    let parsed: unknown;
    try {
      parsed = text ? JSON.parse(text) : null;
    } catch {
      parsed = { error: text || `M12 /api/me membalas HTTP ${response.status}` };
    }

    return NextResponse.json(parsed as object, { status: response.status });
  } catch {
    return NextResponse.json({ error: "Server M12 tidak dapat dihubungi." }, { status: 502 });
  }
}
