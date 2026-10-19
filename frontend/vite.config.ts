import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { viteSingleFile } from "vite-plugin-singlefile";
import path from "path";

export default defineConfig(({ mode }) => ({
  plugins: [react(), tailwindcss(), viteSingleFile()],
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "./src"),
    },
  },
  build: {
    outDir: "../internal/assets/dist",
    emptyOutDir: mode !== "bubble",
    rollupOptions: {
      input: path.resolve(import.meta.dirname, mode === "bubble" ? "bubble.html" : "index.html"),
    },
  },
}));
