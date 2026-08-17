import { readFile, rename, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { isMarketResearchCurrent } from "../app/market-research-types.ts";

export const TUSHARE_ENDPOINT = "https://api.tushare.pro";
export const PBOC_INDEX_URL = "https://www.pbc.gov.cn/diaochatongjisi/116219/116225/index.html";
export const MARKET_INDEX_INSTRUMENTS = [
  { code: "000300.SH", name: "沪深300", role: "broad" },
  { code: "399006.SZ", name: "创业板指", role: "technology" },
];

const compactDate = value => value.replaceAll("-", "");
const displayDate = value => `${value.slice(0, 4)}-${value.slice(4, 6)}-${value.slice(6, 8)}`;
const displayMonth = value => `${value.slice(0, 4)}-${value.slice(4, 6)}`;
const localToday = () => {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
};

export function parseAsOf(argv, today = localToday()) {
  const index = argv.indexOf("--as-of");
  const value = index === -1 ? today : argv[index + 1];
  const parsed = new Date(`${value}T00:00:00Z`);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value ?? "") || Number.isNaN(parsed.valueOf()) || parsed.toISOString().slice(0, 10) !== value) {
    throw new Error("--as-of must use YYYY-MM-DD");
  }
  if (value > today) throw new Error("--as-of cannot be in the future");
  return value;
}

