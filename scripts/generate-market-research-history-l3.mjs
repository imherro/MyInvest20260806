import { createHash } from "node:crypto";
import { mkdir, readFile, rename, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { callTushare, parseAsOf } from "./generate-market-research-current.mjs";

const INPUT = "public/data/market-research/history/b3.json";
const OUTPUT = "public/data/market-research/history/l3.json";
const FIELDS = "month,inc_month,inc_cumval,stk_endval";

const validDate = value => {
  const date = /^\d{4}-\d{2}-\d{2}$/.test(String(value ?? "")) ? new Date(`${value}T00:00:00Z`) : new Date(Number.NaN);
  return !Number.isNaN(date.valueOf()) && date.toISOString().slice(0, 10) === value;
};

export function validMonth(month) {
  if (!/^\d{6}$/.test(String(month ?? ""))) return false;
  const number = Number(month.slice(4, 6));
  return number >= 1 && number <= 12;
}

export function shiftMonth(month, offset) {
  if (!validMonth(month) || !Number.isInteger(offset)) throw new Error(`Invalid month ${month}`);
  const date = new Date(Date.UTC(Number(month.slice(0, 4)), Number(month.slice(4, 6)) - 1 + offset, 1));
  return `${date.getUTCFullYear()}${String(date.getUTCMonth() + 1).padStart(2, "0")}`;
}

export function conservativeReleaseDate(period) {
  const next = shiftMonth(period, 1);
  return new Date(Date.UTC(Number(next.slice(0, 4)), Number(next.slice(4, 6)), 0)).toISOString().slice(0, 10);
}

export function selectedPeriodForAsOf(asOf) {
  if (!validDate(asOf)) throw new Error(`Invalid B3 asOf ${asOf}`);
  let period = shiftMonth(asOf.slice(0, 7).replace("-", ""), -1);
  while (conservativeReleaseDate(period) > asOf) period = shiftMonth(period, -1);
  return period;
}

export function roundTwo(value) {
  if (!Number.isFinite(value)) throw new Error("L3 derived value must be finite");
  const rounded = Number(value.toFixed(2));
  return Object.is(rounded, -0) ? 0 : rounded;
}

export function stockYoy(current, lag12) {
  if (current === null || lag12 === null) return null;
  if (!Number.isFinite(current) || !Number.isFinite(lag12) || current <= 0 || lag12 <= 0) throw new Error("L3 stock YoY requires positive finite stock values or null");
  return roundTwo((current / lag12 - 1) * 100);
}

export function validateMonthlySchedule(b3, requestedAsOf) {
  if (b3?.schemaVersion !== 1 || b3?.indicator?.id !== "B3" || b3.indicator.frequency !== "monthly") throw new Error("Invalid B3 monthly schedule identity");
  if (b3.requestedAsOf !== requestedAsOf) throw new Error("B3 schedule requestedAsOf does not match L3 request");
  if (!Array.isArray(b3.points) || b3.points.length !== 139) throw new Error("B3 monthly schedule must contain exactly 139 points");
  let previous = ""; const seen = new Set();
  for (const point of b3.points) {
    if (!validDate(point?.asOf) || seen.has(point.asOf) || point.asOf <= previous) throw new Error("B3 asOf values must be valid, unique and strictly ascending");
    seen.add(point.asOf); previous = point.asOf;
  }
  if (b3.points[0].asOf !== b3?.range?.startAsOf || b3.points.at(-1).asOf !== b3?.range?.endAsOf) throw new Error("B3 schedule range does not match its points");
  return b3;
}

function monthsBetween(start, end) {
  const months = [];
  for (let month = start; month <= end; month = shiftMonth(month, 1)) months.push(month);
  return months;
}

export function normalizeSfMonthRows(rows, startPeriod, endPeriod) {
  if (!Array.isArray(rows) || !rows.length) throw new Error("Tushare sf_month returned no rows");
  const seen = new Set();
  const normalized = rows.map(row => {
    const month = String(row?.month ?? "");
    if (!validMonth(month)) throw new Error(`Tushare sf_month contains invalid month ${month}`);
    if (month < startPeriod || month > endPeriod) throw new Error(`Tushare sf_month month ${month} is outside requested range`);
    if (seen.has(month)) throw new Error(`Tushare sf_month contains duplicate month ${month}`);
    seen.add(month);
    const result = { month };
    for (const field of ["inc_month", "inc_cumval"]) {
      const value = row?.[field];
      if (value === null || value === "" || !Number.isFinite(Number(value))) throw new Error(`Tushare sf_month contains invalid ${field} for ${month}`);
      result[field] = Number(value);
    }
    const stock = row?.stk_endval;
    if (stock === null) result.stk_endval = null;
    else {
      if (stock === "" || !Number.isFinite(Number(stock)) || Number(stock) <= 0) throw new Error(`Tushare sf_month contains invalid stk_endval for ${month}`);
      result.stk_endval = Number(stock);
    }
    return result;
  }).sort((a, b) => a.month.localeCompare(b.month));
  const expected = monthsBetween(startPeriod, endPeriod);
  if (normalized.length !== expected.length || normalized.some((row, index) => row.month !== expected[index])) throw new Error("Tushare sf_month response has missing or non-contiguous months");
  return normalized;
}

export function sourceSnapshotSha256(rows) {
  return createHash("sha256").update(JSON.stringify(rows)).digest("hex");
}

function observationFor(period, asOf, byMonth) {
  const row = byMonth.get(period); const lag = byMonth.get(shiftMonth(period, -12));
  if (!row || !lag) throw new Error(`Missing L3 value or 12-month lookback for selected period ${period}`);
  const releaseDate = conservativeReleaseDate(period);
  if (releaseDate > asOf) throw new Error(`L3 conservative releaseDate exceeds asOf for ${period}`);
  const stkYoyValue = stockYoy(row.stk_endval, lag.stk_endval); const missingFields = [];
  if (row.stk_endval === null) missingFields.push("stkEndval");
  if (stkYoyValue === null) missingFields.push("stkYoy");
  return {
    indicatorId: "L3", asOf, period, incMonth: row.inc_month, incCumval: row.inc_cumval, stkEndval: row.stk_endval, stkYoy: stkYoyValue,
    units: { incMonth: "100m_cny", incCumval: "100m_cny", stkEndval: "trillion_cny", stkYoy: "pct" }, source: "tushare", dataset: "sf_month",
    sourceFields: ["inc_month", "inc_cumval", "stk_endval"], derivedFields: { stkYoy: "(stkEndval / stkEndvalLag12 - 1) * 100" },
    missingFields, dataStatus: missingFields.length ? "partial" : "complete", releaseDate, releaseDateQuality: "conservative_proxy", pitScope: "release_lag_only", valueVintage: "latest_available_snapshot",
  };
}

export function assertNoSilentRevision(existing, normalizedRows) {
  if (!Array.isArray(existing?.sourceRows)) return;
  const previous = new Map(existing.sourceRows.map(row => [row?.month, row])); const incoming = new Map(normalizedRows.map(row => [row.month, row])); const changed = [];
  for (const month of new Set([...previous.keys(), ...incoming.keys()])) for (const field of ["inc_month", "inc_cumval", "stk_endval"]) if (previous.get(month)?.[field] !== incoming.get(month)?.[field]) changed.push(`${month}.${field}`);
  if (changed.length) throw new Error(`Tushare sf_month historical revision requires review: ${[...new Set(changed)].join(",")}`);
}

export function buildL3MonthlyHistory(b3, rows, requestedAsOf) {
  validateMonthlySchedule(b3, requestedAsOf);
  const startPeriod = selectedPeriodForAsOf(b3.points[0].asOf); const endPeriod = selectedPeriodForAsOf(b3.points.at(-1).asOf); const sourceStartPeriod = shiftMonth(startPeriod, -12);
  const normalized = normalizeSfMonthRows(rows, sourceStartPeriod, endPeriod); const byMonth = new Map(normalized.map(row => [row.month, row]));
  const points = b3.points.map(({ asOf }) => observationFor(selectedPeriodForAsOf(asOf), asOf, byMonth));
  const fieldCoverage = Object.fromEntries(["incMonth", "incCumval", "stkEndval", "stkYoy"].map(field => [field, { present: points.filter(point => point[field] !== null).length, required: points.length }]));
  return {
    schemaVersion: 1, generatedAt: `${requestedAsOf}T00:00:00.000Z`, requestedAsOf,
    historyStatus: "partial_field_coverage", scoreEligible: false, jointEligible: false, fieldCoverage,
    indicator: { id: "L3", name: "信用脉冲", frequency: "monthly", asOfRule: "latest_period_released_by_next_calendar_month_end" },
    range: { ...b3.range, startPeriod, endPeriod, sourceStartPeriod },
    source: { provider: "Tushare Pro", api: "sf_month", fields: ["inc_month", "inc_cumval", "stk_endval"], scheduleInput: INPUT, releaseDateQuality: "conservative_proxy", pitScope: "release_lag_only", valueVintage: "latest_available_snapshot" },
    sourceQuery: { api: "sf_month", startM: sourceStartPeriod, endM: endPeriod, fields: FIELDS.split(",") }, sourceSnapshotSha256: sourceSnapshotSha256(normalized), sourceRows: normalized, points,
  };
}

async function writeAtomically(target, value) {
  await mkdir(path.dirname(target), { recursive: true }); const temporary = `${target}.tmp-${process.pid}-${Date.now()}`;
  try { await writeFile(temporary, `${JSON.stringify(value, null, 2)}\n`, "utf8"); await rename(temporary, target); }
  catch (error) { await unlink(temporary).catch(() => {}); throw error; }
}

export async function main(argv = process.argv.slice(2)) {
  const requestedAsOf = parseAsOf(argv); const b3 = validateMonthlySchedule(JSON.parse(await readFile(path.resolve(INPUT), "utf8")), requestedAsOf);
  const startPeriod = selectedPeriodForAsOf(b3.points[0].asOf); const endPeriod = selectedPeriodForAsOf(b3.points.at(-1).asOf); const sourceStartPeriod = shiftMonth(startPeriod, -12);
  const token = process.env.TUSHARE_TOKEN; if (!token) throw new Error("TUSHARE_TOKEN is required");
  const rows = normalizeSfMonthRows(await callTushare("sf_month", { start_m: sourceStartPeriod, end_m: endPeriod }, FIELDS, token), sourceStartPeriod, endPeriod);
  const target = path.resolve(OUTPUT); let existing = null;
  try { existing = JSON.parse(await readFile(target, "utf8")); } catch (error) { if (error?.code !== "ENOENT") throw error; }
  assertNoSilentRevision(existing, rows); const l3 = buildL3MonthlyHistory(b3, rows, requestedAsOf); await writeAtomically(target, l3);
  console.log(`Generated ${OUTPUT}: ${l3.points.length} monthly L3 conservative-PIT points (${startPeriod} to ${endPeriod}); sf_month rows: ${rows.length}`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) main().catch(error => { console.error(error instanceof Error ? error.message : String(error)); process.exitCode = 1; });
