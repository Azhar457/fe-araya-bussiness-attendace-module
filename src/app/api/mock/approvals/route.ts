import { NextResponse } from "next/server";

import { getSession } from "@/lib/auth/session";
import { EMPLOYEES, getState } from "@/mocks/store";
import type { AbsenceRequest } from "@/lib/types";

export const dynamic = "force-dynamic";

type AbsenceRequestWithMeta = AbsenceRequest & {
  employeeName: string;
  employeeDivision: string;
};

/** GET /api/mock/approvals — daftar seluruh pengajuan (default: status pending), semua karyawan. Hanya admin_hr. */
export async function GET(request: Request) {
  const session = await getSession();
  if (session.role !== "admin_hr") {
    return NextResponse.json({ code: "FORBIDDEN", message: "Akses hanya untuk HR." }, { status: 403 });
  }

  const status = new URL(request.url).searchParams.get("status") ?? "pending";
  const rows = getState()
    .absenceRequests.filter((r) => (status === "all" ? true : r.status === status))
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .map((r) => {
      const employee = EMPLOYEES.find((e) => e.id === r.employeeId);
      return {
        ...r,
        employeeName: employee?.name ?? r.employeeId,
        employeeDivision: employee?.division ?? "",
      } as AbsenceRequestWithMeta;
    });

  return NextResponse.json(rows);
}
