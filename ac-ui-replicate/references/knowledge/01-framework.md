# 01 · 框架层知识库（妙搭空调平台前端）

> 依据源码通读整理（2026-09-21）。所有 class / 数值均从源码原文抄录，未做任何臆测。
> 源码根：`app/client/src/`（另：`app/tailwind.config.ts`、`app/vite.config.ts`）。
> 本文档自包含：不读源码也能凭此复刻整套框架层。

## 0. 全局入口与 Provider 栈（app.tsx 原文）

```
ThemeProvider (next-themes: attribute="class" defaultTheme="light" disableTransitionOnChange)
  └ PreferencesProvider (features/preferences)
      └ QueryClientProvider (@tanstack/react-query: retry:1, staleTime:4000, refetchOnWindowFocus:true)
          └ RouterProvider (router 来自 src/router/index.tsx)
```

- QueryClient 配置原文：`{ defaultOptions: { queries: { retry: 1, staleTime: 4000, refetchOnWindowFocus: true } } }`
- 注意：`components/Layout.tsx` 是**旧版暗色布局**（cyan 配色、三菜单：组态监控/节能分析/设备接入），当前路由**不再引用它**——实际全局外壳是 `src/ioserver/components/AppShell.tsx`（布局合并改造，注释原文："IOServer AppShell 提升为应用全局外壳——所有页面单层侧栏 + 顶栏，MainLayout 退役"）。复刻以 AppShell 为准。

## 1. 路由表（router/index.tsx 原文）

路由创建：`createBrowserRouter(buildRoutes(), { basename: process.env.CLIENT_BASE_PATH || '/' })`

全部页面 `lazy(() => import(...))` 懒加载。结构：`/login` 独立；其余全部包在 `<AuthGuard />` → `<AppShell />` 内。

| 路径 | 页面组件 | handle.crumb | 守卫 |
|---|---|---|---|
| `/login` | LoginPage | — | 无（公开） |
| `/`（index） | `<Navigate to="/dashboard" replace />` | — | AuthGuard |
| `/dashboard` | DashboardPage | 运行总览 | AuthGuard+AppShell |
| `/process` | ProcessPage | 系统工艺图 | 同上 |
| `/realtime` | RealtimePage | 实时监控 | 同上 |
| `/energy` | EnergyPage | 能耗分析 | 同上 |
| `/alarms` | AlarmCenterPage | 报警中心 | 同上 |
| `/devices` | DevicesPage | 设备管理 | 同上（菜单不展示，防 404） |
| `/devices/:id` | DeviceDetailPage | 设备详情 | 同上 |
| `/system/users` | UsersPage | 用户管理 | 同上（菜单不展示） |
| `/system/user-access` | UserAccessPage | 用户与权限 | 同上 |
| `/system/roles` | RolesPage | 角色管理 | 同上（菜单不展示） |
| `/system/alarm-rules` | AlarmRulesPage | 报警规则 | 同上 |
| `/logs` | LogsPage（ioserver/pages） | 日志列表 | 同上（菜单需 perm `menu:logs`） |
| `/ioserver/*` | IoserverRoot | IOServer | 同上（子路由内部再分发；菜单组仅 admin） |
| `/analysis` | → `/energy`（redirect） | — | — |
| `/hvac/devices` | → `/devices`（redirect） | — | — |
| `/temperature-overview` | → `/realtime`（redirect） | — | — |
| `*` | → `/dashboard`（redirect） | — | — |

**AuthGuard 逻辑（原文要点）**：
1. `if (!localStorage.getItem(TOKEN_KEY)) return <Navigate to="/login" replace />`
2. 挂载即 `apiFetch<CurrentUser>('/api/auth/profile')`；`user.status === 'enabled' && user.roleCode !== 'guest'` → ok，否则/异常 → gate
3. loading 态：`<div className="flex min-h-screen items-center justify-center bg-[#0a1120]"><span className="text-sm text-slate-400">加载中…</span></div>`
4. gate 态渲染 `AccessGatePage`；ok 渲染 `<Outlet />`

**AppShell 自身还有第二层守卫**：挂载时 `api('/api/io/auth/me')` 取 user；booting 态 `<div className="flex h-screen w-full items-center justify-center bg-slate-50 text-sm text-muted-foreground">加载中…</div>`；无 user → `<Navigate to="/login" replace />`；有 user → `<AbilityProvider value={defineAbilityFor(user.perms)}>` 包 ShellBody（casl 权限）。token 中途 401（`AUTH_EXPIRED_EVENT`）不跳登录页，改为进锁屏 LockScreen。

