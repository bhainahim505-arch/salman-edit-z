import {
  useRef, useState, useEffect, useCallback, useMemo,
  type PointerEvent as RPointerEvent,
} from "react";
import { showInterstitial } from "./unityAds";
import {
  FILTERS, TRANSITIONS, FONT_OPTIONS, SPEED_OPTIONS, EXPORT_PRESETS,
  NEXT_LEVEL_FILTERS,
  type NextFilter, type TextOverlay, type Transition, type ExtendedFilter,
  formatTime, lerpKeyframe, enrichCaptionWithEmoji,
} from "./filters";
import FiltersLibrary from "./components/FiltersLibrary";
import AuraPanel from "./components/AuraPanel";
import BeatSyncPanel from "./components/BeatSyncPanel";
import VoiceChanger from "./components/VoiceChanger";
import BlueNeonGlowCanvas from "./components/BlueNeonGlowCanvas";
import ClonePanel, { type CloneSlot, getCloneRect } from "./components/ClonePanel";
import PipOverlay, { type PipState } from "./components/PipOverlay";
import BgSwapCanvas, { BgSwapControls, type BgSwapState } from "./components/BgSwapPanel";
import { OutfitCanvas, OutfitControls } from "./components/OutfitPanel";
import WebGLFaceGrade from "./components/WebGLFaceGrade";
import SmokeGlowOverlay from "./components/SmokeGlowOverlay";
import ViralLockModal from "./components/ViralLockModal";
import { isUnlocked } from "./bgLock";
import type { Muxer as MuxerType, ArrayBufferTarget as ArrayBufferTargetType } from "mp4-muxer";

/* ─── Music search result type ───────────────────────────── */
interface SearchTrack {
  id: string;
  title: string;
  artist: string;
  duration: number;    // seconds
  previewUrl: string;  // direct audio URL
  artworkUrl: string;
  source: "itunes" | "pixabay" | "custom";
  tags?: string;
}

async function searchItunes(query: string): Promise<SearchTrack[]> {
  const url = `https://itunes.apple.com/search?term=${encodeURIComponent(query)}&media=music&entity=song&limit=25&explicit=No`;
  const res = await fetch(url);
  if (!res.ok) throw new Error("iTunes fetch failed");
  const data = await res.json();
  return (data.results as Record<string, unknown>[])
    .filter((r) => r.previewUrl)
    .map((r) => ({
      id: String(r.trackId),
      title: String(r.trackName ?? "Unknown"),
      artist: String(r.artistName ?? "Unknown"),
      duration: Math.round((Number(r.trackTimeMillis) || 0) / 1000),
      previewUrl: String(r.previewUrl),
      artworkUrl: String(r.artworkUrl60 ?? ""),
      source: "itunes" as const,
    }));
}

async function searchPixabay(query: string, key: string): Promise<SearchTrack[]> {
  const url = `https://pixabay.com/api/music/?key=${encodeURIComponent(key)}&q=${encodeURIComponent(query)}&per_page=20&order=popular`;
  const res = await fetch(url);
  if (!res.ok) throw new Error("Pixabay fetch failed");
  const data = await res.json();
  return ((data.hits as Record<string, unknown>[]) ?? []).map((h) => ({
    id: String(h.id),
    title: String((h.tags as string).split(",")[0]).trim() || "Track",
    artist: String(h.user ?? "Unknown"),
    duration: Number(h.duration ?? 0),
    previewUrl: String(h.previewURL ?? h.preview_url ?? ""),
    artworkUrl: "",
    source: "pixabay" as const,
    tags: String(h.tags ?? ""),
  }));
}

const TRENDING_KEYWORDS = [
  "trending pop 2024", "top hits hindi", "bollywood 2024",
  "bhojpuri hits", "punjabi songs", "rap beats", "lofi study",
];
const RANDOM_TRENDING = TRENDING_KEYWORDS[Math.floor(Math.random() * TRENDING_KEYWORDS.length)];

/* ─── Type declarations for browser APIs ─────────────────── */
declare global {
  interface Window {
    SpeechRecognition?: new () => SpeechRecognition;
    webkitSpeechRecognition?: new () => SpeechRecognition;
    VideoEncoder?: unknown;
  }
  interface SpeechRecognitionErrorEvent extends Event {
    error: string;
  }
}

/* ─── Waveform Canvas ─────────────────────────────────────── */
function WaveformCanvas({
  analyser, isPlaying, waveformData, isExporting,
}: { analyser: AnalyserNode | null; isPlaying: boolean; waveformData: Uint8Array; isExporting?: boolean }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef<number>(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d")!;
    const bufLen = analyser?.frequencyBinCount ?? 128;
    const dataArr = new Uint8Array(bufLen);
    /* Pre-build gradient stops once to avoid alloc inside hot loop */
    const grad0 = "rgba(255,215,0,0.9)";
    const grad1 = "rgba(184,134,11,0.3)";

    function draw() {
      rafRef.current = requestAnimationFrame(draw);
      if (analyser) analyser.getByteFrequencyData(dataArr);
      ctx.clearRect(0, 0, canvas!.width, canvas!.height);
      const barW = Math.max(2, canvas!.width / bufLen);
      for (let i = 0; i < bufLen; i++) {
        const v = (analyser ? dataArr[i] : waveformData[Math.floor(i * waveformData.length / bufLen)] ?? 0) / 255;
        const h = Math.max(2, v * canvas!.height);
        const x = i * barW;
        const gr = ctx.createLinearGradient(0, canvas!.height - h, 0, canvas!.height);
        gr.addColorStop(0, grad0); gr.addColorStop(1, grad1);
        ctx.fillStyle = gr;
        ctx.fillRect(x, canvas!.height - h, barW - 1, h);
      }
    }

    /* Stop RAF during export — frees main thread for frame capture */
    if (isPlaying && analyser && !isExporting) { draw(); }
    else {
      cancelAnimationFrame(rafRef.current);
      if (!isExporting) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        const step = waveformData.length / canvas.width;
        for (let i = 0; i < canvas.width; i++) {
          const v = (waveformData[Math.floor(i * step)] ?? 0) / 255;
          const h = Math.max(2, v * canvas.height);
          const gr = ctx.createLinearGradient(0, canvas.height - h, 0, canvas.height);
          gr.addColorStop(0, "rgba(255,215,0,0.55)");
          gr.addColorStop(1, "rgba(184,134,11,0.15)");
          ctx.fillStyle = gr;
          ctx.fillRect(i, canvas.height - h, 1, h);
        }
      }
    }
    return () => cancelAnimationFrame(rafRef.current);
  }, [analyser, isPlaying, waveformData, isExporting]);

  return <canvas ref={canvasRef} className="absolute inset-0 w-full h-full" width={600} height={40} />;
}

/* ─── Glitch canvas overlay ───────────────────────────────── */
function GlitchOverlay({ active }: { active: boolean }) {
  const ref = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef<number>(0);
  useEffect(() => {
    if (!active || !ref.current) { cancelAnimationFrame(rafRef.current); return; }
    const canvas = ref.current;
    const ctx = canvas.getContext("2d")!;
    function draw() {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      for (let i = 0; i < 6; i++) {
        const y = Math.random() * canvas.height;
        const h = Math.random() * 8 + 2;
        const offset = (Math.random() - 0.5) * 30;
        ctx.fillStyle = `rgba(${Math.random() > 0.5 ? 255 : 0},${Math.random() > 0.5 ? 255 : 0},${Math.random() > 0.5 ? 255 : 0},${Math.random() * 0.4 + 0.1})`;
        ctx.fillRect(offset, y, canvas.width, h);
      }
      rafRef.current = requestAnimationFrame(draw);
    }
    draw();
    return () => cancelAnimationFrame(rafRef.current);
  }, [active]);
  return (
    <canvas
      ref={ref}
      className="absolute inset-0 w-full h-full pointer-events-none z-10"
      width={400} height={225}
      style={{ display: active ? "block" : "none", mixBlendMode: "screen" }}
    />
  );
}

/* ─── Main VideoEditor ───────────────────────────────────── */
type Panel = "none" | "filter" | "text" | "speed" | "audio" | "trim" | "transition" | "captions" | "music" | "nextfilter" | "glow" | "filterslib" | "beatsync" | "voice" | "clone" | "neon" | "pip" | "bgswap" | "outfit";

