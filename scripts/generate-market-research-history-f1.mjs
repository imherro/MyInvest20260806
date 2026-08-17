import { mkdir, readFile, rename, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { buildF1Snapshot, callTushare, parseAsOf, quarterEndOnOrBefore } from "./generate-market-research-current.mjs";

const INPUT = "public/data/market-research/history/b3.json";
const OUTPUT = "public/data/market-research/history/f1.json";
const FIELDS = "ts_code,ann_date,end_date,netprofit_yoy,update_flag";
const displayDate = value => `${value.slice(0, 4)}-${value.slice(4, 6)}-${value.slice(6, 8)}`;

export function validateMonthlySchedule(b3, requestedAsOf) {
  if (b3?.schemaVersion !== 1 || b3?.indicator?.id !== "B3" || b3.indicator.frequency !== "monthly") throw new Error("Invalid B3 monthly schedule identity");
  if (b3.requestedAsOf !== requestedAsOf) throw new Error("B3 schedule requestedAsOf does not match F1 request");
  if (!b3?.range?.startAsOf || !b3?.range?.endAsOf || !Array.isArray(b3.points) || !b3.points.length) throw new Error("Invalid B3 monthly schedule range or points");
  let previousAsOf = "";
  const seen = new Set();
  for (const point of b3.points) {
    if (!point?.asOf || seen.has(point.asOf) || point.asOf <= previousAsOf) throw new Error("B3 schedule asOf values must be unique and strictly ascending");
    seen.add(point.asOf); previousAsOf = point.asOf;
  }
  if (b3.points[0].asOf !== b3.range.startAsOf || b3.points.at(-1).asOf !== b3.range.endAsOf) throw new Error("B3 schedule range does not match its points");
  return b3;
}

export function validateQuarterBatch(rows, period) {
  if (!Array.isArray(rows) || !rows.length) throw new Error(`Tushare fina_indicator_vip returned no rows for ${period}`);
  for (const row of rows) {
    const endDate = String(row?.end_date ?? "");
    const shown = /^\d{8}$/.test(endDate) ? displayDate(endDate) : "";
    const parsed = shown ? new Date(`${shown}T00:00:00Z`) : new Date(Number.NaN);
    if (!shown || Number.isNaN(parsed.valueOf()) || parsed.toISOString().slice(0, 10) !== shown || endDate !== period) throw new Error(`Tushare fina_indicator_vip contains invalid or mismatched end_date for ${period}`);
  }
  return rows;
}

export function resolveF1SameDayRevisions(rows, period, stats = null) {
  const groups = new Map();
  for (const row of rows) {
    const rawFlag = row?.update_flag;
    const flag = rawFlag === null || rawFlag === undefined || rawFlag === "" ? "unknown" : String(rawFlag);
    if (!new Set(["0", "1", "unknown"]).has(flag)) throw new Error(`Tushare fina_indicator_vip contains invalid update_flag for ${row?.ts_code ?? "unknown"} at ${row?.ann_date ?? "unknown"}`);
    const key = `${row?.ts_code ?? ""}|${row?.ann_date ?? ""}|${row?.end_date ?? ""}`;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push({ row, flag });
  }
  const canonical = [];
  const numericValues = entries => {
    const values = [];
    for (const { row } of entries) {
      const raw = row?.netprofit_yoy;
      if (raw === null || raw === undefined || raw === "") continue;
      const value = Number(raw);
      if (!Number.isFinite(value)) throw new Error(`Tushare fina_indicator_vip contains invalid netprofit_yoy for ${row?.ts_code ?? "unknown"} at ${row?.ann_date ?? "unknown"}`);
      if (!values.some(item => Object.is(item, value))) values.push(value);
    }
    return values;
  };
  for (const entries of groups.values()) {
    const allValues = numericValues(entries);
    let selected = allValues[0] ?? null;
    if (allValues.length > 1) {
      if (stats) stats.conflictingGroups += 1;
      const initialValues = numericValues(entries.filter(entry => entry.flag === "0"));
      if (initialValues.length === 1) { selected = initialValues[0]; if (stats) stats.resolvedByInitial += 1; }
      else { selected = null; if (stats) stats.unresolvedAsMissing += 1; }
    }
    const { row } = entries[0];
    canonical.push({ ts_code: row.ts_code, ann_date: row.ann_date, end_date: period, netprofit_yoy: selected });
  }
  return canonical;
}

export function buildF1MonthlyHistory(b3, rowsByPeriod, requestedAsOf, generatedAt = new Date().toISOString()) {
  validateMonthlySchedule(b3, requestedAsOf);
  const unavailableMessage = "Tushare fina_indicator_vip contains no reported companies by as-of date";
  const points = b3.points.map(({ asOf }) => {
    const targetPeriod = quarterEndOnOrBefore(asOf);
    const rows = rowsByPeriod.get(targetPeriod);
    if (!rows) throw new Error(`Missing F1 quarter batch for ${targetPeriod}`);
    const periodDate = displayDate(targetPeriod);
    try {
      const snapshot = buildF1Snapshot(rows, asOf, targetPeriod);
      const releaseDate = displayDate(snapshot.latestAnnDate);
      if (releaseDate < periodDate || releaseDate > asOf) throw new Error(`Invalid F1 releaseDate at ${asOf}`);
      return { asOf, periodDate, releaseDate, revisionStatus: "not_tracked", dataStatus: "generated", reportedCount: snapshot.reportedCount, validCount: snapshot.validCount, missingCount: snapshot.missingCount, medianNetProfitYoy: snapshot.medianNetProfitYoy };
    } catch (error) {
      if (!(error instanceof Error) || error.message !== unavailableMessage) throw error;
      return { asOf, periodDate, releaseDate: null, revisionStatus: "not_tracked", dataStatus: "unavailable", reportedCount: 0, validCount: 0, missingCount: 0, medianNetProfitYoy: null };
    }
  });
  return {
    schemaVersion: 1, generatedAt, requestedAsOf,
    indicator: { id: "F1", name: "全A盈利趋势", frequency: "monthly", asOfRule: "latest_ended_quarter_disclosed_sample" },
    range: { ...b3.range },
    source: { provider: "Tushare Pro", api: "fina_indicator_vip", fields: FIELDS.split(","), scheduleInput: INPUT, revisionField: "update_flag", revisionPolicy: "prefer_initial_on_same_day_conflict; unresolved_conflict_as_missing" },
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
  const b3 = validateMonthlySchedule(JSON.parse(await readFile(path.resolve(INPUT), "utf8")), requestedAsOf);
  const targetPeriods = [...new Set(b3.points.map(point => quarterEndOnOrBefore(point.asOf)))].sort();
  const token = process.env.TUSHARE_TOKEN;
  if (!token) throw new Error("TUSHARE_TOKEN is required");
  const rowsByPeriod = new Map();
  const revisionStats = { conflictingGroups: 0, resolvedByInitial: 0, unresolvedAsMissing: 0 };
  const apiRowsByPeriod = new Map();
  for (const period of targetPeriods) {
    const rows = validateQuarterBatch(await callTushare("fina_indicator_vip", { period }, FIELDS, token), period);
    apiRowsByPeriod.set(period, rows.length);
    rowsByPeriod.set(period, resolveF1SameDayRevisions(rows, period, revisionStats));
  }
  const f1 = buildF1MonthlyHistory(b3, rowsByPeriod, requestedAsOf);
  await writeAtomically(path.resolve(OUTPUT), f1);
  console.log(`Generated ${OUTPUT}: ${f1.points.length} monthly F1 PIT points (${f1.range.startAsOf} to ${f1.range.endAsOf}); fina_indicator_vip requests: ${targetPeriods.length}`);
  for (const period of targetPeriods) console.log(`${period}: ${apiRowsByPeriod.get(period)} API rows`);
  console.log(`Same-day conflicting groups: ${revisionStats.conflictingGroups}; resolved by unique update_flag=0: ${revisionStats.resolvedByInitial}; unresolved as missing: ${revisionStats.unresolvedAsMissing}`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) main().catch(error => { console.error(error instanceof Error ? error.message : String(error)); process.exitCode = 1; });
