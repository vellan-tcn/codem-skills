# FEATURE_MATRIX.md — 功能面全景矩阵（v1.4.25，复刻验收逐格核对表）

> 用法：复刻交付前逐格核对「真源位置」对应功能在新项目存在且行为一致；本表与代码冲突时以基准代码为真并回报维护方修表。本表手动维护，sync_skill.sh 不删。

## A. 端

| 功能点 | 真源位置 | 复刻要求 |
|---|---|---|
| 桌面浏览器 | 全局 | 默认基准 |
| 移动端 <768px | MonthlyCards 等（SKILL.md 移动端红线 7 条） | 已点名，照红线 |
| 打印页 /print-report | PrintReportPage.tsx + index.css @media print | 已点名，照打印红线 4 条 |
| PDF 导出 | 打印页浏览器另存 PDF | 随打印链路，无独立代码 |
| 微信内置浏览器 | 无 UA 特判（验收用 390×844 微信 UA） | 无需特殊处理 |

## B. 页面 × 区块（section 级交付清单——页面清单的细化，缺一即复刻不完整）

| 路由 | 区块/元素 | 真源位置 |
|---|---|---|
| / | ReportTopbar（车间切换按钮组 pei↔mfg、打印按钮 aria-label、移动端打印只显图标 hidden md:inline） | Report/ReportTopbar.tsx |
| / | CopKpiSection（KPI 区） | Report/CopKpiSection.tsx |
| / | MonthlyCopTrendSection（COP 趋势图，含基线） | Report/MonthlyCopTrendSection.tsx |
| / | CoolElecSection（冷量电量） | Report/CoolElecSection.tsx |
| / | MonthlyTableSection（月度表+吸底汇总） | Report/MonthlyTableSection.tsx |
| / | HistoryQuerySection（历史趋势查询） | Report/HistoryQuerySection.tsx |
| / | OperationAnalysisSection（运行分析） | Report/OperationAnalysisSection.tsx |
| / | DataNotesSection / ProjectInfoSection（说明/项目信息） | Report/ 同名文件 |
| raw-data / mfg-data | RawDataFilters（日期/颗粒度筛选） | report-kit/RawDataFilters.tsx |
| raw-data / mfg-data | VariableMultiSelect（变量多选） | report-kit/VariableMultiSelect.tsx |
| raw-data / mfg-data | PaginationBar（分页） | report-kit/PaginationBar.tsx |
| raw-data / mfg-data | ReadingValueCell（示数+时间戳 tooltip） | report-kit/ReadingValueCell.tsx |
| raw-data / mfg-data | MonthChipsBar / MonthlyCards / MonthlyTable（月度视图三件套） | report-kit/ 同名 |
| print-report | 车间切换（URL query workshop 解析+回写 setSearchParams）、各 section | Report/PrintReportPage.tsx |

## C. 交互状态

| 功能点 | 真源位置 | 复刻要求 |
|---|---|---|
| loading 态 | useReportData.ts / useRawData.ts 的 loading flag + UI | 必保留，禁删 |
| 空态/错误态 | EmptyState / ErrorState | 已点名，照规则 |
| ErrorBoundary | RawDataErrorBoundary.tsx（包裹数据区，「加载异常，请刷新页面重试」文案） | 必保留，文案按允许清单替换 |
| 车间切换 | Topbar 按钮组 + 路由 key（raw-data/mfg-data）+ PrintReportPage URL query | 三处联动，整链保留 |
| 手动刷新 | 用户重新操作触发（无自动轮询） | 如实，勿臆造轮询 |

## D. 生命周期

| 功能点 | 真源实现 | 复刻要求 |
|---|---|---|
| 首次加载 | hooks 拉数 + loading | 照 B/C |
| F5 状态保持 | 无持久化（选中月份/车间刷新后回默认） | 如实复刻默认行为，勿臆造恢复逻辑 |
| 标题守卫 | index.tsx MutationObserver | 已点名 |
| 水印 | index.css | 已点名 |

## E. 环境

| 功能点 | 真源实现 | 复刻要求 |
|---|---|---|
| CDN 缓存 | 验收时 ?v=N 破缓存 | 已点名（渲染验收） |
| 权限/登录态 | 无独立处理（平台托管） | 无需处理 |
| 接口报错 | ErrorState/ErrorBoundary 降级 | 照 C |
| 无障碍 | 个别 aria-label（如打印按钮） | aria-label 随拷贝保留 |

**真源未实现（勿臆造加入）**：自动轮询刷新、F5 状态恢复、键盘全量导航、登录页。
