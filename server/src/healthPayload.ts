// Developed by Sydney Edwards
import { readFileSync } from "node:fs";
import path from "node:path";
import { getDataDir } from "./data/storagePaths";

function readServerVersion(): string {
  const candidates = [
    path.join(process.cwd(), "package.json"),
    path.join(process.cwd(), "server", "package.json")
  ];
  for (const p of candidates) {
    try {
      const v = JSON.parse(readFileSync(p, "utf-8")).version;
      if (typeof v === "string" && v.length > 0) return v;
    } catch {
      /* try next */
    }
  }
  return "0.0.0";
}

export function buildHealthData() {
  const env = process.env.NODE_ENV === "production" ? "production" : "development";
  return {
    status: "ok" as const,
    version: readServerVersion(),
    environment: env,
    dataDir: getDataDir(),
    uptime: Number(process.uptime().toFixed(1)),
    timestamp: new Date().toISOString()
  };
}
