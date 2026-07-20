// Locks the recorded composition-quality baseline (fixtures/quality-baseline.json)
// against the live computeComposition() output, so a geometry/scoring refactor
// that silently drifts the numbers (e.g. Fix 3's profile-aware group titles or
// Fix 5's piercing/edge pairing) fails loudly here instead of only showing up
// as an unnoticed score change.
import assert from "node:assert/strict";
import test from "node:test";
import fs from "node:fs";
import { computeComposition } from "../scripts/lib/composition.mjs";

const baseline = JSON.parse(fs.readFileSync("fixtures/quality-baseline.json", "utf8"));

for (const [name, expected] of Object.entries(baseline.boards)) {
  test(`${name}: composition matches recorded baseline`, () => {
    const board = JSON.parse(fs.readFileSync(`fixtures/${name}.json`, "utf8"));
    const profile = board.profile || "default";
    const result = computeComposition(board, profile);
    assert.equal(result.score, expected.score);
    assert.equal(result.metrics.nodePiercings, expected.nodePiercings);
  });
}
