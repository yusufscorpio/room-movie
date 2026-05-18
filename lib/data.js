import { supabase } from './supabase';
import * as IDB from './idb';

// ===== localStorage helpers (device-specific prefs) =====
function lsGet(key) {
  if (typeof window === 'undefined') return null;
  try { return localStorage.getItem(key); } catch { return null; }
}
function lsSet(key, val) {
  if (typeof window === 'undefined') return;
  try { localStorage.setItem(key, val); } catch {}
}
function lsDel(key) {
  if (typeof window === 'undefined') return;
  try { localStorage.removeItem(key); } catch {}
}

// ===== Session ID (anonymous user tracking) =====
function getSessionId() {
  if (typeof window === 'undefined') return 'server';
  let id = lsGet('room_movie_session_id');
  if (!id) {
    id = 'sess_' + Math.random().toString(36).slice(2) + Date.now().toString(36);
    lsSet('room_movie_session_id', id);
  }
  return id;
}

// ===== In-memory caches =====
let _contentCache = null;
let _likesCache = new Set();
let _savesCache = new Set();
let _historyCache = [];
let _notifsCache = [];
let _resolveListeners = [];

// ===== DB row mappers =====
function mapFromDB(row) {
  return {
    id: row.id,
    title: row.title,
    subtitle: row.subtitle || undefined,
    category: row.category,
    desc: row.description || '',
    genres: row.genres || [],
    rating: row.rating,
    year: row.year,
    streams: row.streams,
    image: row.image || '',
    backdrop: row.backdrop || undefined,
    videoType: row.video_type || 'url',
    videoSrc: row.video_src || '',
    tag: row.tag || '',
    createdAt: row.created_at
  };
}

function mapToDB(item) {
  return {
    id: item.id,
    title: item.title,
    subtitle: item.subtitle || null,
    category: item.category || 'movies',
    description: item.desc || null,
    genres: item.genres || [],
    rating: item.rating || null,
    year: item.year || null,
    streams: item.streams || null,
    image: item.image || null,
    backdrop: item.backdrop || null,
    video_type: item.videoType || 'url',
    video_src: item.videoSrc || null,
    tag: item.tag || null,
    created_at: item.createdAt || Date.now()
  };
}

// ===== DEFAULT CONTENT (fallback) =====
const POOL = [
  'https://test-videos.co.uk/vids/bigbuckbunny/mp4/h264/720/Big_Buck_Bunny_720_10s_1MB.mp4',
  'https://www.w3schools.com/html/mov_bbb.mp4',
  'https://download.samplelib.com/mp4/sample-5s.mp4',
  'https://download.blender.org/durian/trailer/sintel_trailer-480p.mp4'
];

