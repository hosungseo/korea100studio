// ---------------------------------------------------------------------------
// SVG renderer: port of korea100's generate-process-article-image.mjs render
// functions (renderSvg, renderHeader, renderGrid, renderNode, renderEdges,
// renderFooter, and their text helpers). Geometry, card shapes, badge
// rendering, edge drawing, arrow markers, spacing, fonts, and z-order
// (edges before nodes) are preserved exactly. Korea-specific literals
// (STATUS keyed by node.status, ordinance detection, "대한민국 제도 100"
// branding, Korean legend copy) are replaced with profile/board-driven
// values — see the "generalization" comments below at each substitution.
// ---------------------------------------------------------------------------

import { buildLayout, edgeRoute, WIDTH, HEIGHT } from "./layout.mjs";
import { getProfile, EMPHASIS_KEYS } from "./profiles.mjs";

// Grid/label geometry constants. Not exported by layout.mjs (they are
// internal to its own buildLayout computation); duplicated here for
// rendering, matching the same pattern the korea100 source used (the
// renderer there also kept its own copies of these constants alongside the
// layout-slot module it imported from). Values must stay in sync with
// layout.mjs's private copies for the two modules to agree on geometry.
const GRID_LEFT = 38;
const GRID_RIGHT = 1762;
const GRID_TOP = 260;
const GROUP_HEADER_HEIGHT = 100;
const STAGE_LABEL_WIDTH = 190;
const GROUP_X = GRID_LEFT + STAGE_LABEL_WIDTH;
const GRID_BOTTOM = 2200;
const STAGE_BODY_TOP = GRID_TOP + GROUP_HEADER_HEIGHT;
const CARD_WIDTH = 270;
const CARD_TEXT_WIDTH = CARD_WIDTH - 30;
const CARD_TITLE_SIZE = 15.5;
const CARD_TITLE_LINE_HEIGHT = 18;
const CARD_TITLE_DOUBLE_Y = 47;
const CARD_TITLE_SINGLE_Y = 57;
const CARD_FOOTER_SIZE = 11;
const CARD_FOOTER_Y = 82;
const EDGE_LABEL_HEIGHT = 30;

// Generalization (1): the source keyed card style by node.status
// (done/current/waiting/risk/loop). Boards here carry node.emphasis
// (lead/key/normal/bottleneck/loop) instead; this defaults missing
// emphasis to "normal" the way the source defaulted missing status to
// "waiting".
const emphasisOf = (node) => node.emphasis ?? "normal";

/**
 * Public API: render a board document to a standalone SVG string.
 */
export function renderBoardSvg(board, { profile = "default" } = {}) {
  const p = getProfile(profile);
  const ctx = buildLayout(board, { titleOverrides: p.titleOverrides, groupMore: p.groupMore });
  return renderSvg(ctx, p);
}

function renderSvg(ctx, p) {
  const { process } = ctx;
  return [
    `<svg xmlns="http://www.w3.org/2000/svg" width="${WIDTH}" height="${HEIGHT}" viewBox="0 0 ${WIDTH} ${HEIGHT}">`,
    `<defs>
      <filter id="card-shadow" x="-20%" y="-25%" width="140%" height="160%">
        <feDropShadow dx="0" dy="3" stdDeviation="4" flood-color="#12271e" flood-opacity="0.10"/>
      </filter>
      ${arrowMarker("arrow-sequence", "#53675d")}
      ${arrowMarker("arrow-message", "#0f8a65")}
      ${arrowMarker("arrow-loop", "#3478db")}
      <style>
        text { font-family: -apple-system, "Segoe UI", "Helvetica Neue", Arial, "Apple SD Gothic Neo", "Noto Sans CJK KR", "Noto Sans KR", sans-serif; }
        .mono { font-family: "SFMono-Regular", "Menlo", monospace; }
      </style>
    </defs>`,
    `<rect width="${WIDTH}" height="${HEIGHT}" fill="#ffffff"/>`,
    `<rect x="0" y="0" width="${WIDTH}" height="240" fill="#07150f"/>`,
    `<rect x="0" y="0" width="${WIDTH}" height="9" fill="#18a87b"/>`,
    renderHeader(ctx, p),
    renderGrid(ctx, p),
    renderEdges(ctx, p),
    ...process.nodes.map((node) => renderNode(node, ctx, p)),
    renderFooter(ctx, p),
    `</svg>`,
  ].join("\n");
}

