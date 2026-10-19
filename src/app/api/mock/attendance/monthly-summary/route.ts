import { NextResponse } from "next/server";

import { currentMonth, monthRange } from "@/lib/format";
import { EMPLOYEES, getState } from "@/mocks/store";
import type { AbsenceRequest, MonthlySummaryRow } from "@/lib/types";

export const dynamic = "force-dynamic";

const MONTH_RE = /^\d{4}-\d{2}$/;

/** Jumlah hari (inklusif) pengajuan berstatus tertentu di dalam rentang bulan. */
function approvedDays(rows: AbsenceRequest[], employeeId: string, type: "izin" | "sakit", from: string, to: string): number {
  let days = 0;
  for (const r of rows) {
    if (r.employeeId !== employeeId || r.type !== type || r.status !== "approved") continue;
    const start = r.startDate < from ? from : r.startDate;
    const end = r.endDate > to ? to : r.endDate;
    if (start > end) continue;
    days += Math.round((Date.parse(end) - Date.parse(start)) / 86_400_000) + 1;
  }
  return days;
}

/** GET /api/mock/attendance/monthly-summary?month=2026-10 */
export async function GET(request: Request) {
  const month = new URL(request.url).searchParams.get("month") ?? currentMonth();
  if (!MONTH_RE.test(month)) {
    return NextResponse.json({ code: "INVALID_MONTH", message: "Format bulan harus YYYY-MM." }, { status: 400 });
  }

  const state = getState();
  const { from, to } = monthRange(month);

  const rows: MonthlySummaryRow[] = EMPLOYEES.map((employee) => {
    const work = state.workRows.find((w) => w.employeeId === employee.id && w.month === month);
    const present = work?.onTime ?? 0;
    const late = work?.late ?? 0;
    const totalWorkDays = work?.totalWorkDays ?? 0;
    const izin = approvedDays(state.absenceRequests, employee.id, "izin", from, to);
    const sakit = approvedDays(state.absenceRequests, employee.id, "sakit", from, to);
    // M13-US4: hanya cuti disetujui (kontrak M12) yang dihitung cuti.
    const cuti = state.approvedLeave.filter(
      (l) => l.employeeId === employee.id && l.date >= from && l.date <= to,
    ).length;

    return {
      employeeId: employee.id,
      name: employee.name,
      division: employee.division,
      present,
      late,
      izin,
      sakit,
      cuti,
      alpa: Math.max(0, totalWorkDays - present - late - izin - sakit - cuti),
      totalWorkDays,
    };
  });

  // Bulan tanpa data tetap kirim baris bernilai nol + hasData=false,
  // supaya UI bisa menampilkan nol dan pesan kosong (bukan galat).
  return NextResponse.json({ month, hasData: rows.some((r) => r.totalWorkDays > 0), rows });
}
