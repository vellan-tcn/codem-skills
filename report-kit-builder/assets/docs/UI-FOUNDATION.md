# UI 基础规范（UI-FOUNDATION）— 所有报告共用单一真相源

> **目的**：让「以后任何新项目报告」造出来的视觉风格完全一致。
> 来源：2026-10 对 4 个真实运营报告项目（示例商业综合体 / 示例三甲医院 / 示例智造园区 / 示例食品厂）的 UI 资产全量提炼，并归并到 report-kit 既有 `rk-*` 令牌与控件一致性规范。
> **红线**：所有通道（React 应用 / 独立 HTML / A4 PDF）只引用本规范的令牌与尺度值，**禁止写裸 hex、裸 px 数值、自造新尺寸**。发现本规范未覆盖的控件，**先回灌本技能再使用**（只增不删）。

---

## 0. 背景：4 个项目曾出现的冲突（必须消灭）

| 维度 | 示例商业综合体（richt） | 示例三甲医院（轻量 SVG） | 示例智造园区（vue 文档） | 示例食品厂（A4 PDF） | **本规范统一值** |
|---|---|---|---|---|---|
| 主蓝 | `#0B2440` 深蓝渐变 | 无主蓝 | `#1f77b4`（错色） | matplotlib 默认 | `rk-brand #1F6FEB` / 深区 `rk-table-head #0B2440` |
| 卡片圆角 | 14px | **10px（错）** | 无卡片 | 无 | **14px（lg）** |
| 分隔线 | `#E6EAF1` | `#E2E8F0`（错） | `#ccc`（错） | — | `rk-line #E6EAF1` |
| 页面底色 | `#F8FAFC` | `#F1F5FB`（错） | 白 | 白 | `rk-bg-faint #F8FAFC` |
| 容器宽 | 1080px | 960px | **860px（错）** | A4 | **1080px**（轻量可 960，禁止再窄） |
| KPI 列宽 | minmax(160px) | minmax(120px) | 无 | 无 | **minmax(160px)** |
| 卡片阴影 | `0 2px 12px /.05` | 无（错） | 无 | 无 | **统一卡片阴影** |

> 任何新报告不得再出现上表「错」列的数值。

---

## 1. 框架定位（4 通道共用一套令牌）

| 通道 | 适用 | 实现方式 |
|---|---|---|
| React 应用 | 交互式多页看板 | Tailwind v4 + `theme/tokens.css` 的 `--color-rk-*` 自动生成 `text-rk-*`/`bg-rk-*`/`border-rk-*` utility |
| 独立 HTML（富） | 图表密集单文件报告 | echarts（CDN）+ 内嵌 `report-base.css`（`assets/styles/report-base.css`） |
| 独立 HTML（轻） | 内网/CDN 受限、零 JS | 纯 SVG/CSS + 内嵌 `report-base.css`（同一套令牌，仅去图表库） |
| A4 PDF | 打印/签字归档 | 打印样式指针见 `PRINT-PATTERNS.md`，颜色仍用 `rk-*` |

**核心原则**：`rk-*` 令牌值是唯一事实。React 用 Tailwind 引用，HTML 用 `report-base.css` 引用，PDF 手抄同值——三处数值必须一致，改色只改 `theme/tokens.css`。

---

## 2. 颜色令牌（Color Tokens）— `rk-*`

> 与 `theme/tokens.css` 完全对齐，**改一处即全局生效**。

