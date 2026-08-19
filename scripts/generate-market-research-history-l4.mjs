import { createHash } from "node:crypto";
import { mkdir, readFile, rename, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";

const FIELD_AUDIT_PATH = "public/data/market-research/history/l4-field-audit.json";
const SCHEDULE_PATH = "public/data/market-research/history/b3.json";
const OUTPUT_PATH = "public/data/market-research/history/l4.json";
export const EXPECTED_FIELD_AUDIT_SHA256 = "de6ce556ed66ba97f3e38a716edb3447d47a46ed34287cdc110dd644d188516b";
export const EXPECTED_SCHEDULE_SHA256 = "ac2c394276b24eb7d890ee81d5b8dd3658bb51c8640e4c26a27bbef4f44290e4";
const SOURCE_AUDIT_SHA256 = "684a8061c57275f740d9d9cf208dabdb71c521f89a44fe7bf7842caa25c79e3f";
const FIELD_NAMES = ["revenueCumYi", "revenueYoyPct", "expenditureCumYi", "expenditureYoyPct"];
const AMOUNT_FIELDS = new Set(["revenueCumYi", "expenditureCumYi"]);
const HASH_NORMALIZATION = "utf8_lf_with_exactly_one_terminal_newline";
const PIT_EXCEPTIONS = new Set([
  ["201912", "2020-01-31", "2020-02-10"].join("\0"),
  ["202312", "2024-01-31", "2024-02-01"].join("\0"),
]);

const sha256 = value => createHash("sha256").update(value).digest("hex");

function validDate(value) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(value ?? ""))) return false;
  const date = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(date.valueOf()) && date.toISOString().slice(0, 10) === value;
}

export function previousMonth(asOf) {
  if (!validDate(asOf)) throw new Error(`INVALID_AS_OF ${asOf}`);
  const date = new Date(`${asOf}T00:00:00Z`);
  const next = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 1));
  if (date.getUTCDate() !== new Date(next.valueOf() - 1).getUTCDate()) throw new Error(`AS_OF_NOT_MONTH_END ${asOf}`);
  const previous = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() - 1, 1));
  return `${previous.getUTCFullYear()}${String(previous.getUTCMonth() + 1).padStart(2, "0")}`;
}

export function canonicalJson(bytes, expectedHash, label) {
  const buffer = Buffer.from(bytes);
  if (buffer.length >= 3 && buffer[0] === 0xef && buffer[1] === 0xbb && buffer[2] === 0xbf) throw new Error(`${label}_BOM_FORBIDDEN`);
  let decoded;
  try { decoded = new TextDecoder("utf-8", { fatal: true }).decode(buffer); }
  catch { throw new Error(`${label}_UTF8_INVALID`); }
  const canonical = decoded.replace(/\r\n?/g, "\n");
  if (!canonical.endsWith("\n") || canonical.endsWith("\n\n")) throw new Error(`${label}_TERMINAL_NEWLINE_INVALID`);
  const digest = sha256(Buffer.from(canonical, "utf8"));
  if (digest !== expectedHash) throw new Error(`${label}_CANONICAL_HASH_MISMATCH expected ${expectedHash}, received ${digest}`);
  try { return { data: JSON.parse(canonical), digest }; }
  catch { throw new Error(`${label}_JSON_INVALID`); }
}

