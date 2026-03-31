/**
 * OutfitPanel — AI Dress & Hair Color Change
 *
 * Uses MediaPipe body segmentation to isolate the person,
 * then divides the mask into zones:
 *   • Head zone  (top 28% of person bounds) → hair tint
 *   • Body zone  (middle 55% of person bounds) → dress / outfit tint
 *
 * Color grading is applied on a canvas overlay using
 * multiply + screen blend composition so the original
 * texture stays visible underneath the chosen color.
 */

import { useEffect, useRef, useState } from "react";
import { SegmentationEngine } from "./SegmentationEngine";

/* ── Props ── */
interface OutfitCanvasProps {
  enabled: boolean;
  videoEl: HTMLVideoElement | null;
  isPlaying: boolean;
  dressColor: string;
  dressEnabled: boolean;
  hairColor: string;
  hairEnabled: boolean;
  dressIntensity: number;
  hairIntensity: number;
  canvasElRef: React.RefObject<HTMLCanvasElement | null>;
}

/* ── Hex → rgba helper ── */
function hexToRgba(hex: string, alpha: number): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r},${g},${b},${alpha})`;
}

/* ── Canvas Overlay ── */
export function OutfitCanvas({
  enabled, videoEl, isPlaying,
  dressColor, dressEnabled,
  hairColor, hairEnabled,
  dressIntensity, hairIntensity,
  canvasElRef,
}: OutfitCanvasProps) {
  const localRef   = useRef<HTMLCanvasElement>(null);
  const canvasRef  = (canvasElRef ?? localRef) as React.RefObject<HTMLCanvasElement>;
  const rafRef     = useRef(0);
  const segRef     = useRef(new SegmentationEngine());
  const maskRef    = useRef<HTMLCanvasElement | null>(null);
  const segReadyRef = useRef(false);

  /* Load segmentation */
  useEffect(() => {
    if (!enabled) return;
    if (segRef.current.isReady || segRef.current.isLoading) return;
    segRef.current.load().then(() => {
      segReadyRef.current = segRef.current.isReady;
    });
  }, [enabled]);

  /* Draw loop */
  useEffect(() => {
    cancelAnimationFrame(rafRef.current);
    if (!enabled) return;

    /* scratch canvas for mask work */
    if (!maskRef.current) maskRef.current = document.createElement("canvas");

    const loop = async () => {
      rafRef.current = requestAnimationFrame(loop);
      const canvas = canvasRef.current;
      if (!canvas || !videoEl || videoEl.readyState < 2) return;

      const W = canvas.width;
      const H = canvas.height;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      ctx.clearRect(0, 0, W, H);
      if (!dressEnabled && !hairEnabled) return;

      /* Run segmentation */
      await segRef.current.process(videoEl);
      const mask = segRef.current.mask;
      if (!mask) return;

      /* Resize scratch canvas */
      const mc = maskRef.current!;
      if (mc.width !== W || mc.height !== H) { mc.width = W; mc.height = H; }
      const mCtx = mc.getContext("2d")!;

      /* --- DRESS / OUTFIT tint --- */
      if (dressEnabled) {
        mCtx.clearRect(0, 0, W, H);

        /* Draw solid dress color */
        mCtx.globalCompositeOperation = "source-over";
        mCtx.fillStyle = hexToRgba(dressColor, dressIntensity / 100);
        /* Body zone: from 25% to 95% of height */
        mCtx.fillRect(0, H * 0.25, W, H * 0.70);

        /* Clip to segmentation mask (person only) */
        mCtx.globalCompositeOperation = "destination-in";
        mCtx.drawImage(mask, 0, 0, W, H);

        /* Exclude head area - clear top 28% */
        mCtx.globalCompositeOperation = "destination-out";
        mCtx.fillStyle = "#000";
        mCtx.fillRect(0, 0, W, H * 0.28);

        /* Composite onto main canvas with color-blend */
        ctx.globalCompositeOperation = "multiply";
        ctx.globalAlpha = 0.55 + (dressIntensity / 100) * 0.35;
        ctx.drawImage(mc, 0, 0);
        ctx.globalCompositeOperation = "source-over";
        ctx.globalAlpha = 1;

        /* Second pass — screen for vibrancy */
        mCtx.clearRect(0, 0, W, H);
        mCtx.globalCompositeOperation = "source-over";
        mCtx.fillStyle = hexToRgba(dressColor, (dressIntensity / 100) * 0.35);
        mCtx.fillRect(0, H * 0.25, W, H * 0.70);
        mCtx.globalCompositeOperation = "destination-in";
        mCtx.drawImage(mask, 0, 0, W, H);
        mCtx.globalCompositeOperation = "destination-out";
        mCtx.fillStyle = "#000";
        mCtx.fillRect(0, 0, W, H * 0.28);

        ctx.globalCompositeOperation = "screen";
        ctx.globalAlpha = 0.28 + (dressIntensity / 100) * 0.18;
        ctx.drawImage(mc, 0, 0);
        ctx.globalCompositeOperation = "source-over";
        ctx.globalAlpha = 1;
      }

      /* --- HAIR tint --- */
      if (hairEnabled) {
        mCtx.clearRect(0, 0, W, H);

        /* Hair zone: top 28% of canvas */
        mCtx.globalCompositeOperation = "source-over";
        mCtx.fillStyle = hexToRgba(hairColor, hairIntensity / 100);
        mCtx.fillRect(0, 0, W, H * 0.30);

        /* Clip to person mask */
        mCtx.globalCompositeOperation = "destination-in";
        mCtx.drawImage(mask, 0, 0, W, H);

        /* Color blend for hair */
        ctx.globalCompositeOperation = "multiply";
        ctx.globalAlpha = 0.5 + (hairIntensity / 100) * 0.38;
        ctx.drawImage(mc, 0, 0);
        ctx.globalCompositeOperation = "source-over";
        ctx.globalAlpha = 1;

        /* Screen pass for brightness */
        mCtx.clearRect(0, 0, W, H);
        mCtx.globalCompositeOperation = "source-over";
        mCtx.fillStyle = hexToRgba(hairColor, (hairIntensity / 100) * 0.28);
        mCtx.fillRect(0, 0, W, H * 0.30);
        mCtx.globalCompositeOperation = "destination-in";
        mCtx.drawImage(mask, 0, 0, W, H);

        ctx.globalCompositeOperation = "screen";
        ctx.globalAlpha = 0.22 + (hairIntensity / 100) * 0.18;
        ctx.drawImage(mc, 0, 0);
        ctx.globalCompositeOperation = "source-over";
        ctx.globalAlpha = 1;
      }
    };

    loop();
    return () => cancelAnimationFrame(rafRef.current);
  }, [enabled, videoEl, isPlaying, dressColor, dressEnabled, hairColor, hairEnabled, dressIntensity, hairIntensity, canvasRef]);

  useEffect(() => () => {
    cancelAnimationFrame(rafRef.current);
    segRef.current.destroy();
  }, []);

  if (!enabled) return null;
  return (
    <canvas
      ref={canvasRef as React.RefObject<HTMLCanvasElement>}
      className="absolute inset-0 w-full h-full pointer-events-none"
      style={{ zIndex: 4 }}
      width={1280}
      height={720}
    />
  );
}

/* ── Preset palettes ── */
const DRESS_PRESETS = [
  { label: "Royal Blue",  color: "#1e40af" },
  { label: "Scarlet",     color: "#dc2626" },
  { label: "Emerald",     color: "#059669" },
  { label: "Gold",        color: "#d97706" },
  { label: "Purple",      color: "#7c3aed" },
  { label: "Rose",        color: "#e11d48" },
  { label: "Teal",        color: "#0d9488" },
  { label: "Midnight",    color: "#1e1b4b" },
  { label: "Coral",       color: "#f97316" },
  { label: "Silver",      color: "#94a3b8" },
];

const HAIR_PRESETS = [
  { label: "Jet Black",   color: "#111827" },
  { label: "Dark Brown",  color: "#7c2d12" },
  { label: "Caramel",     color: "#b45309" },
  { label: "Blonde",      color: "#fbbf24" },
  { label: "Red",         color: "#dc2626" },
  { label: "Burgundy",    color: "#881337" },
  { label: "Blue Black",  color: "#1e1b4b" },
  { label: "Blue",        color: "#2563eb" },
  { label: "Purple",      color: "#7c3aed" },
  { label: "Silver",      color: "#cbd5e1" },
];

/* ── Panel Controls ── */
interface PanelProps {
  dressEnabled: boolean;
  setDressEnabled: (v: boolean) => void;
  dressColor: string;
  setDressColor: (c: string) => void;
  dressIntensity: number;
  setDressIntensity: (n: number) => void;
  hairEnabled: boolean;
  setHairEnabled: (v: boolean) => void;
  hairColor: string;
  setHairColor: (c: string) => void;
  hairIntensity: number;
  setHairIntensity: (n: number) => void;
}

export function OutfitControls({
  dressEnabled, setDressEnabled, dressColor, setDressColor, dressIntensity, setDressIntensity,
  hairEnabled, setHairEnabled, hairColor, setHairColor, hairIntensity, setHairIntensity,
}: PanelProps) {
  const [tab, setTab] = useState<"dress" | "hair">("dress");

  return (
    <div className="flex flex-col gap-3 p-3">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-[#ffd700] font-bold text-sm">👗 AI Dress & Hair Change</p>
          <p className="text-[rgba(184,134,11,0.5)] text-[10px] mt-0.5">Realtime color transform using body AI</p>
        </div>
      </div>

      {/* Tab bar */}
      <div className="flex gap-0 rounded-xl overflow-hidden border border-[rgba(184,134,11,0.2)]">
        {(["dress", "hair"] as const).map((t) => (
          <button key={t} onClick={() => setTab(t)}
            className={`flex-1 py-1.5 text-[10px] font-bold uppercase tracking-wide transition-all ${tab === t ? "bg-[rgba(184,134,11,0.2)] text-[#ffd700]" : "bg-[#0a0a0a] text-[rgba(184,134,11,0.4)]"}`}>
            {t === "dress" ? "👗 Outfit" : "💇 Hair"}
          </button>
        ))}
      </div>

      {/* Dress tab */}
      {tab === "dress" && (
        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <p className="text-[rgba(184,134,11,0.7)] text-xs font-semibold">Outfit Color Change</p>
            <button onClick={() => setDressEnabled(!dressEnabled)}
              className={`w-10 h-5 rounded-full relative transition-colors flex-shrink-0 ${dressEnabled ? "bg-[#ffd700]" : "bg-[rgba(184,134,11,0.15)]"}`}>
              <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${dressEnabled ? "translate-x-5" : "translate-x-0.5"}`} />
            </button>
          </div>

          {/* Color swatches */}
          <div className="grid grid-cols-5 gap-1.5">
            {DRESS_PRESETS.map(({ label, color }) => (
              <button key={color}
                onClick={() => { setDressColor(color); setDressEnabled(true); }}
                title={label}
                className="flex flex-col items-center gap-0.5 group">
                <div className="w-8 h-8 rounded-xl border-2 transition-all"
                  style={{
                    background: color,
                    borderColor: dressColor === color ? "#ffd700" : "rgba(184,134,11,0.2)",
                    boxShadow: dressColor === color ? `0 0 10px ${color}88` : "none",
                  }} />
                <span className="text-[7px] text-[rgba(184,134,11,0.45)] group-hover:text-[rgba(184,134,11,0.7)] transition-colors leading-tight text-center">
                  {label}
                </span>
              </button>
            ))}
          </div>

          {/* Custom picker + intensity */}
          <div className="flex items-center gap-2">
            <input type="color" value={dressColor}
              onChange={(e) => { setDressColor(e.target.value); setDressEnabled(true); }}
              className="w-8 h-8 rounded-xl border border-[rgba(184,134,11,0.3)] cursor-pointer bg-transparent flex-shrink-0"
              title="Custom color" />
            <div className="flex-1">
              <div className="flex items-center justify-between mb-1">
                <p className="text-[rgba(184,134,11,0.5)] text-[9px] uppercase tracking-wide">Intensity</p>
                <span className="text-[rgba(184,134,11,0.5)] text-[9px]">{dressIntensity}%</span>
              </div>
              <input type="range" min="20" max="100" step="1"
                value={dressIntensity}
                onChange={(e) => { setDressIntensity(parseInt(e.target.value)); setDressEnabled(true); }}
                className="w-full accent-[#ffd700]" style={{ height: "4px" }} />
            </div>
          </div>
        </div>
      )}

      {/* Hair tab */}
      {tab === "hair" && (
        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <p className="text-[rgba(184,134,11,0.7)] text-xs font-semibold">Hair Color Change</p>
            <button onClick={() => setHairEnabled(!hairEnabled)}
              className={`w-10 h-5 rounded-full relative transition-colors flex-shrink-0 ${hairEnabled ? "bg-[#ffd700]" : "bg-[rgba(184,134,11,0.15)]"}`}>
              <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${hairEnabled ? "translate-x-5" : "translate-x-0.5"}`} />
            </button>
          </div>

          {/* Hair color swatches */}
          <div className="grid grid-cols-5 gap-1.5">
            {HAIR_PRESETS.map(({ label, color }) => (
              <button key={color}
                onClick={() => { setHairColor(color); setHairEnabled(true); }}
                title={label}
                className="flex flex-col items-center gap-0.5 group">
                <div className="w-8 h-8 rounded-xl border-2 transition-all"
                  style={{
                    background: color,
                    borderColor: hairColor === color ? "#ffd700" : "rgba(184,134,11,0.2)",
                    boxShadow: hairColor === color ? `0 0 10px ${color}88` : "none",
                  }} />
                <span className="text-[7px] text-[rgba(184,134,11,0.45)] group-hover:text-[rgba(184,134,11,0.7)] transition-colors leading-tight text-center">
                  {label}
                </span>
              </button>
            ))}
          </div>

          {/* Custom picker + intensity */}
          <div className="flex items-center gap-2">
            <input type="color" value={hairColor}
              onChange={(e) => { setHairColor(e.target.value); setHairEnabled(true); }}
              className="w-8 h-8 rounded-xl border border-[rgba(184,134,11,0.3)] cursor-pointer bg-transparent flex-shrink-0"
              title="Custom hair color" />
            <div className="flex-1">
              <div className="flex items-center justify-between mb-1">
                <p className="text-[rgba(184,134,11,0.5)] text-[9px] uppercase tracking-wide">Intensity</p>
                <span className="text-[rgba(184,134,11,0.5)] text-[9px]">{hairIntensity}%</span>
              </div>
              <input type="range" min="20" max="100" step="1"
                value={hairIntensity}
                onChange={(e) => { setHairIntensity(parseInt(e.target.value)); setHairEnabled(true); }}
                className="w-full accent-[#ffd700]" style={{ height: "4px" }} />
            </div>
          </div>
        </div>
      )}

      <div className="bg-[rgba(184,134,11,0.06)] rounded-xl border border-[rgba(184,134,11,0.15)] p-2.5 text-[rgba(184,134,11,0.5)] text-[9px] leading-relaxed">
        AI detects your body outline using on-device segmentation. Outfit tint applies to torso region, hair tint to head area. Works best with clear lighting.
      </div>
    </div>
  );
}
