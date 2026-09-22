/* ============================================================
   认证层
   ------------------------------------------------------------
   职责：身份校验、会话管理、用户目录维护。

   【设计要点：Provider 可替换】
   所有身份相关的操作都收敛到 provider 对象的几个方法上。
   现在是 localProvider（纯前端 + 文件化用户目录）。
   将来接入后端时，只要实现同样的方法并把 ACTIVE_PROVIDER
   指过去，登录界面、管理后台、学习数据隔离这些上层代码
   都不需要改动。

   【用户目录的两层结构】
     · 基线（base）   content/users.js —— 提交到仓库，全员共享
     · 覆盖（override）localStorage    —— 管理员本机未发布的改动

   为什么要有覆盖层：管理员在界面上加了用户，必须刷新后还能
   看到自己的改动，否则操作体验是断裂的。但本机改动不会自动
   同步给别人 —— 必须导出 users.js 并提交，这一步在界面上有
   明确提示，不会让人误以为已经生效。

   【安全边界，请勿误解】
   本层是访问控制，不是安全防护。没有服务端时，任何人都能
   通过开发者工具伪造会话。详见 assets/js/crypto.js 顶部说明。
   ============================================================ */

import { makeCredential, verifyPassword, genToken, sha256Hex, DEFAULT_ITERATIONS } from './crypto.js';
import {
  ROLES, MIN_PASSWORD,
  normalizeUsername, validateUsername, validateDisplayName, validatePassword,
  userSignature, directoryFingerprint, serializeDirectory
} from './userdir.js';

/* 校验、签名与序列化等纯逻辑集中在 userdir.js —— 浏览器与命令行脚本
   共用同一份实现，避免「界面导出的格式」与「命令行写出的格式」漂移。
   这里统一转出，上层只需要认识 auth.js 这一个入口。 */
export {
  ROLES, ROLE_LABEL, MIN_PASSWORD,
  normalizeUsername, validateUsername, validateDisplayName, validatePassword, passwordStrength
} from './userdir.js';

const NS = 'agent-learning-platform';
const SESSION_KEY = `${NS}:session:v1`;
const OVERRIDE_KEY = `${NS}:users-override:v1`;

const SESSION_TTL_REMEMBER = 7 * 24 * 3600 * 1000;   // 记住我：7 天
const SESSION_TTL_SESSION = 12 * 3600 * 1000;        // 不记住：12 小时

/* ============================================================
   存储读写（一律包 try/catch：隐私模式 / 配额满都不该让页面崩）
   ============================================================ */
function store(name) {
  try { return name === 'session' ? window.sessionStorage : window.localStorage; } catch (_) { return null; }
}

function readJSON(name, key) {
  const s = store(name);
  if (!s) return null;
  try {
    const raw = s.getItem(key);
    return raw ? JSON.parse(raw) : null;
  } catch (_) { return null; }
}

function writeJSON(name, key, value) {
  const s = store(name);
  if (!s) return false;
  try { s.setItem(key, JSON.stringify(value)); return true; } catch (_) { return false; }
}

function dropKey(name, key) {
  const s = store(name);
  if (!s) return;
  try { s.removeItem(key); } catch (_) { /* ignore */ }
}

/* ============================================================
   用户目录：基线 + 覆盖
   ============================================================ */
const today = () => new Date().toISOString().slice(0, 10);

/** content/users.js 里的名单 */
export function baseDirectory() {
  const d = (typeof window !== 'undefined' && window.USER_DIRECTORY) || null;
  return {
    version: (d && d.version) || 1,
    users: (d && Array.isArray(d.users)) ? d.users : []
  };
}

/** 管理员本机改动（可能不存在） */
export function localOverride() {
  const ov = readJSON('local', OVERRIDE_KEY);
  return (ov && Array.isArray(ov.users)) ? ov : null;
}

/** 当前生效的名单：有本机改动就用本机改动 */
function workingUsers() {
  const ov = localOverride();
  return ov ? ov.users : baseDirectory().users;
}

