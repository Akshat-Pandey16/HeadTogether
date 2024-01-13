import { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "com.stafford.vite.capacitor",
  appName: "vite-and-capacitor",
  webDir: "dist",
  server: {
    androidScheme: "http",
    cleartext: true,
    allowNavigation: ["https://5471-2405-201-3005-e835-24da-8025-9bfd-b78f.ngrok-free.app*"],
  },
};

export default config;
