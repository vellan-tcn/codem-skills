#!/usr/bin/env bash
# sync_skill.sh — 妙搭发布后把最新源码同步进 report-kit-builder skill（全局可用）
# 用法：bash sync_skill.sh   （建议每次 release finished 后执行）
set -e
# 项目根自动推导（脚本位于 <项目根>/04_pipeline/deploy/，换电脑/换目录自动适应）
R="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
K="$HOME/.codem/skills/report-kit-builder"

# 0. 新鲜度硬校验（2026-09-23 用户定稿：防旧版脚本/过期真源产生脏 PR，PR#3 事故根因防线）
#    三条全过才允许 sync：05_app 干净、本地==GitHub 镜像 tip、skill 仓库基于最新 main
( cd "$R/05_app" || exit 1
  if [ -n "$(git status --porcelain)" ]; then
    echo "FRESH-GATE FAILED: 05_app 存在未提交改动，先 commit + push github 再 sync"; exit 1; fi
  LOCAL_TIP="$(git rev-parse HEAD)"
  REMOTE_TIP="$(git ls-remote github refs/heads/sprint/default 2>/dev/null | awk '{print $1}')"
  if [ -z "$REMOTE_TIP" ]; then
    echo "FRESH-GATE FAILED: 无法读取 GitHub 镜像（remote 'github' 缺失或网络不通），先修复再 sync"; exit 1; fi
  if [ "$LOCAL_TIP" != "$REMOTE_TIP" ]; then
    echo "FRESH-GATE FAILED: 05_app 本地($LOCAL_TIP) != 镜像($REMOTE_TIP)，先 git push github 再 sync"; exit 1; fi )
S="$HOME/.codem/skills"
( cd "$S" || exit 1
  git fetch -q origin 2>/dev/null || { echo "FRESH-GATE FAILED: skill 仓库 git fetch origin 失败（网络）"; exit 1; }
  git checkout -q main 2>/dev/null || { echo "FRESH-GATE FAILED: skill 仓库无法切到 main"; exit 1; }
  git pull -q origin main 2>/dev/null || { echo "FRESH-GATE FAILED: skill 仓库 pull origin main 失败（本地 main 与远端冲突，先处理）"; exit 1; }
  # 防旧版脚本直推 main：确认分支保护后此处只可能产出分支+PR（见文末协议段）
  echo "FRESH-GATE PASS: 05_app=$( cd "$R/05_app" && git rev-parse --short HEAD ) skill-main=$(git rev-parse --short HEAD)" )

# 1. 前端核心（theme + report-kit + docs）：直接覆盖
rm -rf "$K/assets/theme" "$K/assets/report-kit" "$K/assets/docs"
cp -r "$R/05_app/client/src/theme" "$K/assets/theme"
cp -r "$R/05_app/client/src/components/report-kit" "$K/assets/report-kit"
cp -r "$R/05_app/docs" "$K/assets/docs"
# 2b. 组件外部类型随包（B1 修复）：shared/api.interface.ts
mkdir -p "$K/assets/shared"
cp "$R/05_app/shared/api.interface.ts" "$K/assets/shared/"
# 2c. 页面组装层全量同步（2026-09-22 用户定稿：作为其它项目复刻基准，先一模一样再差异化）
rm -rf "$K/assets/pages-Report"
cp -r "$R/05_app/client/src/pages" "$K/assets/pages-Report"
# 2d. 入口层同步（2026-09-22 补盲区：路由入口 + Layout 深色导航，整屏高度公式依赖它）
mkdir -p "$K/assets/app-shell"
cp "$R/05_app/client/src/app.tsx" "$K/assets/app-shell/app.tsx"
cp "$R/05_app/client/src/components/Layout.tsx" "$K/assets/app-shell/Layout.tsx"
# 2f. 全局样式同步（2026-09-22 补盲区：index.css 含妙搭水印隐藏规则，漏同步导致其它项目右下角出现「妙搭生成」标签）
cp "$R/05_app/client/src/index.css" "$K/assets/app-shell/index.css"
# 2g. 入口层补全（2026-09-22 资产穷举审计 A 类 5 文件：主入口/title守卫/根 html/字体排印/tw 主题/tw 配置）
cp "$R/05_app/client/src/index.tsx" "$K/assets/app-shell/index.tsx"
cp "$R/05_app/client/index.html" "$K/assets/app-shell/index.html"
cp "$R/05_app/client/src/typography.css" "$K/assets/app-shell/typography.css"
cp "$R/05_app/client/src/tailwind-theme.css" "$K/assets/app-shell/tailwind-theme.css"
cp "$R/05_app/tailwind.config.ts" "$K/assets/app-shell/tailwind.config.ts"
# 2h. hooks 同步（2026-09-22 移动端审计补盲区：pages 模块 import hooks，漏同步=复刻断链）
rm -rf "$K/assets/hooks"
cp -r "$R/05_app/client/src/hooks" "$K/assets/hooks"
# 2j. 后端 server 通用层同步（2026-09-23 用户定稿：数据库操作源码进 skill，禁止重复造轮子）
# 只同步通用四模块+common+database+入口，排除脚手架示例 hello/view；README 是 skill 专属说明不覆盖
rm -rf "$K/assets/server-modules/modules" "$K/assets/server-modules/common" "$K/assets/server-modules/database"
mkdir -p "$K/assets/server-modules/modules"
cp -r "$R/05_app/server/modules/raw-data" "$R/05_app/server/modules/cop-overview" \
      "$R/05_app/server/modules/data-check" "$R/05_app/server/modules/sensor-data" \
      "$K/assets/server-modules/modules/"
