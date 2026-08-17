# 市场研究 current.json 数据契约

`public/data/market-research/current.json` 是市场研究当前状态的唯一数据源。页面请求该文件，不回退到TypeScript Mock。

## Schema v4

- `schemaVersion` 固定为 `4`。
- `asOf`：信息截止日，按自然日日终（EOD）理解；不支持日内PIT。
- 指标 `period`：数据所属期；L1为最近已发布SHIBOR日期，L5为严格早于中国EOD信息截止日的最近美国数据日，B3、B5为同一个共同交易日，L2、L3为同一个统计月份。
- 指标 `release`：公开发布日期/可用日期。
- `generatedAt`：文件生成时间，不能代替指标数据时间。
- `source.providers`：当前为 `Tushare Pro`、`中国人民银行`、`中华人民共和国财政部`。
- `source.apis`：当前为 `index_dailybasic`、`cn_m`、`shibor`、`sf_month`、`us_trycr`；PBOC为HTML发布证据，不伪装成API。
- `source.releaseEvidence.L2`：保存PBOC栏目URL、实际报告标题、文章URL和完整发布时间。L2/L3本轮共用同一份金融统计报告及其发布日期；暂不为了一个共享URL重构schema。
- `source.releaseEvidence.L4`：保存财政部统计数据栏目URL、实际财政收支报告标题、文章URL和首页/文章一致的发布日期（`YYYY-MM-DD`）。财政部HTML页面不进入 `source.apis`。
- `dataStatus`：`generated`为真实生成，`pending`为尚未接入；`manual_sample`仅保留类型枚举。
- 暂无值使用JSON `null`，界面统一显示 `—`。

当前8/14项为真实数据：L1、L2、L3、L4、L5、B1、B3、B5；其余6项为 `pending`。B1/B3/B5共享同一 `trade_date` 快照；B1只用原始PE TTM计算指数盈利收益率，没有中国长期无风险利率，因此不是ERP。即使L卡覆盖率达到5/5、B卡达到3/5，F/L/B一级评分、联合市场判断、投资含义和仓位倾向仍为 `null`，PIT状态仍为“待接入”。其他指标的第一阶段代理限制保持不变。

## 生成方式

```powershell
$env:TUSHARE_TOKEN = "你的token"
npm run market:generate -- --as-of 2026-08-17
```

`--as-of`不能晚于本地当天。L1在30个自然日窗口中选择不晚于 `asOf` 的最近唯一SHIBOR记录，当前仅支持EOD，不处理当日11:00前的日内PIT。B3与B5共同选择最近共同交易日。L2和L4分别只从PBOC、财政部固定栏目首页选择不晚于`asOf`的最近合格报告；首页不覆盖较早日期时失败关闭，不翻历史分页、不使用搜索引擎、不猜文章URL。

生成器完成所有Tushare及PBOC链路后，从财政部固定首页选择并验证L4报告和财政数值，再在内存构造Schema v4，通过运行时守卫后原子替换文件。任何失败都不得写入部分结果。
