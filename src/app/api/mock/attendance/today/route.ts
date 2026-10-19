import { NextResponse } from "next/server";

import { getSession } from "@/lib/auth/session";
import { wibNow } from "@/lib/format";
import { emptyAttendance, getState } from "@/mocks/store";

export const dynamic = "force-dynamic";

/** GET /api/mock/attendance/today */
export async function GET() {
  const session = await getSession();
  const { dateKey } = wibNow();
  const record = getState().today[session.id];

  if (!record || record.date !== dateKey) {
    return NextResponse.json(emptyAttendance(dateKey));
  }
  return NextResponse.json(record);
}
