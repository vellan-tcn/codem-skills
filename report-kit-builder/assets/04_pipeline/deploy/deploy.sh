#!/bin/bash
# deploy.sh（持久版）— 一键部署：commit → push → release → 自动同步 report-kit-builder skill
# 用法: bash deploy.sh "<commit说明>" <文件1> <文件2> ...
# 位置：运营报告/04_pipeline/deploy/（跨会话可用，不依赖 scratchpad）
# release finished 后自动调用同目录 sync_skill.sh（2026-09-21 红线，防忘记同步）
set -e
MSG="$1"; shift
FILES="$@"
# ============ 项目配置（新项目拷走本脚本后只改 APP ID）============
# 路径自动推导：脚本位于 <项目根>/04_pipeline/deploy/，不依赖本机绝对路径（换电脑/换目录自动适应）
DP="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"          # 本脚本所在目录（日志输出处）
ROOT="$(cd "$DP/../.." && pwd)"                              # 项目根（运营报告/）
APP_DIR="$ROOT/05_app"                                       # ② 项目代码仓目录
APP=app_17ebtg2mam8                # ① 妙搭应用 ID（新项目必改）
# ====================================================================
OUT="$DP/deploy_result.txt"
LOG="$DP/deploy_log.txt"
# CODEM CLI：动态探测最新版本（避免升级后路径失效）
CODEM=$(ls -d "$HOME"/.codem/runtime/versions/*/node_modules/@lark-codem/codem-cli-win32-x64/bin/codem.exe 2>/dev/null | sort -V | tail -1)
[ -z "$CODEM" ] && { echo 'ERROR: 未找到 codem CLI（$HOME/.codem/runtime/versions/*/...），请确认 CodeM 已安装'; exit 1; }
CFG=$(cygpath -w "$HOME/.codem/config.json" 2>/dev/null || echo 'C:\Users\vella\.codem\config.json')
command -v node >/dev/null || { echo 'ERROR: node 不在 PATH'; exit 1; }
export LARKSUITE_CLI_APP_ID='cli_aac5d4db58385cd3'
export LARKSUITE_CLI_BRAND='feishu'
export LARKSUITE_CLI_DEFAULT_AS='user'
export LARKSUITE_CLI_STRICT_MODE='user'
export LARKSUITE_CLI_USER_ACCESS_TOKEN="$("$CODEM" __hook tool-uat-env --print-uat --config-path "$CFG")"
mi() { "$CODEM" __hook tool-uat-env --run-managed-lark-cli --config-path "$CFG" -- "$@"; }
: > "$LOG"
cd "$APP_DIR"

T0=$(date +%s)
finish() { echo "$1" | tee "$OUT"; exit 0; }

# 1) commit（pre-commit 选择性门禁）
if ! git add $FILES 2>>"$LOG"; then finish "FAIL: git add 失败"; fi
if ! git commit -m "$MSG" >>"$LOG" 2>&1; then finish "FAIL: commit 失败（门禁未过），见 $LOG"; fi
CID=$(git rev-parse --short HEAD)

# 2) push（妙搭远端 + GitHub 镜像）
if ! git push origin sprint/default >>"$LOG" 2>&1; then finish "FAIL: push 失败，见 $LOG"; fi
# 2b) GitHub 镜像（vellan-tcn/<项目源码镜像仓库>，换电脑不丢源码；失败不阻塞发布）
if git remote | grep -q '^github$'; then
  if git push github sprint/default >>"$LOG" 2>&1; then
    echo "github-mirror: pushed"
  else
    sleep 5
    git push github sprint/default >>"$LOG" 2>&1 && echo "github-mirror: pushed(retry)" || echo "github-mirror: FAILED(网络抖动，下次部署会补推)"
  fi
fi

# 3) release-create
REL=$(mi lark-cli apps +release-create --as user --app-id $APP --branch sprint/default 2>>"$LOG")
RID=$(echo "$REL" | python -c "import sys,json;d=json.load(sys.stdin);print(d.get('data',{}).get('release_id',''))" 2>/dev/null)
if [ -z "$RID" ]; then
  RL=$(mi lark-cli apps +release-list --app-id $APP --as user 2>>"$LOG")
  RID=$(echo "$RL" | python -c "import sys,json
d=json.load(sys.stdin)
def find(o):
    if isinstance(o,dict):
        if 'release_id' in o: return o['release_id']
        for v in o.values():
            r=find(v)
            if r: return r
    if isinstance(o,list):
        for v in o:
            r=find(v)
            if r: return r
    return None
print(find(d) or '')" 2>/dev/null)
fi
[ -z "$RID" ] && finish "FAIL: release_id 获取失败，见 $LOG"

# 4) 20 秒轮询（最多 5 分钟）
while true; do
  RG=$(mi lark-cli apps +release-get --as user --app-id $APP --release-id "$RID" 2>>"$LOG")
  ST=$(echo "$RG" | python -c "import sys,json;d=json.load(sys.stdin);print(d.get('data',{}).get('status',''))" 2>/dev/null)
  echo "[$(date '+%H:%M:%S')] release $ST" >> "$LOG"
  ELAPSED=$(( ($(date +%s)-T0)/60 ))
  if [ "$ST" = "finished" ]; then
    # 5) 自动同步 skill（红线：release finished 后必须同步，防资产过期）
SYNC="done"
  bash "$DP/sync_skill.sh" >>"$LOG" 2>&1 || SYNC="FAILED-手动补跑 $DP/sync_skill.sh"
        finish "OK commit:$CID release:$RID 耗时:${ELAPSED}分钟内 status:finished skill同步:$SYNC
  线上: https://<your-domain>.feishuapp.com/app/$APP"
      fi
  if [ "$ST" = "failed" ]; then
    finish "FAIL: release failed，release_id=$RID，见 $LOG"
  fi
  if [ $(( $(date +%s)-T0 )) -gt 300 ]; then
    finish "TIMEOUT: 5 分钟未完成，release_id=$RID status=$ST，见 $LOG"
  fi
  sleep 20
done
