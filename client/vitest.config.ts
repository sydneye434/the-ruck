// Developed by Sydney Edwards
import path from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./tests/setupTests.ts"],
    include: ["tests/**/*.{test,spec}.{ts,tsx,js,jsx}"],
    coverage: {
      provider: "v8",
      reporter: ["text", "text-summary", "html"],
      reportsDirectory: "./coverage",
      /** Focus coverage on testable library code (not entire app shell). */
      include: ["src/lib/**/*.ts"],
      thresholds: {
        lines: 85,
        statements: 85,
        branches: 75,
        functions: 85
      }
    }
  },
  resolve: {
    alias: {
      "@the-ruck/shared": path.resolve(__dirname, "../shared/src/index.ts")
    }
  }
});
