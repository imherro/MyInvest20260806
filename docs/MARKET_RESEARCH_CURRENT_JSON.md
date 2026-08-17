# 市场研究 current.json 数据契约

任务02的唯一当前市场数据源是 `public/data/market-research/current.json`。页面挂载市场研究模块时直接请求 `/data/market-research/current.json`，不再从 TypeScript Mock 读取或在失败时回退旧数据。

## 数据流

`current.json` → 浏览器 `fetch` → 最小结构检查 → 市场研究总览

## 契约规则

- `schemaVersion` 当前固定为 `1`，契约变化时必须显式升级。
- `cards`、`components.F/L/B`、诊断、联合状态、质量信息等页面结构字段必须存在；结构缺失或 HTTP/JSON 失败时，页面显示“当前市场数据加载失败”。
- 暂无值的标量使用 JSON `null`，界面统一显示 `—`；不得用 `0`、空字符串或旧值冒充缺失数据。
- 列表没有项目时使用空数组，不得省略字段。
- 当前文件的 `source.mode` 为 `manual_sample`，代表任务02只验证文件输入闭环，并不表示14项指标已经接入真实数据。
- 页面不内置备用市场数据。因此修改该 JSON 后刷新页面即可看到变化，读取失败也不会静默展示旧结论。

## 任务边界

本任务不接数据库、不采集外部数据、不计算14项指标，也不实现 Point-in-Time 引擎。这些属于后续任务。
