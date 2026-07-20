import { execFileSync, spawnSync } from "node:child_process";

function has(bin) {
  return spawnSync("which", [bin]).status === 0;
}

// Rasterize an SVG file to PNG using a detected system rasterizer.
// Returns { ok, tool } on success or { ok:false, reason } if none is available.
// No native npm dependency — PNG is a best-effort extra on top of SVG.
export function rasterize(svgPath, pngPath, width = 1800) {
  if (has("rsvg-convert")) {
    execFileSync("rsvg-convert", ["-w", String(width), svgPath, "-o", pngPath]);
    return { ok: true, tool: "rsvg-convert" };
  }
  if (has("cairosvg")) {
    execFileSync("cairosvg", [svgPath, "-o", pngPath, "--output-width", String(width)]);
    return { ok: true, tool: "cairosvg" };
  }
  return { ok: false, reason: "no rasterizer (install librsvg or cairosvg for PNG)" };
}

export function rasterizerAvailable() {
  return has("rsvg-convert") || has("cairosvg");
}
