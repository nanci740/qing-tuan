import type { StoredForwardRecord } from '../types/chatForwardRecords';
import { loadLegacyForwardRecords, validateForwardRecord, validateForwardRecords } from './chatForwardRecords.ts';
import type { ForwardRecordsStorage } from './chatForwardRecords.ts';

export interface ChatRecord {html: string; lastTime: number;}
const LEGACY_HISTORY = 'smallphone_chat_histories_v1';
const LEGACY_TIMES = 'smallphone_chat_last_times_v1';
const LEGACY_DRAFTS = 'smallphone_chat_drafts_v1';
const DB_NAME = 'qingtuan_chat_records_v1';
const FORWARD_MIGRATED = 'forwards-legacy-migrated';
export const CHAT_RECORDS_BLOCKED_MESSAGE = '请关闭其他青团机页面后重试';
let forwards: ForwardRecordsStorage = Object.create(null);
let forwardsInitialized = false;
let records: Record<string, ChatRecord> = {};
let drafts: Record<string, string> = {};
let committed: Record<string, ChatRecord> = {};
let initialized = false;
const sentDrafts = new Map<string, number>();
let sentRevision = 0;
let queue: Promise<unknown> = Promise.resolve();

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (!window.indexedDB) return reject(new Error('当前环境不支持聊天记录存储'));
    const request = indexedDB.open(DB_NAME, 2);
    let blocked = false;
    request.onupgradeneeded = () => {
      for (const name of ['chats', 'drafts', 'meta']) {
        if (!request.result.objectStoreNames.contains(name)) request.result.createObjectStore(name);
      }
      if (!request.result.objectStoreNames.contains('forwards')) request.result.createObjectStore('forwards', {keyPath: 'id'});
    };
    request.onblocked = () => {blocked = true;reject(new Error(CHAT_RECORDS_BLOCKED_MESSAGE));};
    request.onerror = () => reject(request.error || new Error('聊天记录存储开启失败'));
    request.onsuccess = () => {if (blocked) request.result.close();else resolve(request.result);};
  });
}
async function transaction<T>(stores: string[], mode: IDBTransactionMode, action: (tx: IDBTransaction, result: (value: T) => void) => void): Promise<T> {
  const db = await openDb();
  try {
    return await new Promise<T>((resolve, reject) => {
      const tx = db.transaction(stores, mode);
      let value: T;
      tx.oncomplete = () => resolve(value);
      tx.onerror = tx.onabort = () => reject(tx.error || new Error('聊天记录存储操作失败'));
      try {action(tx, next => {value = next;});}
      catch (error) {try {tx.abort();} catch {} reject(error);}
    });
  } finally {db.close();}
}
function serialize<T>(action: () => Promise<T>): Promise<T> {
  const next = queue.then(action);
  queue = next.catch(() => {});
  return next;
}
function legacyMap(key: string): Record<string, unknown> {
  const value: unknown = JSON.parse(localStorage.getItem(key) || '{}');
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('旧聊天数据格式异常，请先备份原数据');
  return value as Record<string, unknown>;
}
function assertReady() {if (!initialized) throw new Error('聊天记录存储尚未准备好');}

/** 两个读取请求完成时仍处于活动事务中，可原子地重查迁移标记并写入整份旧资料。 */
async function forwardTransaction<T>(mode: IDBTransactionMode,
  work: (tx: IDBTransaction, rows: unknown[], migrated: boolean) => T): Promise<T> {
  let cause: unknown;
  try {
    return await transaction<T>(['forwards', 'meta'], mode, (tx, result) => {
      let rows: unknown[] = [], marker: unknown, remaining = 2;
      const finish = () => {
        if (--remaining) return;
        try {
          if (marker !== undefined && marker !== false && marker !== true) throw new Error('转发记录迁移标记异常');
          result(work(tx, rows, marker === true));
        } catch (error) {cause = error;tx.abort();}
      };
      const entries = tx.objectStore('forwards').getAll();
      entries.onsuccess = () => {rows = entries.result;finish();};
      const migrated = tx.objectStore('meta').get(FORWARD_MIGRATED);
      migrated.onsuccess = () => {marker = migrated.result;finish();};
    });
  } catch (error) {throw cause ?? error;}
}
async function initializeForwardRecords(): Promise<void> {
  forwardsInitialized = false;
  const loaded = await forwardTransaction('readonly', (_tx, rows, migrated) => ({records: validateForwardRecords(rows), migrated}));
  let ready = loaded.records;
  if (!loaded.migrated) {
    // 有资料时不得拿旧副本覆盖；同时初始化的分页也必须在写入事务内再次检查。
    const legacy = Object.keys(ready).length ? null : loadLegacyForwardRecords();
    ready = await forwardTransaction('readwrite', (tx, rows, migrated) => {
      const existing = validateForwardRecords(rows);
      if (migrated) return existing;
      let next = existing;
      if (!rows.length) {
        if (legacy === null) throw new Error('转发记录初始化时发生变化，请重新打开');
        for (const record of Object.values(legacy)) tx.objectStore('forwards').add(record);
        next = legacy;
      }
      tx.objectStore('meta').put(true, FORWARD_MIGRATED);
      return next;
    });
  }
  forwards = ready; forwardsInitialized = true;
}