function subtractDays(value, days) {
  const date = new Date(`${value}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() - days);
  return date.toISOString().slice(0, 10);
}

function decodeHtml(value) {
  return value.replace(/&nbsp;|&#160;/gi, " ").replace(/&amp;/gi, "&").replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'").replace(/&lt;/gi, "<").replace(/&gt;/gi, ">");
}

function htmlToText(html) {
  return decodeHtml(html.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, " ").replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, " ").replace(/<[^>]+>/g, " "))
    .replace(/\s+/g, " ").trim();
}

export function parsePbcFinancialReportTitle(title) {
  const normalized = htmlToText(title);
  let match = normalized.match(/^(\d{4})年(1|2|4|5|7|8|10|11)月金融统计数据报告$/);
  if (match) return `${match[1]}${match[2].padStart(2, "0")}`;
  match = normalized.match(/^(\d{4})年(一季度|上半年|前三季度)金融统计数据报告$/);
  if (match) return `${match[1]}${{ 一季度: "03", 上半年: "06", 前三季度: "09" }[match[2]]}`;
  match = normalized.match(/^(\d{4})年金融统计数据报告$/);
  return match ? `${match[1]}12` : null;
}

export function validatePbcReportUrl(href) {
  const url = new URL(href, PBOC_INDEX_URL);
  const prefix = "/diaochatongjisi/116219/116225/";
  if (url.protocol !== "https:" || url.hostname !== "www.pbc.gov.cn" || !url.pathname.startsWith(prefix)
    || url.pathname === `${prefix}index.html` || !url.pathname.endsWith("/index.html")) {
    throw new Error(`Unsafe PBOC report URL: ${url.href}`);
  }
  return url.href;
}

export function parsePbcReportIndex(html) {
  if (typeof html !== "string" || !html.trim()) throw new Error("PBOC report index returned empty HTML");
  const reports = [];
  const anchorPattern = /<a\b[^>]*?href=["']([^"']+)["'][^>]*?\s+title=["']([^"']+)["'][^>]*>[\s\S]*?<\/a>/gi;
  for (const match of html.matchAll(anchorPattern)) {
    const title = htmlToText(match[2]);
    const dataMonth = parsePbcFinancialReportTitle(title);
    if (!dataMonth) continue;
    const followingStart = (match.index ?? 0) + match[0].length;
    const remaining = html.slice(followingStart);
    const nextAnchorOffset = remaining.search(/<a\b/i);
    const closingItemOffset = remaining.search(/<\/table\s*>/i);
    const boundaryOffsets = [nextAnchorOffset, closingItemOffset].filter(offset => offset >= 0);
    const followingEnd = boundaryOffsets.length ? followingStart + Math.min(...boundaryOffsets) : html.length;
    const following = html.slice(followingStart, followingEnd);
    const dateMatch = following.match(/\b(\d{4}-\d{2}-\d{2})\b/);
    if (!dateMatch) throw new Error(`PBOC listing date missing for ${title}`);
    reports.push({ title, href: validatePbcReportUrl(match[1]), listingDate: dateMatch[1], dataMonth });
  }
  if (!reports.length) throw new Error("PBOC report index contains no supported financial reports");
  return reports;
}

export function selectLatestPublishedReport(reports, requestedAsOf) {
  const selected = reports.filter(report => report.listingDate <= requestedAsOf).sort((a, b) => b.listingDate.localeCompare(a.listingDate))[0];
  if (!selected) throw new Error("PBOC recent financial-report index does not cover requested as-of; historical pagination is not implemented in task03B");
  return selected;
}

function parseYearOnYear(text, label) {
  const escapedLabel = label.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const match = text.match(new RegExp(`${escapedLabel}[^。；]{0,120}?同比(增长|下降)\\s*([0-9]+(?:\\.[0-9]+)?)%`));
  if (match) return (match[1] === "下降" ? -1 : 1) * Number(match[2]);
  if (text.match(new RegExp(`${escapedLabel}[^。；]{0,120}?同比持平`))) return 0;
  throw new Error(`Unable to parse PBOC ${label} year-on-year value`);
}

export function parsePbcFinancialReport(html, expectedReport) {
  if (typeof html !== "string" || !html.trim()) throw new Error("PBOC financial report returned empty HTML");
  const titleMatch = html.match(/<meta\s+name=["']ArticleTitle["']\s+content=["']([^"']+)["']/i) ?? html.match(/<title>([^<]+)<\/title>/i);
  const title = titleMatch ? htmlToText(titleMatch[1]) : null;
  if (title !== expectedReport.title) throw new Error(`PBOC article title mismatch: expected ${expectedReport.title}, received ${title ?? "missing"}`);
  const publishedMatch = html.match(/<span\s+id=["']shijian["'][^>]*>\s*(\d{4}-\d{2}-\d{2}\s+\d{2}:\d{2}:\d{2})/i);
  if (!publishedMatch) throw new Error("PBOC article publishedAt is missing");
  const publishedAt = publishedMatch[1];
  if (publishedAt.slice(0, 10) !== expectedReport.listingDate) throw new Error("PBOC article date does not match its listing date");
  const text = htmlToText(html);
  return { title, publishedAt, m1Yoy: parseYearOnYear(text, "狭义货币（M1）"), m2Yoy: parseYearOnYear(text, "广义货币（M2）") };
}

export async function fetchText(url, fetchImpl = fetch) {
  const response = await fetchImpl(url, { redirect: "error", headers: { accept: "text/html;charset=utf-8" } });
  if (!response.ok) throw new Error(`HTTP ${response.status} from ${url}`);
  const html = await response.text();
  if (!html.trim()) throw new Error(`Empty HTML from ${url}`);
  return html;
}

export function parseTushareRows(data) {
  if (!data || !Array.isArray(data.fields) || !Array.isArray(data.items)) throw new Error("Tushare returned malformed data");
  return data.items.map(item => Object.fromEntries(data.fields.map((field, index) => [field, item[index]])));
}

export async function callTushare(apiName, params, fields, token, fetchImpl = fetch) {
  const response = await fetchImpl(TUSHARE_ENDPOINT, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ api_name: apiName, token, params, fields }) });
  if (!response.ok) throw new Error(`Tushare HTTP ${response.status}`);
  const payload = await response.json();
  if (payload.code !== 0) throw new Error(`Tushare API error ${payload.code}: ${payload.msg || "unknown error"}`);
  return parseTushareRows(payload.data);
}

export function selectLatestCommonSnapshot(rowsByCode, requestedAsOf) {
  const requested = compactDate(requestedAsOf);
  const dateSets = MARKET_INDEX_INSTRUMENTS.map(({ code }) => new Set((rowsByCode[code] ?? []).map(row => row.trade_date)));
  const commonDates = [...dateSets[0]].filter(date => date <= requested && dateSets[1].has(date)).sort().reverse();
  const tradeDate = commonDates[0];
  if (!tradeDate) throw new Error(`No common index_dailybasic trade date found on or before ${requestedAsOf}`);
  const values = Object.fromEntries(MARKET_INDEX_INSTRUMENTS.map(({ code }) => {
    const row = rowsByCode[code].find(item => item.trade_date === tradeDate);
    const peTtm = Number(row?.pe_ttm);
    const pb = Number(row?.pb);
    if (!Number.isFinite(peTtm) || !Number.isFinite(pb)) throw new Error(`Incomplete PE/PB data for ${code} on ${tradeDate}`);
    const turnoverRate = row?.turnover_rate === null || row?.turnover_rate === undefined || row?.turnover_rate === "" ? Number.NaN : Number(row.turnover_rate);
    const turnoverRateF = row?.turnover_rate_f === null || row?.turnover_rate_f === undefined || row?.turnover_rate_f === "" ? Number.NaN : Number(row.turnover_rate_f);
    if (!Number.isFinite(turnoverRate) || turnoverRate < 0) throw new Error(`Invalid turnover_rate for ${code} on ${tradeDate}`);
    if (!Number.isFinite(turnoverRateF) || turnoverRateF < 0) throw new Error(`Invalid turnover_rate_f for ${code} on ${tradeDate}`);
    return [code, { peTtm, pb, turnoverRate, turnoverRateF }];
  }));
  if (values["000300.SH"].turnoverRateF <= 0) throw new Error(`沪深300 turnover_rate_f must be greater than zero on ${tradeDate}`);
  return { tradeDate, values };
}

export function buildL2Snapshot(rows, report, official) {
  const matches = rows.filter(row => String(row.month) === report.dataMonth);
  if (matches.length !== 1) throw new Error(`Tushare cn_m must contain exactly one row for ${report.dataMonth}`);
  const m1Yoy = Number(matches[0].m1_yoy);
  const m2Yoy = Number(matches[0].m2_yoy);
  if (!Number.isFinite(m1Yoy) || !Number.isFinite(m2Yoy)) throw new Error(`Tushare cn_m contains invalid M1/M2 for ${report.dataMonth}`);
  if (Math.abs(official.m1Yoy - m1Yoy) > 0.05) throw new Error("PBOC/Tushare M1 YoY values differ by more than 0.05pct");
  if (Math.abs(official.m2Yoy - m2Yoy) > 0.05) throw new Error("PBOC/Tushare M2 YoY values differ by more than 0.05pct");
  return { m1Yoy, m2Yoy, gap: m1Yoy - m2Yoy, period: displayMonth(report.dataMonth), release: report.listingDate };
}

export function selectLatestShiborSnapshot(rows, requestedAsOf) {
  const requested = compactDate(requestedAsOf);
  const windowStart = compactDate(subtractDays(requestedAsOf, 30));
  const validDate = value => {
    if (!/^\d{8}$/.test(String(value ?? ""))) return false;
    const displayed = displayDate(String(value));
    const parsed = new Date(`${displayed}T00:00:00Z`);
    return !Number.isNaN(parsed.valueOf()) && parsed.toISOString().slice(0, 10) === displayed;
  };
  const eligibleDates = rows.map(row => String(row?.date ?? "")).filter(date => validDate(date) && date >= windowStart && date <= requested).sort().reverse();
  const selectedDate = eligibleDates[0];
  if (!selectedDate) throw new Error(`No valid Tushare shibor row found in the 30-day window ending ${requestedAsOf}`);
  const matches = rows.filter(row => String(row?.date) === selectedDate);
  if (matches.length !== 1) throw new Error(`Tushare shibor must contain exactly one row for ${selectedDate}`);
  const row = matches[0];
  const finiteRate = (value, label) => {
    const rate = value === null || value === undefined || value === "" ? Number.NaN : Number(value);
    if (!Number.isFinite(rate)) throw new Error(`Invalid SHIBOR ${label} for ${selectedDate}`);
    return rate;
  };
  const overnight = finiteRate(row.on, "ON");
  const oneWeek = finiteRate(row["1w"], "1W");
  const threeMonth = finiteRate(row["3m"], "3M");
  const oneYear = finiteRate(row["1y"], "1Y");
  const termSpread = oneYear - overnight;
  if (!Number.isFinite(termSpread)) throw new Error(`Invalid SHIBOR 1Y-ON term spread for ${selectedDate}`);
  return { date: displayDate(selectedDate), overnight, oneWeek, threeMonth, oneYear, termSpread };
}

export function buildGeneratedCurrent(template, snapshot, l1, l2, evidence, requestedAsOf, generatedAt = new Date().toISOString()) {
  const b3Date = displayDate(snapshot.tradeDate);
  const broad = snapshot.values["000300.SH"];
  const technology = snapshot.values["399006.SZ"];
  const b3Raw = `沪深300 PE TTM ${broad.peTtm.toFixed(2)} / PB ${broad.pb.toFixed(2)}；创业板指 PE TTM ${technology.peTtm.toFixed(2)} / PB ${technology.pb.toFixed(2)}`;
  const relativeFreeTurnover = technology.turnoverRateF / broad.turnoverRateF;
  if (!Number.isFinite(relativeFreeTurnover)) throw new Error("Relative free-turnover ratio is not finite");
  const b5Raw = `沪深300换手率 ${broad.turnoverRate.toFixed(2)}%（自由流通 ${broad.turnoverRateF.toFixed(2)}%）；创业板指换手率 ${technology.turnoverRate.toFixed(2)}%（自由流通 ${technology.turnoverRateF.toFixed(2)}%）；自由流通换手比 ${relativeFreeTurnover.toFixed(2)}x`;
  const gapText = `${l2.gap >= 0 ? "+" : ""}${l2.gap.toFixed(2)}pct`;
  const l2Raw = `M1同比 ${l2.m1Yoy.toFixed(2)}% / M2同比 ${l2.m2Yoy.toFixed(2)}% / 剪刀差 ${gapText}`;
  const spreadText = `${l1.termSpread >= 0 ? "+" : ""}${l1.termSpread.toFixed(4)}pct`;
  const l1Raw = `SHIBOR隔夜 ${l1.overnight.toFixed(4)}% / 1周 ${l1.oneWeek.toFixed(4)}% / 3月 ${l1.threeMonth.toFixed(4)}% / 1年 ${l1.oneYear.toFixed(4)}% / 1Y-ON期限差 ${spreadText}`;
  const pending = indicator => ({ ...indicator, score: null, raw: null, position: null, trend: null, period: null, release: null, coverage: null, quality: null, note: "真实数据尚未接入", dataStatus: "pending" });
  const components = Object.fromEntries(Object.entries(template.components).map(([code, indicators]) => [code, indicators.map(pending)]));
  components.L = components.L.map(indicator => {
    if (indicator.id === "L1") return { ...indicator, raw: l1Raw, period: l1.date, release: l1.date, coverage: "4/4名义期限", quality: "A", note: "当前仅接入SHIBOR隔夜、1周、3月、1年真实名义资金利率，作为L1第一阶段名义利率代理；尚未接入CPI/通胀预期和实际利率，也不计算历史分位、趋势和L1评分。", dataStatus: "generated" };
    if (indicator.id === "L2") return {
      ...indicator, raw: l2Raw, period: l2.period, release: l2.release, coverage: "100%", quality: "A",
      note: `${l2.period >= "2025-01" ? "真实货币供应量月度快照；发布日期由中国人民银行金融统计数据报告确认，M1/M2与Tushare cn_m交叉校验一致；M1按2025年1月起修订口径理解。" : "该月份属于历史M1统计口径，不得与2025年后的新口径序列直接拼接。"}历史分位、趋势和L2评分尚未实现。`, dataStatus: "generated",
    };
    return indicator;
  });
  components.B = components.B.map(indicator => {
    if (indicator.id === "B3") return { ...indicator, raw: b3Raw, period: b3Date, release: b3Date, coverage: "100%", quality: "A", note: "当前为真实截面估值；历史分位和最终B3评分尚未实现。", dataStatus: "generated" };
    if (indicator.id === "B5") return { ...indicator, raw: b5Raw, period: b3Date, release: b3Date, coverage: "2/2代理指数", quality: "A", note: "当前仅接入沪深300与创业板指真实换手率截面，作为B5第一阶段交易活跃度代理；尚未接入全市场涨跌停、市场宽度、成交集中度和历史分位，因此不能据此判断投机高温或低温，也不计算B5评分。", dataStatus: "generated" };
    return indicator;
  });
  const allIndicators = Object.values(components).flat();
  const generatedIndicators = allIndicators.filter(indicator => indicator.dataStatus === "generated");
  const generatedIds = generatedIndicators.map(indicator => indicator.id);
  const generatedCount = generatedIndicators.length;
  const pendingCount = allIndicators.length - generatedCount;
  const generatedLabel = generatedIds.join("、");
  const totalCoverage = `${((generatedCount / allIndicators.length) * 100).toFixed(1)}%`;
  const cards = template.cards.map(card => {
    const indicators = components[card.code];
    const generated = indicators.filter(indicator => indicator.dataStatus === "generated");
    const updatedAt = generated.map(indicator => indicator.release).filter(Boolean).sort().reverse()[0] ?? null;
    return { ...card, score: null, status: generated.length ? "数据接入中" : "待计算", coverage: `${generated.length}/${indicators.length}`, updatedAt, tone: "pending", trend: [], drivers: [], risks: [] };
  });
  return {
    ...template, schemaVersion: 3, generatedAt,
    source: { mode: "generated", label: "Real current snapshot; L2 cross-verified by PBOC", providers: ["Tushare Pro", "中国人民银行"], apis: ["index_dailybasic", "cn_m", "shibor"], instruments: MARKET_INDEX_INSTRUMENTS, releaseEvidence: { L2: { provider: "中国人民银行", indexUrl: PBOC_INDEX_URL, reportTitle: evidence.title, reportUrl: evidence.href, publishedAt: evidence.publishedAt } } },
    asOf: requestedAsOf,
    diagnosis: { states: ["F 待计算", "L 数据接入中", "B 数据接入中"], headline: `真实市场数据接入中：${generatedLabel}已生成`, diagnosis: `当前仅${generatedLabel}已由真实数据生成，其余${pendingCount}项尚未接入，因此暂不形成F/L/B综合市场判断。`, investmentImplication: null, riskNote: null, positionBias: null },
    cards, policyOverlay: { status: null, tone: "pending", reasons: [] },
    jointState: { nearestState: null, transitioningTo: null, trendLabel: null, description: "数据不足，暂不判断" },
    stateMap: template.stateMap.map(row => [row[0], row[1], row[2], row[3], ""]), drivers: [], risks: [],
    dataQuality: { grade: "Partial", coverage: totalCoverage, pitStatus: "待接入", warning: `仅${generatedLabel}已由真实数据生成，其余${pendingCount}项待接入` },
    recentHistory: [],
    recentEvents: [
      { date: l1.date.slice(5), title: "L1名义资金利率代理快照生成", detail: l1Raw, group: "L1", tone: "blue" },
      { date: l2.release.slice(5), title: "L2货币供应量快照生成", detail: l2Raw, group: "L2", tone: "blue" },
      { date: b3Date.slice(5), title: "B3真实估值截面生成", detail: b3Raw, group: "B3", tone: "blue" },
      { date: b3Date.slice(5), title: "B5交易活跃度代理快照生成", detail: b5Raw, group: "B5", tone: "blue" },
    ].sort((a, b) => b.date.localeCompare(a.date)), components,
  };
}

async function writeAtomically(target, value) {
  const temporary = `${target}.tmp-${process.pid}-${Date.now()}`;
  try { await writeFile(temporary, `${JSON.stringify(value, null, 2)}\n`, "utf8"); await rename(temporary, target); }
  catch (error) { await unlink(temporary).catch(() => {}); throw error; }
}

export async function main(argv = process.argv.slice(2)) {
  const token = process.env.TUSHARE_TOKEN;
  if (!token) throw new Error("TUSHARE_TOKEN is required");
  const requestedAsOf = parseAsOf(argv);
  const startDate = subtractDays(requestedAsOf, 45);
  const rows = await Promise.all(MARKET_INDEX_INSTRUMENTS.map(async instrument => [instrument.code, await callTushare("index_dailybasic", { ts_code: instrument.code, start_date: compactDate(startDate), end_date: compactDate(requestedAsOf) }, "ts_code,trade_date,pe_ttm,pb,turnover_rate,turnover_rate_f", token)]));
  const snapshot = selectLatestCommonSnapshot(Object.fromEntries(rows), requestedAsOf);
  const report = selectLatestPublishedReport(parsePbcReportIndex(await fetchText(PBOC_INDEX_URL)), requestedAsOf);
  const official = parsePbcFinancialReport(await fetchText(report.href), report);
  const l2 = buildL2Snapshot(await callTushare("cn_m", { m: report.dataMonth }, "month,m1_yoy,m2_yoy", token), report, official);
  const shiborStartDate = subtractDays(requestedAsOf, 30);
  const l1 = selectLatestShiborSnapshot(await callTushare("shibor", { start_date: compactDate(shiborStartDate), end_date: compactDate(requestedAsOf) }, "date,on,1w,3m,1y", token), requestedAsOf);
  const target = path.resolve("public/data/market-research/current.json");
  const template = JSON.parse(await readFile(target, "utf8"));
  const current = buildGeneratedCurrent(template, snapshot, l1, l2, { ...report, publishedAt: official.publishedAt }, requestedAsOf);
  if (!isMarketResearchCurrent(current)) throw new Error("Generated current.json failed the current MarketResearchCurrent contract");
  await writeAtomically(target, current);
  console.log(`Generated ${path.relative(process.cwd(), target)} with information cutoff ${current.asOf}`);
  console.log(`PBOC: ${report.title} (${official.publishedAt})`);
  console.log(`L1: ${current.components.L.find(indicator => indicator.id === "L1").raw}`);
  console.log(`L2: ${current.components.L.find(indicator => indicator.id === "L2").raw}`);
  console.log(`B3: ${current.components.B.find(indicator => indicator.id === "B3").raw}`);
  console.log(`B5: ${current.components.B.find(indicator => indicator.id === "B5").raw}`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch(error => { console.error(error instanceof Error ? error.message : String(error)); process.exitCode = 1; });
}
