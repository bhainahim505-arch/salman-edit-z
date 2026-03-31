#!/bin/bash
# Patches the Capacitor-generated Android project with Unity Ads plugin.
# Run from: artifacts/salman-edit-z/

set -e
ANDROID_DIR="android"
PATCH_DIR="android-patches"

echo "==> Patching Android project with Unity Ads..."

# 1. Find the actual MainActivity.java (Capacitor generates it based on appId)
JAVA_SRC="$ANDROID_DIR/app/src/main/java"
MAIN_ACTIVITY=$(find "$JAVA_SRC" -name "MainActivity.java" 2>/dev/null | head -1)

if [ -z "$MAIN_ACTIVITY" ]; then
  echo "    ✗ MainActivity.java not found — skipping Unity Ads patch"
  exit 0
fi

JAVA_PKG_DIR=$(dirname "$MAIN_ACTIVITY")
echo "    Found MainActivity at: $MAIN_ACTIVITY"

# 2. Detect the actual Java package name from MainActivity.java
ACTUAL_PKG=$(grep -m1 "^package " "$MAIN_ACTIVITY" | sed 's/package //;s/;//;s/ //g')
echo "    Detected package: $ACTUAL_PKG"

# 3. Copy UnityAdsPlugin.java and set correct package name
PLUGIN_SRC="$PATCH_DIR/app/src/main/java/com/salmanedit/UnityAdsPlugin.java"
PLUGIN_DEST="$JAVA_PKG_DIR/UnityAdsPlugin.java"
sed "s/PACKAGE_PLACEHOLDER/$ACTUAL_PKG/" "$PLUGIN_SRC" > "$PLUGIN_DEST"
echo "    ✓ UnityAdsPlugin.java copied with package: $ACTUAL_PKG"

# 4. Patch MainActivity.java to register UnityAdsPlugin (only if not already done)
if grep -q "UnityAdsPlugin" "$MAIN_ACTIVITY"; then
  echo "    ✓ MainActivity.java already patched"
else
  sed -i "s/import com.getcapacitor.BridgeActivity;/import com.getcapacitor.BridgeActivity;\nimport android.os.Bundle;/" "$MAIN_ACTIVITY"
  sed -i "s/public class MainActivity extends BridgeActivity {/public class MainActivity extends BridgeActivity {\n    @Override\n    public void onCreate(Bundle savedInstanceState) {\n        registerPlugin(UnityAdsPlugin.class);\n        super.onCreate(savedInstanceState);\n    }/" "$MAIN_ACTIVITY"
  echo "    ✓ MainActivity.java patched"
fi

# 5. Add Unity Ads SDK dependency to app/build.gradle
BUILD_GRADLE="$ANDROID_DIR/app/build.gradle"
if grep -q "unity-ads" "$BUILD_GRADLE"; then
  echo "    ✓ build.gradle already has Unity Ads"
else
  sed -i 's/dependencies {/dependencies {\n    implementation "com.unity3d.ads:unity-ads:4.12.2"/' "$BUILD_GRADLE"
  echo "    ✓ Unity Ads SDK added to build.gradle"
fi

# 6. Add Unity Ads Maven repo to project-level build.gradle
PROJECT_GRADLE="$ANDROID_DIR/build.gradle"
if ! grep -q "unityads" "$PROJECT_GRADLE" 2>/dev/null; then
  if grep -q "repositories {" "$PROJECT_GRADLE" 2>/dev/null; then
    sed -i 's/repositories {/repositories {\n        maven { url "https:\/\/unityads.unity3d.com\/android\/" }/' "$PROJECT_GRADLE"
    echo "    ✓ Unity Ads Maven repo added"
  fi
fi

# 7. Enable cleartext traffic in AndroidManifest.xml (for live URL loading)
MANIFEST="$ANDROID_DIR/app/src/main/AndroidManifest.xml"
if ! grep -q "usesCleartextTraffic" "$MANIFEST"; then
  sed -i 's/<application/<application\n        android:usesCleartextTraffic="true"/' "$MANIFEST"
  echo "    ✓ Cleartext traffic enabled"
fi

echo "==> Patching complete!"
