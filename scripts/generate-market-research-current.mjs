import { readFile, rename, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { isMarketResearchCurrent } from "../app/market-research-types.ts";

export const TUSHARE_ENDPOINT = "https://api.tushare.pro";
export const B3_INSTRUMENTS = [
  { code: "000300.SH", name: "沪深300", role: "broad" },
  { code: "399006.SZ", name: "创业板指", role: "technology" },
];

function parseAsOf(argv) {
  const index = argv.indexOf("--as-of");
  if (index === -1) {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
  }
  const value = argv[index + 1];
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value ?? "") || Number.isNaN(Date.parse(`${value}T00:00:00Z`))) {
    throw new Error("--as-of must use YYYY-MM-DD");
  }
  return value;
}

const compactDate = value => value.replaceAll("-", "");
const displayDate = value => `${value.slice(0, 4)}-${value.slice(4, 6)}-${value.slice(6, 8)}`;

function subtractDays(value, days) {
  const date = new Date(`${value}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() - days);
  return date.toISOString().slice(0, 10);
}

export function parseTushareRows(data) {
  if (!data || !Array.isArray(data.fields) || !Array.isArray(data.items)) throw new Error("Tushare returned malformed data");
  return data.items.map(item => Object.fromEntries(data.fields.map((field, index) => [field, item[index]])));
}

export async function callTushare(apiName, params, fields, token, fetchImpl = fetch) {
  const response = await fetchImpl(TUSHARE_ENDPOINT, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ api_name: apiName, token, params, fields }),
  });
  if (!response.ok) throw new Error(`Tushare HTTP ${response.status}`);
  const payload = await response.json();
  if (payload.code !== 0) throw new Error(`Tushare API error ${payload.code}: ${payload.msg || "unknown error"}`);
  return parseTushareRows(payload.data);
}

export function selectLatestCommonSnapshot(rowsByCode, requestedAsOf) {
  const requested = compactDate(requestedAsOf);
  const dateSets = B3_INSTRUMENTS.map(({ code }) => new Set((rowsByCode[code] ?? []).map(row => row.trade_date)));
  const commonDates = [...dateSets[0]].filter(date => date <= requested && dateSets[1].has(date)).sort().reverse();
  const tradeDate = commonDates[0];
  if (!tradeDate) throw new Error(`No common index_dailybasic trade date found on or before ${requestedAsOf}`);

  const values = Object.fromEntries(B3_INSTRUMENTS.map(({ code }) => {
    const row = rowsByCode[code].find(item => item.trade_date === tradeDate);
    const peTtm = Number(row?.pe_ttm);
    const pb = Number(row?.pb);
    if (!Number.isFinite(peTtm) || !Number.isFinite(pb)) throw new Error(`Incomplete PE/PB data for ${code} on ${tradeDate}`);
    return [code, { peTtm, pb }];
  }));
  return { tradeDate, values };
}

export function buildGeneratedCurrent(template, snapshot, generatedAt = new Date().toISOString()) {
  const asOf = displayDate(snapshot.tradeDate);
  const broad = snapshot.values["000300.SH"];
  const technology = snapshot.values["399006.SZ"];
  const raw = `沪深300 PE TTM ${broad.peTtm.toFixed(2)} / PB ${broad.pb.toFixed(2)}；创业板指 PE TTM ${technology.peTtm.toFixed(2)} / PB ${technology.pb.toFixed(2)}`;
  const pending = indicator => ({
    ...indicator,
    score: null,
    raw: null,
    position: null,
    trend: null,
    period: null,
    release: null,
    coverage: null,
    quality: null,
    note: "真实数据尚未接入",
    dataStatus: "pending",
  });
  const components = Object.fromEntries(Object.entries(template.components).map(([code, indicators]) => [code, indicators.map(pending)]));
  components.B = components.B.map(indicator => indicator.id === "B3" ? {
    ...indicator,
    raw,
    period: asOf,
    release: asOf,
    coverage: "100%",
    quality: "A",
    note: "当前为真实截面估值；历史分位和最终B3评分尚未实现。",
    dataStatus: "generated",
  } : indicator);

  return {
    ...template,
    schemaVersion: 2,
    generatedAt,
    source: {
      mode: "generated",
      label: "Tushare generated current snapshot",
      provider: "Tushare Pro",
      api: "index_dailybasic",
      instruments: B3_INSTRUMENTS,
    },
    asOf,
    diagnosis: {
      states: ["F 待计算", "L 待计算", "B 数据接入中"],
      headline: "真实市场数据接入中：B3估值截面已生成",
      diagnosis: "当前仅B3已由真实市场数据生成，其余指标尚未接入，因此暂不形成F/L/B综合市场判断。",
      investmentImplication: null,
      riskNote: null,
      positionBias: null,
    },
    cards: template.cards.map(card => ({
      ...card,
      score: null,
      status: card.code === "B" ? "数据接入中" : "待计算",
      coverage: card.code === "F" ? "0/4" : card.code === "L" ? "0/5" : "1/5",
      updatedAt: card.code === "B" ? asOf : null,
      tone: "pending",
      trend: [],
      drivers: [],
      risks: [],
    })),
    policyOverlay: { status: null, tone: "pending", reasons: [] },
    jointState: { nearestState: null, transitioningTo: null, trendLabel: null, description: "数据不足，暂不判断" },
    stateMap: template.stateMap.map(row => [row[0], row[1], row[2], row[3], ""]),
    drivers: [],
    risks: [],
    dataQuality: { grade: "Partial", coverage: "1/14", pitStatus: "待接入", warning: "仅B3已由真实数据生成，其余13项待接入" },
    recentHistory: [],
    recentEvents: [{ date: asOf.slice(5), title: "B3真实估值截面生成", detail: raw, group: "B3", tone: "blue" }],
    components,
  };
}

async function writeAtomically(target, value) {
  const temporary = `${target}.tmp-${process.pid}-${Date.now()}`;
  try {
    await writeFile(temporary, `${JSON.stringify(value, null, 2)}\n`, "utf8");
    await rename(temporary, target);
  } catch (error) {
    await unlink(temporary).catch(() => {});
    throw error;
  }
}

export async function main(argv = process.argv.slice(2)) {
  const token = process.env.TUSHARE_TOKEN;
  if (!token) throw new Error("TUSHARE_TOKEN is required");
  const requestedAsOf = parseAsOf(argv);
  const startDate = subtractDays(requestedAsOf, 45);
  const fields = "ts_code,trade_date,pe_ttm,pb";
  const rows = await Promise.all(B3_INSTRUMENTS.map(async instrument => [
    instrument.code,
    await callTushare("index_dailybasic", {
      ts_code: instrument.code,
      start_date: compactDate(startDate),
      end_date: compactDate(requestedAsOf),
    }, fields, token),
  ]));
  const snapshot = selectLatestCommonSnapshot(Object.fromEntries(rows), requestedAsOf);
  const target = path.resolve("public/data/market-research/current.json");
  const template = JSON.parse(await readFile(target, "utf8"));
  const current = buildGeneratedCurrent(template, snapshot);
  if (!isMarketResearchCurrent(current)) throw new Error("Generated current.json failed schemaVersion 2 validation");
  await writeAtomically(target, current);
  const b3 = current.components.B.find(indicator => indicator.id === "B3");
  console.log(`Generated ${path.relative(process.cwd(), target)} as of ${current.asOf}`);
  console.log(`B3: ${b3.raw}`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch(error => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  });
}
