"use client";

import { Button } from "@/components/ui/Button";
import { Select } from "@/components/ui/FormField";
import { ChevronLeftIcon, ChevronRightIcon } from "@/components/ui/Icons";

export const PAGE_SIZES = [10, 25, 50];

export type PaginationProps = {
  total: number;
  page: number;
  pageSize: number;
  onPageChange: (page: number) => void;
  onPageSizeChange: (pageSize: number) => void;
};

/** Nomor halaman yang tampil: halaman 1 dan terakhir selalu ada, sisanya mengikuti halaman aktif. */
function pageItems(page: number, pageCount: number): (number | "gap")[] {
  const visible = [1, pageCount, page - 1, page, page + 1]
    .filter((item) => item >= 1 && item <= pageCount)
    .filter((item, index, all) => all.indexOf(item) === index)
    .sort((a, b) => a - b);

  const items: (number | "gap")[] = [];
  visible.forEach((item, index) => {
    if (index > 0 && item - visible[index - 1] > 1) items.push("gap");
    items.push(item);
  });
  return items;
}

/**
 * Kaki tabel: jumlah data di kiri, nomor halaman di kanan (Panduan UI 3 · Tabel).
 * Kontrol halaman disembunyikan bila hasilnya hanya satu halaman.
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

      {pageCount > 1 ? (
        <div className="flex flex-wrap items-center gap-3">
          <Select
            aria-label="Baris per halaman"
            className="h-control-sm w-auto"
            value={pageSize}
            onChange={(event) => onPageSizeChange(Number(event.target.value))}
          >
            {PAGE_SIZES.map((size) => (
              <option key={size} value={size}>
                {size} baris
              </option>
            ))}
          </Select>

          <div className="flex items-center gap-1">
            <Button
              variant="tertiary"
              size="icon-sm"
              aria-label="Halaman sebelumnya"
              disabled={page <= 1}
              onClick={() => onPageChange(page - 1)}
              leftIcon={<ChevronLeftIcon />}
            />
            {pageItems(page, pageCount).map((item, index) =>
              item === "gap" ? (
                <span key={`gap-${index}`} className="px-1 text-caption text-muted" aria-hidden>
                  …
                </span>
              ) : (
                <Button
                  key={item}
                  variant="tertiary"
                  size="icon-sm"
                  aria-label={`Halaman ${item}`}
                  aria-current={item === page ? "page" : undefined}
                  onClick={() => onPageChange(item)}
                  className={item === page ? "bg-primary-soft text-primary" : undefined}
                >
                  <span className="tabular-nums">{item}</span>
                </Button>
              ),
            )}
            <Button
              variant="tertiary"
              size="icon-sm"
              aria-label="Halaman berikutnya"
              disabled={page >= pageCount}
              onClick={() => onPageChange(page + 1)}
              leftIcon={<ChevronRightIcon />}
            />
          </div>
        </div>
      ) : null}
    </div>
  );
}
