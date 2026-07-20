import assert from "node:assert/strict";
import test from "node:test";
import { buildMotionSchedule } from "../scripts/lib/motion.mjs";

const board = {
  schema_version: 1, title: "t",
  lanes: ["A"], stages: ["S0", "S1", "S2"],
  nodes: [
    { id: "N1", lane: "A", stage: "S0", label: "a" },
    { id: "N2", lane: "A", stage: "S1", label: "b" },
    { id: "N3", lane: "A", stage: "S2", label: "c" },
  ],
  edges: [
    { id: "E1", source: "N1", target: "N2", type: "sequence" },
    { id: "E2", source: "N2", target: "N3", type: "sequence" },
  ],
};

test("schedule has one step per stage in order", () => {
  const s = buildMotionSchedule(board, "default");
  assert.equal(s.stepCount, 3);
  assert.deepEqual(s.steps.map((x) => x.stageIndex), [0, 1, 2]);
});

test("each node lights up at its stage", () => {
  const s = buildMotionSchedule(board, "default");
  assert.equal(s.nodeStep.get("N3"), 2);
});