export default function VideoEditor() {
  /* ── Refs ── */
  const videoRef = useRef<HTMLVideoElement>(null);
  const videoWrapRef = useRef<HTMLDivElement>(null);
  const timelineRef = useRef<HTMLDivElement>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const exportDestRef = useRef<MediaStreamAudioDestinationNode | null>(null);
  const recogRef = useRef<SpeechRecognition | null>(null);
  const captionActiveRef = useRef(false);
  const lastTimeUpdateRef = useRef(0);
  const volumeRef = useRef(1);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const trimDragRef = useRef<{ side: "start" | "end"; startX: number; startVal: number } | null>(null);
  const textDragRef = useRef<{ id: string; startX: number; startY: number } | null>(null);
  const playPromiseRef = useRef<Promise<void> | null>(null);

  /* ── Video state ── */
  const [videoURL, setVideoURL] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [waveformData, setWaveformData] = useState<Uint8Array>(new Uint8Array(0));

  /* ── Trim ── */
  const [trimStart, setTrimStart] = useState(0);
  const [trimEnd, setTrimEnd] = useState(0);

  /* ── Filter ── */
  const [activeFilter, setActiveFilter] = useState(FILTERS[0]);
  const [libraryFilter, setLibraryFilter] = useState<ExtendedFilter | null>(null);

  /* ── Transitions ── */
  const [activeTransition, setActiveTransition] = useState<Transition>(TRANSITIONS[0]);
  const [transitionDuration] = useState(0.5);
  const [transitionPhase, setTransitionPhase] = useState(0); // 0-1
  const [transitionMode, setTransitionMode] = useState<"in" | "out" | "none">("none");

  /* ── Text overlays + Keyframes ── */
  const [textOverlays, setTextOverlays] = useState<TextOverlay[]>([]);
  const [selectedOverlayId, setSelectedOverlayId] = useState<string | null>(null);
  const [newText, setNewText] = useState("Your Text");
  const [textColor, setTextColor] = useState("#ffd700");
  const [textFont, setTextFont] = useState(FONT_OPTIONS[0]);
  const [textSize, setTextSize] = useState(32);
  const [textBold, setTextBold] = useState(true);
  const [textItalic, setTextItalic] = useState(false);
  const [textShadow, setTextShadow] = useState(true);

  /* ── Auto-Captions ── */
  const [captionActive, setCaptionActive] = useState(false);
  const [captionSupported, setCaptionSupported] = useState(false);
  const [captionLines, setCaptionLines] = useState<{ id: string; text: string; time: number }[]>([]);
  const [liveCaption, setLiveCaption] = useState("");

  /* ── Music Library ── */
  const [musicQuery, setMusicQuery] = useState("");
  const [activeMusicTrack, setActiveMusicTrack] = useState<SearchTrack | null>(null);
  const [musicVolume, setMusicVolume] = useState(0.5);
  const [searchTracks, setSearchTracks] = useState<SearchTrack[]>([]);
  const [trendingTracks, setTrendingTracks] = useState<SearchTrack[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchError, setSearchError] = useState("");
  const [musicTab, setMusicTab] = useState<"trending" | "search" | "url">("trending");
  const [customURL, setCustomURL] = useState("");
  const [pixabayKey, setPixabayKey] = useState(() => localStorage.getItem("pxb_key") ?? "");
  const [showPixabayInput, setShowPixabayInput] = useState(false);
  const volumeDisplayRef = useRef<HTMLSpanElement | null>(null);
  const bgAudioElementRef = useRef<HTMLAudioElement | null>(null);
  const bgMusicSourceRef = useRef<MediaElementAudioSourceNode | null>(null);
  const bgMusicGainRef = useRef<GainNode | null>(null);
  const searchDebounceRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  /* ── Export ── */
  const [exportPreset, setExportPreset] = useState(EXPORT_PRESETS[1]); // default 1080p
  const [exporting, setExporting] = useState(false);
  const exportCountRef = useRef(0);
  const [exportProgress, setExportProgress] = useState(0);
  const [exportStage, setExportStage] = useState("Capturing…");
  const [exportDone, setExportDone] = useState(false);
  const [exportURL, setExportURL] = useState<string | null>(null);
  const [exportFormat, setExportFormat] = useState<"mp4" | "webm">("mp4");

  /* ── Next Level Filters ── */
  const [activeNextFilter, setActiveNextFilter] = useState<NextFilter | null>(null);

  /* ── Blue Neon Glow ── */
  const [neonEnabled, setNeonEnabled] = useState(false);
  const [neonIntensity, setNeonIntensity] = useState(65);
  const [neonColor, setNeonColor] = useState("#00d4ff");

  /* ── Multi-Clone Layering ── */
  const [clones, setClones] = useState<CloneSlot[]>([]);

  /* ── Outfit & Hair ── */
  const [outfitEnabled, setOutfitEnabled] = useState(false);
  const [dressEnabled, setDressEnabled] = useState(false);
  const [dressColor, setDressColor] = useState("#1e40af");
  const [dressIntensity, setDressIntensity] = useState(65);
  const [hairEnabled, setHairEnabled] = useState(false);
  const [hairColor, setHairColor] = useState("#111827");
  const [hairIntensity, setHairIntensity] = useState(60);
  const outfitCanvasRef = useRef<HTMLCanvasElement>(null);

  /* ── BG Swap ── */
  const [bgSwapEnabled, setBgSwapEnabled] = useState(false);
  const [bgSwapState, setBgSwapState] = useState<BgSwapState>({
    bgId: "city", blendOpacity: 0.85,
    segEnabled: true, autoColorEnabled: true, autoColorIntensity: 0.7,
  });
  const bgSwapCanvasRef = useRef<HTMLCanvasElement>(null);
  const maskCanvasRef   = useRef<HTMLCanvasElement | null>(null);
  const [showLockModal, setShowLockModal] = useState(false);
  const [segStatus, setSegStatus] = useState<"idle" | "loading" | "ready" | "failed">("idle");
  const segActiveRef = useRef(false); // true when segmentation produced frames (use full composite)

  /* ── Picture-in-Picture overlay ── */
  const [pipVideoURL, setPipVideoURL] = useState<string | null>(null);
  const [pipState, setPipState] = useState<PipState>({ x: 60, y: 5, w: 34, opacity: 0.92 });
  const pipVideoRef = useRef<HTMLVideoElement>(null);
  const pipFileInputRef = useRef<HTMLInputElement>(null);

  /* ── Glow & Aura ── */
  const [glowColor, setGlowColor] = useState("#ffd700");
  const [glowIntensity, setGlowIntensity] = useState(0);
  const [glowPulse, setGlowPulse] = useState(false);
  const glowPulseRef = useRef(false);
  const glowPulseAnimRef = useRef<number>(0);
  const glowElRef = useRef<HTMLDivElement | null>(null);

  /* ── UI ── */
  const [activePanel, setActivePanel] = useState<Panel>("none");
  const [isDragging, setIsDragging] = useState(false);

  /* ── Check SpeechRecognition support ── */
  useEffect(() => {
    setCaptionSupported(!!(window.SpeechRecognition || window.webkitSpeechRecognition));
  }, []);

  /* ── File upload ── */
  const handleFile = useCallback((file: File) => {
    if (!file.type.startsWith("video/")) return;
    const url = URL.createObjectURL(file);
    setVideoURL(url);
    setCurrentTime(0);
    setTrimStart(0);
    setIsPlaying(false);
    setTextOverlays([]);
    setCaptionLines([]);
    setLiveCaption("");
    setExportDone(false);
    setExportURL(null);
    setWaveformData(new Uint8Array(0));
    audioCtxRef.current?.close();
    audioCtxRef.current = null;
    analyserRef.current = null;
    exportDestRef.current = null;
  }, []);

  /* ── Audio graph setup ── */
  const onLoadedMetadata = useCallback(async () => {
    const video = videoRef.current;
    if (!video) return;
    setDuration(video.duration);
    setTrimEnd(video.duration);
    video.volume = volume;
    video.playbackRate = playbackRate;

    if (!audioCtxRef.current) {
      const ctx = new AudioContext();
      const src = ctx.createMediaElementSource(video);
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 256;
      const exportDest = ctx.createMediaStreamDestination();
      src.connect(analyser);
      analyser.connect(ctx.destination);
      src.connect(exportDest);
      audioCtxRef.current = ctx;
      analyserRef.current = analyser;
      exportDestRef.current = exportDest;
    }

    // Generate waveform — deferred so it never blocks playback/UI
    setTimeout(async () => {
      try {
        const res = await fetch(videoURL!);
        const ab = await res.arrayBuffer();
        const offCtx = new OfflineAudioContext(1, 44100 * Math.min(video.duration, 60), 44100);
        const buf = await offCtx.decodeAudioData(ab);
        const data = buf.getChannelData(0);
        const samples = 200;
        const block = Math.floor(data.length / samples);
        const out = new Uint8Array(samples);
        for (let i = 0; i < samples; i++) {
          let s = 0;
          for (let j = 0; j < block; j++) s += Math.abs(data[i * block + j] ?? 0);
          out[i] = Math.min(255, Math.round((s / block) * 512));
        }
        setWaveformData(out);
      } catch { /* audio decode failed, silent */ }
    }, 500);
  }, [volume, playbackRate, videoURL]);

  /* ── Playback sync — throttled to 60ms to keep UI responsive ── */
  const onTimeUpdate = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;
    const t = video.currentTime;

    // Loop at trim end — also stop bg music so it stays perfectly in sync
    if (t >= trimEnd) {
      const doStop = () => {
        video.pause();
        video.currentTime = trimStart;
        setIsPlaying(false);
        /* ── Auto-Audio Sync: pause background music at exact trim-end point ── */
        if (bgAudioElementRef.current && !bgAudioElementRef.current.paused) {
          bgAudioElementRef.current.pause();
        }
      };
      if (playPromiseRef.current) {
        playPromiseRef.current.then(doStop).catch(() => {});
        playPromiseRef.current = null;
      } else { doStop(); }
      return;
    }

    // Throttle React state updates to ~16fps max
    const now = performance.now();
    if (now - lastTimeUpdateRef.current < 60) return;
    lastTimeUpdateRef.current = now;

    setCurrentTime(t);

    // Transition detection
    const clipDur = trimEnd - trimStart;
    const td = Math.min(transitionDuration, clipDur / 3);
    const relT = t - trimStart;
    if (relT < td) {
      setTransitionMode("in");
      setTransitionPhase(relT / td);
    } else if (relT > clipDur - td) {
      setTransitionMode("out");
      setTransitionPhase((relT - (clipDur - td)) / td);
    } else {
      setTransitionMode("none");
      setTransitionPhase(0);
    }
  }, [trimEnd, trimStart, transitionDuration]);

  const onPlay = useCallback(() => { setIsPlaying(true); audioCtxRef.current?.resume(); }, []);
  const onPause = useCallback(() => setIsPlaying(false), []);
  const onEnded = useCallback(() => setIsPlaying(false), []);

  /* ── Safe pause — always awaits the pending play() promise first ── */
  const safePause = useCallback((video: HTMLVideoElement) => {
    if (playPromiseRef.current) {
      playPromiseRef.current
        .then(() => { video.pause(); })
        .catch(() => {});
      playPromiseRef.current = null;
    } else {
      video.pause();
    }
  }, []);

  /* ── Controls ── */
  const togglePlay = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;
    if (video.paused) {
      if (video.currentTime >= trimEnd || video.currentTime < trimStart) video.currentTime = trimStart;
      playPromiseRef.current = video.play().catch((err) => {
        if (err.name !== "AbortError") console.warn("play() error:", err);
      });
      /* ── Auto-Audio Sync: resume bg music whenever video starts playing ── */
      if (bgAudioElementRef.current?.paused) {
        bgAudioElementRef.current.play().catch(() => {});
      }
    } else {
      safePause(video);
      if (bgAudioElementRef.current && !bgAudioElementRef.current.paused) {
        bgAudioElementRef.current.pause();
      }
    }
  }, [trimStart, trimEnd, safePause]);

  const seekTo = useCallback((t: number) => {
    const video = videoRef.current;
    if (!video) return;
    const clamped = Math.max(trimStart, Math.min(trimEnd, t));
    video.currentTime = clamped;
    setCurrentTime(clamped);
  }, [trimStart, trimEnd]);

  // Apply volume directly to video without triggering re-render on each drag tick
  const applyVolume = useCallback((v: number) => {
    volumeRef.current = v;
    const video = videoRef.current;
    if (!video) return;
    video.volume = v;
    video.muted = v === 0;
    // Update display label directly in DOM (no React re-render needed)
    if (volumeDisplayRef.current) {
      volumeDisplayRef.current.textContent = `${Math.round(v * 100)}%`;
    }
  }, []);

  // Sync ref → React state only when drag ends (pointerUp on slider)
  const handleVolume = useCallback((v: number) => {
    applyVolume(v);
    setVolume(v);
    if (v === 0) setIsMuted(true);
    else if (isMuted) setIsMuted(false);
  }, [applyVolume, isMuted]);

  const toggleMute = useCallback(() => {
    const m = !isMuted;
    setIsMuted(m);
    if (videoRef.current) videoRef.current.muted = m;
  }, [isMuted]);

  const handleSpeed = useCallback((r: number) => {
    setPlaybackRate(r);
    if (videoRef.current) videoRef.current.playbackRate = r;
  }, []);

  /* ── Trim drag ── */
  const startTrimDrag = useCallback((side: "start" | "end", e: React.PointerEvent) => {
    e.stopPropagation(); e.preventDefault();
    trimDragRef.current = { side, startX: e.clientX, startVal: side === "start" ? trimStart : trimEnd };
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  }, [trimStart, trimEnd]);

  const onTrimMove = useCallback((e: React.PointerEvent) => {
    if (!trimDragRef.current) return;
    const rect = timelineRef.current?.getBoundingClientRect();
    if (!rect || duration === 0) return;
    const dx = e.clientX - trimDragRef.current.startX;
    const delta = (dx / rect.width) * duration;
    const v = trimDragRef.current.startVal + delta;
    if (trimDragRef.current.side === "start") {
      const c = Math.max(0, Math.min(v, trimEnd - 0.5));
      setTrimStart(c);
      if (videoRef.current) videoRef.current.currentTime = c;
    } else {
      setTrimEnd(Math.min(duration, Math.max(v, trimStart + 0.5)));
    }
  }, [duration, trimStart, trimEnd]);

  /* ── Text overlay drag ── */
  const startTextDrag = useCallback((e: RPointerEvent<HTMLDivElement>, id: string) => {
    e.stopPropagation();
    textDragRef.current = { id, startX: e.clientX, startY: e.clientY };
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  }, []);

  const onTextMove = useCallback((e: RPointerEvent<HTMLDivElement>) => {
    const d = textDragRef.current;
    if (!d) return;
    const wrap = videoWrapRef.current;
    if (!wrap) return;
    const rect = wrap.getBoundingClientRect();
    const nx = ((e.clientX - rect.left) / rect.width) * 100;
    const ny = ((e.clientY - rect.top) / rect.height) * 100;
    setTextOverlays((prev) =>
      prev.map((t) => t.id === d.id ? { ...t, x: Math.max(0, Math.min(93, nx)), y: Math.max(0, Math.min(93, ny)) } : t)
    );
  }, []);

  const addTextOverlay = useCallback(() => {
    const overlay: TextOverlay = {
      id: Date.now().toString(),
      text: newText,
      x: 10, y: 10,
      fontSize: textSize,
      color: textColor,
      fontFamily: textFont.style,
      bold: textBold, italic: textItalic, shadow: textShadow,
      keyframes: [],
      startTime: currentTime,
      endTime: -1,
    };
    setTextOverlays((prev) => [...prev, overlay]);
    setSelectedOverlayId(overlay.id);
  }, [newText, textSize, textColor, textFont, textBold, textItalic, textShadow, currentTime]);

  /* ── Keyframe add ── */
  const addKeyframe = useCallback(() => {
    if (!selectedOverlayId) return;
    setTextOverlays((prev) => prev.map((t) => {
      if (t.id !== selectedOverlayId) return t;
      const newKf = {
        time: currentTime,
        x: t.x, y: t.y,
        opacity: 1, scale: 1, rotation: 0,
      };
      const existing = t.keyframes.filter((k) => Math.abs(k.time - currentTime) > 0.05);
      return { ...t, keyframes: [...existing, newKf].sort((a, b) => a.time - b.time) };
    }));
  }, [selectedOverlayId, currentTime]);

  /* ── Keyframe interpolation per frame ── */
  const animatedOverlays = useMemo(() => {
    return textOverlays.map((t) => {
      const kf = t.keyframes.length >= 2 ? lerpKeyframe(t.keyframes, currentTime) : null;
      const visible = t.endTime === -1 || (currentTime >= t.startTime && currentTime <= t.endTime);
      return { ...t, _kf: kf, _visible: visible };
    });
  }, [textOverlays, currentTime]);

  /* ── Auto Captions (SpeechRecognition) ── */
  const toggleCaptions = useCallback(() => {
    if (captionActiveRef.current) {
      captionActiveRef.current = false;
      recogRef.current?.stop();
      recogRef.current = null;
      setCaptionActive(false);
      setLiveCaption("");
      return;
    }
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) return;

    captionActiveRef.current = true;
    setCaptionActive(true);

    const startRecognition = () => {
      if (!captionActiveRef.current) return;
      const r = new SR!();
      r.continuous = true;
      r.interimResults = true;
      r.lang = "en-US";

      r.onresult = (e: SpeechRecognitionEvent) => {
        const t = videoRef.current?.currentTime ?? 0;
        let interim = "";
        for (let i = e.resultIndex; i < e.results.length; i++) {
          const text = e.results[i][0].transcript;
          if (e.results[i].isFinal && text.trim()) {
            const id = `cap-${Date.now()}`;
            const enriched = enrichCaptionWithEmoji(text.trim());
            setCaptionLines((prev) => [...prev.slice(-20), { id, text: enriched, time: t }]);
            // Keep at most 8 caption overlays to prevent re-render lag
            setTextOverlays((prev) => {
              const capOverlays = prev.filter((o) => o.id.startsWith("cap-"));
              const nonCap = prev.filter((o) => !o.id.startsWith("cap-"));
              const newCap = { id, text: enriched, x: 5, y: 82, fontSize: 22, color: "#ffffff", fontFamily: "Inter, sans-serif", bold: true, italic: false, shadow: true, keyframes: [], startTime: t, endTime: t + 3 };
              return [...nonCap, ...capOverlays.slice(-7), newCap];
            });
            setLiveCaption("");
          } else { interim += text; }
        }
        if (interim) setLiveCaption(interim);
      };

      r.onerror = (ev: Event) => {
        // Don't stop on network/no-speech errors, only on fatal ones
        const err = (ev as SpeechRecognitionErrorEvent).error;
        if (err === "not-allowed" || err === "service-not-allowed") {
          captionActiveRef.current = false;
          setCaptionActive(false);
        }
      };

      // Auto-restart using captionActiveRef so closure is always current
      r.onend = () => { if (captionActiveRef.current) startRecognition(); };

      r.start();
      recogRef.current = r;
    };

    startRecognition();
  }, []);

  /* ── Music: run search (iTunes or Pixabay) ── */
  const runSearch = useCallback(async (query: string) => {
    if (!query.trim()) return;
    setSearchLoading(true);
    setSearchError("");
    try {
      const results = pixabayKey
        ? await searchPixabay(query, pixabayKey)
        : await searchItunes(query);
      setSearchTracks(results);
      if (results.length === 0) setSearchError("No results found. Try a different keyword.");
    } catch {
      setSearchError("Search failed. Check your connection and try again.");
    } finally {
      setSearchLoading(false);
    }
  }, [pixabayKey]);

  // Load trending on mount / when tab opens
  useEffect(() => {
    if (trendingTracks.length > 0) return;
    searchItunes(RANDOM_TRENDING)
      .then(setTrendingTracks)
      .catch(() => { /* silent */ });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Debounced search as user types — also instant-filters trending locally
  const handleMusicQuery = useCallback((q: string) => {
    setMusicQuery(q);
    clearTimeout(searchDebounceRef.current);
    if (!q.trim()) {
      // Empty query: go back to trending, clear search results
      setMusicTab("trending");
      setSearchTracks([]);
      setSearchError("");
      return;
    }
    // Show filtered trending tracks immediately in search tab (local filter)
    const lq = q.toLowerCase();
    const localHits = trendingTracks.filter(
      (t) => t.title.toLowerCase().includes(lq) || t.artist.toLowerCase().includes(lq) || (t.tags ?? "").toLowerCase().includes(lq)
    );
    setSearchTracks(localHits);
    setMusicTab("search");
    setSearchError("");
    // Then fetch from API after debounce
    searchDebounceRef.current = setTimeout(() => runSearch(q), 600);
  }, [runSearch, trendingTracks]);

  /* ── Music: select a track as background ── */
  const selectTrack = useCallback((track: SearchTrack) => {
    // Tear down previous music
    if (bgAudioElementRef.current) {
      bgAudioElementRef.current.pause();
      bgMusicSourceRef.current?.disconnect();
      bgMusicGainRef.current?.disconnect();
      bgMusicSourceRef.current = null;
      bgMusicGainRef.current = null;
      bgAudioElementRef.current.src = "";
      bgAudioElementRef.current = null;
    }
    if (!track.previewUrl) return;

    const audio = new Audio();
    audio.crossOrigin = "anonymous";  // required for Web Audio routing
    audio.src = track.previewUrl;
    audio.loop = true;
    bgAudioElementRef.current = audio;
    setActiveMusicTrack(track);

    // Route through the shared AudioContext so music is captured in export
    if (audioCtxRef.current) {
      try {
        const src = audioCtxRef.current.createMediaElementSource(audio);
        const gain = audioCtxRef.current.createGain();
        gain.gain.value = musicVolume;
        src.connect(gain);
        gain.connect(audioCtxRef.current.destination);
        // Also connect to export destination so WebM export captures music
        if (exportDestRef.current) gain.connect(exportDestRef.current);
        bgMusicSourceRef.current = src;
        bgMusicGainRef.current = gain;
      } catch {
        // AudioContext routing failed — fall back to direct volume control
        audio.volume = musicVolume;
      }
    } else {
      audio.volume = musicVolume;
    }

    // Start if video is playing
    if (videoRef.current && !videoRef.current.paused) {
      audio.play().catch(() => { /* autoplay blocked */ });
    }
  }, [musicVolume]);  // eslint-disable-line react-hooks/exhaustive-deps

  const addCustomURL = useCallback(() => {
    const url = customURL.trim();
    if (!url) return;
    const track: SearchTrack = {
      id: `custom-${Date.now()}`,
      title: url.split("/").pop()?.split("?")[0] ?? "Custom Track",
      artist: "Custom",
      duration: 0,
      previewUrl: url,
      artworkUrl: "",
      source: "custom",
    };
    selectTrack(track);
    setCustomURL("");
  }, [customURL, selectTrack]);

  const stopMusic = useCallback(() => {
    if (bgAudioElementRef.current) {
      bgAudioElementRef.current.pause();
      bgMusicSourceRef.current?.disconnect();
      bgMusicGainRef.current?.disconnect();
      bgMusicSourceRef.current = null;
      bgMusicGainRef.current = null;
      bgAudioElementRef.current.src = "";
      bgAudioElementRef.current = null;
    }
    setActiveMusicTrack(null);
  }, []);

  // Sync background audio with video play/pause
  useEffect(() => {
    const audio = bgAudioElementRef.current;
    if (!audio) return;
    if (isPlaying) audio.play().catch(() => { /* blocked */ });
    else audio.pause();
  }, [isPlaying]);

  // Update background music volume (gain node takes priority for exported audio)
  useEffect(() => {
    if (bgMusicGainRef.current && audioCtxRef.current) {
      bgMusicGainRef.current.gain.setTargetAtTime(musicVolume, audioCtxRef.current.currentTime, 0.05);
    } else if (bgAudioElementRef.current) {
      bgAudioElementRef.current.volume = musicVolume;
    }
  }, [musicVolume]);

  // Glow pulse animation — drives the glow overlay via direct DOM writes (no re-renders)
  useEffect(() => {
    glowPulseRef.current = glowPulse;
    cancelAnimationFrame(glowPulseAnimRef.current);
    if (!glowPulse || glowIntensity === 0) return;
    let t = 0;
    const loop = () => {
      t += 0.05;
      const m = 1 + 0.55 * Math.sin(t);
      const px = glowIntensity * m;
      if (glowElRef.current) {
        glowElRef.current.style.boxShadow = `inset 0 0 ${px * 2.5}px ${px}px ${glowColor}99`;
      }
      glowPulseAnimRef.current = requestAnimationFrame(loop);
    };
    glowPulseAnimRef.current = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(glowPulseAnimRef.current);
  }, [glowPulse, glowColor, glowIntensity]);

  /* ── Transition overlay style ── */
  const transitionOverlayStyle = useMemo((): React.CSSProperties => {
    if (activeTransition.id === "none" || transitionMode === "none") return { display: "none" };
    const p = transitionMode === "in" ? 1 - transitionPhase : transitionPhase;
    const base: React.CSSProperties = { position: "absolute", inset: 0, zIndex: 15, pointerEvents: "none" };
    switch (activeTransition.id) {
      case "fade":
        return { ...base, background: "black", opacity: p };
      case "flash":
        return { ...base, background: "white", opacity: p };
      case "dissolve":
        return { ...base, background: "black", opacity: p * 0.6, backdropFilter: `blur(${p * 4}px)` };
      case "blur":
        return { ...base, backdropFilter: `blur(${p * 12}px)`, background: "transparent" };
      case "zoom": {
        const s = transitionMode === "in" ? 1 + (1 - transitionPhase) * 0.3 : 1 + transitionPhase * 0.3;
        return { ...base, transform: `scale(${s})`, opacity: p * 0.3 + 0.01, background: "black" };
      }
      case "slide": {
        const tx = transitionMode === "in" ? (1 - transitionPhase) * 100 : -(transitionPhase * 100);
        return { ...base, transform: `translateX(${tx}%)`, background: "#111" };
      }
      case "glitch":
        return { ...base, display: "none" }; // handled by GlitchOverlay
      default:
        return { display: "none" };
    }
  }, [activeTransition, transitionMode, transitionPhase]);

  /* ── Export MP4 (VideoEncoder) ── */
  const exportVideo = useCallback(async () => {
    const video = videoRef.current;
    if (!video || !videoURL) return;
    setExporting(true); setExportProgress(0); setExportDone(false); setExportStage("Capturing…");

    const { width, height, bitrate } = exportPreset;
    const clipDur = trimEnd - trimStart;

    // Try VideoEncoder + mp4-muxer for MP4
    const canDoMP4 = exportFormat === "mp4" && typeof (window as typeof window & { VideoEncoder?: unknown }).VideoEncoder !== "undefined";

    const canvas = document.createElement("canvas");
    canvas.width = width; canvas.height = height;
    const ctx = canvas.getContext("2d")!;

    // Determine effective CSS filter (base filter + next-level filter)
    const effectiveCss = activeNextFilter?.css
      ? activeNextFilter.css
      : (activeFilter.css === "none" ? "none" : activeFilter.css);

    const drawFrameToCanvas = () => {
      /* ── BG Swap: full composite mode (seg active) — skip video drawing ── */
      let bgSwapFullComposite = false;
      if (bgSwapEnabled && bgSwapCanvasRef.current) {
        ctx.globalCompositeOperation = "source-over";
        ctx.globalAlpha = 1;
        ctx.filter = "none";
        ctx.drawImage(bgSwapCanvasRef.current, 0, 0, width, height);
        if (segActiveRef.current) {
          bgSwapFullComposite = true;
          /* Video is already in the bg swap composite — jump to overlay layers */
        }
      }

      /* ── Video drawing (skipped entirely when bgSwap has full composite) ── */
      if (!bgSwapFullComposite) {
        if (bgSwapEnabled) {
          /* Seg not ready yet — blend video over bg manually */
          ctx.globalCompositeOperation = "source-over";
          ctx.filter = effectiveCss === "none" ? "none" : effectiveCss;
          ctx.globalAlpha = bgSwapState.blendOpacity;
          ctx.drawImage(video, 0, 0, width, height);
          ctx.globalAlpha = 1;
          ctx.filter = "none";
        } else {
          ctx.filter = effectiveCss === "none" ? "none" : effectiveCss;
          ctx.drawImage(video, 0, 0, width, height);
          ctx.filter = "none";
        }
      }

      // ── Canvas post-effects (Next Level filters) ──
      if (activeNextFilter) {
        // Color blend overlay
        if (activeNextFilter.blendColor) {
          ctx.globalCompositeOperation = "screen";
          ctx.fillStyle = activeNextFilter.blendColor;
          ctx.fillRect(0, 0, width, height);
          ctx.globalCompositeOperation = "source-over";
        }
        // Inset glow (vignette-like radial)
        if (activeNextFilter.glowColor && (activeNextFilter.glowPx ?? 0) > 0) {
          const px = activeNextFilter.glowPx! * (width / 640);
          const grad = ctx.createRadialGradient(width / 2, height / 2, Math.min(width, height) * 0.3, width / 2, height / 2, Math.max(width, height) * 0.75);
          grad.addColorStop(0, "transparent");
          grad.addColorStop(1, activeNextFilter.glowColor + "66");
          ctx.globalCompositeOperation = "screen";
          ctx.fillStyle = grad;
          ctx.fillRect(0, 0, width, height);
          ctx.globalCompositeOperation = "source-over";
          void px; // used as scaling hint
        }
        // RGB Split (Cyberpunk) — GPU-accelerated: 2 composited drawImage passes
        if (activeNextFilter.canvasMode === "rgb-split") {
          const shift = Math.max(4, Math.floor(width * 0.008));
          ctx.globalCompositeOperation = "screen";
          ctx.globalAlpha = 0.55;
          ctx.filter = "saturate(500%) hue-rotate(-50deg) brightness(0.75)";
          ctx.drawImage(video, shift, 0, width, height);   // R channel shifted right
          ctx.filter = "saturate(500%) hue-rotate(200deg) brightness(0.75)";
          ctx.drawImage(video, -shift, 0, width, height);  // B channel shifted left
          ctx.filter = "none";
          ctx.globalCompositeOperation = "source-over";
          ctx.globalAlpha = 1;
        }
        // VHS scanlines
        if (activeNextFilter.canvasMode === "vhs" || activeNextFilter.canvasMode === "scanlines") {
          ctx.globalAlpha = 0.18;
          ctx.fillStyle = "#000000";
          for (let y = 0; y < height; y += 3) {
            ctx.fillRect(0, y, width, 1);
          }
          ctx.globalAlpha = 1;
        }
        // Neon bloom (bright edges glow)
        if (activeNextFilter.canvasMode === "neon-bloom") {
          ctx.globalCompositeOperation = "screen";
          ctx.globalAlpha = 0.22;
          ctx.filter = "blur(6px) brightness(2)";
          ctx.drawImage(canvas, 0, 0);
          ctx.filter = "none";
          ctx.globalAlpha = 1;
          ctx.globalCompositeOperation = "source-over";
        }
      }

      // ── Custom glow overlay on canvas export ──
      if (glowIntensity > 0) {
        const px = glowIntensity * (width / 640);
        const gr = ctx.createRadialGradient(width / 2, height / 2, Math.min(width, height) * 0.25, width / 2, height / 2, Math.max(width, height) * 0.8);
        gr.addColorStop(0, "transparent");
        gr.addColorStop(1, glowColor + "88");
        ctx.globalCompositeOperation = "screen";
        ctx.fillStyle = gr;
        ctx.fillRect(0, 0, width, height);
        ctx.globalCompositeOperation = "source-over";
        void px;
      }

      // ── Picture-in-Picture overlay (baked into export) ──
      if (pipVideoRef.current && pipVideoURL && pipState.x >= 0) {
        const pip = pipVideoRef.current;
        const px = (pipState.x / 100) * width;
        const py = (pipState.y / 100) * height;
        const pw = (pipState.w / 100) * width;
        const ph = pw * (9 / 16);
        ctx.save();
        ctx.globalAlpha = pipState.opacity;
        ctx.drawImage(pip, px, py, pw, ph);
        /* gold border around PiP */
        ctx.globalAlpha = pipState.opacity * 0.8;
        ctx.strokeStyle = "#ffd700";
        ctx.lineWidth = Math.max(1.5, Math.round(width * 0.003));
        ctx.strokeRect(px, py, pw, ph);
        ctx.restore();
      }

      // ── Outfit color overlay (bake into export canvas) ──
      if (outfitEnabled && outfitCanvasRef.current) {
        ctx.globalCompositeOperation = "source-over";
        ctx.drawImage(outfitCanvasRef.current, 0, 0, width, height);
      }

      // ── Clone (Multi-Character) layers ──
      if (clones.length > 0) {
        clones.forEach((slot) => {
          const { x, y, w: cw, h: ch } = getCloneRect(slot, width, height);
          ctx.save();
          ctx.globalAlpha = slot.opacity;
          if (slot.mirror) {
            ctx.translate(x + cw, y);
            ctx.scale(-1, 1);
            ctx.drawImage(video, 0, 0, cw, ch);
          } else {
            ctx.drawImage(video, x, y, cw, ch);
          }
          /* thin gold border around each clone */
          ctx.globalAlpha = slot.opacity * 0.7;
          ctx.strokeStyle = "#ffd700";
          ctx.lineWidth = Math.max(1, Math.round(width * 0.003));
          if (slot.mirror) {
            ctx.strokeRect(0, 0, cw, ch);
          } else {
            ctx.strokeRect(x, y, cw, ch);
          }
          ctx.restore();
        });
      }

      // Draw text overlays
      const wrapRect = videoWrapRef.current?.getBoundingClientRect() ?? { width: 640, height: 360 };
      const scaleX = width / wrapRect.width;
      const scaleY = height / wrapRect.height;
      textOverlays.forEach((t) => {
        const kf = t.keyframes.length >= 2 ? lerpKeyframe(t.keyframes, video.currentTime) : null;
        const x = ((kf?.x ?? t.x) / 100) * width;
        const y = ((kf?.y ?? t.y) / 100) * height;
        const sc = kf?.scale ?? 1;
        const op = kf?.opacity ?? 1;
        const rot = ((kf?.rotation ?? 0) * Math.PI) / 180;
        ctx.save();
        ctx.globalAlpha = op;
        ctx.translate(x, y);
        ctx.rotate(rot);
        ctx.scale(sc, sc);
        ctx.font = `${t.italic ? "italic " : ""}${t.bold ? "bold " : ""}${t.fontSize * Math.min(scaleX, scaleY)}px ${t.fontFamily}`;
        ctx.fillStyle = t.color;
        if (t.shadow) { ctx.shadowColor = "rgba(0,0,0,0.85)"; ctx.shadowBlur = 10; ctx.shadowOffsetX = 2; ctx.shadowOffsetY = 2; }
        ctx.fillText(t.text, 0, 0);
        ctx.restore();
        ctx.shadowColor = "transparent"; ctx.shadowBlur = 0;
      });
    };

    if (canDoMP4) {
      try {
        const { Muxer, ArrayBufferTarget } = await import("mp4-muxer") as {
          Muxer: typeof MuxerType;
          ArrayBufferTarget: typeof ArrayBufferTargetType;
        };
        const target = new ArrayBufferTarget();
        const muxer = new Muxer({
          target,
          video: { codec: "avc", width, height },
          audio: { codec: "aac", sampleRate: 48000, numberOfChannels: 2 },
          fastStart: "in-memory",
          firstTimestampBehavior: "offset",
        } as ConstructorParameters<typeof MuxerType>[0]);

        const videoEncoder = new (window as typeof window & { VideoEncoder: typeof VideoEncoder }).VideoEncoder({
          output: (chunk: EncodedVideoChunk, meta?: EncodedVideoChunkMetadata) => muxer.addVideoChunk(chunk, meta ?? null),
          error: (e: Error) => console.error("VideoEncoder error:", e),
        });
        videoEncoder.configure({ codec: "avc1.4d0034", width, height, bitrate, framerate: 30 });

        // Encode audio
        let audioEncoded = false;
        try {
          const audioEncoder = new AudioEncoder({
            output: (chunk, meta) => muxer.addAudioChunk(chunk, meta ?? null),
            error: console.error,
          });
          audioEncoder.configure({ codec: "mp4a.40.2", sampleRate: 48000, numberOfChannels: 2, bitrate: 128_000 });
          const res = await fetch(videoURL);
          const ab = await res.arrayBuffer();
          const tmpCtx = new OfflineAudioContext(2, 48000 * Math.ceil(clipDur + 1), 48000);
          const buf = await tmpCtx.decodeAudioData(ab);
          const startSample = Math.floor(trimStart * buf.sampleRate);
          const endSample = Math.min(buf.length, Math.floor(trimEnd * buf.sampleRate));
          const chunkSz = 4096;
          for (let i = startSample; i < endSample; i += chunkSz) {
            const actual = Math.min(chunkSz, endSample - i);
            const totalBytes = 2 * actual * 4;
            const ab2 = new ArrayBuffer(totalBytes);
            for (let ch = 0; ch < Math.min(buf.numberOfChannels, 2); ch++) {
              const src = buf.getChannelData(ch);
              const dst = new Float32Array(ab2, ch * actual * 4, actual);
              dst.set(src.subarray(i, i + actual));
            }
            const ts = Math.round(((i - startSample) / buf.sampleRate) * 1_000_000);
            const audioData = new AudioData({ format: "f32-planar", sampleRate: buf.sampleRate, numberOfFrames: actual, numberOfChannels: Math.min(buf.numberOfChannels, 2), timestamp: ts, data: ab2 });
            audioEncoder.encode(audioData);
            audioData.close();
          }
          await audioEncoder.flush();
          audioEncoded = true;
        } catch { /* audio encode failed, skip */ }

        // Encode video frames
        let frameIndex = 0;
        await new Promise<void>((resolve) => {
          video.currentTime = trimStart;
          playPromiseRef.current = video.play().catch(() => {});
          const fps = 30;
          const frameDur = 1_000_000 / fps;

          const captureFrame = () => {
            if (video.currentTime >= trimEnd || video.ended) {
              video.pause();
              resolve();
              return;
            }
            drawFrameToCanvas();
            const ts = Math.round((video.currentTime - trimStart) * 1_000_000);
            const frame = new VideoFrame(canvas, { timestamp: ts, duration: frameDur });
            videoEncoder.encode(frame, { keyFrame: frameIndex % 30 === 0 });
            frame.close();
            frameIndex++;
            setExportProgress(Math.min(99, Math.round(((video.currentTime - trimStart) / clipDur) * 100)));
            requestAnimationFrame(captureFrame);
          };
          captureFrame();
        });

        setExportStage("Encoding final frames…");
        await videoEncoder.flush();
        setExportStage("Muxing…");
        muxer.finalize();
        const buffer = (target as ArrayBufferTargetType & { buffer: ArrayBuffer }).buffer;
        const blob = new Blob([buffer], { type: "video/mp4" });
        const url = URL.createObjectURL(blob);
        setExportStage("Done");
        setExportURL(url); setExportDone(true); setExportProgress(100); setExporting(false);
        return;
      } catch (err) {
        console.warn("MP4 encode failed, falling back to WebM:", err);
      }
    }

    // WebM fallback via MediaRecorder
    const canvasStream = canvas.captureStream(30);
    const tracks = [...canvasStream.getTracks()];
    if (exportDestRef.current) exportDestRef.current.stream.getAudioTracks().forEach((t) => tracks.push(t));
    const stream = new MediaStream(tracks);
    const mimeType = MediaRecorder.isTypeSupported("video/webm;codecs=vp9") ? "video/webm;codecs=vp9" : "video/webm";
    const recorder = new MediaRecorder(stream, { mimeType });
    const chunks: Blob[] = [];
    recorder.ondataavailable = (e) => { if (e.data.size > 0) chunks.push(e.data); };
    recorder.onstop = () => {
      const blob = new Blob(chunks, { type: mimeType });
      setExportURL(URL.createObjectURL(blob));
      setExporting(false); setExportDone(true); setExportProgress(100);
    };

    recorder.start(100);
    video.currentTime = trimStart;
    await video.play();
    video.playbackRate = playbackRate;

    const tick = () => {
      if (video.currentTime >= trimEnd || video.ended) { recorder.stop(); video.pause(); video.currentTime = trimStart; return; }
      drawFrameToCanvas();
      setExportProgress(Math.min(99, Math.round(((video.currentTime - trimStart) / clipDur) * 100)));
      requestAnimationFrame(tick);
    };
    tick();
  }, [videoURL, activeFilter, activeNextFilter, glowColor, glowIntensity, trimStart, trimEnd, textOverlays, playbackRate, exportPreset, exportFormat]);

  const downloadExport = useCallback(() => {
    if (!exportURL) return;
    const a = document.createElement("a");
    a.href = exportURL;
    const ext = exportURL.includes("mp4") || exportFormat === "mp4" ? "mp4" : "webm";
    a.download = `salman-edit-z-${exportPreset.id}-${Date.now()}.${ext}`;
    a.click();
  }, [exportURL, exportFormat, exportPreset]);

  /* ── Computed pct ── */
  const pct = duration > 0 ? (currentTime / duration) * 100 : 0;
  const trimStartPct = duration > 0 ? (trimStart / duration) * 100 : 0;
  const trimEndPct = duration > 0 ? (trimEnd / duration) * 100 : 100;

  const togglePanel = (p: Panel) => {
    if (p === "bgswap" && !isUnlocked()) {
      setShowLockModal(true);
      return;
    }
    setActivePanel((prev) => (prev === p ? "none" : p));
  };

  /* ──────────────────────────────────────────────────────── */
  return (
    <div className="flex flex-col flex-1 min-h-0 overflow-hidden select-none">

      {/* ─ Upload screen ─ */}
      {!videoURL ? (
        <div className="flex-1 flex items-center justify-center p-6 bg-[#060606]">
          <div
            className={`upload-zone w-full max-w-lg aspect-video rounded-2xl border-2 border-dashed flex flex-col items-center justify-center gap-4 cursor-pointer transition-all duration-300 ${isDragging ? "bg-[rgba(184,134,11,0.1)] border-[#ffd700] scale-[1.02]" : "bg-[#0a0a0a] hover:bg-[#0e0e0e]"}`}
            onClick={() => fileInputRef.current?.click()}
            onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={(e) => { e.preventDefault(); setIsDragging(false); const f = e.dataTransfer.files[0]; if (f) handleFile(f); }}
          >
            <div className="w-20 h-20 rounded-full bg-[rgba(184,134,11,0.12)] border border-[rgba(184,134,11,0.3)] flex items-center justify-center shadow-[0_0_30px_rgba(255,215,0,0.15)]">
              <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="#ffd700" strokeWidth="1.5">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="17 8 12 3 7 8" /><line x1="12" y1="3" x2="12" y2="15" />
              </svg>
            </div>
            <div className="text-center">
              <p className="text-[#ffd700] font-semibold text-lg mb-1">Upload Video</p>
              <p className="text-[rgba(184,134,11,0.6)] text-sm">Drag & drop or tap to browse</p>
              <p className="text-[rgba(184,134,11,0.4)] text-xs mt-1">MP4, MOV, WebM, AVI supported</p>
            </div>
            <button className="px-6 py-2 bg-gradient-to-r from-[#b8860b] to-[#ffd700] text-[#0d0d0d] font-bold rounded-full text-sm hover:opacity-90 transition-all shadow-[0_0_20px_rgba(255,215,0,0.3)]">
              Choose File
            </button>
          </div>
          <input ref={fileInputRef} type="file" accept="video/*" className="hidden"
            onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); e.target.value = ""; }} />
        </div>
      ) : (
        <>
          {/* ─ Preview ─ */}
          <div className="flex-1 flex flex-col min-h-0 overflow-hidden bg-[#020202]">
            <div className="flex-1 flex items-center justify-center p-2 min-h-0 relative overflow-hidden">
              <div
                ref={videoWrapRef}
                className="relative w-full max-w-3xl aspect-video rounded-xl overflow-hidden border border-[rgba(184,134,11,0.2)] shadow-[0_0_60px_rgba(0,0,0,0.9)] bg-black"
                onPointerMove={onTextMove}
                onPointerUp={() => { textDragRef.current = null; }}
              >
                <video
                  ref={videoRef}
                  src={videoURL}
                  className="absolute inset-0 w-full h-full object-contain"
                  style={{
                    filter: activeNextFilter
                      ? activeNextFilter.css
                      : libraryFilter
                        ? (libraryFilter.css === "none" ? undefined : libraryFilter.css)
                        : (activeFilter.css === "none" ? undefined : activeFilter.css),
                  }}
                  onLoadedMetadata={onLoadedMetadata}
                  onTimeUpdate={onTimeUpdate}
                  onPlay={onPlay} onPause={onPause} onEnded={onEnded}
                  onClick={togglePlay}
                  preload="metadata" playsInline
                />

                {/* Next Level Filter — color blend overlay (screen mode) */}
                {activeNextFilter?.blendColor && (
                  <div className="absolute inset-0 pointer-events-none" style={{ backgroundColor: activeNextFilter.blendColor, mixBlendMode: "screen" }} />
                )}

                {/* Glow & Aura — inset radial glow ring */}
                {glowIntensity > 0 && (
                  <div
                    ref={glowElRef}
                    className="absolute inset-0 pointer-events-none rounded-sm"
                    style={{
                      boxShadow: glowPulse
                        ? undefined  // driven by RAF loop
                        : `inset 0 0 ${glowIntensity * 2.5}px ${glowIntensity}px ${glowColor}99`,
                      border: `1px solid ${glowColor}44`,
                    }}
                  />
                )}

                {/* ── BG Swap canvas overlay (behind everything, zIndex 0) ── */}
                {bgSwapEnabled && (
                  <BgSwapCanvas
                    enabled={bgSwapEnabled}
                    state={bgSwapState}
                    videoEl={videoRef.current}
                    isPlaying={isPlaying}
                    canvasElRef={bgSwapCanvasRef}
                    onSegStatusChange={(st) => {
                      setSegStatus(st);
                      segActiveRef.current = st === "ready";
                    }}
                    onMaskUpdate={(m) => { maskCanvasRef.current = m; }}
                  />
                )}

                {/* ── Smoke & Glow shader overlay (zIndex 2) ── */}
                {bgSwapEnabled && (
                  <SmokeGlowOverlay
                    enabled={bgSwapEnabled}
                    bgCanvas={bgSwapCanvasRef.current}
                    maskCanvas={maskCanvasRef.current}
                    bgId={bgSwapState.bgId}
                  />
                )}

                {/* ── WebGL face color grading — env-matched shader (zIndex 3) ── */}
                {bgSwapEnabled && segStatus === "ready" && (
                  <WebGLFaceGrade
                    enabled={bgSwapEnabled}
                    videoEl={videoRef.current}
                    maskCanvas={maskCanvasRef.current}
                    bgId={bgSwapState.bgId}
                  />
                )}

                {/* ── Outfit & Hair color overlay ── */}
                {outfitEnabled && (
                  <OutfitCanvas
                    enabled={outfitEnabled}
                    videoEl={videoRef.current}
                    isPlaying={isPlaying}
                    dressColor={dressColor}
                    dressEnabled={dressEnabled}
                    hairColor={hairColor}
                    hairEnabled={hairEnabled}
                    dressIntensity={dressIntensity}
                    hairIntensity={hairIntensity}
                    canvasElRef={outfitCanvasRef}
                  />
                )}

                {/* ── Blue Neon Glow canvas overlay ── */}
                <BlueNeonGlowCanvas
                  videoEl={videoRef.current}
                  isPlaying={isPlaying}
                  intensity={neonIntensity}
                  color={neonColor}
                  enabled={neonEnabled}
                />

                {/* ── PiP Video Overlay ── */}
                {pipVideoURL && pipState.x >= 0 && (
                  <PipOverlay
                    videoURL={pipVideoURL}
                    state={pipState}
                    onChange={(patch) => {
                      if (patch.x !== undefined && patch.x < 0) {
                        /* close signal from × button */
                        URL.revokeObjectURL(pipVideoURL);
                        setPipVideoURL(null);
                      } else {
                        setPipState((s) => ({ ...s, ...patch }));
                      }
                    }}
                    containerRef={videoWrapRef}
                    isPlaying={isPlaying}
                    videoRef={pipVideoRef}
                  />
                )}

                {/* Transition overlay */}
                <div style={transitionOverlayStyle} />
                <GlitchOverlay active={activeTransition.id === "glitch" && transitionMode !== "none"} />

                {/* Text overlays with keyframe animation */}
                {animatedOverlays.map((t) => {
                  if (!t._visible) return null;
                  const kf = t._kf;
                  return (
                    <div
                      key={t.id}
                      style={{
                        position: "absolute",
                        left: `${kf?.x ?? t.x}%`,
                        top: `${kf?.y ?? t.y}%`,
                        fontSize: t.fontSize,
                        color: t.color,
                        fontFamily: t.fontFamily,
                        fontWeight: t.bold ? "bold" : "normal",
                        fontStyle: t.italic ? "italic" : "normal",
                        textShadow: t.shadow ? "2px 2px 8px rgba(0,0,0,0.9)" : "none",
                        opacity: kf?.opacity ?? 1,
                        transform: `scale(${kf?.scale ?? 1}) rotate(${kf?.rotation ?? 0}deg)`,
                        cursor: "move",
                        userSelect: "none",
                        whiteSpace: "nowrap",
                        touchAction: "none",
                        outline: selectedOverlayId === t.id ? "1px dashed rgba(255,215,0,0.6)" : "none",
                        padding: "2px 4px",
                      }}
                      onPointerDown={(e) => { startTextDrag(e, t.id); setSelectedOverlayId(t.id); }}
                    >
                      {t.text}
                    </div>
                  );
                })}

                {/* Live caption */}
                {captionActive && liveCaption && (
                  <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-[rgba(0,0,0,0.75)] text-white font-bold text-sm px-4 py-1.5 rounded-full border border-[rgba(255,215,0,0.4)] backdrop-blur-sm max-w-[80%] text-center">
                    {liveCaption}
                  </div>
                )}

                {/* Caption active badge */}
                {captionActive && (
                  <div className="absolute top-2 right-2 flex items-center gap-1.5 bg-[rgba(0,0,0,0.7)] border border-[#ffd700] rounded-full px-2 py-0.5">
                    <div className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
                    <span className="text-[#ffd700] text-[9px] font-bold">AI CAPTIONS</span>
                  </div>
                )}

                {/* Filter badge */}
                {(activeFilter.id !== "none" || libraryFilter) && (
                  <div className="absolute top-2 left-2 bg-[rgba(0,0,0,0.7)] border border-[rgba(184,134,11,0.4)] rounded-lg px-2 py-0.5 text-[10px] text-[#ffd700] font-medium backdrop-blur-sm">
                    {libraryFilter
                      ? `${libraryFilter.emoji} ${libraryFilter.name}`
                      : `${activeFilter.emoji} ${activeFilter.name}`}
                  </div>
                )}

                {/* Transition badge */}
                {activeTransition.id !== "none" && (
                  <div className="absolute bottom-2 left-2 bg-[rgba(0,0,0,0.7)] border border-[rgba(184,134,11,0.3)] rounded-lg px-2 py-0.5 text-[10px] text-[rgba(184,134,11,0.8)] font-medium">
                    {activeTransition.emoji} {activeTransition.name}
                  </div>
                )}

                {/* Play overlay */}
                {!isPlaying && (
                  <div className="absolute inset-0 flex items-center justify-center cursor-pointer group" onClick={togglePlay}>
                    <div className="w-14 h-14 rounded-full bg-[rgba(0,0,0,0.6)] border border-[rgba(255,215,0,0.4)] flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity backdrop-blur-sm">
                      <svg width="24" height="24" viewBox="0 0 24 24" fill="#ffd700"><polygon points="5 3 19 12 5 21 5 3" /></svg>
                    </div>
                  </div>
                )}

                {/* Export overlay */}
                {exporting && (
                  <div className="absolute inset-0 bg-[rgba(0,0,0,0.85)] flex flex-col items-center justify-center gap-3 backdrop-blur-sm z-20">
                    <div className="w-14 h-14 rounded-full border-4 border-[rgba(184,134,11,0.2)] border-t-[#ffd700] animate-spin" />
                    <p className="text-[#ffd700] font-bold text-sm">
                      {exportStage === "Capturing…"
                        ? `Capturing ${exportPreset.label}… ${exportProgress}%`
                        : exportStage === "Encoding final frames…"
                        ? "Encoding final frames…"
                        : exportStage === "Muxing…"
                        ? "Muxing & packaging…"
                        : `${exportPreset.label} ${exportProgress}%`}
                    </p>
                    <div className="w-56 h-2 bg-[rgba(184,134,11,0.15)] rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-300"
                        style={{
                          width: exportStage === "Capturing…" ? `${exportProgress}%` : exportStage === "Encoding final frames…" ? "99%" : "100%",
                          background: exportStage === "Capturing…"
                            ? "linear-gradient(90deg,#b8860b,#ffd700)"
                            : "linear-gradient(90deg,#ffd700,#fff8a0)",
                        }}
                      />
                    </div>
                    <p className="text-[rgba(184,134,11,0.4)] text-[10px]">
                      {exportStage === "Encoding final frames…" && "Hardware encoder draining pipeline…"}
                      {exportStage === "Muxing…" && "Finalizing MP4 container…"}
                    </p>
                  </div>
                )}

                {exportDone && !exporting && (
                  <div className="absolute inset-0 bg-[rgba(0,0,0,0.78)] flex flex-col items-center justify-center gap-3 backdrop-blur-sm z-20">
                    <div className="w-14 h-14 rounded-full bg-[rgba(184,134,11,0.2)] border border-[#ffd700] flex items-center justify-center">
                      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#ffd700" strokeWidth="2.5"><polyline points="20 6 9 17 4 12" /></svg>
                    </div>
                    <p className="text-[#ffd700] font-bold">Export Ready!</p>
                    <div className="flex gap-2">
                      <button onClick={downloadExport} className="px-4 py-2 bg-gradient-to-r from-[#b8860b] to-[#ffd700] text-[#0d0d0d] font-bold rounded-xl text-sm">⬇ Download</button>
                      <button onClick={() => setExportDone(false)} className="px-4 py-2 bg-[rgba(184,134,11,0.15)] border border-[rgba(184,134,11,0.3)] text-[#ffd700] rounded-xl text-sm">Close</button>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* ─ Playback controls ─ */}
            <div className="flex-shrink-0 px-3 py-1.5 bg-[#080808] border-t border-[rgba(184,134,11,0.12)] flex items-center gap-2">
              <button className="text-[rgba(184,134,11,0.6)] hover:text-[#ffd700] transition-colors" onClick={() => seekTo(trimStart)}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><polygon points="19 20 9 12 19 4 19 20" /><line x1="5" y1="19" x2="5" y2="5" stroke="currentColor" strokeWidth="2" /></svg>
              </button>
              <button onClick={togglePlay} className="w-8 h-8 rounded-full bg-gradient-to-br from-[#b8860b] to-[#ffd700] flex items-center justify-center shadow-[0_0_12px_rgba(255,215,0,0.3)] hover:shadow-[0_0_20px_rgba(255,215,0,0.5)] transition-all flex-shrink-0">
                {isPlaying
                  ? <svg width="12" height="12" viewBox="0 0 24 24" fill="#0d0d0d"><rect x="6" y="4" width="4" height="16" /><rect x="14" y="4" width="4" height="16" /></svg>
                  : <svg width="12" height="12" viewBox="0 0 24 24" fill="#0d0d0d"><polygon points="5 3 19 12 5 21 5 3" /></svg>
                }
              </button>
              <span className="text-[rgba(184,134,11,0.6)] text-[10px] font-mono flex-shrink-0 min-w-[76px]">{formatTime(currentTime)} / {formatTime(duration)}</span>
              <div className="flex-1 relative h-1.5 bg-[rgba(184,134,11,0.1)] rounded-full cursor-pointer group"
                onClick={(e) => { const r = e.currentTarget.getBoundingClientRect(); seekTo(((e.clientX - r.left) / r.width) * duration); }}>
                <div className="absolute h-full rounded-full bg-[rgba(184,134,11,0.12)]" style={{ left: `${trimStartPct}%`, width: `${trimEndPct - trimStartPct}%` }} />
                <div className="h-full bg-gradient-to-r from-[#b8860b] to-[#ffd700] rounded-full" style={{ width: `${pct}%` }} />
                <div className="absolute top-1/2 -translate-y-1/2 w-3 h-3 rounded-full bg-[#ffd700] shadow-[0_0_8px_rgba(255,215,0,0.7)] opacity-0 group-hover:opacity-100 transition-opacity" style={{ left: `calc(${pct}% - 6px)` }} />
              </div>
              <button onClick={toggleMute} className="text-[rgba(184,134,11,0.5)] hover:text-[#ffd700] transition-colors flex-shrink-0">
                {isMuted ? <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" /><line x1="23" y1="9" x2="17" y2="15" /><line x1="17" y1="9" x2="23" y2="15" /></svg>
                  : <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" /><path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07" /></svg>}
              </button>
              <input type="range" min="0" max="1" step="0.02" defaultValue={volume}
                onChange={(e) => applyVolume(parseFloat(e.target.value))}
                onPointerUp={(e) => handleVolume(parseFloat((e.target as HTMLInputElement).value))}
                className="w-14 flex-shrink-0 accent-[#ffd700] cursor-pointer" style={{ height: "4px" }} />
              <button onClick={() => togglePanel("speed")} className={`flex-shrink-0 text-[10px] font-bold px-2 py-0.5 rounded border transition-all ${activePanel === "speed" ? "bg-[rgba(184,134,11,0.2)] border-[rgba(255,215,0,0.5)] text-[#ffd700]" : "border-[rgba(184,134,11,0.2)] text-[rgba(184,134,11,0.5)] hover:text-[#ffd700]"}`}>{playbackRate}x</button>
              <button onClick={() => fileInputRef.current?.click()} className="flex-shrink-0 text-[rgba(184,134,11,0.4)] hover:text-[#ffd700] transition-colors" title="New video">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="17 8 12 3 7 8" /><line x1="12" y1="3" x2="12" y2="15" /></svg>
              </button>
              <input ref={fileInputRef} type="file" accept="video/*" className="hidden"
                onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); e.target.value = ""; }} />
            </div>

            {/* ─ Tool strip ─ */}
            <div className="flex-shrink-0 bg-[#060606] border-t border-[rgba(184,134,11,0.15)] px-2 py-1.5">
              <div className="flex gap-1.5 overflow-x-auto pb-0.5">
                {([
                  ["trim", "✂️", "Trim"], ["filterslib", "🎨", "Filters"], ["nextfilter", "🌟", "Pro FX"],
                  ["glow", "✨", "Aura"], ["text", "📝", "Text"],
                  ["transition", "🔀", "FX"], ["captions", "💬", "AI"], ["music", "🎵", "Music"],
                  ["beatsync", "🥁", "Beat"], ["voice", "🎭", "Voice"],
                  ["neon", "💠", "Neon"], ["clone", "👥", "Clone"], ["pip", "🎬", "PiP"],
                  ["bgswap", "🌆", "AI BG"],
                  ["outfit", "👗", "Outfit"],
                  ["speed", "⚡", "Speed"], ["audio", "🔊", "Audio"],
                ] as [Panel, string, string][]).map(([id, icon, label]) => (
                  <button key={id} onClick={() => togglePanel(id)}
                    className={`flex-shrink-0 flex flex-col items-center gap-0.5 px-2.5 py-1.5 rounded-xl border transition-all ${activePanel === id ? "bg-[rgba(184,134,11,0.2)] border-[rgba(255,215,0,0.5)] shadow-[0_0_8px_rgba(255,215,0,0.2)]" : "bg-[#0d0d0d] border-[rgba(184,134,11,0.1)] hover:border-[rgba(184,134,11,0.35)]"}`}>
                    <span className="text-base leading-none">{icon}</span>
                    <span className={`text-[9px] font-medium ${activePanel === id ? "text-[#ffd700]" : "text-[rgba(184,134,11,0.55)]"}`}>{label}</span>
                    {id === "captions" && captionActive && <div className="absolute top-1 right-1 w-1.5 h-1.5 rounded-full bg-red-500" />}
                  </button>
                ))}
                {/* Export */}
                <div className="flex items-center gap-1.5 ml-auto flex-shrink-0">
                  <select value={exportPreset.id} onChange={(e) => setExportPreset(EXPORT_PRESETS.find((p) => p.id === e.target.value) ?? EXPORT_PRESETS[1])}
                    className="bg-[#111] border border-[rgba(184,134,11,0.2)] rounded-lg px-1.5 py-1 text-[rgba(184,134,11,0.7)] text-[10px] outline-none">
                    {EXPORT_PRESETS.map((p) => <option key={p.id} value={p.id}>{p.label}</option>)}
                  </select>
                  <button onClick={exportVideo} disabled={exporting}
                    className="flex-shrink-0 flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-xl border border-[rgba(255,215,0,0.4)] bg-[rgba(184,134,11,0.12)] hover:bg-[rgba(184,134,11,0.22)] transition-all disabled:opacity-40">
                    <span className="text-base leading-none">📤</span>
                    <span className="text-[9px] font-bold text-[#ffd700]">Export MP4</span>
                  </button>
                </div>
              </div>
            </div>

            {/* ─ Active Panel ─ */}
            {activePanel !== "none" && (
              <div className="flex-shrink-0 bg-[#070707] border-t border-[rgba(184,134,11,0.15)]" style={{ maxHeight: activePanel === "filterslib" ? 240 : 210, overflowY: "auto" }}>

                {/* Filters Library — categorized, lazy-loaded */}
                {activePanel === "filterslib" && (
                  <FiltersLibrary
                    activeCss={libraryFilter?.css ?? activeFilter.css}
                    onSelect={(f) => {
                      setLibraryFilter(f);
                      setActiveNextFilter(null);
                    }}
                  />
                )}

                {/* Quick filter (legacy) — hidden from toolbar but kept for export compat */}
                {activePanel === "filter" && (
                  <div className="overflow-x-auto p-2">
                    <div className="flex gap-2">
                      {FILTERS.map((f) => (
                        <button key={f.id} onClick={() => { setActiveFilter(f); setLibraryFilter(null); }}
                          className={`flex-shrink-0 flex flex-col items-center rounded-xl overflow-hidden border transition-all ${activeFilter.id === f.id && !libraryFilter ? "border-[#ffd700] shadow-[0_0_12px_rgba(255,215,0,0.35)]" : "border-[rgba(184,134,11,0.15)] hover:border-[rgba(184,134,11,0.4)]"}`}>
                          <div className="w-14 h-9 flex items-center justify-center bg-[#111] text-lg" style={{ filter: f.css === "none" ? undefined : f.css }}>🎬</div>
                          <span className={`text-[8px] pb-1 px-1 ${activeFilter.id === f.id && !libraryFilter ? "text-[#ffd700]" : "text-[rgba(184,134,11,0.5)]"}`}>{f.name}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Transitions */}
                {activePanel === "transition" && (
                  <div className="overflow-x-auto p-2">
                    <div className="flex gap-2">
                      {TRANSITIONS.map((tr) => (
                        <button key={tr.id} onClick={() => setActiveTransition(tr)}
                          className={`flex-shrink-0 flex flex-col items-center gap-1 px-3 py-2 rounded-xl border transition-all min-w-[60px] ${activeTransition.id === tr.id ? "bg-[rgba(184,134,11,0.2)] border-[#ffd700] shadow-[0_0_10px_rgba(255,215,0,0.3)]" : "bg-[#0d0d0d] border-[rgba(184,134,11,0.15)] hover:border-[rgba(184,134,11,0.4)]"}`}>
                          <span className="text-xl">{tr.emoji}</span>
                          <span className={`text-[9px] font-medium ${activeTransition.id === tr.id ? "text-[#ffd700]" : "text-[rgba(184,134,11,0.6)]"}`}>{tr.name}</span>
                        </button>
                      ))}
                    </div>
                    <p className="text-[rgba(184,134,11,0.4)] text-[9px] mt-2 px-1">{activeTransition.description} — plays at start & end of clip</p>
                  </div>
                )}

                {/* Text + Keyframes */}
                {activePanel === "text" && (
                  <div className="p-2 flex flex-col gap-2">
                    <div className="flex gap-2 flex-wrap items-center">
                      <input type="text" value={newText} onChange={(e) => setNewText(e.target.value)}
                        className="flex-1 min-w-[100px] bg-[#111] border border-[rgba(184,134,11,0.25)] rounded-lg px-2 py-1 text-[rgba(184,134,11,0.9)] text-sm outline-none focus:border-[rgba(255,215,0,0.5)]"
                        placeholder="Type text…" />
                      <input type="color" value={textColor} onChange={(e) => setTextColor(e.target.value)}
                        className="w-7 h-7 rounded-lg cursor-pointer border border-[rgba(184,134,11,0.2)] bg-transparent flex-shrink-0" />
                      <input type="range" min="12" max="96" value={textSize} onChange={(e) => setTextSize(parseInt(e.target.value))}
                        className="w-16 accent-[#ffd700]" style={{ height: "4px" }} />
                      <span className="text-[rgba(184,134,11,0.5)] text-[10px]">{textSize}px</span>
                    </div>
                    <div className="flex gap-1.5 flex-wrap items-center">
                      <select value={textFont.id} onChange={(e) => setTextFont(FONT_OPTIONS.find((f) => f.id === e.target.value) ?? FONT_OPTIONS[0])}
                        className="bg-[#111] border border-[rgba(184,134,11,0.2)] rounded-lg px-2 py-0.5 text-[rgba(184,134,11,0.8)] text-xs outline-none">
                        {FONT_OPTIONS.map((f) => <option key={f.id} value={f.id}>{f.name}</option>)}
                      </select>
                      {[["B", "bold", textBold, () => setTextBold(!textBold)], ["I", "italic", textItalic, () => setTextItalic(!textItalic)], ["S", "shadow", textShadow, () => setTextShadow(!textShadow)]].map(([lbl, , active, fn]) => (
                        <button key={lbl as string} onClick={fn as () => void}
                          className={`px-2 py-0.5 rounded text-xs border transition-all ${active ? "bg-[rgba(184,134,11,0.2)] border-[rgba(255,215,0,0.4)] text-[#ffd700]" : "border-[rgba(184,134,11,0.2)] text-[rgba(184,134,11,0.5)]"}`}>
                          {lbl as string}
                        </button>
                      ))}
                      <button onClick={addTextOverlay} className="px-3 py-1 bg-gradient-to-r from-[#b8860b] to-[#ffd700] text-[#0d0d0d] text-xs font-bold rounded-lg hover:opacity-90">+ Add</button>
                    </div>
                    {selectedOverlayId && (
                      <div className="flex items-center gap-2 bg-[rgba(184,134,11,0.07)] border border-[rgba(184,134,11,0.2)] rounded-xl px-3 py-1.5">
                        <span className="text-[rgba(184,134,11,0.6)] text-[10px]">🎞 Keyframe at {formatTime(currentTime)}</span>
                        <button onClick={addKeyframe} className="px-2 py-0.5 bg-gradient-to-r from-[#b8860b] to-[#ffd700] text-[#0d0d0d] text-[10px] font-bold rounded-lg">+ Set KF</button>
                        <span className="text-[rgba(184,134,11,0.4)] text-[10px]">{textOverlays.find((t) => t.id === selectedOverlayId)?.keyframes.length ?? 0} keyframes</span>
                      </div>
                    )}
                    {textOverlays.length > 0 && (
                      <div className="flex gap-1.5 flex-wrap">
                        {textOverlays.map((t) => (
                          <div key={t.id} onClick={() => setSelectedOverlayId(t.id)}
                            className={`flex items-center gap-1 rounded-lg px-2 py-0.5 border cursor-pointer transition-all ${selectedOverlayId === t.id ? "bg-[rgba(184,134,11,0.2)] border-[rgba(255,215,0,0.5)]" : "bg-[rgba(184,134,11,0.07)] border-[rgba(184,134,11,0.15)]"}`}>
                            <span className="text-[rgba(184,134,11,0.8)] text-[10px] truncate max-w-[60px]">{t.text}</span>
                            {t.keyframes.length > 0 && <span className="text-[#ffd700] text-[8px]">🎞{t.keyframes.length}</span>}
                            <button onClick={(e) => { e.stopPropagation(); setTextOverlays((prev) => prev.filter((x) => x.id !== t.id)); if (selectedOverlayId === t.id) setSelectedOverlayId(null); }}
                              className="text-[rgba(184,134,11,0.4)] hover:text-red-400 text-[10px]">✕</button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* AI Captions */}
                {activePanel === "captions" && (
                  <div className="p-3 flex flex-col gap-2">
                    <div className="flex items-center gap-3">
                      <button onClick={toggleCaptions} disabled={!captionSupported}
                        className={`px-4 py-2 rounded-xl font-bold text-sm border transition-all ${captionActive ? "bg-red-900 border-red-500 text-red-300 hover:bg-red-800" : "bg-gradient-to-r from-[#b8860b] to-[#ffd700] border-transparent text-[#0d0d0d]"} disabled:opacity-40 disabled:cursor-not-allowed`}>
                        {captionActive ? "⏹ Stop Captions" : "🎙 Start AI Captions"}
                      </button>
                      {!captionSupported && <span className="text-[rgba(184,134,11,0.5)] text-xs">Use Chrome for speech recognition</span>}
                      {captionActive && <span className="text-[rgba(184,134,11,0.6)] text-xs">Play video — speech auto-adds captions</span>}
                    </div>
                    {captionLines.length > 0 && (
                      <div className="flex flex-col gap-1 max-h-20 overflow-y-auto">
                        {captionLines.map((c) => (
                          <div key={c.id} className="flex gap-2 text-[10px]">
                            <span className="text-[#ffd700] font-mono flex-shrink-0">{formatTime(c.time)}</span>
                            <span className="text-[rgba(184,134,11,0.8)]">{c.text}</span>
                          </div>
                        ))}
                      </div>
                    )}
                    {captionLines.length === 0 && !captionActive && (
                      <p className="text-[rgba(184,134,11,0.4)] text-[10px]">AI will transcribe speech from your video and add timed caption overlays automatically.</p>
                    )}
                  </div>
                )}

                {/* Music Library — real search */}
                {activePanel === "music" && (
                  <div className="flex flex-col" style={{ height: 210 }}>
                    {/* Top bar: search input + tabs */}
                    <div className="flex-shrink-0 px-2 pt-2 pb-1 flex gap-1.5 items-center border-b border-[rgba(184,134,11,0.1)]">
                      <div className="relative flex-1 min-w-0">
                        <svg className="absolute left-2 top-1/2 -translate-y-1/2 opacity-40" width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#ffd700" strokeWidth="2.5"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
                        <input
                          type="text"
                          value={musicQuery}
                          onChange={(e) => handleMusicQuery(e.target.value)}
                          onKeyDown={(e) => e.key === "Enter" && runSearch(musicQuery)}
                          className="w-full bg-[#111] border border-[rgba(184,134,11,0.25)] rounded-lg pl-6 pr-2 py-1 text-[rgba(184,134,11,0.9)] text-xs outline-none focus:border-[rgba(255,215,0,0.55)]"
                          placeholder="Search Bhojpuri, Pop, Lofi…"
                        />
                        {searchLoading && (
                          <div className="absolute right-2 top-1/2 -translate-y-1/2 w-3 h-3 rounded-full border-2 border-[rgba(184,134,11,0.3)] border-t-[#ffd700] animate-spin" />
                        )}
                      </div>
                      <button onClick={() => runSearch(musicQuery)}
                        className="flex-shrink-0 px-2 py-1 bg-gradient-to-r from-[#b8860b] to-[#ffd700] text-[#0d0d0d] text-[9px] font-bold rounded-lg">
                        Search
                      </button>
                      <button
                        onClick={() => setShowPixabayInput((v) => !v)}
                        title="Use Pixabay API for royalty-free music"
                        className={`flex-shrink-0 px-1.5 py-1 rounded-lg border text-[9px] transition-all ${pixabayKey ? "bg-[rgba(184,134,11,0.2)] border-[rgba(255,215,0,0.4)] text-[#ffd700]" : "border-[rgba(184,134,11,0.2)] text-[rgba(184,134,11,0.5)]"}`}>
                        PXB
                      </button>
                    </div>

                    {/* Pixabay key input (collapsible) */}
                    {showPixabayInput && (
                      <div className="flex-shrink-0 px-2 py-1.5 bg-[rgba(184,134,11,0.05)] border-b border-[rgba(184,134,11,0.1)] flex gap-1.5 items-center">
                        <input
                          type="text"
                          value={pixabayKey}
                          onChange={(e) => setPixabayKey(e.target.value)}
                          placeholder="Paste free Pixabay API key → pixabay.com/api"
                          className="flex-1 bg-[#111] border border-[rgba(184,134,11,0.2)] rounded-lg px-2 py-0.5 text-[rgba(184,134,11,0.8)] text-[10px] outline-none focus:border-[rgba(255,215,0,0.4)] font-mono"
                        />
                        <button onClick={() => { localStorage.setItem("pxb_key", pixabayKey); setShowPixabayInput(false); }}
                          className="flex-shrink-0 px-2 py-0.5 bg-gradient-to-r from-[#b8860b] to-[#ffd700] text-[#0d0d0d] text-[9px] font-bold rounded-lg">
                          Save
                        </button>
                      </div>
                    )}

                    {/* Tab bar */}
                    <div className="flex-shrink-0 flex gap-0 border-b border-[rgba(184,134,11,0.1)]">
                      {(["trending", "search", "url"] as const).map((tab) => (
                        <button key={tab} onClick={() => setMusicTab(tab)}
                          className={`flex-1 py-1 text-[9px] font-semibold uppercase tracking-wide transition-all border-b-2 ${musicTab === tab ? "border-[#ffd700] text-[#ffd700]" : "border-transparent text-[rgba(184,134,11,0.4)] hover:text-[rgba(184,134,11,0.7)]"}`}>
                          {tab === "trending" ? "🔥 Trending" : tab === "search" ? "🔍 Results" : "🔗 Paste URL"}
                        </button>
                      ))}
                    </div>

                    {/* Active track strip */}
                    {activeMusicTrack && (
                      <div className="flex-shrink-0 flex items-center gap-2 bg-[rgba(184,134,11,0.1)] border-b border-[rgba(255,215,0,0.15)] px-2 py-1">
                        {activeMusicTrack.artworkUrl
                          ? <img src={activeMusicTrack.artworkUrl} className="w-5 h-5 rounded flex-shrink-0 object-cover" alt="" />
                          : <span className="text-[10px] flex-shrink-0">♪</span>
                        }
                        <span className="text-[#ffd700] text-[10px] font-bold truncate flex-1 min-w-0">{activeMusicTrack.title}</span>
                        <span className="text-[rgba(184,134,11,0.5)] text-[8px] flex-shrink-0">{activeMusicTrack.source}</span>
                        <input type="range" min="0" max="1" step="0.02" defaultValue={musicVolume}
                          onChange={(e) => {
                            const v = parseFloat(e.target.value);
                            if (bgMusicGainRef.current && audioCtxRef.current) {
                              bgMusicGainRef.current.gain.value = v;
                            } else if (bgAudioElementRef.current) {
                              bgAudioElementRef.current.volume = v;
                            }
                          }}
                          onPointerUp={(e) => setMusicVolume(parseFloat((e.target as HTMLInputElement).value))}
                          className="w-14 accent-[#ffd700] flex-shrink-0" style={{ height: "3px" }} />
                        <button onClick={stopMusic} className="text-[rgba(184,134,11,0.5)] hover:text-red-400 text-[10px] flex-shrink-0">✕</button>
                      </div>
                    )}

                    {/* Track list / URL paste */}
                    <div className="overflow-y-auto flex-1 min-h-0">
                      {/* URL paste tab */}
                      {musicTab === "url" && (
                        <div className="p-2 flex flex-col gap-2">
                          <p className="text-[rgba(184,134,11,0.5)] text-[10px]">Paste a direct link to any MP3, OGG, or audio file:</p>
                          <div className="flex gap-1.5">
                            <input
                              type="url"
                              value={customURL}
                              onChange={(e) => setCustomURL(e.target.value)}
                              onKeyDown={(e) => e.key === "Enter" && addCustomURL()}
                              placeholder="https://example.com/song.mp3"
                              className="flex-1 bg-[#111] border border-[rgba(184,134,11,0.2)] rounded-lg px-2 py-1 text-[rgba(184,134,11,0.8)] text-xs outline-none focus:border-[rgba(255,215,0,0.4)]"
                            />
                            <button onClick={addCustomURL}
                              className="flex-shrink-0 px-3 py-1 bg-gradient-to-r from-[#b8860b] to-[#ffd700] text-[#0d0d0d] text-xs font-bold rounded-lg">
                              ▶ Add
                            </button>
                          </div>
                          <p className="text-[rgba(184,134,11,0.3)] text-[9px]">YouTube links won't work directly (no direct audio). Use a direct .mp3 URL or download first.</p>
                        </div>
                      )}

                      {/* Trending / Search results */}
                      {musicTab !== "url" && (() => {
                        const tracks = musicTab === "trending" ? trendingTracks : searchTracks;
                        if (searchLoading && musicTab === "search") {
                          return (
                            <div className="flex items-center justify-center h-16 gap-2">
                              <div className="w-4 h-4 rounded-full border-2 border-[rgba(184,134,11,0.2)] border-t-[#ffd700] animate-spin" />
                              <span className="text-[rgba(184,134,11,0.5)] text-[10px]">Searching…</span>
                            </div>
                          );
                        }
                        if (searchError && musicTab === "search") {
                          return <p className="text-[rgba(184,134,11,0.4)] text-[10px] text-center pt-4 px-4">{searchError}</p>;
                        }
                        if (tracks.length === 0) {
                          return (
                            <div className="flex flex-col items-center justify-center h-16 gap-1">
                              <p className="text-[rgba(184,134,11,0.3)] text-[10px]">
                                {musicTab === "trending" ? "Loading trending tracks…" : "Search for music above"}
                              </p>
                            </div>
                          );
                        }
                        return tracks.map((track) => (
                          <div key={track.id}
                            className={`flex items-center gap-2 px-2 py-1.5 cursor-pointer group border-b border-[rgba(184,134,11,0.05)] hover:bg-[rgba(184,134,11,0.06)] transition-colors ${activeMusicTrack?.id === track.id ? "bg-[rgba(184,134,11,0.1)]" : ""}`}
                            onClick={() => selectTrack(track)}>
                            {track.artworkUrl
                              ? <img src={track.artworkUrl} alt="" className="w-7 h-7 rounded-md object-cover flex-shrink-0 border border-[rgba(184,134,11,0.15)]" />
                              : <div className="w-7 h-7 rounded-md flex-shrink-0 bg-[#111] border border-[rgba(184,134,11,0.15)] flex items-center justify-center text-[10px]">
                                  {activeMusicTrack?.id === track.id ? "🔊" : "🎵"}
                                </div>
                            }
                            <div className="flex-1 min-w-0">
                              <p className={`text-[10px] font-medium truncate ${activeMusicTrack?.id === track.id ? "text-[#ffd700]" : "text-[rgba(184,134,11,0.85)]"}`}>{track.title}</p>
                              <p className="text-[rgba(184,134,11,0.4)] text-[8px] truncate">{track.artist}{track.duration > 0 ? ` · ${Math.floor(track.duration / 60)}:${String(track.duration % 60).padStart(2, "0")}` : ""}</p>
                            </div>
                            <button
                              onClick={(e) => { e.stopPropagation(); selectTrack(track); }}
                              className="opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0 px-2 py-0.5 bg-gradient-to-r from-[#b8860b] to-[#ffd700] text-[#0d0d0d] text-[8px] font-bold rounded-lg">
                              ▶ Use
                            </button>
                          </div>
                        ));
                      })()}
                    </div>
                  </div>
                )}

                {/* Speed */}
                {activePanel === "speed" && (
                  <div className="p-3 flex items-center gap-2 flex-wrap">
                    <span className="text-[rgba(184,134,11,0.5)] text-xs mr-1">Speed:</span>
                    {SPEED_OPTIONS.map((s) => (
                      <button key={s} onClick={() => handleSpeed(s)}
                        className={`px-3 py-1.5 rounded-xl text-sm font-bold border transition-all ${playbackRate === s ? "bg-gradient-to-r from-[#b8860b] to-[#ffd700] text-[#0d0d0d] border-transparent shadow-[0_0_12px_rgba(255,215,0,0.3)]" : "bg-[#0d0d0d] border-[rgba(184,134,11,0.2)] text-[rgba(184,134,11,0.6)] hover:border-[rgba(184,134,11,0.4)] hover:text-[#ffd700]"}`}>
                        {s}x
                      </button>
                    ))}
                  </div>
                )}

                {/* Audio */}
                {activePanel === "audio" && (
                  <div className="p-3 flex flex-col gap-2">
                    <div className="flex items-center gap-3">
                      <span className="text-[rgba(184,134,11,0.5)] text-xs w-14">Volume</span>
                      <input type="range" min="0" max="1" step="0.02" defaultValue={volume}
                        onChange={(e) => applyVolume(parseFloat(e.target.value))}
                        onPointerUp={(e) => handleVolume(parseFloat((e.target as HTMLInputElement).value))}
                        className="flex-1 accent-[#ffd700] cursor-pointer" style={{ height: "4px" }} />
                      <span ref={volumeDisplayRef} className="text-[rgba(184,134,11,0.5)] text-xs w-8 text-right">{Math.round(volume * 100)}%</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <button onClick={toggleMute}
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-all ${isMuted ? "bg-[rgba(184,134,11,0.2)] border-[rgba(255,215,0,0.4)] text-[#ffd700]" : "border-[rgba(184,134,11,0.2)] text-[rgba(184,134,11,0.6)]"}`}>
                        {isMuted ? "🔇 Muted" : "🔊 Mute"}
                      </button>
                    </div>
                  </div>
                )}

                {/* Next-Level Pro FX */}
                {activePanel === "nextfilter" && (
                  <div className="overflow-x-auto p-2">
                    <div className="flex gap-2">
                      <button onClick={() => { setActiveNextFilter(null); setLibraryFilter(null); }}
                        className={`flex-shrink-0 flex flex-col items-center gap-1 px-3 py-2 rounded-xl border transition-all min-w-[60px] ${!activeNextFilter ? "bg-[rgba(184,134,11,0.2)] border-[#ffd700]" : "bg-[#0d0d0d] border-[rgba(184,134,11,0.15)] hover:border-[rgba(184,134,11,0.4)]"}`}>
                        <span className="text-xl">🚫</span>
                        <span className={`text-[9px] ${!activeNextFilter ? "text-[#ffd700]" : "text-[rgba(184,134,11,0.6)]"}`}>None</span>
                      </button>
                      {NEXT_LEVEL_FILTERS.map((f) => (
                        <button key={f.id} onClick={() => { setActiveNextFilter(f); setLibraryFilter(null); }}
                          className={`flex-shrink-0 flex flex-col items-center gap-1 px-3 py-2 rounded-xl border transition-all min-w-[60px] ${activeNextFilter?.id === f.id ? "bg-[rgba(184,134,11,0.2)] border-[#ffd700] shadow-[0_0_10px_rgba(255,215,0,0.3)]" : "bg-[#0d0d0d] border-[rgba(184,134,11,0.15)] hover:border-[rgba(184,134,11,0.4)]"}`}>
                          <span className="text-xl">{f.emoji}</span>
                          <span className={`text-[9px] font-medium text-center leading-tight ${activeNextFilter?.id === f.id ? "text-[#ffd700]" : "text-[rgba(184,134,11,0.6)]"}`}>{f.name}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Advanced Body-Aura */}
                {activePanel === "glow" && (
                  <AuraPanel
                    glowColor={glowColor}
                    glowIntensity={glowIntensity}
                    glowPulse={glowPulse}
                    onColorChange={setGlowColor}
                    onIntensityChange={setGlowIntensity}
                    onPulseChange={setGlowPulse}
                    glowElRef={glowElRef}
                  />
                )}

                {/* AI Beat Sync */}
                {activePanel === "beatsync" && (
                  <BeatSyncPanel
                    analyser={analyserRef.current}
                    isPlaying={isPlaying}
                    isExporting={exporting}
                    videoEl={videoRef.current}
                    glowElRef={glowElRef}
                    glowColor={glowColor}
                    glowIntensity={glowIntensity}
                  />
                )}

                {/* Voice Changer */}
                {activePanel === "voice" && (
                  <VoiceChanger />
                )}

                {/* ── Blue Neon Glow Panel ── */}
                {activePanel === "neon" && (
                  <div className="flex flex-col gap-4 p-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-[#ffd700] font-bold text-sm">💠 Blue Neon Glow</p>
                        <p className="text-[rgba(184,134,11,0.5)] text-[10px]">Edge-detection outline on your subject</p>
                      </div>
                      <button
                        onClick={() => setNeonEnabled((v) => !v)}
                        className={`w-12 h-6 rounded-full relative transition-colors ${neonEnabled ? "bg-[#00d4ff]" : "bg-[rgba(184,134,11,0.15)]"}`}
                      >
                        <span className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${neonEnabled ? "translate-x-6" : "translate-x-0.5"}`} />
                      </button>
                    </div>

                    {/* Color picker */}
                    <div>
                      <p className="text-[rgba(184,134,11,0.55)] text-[9px] uppercase tracking-wider mb-2">Glow Color</p>
                      <div className="flex gap-2 flex-wrap">
                        {["#00d4ff","#7b2fff","#ff2f9e","#00ff88","#ff6600","#ffffff"].map((c) => (
                          <button
                            key={c}
                            onClick={() => { setNeonColor(c); setNeonEnabled(true); }}
                            className="w-8 h-8 rounded-full border-2 transition-all"
                            style={{
                              background: c,
                              borderColor: neonColor === c ? "#ffd700" : "transparent",
                              boxShadow: neonColor === c ? `0 0 10px ${c}` : "none",
                            }}
                          />
                        ))}
                        <input
                          type="color" value={neonColor}
                          onChange={(e) => { setNeonColor(e.target.value); setNeonEnabled(true); }}
                          className="w-8 h-8 rounded-full border-2 border-[rgba(184,134,11,0.3)] cursor-pointer bg-transparent"
                          title="Custom color"
                        />
                      </div>
                    </div>

                    {/* Intensity */}
                    <div>
                      <div className="flex items-center justify-between mb-1.5">
                        <p className="text-[rgba(184,134,11,0.55)] text-[9px] uppercase tracking-wider">Intensity</p>
                        <span className="text-[rgba(184,134,11,0.6)] text-[9px]">{neonIntensity}%</span>
                      </div>
                      <input
                        type="range" min="10" max="100" step="1"
                        value={neonIntensity}
                        onChange={(e) => { setNeonIntensity(parseInt(e.target.value)); setNeonEnabled(true); }}
                        className="w-full accent-[#00d4ff]"
                      />
                    </div>

                    <div className="bg-[rgba(0,212,255,0.05)] rounded-xl border border-[rgba(0,212,255,0.15)] p-2.5 text-[rgba(0,212,255,0.7)] text-[9px] leading-relaxed">
                      Tip: Works best on videos with clear contrast between subject & background. Higher intensity = more edges detected.
                    </div>
                  </div>
                )}

                {/* ── Multi-Clone Panel ── */}
                {activePanel === "clone" && (
                  <ClonePanel clones={clones} setClones={setClones} />
                )}

                {/* ── AI BG Swap Panel ── */}
                {activePanel === "bgswap" && (
                  <div className="flex flex-col gap-0">
                    <div className="flex items-center justify-between p-3 pb-2">
                      <div>
                        <p className="text-[#ffd700] font-bold text-sm">🌆 3D AI Background Swap</p>
                        <p className="text-[rgba(184,134,11,0.5)] text-[10px] mt-0.5">2030 Future Filter — Unlocked 24h</p>
                      </div>
                      <button
                        onClick={() => setBgSwapEnabled((v) => !v)}
                        className={`w-12 h-6 rounded-full relative transition-colors flex-shrink-0 ${bgSwapEnabled ? "bg-[#ffd700]" : "bg-[rgba(184,134,11,0.15)]"}`}
                      >
                        <span className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${bgSwapEnabled ? "translate-x-6" : "translate-x-0.5"}`} />
                      </button>
                    </div>
                    <BgSwapControls state={bgSwapState} onChange={(s) => { setBgSwapState(s); setBgSwapEnabled(true); }} segStatus={segStatus} />
                  </div>
                )}

                {/* ── AI Outfit & Hair Panel ── */}
                {activePanel === "outfit" && (
                  <div className="flex flex-col gap-0">
                    <div className="flex items-center justify-between p-3 pb-1">
                      <div>
                        <p className="text-[#ffd700] font-bold text-sm">👗 AI Dress & Hair Change</p>
                        <p className="text-[rgba(184,134,11,0.5)] text-[10px] mt-0.5">On-device AI color transform</p>
                      </div>
                      <button
                        onClick={() => setOutfitEnabled((v) => !v)}
                        className={`w-12 h-6 rounded-full relative transition-colors ${outfitEnabled ? "bg-[#ffd700]" : "bg-[rgba(184,134,11,0.15)]"}`}
                      >
                        <span className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${outfitEnabled ? "translate-x-6" : "translate-x-0.5"}`} />
                      </button>
                    </div>
                    <OutfitControls
                      dressEnabled={dressEnabled}
                      setDressEnabled={(v) => { setDressEnabled(v); if (v) setOutfitEnabled(true); }}
                      dressColor={dressColor}
                      setDressColor={(c) => { setDressColor(c); setOutfitEnabled(true); }}
                      dressIntensity={dressIntensity}
                      setDressIntensity={(n) => { setDressIntensity(n); setOutfitEnabled(true); }}
                      hairEnabled={hairEnabled}
                      setHairEnabled={(v) => { setHairEnabled(v); if (v) setOutfitEnabled(true); }}
                      hairColor={hairColor}
                      setHairColor={(c) => { setHairColor(c); setOutfitEnabled(true); }}
                      hairIntensity={hairIntensity}
                      setHairIntensity={(n) => { setHairIntensity(n); setOutfitEnabled(true); }}
                    />
                  </div>
                )}

                {/* ── Picture-in-Picture Panel ── */}
                {activePanel === "pip" && (
                  <div className="flex flex-col gap-4 p-3">
                    <div>
                      <p className="text-[#ffd700] font-bold text-sm">🎬 Video Overlay (PiP)</p>
                      <p className="text-[rgba(184,134,11,0.5)] text-[10px] mt-0.5">Drag & resize the overlay directly on the preview</p>
                    </div>

                    {/* Upload button */}
                    <button
                      onClick={() => pipFileInputRef.current?.click()}
                      className="flex items-center gap-2.5 p-3 bg-[rgba(184,134,11,0.08)] border border-dashed border-[rgba(184,134,11,0.35)] rounded-2xl hover:border-[#ffd700] hover:bg-[rgba(184,134,11,0.14)] transition-all"
                    >
                      <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-[#b8860b] to-[#ffd700] flex items-center justify-center text-[#0d0d0d] flex-shrink-0">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="17 8 12 3 7 8" /><line x1="12" y1="3" x2="12" y2="15" />
                        </svg>
                      </div>
                      <div className="text-left">
                        <p className="text-[rgba(184,134,11,0.9)] text-xs font-semibold">
                          {pipVideoURL ? "Change overlay video" : "Choose overlay video"}
                        </p>
                        <p className="text-[rgba(184,134,11,0.4)] text-[9px]">MP4, MOV, WebM supported</p>
                      </div>
                    </button>
                    <input
                      ref={pipFileInputRef} type="file" accept="video/*" className="hidden"
                      onChange={(e) => {
                        const f = e.target.files?.[0];
                        if (!f) return;
                        if (pipVideoURL) URL.revokeObjectURL(pipVideoURL);
                        setPipVideoURL(URL.createObjectURL(f));
                        setPipState((s) => ({ ...s, x: 60, y: 5, w: 34 }));
                        e.target.value = "";
                      }}
                    />

                    {pipVideoURL && (
                      <>
                        {/* Status chip */}
                        <div className="flex items-center gap-2 px-2.5 py-1.5 bg-[rgba(255,215,0,0.06)] border border-[rgba(255,215,0,0.2)] rounded-xl">
                          <div className="w-2 h-2 rounded-full bg-[#ffd700] animate-pulse flex-shrink-0" />
                          <p className="text-[rgba(184,134,11,0.8)] text-[10px] truncate">Overlay active — drag it on the preview</p>
                        </div>

                        {/* Size slider */}
                        <div>
                          <div className="flex items-center justify-between mb-1.5">
                            <p className="text-[rgba(184,134,11,0.55)] text-[9px] uppercase tracking-wider">Size</p>
                            <span className="text-[rgba(184,134,11,0.6)] text-[9px]">{Math.round(pipState.w)}%</span>
                          </div>
                          <input
                            type="range" min="12" max="70" step="1"
                            value={Math.round(pipState.w)}
                            onChange={(e) => setPipState((s) => ({ ...s, w: parseInt(e.target.value) }))}
                            className="w-full accent-[#ffd700]"
                          />
                        </div>

                        {/* Opacity slider */}
                        <div>
                          <div className="flex items-center justify-between mb-1.5">
                            <p className="text-[rgba(184,134,11,0.55)] text-[9px] uppercase tracking-wider">Transparency</p>
                            <span className="text-[rgba(184,134,11,0.6)] text-[9px]">{Math.round(pipState.opacity * 100)}%</span>
                          </div>
                          <input
                            type="range" min="10" max="100" step="1"
                            value={Math.round(pipState.opacity * 100)}
                            onChange={(e) => setPipState((s) => ({ ...s, opacity: parseInt(e.target.value) / 100 }))}
                            className="w-full accent-[#ffd700]"
                          />
                        </div>

                        {/* Quick position presets */}
                        <div>
                          <p className="text-[rgba(184,134,11,0.55)] text-[9px] uppercase tracking-wider mb-1.5">Quick Position</p>
                          <div className="grid grid-cols-3 gap-1.5">
                            {([
                              ["↖", { x: 2, y: 3 }],
                              ["↑", { x: 33, y: 3 }],
                              ["↗", { x: 65, y: 3 }],
                              ["←", { x: 2, y: 40 }],
                              ["⊙", { x: 30, y: 30 }],
                              ["→", { x: 65, y: 40 }],
                              ["↙", { x: 2, y: 70 }],
                              ["↓", { x: 33, y: 70 }],
                              ["↘", { x: 65, y: 70 }],
                            ] as [string, { x: number; y: number }][]).map(([label, pos]) => (
                              <button
                                key={label}
                                onClick={() => setPipState((s) => ({ ...s, ...pos }))}
                                className="py-1.5 rounded-lg bg-[rgba(184,134,11,0.08)] text-[rgba(184,134,11,0.6)] text-sm hover:bg-[rgba(184,134,11,0.18)] hover:text-[#ffd700] transition-all"
                              >
                                {label}
                              </button>
                            ))}
                          </div>
                        </div>

                        {/* Remove button */}
                        <button
                          onClick={() => {
                            if (pipVideoURL) URL.revokeObjectURL(pipVideoURL);
                            setPipVideoURL(null);
                          }}
                          className="w-full py-2 rounded-xl border border-[rgba(255,80,80,0.3)] text-[rgba(255,100,100,0.7)] text-xs hover:border-red-500 hover:text-red-400 transition-all"
                        >
                          Remove Overlay
                        </button>
                      </>
                    )}

                    {!pipVideoURL && (
                      <div className="text-center py-3 text-[rgba(184,134,11,0.3)] text-[10px]">
                        Upload a video to place it as an overlay
                      </div>
                    )}
                  </div>
                )}

                {activePanel === "trim" && (
                  <div className="p-3">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[rgba(184,134,11,0.5)] text-[10px]">Drag the gold handles on the timeline to set In / Out points</span>
                      <div className="flex gap-3 text-[10px]">
                        <span className="text-[rgba(184,134,11,0.5)]">In: <span className="text-[#ffd700] font-mono">{formatTime(trimStart)}</span></span>
                        <span className="text-[rgba(184,134,11,0.5)]">Out: <span className="text-[#ffd700] font-mono">{formatTime(trimEnd)}</span></span>
                        <span className="text-[rgba(184,134,11,0.5)]">Clip: <span className="text-[#ffd700] font-mono">{formatTime(trimEnd - trimStart)}</span></span>
                      </div>
                    </div>
                    <button onClick={() => { setTrimStart(0); setTrimEnd(duration); }} className="text-[rgba(184,134,11,0.4)] hover:text-[#ffd700] text-[10px] transition-colors">Reset trim</button>
                  </div>
                )}
              </div>
            )}

            {/* ─ Timeline ─ */}
            <div className="flex-shrink-0 bg-[#050505] border-t border-[rgba(184,134,11,0.15)] px-3 pt-1 pb-2">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-[rgba(184,134,11,0.35)] text-[8px] uppercase tracking-widest">Timeline</span>
                <div className="flex-1 h-px bg-[rgba(184,134,11,0.07)]" />
                {activeMusicTrack && (
                  <div className="flex items-center gap-1">
                    <div className="w-1.5 h-1.5 rounded-full bg-[#ffd700] animate-pulse" />
                    <span className="text-[8px] text-[rgba(184,134,11,0.6)]">{activeMusicTrack.title}</span>
                  </div>
                )}
              </div>
              <div
                ref={timelineRef}
                className="relative h-10 rounded-lg bg-[#0a0a0a] border border-[rgba(184,134,11,0.12)] overflow-visible cursor-pointer"
                onClick={(e) => { if (trimDragRef.current) return; const r = e.currentTarget.getBoundingClientRect(); seekTo(((e.clientX - r.left) / r.width) * duration); }}
                onPointerMove={onTrimMove}
                onPointerUp={() => { trimDragRef.current = null; }}
              >
                {/* Dim outside trim */}
                <div className="absolute top-0 bottom-0 bg-[rgba(0,0,0,0.55)] rounded-l-lg" style={{ left: 0, width: `${trimStartPct}%` }} />
                <div className="absolute top-0 bottom-0 bg-[rgba(0,0,0,0.55)] rounded-r-lg" style={{ left: `${trimEndPct}%`, right: 0 }} />

                {/* Waveform */}
                <div className="absolute top-0 bottom-0 overflow-hidden" style={{ left: `${trimStartPct}%`, width: `${trimEndPct - trimStartPct}%` }}>
                  <WaveformCanvas analyser={analyserRef.current} isPlaying={isPlaying} waveformData={waveformData} isExporting={exporting} />
                </div>

                {/* Music bar at bottom of timeline */}
                {activeMusicTrack && (
                  <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-[rgba(184,134,11,0.5)] to-[rgba(255,215,0,0.3)] rounded-b-lg" />
                )}

                {/* Keyframe dots for selected overlay */}
                {selectedOverlayId && textOverlays.find((t) => t.id === selectedOverlayId)?.keyframes.map((kf) => (
                  <div key={kf.time}
                    className="absolute top-1/2 -translate-y-1/2 w-2.5 h-2.5 rounded-full bg-[#ffd700] border border-[rgba(0,0,0,0.5)] z-10 shadow-[0_0_6px_rgba(255,215,0,0.7)]"
                    style={{ left: `calc(${(kf.time / duration) * 100}% - 5px)` }}
                    title={`KF @ ${formatTime(kf.time)}`}
                  />
                ))}

                {/* Trim handles */}
                {["start", "end"].map((side) => {
                  const pos = side === "start" ? trimStartPct : trimEndPct;
                  return (
                    <div key={side} className="absolute top-0 bottom-0 w-3 cursor-col-resize flex items-center justify-center z-10 group"
                      style={{ left: `calc(${pos}% - 6px)`, touchAction: "none" }}
                      onPointerDown={(e) => startTrimDrag(side as "start" | "end", e)}>
                      <div className="w-1.5 h-full bg-[#ffd700] rounded group-hover:w-2 transition-all shadow-[0_0_5px_rgba(255,215,0,0.7)]" />
                      <div className={`absolute ${side === "start" ? "top-0" : "bottom-0"} w-3.5 h-3.5 bg-[#ffd700] rounded-full -translate-x-1/2 left-1/2 shadow-[0_0_8px_rgba(255,215,0,0.7)]`} />
                    </div>
                  );
                })}

                {/* Playhead */}
                <div className="absolute top-0 bottom-0 w-0.5 bg-white shadow-[0_0_4px_rgba(255,255,255,0.8)] z-20 pointer-events-none" style={{ left: `${pct}%` }}>
                  <div className="absolute -top-0.5 left-1/2 -translate-x-1/2 w-2.5 h-2.5 rounded-full bg-white shadow-[0_0_8px_rgba(255,255,255,0.8)]" />
                </div>
              </div>
              <div className="flex justify-between mt-0.5 px-0.5">
                {[0, 0.25, 0.5, 0.75, 1].map((f) => (
                  <span key={f} className="text-[7px] font-mono text-[rgba(184,134,11,0.25)]">{formatTime(f * duration)}</span>
                ))}
              </div>
            </div>
          </div>
        </>
      )}

      {/* ── Viral Lock Modal ── */}
      {showLockModal && (
        <ViralLockModal
          onUnlock={() => {
            setShowLockModal(false);
            setActivePanel("bgswap");
            setBgSwapEnabled(true);
          }}
          onClose={() => setShowLockModal(false)}
        />
      )}
    </div>
  );
}
