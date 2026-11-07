#!/usr/bin/env bash
# ============================================================================
# mirror_skill.sh — 技能「真源 git 仓」↔「本机加载副本」镜像同步
#
# 为什么需要它：每个技能在本机有两份拷贝，不注意就会悄悄发散
#   真源  ~/.codem/skills/<skill>        git clone（CRLF 工作区，公开仓，走 PR）
#   副本  ~/.workbuddy/skills/<skill>    WorkBuddy 实际加载的那份（LF）
#
# 坑：Windows 下真源 core.autocrlf=true，两份字节不同但内容相同，
#     直接 diff -rq 会把换行差异全报成「整文件重写」（实测 14 个差异里 9 个是假的）。
#     本脚本一律按「去 CR 后的内容」比对，只在真正内容不同时才报。
#
# 与本仓 report-kit-builder/assets/04_pipeline/deploy/sync_skill.sh 的分工：
#   那个 = 项目 05_app → 真源（含脱敏替换 + 门禁 + 自动开 PR），管「源 → 仓」
#   本脚本 = 真源 ↔ 本机加载副本，管「仓 → 本机生效」与「本机编辑 → 仓」
#
# 用法：
#   mirror_skill.sh [status] [skill...]   双向差异体检（默认），有差异退出码 1
#   mirror_skill.sh pull   [skill...]     真源 → 副本（仓里改完，让本机立刻生效）
#   mirror_skill.sh push   [skill...]     副本 → 真源（本机编辑后回灌，含脱敏门禁）
#   mirror_skill.sh list                  列出两边都有的技能及差异计数
#
# 选项：
#   --src DIR      真源根目录（默认 $HOME/.codem/skills，也可用环境变量 SKILLS_SRC）
#   --dst DIR      副本根目录（默认 $HOME/.workbuddy/skills，也可用 SKILLS_DST）
#   --dry-run      只打印将要做什么，不落盘
#   --force        push 时允许真源已有未提交改动（默认中止）
#   --prune        pull 时删除副本独有文件、push 时删除真源独有文件（默认保留防误删）
#   --no-gate      跳过脱敏门禁（仅内部调试；回灌公开仓前必须去掉）
#   --audit        status 时额外全量扫敏感词（只告警，不阻断）
#   -h, --help     显示本帮助
#
# 环境变量：
#   SKILLS_SRC / SKILLS_DST   覆盖两端根目录（脚本自测用）
#   SANITIZE_MAP              覆盖脱敏词表路径（默认 $HOME/.codem/.sanitize_map.json）
#
# 退出码：0 一致或执行成功；1 存在差异（status）；2 用法/环境错误；3 脱敏门禁拦截
#
# 典型流程（改完一个技能）：
#   1) 在 ~/.workbuddy/skills/<skill> 直接改（WorkBuddy 加载的就是这份，改完即可预览）
#   2) mirror_skill.sh status <skill>          确认只有预期文件有差异
#   3) mirror_skill.sh push <skill>            回灌真源（门禁通过才写）
#   4) 按 COLLAB_PROTOCOL.md 第一节：切分支 → commit → push → PR → 用户授权合并
#   5) mirror_skill.sh pull <skill>            合并后拉平两端（可选，push 后两端已一致）
# ============================================================================
set -uo pipefail

SRC="${SKILLS_SRC:-$HOME/.codem/skills}"
DST="${SKILLS_DST:-$HOME/.workbuddy/skills}"
MAP="${SANITIZE_MAP:-$HOME/.codem/.sanitize_map.json}"

CMD="status"
DRY=0
FORCE=0
PRUNE=0
GATE=1
AUDIT=0
SKILLS=()

TEXT_RE='\.(md|markdown|ts|tsx|js|jsx|cjs|mjs|css|scss|json|sh|bash|py|sql|html|htm|txt|yml|yaml|ps1|bat|cmd|toml|ini|cfg|conf|xml|svg)$'

# ---------- 基础设施 ----------
die() { printf '错误：%s\n' "$*" >&2; exit 2; }
note() { printf '%s\n' "$*"; }
hr() { printf '%s\n' "------------------------------------------------------------"; }

