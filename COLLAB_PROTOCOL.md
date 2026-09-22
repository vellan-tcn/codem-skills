# COLLAB_PROTOCOL.md — codem-skills 多机协作更新协议（2026-09-22 用户定稿）

> 适用：任何机器上的任何 agent 更新本仓库（含 report-kit-builder 等所有技能）。
> 核心原则：**main 只进合并的改动**。任何人（含维护机和创建者本人）一律走「分支 → PR → 评审 → 用户授权合并」。

## 一、改动流程（所有机器统一）

1. **同步**：`git -C ~/.codem/skills pull origin main`
2. **切分支**：`git checkout -b feature/<简短描述>`（修 bug 用 `fix/<描述>`；从 main 切出）
3. **改动 + 提交**：Conventional Commits 格式（`feat:`/`fix:`/`docs:` 前缀 + 一句话说明）
4. **推分支 + 建 PR**：
   ```bash
   git push -u origin feature/<描述>
   gh pr create --base main --head feature/<描述> --title "<type>: <说明>" --body-file <按 PR 模板填写>
   ```
   若机器未配 gh 凭证：先 `gh auth login`（vellan-tcn 账号）一次，永久有效。

## 二、PR 模板（.github/PULL_REQUEST_TEMPLATE.md，创建 PR 时必填）

改了什么 / 为什么改（触发来源：哪个项目的什么问题）/ 影响范围（哪些技能、哪些复刻规则）/ 如何验证（截图/diff 自检/清单核对结果）/ 风险与回滚方式。

## 三、AI 辅助判断（PR 评审协议，任意 agent 执行）

PR 建立后（或用户把 PR 链接发进任意对话后），对话中的 agent **必须**先做评审再谈合并：

1. `gh pr diff <PR编号>` 拉取改动
2. 按五维评审：
   - **真源性**：改动是否基于真源代码/实际复刻复盘（引用必查证，不许凭印象）
   - **一致性**：与 SKILL.md 现有红线冲突吗？版本号/changelog/FEATURE_MATRIX 同步更新了吗？
   - **回退风险**：删/改了已有规则吗？删的理由充分吗（只减不许不加：新规则允许加，删旧规则必须给证据）？
   - **完整性**：跨文件联动改齐了吗（SKILL.md/VERSION/矩阵/脚本）？
   - **可复用性**：是项目专属（不该进 skill）还是通用（该进）？
3. 输出结构化评审意见（建议合 / 建议不合 + 理由 / 需用户决策的点），可直接 `gh pr comment` 贴到 PR
4. **明确禁止**：评审未做就执行合并；agent 自行决定合并（无用户授权）

## 四、用户判断合并（分布式授权）

- **授权方式**：用户在**任意一台机器的任意 agent 对话**里说「合并 PR #N」（或语义等价的话），该对话的 agent 即执行：
  ```bash
  gh pr merge <PR编号> --squash --delete-branch
  ```
- 合并后本地切回 main 并 pull；若其他机器有本地残留分支，pull 时清理即可
- **squash 合并**：一个 PR 压成 main 上一个 commit，历史干净、回滚粒度=整个 PR

## 五、main 分支保护（GitHub 侧，已配置）

- 禁止直接 push、禁止强推、禁止删除 main
- 必须走 PR 且至少 1 个 approving review（AI 评审即 approve：`gh pr review --approve`）
- **enforce_admins：true**——维护机管理员身份也不例外（全员走 PR，用户 2026-09-22 拍板）

## 六、版本纪律（不变）

合并后各机器开工前仍执行 SKILL.md 的「版本硬校验」：`git pull` + 核对 `report-kit-builder/VERSION`，旧版 agent 不许动手复刻。