## 2. 框架 DOM 骨架树（AppShell.tsx，class 全部原文）

### 2.1 主骨架（桌面）

```
div.flex.h-screen
├── aside  ← 左侧栏（md:flex，hidden 于移动端）
│   className = cn(
│     'hidden shrink-0 flex-col border-r border-slate-200 bg-white shadow-[inset_-1px_0_0_0_#E2E8F0D1,12px_0_32px_#0F172A0D] transition-[width] md:flex',
│     collapsed ? 'w-20 overflow-hidden px-3 py-5' : 'w-64 p-5')
│   ├── div  ← Logo 区（无卡片，纯排布）
│   │   className = cn('mb-6 flex items-center',
│   │     collapsed ? 'justify-center px-0 py-[15px]' : 'gap-3 px-3 py-[15px]')
│   │   ├── div.flex.size-9.shrink-0.items-center.justify-center.rounded-xl.bg-primary.text-sm.font-bold.text-white.shadow-[0_10px_22px_rgba(37_99_235_0.18)] → 文本「冷」
│   │   └── (展开时) div.leading-tight
│   │       ├── div.text-sm.font-bold.text-slate-700 → 空调节能监控平台
│   │       └── div.text-[10px].text-slate-500 → 水冷中央空调
│   ├── nav ← SidebarNav（见 2.3）
│   └── div.mt-4.flex.items-center.gap-2 → 版本徽标
│       └── span.rounded.bg-muted.px-1.5.py-0.5.text-xs.font-medium.text-muted-foreground → V{APP_VERSION}（'0.1.0'）
└── div.flex.min-w-0.flex-1.flex-col  ← 右侧列
    ├── header.relative.z-40.flex.h-14.shrink-0.items-center.justify-between.border-b.border-slate-200/[0.88].bg-white.px-5  ← 顶栏
    │   ├── div.flex.items-center.gap-3  ← 左段
    │   │   ├── button.inline-flex.size-10.items-center.justify-center.rounded-lg.border.border-slate-200.text-slate-600.md:hidden（移动端汉堡，Menu size-5）
    │   │   ├── button.hidden.h-8.w-8.items-center.justify-center.rounded-lg.border.border-slate-200.text-slate-500.lg:inline-flex（折叠钮，ChevronsLeft/Right size-4）
    │   │   └── 面包屑（见 2.2）
    │   └── div.flex.items-center.gap-2  ← 右段 header-actions
    │       ├── button.hidden.items-center.gap-1.rounded-lg.border.border-slate-200.px-3.py-1.5.text-xs.text-slate-700.sm:inline-flex（样式，Palette size-3.5）
    │       ├── span.hidden.items-center.gap-1.5.rounded-lg.border.border-green-200.bg-green-50.px-2.5.py-1.5.text-[11px].text-green-800.md:flex（实时链路在线）
    │       │   └── span.inline-block.size-[7px].rounded-full.bg-green-500（呼吸点）+ Link2 size-3
    │       ├── button.relative.inline-flex.size-10.items-center.justify-center.rounded-lg.border.border-slate-200.text-slate-700.md:size-8（铃铛，Bell size-4）
    │       ├── button.inline-flex.size-10.items-center.justify-center.rounded-lg.border.border-slate-200.text-slate-700.md:size-8（全屏，Maximize2 size-4）
    │       ├── div.h-5.w-px.bg-slate-200（分隔线）
    │       └── div.relative → 账号下拉
    │           ├── button.inline-flex.items-center.gap-1.5.rounded-lg.border.border-slate-200.bg-white.px-2.5.py-1.5.text-xs.text-slate-700
    │           │   （User size-3.5 + {displayName||username} + (角色) + ChevronDown size-3.5 text-slate-400）
    │           └── 下拉面板 div.absolute.right-0.top-full.z-[90].mt-2.w-52.overflow-hidden.rounded-xl.border.border-slate-200.bg-white.shadow-lg
    │               ├── 用户信息头 div.border-b.border-slate-200.px-3.py-2（text-xs font-bold text-slate-700 / mt-0.5 text-[11px] text-slate-500）
    │               ├── 菜单按钮 ×4：flex.w-full.items-center.gap-2.px-3.py-2.text-left.text-xs.text-slate-700.hover:bg-slate-50（个人信息/修改密码/样式设置/锁屏）
    │               ├── div.mx-3.h-px.bg-slate-200（分隔）
    │               └── 退出按钮同上但 text-rose-600 hover:bg-rose-50
    └── main.min-h-0.flex-1.overflow-y-auto.bg-slate-50.p-3.md:p-5 → <Outlet />
```