/** 用于判断仓库名单是否已被他人改动 */
const signature = (users) => directoryFingerprint(users, sha256Hex);

function persistWorking(users) {
  const base = baseDirectory();
  writeJSON('local', OVERRIDE_KEY, {
    version: 1,
    baseFingerprint: signature(base.users),
    updatedAt: new Date().toISOString(),
    users
  });
}

/** 丢弃本机改动，回到仓库里的名单 */
export function discardLocalChanges() {
  dropKey('local', OVERRIDE_KEY);
}

/**
 * 启动时收敛：本机改动若已与仓库名单完全一致，就丢弃覆盖层。
 *
 * 为什么需要这一步：workingUsers() 优先返回覆盖层，所以管理员
 * 「导出 → 提交 → 部署」之后，覆盖层仍然存在。虽然内容一致不会
 * 出错，但一旦仓库那边被别人加了人，覆盖层就会把它遮住。
 * 这里在启动时自动清掉这种「无差别覆盖层」。
 *
 * 注意：只在真的没有差异时才丢弃，有改动时绝不触碰。
 */
export function syncIfClean() {
  const p = pendingChanges();
  if (p.hasOverride && !p.dirty) {
    discardLocalChanges();
    return true;
  }
  return false;
}

/**
 * 本机改动概览
 * @returns {{count:number, dirty:boolean, baseChanged:boolean, hasOverride:boolean}}
 */
export function pendingChanges() {
  const ov = localOverride();
  if (!ov) return { count: 0, dirty: false, baseChanged: false, hasOverride: false };

  const baseMap = new Map(baseDirectory().users.map((u) => [u.username, userSignature(u)]));
  const workSig = new Map(ov.users.map((u) => [u.username, userSignature(u)]));

  let count = 0;
  for (const [name, s] of workSig) {
    if (!baseMap.has(name)) count++;                 // 新增
    else if (baseMap.get(name) !== s) count++;        // 修改
  }
  for (const name of baseMap.keys()) if (!workSig.has(name)) count++;   // 删除

  return {
    count,
    dirty: count > 0,
    baseChanged: ov.baseFingerprint !== signature(baseDirectory().users),
    hasOverride: true
  };
}

/** 全量用户列表（已排序：管理员在前，再按登录名） */
export function listUsers() {
  return workingUsers()
    .map((u) => ({ ...u }))
    .sort((a, b) => {
      if (a.role !== b.role) return a.role === 'admin' ? -1 : 1;
      if (a.active !== b.active) return a.active ? -1 : 1;
      return String(a.username).localeCompare(String(b.username));
    });
}

export function findUser(username) {
  const name = normalizeUsername(username);
  return workingUsers().find((u) => u.username === name) || null;
}

/* ============================================================
   Provider
   ------------------------------------------------------------
   接入后端时实现同样的一组成员，并把 ACTIVE_PROVIDER 指过去。
   所有方法均返回 Promise，这样本地实现与远程实现的调用方式
   完全一致，切换时上层无需改动。
   ============================================================ */
const localProvider = {
  id: 'local',
  label: '本地用户目录（纯前端）',

  async authenticate(username, password, remember) {
    const name = normalizeUsername(username);
    if (!name || !password) return { ok: false, error: '请输入用户名和密码' };

    const user = findUser(name);

    if (!user) {
      // 用户不存在时也跑一次等价开销的哈希，避免用响应时间探测账号是否存在
      verifyPassword(password, { salt: 'decoy-salt', hash: '0'.repeat(64), iterations: DEFAULT_ITERATIONS });
      return { ok: false, error: '用户名或密码不正确' };
    }
    if (!user.active) {
      return { ok: false, error: '该账号已被停用，请联系管理员' };
    }
    if (!verifyPassword(password, user.credential)) {
      return { ok: false, error: '用户名或密码不正确' };
    }

    startSession(user, remember);
    return { ok: true, user };
  },

  async logout() {
    dropKey('local', SESSION_KEY);
    dropKey('session', SESSION_KEY);
  }
};

