import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

async function render() {
  const workerUrl = new URL("../dist/server/index.js", import.meta.url);
  workerUrl.searchParams.set("test", `${process.pid}-${Date.now()}`);
  const { default: worker } = await import(workerUrl.href);

  return worker.fetch(
    new Request("http://localhost/", { headers: { accept: "text/html" } }),
    { ASSETS: { fetch: async () => new Response("Not found", { status: 404 }) } },
    { waitUntil() {}, passThroughOnException() {} },
  );
}

async function listFiles(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = await Promise.all(entries.map(async (entry) => {
    const fullPath = path.join(directory, entry.name);
    return entry.isDirectory() ? listFiles(fullPath) : [fullPath];
  }));
  return files.flat();
}

async function builtClientText() {
  const clientRoot = fileURLToPath(new URL("../dist/client/", import.meta.url));
  const files = (await listFiles(clientRoot)).filter((file) => file.endsWith(".js"));
  const contents = await Promise.all(files.map((file) => readFile(file, "utf8")));
  return contents.join("\n");
}

async function appSource() {
  return readFile(fileURLToPath(new URL("../app/page.tsx", import.meta.url)), "utf8");
}

async function generatorSource() {
  return readFile(fileURLToPath(new URL("../scripts/generate-market-research-current.mjs", import.meta.url)), "utf8");
}

async function currentMarketData() {
  const raw = await readFile(fileURLToPath(new URL("../public/data/market-research/current.json", import.meta.url)), "utf8");
  return JSON.parse(raw);
}

async function currentMarketGuard() {
  const moduleUrl = new URL("../app/market-research-types.ts", import.meta.url);
  return (await import(moduleUrl.href)).isMarketResearchCurrent;
}

async function marketGenerator() {
  return import(new URL("../scripts/generate-market-research-current.mjs", import.meta.url).href);
}

async function historyGenerator() {
  return import(new URL("../scripts/generate-market-research-history-b3.mjs", import.meta.url).href);
}

async function historyGeneratorSource() {
  return readFile(fileURLToPath(new URL("../scripts/generate-market-research-history-b3.mjs", import.meta.url)), "utf8");
}

async function b3HistoryData() {
  return JSON.parse(await readFile(fileURLToPath(new URL("../public/data/market-research/history/b3.json", import.meta.url)), "utf8"));
}

async function b1HistoryGenerator() {
  return import(new URL("../scripts/generate-market-research-history-b1.mjs", import.meta.url).href);
}

async function b1HistoryData() {
  return JSON.parse(await readFile(fileURLToPath(new URL("../public/data/market-research/history/b1.json", import.meta.url)), "utf8"));
}

async function b5HistoryGenerator() {
  return import(new URL("../scripts/generate-market-research-history-b5.mjs", import.meta.url).href);
}

async function b5HistoryData() {
  return JSON.parse(await readFile(fileURLToPath(new URL("../public/data/market-research/history/b5.json", import.meta.url)), "utf8"));
}

async function b2HistoryGenerator() {
  return import(new URL("../scripts/generate-market-research-history-b2.mjs", import.meta.url).href);
}

async function b2HistoryData() {
  return JSON.parse(await readFile(fileURLToPath(new URL("../public/data/market-research/history/b2.json", import.meta.url)), "utf8"));
}

async function b4HistoryGenerator() {
  return import(new URL("../scripts/generate-market-research-history-b4.mjs", import.meta.url).href);
}

async function b4HistoryData() {
  return JSON.parse(await readFile(fileURLToPath(new URL("../public/data/market-research/history/b4.json", import.meta.url)), "utf8"));
}

async function f3HistoryGenerator() {
  return import(new URL("../scripts/generate-market-research-history-f3.mjs", import.meta.url).href);
}

async function f3HistoryData() {
  return JSON.parse(await readFile(fileURLToPath(new URL("../public/data/market-research/history/f3.json", import.meta.url)), "utf8"));
}

async function f1HistoryGenerator() {
  return import(new URL("../scripts/generate-market-research-history-f1.mjs", import.meta.url).href);
}

async function f1HistoryData() {
  return JSON.parse(await readFile(fileURLToPath(new URL("../public/data/market-research/history/f1.json", import.meta.url)), "utf8"));
}

async function f2HistoryGenerator() {
  return import(new URL("../scripts/generate-market-research-history-f2.mjs", import.meta.url).href);
}

async function f2HistoryData() {
  return JSON.parse(await readFile(fileURLToPath(new URL("../public/data/market-research/history/f2.json", import.meta.url)), "utf8"));
}

async function l1HistoryGenerator() {
  return import(new URL("../scripts/generate-market-research-history-l1.mjs", import.meta.url).href);
}

async function l1HistoryData() {
  return JSON.parse(await readFile(fileURLToPath(new URL("../public/data/market-research/history/l1.json", import.meta.url)), "utf8"));
}

async function l5HistoryGenerator() {
  return import(new URL("../scripts/generate-market-research-history-l5.mjs", import.meta.url).href);
}

async function l5HistoryData() {
  return JSON.parse(await readFile(fileURLToPath(new URL("../public/data/market-research/history/l5.json", import.meta.url)), "utf8"));
}

async function l2HistoryGenerator() {
  return import(new URL("../scripts/generate-market-research-history-l2.mjs", import.meta.url).href);
}

async function l2HistoryData() {
  return JSON.parse(await readFile(fileURLToPath(new URL("../public/data/market-research/history/l2.json", import.meta.url)), "utf8"));
}

async function l3HistoryGenerator() {
  return import(new URL("../scripts/generate-market-research-history-l3.mjs", import.meta.url).href);
}

async function l3HistoryData() {
  return JSON.parse(await readFile(fileURLToPath(new URL("../public/data/market-research/history/l3.json", import.meta.url)), "utf8"));
}

async function l4HistoryGenerator() {
  return import(new URL("../scripts/generate-market-research-history-l4.mjs", import.meta.url).href);
}

async function l4HistoryData() {
  return JSON.parse(await readFile(fileURLToPath(new URL("../public/data/market-research/history/l4.json", import.meta.url)), "utf8"));
}

async function f4HistoryGenerator() {
  return import(new URL("../scripts/generate-market-research-history-f4.mjs", import.meta.url).href);
}

async function f4HistoryData() {
  return JSON.parse(await readFile(fileURLToPath(new URL("../public/data/market-research/history/f4.json", import.meta.url)), "utf8"));
}

async function jointHistoryGenerator() {
  return import(new URL("../scripts/generate-market-research-joint-history.mjs", import.meta.url).href);
}

async function jointHistoryData() {
  return JSON.parse(await readFile(fileURLToPath(new URL("../public/data/market-research/history/joint.json", import.meta.url)), "utf8"));
}

test("renders the MY INVEST application shell", async () => {
  const response = await render();
  assert.equal(response.status, 200);
  assert.match(response.headers.get("content-type") ?? "", /^text\/html\b/i);

  const html = await response.text();
  assert.match(html, /<title>MY INVEST｜投资研究系统<\/title>/i);
  assert.match(html, /投资研究系统原型/);
  assert.match(html, /今日总览/);
});