function arrowMarker(id, color) {
  return `<marker id="${id}" markerWidth="17" markerHeight="13" refX="15" refY="6.5" orient="auto" markerUnits="userSpaceOnUse">
    <path d="M1,1 L16,6.5 L1,12 Z" fill="${color}" stroke="#ffffff" stroke-width="1.3" stroke-linejoin="round"/>
  </marker>`;
}

// Generalization (2): the source rendered fixed Korean branding
// ("대한민국 제도 100" / "업무구조도 · 세로판") plus institution-only
// fields (priority/category/type/asOfDate/verification) that don't exist
// on a board document. Those are dropped; the big title is board.title,
// the subtitle line is board.subtitle (optional), and the stats line is
// built from p.labels.statsTemplate so gov can still read like korea100
// while default reads in English. No Korea/government branding is emitted
// for the default profile.
function renderHeader(ctx, p) {
  const { board, process } = ctx;
  const titleSize = fitFontSize(board.title, 48, 34, 1180);
  const subtitle = board.subtitle
    ? fitTextToWidth(board.subtitle, 1180, 19)
    : "";
  const stats = formatTemplate(p.labels.statsTemplate, {
    nodes: process.nodes.length,
    lanes: process.lanes.length,
    stages: process.stages.length,
  });
  return `
    <text x="1760" y="45" text-anchor="end" font-size="15" font-weight="700" fill="#8fa299">${escapeXml(stats)}</text>
    <text x="40" y="132" font-size="${titleSize}" font-weight="850" fill="#ffffff">${escapeXml(board.title)}</text>
    ${subtitle ? `<text x="40" y="174" font-size="19" font-weight="520" fill="#b7c7bf">${escapeXml(subtitle)}</text>` : ""}
    ${p.labels.creditLine ? `<text x="1760" y="214" text-anchor="end" font-size="14" font-weight="650" fill="#8fa299">${escapeXml(p.labels.creditLine)}</text>` : ""}
  `;
}

