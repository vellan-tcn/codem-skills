// 首次登录态保存：弹出浏览器人工登录我方线上（飞书 SSO），脚本自动检测登录成功后保存 cookie
// 用法: node save-state.mjs    （登录进入平台页后自动保存并关闭；日志每 5s 输出当前 URL）
import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = dirname(fileURLToPath(import.meta.url));
const OURS = 'https://<your-domain>.feishuapp.com/app/app_17dyn9qdmww/dashboard';

const browser = await chromium.launch({ channel: 'msedge', headless: false });
const ctx = await browser.newContext({ viewport: { width: 1366, height: 900 } });
const page = await ctx.newPage();
await page.goto(OURS, { waitUntil: 'domcontentloaded' });
console.log('请在弹出的浏览器中完成飞书登录（进入「空调节能监控平台」页面后自动保存）...');

const save = async () => {
  mkdirSync(resolve(ROOT, 'storage'), { recursive: true });
  await ctx.storageState({ path: resolve(ROOT, 'storage/ours.json') });
  console.log('已保存 storage/ours.json，之后 node run.mjs cable 即可一键对比');
};
browser.on('disconnected', () => { console.log('浏览器已关闭'); process.exit(0); });

// 每 5s 输出当前 URL，检测到 aside（平台页标志）即保存；最多 10 分钟
const t0 = Date.now();
let saved = false;
while (Date.now() - t0 < 10 * 60 * 1000) {
  await page.waitForTimeout(5000);
  let url = '(unknown)';
  try { url = page.url(); } catch {}
  let hasAside = false;
  try { hasAside = (await page.locator('aside').count()) > 0; } catch {}
  console.log(`[${new Date().toLocaleTimeString()}] url=${url.slice(0, 90)} aside=${hasAside}`);
  if (hasAside) {
    await page.waitForTimeout(3000); // 等 cookie 稳定
    await save();
    saved = true;
    break;
  }
}
await browser.close();
if (saved) console.log('DONE');
else { console.log('超时未检测到登录成功，未保存'); process.exit(1); }
