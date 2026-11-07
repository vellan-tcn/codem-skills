# ac-ui DESIGN — 妙搭空调平台 UI 设计规范

> 面向 AI agent 的自包含设计规范。任何 agent 读取本文件即可一键复刻「空调节能监控平台」同款 UI。
> 数值来源：源码通读知识库（01-framework / 02-pages / 03-components）+ playwright 线上 16 页实测（04-interactions）+ 有人云 UI 复刻 12 项红线。所有值均为原文抄录，禁止编造。

> ⚠️ **冲突规则：DESIGN.md 是设计规范唯一真相源。任何文档（含 SKILL.md、knowledge）与本文件数值冲突时，一律以 DESIGN.md 为准，并回改错误侧。**（实例：SKILL.md 曾写侧栏 224px——恰是首轮验收 Fail 值；正确值为 §1.1 的展开 `w-64`=**256px** ↔ 折叠 `w-20`=**80px**。）

## 0. 场景路由表（按场景直达章节，勿通读全文）

| 你要做什么 | 直达 |
|---|---|
| 做列表页（表格+筛选+分页） | §3 模式 A + §2.7 Table + §6.2 筛选区 + §4 规则 8（分页形态） |
| 做详情页（头行+Tabs） | §3 模式 B + §1 布局骨架 |
| 做表单弹窗 | §3 模式 C + §2.6 Dialog |
| 做暗色页（monitor/analysis/gate/login/接入管理） | §3 模式 F + DESIGN-tokens.yaml `colors.dark_page` |
| 做登录页 | §3 模式 J（状态机）+ §1.5 双层守卫 |
| 做实时数据/SSE 页 | §3 模式 E |
| 挂图表 | §3 模式 G + §2.9 |
| 做工艺图/组态大屏 | §3 模式 I |
| 搭全局外壳 AppShell | §1 全节 |
| 查色值/字号/圆角/间距/阴影/动效 | 同目录 `DESIGN-tokens.yaml`（单源）+ `tokens.json`（结构化） |
| 查交互红线（下拉/分页/按钮形态） | §4（12 项红线 + 实测契约） |

## 设计 token 单源（摘要）

全量 token（色值 / 字号 / 圆角 / 间距 / 阴影 / 动效 / 状态文案映射）已拆分至同目录 **`DESIGN-tokens.yaml`**（结构化机器可读版为 `tokens.json`），本正文不再复述全表，查值即读该文件。速记三条：
- 主色 `oklch(0.546 0.245 262.881)`；`--radius: 0.625rem`（Card=xl 12px；IOServer 区控件全直角 0px）
- slate-500/600/700 必须钉回 hex `#64748b / #475569 / #334155`
- 暗色绝对值页底 `#0a1120`，KPI 卡 `#0f1b31`，内容卡 `#0d1728`


---

## 1. 布局骨架规则（AppShell，全局外壳唯一蓝本）

结构：`div.flex.h-screen` → 左 `aside` 侧栏 + 右列（`header` 顶栏 + `main` 内容区）。

### 1.1 侧栏（aside）
- class：`hidden shrink-0 flex-col border-r border-slate-200 bg-white shadow-[inset_-1px_0_0_0_#E2E8F0D1,12px_0_32px_#0F172A0D] transition-[width] md:flex`
- 展开 `w-64 p-5`（256px，padding 20px）↔ 折叠 `w-20 overflow-hidden px-3 py-5`（80px）
- **阴影必须双写**：内侧 1px 高光 `#E2E8F0D1` + 外投影 `12px 0 32px #0F172A0D`（单写外阴影丢衔接高光，历史踩坑）
- Logo 区（无卡片纯排布）：`mb-6 flex items-center gap-3 px-3 py-[15px]`；徽标 `size-9 rounded-xl bg-primary text-sm font-bold text-white shadow-[0_10px_22px_rgba(37,99,235,0.18)]` 文本「冷」；标题 `text-sm font-bold text-slate-700`「空调节能监控平台」+ 副题 `text-[10px] text-slate-500`「水冷中央空调」
- 版本徽标：`mt-4` `span.rounded.bg-muted.px-1.5.py-0.5.text-xs.font-medium.text-muted-foreground` → `V0.1.0`

