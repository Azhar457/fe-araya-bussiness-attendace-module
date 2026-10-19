import { redirect } from "next/navigation";

import { homeFor } from "@/lib/auth/constants";
import { requireSession } from "@/lib/auth/session";

export default async function RootPage() {
  const session = await requireSession();
  redirect(homeFor(session.role));
}
