import { createHash } from "node:crypto";
import { mkdir, readFile, rename, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";

export const INDICATOR_IDS = ["B1", "B2", "B3", "B4", "B5", "F1", "F2", "F3", "F4", "L1", "L2", "L3", "L4", "L5"];
export const EXPECTED_INPUT_SHA256 = {
  B1: "c1ab44c3102be20d707e489483cfab20dd928317600cbcb05b0e8e7712d750d3",
  B2: "127b725f76b29f1d372d0a924ebaac4113096a1052073ff99d9dada69765b08a",
  B3: "ac2c394276b24eb7d890ee81d5b8dd3658bb51c8640e4c26a27bbef4f44290e4",
  B4: "9cf87be60d0440803285798c208c7050034cbe89c63dbba12ab8b72915f5e879",
  B5: "d78315eff01d0d1b89ee5fff07f72154e09c4a393a12a03efbcbe92819676ca8",
  F1: "51cf895b699b10a1756063ad542bed02a898547e079b3faf6a1f7c3e8a553982",
  F2: "b068234dfc97e3545bbe40ab1744c2f787578b7067121d09db4eb4b0407ac74a",
  F3: "1df3db59655ccfa66ebe0653faf67eeccc0a3120ba95523431286d341db4f6f7",
  F4: "9bb8e11f9c533efa80f29781c2f0383905ef64428cb3b1ab96b87f4b7fc301f3",
  L1: "1dd3cfd7ee59590bcff001e7909d52a29fe6fbd6bbf61394f24d25a068c35e37",
  L2: "c7d09a1dad57b61626c609b457dc8246603dbea67a1ec1edc01a18aa9cb21001",
  L3: "49468c3e6abb40cb55ac91c09ce6e710e442dafdb91acf891f4088c1d340609d",
  L4: "c2400698d819aad82b0b19b5d5efc3c7324801d414a1ec8224c4abffb7444b8c",
  L5: "db293c0b26fd28cf0928332146c33c1345c02c37cfa1889f870ada4d5349b989",
};

const OUTPUT_PATH = "public/data/market-research/history/input-freeze.json";
const BASELINE_COMMIT = "32a940324cd614dbf497643a76d4359f140ac1f3";
const HASH_POLICY = "utf8_lf_with_exactly_one_terminal_newline";
const FORBIDDEN_KEYS = new Set(["score", "normalizedScore", "aggregateScore", "zScore", "percentile", "jointState", "signal", "value"]);

export const sha256 = value => createHash("sha256").update(value).digest("hex");

function leapYear(year) {
  return year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);
}

function daysInMonth(year, month) {
  return [31, leapYear(year) ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31][month - 1] ?? 0;
}

export function validDate(value) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(value ?? ""));
  if (!match) return false;
  const year = Number(match[1]); const month = Number(match[2]); const day = Number(match[3]);
  return year >= 1 && month >= 1 && month <= 12 && day >= 1 && day <= daysInMonth(year, month);
}

export function monthEnd(value) {
  if (!validDate(value)) return false;
  return Number(value.slice(8, 10)) === daysInMonth(Number(value.slice(0, 4)), Number(value.slice(5, 7)));
}

export function canonicalInput(bytes, expectedHash, id) {
  const buffer = Buffer.from(bytes);
  if (buffer.length >= 3 && buffer[0] === 0xef && buffer[1] === 0xbb && buffer[2] === 0xbf) throw new Error(`${id}_BOM_FORBIDDEN`);
  let decoded;
  try { decoded = new TextDecoder("utf-8", { fatal: true }).decode(buffer); }
  catch { throw new Error(`${id}_UTF8_INVALID`); }
  const canonical = decoded.replace(/\r\n?/g, "\n");
  if (!canonical.endsWith("\n") || canonical.endsWith("\n\n")) throw new Error(`${id}_TERMINAL_NEWLINE_INVALID`);
  const digest = sha256(Buffer.from(canonical, "utf8"));
  if (digest !== expectedHash) throw new Error(`${id}_CANONICAL_HASH_MISMATCH expected ${expectedHash}, received ${digest}`);
  let data;
  try { data = JSON.parse(canonical); }
  catch { throw new Error(`${id}_JSON_INVALID`); }
  return { data, digest };
}

