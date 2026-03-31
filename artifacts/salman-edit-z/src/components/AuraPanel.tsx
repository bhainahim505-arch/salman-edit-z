import { useState, useEffect, useRef } from "react";
import { AURA_PRESETS, type AuraPreset } from "../filters";

interface Props {
  glowColor: string;
  glowIntensity: number;
  glowPulse: boolean;
  onColorChange: (c: string) => void;
  onIntensityChange: (v: number) => void;
  onPulseChange: (v: boolean) => void;
  glowElRef: React.RefObject<HTMLDivElement | null>;
}

const RAINBOW_COLORS = ["#ff0000","#ff7700","#ffff00","#00ff00","#00ffff","#0077ff","#8800ff","#ff00ff"];

export default function AuraPanel({
  glowColor, glowIntensity, glowPulse,
  onColorChange, onIntensityChange, onPulseChange,
  glowElRef,
}: Props) {
  const [activePreset, setActivePreset] = useState<string | null>(null);
  const rainbowRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const rainbowIndexRef = useRef(0);

  // Apply a preset
  const applyPreset = (p: AuraPreset) => {
    setActivePreset(p.id);
    // Stop any rainbow if switching away
    if (p.id !== "rainbow" && rainbowRef.current) {
      clearInterval(rainbowRef.current);
      rainbowRef.current = null;
    }
    onColorChange(p.color);
    onIntensityChange(p.intensity);
    onPulseChange(p.pulse);

    if (p.rainbow) {
      rainbowIndexRef.current = 0;
      rainbowRef.current = setInterval(() => {
        rainbowIndexRef.current = (rainbowIndexRef.current + 1) % RAINBOW_COLORS.length;
        const col = RAINBOW_COLORS[rainbowIndexRef.current];
        onColorChange(col);
        if (glowElRef.current) {
          glowElRef.current.style.boxShadow = `inset 0 0 ${p.intensity * 2.5}px ${p.intensity}px ${col}99`;
          glowElRef.current.style.borderColor = `${col}44`;
        }
      }, 250);
    }
  };

  // Cleanup rainbow on unmount
  useEffect(() => () => { if (rainbowRef.current) clearInterval(rainbowRef.current); }, []);

  return (
    <div className="flex flex-col gap-1.5 p-2" style={{ minHeight: 0 }}>
      {/* Presets row */}
      <div className="overflow-x-auto">
        <div className="flex gap-1.5 pb-0.5">
          {/* Off button */}
          <button
            onClick={() => { setActivePreset(null); onIntensityChange(0); onPulseChange(false); if (rainbowRef.current) { clearInterval(rainbowRef.current); rainbowRef.current = null; } }}
            className={`flex-shrink-0 flex flex-col items-center gap-0.5 px-2 py-1.5 rounded-xl border transition-all min-w-[48px] ${!activePreset || glowIntensity === 0 ? "bg-[rgba(184,134,11,0.18)] border-[rgba(255,215,0,0.5)]" : "bg-[#0d0d0d] border-[rgba(184,134,11,0.15)] hover:border-[rgba(184,134,11,0.4)]"}`}
          >
            <span className="text-base">🚫</span>
            <span className={`text-[8px] ${!activePreset || glowIntensity === 0 ? "text-[#ffd700]" : "text-[rgba(184,134,11,0.5)]"}`}>Off</span>
          </button>

          {AURA_PRESETS.map((p) => (
            <button
              key={p.id}
              onClick={() => applyPreset(p)}
              className={`flex-shrink-0 flex flex-col items-center gap-0.5 px-2 py-1.5 rounded-xl border transition-all min-w-[52px] ${
                activePreset === p.id && glowIntensity > 0
                  ? "border-[rgba(255,215,0,0.7)] shadow-[0_0_10px_rgba(255,215,0,0.25)]"
                  : "bg-[#0d0d0d] border-[rgba(184,134,11,0.15)] hover:border-[rgba(184,134,11,0.4)]"
              }`}
              style={activePreset === p.id && glowIntensity > 0 ? { background: `${p.color}22` } : undefined}
              title={p.description}
            >
              <span className="text-base leading-none">{p.emoji}</span>
              <span className={`text-[8px] text-center leading-tight ${activePreset === p.id && glowIntensity > 0 ? "text-[#ffd700]" : "text-[rgba(184,134,11,0.5)]"}`}>{p.name.split(" ")[0]}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Manual controls */}
      <div className="flex items-center gap-2">
        <span className="text-[rgba(184,134,11,0.4)] text-[9px] w-12 flex-shrink-0">Custom</span>
        <input
          type="color"
          value={glowColor}
          onChange={(e) => { setActivePreset(null); onColorChange(e.target.value); }}
          className="w-6 h-6 rounded cursor-pointer border border-[rgba(184,134,11,0.2)] bg-transparent flex-shrink-0"
        />
        <input
          type="range" min="0" max="60" step="1" value={glowIntensity}
          onChange={(e) => onIntensityChange(Number(e.target.value))}
          className="flex-1 accent-[#ffd700]" style={{ height: "4px" }}
        />
        <span className="text-[rgba(184,134,11,0.5)] text-[9px] w-6 text-right">{glowIntensity}</span>
        <button
          onClick={() => onPulseChange(!glowPulse)}
          className={`flex-shrink-0 px-2 py-0.5 rounded-lg text-[9px] border transition-all ${glowPulse ? "bg-[rgba(184,134,11,0.2)] border-[rgba(255,215,0,0.4)] text-[#ffd700]" : "border-[rgba(184,134,11,0.2)] text-[rgba(184,134,11,0.5)]"}`}
        >
          {glowPulse ? "💓 Pulse ON" : "💤 Pulse OFF"}
        </button>
      </div>
    </div>
  );
}
