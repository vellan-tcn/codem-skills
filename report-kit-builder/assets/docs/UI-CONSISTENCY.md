# 控件一致性复刻规范（UI-CONSISTENCY）

> 来源：2026-10 示例三甲医院能效运营应用全站控件打磨（多轮「跨页视觉抖动/不一致」修复后沉淀）。
> 目标：新项目 / 新页面按本规范复刻控件，**切换页面、切换口径、切换端（移动/桌面）时视觉零抖动**。
> 原则：同一语义控件只有一套量化规格；移动端与桌面端是同一规格的两档（断点 md=768px），不是两套设计。

## 0. 全局基准（先定这套，所有页面共享）

| 项 | 移动（<768px） | 桌面（≥768px） | 说明 |
|---|---|---|---|
| 断点 | `md`（768px）统一 | 同左 | 全站只用一个断点 |
| 控件高度 | `h-[32px]` / `min-h-[32px]` | `md:h-8`（同为 32px） | 按钮/下拉/输入/日期触发器/分页按钮同一高度 |
| 控件字号 | `text-xs`（12px） | `md:text-sm`（14px） | 表格例外见 §6 |
| 次要说明字号 | `text-[10px]`/`text-[11px]` | 同左 | 筛选区标签、角标 |
| 数字 | `tabular-nums` 一律 | 同左 | 关键数值加 `whitespace-nowrap` 防换行 |
| 颜色 | 一律语义令牌 `rk-*`，禁止裸 hex | 同左 | 见 theme/tokens.css |

**切换抖动根因**：同语义控件在不同页面写了不同的 height/width/padding/字号/圆角。修复 = 全站统一为一组常量（见 §1~§7），新页面只能引用本规范，不得自造新值。

## 1. 按钮

### 1.1 普通按钮（次要/分页/日期触发）
```
flex h-8 min-w-8 items-center justify-center rounded-md border border-rk-line
bg-white px-2 text-xs text-rk-ink transition-colors hover:border-rk-blue
disabled:cursor-not-allowed disabled:opacity-40 md:h-8 md:text-sm
```

### 1.2 主按钮（查询/确认/提交）
```
h-[32px] min-h-[32px] shrink-0 px-3 py-0 text-xs md:h-8 md:px-5 md:text-sm
```
- 移动端/桌面端高度一致（32px），仅宽度/字号两档；带图标时 `gap-1`~`gap-2`。

### 1.3 胶囊按钮（月份/维度/口径快选）
```
flex min-h-[32px] shrink-0 items-center justify-center rounded-full border px-2 text-xs
whitespace-nowrap transition-colors md:h-auto md:min-h-0 md:px-3 md:py-1
```
- 选中态：`border-rk-table-head bg-rk-table-head text-white`
- 未选中：`border-rk-line bg-white text-rk-ink hover:border-rk-blue`
- 禁用（无数据月份等）：`cursor-not-allowed border-rk-line bg-white text-[#C3CBD8] opacity-50`
- 胶囊只在移动端固定 32px 高；桌面允许 `md:py-1` 紧凑（桌面用圆角条而非大胶囊）。

### 1.4 口径/模式切换按钮（A/B 切换，防抖动关键）
同一位置反复切换的两个按钮，**宽高必须完全固定**，否则每次切换视觉跳动：
```
w-36 whitespace-nowrap rounded-md border px-2 py-1 min-h-[32px] text-xs font-medium
```
- 两个按钮同一 width/height/字号，仅激活态变色；激活态 `bg-rk-table-head text-white`，非激活 `bg-white text-rk-ink`。

### 1.5 打印按钮（深色导航条内）
```
hidden min-h-[36px] min-w-[36px] shrink-0 items-center justify-center gap-1.5 rounded-full
border border-white/20 px-2 text-xs text-white hover:bg-white/10
md:flex md:min-h-0 md:min-w-0 md:px-3 md:py-1
```
- 移动端只显示 icon（36px 触控目标），桌面显示文字；**所有页面打印按钮同尺寸**。

## 2. 下拉框（Select）