function ordinaryObject(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value) && Object.getPrototypeOf(value) === Object.prototype;
}

function declaredValue(history, key, type, id) {
  if (!Object.hasOwn(history, key)) return null;
  if (typeof history[key] !== type) throw new Error(`${id}_${key}_TYPE_INVALID`);
  return history[key];
}

function validateHistory(id, history) {
  if (!ordinaryObject(history) || history.schemaVersion !== 1 || history?.indicator?.id !== id || !Array.isArray(history.points) || history.points.length !== 139) throw new Error(`${id}_SCHEMA_INVALID`);
  const seen = new Set(); let previous = null; let present = 0; let unavailable = 0;
  for (let index = 0; index < history.points.length; index += 1) {
    const point = history.points[index];
    if (!ordinaryObject(point) || !validDate(point.asOf) || seen.has(point.asOf) || (previous !== null && point.asOf <= previous)) throw new Error(`${id}_ASOF_INVALID index ${index}`);
    seen.add(point.asOf); previous = point.asOf;
    if (!Object.hasOwn(point, "releaseDate")) throw new Error(`${id}_RELEASE_DATE_MISSING index ${index}`);
    if (point.releaseDate === null) unavailable += 1;
    else if (typeof point.releaseDate === "string" && validDate(point.releaseDate)) {
      if (point.releaseDate > point.asOf) throw new Error(`${id}_FUTURE_RELEASE_DATE index ${index}`);
      present += 1;
    } else throw new Error(`${id}_RELEASE_DATE_INVALID index ${index}`);
  }
  if (present + unavailable !== 139) throw new Error(`${id}_RELEASE_COVERAGE_INVALID`);
  return {
    present, unavailable,
    declared: {
      historyStatus: declaredValue(history, "historyStatus", "string", id),
      scoreEligible: declaredValue(history, "scoreEligible", "boolean", id),
      jointEligible: declaredValue(history, "jointEligible", "boolean", id),
    },
  };
}

function assertNoForbiddenKeys(value) {
  if (Array.isArray(value)) { value.forEach(assertNoForbiddenKeys); return; }
  if (!ordinaryObject(value)) return;
  for (const [key, child] of Object.entries(value)) {
    if (FORBIDDEN_KEYS.has(key)) throw new Error(`FORBIDDEN_OUTPUT_KEY ${key}`);
    assertNoForbiddenKeys(child);
  }
}

