# 03 · 组件层知识库（妙搭空调平台 client）

> 对象：`app/client/src/components/`。所有 class / 色值 / 尺寸均**从源码原文抄录**，未做换算或臆测。
> 目录结构：`Layout.tsx`（应用骨架）、`ui/`（shadcn 组件库）、`business-ui/`（飞书业务组件）、`charts/`（ECharts 封装）、`schematic/`（工艺图 SVG）。
> **瘦身版（2026-09-21 评审 M1）**：正文保留，头部新增组件名索引供按需直达，勿整读全文。完整历史见 git / `docs/ui/knowledge/` 归档。

## 组件索引（按名直达）

| 组件 | 小节 | 组件 | 小节 |
|---|---|---|---|
| Accordion | §1.1 清单 | AlertDialog | §1.1 清单 |
| Alert | §2.3 | AspectRatio / Avatar | §1.1 清单 |
| Badge | §2.2 | Breadcrumb / ButtonGroup / Calendar | §1.1 清单 |
| Button | §2.1 | Card | §2.4 |
| Carousel / Chart(Recharts) / Checkbox / Collapsible | §1.1 / §2.10 | Command / ContextMenu / Drawer / DropdownMenu | §1.1 清单 |
| Empty / Field / Form / HoverCard | §2.10（Empty）/ §1.1 | icons/（23 个彩色文件图标） | §一、三 |
| Image / Input / InputGroup / InputOtp / Item / Kbd | §1.1（Input=§2.5） | Label / Markdown / Menubar / NativeSelect / NavigationMenu | §1.1（Label=§2.10） |
| Pagination / Popover / Progress / RadioGroup / Resizable | §1.1 清单 | ScrollArea / Separator / Sheet / Sidebar(727行) | §1.1 清单 |
| Select | §2.6 | Skeleton / Slider / Sonner / Spinner / Switch | §2.10 |
| Table | §2.8 | Tabs | §2.9 |
| Textarea / Toggle / ToggleGroup / Tooltip | §1.1（Tooltip=§2.10） | Dialog | §2.7 |
| UserSelect / DepartmentSelect / ChatSelect / UserDisplay / UserProfile / form / EntityCombobox | §2.11（清单=§1.2） | PowerTempChart / StatusDonut | §4.2 / §4.3 |
| BindingSvg（工艺图） | §五 | Layout（旧版根骨架） | §5.1 |

---

## 一、组件全量清单

### 1.1 ui/ —— shadcn 组件（42 个 .tsx + README + icons/）

