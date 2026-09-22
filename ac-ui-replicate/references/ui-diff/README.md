# ui-diff — ac-ui 验收对比工具（随 skill 分发）

依赖：node ≥ 18 + playwright（`npm install`；浏览器用系统 Edge：launch 已内置 `channel: 'msedge'`，无需下载二进制）。

## 用法
- `node run.mjs cable [--shots]` — 参考站（母线测温）vs 我方线上框架全指标 DOM diff，报告落 `reports/`，差异非零退出码 2；我方线上登录态缺失先跑一次 `node save-state.mjs`（飞书 SSO 需人工登录）
- `node save-state.mjs` — 弹浏览器人工完成飞书登录，保存 `storage/ours.json`
- `node overflow.mjs [--viewports all|desktop|mobile] [--routes r1,r2]` — 4 视口横向溢出/越界/文字裁切检查，报告落 `reports/`，有问题退出码 2（可用 `BASE_URL` 环境变量换目标站）

无凭证时（参考站登录不可得）：可跳过 run.mjs 参考站对比，仅做 DESIGN-tailwind.css 静态 token 核对，但须在验收表标注。
