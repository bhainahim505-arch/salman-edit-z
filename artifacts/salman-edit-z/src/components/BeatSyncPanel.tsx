import { useEffect, useRef, useState, useCallback } from "react";

interface Props {
  analyser: AnalyserNode | null;
  isPlaying: boolean;
  isExporting?: boolean;
  videoEl: HTMLVideoElement | null;
  glowElRef: React.RefObject<HTMLDivElement | null>;
  glowColor: string;
  glowIntensity: number;
}

type SyncMode = "zoom" | "flash" | "color" | "aura";

const MODE_LABELS: Record<SyncMode, string> = {
  zoom: "Beat Zoom",
  flash: "Beat Flash",
  color: "Color Pop",
  aura: "Aura Pulse",
};
const MODE_EMOJIS: Record<SyncMode, string> = {
  zoom: "🔍",
  flash: "💡",
  color: "🌈",
  aura: "✨",
};

const FLASH_COLORS = ["#ff0044", "#00ffff", "#ffff00", "#ff00ff", "#00ff88"];

export default function BeatSyncPanel({
  analyser,
  isPlaying,
  isExporting,
  videoEl,
  glowElRef,
  glowColor,
  glowIntensity,
}: Props) {
  const [active, setActive] = useState(false);
  const [mode, setMode] = useState<SyncMode>("zoom");
  const [sensitivity, setSensitivity] = useState(1.4);

  /* ── UI state — only updated via slow 500ms interval to avoid re-renders in RAF ── */
  const [displayBpm, setDisplayBpm] = useState<number | null>(null);
  const [displayBeats, setDisplayBeats] = useState(0);

  /* ── Hot-path refs — zero React overhead ── */
  const rafRef = useRef<number>(0);
  const uiIntervalRef = useRef<ReturnType<typeof setInterval>>(undefined);
  const frameSkipRef = useRef(0);         // analyze every 2nd frame = 30fps
  const energySumRef = useRef(0);         // running sum instead of reduce()
  const energyHistRef = useRef<number[]>([]);
  const lastBeatRef = useRef(0);
  const beatTimesRef = useRef<number[]>([]);
  const colorIndexRef = useRef(0);
  const beatCountRef = useRef(0);
  const bpmRef = useRef<number | null>(null);

  /* ── Effect decay counters (replaces setTimeout accumulation) ── */
  const zoomDecayRef = useRef(0);
  const flashDecayRef = useRef(0);
  const colorDecayRef = useRef(0);
  const auraDecayRef = useRef(0);
  const modeRef = useRef<SyncMode>("zoom");

  /* Keep modeRef in sync without re-creating the RAF closure */
  useEffect(() => { modeRef.current = mode; }, [mode]);

  /* ── GPU hint on the video element while active ── */
  useEffect(() => {
    if (!videoEl) return;
    if (active) {
      videoEl.style.willChange = "transform, filter";
    } else {
      videoEl.style.willChange = "auto";
      videoEl.style.transform = "";
      videoEl.style.filter = "";
      videoEl.style.transition = "";
    }
  }, [active, videoEl]);

  /* ── Effect trigger — pure DOM writes, NO React state ── */
  const triggerEffect = useCallback(
    (now: number) => {
      beatCountRef.current += 1;
      beatTimesRef.current.push(now);
      if (beatTimesRef.current.length > 8) beatTimesRef.current.shift();
      if (beatTimesRef.current.length >= 2) {
        const diffs: number[] = [];
        for (let i = 1; i < beatTimesRef.current.length; i++)
          diffs.push(beatTimesRef.current[i] - beatTimesRef.current[i - 1]);
        const avgMs = diffs.reduce((a, b) => a + b, 0) / diffs.length;
        bpmRef.current = Math.round(60000 / avgMs);
      }

      const m = modeRef.current;
      if (m === "zoom" && videoEl) {
        videoEl.style.transition = "transform 80ms ease-out";
        videoEl.style.transform = "scale3d(1.055,1.055,1)";
        zoomDecayRef.current = 9; // ~150ms at 60fps
      }
      if (m === "flash") {
        const overlay = document.getElementById("beat-flash-overlay");
        if (overlay) {
          overlay.style.background = FLASH_COLORS[colorIndexRef.current % FLASH_COLORS.length];
          overlay.style.opacity = "0.35";
          flashDecayRef.current = 5; // ~80ms
        }
        colorIndexRef.current++;
      }
      if (m === "color" && videoEl) {
        const hue = (colorIndexRef.current * 37) % 360;
        colorIndexRef.current++;
        videoEl.style.transition = "filter 80ms ease-out";
        videoEl.style.filter = `hue-rotate(${hue}deg) saturate(180%)`;
        colorDecayRef.current = 12; // ~200ms
      }
      if (m === "aura" && glowElRef.current) {
        const el = glowElRef.current;
        const px = (glowIntensity || 28) * 2.2;
        const col = FLASH_COLORS[colorIndexRef.current % FLASH_COLORS.length];
        colorIndexRef.current++;
        el.style.transition = "box-shadow 60ms ease-out, border-color 60ms";
        el.style.boxShadow = `inset 0 0 ${px * 2}px ${px}px ${col}cc`;
        el.style.borderColor = `${col}66`;
        auraDecayRef.current = 12; // ~200ms
      }
    },
    [videoEl, glowElRef, glowIntensity]
  );

  /* ── RAF decay ticks — clear effects without setTimeout ── */
  const decayEffects = useCallback(() => {
    if (zoomDecayRef.current > 0) {
      zoomDecayRef.current--;
      if (zoomDecayRef.current === 0 && videoEl) {
        videoEl.style.transform = "scale3d(1,1,1)";
      }
    }
    if (flashDecayRef.current > 0) {
      flashDecayRef.current--;
      if (flashDecayRef.current === 0) {
        const overlay = document.getElementById("beat-flash-overlay");
        if (overlay) overlay.style.opacity = "0";
      }
    }
    if (colorDecayRef.current > 0) {
      colorDecayRef.current--;
      if (colorDecayRef.current === 0 && videoEl) {
        videoEl.style.filter = "";
        videoEl.style.transition = "";
      }
    }
    if (auraDecayRef.current > 0) {
      auraDecayRef.current--;
      if (auraDecayRef.current === 0 && glowElRef.current) {
        const el = glowElRef.current;
        el.style.boxShadow = `inset 0 0 ${(glowIntensity || 20) * 2.5}px ${glowIntensity || 20}px ${glowColor}99`;
        el.style.borderColor = `${glowColor}44`;
      }
    }
  }, [videoEl, glowElRef, glowColor, glowIntensity]);

  const sensitivityRef = useRef(sensitivity);
  useEffect(() => { sensitivityRef.current = sensitivity; }, [sensitivity]);

  /* ── Main RAF loop — also paused during export to free the main thread ── */
  useEffect(() => {
    if (!active || !analyser || !isPlaying || isExporting) {
      cancelAnimationFrame(rafRef.current);
      return;
    }

    const HISTORY = 43;
    const bufLen = analyser.frequencyBinCount;
    const dataArr = new Uint8Array(bufLen);
    const MIN_BEAT_INTERVAL = 60000 / 240;

    function tick() {
      rafRef.current = requestAnimationFrame(tick);

      /* Decay counters run every frame (cheap integer ops) */
      decayEffects();

      /* Analysis runs every 2nd frame — halves main-thread load */
      frameSkipRef.current ^= 1;
      if (frameSkipRef.current) return;

      analyser.getByteFrequencyData(dataArr);

      /* Bass energy: bins 0-12 (~0-520 Hz) — fixed loop, no array alloc */
      let energy = 0;
      for (let i = 0; i < 13; i++) energy += dataArr[i];
      energy = (energy * 0.076923) | 0; // divide by 13, integer

      /* Running sum: O(1) instead of O(N) reduce */
      const hist = energyHistRef.current;
      if (hist.length >= HISTORY) energySumRef.current -= hist.shift()!;
      hist.push(energy);
      energySumRef.current += energy;
      const mean = (energySumRef.current / hist.length) | 0;

      const now = performance.now();
      if (
        energy > (mean * sensitivityRef.current) &&
        energy > 20 &&
        now - lastBeatRef.current > MIN_BEAT_INTERVAL
      ) {
        lastBeatRef.current = now;
        triggerEffect(now);
      }
    }

    tick();
    return () => { cancelAnimationFrame(rafRef.current); };
  }, [active, analyser, isPlaying, triggerEffect, decayEffects]);

  /* ── Slow UI sync — update React state at 2Hz, not 60Hz ── */
  useEffect(() => {
    if (!active) return;
    uiIntervalRef.current = setInterval(() => {
      setDisplayBeats(beatCountRef.current);
      setDisplayBpm(bpmRef.current);
    }, 500);
    return () => clearInterval(uiIntervalRef.current);
  }, [active]);

  const toggle = useCallback(() => {
    if (active) {
      cancelAnimationFrame(rafRef.current);
      clearInterval(uiIntervalRef.current);
      beatTimesRef.current = [];
      energyHistRef.current = [];
      energySumRef.current = 0;
      beatCountRef.current = 0;
      bpmRef.current = null;
      zoomDecayRef.current = 0;
      flashDecayRef.current = 0;
      colorDecayRef.current = 0;
      auraDecayRef.current = 0;
      setDisplayBpm(null);
      setDisplayBeats(0);
    }
    setActive((v) => !v);
  }, [active]);

  return (
    <div className="p-2 flex flex-col gap-2">
      <div className="flex items-center gap-2 flex-wrap">
        <button
          onClick={toggle}
          disabled={!analyser}
          className={`px-3 py-1.5 rounded-xl font-bold text-xs border transition-all disabled:opacity-40 ${
            active
              ? "bg-[rgba(255,50,50,0.15)] border-red-500 text-red-300"
              : "bg-gradient-to-r from-[#b8860b] to-[#ffd700] border-transparent text-[#0d0d0d]"
          }`}
        >
          {active ? "⏹ Stop Beat Sync" : "🥁 Start Beat Sync"}
        </button>

        {!analyser && (
          <span className="text-[rgba(184,134,11,0.45)] text-[9px]">Upload video first to activate</span>
        )}
        {active && (
          <div className="flex items-center gap-2 ml-auto">
            <div className="w-1.5 h-1.5 rounded-full bg-[#ffd700] animate-pulse" />
            <span className="text-[#ffd700] text-[9px] font-mono">
              {displayBpm ? `${displayBpm} BPM` : "Detecting…"}
            </span>
            <span className="text-[rgba(184,134,11,0.5)] text-[9px]">{displayBeats} beats</span>
          </div>
        )}
      </div>

      <div className="flex gap-1.5 flex-wrap">
        {(["zoom", "flash", "color", "aura"] as SyncMode[]).map((m) => (
          <button
            key={m}
            onClick={() => setMode(m)}
            className={`flex items-center gap-1 px-2 py-1 rounded-lg border text-[9px] font-semibold transition-all ${
              mode === m
                ? "bg-[rgba(184,134,11,0.2)] border-[rgba(255,215,0,0.5)] text-[#ffd700]"
                : "border-[rgba(184,134,11,0.2)] text-[rgba(184,134,11,0.5)] hover:text-[#ffd700]"
            }`}
          >
            <span>{MODE_EMOJIS[m]}</span>
            <span>{MODE_LABELS[m]}</span>
          </button>
        ))}
      </div>

      <div className="flex items-center gap-2">
        <span className="text-[rgba(184,134,11,0.45)] text-[9px] w-20 flex-shrink-0">Sensitivity</span>
        <input
          type="range" min="1.1" max="2.5" step="0.05" value={sensitivity}
          onChange={(e) => setSensitivity(parseFloat(e.target.value))}
          className="flex-1 accent-[#ffd700]" style={{ height: "4px" }}
        />
        <span className="text-[rgba(184,134,11,0.5)] text-[9px] w-8 text-right">{sensitivity.toFixed(1)}x</span>
      </div>

      <p className="text-[rgba(184,134,11,0.3)] text-[9px]">
        Beat Sync analyses bass in real-time and triggers GPU-accelerated effects on every beat.
        {active && !isPlaying && " ▶ Press Play to start detecting."}
      </p>

      <div
        id="beat-flash-overlay"
        className="pointer-events-none fixed inset-0 z-50 opacity-0 transition-opacity"
        style={{ mixBlendMode: "screen" }}
      />
    </div>
  );
}
