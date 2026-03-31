#!/bin/bash
# Patches the Capacitor-generated Android project with Unity Ads plugin.
# Run from: artifacts/salman-edit-z/

set -e
ANDROID_DIR="android"
PATCH_DIR="android-patches"

echo "==> Patching Android project with Unity Ads..."

# 1. Find the actual package directory (Capacitor may use com/salmanedit/app or com/salmanedit)
JAVA_SRC="$ANDROID_DIR/app/src/main/java"
MAIN_ACTIVITY=$(find "$JAVA_SRC" -name "MainActivity.java" 2>/dev/null | head -1)

if [ -z "$MAIN_ACTIVITY" ]; then
  echo "    ✗ MainActivity.java not found — skipping Unity Ads patch"
  echo "    (APK will still work; Unity Ads loads via web layer)"
  exit 0
fi

JAVA_PKG_DIR=$(dirname "$MAIN_ACTIVITY")
echo "    Found MainActivity at: $MAIN_ACTIVITY"

# 2. Copy UnityAdsPlugin.java to the same package directory
cp "$PATCH_DIR/app/src/main/java/com/salmanedit/UnityAdsPlugin.java" "$JAVA_PKG_DIR/UnityAdsPlugin.java"
echo "    ✓ UnityAdsPlugin.java copied to $JAVA_PKG_DIR"

# 3. Patch MainActivity.java to register UnityAdsPlugin (only if not already done)
if grep -q "UnityAdsPlugin" "$MAIN_ACTIVITY"; then
  echo "    ✓ MainActivity.java already patched"
else
  # Add import and register call
  sed -i 's/import com.getcapacitor.BridgeActivity;/import com.getcapacitor.BridgeActivity;\nimport android.os.Bundle;/' "$MAIN_ACTIVITY"
  sed -i 's/public class MainActivity extends BridgeActivity {/public class MainActivity extends BridgeActivity {\n    @Override\n    public void onCreate(Bundle savedInstanceState) {\n        registerPlugin(UnityAdsPlugin.class);\n        super.onCreate(savedInstanceState);\n    }/' "$MAIN_ACTIVITY"
  echo "    ✓ MainActivity.java patched"
fi

# 4. Patch app/build.gradle — add Unity Ads SDK dependency
BUILD_GRADLE="$ANDROID_DIR/app/build.gradle"
if grep -q "unity-ads" "$BUILD_GRADLE"; then
  echo "    ✓ build.gradle already has Unity Ads"
else
  sed -i 's/dependencies {/dependencies {\n    implementation "com.unity3d.ads:unity-ads:4.12.2"/' "$BUILD_GRADLE"
  echo "    ✓ Unity Ads SDK added to build.gradle"
fi

# 5. Add Unity Ads Maven repo to project-level build.gradle
PROJECT_GRADLE="$ANDROID_DIR/build.gradle"
if ! grep -q "unityads" "$PROJECT_GRADLE"; then
  sed -i 's/repositories {/repositories {\n        maven { url "https:\/\/unityads.unity3d.com\/android\/" }/' "$PROJECT_GRADLE"
  echo "    ✓ Unity Ads Maven repo added"
fi

# 6. Enable cleartext traffic in AndroidManifest.xml
MANIFEST="$ANDROID_DIR/app/src/main/AndroidManifest.xml"
if ! grep -q "usesCleartextTraffic" "$MANIFEST"; then
  sed -i 's/<application/<application\n        android:usesCleartextTraffic="true"/' "$MANIFEST"
  echo "    ✓ Cleartext traffic enabled"
fi

echo "==> Patching complete!"
