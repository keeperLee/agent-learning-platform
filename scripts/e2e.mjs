#!/usr/bin/env node
/* ============================================================
   浏览器交互回归测试（零依赖，通过 CDP 驱动真实点击）
   用法：node scripts/e2e.mjs --base http://127.0.0.1:5173
   ------------------------------------------------------------
   退出码：0 通过 / 1 断言失败 / 2 环境无可用浏览器（调用方可跳过）
   可用 CHROME_PATH 指定浏览器可执行文件路径。

   覆盖的回归点：
   ① 点击右侧「本篇目录」应就地滚动，不能跳回首页
   ② 目录链接必须是完整路由，保证中键 / 复制链接可用
   ③ 直接打开带锚点的深链接应正确定位
   ④ 点击正文标题旁的 # 锚点应就地滚动
   ============================================================ */

import { spawn } from 'child_process';
import { existsSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';

const argBase = process.argv.indexOf('--base');
const BASE = (argBase > -1 ? process.argv[argBase + 1] : null) || process.env.E2E_BASE || 'http://127.0.0.1:5173';
const CHAPTER = (process.argv.indexOf('--chapter') > -1 ? process.argv[process.argv.indexOf('--chapter') + 1] : null) || 'c06';
const PORT = 9333 + (process.pid % 500);

const USE_COLOR = !process.env.NO_COLOR && process.stdout.isTTY !== false;
const paint = (s, c) => (USE_COLOR ? `${c}${s}\u001b[0m` : s);
const C = { red: '\u001b[31m', green: '\u001b[32m', yellow: '\u001b[33m', dim: '\u001b[2m', bold: '\u001b[1m' };

const ok = (b) => (b ? paint('✓', C.green) : paint('✗', C.red));

/* ---------------- 定位浏览器 ---------------- */
const CANDIDATES = [
  process.env.CHROME_PATH,
  'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
  'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
  'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
  'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe',
  '/usr/bin/google-chrome',
  '/usr/bin/google-chrome-stable',
  '/usr/bin/chromium',
  '/usr/bin/chromium-browser',
  '/snap/bin/chromium',
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
].filter(Boolean);

const BROWSER = CANDIDATES.find((p) => existsSync(p));
if (!BROWSER) {
  console.log(paint('\n  未找到 Chrome / Chromium / Edge，跳过浏览器交互测试。', C.yellow));
  console.log(paint('  如需运行，请设置环境变量 CHROME_PATH 指向浏览器可执行文件。\n', C.dim));
  process.exit(2);
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const chrome = spawn(BROWSER, [
  '--headless=new', '--disable-gpu', '--no-first-run', '--no-default-browser-check',
  '--disable-dev-shm-usage', '--no-sandbox',
  '--remote-debugging-port=' + PORT,
  '--user-data-dir=' + join(tmpdir(), 'agent-e2e-' + process.pid),
  '--window-size=1440,900',
  'about:blank'
], { stdio: 'ignore' });

let failed = 0;
function check(pass, label, detail = '') {
  if (!pass) failed++;
  console.log(`  ${ok(pass)} ${label}${detail ? paint('  ' + detail, C.dim) : ''}`);
}

/* 等待 DevTools 就绪 */
let targets = null;
for (let i = 0; i < 60; i++) {
  try {
    targets = await (await fetch(`http://127.0.0.1:${PORT}/json/list`)).json();
    if (targets.some((t) => t.type === 'page')) break;
  } catch (_) { /* 端口还没起来 */ }
  await sleep(250);
}
const page = targets?.find((t) => t.type === 'page');
if (!page) {
  chrome.kill();
  console.log(paint('\n  DevTools 端口未能就绪，跳过浏览器交互测试。', C.yellow));
  console.log(paint('  可尝试设置 CHROME_PATH 指定浏览器，或确认浏览器支持 --headless=new。\n', C.dim));
  process.exit(2);
}

/* ---------------- CDP 客户端 ---------------- */
const ws = new WebSocket(page.webSocketDebuggerUrl);
let seq = 0;
const pending = new Map();
ws.onmessage = (ev) => {
  const msg = JSON.parse(ev.data);
  if (msg.id && pending.has(msg.id)) { pending.get(msg.id)(msg); pending.delete(msg.id); }
};
const send = (method, params = {}) => new Promise((res) => {
  const id = ++seq;
  pending.set(id, res);
  ws.send(JSON.stringify({ id, method, params }));
});
await new Promise((r) => { ws.onopen = r; });
await send('Runtime.enable');
await send('Page.enable');

async function evaluate(expression) {
  const r = await send('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true });
  const ex = r.result?.exceptionDetails;
  if (ex) throw new Error(ex.exception?.description || ex.text || '页面脚本执行失败');
  return r.result?.result?.value;
}

async function goto(url, waitMs = 1500) {
  await send('Page.navigate', { url });
  await sleep(waitMs);
}

const WAIT_ARTICLE = `
  for (let i = 0; i < 80 && !document.querySelector('.article-body'); i++) await sleep(100);
`;

console.log('');
console.log(paint(`  浏览器交互回归测试 · ${BASE} · 章节 ${CHAPTER}`, C.bold));
console.log(paint('  ' + '─'.repeat(58), C.dim));

try {
  /* ---------- 场景 1：点击右侧「本篇目录」 ---------- */
  await goto(`${BASE}/#/chapter/${CHAPTER}`);
  const r1 = JSON.parse(await evaluate(`(async () => {
    const sleep = (ms) => new Promise(r => setTimeout(r, ms));
    ${WAIT_ARTICLE}
    const out = {};
    const links = [...document.querySelectorAll('#tocInner a')];
    out.tocCount = links.length;
    out.hrefsOk = links.every(a => (a.getAttribute('href') || '').startsWith('#/chapter/'));
    const target = links[Math.min(2, links.length - 1)];
    out.anchor = target?.dataset.anchor || null;
    const el = document.getElementById(out.anchor);
    out.topBefore = el ? Math.round(el.getBoundingClientRect().top) : null;
    target.click();
    await sleep(1400);
    out.topAfter = el ? Math.round(el.getBoundingClientRect().top) : null;
    out.hash = location.hash;
    out.onArticle = !!document.querySelector('.article-body');
    out.onHome = !!document.querySelector('.hero');
    out.active = document.querySelector('#tocInner a.is-active')?.dataset.anchor || null;
    return JSON.stringify(out);
  })()`));

  console.log('');
  console.log('  场景 1 · 点击右侧「本篇目录」');
  check(r1.tocCount > 0, `目录渲染出 ${r1.tocCount} 个条目`);
  check(r1.hrefsOk, '目录链接为完整路由（中键 / 复制链接可用）');
  check(r1.onArticle && !r1.onHome, '点击后仍停留在章节页，未跳回首页', `onArticle=${r1.onArticle} onHome=${r1.onHome}`);
  check(r1.hash.includes('#/chapter/'), '地址栏保持章节路由', r1.hash.slice(0, 60));
  check(r1.topAfter !== null && Math.abs(r1.topAfter - 78) < 8, '目标标题滚动到视口顶部附近', `${r1.topBefore}px → ${r1.topAfter}px`);
  check(r1.active === r1.anchor, '右侧目录高亮同步到当前小节');

  /* ---------- 场景 2：直接打开带锚点的深链接 ---------- */
  const anchorName = r1.anchor;
  await goto(`${BASE}/#/chapter/${CHAPTER}#${encodeURIComponent(anchorName)}`, 1900);
  const r2 = JSON.parse(await evaluate(`(async () => {
    const sleep = (ms) => new Promise(r => setTimeout(r, ms));
    ${WAIT_ARTICLE}
    await sleep(700);
    const el = document.getElementById(${JSON.stringify(anchorName)});
    const maxScroll = document.documentElement.scrollHeight - window.innerHeight;
    return JSON.stringify({
      onArticle: !!document.querySelector('.article-body'),
      onHome: !!document.querySelector('.hero'),
      top: el ? Math.round(el.getBoundingClientRect().top) : null,
      atBottom: window.scrollY >= maxScroll - 4
    });
  })()`));

  console.log('');
  console.log('  场景 2 · 直接打开带锚点的深链接（模拟复制链接后打开）');
  check(r2.onArticle && !r2.onHome, '渲染的是章节页而非首页');
  check(r2.top !== null && (Math.abs(r2.top - 78) < 8 || r2.atBottom),
    '锚点已定位', `距顶 ${r2.top}px${r2.atBottom ? '（页面已到底）' : ''}`);

  /* ---------- 场景 3：点击正文标题旁的 # 锚点 ---------- */
  await goto(`${BASE}/#/chapter/${CHAPTER}`);
  const r3 = JSON.parse(await evaluate(`(async () => {
    const sleep = (ms) => new Promise(r => setTimeout(r, ms));
    ${WAIT_ARTICLE}
    const a = document.querySelector('.article-body h2 .anchor');
    const href = a?.getAttribute('href') || null;
    a?.click();
    await sleep(1000);
    return JSON.stringify({
      href,
      onArticle: !!document.querySelector('.article-body'),
      onHome: !!document.querySelector('.hero'),
      hash: location.hash
    });
  })()`));

  console.log('');
  console.log('  场景 3 · 点击正文标题旁的 # 锚点');
  check(r3.href && r3.href.startsWith('#'), '锚点链接已渲染', String(r3.href));
  check(r3.onArticle && !r3.onHome, '点击后仍停留在章节页');
  check(r3.hash.includes('#/chapter/'), '地址栏更新为带锚点的章节路由', r3.hash.slice(0, 60));
} catch (err) {
  failed++;
  console.log('');
  console.log(`  ${paint('✗', C.red)} 测试执行出错：${err.message}`);
}

ws.close();
chrome.kill();

console.log('');
if (failed) {
  console.log(paint(`  ${failed} 项断言失败。`, C.red));
  console.log('');
  process.exit(1);
}
console.log(paint('  全部通过。', C.green));
console.log('');
process.exit(0);
