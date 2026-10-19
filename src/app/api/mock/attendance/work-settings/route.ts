import { NextResponse } from "next/server";

import { getState, nowWibIso } from "@/mocks/store";
import { validateWorkSettings, type WorkSettingsInput } from "@/lib/validation";

export const dynamic = "force-dynamic";

/** GET /api/mock/attendance/work-settings */
export async function GET() {
  return NextResponse.json(getState().workSettings);
}

/** PUT /api/mock/attendance/work-settings */
export async function PUT(request: Request) {
  const body = (await request.json().catch(() => ({}))) as Partial<WorkSettingsInput>;

  const input: Partial<WorkSettingsInput> = {
    workStart: typeof body.workStart === "string" ? body.workStart : undefined,
    workEnd: typeof body.workEnd === "string" ? body.workEnd : undefined,
    lateToleranceMinutes:
      body.lateToleranceMinutes === undefined ? undefined : Number(body.lateToleranceMinutes),
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
