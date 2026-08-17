# 市场研究真实数据源

当前真实接入3/14项：L2、B3、B5。其余11项仍为 `pending`。

## B3 PE/PB与估值分化

- 提供方：Tushare Pro
- 端点：`https://api.tushare.pro`
- API：`index_dailybasic`
- 指数：沪深300 `000300.SH`、创业板指 `399006.SZ`
- 字段：`ts_code,trade_date,pe_ttm,pb,turnover_rate,turnover_rate_f`
- 算法：在45个自然日窗口内，选择不晚于信息截止日且两只指数均有数据的最近共同交易日。

## B5 投机热度——第一阶段交易活跃度代理

- 提供方：Tushare Pro
- API：`index_dailybasic`
- 指数：沪深300 `000300.SH`、创业板指 `399006.SZ`
- 字段：`trade_date,turnover_rate,turnover_rate_f`
- 算法：复用B3的最近共同交易日快照，展示两只指数的换手率、自由流通换手率，以及“创业板指自由流通换手率 / 沪深300自由流通换手率”的描述性比值。

Tushare在 `index_dailybasic` 中将 `turnover_rate` 定义为换手率、`turnover_rate_f` 定义为基于自由流通股本的换手率。目前B5只是两类指数的真实换手率代理，不是完整投机热度指标；未接入全市场涨跌停、市场宽度、成交集中度和历史分位，因此不评分、不判断高温或低温。

## L2 M1/M2货币活化

- 结构化数值：Tushare Pro `cn_m`，字段 `month,m1_yoy,m2_yoy`。
- 发布日期证据：中国人民银行“调查统计司 → 数据解读”固定栏目 `https://www.pbc.gov.cn/diaochatongjisi/116219/116225/index.html`。
- 官方值交叉验证：该栏目直接列出的金融统计数据报告正文。
- 计算：`M1同比 - M2同比`，单位为百分点（pct）。
- 一致性门槛：PBOC正文与Tushare的M1、M2各自差异均不得超过0.05个百分点；否则整次生成失败。

PBOC列表标题只接受明确的普通月、一季度、上半年、前三季度和年度金融统计数据报告。文章URL必须位于固定栏目路径，列表日期必须与文章发布时间的自然日一致。`cn_schedule`实际返回未覆盖`cn_m`，任务03B不再把它作为L2发布日期证据，也不根据数据月猜发布日期。

自2025年1月统计数据起，M1采用修订口径。本轮不拼接新旧历史序列，不建立长期标准化，也不重算历史M1。

## 安全与失败边界

Token只从 `process.env.TUSHARE_TOKEN` 读取，不写入代码、日志或JSON。PBOC或Tushare任一步失败、双源不一致、B3/B5共同快照字段无效、沪深300自由流通换手率不大于零或运行时契约校验失败时，生成器非零退出；正式文件只在全部验证通过后由临时文件原子替换。
