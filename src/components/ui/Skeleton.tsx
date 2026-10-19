/** Loading selalu blok kerangka abu, bukan spinner tengah (Panduan UI 4). */
export function Skeleton({ className = "" }: { className?: string }) {
  return <div aria-hidden className={`animate-pulse rounded-sm bg-surface-2 ${className}`} />;
}

export function SkeletonTable({ rows = 5, columns }: { rows?: number; columns: number }) {
  return (
    <>
      {Array.from({ length: rows }).map((_, r) => (
        <tr key={r} className="h-7 border-t border-line">
          {Array.from({ length: columns }).map((__, c) => (
            <td key={c} className="px-4">
              <Skeleton className="h-4 w-full" />
            </td>
          ))}
        </tr>
      ))}
    </>
  );
}
