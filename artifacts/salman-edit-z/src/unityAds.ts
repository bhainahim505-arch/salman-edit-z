/**
 * SALMAN EDIT-Z — Unity Ads Integration
 * Game ID: 6067350 (Android)
 *
 * This module bridges the Capacitor Android layer with Unity Ads SDK.
 * On web (browser preview) all calls are no-ops so the editor still runs.
 *
 * HOW IT WORKS IN APK:
 *  1. UnityAdsPlugin (native Capacitor plugin) is registered in MainActivity.java
 *  2. Unity Ads SDK is added via Gradle dependency in android/app/build.gradle
 *  3. JS calls here → Capacitor bridge → UnityAdsPlugin.java → Unity Ads SDK
 */

declare global {
  interface Window {
    Capacitor?: {
      isNativePlatform: () => boolean;
      Plugins?: Record<string, unknown>;
    };
  }
}

const GAME_ID_ANDROID = "6067350";

const AD_PLACEMENTS = {
  /** Full-screen ad — show after every 3 exports */
  INTERSTITIAL: "Interstitial_Android",
  /** Banner at bottom of editor */
  BANNER: "Banner_Android",
  /** Rewarded ad — "Watch ad to unlock premium filter" */
  REWARDED: "Rewarded_Android",
} as const;

type Placement = (typeof AD_PLACEMENTS)[keyof typeof AD_PLACEMENTS];

function isNative(): boolean {
  return typeof window !== "undefined" && !!window.Capacitor?.isNativePlatform?.();
}

function getPlugin() {
  if (!isNative()) return null;
  return (window.Capacitor?.Plugins as Record<string, unknown> | undefined)
    ?.["UnityAds"] as Record<string, (...args: unknown[]) => Promise<unknown>> | null ?? null;
}

/**
 * Call once when the app starts (in App.tsx or main.tsx).
 * Initialises Unity Ads SDK with your Game ID.
 */
export async function initUnityAds(): Promise<void> {
  const plugin = getPlugin();
  if (!plugin) {
    console.log("[UnityAds] Web mode — SDK not loaded (normal in browser)");
    return;
  }
  try {
    await plugin["initialize"]({ gameId: GAME_ID_ANDROID, testMode: false });
    console.log("[UnityAds] Initialized ✓ Game ID:", GAME_ID_ANDROID);
  } catch (e) {
    console.warn("[UnityAds] Init failed:", e);
  }
}

/**
 * Load a specific ad placement in advance so it shows instantly.
 */
export async function loadAd(placement: Placement): Promise<void> {
  const plugin = getPlugin();
  if (!plugin) return;
  try {
    await plugin["load"]({ placementId: placement });
  } catch (e) {
    console.warn("[UnityAds] Load failed for", placement, e);
  }
}

/**
 * Show an interstitial ad.
 * Call after every 3 video exports.
 */
export async function showInterstitial(): Promise<void> {
  const plugin = getPlugin();
  if (!plugin) return;
  await loadAd(AD_PLACEMENTS.INTERSTITIAL);
  try {
    await plugin["show"]({ placementId: AD_PLACEMENTS.INTERSTITIAL });
  } catch (e) {
    console.warn("[UnityAds] Show interstitial failed:", e);
  }
}

/**
 * Show a rewarded ad.
 * Returns true if user watched the full ad (unlock premium filter etc.).
 */
export async function showRewarded(): Promise<boolean> {
  const plugin = getPlugin();
  if (!plugin) return false;
  await loadAd(AD_PLACEMENTS.REWARDED);
  try {
    const result = await plugin["show"]({ placementId: AD_PLACEMENTS.REWARDED });
    return (result as { rewarded?: boolean })?.rewarded === true;
  } catch {
    return false;
  }
}

/**
 * Show banner ad at the bottom of the screen.
 */
export async function showBanner(): Promise<void> {
  const plugin = getPlugin();
  if (!plugin) return;
  await loadAd(AD_PLACEMENTS.BANNER);
  try {
    await plugin["showBanner"]({ placementId: AD_PLACEMENTS.BANNER });
  } catch (e) {
    console.warn("[UnityAds] Show banner failed:", e);
  }
}

export async function hideBanner(): Promise<void> {
  const plugin = getPlugin();
  if (!plugin) return;
  try {
    await plugin["hideBanner"]({});
  } catch {}
}

export { AD_PLACEMENTS, GAME_ID_ANDROID };