function renderGrid(ctx, p) {
  const { groups, process, groupWidth, stageHeights, stageTops } = ctx;
  const keyStatus = p.status.key;
  const result = [
    `<rect x="${GRID_LEFT}" y="${GRID_TOP}" width="${GRID_RIGHT - GRID_LEFT}" height="${GRID_BOTTOM - GRID_TOP}" rx="10" fill="#ffffff" stroke="#b8c7bf" stroke-width="2"/>`,
    `<rect x="${GRID_LEFT}" y="${GRID_TOP}" width="${STAGE_LABEL_WIDTH}" height="${GROUP_HEADER_HEIGHT}" rx="10" fill="#eaf2ee"/>`,
    `<text x="58" y="299" font-size="17" font-weight="800" fill="#17231d">${escapeXml(p.labels.stageAxis)}</text>`,
    `<text x="58" y="332" font-size="15" font-weight="650" fill="#68776f">${escapeXml(p.labels.actorAxis)}</text>`,
  ];

  process.stages.forEach((stage, rowIndex) => {
    const y = stageTops[rowIndex];
    const height = stageHeights[rowIndex];
    const stageNodes = process.nodes.filter((node) => node.stage === stage);
    // Generalization (1): "current" -> emphasis "key"; "done" -> emphasis "lead".
    const hasKey = stageNodes.some((node) => emphasisOf(node) === "key");
    const allLead = stageNodes.every((node) => emphasisOf(node) === "lead");
    const rowFill = hasKey
      ? tint(keyStatus.fill, 0.5)
      : rowIndex % 2 === 0
        ? "#fbfcfb"
        : "#f5f8f6";
    const labelFill = hasKey ? keyStatus.border : allLead ? "#e4f5ed" : "#eef3f0";
    const labelInk = hasKey ? keyStatus.ink : allLead ? keyStatus.border : "#53645b";
    // Stage names may carry a short code prefix (korea100 convention "G0 Label").
    // Only treat the first token as a code when it looks like one (short, has a
    // digit); otherwise render the whole name as the label so plain stage names
    // like "Intake" read correctly instead of landing in the mono code slot.
    const parts = stage.split(" ");
    const hasCode = parts.length > 1 && parts[0].length <= 4 && /\d/.test(parts[0]);
    const code = hasCode ? parts[0] : "";
    const labelParts = hasCode ? parts.slice(1) : [stage];
    result.push(
      `<rect x="${GRID_LEFT}" y="${round(y)}" width="${GRID_RIGHT - GRID_LEFT}" height="${round(height)}" fill="${rowFill}"/>`,
      `<rect x="${GRID_LEFT}" y="${round(y)}" width="${STAGE_LABEL_WIDTH}" height="${round(height)}" fill="${labelFill}"/>`,
      `<text x="58" y="${round(y + 32)}" class="mono" font-size="16" font-weight="800" fill="${labelInk}">${escapeXml(code)}</text>`,
      textLines(
        wrapTextToWidth(labelParts.join(" "), STAGE_LABEL_WIDTH - 40, 19, 2),
        58,
        y + 65,
        {
          size: 19,
          weight: 800,
          fill: labelInk,
          lineHeight: 22,
        }
      )
    );
  });

  groups.forEach((group, groupIndex) => {
    const x = GROUP_X + groupIndex * groupWidth;
    const title = fitTextToWidth(group.title, groupWidth - 40, 20);
    result.push(
      `<rect x="${round(x)}" y="${GRID_TOP}" width="${round(groupWidth)}" height="${GROUP_HEADER_HEIGHT}" fill="#f7faf8"/>`,
      `<rect x="${round(x)}" y="${GRID_TOP}" width="${round(groupWidth)}" height="7" fill="${group.accent}"/>`,
      `<text x="${round(x + 20)}" y="299" font-size="20" font-weight="800" fill="#17231d">${escapeXml(title)}</text>`,
      textLines(wrapTextToWidth(group.lanes.join(" · "), groupWidth - 40, 13.5, 2), x + 20, 329, {
        size: 13.5,
        weight: 600,
        fill: "#68776f",
        lineHeight: 19,
      })
    );
  });

  for (let index = 0; index <= groups.length; index += 1) {
    const x = GROUP_X + index * groupWidth;
    result.push(
      `<line x1="${round(x)}" y1="${GRID_TOP}" x2="${round(x)}" y2="${GRID_BOTTOM}" stroke="#d3dcd7" stroke-width="1.5"/>`
    );
  }
  result.push(
    `<line x1="${GRID_LEFT}" y1="${STAGE_BODY_TOP}" x2="${GRID_RIGHT}" y2="${STAGE_BODY_TOP}" stroke="#b8c7bf" stroke-width="2"/>`
  );
  stageTops.forEach((y) => {
    result.push(
      `<line x1="${GRID_LEFT}" y1="${round(y)}" x2="${GRID_RIGHT}" y2="${round(y)}" stroke="#c8d3cd" stroke-width="1.5"/>`
    );
  });
  result.push(
    `<line x1="${GRID_LEFT}" y1="${GRID_BOTTOM}" x2="${GRID_RIGHT}" y2="${GRID_BOTTOM}" stroke="#b8c7bf" stroke-width="2"/>`
  );
  return result.join("\n");
}

