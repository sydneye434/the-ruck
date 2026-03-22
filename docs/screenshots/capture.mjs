#!/usr/bin/env node
/**
 * Capture README screenshots from a running dev stack (Vite + API).
 *
 * Prerequisites:
 *   npm run dev   (client + server), and optionally npm run seed
 *
 * Usage (from repo root):
 *   npm run screenshots:capture
 *
 * Env:
 *   SCREENSHOT_BASE=http://localhost:5173
 *   SCREENSHOT_API=http://localhost:3001/api
 */
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";

const delay = (ms) => new Promise((r) => setTimeout(r, ms));

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT_DIR = __dirname;

const BASE = process.env.SCREENSHOT_BASE ?? "http://localhost:5173";
const API = process.env.SCREENSHOT_API ?? "http://localhost:3001/api";

async function apiGet(path) {
  const res = await fetch(`${API}${path}`);
  const json = await res.json();
  if (!res.ok || json.error) {
    throw new Error(json.error?.message ?? `${path} ${res.status}`);
  }
  return json.data;
}

async function apiPost(path, body) {
  const res = await fetch(`${API}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body)
  });
  const json = await res.json();
  if (!res.ok || json.error) {
    throw new Error(json.error?.message ?? `${path} ${res.status}`);
  }
  return json.data;
}

async function main() {
  let browser;
  try {
    browser = await chromium.launch({ channel: "chrome", headless: true });
  } catch {
    browser = await chromium.launch({ headless: true });
  }

  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    deviceScaleFactor: 1
  });
  const page = await context.newPage();

  async function shot(name, url, opts = {}) {
    const { waitMs = 1200, fullPage = true } = opts;
    await page.goto(url, { waitUntil: "domcontentloaded", timeout: 60_000 });
    await delay(waitMs);
    const path = join(OUT_DIR, name);
    await page.screenshot({ path, fullPage });
    console.log("Wrote", name);
  }

  try {
    await shot("dashboard.png", `${BASE}/dashboard`, { waitMs: 2000 });
    await shot("backlog.png", `${BASE}/backlog`, { waitMs: 1500 });
    await shot("sprint-board.png", `${BASE}/sprint/active`, { waitMs: 2000 });
    await shot("settings.png", `${BASE}/settings`, { waitMs: 800 });
    await shot("team.png", `${BASE}/team`, { waitMs: 1200 });
    await shot("org-chart.png", `${BASE}/team/org-chart`, { waitMs: 1500 });

    // Sprints list, then open capacity planning for first planning sprint
    await page.goto(`${BASE}/sprints`, { waitUntil: "domcontentloaded", timeout: 60_000 });
    await delay(1500);
    const planBtn = page.getByRole("button", { name: "Plan Sprint" }).first();
    if (await planBtn.isVisible().catch(() => false)) {
      await planBtn.click();
      await delay(2500);
      await page.screenshot({ path: join(OUT_DIR, "capacity-planning.png"), fullPage: true });
      console.log("Wrote capacity-planning.png");
      await page.keyboard.press("Escape");
      await delay(300);
    } else {
      await page.screenshot({ path: join(OUT_DIR, "capacity-planning.png"), fullPage: true });
      console.log("Wrote capacity-planning.png (sprints page — no Plan Sprint button)");
    }

    // Retro board: prefer first retro detail, else list
    let retroId = null;
    try {
      const retros = await apiGet("/retros");
      retroId = Array.isArray(retros) && retros[0]?.id ? retros[0].id : null;
    } catch {
      /* ignore */
    }
    if (retroId) {
      await shot("retro-board.png", `${BASE}/retro/${retroId}`, { waitMs: 2000 });
    } else {
      await shot("retro-board.png", `${BASE}/retros`, { waitMs: 1200 });
    }

    // Planning poker: create session via API, then open room
    try {
      const sprints = await apiGet("/sprints");
      const active = sprints.find((s) => s.status === "active");
      const members = await apiGet("/team-members");
      const member = members.find((m) => m.isActive) ?? members[0];
      if (active && member) {
        const stories = await apiGet(`/stories?sprintId=${encodeURIComponent(active.id)}`);
        const queue = (Array.isArray(stories) ? stories : [])
          .filter((s) => s.sprintId === active.id)
          .slice(0, 5)
          .map((s) => s.id);
        if (queue.length > 0) {
          const created = await apiPost("/poker/sessions", {
            sprintId: active.id,
            storyQueue: queue,
            memberId: member.id,
            memberName: member.name,
            avatarColor: "var(--color-avatar-1)"
          });
          const sid = created.sessionId;
          if (sid) {
            await page.evaluate(
              ({ id, name }) => {
                localStorage.setItem("theRuck.poker.memberId", id);
                localStorage.setItem("theRuck.poker.memberName", name);
              },
              { id: member.id, name: member.name }
            );
            await shot("planning-poker.png", `${BASE}/poker/${sid}`, { waitMs: 2500 });
          }
        }
      }
    } catch (e) {
      console.warn("Planning poker capture skipped:", e instanceof Error ? e.message : e);
    }
  } finally {
    await browser.close();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
