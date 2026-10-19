import type { ReactNode } from "react";

import { Banner } from "@/components/ui/Banner";
import { SkeletonTable } from "@/components/ui/Skeleton";

export type Column<T> = {
  key: string;
  header: ReactNode;
  align?: "left" | "right";
  render: (row: T) => ReactNode;
};

export type TableProps<T> = {
  caption: string;
  columns: Column<T>[];
  rows: T[];
  rowKey: (row: T) => string;
  loading?: boolean;
  error?: string | null;
  onRetry?: () => void;
  empty?: ReactNode;
  footer?: ReactNode;
};

/** Kartu tabel: header 40px, baris 48px, angka rata kanan sejajar (Panduan UI 3 · Tabel). */
export function Table<T>({
  caption,
  columns,
  rows,
  rowKey,
  loading = false,
  error,
  onRetry,
  empty,
  footer,
}: TableProps<T>) {
  const showError = Boolean(error) && !loading;
  const showEmpty = !loading && !showError && rows.length === 0;

  return (
    <div className="rounded-lg border border-line bg-surface">
      <div className="table-scroll">
        <table className="w-full min-w-max border-collapse text-body">
          <caption className="sr-only">{caption}</caption>
          <thead>
            <tr className="h-control bg-surface-2">
              {columns.map((column) => (
                <th
                  key={column.key}
                  scope="col"
                  className={`whitespace-nowrap px-4 text-caption font-semibold text-muted ${
                    column.align === "right" ? "text-right" : "text-left"
                  }`}
                >
                  {column.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="tabular-nums">
            {loading ? <SkeletonTable rows={5} columns={columns.length} /> : null}

            {showError ? (
              <tr className="border-t border-line">
                <td colSpan={columns.length} className="px-4 py-4">
                  <Banner message={error} onRetry={onRetry} />
                </td>
              </tr>
            ) : null}

            {showEmpty ? (
              <tr className="border-t border-line">
                <td colSpan={columns.length} className="px-4 py-6">
                  <div className="flex flex-col items-center gap-3 text-center text-body text-muted">{empty}</div>
                </td>
              </tr>
            ) : null}

            {!loading && !showError
              ? rows.map((row) => (
                  <tr key={rowKey(row)} className="h-7 border-t border-line hover:bg-surface-2">
                    {columns.map((column) => (
                      <td
                        key={column.key}
                        className={`px-4 ${column.align === "right" ? "text-right" : "text-left"}`}
                      >
                        {column.render(row)}
                      </td>
                    ))}
                  </tr>
                ))
              : null}
          </tbody>
        </table>
      </div>

      {footer ? (
        <div className="flex flex-col gap-3 border-t border-line px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
          {footer}
        </div>
      ) : null}
    </div>
  );
}
