"use client";

import { useEffect, useState } from "react";
import { marketEpisodes } from "./market-research-static";
import { isMarketResearchCurrent, type DisplayValue, type MarketCardCode, type MarketResearchCurrent, type RegimeIndicator } from "./market-research-types";

type View = "overview" | "market" | "themes" | "etf" | "stocks" | "portfolio" | "library";

const nav: { id: View; label: string; icon: string }[] = [
  { id: "overview", label: "今日总览", icon: "⌂" },
  { id: "market", label: "市场研究", icon: "◎" },
  { id: "themes", label: "主线研究", icon: "⌁" },
  { id: "etf", label: "ETF 研究", icon: "◇" },
  { id: "stocks", label: "个股研究", icon: "▤" },
  { id: "portfolio", label: "影子账户", icon: "◫" },
  { id: "library", label: "研究资料库", icon: "□" },
];

const pctClass = (n: number) => (n >= 0 ? "up" : "down");
const display = (value: DisplayValue | undefined) => value ?? "—";

function Sparkline({ values, negative = false }: { values: number[]; negative?: boolean }) {
  const max = Math.max(...values);
  const min = Math.min(...values);
  const points = values.map((v, i) => `${(i / (values.length - 1)) * 100},${34 - ((v - min) / (max - min || 1)) * 28}`).join(" ");
  return <svg className={`spark ${negative ? "negative" : ""}`} viewBox="0 0 100 38" preserveAspectRatio="none" aria-hidden="true"><polyline points={points} /></svg>;
}

function PageHeader({ eyebrow, title, desc, children }: { eyebrow: string; title: string; desc: string; children?: React.ReactNode }) {
  return <div className="page-head"><div><div className="eyebrow">{eyebrow}</div><h1>{title}</h1><p>{desc}</p></div>{children && <div className="head-actions">{children}</div>}</div>;
}

function Overview({ go }: { go: (v: View) => void }) {
  const indices = [
    ["上证指数", "3,659.11", 0.16, [18, 21, 20, 25, 23, 27, 30]],
    ["深证成指", "11,154.42", 0.03, [17, 21, 18, 24, 26, 24, 25]],
    ["创业板指", "2,353.25", -0.18, [29, 25, 28, 23, 20, 22, 19]],
    ["中证全指", "4,873.68", 0.21, [16, 18, 17, 22, 21, 26, 28]],
  ] as const;
  return <>
    <PageHeader eyebrow="THURSDAY · 2026.08.06" title="今天，市场在交易什么？" desc="从市场温度到研究结论，把每天真正重要的信息收拢到一张桌面。">
      <button className="btn ghost">收盘复盘</button><button className="btn primary">＋ 新建研究</button>
    </PageHeader>
    <div className="signal-strip"><span className="pulse" /> <b>市场状态：震荡偏强</b><span>全市场成交 18,642 亿</span><span>北向代理净流入 +38.6 亿</span><span className="tag warm">风险温度 62°</span></div>
    <div className="index-grid">{indices.map(([name, price, pct, vals]) => <div className="index-card" key={name}><div><span>{name}</span><strong>{price}</strong><em className={pctClass(pct)}>{pct > 0 ? "+" : ""}{pct}%</em></div><Sparkline values={[...vals]} negative={pct < 0} /></div>)}</div>
    <div className="overview-grid">
      <section className="panel market-pulse"><div className="section-title"><div><span>MARKET PULSE</span><h2>市场脉搏</h2></div><button onClick={() => go("market")}>进入市场研究 →</button></div>
        <div className="pulse-body"><div className="thermo"><div className="dial"><div><b>62</b><span>偏热</span></div></div><p>赚钱效应继续回升，但高位拥挤度已经进入观察区。</p></div>
          <div className="mini-metrics"><div><span>上涨家数</span><b className="up">3,208</b><small>下跌 1,842</small></div><div><span>涨停 / 跌停</span><b>76 / 8</b><small>昨日 68 / 12</small></div><div><span>20日新高</span><b>412</b><small className="up">+14.4%</small></div><div><span>两市成交</span><b>18,642亿</b><small>5日均值 17,890亿</small></div></div>
        </div>
      </section>
      <section className="panel focus"><div className="section-title"><div><span>TODAY&apos;S FOCUS</span><h2>今日关注</h2></div><button>全部 7 条 →</button></div>
        <div className="focus-list"><article><time>09:30</time><div><b>稀土价格继续上行，产业链扩散至磁材环节</b><p>供给约束与机器人需求形成共振，关注二阶受益方向。</p></div><span className="tag red">主线</span></article><article><time>11:20</time><div><b>创新药板块放量突破平台</b><p>海外授权交易活跃，ETF 资金连续五日净流入。</p></div><span className="tag blue">ETF</span></article><article><time>14:05</time><div><b>红利资产分化，电力优于煤炭</b><p>长端利率小幅回升，防御资产内部进行再平衡。</p></div><span className="tag gray">观察</span></article></div>
      </section>
    </div>
    <div className="lower-grid">
      <section className="panel"><div className="section-title"><div><span>CORE THEMES</span><h2>主线强度排行</h2></div><button onClick={() => go("themes")}>主线地图 →</button></div>
        <div className="theme-ranking">{[["01","AI 算力","82","趋势加速","#d24b3f"],["02","创新药出海","76","趋势延续","#536ea8"],["03","稀土永磁","71","由点扩散","#aa7b35"],["04","高股息电力","64","震荡分化","#71806d"]].map(x=><div key={x[0]}><span>{x[0]}</span><b>{x[1]}</b><div className="bar"><i style={{width:x[2]+"%", background:x[4]}} /></div><strong>{x[2]}</strong><em>{x[3]}</em></div>)}</div>
      </section>
      <section className="panel"><div className="section-title"><div><span>SHADOW PORTFOLIO</span><h2>影子账户</h2></div><button onClick={() => go("portfolio")}>查看持仓 →</button></div>
        <div className="portfolio-hero"><div><small>模拟总资产</small><b>¥ 1,286,430</b><span className="up">今日 +¥8,420（+0.66%）</span></div><div className="return-ring"><b>+28.64%</b><span>累计收益</span></div></div>
        <div className="holdings"><span>前五持仓</span><div><i style={{width:"24%"}}>科创50</i><i style={{width:"21%"}}>恒生科技</i><i style={{width:"18%"}}>中际旭创</i><i style={{width:"15%"}}>创新药</i></div></div>
      </section>
    </div>
  </>;
}

