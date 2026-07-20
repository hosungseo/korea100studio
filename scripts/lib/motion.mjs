// ---------------------------------------------------------------------------
// Motion: port of korea100's lib/process-motion.mjs (buildMotionSchedule) and
// generate-process-motion.mjs (buildMotionSvg — the SMIL curtain animation).
//
// buildMotionSchedule turns a board's stage order (G0->Gn) plus edge topology
// into a deterministic play schedule: at step k, these nodes and edges become
// visible. buildMotionSvg renders that schedule as a self-contained animated
// SVG that reveals the board one stage band at a time (white curtains fading
// out on schedule), then loops. No JS, no external deps.
// ---------------------------------------------------------------------------

import { buildLayout, WIDTH, HEIGHT } from "./layout.mjs";
import { getProfile } from "./profiles.mjs";
import { renderBoardSvg } from "./render-svg.mjs";

const STEP_DUR = 0.85; // seconds each stage band takes to reveal
const REVEAL_DUR = 0.6; // fade duration within a step
const HOLD = 2.0; // seconds fully revealed before looping

/**
 * Build a design-agnostic play schedule for a board: at step k, these nodes
 * and edges become visible. Signature adapted from the korea100 source
 * (which took `institution`, reading process.stages/nodes/edges from
 * institution.process) — board-v1 documents carry stages/nodes/edges at the
 * top level, so this reads board.stages/board.nodes/board.edges directly.
 */
export function buildMotionSchedule(board, profile = "default") {
  const context = buildLayout(board, { titleOverrides: getProfile(profile).titleOverrides });

  const stageIndex = new Map(board.stages.map((stage, index) => [stage, index]));
  const nodeStage = new Map(
    board.nodes.map((node) => [node.id, stageIndex.get(node.stage) ?? 0])
  );

  // Nodes light up when their stage arrives.
  const nodeStep = new Map(nodeStage);
  // An edge appears once both endpoints exist — the later of the two stages.
  // Forward edges reveal with their target; loop/return edges reveal with the
  // higher stage so they never dangle.
  const edgeStep = new Map(
    board.edges.map((edge) => [
      edge.id,
      Math.max(nodeStage.get(edge.source) ?? 0, nodeStage.get(edge.target) ?? 0),
    ])
  );

  const steps = board.stages.map((stage, index) => ({
    stageIndex: index,
    stage,
    top: context.stageTops[index],
    height: context.stageHeights[index],
    nodeIds: board.nodes.filter((n) => nodeStage.get(n.id) === index).map((n) => n.id),
    edgeIds: board.edges
      .filter((e) => edgeStep.get(e.id) === index)
      .map((e) => e.id),
  }));

  return {
    title: board.title,
    stepCount: steps.length,
    steps,
    nodeStep,
    edgeStep,
    stageBodyTop: context.stageTops[0],
    stageBodyBottom: context.stageTops.at(-1) + context.stageHeights.at(-1),
  };
}

/**
 * Public API: render a board's motion schedule as a self-contained animated
 * SVG. If `imageHref` is given, the background is an `<image>` pointing at
 * it (matching the korea100 source, which layered the animation over an
 * exported PNG). Otherwise the fully-rendered board SVG is inlined as a `<g>`
 * so the animation sits directly on top of the actual board — no external
 * asset required.
 */
export function buildMotionSvg(board, { profile = "default", imageHref } = {}) {
  const schedule = buildMotionSchedule(board, profile);
  const background = imageHref
    ? `<image x="0" y="0" width="${WIDTH}" height="${HEIGHT}" xlink:href="${imageHref}"/>`
    : inlineBoardGroup(board, profile);

  const steps = schedule.steps;
  const cycle = steps.length * STEP_DUR + HOLD;
  const curtains = steps
    .map((step) => {
      const start = step.stageIndex * STEP_DUR;
      const end = start + REVEAL_DUR;
      const tStart = (start / cycle).toFixed(4);
      const tEnd = (end / cycle).toFixed(4);
      return (
        `<rect x="0" y="${round(step.top)}" width="${WIDTH}" height="${round(step.height)}" fill="#ffffff">` +
        `<animate attributeName="opacity" dur="${cycle.toFixed(2)}s" repeatCount="indefinite" ` +
        `values="1;1;0;0" keyTimes="0;${tStart};${tEnd};1" calcMode="linear"/>` +
        `</rect>`
      );
    })
    .join("\n    ");

  return (
    `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" ` +
    `width="${WIDTH}" height="${HEIGHT}" viewBox="0 0 ${WIDTH} ${HEIGHT}">\n` +
    `  ${background}\n` +
    `  <g>\n    ${curtains}\n  </g>\n` +
    `</svg>\n`
  );
}

// Render the board to SVG and strip the outer <svg ...>...</svg> wrapper so
// its inner content can be inlined as a <g> group under the motion SVG's own
// root element.
function inlineBoardGroup(board, profile) {
  const boardSvg = renderBoardSvg(board, { profile });
  const match = /<svg[^>]*>([\s\S]*)<\/svg>\s*$/.exec(boardSvg);
  const inner = match ? match[1] : boardSvg;
  return `<g>${inner}</g>`;
}

function round(value) {
  return Math.round(value * 10) / 10;
}
