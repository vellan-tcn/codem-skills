# 复用接入指南（REUSE-GUIDE）

> 目标：新项目复用整套框架时，UI 展示风格、框架结构、图形元素与麻辣王子项目**完全一致**，计算算法按项目自行调整。

## 一、必拷贝清单（复用核心，顺序即操作顺序）

| # | 内容 | 位置 | 换项目是否要改 |
|---|---|---|---|
| 1 | 设计令牌 | `client/src/theme/tokens.css` | **改颜色值**（唯一换肤入口） |
| 2 | 图表统一配置 | `client/src/theme/charts.ts` | 一般不改；既有色常量勿动 |
| 3 | 报表组件套件 | `client/src/components/report-kit/` | 不改 |
| 4 | 通用 UI 库 | `client/src/components/ui/` | 不改 |
| 5 | 通用 hooks | `client/src/hooks/`（use-mobile 等） | 不改 |
| 6 | CSS 入口 | `client/src/index.css` 需含 `@import "./theme/tokens.css";` | 确认存在 |
| 7 | 根组件/路由 | `client/src/app.tsx` + `components/Layout.tsx` | **改导航菜单与页面名** |
| 8 | 前端 API 层 | `client/src/api/` | **按新后端接口改** |
| 9 | 后端模块骨架 | `server/modules/`（controller/service/module 结构） | **改算法与表名** |
| 10 | 契约层 | `shared/api.interface.ts` | **按新接口定义改** |
| 11 | 表定义 | `server/database/schema.ts` | `npm run gen:db-schema` 重新生成 |

## 二、必改项（项目特定内容清单）

1. **tokens.css 颜色值**：全套视觉随这一个文件变。
2. **Layout.tsx 导航**：菜单项（to/label）。
3. **车间/项目名文案**：搜索「麻辣王子/配料车间/制造车间」出现的文件，逐处替换。
4. **后端算法**：COP 等计算在 `server/modules/*/service.ts`，按项目算法重写；查询/分页骨架保留。
5. **表名与变量映射**：`server/common/constants/` 与 `server/database/schema.ts`。
6. **工况标注规则**：report-kit/MonthlyTable 的 `getDailyStatus`（停机/试机/冷机未开阈值），按项目工况改。
7. **数据导入**：用 `04_pipeline/`（见 DATA-PIPELINE.md）把本项目原始数据合并成 merged_daily 同构表。

## 三、禁止事项（保证风格一致的红线）

- ❌ 组件/页面里写裸 hex 颜色（必须用 `rk-*` 语义令牌）
- ❌ 图表绕过 theme/charts.ts 自建样式
- ❌ 图表数据点下方丢「日期+时间」浅色小字（保留清单第 1 条）
- ❌ 月度报表丢：汇总行吸底、默认显示、一页显示当月全部天数、跨度行「起~止（N天）」格式
- ❌ 移动端丢 8 条适配细节（详见 `.codem/memory/妙搭界面细节保留清单.md`：卡片列表数字不折行、月份按钮 4 个一行、悬浮按钮贴边、底部 padding≥96px、示数时间戳自定义 tooltip 等）
- ❌ 把业务计算写进前端组件

## 四、验证清单（新项目上线前）

1. `npx tsc --noEmit --incremental --project tsconfig.app.json` 通过
2. `node ./scripts/lint.js` 通过
3. 发布后 Playwright 双视口（390×844 移动 + 1280 桌面）截图，逐项核对上面红线清单
4. 数据抽查：月汇总 = 各周期加总（原始数据红线，见 DATA-PIPELINE.md）

## 五、部署链

```
git add/commit → git push origin sprint/default
→ lark-cli apps +release-create --app-id <新app_id> --branch sprint/default
→ lark-cli apps +release-get 轮询至 finished
```
注意：git push 前需导出 LARKSUITE_CLI_* UAT 环境变量（凭证），否则报 "not configured"。完整脚本参考 `05_app/scripts/`（deploy 链）。