function validateFieldAudit(audit) {
  if (audit?.schemaVersion !== 1 || audit.indicatorId !== "L4" || audit.auditStatus !== "field_coverage_only"
    || audit.scoreEligible !== false || audit.jointEligible !== false || audit.fieldContractStatus !== "needs_field_contract_resolution") throw new Error("FIELD_AUDIT_CONTRACT_MISMATCH");
  if (audit?.requiredRange?.startPeriod !== "201412" || audit.requiredRange.endPeriod !== "202606" || audit.requiredRange.count !== 139
    || audit.reportCount !== 119 || audit.missingOfficialReportCount !== 20 || !Array.isArray(audit.months) || audit.months.length !== 139) throw new Error("FIELD_AUDIT_COVERAGE_MISMATCH");
  const expected = { revenueCumYi: [119, 20, 0], revenueYoyPct: [106, 20, 13], expenditureCumYi: [119, 20, 0], expenditureYoyPct: [116, 20, 3] };
  for (const name of FIELD_NAMES) {
    const coverage = audit.coverage?.[name]; const [unique, missing, ambiguous] = expected[name];
    if (coverage?.unique !== unique || coverage.missing !== missing || coverage.ambiguous_multiple_candidates !== ambiguous || coverage.invalid !== 0) throw new Error(`FIELD_AUDIT_${name}_COVERAGE_MISMATCH`);
  }
}

function validateSchedule(schedule) {
  if (schedule?.schemaVersion !== 1 || schedule?.indicator?.id !== "B3" || !Array.isArray(schedule.points) || schedule.points.length !== 139
    || schedule?.range?.startAsOf !== "2015-01-31" || schedule.range.endAsOf !== "2026-07-31") throw new Error("SCHEDULE_CONTRACT_MISMATCH");
}

function fieldOutput(name, field, month, point) {
  if (!field || !Array.isArray(field.candidates)) throw new Error(`INVALID_FIELD ${point.period} ${name}`);
  if (field.status === "unique") {
    if (field.candidates.length !== 1) throw new Error(`UNIQUE_CANDIDATE_COUNT ${point.period} ${name}`);
    const candidate = field.candidates[0];
    if (typeof candidate.value !== "string" || candidate.unit !== (AMOUNT_FIELDS.has(name) ? "亿元" : "pct")
      || candidate.scopeType !== "cumulative" || candidate.scopeEndPeriod !== point.period
      || candidate.publicationDate !== point.publicationDate || candidate.url !== point.sourceUrl
      || !/^[a-f\d]{64}$/.test(candidate.evidenceSha256)
      || typeof candidate.basis !== "string" || typeof candidate.scopeGranularity !== "string" || typeof candidate.scopeSource !== "string") throw new Error(`UNIQUE_CANDIDATE_CONTRACT ${point.period} ${name}`);
    return {
      value: candidate.value,
      status: { status: "unique", candidateCount: 1 },
      evidence: { basis: candidate.basis, scopeType: "cumulative", scopeGranularity: candidate.scopeGranularity, scopeSource: candidate.scopeSource, scopeEndPeriod: candidate.scopeEndPeriod, evidenceSha256: candidate.evidenceSha256 },
    };
  }
  if (field.status === "ambiguous_multiple_candidates") {
    if (field.candidates.length < 2 || month.sourceStatus !== "official_report") throw new Error(`AMBIGUOUS_CANDIDATE_CONTRACT ${point.period} ${name}`);
    return { value: null, status: { status: "ambiguous_multiple_candidates", candidateCount: field.candidates.length }, evidence: null };
  }
  if (field.status === "missing") {
    if (field.candidates.length !== 0) throw new Error(`MISSING_CANDIDATE_CONTRACT ${point.period} ${name}`);
    return { value: null, status: { status: "missing", candidateCount: 0 }, evidence: null };
  }
  throw new Error(`INVALID_FIELD_STATUS ${point.period} ${name}`);
}