### 1.2 菜单（SidebarNav）
- 容器 `nav.flex-1.space-y-3.overflow-y-auto`；分组默认展开
- **单子项分组且非 forceGroup → 直接渲染一级大按钮**（不显示分组头）
- 分组头：`flex w-full items-center justify-between rounded text-[11px] font-bold uppercase tracking-wider text-slate-500 hover:bg-slate-100 px-2 py-1`；箭头 `size-[13px] text-slate-400`（展开 ChevronDown / 收起 ChevronRight）
- 叶子链接：`flex w-full items-center rounded text-sm font-bold text-[#334155] h-7 py-1 gap-2 px-2`；激活 `bg-primary text-white`；hover `bg-slate-100 text-slate-900`；子列表缩进 `ml-2 space-y-1`；图标 `size-4 shrink-0`
- 无权限叶子：`cursor-not-allowed text-muted-foreground/40`，title="无权限"，点击 preventDefault

### 1.3 顶栏（header）
- `relative z-40 flex h-14 shrink-0 items-center justify-between border-b border-slate-200/[0.88] bg-white px-5`（高 56px，padding 左右 20px，底边框 slate-200 @88%）
- 左段：汉堡（`size-10 rounded-lg border-slate-200 md:hidden`，Menu size-5）+ 折叠钮（`h-8 w-8 rounded-lg`，仅 `lg:inline-flex`，ChevronsLeft/Right size-4）+ 面包屑
- 面包屑当前页胶囊：`rounded-full border-blue-200/85 bg-[#f0f7ff] px-[10.4px] py-[5.6px] text-xs font-bold text-slate-600`；父级段 `text-xs font-bold text-slate-600` + `ChevronRight size-3 text-slate-400`
- 右段 `gap-2`：样式钮（Palette size-3.5，`px-3 py-1.5 text-xs`）→ 实时链路在线（`rounded-lg border-green-200 bg-green-50 px-2.5 py-1.5 text-[11px] text-green-800` + 呼吸点 `size-[7px] rounded-full bg-green-500` + Link2 size-3）→ 铃铛/全屏（`md:size-8 rounded-lg border-slate-200`，Bell/Maximize2 size-4）→ 分隔线 `h-5 w-px bg-slate-200`（20px 短竖线，非通高）→ 账号下拉
- 账号按钮：`rounded-lg border-slate-200 bg-white px-2.5 py-1.5 text-xs text-slate-700`（User size-3.5 + 用户名 + (角色) + ChevronDown size-3.5 text-slate-400）；面板 `absolute right-0 top-full z-[90] mt-2 w-52 rounded-xl border-slate-200 bg-white shadow-lg`
- 角色标签映射：`admin: 管理员，viewer: 只读访客`

### 1.4 内容区与移动端
- `main.min-h-0.flex-1.overflow-y-auto.bg-slate-50.p-3.md:p-5`
- 移动抽屉：遮罩 `bg-slate-900/45`；面板 `w-72 max-w-[85vw] bg-white p-4 shadow-xl`；菜单项高 44px（`h-11 px-3`，touch 模式）
- 壳外挂件：AlarmDrawer、StyleDrawer、LockScreen、Toaster(sonner)、FloatButton

### 1.5 双层守卫（复刻必须两层都做）
1. AuthGuard：无 localStorage token → `/login`；`/api/auth/profile` 校验 `status==='enabled' && roleCode!=='guest'`；loading 态 `bg-[#0a1120]`「加载中…」；拒绝 → AccessGatePage
2. AppShell 二层：`/api/io/auth/me` + casl AbilityProvider；token 中途 401（AUTH_EXPIRED_EVENT）**不跳 /login，进锁屏 LockScreen**

### 1.6 两套控件风格体系（关键，勿混用）

| 维度 | 主平台区（dashboard/realtime/energy/alarms/logs/ahu-overview） | IOServer 管理区（org-scan/devices/gateways/channels…） |
|---|---|---|
| 输入框/下拉圆角 | 8px（分页条数下拉除外） | **0px 全直角** |
| 控件高度 | 筛选 36、按钮 32 | 一律 32 |
| 筛选字号 | 14px | 12px |
| 选中色 | 品牌蓝 lab(44.06…) | #1677FF rgb(22,119,255) |
| 缺省值 | 显示默认选项文本（「全部」「全部楼层」） | placeholder 式「请选择设备状态…」 |
| 行 hover | oklab(0.97 0 0 / 0.5) | 同左；org-scan 页例外 = rgb(245,247,250) |

