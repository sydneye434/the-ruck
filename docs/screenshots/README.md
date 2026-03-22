# Screenshots

Images referenced from the root **`README.md`** live in this folder as **`.png`** files (GitHub renders PNG reliably; SVG embeds often error).

## Capture from the running app (recommended)

1. Start the stack: `npm run dev` (client **http://localhost:5173**, API **http://localhost:3001**). Optional: `npm run seed` for richer demo data.
2. From the **repo root**:  
   `npm run screenshots:capture`

This runs **`capture.mjs`** (Playwright). It:

- Grabs **Dashboard**, **Backlog**, **Active sprint**, **Settings**, **Team**, **Org chart**.
- Opens **Sprint history** and, if a **Plan Sprint** button exists (a sprint in **planning** status), opens **capacity planning**; otherwise it saves the sprint list as **`capacity-planning.png`**.
- Uses the first **retro** from the API for **`retro-board.png`** when possible.
- Creates a **Planning Poker** session via **`POST /api/poker/sessions`** and captures the room (needs an **active** sprint with stories).

Override URLs if needed:

```bash
SCREENSHOT_BASE=http://localhost:5174 SCREENSHOT_API=http://localhost:3001/api npm run screenshots:capture
```

First-time setup may download Chromium: `npx playwright install chromium` (or rely on system **Chrome** via `channel: 'chrome'`).

## SVG + rasterize (optional)

Illustrative **`*.svg`** files can be edited by hand, then:

```bash
npm run screenshots:rasterize
```

…to produce PNGs via **sharp** (useful if you don’t run the app).

## Replace with manual captures

You can overwrite any **`*.png`** with your own exports (e.g. 1200–1600px wide) and keep the same filenames as in **`README.md`**.