| 令牌 | 值 | 语义 | 用途 |
|---|---|---|---|
| `--rk-ink` | `#15263B` | 主文字 | 标题、数值、表头文字 |
| `--rk-ink-soft` | `#64748B` | 次级文字 | 标签、说明、副标题 |
| `--rk-ink-faint` | `#9AA5B5` | 弱化文字 | 占位、时间戳小字 |
| `--rk-line` | `#E6EAF1` | 分隔线/边框 | 卡片边框、表格线、控件边框 |
| `--rk-bg-soft` | `#F2F5F9` | 浅灰背景 | 卡片内衬、斑马纹浅 |
| `--rk-bg-faint` | `#F8FAFC` | 页面底色 | body 背景 |
| `--rk-bg-brand-soft` | `#E9F1FD` | 品牌浅底 | 序号徽标、选中行、高亮卡 |
| `--rk-table-head` | `#0B2440` | 深蓝表头/横幅起点 | 表头底色、深色横幅 |
| `--rk-gradient-deep` | `#123353` | 横幅渐变终点 | hero 渐变 |
| `--rk-gradient-ink` | `#081B31` | 最深墨蓝 | 渐变兜底 |
| `--rk-navy` | `#102D4A` | 表头吸顶底 | sticky 表头 |
| `--rk-brand` | `#1F6FEB` | 品牌主蓝 | 主按钮、查询、选中、链接 |
| `--rk-blue` | `#2F7FE0` | 图表蓝/次级强调 | 图表系列 1、hover 边框 |
| `--rk-teal` | `#12B886` | 能效绿 | 正向指标、渐变图标 |
| `--rk-success` | `#0E9F6E` | 成功/达标 | 达标、正向 delta |
| `--rk-warn` | `#F59F0B` | 警告 | 试机标注、目标胶囊 |
| `--rk-danger` | `#DC2626` | 错误/负向 | 负向 delta、超标 |

**图表色板**（与令牌联动，`theme/charts.ts` 维护）：`rk-blue #2F7FE0` / `rk-teal #12B886` / `rk-warn #F59F0B` / `rk-danger #DC2626` / `rk-brand #1F6FEB` / 紫 `#8B5CF6`。echarts 直接用这些 hex；SVG 同理。

---

## 3. 字体系统（Typography）

### 3.1 字体栈（全站唯一，禁止替换）
```
-apple-system, BlinkMacSystemFont, "PingFang SC", "Microsoft YaHei",
"Segoe UI", "Helvetica Neue", Arial, sans-serif
```
> 纠正：示例智造园区曾用 `'Microsoft YaHei',sans-serif`（缺系统字体回退）、示例三甲医院缺 `Segoe UI`——统一为本栈。等宽数字一律 `font-variant-numeric: tabular-nums`（关键数值加 `white-space: nowrap`）。

### 3.2 字号梯度（Size Scale）— 移动(<768) / 桌面(≥768) 两档
| 角色 | 移动 | 桌面 | 字重 | 用途 |
|---|---|---|---|---|
| display | 22px | 22px | 700 | hero / 报告主标题 |
| h1 | 20px | 20px | 700 | 报告标题（带底部 2px 主蓝分隔线） |
| h2 | 16px | 17px | 600 | 大区块标题 |
| title | 15px | 16px | 500 | 卡片标题（card-head） |
| body | 13px | 14px | 400 | 正文、表格单元格 |
| label | 12px | 12px | 400 | KPI 标签、筛选标签、说明 |
| caption | 11px | 11.5px | 400 | 角标、注脚、表格表头(移动) |

> 控件字号基准：12px(移动)/14px(桌面)；说明/角标 10–11px。禁止出现 10px 以下不可读字号。

---

## 4. 间距尺度（Spacing Scale）— 4px 栅格

> 所有 padding/margin/gap 从下表取，**禁止写任意 px**。

| 令牌 | 值 | 典型用途 |
|---|---|---|
| `--space-1` | 4px | 徽标内边距、紧致间距 |
| `--space-2` | 8px | 小间隙、徽标字 |
| `--space-3` | 12px | KPI 网格 gap、卡片圆角内标准 gap |
| `--space-3.5` | 14px | 卡片垂直内边距 |
| `--space-4` | 16px | 卡片水平内边距、wrap 内边距、区块 margin |
| `--space-4.5` | 18px | card-head 水平内边距（桌面） |
| `--space-5` | 20px | 大区块间距 |
| `--space-6` | 24px | hero 内边距、页面外边距（桌面） |
| `--space-8` | 32px | 段落级留白 |

**常用组合（直接复用）**：
- 卡片内边距：`14px 16px`（移动）→ `16px 18px`（桌面）
- 卡片头内边距：`12px 18px`（移动）→ `16px 18px`（桌面）
- 区块外边距：`14px 0` → 统一 `16px 0`
- KPI 网格：`gap: 12px; margin: 16px 0`
- 页面容器：`padding: 16px`（移动）→ `24px`（桌面）

