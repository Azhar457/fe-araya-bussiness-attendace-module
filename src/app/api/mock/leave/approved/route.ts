import { NextResponse } from "next/server";

import { getState } from "@/mocks/store";

export const dynamic = "force-dynamic";

/**
 * GET /api/mock/leave/approved?from=2026-10-01&to=2026-10-31
 * Kontrak cuti dari M12 — masih mock, menunggu kontrak final.
 */
export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  const from = params.get("from") ?? "0000-01-01";
  const to = params.get("to") ?? "9999-12-31";

  const rows = getState().approvedLeave.filter((l) => l.date >= from && l.date <= to);
  return NextResponse.json(rows);
}
