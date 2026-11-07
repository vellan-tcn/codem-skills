# AGENTS.md — 本仓库使用须知（所有 agent / CodeM 会话必读）

本仓库是 report-kit-builder 技能库（monorepo）。**任何 agent 在本仓库执行分支 / commit / push / PR / 合并操作之前，必须先完整读一遍根目录 `COLLAB_PROTOCOL.md` 并逐条自查打勾**，重点：

1. 更新资格三条（完整 clone / 已 pull origin main / VERSION 硬校验）
2. 改动流程四前置（小 PR 原则、自查 diff、UI 改动附截图、大改 Draft 预对齐）
3. PR 处置三分法（确定不合不开 PR 不给用户合并选项）
4. 回灌时机/攒批规则（进行中项目零回灌 PR，闭环判定权 100% 归用户）
5. 分级评审与合并判据（评审报告先交付用户，用户确认后才合并）
6. **禁止直接 push main**（分支保护已启用，一律分支 + PR）
7. 禁止直接改 `report-kit-builder/assets/` 内文件（资产由真源经 sync_skill.sh 单向流出）

理由：协议文件本身不会自动注入 agent 会话（PR#1 教训：规则没进上下文=不存在），本文件作为仓库根的入口提示，确保任何在此仓库工作的 agent 先读协议再动手。