壳外挂件（同级）：`AlarmDrawer`、`StyleDrawer`、`LockScreen`（locked 时）、`<Toaster />`（sonner）、`FloatButton`（点击开告警抽屉）。

### 2.2 面包屑（顶栏左段，三种形态）

- 有父级：`span.flex.items-center.gap-1.text-xs.font-bold.text-slate-600` 内含 `{parent}` + `ChevronRight.size-3.text-slate-400` + 当前页胶囊
- 当前页胶囊：`span.rounded-full.border.border-blue-200/85.bg-[#f0f7ff].px-[10.4px].py-[5.6px].text-xs.font-bold.text-slate-600`
- 无父级：直接渲染胶囊
- 无映射：`span.text-xs.font-bold.text-slate-700` → 空调节能监控平台

BREADCRUMB 映射表（AppShell 原文，节选关键项）：`/dashboard`→概览/运行总览；`/process`→监控/系统工艺图；`/realtime`→监控/实时监控；`/energy`→能耗/能耗分析；`/alarms`→告警/报警中心；`/system/alarm-rules`→告警/报警规则；`/logs`→日志管理/日志列表；`/devices/:id`→函数式 `(id)=>({parent:'设备管理', current:'设备详情 · '+id})`。

### 2.3 侧栏菜单（SidebarNav.tsx）

`nav.flex-1.space-y-3.overflow-y-auto` 包分组。**单子项分组且非 forceGroup → 直接渲染一级大按钮**（母线结构 1:1）；多子项分组渲染分组头 + 子列表 `div.ml-2.space-y-1`。

- 分组头按钮：`cn('flex w-full items-center justify-between rounded text-[11px] font-bold uppercase tracking-wider text-slate-500 transition-colors duration-150 hover:bg-slate-100', touch ? 'px-3 py-3' : 'px-2 py-1', collapsed && 'justify-center px-2')`；展开 ChevronDown / 收起 ChevronRight（均 `size-[13px] shrink-0 text-slate-400`）；折叠态只显示首字 `group.label.slice(0,1)`
- 叶子链接 leafClass 原文：
```
cn(
  'flex w-full items-center rounded text-sm font-bold text-[#334155] transition-colors duration-150',
  touch ? 'h-11 px-3' : 'h-7 py-1',
  collapsed ? 'justify-center px-0' : 'gap-2 px-2',
  touch && !collapsed && 'px-3',
  isActive ? 'bg-primary text-white' : 'hover:bg-slate-100 hover:text-slate-900',
)
```
- 无权限叶子（perm 存在但 casl 拒绝）：追加 `cursor-not-allowed text-muted-foreground/40 hover:bg-transparent hover:text-muted-foreground/40`，title="无权限"，点击 preventDefault
- 图标：`size-4 shrink-0`；文字 `span.truncate`
- 分组默认展开（`openMap[label] ?? true`）

### 2.4 移动端抽屉（mobileOpen 时）

```
div.fixed.inset-0.z-[80].md:hidden
├── div.absolute.inset-0.bg-slate-900/45（点击关闭遮罩）
└── div.absolute.inset-y-0.left-0.flex.w-72.max-w-[85vw].flex-col.bg-white.p-4.shadow-xl
    ├── 头部：mb-4 flex items-center justify-between px-1 pt-1（同款 Logo + 关闭钮 size-10 rounded-lg text-slate-500 hover:bg-slate-100，X size-5）
    ├── SidebarNav（touch=true，菜单项 44px 高：h-11）
    └── div.mt-4.px-1 → 版本徽标（同桌面）
```

### 2.5 菜单树 NAV_TREE（nav-tree.ts 原文结构）

