import { NextResponse } from "next/server";

import { getSession } from "@/lib/auth/session";
import { wibIso } from "@/lib/format";
import { currentTimeWib, getState } from "@/mocks/store";

export const dynamic = "force-dynamic";

/** POST /api/mock/attendance/check-out */
export async function POST() {
  const session = await getSession();
  const state = getState();
  const now = currentTimeWib();
  const existing = state.today[session.id];

  if (!existing || existing.date !== now.dateKey) {
    return NextResponse.json(
      { code: "NOT_CHECKED_IN", message: "Anda belum check-in hari ini." },
      { status: 409 },
    );
  }
  if (existing.checkOutAt) {
    return NextResponse.json(
      { code: "ALREADY_CHECKED_OUT", message: "Anda sudah check-out hari ini." },
      { status: 409 },
    );
  }

  const record = { ...existing, checkOutAt: wibIso(now.dateKey, now.time) };
  state.today[session.id] = record;

  return NextResponse.json(record);
}
