import assert from "node:assert/strict";
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

  assert.equal(current.schemaVersion, 1);
  assert.equal(current.source.mode, "manual_sample");
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

test("keeps unsupported certainty language out of the user interface", async () => {
  const client = await builtClientText();
  const current = await currentMarketData();
  assert.doesNotMatch(`${client}\n${JSON.stringify(current)}`, /牛市概率|熊市概率|置信度/);
});