export function buildHistory(audit, schedule, requestedAsOf = "2026-08-17") {
  if (requestedAsOf !== "2026-08-17") throw new Error("AS_OF_MUST_BE_2026-08-17");
  validateFieldAudit(audit); validateSchedule(schedule);
  const seenPeriods = new Set(); const seenAsOf = new Set();
  const points = audit.months.map((month, index) => {
    const asOf = schedule.points[index]?.asOf;
    if (!/^\d{6}$/.test(month?.period) || !validDate(asOf) || previousMonth(asOf) !== month.period || seenPeriods.has(month.period) || seenAsOf.has(asOf)) throw new Error(`PERIOD_ASOF_MAPPING_INVALID index ${index}`);
    seenPeriods.add(month.period); seenAsOf.add(asOf);
    const official = month.sourceStatus === "official_report";
    if (!official && month.sourceStatus !== "missing_official_report") throw new Error(`INVALID_SOURCE_STATUS ${month.period}`);
    if (official && (!month.title || !month.url || !validDate(month.publicationDate))) throw new Error(`OFFICIAL_REPORT_CONTRACT ${month.period}`);
    if (!official && (month.title != null || month.url != null || month.publicationDate != null)) throw new Error(`MISSING_REPORT_HAS_METADATA ${month.period}`);
    const afterAsOf = official && month.publicationDate > asOf;
    if (afterAsOf && !PIT_EXCEPTIONS.has(`${month.period}\0${asOf}\0${month.publicationDate}`)) throw new Error(`UNREVIEWED_FUTURE_PUBLICATION ${month.period}`);
    const point = {
      indicatorId: "L4", asOf, period: month.period, dataStatus: "unavailable", sourceStatus: afterAsOf ? "official_report_not_yet_released" : month.sourceStatus,
      revenueCumYi: null, revenueYoyPct: null, expenditureCumYi: null, expenditureYoyPct: null,
      fieldStatus: {}, missingFields: [], ambiguousFields: [],
      title: official ? month.title : null, sourceUrl: official ? month.url : null,
      publicationDate: official ? month.publicationDate : null, releaseDate: official && !afterAsOf ? month.publicationDate : null,
      releaseDateQuality: afterAsOf ? "official_report_after_asof" : official ? "official_report_date" : "unavailable",
      pitScope: "release_lag_only", valueVintage: "latest_available_snapshot", revisionStatus: "not_tracked", evidence: {},
    };
    for (const name of FIELD_NAMES) {
      const result = afterAsOf
        ? { value: null, status: { status: "pit_unavailable", candidateCount: 0 }, evidence: null }
        : fieldOutput(name, month.fields?.[name], month, point);
      point[name] = result.value; point.fieldStatus[name] = result.status; point.evidence[name] = result.evidence;
      if (result.status.status === "missing" || result.status.status === "pit_unavailable") point.missingFields.push(name);
      if (result.status.status === "ambiguous_multiple_candidates") point.ambiguousFields.push(name);
    }
    point.dataStatus = !official || afterAsOf ? "unavailable" : point.ambiguousFields.length ? "partial" : "complete";
    if (!official && (point.missingFields.length !== 4 || point.ambiguousFields.length)) throw new Error(`MISSING_REPORT_FIELD_CONTRACT ${month.period}`);
    return point;
  });

  const statusCount = Object.fromEntries(["complete", "partial", "unavailable"].map(status => [status, points.filter(point => point.dataStatus === status).length]));
  if (statusCount.complete !== 103 || statusCount.partial !== 14 || statusCount.unavailable !== 22) throw new Error("POINT_STATUS_COVERAGE_MISMATCH");
  const fieldCoverage = {};
  for (const name of FIELD_NAMES) {
    const unique = points.filter(point => point.fieldStatus[name].status === "unique").length;
    const ambiguous = points.filter(point => point.fieldStatus[name].status === "ambiguous_multiple_candidates").length;
    const missing = points.filter(point => point.fieldStatus[name].status === "missing").length;
    const pitUnavailable = points.filter(point => point.fieldStatus[name].status === "pit_unavailable").length;
    fieldCoverage[name] = { unique, ambiguous, missing, pitUnavailable, null: ambiguous + missing + pitUnavailable };
  }
  const expectedCoverage = JSON.stringify({ revenueCumYi: { unique: 117, ambiguous: 0, missing: 20, pitUnavailable: 2, null: 22 }, revenueYoyPct: { unique: 104, ambiguous: 13, missing: 20, pitUnavailable: 2, null: 35 }, expenditureCumYi: { unique: 117, ambiguous: 0, missing: 20, pitUnavailable: 2, null: 22 }, expenditureYoyPct: { unique: 114, ambiguous: 3, missing: 20, pitUnavailable: 2, null: 25 } });
  if (JSON.stringify(fieldCoverage) !== expectedCoverage) throw new Error("FINAL_FIELD_COVERAGE_MISMATCH");

  return {
    schemaVersion: 1, generatedAt: "2026-08-17T00:00:00.000Z", requestedAsOf,
    historyStatus: "partial_official_pit", scoreEligible: false, jointEligible: false,
    indicator: { id: "L4", name: "财政脉冲", frequency: "monthly", asOfRule: "official_period_mapped_to_next_calendar_month_end_no_carry_forward" },
    range: { startAsOf: "2015-01-31", endAsOf: "2026-07-31", startPeriod: "201412", endPeriod: "202606", pointCount: 139 },
    inputs: {
      fieldAudit: { path: FIELD_AUDIT_PATH, canonicalSha256: EXPECTED_FIELD_AUDIT_SHA256, hashNormalization: HASH_NORMALIZATION },
      schedule: { path: SCHEDULE_PATH, canonicalSha256: EXPECTED_SCHEDULE_SHA256, hashNormalization: HASH_NORMALIZATION },
      upstreamSourceAudit: { path: "public/data/market-research/history/l4-source-audit.json", canonicalSha256: SOURCE_AUDIT_SHA256 },
    },
    source: { provider: "中华人民共和国财政部", dataset: "official_fiscal_reports_via_frozen_field_audit", fields: FIELD_NAMES, releaseDateQuality: "official_report_date_or_after_asof_or_unavailable", pitScope: "release_lag_only", valueVintage: "latest_available_snapshot", revisionStatus: "not_tracked", carryForward: false },
    units: { revenueCumYi: "亿元", revenueYoyPct: "pct", expenditureCumYi: "亿元", expenditureYoyPct: "pct" },
    periodCoverage: { required: 139, officialReports: 119, completeUnique: 103, partialAmbiguous: 14, pitUnavailableOfficialReports: 2, missingOfficialReports: 20 },
    fieldCoverage, points,
  };
}

