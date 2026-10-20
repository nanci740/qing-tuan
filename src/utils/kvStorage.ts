import { showToast } from './toast';

/**
 * 小设定统一放 IndexedDB（qingtuan_kv_v1）。开机先整份读进内存，之后照旧同步读写；
 * 写入在背景排队存进数据库。第一次开机把旧 localStorage 的内容整份搬过来再清掉。
 * 浏览器不给用 IndexedDB 时退回 localStorage，功能不受影响。
 */
const DB_NAME = 'qingtuan_kv_v1';
const STORE = 'kv';

const cache = new Map<string, string>();
const pending = new Map<string, string | null>();
let db: IDBDatabase | null = null;
let fallback = false;
let flushing = false;
let warned = false;

function legacyStorage(): Storage | null { try { return globalThis.localStorage ?? null; } catch { return null; } }

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (!globalThis.indexedDB) { reject(new Error('IndexedDB unavailable')); return; }
    const request = indexedDB.open(DB_NAME, 1);
    const timer = setTimeout(() => reject(new Error('IndexedDB open timed out')), 10000);
    request.onupgradeneeded = () => { if (!request.result.objectStoreNames.contains(STORE)) request.result.createObjectStore(STORE); };
    request.onerror = () => { clearTimeout(timer); reject(request.error ?? new Error('IndexedDB open failed')); };
    request.onblocked = () => { clearTimeout(timer); reject(new Error('IndexedDB blocked')); };
    request.onsuccess = () => { clearTimeout(timer); const opened = request.result; opened.onversionchange = () => opened.close(); resolve(opened); };
  });
}

function done(transaction: IDBTransaction) {
  return new Promise<void>((resolve, reject) => {
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error);
    transaction.onabort = () => reject(transaction.error ?? new Error('IndexedDB aborted'));
  });
}

function scheduleFlush() {
  if (flushing || !db || !pending.size) return;
  flushing = true;
  queueMicrotask(() => {
    const batch = new Map(pending);
    pending.clear();
    let saved: Promise<void>;
    try {
      const transaction = db!.transaction(STORE, 'readwrite');
      const store = transaction.objectStore(STORE);
      for (const [key, value] of batch) { if (value === null) store.delete(key); else store.put(value, key); }
      saved = done(transaction);
    } catch (error) { saved = Promise.reject(error); }
    saved.catch(() => {
      // 没存进去的放回队列，下一次写入时一起重试。
      for (const [key, value] of batch) if (!pending.has(key)) pending.set(key, value);
      if (!warned) { warned = true; showToast('设定没能存进本机，请检查浏览器储存空间'); }
    }).finally(() => { flushing = false; scheduleFlush(); });
  });
}

/** 开机时先等它，再读任何设定。 */
export async function initializeKvStorage() {
  const legacy = legacyStorage();
  try {
    db = await openDb();
    const transaction = db.transaction(STORE, 'readonly');
    const store = transaction.objectStore(STORE);
    const [keys, values] = await Promise.all([store.getAllKeys(), store.getAll()].map(request => new Promise<unknown[]>((resolve, reject) => {
      request.onsuccess = () => resolve(request.result as unknown[]);
      request.onerror = () => reject(request.error);
    })));
    keys.forEach((key, index) => { if (typeof key === 'string' && typeof values[index] === 'string') cache.set(key, values[index] as string); });
  } catch {
    db = null; fallback = true;
    return '';
  }
  if (!legacy?.length) return '';
  // 搬旧资料：数据库里还没有的才搬，存好了才清掉 localStorage。
  const moved: string[] = [];
  const write = db.transaction(STORE, 'readwrite');
  const store = write.objectStore(STORE);
  for (let index = 0; index < legacy.length; index++) {
    const key = legacy.key(index);
    if (key === null) continue;
    moved.push(key);
    if (cache.has(key)) continue;
    const value = legacy.getItem(key);
    if (value === null) continue;
    cache.set(key, value);
    store.put(value, key);
  }
  try {
    await done(write);
    for (const key of moved) try { legacy.removeItem(key); } catch { /* 留着也不影响，下次开机会略过。 */ }
  } catch { /* 这次没搬成，内存里已经有了；下次开机再搬。 */ }
  return '';
}

/** 跟 localStorage 一样用法的同步存取。 */
export const kv = {
  getItem(key: string): string | null {
    if (fallback) return legacyStorage()?.getItem(key) ?? null;
    return cache.has(key) ? cache.get(key)! : null;
  },
  setItem(key: string, value: string) {
    if (fallback) { legacyStorage()?.setItem(key, value); return; }
    const text = String(value);
    cache.set(key, text); pending.set(key, text); scheduleFlush();
  },
  removeItem(key: string) {
    if (fallback) { legacyStorage()?.removeItem(key); return; }
    cache.delete(key); pending.set(key, null); scheduleFlush();
  },
  key(index: number): string | null {
    if (fallback) return legacyStorage()?.key(index) ?? null;
    return [...cache.keys()][index] ?? null;
  },
  get length(): number {
    return fallback ? legacyStorage()?.length ?? 0 : cache.size;
  },
};
