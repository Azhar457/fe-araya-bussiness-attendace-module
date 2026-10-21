import { NextResponse } from "next/server";

import { getState, nowWibIso } from "@/mocks/store";
import { validateWorkSettings, type WorkSettingsInput } from "@/lib/validation";

export const dynamic = "force-dynamic";

/** GET /api/mock/attendance/work-settings */
export async function GET() {
  return NextResponse.json(getState().workSettings);
}

/** PUT / POST /api/mock/attendance/work-settings — kontrak BE pakai POST, mock juga menerima PUT. */
export async function PUT(request: Request) {
  return upsert(request);
}
export async function POST(request: Request) {
  return upsert(request);
}

async function upsert(request: Request) {
  const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;

  // Terima kedua shape: BE (jam_masuk/jam_pulang/toleransi_keterlambatan)
  // dan FE (workStart/workEnd/lateToleranceMinutes).
  const workStart =
    typeof body.jam_masuk === "string" ? body.jam_masuk.slice(0, 5)
    : typeof body.workStart === "string" ? body.workStart
    : undefined;
  const workEnd =
    typeof body.jam_pulang === "string" ? body.jam_pulang.slice(0, 5)
    : typeof body.workEnd === "string" ? body.workEnd
    : undefined;
  const lateToleranceMinutes =
    body.toleransi_keterlambatan !== undefined ? Number(body.toleransi_keterlambatan)
    : body.lateToleranceMinutes !== undefined ? Number(body.lateToleranceMinutes)
    : undefined;

  const input: Partial<WorkSettingsInput> = {
    workStart,
    workEnd,
    lateToleranceMinutes,
  };

  const fields = validateWorkSettings(input);
  const messages = Object.values(fields).filter(Boolean) as string[];
  if (messages.length > 0) {
    return NextResponse.json(
      { code: "VALIDATION_ERROR", message: messages[0], fields },
      { status: 400 },
    );
  }

  const settings = getState().workSettings;
  const updated = {
    ...settings,
    workStart: input.workStart!,
    workEnd: input.workEnd!,
    lateToleranceMinutes: input.lateToleranceMinutes!,
    updatedAt: nowWibIso(),
  };
  getState().workSettings = updated;

  return NextResponse.json(updated);
}
