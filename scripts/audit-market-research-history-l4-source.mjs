import { createHash } from "node:crypto";
import { execFile } from "node:child_process";
import { access, mkdir, mkdtemp, rename, rm, stat, unlink, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { promisify } from "node:util";
import { pathToFileURL } from "node:url";

const execFileAsync = promisify(execFile);
export const ENTRY_URL = "https://www.mof.gov.cn/gkml/caizhengshuju/";
const OUTPUT = "public/data/market-research/history/l4-source-audit.json";
const START_PERIOD = "201412";
const END_PERIOD = "202606";
const MAX_LISTING_PAGES = 100;

const validDate = value => {
  const date = /^\d{4}-\d{2}-\d{2}$/.test(String(value ?? "")) ? new Date(`${value}T00:00:00Z`) : new Date(Number.NaN);
  return !Number.isNaN(date.valueOf()) && date.toISOString().slice(0, 10) === value;
};

export function shiftMonth(month, offset) {
  if (!/^\d{6}$/.test(month) || !Number.isInteger(offset)) throw new Error(`Invalid month ${month}`);
  const date = new Date(Date.UTC(Number(month.slice(0, 4)), Number(month.slice(4, 6)) - 1 + offset, 1));
  return `${date.getUTCFullYear()}${String(date.getUTCMonth() + 1).padStart(2, "0")}`;
}

export function requiredPeriods(start = START_PERIOD, end = END_PERIOD) {
  const periods = [];
  for (let period = start; period <= end; period = shiftMonth(period, 1)) periods.push(period);
  return periods;
}

export function decodeUtf8Strict(bytes) {
  const buffer = Buffer.from(bytes);
  if (buffer.length >= 3 && buffer[0] === 0xef && buffer[1] === 0xbb && buffer[2] === 0xbf) throw new Error("BOM is not allowed in MOF HTML");
  return new TextDecoder("utf-8", { fatal: true }).decode(buffer);
}

export function normalizeTextForHash(text) {
  return text.replace(/\r\n?/g, "\n");
}

export function sha256(value) {
  return createHash("sha256").update(value).digest("hex");
}

export function normalizedContentSha256(text) {
  return sha256(normalizeTextForHash(text));
}

function rejectUrlCredentialsAndPort(url) {
  if (url.username || url.password || url.port) throw new Error(`Unsafe MOF URL credentials or port: ${url.href}`);
}

export function validateListingUrl(value) {
  const url = new URL(value, ENTRY_URL);
  rejectUrlCredentialsAndPort(url);
  if (url.protocol !== "https:" || url.hostname !== "www.mof.gov.cn" || url.search || url.hash) throw new Error(`Unsafe MOF listing URL: ${url.href}`);
  if (!/^\/gkml\/caizhengshuju\/(?:index(?:_\d+)?\.htm)?$/.test(url.pathname)) throw new Error(`Unsafe MOF listing path: ${url.href}`);
  if (url.pathname.endsWith("/index.htm")) url.pathname = "/gkml/caizhengshuju/";
  return url.href;
}

export function normalizeReportHref(sourceHref, sourceListingUrl = ENTRY_URL) {
  if (typeof sourceHref !== "string" || !sourceHref.trim()) throw new Error("MOF report href is missing");
  const resolved = new URL(sourceHref, validateListingUrl(sourceListingUrl));
  rejectUrlCredentialsAndPort(resolved);
  if (!['http:', 'https:'].includes(resolved.protocol) || !resolved.pathname.endsWith(".htm")) throw new Error(`Unsafe MOF report URL: ${resolved.href}`);
  if (resolved.hash) throw new Error(`MOF report URL fragment is not allowed: ${resolved.href}`);
  const resolvedUrl = resolved.href;
  let reportPathPolicy; let transportTransformation;
  if (resolved.hostname === "gks.mof.gov.cn" && resolved.pathname.startsWith("/tongjishuju/")) {
    reportPathPolicy = "gks_statistics";
    transportTransformation = resolved.protocol === "http:" ? "http_to_https_protocol_only" : "https_direct";
    resolved.protocol = "https:";
  } else if (resolved.hostname === "www.mof.gov.cn" && resolved.pathname.startsWith("/zhengwuxinxi/caizhengxinwen/") && resolved.protocol === "https:") {
    reportPathPolicy = "www_fiscal_news";
    transportTransformation = /^[a-z][a-z\d+.-]*:/i.test(sourceHref) ? "https_direct" : "relative_resolve_https_direct";
  } else throw new Error(`Unsafe MOF report URL: ${resolved.href}`);
  return { sourceHref, resolvedUrl, normalizedUrl: resolved.href, reportPathPolicy, transportTransformation };
}

function htmlToText(value) {
  return String(value ?? "").replace(/<script\b[\s\S]*?<\/script>/gi, " ").replace(/<style\b[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ").replace(/&nbsp;|&#160;/gi, " ").replace(/&amp;/gi, "&").replace(/&lt;/gi, "<").replace(/&gt;/gi, ">").replace(/&quot;/gi, '"').replace(/&#39;|&apos;/gi, "'").replace(/\s+/g, " ").trim();
}

export function parseFiscalTitle(title) {
  const normalized = htmlToText(title).replace(/[—–－]/g, "-");
  let match = normalized.match(/^(\d{4})年1-(\d{1,2})月财政收支情况$/);
  if (match) {
    const month = Number(match[2]);
    return month >= 2 && month <= 11 ? `${match[1]}${String(month).padStart(2, "0")}` : null;
  }
  match = normalized.match(/^(\d{4})年(一季度|上半年|前三季度)财政收支情况$/);
  if (match) return `${match[1]}${{ 一季度: "03", 上半年: "06", 前三季度: "09" }[match[2]]}`;
  match = normalized.match(/^(\d{4})年(\d{1,2})月份?财政收支情况$/);
  if (match) {
    const month = Number(match[2]);
    return month >= 1 && month <= 11 ? `${match[1]}${String(month).padStart(2, "0")}` : null;
  }
  match = normalized.match(/^(\d{4})年(?:全年|年度)?财政收支情况$/);
  return match ? `${match[1]}12` : null;
}

export function classifyFiscalTitle(title) {
  const normalized = htmlToText(title);
  if (/彩票|预算|决算|地方财政|税收|政策解读|新闻|发布会|政府性基金/.test(normalized)) return { classification: "excluded", period: null };
  const period = parseFiscalTitle(normalized);
  if (period) return { classification: "eligible", period };
  if (/财政收支/.test(normalized)) return { classification: "ambiguous", period: null };
  return { classification: "unrelated", period: null };
}

function extractAttribute(attributes, name) {
  const match = attributes.match(new RegExp(`\\b${name}\\s*=\\s*(["'])([\\s\\S]*?)\\1`, "i"));
  return match?.[2] ?? null;
}

export function extractRenderedLinks(dom, listingUrl) {
  if (typeof dom !== "string" || !/<html\b/i.test(dom) || !/<\/html>/i.test(dom) || !/财政数据/.test(htmlToText(dom))) throw new Error("Chrome rendered DOM is not a complete MOF fiscal-data page");
  const pagination = [];
  const reports = [];
  const ambiguousReports = [];
  for (const match of dom.matchAll(/<a\b([^>]*)>([\s\S]*?)<\/a>/gi)) {
    const href = extractAttribute(match[1], "href");
    if (!href || href === "#" || /^javascript:/i.test(href)) continue;
    if (/^index(?:_\d+)?\.htm$/i.test(href)) pagination.push({ sourceHref: href, url: validateListingUrl(new URL(href, listingUrl).href) });
    const title = htmlToText(extractAttribute(match[1], "title") ?? match[2]);
    const classified = classifyFiscalTitle(title);
    if (classified.classification === "eligible") {
      let normalized;
      try { normalized = normalizeReportHref(href, listingUrl); }
      catch (error) { throw new Error(`Eligible MOF report link is outside frozen scope (${title}, listing ${listingUrl}, href ${href}): ${error.message}`); }
      reports.push({ period: classified.period, title, ...normalized, sourceListingUrl: listingUrl });
    } else if (classified.classification === "ambiguous" && /^(201[4-9]|202[0-6])年/.test(title)) {
      ambiguousReports.push({ title, sourceHref: href, sourceListingUrl: listingUrl });
    }
  }
  const uniquePagination = [...new Map(pagination.map(item => [item.url, item])).values()].sort((a, b) => a.url.localeCompare(b.url));
  const uniqueReports = [...new Map(reports.map(item => [item.normalizedUrl, item])).values()].sort((a, b) => a.normalizedUrl.localeCompare(b.normalizedUrl));
  return { pagination: uniquePagination, reports: uniqueReports, ambiguousReports };
}

export function parsePageDeclaration(dom) {
  const current = [...dom.matchAll(/var\s+currentPage\s*=\s*(\d+)/g)].map(match => Number(match[1]));
  const total = [...dom.matchAll(/var\s+countPage\s*=\s*(\d+)/g)].map(match => Number(match[1]));
  if (new Set(current).size !== 1 || new Set(total).size !== 1 || !current.length || !total.length) throw new Error("MOF page declaration is missing or conflicting");
  if (!Number.isInteger(current[0]) || !Number.isInteger(total[0]) || current[0] < 0 || total[0] < 1 || current[0] >= total[0] || total[0] > MAX_LISTING_PAGES) throw new Error("MOF page declaration is invalid");
  return { currentPage: current[0], totalPages: total[0] };
}

export function parsePublicationDate(html) {
  const visible = html.match(/<[^>]*class=["'][^"']*(?:docreltime|laiyuan)[^"']*["'][^>]*>[\s\S]*?发布日期\s*[：:]\s*(\d{4})年(\d{1,2})月(\d{1,2})日[\s\S]*?<\//i);
  if (!visible) return { publicationDate: null, publicationDateEvidence: null };
  const publicationDate = `${visible[1]}-${String(Number(visible[2])).padStart(2, "0")}-${String(Number(visible[3])).padStart(2, "0")}`;
  if (!validDate(publicationDate)) throw new Error(`Invalid explicit MOF publication date ${publicationDate}`);
  return { publicationDate, publicationDateEvidence: "visible_text:.docreltime|.laiyuan 发布日期" };
}

function parseArticleTitle(html) {
  const match = html.match(/<meta\s+name=["']ArticleTitle["']\s+content=["']([^"']+)["']/i) ?? html.match(/<title>([\s\S]*?)<\/title>/i);
  return match ? htmlToText(match[1]) : null;
}

export function renderedLinkSetSha256(discovered) {
  const values = [...discovered.pagination.map(item => `page:${item.sourceHref}`), ...discovered.reports.map(item => `report:${item.sourceHref}`)].sort();
  return sha256(JSON.stringify(values));
}

async function fetchStrictHtml(url, fetchImpl = fetch) {
  const response = await fetchImpl(url, { redirect: "manual", headers: { accept: "text/html,application/xhtml+xml", "user-agent": "MyInvest-L4-source-audit/1.0" } });
  if (response.status >= 300 && response.status < 400) throw new Error(`MOF redirect is not allowed for ${url}`);
  if (response.status !== 200) throw new Error(`MOF request failed ${response.status} for ${url}`);
  const bytes = Buffer.from(await response.arrayBuffer());
  const declared = response.headers.get("content-length");
  if (declared !== null && Number(declared) !== bytes.length) throw new Error(`MOF response was truncated for ${url}`);
  const contentType = response.headers.get("content-type") ?? "";
  if (!/text\/html|application\/xhtml\+xml/i.test(contentType)) throw new Error(`MOF response is not HTML for ${url}`);
  return decodeUtf8Strict(bytes);
}

export async function renderListingDom(chromePath, listingUrl, profileDirectory, timeout = 30000) {
  const args = ["--headless=new", "--disable-gpu", "--disable-extensions", "--no-first-run", "--no-default-browser-check", `--user-data-dir=${profileDirectory}`, "--dump-dom", validateListingUrl(listingUrl)];
  const { stdout } = await execFileAsync(chromePath, args, { encoding: "utf8", maxBuffer: 8 * 1024 * 1024, timeout, windowsHide: true, shell: false });
  if (!stdout) throw new Error("Chrome returned empty DOM");
  return stdout;
}

export async function discoverListingPages(chromePath, profileDirectory, dependencies = {}) {
  const fetchHtml = dependencies.fetchHtml ?? fetchStrictHtml;
  const renderDom = dependencies.renderDom ?? ((url) => renderListingDom(chromePath, url, profileDirectory));
  const pending = [ENTRY_URL]; const visited = new Set(); const listings = []; const reportsByUrl = new Map(); const ambiguousReports = [];
  let declaredTotal = null;
  while (pending.length) {
    pending.sort(); const url = pending.shift();
    if (visited.has(url)) continue;
    if (visited.size >= MAX_LISTING_PAGES) throw new Error("MOF listing page limit exceeded");
    visited.add(url);
    const [rawHtml, dom] = await Promise.all([fetchHtml(url), renderDom(url)]);
    const declaration = parsePageDeclaration(dom);
    if (declaredTotal === null) declaredTotal = declaration.totalPages;
    if (declaredTotal !== declaration.totalPages) throw new Error("MOF total page declaration conflicts across pages");
    const discovered = extractRenderedLinks(dom, url);
    for (const page of discovered.pagination) if (!visited.has(page.url) && !pending.includes(page.url)) pending.push(page.url);
    for (const report of discovered.reports) {
      const existing = reportsByUrl.get(report.normalizedUrl);
      if (existing && (existing.title !== report.title || existing.period !== report.period)) throw new Error(`MOF report URL has conflicting identity: ${report.normalizedUrl}`);
      if (!existing) reportsByUrl.set(report.normalizedUrl, report);
    }
    ambiguousReports.push(...discovered.ambiguousReports);
    listings.push({ url, pageNumber: declaration.currentPage, rawContentSha256: normalizedContentSha256(rawHtml), renderedLinkSetSha256: renderedLinkSetSha256(discovered), discoveredPaginationHrefs: discovered.pagination.map(item => item.sourceHref).sort(), discoveredReportHrefs: discovered.reports.map(item => item.sourceHref).sort() });
  }
  const pageNumbers = listings.map(item => item.pageNumber).sort((a, b) => a - b);
  if (listings.length !== declaredTotal || pageNumbers.some((value, index) => value !== index)) throw new Error(`MOF listing traversal incomplete: visited ${listings.length} of ${declaredTotal}`);
  return { listings: listings.sort((a, b) => a.url.localeCompare(b.url)), reports: [...reportsByUrl.values()].sort((a, b) => a.normalizedUrl.localeCompare(b.normalizedUrl)), ambiguousReports: ambiguousReports.sort((a, b) => `${a.title}\0${a.sourceHref}`.localeCompare(`${b.title}\0${b.sourceHref}`)) };
}

async function mapWithConcurrency(values, limit, mapper) {
  const output = new Array(values.length); let next = 0;
  async function worker() { while (next < values.length) { const index = next++; output[index] = await mapper(values[index], index); } }
  await Promise.all(Array.from({ length: Math.min(limit, values.length) }, worker));
  return output;
}

export async function fetchReportEvidence(discoveredReports, captureAsOf, fetchHtml = fetchStrictHtml) {
  const inRange = discoveredReports.filter(report => report.period >= START_PERIOD && report.period <= END_PERIOD);
  return mapWithConcurrency(inRange, 6, async report => {
    const html = await fetchHtml(report.normalizedUrl);
    const articleTitle = parseArticleTitle(html);
    if (articleTitle !== report.title) throw new Error(`MOF article title mismatch for ${report.normalizedUrl}`);
    const publication = parsePublicationDate(html);
    if (publication.publicationDate && publication.publicationDate > captureAsOf) throw new Error(`MOF report is future-dated for capture as-of: ${report.normalizedUrl}`);
    const text = htmlToText(html);
    const hasCurrentIdentity = text.includes("全国一般公共预算收入") && text.includes("全国一般公共预算支出");
    const hasPre2015Identity = text.includes("全国一般公共财政收入") && text.includes("全国一般公共财政支出");
    const hasHistoricalIdentity = text.includes("全国财政收入") && text.includes("全国财政支出");
    if (!hasCurrentIdentity && !hasPre2015Identity && !hasHistoricalIdentity) throw new Error(`MOF article lacks national fiscal identity for ${report.normalizedUrl}`);
    return { ...report, ...publication, contentSha256: normalizedContentSha256(html), classification: "candidate" };
  });
}

export function buildAudit(captureAsOf, listings, reports, ambiguousReports = []) {
  if (!validDate(captureAsOf)) throw new Error(`Invalid capture as-of ${captureAsOf}`);
  const required = requiredPeriods();
  if (required.length !== 139 || required[0] !== START_PERIOD || required.at(-1) !== END_PERIOD) throw new Error("L4 required period contract is invalid");
  const byPeriod = new Map(required.map(period => [period, []]));
  for (const report of reports) {
    if (!byPeriod.has(report.period)) throw new Error(`L4 report period outside required range: ${report.period}`);
    byPeriod.get(report.period).push(report);
  }
  const uniqueCoveredPeriods = []; const missingPeriods = []; const ambiguousPeriods = []; const missingPublicationDatePeriods = []; const duplicateOrRevisionPeriods = [];
  const normalizedReports = [];
  for (const period of required) {
    const values = byPeriod.get(period).sort((a, b) => a.normalizedUrl.localeCompare(b.normalizedUrl));
    if (!values.length) missingPeriods.push(period);
    if (values.length > 1) ambiguousPeriods.push(period);
    if (values.some(value => value.publicationDate === null)) missingPublicationDatePeriods.push(period);
    const duplicate = values.length > 1;
    if (duplicate) duplicateOrRevisionPeriods.push(period);
    if (values.length === 1 && values[0].publicationDate !== null) uniqueCoveredPeriods.push(period);
    const identicalBody = duplicate && new Set(values.map(value => value.contentSha256)).size === 1;
    for (const value of values) normalizedReports.push({ ...value, classification: duplicate ? "ambiguous_duplicate_or_revision" : value.publicationDate === null ? "missing_publication_date" : "unique_explicit_date", ...(identicalBody ? { contentRelationship: "identical_body_hash" } : {}) });
  }
  const snapshotMaterial = { listings: listings.map(item => ({ url: item.url, rawContentSha256: item.rawContentSha256, renderedLinkSetSha256: item.renderedLinkSetSha256 })), reports: normalizedReports.map(item => ({ normalizedUrl: item.normalizedUrl, contentSha256: item.contentSha256 })) };
  return {
    schemaVersion: 1, indicatorId: "L4", auditStatus: "source_coverage_only", scoreEligible: false, jointEligible: false,
    requiredRange: { startPeriod: START_PERIOD, endPeriod: END_PERIOD, count: required.length },
    source: { authority: "Ministry of Finance of the PRC", entryUrl: ENTRY_URL, entryHost: "www.mof.gov.cn", listingHost: "www.mof.gov.cn", reportHosts: ["gks.mof.gov.cn", "www.mof.gov.cn"], allowedHosts: ["gks.mof.gov.cn", "www.mof.gov.cn"], reportPathPolicies: [{ id: "gks_statistics", host: "gks.mof.gov.cn", pathPrefix: "/tongjishuju/", sourceProtocols: ["http:", "https:"], fetchProtocol: "https:" }, { id: "www_fiscal_news", host: "www.mof.gov.cn", pathPrefix: "/zhengwuxinxi/caizhengxinwen/", sourceProtocols: ["https:"], fetchProtocol: "https:" }], linkDiscoveryMethod: "chrome_headless_rendered_dom", transportPolicy: "https_direct_or_upgrade_official_gks_http_href", captureAsOf, pageCount: listings.length, normalizedContentSha256: sha256(JSON.stringify(snapshotMaterial)) },
    listings, reports: normalizedReports.sort((a, b) => `${a.period}\0${a.normalizedUrl}`.localeCompare(`${b.period}\0${b.normalizedUrl}`)), ambiguousReports,
    coverage: { uniqueCoveredPeriods, missingPeriods, ambiguousPeriods, missingPublicationDatePeriods, duplicateOrRevisionPeriods },
  };
}

async function writeAtomically(target, value) {
  await mkdir(path.dirname(target), { recursive: true }); const temporary = `${target}.tmp-${process.pid}-${Date.now()}`;
  try { await writeFile(temporary, `${JSON.stringify(value, null, 2)}\n`, "utf8"); await rename(temporary, target); }
  catch (error) { await unlink(temporary).catch(() => {}); throw error; }
}

export function parseArguments(argv) {
  const result = { asOf: null, chromePath: null };
  for (let index = 0; index < argv.length; index += 1) {
    if (argv[index] === "--as-of" && argv[index + 1]) result.asOf = argv[++index];
    else if (argv[index] === "--chrome-path" && argv[index + 1]) result.chromePath = argv[++index];
    else throw new Error(`Unknown or incomplete argument ${argv[index]}`);
  }
  if (!validDate(result.asOf)) throw new Error("--as-of YYYY-MM-DD is required");
  if (!result.chromePath || !path.isAbsolute(result.chromePath)) throw new Error("--chrome-path absolute executable path is required");
  return result;
}

export async function main(argv = process.argv.slice(2), dependencies = {}) {
  const args = parseArguments(argv);
  const chromeStat = await stat(args.chromePath).catch(() => null);
  if (!chromeStat?.isFile()) throw new Error("--chrome-path must name an existing file");
  await access(args.chromePath);
  const profile = await mkdtemp(path.join(os.tmpdir(), "myinvest-l4-audit-"));
  try {
    const discovery = await discoverListingPages(args.chromePath, profile, dependencies);
    const reports = await fetchReportEvidence(discovery.reports, args.asOf, dependencies.fetchHtml ?? fetchStrictHtml);
    const audit = buildAudit(args.asOf, discovery.listings, reports, discovery.ambiguousReports);
    await (dependencies.writeOutput ?? writeAtomically)(path.resolve(OUTPUT), audit);
    console.log(`Generated ${OUTPUT}: ${audit.source.pageCount} official listing pages, ${audit.reports.length} in-range fiscal reports, ${audit.coverage.uniqueCoveredPeriods.length}/139 uniquely covered periods`);
    return audit;
  } finally {
    await rm(profile, { recursive: true, force: true });
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) main().catch(error => { console.error(error instanceof Error ? error.message : String(error)); process.exitCode = 1; });
