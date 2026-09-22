---
name: report-kit-builder
description: 报告/报表/看板类项目专用 UI 快速搭建套件：report-kit 报表组件 + theme 设计令牌（CSS/图表统一风格），自带架构文档与数据链路脚本骨架。触发场景（任一即可）：用户要做运营报告、数据报表、能耗/看板、大屏、报表查询页、月度报表、趋势图表；要统一 UI 风格/主题/容器/CSS；提到复用之前那套报表框架、看板框架、用之前项目的 UI、report-kit、示例食品厂那套风格。做任何"报告类页面"前先检查本 skill。
version: 1.4.27
---

# report-kit-builder：报表套件快速搭建（自包含）

**全套源码就在本 skill 目录内，无需任何指路**：

| 资产 | 位置（skill 目录相对路径） |
|---|---|
| 设计令牌 | `assets/theme/tokens.css` |
| 图表统一配置 | `assets/theme/charts.ts` |
| 报表组件套件（14 组件+README） | `assets/report-kit/` |
| 页面组装层全量复刻基准（7 页面模块 27 tsx：Report 月度报表/RawData 示数查询/CopOverview 概览/HistoryQuery 趋势/DataCheck 校验等，含移动端卡片化） | `assets/pages-Report/` |
| 入口层（路由 app.tsx + Layout 深色导航，整屏高度公式依赖） | `assets/app-shell/` |
| 外部类型（随包：接口类型+props 类型） | `assets/shared/` |
| 四份文档（架构/复用指南/数据链路/依赖清单） | `assets/docs/` |
| 数据链路脚本（wincc/merge/sync/audit/deploy） | `assets/04_pipeline/` |

skill 根目录：`$HOME/.codem/skills/report-kit-builder/`（CodeM 标准位置；换电脑 `git clone https://github.com/vellan-tcn/codem-skills ~/.codem/skills` 即恢复，用户名/盘符不同也能用——本文所有脚本路径均已动态推导，不含本机绝对路径）

## 复刻优先流程（2026-09-22 用户定稿：先一模一样，再差异化——红线）

新项目搭报告页面的强制顺序，不得跳步：

1. **第一步 1:1 复刻——物理拷贝，禁止重写**：把 `assets/app-shell/`（入口层八件套：app.tsx 路由、Layout.tsx 导航、index.tsx 主入口含 title 守卫、index.html、index.css、typography.css、tailwind-theme.css、tailwind.config.ts）与 `assets/pages-Report/` 中对应页面模块的文件**原样拷进目标项目**，然后只在拷贝件上做局部替换（文案/数据映射/路由）。**禁止凭理解重新手写页面代码**——看誉写代码必丢细节（字号/加粗/间距/层级），历史实测：重写后字体大小与加粗大量不对。theme 令牌与 report-kit 组件原样使用，禁止手写另起炉灶。导航条目可按项目删减，但导航条本体样式与整屏高度公式必须保留且配套修改（无导航则高度公式同步调整）。**妙搭平台项目必带 index.css 中的水印隐藏规则**（`[data-custom-element^="miaoda-watermark"] { display: none !important; }`）——右下角「妙搭生成」标签一律不得显示，对外交付看板带平台水印视为事故。**title 守卫一并复刻**（index.tsx 中 MutationObserver 恢复被平台覆盖的网页标题）。

**基准页面交付清单（以 assets/app-shell/app.tsx 实际路由为准核对，逐项勾选后才能交用户）：**

| # | 路由/模块 | 必交付？ | 说明 |
|---|---|---|---|
| 1 | `/` Report（月度报表首页，含内嵌 HistoryQuery 趋势/CopOverview 概览 section） | ✅必 | 默认首页；内嵌 section 随 Report 页一起交付，不单独建路由 |
| 2 | `raw-data` / `mfg-data` RawData（示数/数据查询） | ✅必 | 缺后端/缺数据也必须复刻骨架+空态（基线自带 EmptyState/ErrorState，属复刻不算新增），不许跳过 |
| 3 | `*` NotFound | ✅必 | 404 页 |
| 4 | DataCheck / ExamplePage / 独立 CopOverview、HistoryQuery 页 | 可选 | 基准路由未挂这些页；项目确需才加独立路由，需在交付说明中注明 |

清单以基准 `app.tsx` 路由为准（以路由为准而不是以 assets 目录为准——目录里存在≠路由里挂载）；清单与基准不一致时以基准代码为真，并按「升级回灌规则」回报 skill 维护方修清单。

**功能面五维矩阵（2026-09-25 全景审计定稿）：复刻交付前必须逐格核对 `assets/FEATURE_MATRIX.md`**——A 端 × B 页面区块（section 级清单，比本表页级更细：Topbar 车间切换/打印按钮、KPI/趋势/冷热量/分析/说明各 section、筛选器/变量多选/分页等）× C 交互状态（loading/错误边界 ErrorBoundary/车间切换三处联动）× D 生命周期（F5 无状态恢复是真源行为，勿臆造）× E 环境。矩阵未列项以基准代码为真；矩阵标注「勿臆造」的项禁止自行发明实现。

2. **复刻一致性确认——diff 自检**：每个复刻文件完成后，与 skill 基准文件跑文本 diff（git diff / diff 命令），除**允许替换清单**外的差异必须为 0；字号/加粗/间距/颜色类差异一律不允许。自查通过后交用户确认；未确认一致前不得进入差异化。

**允许替换清单（封闭枚举，逐字段粒度，清单外改动一律禁止）：**
1. 文案：JSX 内的中文文本字符串与 title/label/placeholder 属性值；不改标签结构、不改 className
2. 数据映射：数据源 URL/接口路径、字段名映射、mock 数据值；不改请求逻辑结构与错误处理结构
3. 路由：path 字符串值与 Layout 导航条目的增删（导航删减时高度公式同步调整）；不改路由结构（嵌套/懒加载方式）
4. 删无关模块：整文件/整路由级删除（如 mfg-data）；不用于逐行删代码
5. import 路径：仅因项目目录结构不同产生的路径改写，指向同一文件
其余一切（className、style、字号、加粗、间距、组件嵌套结构、hook 用法、注释）均不可改。空态/错误态用基线自带 EmptyState/ErrorState 组件复刻，不算新增。
3. **发布后渲染级机械验收（2026-09-22 定稿，堵「只有文本级验收」机制洞）**：diff 全绿只证明文本一致，渲染层差异（水印/导航/空白/卡片化/吸底）只有截图能抓。复刻页部署后必须：① Playwright 双视口截图（390×844 手机 + 桌面 1280×800）；② 与基准页截图逐项核对：右下角无「妙搭生成」标签、深色导航条存在、无底部多余空白、移动端卡片化布局、数据点带日期时间戳浅色小字、月度汇总行吸底；③ URL 加 `?v=N` 破 CDN 缓存后截图两次，防止缓存假象。核对结果随交付说明一并列出，全绿才算复刻完成。
4. **差异化**：在确认一致的基线上做差异化；布局/排版类改动必须先出本地 HTML 排版预览稿给用户确认再动手（预排版红线不变）。
5. **开工版本硬校验（机械门禁，2026-09-22 加）**：动手前必做两步——① `git -C ~/.codem/skills pull`；② 读 skill 根 `VERSION` 文件比对 SKILL.md frontmatter version，二者不一致或 < 当前最新版时禁止开工，先同步再复刻（宜兴曾拿旧版基准复刻导致漏 Layout，此规则专为堵此洞）。组件选型先查 `assets/COMPONENT_INDEX.md` 索引，不必逐个翻组件文件。

