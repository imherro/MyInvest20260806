export type MarketCardCode = "F" | "L" | "B";

export type RegimeIndicator = {
  id: string;
  name: string;
  score: string;
  raw: string;
  position: string;
  trend: string;
  period: string;
  release: string;
  coverage: string;
  quality: string;
  note: string;
};

const components: Record<MarketCardCode, RegimeIndicator[]> = {
  F: [
    { id: "F1", name: "盈利趋势", score: "6.8", raw: "全A +8.3% / 非金融 +11.2%", position: "近10年 62%", trend: "改善", period: "2026 Q2", release: "08.31 预计完整", coverage: "86%", quality: "B+", note: "上市公司盈利恢复，但半年报尚未完全披露。" },
    { id: "F2", name: "盈利扩散与质量", score: "6.1", raw: "增长公司占比 56.4%", position: "近10年 55%", trend: "改善", period: "2026 Q2", release: "08.17", coverage: "84%", quality: "B", note: "ROE企稳，现金流匹配度仍需观察。" },
    { id: "F3", name: "股东回报 / 股权融资", score: "9.2", raw: "3.08×", position: "历史高位", trend: "改善", period: "滚动12月", release: "08.12", coverage: "99%", quality: "A", note: "分红与已完成回购显著高于股权融资。" },
    { id: "F4", name: "长期资金", score: "8.3", raw: "持仓市值两年 +85%", position: "结构性高位", trend: "改善", period: "2026 Q2", release: "07.18", coverage: "72%", quality: "B-", note: "保险、社保和年金方向积极，早期历史覆盖不足。" },
  ],
  L: [
    { id: "L1", name: "利率与实际利率", score: "7.2", raw: "实际10Y 1.1%", position: "近5年 34%", trend: "宽松", period: "2026-08", release: "08.17", coverage: "100%", quality: "A", note: "实际利率边际下行，对权益估值形成支持。" },
    { id: "L2", name: "M1/M2货币活化", score: "6.4", raw: "剪刀差 +1.6pct", position: "近5年 63%", trend: "改善", period: "2026-07", release: "08.13", coverage: "100%", quality: "B+", note: "按新M1口径单独标准化，不与旧序列强拼。" },
    { id: "L3", name: "信用脉冲", score: "7.6", raw: "3M +1.8pct", position: "近5年 72%", trend: "转正", period: "2026-07", release: "08.13", coverage: "96%", quality: "A-", note: "新增社融相对GDP开始加速，是当前主要支撑。" },
    { id: "L4", name: "财政脉冲", score: "6.9", raw: "政府债融资/GDP +0.7pct", position: "近5年 66%", trend: "扩张", period: "2026-07", release: "08.15", coverage: "92%", quality: "B+", note: "政府债券净融资保持积极。" },
    { id: "L5", name: "外部金融条件", score: "5.9", raw: "中性偏约束", position: "近5年 48%", trend: "持平", period: "2026-08", release: "08.17", coverage: "100%", quality: "A-", note: "美元与美国实际利率仍限制外部流动性。" },
  ],
  B: [
    { id: "B1", name: "ERP股权风险溢价", score: "3.8", raw: "沪深300 4.7%", position: "近10年 54%", trend: "收窄", period: "2026-08", release: "08.17", coverage: "100%", quality: "A", note: "仍有风险补偿，但已较年初收窄。" },
    { id: "B2", name: "股息率－无风险利率", score: "3.2", raw: "+0.9pct", position: "近10年 43%", trend: "持平", period: "2026-08", release: "08.17", coverage: "98%", quality: "A-", note: "红利资产相对国债仍具一定吸引力。" },
    { id: "B3", name: "PE/PB与估值分化", score: "5.6", raw: "宽基 58% / 科技 88%", position: "局部偏高", trend: "升温", period: "2026-08", release: "08.17", coverage: "99%", quality: "A", note: "整体中性，科技成长局部估值显著更热。" },
    { id: "B4", name: "总市值/GDP", score: "4.7", raw: "92%", position: "滚动10年 76%", trend: "升温", period: "2026 Q2", release: "07.15", coverage: "100%", quality: "B+", note: "证券化率变化使绝对值仅作辅助。" },
    { id: "B5", name: "投机热度", score: "4.4", raw: "两融/流通市值 2.66%", position: "黄色观察区", trend: "升温", period: "2026-08", release: "08.17", coverage: "100%", quality: "A", note: "市场宽度和成交活跃，但尚未达到全面狂热。" },
  ],
};

