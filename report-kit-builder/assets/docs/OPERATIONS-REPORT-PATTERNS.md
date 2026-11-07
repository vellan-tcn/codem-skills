# 运营报告通用模式库（OPERATIONS-REPORT-PATTERNS）

> 源自 4 个真实运营报告项目的跨项目沉淀：**示例商业综合体运营数据 / 示例食品厂运营报告 / 示例智造园区运营数据 / 示例三甲医院运营报告**。
> 把"运营报告到底长什么样、怎么搭最快"提炼成可复用模式，补齐 skill 主体（聚焦 React 应用复刻）之外的**零构建交付通道**与**内容/图表模式库**。
> skill 主体的复刻流程、红线、控件一致性规范仍然全量生效；本文件只新增"非 React 交付形态"与"通用内容/图表原型"，二者互补不冲突。

---

## 0. 来源与定位

- **为什么需要本文件**：4 个项目实际产出了 3 类交付物——独立 HTML 报告（示例商业综合体 / 示例智造园区 / 示例三甲医院）、A4 PDF 报告（示例食品厂）、React 应用（示例食品厂 05_app / 示例三甲医院 demo-app）。skill 主体只系统覆盖了 React 应用这一条通道；而独立 HTML 报告**复用 skill 的 `rk-*` 语义令牌与卡片版式**、零构建即可交付，是高频刚需却长期靠各项目凭记忆重写。本文件把它沉淀为可复制骨架。
- **与 skill 的关系**：本文件是"内容/版式/图表层"的通用字典；skill 的 `assets/theme/`（令牌）、`assets/report-kit/`（组件）、`assets/pages-Report/`（React 复刻基准）仍是权威真源。独立 HTML 通道**直接复用 theme 令牌**，不另起配色。
- **agent 无关**：所有模式基于纯 HTML/CSS/SVG + echarts CDN 或零依赖 SVG，不绑定妙搭/CodeM/WorkBuddy；换任何能写文件的 agent 都能用。

---

## 1. 三种交付形态（按场景选，别只认 React）

| 形态 | 技术 | 何时用 | 红线要点 |
|---|---|---|---|
| **React 应用** | skill 主体（report-kit + theme，妙搭/自托管部署） | 需要交互、筛选、实时数据、长期维护的看板/月度报表 | 走 skill 复刻流程 + 控件一致性 + 打印页 |
| **独立 HTML（富）** | 单文件 + echarts CDN + `rk-*` 令牌 | 快速预览稿、对外单页运营报告、无构建环境、需要丰富图表 | 令牌复用、图表数据点带日期、目标线必问 |
| **独立 HTML（轻）** | 单文件 + 纯 SVG/CSS（**零 JS 依赖**） | 无网络/CDN 受限、内网隔离、只需要构成条/日趋势等轻图表 | SVG `<title>` 悬浮说明替代 tooltip、禁止裸 hex |
| **A4 PDF 报告** | HTML + `@media print` 或浏览器打印导出 | 正式对外单据（确认单/结算单/审计报告），需打印/归档 | 见 `PRINT-PATTERNS.md`（黑白灰阶、表格化、签字区、URL 不打印） |

**选择原则**：先用独立 HTML（富/轻）出预览稿给用户确认版式与内容范围（这正是 4 个项目统一的"预览稿先行"实践），确认后再决定是否上 React 应用或打印 PDF。任何形态都共守 §6 通用红线。

---

## 2. 独立 HTML 报告（零构建通道，核心新增）

### 2.1 设计令牌直接复用（不重写配色）

独立 HTML 通道**直接拷 `assets/theme/tokens.css` 的 `rk-*` 语义令牌**进 `<style>:root`，全站风格与 React 应用自动统一。常用映射：

