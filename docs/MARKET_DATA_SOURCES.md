# 市场研究真实数据源

当前只记录任务03A已经实际使用的数据源，不预先声明后续13项的数据来源。

## B3 PE/PB与估值分化

- 提供方：Tushare Pro
- HTTP端点：`https://api.tushare.pro`
- API：`index_dailybasic`
- 权限：Tushare官方文档标注至少需要2000积分
- 宽基指数：沪深300 `000300.SH`
- 科技成长指数：创业板指 `399006.SZ`
- 请求字段：`ts_code,trade_date,pe_ttm,pb`
- 官方接口文档：https://tushare.pro/document/2?doc_id=128
- 官方HTTP调用文档：https://www.tushare.pro/document/2?doc_id=130

`as-of`不是简单等于用户输入日期；脚本会在45个自然日窗口内选择两只指数共有的最近有效交易日。任务03A真实运行请求日期为2026-08-17，最终共同交易日为2026-08-14。
