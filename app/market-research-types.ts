export type MarketCardCode = "F" | "L" | "B";
export type DisplayValue = string | null;

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
};

export type MarketResearchCurrent = {
  schemaVersion: 1;
  generatedAt: string;
  source: { mode: "manual_sample" | "generated"; label: string };
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

export function isMarketResearchCurrent(value: unknown): value is MarketResearchCurrent {
  if (!value || typeof value !== "object") return false;
  const data = value as Partial<MarketResearchCurrent>;
  return data.schemaVersion === 1
    && !!data.diagnosis && typeof data.diagnosis === "object"
    && Array.isArray(data.cards)
    && !!data.policyOverlay && typeof data.policyOverlay === "object"
    && !!data.jointState && typeof data.jointState === "object"
    && Array.isArray(data.stateMap)
    && Array.isArray(data.drivers)
    && Array.isArray(data.risks)
    && !!data.dataQuality && typeof data.dataQuality === "object"
    && Array.isArray(data.recentHistory)
    && Array.isArray(data.recentEvents)
    && !!data.components
    && Array.isArray(data.components.F)
    && Array.isArray(data.components.L)
    && Array.isArray(data.components.B);
}