| 用途 | 令牌 | 备注 |
|---|---|---|
| 顶部 hero 渐变 | `rk-table-head` → `rk-gradient-deep` | 深蓝渐变背景 + 白字 |
| KPI 卡片边框/底 | `rk-line` 边框 + `rk-bg-soft` 底 | 数字用 `rk-brand` |
| 目标未达标 | `rk-danger` | 红色 + `tag-miss` 角标 |
| 达标 / 正向 | `rk-success` | 绿色 + `tag-ok` 角标 |
| 卡片分区标题序号圈 | `rk-bg-brand-soft` 底 + `rk-brand` 字 | 圆形编号 |
| 表格表头 | `rk-table-head` 深底白字 | 右对齐数字 |
| 说明块左边线 | `rk-brand` 3px 左边线 + `rk-bg-soft` 底 | 口径/结论说明 |
| 图表品牌色 | `rk-brand` / `rk-teal` / `rk-blue` | 系列色，不用裸 hex |

> 禁止在独立 HTML 里写死 `#15263B` 这类裸 hex——用令牌变量，换肤时一处改全局变。

### 2.2 版式骨架（可直接复制，富版）

```html
<!DOCTYPE html>
<html lang="zh-CN"><head><meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>{项目} · {报告名}（{年月}）</title>
<script src="https://cdn.jsdelivr.net/npm/echarts@5.5.0/dist/echarts.min.js"></script>
<style>
  :root{ /* 从 assets/theme/tokens.css 整段拷入 rk-* 令牌 */ }
  *{margin:0;padding:0;box-sizing:border-box}
  body{font-family:-apple-system,"PingFang SC","Microsoft YaHei",sans-serif;
       background:var(--rk-bg-faint);color:var(--rk-ink)}
  .hero{background:linear-gradient(135deg,var(--rk-table-head),var(--rk-gradient-deep));
        color:#fff;padding:28px 24px}
  .hero .title{font-size:22px;font-weight:700}
  .hero .sub{margin-top:6px;font-size:13px;color:#B7C4D6}
  .wrap{max-width:1080px;margin:0 auto;padding:16px}
  .kpis{display:grid;grid-template-columns:repeat(auto-fit,minmax(160px,1fr));gap:12px;margin:16px 0}
  .kpi{background:#fff;border:1px solid var(--rk-line);border-radius:14px;padding:14px 16px}
  .kpi .label{font-size:12px;color:var(--rk-ink-soft)}
  .kpi .value{margin-top:6px;font-size:22px;font-weight:700;font-variant-numeric:tabular-nums}
  .kpi .delta{margin-top:4px;font-size:12px;color:var(--rk-ink-faint)}
  .card{background:#fff;border:1px solid var(--rk-line);border-radius:14px;margin:14px 0;overflow:hidden}
  .card-head{display:flex;align-items:center;gap:10px;padding:12px 18px;border-bottom:1px solid var(--rk-line)}
  .card-head .no{width:26px;height:26px;border-radius:999px;background:var(--rk-bg-brand-soft);
        color:var(--rk-brand);font-size:12px;font-weight:600;display:flex;align-items:center;justify-content:center}
  .card-head .t{font-size:15px;font-weight:500}
  .card-head .st{font-size:12px;color:var(--rk-ink-soft)}
  .card-body{padding:16px 18px}
  table.cmp{width:100%;border-collapse:collapse;font-size:13px}
  table.cmp th{background:var(--rk-table-head);color:#fff;padding:8px 10px;text-align:right}
  table.cmp th:first-child{text-align:left}
  table.cmp td{padding:9px 10px;text-align:right;border-bottom:1px solid var(--rk-line);
        font-variant-numeric:tabular-nums}
  table.cmp td:first-child{text-align:left;color:var(--rk-ink-soft)}
  table.cmp tr.sum td{font-weight:700;background:var(--rk-bg-brand-soft)}
  .charts{display:grid;grid-template-columns:1fr 1fr;gap:12px}
  .chart-box{width:100%;height:300px}
  @media(max-width:768px){.charts{grid-template-columns:1fr}} /* 移动端单列 */
  .note{background:var(--rk-bg-soft);border-left:3px solid var(--rk-brand);border-radius:8px;
        padding:12px 16px;font-size:12px;color:var(--rk-ink-soft);line-height:1.8;margin-top:14px}
</style></head><body>
<div class="hero"><div class="title">{项目} · {报告名}<span class="badge">{年月}</span></div>
  <div class="sub">{系统/口径简述} · 数据截止 {asOf}</div></div>
<div class="wrap">
  <div class="kpis"><!-- §3.1 KPI 概览卡片 ×N --></div>
  <div class="card"><div class="card-head"><span class="no">1</span><span class="t">{章节标题}</span>
    <span class="st">{副标题/口径}</span></div><div class="card-body">
    <div class="chart-box" id="chart1"></div></div></div>
  <div class="note">{口径说明：来源/截止日/公式}</div>
</div>
<script>/* §4 图表 option 直接套用 */</script>
</body></html>
```

