/**
 * SegmentationEngine — MediaPipe Selfie Segmentation (WebGL)
 *
 * Loads the model from CDN. Returns a per-frame segmentation mask
 * (HTMLCanvasElement, white=person, black=background).
 * Runs entirely on device — GPU-accelerated via WebGL.
 */

const MP_CDN = "https://cdn.jsdelivr.net/npm/@mediapipe/selfie_segmentation@0.1.1675465747";

declare global {
  interface Window {
    SelfieSegmentation: new (config: { locateFile: (f: string) => string }) => {
      setOptions: (opts: Record<string, unknown>) => void;
      onResults: (cb: (r: { segmentationMask: HTMLCanvasElement }) => void) => void;
      initialize: () => Promise<void>;
      send: (input: { image: HTMLVideoElement | HTMLCanvasElement }) => Promise<void>;
      close: () => void;
    };
  }
}

export type SegMask = HTMLCanvasElement;

export class SegmentationEngine {
  private model: ReturnType<Window["SelfieSegmentation"]> | null = null;
  private _ready = false;
  private _loading = false;
  private _failed = false;
  private _mask: HTMLCanvasElement | null = null;
  private _busy = false;
  private frameNum = 0;

  get isReady() { return this._ready; }
  get isFailed() { return this._failed; }
  get isLoading() { return this._loading; }
  get mask()    { return this._mask; }

  async load(): Promise<void> {
    if (this._ready || this._loading || this._failed) return;
    this._loading = true;
    try {
      /* Inject CDN script if not already present */
      if (!window.SelfieSegmentation) {
        await new Promise<void>((res, rej) => {
          const s = document.createElement("script");
          s.src  = `${MP_CDN}/selfie_segmentation.js`;
          s.crossOrigin = "anonymous";
          s.onload  = () => res();
          s.onerror = () => rej(new Error("MediaPipe CDN failed"));
          document.head.appendChild(s);
        });
      }

      this.model = new window.SelfieSegmentation({
        locateFile: (f: string) => `${MP_CDN}/${f}`,
      });

      this.model.setOptions({
        modelSelection: 1,   // 1 = landscape (highest quality, full-body)
        selfieMode: false,
      });

      this.model.onResults((results) => {
        this._mask = results.segmentationMask;
        this._busy = false;
      });

      await this.model.initialize();
      this._ready   = true;
      this._loading = false;
    } catch (err) {
      console.warn("[SegEngine] Failed to load MediaPipe:", err);
      this._failed  = true;
      this._loading = false;
    }
  }

  /** Send a video frame for segmentation. Throttled to every 2nd frame. */
  async process(videoEl: HTMLVideoElement): Promise<void> {
    if (!this._ready || this._busy || !this.model) return;
    if (videoEl.readyState < 2 || videoEl.paused && videoEl.currentTime === 0) return;
    this.frameNum++;
    if (this.frameNum % 2 !== 0) return; // 30fps throttle
    this._busy = true;
    try {
      await this.model.send({ image: videoEl });
    } catch {
      this._busy = false;
    }
  }

  destroy(): void {
    try { this.model?.close(); } catch {}
    this.model  = null;
    this._ready = false;
    this._mask  = null;
  }
}
