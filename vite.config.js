import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { catalogueBuildMode } from "./scripts/catalogue-build-mode.mjs";

export default defineConfig({
  plugins: [react(), {
    name: "catalogue-mode-marker",
    transformIndexHtml() { return [{ tag: "meta", attrs: { name: "pdd-catalogue-mode", content: catalogueBuildMode() }, injectTo: "head" }]; },
  }],
  server: {
    host: "127.0.0.1",
    port: 5277,
    strictPort: true,
  },
  preview: {
    host: "127.0.0.1",
    port: 5277,
    strictPort: true,
  },
});
