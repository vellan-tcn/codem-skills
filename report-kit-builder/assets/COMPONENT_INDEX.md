# COMPONENT_INDEX.md — report-kit-builder 组件索引（v1.4.20，MCP 前轻量方案）

> 选组件先查本表，再只读目标文件；禁止逐个翻文件找组件。本表手动维护（增删组件时同步更新），sync_skill.sh 同步不会删它。

## report-kit 通用组件（assets/report-kit/）

| 文件 | 一句话用途 |
|---|---|
| ChartCanvas.tsx | 图表画布容器 |
| CopPreciseValue.tsx | COP 精确值展示 |
| EmptyState.tsx | 空态占位（复刻空态用它，不算新增） |
| ErrorState.tsx | 错误态占位 |
| MonthChipsBar.tsx | 月份选择 chips 条 |
| MonthlyCards.tsx | 移动端月度卡片列表 |
| MonthlyFilters.tsx | 月度筛选器 |
| MonthlyPager.tsx | 月度分页 |
| MonthlyTable.tsx | 月度报表表格（含吸底汇总行） |
| PaginationBar.tsx | 分页栏 |
| RawDataFilters.tsx | 原始数据筛选器 |
| ReadingValueCell.tsx | 示数单元格（含时间戳悬浮提示） |
| SectionCard.tsx | 区块卡片容器 |
| VariableMultiSelect.tsx | 变量多选框 |

## 入口层（assets/app-shell/）

| 文件 | 用途 |
|---|---|
| app.tsx | 路由入口，基准路由：`/`(Report)、`raw-data`、`mfg-data`、`print-report`、`*`(NotFound) |
| Layout.tsx | 深色导航条 + 整屏高度公式 calc(100vh-…)，两者配套修改 |

## 页面模块（assets/pages-Report/）

| 模块 | 说明 |
|---|---|
| CopOverview | COP 概览 section（挂在 Report 内） |
| DataCheck | 数据核对页（基准路由未挂载，可选） |
| ExamplePage | 示例页（可选） |
| HistoryQuery | 趋势图表 section（挂在 Report 内） |
| NotFound | 404 页 |
| RawData | 示数/数据查询页（raw-data/mfg-data 共用，key 区分车间） |
| Report | 月度报表首页（内嵌 HistoryQuery 趋势 + CopOverview 概览 section，不单独挂路由） |

## theme / shared

- `assets/theme/`：设计令牌（颜色/字号/间距），复刻原样使用
- `assets/shared/api.interface.ts`：组件外部类型定义
