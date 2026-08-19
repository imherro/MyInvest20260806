import { createHash } from "node:crypto";
import { mkdir, readFile, rename, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";

const INPUT = "public/data/market-research/history/l4-source-audit.json";
const OUTPUT = "public/data/market-research/history/l4-field-audit.json";
export const EXPECTED_F0_SHA256 = "684a8061c57275f740d9d9cf208dabdb71c521f89a44fe7bf7842caa25c79e3f";
const START_PERIOD = "201412";
const END_PERIOD = "202606";
const FIELD_NAMES = ["revenueCumYi", "revenueYoyPct", "expenditureCumYi", "expenditureYoyPct"];

export const sha256 = value => createHash("sha256").update(value).digest("hex");

function validDate(value) {
  const date = /^\d{4}-\d{2}-\d{2}$/.test(String(value ?? "")) ? new Date(`${value}T00:00:00Z`) : new Date(Number.NaN);
  return !Number.isNaN(date.valueOf()) && date.toISOString().slice(0, 10) === value;
}

export function shiftMonth(month, offset) {
  if (!/^\d{6}$/.test(month) || !Number.isInteger(offset)) throw new Error(`Invalid month ${month}`);
  const date = new Date(Date.UTC(Number(month.slice(0, 4)), Number(month.slice(4, 6)) - 1 + offset, 1));
  return `${date.getUTCFullYear()}${String(date.getUTCMonth() + 1).padStart(2, "0")}`;
}

export function requiredPeriods() {
  const periods = [];
  for (let period = START_PERIOD; period <= END_PERIOD; period = shiftMonth(period, 1)) periods.push(period);
  return periods;
}

export function decodeUtf8Strict(bytes) {
  const buffer = Buffer.from(bytes);
  if (buffer.length >= 3 && buffer[0] === 0xef && buffer[1] === 0xbb && buffer[2] === 0xbf) throw new Error("BOM is not allowed in MOF HTML");
  return new TextDecoder("utf-8", { fatal: true }).decode(buffer);
}

export function normalizedContentSha256(text) {
  return sha256(text.replace(/\r\n?/g, "\n"));
}

function htmlToText(value) {
  return String(value ?? "").replace(/<script\b[\s\S]*?<\/script>/gi, " ").replace(/<style\b[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ").replace(/&nbsp;|&#160;/gi, " ").replace(/&amp;/gi, "&").replace(/&lt;/gi, "<").replace(/&gt;/gi, ">").replace(/&quot;/gi, '"').replace(/&#39;|&apos;/gi, "'")
    .replace(/(\d)\s*\.\s*(\d)/g, "$1.$2").replace(/(?<=\d)\s+(?=[\d.%])/g, "").replace(/\s+/g, " ").trim();
}

function parseArticleTitle(html) {
  const match = html.match(/<meta\s+name=["']ArticleTitle["']\s+content=["']([^"']+)["']/i) ?? html.match(/<title>([\s\S]*?)<\/title>/i);
  return match ? htmlToText(match[1]) : null;
}

function parsePublicationDate(html) {
  const match = html.match(/<[^>]*class=["'][^"']*(?:docreltime|laiyuan)[^"']*["'][^>]*>[\s\S]*?发布日期\s*[：:]\s*(\d{4})年(\d{1,2})月(\d{1,2})日[\s\S]*?<\//i);
  if (!match) return null;
  const value = `${match[1]}-${String(Number(match[2])).padStart(2, "0")}-${String(Number(match[3])).padStart(2, "0")}`;
  if (!validDate(value)) throw new Error(`Invalid MOF publication date ${value}`);
  return value;
}

function assertHttpsReportUrl(value) {
  const url = new URL(value);
  if (url.protocol !== "https:" || url.username || url.password || url.port || url.hash) throw new Error(`Unsafe F0 report URL ${url.href}`);
  const allowed = (url.hostname === "gks.mof.gov.cn" && url.pathname.startsWith("/tongjishuju/"))
    || (url.hostname === "www.mof.gov.cn" && url.pathname.startsWith("/zhengwuxinxi/caizhengxinwen/"));
  if (!allowed || !url.pathname.endsWith(".htm")) throw new Error(`Unsafe F0 report path ${url.href}`);
  return url.href;
}

export function validateF0Input(bytes) {
  const buffer = Buffer.from(bytes);
  const decoded = decodeUtf8Strict(buffer); const canonical = decoded.replace(/\r\n?/g, "\n");
  if (!canonical.endsWith("\n") || canonical.endsWith("\n\n")) throw new Error("F0 canonical input must end with exactly one LF");
  const digest = sha256(Buffer.from(canonical, "utf8"));
  if (digest !== EXPECTED_F0_SHA256) throw new Error(`F0 artifact SHA-256 drift: expected ${EXPECTED_F0_SHA256}, received ${digest}`);
  const f0 = JSON.parse(canonical); const required = requiredPeriods();
  if (f0?.schemaVersion !== 1 || f0.indicatorId !== "L4" || f0.auditStatus !== "source_coverage_only" || f0.scoreEligible !== false || f0.jointEligible !== false) throw new Error("F0 identity drift");
  if (f0?.requiredRange?.startPeriod !== START_PERIOD || f0.requiredRange.endPeriod !== END_PERIOD || f0.requiredRange.count !== 139 || required.length !== 139) throw new Error("F0 required range drift");
  if (!Array.isArray(f0.reports) || f0.reports.length !== 119 || new Set(f0.reports.map(report => report.period)).size !== 119 || new Set(f0.reports.map(report => report.normalizedUrl)).size !== 119) throw new Error("F0 report coverage drift");
  if (f0?.coverage?.uniqueCoveredPeriods?.length !== 119 || f0.coverage.missingPeriods?.length !== 20 || f0.coverage.ambiguousPeriods?.length !== 0 || f0.coverage.missingPublicationDatePeriods?.length !== 0 || f0.coverage.duplicateOrRevisionPeriods?.length !== 0) throw new Error("F0 coverage status drift");
  const union = [...f0.coverage.uniqueCoveredPeriods, ...f0.coverage.missingPeriods].sort();
  if (JSON.stringify(union) !== JSON.stringify(required) || f0.reports.some(report => !validDate(report.publicationDate) || assertHttpsReportUrl(report.normalizedUrl) !== report.normalizedUrl || !/^[a-f\d]{64}$/.test(report.contentSha256))) throw new Error("F0 period or report provenance drift");
  return f0;
}

function decimalParts(value) {
  const normalized = value.replace(/\s+/g, "");
  if (!/^\d+(?:\.\d+)?$/.test(normalized)) throw new Error(`Invalid decimal ${value}`);
  const [whole, fraction = ""] = normalized.split(".");
  return { integer: BigInt(`${whole}${fraction}`), scale: fraction.length };
}

function formatScaled(integer, scale) {
  const negative = integer < 0n; let digits = (negative ? -integer : integer).toString();
  if (scale) digits = digits.padStart(scale + 1, "0");
  const value = scale ? `${digits.slice(0, -scale)}.${digits.slice(-scale).replace(/0+$/, "")}`.replace(/\.$/, "") : digits;
  return `${negative ? "-" : ""}${value}`;
}

export function amountToYi(numberText, unit) {
  const parsed = decimalParts(numberText); const multiplier = unit === "万亿元" ? 10000n : unit === "亿元" ? 1n : null;
  if (multiplier === null) throw new Error(`Unsupported fiscal amount unit ${unit}`);
  return formatScaled(parsed.integer * multiplier, parsed.scale);
}

function signedPercent(numberText, direction) {
  const parsed = decimalParts(numberText); const signed = direction === "下降" ? -parsed.integer : parsed.integer;
  return formatScaled(signed, parsed.scale);
}

function minimalClause(text, anchorIndex) {
  const remainder = text.slice(anchorIndex); const end = remainder.search(/[；。]/);
  return (end >= 0 ? remainder.slice(0, end + 1) : remainder.slice(0, 320)).trim();
}

function candidate(value, unit, basis, evidenceSentence, report) {
  return { value, unit, basis, evidenceSentence, evidenceSha256: sha256(evidenceSentence), url: report.normalizedUrl, publicationDate: report.publicationDate };
}

function field(status, candidates) {
  return { status, candidates };
}

function dedupeCandidates(values) {
  return [...new Map(values.map(value => [`${value.value}\0${value.basis}\0${value.evidenceSha256}`, value])).values()];
}

const SCOPE_PATTERNS = {
  revenue: ["全国一般公共预算收入", "全国一般公共财政收入", "全国公共财政收入"],
  expenditure: ["全国一般公共预算支出", "全国一般公共财政支出", "全国公共财政支出"],
};

function findScopeClause(text, kind) {
  const matches = [];
  for (const label of SCOPE_PATTERNS[kind]) {
    let start = 0;
    while ((start = text.indexOf(label, start)) >= 0) { matches.push({ label, index: start, clause: minimalClause(text, start) }); start += label.length; }
  }
  return matches.filter(match => /^\s*[\d\s]+(?:\.\s*\d+)?\s*(?:万?亿元)/.test(match.clause.slice(match.label.length)));
}

function amountCandidates(clauses, report) {
  const values = [];
  for (const item of clauses) {
    const match = item.clause.slice(item.label.length).match(/^\s*([\d\s]+(?:\.\s*\d+)?)\s*(万?亿元)/);
    if (match) values.push(candidate(amountToYi(match[1], match[2]), "亿元", item.label, item.clause, report));
  }
  return dedupeCandidates(values);
}

function yoyCandidates(clauses, report) {
  const values = [];
  const patterns = [
    { label: "reported_yoy", regex: /同比\s*(增长|下降)\s*([\d\s]+(?:\.\s*\d+)?)\s*%/g },
    { label: "reported_prior_period", regex: /比(?:去年|上年)(?:同期)?\s*(增长|下降)\s*([\d\s]+(?:\.\s*\d+)?)\s*%/g },
    { label: "adjusted_same_basis", regex: /(同口径)\s*(增长|下降)\s*([\d\s]+(?:\.\s*\d+)?)\s*%/g },
    { label: "adjusted_tax_refund", regex: /(扣除[^，；。]{0,40}?后)\s*(增长|下降)\s*([\d\s]+(?:\.\s*\d+)?)\s*%/g },
    { label: "natural_basis", regex: /(按自然口径计算)\s*(增长|下降)\s*([\d\s]+(?:\.\s*\d+)?)\s*%/g },
  ];
  for (const item of clauses) {
    if (/同比\s*持平/.test(item.clause)) values.push(candidate("0", "pct", `${item.label}:reported_yoy`, item.clause, report));
    for (const pattern of patterns) for (const match of item.clause.matchAll(pattern.regex)) {
      const offset = pattern.label === "reported_yoy" || pattern.label === "reported_prior_period" ? 0 : 1;
      values.push(candidate(signedPercent(match[2 + offset], match[1 + offset]), "pct", `${item.label}:${pattern.label}`, item.clause, report));
    }
    if (!values.some(value => value.evidenceSha256 === sha256(item.clause)) && /比(?:去年|上年)(?:同期)?[^，；。]{0,30}?增加[\d.]+亿元\s*[，,]\s*(增长|下降)\s*([\d.]+)\s*%/.test(item.clause)) {
      const match = item.clause.match(/比(?:去年|上年)(?:同期)?[^，；。]{0,30}?增加[\d.]+亿元\s*[，,]\s*(增长|下降)\s*([\d.]+)\s*%/);
      values.push(candidate(signedPercent(match[2], match[1]), "pct", `${item.label}:reported_prior_period_continuation`, item.clause, report));
    }
  }
  return dedupeCandidates(values);
}

function statusForCandidates(candidates, invalid = false) {
  if (invalid) return "invalid";
  if (!candidates.length) return "missing";
  return candidates.length === 1 ? "unique" : "ambiguous_multiple_candidates";
}

export function auditReportFields(html, report) {
  const title = parseArticleTitle(html); const publicationDate = parsePublicationDate(html);
  if (title !== report.title || publicationDate !== report.publicationDate) throw new Error(`F0 article identity drift for ${report.normalizedUrl}`);
  const text = htmlToText(html); const output = {};
  for (const [kind, amountField, yoyField] of [["revenue", "revenueCumYi", "revenueYoyPct"], ["expenditure", "expenditureCumYi", "expenditureYoyPct"]]) {
    const clauses = findScopeClause(text, kind); let amounts = []; let yoys = []; let invalid = false;
    try { amounts = amountCandidates(clauses, report); yoys = yoyCandidates(clauses, report); } catch { invalid = true; }
    output[amountField] = field(statusForCandidates(amounts, invalid), amounts);
    output[yoyField] = field(statusForCandidates(yoys, invalid), yoys);
  }
  return output;
}

export async function fetchStrictHtml(report, fetchImpl = fetch) {
  const response = await fetchImpl(report.normalizedUrl, { redirect: "manual", headers: { accept: "text/html,application/xhtml+xml", "user-agent": "MyInvest-L4-field-audit/1.0" } });
  if (response.status >= 300 && response.status < 400) throw new Error(`MOF redirect is not allowed for ${report.normalizedUrl}`);
  if (response.status !== 200) throw new Error(`MOF request failed ${response.status} for ${report.normalizedUrl}`);
  const bytes = Buffer.from(await response.arrayBuffer()); const declared = response.headers.get("content-length");
  if (declared !== null && Number(declared) !== bytes.length) throw new Error(`MOF response was truncated for ${report.normalizedUrl}`);
  if (!/text\/html|application\/xhtml\+xml/i.test(response.headers.get("content-type") ?? "")) throw new Error(`MOF response is not HTML for ${report.normalizedUrl}`);
  const html = decodeUtf8Strict(bytes); const digest = normalizedContentSha256(html);
  if (digest !== report.contentSha256) throw new Error(`SOURCE_REVISION_DETECTED ${report.period} ${report.normalizedUrl}: expected ${report.contentSha256}, received ${digest}`);
  return html;
}

async function mapWithConcurrency(values, limit, mapper) {
  const output = new Array(values.length); let next = 0;
  async function worker() { while (next < values.length) { const index = next++; output[index] = await mapper(values[index], index); } }
  await Promise.all(Array.from({ length: Math.min(limit, values.length) }, worker));
  return output;
}

function monthStatus(fields) {
  const statuses = Object.values(fields).map(value => value.status);
  if (statuses.some(value => value === "ambiguous_multiple_candidates")) return "ambiguous_fields";
  if (statuses.every(value => value === "unique")) return "complete_unique";
  return "partial_fields";
}

export function buildFieldAudit(f0, reportResults) {
  const byPeriod = new Map(reportResults.map(result => [result.period, result])); const periods = requiredPeriods();
  const months = periods.map(period => {
    const result = byPeriod.get(period);
    if (!result) return { period, sourceStatus: "missing_official_report", monthStatus: "missing_official_report", fields: Object.fromEntries(FIELD_NAMES.map(name => [name, field("missing", [])])) };
    const fields = result.fields;
    return { period, sourceStatus: "official_report", monthStatus: monthStatus(fields), title: result.report.title, url: result.report.normalizedUrl, publicationDate: result.report.publicationDate, releaseDateQuality: "official_report_date", pitScope: "release_lag_only", valueVintage: "latest_available_snapshot", fields };
  });
  const coverage = Object.fromEntries(FIELD_NAMES.map(name => [name, Object.fromEntries(["unique", "missing", "ambiguous_multiple_candidates", "invalid"].map(status => [status, months.filter(month => month.fields[name].status === status).length]))]));
  const reported = months.filter(month => month.sourceStatus === "official_report");
  const ready = reported.every(month => month.monthStatus === "complete_unique");
  return { schemaVersion: 1, indicatorId: "L4", auditStatus: "field_coverage_only", scoreEligible: false, jointEligible: false, fieldContractStatus: ready ? "ready_for_partial_history" : "needs_field_contract_resolution", sourceAudit: { path: INPUT, canonicalSha256: EXPECTED_F0_SHA256, hashNormalization: "utf8_lf_with_exactly_one_terminal_newline" }, requiredRange: { startPeriod: START_PERIOD, endPeriod: END_PERIOD, count: periods.length }, reportCount: reportResults.length, missingOfficialReportCount: months.filter(month => month.sourceStatus === "missing_official_report").length, coverage, months };
}

async function writeAtomically(target, value) {
  await mkdir(path.dirname(target), { recursive: true }); const temporary = `${target}.tmp-${process.pid}-${Date.now()}`;
  try { await writeFile(temporary, `${JSON.stringify(value, null, 2)}\n`, "utf8"); await rename(temporary, target); }
  catch (error) { await unlink(temporary).catch(() => {}); throw error; }
}

export async function main(dependencies = {}) {
  const inputBytes = await (dependencies.readInput ?? readFile)(path.resolve(INPUT)); const f0 = validateF0Input(inputBytes); const fetchHtml = dependencies.fetchHtml ?? fetchStrictHtml;
  const reportResults = await mapWithConcurrency(f0.reports, 6, async report => ({ period: report.period, report, fields: auditReportFields(await fetchHtml(report), report) }));
  const audit = buildFieldAudit(f0, reportResults); await (dependencies.writeOutput ?? writeAtomically)(path.resolve(OUTPUT), audit);
  console.log(`Generated ${OUTPUT}: ${audit.reportCount} reports, ${audit.missingOfficialReportCount} missing months; contract ${audit.fieldContractStatus}`);
  return audit;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) main().catch(error => { console.error(error instanceof Error ? error.message : String(error)); process.exitCode = 1; });