背景：其它项目曾因页面组装层不在 skill 内、各 agent 自由发挥导致风格差异大；2026-09-22 用户定稿将示例食品厂页面组装层全量提炼进 skill 作为复刻基准。同日二次复盘发现：agent 凭理解重写（非拷贝）导致字号/加粗等细节大量漂移；且无页面交付清单时，agent 因缺后端/数据自行跳过数据查询页——故 1.4.19 增补「物理拷贝+diff 自检+页面清单」三条硬约束。同日三专家评审（skill 规范/MCP/Plugin）再修 6 项：交付清单改为以基准路由为准（原清单把 CopOverview/HistoryQuery 误列为独立必交付页，实际是 Report 内嵌 section）、允许替换清单改为五类封闭枚举（逐字段粒度，堵「删无关模块」后门）、空态措辞消歧、删 data-pipeline 双真源残留、新增 COMPONENT_INDEX.md 组件索引、新增 VERSION 版本硬校验；MCP/Plugin 均评估为暂不升级（阈值未达标/同步问题用版本门禁解）。

## 基线/目标值必须主动询问（2026-09-22 用户定稿红线，源自宜兴漏基线复盘）

凡涉及图表上的目标线/基准线/预警线（COP 目标基线、能耗限额、告警阈值），agent **不得自行编造、不得静默省略**，必须先向用户问清三件事再动笔：
1. **基线类型**：是 COP 目标还是能耗限额还是其它？各图表分别要哪种？
2. **数值与来源**：具体数值（或计算口径）；未定则是否先不上线等用户定？
3. **展示形式**：线型/颜色/标注文案；是否多档（如目标值+告警值）。
用户未答复前，图表先交付无基线版并在交付说明里明列「基线待定，已询问」——禁止因等不到答案就当没有这回事。项目已定基线的数值属项目专属，留在项目仓库不进 skill。

## 移动端红线（2026-09-22 专项审计定稿：以基准代码为真，规则只点名防删）

复刻时以下移动端行为全部藏在基准代码里，**逐项对照代码确认存在，不得判为无关而删**；与任何旧文档冲突时以基准代码为真：
1. **断点统一 md（768px）**：`<768px` 卡片列表（MonthlyCards，数字单行不折行 tabular-nums），`≥768px` 保持表格（MonthlyTable，md:hidden / hidden md:block 切换）
2. **月份选择条**：MonthChipsBar flex-wrap 换行布局（不固定每行个数）
3. **汇总行吸底**：TD 级 sticky bottom-0，移动端桌面端均保留
4. **示数时间戳**：PC 悬停、移动端点按弹出（ReadingValueCell 自定义 tooltip，非原生 title）
5. **水印**：一律 display:none 隐藏（见 app-shell/index.css），无「缩小贴边」选项
6. **hooks 依赖随拷**：assets/hooks/（use-mobile、useReportData、useMonthDetail 等）被 pages 模块 import，漏拷=断链
7. 渲染验收的 390×844 截图须逐项核对以上六点

## 打印功能红线（2026-09-24 专项核查定稿：资产已全在基准，规则点名防删）

复刻时打印链路四件东西全藏在基准代码里，不得判为无关而删：
1. **路由与入口**：`print-report` 路由（app.tsx）+ ReportTopbar 打印按钮（navigate 到 /print-report）必须保留
2. **打印页**：PrintReportPage.tsx 物理拷贝，只做文案/数据映射替换，布局禁重写；页内「打印」按钮调 window.print()
3. **打印样式**：index.css 的 `@media print` 块必须随 index.css 一起复刻——A4 竖版 @page、强制保留背景色（print-color-adjust: exact）、工具条 .print-toolbar 不进 PDF
4. **基线数值替换**：打印页内硬编码的 COP 基线（如 copBaseline）属项目专属，复刻时按「基线必须主动询问」红线向用户要新项目数值，禁止照搬默认值
渲染验收时加一项：print-report 页能正常打开且工具条可见（浏览器打印预览中工具条应消失、背景色保留）。

## 多机协作更新协议（2026-09-22 用户定稿：全员走 PR）

本 skill 仓库（codem-skills）的任何更新（含维护机、含创建者）一律：**切分支 → 提 PR → AI 五维评审 → 用户在任意 agent 对话里授权合并**，禁止直推 main。合并用 squash，各机开工前仍执行版本硬校验。完整流程、PR 模板、评审五维、分布式授权细则：见仓库根 `COLLAB_PROTOCOL.md`（与 SKILL.md 同目录上级）。

**更新资格红线（2026-09-22 用户定稿：无完整技能源码禁止更新）**：要更新技能必须先拥有完整技能源码——①本机 `~/.codem/skills` 为本仓库 git clone（非 zip 拷贝/散装文件）②基于最新 main（先 pull 再切分支，旧版本之上的改动作废重做）③版本硬校验通过。三条不满足的 agent 禁止提更新 PR；评审 agent 对此类 PR 一律判「建议不合」。

**业务源码前置红线（2026-09-22 用户定稿：没有源码不行）**：复刻差异化阶段凡涉及对方项目的业务 UI / 交互，必须先拿到真实源码（页面结构+组件代码+交互逻辑三类缺一不可；途径：对方源码仓 / `lark-cli apps +init` 拉取 / 对方提供文件）。明令禁止凭截图/口头描述/记忆印象想象重写业务 UI；拿不到时只交付 skill 基准骨架+空态并列素材清单索取，用户补源码后再差异化。细则见 COLLAB_PROTOCOL.md 第六节。

## skill 资产交付规则（2026-09-22 定稿：跨工作空间自适应，防「无法读取该文件」）

skill 仓库（`~/.codem/skills/`）必然在会话工作空间之外；把 skill 内文件（SKILL.md / FEATURE_MATRIX.md / COMPONENT_INDEX.md 等）直接作为 file artifact 交付时，宿主「转飞书云文档」读不到路径，报「当前无法读取该文件」。规则：
1. 交付 skill 内文件前，先 `cp` 到当前工作空间内（如 `08_scratch/` 或项目 `docs/`，路径相对 cwd 动态拼，不写死盘符），再作为 file artifact 交付；
2. 更优：直接 `lark-cli drive +import --type docx --file <复制后的路径>` 导入飞书在线文档，以 url artifact 交付（已实测）；
3. 本规则与机器/工作空间位置无关——skill 路径用 `$HOME/.codem/skills`、落地路径用 cwd 相对，换电脑/换目录自动适应。

## 反误判三条（2026-09-22 用户定稿：证据链红线，源自宜兴复刻复盘）

背景：某项目 agent 复盘差异时虚构了 3 个不存在的 commit（7115103/fb7e64/7dc4d3d）、臆断「基准落后于线上」，实际基准仓库远端 tip 从未变化。凡违反以下任一条的结论一律无效：

1. **引用必查证**：凡在报告/复盘中引用外部仓库的 commit id、版本号、线上状态，必须**当轮实际查证**（`git fetch` + `git log` / API 查询），禁止凭记忆或印象报值；查不到就写「未能核实」，不许编造或拼接。引用妙搭 origin 必须带凭证 fetch 后再列 log。
2. **归因必对照原文**：报告「与基准不一致」的原因时，必须先读 skill 基准文件实际内容逐项比对后下结论，禁止臆断「基准里有 XX / 基准落后」；结论里要写出依据的具体文件与行。
3. **复刻只减不加（空态澄清）**：复刻阶段对基线做**允许替换清单内**的修改（见上文封闭枚举五类）之外，**禁止添加任何基线不存在的元素**（小字标注、按钮、说明行、样式微调）——哪怕看起来是优化。「缺后端也要复刻骨架+空态」不与此冲突：空态用基线自带 EmptyState/ErrorState 组件，属复刻不属新增。想加东西=差异化阶段的事，先过用户确认。复刻完成自检四问：① 基准齐了吗（app-shell 八件套 + hooks + pages + theme + report-kit）？② 高度公式与导航配套吗？③ 逐个元素扫一遍，有没有基线没有的东西？④ 妙搭项目右下角「妙搭生成」标签隐藏了吗（浏览器实测，不是只看代码）？

