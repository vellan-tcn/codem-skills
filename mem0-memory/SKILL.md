---
name: mem0-memory
description: Mem0 云端跨设备记忆技能（主动记忆）。任何会话中遇到值得长期记住的信息时触发：请求人做出的关键决策/方案选择、新发现的坑与排障结论、明确的偏好与红线、重要的项目进展节点。职责有两面——主动写入（当轮就写，不等请求人提醒）与语义检索（新会话开场或「记不清之前怎么说的」时先查再答）。适用于任何 agent 平台（CodeM/Trae/Cursor 等），规则为纯 HTTP/MCP + markdown，无平台特有依赖。
---

# mem0-memory — Mem0 云端主动记忆

## 一、为什么要主动记忆（硬性心智）

**记忆不会自动发生。** Mem0 是被动存储：agent 不写，池子里就永远没有。历史教训（2026-09-22 复查）：09-21 建成后因无主动写入规则，之后零新增，检索池变成死水。因此本技能的核心是**写入纪律**，检索只是第二职责。

## 二、什么时候必须写（触发清单，当轮执行）

对话中出现以下任一类内容时，**在该轮结束前**就写入 Mem0，不等会话结束、不等提醒：

1. **关键决策**：请求人在多个方案中做了选择（如「双层 user_id 选方案 A」）、批准/否决了某方案、改变了既定方向
2. **新坑与排障结论**：发现工具/API/平台行为与预期不符 + 根因 + 修复办法（如「+chat 消息超长会被宿主拒绝」「curl 发中文 GBK 乱码」）
3. **明确偏好与红线**：请求人设定的行为准则、格式要求、账号指定、工作习惯
4. **重要进展节点**：版本上线、验证闭环、目录/架构定型等里程碑

**写什么**：一条记忆 = 一个事实点，含「谁/什么/为什么/结论」；写决策时把被否掉的方案及否决理由一并写入（下次才不会重新提议）。

**不写什么**：临时调试输出、可直接从代码/文档查到的结构化规范（那些归本地 MD 记忆管）、纯闲聊。

## 三、双层 user_id 隔离（硬性，2026-09-21 请求人批准方案 A）

```
项目层  zhaoweiliang/<工作空间名>   ← 项目决策、坑、偏好；各项目互不串
全局层  zhaoweiliang              ← 跨项目通用偏好（UI 基准、行为红线、工作习惯）
```

- 写入选层：内容归属哪个项目写哪层；拿不准按项目层
- 检索顺序：先项目层、再全局层，两池合并
- 项目标识 = 当前项目目录/工作空间名（各 agent 天然一致）

## 四、怎么调（agent 无关）

优先 MCP 工具（`tool_search select:mcp__mem0__*` 激活：add_memory / search_memories / get_memories 等）；MCP 不可用（CodeM 首启探测超时是已知现象）就走 REST：

```python
# python -X utf8（Windows GBK 终端下 curl 发中文必乱码）
import json, urllib.request
KEY = "<API_KEY>"   # 由环境管理员提供；本机在 .codem/memory/usr-credentials.md，禁入任何分发物
def call(url, payload, method="POST"):
    req = urllib.request.Request(url, data=json.dumps(payload, ensure_ascii=False).encode(),
        method=method, headers={"Authorization": f"Token {KEY}", "Content-Type": "application/json"})
    return json.loads(urllib.request.urlopen(req, timeout=60).read())

# 写入（messages 必须数组格式；返回 PENDING=异步入队，~15s 后可检索，勿重复写）
call("https://api.mem0.ai/v1/memories/", {
    "messages": [{"role": "user", "content": "……"}],
    "user_id": "zhaoweiliang/<工作空间名>",
})
# 语义检索
call("https://api.mem0.ai/v2/memories/search/", {
    "query": "关键词",
    "filters": {"AND": [{"user_id": "zhaoweiliang/<工作空间名>"}]},
})
# 列表/健康检查（GET）
# GET https://api.mem0.ai/v1/memories/?user_id=<层名>
```

**坑速查**：①messages 传字符串 → 400；②GBK 乱码 → 必须 python -X utf8；③写入 PENDING 立即检索不到 → 等 15s；④401 → key 失效，平台轮换；⑤v2/memories/ 不支持 GET → 列表用 v1。完整排查手册见工作区 `docs/retro/Mem0云端记忆系统全链路复盘-2026-09-21.md`。

## 五、检索时机

- 新会话开场或接续长任务时，按需查项目层（「上次做到哪」「之前怎么定的」）
- 遇到「请求人好像说过……」的模糊回忆时，先检索再回答，不凭印象
- 结构化规范（红线清单、API 契约、目录规范）仍以本地 MD 记忆为准（每会话自动注入，精确可靠）——Mem0 只补语义模糊场景，两层并存不替代

## 六、凭证纪律

API key 永远走环境私密文件/管理员私下提供，禁止进技能包、分发物、日志、代码仓库。
