# 市场研究 current.json 数据契约

`public/data/market-research/current.json` 是市场研究当前状态的唯一数据源。页面请求该文件，不回退到TypeScript Mock。

## Schema v3

- `schemaVersion` 固定为 `3`。
- `asOf`：信息截止日，按自然日日终（EOD）理解；不支持日内PIT。
- 指标 `period`：数据所属期；B3为交易日，L2为统计月份。
- 指标 `release`：公开发布日期/可用日期。
- `generatedAt`：文件生成时间，不能代替指标数据时间。
- `source.providers`：当前为 `Tushare Pro`、`中国人民银行`。
- `source.apis`：当前为 `index_dailybasic`、`cn_m`；PBOC为HTML发布证据，不伪装成API。
- `source.releaseEvidence.L2`：保存PBOC栏目URL、实际报告标题、文章URL和完整发布时间。
- `dataStatus`：`generated`为真实生成，`pending`为尚未接入；`manual_sample`仅保留类型枚举。
- 暂无值使用JSON `null`，界面统一显示 `—`。

当前2/14项为真实数据：L2、B3；其余12项为 `pending`。F/L/B一级评分、联合市场判断、投资含义和仓位倾向仍为 `null`，PIT状态仍为“待接入”。

## 生成方式

```powershell
$env:TUSHARE_TOKEN = "你的token"
npm run market:generate -- --as-of 2026-08-17
```

`--as-of`不能晚于本地当天。B3独立选择最近共同交易日；L2只从PBOC固定栏目首页选择不晚于`asOf`的最近合格报告。若首页不覆盖所请求的较早日期，则失败关闭；03B不翻历史分页、不使用搜索引擎、不猜文章URL。

生成器先完成B3、PBOC证据、PBOC正文M1/M2、Tushare `cn_m`及双源一致性验证，再在内存构造Schema v3，通过运行时守卫后原子替换文件。任何失败都不得写入部分结果。