export function buildFreeze(histories, digests, requestedAsOf = "2026-08-17") {
  if (requestedAsOf !== "2026-08-17") throw new Error("AS_OF_MUST_BE_2026-08-17");
  if (!ordinaryObject(histories) || !ordinaryObject(digests) || Object.keys(histories).length !== 14 || Object.keys(digests).length !== 14) throw new Error("INPUT_SET_INVALID");
  const validated = {};
  for (const id of INDICATOR_IDS) {
    if (!Object.hasOwn(histories, id) || digests[id] !== EXPECTED_INPUT_SHA256[id]) throw new Error(`${id}_INPUT_IDENTITY_INVALID`);
    validated[id] = validateHistory(id, histories[id]);
  }
  const master = histories.B3.points;
  if (master[0].asOf !== "2015-01-31" || master.at(-1).asOf !== "2026-07-31" || master.some(point => !monthEnd(point.asOf))) throw new Error("B3_MASTER_TIMELINE_INVALID");
  for (const id of INDICATOR_IDS) {
    for (let index = 0; index < 139; index += 1) if (histories[id].points[index].asOf !== master[index].asOf) throw new Error(`${id}_TIMELINE_MISMATCH index ${index}`);
  }
  const indicators = {};
  for (const id of INDICATOR_IDS) indicators[id] = {
    path: `public/data/market-research/history/${id.toLowerCase()}.json`,
    canonicalSha256: digests[id], schemaVersion: 1, pointCount: 139,
    startAsOf: "2015-01-31", endAsOf: "2026-07-31",
    releaseDatePresent: validated[id].present, releaseDateUnavailable: validated[id].unavailable,
    declared: validated[id].declared,
  };
  const result = {
    schemaVersion: 1,
    generatedAt: "2026-08-19T00:00:00.000Z",
    requestedAsOf,
    baselineCommit: BASELINE_COMMIT,
    auditStatus: "frozen_pre_scoring_inputs",
    scoreEligible: false,
    jointEligible: false,
    masterTimeline: { indicatorId: "B3", startAsOf: "2015-01-31", endAsOf: "2026-07-31", pointCount: 139 },
    hashPolicy: HASH_POLICY,
    releaseDateRule: "non_null_release_date_must_be_lte_as_of",
    summary: { requiredIndicators: 14, presentArtifacts: 14, hashVerified: 14, timelineAligned: 14, releaseDateViolations: 0, structurallyFrozen: true, scoringDefined: false, jointRebuildAllowed: false },
    indicators,
    blockingPolicy: ["scoring_contract_not_defined", "calibration_not_run", "joint_not_rebuilt_in_this_task"],
  };
  if (Object.keys(result.indicators).join(",") !== INDICATOR_IDS.join(",") || Object.values(result.indicators).some(item => item.releaseDatePresent + item.releaseDateUnavailable !== 139)) throw new Error("FINAL_INDICATOR_INVARIANT_FAILED");
  if (JSON.stringify(result.summary) !== JSON.stringify({ requiredIndicators: 14, presentArtifacts: 14, hashVerified: 14, timelineAligned: 14, releaseDateViolations: 0, structurallyFrozen: true, scoringDefined: false, jointRebuildAllowed: false })) throw new Error("FINAL_SUMMARY_INVARIANT_FAILED");
  assertNoForbiddenKeys(result);
  return result;
}

function parseAsOf(argv) {
  if (argv.length !== 2 || argv[0] !== "--as-of" || argv[1] !== "2026-08-17") throw new Error("Usage: node scripts/audit-market-research-history-inputs.mjs --as-of 2026-08-17");
  return argv[1];
}

export async function audit({ root = process.cwd(), argv = process.argv.slice(2) } = {}) {
  const requestedAsOf = parseAsOf(argv); const histories = {}; const digests = {};
  for (const id of INDICATOR_IDS) {
    const relativePath = `public/data/market-research/history/${id.toLowerCase()}.json`;
    const validated = canonicalInput(await readFile(path.join(root, relativePath)), EXPECTED_INPUT_SHA256[id], id);
    histories[id] = validated.data; digests[id] = validated.digest;
  }
  const output = `${JSON.stringify(buildFreeze(histories, digests, requestedAsOf), null, 2)}\n`;
  const outputPath = path.join(root, OUTPUT_PATH); const temporaryPath = `${outputPath}.tmp-${process.pid}`;
  await mkdir(path.dirname(outputPath), { recursive: true });
  try { await writeFile(temporaryPath, output, { encoding: "utf8", flag: "wx" }); await rename(temporaryPath, outputPath); }
  catch (error) { await unlink(temporaryPath).catch(() => {}); throw error; }
  return { outputPath, sha256: sha256(output), indicators: 14, points: 1946 };
}

const isMain = process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href;
if (isMain) audit().then(result => console.log(`Wrote ${result.outputPath} (${result.indicators} indicators, ${result.points} points, sha256 ${result.sha256})`)).catch(error => { console.error(error.message); process.exitCode = 1; });
