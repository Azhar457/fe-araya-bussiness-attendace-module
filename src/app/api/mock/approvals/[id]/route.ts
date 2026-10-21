import { NextResponse } from "next/server";

import { getSession } from "@/lib/auth/session";
import { getState } from "@/mocks/store";

export const dynamic = "force-dynamic";

/** PATCH /api/mock/approvals/:id — setujui / tolak pengajuan. Body: { decision: "approved" | "rejected" }. */
export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (session.role !== "admin_hr") {
    return NextResponse.json({ code: "FORBIDDEN", message: "Akses hanya untuk HR." }, { status: 403 });
  }

  const { id } = await params;
  const body = (await request.json().catch(() => null)) as { decision?: string } | null;
  if (body?.decision !== "approved" && body?.decision !== "rejected") {
    return NextResponse.json(
      { code: "VALIDATION_ERROR", message: "decision harus 'approved' atau 'rejected'." },
      { status: 400 },
    );
  }

  const state = getState();
  const record = state.absenceRequests.find((r) => r.id === id);
  if (!record) {
    return NextResponse.json({ code: "NOT_FOUND", message: "Pengajuan tidak ditemukan." }, { status: 404 });
  }
  if (record.status !== "pending") {
    return NextResponse.json(
      { code: "ALREADY_DECIDED", message: "Pengajuan sudah diproses sebelumnya." },
      { status: 409 },
    );
  }

  record.status = body.decision;
  return NextResponse.json(record);
}