function renderEdges(ctx, p) {
  const paths = [];
  const labels = [];
  for (const edge of ctx.process.edges) {
    const source = ctx.nodeLayout.get(edge.source);
    const target = ctx.nodeLayout.get(edge.target);
    if (!source || !target) {
      throw new Error(`Edge endpoint missing from layout: ${edge.id}`);
    }
    const style =
      edge.type === "loop"
        ? { color: "#3478db", width: 4, dash: "10 8", marker: "arrow-loop" }
        : edge.type === "message"
          ? { color: "#0f8a65", width: 3.4, dash: "11 8", marker: "arrow-message" }
          : { color: "#53675d", width: 3.4, dash: "", marker: "arrow-sequence" };
    const route = edgeRoute(edge, source, target, ctx);
    const dash = style.dash ? `stroke-dasharray="${style.dash}"` : "";
    paths.push(
      `<path d="${route.path}" fill="none" stroke="#ffffff" stroke-width="${style.width + 4}" ${dash} stroke-linecap="round" stroke-linejoin="round" opacity="0.94"/>`,
      `<path d="${route.path}" fill="none" stroke="${style.color}" stroke-width="${style.width}" ${style.dash ? `stroke-dasharray="${style.dash}"` : ""} marker-end="url(#${style.marker})" stroke-linecap="round" stroke-linejoin="round" opacity="0.96"/>`
    );
    if (edge.label) {
      // buildLayout already computed edge label placement (buildEdgeLabelLayout
      // lives inside layout.mjs and populates ctx.edgeLabelLayout); reuse it
      // instead of recomputing here.
      const label = ctx.edgeLabelLayout.get(edge.id);
      if (!label) {
        throw new Error(`Edge label placement missing: ${edge.id}`);
      }
      labels.push(
        `<rect x="${round(label.x - label.width / 2)}" y="${round(label.y - EDGE_LABEL_HEIGHT / 2)}" width="${round(label.width)}" height="${EDGE_LABEL_HEIGHT}" rx="6" fill="#ffffff" stroke="${style.color}" stroke-width="1.4"/>`,
        `<text x="${round(label.x)}" y="${round(label.y + 5)}" text-anchor="middle" font-size="14" font-weight="750" fill="${style.color}">${escapeXml(edge.label)}</text>`
      );
    }
  }
  return [...paths, ...labels].join("\n");
}

// Generalization (3): the source detected ordinance-linked legal_basis
// entries via a Korea-specific regex (ORDINANCE_REFERENCE_PATTERN /
// ORDINANCE_DELEGATION_PATTERN) and drew a purple dashed ring + badge.
// Board nodes instead carry a plain node.refs = [{source, note}] array; if
// present, draw the same ring/badge shape using p.accent and p.refsLabel,
// showing the first ref's source compactly instead of reproducing the
// ordinance-detection regex.
function renderNode(node, ctx, p) {
  const position = ctx.nodeLayout.get(node.id);
  const status = p.status[emphasisOf(node)] ?? p.status.normal;
  const x = position.x;
  const y = position.y;
  const statusWidth = 50;
  const isKey = emphasisOf(node) === "key";
  const nameLines = wrapTextToWidth(node.label, CARD_TEXT_WIDTH, CARD_TITLE_SIZE, 2);
  const nameY = nameLines.length === 1 ? CARD_TITLE_SINGLE_Y : CARD_TITLE_DOUBLE_Y;
  const footerText = node.note && node.note.trim() ? node.note : node.lane;
  const fittedFooter = fitTextToWidth(footerText, CARD_TEXT_WIDTH, CARD_FOOTER_SIZE);
  const footerColor = status.sub;

  const refs = node.refs ?? [];
  const hasRefs = refs.length > 0;
  const refsRing = hasRefs
    ? `<rect x="${round(x - 4)}" y="${round(y - 4)}" width="${CARD_WIDTH + 8}" height="${position.height + 8}" rx="11" fill="none" stroke="${p.accent}" stroke-width="2.2" stroke-dasharray="7 5"/>`
    : "";
  const refsTag = hasRefs
    ? `<text x="${round(x + 15 + 52)}" y="${round(y + 20)}" font-size="11.5" font-weight="800" fill="${p.accent}">${escapeXml(`${p.refsLabel} · ${refs[0].source}`)}</text>`
    : "";

  return `
    <g filter="url(#card-shadow)">
      ${refsRing}
      <rect x="${round(x)}" y="${round(y)}" width="${CARD_WIDTH}" height="${position.height}" rx="8" fill="${status.fill}" stroke="${status.border}" stroke-width="2.3"/>
      <rect x="${round(x)}" y="${round(y)}" width="6" height="${position.height}" rx="3" fill="${status.border}"/>
      <text x="${round(x + 15)}" y="${round(y + 20)}" class="mono" font-size="12.5" font-weight="750" fill="${status.sub}">${escapeXml(node.id)}</text>
      ${refsTag}
      <rect x="${round(x + CARD_WIDTH - statusWidth - 10)}" y="${round(y + 7)}" width="${statusWidth}" height="24" rx="5" fill="${isKey ? "#ffffff" : status.border}" opacity="${isKey ? 0.18 : 0.14}"/>
      <text x="${round(x + CARD_WIDTH - statusWidth / 2 - 10)}" y="${round(y + 24)}" text-anchor="middle" font-size="12" font-weight="800" fill="${status.ink}">${escapeXml(status.label)}</text>
      ${textLines(nameLines, x + 15, y + nameY, {
        size: CARD_TITLE_SIZE,
        weight: 800,
        fill: status.ink,
        lineHeight: CARD_TITLE_LINE_HEIGHT,
      })}
      <text x="${round(x + 15)}" y="${round(y + CARD_FOOTER_Y)}" font-size="${CARD_FOOTER_SIZE}" font-weight="650" fill="${footerColor}">${escapeXml(fittedFooter)}</text>
    </g>
  `;
}

