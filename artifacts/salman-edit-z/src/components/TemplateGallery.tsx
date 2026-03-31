/**
 * TemplateGallery — 105-template infinite scroll gallery
 *
 * Features:
 *  - Category filter tabs (All / Animals / Cyberpunk / Space / Nature / Cinematic / 2030+ / Drama)
 *  - Loads 20 cards at a time; IntersectionObserver triggers next page on scroll
 *  - Premium templates show 🔒 and gate behind 5-share Viral Lock
 *  - Magic AI button: samples current video frame → picks best-scoring free template
 *  - Pressing a template card instantly applies it to the editor
 */

import { useState, useEffect, useRef, useCallback } from "react";
import { ALL_TEMPLATES, CATEGORIES, analyzeFrame, pickBestTemplate, type AITemplate, type CategoryId } from "../templateData";
import { isUnlocked } from "../bgLock";
import type { BgSwapState } from "./BgSwapPanel";
import ViralLockModal from "./ViralLockModal";

const PAGE_SIZE = 20;

interface Props {
  videoEl: HTMLVideoElement | null;
  onApply: (state: BgSwapState) => void;
  onUnlockNeeded: () => void;
}

/* ── Single template card ── */
function TemplateCard({ tpl, onApply, onLockNeeded }: {
  tpl: AITemplate;
  onApply: (t: AITemplate) => void;
  onLockNeeded: () => void;
}) {
  const [pressed, setPressed] = useState(false);

  const handleTap = () => {
    if (tpl.isPremium && !isUnlocked()) {
      onLockNeeded();
      return;
    }
    setPressed(true);
    setTimeout(() => setPressed(false), 700);
    onApply(tpl);
  };

  return (
    <button
      onClick={handleTap}
      className={`flex flex-col rounded-2xl overflow-hidden border transition-all active:scale-95 ${
        pressed
          ? "border-[#ffd700] shadow-[0_0_20px_rgba(255,215,0,0.5)] scale-95"
          : "border-[rgba(184,134,11,0.18)] hover:border-[rgba(184,134,11,0.45)]"
      }`}
    >
      {/* Preview tile */}
      <div
        className="w-full aspect-video relative flex items-center justify-center overflow-hidden"
        style={{ background: tpl.previewGradient }}
      >
        {/* Large emoji */}
        <span className="text-3xl drop-shadow-lg" style={{ filter: "drop-shadow(0 0 8px rgba(0,0,0,0.8))" }}>
          {tpl.emoji}
        </span>

        {/* Premium badge */}
        {tpl.isPremium && (
          <div className="absolute top-1 right-1 flex items-center gap-0.5 bg-[rgba(0,0,0,0.65)] backdrop-blur-sm rounded-full px-1.5 py-0.5">
            <svg width="7" height="8" viewBox="0 0 24 24" fill="none">
              <rect x="3" y="11" width="18" height="11" rx="2" fill="#ffd700" />
              <path d="M7 11V7a5 5 0 0 1 10 0v4" stroke="#ffd700" strokeWidth="2.5" strokeLinecap="round" />
            </svg>
            <span className="text-[#ffd700] text-[7px] font-bold">PRO</span>
          </div>
        )}

        {/* Applied flash */}
        {pressed && (
          <div className="absolute inset-0 bg-[rgba(255,215,0,0.25)] flex items-center justify-center">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
              <circle cx="12" cy="12" r="10" fill="#ffd700" />
              <polyline points="7 12 10 15 17 8" stroke="#0d0d0d" strokeWidth="2.5" strokeLinecap="round" />
            </svg>
          </div>
        )}
      </div>

      {/* Card footer */}
      <div className="px-2 py-1.5 bg-[#080808]">
        <p className="text-[10px] font-bold text-[rgba(184,134,11,0.9)] truncate leading-tight">{tpl.name}</p>
        <p className="text-[8px] text-[rgba(184,134,11,0.4)] truncate leading-tight mt-0.5">{tpl.description}</p>
      </div>
    </button>
  );
}

/* ── Magic AI analyzing animation ── */
function MagicAIButton({ onAnalyze, disabled }: { onAnalyze: () => void; disabled: boolean }) {
  const [state, setState] = useState<"idle" | "analyzing" | "done">("idle");

  const handleClick = async () => {
    if (disabled || state !== "idle") return;
    setState("analyzing");
    await new Promise((r) => setTimeout(r, 1200)); // visual pause
    onAnalyze();
    setState("done");
    setTimeout(() => setState("idle"), 2500);
  };

  return (
    <button
      onClick={handleClick}
      disabled={disabled || state !== "idle"}
      className={`w-full py-3 rounded-2xl font-black text-sm transition-all relative overflow-hidden ${
        state === "analyzing"
          ? "bg-[rgba(184,134,11,0.15)] border border-[rgba(255,215,0,0.3)] text-[#ffd700]"
          : state === "done"
          ? "bg-[rgba(0,200,100,0.15)] border border-[rgba(0,200,100,0.4)] text-[#00ff96]"
          : disabled
          ? "bg-[rgba(184,134,11,0.05)] border border-[rgba(184,134,11,0.1)] text-[rgba(184,134,11,0.3)]"
          : "bg-gradient-to-r from-[#b8860b] to-[#ffd700] text-[#060606] shadow-[0_0_24px_rgba(255,215,0,0.35)]"
      }`}
    >
      {state === "analyzing" && (
        <div className="absolute inset-0 overflow-hidden">
          <div className="h-full w-1/3 bg-gradient-to-r from-transparent via-[rgba(255,215,0,0.3)] to-transparent animate-shimmer" />
        </div>
      )}
      <span className="relative">
        {state === "analyzing" ? "🧠 Analyzing your video..." :
         state === "done"      ? "✓ Best template applied!" :
         disabled              ? "🪄 Load a video to use Magic AI" :
                                 "🪄 Magic AI — Auto-Pick Best"}
      </span>
    </button>
  );
}

