"use client";

import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";

type SearchState = {
  query: string;
  setQuery: (query: string) => void;
  /** Placeholder kolom cari navbar; null = halaman ini tidak punya daftar untuk dicari. */
  target: string | null;
  setTarget: (target: string | null) => void;
};

const SearchContext = createContext<SearchState | null>(null);

/** Satu kolom cari di navbar, dipakai halaman yang punya daftar (Panduan UI 4 · Kerangka halaman). */
export function SearchProvider({ children }: { children: ReactNode }) {
  const [query, setQuery] = useState("");
  const [target, setTarget] = useState<string | null>(null);
  const value = useMemo(() => ({ query, setQuery, target, setTarget }), [query, target]);

  return <SearchContext.Provider value={value}>{children}</SearchContext.Provider>;
}

export function useSearch(): SearchState {
  const state = useContext(SearchContext);
  if (!state) throw new Error("useSearch harus dipakai di dalam SearchProvider.");
  return state;
}

/** Dipanggil halaman berdaftar: memunculkan kolom cari navbar dengan placeholder ini. */
export function useSearchTarget(target: string) {
  const { setTarget } = useSearch();
  useEffect(() => {
    setTarget(target);
    return () => setTarget(null);
  }, [setTarget, target]);
}
