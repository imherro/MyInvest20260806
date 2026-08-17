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

test("renders the MY INVEST application shell", async () => {
  const response = await render();
  assert.equal(response.status, 200);
  assert.match(response.headers.get("content-type") ?? "", /^text\/html\b/i);

  const html = await response.text();
  assert.match(html, /<title>MY INVEST｜投资研究系统<\/title>/i);
  assert.match(html, /投资研究系统原型/);
  assert.match(html, /今日总览/);
});

test("ships the complete F/L/B market research contract", async () => {
  const client = await builtClientText();

  for (const text of [
    "市场研究",
    "长牛底座",
    "发动机",
    "货币信用",
    "汽油",
    "估值泡沫",
    "转速表",
    "POLICY OVERLAY",
    "政策制度环境",
    "联合市场状态",
    "Point-in-Time",
    "待接入",
    "当前页面使用示例数据",
    "分数越高代表泡沫风险越高",
  ]) {
    assert.match(client, new RegExp(text), `missing rendered product text: ${text}`);
  }
  assert.match(client, /静态原型|示例数据/);
});

test("ships all 14 market indicators with their names", async () => {
  const client = await builtClientText();
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
    assert.match(client, new RegExp(code), `missing indicator code: ${code}`);
    assert.match(client, new RegExp(name.replaceAll("/", "\\/")), `missing indicator name: ${name}`);
  }
});

test("keeps unsupported certainty language out of the user interface", async () => {
  const client = await builtClientText();
  assert.doesNotMatch(client, /牛市概率|熊市概率|置信度/);
});