| 分组 | 子项（to / label / perm / icon） | 可见性 |
|---|---|---|
| 概览（forceGroup，LayoutDashboard） | `/dashboard` 运行总览 | 登录即可见 |
| 监控（Activity） | `/process` 系统工艺图；`/realtime` 实时监控；`/ioserver/ahu-overview` 空调箱总览 | 登录即可见 |
| 能耗（BarChart3） | `/energy` 能耗分析 | 登录即可见 |
| 告警（BellRing） | `/alarms` 报警中心；`/system/alarm-rules` 报警规则 | 登录即可见 |
| 日志管理（ScrollText） | `/logs` 日志列表（perm `menu:logs`） | perm 过滤 |
| 设备管理（Boxes，roles:['admin']） | `/ioserver/org-scan` 组织树（menu:org-scan）；`/ioserver/devices` 设备列表（menu:devices）；`/ioserver/device-points` 设备与点位 | admin + perm |
| 网关管理（RouterIcon，admin） | `/ioserver/gateways` 网关列表（menu:gateways）；`/ioserver/third-gateways` 三方网关列表（menu:third-gateways） | admin + perm |
| 系统设置（Settings，admin） | `/ioserver/channels` 通道管理（menu:channels）；`/ioserver/settings/sync` 自动同步设置（menu:settings-sync）；`/ioserver/settings/users` 用户管理（menu:settings-users）；`/ioserver/settings/roles` 角色管理（menu:settings-roles）；`/system/user-access` 用户与权限（menu:user-access） | admin + perm |

过滤逻辑：`(!c.roles || c.roles.includes(user.role)) && (!c.perm || ability.can('view', c.perm))`；空分组整组隐藏。角色标签：`admin:管理员，viewer:只读访客`。

> **瘦身版（2026-09-21 评审 M1）**：§3 设计 token 全表（浅色/深色/备选主色/typography 桥接）已删除——与 DESIGN.md、DESIGN-tailwind.css 三方重复。单源：`../DESIGN-tokens.yaml`（结构化）/ `../tokens.json`（机器可读）/ `../DESIGN-tailwind.css`（可 @import）。完整历史见 git / `docs/ui/knowledge/` 归档。

## 3. 设计 token（单源指向，全表已删）

- 派生边框回退值、`--button-outline/--badge-outline/--elevate-*/--radius/--spacing`、阴影族、font 栈、备选主色四组、深色 `.dark` 覆写表——**全部见 `../DESIGN-tokens.yaml` 与 `../DESIGN-tailwind.css`，此处不再复述**。
- 仍保留本文件独有的源码组织信息：

CSS 组织（index.css）：`@import '@lark-apaas/client-toolkit/lib/index.css'` + `@import "tw-animate-css"` + `./tailwind-theme.css` + `./typography.css`；`@config "../../tailwind.config.ts"`；`@theme` 内钉回经典 slate：`--color-slate-500:#64748b / --color-slate-600:#475569 / --color-slate-700:#334155`（注释：Tailwind v4 OKLCH 派生值偏暗，钉回 hex）。暗色变体定义：`@custom-variant dark (&:is(.dark *))`。
- typography.css：`@plugin "@tailwindcss/typography"`；`@utility prose` 将全部 `--tw-prose-*` 桥接到语义 token（body/headings/bold/quotes/kbd/code = `--foreground`；links/bullets = `--primary`；lead/counters/captions = `--muted-foreground`；hr/quote-borders/th-td-borders = `--border`；pre-bg = `--accent`、pre-code = `--accent-foreground`）。

### 3.1 全局交互契约（tailwind-theme.css 尾部，token 表之外的独有内容）

- 按钮 hover 上浮：`button:not(:disabled), [role="button"]:not(:disabled) { transition: transform 0.18s, background-color 0.18s, color 0.18s, box-shadow 0.18s; }` + `:hover { transform: translateY(-1px) }`
- 表格固定列滚动阴影：`.fixed-cell { position: sticky }`；`[data-slot="table-container"][data-scrolled="true"] .fixed-cell::before` → 8px 宽左渐变 `linear-gradient(to left, rgba(0,0,0,0.2), rgba(0,0,0,0))`
- elevate 系统（utilities 层）：`.toggle-elevate(.toggle-elevated)::before` 背景 `--elevate-2`；`.hover-elevate:hover::after` 背景 `--elevate-1`；`.hover-elevate-2 / .active-elevate-2::after` 背景 `--elevate-2`；带 `.border` 时 `inset:-1px`；逃生舱类 `.no-default-hover-elevate / .no-default-active-elevate`
- `input[type="search"]::-webkit-search-cancel-button { @apply hidden }`；`[contenteditable][data-placeholder]:empty::before` 用 `--muted-foreground` 渲染占位



