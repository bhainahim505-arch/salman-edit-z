import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "com.salmanedit.app",
  appName: "SALMAN EDIT-Z",
  webDir: "dist/public",
  plugins: {
    SplashScreen: {
      launchShowDuration: 1500,
      backgroundColor: "#060606",
      androidSplashResourceName: "splash",
      showSpinner: false,
    },
  },
};

export default config;
