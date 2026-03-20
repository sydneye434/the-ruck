import path from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Workspace package @the-ruck/shared points main -> dist/index.js, but dist is only created by `npm -w shared run build`.
// TypeScript uses paths to ../shared/src — without this alias, Vite resolves the package entry and the app fails to load (blank page).
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@the-ruck/shared": path.resolve(__dirname, "../shared/src/index.ts")
    }
  },
  server: {
    port: 5173
  }
});