usage() {
  # 打印文件头注释块（第 2 行起，到 set 语句前为止），不依赖写死的行号
  awk 'NR==1{next} /^set -uo/{exit} {sub(/^# ?/,""); print}' "$0"
}

# 文本文件判定：按扩展名白名单 + 无扩展名的 VERSION。
# 二进制一律原样复制，绝不 tr -d '\r'（否则会破坏字节）。
is_text() {
  local b
  b="$(basename "$1")"
  [ "$b" = "VERSION" ] && return 0
  printf '%s' "$b" | grep -qiE "$TEXT_RE"
}

# 内容比对：先字节级 cmp 快速判等；不等且是文本时，去 CR 再比（吃掉换行差异）
content_same() {
  [ -f "$1" ] && [ -f "$2" ] || return 1
  cmp -s "$1" "$2" && return 0
  is_text "$1" || return 1
  diff -q <(tr -d '\r' < "$1") <(tr -d '\r' < "$2") >/dev/null 2>&1
}

# 目录内相对路径清单（排除 git / 依赖 / 缓存 / 编辑器临时文件）
rel_files() {
  local d="$1"
  [ -d "$d" ] || return 0
  ( cd "$d" && find . -type f \
      ! -path './.git/*' ! -path '*/node_modules/*' ! -path '*/__pycache__/*' \
      ! -name '.DS_Store' ! -name 'Thumbs.db' \
      ! -name '*.orig' ! -name '*.rej' ! -name '*.log' \
    | sed 's|^\./||' | LC_ALL=C sort )
}

# 写入目标文件；eol=crlf 时统一 CRLF（真源工作区风格），eol=lf 时统一 LF（副本风格）
write_file() { # <src> <dst> <crlf|lf>
  local s="$1" d="$2" eol="$3"
  [ $DRY -eq 1 ] && return 0
  mkdir -p "$(dirname "$d")" || return 1
  if is_text "$s"; then
    if [ "$eol" = "crlf" ]; then
      tr -d '\r' < "$s" | sed 's/$/\r/' > "$d"
    else
      tr -d '\r' < "$s" > "$d"
    fi
  else
    cp -f "$s" "$d"
  fi
}

# ---------- 脱敏词表 ----------
gate_words() { # 逐行输出敏感词；读不到词表时输出空
  [ -f "$MAP" ] || return 0
  local py
  py="$(command -v python 2>/dev/null || command -v python3 2>/dev/null || true)"
  [ -n "$py" ] || return 0
  "$py" -X utf8 -c '
import io, json, sys
m = json.load(io.open(sys.argv[1], encoding="utf-8"))
for w in m.get("gate_words", []):
    w = str(w).strip()
    if w:
        print(w)
' "$MAP" 2>/dev/null
}

load_words() { # 结果放全局 WORDS 数组
  WORDS=()
  local line
  while IFS= read -r line; do
    # Windows 下 python print 会输出 CRLF，必须剥掉行尾 \r，否则 grep 永远匹配不到
    line="${line%$'\r'}"
    [ -n "$line" ] && WORDS+=("$line")
  done < <(gate_words)
}

# ---------- 差异扫描 ----------
SRC_ONLY=()
DST_ONLY=()
DIFF=()
SAME_N=0

# GNU diff 支持 --strip-trailing-cr（一次比对整目录，比逐文件 fork 快两个数量级）
HAVE_STRIP_CR=0
if diff --help 2>/dev/null | grep -q -- '--strip-trailing-cr'; then
  HAVE_STRIP_CR=1
fi

DIFF_EXCLUDES=(--exclude=.git --exclude=node_modules --exclude=__pycache__ \
  --exclude=.DS_Store --exclude=Thumbs.db --exclude='*.orig' --exclude='*.rej' --exclude='*.log')

