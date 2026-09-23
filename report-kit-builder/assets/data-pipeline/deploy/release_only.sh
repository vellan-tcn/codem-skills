#!/bin/bash
# 发布 05_app：release-create + 轮询到 finished
SP='C:/Users/vella/.codem/sessions/4dd5d9fbbad88481/sess_7686678375015943113/scratchpad'
OUT="$SP/deploy_result.txt"
APP=app_17ebtg2mam8
CODEM='C:\Users\vella\.codem\runtime\versions\0.1.209\node_modules\@lark-codem\codem-cli-win32-x64\bin\codem.exe'
export PATH="/c/Users/vella/AppData/Roaming/TRAE SOLO CN/ModularData/ai-agent/vm/tools/node:$PATH"
export LARKSUITE_CLI_APP_ID='cli_aac5d4db58385cd3'
export LARKSUITE_CLI_BRAND='feishu'
export LARKSUITE_CLI_DEFAULT_AS='user'
export LARKSUITE_CLI_STRICT_MODE='user'
export LARKSUITE_CLI_USER_ACCESS_TOKEN="$("$CODEM" __hook tool-uat-env --print-uat --config-path 'C:\Users\vella\.codem\config.json')"
mi() { "$CODEM" __hook tool-uat-env --run-managed-lark-cli --config-path 'C:\Users\vella\.codem\config.json' -- "$@"; }

T0=$(date +%s)
REL=$(mi lark-cli apps +release-create --as user --app-id $APP --branch sprint/default 2>&1)
echo "$REL" > "$SP/rel_out.json"
RID=$(echo "$REL" | python -c "import sys,json;d=json.load(sys.stdin);print(d.get('data',{}).get('release_id',''))" 2>/dev/null)
if [ -z "$RID" ]; then
  RL=$(mi lark-cli apps +release-list --app-id $APP --as user 2>&1)
  echo "$RL" > "$SP/rel_list.json"
  RID=$(python - "$SP/rel_list.json" << 'PYEOF'
import sys, json
def find(o):
    if isinstance(o, dict):
        if 'release_id' in o: return o['release_id']
        for v in o.values():
            r = find(v)
            if r: return r
    if isinstance(o, list):
        for v in o:
            r = find(v)
            if r: return r
    return None
try:
    d = json.load(open(sys.argv[1], encoding='utf-8'))
    print(find(d) or '')
except Exception:
    print('')
PYEOF
)
fi
[ -z "$RID" ] && { echo "FAIL: release_id 获取失败" | tee "$OUT"; exit 0; }
echo "RID=$RID"
while true; do
  RG=$(mi lark-cli apps +release-get --as user --app-id $APP --release-id "$RID" 2>&1)
  ST=$(echo "$RG" | python -c "import sys,json;d=json.load(sys.stdin);print(d.get('data',{}).get('status',''))" 2>/dev/null)
  echo "[$(date '+%H:%M:%S')] release $ST"
  if [ "$ST" = "finished" ]; then echo "OK release:$RID finished" | tee "$OUT"; break; fi
  if [ "$ST" = "failed" ]; then echo "FAIL release failed RID=$RID" | tee "$OUT"; break; fi
  if [ $(( $(date +%s)-T0 )) -gt 300 ]; then echo "TIMEOUT RID=$RID ST=$ST" | tee "$OUT"; break; fi
  sleep 20
done
