/**
 * BgSwapPanel — 3.5D Parallax Backgrounds + Real-Time Body Segmentation
 *              + Cinematic Auto-Color Light
 *
 * Three systems working together:
 *
 * 1. PARALLAX BACKGROUNDS
 *    City (5 depth layers) and Starship (4 depth layers) animate with
 *    parallax driven by DeviceOrientation (gyroscope) on mobile and mouse
 *    position on desktop. Jungle and Moon have gentler parallax.
 *
 * 2. REAL-TIME BODY SEGMENTATION (MediaPipe Selfie Seg, WebGL)
 *    MediaPipe runs fully on-device at ~30fps. Produces a clean mask
 *    (white=person, black=bg). The person is composited over the 3D bg
 *    via canvas destination-in, producing a crisp edge cut.
 *    Falls back to opacity-blend mode if model fails to load.
 *
 * 3. CINEMATIC AUTO-COLOR LIGHT
 *    After compositing, a background-tuned colored light gradient is
 *    drawn with screen blend mode — simulating environmental bounce light
 *    on the person. City=cyan neon, Jungle=amber, Starship=electric blue,
 *    Moon=cold white.
 *
 * The canvasElRef is exposed to VideoEditor for export bake-in.
 */

import { useEffect, useRef, useState, useCallback } from "react";
import { SegmentationEngine } from "./SegmentationEngine";

export type BgId = "city" | "jungle" | "starship" | "moon" | "wolf_forest" | "palace" | "storm" | "cyber_rain";

export interface BgSwapState {
  bgId: BgId;
  blendOpacity: number;
  segEnabled: boolean;
  autoColorEnabled: boolean;
  autoColorIntensity: number;
}

interface Props {
  enabled: boolean;
  state: BgSwapState;
  videoEl: HTMLVideoElement | null;
  isPlaying: boolean;
  canvasElRef: React.RefObject<HTMLCanvasElement | null>;
  onSegStatusChange?: (status: "idle" | "loading" | "ready" | "failed") => void;
  onMaskUpdate?: (mask: HTMLCanvasElement | null) => void;
}

/* ═══════════════════════════════════════════════════════════════
   PARALLAX BACKGROUND LAYERS
   Each background has N layers. Each layer is drawn with a
   translate offset proportional to its depth factor.
   depth 0 = farthest (moves least), depth 1 = nearest (moves most)
═══════════════════════════════════════════════════════════════ */

const MAX_SHIFT = 62; // max px shift at full tilt — stronger 3D parallax

/* seeded random helpers */
function sr(seed: number) { return (Math.sin(seed * 127.1 + 311.7) * 0.5 + 0.5); }

/* ── CITY LAYER 0: Sky + distant haze ── */
function drawCityL0(ctx: CanvasRenderingContext2D, W: number, H: number) {
  const g = ctx.createLinearGradient(0, 0, 0, H);
  g.addColorStop(0,   "#000010");
  g.addColorStop(0.5, "#080020");
  g.addColorStop(1,   "#100030");
  ctx.fillStyle = g;
  ctx.fillRect(-50, -50, W + 100, H + 100);

  /* Stars */
  for (let i = 0; i < 180; i++) {
    const x = sr(i * 3.1) * W; const y = sr(i * 7.9) * H * 0.7;
    const a = 0.3 + sr(i * 2.3) * 0.5;
    ctx.fillStyle = `rgba(255,255,255,${a})`;
    ctx.fillRect(x, y, sr(i) > 0.7 ? 1.5 : 1, sr(i) > 0.7 ? 1.5 : 1);
  }

  /* Purple moon */
  const mg = ctx.createRadialGradient(W * 0.78, H * 0.09, 0, W * 0.78, H * 0.09, 28);
  mg.addColorStop(0, "rgba(200,160,255,1)");
  mg.addColorStop(0.6, "rgba(140,80,255,0.6)");
  mg.addColorStop(1, "transparent");
  ctx.fillStyle = mg;
  ctx.beginPath(); ctx.arc(W * 0.78, H * 0.09, 28, 0, Math.PI * 2); ctx.fill();
}

/* ── CITY LAYER 1: Far skyline ── */
function drawCityL1(ctx: CanvasRenderingContext2D, W: number, H: number, t: number) {
  const buildings = [
    [0.0, 0.09, 0.60], [0.08, 0.07, 0.72], [0.14, 0.10, 0.52],
    [0.23, 0.05, 0.82], [0.27, 0.09, 0.64], [0.35, 0.11, 0.54],
    [0.45, 0.06, 0.88], [0.50, 0.10, 0.68], [0.59, 0.08, 0.74],
    [0.66, 0.12, 0.56], [0.77, 0.07, 0.80], [0.83, 0.09, 0.62],
    [0.91, 0.08, 0.70], [0.98, 0.10, 0.55],
  ];
  buildings.forEach(([bx, bw, bh], i) => {
    const x = bx * W, w = bw * W, h = bh * H, y = H - h;
    const g = ctx.createLinearGradient(x, y, x + w, y + h);
    g.addColorStop(0, `hsl(${240 + i * 8},40%,9%)`);
    g.addColorStop(1, `hsl(${240 + i * 8},30%,6%)`);
    ctx.fillStyle = g;
    ctx.fillRect(x, y, w, h + 10);

    /* faint neon rim */
    ctx.strokeStyle = i % 3 === 0 ? "rgba(0,180,255,0.25)" : "rgba(160,0,255,0.18)";
    ctx.lineWidth = 0.8;
    ctx.strokeRect(x, y, w, h);

    /* sparse windows */
    const cols = Math.max(2, Math.floor(w / 14));
    const rows = Math.max(3, Math.floor(h / 20));
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        if (sr(i * 100 + r * 17 + c) > 0.55) {
          const flicker = Math.sin(t * 4 + i + r * 2.1 + c * 1.3) > 0.1;
          if (flicker) {
            ctx.fillStyle = r % 3 === 0 ? "rgba(0,200,255,0.7)" : "rgba(255,200,0,0.6)";
            ctx.fillRect(x + c * (w / cols) + 3, y + r * (h / rows) + 4, 4, 6);
          }
        }
      }
    }
  });
}

/* ── CITY LAYER 2: Mid buildings with bright neon ── */
function drawCityL2(ctx: CanvasRenderingContext2D, W: number, H: number, t: number) {
  const buildings = [
    [0.02, 0.13, 0.45], [0.15, 0.10, 0.55], [0.24, 0.15, 0.40],
    [0.38, 0.08, 0.62], [0.45, 0.13, 0.48], [0.57, 0.14, 0.52],
    [0.70, 0.10, 0.58], [0.80, 0.13, 0.43], [0.92, 0.08, 0.50],
  ];
  buildings.forEach(([bx, bw, bh], i) => {
    const x = bx * W, w = bw * W, h = bh * H, y = H - h;
    ctx.fillStyle = `rgba(${8 + i * 3},${4},${20 + i * 4},0.98)`;
    ctx.fillRect(x, y, w, h + 10);

    /* bright neon sign */
    const col = ["#00ffee","#ff00cc","#00ccff","#ff6600"][i % 4];
    ctx.strokeStyle = col;
    ctx.lineWidth = 2;
    ctx.shadowColor = col;
    ctx.shadowBlur = 10 + Math.sin(t * 3 + i) * 4;
    ctx.strokeRect(x + 2, y + 2, w - 4, Math.min(20, h * 0.12));
    ctx.shadowBlur = 0;

    /* windows (denser) */
    const cols = Math.max(3, Math.floor(w / 10));
    const rows = Math.max(4, Math.floor(h / 14));
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const on = sr(i * 200 + r * 31 + c * 7) > 0.4;
        if (on) {
          const a = 0.6 + Math.sin(t * 5 + r + c * 1.7 + i) * 0.3;
          ctx.fillStyle = r % 4 === 0 ? `rgba(0,220,255,${a})` : `rgba(255,180,0,${a})`;
          ctx.fillRect(x + c * (w / cols) + 2, y + r * (h / rows) + 5, 5, 7);
        }
      }
    }
  });
}

/* ── CITY LAYER 3: Ground neon + puddle reflections ── */
function drawCityL3(ctx: CanvasRenderingContext2D, W: number, H: number, t: number) {
  const groundY = H * 0.72;

  /* ground */
  const gg = ctx.createLinearGradient(0, groundY, 0, H);
  gg.addColorStop(0, "#050015");
  gg.addColorStop(1, "#020008");
  ctx.fillStyle = gg;
  ctx.fillRect(-50, groundY, W + 100, H - groundY + 50);

  /* neon ground lines (perspective) */
  ["#00ffee","#ff00cc","#0066ff"].forEach((c, i) => {
    ctx.strokeStyle = c;
    ctx.lineWidth = 1 + i * 0.3;
    ctx.globalAlpha = 0.5 + Math.sin(t * 2 + i * 2.1) * 0.15;
    ctx.shadowColor = c;
    ctx.shadowBlur = 8;
    ctx.beginPath();
    ctx.moveTo(-50, groundY + i * 4);
    ctx.lineTo(W + 50, groundY + i * 4);
    ctx.stroke();
  });
  ctx.shadowBlur = 0;
  ctx.globalAlpha = 1;

  /* puddle reflections — streaky vertical lines */
  for (let i = 0; i < 12; i++) {
    const px = sr(i * 5.7) * W;
    const pw = 2 + sr(i * 11) * 12;
    const col = ["rgba(0,220,255,","rgba(255,0,200,","rgba(0,100,255,"][i % 3];
    const a = (0.15 + Math.sin(t * 3 + i) * 0.1);
    const rg = ctx.createLinearGradient(px, groundY, px, groundY + 60);
    rg.addColorStop(0, col + a + ")");
    rg.addColorStop(1, col + "0)");
    ctx.fillStyle = rg;
    ctx.fillRect(px, groundY, pw, 60);
  }

  /* moving light streaks in sky */
  for (let i = 0; i < 5; i++) {
    const sx = ((t * (0.15 + i * 0.04) + i * 0.22) % 1.2 - 0.1) * W;
    const sy = H * (0.08 + i * 0.06);
    const sg = ctx.createLinearGradient(sx - 100, sy, sx + 60, sy);
    sg.addColorStop(0, "transparent");
    sg.addColorStop(0.4, i % 2 === 0 ? "rgba(0,200,255,0.6)" : "rgba(200,50,255,0.5)");
    sg.addColorStop(1, "transparent");
    ctx.fillStyle = sg;
    ctx.fillRect(sx - 100, sy - 1, 160, 2);
  }
}

