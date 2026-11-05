import { redirect } from "next/navigation";

/** URL lama /kehadiran/rekap/detail → /kehadiran/rekap/daily. */
export default function RekapDetailRedirect() {
  redirect("/kehadiran/rekap/daily");
}
