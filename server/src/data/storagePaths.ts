import path from "node:path";

export function getDataFilePath(fileName: string) {
  // Resolve relative to repo root so it works in both dev (ts-node/tsx) and
  // prod (tsc output with different directory shapes).
  // Override via `THE_RUCK_DATA_DIR` if you want to persist elsewhere.
  const baseDir = process.env.THE_RUCK_DATA_DIR ?? path.join(process.cwd(), "server", "data");
  return path.join(baseDir, fileName);
}

