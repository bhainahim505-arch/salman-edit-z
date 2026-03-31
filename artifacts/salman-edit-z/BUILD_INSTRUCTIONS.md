# SALMAN EDIT-Z — APK Build Guide

## Prerequisites (install once on your laptop)

1. **Node.js 20+** — https://nodejs.org
2. **Java JDK 17** — https://adoptium.net
3. **Android Studio** — https://developer.android.com/studio
   - During setup choose: Android SDK, Android SDK Platform (API 34), Android Virtual Device

---

## Step 1 — Generate Keystore (ONE TIME ONLY — save this file forever!)

```bash
keytool -genkey -v \
  -keystore salman-editz.keystore \
  -alias salman-editz \
  -keyalg RSA -keysize 2048 \
  -validity 10000 \
  -dname "CN=Salman, OU=EditZ, O=SalmanEditZ, L=City, S=State, C=IN"
```

> **IMPORTANT:** Keep `salman-editz.keystore` safe. You need the SAME file for every future update.
> If you lose it, you can NEVER update the app on Play Store — you'd have to publish a new app.

---

## Step 2 — Clone & Install

```bash
git clone <your-repo-url>
cd salman-edit-z
pnpm install
```

---

## Step 3 — Build Web App

```bash
pnpm --filter @workspace/salman-edit-z run build
```

---

## Step 4 — Add Android Platform (FIRST TIME ONLY)

```bash
cd artifacts/salman-edit-z
npx cap add android
```

---

## Step 5 — Copy Web Build into Android

```bash
cd artifacts/salman-edit-z
npx cap sync android
```

---

## Step 6 — Add Unity Ads to Gradle

Open `artifacts/salman-edit-z/android/app/build.gradle` and add inside `dependencies { }`:

```gradle
implementation 'com.unity3d.ads:unity-ads:4.10.0'
```

---

## Step 7 — Add Unity Ads Capacitor Plugin (Native Java)

In `android/app/src/main/java/com/salman/editz/MainActivity.java`, add the plugin registration:

```java
import com.salman.editz.UnityAdsPlugin;  // we ship this file

@Override
public void onCreate(Bundle savedInstanceState) {
    super.onCreate(savedInstanceState);
    registerPlugin(UnityAdsPlugin.class);
}
```

The plugin file `android/app/src/main/java/com/salman/editz/UnityAdsPlugin.java` is already
included in the android project after `cap sync`.

---

## Step 8 — Build Signed APK

```bash
cd artifacts/salman-edit-z/android

./gradlew assembleRelease \
  -Pandroid.injected.signing.store.file=../../../salman-editz.keystore \
  -Pandroid.injected.signing.store.password=YOUR_KEYSTORE_PASSWORD \
  -Pandroid.injected.signing.key.alias=salman-editz \
  -Pandroid.injected.signing.key.password=YOUR_KEY_PASSWORD
```

**APK location:** `android/app/build/outputs/apk/release/app-release.apk`

---

## Unity Ads — Already Wired In

| Setting | Value |
|---|---|
| Game ID (Android) | `6067350` |
| Interstitial Placement | `Interstitial_Android` |
| Banner Placement | `Banner_Android` |
| Rewarded Placement | `Rewarded_Android` |

The JS integration is in `src/unityAds.ts`.
`showInterstitial()` is automatically called after every 3 video exports.

---

## App Icon

Your Gold Z + Fire logo is at `public/icon.jpg` — Capacitor will automatically use it
as the Android launcher icon during `cap sync`.

---

## Total time: ~30 minutes (if Android Studio is already installed)
