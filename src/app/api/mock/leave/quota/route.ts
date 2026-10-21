import { NextResponse } from "next/server";

import { getSession } from "@/lib/auth/session";
import { currentMonth, monthRange } from "@/lib/format";
import { getState } from "@/mocks/store";

export const dynamic = "force-dynamic";

/** Kuota cuti tahun per karyawan (mock: fixture stabil, bukan kontrak final M12). */
const ANNUAL_QUOTA: Record<string, number> = {
  "emp-1": 12,
  "emp-2": 12,
  "emp-3": 12,
};

/** GET /api/mock/leave/quota — sisa kuota cuti tahunan karyawan sesi. */
export async function GET() {
  const session = await getSession();
  const { from, to } = monthRange(currentMonth());
  const used = getState().approvedLeave.filter(
    (l) => l.employeeId === session.id && l.date >= from && l.date <= to,
  ).length;

  const total = ANNUAL_QUOTA[session.id] ?? 12;
  const remaining = Math.max(0, total - used);
  return NextResponse.json({ total, used, remaining });
}
