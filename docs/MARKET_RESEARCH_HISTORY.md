# 市场研究历史数据

阶段04A实现B3“PE/PB与估值分化”的月度历史PIT试点；阶段04B从B3确定性派生B1指数盈利收益率历史；阶段04C严格复用B3日期，接入B5月度交易活跃度历史。产物分别为 `history/b3.json`、`history/b1.json` 与 `history/b5.json`，均与当前状态文件 `current.json` 完全分离。

- 范围从2015-01开始，结束于信息截止日当日或之前最后一个完整自然月。
- 每个 `asOf` 为自然月末；在该月内选择沪深300与创业板指均有数据的最新共同交易日作为 `periodDate`。
- `releaseDate = periodDate`，只表示该交易日收盘后的日粒度EOD可用性，不表示开盘前可用。
- 每点只保存两只指数的原始 `peTtm` 与 `pb`，不保存评分、分位、标准化、信号或市场状态。
- `revisionStatus = not_tracked`：当前没有历史vintage数据库，只约束发布日期/可见性PIT，不保证完整revision-vintage PIT。
- 任一月份缺失共同交易日、选中记录估值非法、重复日期或接口达到3000行上限时，整次生成失败；文件采用同目录临时文件原子替换。

生成命令：

```powershell
node scripts/generate-market-research-history-b3.mjs --as-of 2026-08-17
```

Token仍只从 `TUSHARE_TOKEN` 环境变量读取。

## B1 派生历史

B1历史生成器只读取B3历史文件，不访问网络、不需要Token，逐点计算 `earningsYield = 100 / peTtm`。B1的 `asOf`、`periodDate`、`releaseDate`、`revisionStatus` 和范围均逐字段继承B3；输入PE必须为有限正数。它仍只是指数盈利收益率代理，没有减去中国长期无风险利率，因此不是ERP，也不包含评分、分位或市场判断。

```powershell
node scripts/generate-market-research-history-b1.mjs --as-of 2026-08-17
```

## B5 同日交易活跃度历史

B5历史以B3为唯一月度日期日程表，逐点继承日期、范围与 `revisionStatus`，再用两只指数各一次 `index_dailybasic` 请求精确查询B3已经指定的交易日；指定日期缺失即失败，不回退。每点保存沪深300、创业板指的实际 `turnover_rate`、`turnover_rate_f` 和两者自由流通换手率比值。当前只表示交易活跃度代理，不评分，也不判断投机冷热。

```powershell
node scripts/generate-market-research-history-b5.mjs --as-of 2026-08-17
```

## B2 全市场月度股息率截面历史

阶段04D新增B2月度市值加权TTM股息率代理历史。日期逐点继承B3，每月按B3指定交易日请求一次全A `daily_basic` 截面，并直接复用当前快照的B4总市值校验与B2加权计算逻辑。空 `dv_ttm` 不当作0，而是从有值样本及其市值中排除。当前仍未接入中国长期无风险利率，所以不是完整的“股息率－无风险利率”指标，也不包含评分、分位或状态判断。

```powershell
node scripts/generate-market-research-history-b2.mjs --as-of 2026-08-17
```

## B4 总市值派生历史

阶段04E从B2历史零网络派生B4月度总市值代理历史，逐点继承B2的日期、股票数和 `totalMarketCapWan`，只按 `totalMarketCapWan / 100000000` 换算万亿元并保留完整浮点精度。底层仍只是 `daily_basic` 当日实际返回记录的总市值之和；GDP尚未接入，所以它不是总市值/GDP或巴菲特指标，也不判断市场贵贱或计算评分。

```powershell
node scripts/generate-market-research-history-b4.mjs --as-of 2026-08-17
```

## F3 现金分红股东回报代理历史

阶段04F从B2历史零网络派生F3现金分红股东回报代理历史，日期、样本数量、覆盖率和市值加权TTM股息率全部继承B2，仅将 `weightedDividendYield` 语义映射为 `cashDividendYield`，不做数值变换。当前只覆盖现金分红，不覆盖股票回购、注销式回购及IPO、增发、配股、可转债等股权融资或稀释，因此不是完整的“股东回报 / 股权融资”指标。

```powershell
node scripts/generate-market-research-history-f3.mjs --as-of 2026-08-17
```

## F1 公告日 PIT 盈利趋势历史

阶段04G新增F1月度公告日PIT历史。每个自然月末固定使用当时最新已经结束的报告期，并只纳入 `ann_date <= asOf` 的公司记录；同一季度在不同月末会按各自的信息边界重新计算。若最新报告期截至月末尚无任何公司披露，该月明确标记为 `unavailable`，不退回旧季度。

Tushare财务指标同一公司、同公告日、同报告期可能因后续财务修正返回多个记录。04G请求 `update_flag`；当同键数值冲突且存在唯一可确定的 `update_flag=0` 初始版本时，历史侧使用初始版本，避免在没有修正日期的条件下把已知修正版回填到原公告日。若无法唯一确定初始值，则保留该公司该公告为“已披露但指标缺失”，不参与有效中位数，也不回退使用该公司的更早公告值。当前F1仍只是已披露样本归母净利润同比中位数，不代表完整全A总体利润增长；`revisionStatus=not_tracked` 表示尚未实现修正生效时间和完整财报revision-vintage PIT。

```powershell
node scripts/generate-market-research-history-f1.mjs --as-of 2026-08-17
```

## F2 同样本盈利扩散历史

阶段04H新增F2月度盈利扩散PIT历史。F2重新请求与F1相同的季度财务指标，并直接复用04G的revision规范化和current的 `buildF1Snapshot`，随后要求重建出的F1样本与checked-in F1历史逐点一致，再读取同一有效样本的 `positiveCount` / `positiveShare`。只有 `netprofit_yoy > 0` 计为正增长，0和负增长不计，缺失值不进入分母。当前只代表盈利扩散，不代表完整盈利质量。

```powershell
node scripts/generate-market-research-history-f2.mjs --as-of 2026-08-17
```

## L1 月度 SHIBOR 名义利率历史

阶段04I新增L1月度SHIBOR名义利率代理历史。使用B3月末 `asOf` 作为日程，每个 `asOf` 调用现有 `selectLatestShiborSnapshot` 取得截至该日30天窗口内最新SHIBOR。底层数据按自然年顺序请求，当前2015—2026共12个年度batch。当前仍只有名义利率期限结构，没有CPI或通胀预期，因此不是完整实际利率指标。

```powershell
node scripts/generate-market-research-history-l1.mjs --as-of 2026-08-17
```
