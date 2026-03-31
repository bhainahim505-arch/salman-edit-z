/**
 * ViralLockModal — 5-Share Rule Gate
 *
 * Shows when user tries to use Background Swap without the pass.
 * User must share the app link to 5 people to unlock for 24 hours.
 * Uses navigator.share (Web Share API) with WhatsApp deep-link fallback.
 */

import { useState, useEffect, useCallback } from "react";
import { getShareCount, recordShare, isUnlocked, getTimeLeft, formatTimeLeft } from "../bgLock";

interface Props {
  onUnlock: () => void;
  onClose: () => void;
}

const APP_URL = typeof window !== "undefined" ? window.location.origin : "https://salman-edit-z.replit.app";
const SHARE_TEXT = "🔥 Bhai, check out Salman Edit-Z — free pro video editor with AI Wings, Filters, Beat Sync & more! ";
const REQUIRED = 5;

export default function ViralLockModal({ onUnlock, onClose }: Props) {
  const [count, setCount] = useState(getShareCount);
  const [sharing, setSharing] = useState(false);
  const [justShared, setJustShared] = useState(false);
  const [timeLeft, setTimeLeft] = useState(getTimeLeft);

  /* countdown timer when already unlocked */
  useEffect(() => {
    if (!isUnlocked()) return;
    const id = setInterval(() => setTimeLeft(getTimeLeft()), 1000);
    return () => clearInterval(id);
  }, []);

  const doShare = useCallback(async () => {
    setSharing(true);
    let success = false;

    try {
      if (navigator.share) {
        await navigator.share({ title: "Salman Edit-Z", text: SHARE_TEXT, url: APP_URL });
        success = true;
      } else {
        /* WhatsApp deep-link fallback */
        const wa = `https://wa.me/?text=${encodeURIComponent(SHARE_TEXT + APP_URL)}`;
        window.open(wa, "_blank");
        success = true; // treat as shared
      }
    } catch { /* user cancelled — don't count */ }

    if (success) {
      const next = recordShare();
      setCount(next);
      setJustShared(true);
      setTimeout(() => setJustShared(false), 2000);
      if (next >= REQUIRED) {
        setTimeout(() => onUnlock(), 600);
      }
    }
    setSharing(false);
  }, [onUnlock]);

  const remaining = Math.max(0, REQUIRED - count);
  const progress = Math.min(1, count / REQUIRED);

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center"
      style={{ background: "rgba(0,0,0,0.85)", backdropFilter: "blur(12px)" }}
    >
      <div className="w-full max-w-md bg-[#0a0a0a] border border-[rgba(255,215,0,0.3)] rounded-t-3xl p-5 pb-8 shadow-[0_-20px_60px_rgba(255,215,0,0.15)]">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="w-8 h-1 rounded-full bg-[rgba(184,134,11,0.3)] mx-auto absolute left-1/2 -translate-x-1/2 top-3" />
          <button onClick={onClose} className="ml-auto text-[rgba(184,134,11,0.4)] hover:text-[#ffd700] transition-colors text-xl leading-none">×</button>
        </div>

        {/* Lock icon */}
        <div className="flex justify-center mb-3">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[#1a1a00] to-[#0d0d0d] border border-[rgba(255,215,0,0.3)] flex items-center justify-center shadow-[0_0_30px_rgba(255,215,0,0.2)]">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
              <rect x="3" y="11" width="18" height="11" rx="2" fill="url(#lgold)" />
              <path d="M7 11V7a5 5 0 0 1 10 0v4" stroke="#ffd700" strokeWidth="2" strokeLinecap="round" />
              <circle cx="12" cy="16" r="1.5" fill="#0d0d0d" />
              <defs>
                <linearGradient id="lgold" x1="0" y1="0" x2="18" y2="11" gradientUnits="userSpaceOnUse">
                  <stop offset="0%" stopColor="#b8860b" />
                  <stop offset="100%" stopColor="#ffd700" />
                </linearGradient>
              </defs>
            </svg>
          </div>
        </div>

        {/* Title */}
        <h2 className="text-center text-[#ffd700] font-black text-xl mb-1 tracking-wide">
          2030 Ka Future Filter 🔒
        </h2>
        <p className="text-center text-[rgba(184,134,11,0.6)] text-sm mb-5 leading-relaxed px-2">
          Bhai, ye ultra-rare AI Background Swap feature unlock karne ke liye<br />
          <span className="text-[#ffd700] font-bold">apne {REQUIRED} dosto ko share karo!</span>
        </p>

        {/* Progress */}
        <div className="mb-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[rgba(184,134,11,0.6)] text-xs">Shares</span>
            <span className="text-[#ffd700] font-bold text-sm">{count} / {REQUIRED}</span>
          </div>
          <div className="h-2.5 bg-[rgba(184,134,11,0.1)] rounded-full overflow-hidden border border-[rgba(184,134,11,0.15)]">
            <div
              className="h-full rounded-full transition-all duration-500"
              style={{
                width: `${progress * 100}%`,
                background: progress >= 1
                  ? "linear-gradient(90deg, #b8860b, #ffd700, #ffec8b)"
                  : "linear-gradient(90deg, #b8860b, #ffd700)",
                boxShadow: "0 0 8px rgba(255,215,0,0.5)",
              }}
            />
          </div>
          {/* dots */}
          <div className="flex justify-between mt-2 px-0.5">
            {Array.from({ length: REQUIRED }).map((_, i) => (
              <div key={i} className={`w-6 h-6 rounded-full border-2 flex items-center justify-center text-[10px] transition-all ${
                i < count
                  ? "border-[#ffd700] bg-[rgba(255,215,0,0.2)] text-[#ffd700]"
                  : "border-[rgba(184,134,11,0.2)] text-[rgba(184,134,11,0.3)]"
              }`}>
                {i < count ? "✓" : i + 1}
              </div>
            ))}
          </div>
        </div>

        {remaining > 0 ? (
          <>
            {/* Share button */}
            <button
              onClick={doShare}
              disabled={sharing}
              className="w-full py-4 rounded-2xl font-black text-[#0d0d0d] text-base transition-all disabled:opacity-60 relative overflow-hidden"
              style={{
                background: justShared
                  ? "linear-gradient(135deg, #00c851, #00a843)"
                  : "linear-gradient(135deg, #b8860b, #ffd700, #ffec8b)",
                boxShadow: "0 0 30px rgba(255,215,0,0.4)",
              }}
            >
              {justShared
                ? "✓ Shared! " + (remaining - 1 > 0 ? `${remaining - 1} more baaki` : "Unlocking...")
                : sharing
                ? "Opening..."
                : `📤 Share Karo — ${remaining} baaki`}
            </button>

            <p className="text-center text-[rgba(184,134,11,0.35)] text-[10px] mt-3">
              WhatsApp, Instagram, ya kisi bhi app mein share karo
            </p>
          </>
        ) : (
          /* Already unlocked or just completed */
          <div className="flex flex-col gap-3">
            <div className="p-3 bg-[rgba(255,215,0,0.08)] rounded-2xl border border-[rgba(255,215,0,0.3)] text-center">
              <p className="text-[#ffd700] font-bold text-sm">🎉 Unlock Ho Gaya!</p>
              <p className="text-[rgba(184,134,11,0.6)] text-xs mt-1">
                24 ghante baaki: <span className="text-[#ffd700] font-mono">{formatTimeLeft(timeLeft)}</span>
              </p>
            </div>
            <button
              onClick={onUnlock}
              className="w-full py-4 rounded-2xl font-black text-[#0d0d0d] text-base"
              style={{ background: "linear-gradient(135deg, #b8860b, #ffd700)", boxShadow: "0 0 30px rgba(255,215,0,0.4)" }}
            >
              🚀 Open Background Swap
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