### 2.3 轻量版（纯 SVG/CSS，零 JS 依赖）——示例三甲医院式

适合 CDN 受限、内网隔离、只需构成条/日趋势的场景。**用 SVG `<rect><title>` 悬浮说明替代 echarts tooltip**，天然满足"数据点带日期时间"红线且零依赖：

- **分项构成水平条**：每条 `{名称, 值, 占比%}`，`width = 占比%`，`background: var(--rk-brand)`（按分组换令牌色），右侧 `值 · 占比%` 浅灰小字。
- **日趋势 SVG 柱**：`viewBox="0 0 860 140"`，每根 `<rect>` 带 `<title>2026-01-01 {回路}: N kWh</title>`；浏览器原生悬浮即显示"日期+数值"，无需 JS。
- 顶部 KPI 卡用**彩色顶边**区分回路（如 `border-top:3px solid var(--rk-brand)`），不用裸 hex。

---

## 3. 内容原型库（7 类，跨项目通用）

每类标注"哪个项目验证过"，新报告按需拼装：

| # | 原型 | 来自 | 关键结构 |
|---|---|---|---|
| 3.1 | **KPI 概览卡片** | 示例商业综合体（6 卡） | 节能率(合同/面积双口径)、月节能量、节能效益(万元)、供热量、电价/气价；达标红/绿角标 |
| 3.2 | **达标达成（节能率 vs 目标线）** | 示例商业综合体 | 单 bar + `markLine` 目标值；未达标显 `tag-miss` |
| 3.3 | **改造前后对比表** | 示例商业综合体（制冷/供热） | 指标 / 改造前 / 改造后 / 变化；末行 `sum` 汇总节能率+效益；差值带 `pos`/`neg` 着色 |
| 3.4 | **效益构成（堆叠柱±）** | 示例商业综合体 | 制冷(正)/供热(负) 同栈 `stack`；负值用 `rk-teal` 区分 |
| 3.5 | **分项占比** | 示例三甲医院（分项电能） | 按分组(冷源主机/冷却泵/…)聚合；pie/ring 或水平条 + 占总量% |
| 3.6 | **分项对账（多源核差）** | 示例食品厂（三端对账） | 月 × {端1/端2/端3} 逐月 + 差值 + 结论✓；末行全年合计；COP 两端一致校验 |
| 3.7 | **结论与建议 / 口径说明** | 示例智造园区（五段式分析） | 结论摘要表(原因/量级/说明) + 风险提示 + 待核实；口径说明必附(来源/截止日/公式) |

> **铁律**：3.7 口径说明**任何报告必附**——来源 Excel/库、数据截止日、计算口径(合同/面积/基数)、公式。缺口径的报告不可信（示例智造园区 9 月因"周末混入/少产冷/分母效应"三因子，账面节能率 18.58% 被拆分纠偏，正是口径透明的典型）。

---

## 4. 图表模式库（echarts 配置快照，6 种，可复制）

> echarts（独立 HTML 通道）与 `ChartCanvas`（React 通道，基于 chart.js）分工见 `DEPENDENCIES.md`。以下 option 要点可直接套；**全部遵守"数据点带日期+时间浅色小字"红线**（`tooltip.valueFormatter` / `axisLabel.formatter` / SVG `<title>`）。

