import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import Ajv2020 from "ajv/dist/2020.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const schema = JSON.parse(
  fs.readFileSync(path.join(__dirname, "../../schemas/board-v1.schema.json"), "utf8")
);
// Schema declares $schema: draft/2020-12, so the Ajv2020 build is required
// (the default "ajv" export only understands draft-07 meta-schemas).
const ajv = new Ajv2020({ allErrors: true, strict: false });
const validate = ajv.compile(schema);

export function validateBoard(board) {
  const valid = validate(board);
  return { valid, errors: valid ? [] : validate.errors };
}

// Checks the schema can't express: references between lanes/stages/nodes/edges.
// Returns an array of human-readable problems (empty = clean). Assumes the board
// already passed schema validation (arrays/fields present).
export function checkReferentialIntegrity(board) {
  const problems = [];
  const lanes = new Set(board.lanes);
  const stages = new Set(board.stages);

  const nodeIds = new Set();
  for (const node of board.nodes) {
    if (nodeIds.has(node.id)) problems.push(`duplicate node id "${node.id}"`);
    nodeIds.add(node.id);
    if (!lanes.has(node.lane)) {
      problems.push(`node "${node.id}" references lane "${node.lane}" which is not in lanes [${board.lanes.join(", ")}]`);
    }
    if (!stages.has(node.stage)) {
      problems.push(`node "${node.id}" references stage "${node.stage}" which is not in stages [${board.stages.join(", ")}]`);
    }
  }

  const edgeIds = new Set();
  for (const edge of board.edges) {
    if (edgeIds.has(edge.id)) problems.push(`duplicate edge id "${edge.id}"`);
    edgeIds.add(edge.id);
    if (!nodeIds.has(edge.source)) {
      problems.push(`edge "${edge.id}" source "${edge.source}" is not a node id`);
    }
    if (!nodeIds.has(edge.target)) {
      problems.push(`edge "${edge.id}" target "${edge.target}" is not a node id`);
    }
  }

  return problems;
}
