import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
  },
  build: {
    // genlayer-js is a chunky SDK (500 KB min / 107 KB gzip) used by every
    // page via the wallet + contract reads; it ships as its own cached chunk.
    chunkSizeWarningLimit: 550,
    rollupOptions: {
      output: {
        manualChunks: {
          // Framework + routing: stable, rarely changes.
          react: ["react", "react-dom", "react-router-dom"],
          // GenLayer SDK: large dependency, best cached separately.
          genlayer: ["genlayer-js"],
        },
      },
    },
  },
});