## 跨项目源码参考库（2026-09-21 用户定稿：凡本技能做的项目自动登记，新项目开工前对比学习）

**登记规则**：每个用本技能搭建的新项目，接入 GitHub 镜像后**必须**登记进下表（登记动作算交付流程一步，忘登记=任务未收尾）；项目沉淀新亮点时同步更新「参考亮点」列。

| 项目 | GitHub 镜像（私有） | 参考亮点 |
|---|---|---|
| 示例食品厂 COP 能效报告 | https://github.com/vellan-tcn/<项目源码镜像仓库> | 真源：theme/report-kit 组件全量、月度报表+跨度合并+COP 选源算法、移动端卡片化、deploy.sh 直改部署链 |

**使用规则（新报告项目开工第 1 步，在工具链自检之后）**：
1. 按新项目类型从上表挑选相关参考项目，`git clone` 其仓库到本会话 scratchpad（只读，不改动）
2. 重点读 `05_app/client/src/pages/` 与 `04_pipeline/`：吸收页面组织、组件用法、数据管道思路——**只学思路不拷代码**，新项目代码基于 skill 内通用组件新写
3. 学到的通用层改进（组件/脚本/规范）按「升级回灌规则」回灌麻辣 05_app 真源 + sync_skill.sh，不得直接抄到新项目里私改
4. 项目特有亮点（算法/工况规则/文案）留在各自项目，只更新本表「参考亮点」列供后人索引

**约束**：克隆仅限本机已授权的私有镜像（gh 凭证 vellan-tcn）；参考库清单保真——仓库废弃/迁移时同步更新本表。

## CHANGELOG

**发版纪律（2026-09-21 用户定稿，改 changelog 必改 version）**：每次改 changelog 时，SKILL.md 头部 frontmatter 的 `version:` 字段必须同步改成同一版本号——两个动作一次完成，只改一处视为发版失败。历史教训：1.4.9、1.4.10 两版均只写了 changelog 忘改头部 version，导致版本声明失真、误判新旧；此项已纳入工具链自检第 6 项，发版后立即复核一致性。

**破坏性变更标记（2026-09-21 用户定稿，源自业界 semver 实践）**：技能改动若会导致**旧项目拿到新版后行为变化/配置失效/用法不兼容**（如组件 API 改签名、目录规范调整、脚本入参变更、SKILL.md 规则语义反转），changelog 条目必须加 `BREAKING:` 前缀并写明迁移方法；纯新增/修复不加。有 BREAKING 的版本发布后在群里告知用户「受影响项目清单 + 迁移动作」，未告知不得算发布完成。目的：技能是全项目即时生效的共享层，标记破坏性变更 = 给旧项目一个择机迁移的机会，避免坏改动瞬间打崩所有项目。