scan_skill() { # 结果放全局四个变量：SRC_ONLY / DST_ONLY / DIFF / SAME_N
  local skill="$1"
  local s="$SRC/$skill" d="$DST/$skill"
  SRC_ONLY=(); DST_ONLY=(); DIFF=(); SAME_N=0
  [ -d "$s" ] || die "真源目录不存在：$s"
  [ -d "$d" ] || die "副本目录不存在：$d"

  if [ $HAVE_STRIP_CR -eq 1 ]; then
    local line left a where nm dir rel total
    while IFS= read -r line; do
      case "$line" in
        "Files "*" differ")
          # Files <src路径> and <dst路径> differ —— 取真源侧相对路径即可
          left="${line#Files }"
          left="${left% differ}"
          a="${left%% and *}"
          DIFF+=("${a#"$s"/}")
          ;;
        "Only in "*)
          where="${line#Only in }"
          nm="${where##*: }"
          dir="${where%: *}"
          case "$dir" in
            "$s") rel="$nm" ;;
            "$s"/*) rel="${dir#"$s"/}/$nm" ;;
            "$d") rel="$nm" ;;
            *) rel="${dir#"$d"/}/$nm" ;;
          esac
          case "$dir" in
            "$s" | "$s"/*) SRC_ONLY+=("$rel") ;;
            *) DST_ONLY+=("$rel") ;;
          esac
          ;;
      esac
    done < <(diff -r -q --strip-trailing-cr "${DIFF_EXCLUDES[@]}" "$s" "$d" 2>/dev/null)
    total="$(rel_files "$s" | wc -l | tr -d ' ')"
    SAME_N=$((total - ${#SRC_ONLY[@]} - ${#DIFF[@]}))
    [ $SAME_N -lt 0 ] && SAME_N=0
    return 0
  fi

  # 回退：逐文件比对（BSD diff 无 --strip-trailing-cr 时走这里，慢但结果等价）
  local f
  while IFS= read -r f; do
    [ -n "$f" ] || continue
    if [ ! -f "$d/$f" ]; then
      SRC_ONLY+=("$f")
    elif content_same "$s/$f" "$d/$f"; then
      SAME_N=$((SAME_N + 1))
    else
      DIFF+=("$f")
    fi
  done < <(rel_files "$s")
  while IFS= read -r f; do
    [ -n "$f" ] || continue
    [ -f "$s/$f" ] || DST_ONLY+=("$f")
  done < <(rel_files "$d")
}

diff_total() { echo $(( ${#SRC_ONLY[@]} + ${#DST_ONLY[@]} + ${#DIFF[@]} )); }

# 两端都存在的技能清单
list_skills() {
  local d n found=0
  for d in "$SRC"/*/; do
    [ -d "$d" ] || continue
    n="$(basename "$d")"
    if [ -d "$DST/$n" ]; then
      printf '%s\n' "$n"
      found=1
    fi
  done
  [ $found -eq 1 ] || return 1
}

