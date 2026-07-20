#!/usr/bin/env node
// Unified CLI for korea100studio boards: render / audit / validate / motion / check.

import fs from "node:fs";
import path from "node:path";

import { validateBoard } from "./lib/validate.mjs";
import { renderBoardSvg } from "./lib/render-svg.mjs";
import { computeComposition, budgetViolations } from "./lib/composition.mjs";
import { buildMotionSvg } from "./lib/motion.mjs";
import { rasterize, rasterizerAvailable } from "./lib/rasterize.mjs";

const USAGE = `Usage: board <command> <board.json> [options]

Commands:
  render <board.json> [--out f.svg] [--png] [--profile p]   Render a board to SVG (and optionally PNG)
  audit <board.json> [--profile p]                          Print composition score and key metrics
  validate <board.json> [--strict] [--profile p]             Validate schema and composition budgets
  motion <board.json> [--out f.svg] [--embed] [--profile p]  Render an animated (motion) SVG
  check <file.svg>                                           Sanity-check that a file is a well-formed SVG
`;

// --- tiny arg parser -------------------------------------------------------
// argv (after the subcommand) is: <boardPath> [--flag value|--boolFlag]...
function parseArgs(argv) {
  const positional = [];
  const flags = {};
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg.startsWith("--")) {
      const key = arg.slice(2);
      const next = argv[i + 1];
      if (next !== undefined && !next.startsWith("--")) {
        flags[key] = next;
        i++;
      } else {
        flags[key] = true;
      }
    } else {
      positional.push(arg);
    }
  }
  return { positional, flags };
}

function readBoard(boardPath) {
  const raw = fs.readFileSync(boardPath, "utf8");
  return JSON.parse(raw);
}

function resolveProfile(flags, board) {
  return flags.profile || board.profile || "default";
}

// --- subcommands -------------------------------------------------------

function cmdRender(argv) {
  const { positional, flags } = parseArgs(argv);
  const boardPath = positional[0];
  const board = readBoard(boardPath);

  const { valid, errors } = validateBoard(board);
  if (!valid) {
    console.error(`Invalid board: ${boardPath}`);
    for (const err of errors) console.error(`  ${err.instancePath || "/"} ${err.message}`);
    process.exit(2);
  }

  const profile = resolveProfile(flags, board);
  const svg = renderBoardSvg(board, { profile });

  const outSvg = flags.out || `${path.basename(boardPath, path.extname(boardPath))}.svg`;
  fs.writeFileSync(outSvg, svg);
  console.log(outSvg);

  if (flags.png) {
    const outPng = outSvg.replace(/\.svg$/, ".png");
    if (!rasterizerAvailable()) {
      console.error("Warning: no PNG rasterizer available (install librsvg or cairosvg); skipping PNG.");
    } else {
      const result = rasterize(outSvg, outPng);
      if (result.ok === false) {
        console.error(`Warning: PNG rasterization failed: ${result.reason}`);
      } else {
        console.log(outPng);
      }
    }
  }
}

function cmdAudit(argv) {
  const { positional, flags } = parseArgs(argv);
  const boardPath = positional[0];
  const board = readBoard(boardPath);
  const profile = resolveProfile(flags, board);

  const result = computeComposition(board, profile);
  const m = result.metrics;
  console.log(`Board: ${result.name}`);
  console.log(`score: ${result.score}`);
  console.log(`  nodePiercings: ${m.nodePiercings}`);
  console.log(`  crossings: ${m.crossings}`);
  console.log(`  bendsPerEdgeMax: ${m.bendsPerEdgeMax}`);
  console.log(`  routeStretchMax: ${m.routeStretchMax}`);
  if (result.violations.length) {
    console.log(`violations: ${result.violations.join(", ")}`);
  }
}

function cmdValidate(argv) {
  const { positional, flags } = parseArgs(argv);
  const boardPath = positional[0];
  const board = readBoard(boardPath);

  const { valid, errors } = validateBoard(board);
  if (!valid) {
    console.error(`Invalid board: ${boardPath}`);
    for (const err of errors) console.error(`  ${err.instancePath || "/"} ${err.message}`);
    process.exit(2);
  }

  const profile = resolveProfile(flags, board);

  try {
    const result = computeComposition(board, profile);
    const violations = budgetViolations(result.metrics);

    if (flags.strict && violations.length) {
      console.error(`Budget violations for ${boardPath}:`);
      for (const v of violations) console.error(`  ${v}`);
      process.exit(1);
    }

    console.log(`OK: ${boardPath} is schema-valid (score ${result.score})`);
    if (violations.length) {
      console.log(`  note: ${violations.length} budget violation(s) (use --strict to fail on these)`);
    }
    process.exit(0);
  } catch (err) {
    console.error(`Error during layout/render: ${err.message}`);
    process.exit(1);
  }
}

function cmdMotion(argv) {
  const { positional, flags } = parseArgs(argv);
  const boardPath = positional[0];
  const board = readBoard(boardPath);

  const { valid, errors } = validateBoard(board);
  if (!valid) {
    console.error(`Invalid board: ${boardPath}`);
    for (const err of errors) console.error(`  ${err.instancePath || "/"} ${err.message}`);
    process.exit(2);
  }

  const profile = resolveProfile(flags, board);
  // --embed is a no-op alias: the motion SVG is always self-contained
  // (no imageHref) since inline board rendering is already fully embedded.
  const svg = buildMotionSvg(board, { profile });

  const outSvg = flags.out || `${path.basename(boardPath, path.extname(boardPath))}.motion.svg`;
  fs.writeFileSync(outSvg, svg);
  console.log(outSvg);
}

function cmdCheck(argv) {
  const { positional } = parseArgs(argv);
  const filePath = positional[0];
  const content = fs.readFileSync(filePath, "utf8").trim();
  if (content.startsWith("<svg") && content.endsWith("</svg>")) {
    console.log("OK");
  } else {
    console.error(`Not a well-formed SVG: ${filePath}`);
    process.exit(1);
  }
}

// --- main -------------------------------------------------------

function main() {
  const [command, ...rest] = process.argv.slice(2);

  switch (command) {
    case "render":
      return cmdRender(rest);
    case "audit":
      return cmdAudit(rest);
    case "validate":
      return cmdValidate(rest);
    case "motion":
      return cmdMotion(rest);
    case "check":
      return cmdCheck(rest);
    default:
      console.error(USAGE);
      process.exit(2);
  }
}

main();
