#!/usr/bin/env node
/* ============================================================
   内容与结构校验（CI 使用，零依赖）
   直接复用站点自身的 Markdown 渲染器，保证"CI 通过的 = 线上能渲染的"
   退出码：0 通过 / 1 存在错误
   ============================================================ */

import { readFileSync, existsSync, readdirSync, statSync } from 'fs';
import { resolve, dirname, join, relative } from 'path';
import { fileURLToPath, pathToFileURL } from 'url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const P = (...s) => join(ROOT, ...s);
const rel = (p) => relative(ROOT, p).replace(/\\/g, '/');

const C = {
  reset: '\u001b[0m', red: '\u001b[31m', green: '\u001b[32m',
  yellow: '\u001b[33m', dim: '\u001b[2m', bold: '\u001b[1m'
};
const USE_COLOR = !process.env.NO_COLOR && process.stdout.isTTY !== false;

const errors = [];
const warnings = [];
const group = [];
const fail = (scope, msg) => errors.push({ scope, msg });
const warn = (scope, msg) => warnings.push({ scope, msg });
const ok = (scope, msg) => group.push({ scope, msg, level: 'ok' });

/* ============================================================
   0. 关键文件
   ============================================================ */
const REQUIRED = [
  'index.html', 'README.md', '.nojekyll',
  'assets/css/main.css', 'assets/css/components.css', 'assets/css/reader.css',
  'assets/js/app.js', 'assets/js/store.js', 'assets/js/markdown.js',
  'assets/js/highlight.js', 'assets/js/diagrams.js', 'assets/js/demos.js',
  'assets/js/search.js', 'assets/js/annotate.js', 'assets/js/content.js',
  'assets/js/ui.js', 'content/catalog.js', 'content/changelog.js'
];

for (const f of REQUIRED) {
  if (!existsSync(P(f))) { fail('关键文件', `缺失 ${f}`); continue; }
  if (f !== '.nojekyll' && statSync(P(f)).size === 0) { fail('关键文件', `${f} 为空文件`); }
}
ok('关键文件', `${REQUIRED.length} 个必需文件均存在`);

if (!existsSync(P('.nojekyll'))) {
  fail('GitHub Pages', '缺少 .nojekyll —— Jekyll 会处理 content/chapters/*.md，导致线上 fetch 取不到原始 Markdown');
}

/* ============================================================
   1. 加载目录与站点模块
   ============================================================ */
globalThis.window = globalThis;
await import(pathToFileURL(P('content/catalog.js')).href);
await import(pathToFileURL(P('content/changelog.js')).href);
const CAT = globalThis.CATALOG;
const CL = globalThis.CHANGELOG;

if (!CAT || !Array.isArray(CAT.modules)) {
  console.error('无法加载 content/catalog.js 中的 window.CATALOG');
  process.exit(1);
}

const { renderMarkdown, toPlainText } = await import(pathToFileURL(P('assets/js/markdown.js')).href);
const { normalizeLang } = await import(pathToFileURL(P('assets/js/highlight.js')).href);
const { DEMOS } = await import(pathToFileURL(P('assets/js/demos.js')).href);
const { DIAGRAM_NAMES } = await import(pathToFileURL(P('assets/js/diagrams.js')).href);

const DEMO_NAMES = new Set(Object.keys(DEMOS));
const DIAGRAM_SET = new Set(DIAGRAM_NAMES);
const CALLOUT_TYPES = new Set(['tip', 'info', 'warn', 'danger', 'key', 'quote']);
const TAGS = new Set(['basic', 'mid', 'adv', 'lab', 'ref']);
const TEXT_LANGS = new Set(['text', 'markdown', 'md', 'plain', 'txt', 'html', 'xml', 'css', 'diff', 'log', 'ini', 'toml']);

/* ============================================================
   2. 目录元数据校验
   ============================================================ */
const chapters = Array.isArray(CAT.allChapters) ? CAT.allChapters : CAT.modules.flatMap((m) => m.chapters);
const ids = new Set();
const moduleIds = new Set();

