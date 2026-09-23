# DEPENDENCIES.md — report-kit 组件外部依赖清单（新项目必读）

report-kit 12 组件 + theme 拷入新项目后，**不是开箱即编译**，还需按本清单补齐外部依赖。逐项核对：

## 1. 类型文件（本 skill 已随包，直接拷到位）

| skill 内路径 | 拷贝到新项目 | 说明 |
|---|---|---|
| `assets/shared/api.interface.ts` | `<app>/shared/api.interface.ts` | 后端接口类型（DailyRow、CopSummary 等 162 行） |
| `assets/pages-Report/report-types.ts` | `<app>/client/src/pages/Report/report-types.ts` | 组件 props 类型（MonthChip 等，87 行；注意它还 import `@client/src/api/raw-data` 的 `RawWorkshop`，见下） |

## 2. tsconfig 路径别名（必须，否则 @shared/@client 全部报错）

`tsconfig.app.json` 的 `compilerOptions.paths` 需含：

```json
"@client/*": ["client/*"],
"@shared/*": ["shared/*"]
```

## 3. shadcn ui/ 基础组件（skill 不含，从 GitHub 镜像取）

组件引用了以下 6 个：`ui/button`、`ui/calendar`、`ui/checkbox`、`ui/input`、`ui/popover`、`ui/select`。

获取：`git clone https://github.com/vellan-tcn/malawangzi-cop-app`，拷 `client/src/components/ui/` 整目录（多拷无害，shadcn 组件间有互引）。

## 4. 项目 API 层（需新项目自备或从镜像拷改）

- `client/src/api/raw-data.ts`：至少导出 `RawWorkshop` 类型（`'pei' | 'mfg'`，新项目按车间改字面量）
- `client/src/api/index.ts`：数据请求封装（参照镜像，接口按新项目后端改）

## 5. npm 依赖

`chart.js`（ChartCanvas 用）、`echarts`（pages 层趋势图用，二选一按需）、`dayjs`（日期）、`lucide-react`（图标）。均为妙搭 full_stack 模板常见依赖，缺了 `npm install` 补。

## 6. 图表库配套关系（易混淆，2026-09-21 勘误）

- `theme/charts.ts` 的**色板常量**（CHART_PALETTE / SERIES_COLORS / COP_BAR_COLOR / TREND_SERIES_COLORS）通用，两类图表都可用
- `axisDefaults` / `tooltipDefaults` / `dateTickLabel` / `dateTickText` 是 **echarts 配置**，供 pages 层 echarts 图表（如 TrendChart）使用
- `ChartCanvas` 组件基于 **chart.js**，不吃上述 echarts 配置，只共享色值

## 验收

补齐后跑 `npx tsc --noEmit --incremental --project tsconfig.app.json`，无 `@shared` / `@client` / `ui/` 相关报错即通过。
