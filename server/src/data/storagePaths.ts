// Developed by Sydney Edwards
import path from "node:path";

export function getDataFilePath(fileName: string) {
  // Resolve relative to repo root so it works in both dev (ts-node/tsx) and
  // prod (tsc output with different directory shapes).
  // Override via `THE_RUCK_DATA_DIR` if you want to persist elsewhere.
  const cwd = process.cwd();
  const defaultDataDir = cwd.endsWith(`${path.sep}server`)
    ? path.join(cwd, "data")
    : path.join(cwd, "server", "data");
  // DATA_DIR (tests) or THE_RUCK_DATA_DIR (runtime override)
  const baseDir = process.env.DATA_DIR ?? process.env.THE_RUCK_DATA_DIR ?? defaultDataDir;
  return path.join(baseDir, fileName);
}

