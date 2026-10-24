import { Banner } from "@/components/ui/Banner";
import { PageHeader } from "@/components/ui/PageHeader";

/** M13-US1 — HR: modul persetujuan belum tersedia di BE live. */
export function ApprovalPage() {
  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        breadcrumb={[{ label: "Kehadiran" }, { label: "Persetujuan izin & sakit" }]}
        title="Persetujuan Izin & Sakit"
      />

      <Banner
        variant="info"
        message="Modul persetujuan belum tersedia di server BE. Kontak developer backend."
      />
    </div>
  );
}
