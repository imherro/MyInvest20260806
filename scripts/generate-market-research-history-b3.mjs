import { mkdir, rename, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { callTushare, MARKET_INDEX_INSTRUMENTS, parseAsOf } from "./generate-market-research-current.mjs";

const START_DATE = "20150101";
const START_AS_OF = "2015-01-31";
const FIELDS = "ts_code,trade_date,pe_ttm,pb";
const compactDate = value => value.replaceAll("-", "");
const displayDate = value => `${value.slice(0, 4)}-${value.slice(4, 6)}-${value.slice(6, 8)}`;
const daysInMonth = (year, month) => new Date(Date.UTC(year, month, 0)).getUTCDate();
const monthEnd = (year, month) => `${year}-${String(month).padStart(2, "0")}-${String(daysInMonth(year, month)).padStart(2, "0")}`;

export function historyEndOnOrBefore(requestedAsOf) {
  const year = Number(requestedAsOf.slice(0, 4));
  const month = Number(requestedAsOf.slice(5, 7));
  const currentEnd = monthEnd(year, month);
  if (requestedAsOf >= currentEnd) return currentEnd;
  return month === 1 ? monthEnd(year - 1, 12) : monthEnd(year, month - 1);
}

export function monthlyAsOfs(startAsOf, endAsOf) {
  const values = [];
  let year = Number(startAsOf.slice(0, 4));
  let month = Number(startAsOf.slice(5, 7));
  while (`${year}-${String(month).padStart(2, "0")}` <= endAsOf.slice(0, 7)) {
    values.push(monthEnd(year, month));
    month += 1;
    if (month === 13) { year += 1; month = 1; }
  }
  if (values[0] !== startAsOf || values.at(-1) !== endAsOf) throw new Error("B3 history range must use complete calendar month ends");
  return values;
}

export function buildB3MonthlyHistory(rowsByCode, requestedAsOf, generatedAt = new Date().toISOString()) {
  const historyEnd = historyEndOnOrBefore(requestedAsOf);
  const compactEnd = compactDate(historyEnd);
  const validated = {};
  for (const instrument of MARKET_INDEX_INSTRUMENTS) {
    const rows = rowsByCode[instrument.code];
    if (!Array.isArray(rows) || !rows.length) throw new Error(`Tushare index_dailybasic returned no history rows for ${instrument.code}`);
    if (rows.length >= 3000) throw new Error(`Tushare index_dailybasic reached the 3000-row limit for ${instrument.code}`);
    const byDate = new Map();
    for (const row of rows) {
      if (row?.ts_code !== instrument.code) throw new Error(`Tushare index_dailybasic contains unexpected ts_code for ${instrument.code}`);
      const date = String(row.trade_date ?? "");
      const shown = /^\d{8}$/.test(date) ? displayDate(date) : "";
      const parsed = shown ? new Date(`${shown}T00:00:00Z`) : new Date(Number.NaN);
      if (!shown || Number.isNaN(parsed.valueOf()) || parsed.toISOString().slice(0, 10) !== shown) throw new Error(`Tushare index_dailybasic contains invalid trade_date for ${instrument.code}`);
      if (date < START_DATE || date > compactEnd) throw new Error(`Tushare index_dailybasic trade_date is outside requested history range for ${instrument.code}`);
      if (byDate.has(date)) throw new Error(`Tushare index_dailybasic contains duplicate trade_date ${date} for ${instrument.code}`);
      byDate.set(date, row);
    }
    validated[instrument.code] = byDate;
  }
  const points = monthlyAsOfs(START_AS_OF, historyEnd).map(asOf => {
    const prefix = compactDate(asOf).slice(0, 6);
    const commonDates = [...validated[MARKET_INDEX_INSTRUMENTS[0].code].keys()]
      .filter(date => date.startsWith(prefix) && date <= compactDate(asOf) && validated[MARKET_INDEX_INSTRUMENTS[1].code].has(date)).sort().reverse();
    const period = commonDates[0];
    if (!period) throw new Error(`No common B3 trade date found within ${asOf.slice(0, 7)}`);
    const values = Object.fromEntries(MARKET_INDEX_INSTRUMENTS.map(instrument => {
      const row = validated[instrument.code].get(period);
      const finite = (value, label) => {
        const number = value === null || value === undefined || value === "" ? Number.NaN : Number(value);
        if (!Number.isFinite(number)) throw new Error(`Invalid ${label} for ${instrument.code} on ${period}`);
        return number;
      };
      return [instrument.code, { peTtm: finite(row.pe_ttm, "pe_ttm"), pb: finite(row.pb, "pb") }];
    }));
    const periodDate = displayDate(period);
    return { asOf, periodDate, releaseDate: periodDate, revisionStatus: "not_tracked", values };
  });
  return {
    schemaVersion: 1, generatedAt, requestedAsOf,
    indicator: { id: "B3", name: "PE/PB与估值分化", frequency: "monthly", asOfRule: "calendar_month_end_eod" },
    range: { startAsOf: START_AS_OF, endAsOf: historyEnd },
    source: { provider: "Tushare Pro", api: "index_dailybasic", fields: FIELDS.split(","), instruments: MARKET_INDEX_INSTRUMENTS.map(({ code, name }) => ({ code, name })) },
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
  const token = process.env.TUSHARE_TOKEN;
  if (!token) throw new Error("TUSHARE_TOKEN is required");
  const requestedAsOf = parseAsOf(argv);
  const historyEnd = historyEndOnOrBefore(requestedAsOf);
  const rows = await Promise.all(MARKET_INDEX_INSTRUMENTS.map(async instrument => [instrument.code, await callTushare("index_dailybasic", { ts_code: instrument.code, start_date: START_DATE, end_date: compactDate(historyEnd) }, FIELDS, token)]));
  const history = buildB3MonthlyHistory(Object.fromEntries(rows), requestedAsOf);
  const target = path.resolve("public/data/market-research/history/b3.json");
  await writeAtomically(target, history);
  console.log(`Generated ${path.relative(process.cwd(), target)}: ${history.points.length} monthly B3 PIT points (${history.range.startAsOf} to ${history.range.endAsOf})`);
  for (const instrument of MARKET_INDEX_INSTRUMENTS) console.log(`${instrument.code}: ${Object.fromEntries(rows)[instrument.code].length} API rows`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) main().catch(error => { console.error(error instanceof Error ? error.message : String(error)); process.exitCode = 1; });
