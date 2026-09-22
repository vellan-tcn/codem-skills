#!/usr/bin/env node
// 一次性提取脚本：从 references/ 的单源（tokens.json、DESIGN.md §1-3、knowledge/03-components.md）
// 生成 mcp/data/ 下的结构化 JSON（tokens/components/patterns），供 ac-ui-design.mjs 查询。
// 数据均为源文档原文抄录，禁止编造。改动数据源后重跑：node gen-data.mjs
import { readFileSync, writeFileSync, mkdirSync, copyFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const refs = resolve(here, '../references');
const outDir = resolve(here, 'data');
mkdirSync(outDir, { recursive: true });

// ---------- tokens.json：直接复制单源 ----------
copyFileSync(resolve(refs, 'tokens.json'), resolve(outDir, 'tokens.json'));

// ---------- components.json：42 个 ui/ 组件 + business-ui/charts/schematic ----------
// 契约要点抄录自 knowledge/03-components.md（源码原文）与 DESIGN.md §2。
const contract = {
  button: {
    base: 'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium focus-visible:ring-1 focus-visible:ring-ring disabled:opacity-50 hover-elevate active-elevate-2',
    variants: {
      default: 'bg-primary text-primary-foreground border border-primary-border',
      destructive: 'bg-destructive text-destructive-foreground border border-destructive-border',
      outline: 'border [border-color:var(--button-outline)] shadow-xs active:shadow-none',
      secondary: 'bg-secondary text-secondary-foreground border border-secondary-border',
      ghost: 'border border-transparent',
      link: 'text-primary underline-offset-4 hover:underline'
    },
    sizes: { default: 'min-h-9 px-4 py-2', sm: 'min-h-8 rounded-md px-3 text-xs', lg: 'min-h-10 rounded-md px-8', icon: 'h-9 w-9' },
    notes: ['hover 禁写 hover:bg-*，规范是 elevate 遮罩（::after + --elevate-1/2）', '全局按钮 hover translateY(-1px) + 0.18s 过渡', '自定义色必须配对前景色 bg-primary text-primary-foreground', '高度用 min-h 大内容可撑开', '支持 asChild（Radix Slot）']
  },
  badge: {
    base: 'whitespace-nowrap inline-flex items-center rounded-md border px-2.5 py-0.5 text-xs font-semibold hover-elevate',
    variants: {
      default: 'border-transparent bg-primary text-primary-foreground shadow-xs',
      secondary: 'border-transparent bg-secondary text-secondary-foreground',
      destructive: 'border-transparent bg-destructive text-destructive-foreground shadow-xs',
      outline: 'border [border-color:var(--badge-outline)] shadow-xs'
    }
  },
  alert: {
    base: 'relative w-full rounded-lg border px-4 py-3 text-sm grid has-[>svg]:grid-cols-[calc(var(--spacing)*4)_1fr] grid-cols-[0_1fr] items-start',
    variants: {
      default: 'bg-card text-card-foreground',
      destructive: 'text-destructive bg-card',
      success: 'bg-success text-success-foreground border-success/50',
      warning: 'bg-warning text-warning-foreground border-warning/50'
    },
    notes: ['相对标准 shadcn 新增 success/warning 变体', 'AlertTitle: col-start-2 line-clamp-1 min-h-4 font-medium', 'AlertDescription: text-muted-foreground col-start-2 text-sm']
  },
  card: {
    classes: {
      Card: 'rounded-xl border bg-card border-card-border text-card-foreground shadow-sm',
      CardHeader: 'flex flex-col space-y-1.5 p-6',
      CardTitle: 'text-2xl font-semibold leading-none tracking-tight',
      CardDescription: 'text-sm text-muted-foreground',
      CardContent: 'p-6 pt-0',
      CardFooter: 'flex items-center p-6 pt-0'
    },
    notes: ['圆角 rounded-xl=12px，专用 --card-border 边框变量', '业务 KPI 卡变体（dashboard）: rounded-xl border-[#e2e8f0] bg-white shadow-[0_2px_8px_rgba(0,0,0,0.03)] hover:shadow-md，内容 flex items-center gap-3 p-5，图标块 h-10 w-10 rounded-lg，数值 text-xl font-bold tabular-nums，danger 红 #ef2c2c', 'TONE 色板：blue bg-[#2563eb]/10 text-[#2563eb]；orange #f97316；red #ef2c2c；green #10b981（同构 /10 底）']
  },
  input: {
    base: 'border-input h-9 w-full min-w-0 rounded-md border bg-transparent px-3 py-1 text-sm outline-none transition-[color,box-shadow] placeholder:text-muted-foreground disabled:opacity-50',
    interactions: 'enabled:hover:border-ring focus-visible:border-ring focus-visible:ring-ring/20 focus-visible:ring-[3px] aria-invalid:border-destructive',
    notes: ['hover 也换边框色（enabled:hover:border-ring），聚焦 3px ring', '暗色页变体：bg-slate-900 border-slate-700'],
    zone_rules: {
      main: '圆角 8px（rounded-md）、筛选高 36、字号 14px、选中品牌蓝 lab(44.0605 29.0279 -86.0352)',
      ioserver: '全直角 0px、高 32、字号 12px、选中 #1677FF rgb(22,119,255)、placeholder 式「请选择设备状态…」'
    }
  },
  select: {
    trigger: 'h-9（sm h-8）rounded-md border px-3 text-sm data-[placeholder]:text-muted-foreground',
    empty_sentinel: '__dont__use__this__empty__value__（业务层可放心用 "" 作「全部」选项值）',
    item: 'rounded-sm py-1.5 pl-2 pr-8 text-sm 选中 text-primary，右测 CheckIcon size-4',
    content: 'position="popper" align="center" bg-popover rounded-md border shadow-md',
    notes: ['展开箭头旋转 180°（data-[state=open]:[&_svg]:rotate-180）——与有人云 el-select 一致', '禁用项拦截 onClick/onPointerDown'],
    zone_rules: {
      main: '圆角 8px、默认显示默认选项文本（「全部」「全部楼层」）、面板选项高 32px 14px 字',
      ioserver: '全直角 0px、placeholder 式缺省（「请选择设备状态…」）、面板选项高 34px 12px 字、面板宽 ≈ 触发器宽 +14~18px、阴影 none 底色透明'
    }
  },
  dialog: {
    content: 'fixed top-[50%] left-[50%] z-50 grid gap-4 rounded-lg border p-6 shadow-lg duration-200 max-w-lg',
    overlay: 'fixed inset-0 z-50 bg-black/50',
    header: 'flex flex-col gap-2 text-center sm:text-left',
    footer: 'flex flex-col-reverse gap-2 sm:flex-row sm:justify-end',
    title: 'text-lg leading-none font-semibold',
    notes: ['默认自带右上角 X（showCloseButton=true），禁止内容区重复自绘关闭钮', '表单弹窗统一 sm:max-w-md（RoleFormDialog sm:max-w-lg；PointsDialog max-w-2xl）', 'IOServer 设值编辑弹窗 600px']
  },
  table: {
    container: 'data-slot="table-container" relative w-full overflow-x-auto',
    table: 'w-full caption-bottom text-sm',
    head: 'text-foreground h-10 px-2 text-left align-middle font-medium whitespace-nowrap',
    cell: 'p-2 align-middle whitespace-nowrap',
    row: 'hover:bg-muted/50 data-[state=selected]:bg-muted border-b transition-colors',
    footer: 'bg-muted/50 border-t font-medium',
    notes: ['业务表头（列表页）：border-b bg-muted/50 text-left text-xs text-muted-foreground（th p-2）', '固定列滚动阴影：.fixed-cell position sticky + data-scrolled=true 时 8px 左渐变', '行高按页：密集表 37px / 数据表 46~49px', '行 hover：主平台 oklab(0.969998 0 0 / 0.5)；org-scan 页例外 rgb(245,247,250)']
  },
  tabs: {
    list: 'bg-muted text-muted-foreground inline-flex h-9 w-fit items-center justify-center rounded-lg p-[3px]',
    trigger: 'data-[state=active]:bg-background inline-flex h-[calc(100%-1px)] flex-1 items-center justify-center gap-1.5 rounded-md border border-transparent px-2 py-1 text-sm data-[state=active]:font-medium data-[state=active]:shadow-sm',
    notes: ['Tab 选中两种：白底高亮（realtime/energy）或品牌蓝实底（logs）', '无数据源 Tab 置灰 + hover 提示「请在有人云平台查看」']
  },
  small: {
    Spinner: 'Loader2Icon + role=status aria-label=Loading，size-4 animate-spin',
    Skeleton: 'bg-accent animate-pulse rounded-md',
    Separator: 'bg-border shrink-0 data-[orientation=horizontal]:h-px data-[orientation=vertical]:w-px',
    Label: 'flex items-center gap-2 text-sm leading-none font-normal select-none（font-normal 非标准加粗）',
    Switch: '轨道 inline-flex h-[1.15rem] w-8 rounded-full；checked bg-primary；thumb size-4 rounded-full translate-x-[calc(100%-2px)]',
    Checkbox: 'size-4 rounded-[4px]，扩展 indeterminate（三态 MinusIcon）',
    Avatar: 'relative flex size-8 shrink-0 overflow-hidden rounded-full，Fallback bg-muted',
    Tooltip: '深底白字反转 bg-foreground text-background rounded-md px-3 py-1.5 text-xs shadow-md + 箭头 size-2.5 rotate-45 rounded-[2px]，delayDuration=0',
    Empty: '六件套 Empty/EmptyHeader/EmptyMedia/EmptyTitle/EmptyDescription/EmptyContent；容器 flex flex-col items-center rounded-lg border-dashed p-6 md:p-12 text-center；Media bg-muted size-10 rounded-lg；标题 text-base font-medium tracking-tight',
    Image: '响应式必传 sizes；固定尺寸必传 number width；必传有意义 alt',
    Chart: 'Recharts 版 ChartContainer/ChartTooltip/ChartLegend + ChartConfig（注入 style 生成 [data-chart=id] 变量）——本项目业务图未用它，用 charts/ 直连 ECharts'
  }
};

const uiList = [
  'accordion', 'alert-dialog', 'alert', 'aspect-ratio', 'avatar', 'badge', 'breadcrumb', 'button',
  'button-group', 'calendar', 'card', 'carousel', 'chart', 'checkbox', 'collapsible', 'command',
  'context-menu', 'dialog', 'drawer', 'dropdown-menu', 'empty', 'field', 'form', 'hover-card',
  'image', 'input', 'input-group', 'input-otp', 'item', 'kbd', 'label', 'markdown', 'menubar',
  'native-select', 'navigation-menu', 'pagination', 'popover', 'progress', 'radio-group', 'resizable',
  'scroll-area', 'select', 'separator', 'sheet', 'sidebar', 'skeleton', 'slider', 'sonner', 'spinner',
  'switch', 'table', 'tabs', 'textarea', 'toggle', 'toggle-group', 'tooltip'
];
const purpose = {
  accordion: '折叠面板', 'alert-dialog': '确认弹窗', alert: '提示条（新增 success/warning 变体）', 'aspect-ratio': '比例容器',
  avatar: '头像', badge: '标签', breadcrumb: '面包屑', button: '按钮（elevate 遮罩 hover）', 'button-group': '按钮组',
  calendar: '日历', card: '卡片（rounded-xl 12px）', carousel: '轮播', chart: 'Recharts 图表容器（项目未用于业务）',
  checkbox: '复选（三态）', collapsible: '折叠', command: '命令面板', 'context-menu': '右键菜单',
  dialog: '对话框（默认右上角 X）', drawer: '抽屉', 'dropdown-menu': '下拉菜单', empty: '空态六件套（平台定制）',
  field: '表单字段', form: '表单', 'hover-card': 'hover 卡片', image: '图片（sizes/alt 强约束）',
  input: '输入框（hover 换边框 + 3px ring）', 'input-group': '输入组', 'input-otp': 'OTP 输入', item: '列表项',
  kbd: '键帽', label: '标签（font-normal）', markdown: 'MD 渲染', menubar: '菜单栏', 'native-select': '原生下拉',
  'navigation-menu': '导航菜单', pagination: '分页', popover: '气泡', progress: '进度条', 'radio-group': '单选组',
  resizable: '可调尺寸面板', 'scroll-area': '滚动区', select: '下拉选择（空值哨兵 + 箭头旋转 180°）',
  separator: '分隔线', sheet: '侧滑抽屉', sidebar: '完整侧栏体系（727 行）', skeleton: '骨架屏', slider: '滑杆',
  sonner: 'toast', spinner: '加载图标', switch: '开关', table: '表格（自动 overflow-x-auto 容器）',
  tabs: '标签页', textarea: '多行输入', toggle: '切换按钮', 'toggle-group': '切换组', tooltip: '提示（深底白字反转）'
};
const detailed = new Set(Object.keys(contract).concat(Object.keys(contract.small)));

const components = uiList.map((n) => ({
  name: n, zone: 'both', section: 'ui/',
  purpose: purpose[n] || '',
  contract: contract[n] || contract.small[n.charAt(0).toUpperCase() + n.slice(1)] || null
}));

const extra = [
  { name: 'icons', zone: 'both', section: 'ui/icons/', purpose: '23 个 File*ColorfulIcon 彩色文件类型图标（viewBox 0 0 24 24，品牌色硬编码，如 PDF #F54A45/#C02A26）；功能图标一律 lucide-react 禁用 Emoji', contract: null },
  { name: 'UserSelect', zone: 'main', section: 'business-ui/', purpose: '表单人员选择（仅 ID 模式，单 string|null / 多 string[]；triggerType button|search|custom；placeholder 请选择；UI 展示头像姓名但只回 user_id）', contract: null },
  { name: 'DepartmentSelect', zone: 'main', section: 'business-ui/', purpose: '表单部门选择（对象模式 Department={id,name}；placeholder 请选择部门）', contract: null },
  { name: 'ChatSelect', zone: 'main', section: 'business-ui/', purpose: '表单群组选择（ID=飞书 chatID；Chat={id,name,avatar}）', contract: null },
  { name: 'UserDisplay', zone: 'main', section: 'business-ui/', purpose: '用户头像+姓名展示（value=string[] user_id；size small|medium|large；点击弹 UserProfile；禁止直接文本展示 user_id）', contract: null },
  { name: 'UserProfile', zone: 'main', section: 'business-ui/', purpose: '用户详情卡片（仅 value prop；简单/飞书官方双模式）', contract: null },
  { name: 'form-fields', zone: 'main', section: 'business-ui/form/', purpose: 'input/select/checkbox/radio/switch/textarea-field + FieldLayout 表单字段族', contract: null },
  { name: 'EntityCombobox', zone: 'main', section: 'business-ui/', purpose: '实体搜索下拉（附 use-fetch-data/use-infinite-scroll）', contract: null },
  { name: 'PowerTempChart', zone: 'main', section: 'charts/', purpose: '功率柱(barMaxWidth:8)+回水温度线(yAxisIndex:1 smooth)双轴图；容器 h-72 w-full；grid {left:48,right:48,top:36,bottom:28}；temp 缺省整条 series 不渲染', contract: null },
  { name: 'StatusDonut', zone: 'main', section: 'charts/', purpose: '设备状态三色环图（radius 55%~80%，legend bottom:0）；配色：正常 hsl(142 71% 45%) / 预警 hsl(38 92% 50%) / 报警 hsl(0 72% 51%)', contract: null },
  { name: 'BindingSvg', zone: 'main', section: 'schematic/', purpose: '冷站工艺图（SVG 管道双层描边 + 测点绑定，详见 get_page_pattern process-diagram）', contract: null },
  { name: 'Layout-legacy', zone: 'main', section: 'src/', purpose: '旧版暗色根骨架（bg-[#0a1120] cyan 三路由）——已被 AppShell 取代，勿用于复刻（DESIGN.md Don\'t 明令）', contract: null }
];
components.push(...extra);

const businessConstraint = { 公共强约束: '必须受控（value+onChange 成对）；禁止传 undefined；空值 单选 null / 多选 []；自带搜索数据源' };
const componentsJson = { _readme: '42 组件契约，从 knowledge/03-components.md 与 DESIGN.md §2 提取，class/色值/尺寸均为源码原文抄录', business_constraint: businessConstraint, ui_copy_note: 'ui/ 全目录复刻必须连同全局 CSS 变量一起拷（--button-outline/--badge-outline/*-border/hover-elevate/--elevate-*），否则 outline/success/warning/elevate 失效', components };

// ---------- patterns.json：DESIGN.md §3 模式 A-J + §1 AppShell ----------
const patterns = {
  list: {
    title: '模式 A：列表页（devices/Users/Roles/AlarmRules 共用）',
    skeleton: ['根容器 space-y-3', '操作行：Button「新增XX」或 flex items-center gap-3（搜索 Input + 筛选 + 操作钮 ml-auto）', '表格容器 rounded-md border > table.w-full.text-sm', 'thead: tr.border-b.bg-muted/50.text-left.text-xs.text-muted-foreground（th p-2）', 'tbody 行: tr.border-b（可点行 + cursor-pointer hover:bg-muted/50）', '空态: p-8 text-center text-sm text-muted-foreground「暂无XX」', '表单 Dialog（模式 C）'],
    rules: ['数据 usePollingQuery([资源,"list",…筛选], url, 30000)；写后 qc.invalidateQueries([资源])', '操作列单元格 onClick={e=>e.stopPropagation()} 防触发行点击', '轮询间隔：devices 15s；system 各页 30s（UserAccess roles 60s；energy 60s）；Monitor 8s；Realtime 有人云走 SSE', '分页完整形态：共 N 条 | N 条/页 | 上一页 | 页码… | 下一页 | 前往 | 页；页码 28×28 直角，当前页 bg rgb(22,119,255) 白字；「上一页/下一页」48×28 文字按钮；「前往」输入框 56×28 圆角 10px；条数选项按页实测（8/12/16/24、10/20/50、5/10/15/20）；单页仍渲染完整分页 next disabled'],
    components: ['Table', 'Button', 'Input', 'Select', 'Dialog', 'Pagination']
  },
  detail: {
    title: '模式 B：详情页（DeviceDetailPage）',
    skeleton: ['头行 flex flex-wrap items-center gap-x-3 gap-y-2', '返回 Button(outline, sm) → 列表', 'h1 text-lg font-semibold + 编号 font-mono text-xs text-muted-foreground', '类型 Badge(outline) + 状态点 h-2 w-2 rounded-full', '编辑 Button(ml-auto)', 'Tabs(defaultValue=主tab)：表格 tab / 时间线 tab / 基础信息 dl tab', '加载/错误态：p-8 text-center text-sm text-muted-foreground（「加载中…」/「XX不存在」）'],
    rules: [],
    components: ['Button', 'Badge', 'Tabs', 'Table']
  },
  'form-dialog': {
    title: '模式 C：表单弹窗（6 个 Dialog 共用骨架）+ 模式 D：确认/危险操作',
    skeleton: ['Dialog > DialogContent.sm:max-w-md', 'DialogTitle（新增XX / 编辑XX 随 editing 状态切换；editing 三态 new|Row|null）', '字段单元 div.space-y-1(.5) > Label + Input/Select/Textarea；多列 grid grid-cols-2|3 gap-2|3', '错误：text-xs text-red-500（亮）/ text-red-400（暗）', 'DialogFooter > 取消(outline) + 保存(disabled=必填校验||loading)'],
    rules: ['两种实现：react-hook-form + zod（zodResolver，errors.xxx.message）或 useState 受控（setForm + row 变化回填）', 'loading 文案统一：提交中…/保存中…/测试中…/登录中…', '模式 D 删除确认：AlertDialog「…且不可恢复。确定继续吗？」+ 红色确认钮 bg-red-600 hover:bg-red-500', '模式 D 轻量删除（测点）：直接执行 + toast；全部确认按钮 disabled 由列表状态决定'],
    components: ['Dialog', 'Label', 'Input', 'Select', 'Textarea', 'AlertDialog']
  },
  realtime: {
    title: '模式 E：实时数据',
    skeleton: [],
    rules: ['轮询 usePollingQuery', 'SSE：new EventSource(\'/api/realtime/usr-stream?token=…\') token 走 query；open→live、points→合并、error→自动重连；卸载 close', '值闪烁 useFlash：值变化才闪，同页 8s 至多一次，animate-pulse', '陈旧判定 isStale：超 DATA_STALE_MS 整行 opacity-40'],
    components: ['Table']
  },
  'dark-page': {
    title: '模式 F：双主题（暗色页绝对值）',
    skeleton: [],
    rules: ['亮色（语义 token）：dashboard/devices/energy/alarms/system', '暗色（绝对值）：monitor/analysis/gate/login/接入管理', '暗色页底 #0a1120，KPI 卡 #0f1b31，内容卡 #0d1728，输入 bg-slate-900 border-slate-700，主按钮 bg-cyan-600 hover:bg-cyan-500，文字 slate-100/400/500', '图表轴 #64748b、图例 #94a3b8、系列色 #22d3ee/#34d399/#fbbf24/#a78bfa/#f472b6', '暗色页不接语义 token，独立体系'],
    components: []
  },
  chart: {
    title: '模式 G：图表挂载（两种，二选一勿混）',
    skeleton: [],
    rules: ['手动 echarts.init：ref + chart ??= echarts.init(el) 惰性单例 + ResizeObserver resize + 卸载 dispose；容器 h-56|h-64|h-72 w-full min-w-[480|560px] 包 overflow-x-auto', 'ReactECharts（echarts-for-react）：<ReactECharts className="h-[320|340]px min-w-[560px]">', '图表高度由容器 class 定，不是 option 控制；ResizeObserver 必须（侧栏收展改宽）', '通用 option：tooltip trigger axis；grid {left:48,right:16~48,top:16~36,bottom:28~40}；趋势线 showSymbol:false', '能耗柱 itemStyle color hsl(199 89% 48%)；饼 radius 40%~70% legend bottom:0；状态环 radius 55%~80%'],
    components: ['PowerTempChart', 'StatusDonut', 'Chart']
  },
  'process-diagram': {
    title: '模式 I：工艺图（BindingSvg）',
    skeleton: ['viewBox="0 0 1200 800" preserveAspectRatio="xMidYMid meet"，class h-full max-h-[78vh] w-full', '管道双层描边：外层 hsl(215 20% 80%) strokeWidth 18，内层冷冻水 hsl(201 94% 44%) / 冷却水 hsl(24 94% 55%) strokeWidth 10', '内层流动 strokeDasharray="12 8" + schem-flow 动画（1.2s，dashoffset→-40）', '绑定点：位图 <image 120×120> 或 <circle r=14> 三色（正常 hsl(142 71% 45%) / 预警 hsl(38 92% 50%) + amber / 报警 hsl(0 72% 51%) + blink）', '标签 text-[13px] fill-foreground，数值 text-[15px] font-semibold（报警 fill-destructive / 预警 fill-amber-500），无值 —，格式 ${v}${unit?\' \'+unit:\'\'}', 'stale 点整组 opacity-40 + <title>数据可能滞后</title>', '组态大屏 Schematic（monitor）：viewBox 1200×620，画布底 #2f314a，管路四层描边（11 边 #0b1220 → 8 base → 4 hi opacity .35 → 2.5 flow），CW #c2410c/#fdba74/#fb923c、CHW #1e40af/#93c5fd/#60a5fa，pipe-anim dasharray 10 14，StatusSquare 16×16（running 绿+白勾 / stopped 空心 / fault 红+alarm-pulse），设备 hover brightness(1.2)'],
    rules: ['位图须上传妙搭文件存储并在 SCHEM_ASSET_URL 登记（SCHEM_ASSET_BASE=/spark/app/app_17dyn9qdmww/runtime/api/v1/storage/object/），本地相对路径生产取不到', '绑定定义在外部 process-binding.ts（BindingSpec 含 deviceId/identifier/x/y/label/unit/png/alarmAbove/warnAbove）——坐标与数据源解耦', '阈值：alarm = v > alarmAbove，warn = !alarm && v > warnAbove', 'reduced-motion 禁用 blink/flow', '动画原文：.schem-blink 1s infinite 50% opacity .35；.schem-flow 1.2s linear to dashoffset -40'],
    components: ['BindingSvg']
  },
  login: {
    title: '模式 J：登录页状态机',
    skeleton: ['Mode = choose | probing | form | qr | phone-confirm', '挂载即无条件免登探测（apiProbe 4s 超时）→ 成功直进系统；失败显式停留 choose（禁止失败仍跳转=闪屏）', 'probing 全屏遮罩不渲染任何登录表单：bg-[hsl(224_50%_12%)] + Loader2 h-8 w-8 animate-spin text-cyan-300「正在进入…」', '卡片统一：max-w-sm rounded-xl border-white/10 bg-white/5 p-8 backdrop-blur（暗玻璃）'],
    rules: ['扫码轮询 2.5s qr-status；expired →「二维码已过期，请重新发起」'],
    components: []
  },
  appshell: {
    title: '§1 布局骨架规则（AppShell，全局外壳唯一蓝本）',
    skeleton: ['结构：div.flex.h-screen → 左 aside 侧栏 + 右列（header 顶栏 + main 内容区）', '侧栏：hidden shrink-0 flex-col border-r border-slate-200 bg-white shadow-[inset_-1px_0_0_0_#E2E8F0D1,12px_0_32px_#0F172A0D] transition-[width] md:flex；展开 w-64 p-5（256px）↔ 折叠 w-20 overflow-hidden px-3 py-5（80px）', '阴影必须双写：内侧 1px 高光 #E2E8F0D1 + 外投影 12px 0 32px #0F172A0D', 'Logo 区（无卡片纯排布）：mb-6 flex items-center gap-3 px-3 py-[15px]；徽标 size-9 rounded-xl bg-primary text-sm font-bold text-white shadow-[0_10px_22px_rgba(37,99,235,0.18)] 文本「冷」；标题 text-sm font-bold text-slate-700「空调节能监控平台」+ 副题 text-[10px] text-slate-500「水冷中央空调」', '菜单：nav.flex-1.space-y-3.overflow-y-auto；单子项分组且非 forceGroup → 直接渲染一级大按钮；分组头 flex w-full justify-between rounded text-[11px] font-bold uppercase tracking-wider text-slate-500 px-2 py-1（箭头 size-[13px]，展开 ChevronDown/收起 ChevronRight）；叶子 flex w-full rounded text-sm font-bold text-[#334155] h-7 py-1 gap-2 px-2，激活 bg-primary text-white，hover bg-slate-100 text-slate-900，子列表 ml-2 space-y-1，图标 size-4 shrink-0；无权限 cursor-not-allowed text-muted-foreground/40 title=无权限 点击 preventDefault', '顶栏：relative z-40 flex h-14 shrink-0 items-center justify-between border-b border-slate-200/[0.88] bg-white px-5（56px 高）', '面包屑当前页胶囊：rounded-full border-blue-200/85 bg-[#f0f7ff] px-[10.4px] py-[5.6px] text-xs font-bold text-slate-600 + 父级段 ChevronRight size-3 text-slate-400', '顶栏右段：样式钮（Palette size-3.5）→ 实时链路在线（rounded-lg border-green-200 bg-green-50 px-2.5 py-1.5 text-[11px] text-green-800 + 呼吸点 size-[7px] bg-green-500 + Link2 size-3）→ 铃铛/全屏（md:size-8 rounded-lg border-slate-200，size-4）→ 分隔线 h-5 w-px bg-slate-200（20px 短竖线）→ 账号下拉（rounded-lg border-slate-200 bg-white px-2.5 py-1.5 text-xs text-slate-700；面板 absolute right-0 top-full z-[90] mt-2 w-52 rounded-xl border-slate-200 bg-white shadow-lg）', '内容区：main.min-h-0.flex-1.overflow-y-auto.bg-slate-50.p-3.md:p-5', '移动抽屉：遮罩 bg-slate-900/45；面板 w-72 max-w-[85vw] bg-white p-4 shadow-xl；菜单项 h-11 px-3（44px touch 模式）'],
    rules: ['双层守卫：①AuthGuard 无 localStorage token → /login；/api/auth/profile 校验 status===enabled && roleCode!==guest；拒绝 → AccessGatePage ②AppShell 二层 /api/io/auth/me + casl；token 中途 401（AUTH_EXPIRED_EVENT）不跳 /login 进锁屏 LockScreen', '两套控件风格体系（勿混用）：主平台区（dashboard/realtime/energy/alarms/logs/ahu-overview）输入圆角 8px、筛选高 36/按钮 32、筛选字号 14px、选中品牌蓝 lab(44.06…)、缺省显示默认选项文本；IOServer 区（org-scan/devices/gateways/channels…）全直角 0px、一律 32 高、12px 字、选中 #1677FF、placeholder 式缺省', '未明确分区的页面必须显式声明分区（业务近似走 IOServer / 展示近似走主平台），禁止落入两套之间（33 高/8px 圆角/14px 字是首轮验收 Fail 源）', '角色标签映射：admin 管理员 / viewer 只读访客', '壳外挂件：AlarmDrawer、StyleDrawer、LockScreen、Toaster(sonner)、FloatButton'],
    components: ['Sidebar', 'Breadcrumb', 'Button', 'Drawer', 'Sheet']
  }
};
const patternsJson = { _readme: '9 个页面模式（DESIGN.md §3 模式 A-J + §1 AppShell），type 映射：list=A detail=B form-dialog=C+D realtime=E dark-page=F chart=G process-diagram=I login=J appshell=§1', patterns };

writeFileSync(resolve(outDir, 'components.json'), JSON.stringify(componentsJson, null, 1));
writeFileSync(resolve(outDir, 'patterns.json'), JSON.stringify(patternsJson, null, 1));
console.log(`OK: data/tokens.json (copy) + components.json (${components.length} 条) + patterns.json (${Object.keys(patterns).length} 模式)`);