function Market() {
  const [marketTab,setMarketTab]=useState<"overview"|"history"|"episodes"|"method">("overview");
  const [expandedCard,setExpandedCard]=useState<MarketCardCode|null>(null);
  const [data,setData]=useState<MarketResearchCurrent|null>(null);
  const [dataError,setDataError]=useState<string|null>(null);
  const selectMarketTab=(tab:"overview"|"history"|"episodes"|"method")=>{setMarketTab(tab);if(typeof window!=="undefined")window.history.replaceState(null,"",`#market/${tab}`)};
  useEffect(()=>{
    const controller=new AbortController();
    fetch("/data/market-research/current.json",{cache:"no-store",signal:controller.signal})
      .then(async response=>{
        if(!response.ok)throw new Error(`HTTP ${response.status}`);
        const payload:unknown=await response.json();
        if(!isMarketResearchCurrent(payload))throw new Error("数据结构不符合当前MarketResearchCurrent契约");
        setData(payload);
      })
      .catch(error=>{
        if(error instanceof DOMException&&error.name==="AbortError")return;
        setDataError(error instanceof Error?error.message:"未知错误");
      });
    return()=>controller.abort();
  },[]);

  const header=<PageHeader eyebrow="MARKET REGIME HEALTH" title="市场研究" desc="先看发动机，再看汽油，最后看转速表。三张表分别描述长期基础、流动性与估值风险，不合并为单一方向判断。"><button className="btn ghost" onClick={()=>selectMarketTab("method")}>方法说明</button><button className="btn primary">导出诊断</button></PageHeader>;
  if(dataError)return <>{header}<section className="market-data-state error" role="alert"><span>DATA INPUT ERROR</span><h2>当前市场数据加载失败</h2><p>无法读取 <code>/data/market-research/current.json</code>：{dataError}</p><small>页面不会回退到旧数据。请修复文件后刷新页面。</small></section></>;
  if(!data)return <>{header}<section className="market-data-state" aria-live="polite"><span>LOCAL JSON INPUT</span><h2>正在读取当前市场数据…</h2><p>/data/market-research/current.json</p></section></>;
  const indicators=data.components;
  const allIndicators=Object.values(indicators).flat();
  const generatedCount=allIndicators.filter(item=>item.dataStatus==="generated").length;
  const totalIndicatorCount=allIndicators.length;
  return <>
    {header}
    <div className="prototype-banner"><span>VERIFIED DATA SNAPSHOT</span><b>当前为真实数据快照（L2/L3经PBOC交叉验证，L4来自财政部官方）</b><em>{data.source.providers.join(" + ")} · {data.source.apis.join(" / ")}</em><small>信息截止 {display(data.asOf)} · 质量 {display(data.dataQuality.grade)} · 覆盖率 {display(data.dataQuality.coverage)}</small></div>
    <div className="tabs regime-tabs">{[["overview","总览"],["history","历史诊断"],["episodes","关键时期审计"],["method","方法与数据"]].map(([id,label])=><button key={id} className={marketTab===id?"active":""} onClick={()=>selectMarketTab(id as "overview"|"history"|"episodes"|"method")}>{label}</button>)}</div>
    {marketTab==="overview"&&<>
    <section className="regime-diagnosis">
      <div><span className="eyebrow">CURRENT DIAGNOSIS · {data.diagnosis.states.join(" · ")}</span><h2>{display(data.diagnosis.headline)}</h2><p>{display(data.diagnosis.diagnosis)}</p><p><b>投资含义：</b>{display(data.diagnosis.investmentImplication)}</p><p><b>主要风险：</b>{display(data.diagnosis.riskNote)}</p></div>
      <div className="diagnosis-action"><small>仓位倾向</small><b>{display(data.diagnosis.positionBias)}</b><span>该结论是总体仓位判断的上游输入，不直接构成交易指令</span></div>
    </section>
    <div className="regime-card-grid">{data.cards.map(card=><article className={`regime-score-card ${card.tone}`} key={card.code}>
      <div className="regime-card-head"><span className="regime-code">{card.code}</span><div><small>{card.metaphor} · {card.kind.toUpperCase()}</small><h2>{card.title}</h2></div><span className={`regime-state ${card.tone}`}>{card.status}</span></div>
      <div className="regime-score-row"><strong>{display(card.score)}</strong><span>/ 10</span><div className="regime-trend" aria-label="最近12个月趋势">{card.trend.map((v,i)=><i key={i} style={{height:`${Math.max(18,v)}%`}} />)}</div></div>
      <div className="regime-meta"><span>数据覆盖 <b>{display(card.coverage)}</b></span><span>更新/数据期 <b>{display(card.updatedAt)}</b></span></div>
      <div className="regime-evidence"><small>主要驱动</small>{card.drivers.map(x=><p key={x}><i>↑</i>{x}</p>)}{card.risks[0]&&<p className="risk"><i>!</i>{card.risks[0]}</p>}{card.directionNote&&<small className="bubble-direction">{card.directionNote}</small>}</div>
      <button className="regime-detail-btn" onClick={()=>setExpandedCard(expandedCard===card.code?null:card.code)}>{expandedCard===card.code?"收起指标":`展开 ${card.code === "F" ? "4" : "5"} 项指标`} <span>{expandedCard===card.code?"−":"＋"}</span></button>
    </article>)}</div>
    {expandedCard&&<section className="panel indicator-detail"><div className="section-title"><div><span>COMPONENT DETAIL</span><h2>{expandedCard==="F"?"长牛底座":expandedCard==="L"?"货币信用":"估值泡沫"} · 指标明细</h2></div><span className="tag blue">真实生成 {generatedCount}/{totalIndicatorCount}</span></div><div className="indicator-table"><div className="indicator-row header"><span>指标</span><span>得分 / 状态</span><span>原始值 / 历史位置</span><span>数据期 / 发布</span><span>覆盖 / 质量</span><span>解释</span></div>{indicators[expandedCard].map(item=><div className="indicator-row" key={item.id}><span><b>{item.id}</b><strong>{item.name}</strong><em className={`indicator-status ${item.dataStatus}`}>{item.dataStatus==="generated"?"真实数据":item.dataStatus==="pending"?"待接入":"人工样例"}</em></span><span><b>{display(item.score)}</b><small>{display(item.trend)}</small></span><span><strong>{display(item.raw)}</strong><small>{display(item.position)}</small></span><span><strong>{display(item.period)}</strong><small>{display(item.release)}</small></span><span><strong>{display(item.coverage)}</strong><small>质量 {display(item.quality)}</small></span><span>{display(item.note)}</span></div>)}</div></section>}
    <div className="regime-summary-grid">
      <section className="panel policy-card"><div className="section-title"><div><span>POLICY OVERLAY</span><h2>政策制度环境</h2></div><span className={`regime-state ${data.policyOverlay.tone}`}>{data.policyOverlay.status}</span></div><p>定性叠加，不计入三表总分</p><div>{data.policyOverlay.reasons.map(reason=><span key={reason}>{reason}</span>)}</div></section>
      <section className="panel joint-state"><div className="section-title"><div><span>COMBINED REGIME</span><h2>联合市场状态</h2></div><span className="tag gray">数据不足</span></div><div className="joint-formula">{data.diagnosis.states.map((state,index)=><span key={state}><b>{state}</b>{index<data.diagnosis.states.length-1&&<i>×</i>}</span>)}</div><h3>{data.jointState.nearestState&&data.jointState.transitioningTo?`${data.jointState.nearestState} → ${data.jointState.transitioningTo}过渡`:"数据不足，暂不判断"}</h3><p>{display(data.jointState.description)}</p></section>
    </div>
    <section className="panel state-map"><div className="section-title"><div><span>8-STATE REGIME MAP</span><h2>联合状态图例</h2></div><button onClick={()=>selectMarketTab("history")}>查看状态演变 →</button></div><div className="state-map-grid">{data.stateMap.map((s,i)=><article key={i} className={s[4]}><div><span>F {s[0]}</span><span>B {s[1]}</span><span>L {s[2]}</span></div><b>{s[3]}</b>{s[4]==="current"&&<em>当前</em>}{s[4]==="next"&&<em>正在靠近</em>}</article>)}</div></section>
    <div className="market-evidence-grid"><section className="panel driver-risk"><div className="section-title"><div><span>DRIVERS & RISKS</span><h2>主要驱动与主要风险</h2></div></div><div className="driver-columns"><div><h3>支持市场</h3>{data.drivers.map((item,i)=><p key={item.title}><b>{String(i+1).padStart(2,"0")}</b><span>{item.title}</span><em>{display(item.detail)}</em></p>)}</div><div className="risks"><h3>需要警惕</h3>{data.risks.map((item,i)=><p key={item.title}><b>{String(i+1).padStart(2,"0")}</b><span>{item.title}</span><em>{display(item.detail)}</em></p>)}</div></div></section><section className="panel quality-card"><div className="section-title"><div><span>DATA TRUST</span><h2>数据质量</h2></div><span className="quality-grade">{display(data.dataQuality.grade)}</span></div><div className="quality-meter"><i style={{width:data.dataQuality.coverage??"0%"}}/></div><p><span>总覆盖率</span><b>{display(data.dataQuality.coverage)}</b></p><p><span>Point-in-Time</span><b>{display(data.dataQuality.pitStatus)}</b></p><p><span>信息截止</span><b>{display(data.asOf)}</b></p><div className="quality-warning">⚠ {display(data.dataQuality.warning)}</div><button onClick={()=>selectMarketTab("method")}>查看数据口径 →</button></section></div>
    <div className="market-lower-grid"><section className="panel recent-history"><div className="section-title"><div><span>12-MONTH CHANGE</span><h2>近期状态变化</h2></div><button onClick={()=>selectMarketTab("history")}>完整历史 →</button></div>{data.recentHistory.map(x=><div className="history-strip" key={x[0]}><b>{x[0]}</b><span>{x[1]}</span><div><i className={x[3]} style={{width:`${Number(x[2])*10}%`}}/></div><strong>{x[2]}</strong><em>12个月</em></div>)}</section><section className="panel regime-events"><div className="section-title"><div><span>KEY EVENTS</span><h2>近期关键事件</h2></div><button onClick={()=>selectMarketTab("history")}>完整时间轴 →</button></div>{data.recentEvents.map(event=><article key={event.date}><time>{event.date}</time><div><b>{event.title}</b><p>{event.detail}</p></div><span className={`tag ${event.tone}`}>{event.group}</span></article>)}</section></div>
    </>}
    {marketTab==="history"&&<MarketHistory onEpisode={()=>selectMarketTab("episodes")}/>}
    {marketTab==="episodes"&&<MarketEpisodes/>}
    {marketTab==="method"&&<MarketMethod indicators={indicators}/>}
  </>;
}

