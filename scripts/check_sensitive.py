#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""公开仓敏感信息门禁：扫描工作区 / 暂存区 / 提交信息 / 全部历史。

为什么需要：客户名、内部站点、应用 ID 一旦进了 commit，光改文件清不掉 ——
GitHub 上旧 blob 仍可按 SHA 访问，PR 更是无法删除。

词表来源（合并使用）：
  1. $SENSITIVE_MAP        默认 ~/.codem/.sanitize_map.json 的 gate_words（私有，不入库）
  2. $SENSITIVE_WORDS      逗号分隔的临时词
  3. --words FILE          每行一词
  4. 内置 GENERIC          内部域名 / 应用 ID / schema 名等通用形态（不含任何具体客户信息，可入库）

用法：
  python3 scripts/check_sensitive.py                 # 工作区已跟踪文件
  python3 scripts/check_sensitive.py --staged        # 暂存区（pre-commit 调）
  python3 scripts/check_sensitive.py --message FILE  # 提交信息（commit-msg 调）
  python3 scripts/check_sensitive.py --history       # 全部历史（blob + 提交信息）

退出码：0 通过 / 1 命中 / 2 环境错误
"""

from __future__ import annotations

import argparse
import io
import json
import os
import re
import subprocess
import sys
import tempfile

# Windows 下 stdout 非 TTY 时默认按本地代码页编码，中文会乱码/报错，统一转 UTF-8
for _stream in (sys.stdout, sys.stderr):
    if hasattr(_stream, "reconfigure"):
        _stream.reconfigure(encoding="utf-8", errors="replace")

GENERIC = [
    (re.compile(r"[a-z0-9][a-z0-9-]*\.feishuapp\.com", re.I), "内部飞书应用域名"),
    (re.compile(r"[a-z0-9][a-z0-9-]*\.feishu\.link", re.I), "内部飞书短链域名"),
    (re.compile(r"app_[a-z0-9]*[0-9][a-z0-9]{9,}", re.I), "妙搭应用 ID"),
    (re.compile(r"workspace_[a-z0-9]{10,}", re.I), "数据库 schema 名"),
]

# 这些形态是占位符，不算泄露
PLACEHOLDER = ("your-domain", "example", "placeholder", "<", "xxxx")


def git(*args: str) -> subprocess.CompletedProcess:
    return subprocess.run(["git", *args], capture_output=True)


def out_text(cp: subprocess.CompletedProcess) -> str:
    return cp.stdout.decode("utf-8", "replace")


def load_words(args) -> tuple[list[str], list[str], str]:
    """返回 (固定词, 来源说明, 私有词表路径)。"""
    words: list[str] = []
    notes: list[str] = []

    files: list[str] = []
    if args.words:
        files.append(args.words)
    map_path = os.environ.get("SENSITIVE_MAP") or os.path.expanduser("~/.codem/.sanitize_map.json")
    if os.path.exists(map_path):
        try:
            with io.open(map_path, encoding="utf-8") as f:
                data = json.load(f)
            got = [str(w).strip().replace("\r", "") for w in (data.get("gate_words") or [])]
            got = [w for w in got if w]
            words.extend(got)
            notes.append(f"私有词表 {len(got)} 词")
        except Exception as exc:  # noqa: BLE001
            print(f"⚠ 私有词表解析失败（{map_path}）：{exc}", file=sys.stderr)
    else:
        print(f"⚠ 未找到私有词表 {map_path}：仅用通用形态扫描，客户名无法覆盖", file=sys.stderr)
        print("  提示：本地开发机应存在该文件；CI 上属预期行为", file=sys.stderr)

    for f in files:
        with io.open(f, encoding="utf-8") as fh:
            words.extend([ln.strip() for ln in fh if ln.strip()])

    extra = os.environ.get("SENSITIVE_WORDS", "")
    words.extend([w.strip() for w in extra.split(",") if w.strip()])

    seen, uniq = set(), []
    for w in words:
        if w not in seen:
            seen.add(w)
            uniq.append(w)
    uniq.sort(key=len, reverse=True)
    return uniq, notes, map_path


def is_placeholder(token: str) -> bool:
    low = token.lower()
    return any(p in low for p in PLACEHOLDER)


def scan_text(label: str, text: str, words: list[str]) -> list[dict]:
    hits: list[dict] = []
    lines = text.splitlines()
    for i, line in enumerate(lines, 1):
        for w in words:
            if w.lower() in line.lower():
                hits.append({"where": f"{label}:{i}", "token": w, "kind": "客户名/内部词", "text": line.strip()})
                break
        else:
            for rx, kind in GENERIC:
                m = rx.search(line)
                if m and not is_placeholder(m.group(0)):
                    hits.append({"where": f"{label}:{i}", "token": m.group(0), "kind": kind, "text": line.strip()})
                    break
    return hits


def scan_file(path: str, label: str, words: list[str]) -> list[dict]:
    try:
        with io.open(path, "rb") as f:
            raw = f.read()
    except OSError as exc:
        print(f"⚠ 读取失败 {path}: {exc}", file=sys.stderr)
        return []
    if b"\x00" in raw[:8192]:
        return []
    return scan_text(label, raw.decode("utf-8", "replace"), words)


def tracked_files() -> list[str]:
    cp = git("ls-files", "-z")
    if cp.returncode != 0:
        return []
    return [p for p in out_text(cp).split("\0") if p]


def do_tree(words: list[str], root: str) -> list[dict]:
    hits: list[dict] = []
    for rel in tracked_files():
        hits += scan_file(os.path.join(root, rel), rel, words)
    return hits


def do_staged(words: list[str], root: str) -> list[dict]:
    """把暂存区导出到临时目录再扫，避免读到工作区未暂存的内容。"""
    hits: list[dict] = []
    with tempfile.TemporaryDirectory() as tmp:
        cp = subprocess.run(
            ["git", "checkout-index", "-a", f"--prefix={tmp}{os.sep}"],
            capture_output=True,
        )
        if cp.returncode != 0:
            print("⚠ 暂存区导出失败，跳过检查", file=sys.stderr)
            return []
        for dirpath, _dirs, files in os.walk(tmp):
            for fn in files:
                full = os.path.join(dirpath, fn)
                rel = os.path.relpath(full, tmp).replace(os.sep, "/")
                hits += scan_file(full, rel, words)
    return hits


def do_message(path: str, words: list[str]) -> list[dict]:
    return scan_file(path, "commit-message", words)


def do_history(words: list[str], root: str) -> list[dict]:
    hits: list[dict] = []

    # 1) 提交信息
    cp = git("log", "--all", "--pretty=format:%H\x1f%B\x1e")
    for chunk in out_text(cp).split("\x1e"):
        chunk = chunk.strip("\n")
        if not chunk.strip():
            continue
        sha, _, body = chunk.partition("\x1f")
        hits += scan_text(f"commit:{sha[:8]}", body, words)

    # 2) 历史文件内容
    cp = git("rev-list", "--all")
    revs = [r for r in out_text(cp).split() if r]
    if not revs:
        return hits

    with tempfile.NamedTemporaryFile("w", encoding="utf-8", suffix=".words", delete=False) as wf:
        wf.write("\n".join(words) + "\n" if words else "")
        words_file = wf.name
    with tempfile.NamedTemporaryFile("w", encoding="utf-8", suffix=".rx", delete=False) as rf:
        rf.write("\n".join(rx.pattern for rx, _ in GENERIC) + "\n")
        regex_file = rf.name

    greps = []
    if words:
        greps.append(["-F", "-f", words_file])
    greps.append(["-E", "-f", regex_file])

    try:
        for start in range(0, len(revs), 300):
            batch = revs[start : start + 300]
            for g in greps:
                cp = git("grep", "-n", "-I", "-i", *g, *batch)
                for line in out_text(cp).splitlines():
                    parts = line.split(":", 3)
                    if len(parts) < 4:
                        continue
                    _sha, path, lineno, text = parts
                    hits += scan_text(f"{path}:{lineno}", text, words)
    finally:
        for f in (words_file, regex_file):
            try:
                os.unlink(f)
            except OSError:
                pass
    return hits


def main() -> int:
    ap = argparse.ArgumentParser(description="敏感信息门禁")
    ap.add_argument("--staged", action="store_true", help="扫描暂存区（pre-commit）")
    ap.add_argument("--history", action="store_true", help="扫描全部历史（blob + 提交信息）")
    ap.add_argument("--message", metavar="FILE", help="扫描提交信息文件（commit-msg）")
    ap.add_argument("--words", metavar="FILE", help="附加词表（每行一词）")
    ap.add_argument("--max", type=int, default=40, help="最多显示条数（默认 40）")
    ap.add_argument("--quiet", action="store_true", help="只输出结论")
    args = ap.parse_args()

    cp = git("rev-parse", "--show-toplevel")
    if cp.returncode != 0:
        print("✗ 不在 git 仓库内", file=sys.stderr)
        return 2
    root = out_text(cp).strip()

    words, notes, map_path = load_words(args)

    if args.message:
        hits = do_message(args.message, words)
        scope = "提交信息"
    elif args.history:
        hits = do_history(words, root)
        scope = "全部历史"
    elif args.staged:
        hits = do_staged(words, root)
        scope = "暂存区"
    else:
        hits = do_tree(words, root)
        scope = "工作区"

    if hits:
        print(f"\n✗ {scope}发现 {len(hits)} 处敏感信息：\n")
        for h in hits[: args.max]:
            snippet = h["text"][:150]
            print(f"  [{h['kind']}] {h['where']}")
            print(f"      命中：{h['token']}")
            print(f"      内容：{snippet}")
        if len(hits) > args.max:
            print(f"\n  …另有 {len(hits) - args.max} 处未显示（--max 调整）")
        print("\n处置：改写为占位符（示例客户名 / <your-domain> / <app_id>），不要直接删除上下文。")
        print("若已在历史里：改文件没用，须重建历史或按 COLLAB_PROTOCOL.md 走重建流程。")
        return 1

    if not args.quiet:
        src = "、".join(notes) if notes else "仅通用形态"
        extra = f" + 通用形态 {len(GENERIC)} 条"
        print(f"✓ {scope}无敏感信息（{src}{extra}）")
    return 0


if __name__ == "__main__":
    sys.exit(main())