export const marketResearchMock = {
  asOf: "2026.08.17",
  prototype: true,
  diagnosis: {
    states: ["F 偏强", "L 偏正", "B 温热"],
    headline: "长牛底座偏强，货币信用偏正，泡沫进入温热区",
    diagnosis: "长期市场基础仍较健康，货币信用环境目前对风险资产形成支持，但市场估值和交易热度已经离开低温区域。",
    investmentImplication: "支持保留较高权益底仓；新增风险暴露应更多考虑结构与估值，而不是单纯追随指数上涨。",
    riskNote: "若泡沫温度继续上升，同时货币信用状态转弱，应视为重要的市场风险组合。",
    positionBias: "支持较高权益基准",
  },
  cards: [
    { code: "F" as const, kind: "foundation", metaphor: "发动机", title: "长牛底座", score: "7.6", status: "偏强", coverage: "91%", updatedAt: "2026 Q2", tone: "healthy", trend: [42, 46, 51, 55, 58, 63, 66, 69, 72, 74, 75, 76], drivers: ["股东回报持续改善", "长期资金稳定流入"], risks: ["盈利扩散仍待半年报确认"], components: components.F },
    { code: "L" as const, kind: "liquidity", metaphor: "汽油", title: "货币信用", score: "6.8", status: "偏正", coverage: "95%", updatedAt: "2026-07", tone: "support", trend: [48, 46, 43, 45, 50, 54, 58, 61, 65, 67, 69, 68], drivers: ["实际利率边际下行", "信用脉冲转正"], risks: ["外部金融条件仍有约束"], components: components.L },
    { code: "B" as const, kind: "bubble", metaphor: "转速表", title: "估值泡沫", score: "4.3", status: "温热", coverage: "98%", updatedAt: "2026-08-14", tone: "warm", trend: [18, 20, 23, 25, 27, 30, 34, 36, 39, 41, 42, 43], drivers: ["宽基估值尚未极端", "ERP仍有风险补偿"], risks: ["局部科技成长拥挤升温"], components: components.B, directionNote: "分数越高代表泡沫风险越高" },
  ],
  policyOverlay: {
    status: "偏正面",
    tone: "healthy",
    reasons: ["分红回购机制持续强化", "长期资金入市机制改善"],
  },
  jointState: {
    nearestState: "黄金环境",
    transitioningTo: "热牛阶段",
    trendLabel: "向高温区移动",
    description: "长期基础和流动性仍较友好，但泡沫温度已经从低位进入温热区域。",
  },
  stateMap: [
    ["高", "低", "高", "黄金环境", "current"],
    ["高", "高", "高", "热牛阶段", "next"],
    ["高", "低", "低", "长牛调整", ""],
    ["高", "高", "低", "高位风险", "danger"],
    ["低", "低", "高", "流动性修复", ""],
    ["低", "高", "高", "投机扩张", "warm"],
    ["低", "低", "低", "熊市筑底", ""],
    ["低", "高", "低", "脆弱高危", "danger"],
  ],
  drivers: [
    { title: "股东回报机制", detail: "分红回购/融资比维持高位" },
    { title: "信用脉冲", detail: "3M与6M变化均已转正" },
    { title: "长期资金", detail: "保险与年金配置继续提升" },
  ],
  risks: [
    { title: "局部估值分化", detail: "科技成长处于88%分位" },
    { title: "交易热度", detail: "成交与两融进入黄色观察区" },
    { title: "数据完整度", detail: "半年报尚未全部披露" },
  ],
  dataQuality: {
    grade: "A-",
    coverage: "95%",
    pitStatus: "待接入",
    warning: "盈利指标仅覆盖已披露半年报公司",
  },
  recentHistory: [
    ["F 长牛底座", "6.3", "7.6", "foundation"],
    ["L 货币信用", "4.8", "6.8", "liquidity"],
    ["B 估值泡沫", "1.8", "4.3", "bubble"],
  ],
  recentEvents: [
    { date: "08.15", title: "7月金融数据发布", detail: "信用脉冲维持正值，L3保持支持。", group: "L", tone: "blue" },
    { date: "08.12", title: "分红回购统计更新", detail: "股东回报/融资比继续处于历史高位。", group: "F", tone: "green" },
    { date: "08.08", title: "科技成交占比升温", detail: "局部拥挤度上升，B5进入观察区。", group: "B", tone: "warm" },
  ],
  components,
};

export const marketEpisodes = [
  { period: "2005.06 — 2007.10", title: "长牛启动 → 超级泡沫", state: "F高 · L转弱 · B极高", tone: "danger", finding: "发动机仍好，但转速进入红线；顶部风险来自价格而非盈利崩溃。", pass: "应在6124前看到B快速升至历史高位。" },
  { period: "2007.10 — 2008.11", title: "泡沫破裂与外部冲击", state: "F下行 · L弱 · B回落", tone: "weak", finding: "估值回落并不等于熊市立即结束，盈利和信用同步恶化。", pass: "F与L应在熊市中持续走弱。" },
  { period: "2008.11 — 2009.08", title: "强刺激反弹", state: "F一般 · L极强 · B升温", tone: "policy", finding: "汽油猛烈增加，但发动机没有同步升级；强行情不等于十年牛。", pass: "L应显著领先并高于F。" },
  { period: "2014.06 — 2015.06", title: "杠杆与投机泡沫", state: "F弱 · L强 · B极高", tone: "danger", finding: "融资与估值形成正反馈，市场性质从低估值修复转为投机牛。", pass: "2015年6月B必须处于极端高位。" },
  { period: "2017.01 — 2018.12", title: "信用收缩熊市", state: "F转弱 · L弱 · B中性", tone: "weak", finding: "熊市并非都由泡沫引发；信用和盈利恶化是这轮下跌的关键。", pass: "L和F应先后恶化，而B未必极高。" },
  { period: "2019.01 — 2021.02", title: "核心资产结构牛", state: "F高 · L中高 · B高", tone: "warm", finding: "优质资产有真实盈利，但集中买入把好公司推成了泡沫。", pass: "2021年应同时出现F高与B高。" },
  { period: "2021.02 — 2022.12", title: "好公司泡沫消化", state: "F回落 · L转弱 · B回落", tone: "weak", finding: "不是全市场股灾，而是高估值资产经历多年估值消化。", pass: "B应从高位回落，风格分化需被保留。" },
  { period: "2024.01 — 当前", title: "制度底与新周期验证", state: "F增强 · L改善 · B温热", tone: "current", finding: "股东回报和长期资金形成结构改善，仍需盈利持续性完成验证。", pass: "不能因示例结论替代未来真实PIT回测。" },
];
