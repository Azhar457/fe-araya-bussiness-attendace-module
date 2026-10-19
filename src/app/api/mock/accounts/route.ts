import { NextResponse } from "next/server";

import { EMPLOYEES } from "@/mocks/store";

export const dynamic = "force-dynamic";

/** GET /api/mock/accounts — daftar akun demo untuk halaman masuk. */
export async function GET() {
  return NextResponse.json(
    EMPLOYEES.map(({ id, name, division, role }) => ({ id, name, division, role })),
  );
}