**生成兜底规则（关键，勿漏）**：未明确分区的页面**默认按 IOServer 区契约**（业务近似：直角 0px、32 高、12px 字）或**主平台区**（展示近似：8px 圆角、36/32 高、14px 字）之一执行，生成时必须**显式声明分区**——禁止落入两套之间的默认 shadcn 形态（如 33 高 / 8px 圆角 / 14px 字，首轮验收 I2 实测 Fail 源）。

---

## 2. 组件契约（shadcn 定制版）

通用前提：`ui/` 依赖平台变量（`--button-outline`/`--badge-outline`/`*-border`/`hover-elevate`/`--elevate-*`），**必须连同 DESIGN-tailwind.css 一起拷贝**，否则 outline/success/warning/elevate 失效。图标统一 lucide-react（禁用 Emoji），组件内默认 `[&_svg]:size-4`。

### 2.1 Button
- 基类：`inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium focus-visible:ring-1 focus-visible:ring-ring disabled:opacity-50 hover-elevate active-elevate-2`
- variant：`default`=bg-primary+border-primary-border；`destructive`=bg-destructive；`outline`=`border var(--button-outline) shadow-xs`；`secondary`=bg-secondary；`ghost`=`border border-transparent`；`link`=`text-primary underline-offset-4 hover:underline`
- size：`default` min-h-9 px-4 py-2 / `sm` min-h-8 px-3 text-xs / `lg` min-h-10 px-8 / `icon` h-9 w-9（min-h 可撑开）
- **hover 禁写 `hover:bg-*`**，规范是 elevate 遮罩（`::after` + `--elevate-1/2`）；全局按钮 hover `translateY(-1px)` + 0.18s 过渡
- 自定义色必须配对前景：`bg-primary text-primary-foreground`

### 2.2 Badge
- 基类：`inline-flex items-center rounded-md border px-2.5 py-0.5 text-xs font-semibold hover-elevate`
- variant：default/secondary/destructive 透明边框实底；`outline` = `border var(--badge-outline) shadow-xs`

### 2.3 Card
- `Card`: `rounded-xl border bg-card border-card-border shadow-sm`（**圆角 12px**，专用 `--card-border`）
- `CardHeader`: `p-6 space-y-1.5`；`CardTitle`: `text-2xl font-semibold tracking-tight`；`CardContent`: `p-6 pt-0`
- 业务 KPI 卡变体（dashboard）：`rounded-xl border-[#e2e8f0] bg-white shadow-[0_2px_8px_rgba(0,0,0,0.03)] hover:shadow-md`，内容 `flex items-center gap-3 p-5`，图标块 `h-10 w-10 rounded-lg`，数值 `text-xl font-bold tabular-nums`，danger 红 `#ef2c2c`
- TONE 色板：blue `bg-[#2563eb]/10 text-[#2563eb]`；orange `#f97316`；red `#ef2c2c`；green `#10b981`（同构 /10 底）

### 2.4 Input
- `h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm`
- hover 也换边框 `enabled:hover:border-ring`；聚焦 `focus-visible:border-ring focus-visible:ring-ring/20 focus-visible:ring-[3px]`；aria-invalid 红 ring
- 暗色页变体：`bg-slate-900 border-slate-700`

### 2.5 Select
- Trigger：`h-9`（sm `h-8`）`rounded-md border px-3 text-sm`；**展开箭头旋转 180°**（`data-[state=open]:[&_svg]:rotate-180`）
- 空值哨兵：`EMPTY_SENTINEL="__dont__use__this__empty__value__"`——业务层可放心用 `""` 作「全部」
- Item：`rounded-sm py-1.5 pl-2 pr-8 text-sm`，选中 `text-primary`，右测 CheckIcon size-4

### 2.6 Dialog
- Content：`fixed top-1/2 left-1/2 z-50 grid gap-4 rounded-lg border p-6 shadow-lg max-w-lg`
- **默认自带右上角 X**，禁止内容区重复自绘关闭钮（`showCloseButton={false}` 才自绘）
- Header `text-center sm:text-left`；Footer `flex-col-reverse sm:flex-row sm:justify-end`
- 表单弹窗统一 `sm:max-w-md`（RoleFormDialog sm:max-w-lg；PointsDialog max-w-2xl）