// Generalization (5): legend/readme labels ("읽는 법" / 선행·핵심·병목·회귀)
// now come from p.status[key].label and p.labels.* so default renders
// English copy and gov reproduces the original Korean copy.
function renderFooter(ctx, p) {
  const { process, groups } = ctx;
  const legendY = 2245;
  const legendKeys = EMPHASIS_KEYS.filter((key) => key !== "normal");
  const legendX = [118, 216, 314, 412];
  const legendSwatches = legendKeys
    .map((key, index) => legendStatus(legendX[index], legendY - 14, p.status[key].border, p.status[key].label))
    .join("\n");
  const stats = formatTemplate(p.labels.groupingNoteTemplate, {
    lanes: process.lanes.length,
    groups: groups.length,
    nodes: process.nodes.length,
    edges: process.edges.length,
  });
  const refsLegend = p.refsLabel
    ? `<rect x="500" y="${legendY - 26}" width="17" height="17" rx="4" fill="none" stroke="${p.accent}" stroke-width="2" stroke-dasharray="5 4"/>
    <text x="526" y="${legendY - 12}" font-size="14.5" fill="#526159">${escapeXml(p.refsLabel)}</text>`
    : "";
  return `
    <text x="38" y="${legendY}" font-size="16" font-weight="800" fill="#18251e">${escapeXml(p.labels.legendTitle)}</text>
    ${legendSwatches}
    ${refsLegend}
    <line x1="648" y1="${legendY - 8}" x2="700" y2="${legendY - 8}" stroke="#53675d" stroke-width="4" marker-end="url(#arrow-sequence)"/>
    <text x="720" y="${legendY - 2}" font-size="15" fill="#526159">${escapeXml(p.labels.sequenceLabel)}</text>
    <line x1="860" y1="${legendY - 8}" x2="912" y2="${legendY - 8}" stroke="#0f8a65" stroke-width="4" stroke-dasharray="10 8" marker-end="url(#arrow-message)"/>
    <text x="932" y="${legendY - 2}" font-size="15" fill="#526159">${escapeXml(p.labels.messageLabel)}</text>
    <line x1="1072" y1="${legendY - 8}" x2="1124" y2="${legendY - 8}" stroke="#3478db" stroke-width="4" stroke-dasharray="10 8" marker-end="url(#arrow-loop)"/>
    <text x="1144" y="${legendY - 2}" font-size="15" fill="#526159">${escapeXml(p.labels.loopLabel)}</text>
    <text x="38" y="2291" font-size="15.5" font-weight="650" fill="#56655d">${escapeXml(p.labels.readingNote)}</text>
    <text x="38" y="2321" font-size="14.5" fill="#68776f">${escapeXml(stats)}</text>
    <text x="38" y="2361" font-size="13.5" fill="#7b8881">${escapeXml(p.labels.sourceNote)}</text>
    ${p.labels.creditLine ? `<text x="1762" y="2361" text-anchor="end" font-size="17" font-weight="750" fill="${p.accent}">${escapeXml(p.labels.creditLine)}</text>` : ""}
  `;
}

function legendStatus(x, y, color, label) {
  return `<rect x="${x}" y="${y - 12}" width="17" height="17" rx="4" fill="${color}"/><text x="${x + 26}" y="${y + 2}" font-size="14.5" fill="#526159">${escapeXml(label)}</text>`;
}

function formatTemplate(template, vars) {
  return String(template).replace(/\{(\w+)\}/g, (match, key) =>
    key in vars ? String(vars[key]) : match
  );
}