function MarketHistory({onEpisode}:{onEpisode:()=>void}) {
  const [series,setSeries]=useState<Record<string,boolean>>({index:true,F:true,L:true,B:true});
  const toggle=(key:string)=>setSeries(prev=>({...prev,[key]:!prev[key]}));
  return <div className="market-subpage">
    <div className="subpage-head"><div><span>MONTHLY POINT-IN-TIME VIEW</span><h2>历史诊断</h2><p>按当时已经发布的数据重建月度状态，用来解释机制，不追求预测某一个顶部日期。</p></div><span className="tag gray">示例曲线 · 2005—2026</span></div>
    <section className="panel historical-chart-panel"><div className="section-title"><div><span>REGIME HISTORY</span><h2>沪深300与三表状态</h2></div><div className="series-switch">{[["index","沪深300"],["F","长牛底座 F"],["L","货币信用 L"],["B","泡沫温度 B"]].map(x=><button key={x[0]} className={series[x[0]]?`on s-${x[0]}`:""} onClick={()=>toggle(x[0])}><i/>{x[1]}</button>)}</div></div>
      <div className="historical-chart"><div className="history-y"><span>10</span><span>8</span><span>6</span><span>4</span><span>2</span><span>0</span></div><svg viewBox="0 0 1000 310" preserveAspectRatio="none" aria-label="示例历史状态曲线"><g className="history-bands"><rect x="0" y="0" width="1000" height="62"/><rect x="0" y="62" width="1000" height="62"/><rect x="0" y="124" width="1000" height="62"/><rect x="0" y="186" width="1000" height="62"/><rect x="0" y="248" width="1000" height="62"/></g>{series.index&&<path className="history-line index" d="M0 238 C55 220 80 90 130 42 S190 270 240 235 S300 88 350 70 S410 250 455 230 S525 110 575 74 S635 160 680 205 S745 95 800 64 S870 210 910 150 S960 80 1000 105"/>}{series.F&&<path className="history-line f" d="M0 160 C70 120 100 75 150 80 S230 170 280 155 S360 130 420 160 S510 105 570 92 S660 118 720 84 S810 120 860 105 S930 72 1000 76"/>}{series.L&&<path className="history-line l" d="M0 190 C70 110 120 78 175 200 S250 65 310 82 S390 220 450 225 S520 105 580 125 S650 205 710 210 S790 120 850 150 S920 85 1000 98"/>}{series.B&&<path className="history-line b" d="M0 250 C60 245 100 60 155 22 S220 275 280 240 S340 80 385 26 S450 260 510 235 S580 115 640 52 S715 260 780 240 S850 180 900 125 S960 100 1000 120"/>}<g className="event-lines"><line x1="155" x2="155" y1="0" y2="310"/><line x1="385" x2="385" y1="0" y2="310"/><line x1="640" x2="640" y1="0" y2="310"/><line x1="780" x2="780" y1="0" y2="310"/></g></svg><div className="history-x"><span>2005</span><span>2007</span><span>2009</span><span>2015</span><span>2018</span><span>2021</span><span>2024</span><span>2026</span></div><div className="event-labels"><span style={{left:"13%"}}>6124</span><span style={{left:"37%"}}>杠杆顶</span><span style={{left:"62%"}}>核心资产</span><span style={{left:"76%"}}>信用收缩</span></div></div>
      <div className="history-state-band"><span className="gold">黄金环境</span><span className="danger">泡沫顶</span><span className="policy">政策牛</span><span className="danger">投机牛</span><span className="weak">信用熊</span><span className="warm">好公司泡沫</span><span className="adjust">长牛调整</span></div>
    </section>
    <div className="validation-grid"><section className="panel"><span>FOUNDATION TARGET</span><h3>长周期验证</h3><b>36M / 60M</b><p>验证F高时未来3—5年权益回报和盈利增长是否更好。</p></section><section className="panel"><span>BUBBLE TARGET</span><h3>回撤预警</h3><b>Crash12 ≤ -20%</b><p>验证B≥8时未来12—24个月的大回撤概率是否抬升。</p></section><section className="panel"><span>LIQUIDITY TARGET</span><h3>短中期领先</h3><b>3M / 6M / 12M</b><p>验证信用改善能否领先股票表现和企业盈利变化。</p></section></div>
    <section className="panel episode-shortcuts"><div className="section-title"><div><span>EPISODE SHORTCUTS</span><h2>关键时期</h2></div><button onClick={onEpisode}>进入完整审计 →</button></div><div>{["2005–07 长牛启动与泡沫","2009 强刺激反弹","2014–15 杠杆泡沫","2018 信用熊市","2019–21 好公司泡沫","2024–当前 新周期"].map((x,i)=><button key={x} onClick={onEpisode}><span>0{i+1}</span>{x}<i>→</i></button>)}</div></section>
  </div>;
}