/* ── Main Gallery ── */
export default function TemplateGallery({ videoEl, onApply, onUnlockNeeded }: Props) {
  const [category, setCategory] = useState<CategoryId>("all");
  const [page, setPage] = useState(1);
  const [showLock, setShowLock] = useState(false);
  const sentinelRef = useRef<HTMLDivElement>(null);
  const scrollRef   = useRef<HTMLDivElement>(null);

  /* Filtered + paginated list */
  const filtered = category === "all"
    ? ALL_TEMPLATES
    : ALL_TEMPLATES.filter((t) => t.category === category);
  const visible = filtered.slice(0, page * PAGE_SIZE);
  const hasMore = visible.length < filtered.length;

  /* Infinite scroll via IntersectionObserver */
  useEffect(() => {
    if (!sentinelRef.current || !hasMore) return;
    const obs = new IntersectionObserver((entries) => {
      if (entries[0].isIntersecting) setPage((p) => p + 1);
    }, { threshold: 0.1 });
    obs.observe(sentinelRef.current);
    return () => obs.disconnect();
  }, [hasMore, category]);

  /* Reset page when category changes */
  useEffect(() => {
    setPage(1);
    scrollRef.current?.scrollTo({ top: 0 });
  }, [category]);

  const handleApply = useCallback((tpl: AITemplate) => {
    onApply(tpl.bgConfig);
  }, [onApply]);

  const handleMagicAI = useCallback(() => {
    if (!videoEl || videoEl.readyState < 2) return;
    try {
      const analysis = analyzeFrame(videoEl);
      const best = pickBestTemplate(analysis);
      onApply(best.bgConfig);
    } catch { /* silent — video may be cross-origin or not ready */ }
  }, [videoEl, onApply]);

  return (
    <div className="flex flex-col h-full">
      {/* Magic AI CTA */}
      <div className="flex-shrink-0 p-2.5 pb-0">
        <MagicAIButton onAnalyze={handleMagicAI} disabled={!videoEl || videoEl.readyState < 2} />
      </div>

      {/* Category tabs — horizontal scroll */}
      <div className="flex-shrink-0 flex gap-1.5 overflow-x-auto px-2.5 py-2 scrollbar-none">
        {CATEGORIES.map((cat) => (
          <button
            key={cat.id}
            onClick={() => setCategory(cat.id)}
            className={`flex-shrink-0 flex items-center gap-1 px-2.5 py-1 rounded-full text-[9px] font-bold transition-all border ${
              category === cat.id
                ? "bg-[rgba(184,134,11,0.2)] border-[rgba(255,215,0,0.5)] text-[#ffd700] shadow-[0_0_8px_rgba(255,215,0,0.15)]"
                : "bg-transparent border-[rgba(184,134,11,0.12)] text-[rgba(184,134,11,0.5)] hover:border-[rgba(184,134,11,0.3)]"
            }`}
          >
            <span>{cat.emoji}</span>
            <span>{cat.label}</span>
          </button>
        ))}
      </div>

      {/* Count */}
      <div className="flex-shrink-0 flex items-center justify-between px-3 mb-1.5">
        <p className="text-[rgba(184,134,11,0.35)] text-[8px] uppercase tracking-wider">
          {filtered.length} templates
        </p>
        <p className="text-[rgba(184,134,11,0.25)] text-[8px]">
          {filtered.filter((t) => t.isPremium).length} premium 🔒
        </p>
      </div>

      {/* Grid */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-2.5 pb-3">
        <div className="grid grid-cols-2 gap-2">
          {visible.map((tpl) => (
            <TemplateCard
              key={tpl.id}
              tpl={tpl}
              onApply={handleApply}
              onLockNeeded={() => setShowLock(true)}
            />
          ))}
        </div>

        {/* Infinite scroll sentinel */}
        {hasMore && (
          <div ref={sentinelRef} className="flex justify-center py-3">
            <div className="flex gap-1">
              {[0, 1, 2].map((i) => (
                <div key={i} className="w-1.5 h-1.5 rounded-full bg-[rgba(184,134,11,0.3)] animate-pulse"
                  style={{ animationDelay: `${i * 0.2}s` }} />
              ))}
            </div>
          </div>
        )}

        {!hasMore && visible.length > 0 && (
          <p className="text-center text-[rgba(184,134,11,0.2)] text-[8px] py-2 uppercase tracking-wider">
            All {filtered.length} templates loaded ✓
          </p>
        )}
      </div>

      {/* Viral Lock Modal */}
      {showLock && (
        <ViralLockModal
          onUnlock={() => { setShowLock(false); }}
          onClose={() => setShowLock(false)}
        />
      )}
    </div>
  );
}
