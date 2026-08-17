import { readFile, rename, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { isMarketResearchCurrent } from "../app/market-research-types.ts";

export const TUSHARE_ENDPOINT = "https://api.tushare.pro";
export const PBOC_INDEX_URL = "https://www.pbc.gov.cn/diaochatongjisi/116219/116225/index.html";
export const MOF_INDEX_URL = "https://gks.mof.gov.cn/tongjishuju/";
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

export function parseMofFiscalReportTitle(title) {
  const normalized = htmlToText(title);
  let match = normalized.match(/^(\d{4})年1-(\d{1,2})月财政收支情况$/);
  if (match) {
    const month = Number(match[2]);
    return month >= 2 && month <= 11 ? `${match[1]}${String(month).padStart(2, "0")}` : null;
  }
  match = normalized.match(/^(\d{4})年(一季度|上半年|前三季度)财政收支情况$/);
  if (match) return `${match[1]}${{ 一季度: "03", 上半年: "06", 前三季度: "09" }[match[2]]}`;
  match = normalized.match(/^(\d{4})年财政收支情况$/);
  return match ? `${match[1]}12` : null;
}

export function validateMofReportUrl(href) {
  const url = new URL(href, MOF_INDEX_URL);
  const isColumnHome = url.pathname === "/tongjishuju/index.htm";
  if (url.protocol !== "https:" || url.hostname !== "gks.mof.gov.cn"
    || !url.pathname.startsWith("/tongjishuju/") || !url.pathname.endsWith(".htm") || isColumnHome) {
    throw new Error(`Unsafe MOF fiscal report URL: ${url.href}`);
  }
  return url.href;
}

export function parseMofFiscalReportIndex(html) {
  if (typeof html !== "string" || !html.trim()) throw new Error("MOF fiscal-report index returned empty HTML");
  const reports = [];
  const anchors = [...html.matchAll(/<a\b([^>]*)>[\s\S]*?<\/a>/gi)];
  for (let index = 0; index < anchors.length; index += 1) {
    const match = anchors[index];
    const hrefMatch = match[1].match(/\bhref=["']([^"']+)["']/i);
    const titleMatch = match[1].match(/\btitle=["']([^"']+)["']/i);
    if (!hrefMatch || !titleMatch) continue;
    const title = htmlToText(titleMatch[1]);
    const dataMonth = parseMofFiscalReportTitle(title);
    if (!dataMonth) continue;
    const followingStart = (match.index ?? 0) + match[0].length;
    const remaining = html.slice(followingStart);
    const nextAnchorOffset = remaining.search(/<a\b/i);
    const closingItemOffset = remaining.search(/<\/li\s*>/i);
    const boundaryOffsets = [nextAnchorOffset, closingItemOffset].filter(offset => offset >= 0);
    const followingEnd = boundaryOffsets.length ? followingStart + Math.min(...boundaryOffsets) : html.length;
    const dateMatch = html.slice(followingStart, followingEnd).match(/\b(\d{4}-\d{2}-\d{2})\b/);
    if (!dateMatch) throw new Error(`MOF listing date missing for ${title}`);
    reports.push({ title, href: validateMofReportUrl(hrefMatch[1]), listingDate: dateMatch[1], dataMonth });
  }
  if (!reports.length) throw new Error("MOF fiscal-report index contains no supported reports");
  return reports;
}

export function selectLatestMofFiscalReport(reports, requestedAsOf) {
  const earliest = reports.map(report => report.listingDate).sort()[0];
  if (!earliest || requestedAsOf < earliest) {
    throw new Error("MOF recent fiscal-report index does not cover requested as-of; historical pagination is not implemented in task03G");
  }
  const selected = reports.filter(report => report.listingDate <= requestedAsOf)
    .sort((a, b) => b.listingDate.localeCompare(a.listingDate))[0];
  if (!selected) throw new Error("MOF fiscal-report index contains no report on or before requested as-of");
  return selected;
}

function parseMofFiscalValue(text, label) {
  const escapedLabel = label.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const prefix = `${escapedLabel}\\s*([0-9]+(?:\\.[0-9]+)?)\\s*亿元\\s*[，,]?\\s*同比`;
  let match = text.match(new RegExp(`${prefix}\\s*(增长|下降)\\s*([0-9]+(?:\\.[0-9]+)?)\\s*%`));
  if (match) return { value: Number(match[1]), yoy: (match[2] === "下降" ? -1 : 1) * Number(match[3]) };
  match = text.match(new RegExp(`${prefix}\\s*持平`));
  if (match) return { value: Number(match[1]), yoy: 0 };
  throw new Error(`Unable to parse MOF ${label}`);
}

export function parseMofFiscalReport(html, expectedReport) {
  if (typeof html !== "string" || !html.trim()) throw new Error("MOF fiscal report returned empty HTML");
  const titleMatch = html.match(/<meta\s+name=["']ArticleTitle["']\s+content=["']([^"']+)["']/i)
    ?? html.match(/<h2\b[^>]*class=["'][^"']*title_con[^"']*["'][^>]*>([\s\S]*?)<\/h2>/i)
    ?? html.match(/<title>([^<]+)<\/title>/i);
  const title = titleMatch ? htmlToText(titleMatch[1]) : null;
  if (title !== expectedReport.title) throw new Error(`MOF article title mismatch: expected ${expectedReport.title}, received ${title ?? "missing"}`);
  const text = htmlToText(html).replace(/(\d)\s*\.\s*(\d)/g, "$1.$2");
  const publishedMatch = text.match(/发布日期[：:]\s*(\d{4})年(\d{2})月(\d{2})日/);
  if (!publishedMatch) throw new Error("MOF article published date is missing");
  const publishedAt = `${publishedMatch[1]}-${publishedMatch[2]}-${publishedMatch[3]}`;
  if (publishedAt !== expectedReport.listingDate) throw new Error("MOF article date does not match its listing date");
  const revenue = parseMofFiscalValue(text, "全国一般公共预算收入");
  const expenditure = parseMofFiscalValue(text, "全国一般公共预算支出");
  const values = [revenue.value, revenue.yoy, expenditure.value, expenditure.yoy];
  if (!values.every(Number.isFinite)) throw new Error("MOF fiscal values are not finite");
  if (revenue.value <= 0 || expenditure.value <= 0) throw new Error("MOF fiscal revenue and expenditure must be greater than zero");
  return { title, publishedAt, revenue: revenue.value, revenueYoy: revenue.yoy, expenditure: expenditure.value, expenditureYoy: expenditure.yoy };
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
  const stockMatch = text.match(/社会融资规模存量为\s*([0-9]+(?:\.[0-9]+)?)\s*万亿元[，,]\s*同比(增长|下降)\s*([0-9]+(?:\.[0-9]+)?)%/)
    ?? text.match(/社会融资规模存量为\s*([0-9]+(?:\.[0-9]+)?)\s*万亿元[，,]\s*(同比持平)/);
  if (!stockMatch) throw new Error("Unable to parse PBOC social financing stock and year-on-year value");
  const socialFinancingStock = Number(stockMatch[1]);
  const socialFinancingStockYoy = stockMatch[2] === "同比持平" ? 0 : (stockMatch[2] === "下降" ? -1 : 1) * Number(stockMatch[3]);
  const incrementMatch = text.match(/社会融资规模增量累计为\s*([0-9]+(?:\.[0-9]+)?)\s*万亿元/);
  if (!incrementMatch) throw new Error("Unable to parse PBOC social financing cumulative increment");
  const socialFinancingIncrementCum = Number(incrementMatch[1]);
  if (![socialFinancingStock, socialFinancingStockYoy, socialFinancingIncrementCum].every(Number.isFinite)) {
    throw new Error("PBOC social financing values are not finite");
  }
  return {
    title, publishedAt,
    m1Yoy: parseYearOnYear(text, "狭义货币（M1）"),
    m2Yoy: parseYearOnYear(text, "广义货币（M2）"),
    socialFinancingStock,
    socialFinancingStockYoy,
    socialFinancingIncrementCum,
  };
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

export function buildB1Snapshot(snapshot) {
  const earningsYield = (value, label) => {
    const peTtm = value === null || value === undefined || value === "" ? Number.NaN : Number(value);
    if (!Number.isFinite(peTtm) || peTtm <= 0) throw new Error(`${label} PE TTM must be finite and greater than zero`);
    const result = 100 / peTtm;
    if (!Number.isFinite(result)) throw new Error(`${label} earnings yield is not finite`);
    return result;
  };
  return {
    tradeDate: snapshot.tradeDate,
    broadEarningsYield: earningsYield(snapshot.values?.["000300.SH"]?.peTtm, "沪深300"),
    growthEarningsYield: earningsYield(snapshot.values?.["399006.SZ"]?.peTtm, "创业板指"),
  };
}

export function buildB4Snapshot(rows, snapshot) {
  if (!Array.isArray(rows) || rows.length === 0) throw new Error("Tushare daily_basic returned no rows for market-cap snapshot");
  if (rows.length >= 6000) throw new Error("Tushare daily_basic reached the 6000-row limit; market-cap snapshot may be truncated");
  const codes = new Set();
  let totalMarketCapWan = 0;
  for (const row of rows) {
    if (String(row?.trade_date ?? "") !== snapshot.tradeDate) throw new Error(`Tushare daily_basic contains a row outside ${snapshot.tradeDate}`);
    const tsCode = typeof row?.ts_code === "string" ? row.ts_code.trim() : "";
    if (!tsCode) throw new Error("Tushare daily_basic contains an empty ts_code");
    if (codes.has(tsCode)) throw new Error(`Tushare daily_basic contains duplicate ts_code ${tsCode}`);
    codes.add(tsCode);
    const value = row.total_mv;
    const totalMv = value === null || value === undefined || value === "" ? Number.NaN : Number(value);
    if (!Number.isFinite(totalMv) || totalMv <= 0) throw new Error(`Tushare daily_basic contains invalid total_mv for ${tsCode}`);
    totalMarketCapWan += totalMv;
  }
  if (!Number.isFinite(totalMarketCapWan) || totalMarketCapWan <= 0) throw new Error("A-share total market cap in wan yuan is invalid");
  const totalMarketCapTrillion = totalMarketCapWan / 100000000;
  if (!Number.isFinite(totalMarketCapTrillion) || totalMarketCapTrillion <= 0) throw new Error("A-share total market cap in trillion yuan is invalid");
  return { tradeDate: snapshot.tradeDate, stockCount: rows.length, totalMarketCapWan, totalMarketCapTrillion };
}

export function buildB2Snapshot(rows, snapshot, b4) {
  if (b4.tradeDate !== snapshot.tradeDate || b4.stockCount !== rows.length) throw new Error("B2 requires the validated B4 shared-date row batch");
  let observedCount = 0;
  let observedMarketCapWan = 0;
  let weightedDividendValue = 0;
  for (const row of rows) {
    const value = row.dv_ttm;
    if (value === null || value === undefined || value === "") continue;
    const dividendYield = Number(value);
    if (!Number.isFinite(dividendYield) || dividendYield < 0) throw new Error(`Tushare daily_basic contains invalid dv_ttm for ${row.ts_code}`);
    const totalMv = Number(row.total_mv);
    observedCount += 1;
    observedMarketCapWan += totalMv;
    weightedDividendValue += totalMv * dividendYield;
  }
  if (observedCount <= 0 || !Number.isFinite(observedMarketCapWan) || observedMarketCapWan <= 0) throw new Error("Tushare daily_basic contains no valid dv_ttm sample");
  const marketCapCoverage = observedMarketCapWan / b4.totalMarketCapWan * 100;
  const weightedDividendYield = weightedDividendValue / observedMarketCapWan;
  if (!Number.isFinite(marketCapCoverage) || marketCapCoverage <= 0 || marketCapCoverage > 100
    || !Number.isFinite(weightedDividendYield) || weightedDividendYield < 0) {
    throw new Error("B2 weighted dividend-yield result is invalid");
  }
  return { tradeDate: snapshot.tradeDate, observedCount, missingCount: rows.length - observedCount, observedMarketCapWan, marketCapCoverage, weightedDividendYield };
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

export function buildL3Snapshot(rows, report, official) {
  const matches = rows.filter(row => String(row.month) === report.dataMonth);
  if (matches.length !== 1) throw new Error(`Tushare sf_month must contain exactly one row for ${report.dataMonth}`);
  const row = matches[0];
  const finiteValue = (value, label) => {
    const numeric = value === null || value === undefined || value === "" ? Number.NaN : Number(value);
    if (!Number.isFinite(numeric)) throw new Error(`Tushare sf_month contains invalid ${label} for ${report.dataMonth}`);
    return numeric;
  };
  const incMonth = finiteValue(row.inc_month, "inc_month");
  const incCumval = finiteValue(row.inc_cumval, "inc_cumval");
  const stock = finiteValue(row.stk_endval, "stk_endval");
  const officialStock = finiteValue(official.socialFinancingStock, "PBOC socialFinancingStock");
  const officialStockYoy = finiteValue(official.socialFinancingStockYoy, "PBOC socialFinancingStockYoy");
  const officialIncrementCum = finiteValue(official.socialFinancingIncrementCum, "PBOC socialFinancingIncrementCum");
  if (stock <= 0) throw new Error(`Tushare sf_month stk_endval must be greater than zero for ${report.dataMonth}`);
  const incMonthTrillion = incMonth / 10000;
  const incCumTrillion = incCumval / 10000;
  const stockDifference = Math.abs(officialStock - stock);
  const cumulativeDifference = Math.abs(officialIncrementCum - incCumTrillion);
  const exceedsTolerance = difference => difference > 0.005 + 1e-12;
  if (exceedsTolerance(stockDifference)) throw new Error("PBOC/Tushare social financing stock values differ by more than 0.005 trillion yuan");
  if (exceedsTolerance(cumulativeDifference)) throw new Error("PBOC/Tushare social financing cumulative increment values differ by more than 0.005 trillion yuan");
  return {
    month: report.dataMonth,
    incMonth,
    incCumval,
    stock,
    incMonthTrillion,
    incCumTrillion,
    stockYoy: officialStockYoy,
    stockDifference,
    cumulativeDifference,
    period: displayMonth(report.dataMonth),
    release: report.listingDate,
  };
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

export function selectLatestUsRealYieldSnapshot(rows, requestedAsOf) {
  const requested = compactDate(requestedAsOf);
  const windowStart = compactDate(subtractDays(requestedAsOf, 30));
  const validDate = value => {
    if (!/^\d{8}$/.test(String(value ?? ""))) return false;
    const displayed = displayDate(String(value));
    const parsed = new Date(`${displayed}T00:00:00Z`);
    return !Number.isNaN(parsed.valueOf()) && parsed.toISOString().slice(0, 10) === displayed;
  };
  const selectedDate = rows.map(row => String(row?.date ?? ""))
    .filter(date => validDate(date) && date >= windowStart && date < requested).sort().reverse()[0];
  if (!selectedDate) throw new Error(`No valid Tushare us_trycr row found before ${requestedAsOf} in the 30-day window`);
  const matches = rows.filter(row => String(row?.date) === selectedDate);
  if (matches.length !== 1) throw new Error(`Tushare us_trycr must contain exactly one row for ${selectedDate}`);
  const value = matches[0].y10;
  const y10 = value === null || value === undefined || value === "" ? Number.NaN : Number(value);
  if (!Number.isFinite(y10)) throw new Error(`Invalid US 10Y real yield for ${selectedDate}`);
  return { date: displayDate(selectedDate), y10 };
}

export function buildGeneratedCurrent(template, snapshot, b1, b2, b4, l1, l2, l3, l4, l5, evidence, requestedAsOf, generatedAt = new Date().toISOString()) {
  const b3Date = displayDate(snapshot.tradeDate);
  const broad = snapshot.values["000300.SH"];
  const technology = snapshot.values["399006.SZ"];
  const b3Raw = `沪深300 PE TTM ${broad.peTtm.toFixed(2)} / PB ${broad.pb.toFixed(2)}；创业板指 PE TTM ${technology.peTtm.toFixed(2)} / PB ${technology.pb.toFixed(2)}`;
  const b1Raw = `沪深300盈利收益率 ${b1.broadEarningsYield.toFixed(2)}%；创业板指盈利收益率 ${b1.growthEarningsYield.toFixed(2)}%`;
  const b4Raw = `A股当日记录总市值 ${b4.totalMarketCapTrillion.toFixed(2)}万亿元 / 覆盖 ${b4.stockCount}只股票`;
  const b2Raw = `A股有值样本市值加权TTM股息率 ${b2.weightedDividendYield.toFixed(2)}% / 有值 ${b2.observedCount}只 / 市值覆盖 ${b2.marketCapCoverage.toFixed(1)}%`;
  const relativeFreeTurnover = technology.turnoverRateF / broad.turnoverRateF;
  if (!Number.isFinite(relativeFreeTurnover)) throw new Error("Relative free-turnover ratio is not finite");
  const b5Raw = `沪深300换手率 ${broad.turnoverRate.toFixed(2)}%（自由流通 ${broad.turnoverRateF.toFixed(2)}%）；创业板指换手率 ${technology.turnoverRate.toFixed(2)}%（自由流通 ${technology.turnoverRateF.toFixed(2)}%）；自由流通换手比 ${relativeFreeTurnover.toFixed(2)}x`;
  const gapText = `${l2.gap >= 0 ? "+" : ""}${l2.gap.toFixed(2)}pct`;
  const l2Raw = `M1同比 ${l2.m1Yoy.toFixed(2)}% / M2同比 ${l2.m2Yoy.toFixed(2)}% / 剪刀差 ${gapText}`;
  const spreadText = `${l1.termSpread >= 0 ? "+" : ""}${l1.termSpread.toFixed(4)}pct`;
  const l1Raw = `SHIBOR隔夜 ${l1.overnight.toFixed(4)}% / 1周 ${l1.oneWeek.toFixed(4)}% / 3月 ${l1.threeMonth.toFixed(4)}% / 1年 ${l1.oneYear.toFixed(4)}% / 1Y-ON期限差 ${spreadText}`;
  const l3Raw = `社融当月增量 ${l3.incMonthTrillion.toFixed(4)}万亿元 / 年内累计 ${l3.incCumTrillion.toFixed(2)}万亿元 / 存量 ${l3.stock.toFixed(2)}万亿元 / 存量同比 ${l3.stockYoy.toFixed(1)}%`;
  const signedYoy = value => `${value > 0 ? "+" : ""}${value.toFixed(1)}%`;
  const l4Raw = `一般公共预算累计收入 ${(l4.revenue / 10000).toFixed(4)}万亿元（同比 ${signedYoy(l4.revenueYoy)}） / 累计支出 ${(l4.expenditure / 10000).toFixed(4)}万亿元（同比 ${signedYoy(l4.expenditureYoy)}）`;
  const l5Raw = `美国10年实际国债收益率 ${l5.y10.toFixed(2)}%`;
  const pending = indicator => ({ ...indicator, score: null, raw: null, position: null, trend: null, period: null, release: null, coverage: null, quality: null, note: "真实数据尚未接入", dataStatus: "pending" });
  const components = Object.fromEntries(Object.entries(template.components).map(([code, indicators]) => [code, indicators.map(pending)]));
  components.L = components.L.map(indicator => {
    if (indicator.id === "L1") return { ...indicator, raw: l1Raw, period: l1.date, release: l1.date, coverage: "4/4名义期限", quality: "A", note: "当前仅接入SHIBOR隔夜、1周、3月、1年真实名义资金利率，作为L1第一阶段名义利率代理；尚未接入CPI/通胀预期和实际利率，也不计算历史分位、趋势和L1评分。", dataStatus: "generated" };
    if (indicator.id === "L2") return {
      ...indicator, raw: l2Raw, period: l2.period, release: l2.release, coverage: "100%", quality: "A",
      note: `${l2.period >= "2025-01" ? "真实货币供应量月度快照；发布日期由中国人民银行金融统计数据报告确认，M1/M2与Tushare cn_m交叉校验一致；M1按2025年1月起修订口径理解。" : "该月份属于历史M1统计口径，不得与2025年后的新口径序列直接拼接。"}历史分位、趋势和L2评分尚未实现。`, dataStatus: "generated",
    };
    if (indicator.id === "L3") return {
      ...indicator, raw: l3Raw, period: l3.period, release: l3.release, coverage: "1/1全国社融", quality: "A",
      note: "当前接入全国社会融资规模当月增量、累计增量、存量及存量同比，作为L3第一阶段信用规模代理；尚未计算真正的信用脉冲——未做历史增量变化、名义GDP归一化或滚动标准化，因此不计算L3评分。", dataStatus: "generated",
    };
    if (indicator.id === "L4") return {
      ...indicator, raw: l4Raw, period: displayMonth(l4.dataMonth), release: l4.listingDate, coverage: "1/1全国一般公共预算", quality: "A",
      note: "当前仅接入财政部全国一般公共预算累计收入、累计支出及各自同比，作为L4第一阶段财政收支规模代理；尚未计算真正的财政脉冲——未做GDP归一化、历史边际变化、政府性基金合并或滚动标准化，因此不计算L4评分。", dataStatus: "generated",
    };
    if (indicator.id === "L5") return {
      ...indicator, raw: l5Raw, period: l5.date, release: l5.date, coverage: "1/1美国实际利率", quality: "A",
      note: "当前仅接入美国10年期实际国债收益率，作为L5第一阶段外部金融条件代理；采用跨时区保守日期规则，仅使用早于中国信息截止日的美国数据，当前系统不处理精确小时级PIT。尚未接入美元、波动率、信用利差和全球流动性，因此不计算历史分位、趋势或L5评分。", dataStatus: "generated",
    };
    return indicator;
  });
  components.B = components.B.map(indicator => {
    if (indicator.id === "B1") return { ...indicator, raw: b1Raw, period: b3Date, release: b3Date, coverage: "2/2代理指数", quality: "A", note: "当前仅根据沪深300与创业板指PE TTM反算指数盈利收益率，作为B1第一阶段股权端收益率代理；尚未接入中国长期无风险利率，因此当前不是ERP，也不计算历史分位、趋势或B1评分。", dataStatus: "generated" };
    if (indicator.id === "B2") return { ...indicator, raw: b2Raw, period: b3Date, release: b3Date, coverage: `${b2.observedCount}只有值 / 市值覆盖${b2.marketCapCoverage.toFixed(1)}%`, quality: "A", note: "当前仅使用与B1/B3/B4/B5相同交易日的daily_basic，对dv_ttm有合法数值的股票按total_mv进行市值加权，作为B2第一阶段股息率端代理；空dv_ttm不视为0，也不纳入加权样本。尚未接入中国长期无风险利率，因此当前不是“股息率－无风险利率”指标，也不计算历史分位、趋势或B2评分。", dataStatus: "generated" };
    if (indicator.id === "B3") return { ...indicator, raw: b3Raw, period: b3Date, release: b3Date, coverage: "100%", quality: "A", note: "当前为真实截面估值；历史分位和最终B3评分尚未实现。", dataStatus: "generated" };
    if (indicator.id === "B4") return { ...indicator, raw: b4Raw, period: b3Date, release: b3Date, coverage: `${b4.stockCount}只当日记录股票`, quality: "A", note: "当前仅汇总与B3/B5相同交易日中Tushare daily_basic实际返回股票的total_mv，作为B4第一阶段A股当日总市值代理；尚未接入GDP分母，也未证明停牌或缺失记录股票全部覆盖，因此当前不是总市值/GDP，也不是巴菲特指标，不计算历史分位、趋势或B4评分。", dataStatus: "generated" };
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
    ...template, schemaVersion: 4, generatedAt,
    source: { mode: "generated", label: "Real current snapshot; L2/L3 PBOC-verified; L4 MOF official", providers: ["Tushare Pro", "中国人民银行", "中华人民共和国财政部"], apis: ["index_dailybasic", "cn_m", "shibor", "sf_month", "us_trycr", "daily_basic"], instruments: MARKET_INDEX_INSTRUMENTS, releaseEvidence: { L2: { provider: "中国人民银行", indexUrl: PBOC_INDEX_URL, reportTitle: evidence.pbc.title, reportUrl: evidence.pbc.href, publishedAt: evidence.pbc.publishedAt }, L4: { provider: "中华人民共和国财政部", indexUrl: MOF_INDEX_URL, reportTitle: evidence.mof.title, reportUrl: evidence.mof.href, publishedAt: evidence.mof.publishedAt } } },
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
      { date: l3.release.slice(5), title: "L3社会融资规模代理快照生成", detail: l3Raw, group: "L3", tone: "blue" },
      { date: l4.listingDate.slice(5), title: "L4财政收支规模代理快照生成", detail: l4Raw, group: "L4", tone: "blue" },
      { date: l5.date.slice(5), title: "L5外部金融条件代理快照生成", detail: l5Raw, group: "L5", tone: "blue" },
      { date: b3Date.slice(5), title: "B1指数盈利收益率代理快照生成", detail: b1Raw, group: "B1", tone: "blue" },
      { date: b3Date.slice(5), title: "B2 TTM股息率代理快照生成", detail: b2Raw, group: "B2", tone: "blue" },
      { date: b3Date.slice(5), title: "B3真实估值截面生成", detail: b3Raw, group: "B3", tone: "blue" },
      { date: b3Date.slice(5), title: "B4 A股总市值代理快照生成", detail: b4Raw, group: "B4", tone: "blue" },
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
  const b1 = buildB1Snapshot(snapshot);
  const dailyRows = await callTushare("daily_basic", { trade_date: snapshot.tradeDate }, "ts_code,trade_date,total_mv,dv_ttm", token);
  const b4 = buildB4Snapshot(dailyRows, snapshot);
  const b2 = buildB2Snapshot(dailyRows, snapshot, b4);
  const report = selectLatestPublishedReport(parsePbcReportIndex(await fetchText(PBOC_INDEX_URL)), requestedAsOf);
  const official = parsePbcFinancialReport(await fetchText(report.href), report);
  const l2 = buildL2Snapshot(await callTushare("cn_m", { m: report.dataMonth }, "month,m1_yoy,m2_yoy", token), report, official);
  const shiborStartDate = subtractDays(requestedAsOf, 30);
  const l1 = selectLatestShiborSnapshot(await callTushare("shibor", { start_date: compactDate(shiborStartDate), end_date: compactDate(requestedAsOf) }, "date,on,1w,3m,1y", token), requestedAsOf);
  const l3 = buildL3Snapshot(await callTushare("sf_month", { m: report.dataMonth }, "month,inc_month,inc_cumval,stk_endval", token), report, official);
  const l5 = selectLatestUsRealYieldSnapshot(await callTushare("us_trycr", { start_date: compactDate(shiborStartDate), end_date: compactDate(requestedAsOf) }, "date,y10", token), requestedAsOf);
  const mofReport = selectLatestMofFiscalReport(parseMofFiscalReportIndex(await fetchText(MOF_INDEX_URL)), requestedAsOf);
  const mofOfficial = parseMofFiscalReport(await fetchText(mofReport.href), mofReport);
  const l4 = { ...mofOfficial, dataMonth: mofReport.dataMonth, listingDate: mofReport.listingDate };
  const target = path.resolve("public/data/market-research/current.json");
  const template = JSON.parse(await readFile(target, "utf8"));
  const current = buildGeneratedCurrent(template, snapshot, b1, b2, b4, l1, l2, l3, l4, l5, { pbc: { ...report, publishedAt: official.publishedAt }, mof: { ...mofReport, publishedAt: mofOfficial.publishedAt } }, requestedAsOf);
  if (!isMarketResearchCurrent(current)) throw new Error("Generated current.json failed the current MarketResearchCurrent contract");
  await writeAtomically(target, current);
  console.log(`Generated ${path.relative(process.cwd(), target)} with information cutoff ${current.asOf}`);
  console.log(`PBOC: ${report.title} (${official.publishedAt})`);
  console.log(`L1: ${current.components.L.find(indicator => indicator.id === "L1").raw}`);
  console.log(`L2: ${current.components.L.find(indicator => indicator.id === "L2").raw}`);
  console.log(`L3: ${current.components.L.find(indicator => indicator.id === "L3").raw}`);
  console.log(`MOF: ${mofReport.title} (${mofOfficial.publishedAt}) ${mofReport.href}`);
  console.log(`L4: ${current.components.L.find(indicator => indicator.id === "L4").raw}`);
  console.log(`L5: ${current.components.L.find(indicator => indicator.id === "L5").raw}`);
  console.log(`B1: ${current.components.B.find(indicator => indicator.id === "B1").raw}`);
  console.log(`B2: ${current.components.B.find(indicator => indicator.id === "B2").raw} (${b2.missingCount} missing dv_ttm)`);
  console.log(`B3: ${current.components.B.find(indicator => indicator.id === "B3").raw}`);
  console.log(`B4: ${current.components.B.find(indicator => indicator.id === "B4").raw} (${b4.totalMarketCapWan}万元)`);
  console.log(`B5: ${current.components.B.find(indicator => indicator.id === "B5").raw}`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch(error => { console.error(error instanceof Error ? error.message : String(error)); process.exitCode = 1; });
}