function MarketEpisodes() {
  const [selected,setSelected]=useState(0);
  const e=marketEpisodes[selected];
  return <div className="market-subpage"><div className="subpage-head"><div><span>HISTORICAL EPISODE AUDIT</span><h2>关键时期审计</h2><p>逐段检查三表是否解释了正确的市场机制，而不是只看一条漂亮的收益曲线。</p></div><span className="tag gray">8个必测窗口</span></div><div className="episode-layout"><aside className="panel episode-list">{marketEpisodes.map((x,i)=><button className={selected===i?"active":""} key={x.period} onClick={()=>setSelected(i)}><span>{String(i+1).padStart(2,"0")}</span><div><b>{x.period}</b><small>{x.title}</small></div><i>›</i></button>)}</aside><section className="panel episode-detail"><div className="episode-title"><div><span>EPISODE {String(selected+1).padStart(2,"0")}</span><h2>{e.title}</h2><p>{e.period}</p></div><span className={`episode-status ${e.tone}`}>{e.state}</span></div><div className="episode-score-row"><div><small>长牛底座 F</small><b>{selected===3?"4.6":selected===5?"8.1":selected===7?"7.6":"6.2"}</b><div className="bar"><i style={{width:selected===3?"46%":selected===5?"81%":"68%"}}/></div></div><div><small>货币信用 L</small><b>{selected===2?"9.1":selected===4?"2.8":"5.7"}</b><div className="bar blue"><i style={{width:selected===2?"91%":selected===4?"28%":"57%"}}/></div></div><div><small>泡沫温度 B</small><b>{[0,3,5].includes(selected)?"9.3":"4.1"}</b><div className="bar gold"><i style={{width:[0,3,5].includes(selected)?"93%":"41%"}}/></div></div></div><div className="episode-chart"><div className="episode-mountain"><i/><i/><i/><i/><i/><i/><i/><i/><i/><i/><i/><i/></div><span>窗口开始</span><span>关键拐点</span><span>窗口结束</span></div><div className="episode-findings"><article><span>核心解释</span><p>{e.finding}</p></article><article><span>验收条件</span><p>{e.pass}</p></article></div><div className="static-warning">当前为界面示意：分数与曲线不是历史回测结果。真实结论必须由Point-in-Time数据生成。</div></section></div></div>;
}

