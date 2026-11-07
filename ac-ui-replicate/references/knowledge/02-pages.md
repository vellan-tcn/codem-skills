# 02 · 页面级知识库（pages/ 全模块）——瘦身版

> **瘦身版（2026-09-21 评审 M1）**：已删除与 DESIGN.md §3 页面模式库 A–J 重复的骨架/布局描述与通用三态规范，只保留**业务细节**（API 路径、轮询间隔、状态机、映射常量、表单校验、页面专属 class 值）。骨架先查 `../DESIGN.md` §3，再回来查本文件对应页面节。完整历史见 git / `docs/ui/knowledge/` 归档。
> 来源：`app/client/src/pages/` 全量源码逐文件分析（2026-09-21）。所有 class / props / 数值均从源码原文抄录，禁止臆测。
> 目录下存在两套设备页：`devices/`（亮色列表+详情+表单弹窗，路由 `/devices`）与 `DevicesPage/`（暗色卡片式接入管理），并存于源码，均收入本文。

## 页面索引

| 路由 | 页面 | 对应 DESIGN.md 模式 | 本文件节 |
|---|---|---|---|
| /dashboard | DashboardPage | 亮色 + §6.4 KPI | 1 |
| /realtime | RealtimePage / PointTrendDrawer | 模式 E + 表格 | 2 |
| /devices | DevicesPage / DeviceDetailPage / DeviceFormDialog | 模式 A/B/C | 3 |
| /energy | EnergyPage | 亮色 + 模式 G | 4 |
| /process | ProcessPage | 模式 I | 5 |
| /alarms | AlarmCenterPage / AckDialog / AlarmDetailDrawer | 模式 A + 抽屉 | 6 |
| /system/* | Users/Roles/UserAccess/ApproveDialog/AlarmRules | 模式 A/C + §6.1 权限 | 7 |
| /login | LoginPage | 模式 J | 8 |
| /gate | AccessGatePage | 模式 F | 9 |
| /analysis | AnalysisPage 等 | 模式 F + G | 10 |
| /monitor | MonitorPage / Schematic | 模式 F + I | 11 |
| 接入管理 | DevicesPage(DeviceDialog/PointsDialog) | 模式 F + C | 12 |

（ExamplePage 全文件注释无生效代码；Placeholder `text-lg font-medium {title}占位`；NotFound 引 `@lark-apaas/client-toolkit/components/NotFoundRender`。）

---

<a id="dashboard"></a>
## 1. dashboard — DashboardPage（107 行）

- **数据**：3 条 `usePollingQuery`（默认间隔）：`/api/dashboard/overview`、`/api/dashboard/trend?range=24h`、`/api/energy/breakdown?period=month`
- **KPI 卡跳转**：在线→`/devices?status=online`、离线→`/devices?status=offline`、未确认报警→`/alarms?status=active`、今日能耗→`/energy`；离线设备/未确认报警数值 danger 红（`danger={Boolean(d?.offlineDevices)}`，`text-[#ef2c2c]`）
- 加载态 KPI 值显 `'…'`；空态「本月暂无能耗数据」
- TOP5 能耗行：设备名 Link→`/devices/${it.deviceId}`，`hover:text-[#2563eb] hover:underline`；数值 `font-semibold tabular-nums text-[#7e22ce]`，kWh `toFixed(0)`；序号 `padStart(2,'0')`
- 图表在 components/charts（PowerTempChart / StatusDonut），本页无 option
- TONE 色板（图标块）：blue `#2563eb`、orange `#f97316`、red `#ef2c2c`、green `#10b981`（均 `/10` 底）
- PageCard 标题栏左侧色条由 `t.iconColor.replace('text-','bg-')` 动态生成

---

<a id="realtime"></a>
## 2. realtime — RealtimePage（157 行）/ PointTrendDrawer（71 行）

- **主表轮询**：`usePollingQuery(['realtime','points',tab,kw], /api/realtime/points?...)`（默认间隔）；Tabs 四项 all/normal/warning/alarm（全部/正常/预警/报警）
- **useFlash 闪烁**（行级）：值变化才闪，同页 8s 至多一次（`setTimeout(()=>setFlash(false), 8000)`），闪烁 `animate-pulse`
- **isStale 陈旧判定**：`Date.now() - recordedAt > DATA_STALE_MS` 整行 `opacity-40`
- **SSE 有人云实时流**：`new EventSource('/api/realtime/usr-stream?token=...')`，token 从 `localStorage.getItem(TOKEN_KEY)` 走 query 参数；监听 `open`→usrLive=true、`points`→JSON.parse 合并 `{relId:{value,time,name}}`（异常帧 catch{} 静默）、`onerror`→usrLive=false（EventSource 自动重连）；卸载 `es.close()`
- 有人云列表：按 name 过滤 → time 降序 → `.slice(0, 30)`；空态「等待设备上报数据（约 60s 一轮）…」/「实时链路未连接」；搜索 Input `h-7 w-36 text-xs md:w-48`
- SSE 状态圆点 `h-1.5 w-1.5 rounded-full`：live=`bg-emerald-500` / 断开=`bg-gray-300`；文案「实时更新中」/「实时已断开，重连中…」
- 行点击 `setTrend(r)` 开趋势抽屉；placeholder：主搜索「搜索测点/设备名」、有人云「搜索变量名」
- **PointTrendDrawer**：`max-h-[75vh]`，标题 `{deviceName} · {identifier} 趋势`；range Tabs 1h/24h/7d（默认 '24h'）；`useQuery` key `['realtime','history',deviceId,identifier,range]`，`enabled: open && Boolean(row)`；图表 `h-64 w-full min-w-[480px]`，option：`tooltip axis / grid{left:48,right:16,top:16,bottom:28} / xAxis time / yAxis{value,scale:true} / line showSymbol:false`，卸载 dispose

---

<a id="devices"></a>
## 3. devices — DevicesPage（68 行）/ DeviceDetailPage（99 行）/ DeviceFormDialog（95 行）

### DevicesPage（模式 A）
- Input `placeholder="搜索设备名/编号"` `w-64`；status 来自 URL `?status=online/offline`（KPI 卡跳转入口），筛选徽章 `<Badge variant="outline">筛选：在线/离线</Badge>`，前端 `.filter()`
- 轮询 15s：`usePollingQuery(['devices','list',kw,status], /api/devices?..., 15000)`
- 行点击 `nav('/devices/${d.id}')`
- `TYPE_LABEL = { chiller:'冷水机组', cooling_tower:'冷却塔', chwp:'冷冻水泵', cwp:'冷却水泵', ahu:'空调箱', collector:'分集水器' }`；`STATUS_LABEL = {normal:'正常',warning:'预警',alarm:'报警'}`（空态「暂无设备」）

### DeviceDetailPage（模式 B）
- 三查询 useQuery：`/api/devices/${id}`、`/points`、`/events`；错误态「设备不存在」
- Tabs `defaultValue="points"`：points（`min-w-[480px]`，空态「暂无测点」）/ events（时间线行 `flex items-start gap-3 pb-4`，圆点 `mt-1 h-2.5 w-2.5 rounded-full`，上线 emerald/离线 zinc-400）/ info（`dl grid grid-cols-1 gap-x-8 gap-y-2 md:grid-cols-2`）

### DeviceFormDialog（模式 C，react-hook-form + zod）
- schema：name `min(1,'设备名必填')`、deviceNo `min(1,'设备编号必填')`、type `z.enum(['chiller','cooling_tower','chwp','cwp','ahu','collector'])`、ratedPowerKw `z.coerce.number().positive('额定功率必须大于 0')`、location/remark optional
- 提交 POST `/api/devices` / PUT `/api/devices/${id}`；成功 `qc.invalidateQueries(['devices'])`；额定功率 `type="number" step="0.1"`；备注 Textarea `rows={3}`；类型下拉遍历 TYPE_LABEL

---

<a id="energy"></a>
## 4. energy — EnergyPage（162 行）

- 周期 Tabs day/month/year（`PERIOD_LABEL = {day:'日',month:'月',year:'年'}`）+ 本日/本月/本年 outline sm 按钮组（点击重置 customStart/End 并 date=今天）+ 自定义日期区间（`type="date"` `w-36` ×2，中间「至」）+ 导出（`ml-auto`，Download 图标）
- **effective 计算**：customStart && customEnd 同时有值 → `{period:'day', date:customStart}`（自定义范围走日明细叠加，后端按日聚合）
- 轮询 60s：`/api/energy/summary?period=&date=`、`/api/energy/breakdown?period=&date=`
- **CSV 导出**：前端拼 `'\uFEFF设备,能耗(kWh),占比\n'` + 行，`Blob type:'text/csv'`，`a.download = energy-${period}-${date}.csv`，createObjectURL → click → revoke
- 汇总：currentKwh `toFixed(1)`；环比 `momPct>0 ? '+' : ''` + `%`（>0 显 TrendingUp+text-destructive，否则 TrendingDown+text-emerald-600）
- 图表（echarts.init 手动）：Bar `grid{left:48,right:16,top:16,bottom:40}`，xAxis category `axisLabel:{interval:0,rotate:30}`，series bar `itemStyle:{color:'hsl(199 89% 48%)'}`；Pie `tooltip item / legend bottom:0 / radius:['40%','70%']`

---

<a id="process"></a>
## 5. process — ProcessPage（17 行）/ process-binding.ts（20 行）

- 根 `h-full overflow-x-auto` > `h-full min-w-[640px]` > `<BindingSvg values={...}/>`
- 数据：`usePollingQuery(['process','realtime'], '/api/process/realtime')`；**兼容两种响应**：后端直返 map / 包装 `{points}`——`values?.points ?? values ?? {}`
- `BindingSpec`：`deviceId / identifier / label / unit? / kind('chiller'|'cooling_tower'|'pump'|'ahu'|'valve'|'pipe') / x / y / png? / warnAbove? / alarmAbove?`
- `PROCESS_BINDING` 8 条：1#/2#冷水机组（chiller_1_power，alarmAbove 320，chiller-run.png）；冷却塔（ct_fan_freq，tower-run.gif）；冷冻/冷却水泵（chwp_1_power/cwp_1_power，pump-run-cw.gif）；AHU 送风温度（chw_supply_temp，warn 16/alarm 20）；冷冻水供/回水（supply_temp warn 9 alarm 12 / return_temp warn 14 alarm 16）

---

<a id="alarms"></a>
## 6. alarms — AlarmCenterPage（148 行）/ AckDialog（59 行）/ AlarmDetailDrawer（86 行）

- KPI 卡行 `grid grid-cols-2 gap-3 md:grid-cols-4`：4 个可点 outline Button（`h-auto justify-between p-4`）——未确认/已确认/已处置/今日新增；点击设 status 筛选（今日卡点击置空）
- 筛选：级别 Select（紧急/重要/一般，trigger `h-10 w-full md:h-9 md:w-28`，placeholder「级别」）+ 状态 Select（`STATUS_TAB = {active:'未确认',acked:'已确认',resolved:'已处置'}`）+ 只看我的 Checkbox + 全部确认（`ml-auto h-10 md:h-9`，`disabled={!stat('active')}`）
- **双形态列表**：小屏卡片 `space-y-2 md:hidden`（aria-hidden=true，保 jsdom 测试唯一语义）+ 桌面表格 `hidden rounded-md border md:block`
- 查询：`usePollingQuery(['alarms','list',status,level,mine], /api/alarms?status=&level=&mine=1&pageSize=50)`（pageSize 固定 50）
- **状态流转**：active →（确认，POST `/api/alarms/${id}/ack` body {note}）→ acked →（处置，POST `/api/alarms/${id}/resolve` body {conclusion}）→ resolved；全部确认 POST `/api/alarms/ack-all`；操作后 `qc.invalidateQueries(['alarms'])`
- 操作列按状态：active→「确认」、acked→「处置」（sm outline，stopPropagation）
- `LEVEL_BAR = {'紧急':'bg-red-500','重要':'bg-amber-500','一般':'bg-sky-500'}`（缺省 bg-slate-400）；`STATUS_CLS = {active:'bg-red-500/15 text-red-500', acked:'bg-amber-500/15 text-amber-500', resolved:'bg-emerald-500/15 text-emerald-600'}`
- **AckDialog**：`sm:max-w-md`；Textarea `rows={4}`，placeholder 处置「处置结论（必填）」/确认「确认备注（选填）」；打开重置 `useEffect(()=>setText(''),[row?.id,open])`；`disabled={submitting || (isResolve && !text.trim())}`
- **AlarmDetailDrawer**：`max-h-[80vh] overflow-y-auto`；三区块：触发快照（dl `grid grid-cols-3 gap-2 tabular-nums`，触发值 `font-semibold text-destructive`）、前后 1h 曲线（h-56）、处置时间线（⏰ 触发/✅ 确认/🔧 处置，未处理「待确认」/「待处置」）；查询 `/api/realtime/history?deviceId=&identifier=&range=1h`

---

<a id="system"></a>
## 7. system 权限管理（5 文件；权限模型见 DESIGN.md §6.1）

### UsersPage（93 行）
- 轮询 30s：`/api/users` + `/api/roles`（`roleName = find(r=>r.id===roleId)?.name ?? '—'`）
- 操作：编辑（ghost sm `h-7 px-2 text-xs`）+ 停用（`disabled={u.status==='disabled'}`，PUT `/api/users/${id}` body `{status: active⇄disabled}`）
- 来源 Badge outline：feishu→「飞书」/本地；空态「暂无用户」
- UserFormDialog：`sm:max-w-md`；用户名 Input `disabled={!isNew}`；初始密码仅新增显（placeholder「至少 8 位」）；保存禁用 `isNew && (!form.username || form.password.length < 8)`；新增 POST `/api/users`（含 password）/编辑 PUT（仅 nickname/roleId）

### RolesPage（102 行）
- 轮询 30s：roles + users（用户数前端 filter 统计）；行点击开编辑
- RoleFormDialog：`sm:max-w-lg`；角色码 `disabled={!isNew}` placeholder「admin / operator」；保存禁用 `!form.code || !form.name`
- **权限矩阵**：`MODULES`（7 模块）× `ACTIONS`（view/operate），权限串 `${m}:${a}`，Checkbox `aria-label={m.label-a.label}`

### UserAccessPage（122 行）
- 错误条 `rounded-md border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs text-red-400`
- 轮询：users `/api/admin/users` 30s、roles 60s；Tabs「待开通（N）/已开通（N）」；UserTable `min-w-[640px]`
- StatusBadge：pending `bg-amber-500/15 text-amber-400 border-amber-500/30`「待开通」；disabled `bg-red-500/15 text-red-400`「已停用」；其余 `bg-emerald-500/15 text-emerald-400`「已开通」
- 操作：pending→批准开通（ghost h-7 text-emerald-400）；enabled→停用（text-red-400）；其他→恢复（text-emerald-400）；POST `/api/admin/users/${id}/disable|enable`
- **可分配角色白名单** `APPROVABLE_ROLE_CODES = ['viewer','operator']`

### ApproveDialog（65 行）
- `sm:max-w-md`；标题「批准开通 · {nickname||username}」；角色 Select 默认 `useState('viewer')`；POST `/api/admin/users/${id}/approve` body `{roleCode}`；成功 invalidate `['admin-users']`

### AlarmRulesPage（93 行）
- 轮询 30s `/api/alarm-rules`；列：设备/测点/条件（`{direction} {threshold}` tabular-nums）/预警带宽（空 '—'）/级别/通知（feishu→「飞书 bot」/「无」）/启用 Switch
- **行内启用开关**：`onCheckedChange` toggle PUT `/api/alarm-rules/${id}` body 全量 rule + `{enabled}`；单元格 stopPropagation
- RuleFormDialog：`sm:max-w-md`，布局 `grid gap-3`：设备+测点（cols-2，测点 Select `disabled={!form.deviceId}`，设备变化清空 pointIdentifier）> 方向（`>`/`<`）+阈值+预警带宽（cols-3）> 级别+通知（cols-2）
- 级联查询：points `useQuery('/api/devices/${deviceId}/points')` `enabled:!!form.deviceId`；保存禁用 `!deviceId || !pointIdentifier || threshold === ''`
- **保存后未 invalidate**（仅 onClose）；空态「暂无报警规则」

---

<a id="login"></a>
## 8. login — LoginPage（264 行，状态机见 DESIGN.md 模式 J）

- **URL 带 `?qr=`**：手机端扫码确认页——探测成功 POST `/api/auth/qr-confirm {qrToken}` → phone-confirm「扫码确认成功，请回到电脑端查看」；失败提示「请在飞书 App 内打开此链接完成确认；或回到电脑端使用账号密码登录」；token 仍写 localStorage
- 账密登录 POST `/api/auth/login {username,password}`（`noAuthRedirect:true`）；remember 写 `ac-energy-remember`
- **扫码轮询**：POST `/api/auth/qr-init` 取 qrToken → `appUrl('/login?qr='+token)` 生成二维码（QRCode.toDataURL {width:220, margin:1}）→ `setInterval(2500)` 轮询 `/api/auth/qr-status?qrToken=`；confirmed+token → 清定时器 + enterSystem；expired → 「二维码已过期，请重新发起」+ 回 form；轮询失败静默重试
- choose 视图两按钮：飞书登录（`border-cyan-400/30 bg-cyan-400/10 p-5 hover:bg-cyan-400/20`，Smartphone `h-8 w-8 text-cyan-300`）；账号密码（`border-white/15 bg-white/5 p-5 hover:bg-white/10`，KeyRound `h-8 w-8 text-white/60`）；`data-testid="choose-feishu"/"choose-form"`
- form：Label+Input（`autoComplete="username"/"current-password"`）；记住密码 Checkbox（`data-testid="remember"`）；错误 `<p role="alert" className="text-sm text-red-400">`；提交 `w-full` loading「登录中…」/「登 录」
- 左侧品牌区 h1 `text-4xl font-bold`；主视觉 css 渐变+光斑（无外链图）
- 登录成功统一跳 `/dashboard`（replace）

---

<a id="gate"></a>
## 9. gate — AccessGatePage（30 行）

- 图标块 `h-20 w-20 rounded-2xl border border-cyan-500/20 bg-[#0d1728]`（ShieldAlert `h-10 w-10 text-cyan-400`）；标题「暂未开放」/「请联系管理员开通」
- 唯一交互：退出登录——`localStorage.removeItem(TOKEN_KEY)/(USERNAME_KEY)` + `navigate('/login',{replace:true})`

---

<a id="analysis"></a>
## 10. analysis — AnalysisPage（73 行）/ EnergySavingCharts（158 行）/ TrendQueryPanel（200 行）

### AnalysisPage
- KPI：累计节能量（万kWh `(x/10000).toFixed(1)`，emerald-300）/平均节能率（%，emerald-300）/今日能耗估算（`toFixed(0)`，cyan-300）/今日节能率（%，sky-300）；无轮询（useEffect 一次拉 `getEnergySummary()`），无值 `'--'`

### EnergySavingCharts
- 粒度 day/month，映射 `DAYS_BY_GRANULARITY = {day:30, month:365}`；granularity 变化重拉 trend（cancelled flag 防竞态）
- 右卡头「周期节能 {savingTotal.toLocaleString()} kWh」（`text-xs text-emerald-300`，savingTotal = max(0, beforeTotal-afterTotal)）
- **savingRateOption（双 Y 轴柱+线）**：`legend:{bottom:0, textStyle:{color:'#94a3b8'}}`；`grid:{left:'3%',right:'4%',top:'12%',bottom:'20%',containLabel:true}`；xAxis label `granularity==='month' ? r.day : r.day.slice(5)`，色 `#64748b`；节能量 bar `#22d3ee` borderRadius [3,3,0,0]；节能率 line yAxisIndex:1 `#34d399` smooth
- **compareOption（双柱对比）**：改造前基准 `#475569`、改造后实际 `#34d399`（均 borderRadius [3,3,0,0]）
- ReactECharts `h-[320px] min-w-[560px]`；空态 h-[300px]「暂无统计数据」/「加载中…」

### TrendQueryPanel
- RANGE_PRESETS：`1h/6h/24h/3d/7d`（hours 1/6/24/72/168）；设备 Select `w-56`、时间范围 Select `w-36`（均 `bg-slate-900 border-slate-700`）
- 测点 Checkbox 组：**默认选中 = 首设备前 2 个测点**，切设备重置；**多选上限 5**（超出 `toast.warning('最多同时对比 5 个测点')`）
- 查询 start/end ISO（end=now，start=now-hours×3600000）；失败 `toast.error('历史趋势查询失败')`；依赖变化自动 runQuery
- SERIES_COLORS = `['#22d3ee','#34d399','#fbbf24','#a78bfa','#f472b6']`；系列名带单位；xAxis formatAxisTime：≤24h 显 HH:mm，否则 MM-DD HH:mm；ReactECharts `h-[340px] min-w-[560px]`

---

<a id="monitor"></a>
## 11. monitor — MonitorPage（216 行）/ Schematic（233 行）/ useRealtime（32 行）

### useRealtime
- `useRealtime(intervalMs = 8000)`：getRealtimeSnapshot → setSnapshot；失败 `setError('实时数据获取失败')`（**不清空 snapshot**）；setInterval + 卸载 clearInterval；返回 `{snapshot, error, refresh}`

### MonitorPage
- 头部数据时间提示「数据更新于 HH:mm:ss · 每 8 秒自动刷新」/「正在连接采集服务…」；手动刷新 outline sm（RefreshCw `w-3.5 h-3.5`）
- KPI：系统总功率（amber-300）/总制冷量（cyan-300）/系统 COP（sky-300）/今日节能率 %（emerald-300）/累计节能量 万kWh（`(x/10000).toFixed(1)`）；**有活动告警时全部 KPI 加 `border-red-500/50`**
- 组态卡：无 snapshot 显 `h-[360px]`「组态画面加载中…」；有则 `overflow-x-auto` > `min-w-[840px]` > Schematic
- 告警卡：头 AlertTriangle amber-400「告警记录」+ 活动告警 Badge destructive「有活动告警」；空态 CheckCircle2 emerald-500「暂无告警，系统运行正常」；列表 `max-h-44 overflow-auto`，行 active=`bg-red-500/10 border border-red-500/30 text-red-300`、非 active=`bg-slate-800/40 text-slate-400`；阈值显示条件 `threshold.startsWith('>')||startsWith('<')`
- **设备参数弹窗**：DialogContent `bg-[#0f1b31] border-slate-700`；`DEVICE_DIALOG_META`：chiller（prefixes `['chiller_1','chw_supply','chw_return','chw_flow','cw_supply','cw_return']`）、cooling_tower（`['ct_']`）、chw_pump（`['chwp_1']`）、cw_pump（`['cwp_1']`）；行 `rounded-md bg-slate-800/50 px-3 py-2`；告警点加 Badge destructive「告警」

### Schematic（组态 SVG，布局/描边/动画规格见 DESIGN.md 模式 I）
- `viewBox="0 0 1200 620"`；画布底 `SCADA_CANVAS_BG = '#2f314a'`
- **状态判定** `stateOf(statusKey, prefix)`：prefix 内任一点 alarm → 'fault'；status 值 ≥1 → 'running'，否则 'stopped'
- 位图元件尺寸：BitmapChiller 220×~145、BitmapPump 92×~69（cw/ccw 双方向）、BitmapTower 114×~120；Tag 标签黑底彩框（高 20，字 11px，宽动态）
- 元件位置常量：CW_PUMP_X 244、CHW_PUMP_X 894、CHILLER_X 470、CHILLER_Y 258 及比例系数；4 个可点设备组 + 空调末端虚线框 + ΔT 标注（cw_return - cw_supply `toFixed(1)`℃）+ 底部图例

---

<a id="devicespage"></a>
## 12. DevicesPage — 设备接入管理（236 行）/ DeviceDialog（188 行）/ PointsDialog（246 行）

### DevicesPage（暗色，模式 F）
- 新增设备 Button `bg-cyan-600 hover:bg-cyan-500`；**轮询 15s（自管 setInterval，非 usePollingQuery）**
- 设备卡 `grid grid-cols-1 lg:grid-cols-2 gap-3`：图标块 `w-10 h-10 rounded-lg bg-slate-800`（Cpu `text-cyan-400`）；副信息 `{类型} · {仿真数据源|现场接口} · {collectInterval}s 采集`；在线 Badge online=`bg-emerald-500/15 text-emerald-300 border-emerald-500/30`、离线=`bg-slate-700/50 text-slate-400`；最近数据 + endpointUrl（真实设备才显）
- 操作组：连接测试（testingId 独占禁用，文案 测试中…/连接测试，结果 toast）/测点配置（Settings2）/编辑（Pencil）/删除（Trash2，`hover:text-red-400`）
- 删除确认 AlertDialog：「将删除「{name}」及其全部测点与历史采集数据，且不可恢复。确定继续吗？」确认 `bg-red-600 hover:bg-red-500`；成功 toast「设备已删除」+ 重载
- `DEVICE_TYPE_LABELS = { chiller_plant:'冷冻站', chiller:'冷水机组', cooling_tower:'冷却塔', chilled_water_pump:'冷冻水泵', cooling_water_pump:'冷却水泵' }`
- 空态「暂无设备，点击右上角「新增设备」接入现场数据」

### DeviceDialog
- 字段：设备名称（placeholder「如：1号冷冻站网关」）；设备类型 + 数据源类型（cols-2；simulate「仿真数据源（演示）」/ real「现场真实设备」）；数据接口地址（**仅 !simulate 显示**，说明「接口需返回 JSON，字段名为测点数据地址或参数标识，值为数值」）；采集间隔（秒）
- **校验**：名称非空；interval `parseInt` 且 5≤x≤3600；真实设备必填 endpointUrl（均 toast.warning）
- 编辑 updateDevice（simulate 时 endpointUrl 传 null）；失败 toast「保存失败，请重试」

### PointsDialog（测点配置，行内编辑）
- `max-w-2xl`；测点列表 `max-h-64 overflow-auto`，行 `rounded-md bg-slate-800/50 px-3 py-2`：名称 + 单位/地址（`text-xs text-slate-500`）+ 阈值（`text-xs text-amber-400/80 ml-auto`，`下限 X / 上限 Y`）+ 编辑（Pencil `hover:text-cyan-300`）+ 删除（Trash2 `hover:text-red-400`）
- 表单区（showForm 切换）`rounded-lg border border-slate-700 bg-slate-900/50 p-3`，cols-2：参数名称/单位/数据地址/告警上下限；placeholder：如：冷冻水供水温度 / 如：℃ / 接口返回的字段名 / 可空
- 校验：名称必填；alarmLow/High 空转 null，非数字 toast「告警阈值必须是数字」；编辑与新增共用 form（editingId 区分）；**删除无确认弹窗**（直接删 + toast）
- API：listPoints/createPoint/updatePoint/deletePoint（`@client/src/api/devices`）

---

## 13. 轮询/实时机制总表（模式 E 补充）

| 页面 | 机制 | 间隔 |
|---|---|---|
| devices 列表 | usePollingQuery | 15000 |
| system 各页 | usePollingQuery | 30000（UserAccess roles 60000；EnergyPage 60000） |
| MonitorPage | useRealtime 钩子 | 8000（默认） |
| RealtimePage 主表 | usePollingQuery（默认间隔） | — |
| RealtimePage 有人云 | SSE `/api/realtime/usr-stream?token=` | 推送驱动 |
| Dashboard/Process | usePollingQuery（默认间隔） | — |
| 接入管理 DevicesPage | 自管 setInterval | 15000 |

> 页面模式库（模式 A–J 骨架描述）已全部收敛至 `../DESIGN.md` §3，本文不再重复；权限控制模型见 DESIGN.md §6.1。
