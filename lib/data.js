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
    duration: row.duration || '',
    quality: row.quality || 'HD',
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
export const DEFAULT_CONTENT = [
  { id: 'inception-2010', title: 'Inception', category: 'movies', desc: 'A thief who steals corporate secrets through dream-sharing technology is given the task of planting an idea into the mind of a C.E.O.', genres: ['Action','Sci-Fi','Thriller'], rating: 8.8, year: 2010, duration: '2:30', quality: 'HD', streams: '500M+', image: 'https://image.tmdb.org/t/p/w500/9gk7adHYeDvHkCSEqAvQNLV5Uge.jpg', backdrop: 'https://image.tmdb.org/t/p/original/s3TBrRGB1iav7gFOCNx3H31MoES.jpg', videoType: 'embed', videoSrc: 'https://www.youtube.com/embed/YoHD9XEInc0?vq=hd1080&hd=1&rel=0', tag: 'trending', createdAt: 1747500001000 },
  { id: 'dark-knight-2008', title: 'The Dark Knight', category: 'movies', desc: 'When the Joker wreaks havoc on Gotham, Batman must face his greatest psychological and physical test to fight injustice.', genres: ['Action','Crime','Drama'], rating: 9.0, year: 2008, duration: '2:31', quality: 'HD', streams: '800M+', image: 'https://image.tmdb.org/t/p/w500/qJ2tW6WMUDux911r6m7haRef0WH.jpg', backdrop: 'https://image.tmdb.org/t/p/original/hkBaDkMWbLaf8B1lsLMdvqg4bSu.jpg', videoType: 'embed', videoSrc: 'https://www.youtube.com/embed/EXeTwQWrcwY?vq=hd1080&hd=1&rel=0', tag: 'trending', createdAt: 1747500002000 },
  { id: 'avengers-endgame-2019', title: 'Avengers: Endgame', category: 'movies', desc: 'The Avengers assemble once more to reverse Thanos actions and restore balance to the universe.', genres: ['Action','Adventure','Sci-Fi'], rating: 8.4, year: 2019, duration: '2:24', quality: 'HD', streams: '1B+', image: 'https://image.tmdb.org/t/p/w500/or06FN3Dka5tukK1e9sl16pB3iy.jpg', backdrop: 'https://image.tmdb.org/t/p/original/7RyHsXyqiiTe4r1ATRm11g0iX1R.jpg', videoType: 'embed', videoSrc: 'https://www.youtube.com/embed/TcMBFSGVi1c?vq=hd1080&hd=1&rel=0', tag: 'featured', createdAt: 1747500003000 },
  { id: 'parasite-2019', title: 'Parasite', category: 'movies', desc: 'Greed and class discrimination threaten the newly formed symbiotic relationship between the wealthy Park family and the destitute Kim clan.', genres: ['Comedy','Drama','Thriller'], rating: 8.5, year: 2019, duration: '2:13', quality: 'HD', streams: '200M+', image: 'https://image.tmdb.org/t/p/w500/7IiTTgloJzvGI1TAYymCfbfl3vT.jpg', backdrop: 'https://image.tmdb.org/t/p/original/TU9NIjwzjoKPwQHoHshkFcQUCG.jpg', videoType: 'embed', videoSrc: 'https://www.youtube.com/embed/5xH0HfJHsaY?vq=hd1080&hd=1&rel=0', tag: 'new', createdAt: 1747500004000 },
  { id: 'joker-2019', title: 'Joker', category: 'movies', desc: 'In Gotham City, mentally troubled comedian Arthur Fleck embarks on a downward spiral of revolution and bloody crime that transforms him into the Joker.', genres: ['Crime','Drama','Thriller'], rating: 8.4, year: 2019, duration: '2:24', quality: 'HD', streams: '600M+', image: 'https://image.tmdb.org/t/p/w500/udDclJoHjfjb8Ekgsd4FDteOkCU.jpg', backdrop: 'https://image.tmdb.org/t/p/original/n6bUvigpRFqSwmPp1m2YADdbRBc.jpg', videoType: 'embed', videoSrc: 'https://www.youtube.com/embed/zAGVQLHvwOY?vq=hd1080&hd=1&rel=0', tag: 'trending', createdAt: 1747500005000 },
  { id: 'dune-2021', title: 'Dune', category: 'movies', desc: 'A noble family becomes embroiled in a war for control over the most valuable asset in the galaxy while its heir is troubled by visions of a dark future.', genres: ['Action','Adventure','Sci-Fi'], rating: 8.0, year: 2021, duration: '3:01', quality: 'HD', streams: '400M+', image: 'https://image.tmdb.org/t/p/w500/d5NXSklXo0qyIYkgV25BEwcaEIs.jpg', backdrop: 'https://image.tmdb.org/t/p/original/iopYFB1b6Bh7FWZh3onQhph1sih.jpg', videoType: 'embed', videoSrc: 'https://www.youtube.com/embed/8g18jFHCLXk?vq=hd1080&hd=1&rel=0', tag: 'new', createdAt: 1747500006000 },
  { id: 'top-gun-maverick-2022', title: 'Top Gun: Maverick', category: 'movies', desc: 'After thirty years, Maverick must confront ghosts of his past when he leads Top Gun elite graduates on a mission that demands the ultimate sacrifice.', genres: ['Action','Drama'], rating: 8.3, year: 2022, duration: '2:00', quality: 'HD', streams: '700M+', image: 'https://image.tmdb.org/t/p/w500/62HCnUTziyWcpDaBO2i1DX17ljH.jpg', backdrop: 'https://image.tmdb.org/t/p/original/odJ4hx6g6vBt4lBWKFD1tI8WS4x.jpg', videoType: 'embed', videoSrc: 'https://www.youtube.com/embed/qSqVVswa420?vq=hd1080&hd=1&rel=0', tag: 'trending', createdAt: 1747500007000 },
  { id: 'the-batman-2022', title: 'The Batman', category: 'movies', desc: 'When a sadistic serial killer begins murdering key political figures in Gotham, Batman investigates the city hidden corruption and questions his family involvement.', genres: ['Action','Crime','Drama'], rating: 7.9, year: 2022, duration: '2:55', quality: 'HD', streams: '350M+', image: 'https://image.tmdb.org/t/p/w500/74xTEgt7R36Fpooo50r9T25onhq.jpg', backdrop: 'https://image.tmdb.org/t/p/original/5P8SmMzik2wNebOHgOFiPxb4EYZ.jpg', videoType: 'embed', videoSrc: 'https://www.youtube.com/embed/mqqft2x_Aa4?vq=hd1080&hd=1&rel=0', tag: 'new', createdAt: 1747500008000 },
  { id: 'spiderman-no-way-home-2021', title: 'Spider-Man: No Way Home', category: 'movies', desc: 'When Spider-Man identity is revealed, Peter asks Doctor Strange for help. A spell goes wrong and dangerous foes from other worlds start to appear.', genres: ['Action','Adventure','Sci-Fi'], rating: 8.3, year: 2021, duration: '2:55', quality: 'HD', streams: '900M+', image: 'https://image.tmdb.org/t/p/w500/1g0dhYtq4irTY1GPXvft6k4YLjm.jpg', backdrop: 'https://image.tmdb.org/t/p/original/iQFcwSGbZXMkeyKrxbPnwnRo5fl.jpg', videoType: 'embed', videoSrc: 'https://www.youtube.com/embed/JfVOs4VSpmA?vq=hd1080&hd=1&rel=0', tag: 'featured', createdAt: 1747500009000 },
  { id: 'interstellar-2014', title: 'Interstellar', category: 'movies', desc: 'A team of explorers travel through a wormhole in space in an attempt to ensure humanity survival on a dying Earth.', genres: ['Adventure','Drama','Sci-Fi'], rating: 8.6, year: 2014, duration: '2:30', quality: 'HD', streams: '600M+', image: 'https://image.tmdb.org/t/p/w500/gEU2QniE6E77NI6lCU6MxlNBvIx.jpg', backdrop: 'https://image.tmdb.org/t/p/original/xJHokMbljvjADYdit5fK5VQsXEG.jpg', videoType: 'embed', videoSrc: 'https://www.youtube.com/embed/zSWdZVtXT7E?vq=hd1080&hd=1&rel=0', tag: 'trending', createdAt: 1747500010000 },

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
