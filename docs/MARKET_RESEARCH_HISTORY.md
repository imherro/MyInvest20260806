# 市场研究历史数据

阶段04A目前只实现B3“PE/PB与估值分化”的月度历史PIT试点，产物为 `public/data/market-research/history/b3.json`，与当前状态文件 `current.json` 完全分离。

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
