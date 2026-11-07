# scripts/ — 仓级运维脚本

这些脚本管「仓库 ↔ 本机环境」，与技能内容本身无关，不会随技能流到项目里。

| 脚本 | 作用 |
|---|---|
| `mirror_skill.sh` | 技能「真源 git 仓」↔「本机 WorkBuddy 加载副本」镜像同步（`status` / `pull` / `push` / `list`） |

## 和 `report-kit-builder/assets/04_pipeline/deploy/sync_skill.sh` 的分工

两者名字像，方向完全不同，别混：

| 脚本 | 方向 | 职责 |
|---|---|---|
| `report-kit-builder/assets/04_pipeline/deploy/sync_skill.sh` | 项目 `05_app` → 真源 | 拷资产、脱敏替换、门禁、自动开 PR（管「源 → 仓」） |
| `scripts/mirror_skill.sh` | 真源 ↔ 本机加载副本 | 让本机立刻生效、把本机编辑回灌（管「仓 → 本机」） |

## 为什么需要 mirror_skill.sh

每个技能在本机有两份拷贝，不注意就悄悄发散：

```
~/.codem/skills/<skill>        真源 git clone（CRLF 工作区，公开仓，改动走 PR）
~/.workbuddy/skills/<skill>    WorkBuddy 实际加载的那份（LF）
```

Windows 下真源 `core.autocrlf=true`，两份**字节不同但内容相同**。直接 `diff -rq` 会把换行差异全报成「整文件重写」——实测一次 14 个「差异」里 9 个是假的，真正内容差异只有 7 个。脚本一律按「去掉 CR 后的内容」比对，只有真实内容不同才报。

## 常用

```bash
scripts/mirror_skill.sh list                       # 哪些技能两边都有、各差多少
scripts/mirror_skill.sh status report-kit-builder  # 体检（有差异退出码 1，可进 CI）
scripts/mirror_skill.sh push  report-kit-builder   # 本机改完 → 回灌真源（过脱敏门禁）
scripts/mirror_skill.sh pull  report-kit-builder   # main 更新后 → 拉平本机
```

完整参数见 `scripts/mirror_skill.sh -h`。

## 红线

- **`push` 只写文件**，不 commit、不推远端：写完按 `COLLAB_PROTOCOL.md` 第一节走「分支 → commit → push → PR → 用户授权合并」。
- **默认不删任何「单边存在」的文件**（防误删本地新增/被截断的源）。确认无误后再加 `--prune`。
- **脱敏门禁只拦本次写入的文件**。历史遗留用 `status --audit` 查全量，不阻断但会逐条列出。
- `push` 前若真源工作区已有未提交改动会中止，避免本次回灌与别人的改动混进同一个 diff（`--force` 可硬写）。
