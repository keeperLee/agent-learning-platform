#!/usr/bin/env node
/* ============================================================
   用户目录命令行工具（零依赖）
   ------------------------------------------------------------
   适合这些场景：
     · 管理员忘记了自己的密码，界面进不去
     · 一次性批量开号
     · 在 CI 或运维脚本里维护名单

   用法：
     npm run user -- list
     npm run user -- add <用户名> <密码> [角色] [显示名]
     npm run user -- passwd <用户名> <新密码>
     npm run user -- disable <用户名>
     npm run user -- enable <用户名>
     npm run user -- role <用户名> <admin|member>
     npm run user -- remove <用户名>
     npm run user -- hash <密码>

   校验与序列化复用 assets/js/userdir.js —— 与浏览器端管理界面
   是同一份实现，因此「命令行写出的文件」和「界面导出的文件」
   格式完全一致，不会互相覆盖出无意义的 diff。
   ============================================================ */

import { readFileSync, writeFileSync, existsSync } from 'fs';
import { resolve, dirname, join } from 'path';
import { fileURLToPath, pathToFileURL } from 'url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const P = (...s) => join(ROOT, ...s);
const USERS_FILE = P('content/users.js');

const { makeCredential, DEFAULT_ITERATIONS } = await import(pathToFileURL(P('assets/js/crypto.js')).href);
const {
  ROLES, ROLE_LABEL, MIN_PASSWORD,
  normalizeUsername, validateUsername, validateDisplayName, validatePassword, passwordStrength,
  serializeDirectory
} = await import(pathToFileURL(P('assets/js/userdir.js')).href);

const C = { reset: '\u001b[0m', red: '\u001b[31m', green: '\u001b[32m', yellow: '\u001b[33m', dim: '\u001b[2m', bold: '\u001b[1m' };
const paint = (s, c) => (process.env.NO_COLOR ? s : `${c}${s}${C.reset}`);

const die = (msg) => { console.error(`\n  ${paint('✗', C.red)} ${msg}\n`); process.exit(1); };

/* ============================================================
   读取现有名单
   ============================================================ */
if (!existsSync(USERS_FILE)) die(`找不到 ${USERS_FILE}`);

globalThis.window = globalThis;
await import(pathToFileURL(USERS_FILE).href);
const dir = globalThis.USER_DIRECTORY;

if (!dir || !Array.isArray(dir.users)) {
  die('content/users.js 未导出有效的 window.USER_DIRECTORY.users');
}

let users = dir.users;

/* ============================================================
   工具
   ============================================================ */
const today = () => new Date().toISOString().slice(0, 10);
const find = (name) => users.find((u) => u.username === normalizeUsername(name));
const activeAdmins = () => users.filter((u) => u.role === 'admin' && u.active);

function save(message) {
  writeFileSync(USERS_FILE, serializeDirectory(users), 'utf8');
  console.log(`\n  ${paint('✓', C.green)} ${message}`);
  console.log(`  ${paint(`已写入 content/users.js（共 ${users.length} 个账号）`, C.dim)}`);
  console.log('');
  console.log(`  ${paint('别忘了提交，否则线上不会生效：', C.yellow)}`);
  console.log(`    git add content/users.js`);
  console.log(`    git commit -m "${'chore: 更新用户名单'}"`);
  console.log(`    git push`);
  console.log('');
}

/** 最后一个可用管理员的保护，与浏览器端逻辑保持一致 */
function guardLastAdmin(name, verb) {
  const target = find(name);
  if (!target) die(`找不到用户「${name}」`);
  if (target.role === 'admin' && target.active && activeAdmins().length <= 1) {
    die(`「${name}」是最后一个可用管理员，不能${verb}。\n    请先创建或启用另一个管理员。`);
  }
  return target;
}

/* ============================================================
   命令
   ============================================================ */
/** 终端显示宽度：CJK 与全角符号占 2 列 */
function displayWidth(s) {
  let w = 0;
  for (const ch of String(s)) {
    const c = ch.codePointAt(0);
    w += (c >= 0x1100 && (
      c <= 0x115f || c === 0x2329 || c === 0x232a
      || (c >= 0x2e80 && c <= 0xa4cf && c !== 0x303f)
      || (c >= 0xac00 && c <= 0xd7a3)
      || (c >= 0xf900 && c <= 0xfaff)
      || (c >= 0xfe30 && c <= 0xfe6f)
      || (c >= 0xff00 && c <= 0xff60)
      || (c >= 0xffe0 && c <= 0xffe6)
      || (c >= 0x20000 && c <= 0x3fffd)
    )) ? 2 : 1;
  }
  return w;
}

function pad(s, n) {
  const str = String(s ?? '');
  return str + ' '.repeat(Math.max(0, n - displayWidth(str)));
}

function cmdList() {
  if (!users.length) { console.log('\n  名单为空。\n'); return; }

  const sorted = [...users].sort((a, b) => {
    if (a.role !== b.role) return a.role === 'admin' ? -1 : 1;
    if (a.active !== b.active) return a.active ? -1 : 1;
    return a.username.localeCompare(b.username);
  });

  console.log('');
  console.log(`  ${paint('用户目录', C.bold)}  ${paint(`(${users.length} 个账号 · ${activeAdmins().length} 个可用管理员)`, C.dim)}`);
  console.log(`  ${paint('─'.repeat(66), C.dim)}`);
  console.log(`  ${paint(pad('登录名', 17) + pad('显示名', 13) + pad('角色', 9) + pad('状态', 8) + '创建', C.dim)}`);

  for (const u of sorted) {
    const state = u.active ? paint('启用', C.green) : paint('停用', C.dim);
    const line = `  ${pad(u.username, 17)}${pad(u.displayName || u.username, 13)}`
      + `${pad(ROLE_LABEL[u.role] || u.role, 9)}${state}${u.active ? '    ' : '  '}`
      + `${paint(u.createdAt || '—', C.dim)}`;
    console.log(line);
  }
  console.log('');
}

