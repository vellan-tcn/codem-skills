# server-modules：妙搭后端数据库操作通用源码（v1.4.29 起）

> 通用后端层：历史数据查询（按日期段/时间段/粒度）、月度报表聚合、COP 总览、数据核对、传感器查询的**数据库操作源码**，从麻辣王子 05_app 真源脱敏而来。新项目**禁止重新造轮子**，物理拷贝本目录再局部替换。

## 结构（20 文件）

```
server-modules/
├── app.module.ts            # 模块注册总装（拷后按需增删 imports）
├── main.ts                  # 启动入口
├── common/                  # 响应码/异常过滤器/接口约定
├── database/schema.ts       # drizzle 全局 schema 汇总
└── modules/
    ├── raw-data/            # ★核心：示数/原始数据查询（merged-daily 表定义 + 按时间范围查询）
    ├── cop-overview/        # COP 总览聚合
    ├── data-check/          # 数据质量核对
    └── sensor-data/         # 传感器数据查询（按需）
```

## 接入步骤（详见 docs/BACKEND-PORTING.md）

1. 整目录拷 `modules/*` + `common/` + `database/` + `app.module.ts` 到新项目 `server/`
2. **改 pgSchema（全库唯一硬编码）**：`modules/raw-data/merged-daily.table.ts` 的 `pgSchema('workspace_XXXXXXXXXXXX')` → 新应用 schema 名，获取：`lark-cli apps +db-list`。改完 grep `workspace_` 确认无残留
3. 注册 app.module → 建表 → 部署 → 验证

## 妙搭数据量级约束（通用，不分现场）

操作数据库的代码各现场一致，数据量级约束也一样，接入时直接复用既有分块方案、不要重写：

| 场景 | 约束 | 既有方案（源码位置） |
|---|---|---|
| 单次查询上限 | 妙换单次 db 查询有行数上限，全量直接 select 会被截断 | 分块游标拉取：`RAW_BATCH = 5000` 行/批，最多 `RAW_MAX_BATCHES = 400` 批（=200 万行，覆盖全年 30 秒级数据），超出置 truncated 标记（`raw-data.service.ts`） |
| 聚合桶上限 | 单次聚合桶数受限 | `MAX_BUCKETS = 120000`，超限自动升粒度（`raw-data.service.ts`） |
| 数据核对拉取 | 大范围逐分钟数据 | `MINUTE_LIMIT = 5000` 分钟 / `READING_LIMIT = 200000` 行，分批 fetch（`data-check.service.ts`） |
| 大批量上传 | `+db-data-import` 有行数/体积上限，超大文件被拒 | 分批 SQL + 断点续传（`assets/04_pipeline/sync/bulk_upload_template.sh`，done_list 跳过已完成片，失败修复后重跑自动续传） |

## 已知项目特定参数（拷后必查）

| 位置 | 参数 | 说明 |
|---|---|---|
| raw-data/merged-daily.table.ts | pgSchema workspace 名 | ★★ 标注在代码行上方 |