- Trigger 基准：`rounded-md border-rk-line bg-white`；年份/胶囊场景可 `rounded-full`。
- 高度：移动端用 `data-[size=default]:h-[32px]` 覆盖基准 `h-9`；桌面 `md:h-8`。
- 宽度：**同场景同常量**（如筛选区桌面 `md:w-[110px]`、每页条数 `md:w-[104px]`、年份 `w-[80px] md:w-[110px]`、单位 `w-[84px] md:w-[90px]`）；移动端 `w-[84px]` 等固定或 `min-w-0 flex-1` 自适应，禁止同一场景各页宽不一。
- 字号：`text-xs md:text-sm`；icon `[&_svg]:size-3.5`。
- 示例（筛选区粒度下拉）：
```
data-[size=default]:h-[32px] w-[84px] justify-center gap-1 px-2 text-xs [&_svg]:size-3.5
md:h-8 md:w-[110px] md:px-3 md:text-sm
```

## 3. 输入框（Input）

```
h-[32px] min-h-0 w-full py-0 px-1 text-center text-xs leading-none
md:h-8 md:px-3 md:text-sm
```
- 时间输入桌面固定 `md:w-[92px]`；短数值（自定义粒度）`w-[60px] md:w-[72px]`；跳转页码 `h-9 w-12 md:h-8`（移动略高防误触）。
- 一律 `appearance-none`（时间选择器）去平台默认样式，保持圆角/边框一致。

## 4. 日期选择器（Popover + Calendar）

> 复用组件：`assets/ui/calendar.tsx`（封装 `react-day-picker@v9`，已含 `data-slot="calendar"` 根节点、`locale=zhCN`、`mode="range"` 支持）、`assets/ui/popover.tsx`（Radix Popover，内容经 **Portal** 渲染）。参考实现：`report-kit/RawDataFilters.tsx`（**单日历区间选择器 + 保留两个时刻输入框 + 滚轮翻月**，报表查询/分项计量两个 tab 复用）、`pages-Report/CopCompare/CopComparePage.tsx`（单日历区间选择器 + 滚轮翻月，**均已线上验证**）。两者是同一模式的两套落地（前者带时刻、后者日期级），可互参。

### 4.1 触发框样式（统一，防抖动）

```
TRIGGER_CLS = 'h-[32px] rounded-md border border-rk-line bg-white px-1.5 text-xs
flex items-center justify-center gap-1 text-rk-ink md:px-3 md:text-sm md:gap-2 md:h-8'
```
- 移动端显示 `MM-DD`、桌面显示 `YYYY-MM-DD`（同源日期，防换行）；容器 `min-w-0 flex-1`。
- 图标用 `CalendarDays`（`h-4 w-4 text-rk-ink-soft`）。
- **若用两个独立触发器（起始/结束），必须同高同宽同字号**（抖动高频点）——但更推荐 §4.3 的单日历方案，一步到位。

### 4.2 单日选择器（mode="single"，基线，一次点选即关）

参考 `RawDataFilters.tsx`：`mode="single"` + `selected={date}` + `onSelect={(d)=> d && onDateChange(d)}`。一次点击即选即关，**不存在"需保持打开"问题**，最省心。

### 4.3 单日历区间选择器（mode="range"）—— 替代两个独立日期框

用户要"起止在一个日历里选"时，用**单个日历弹层**先点起点、再点终点，**不要**用两个 `<input type="date">`。

**⚠️ 首点陷阱（必读，否则选不出区间）**：`react-day-picker` 在 `selected` 为空时，**第一个点击返回 `from === to`（同一天被当成"完整区间"）**。若 `onSelect` 一见 `from` 与 `to` 都有就 `setOpen(false)`，弹层会在首次点击后立刻关掉，根本点不出第二个日期。

