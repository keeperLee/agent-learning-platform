#!/usr/bin/env node
/* ============================================================
   零依赖静态服务器（本地开发 / CI 冒烟测试）
   用法：node scripts/serve.mjs [端口]
   ============================================================ */

import { createServer } from 'http';
import { readFile, stat } from 'fs/promises';
import { extname, join, resolve, sep } from 'path';
import { fileURLToPath } from 'url';

const ROOT = resolve(fileURLToPath(new URL('..', import.meta.url)));
const PORT = Number(process.env.PORT || process.argv[2] || 5173);
const HOST = process.env.HOST || '127.0.0.1';

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.md': 'text/markdown; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon',
  '.woff2': 'font/woff2',
  '.txt': 'text/plain; charset=utf-8'
};

function safePath(urlPath) {
  const decoded = decodeURIComponent(urlPath.split('?')[0].split('#')[0]);
  const target = resolve(join(ROOT, decoded));
  // 防目录穿越
  if (target !== ROOT && !target.startsWith(ROOT + sep)) return null;
  return target;
}

const server = createServer(async (req, res) => {
  const started = Date.now();
  let target = safePath(req.url || '/');

  if (!target) {
    res.writeHead(403, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('403 Forbidden');
    return;
  }

  try {
    let info = await stat(target).catch(() => null);
    if (info?.isDirectory()) {
      target = join(target, 'index.html');
      info = await stat(target).catch(() => null);
    }

    if (!info?.isFile()) {
      res.writeHead(404, { 'Content-Type': 'text/html; charset=utf-8' });
      res.end(`<!DOCTYPE html><meta charset="utf-8"><title>404</title>
<body style="font:15px/1.7 system-ui;padding:48px;max-width:60ch">
<h1 style="margin:0 0 8px">404 Not Found</h1>
<p style="color:#666">${decodeURIComponent(req.url || '/')}</p>
<p><a href="/">← 返回首页</a></p>`);
      log(req, 404, started);
      return;
    }

    const body = await readFile(target);
    res.writeHead(200, {
      'Content-Type': MIME[extname(target).toLowerCase()] || 'application/octet-stream',
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      'Content-Length': body.length
    });
    res.end(body);
    log(req, 200, started);
  } catch (err) {
    res.writeHead(500, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('500 ' + err.message);
    log(req, 500, started);
  }
});

function log(req, code, started) {
  if (process.env.QUIET) return;
  const mark = code >= 400 ? '\u001b[31m' : '\u001b[32m';
  const reset = process.stdout.isTTY ? '\u001b[0m' : '';
  const color = process.stdout.isTTY ? mark : '';
  console.log(`  ${color}${code}${reset}  ${Date.now() - started}ms  ${req.method} ${req.url}`);
}

server.listen(PORT, HOST, () => {
  console.log('');
  console.log('  Agent 学习平台 · 本地服务已启动');
  console.log(`  →  http://${HOST}:${PORT}/`);
  console.log('  Ctrl + C 停止');
  console.log('');
});

server.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.error(`\n  端口 ${PORT} 已被占用。请换一个端口：node scripts/serve.mjs 5174\n`);
  } else {
    console.error('\n  服务启动失败：', err.message, '\n');
  }
  process.exit(1);
});