## 4. 布局测量值（从 class 推算，1rem=16px）

| 部位 | 值 | 依据 |
|---|---|---|
| 侧栏展开宽 | 256px | `w-64` |
| 侧栏折叠宽 | 80px | `w-20` |
| 侧栏 padding | 展开 20px；折叠 px-12/py-20 | `p-5` / `px-3 py-5` |
| 侧栏背景/边框 | bg-white；border-r border-slate-200（1px #e2e8f0） | 原文 |
| 侧栏阴影 | 内侧高光 `inset -1px 0 0 0 #E2E8F0D1` + 外阴影 `12px 0 32px #0F172A0D` | `shadow-[inset_-1px_0_0_0_#E2E8F0D1,12px_0_32px_#0F172A0D]` |
| Logo 区 | 内距 px-12/py-15px，mb-24px | `mb-6 … px-3 py-[15px]` |
| Logo 徽标 | 36×36，圆角 12px（rounded-xl），bg-primary，阴影 `0 10px 22px rgba(37,99,235,0.18)` | `size-9 rounded-xl` |
| 标题 | 14px bold slate-700；副题 10px slate-500 | `text-sm font-bold` / `text-[10px]` |
| 菜单分组头 | 高 py-4px（h≈22px），11px bold uppercase tracking-wider slate-500 | `px-2 py-1 text-[11px]` |
| 菜单叶子 | 高 28px（h-7 py-1），展开态 px-8+gap-8；激活 bg-primary 白字；字号 14px bold 色 #334155 | leafClass |
| 菜单子列表缩进 | 8px | `ml-2` |
| 顶栏高 | 56px | `h-14` |
| 顶栏 padding | 左右 20px | `px-5` |
| 顶栏底边框 | 1px slate-200 @ 88% 透明 | `border-b border-slate-200/[0.88]` |
| 面包屑胶囊 | px 10.4px / py 5.6px，rounded-full，边框 #bfdbfe(85%)，底 #f0f7ff，12px bold slate-600 | 原文 class |
| 顶栏图标按钮 | 移动端 40×40，md 起 32×32（md:size-8），rounded-lg 边框 slate-200 | 原文 |
| 折叠钮 | 32×32，仅 lg+ 显示 | `h-8 w-8 … lg:inline-flex` |
| header-actions 间距 | gap-8px | `gap-2` |
| 账号按钮 | px-10 py-6，12px | `px-2.5 py-1.5 text-xs` |
| 账号下拉面板 | w-208px，rounded-xl，mt-8px，z-[90]，shadow-lg | 原文 |
| 内容区 | bg-slate-50，padding 移动 12px / md+ 20px | `p-3 md:p-5` |
| 版本徽标 | px-6 py-2，12px，rounded（4px），bg-muted | `rounded px-1.5 py-0.5 text-xs` |
| 移动抽屉 | w-288px（max-w-[85vw]），遮罩 slate-900/45，菜单项高 44px（h-11） | 原文 |

## 5. 主题切换机制（next-themes + PreferencesProvider）

- next-themes 挂载参数（app.tsx 原文）：`<ThemeProvider attribute="class" defaultTheme="light" disableTransitionOnChange>` → 把 `light`/`dark` 类打到 `<html>` 上；`disableTransitionOnChange` 切换时禁过渡避免闪色。
- Preferences（localStorage key `ac-energy-prefs`，JSON 合并默认值）：
```
themeMode: 'light' | 'dark' | 'auto'   默认 light
themeColor: 'blue' | 'violet' | 'green' | 'orange' | 'rose'  默认 blue
fontSize: 'small' | 'default' | 'large'  默认 default
layoutMode: 'left' | 'top'  默认 left（top 仅存值——UI 恒 disabled，照抄母线）
menuBackground: 'light' | 'dark'  默认 light
breadcrumb: true / tabs: false / pageAnimate: true
```
- 生效链路（PreferencesProvider useEffect）：
  1. `setTheme(prefs.themeMode === 'auto' ? 'system' : prefs.themeMode)` → 走 next-themes
  2. `<html>` dataset 直写：`html.dataset.fontsize`、`html.dataset.themeColor`、`html.dataset.menu`、`html.dataset.animate = on|off` → 供 CSS 按 `:root[data-theme-color='…']` 等选择器换 token