**正确做法（CopComparePage / RawDataFilters 均已验证）**：
1. 用独立 `picker: DateRange` 状态受控 `selected`；**打开弹层时清空 `picker = undefined`**（避免预置 `from` 被误判为"进行中的区间"）。
2. `handleRangeSelect`：**`to` 为空 或 `from === to` 一律当作"仅选起点"** → 只 `setPicker({ from, to: undefined })` 并保持弹层；只有真正 `from !== to` 才提交并 `setOpen(false)`。
3. 弹层底部放「查询区间」按钮（`h-[32px] rounded-md bg-rk-blue text-white`）：
   - 仅选起点 → 按"起点起至最新归档日"查询；
   - 选满区间 → 按"起点 ~ 终点"查询；
   - 终点传给后端时 **`+1 天`** 作开区间边界（`end` 不含当天 00:00）。
4. 触发框文案：有结束日显示 `2026-05-15 ~ 2026-10-15`、无结束日显示 `2026-05-15 起`（展示"所见即所得"的结束日，内部再 +1 天作为后端开区间边界）。

> **⚠️ 第二个大坑（本次新踩，务必记牢）：`selected` 绝不能回退到"已有完整区间"。** 若把当前起止 `{from, to}` 作为 `selected` 预选传给日历，用户点第一个新日期时 rdp **不会重新开始，而是"扩展"成 `{新起点, 旧终点}` 这种完整区间**（rdp 在已有完整区间上的点击=改其中一个端点），于是 `onSelect` 一见 `from!==to` 就当"选满"直接提交并关闭 —— 首点即闭合、选不出区间。
> **正解**：`selected = picker`（draft）即可，**不要** `picker ?? {已有起止}`。打开即空白（与 COP 一致），首点 `from===to` 落入"仅起点"分支保持弹层，次点才提交。触发框仍显示当前区间文字，用户上下文不丢。关闭弹层时清空 draft，避免半成品高亮残留。

### 4.4 保持弹层在日历内交互时不关闭（keep-popover-open）

`Calendar` 经 Radix **Portal** 渲染，点日/翻月/聚焦日都属"内部"交互，一般不会触发真正的外部关闭；但为稳妥加三道守卫：

```tsx
function keepPopoverOpenInCalendar(e: { target: EventTarget | null; preventDefault: () => void }): void {
  const t = e.target as HTMLElement | null;
  if (t && t.closest('[data-slot="calendar"]')) e.preventDefault();
}
// PopoverContent 上挂载：
onPointerDownOutside={keepPopoverOpenInCalendar}
onInteractOutside={keepPopoverOpenInCalendar}
onFocusOutside={keepPopoverOpenInCalendar}
```

### 4.5 鼠标滚轮翻月（受控 month + 原生 wheel 监听）

`react-day-picker` 默认不监听滚轮，跨多月（如 5月→10月）只能连点箭头。加"滚轮翻月"：

- 把 `Calendar` 改成**受控 `month`**：`month={calMonth}` + `onMonthChange={setCalMonth}`，去掉 `defaultMonth`。
- 挂**原生** `document` 级 `wheel` 监听（`{ passive: false }` 才能 `preventDefault`；React 合成 `onWheel` 是被动的、拦不住页面滚动）：仅当 `e.target.closest('[data-slot="calendar"]')` 才拦截，`deltaY > 0`→下月、`deltaY < 0`→上月。
- **节流 ~220ms**：一次物理滚动连发多个 wheel 事件，只翻 1 个月，防"飞页"跳过目标月（用 `useRef` 记上次翻月时间戳）。
- **封顶/封底**：用 `new Date(y, m ± 1, 1)` 计算后，把年份限制在数据年份内（如 `2026-01 ~ 2026-12`），越界停住不越界。
- 打开弹层时 `calMonth` 复位到当前区间起点月份（与 `rangeStart` 对齐），避免弹层总停在"今天"。

> **单日历区间选择器（`mode="range"`）同样适用滚轮翻月**：把 `Calendar` 改成受控 `month`（`month={month}` + `onMonthChange={setMonth}`，移除 `defaultMonth`），用 `Popover` 受控 `open` 仅在展开时挂 `wheel` 监听，封顶/封底同上。`ui/calendar` 已把 `month`/`onMonthChange` 透传给 DayPicker，无需改封装。本项目共享组件 `components/report-kit/RawDataFilters.tsx` 已落地此写法（报表查询、分项计量两个 tab 复用：单日历选起止 + 两个时刻输入框 + 滚轮翻月），与 COP 对比页同一模式。

