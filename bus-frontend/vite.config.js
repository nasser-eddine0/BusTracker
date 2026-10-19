import { defineConfig } from "vite";
import os from "node:os";
import path from "node:path";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  cacheDir: globalThis.process?.env?.VITE_CACHE_DIR || path.join(os.tmpdir(), "bus-tracker-vite-cache"),
  server: {
    host: true,   // expose to LAN so you can open it on your phone
  },
});
