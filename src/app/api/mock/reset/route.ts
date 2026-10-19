import { NextResponse } from "next/server";

import { resetState } from "@/mocks/store";

export const dynamic = "force-dynamic";

/** POST /api/mock/reset — khusus dev. */
export async function POST() {
  resetState();
  return NextResponse.json({ ok: true, message: "Data mock dikembalikan ke kondisi awal." });
}
