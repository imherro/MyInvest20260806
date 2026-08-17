import { mkdir, readFile, rename, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { callTushare, parseAsOf } from "./generate-market-research-current.mjs";

const INPUT = "public/data/market-research/history/b3.json";
const OUTPUT = "public/data/market-research/history/f4.json";
const INDEX_CODE = "000300.SH";
const INDEX_START_DATE = "20150101";
const BASIC_FIELDS = "ts_code,index_code,list_date,list_status";
const SIZE_FIELDS = "trade_date,ts_code,total_size";
const compactDate = value => value.replaceAll("-", "");
const displayDate = value => `${value.slice(0, 4)}-${value.slice(4, 6)}-${value.slice(6, 8)}`;
const validCompactDate = value => {
  const text = String(value ?? "");
  const shown = /^\d{8}$/.test(text) ? displayDate(text) : "";
  const parsed = shown ? new Date(`${shown}T00:00:00Z`) : new Date(Number.NaN);
  return Boolean(shown) && !Number.isNaN(parsed.valueOf()) && parsed.toISOString().slice(0, 10) === shown;
};
const addCalendarDay = value => new Date(new Date(`${value}T00:00:00Z`).valueOf() + 86400000).toISOString().slice(0, 10);

export function validateMonthlySchedule(b3, requestedAsOf) {
  if (b3?.schemaVersion !== 1 || b3?.indicator?.id !== "B3" || b3.indicator.frequency !== "monthly") throw new Error("Invalid B3 monthly schedule identity");
  if (b3.requestedAsOf !== requestedAsOf) throw new Error("B3 schedule requestedAsOf does not match F4 request");
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

export function validateIndexDateRows(rows, endDate) {
  if (!Array.isArray(rows) || !rows.length) throw new Error("Tushare index_dailybasic returned no index dates");
  if (rows.length >= 3000) throw new Error("Tushare index_dailybasic reached the 3000-row limit");
  const seen = new Set();
  for (const row of rows) {
    const date = String(row?.trade_date ?? "");
    if (!validCompactDate(date)) throw new Error("Tushare index_dailybasic contains invalid trade_date");
    if (date < INDEX_START_DATE || date > endDate) throw new Error("Tushare index_dailybasic trade_date is outside request range");
    if (seen.has(date)) throw new Error(`Tushare index_dailybasic contains duplicate trade_date ${date}`);
    seen.add(date);
  }
  return rows;
}

export function buildCandidateBasics(rowsByStatus) {
  const candidates = new Map();
  for (const listStatus of ["L", "D"]) {
    const rows = rowsByStatus.get(listStatus);
    if (!Array.isArray(rows) || rows.length >= 5000) throw new Error(`Tushare etf_basic ${listStatus} batch is invalid or reached the 5000-row limit`);
    for (const row of rows) {
      if (row?.index_code !== INDEX_CODE || row?.list_status !== listStatus) throw new Error(`Tushare etf_basic ${listStatus} batch contains wrong index_code or list_status`);
      const code = typeof row.ts_code === "string" ? row.ts_code.trim() : "";
      if (!code) throw new Error("Tushare etf_basic contains an empty ts_code");
      if (candidates.has(code)) throw new Error(`Tushare etf_basic contains duplicate ts_code ${code}`);
      if (!validCompactDate(row.list_date)) throw new Error(`Tushare etf_basic contains invalid list_date for ${code}`);
      candidates.set(code, { tsCode: code, listDate: row.list_date, listStatus });
    }
  }
  if (!candidates.size) throw new Error("Tushare etf_basic returned no L or D CSI300 ETFs");
  return candidates;
}

export function validateShareDateBatch(rows, tradeDate) {
  if (!Array.isArray(rows) || !rows.length) throw new Error(`Tushare etf_share_size returned no rows for ${tradeDate}`);
  if (rows.length >= 5000) throw new Error(`Tushare etf_share_size reached the 5000-row limit for ${tradeDate}`);
  const seen = new Set();
  for (const row of rows) {
    if (String(row?.trade_date ?? "") !== tradeDate) throw new Error(`Tushare etf_share_size contains a row outside ${tradeDate}`);
    const code = typeof row.ts_code === "string" ? row.ts_code.trim() : "";
    if (!code) throw new Error(`Tushare etf_share_size contains an empty ts_code for ${tradeDate}`);
    if (seen.has(code)) throw new Error(`Tushare etf_share_size contains duplicate ts_code ${code} for ${tradeDate}`);
    seen.add(code);
  }
  return rows;
}

export function buildF4MonthlyHistory(b3, indexRows, candidateBasics, sharesByDate, requestedAsOf, generatedAt = new Date().toISOString()) {
  validateMonthlySchedule(b3, requestedAsOf);
  validateIndexDateRows(indexRows, compactDate(b3.range.endAsOf));
  if (!(candidateBasics instanceof Map) || !candidateBasics.size) throw new Error("Invalid F4 ETF candidate map");
  const indexDates = indexRows.map(row => row.trade_date).sort();
  const priorTradeDates = b3.points.map(({ asOf }) => indexDates.filter(date => date < compactDate(asOf)).at(-1));
  if (priorTradeDates.some(date => !date) || new Set(priorTradeDates).size !== priorTradeDates.length) throw new Error("F4 monthly schedule must map to unique prior index trade dates");
  const points = b3.points.map(({ asOf }, index) => {
    const tradeDate = priorTradeDates[index];
    const rows = validateShareDateBatch(sharesByDate.get(tradeDate), tradeDate);
    let observedCount = 0;
    let totalSizeWan = 0;
    for (const row of rows) {
      const basic = candidateBasics.get(row.ts_code);
      if (!basic) continue;
      if (tradeDate < basic.listDate) throw new Error(`ETF share row predates list_date for ${row.ts_code}`);
      const value = row.total_size;
      if (value === null || value === undefined || value === "") continue;
      const size = Number(value);
      if (!Number.isFinite(size) || size < 0) throw new Error(`Tushare etf_share_size contains invalid total_size for ${row.ts_code}`);
      observedCount += 1; totalSizeWan += size;
    }
    if (!Number.isInteger(observedCount) || observedCount <= 0 || !Number.isFinite(totalSizeWan) || totalSizeWan <= 0) throw new Error(`Tushare etf_share_size contains no positive observed CSI300 ETF pool for ${tradeDate}`);
    const periodDate = displayDate(tradeDate);
    const releaseDate = addCalendarDay(periodDate);
    if (periodDate >= asOf || releaseDate > asOf) throw new Error(`Invalid F4 PIT dates at ${asOf}`);
    return { asOf, periodDate, releaseDate, revisionStatus: "not_tracked", observedCount, totalSizeWan, totalSizeTrillion: totalSizeWan / 100000000 };
  });
  return {
    schemaVersion: 1, generatedAt, requestedAsOf,
    indicator: { id: "F4", name: "长期资金", frequency: "monthly", asOfRule: "prior_trade_date_etf_size_available_by_monthly_eod" },
    range: { ...b3.range },
    source: { provider: "Tushare Pro", scheduleInput: INPUT, indexCode: INDEX_CODE, classificationStatuses: ["L", "D"], classificationApi: "etf_basic", classificationFields: BASIC_FIELDS.split(","), priorDateApi: "index_dailybasic", priorDateFields: ["trade_date"], sizeApi: "etf_share_size", sizeFields: SIZE_FIELDS.split(","), releasePolicy: "trade_date_plus_one_calendar_day", classificationPolicy: "current_etf_basic_metadata_L_plus_D" },
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
  const token = process.env.TUSHARE_TOKEN;
  if (!token) throw new Error("TUSHARE_TOKEN is required");
  const rowsByStatus = new Map();
  for (const listStatus of ["L", "D"]) rowsByStatus.set(listStatus, await callTushare("etf_basic", { index_code: INDEX_CODE, list_status: listStatus }, BASIC_FIELDS, token));
  const candidateBasics = buildCandidateBasics(rowsByStatus);
  const endDate = compactDate(b3.range.endAsOf);
  const indexRows = validateIndexDateRows(await callTushare("index_dailybasic", { ts_code: INDEX_CODE, start_date: INDEX_START_DATE, end_date: endDate }, "trade_date", token), endDate);
  const indexDates = indexRows.map(row => row.trade_date).sort();
  const priorTradeDates = b3.points.map(({ asOf }) => indexDates.filter(date => date < compactDate(asOf)).at(-1));
  if (priorTradeDates.some(date => !date) || new Set(priorTradeDates).size !== priorTradeDates.length) throw new Error("F4 monthly schedule must map to unique prior index trade dates");
  const sharesByDate = new Map();
  for (const tradeDate of priorTradeDates) sharesByDate.set(tradeDate, validateShareDateBatch(await callTushare("etf_share_size", { trade_date: tradeDate }, SIZE_FIELDS, token), tradeDate));
  const f4 = buildF4MonthlyHistory(b3, indexRows, candidateBasics, sharesByDate, requestedAsOf);
  await writeAtomically(path.resolve(OUTPUT), f4);
  console.log(`Generated ${OUTPUT}: ${f4.points.length} monthly F4 PIT points (${f4.range.startAsOf} to ${f4.range.endAsOf}); total requests: ${priorTradeDates.length + 3}`);
  console.log(`ETF candidates: L=${rowsByStatus.get("L").length}, D=${rowsByStatus.get("D").length}, union=${candidateBasics.size}; index rows=${indexRows.length}`);
  console.log(`etf_share_size rows per date: min=${Math.min(...priorTradeDates.map(date => sharesByDate.get(date).length))}, max=${Math.max(...priorTradeDates.map(date => sharesByDate.get(date).length))}`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) main().catch(error => { console.error(error instanceof Error ? error.message : String(error)); process.exitCode = 1; });
