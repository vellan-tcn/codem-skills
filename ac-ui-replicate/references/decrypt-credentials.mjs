#!/usr/bin/env node
// ac-ui-replicate 凭证解密：密钥不在 skill 包内（防分发泄露）
// 用法：
//   node decrypt-credentials.mjs <密钥hex文件路径> [credentials.enc 路径（默认同目录）] [--out <输出文件路径>]
//   node decrypt-credentials.mjs <密钥hex文件路径> --print-account-only   # 只出账号不出密码
// 安全默认：明文不落 stdout（防会话日志残留），写入临时文件并只打印文件路径，调用方读取后应自行删除。
import { readFileSync, writeFileSync } from 'node:fs';
import { createDecipheriv } from 'node:crypto';
import { tmpdir } from 'node:os';
import { dirname, resolve, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const dir = dirname(fileURLToPath(import.meta.url));
const argv = process.argv.slice(2);
const keyFile = argv.find(a => !a.startsWith('--') && a !== (argv[argv.indexOf('--out') + 1]));
if (!keyFile) { console.error('用法: node decrypt-credentials.mjs <密钥hex文件路径> [--out <路径> | --print-account-only]'); process.exit(1); }
const printAccountOnly = argv.includes('--print-account-only');
const outIdx = argv.indexOf('--out');
const encPath = argv.find((a, i) => !a.startsWith('--') && i > 0 && a !== keyFile && i !== outIdx + 1);

const key = Buffer.from(readFileSync(keyFile, 'utf8').trim(), 'hex');
const { alg, iv, data } = JSON.parse(readFileSync(resolve(dir, encPath || 'credentials.enc'), 'utf8'));
if (alg !== 'aes-256-gcm') throw new Error('unknown alg');
const buf = Buffer.from(data, 'base64');
const tag = buf.subarray(buf.length - 16);
const ct = buf.subarray(0, buf.length - 16);
const d = createDecipheriv('aes-256-gcm', key, Buffer.from(iv, 'base64'));
d.setAuthTag(tag);
const plain = Buffer.concat([d.update(ct), d.final()]).toString('utf8');

if (printAccountOnly) {
  // 半脱敏：只打印账号行，密码不出现在输出中
  const m = plain.match(/(账号|account|user|username)\s*[:=]\s*(\S+)/i);
  if (m) console.log(m[2]);
  else { console.error('未能解析账号字段（格式未知），拒绝全文打印；请用默认临时文件模式'); process.exit(1); }
  process.exit(0);
}

const out = outIdx >= 0 ? argv[outIdx + 1] : join(tmpdir(), `ac-ui-creds-${process.pid}-${Date.now()}.txt`);
writeFileSync(out, plain, { encoding: 'utf8', mode: 0o600 });
console.log(`凭证已写入（读取后请删除）：${out}`);