export const DEFAULT_CONTENT = [
  { id: 'tears-of-steel-2012', title: 'Tears of Steel', category: 'movies', desc: 'A cinematic open-source short film featuring epic CGI battles between robots and humans on the streets of Amsterdam.', genres: ['Sci-Fi','Action','Drama'], rating: 7.5, year: 2012, streams: '5M+', image: 'https://placehold.co/500x750/0a1f5c/5fb0ff/png?text=TEARS+OF+STEEL%0A2012&font=montserrat', videoType: 'embed', videoSrc: 'https://www.youtube.com/embed/R6MlUcmOul8?autoplay=1&rel=0', tag: 'new' },
  { id: 'c1', title: 'Money Heist', subtitle: 'Part 4', category: 'tv', desc: 'Eight thieves take hostages and lock themselves in the Royal Mint of Spain as a criminal mastermind manipulates the police.', genres: ['Crime','Thriller','Drama'], rating: 8.8, year: 2020, streams: '2B+', image: 'https://image.tmdb.org/t/p/w500/reEMJA1uzscCbkpeRsmI4Lqrkbg.jpg', backdrop: 'https://image.tmdb.org/t/p/original/MoEKaPFHABtA1xKoOteirGaHl1.jpg', videoType: 'url', videoSrc: POOL[0], tag: 'featured' },
  { id: 'c2', title: 'The Mother', category: 'movies', desc: 'A deadly female assassin comes out of hiding to protect the daughter she gave up years before.', genres: ['Action','Thriller'], rating: 5.6, year: 2023, image: 'https://image.tmdb.org/t/p/w500/rUyVRyaO4p6e5VuxtGBvnImrU8X.jpg', videoType: 'url', videoSrc: POOL[1], tag: 'new' },
  { id: 'c3', title: 'The Perfection', category: 'movies', desc: 'When troubled musical prodigy Charlotte seeks out Elizabeth, the encounter sends both down a sinister path.', genres: ['Horror','Mystery','Thriller'], rating: 6.0, year: 2018, image: 'https://image.tmdb.org/t/p/w500/3RYJ0PxYZ2nbUTl4tJDJHGgu1Hl.jpg', videoType: 'url', videoSrc: POOL[2], tag: 'new' },
  { id: 'c6', title: 'The Gray Man', category: 'movies', desc: "When the CIA's most skilled mercenary uncovers agency secrets, he triggers a global hunt by assassins.", genres: ['Action','Thriller'], rating: 6.5, year: 2022, image: 'https://image.tmdb.org/t/p/w500/5Eym0AYHm0qhGMkqGijUDhqG7Vt.jpg', videoType: 'url', videoSrc: POOL[1], tag: 'trending' },
  { id: 'c7', title: 'Peaky Blinders', category: 'tv', desc: 'A gangster family epic set in 1900s England.', genres: ['Crime','Drama'], rating: 8.8, year: 2013, image: 'https://image.tmdb.org/t/p/w500/vUUqzWa2LnHIVqkaKVlVGkVcZIW.jpg', videoType: 'url', videoSrc: POOL[2], tag: 'trending' },
  { id: 'c8', title: 'Shadow and Bone', category: 'tv', desc: 'Dark forces conspire against orphan mapmaker Alina Starkov when she unleashes an extraordinary power.', genres: ['Fantasy','Adventure','Drama'], rating: 7.6, year: 2021, image: 'https://image.tmdb.org/t/p/w500/uXpQLvLD33pX7WZ3FKjUvg1z0Sd.jpg', videoType: 'url', videoSrc: POOL[3], tag: 'trending' },
];

// ===== BOOT =====
export async function resolveAll() {
  const sessionId = getSessionId();

  const [contentRes, likesRes, savesRes, historyRes, notifRes] = await Promise.all([
    supabase.from('content').select('*').order('created_at', { ascending: false }),
    supabase.from('likes').select('content_id').eq('session_id', sessionId),
    supabase.from('saves').select('content_id').eq('session_id', sessionId),
    supabase.from('history').select('content_id, watched_at').eq('session_id', sessionId).order('watched_at', { ascending: false }).limit(50),
    supabase.from('notifications').select('*').order('created_at', { ascending: false }).limit(50)
  ]);

  if (contentRes.data && contentRes.data.length > 0) {
    _contentCache = contentRes.data.map(mapFromDB);
  } else {
    _contentCache = JSON.parse(JSON.stringify(DEFAULT_CONTENT));
    if (!contentRes.error) {
      supabase.from('content').insert(_contentCache.map(mapToDB)).then(() => {});
    }
  }

  for (const item of _contentCache) {
    if (IDB.isRef(item.image)) {
      const url = await IDB.getURL(IDB.refKey(item.image));
      if (url) item._imageURL = url;
    }
    if (IDB.isRef(item.backdrop)) {
      const url = await IDB.getURL(IDB.refKey(item.backdrop));
      if (url) item._backdropURL = url;
    }
  }

  _likesCache = new Set((likesRes.data || []).map(x => x.content_id));
  _savesCache = new Set((savesRes.data || []).map(x => x.content_id));
  _historyCache = (historyRes.data || []).map(x => ({ id: x.content_id, at: x.watched_at }));
  _notifsCache = (notifRes.data || []).map(r => ({ id: r.id, message: r.message, type: r.type, createdAt: r.created_at }));

  _resolveListeners.forEach(fn => fn(_contentCache));
  return _contentCache;
}

