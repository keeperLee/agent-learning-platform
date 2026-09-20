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

// 全局 WebSocket 自 Node 22 起才提供；低版本直接跳过，避免硬失败
if (typeof WebSocket === 'undefined') {
  console.log(paint(`\n  当前 Node ${process.version} 不提供全局 WebSocket（需要 Node ≥ 22），跳过浏览器交互测试。`, C.yellow));
  console.log(paint('  可升级 Node 后重试；其余检查不受影响。\n', C.dim));
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

  /* ---------- 场景 4：更新日志入口 ---------- */
  await goto(`${BASE}/#/chapter/${CHAPTER}`);
  const r4 = JSON.parse(await evaluate(`(async () => {
    const sleep = (ms) => new Promise(r => setTimeout(r, ms));
    ${WAIT_ARTICLE}
    const out = {};
    const btn = document.getElementById('changelogToggle');
    out.btnText = btn?.textContent?.trim() || null;
    out.dotBefore = !document.getElementById('versionDot')?.hidden;
    btn.click();
    await sleep(350);
    const ov = document.getElementById('changelogOverlay');
    out.opened = !!ov && !ov.hidden;
    out.versions = [...document.querySelectorAll('#changelogBody .cl-ver')].map(n => n.textContent.trim());
    out.items = document.querySelectorAll('#changelogBody .cl-items li').length;
    out.hasLatest = !!document.querySelector('#changelogBody .cl-item.is-latest');
    out.dotAfter = !document.getElementById('versionDot')?.hidden;
    document.querySelector('#changelogOverlay [data-close]')?.click();
    await sleep(250);
    out.closed = document.getElementById('changelogOverlay').hidden;
    out.stillArticle = !!document.querySelector('.article-body');
    return JSON.stringify(out);
  })()`));

  console.log('');
  console.log('  场景 4 · 更新日志入口（顶栏版本号）');
  check(/^v\d+\.\d+\.\d+$/.test(r4.btnText || ''), '顶栏显示版本号', String(r4.btnText));
  check(r4.dotBefore, '未读时入口带提示点');
  check(r4.opened, '点击后打开更新日志面板');
  check(r4.versions.length >= 2, `面板列出 ${r4.versions.length} 个版本`, r4.versions.slice(0, 3).join(' / '));
  check(r4.items > 0, `共 ${r4.items} 条变更记录`);
  check(r4.hasLatest, '最新版本有标记');
  check(!r4.dotAfter, '打开后提示点消除');
  check(r4.closed, '可正常关闭');
  check(r4.stillArticle, '关闭后仍在原章节，视图未被破坏');

  /* ---------- 场景 5：阅读设置 + 内容时效性标注 ---------- */
  await goto(`${BASE}/#/chapter/c22`, 1800);   // c22 标记为快速变化章节
  const r5 = JSON.parse(await evaluate(`(async () => {
    const sleep = (ms) => new Promise(r => setTimeout(r, ms));
    ${WAIT_ARTICLE}
    const out = {};
    const body = document.querySelector('.article-body');

    // 时效性标注
    out.hasNotice = !!body.querySelector('.callout.warn');
    out.metaHasUpdated = (document.querySelector('.article-meta')?.textContent || '').includes('更新于');

    // 阅读设置
    const fsBefore = getComputedStyle(body).fontSize;
    document.getElementById('readerBtn').click();
    await sleep(250);
    out.panelOpen = !document.getElementById('readerPanel').hidden;
    out.optionCount = document.querySelectorAll('#readerBody .rp-opts button').length;
    out.groups = document.querySelectorAll('#readerBody .rp-row').length;

    document.querySelector('#readerBody button[data-rk="scale"][data-rv="xl"]').click();
    await sleep(200);
    out.fsBefore = fsBefore;
    out.fsAfter = getComputedStyle(body).fontSize;
    out.fsVar = document.documentElement.style.getPropertyValue('--reader-fs');

    document.querySelector('#readerBody button[data-rk="leading"][data-rv="loose"]').click();
    await sleep(150);
    out.lhVar = document.documentElement.style.getPropertyValue('--reader-lh');

    out.persisted = JSON.parse(localStorage.getItem('agent-learning-platform:v1') || '{}')?.reader?.scale || null;

    document.querySelector('[data-reader-reset]').click();
    await sleep(200);
    out.fsAfterReset = getComputedStyle(body).fontSize;

    document.getElementById('readerScrim').click();
    await sleep(200);
    out.panelClosed = document.getElementById('readerPanel').hidden;
    out.stillArticle = !!document.querySelector('.article-body');
    return JSON.stringify(out);
  })()`));

  console.log('');
  console.log('  场景 5 · 阅读设置与内容时效性标注');
  check(r5.hasNotice, '快速变化章节自动插入时效提醒');
  check(r5.metaHasUpdated, '文章头部显示「更新于」基准时间');
  check(r5.panelOpen, '点击 Aa 打开阅读设置面板');
  check(r5.groups === 4, `提供 ${r5.groups} 组设置、${r5.optionCount} 个选项`);
  check(r5.fsAfter !== r5.fsBefore && r5.fsVar.includes('19'), '切换字号立即生效',
    `${r5.fsBefore} → ${r5.fsAfter}`);
  check(r5.lhVar === '2.05', '切换行距立即生效', `--reader-lh = ${r5.lhVar}`);
  check(r5.persisted === 'xl', '设置已持久化到本地');
  check(r5.fsAfterReset === r5.fsBefore, '恢复默认生效', `回到 ${r5.fsAfterReset}`);
  check(r5.panelClosed && r5.stillArticle, '面板可关闭且不影响阅读');
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