- **1.4.27（2026-09-22）** 多机协作更新流程落地（业界调研：简化版 GitHub Flow + main 分支保护）：新增仓库根 COLLAB_PROTOCOL.md + PR 模板，全员（含维护机）改 skill 一律分支→PR→AI 五维评审（真源性/一致性/回退风险/完整性/可复用性）→用户在任意 agent 对话授权合并（gh pr merge --squash）；main 设分支保护禁直推/强推、必须 PR（approvals=0，AI 评审以 comment 留档，用户授权即合并开关）且 enforce_admins 含管理员；仓库已转 public（全量脱敏+sync 门禁防客户信息回流）；sync_skill.sh 由直推 main 改为自动建分支提 PR；合并后各机版本硬校验照旧。
- **1.4.26（2026-09-22）** 修复「skill 文件转飞书云文档报无法读取」跨工作空间问题：新增「skill 资产交付规则」——skill 仓库必然在工作空间外，交付 skill 内文件必须先 cp 进当前工作空间（cwd 相对路径）再作 file artifact，或直接 drive +import 成在线文档以 url 交付；路径全部动态推导，换电脑/换工作空间自适应。
- **1.4.25（2026-09-22）** 用户问责「到处漏、要全面」后全景审计落地：新增 assets/FEATURE_MATRIX.md 功能面五维矩阵核对表（端/页面区块/交互状态/生命周期/环境逐格），补齐此前只存在代码、规则从未点名的风险项：ReportTopbar 车间切换与打印按钮（含移动端只显图标）、Report 页 section 级清单（KPI/趋势/冷热量/月度表/分析/说明/项目信息）、RawDataErrorBoundary 错误边界、loading 态、车间切换三处联动（Topbar+路由 key+URL query 回写）、分页/变量多选/筛选器；并显式标注真源未实现项（自动轮询/F5 状态恢复/键盘导航/登录页）禁止臆造。SKILL.md 主文只留入口规则，明细入矩阵文件，缓解 SKILL.md 过长问题。
- **1.4.24（2026-09-22）** 用户追问打印覆盖后专项核查修复：资产层零缺口（PrintReportPage/ReportTopbar 入口/@media print 样式均在基准），但规则层零点名——新增「打印功能红线」四条（路由入口保留/打印页物理拷贝/@media print 块随 index.css 复刻含 A4 竖版+背景色强制+工具条不进 PDF/页内硬编码 COP 基线属项目专属须按「基线必问」向用户要值），渲染验收加打印页核对项。
- **1.4.23（2026-09-22）** 移动端专项审计修复：①assets/hooks/ 整目录入基准（sync_skill.sh 2h）——use-mobile/useReportData 等被 pages import，漏拷即断链；②新增「移动端红线」七条（以基准代码为真：md 断点卡片化/月份条 flex-wrap 换行/汇总行 TD 级吸底/时间戳点按/水印隐藏/hooks 随拷/截图逐项核对），修正旧文档与真源不一致的 4 处描述（月份钮 4 个一行实为换行布局、水印缩小实为隐藏等）。
- **1.4.22（2026-09-22）** 双审计（资产穷举+规则盲区）修复：①入口层补全为八件套——index.tsx（含 MutationObserver title 守卫，此前未覆盖）、index.html、typography.css、tailwind-theme.css、tailwind.config.ts 五文件入 assets/app-shell/，同步消除 index.css @import 断链；ui/business-ui 依赖镜像整拷策略不动。②新增「发布后渲染级机械验收」：diff 全绿≠渲染一致，部署后 Playwright 双视口截图与基准逐项核对（水印/导航/空白/卡片化/时间戳/吸底）+ `?v=N` 破缓存二次截图。教训：渲染层差异至今只有用户肉眼能发现，必须机概化；title 守卫藏在 index.tsx，漏入口文件就漏守卫。
- **1.4.21（2026-09-22）** 用户实测再揭两洞并修：①妙搭右下角「妙搭生成」水印标签——麻辣靠 client/src/index.css 的 `[data-custom-element^="miaoda-watermark"]{display:none!important}` 隐藏，但该文件从未进基准（v1.4.17 补 app-shell 时漏样式文件），现入 assets/app-shell/index.css 并列为妙搭项目强制项+自检第④问（须浏览器实测）；②新增「基线/目标值必须主动询问」红线：涉基线不得编造/省略，必问类型（COP/能耗）、数值口径、展示形式，未答复则交付无基线版+明列待定。sync_skill.sh 新增 2f 同步 index.css。
- **1.4.20（2026-09-22）** 三专家评审（skill 规范/MCP/Plugin）修复 6 项：①交付清单改为以基准 app.tsx 路由为准（CopOverview/HistoryQuery 实为 Report 内嵌 section，非独立页）；②允许替换清单改五类封闭枚举（文案/数据映射/路由/删无关模块整文件级/import 路径），清单外禁改；③空态用基线 EmptyState 属复刻不算新增，消歧；④删 assets/data-pipeline 双真源残留；⑤新增 assets/COMPONENT_INDEX.md 组件索引（MCP 阈值未达标的轻量替代，组件 14 个、SKILL.md 322 行、检索台账 0 次）；⑥新增根 VERSION 文件+开工版本硬校验（堵旧版基准复刻，宜兴漏 Layout 根因）。MCP/Plugin 评估结论均为暂不升级。
- **1.4.19（2026-09-22）** 复刻流程三项硬约束：①复刻=物理拷贝文件再局部替换，禁止凭理解重写（防字号/加粗等细节漂移）；②新增基准页面交付清单核对表（RawData 数据查询/HistoryQuery/CopOverview 等必交付，缺后端也复刻骨架+空态）；③一致性确认改为 diff 自检——非允许替换处差异必须为 0。源自宜兴二次复刻复盘：重写导致字体细节大量不对、数据查询页缺失。
- **1.4.18（2026-09-22）** 新增「反误判三条」证据链红线：①引用 commit/版本/线上状态必当轮实查（fetch+log），查不到写未核实不编造；②归因必先读基准原文逐项比对；③复刻只减不加，禁加基线不存在元素。源自宜兴项目虚构 3 个不存在 commit（7115103/fb7e64/7dc4d3d）及臆断基准落后的复盘。
- **1.4.17（2026-09-22）** 补复刻基准盲区：新增入口层 `assets/app-shell/`（app.tsx 路由 + components/Layout.tsx 深色导航），复刻清单从「pages+theme+report-kit」扩为四层；复刻规则补导航/高度公式配套约束。源自宜兴项目复刻差异复盘：宜兴 Layout 空壳未复刻导航，页面仍用 calc(100vh-2.3125rem) 预留高度，底部多出 ~37px 空白。sync_skill.sh 新增 2d 入口层同步。
- **1.4.16（2026-09-22）** `BREAKING:` 页面组装层全量入 skill 作复刻基准（7 页面模块 27 tsx：Report/RawData/CopOverview/HistoryQuery/DataCheck/ExamplePage/NotFound，含移动端卡片化与 report-types.ts）；新增「复刻优先流程」红线：新项目先 1:1 复刻基准页→用户确认一致→再差异化（差异化走 HTML 预览稿）。迁移：旧项目不受影响；新项目开工先 `git pull`。同日 sync_skill.sh 改为全量同步 pages 目录（此前只同步 report-types.ts）。源自用户 2026-09-22 定稿「确保能搭出一模一样的，再在此基础上改」。
- **1.4.15（2026-09-21）** 新增后端模块跨应用移植手册（docs/BACKEND-PORTING.md）：yixing-app 等新应用补齐 raw-data/cop-overview 后端接口的完整步骤（拷目录→注册 app.module→改 pgSchema workspace 名→建表→gen:db-schema→部署→验证），含麻辣服务端模块清单。
- **1.4.14（2026-09-21）** 新增妙搭大批量上传数据库方法（另一项目急需复用）：DATA-PIPELINE.md ④-b 章节（通道选择/分片 SQL/断点续传/建表平台规范）+ sync/bulk_upload_template.sh 通用模板（源自麻辣 mfg_raw_upload.sh 实战）。
- **1.4.13（2026-09-21）** 新增跨项目源码参考库：凡本技能做的项目接入 GitHub 镜像后必须登记（名称/仓库/亮点），新项目开工第 1 步 clone 相关参考仓库对比学习，只学思路不拷代码，通用沉淀仍走回灌真源。
- **1.4.12（2026-09-21）** 新增破坏性变更标记规则：不兼容旧用法的改动 changelog 条目必须加 `BREAKING:` 前缀并写明迁移方法，发布时告知受影响项目清单——源自多项目共享技能的业界 semver 实践调研。
- **1.4.11（2026-09-21）** 发版纪律固化：新增「改 changelog 必同步改头部 version」规则（用户定稿，源于 1.4.9/1.4.10 连续两版 version 滞后的教训），与工具链自检第 6 项联动，任何项目 agent 发版都必须遵守。
- **1.4.10（2026-09-21）** 新增工具链定期自检机制（用户定稿）：新项目开工/每日首次用技能/遇异常时自动跑六项轻量自检（Mem0 REST、MCP 桥、lark-cli、Git/GitHub、部署脚本、版本一致性），失败走降级+台账，不再临时排查才发现链路不通。
- **1.4.9（2026-09-21）** 接入云端语义记忆 Mem0（用户定稿）：与本地 md 记忆两层并存；MCP 全机共用 + REST 兜底，双层 user_id 隔离（项目层/全局层），关键决策当轮写入、新会话开场检索，跨项目/跨设备/跨 agent 共享记忆池；操作手册引用飞书复盘文档。
- **1.4.8（2026-09-21）** 记忆系统补跨 agent 兜底（用户定稿）：非 CodeM 宿主无自动注入时，agent 开工第 0 步先通读 `.codem/memory/`；记忆文件纯 md 全平台可读，路径格式一致，只注入方式不同。
- **1.4.7（2026-09-21）** 新增项目记忆系统（用户定稿）：新项目开工同步建 `.codem/memory/`，会话中关键决策/纠正/口径/契约当轮沉淀进项目记忆，新会话自动注入恢复上下文；记忆同样单文件+删旧填新，项目专属留项目、通用规则提升回灌 skill。
- **1.4.6（2026-09-21）** 方案梳理补项目隔离原则（用户定稿）：骨架/方案/todo/台账都活在各自项目工作空间内互不越界，A 项目方案绝不写进 B 项目；skill 只存跨项目通用规则，项目专属内容留在本项目。
- **1.4.5（2026-09-21）** 方案梳理升级单文件原则（用户定稿）：一主题一方案文件，禁止 v2/final 式多版本克隆；todo 走内置清单+文档内章节不另建文件；颠覆性推翻=全文清空重写；版本追溯走 git 历史不留磁盘副本。
- **1.4.4（2026-09-21）** 新增讨论与方案梳理（用户定稿）：讨论/头脑风暴/碎片想法触发即建档（task 清单 + plan 文档），每轮增量更新，方案推翻=删旧立新只留当前有效版，收敛后转 writing-plans/brainstorming 产出执行计划。
- **1.4.3（2026-09-21）** 新增已学资料纠错规则（用户定稿，防幻觉）：错误经交叉验证确认后删错填对、原地替换，禁止新旧说法叠放并存；纠错记台账留痕、同源同修 grep 无残留、冲突以最新证实版为准。
- **1.4.2（2026-09-21）** 新增目录梳理三步法（用户定稿）：①扫描盘点出清单（不许跳过直接动手）→ ②按清单删/归位/补建（删除先报用户确认）→ ③收尾查白名单外新文件 + 里程碑复盘目录树防乱建。
- **1.4.1（2026-09-21）** 新增工作空间范围红线（用户定稿）：所有修改/新增/复制/删除一律在项目工作空间内进行，外部目录默认只读；范围含糊时先确认再动。
- **1.4.0（2026-09-21）** 三专家复盘落地：①修复双版本漂移（删 assets/data-pipeline 旧残留，SKILL.md 5 处引用改指 assets/04_pipeline）；②新增 manifest.json 机器可读组件清单（14 组件 name/aliases/guarantees/props，MCP 前置）；③新增「MCP/Plugin 升级接口预留」章节（MCP 4 tool 预案只读检索层、Plugin 拆 3 skill+plugin.json+双真源隔离）。
- **1.3.2（2026-09-21）** 新增纯本地版（无妙搭）项目用法：Vite+shadcn 脚手架替代妙搭建应用（已验证 report-kit 14 组件 0 依赖 @lark-apaas、无飞书域名）、npm build 自行部署、数据层换本地 SQLite/PG，妙搭专属条款自动降级。
- **1.3.1（2026-09-21）** 新增任务收尾规范（截图归档 06_deploy/screenshots 带日期命名、08_scratch 定期清理、根级自查、构建产物不入库）+ 跨 agent 适配说明（资产通用/部署链 CodeM 绑定分层）。
- **1.3.0（2026-09-21）** 新增工作区目录规范（用户定稿，所有项目固定一致）：01_raw~99_archive 编号+英文九目录，根级只留台账/记忆；新项目第 0 步先建骨架，临时文件进 08_scratch、交付报告进 07_reports，防根目录腐化。
- **1.2.1（2026-09-21）** 同类问题清扫：换电脑恢复改走 GitHub clone + git-credential-init 接回（不再 +init）；deploy.sh CODEM CLI 版本路径动态探测（不再硬编码 0.1.209）、config 路径/技能路径改 $HOME 相对（跨用户/换机不挂）。
- **1.2.0（2026-09-21）** 新项目初始化改为主走「GitHub 模板」路径：+git-credential-init 取 repository_url + git clone 空仓 + 从 <项目源码镜像仓库> 镜像拷已验证基座，绕开 +init 在 Windows 的 tar 解析坑（GNU tar 把 C: 当远程主机）；+init 降为备选（需 bsdtar 优先）。
- **1.1.0（2026-09-21）** 多专家盘点后大修：外部类型随包（shared/pages-Report）+ DEPENDENCIES.md 依赖清单；charts.ts 与 ChartCanvas 库分工勘误（chart.js vs echarts）；DATA-PIPELINE.md 幽灵脚本勘误（sync_miaoda.py → mfg_replace_gen.py + db-execute 限制）；merge/audit 脚本项目特定参数标注；deploy.sh 参数集中化+新项目必改清单；新增 EmptyState/ErrorState 组件。
- **1.0.0（2026-09-21）** GitHub 双仓库体系落地（codem-skills 技能库 + 项目镜像库）。

