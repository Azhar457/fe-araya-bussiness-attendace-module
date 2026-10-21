import Link from "next/link";

export default function NotFound() {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-4 bg-page px-4">
      <p className="text-h1 text-text">404</p>
      <p className="text-body text-muted">Halaman tidak ditemukan.</p>
      <Link
        href="/masuk"
        className="rounded-sm bg-primary px-4 py-2 text-body text-on-primary hover:bg-primary-hover"
      >
        Kembali ke masuk
      </Link>
    </div>
  );
}