| 组件 | 文件 | 用途 | 来源 |
|---|---|---|---|
| Accordion / AlertDialog / Alert / AspectRatio / Avatar | accordion/alert-dialog/alert/aspect-ratio/avatar.tsx | 折叠面板/确认弹窗/提示条/比例容器/头像 | shadcn 标准 + 定制 |
| Badge / Breadcrumb / Button / ButtonGroup / Calendar | badge/breadcrumb/button/button-group/calendar.tsx | 标签/面包屑/按钮/按钮组/日历 | 同上 |
| Card / Carousel / Chart / Checkbox / Collapsible | card/carousel/chart/checkbox/collapsible.tsx | 卡片/轮播/**Recharts 图表容器**/复选/折叠 | 同上 |
| Command / ContextMenu / Dialog / Drawer / DropdownMenu | command/context-menu/dialog/drawer/dropdown-menu.tsx | 命令面板/右键菜单/对话框/抽屉/下拉菜单 | 同上 |
| **Empty** / Field / Form / HoverCard / **icons/**（23 个文件类型图标） | empty/field/form/hover-card.tsx、icons/ | 空态/表单字段/表单/hover 卡片/彩色文件图标 | Empty 与 icons 为平台定制 |
| Image / Input / InputGroup / InputOtp / Item / Kbd | image/input/input-group/input-otp/item/kbd.tsx | 图片/输入框/输入组/OTP 输入/列表项/键帽 | shadcn 标准 + 定制 |
| Label / Markdown / Menubar / NativeSelect / NavigationMenu | label/markdown/menubar/native-select/navigation-menu.tsx | 标签/MD 渲染/菜单栏/原生下拉/导航菜单 | 同上 |
| Pagination / Popover / Progress / RadioGroup / Resizable | pagination/popover/progress/radio-group/resizable.tsx | 分页/气泡/进度条/单选组/可调尺寸面板 | 同上 |
| ScrollArea / Select / Separator / Sheet / **Sidebar**(727 行) | scroll-area/select/separator/sheet/sidebar.tsx | 滚动区/下拉选择/分隔线/侧滑抽屉/完整侧栏体系 | 同上 |
| Skeleton / Slider / Sonner / **Spinner** / Switch / Table | skeleton/slider/sonner/spinner/switch/table.tsx | 骨架屏/滑杆/toast/加载图标/开关/表格 | 同上 |
| Tabs / Textarea / Toggle / ToggleGroup / Tooltip | tabs/textarea/toggle/toggle-group/tooltip.tsx | 标签页/多行输入/切换按钮/切换组/提示 | 同上 |

**图标方案（README 原文）**：「图标库：必须使用 `lucide-react`，禁用 Emoji」。`icons/` 目录为补充的 23 个彩色文件类型 SVG（`FileWikiPdfColorfulIcon` 等，每个是单文件 React 组件，`viewBox="0 0 24 24"`、品牌色 path，如 PDF `fill="#F54A45"`/折角 `#C02A26`），与 lucide 单色线性图标并存：**功能图标用 lucide，文件类型彩色徽标用 icons/**。

### 1.2 business-ui/ —— 飞书业务组件

| 组件 | 路径 | 用途 |
|---|---|---|
| UserSelect | `@/components/business-ui/user-select` | 表单人员选择（ID 模式，单/多选） |
| DepartmentSelect | `@/components/business-ui/department-select` | 表单部门选择（对象模式） |
| ChatSelect | `@/components/business-ui/chat-select` | 表单群组选择（ID=飞书 chatID） |
| UserDisplay | `@/components/business-ui/user-display` | 用户头像+姓名展示，点击弹 UserProfile |
| UserProfile | `@/components/business-ui/user-profile/user-profile` | 用户详情卡片（简单卡片 / 飞书官方卡片双模式） |
| EntityCombobox | `business-ui/entity-combobox/` | 实体搜索下拉（含 use-fetch-data/use-infinite-scroll hooks） |
| form/ | `business-ui/form/` | 表单字段族（input/select/checkbox/radio/switch/textarea-field + FieldLayout） |
| api/ | `business-ui/api/`（chats/departments/users/files/user-profiles） | 组件自带数据源 SDK |
| types/ utils/ | — | 共享类型（Department/Chat）与工具 |

### 1.3 charts/ 与 schematic/

| 组件 | 文件 | 用途 |
|---|---|---|
| PowerTempChart | charts/PowerTempChart.tsx | 功率柱 + 回水温度线 双轴图 |
| StatusDonut | charts/StatusDonut.tsx | 设备状态三色环图 |
| BindingSvg | schematic/BindingSvg.tsx | 冷站工艺图（SVG 管道 + 测点绑定） |
| Layout（根组件） | Layout.tsx | 深色侧栏骨架 + 路由出口 |

---

## 二、常用组件契约（源码原文）

### 2.1 Button（button.tsx）

cva 基类原文：

```
"inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 hover-elevate active-elevate-2"
```

- variant：
  - `default`: `"bg-primary text-primary-foreground border border-primary-border"`
  - `destructive`: `"bg-destructive text-destructive-foreground border border-destructive-border"`
  - `outline`: `"border [border-color:var(--button-outline)] shadow-xs active:shadow-none"`
  - `secondary`: `"bg-secondary text-secondary-foreground border border-secondary-border"`
  - `ghost`: `"border border-transparent"`（透明边框防切换抖动，源码注释原意）
  - `link`: `"text-primary underline-offset-4 hover:underline"`
- size：`default: "min-h-9 px-4 py-2"` / `sm: "min-h-8 rounded-md px-3 text-xs"` / `lg: "min-h-10 rounded-md px-8"` / `icon: "h-9 w-9"`（高度用 min-h，大内容可撑开——源码注释）
- **定制点 vs 标准 shadcn**：hover/active 不用 bg-* 类，走 `hover-elevate` / `active-elevate-2` 遮罩工具类（README：通过 `::after` 伪元素叠加 `--elevate-1`/`--elevate-2`）；outline 用 CSS 变量 `--button-outline`；default/destructive/secondary 均带 `border-*-border` 同色描边。
- 支持 `asChild`（Radix Slot）。自定义颜色必须配对前景色：`className="bg-primary text-primary-foreground"`。

### 2.2 Badge（badge.tsx）

基类：`"whitespace-nowrap inline-flex items-center rounded-md border px-2.5 py-0.5 text-xs font-semibold hover-elevate"`

- `default`: `"border-transparent bg-primary text-primary-foreground shadow-xs"`
- `secondary`: `"border-transparent bg-secondary text-secondary-foreground"`
- `destructive`: `"border-transparent bg-destructive text-destructive-foreground shadow-xs"`
- `outline`: `"border [border-color:var(--badge-outline)] shadow-xs"`
- 定制点：同样用 `hover-elevate`；outline 边框走 `--badge-outline` 变量。

### 2.3 Alert（alert.tsx）——**相对标准 shadcn 新增 success/warning 变体**

基类（grid 布局，svg 占首列）：

```
"relative w-full rounded-lg border px-4 py-3 text-sm grid has-[>svg]:grid-cols-[calc(var(--spacing)*4)_1fr] grid-cols-[0_1fr] has-[>svg]:gap-x-3 gap-y-0.5 items-start [&>svg]:size-4 [&>svg]:translate-y-0.5 [&>svg]:text-current"
```

- `default`: `"bg-card text-card-foreground"`
- `destructive`: `"text-destructive bg-card [&>svg]:text-current *:data-[slot=alert-description]:text-destructive/90"`
- `success`: `"bg-success text-success-foreground border-success/50 [&>svg]:text-success-foreground *:data-[slot=alert-description]:text-success-foreground/90"`
- `warning`: `"bg-warning text-warning-foreground border-warning/50 [&>svg]:text-warning-foreground *:data-[slot=alert-description]:text-warning-foreground/90"`
- 子组件：`AlertTitle`（`"col-start-2 line-clamp-1 min-h-4 font-medium tracking-tight"`）、`AlertDescription`（`"text-muted-foreground col-start-2 grid justify-items-start gap-1 text-sm [&_p]:leading-relaxed"`）。

### 2.4 Card（card.tsx）

- `Card`: `"rounded-xl border bg-card border-card-border text-card-foreground shadow-sm"`（注意圆角是 **rounded-xl**，且用 `border-card-border` 专用边框变量）
- `CardHeader`: `"flex flex-col space-y-1.5 p-6"`
- `CardTitle`: `"text-2xl font-semibold leading-none tracking-tight"`
- `CardDescription`: `"text-sm text-muted-foreground"`
- `CardContent`: `"p-6 pt-0"`；`CardFooter`: `"flex items-center p-6 pt-0"`

### 2.5 Input（input.tsx）

```
"file:text-foreground placeholder:text-muted-foreground selection:bg-primary selection:text-primary-foreground dark:bg-input/30 border-input h-9 w-full min-w-0 rounded-md border bg-transparent px-3 py-1 text-base transition-[color,box-shadow] outline-none file:inline-flex file:h-7 file:border-0 file:bg-transparent file:text-sm file:font-medium disabled:cursor-not-allowed disabled:opacity-50 md:text-sm"
"enabled:hover:border-ring focus-visible:border-ring focus-visible:ring-ring/20 focus-visible:ring-[3px]"
"aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive"
```

定制点：hover 也换边框色（`enabled:hover:border-ring`），聚焦 3px ring。

### 2.6 Select（select.tsx）

- **空值哨兵机制**（定制）：`const EMPTY_SENTINEL = "__dont__use__this__empty__value__"`——Radix 不允许空字符串 value，Root/Item 双侧映射 `"" ↔ EMPTY_SENTINEL`，`onValueChange` 还原为 `""`。
- `SelectTrigger`（size `sm|default`，`data-[size=default]:h-9 data-[size=sm]:h-8`）核心样式：

```
"border-input data-[placeholder]:text-muted-foreground data-[state=open]:border-ring [&_svg:not([class*='text-'])]:text-muted-foreground focus-visible:border-ring focus-visible:ring-ring/20 ... rounded-md border bg-transparent px-3 py-2 text-sm ... enabled:hover:border-ring disabled:cursor-not-allowed disabled:opacity-50 ... [&_svg]:transition-transform [&_svg]:duration-200 data-[state=open]:[&_svg]:rotate-180"
```

（展开时箭头旋转 180°——与有人云 el-select 行为一致。）
- `SelectContent`：`position = "popper"`, `align = "center"` 默认；`"bg-popover text-popover-foreground ... rounded-md border shadow-md"` + 入场动画类。
- `SelectItem`：`"focus:bg-accent focus:text-accent-foreground data-[state=checked]:text-primary ... rounded-sm py-1.5 pr-8 pl-2 text-sm"`，右测 CheckIcon `size-4`；禁用项拦截 onClick/onPointerDown（定制）。
- `SelectLabel`: `"text-muted-foreground px-2 py-1.5 text-xs"`。

### 2.7 Dialog（dialog.tsx）

- `DialogContent`：`showCloseButton = true` 默认右上角 X（`XIcon`）——README 规定：默认 close 存在时**禁止**在内容区再放自定义关闭按钮；设 `showCloseButton={false}` 才自绘。
- 核心样式：`"bg-background ... fixed top-[50%] left-[50%] z-50 grid w-full max-sm:max-w-[calc(100%-2rem)] translate-x-[-50%] translate-y-[-50%] gap-4 rounded-lg border p-6 shadow-lg duration-200 max-w-lg"`
- `DialogOverlay`: `"fixed inset-0 z-50 bg-black/50"`（+fade/zoom 动画）。
- `DialogHeader`: `"flex flex-col gap-2 text-center sm:text-left"`；`DialogFooter`: `"flex flex-col-reverse gap-2 sm:flex-row sm:justify-end"`；`DialogTitle`: `"text-lg leading-none font-semibold"`；`DialogDescription`: `"text-muted-foreground text-sm"`。

### 2.8 Table（table.tsx）

- `Table` 外层自动包 `data-slot="table-container"` 的 `"relative w-full overflow-x-auto"`；表体 `"w-full caption-bottom text-sm"`。
- `TableHead`: `"text-foreground h-10 px-2 text-left align-middle font-medium whitespace-nowrap"`；`TableCell`: `"p-2 align-middle whitespace-nowrap"`；`TableRow`: `"hover:bg-muted/50 data-[state=selected]:bg-muted border-b transition-colors"`；`TableFooter`: `"bg-muted/50 border-t font-medium"`。

### 2.9 Tabs（tabs.tsx）

- `TabsList`: `"bg-muted text-muted-foreground inline-flex h-9 w-fit items-center justify-center rounded-lg p-[3px]"`
- `TabsTrigger`: `"data-[state=active]:bg-background ... inline-flex h-[calc(100%-1px)] flex-1 items-center justify-center gap-1.5 rounded-md border border-transparent px-2 py-1 text-sm data-[state=active]:font-medium ... data-[state=active]:shadow-sm"`

### 2.10 其余小组件要点

- **Spinner**：`Loader2Icon` + `role="status" aria-label="Loading"`，`"size-4 animate-spin"`。
- **Skeleton**：`"bg-accent animate-pulse rounded-md"`。
- **Separator**：`"bg-border shrink-0 data-[orientation=horizontal]:h-px ... data-[orientation=vertical]:w-px"`。
- **Label**：`"flex items-center gap-2 text-sm leading-none font-normal select-none"`（注意 `font-normal`，非标准加粗）。
- **Switch**：轨道 `"inline-flex h-[1.15rem] w-8 shrink-0 items-center rounded-full border border-transparent"`，`data-[state=checked]:bg-primary data-[state=unchecked]:bg-input`；thumb `"bg-background ... block size-4 rounded-full ... data-[state=checked]:translate-x-[calc(100%-2px)]"`。
- **Checkbox**：`size-4 rounded-[4px]`，扩展 `indeterminate` prop（三态，MinusIcon）；`onCheckedChange` 在传入 indeterminate 时只回调 boolean。
- **Avatar**：`"relative flex size-8 shrink-0 overflow-hidden rounded-full"`，Fallback `"bg-muted"`。
- **Tooltip**：`delayDuration=0` 默认，Content `"bg-foreground text-background ... rounded-md px-3 py-1.5 text-xs ... shadow-md"` + Arrow `"bg-foreground fill-foreground z-50 size-2.5 ... rotate-45 rounded-[2px]"`（**深底白字反转风格**）。
- **Empty**（空态，六件套 `Empty/EmptyHeader/EmptyMedia/EmptyTitle/EmptyDescription/EmptyContent`）：容器 `"flex min-w-0 flex-1 flex-col items-center justify-center gap-4 rounded-lg border-dashed p-6 text-center text-balance md:p-12"`；`EmptyMedia variant="icon"` 为 `"bg-muted text-foreground flex size-10 ... rounded-lg [&_svg:not([class*='size-'])]:size-6"`；标题 `"text-base font-medium tracking-tight"`。
- **Image**：`interface ImageProps extends React.ImgHTMLAttributes<HTMLImageElement>`；规范：响应式必传 `sizes`，固定尺寸必传 number `width`，必传有意义 `alt`。
- **Chart（ui/chart.tsx）**：Recharts 版 ChartContainer/ChartTooltipContent/ChartLegendContent + `ChartConfig`（`{key: {label, icon, color | theme:{light,dark}}}`），通过注入 `<style>` 生成 `[data-chart=id]` CSS 变量。**本项目实际业务图未用它，而是 charts/ 直连 ECharts**（见第四节）。

### 2.11 业务组件契约（business-ui）

**公共强约束（README 原文）**：必须受控（`value`+`onChange` 成对）；禁止传 `undefined`；空值规则 单选 `null` / 多选 `[]`；均自带搜索数据源，无需外部传接口。

| 组件 | value 类型 | 关键 props | 备注 |
|---|---|---|---|
| UserSelect | 单选 `string\|null`（user_id）/ 多选 `string[]` | `multiple`、`triggerType: 'button'\|'search'\|'custom'`（仅影响样式）、`disabled`、`placeholder='请选择'`、`getOptionDisabled` | **仅 ID 模式**，UI 展示头像姓名但对外只回 id |
| DepartmentSelect | 单选 `Department\|null` / 多选 `Department[]` | 同上 + `placeholder='请选择部门'` | **仅对象模式**；`Department = {id, name}`（id=departmentID，name 优先 zh_cn） |
| ChatSelect | 单选 `string\|null`（chatID）/ 多选 `string[]` | 同上，`placeholder='请选择'` | ID 为飞书群聊 ID；`Chat = {id, name, avatar}`，avatar 为 URL 或 16 进制 RGB |
| UserDisplay | `value?: string[]`（user_id 数组） | `size: 'small'\|'medium'\|'large'`（默认 medium）、`showLabel=true`（false 只显头像）、`className/style` | 点击弹 UserProfile；只传 user_id 即可自动查信息；**禁止直接文本展示 user_id** |
| UserProfile | `value?: string`（用户 ID） | 仅此一个 prop | 简单卡片/飞书官方卡片双模式，含状态标识、邮箱链接、错误重试 |
| form/ 字段族 | — | input-field / select-field / checkbox-field / radio-group-field / switch-field / textarea-field + FieldLayout + context | 表单内统一字段封装 |
| EntityCombobox | — | 附 `use-fetch-data.tsx` / `use-infinite-scroll.tsx` / `size-variants.tsx` | 通用实体搜索下拉 |

---

## 三、图标体系

1. **lucide-react 为唯一功能图标库**（README 红线：「必须使用 lucide-react，禁用 Emoji」）。全库统一图标尺寸约定：组件内 `[&_svg]:size-4` / `[&_svg:not([class*='size-'])]:size-4`（即默认 16px，可用 `size-*` 覆盖）。
2. `ui/icons/` = 23 个 `File*ColorfulIcon` 彩色文件类型图标（ae/ai/android/audio/code/csv/eml/ios/keynote/pages/ps/sketch/slide/vcf/wiki-excel/wiki-image/wiki-pdf/wiki-ppt/wiki-text/wiki-video/wiki-word/wiki-unknown/wiki-zip…），命名 `FileWiki{Type}ColorfulIcon`。模式：单文件导出函数组件，`React.SVGProps<SVGSVGElement>` 透传，`viewBox="0 0 24 24"`，品牌色硬编码（如 PDF 主体 `#F54A45`、折角 `#C02A26`、内图形白色）。
3. 自有页面（Layout、工艺图）也直接用 lucide：`Activity, BarChart3, Cpu, Snowflake`。

---

## 四、图表封装模式与配色表

### 4.1 模式（两文件同构，非 ui/chart.tsx 的 Recharts 路线）

```
useRef<HTMLDivElement> 容器 + useRef<ECharts> 实例
chart.current ??= echarts.init(ref.current)     // 惰性初始化，不重复 init
useEffect([data]) → chart.current.setOption({...})
独立 useEffect([]) → new ResizeObserver(() => chart.current?.resize())，卸载 ro.disconnect()
```

即：**裸 ECharts + ref 惰性单例 + ResizeObserver 自适应**，无 dispose（页面级组件随路由卸载）。数据点类型 `Point` 来自服务端 `server/common/utils/lttb`（LTTB 降采样）。

### 4.2 PowerTempChart 契约

Props：`{ power: Point[]; temp?: Point[]; loading: boolean }`；容器 `className="h-72 w-full"`。

option 原文要点：`tooltip:{trigger:'axis'}`；`legend:{data:['系统功率(kW)','冷冻水回水温度(℃)']}`；`grid:{left:48,right:48,top:36,bottom:28}`；`xAxis:{type:'time'}`；双 y 轴 `[{type:'value',name:'kW'},{type:'value',name:'℃',splitLine:false}]`；series：功率 `type:'bar', barMaxWidth:8`，温度 `type:'line', yAxisIndex:1, smooth:true`（temp 缺省时整条 series 不渲染）。

### 4.3 StatusDonut 契约与配色表

Props：`{ dist: { normal: number; warning: number; alarm: number } }`；容器 `className="h-64 w-full"`。

option：`tooltip:{trigger:'item'}`、`legend:{bottom:0}`、`series:[{type:'pie', radius:['55%','80%'], avoidLabelOverlap:true, data:[...]}]`。

**全平台语义配色表（图表与工艺图共用，HSL 原文）**：

| 语义 | 色值（源码原文） | 出处 |
|---|---|---|
| 正常/成功 | `hsl(142 71% 45%)` | StatusDonut 正常 / BindingSvg 圆点 |
| 预警 | `hsl(38 92% 50%)` | StatusDonut 预警 / BindingSvg 圆点；文字态用 `fill-amber-500` |
| 报警/危险 | `hsl(0 72% 51%)` | StatusDonut 报警 / BindingSvg 圆点；文字态用 `fill-destructive` |
| 管道-冷冻水（外/内） | `hsl(215 20% 80%)` / `hsl(201 94% 44%)` | BindingSvg 双层描边 |
| 管道-冷却水（外/内） | `hsl(215 20% 80%)` / `hsl(24 94% 55%)` | 同上 |

---

## 五、工艺图 SVG 模式（BindingSvg）

Props：`{ bindings?: BindingSpec[] = PROCESS_BINDING; values: PointMap; onPointClick?: (b: BindingSpec) => void }`

- `PointMap = Record<number, Record<string, { value: number; recordedAt: Date | string }>>`（外层 deviceId → identifier → 最新值）。
- **位图资源分离**：`SCHEM_ASSET_BASE = '/spark/app/app_17dyn9qdmww/runtime/api/v1/storage/object/'` + `SCHEM_ASSET_URL` 映射表（chiller-run/fault/stop.png、pump-run-cw/ccw.gif、pump-stop.png、tower-run.gif、tower-stop.png，均存妙搭文件存储 bucket_aadkutg53fspg）。源码注释：生产构建不打包大图、直引远端 URL；新增图片「先上传再在映射表登记」。
- **SVG 骨架**：`viewBox="0 0 1200 800" preserveAspectRatio="xMidYMid meet"`，`className="h-full max-h-[78vh] w-full"`，`data-testid="process-svg"`。
- **管道双层描边**：同一条 path 画两遍——外层灰 `stroke="hsl(215 20% 80%)" strokeWidth="18"`，内层彩（冷冻水 `hsl(201 94% 44%)` 带流动动画 / 冷却水 `hsl(24 94% 55%)`）`strokeWidth="10"`；冷冻水内层 `className="schem-flow" strokeDasharray="12 8"`。
- **CSS 动画（组件内 `<style>` 原文）**：
  ```css
  @media (prefers-reduced-motion: reduce) { .schem-blink, .schem-flow { animation: none !important; } }
  .schem-blink { animation: schem-blink 1s infinite; }
  @keyframes schem-blink { 50% { opacity: .35; } }
  .schem-flow { animation: schem-flow 1.2s linear infinite; }
  @keyframes schem-flow { to { stroke-dashoffset: -40; } }
  ```
- **绑定渲染**：每 `BindingSpec` 一组 `<g data-testid="point-{identifier}" className="cursor-pointer ...">`：
  - 取值 `values[b.deviceId]?.[b.identifier]`；`stale = !rec || Date.now() - recordedAt > DATA_STALE_MS` → 整组 `opacity-40` + `<title>数据可能滞后</title>`；
  - 阈值判断：`alarm = v > b.alarmAbove`，`warn = !alarm && v > b.warnAbove`；
  - `b.png` 存在 → `<image x={b.x-60} y={b.y-60} width="120" height="120">`；否则 `<circle r="14">` 填三色，alarm 时加 `schem-blink`；
  - 标签 `<text y+82 className="fill-foreground text-[13px]">`，数值 `<text y+100 className="text-[15px] font-semibold fill-destructive|fill-amber-500|fill-foreground">`，无值显示 `—`，格式 `${v}${unit ? ' ' + unit : ''}`；
  - 点击回调 `onPointClick?.(b)`（打开测点详情）。
- 绑定定义在外部 `pages/process/process-binding.ts`（`BindingSpec` 含 deviceId/identifier/x/y/label/unit/png/alarmAbove/warnAbove）——**坐标与数据源解耦**，组件可换绑定表复用到别的工艺图。

### 5.1 Layout.tsx（根骨架，深色主题独立于 shadcn 主题）

- 容器：`"w-screen h-screen flex bg-[#0a1120] text-slate-200 overflow-hidden"`；侧栏 `"w-56 shrink-0 h-full flex flex-col border-r border-slate-800/80 bg-[#0d1526]"`。
- 品牌区：logo `w-9 h-9 rounded-lg bg-gradient-to-br from-cyan-500 to-blue-600` + `Snowflake w-5 h-5 text-white`；标题 `text-sm font-semibold text-slate-100`，副标 `text-xs text-cyan-400/80 tracking-wide`。
- 菜单 NavLink：`"flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors"`，激活 `"bg-cyan-500/15 text-cyan-300 font-medium"`，默认 `"text-slate-400 hover:text-slate-200 hover:bg-slate-800/50"`，图标 `w-4 h-4`。
- 三路由：`/` 组态监控(Activity)、`/analysis` 节能分析(BarChart3)、`/devices` 设备接入(Cpu)。

---

## 六、复刻要点

**可直接拷贝（与业务无关）**：
- `ui/` 全目录 —— 但注意它依赖平台主题变量（`--button-outline`、`--badge-outline`、`*-*-border` 色、`hover-elevate`/`active-elevate-2` 工具类、`bg-success`/`bg-warning` 语义色），**必须连同全局 CSS 变量一起拷**，否则 outline/success/warning/elevate 失效。
- `charts/` 两组件 —— 依赖 `Point` 类型与服务端 LTTB 产物，前端零业务耦合，改数据源即可用。
- `BindingSvg` —— 组件本身通用（bindings 可注入），但 `SCHEM_ASSET_URL` 域名/桶和 `PROCESS_BINDING` 是本应用资产，需替换。
- lucide 图标体系与 `ui/icons/` 彩色文件图标。

**需按业务改造**：
- `business-ui/` 全族 —— 深度绑定妙搭/飞书（api/ 目录拉飞书 chats/departments/users；UserSelect 的 ID 是飞书 user_id；ChatSelect 的 ID 是 chatID），脱离妙搭环境不可用；表单字段族（form/）与 EntityCombobox 可作为受控组件设计范本参考。
- `Layout.tsx` —— 写死的三路由与文案，属本应用骨架，换项目需重写菜单。
- `ui/chart.tsx`（Recharts 封装）—— 存在但本项目未实际使用，复刻时勿与 charts/ 的 ECharts 路线混淆；二选一即可。

**易踩坑**：
1. Select 空字符串 value 会被 EMPTY_SENTINEL 映射——业务层可放心用 `""` 作「全部」选项值。
2. Dialog 默认自带右上角关闭按钮，不要重复自绘。
3. 复刻按钮 hover 效果时不要写 `hover:bg-*`，平台规范是 elevate 遮罩（`::after` + `--elevate-*`）。
4. 图表高度由容器 class 定（`h-72`/`h-64`），不是 option 控制；ResizeObserver 是必须的（妙搭侧栏收展会改容器宽）。
5. BindingSvg 位图必须先上传妙搭文件存储并在 `SCHEM_ASSET_URL` 登记，本地相对路径在生产取不到。