---

## 5. 圆角尺度（Radius Scale）

| 令牌 | 值 | 用途 |
|---|---|---|
| `--radius-sm` | 8px | 小按钮、输入框、胶囊紧凑态 |
| `--radius-md` | 10px | 筛选/工具容器（紧凑形态） |
| `--radius-lg` | **14px** | **所有内容区块卡片（SectionCard）** |
| `--radius-pill` | 999px | 胶囊按钮、徽标、状态点 |

> **统一纠正**：示例三甲医院曾用 10px 作区块卡片圆角——区块卡片一律 14px（lg）；10px 只留给筛选容器这类「工具」形态，二者刻意区分但各自全站唯一。

---

## 6. 阴影尺度（Shadow Scale）

| 令牌 | 值 | 用途 |
|---|---|---|
| `--shadow-card` | `0 2px 12px rgba(8,27,49,.05)` | 所有内容卡片、KPI 卡 |
| `--shadow-card-hover` | `0 4px 16px rgba(8,27,49,.08)` | 卡片 hover（可选） |
| `--shadow-sm` | `0 1px 3px rgba(30,40,70,.06)` | 移动端卡片列表项 |

> 统一纠正：示例三甲医院/示例智造园区卡片无阴影——区块卡片必须有 `--shadow-card`，否则层级感丢失。

---

## 7. 层级（z-index）

| 层 | 值 | 用途 |
|---|---|---|
| 表格首列锁/吸顶 | 10 / 30 | `sticky left-0` / `sticky top-0` |
| 自定义 tooltip | 30 | hover 提示 |
| 弹窗/注释面板 | 50+ | 必须高于表格 sticky，建议用 Portal |

---

## 8. 布局系统（Layout）

- **容器最大宽度**：报告内容 `max-width: 1080px`，`margin: 0 auto`；轻量通道允许 `960px`（禁止更窄，消灭示例智造园区 860px）。
- **断点**：全站只用一个 `md = 768px`。移动与桌面是同一规格的两档，不是两套设计。
- **栅格（KPI 流）**：`display: grid; grid-template-columns: repeat(auto-fit, minmax(160px, 1fr)); gap: 12px`（统一 minmax 160，消灭示例三甲医院 120px）。
- **区块堆叠**：卡片纵向 `margin: 16px 0`；KPI 区 `margin: 16px 0`。
- **页面底色**：`body { background: var(--rk-bg-faint) }`（统一，消灭示例三甲医院 #F1F5FB）。

---

## 9. 组件规范（Component Specs）

> 控件级量化规格见 `UI-CONSISTENCY.md`（React 通道权威）。此处给 HTML 通道的对应纯 CSS 类（见 `report-base.css`），二者数值必须一致。

### 9.1 按钮（Button）
- 普通/次要：`h-8`（32px）`rounded-md` `border-rk-line` `bg-white` `text-xs→text-sm`
- 主按钮（查询/确认）：`h-[32px]` 固定高，移动 `px-3 text-xs` / 桌面 `px-5 text-sm`，`bg-rk-brand text-white`
- 胶囊（月份/口径快选）：`rounded-full` `min-h-[32px]`，选中 `bg-rk-table-head text-white`，未选 `bg-white text-rk-ink border-rk-line`
- 口径/模式切换：两按钮**宽高完全固定**（如 `w-36 min-h-[32px]`），仅激活态变色，杜绝切换抖动

### 9.2 卡片（Card / SectionCard）
```
bg-white border border-rk-line rounded-[14px] shadow-card overflow-hidden
head: flex items-center gap-10px padding 12px/16px→18px border-bottom
  no-badge: 26×26 rounded-full bg-rk-bg-brand-soft text-rk-brand 12px/700
  title: 15px→16px 500
body: padding 14px/16px→18px
```

