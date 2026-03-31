/**
 * PipOverlay — Picture-in-Picture Media Layer
 *
 * Renders a second video on top of the main video preview.
 * The overlay is:
 *  - Draggable  (grab anywhere on the clip to move it)
 *  - Resizable  (drag the ↘ corner handle)
 *  - Transparent (opacity controlled from PipPanel)
 *
 * Position and size are stored as percentages of the container
 * so they stay correct regardless of screen size.
 * The parent (VideoEditor) reads pipVideoRef to draw the overlay
 * into the export canvas so it's baked into the final video.
 */

import {
  useRef, useCallback, useEffect,
  type PointerEvent as RPointerEvent,
} from "react";

export interface PipState {
  x: number;   // % of container width
  y: number;   // % of container height
  w: number;   // % of container width
  opacity: number; // 0–1
}

interface Props {
  videoURL: string;
  state: PipState;
  onChange: (patch: Partial<PipState>) => void;
  containerRef: React.RefObject<HTMLDivElement | null>;
  isPlaying: boolean;
  videoRef: React.RefObject<HTMLVideoElement | null>;
}

export default function PipOverlay({
  videoURL, state, onChange, containerRef, isPlaying, videoRef,
}: Props) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<{ startX: number; startY: number; origX: number; origY: number } | null>(null);
  const resizeRef = useRef<{ startX: number; startY: number; origW: number } | null>(null);

  /* sync play/pause with main video */
  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    if (isPlaying) { v.play().catch(() => {}); }
    else { v.pause(); }
  }, [isPlaying, videoRef]);

  /* ── Drag ── */
  const onDragDown = useCallback((e: RPointerEvent<HTMLDivElement>) => {
    if ((e.target as HTMLElement).dataset.resize) return; // let resize handle it
    e.stopPropagation();
    wrapRef.current?.setPointerCapture(e.pointerId);
    dragRef.current = { startX: e.clientX, startY: e.clientY, origX: state.x, origY: state.y };
  }, [state.x, state.y]);

  const onDragMove = useCallback((e: RPointerEvent<HTMLDivElement>) => {
    const d = dragRef.current;
    if (!d) return;
    const container = containerRef.current;
    if (!container) return;
    const { width: cw, height: ch } = container.getBoundingClientRect();
    const dx = ((e.clientX - d.startX) / cw) * 100;
    const dy = ((e.clientY - d.startY) / ch) * 100;
    const newX = Math.max(0, Math.min(100 - state.w, d.origX + dx));
    const newY = Math.max(0, Math.min(95, d.origY + dy));
    onChange({ x: newX, y: newY });
  }, [containerRef, state.w, onChange]);

  const onDragUp = useCallback(() => { dragRef.current = null; }, []);

  /* ── Resize ── */
  const onResizeDown = useCallback((e: RPointerEvent<HTMLDivElement>) => {
    e.stopPropagation();
    wrapRef.current?.setPointerCapture(e.pointerId);
    resizeRef.current = { startX: e.clientX, startY: e.clientY, origW: state.w };
  }, [state.w]);

  const onResizeMove = useCallback((e: RPointerEvent<HTMLDivElement>) => {
    const r = resizeRef.current;
    if (!r) return;
    const container = containerRef.current;
    if (!container) return;
    const { width: cw } = container.getBoundingClientRect();
    const dw = ((e.clientX - r.startX) / cw) * 100;
    const newW = Math.max(10, Math.min(80, r.origW + dw));
    onChange({ w: newW });
  }, [containerRef, onChange]);

  const onResizeUp = useCallback(() => { resizeRef.current = null; }, []);

  /* combined pointer handlers */
  const onPointerMove = useCallback((e: RPointerEvent<HTMLDivElement>) => {
    onDragMove(e);
    onResizeMove(e);
  }, [onDragMove, onResizeMove]);

  const onPointerUp = useCallback((e: RPointerEvent<HTMLDivElement>) => {
    onDragUp();
    onResizeUp();
    wrapRef.current?.releasePointerCapture(e.pointerId);
  }, [onDragUp, onResizeUp]);

  /* aspect ratio: maintain 16:9 for height */
  const heightPct = state.w * (9 / 16);

  return (
    <div
      ref={wrapRef}
      className="absolute rounded-lg overflow-hidden select-none"
      style={{
        left: `${state.x}%`,
        top: `${state.y}%`,
        width: `${state.w}%`,
        paddingBottom: `${heightPct}%`,
        opacity: state.opacity,
        cursor: "move",
        touchAction: "none",
        zIndex: 30,
        /* gold neon border */
        boxShadow: "0 0 0 2px #ffd700, 0 4px 20px rgba(0,0,0,0.7)",
        borderRadius: "6px",
      }}
      onPointerDown={onDragDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
    >
      <video
        ref={videoRef}
        src={videoURL}
        className="absolute inset-0 w-full h-full object-cover"
        loop
        playsInline
        muted={false}
      />

      {/* corner label */}
      <div
        className="absolute top-1 left-1 bg-[rgba(0,0,0,0.55)] text-[#ffd700] text-[8px] font-bold px-1.5 py-0.5 rounded pointer-events-none"
        style={{ lineHeight: 1.4 }}
      >
        PiP
      </div>

      {/* ↘ Resize handle */}
      <div
        data-resize="1"
        className="absolute bottom-0 right-0 w-5 h-5 flex items-end justify-end cursor-se-resize"
        style={{ zIndex: 40 }}
        onPointerDown={onResizeDown}
      >
        <svg width="12" height="12" viewBox="0 0 12 12" className="pointer-events-none mb-0.5 mr-0.5">
          <path d="M2 10 L10 10 L10 2" stroke="#ffd700" strokeWidth="2" fill="none" strokeLinecap="round" />
        </svg>
      </div>

      {/* close (×) button */}
      <button
        className="absolute top-1 right-1 w-5 h-5 rounded-full bg-[rgba(0,0,0,0.6)] flex items-center justify-center text-white text-xs hover:bg-red-600 transition-colors"
        style={{ zIndex: 40, lineHeight: 1 }}
        onPointerDown={(e) => e.stopPropagation()}
        onClick={(e) => { e.stopPropagation(); onChange({ x: -9999 }); }}
        title="Remove PiP"
      >
        ×
      </button>
    </div>
  );
}
