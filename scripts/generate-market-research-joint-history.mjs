import { createHash } from "node:crypto";
import { mkdir, readFile, rename, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";

export const REQUIRED_INDICATORS = ["B1", "B2", "B3", "B4", "B5", "F1", "F2", "F3", "F4", "L1", "L2", "L3", "L4", "L5"];
export const INCLUDED_INDICATORS = ["B1", "B2", "B3", "B4", "B5", "F1", "F2", "F3", "F4", "L1", "L5"];
export const INTENTIONALLY_MISSING = ["L2", "L3", "L4"];
const OUTPUT = "public/data/market-research/history/joint.json";
const SOURCE_PATHS = Object.fromEntries(INCLUDED_INDICATORS.map(id => [id, `public/data/market-research/history/${id.toLowerCase()}.json`]));

const validDate = value => {
  const text = String(value ?? "");
  const parsed = /^\d{4}-\d{2}-\d{2}$/.test(text) ? new Date(`${text}T00:00:00Z`) : new Date(Number.NaN);
  return !Number.isNaN(parsed.valueOf()) && parsed.toISOString().slice(0, 10) === text;
};

export function canonicalize(value) {
  if (Array.isArray(value)) return value.map(canonicalize);
  if (value && typeof value === "object") return Object.fromEntries(Object.keys(value).sort().map(key => [key, canonicalize(value[key])]));
  return value;
}

export function sha256(value) {
  return createHash("sha256").update(value).digest("hex");
}

export function validateHistoryArtifact(id, artifact, masterAsOf, cutoff) {
  if (!INCLUDED_INDICATORS.includes(id) || artifact?.schemaVersion !== 1 || artifact?.indicator?.id !== id || !Array.isArray(artifact.points)) throw new Error(`Invalid ${id} history identity`);
  if (artifact.points.length !== 139) throw new Error(`${id} history must contain exactly 139 points`);
  let previous = ""; const seen = new Set();
  const timeline = artifact.points.map((point, index) => {
    const asOf = point?.asOf;
    if (!validDate(asOf) || asOf > cutoff || seen.has(asOf) || asOf <= previous) throw new Error(`${id} history contains invalid, duplicate or unordered asOf at ${index}`);
    if (!point || typeof point !== "object" || Array.isArray(point)) throw new Error(`${id} history contains a missing observation at ${index}`);
    seen.add(asOf); previous = asOf; return asOf;
  });
  if (masterAsOf && timeline.some((asOf, index) => asOf !== masterAsOf[index])) throw new Error(`${id} history does not match the B3 timeline`);
  return timeline;
}

export function buildJointHistory(inputs, sourceFiles, cutoff = "2026-08-17") {
  if (!validDate(cutoff)) throw new Error(`Invalid as-of cutoff ${cutoff}`);
  for (const id of INCLUDED_INDICATORS) if (!inputs?.[id]) throw new Error(`Missing included history ${id}`);
  const masterAsOf = validateHistoryArtifact("B3", inputs.B3, null, cutoff);
  for (const id of INCLUDED_INDICATORS) if (id !== "B3") validateHistoryArtifact(id, inputs[id], masterAsOf, cutoff);
  for (const id of INCLUDED_INDICATORS) {
    const source = sourceFiles?.[id];
    if (source?.path !== SOURCE_PATHS[id] || !/^[a-f0-9]{64}$/.test(source?.sha256 ?? "")) throw new Error(`Invalid source provenance for ${id}`);
  }
  const snapshots = masterAsOf.map((asOf, index) => {
    const indicators = Object.fromEntries(INCLUDED_INDICATORS.map(id => [id, canonicalize(inputs[id].points[index])]));
    return {
      asOf,
      indicators,
      coverage: {
        overall: { present: 11, required: 14, status: "incomplete" },
        B: { present: 5, required: 5, status: "complete", missing: [] },
        F: { present: 4, required: 4, status: "complete", missing: [] },
        L: { present: 2, required: 5, status: "incomplete", missing: [...INTENTIONALLY_MISSING] },
      },
      scoreStatus: "not_computed_incomplete_inputs",
      aggregateScore: null,
      jointState: null,
    };
  });
  return canonicalize({ schemaVersion: 1, asOfCutoff: cutoff, masterTimeline: "B3", requiredIndicators: REQUIRED_INDICATORS, includedIndicators: INCLUDED_INDICATORS, intentionallyMissing: INTENTIONALLY_MISSING, scorePolicy: "require_14_of_14", sourceFiles, snapshots });
}

function parseAsOf(argv) {
  const index = argv.indexOf("--as-of");
  const value = index >= 0 ? argv[index + 1] : "";
  if (!validDate(value) || value !== "2026-08-17") throw new Error("requestedAsOf must be 2026-08-17");
  return value;
}

async function writeAtomically(target, value) {
  await mkdir(path.dirname(target), { recursive: true });
  const temporary = `${target}.tmp-${process.pid}-${Date.now()}`;
  try { await writeFile(temporary, `${JSON.stringify(value, null, 2)}\n`, "utf8"); await rename(temporary, target); }
  catch (error) { await unlink(temporary).catch(() => {}); throw error; }
}

export async function main(argv = process.argv.slice(2)) {
  const cutoff = parseAsOf(argv);
  const inputs = {}; const sourceFiles = {};
  for (const id of INCLUDED_INDICATORS) {
    const relative = SOURCE_PATHS[id];
    const bytes = await readFile(path.resolve(relative));
    inputs[id] = JSON.parse(bytes.toString("utf8"));
    sourceFiles[id] = { path: relative, sha256: sha256(bytes) };
  }
  const joint = buildJointHistory(inputs, sourceFiles, cutoff);
  await writeAtomically(path.resolve(OUTPUT), joint);
  console.log(`Generated ${OUTPUT}: ${joint.snapshots.length} offline snapshots; coverage 11/14; scores disabled`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) main().catch(error => { console.error(error instanceof Error ? error.message : String(error)); process.exitCode = 1; });
