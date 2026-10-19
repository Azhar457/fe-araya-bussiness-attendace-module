import { NextResponse } from "next/server";

import { getSession } from "@/lib/auth/session";
import { getState } from "@/mocks/store";

export const dynamic = "force-dynamic";

/** DELETE /api/mock/attendance/absence-requests/:id — batalkan pengajuan (hanya milik sendiri & masih pending). */
export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  const { id } = await params;
  const state = getState();
  const index = state.absenceRequests.findIndex((r) => r.id === id);

  if (index === -1 || state.absenceRequests[index].employeeId !== session.id) {
    return NextResponse.json({ code: "NOT_FOUND", message: "Pengajuan tidak ditemukan." }, { status: 404 });
  }
  if (state.absenceRequests[index].status !== "pending") {
    return NextResponse.json(
      { code: "NOT_CANCELLABLE", message: "Hanya pengajuan yang masih menunggu bisa dibatalkan." },
      { status: 409 },
    );
  }

  state.absenceRequests.splice(index, 1);
  return new NextResponse(null, { status: 204 });
}
