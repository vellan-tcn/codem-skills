# 04_pipeline 数据链路（已收编）

> 来源：2026-09-20 从会话 scratchpad 收编的「活」脚本（死脚本/调试脚本未收）。原始数据绝对正确是红线，操作前先读 `05_app/docs/DATA-PIPELINE.md` 全流程手册。

## 目录

| 目录 | 内容 |
|---|---|
| `wincc/` | WinCC 归档导出与解码：attach*.ps1（附加 MDF）、export*.ps1（OLE-DB TAG:R 导出）、createamt.ps1（AMT 注册表）、WinCCToSQL/（TagCompressed 启发式解码器，GitHub tahaelba/WinCCToSQL） |
| `merge/` | 多源合并与 COP 计算：mergecloud.py（配料云平台合并）、mfg_merger.py（**制造三源自动整合**：WinCC累计量CSV+能效报表CSV+有人云zip/xlsx → 坏值/停滞断链剔除 → monthly_rank 选源 → Excel 权威值兜底 → 增量 SQL + 互证审计，`--since` 增量 / `--audit-only`）、mfg_raw_extract.py（制造原始提取）、mfg_upload_prep.py（旧版一次性上传准备，已被 mfg_merger.py 取代）、cop_best_month.py（月度 COP 选源 monthly_rank）、cop_by_source.py / copcalc.py / agg.py（计算与汇总） |
| `sync/` | 推数修正：fix_mfg_ts.py（raw_reading 时间戳修正）、mfg_replace_gen.py（替换 SQL 生成）。推数上云经 lark-cli apps +db-execute（注意 --environment online） |
| `audit/` | audit_daily.py 逐日校验（起止示数差=当日用量、月度互证） |
| `deploy/` | deploy.sh / release_only.sh（05_app 发布链：commit→push→release-create→轮询；内含会话级路径，复用时按需改） |

## 红线（不可违反）

1. 数据库原始值为准（WinCC + 有人云互补差值）；缺天跨度合并不算 0；坏值先剔除再差值。
2. 选源准则：按月优先「月内 COP 计算最高」数据源，主源缺失/坏值按月内排名降级补全；必须保证客户按全月数据能验算一致。
3. 月度差值与客户 Excel 月报互证，偏差 >5% 查明原因再上数据。
4. 注意：SQL Server DROP DATABASE 会删除被附加的 MDF/LDF 源文件，操作前拷贝副本。
5. 妙搭 db-execute：推数与查线上均须 `--environment online`（默认 dev）；--file 仅允许工作目录/temp/home files 路径。

## 新项目复用

算法因项目而异：改 merge/ 内的选源准则、坏值阈值、工况规则即可，输出表结构（merged_daily 字段族）保持不变，后端与前端零改动。

> **进 skill 的边界**（sync_skill.sh 同步范围）：merge/sync/audit/deploy 的通用脚本 + wincc 解码器会同步进 skill；**项目专属脚本不进 skill**——`mfg_*.py`（制造三源整合，含本项目数据假设）、`deploy/release_only.sh`（含本机会话路径）、运行日志/数据产物（deploy_log.txt、deploy_result.txt、pbix 等）。新项目如需制造三源整合能力，向维护者索取 mfg_* 脚本后按本项目数据源改选源参数。