function parseAsOf(argv) {
  if (argv.length !== 2 || argv[0] !== "--as-of" || argv[1] !== "2026-08-17") throw new Error("Usage: node scripts/generate-market-research-history-l4.mjs --as-of 2026-08-17");
  return argv[1];
}

export async function generate({ root = process.cwd(), argv = process.argv.slice(2) } = {}) {
  const requestedAsOf = parseAsOf(argv);
  const fieldBytes = await readFile(path.join(root, FIELD_AUDIT_PATH));
  const scheduleBytes = await readFile(path.join(root, SCHEDULE_PATH));
  const fieldAudit = canonicalJson(fieldBytes, EXPECTED_FIELD_AUDIT_SHA256, "FIELD_AUDIT");
  const schedule = canonicalJson(scheduleBytes, EXPECTED_SCHEDULE_SHA256, "SCHEDULE");
  const output = `${JSON.stringify(buildHistory(fieldAudit.data, schedule.data, requestedAsOf), null, 2)}\n`;
  const outputPath = path.join(root, OUTPUT_PATH); const temporaryPath = `${outputPath}.tmp-${process.pid}`;
  await mkdir(path.dirname(outputPath), { recursive: true });
  try { await writeFile(temporaryPath, output, { encoding: "utf8", flag: "wx" }); await rename(temporaryPath, outputPath); }
  catch (error) { await unlink(temporaryPath).catch(() => {}); throw error; }
  return { outputPath, sha256: sha256(output), pointCount: 139 };
}

const isMain = process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href;
if (isMain) generate().then(result => console.log(`Wrote ${result.outputPath} (${result.pointCount} points, sha256 ${result.sha256})`)).catch(error => { console.error(error.message); process.exitCode = 1; });
