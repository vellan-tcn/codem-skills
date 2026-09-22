// 响应式溢出自查机制（红线 8 配套扩展）
// 用法：node overflow.mjs [--base <url>] [--routes r1,r2] [--viewports all|desktop|mobile]
// 检测：1) 页面横向滚动 2) 元素超出视口右缘 3) 容器内文字被裁切(scrollWidth>clientWidth)
// 输出：reports/overflow-<ts>.md，有问题退出码 2

import { chromium } from 'playwright';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const BASE = process.env.BASE_URL || 'https://<your-domain>.feishuapp.com/app/app_17dyn9qdmww';
const USER = process.env.OS_USER || 'admin';
const PASS = process.env.OS_PASS || 'admin123';

const ROUTES = (process.argv.includes('--routes')
  ? process.argv[process.argv.indexOf('--routes') + 1].split(',')
  : ['/ioserver/ahu-overview', '/ioserver/devices', '/ioserver/gateways', '/ioserver/org', '/realtime', '/alarms', '/energy', '/dashboard']);

const VIEWPORTS = {
  desktop: [{ name: 'desktop-1366', width: 1366, height: 768 }, { name: 'small-laptop-1024', width: 1024, height: 768 }],
  tablet: [{ name: 'tablet-768', width: 768, height: 1024 }],
  mobile: [{ name: 'mobile-390', width: 390, height: 844 }],
};
const mode = process.argv.includes('--viewports') ? process.argv[process.argv.indexOf('--viewports') + 1] : 'all';
const viewports = mode === 'all' ? [...VIEWPORTS.desktop, ...VIEWPORTS.tablet, ...VIEWPORTS.mobile] : VIEWPORTS[mode];

async function login(p) {
  await p.goto(BASE + '/login', { waitUntil: 'domcontentloaded' });
  await p.waitForTimeout(4500);
  await p.evaluate(() => { const el = [...document.querySelectorAll('button')].find(x => (x.textContent || '').includes('账号密码登录')); if (el) el.click(); });
  await p.waitForTimeout(2000);
  const u = await p.$('input[autocomplete=username], input[name=username]');
  const pw = await p.$('input[type=password]');
  if (u && pw) {
    await u.fill(USER); await pw.fill(PASS);
    await p.evaluate(() => { const btn = [...document.querySelectorAll('button')].find(x => /登\s*录/.test(x.textContent || '')); if (btn) btn.click(); });
    await p.waitForTimeout(7000);
  }
}

const issues = [];

for (const vp of viewports) {
  const browser = await chromium.launch({ channel: 'msedge' });
  const ctx = await browser.newContext({ viewport: { width: vp.width, height: vp.height } });
  const p = await ctx.newPage();
  try { await login(p); } catch (e) { console.error('登录失败:', e.message); await browser.close(); process.exit(1); }
  for (const route of ROUTES) {
    try {
      await p.goto(BASE + route, { waitUntil: 'domcontentloaded', timeout: 20000 });
      await p.waitForTimeout(6000);
      const res = await p.evaluate((w) => {
        const de = document.documentElement;
        const out = { pageOverflowX: de.scrollWidth - de.clientWidth, els: [] };
        if (out.pageOverflowX > 1) out.pageOverflowX = de.scrollWidth;
        // 找超出视口右缘的可见元素（顶层明细，忽略父容器重复）
        const all = [...document.querySelectorAll('body *')].filter(e => {
          if (e.offsetParent === null) return false;
          const r = e.getBoundingClientRect();
          return r.width > 0 && r.right > w + 2 && r.left < w; // 跨过右缘
        });
        // 只保留最内层（子元素已含的跳过）——取有直接文本节点的
        // 排除：位于可横滚祖先容器内的元素（卡内横向滚动属合理形态，非页面溢出）
        const inScroller = (e) => { let n = e.parentElement; while (n && n !== document.body) { const cs = getComputedStyle(n); if (/(auto|scroll)/.test(cs.overflowX) && n.scrollWidth > n.clientWidth) return true; n = n.parentElement; } return false; };
        const leaf = all.filter(e => [...e.childNodes].some(n => n.nodeType === 3 && n.textContent.trim()) && !inScroller(e));
        leaf.slice(0, 12).forEach(e => {
          const r = e.getBoundingClientRect();
          const cs = getComputedStyle(e);
          out.els.push({ text: (e.textContent || '').trim().slice(0, 30), tag: e.tagName, cls: (e.className || '').toString().slice(0, 60), right: Math.round(r.right), overBy: Math.round(r.right - w), whiteSpace: cs.whiteSpace, minW: cs.minWidth });
        });
        // 容器内裁切：scrollWidth>clientWidth 且 overflow hidden 的文本容器
        const clipped = [...document.querySelectorAll('div,span,td,th')].filter(e => {
          if (e.offsetParent === null || e.children.length > 3) return false;
          const cs = getComputedStyle(e);
          return cs.overflowX === 'hidden' && e.scrollWidth - e.clientWidth > 4 && (e.textContent || '').trim().length > 0;
        }).slice(0, 6).map(e => ({ text: (e.textContent || '').trim().slice(0, 30), cls: (e.className || '').toString().slice(0, 60), clip: e.scrollWidth - e.clientWidth }));
        out.clipped = clipped;
        return out;
      }, vp.width);
      if (res.pageOverflowX > 1 || res.els.length || (res.clipped || []).length) {
        issues.push({ vp: vp.name, route, ...res });
      }
      console.log(`[${vp.name}] ${route}: ${res.pageOverflowX > 1 ? '页面横向溢出 ' + res.pageOverflowX + 'px' : '无页面溢出'} | 越界元素 ${res.els.length} | 裁切 ${((res.clipped || [])).length}`);
    } catch (e) {
      console.log(`[${vp.name}] ${route}: 检测失败 ${e.message.split('\n')[0]}`);
    }
  }
  await browser.close();
}

const ts = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
const repDir = path.join(__dirname, 'reports');
fs.mkdirSync(repDir, { recursive: true });
const repFile = path.join(repDir, `overflow-${ts}.md`);
let md = `# 响应式溢出自查报告\n\n- 时间：${new Date().toLocaleString('zh-CN')}\n- 视口：${viewports.map(v => `${v.name}(${v.width}x${v.height})`).join(', ')}\n- 路由：${ROUTES.join(', ')}\n- 发现问题：**${issues.length} 组**\n\n`;
issues.forEach(i => {
  md += `## [${i.vp}] ${i.route}\n`;
  if (i.pageOverflowX > 1) md += `- ⚠️ 页面横向溢出：scrollWidth=${i.pageOverflowX}\n`;
  i.els.forEach(e => md += `- 越界 <${e.tag.toLowerCase()}> 「${e.text}」超出右缘 ${e.overBy}px | class=${e.cls} | white-space=${e.whiteSpace}\n`);
  (i.clipped || []).forEach(c => md += `- 裁切 「${c.text}」被裁 ${c.clip}px | class=${c.cls}\n`);
  md += '\n';
});
fs.writeFileSync(repFile, md);
console.log(`\n报告：${repFile}`);
if (issues.length) { console.log(`发现 ${issues.length} 组溢出问题`); process.exit(2); }
console.log('全部通过，无溢出问题');
