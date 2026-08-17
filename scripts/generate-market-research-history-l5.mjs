import { mkdir, readFile, rename, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { callTushare, parseAsOf, selectLatestUsRealYieldSnapshot } from "./generate-market-research-current.mjs";

const INPUT = "public/data/market-research/history/b3.json";
const OUTPUT = "public/data/market-research/history/l5.json";
const FIELDS = "date,y10";
const compactDate = value => value.replaceAll("-", "");
const displayDate = value => `${value.slice(0, 4)}-${value.slice(4, 6)}-${value.slice(6, 8)}`;

export function validateMonthlySchedule(b3, requestedAsOf) {
  if (b3?.schemaVersion !== 1 || b3?.indicator?.id !== "B3" || b3.indicator.frequency !== "monthly") throw new Error("Invalid B3 monthly schedule identity");
  if (b3.requestedAsOf !== requestedAsOf) throw new Error("B3 schedule requestedAsOf does not match L5 request");
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

export function validateUsRealYieldYearBatch(rows, year, startDate, endDate) {
  if (!Array.isArray(rows) || !rows.length) throw new Error(`Tushare us_trycr returned no rows for ${year}`);
  if (rows.length >= 2000) throw new Error(`Tushare us_trycr reached the 2000-row limit for ${year}`);
  const seen = new Set();
  for (const row of rows) {
    const date = String(row?.date ?? "");
    const shown = /^\d{8}$/.test(date) ? displayDate(date) : "";
    const parsed = shown ? new Date(`${shown}T00:00:00Z`) : new Date(Number.NaN);
    if (!shown || Number.isNaN(parsed.valueOf()) || parsed.toISOString().slice(0, 10) !== shown) throw new Error(`Tushare us_trycr contains invalid date for ${year}`);
    if (date < startDate || date > endDate) throw new Error(`Tushare us_trycr date is outside ${year} request range`);
    if (seen.has(date)) throw new Error(`Tushare us_trycr contains duplicate date ${date}`);
    seen.add(date);
  }
  return rows;
}

export function buildL5MonthlyHistory(b3, rowsByYear, requestedAsOf, generatedAt = new Date().toISOString()) {
  validateMonthlySchedule(b3, requestedAsOf);
  const points = b3.points.map(({ asOf }) => {
    const rows = rowsByYear.get(asOf.slice(0, 4));
    if (!rows) throw new Error(`Missing L5 US real-yield year batch for ${asOf.slice(0, 4)}`);
    const snapshot = selectLatestUsRealYieldSnapshot(rows, asOf);
    if (snapshot.date >= asOf) throw new Error(`Invalid L5 releaseDate at ${asOf}`);
    return { asOf, periodDate: snapshot.date, releaseDate: snapshot.date, revisionStatus: "not_tracked", realYield10Y: snapshot.y10 };
  });
  return {
    schemaVersion: 1, generatedAt, requestedAsOf,
    indicator: { id: "L5", name: "外部金融条件", frequency: "monthly", asOfRule: "latest_us_real_yield_strictly_before_china_monthly_eod" },
    range: { ...b3.range },
    source: { provider: "Tushare Pro", api: "us_trycr", fields: FIELDS.split(","), scheduleInput: INPUT, requestPolicy: "one_calendar_year_per_request", crossTimeZonePolicy: "source_date_strictly_before_china_as_of" },
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
  const firstYear = Number(b3.range.startAsOf.slice(0, 4));
  const lastYear = Number(b3.range.endAsOf.slice(0, 4));
  const years = Array.from({ length: lastYear - firstYear + 1 }, (_, index) => String(firstYear + index));
  const token = process.env.TUSHARE_TOKEN;
  if (!token) throw new Error("TUSHARE_TOKEN is required");
  const rowsByYear = new Map();
  for (const year of years) {
    const startDate = `${year}0101`;
    const endDate = year === String(lastYear) ? compactDate(b3.range.endAsOf) : `${year}1231`;
    rowsByYear.set(year, validateUsRealYieldYearBatch(await callTushare("us_trycr", { start_date: startDate, end_date: endDate }, FIELDS, token), year, startDate, endDate));
  }
  const l5 = buildL5MonthlyHistory(b3, rowsByYear, requestedAsOf);
  await writeAtomically(path.resolve(OUTPUT), l5);
  console.log(`Generated ${OUTPUT}: ${l5.points.length} monthly L5 PIT points (${l5.range.startAsOf} to ${l5.range.endAsOf}); us_trycr requests: ${years.length}`);
  for (const year of years) console.log(`${year}: ${rowsByYear.get(year).length} API rows`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) main().catch(error => { console.error(error instanceof Error ? error.message : String(error)); process.exitCode = 1; });