### 4.6 触发框布局（靠右贴打印）

区间选择器整体放进 `ml-auto` 的右侧组，紧贴「打印」按钮左侧：

```
<div className="ml-auto flex flex-wrap items-center gap-1.5">
  <Popover>…触发器…</Popover>
  <button className="…打印…">打印</button>
</div>
```
- 移除打印按钮自身的 `ml-auto`；左侧口径按钮（如 实际/调整后）留在原位不挤压。
- 保证日期选区**右对齐、紧贴打印**，与页面其它按钮风格统一（同 §1 高度/圆角/边框）。

### 4.7 验收清单（日历类）

1. 单日历能否**两次点击选满**起止区间（首点不闭合）？
2. 弹层内点日 / 翻月 / **滚轮翻月**都不误关？
3. 滚轮翻月到数据年份**边界是否停住**不越界？
4. 触发框是否 32px、与打印按钮**同组右对齐**？
5. 仅选起点时点「查询区间」是否按"起点起至最新"查询？
6. 移动端触发框显示 `MM-DD`、桌面 `YYYY-MM-DD`（防换行）？

## 5. 卡片与容器

### 5.1 SectionCard（页面区块）
```
rounded-[14px] border border-rk-line bg-white shadow-[0_2px_12px_rgba(8_27_49_0.05)]
```
- 表头：`min-h-[28px] px-2.5 py-1 md:min-h-[40px] md:px-4 md:py-1.5`
- 序号徽标：`h-5 w-5 md:h-7 md:w-7 rounded-full bg-rk-bg-brand-soft text-[10px] md:text-xs font-semibold text-rk-brand`
- 标题：`text-[13px] font-medium md:text-base`
- 内容区：`px-2.5 pb-2 md:px-4 md:pb-3.5`

### 5.2 筛选/工具容器
```
rounded-[14px] bg-white p-4 md:rounded-[10px] md:p-2.5
```
- 与 SectionCard 不同：桌面筛选用 10px 圆角紧凑形态（卡片 14px 是内容区块，二者刻意区分但各自全站统一）。

### 5.3 移动端卡片列表（<768px 的表格降级）
```
rounded-[12px] px-3 py-1.5 shadow-[0_1px_3px_rgba(30_40_70_0.06)]
```
- 行距可收紧（实测 30px 级可接受），数字 `whitespace-nowrap text-[13px] font-semibold tabular-nums`；深色汇总卡数值 `text-[17px] font-bold`；指标 `grid grid-cols-3`。

## 6. 表格（全站同构，含锁定）

```
<table className="w-full max-w-full table-fixed border-separate border-spacing-0">
```
- **表头吸顶**：`sticky top-0 z-10` + 深色底 `bg-rk-navy`，`h-[58px] border-r border-white/25 text-center align-middle text-[13px] font-semibold md:whitespace-nowrap md:px-2 md:text-[15px]`
- **首列锁定**：表头 `sticky left-0 z-30`、单元格 `sticky left-0 z-10`（锁定时补底色防穿透，如 `bg-white`/`bg-rk-bg-brand-soft`）
- **汇总行吸底**：`sticky bottom-0` + `bg-rk-bg-brand-soft` 浅蓝底 + `border-t border-t-[#A8C3EA]`；合计行加粗放大
- **单元格**：`whitespace-nowrap px-2 py-[3px] text-center text-[11.5px] tabular-nums md:px-3 md:py-1.5 md:text-base`（移动 11.5px / 桌面 16px 是本套件的表格字号档）
- **列宽**：`table-fixed` 均分；**移动端一整页看完、禁止横向滚动**——放不下时压缩字号/列宽（按最长字符列宽度标定，宁可全窄不可参差）；日期列不换行
- **口径一致**：同一指标在各页表格的表头文案、列顺序、单位必须一致（如「泵实际用电 kWh / 扣减电量 kWh」）
- **分组分割阴影**（跨列分组表必做）：多级表头有「改造前 / 改造后 / 结果」这类大分组时，**分组交界处不加边框线，只加一道极窄内侧投影**——把 `GROUP_SHADOW`（浅底数据行）/ `GROUP_SHADOW_HEAD`（深底表头与合计行）加到**每个分组的第一列**上，表头子行、数据行、合计行都要加，阴影才能在竖直方向连成一条缝：
  ```ts
  // report-kit/tableGroupShadow.ts
  GROUP_SHADOW      = { boxShadow: 'inset 3px 0 4px -3px rgba(0, 0, 0, 0.18)' }
  GROUP_SHADOW_HEAD = { boxShadow: 'inset 3px 0 4px -3px rgba(255, 255, 255, 0.22)' }
  ```
  **禁用 `border-left` 实现分组分隔**（红线）：border 挤占内容宽度（长数字换行）、且让该行比其它行高 1~2px，切页/翻页时整表抖动；inset 阴影不参与布局，行高绝对稳定。深底（`rk-table-head`）上必须换白色阴影，否则黑阴影在深蓝上看不见。

