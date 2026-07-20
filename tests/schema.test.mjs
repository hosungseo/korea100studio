import assert from "node:assert/strict";
import test from "node:test";
import { validateBoard } from "../scripts/lib/validate.mjs";

const minimal = {
  schema_version: 1,
  title: "T",
  lanes: ["A", "B"],
  stages: ["S0", "S1"],
  nodes: [
    { id: "N1", lane: "A", stage: "S0", label: "start" },
    { id: "N2", lane: "B", stage: "S1", label: "end" },
  ],
  edges: [{ id: "E1", source: "N1", target: "N2", type: "sequence" }],
};

test("accepts a minimal valid board", () => {
  const { valid, errors } = validateBoard(minimal);
  assert.equal(valid, true, JSON.stringify(errors));
});

test("rejects a board missing required fields", () => {
  const { valid } = validateBoard({ schema_version: 1, lanes: [], stages: [] });
  assert.equal(valid, false);
});

test("rejects an unknown emphasis value", () => {
  const bad = structuredClone(minimal);
  bad.nodes[0].emphasis = "explode";
  const { valid } = validateBoard(bad);
  assert.equal(valid, false);
});

import { checkReferentialIntegrity } from "../scripts/lib/validate.mjs";

test("referential integrity: clean board has no problems", () => {
  assert.deepEqual(checkReferentialIntegrity(minimal), []);
});

test("referential integrity: flags unknown lane and dangling edge", () => {
  const bad = structuredClone(minimal);
  bad.nodes[0].lane = "Ghost";
  bad.edges.push({ id: "E9", source: "N1", target: "N404", type: "sequence" });
  const problems = checkReferentialIntegrity(bad);
  assert.ok(problems.some((p) => p.includes("Ghost")));
  assert.ok(problems.some((p) => p.includes("N404")));
});

test("referential integrity: flags duplicate node id", () => {
  const bad = structuredClone(minimal);
  bad.nodes.push({ id: "N1", lane: "A", stage: "S1", label: "dup" });
  assert.ok(checkReferentialIntegrity(bad).some((p) => p.includes("duplicate node id")));
});
