# 市场研究 current.json 数据契约

`public/data/market-research/current.json` 是市场研究当前状态的唯一数据源。页面请求 `/data/market-research/current.json`，不从 TypeScript Mock 回退。

## Schema v2

- `schemaVersion` 固定为 `2`。
- `source.mode` 固定为 `generated`，并记录 `provider`、`api` 与两只指数代码。
- 每项指标都有 `dataStatus`：`generated` 表示真实生成，`pending` 表示尚未接入；`manual_sample` 只保留为类型枚举，不得用于当前生成结果。
- 暂无值的标量使用 JSON `null`，界面统一显示 `—`；列表无项目时使用空数组。
- HTTP、JSON或结构校验失败时，页面显示“当前市场数据加载失败”，不展示旧值。

## B3 MVP定义

B3“PE/PB与估值分化”使用 Tushare Pro `index_dailybasic`：

- 宽基：沪深300 `000300.SH`。
- 科技成长：创业板指 `399006.SZ`。
- 字段：`trade_date`、`pe_ttm`、`pb`。
- 日期：选择不晚于 `--as-of` 且两只指数均有数据的最近共同交易日。
- 输出：两只指数的 PE TTM 与 PB 截面值。
- 本轮不计算历史分位、趋势和最终B3评分，因此 `position`、`trend`、`score` 均为 `null`。

沪深300是跨沪深市场的稳定宽基代表；`index_dailybasic` 当前支持的科技成长代表中，创业板指具有长期连续序列，因此用于观察结构分化。

## 生成方式

```powershell
$env:TUSHARE_TOKEN = "你的token"
npm run market:generate -- --as-of 2026-08-17
```

Token只从 `process.env.TUSHARE_TOKEN` 读取，不写入代码、日志或JSON。生成器先在内存构造并通过运行时守卫，随后写临时文件并原子替换 `current.json`。失败时退出非零状态。

当前状态为1/14：仅B3是`generated`；其余13项为`pending`，F/L/B聚合分和联合市场判断全部关闭。
