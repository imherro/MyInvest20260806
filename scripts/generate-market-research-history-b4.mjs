import { mkdir, readFile, rename, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { parseAsOf } from "./generate-market-research-current.mjs";

const INPUT = "public/data/market-research/history/b2.json";
const OUTPUT = "public/data/market-research/history/b4.json";

export function buildB4MonthlyHistory(b2, requestedAsOf, generatedAt = new Date().toISOString()) {
  if (b2?.schemaVersion !== 1 || b2?.indicator?.id !== "B2" || b2.indicator.frequency !== "monthly") throw new Error("Invalid B2 history identity");
  if (b2.requestedAsOf !== requestedAsOf) throw new Error("B2 history requestedAsOf does not match B4 request");
  if (!b2?.range?.startAsOf || !b2?.range?.endAsOf || !Array.isArray(b2.points) || !b2.points.length) throw new Error("Invalid B2 history range or points");
  if (b2?.source?.provider !== "Tushare Pro" || b2.source.api !== "daily_basic" || !Array.isArray(b2.source.fields) || !b2.source.fields.includes("total_mv")) throw new Error("Invalid B2 history source");
  let previousAsOf = "";
  const seen = new Set();
  const points = b2.points.map(point => {
    if (!point?.asOf || seen.has(point.asOf) || point.asOf <= previousAsOf) throw new Error("B2 history asOf values must be unique and strictly ascending");
    seen.add(point.asOf); previousAsOf = point.asOf;
    if (!point.periodDate || point.releaseDate !== point.periodDate || point.releaseDate > point.asOf || point.periodDate.slice(0, 7) !== point.asOf.slice(0, 7)) throw new Error(`Invalid B2 PIT dates at ${point.asOf}`);
    if (point.revisionStatus !== "not_tracked") throw new Error(`Invalid B2 revisionStatus at ${point.asOf}`);
    if (!Number.isInteger(point.stockCount) || point.stockCount <= 0) throw new Error(`Invalid B2 stockCount at ${point.asOf}`);
    const raw = point.totalMarketCapWan;
    const totalMarketCapWan = raw === null || raw === undefined || raw === "" ? Number.NaN : Number(raw);
    if (!Number.isFinite(totalMarketCapWan) || totalMarketCapWan <= 0) throw new Error(`Invalid B2 totalMarketCapWan at ${point.asOf}`);
    const totalMarketCapTrillion = totalMarketCapWan / 100000000;
    if (!Number.isFinite(totalMarketCapTrillion) || totalMarketCapTrillion <= 0) throw new Error(`Invalid B4 totalMarketCapTrillion at ${point.asOf}`);
    return { asOf: point.asOf, periodDate: point.periodDate, releaseDate: point.releaseDate, revisionStatus: point.revisionStatus, stockCount: point.stockCount, totalMarketCapWan, totalMarketCapTrillion };
  });
  if (points[0].asOf !== b2.range.startAsOf || points.at(-1).asOf !== b2.range.endAsOf) throw new Error("B2 history range does not match its points");
  return {
    schemaVersion: 1, generatedAt, requestedAsOf,
    indicator: { id: "B4", name: "总市值/GDP", frequency: "monthly", asOfRule: "derived_from_b2_monthly_eod" },
    range: { ...b2.range },
    source: { type: "derived", input: INPUT, inputIndicator: "B2", formula: "totalMarketCapWan / 100000000", underlyingProvider: "Tushare Pro", underlyingApi: "daily_basic", underlyingField: "total_mv" },
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
  const b2 = JSON.parse(await readFile(path.resolve(INPUT), "utf8"));
  const b4 = buildB4MonthlyHistory(b2, requestedAsOf);
  await writeAtomically(path.resolve(OUTPUT), b4);
  console.log(`Generated ${OUTPUT}: ${b4.points.length} derived B4 monthly PIT points (${b4.range.startAsOf} to ${b4.range.endAsOf}); network requests: 0`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) main().catch(error => { console.error(error instanceof Error ? error.message : String(error)); process.exitCode = 1; });
