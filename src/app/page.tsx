import { redirect } from "next/navigation";

import { homeFor } from "@/lib/auth/constants";
import { getSession } from "@/lib/auth/session";

export default async function RootPage() {
  const session = await getSession();
  redirect(homeFor(session.role));
}
