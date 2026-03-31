/**
 * ClonePanel — Multi-Character Layering
 *
 * Lets the user add up to 4 "clones" of themselves on screen at once.
 * Each clone is a mini copy of the live video frame rendered at a
 * configurable position + scale + opacity + optional mirror flip.
 *
 * The clones are drawn by injecting extra drawImage calls into the main
 * canvas via a callback exposed to VideoEditor. During export they are
 * baked into every frame automatically.
 */

import { useState } from "react";

export type CloneSlot = {
  id: string;
  preset: ClonePreset;
  scale: number;       // 0.15 – 0.65 (fraction of canvas width)
  opacity: number;     // 0 – 1
  mirror: boolean;
};

export type ClonePreset = "top-left" | "top-right" | "bottom-left" | "bottom-right" | "center-left" | "center-right";

const PRESET_LABELS: Record<ClonePreset, string> = {
  "top-left":      "↖ Top Left",
  "top-right":     "↗ Top Right",
  "bottom-left":   "↙ Bottom Left",
  "bottom-right":  "↘ Bottom Right",
  "center-left":   "← Center Left",
  "center-right":  "→ Center Right",
};

const PRESETS = Object.keys(PRESET_LABELS) as ClonePreset[];

const PALETTE = [
  { label: "Small",  scale: 0.22 },
  { label: "Medium", scale: 0.38 },
  { label: "Large",  scale: 0.52 },
];

function uid() {
  return Math.random().toString(36).slice(2);
}

interface Props {
  clones: CloneSlot[];
  setClones: (c: CloneSlot[]) => void;
}