### 2.7 Table
- 外层自动包 `data-slot="table-container"` 的 `relative w-full overflow-x-auto`
- TableHead `h-10 px-2 text-left font-medium whitespace-nowrap`；TableCell `p-2 align-middle whitespace-nowrap`；TableRow `hover:bg-muted/50 data-[state=selected]:bg-muted border-b`
- 业务表头（列表页模式）：`border-b bg-muted/50 text-left text-xs text-muted-foreground`（th p-2）
- 固定列滚动阴影：`.fixed-cell { position: sticky }` + `data-scrolled="true"` 时 8px 左渐变

### 2.8 Tabs
- TabsList `h-9 rounded-lg bg-muted p-[3px]`；Trigger 激活 `bg-background shadow-sm font-medium`

### 2.9 其余要点
- Label `font-normal`（非标准加粗）；Switch 轨道 `h-[1.15rem] w-8` 选中 bg-primary；Checkbox `size-4 rounded-[4px]` 支持 indeterminate
- Tooltip 深底白字反转：`bg-foreground text-background rounded-md px-3 py-1.5 text-xs shadow-md` + 箭头 `size-2.5 rotate-45`；`delayDuration=0`
- Spinner `Loader2Icon size-4 animate-spin`；Skeleton `bg-accent animate-pulse rounded-md`
- Alert 新增 success/warning 变体（`bg-success/warning` + `/50` 边框 + `/90` 描述）
- Empty 六件套：容器 `rounded-lg border-dashed p-6 md:p-12 text-center`，Media `size-10 rounded-lg bg-muted`

### 2.10 业务组件（business-ui，脱离妙搭环境需改造）
- 强约束：必须受控（value+onChange 成对）；禁止 undefined；空值 单选 `null` / 多选 `[]`；自带搜索数据源
- UserSelect（ID 模式）/ DepartmentSelect（对象模式）/ ChatSelect（chatID）/ UserDisplay（禁直接文本展示 user_id）/ UserProfile / form 字段族 / EntityCombobox

---

## 3. 页面模式库

### 模式 A：列表页（devices/Users/Roles/AlarmRules 共用）
```
根容器 space-y-3
├─ 操作行：Button「新增XX」或 flex items-center gap-3（搜索 Input + 筛选 + 操作钮 ml-auto）
├─ 表格容器 rounded-md border > table.w-full.text-sm
│   thead: tr.border-b.bg-muted/50.text-left.text-xs.text-muted-foreground（th p-2）
│   tbody 行: tr.border-b（可点行 + cursor-pointer hover:bg-muted/50）
│   空态: p-8 text-center text-sm text-muted-foreground「暂无XX」
└─ 表单 Dialog（模式 C）
```
- 数据 `usePollingQuery([资源,'list',…筛选], url, 30000)`；写后 `qc.invalidateQueries([资源])`
- 操作列单元格 `onClick={e=>e.stopPropagation()}` 防触发行点击
- 轮询间隔：devices 15s；system 各页 30s（UserAccess roles 60s；energy 60s）；Monitor 8s；Realtime 有人云走 SSE

### 模式 B：详情页（DeviceDetailPage）
```
头行 flex flex-wrap items-center gap-x-3 gap-y-2
├─ 返回 Button(outline, sm) → 列表
├─ h1 text-lg font-semibold + 编号 font-mono text-xs text-muted-foreground
├─ 类型 Badge(outline) + 状态点 h-2 w-2 rounded-full
└─ 编辑 Button(ml-auto)
Tabs(defaultValue=主tab)：表格 tab / 时间线 tab / 基础信息 dl tab
加载/错误态：p-8 text-center text-sm text-muted-foreground（「加载中…」/「XX不存在」）
```

### 模式 C：表单弹窗（6 个 Dialog 共用骨架）
```
Dialog > DialogContent.sm:max-w-md
├─ DialogTitle（新增XX / 编辑XX 随 editing 状态切换；editing 三态 'new'|Row|null）
├─ 字段单元 div.space-y-1(.5) > Label + Input/Select/Textarea；多列 grid grid-cols-2|3 gap-2|3
├─ 错误：text-xs text-red-500（亮）/ text-red-400（暗）
└─ DialogFooter > 取消(outline) + 保存(disabled=必填校验||loading)
```
- 两种实现：react-hook-form + zod（`zodResolver`，errors.xxx.message）或 useState 受控（`setForm({...form,k:v})` + row 变化回填）
- loading 文案统一：`提交中…/保存中…/测试中…/登录中…`