- 设置 UI = StyleDrawer（Sheet 右抽屉，`SheetContent side="right" className="w-80 overflow-y-auto"`，标题「样式设置」）：
  - RadioGroup 分组：主题模式（浅色/深色/跟随系统）、主题风格（默认蓝/紫/绿/橙/玫红）、字体大小（小/默认/大）、菜单背景（亮色/暗色）
  - 布局风格：左侧可选，「顶部」`disabled`（`peer-disabled:opacity-50`）
  - Switch 三项：面包屑 / 标签页 / 页面动画

## 6. 构建配置

- `app/tailwind.config.ts`（原文）：`presets: [createTailwindPresetOfSimple()（@lark-apaas/fullstack-presets）]`；`content: ['./client/src/**/*.{ts,tsx,css}']`；`plugins: []`。（client 目录下无独立 tailwind/vite config）
- `app/vite.config.ts`（原文）：基于 `@lark-apaas/coding-preset-vite-react` 的 defineConfig；alias：`@ → client/src`、`@io → client/src/ioserver`

## 7. 复刻要点清单（Do & Don't）

**Do**
- 以 `AppShell.tsx` 为全局外壳蓝本：左 aside（可折叠 256↔80px）+ 右列（h-14 顶栏 + bg-slate-50 内容区）
- 侧栏阴影必须双写：`shadow-[inset_-1px_0_0_0_#E2E8F0D1,12px_0_32px_#0F172A0D]`（内侧 1px 高光 + 外投影），单写外阴影会丢衔接高光（历史踩坑：品牌区改造时曾被误删）
- 面包屑当前页用胶囊：`rounded-full border-blue-200/85 bg-[#f0f7ff] px-[10.4px] py-[5.6px] text-xs font-bold text-slate-600`
- 单子项分组渲染成一级大按钮（forceGroup 才强制分组壳）——母线结构 1:1
- 菜单激活态 `bg-primary text-white`；权限不足置灰 `text-muted-foreground/40` 且点击拦截
- token 体系照抄 oklch 原值；slate-500/600/700 必须钉回 hex（#64748b/#475569/#334155），否则 Tailwind v4 渲染偏灰
- 主题切换走 next-themes `attribute="class"` + `<html>` dataset（themeColor/fontsize/menu/animate 四个）
- 按钮全局 hover：`translateY(-1px)` + 0.18s 四属性过渡
- 双层守卫都要做：AuthGuard（localStorage token + /api/auth/profile + guest 拦截）+ AppShell（/api/io/auth/me + casl AbilityProvider）

**Don't**
- ❌ 不要用 `components/Layout.tsx` 复刻框架——它是旧版暗色 cyan 布局，路由已不引用
- ❌ 不要在暗色下给 info/success/warning 另配值——深色套未覆写，沿用浅色
- ❌ 不要动 shadcn `--accent` 做品牌强调——cyan 强调色有专用 `--brand-accent`（工艺图流动/实时链路/选中描边）
- ❌ 不要给「顶部布局」选项实现功能——仅存值，UI 恒 disabled（照抄母线）
- ❌ 不要用默认 OKLCH slate 写新组件（会与钉回的 hex 不一致）；文字主色用 `text-[#334155]`（菜单叶子原文）而非 slate-700 class 时注意二者等价
- ❌ token 失效不要只跳 /login——AppShell 契约是进锁屏（AUTH_EXPIRED_EVENT → lock()）
- ❌ 顶栏分隔线是 `h-5 w-px bg-slate-200`（20px 高竖线），不是通高分隔
- ❌ 图标统一 lucide-react，尺寸：菜单 icon `size-4`、顶栏小图标 `size-3.5`、分组箭头 `size-[13px]`、汉堡/关闭 `size-5`

## 附：文件清单（本文档依据）

- `src/app.tsx`、`src/router/index.tsx`、`src/router/AuthGuard.tsx`
- `src/components/Layout.tsx`（旧版，仅存档参考）
- `src/index.css`、`src/tailwind-theme.css`、`src/typography.css`
- `src/ioserver/components/AppShell.tsx`、`SidebarNav.tsx`、`nav-tree.ts`
- `src/features/preferences/index.tsx`、`StyleDrawer.tsx`
- `app/tailwind.config.ts`、`app/vite.config.ts`
