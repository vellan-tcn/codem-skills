#!/usr/bin/env node
// ac-ui-design MCP server — 零依赖 node stdio（JSON-RPC over stdio，纯 node 内置模块）
// 数据：mcp/data/{tokens,components,patterns}.json（由 gen-data.mjs 预生成）
// 目标：省 token —— 200 个结构化 token / 42 组件契约 / 9 页面模式按需查询，代替整读 34KB 文档。
import { readFileSync, existsSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const dataDir = resolve(here, 'data');
const read = (f) => JSON.parse(readFileSync(resolve(dataDir, f), 'utf8'));
const tokens = read('tokens.json');
const componentsDb = read('components.json');
const patternsDb = read('patterns.json');

// ---------- 工具实现 ----------
// 扁平化 tokens.json → [{path:'colors.light.primary', value:'oklch(...)'}]
function flatten(obj, prefix = '', out = []) {
  for (const [k, v] of Object.entries(obj)) {
    const p = prefix ? `${prefix}.${k}` : k;
    if (k.startsWith('_')) continue;
    if (v && typeof v === 'object' && !Array.isArray(v)) flatten(v, p, out);
    else out.push({ path: p, value: Array.isArray(v) ? JSON.stringify(v) : String(v) });
  }
  return out;
}
const flat = flatten(tokens).filter((t) => t.path !== 'meta.name' && t.path !== 'meta.product' && t.path !== 'meta.stack');

function queryToken(args = {}) {
  const { name, page, context } = args;
  if (!name && !page && !context) {
    const cats = Object.keys(tokens).filter((k) => k !== '_readme' && k !== 'meta')
      .map((c) => {
        const sub = Object.keys(tokens[c]).filter((s) => !s.startsWith('_'));
        return `${c}（${sub.join('/')}，共 ${flatten(tokens[c]).length} 值）`;
      });
    return `ac-ui token 分类清单（${flat.length} 个值）。用 name=精确/子串查询（如 name=primary、name=colors.light.primary），可选 page=light|dark|dark_page 过滤色板分区：\n` + cats.join('\n');
  }
  let hits = flat;
  if (name) {
    const n = String(name).toLowerCase();
    hits = hits.filter((t) => t.path.toLowerCase().includes(n));
  }
  if (page) hits = hits.filter((t) => t.path.toLowerCase().includes(String(page).replace('-', '_').replace('-', '_')));
  if (context) hits = hits.filter((t) => t.path.toLowerCase().includes(String(context).toLowerCase()) || t.value.toLowerCase().includes(String(context).toLowerCase()));
  if (!hits.length) return `未匹配到 token（name=${name || '-'} page=${page || '-'}）。可先无参调用看分类清单。`;
  const zoneNote = '适用分区：light/dark=主平台语义 token；dark_page=暗色页（monitor/analysis/gate/login/接入管理）绝对值，不接语义 token；slate_pinned 必须钉回 hex。';
  return hits.slice(0, 60).map((t) => `${t.path} = ${t.value}`).join('\n') + (hits.length > 60 ? `\n…（共 ${hits.length} 条，仅显示前 60，请用更精确的 name）` : '') + '\n' + zoneNote;
}

function getComponentContract(args = {}) {
  const name = String(args.name || '').toLowerCase();
  if (!name) return `用法：get_component_contract(name, zone?)。name 可选值：\n` + componentsDb.components.map((c) => c.name).join(', ');
  const comp = componentsDb.components.find((c) => c.name.toLowerCase() === name)
    || componentsDb.components.find((c) => c.name.toLowerCase().replace(/-/g, '') === name.replace(/-/g, ''));
  if (!comp) return `未找到组件「${args.name}」。可用组件见无参调用。`;
  if (args.zone && !['main', 'ioserver'].includes(args.zone)) return 'zone 只支持 main / ioserver。';
  let out = `【${comp.name}】分区：${comp.section}（zone: ${comp.zone}）\n用途：${comp.purpose || '-'}\n`;
  if (comp.contract) {
    for (const [k, v] of Object.entries(comp.contract)) {
      if (k === 'zone_rules') continue;
      out += `${k}: ${typeof v === 'object' ? JSON.stringify(v) : v}\n`;
    }
    const zr = comp.contract.zone_rules;
    if (zr) out += args.zone ? `分区契约（${args.zone}）: ${zr[args.zone] || '该组件无 ' + args.zone + ' 区差异规则'}\n` : `分区契约: 主平台=${zr.main}；IOServer=${zr.ioserver}\n`;
  } else out += '（该组件无独立契约条目，见用途描述；通用规则见下）\n';
  out += `\n通用前提：${componentsDb.ui_copy_note}\n业务组件强约束：${JSON.stringify(componentsDb.business_constraint)}`;
  return out;
}

function getPagePattern(args = {}) {
  const type = String(args.type || '');
  if (!type) return '用法：get_page_pattern(type)。可选：' + Object.keys(patternsDb.patterns).join(' / ');
  const p = patternsDb.patterns[type];
  if (!p) return `未知模式「${type}」。可选：${Object.keys(patternsDb.patterns).join(' / ')}`;
  let out = `【${p.title}】\n骨架：\n` + p.skeleton.map((s) => '- ' + s).join('\n') + '\n';
  if (p.rules.length) out += '关键规则：\n' + p.rules.map((s) => '- ' + s).join('\n') + '\n';
  if (p.components.length) out += '涉及组件：' + p.components.join(', ');
  return out;
}

// ---------- check_drift：内联 references/check-drift.mjs 逻辑 ----------
function checkDrift() {
  const designPath = resolve(here, '../references/DESIGN-tailwind.css');
  const srcPath = resolve(here, '../../../..', 'app/client/src/tailwind-theme.css');
  const parseBlock = (css, sel) => {
    const start = css.indexOf(sel);
    if (start < 0) return {};
    const open = css.indexOf('{', start), close = css.indexOf('}', open);
    const out = {};
    for (const m of css.slice(open + 1, close).matchAll(/--([\w-]+)\s*:\s*([^;]+);/g)) out[m[1]] = m[2].replace(/\s+/g, ' ').trim();
    return out;
  };
  const norm = (v) => v.toLowerCase().replace(/\s+/g, '').replace(/([,(])\.(\d)/g, '$10.$2');
  let design, src;
  try { design = readFileSync(designPath, 'utf8'); src = readFileSync(srcPath, 'utf8'); }
  catch (e) { return `文件读取失败：${e.message}\n  规范：${designPath}\n  源码：${srcPath}`; }
  const drift = [];
  for (const sel of [':root', '.dark']) {
    const d = parseBlock(design, sel), s = parseBlock(src, sel);
    for (const k of Object.keys(d)) {
      if (s[k] === undefined) continue; // 源码侧未定义该 token 不算值漂移
      if (norm(d[k]) !== norm(s[k])) drift.push(`${sel} --${k}: 规范=${d[k]} ↔ 源码=${s[k]}`);
    }
  }
  return drift.length ? `发现 ${drift.length} 处 token 漂移（漂移时以源码为准并回写规范）：\n` + drift.join('\n') : '无漂移：DESIGN-tailwind.css 与源码 tailwind-theme.css 关键 CSS 变量值全部一致';
}

const TOOLS = {
  query_token: {
    description: '查询 ac-ui 设计 token（色值/字号/圆角/间距/阴影/动效/状态文案）。无参返回分类清单；传 name（如 primary、colors.light.primary、radius）返回精确值与适用分区。~200 token 代替读 34KB 文档。',
    inputSchema: { type: 'object', properties: { name: { type: 'string', description: 'token 名或路径子串（primary/radius/shadows/sidebar…）' }, page: { type: 'string', description: 'light | dark | dark_page' }, context: { type: 'string', description: '附加上下文子串过滤' } } }
  },
  get_component_contract: {
    description: '按名称返回组件契约（class/尺寸/状态/定制点，源码原文）。zone=main|ioserver 时附该分区差异规则（两套控件风格体系勿混用）。',
    inputSchema: { type: 'object', properties: { name: { type: 'string', description: '组件名（button/card/select/table…），无参返回可用清单' }, zone: { type: 'string', enum: ['main', 'ioserver'] } }, required: ['name'] }
  },
  get_page_pattern: {
    description: '返回页面模式模板（骨架/关键规则/涉及组件）。type: list/detail/form-dialog/chart/dark-page/login/realtime/process-diagram/appshell。',
    inputSchema: { type: 'object', properties: { type: { type: 'string', description: 'list|detail|form-dialog|chart|dark-page|login|realtime|process-diagram|appshell' } }, required: ['type'] }
  },
  check_drift: {
    description: '检测 DESIGN-tailwind.css（规范）vs app/client/src/tailwind-theme.css（源码）的 CSS 变量漂移，返回漂移清单（漂移时以源码为准并回写规范）。',
    inputSchema: { type: 'object', properties: {} }
  }
};
const handlers = { query_token: queryToken, get_component_contract: getComponentContract, get_page_pattern: getPagePattern, check_drift: checkDrift };

// ---------- JSON-RPC over stdio（按行分隔，兼容 \r\n）----------
function send(obj) { process.stdout.write(JSON.stringify(obj) + '\n'); }
let buf = '';
process.stdin.setEncoding('utf8');
process.stdin.on('data', (chunk) => {
  buf += chunk;
  let idx;
  while ((idx = buf.indexOf('\n')) >= 0) {
    const line = buf.slice(0, idx).trim();
    buf = buf.slice(idx + 1);
    if (!line) continue;
    let msg;
    try { msg = JSON.parse(line); } catch { continue; }
    handle(msg);
  }
});
process.stdin.on('end', () => process.exit(0));

function handle(msg) {
  const { id, method, params } = msg;
  if (method === 'initialize') {
    send({ jsonrpc: '2.0', id, result: { protocolVersion: params?.protocolVersion || '2024-11-05', capabilities: { tools: {} }, serverInfo: { name: 'ac-ui-design', version: '1.0.0' } } });
  } else if (method === 'notifications/initialized' || method === 'initialized') {
    // notification，无需响应
  } else if (method === 'tools/list') {
    send({ jsonrpc: '2.0', id, result: { tools: Object.entries(TOOLS).map(([n, t]) => ({ name: n, description: t.description, inputSchema: t.inputSchema })) } });
  } else if (method === 'tools/call') {
    const name = params?.name;
    try {
      const text = handlers[name] ? handlers[name](params?.arguments || {}) : `未知工具：${name}`;
      send({ jsonrpc: '2.0', id, result: { content: [{ type: 'text', text }] } });
    } catch (e) {
      send({ jsonrpc: '2.0', id, result: { content: [{ type: 'text', text: `工具执行出错：${e.message}` }], isError: true } });
    }
  } else if (method === 'ping') {
    send({ jsonrpc: '2.0', id, result: {} });
  } else if (id !== undefined) {
    send({ jsonrpc: '2.0', id, error: { code: -32601, message: `method not found: ${method}` } });
  }
}
