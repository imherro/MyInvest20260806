# 市场研究历史数据

阶段04A实现B3“PE/PB与估值分化”的月度历史PIT试点；阶段04B从B3确定性派生B1指数盈利收益率历史。产物分别为 `history/b3.json` 与 `history/b1.json`，均与当前状态文件 `current.json` 完全分离。

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