## 7. 分页条（全站同构）

```
容器：mt-2 flex shrink-0 flex-nowrap items-center justify-end gap-1.5 overflow-x-auto md:gap-2
按钮：flex h-8 items-center justify-center rounded-md border border-rk-line bg-white px-2
      text-xs text-rk-ink hover:border-rk-blue disabled:opacity-40 md:text-sm
页号：min-w-8 tabular-nums；活动页 border-rk-table-head bg-rk-table-head text-white
每页条数 SelectTrigger：h-8 w-auto text-xs md:w-[104px]
跳转输入：h-9 w-12 rounded-md border px-1 text-center text-sm tabular-nums md:h-8
```
- **位置统一**：表格滚动区（flex-1）+ 分页条（shrink-0 吸底）是标准结构；所有报表页分页条**同位置、同样式、同右下对齐**。
- 移动端：隐藏页码数字区，显示「第 x/y 页」小字（`text-xs text-rk-ink-soft md:hidden`）。
- 页码省略：`prev-gap/next-gap` 显示 `...`，hover 变双箭头（ChevronsLeft/Right）。

## 8. 悬浮提示与弹窗层级

- **自定义 tooltip（非原生 title）**：PC hover、移动端点按；`pointer-events-none absolute z-30 rounded-md bg-rk-ink/95 px-2.5 py-1 text-xs text-white shadow-lg`；多行文案允许换行（`whitespace-normal`）。
- **弹窗/注释面板 z 层必须最高**：表格 sticky 用到 z-10/z-30，弹窗用 `z-50`+（或 Portal 根层），防止被表格/卡片遮挡。
- 口径/长说明一律折叠进悬浮（ⓘ 或虚线底标注点按），不在页面常驻长文本。

## 9. 验收清单（新页面/新项目交付前逐项核对）

1. **高度**：同语义控件是否全部 32px（移动 `h-[32px]`、桌面 `md:h-8`）？有无 36/40px 混入？
2. **字号**：控件 12/14、表格 11.5/16、说明 10/11，是否与其它页面一致？
3. **切换抖动**：口径/模式切换按钮宽高是否固定？日期两触发器是否同尺寸？
4. **分页条**：位置（右下吸底）、样式（h-8/rounded-md/justify-end）、每页条数宽度是否与其它报表页一致？
5. **表格**：`table-fixed` 均分列宽？表头吸顶/首列锁定/汇总吸底三锁定是否齐全？移动端是否无横向滚动？
6. **颜色**：有无裸 hex 绕过 rk-* 令牌？
7. **端一致性**：390×844 移动 + 1280×800 桌面双视口截图，与基准页逐项对照（防缓存 `?v=N` 二次截图）。

> 任何页面出现本规范之外的控件新尺寸，先回灌本技能（只增不删），再应用到新页面——不要只在单个项目里自造值。