export function onResolve(fn) {
  _resolveListeners.push(fn);
  return () => { _resolveListeners = _resolveListeners.filter(x => x !== fn); };
}

export function runMigrations() {}

// ===== SYNC READS (from cache) =====
export function getAll() { return _contentCache || []; }
export function getById(id) { return getAll().find(i => i.id === id); }
export function getByCategory(cat) { return getAll().filter(i => i.category === cat); }
export function getByTag(tag) { return getAll().filter(i => i.tag === tag); }

export function search(q) {
  if (!q || !q.trim()) return [];
  const term = q.toLowerCase().trim();
  return getAll().filter(i =>
    (i.title && i.title.toLowerCase().includes(term)) ||
    (i.desc && i.desc.toLowerCase().includes(term)) ||
    (i.genres && i.genres.some(g => g.toLowerCase().includes(term)))
  );
}

// ===== ASYNC WRITES =====
export async function add(item) {
  item.id = 'c' + Date.now() + Math.floor(Math.random() * 1000);
  item.createdAt = Date.now();
  const { error } = await supabase.from('content').insert(mapToDB(item));
  if (error) { console.error('add error:', error); return null; }
  _contentCache = [item, ...(_contentCache || [])];
  return item;
}

export async function update(id, patch) {
  const idx = (_contentCache || []).findIndex(i => i.id === id);
  if (idx === -1) return null;
  const updated = { ..._contentCache[idx], ...patch, id };
  const { error } = await supabase.from('content').update(mapToDB(updated)).eq('id', id);
  if (error) { console.error('update error:', error); return null; }
  _contentCache[idx] = updated;
  return updated;
}

export async function remove(id) {
  const target = (_contentCache || []).find(i => i.id === id);
  if (!target) return false;
  if (IDB.isRef(target.image)) { try { await IDB.del(IDB.refKey(target.image)); } catch {} }
  if (IDB.isRef(target.backdrop)) { try { await IDB.del(IDB.refKey(target.backdrop)); } catch {} }
  if (IDB.isRef(target.videoSrc)) { try { await IDB.del(IDB.refKey(target.videoSrc)); } catch {} }
  const { error } = await supabase.from('content').delete().eq('id', id);
  if (error) { console.error('remove error:', error); return false; }
  _contentCache = (_contentCache || []).filter(i => i.id !== id);
  return true;
}

export async function reset() {
  try { await IDB.clearAll(); } catch {}
  await supabase.from('content').delete().neq('id', '');
  _contentCache = null;
  await resolveAll();
}

// ===== IMAGE / VIDEO HELPERS =====
export function imgSrc(item) {
  if (!item) return '';
  if (item._imageURL) return item._imageURL;
  if (IDB.isRef(item.image)) return '';
  return item.image || '';
}

export function backdropSrc(item) {
  if (!item) return '';
  if (item._backdropURL) return item._backdropURL;
  if (IDB.isRef(item.backdrop)) return '';
  return item.backdrop || item.image || '';
}

export async function videoSrc(item) {
  if (!item) return '';
  if (IDB.isRef(item.videoSrc)) return await IDB.getURL(IDB.refKey(item.videoSrc));
  return item.videoSrc || '';
}

// ===== EXPORT / IMPORT =====
export function exportJSON() {
  return JSON.stringify({ version: 2, exportedAt: new Date().toISOString(), content: _contentCache || [] }, null, 2);
}

export async function importJSON(jsonStr) {
  try {
    const obj = JSON.parse(jsonStr);
    if (!obj.content || !Array.isArray(obj.content)) throw new Error('invalid');
    await supabase.from('content').delete().neq('id', '');
    const { error } = await supabase.from('content').insert(obj.content.map(mapToDB));
    if (error) return false;
    _contentCache = null;
    await resolveAll();
    return true;
  } catch { return false; }
}

// ===== LIKES =====
export function toggleLike(id) {
  const session = getSessionId();
  if (_likesCache.has(id)) {
    _likesCache.delete(id);
    supabase.from('likes').delete().match({ session_id: session, content_id: id }).then(() => {});
    return false;
  } else {
    _likesCache.add(id);
    supabase.from('likes').insert({ session_id: session, content_id: id }).then(() => {});
    return true;
  }
}
export function isLiked(id) { return _likesCache.has(id); }
export function getLikedItems() { return getAll().filter(i => _likesCache.has(i.id)); }

