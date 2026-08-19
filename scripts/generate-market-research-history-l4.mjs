import { createHash } from "node:crypto";
import { mkdir, readFile, rename, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { normalizeSourceText, sourceFileSha256 } from "./generate-market-research-joint-history.mjs";

const INPUT_PATHS = {
  L2: "public/data/market-research/history/l2.json",
  L3: "public/data/market-research/history/l3.json",
};
const OUTPUT = "public/data/market-research/history/l4.json";
const REQUIRED_AS_OF = "2026-08-17";

const validDate = value => {
  const text = String(value ?? "");
  const parsed = /^\d{4}-\d{2}-\d{2}$/.test(text) ? new Date(`${text}T00:00:00Z`) : new Date(Number.NaN);
  return !Number.isNaN(parsed.valueOf()) && parsed.toISOString().slice(0, 10) === text;
};

function plainDecimal(value) {
  if (typeof value !== "number" || !Number.isFinite(value)) throw new Error(`Invalid finite decimal value ${value}`);
  const match = String(value).match(/^(-?)(\d+)(?:\.(\d*))?(?:e([+-]?\d+))?$/i);
  if (!match) throw new Error(`Invalid decimal value ${value}`);
  const sign = match[1];
  const integer = match[2];
  const fraction = match[3] ?? "";
  const exponent = Number(match[4] ?? 0);
  const digits = `${integer}${fraction}`;
  const point = integer.length + exponent;
  if (point <= 0) return `${sign}0.${"0".repeat(-point)}${digits}`;
  if (point >= digits.length) return `${sign}${digits}${"0".repeat(point - digits.length)}`;
  return `${sign}${digits.slice(0, point)}.${digits.slice(point)}`;
}

function scaledInteger(value, scale) {
  const text = plainDecimal(value);
  const negative = text.startsWith("-");
  const unsigned = negative ? text.slice(1) : text;
  const [integer, fraction = ""] = unsigned.split(".");
  const scaled = BigInt(`${integer}${fraction.padEnd(scale, "0")}`);
  return negative ? -scaled : scaled;
}

export function decimalSubtract(left, right) {
  const decimals = value => (plainDecimal(value).split(".")[1] ?? "").length;
  const scale = Math.max(decimals(left), decimals(right));
  const difference = scaledInteger(left, scale) - scaledInteger(right, scale);
  const negative = difference < 0n;
  const digits = (negative ? -difference : difference).toString().padStart(scale + 1, "0");
  const fraction = scale === 0 ? "" : digits.slice(-scale).replace(/0+$/, "");
  const rendered = scale === 0 ? digits : fraction ? `${digits.slice(0, -scale)}.${fraction}` : digits.slice(0, -scale);
  const result = Number(`${negative ? "-" : ""}${rendered}`);
  if (!Number.isFinite(result)) throw new Error("L4 decimal subtraction produced a non-finite value");
  return result;
}

function validateInputArtifact(id, artifact, requestedAsOf) {
  const sourceField = id === "L2" ? "m1_yoy" : "m2_yoy";
  if (artifact?.schemaVersion !== 1 || artifact?.indicator?.id !== id || artifact?.requestedAsOf !== requestedAsOf || !Array.isArray(artifact.points) || artifact.points.length !== 139) throw new Error(`${id} must be a 139-point history for ${requestedAsOf}`);
  let previous = "";
  const seen = new Set();
  for (const [index, point] of artifact.points.entries()) {
    if (!validDate(point?.asOf) || seen.has(point.asOf) || point.asOf <= previous) throw new Error(`${id} asOf values must be valid, unique and strictly ascending at ${index}`);
    if (!/^\d{6}$/.test(point?.period ?? "") || !validDate(point?.releaseDate) || point.releaseDate > point.asOf) throw new Error(`${id} contains invalid period or releaseDate at ${point?.asOf}`);
    if (typeof point.value !== "number" || !Number.isFinite(point.value)) throw new Error(`${id} contains a non-finite value at ${point.asOf}`);
    if (point.source !== "tushare" || point.dataset !== "cn_m" || point.sourceField !== sourceField) throw new Error(`${id} source identity is invalid at ${point.asOf}`);
    if (point.releaseDateQuality !== "conservative_proxy" || point.pitScope !== "release_lag_only" || point.valueVintage !== "latest_available_snapshot") throw new Error(`${id} PIT metadata is invalid at ${point.asOf}`);
    seen.add(point.asOf);
    previous = point.asOf;
  }
  return artifact;
}

function validateInputFiles(inputFiles) {
  for (const id of ["L2", "L3"]) {
    if (inputFiles?.[id]?.path !== INPUT_PATHS[id] || !/^[a-f0-9]{64}$/.test(inputFiles[id].sha256 ?? "")) throw new Error(`Invalid ${id} input provenance`);
  }
  return inputFiles;
}

export function sourceSnapshotSha256(rows) {
  return createHash("sha256").update(JSON.stringify(rows)).digest("hex");
}

export function buildL4MonthlyHistory(l2, l3, inputFiles, requestedAsOf = REQUIRED_AS_OF) {
  validateInputArtifact("L2", l2, requestedAsOf);
  validateInputArtifact("L3", l3, requestedAsOf);
  validateInputFiles(inputFiles);
  const sourceRows = [];
  const points = l2.points.map((left, index) => {
    const right = l3.points[index];
    if (left.asOf !== right.asOf) throw new Error(`L2/L3 asOf mismatch at index ${index}`);
    if (left.period !== right.period) throw new Error(`L2/L3 period mismatch at ${left.asOf}`);
    if (left.releaseDate !== right.releaseDate) throw new Error(`L2/L3 releaseDate mismatch at ${left.asOf}`);
    for (const key of ["releaseDateQuality", "pitScope", "valueVintage"]) if (left[key] !== right[key]) throw new Error(`L2/L3 ${key} mismatch at ${left.asOf}`);
    sourceRows.push({ asOf: left.asOf, period: left.period, m1_yoy: left.value, m2_yoy: right.value });
    return {
      indicatorId: "L4",
      asOf: left.asOf,
      period: left.period,
      value: decimalSubtract(left.value, right.value),
      unit: "pct_point",
      source: "derived",
      sourceDataset: "tushare.cn_m",
      sourceIndicators: ["L2", "L3"],
      sourceFields: ["m1_yoy", "m2_yoy"],
      formula: "m1_yoy - m2_yoy",
      releaseDate: left.releaseDate,
      releaseDateQuality: left.releaseDateQuality,
      pitScope: left.pitScope,
      valueVintage: left.valueVintage,
    };
  });
  return {
    schemaVersion: 1,
    generatedAt: `${requestedAsOf}T00:00:00.000Z`,
    requestedAsOf,
    indicator: { id: "L4", name: "M1-M2同比剪刀差", frequency: "monthly", asOfRule: "available_when_both_conservative_inputs_are_available" },
    range: { ...l2.range },
    source: { provider: "derived", dataset: "tushare.cn_m", formula: "m1_yoy - m2_yoy", inputIndicators: ["L2", "L3"], releaseDateQuality: "conservative_proxy", pitScope: "release_lag_only", valueVintage: "latest_available_snapshot" },
    inputFiles,
    sourceSnapshotSha256: sourceSnapshotSha256(sourceRows),
    points,
  };
}

export function assertNoSilentRevision(existing, incoming) {
  if (!existing?.points) return;
  const incomingByAsOf = new Map(incoming.points.map(point => [point.asOf, point]));
  const changed = existing.points.filter(point => incomingByAsOf.has(point.asOf) && JSON.stringify(point) !== JSON.stringify(incomingByAsOf.get(point.asOf))).map(point => point.asOf);
  if (changed.length) throw new Error(`L4 historical revision requires review: ${changed.join(",")}`);
  if (existing.sourceSnapshotSha256 !== incoming.sourceSnapshotSha256 || JSON.stringify(existing.inputFiles) !== JSON.stringify(incoming.inputFiles)) throw new Error("L4 source input revision requires review");
}

async function writeAtomically(target, value) {
  await mkdir(path.dirname(target), { recursive: true });
  const temporary = `${target}.tmp-${process.pid}-${Date.now()}`;
  try { await writeFile(temporary, `${JSON.stringify(value, null, 2)}\n`, "utf8"); await rename(temporary, target); }
  catch (error) { await unlink(temporary).catch(() => {}); throw error; }
}

function parseAsOf(argv) {
  const index = argv.indexOf("--as-of");
  const value = index >= 0 ? argv[index + 1] : "";
  if (value !== REQUIRED_AS_OF) throw new Error(`requestedAsOf must be ${REQUIRED_AS_OF}`);
  return value;
}

export async function main(argv = process.argv.slice(2)) {
  const requestedAsOf = parseAsOf(argv);
  const artifacts = {};
  const inputFiles = {};
  for (const id of ["L2", "L3"]) {
    const bytes = await readFile(path.resolve(INPUT_PATHS[id]));
    artifacts[id] = JSON.parse(normalizeSourceText(bytes));
    inputFiles[id] = { path: INPUT_PATHS[id], sha256: sourceFileSha256(bytes) };
  }
  const incoming = buildL4MonthlyHistory(artifacts.L2, artifacts.L3, inputFiles, requestedAsOf);
  const target = path.resolve(OUTPUT);
  let existing = null;
  try { existing = JSON.parse(await readFile(target, "utf8")); }
  catch (error) { if (error?.code !== "ENOENT") throw error; }
  assertNoSilentRevision(existing, incoming);
  await writeAtomically(target, incoming);
  console.log(`Generated ${OUTPUT}: ${incoming.points.length} derived L4 conservative-PIT points; no network requests`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) main().catch(error => { console.error(error instanceof Error ? error.message : String(error)); process.exitCode = 1; });