const ACTIVE_PROVIDER = localProvider;

/** 当前使用的身份提供方信息（展示在登录页，让人清楚数据在哪） */
export function providerInfo() {
  return { id: ACTIVE_PROVIDER.id, label: ACTIVE_PROVIDER.label };
}

/* ============================================================
   会话
   ============================================================ */
function startSession(user, remember) {
  const ttl = remember ? SESSION_TTL_REMEMBER : SESSION_TTL_SESSION;
  const session = {
    username: user.username,
    token: genToken(),
    issuedAt: Date.now(),
    expiresAt: Date.now() + ttl,
    remember: !!remember
  };
  // 勾了「记住我」写 localStorage（关浏览器仍在），否则只写 sessionStorage
  writeJSON(remember ? 'local' : 'session', SESSION_KEY, session);
  return session;
}

export function getSession() {
  const s = readJSON('local', SESSION_KEY) || readJSON('session', SESSION_KEY);
  if (!s || !s.username) return null;
  if (!s.expiresAt || Date.now() > s.expiresAt) {
    clearSession();
    return null;
  }
  return s;
}

function clearSession() {
  dropKey('local', SESSION_KEY);
  dropKey('session', SESSION_KEY);
}

/** 当前登录用户（会顺带校验账号仍然存在且启用） */
export function currentUser() {
  const s = getSession();
  if (!s) return null;
  const u = findUser(s.username);
  if (!u) { clearSession(); return null; }
  if (!u.active) { clearSession(); return null; }
  return u;
}

export function isLoggedIn() { return !!currentUser(); }
export function isAdmin() { const u = currentUser(); return !!u && u.role === 'admin'; }

export async function login(username, password, opts = {}) {
  return ACTIVE_PROVIDER.authenticate(username, password, opts.remember !== false);
}

export async function logout() {
  await ACTIVE_PROVIDER.logout();
}

export function sessionExpiryText() {
  const s = getSession();
  if (!s) return '';
  const days = (s.expiresAt - Date.now()) / 86400000;
  if (days >= 1) return `${Math.floor(days)} 天后过期`;
  const hours = (s.expiresAt - Date.now()) / 3600000;
  if (hours >= 1) return `${Math.floor(hours)} 小时后过期`;
  return '即将过期';
}

/* ============================================================
   用户管理
   ============================================================ */
const adminCount = (users) => users.filter((u) => u.role === 'admin' && u.active).length;

function guardLastAdmin(users, action, name) {
  const target = users.find((u) => u.username === name);
  if (!target) return `找不到用户「${name}」`;
  if (target.role === 'admin' && target.active && adminCount(users) <= 1) {
    return `「${name}」是最后一个可用管理员，不能${action}`;
  }
  return '';
}

export async function createUser({ username, displayName, password, role = 'member', note = '' }) {
  const name = normalizeUsername(username);
  const err = validateUsername(name) || validateDisplayName(displayName) || validatePassword(password, name);
  if (err) return { ok: false, error: err };
  if (!ROLES.includes(role)) return { ok: false, error: `角色非法：${role}` };

  // 只与「当前生效的名单」比对。管理员先在本地删掉某账号、再用同名重建
  // 是合法操作（相当于重置），不该被基线名单挡住。
  const users = workingUsers();
  if (users.some((u) => u.username === name)) {
    return { ok: false, error: `登录名「${name}」已被占用` };
  }

  const actor = currentUser();
  const user = {
    username: name,
    displayName: String(displayName).trim() || name,
    role,
    active: true,
    credential: makeCredential(password),
    mustChangePassword: true,
    createdAt: today(),
    createdBy: actor ? actor.username : 'unknown',
    note: String(note || '').trim()
  };

  persistWorking([...users, user]);
  return { ok: true, user };
}

