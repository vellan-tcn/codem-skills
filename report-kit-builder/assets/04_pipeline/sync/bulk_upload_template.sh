#!/bin/bash
# 妙搭大批量数据上传模板（分批 SQL + 断点续传）——源自示例食品厂项目实战验证
# 用法：改下面 4 个参数后跑 bash bulk_upload_template.sh
# 前提：已在项目工作目录下准备好分片 SQL 文件（c0001.sql, c0002.sql, ...），
#       每片内容为纯 INSERT 语句（片间可加 DELETE WHERE 范围条件实现替换）

# ===== 按项目改这 4 项 =====
APP_ID="app_xxxxxxxxxxxxxxxx"                 # 妙搭应用 ID
ENVIRONMENT="online"                          # 线上库用 online（多环境应用可先在 dev 验证）
CHUNK_DIR="04_处理后数据/xxx/raw_chunks"        # 分片 SQL 目录（必须在当前工作目录内，scratchpad 会被拒）
TABLE_NAME="your_table"                       # 目标表名（仅用于日志）

# ===== 以下不用改 =====
CODEM='C:\Users\vella\.codem\runtime\versions\0.1.209\node_modules\@lark-codem\codem-cli-win32-x64\bin\codem.exe'
export LARKSUITE_CLI_APP_ID='cli_aac5d4db58385cd3'
export LARKSUITE_CLI_BRAND='feishu'
export LARKSUITE_CLI_DEFAULT_AS='user'
export LARKSUITE_CLI_STRICT_MODE='user'
export LARKSUITE_CLI_USER_ACCESS_TOKEN="$("$CODEM" __hook tool-uat-env --print-uat --config-path 'C:\Users\vella\.codem\config.json')"

DONE="$CHUNK_DIR/.done_list"
touch "$DONE"
n=0
for f in "$CHUNK_DIR"/c*.sql; do
  [ -e "$f" ] || { echo "无分片文件"; exit 1; }
  b=$(basename "$f")
  grep -q "^$b$" "$DONE" && continue          # 断点续传：跳过已完成
  for try in 1 2; do                          # 每片重试 1 次
    out=$("$CODEM" __hook tool-uat-env --run-managed-lark-cli --config-path 'C:\Users\vella\.codem\config.json' -- \
      lark-cli apps +db-execute --app-id "$APP_ID" --environment "$ENVIRONMENT" --yes --as user --file "$CHUNK_DIR/$b" 2>&1)
    if echo "$out" | grep -q '"ok": true'; then
      echo "$b" >> "$DONE"; n=$((n+1)); break
    elif [ "$try" = "2" ]; then
      echo "FAIL $b: $(echo "$out" | grep -o '"message": "[^"]*"' | head -1)" >> "$CHUNK_DIR/.fail_list"
    fi
  done
done
echo "UPLOAD_DONE table=$TABLE_NAME new=$n fail=$(wc -l < "$CHUNK_DIR/.fail_list" 2>/dev/null || echo 0)"
# 收尾：cat .fail_list 看失败片，修复后重跑脚本即自动续传（done_list 已完成片会跳过）