## 标准流程

**工作区目录规范（2026-09-21 用户定稿，所有项目固定一致，编号+英文命名）**——新项目开跑前第一件事按此建骨架，任何文件产出必须归入对应目录，禁止散落项目根：

```
<项目名>/
├── 01_raw/          # 原始数据（按数据源分子目录，如 pei/、mfg/、wincc/）
├── 02_reference/    # 权威报告/合同/技术规格/基准 Excel（只读，不改）
├── 03_processed/    # 处理后数据（merged/audit 中间产物）
├── 04_pipeline/     # 数据管道源码（merge/audit/sync/deploy）
├── 05_app/          # 妙搭应用源码（git 仓库，GitHub 镜像同名仓）
├── 06_deploy/       # 发布产物与记录（deploy_result.txt、release 记录、截图基线）
├── 07_reports/      # 对外交付报告（PDF/审计报告/盘点报告）
├── 08_scratch/      # 临时 SQL/预览 HTML/调试 dump（可随时清理，不放交付物）
└── 99_archive/      # 归档（被取代的旧工具/旧版本）
```

根级只允许：问题台账.md、.learnings/、.codem/（项目记忆）、README（如有）。临时文件一律进 08_scratch，产出报告一律进 07_reports——这两条是防根目录腐化的关键。

**目录梳理三步法**（2026-09-21 用户定稿：对已有项目/已乱的工作空间，接手或用户说「整理一下」时执行，缺一不可）：
1. **先扫描盘点**：列出工作空间全部文件/目录（含子目录），按九目录规范对照标注「已归位 / 散落 / 该删 / 归属不明」，产出盘点清单（在 08_scratch）——不许跳过盘点直接动手删改
2. **按清单整理**：a) 该删的删（临时文件、失效缓存、构建产物——删除前列清单报用户确认）；b) 该归位的移入对应编号目录；c) 缺的骨架目录新建。每挪一个文件在清单上打勾，全程只动工作空间内部（范围红线）
3. **定期复盘防乱建**：任务收尾时 `ls` 根级 + 各编号目录查「白名单外新文件/目录/子层级」，发现即归位；每完成一个里程碑复盘一次目录树（`tree -L 2`），与规范比对并把偏差记进问题台账——治「目录自己长歪」的唯一办法是复盘频率 > 乱建频率

**工作空间范围红线（最高优先）**：所有修改、新增、复制、删除操作一律在**本项目工作空间目录内**进行；工作空间之外的文件（上级目录、其他项目目录）默认只读不写——工具能访问全盘 ≠ 有权改全盘。用户说「删掉/清理」等未指明范围时，默认只动工作空间内部；确需越界必须先向用户确认范围。

**任务收尾规范（每次任务结束必须执行，防缓存/截图散落）**：
1. **验证截图归档**：Playwright 复截/回归截图命名 `YYYYMMDD_视口_页面.png`（如 `20260921_mobile_月报.png`），统一存 `06_deploy/screenshots/`——它就是下次回归核对的基线，禁止散落根级或 08_scratch
2. **过程缓存清理**：任务收尾时清空 `08_scratch/` 中已失效的临时 SQL/dump（有价值转正：进 04_pipeline 的写正式脚本+README）；会话级临时脚本一律放 agent scratchpad，禁止落项目目录
3. **根级自查**：收尾前 `ls` 根级，出现任何非白名单新文件/目录 → 归位或删除，保持根级永远只有台账+记忆+九大编号目录
4. **构建产物不入库**：node_modules/dist/tsbuildinfo 不进 git、不进 OneDrive 同步排除（05_app 已有 .gitignore 覆盖）

**跨 agent 适配说明（哪些资产通用、哪些绑定 CodeM）**：
- **通用（任何 agent 可直接用）**：assets/ 里的 theme、report-kit、ui 组件、数据管道 python 脚本、docs 设计文档——纯技术资产，绑定 React+Tailwind 技术栈而非 agent；report-kit 全部组件已验证 0 依赖 @lark-apaas、无飞书域名硬编码
- **CodeM/飞书绑定**：deploy.sh 里的 CODEM UAT hook、lark-cli 调用、`.codem/skills` 路径——其他 agent（Claude Code / Cursor 等）使用时需把部署链换成手工 git push + 妙搭控制台发布，或参照 codem-larkcli-plugin 结构自行适配凭证
- SKILL.md 本身是 Anthropic Agent Skills 开放格式（SKILL.md + assets），Claude 系 agent 可直接识别；GitHub monorepo（codem-skills）clone 即用

**纯本地版项目（无妙搭）用法（2026-09-21 定稿）**：本地版项目跳过妙搭步骤，替代路径为——
1. **第 0 步替换**：不建妙搭应用，直接 `npm create vite@latest 05_app -- --template react-ts` + Tailwind + shadcn/ui 脚手架；report-kit/theme/shared/assets 拷入项目即可用（零依赖适配）
2. **部署替换**：`npm run build` 产物自行部署（nginx / 静态托管 / 内网服务器），06_deploy 目录仍用于存部署记录与截图基线；04_pipeline 数据管道照用（它只依赖 python+pandas，读写本地 CSV/Excel/SQL）
3. **数据层替换**：妙搭 db-execute / 线上 sensor_data 表 → 本地 SQLite/PostgreSQL（04_pipeline 脚本的 db 层参数化处可对接，Excel 对账链路不变）
4. **规范的妙搭专属条款对本地版自动降级**：如「+init 接回」「release 轮询」不适用，跳过即可；目录规范、任务收尾规范、数据红线、预览工作流全部分适用

## MCP / Plugin 升级接口预留（2026-09-21 三专家复盘定稿）

