/* ============================================================
   全局状态：学习进度 / 笔记 / 书签 / 高亮 / 偏好
   持久化到 localStorage
   ============================================================ */

const STORAGE_KEY = 'agent-learning-platform:v1';

const DEFAULTS = {
  theme: 'auto',          // auto | light | dark
  path: 'all',            // 当前阅读路径
  progress: {},           // chapterId -> { state, pct, scroll, at }
  notes: [],              // { id, chapterId, anchor, quote, body, at }
  bookmarks: [],          // { id, chapterId, anchor, quote, at }
  highlights: [],         // { id, chapterId, anchor, quote, prefix, suffix, index, at }
  collapsed: {},          // moduleId -> 是否折叠
  recent: [],             // 最近阅读的 chapterId 列表
  lastChapter: null,
  sidebarOpen: false,
  lastSeenVersion: null   // 上次查看更新日志时的版本号，用于提示「有新版本」
};

let state = loadState();
const listeners = new Set();

function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return structuredClone(DEFAULTS);
    const parsed = JSON.parse(raw);
    return {
      ...structuredClone(DEFAULTS),
      ...parsed,
      progress: parsed.progress || {},
      notes: parsed.notes || [],
      bookmarks: parsed.bookmarks || [],
      highlights: parsed.highlights || [],
      collapsed: parsed.collapsed || {},
      recent: parsed.recent || []
    };
  } catch (e) {
    console.warn('[store] 读取本地数据失败，使用默认值', e);
    return structuredClone(DEFAULTS);
  }
}

let saveTimer = null;
function persist() {
  clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch (e) {
      console.warn('[store] 保存失败（可能超出配额）', e);
    }
  }, 120);
}

export function getState() { return state; }

export function subscribe(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

function emit() { listeners.forEach((fn) => { try { fn(state); } catch (e) { console.error(e); } }); }

export function setState(patch, { silent = false } = {}) {
  const next = typeof patch === 'function' ? patch(state) : patch;
  state = { ...state, ...next };
  persist();
  if (!silent) emit();
  return state;
}

/* ---------------- 主题 ---------------- */
export function resolvedTheme() {
  if (state.theme === 'auto') {
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }
  return state.theme;
}

export function applyTheme() {
  const t = resolvedTheme();
  document.documentElement.setAttribute('data-theme', t);
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.setAttribute('content', t === 'dark' ? '#0e0f16' : '#5b5bd6');
  return t;
}

export function cycleTheme() {
  const order = ['auto', 'light', 'dark'];
  const idx = order.indexOf(state.theme);
  const next = order[(idx + 1) % order.length];
  setState({ theme: next });
  applyTheme();
  return next;
}

/* ---------------- 阅读路径 ---------------- */
export function setPath(pathId) { setState({ path: pathId }); }

/* ---------------- 学习进度 ---------------- */
export function getProgress(chapterId) {
  return state.progress[chapterId] || { state: 'none', pct: 0, scroll: 0, at: 0 };
}

export function markReading(chapterId, pct = 0) {
  const cur = getProgress(chapterId);
  if (cur.state === 'done') return cur;
  const next = { ...cur, state: 'reading', pct: Math.max(cur.pct, Math.round(pct)), at: Date.now() };
  setState({ progress: { ...state.progress, [chapterId]: next } }, { silent: true });
  return next;
}

export function saveScroll(chapterId, scroll) {
  const cur = getProgress(chapterId);
  setState({ progress: { ...state.progress, [chapterId]: { ...cur, scroll } } }, { silent: true });
}

export function markDone(chapterId, done = true) {
  const cur = getProgress(chapterId);
  const next = { ...cur, state: done ? 'done' : 'reading', pct: done ? 100 : cur.pct, at: Date.now() };
  setState({ progress: { ...state.progress, [chapterId]: next } });
  return next;
}

export function toggleDone(chapterId) {
  const cur = getProgress(chapterId);
  return markDone(chapterId, cur.state !== 'done');
}

export function pushRecent(chapterId) {
  const recent = [chapterId, ...state.recent.filter((id) => id !== chapterId)].slice(0, 8);
  setState({ recent, lastChapter: chapterId }, { silent: true });
}

export function resetProgress() {
  setState({ progress: {}, recent: [], lastChapter: null });
}

/* ---------------- 笔记 ---------------- */
export function addNote({ chapterId, anchor, quote, body }) {
  const note = { id: `note_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`, chapterId, anchor, quote, body, at: Date.now() };
  setState({ notes: [note, ...state.notes] });
  return note;
}

export function updateNote(id, body) {
  setState({ notes: state.notes.map((n) => (n.id === id ? { ...n, body, at: Date.now() } : n)) });
}

export function removeNote(id) {
  setState({ notes: state.notes.filter((n) => n.id !== id) });
}

export function notesOf(chapterId) {
  return state.notes.filter((n) => n.chapterId === chapterId);
}

/* ---------------- 书签 ---------------- */
export function isBookmarked(chapterId, quote = '') {
  return state.bookmarks.some((b) => b.chapterId === chapterId && b.quote === quote);
}

export function toggleBookmark({ chapterId, anchor, quote = '' }) {
  const exist = state.bookmarks.find((b) => b.chapterId === chapterId && b.quote === quote);
  if (exist) {
    setState({ bookmarks: state.bookmarks.filter((b) => b.id !== exist.id) });
    return false;
  }
  const mark = { id: `bm_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`, chapterId, anchor, quote, at: Date.now() };
  setState({ bookmarks: [mark, ...state.bookmarks] });
  return true;
}

export function removeBookmark(id) {
  setState({ bookmarks: state.bookmarks.filter((b) => b.id !== id) });
}

/* ---------------- 高亮标注 ---------------- */
export function addHighlight(data) {
  const hl = { id: `hl_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`, at: Date.now(), ...data };
  setState({ highlights: [hl, ...state.highlights] });
  return hl;
}

export function removeHighlight(id) {
  setState({ highlights: state.highlights.filter((h) => h.id !== id) });
}

export function highlightsOf(chapterId) {
  return state.highlights.filter((h) => h.chapterId === chapterId);
}

/* ---------------- 模块折叠 ---------------- */
export function toggleCollapsed(moduleId) {
  setState({ collapsed: { ...state.collapsed, [moduleId]: !state.collapsed[moduleId] } });
}

/* ---------------- 更新日志 ---------------- */
export function getLastSeenVersion() { return state.lastSeenVersion; }

export function setLastSeenVersion(version) {
  if (state.lastSeenVersion === version) return;
  setState({ lastSeenVersion: version });
}

/* ---------------- 导出 / 导入 ---------------- */
export function exportData() {
  return JSON.stringify(
    { progress: state.progress, notes: state.notes, bookmarks: state.bookmarks, highlights: state.highlights, exportedAt: new Date().toISOString() },
    null, 2
  );
}

export function importData(json) {
  const data = JSON.parse(json);
  setState({
    progress: data.progress || state.progress,
    notes: data.notes || state.notes,
    bookmarks: data.bookmarks || state.bookmarks,
    highlights: data.highlights || state.highlights
  });
}