/* ── CITY LAYER 4: Nearest elements (advertising panels, lamp posts) ── */
function drawCityL4(ctx: CanvasRenderingContext2D, W: number, H: number, t: number) {
  const groundY = H * 0.72;

  /* lamp posts */
  [0.1, 0.35, 0.65, 0.88].forEach((fx, i) => {
    const x = fx * W;
    ctx.strokeStyle = "#222";
    ctx.lineWidth = 3;
    ctx.beginPath(); ctx.moveTo(x, groundY); ctx.lineTo(x, groundY - H * 0.25); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(x, groundY - H * 0.25); ctx.lineTo(x + 18, groundY - H * 0.25); ctx.stroke();
    /* glow */
    const lg = ctx.createRadialGradient(x + 18, groundY - H * 0.25, 0, x + 18, groundY - H * 0.25, 25);
    lg.addColorStop(0, "rgba(255,200,100,0.9)");
    lg.addColorStop(1, "transparent");
    ctx.fillStyle = lg;
    ctx.beginPath(); ctx.arc(x + 18, groundY - H * 0.25, 25, 0, Math.PI * 2); ctx.fill();
    /* light cone down */
    const cone = ctx.createLinearGradient(x + 18, groundY - H * 0.25, x + 18, groundY);
    cone.addColorStop(0, "rgba(255,200,100,0.12)");
    cone.addColorStop(1, "transparent");
    ctx.fillStyle = cone;
    ctx.beginPath();
    ctx.moveTo(x + 18, groundY - H * 0.25);
    ctx.lineTo(x + 18 - 40, groundY);
    ctx.lineTo(x + 18 + 40, groundY);
    ctx.closePath();
    ctx.fill();
  });

  /* large neon billboard */
  const bx = W * 0.42, by = H * 0.28, bw = W * 0.18, bh = H * 0.12;
  const br = ctx.createLinearGradient(bx, by, bx + bw, by + bh);
  br.addColorStop(0, "#ff00cc");
  br.addColorStop(1, "#0066ff");
  ctx.strokeStyle = "transparent";
  ctx.fillStyle = "rgba(0,0,0,0.7)";
  ctx.fillRect(bx, by, bw, bh);
  ctx.strokeStyle = "#ff00cc";
  ctx.lineWidth = 1.5;
  ctx.shadowColor = "#ff00cc";
  ctx.shadowBlur = 12 + Math.sin(t * 2.5) * 4;
  ctx.strokeRect(bx, by, bw, bh);
  ctx.shadowBlur = 0;

  ctx.fillStyle = "#ff00cc";
  ctx.font = `bold ${bh * 0.5}px monospace`;
  ctx.textAlign = "center";
  ctx.fillText("EDIT-Z", bx + bw / 2, by + bh * 0.65);
  ctx.textAlign = "left";
}

/* ═══════════════════ STARSHIP ════════════════════════════════ */

/* ── STARSHIP LAYER 0: Deep space + nebula ── */
function drawStarL0(ctx: CanvasRenderingContext2D, W: number, H: number) {
  ctx.fillStyle = "#000005";
  ctx.fillRect(-50, -50, W + 100, H + 100);

  /* Stars */
  for (let i = 0; i < 220; i++) {
    const x = sr(i * 2.3) * W, y = sr(i * 5.7) * H;
    const a = 0.3 + sr(i * 1.9) * 0.5;
    ctx.fillStyle = `rgba(255,255,255,${a})`;
    ctx.fillRect(x, y, sr(i * 8.1) > 0.8 ? 1.5 : 1, sr(i * 8.1) > 0.8 ? 1.5 : 1);
  }

  /* Nebula blobs */
  [
    { x: 0.3, y: 0.25, r: 0.4, c: "rgba(40,0,120,0.6)" },
    { x: 0.75, y: 0.55, r: 0.3, c: "rgba(0,40,100,0.5)" },
    { x: 0.55, y: 0.15, r: 0.2, c: "rgba(80,0,80,0.4)" },
  ].forEach(({ x, y, r, c }) => {
    const g = ctx.createRadialGradient(x * W, y * H, 0, x * W, y * H, r * W);
    g.addColorStop(0, c); g.addColorStop(1, "transparent");
    ctx.fillStyle = g; ctx.fillRect(-50, -50, W + 100, H + 100);
  });
}

/* ── STARSHIP LAYER 1: Hex floor (perspective grid) ── */
function drawStarL1(ctx: CanvasRenderingContext2D, W: number, H: number, t: number) {
  const floorY = H * 0.52;
  const sz = W * 0.07;
  ctx.save();
  ctx.globalAlpha = 0.3;
  ctx.strokeStyle = "#00aaff";
  ctx.lineWidth = 0.8;
  ctx.shadowColor = "#00aaff";
  ctx.shadowBlur = 4;

  for (let col = -3; col < 17; col++) {
    for (let row = 0; row < 8; row++) {
      const hx = col * sz * 1.5 + (row % 2) * sz * 0.75;
      const hy = floorY + row * sz * 1.4;
      ctx.beginPath();
      for (let v = 0; v < 6; v++) {
        const a = (v / 6) * Math.PI * 2 - Math.PI / 6;
        const px = hx + sz * 0.5 * Math.cos(a);
        const py = hy + sz * 0.28 * Math.sin(a) * 2.8;
        v === 0 ? ctx.moveTo(px, py) : ctx.lineTo(px, py);
      }
      ctx.closePath();
      ctx.stroke();
    }
  }
  ctx.shadowBlur = 0;
  ctx.restore();

  /* floor glow */
  const fg = ctx.createLinearGradient(0, floorY - 20, 0, H);
  fg.addColorStop(0, "transparent");
  fg.addColorStop(0.3, "rgba(0,100,255,0.18)");
  fg.addColorStop(1, "rgba(0,200,255,0.5)");
  ctx.fillStyle = fg;
  ctx.fillRect(-50, floorY - 20, W + 100, H - floorY + 70);
}