### 模式 D：确认/危险操作
- 删除确认：AlertDialog「…且不可恢复。确定继续吗？」+ 红色确认钮 `bg-red-600 hover:bg-red-500`
- 轻量删除（测点）：直接执行 + toast
- 全部确认按钮 disabled 由列表状态决定

### 模式 E：实时数据
- 轮询 `usePollingQuery`；SSE：`new EventSource('/api/realtime/usr-stream?token=…')` token 走 query；open→live、points→合并、error→自动重连；卸载 close
- 值闪烁 useFlash：值变化才闪，同页 8s 至多一次，`animate-pulse`
- 陈旧判定 isStale：超 DATA_STALE_MS 整行 `opacity-40`

### 模式 F：双主题
- 亮色（语义 token）：dashboard/devices/energy/alarms/system
- 暗色（绝对值）：monitor/analysis/gate/login/接入管理——页底 `#0a1120`，KPI 卡 `#0f1b31`，内容卡 `#0d1728`，输入 `bg-slate-900 border-slate-700`，主按钮 `bg-cyan-600 hover:bg-cyan-500`，文字 slate-100/400/500；图表轴 `#64748b`、图例 `#94a3b8`、青 `#22d3ee`、绿 `#34d399`

### 模式 G：图表挂载（两种，二选一勿混）
- 手动 echarts.init：ref + `chart ??= echarts.init(el)` 惰性单例 + ResizeObserver resize + 卸载 dispose；容器 `h-56|h-64|h-72 w-full min-w-[480|560px]` 包 `overflow-x-auto`
- ReactECharts（echarts-for-react）：`<ReactECharts className="h-[320|340]px min-w-[560px]">`
- 图表高度由容器 class 定，不是 option 控制；ResizeObserver 必须（侧栏收展改宽）
- 通用 option：`tooltip:{trigger:'axis'}`；`grid:{left:48,right:16~48,top:16~36,bottom:28~40}`；趋势线 `showSymbol:false`；能耗柱 `itemStyle:{color:'hsl(199 89% 48%)'}`、饼 `radius:['40%','70%'] legend bottom:0`；状态环 `radius:['55%','80%']`

### 模式 H：三态规范
- 空态：`p-8|p-6 text-center text-sm text-muted-foreground`（暗色 `text-slate-500` + `h-[300px]` 占位）；文案句式「暂无XX」「该时段暂无能耗数据」「当前筛选下暂无报警」
- 加载态：同空态样式；LoginPage 专属 probing 全屏遮罩
- 错误态：toast(sonner) / 表单内 `text-xs text-red-500|400` / 页面条 `rounded-md border-red-500/30 bg-red-500/10`（暗色 /40）

### 模式 I：工艺图（BindingSvg）
- `viewBox="0 0 1200 800" preserveAspectRatio="xMidYMid meet"`，class `h-full max-h-[78vh] w-full`
- 管道双层描边：外层 `hsl(215 20% 80%)` strokeWidth 18，内层冷冻水 `hsl(201 94% 44%)` / 冷却水 `hsl(24 94% 55%)` strokeWidth 10；内层流动 `strokeDasharray="12 8"` + `schem-flow` 动画（1.2s，dashoffset→-40）
- 绑定点：位图 `<image 120×120>` 或 `<circle r=14>` 三色（正常 `hsl(142 71% 45%)` / 预警 `hsl(38 92% 50%)` + amber / 报警 `hsl(0 72% 51%)` + blink）；标签 `text-[13px] fill-foreground`，数值 `text-[15px] font-semibold`（报警 fill-destructive / 预警 fill-amber-500），无值 `—`，格式 `${v}${unit?' '+unit:''}`
- stale 点整组 `opacity-40` + `<title>数据可能滞后</title>`；位图须上传妙搭文件存储并在 SCHEM_ASSET_URL 登记，本地相对路径生产取不到
- 组态大屏 Schematic（monitor）：viewBox `1200×620`，画布底 `#2f314a`；管路**四层描边**（11 边 `#0b1220` → 8 base → 4 hi opacity .35 → 2.5 flow）；CW `#c2410c/#fdba74/#fb923c`、CHW `#1e40af/#93c5fd/#60a5fa`；`pipe-anim` dasharray 10 14；StatusSquare 16×16（running 绿+白勾 / stopped 空心 / fault 红+alarm-pulse）；设备 hover `brightness(1.2)`

