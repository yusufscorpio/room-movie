/* IndexedDB wrapper for large file storage (videos, images up to 1.5GB) */

const DB_NAME = 'netstream_files';
const DB_VERSION = 1;
const STORE = 'files';

let _db = null;

async function open() {
  if (typeof indexedDB === 'undefined') return null;
  if (_db) return _db;
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = (e) => {
      const db = e.target.result;
      if (!db.objectStoreNames.contains(STORE)) db.createObjectStore(STORE);
    };
    req.onsuccess = (e) => { _db = e.target.result; resolve(_db); };
    req.onerror = (e) => reject(e.target.error);
    req.onblocked = () => reject(new Error('IndexedDB blocked'));
  });
}

export async function put(key, blob) {
  const db = await open();
  if (!db) throw new Error('IndexedDB not available');
  return new Promise((resolve, reject) => {
    const tx = db.transaction([STORE], 'readwrite');
    tx.objectStore(STORE).put(blob, key);
    tx.oncomplete = () => resolve(key);
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error || new Error('Tx aborted'));
  });
}

export async function get(key) {
  const db = await open();
  if (!db) return null;
  return new Promise((resolve, reject) => {
    const tx = db.transaction([STORE], 'readonly');
    const r = tx.objectStore(STORE).get(key);
    r.onsuccess = () => resolve(r.result || null);
    r.onerror = () => reject(r.error);
  });
}

export async function del(key) {
  const db = await open();
  if (!db) return;
  return new Promise((resolve, reject) => {
    const tx = db.transaction([STORE], 'readwrite');
    tx.objectStore(STORE).delete(key);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function clearAll() {
  const db = await open();
  if (!db) return;
  return new Promise((resolve, reject) => {
    const tx = db.transaction([STORE], 'readwrite');
    tx.objectStore(STORE).clear();
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function getURL(key) {
  try {
    const blob = await get(key);
    if (!blob) return null;
    return URL.createObjectURL(blob);
  } catch (e) {
    console.error('IDB getURL error:', e);
    return null;
  }
}

export async function requestPersistent() {
  if (typeof navigator !== 'undefined' && navigator.storage && navigator.storage.persist) {
    try { return await navigator.storage.persist(); } catch { return false; }
  }
  return false;
}

export async function getQuota() {
  if (typeof navigator !== 'undefined' && navigator.storage && navigator.storage.estimate) {
    try {
      const e = await navigator.storage.estimate();
      return {
        usage: e.usage || 0,
        quota: e.quota || 0,
        percent: e.quota ? (e.usage / e.quota * 100) : 0
      };
    } catch { return null; }
  }
  return null;
}

export function genKey(prefix = 'f') {
  return prefix + '_' + Date.now() + '_' + Math.random().toString(36).substring(2, 11);
}

export function isRef(s) {
  return typeof s === 'string' && s.startsWith('idb:');
}

export function refKey(ref) {
  return ref ? ref.slice(4) : '';
}

export function makeRef(key) {
  return 'idb:' + key;
}

export { open };
