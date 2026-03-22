// Developed by Sydney Edwards
import path from "node:path";

/** Resolved JSON data directory (absolute or relative to cwd). */
export function getDataDir(): string {
  if (process.env.DATA_DIR && process.env.DATA_DIR.length > 0) {
    return process.env.DATA_DIR;
  }
  if (process.env.THE_RUCK_DATA_DIR && process.env.THE_RUCK_DATA_DIR.length > 0) {
    return process.env.THE_RUCK_DATA_DIR;
  }
  const cwd = process.cwd();
  return cwd.endsWith(`${path.sep}server`)
    ? path.join(cwd, "data")
    : path.join(cwd, "server", "data");
}

export function getDataFilePath(fileName: string) {
  return path.join(getDataDir(), fileName);
}