test("loads current market research from the only current.json source", async () => {
  const source = await appSource();

  assert.match(source, /fetch\("\/data\/market-research\/current\.json",\{cache:"no-store"/);
  assert.match(source, /当前市场数据加载失败/);
  assert.match(source, /页面不会回退到旧数据/);
  assert.doesNotMatch(source, /marketResearchMock|market-research-mock/);
});

test("current.json contains the complete F/L/B market research contract", async () => {
  const current = await currentMarketData();
  const isMarketResearchCurrent = await currentMarketGuard();

  assert.equal(isMarketResearchCurrent(current), true);
  assert.equal(current.schemaVersion, 4);
  assert.equal(current.source.mode, "generated");
  assert.deepEqual(current.source.providers, ["Tushare Pro", "中国人民银行", "中华人民共和国财政部"]);
  assert.deepEqual(current.source.apis, ["index_dailybasic", "cn_m", "shibor", "sf_month", "us_trycr", "daily_basic", "fina_indicator_vip", "etf_basic", "etf_share_size"]);
  assert.equal("api" in current.source, false);
  assert.equal(current.source.releaseEvidence.L2.provider, "中国人民银行");
  assert.equal(current.source.releaseEvidence.L4.provider, "中华人民共和国财政部");
  assert.deepEqual(Object.keys(current.source.releaseEvidence), ["L2", "L4"]);
  assert.doesNotMatch(JSON.stringify(current.source), /cn_schedule/);
  assert.deepEqual(current.cards.map((card) => card.code), ["F", "L", "B"]);

  for (const text of [
    "长牛底座",
    "发动机",
    "货币信用",
    "汽油",
    "估值泡沫",
    "转速表",
    "待接入",
    "分数越高代表泡沫风险越高",
  ]) {
    assert.match(JSON.stringify(current), new RegExp(text), `missing current.json product text: ${text}`);
  }
});

test("current.json ships all 14 market indicators with their names", async () => {
  const current = await currentMarketData();
  const components = [...current.components.F, ...current.components.L, ...current.components.B];
  const indicators = [
    ["F1", "盈利趋势"],
    ["F2", "盈利扩散与质量"],
    ["F3", "股东回报 / 股权融资"],
    ["F4", "长期资金"],
    ["L1", "利率与实际利率"],
    ["L2", "M1/M2货币活化"],
    ["L3", "信用脉冲"],
    ["L4", "财政脉冲"],
    ["L5", "外部金融条件"],
    ["B1", "ERP股权风险溢价"],
    ["B2", "股息率－无风险利率"],
    ["B3", "PE/PB与估值分化"],
    ["B4", "总市值/GDP"],
    ["B5", "投机热度"],
  ];

  for (const [code, name] of indicators) {
    assert.ok(components.some((item) => item.id === code && item.name === name), `missing indicator: ${code} ${name}`);
  }
  assert.equal(components.length, 14);
});

test("defines explicit missing-value behavior", async () => {
  const source = await appSource();
  assert.match(source, /value \?\? "—"/);
  assert.match(source, /isMarketResearchCurrent/);
});

test("contains all 14 real current proxy snapshots while scores remain disabled", async () => {
  const current = await currentMarketData();
  const components = [...current.components.F, ...current.components.L, ...current.components.B];
  const b3 = current.components.B.find((item) => item.id === "B3");
  const b1 = current.components.B.find((item) => item.id === "B1");
  const b2 = current.components.B.find((item) => item.id === "B2");
  const b4 = current.components.B.find((item) => item.id === "B4");
  const l2 = current.components.L.find((item) => item.id === "L2");
  const b5 = current.components.B.find((item) => item.id === "B5");
  const l1 = current.components.L.find((item) => item.id === "L1");
  const l3 = current.components.L.find((item) => item.id === "L3");
  const l4 = current.components.L.find((item) => item.id === "L4");
  const l5 = current.components.L.find((item) => item.id === "L5");
  const f1 = current.components.F.find((item) => item.id === "F1");
  const f2 = current.components.F.find((item) => item.id === "F2");
  const f3 = current.components.F.find((item) => item.id === "F3");
  const f4 = current.components.F.find((item) => item.id === "F4");

  assert.equal(f1.dataStatus, "generated");
  assert.match(f1.raw, /已披露样本归母净利润同比中位数 [+-]?\d+\.\d% \/ 有值 \d+家 \/ 缺失 \d+家/);
  assert.equal(f1.period, "2026-06");
  assert.ok(f1.release <= current.asOf);
  assert.equal(f1.score, null);
  assert.equal(f1.position, null);
  assert.equal(f1.trend, null);
  assert.match(f1.coverage, /\d+\/\d+家已披露样本/);
  assert.match(f1.note, /第一阶段已披露样本盈利同比代理/);
  assert.match(f1.note, /公告日期缺失记录已排除/);
  assert.match(f1.note, /不是全A总利润增长率/);
  assert.match(f1.note, /不计算F1评分/);
  assert.equal(f2.dataStatus, "generated");
  assert.match(f2.raw, /已披露样本归母净利润同比正增长占比 \d+\.\d% \/ 正增长 \d+家 \/ 有值 \d+家/);
  assert.equal(f2.period, f1.period);
  assert.equal(f2.release, f1.release);
  assert.equal(f2.score, null);
  assert.equal(f2.position, null);
  assert.equal(f2.trend, null);
  assert.match(f2.note, /第一阶段盈利扩散代理/);
  assert.match(f2.note, /仅覆盖盈利扩散/);
  assert.match(f2.note, /尚未覆盖盈利质量/);
  assert.match(f2.note, /空值不进入分母/);
  assert.match(f2.note, /不计算F2评分/);
  assert.equal(f3.dataStatus, "generated");
  assert.equal(f3.raw, b2.raw);
  assert.equal(f3.period, b2.period);
  assert.equal(f3.release, b2.release);
  assert.equal(f3.coverage, b2.coverage);
  assert.equal(f3.score, null);
  assert.equal(f3.position, null);
  assert.equal(f3.trend, null);
  assert.match(f3.note, /第一阶段现金分红股东回报代理/);
  assert.match(f3.note, /只覆盖现金分红/);
  assert.match(f3.note, /尚未接入股票回购/);
  assert.match(f3.note, /未扣除IPO、增发等股权融资/);
  assert.match(f3.note, /不是完整的“股东回报 \/ 股权融资”/);
  assert.match(f3.note, /不计算.*F3评分/);
  assert.equal(f4.dataStatus, "generated");
  assert.match(f4.raw, /沪深300ETF有值样本总规模 \d+\.\d{2}万亿元 \/ 有值 \d+只 \/ 目标 \d+只/);
  assert.ok(f4.period < current.asOf);
  assert.ok(f4.release <= current.asOf);
  assert.equal(f4.score, null);
  assert.equal(f4.position, null);
  assert.equal(f4.trend, null);
  assert.match(f4.note, /第一阶段沪深300ETF资金池规模代理/);
  assert.match(f4.note, /次日约8:30/);
  assert.match(f4.note, /不代表全部长期资金/);
  assert.match(f4.note, /不代表资金净流入/);
  assert.match(f4.note, /不是完整历史PIT/);
  assert.match(f4.note, /不计算.*F4评分/);

  assert.equal(b1.dataStatus, "generated");
  assert.match(b1.raw, /沪深300盈利收益率 \d+\.\d{2}%；创业板指盈利收益率 \d+\.\d{2}%/);
  assert.equal(b1.period, b3.period);
  assert.equal(b1.release, b3.release);
  assert.equal(b1.score, null);
  assert.equal(b1.position, null);
  assert.equal(b1.trend, null);
  assert.match(b1.note, /第一阶段股权端收益率代理/);
  assert.match(b1.note, /不是ERP/);
  assert.match(b1.note, /尚未接入中国长期无风险利率/);
  assert.match(b1.note, /不计算.*B1评分/);
  assert.equal(b2.dataStatus, "generated");
  assert.match(b2.raw, /A股有值样本市值加权TTM股息率 \d+\.\d{2}% \/ 有值 \d+只 \/ 市值覆盖 \d+\.\d%/);
  assert.equal(b2.period, b3.period);
  assert.equal(b2.release, b3.release);
  assert.equal(b2.score, null);
  assert.equal(b2.position, null);
  assert.equal(b2.trend, null);
  assert.match(b2.coverage, /\d+只有值 \/ 市值覆盖\d+\.\d%/);
  assert.match(b2.note, /相同交易日的daily_basic/);
  assert.match(b2.note, /dv_ttm有合法数值的股票按total_mv进行市值加权/);
  assert.match(b2.note, /第一阶段股息率端代理/);
  assert.match(b2.note, /空dv_ttm不视为0/);
  assert.match(b2.note, /尚未接入中国长期无风险利率/);
  assert.match(b2.note, /不是“股息率－无风险利率”/);
  assert.match(b2.note, /不计算.*B2评分/);
  assert.equal(b3.dataStatus, "generated");
  assert.match(b3.raw, /沪深300 PE TTM \d+\.\d{2} \/ PB \d+\.\d{2}；创业板指 PE TTM \d+\.\d{2} \/ PB \d+\.\d{2}/);
  assert.notEqual(b3.period, current.asOf);
  assert.equal(b3.period, "2026-08-14");
  assert.equal(b3.position, null);
  assert.equal(b3.score, null);
  assert.match(b3.note, /历史分位和最终B3评分尚未实现/);
  assert.equal(b4.dataStatus, "generated");
  assert.match(b4.raw, /A股当日记录总市值 \d+\.\d{2}万亿元 \/ 覆盖 \d+只股票/);
  assert.equal(b4.period, b3.period);
  assert.equal(b4.release, b3.release);
  assert.equal(b4.period, b5.period);
  assert.equal(b4.score, null);
  assert.equal(b4.position, null);
  assert.equal(b4.trend, null);
  assert.match(b4.note, /第一阶段A股当日总市值代理/);
  assert.match(b4.note, /尚未接入GDP/);
  assert.match(b4.note, /不是总市值\/GDP/);
  assert.match(b4.note, /不是巴菲特指标/);
  assert.match(b4.note, /不计算.*B4评分/);
  assert.equal(l2.dataStatus, "generated");
  assert.match(l2.raw, /M1同比 4\.00% \/ M2同比 7\.70% \/ 剪刀差 -3\.70pct/);
  assert.equal(l2.period, "2026-07");
  assert.equal(l2.release, "2026-08-14");
  assert.equal(l2.score, null);
  assert.equal(l2.position, null);
  assert.equal(l2.trend, null);
  assert.equal(l1.dataStatus, "generated");
  assert.match(l1.raw, /SHIBOR隔夜 -?\d+\.\d{4}% \/ 1周 -?\d+\.\d{4}% \/ 3月 -?\d+\.\d{4}% \/ 1年 -?\d+\.\d{4}% \/ 1Y-ON期限差 [+-]?\d+\.\d{4}pct/);
  assert.equal(l1.period, l1.release);
  assert.ok(l1.period <= current.asOf);
  assert.equal(l1.score, null);
  assert.equal(l1.position, null);
  assert.equal(l1.trend, null);
  assert.match(l1.note, /名义利率代理/);
  assert.match(l1.note, /尚未接入.*实际利率/);
  assert.match(l1.note, /不计算.*L1评分/);
  assert.equal(l3.dataStatus, "generated");
  assert.match(l3.raw, /社融当月增量 -?\d+\.\d{4}万亿元 \/ 年内累计 -?\d+\.\d{2}万亿元 \/ 存量 \d+\.\d{2}万亿元 \/ 存量同比 -?\d+\.\d%/);
  assert.equal(l3.period, l2.period);
  assert.equal(l3.release, l2.release);
  assert.equal(l3.score, null);
  assert.equal(l3.position, null);
  assert.equal(l3.trend, null);
  assert.match(l3.note, /第一阶段信用规模代理/);
  assert.match(l3.note, /未做.*GDP归一化/);
  assert.match(l3.note, /不计算L3评分/);
  assert.equal(l4.dataStatus, "generated");
  assert.equal(l4.period, "2026-06");
  assert.equal(l4.release, "2026-07-22");
  assert.match(l4.raw, /12\.1047万亿元（同比 \+4\.7%）.*14\.3329万亿元（同比 \+1\.5%）/);
  assert.equal(l4.score, null);
  assert.equal(l4.position, null);
  assert.equal(l4.trend, null);
  assert.match(l4.note, /第一阶段财政收支规模代理/);
  assert.match(l4.note, /不计算L4评分/);
  assert.equal(l5.dataStatus, "generated");
  assert.match(l5.raw, /美国10年实际国债收益率 -?\d+\.\d{2}%/);
  assert.ok(l5.period < current.asOf);
  assert.equal(l5.release, l5.period);
  assert.equal(l5.score, null);
  assert.equal(l5.position, null);
  assert.equal(l5.trend, null);
  assert.match(l5.note, /第一阶段外部金融条件代理/);
  assert.match(l5.note, /跨时区保守/);
  assert.match(l5.note, /不计算.*L5评分/);
  assert.equal(b5.dataStatus, "generated");
  assert.match(b5.raw, /沪深300换手率 \d+\.\d{2}%（自由流通 \d+\.\d{2}%）；创业板指换手率 \d+\.\d{2}%（自由流通 \d+\.\d{2}%）；自由流通换手比 \d+\.\d{2}x/);
  assert.equal(b5.period, b3.period);
  assert.equal(b5.release, b3.release);
  assert.equal(b5.score, null);
  assert.equal(b5.position, null);
  assert.equal(b5.trend, null);
  assert.match(b5.note, /第一阶段交易活跃度代理/);
  assert.match(b5.note, /不计算B5评分/);
  assert.equal(components.filter((item) => item.dataStatus === "generated").length, 14);
  assert.equal(components.filter((item) => item.dataStatus === "pending").length, 0);
  assert.match(current.dataQuality.coverage, /^\d+(?:\.\d+)?%$/);
  assert.equal(current.dataQuality.coverage, "100.0%");
  assert.equal(current.dataQuality.pitStatus, "待接入");
  assert.deepEqual(current.cards.map((card) => card.coverage), ["4/4", "5/5", "5/5"]);
  assert.doesNotMatch(`${current.diagnosis.diagnosis} ${current.dataQuality.warning}`, /其余0项/);
  assert.match(current.diagnosis.diagnosis, /评分、历史PIT和校准尚未完成/);
  assert.equal(current.cards.find((card) => card.code === "F").updatedAt, f1.release);
  assert.equal(current.cards.find((card) => card.code === "L").updatedAt, [l1.release, l2.release, l3.release, l4.release, l5.release].sort().reverse()[0]);
  assert.ok(current.cards.every((card) => card.score === null));
  assert.match(current.cards.find((card) => card.code === "B").directionNote, /越高代表泡沫风险越高/);
});

test("disables unsupported aggregate diagnoses even after all current proxies are generated", async () => {
  const current = await currentMarketData();
  const serialized = JSON.stringify({ diagnosis: current.diagnosis, jointState: current.jointState });

  assert.doesNotMatch(serialized, /F 偏强|L 偏正|B 温热|黄金环境|热牛阶段/);
  assert.equal(current.diagnosis.investmentImplication, null);
  assert.equal(current.diagnosis.riskNote, null);
  assert.equal(current.diagnosis.positionBias, null);
  assert.equal(current.jointState.nearestState, null);
  assert.equal(current.jointState.transitioningTo, null);
  assert.equal(current.jointState.trendLabel, null);
  assert.equal(current.jointState.description, "数据不足，暂不判断");
  assert.equal(current.dataQuality.pitStatus, "待接入");
  assert.ok(current.cards.every((card) => card.score === null));
});

test("selects the latest common trading date and builds mixed-frequency current data offline", async () => {
  const { buildB1Snapshot, buildB2Snapshot, buildB4Snapshot, buildGeneratedCurrent, selectLatestCommonSnapshot } = await marketGenerator();
  const template = await currentMarketData();
  const rows = {
    "000300.SH": [
      { trade_date: "20260815", pe_ttm: 15, pb: 1.5, turnover_rate: 0.4, turnover_rate_f: 0.8 },
      { trade_date: "20260814", pe_ttm: 14.3637, pb: 1.4639, turnover_rate: 0.5, turnover_rate_f: 1 },
    ],
    "399006.SZ": [{ trade_date: "20260814", pe_ttm: 44.4014, pb: 6.0352, turnover_rate: 2, turnover_rate_f: 4 }],
  };
  const snapshot = selectLatestCommonSnapshot(rows, "2026-08-17");
  const b1 = buildB1Snapshot(snapshot);
  const dailyRows = [
    { ts_code: "000001.SZ", trade_date: "20260814", total_mv: 60000000, dv_ttm: 2 },
    { ts_code: "600000.SH", trade_date: "20260814", total_mv: 40000000, dv_ttm: 1 },
  ];
  const b4 = buildB4Snapshot(dailyRows, snapshot);
  const b2 = buildB2Snapshot(dailyRows, snapshot, b4);
  const l2 = { m1Yoy: 4, m2Yoy: 7.7, gap: -3.7, period: "2026-07", release: "2026-08-14" };
  const l1 = { date: "2026-08-14", overnight: 1.2345, oneWeek: 1.3456, threeMonth: 1.4567, oneYear: 1.5678, termSpread: 0.3333 };
  const l3 = { month: "202607", incMonth: 12345, incCumval: 222500, stock: 463.27, incMonthTrillion: 1.2345, incCumTrillion: 22.25, stockYoy: 7.4, stockDifference: 0, cumulativeDifference: 0, period: "2026-07", release: "2026-08-14" };
  const l5 = { date: "2026-08-14", y10: 2.41 };
  const l4 = { title: "2026年上半年财政收支情况", dataMonth: "202606", listingDate: "2026-07-22", publishedAt: "2026-07-22", revenue: 121047, revenueYoy: 4.7, expenditure: 143329, expenditureYoy: 1.5 };
  const evidence = {
    pbc: { title: "2026年7月金融统计数据报告", href: "https://www.pbc.gov.cn/diaochatongjisi/116219/116225/example/index.html", publishedAt: "2026-08-14 16:30:05" },
    mof: { ...l4, href: "https://gks.mof.gov.cn/tongjishuju/202607/t20260722_3993943.htm" },
  };
  const f1 = { targetPeriod: "20260630", reportedCount: 3, validCount: 2, missingCount: 1, medianNetProfitYoy: 6.25, latestAnnDate: "20260815", positiveCount: 1, positiveShare: 50 };
  const f4 = { tradeDate: "20260814", release: "2026-08-15", eligibleCount: 2, observedCount: 1, missingCount: 1, totalSizeWan: 100000000, totalSizeTrillion: 1 };
  const generated = buildGeneratedCurrent(template, snapshot, f1, f4, b1, b2, b4, l1, l2, l3, l4, l5, evidence, "2026-08-17", "2026-08-17T10:00:00.000Z");

  assert.equal(snapshot.tradeDate, "20260814");
  assert.equal(generated.asOf, "2026-08-17");
  assert.equal(generated.components.B[2].period, "2026-08-14");
  assert.equal(generated.components.L[1].period, "2026-07");
  assert.deepEqual(snapshot.values["000300.SH"], { peTtm: 14.3637, pb: 1.4639, turnoverRate: 0.5, turnoverRateF: 1 });
  assert.equal(b1.broadEarningsYield, 100 / 14.3637);
  assert.equal(b1.growthEarningsYield, 100 / 44.4014);
  assert.equal(b4.totalMarketCapWan, 100000000);
  assert.equal(b4.totalMarketCapTrillion, 1);
  assert.equal(b2.weightedDividendYield, 1.6);
  assert.equal(b2.observedCount, 2);
  assert.equal(b2.observedMarketCapWan, 100000000);
  assert.equal(b2.marketCapCoverage, 100);
  assert.equal(generated.dataQuality.coverage, "100.0%");
  assert.match(generated.components.F[0].raw, /已披露样本归母净利润同比中位数 \+6\.3% \/ 有值 2家 \/ 缺失 1家/);
  assert.equal(generated.components.F[0].period, "2026-06");
  assert.equal(generated.components.F[0].release, "2026-08-15");
  assert.match(generated.components.F[1].raw, /正增长占比 50\.0% \/ 正增长 1家 \/ 有值 2家/);
  assert.equal(generated.components.F[1].period, generated.components.F[0].period);
  assert.equal(generated.components.F[1].release, generated.components.F[0].release);
  assert.equal(generated.components.F[2].raw, generated.components.B[1].raw);
  assert.equal(generated.components.F[2].period, generated.components.B[1].period);
  assert.equal(generated.components.F[2].release, generated.components.B[1].release);
  assert.equal(generated.components.F[2].coverage, generated.components.B[1].coverage);
  assert.match(generated.components.F[3].raw, /沪深300ETF有值样本总规模 1\.00万亿元 \/ 有值 1只 \/ 目标 2只/);
  assert.match(generated.components.B[2].raw, /14\.36.*1\.46.*44\.40.*6\.04/);
  assert.match(generated.components.B[4].raw, /0\.50%.*1\.00%.*2\.00%.*4\.00%.*4\.00x/);
  assert.match(generated.components.B[0].raw, /沪深300盈利收益率 6\.96%；创业板指盈利收益率 2\.25%/);
  assert.match(generated.components.B[1].raw, /A股有值样本市值加权TTM股息率 1\.60% \/ 有值 2只 \/ 市值覆盖 100\.0%/);
  assert.equal(generated.components.B[1].period, generated.components.B[2].period);
  assert.equal(generated.components.B[1].release, generated.components.B[2].release);
  assert.equal(generated.components.B[0].period, generated.components.B[2].period);
  assert.equal(generated.components.B[0].release, generated.components.B[2].release);
  assert.doesNotMatch(generated.components.B[2].raw, /盈利收益率|ERP/);
  assert.match(generated.components.B[3].raw, /A股当日记录总市值 1\.00万亿元 \/ 覆盖 2只股票/);
  assert.equal(generated.components.B[3].period, generated.components.B[2].period);
  assert.equal(generated.components.B[3].release, generated.components.B[2].release);
  assert.equal(generated.components.B[4].period, generated.components.B[2].period);
  assert.equal(generated.components.B[4].release, generated.components.B[2].release);
  assert.match(generated.components.L[0].raw, /1\.2345%.*1\.3456%.*1\.4567%.*1\.5678%.*\+0\.3333pct/);
  assert.match(generated.components.L[2].raw, /1\.2345万亿元.*22\.25万亿元.*463\.27万亿元.*7\.4%/);
  assert.match(generated.components.L[3].raw, /12\.1047万亿元（同比 \+4\.7%）.*14\.3329万亿元（同比 \+1\.5%）/);
  assert.match(generated.components.L[4].raw, /美国10年实际国债收益率 2\.41%/);
  assert.match(generated.diagnosis.headline, /F1、F2、F3、F4、L1、L2、L3、L4、L5、B1、B2、B3、B4、B5/);
  assert.doesNotMatch(generated.diagnosis.diagnosis, /其余0项/);
  assert.equal(generated.recentEvents.some((event) => event.group === "F1" && event.detail === generated.components.F[0].raw), true);
  assert.equal(generated.recentEvents.some((event) => event.group === "F2" && event.detail === generated.components.F[1].raw), true);
  assert.equal(generated.recentEvents.some((event) => event.group === "F3" && event.detail === generated.components.F[2].raw), true);
  assert.equal(generated.recentEvents.some((event) => event.group === "F4" && event.detail === generated.components.F[3].raw), true);
  assert.equal(generated.recentEvents.some((event) => event.group === "L1" && event.detail === generated.components.L[0].raw), true);
  assert.equal(generated.recentEvents.some((event) => event.group === "B5" && event.detail === generated.components.B[4].raw), true);
  assert.equal(generated.recentEvents.some((event) => event.group === "L3" && event.detail === generated.components.L[2].raw), true);
  assert.equal(generated.recentEvents.some((event) => event.group === "L4" && event.detail === generated.components.L[3].raw), true);
  assert.equal(generated.recentEvents.some((event) => event.group === "L5" && event.detail === generated.components.L[4].raw), true);
  assert.equal(generated.recentEvents.some((event) => event.group === "B1" && event.detail === generated.components.B[0].raw), true);
  assert.equal(generated.recentEvents.some((event) => event.group === "B2" && event.detail === generated.components.B[1].raw), true);
  assert.equal(generated.recentEvents.some((event) => event.group === "B4" && event.detail === generated.components.B[3].raw), true);
});

test("requests index turnover fields and records the exact nine APIs", async () => {
  const source = await generatorSource();
  assert.match(source, /"ts_code,trade_date,pe_ttm,pb,turnover_rate,turnover_rate_f"/);
  const current = await currentMarketData();
  assert.deepEqual(current.source.apis, ["index_dailybasic", "cn_m", "shibor", "sf_month", "us_trycr", "daily_basic", "fina_indicator_vip", "etf_basic", "etf_share_size"]);
});

test("selects the latest ended quarter at date boundaries", async () => {
  const { quarterEndOnOrBefore } = await marketGenerator();
  assert.equal(quarterEndOnOrBefore("2026-08-17"), "20260630");
  assert.equal(quarterEndOnOrBefore("2026-06-30"), "20260630");
  assert.equal(quarterEndOnOrBefore("2026-06-29"), "20260331");
  assert.equal(quarterEndOnOrBefore("2026-03-31"), "20260331");
  assert.equal(quarterEndOnOrBefore("2026-03-30"), "20251231");
});

test("selects both current and strictly-prior common index dates", async () => {
  const { selectLatestCommonSnapshot } = await marketGenerator();
  const row = trade_date => ({ trade_date, pe_ttm: 10, pb: 1, turnover_rate: 1, turnover_rate_f: 1 });
  const rows = { "000300.SH": [row("20260814"), row("20260813")], "399006.SZ": [row("20260814"), row("20260813")] };
  const later = selectLatestCommonSnapshot(rows, "2026-08-17");
  assert.equal(later.tradeDate, "20260814");
  assert.equal(later.priorTradeDate, "20260814");
  const sameDay = selectLatestCommonSnapshot(rows, "2026-08-14");
  assert.equal(sameDay.tradeDate, "20260814");
  assert.equal(sameDay.priorTradeDate, "20260813");
});

test("builds F4 from eligible listed CSI300 ETFs and validates size rows", async () => {
  const { buildF4Snapshot } = await marketGenerator();
  const snapshot = { priorTradeDate: "20260814" };
  const basics = [
    { ts_code: "A.SH", index_code: "000300.SH", list_status: "L", list_date: "20200101" },
    { ts_code: "B.SZ", index_code: "000300.SH", list_status: "L", list_date: "20210101" },
    { ts_code: "C.SH", index_code: "000300.SH", list_status: "L", list_date: "20260815" },
    { ts_code: "D.SH", index_code: "000300.SH", list_status: "L", list_date: null },
  ];
  const shares = [
    { ts_code: "A.SH", trade_date: "20260814", total_size: 60000000 },
    { ts_code: "B.SZ", trade_date: "20260814", total_size: 40000000 },
  ];
  assert.deepEqual(buildF4Snapshot(basics, shares, snapshot), { tradeDate: "20260814", release: "2026-08-15", eligibleCount: 2, observedCount: 2, missingCount: 0, totalSizeWan: 100000000, totalSizeTrillion: 1 });
  assert.throws(() => buildF4Snapshot([{ ...basics[0], list_date: "20260230" }], shares, snapshot), /invalid list_date/);
  assert.throws(() => buildF4Snapshot([{ ...basics[0], index_code: "000905.SH" }], shares, snapshot), /non-listed or non-CSI300/);
  assert.throws(() => buildF4Snapshot([basics[0], { ...basics[0] }], shares, snapshot), /duplicate ts_code/);
  for (const invalid of [-1, Number.NaN, Infinity, "bad"]) assert.throws(() => buildF4Snapshot([basics[0]], [{ ...shares[0], total_size: invalid }], snapshot), /invalid total_size/);
  assert.throws(() => buildF4Snapshot([basics[0]], [{ ...shares[0], total_size: null }, shares[0]], snapshot), /duplicate ts_code/);
  assert.throws(() => buildF4Snapshot([basics[0]], [{ ...shares[0], total_size: null }], snapshot), /no positive observed/);
  assert.throws(() => buildF4Snapshot([{ ...basics[0], list_date: "20260815" }], shares, snapshot), /no eligible/);
  assert.throws(() => buildF4Snapshot([basics[0]], Array.from({ length: 5000 }, () => shares[0]), snapshot), /5000-row limit/);
});

test("requests ETF basics and share sizes exactly once with strict contracts", async () => {
  const source = await generatorSource();
  assert.equal((source.match(/callTushare\("etf_basic"/g) ?? []).length, 1);
  assert.match(source, /callTushare\("etf_basic", \{ index_code: "000300\.SH", list_status: "L" \}, "ts_code,index_code,list_date,list_status"/);
  assert.equal((source.match(/callTushare\("etf_share_size"/g) ?? []).length, 1);
  assert.match(source, /callTushare\("etf_share_size", \{ trade_date: snapshot\.priorTradeDate \}, "trade_date,ts_code,total_size"/);
});

test("derives complete history month ends and ships 139 raw B3 PIT points", async () => {
  const { historyEndOnOrBefore, monthlyAsOfs } = await historyGenerator();
  assert.equal(historyEndOnOrBefore("2026-08-17"), "2026-07-31");
  assert.equal(historyEndOnOrBefore("2026-08-31"), "2026-08-31");
  assert.equal(historyEndOnOrBefore("2026-09-01"), "2026-08-31");
  assert.equal(monthlyAsOfs("2015-01-31", "2026-07-31").length, 139);
  const history = await b3HistoryData();
  assert.equal(history.schemaVersion, 1);
  assert.equal(history.points.length, 139);
  assert.deepEqual(history.range, { startAsOf: "2015-01-31", endAsOf: "2026-07-31" });
  assert.deepEqual(history.points.map(point => point.asOf), [...history.points].map(point => point.asOf).sort());
  for (const point of history.points) {
    assert.equal(point.asOf.slice(8), String(new Date(Date.UTC(Number(point.asOf.slice(0, 4)), Number(point.asOf.slice(5, 7)), 0)).getUTCDate()).padStart(2, "0"));
    assert.equal(point.releaseDate, point.periodDate);
    assert.ok(point.releaseDate <= point.asOf);
    assert.equal(point.periodDate.slice(0, 7), point.asOf.slice(0, 7));
    assert.equal(point.revisionStatus, "not_tracked");
    for (const code of ["000300.SH", "399006.SZ"]) {
      assert.ok(Number.isFinite(point.values[code].peTtm));
      assert.ok(Number.isFinite(point.values[code].pb));
    }
  }
  assert.doesNotMatch(JSON.stringify(history), /"(?:score|position|trend|percentile|zScore|normalized|signal|state)"/);
});

test("builds monthly B3 history from the latest same-month common date without fallback", async () => {
  const { buildB3MonthlyHistory } = await historyGenerator();
  const row = (ts_code, trade_date, pe_ttm = 10, pb = 1) => ({ ts_code, trade_date, pe_ttm, pb });
  const rows = {
    "000300.SH": [row("000300.SH", "20150129", 9, 0.9), row("000300.SH", "20150130", 10, 1), row("000300.SH", "20150227", 11, 1.1)],
    "399006.SZ": [row("399006.SZ", "20150129", 19, 1.9), row("399006.SZ", "20150130", 20, 2), row("399006.SZ", "20150227", 21, 2.1)],
  };
  const history = buildB3MonthlyHistory(rows, "2015-03-15", "2015-03-15T00:00:00.000Z");
  assert.equal(history.points.length, 2);
  assert.equal(history.points[0].periodDate, "2015-01-30");
  assert.equal(history.points[1].periodDate, "2015-02-27");
  for (const invalid of [null, undefined, "", Number.NaN, Infinity, "bad"]) {
    const broken = { ...rows, "000300.SH": rows["000300.SH"].map(item => item.trade_date === "20150130" ? { ...item, pe_ttm: invalid } : item) };
    assert.throws(() => buildB3MonthlyHistory(broken, "2015-03-15"), /Invalid pe_ttm/);
  }
  assert.throws(() => buildB3MonthlyHistory({ ...rows, "399006.SZ": rows["399006.SZ"].filter(item => !item.trade_date.startsWith("201502")) }, "2015-03-15"), /within 2015-02/);
  assert.throws(() => buildB3MonthlyHistory({ ...rows, "000300.SH": [...rows["000300.SH"], rows["000300.SH"][0]] }, "2015-03-15"), /duplicate trade_date/);
  assert.throws(() => buildB3MonthlyHistory({ ...rows, "000300.SH": [{ ...rows["000300.SH"][0], ts_code: "BAD" }] }, "2015-02-15"), /unexpected ts_code/);
  assert.throws(() => buildB3MonthlyHistory({ ...rows, "000300.SH": [{ ...rows["000300.SH"][0], trade_date: "20150230" }] }, "2015-02-15"), /invalid trade_date/);
  assert.throws(() => buildB3MonthlyHistory({ ...rows, "000300.SH": [] }, "2015-03-15"), /no history rows/);
  const capped = Array.from({ length: 3000 }, (_, index) => row("000300.SH", `2015${String(Math.floor(index / 31) + 1).padStart(2, "0")}${String(index % 31 + 1).padStart(2, "0")}`));
  assert.throws(() => buildB3MonthlyHistory({ ...rows, "000300.SH": capped }, "2015-03-15"), /3000-row limit/);
});

test("history generator uses exactly two strict index requests and never targets current.json", async () => {
  const source = await historyGeneratorSource();
  assert.equal((source.match(/callTushare\("index_dailybasic"/g) ?? []).length, 1);
  assert.match(source, /MARKET_INDEX_INSTRUMENTS\.map/);
  assert.match(source, /\{ ts_code: instrument\.code, start_date: START_DATE, end_date: compactDate\(historyEnd\) \}, FIELDS/);
  assert.match(source, /const START_DATE = "20150101"/);
  assert.match(source, /const FIELDS = "ts_code,trade_date,pe_ttm,pb"/);
  assert.doesNotMatch(source, /public\/data\/market-research\/current\.json/);
});

test("missing-token history failure preserves both history and current files byte-for-byte", async () => {
  const historyPath = fileURLToPath(new URL("../public/data/market-research/history/b3.json", import.meta.url));
  const currentPath = fileURLToPath(new URL("../public/data/market-research/current.json", import.meta.url));
  const beforeHistory = await readFile(historyPath);
  const beforeCurrent = await readFile(currentPath);
  const env = { ...process.env };
  delete env.TUSHARE_TOKEN;
  const result = spawnSync(process.execPath, [fileURLToPath(new URL("../scripts/generate-market-research-history-b3.mjs", import.meta.url)), "--as-of", "2026-08-17"], { cwd: fileURLToPath(new URL("..", import.meta.url)), env, encoding: "utf8" });
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /TUSHARE_TOKEN is required/);
  assert.deepEqual(await readFile(historyPath), beforeHistory);
  assert.deepEqual(await readFile(currentPath), beforeCurrent);
});

test("derives B1 monthly earnings yields from B3 with identical PIT dates", async () => {
  const { buildB1MonthlyHistory } = await b1HistoryGenerator();
  const fixture = {
    schemaVersion: 1, requestedAsOf: "2026-08-17", indicator: { id: "B3", frequency: "monthly" },
    range: { startAsOf: "2026-01-31", endAsOf: "2026-01-31" },
    points: [{ asOf: "2026-01-31", periodDate: "2026-01-30", releaseDate: "2026-01-30", revisionStatus: "not_tracked", values: { "000300.SH": { peTtm: 20 }, "399006.SZ": { peTtm: 40 } } }],
  };
  const result = buildB1MonthlyHistory(fixture, "2026-08-17", "2026-08-17T00:00:00.000Z");
  assert.equal(result.points[0].values["000300.SH"].earningsYield, 5);
  assert.equal(result.points[0].values["399006.SZ"].earningsYield, 2.5);
  assert.deepEqual({ asOf: result.points[0].asOf, periodDate: result.points[0].periodDate, releaseDate: result.points[0].releaseDate, revisionStatus: result.points[0].revisionStatus }, { asOf: "2026-01-31", periodDate: "2026-01-30", releaseDate: "2026-01-30", revisionStatus: "not_tracked" });
  for (const invalid of [null, undefined, "", Number.NaN, Infinity, "bad", 0, -10]) {
    const broken = structuredClone(fixture);
    broken.points[0].values["000300.SH"].peTtm = invalid;
    assert.throws(() => buildB1MonthlyHistory(broken, "2026-08-17"), /Invalid B3 peTtm/);
  }
  assert.throws(() => buildB1MonthlyHistory({ ...fixture, requestedAsOf: "2026-08-16" }, "2026-08-17"), /requestedAsOf/);
  assert.throws(() => buildB1MonthlyHistory({ ...fixture, schemaVersion: 2 }, "2026-08-17"), /identity/);
  assert.throws(() => buildB1MonthlyHistory({ ...fixture, points: [] }, "2026-08-17"), /range or points/);
  assert.throws(() => buildB1MonthlyHistory({ ...fixture, points: [fixture.points[0], fixture.points[0]], range: { ...fixture.range, endAsOf: fixture.points[0].asOf } }, "2026-08-17"), /unique and strictly ascending/);
  const badDate = structuredClone(fixture); badDate.points[0].releaseDate = "2026-01-29";
  assert.throws(() => buildB1MonthlyHistory(badDate, "2026-08-17"), /PIT dates/);
  const missing = structuredClone(fixture); delete missing.points[0].values["399006.SZ"];
  assert.throws(() => buildB1MonthlyHistory(missing, "2026-08-17"), /missing 399006/);
});

test("checked-in B1 history exactly derives every point from B3 without network fields", async () => {
  const [b1, b3] = await Promise.all([b1HistoryData(), b3HistoryData()]);
  assert.equal(b1.points.length, 139);
  assert.equal(b1.points.length, b3.points.length);
  assert.deepEqual(b1.range, b3.range);
  assert.equal(b1.requestedAsOf, b3.requestedAsOf);
  for (let index = 0; index < b1.points.length; index += 1) {
    for (const key of ["asOf", "periodDate", "releaseDate", "revisionStatus"]) assert.equal(b1.points[index][key], b3.points[index][key]);
    for (const code of ["000300.SH", "399006.SZ"]) assert.ok(Math.abs(b1.points[index].values[code].earningsYield - 100 / b3.points[index].values[code].peTtm) < 1e-12);
  }
  assert.doesNotMatch(JSON.stringify(b1), /"(?:score|position|trend|percentile|zScore|normalized|signal|state|riskLevel|valuationState)"/);
  const source = await readFile(fileURLToPath(new URL("../scripts/generate-market-research-history-b1.mjs", import.meta.url)), "utf8");
  assert.doesNotMatch(source, /callTushare\(|fetch\(|TUSHARE_TOKEN/);
});

test("B1 requestedAsOf failure preserves B1, B3 and current files", async () => {
  const paths = ["../public/data/market-research/history/b1.json", "../public/data/market-research/history/b3.json", "../public/data/market-research/current.json"].map(value => fileURLToPath(new URL(value, import.meta.url)));
  const before = await Promise.all(paths.map(value => readFile(value)));
  const result = spawnSync(process.execPath, [fileURLToPath(new URL("../scripts/generate-market-research-history-b1.mjs", import.meta.url)), "--as-of", "2026-08-16"], { cwd: fileURLToPath(new URL("..", import.meta.url)), encoding: "utf8" });
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /requestedAsOf/);
  const after = await Promise.all(paths.map(value => readFile(value)));
  assert.deepEqual(after, before);
});

test("validates the B3 schedule contract before building B5 history", async () => {
  const { validateB3Schedule } = await b5HistoryGenerator();
  const fixture = {
    schemaVersion: 1, requestedAsOf: "2026-08-17", indicator: { id: "B3", frequency: "monthly" },
    range: { startAsOf: "2026-01-31", endAsOf: "2026-02-28" },
    points: [
      { asOf: "2026-01-31", periodDate: "2026-01-30", releaseDate: "2026-01-30", revisionStatus: "not_tracked" },
      { asOf: "2026-02-28", periodDate: "2026-02-27", releaseDate: "2026-02-27", revisionStatus: "not_tracked" },
    ],
  };
  assert.equal(validateB3Schedule(fixture, "2026-08-17"), fixture);
  assert.throws(() => validateB3Schedule({ ...fixture, requestedAsOf: "2026-08-16" }, "2026-08-17"), /requestedAsOf/);
  assert.throws(() => validateB3Schedule({ ...fixture, points: [fixture.points[0], fixture.points[0]], range: { ...fixture.range, endAsOf: fixture.points[0].asOf } }, "2026-08-17"), /unique and strictly ascending/);
  assert.throws(() => validateB3Schedule({ ...fixture, points: [...fixture.points].reverse(), range: { startAsOf: fixture.range.endAsOf, endAsOf: fixture.range.startAsOf } }, "2026-08-17"), /unique and strictly ascending/);
  for (const [key, value] of [["releaseDate", "2026-01-29"], ["periodDate", "2025-12-31"]]) {
    const broken = structuredClone(fixture); broken.points[0][key] = value;
    assert.throws(() => validateB3Schedule(broken, "2026-08-17"), /PIT dates/);
  }
  const revision = structuredClone(fixture); revision.points[0].revisionStatus = "final";
  assert.throws(() => validateB3Schedule(revision, "2026-08-17"), /revisionStatus/);
});

test("builds B5 on exact B3 dates, validates API rows and never falls back", async () => {
  const { buildB5MonthlyHistory } = await b5HistoryGenerator();
  const b3 = {
    schemaVersion: 1, requestedAsOf: "2026-08-17", indicator: { id: "B3", frequency: "monthly" },
    range: { startAsOf: "2026-01-31", endAsOf: "2026-01-31" },
    points: [{ asOf: "2026-01-31", periodDate: "2026-01-30", releaseDate: "2026-01-30", revisionStatus: "not_tracked" }],
  };
  const row = (ts_code, trade_date, turnover_rate = 1, turnover_rate_f = 2) => ({ ts_code, trade_date, turnover_rate, turnover_rate_f });
  const rows = {
    "000300.SH": [row("000300.SH", "20260129", 9, 10), row("000300.SH", "20260130", 1, 2)],
    "399006.SZ": [row("399006.SZ", "20260129", 19, 20), row("399006.SZ", "20260130", 3, 6)],
  };
  const result = buildB5MonthlyHistory(b3, rows, "2026-08-17", "2026-08-17T00:00:00.000Z");
  assert.deepEqual(result.points[0].values, { "000300.SH": { turnoverRate: 1, turnoverRateF: 2 }, "399006.SZ": { turnoverRate: 3, turnoverRateF: 6 } });
  assert.equal(result.points[0].relativeFreeTurnover, 3);
  assert.equal(result.points[0].periodDate, "2026-01-30");

  const onlyPrior = structuredClone(rows); onlyPrior["399006.SZ"] = onlyPrior["399006.SZ"].filter(item => item.trade_date === "20260129");
  assert.throws(() => buildB5MonthlyHistory(b3, onlyPrior, "2026-08-17"), /fallback is forbidden/);
  const mutations = [
    ["unexpected ts_code", { ...rows, "000300.SH": [{ ...rows["000300.SH"][0], ts_code: "BAD" }] }],
    ["invalid trade_date", { ...rows, "000300.SH": [{ ...rows["000300.SH"][0], trade_date: "20260230" }] }],
    ["outside B5 history range", { ...rows, "000300.SH": [{ ...rows["000300.SH"][0], trade_date: "20141231" }] }],
    ["duplicate trade_date", { ...rows, "000300.SH": [rows["000300.SH"][0], rows["000300.SH"][0]] }],
    ["no B5 history rows", { ...rows, "000300.SH": [] }],
  ];
  for (const [message, broken] of mutations) assert.throws(() => buildB5MonthlyHistory(b3, broken, "2026-08-17"), new RegExp(message));
  assert.throws(() => buildB5MonthlyHistory(b3, { ...rows, "000300.SH": Array.from({ length: 3000 }, () => rows["000300.SH"][0]) }, "2026-08-17"), /3000-row limit/);

  for (const field of ["turnover_rate", "turnover_rate_f"]) for (const invalid of [null, undefined, "", Number.NaN, Infinity, "bad", -1]) {
    const broken = structuredClone(rows); broken["399006.SZ"][1][field] = invalid;
    assert.throws(() => buildB5MonthlyHistory(b3, broken, "2026-08-17"), new RegExp(`Invalid ${field}`));
  }
  const zeros = structuredClone(rows); zeros["399006.SZ"][1].turnover_rate = 0; zeros["399006.SZ"][1].turnover_rate_f = 0;
  assert.equal(buildB5MonthlyHistory(b3, zeros, "2026-08-17").points[0].relativeFreeTurnover, 0);
  const zeroDenominator = structuredClone(rows); zeroDenominator["000300.SH"][1].turnover_rate_f = 0;
  assert.throws(() => buildB5MonthlyHistory(b3, zeroDenominator, "2026-08-17"), /must be positive/);
});

test("B5 generator has exactly two strict index requests and no alternate API", async () => {
  const source = await readFile(fileURLToPath(new URL("../scripts/generate-market-research-history-b5.mjs", import.meta.url)), "utf8");
  assert.equal((source.match(/callTushare\("index_dailybasic"/g) ?? []).length, 1);
  assert.match(source, /MARKET_INDEX_INSTRUMENTS\.map/);
  assert.match(source, /\{ ts_code: instrument\.code, start_date: START_DATE, end_date: compactDate\(b3\.range\.endAsOf\) \}, FIELDS/);
  assert.match(source, /const START_DATE = "20150101"/);
  assert.match(source, /const FIELDS = "ts_code,trade_date,turnover_rate,turnover_rate_f"/);
  assert.doesNotMatch(source, /callTushare\("(?:index_daily|trade_cal|daily_basic)"/);
  assert.doesNotMatch(source, /pe_ttm|\bpb\b/);
});

test("checked-in B5 history is aligned point-for-point with B3 without scoring", async () => {
  const [b5, b3] = await Promise.all([b5HistoryData(), b3HistoryData()]);
  assert.equal(b5.points.length, 139);
  assert.equal(b5.points.length, b3.points.length);
  assert.equal(b5.requestedAsOf, b3.requestedAsOf);
  assert.deepEqual(b5.range, b3.range);
  for (let index = 0; index < b5.points.length; index += 1) {
    for (const key of ["asOf", "periodDate", "releaseDate", "revisionStatus"]) assert.equal(b5.points[index][key], b3.points[index][key]);
    const point = b5.points[index];
    assert.ok(Math.abs(point.relativeFreeTurnover - point.values["399006.SZ"].turnoverRateF / point.values["000300.SH"].turnoverRateF) < 1e-12);
  }
  assert.doesNotMatch(JSON.stringify(b5), /"(?:score|position|trend|percentile|zScore|normalized|signal|state|temperature|riskLevel)"/);
});

test("missing-token B5 failure preserves B5, B3, B1 and current files", async () => {
  const paths = ["../public/data/market-research/history/b5.json", "../public/data/market-research/history/b3.json", "../public/data/market-research/history/b1.json", "../public/data/market-research/current.json"].map(value => fileURLToPath(new URL(value, import.meta.url)));
  const before = await Promise.all(paths.map(value => readFile(value)));
  const env = { ...process.env }; delete env.TUSHARE_TOKEN;
  const result = spawnSync(process.execPath, [fileURLToPath(new URL("../scripts/generate-market-research-history-b5.mjs", import.meta.url)), "--as-of", "2026-08-17"], { cwd: fileURLToPath(new URL("..", import.meta.url)), env, encoding: "utf8" });
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /TUSHARE_TOKEN is required/);
  assert.deepEqual(await Promise.all(paths.map(value => readFile(value))), before);
});

test("validates the B3 schedule before building B2 history", async () => {
  const { validateB3Schedule } = await b2HistoryGenerator();
  const fixture = {
    schemaVersion: 1, requestedAsOf: "2026-08-17", indicator: { id: "B3", frequency: "monthly" },
    range: { startAsOf: "2026-01-31", endAsOf: "2026-02-28" },
    points: [
      { asOf: "2026-01-31", periodDate: "2026-01-30", releaseDate: "2026-01-30", revisionStatus: "not_tracked" },
      { asOf: "2026-02-28", periodDate: "2026-02-27", releaseDate: "2026-02-27", revisionStatus: "not_tracked" },
    ],
  };
  assert.equal(validateB3Schedule(fixture, "2026-08-17"), fixture);
  assert.throws(() => validateB3Schedule({ ...fixture, requestedAsOf: "2026-08-16" }, "2026-08-17"), /requestedAsOf/);
  assert.throws(() => validateB3Schedule({ ...fixture, points: [fixture.points[0], fixture.points[0]], range: { ...fixture.range, endAsOf: fixture.points[0].asOf } }, "2026-08-17"), /unique and strictly ascending/);
  assert.throws(() => validateB3Schedule({ ...fixture, points: [...fixture.points].reverse(), range: { startAsOf: fixture.range.endAsOf, endAsOf: fixture.range.startAsOf } }, "2026-08-17"), /unique and strictly ascending/);
  const badDate = structuredClone(fixture); badDate.points[0].releaseDate = "2026-01-29";
  assert.throws(() => validateB3Schedule(badDate, "2026-08-17"), /PIT dates/);
  const revision = structuredClone(fixture); revision.points[0].revisionStatus = "final";
  assert.throws(() => validateB3Schedule(revision, "2026-08-17"), /revisionStatus/);
});

test("B2 history points directly reuse production B4/B2 snapshot rules", async () => {
  const { buildB2HistoryPoint, buildB2MonthlyHistory } = await b2HistoryGenerator();
  const point = { asOf: "2026-01-31", periodDate: "2026-01-30", releaseDate: "2026-01-30", revisionStatus: "not_tracked" };
  const rows = [
    { ts_code: "A", trade_date: "20260130", total_mv: 60, dv_ttm: 2 },
    { ts_code: "B", trade_date: "20260130", total_mv: 40, dv_ttm: 1 },
  ];
  assert.deepEqual(buildB2HistoryPoint(point, rows), { ...point, stockCount: 2, observedCount: 2, missingCount: 0, totalMarketCapWan: 100, observedMarketCapWan: 100, marketCapCoverage: 100, weightedDividendYield: 1.6 });
  for (const missing of [null, undefined, ""]) {
    const result = buildB2HistoryPoint(point, [{ ...rows[0], dv_ttm: missing }, rows[1]]);
    assert.equal(result.observedCount, 1); assert.equal(result.missingCount, 1); assert.equal(result.weightedDividendYield, 1); assert.equal(result.marketCapCoverage, 40);
  }
  assert.throws(() => buildB2HistoryPoint(point, rows.map(row => ({ ...row, trade_date: "20260129" }))), /outside 20260130/);
  assert.throws(() => buildB2HistoryPoint(point, [{ ...rows[0], total_mv: 0 }, rows[1]]), /invalid total_mv/);
  assert.throws(() => buildB2HistoryPoint(point, [{ ...rows[0], dv_ttm: -1 }, rows[1]]), /invalid dv_ttm/);
  assert.throws(() => buildB2HistoryPoint(point, [rows[0], { ...rows[0] }]), /duplicate ts_code/);
  assert.throws(() => buildB2HistoryPoint(point, Array.from({ length: 6000 }, (_, index) => ({ ts_code: `S${index}`, trade_date: "20260130", total_mv: 1, dv_ttm: 1 }))), /6000-row limit/);
  const b3 = { schemaVersion: 1, requestedAsOf: "2026-08-17", indicator: { id: "B3", frequency: "monthly" }, range: { startAsOf: point.asOf, endAsOf: point.asOf }, points: [point] };
  assert.throws(() => buildB2MonthlyHistory(b3, new Map([["20260129", rows]]), "2026-08-17"), /fallback is forbidden/);
});

test("B2 history generator requests daily_basic once per B3 point with an exact contract", async () => {
  const source = await readFile(fileURLToPath(new URL("../scripts/generate-market-research-history-b2.mjs", import.meta.url)), "utf8");
  assert.equal((source.match(/callTushare\("daily_basic"/g) ?? []).length, 1);
  assert.match(source, /for \(const point of b3\.points\)/);
  assert.match(source, /callTushare\("daily_basic", \{ trade_date: compactDate\(point\.periodDate\) \}, FIELDS, token\)/);
  assert.match(source, /const FIELDS = "ts_code,trade_date,total_mv,dv_ttm"/);
  assert.doesNotMatch(source, /callTushare\("(?:daily|trade_cal|stock_basic|bak_basic)"/);
  assert.match(source, /buildB4Snapshot\(rows, snapshot\)/);
  assert.match(source, /buildB2Snapshot\(rows, snapshot, b4\)/);
});

test("checked-in B2 history is aligned with B3 and contains valid full-market snapshots", async () => {
  const [b2, b3] = await Promise.all([b2HistoryData(), b3HistoryData()]);
  assert.equal(b2.points.length, 139);
  assert.equal(b2.points.length, b3.points.length);
  assert.equal(b2.requestedAsOf, b3.requestedAsOf);
  assert.deepEqual(b2.range, b3.range);
  for (let index = 0; index < b2.points.length; index += 1) {
    const point = b2.points[index];
    for (const key of ["asOf", "periodDate", "releaseDate", "revisionStatus"]) assert.equal(point[key], b3.points[index][key]);
    assert.ok(point.stockCount > 0); assert.ok(point.observedCount > 0); assert.equal(point.missingCount, point.stockCount - point.observedCount);
    assert.ok(point.totalMarketCapWan > 0); assert.ok(point.observedMarketCapWan > 0);
    assert.ok(point.marketCapCoverage > 0 && point.marketCapCoverage <= 100);
    assert.ok(Number.isFinite(point.weightedDividendYield) && point.weightedDividendYield >= 0);
  }
  assert.doesNotMatch(JSON.stringify(b2), /"(?:score|position|trend|percentile|zScore|normalized|signal|state|valuationState|riskLevel|riskFreeRate|dividendSpread)"/);
});

test("missing-token B2 failure preserves B2, B5, B3, B1 and current files", async () => {
  const paths = ["../public/data/market-research/history/b2.json", "../public/data/market-research/history/b5.json", "../public/data/market-research/history/b3.json", "../public/data/market-research/history/b1.json", "../public/data/market-research/current.json"].map(value => fileURLToPath(new URL(value, import.meta.url)));
  const before = await Promise.all(paths.map(value => readFile(value)));
  const env = { ...process.env }; delete env.TUSHARE_TOKEN;
  const result = spawnSync(process.execPath, [fileURLToPath(new URL("../scripts/generate-market-research-history-b2.mjs", import.meta.url)), "--as-of", "2026-08-17"], { cwd: fileURLToPath(new URL("..", import.meta.url)), env, encoding: "utf8" });
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /TUSHARE_TOKEN is required/);
  assert.deepEqual(await Promise.all(paths.map(value => readFile(value))), before);
});

test("derives B4 total market cap from the minimal B2 contract at full precision", async () => {
  const { buildB4MonthlyHistory } = await b4HistoryGenerator();
  const fixture = {
    schemaVersion: 1, requestedAsOf: "2026-08-17", indicator: { id: "B2", frequency: "monthly" },
    range: { startAsOf: "2026-01-31", endAsOf: "2026-01-31" },
    source: { provider: "Tushare Pro", api: "daily_basic", fields: ["ts_code", "trade_date", "total_mv", "dv_ttm"] },
    points: [{ asOf: "2026-01-31", periodDate: "2026-01-30", releaseDate: "2026-01-30", revisionStatus: "not_tracked", stockCount: 100, totalMarketCapWan: 100000000 }],
  };
  const result = buildB4MonthlyHistory(fixture, "2026-08-17", "2026-08-17T00:00:00.000Z");
  assert.equal(result.points[0].totalMarketCapTrillion, 1);
  const precise = structuredClone(fixture); precise.points[0].totalMarketCapWan = 123456789.123456;
  assert.equal(buildB4MonthlyHistory(precise, "2026-08-17").points[0].totalMarketCapTrillion, precise.points[0].totalMarketCapWan / 100000000);
  for (const invalid of [null, undefined, "", Number.NaN, Infinity, "bad", 0, -1]) {
    const broken = structuredClone(fixture); broken.points[0].totalMarketCapWan = invalid;
    assert.throws(() => buildB4MonthlyHistory(broken, "2026-08-17"), /totalMarketCapWan/);
  }
  for (const invalid of [null, undefined, "", Number.NaN, Infinity, "bad", 0, -1, 1.5]) {
    const broken = structuredClone(fixture); broken.points[0].stockCount = invalid;
    assert.throws(() => buildB4MonthlyHistory(broken, "2026-08-17"), /stockCount/);
  }
});

test("B4 derivation fails closed on damaged B2 identity and PIT schedule", async () => {
  const { buildB4MonthlyHistory } = await b4HistoryGenerator();
  const point = (asOf, periodDate) => ({ asOf, periodDate, releaseDate: periodDate, revisionStatus: "not_tracked", stockCount: 1, totalMarketCapWan: 1 });
  const fixture = { schemaVersion: 1, requestedAsOf: "2026-08-17", indicator: { id: "B2", frequency: "monthly" }, range: { startAsOf: "2026-01-31", endAsOf: "2026-02-28" }, source: { provider: "Tushare Pro", api: "daily_basic", fields: ["total_mv"] }, points: [point("2026-01-31", "2026-01-30"), point("2026-02-28", "2026-02-27")] };
  for (const broken of [{ ...fixture, schemaVersion: 2 }, { ...fixture, indicator: { ...fixture.indicator, id: "B3" } }, { ...fixture, indicator: { ...fixture.indicator, frequency: "daily" } }]) assert.throws(() => buildB4MonthlyHistory(broken, "2026-08-17"), /identity/);
  assert.throws(() => buildB4MonthlyHistory(fixture, "2026-08-16"), /requestedAsOf/);
  assert.throws(() => buildB4MonthlyHistory({ ...fixture, points: [] }, "2026-08-17"), /range or points/);
  assert.throws(() => buildB4MonthlyHistory({ ...fixture, source: { ...fixture.source, fields: [] } }, "2026-08-17"), /source/);
  assert.throws(() => buildB4MonthlyHistory({ ...fixture, points: [fixture.points[0], fixture.points[0]], range: { ...fixture.range, endAsOf: fixture.points[0].asOf } }, "2026-08-17"), /unique and strictly ascending/);
  assert.throws(() => buildB4MonthlyHistory({ ...fixture, points: [...fixture.points].reverse(), range: { startAsOf: fixture.range.endAsOf, endAsOf: fixture.range.startAsOf } }, "2026-08-17"), /unique and strictly ascending/);
  for (const [key, value] of [["releaseDate", "2026-01-29"], ["releaseDate", "2026-02-01"], ["periodDate", "2025-12-31"]]) {
    const broken = structuredClone(fixture); broken.points[0][key] = value;
    assert.throws(() => buildB4MonthlyHistory(broken, "2026-08-17"), /PIT dates/);
  }
  const revision = structuredClone(fixture); revision.points[0].revisionStatus = "final";
  assert.throws(() => buildB4MonthlyHistory(revision, "2026-08-17"), /revisionStatus/);
  assert.throws(() => buildB4MonthlyHistory({ ...fixture, range: { ...fixture.range, startAsOf: "2025-12-31" } }, "2026-08-17"), /range does not match/);
});

test("checked-in B4 history exactly derives from B2 with zero network", async () => {
  const [b4, b2] = await Promise.all([b4HistoryData(), b2HistoryData()]);
  assert.equal(b4.points.length, 139);
  assert.equal(b4.points.length, b2.points.length);
  assert.equal(b4.requestedAsOf, b2.requestedAsOf);
  assert.deepEqual(b4.range, b2.range);
  for (let index = 0; index < b4.points.length; index += 1) {
    const actual = b4.points[index]; const input = b2.points[index];
    for (const key of ["asOf", "periodDate", "releaseDate", "revisionStatus", "stockCount", "totalMarketCapWan"]) assert.equal(actual[key], input[key]);
    assert.ok(Math.abs(actual.totalMarketCapTrillion - input.totalMarketCapWan / 100000000) < 1e-12);
  }
  assert.doesNotMatch(JSON.stringify(b4), /"(?:gdp|marketCapToGdp|score|position|trend|percentile|zScore|normalized|signal|state|valuationState|riskLevel)"/i);
  const source = await readFile(fileURLToPath(new URL("../scripts/generate-market-research-history-b4.mjs", import.meta.url)), "utf8");
  assert.doesNotMatch(source, /callTushare\(|fetch\(|TUSHARE_TOKEN/);
});

test("B4 requestedAsOf failure preserves B4, B2, B5, B3, B1 and current files", async () => {
  const paths = ["../public/data/market-research/history/b4.json", "../public/data/market-research/history/b2.json", "../public/data/market-research/history/b5.json", "../public/data/market-research/history/b3.json", "../public/data/market-research/history/b1.json", "../public/data/market-research/current.json"].map(value => fileURLToPath(new URL(value, import.meta.url)));
  const before = await Promise.all(paths.map(value => readFile(value)));
  const result = spawnSync(process.execPath, [fileURLToPath(new URL("../scripts/generate-market-research-history-b4.mjs", import.meta.url)), "--as-of", "2026-08-16"], { cwd: fileURLToPath(new URL("..", import.meta.url)), encoding: "utf8" });
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /requestedAsOf/);
  assert.deepEqual(await Promise.all(paths.map(value => readFile(value))), before);
});

test("derives the F3 cash-dividend proxy exactly from B2 coverage facts", async () => {
  const { buildF3MonthlyHistory } = await f3HistoryGenerator();
  const fixture = {
    schemaVersion: 1, requestedAsOf: "2026-08-17", indicator: { id: "B2", frequency: "monthly" }, range: { startAsOf: "2026-01-31", endAsOf: "2026-01-31" },
    source: { provider: "Tushare Pro", api: "daily_basic" },
    points: [{ asOf: "2026-01-31", periodDate: "2026-01-30", releaseDate: "2026-01-30", revisionStatus: "not_tracked", stockCount: 100, observedCount: 80, missingCount: 20, marketCapCoverage: 90, weightedDividendYield: 2.5 }],
  };
  const result = buildF3MonthlyHistory(fixture, "2026-08-17", "2026-08-17T00:00:00.000Z");
  assert.deepEqual(result.points[0], { asOf: "2026-01-31", periodDate: "2026-01-30", releaseDate: "2026-01-30", revisionStatus: "not_tracked", stockCount: 100, observedCount: 80, missingCount: 20, marketCapCoverage: 90, cashDividendYield: 2.5 });
  assert.equal(result.points[0].cashDividendYield, fixture.points[0].weightedDividendYield);
  for (const [field, invalids] of [["stockCount", [0, -1, 1.5, null, "bad"]], ["observedCount", [0, -1, 1.5, null, "bad"]], ["missingCount", [-1, 1.5, null, "bad"]]]) for (const invalid of invalids) {
    const broken = structuredClone(fixture); broken.points[0][field] = invalid;
    assert.throws(() => buildF3MonthlyHistory(broken, "2026-08-17"), new RegExp(field));
  }
  const mismatch = structuredClone(fixture); mismatch.points[0].missingCount = 19;
  assert.throws(() => buildF3MonthlyHistory(mismatch, "2026-08-17"), /missingCount/);
  for (const invalid of [null, undefined, "", Number.NaN, Infinity, "bad", 0, -1, 100.01]) {
    const broken = structuredClone(fixture); broken.points[0].marketCapCoverage = invalid;
    assert.throws(() => buildF3MonthlyHistory(broken, "2026-08-17"), /marketCapCoverage/);
  }
  for (const invalid of [null, undefined, "", Number.NaN, Infinity, "bad", -1]) {
    const broken = structuredClone(fixture); broken.points[0].weightedDividendYield = invalid;
    assert.throws(() => buildF3MonthlyHistory(broken, "2026-08-17"), /weightedDividendYield/);
  }
  const zero = structuredClone(fixture); zero.points[0].weightedDividendYield = 0;
  assert.equal(buildF3MonthlyHistory(zero, "2026-08-17").points[0].cashDividendYield, 0);
});

test("F3 derivation fails closed on damaged B2 identity and PIT schedule", async () => {
  const { buildF3MonthlyHistory } = await f3HistoryGenerator();
  const point = (asOf, periodDate) => ({ asOf, periodDate, releaseDate: periodDate, revisionStatus: "not_tracked", stockCount: 2, observedCount: 1, missingCount: 1, marketCapCoverage: 50, weightedDividendYield: 1 });
  const fixture = { schemaVersion: 1, requestedAsOf: "2026-08-17", indicator: { id: "B2", frequency: "monthly" }, range: { startAsOf: "2026-01-31", endAsOf: "2026-02-28" }, source: { provider: "Tushare Pro", api: "daily_basic" }, points: [point("2026-01-31", "2026-01-30"), point("2026-02-28", "2026-02-27")] };
  for (const broken of [{ ...fixture, schemaVersion: 2 }, { ...fixture, indicator: { ...fixture.indicator, id: "B3" } }, { ...fixture, indicator: { ...fixture.indicator, frequency: "daily" } }]) assert.throws(() => buildF3MonthlyHistory(broken, "2026-08-17"), /identity/);
  assert.throws(() => buildF3MonthlyHistory(fixture, "2026-08-16"), /requestedAsOf/);
  assert.throws(() => buildF3MonthlyHistory({ ...fixture, points: [] }, "2026-08-17"), /range or points/);
  assert.throws(() => buildF3MonthlyHistory({ ...fixture, points: [fixture.points[0], fixture.points[0]], range: { ...fixture.range, endAsOf: fixture.points[0].asOf } }, "2026-08-17"), /unique and strictly ascending/);
  assert.throws(() => buildF3MonthlyHistory({ ...fixture, points: [...fixture.points].reverse(), range: { startAsOf: fixture.range.endAsOf, endAsOf: fixture.range.startAsOf } }, "2026-08-17"), /unique and strictly ascending/);
  for (const [key, value] of [["releaseDate", "2026-01-29"], ["releaseDate", "2026-02-01"], ["periodDate", "2025-12-31"]]) {
    const broken = structuredClone(fixture); broken.points[0][key] = value;
    assert.throws(() => buildF3MonthlyHistory(broken, "2026-08-17"), /PIT dates/);
  }
  const revision = structuredClone(fixture); revision.points[0].revisionStatus = "final";
  assert.throws(() => buildF3MonthlyHistory(revision, "2026-08-17"), /revisionStatus/);
  assert.throws(() => buildF3MonthlyHistory({ ...fixture, range: { ...fixture.range, startAsOf: "2025-12-31" } }, "2026-08-17"), /range does not match/);
});

test("checked-in F3 history exactly maps B2 with zero network and no complete-F3 claims", async () => {
  const [f3, b2] = await Promise.all([f3HistoryData(), b2HistoryData()]);
  assert.equal(f3.points.length, 139); assert.equal(f3.points.length, b2.points.length); assert.equal(f3.requestedAsOf, b2.requestedAsOf); assert.deepEqual(f3.range, b2.range);
  for (let index = 0; index < f3.points.length; index += 1) {
    const actual = f3.points[index]; const input = b2.points[index];
    for (const key of ["asOf", "periodDate", "releaseDate", "revisionStatus", "stockCount", "observedCount", "missingCount", "marketCapCoverage"]) assert.equal(actual[key], input[key]);
    assert.equal(actual.cashDividendYield, input.weightedDividendYield);
  }
  assert.doesNotMatch(JSON.stringify(f3), /"(?:buyback|repurchase|ipo|seasonedOffering|equityFinancing|netEquityIssuance|shareholderYield|netShareholderYield|score|position|trend|percentile|zScore|normalized|signal|state)"/i);
  const source = await readFile(fileURLToPath(new URL("../scripts/generate-market-research-history-f3.mjs", import.meta.url)), "utf8");
  assert.doesNotMatch(source, /callTushare\(|fetch\(|TUSHARE_TOKEN/);
});

test("F3 requestedAsOf failure preserves F3, B4, B2, B5, B3, B1 and current files", async () => {
  const paths = ["../public/data/market-research/history/f3.json", "../public/data/market-research/history/b4.json", "../public/data/market-research/history/b2.json", "../public/data/market-research/history/b5.json", "../public/data/market-research/history/b3.json", "../public/data/market-research/history/b1.json", "../public/data/market-research/current.json"].map(value => fileURLToPath(new URL(value, import.meta.url)));
  const before = await Promise.all(paths.map(value => readFile(value)));
  const result = spawnSync(process.execPath, [fileURLToPath(new URL("../scripts/generate-market-research-history-f3.mjs", import.meta.url)), "--as-of", "2026-08-16"], { cwd: fileURLToPath(new URL("..", import.meta.url)), encoding: "utf8" });
  assert.notEqual(result.status, 0); assert.match(result.stderr, /requestedAsOf/);
  assert.deepEqual(await Promise.all(paths.map(value => readFile(value))), before);
});

test("maps the checked-in monthly schedule to 47 exact ended quarters", async () => {
  const { validateMonthlySchedule } = await f1HistoryGenerator();
  const b3 = await b3HistoryData(); validateMonthlySchedule(b3, "2026-08-17");
  const { quarterEndOnOrBefore } = await marketGenerator();
  assert.equal(quarterEndOnOrBefore("2015-01-31"), "20141231");
  assert.equal(quarterEndOnOrBefore("2015-02-28"), "20141231");
  assert.equal(quarterEndOnOrBefore("2015-03-31"), "20150331");
  assert.equal(quarterEndOnOrBefore("2015-04-30"), "20150331");
  assert.equal(quarterEndOnOrBefore("2026-07-31"), "20260630");
  const periods = [...new Set(b3.points.map(point => quarterEndOnOrBefore(point.asOf)))].sort();
  assert.equal(b3.points.length, 139); assert.equal(periods.length, 47); assert.equal(periods[0], "20141231"); assert.equal(periods.at(-1), "20260630");
  assert.throws(() => validateMonthlySchedule({ ...b3, requestedAsOf: "2026-08-16" }, "2026-08-17"), /requestedAsOf/);
  assert.throws(() => validateMonthlySchedule({ ...b3, points: [b3.points[0], b3.points[0]], range: { ...b3.range, endAsOf: b3.points[0].asOf } }, "2026-08-17"), /unique and strictly ascending/);
  assert.throws(() => validateMonthlySchedule({ ...b3, range: { ...b3.range, startAsOf: "2014-12-31" } }, "2026-08-17"), /range does not match/);
});

test("builds F1 monthly PIT without leaking future announcements", async () => {
  const { buildF1MonthlyHistory } = await f1HistoryGenerator();
  const schedule = { schemaVersion: 1, requestedAsOf: "2026-08-17", indicator: { id: "B3", frequency: "monthly" }, range: { startAsOf: "2026-04-30", endAsOf: "2026-05-31" }, points: [{ asOf: "2026-04-30" }, { asOf: "2026-05-31" }] };
  const rows = [{ ts_code: "A", ann_date: "20260420", end_date: "20260331", netprofit_yoy: 10 }, { ts_code: "B", ann_date: "20260515", end_date: "20260331", netprofit_yoy: 30 }];
  const history = buildF1MonthlyHistory(schedule, new Map([["20260331", rows]]), "2026-08-17", "2026-08-17T00:00:00.000Z");
  assert.deepEqual(history.points[0], { asOf: "2026-04-30", periodDate: "2026-03-31", releaseDate: "2026-04-20", revisionStatus: "not_tracked", dataStatus: "generated", reportedCount: 1, validCount: 1, missingCount: 0, medianNetProfitYoy: 10 });
  assert.deepEqual(history.points[1], { asOf: "2026-05-31", periodDate: "2026-03-31", releaseDate: "2026-05-15", revisionStatus: "not_tracked", dataStatus: "generated", reportedCount: 2, validCount: 2, missingCount: 0, medianNetProfitYoy: 20 });
});

test("marks the latest ended quarter unavailable without falling back", async () => {
  const { buildF1MonthlyHistory } = await f1HistoryGenerator();
  const schedule = { schemaVersion: 1, requestedAsOf: "2026-08-17", indicator: { id: "B3", frequency: "monthly" }, range: { startAsOf: "2026-03-31", endAsOf: "2026-03-31" }, points: [{ asOf: "2026-03-31" }] };
  const batches = new Map([["20260331", [{ ts_code: "A", ann_date: "20260420", end_date: "20260331", netprofit_yoy: 10 }]], ["20251231", [{ ts_code: "OLD", ann_date: "20260301", end_date: "20251231", netprofit_yoy: 99 }]]]);
  assert.deepEqual(buildF1MonthlyHistory(schedule, batches, "2026-08-17").points[0], { asOf: "2026-03-31", periodDate: "2026-03-31", releaseDate: null, revisionStatus: "not_tracked", dataStatus: "unavailable", reportedCount: 0, validCount: 0, missingCount: 0, medianNetProfitYoy: null });
  const failures = [
    [[{ ts_code: "A", ann_date: "20260301", end_date: "20260331", netprofit_yoy: null }], /no valid netprofit_yoy/],
    [[{ ts_code: "A", ann_date: "bad", end_date: "20260331", netprofit_yoy: 1 }], /invalid ann_date/],
    [[{ ts_code: "A", ann_date: "20260301", end_date: "20260331", netprofit_yoy: "bad" }], /invalid netprofit_yoy/],
    [[{ ts_code: "", ann_date: "20260301", end_date: "20260331", netprofit_yoy: 1 }], /empty ts_code/],
    [[{ ts_code: "A", ann_date: "20260301", end_date: "20260331", netprofit_yoy: 1 }, { ts_code: "A", ann_date: "20260301", end_date: "20260331", netprofit_yoy: 2 }], /conflicting netprofit_yoy/],
  ];
  for (const [rows, expected] of failures) {
    assert.throws(() => buildF1MonthlyHistory(schedule, new Map([["20260331", rows]]), "2026-08-17"), expected);
  }
});

test("validates each F1 quarter batch without invented row limits", async () => {
  const { validateQuarterBatch } = await f1HistoryGenerator();
  const row = end_date => ({ ts_code: "A", ann_date: "20260701", end_date, netprofit_yoy: 1 });
  assert.equal(validateQuarterBatch([row("20260630")], "20260630").length, 1);
  assert.throws(() => validateQuarterBatch([], "20260630"), /no rows/);
  for (const invalid of ["20260331", null, undefined, "", "20260230", "bad"]) assert.throws(() => validateQuarterBatch([row(invalid)], "20260630"), /invalid or mismatched end_date/);
});

test("resolves same-day F1 revisions by official initial-version semantics", async () => {
  const { resolveF1SameDayRevisions } = await f1HistoryGenerator();
  const base = { ts_code: "300367.SZ", ann_date: "20160203", end_date: "20151231" };
  const conflict = [{ ...base, netprofit_yoy: 81.7464, update_flag: "1" }, { ...base, netprofit_yoy: 83.0011, update_flag: "0" }];
  for (const rows of [conflict, [...conflict].reverse()]) assert.equal(resolveF1SameDayRevisions(rows, "20151231")[0].netprofit_yoy, 83.0011);
  const same = [{ ...base, netprofit_yoy: 20, update_flag: 0 }, { ...base, netprofit_yoy: 20, update_flag: 1 }];
  assert.equal(resolveF1SameDayRevisions(same, "20151231")[0].netprofit_yoy, 20);
  const nullAndFiniteInitial = [{ ...base, netprofit_yoy: null, update_flag: 0 }, { ...base, netprofit_yoy: 20, update_flag: "0" }, { ...base, netprofit_yoy: 30, update_flag: "1" }];
  assert.equal(resolveF1SameDayRevisions(nullAndFiniteInitial, "20151231")[0].netprofit_yoy, 20);
  const ambiguousInitial = [{ ...base, netprofit_yoy: 20, update_flag: 0 }, { ...base, netprofit_yoy: 30, update_flag: 0 }, { ...base, netprofit_yoy: 40, update_flag: 1 }];
  assert.equal(resolveF1SameDayRevisions(ambiguousInitial, "20151231")[0].netprofit_yoy, null);
  assert.throws(() => resolveF1SameDayRevisions([{ ...base, netprofit_yoy: 20, update_flag: "2" }], "20151231"), /invalid update_flag/);
});

test("maps unresolved F1 revision conflicts to reported missing without old-announcement fallback", async () => {
  const { resolveF1SameDayRevisions, buildF1MonthlyHistory } = await f1HistoryGenerator();
  const period = "20260331";
  const rows = [
    { ts_code: "A", ann_date: "20260420", end_date: period, netprofit_yoy: 10, update_flag: 0 },
    { ts_code: "A", ann_date: "20260515", end_date: period, netprofit_yoy: 20, update_flag: 1 },
    { ts_code: "A", ann_date: "20260515", end_date: period, netprofit_yoy: 30, update_flag: 1 },
    { ts_code: "B", ann_date: "20260510", end_date: period, netprofit_yoy: 40, update_flag: 0 },
  ];
  const canonical = resolveF1SameDayRevisions(rows, period);
  const unresolved = canonical.find(row => row.ts_code === "A" && row.ann_date === "20260515"); assert.equal(unresolved.netprofit_yoy, null);
  const schedule = { schemaVersion: 1, requestedAsOf: "2026-08-17", indicator: { id: "B3", frequency: "monthly" }, range: { startAsOf: "2026-05-31", endAsOf: "2026-05-31" }, points: [{ asOf: "2026-05-31" }] };
  const point = buildF1MonthlyHistory(schedule, new Map([[period, canonical]]), "2026-08-17").points[0];
  assert.equal(point.dataStatus, "generated"); assert.equal(point.reportedCount, 2); assert.equal(point.validCount, 1); assert.equal(point.missingCount, 1); assert.equal(point.medianNetProfitYoy, 40);
});

test("F1 history generator has one sequential 47-period API expression and reuses production logic", async () => {
  const source = await readFile(fileURLToPath(new URL("../scripts/generate-market-research-history-f1.mjs", import.meta.url)), "utf8");
  assert.equal((source.match(/callTushare\("fina_indicator_vip"/g) ?? []).length, 1);
  assert.match(source, /for \(const period of targetPeriods\)/);
  assert.match(source, /callTushare\("fina_indicator_vip", \{ period \}, FIELDS, token\)/);
  assert.match(source, /const FIELDS = "ts_code,ann_date,end_date,netprofit_yoy,update_flag"/);
  assert.match(source, /buildF1Snapshot/); assert.match(source, /quarterEndOnOrBefore/);
  assert.doesNotMatch(source, /callTushare\("(?:fina_indicator|income|forecast|express|daily_basic|trade_cal)"/);
  assert.doesNotMatch(source, /latestByCompany|positiveCount|positiveShare|Promise\.all/);
});

test("checked-in F1 history is a complete announcement-date PIT series", async () => {
  const [f1, b3] = await Promise.all([f1HistoryData(), b3HistoryData()]);
  const { quarterEndOnOrBefore } = await marketGenerator();
  assert.equal(f1.schemaVersion, 1); assert.equal(f1.requestedAsOf, b3.requestedAsOf); assert.deepEqual(f1.range, b3.range); assert.equal(f1.points.length, 139);
  let generatedCount = 0; let unavailableCount = 0;
  for (let index = 0; index < f1.points.length; index += 1) {
    const point = f1.points[index]; assert.equal(point.asOf, b3.points[index].asOf); assert.equal(point.periodDate, `${quarterEndOnOrBefore(point.asOf).slice(0, 4)}-${quarterEndOnOrBefore(point.asOf).slice(4, 6)}-${quarterEndOnOrBefore(point.asOf).slice(6, 8)}`); assert.equal(point.revisionStatus, "not_tracked");
    if (point.dataStatus === "generated") { generatedCount += 1; assert.ok(point.releaseDate >= point.periodDate && point.releaseDate <= point.asOf); assert.ok(Number.isInteger(point.reportedCount) && point.reportedCount > 0); assert.ok(Number.isInteger(point.validCount) && point.validCount > 0); assert.ok(Number.isInteger(point.missingCount) && point.missingCount >= 0); assert.equal(point.validCount + point.missingCount, point.reportedCount); assert.ok(Number.isFinite(point.medianNetProfitYoy)); }
    else { unavailableCount += 1; assert.equal(point.dataStatus, "unavailable"); assert.equal(point.releaseDate, null); assert.equal(point.reportedCount, 0); assert.equal(point.validCount, 0); assert.equal(point.missingCount, 0); assert.equal(point.medianNetProfitYoy, null); }
  }
  assert.equal(generatedCount + unavailableCount, 139);
  assert.deepEqual(f1.source.fields, ["ts_code", "ann_date", "end_date", "netprofit_yoy", "update_flag"]);
  assert.equal(f1.source.revisionField, "update_flag");
  assert.doesNotMatch(JSON.stringify(f1), /"(?:positiveCount|positiveShare|score|position|trend|percentile|zScore|normalized|signal|state|growthState|riskLevel)"/);
});

test("missing-token F1 failure preserves F1, F3, B1-B5 and current files", async () => {
  const paths = ["../public/data/market-research/history/f1.json", "../public/data/market-research/history/f3.json", "../public/data/market-research/history/b1.json", "../public/data/market-research/history/b2.json", "../public/data/market-research/history/b3.json", "../public/data/market-research/history/b4.json", "../public/data/market-research/history/b5.json", "../public/data/market-research/current.json"].map(value => fileURLToPath(new URL(value, import.meta.url)));
  const before = await Promise.all(paths.map(value => readFile(value)));
  const env = { ...process.env }; delete env.TUSHARE_TOKEN;
  const result = spawnSync(process.execPath, [fileURLToPath(new URL("../scripts/generate-market-research-history-f1.mjs", import.meta.url)), "--as-of", "2026-08-17"], { cwd: fileURLToPath(new URL("..", import.meta.url)), env, encoding: "utf8" });
  assert.notEqual(result.status, 0); assert.match(result.stderr, /TUSHARE_TOKEN is required/); assert.deepEqual(await Promise.all(paths.map(value => readFile(value))), before);
});

test("builds F2 breadth from the exact F1 disclosed sample", async () => {
  const { buildF2MonthlyHistory } = await f2HistoryGenerator();
  const point = { asOf: "2026-05-31", periodDate: "2026-03-31", releaseDate: "2026-05-15", revisionStatus: "not_tracked", dataStatus: "generated", reportedCount: 4, validCount: 3, missingCount: 1, medianNetProfitYoy: 0 };
  const f1 = { schemaVersion: 1, requestedAsOf: "2026-08-17", indicator: { id: "F1", frequency: "monthly" }, range: { startAsOf: point.asOf, endAsOf: point.asOf }, source: { provider: "Tushare Pro", api: "fina_indicator_vip", fields: ["ts_code", "ann_date", "end_date", "netprofit_yoy", "update_flag"] }, points: [point] };
  const rows = [{ ts_code: "A", ann_date: "20260515", end_date: "20260331", netprofit_yoy: 10 }, { ts_code: "B", ann_date: "20260515", end_date: "20260331", netprofit_yoy: 0 }, { ts_code: "C", ann_date: "20260515", end_date: "20260331", netprofit_yoy: -5 }, { ts_code: "D", ann_date: "20260515", end_date: "20260331", netprofit_yoy: null }];
  const result = buildF2MonthlyHistory(f1, new Map([["20260331", rows]]), "2026-08-17").points[0];
  assert.deepEqual(result, { asOf: point.asOf, periodDate: point.periodDate, releaseDate: point.releaseDate, revisionStatus: "not_tracked", dataStatus: "generated", reportedCount: 4, validCount: 3, missingCount: 1, positiveCount: 1, positiveShare: 1 / 3 * 100 });
  const zeroRows = [{ ts_code: "A", ann_date: "20260515", end_date: "20260331", netprofit_yoy: 0 }, { ts_code: "B", ann_date: "20260515", end_date: "20260331", netprofit_yoy: -1 }];
  const zeroReference = structuredClone(f1); zeroReference.points[0].reportedCount = 2; zeroReference.points[0].validCount = 2; zeroReference.points[0].missingCount = 0; zeroReference.points[0].medianNetProfitYoy = -0.5;
  const zero = buildF2MonthlyHistory(zeroReference, new Map([["20260331", zeroRows]]), "2026-08-17").points[0]; assert.equal(zero.positiveCount, 0); assert.equal(zero.positiveShare, 0);
});

test("F2 preserves future-announcement PIT and unavailable states", async () => {
  const { buildF2MonthlyHistory } = await f2HistoryGenerator();
  const source = { provider: "Tushare Pro", api: "fina_indicator_vip", fields: ["ts_code", "ann_date", "end_date", "netprofit_yoy", "update_flag"] };
  const refs = [
    { asOf: "2026-04-30", periodDate: "2026-03-31", releaseDate: "2026-04-20", revisionStatus: "not_tracked", dataStatus: "generated", reportedCount: 1, validCount: 1, missingCount: 0, medianNetProfitYoy: 10 },
    { asOf: "2026-05-31", periodDate: "2026-03-31", releaseDate: "2026-05-15", revisionStatus: "not_tracked", dataStatus: "generated", reportedCount: 2, validCount: 2, missingCount: 0, medianNetProfitYoy: -10 },
  ];
  const f1 = { schemaVersion: 1, requestedAsOf: "2026-08-17", indicator: { id: "F1", frequency: "monthly" }, range: { startAsOf: refs[0].asOf, endAsOf: refs[1].asOf }, source, points: refs };
  const rows = [{ ts_code: "A", ann_date: "20260420", end_date: "20260331", netprofit_yoy: 10 }, { ts_code: "B", ann_date: "20260515", end_date: "20260331", netprofit_yoy: -30 }];
  const history = buildF2MonthlyHistory(f1, new Map([["20260331", rows]]), "2026-08-17"); assert.equal(history.points[0].positiveShare, 100); assert.equal(history.points[1].positiveShare, 50);
  const unavailable = { ...refs[0], asOf: "2026-03-31", periodDate: "2026-03-31", releaseDate: null, dataStatus: "unavailable", reportedCount: 0, validCount: 0, missingCount: 0, medianNetProfitYoy: null };
  const unavailableF1 = { ...f1, range: { startAsOf: unavailable.asOf, endAsOf: unavailable.asOf }, points: [unavailable] };
  const result = buildF2MonthlyHistory(unavailableF1, new Map([["20260331", rows]]), "2026-08-17").points[0]; assert.equal(result.dataStatus, "unavailable"); assert.equal(result.positiveCount, 0); assert.equal(result.positiveShare, null);
});

test("F2 fails closed on any F1 reference or status drift", async () => {
  const { buildF2MonthlyHistory } = await f2HistoryGenerator();
  const base = { asOf: "2026-05-31", periodDate: "2026-03-31", releaseDate: "2026-05-15", revisionStatus: "not_tracked", dataStatus: "generated", reportedCount: 2, validCount: 2, missingCount: 0, medianNetProfitYoy: 20 };
  const f1 = { schemaVersion: 1, requestedAsOf: "2026-08-17", indicator: { id: "F1", frequency: "monthly" }, range: { startAsOf: base.asOf, endAsOf: base.asOf }, source: { provider: "Tushare Pro", api: "fina_indicator_vip", fields: ["ts_code", "ann_date", "end_date", "netprofit_yoy", "update_flag"] }, points: [base] };
  const rows = [{ ts_code: "A", ann_date: "20260515", end_date: "20260331", netprofit_yoy: 10 }, { ts_code: "B", ann_date: "20260515", end_date: "20260331", netprofit_yoy: 30 }];
  for (const [field, value] of [["reportedCount", 3], ["validCount", 1], ["releaseDate", "2026-05-14"], ["medianNetProfitYoy", 21]]) { const broken = structuredClone(f1); broken.points[0][field] = value; assert.throws(() => buildF2MonthlyHistory(broken, new Map([["20260331", rows]]), "2026-08-17"), /reference mismatch|Invalid generated/); }
  const futureOnly = [{ ts_code: "A", ann_date: "20260601", end_date: "20260331", netprofit_yoy: 10 }]; assert.throws(() => buildF2MonthlyHistory(f1, new Map([["20260331", futureOnly]]), "2026-08-17"), /generated status mismatch/);
  const unavailable = structuredClone(f1); unavailable.points[0] = { ...base, releaseDate: null, dataStatus: "unavailable", reportedCount: 0, validCount: 0, missingCount: 0, medianNetProfitYoy: null };
  assert.throws(() => buildF2MonthlyHistory(unavailable, new Map([["20260331", rows]]), "2026-08-17"), /unavailable status mismatch/);
});

test("F2 generator reuses F1 revision helpers and one sequential API expression", async () => {
  const source = await readFile(fileURLToPath(new URL("../scripts/generate-market-research-history-f2.mjs", import.meta.url)), "utf8");
  assert.equal((source.match(/callTushare\("fina_indicator_vip"/g) ?? []).length, 1); assert.match(source, /for \(const period of targetPeriods\)/); assert.match(source, /callTushare\("fina_indicator_vip", \{ period \}, FIELDS, token\)/); assert.match(source, /const FIELDS = "ts_code,ann_date,end_date,netprofit_yoy,update_flag"/);
  assert.match(source, /import \{ resolveF1SameDayRevisions, validateQuarterBatch \} from "\.\/generate-market-research-history-f1\.mjs"/); assert.doesNotMatch(source, /function resolveF1SameDayRevisions|Promise\.all/);
});

test("checked-in F2 history exactly aligns with F1 and contains only breadth", async () => {
  const [f2, f1] = await Promise.all([f2HistoryData(), f1HistoryData()]);
  assert.equal(f2.points.length, 139); assert.equal(f2.points.length, f1.points.length); assert.equal(f2.requestedAsOf, f1.requestedAsOf); assert.deepEqual(f2.range, f1.range);
  for (let index = 0; index < f2.points.length; index += 1) { const actual = f2.points[index]; const reference = f1.points[index]; for (const key of ["asOf", "periodDate", "releaseDate", "revisionStatus", "dataStatus", "reportedCount", "validCount", "missingCount"]) assert.equal(actual[key], reference[key]); if (actual.dataStatus === "generated") { assert.ok(Number.isInteger(actual.positiveCount) && actual.positiveCount >= 0 && actual.positiveCount <= actual.validCount); assert.ok(Number.isFinite(actual.positiveShare) && actual.positiveShare >= 0 && actual.positiveShare <= 100); assert.ok(Math.abs(actual.positiveShare - actual.positiveCount / actual.validCount * 100) < 1e-12); } else { assert.equal(actual.positiveCount, 0); assert.equal(actual.positiveShare, null); } }
  assert.doesNotMatch(JSON.stringify(f2), /"(?:medianNetProfitYoy|score|position|trend|percentile|zScore|normalized|signal|state|roe|earningsQuality|qualityScore)"/i);
});

test("missing-token F2 failure preserves F2, F1, F3, B1-B5 and current files", async () => {
  const paths = ["../public/data/market-research/history/f2.json", "../public/data/market-research/history/f1.json", "../public/data/market-research/history/f3.json", "../public/data/market-research/history/b1.json", "../public/data/market-research/history/b2.json", "../public/data/market-research/history/b3.json", "../public/data/market-research/history/b4.json", "../public/data/market-research/history/b5.json", "../public/data/market-research/current.json"].map(value => fileURLToPath(new URL(value, import.meta.url)));
  const before = await Promise.all(paths.map(value => readFile(value))); const env = { ...process.env }; delete env.TUSHARE_TOKEN;
  const result = spawnSync(process.execPath, [fileURLToPath(new URL("../scripts/generate-market-research-history-f2.mjs", import.meta.url)), "--as-of", "2026-08-17"], { cwd: fileURLToPath(new URL("..", import.meta.url)), env, encoding: "utf8" }); assert.notEqual(result.status, 0); assert.match(result.stderr, /TUSHARE_TOKEN is required/); assert.deepEqual(await Promise.all(paths.map(value => readFile(value))), before);
});

test("builds L1 month ends with the production SHIBOR selector", async () => {
  const { buildL1MonthlyHistory } = await l1HistoryGenerator();
  const schedule = { schemaVersion: 1, requestedAsOf: "2026-08-17", indicator: { id: "B3", frequency: "monthly" }, range: { startAsOf: "2026-01-31", endAsOf: "2026-07-31" }, points: [{ asOf: "2026-01-31" }, { asOf: "2026-07-31" }] };
  const rows = [{ date: "20260129", on: 1.1, "1w": 1.2, "3m": 1.3, "1y": 1.4 }, { date: "20260130", on: 1.2, "1w": 1.3, "3m": 1.4, "1y": 1.6 }];
  const july = [{ date: "20260731", on: -0.2, "1w": -0.1, "3m": 0, "1y": 0.1 }];
  const result = buildL1MonthlyHistory(schedule, new Map([["2026", [...rows, ...july]]]), "2026-08-17");
  assert.deepEqual(result.points[0], { asOf: "2026-01-31", periodDate: "2026-01-30", releaseDate: "2026-01-30", revisionStatus: "not_tracked", overnight: 1.2, oneWeek: 1.3, threeMonth: 1.4, oneYear: 1.6, termSpread: 0.40000000000000013 });
  assert.deepEqual(result.points[1], { asOf: "2026-07-31", periodDate: "2026-07-31", releaseDate: "2026-07-31", revisionStatus: "not_tracked", overnight: -0.2, oneWeek: -0.1, threeMonth: 0, oneYear: 0.1, termSpread: 0.30000000000000004 });
  for (const field of ["on", "1w", "3m", "1y"]) for (const invalid of [null, "", Number.NaN, Infinity, "bad"]) { const broken = structuredClone(rows); broken[1][field] = invalid; assert.throws(() => buildL1MonthlyHistory({ ...schedule, range: { startAsOf: "2026-01-31", endAsOf: "2026-01-31" }, points: [schedule.points[0]] }, new Map([["2026", broken]]), "2026-08-17"), /Invalid SHIBOR/); }
});

test("validates annual SHIBOR batches and the monthly schedule", async () => {
  const { validateMonthlySchedule, validateShiborYearBatch } = await l1HistoryGenerator();
  const schedule = { schemaVersion: 1, requestedAsOf: "2026-08-17", indicator: { id: "B3", frequency: "monthly" }, range: { startAsOf: "2026-01-31", endAsOf: "2026-01-31" }, points: [{ asOf: "2026-01-31" }] };
  assert.equal(validateMonthlySchedule(schedule, "2026-08-17"), schedule); assert.throws(() => validateMonthlySchedule({ ...schedule, requestedAsOf: "2026-08-16" }, "2026-08-17"), /requestedAsOf/); assert.throws(() => validateMonthlySchedule({ ...schedule, points: [schedule.points[0], schedule.points[0]] }, "2026-08-17"), /unique and strictly ascending/);
  const row = date => ({ date, on: 1, "1w": 1, "3m": 1, "1y": 1 });
  assert.equal(validateShiborYearBatch([row("20260130")], "2026", "20260101", "20260731").length, 1);
  assert.throws(() => validateShiborYearBatch([], "2026", "20260101", "20260731"), /no rows/);
  assert.throws(() => validateShiborYearBatch([row("20260230")], "2026", "20260101", "20260731"), /invalid date/);
  assert.throws(() => validateShiborYearBatch([row("20260801")], "2026", "20260101", "20260731"), /outside/);
  assert.throws(() => validateShiborYearBatch([row("20260130"), row("20260130")], "2026", "20260101", "20260731"), /duplicate date/);
  assert.throws(() => validateShiborYearBatch(Array.from({ length: 2000 }, (_, index) => row(String(20260101 + index))), "2026", "20260101", "20260731"), /2000-row limit/);
});

test("L1 generator makes one sequential SHIBOR request per calendar year", async () => {
  const source = await readFile(fileURLToPath(new URL("../scripts/generate-market-research-history-l1.mjs", import.meta.url)), "utf8");
  assert.equal((source.match(/callTushare\("shibor"/g) ?? []).length, 1); assert.match(source, /for \(const year of years\)/); assert.match(source, /callTushare\("shibor", \{ start_date: startDate, end_date: endDate \}, FIELDS, token\)/); assert.match(source, /const FIELDS = "date,on,1w,3m,1y"/); assert.match(source, /selectLatestShiborSnapshot/); assert.doesNotMatch(source, /callTushare\("(?:shibor_quote|shibor_lpr|trade_cal|cn_cpi)"|Promise\.all/);
  const b3 = await b3HistoryData(); const first = Number(b3.range.startAsOf.slice(0, 4)); const last = Number(b3.range.endAsOf.slice(0, 4)); const years = Array.from({ length: last - first + 1 }, (_, index) => String(first + index)); assert.equal(years.length, 12); assert.equal(years[0], "2015"); assert.equal(years.at(-1), "2026");
});

test("checked-in L1 history is a complete nominal SHIBOR monthly series", async () => {
  const [l1, b3] = await Promise.all([l1HistoryData(), b3HistoryData()]); assert.equal(l1.points.length, 139); assert.equal(l1.requestedAsOf, b3.requestedAsOf); assert.deepEqual(l1.range, b3.range);
  for (let index = 0; index < l1.points.length; index += 1) { const point = l1.points[index]; assert.equal(point.asOf, b3.points[index].asOf); assert.equal(point.releaseDate, point.periodDate); assert.ok(point.releaseDate <= point.asOf); assert.equal(point.revisionStatus, "not_tracked"); for (const field of ["overnight", "oneWeek", "threeMonth", "oneYear", "termSpread"]) assert.ok(Number.isFinite(point[field])); assert.ok(Math.abs(point.termSpread - (point.oneYear - point.overnight)) < 1e-12); const elapsed = (new Date(`${point.asOf}T00:00:00Z`) - new Date(`${point.periodDate}T00:00:00Z`)) / 86400000; assert.ok(elapsed >= 0 && elapsed <= 30); }
  assert.doesNotMatch(JSON.stringify(l1), /"(?:cpi|inflation|realRate|score|position|trend|percentile|zScore|normalized|signal|state|liquidityState)"/i);
});

test("missing-token L1 failure preserves L1, F1-F3, B1-B5 and current files", async () => {
  const paths = ["../public/data/market-research/history/l1.json", "../public/data/market-research/history/f1.json", "../public/data/market-research/history/f2.json", "../public/data/market-research/history/f3.json", "../public/data/market-research/history/b1.json", "../public/data/market-research/history/b2.json", "../public/data/market-research/history/b3.json", "../public/data/market-research/history/b4.json", "../public/data/market-research/history/b5.json", "../public/data/market-research/current.json"].map(value => fileURLToPath(new URL(value, import.meta.url)));
  const before = await Promise.all(paths.map(value => readFile(value))); const env = { ...process.env }; delete env.TUSHARE_TOKEN;
  const result = spawnSync(process.execPath, [fileURLToPath(new URL("../scripts/generate-market-research-history-l1.mjs", import.meta.url)), "--as-of", "2026-08-17"], { cwd: fileURLToPath(new URL("..", import.meta.url)), env, encoding: "utf8" }); assert.notEqual(result.status, 0); assert.match(result.stderr, /TUSHARE_TOKEN is required/); assert.deepEqual(await Promise.all(paths.map(value => readFile(value))), before);
});

test("builds L5 month ends with the production US real-yield selector", async () => {
  const { buildL5MonthlyHistory } = await l5HistoryGenerator();
  const schedule = { schemaVersion: 1, requestedAsOf: "2026-08-17", indicator: { id: "B3", frequency: "monthly" }, range: { startAsOf: "2026-01-31", endAsOf: "2026-07-31" }, points: [{ asOf: "2026-01-31" }, { asOf: "2026-07-31" }] };
  const rows = [{ date: "20260129", y10: -0.25 }, { date: "20260130", y10: 2.4 }, { date: "20260131", y10: 9.9 }, { date: "20260202", y10: 8.8 }, { date: "20260730", y10: 2.6 }, { date: "20260731", y10: 9.8 }, { date: "20260803", y10: 8.7 }];
  const result = buildL5MonthlyHistory(schedule, new Map([["2026", rows]]), "2026-08-17");
  assert.deepEqual(result.points[0], { asOf: "2026-01-31", periodDate: "2026-01-30", releaseDate: "2026-01-30", revisionStatus: "not_tracked", realYield10Y: 2.4 });
  assert.deepEqual(result.points[1], { asOf: "2026-07-31", periodDate: "2026-07-30", releaseDate: "2026-07-30", revisionStatus: "not_tracked", realYield10Y: 2.6 });
  const negative = buildL5MonthlyHistory({ ...schedule, range: { startAsOf: "2026-01-31", endAsOf: "2026-01-31" }, points: [schedule.points[0]] }, new Map([["2026", [rows[0]]]]), "2026-08-17"); assert.equal(negative.points[0].realYield10Y, -0.25);
  for (const invalid of [null, undefined, "", Number.NaN, Infinity, "bad"]) assert.throws(() => buildL5MonthlyHistory({ ...schedule, range: { startAsOf: "2026-01-31", endAsOf: "2026-01-31" }, points: [schedule.points[0]] }, new Map([["2026", [{ date: "20260130", y10: invalid }]]]), "2026-08-17"), /Invalid US 10Y/);
});

test("validates annual US real-yield batches and the L5 monthly schedule", async () => {
  const { validateMonthlySchedule, validateUsRealYieldYearBatch } = await l5HistoryGenerator();
  const schedule = { schemaVersion: 1, requestedAsOf: "2026-08-17", indicator: { id: "B3", frequency: "monthly" }, range: { startAsOf: "2026-01-31", endAsOf: "2026-01-31" }, points: [{ asOf: "2026-01-31" }] };
  assert.equal(validateMonthlySchedule(schedule, "2026-08-17"), schedule); assert.throws(() => validateMonthlySchedule({ ...schedule, requestedAsOf: "2026-08-16" }, "2026-08-17"), /requestedAsOf/); assert.throws(() => validateMonthlySchedule({ ...schedule, points: [schedule.points[0], schedule.points[0]] }, "2026-08-17"), /unique and strictly ascending/);
  const row = date => ({ date, y10: 1 });
  assert.equal(validateUsRealYieldYearBatch([row("20260130")], "2026", "20260101", "20260731").length, 1);
  assert.throws(() => validateUsRealYieldYearBatch([], "2026", "20260101", "20260731"), /no rows/);
  assert.throws(() => validateUsRealYieldYearBatch([row("20260230")], "2026", "20260101", "20260731"), /invalid date/);
  assert.throws(() => validateUsRealYieldYearBatch([row("20260801")], "2026", "20260101", "20260731"), /outside/);
  assert.throws(() => validateUsRealYieldYearBatch([row("20260130"), row("20260130")], "2026", "20260101", "20260731"), /duplicate date/);
  assert.throws(() => validateUsRealYieldYearBatch(Array.from({ length: 2000 }, () => row("20260130")), "2026", "20260101", "20260731"), /2000-row limit/);
});

test("L5 generator makes one sequential us_trycr request per calendar year", async () => {
  const source = await readFile(fileURLToPath(new URL("../scripts/generate-market-research-history-l5.mjs", import.meta.url)), "utf8");
  assert.equal((source.match(/callTushare\("us_trycr"/g) ?? []).length, 1); assert.match(source, /for \(const year of years\)/); assert.match(source, /callTushare\("us_trycr", \{ start_date: startDate, end_date: endDate \}, FIELDS, token\)/); assert.match(source, /const FIELDS = "date,y10"/); assert.match(source, /selectLatestUsRealYieldSnapshot/); assert.doesNotMatch(source, /callTushare\("(?:us_tycr|us_tbr|shibor|daily|trade_cal)"|Promise\.all/);
  const b3 = await b3HistoryData(); const first = Number(b3.range.startAsOf.slice(0, 4)); const last = Number(b3.range.endAsOf.slice(0, 4)); const years = Array.from({ length: last - first + 1 }, (_, index) => String(first + index)); assert.equal(years.length, 12); assert.equal(years[0], "2015"); assert.equal(years.at(-1), "2026");
});

test("checked-in L5 history is a complete strictly prior US real-yield monthly series", async () => {
  const [l5, b3] = await Promise.all([l5HistoryData(), b3HistoryData()]); assert.equal(l5.points.length, 139); assert.equal(l5.requestedAsOf, b3.requestedAsOf); assert.deepEqual(l5.range, b3.range);
  for (let index = 0; index < l5.points.length; index += 1) { const point = l5.points[index]; assert.equal(point.asOf, b3.points[index].asOf); assert.equal(point.releaseDate, point.periodDate); assert.ok(point.releaseDate < point.asOf); assert.equal(point.revisionStatus, "not_tracked"); assert.ok(Number.isFinite(point.realYield10Y)); const elapsed = (new Date(`${point.asOf}T00:00:00Z`) - new Date(`${point.periodDate}T00:00:00Z`)) / 86400000; assert.ok(elapsed > 0 && elapsed <= 30); }
  assert.doesNotMatch(JSON.stringify(l5), /"(?:dxy|vix|creditSpread|globalLiquidity|score|position|trend|percentile|zScore|normalized|signal|state|riskOn|riskOff)"/i);
});

test("missing-token L5 failure preserves L5, L1, F1-F3, B1-B5 and current files", async () => {
  const paths = ["../public/data/market-research/history/l5.json", "../public/data/market-research/history/l1.json", "../public/data/market-research/history/f1.json", "../public/data/market-research/history/f2.json", "../public/data/market-research/history/f3.json", "../public/data/market-research/history/b1.json", "../public/data/market-research/history/b2.json", "../public/data/market-research/history/b3.json", "../public/data/market-research/history/b4.json", "../public/data/market-research/history/b5.json", "../public/data/market-research/current.json"].map(value => fileURLToPath(new URL(value, import.meta.url)));
  const before = await Promise.all(paths.map(value => readFile(value))); const env = { ...process.env }; delete env.TUSHARE_TOKEN;
  const result = spawnSync(process.execPath, [fileURLToPath(new URL("../scripts/generate-market-research-history-l5.mjs", import.meta.url)), "--as-of", "2026-08-17"], { cwd: fileURLToPath(new URL("..", import.meta.url)), env, encoding: "utf8" }); assert.notEqual(result.status, 0); assert.match(result.stderr, /TUSHARE_TOKEN is required/); assert.deepEqual(await Promise.all(paths.map(value => readFile(value))), before);
});

test("applies L2 conservative month-end release dates without future leakage", async () => {
  const { conservativeReleaseDate, selectedPeriodForAsOf } = await l2HistoryGenerator();
  assert.equal(conservativeReleaseDate("201501"), "2015-02-28"); assert.equal(conservativeReleaseDate("201512"), "2016-01-31"); assert.equal(conservativeReleaseDate("201601"), "2016-02-29"); assert.equal(conservativeReleaseDate("202606"), "2026-07-31");
  assert.equal(selectedPeriodForAsOf("2015-02-27"), "201412"); assert.equal(selectedPeriodForAsOf("2015-02-28"), "201501"); assert.equal(selectedPeriodForAsOf("2026-07-30"), "202605"); assert.equal(selectedPeriodForAsOf("2026-07-31"), "202606"); assert.throws(() => selectedPeriodForAsOf("2026-02-30"), /Invalid B3 asOf/);
});

test("normalizes only complete cn_m m1_yoy rows for L2", async () => {
  const { normalizeCnMRows } = await l2HistoryGenerator(); const rows = normalizeCnMRows([{ month: "201502", m1_yoy: "5.6", m1: 99, m1_mom: 88 }, { month: "201501", m1_yoy: 4.7 }], "201501", "201502");
  assert.deepEqual(rows, [{ month: "201501", m1_yoy: 4.7 }, { month: "201502", m1_yoy: 5.6 }]); assert.doesNotMatch(JSON.stringify(rows), /"m1"|m1_mom/); assert.throws(() => normalizeCnMRows([], "201501", "201502"), /no rows/); assert.throws(() => normalizeCnMRows([{ month: "201501", m1_yoy: 1 }], "201501", "201502"), /missing or non-contiguous/); assert.throws(() => normalizeCnMRows([{ month: "201501", m1_yoy: 1 }, { month: "201501", m1_yoy: 1 }], "201501", "201501"), /duplicate month/); assert.throws(() => normalizeCnMRows([{ month: "201412", m1_yoy: 1 }], "201501", "201501"), /outside requested range/);
  for (const month of ["201500", "201513", "2015-01", "x"]) assert.throws(() => normalizeCnMRows([{ month, m1_yoy: 1 }], "201501", "201501"), /invalid month/); for (const value of [null, "", Number.NaN, Infinity, "bad"]) assert.throws(() => normalizeCnMRows([{ month: "201501", m1_yoy: value }], "201501", "201501"), /invalid m1_yoy/);
});

test("builds deterministic 139-point L2 history from the B3 timeline", async () => {
  const { buildL2MonthlyHistory, shiftMonth } = await l2HistoryGenerator(); const b3 = await b3HistoryData(); const rows = Array.from({ length: 139 }, (_, index) => ({ month: shiftMonth("201412", index), m1_yoy: index / 10 }));
  const first = buildL2MonthlyHistory(b3, [...rows].reverse(), "2026-08-17"); const second = buildL2MonthlyHistory(b3, rows, "2026-08-17"); assert.equal(first.points.length, 139); assert.equal(JSON.stringify(first), JSON.stringify(second)); assert.deepEqual(first.sourceQuery, { api: "cn_m", startM: "201412", endM: "202606", fields: ["month", "m1_yoy"] }); assert.match(first.sourceSnapshotSha256, /^[a-f0-9]{64}$/); assert.equal(first.points[0].period, "201412"); assert.equal(first.points.at(-1).period, "202606");
  for (let index = 0; index < first.points.length; index += 1) { const point = first.points[index]; assert.equal(point.asOf, b3.points[index].asOf); assert.ok(point.releaseDate <= point.asOf); assert.equal(point.releaseDateQuality, "conservative_proxy"); assert.equal(point.pitScope, "release_lag_only"); assert.equal(point.valueVintage, "latest_available_snapshot"); assert.equal(point.sourceField, "m1_yoy"); assert.equal(point.value, index / 10); } assert.doesNotMatch(JSON.stringify(first), /m1_mom|"score"|"trend"|"normalized"/);
});

test("rejects malformed B3 schedules and silent cn_m revisions", async () => {
  const { validateMonthlySchedule, assertNoSilentRevision } = await l2HistoryGenerator(); const b3 = await b3HistoryData(); assert.equal(validateMonthlySchedule(b3, "2026-08-17"), b3); assert.throws(() => validateMonthlySchedule({ ...b3, points: b3.points.slice(1) }, "2026-08-17"), /exactly 139/); assert.throws(() => validateMonthlySchedule({ ...b3, points: [b3.points[0], ...b3.points.slice(0, -1)] }, "2026-08-17"), /unique and strictly ascending/); assert.throws(() => validateMonthlySchedule({ ...b3, points: [{ asOf: "2015-02-30" }, ...b3.points.slice(1)] }, "2026-08-17"), /valid, unique/); assert.throws(() => validateMonthlySchedule({ ...b3, requestedAsOf: "2026-08-16" }, "2026-08-17"), /requestedAsOf/);
  const existing = { points: [{ period: "201501", value: 4, source: "tushare", dataset: "cn_m", sourceField: "m1_yoy" }, { period: "201502", value: null, source: "placeholder" }] }; assert.doesNotThrow(() => assertNoSilentRevision(existing, [{ month: "201501", m1_yoy: 4 }])); assert.throws(() => assertNoSilentRevision(existing, [{ month: "201501", m1_yoy: 4.1 }]), /historical revision.*201501/);
});

test("checked-in L2 history is complete and explicitly conservative PIT", async () => {
  const [l2, b3] = await Promise.all([l2HistoryData(), b3HistoryData()]); assert.equal(l2.points.length, 139); assert.equal(l2.requestedAsOf, b3.requestedAsOf); assert.equal(l2.range.startPeriod, "201412"); assert.equal(l2.range.endPeriod, "202606"); assert.match(l2.sourceSnapshotSha256, /^[a-f0-9]{64}$/); for (let index = 0; index < l2.points.length; index += 1) { const point = l2.points[index]; assert.equal(point.asOf, b3.points[index].asOf); assert.ok(Number.isFinite(point.value)); assert.ok(point.releaseDate <= point.asOf); assert.equal(point.releaseDateQuality, "conservative_proxy"); assert.equal(point.pitScope, "release_lag_only"); assert.equal(point.valueVintage, "latest_available_snapshot"); }
});

test("missing-token L2 failure preserves L2 and all completed histories", async () => {
  const paths = ["../public/data/market-research/history/l2.json", "../public/data/market-research/history/l1.json", "../public/data/market-research/history/l5.json", "../public/data/market-research/history/f1.json", "../public/data/market-research/history/f2.json", "../public/data/market-research/history/f3.json", "../public/data/market-research/history/f4.json", "../public/data/market-research/history/b1.json", "../public/data/market-research/history/b2.json", "../public/data/market-research/history/b3.json", "../public/data/market-research/history/b4.json", "../public/data/market-research/history/b5.json", "../public/data/market-research/current.json"].map(value => fileURLToPath(new URL(value, import.meta.url))); const before = await Promise.all(paths.map(value => readFile(value))); const env = { ...process.env }; delete env.TUSHARE_TOKEN; const result = spawnSync(process.execPath, [fileURLToPath(new URL("../scripts/generate-market-research-history-l2.mjs", import.meta.url)), "--as-of", "2026-08-17"], { cwd: fileURLToPath(new URL("..", import.meta.url)), env, encoding: "utf8" }); assert.notEqual(result.status, 0); assert.match(result.stderr, /TUSHARE_TOKEN is required/); assert.deepEqual(await Promise.all(paths.map(value => readFile(value))), before);
});

test("applies L3 conservative month-end release dates without future leakage", async () => {
  const { conservativeReleaseDate, selectedPeriodForAsOf } = await l3HistoryGenerator(); assert.equal(conservativeReleaseDate("201501"), "2015-02-28"); assert.equal(conservativeReleaseDate("201512"), "2016-01-31"); assert.equal(conservativeReleaseDate("201601"), "2016-02-29"); assert.equal(selectedPeriodForAsOf("2015-02-27"), "201412"); assert.equal(selectedPeriodForAsOf("2015-02-28"), "201501"); assert.equal(selectedPeriodForAsOf("2026-07-30"), "202605"); assert.equal(selectedPeriodForAsOf("2026-07-31"), "202606");
});

test("normalizes only complete cn_m m2_yoy rows for L3", async () => {
  const { normalizeCnMRows } = await l3HistoryGenerator(); const rows = normalizeCnMRows([{ month: "201502", m2_yoy: "8.8", m2: 99, m2_mom: 88, m1_yoy: 77 }, { month: "201501", m2_yoy: 8.1 }], "201501", "201502"); assert.deepEqual(rows, [{ month: "201501", m2_yoy: 8.1 }, { month: "201502", m2_yoy: 8.8 }]); assert.doesNotMatch(JSON.stringify(rows), /"m2"|m2_mom|m1_yoy/); assert.throws(() => normalizeCnMRows([], "201501", "201502"), /no rows/); assert.throws(() => normalizeCnMRows([{ month: "201501", m2_yoy: 1 }], "201501", "201502"), /missing or non-contiguous/); assert.throws(() => normalizeCnMRows([{ month: "201501", m2_yoy: 1 }, { month: "201501", m2_yoy: 1 }], "201501", "201501"), /duplicate month/); assert.throws(() => normalizeCnMRows([{ month: "201412", m2_yoy: 1 }], "201501", "201501"), /outside requested range/); for (const month of ["201500", "201513", "x"]) assert.throws(() => normalizeCnMRows([{ month, m2_yoy: 1 }], "201501", "201501"), /invalid month/); for (const value of [null, "", Number.NaN, Infinity, "bad"]) assert.throws(() => normalizeCnMRows([{ month: "201501", m2_yoy: value }], "201501", "201501"), /invalid m2_yoy/);
});

test("builds deterministic 139-point L3 history from the B3 timeline", async () => {
  const { buildL3MonthlyHistory, shiftMonth } = await l3HistoryGenerator(); const b3 = await b3HistoryData(); const rows = Array.from({ length: 139 }, (_, index) => ({ month: shiftMonth("201412", index), m2_yoy: index / 10 })); const first = buildL3MonthlyHistory(b3, [...rows].reverse(), "2026-08-17"); const second = buildL3MonthlyHistory(b3, rows, "2026-08-17"); assert.equal(first.points.length, 139); assert.equal(JSON.stringify(first), JSON.stringify(second)); assert.deepEqual(first.sourceQuery, { api: "cn_m", startM: "201412", endM: "202606", fields: ["month", "m2_yoy"] }); for (let index = 0; index < 139; index += 1) { const point = first.points[index]; assert.equal(point.asOf, b3.points[index].asOf); assert.ok(point.releaseDate <= point.asOf); assert.equal(point.value, index / 10); assert.equal(point.sourceField, "m2_yoy"); assert.equal(point.releaseDateQuality, "conservative_proxy"); }
});

test("rejects malformed B3 schedules and silent cn_m L3 revisions", async () => {
  const { validateMonthlySchedule, assertNoSilentRevision } = await l3HistoryGenerator(); const b3 = await b3HistoryData(); assert.throws(() => validateMonthlySchedule({ ...b3, points: b3.points.slice(1) }, "2026-08-17"), /exactly 139/); assert.throws(() => validateMonthlySchedule({ ...b3, points: [b3.points[0], ...b3.points.slice(0, -1)] }, "2026-08-17"), /unique and strictly ascending/); const existing = { points: [{ period: "201501", value: 8, source: "tushare", dataset: "cn_m", sourceField: "m2_yoy" }] }; assert.doesNotThrow(() => assertNoSilentRevision(existing, [{ month: "201501", m2_yoy: 8 }])); assert.throws(() => assertNoSilentRevision(existing, [{ month: "201501", m2_yoy: 8.1 }]), /historical revision.*201501/);
});

test("checked-in L3 history is complete and explicitly conservative PIT", async () => {
  const [l3, b3] = await Promise.all([l3HistoryData(), b3HistoryData()]); assert.equal(l3.points.length, 139); assert.equal(l3.range.startPeriod, "201412"); assert.equal(l3.range.endPeriod, "202606"); for (let index = 0; index < 139; index += 1) { const point = l3.points[index]; assert.equal(point.asOf, b3.points[index].asOf); assert.ok(Number.isFinite(point.value)); assert.equal(point.releaseDateQuality, "conservative_proxy"); assert.equal(point.pitScope, "release_lag_only"); }
});

test("builds F4 month ends from L plus D candidates on strictly prior index dates", async () => {
  const { buildCandidateBasics, buildF4MonthlyHistory } = await f4HistoryGenerator();
  const schedule = { schemaVersion: 1, requestedAsOf: "2026-08-17", indicator: { id: "B3", frequency: "monthly" }, range: { startAsOf: "2026-07-31", endAsOf: "2026-07-31" }, points: [{ asOf: "2026-07-31" }] };
  const basics = buildCandidateBasics(new Map([["L", [{ ts_code: "A.SH", index_code: "000300.SH", list_date: "20100101", list_status: "L" }]], ["D", [{ ts_code: "B.SH", index_code: "000300.SH", list_date: "20110101", list_status: "D" }]]]));
  const indexRows = ["20260729", "20260730", "20260731"].map(trade_date => ({ trade_date }));
  const shares = new Map([["20260730", [{ trade_date: "20260730", ts_code: "A.SH", total_size: 60000000 }, { trade_date: "20260730", ts_code: "B.SH", total_size: 40000000 }, { trade_date: "20260730", ts_code: "C.SH", total_size: 999000000 }]]]);
  const result = buildF4MonthlyHistory(schedule, indexRows, basics, shares, "2026-08-17");
  assert.deepEqual(result.points[0], { asOf: "2026-07-31", periodDate: "2026-07-30", releaseDate: "2026-07-31", revisionStatus: "not_tracked", observedCount: 2, totalSizeWan: 100000000, totalSizeTrillion: 1 });
  shares.get("20260730")[1].total_size = null; const missing = buildF4MonthlyHistory(schedule, indexRows, basics, shares, "2026-08-17"); assert.equal(missing.points[0].observedCount, 1); assert.equal(missing.points[0].totalSizeWan, 60000000);
  shares.get("20260730")[1].total_size = 0; const zero = buildF4MonthlyHistory(schedule, indexRows, basics, shares, "2026-08-17"); assert.equal(zero.points[0].observedCount, 2); assert.equal(zero.points[0].totalSizeWan, 60000000);
  for (const invalid of [-1, Number.NaN, Infinity, "bad"]) { shares.get("20260730")[1].total_size = invalid; assert.throws(() => buildF4MonthlyHistory(schedule, indexRows, basics, shares, "2026-08-17"), /invalid total_size/); }
});

test("validates F4 ETF basics, index dates and exact-date share batches", async () => {
  const { buildCandidateBasics, validateIndexDateRows, validateShareDateBatch, buildF4MonthlyHistory } = await f4HistoryGenerator();
  const basic = (ts_code, list_status = "L", list_date = "20200101", index_code = "000300.SH") => ({ ts_code, index_code, list_date, list_status }); const batches = rows => new Map([["L", rows], ["D", []]]);
  assert.equal(buildCandidateBasics(batches([basic("A.SH")])).size, 1); assert.equal(buildCandidateBasics(new Map([["L", [basic("A.SH")]], ["D", [basic("B.SH", "D")]]])).size, 2);
  assert.throws(() => buildCandidateBasics(batches([basic("A.SH", "L", "20200101", "BAD")])), /wrong index_code/); assert.throws(() => buildCandidateBasics(batches([basic("A.SH", "D")])), /list_status/); assert.throws(() => buildCandidateBasics(batches([basic("")])), /empty ts_code/); assert.throws(() => buildCandidateBasics(batches([basic("A.SH"), basic("A.SH")])), /duplicate/); assert.throws(() => buildCandidateBasics(batches([basic("A.SH", "L", "")])), /invalid list_date/); assert.throws(() => buildCandidateBasics(batches(Array.from({ length: 5000 }, (_, i) => basic(`A${i}.SH`)))), /5000-row limit/);
  assert.equal(validateIndexDateRows([{ trade_date: "20260730" }], "20260731").length, 1); assert.throws(() => validateIndexDateRows([], "20260731"), /no index dates/); assert.throws(() => validateIndexDateRows([{ trade_date: "20260230" }], "20260731"), /invalid/); assert.throws(() => validateIndexDateRows([{ trade_date: "20260801" }], "20260731"), /outside/); assert.throws(() => validateIndexDateRows([{ trade_date: "20260730" }, { trade_date: "20260730" }], "20260731"), /duplicate/); assert.throws(() => validateIndexDateRows(Array.from({ length: 3000 }, () => ({ trade_date: "20260730" })), "20260731"), /3000-row limit/);
  const share = (ts_code = "A.SH", trade_date = "20260730") => ({ ts_code, trade_date, total_size: 1 }); assert.equal(validateShareDateBatch([share()], "20260730").length, 1); assert.throws(() => validateShareDateBatch([], "20260730"), /no rows/); assert.throws(() => validateShareDateBatch([share("A.SH", "20260729")], "20260730"), /outside/); assert.throws(() => validateShareDateBatch([share("")], "20260730"), /empty ts_code/); assert.throws(() => validateShareDateBatch([share(), share()], "20260730"), /duplicate/); assert.throws(() => validateShareDateBatch(Array.from({ length: 5000 }, (_, i) => share(`A${i}.SH`)), "20260730"), /5000-row limit/);
  const schedule = { schemaVersion: 1, requestedAsOf: "2026-08-17", indicator: { id: "B3", frequency: "monthly" }, range: { startAsOf: "2026-07-31", endAsOf: "2026-07-31" }, points: [{ asOf: "2026-07-31" }] }; const earlyBasic = buildCandidateBasics(batches([basic("A.SH", "L", "20260731")])); assert.throws(() => buildF4MonthlyHistory(schedule, [{ trade_date: "20260730" }], earlyBasic, new Map([["20260730", [share()]]]), "2026-08-17"), /predates list_date/);
});

test("F4 generator uses exactly 2 plus 1 plus 139 sequential API requests", async () => {
  const source = await readFile(fileURLToPath(new URL("../scripts/generate-market-research-history-f4.mjs", import.meta.url)), "utf8");
  assert.equal((source.match(/callTushare\("etf_basic"/g) ?? []).length, 1); assert.match(source, /for \(const listStatus of \["L", "D"\]\)/); assert.match(source, /\{ index_code: INDEX_CODE, list_status: listStatus \}, BASIC_FIELDS/); assert.match(source, /const BASIC_FIELDS = "ts_code,index_code,list_date,list_status"/);
  assert.equal((source.match(/callTushare\("index_dailybasic"/g) ?? []).length, 1); assert.match(source, /\{ ts_code: INDEX_CODE, start_date: INDEX_START_DATE, end_date: endDate \}, "trade_date"/); assert.equal((source.match(/callTushare\("etf_share_size"/g) ?? []).length, 1); assert.match(source, /for \(const tradeDate of priorTradeDates\)/); assert.match(source, /\{ trade_date: tradeDate \}, SIZE_FIELDS/); assert.match(source, /const SIZE_FIELDS = "trade_date,ts_code,total_size"/); assert.doesNotMatch(source, /callTushare\("(?:fund_share|fund_basic|fund_nav|etf_daily|trade_cal|stock_basic)"|Promise\.all|buildF4Snapshot/);
  const b3 = await b3HistoryData(); assert.equal(b3.points.length, 139);
});

test("checked-in F4 history is a complete prior-date ETF pool series", async () => {
  const [f4, b3] = await Promise.all([f4HistoryData(), b3HistoryData()]); assert.equal(f4.points.length, 139); assert.equal(f4.requestedAsOf, b3.requestedAsOf); assert.deepEqual(f4.range, b3.range);
  assert.deepEqual({ asOf: f4.points[0].asOf, periodDate: f4.points[0].periodDate, releaseDate: f4.points[0].releaseDate }, { asOf: "2015-01-31", periodDate: "2015-01-30", releaseDate: "2015-01-31" }); assert.deepEqual({ asOf: f4.points.at(-1).asOf, periodDate: f4.points.at(-1).periodDate, releaseDate: f4.points.at(-1).releaseDate }, { asOf: "2026-07-31", periodDate: "2026-07-30", releaseDate: "2026-07-31" });
  for (let index = 0; index < f4.points.length; index += 1) { const point = f4.points[index]; assert.equal(point.asOf, b3.points[index].asOf); assert.ok(point.periodDate < point.asOf); assert.equal(new Date(new Date(`${point.periodDate}T00:00:00Z`).valueOf() + 86400000).toISOString().slice(0, 10), point.releaseDate); assert.ok(point.releaseDate <= point.asOf); assert.equal(point.revisionStatus, "not_tracked"); assert.ok(Number.isInteger(point.observedCount) && point.observedCount > 0); assert.ok(Number.isFinite(point.totalSizeWan) && point.totalSizeWan > 0); assert.ok(Number.isFinite(point.totalSizeTrillion) && point.totalSizeTrillion > 0); assert.ok(Math.abs(point.totalSizeTrillion - point.totalSizeWan / 100000000) < 1e-12); }
  assert.doesNotMatch(JSON.stringify(f4), /"(?:eligibleCount|missingCount|coverage|netFlow|shareChange|capitalFlow|pension|insurance|foreignCapital|score|position|trend|percentile|zScore|normalized|signal|state)"/i);
});

test("missing-token F4 failure preserves F4, L1, L5, F1-F3, B1-B5 and current files", async () => {
  const paths = ["../public/data/market-research/history/f4.json", "../public/data/market-research/history/l1.json", "../public/data/market-research/history/l5.json", "../public/data/market-research/history/f1.json", "../public/data/market-research/history/f2.json", "../public/data/market-research/history/f3.json", "../public/data/market-research/history/b1.json", "../public/data/market-research/history/b2.json", "../public/data/market-research/history/b3.json", "../public/data/market-research/history/b4.json", "../public/data/market-research/history/b5.json", "../public/data/market-research/current.json"].map(value => fileURLToPath(new URL(value, import.meta.url)));
  const before = await Promise.all(paths.map(value => readFile(value))); const env = { ...process.env }; delete env.TUSHARE_TOKEN;
  const result = spawnSync(process.execPath, [fileURLToPath(new URL("../scripts/generate-market-research-history-f4.mjs", import.meta.url)), "--as-of", "2026-08-17"], { cwd: fileURLToPath(new URL("..", import.meta.url)), env, encoding: "utf8" }); assert.notEqual(result.status, 0); assert.match(result.stderr, /TUSHARE_TOKEN is required/); assert.deepEqual(await Promise.all(paths.map(value => readFile(value))), before);
});

test("L4 decimal subtraction uses exact scaling with no floating-point tails", async () => {
  const { decimalSubtract } = await l4HistoryGenerator();
  assert.equal(decimalSubtract(3.2, 12.2), -9); assert.equal(decimalSubtract(4, 8), -4); assert.equal(decimalSubtract(0.3, 0.1), 0.2); assert.equal(decimalSubtract(0.1, 0.3), -0.2); assert.equal(decimalSubtract(-1.25, -1.25), 0); assert.equal(decimalSubtract(1.234, 1.2), 0.034); assert.equal(decimalSubtract(0.0000001, 0.0000002), -0.0000001); assert.doesNotMatch(JSON.stringify([decimalSubtract(9.9, 5.1), decimalSubtract(0.3, 0.1)]), /0000000000000/);
  for (const value of [null, undefined, "1", Number.NaN, Infinity]) assert.throws(() => decimalSubtract(value, 1), /finite decimal/);
});

test("builds deterministic 139-point L4 history only from aligned L2 and L3", async () => {
  const { buildL4MonthlyHistory, sourceSnapshotSha256 } = await l4HistoryGenerator(); const { sourceFileSha256 } = await jointHistoryGenerator(); const [l2, l3] = await Promise.all([l2HistoryData(), l3HistoryData()]);
  const inputFiles = {}; for (const id of ["L2", "L3"]) { const relative = `public/data/market-research/history/${id.toLowerCase()}.json`; const bytes = await readFile(fileURLToPath(new URL(`../${relative}`, import.meta.url))); inputFiles[id] = { path: relative, sha256: sourceFileSha256(bytes) }; }
  const first = buildL4MonthlyHistory(l2, l3, inputFiles); const second = buildL4MonthlyHistory(structuredClone(l2), structuredClone(l3), structuredClone(inputFiles)); assert.equal(first.points.length, 139); assert.equal(JSON.stringify(first), JSON.stringify(second)); assert.equal(first.points[0].value, -9); assert.equal(first.points.at(-1).value, -4); assert.equal(first.points[0].period, "201412"); assert.equal(first.points.at(-1).period, "202606"); assert.match(first.sourceSnapshotSha256, /^[a-f0-9]{64}$/);
  const canonicalRows = l2.points.map((point, index) => ({ asOf: point.asOf, period: point.period, m1_yoy: point.value, m2_yoy: l3.points[index].value })); assert.equal(first.sourceSnapshotSha256, sourceSnapshotSha256(canonicalRows));
  for (let index = 0; index < 139; index += 1) { const point = first.points[index]; assert.equal(point.asOf, l2.points[index].asOf); assert.equal(point.period, l2.points[index].period); assert.equal(point.releaseDate, l2.points[index].releaseDate); assert.equal(point.value, Number((l2.points[index].value - l3.points[index].value).toFixed(12))); assert.deepEqual(point.sourceIndicators, ["L2", "L3"]); assert.deepEqual(point.sourceFields, ["m1_yoy", "m2_yoy"]); assert.equal(point.formula, "m1_yoy - m2_yoy"); assert.equal(point.unit, "pct_point"); assert.equal(point.releaseDateQuality, "conservative_proxy"); assert.equal(point.pitScope, "release_lag_only"); assert.equal(point.valueVintage, "latest_available_snapshot"); }
});

test("rejects incomplete, misaligned or malformed L4 source histories", async () => {
  const { buildL4MonthlyHistory } = await l4HistoryGenerator(); const { sourceFileSha256 } = await jointHistoryGenerator(); const [l2, l3] = await Promise.all([l2HistoryData(), l3HistoryData()]); const inputFiles = {};
  for (const id of ["L2", "L3"]) { const relative = `public/data/market-research/history/${id.toLowerCase()}.json`; const bytes = await readFile(fileURLToPath(new URL(`../${relative}`, import.meta.url))); inputFiles[id] = { path: relative, sha256: sourceFileSha256(bytes) }; }
  const attempt = mutate => { const left = structuredClone(l2); const right = structuredClone(l3); mutate(left, right); return () => buildL4MonthlyHistory(left, right, inputFiles); };
  assert.throws(attempt(left => left.points.pop()), /139-point/); assert.throws(attempt((left, right) => { right.points[1].asOf = left.points[0].asOf; }), /strictly ascending/); assert.throws(attempt((left, right) => { right.points[1].period = "201499"; }), /period mismatch/); assert.throws(attempt((left, right) => { right.points[1].releaseDate = "2015-02-27"; }), /releaseDate mismatch/); assert.throws(attempt((left, right) => { right.points[1].pitScope = "bad"; }), /PIT metadata/); assert.throws(attempt((left, right) => { right.points[1].value = null; }), /non-finite/); assert.throws(attempt((left, right) => { right.points[1].sourceField = "m1_yoy"; }), /source identity/); assert.throws(() => buildL4MonthlyHistory(l2, l3, { ...inputFiles, L2: { ...inputFiles.L2, path: "wrong.json" } }), /input provenance/);
});

test("L4 source hashes and output are stable across LF CRLF and CR inputs", async () => {
  const { buildL4MonthlyHistory } = await l4HistoryGenerator(); const { normalizeSourceText, sourceFileSha256 } = await jointHistoryGenerator(); const variants = {};
  for (const newline of ["lf", "crlf", "cr"]) { const artifacts = {}; const files = {}; for (const id of ["L2", "L3"]) { const relative = `public/data/market-research/history/${id.toLowerCase()}.json`; const raw = normalizeSourceText(await readFile(fileURLToPath(new URL(`../${relative}`, import.meta.url)))); const text = newline === "lf" ? raw : newline === "crlf" ? raw.replaceAll("\n", "\r\n") : raw.replaceAll("\n", "\r"); artifacts[id] = JSON.parse(normalizeSourceText(Buffer.from(text))); files[id] = { path: relative, sha256: sourceFileSha256(Buffer.from(text)) }; } variants[newline] = JSON.stringify(buildL4MonthlyHistory(artifacts.L2, artifacts.L3, files)); }
  assert.equal(variants.lf, variants.crlf); assert.equal(variants.lf, variants.cr);
});

test("L4 revision protection rejects changed history and source inputs", async () => {
  const { assertNoSilentRevision } = await l4HistoryGenerator(); const checkedIn = await l4HistoryData(); assert.doesNotThrow(() => assertNoSilentRevision(checkedIn, structuredClone(checkedIn))); const changedPoint = structuredClone(checkedIn); changedPoint.points[0].value += 0.1; assert.throws(() => assertNoSilentRevision(checkedIn, changedPoint), /historical revision.*2015-01-31/); const changedSource = structuredClone(checkedIn); changedSource.sourceSnapshotSha256 = "0".repeat(64); assert.throws(() => assertNoSilentRevision(checkedIn, changedSource), /source input revision/);
});

test("checked-in L4 is a complete conservative derived history with no network path", async () => {
  const [l4, l2, l3] = await Promise.all([l4HistoryData(), l2HistoryData(), l3HistoryData()]); assert.equal(l4.points.length, 139); assert.equal(l4.points[0].value, -9); assert.equal(l4.points.at(-1).value, -4); assert.equal(l4.inputFiles.L2.sha256, "4bee5b8490933643bc4e9c72a10a18dae857c9748ba115f28d5e803baaffd596"); assert.equal(l4.inputFiles.L3.sha256, "cc73729fd4b7a6c20eb98b745c9f2175f4a10d1e3d9003c1ac906651b7bad29a");
  for (let index = 0; index < 139; index += 1) { assert.equal(l4.points[index].asOf, l2.points[index].asOf); assert.equal(l4.points[index].period, l2.points[index].period); assert.equal(l4.points[index].releaseDate, l2.points[index].releaseDate); assert.equal(l4.points[index].releaseDate, l3.points[index].releaseDate); }
  const source = await readFile(fileURLToPath(new URL("../scripts/generate-market-research-history-l4.mjs", import.meta.url)), "utf8"); assert.doesNotMatch(source, /TUSHARE_TOKEN|callTushare|https?:|\bfetch\b|pbc/i); assert.match(source, /generate-market-research-joint-history\.mjs/); assert.doesNotMatch(source, /decimal\.js|big\.js|child_process|execFile/);
});

test("L4 invalid cutoff failure preserves the output and leaves no partial file", async () => {
  const output = fileURLToPath(new URL("../public/data/market-research/history/l4.json", import.meta.url)); const directory = path.dirname(output); const before = await readFile(output); const result = spawnSync(process.execPath, [fileURLToPath(new URL("../scripts/generate-market-research-history-l4.mjs", import.meta.url)), "--as-of", "2026-08-18"], { cwd: fileURLToPath(new URL("..", import.meta.url)), encoding: "utf8" }); assert.notEqual(result.status, 0); assert.match(result.stderr, /requestedAsOf/); assert.deepEqual(await readFile(output), before); assert.equal((await readdir(directory)).some(name => name.startsWith("l4.json.tmp-")), false);
});

test("source hash policy makes LF CRLF and CR joint inputs byte-stable", async () => {
  const { INCLUDED_INDICATORS, buildJointHistory, normalizeSourceText, sourceFileSha256 } = await jointHistoryGenerator();
  const sampleLf = '{\n  "a": 1,\n  "b": 2\n}\n'; const sampleCrlf = sampleLf.replaceAll("\n", "\r\n"); const sampleCr = sampleLf.replaceAll("\n", "\r");
  assert.equal(sourceFileSha256(Buffer.from(sampleLf)), sourceFileSha256(Buffer.from(sampleCrlf))); assert.equal(sourceFileSha256(Buffer.from(sampleLf)), sourceFileSha256(Buffer.from(sampleCr))); assert.doesNotMatch(normalizeSourceText(Buffer.from(sampleCrlf)), /\r/);
  for (const changed of ['{\n  "a": 9,\n  "b": 2\n}\n', '{\n "a": 1,\n  "b": 2\n}\n', '{\n  "b": 2,\n  "a": 1\n}\n', sampleLf.trimEnd()]) assert.notEqual(sourceFileSha256(Buffer.from(sampleLf)), sourceFileSha256(Buffer.from(changed)));
  assert.throws(() => normalizeSourceText(Buffer.from([0xff])), /valid UTF-8/); assert.throws(() => normalizeSourceText(Buffer.concat([Buffer.from([0xef, 0xbb, 0xbf]), Buffer.from("{}\n")])), /BOM/); assert.throws(() => normalizeSourceText(Buffer.from("{bad}\n")), /invalid/);
  const inputs = {}; const variants = { lf: {}, crlf: {}, cr: {} };
  for (const id of INCLUDED_INDICATORS) { const path = `public/data/market-research/history/${id.toLowerCase()}.json`; const raw = await readFile(fileURLToPath(new URL(`../${path}`, import.meta.url))); const lf = normalizeSourceText(raw); inputs[id] = JSON.parse(lf); variants.lf[id] = { path, sha256: sourceFileSha256(Buffer.from(lf)) }; variants.crlf[id] = { path, sha256: sourceFileSha256(Buffer.from(lf.replaceAll("\n", "\r\n"))) }; variants.cr[id] = { path, sha256: sourceFileSha256(Buffer.from(lf.replaceAll("\n", "\r"))) }; }
  const lfJoint = JSON.stringify(buildJointHistory(inputs, variants.lf)); assert.equal(JSON.stringify(buildJointHistory(inputs, variants.crlf)), lfJoint); assert.equal(JSON.stringify(buildJointHistory(inputs, variants.cr)), lfJoint); assert.equal(variants.lf.L2.sha256, "4bee5b8490933643bc4e9c72a10a18dae857c9748ba115f28d5e803baaffd596");
});

test("offline joint history builds deterministic complete 14-of-14 snapshots without scores", async () => {
  const { INCLUDED_INDICATORS, INTENTIONALLY_MISSING, buildJointHistory, sourceFileSha256 } = await jointHistoryGenerator();
  const inputs = {}; const sourceFiles = {};
  for (const id of INCLUDED_INDICATORS) { const relative = `public/data/market-research/history/${id.toLowerCase()}.json`; const bytes = await readFile(fileURLToPath(new URL(`../${relative}`, import.meta.url))); inputs[id] = JSON.parse(bytes); sourceFiles[id] = { path: relative, sha256: sourceFileSha256(bytes) }; }
  const first = buildJointHistory(inputs, sourceFiles); const second = buildJointHistory(inputs, sourceFiles);
  assert.equal(first.snapshots.length, 139); assert.equal(JSON.stringify(first), JSON.stringify(second)); assert.deepEqual(first.intentionallyMissing, []); assert.deepEqual(INTENTIONALLY_MISSING, []); assert.equal(first.scorePolicy, "require_14_of_14");
  for (let index = 0; index < first.snapshots.length; index += 1) { const snapshot = first.snapshots[index]; assert.equal(Object.keys(snapshot.indicators).length, 14); assert.deepEqual(Object.keys(snapshot.indicators), [...INCLUDED_INDICATORS].sort()); assert.equal(snapshot.indicators.B3.asOf, snapshot.asOf); assert.equal(snapshot.indicators.F1.medianNetProfitYoy, inputs.F1.points[index].medianNetProfitYoy); assert.deepEqual(snapshot.indicators.L2, Object.fromEntries(Object.entries(inputs.L2.points[index]).sort(([a], [b]) => a.localeCompare(b)))); assert.deepEqual(snapshot.indicators.L3, Object.fromEntries(Object.entries(inputs.L3.points[index]).sort(([a], [b]) => a.localeCompare(b)))); assert.deepEqual(snapshot.indicators.L4, Object.fromEntries(Object.entries(inputs.L4.points[index]).sort(([a], [b]) => a.localeCompare(b)))); assert.deepEqual(snapshot.coverage, { B: { missing: [], present: 5, required: 5, status: "complete" }, F: { missing: [], present: 4, required: 4, status: "complete" }, L: { missing: [], present: 5, required: 5, status: "complete" }, overall: { present: 14, required: 14, status: "complete" } }); assert.equal(snapshot.scoreStatus, "ready_not_computed"); assert.equal(snapshot.aggregateScore, null); assert.equal(snapshot.jointState, null); }
  const changedFiles = structuredClone(sourceFiles); changedFiles.B1.sha256 = createHash("sha256").update("changed").digest("hex"); assert.notEqual(buildJointHistory(inputs, changedFiles).sourceFiles.B1.sha256, first.sourceFiles.B1.sha256);
});

test("joint history validation rejects incomplete, malformed and misaligned inputs", async () => {
  const { INCLUDED_INDICATORS, buildJointHistory, sourceFileSha256 } = await jointHistoryGenerator(); const inputs = {}; const sourceFiles = {};
  for (const id of INCLUDED_INDICATORS) { const relative = `public/data/market-research/history/${id.toLowerCase()}.json`; const bytes = await readFile(fileURLToPath(new URL(`../${relative}`, import.meta.url))); inputs[id] = JSON.parse(bytes); sourceFiles[id] = { path: relative, sha256: sourceFileSha256(bytes) }; }
  const attempt = mutate => { const copy = structuredClone(inputs); mutate(copy); return () => buildJointHistory(copy, sourceFiles); };
  assert.throws(() => buildJointHistory({ ...inputs, L1: undefined }, sourceFiles), /Missing included history L1/); assert.throws(attempt(copy => { copy.F4.indicator.id = "L2"; }), /Invalid F4 history identity/);
  assert.throws(attempt(copy => { copy.B1.points.pop(); }), /exactly 139/); assert.throws(attempt(copy => { copy.B1.points.push(structuredClone(copy.B1.points.at(-1))); }), /exactly 139/);
  assert.throws(attempt(copy => { copy.B2.points[1].asOf = copy.B2.points[0].asOf; }), /duplicate or unordered/); assert.throws(attempt(copy => { [copy.F1.points[0], copy.F1.points[1]] = [copy.F1.points[1], copy.F1.points[0]]; }), /duplicate or unordered/);
  assert.throws(attempt(copy => { copy.F2.points[0].asOf = "2015-02-30"; }), /invalid, duplicate/); assert.throws(attempt(copy => { copy.L5.points[0].asOf = "2015-01-30"; }), /does not match the B3 timeline/); assert.throws(attempt(copy => { copy.B3.points.at(-1).asOf = "2026-08-18"; }), /invalid, duplicate/);
  assert.throws(() => buildJointHistory(inputs, { ...sourceFiles, B1: { ...sourceFiles.B1, path: "l2.json" } }), /Invalid source provenance/);
});

test("offline joint history generator is network-free and reads only frozen inputs", async () => {
  const source = await readFile(fileURLToPath(new URL("../scripts/generate-market-research-joint-history.mjs", import.meta.url)), "utf8");
  assert.doesNotMatch(source, /TUSHARE_TOKEN|callTushare|pbc|https?:|\bfetch\b/i); assert.match(source, /INCLUDED_INDICATORS\.map/); assert.match(source, /"L2"/); assert.match(source, /"L3"/); assert.match(source, /"L4"/); assert.match(source, /readFile\(path\.resolve\(relative\)\)/); assert.doesNotMatch(source, /readdir|glob|forward.?fill|backward.?fill|child_process|execFile|core\.autocrlf|git show/i);
});

test("checked-in offline joint history preserves 139 exact snapshots without scores", async () => {
  const [joint, l2, l3, l4] = await Promise.all([jointHistoryData(), l2HistoryData(), l3HistoryData(), l4HistoryData()]); assert.equal(joint.snapshots.length, 139); assert.equal(joint.asOfCutoff, "2026-08-17"); assert.equal(joint.masterTimeline, "B3"); assert.equal(joint.sourceHashPolicy, "utf8_lf_normalized"); assert.deepEqual(joint.intentionallyMissing, []);
  for (let index = 0; index < joint.snapshots.length; index += 1) { const snapshot = joint.snapshots[index]; assert.equal(Object.keys(snapshot.indicators).length, 14); assert.deepEqual(snapshot.indicators.L2, Object.fromEntries(Object.entries(l2.points[index]).sort(([a], [b]) => a.localeCompare(b)))); assert.deepEqual(snapshot.indicators.L3, Object.fromEntries(Object.entries(l3.points[index]).sort(([a], [b]) => a.localeCompare(b)))); assert.deepEqual(snapshot.indicators.L4, Object.fromEntries(Object.entries(l4.points[index]).sort(([a], [b]) => a.localeCompare(b)))); assert.equal(snapshot.scoreStatus, "ready_not_computed"); assert.equal(snapshot.aggregateScore, null); assert.equal(snapshot.jointState, null); assert.equal(snapshot.coverage.overall.present, 14); assert.equal(snapshot.coverage.L.present, 5); assert.equal(snapshot.coverage.overall.status, "complete"); }
  for (const source of Object.values(joint.sourceFiles)) { assert.match(source.path, /history\/(?:b[1-5]|f[1-4]|l[1-5])\.json$/); assert.match(source.sha256, /^[a-f0-9]{64}$/); }
});

test("joint history invalid cutoff failure preserves the checked-in output", async () => {
  const output = fileURLToPath(new URL("../public/data/market-research/history/joint.json", import.meta.url)); const before = await readFile(output);
  const result = spawnSync(process.execPath, [fileURLToPath(new URL("../scripts/generate-market-research-joint-history.mjs", import.meta.url)), "--as-of", "2026-08-18"], { cwd: fileURLToPath(new URL("..", import.meta.url)), encoding: "utf8" }); assert.notEqual(result.status, 0); assert.match(result.stderr, /requestedAsOf/); assert.deepEqual(await readFile(output), before);
});

test("builds F1 from latest disclosed company records and validates median inputs", async () => {
  const { buildF1Snapshot } = await marketGenerator();
  const target = "20260630";
  const rows = [
    { ts_code: "A", ann_date: "20260801", end_date: target, netprofit_yoy: -10 },
    { ts_code: "A", ann_date: "20260810", end_date: target, netprofit_yoy: 0 },
    { ts_code: "B", ann_date: "20260809", end_date: target, netprofit_yoy: 20 },
    { ts_code: "C", ann_date: "20260808", end_date: target, netprofit_yoy: null },
    { ts_code: "D", ann_date: "20260807", end_date: target, netprofit_yoy: undefined },
    { ts_code: "E", ann_date: "20260806", end_date: target, netprofit_yoy: "" },
    { ts_code: "F", ann_date: "20260818", end_date: target, netprofit_yoy: 999 },
    { ts_code: "G", ann_date: "20260805", end_date: "20260331", netprofit_yoy: 999 },
    { ts_code: "B", ann_date: "20260809", end_date: target, netprofit_yoy: 20 },
    { ts_code: "I", ann_date: null, end_date: target, netprofit_yoy: 99 },
    { ts_code: "J", ann_date: undefined, end_date: target, netprofit_yoy: 99 },
    { ts_code: "K", ann_date: "", end_date: target, netprofit_yoy: 99 },
  ];
  assert.deepEqual(buildF1Snapshot(rows, "2026-08-17", target), {
    targetPeriod: target, reportedCount: 5, validCount: 2, missingCount: 3,
    medianNetProfitYoy: 10, latestAnnDate: "20260810", excludedMissingAnnDateCount: 3, positiveCount: 1, positiveShare: 50,
  });
  const odd = rows.concat({ ts_code: "H", ann_date: "20260811", end_date: target, netprofit_yoy: 5 });
  assert.equal(buildF1Snapshot(odd, "2026-08-17", target).medianNetProfitYoy, 5);
  const breadthRows = [-10, 0, 5, 20].map((netprofit_yoy, index) => ({ ts_code: `P${index}`, ann_date: "20260801", end_date: target, netprofit_yoy }));
  assert.equal(buildF1Snapshot(breadthRows, "2026-08-17", target).positiveCount, 2);
  assert.equal(buildF1Snapshot(breadthRows, "2026-08-17", target).positiveShare, 50);
  const nonPositive = buildF1Snapshot(breadthRows.slice(0, 2), "2026-08-17", target);
  assert.equal(nonPositive.positiveCount, 0);
  assert.equal(nonPositive.positiveShare, 0);
  assert.equal(buildF1Snapshot(breadthRows.slice(2), "2026-08-17", target).positiveShare, 100);
  const missingAndValue = buildF1Snapshot([
    { ts_code: "A", ann_date: "20260801", end_date: target, netprofit_yoy: null },
    { ts_code: "A", ann_date: "20260801", end_date: target, netprofit_yoy: 15.7025 },
  ], "2026-08-17", target);
  assert.equal(missingAndValue.reportedCount, 1);
  assert.equal(missingAndValue.validCount, 1);
  assert.equal(missingAndValue.medianNetProfitYoy, 15.7025);
  const duplicateMissing = buildF1Snapshot([
    { ts_code: "A", ann_date: "20260801", end_date: target, netprofit_yoy: null },
    { ts_code: "A", ann_date: "20260801", end_date: target, netprofit_yoy: null },
    { ts_code: "B", ann_date: "20260802", end_date: target, netprofit_yoy: 1 },
  ], "2026-08-17", target);
  assert.equal(duplicateMissing.reportedCount, 2);
  assert.equal(duplicateMissing.validCount, 1);
  assert.equal(duplicateMissing.missingCount, 1);
  assert.throws(() => buildF1Snapshot(rows.concat({ ts_code: "B", ann_date: "20260809", end_date: target, netprofit_yoy: 21 }), "2026-08-17", target), /conflicting netprofit_yoy/);
  for (const invalid of [Number.NaN, Infinity, "not-a-number"]) {
    assert.throws(() => buildF1Snapshot([{ ts_code: "A", ann_date: "20260801", end_date: target, netprofit_yoy: invalid }], "2026-08-17", target), /invalid netprofit_yoy/);
  }
  assert.throws(() => buildF1Snapshot([{ ts_code: "A", ann_date: "invalid", end_date: target, netprofit_yoy: 1 }], "2026-08-17", target), /invalid ann_date/);
  assert.throws(() => buildF1Snapshot([{ ts_code: "A", ann_date: "20260230", end_date: target, netprofit_yoy: 1 }], "2026-08-17", target), /invalid ann_date/);
  assert.throws(() => buildF1Snapshot([{ ts_code: "", ann_date: "20260801", end_date: target, netprofit_yoy: 1 }], "2026-08-17", target), /empty ts_code/);
  assert.throws(() => buildF1Snapshot([{ ts_code: "A", ann_date: "20260801", end_date: target, netprofit_yoy: null }], "2026-08-17", target), /no valid netprofit_yoy sample/);
  assert.throws(() => buildF1Snapshot([{ ts_code: "A", ann_date: "20260818", end_date: target, netprofit_yoy: 1 }], "2026-08-17", target), /no reported companies/);
});

test("requests fina_indicator_vip once with the target period and exact fields", async () => {
  const source = await generatorSource();
  assert.equal((source.match(/callTushare\("fina_indicator_vip"/g) ?? []).length, 1);
  assert.match(source, /callTushare\("fina_indicator_vip", \{ period: targetPeriod \}, "ts_code,ann_date,end_date,netprofit_yoy"/);
});

test("builds B1 earnings yields from the shared snapshot and rejects non-positive or invalid PE", async () => {
  const { buildB1Snapshot } = await marketGenerator();
  const snapshot = {
    tradeDate: "20260814",
    values: { "000300.SH": { peTtm: 14.3637 }, "399006.SZ": { peTtm: 44.4014 } },
  };
  assert.deepEqual(buildB1Snapshot(snapshot), {
    tradeDate: "20260814",
    broadEarningsYield: 100 / 14.3637,
    growthEarningsYield: 100 / 44.4014,
  });
  for (const invalid of [null, "", Number.NaN, Infinity, 0, -1]) {
    assert.throws(() => buildB1Snapshot({ ...snapshot, values: { ...snapshot.values, "000300.SH": { peTtm: invalid } } }), /沪深300 PE TTM/);
    assert.throws(() => buildB1Snapshot({ ...snapshot, values: { ...snapshot.values, "399006.SZ": { peTtm: invalid } } }), /创业板指 PE TTM/);
  }
});

test("builds B4 from one complete-date daily_basic batch and fails closed on malformed rows", async () => {
  const { buildB4Snapshot } = await marketGenerator();
  const snapshot = { tradeDate: "20260814" };
  const rows = [
    { ts_code: "000001.SZ", trade_date: "20260814", total_mv: 60000000 },
    { ts_code: "600000.SH", trade_date: "20260814", total_mv: 40000000 },
  ];
  assert.deepEqual(buildB4Snapshot(rows, snapshot), {
    tradeDate: "20260814", stockCount: 2, totalMarketCapWan: 100000000, totalMarketCapTrillion: 1,
  });
  assert.throws(() => buildB4Snapshot([], snapshot), /returned no rows/);
  assert.throws(() => buildB4Snapshot([{ ...rows[0], trade_date: "20260813" }], snapshot), /outside 20260814/);
  assert.throws(() => buildB4Snapshot([{ ...rows[0], ts_code: "" }], snapshot), /empty ts_code/);
  assert.throws(() => buildB4Snapshot([rows[0], { ...rows[1], ts_code: rows[0].ts_code }], snapshot), /duplicate ts_code/);
  for (const invalid of [null, "", Number.NaN, Infinity, 0, -1]) {
    assert.throws(() => buildB4Snapshot([{ ...rows[0], total_mv: invalid }], snapshot), /invalid total_mv/);
  }
  assert.throws(() => buildB4Snapshot([
    { ...rows[0], total_mv: Number.MAX_VALUE }, { ...rows[1], total_mv: Number.MAX_VALUE },
  ], snapshot), /total market cap in wan yuan is invalid/);
  const allowed = Array.from({ length: 5999 }, (_, index) => ({ ts_code: `CODE${index}`, trade_date: "20260814", total_mv: 1 }));
  assert.equal(buildB4Snapshot(allowed, snapshot).stockCount, 5999);
  const capped = Array.from({ length: 6000 }, (_, index) => ({ ts_code: `CODE${index}`, trade_date: "20260814", total_mv: 1 }));
  assert.throws(() => buildB4Snapshot(capped, snapshot), /6000-row limit/);
});

test("requests daily_basic exactly once for the shared B date and exact fields", async () => {
  const source = await generatorSource();
  assert.equal((source.match(/callTushare\("daily_basic"/g) ?? []).length, 1);
  assert.match(source, /callTushare\("daily_basic", \{ trade_date: snapshot\.tradeDate \}, "ts_code,trade_date,total_mv,dv_ttm"/);
});

test("builds B2 from valid dividend-yield samples and fails closed on invalid values", async () => {
  const { buildB2Snapshot, buildB4Snapshot } = await marketGenerator();
  const snapshot = { tradeDate: "20260814" };
  const rows = [
    { ts_code: "A", trade_date: "20260814", total_mv: 50, dv_ttm: 0 },
    { ts_code: "B", trade_date: "20260814", total_mv: 30, dv_ttm: 2 },
    { ts_code: "C", trade_date: "20260814", total_mv: 10, dv_ttm: null },
    { ts_code: "D", trade_date: "20260814", total_mv: 5, dv_ttm: undefined },
    { ts_code: "E", trade_date: "20260814", total_mv: 5, dv_ttm: "" },
  ];
  const b4 = buildB4Snapshot(rows, snapshot);
  assert.deepEqual(buildB2Snapshot(rows, snapshot, b4), {
    tradeDate: "20260814", observedCount: 2, missingCount: 3, observedMarketCapWan: 80,
    marketCapCoverage: 80, weightedDividendYield: 0.75,
  });
  for (const invalid of [-1, Number.NaN, Infinity, "not-a-number"]) {
    const invalidRows = [{ ...rows[0], dv_ttm: invalid }];
    const invalidB4 = buildB4Snapshot(invalidRows, snapshot);
    assert.throws(() => buildB2Snapshot(invalidRows, snapshot, invalidB4), /invalid dv_ttm/);
  }
  const missingRows = rows.map(row => ({ ...row, dv_ttm: null }));
  assert.throws(() => buildB2Snapshot(missingRows, snapshot, buildB4Snapshot(missingRows, snapshot)), /no valid dv_ttm sample/);
  assert.throws(() => buildB2Snapshot(rows, snapshot, { ...b4, tradeDate: "20260813" }), /validated B4/);
  assert.throws(() => buildB2Snapshot(rows, snapshot, { ...b4, stockCount: rows.length - 1 }), /validated B4/);
});

test("selects and validates the latest SHIBOR row within the 30-day as-of window", async () => {
  const { selectLatestShiborSnapshot } = await marketGenerator();
  const row = (date, on = 1.2, oneWeek = 1.3, threeMonth = 1.4, oneYear = 1.6) => ({ date, on, "1w": oneWeek, "3m": threeMonth, "1y": oneYear });
  const selected = selectLatestShiborSnapshot([row("20260817", 1.1, 1.2, 1.3, 1.5), row("20260814"), row("20260818", 9, 9, 9, 9)], "2026-08-16");
  assert.deepEqual(selected, { date: "2026-08-14", overnight: 1.2, oneWeek: 1.3, threeMonth: 1.4, oneYear: 1.6, termSpread: 1.6 - 1.2 });
  assert.equal(selectLatestShiborSnapshot([row("20260814")], "2026-08-16").date, "2026-08-14");
  assert.throws(() => selectLatestShiborSnapshot([row("20260701"), row("invalid")], "2026-08-17"), /30-day window/);
  assert.throws(() => selectLatestShiborSnapshot([row("20260814"), row("20260814")], "2026-08-17"), /exactly one row/);
  assert.throws(() => selectLatestShiborSnapshot([row("20260814", null)], "2026-08-17"), /SHIBOR ON/);
  assert.throws(() => selectLatestShiborSnapshot([row("20260814", 1, "")], "2026-08-17"), /SHIBOR 1W/);
  assert.throws(() => selectLatestShiborSnapshot([row("20260814", 1, 1, "not-a-number")], "2026-08-17"), /SHIBOR 3M/);
  assert.throws(() => selectLatestShiborSnapshot([row("20260814", 1, 1, 1, Infinity)], "2026-08-17"), /SHIBOR 1Y/);
  assert.equal(selectLatestShiborSnapshot([row("20260814", -0.2, -0.1, 0, 0.1)], "2026-08-17").termSpread, 0.30000000000000004);
});

test("requests the exact SHIBOR fields", async () => {
  const source = await generatorSource();
  assert.match(source, /callTushare\("shibor",[^\n]+"date,on,1w,3m,1y"/);
});

test("selects the latest US real yield strictly before the China as-of date", async () => {
  const { selectLatestUsRealYieldSnapshot } = await marketGenerator();
  const row = (date, y10 = 2.4) => ({ date, y10 });
  assert.deepEqual(selectLatestUsRealYieldSnapshot([row("20260817", 9), row("20260818", 8), row("20260814", 2.41), row("20260813", 2.39)], "2026-08-17"), { date: "2026-08-14", y10: 2.41 });
  assert.equal(selectLatestUsRealYieldSnapshot([row("20260814")], "2026-08-17").date, "2026-08-14");
  assert.equal(selectLatestUsRealYieldSnapshot([row("20260814", -0.25)], "2026-08-17").y10, -0.25);
  assert.throws(() => selectLatestUsRealYieldSnapshot([row("20260817"), row("20260818"), row("invalid")], "2026-08-17"), /30-day window/);
  assert.throws(() => selectLatestUsRealYieldSnapshot([row("20260701")], "2026-08-17"), /30-day window/);
  assert.throws(() => selectLatestUsRealYieldSnapshot([row("20260814"), row("20260814")], "2026-08-17"), /exactly one row/);
  for (const invalid of [null, "", "not-a-number", Infinity]) {
    assert.throws(() => selectLatestUsRealYieldSnapshot([row("20260814", invalid)], "2026-08-17"), /Invalid US 10Y/);
  }
});

test("requests the exact us_trycr fields", async () => {
  const source = await generatorSource();
  assert.match(source, /callTushare\("us_trycr",[^\n]+"date,y10"/);
});

test("requests the exact sf_month fields without another PBOC report fetch", async () => {
  const source = await generatorSource();
  assert.match(source, /callTushare\("sf_month", \{ m: report\.dataMonth \}, "month,inc_month,inc_cumval,stk_endval"/);
  assert.equal((source.match(/fetchText\(report\.href\)/g) ?? []).length, 1);
});

test("fails closed when the shared B3/B5 snapshot has invalid turnover data", async () => {
  const { selectLatestCommonSnapshot } = await marketGenerator();
  const validBroad = { trade_date: "20260814", pe_ttm: 14, pb: 1.4, turnover_rate: 0.5, turnover_rate_f: 1 };
  const validGrowth = { trade_date: "20260814", pe_ttm: 44, pb: 6, turnover_rate: 2, turnover_rate_f: 4 };
  const rows = (broad, growth) => ({ "000300.SH": [broad], "399006.SZ": [growth] });

  assert.throws(() => selectLatestCommonSnapshot(rows({ ...validBroad, turnover_rate: undefined }, validGrowth), "2026-08-17"), /Invalid turnover_rate/);
  assert.throws(() => selectLatestCommonSnapshot(rows(validBroad, { ...validGrowth, turnover_rate_f: undefined }), "2026-08-17"), /Invalid turnover_rate_f/);
  assert.throws(() => selectLatestCommonSnapshot(rows(validBroad, { ...validGrowth, turnover_rate: "not-a-number" }), "2026-08-17"), /Invalid turnover_rate/);
  assert.throws(() => selectLatestCommonSnapshot(rows({ ...validBroad, turnover_rate_f: 0 }, validGrowth), "2026-08-17"), /greater than zero/);
});

test("generator refuses to run without exposing or fabricating a Tushare token", () => {
  const env = { ...process.env };
  delete env.TUSHARE_TOKEN;
  const result = spawnSync(process.execPath, ["scripts/generate-market-research-current.mjs", "--as-of", "2026-08-17"], {
    cwd: fileURLToPath(new URL("..", import.meta.url)),
    encoding: "utf8",
    env,
  });

  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /TUSHARE_TOKEN is required/);
  assert.doesNotMatch(result.stdout, /Generated public/);
});

test("missing-token failure leaves current.json byte-for-byte unchanged", async () => {
  const target = fileURLToPath(new URL("../public/data/market-research/current.json", import.meta.url));
  const before = createHash("sha256").update(await readFile(target)).digest("hex");
  const env = { ...process.env };
  delete env.TUSHARE_TOKEN;
  const result = spawnSync(process.execPath, ["scripts/generate-market-research-current.mjs", "--as-of", "2026-08-17"], {
    cwd: fileURLToPath(new URL("..", import.meta.url)), encoding: "utf8", env,
  });
  const after = createHash("sha256").update(await readFile(target)).digest("hex");
  assert.notEqual(result.status, 0);
  assert.equal(after, before);
});

test("parses only supported PBOC financial-report titles", async () => {
  const { parsePbcFinancialReportTitle, validatePbcReportUrl } = await marketGenerator();
  assert.equal(parsePbcFinancialReportTitle("2026年1月金融统计数据报告"), "202601");
  assert.equal(parsePbcFinancialReportTitle("2026年一季度金融统计数据报告"), "202603");
  assert.equal(parsePbcFinancialReportTitle("2026年上半年金融统计数据报告"), "202606");
  assert.equal(parsePbcFinancialReportTitle("2026年前三季度金融统计数据报告"), "202609");
  assert.equal(parsePbcFinancialReportTitle("2026年金融统计数据报告"), "202612");
  assert.equal(parsePbcFinancialReportTitle("2026年7月社会融资规模存量统计数据报告"), null);
  assert.match(validatePbcReportUrl("/diaochatongjisi/116219/116225/a/index.html"), /^https:\/\/www\.pbc\.gov\.cn\//);
  assert.throws(() => validatePbcReportUrl("https://example.com/index.html"), /Unsafe/);
  assert.throws(() => validatePbcReportUrl("/diaochatongjisi/116219/116225/index.html"), /Unsafe/);
});

test("parses and selects the latest non-future report from a minimal PBOC index fixture", async () => {
  const { parsePbcReportIndex, selectLatestPublishedReport } = await marketGenerator();
  const fixture = `
    <a href="/diaochatongjisi/116219/116225/a/index.html" title="2026年上半年金融统计数据报告">上半年</a><span>2026-07-15</span>
    <a href="/diaochatongjisi/116219/116225/b/index.html" title="2026年7月金融统计数据报告">7月</a><span>2026-08-14</span>
    <a href="/diaochatongjisi/116219/116225/c/index.html" title="2026年8月金融统计数据报告">8月</a><span>2026-09-14</span>`;
  const reports = parsePbcReportIndex(fixture);
  assert.equal(selectLatestPublishedReport(reports, "2026-08-17").dataMonth, "202607");
  assert.equal(selectLatestPublishedReport(reports, "2026-07-20").dataMonth, "202606");
  assert.throws(() => selectLatestPublishedReport(reports, "2026-01-01"), /historical pagination is not implemented/);
  const crossItemDate = `<a href="/diaochatongjisi/116219/116225/a/index.html" title="2026年7月金融统计数据报告">7月</a>
    <a href="/diaochatongjisi/116219/116225/b/index.html" title="2026年8月金融统计数据报告">8月</a><span>2026-09-14</span>`;
  assert.throws(() => parsePbcReportIndex(crossItemDate), /listing date missing for 2026年7月/);
});

test("PBOC HTML requests reject every HTTP redirect", async () => {
  const { fetchText } = await marketGenerator();
  let requestOptions;
  const fakeFetch = async (_url, options) => {
    requestOptions = options;
    return { ok: true, text: async () => "<html>official fixture</html>" };
  };
  assert.equal(await fetchText("https://www.pbc.gov.cn/example", fakeFetch), "<html>official fixture</html>");
  assert.equal(requestOptions.redirect, "error");
});

test("validates PBOC article identity and parses signed monetary and social-financing values", async () => {
  const { parsePbcFinancialReport } = await marketGenerator();
  const expected = { title: "2026年7月金融统计数据报告", listingDate: "2026-08-14" };
  const base = `<meta name="ArticleTitle" content="2026年7月金融统计数据报告"><span id="shijian">2026-08-14 16:30:05</span><p>广义货币（M2）余额同比增长7.7%。狭义货币（M1）余额同比下降0.4%。`;
  const fixture = `${base}社会融资规模存量为463.27万亿元，同比增长7.4%。前七个月社会融资规模增量累计为22.25万亿元。</p>`;
  assert.deepEqual(parsePbcFinancialReport(fixture, expected), {
    title: expected.title, publishedAt: "2026-08-14 16:30:05", m1Yoy: -0.4, m2Yoy: 7.7,
    socialFinancingStock: 463.27, socialFinancingStockYoy: 7.4, socialFinancingIncrementCum: 22.25,
  });
  assert.equal(parsePbcFinancialReport(`${base}社会融资规模存量为463.27万亿元，同比下降1.2%。社会融资规模增量累计为22.25万亿元。</p>`, expected).socialFinancingStockYoy, -1.2);
  assert.equal(parsePbcFinancialReport(`${base}社会融资规模存量为463.27万亿元，同比持平。社会融资规模增量累计为22.25万亿元。</p>`, expected).socialFinancingStockYoy, 0);
  assert.throws(() => parsePbcFinancialReport(fixture, { ...expected, title: "错误标题" }), /title mismatch/);
  assert.throws(() => parsePbcFinancialReport(fixture, { ...expected, listingDate: "2026-08-13" }), /does not match/);
  assert.throws(() => parsePbcFinancialReport(fixture.replace("狭义货币（M1）", "M1缺失"), expected), /Unable to parse/);
  assert.throws(() => parsePbcFinancialReport(fixture.replace("社会融资规模存量为", "社融存量缺失"), expected), /social financing stock/);
  assert.throws(() => parsePbcFinancialReport(fixture.replace("社会融资规模增量累计为", "社融累计缺失"), expected), /cumulative increment/);
});

test("builds L2 only when Tushare and PBOC agree within 0.05pct", async () => {
  const { buildL2Snapshot } = await marketGenerator();
  const report = { dataMonth: "202607", listingDate: "2026-08-14" };
  const official = { m1Yoy: 4, m2Yoy: 7.7 };
  const result = buildL2Snapshot([{ month: "202607", m1_yoy: "4.00", m2_yoy: "7.70" }], report, official);
  assert.equal(result.gap, -3.7);
  assert.equal(result.period, "2026-07");
  assert.throws(() => buildL2Snapshot([], report, official), /exactly one row/);
  assert.throws(() => buildL2Snapshot([{ month: "202607", m1_yoy: "x", m2_yoy: "7.7" }], report, official), /invalid M1\/M2/);
  assert.throws(() => buildL2Snapshot([{ month: "202607", m1_yoy: 3.9, m2_yoy: 7.7 }], report, official), /M1 YoY/);
  assert.throws(() => buildL2Snapshot([{ month: "202607", m1_yoy: 4, m2_yoy: 7.6 }], report, official), /M2 YoY/);
});

test("builds L3 only from one exact sf_month row and dual-source agreement", async () => {
  const { buildL3Snapshot } = await marketGenerator();
  const report = { dataMonth: "202607", listingDate: "2026-08-14" };
  const official = { socialFinancingStock: 463.27, socialFinancingStockYoy: 7.4, socialFinancingIncrementCum: 22.25 };
  const row = { month: "202607", inc_month: 12345, inc_cumval: 222500, stk_endval: 463.27 };
  const result = buildL3Snapshot([row, { ...row, month: "202606" }], report, official);
  assert.deepEqual(result, {
    month: "202607", incMonth: 12345, incCumval: 222500, stock: 463.27,
    incMonthTrillion: 1.2345, incCumTrillion: 22.25, stockYoy: 7.4,
    stockDifference: 0, cumulativeDifference: 0, period: "2026-07", release: "2026-08-14",
  });
  assert.equal(buildL3Snapshot([{ ...row, inc_month: -100 }], report, official).incMonthTrillion, -0.01);
  assert.throws(() => buildL3Snapshot([], report, official), /exactly one row/);
  assert.throws(() => buildL3Snapshot([row, row], report, official), /exactly one row/);
  for (const invalid of [null, "", Number.NaN]) {
    assert.throws(() => buildL3Snapshot([{ ...row, inc_month: invalid }], report, official), /invalid inc_month/);
  }
  assert.throws(() => buildL3Snapshot([{ ...row, inc_cumval: Infinity }], report, official), /invalid inc_cumval/);
  assert.throws(() => buildL3Snapshot([{ ...row, stk_endval: undefined }], report, official), /invalid stk_endval/);
  assert.throws(() => buildL3Snapshot([{ ...row, stk_endval: 0 }], report, official), /greater than zero/);
  assert.throws(() => buildL3Snapshot([row], report, { ...official, socialFinancingStock: Number.NaN }), /PBOC socialFinancingStock/);
  assert.throws(() => buildL3Snapshot([row], report, { ...official, socialFinancingStockYoy: null }), /PBOC socialFinancingStockYoy/);
  assert.throws(() => buildL3Snapshot([row], report, { ...official, socialFinancingIncrementCum: Infinity }), /PBOC socialFinancingIncrementCum/);
  assert.throws(() => buildL3Snapshot([row], report, { ...official, socialFinancingStock: 463.276 }), /stock values differ/);
  assert.throws(() => buildL3Snapshot([row], report, { ...official, socialFinancingIncrementCum: 22.256 }), /cumulative increment values differ/);
});

test("parses only exact MOF fiscal-report titles and enforces report URL safety", async () => {
  const { parseMofFiscalReportTitle, validateMofReportUrl } = await marketGenerator();
  assert.equal(parseMofFiscalReportTitle("2026年1-5月财政收支情况"), "202605");
  assert.equal(parseMofFiscalReportTitle("2026年一季度财政收支情况"), "202603");
  assert.equal(parseMofFiscalReportTitle("2026年上半年财政收支情况"), "202606");
  assert.equal(parseMofFiscalReportTitle("2026年前三季度财政收支情况"), "202609");
  assert.equal(parseMofFiscalReportTitle("2026年财政收支情况"), "202612");
  assert.equal(parseMofFiscalReportTitle("2026年彩票销售情况"), null);
  assert.equal(parseMofFiscalReportTitle("2026年中央政府收支及融资数据"), null);
  assert.equal(validateMofReportUrl("./202607/t20260722_3993943.htm"), "https://gks.mof.gov.cn/tongjishuju/202607/t20260722_3993943.htm");
  assert.throws(() => validateMofReportUrl("https://example.com/tongjishuju/a.htm"), /Unsafe MOF/);
  assert.throws(() => validateMofReportUrl("https://gks.mof.gov.cn/tongjishuju/"), /Unsafe MOF/);
  assert.throws(() => validateMofReportUrl("https://gks.mof.gov.cn/tongjishuju/index.htm"), /Unsafe MOF/);
  assert.throws(() => validateMofReportUrl("https://gks.mof.gov.cn/other/a.htm"), /Unsafe MOF/);
});

test("selects the latest non-future MOF listing without borrowing the next item date", async () => {
  const { parseMofFiscalReportIndex, selectLatestMofFiscalReport } = await marketGenerator();
  const fixture = `
    <li><a href="./202606/a.htm" title="2026年1-5月财政收支情况">1-5月</a><span>2026-06-22</span></li>
    <li><a href="./202607/b.htm" title="2026年上半年财政收支情况">上半年</a><span>2026-07-22</span></li>
    <li><a href="./202609/c.htm" title="2026年1-8月财政收支情况">1-8月</a><span>2026-09-20</span></li>`;
  const reports = parseMofFiscalReportIndex(fixture);
  assert.equal(selectLatestMofFiscalReport(reports, "2026-08-17").dataMonth, "202606");
  assert.equal(selectLatestMofFiscalReport(reports, "2026-06-30").dataMonth, "202605");
  assert.throws(() => selectLatestMofFiscalReport(reports, "2026-01-01"), /historical pagination is not implemented in task03G/);
  const crossItemDate = `<a href="./202607/a.htm" title="2026年上半年财政收支情况">上半年</a>
    <a href="./202609/b.htm" title="2026年前三季度财政收支情况">前三季度</a><span>2026-10-22</span>`;
  assert.throws(() => parseMofFiscalReportIndex(crossItemDate), /listing date missing/);
  const outOfItemDate = `<li><a href="./202607/a.htm" title="2026年上半年财政收支情况">上半年</a></li>
    <span>2026-07-22</span>
    <li><a href="./202609/b.htm" title="2026年前三季度财政收支情况">前三季度</a><span>2026-10-22</span></li>`;
  assert.throws(() => parseMofFiscalReportIndex(outOfItemDate), /MOF listing date missing for 2026年上半年财政收支情况/);
});

test("validates MOF article identity and parses signed fiscal values", async () => {
  const { parseMofFiscalReport } = await marketGenerator();
  const expected = { title: "2026年上半年财政收支情况", listingDate: "2026-07-22" };
  const article = (revenue, expenditure, title = expected.title, date = "2026年07月22日") => `
    <meta name="ArticleTitle" content="${title}"><p>${revenue}</p><p>${expenditure}</p><span>发布日期：${date}</span>`;
  const positive = article("全国一般公共预算收入121047亿元，同比增长4.7%", "全国一般公共预算支出143329亿元，同比增长1.5%");
  assert.deepEqual(parseMofFiscalReport(positive, expected), {
    title: expected.title, publishedAt: "2026-07-22", revenue: 121047, revenueYoy: 4.7, expenditure: 143329, expenditureYoy: 1.5,
  });
  assert.equal(parseMofFiscalReport(article("全国一般公共预算收入121047亿元，同比下降4.7%", "全国一般公共预算支出143329亿元，同比持平"), expected).revenueYoy, -4.7);
  assert.equal(parseMofFiscalReport(article("全国一般公共预算收入121047亿元，同比持平", "全国一般公共预算支出143329亿元，同比下降1.5%"), expected).revenueYoy, 0);
  assert.equal(parseMofFiscalReport(article("全国一般公共预算收入121047亿元，同比持平", "全国一般公共预算支出143329亿元，同比下降1.5%"), expected).expenditureYoy, -1.5);
  assert.throws(() => parseMofFiscalReport(positive, { ...expected, title: "错误标题" }), /title mismatch/);
  assert.throws(() => parseMofFiscalReport(positive, { ...expected, listingDate: "2026-07-21" }), /does not match/);
  assert.throws(() => parseMofFiscalReport(article("收入缺失", "全国一般公共预算支出143329亿元，同比增长1.5%"), expected), /预算收入/);
  assert.throws(() => parseMofFiscalReport(article("全国一般公共预算收入121047亿元，同比增长4.7%", "支出缺失"), expected), /预算支出/);
  assert.throws(() => parseMofFiscalReport(article("全国一般公共预算收入0亿元，同比增长4.7%", "全国一般公共预算支出143329亿元，同比增长1.5%"), expected), /greater than zero/);
  assert.throws(() => parseMofFiscalReport(article("全国一般公共预算收入121047亿元，同比增长4.7%", "全国一般公共预算支出0亿元，同比增长1.5%"), expected), /greater than zero/);
  assert.throws(() => parseMofFiscalReport(article("全国一般公共预算收入121047亿元，同比增长NaN%", "全国一般公共预算支出143329亿元，同比增长1.5%"), expected), /预算收入/);
});

test("rejects future as-of dates", async () => {
  const { parseAsOf } = await marketGenerator();
  assert.equal(parseAsOf(["--as-of", "2026-08-17"], "2026-08-17"), "2026-08-17");
  assert.throws(() => parseAsOf(["--as-of", "2026-08-18"], "2026-08-17"), /cannot be in the future/);
  assert.throws(() => parseAsOf(["--as-of", "2026-02-31"], "2026-08-17"), /must use YYYY-MM-DD/);
});

test("rejects current.json shapes that could crash the market page", async () => {
  const current = await currentMarketData();
  const isMarketResearchCurrent = await currentMarketGuard();

  const missingSource = structuredClone(current);
  delete missingSource.source;
  assert.equal(isMarketResearchCurrent(missingSource), false);

  const missingMofEvidence = structuredClone(current);
  delete missingMofEvidence.source.releaseEvidence.L4;
  assert.equal(isMarketResearchCurrent(missingMofEvidence), false);

  const emptyMofEvidenceField = structuredClone(current);
  emptyMofEvidenceField.source.releaseEvidence.L4.reportUrl = "";
  assert.equal(isMarketResearchCurrent(emptyMofEvidenceField), false);

  const invalidStates = structuredClone(current);
  invalidStates.diagnosis.states = "F 偏强";
  assert.equal(isMarketResearchCurrent(invalidStates), false);

  const missingCard = structuredClone(current);
  missingCard.cards = missingCard.cards.slice(0, 2);
  assert.equal(isMarketResearchCurrent(missingCard), false);

  const wrongComponentCount = structuredClone(current);
  wrongComponentCount.components.F = wrongComponentCount.components.F.slice(0, 3);
  assert.equal(isMarketResearchCurrent(wrongComponentCount), false);
});

test("keeps unsupported certainty language out of the user interface", async () => {
  const client = await builtClientText();
  const current = await currentMarketData();
  assert.doesNotMatch(`${client}\n${JSON.stringify(current)}`, /牛市概率|熊市概率|置信度/);
  const source = await appSource();
  assert.doesNotMatch(source, /最新可用数据/);
  assert.match(source, /<span>信息截止<\/span><b>\{display\(data\.asOf\)\}<\/b>/);
  assert.match(source, /当前为真实数据快照（L2\/L3经PBOC交叉验证，L4来自财政部官方）/);
  assert.doesNotMatch(source, /当前为双源校验真实快照/);
});
