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
  assert.deepEqual(current.source.apis, ["index_dailybasic", "cn_m", "shibor", "sf_month", "us_trycr", "daily_basic"]);
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

test("contains real L1-L5 and B1-B5 snapshots with 4 explicitly pending indicators", async () => {
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
  assert.equal(components.filter((item) => item.dataStatus === "generated").length, 10);
  assert.equal(components.filter((item) => item.dataStatus === "pending" && item.score === null).length, 4);
  assert.match(current.dataQuality.coverage, /^\d+(?:\.\d+)?%$/);
  assert.equal(current.dataQuality.coverage, "71.4%");
  assert.equal(current.dataQuality.pitStatus, "待接入");
  assert.deepEqual(current.cards.map((card) => card.coverage), ["0/4", "5/5", "5/5"]);
  assert.equal(current.cards.find((card) => card.code === "L").updatedAt, [l1.release, l2.release, l3.release, l4.release, l5.release].sort().reverse()[0]);
  assert.ok(current.cards.every((card) => card.score === null));
  assert.match(current.cards.find((card) => card.code === "B").directionNote, /越高代表泡沫风险越高/);
});

test("disables unsupported aggregate diagnoses while only ten indicators are generated", async () => {
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
  const generated = buildGeneratedCurrent(template, snapshot, b1, b2, b4, l1, l2, l3, l4, l5, evidence, "2026-08-17", "2026-08-17T10:00:00.000Z");

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
  assert.equal(generated.dataQuality.coverage, "71.4%");
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
  assert.match(generated.diagnosis.headline, /L1、L2、L3、L4、L5、B1、B2、B3、B4、B5/);
  assert.match(generated.dataQuality.warning, /其余4项/);
  assert.equal(generated.recentEvents.some((event) => event.group === "L1" && event.detail === generated.components.L[0].raw), true);
  assert.equal(generated.recentEvents.some((event) => event.group === "B5" && event.detail === generated.components.B[4].raw), true);
  assert.equal(generated.recentEvents.some((event) => event.group === "L3" && event.detail === generated.components.L[2].raw), true);
  assert.equal(generated.recentEvents.some((event) => event.group === "L4" && event.detail === generated.components.L[3].raw), true);
  assert.equal(generated.recentEvents.some((event) => event.group === "L5" && event.detail === generated.components.L[4].raw), true);
  assert.equal(generated.recentEvents.some((event) => event.group === "B1" && event.detail === generated.components.B[0].raw), true);
  assert.equal(generated.recentEvents.some((event) => event.group === "B2" && event.detail === generated.components.B[1].raw), true);
  assert.equal(generated.recentEvents.some((event) => event.group === "B4" && event.detail === generated.components.B[3].raw), true);
});

test("requests index turnover fields and records the exact six APIs", async () => {
  const source = await generatorSource();
  assert.match(source, /"ts_code,trade_date,pe_ttm,pb,turnover_rate,turnover_rate_f"/);
  const current = await currentMarketData();
  assert.deepEqual(current.source.apis, ["index_dailybasic", "cn_m", "shibor", "sf_month", "us_trycr", "daily_basic"]);
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