resolve_skills() {
  local all=() s one ok
  while IFS= read -r s; do all+=("$s"); done < <(list_skills)
  if [ ${#all[@]} -eq 0 ]; then
    die "两端口径下没有同名技能（SRC=$SRC DST=$DST）"
  fi
  if [ ${#SKILLS[@]} -eq 0 ]; then
    SKILLS=("${all[@]}")
    return 0
  fi
  for one in "${SKILLS[@]}"; do
    ok=0
    for s in "${all[@]}"; do
      if [ "$one" = "$s" ]; then ok=1; break; fi
    done
    [ $ok -eq 1 ] || die "技能 $one 在两边不同时存在，用 list 查看可镜像清单"
  done
}

# ---------- 命令：status ----------
audit_skill() {
  local skill="$1" d="$DST/$1" i w f hits=0
  if [ ${#WORDS[@]} -eq 0 ]; then
    note "    · 脱敏词表为空或不可读（$MAP），跳过审计"
    return 0
  fi
  for ((i = 0; i < ${#WORDS[@]}; i++)); do
    w="${WORDS[$i]}"
    while IFS= read -r f; do
      [ -n "$f" ] || continue
      hits=$((hits + 1))
      note "    · 命中「$w」 ${f#$d/}"
    done < <(grep -rilF -- "$w" "$d" 2>/dev/null)
  done
  [ $hits -eq 0 ] && note "    · 敏感词审计通过（${#WORDS[@]} 个词）"
  return 0
}

cmd_status() {
  local rc=0 skill i badge
  note "真源 SRC = $SRC"
  note "副本 DST = $DST"
  hr
  for skill in "${SKILLS[@]}"; do
    scan_skill "$skill"
    badge="一致 ✅"
    if [ "$(diff_total)" -gt 0 ]; then
      badge="有差异 ❌"
      rc=1
    fi
    note "[$skill] $badge  相同 $SAME_N / 仅真源 ${#SRC_ONLY[@]} / 仅副本 ${#DST_ONLY[@]} / 内容不同 ${#DIFF[@]}"
    for ((i = 0; i < ${#SRC_ONLY[@]}; i++)); do note "    + 仅真源   ${SRC_ONLY[$i]}"; done
    for ((i = 0; i < ${#DST_ONLY[@]}; i++)); do note "    - 仅副本   ${DST_ONLY[$i]}"; done
    for ((i = 0; i < ${#DIFF[@]}; i++)); do note "    ~ 内容不同 ${DIFF[$i]}"; done
    if [ $AUDIT -eq 1 ]; then
      load_words
      audit_skill "$skill"
    fi
    hr
  done
  if [ $rc -eq 0 ]; then
    note "两端内容一致（已忽略 CRLF 差异）"
  else
    note "存在差异：pull = 用真源覆盖副本；push = 把副本改动回灌真源"
  fi
  return $rc
}

# ---------- 命令：list ----------
cmd_list() {
  local s
  note "可镜像技能（真源 ∩ 副本）："
  while IFS= read -r s; do
    scan_skill "$s"
    printf '  %-46s 相同 %3d  仅源 %2d  仅副本 %2d  不同 %2d\n' \
      "$s" "$SAME_N" "${#SRC_ONLY[@]}" "${#DST_ONLY[@]}" "${#DIFF[@]}"
  done < <(list_skills)
}

# ---------- 命令：pull（真源 → 副本，写 LF） ----------
cmd_pull() {
  local skill i rel n_cp=0 n_rm=0
  for skill in "${SKILLS[@]}"; do
    scan_skill "$skill"
    note "[$skill] 真源 → 副本"
    if [ "$(diff_total)" -eq 0 ]; then
      note "    已一致，跳过"
      continue
    fi
    for ((i = 0; i < ${#SRC_ONLY[@]}; i++)); do
      rel="${SRC_ONLY[$i]}"
      note "    + 新增 ${rel}"
      write_file "$SRC/$skill/$rel" "$DST/$skill/$rel" lf && n_cp=$((n_cp + 1))
    done
    for ((i = 0; i < ${#DIFF[@]}; i++)); do
      rel="${DIFF[$i]}"
      note "    ~ 覆盖 ${rel}"
      write_file "$SRC/$skill/$rel" "$DST/$skill/$rel" lf && n_cp=$((n_cp + 1))
    done
    for ((i = 0; i < ${#DST_ONLY[@]}; i++)); do
      rel="${DST_ONLY[$i]}"
      if [ $PRUNE -eq 1 ]; then
        note "    - 删除 ${rel}（副本独有）"
        [ $DRY -eq 1 ] || rm -f "$DST/$skill/$rel"
        n_rm=$((n_rm + 1))
      else
        note "    ! 保留 ${rel}（副本独有；确认可删再加 --prune）"
      fi
    done
  done
  note ""
  note "$([ $DRY -eq 1 ] && echo '（dry-run）' || echo '完成：')写入副本 $n_cp 个文件，删除 $n_rm 个"
}

# ---------- 命令：push（副本 → 真源，写 CRLF，过脱敏门禁） ----------
cmd_push() {
  local skill i rel rc=0
  local todo=() dirty
  for skill in "${SKILLS[@]}"; do
    scan_skill "$skill"
    note "[$skill] 副本 → 真源"
    if [ "$(diff_total)" -eq 0 ]; then
      note "    已一致，跳过"
      continue
    fi

    # 真源已有未提交改动时中止：否则本次回灌会和别人的改动混在同一个 diff 里
    if git -C "$SRC" rev-parse --git-dir >/dev/null 2>&1; then
      dirty="$(git -C "$SRC" status --porcelain -- "$skill" 2>/dev/null)"
      if [ -n "$dirty" ] && [ $FORCE -eq 0 ]; then
        note "    ✗ 真源工作区已有未提交改动，先 commit/stash（或 --force 硬写）："
        printf '%s\n' "$dirty" | sed 's/^/        /'
        rc=1
        continue
      fi
    fi

    # 本次将写入真源的文件清单
    todo=()
    for ((i = 0; i < ${#DST_ONLY[@]}; i++)); do todo+=("$DST/$skill/${DST_ONLY[$i]}"); done
    for ((i = 0; i < ${#DIFF[@]}; i++)); do todo+=("$DST/$skill/${DIFF[$i]}"); done

    # 脱敏门禁：只扫「本次新增/修改」的文件，不扫历史内容（历史遗留另用 --audit 看）
    if [ $GATE -eq 1 ] && [ ${#todo[@]} -gt 0 ]; then
      load_words
      if [ ${#WORDS[@]} -eq 0 ]; then
        note "    ! 脱敏词表为空或不可读（$MAP），门禁未生效"
      else
        local hit=0 j w f
        for ((j = 0; j < ${#todo[@]}; j++)); do
          f="${todo[$j]}"
          for ((i = 0; i < ${#WORDS[@]}; i++)); do
            w="${WORDS[$i]}"
            if grep -qiF -- "$w" "$f" 2>/dev/null; then
              note "    ✗ 脱敏命中「$w」 ${f#$DST/}"
              hit=1
            fi
          done
        done
        if [ $hit -eq 1 ]; then
          note "    ✗ SANITIZE-GATE FAILED：公开仓不得含客户名/内部域名/凭证，先替换再 push"
          rc=3
          continue
        fi
        note "    ✓ 脱敏门禁通过（${#WORDS[@]} 个词 × ${#todo[@]} 个待写文件）"
      fi
    fi

    for ((i = 0; i < ${#DST_ONLY[@]}; i++)); do
      rel="${DST_ONLY[$i]}"
      note "    + 新增 ${rel}"
      write_file "$DST/$skill/$rel" "$SRC/$skill/$rel" crlf || rc=1
    done
    for ((i = 0; i < ${#DIFF[@]}; i++)); do
      rel="${DIFF[$i]}"
      note "    ~ 覆盖 ${rel}"
      write_file "$DST/$skill/$rel" "$SRC/$skill/$rel" crlf || rc=1
    done
    for ((i = 0; i < ${#SRC_ONLY[@]}; i++)); do
      rel="${SRC_ONLY[$i]}"
      if [ $PRUNE -eq 1 ]; then
        note "    - 删除 ${rel}（真源独有）"
        [ $DRY -eq 1 ] || rm -f "$SRC/$skill/$rel"
      else
        note "    ! 保留 ${rel}（真源独有；副本已删再确认 --prune）"
      fi
    done
  done

  note ""
  if [ $DRY -eq 1 ]; then
    note "（dry-run：以上动作均未落盘）"
  elif [ $rc -eq 0 ]; then
    note "已写入真源（CRLF）。下一步按 COLLAB_PROTOCOL.md 第一节走："
    note "  git -C $SRC checkout -b feature/<描述>"
    note "  git -C $SRC add -A && git -C $SRC commit -m 'feat(<skill>): <说明>'"
    note "  git -C $SRC push -u origin feature/<描述>   # 然后开 PR，等用户授权合并"
    note "  （禁止直推 main：分支保护已启用）"
  fi
  return $rc
}

# ---------- 参数解析 ----------
while [ $# -gt 0 ]; do
  case "$1" in
    status | pull | push | list) CMD="$1" ;;
    --src) SRC="${2:?--src 需要参数}"; shift ;;
    --dst) DST="${2:?--dst 需要参数}"; shift ;;
    --dry-run) DRY=1 ;;
    --force) FORCE=1 ;;
    --prune) PRUNE=1 ;;
    --no-gate) GATE=0 ;;
    --audit) AUDIT=1 ;;
    -h | --help) usage; exit 0 ;;
    -*) die "未知选项：$1（-h 看帮助）" ;;
    *) SKILLS+=("$1") ;;
  esac
  shift
done

[ -d "$SRC" ] || die "真源根目录不存在：$SRC"
[ -d "$DST" ] || die "副本根目录不存在：$DST"

case "$CMD" in
  list) cmd_list ;;
  status) resolve_skills; cmd_status ;;
  pull) resolve_skills; cmd_pull ;;
  push) resolve_skills; cmd_push ;;
esac
