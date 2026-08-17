import { mkdir, readFile, rename, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { MARKET_INDEX_INSTRUMENTS, parseAsOf } from "./generate-market-research-current.mjs";

const INPUT = "public/data/market-research/history/b3.json";
const OUTPUT = "public/data/market-research/history/b1.json";

export function buildB1MonthlyHistory(b3, requestedAsOf, generatedAt = new Date().toISOString()) {
  if (b3?.schemaVersion !== 1 || b3?.indicator?.id !== "B3" || b3.indicator.frequency !== "monthly") throw new Error("Invalid B3 history identity");
  if (b3.requestedAsOf !== requestedAsOf) throw new Error("B3 history requestedAsOf does not match B1 request");
  if (!b3?.range?.startAsOf || !b3?.range?.endAsOf || !Array.isArray(b3.points) || !b3.points.length) throw new Error("Invalid B3 history range or points");
  let previousAsOf = "";
  const seen = new Set();
  const points = b3.points.map(point => {
    if (!point?.asOf || seen.has(point.asOf) || point.asOf <= previousAsOf) throw new Error("B3 history asOf values must be unique and strictly ascending");
    seen.add(point.asOf); previousAsOf = point.asOf;
    if (!point.periodDate || point.releaseDate !== point.periodDate || point.releaseDate > point.asOf || point.periodDate.slice(0, 7) !== point.asOf.slice(0, 7)) throw new Error(`Invalid B3 PIT dates at ${point.asOf}`);
    if (point.revisionStatus !== "not_tracked") throw new Error(`Invalid B3 revisionStatus at ${point.asOf}`);
    const values = Object.fromEntries(MARKET_INDEX_INSTRUMENTS.map(({ code }) => {
      if (!point.values?.[code]) throw new Error(`B3 history is missing ${code} at ${point.asOf}`);
      const raw = point.values[code].peTtm;
      const peTtm = raw === null || raw === undefined || raw === "" ? Number.NaN : Number(raw);
      if (!Number.isFinite(peTtm) || peTtm <= 0) throw new Error(`Invalid B3 peTtm for ${code} at ${point.asOf}`);
      const earningsYield = 100 / peTtm;
      if (!Number.isFinite(earningsYield) || earningsYield <= 0) throw new Error(`Invalid B1 earningsYield for ${code} at ${point.asOf}`);
      return [code, { earningsYield }];
    }));
    return { asOf: point.asOf, periodDate: point.periodDate, releaseDate: point.releaseDate, revisionStatus: point.revisionStatus, values };
  });
  if (points[0].asOf !== b3.range.startAsOf || points.at(-1).asOf !== b3.range.endAsOf) throw new Error("B3 history range does not match its points");
  return {
    schemaVersion: 1, generatedAt, requestedAsOf,
    indicator: { id: "B1", name: "ERP股权风险溢价", frequency: "monthly", asOfRule: "derived_from_b3_monthly_eod" },
    range: { ...b3.range },
    source: { type: "derived", input: INPUT, inputIndicator: "B3", formula: "100 / peTtm", underlyingProvider: "Tushare Pro", underlyingApi: "index_dailybasic" },
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
  const b3 = JSON.parse(await readFile(path.resolve(INPUT), "utf8"));
  const b1 = buildB1MonthlyHistory(b3, requestedAsOf);
  await writeAtomically(path.resolve(OUTPUT), b1);
  console.log(`Generated ${OUTPUT}: ${b1.points.length} derived B1 monthly PIT points (${b1.range.startAsOf} to ${b1.range.endAsOf}); network requests: 0`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) main().catch(error => { console.error(error instanceof Error ? error.message : String(error)); process.exitCode = 1; });
