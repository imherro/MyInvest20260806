import { mkdir, readFile, rename, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { parseAsOf } from "./generate-market-research-current.mjs";

const INPUT = "public/data/market-research/history/b2.json";
const OUTPUT = "public/data/market-research/history/f3.json";

export function buildF3MonthlyHistory(b2, requestedAsOf, generatedAt = new Date().toISOString()) {
  if (b2?.schemaVersion !== 1 || b2?.indicator?.id !== "B2" || b2.indicator.frequency !== "monthly") throw new Error("Invalid B2 history identity");
  if (b2.requestedAsOf !== requestedAsOf) throw new Error("B2 history requestedAsOf does not match F3 request");
  if (!b2?.range?.startAsOf || !b2?.range?.endAsOf || !Array.isArray(b2.points) || !b2.points.length) throw new Error("Invalid B2 history range or points");
  if (b2?.source?.provider !== "Tushare Pro" || b2.source.api !== "daily_basic") throw new Error("Invalid B2 history source");
  let previousAsOf = "";
  const seen = new Set();
  const points = b2.points.map(point => {
    if (!point?.asOf || seen.has(point.asOf) || point.asOf <= previousAsOf) throw new Error("B2 history asOf values must be unique and strictly ascending");
    seen.add(point.asOf); previousAsOf = point.asOf;
    if (!point.periodDate || point.releaseDate !== point.periodDate || point.releaseDate > point.asOf || point.periodDate.slice(0, 7) !== point.asOf.slice(0, 7)) throw new Error(`Invalid B2 PIT dates at ${point.asOf}`);
    if (point.revisionStatus !== "not_tracked") throw new Error(`Invalid B2 revisionStatus at ${point.asOf}`);
    if (!Number.isInteger(point.stockCount) || point.stockCount <= 0) throw new Error(`Invalid B2 stockCount at ${point.asOf}`);
    if (!Number.isInteger(point.observedCount) || point.observedCount <= 0) throw new Error(`Invalid B2 observedCount at ${point.asOf}`);
    if (!Number.isInteger(point.missingCount) || point.missingCount < 0 || point.observedCount + point.missingCount !== point.stockCount) throw new Error(`Invalid B2 missingCount at ${point.asOf}`);
    const coverageRaw = point.marketCapCoverage;
    const marketCapCoverage = coverageRaw === null || coverageRaw === undefined || coverageRaw === "" ? Number.NaN : Number(coverageRaw);
    if (!Number.isFinite(marketCapCoverage) || marketCapCoverage <= 0 || marketCapCoverage > 100) throw new Error(`Invalid B2 marketCapCoverage at ${point.asOf}`);
    const yieldRaw = point.weightedDividendYield;
    const cashDividendYield = yieldRaw === null || yieldRaw === undefined || yieldRaw === "" ? Number.NaN : Number(yieldRaw);
    if (!Number.isFinite(cashDividendYield) || cashDividendYield < 0) throw new Error(`Invalid B2 weightedDividendYield at ${point.asOf}`);
    return { asOf: point.asOf, periodDate: point.periodDate, releaseDate: point.releaseDate, revisionStatus: point.revisionStatus, stockCount: point.stockCount, observedCount: point.observedCount, missingCount: point.missingCount, marketCapCoverage, cashDividendYield };
  });
  if (points[0].asOf !== b2.range.startAsOf || points.at(-1).asOf !== b2.range.endAsOf) throw new Error("B2 history range does not match its points");
  return {
    schemaVersion: 1, generatedAt, requestedAsOf,
    indicator: { id: "F3", name: "股东回报 / 股权融资", frequency: "monthly", asOfRule: "derived_from_b2_monthly_eod" },
    range: { ...b2.range },
    source: { type: "derived", input: INPUT, inputIndicator: "B2", formula: "cashDividendYield = weightedDividendYield", underlyingProvider: "Tushare Pro", underlyingApi: "daily_basic", underlyingField: "dv_ttm" },
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
  const f3 = buildF3MonthlyHistory(b2, requestedAsOf);
  await writeAtomically(path.resolve(OUTPUT), f3);
  console.log(`Generated ${OUTPUT}: ${f3.points.length} derived F3 monthly PIT points (${f3.range.startAsOf} to ${f3.range.endAsOf}); network requests: 0`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) main().catch(error => { console.error(error instanceof Error ? error.message : String(error)); process.exitCode = 1; });
