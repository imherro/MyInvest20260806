import { mkdir, readFile, rename, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { callTushare, parseAsOf, selectLatestShiborSnapshot } from "./generate-market-research-current.mjs";

const INPUT = "public/data/market-research/history/b3.json";
const OUTPUT = "public/data/market-research/history/l1.json";
const FIELDS = "date,on,1w,3m,1y";
const compactDate = value => value.replaceAll("-", "");
const displayDate = value => `${value.slice(0, 4)}-${value.slice(4, 6)}-${value.slice(6, 8)}`;

export function validateMonthlySchedule(b3, requestedAsOf) {
  if (b3?.schemaVersion !== 1 || b3?.indicator?.id !== "B3" || b3.indicator.frequency !== "monthly") throw new Error("Invalid B3 monthly schedule identity");
  if (b3.requestedAsOf !== requestedAsOf) throw new Error("B3 schedule requestedAsOf does not match L1 request");
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

export function validateShiborYearBatch(rows, year, startDate, endDate) {
  if (!Array.isArray(rows) || !rows.length) throw new Error(`Tushare shibor returned no rows for ${year}`);
  if (rows.length >= 2000) throw new Error(`Tushare shibor reached the 2000-row limit for ${year}`);
  const seen = new Set();
  for (const row of rows) {
    const date = String(row?.date ?? "");
    const shown = /^\d{8}$/.test(date) ? displayDate(date) : "";
    const parsed = shown ? new Date(`${shown}T00:00:00Z`) : new Date(Number.NaN);
    if (!shown || Number.isNaN(parsed.valueOf()) || parsed.toISOString().slice(0, 10) !== shown) throw new Error(`Tushare shibor contains invalid date for ${year}`);
    if (date < startDate || date > endDate) throw new Error(`Tushare shibor date is outside ${year} request range`);
    if (seen.has(date)) throw new Error(`Tushare shibor contains duplicate date ${date}`);
    seen.add(date);
  }
  return rows;
}

export function buildL1MonthlyHistory(b3, rowsByYear, requestedAsOf, generatedAt = new Date().toISOString()) {
  validateMonthlySchedule(b3, requestedAsOf);
  const points = b3.points.map(({ asOf }) => {
    const rows = rowsByYear.get(asOf.slice(0, 4));
    if (!rows) throw new Error(`Missing L1 SHIBOR year batch for ${asOf.slice(0, 4)}`);
    const snapshot = selectLatestShiborSnapshot(rows, asOf);
    if (snapshot.date > asOf) throw new Error(`Invalid L1 releaseDate at ${asOf}`);
    return { asOf, periodDate: snapshot.date, releaseDate: snapshot.date, revisionStatus: "not_tracked", overnight: snapshot.overnight, oneWeek: snapshot.oneWeek, threeMonth: snapshot.threeMonth, oneYear: snapshot.oneYear, termSpread: snapshot.termSpread };
  });
  return {
    schemaVersion: 1, generatedAt, requestedAsOf,
    indicator: { id: "L1", name: "利率与实际利率", frequency: "monthly", asOfRule: "latest_shibor_on_or_before_monthly_eod" },
    range: { ...b3.range },
    source: { provider: "Tushare Pro", api: "shibor", fields: FIELDS.split(","), scheduleInput: INPUT, requestPolicy: "one_calendar_year_per_request" },
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
    rowsByYear.set(year, validateShiborYearBatch(await callTushare("shibor", { start_date: startDate, end_date: endDate }, FIELDS, token), year, startDate, endDate));
  }
  const l1 = buildL1MonthlyHistory(b3, rowsByYear, requestedAsOf);
  await writeAtomically(path.resolve(OUTPUT), l1);
  console.log(`Generated ${OUTPUT}: ${l1.points.length} monthly L1 PIT points (${l1.range.startAsOf} to ${l1.range.endAsOf}); shibor requests: ${years.length}`);
  for (const year of years) console.log(`${year}: ${rowsByYear.get(year).length} API rows`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) main().catch(error => { console.error(error instanceof Error ? error.message : String(error)); process.exitCode = 1; });