### 模式 J：登录页状态机
- `Mode = choose | probing | form | qr | phone-confirm`
- **挂载即无条件免登探测**（apiProbe 4s 超时）→ 成功直进系统；失败**显式停留** choose（禁止失败仍跳转=闪屏）
- probing 全屏遮罩**不渲染任何登录表单**：`bg-[hsl(224_50%_12%)]` + Loader2 `h-8 w-8 animate-spin text-cyan-300`「正在进入…」
- 卡片统一：`max-w-sm rounded-xl border-white/10 bg-white/5 p-8 backdrop-blur`（暗玻璃）
- 扫码轮询 2.5s qr-status；expired →「二维码已过期，请重新发起」

---

## 4. 交互规则（12 项红线 + 线上实测契约，全部强制）

> 来源：有人云 UI 复刻红线清单 + 04-interactions playwright 实测。逐项核对，缺一不可。
> ⚠️ 本节与 `.codem/memory/usr-ui-redlines.md` **同源**；单源维护点在 DESIGN.md，memory 侧为会话注入副本——更新时改本节并同步 memory，勿单边漂移。

1. **下拉框缺省值**：主平台区默认不空，直接显示默认选项文本（「全部」「全部楼层」「全部级别」）；IOServer 区显示 placeholder 式提示（「请选择设备状态」）。不许做成空+placeholder 代替主平台区缺省。
2. **下拉框选项清单**：逐个抄录全部选项及顺序（如级别=紧急/重要/一般；状态=未确认/已确认/已处置；设备状态=全部状态/在线/离线/休眠/报警/未配置；网关状态=全部状态/离线/在线/休眠/升级中/配置中/网关报警/已禁用）。不许自拟选项文案。
3. **下拉展开效果**：面板圆角 0px、阴影 none、底色透明（依赖宿主背景）；面板宽 ≈ 触发器宽 +14~18px；选项高 32px（14px 字，主平台）/34px（12px 字，IOServer 状态类）/28px（分页条数 14px 字）；选中品牌蓝（主平台 lab(44.06…) / IOServer rgb(22,119,255)），未选中近黑 lab(7.78 0 0) 或灰 rgb(96,98,102)；箭头展开旋转 180°。
4. **输入框 placeholder**：照抄原文（「搜索测点/设备名」「搜索变量名」「请输入设备名称」「请输入SN或网关名称」「变量名/显示名/分组」「关键词（消息/请求路径/用户名）」），不许自拟简写。
5. **控件外观**：主平台筛选 200~320×36、圆角 8px；IOServer 一律 32 高、圆角 0；分页条数下拉 88×32、直角、12px；边框 rgb(231,233,241)；文字 rgb(96,98,102)。
6. **聚焦/悬停**：聚焦边框品牌蓝（Input 契约 `focus-visible:border-ring ring-[3px]`）；hover 边框 `enabled:hover:border-ring`。
7. **按钮形态**：主操作=品牌蓝实底白字圆角 8px 高 32（查询 46×32、扫描 122×32、新增规则 90×38、全部确认 90×36）；ghost=透明底黑字 `rgba(0,0,0,0.1)` 边框高 32；危险红=bg lab(48.4493 77.4328 61.5452) 白字；表格操作列=透明底 `rgb(22,119,255)` 蓝字按钮连排无分隔符；**按钮数量按页实测**（设备页 5 个：查看/同步/编辑/运行组态/删除）。
8. **分页完整形态**（el-pagination）：`共 N 条 | N 条/页 | 上一页 | 页码… | 下一页 | 前往 | 页`；页码 28×28 直角，当前页 bg rgb(22,119,255) 白字同色边框，非当前白底 rgb(96,98,102) 字；「上一页/下一页」48×28 **文字按钮非箭头**，首末页置灰 rgb(192,196,204)；页码算法当前页≤4 时 `1 2 3 4 5 6 … 末页`；「前往」输入框 56×28 圆角 10px；条数选项各页不同（8/12/16/24、10/20/50、5/10/15/20）；单页仍渲染完整分页 next disabled。
9. **表格列内容形态**：行高按页（密集表 37px / 数据表 46~49px）；空态=表头照常渲染+空态句子；开关型变量（dataType=bit）当前值列不是数值——bit 读写=开关 40×20（可点击设值）、bit 只读=25×25 圆点（1 蓝实心/0 灰空心）；数值列 tabular-nums。
10. **Tab/置灰态**：无数据源 Tab 置灰 + hover 提示「请在有人云平台查看」；Tab 选中两种：白底高亮（realtime/energy）或品牌蓝实底（logs）。
11. **缺控件/多控件**：筛选栏控件清单以实测为准（有人云详情页只有变量类型+状态+变量名三控件——曾多加变量ID框）。
12. **翻页后差异**：必须翻到第 2 页再看一遍（第 1 页通过≠第 2 页一致；分页形态不变、首行数据变化为正常）。