function MarketMethod({indicators}:{indicators:Record<MarketCardCode,RegimeIndicator[]>}) {
  const allIndicators=Object.values(indicators).flat();
  const generatedCount=allIndicators.filter(item=>item.dataStatus==="generated").length;
  return <div className="market-subpage"><div className="subpage-head"><div><span>METHODOLOGY & DATA</span><h2>方法与数据</h2><p>公开说明系统如何得出结论、何时知道数据，以及哪些部分仍然存在限制。</p></div><span className="tag blue">可解释优先</span></div>
    <div className="metaphor-grid"><article className="panel"><span>F · FOUNDATION</span><div className="metaphor-icon">发动机</div><h3>长牛底座</h3><p>盈利、资本回报和长期资金决定市场能不能跑得远。</p><b>0–10 · 越高越好</b></article><article className="panel"><span>L · LIQUIDITY</span><div className="metaphor-icon blue">汽油</div><h3>货币信用</h3><p>实际利率、货币活化和信用脉冲决定近期有没有动力。</p><b>0–10 · 越高越支持</b></article><article className="panel"><span>B · BUBBLE</span><div className="metaphor-icon gold">转速表</div><h3>估值泡沫</h3><p>估值、杠杆和投机热度决定是否已经接近红线。</p><b>0–10 · 越高越危险</b></article></div>
    <section className="panel dictionary"><div className="section-title"><div><span>INDICATOR DICTIONARY</span><h2>14项量化指标</h2></div><span className="tag gray">真实生成 {generatedCount}/{allIndicators.length}</span></div>{(["F","L","B"] as MarketCardCode[]).map(group=><div className="dictionary-group" key={group}><h3>{group==="F"?"长牛底座 Foundation":group==="L"?"货币信用 Liquidity":"估值泡沫 Bubble"}</h3>{indicators[group].map(x=><article key={x.id}><span>{x.id}</span><div><b>{x.name}</b><p>{display(x.note)}</p></div><div><small>当前原始值</small><strong>{display(x.raw)}</strong></div><div><small>数据期 / 发布</small><strong>{display(x.period)} · {display(x.release)}</strong></div><div><small>覆盖 / 质量</small><strong>{display(x.coverage)} · {display(x.quality)}</strong></div></article>)}</div>)}</section>
    <div className="method-bottom"><section className="panel pit-card"><div className="section-title"><div><span>POINT-IN-TIME</span><h2>当时知道什么，就只能用什么</h2></div><span className="regime-state healthy">核心纪律</span></div><div className="pit-flow"><div><b>PERIOD DATE</b><span>数据所属期间</span><strong>2026-06-30</strong></div><i>→</i><div><b>RELEASE DATE</b><span>市场实际获知</span><strong>2026-07-15</strong></div><i>→</i><div><b>AS OF QUERY</b><span>回测可使用</span><strong>release ≤ as_of</strong></div></div><ul><li>财报按公告日期生效，不按报告期提前使用。</li><li>宏观数据按发布日期生效，并保留历史修订状态。</li><li>M1新旧口径分版本标准化，不强行拼接。</li><li>历史股票池包含当时已上市及后来退市公司。</li></ul></section><section className="panel limitations"><div className="section-title"><div><span>KNOWN LIMITATIONS</span><h2>已知限制</h2></div></div><p><b>长期资金</b><span>早期历史覆盖不足，允许partial并重分配权重。</span></p><p><b>市值/GDP</b><span>受证券化率变化影响，只使用滚动历史分位。</span></p><p><b>Policy Overlay</b><span>保持定性，不参加第一阶段历史拟合。</span></p><p><b>样本数量</b><span>约260个月，不在第一版使用机器学习。</span></p></section></div>
  </div>;
}