for (const m of CAT.modules) {
  if (!m.id) fail('目录', `模块缺少 id：${m.name || '(无名)'}`);
  if (moduleIds.has(m.id)) fail('目录', `模块 id 重复：${m.id}`);
  moduleIds.add(m.id);
  if (!m.name || !m.desc) fail('目录', `模块 ${m.id} 缺少 name 或 desc`);
  if (!Array.isArray(m.chapters) || m.chapters.length === 0) fail('目录', `模块 ${m.id} 没有章节`);

  for (const c of m.chapters || []) {
    const where = `章节 ${c.id || '(缺 id)'}`;
    if (!c.id) { fail('目录', `${m.id} 中某章节缺少 id`); continue; }
    if (ids.has(c.id)) fail('目录', `章节 id 重复：${c.id}`);
    ids.add(c.id);

    if (!/^[a-z0-9-]+$/.test(c.id)) fail('目录', `${where} 的 id 含非法字符（只允许小写字母、数字、连字符）`);
    if (!c.title) fail('目录', `${where} 缺少 title`);
    if (!c.summary) fail('目录', `${where} 缺少 summary`);
    if (!TAGS.has(c.tag)) fail('目录', `${where} 的 tag 非法：${c.tag}（可选 ${[...TAGS].join(' / ')}）`);
    if (!Number.isFinite(c.minutes) || c.minutes <= 0) fail('目录', `${where} 的 minutes 必须是正数`);

    if (c.title && c.title.length > 30) warn('目录', `${where} 标题偏长（${c.title.length} 字），侧边栏可能换行`);
    if (c.summary && c.summary.length > 60) warn('目录', `${where} 摘要偏长（${c.summary.length} 字），卡片会显得拥挤`);

    // 内容时效性：updated 为信息基准时间，volatile 标记快速变化的章节
    const updated = c.updated || CAT.DEFAULT_UPDATED;
    if (!/^\d{4}-\d{2}(-\d{2})?$/.test(String(updated))) {
      fail('目录', `${where} 的 updated 格式非法：${updated}（应为 YYYY-MM 或 YYYY-MM-DD）`);
    }
    if (c.volatile !== undefined && typeof c.volatile !== 'boolean') {
      fail('目录', `${where} 的 volatile 必须是布尔值`);
    }
  }
}
ok('目录', `${CAT.modules.length} 个模块 / ${chapters.length} 个章节，id 唯一且字段合法`);

/* 阅读路径 */
const pathIds = new Set();
for (const p of CAT.paths || []) {
  if (!p.id) fail('阅读路径', '存在缺少 id 的路径');
  if (pathIds.has(p.id)) fail('阅读路径', `路径 id 重复：${p.id}`);
  pathIds.add(p.id);
  if (!p.name || !p.desc) fail('阅读路径', `路径 ${p.id} 缺少 name 或 desc`);
  if (p.chapters) {
    for (const cid of p.chapters) {
      if (!ids.has(cid)) fail('阅读路径', `路径「${p.name}」引用了不存在的章节：${cid}`);
    }
    if (p.chapters.length === 0) fail('阅读路径', `路径「${p.name}」的 chapters 为空数组（应填 null 表示全部）`);
  }
}
ok('阅读路径', `${(CAT.paths || []).length} 条路径，章节引用全部有效`);

/* ============================================================
   3. 文件与目录一致性
   ============================================================ */
const CH_DIR = 'content/chapters';
const files = existsSync(P(CH_DIR))
  ? readdirSync(P(CH_DIR)).filter((f) => f.endsWith('.md')).map((f) => f.replace(/\.md$/, ''))
  : [];
const fileSet = new Set(files);

for (const c of chapters) {
  if (!fileSet.has(c.id)) fail('内容', `目录登记了 ${c.id}，但找不到 ${CH_DIR}/${c.id}.md`);
}
for (const f of files) {
  if (!ids.has(f)) warn('内容', `存在孤儿文件 ${CH_DIR}/${f}.md（未登记到 catalog.js，不会被展示）`);
}
ok('内容', `${files.length} 个章节文件与目录一致`);

/* ============================================================
   4. 逐章渲染与语法校验
   ============================================================ */
const stats = [];
let totalIssues = 0;
const tocIds = new Map();   // chapterId -> Set(该章所有标题锚点)
const links = [];           // { from, target } 章节之间的引用

const safeDecode = (s) => { try { return decodeURIComponent(s); } catch (_) { return String(s); } };

