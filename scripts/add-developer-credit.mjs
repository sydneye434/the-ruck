/**
 * One-time utility: prepend "Developed by Sydney Edwards" to project source files.
 * Run from repo root: node scripts/add-developer-credit.mjs
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");

const MARKER = "Developed by Sydney Edwards";
const LINE_TS = `// ${MARKER}\n`;
const LINE_CSS = `/* ${MARKER} */\n\n`;
const LINE_HTML = `<!-- ${MARKER} -->\n`;

const SKIP_DIRS = new Set(["node_modules", "dist", ".git"]);

function walk(dir, out = []) {
  if (!fs.existsSync(dir)) return out;
  for (const name of fs.readdirSync(dir)) {
    if (SKIP_DIRS.has(name)) continue;
    const p = path.join(dir, name);
    const st = fs.statSync(p);
    if (st.isDirectory()) walk(p, out);
    else out.push(p);
  }
  return out;
}

function shouldProcessFile(filePath) {
  const ext = path.extname(filePath);
  return [".ts", ".tsx", ".js", ".cjs", ".mjs", ".css"].includes(ext);
}

function prependIfNeeded(filePath, prefix) {
  const raw = fs.readFileSync(filePath, "utf8");
  if (raw.includes(MARKER)) return false;
  fs.writeFileSync(filePath, prefix + raw, "utf8");
  return true;
}

function processHtml(filePath) {
  const raw = fs.readFileSync(filePath, "utf8");
  if (raw.includes(MARKER)) return false;
  const next = raw.replace(/^(<!doctype html>\s*\n)/i, `$1${LINE_HTML}`);
  if (next === raw) {
    fs.writeFileSync(filePath, LINE_HTML + raw, "utf8");
  } else {
    fs.writeFileSync(filePath, next, "utf8");
  }
  return true;
}

let count = 0;

// Source trees
for (const rel of ["client/src", "server/src", "shared/src"]) {
  const dir = path.join(root, rel);
  for (const file of walk(dir)) {
    if (!shouldProcessFile(file)) continue;
    if (file.endsWith(".css")) {
      if (prependIfNeeded(file, LINE_CSS)) count++;
    } else {
      if (prependIfNeeded(file, LINE_TS)) count++;
    }
  }
}

// Shared root JS (retroTemplates, workingDays)
for (const name of ["retroTemplates.js", "workingDays.js"]) {
  const file = path.join(root, "shared", name);
  if (fs.existsSync(file) && prependIfNeeded(file, LINE_TS)) count++;
}

// Client config & assets
for (const rel of [
  "client/vite.config.ts",
  "client/tailwind.config.cjs",
  "client/postcss.config.cjs",
  "client/index.css"
]) {
  const file = path.join(root, rel);
  if (!fs.existsSync(file)) continue;
  if (rel.endsWith(".css")) {
    if (prependIfNeeded(file, LINE_CSS)) count++;
  } else {
    if (prependIfNeeded(file, LINE_TS)) count++;
  }
}

const indexHtml = path.join(root, "client/index.html");
if (fs.existsSync(indexHtml) && processHtml(indexHtml)) count++;

// Markdown: append footer
const mdFooter = `\n\n---\n\n*${MARKER}.*\n`;
for (const rel of ["README.md", "docs/TRAINING_AGILE_AT_SCALE.md", "server/API.md"]) {
  const file = path.join(root, rel);
  if (!fs.existsSync(file)) continue;
  const raw = fs.readFileSync(file, "utf8");
  if (raw.includes(MARKER)) continue;
  fs.writeFileSync(file, raw.trimEnd() + mdFooter, "utf8");
  count++;
}

// eslint-disable-next-line no-console
console.log(`Done. Updated or tagged ${count} file(s).`);
