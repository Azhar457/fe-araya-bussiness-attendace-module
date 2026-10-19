import { NextResponse } from "next/server";

import { EMPLOYEE_COOKIE } from "@/lib/auth/constants";
import { EMPLOYEES } from "@/mocks/store";

export const dynamic = "force-dynamic";

const COOKIE = { httpOnly: true, sameSite: "lax", path: "/", maxAge: 60 * 60 * 24 * 7 } as const;

/** POST /api/mock/session — masuk sebagai salah satu akun (simulasi, tanpa kata sandi). */
export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as { employeeId?: string } | null;
  const employee = EMPLOYEES.find((item) => item.id === body?.employeeId);

  if (!employee) {
    return NextResponse.json(
      {
        code: "VALIDATION_ERROR",
        message: "Akun tidak ditemukan.",
        fields: { employeeId: "Pilih akun yang tersedia." },
      },
      { status: 400 },
    );
  }

  const response = NextResponse.json<{ id: string; name: string; role: string }>({
    id: employee.id,
    name: employee.name,
    role: employee.role,
  });
  response.cookies.set(EMPLOYEE_COOKIE, employee.id, COOKIE);
  return response;
}

/** DELETE /api/mock/session — keluar. */
export async function DELETE() {
  const response = new NextResponse(null, { status: 204 });
  response.cookies.set(EMPLOYEE_COOKIE, "", { ...COOKIE, maxAge: 0 });
  return response;
}
