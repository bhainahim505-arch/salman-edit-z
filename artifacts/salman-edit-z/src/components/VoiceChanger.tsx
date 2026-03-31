import { useRef, useState, useCallback } from "react";

type VoicePreset = { id: string; name: string; emoji: string; detune: number; robot?: boolean };

const PRESETS: VoicePreset[] = [
  { id: "normal",   name: "Normal",    emoji: "🎙️", detune: 0 },
  { id: "cartoon",  name: "Cartoon",   emoji: "🐭", detune: 700 },
  { id: "chipmunk", name: "Chipmunk",  emoji: "🐿️", detune: 1200 },
  { id: "baby",     name: "Baby",      emoji: "👶", detune: 450 },
  { id: "giant",    name: "Giant",     emoji: "👹", detune: -1000 },
  { id: "deep",     name: "Deep God",  emoji: "😈", detune: -1500 },
  { id: "robot",    name: "Robot",     emoji: "🤖", detune: 0, robot: true },
];

function audioBufferToWav(buffer: AudioBuffer): Blob {
  const numCh = buffer.numberOfChannels;
  const sr = buffer.sampleRate;
  const len = buffer.length * numCh * 2;
  const ab = new ArrayBuffer(44 + len);
  const v = new DataView(ab);
  const ws = (off: number, s: string) => { for (let i = 0; i < s.length; i++) v.setUint8(off + i, s.charCodeAt(i)); };
  ws(0, "RIFF"); v.setUint32(4, 36 + len, true); ws(8, "WAVE");
  ws(12, "fmt "); v.setUint32(16, 16, true); v.setUint16(20, 1, true);
  v.setUint16(22, numCh, true); v.setUint32(24, sr, true);
  v.setUint32(28, sr * numCh * 2, true); v.setUint16(32, numCh * 2, true);
  v.setUint16(34, 16, true); ws(36, "data"); v.setUint32(40, len, true);
  let off = 44;
  for (let i = 0; i < buffer.length; i++) {
    for (let ch = 0; ch < numCh; ch++) {
      const s = Math.max(-1, Math.min(1, buffer.getChannelData(ch)[i]));
      v.setInt16(off, s < 0 ? s * 0x8000 : s * 0x7fff, true);
      off += 2;
    }
  }
  return new Blob([ab], { type: "audio/wav" });
}

function makeDistortionCurve(): Float32Array {
  const n = 256, curve = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    const x = (i * 2) / n - 1;
    curve[i] = ((Math.PI + 200) * x) / (Math.PI + 200 * Math.abs(x));
  }
  return curve;
}

