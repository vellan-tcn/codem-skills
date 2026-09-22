# 后端模块跨应用移植手册（BACKEND-PORTING）

> 场景：新妙搭应用（如 yixing-app）从模板脚手架创建（server 只有 hello/view 示例模块），页面从前端拷贝而来，调用 `/api/raw-data`、`/api/cop-overview` 等接口——**后端模块不拷入适配，页面就读不到数据**。

## 示例食品厂服务端模块清单（真源：`05_app/server/modules/`）

| 模块 | 路由前缀 | 作用 | 页面对应 |
|---|---|---|---|
| `raw-data` | `api/raw-data` | 示数/原始数据查询（含 merged-daily 表定义） | 报表查询/月度报表页 |
| `cop-overview` | `api/cop-overview` | COP 总览 KPI | 首页总览 |
| `sensor-data` | — | 传感器数据查询 | 图表页（按需） |
| `data-check` | — | 数据校验 | 数据核查页（按需） |

## 移植步骤（以 raw-data + cop-overview 为例）

1. **拷目录**：把 `server/modules/raw-data`、`server/modules/cop-overview`（按页面依赖决定是否连带 `sensor-data`/`data-check`）整目录拷到新项目 `server/modules/` 下。
2. **注册模块**：新项目 `server/app.module.ts` 里 import 各 Module 类并加入 `imports: [...]`（麻辣的写法见 `app.module.ts:7-19`）。
3. **改 workspace schema（关键坑）**：全库唯一硬编码在 `raw-data/merged-daily.table.ts` —— `pgSchema('workspace_aadkvj7vniyyw')`。改成新应用的 schema 名，获取方式：`lark-cli apps +db-list`（或线上建表后从表名前缀读）。改完 grep `workspace_` 确认无残留。
4. **建表前置（平台规范）**：新应用库里按规范建表（4 个审计列 `_created_at`/`_updated_at`/`_created_by`/`_updated_by` + RLS + policy，人员字段 `user_profile` 类型）——表结构对照麻辣库同名表；大批量灌数用 `bulk_upload_template.sh`（见 DATA-PIPELINE.md ④-b）。
5. **类型/schema 再生成**：跑 `gen:db-schema` 重新生成数据库 schema，`type:check` 过一遍（增量缓存 ~20s）。
6. **部署**：走 deploy.sh 一键部署（commit → push → release → 轮询），见 DATA-PIPELINE.md ⑥。
7. **验证**：线上地址打开页面确认能读到数据；接口级用 `+db-execute --environment online` inline `SELECT count(*)` 核对表行数 = 本地行数。

## 注意

- 服务端模块是**通用层**：改了组件/接口约定要回灌麻辣真源 + sync_skill.sh；只改新项目业务逻辑（表字段/算法）留在项目仓库。
- 前端页面调用的接口路径必须与 `@Controller('api/xxx')` 一致，拷页面时不要改前端请求路径。