function Themes() {
 const themes=[{name:"AI 算力",score:82,stage:"加速期",change:"+6",color:"red",logic:"海外算力资本开支上修，国产光模块与液冷环节景气共振。",tags:["光模块","液冷","PCB"],risk:"交易拥挤度偏高"},{name:"创新药出海",score:76,stage:"成长期",change:"+3",color:"blue",logic:"BD 交易进入密集验证期，国内研发资产获得全球定价。",tags:["ADC","双抗","CXO"],risk:"临床数据不及预期"},{name:"稀土永磁",score:71,stage:"扩散期",change:"+11",color:"gold",logic:"供给约束推升价格，机器人需求带来中长期增量。",tags:["稀土","磁材","机器人"],risk:"商品价格快速回落"},{name:"高股息电力",score:64,stage:"分化期",change:"-2",color:"green",logic:"现金流稳定，电价机制改善，具备低波动底仓价值。",tags:["水电","核电","火电"],risk:"利率快速上行"}];
 return <><PageHeader eyebrow="THEMATIC RESEARCH" title="主线研究" desc="把零散热点组织成可追踪、可验证、可证伪的投资主线。"><button className="btn ghost">主线看板</button><button className="btn primary">＋ 创建主线</button></PageHeader><div className="tabs"><b>全部主线 12</b><span>重点跟踪 5</span><span>潜在线索 9</span><span>已证伪 3</span></div>
 <div className="theme-cards">{themes.map((t,i)=><article className="theme-card" key={t.name}><div className="theme-top"><span className={`theme-no ${t.color}`}>0{i+1}</span><div><h2>{t.name}</h2><p>最后更新：今天 {9+i}:2{i}</p></div><div className="score"><b>{t.score}</b><span>主线强度</span></div></div><div className="theme-stage"><span className={`tag ${t.color}`}>{t.stage}</span><em className={t.change.startsWith("+")?"up":"down"}>强度 {t.change}</em></div><p className="theme-logic">{t.logic}</p><div className="theme-chain"><small>产业链映射</small><div>{t.tags.map(x=><span key={x}>{x}</span>)}</div></div><div className="theme-foot"><span>⚑ 风险：{t.risk}</span><button>查看研究档案 →</button></div></article>)}</div>
 <section className="panel evidence"><div className="section-title"><div><span>THEME PIPELINE</span><h2>主线形成漏斗</h2></div><button>管理线索库 →</button></div><div className="pipeline">{[["市场线索","28","本周 +7"],["逻辑验证","12","通过率 43%"],["重点跟踪","5","组合覆盖 4"],["交易表达","8","ETF 3 / 个股 5"]].map((x,i)=><div key={x[0]}><span>0{i+1}</span><b>{x[1]}</b><strong>{x[0]}</strong><small>{x[2]}</small></div>)}</div></section>
 </>;
}

function ETF() {
 const rows=[["588000","科创50ETF","1.184","+0.94%","688.4亿","0.50%","68","AI算力"],["513180","恒生科技ETF","0.823","+1.72%","286.1亿","0.20%","74","港股科技"],["159915","创业板ETF","2.146","-0.18%","412.7亿","0.50%","31","成长"],["512010","医药ETF","0.391","+1.31%","182.3亿","0.50%","27","创新药"],["515030","新能源车ETF","1.326","-0.62%","106.9亿","0.50%","22","新能源"]];
 return <><PageHeader eyebrow="ETF LAB" title="ETF 研究" desc="从赛道、估值、流动性与跟踪质量，筛选最合适的交易表达。"><button className="btn ghost">自选对比 3</button><button className="btn primary">＋ 添加 ETF</button></PageHeader>
 <div className="etf-hero"><div><span>ETF UNIVERSE</span><h2>全市场 ETF 筛选器</h2><p>1,128 只基金 · 数据更新于 15:10</p></div><div className="search">⌕ <span>搜索代码、名称或主题</span><kbd>⌘ K</kbd></div></div>
 <div className="filter-row"><button className="active">全部品种</button><button>宽基</button><button>行业</button><button>主题</button><button>跨境</button><button>商品</button><span/><button>筛选条件 3</button></div>
 <section className="panel table-panel"><table><thead><tr><th>ETF</th><th>最新价</th><th>日涨跌</th><th>规模</th><th>管理费</th><th>估值分位</th><th>核心标签</th><th></th></tr></thead><tbody>{rows.map(r=><tr key={r[0]}><td><div className="fund"><span>{r[1].slice(0,1)}</span><div><b>{r[1]}</b><small>{r[0]}</small></div></div></td><td><b>{r[2]}</b></td><td className={r[3].startsWith("+")?"up":"down"}>{r[3]}</td><td>{r[4]}</td><td>{r[5]}</td><td><div className="percentile"><i style={{width:r[6]+"%"}}/><span>{r[6]}%</span></div></td><td><span className="tag gray">{r[7]}</span></td><td>•••</td></tr>)}</tbody></table></section>
 <div className="etf-bottom"><section className="panel"><div className="section-title"><div><span>SMART COMPARE</span><h2>ETF 对比卡</h2></div><button>打开完整对比 →</button></div><div className="compare"><div><span>综合评分</span><b>81</b><strong>恒生科技ETF</strong><small>弹性最优</small></div><div><span>综合评分</span><b>77</b><strong>科创50ETF</strong><small>流动性最优</small></div><div><span>综合评分</span><b>73</b><strong>医药ETF</strong><small>估值最优</small></div></div></section><section className="panel note"><span>RESEARCH NOTE</span><h2>本周 ETF 观察</h2><p>资金从宽基向科技与医药主题集中，跨境 ETF 溢价率整体回落。恒生科技和科创50成交活跃，但短期波动率同步抬升。</p><button>阅读完整周报 →</button></section></div>
 </>;
}