1. **节能率 + 目标线**（3.2）：`series[bar]` + `markLine:{data:[{yAxis:目标值}], lineStyle:{color:rk-danger,type:'dashed'}, label:'全年目标≥X%'}`；柱值达标/未达分别着色。
2. **改造前后对比**（3.3）：`series` 两组 `bar`（改造前/改造后），`barMaxWidth:80`；可叠加"节能量"第二组柱（`itemStyle:rk-teal`）。
3. **效益构成 ±**（3.4）：`stack:'b'` 堆叠，制冷正/供热负同栈；`yAxis.formatter` 转"万"。
4. **趋势曲线**（示例智造园区/示例三甲医院日趋势）：`type:'line'`，`xAxis` 为日期；`axisLabel.formatter` 显 `MM-DD`，`tooltip` 显日期+数值；逐时趋势用 `HH:mm`。
5. **分项占比**（3.5）：`type:'pie'`（`radius:['40%','70%']` 环图）或水平条；标签显 `名称 占比%`。
6. **24h 负荷曲线**：`type:'line'`，`xAxis` 0–23 时；多回路同图 `legend` 区分。

---

## 5. 数据 schema 约定（跨项目一致，降低对接成本）

新项目对接原始数据时，优先采用以下字段名（与 4 项目实测结构对齐），避免每次重新约定：

```ts
// 月度记录（节能率/能耗类）
interface MonthlyRecord {
  month: string;          // '2026-08'
  coldQty?: number;       // 冷量 kWh（COP 类）
  powerQty: number;       // 用电量 kWh
  cop?: number;           // 综合 COP
  savingQty?: number;     // 节能量 kWh
  savingRate: number;     // 节能率 %
  target?: number;        // 目标值（节能率/限额）
  benefitYuan?: number;   // 节能效益 元
  caliber: string;        // 口径：'合同'|'面积'|'基数'
  asOf: string;           // 数据截止日 '2026-08-31'
  unit: string;           // 'kWh'|'GJ'|'元'
}
// 多源对账记录（3.6）
interface ReconRecord {
  month: string;
  srcA: number; srcB: number; srcC?: number;  // 端1/端2/端3
  deltaAB: number; deltaAC?: number;
  conclusion: string;     // '一致 ✓' | '平滑微差*'
}
```

> 口径字段 `caliber` / `asOf` / `unit` **必带**——这是 4 项目反复踩坑后固化的最小元数据，缺了报告无法复算核对。

---

## 6. 通用红线（跨所有交付形态共守）

1. **目标/基线/预警线必问**（见 SKILL.md 基线红线）：COP 目标、节能率目标、能耗限额——类型/数值/来源/展示形式未定前不得编造或省略；用户未答先交无基线版 + 明列"待定"。
2. **口径说明必附**：来源、截止日、计算口径、公式，否则报告不可信。
3. **图表数据点带日期+时间浅色小字**（echarts tooltip/axisLabel 或 SVG `<title>`）。
4. **禁止裸 hex**，一律 `rk-*` 语义令牌（换肤一处改全局变）。
5. **移动端 <768px 卡片化**：KPI 网格 `auto-fit` 天然响应；表格改卡片列表。
6. **业务计算不进报告模板**：报告/前端只做展示，算法留在数据管道（04_pipeline）或后端。
7. **数据异常先清洗再出报告**：坏值/-9999/回退点必须先剔除（示例三甲医院清洗 -9999 后出报告），并在口径说明标注剔除项。

---

## 7. 跨项目参考（已登记，详见 SKILL.md 跨项目源码参考库）

| 项目 | 类型 | 对本模式库贡献的亮点 |
|---|---|---|
| 示例商业综合体运营数据 | 节能率月报（独立 HTML 富版） | 3.1/3.2/3.3/3.4 全部原型 + 目标线 markLine + 双口径 KPI |
| 示例食品厂运营报告 | COP 看板（React app）+ A4 PDF | 3.6 三端对账原型 + 打印/PDF 交付；控件一致性来源 |
| 示例智造园区运营数据 | 节能率分析（独立 HTML + MD） | 3.7 五段式结论 + 口径纠偏范式（周末/少产冷/分母效应） |
| 示例三甲医院运营报告 | 分项电能分析（独立 HTML 轻版） | 3.5 分项占比 + §2.3 纯 SVG 零依赖轻量通道 + 日趋势 SVG |

> 本文件本身为**通用层改进**，按 skill「升级回灌规则」应回灌真源（项目源码仓 / codem-skills）后 sync 下发；各项目的定制口径/算法/文案仍留各自项目，不进 skill。
