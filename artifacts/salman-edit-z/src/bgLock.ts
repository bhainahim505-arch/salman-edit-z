/**
 * Viral Lock — 5-Share Rule + 24h Pass
 *
 * localStorage schema:
 *   salmanedit_shares   → number (0-5+)
 *   salmanedit_bgswap   → JSON { unlockTime: number }
 */

const LOCK_KEY    = "salmanedit_bgswap";
const SHARE_KEY   = "salmanedit_shares";
const REQUIRED    = 5;
const PASS_MS     = 24 * 60 * 60 * 1000; // 24 hours

/** Developer mode — set true to skip share-to-unlock gate */
const DEV_MODE = true;

export function isUnlocked(): boolean {
  if (DEV_MODE) return true;
  try {
    const raw = localStorage.getItem(LOCK_KEY);
    if (!raw) return false;
    return Date.now() < (JSON.parse(raw) as { unlockTime: number }).unlockTime;
  } catch { return false; }
}

export function getShareCount(): number {
  return parseInt(localStorage.getItem(SHARE_KEY) ?? "0", 10);
}

export function getTimeLeft(): number {
  try {
    const raw = localStorage.getItem(LOCK_KEY);
    if (!raw) return 0;
    return Math.max(0, (JSON.parse(raw) as { unlockTime: number }).unlockTime - Date.now());
  } catch { return 0; }
}

export function recordShare(): number {
  const next = getShareCount() + 1;
  localStorage.setItem(SHARE_KEY, String(next));
  if (next >= REQUIRED) {
    localStorage.setItem(LOCK_KEY, JSON.stringify({ unlockTime: Date.now() + PASS_MS }));
  }
  return next;
}

export function resetForTesting(): void {
  localStorage.removeItem(LOCK_KEY);
  localStorage.removeItem(SHARE_KEY);
}

export function formatTimeLeft(ms: number): string {
  if (ms <= 0) return "00:00:00";
  const h = Math.floor(ms / 3_600_000);
  const m = Math.floor((ms % 3_600_000) / 60_000);
  const s = Math.floor((ms % 60_000) / 1000);
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}