function Stocks() {
 const stocks=[["300308","中际旭创","168.42","+2.84%","92","持有"],["688041","海光信息","146.20","+1.16%","85","观察"],["600519","贵州茅台","1,458.00","-0.38%","78","持有"],["603259","药明康德","71.36","+3.21%","74","观察"],["002371","北方华创","338.75","-0.64%","69","等待"]];
 return <><PageHeader eyebrow="EQUITY RESEARCH" title="个股研究" desc="用一页研究档案连接商业模式、核心假设、估值与跟踪信号。"><button className="btn ghost">导入自选股</button><button className="btn primary">＋ 新建个股档案</button></PageHeader>
 <div className="stock-layout"><section className="panel watchlist"><div className="section-title"><div><span>WATCHLIST</span><h2>核心观察池</h2></div><button>共 24 只⌄</button></div>{stocks.map((s,i)=><article key={s[0]} className={i===0?"selected":""}><div className="avatar">{s[1][0]}</div><div><b>{s[1]}</b><small>{s[0]}</small></div><strong>{s[2]}<small className={s[3].startsWith("+")?"up":"down"}>{s[3]}</small></strong><div className="stock-score"><b>{s[4]}</b><small>评分</small></div><span className="tag gray">{s[5]}</span></article>)}</section>
 <section className="stock-detail"><div className="stock-title"><div className="avatar big">中</div><div><span>300308 · 深交所</span><h2>中际旭创</h2><p>通信设备 · 光模块</p></div><div className="quote"><b>168.42</b><span className="up">+4.65 +2.84%</span></div><button>☆ 已关注</button></div>
 <div className="thesis-grid"><article className="panel thesis"><span>INVESTMENT THESIS</span><h2>一句话投资逻辑</h2><p>全球 AI 算力基础设施投入持续扩张，公司凭借 800G/1.6T 产品与海外头部客户优势，进入业绩与估值双升阶段。</p><div><span className="tag red">AI 算力</span><span className="tag gray">光模块龙头</span><span className="tag gray">业绩上修</span></div></article><article className="panel score-card"><span>研究评分</span><b>92</b><div className="bar"><i style={{width:"92%"}}/></div><p>商业模式 <strong>90</strong></p><p>景气趋势 <strong>96</strong></p><p>估值性价比 <strong>76</strong></p></article></div>
 <div className="detail-grid"><section className="panel hypothesis"><div className="section-title"><h2>核心假设与验证</h2><button>编辑 →</button></div>{[["海外云厂商资本开支维持高增","已验证","Q2 财报集体上修 CapEx"],["1.6T 产品如期放量","验证中","关注三季度出货节奏"],["毛利率保持稳定","已验证","连续两季环比改善"]].map((x,i)=><div key={x[0]}><span className={i===1?"dot":"dot high"}/><div><b>{x[0]}</b><small>{x[2]}</small></div><em>{x[1]}</em></div>)}</section><section className="panel valuation"><div className="section-title"><h2>估值快照</h2><span>2026E</span></div><div><b>26.8x</b><span>预测 PE</span></div><div><b>18.4%</b><span>ROE</span></div><div><b>32.6%</b><span>净利增速</span></div><p>当前 PE 位于近 5 年 <strong>61%</strong> 分位</p></section></div>
 </section></div></>;
}

function Portfolio() {
 const positions=[["科创50ETF","588000","24.2%","+16.8%","+1,842"],["恒生科技ETF","513180","20.8%","+12.4%","+2,126"],["中际旭创","300308","18.3%","+38.6%","+4,218"],["医药ETF","512010","14.6%","+8.1%","+1,036"],["贵州茅台","600519","10.4%","-3.2%","-486"],["现金","CASH","11.7%","—","—"]];
 return <><PageHeader eyebrow="SHADOW PORTFOLIO" title="影子账户" desc="把研究判断放进模拟组合，用净值、归因和复盘检验投资系统。"><button className="btn ghost">交易记录</button><button className="btn primary">＋ 模拟交易</button></PageHeader>
 <div className="account-summary"><div><span>总资产</span><b>¥ 1,286,430.18</b><small>初始资金 ¥1,000,000</small></div><div><span>累计收益</span><b className="up">+28.64%</b><small>沪深300同期 +11.26%</small></div><div><span>今日收益</span><b className="up">+¥ 8,420.35</b><small>+0.66%</small></div><div><span>最大回撤</span><b className="down">-8.42%</b><small>2026/04/08 — 04/21</small></div></div>
 <div className="portfolio-layout"><section className="panel equity-curve"><div className="section-title"><div><span>PERFORMANCE</span><h2>组合净值</h2></div><div className="legend"><span><i/>本组合</span><span><i/>沪深300</span></div></div><div className="chart-area tall"><svg viewBox="0 0 700 230" preserveAspectRatio="none"><path className="benchmark" d="M0 190 C80 185,100 160,170 170 S260 142,320 155 S420 120,480 130 S570 105,700 92"/><path className="line" d="M0 190 C60 175,110 160,150 168 S240 125,285 138 S365 100,405 108 S475 64,520 78 S610 42,700 25"/></svg><div className="xlabels"><span>2026/01</span><span>03</span><span>05</span><span>07</span><span>08/06</span></div></div><div className="performance-stats"><div><b>1.29</b><span>最新净值</span></div><div><b>1.84</b><span>夏普比率</span></div><div><b>22.6%</b><span>年化波动</span></div><div><b>71.4%</b><span>胜率</span></div></div></section>
 <section className="panel allocation"><div className="section-title"><div><span>ALLOCATION</span><h2>资产配置</h2></div><button>目标仓位 →</button></div><div className="donut"><div><b>88.3%</b><span>已投资</span></div></div><div className="alloc-list"><p><i style={{background:"#d5574b"}}/><span>ETF</span><b>59.6%</b></p><p><i style={{background:"#405e91"}}/><span>个股</span><b>28.7%</b></p><p><i style={{background:"#d0b078"}}/><span>现金</span><b>11.7%</b></p></div><div className="risk-budget"><span>风险预算使用</span><b>72 / 100</b><div className="bar"><i style={{width:"72%"}}/></div></div></section></div>
 <section className="panel table-panel positions"><div className="section-title"><div><span>POSITIONS</span><h2>当前持仓</h2></div><button>按收益贡献⌄</button></div><table><thead><tr><th>标的</th><th>代码</th><th>仓位</th><th>持仓收益</th><th>今日贡献</th><th>研究状态</th></tr></thead><tbody>{positions.map((p,i)=><tr key={p[1]}><td><b>{p[0]}</b></td><td>{p[1]}</td><td><div className="position-bar"><i style={{width:p[2]}}/>{p[2]}</div></td><td className={p[3].startsWith("+")?"up":p[3].startsWith("-")?"down":""}>{p[3]}</td><td className={p[4].startsWith("+")?"up":p[4].startsWith("-")?"down":""}>{p[4]}</td><td><span className="tag gray">{i===5?"—":i===4?"待复核":"逻辑有效"}</span></td></tr>)}</tbody></table></section>
 </>;
}

