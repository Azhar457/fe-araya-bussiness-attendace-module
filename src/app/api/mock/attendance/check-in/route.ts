import { NextResponse } from "next/server";

import { getSession } from "@/lib/auth/session";
import { wibIso } from "@/lib/format";
import { currentTimeWib, getState, lateFromCheckIn } from "@/mocks/store";

export const dynamic = "force-dynamic";

/** POST /api/mock/attendance/check-in */
export async function POST() {
  const session = await getSession();
  const state = getState();
  const now = currentTimeWib();
  const existing = state.today[session.id];

  // AC M13-US2#2: tidak ada entri ganda.
  if (existing && existing.date === now.dateKey) {
    return NextResponse.json(
      { code: "ALREADY_CHECKED_IN", message: "Anda sudah check-in hari ini." },
      { status: 409 },
    );
  }

  // AC M13-US2#1: lewat toleransi → status "terlambat".
  const { isLate, lateMinutes } = lateFromCheckIn(state.workSettings, now.minutes);
  const record = {
    date: now.dateKey,
    checkInAt: wibIso(now.dateKey, now.time),
    checkOutAt: null,
    status: isLate ? ("terlambat" as const) : ("hadir" as const),
    isLate,
    lateMinutes,
  };
  state.today[session.id] = record;

  return NextResponse.json(record, { status: 201 });
}