### 补充实测契约
- 表格行 hover：主平台/多数 IOServer 页 `oklab(0.969998 0 0 / 0.5)`；**org-scan 页例外** `rgb(245,247,250)`——同站两种 hover，按页核对
- 状态徽标三态通用色：在线=绿字 lab(55.05…) + 绿 15% 透明底；离线=近黑字+浅灰底；连接正常=品牌蓝实底白字（channels 独有）
- 顶栏全站结构一致：`一级菜单名 / 二级菜单名 / 样式 / 实时链路在线 / 用户名(角色)`；常驻按钮：打开导航菜单/收起菜单/样式/打开实时告警/进入全屏

---

## 5. Do & Don't

### Do
- 以 AppShell 为外壳蓝本（侧栏 256↔80 可折叠 + h-14 顶栏 + bg-slate-50 内容区）
- 侧栏阴影双写（内侧高光+外投影）；面包屑当前页用胶囊
- token 照抄 oklch 原值；slate-500/600/700 钉回 hex（#64748b/#475569/#334155）
- 主题切换走 next-themes `attribute="class"` + `<html>` dataset（themeColor/fontsize/menu/animate 四个）
- 按钮全局 hover `translateY(-1px)` 0.18s；elevate 遮罩代替 hover:bg-*
- 单子项分组渲染一级大按钮；菜单激活 `bg-primary text-white`；权限不足置灰且点击拦截
- 双层守卫都做；token 中途过期进锁屏而非跳 /login
- 图表 ResizeObserver 必须；工艺图位图上传文件存储后登记映射表
- 图标 lucide-react，尺寸约定：菜单 `size-4`、顶栏小图标 `size-3.5`、分组箭头 `size-[13px]`、汉堡/关闭 `size-5`
- KPI 数值 `tabular-nums`；离线/未确认报警 danger 红 #ef2c2c

### Don't
- ❌ 不要用旧版 `components/Layout.tsx` 复刻框架（暗色 cyan 三菜单，路由已不引用）
- ❌ 暗色下不要给 info/success/warning 另配值（未覆写，沿用浅色）
- ❌ 不要动 shadcn `--accent` 做品牌强调——cyan 有专用 `--brand-accent`
- ❌ 「顶部布局」选项不要实现功能（仅存值，UI 恒 disabled）
- ❌ 不要用默认 OKLCH slate 写新组件；hover 效果不要写 `hover:bg-*`
- ❌ Dialog 默认有关闭 X，不要重复自绘
- ❌ Select 空字符串 value 走哨兵机制，不要绕过
- ❌ 不要混淆 ui/chart.tsx（Recharts，未用）与 charts/（ECharts 实际路线），二选一
- ❌ 顶栏分隔线是 20px 短竖线，不是通高
- ❌ 复刻有人云页面不能只对比静态布局——12 项交互态逐项实测（红线 5）
- ❌ 探测失败仍跳转=闪屏，登录失败路径必须显式停留+提示
- ❌ 不要把 devices/gateways 下拉第二次展开的 optionH=0 采集异常当真实规格（以同页首次有效展开为准）

---

## 6. 通用模块模板（业务无关，直接复用）