function checkAssetPath(src, scope) {
  if (!src) return;
  if (/^(https?:)?\/\//.test(src) || src.startsWith('data:') || src.startsWith('#')) return;
  const clean = src.startsWith('/') ? src.slice(1) : src;
  // 兼容两种写法：相对站点根目录、相对当前章节文件
  if (!existsSync(P(clean)) && !existsSync(P(join(CH_DIR, clean)))) {
    fail(scope, `引用的本地资源不存在：${src}`);
  }
}

for (const c of chapters) {
  const file = `${CH_DIR}/${c.id}.md`;
  if (!fileSet.has(c.id)) continue;
  const scope = c.id;
  const md = readFileSync(P(file), 'utf8');
  const lines = md.split('\n');

  /* 4.1 一级标题 */
  const firstContent = lines.find((l) => l.trim() !== '') || '';
  if (!/^#\s+\S/.test(firstContent)) fail(scope, '正文首行必须是一级标题（# 标题）');

  /* 4.2 容器配对 */
  let open = 0, close = 0;
  for (const l of lines) {
    if (/^:::\s*[a-zA-Z]/.test(l)) open++;
    else if (/^:::\s*$/.test(l)) close++;
  }
  if (open !== close) fail(scope, `::: 容器未配对（开启 ${open} 个，闭合 ${close} 个）`);

  /* 4.3 逐行语法扫描（跳过代码围栏内部） */
  let inFence = false;
  const blockNames = [];
  lines.forEach((line, i) => {
    const ln = i + 1;
    if (/^```/.test(line)) {
      if (!inFence) {
        const info = line.slice(3).trim();
        const lang = (info.replace(/title="[^"]*"/, '').replace(/\{[^}]*\}/, '').trim().split(/\s+/)[0] || '').toLowerCase();
        if (lang && normalizeLang(lang) === 'text' && !TEXT_LANGS.has(lang)) {
          fail(scope, `第 ${ln} 行：代码块语言「${lang}」未被高亮器识别（会被当成纯文本）`);
        }
      }
      inFence = !inFence;
      return;
    }
    if (inFence) return;

    const m = line.match(/^:::\s*([a-zA-Z][\w-]*)\s*(.*)$/);
    if (!m) return;
    const [type, rest] = [m[1].toLowerCase(), m[2].trim()];

    if (type === 'demo') {
      const name = rest.split(/\s+/)[0];
      if (!name) fail(scope, `第 ${ln} 行：:::demo 缺少名称`);
      else if (!DEMO_NAMES.has(name)) fail(scope, `第 ${ln} 行：不存在的演示「${name}」（可用：${[...DEMO_NAMES].join(', ')}）`);
      else blockNames.push(name);
    } else if (type === 'diagram') {
      const name = (rest.match(/^([\w-]+)/) || [])[1];
      if (!name) fail(scope, `第 ${ln} 行：:::diagram 缺少名称`);
      else if (!DIAGRAM_SET.has(name)) fail(scope, `第 ${ln} 行：不存在的示意图「${name}」（可用：${DIAGRAM_NAMES.join(', ')}）`);
      else blockNames.push(name);
    } else if (type === 'callout') {
      const t = rest.split(/\s+/)[0];
      if (!CALLOUT_TYPES.has(t)) fail(scope, `第 ${ln} 行：未知提示框类型「${t}」（可用：${[...CALLOUT_TYPES].join(', ')}）`);
    } else if (type === 'figure') {
      const src = (rest.match(/src="([^"]*)"/) || [])[1];
      if (!src) fail(scope, `第 ${ln} 行：:::figure 缺少 src`);
      else checkAssetPath(src, scope);
    } else if (!['columns'].includes(type)) {
      fail(scope, `第 ${ln} 行：未知容器「${type}」`);
    }
  });

  if (inFence) fail(scope, '代码围栏未闭合（``` 数量为奇数）');

  /* 4.4 图片引用 */
  for (const m of md.matchAll(/!\[[^\]]*\]\(([^)\s]+)\)/g)) checkAssetPath(m[1], scope);

  /* 4.5 渲染 */
  let html = '', toc = [];
  try {
    const r = renderMarkdown(md.replace(/^\s*#\s+[^\n]*\r?\n/, ''));
    html = r.html;
    toc = r.toc;
  } catch (e) {
    fail(scope, `渲染抛错：${e.message}`);
    continue;
  }

  if (/:::\s*[a-zA-Z]/.test(html)) fail(scope, '渲染结果中残留 ::: 容器标记');
  if (html.includes('<p>:::</p>')) fail(scope, '渲染结果中出现游离的 ::: 段落');
  if (html.includes('缺少示意图')) fail(scope, '渲染结果中包含「缺少示意图」占位');
  if (html.includes('```')) fail(scope, '渲染结果中残留代码围栏');
  if (/<p>[^<]*\*\*/.test(html)) fail(scope, '渲染结果中残留未解析的 ** 粗体标记');
  if (toc.length === 0) fail(scope, '没有生成任何目录条目（至少需要一个二级标题）');
  if (toc.some((t) => !t.id)) fail(scope, '存在没有 id 的目录条目');

  /* 4.6 内容体量基线 */
  const plain = toPlainText(md);
  const h2 = (md.match(/^##\s+/gm) || []).length;
  if (plain.length < 800) fail(scope, `正文过短（${plain.length} 字），疑似未完成`);
  if (h2 < 3) warn(scope, `二级标题只有 ${h2} 个，结构可能不够清晰`);
  if (plain.length > 8000) warn(scope, `正文偏长（${plain.length} 字），建议拆分`);

  /* 4.7 收集锚点与内链，待全部章节渲染完成后统一校验 */
  tocIds.set(c.id, new Set(toc.map((t) => t.id)));
  for (const m of md.matchAll(/\]\(#([^)\s]*)\)/g)) links.push({ from: c.id, target: m[1] });

  stats.push({ id: c.id, title: c.title, plain: plain.length, h2, toc: toc.length, blocks: blockNames.length, html: html.length });
}

ok('渲染', `${stats.length} 章全部渲染成功（均无残留语法标记）`);

/* 4.8 章节内链校验：指向的章节与锚点必须真实存在 */
let linkCount = 0;
for (const { from, target } of links) {
  if (!target || target === '/') continue;              // 首页
  linkCount++;
  if (target.startsWith('/chapter/')) {
    const [cid, rawAnchor] = target.slice('/chapter/'.length).split('#');
    if (!ids.has(cid)) { fail(from, `内链指向不存在的章节：#/chapter/${cid}`); continue; }
    if (rawAnchor) {
      const anchor = safeDecode(rawAnchor);
      const set = tocIds.get(cid);
      if (set && !set.has(anchor)) fail(from, `内链锚点在目标章节中不存在：#/chapter/${cid}#${anchor}`);
    }
  } else {
    const anchor = safeDecode(target);
    const set = tocIds.get(from);
    if (set && !set.has(anchor)) fail(from, `页内锚点不存在：#${anchor}`);
  }
}
ok('内链', `${linkCount} 处章节引用全部指向存在的章节与锚点`);

/* ============================================================
   5. index.html 资源引用
   ============================================================ */
const indexHtml = readFileSync(P('index.html'), 'utf8');
const refs = new Set();
for (const m of indexHtml.matchAll(/(?:href|src)="([^"]+)"/g)) {
  const url = m[1];
  if (/^(https?:)?\/\//.test(url) || url.startsWith('#') || url.startsWith('data:')) continue;
  refs.add(url);
}
let missingRefs = 0;
for (const r of refs) {
  if (!existsSync(P(r))) { fail('index.html', `引用的资源不存在：${r}`); missingRefs++; }
}
ok('index.html', `${refs.size} 个本地资源引用全部有效`);

/* 关键挂载点 */
const MOUNTS = [
  'viewRoot', 'chapterNav', 'tocInner', 'searchInput', 'drawerBody',
  'selectionBar', 'toastWrap', 'readingProgress',
  'changelogOverlay', 'changelogBody', 'changelogToggle', 'versionText',
  'readerBtn', 'readerPanel', 'readerBody'
];
for (const id of MOUNTS) {
  if (!indexHtml.includes(`id="${id}"`)) fail('index.html', `缺少脚本依赖的挂载点 #${id}`);
}
ok('index.html', `脚本依赖的 ${MOUNTS.length} 个挂载点齐备`);

/* ============================================================
   6. 演示与示意图覆盖率
   ============================================================ */
const usedDemos = new Set();
for (const c of chapters) {
  if (!fileSet.has(c.id)) continue;
  for (const m of readFileSync(P(`${CH_DIR}/${c.id}.md`), 'utf8').matchAll(/^:::\s*demo\s+([\w-]+)/gm)) usedDemos.add(m[1]);
}
for (const name of DEMO_NAMES) {
  if (!usedDemos.has(name)) warn('演示', `演示「${name}」已注册但没有任何章节引用`);
}
ok('演示', `${DEMO_NAMES.size} 个演示组件，其中 ${usedDemos.size} 个已被引用`);

/* ============================================================
   7. 更新日志
   ============================================================ */
if (!CL || !Array.isArray(CL.entries) || CL.entries.length === 0) {
  fail('更新日志', 'content/changelog.js 未导出有效的 window.CHANGELOG.entries');
} else {
  if (!CL.current) fail('更新日志', '缺少 current 字段');
  if (!CL.types || !Object.keys(CL.types).length) fail('更新日志', '缺少 types 类型定义');

  if (CL.current !== CAT.version) {
    fail('更新日志', `版本号不一致：changelog.current = ${CL.current}，catalog.version = ${CAT.version}（请同步二者）`);
  }
  if (CL.entries[0].version !== CL.current) {
    fail('更新日志', `entries[0].version（${CL.entries[0].version}）必须等于 current（${CL.current}）`);
  }

  const seenVersions = new Set();
  CL.entries.forEach((e, i) => {
    const w = `版本 ${e.version || `#${i + 1}`}`;
    if (!e.version) fail('更新日志', `第 ${i + 1} 条缺少 version`);
    else {
      if (seenVersions.has(e.version)) fail('更新日志', `版本号重复：${e.version}`);
      seenVersions.add(e.version);
      if (!/^\d+\.\d+\.\d+$/.test(e.version)) fail('更新日志', `${w} 不符合语义化版本格式（应为 x.y.z）`);
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(e.date || '')) fail('更新日志', `${w} 的 date 必须是 YYYY-MM-DD`);
    if (!['major', 'minor', 'patch'].includes(e.level)) fail('更新日志', `${w} 的 level 非法：${e.level}`);
    if (!e.title) fail('更新日志', `${w} 缺少 title`);
    if (!Array.isArray(e.items) || e.items.length === 0) fail('更新日志', `${w} 没有 items`);
    (e.items || []).forEach((it) => {
      if (!it.type || !CL.types[it.type]) fail('更新日志', `${w} 使用了未定义的条目类型：${it.type}`);
      if (!it.text) fail('更新日志', `${w} 存在空条目`);
    });
  });

  // 日期应从新到旧排列
  const dates = CL.entries.map((e) => e.date).filter(Boolean);
  for (let i = 1; i < dates.length; i++) {
    if (dates[i] > dates[i - 1]) warn('更新日志', `第 ${i + 1} 条的日期比上一条更新，建议按时间倒序排列`);
  }

  ok('更新日志', `${CL.entries.length} 个版本（当前 ${CL.current}），版本号与 catalog 一致`);
}

/* 时效性标注概览 */
{
  const volatile = chapters.filter((c) => c.volatile);
  ok('时效性', `基准时间 ${CAT.DEFAULT_UPDATED}，其中 ${volatile.length} 章标记为快速变化：${volatile.map((c) => c.id).join('、') || '无'}`);
}

/* ============================================================
   8. 输出报告
   ============================================================ */
const paint = (s, c) => (USE_COLOR ? `${c}${s}${C.reset}` : s);

console.log('');
console.log(paint('  Agent 学习平台 · 内容校验', C.bold));
console.log(paint('  ' + '─'.repeat(58), C.dim));
console.log('');
console.log(paint('  章节概览', C.bold));
console.log(paint('  章节  字数    二级标题  目录  演示  标题', C.dim));
for (const s of stats) {
  console.log(`  ${s.id.padEnd(6)}${String(s.plain).padStart(5)}   ${String(s.h2).padStart(6)}   ${String(s.toc).padStart(4)}  ${String(s.blocks).padStart(4)}  ${s.title}`);
}
const totalPlain = stats.reduce((a, s) => a + s.plain, 0);
console.log(paint(`  合计约 ${totalPlain.toLocaleString()} 字`, C.dim));
console.log('');

console.log(paint('  校验结果', C.bold));
for (const g of group) console.log(`  ${paint('✓', C.green)} ${g.scope.padEnd(12)} ${paint(g.msg, C.dim)}`);
console.log('');

if (warnings.length) {
  console.log(paint(`  警告 ${warnings.length} 条`, C.yellow));
  for (const w of warnings) console.log(`  ${paint('!', C.yellow)} ${paint(`[${w.scope}]`, C.dim)} ${w.msg}`);
  console.log('');
}

if (errors.length) {
  console.log(paint(`  错误 ${errors.length} 条`, C.red));
  for (const e of errors) console.log(`  ${paint('✗', C.red)} ${paint(`[${e.scope}]`, C.dim)} ${e.msg}`);
  console.log('');
  console.log(paint('  校验未通过，已阻止后续流程。', C.red));
  console.log('');
  process.exit(1);
}

console.log(paint(`  校验通过：${stats.length} 章内容全部有效。`, C.green));
console.log('');
