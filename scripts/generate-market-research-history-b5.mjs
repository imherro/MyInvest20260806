import { mkdir, readFile, rename, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { callTushare, MARKET_INDEX_INSTRUMENTS, parseAsOf } from "./generate-market-research-current.mjs";

const INPUT = "public/data/market-research/history/b3.json";
const OUTPUT = "public/data/market-research/history/b5.json";
const START_DATE = "20150101";
const FIELDS = "ts_code,trade_date,turnover_rate,turnover_rate_f";
const compactDate = value => value.replaceAll("-", "");
const displayDate = value => `${value.slice(0, 4)}-${value.slice(4, 6)}-${value.slice(6, 8)}`;

export function validateB3Schedule(b3, requestedAsOf) {
  if (b3?.schemaVersion !== 1 || b3?.indicator?.id !== "B3" || b3.indicator.frequency !== "monthly") throw new Error("Invalid B3 history identity");
  if (b3.requestedAsOf !== requestedAsOf) throw new Error("B3 history requestedAsOf does not match B5 request");
  if (!b3?.range?.startAsOf || !b3?.range?.endAsOf || !Array.isArray(b3.points) || !b3.points.length) throw new Error("Invalid B3 history range or points");
  let previousAsOf = "";
  const seen = new Set();
  for (const point of b3.points) {
    if (!point?.asOf || seen.has(point.asOf) || point.asOf <= previousAsOf) throw new Error("B3 history asOf values must be unique and strictly ascending");
    seen.add(point.asOf); previousAsOf = point.asOf;
    if (!point.periodDate || point.releaseDate !== point.periodDate || point.releaseDate > point.asOf || point.periodDate.slice(0, 7) !== point.asOf.slice(0, 7)) throw new Error(`Invalid B3 PIT dates at ${point.asOf}`);
    if (point.revisionStatus !== "not_tracked") throw new Error(`Invalid B3 revisionStatus at ${point.asOf}`);
  }
  if (b3.points[0].asOf !== b3.range.startAsOf || b3.points.at(-1).asOf !== b3.range.endAsOf) throw new Error("B3 history range does not match its points");
  return b3;
}

export function buildB5MonthlyHistory(b3, rowsByCode, requestedAsOf, generatedAt = new Date().toISOString()) {
  validateB3Schedule(b3, requestedAsOf);
  const compactEnd = compactDate(b3.range.endAsOf);
  const validated = {};
  for (const instrument of MARKET_INDEX_INSTRUMENTS) {
    const rows = rowsByCode[instrument.code];
    if (!Array.isArray(rows) || !rows.length) throw new Error(`Tushare index_dailybasic returned no B5 history rows for ${instrument.code}`);
    if (rows.length >= 3000) throw new Error(`Tushare index_dailybasic reached the 3000-row limit for ${instrument.code}`);
    const byDate = new Map();
    for (const row of rows) {
      if (row?.ts_code !== instrument.code) throw new Error(`Tushare index_dailybasic contains unexpected ts_code for ${instrument.code}`);
      const date = String(row.trade_date ?? "");
      const shown = /^\d{8}$/.test(date) ? displayDate(date) : "";
      const parsed = shown ? new Date(`${shown}T00:00:00Z`) : new Date(Number.NaN);
      if (!shown || Number.isNaN(parsed.valueOf()) || parsed.toISOString().slice(0, 10) !== shown) throw new Error(`Tushare index_dailybasic contains invalid trade_date for ${instrument.code}`);
      if (date < START_DATE || date > compactEnd) throw new Error(`Tushare index_dailybasic trade_date is outside B5 history range for ${instrument.code}`);
      if (byDate.has(date)) throw new Error(`Tushare index_dailybasic contains duplicate trade_date ${date} for ${instrument.code}`);
      byDate.set(date, row);
    }
    validated[instrument.code] = byDate;
  }

  const points = b3.points.map(point => {
    const expectedTradeDate = compactDate(point.periodDate);
    const values = Object.fromEntries(MARKET_INDEX_INSTRUMENTS.map(instrument => {
      const row = validated[instrument.code].get(expectedTradeDate);
      if (!row) throw new Error(`Missing B5 record for ${instrument.code} on B3 date ${expectedTradeDate}; fallback is forbidden`);
      const finiteNonNegative = (value, label) => {
        const number = value === null || value === undefined || value === "" ? Number.NaN : Number(value);
        if (!Number.isFinite(number) || number < 0) throw new Error(`Invalid ${label} for ${instrument.code} on ${expectedTradeDate}`);
        return number;
      };
      return [instrument.code, { turnoverRate: finiteNonNegative(row.turnover_rate, "turnover_rate"), turnoverRateF: finiteNonNegative(row.turnover_rate_f, "turnover_rate_f") }];
    }));
    const denominator = values["000300.SH"].turnoverRateF;
    if (denominator === 0) throw new Error(`CSI300 turnover_rate_f must be positive on ${expectedTradeDate}`);
    const relativeFreeTurnover = values["399006.SZ"].turnoverRateF / denominator;
    if (!Number.isFinite(relativeFreeTurnover) || relativeFreeTurnover < 0) throw new Error(`Invalid relativeFreeTurnover on ${expectedTradeDate}`);
    return { asOf: point.asOf, periodDate: point.periodDate, releaseDate: point.releaseDate, revisionStatus: point.revisionStatus, values, relativeFreeTurnover };
  });

  return {
    schemaVersion: 1, generatedAt, requestedAsOf,
    indicator: { id: "B5", name: "投机热度", frequency: "monthly", asOfRule: "aligned_to_b3_monthly_eod" },
    range: { ...b3.range },
    source: { provider: "Tushare Pro", api: "index_dailybasic", fields: FIELDS.split(","), dateScheduleInput: INPUT, instruments: MARKET_INDEX_INSTRUMENTS.map(({ code, name }) => ({ code, name })) },
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
  const b3 = validateB3Schedule(JSON.parse(await readFile(path.resolve(INPUT), "utf8")), requestedAsOf);
  const token = process.env.TUSHARE_TOKEN;
  if (!token) throw new Error("TUSHARE_TOKEN is required");
  const rows = await Promise.all(MARKET_INDEX_INSTRUMENTS.map(async instrument => [instrument.code, await callTushare("index_dailybasic", { ts_code: instrument.code, start_date: START_DATE, end_date: compactDate(b3.range.endAsOf) }, FIELDS, token)]));
  const rowsByCode = Object.fromEntries(rows);
  const b5 = buildB5MonthlyHistory(b3, rowsByCode, requestedAsOf);
  await writeAtomically(path.resolve(OUTPUT), b5);
  console.log(`Generated ${OUTPUT}: ${b5.points.length} monthly B5 PIT points (${b5.range.startAsOf} to ${b5.range.endAsOf}); network requests: 2`);
  for (const instrument of MARKET_INDEX_INSTRUMENTS) console.log(`${instrument.code}: ${rowsByCode[instrument.code].length} API rows`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) main().catch(error => { console.error(error instanceof Error ? error.message : String(error)); process.exitCode = 1; });
