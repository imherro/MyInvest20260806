export type MarketCardCode = "F" | "L" | "B";
export type DisplayValue = string | null;
export type IndicatorDataStatus = "generated" | "pending" | "manual_sample";

export type RegimeIndicator = {
  id: string;
  name: string;
  score: DisplayValue;
  raw: DisplayValue;
  position: DisplayValue;
  trend: DisplayValue;
  period: DisplayValue;
  release: DisplayValue;
  coverage: DisplayValue;
  quality: DisplayValue;
  note: DisplayValue;
  dataStatus: IndicatorDataStatus;
};

export type MarketResearchCurrent = {
  schemaVersion: 2;
  generatedAt: string;
  source: {
    mode: "generated";
    label: string;
    provider: "Tushare Pro";
    api: "index_dailybasic";
    instruments: Array<{ code: string; name: string; role: "broad" | "technology" }>;
  };
  asOf: DisplayValue;
  diagnosis: {
    states: string[];
    headline: DisplayValue;
    diagnosis: DisplayValue;
    investmentImplication: DisplayValue;
    riskNote: DisplayValue;
    positionBias: DisplayValue;
  };
  cards: Array<{
    code: MarketCardCode;
    kind: string;
    metaphor: string;
    title: string;
    score: DisplayValue;
    status: DisplayValue;
    coverage: DisplayValue;
    updatedAt: DisplayValue;
    tone: string;
    trend: number[];
    drivers: string[];
    risks: string[];
    directionNote?: DisplayValue;
  }>;
  policyOverlay: { status: DisplayValue; tone: string; reasons: string[] };
  jointState: {
    nearestState: DisplayValue;
    transitioningTo: DisplayValue;
    trendLabel: DisplayValue;
    description: DisplayValue;
  };
  stateMap: Array<[string, string, string, string, string]>;
  drivers: Array<{ title: string; detail: DisplayValue }>;
  risks: Array<{ title: string; detail: DisplayValue }>;
  dataQuality: { grade: DisplayValue; coverage: DisplayValue; pitStatus: DisplayValue; warning: DisplayValue };
  recentHistory: Array<[string, string, string, string]>;
  recentEvents: Array<{ date: string; title: string; detail: DisplayValue; group: string; tone: string }>;
  components: Record<MarketCardCode, RegimeIndicator[]>;
};

const isObject = (value: unknown): value is Record<string, unknown> => !!value && typeof value === "object";
const isString = (value: unknown): value is string => typeof value === "string";
const isDisplayValue = (value: unknown): value is DisplayValue => value === null || isString(value);
const isStringArray = (value: unknown): value is string[] => Array.isArray(value) && value.every(isString);
const isNumberArray = (value: unknown): value is number[] => Array.isArray(value) && value.every(item => typeof item === "number");

function isIndicator(value: unknown): value is RegimeIndicator {
  if (!isObject(value) || !isString(value.id) || !isString(value.name)
    || (value.dataStatus !== "generated" && value.dataStatus !== "pending" && value.dataStatus !== "manual_sample")) return false;
  return ["score", "raw", "position", "trend", "period", "release", "coverage", "quality", "note"]
    .every(field => isDisplayValue(value[field]));
}

export function isMarketResearchCurrent(value: unknown): value is MarketResearchCurrent {
  if (!isObject(value) || value.schemaVersion !== 2 || !isString(value.generatedAt) || !isDisplayValue(value.asOf)) return false;

  const source = value.source;
  if (!isObject(source) || source.mode !== "generated" || !isString(source.label)
    || source.provider !== "Tushare Pro" || source.api !== "index_dailybasic"
    || !Array.isArray(source.instruments) || source.instruments.length !== 2
    || !source.instruments.every(instrument => isObject(instrument)
      && isString(instrument.code) && isString(instrument.name)
      && (instrument.role === "broad" || instrument.role === "technology"))) return false;

  const diagnosis = value.diagnosis;
  if (!isObject(diagnosis) || !isStringArray(diagnosis.states)) return false;
  if (!["headline", "diagnosis", "investmentImplication", "riskNote", "positionBias"].every(field => isDisplayValue(diagnosis[field]))) return false;

  const cards = value.cards;
  if (!Array.isArray(cards) || cards.length !== 3) return false;
  if (cards.map(card => isObject(card) ? card.code : null).join(",") !== "F,L,B") return false;
  if (!cards.every(card => isObject(card)
    && ["code", "kind", "metaphor", "title", "tone"].every(field => isString(card[field]))
    && ["score", "status", "coverage", "updatedAt"].every(field => isDisplayValue(card[field]))
    && isNumberArray(card.trend)
    && isStringArray(card.drivers)
    && isStringArray(card.risks)
    && (card.directionNote === undefined || isDisplayValue(card.directionNote)))) return false;

  const policy = value.policyOverlay;
  if (!isObject(policy) || !isDisplayValue(policy.status) || !isString(policy.tone) || !isStringArray(policy.reasons)) return false;

  const joint = value.jointState;
  if (!isObject(joint) || !["nearestState", "transitioningTo", "trendLabel", "description"].every(field => isDisplayValue(joint[field]))) return false;

  if (!Array.isArray(value.stateMap) || !value.stateMap.every(row => Array.isArray(row) && row.length === 5 && row.every(isString))) return false;
  if (!Array.isArray(value.drivers) || !value.drivers.every(item => isObject(item) && isString(item.title) && isDisplayValue(item.detail))) return false;
  if (!Array.isArray(value.risks) || !value.risks.every(item => isObject(item) && isString(item.title) && isDisplayValue(item.detail))) return false;

  const quality = value.dataQuality;
  if (!isObject(quality) || !["grade", "coverage", "pitStatus", "warning"].every(field => isDisplayValue(quality[field]))) return false;
  if (!Array.isArray(value.recentHistory) || !value.recentHistory.every(row => Array.isArray(row) && row.length === 4 && row.every(isString))) return false;
  if (!Array.isArray(value.recentEvents) || !value.recentEvents.every(event => isObject(event)
    && ["date", "title", "group", "tone"].every(field => isString(event[field]))
    && isDisplayValue(event.detail))) return false;

  const components = value.components;
  if (!isObject(components)) return false;
  const expectedIds: Record<MarketCardCode, string[]> = {
    F: ["F1", "F2", "F3", "F4"],
    L: ["L1", "L2", "L3", "L4", "L5"],
    B: ["B1", "B2", "B3", "B4", "B5"],
  };
  return (["F", "L", "B"] as MarketCardCode[]).every(code => {
    const indicators = components[code];
    return Array.isArray(indicators)
      && indicators.map(item => isObject(item) ? item.id : null).join(",") === expectedIds[code].join(",")
      && indicators.every(isIndicator);
  });
}
