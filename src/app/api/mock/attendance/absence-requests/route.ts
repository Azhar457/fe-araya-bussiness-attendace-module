import { NextResponse } from "next/server";

import { getSession } from "@/lib/auth/session";
import { validateAbsence, type AbsenceInput } from "@/lib/validation";
import { getState, nowWibIso } from "@/mocks/store";
import type { AbsenceRequest } from "@/lib/types";

export const dynamic = "force-dynamic";

/** GET /api/mock/attendance/absence-requests?status=pending */
export async function GET(request: Request) {
  const session = await getSession();
  const status = new URL(request.url).searchParams.get("status");

  const rows = getState()
    .absenceRequests.filter((r) => r.employeeId === session.id)
    .filter((r) => !status || r.status === status)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));

  return NextResponse.json(rows);
}

/** POST /api/mock/attendance/absence-requests — terima bentuk FE ({type,startDate,...}) maupun
    bentuk BE ({jenis, tanggal, alasan}); alasan/isi dari cookie sesi, bukan body. */
export async function POST(request: Request) {
  const session = await getSession();
  const raw = (await request.json().catch(() => ({}))) as Record<string, unknown>;

  const body: Partial<AbsenceInput> = {
    type: (raw.type ?? raw.jenis) as AbsenceInput["type"] | undefined,
    startDate: (raw.startDate ?? raw.tanggal) as string | undefined,
    endDate: (raw.endDate ?? raw.tanggal) as string | undefined,
    reason: (raw.reason ?? raw.alasan) as string | undefined,
  };

  const fields = validateAbsence(body);
  const messages = Object.values(fields).filter(Boolean) as string[];
  if (messages.length > 0) {
    return NextResponse.json({ code: "VALIDATION_ERROR", message: messages[0], fields }, { status: 400 });
  }

  const state = getState();
  const record: AbsenceRequest = {
    id: `abs-${Date.now().toString(36)}${Math.floor(Math.random() * 1e4)}`,
    employeeId: session.id,
    type: body.type!,
    startDate: body.startDate!,
    endDate: body.endDate!,
    reason: body.reason!.trim(), // AC M13-US3#2: alasan kosong ditolak.
    status: "pending", // persetujuan ada di luar M13 (atasan/BE)
    createdAt: nowWibIso(),
  };
  state.absenceRequests.push(record);

  return NextResponse.json(record, { status: 201 });
}
