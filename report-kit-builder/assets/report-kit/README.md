# report-kit 报表组件套件

跨项目复用的报表 UI 组件层。配合 `client/src/theme/tokens.css`（设计令牌）与 `theme/charts.ts`（图表色板/echarts 配置）使用，保证任何项目复用后视觉风格基本一致。**注意：组件层不并自包含，拷走后需按 `docs/DEPENDENCIES.md` 补齐外部依赖（ui/ 基础组件、shared 类型、tsconfig 别名等）。**

## 组件清单

| 组件 | 用途 | 关键约定 |
|---|---|---|
| `MonthlyTable` | 月度报表（桌面表格+移动端共用） | 汇总行吸底、跨度行「起~止（N天）」格式、工况标注（getDailyStatus） |
| `MonthlyCards` | 移动端（<768px）日明细卡片列表 | 数字单行不折行、停机天标注 |
| `MonthlyFilters` / `RawDataFilters` | 筛选区 | 全部控件 28px 等高、两行右缘对齐、日期时间等宽居中 |
| `MonthlyPager` | 月份分页 | 选月模式一页显示当月全部天数，不分页截断 |
| `ReadingValueCell` | 示数单元格 | 自定义 tooltip 显示读数时间戳（PC 悬停 / 移动点按），非原生 title |
| `CopPreciseValue` | COP 精确值提示 | 数值保持 1 位小数，hover/点按弹深色气泡显示 3 位小数精确值 |
| `VariableMultiSelect` | 变量多选 | — |
| `SectionCard` | 报告区块卡片 | 报告页统一卡片容器 |
| `MonthChipsBar` | 月份切换条 | — |
| `ChartCanvas` | 图表画布（基于 **chart.js**） | 色值可从 theme/charts.ts 色板取；不吃 echarts 配置 |
| `PaginationBar` | 分页条 | — |
| `EmptyState` | 空数据占位 | 不显示 0（原始数据红线），无数据/未选条件时用 |
| `ErrorState` | 加载失败占位 | 支持重试回调 |

## 复用步骤

1. 拷贝 `client/src/components/report-kit/`、`client/src/theme/`（tokens.css + charts.ts）两目录
2. `index.css` 增加 `@import "./theme/tokens.css";`
3. 按项目需要改 `tokens.css` 的颜色值（所有组件只引用语义令牌，如 `text-rk-ink`）
4. 图表分两种：pages 层 echarts 图表（如 TrendChart）统一 spread `theme/charts.ts` 的 `axisDefaults` / `tooltipDefaults` / `SERIES_COLORS` / `dateTickLabel`；`ChartCanvas` 组件基于 chart.js，只共享色板色值
   （拷贝后先按 `docs/DEPENDENCIES.md` 补齐外部依赖，再验收 tsc）
5. 组件按 props 传入数据，业务计算逻辑（COP 等）不要写进组件——新项目按各自算法在后端算好传入

## 红线（改版不得丢失）

- 图表数据点下方必须有「日期+时间」浅色小字（`dateTickLabel`/`dateTickText`）
- 月度报表汇总行吸底、默认显示、一页全月天数
- 移动端细节 8 条见 `.codem/memory/妙搭界面细节保留清单.md`