export async function setUserActive(username, active) {
  const users = workingUsers();
  if (!active) {
    const err = guardLastAdmin(users, '停用', username);
    if (err) return { ok: false, error: err };
    const me = currentUser();
    if (me && me.username === username) return { ok: false, error: '不能停用自己正在使用的账号' };
  }
  if (!users.some((u) => u.username === username)) return { ok: false, error: '找不到该用户' };
  persistWorking(users.map((u) => (u.username === username ? { ...u, active: !!active } : u)));
  return { ok: true };
}

export async function setUserRole(username, role) {
  if (!ROLES.includes(role)) return { ok: false, error: `角色非法：${role}` };
  const users = workingUsers();
  if (role !== 'admin') {
    const err = guardLastAdmin(users, '降为普通用户', username);
    if (err) return { ok: false, error: err };
    const me = currentUser();
    if (me && me.username === username) return { ok: false, error: '不能取消自己的管理员权限' };
  }
  if (!users.some((u) => u.username === username)) return { ok: false, error: '找不到该用户' };
  persistWorking(users.map((u) => (u.username === username ? { ...u, role } : u)));
  return { ok: true };
}

export async function resetPassword(username, password, { mustChange = true } = {}) {
  const users = workingUsers();
  const target = users.find((u) => u.username === username);
  if (!target) return { ok: false, error: '找不到该用户' };
  const err = validatePassword(password, username);
  if (err) return { ok: false, error: err };
  persistWorking(users.map((u) => (u.username === username
    ? { ...u, credential: makeCredential(password), mustChangePassword: !!mustChange }
    : u)));
  return { ok: true };
}

export async function updateProfile(username, { displayName, note }) {
  const users = workingUsers();
  if (!users.some((u) => u.username === username)) return { ok: false, error: '找不到该用户' };
  const err = displayName !== undefined ? validateDisplayName(displayName) : '';
  if (err) return { ok: false, error: err };
  persistWorking(users.map((u) => (u.username === username
    ? {
      ...u,
      displayName: displayName !== undefined ? String(displayName).trim() : u.displayName,
      note: note !== undefined ? String(note).trim() : (u.note || '')
    }
    : u)));
  return { ok: true };
}

export async function removeUser(username) {
  const users = workingUsers();
  const err = guardLastAdmin(users, '删除', username);
  if (err) return { ok: false, error: err };
  const me = currentUser();
  if (me && me.username === username) return { ok: false, error: '不能删除自己正在使用的账号' };
  if (!users.some((u) => u.username === username)) return { ok: false, error: '找不到该用户' };
  persistWorking(users.filter((u) => u.username !== username));
  return { ok: true };
}

/** 用户自己改密码 —— 会校验旧密码 */
export async function changeOwnPassword(oldPassword, newPassword) {
  const me = currentUser();
  if (!me) return { ok: false, error: '尚未登录' };
  if (!verifyPassword(oldPassword, me.credential)) return { ok: false, error: '当前密码不正确' };
  const err = validatePassword(newPassword, me.username);
  if (err) return { ok: false, error: err };
  if (oldPassword === newPassword) return { ok: false, error: '新密码不能与当前密码相同' };

  const users = workingUsers();
  persistWorking(users.map((u) => (u.username === me.username
    ? { ...u, credential: makeCredential(newPassword), mustChangePassword: false }
    : u)));
  return { ok: true };
}

/* ============================================================
   导出：生成可提交的 content/users.js
   ------------------------------------------------------------
   序列化实现放在 userdir.js，与命令行脚本共用同一份代码，
   保证「界面导出的」和「npm run user 写出的」格式完全一致。
   ============================================================ */
export function exportDirectory() {
  return serializeDirectory(workingUsers());
}

/* ============================================================
   按用户隔离的存储命名空间
   ============================================================ */
export function namespaceOf(user) {
  const u = user || currentUser();
  return u ? `u:${u.username}` : 'public';
}
