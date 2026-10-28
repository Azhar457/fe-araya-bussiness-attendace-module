import { NextResponse } from "next/server";

/**
 * Proxy POST /api/login ke M12 (Kel. C3).
 *
 * M12 = satu-satunya sumber login & role di ERP. FE tidak boleh memblokir
 * M12 langsung (CORS), jadi request lewat route handler ini lalu diteruskan
 * server-side ke M12.
 *
 * Respons M12 diteruskan apa adanya. Bentuk yang diharapkan (per dok M12):
 *   { token, role, employee_id, name, nik } — 401 bila email/password salah.
 */
const M12_BASE = (
  process.env.M12_API_BASE_URL ?? "https://kelompok4-m12-sistem-hr-manajemen-d.vercel.app"
).replace(/\/+$/, "");

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => null);
    if (!body || typeof body !== "object") {
      return NextResponse.json(
        { error: "Body login harus JSON { email, password }." },
        { status: 400 },
      );
    }

    const response = await fetch(`${M12_BASE}/api/login`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify(body),
      cache: "no-store",
    });

    const text = await response.text();
    let parsed: unknown;
    try {
      parsed = text ? JSON.parse(text) : null;
    } catch {
      parsed = { error: text || `Login M12 membalas HTTP ${response.status}` };
    }

    return NextResponse.json(parsed as object, { status: response.status });
  } catch {
    return NextResponse.json(
      { error: "Server login (M12) tidak dapat dihubungi." },
      { status: 502 },
    );
  }
}