cp -r "$R/05_app/server/common" "$K/assets/server-modules/common"
cp -r "$R/05_app/server/database" "$K/assets/server-modules/database"
cp "$R/05_app/server/app.module.ts" "$R/05_app/server/main.ts" "$K/assets/server-modules/"
# 2k. 前端 API 客户端层 + shadcn UI 标准件同步（2026-09-23 举一反三排查补断链：15 个 pages/hooks 文件 import @client/src/api、10 类 ui 组件被引用，缺二者复刻即断链）
rm -rf "$K/assets/api" "$K/assets/ui"
cp -r "$R/05_app/client/src/api" "$K/assets/api"
cp -r "$R/05_app/client/src/components/ui" "$K/assets/ui"
# 2e. 双真源清理 + VERSION 写入（2026-09-22 三专家评审修复）
# data-pipeline 是 1.4.0 时代旧残留，与 04_pipeline 双真源，一律删除防误读
rm -rf "$K/assets/data-pipeline"
VER="$(grep -m1 '^version:' "$K/SKILL.md" | awk '{print $2}')"
printf '%s\nsynced %s from 05_app %s\n' "$VER" "$(date '+%F %T')" "$(cd "$R/05_app" && git rev-parse --short HEAD)" > "$K/VERSION"

# 2. 04_pipeline：纯脚本版（剔除 .git/LFS/pbix/项目特定数据/运行日志/缓存）
rm -rf "$K/assets/04_pipeline"
mkdir -p "$K/assets/04_pipeline/wincc/WinCCToSQL/scripts"
cp "$R/04_pipeline/README.md" "$K/assets/04_pipeline/"
cp "$R/04_pipeline"/wincc/*.ps1 "$K/assets/04_pipeline/wincc/" 2>/dev/null || true
for f in README.md requirements.txt; do
  cp "$R/04_pipeline/wincc/WinCCToSQL/$f" "$K/assets/04_pipeline/wincc/WinCCToSQL/" 2>/dev/null || true
done
cp "$R/04_pipeline/wincc/WinCCToSQL/scripts/"*.py "$K/assets/04_pipeline/wincc/WinCCToSQL/scripts/" 2>/dev/null || true
mkdir -p "$K/assets/04_pipeline/merge" "$K/assets/04_pipeline/sync" "$K/assets/04_pipeline/audit" "$K/assets/04_pipeline/deploy"
cp "$R/04_pipeline/merge/"*.py "$R/04_pipeline/merge/"*.sql "$K/assets/04_pipeline/merge/" 2>/dev/null || true
cp "$R/04_pipeline/sync/"*.py "$R/04_pipeline/sync/"*.sh "$K/assets/04_pipeline/sync/" 2>/dev/null || true
cp "$R/04_pipeline/audit/"*.py "$K/assets/04_pipeline/audit/" 2>/dev/null || true
cp "$R/04_pipeline/deploy/"*.sh "$K/assets/04_pipeline/deploy/" 2>/dev/null || true
# 排除项目专属/含本机会话路径的脚本，不进 skill（换机不可用，留在项目仓库）
rm -f "$K/assets/04_pipeline/merge/"mfg_*.py "$K/assets/04_pipeline/sync/"mfg_*.py "$K/assets/04_pipeline/deploy/release_only.sh"

# 2i. 脱敏（2026-09-22 仓库转 public 红线：客户信息以示例值替换，禁止进入公开仓库）
python -X utf8 - "$K" <<'PYEOF'
import os, io, sys
K = sys.argv[1]
repl = [
    ('示例食品厂', '示例食品厂'),
    ('<项目源码镜像仓库>', '<项目源码镜像仓库>'),
    ('（内部操作手册链接，接入时向维护者索取）', '（内部操作手册链接，接入时向维护者索取）'),
    ('https://<your-domain>.feishuapp.com/app/<app_id>', 'https://<your-domain>.feishuapp.com/app/<app_id>'),
    ('<your-domain>.feishuapp.com', '<your-domain>.feishuapp.com'),
    ('<内部文档链接>/docx/', '<内部文档链接>/docx/'),
    ("workshop === 'mfg' ? 5.2 : 5.0", "workshop === 'mfg' ? 5.2 : 5.0"),
    ('5.2 : 5.0', '5.2 : 5.0'),
    ('配料 5.0 / 制造 5.2', '配料 5.0 / 制造 5.2'),
('pgSchema(\'workspace_XXXXXXXXXXXX\')', "pgSchema('workspace_XXXXXXXXXXXX') /* ★★项目特定参数：新项目必改为自己的 schema 名，lark-cli apps +db-list 查，改完 grep workspace_ 确认无残留 */"),
    ('workspace_XXXXXXXXXXXX', 'workspace_XXXXXXXXXXXX'),
