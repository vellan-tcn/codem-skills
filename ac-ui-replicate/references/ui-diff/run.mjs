// UI 自动对比机制（g_062 方案B）：参考站 vs 我方线上，框架全指标 DOM diff
// 用法：
//   node run.mjs cable            # 电缆(母线测温)参考站 vs 我方线上
//   node run.mjs usr              # 有人云控制台 vs 我方线上（需先保存登录态 storage/usr.json）
//   node run.mjs cable --shots    # 附带整页截图
// 红线依据：.codem/memory/usr-ui-redlines.md「自动对比机制」节（框架 5 类全指标）
import { chromium } from 'playwright';
import { mkdirSync, writeFileSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = dirname(fileURLToPath(import.meta.url));
const OURS = 'https://<your-domain>.feishuapp.com/app/app_17dyn9qdmww';
const OURS_STORAGE = resolve(ROOT, 'storage/ours.json'); // 首次需 node save-state.mjs 人工登录一次生成

const PROFILES = {
  // 电缆/母线测温参考系统（框架对齐基准）
  cable: {
    name: '电缆母线测温参考站',
    base: 'http://118.195.217.64',
    login: { user: process.env.CABLE_USER, pass: process.env.CABLE_PASS, path: '/temperature-overview' },
    pages: [
      { ref: '/temperature-overview', ours: '/dashboard', label: '总览' },
      // 后续页面按需补充：{ ref: '/xxx', ours: '/ioserver/xxx' }
    ],
  },
  // 有人云控制台（交互态复刻基准；登录态需先手动保存）
  usr: {
    name: '有人云控制台',
    base: 'https://mp.usr.cn',
    storageState: resolve(ROOT, 'storage/usr.json'),
    pages: [
      // 有人云详情页 vs 我方 ioserver 设备与点位页（URL 路径按实际设备号补全）
      // { ref: '/#/cloud/device/view?cusdeviceNo=xxx', ours: '/ioserver/device-points', label: '设备变量详情' },
    ],
  },
};

// 凭证来自环境变量，分发包内禁止明文口令（终审 P0 修复，2026-09-21）。
// 获取：node ../decrypt-credentials.mjs <密钥hex文件> 解密后设置；本机亦可在 .codem/memory/usr-credentials.md 查到。
if (process.argv.includes('cable') && !(process.env.CABLE_USER && process.env.CABLE_PASS)) {
  console.error('缺少参考站凭证：请先设置环境变量 CABLE_USER / CABLE_PASS（经 references/decrypt-credentials.mjs 解密获得；本机可从 .codem/memory/usr-credentials.md 读取）');
  process.exit(1);
}

// 框架全指标抓取（两站通用；对应红线清单 5 类）
const METRICS_JS = `() => {
  const cv = document.createElement('canvas').getContext('2d');
  let probeEl = null;
  const cc = (c) => { try { cv.fillStyle = c; return cv.fillStyle } catch { return c } };
  const pc = (m) => { try {
    if (!probeEl) { probeEl = document.createElement('span'); probeEl.style.display = 'none'; document.body.appendChild(probeEl); }
    probeEl.style.color = ''; probeEl.style.color = m;
    return getComputedStyle(probeEl).color || m;
  } catch { return m } };
  const normColorStr = (s) => String(s)
    .replace(/color[(]srgb[^)]*[)]|rgba?[(][^)]*[)]|lab[(][^)]*[)]|oklab[(][^)]*[)]|oklch[(][^)]*[)]/g, (m) => cc(pc(m)))
    .replace(/rgba[(]0, 0, 0, 0[)] 0px 0px 0px 0px, ?/g, '');
  const cs = (e) => getComputedStyle(e);
  const pick = (e, props) => { if (!e) return null; const c = cs(e), b = e.getBoundingClientRect();
    const o = { _box: { l: Math.round(b.left), t: Math.round(b.top), w: Math.round(b.width), h: Math.round(b.height) } };
    for (const p of props) o[p] = ['color','backgroundColor','border','borderTopColor','borderBottomColor','borderRightColor','boxShadow'].includes(p) ? normColorStr(c[p]) : c[p]; return o; };
  const aside = document.querySelector('aside');
  const header = document.querySelector('header');
  const main = document.querySelector('[class*=app-shell-content]') || document.querySelector('main');
  const brand = aside && aside.firstElementChild;
  const logo = brand && (brand.querySelector('svg,img,[class*=rounded]'));
  // 顶栏当前页标签：header 内带圆角背景的 span
  const pill = header && [...header.querySelectorAll('span')].find(s => {
    const c = cs(s); return parseFloat(c.borderRadius) > 6 && c.backgroundColor !== 'rgba(0, 0, 0, 0)';
  });
  // 菜单项：aside 内 button/a，取选中(有底色)与普通各一
  const items = aside ? [...aside.querySelectorAll('button,a')] : [];
  const sel = items.find(e => { const b = cs(e).backgroundColor; return b && b !== 'rgba(0, 0, 0, 0)'; });
  const norm = items.find(e => e.textContent.trim() && normColorStr(cs(e).backgroundColor) === 'rgba(0, 0, 0, 0)' && e.textContent.trim().length <= 8 && Math.round(e.getBoundingClientRect().height) >= 20 && Math.round(e.getBoundingClientRect().height) <= 30 && parseFloat(cs(e).fontSize) >= 13);
  const firstCard = main && main.querySelector('[class*=rounded-xl],[class*=rounded-2xl],[class*=card]');
  const rootStyle = getComputedStyle(document.documentElement);
  return {
    aside: aside && { ...pick(aside, ['padding', 'backgroundColor', 'borderRightWidth', 'borderRightColor', 'boxShadow']),
      brandCls: brand ? brand.className.toString().slice(0, 60) : null,
      brandTop: brand ? Math.round(brand.getBoundingClientRect().top) : null,
      brandH: brand ? Math.round(brand.getBoundingClientRect().height) : null,
      logoSize: logo ? Math.round(logo.getBoundingClientRect().width) + 'x' + Math.round(logo.getBoundingClientRect().height) : null },
    header: header && pick(header, ['height', 'padding', 'borderBottomWidth', 'borderBottomColor']),
    pill: pick(pill, ['borderRadius', 'height', 'backgroundColor', 'border', 'fontSize', 'fontWeight', 'color']),
    menu: { sel: pick(sel, ['backgroundColor', 'borderRadius', 'height', 'padding', 'color']),
            norm: pick(norm, ['height', 'padding', 'color', 'borderRadius']),
            panelW: aside && aside.firstElementChild ? null : null },
    main: main && { ...pick(main, ['padding', 'backgroundColor']),
      firstCardLeft: firstCard ? Math.round(firstCard.getBoundingClientRect().left) : null,
      firstCard: pick(firstCard, ['borderRadius', 'borderTopWidth', 'borderTopColor', 'boxShadow']) },
    theme: { radius: rootStyle.getPropertyValue('--radius').trim() || null,
             primary: rootStyle.getPropertyValue('--primary').trim() || null },
    menuPanel: (() => { if (!aside) return null; const it = items[1] || items[0]; if (!it) return null;
      const b = it.getBoundingClientRect(); return { left: Math.round(b.left), w: Math.round(b.width) }; })(),
  };
}`;

function flatten(obj, prefix = '', out = {}) {
  if (obj && typeof obj === 'object' && !Array.isArray(obj)) {
    for (const [k, v] of Object.entries(obj)) flatten(v, prefix ? `${prefix}.${k}` : k, out);
  } else out[prefix] = obj;
  return out;
}

const norm = (v) => {
  if (v == null) return '—';
  let s = String(v).trim();
  s = s.replace(/\s+/g, ' ');
  // 任意字符串中的颜色 token 逐个归一为 rgba(r, g, b, a)
  const hex2rgba = (h) => { const n = h.slice(1); const f = n.length === 3 ? n.split('').map(c => c + c).join('') : n;
    return `rgba(${parseInt(f.slice(0, 2), 16)}, ${parseInt(f.slice(2, 4), 16)}, ${parseInt(f.slice(4, 6), 16)}, 1)`; };
  const LAB = {
    'lab(91.7353 -0.998765 -4.76968)': 'rgba(226, 232, 240, 1)',       // slate-200
    'lab(98.1434 -0.369519 -1.05966)': 'rgba(248, 250, 252, 1)',       // slate-50
    'lab(44.0605 29.0279 -86.0352)': 'rgba(37, 99, 235, 1)',           // blue-600
    'lab(65.5349 -2.25151 -14.5072)': 'rgba(71, 85, 105, 1)',          // slate-600
    'lab(35.5623 -1.74978 -15.4316)': 'rgba(51, 65, 85, 1)',           // slate-700
    'lab(26.9569 -1.47016 -15.6993)': 'rgba(30, 41, 59, 1)',           // slate-800
    'oklab(0.870633 -0.00299892 -0.0628489 / 0.85)': 'rgba(191, 219, 254, 0.85)', // blue-200/85
    'oklab(0.928998 -0.00326243 -0.0125641 / 0.88)': 'rgba(226, 232, 240, 0.88)', // slate-200/88
    'lab(48.0876 -2.03595 -16.5814)': 'rgba(55, 65, 81, 1)',                   // gray-700
  };
  s = s
    .replace(/#[0-9a-fA-F]{6}\b|#[0-9a-fA-F]{3}\b/g, (m) => hex2rgba(m))
    .replace(/color\(srgb ([\d.]+) ([\d.]+) ([\d.]+)(?: \/ ([\d.]+))?\)/g, (_, r, g, b, a) =>
      `rgba(${Math.round(r * 255)}, ${Math.round(g * 255)}, ${Math.round(b * 255)}, ${a !== undefined ? a : 1})`)
    .replace(/lab\([^)]*\)|oklab\([^)]*\)|oklch\([^)]*\)/g, (m) => LAB[m] || m)
    .replace(/rgba\((\d+), (\d+), (\d+)\)/g, 'rgba($1, $2, $3, 1)');
  // 胶囊圆角等效：≥999px 一律视为 pill
  const px = s.match(/^([\d.e+]+)px$/);
  if (px && parseFloat(px[1]) >= 999) s = 'pill';
  if (/^(rgba\(0, 0, 0, 0(, 0)?\)|transparent)$/.test(s)) s = 'transparent';
  return s;
};
const equivalent = (k, a, b) => {
  const pair = ['transparent', 'rgba(248, 250, 252, 1)'];
  if (k === 'main.backgroundColor' && ((a === pair[0] && b === pair[1]) || (a === pair[1] && b === pair[0]))) return true;
  return false;
};

