import { NextResponse } from "next/server";

/**
 * Proxy POST /api/logout ke M12 (Kel. C3).
 */
const M12_BASE = (
  process.env.M12_API_BASE_URL ?? "https://kelompok4-m12-sistem-hr-manajemen-d.vercel.app"
).replace(/\/+$/, "");

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const authHeader = request.headers.get("authorization") ?? "";

  try {
    const response = await fetch(`${M12_BASE}/api/logout`, {
      method: "POST",
      headers: {
        ...(authHeader ? { Authorization: authHeader } : {}),
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: "{}",
      cache: "no-store",
    });

    const text = await response.text();
    let parsed: unknown;
    try {
      parsed = text ? JSON.parse(text) : null;
    } catch {
      parsed = { message: `Logout membalas HTTP ${response.status}` };
    }

    return NextResponse.json(parsed as object, { status: response.status });
  } catch {
    return NextResponse.json({ message: "Server M12 tidak dapat dihubungi." }, { status: 502 });
  }
}
