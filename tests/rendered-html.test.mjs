import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
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
  assert.equal(current.schemaVersion, 2);
  assert.equal(current.source.mode, "generated");
  assert.equal(current.source.provider, "Tushare Pro");
  assert.equal(current.source.api, "index_dailybasic");
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

test("contains one real B3 snapshot and 13 explicitly pending indicators", async () => {
  const current = await currentMarketData();
  const components = [...current.components.F, ...current.components.L, ...current.components.B];
  const b3 = current.components.B.find((item) => item.id === "B3");

  assert.equal(b3.dataStatus, "generated");
  assert.match(b3.raw, /沪深300 PE TTM \d+\.\d{2} \/ PB \d+\.\d{2}；创业板指 PE TTM \d+\.\d{2} \/ PB \d+\.\d{2}/);
  assert.equal(b3.period, current.asOf);
  assert.equal(b3.position, null);
  assert.equal(b3.score, null);
  assert.match(b3.note, /历史分位和最终B3评分尚未实现/);
  assert.equal(components.filter((item) => item.dataStatus === "generated").length, 1);
  assert.equal(components.filter((item) => item.dataStatus === "pending" && item.score === null).length, 13);
  assert.match(current.dataQuality.coverage, /^\d+(?:\.\d+)?%$/);
  assert.equal(current.dataQuality.coverage, "7.1%");
  assert.ok(current.cards.every((card) => card.score === null));
  assert.match(current.cards.find((card) => card.code === "B").directionNote, /越高代表泡沫风险越高/);
});

test("disables unsupported aggregate diagnoses while only B3 is generated", async () => {
  const current = await currentMarketData();
  const serialized = JSON.stringify({ diagnosis: current.diagnosis, jointState: current.jointState });

  assert.doesNotMatch(serialized, /F 偏强|L 偏正|B 温热|黄金环境|热牛阶段/);
  assert.equal(current.diagnosis.investmentImplication, null);
  assert.equal(current.diagnosis.positionBias, null);
  assert.equal(current.jointState.nearestState, null);
});

test("selects the latest common trading date and builds B3 without network access", async () => {
  const { buildGeneratedCurrent, selectLatestCommonSnapshot } = await marketGenerator();
  const template = await currentMarketData();
  const rows = {
    "000300.SH": [
      { trade_date: "20260815", pe_ttm: 15, pb: 1.5 },
      { trade_date: "20260814", pe_ttm: 14.3637, pb: 1.4639 },
    ],
    "399006.SZ": [{ trade_date: "20260814", pe_ttm: 44.4014, pb: 6.0352 }],
  };
  const snapshot = selectLatestCommonSnapshot(rows, "2026-08-17");
  const generated = buildGeneratedCurrent(template, snapshot, "2026-08-17T10:00:00.000Z");

  assert.equal(snapshot.tradeDate, "20260814");
  assert.equal(generated.asOf, "2026-08-14");
  assert.equal(generated.dataQuality.coverage, "7.1%");
  assert.match(generated.components.B[2].raw, /14\.36.*1\.46.*44\.40.*6\.04/);
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

test("rejects current.json shapes that could crash the market page", async () => {
  const current = await currentMarketData();
  const isMarketResearchCurrent = await currentMarketGuard();

  const missingSource = structuredClone(current);
  delete missingSource.source;
  assert.equal(isMarketResearchCurrent(missingSource), false);

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
});