/* ── STARSHIP LAYER 2: Side wall panels + console lights ── */
function drawStarL2(ctx: CanvasRenderingContext2D, W: number, H: number, t: number) {
  /* walls */
  [[0, 0, W * 0.13, H], [W * 0.87, 0, W * 0.13, H]].forEach(([x, y, w, h], side) => {
    const pg = ctx.createLinearGradient(x, 0, x + w * (side ? -1 : 1), 0);
    pg.addColorStop(0, "rgba(0,30,80,0.95)");
    pg.addColorStop(1, "rgba(0,10,30,0.5)");
    ctx.fillStyle = pg;
    ctx.fillRect(x, y, w, h);

    /* panel grid */
    for (let r = 0; r < 9; r++) {
      for (let c = 0; c < 2; c++) {
        const px = x + c * w * 0.48 + w * 0.06;
        const py = r * H / 9 + 4;
        const ph = H / 9 - 8;
        ctx.strokeStyle = "rgba(0,150,255,0.4)";
        ctx.lineWidth = 0.5;
        ctx.strokeRect(px, py, w * 0.4, ph);

        /* random lights */
        if (sr(r * 13 + c * 7 + side * 100) > 0.6) {
          const lc = ["#00ffcc","#ff3300","#0088ff"][Math.floor(sr(r * 31 + c) * 3)];
          const a = 0.6 + Math.sin(t * 3 + r + c) * 0.3;
          ctx.fillStyle = lc.replace(")", `,${a})`).replace("#", "rgba(").replace(/^rgba\(/, "rgba(").replace(/([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})/, (_, r, g, b) => `${parseInt(r, 16)},${parseInt(g, 16)},${parseInt(b, 16)},`).replace(",,", ",").replace(",)", ")");
          ctx.fillStyle = lc;
          ctx.globalAlpha = a;
          ctx.fillRect(px + 3, py + 3, 5, 5);
          ctx.globalAlpha = 1;
        }
      }
    }
  });
}

/* ── STARSHIP LAYER 3: Engine pulse + viewport window ── */
function drawStarL3(ctx: CanvasRenderingContext2D, W: number, H: number, t: number) {
  /* engine rings at bottom */
  for (let i = 0; i < 4; i++) {
    const phase = (t * 0.7 + i * 0.25) % 1;
    const r = phase * W * 0.55;
    const a = (1 - phase) * 0.45;
    ctx.strokeStyle = `rgba(0,200,255,${a})`;
    ctx.lineWidth = 2.5;
    ctx.beginPath(); ctx.arc(W * 0.5, H * 1.15, r, 0, Math.PI * 2); ctx.stroke();
  }

  /* engine core glow */
  const eg = ctx.createRadialGradient(W * 0.5, H * 1.1, 0, W * 0.5, H * 1.1, W * 0.28);
  eg.addColorStop(0, "rgba(0,230,255,0.9)");
  eg.addColorStop(0.4, "rgba(0,100,255,0.5)");
  eg.addColorStop(1, "transparent");
  ctx.fillStyle = eg;
  ctx.fillRect(0, H * 0.6, W, H * 0.4);

  /* central viewport / window */
  const vx = W * 0.3, vy = H * 0.06, vw = W * 0.4, vh = H * 0.35;
  const vg = ctx.createLinearGradient(vx, vy, vx + vw, vy + vh);
  vg.addColorStop(0, "rgba(0,5,20,0.95)");
  vg.addColorStop(1, "rgba(0,10,40,0.85)");
  ctx.fillStyle = vg;
  ctx.beginPath();
  ctx.roundRect(vx, vy, vw, vh, [8]);
  ctx.fill();
  ctx.strokeStyle = "rgba(0,150,255,0.7)";
  ctx.lineWidth = 1.5;
  ctx.stroke();
}

/* ════════════════ JUNGLE (2-layer parallax) ═════════════════ */

function drawJungleL0(ctx: CanvasRenderingContext2D, W: number, H: number, t: number) {
  const g = ctx.createLinearGradient(0, 0, 0, H * 0.6);
  g.addColorStop(0, "#0d0400"); g.addColorStop(0.4, "#3d1400"); g.addColorStop(1, "#6b2800");
  ctx.fillStyle = g; ctx.fillRect(-50, -50, W + 100, H + 100);

  /* sun */
  const sg = ctx.createRadialGradient(W * 0.5, H * 0.06, 0, W * 0.5, H * 0.06, W * 0.2);
  sg.addColorStop(0, "rgba(255,240,100,1)"); sg.addColorStop(0.5, "rgba(255,160,0,0.5)"); sg.addColorStop(1, "transparent");
  ctx.fillStyle = sg; ctx.fillRect(-50, -50, W + 100, H / 2 + 50);

  for (let i = 0; i < 20; i++) {
    const ang = (i / 20) * Math.PI * 2 + t * 0.08;
    const len = W * (0.55 + Math.sin(t + i) * 0.08);
    const a = 0.035 + Math.sin(t * 1.2 + i) * 0.015;
    ctx.strokeStyle = `rgba(255,200,50,${a})`; ctx.lineWidth = W * 0.04;
    ctx.beginPath(); ctx.moveTo(W * 0.5, H * 0.06);
    ctx.lineTo(W * 0.5 + Math.cos(ang) * len, H * 0.06 + Math.sin(ang) * len); ctx.stroke();
  }
}

function drawJungleL1(ctx: CanvasRenderingContext2D, W: number, H: number, t: number) {
  const gnd = ctx.createLinearGradient(0, H * 0.45, 0, H);
  gnd.addColorStop(0, "#061a00"); gnd.addColorStop(1, "#030d00");
  ctx.fillStyle = gnd; ctx.fillRect(-50, H * 0.45, W + 100, H * 0.6);

  /* trees */
  const COLS = ["#020a00","#030d00","#040f00","#020800"];
  for (let i = 0; i < 26; i++) {
    const tx = sr(i * 3.1) * W * 1.2 - W * 0.1;
    const th = H * (0.28 + sr(i * 7.3) * 0.18);
    const tw = W * (0.05 + sr(i * 2.9) * 0.04);
    ctx.fillStyle = COLS[i % 4];
    ctx.fillRect(tx + tw * 0.35, H - th * 0.3, tw * 0.3, th * 0.3);
    ctx.beginPath(); ctx.arc(tx + tw * 0.5, H - th * 0.38, tw * 0.9, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(tx + tw * 0.2, H - th * 0.28, tw * 0.65, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(tx + tw * 0.8, H - th * 0.25, tw * 0.58, 0, Math.PI * 2); ctx.fill();
  }

  /* floating pollen */
  for (let i = 0; i < 55; i++) {
    const px = (sr(i * 4.1) * W + t * (18 + sr(i) * 12)) % W;
    const py = (sr(i * 9.3) * H + Math.sin(t * 0.6 + i) * 10) % H;
    const a = 0.2 + Math.sin(t + i) * 0.25;
    ctx.fillStyle = `rgba(255,200,20,${a})`;
    ctx.beginPath(); ctx.arc(px, py, 1 + sr(i * 2) * 1.5, 0, Math.PI * 2); ctx.fill();
  }
}

/* ════════════════ WOLF FOREST (3-layer parallax) ═══════════ */

function drawWolfL0(ctx: CanvasRenderingContext2D, W: number, H: number, t: number) {
  /* Night sky with deep violet aurora */
  const g = ctx.createLinearGradient(0, 0, 0, H);
  g.addColorStop(0, "#04000e");
  g.addColorStop(0.5, "#0a0020");
  g.addColorStop(1, "#14002a");
  ctx.fillStyle = g;
  ctx.fillRect(-50, -50, W + 100, H + 100);

  /* Stars */
  for (let i = 0; i < 160; i++) {
    const a = 0.25 + sr(i * 1.9) * 0.55;
    ctx.fillStyle = `rgba(220,200,255,${a})`;
    const x = sr(i * 5.3) * W; const y = sr(i * 8.7) * H * 0.65;
    ctx.fillRect(x, y, sr(i) > 0.82 ? 2 : 1, sr(i) > 0.82 ? 2 : 1);
  }

  /* Moon */
  const mg = ctx.createRadialGradient(W * 0.2, H * 0.1, 0, W * 0.2, H * 0.1, 22);
  mg.addColorStop(0, "rgba(230,220,255,1)");
  mg.addColorStop(0.55, "rgba(180,150,255,0.6)");
  mg.addColorStop(1, "transparent");
  ctx.fillStyle = mg;
  ctx.beginPath(); ctx.arc(W * 0.2, H * 0.1, 22, 0, Math.PI * 2); ctx.fill();

  /* Aurora bands */
  for (let i = 0; i < 4; i++) {
    const ay = H * (0.15 + i * 0.08);
    const aGrad = ctx.createLinearGradient(0, ay - 18, 0, ay + 18);
    const alpha = 0.04 + Math.sin(t * 0.7 + i * 1.5) * 0.025;
    const col = i % 2 === 0 ? `rgba(80,0,180,${alpha})` : `rgba(160,0,200,${alpha})`;
    aGrad.addColorStop(0, "transparent");
    aGrad.addColorStop(0.5, col);
    aGrad.addColorStop(1, "transparent");
    ctx.fillStyle = aGrad;
    ctx.fillRect(-50, ay - 18, W + 100, 36);
  }
}

function drawWolfL1(ctx: CanvasRenderingContext2D, W: number, H: number, t: number) {
  /* Far tree silhouettes */
  for (let i = 0; i < 32; i++) {
    const tx = sr(i * 4.1) * W * 1.1 - W * 0.05;
    const th = H * (0.18 + sr(i * 6.2) * 0.14);
    const tw = W * (0.025 + sr(i * 2.2) * 0.02);
    const sway = Math.sin(t * 0.6 + i * 0.8) * 2;
    ctx.save();
    ctx.translate(sway, 0);
    ctx.fillStyle = `rgba(${8 + i % 4},0,${18 + i % 6},0.96)`;
    /* trunk */
    ctx.fillRect(tx + tw * 0.42, H - th * 0.22, tw * 0.16, th * 0.22);
    /* canopy triangle */
    ctx.beginPath();
    ctx.moveTo(tx + tw * 0.5, H - th);
    ctx.lineTo(tx, H - th * 0.3);
    ctx.lineTo(tx + tw, H - th * 0.3);
    ctx.closePath(); ctx.fill();
    ctx.restore();
  }
  /* ground mist */
  const mist = ctx.createLinearGradient(0, H * 0.72, 0, H);
  mist.addColorStop(0, "transparent");
  mist.addColorStop(0.5, "rgba(60,0,100,0.18)");
  mist.addColorStop(1, "rgba(40,0,70,0.28)");
  ctx.fillStyle = mist; ctx.fillRect(-50, H * 0.72, W + 100, H * 0.28 + 50);
}

function drawWolfL2(ctx: CanvasRenderingContext2D, W: number, H: number, t: number) {
  /* Near pine trees with glow */
  const treeColors = ["#0d0020", "#0a001a", "#120028", "#0e001e"];
  const treeData: { tx: number; th: number; tw: number }[] = [];
  for (let i = 0; i < 14; i++) {
    const tx = sr(i * 7.3) * W * 1.3 - W * 0.15;
    const th = H * (0.30 + sr(i * 3.1) * 0.20);
    const tw = W * (0.06 + sr(i * 5.5) * 0.04);
    const sway = Math.sin(t * 0.5 + i * 1.2) * 3;
    treeData.push({ tx: tx + sway, th, tw });
    ctx.save();
    ctx.translate(sway, 0);
    ctx.fillStyle = treeColors[i % 4];
    ctx.fillRect(tx + tw * 0.44, H - th * 0.15, tw * 0.12, th * 0.15);
    ctx.beginPath();
    ctx.moveTo(tx + tw * 0.5, H - th);
    ctx.lineTo(tx - tw * 0.1, H - th * 0.28);
    ctx.lineTo(tx + tw * 1.1, H - th * 0.28);
    ctx.closePath(); ctx.fill();
    const glow = ctx.createRadialGradient(tx + tw * 0.5, H - th * 0.28, 0, tx + tw * 0.5, H - th * 0.28, tw * 1.5);
    glow.addColorStop(0, "rgba(140,0,200,0.08)");
    glow.addColorStop(1, "transparent");
    ctx.fillStyle = glow;
    ctx.fillRect(tx - tw, H - th * 0.45, tw * 3, th * 0.3);
    ctx.restore();
  }

  /* ── 3D Reflective floor ── */
  const floorY = H * 0.72;
  /* glossy floor base */
  const floorGrad = ctx.createLinearGradient(0, floorY, 0, H);
  floorGrad.addColorStop(0, "rgba(30,0,50,0.92)");
  floorGrad.addColorStop(0.5, "rgba(15,0,30,0.97)");
  floorGrad.addColorStop(1, "#06000e");
  ctx.fillStyle = floorGrad;
  ctx.fillRect(-50, floorY, W + 100, H - floorY + 50);

  /* reflection of trees flipped below floorY */
  ctx.save();
  ctx.beginPath(); ctx.rect(-50, floorY, W + 100, H - floorY + 50); ctx.clip();
  ctx.translate(0, floorY * 2);
  ctx.scale(1, -1);
  for (const { tx, th, tw } of treeData) {
    const reflAlpha = 0.22;
    ctx.fillStyle = `rgba(60,0,90,${reflAlpha})`;
    ctx.fillRect(tx + tw * 0.44, H - th * 0.15, tw * 0.12, th * 0.15);
    ctx.beginPath();
    ctx.moveTo(tx + tw * 0.5, H - th);
    ctx.lineTo(tx - tw * 0.1, H - th * 0.28);
    ctx.lineTo(tx + tw * 1.1, H - th * 0.28);
    ctx.closePath(); ctx.fill();
  }
  ctx.restore();

  /* fade-out for reflection (further = more faded) */
  const reflFade = ctx.createLinearGradient(0, floorY, 0, H);
  reflFade.addColorStop(0, "transparent");
  reflFade.addColorStop(0.45, "rgba(6,0,14,0.7)");
  reflFade.addColorStop(1, "#06000e");
  ctx.fillStyle = reflFade;
  ctx.fillRect(-50, floorY, W + 100, H - floorY + 50);

  /* perspective floor grid lines */
  const vx = W * 0.5, vy = floorY;
  ctx.save();
  ctx.globalAlpha = 0.10;
  ctx.strokeStyle = "rgba(180,0,255,1)";
  ctx.lineWidth = 0.7;
  for (let i = 0; i <= 12; i++) {
    const bx = W * (i / 12);
    ctx.beginPath(); ctx.moveTo(vx, vy); ctx.lineTo(bx, H + 10); ctx.stroke();
  }
  for (let j = 1; j <= 6; j++) {
    const fy = floorY + (H - floorY) * (j / 6);
    ctx.beginPath(); ctx.moveTo(-20, fy); ctx.lineTo(W + 20, fy); ctx.stroke();
  }
  ctx.restore();

  /* ── Wolf head silhouette ── */
  const wx = W * 0.5 + Math.sin(t * 0.18) * W * 0.03;
  const wy = H * 0.76;
  const ws = H * 0.28; /* head size */
  ctx.save();
  ctx.fillStyle = "#060010";
  /* skull */
  ctx.beginPath();
  ctx.ellipse(wx, wy - ws * 0.38, ws * 0.38, ws * 0.32, 0, 0, Math.PI * 2);
  ctx.fill();
  /* left ear */
  ctx.beginPath();
  ctx.moveTo(wx - ws * 0.28, wy - ws * 0.6);
  ctx.lineTo(wx - ws * 0.48, wy - ws * 1.02);
  ctx.lineTo(wx - ws * 0.08, wy - ws * 0.68);
  ctx.closePath(); ctx.fill();
  /* right ear */
  ctx.beginPath();
  ctx.moveTo(wx + ws * 0.28, wy - ws * 0.6);
  ctx.lineTo(wx + ws * 0.48, wy - ws * 1.02);
  ctx.lineTo(wx + ws * 0.08, wy - ws * 0.68);
  ctx.closePath(); ctx.fill();
  /* snout */
  ctx.beginPath();
  ctx.ellipse(wx, wy - ws * 0.12, ws * 0.22, ws * 0.18, 0, 0, Math.PI * 2);
  ctx.fill();
  /* neck/body merge */
  ctx.beginPath();
  ctx.moveTo(wx - ws * 0.35, wy - ws * 0.1);
  ctx.quadraticCurveTo(wx, wy + ws * 0.1, wx + ws * 0.35, wy - ws * 0.1);
  ctx.lineTo(wx + ws * 0.42, wy + ws * 0.25);
  ctx.lineTo(wx - ws * 0.42, wy + ws * 0.25);
  ctx.closePath(); ctx.fill();
  ctx.restore();

  /* wolf head glow aura */
  const wolfAura = ctx.createRadialGradient(wx, wy - ws * 0.45, 0, wx, wy - ws * 0.45, ws * 0.7);
  wolfAura.addColorStop(0, `rgba(120,0,220,${0.10 + Math.sin(t * 1.2) * 0.04})`);
  wolfAura.addColorStop(1, "transparent");
  ctx.fillStyle = wolfAura;
  ctx.beginPath(); ctx.ellipse(wx, wy - ws * 0.35, ws * 0.7, ws * 0.7, 0, 0, Math.PI * 2); ctx.fill();

  /* Wolf eyes (glowing pair) */
  const ey = wy - ws * 0.42;
  for (let s = -1; s <= 1; s += 2) {
    const eyeGlow = ctx.createRadialGradient(wx + s * ws * 0.16, ey, 0, wx + s * ws * 0.16, ey, ws * 0.10);
    eyeGlow.addColorStop(0, `rgba(255,230,0,${0.85 + Math.sin(t * 2) * 0.1})`);
    eyeGlow.addColorStop(0.4, "rgba(255,160,0,0.45)");
    eyeGlow.addColorStop(1, "transparent");
    ctx.fillStyle = eyeGlow;
    ctx.beginPath(); ctx.ellipse(wx + s * ws * 0.16, ey, ws * 0.08, ws * 0.05, 0, 0, Math.PI * 2); ctx.fill();
    /* pupil slit */
    ctx.fillStyle = "#000";
    ctx.beginPath(); ctx.ellipse(wx + s * ws * 0.16, ey, ws * 0.018, ws * 0.042, 0, 0, Math.PI * 2); ctx.fill();
  }

  /* wolf head reflection on floor */
  ctx.save();
  ctx.beginPath(); ctx.rect(-50, floorY, W + 100, H - floorY + 50); ctx.clip();
  ctx.globalAlpha = 0.18;
  ctx.translate(0, floorY * 2);
  ctx.scale(1, -1);
  ctx.fillStyle = "#060010";
  ctx.beginPath(); ctx.ellipse(wx, wy - ws * 0.38, ws * 0.38, ws * 0.32, 0, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath();
  ctx.moveTo(wx - ws * 0.35, wy - ws * 0.1);
  ctx.quadraticCurveTo(wx, wy + ws * 0.1, wx + ws * 0.35, wy - ws * 0.1);
  ctx.lineTo(wx + ws * 0.42, wy + ws * 0.25);
  ctx.lineTo(wx - ws * 0.42, wy + ws * 0.25);
  ctx.closePath(); ctx.fill();
  ctx.restore();
}

/* ════════════════ PALACE (3-layer parallax) ═════════════════ */

function drawPalaceL0(ctx: CanvasRenderingContext2D, W: number, H: number, t: number) {
  /* Dusk gradient sky */
  const g = ctx.createLinearGradient(0, 0, 0, H);
  g.addColorStop(0, "#0a0005");
  g.addColorStop(0.35, "#1a0530");
  g.addColorStop(0.65, "#3d0a0a");
  g.addColorStop(1, "#6b1010");
  ctx.fillStyle = g; ctx.fillRect(-50, -50, W + 100, H + 100);

  /* Stars */
  for (let i = 0; i < 120; i++) {
    const a = 0.2 + sr(i * 3.7) * 0.6;
    ctx.fillStyle = `rgba(255,230,200,${a})`;
    ctx.fillRect(sr(i * 4.1) * W, sr(i * 9.3) * H * 0.5, 1, 1);
  }

  /* Gold sun glow on horizon */
  const sun = ctx.createRadialGradient(W * 0.5, H * 0.55, 0, W * 0.5, H * 0.55, W * 0.6);
  sun.addColorStop(0, `rgba(255,180,30,${0.15 + Math.sin(t * 0.3) * 0.04})`);
  sun.addColorStop(0.4, "rgba(200,80,0,0.08)");
  sun.addColorStop(1, "transparent");
  ctx.fillStyle = sun; ctx.fillRect(-50, -50, W + 100, H + 100);
}

function drawPalaceL1(ctx: CanvasRenderingContext2D, W: number, H: number, t: number) {
  /* Far palace silhouette — multiple minarets */
  const palaceBase = H * 0.55;

  const drawMinaret = (cx: number, mH: number, mW: number) => {
    /* main body */
    ctx.fillRect(cx - mW * 0.5, palaceBase - mH, mW, mH);
    /* dome top */
    ctx.beginPath();
    ctx.ellipse(cx, palaceBase - mH, mW * 0.7, mH * 0.18, 0, Math.PI, 0, true);
    ctx.fill();
    /* spire */
    ctx.beginPath();
    ctx.moveTo(cx, palaceBase - mH - mH * 0.22);
    ctx.lineTo(cx - mW * 0.1, palaceBase - mH);
    ctx.lineTo(cx + mW * 0.1, palaceBase - mH);
    ctx.closePath(); ctx.fill();
  };

  ctx.fillStyle = "#1a0520";
  /* central large dome */
  const cW = W * 0.22, cH = H * 0.28;
  ctx.fillRect(W * 0.5 - cW * 0.5, palaceBase - cH * 0.7, cW, cH * 0.7);
  ctx.beginPath();
  ctx.ellipse(W * 0.5, palaceBase - cH * 0.7, cW * 0.55, cH * 0.35, 0, Math.PI, 0, true);
  ctx.fill();
  /* flat side wings */
  ctx.fillRect(W * 0.28, palaceBase - H * 0.15, W * 0.44, H * 0.15);
  /* minarets */
  drawMinaret(W * 0.28, H * 0.22, W * 0.045);
  drawMinaret(W * 0.72, H * 0.22, W * 0.045);
  drawMinaret(W * 0.14, H * 0.16, W * 0.032);
  drawMinaret(W * 0.86, H * 0.16, W * 0.032);

  /* Gold window glints */
  for (let i = 0; i < 12; i++) {
    const wx = W * (0.3 + sr(i * 3.3) * 0.4);
    const wy = palaceBase - H * (0.04 + sr(i * 7.1) * 0.1);
    const gAlpha = 0.3 + Math.sin(t * 2 + i * 1.8) * 0.2;
    ctx.fillStyle = `rgba(255,200,60,${gAlpha})`;
    ctx.fillRect(wx, wy, 4, 6);
  }
}

function drawPalaceL2(ctx: CanvasRenderingContext2D, W: number, H: number, t: number) {
  const floorY = H * 0.55;

  /* Ground — glossy marble courtyard */
  const floor = ctx.createLinearGradient(0, floorY, 0, H);
  floor.addColorStop(0, "#22063a");
  floor.addColorStop(0.35, "#2a0c18");
  floor.addColorStop(1, "#0c0310");
  ctx.fillStyle = floor; ctx.fillRect(-50, floorY, W + 100, H - floorY + 50);

  /* ── 3D perspective grid on marble floor ── */
  const vx = W * 0.5, vy = floorY;
  ctx.save();
  ctx.globalAlpha = 0.09;
  ctx.strokeStyle = "rgba(255,200,60,1)";
  ctx.lineWidth = 0.8;
  /* radial vanishing lines */
  for (let i = 0; i <= 16; i++) {
    const bx = W * (i / 16);
    ctx.beginPath(); ctx.moveTo(vx, vy); ctx.lineTo(bx, H + 20); ctx.stroke();
  }
  /* horizontal depth lines */
  for (let j = 1; j <= 8; j++) {
    const fy = floorY + (H - floorY) * Math.pow(j / 8, 0.7);
    ctx.beginPath(); ctx.moveTo(-20, fy); ctx.lineTo(W + 20, fy); ctx.stroke();
  }
  ctx.restore();

  /* ── Palace reflection on floor ── */
  ctx.save();
  ctx.beginPath(); ctx.rect(-50, floorY, W + 100, H - floorY + 50); ctx.clip();
  /* flip about floorY */
  ctx.translate(0, floorY * 2);
  ctx.scale(1, -1);
  /* draw simplified palace silhouette as reflection */
  const palaceBase = H * 0.55;
  ctx.globalAlpha = 0.14 + Math.sin(t * 0.4) * 0.03;
  ctx.fillStyle = "#3d0a60";
  /* central dome */
  ctx.beginPath();
  ctx.ellipse(W * 0.5, palaceBase - H * 0.196, W * 0.121, H * 0.21, 0, Math.PI, 0, true);
  ctx.fill();
  ctx.fillRect(W * 0.5 - W * 0.11, palaceBase - H * 0.196, W * 0.22, H * 0.196);
  /* side wings */
  ctx.fillRect(W * 0.28, palaceBase - H * 0.15, W * 0.44, H * 0.15);
  /* gold glow on reflection */
  const rGlow = ctx.createLinearGradient(0, palaceBase - H * 0.3, 0, palaceBase);
  rGlow.addColorStop(0, "transparent");
  rGlow.addColorStop(1, `rgba(255,180,30,0.12)`);
  ctx.fillStyle = rGlow;
  ctx.fillRect(W * 0.28, palaceBase - H * 0.3, W * 0.44, H * 0.3);
  ctx.restore();

  /* reflection fade-out overlay */
  const reflFade = ctx.createLinearGradient(0, floorY, 0, H);
  reflFade.addColorStop(0, "transparent");
  reflFade.addColorStop(0.4, `rgba(12,3,16,0.72)`);
  reflFade.addColorStop(1, "#0c0310");
  ctx.fillStyle = reflFade;
  ctx.fillRect(-50, floorY, W + 100, H - floorY + 50);

  /* gold shimmer lines on floor */
  for (let i = 0; i < 4; i++) {
    const sy = floorY + (H - floorY) * (0.12 + i * 0.2);
    const shimmerAlpha = (0.04 + Math.sin(t * 1.5 + i * 2.3) * 0.025);
    const shimmer = ctx.createLinearGradient(0, sy, W, sy);
    shimmer.addColorStop(0, "transparent");
    shimmer.addColorStop(0.3, `rgba(255,200,60,${shimmerAlpha})`);
    shimmer.addColorStop(0.7, `rgba(255,200,60,${shimmerAlpha})`);
    shimmer.addColorStop(1, "transparent");
    ctx.fillStyle = shimmer; ctx.fillRect(-50, sy - 1, W + 100, 2);
  }

  /* Foreground pillars */
  const pillarColor = "#16021e";
  for (let i = 0; i < 5; i++) {
    const px = W * (i / 4) * 0.9 + W * 0.05;
    ctx.fillStyle = pillarColor;
    ctx.fillRect(px - W * 0.018, H * 0.42, W * 0.036, H * 0.58);
    ctx.fillRect(px - W * 0.026, H * 0.42, W * 0.052, H * 0.025);
    /* gold trim */
    ctx.fillStyle = `rgba(255,200,0,${0.22 + Math.sin(t * 1.2 + i) * 0.07})`;
    ctx.fillRect(px - W * 0.026, H * 0.42, W * 0.052, H * 0.004);
    ctx.fillRect(px - W * 0.026, H * 0.445, W * 0.052, H * 0.002);
    /* pillar reflection on floor */
    const pRefl = ctx.createLinearGradient(0, H * 0.58, 0, H * 0.72);
    pRefl.addColorStop(0, "rgba(22,2,30,0.28)");
    pRefl.addColorStop(1, "transparent");
    ctx.fillStyle = pRefl;
    ctx.fillRect(px - W * 0.018, H * 0.58, W * 0.036, H * 0.14);
  }
}

/* ════════════════ STORM (2-layer parallax) ═════════════════ */

function drawStormL0(ctx: CanvasRenderingContext2D, W: number, H: number, t: number) {
  /* Dark storm sky */
  const g = ctx.createLinearGradient(0, 0, 0, H);
  g.addColorStop(0, "#040404");
  g.addColorStop(0.5, "#0a0808");
  g.addColorStop(1, "#111008");
  ctx.fillStyle = g; ctx.fillRect(-50, -50, W + 100, H + 100);

  /* Storm clouds */
  const cloudOff = (t * 18) % W;
  for (let i = 0; i < 8; i++) {
    const cx = (sr(i * 4.3) * W + cloudOff) % W - W * 0.1;
    const cy = H * (0.05 + sr(i * 7.1) * 0.35);
    const cr = W * (0.14 + sr(i * 2.9) * 0.12);
    const cloudG = ctx.createRadialGradient(cx, cy, 0, cx, cy, cr);
    cloudG.addColorStop(0, `rgba(30,28,20,${0.6 + sr(i) * 0.25})`);
    cloudG.addColorStop(1, "transparent");
    ctx.fillStyle = cloudG;
    ctx.beginPath(); ctx.arc(cx, cy, cr, 0, Math.PI * 2); ctx.fill();
  }

  /* Lightning flash */
  const flashPhase = (t * 0.8) % 7;
  if (flashPhase < 0.15) {
    ctx.fillStyle = `rgba(200,220,255,${(0.15 - flashPhase) * 6})`;
    ctx.fillRect(0, 0, W, H);
    /* lightning bolt */
    const lx = W * 0.3 + sr(Math.floor(t * 10)) * W * 0.4;
    ctx.strokeStyle = "rgba(255,255,255,0.9)";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(lx, 0);
    ctx.lineTo(lx - W * 0.05, H * 0.35);
    ctx.lineTo(lx + W * 0.04, H * 0.35);
    ctx.lineTo(lx - W * 0.06, H * 0.65);
    ctx.stroke();
  }
}

function drawStormL1(ctx: CanvasRenderingContext2D, W: number, H: number, t: number) {
  /* Rain streaks */
  ctx.save();
  ctx.globalAlpha = 0.25;
  ctx.strokeStyle = "rgba(160,180,220,0.6)";
  ctx.lineWidth = 0.8;
  const rainOff = (t * 120) % 40;
  for (let i = 0; i < 80; i++) {
    const rx = (sr(i * 3.7) * W + i * 15 + rainOff) % W;
    const ry = (sr(i * 8.1) * H + t * 160 + i * 20) % H;
    ctx.beginPath();
    ctx.moveTo(rx, ry);
    ctx.lineTo(rx + 3, ry + 16);
    ctx.stroke();
  }
  ctx.restore();

  /* Ground puddles */
  const gnd = ctx.createLinearGradient(0, H * 0.7, 0, H);
  gnd.addColorStop(0, "#0c0a06");
  gnd.addColorStop(1, "#181410");
  ctx.fillStyle = gnd; ctx.fillRect(-50, H * 0.7, W + 100, H * 0.3 + 50);

  /* Puddle ripples */
  for (let i = 0; i < 6; i++) {
    const rpx = sr(i * 5.3) * W;
    const rpy = H * 0.75 + sr(i * 3.2) * H * 0.18;
    const phase = (t * 2 + i * 1.5) % 3;
    const rx = W * (0.03 + sr(i * 2.1) * 0.06) * (1 + phase * 0.5);
    const ry = rx * 0.3;
    ctx.strokeStyle = `rgba(100,120,160,${0.3 - phase * 0.09})`;
    ctx.lineWidth = 0.8;
    ctx.beginPath();
    ctx.ellipse(rpx, rpy, rx, ry, 0, 0, Math.PI * 2);
    ctx.stroke();
  }
}

/* ════════════════ CYBER RAIN (2-layer parallax) ════════════ */

function drawCyberL0(ctx: CanvasRenderingContext2D, W: number, H: number) {
  ctx.fillStyle = "#000005"; ctx.fillRect(-50, -50, W + 100, H + 100);
  /* Grid lines */
  ctx.strokeStyle = "rgba(0,255,80,0.04)";
  ctx.lineWidth = 0.5;
  for (let x = 0; x <= W; x += 40) {
    ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke();
  }
  for (let y = 0; y <= H; y += 40) {
    ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke();
  }
  /* Perspective floor grid */
  ctx.strokeStyle = "rgba(0,255,120,0.06)";
  ctx.lineWidth = 0.7;
  const vanishX = W * 0.5, vanishY = H * 0.55;
  for (let i = -6; i <= 6; i++) {
    ctx.beginPath();
    ctx.moveTo(vanishX + i * W * 0.28, H);
    ctx.lineTo(vanishX, vanishY);
    ctx.stroke();
  }
}

function drawCyberL1(ctx: CanvasRenderingContext2D, W: number, H: number, t: number) {
  /* Matrix rain columns */
  const cols = 28;
  const cw = W / cols;
  for (let c = 0; c < cols; c++) {
    const head = (t * (80 + sr(c * 2.3) * 60) + sr(c * 5.1) * H) % (H * 1.5);
    const len = H * (0.15 + sr(c * 3.7) * 0.25);
    const cx = c * cw + cw * 0.5;

    /* Trail gradient */
    const trail = ctx.createLinearGradient(cx, head - len, cx, head);
    trail.addColorStop(0, "transparent");
    trail.addColorStop(0.7, `rgba(0,${200 + Math.floor(sr(c) * 55)},80,0.15)`);
    trail.addColorStop(1, `rgba(0,255,100,0.45)`);
    ctx.fillStyle = trail;
    ctx.fillRect(cx - 1, head - len, 2, len);

    /* Bright head glyph */
    if (head < H) {
      ctx.fillStyle = `rgba(180,255,180,0.7)`;
      ctx.font = `bold ${Math.round(cw * 0.7)}px monospace`;
      ctx.textAlign = "center";
      const glyph = String.fromCharCode(0x30A0 + Math.floor(sr(c * 7.3 + Math.floor(t * 4)) * 96));
      ctx.fillText(glyph, cx, head);
    }
  }
  ctx.textAlign = "left";

  /* Neon scanline */
  const scanY = (t * 90) % H;
  const scan = ctx.createLinearGradient(0, scanY - 3, 0, scanY + 3);
  scan.addColorStop(0, "transparent");
  scan.addColorStop(0.5, "rgba(0,255,80,0.12)");
  scan.addColorStop(1, "transparent");
  ctx.fillStyle = scan;
  ctx.fillRect(0, scanY - 3, W, 6);
}

/* ════════════════ MOON (2-layer parallax) ═══════════════════ */

function drawMoonL0(ctx: CanvasRenderingContext2D, W: number, H: number) {
  ctx.fillStyle = "#000002"; ctx.fillRect(-50, -50, W + 100, H + 100);
  for (let i = 0; i < 200; i++) {
    const a = 0.2 + sr(i * 1.7) * 0.5;
    ctx.fillStyle = `rgba(255,255,255,${a})`;
    const x = sr(i * 3.3) * W, y = sr(i * 7.1) * H * 0.8;
    ctx.fillRect(x, y, sr(i * 5) > 0.85 ? 2 : 1, sr(i * 5) > 0.85 ? 2 : 1);
  }
  /* Earth */
  const ex = W * 0.77, ey = H * 0.15, er = W * 0.1;
  ctx.save(); ctx.beginPath(); ctx.arc(ex, ey, er, 0, Math.PI * 2); ctx.clip();
  const eg = ctx.createRadialGradient(ex - er * 0.3, ey - er * 0.3, 0, ex, ey, er);
  eg.addColorStop(0, "#0077bb"); eg.addColorStop(0.5, "#004488"); eg.addColorStop(1, "#001133");
  ctx.fillStyle = eg; ctx.fillRect(ex - er, ey - er, er * 2, er * 2);
  ctx.fillStyle = "#2a7a2a";
  [[ex - er*0.3, ey - er*0.2, er*0.5, er*0.32],[ex + er*0.1, ey + er*0.1, er*0.32, er*0.22]].forEach(([cx, cy, cw, ch]) => {
    ctx.beginPath(); ctx.ellipse(cx, cy, cw, ch, 0.3, 0, Math.PI * 2); ctx.fill();
  });
  const atm = ctx.createRadialGradient(ex, ey, er * 0.75, ex, ey, er);
  atm.addColorStop(0, "transparent"); atm.addColorStop(1, "rgba(100,180,255,0.55)");
  ctx.fillStyle = atm; ctx.fillRect(ex - er, ey - er, er * 2, er * 2);
  ctx.restore();
}

function drawMoonL1(ctx: CanvasRenderingContext2D, W: number, H: number) {
  const surf = ctx.createLinearGradient(0, H * 0.62, 0, H);
  surf.addColorStop(0, "#18181e"); surf.addColorStop(0.4, "#222228"); surf.addColorStop(1, "#111115");
  ctx.fillStyle = surf; ctx.fillRect(-50, H * 0.62, W + 100, H * 0.38 + 50);

  const hor = ctx.createLinearGradient(0, H * 0.55, 0, H * 0.68);
  hor.addColorStop(0, "transparent"); hor.addColorStop(0.5, "rgba(80,80,120,0.4)"); hor.addColorStop(1, "transparent");
  ctx.fillStyle = hor; ctx.fillRect(-50, H * 0.55, W + 100, H * 0.13);

  for (let i = 0; i < 18; i++) {
    const cr = W * (0.012 + sr(i * 3) * 0.025);
    const cx = sr(i * 7) * W, cy = H * 0.68 + sr(i * 11) * H * 0.28;
    ctx.strokeStyle = "rgba(0,0,0,0.7)"; ctx.lineWidth = cr * 0.35;
    ctx.beginPath(); ctx.arc(cx, cy, cr, 0, Math.PI * 2); ctx.stroke();
    ctx.fillStyle = "rgba(25,25,30,0.6)";
    ctx.beginPath(); ctx.arc(cx, cy, cr * 0.65, 0, Math.PI * 2); ctx.fill();
  }
}

/* ═══════════════════════════════════════════════════════════════
   DYNAMIC PARTICLE ENGINE
   wolf_forest → ground smoke + purple mist wisps
   palace      → ember sparks + warm smoke plumes
═══════════════════════════════════════════════════════════════ */

interface Particle {
  x: number; y: number;
  vx: number; vy: number;
  life: number; maxLife: number;
  size: number; maxSize: number;
  type: "smoke" | "ember" | "mist";
  hue: number;
}

class ParticleEngine {
  private pool: Particle[] = [];
  private lastEmit = 0;

  emit(bgId: BgId, W: number, H: number, t: number) {
    if (t - this.lastEmit < 0.07) return;
    this.lastEmit = t;

    if (bgId === "wolf_forest") {
      for (let i = 0; i < 3; i++) {
        this.pool.push({
          x: W * (0.05 + Math.random() * 0.9),
          y: H * 0.72 + Math.random() * H * 0.06,
          vx: (Math.random() - 0.5) * 0.6,
          vy: -(0.25 + Math.random() * 0.55),
          life: 0, maxLife: 2.8 + Math.random() * 2.2,
          size: 0, maxSize: 22 + Math.random() * 48,
          type: "smoke", hue: 270 + Math.random() * 30,
        });
      }
      this.pool.push({
        x: W * Math.random(),
        y: H * (0.54 + Math.random() * 0.22),
        vx: (Math.random() - 0.5) * 0.9,
        vy: -(0.08 + Math.random() * 0.22),
        life: 0, maxLife: 5 + Math.random() * 4,
        size: 0, maxSize: 70 + Math.random() * 100,
        type: "mist", hue: 265,
      });
    } else if (bgId === "palace") {
      for (let i = 0; i < 5; i++) {
        this.pool.push({
          x: W * (0.15 + Math.random() * 0.7),
          y: H * 0.55,
          vx: (Math.random() - 0.5) * 3.5,
          vy: -(1.8 + Math.random() * 3.0),
          life: 0, maxLife: 0.7 + Math.random() * 1.4,
          size: 1.5 + Math.random() * 2.5, maxSize: 3,
          type: "ember", hue: 20 + Math.random() * 25,
        });
      }
      for (let i = 0; i < 2; i++) {
        this.pool.push({
          x: W * (0.25 + Math.random() * 0.5),
          y: H * (0.55 + Math.random() * 0.06),
          vx: (Math.random() - 0.5) * 0.5,
          vy: -(0.2 + Math.random() * 0.4),
          life: 0, maxLife: 3.5 + Math.random() * 2.5,
          size: 0, maxSize: 35 + Math.random() * 55,
          type: "smoke", hue: 25 + Math.random() * 15,
        });
      }
    }

    if (this.pool.length > 600) this.pool.splice(0, 50);
  }

  update(dt: number) {
    for (const p of this.pool) {
      p.life += dt;
      p.x += p.vx;
      p.y += p.vy;
      if (p.type === "ember") {
        p.vy += 0.06;
        p.vx *= 0.97;
      } else {
        p.vy *= 0.994;
        p.vx += (Math.random() - 0.5) * 0.04;
        p.size = Math.min(p.maxSize, (p.life / p.maxLife) * p.maxSize * 2.8);
      }
    }
    this.pool = this.pool.filter(p => p.life < p.maxLife);
  }

  draw(ctx: CanvasRenderingContext2D) {
    ctx.save();
    for (const p of this.pool) {
      const prog = p.life / p.maxLife;
      const alpha = prog < 0.25 ? prog / 0.25 : 1 - (prog - 0.25) / 0.75;

      if (p.type === "ember") {
        ctx.globalAlpha = alpha * 0.9;
        ctx.fillStyle = `hsl(${p.hue}, 100%, 68%)`;
        ctx.shadowColor = `hsl(${p.hue}, 100%, 75%)`;
        ctx.shadowBlur = 8;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
      } else if (p.type === "smoke") {
        ctx.globalAlpha = alpha * 0.20;
        const g = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, Math.max(1, p.size));
        g.addColorStop(0, `hsla(${p.hue}, 55%, 38%, 1)`);
        g.addColorStop(1, `hsla(${p.hue}, 35%, 18%, 0)`);
        ctx.fillStyle = g;
        ctx.beginPath(); ctx.arc(p.x, p.y, Math.max(1, p.size), 0, Math.PI * 2); ctx.fill();
      } else {
        ctx.globalAlpha = alpha * 0.09;
        const g = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, Math.max(1, p.size));
        g.addColorStop(0, `hsla(${p.hue}, 48%, 48%, 1)`);
        g.addColorStop(1, `hsla(${p.hue}, 28%, 28%, 0)`);
        ctx.fillStyle = g;
        ctx.beginPath(); ctx.arc(p.x, p.y, Math.max(1, p.size), 0, Math.PI * 2); ctx.fill();
      }
    }
    ctx.shadowBlur = 0;
    ctx.globalAlpha = 1;
    ctx.restore();
  }
}

/* ═══════════════════════════════════════════════════════════════
   DRAW BACKGROUND WITH PARALLAX
═══════════════════════════════════════════════════════════════ */

interface ParallaxOffset { x: number; y: number; }

function drawParallaxBg(
  ctx: CanvasRenderingContext2D,
  W: number, H: number, t: number,
  px: ParallaxOffset,
  bgId: BgId,
) {
  /* Define layers: [drawFn, depthFactor] — 0 = sky, 1 = near */
  type LayerDef = [((c: CanvasRenderingContext2D, W: number, H: number, t: number) => void), number];

  const layers: LayerDef[] =
    bgId === "city" ? [
      [(c, W, H)      => drawCityL0(c, W, H),            0.00],
      [(c, W, H, t)   => drawCityL1(c, W, H, t),         0.04],
      [(c, W, H, t)   => drawCityL2(c, W, H, t),         0.12],
      [(c, W, H, t)   => drawCityL3(c, W, H, t),         0.22],
      [(c, W, H, t)   => drawCityL4(c, W, H, t),         0.34],
    ] :
    bgId === "starship" ? [
      [(c, W, H)      => drawStarL0(c, W, H),             0.00],
      [(c, W, H, t)   => drawStarL1(c, W, H, t),          0.06],
      [(c, W, H, t)   => drawStarL2(c, W, H, t),          0.14],
      [(c, W, H, t)   => drawStarL3(c, W, H, t),          0.28],
    ] :
    bgId === "jungle" ? [
      [(c, W, H, t)   => drawJungleL0(c, W, H, t),        0.00],
      [(c, W, H, t)   => drawJungleL1(c, W, H, t),        0.12],
    ] :
    bgId === "wolf_forest" ? [
      [(c, W, H, t)   => drawWolfL0(c, W, H, t),          0.00],
      [(c, W, H, t)   => drawWolfL1(c, W, H, t),          0.18],
      [(c, W, H, t)   => drawWolfL2(c, W, H, t),          0.46],
    ] :
    bgId === "palace" ? [
      [(c, W, H, t)   => drawPalaceL0(c, W, H, t),        0.00],
      [(c, W, H, t)   => drawPalaceL1(c, W, H, t),        0.16],
      [(c, W, H, t)   => drawPalaceL2(c, W, H, t),        0.44],
    ] :
    bgId === "storm" ? [
      [(c, W, H, t)   => drawStormL0(c, W, H, t),         0.00],
      [(c, W, H, t)   => drawStormL1(c, W, H, t),         0.14],
    ] :
    bgId === "cyber_rain" ? [
      [(c, W, H)      => drawCyberL0(c, W, H),             0.00],
      [(c, W, H, t)   => drawCyberL1(c, W, H, t),          0.16],
    ] : [
      [(c, W, H)      => drawMoonL0(c, W, H),              0.00],
      [(c, W, H)      => drawMoonL1(c, W, H),              0.10],
    ];

  ctx.save();
  ctx.beginPath(); ctx.rect(0, 0, W, H); ctx.clip();

  layers.forEach(([fn, factor]) => {
    const ox = px.x * MAX_SHIFT * factor;
    const oy = px.y * MAX_SHIFT * factor;
    ctx.save(); ctx.translate(ox, oy);
    fn(ctx, W, H, t);
    ctx.restore();
  });

  ctx.restore();
}

/* ═══════════════════════════════════════════════════════════════
   AUTO-COLOR LIGHT CONFIGURATION
═══════════════════════════════════════════════════════════════ */

interface LightConfig {
  color: string;
  type: "radial" | "linear";
  x1: number; y1: number; x2?: number; y2?: number;
  r?: number;
}

const BG_LIGHT: Record<BgId, LightConfig[]> = {
  city: [
    { color: "rgba(0,200,255,0.18)", type: "radial", x1: 0.05, y1: 0.5, r: 0.35 },
    { color: "rgba(200,0,255,0.12)", type: "radial", x1: 0.95, y1: 0.5, r: 0.35 },
    { color: "rgba(0,150,255,0.08)", type: "linear", x1: 0.5, y1: 1.0, x2: 0.5, y2: 0.3 },
  ],
  jungle: [
    { color: "rgba(255,165,0,0.15)", type: "radial", x1: 0.5, y1: 0.0, r: 0.5 },
    { color: "rgba(255,120,0,0.08)", type: "linear", x1: 0.5, y1: 0.0, x2: 0.5, y2: 0.6 },
  ],
  starship: [
    { color: "rgba(0,180,255,0.20)", type: "linear", x1: 0.5, y1: 1.0, x2: 0.5, y2: 0.4 },
    { color: "rgba(0,100,255,0.10)", type: "radial", x1: 0.5, y1: 1.1, r: 0.55 },
  ],
  moon: [
    { color: "rgba(160,190,255,0.10)", type: "linear", x1: 0.5, y1: 0.0, x2: 0.5, y2: 1.0 },
    { color: "rgba(100,150,255,0.08)", type: "radial", x1: 0.78, y1: 0.15, r: 0.35 },
  ],
  wolf_forest: [
    { color: "rgba(120,0,220,0.14)", type: "radial", x1: 0.2, y1: 0.1, r: 0.45 },
    { color: "rgba(80,0,180,0.10)", type: "linear", x1: 0.5, y1: 0.0, x2: 0.5, y2: 0.7 },
    { color: "rgba(255,220,0,0.08)", type: "radial", x1: 0.5, y1: 0.65, r: 0.25 },
  ],
  palace: [
    { color: "rgba(255,180,30,0.14)", type: "radial", x1: 0.5, y1: 0.55, r: 0.55 },
    { color: "rgba(200,80,0,0.10)", type: "linear", x1: 0.5, y1: 1.0, x2: 0.5, y2: 0.3 },
    { color: "rgba(255,150,0,0.08)", type: "radial", x1: 0.5, y1: 0.0, r: 0.4 },
  ],
  storm: [
    { color: "rgba(100,120,200,0.12)", type: "linear", x1: 0.5, y1: 0.0, x2: 0.5, y2: 1.0 },
    { color: "rgba(200,220,255,0.08)", type: "radial", x1: 0.35, y1: 0.2, r: 0.35 },
  ],
  cyber_rain: [
    { color: "rgba(0,255,80,0.14)", type: "linear", x1: 0.5, y1: 0.0, x2: 0.5, y2: 1.0 },
    { color: "rgba(0,200,100,0.10)", type: "radial", x1: 0.5, y1: 0.5, r: 0.55 },
  ],
};

function applyAutoColor(
  ctx: CanvasRenderingContext2D,
  W: number, H: number,
  bgId: BgId,
  intensity: number,
) {
  const lights = BG_LIGHT[bgId];
  ctx.save();
  ctx.globalCompositeOperation = "screen";

  lights.forEach(({ color, type, x1, y1, x2, y2, r }) => {
    let grad: CanvasGradient;
    if (type === "radial") {
      grad = ctx.createRadialGradient(x1 * W, y1 * H, 0, x1 * W, y1 * H, (r ?? 0.4) * W);
      grad.addColorStop(0, color);
      grad.addColorStop(1, "transparent");
    } else {
      grad = ctx.createLinearGradient(x1 * W, y1 * H, (x2 ?? x1) * W, (y2 ?? y1) * H);
      grad.addColorStop(0, color);
      grad.addColorStop(1, "transparent");
    }
    ctx.globalAlpha = intensity;
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, W, H);
  });

  ctx.globalAlpha = 1;
  ctx.globalCompositeOperation = "source-over";
  ctx.restore();
}

/* ═══════════════════════════════════════════════════════════════
   PANEL CONTROLS UI
═══════════════════════════════════════════════════════════════ */

const BG_META: Record<BgId, { label: string; emoji: string; desc: string; gradient: string }> = {
  city:       { label: "Futuristic City",  emoji: "🌆", desc: "5-layer neon parallax",   gradient: "from-[#000010] to-[#100030]" },
  jungle:     { label: "Golden Jungle",    emoji: "🌿", desc: "Warm sun + pollen",        gradient: "from-[#0d0400] to-[#061a00]" },
  starship:   { label: "Starship",         emoji: "🚀", desc: "4-layer deep space",       gradient: "from-[#000005] to-[#000020]" },
  moon:       { label: "Moon Surface",     emoji: "🌕", desc: "Moonscape + Earth",        gradient: "from-[#000002] to-[#111115]" },
  wolf_forest:{ label: "Wolf Spirit",      emoji: "🐺", desc: "3-layer purple forest",    gradient: "from-[#04000e] to-[#14002a]" },
  palace:     { label: "Gold Palace",      emoji: "🏯", desc: "3-layer royal dusk",       gradient: "from-[#0a0005] to-[#6b1010]" },
  storm:      { label: "Lightning Storm",  emoji: "⚡", desc: "Rain + lightning flash",   gradient: "from-[#040404] to-[#111008]" },
  cyber_rain: { label: "Cyber Rain",       emoji: "💚", desc: "Matrix rain + grid",       gradient: "from-[#000005] to-[#001408]" },
};
const BG_IDS: BgId[] = ["city", "jungle", "starship", "moon", "wolf_forest", "palace", "storm", "cyber_rain"];

interface PanelControlProps {
  state: BgSwapState;
  onChange: (s: BgSwapState) => void;
  segStatus: "idle" | "loading" | "ready" | "failed";
}

export function BgSwapControls({ state, onChange, segStatus }: PanelControlProps) {
  const statusLabel = {
    idle:    "Tap to activate",
    loading: "Calibrating AI ✨",
    ready:   "AI Seg Active ✓",
    failed:  "Blend mode (no AI)",
  }[segStatus];

  return (
    <div className="flex flex-col gap-4 p-3">
      {/* BG grid */}
      <div className="grid grid-cols-2 gap-2">
        {BG_IDS.map((id) => {
          const m = BG_META[id];
          const active = state.bgId === id;
          return (
            <button key={id} onClick={() => onChange({ ...state, bgId: id })}
              className={`relative flex flex-col rounded-2xl overflow-hidden border transition-all ${active ? "border-[#ffd700] shadow-[0_0_16px_rgba(255,215,0,0.3)]" : "border-[rgba(184,134,11,0.15)] hover:border-[rgba(184,134,11,0.35)]"}`}>
              <div className={`aspect-video w-full flex items-center justify-center text-3xl bg-gradient-to-br ${m.gradient}`}>
                {m.emoji}
                {active && <div className="absolute top-1 right-1 w-5 h-5 rounded-full bg-[#ffd700] flex items-center justify-center">
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#0d0d0d" strokeWidth="3"><polyline points="20 6 9 17 4 12"/></svg>
                </div>}
              </div>
              <div className="py-1.5 px-2 bg-[#0a0a0a]">
                <p className={`text-[10px] font-bold ${active ? "text-[#ffd700]" : "text-[rgba(184,134,11,0.7)]"}`}>{m.label}</p>
                <p className="text-[rgba(184,134,11,0.35)] text-[8px]">{m.desc}</p>
              </div>
            </button>
          );
        })}
      </div>

      {/* Segmentation status */}
      <div className={`flex items-center gap-2 px-3 py-2 rounded-xl border ${
        segStatus === "ready"  ? "border-[rgba(0,255,150,0.3)] bg-[rgba(0,255,150,0.06)]" :
        segStatus === "loading"? "border-[rgba(255,215,0,0.3)] bg-[rgba(255,215,0,0.06)]" :
        segStatus === "failed" ? "border-[rgba(255,80,80,0.3)] bg-[rgba(255,80,80,0.06)]" :
                                 "border-[rgba(184,134,11,0.15)] bg-transparent"
      }`}>
        <div className={`w-2 h-2 rounded-full flex-shrink-0 ${
          segStatus === "ready" ? "bg-[#00ff96] shadow-[0_0_6px_#00ff96]" :
          segStatus === "loading" ? "bg-[#ffd700] animate-pulse" :
          segStatus === "failed" ? "bg-[#ff5050]" : "bg-[rgba(184,134,11,0.3)]"
        }`} />
        <div>
          <p className={`text-[9px] font-bold uppercase tracking-wider ${
            segStatus === "ready" ? "text-[#00ff96]" :
            segStatus === "loading" ? "text-[#ffd700]" :
            segStatus === "failed" ? "text-[rgba(255,80,80,0.8)]" :
            "text-[rgba(184,134,11,0.5)]"
          }`}>Body Segmentation</p>
          <p className="text-[rgba(184,134,11,0.4)] text-[8px]">{statusLabel}</p>
        </div>
      </div>

      {/* Auto-Color */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <div>
            <p className="text-[rgba(184,134,11,0.55)] text-[9px] uppercase tracking-wider">Cinematic Auto-Color</p>
            <p className="text-[rgba(184,134,11,0.3)] text-[8px]">Background light on your face</p>
          </div>
          <button onClick={() => onChange({ ...state, autoColorEnabled: !state.autoColorEnabled })}
            className={`w-10 h-5 rounded-full relative transition-colors flex-shrink-0 ${state.autoColorEnabled ? "bg-[#ffd700]" : "bg-[rgba(184,134,11,0.15)]"}`}>
            <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${state.autoColorEnabled ? "translate-x-5" : "translate-x-0.5"}`} />
          </button>
        </div>
        {state.autoColorEnabled && (
          <input type="range" min="0" max="100" step="1"
            value={Math.round(state.autoColorIntensity * 100)}
            onChange={(e) => onChange({ ...state, autoColorIntensity: parseInt(e.target.value) / 100 })}
            className="w-full accent-[#ffd700]" />
        )}
      </div>

      {/* Blend opacity fallback */}
      {segStatus !== "ready" && (
        <div>
          <div className="flex items-center justify-between mb-1">
            <p className="text-[rgba(184,134,11,0.45)] text-[9px] uppercase tracking-wider">Blend Opacity</p>
            <span className="text-[rgba(184,134,11,0.5)] text-[9px]">{Math.round(state.blendOpacity * 100)}%</span>
          </div>
          <input type="range" min="30" max="100" step="1"
            value={Math.round(state.blendOpacity * 100)}
            onChange={(e) => onChange({ ...state, blendOpacity: parseInt(e.target.value) / 100 })}
            className="w-full accent-[#ffd700]" />
        </div>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   LIVE CANVAS COMPONENT
═══════════════════════════════════════════════════════════════ */

export default function BgSwapCanvas({ enabled, state, videoEl, canvasElRef, onSegStatusChange, onMaskUpdate }: Props) {
  const localRef  = useRef<HTMLCanvasElement>(null);
  const canvasRef = (canvasElRef ?? localRef) as React.RefObject<HTMLCanvasElement>;

  const rafRef      = useRef(0);
  const t0Ref       = useRef(performance.now());
  const prevTRef    = useRef(0);
  const personCanvas = useRef<HTMLCanvasElement | null>(null);
  const particlesRef = useRef(new ParticleEngine());

  /* Parallax state */
  const parallax    = useRef({ x: 0, y: 0 });
  const target      = useRef({ x: 0, y: 0 });

  /* Segmentation */
  const segRef      = useRef(new SegmentationEngine());
  const [segStatus, setSegStatus] = useState<"idle" | "loading" | "ready" | "failed">("idle");
  const segStatusRef = useRef<"idle" | "loading" | "ready" | "failed">("idle");

  /* Expose segStatus for controls */
  const [, forceUpdate] = useState(0);

  /* ── Parallax input listeners ── */
  useEffect(() => {
    if (!enabled) return;

    const onMouse = (e: MouseEvent) => {
      target.current.x = (e.clientX / window.innerWidth) * 2 - 1;
      target.current.y = (e.clientY / window.innerHeight) * 2 - 1;
    };
    const onTouch = (e: TouchEvent) => {
      const t = e.touches[0];
      if (!t) return;
      target.current.x = (t.clientX / window.innerWidth) * 2 - 1;
      target.current.y = (t.clientY / window.innerHeight) * 2 - 1;
    };
    const onOrient = (e: DeviceOrientationEvent) => {
      target.current.x = Math.max(-1, Math.min(1, (e.gamma ?? 0) / 30));
      target.current.y = Math.max(-1, Math.min(1, ((e.beta ?? 0) - 45) / 30));
    };

    /* Request iOS permission if needed */
    if (typeof (DeviceOrientationEvent as unknown as { requestPermission?: () => Promise<string> }).requestPermission === "function") {
      (DeviceOrientationEvent as unknown as { requestPermission: () => Promise<string> }).requestPermission()
        .then((p) => { if (p === "granted") window.addEventListener("deviceorientation", onOrient); })
        .catch(() => {});
    } else {
      window.addEventListener("deviceorientation", onOrient);
    }

    window.addEventListener("mousemove", onMouse);
    window.addEventListener("touchmove", onTouch, { passive: true });

    return () => {
      window.removeEventListener("mousemove", onMouse);
      window.removeEventListener("touchmove", onTouch);
      window.removeEventListener("deviceorientation", onOrient);
    };
  }, [enabled]);

  /* ── Load segmentation model ── */
  useEffect(() => {
    if (!enabled || !state.segEnabled) return;
    if (segRef.current.isReady || segRef.current.isLoading) return;

    segStatusRef.current = "loading";
    setSegStatus("loading");
    onSegStatusChange?.("loading");

    segRef.current.load().then(() => {
      const st = segRef.current.isFailed ? "failed" : "ready";
      segStatusRef.current = st;
      setSegStatus(st);
      onSegStatusChange?.(st);
    });
  }, [enabled, state.segEnabled]);

  /* ── Main RAF loop ── */
  useEffect(() => {
    cancelAnimationFrame(rafRef.current);
    if (!enabled) return;

    /* Person composite canvas (hidden, re-used every frame) */
    if (!personCanvas.current) {
      personCanvas.current = document.createElement("canvas");
    }

    const loop = async () => {
      rafRef.current = requestAnimationFrame(loop);
      const t = (performance.now() - t0Ref.current) / 1000;
      const dt = Math.min(t - prevTRef.current, 0.05);
      prevTRef.current = t;

      /* Smooth parallax lerp */
      const lerpF = 0.08;
      parallax.current.x += (target.current.x - parallax.current.x) * lerpF;
      parallax.current.y += (target.current.y - parallax.current.y) * lerpF;

      const canvas = canvasRef.current;
      if (!canvas) return;
      const W = canvas.width, H = canvas.height;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      /* Sync person canvas size */
      const pc = personCanvas.current!;
      if (pc.width !== W || pc.height !== H) { pc.width = W; pc.height = H; }
      const pCtx = pc.getContext("2d")!;

      ctx.clearRect(0, 0, W, H);

      /* 1. Draw parallax background */
      drawParallaxBg(ctx, W, H, t, parallax.current, state.bgId);

      /* 2. Particle engine — smoke / embers / mist */
      if (state.bgId === "wolf_forest" || state.bgId === "palace") {
        particlesRef.current.emit(state.bgId, W, H, t);
        particlesRef.current.update(dt);
        particlesRef.current.draw(ctx);
      }

      /* 3. Composite person over background */
      if (videoEl && videoEl.readyState >= 2) {
        const seg = segRef.current;

        if (seg.isReady && state.segEnabled) {
          /* AI segmentation path */
          await seg.process(videoEl);
          const mask = seg.mask;

          if (mask) {
            /* Expose mask to parent for WebGL face grading */
            onMaskUpdate?.(mask);

            pCtx.clearRect(0, 0, W, H);

            /* Step 1 — Draw the raw video */
            pCtx.drawImage(videoEl, 0, 0, W, H);

            /* Step 2 — Apply mask with soft edge */
            pCtx.globalCompositeOperation = "destination-in";
            pCtx.filter = "blur(2px) contrast(1.4)";
            pCtx.drawImage(mask, 0, 0, W, H);
            pCtx.filter = "none";
            pCtx.globalCompositeOperation = "source-over";

            /* Step 3 — Draw person onto main canvas */
            ctx.drawImage(pc, 0, 0);
          } else {
            onMaskUpdate?.(null);
            ctx.globalAlpha = state.blendOpacity;
            ctx.drawImage(videoEl, 0, 0, W, H);
            ctx.globalAlpha = 1;
          }
        } else {
          onMaskUpdate?.(null);
          /* Fallback: opacity blend */
          ctx.globalAlpha = state.blendOpacity;
          ctx.drawImage(videoEl, 0, 0, W, H);
          ctx.globalAlpha = 1;
        }

        /* 4. Auto-color light grading */
        if (state.autoColorEnabled) {
          applyAutoColor(ctx, W, H, state.bgId, state.autoColorIntensity);
        }
      }
    };

    loop();
    return () => cancelAnimationFrame(rafRef.current);
  }, [enabled, state, videoEl, canvasRef]);

  /* Cleanup segmentation engine on unmount */
  useEffect(() => () => {
    cancelAnimationFrame(rafRef.current);
    segRef.current.destroy();
  }, []);

  if (!enabled) return null;

  return (
    <canvas
      ref={canvasRef as React.RefObject<HTMLCanvasElement>}
      className="absolute inset-0 w-full h-full pointer-events-none"
      style={{ zIndex: 1 }}
      width={1280}
      height={720}
    />
  );
}

