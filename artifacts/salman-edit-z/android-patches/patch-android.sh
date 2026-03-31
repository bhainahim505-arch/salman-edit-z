#!/bin/bash
# This script patches the Capacitor-generated Android project
# with Unity Ads plugin and configuration.
# Run from: artifacts/salman-edit-z/

set -e
ANDROID_DIR="android"
PATCH_DIR="android-patches"
APP_ID="com.salmanedit"
JAVA_PATH="$ANDROID_DIR/app/src/main/java/com/salmanedit"

echo "==> Patching Android project with Unity Ads..."

# 1. Copy UnityAdsPlugin.java
mkdir -p "$JAVA_PATH"
cp "$PATCH_DIR/app/src/main/java/com/salmanedit/UnityAdsPlugin.java" "$JAVA_PATH/UnityAdsPlugin.java"
echo "    ✓ UnityAdsPlugin.java copied"

# 2. Patch MainActivity.java to register UnityAdsPlugin
MAIN_ACTIVITY="$JAVA_PATH/MainActivity.java"
if grep -q "UnityAdsPlugin" "$MAIN_ACTIVITY"; then
  echo "    ✓ MainActivity.java already patched"
else
  sed -i 's/public class MainActivity extends BridgeActivity {/public class MainActivity extends BridgeActivity {\n    @Override\n    public void onCreate(Bundle savedInstanceState) {\n        registerPlugin(UnityAdsPlugin.class);\n        super.onCreate(savedInstanceState);\n    }/' "$MAIN_ACTIVITY"
  # Add import
  sed -i 's/import com.getcapacitor.BridgeActivity;/import com.getcapacitor.BridgeActivity;\nimport android.os.Bundle;/' "$MAIN_ACTIVITY"
  echo "    ✓ MainActivity.java patched"
fi

# 3. Patch app/build.gradle to add Unity Ads SDK
BUILD_GRADLE="$ANDROID_DIR/app/build.gradle"
if grep -q "unity-ads" "$BUILD_GRADLE"; then
  echo "    ✓ build.gradle already has Unity Ads"
else
  # Add Unity Ads repository to project-level build.gradle
  PROJECT_GRADLE="$ANDROID_DIR/build.gradle"
  if ! grep -q "unityads" "$PROJECT_GRADLE"; then
    sed -i 's/repositories {/repositories {\n        maven { url "https:\/\/unityads.unity3d.com\/android\/" }/' "$PROJECT_GRADLE"
  fi

  # Add Unity Ads dependency to app/build.gradle
  sed -i 's/dependencies {/dependencies {\n    implementation "com.unity3d.ads:unity-ads:4.12.2"/' "$BUILD_GRADLE"
  echo "    ✓ Unity Ads SDK added to build.gradle"
fi

# 4. Enable cleartext traffic in AndroidManifest.xml (for Live Update / http fallback)
MANIFEST="$ANDROID_DIR/app/src/main/AndroidManifest.xml"
if ! grep -q "usesCleartextTraffic" "$MANIFEST"; then
  sed -i 's/<application/<application\n        android:usesCleartextTraffic="true"/' "$MANIFEST"
  echo "    ✓ Cleartext traffic enabled in manifest"
fi

echo "==> Patching complete!"
