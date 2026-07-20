import assert from "node:assert/strict";
import test from "node:test";
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

const CLI = "scripts/board.mjs";
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "k100s-"));

test("render writes a valid SVG", () => {
  const out = path.join(tmp, "g.svg");
  execFileSync("node", [CLI, "render", "fixtures/generic-sample.json", "--out", out]);
  assert.match(fs.readFileSync(out, "utf8"), /^<svg/);
});

test("validate exits 0 on a clean board", () => {
  execFileSync("node", [CLI, "validate", "fixtures/generic-sample.json"]);
});

test("validate exits non-zero on a schema-invalid board", () => {
  const bad = path.join(tmp, "bad.json");
  fs.writeFileSync(bad, JSON.stringify({ schema_version: 1 }));
  assert.throws(() => execFileSync("node", [CLI, "validate", bad], { stdio: "ignore" }));
});

test("audit prints a score", () => {
  const out = execFileSync("node", [CLI, "audit", "fixtures/generic-sample.json"], { encoding: "utf8" });
  assert.match(out, /score/i);
});

test("render on a missing file exits non-zero", () => {
  assert.throws(() =>
    execFileSync("node", [CLI, "render", path.join(tmp, "does-not-exist.json")], { stdio: "ignore" })
  );
});

test("audit on a board with a dangling edge endpoint exits non-zero", () => {
  const board = JSON.parse(fs.readFileSync("fixtures/generic-sample.json", "utf8"));
  board.edges.push({ id: "ebad", source: "n1", target: "no-such-node", type: "sequence" });
  const bad = path.join(tmp, "bad-edge.json");
  fs.writeFileSync(bad, JSON.stringify(board));
  assert.throws(() => execFileSync("node", [CLI, "audit", bad], { stdio: "ignore" }));
});

test("--help exits 0 and prints usage to stdout", () => {
  const out = execFileSync("node", [CLI, "--help"], { encoding: "utf8" });
  assert.match(out, /Usage: korea100studio/);
});

test("no command exits 0 with help", () => {
  const out = execFileSync("node", [CLI], { encoding: "utf8" });
  assert.match(out, /Usage: korea100studio/);
});

test("unknown command exits non-zero", () => {
  assert.throws(() => execFileSync("node", [CLI, "frobnicate"], { stdio: "ignore" }));
});