function Library() {
 const docs=[["晨会纪要：稀土价格与磁材扩散","会议纪要","今天 09:18","稀土永磁"],["中际旭创 2026Q2 跟踪模型","模型","昨天 22:40","AI 算力"],["创新药出海：BD 交易数据库","数据集","08/04 17:20","创新药"],["宏观周报：流动性仍是主要支撑","周报","08/03 20:15","市场研究"],["恒生科技 ETF 横向对比","ETF 档案","08/02 14:30","港股科技"],["投资系统复盘清单 v2.1","方法论","07/29 11:06","系统建设"]];
 return <><PageHeader eyebrow="RESEARCH LIBRARY" title="研究资料库" desc="所有证据、笔记、模型和结论都有出处，也都有下一次复核时间。"><button className="btn ghost">批量导入</button><button className="btn primary">＋ 新建笔记</button></PageHeader>
 <div className="library-toolbar"><div className="search large">⌕ <span>搜索研究笔记、公司、主题或标签</span><kbd>⌘ K</kbd></div><button>筛选</button><button>最近更新⌄</button></div>
 <div className="library-layout"><aside className="panel folders"><h3>资料空间</h3><b>▣ 全部资料 <span>248</span></b><p>○ 收件箱 <span>12</span></p><p>☆ 我的收藏 <span>36</span></p><h3>研究分类</h3><p>□ 市场与宏观 <span>42</span></p><p>□ 主线研究 <span>68</span></p><p>□ ETF 档案 <span>51</span></p><p>□ 个股档案 <span>73</span></p><p>□ 方法与复盘 <span>14</span></p><h3>数据来源</h3><small>● Tushare ● QMT</small><small>● BaoStock ● FRED / 网络</small></aside>
 <section className="documents"><div className="doc-summary"><div><span>全部资料</span><b>248</b><small>本周新增 17</small></div><div><span>待复核</span><b>9</b><small>3 条已逾期</small></div><div><span>已关联结论</span><b>186</b><small>覆盖率 75%</small></div></div><div className="panel document-list"><div className="section-title"><h2>最近更新</h2><div className="view-switch">▦ ☷</div></div>{docs.map((d,i)=><article key={d[0]}><div className={`doc-icon d${i%4}`}>{["会","模","数","报"][i%4]}</div><div><b>{d[0]}</b><p><span className="tag gray">{d[1]}</span><span>{d[2]}</span><span>关联：{d[3]}</span></p></div><span>☆ •••</span></article>)}</div></section></div>
 </>;
}

export default function Home() {
 const [view,setView]=useState<View>("overview");
 const titles:Record<View,string>={overview:"总览",market:"市场研究",themes:"主线研究",etf:"ETF 研究",stocks:"个股研究",portfolio:"影子账户",library:"研究资料库"};
 return <div className="app"><header className="sidebar"><div className="brand"><div className="brand-mark">M</div><div><b>MY<span>INVEST</span></b><small>投资研究系统</small></div></div><nav>{nav.map(n=><button key={n.id} className={view===n.id?"active":""} onClick={()=>setView(n.id)} title={n.label}><i>{n.icon}</i><span>{n.label}</span>{n.id==="library"&&<em>12</em>}</button>)}</nav><div className="sidebar-foot"><div className="source-status"><span/><div><b>数据源正常</b><small>示例数据</small></div></div><button className="user"><div>KP</div><span><b>Kunpeng</b><small>个人工作区</small></span></button></div></header>
 <main><header className="topbar"><div><span>MY INVEST</span><i>/</i><b>{titles[view]}</b></div><div><button>⌕</button><button className="notification">♢<i/></button><div className="market-open"><span/> A股已收盘</div></div></header><div className="content">{view==="overview"&&<Overview go={setView}/>} {view==="market"&&<Market/>} {view==="themes"&&<Themes/>} {view==="etf"&&<ETF/>} {view==="stocks"&&<Stocks/>} {view==="portfolio"&&<Portfolio/>} {view==="library"&&<Library/>}</div><footer>MY INVEST · 投资研究系统原型 <span>数据仅为界面演示，不构成投资建议</span></footer></main></div>;
}