async function grab(page, url, { login, storageState } = {}) {
  await page.goto(url, { waitUntil: 'domcontentloaded' });
  if (login) {
    try {
      await page.waitForSelector('input[type=password]', { timeout: 5000 });
      const inputs = page.locator('input');
      const n = await inputs.count();
      for (let i = 0; i < n; i++) {
        const t = await inputs.nth(i).getAttribute('type');
        if (t === 'password') await inputs.nth(i).fill(login.pass);
        else if (t === 'text' || !t) await inputs.nth(i).fill(login.user);
      }
      await page.locator('button', { hasText: /登/ }).first().click();
      await page.waitForURL((u) => !u.href.includes('/login'), { timeout: 15000 });
      await page.goto(url, { waitUntil: 'domcontentloaded' });
    } catch (e) { /* 已登录 */ }
  }
  await page.waitForTimeout(2500);
  // 等内容卡片渲染完（参考站卡片异步加载，不等会抓成 null）
  await page.waitForSelector('main [class*=rounded-xl], main [class*=rounded-2xl], [class*=app-shell-content] [class*=rounded-xl]', { timeout: 10000 }).catch(() => {});
  await page.waitForTimeout(500);
  const m = await page.evaluate(eval(METRICS_JS));
  if (!m.aside) throw new Error(`抓取失败(无 aside): ${page.url()} — 可能未登录或页面结构变化`);
  return m;
}