### 6.1 权限体系
- 权限模型：`module:action` 串——7 模块（dashboard 运行总览 / process 系统工艺图 / realtime 实时监控 / energy 能耗分析 / alarms 报警中心 / devices 设备管理 / system 系统管理）× 2 动作（view 查看 / operate 操作）
- 角色矩阵编辑（RolesPage）：`MODULES × ACTIONS` Checkbox 网格，`aria-label={m.label-a.label}`
- 三层控制：路由级（未登录→/login；未授权→AccessGatePage）→ 菜单级（`(!c.roles||includes) && (!c.perm||ability.can)`，空分组整组隐藏）→ 后端接口鉴权
- 待开通审批流：Tabs「待开通（N）/已开通（N）」+ ApproveDialog（角色 Select 默认 viewer，白名单 `APPROVABLE_ROLE_CODES=['viewer','operator']`）
- 状态徽章：pending `bg-amber-500/15 text-amber-400 border-amber-500/30`；disabled `bg-red-500/15 text-red-400`；其余 `bg-emerald-500/15 text-emerald-400`

### 6.2 表格筛选区
- 主平台：`flex flex-wrap items-center gap-2|3`——搜索 Input（`w-64`，placeholder 照抄）+ Tabs 状态组 + Select 筛选 + 主按钮 `ml-auto`
- IOServer：`flex gap`，控件一律 32 高直角 12px 字——状态下拉 144×32 + 搜索 192×32 + 查询 46×32 品牌蓝实底 + 工具条（扫描类实底 + 添加/批量 ghost + 视频教程蓝字链接）
- 筛选状态进 queryKey（轮询自动响应）；URL query 驱动筛选（`?status=online`）+ Badge 显示当前筛选

### 6.3 状态徽章
```
在线/正常:  绿字 + 绿 15% 透明底     bg-emerald-500/15 text-emerald-300|emerald-600
离线:      近黑字 + 浅灰底
未确认:    bg-red-500/15 text-red-500
已确认:    bg-amber-500/15 text-amber-500
已处置:    bg-emerald-500/15 text-emerald-600
紧急/重要/一般 左色条: bg-red-500 / bg-amber-500 / bg-sky-500（缺省 bg-slate-400）
连接正常:   品牌蓝实底白字（唯一反白徽标）
```
- 状态点（行内）：`h-2 w-2 rounded-full` + STATUS_STYLE {normal: bg-emerald-500, warning: bg-amber-500, alarm: bg-red-500}，离线 bg-zinc-400

### 6.4 KPI 卡行
- 布局 `grid grid-cols-2 gap-4 xl:grid-cols-4`（dashboard）/ `grid grid-cols-2 md:grid-cols-4|5 gap-3`（暗色页）
- 亮色卡：图标块 `h-10 w-10 rounded-lg` TONE 色板 + 数值 `text-xl font-bold tabular-nums` + 标签 `text-[12px] text-[#94a3b8]` + 单位小号灰；可点卡=Link 包装
- 暗色卡：`bg-[#0f1b31] border-slate-800 px-4 py-3`，数值 `text-2xl font-semibold tabular-nums`，主题色 emerald-300/cyan-300/sky-300/amber-300；有活动告警全卡加 `border-red-500/50`
- TOP 排行行：`flex h-8 items-center gap-3 text-[13px] text-[#475569]` + 序号块 `h-5 w-5 rounded bg-[#f8fafc] text-[11px] tabular-nums text-[#94a3b8]`（`padStart(2,'0')`）

### 6.5 空态/分页/操作列
- 空态：见模式 H；分页：见交互规则 8；操作列文字按钮连排 + `stopPropagation`

---

## 附：交付配套
- Tailwind v4 token CSS：`DESIGN-tailwind.css`（与本文件同目录，`@import` 即用）
- 复刻验收：UI 改动上线当天必须 playwright 双站 DOM computed style 全指标自动对比（侧栏/顶栏/内容区/主题变量/菜单 + 12 项交互态），禁止等用户圈图

---

## 修订记录

| 日期 | 修订内容 | 来源 |
|---|---|---|
| 2026-09-21 | 评审修复（06-skill-review.md）：① S1 头部新增「冲突以 DESIGN.md 为准」规则句，确认侧栏展开 w-64=256px ↔ 折叠 w-20=80px（SKILL.md 旧值 224px 为错误值）；② M2 新增 §0 场景路由表；③ M1 头部 195 行 YAML token 色表拆出至 DESIGN-tokens.yaml（新增 tokens.json 结构化单源），正文仅留摘要；④ M5 新增本修订记录章节；⑤ L1 §4 标注与 memory/usr-ui-redlines.md 同源关系；⑥ L4 §1.6 新增未分区页面生成兜底规则 | 06-skill-review.md 评审（S1/M2/M1/M5/L1/L4） |
