/**
 * WebGLFaceGrade — Real-time WebGL shader color grading on person
 *
 * Fragment shader applies environment-matched color tint to
 * the segmented person region: purple tones for wolf forest,
 * warm gold for palace, cyan for city, etc.
 *
 * Renders as a transparent canvas overlay (zIndex 3) composited
 * over the BgSwap canvas and below the OutfitCanvas (zIndex 4).
 */

import { useEffect, useRef } from "react";
import type { BgId } from "./BgSwapPanel";

/* ── Per-background color grade config ── */
interface GradeConfig {
  r: number; g: number; b: number;
  strength: number;
  gamma: number;
  shadowLift: number;
}

const ENV_GRADE: Record<BgId, GradeConfig> = {
  city:        { r: 0.05, g: 0.55, b: 1.00, strength: 0.20, gamma: 0.93, shadowLift: 0.02 },
  jungle:      { r: 1.00, g: 0.55, b: 0.10, strength: 0.22, gamma: 1.06, shadowLift: 0.03 },
  starship:    { r: 0.10, g: 0.45, b: 1.00, strength: 0.18, gamma: 0.91, shadowLift: 0.01 },
  moon:        { r: 0.50, g: 0.58, b: 1.00, strength: 0.13, gamma: 0.97, shadowLift: 0.01 },
  wolf_forest: { r: 0.42, g: 0.00, b: 0.90, strength: 0.28, gamma: 0.88, shadowLift: 0.03 },
  palace:      { r: 1.00, g: 0.52, b: 0.04, strength: 0.30, gamma: 1.10, shadowLift: 0.04 },
  storm:       { r: 0.38, g: 0.42, b: 0.65, strength: 0.15, gamma: 0.93, shadowLift: 0.02 },
  cyber_rain:  { r: 0.00, g: 0.92, b: 0.28, strength: 0.22, gamma: 0.87, shadowLift: 0.02 },
};

/* ── WebGL shader sources ── */
const VERT = `
attribute vec2 a_pos;
varying vec2 v_uv;
void main() {
  v_uv = a_pos * 0.5 + 0.5;
  gl_Position = vec4(a_pos, 0.0, 1.0);
}`;

const FRAG = `
precision mediump float;
varying vec2 v_uv;
uniform sampler2D u_video;
uniform sampler2D u_mask;
uniform vec3  u_tint;
uniform float u_strength;
uniform float u_gamma;
uniform float u_shadowLift;

vec3 grade(vec3 col) {
  /* Gamma correction */
  col = pow(max(col, vec3(0.0)), vec3(u_gamma));
  /* Shadow lift */
  col = col + u_shadowLift * (1.0 - col);
  /* Multiply pass — darks pick up tint */
  vec3 mul = col * mix(vec3(1.0), u_tint, u_strength);
  /* Screen pass — highs get boosted tint */
  vec3 scr = 1.0 - (1.0 - col) * (1.0 - u_tint * u_strength * 0.45);
  /* Blend: 65% multiply, 35% screen */
  return mix(mul, scr, 0.35);
}

void main() {
  /* Flip Y because canvas tex coords are inverted */
  vec2 uv = vec2(v_uv.x, 1.0 - v_uv.y);
  vec4 vid  = texture2D(u_video, uv);
  float msk = texture2D(u_mask, uv).r;

  vec3 graded = grade(vid.rgb);
  /* Only apply grade within person mask; fade at edges */
  float softMsk = smoothstep(0.15, 0.75, msk);
  vec3  result  = mix(vid.rgb, graded, softMsk);

  gl_FragColor  = vec4(result, vid.a * softMsk);
}`;

/* ── helpers ── */
function compileShader(gl: WebGLRenderingContext, type: number, src: string) {
  const s = gl.createShader(type)!;
  gl.shaderSource(s, src);
  gl.compileShader(s);
  return s;
}

function makeTex(gl: WebGLRenderingContext) {
  const t = gl.createTexture()!;
  gl.bindTexture(gl.TEXTURE_2D, t);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  return t;
}

/* ── Component ── */
interface Props {
  enabled: boolean;
  videoEl: HTMLVideoElement | null;
  maskCanvas: HTMLCanvasElement | null;
  bgId: BgId;
}

export default function WebGLFaceGrade({ enabled, videoEl, maskCanvas, bgId }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const glRef     = useRef<WebGLRenderingContext | null>(null);
  const progRef   = useRef<WebGLProgram | null>(null);
  const texVRef   = useRef<WebGLTexture | null>(null);
  const texMRef   = useRef<WebGLTexture | null>(null);
  const rafRef    = useRef(0);

  /* Init WebGL once */
  useEffect(() => {
    if (!enabled) return;
    const canvas = canvasRef.current;
    if (!canvas) return;

    const gl = canvas.getContext("webgl", { alpha: true, premultipliedAlpha: false });
    if (!gl) return;
    glRef.current = gl;

    const prog = gl.createProgram()!;
    gl.attachShader(prog, compileShader(gl, gl.VERTEX_SHADER, VERT));
    gl.attachShader(prog, compileShader(gl, gl.FRAGMENT_SHADER, FRAG));
    gl.linkProgram(prog);
    progRef.current = prog;
    gl.useProgram(prog);

    /* Full-screen quad */
    const buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
    const aPos = gl.getAttribLocation(prog, "a_pos");
    gl.enableVertexAttribArray(aPos);
    gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 0, 0);

    texVRef.current = makeTex(gl);
    texMRef.current = makeTex(gl);

    gl.uniform1i(gl.getUniformLocation(prog, "u_video"), 0);
    gl.uniform1i(gl.getUniformLocation(prog, "u_mask"),  1);

    gl.enable(gl.BLEND);
    gl.blendFuncSeparate(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA, gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
  }, [enabled]);

  /* Render loop */
  useEffect(() => {
    cancelAnimationFrame(rafRef.current);
    if (!enabled) return;

    const render = () => {
      rafRef.current = requestAnimationFrame(render);
      const gl   = glRef.current;
      const prog = progRef.current;
      if (!gl || !prog) return;
      if (!videoEl || videoEl.readyState < 2) return;
      if (!maskCanvas) return;

      gl.useProgram(prog);

      const cfg = ENV_GRADE[bgId];
      gl.uniform3f(gl.getUniformLocation(prog, "u_tint"), cfg.r, cfg.g, cfg.b);
      gl.uniform1f(gl.getUniformLocation(prog, "u_strength"),   cfg.strength);
      gl.uniform1f(gl.getUniformLocation(prog, "u_gamma"),      cfg.gamma);
      gl.uniform1f(gl.getUniformLocation(prog, "u_shadowLift"), cfg.shadowLift);

      /* Upload video frame */
      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, texVRef.current);
      try { gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, videoEl); } catch { return; }

      /* Upload mask */
      gl.activeTexture(gl.TEXTURE1);
      gl.bindTexture(gl.TEXTURE_2D, texMRef.current);
      try { gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, maskCanvas); } catch { return; }

      gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);
      gl.clearColor(0, 0, 0, 0);
      gl.clear(gl.COLOR_BUFFER_BIT);
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    };

    render();
    return () => cancelAnimationFrame(rafRef.current);
  }, [enabled, videoEl, maskCanvas, bgId]);

  if (!enabled) return null;

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 w-full h-full pointer-events-none"
      style={{ zIndex: 3, mixBlendMode: "normal" }}
      width={1280}
      height={720}
    />
  );
}
