import { useState, useMemo, useRef, useCallback } from "react";
import {
  FILTER_LIBRARY, FILTER_CATEGORIES,
  type ExtendedFilter, type FilterCategoryId,
} from "../filters";

interface Props {
  activeCss: string;
  onSelect: (f: ExtendedFilter) => void;
}

const PAGE_SIZE = 20;

export default function FiltersLibrary({ activeCss, onSelect }: Props) {
  const [category, setCategory] = useState<FilterCategoryId>("all");
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);
  const loadMoreRef = useRef<HTMLDivElement | null>(null);

  const filtered = useMemo(() => {
    const q = query.toLowerCase();
    return FILTER_LIBRARY.filter((f) => {
      const catMatch = category === "all" || f.category === category;
      const qMatch = !q || f.name.toLowerCase().includes(q) || f.emoji.includes(q);
      return catMatch && qMatch;
    });
  }, [category, query]);

  const visible = useMemo(() => filtered.slice(0, page * PAGE_SIZE), [filtered, page]);
  const hasMore = visible.length < filtered.length;

  const loadMore = useCallback(() => setPage((p) => p + 1), []);

  // Reset pagination when category/query changes
  const handleCategory = (c: FilterCategoryId) => { setCategory(c); setPage(1); };
  const handleQuery = (q: string) => { setQuery(q); setPage(1); };

  return (
    <div className="flex flex-col" style={{ height: 228 }}>
      {/* Search bar */}
      <div className="flex-shrink-0 px-2 pt-1.5 pb-1 flex gap-1.5 items-center">
        <div className="relative flex-1">
          <svg className="absolute left-2 top-1/2 -translate-y-1/2 opacity-40" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#ffd700" strokeWidth="2.5"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
          <input
            type="text"
            value={query}
            onChange={(e) => handleQuery(e.target.value)}
            placeholder="Search filters…"
            className="w-full bg-[#111] border border-[rgba(184,134,11,0.25)] rounded-lg pl-5 pr-2 py-0.5 text-[rgba(184,134,11,0.9)] text-[10px] outline-none focus:border-[rgba(255,215,0,0.5)]"
          />
        </div>
        <span className="text-[rgba(184,134,11,0.3)] text-[9px]">{filtered.length} filters</span>
      </div>

      {/* Category tabs */}
      <div className="flex-shrink-0 flex gap-0 overflow-x-auto border-b border-[rgba(184,134,11,0.1)] px-1 pb-0.5 scrollbar-none">
        {FILTER_CATEGORIES.map((cat) => (
          <button
            key={cat.id}
            onClick={() => handleCategory(cat.id)}
            className={`flex-shrink-0 flex items-center gap-1 px-2 py-1 text-[9px] font-semibold uppercase tracking-wide rounded-t transition-all border-b-2 ${
              category === cat.id
                ? "border-[#ffd700] text-[#ffd700]"
                : "border-transparent text-[rgba(184,134,11,0.45)] hover:text-[rgba(184,134,11,0.75)]"
            }`}
          >
            <span>{cat.emoji}</span>
            <span>{cat.name}</span>
          </button>
        ))}
      </div>

      {/* Filter grid — lazy (load more on scroll) */}
      <div
        className="overflow-x-auto flex-1 min-h-0 px-2 py-1.5"
        onScroll={(e) => {
          if (!hasMore) return;
          const el = e.currentTarget;
          if (el.scrollWidth - el.scrollLeft - el.clientWidth < 120) loadMore();
        }}
      >
        <div className="flex gap-1.5 h-full items-center">
          {visible.map((f) => {
            const isActive = activeCss === f.css;
            return (
              <button
                key={f.id}
                onClick={() => onSelect(f)}
                className={`flex-shrink-0 flex flex-col items-center rounded-xl overflow-hidden border transition-all ${
                  isActive
                    ? "border-[#ffd700] shadow-[0_0_12px_rgba(255,215,0,0.4)] scale-105"
                    : "border-[rgba(184,134,11,0.15)] hover:border-[rgba(184,134,11,0.5)]"
                }`}
                title={f.name}
              >
                <div
                  className="w-14 h-10 flex items-center justify-center bg-[#111] text-xl leading-none"
                  style={{ filter: f.css === "none" ? undefined : f.css, contain: "strict" }}
                >
                  🎬
                </div>
                <span className={`text-[8px] pb-0.5 px-1 text-center leading-tight w-14 truncate ${isActive ? "text-[#ffd700]" : "text-[rgba(184,134,11,0.5)]"}`}>
                  {f.emoji} {f.name}
                </span>
              </button>
            );
          })}

          {hasMore && (
            <div ref={loadMoreRef} className="flex-shrink-0 flex flex-col items-center justify-center w-14 h-14 gap-1">
              <button
                onClick={loadMore}
                className="text-[rgba(184,134,11,0.5)] hover:text-[#ffd700] text-[9px] text-center transition-colors"
              >
                +{filtered.length - visible.length}<br />more
              </button>
            </div>
          )}

          {visible.length === 0 && (
            <div className="flex items-center justify-center w-full h-12">
              <span className="text-[rgba(184,134,11,0.3)] text-[10px]">No filters found</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