### 9.3 KPI 卡
```
grid 子项；bg-white border rounded-14 shadow-card padding 14px 16px
label: 12px rk-ink-soft；value: 22px 700 tabular-nums；delta: 12px rk-ink-faint
状态色：.ok/.up→rk-success，.miss/.down→rk-danger
达标卡：border 1.5px rk-warn + 浅黄渐变底
```

### 9.4 表格（全站同构三锁定）
```
<table class="table-fixed border-separate border-spacing-0 w-full">
表头：sticky top-0 bg-rk-navy text-white h-[58px] 13px→15px 居中
首列：sticky left-0（锁定时补 bg-white/brand-soft 防穿透）
汇总行：sticky bottom-0 bg-rk-bg-brand-soft border-top
单元格：11.5px(移动)→16px(桌面) 居中 tabular-nums
移动端：禁止横向滚动，放不下压缩字号/列宽
```

**分组分割阴影（跨列分组表）**：多级表头按「改造前 / 改造后 / 结果」分块时，分组交界**不加边框**，用极窄内侧投影 `inset 3px 0 4px -3px`——浅底行 `rgba(0,0,0,.18)`、深底（表头/合计行）换 `rgba(255,255,255,.22)`；加在**每个分组首列**的表头子行 + 数据行 + 合计行上，竖直连成一条缝。**禁用 `border-left`**：会挤内容宽度、并让该行高 1~2px，切页时整表抖动。实现见 `report-kit/tableGroupShadow.ts`（`GROUP_SHADOW` / `GROUP_SHADOW_HEAD`），细则见 `UI-CONSISTENCY.md §6`。

### 9.5 横幅 / 说明 / 状态点
- 提示横幅 `.rk-banner`：`bg #FFF7E8 border #F0C878 text #8A5A00 rounded-md padding 10px 14px`（示例三甲医院式，保留为告警横幅专用）
- 注脚 `.rk-note`：`11px rk-ink-faint line-height 1.8`
- 状态点/图例：圆角 2–4px 小方块 `10×10px`

---

## 10. 图表视觉规范（Charts）

- **库**：富通道用 echarts（CDN `jsdelivr`）；轻通道用纯 SVG（`<title>` 悬浮即满足「数据点带日期」红线，零 JS）。
- **配色**：系列色取自 §2 图表色板，禁止 matplotlib 默认色（消灭示例智造园区/示例食品厂错色）。
- **字体**：图表内文字用 §3.1 字体栈；坐标轴/标签 `rk-ink-soft`，标题 `rk-ink`。
- **目标线**：节能率类图表**必须画目标线**（虚线 + 标注），红线见 `OPERATIONS-REPORT-PATTERNS.md`。
- **数据点带日期**：tooltip/`<title>` 必须含数据点对应日期，否则违反红线。

---

## 11. 验收清单（新报告交付前逐项核对）

1. **颜色**：全文件搜不到裸 hex（除 `report-base.css` / `tokens.css` 定义处）？图表色板是否用 rk 系列？
2. **圆角**：区块卡片是否 14px？有无 10px 混入？
3. **间距**：是否全用 §4 尺度值？有无 14/16/24 之外的散值？
4. **字号**：是否落在 §3.2 梯度？有无 10px 以下或 18/20 等散值？
5. **容器**：报告宽是否 ≥960px（统一 1080）？KPI minmax 是否 160px？
6. **边框/底色**：是否 `rk-line #E6EAF1` + `rk-bg-faint`？有无 #ccc/#E2E8F0/#F1F5FB？
7. **卡片阴影**：区块卡片/KPI 是否带 `--shadow-card`？
8. **字体栈**：是否唯一字体栈？有无单 `'Microsoft YaHei'` 缺回退？
9. **双端**：390×844 + 1280×800 双视口截图对照，防切换抖动（React 通道必做）。
10. **分组分割阴影**：跨列分组表是否用 `tableGroupShadow.ts` 的 inset 阴影（而非 `border-left`）？分组首列的表头/数据/合计三处是否都加了？深底处是否用了白色阴影？

> 任何页面出现本规范之外的控件新尺寸/新色，先回灌本技能（只增不删），再应用到新页面——不要只在单个项目里自造值。