# 2026-09-23 补漏：裸词/凭证词（本脚本拷贝件自身含门禁模式串，漏项导致 SANITIZE-GATE FAILED）
    ('<项目标识>', '<项目标识>'),
    ('<内部域名>', '<内部域名>'),
    ('<内部账号>', '<内部账号>'),
    ('<内部凭证>', '<内部凭证>'),
    ('<token前缀>', '<token前缀>'),
]
for root, dirs, files in os.walk(K):
    if '.git' in root: continue
    for fn in files:
        p = os.path.join(root, fn)
        try:
            with io.open(p, encoding='utf-8') as f: s = f.read()
        except Exception: continue
        t = s
        for a, b in repl: t = t.replace(a, b)
        if t != s:
            with io.open(p, 'w', encoding='utf-8', newline='\n') as f: f.write(t)
            print('SANITIZED', p)
PYEOF
# 脱敏门禁：仍命中敏感词则中止（防映射表漏项把客户信息带进公开仓库）
if grep -rniE "示例食品厂|<项目标识>|<内部域名>|<内部账号>|<内部凭证>|<token前缀>|workspace_XXXXXXXXXXXX" "$K" -q --include="*" 2>/dev/null; then
  echo "SANITIZE-GATE FAILED：skill 仓库仍含敏感词（客户名/内部域名/凭证），禁止提交，请先补替换映射"
  exit 1
fi

echo "SYNCED $(date '+%F %T')"
du -sh "$K"

# 3. git 自动留痕 + 提 PR 走协作协议（2026-09-22 用户定稿：全员走 PR，禁止直推 main；
#    协议见仓库根 COLLAB_PROTOCOL.md：AI 五维评审 → 用户在任意 agent 对话授权合并）
S="$HOME/.codem/skills"
cd "$S"
if git status --porcelain | grep -q .; then
  BR="feature/sync-$(date '+%Y%m%d-%H%M%S')"
  git checkout -qb "$BR"
  git add -A
  git commit -qm "sync: from 05_app $(cd "$R/05_app" && git rev-parse --short HEAD) at $(date '+%F %T')"
  echo "GIT-COMMIT $(git rev-parse --short HEAD)@$BR"
  # 4. 推分支 + 建 PR（网络抖动重试一次；合并由用户授权 agent 执行 gh pr merge --squash --delete-branch）
  if ! git push -q -u origin "$BR" 2>/dev/null; then
    sleep 5
    git push -q -u origin "$BR" || { echo "GITHUB-PUSH FAILED(网络，分支 $BR 留在本地，下次重推)"; exit 0; }
  fi
  PRURL="$(gh pr create --base main --head "$BR" \
    --title "sync: from 05_app $(cd "$R/05_app" && git rev-parse --short HEAD)" \
    --body "自动同步：05_app 真源 → skill 资产（sync_skill.sh 生成）。改动范围=本 PR 文件清单；验证=sync 输出 SYNCED + VERSION 已更新；回滚=revert 本 PR。agent 评审请按 COLLAB_PROTOCOL.md 第三节执行。" 2>/dev/null || true)"
  if [ -n "$PRURL" ]; then
    echo "PR-CREATED $PRURL"
  else
    echo "PR-CREATE FAILED(分支 $BR 已推远端，请手动 gh pr create)"
  fi
else
  echo "GIT-NOCHANGE"
fi
