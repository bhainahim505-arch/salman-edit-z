/**
 * SALMAN EDIT-Z — Zero-Load Service Worker
 *
 * Strategy: Cache-First for all static assets (JS, CSS, fonts, images).
 * All video-processing (canvas, WebCodecs, AudioContext) happens 100%
 * on the user's device. The server only serves files — ZERO compute.
 *
 * Cache Tiers:
 *  SHELL  → App shell (HTML, manifest, icons) — stale-while-revalidate
 *  STATIC → JS/CSS/fonts — immutable cache (Vite content-hashes)
 *  MEDIA  → Background images, lion, SVGs — long-lived cache
 */

const VERSION   = "salman-editz-v2";
const SHELL_KEY = `${VERSION}-shell`;
const ASSET_KEY = `${VERSION}-assets`;
const MEDIA_KEY = `${VERSION}-media`;

const SHELL_URLS = ["/", "/manifest.json", "/favicon.svg"];
const MEDIA_URLS = ["/lion-bg.jpg", "/icon.jpg", "/icon-512.jpg", "/opengraph.jpg"];

/* ── Install: pre-cache shell + media ── */
self.addEventListener("install", (event) => {
  event.waitUntil(
    Promise.all([
      caches.open(SHELL_KEY).then((c) => c.addAll(SHELL_URLS).catch(() => {})),
      caches.open(MEDIA_KEY).then((c) => c.addAll(MEDIA_URLS).catch(() => {})),
    ]).then(() => self.skipWaiting())
  );
});

/* ── Activate: delete old caches ── */
self.addEventListener("activate", (event) => {
  const keep = new Set([SHELL_KEY, ASSET_KEY, MEDIA_KEY]);
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => !keep.has(k)).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

/* ── Fetch: route by request type ── */
self.addEventListener("fetch", (event) => {
  const { request } = event;
  const url = new URL(request.url);

  /* Skip non-GET, cross-origin (CDN fonts etc. go through normally) */
  if (request.method !== "GET") return;
  if (url.origin !== self.location.origin) return;

  /* Vite hashed assets → immutable cache */
  if (url.pathname.startsWith("/assets/")) {
    event.respondWith(cacheFirst(request, ASSET_KEY, { immutable: true }));
    return;
  }

  /* Media assets → long-lived cache */
  const ext = url.pathname.split(".").pop() ?? "";
  if (["jpg", "jpeg", "png", "webp", "svg", "gif"].includes(ext)) {
    event.respondWith(cacheFirst(request, MEDIA_KEY));
    return;
  }

  /* App shell (HTML/manifest) → stale-while-revalidate */
  event.respondWith(staleWhileRevalidate(request, SHELL_KEY));
});

/* ── Strategies ── */

async function cacheFirst(request, cacheName, { immutable = false } = {}) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(request);
  if (cached) return cached;
  try {
    const response = await fetch(request);
    if (response.ok) {
      const clone = response.clone();
      if (immutable) {
        /* Store with 1-year max-age for content-hashed files */
        const headers = new Headers(clone.headers);
        headers.set("cache-control", "public, max-age=31536000, immutable");
        cache.put(request, new Response(await clone.arrayBuffer(), { headers, status: clone.status }));
      } else {
        cache.put(request, clone);
      }
    }
    return response;
  } catch {
    return new Response("Offline — please reconnect", { status: 503 });
  }
}

async function staleWhileRevalidate(request, cacheName) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(request);
  const networkFetch = fetch(request).then((response) => {
    if (response.ok) cache.put(request, response.clone());
    return response;
  }).catch(() => null);
  return cached ?? (await networkFetch) ?? new Response("Offline", { status: 503 });
}

/* ── Message: force update ── */
self.addEventListener("message", (event) => {
  if (event.data?.type === "SKIP_WAITING") self.skipWaiting();
});