// Simple fill tint used for the "has key node" row highlight — blends the
// profile's key status fill color toward white so it reads as a subtle
// row tint rather than a solid badge fill.
function tint(hexColor, amount) {
  const match = /^#([0-9a-fA-F]{6})$/.exec(hexColor);
  if (!match) return hexColor;
  const value = parseInt(match[1], 16);
  const r = (value >> 16) & 0xff;
  const g = (value >> 8) & 0xff;
  const b = value & 0xff;
  const mix = (channel) => Math.round(channel + (255 - channel) * amount);
  return `#${[mix(r), mix(g), mix(b)].map((n) => n.toString(16).padStart(2, "0")).join("")}`;
}

// ---------------------------------------------------------------------------
// Text helpers, ported verbatim from the source. estimatedTextWidth /
// textWidthUnits are the same generic character-width heuristic layout.mjs
// keeps a private copy of (for edge label box sizing); that copy isn't
// exported, so it's duplicated here for card/grid text wrapping — this is a
// renderer-only concern (font metrics), not board geometry.
// ---------------------------------------------------------------------------

function textLines(lines, x, y, options = {}) {
  const {
    size = 18,
    weight = 600,
    fill = "#17231d",
    lineHeight = size * 1.25,
  } = options;
  const tspans = lines
    .map(
      (line, index) =>
        `<tspan x="${round(x)}" dy="${index === 0 ? 0 : lineHeight}">${escapeXml(line)}</tspan>`
    )
    .join("");
  return `<text x="${round(x)}" y="${round(y)}" font-size="${size}" font-weight="${weight}" fill="${fill}">${tspans}</text>`;
}

function wrapTextToWidth(text, maxWidth, fontSize, maxLines) {
  const normalized = String(text).trim().replace(/\s+/gu, " ");
  if (!normalized) return [""];
  if (estimatedTextWidth(normalized, fontSize) <= maxWidth) return [normalized];

  const words = normalized.split(" ");
  const lines = [];
  let current = "";
  for (const word of words) {
    const candidate = current ? `${current} ${word}` : word;
    if (estimatedTextWidth(candidate, fontSize) <= maxWidth) {
      current = candidate;
      continue;
    }
    if (current) lines.push(current);
    if (estimatedTextWidth(word, fontSize) <= maxWidth) {
      current = word;
      continue;
    }

    current = "";
    for (const char of Array.from(word)) {
      const chunk = `${current}${char}`;
      if (current && estimatedTextWidth(chunk, fontSize) > maxWidth) {
        lines.push(current);
        current = char;
      } else {
        current = chunk;
      }
    }
  }
  if (current) lines.push(current);

  const limited = lines.slice(0, maxLines);
  if (lines.length > maxLines) {
    limited[maxLines - 1] = fitTextToWidth(`${limited[maxLines - 1]}…`, maxWidth, fontSize);
  }
  return limited;
}

function fitTextToWidth(text, maxWidth, fontSize) {
  const value = String(text);
  if (estimatedTextWidth(value, fontSize) <= maxWidth) return value;

  const ellipsis = "…";
  let fitted = "";
  for (const char of Array.from(value)) {
    if (estimatedTextWidth(`${fitted}${char}${ellipsis}`, fontSize) > maxWidth) {
      break;
    }
    fitted += char;
  }
  return `${fitted.trimEnd()}${ellipsis}`;
}

function fitFontSize(text, preferredSize, minimumSize, maxWidth) {
  const units = textWidthUnits(String(text));
  if (units === 0) return preferredSize;
  return round(Math.max(minimumSize, Math.min(preferredSize, maxWidth / units)));
}

function estimatedTextWidth(text, fontSize) {
  return textWidthUnits(String(text)) * fontSize;
}

function textWidthUnits(text) {
  return Array.from(text).reduce((sum, char) => {
    if (/\s/u.test(char)) return sum + 0.35;
    if (/[MW@%]/u.test(char)) return sum + 0.9;
    if (/[A-Z]/u.test(char)) return sum + 0.72;
    if (/[a-z0-9]/u.test(char)) return sum + 0.58;
    if (".,:;·/()[]{}+-_!?".includes(char)) return sum + 0.5;
    return sum + 1;
  }, 0);
}

function escapeXml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");
}

function round(value) {
  return Math.round(value * 10) / 10;
}
