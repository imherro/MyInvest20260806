import { createHash } from "node:crypto";
import { mkdir, readFile, rename, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { callTushare, parseAsOf } from "./generate-market-research-current.mjs";

const INPUT = "public/data/market-research/history/b3.json";
const OUTPUT = "public/data/market-research/history/l2.json";
const FIELDS = "month,m1_yoy";

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

export function validateMonthlySchedule(b3, requestedAsOf) {
  if (b3?.schemaVersion !== 1 || b3?.indicator?.id !== "B3" || b3.indicator.frequency !== "monthly") throw new Error("Invalid B3 monthly schedule identity");
  if (b3.requestedAsOf !== requestedAsOf) throw new Error("B3 schedule requestedAsOf does not match L2 request");
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

export function normalizeCnMRows(rows, startPeriod, endPeriod) {
  if (!Array.isArray(rows) || !rows.length) throw new Error("Tushare cn_m returned no rows");
  const seen = new Set();
  const normalized = rows.map(row => {
    const month = String(row?.month ?? "");
    if (!validMonth(month)) throw new Error(`Tushare cn_m contains invalid month ${month}`);
    if (month < startPeriod || month > endPeriod) throw new Error(`Tushare cn_m month ${month} is outside requested range`);
    if (seen.has(month)) throw new Error(`Tushare cn_m contains duplicate month ${month}`);
    seen.add(month);
    if (row?.m1_yoy === null || row?.m1_yoy === "" || !Number.isFinite(Number(row?.m1_yoy))) throw new Error(`Tushare cn_m contains invalid m1_yoy for ${month}`);
    return { month, m1_yoy: Number(row.m1_yoy) };
  }).sort((a, b) => a.month.localeCompare(b.month));
  const expected = monthsBetween(startPeriod, endPeriod);
  if (normalized.length !== expected.length || normalized.some((row, index) => row.month !== expected[index])) throw new Error("Tushare cn_m response has missing or non-contiguous months");
  return normalized;
}

export function sourceSnapshotSha256(rows) {
  return createHash("sha256").update(JSON.stringify(rows)).digest("hex");
}

export function assertNoSilentRevision(existing, normalizedRows) {
  if (!existing?.points) return;
  const incoming = new Map(normalizedRows.map(row => [row.month, row.m1_yoy]));
  const changed = [];
  for (const point of existing.points) {
    if (point?.source === "tushare" && point.dataset === "cn_m" && point.sourceField === "m1_yoy" && incoming.has(point.period) && point.value !== incoming.get(point.period)) changed.push(point.period);
  }
  if (changed.length) throw new Error(`Tushare cn_m historical revision requires review: ${[...new Set(changed)].join(",")}`);
}

export function buildL2MonthlyHistory(b3, rows, requestedAsOf) {
  validateMonthlySchedule(b3, requestedAsOf);
  const startPeriod = selectedPeriodForAsOf(b3.points[0].asOf);
  const endPeriod = selectedPeriodForAsOf(b3.points.at(-1).asOf);
  const normalized = normalizeCnMRows(rows, startPeriod, endPeriod);
  const byMonth = new Map(normalized.map(row => [row.month, row]));
  const points = b3.points.map(({ asOf }) => {
    const period = selectedPeriodForAsOf(asOf);
    const row = byMonth.get(period);
    if (!row) throw new Error(`Missing L2 value for selected period ${period}`);
    const releaseDate = conservativeReleaseDate(period);
    if (releaseDate > asOf) throw new Error(`L2 conservative releaseDate exceeds asOf for ${period}`);
    return { indicatorId: "L2", asOf, period, value: row.m1_yoy, unit: "pct", source: "tushare", dataset: "cn_m", sourceField: "m1_yoy", releaseDate, releaseDateQuality: "conservative_proxy", pitScope: "release_lag_only", valueVintage: "latest_available_snapshot" };
  });
  return {
    schemaVersion: 1,
    generatedAt: `${requestedAsOf}T00:00:00.000Z`,
    requestedAsOf,
    indicator: { id: "L2", name: "中国M1同比增速", frequency: "monthly", asOfRule: "latest_period_released_by_next_calendar_month_end" },
    range: { ...b3.range, startPeriod, endPeriod },
    source: { provider: "Tushare Pro", api: "cn_m", field: "m1_yoy", scheduleInput: INPUT, releaseDateQuality: "conservative_proxy", pitScope: "release_lag_only", valueVintage: "latest_available_snapshot" },
    sourceQuery: { api: "cn_m", startM: startPeriod, endM: endPeriod, fields: FIELDS.split(",") },
    sourceSnapshotSha256: sourceSnapshotSha256(normalized),
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
  const startPeriod = selectedPeriodForAsOf(b3.points[0].asOf);
  const endPeriod = selectedPeriodForAsOf(b3.points.at(-1).asOf);
  const token = process.env.TUSHARE_TOKEN;
  if (!token) throw new Error("TUSHARE_TOKEN is required");
  const rows = normalizeCnMRows(await callTushare("cn_m", { start_m: startPeriod, end_m: endPeriod }, FIELDS, token), startPeriod, endPeriod);
  const target = path.resolve(OUTPUT);
  let existing = null;
  try { existing = JSON.parse(await readFile(target, "utf8")); } catch (error) { if (error?.code !== "ENOENT") throw error; }
  assertNoSilentRevision(existing, rows);
  const l2 = buildL2MonthlyHistory(b3, rows, requestedAsOf);
  await writeAtomically(target, l2);
  console.log(`Generated ${OUTPUT}: ${l2.points.length} monthly L2 conservative-PIT points (${startPeriod} to ${endPeriod}); cn_m rows: ${rows.length}`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) main().catch(error => { console.error(error instanceof Error ? error.message : String(error)); process.exitCode = 1; });