// ===== SAVES =====
export function toggleSave(id) {
  const session = getSessionId();
  if (_savesCache.has(id)) {
    _savesCache.delete(id);
    supabase.from('saves').delete().match({ session_id: session, content_id: id }).then(() => {});
    return false;
  } else {
    _savesCache.add(id);
    supabase.from('saves').insert({ session_id: session, content_id: id }).then(() => {});
    return true;
  }
}
export function isSaved(id) { return _savesCache.has(id); }
export function getSavedItems() { return getAll().filter(i => _savesCache.has(i.id)); }

// ===== HISTORY =====
export const HISTORY_KEY = 'room_movie_history_local';
const HISTORY_MAX = 50;

export function addToHistory(id) {
  const session = getSessionId();
  _historyCache = [{ id, at: Date.now() }, ..._historyCache.filter(x => x.id !== id)].slice(0, HISTORY_MAX);
  supabase.from('history').upsert({ session_id: session, content_id: id, watched_at: Date.now() }).then(() => {});
}

export function getHistoryRaw() { return _historyCache; }
export function getHistoryItems() { return _historyCache.map(x => getById(x.id)).filter(Boolean); }

export async function clearHistory() {
  const session = getSessionId();
  _historyCache = [];
  await supabase.from('history').delete().eq('session_id', session);
}

// ===== NOTIFICATIONS =====
export function getNotifications() { return _notifsCache; }

export function addNotification(message, type = 'info') {
  const m = (message || '').trim();
  if (!m) return null;
  const item = { id: 'n_' + Date.now() + '_' + Math.random().toString(36).slice(2, 8), message: m, type, createdAt: Date.now() };
  _notifsCache = [item, ..._notifsCache].slice(0, 50);
  supabase.from('notifications').insert({ id: item.id, message: m, type, created_at: item.createdAt }).then(() => {});
  return item;
}

export function deleteNotification(id) {
  _notifsCache = _notifsCache.filter(n => n.id !== id);
  supabase.from('notifications').delete().eq('id', id).then(() => {});
}

export function clearAllNotifications() {
  _notifsCache = [];
  lsDel('room_movie_notif_read_v1');
  supabase.from('notifications').delete().neq('id', '').then(() => {});
}

const NOTIF_READ_KEY = 'room_movie_notif_read_v1';
function getReadIdsSet() {
  try { return new Set(JSON.parse(lsGet(NOTIF_READ_KEY) || '[]')); } catch { return new Set(); }
}
export function markNotifAsRead(id) {
  const read = getReadIdsSet(); read.add(id);
  lsSet(NOTIF_READ_KEY, JSON.stringify(Array.from(read)));
}
export function markAllNotifsAsRead() { lsSet(NOTIF_READ_KEY, JSON.stringify(_notifsCache.map(n => n.id))); }
export function getUnreadNotifCount() { const read = getReadIdsSet(); return _notifsCache.filter(n => !read.has(n.id)).length; }
export function isNotifRead(id) { return getReadIdsSet().has(id); }

// ===== USER AUTH =====
function hashPwd(pwd) {
  let h = 5381;
  for (let i = 0; i < pwd.length; i++) h = ((h << 5) + h) + pwd.charCodeAt(i);
  return String(h >>> 0);
}

const CURRENT_USER_KEY = 'room_movie_current_user_v1';

export async function registerUser(username, password) {
  const u = (username || '').trim();
  if (!u) return { ok: false, err: 'Username kosong' };
  if (!password || password.length < 4) return { ok: false, err: 'Password minimal 4 karakter' };
  const { data: existing } = await supabase.from('app_users').select('id').ilike('username', u).maybeSingle();
  if (existing) return { ok: false, err: 'Username sudah terdaftar' };
  const { error } = await supabase.from('app_users').insert({ username: u, password: hashPwd(password), created_at: Date.now() });
  if (error) return { ok: false, err: 'Gagal mendaftar, coba lagi' };
  lsSet(CURRENT_USER_KEY, u);
  return { ok: true, username: u };
}

