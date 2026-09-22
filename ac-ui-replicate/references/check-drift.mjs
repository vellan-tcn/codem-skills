#!/usr/bin/env node
// 漂移检测：diff DESIGN-tailwind.css（规范）vs 源码 tailwind-theme.css 的关键 CSS 变量值
// 用法：node check-drift.mjs [源码css路径]（默认相对技能包定位：工作区 projects/ac-monitor/miaoda/client/src/tailwind-theme.css）
// 退出码：0 无漂移 / 2 有漂移（可接 CI） / 1 文件缺失
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const dir = dirname(fileURLToPath(import.meta.url));
const designPath = resolve(dir, 'DESIGN-tailwind.css');
const srcPath = process.argv[2] || resolve(dir, '../../../../projects/ac-monitor/miaoda/client/src/tailwind-theme.css');

// 解析指定块（:root / .dark）内的 --var: value;
function parseBlock(css, sel) {
  const start = css.indexOf(sel);
  if (start < 0) return {};
  const open = css.indexOf('{', start), close = css.indexOf('}', open);
  const out = {};
  for (const m of css.slice(open + 1, close).matchAll(/--([\w-]+)\s*:\s*([^;]+);/g)) {
    out[m[1]] = m[2].replace(/\s+/g, ' ').trim();
  }
  return out;
}
const norm = (v) => v.toLowerCase().replace(/\s+/g, '').replace(/([,(])\.(\d)/g, '$10.$2');

let design, src;
try { design = readFileSync(designPath, 'utf8'); src = readFileSync(srcPath, 'utf8'); }
catch (e) { console.error('文件读取失败:', e.message); process.exit(1); }

const drift = [];
for (const sel of [':root', '.dark']) {
  const d = parseBlock(design, sel), s = parseBlock(src, sel);
  for (const k of Object.keys(d)) {
    if (s[k] === undefined) continue; // 源码侧未定义该 token（如派生/专用），不算值漂移
    if (norm(d[k]) !== norm(s[k])) drift.push(`${sel} --${k}: 规范=${d[k]} ↔ 源码=${s[k]}`);
  }
}
if (drift.length) {
  console.log(`发现 ${drift.length} 处 token 漂移：\n` + drift.join('\n'));
  process.exit(2);
}
console.log('无漂移：DESIGN-tailwind.css 与源码 tailwind-theme.css 关键 CSS 变量值全部一致');