function cmdAdd(args) {
  const [rawName, password, role = 'member', displayName] = args;
  if (!rawName || !password) die('用法：npm run user -- add <用户名> <密码> [角色] [显示名]');

  const name = normalizeUsername(rawName);
  const dn = displayName || name;

  const err = validateUsername(name) || validateDisplayName(dn) || validatePassword(password, name);
  if (err) die(err);
  if (!ROLES.includes(role)) die(`角色非法：${role}（可选 ${ROLES.join(' / ')}）`);
  if (find(name)) die(`登录名「${name}」已存在。要改密码请用 passwd。`);

  const strength = passwordStrength(password);
  users = [...users, {
    username: name,
    displayName: String(dn).trim(),
    role,
    active: true,
    credential: makeCredential(password),
    mustChangePassword: true,
    createdAt: today(),
    createdBy: 'cli',
    note: ''
  }];

  if (strength.common) {
    console.log(`\n  ${paint('! 这个密码包含常见弱口令片段，建议更换。', C.yellow)}`);
  }
  save(`已创建账号「${name}」（${ROLE_LABEL[role]}）`);
}

function cmdPasswd(args) {
  const [rawName, password] = args;
  if (!rawName || !password) die('用法：npm run user -- passwd <用户名> <新密码>');

  const name = normalizeUsername(rawName);
  const target = find(name);
  if (!target) die(`找不到用户「${name}」`);

  const err = validatePassword(password, name);
  if (err) die(err);

  users = users.map((u) => (u.username === name
    ? { ...u, credential: makeCredential(password), mustChangePassword: true }
    : u));

  const strength = passwordStrength(password);
  if (strength.common) console.log(`\n  ${paint('! 这个密码包含常见弱口令片段，建议更换。', C.yellow)}`);
  save(`已重置「${name}」的密码`);
}

function cmdSetActive(args, active) {
  const name = normalizeUsername(args[0] || '');
  if (!name) die(`用法：npm run user -- ${active ? 'enable' : 'disable'} <用户名>`);

  if (!active) guardLastAdmin(name, '停用');
  else if (!find(name)) die(`找不到用户「${name}」`);

  users = users.map((u) => (u.username === name ? { ...u, active } : u));
  save(`已${active ? '启用' : '停用'}「${name}」`);
}

function cmdRole(args) {
  const name = normalizeUsername(args[0] || '');
  const role = args[1];
  if (!name || !role) die('用法：npm run user -- role <用户名> <admin|member>');
  if (!ROLES.includes(role)) die(`角色非法：${role}`);

  if (role !== 'admin') guardLastAdmin(name, '降为普通用户');
  else if (!find(name)) die(`找不到用户「${name}」`);

  users = users.map((u) => (u.username === name ? { ...u, role } : u));
  save(`已把「${name}」设为${ROLE_LABEL[role]}`);
}

function cmdRemove(args) {
  const name = normalizeUsername(args[0] || '');
  if (!name) die('用法：npm run user -- remove <用户名>');

  guardLastAdmin(name, '删除');
  users = users.filter((u) => u.username !== name);
  save(`已删除「${name}」`);
}

function cmdHash(args) {
  const password = args[0];
  if (!password) die('用法：npm run user -- hash <密码>');
  const c = makeCredential(password);
  const s = passwordStrength(password);
  console.log('');
  console.log(`  ${paint('凭据（粘贴到 content/users.js 的 credential 字段）', C.bold)}`);
  console.log(`    algo: '${c.algo}',`);
  console.log(`    iterations: ${c.iterations},`);
  console.log(`    salt: '${c.salt}',`);
  console.log(`    hash: '${c.hash}'`);
  console.log('');
  console.log(`  ${paint(`强度：${s.label}（${s.hints.join('、') || '无建议'}）`, s.common ? C.yellow : C.dim)}`);
  console.log(`  ${paint(`算法：迭代式 SHA-256，默认 ${DEFAULT_ITERATIONS} 轮`, C.dim)}`);
  console.log('');
}

/* ============================================================
   入口
   ============================================================ */
const [cmd, ...args] = process.argv.slice(2);

switch (cmd) {
  case 'list': case 'ls': cmdList(); break;
  case 'add': cmdAdd(args); break;
  case 'passwd': case 'password': cmdPasswd(args); break;
  case 'disable': case 'off': cmdSetActive(args, false); break;
  case 'enable': case 'on': cmdSetActive(args, true); break;
  case 'role': cmdRole(args); break;
  case 'remove': case 'rm': case 'del': cmdRemove(args); break;
  case 'hash': case 'mkcred': cmdHash(args); break;
  default:
    console.log(`
  ${paint('用户目录命令行工具', C.bold)}

    npm run user -- list                          查看全部账号
    npm run user -- add <用户名> <密码> [角色] [显示名]   新增账号
    npm run user -- passwd <用户名> <新密码>        重置密码
    npm run user -- disable <用户名>               停用账号
    npm run user -- enable <用户名>                启用账号
    npm run user -- role <用户名> <admin|member>   调整角色
    npm run user -- remove <用户名>                删除账号
    npm run user -- hash <密码>                    生成一条凭据

  ${paint(`密码至少 ${MIN_PASSWORD} 位。角色可选：${ROLES.join(' / ')}。`, C.dim)}
  ${paint('改动写回 content/users.js，需要提交推送后才会在线上生效。', C.dim)}
`);
}