/** Migrate all three legacy keys in one transaction. Never remove legacy data before commit. */
export async function initializeChatRecords(): Promise<string> {
  const loaded = await transaction<{records: Record<string, ChatRecord>; drafts: Record<string, string>; migrated: boolean}>(['chats', 'drafts', 'meta'], 'readonly', (tx, result) => {
    const value = {records: Object.create(null) as Record<string, ChatRecord>, drafts: Object.create(null) as Record<string, string>, migrated: false};
    result(value);
    for (const name of ['chats', 'drafts'] as const) {
      const request = tx.objectStore(name).openCursor();
      request.onsuccess = () => {
        const cursor = request.result;
        if (!cursor) return;
        if (name === 'chats') value.records[String(cursor.key)] = cursor.value;
        else value.drafts[String(cursor.key)] = cursor.value;
        cursor.continue();
      };
    }
    const marker = tx.objectStore('meta').get('legacy-migrated');
    marker.onsuccess = () => {value.migrated = marker.result === true;};
  });
  if (!loaded.migrated) {
    const histories = legacyMap(LEGACY_HISTORY), times = legacyMap(LEGACY_TIMES), oldDrafts = legacyMap(LEGACY_DRAFTS);
    for (const key of new Set([...Object.keys(histories), ...Object.keys(times)])) {
      if (typeof histories[key] !== 'string' && histories[key] !== undefined) throw new Error('旧聊天记录格式异常，请先备份原数据');
      if (!Object.hasOwn(loaded.records, key)) loaded.records[key] = {html: String(histories[key] || ''), lastTime: Number(times[key]) || 0};
    }
    for (const [key, text] of Object.entries(oldDrafts)) {
      if (!Object.hasOwn(loaded.drafts, key) && text) loaded.drafts[key] = String(text);
    }
    await transaction<void>(['chats', 'drafts', 'meta'], 'readwrite', tx => {
      for (const [key, record] of Object.entries(loaded.records)) tx.objectStore('chats').put(record, key);
      for (const [key, text] of Object.entries(loaded.drafts)) tx.objectStore('drafts').put(text, key);
      tx.objectStore('meta').put(true, 'legacy-migrated');
    });
  }
  let forwardWarning = '';
  try {await initializeForwardRecords();}
  catch (error) {
    forwardWarning = error instanceof Error && error.message === CHAT_RECORDS_BLOCKED_MESSAGE
      ? CHAT_RECORDS_BLOCKED_MESSAGE : '转发记录暂时无法读取，原来的资料已保留';
  }
  records = loaded.records; committed = {...records}; drafts = loaded.drafts; initialized = true;
  try {for (const key of [LEGACY_HISTORY, LEGACY_TIMES, LEGACY_DRAFTS]) localStorage.removeItem(key);}
  catch {return [forwardWarning, '聊天数据已迁移，旧数据清理未完成；下次打开会重试'].filter(Boolean).join('；');}
  return forwardWarning;
}
export function readChatRecords() {
  assertReady();
  return {histories: Object.fromEntries(Object.entries(records).map(([key, record]) => [key, record.html])), times: Object.fromEntries(Object.entries(records).map(([key, record]) => [key, record.lastTime]))};
}
/** Capture this save's values immediately; later role switches must not change queued writes. */
export function saveChatRecords(histories: Record<string, string>, times: Record<string, number>): Promise<void> {
  assertReady();
  const snapshot = Object.fromEntries(Object.entries(histories).map(([key, html]) => [key, {html, lastTime: Number(times[key]) || 0}]));
  records = snapshot;
  const clearing = [...sentDrafts.entries()].filter(([key]) => Object.hasOwn(snapshot, key));
  return serialize(async () => {
    const changes = Object.entries(snapshot).filter(([key, record]) => !Object.hasOwn(committed, key) || committed[key].html !== record.html || committed[key].lastTime !== record.lastTime);
    const removed = Object.keys(committed).filter(key => !Object.hasOwn(snapshot, key));
    if (!changes.length && !removed.length && !clearing.length) return;
    await transaction<void>(['chats', 'drafts'], 'readwrite', tx => {
      for (const [key, record] of changes) tx.objectStore('chats').put(record, key);
      for (const key of removed) tx.objectStore('chats').delete(key);
      for (const [key] of clearing) tx.objectStore('drafts').delete(key);
    });
    committed = snapshot;
    for (const [key, revision] of clearing) if (sentDrafts.get(key) === revision) sentDrafts.delete(key);
  });
}
export function readStoredDraft(key: string): string {assertReady();return drafts[key] || '';}
export function saveStoredDraft(key: string, text: string): Promise<void> {
  assertReady();
  sentDrafts.delete(key);
  if (text) drafts[key] = text;else delete drafts[key];
  return serialize(() => transaction<void>(['drafts'], 'readwrite', tx => {
    if (text) tx.objectStore('drafts').put(text, key);else tx.objectStore('drafts').delete(key);
  }));
}
/** Clear the draft in storage only in the transaction that saves the sent message. */
export function markChatDraftSent(key: string) {
  assertReady();delete drafts[key];sentDrafts.set(key, ++sentRevision);
}
/** 卡片同步读取开机预载的缓存，不在点击时访问数据库或 localStorage。 */
export function readStoredForwardRecord(id: string): StoredForwardRecord | undefined {
  assertReady();return forwards[id];
}
/** 立即供本次会话读取，后台仅新增这一条；写入失败交由调用方提示，不覆盖旧资料。 */
export function saveStoredForwardRecord(record: StoredForwardRecord): Promise<void> {
  assertReady();
  const snapshot = validateForwardRecord(record);
  if (Object.hasOwn(forwards, snapshot.id)) return Promise.reject(new Error('转发记录编号重复'));
  forwards[snapshot.id] = snapshot;
  if (!forwardsInitialized) return Promise.reject(new Error('转发记录存储尚未准备好，原来的资料已保留'));
  return serialize(() => transaction<void>(['forwards'], 'readwrite', tx => {
    tx.objectStore('forwards').add(snapshot);
  }));
}
/** Wait for queued operations to settle; individual callers still receive their write errors. */
export async function waitForChatWrites() {await queue;}