export default function ClonePanel({ clones, setClones }: Props) {
  const [editingId, setEditingId] = useState<string | null>(null);

  const addClone = () => {
    if (clones.length >= 4) return;
    const usedPresets = new Set(clones.map((c) => c.preset));
    const free = PRESETS.find((p) => !usedPresets.has(p)) ?? "top-left";
    setClones([
      ...clones,
      { id: uid(), preset: free, scale: 0.30, opacity: 0.92, mirror: false },
    ]);
  };

  const updateClone = (id: string, patch: Partial<CloneSlot>) => {
    setClones(clones.map((c) => (c.id === id ? { ...c, ...patch } : c)));
  };

  const removeClone = (id: string) => {
    setClones(clones.filter((c) => c.id !== id));
    if (editingId === id) setEditingId(null);
  };

  return (
    <div className="flex flex-col gap-3 p-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-[#ffd700] font-bold text-sm">Multi-Clone</p>
          <p className="text-[rgba(184,134,11,0.5)] text-[10px]">Up to 4 clones on screen</p>
        </div>
        <button
          onClick={addClone}
          disabled={clones.length >= 4}
          className="px-3 py-1.5 bg-gradient-to-r from-[#b8860b] to-[#ffd700] text-[#0d0d0d] font-bold rounded-xl text-xs disabled:opacity-30 disabled:cursor-not-allowed shadow-[0_0_10px_rgba(255,215,0,0.2)]"
        >
          + Add Clone
        </button>
      </div>

      {clones.length === 0 && (
        <div className="text-center py-6 text-[rgba(184,134,11,0.35)] text-xs">
          Tap "Add Clone" to layer yourself on screen
        </div>
      )}

      {/* Clone list */}
      <div className="flex flex-col gap-2">
        {clones.map((clone, idx) => (
          <div
            key={clone.id}
            className="rounded-2xl border border-[rgba(184,134,11,0.2)] bg-[rgba(0,0,0,0.3)] overflow-hidden"
          >
            {/* Row header */}
            <div
              className="flex items-center gap-2.5 p-2.5 cursor-pointer"
              onClick={() => setEditingId(editingId === clone.id ? null : clone.id)}
            >
              <div className="w-6 h-6 rounded-lg bg-gradient-to-br from-[#ffd700] to-[#b8860b] flex items-center justify-center text-[#0d0d0d] font-black text-xs flex-shrink-0">
                {idx + 1}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[rgba(184,134,11,0.9)] text-xs font-semibold">
                  Clone {idx + 1} — {PRESET_LABELS[clone.preset]}
                </p>
                <p className="text-[rgba(184,134,11,0.4)] text-[9px]">
                  Scale {Math.round(clone.scale * 100)}% · Opacity {Math.round(clone.opacity * 100)}%{clone.mirror ? " · Mirrored" : ""}
                </p>
              </div>
              <button
                onClick={(e) => { e.stopPropagation(); removeClone(clone.id); }}
                className="text-[rgba(184,134,11,0.4)] hover:text-red-400 transition-colors text-base leading-none px-1"
              >
                ×
              </button>
              <svg
                width="12" height="12" viewBox="0 0 24 24" fill="none"
                stroke="rgba(184,134,11,0.4)" strokeWidth="2"
                className={`transition-transform flex-shrink-0 ${editingId === clone.id ? "rotate-90" : ""}`}
              >
                <polyline points="9 18 15 12 9 6" />
              </svg>
            </div>

            {/* Expanded controls */}
            {editingId === clone.id && (
              <div className="px-3 pb-3 flex flex-col gap-3 border-t border-[rgba(184,134,11,0.1)] pt-2.5">
                {/* Position preset */}
                <div>
                  <p className="text-[rgba(184,134,11,0.55)] text-[9px] uppercase tracking-wider mb-1.5">Position</p>
                  <div className="grid grid-cols-3 gap-1">
                    {PRESETS.map((p) => (
                      <button
                        key={p}
                        onClick={() => updateClone(clone.id, { preset: p })}
                        className={`py-1.5 rounded-lg text-[9px] font-medium transition-all ${
                          clone.preset === p
                            ? "bg-[#ffd700] text-[#0d0d0d]"
                            : "bg-[rgba(184,134,11,0.08)] text-[rgba(184,134,11,0.6)] hover:bg-[rgba(184,134,11,0.15)]"
                        }`}
                      >
                        {PRESET_LABELS[p].split(" ").slice(-2).join(" ")}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Scale presets */}
                <div>
                  <p className="text-[rgba(184,134,11,0.55)] text-[9px] uppercase tracking-wider mb-1.5">Size</p>
                  <div className="flex gap-1.5">
                    {PALETTE.map((p) => (
                      <button
                        key={p.label}
                        onClick={() => updateClone(clone.id, { scale: p.scale })}
                        className={`flex-1 py-1.5 rounded-lg text-[9px] font-medium transition-all ${
                          Math.abs(clone.scale - p.scale) < 0.05
                            ? "bg-[#ffd700] text-[#0d0d0d]"
                            : "bg-[rgba(184,134,11,0.08)] text-[rgba(184,134,11,0.6)] hover:bg-[rgba(184,134,11,0.15)]"
                        }`}
                      >
                        {p.label}
                      </button>
                    ))}
                  </div>
                  <input
                    type="range" min="15" max="65" step="1"
                    value={Math.round(clone.scale * 100)}
                    onChange={(e) => updateClone(clone.id, { scale: parseInt(e.target.value) / 100 })}
                    className="w-full mt-2 accent-[#ffd700]"
                  />
                </div>

                {/* Opacity */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <p className="text-[rgba(184,134,11,0.55)] text-[9px] uppercase tracking-wider">Opacity</p>
                    <span className="text-[rgba(184,134,11,0.6)] text-[9px]">{Math.round(clone.opacity * 100)}%</span>
                  </div>
                  <input
                    type="range" min="20" max="100" step="1"
                    value={Math.round(clone.opacity * 100)}
                    onChange={(e) => updateClone(clone.id, { opacity: parseInt(e.target.value) / 100 })}
                    className="w-full accent-[#ffd700]"
                  />
                </div>

                {/* Mirror toggle */}
                <div className="flex items-center justify-between">
                  <p className="text-[rgba(184,134,11,0.7)] text-xs">Mirror Flip</p>
                  <button
                    onClick={() => updateClone(clone.id, { mirror: !clone.mirror })}
                    className={`w-10 h-5 rounded-full relative transition-colors ${clone.mirror ? "bg-[#ffd700]" : "bg-[rgba(184,134,11,0.15)]"}`}
                  >
                    <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${clone.mirror ? "translate-x-5" : "translate-x-0.5"}`} />
                  </button>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      {clones.length > 0 && (
        <p className="text-[rgba(184,134,11,0.3)] text-[9px] text-center">
          Clones are baked into the exported video
        </p>
      )}
    </div>
  );
}

/* ── Helper: compute pixel coords for a clone slot ────────────────────── */
export function getCloneRect(
  slot: CloneSlot,
  canvasW: number,
  canvasH: number,
): { x: number; y: number; w: number; h: number } {
  const w = Math.round(canvasW * slot.scale);
  const h = Math.round(canvasH * slot.scale);
  const PAD = Math.round(canvasW * 0.03);

  switch (slot.preset) {
    case "top-left":      return { x: PAD,           y: PAD,            w, h };
    case "top-right":     return { x: canvasW - w - PAD, y: PAD,        w, h };
    case "bottom-left":   return { x: PAD,           y: canvasH - h - PAD, w, h };
    case "bottom-right":  return { x: canvasW - w - PAD, y: canvasH - h - PAD, w, h };
    case "center-left":   return { x: PAD,           y: (canvasH - h) / 2, w, h };
    case "center-right":  return { x: canvasW - w - PAD, y: (canvasH - h) / 2, w, h };
    default:              return { x: PAD,           y: PAD,            w, h };
  }
}