**资产机器可读化（已落地，MCP 前置）**：`assets/report-kit/manifest.json`——14 组件的 name/aliases/purpose/guarantees/props 机器可读清单，MCP search_component 直接以此为实现基础；**改组件必须同步改 manifest**（新增红线）。

**MCP 升级预案**（触发条件仍按上文自检阈值）：最小原型 4 个 tool，全部只读 skill 资产、不碰项目，杜绝双真源——
- `search_components(query)`：按 name/aliases/purpose 模糊匹配，返回 file+guarantees+props
- `list_components()`：全量清单（含 externalDeps 提示）
- `get_component_usage(name)`：返回 README 复用步骤中该组件相关约定
- `search_theme_token(token)`：查 tokens.css 语义令牌与取值
MCP server 只做检索层；生成/修改仍走 SKILL.md 流程（真源不变）。

**Plugin 升级预案**（触发条件同上文）：打包前必做三件事——
1. 拆分为 3 个 skill：`report-ui-kit`（组件+theme+docs）、`data-pipeline-kit`（04_pipeline+数据红线）、`deploy-kit`（deploy/sync 链路+收尾规范），各自 SKILL.md 短小独立
2. 根级 `.codem-plugin/plugin.json` 清单（参照 plugin_7685329803662085329 结构：name/version/skills 数组）
3. 双真源隔离：plugin 目录为分发壳，真源仍是本 skill + 各项目 05_app；用户装 plugin 后禁改其内 assets（同「禁止直接改 skill 内 assets」红线），改进一律回流真源再发版

0. **新项目初始化（硬性步骤，缺一不可）**：① 建妙搭 full_stack 应用（`lark-cli apps +create`）后，**优先从 GitHub 模板起项目，不用 `+init` 拉程序**：
   - `lark-cli apps +git-credential-init --as user --app-id <id>` 只取 `repository_url` 和 git 凭证（不跑脚手架）
   - `git clone <repository_url>` 拉新应用空仓到独立目录（如 `<项目名>/<app目录>/`）
   - `git clone https://github.com/vellan-tcn/<项目源码镜像仓库> <tmp>` 取已验证可跑的模板基座：拷 `client/src/theme/`、`client/src/components/`（ui + report-kit）、`scripts/`（pre-commit 门禁）、`tsconfig*.json`、`package.json`，**业务文件不拷**（pages/、shared/、api/、数据库 schema 按新项目重写）
   - `npm install` 后 `git push origin sprint/default` 接回妙搭
   - 理由：① 模板基座已验证可跑、自带全套依赖；② `+init` 在 Windows 有 tar 解析坑（GNU tar 把 `C:` 当远程主机，报 "Cannot connect to C:"）。若仍要用 `+init`：Windows 先 `where tar` 确认 System32 的 bsdtar 优先于 Git 的 GNU tar，失败即换回模板路径
   ② 建 GitHub 私有镜像仓库 `gh repo create <项目名> --private` + `git remote add github <url>`，部署脚本内置 `git push github`（缺这步换电脑就丢源码）；③ 拷贝本 skill 的 `assets/04_pipeline/deploy/` 作为项目部署脚本基座，按项目名改 APP_ID/路径。GitHub 凭证用 gh CLI（已登录 vellan-tcn）。
1. **拷贝核心**：把 `assets/theme/`、`assets/report-kit/` 拷入新项目 `client/src/`；`index.css` 加 `@import "./theme/tokens.css";`
2. **换肤**：只改 `tokens.css` 颜色值（rk-ink 主文字 / rk-line 边框 / rk-brand 品牌蓝 / rk-table-head 深表头等 20 个语义令牌），全套页面+图表随之统一
3. **组装页面**：pages 只做数据接线，用 report-kit 组件：MonthlyTable（月度报表）/ MonthlyCards（移动卡片）/ MonthlyFilters、RawDataFilters（筛选区）/ MonthChipsBar（月份快选）/ VariableMultiSelect（多选）/ PaginationBar / MonthlyPager（分页）/ SectionCard / ChartCanvas / ReadingValueCell（带时间戳示数）/ CopPreciseValue（精确 COP）/ EmptyState / ErrorState（空错态）
4. **图表**：`theme/charts.ts` 分两层——色板常量（`CHART_PALETTE`/`SERIES_COLORS`）通用；`axisDefaults`/`tooltipDefaults`/`dateTickLabel` 是 **echarts 配置**，供 pages 层 echarts 图表用（数据点下方日期+时间浅色小字）。`ChartCanvas` 组件基于 **chart.js**，只共享色值。详见 `assets/docs/DEPENDENCIES.md`
5. **接数据**：后端 service 按项目算法计算（COP 等算法因项目而异，换项目只改算法不动 UI）；接口类型统一写在 `shared/api.interface.ts`
6. **通用 UI 组件**（shadcn ui/）不在本 skill 内，从 GitHub 镜像获取：`git clone https://github.com/vellan-tcn/<项目源码镜像仓库>` 取 `client/src/components/ui/`（本机有真源副本时也可直接从 `示例食品厂运营报告/cop-app` 拷）。**拷完后必读 `assets/docs/DEPENDENCIES.md` 补齐全部外部依赖（类型/tsconfig 别名/api 层/npm 包），再跑 tsc 验收**

详细操作按 `assets/docs/REUSE-GUIDE.md`（必改清单+验证清单），层级说明见 `assets/docs/ARCHITECTURE.md`，数据侧见 `assets/docs/DATA-PIPELINE.md`。

## 红线（任何改版/新项目不得丢失）

1. 图表数据点下方必须有「日期+时间」浅色小字
2. 月度报表：汇总行吸底（sticky bottom）、进入即默认显示、一页显示当月全部天数（不分页截断）、跨度行「2026-05-05~2026-05-09（4天）」格式、冷量 0 显示「停机」
3. 工况标注纯文字不带数字前缀：冷量<100 kWh「冷机未开」、0「停机」、试机日期段标「试机」
4. 移动端 <768px：表格改卡片列表（数字单行不折行）、月份按钮 4 个一行、悬浮按钮缩小贴边、底部 padding≥96px、副标题完整换行
5. 示数单元格用自定义 tooltip 显示读数时间戳（PC 悬停/移动点按），非原生 title
6. 组件/页面禁止裸 hex 颜色，一律 `rk-*` 语义令牌
7. 业务计算不进前端组件
8. 涉及界面改动必须先做本地 HTML 预览稿给用户确认，再动代码（用户定稿流程）

## 验证

- `npx tsc --noEmit --incremental --project tsconfig.app.json`
- `node ./scripts/lint.js`
- 发布后 Playwright 双视口（390×844 移动 + 1280 桌面）截图逐项核对红线
- 防缓存：截图 URL 加 `?v=N` 或等 2 分钟

## 防回退机制（2026-09-21 定稿：已修复的 bug 不允许被后续改动改回去）

**背景**：真实发生过——改 A 时把 B 改丢（试机标注修好后被改版打回原状；修复代码未落盘就提交导致 bug "假修复"）。机制分三道闸：

1. **修复登记（FIXES 台账）**：每个 bug 修复完成时，在项目 `.learnings/FIXES.md` 登记一行：`日期 | 文件:行 | bug 现象 | 根因 | 修复方式 | 线上验证方式与结果`。修复未经线上复测不算完成。
2. **改动前自查**：动某文件前，先查该文件在 FIXES 台账有无历史修复条目；本次 diff 若触碰既往修复的代码区域，须确认修复逻辑仍在（grep 修复特征代码/关键 class），不允许覆盖。
3. **发布后回归核对（闭环验收）**：每次发布 finished 后，Playwright 按视口截图，除核对本次改动外，**必须逐项核对 FIXES 台账中涉及同一页面/组件的历史修复点是否仍然生效**；发现回退 → 只修回退项（注明「其他一律不动」）→ 重新发布 → 重新核对，直到全绿。截图核对不可用纯 API/状态判断替代（UI 回退只有视觉能发现）。

