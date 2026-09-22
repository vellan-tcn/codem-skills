#!/usr/bin/env bash
# sync_skill.sh — 妙搭发布后把最新源码同步进 report-kit-builder skill（全局可用）
# 用法：bash sync_skill.sh   （建议每次 release finished 后执行）
set -e
# 项目根自动推导（脚本位于 <项目根>/04_pipeline/deploy/，换电脑/换目录自动适应）
R="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
K="$HOME/.codem/skills/report-kit-builder"

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

echo "SYNCED $(date '+%F %T')"
du -sh "$K"

# 3. git 自动留痕 + 推 GitHub（2026-09-21：技能 monorepo 化，git 根在 ~/.codem/skills）
S="$HOME/.codem/skills"
cd "$S"
if git status --porcelain | grep -q .; then
  git add -A
  git commit -qm "sync: from 05_app $(cd "$R/05_app" && git rev-parse --short HEAD) at $(date '+%F %T')"
  echo "GIT-COMMIT $(git rev-parse --short HEAD)"
else
  echo "GIT-NOCHANGE"
fi
# 4. 推 GitHub（远程仓库 vellan-tcn/codem-skills；网络抖动重试一次）
if git diff --quiet HEAD origin/main 2>/dev/null; then :; else
  if ! git push -q origin main 2>/dev/null; then
    sleep 5
    git push -q origin main && echo "GITHUB-PUSH ok(retry)" || echo "GITHUB-PUSH FAILED(网络，下次 sync 会补推)"
  else
    echo "GITHUB-PUSH ok"
  fi
fi
