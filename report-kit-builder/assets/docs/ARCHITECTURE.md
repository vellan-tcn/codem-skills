# 架构说明（ARCHITECTURE）

> 示例食品厂 COP 运营报告 · 妙搭全栈应用（05_app）
> 本文档描述整套框架的层级结构与依赖关系，供其他项目复用时理解各层职责。

## 技术栈

- 前端：React 19 + Vite + Tailwind v4 + shadcn/ui（Radix）+ echarts / chart.js
- 后端：NestJS 10 + drizzle-orm（妙搭云端数据库）
- 契约层：`shared/api.interface.ts`（前后端共用类型）
- 部署：妙搭 git 仓库 → `+release-create` 发布（见 scripts/ 与 DATA-PIPELINE.md）

## 目录层级

```
05_app/
├── client/src/
│   ├── theme/                  ★ 设计令牌层（复用必拷）
│   │   ├── tokens.css          # rk-* 语义颜色令牌（换项目只改这里）
│   │   └── charts.ts           # echarts 统一配置（色板/轴/tooltip/日期时间戳小字）
│   ├── components/
│   │   ├── ui/                 # shadcn 通用组件（与业务无关，直接复用）
│   │   ├── business-ui/        # 飞书业务组件（选人/部门等）
│   │   └── report-kit/         ★ 报表组件套件（复用必拷）
│   │       ├── index.ts        # 统一出口
│   │       └── README.md       # 组件清单与用法
│   ├── pages/                  # 页面组装层（只做数据接线与布局，不复用）
│   │   ├── RawData/            # 配料车间数据查询（月度报表/示数明细/报表查询）
│   │   ├── Report/             # 运营报告（打印报告页 + 各 Section）
│   │   ├── DataCheck/          # 数据核查
│   │   ├── CopOverview/        # COP 总览
│   │   └── HistoryQuery/       # 历史趋势查询
│   ├── api/                    # 前端 API 客户端（按后端模块一一对应）
│   └── hooks/                  # 通用 hooks（use-mobile 等）
├── server/
│   ├── modules/                # 后端业务模块（controller/service/module 三件套）
│   │   ├── raw-data/           #   月度报表 + 示数明细（merged_daily 表）
│   │   ├── sensor-data/        #   时序原始数据查询
│   │   ├── cop-overview/       #   COP 总览计算
│   │   ├── data-check/         #   数据核查
│   │   └── view/               #   服务端渲染入口
│   ├── common/constants/       # 表名等常量（项目特定，换项目要改）
│   └── database/schema.ts      # drizzle 表定义（`npm run gen:db-schema` 同步）
└── shared/api.interface.ts     # 前后端契约（所有接口类型唯一来源）
```

## 分层原则（新项目务必遵守）

1. **颜色只允许出现在 theme/tokens.css**：组件里写 `text-rk-ink` 等语义类名，禁止裸 hex。
2. **图表只允许经 theme/charts.ts**：色板用 `CHART_PALETTE`/`SERIES_COLORS`，数据点下方日期+时间浅色小字用 `dateTickLabel`/`dateTickText`（红线）。
3. **报表 UI 用 report-kit 组件**，pages 只做组装与数据接线；业务计算不进组件。
4. **计算算法在后端 service**：换项目时改算法只动后端，前端与组件不动。
5. **接口类型只写在 shared/api.interface.ts**，前后端共同 import，避免两处定义漂移。

## 数据流

```
WinCC/有人云原始数据 → 04_pipeline/（Python，本地）
  → merged_daily（妙搭云端表，date/cool_*/elec_*/cop/days/src 字段族）
  → server modules（drizzle 查询 + 算法计算）
  → REST API → client api/ → pages → report-kit 组件渲染
```
