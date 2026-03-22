# Screenshots

The images referenced from the root **`README.md`** live in this folder.

- **`*.svg`** — source **vector** mockups (edit these when refreshing art direction).
- **`*.png`** — **raster** copies committed for **GitHub** (README embeds PNG; SVG embeds often show “Invalid image source”). After changing an SVG, run from repo root:  
  `npm run screenshots:rasterize`
- To use **real app captures**: run `npm run dev` + `npm run seed`, take PNG/WebP screenshots, replace the matching **`*.png`** here (keep filenames aligned with **`README.md`**).

Suggested capture sizes: **1200–1600px** wide for clarity; compress PNGs or use WebP for smaller clones.