export default function VoiceChanger() {
  const [recording, setRecording] = useState(false);
  const [hasRecording, setHasRecording] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [preset, setPreset] = useState<VoicePreset>(PRESETS[0]);
  const [err, setErr] = useState("");
  const [recSecs, setRecSecs] = useState(0);

  const mrRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const rawBufRef = useRef<AudioBuffer | null>(null);
  const srcRef = useRef<AudioBufferSourceNode | null>(null);
  const actxRef = useRef<AudioContext | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval>>(undefined);

  const getCtx = () => {
    if (!actxRef.current) actxRef.current = new AudioContext();
    actxRef.current.resume();
    return actxRef.current;
  };

  const startRec = useCallback(async () => {
    setErr("");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      chunksRef.current = [];
      setRecSecs(0);
      timerRef.current = setInterval(() => setRecSecs((s) => s + 1), 1000);

      const mr = new MediaRecorder(stream);
      mr.ondataavailable = (e) => { if (e.data.size > 0) chunksRef.current.push(e.data); };
      mr.onstop = async () => {
        clearInterval(timerRef.current);
        stream.getTracks().forEach((t) => t.stop());
        const blob = new Blob(chunksRef.current, { type: "audio/webm" });
        const ab = await blob.arrayBuffer();
        const ctx = getCtx();
        try {
          rawBufRef.current = await ctx.decodeAudioData(ab);
          setHasRecording(true);
        } catch {
          setErr("Decoding failed — try recording again.");
        }
      };
      mr.start();
      mrRef.current = mr;
      setRecording(true);
    } catch {
      setErr("Mic access denied. Allow microphone in browser settings.");
    }
  }, []);

  const stopRec = useCallback(() => {
    mrRef.current?.stop();
    setRecording(false);
  }, []);

  const playVoice = useCallback(() => {
    const buf = rawBufRef.current;
    if (!buf) return;
    srcRef.current?.stop();

    const ctx = getCtx();
    const src = ctx.createBufferSource();
    src.buffer = buf;
    src.detune.value = preset.detune;

    if (preset.robot) {
      const osc = ctx.createOscillator();
      osc.type = "sawtooth";
      osc.frequency.value = 80;
      const ringGain = ctx.createGain();
      ringGain.gain.value = 0;
      osc.connect(ringGain.gain);
      osc.start();
      const ws = ctx.createWaveShaper();
      ws.curve = makeDistortionCurve();
      ws.oversample = "4x";
      const outGain = ctx.createGain();
      outGain.gain.value = 0.75;
      src.connect(ringGain);
      ringGain.connect(ws);
      ws.connect(outGain);
      outGain.connect(ctx.destination);
    } else {
      src.connect(ctx.destination);
    }

    src.onended = () => setPlaying(false);
    src.start();
    srcRef.current = src;
    setPlaying(true);
  }, [preset]);

  const stopPlay = useCallback(() => {
    srcRef.current?.stop();
    setPlaying(false);
  }, []);

  const download = useCallback(() => {
    const buf = rawBufRef.current;
    if (!buf) return;
    const ctx = getCtx();

    if (preset.robot) {
      const wavBlob = audioBufferToWav(buf);
      const url = URL.createObjectURL(wavBlob);
      const a = document.createElement("a"); a.href = url; a.download = "voice-robot.wav"; a.click();
      URL.revokeObjectURL(url);
      return;
    }

    const offline = new OfflineAudioContext(buf.numberOfChannels, buf.length, buf.sampleRate);
    const src = offline.createBufferSource();
    src.buffer = buf;
    src.detune.value = preset.detune;
    src.connect(offline.destination);
    src.start();
    offline.startRendering().then((rendered) => {
      const wavBlob = audioBufferToWav(rendered);
      const url = URL.createObjectURL(wavBlob);
      const a = document.createElement("a"); a.href = url; a.download = `voice-${preset.id}.wav`; a.click();
      URL.revokeObjectURL(url);
    }).catch(() => setErr("Export failed."));
    void ctx;
  }, [preset]);

  return (
    <div className="p-2 flex flex-col gap-2">
      {/* Header */}
      <div className="flex items-center gap-2 flex-wrap">
        <button
          onClick={recording ? stopRec : startRec}
          className={`px-3 py-1.5 rounded-xl font-bold text-xs border transition-all ${
            recording
              ? "bg-[rgba(255,50,50,0.18)] border-red-500 text-red-300 animate-pulse"
              : "bg-gradient-to-r from-[#b8860b] to-[#ffd700] border-transparent text-[#0d0d0d]"
          }`}
        >
          {recording ? `⏹ Stop  ${recSecs}s` : "🎙️ Record"}
        </button>

        {hasRecording && !recording && (
          <>
            <button
              onClick={playing ? stopPlay : playVoice}
              className={`px-3 py-1.5 rounded-xl font-bold text-xs border transition-all ${
                playing
                  ? "bg-[rgba(184,134,11,0.18)] border-[#ffd700] text-[#ffd700]"
                  : "border-[rgba(184,134,11,0.3)] text-[rgba(184,134,11,0.7)] hover:text-[#ffd700]"
              }`}
            >
              {playing ? "⏸ Stop" : "▶ Play"}
            </button>
            <button
              onClick={download}
              className="px-3 py-1.5 rounded-xl font-bold text-xs border border-[rgba(184,134,11,0.3)] text-[rgba(184,134,11,0.7)] hover:text-[#ffd700] transition-all"
            >
              ⬇ Save WAV
            </button>
          </>
        )}

        {recording && (
          <div className="flex items-center gap-1.5 ml-auto">
            <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
            <span className="text-red-400 text-[9px] font-mono">REC {recSecs}s</span>
          </div>
        )}
      </div>

      {/* Presets */}
      <div className="grid grid-cols-4 gap-1.5">
        {PRESETS.map((p) => (
          <button
            key={p.id}
            onClick={() => { setPreset(p); if (playing) { stopPlay(); setTimeout(playVoice, 50); } }}
            className={`flex flex-col items-center gap-0.5 px-2 py-2 rounded-xl border transition-all ${
              preset.id === p.id
                ? "bg-[rgba(184,134,11,0.22)] border-[#ffd700] shadow-[0_0_8px_rgba(255,215,0,0.25)]"
                : "bg-[#0d0d0d] border-[rgba(184,134,11,0.15)] hover:border-[rgba(184,134,11,0.4)]"
            }`}
          >
            <span className="text-lg leading-none">{p.emoji}</span>
            <span className={`text-[9px] font-semibold leading-tight text-center ${preset.id === p.id ? "text-[#ffd700]" : "text-[rgba(184,134,11,0.6)]"}`}>
              {p.name}
            </span>
            {p.detune !== 0 && (
              <span className="text-[8px] text-[rgba(184,134,11,0.35)] font-mono">
                {p.detune > 0 ? "+" : ""}{Math.round(p.detune / 100)} st
              </span>
            )}
          </button>
        ))}
      </div>

      {err && <p className="text-red-400 text-[9px]">{err}</p>}

      {!hasRecording && !recording && (
        <p className="text-[rgba(184,134,11,0.3)] text-[9px]">
          Press Record, say something, then press Stop. Pick a voice preset and hit Play!
        </p>
      )}
    </div>
  );
}