export async function loginUser(username, password) {
  const u = (username || '').trim();
  const { data: found } = await supabase.from('app_users').select('username, password').ilike('username', u).maybeSingle();
  if (!found || found.password !== hashPwd(password)) return { ok: false, err: 'Username atau password salah' };
  lsSet(CURRENT_USER_KEY, found.username);
  return { ok: true, username: found.username };
}

export function logoutUser() { lsDel(CURRENT_USER_KEY); }
export function getCurrentUser() { return lsGet(CURRENT_USER_KEY) || null; }

// ===== ADMIN CREDENTIALS (localStorage) =====
const CRED_KEY = 'netstream_admin_cred_v1';
export const DEFAULT_CRED = { username: 'admin', password: 'netflix2026' };
export function getCred() {
  const raw = lsGet(CRED_KEY);
  if (!raw) return { ...DEFAULT_CRED };
  try { return JSON.parse(raw); } catch { return { ...DEFAULT_CRED }; }
}
export function setCred(username, password) { lsSet(CRED_KEY, JSON.stringify({ username, password })); }
export function verifyCred(username, password) { const c = getCred(); return c.username === username && c.password === password; }

// ===== WATCH PROGRESS (localStorage - device-specific) =====
const PROGRESS_KEY = 'room_movie_progress_v1';
export function getProgress(id) {
  try { const all = JSON.parse(lsGet(PROGRESS_KEY) || '{}'); return all[id] || null; } catch { return null; }
}
export function setProgress(id, time, duration) {
  if (!id || !duration || time == null) return;
  try { const all = JSON.parse(lsGet(PROGRESS_KEY) || '{}'); all[id] = { time, duration, updatedAt: Date.now() }; lsSet(PROGRESS_KEY, JSON.stringify(all)); } catch {}
}
export function clearProgress(id) {
  try { const all = JSON.parse(lsGet(PROGRESS_KEY) || '{}'); delete all[id]; lsSet(PROGRESS_KEY, JSON.stringify(all)); } catch {}
}
export function getContinueWatching() {
  let all = {};
  try { all = JSON.parse(lsGet(PROGRESS_KEY) || '{}'); } catch {}
  return getAll().map(item => {
    const p = all[item.id];
    if (!p || !p.duration) return null;
    const percent = (p.time / p.duration) * 100;
    if (percent < 5 || percent > 95) return null;
    return { ...item, _progress: { time: p.time, duration: p.duration, percent, updatedAt: p.updatedAt } };
  }).filter(Boolean).sort((a, b) => b._progress.updatedAt - a._progress.updatedAt);
}

// ===== LANGUAGE / SUBTITLE =====
const LANG_KEY = 'room_movie_lang_v1';
export function getLang() { return lsGet(LANG_KEY) || 'id'; }
export function setLang(v) { lsSet(LANG_KEY, v); }
const SUB_KEY = 'room_movie_subtitle_v1';
export function getSubtitle() { return lsGet(SUB_KEY) || 'off'; }
export function setSubtitle(v) { lsSet(SUB_KEY, v); }

// ===== TOP 10 =====
export function getTop10() {
  const playCount = {};
  const now = Date.now();
  _historyCache.forEach(h => {
    const ageDays = (now - (h.at || now)) / 86400000;
    const weight = Math.max(0.3, 1 - ageDays / 30);
    playCount[h.id] = (playCount[h.id] || 0) + weight;
  });
  return getAll().map(item => {
    const score = (playCount[item.id] || 0) * 3 + (_likesCache.has(item.id) ? 3 : 0) + (_savesCache.has(item.id) ? 2 : 0) +
      (item.rating || 5) / 2.5 + (item.tag === 'trending' ? 2 : 0) + (item.tag === 'featured' ? 4 : 0);
    return { item, score };
  }).filter(x => x.score > 0).sort((a, b) => b.score - a.score).slice(0, 10).map(x => x.item);
}

export const LIKES_KEY = 'likes';
export const SAVES_KEY = 'saves';