**经验教训（已发生过的坑，勿重蹈）**：
- 修复脚本跑完必须**回读验证落盘**（曾发生"替换成功"输出但文件未变、commit 只含部分修复）
- 发布的 release commit_id 必须核对等于本次修复 commit（曾发生 release 基于旧 commit）
- 复测脚本要选**可见**元素（hidden 容器读出 0 宽度是误报）

## 部署

```
git push origin sprint/default
→ lark-cli apps +release-create --branch sprint/default
→ lark-cli apps +release-get <rid> 轮询至 finished
```
push 前导出 LARKSUITE_CLI_* UAT 环境变量，否则报 "not configured"。完整部署脚本参考 `assets/04_pipeline/deploy/`——优先直接用该 deploy.sh（含妙搭 push + GitHub 镜像 push + release + 自动 sync_skill 一体），不要手工散跑各步。

**首次部署前必做**：确认新项目已按「标准流程第 0 步」接入 GitHub 镜像；部署时若 github push 失败，脚本会重试一次，失败不阻塞发布、下次自动补推。

**deploy.sh 拷到新项目后必改清单（缺一跑不通）**：① `APP` 改新妙搭应用 ID；② `APP_DIR` 改新代码仓目录；③ `DP` 改脚本实际所在目录；④ 新项目若未拷 `cop-app/scripts/`（pre-commit 选择性门禁：lint.js/run-precommit.js），commit 环节会失败——要么从镜像拷 scripts/，要么临时去掉 .git/hooks/pre-commit。

## 数据侧（按需）

新项目要接入原始数据时用 `assets/04_pipeline/`：WinCC 导出解码、多源合并（monthly_rank 选源）、推数上云（--environment online）、逐日校验。红线：原始数据绝对正确、缺天跨度合并不算 0、月度互证偏差>5% 须查明。注意 merge 脚本内的选源准则/坏值阈值/剔除日期段是项目特定参数，按项目改。

## 升级回灌规则（重要）

- **本 skill 是全局唯一副本，所有项目共享**：更新一次，所有项目下次调用即拿到新版。
- **唯一真源**：`示例食品厂运营报告/cop-app`（git 仓库）。通用层（theme/report-kit/docs）的任何改进，应**回灌到 cop-app 源码**，再跑 `04_pipeline/deploy/sync_skill.sh` 同步进 skill——不要直接改 skill 里的 assets，也不要在其他项目里私改通用组件，否则版本漂移。**这条对新项目同样生效：你的项目改了通用组件 = 必须回灌真源 + sync，不许只留在本项目里（曾发生：新项目只拷不改不回灌，导致其他项目拿不到改进）。**
- **各项目的定制部分不属于本 skill**：pages 组装、导航菜单、车间/项目文案、后端算法、工况标注规则、合并选源参数——留在各项目仓库内，不回灌、不进 skill。
- **差异化回流提示（2026-09-22 用户定稿）**：任何项目用本 skill 做差异化修改并触发自我迭代（skill 本地更新）后，agent **必须主动提示用户**：「是否把这些差异化更新提交到 GitHub 分支？」——① 用户选择提交 → 按仓库根 `COLLAB_PROTOCOL.md` 走分支→PR 流程，把更新内容和源码上传到分支（脱敏门禁先过，业务专属内容剔除）并请求评审；② 用户选择不提交 → 改动只留本地，不擅自推送。**不许跳过提示，也不许未经用户选择就推送**。

## 讨论与方案梳理（2026-09-21 用户定稿：碎片想法自动收敛成方案）

**项目隔离（前提）**：一切目录骨架、方案文档、todo、台账都活在**各自项目的工作空间内**（会话主工作目录），互不越界——A 项目的方案绝不写进 B 项目目录；skill/memory 只存跨项目通用规则，项目专属内容（方案/数据/页面）一律留在本项目。不同项目讨论内容不同，方案文件天然各项目各一份，永不混放。

用户进入**讨论 / 头脑风暴 / 碎片式提想法**（"东一句西一句想起一个功能"）状态时，agent 必须主动当"方案工作台"，不许让想法散落在对话里：

1. **触发即建档**：第一次出现方案讨论意图时——① `task_create` 建「方案梳理」清单（待定决策/开放问题/已定结论 三类条目）；② 建方案文档 `07_reports/plan-<主题>.md`，含：背景、目标、当前方案、开放问题、已推翻方案（只留一行存档）
2. **每轮增量更新**：用户每次补充/改口/推翻，**当轮就**更新清单和文档——已定结论打勾、新问题挂开放区、推翻的方案整段移入"已推翻"并写清推翻原因（一行），正文只保留当前有效方案
3. **方案推翻 = 删旧立新（单文件原则）**：被推翻的方案整段删除，只在文末「变更记录」留一行（日期+推翻原因）；**颠覆性推翻 = 全文清空重写**，基于原方案经验重新组织，顶部记一行「本版基于 XX 全量重写，原因：XX」。**一个工作空间一个主题永远只有一份方案文件**（`plan-<主题>.md`）——禁止 `plan_v2.md`、`plan_final.md`、`方案(新).md` 之类的多版本克隆；todo 用内置 task 清单（会话内）+ 方案文档内「待办/步骤」章节（跨会话），不另建文件；SOP 定稿后沉淀进 skill/memory，不在项目里另开 SOP 文件。文件头维护「当前版本日期 + 最近更新摘要」，需要翻旧账时查 git 历史即可，不在磁盘上留多版本
4. **收敛出口**：方案讨论收敛后 → 用 `writing-plans` 技能产出可执行计划（分阶段 todo），或 `brainstorming` 技能继续发散；方案文档归档为该计划的需求依据
5. **工具优先**：此类讨论优先复用现成技能（brainstorming / writing-plans / self-improving-agent），不重复造轮子；跨会话恢复时先读方案文档再继续，不从头问



发现已沉淀资料（SKILL.md / memory / manifest.json / docs / 台账提升出来的规则）疑似有错时，按以下流程，**知识载体里绝不保留已确认的错误内容**：

1. **先证错再动手**：错误须经交叉验证或数据实证确认（两个以上独立证据/原始数据比对），单点推断的假设不触发纠错——防止把对的改成错的
2. **删错填对（原地替换）**：确认后删除错误内容，把正确内容**原地**填进原位置——禁止「错误内容保留、旁边追加更正说明」的叠放式写法；两个版本的矛盾说法并存是大模型幻觉和混乱的直接来源
3. **台账留痕**：纠错动作记 `.learnings/LEARNINGS.md`（correction 类，Pattern-Key `knowledge.<主题>`），含：错在哪、证据、何时改正——**历史追溯只在台账，不留在知识正文**
4. **同源同修**：同一错误出现在多个载体（SKILL.md + 项目 memory + docs）时必须一次改全，grep 关键词确认无残留旧说法；改完跑 `sync_skill.sh` 让所有项目同步拿到正确版
5. **冲突以新为准**：新旧资料说法冲突时，以时间最近且经证实的版本为准；无法判断的，停下来问用户，不许自行择一保留
- 判断标准：改完后其他项目也能直接受益的 → 回灌真源；只对本项目有意义的 → 留在项目内。改完时自查一句：这次 diff 里有没有通用层文件？有 → 跑回灌流程。

## 项目记忆系统（2026-09-21 用户定稿：对话记录自动沉淀到项目工作空间）

每个项目开工建九目录骨架时，**同步建项目记忆目录 `.codem/memory/`**（根级白名单已含），承载本项目全部对话沉淀：

