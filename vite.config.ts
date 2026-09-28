import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

declare const process: {
  env: Record<string, string | undefined>;
};

const host = typeof process !== "undefined" ? process.env.TAURI_DEV_HOST : undefined;

export default defineConfig(() => ({
  plugins: [react()],
  build: {
    sourcemap: false,
    minify: true,
    cssMinify: true,
  },
  clearScreen: false,
  server: {
    port: 1420,
    strictPort: true,
    host: host || false,
    hmr: host
      ? {
          protocol: "ws",
          host,
          port: 1421,
        }
      : undefined,
    watch: {
      ignored: ["*src-tauri*"],
    },
  },
}));
