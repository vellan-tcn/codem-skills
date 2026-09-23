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

## 已知项目特定参数（拷后必查）

| 位置 | 参数 | 说明 |
|---|---|---|
| raw-data/merged-daily.table.ts | pgSchema workspace 名 | ★★ 标注在代码行上方 |