1. **当轮沉淀**：会话中用户给出的关键决策、纠正、业务口径、数据契约、红线 → **当轮**写成/更新进 `.codem/memory/` 按主题分文件（如 `选源规则.md`、`工况口径.md`、`部署链路.md`），不留在对话里蒸发
2. **自动注入**：`.codem/memory/` 下的文件会在新会话自动注入 system——换会话、换电脑（随 git 镜像走）后上下文自动恢复，不从头问。**跨 agent 兜底**：非 CodeM 宿主（无自动注入机制）时，agent 开工第 0 步先通读 `.codem/memory/` 全部文件再干活——记忆文件本身是纯 md，任何 agent 都能读，差异只在注入方式（CodeM 自动 / 其他手动读），文件路径和格式全平台一致
3. **迭代与纠错**：记忆文件同样遵守单文件+删旧填新原则——口径变了原地改正、推翻了删旧立新，**绝不新旧并存**；每次纠错同源 grep 确认无残留
4. **分层**：项目专属记忆只进本项目 `.codem/memory/`（随项目仓库 git 留痕）；跨项目通用规则经 Recurrence≥3 提升后回灌 skill/memory，两层不混
5. **收尾自查**：每次会话收尾检查本轮有无「说了但没沉淀」的关键口径，有则补写进记忆文件



**两条线，均自动管理，无需用户提醒：**
1. **技能库（全局一个）**：`https://github.com/vellan-tcn/codem-skills`（私有 monorepo）。本地 `~/.codem/skills` 即仓库（git 根在 skills 目录，每技能一个子目录）。sync_skill.sh 同步后自动 commit + push。
2. **项目 app 库（每项目一个）**：cop-app → `https://github.com/vellan-tcn/<项目源码镜像仓库>`（remote 名 `github`，分支 sprint/default，与妙搭远端 `origin` 并存）。deploy.sh 部署时自动 push 镜像。

**新项目接入**：见「标准流程第 0 步」（已列为硬性步骤，不照做即违规）。
**换电脑恢复**：`git clone https://github.com/vellan-tcn/codem-skills ~/.codem/skills`；项目源码 `git clone <GitHub 镜像>` 后 `lark-cli apps +git-credential-init --as user --app-id <id>` 取 repository_url + 凭证，`git remote set-url origin <repository_url>` 接回妙搭——**不要用 `+init` 接回**（会走脚手架且踩 Windows tar 坑）。
**网络抖动**：GitHub 偶发连接失败，脚本内置重试一次 + 失败不阻塞发布，下次部署自动补推。
**推送前检查**：项目仓库先确认无密钥/凭证文件被 git 跟踪（`git ls-files | grep -iE "\.env|secret|token"`，模板/无害配置除外）。

## 工具链自检（2026-09-21 用户定稿：用技能前先测工具，不临时排查）

**触发时机（不等人提醒）**：① 新项目开工第 0 步；② 每天首次使用本技能时；③ 遇到工具异常/疑似失效时；④ 用户问「XX 通了吗」时只查对应项。自检结果当轮简报一句（全部 ✅ 或列出 ❌ 项+降级方案），记入 FIXES/台账仅在有异常时。

**自检清单（按序，全部轻量只读操作）**：
1. **Mem0 REST**：python requests 读 `https://api.mem0.ai/v1/memories/?user_id=zhaoweiliang`，HTTP 200 即通（key 从 `~/.codem/mcp.json` 的 Authorization 头取；MCP 桥 pending 属已知常态，REST 通即可用，降级=REST 兜底）
2. **MCP 桥**：tool_search 查 mem0 工具；pending/failed 不阻塞，走 REST
3. **lark-cli**：`lark-cli whoami` 正常返回身份即可（不要跑 auth login 修权限，权限缺走授权短链流程）
4. **Git/GitHub**：`git -C ~/.codem/skills status` 干净且 remote 可达（gh auth status 已登录）
5. **部署链路**：项目 `04_pipeline/deploy/deploy.sh` 与 `sync_skill.sh` 存在且可执行
6. **技能版本一致性**：SKILL.md 头部 version 与 CHANGELOG 最新版本号一致（历史上出过版本声明失真误判新旧，2026-09-21 已修）

**失败处理**：单点失败不停工——先按该工具的降级路径继续（Mem0→REST、MCP→REST、GitHub 抖动→下次部署补推），同时记 ERRORS 台账（Pattern-Key: toolchain.<tool>.fail），下次自检优先复查历史失败项。

## 云端语义记忆（Mem0，2026-09-21 接入，所有项目工作空间共享）

与本地 `.codem/memory/` md 记忆**两层并存、不是替代**：md 管结构化规范（红线/口径/契约，自动注入最可靠），Mem0 管语义模糊检索（「之前怎么说的」跨项目/跨设备/跨 agent 查找）。

1. **连接**：CodeM MCP 已配于 `~/.codem/mcp.json`（server 名 `mem0`，全机所有项目共用，无需每项目再配）；不支持 MCP 的 agent 直接 REST：`Authorization: Token <key>` 调 `https://api.mem0.ai/v1/memories/`，key 从 `~/.codem/mcp.json` 的 Authorization 头里取（或由管理员私下提供），**禁止进技能包/分发物/日志**
2. **双层 user_id 隔离（方案 A）**：项目层 `zhaoweiliang/<工作空间名>`（如 `zhaoweiliang/示例食品厂运营报告`）、全局层 `zhaoweiliang`；检索时**先项目层后全局层合并**，写入时按内容归属选层——与项目隔离原则同构
3. **写入时机**：对话出现关键决策/偏好/坑的**当轮**就写（简洁一句事实 + 项目/日期语境，让语义检索可命中）；**检索时机**：新会话开场或「记不清之前怎么定的」时查
4. **复盘增值**：越积累越聪明——每个项目收尾把「本次学到的通用经验」写进全局层，下个项目开场检索即可复用，不重新踩坑
5. **完整操作手册**：飞书文档《Mem0 云端记忆系统全链路复盘》（内部操作手册链接，接入时向维护者索取）（连接方式大全/故障排查/验证命令集），接入新环境照抄不重造；已知坑：Windows 下 curl 有 GBK 乱码风险（用 python requests 替代）、MCP 桥接可能 pending 超时、异步写入约 15s 生效

## 升级评估触发机制（2026-09-21 用户定稿：条件满足自动启动，不等人提醒）

**每次使用本 skill 时自检以下阈值，满足任一条即自动启动对应升级工作（动手前向用户报备一句）：**

**触发 MCP 工具开发**（skill → MCP server，把资产检索封装为可调用 tools）：
1. report-kit 组件 ≥15 个，或选对组件需要读 >5 个文件（SKILL.md 超过 ~500 行）——人工翻文件效率开始劣化
2. 「按需求检索组件/规范」类诉求在台账（.learnings）重复出现 ≥3 次
3. 出现跨会话程序化调用需求（如其他工具/脚本要查组件清单）

**触发 Plugin 打包**（skill → CodeM plugin，一键安装分发）：
1. 需要 ≥2 台机器使用本 skill（单机全局目录不再够用）
2. 需要分享给其他用户/团队成员
3. skills 生态 CLI（如 vercel-labs/skills）将来原生支持 CodeM 后，可顺势打包上架

**触发后的执行规则**：
- 真源不变：资产仍从 cop-app → sync_skill.sh 流转，MCP/Plugin 只是分发的壳
- MCP 路线：先做最小原型（1 个 `search_component` tool）验证价值，再扩展
- Plugin 路线：参照 codem-larkcli-plugin 结构打包（一个 plugin 可含多个 skill）
- 每次升级后 git commit 留痕，并把触发原因记入 `.learnings` 台账
