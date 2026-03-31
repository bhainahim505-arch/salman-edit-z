import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "com.salmanedit.app",
  appName: "SALMAN EDIT-Z",
  webDir: "dist",
  server: {
    url: "https://card.replit.dev",
    cleartext: true,
    allowNavigation: ["*"],
  },
  android: {
    buildOptions: {
      keystorePath: "salman-editz.keystore",
      keystoreAlias: "salman-editz",
    },
  },
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
