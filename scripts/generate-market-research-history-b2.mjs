import { mkdir, readFile, rename, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { buildB2Snapshot, buildB4Snapshot, callTushare, parseAsOf } from "./generate-market-research-current.mjs";

const INPUT = "public/data/market-research/history/b3.json";
const OUTPUT = "public/data/market-research/history/b2.json";
const FIELDS = "ts_code,trade_date,total_mv,dv_ttm";
const compactDate = value => value.replaceAll("-", "");

export function validateB3Schedule(b3, requestedAsOf) {
  if (b3?.schemaVersion !== 1 || b3?.indicator?.id !== "B3" || b3.indicator.frequency !== "monthly") throw new Error("Invalid B3 history identity");
  if (b3.requestedAsOf !== requestedAsOf) throw new Error("B3 history requestedAsOf does not match B2 request");
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

export function buildB2HistoryPoint(schedulePoint, rows) {
  const snapshot = { tradeDate: compactDate(schedulePoint.periodDate) };
  const b4 = buildB4Snapshot(rows, snapshot);
  const b2 = buildB2Snapshot(rows, snapshot, b4);
  return {
    asOf: schedulePoint.asOf, periodDate: schedulePoint.periodDate, releaseDate: schedulePoint.releaseDate, revisionStatus: schedulePoint.revisionStatus,
    stockCount: b4.stockCount, observedCount: b2.observedCount, missingCount: b2.missingCount,
    totalMarketCapWan: b4.totalMarketCapWan, observedMarketCapWan: b2.observedMarketCapWan,
    marketCapCoverage: b2.marketCapCoverage, weightedDividendYield: b2.weightedDividendYield,
  };
}

export function buildB2MonthlyHistory(b3, rowsByTradeDate, requestedAsOf, generatedAt = new Date().toISOString()) {
  validateB3Schedule(b3, requestedAsOf);
  const points = b3.points.map(point => {
    const tradeDate = compactDate(point.periodDate);
    if (!rowsByTradeDate.has(tradeDate)) throw new Error(`Missing B2 daily_basic batch for B3 date ${tradeDate}; fallback is forbidden`);
    return buildB2HistoryPoint(point, rowsByTradeDate.get(tradeDate));
  });
  return {
    schemaVersion: 1, generatedAt, requestedAsOf,
    indicator: { id: "B2", name: "股息率－无风险利率", frequency: "monthly", asOfRule: "aligned_to_b3_monthly_eod" },
    range: { ...b3.range },
    source: { provider: "Tushare Pro", api: "daily_basic", fields: FIELDS.split(","), dateScheduleInput: INPUT },
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
  const rowsByTradeDate = new Map();
  for (const point of b3.points) {
    const tradeDate = compactDate(point.periodDate);
    rowsByTradeDate.set(tradeDate, await callTushare("daily_basic", { trade_date: compactDate(point.periodDate) }, FIELDS, token));
  }
  const b2 = buildB2MonthlyHistory(b3, rowsByTradeDate, requestedAsOf);
  await writeAtomically(path.resolve(OUTPUT), b2);
  console.log(`Generated ${OUTPUT}: ${b2.points.length} monthly B2 PIT points (${b2.range.startAsOf} to ${b2.range.endAsOf}); daily_basic requests: ${b3.points.length}`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) main().catch(error => { console.error(error instanceof Error ? error.message : String(error)); process.exitCode = 1; });
