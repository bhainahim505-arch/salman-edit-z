/**
 * WingsAuraCanvas — AI Wings & Energy Aura
 *
 * Draws two effects as an animated canvas overlay on the video:
 *
 *  1. BLACK WINGS  — giant dark feathered wings centered on the person.
 *     Wing shape is built from bezier curves + a feather-line shading pass.
 *     A subtle purple inner-glow makes them look supernatural.
 *     Animated: wings slowly breathe (expand/contract) with a sin wave.
 *
 *  2. BLUE ENERGY BALL — a pulsing glowing orb positioned at the
 *     "hand" area (lower-center). Composed of three layered radial
 *     gradients: inner white core → cyan glow → deep-blue halo.
 *     Animated: radius and opacity pulse at ~1 Hz.
 *
 * Performance: processes at native resolution but uses only canvas
 * drawing (no pixel reads) so it's ~0 CPU and fully GPU-composited.
 */

import { useEffect, useRef } from "react";

interface Props {
  enabled: boolean;
  wingsEnabled: boolean;
  ballEnabled: boolean;
  isPlaying: boolean;
  ballColor: string;   // default "#00aaff"
  intensity: number;   // 0–100
  canvasElRef?: React.RefObject<HTMLCanvasElement | null>;
}

export default function WingsAuraCanvas({
  enabled, wingsEnabled, ballEnabled, isPlaying, ballColor, intensity, canvasElRef,
}: Props) {
  const internalRef = useRef<HTMLCanvasElement>(null);
  const canvasRef = canvasElRef ?? internalRef;
  const rafRef    = useRef(0);
  const t0Ref     = useRef(performance.now());

  useEffect(() => {
    cancelAnimationFrame(rafRef.current);
    const canvas = canvasRef.current;
    if (!canvas || !enabled || (!wingsEnabled && !ballEnabled)) return;

    const ctx = canvas.getContext("2d")!;
    const alpha = Math.max(0.3, intensity / 100);

    const draw = () => {
      rafRef.current = requestAnimationFrame(draw);
      const now = performance.now();
      const elapsed = (now - t0Ref.current) / 1000; // seconds

      const W = canvas.width;
      const H = canvas.height;
      ctx.clearRect(0, 0, W, H);

      /* ── Wing breath: ±4% flutter at 0.4 Hz ── */
      const breathe = 1 + Math.sin(elapsed * 2.5) * 0.035;
      /* ── Subtle droop: wings tilt slightly ── */
      const droop = Math.sin(elapsed * 1.8) * 0.015;

      /* ───────── 1. BLACK WINGS ───────── */
      if (wingsEnabled) {
        const cx = W * 0.50;  // horizontal center
        const cy = H * 0.32;  // upper body / shoulder height

        /* Wing scale relative to canvas */
        const ws = W * 0.42 * breathe;  // half-span
        const wh = H * 0.52 * breathe;  // height

        for (const side of [-1, 1]) {
          ctx.save();
          ctx.translate(cx, cy);

          /* ── Outer wing shape ── */
          ctx.beginPath();
          ctx.moveTo(0, 0);
          /* upper arc — sweeps outward and up */
          ctx.bezierCurveTo(
            side * ws * 0.30, -wh * 0.10,
            side * ws * 0.85,  -wh * (0.65 + droop),
            side * ws,         -wh * (0.20 + droop),
          );
          /* lower arc — sweeps back inward and down */
          ctx.bezierCurveTo(
            side * ws * 0.90,  wh * 0.20,
            side * ws * 0.55,  wh * 0.50,
            0,                 wh * 0.10,
          );
          ctx.closePath();

          /* fill with dark gradient */
          const wGrad = ctx.createRadialGradient(side * ws * 0.35, -wh * 0.1, 0, side * ws * 0.35, -wh * 0.1, ws * 0.85);
          wGrad.addColorStop(0,   `rgba(20,0,40,${alpha * 0.9})`);
          wGrad.addColorStop(0.5, `rgba(5,0,15,${alpha * 0.97})`);
          wGrad.addColorStop(1,   `rgba(0,0,0,${alpha * 0.75})`);
          ctx.fillStyle = wGrad;
          ctx.fill();

          /* ── Inner glow rim (purple aura) ── */
          ctx.save();
          ctx.globalCompositeOperation = "screen";
          const rimGrad = ctx.createLinearGradient(0, -wh * 0.3, side * ws * 0.5, wh * 0.1);
          rimGrad.addColorStop(0,   `rgba(120,0,200,${alpha * 0.55})`);
          rimGrad.addColorStop(0.5, `rgba(60,0,120,${alpha * 0.30})`);
          rimGrad.addColorStop(1,   "transparent");
          ctx.strokeStyle = rimGrad;
          ctx.lineWidth = W * 0.018;
          ctx.stroke();
          ctx.restore();

          /* ── Feather lines ── */
          const featherCount = 9;
          ctx.globalAlpha = alpha * 0.25;
          ctx.strokeStyle = `rgba(80,0,120,1)`;
          ctx.lineWidth = Math.max(0.5, W * 0.0015);
          for (let i = 0; i < featherCount; i++) {
            const frac = i / (featherCount - 1);
            const fx = side * ws * (0.1 + frac * 0.85);
            const fy = -wh * 0.4 * (1 - frac * 0.6) + wh * droop * frac;
            ctx.beginPath();
            ctx.moveTo(0, 0);
            ctx.quadraticCurveTo(fx * 0.6, fy * 0.5, fx, fy);
            ctx.stroke();
          }
          ctx.globalAlpha = 1;

          ctx.restore();
        }
      }

      /* ───────── 2. BLUE ENERGY BALL ───────── */
      if (ballEnabled) {
        /* pulsing: ±15% radius at 1.1 Hz */
        const pulse = 1 + Math.sin(elapsed * 6.9) * 0.15;
        const bx = W * 0.50;
        const by = H * 0.72;
        const br = W * 0.075 * pulse * (0.5 + intensity / 200);

        /* outer diffuse halo */
        const outerGrad = ctx.createRadialGradient(bx, by, br * 0.1, bx, by, br * 2.8);
        outerGrad.addColorStop(0,   `${ballColor}55`);
        outerGrad.addColorStop(0.5, `${ballColor}22`);
        outerGrad.addColorStop(1,   "transparent");
        ctx.globalCompositeOperation = "screen";
        ctx.fillStyle = outerGrad;
        ctx.beginPath();
        ctx.arc(bx, by, br * 2.8, 0, Math.PI * 2);
        ctx.fill();

        /* mid glow */
        const midGrad = ctx.createRadialGradient(bx, by, 0, bx, by, br * 1.4);
        midGrad.addColorStop(0,   `${ballColor}cc`);
        midGrad.addColorStop(0.6, `${ballColor}88`);
        midGrad.addColorStop(1,   "transparent");
        ctx.fillStyle = midGrad;
        ctx.beginPath();
        ctx.arc(bx, by, br * 1.4, 0, Math.PI * 2);
        ctx.fill();

        /* bright core */
        const coreGrad = ctx.createRadialGradient(bx, by, 0, bx, by, br);
        coreGrad.addColorStop(0,   "rgba(255,255,255,0.95)");
        coreGrad.addColorStop(0.35,`${ballColor}ff`);
        coreGrad.addColorStop(1,   `${ballColor}00`);
        ctx.fillStyle = coreGrad;
        ctx.beginPath();
        ctx.arc(bx, by, br, 0, Math.PI * 2);
        ctx.fill();

        /* sparks radiating outward */
        const sparkCount = 6;
        ctx.strokeStyle = `${ballColor}bb`;
        ctx.lineWidth = Math.max(0.8, W * 0.0015);
        for (let i = 0; i < sparkCount; i++) {
          const angle = (i / sparkCount) * Math.PI * 2 + elapsed * 2;
          const sparkLen = br * (0.8 + Math.sin(elapsed * 5 + i) * 0.4);
          ctx.globalAlpha = 0.5 + Math.sin(elapsed * 4 + i * 1.2) * 0.3;
          ctx.beginPath();
          ctx.moveTo(bx + Math.cos(angle) * br * 0.6, by + Math.sin(angle) * br * 0.6);
          ctx.lineTo(bx + Math.cos(angle) * (br + sparkLen), by + Math.sin(angle) * (br + sparkLen));
          ctx.stroke();
        }
        ctx.globalAlpha = 1;
        ctx.globalCompositeOperation = "source-over";
      }
    };

    draw();
    return () => cancelAnimationFrame(rafRef.current);
  }, [enabled, wingsEnabled, ballEnabled, ballColor, intensity, isPlaying]);

  if (!enabled) return null;

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 w-full h-full pointer-events-none"
      width={1280}
      height={720}
      style={{ zIndex: 10 }}
    />
  );
}
