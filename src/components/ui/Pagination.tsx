"use client";

import { Button } from "@/components/ui/Button";
import { Select } from "@/components/ui/FormField";

export const PAGE_SIZES = [10, 25, 50];

export type PaginationProps = {
  total: number;
  page: number;
  pageSize: number;
  onPageChange: (page: number) => void;
  onPageSizeChange: (pageSize: number) => void;
};

/**
 * shortcut: hanya prev/next + ukuran halaman, tanpa daftar nomor halaman.
 * Volume data M13 kecil; tambah nomor halaman bila data per bulan sudah banyak.
 */
export function Pagination({ total, page, pageSize, onPageChange, onPageSizeChange }: PaginationProps) {
  const pageCount = Math.max(1, Math.ceil(total / pageSize));
  const start = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const end = Math.min(page * pageSize, total);

  return (
    <div className="flex w-full flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <p className="text-caption text-muted">
        Menampilkan {start}–{end} dari {total}
      </p>
      <div className="flex items-center gap-3">
        <label className="flex items-center gap-2 text-caption text-muted" htmlFor="page-size">
          Baris per halaman
        </label>
        <Select
          id="page-size"
          className="h-control-sm w-auto"
          value={pageSize}
          onChange={(event) => onPageSizeChange(Number(event.target.value))}
        >
          {PAGE_SIZES.map((size) => (
            <option key={size} value={size}>
              {size}
            </option>
          ))}
        </Select>
        <Button
          variant="secondary"
          size="sm"
          disabled={page <= 1}
          onClick={() => onPageChange(page - 1)}
          aria-label="Halaman sebelumnya"
        >
          Sebelumnya
        </Button>
        <span className="whitespace-nowrap text-caption text-muted">
          {page} / {pageCount}
        </span>
        <Button
          variant="secondary"
          size="sm"
          disabled={page >= pageCount}
          onClick={() => onPageChange(page + 1)}
          aria-label="Halaman berikutnya"
        >
          Berikutnya
        </Button>
      </div>
    </div>
  );
}
