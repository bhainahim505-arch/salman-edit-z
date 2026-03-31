/**
 * SmokeGlowOverlay — WebGL Smoke Noise + Glowing Edge Effect
 *
 * Implements the SMOKE_GLOW_SHADER provided:
 *   - Dynamic smoke noise movement (noise(vUv * 5 + uTime * 0.2))
 *   - Glowing edge on person boundary (anti-chhipkaya hua effect)
 *   - Cinematic lighting over BG composite
 *
 * Inputs:
 *   uBackground — full bgSwapCanvas (bg + person already composited)
 *   uMask       — segmentation mask (person region = bright)
 *   uTime       — seconds since start
 *   uGlowColor  — per-environment edge glow color (wolf=purple, palace=gold, etc.)
 */

import { useEffect, useRef } from "react";
import type { BgId } from "./BgSwapPanel";

/* ── Per-environment glow color ── */
const ENV_GLOW: Record<BgId, [number, number, number]> = {
  city:        [0.10, 0.70, 1.00],
  jungle:      [1.00, 0.65, 0.10],
  starship:    [0.20, 0.50, 1.00],
  moon:        [0.70, 0.80, 1.00],
  wolf_forest: [0.60, 0.00, 1.00],  /* vivid purple */
  palace:      [1.00, 0.65, 0.05],  /* warm gold    */
  storm:       [0.50, 0.60, 0.90],
  cyber_rain:  [0.00, 1.00, 0.35],
};

/* ── Vertex shader ── */
const VERT = `
attribute vec2 a_pos;
varying vec2 vUv;
void main() {
  vUv = a_pos * 0.5 + 0.5;
  gl_Position = vec4(a_pos, 0.0, 1.0);
}`;

/* ── Fragment shader (user's shader adapted for WebGL) ── */
const FRAG = `
precision mediump float;
varying vec2 vUv;
uniform float     uTime;
uniform sampler2D uBackground;
uniform sampler2D uMask;
uniform vec3      uGlowColor;

/* Hash noise — equivalent to user's fract(sin(dot)) noise */
float noise(vec2 p) {
  return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453);
}

/* Smooth value noise — 4-tap bilinear for silkier smoke */
float smoothNoise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  f = f * f * (3.0 - 2.0 * f);            /* smoothstep */
  float a = noise(i);
  float b = noise(i + vec2(1.0, 0.0));
  float c = noise(i + vec2(0.0, 1.0));
  float d = noise(i + vec2(1.0, 1.0));
  return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
}

/* 3-octave fractal smoke */
float fbm(vec2 p) {
  float v = 0.0;
  v += 0.500 * smoothNoise(p);
  v += 0.250 * smoothNoise(p * 2.0 + vec2(1.7, 9.2));
  v += 0.125 * smoothNoise(p * 4.0 + vec2(8.3, 2.8));
  return v;
}

void main() {
  /* Flip Y to match canvas coordinate system */
  vec2 uv    = vec2(vUv.x, 1.0 - vUv.y);

  vec4 bg    = texture2D(uBackground, uv);
  float msk  = texture2D(uMask,       uv).r;

  /* ── Dynamic Smoke Movement ──
     Matches user's: noise(vUv * 5.0 + uTime * 0.2) * 0.3 */
  float smoke = fbm(vUv * 5.0 + uTime * 0.2);
  vec3 smokeColor = vec3(0.8, 0.8, 0.9) * smoke * 0.30;

  /* Only show smoke outside/at edge of person (not inside) */
  float smokeMask = 1.0 - smoothstep(0.3, 0.8, msk);
  smokeColor *= smokeMask;

  /* ── Glowing Edge (Anti-Chhipkaya Hua Effect) ──
     exp(-edge * 10.0) creates narrow bright halo
     User's: float edge = 1.0 - subject.a; */
  float innerEdge = smoothstep(0.20, 0.60, msk);
  float outerEdge = 1.0 - smoothstep(0.60, 0.95, msk);
  float edgeBand  = innerEdge * outerEdge;          /* ring at boundary */

  /* Animated pulse on the glow */
  float pulse = 0.75 + 0.25 * sin(uTime * 2.8);
  vec3  glow  = uGlowColor * edgeBand * 0.65 * pulse;

  /* ── Combine Everything with Cinematic Lighting ──
     User's: mix(bg.rgb + smokeColor, subject.rgb + glow, subject.a)
     We keep the existing bg composite and layer smoke + glow on top */
  vec3 finalColor = bg.rgb + smokeColor + glow;

  /* Slight vignette for cinematic feel */
  float vig = 1.0 - dot(vUv - 0.5, (vUv - 0.5) * 1.6);
  finalColor *= clamp(vig, 0.0, 1.0);

  gl_FragColor = vec4(finalColor, 1.0);
}`;

/* ── WebGL helpers ── */
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
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S,     gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T,     gl.CLAMP_TO_EDGE);
  return t;
}

/* ── Component ── */
interface Props {
  enabled:    boolean;
  bgCanvas:   HTMLCanvasElement | null;   /* bgSwapCanvasRef — full composite */
  maskCanvas: HTMLCanvasElement | null;   /* segmentation mask */
  bgId:       BgId;
}

export default function SmokeGlowOverlay({ enabled, bgCanvas, maskCanvas, bgId }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const glRef     = useRef<WebGLRenderingContext | null>(null);
  const progRef   = useRef<WebGLProgram | null>(null);
  const texBgRef  = useRef<WebGLTexture | null>(null);
  const texMkRef  = useRef<WebGLTexture | null>(null);
  const t0Ref     = useRef(performance.now());
  const rafRef    = useRef(0);

  /* Init WebGL once */
  useEffect(() => {
    if (!enabled) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const gl = canvas.getContext("webgl", { alpha: false, premultipliedAlpha: false });
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
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1,-1, 1,-1, -1,1, 1,1]), gl.STATIC_DRAW);
    const aPos = gl.getAttribLocation(prog, "a_pos");
    gl.enableVertexAttribArray(aPos);
    gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 0, 0);

    texBgRef.current = makeTex(gl);
    texMkRef.current = makeTex(gl);

    gl.uniform1i(gl.getUniformLocation(prog, "uBackground"), 0);
    gl.uniform1i(gl.getUniformLocation(prog, "uMask"),       1);
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
      if (!bgCanvas)   return;

      const t = (performance.now() - t0Ref.current) / 1000;
      gl.useProgram(prog);

      /* Uniforms */
      gl.uniform1f(gl.getUniformLocation(prog, "uTime"), t);
      const [gr, gg, gb] = ENV_GLOW[bgId];
      gl.uniform3f(gl.getUniformLocation(prog, "uGlowColor"), gr, gg, gb);

      /* Upload BG canvas */
      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, texBgRef.current);
      try { gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, bgCanvas); } catch { return; }

      /* Upload mask (or 1×1 white if no mask yet) */
      gl.activeTexture(gl.TEXTURE1);
      gl.bindTexture(gl.TEXTURE_2D, texMkRef.current);
      if (maskCanvas) {
        try { gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, maskCanvas); } catch { return; }
      } else {
        /* No mask — smoke everywhere, no edge glow */
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE,
          new Uint8Array([0, 0, 0, 255]));
      }

      gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);
      gl.clear(gl.COLOR_BUFFER_BIT);
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    };

    render();
    return () => cancelAnimationFrame(rafRef.current);
  }, [enabled, bgCanvas, maskCanvas, bgId]);

  if (!enabled) return null;

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 w-full h-full pointer-events-none"
      style={{ zIndex: 2 }}
      width={1280}
      height={720}
    />
  );
}
