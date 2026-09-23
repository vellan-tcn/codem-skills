# 数据链路操作手册（DATA-PIPELINE）

> 原始数据绝对正确是红线：所有计算基于数据库原始值（WinCC + 有人云互补差值），缺天跨度合并不算 0，坏值先剔除再差值，月度与客户 Excel 月报互证（偏差 >5% 须查明原因）。
> 脚本已收编至项目根目录 `04_pipeline/`，各目录含 README。

## 全流程总览

```
① 采集导出
   WinCC（SQL Server 归档，OLE-DB TAG:R 导出 CSV）
   有人云（rar/能耗 xlsx 导出）
        ↓
② 解码入库（wincc/）
   WinCC TagCompressed 二进制启发式解码（tahaelba/WinCCToSQL 改造版）
        ↓
③ 多源合并（merge/）
   按「月内 COP 最高」选主源，月内降级补全；坏值剔除；跨度合并
   → merged_daily（date/date_end/cool_start/elec_start/cool_end/elec_end/
      cool_usage/elec_usage/cop/days/src）
        ↓
④ 推数上云（sync/）
   生成替换 SQL（如 mfg_replace_gen.py）→ lark-cli apps +db-execute 执行（--environment online）
        ↓
⑤ 校验（audit/）
   audit_daily.py 逐日校验 + 月度互证（月首末差 = 逐周期加总）
        ↓
⑥ 看板呈现（05_app/，见 ARCHITECTURE.md）
```

## 各阶段说明

### ① 采集导出
- WinCC 变量分项计量映射（v919 总电量 / v893 冷量 / v921~933 主机泵等）见 `wincc/` README。
- 导出文件：`C:/SQLData/export/v*.csv`（UTF-16LE 编码，导入前转 UTF-8）。
- 有人云：`配料历史数据库/` 下 rar 与能耗 xlsx（两个 sheet：总累计用电量/冷冻累计冷量，30 秒级）。

### ② 解码
- WinCC 归档压缩数据无开源解码器，走两条路：OLE-DB Provider（WinCCOLEDBProvider.1，需 AMT 表注册）或启发式解码器。
- 注意：SQL Server DROP DATABASE 会删除被附加的 MDF/LDF 源文件，操作前先拷贝副本。

### ③ 合并（算法按项目调整的核心点）
- 选源准则：按月优先选「月内 COP 计算最高」的数据源为主源，主源缺失/坏值的天按该月 COP 排名降级补全。
- 必须保证客户按全月数据能验算一致（示数链全程连续单调、逐周期加总 = 月汇总）。
- 换项目时：改合并算法/选源准则只动 `merge/`，输出表结构（merged_daily 字段族）保持不变，后端与前端零改动。

### ④ 推数
- 本仓实际脚本：`sync/mfg_replace_gen.py`（生成 merged_daily 替换 SQL：删旧行+插新行）+ `sync/fix_mfg_ts.py`（时间戳修正）。生成的 SQL 用 `lark-cli apps +db-execute` 推到妙搭库——推数用 `--environment online`，查询线上数据也须显式 `--environment online`（默认走 dev）。两个脚本均为麻辣王子一次性实现，**新项目参照其模式重写，不要直接跑**。
- `db-execute --file` 仅允许当前工作目录/temp/home files 目录下的 SQL 文件；SELECT 查询用 inline SQL 方式执行。

#### ④-b 大批量上传（万行级，实战验证的方法）
**通道选择**：
- 小批量（千行级）：`+db-data-import --file x.csv --table t --environment online --yes`（高危命令，先 `--dry-run` 或 dev 验；超大文件会被行数/体积上限拒）
- 大批量（万~十万行）：**`+db-execute --file` 分片 SQL 循环上传**——麻辣项目实测单批 5 万行无压力，db-execute 分批远快于 data-import

**标准做法（见 `sync/bulk_upload_template.sh`，源自麻辣 mfg_raw_upload.sh 实战）**：
1. 数据生成纯 INSERT 分片 SQL 文件（`c0001.sql, c0002.sql, ...`），放**项目工作目录内**（scratchpad 路径会被 --file 拒绝）
2. 脚本循环执行 `lark-cli apps +db-execute --app-id <id> --environment online --yes --as user --file <片>`，**断点续传**（.done_list 记已完成片，中断重跑自动跳过）、**每片失败重试 1 次**、失败记 .fail_list
3. 收尾 cat .fail_list，修复失败片后重跑即续传
4. 全量替换场景（重建日表）用 DELETE 范围条件 + INSERT 放同一批 SQL；修改既有数据常规场景应 UPDATE，DELETE+INSERT 需用户确认
5. bash 脚本内调 lark-cli 须先 export `LARKSUITE_CLI_*` UAT 环境变量（经 codem `__hook tool-uat-env --print-uat` 取），否则凭证读不到

**建表前置（妙搭 PostgreSQL 平台规范）**：业务表必须带 4 个审计列（`_created_at`/`_updated_at`/`_created_by`/`_updated_by`，可 DEFAULT CURRENT_TIMESTAMP）+ 启用 RLS + policy；人员字段用 `user_profile` 复合类型；`CREATE/DROP DATABASE·SCHEMA`、平台保留表会被硬拒。上传完成后 `SELECT count(*)` inline 核对总行数 = 本地行数。

### ⑤ 校验（上数据前必跑）
- 逐日：起止示数差 = 当日用量；缺天不显示 0。
- 月度：月首末差与逐周期加总互证；与客户 Excel 月报互证（偏差 >5% 查明原因再上数据）。

### ⑥ 部署链（05_app）
```
git push origin sprint/default
  → lark-cli apps +release-create --branch sprint/default
  → +release-get 轮询至 finished
  → 线上地址：https://tl-group.feishuapp.com/app/app_17ebtg2mam8
```
- git push 需导出 LARKSUITE_CLI_* UAT 环境变量，否则 credential helper 报 "not configured"。
- 发布后必须 Playwright 复截防回退（排除 CDN 缓存：URL 加 ?v=N 或等 2 分钟）。
- 本地直改部署脚本：`05_app/scripts/`（commit → push → release → 轮询）。

## 新项目接入数据侧

1. 按 ①② 采集导出新项目原始数据（表计/变量映射按项目重做）
2. `merge/` 里改算法参数（选源准则、坏值阈值、工况规则），表结构不变
3. `sync/` 推到新妙搭应用数据库，`gen:db-schema` 重新生成 schema
4. 后端 service 只改算法，前端零改动
