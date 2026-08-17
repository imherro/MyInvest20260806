import { mkdir, readFile, rename, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { buildF1Snapshot, callTushare, parseAsOf, quarterEndOnOrBefore } from "./generate-market-research-current.mjs";
import { resolveF1SameDayRevisions, validateQuarterBatch } from "./generate-market-research-history-f1.mjs";

const INPUT = "public/data/market-research/history/f1.json";
const OUTPUT = "public/data/market-research/history/f2.json";
const FIELDS = "ts_code,ann_date,end_date,netprofit_yoy,update_flag";
const compactDate = value => value.replaceAll("-", "");
const displayDate = value => `${value.slice(0, 4)}-${value.slice(4, 6)}-${value.slice(6, 8)}`;

export function validateF1History(f1, requestedAsOf) {
  if (f1?.schemaVersion !== 1 || f1?.indicator?.id !== "F1" || f1.indicator.frequency !== "monthly") throw new Error("Invalid F1 history identity");
  if (f1.requestedAsOf !== requestedAsOf) throw new Error("F1 history requestedAsOf does not match F2 request");
  if (!f1?.range?.startAsOf || !f1?.range?.endAsOf || !Array.isArray(f1.points) || !f1.points.length) throw new Error("Invalid F1 history range or points");
  if (f1?.source?.provider !== "Tushare Pro" || f1.source.api !== "fina_indicator_vip" || !Array.isArray(f1.source.fields) || !FIELDS.split(",").every(field => f1.source.fields.includes(field))) throw new Error("Invalid F1 history source");
  let previousAsOf = "";
  const seen = new Set();
  for (const point of f1.points) {
    if (!point?.asOf || seen.has(point.asOf) || point.asOf <= previousAsOf) throw new Error("F1 history asOf values must be unique and strictly ascending");
    seen.add(point.asOf); previousAsOf = point.asOf;
    if (!point.periodDate || compactDate(point.periodDate) !== quarterEndOnOrBefore(point.asOf)) throw new Error(`Invalid F1 periodDate at ${point.asOf}`);
    if (point.revisionStatus !== "not_tracked") throw new Error(`Invalid F1 revisionStatus at ${point.asOf}`);
    if (point.dataStatus === "generated") {
      if (!point.releaseDate || point.releaseDate < point.periodDate || point.releaseDate > point.asOf || !Number.isInteger(point.reportedCount) || point.reportedCount <= 0 || !Number.isInteger(point.validCount) || point.validCount <= 0 || !Number.isInteger(point.missingCount) || point.missingCount < 0 || point.validCount + point.missingCount !== point.reportedCount || !Number.isFinite(point.medianNetProfitYoy)) throw new Error(`Invalid generated F1 point at ${point.asOf}`);
    } else if (point.dataStatus === "unavailable") {
      if (point.releaseDate !== null || point.reportedCount !== 0 || point.validCount !== 0 || point.missingCount !== 0 || point.medianNetProfitYoy !== null) throw new Error(`Invalid unavailable F1 point at ${point.asOf}`);
    } else throw new Error(`Invalid F1 dataStatus at ${point.asOf}`);
  }
  if (f1.points[0].asOf !== f1.range.startAsOf || f1.points.at(-1).asOf !== f1.range.endAsOf) throw new Error("F1 history range does not match its points");
  return f1;
}

export function buildF2MonthlyHistory(f1, rowsByPeriod, requestedAsOf, generatedAt = new Date().toISOString()) {
  validateF1History(f1, requestedAsOf);
  const unavailableMessage = "Tushare fina_indicator_vip contains no reported companies by as-of date";
  const points = f1.points.map(reference => {
    const period = compactDate(reference.periodDate);
    const rows = rowsByPeriod.get(period);
    if (!rows) throw new Error(`Missing F2 quarter batch for ${period}`);
    let snapshot;
    try { snapshot = buildF1Snapshot(rows, reference.asOf, period); }
    catch (error) {
      if (!(error instanceof Error) || error.message !== unavailableMessage) throw error;
      if (reference.dataStatus !== "unavailable") throw new Error(`F1/F2 generated status mismatch at ${reference.asOf}`);
      return { asOf: reference.asOf, periodDate: reference.periodDate, releaseDate: reference.releaseDate, revisionStatus: reference.revisionStatus, dataStatus: reference.dataStatus, reportedCount: 0, validCount: 0, missingCount: 0, positiveCount: 0, positiveShare: null };
    }
    if (reference.dataStatus !== "generated") throw new Error(`F1/F2 unavailable status mismatch at ${reference.asOf}`);
    const releaseDate = displayDate(snapshot.latestAnnDate);
    if (releaseDate !== reference.releaseDate || snapshot.reportedCount !== reference.reportedCount || snapshot.validCount !== reference.validCount || snapshot.missingCount !== reference.missingCount || snapshot.medianNetProfitYoy !== reference.medianNetProfitYoy) throw new Error(`F1/F2 reference mismatch at ${reference.asOf}`);
    if (!Number.isInteger(snapshot.positiveCount) || snapshot.positiveCount < 0 || snapshot.positiveCount > snapshot.validCount || !Number.isFinite(snapshot.positiveShare) || snapshot.positiveShare < 0 || snapshot.positiveShare > 100 || Math.abs(snapshot.positiveShare - snapshot.positiveCount / snapshot.validCount * 100) >= 1e-12) throw new Error(`Invalid F2 positive breadth at ${reference.asOf}`);
    return { asOf: reference.asOf, periodDate: reference.periodDate, releaseDate: reference.releaseDate, revisionStatus: reference.revisionStatus, dataStatus: reference.dataStatus, reportedCount: reference.reportedCount, validCount: reference.validCount, missingCount: reference.missingCount, positiveCount: snapshot.positiveCount, positiveShare: snapshot.positiveShare };
  });
  return {
    schemaVersion: 1, generatedAt, requestedAsOf,
    indicator: { id: "F2", name: "盈利扩散与质量", frequency: "monthly", asOfRule: "same_disclosed_sample_as_f1" },
    range: { ...f1.range },
    source: { provider: "Tushare Pro", api: "fina_indicator_vip", fields: FIELDS.split(","), referenceInput: INPUT, revisionField: "update_flag", revisionPolicy: "prefer_initial_on_same_day_conflict; unresolved_conflict_as_missing", samplePolicy: "rebuild_and_match_f1_disclosed_sample" },
    points,
  };
}

async function writeAtomically(target, value) {
  await mkdir(path.dirname(target), { recursive: true });
  const temporary = `${target}.tmp-${process.pid}-${Date.now()}`;
  try { await writeFile(temporary, `${JSON.stringify(value, null, 2)}\n`, "utf8"); await rename(temporary, target); }
  catch (error) { await unlink(temporary).catch(() => {}); throw error; }
}

export async function main(argv = process.argv.slice(2)) {
  const requestedAsOf = parseAsOf(argv);
  const f1 = validateF1History(JSON.parse(await readFile(path.resolve(INPUT), "utf8")), requestedAsOf);
  const targetPeriods = [...new Set(f1.points.map(point => compactDate(point.periodDate)))].sort();
  const token = process.env.TUSHARE_TOKEN;
  if (!token) throw new Error("TUSHARE_TOKEN is required");
  const rowsByPeriod = new Map();
  const apiRowsByPeriod = new Map();
  const revisionStats = { conflictingGroups: 0, resolvedByInitial: 0, unresolvedAsMissing: 0 };
  for (const period of targetPeriods) {
    const rows = validateQuarterBatch(await callTushare("fina_indicator_vip", { period }, FIELDS, token), period);
    apiRowsByPeriod.set(period, rows.length);
    rowsByPeriod.set(period, resolveF1SameDayRevisions(rows, period, revisionStats));
  }
  const f2 = buildF2MonthlyHistory(f1, rowsByPeriod, requestedAsOf);
  await writeAtomically(path.resolve(OUTPUT), f2);
  console.log(`Generated ${OUTPUT}: ${f2.points.length} monthly F2 PIT points (${f2.range.startAsOf} to ${f2.range.endAsOf}); fina_indicator_vip requests: ${targetPeriods.length}; F1 mismatches: 0`);
  for (const period of targetPeriods) console.log(`${period}: ${apiRowsByPeriod.get(period)} API rows`);
  console.log(`Same-day conflicting groups: ${revisionStats.conflictingGroups}; resolved by unique update_flag=0: ${revisionStats.resolvedByInitial}; unresolved as missing: ${revisionStats.unresolvedAsMissing}`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) main().catch(error => { console.error(error instanceof Error ? error.message : String(error)); process.exitCode = 1; });
