"use client";

import Link from "next/link";
import type { ReactNode } from "react";

export type Crumb = { label: string; href?: string };

export type PageHeaderProps = {
  breadcrumb: Crumb[];
  title: string;
  actions?: ReactNode;
};

/** Urutan wajib: jejak halaman → judul → aksi utama (design.md 3.7). */
export function PageHeader({ breadcrumb, title, actions }: PageHeaderProps) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div className="flex flex-col gap-2">
        <nav aria-label="Jejak halaman" className="text-body text-muted">
          <ol className="flex flex-wrap items-center gap-2">
            {breadcrumb.map((crumb, index) => (
              <li key={`${crumb.label}-${index}`} className="flex items-center gap-2">
                {crumb.href ? (
                  <Link href={crumb.href} className="rounded-sm hover:text-primary">
                    {crumb.label}
                  </Link>
                ) : (
                  <span aria-current="page">{crumb.label}</span>
                )}
                {index < breadcrumb.length - 1 ? <span aria-hidden>/</span> : null}
              </li>
            ))}
          </ol>
        </nav>
        <h1 className="text-h1 text-text">{title}</h1>
      </div>
      {actions ? <div className="flex items-center gap-3">{actions}</div> : null}
    </div>
  );
}