const [profileKey, ...flags] = process.argv.slice(2);
const prof = PROFILES[profileKey];
if (!prof) { console.error('用法: node run.mjs <cable|usr> [--shots]'); process.exit(1); }
if (profileKey === 'usr' && prof.pages.length === 0) {
  console.error('usr profile 未配置页面映射（有人云详情页 URL 需按设备号补全），且需先保存登录态：见 storage/README');
  process.exit(1);
}

const browser = await chromium.launch({ channel: 'msedge' });
const vp = { viewport: { width: 1366, height: 900 } };
const refCtx = await browser.newContext({ ...vp, ...(prof.storageState && existsSync(prof.storageState) ? { storageState: prof.storageState } : {}) });
if (!existsSync(OURS_STORAGE)) {
  console.error(`我方线上登录态缺失（飞书 SSO 无法自动登录）。请先运行一次: node save-state.mjs`);
  process.exit(1);
}
const ourCtx = await browser.newContext({ ...vp, storageState: OURS_STORAGE });

const report = [`# UI 自动对比报告 — ${prof.name}`, `生成: ${new Date().toLocaleString('zh-CN')}`, ''];
let diffCount = 0;

for (const p of prof.pages) {
  const refPage = await refCtx.newPage();
  const ref = await grab(refPage, prof.base + p.ref, { login: prof.login });
  await refPage.close();
  const ourPage = await ourCtx.newPage();
  const our = await grab(ourPage, OURS + p.ours, {});
  await ourPage.close();

  const rf = flatten(ref), of = flatten(our);
  // 噪音过滤：位置随内容变化（不比对）、主题变量单边缺失不比对
  const skip = [/menu\.(sel|norm)\._box\.(t|h)/, /menu\.norm\._box\.(l|w)/, /_box\.t$/, /^theme\./, /brandCls/, /main\.firstCard\._box\.(h|w)/, /^menuPanel\./, /^pill\._box\.l$/, /^menu\.norm\.height$/];
  const keys = [...new Set([...Object.keys(rf), ...Object.keys(of)])].sort().filter(k => !skip.some(r => r.test(k)));
  report.push(`## ${p.label}（${p.ref} vs ${p.ours}）`, '', '| 指标 | 参考站 | 我方 | 一致 |', '|---|---|---|---|');
  let n = 0;
  for (const k of keys) {
    const a = norm(rf[k]), b = norm(of[k]);
    const same = a === b || (a === '—' && b === '—') || equivalent(k, a, b);
    if (!same) n++;
    report.push(`| ${k} | ${a} | ${b} | ${same ? '✅' : '❌'} |`);
  }
  diffCount += n;
  report.push('', `差异项：**${n}**`, '');
  if (flags.includes('--shots')) {
    mkdirSync(resolve(ROOT, 'reports/shots'), { recursive: true });
    for (const [tag, url, lo, c] of [['ref', prof.base + p.ref, prof.login, refCtx], ['ours', OURS + p.ours, null, ourCtx]]) {
      const pg = await c.newPage();
      await grab(pg, url, { login: lo });
      await pg.screenshot({ path: resolve(ROOT, `reports/shots/${p.label}-${tag}.png`), fullPage: false });
      await pg.close();
    }
  }
}
await browser.close();

mkdirSync(resolve(ROOT, 'reports'), { recursive: true });
const file = resolve(ROOT, `reports/${profileKey}-${Date.now()}.md`);
writeFileSync(file, report.join('\n'), 'utf8');
console.log(report.slice(0, 6).join('\n'));
console.log(`\n=== 汇总: 差异项 ${diffCount} | 报告: ${file} ===`);
process.exit(diffCount > 0 ? 2 : 0);
