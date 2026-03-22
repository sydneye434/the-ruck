#!/usr/bin/env node
/**
 * Rasterize illustrative SVGs to PNG for GitHub README (GitHub often blocks SVG embeds).
 * Run from repo root: node docs/screenshots/rasterize.mjs
 */
import { readdir } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));

async function main() {
  let sharp;
  try {
    sharp = (await import("sharp")).default;
  } catch {
    console.error("Install sharp: npm install sharp --save-dev (from repo root)");
    process.exit(1);
  }

  const files = await readdir(__dirname);
  const svgs = files.filter((f) => f.endsWith(".svg"));
  if (svgs.length === 0) {
    console.error("No SVG files found in", __dirname);
    process.exit(1);
  }

  for (const name of svgs) {
    const input = join(__dirname, name);
    const outName = name.replace(/\.svg$/i, ".png");
    const output = join(__dirname, outName);
    await sharp(input).png({ compressionLevel: 9 }).toFile(output);
    console.log("Wrote", outName);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
