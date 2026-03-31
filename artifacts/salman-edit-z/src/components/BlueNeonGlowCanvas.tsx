/**
 * BlueNeonGlowCanvas
 *
 * Renders an edge-detection pass on live video frames and paints a
 * blue neon glow outline over the subject. Works entirely in the browser
 * using a low-res Sobel kernel (processes at 240p → upscales to full size)
 * so it stays smooth at 30fps even on mid-range phones.
 *
 * Algorithm:
 *   1. Sample video frame → tiny offscreen canvas (240p)
 *   2. Sobel gradient magnitude per pixel
 *   3. Threshold → paint blue (#00d4ff) at strong edges
 *   4. Copy result to overlay canvas at display size with CSS blur for glow
 */

import { useEffect, useRef } from "react";

interface Props {
  videoEl: HTMLVideoElement | null;
  isPlaying: boolean;
  intensity: number;  // 0–100
  color: string;      // hex, default "#00d4ff"
  enabled: boolean;
}

const PROCESS_H = 240;

export default function BlueNeonGlowCanvas({
  videoEl, isPlaying, intensity, color, enabled,
}: Props) {
  const overlayRef = useRef<HTMLCanvasElement>(null);
  const offscreenRef = useRef<HTMLCanvasElement | null>(null);
  const rafRef = useRef(0);
  const frameSkip = useRef(0);

  useEffect(() => {
    cancelAnimationFrame(rafRef.current);
    if (!enabled || !videoEl || !overlayRef.current) return;

    const overlay = overlayRef.current;
    const octx = overlay.getContext("2d", { willReadFrequently: false })!;

    /* ── create / resize offscreen buffer ── */
    if (!offscreenRef.current) offscreenRef.current = document.createElement("canvas");
    const off = offscreenRef.current;

    const THRESH = Math.max(5, 80 - intensity * 0.7);   // lower thresh = more edges
    const ALPHA  = Math.min(1, 0.3 + intensity * 0.007); // overlay opacity

    const loop = () => {
      rafRef.current = requestAnimationFrame(loop);
      if (!isPlaying) return;

      /* throttle to ~30fps */
      frameSkip.current = (frameSkip.current + 1) % 2;
      if (frameSkip.current !== 0) return;

      const vw = videoEl.videoWidth;
      const vh = videoEl.videoHeight;
      if (!vw || !vh) return;

      const ratio = vw / vh;
      const pH = PROCESS_H;
      const pW = Math.round(pH * ratio);

      off.width  = pW;
      off.height = pH;
      const ctx2 = off.getContext("2d", { willReadFrequently: true })!;
      ctx2.drawImage(videoEl, 0, 0, pW, pH);

      const raw = ctx2.getImageData(0, 0, pW, pH);
      const src = raw.data;

      /* luma array */
      const luma = new Uint8Array(pW * pH);
      for (let i = 0; i < pW * pH; i++) {
        const o = i * 4;
        luma[i] = (src[o] * 77 + src[o + 1] * 150 + src[o + 2] * 29) >> 8;
      }

      /* Sobel edge detect */
      const out = new Uint8ClampedArray(pW * pH * 4);
      const hex = color.replace("#", "");
      const cr = parseInt(hex.slice(0, 2), 16);
      const cg = parseInt(hex.slice(2, 4), 16);
      const cb = parseInt(hex.slice(4, 6), 16);

      for (let y = 1; y < pH - 1; y++) {
        for (let x = 1; x < pW - 1; x++) {
          const tl = luma[(y - 1) * pW + (x - 1)];
          const tc = luma[(y - 1) * pW + x];
          const tr = luma[(y - 1) * pW + (x + 1)];
          const ml = luma[y       * pW + (x - 1)];
          const mr = luma[y       * pW + (x + 1)];
          const bl = luma[(y + 1) * pW + (x - 1)];
          const bc = luma[(y + 1) * pW + x];
          const br = luma[(y + 1) * pW + (x + 1)];

          const gx = -tl - 2 * ml - bl + tr + 2 * mr + br;
          const gy = -tl - 2 * tc - tr + bl + 2 * bc + br;
          const mag = Math.sqrt(gx * gx + gy * gy);

          const idx = (y * pW + x) * 4;
          if (mag > THRESH) {
            const a = Math.min(255, Math.round((mag / 255) * 255 * ALPHA * 1.8));
            out[idx]     = cr;
            out[idx + 1] = cg;
            out[idx + 2] = cb;
            out[idx + 3] = a;
          }
          /* else transparent */
        }
      }

      /* write edge pixels back to offscreen */
      const edgeData = new ImageData(out, pW, pH);
      ctx2.putImageData(edgeData, 0, 0);

      /* scale up to overlay size */
      const ow = overlay.width;
      const oh = overlay.height;
      octx.clearRect(0, 0, ow, oh);
      octx.filter = `blur(${Math.max(2, Math.round(intensity * 0.08))}px)`;
      octx.drawImage(off, 0, 0, ow, oh);
      octx.filter = "none";

      /* second pass — sharper core line on top */
      octx.globalAlpha = 0.6;
      octx.filter = `blur(1px)`;
      octx.drawImage(off, 0, 0, ow, oh);
      octx.filter = "none";
      octx.globalAlpha = 1;
    };

    loop();
    return () => cancelAnimationFrame(rafRef.current);
  }, [enabled, isPlaying, intensity, color, videoEl]);

  if (!enabled) return null;

  return (
    <canvas
      ref={overlayRef}
      className="absolute inset-0 w-full h-full pointer-events-none"
      style={{ mixBlendMode: "screen" }}
      width={videoEl?.videoWidth ?? 640}
      height={videoEl?.videoHeight ?? 360}
    />
  );
}
