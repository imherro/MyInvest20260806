# 市场研究 current.json 数据契约

`public/data/market-research/current.json` 是市场研究当前状态的唯一数据源。页面请求该文件，不回退到TypeScript Mock。

## Schema v3

- `schemaVersion` 固定为 `3`。
- `asOf`：信息截止日，按自然日日终（EOD）理解；不支持日内PIT。
- 指标 `period`：数据所属期；L1为最近已发布SHIBOR日期，B3、B5为同一个共同交易日，L2、L3为同一个统计月份。
- 指标 `release`：公开发布日期/可用日期。
- `generatedAt`：文件生成时间，不能代替指标数据时间。
- `source.providers`：当前为 `Tushare Pro`、`中国人民银行`。
- `source.apis`：当前为 `index_dailybasic`、`cn_m`、`shibor`、`sf_month`；PBOC为HTML发布证据，不伪装成API。
- `source.releaseEvidence.L2`：保存PBOC栏目URL、实际报告标题、文章URL和完整发布时间。L2/L3本轮共用同一份金融统计报告及其发布日期；暂不为了一个共享URL重构schema。
- `dataStatus`：`generated`为真实生成，`pending`为尚未接入；`manual_sample`仅保留类型枚举。
- 暂无值使用JSON `null`，界面统一显示 `—`。

当前5/14项为真实数据：L1、L2、L3、B3、B5；其余9项为 `pending`。L1的 `period/release` 为最近已发布SHIBOR日期，只代表名义资金利率期限结构，不代表完整实际利率。L3与L2共享同一PBOC金融统计报告的 `period/release` 证据，只代表社会融资信用规模代理，不是完整信用脉冲。B5复用B3的同一份两指数 `index_dailybasic` 快照和同一个 `trade_date`，只输出交易活跃度代理，不输出投机热度评分。F/L/B一级评分、联合市场判断、投资含义和仓位倾向仍为 `null`，PIT状态仍为“待接入”。

## 生成方式

```powershell
$env:TUSHARE_TOKEN = "你的token"
npm run market:generate -- --as-of 2026-08-17
```

`--as-of`不能晚于本地当天。L1在30个自然日窗口中选择不晚于 `asOf` 的最近唯一SHIBOR记录，当前仅支持EOD，不处理当日11:00前的日内PIT。B3与B5共同选择最近共同交易日，B5不得另选日期或为补齐换手字段回退到更旧日期；L2只从PBOC固定栏目首页选择不晚于`asOf`的最近合格报告。若首页不覆盖所请求的较早日期，则失败关闭；当前不翻历史分页、不使用搜索引擎、不猜文章URL。

生成器先完成B3/B5共享指数快照，抓取一次PBOC正文并解析M1/M2及社融三项，随后完成Tushare `cn_m`的L2双源验证、SHIBOR快照验证，以及Tushare `sf_month`的L3双源验证，再在内存构造Schema v3，通过运行时守卫后原子替换文件。任何失败都不得写入部分结果。
