import { flushKv, kv, replaceKv } from './kvStorage';

/** 整机备份：kv 里的小设定加上各个 IndexedDB 资料库，存成一个 JSON 文件。
    前面那些（聊天、角色、记忆、日记、设置、美化……）一定会带；图片和表情、语音、音乐、API Key 可以选。
    还原时整份换掉：没带进备份的那几类也会清空；只有 API Key 例外，没带的话沿用这台手机现在的。 */
export type BackupPart = 'images' | 'voice' | 'music' | 'keys';
export type BackupInclude = Record<BackupPart, boolean>;
export interface BackupStats { characters: number; messages: number; images: number; tracks: number }
interface StoreInfo { name: string; keyPath: string | string[] | null; autoIncrement: boolean }
interface DbInfo { name: string; version: number; stores: StoreInfo[] }
interface BackupHeader { app: 'qingtuan-backup'; version: 1; at: number; include: BackupInclude; stats: BackupStats; dbs: DbInfo[] }
export interface BackupFile { header: BackupHeader; kv: Record<string, string>; rows: [db: number, store: string, key: unknown, value: unknown][] }

const DBS: { name: string; part?: BackupPart }[] = [
  { name: 'qingtuan_chat_records_v1' }, { name: 'QingTuanDB' }, { name: 'QingTuanSpaceDB' }, { name: 'smallphone_custom_font_db' },
  { name: 'qingtuan_image_assets_v1', part: 'images' }, { name: 'qingtuan_chat_photos_v1', part: 'images' }, { name: 'smallphone_chat_assets_v1', part: 'images' },
  { name: 'smallphone_music_db', part: 'music' },
];
const META = 'qingtuan_backup_v1', VOICE = /(<audio\b[^>]*?\ssrc=")data:audio\/[^"]*(")/g;
/** API Key、MCP 的 token 这类金钥：照栏位名认。 */
const SECRET = /api_?key$|^token$|secret|password|^authorization$/i;
const isRecord = (value: unknown): value is Record<string, unknown> => !!value && typeof value === 'object' && !Array.isArray(value);
function scrub(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(scrub);
  if (isRecord(value)) return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, SECRET.test(key) && typeof item === 'string' ? '' : scrub(item)]));
  return value;
}
/** 备份里空着的金钥，照同一个位置补上这台手机现在的。 */
function keepSecrets(current: unknown, restored: unknown): unknown {
  if (Array.isArray(restored)) return restored.map((item, index) => keepSecrets(Array.isArray(current) ? current[index] : undefined, item));
  if (isRecord(restored)) return Object.fromEntries(Object.entries(restored).map(([key, item]) => {
    const mine = isRecord(current) ? current[key] : undefined;
    return [key, SECRET.test(key) && item === '' && typeof mine === 'string' && mine ? mine : keepSecrets(mine, item)];
  }));
  return restored;
}
const parse = (text: string | null) => { try { return text ? JSON.parse(text) as unknown : undefined; } catch { return undefined; } };

/** 备份提醒：last 上次备份，remind 多久提醒一次，since 开始算的时间，snooze 上次按「下次再说」。 */
export interface BackupMeta { last: number; remind: 'week' | 'month' | 'off'; since: number; snooze: number }
export function readBackupMeta(): BackupMeta {
  let row: Record<string, unknown> = {};
  try { row = JSON.parse(kv.getItem(META) || '{}') || {}; } catch { /* 用默认值 */ }
  const meta: BackupMeta = { last: Number(row.last) || 0, remind: row.remind === 'month' || row.remind === 'off' ? row.remind : 'week', since: Number(row.since) || 0, snooze: Number(row.snooze) || 0 };
  if (!meta.since) { meta.since = Date.now(); kv.setItem(META, JSON.stringify(meta)); }
  return meta;
}
export function updateBackupMeta(patch: Partial<BackupMeta>) { kv.setItem(META, JSON.stringify({ ...readBackupMeta(), ...patch })); }
/** 该不该跳「备份一下吧」：照选的周期，从上次备份（或开始算、上次按下次再说）起算。 */
export function backupDue(meta = readBackupMeta()) {
  if (meta.remind === 'off') return false;
  const period = (meta.remind === 'month' ? 30 : 7) * 86400000;
  return Date.now() - Math.max(meta.last, meta.since, meta.snooze) > period;
}

/** 打开已经有的资料库；还不存在就不建（回 null），免得建出一个空的、版本对不上的库。 */
function openExisting(name: string): Promise<IDBDatabase | null> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(name);
    request.onupgradeneeded = event => { if (event.oldVersion === 0) request.transaction?.abort(); };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => { if (request.error?.name === 'AbortError') resolve(null); else reject(request.error); };
    request.onblocked = () => reject(new Error('请关闭其他青团机页面后重试'));
  });
}
const wait = <T,>(request: IDBRequest<T>) => new Promise<T>((resolve, reject) => { request.onsuccess = () => resolve(request.result); request.onerror = () => reject(request.error); });
const done = (transaction: IDBTransaction) => new Promise<void>((resolve, reject) => { transaction.oncomplete = () => resolve(); transaction.onerror = () => reject(transaction.error); transaction.onabort = () => reject(transaction.error || new Error('写入中断')); });

async function readDb(name: string) {
  const db = await openExisting(name);
  if (!db) return null;
  try {
    const names = [...db.objectStoreNames], stores: StoreInfo[] = [], rows: { store: string; key: unknown; value: unknown }[] = [];
    if (names.length) {
      const transaction = db.transaction(names, 'readonly');
      for (const storeName of names) {
        const store = transaction.objectStore(storeName);
        stores.push({ name: storeName, keyPath: store.keyPath as string | string[] | null, autoIncrement: store.autoIncrement });
        const [keys, values] = await Promise.all([wait(store.getAllKeys()), wait(store.getAll())]);
        keys.forEach((key, index) => rows.push({ store: storeName, key, value: values[index] }));
      }
    }
    return { info: { name, version: db.version, stores }, rows };
  } finally { db.close(); }
}

/** 大概多大：Blob 照实际大小，文字照字数。 */
function sizeOf(value: unknown): number {
  if (value instanceof Blob) return value.size;
  if (typeof value === 'string') return value.length;
  if (Array.isArray(value)) return value.reduce((sum: number, item) => sum + sizeOf(item), 0);
  if (value && typeof value === 'object') return Object.values(value).reduce((sum: number, item) => sum + sizeOf(item), 0);
  return 8;
}
const voiceBytes = (value: unknown): number => typeof value === 'string' ? [...value.matchAll(VOICE)].reduce((sum, match) => sum + match[0].length, 0)
  : value && typeof value === 'object' ? Object.values(value).reduce((sum: number, item) => sum + voiceBytes(item), 0) : 0;
const stripVoice = (value: unknown): unknown => typeof value === 'string' ? value.replace(VOICE, '$1$2')
  : Array.isArray(value) ? value.map(stripVoice) : value && typeof value === 'object' && !(value instanceof Blob) ? Object.fromEntries(Object.entries(value).map(([key, item]) => [key, stripVoice(item)])) : value;

/** 各类大概占多少（给勾选清单看）。 */
export async function scanBackup() {
  await flushKv();
  const sizes = { core: 0, images: 0, voice: 0, music: 0, keys: 0 };
  for (let index = 0; index < kv.length; index++) { const key = kv.key(index); if (key) sizes.core += key.length + (kv.getItem(key)?.length || 0); }
  for (const { name, part } of DBS) {
    const read = await readDb(name);
    for (const row of read?.rows || []) {
      const size = sizeOf(row.value), voice = name === 'qingtuan_chat_records_v1' ? voiceBytes(row.value) : 0;
      sizes[part || 'core'] += size - voice; sizes.voice += voice;
    }
  }
  return sizes;
}

function blobToBase64(blob: Blob) {
  return new Promise<string>((resolve, reject) => { const reader = new FileReader(); reader.onload = () => resolve(String(reader.result).replace(/^data:[^,]*,/, '')); reader.onerror = () => reject(reader.error); reader.readAsDataURL(blob); });
}
async function encode(value: unknown): Promise<unknown> {
  if (value instanceof Blob) return { __qtblob: await blobToBase64(value), type: value.type };
  if (value instanceof ArrayBuffer) return { __qtbuf: await blobToBase64(new Blob([value])) };
  if (value instanceof Date) return { __qtdate: value.getTime() };
  if (Array.isArray(value)) return Promise.all(value.map(encode));
  if (value && typeof value === 'object') return Object.fromEntries(await Promise.all(Object.entries(value).map(async ([key, item]) => [key, await encode(item)])));
  return value;
}
function bytes(base64: string) { const text = atob(base64), out = new Uint8Array(text.length); for (let i = 0; i < text.length; i++) out[i] = text.charCodeAt(i); return out; }
function decode(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(decode);
  if (value && typeof value === 'object') {
    const row = value as Record<string, unknown>;
    if (typeof row.__qtblob === 'string') return new Blob([bytes(row.__qtblob)], { type: String(row.type || '') });
    if (typeof row.__qtbuf === 'string') return bytes(row.__qtbuf).buffer;
    if (typeof row.__qtdate === 'number') return new Date(row.__qtdate);
    return Object.fromEntries(Object.entries(row).map(([key, item]) => [key, decode(item)]));
  }
  return value;
}

/** 做一份备份文件（一段一段接起来，不拼成一整串大字）。 */
export async function createBackup(include: BackupInclude) {
  await flushKv();
  const kvData: Record<string, string> = {};
  for (let index = 0; index < kv.length; index++) {
    const key = kv.key(index); if (key === null) continue;
    const text = kv.getItem(key) ?? '', value = include.keys ? undefined : parse(text);
    kvData[key] = value && typeof value === 'object' ? JSON.stringify(scrub(value)) : text;
  }
  const dbs: DbInfo[] = [], parts: string[] = [], stats: BackupStats = { characters: 0, messages: 0, images: 0, tracks: 0 };
  for (const { name, part } of DBS) {
    if (part && !include[part]) continue;
    const read = await readDb(name);
    if (!read) continue;
    const index = dbs.push(read.info) - 1;
    for (const row of read.rows) {
      let value = row.value;
      if (name === 'qingtuan_chat_records_v1') { if (!include.voice) value = stripVoice(value); if (row.store === 'chats') stats.messages += (JSON.stringify(value).match(/chat-message-row/g) || []).length; }
      if (name === 'QingTuanDB' && row.store === 'chatCharacters') stats.characters++;
      if (part === 'images' && row.store !== 'slots') stats.images++;
      if (part === 'music') stats.tracks++;
      const keyPath = read.info.stores.find(store => store.name === row.store)?.keyPath;
      parts.push(JSON.stringify([index, row.store, keyPath ? null : await encode(row.key), await encode(value)]));
    }
  }
  const header: BackupHeader = { app: 'qingtuan-backup', version: 1, at: Date.now(), include, stats, dbs };
  const body: BlobPart[] = ['{"header":', JSON.stringify(header), ',"kv":', JSON.stringify(kvData), ',"rows":['];
  parts.forEach((part, index) => body.push(index ? ',' + part : part));
  body.push(']}');
  return new Blob(body, { type: 'application/json' });
}

/** 读备份文件：不是青团机的整机备份就丢错。 */
export async function readBackup(file: File): Promise<BackupFile> {
  let parsed: BackupFile;
  try { parsed = JSON.parse(await file.text()); } catch { throw new Error('这不是青团机的备份文件'); }
  if (parsed?.header?.app !== 'qingtuan-backup' || !parsed.kv || !Array.isArray(parsed.rows) || !Array.isArray(parsed.header.dbs)) throw new Error('这不是青团机的整机备份文件');
  if (parsed.header.version !== 1) throw new Error('这份备份是比较新的版本做的，请先更新青团机');
  return parsed;
}

/** 照备份的版本打开（还没有就照备份建好表）；本机版本比较新就用本机的。 */
function openForRestore(info: DbInfo): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(info.name, info.version);
    request.onupgradeneeded = () => {
      for (const store of info.stores) if (!request.result.objectStoreNames.contains(store.name))
        request.result.createObjectStore(store.name, { keyPath: store.keyPath ?? undefined, autoIncrement: store.autoIncrement });
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => {
      if (request.error?.name === 'VersionError') { const again = indexedDB.open(info.name); again.onsuccess = () => resolve(again.result); again.onerror = () => reject(again.error); }
      else reject(request.error);
    };
    request.onblocked = () => reject(new Error('请关闭其他青团机页面后重试'));
  });
}

/** 整份换成备份里的：先清空每个资料库，再写回去；最后换掉 kv（之后要马上重新开启）。 */
export async function restoreBackup(backup: BackupFile) {
  const meta = kv.getItem(META);
  for (const { name } of DBS) {
    const index = backup.header.dbs.findIndex(info => info.name === name), info = backup.header.dbs[index];
    const db = info ? await openForRestore(info) : await openExisting(name);
    if (!db) continue;
    try {
      const names = [...db.objectStoreNames];
      if (!names.length) continue;
      const transaction = db.transaction(names, 'readwrite');
      names.forEach(storeName => transaction.objectStore(storeName).clear());
      if (info) for (const [dbIndex, storeName, key, value] of backup.rows) {
        if (dbIndex !== index || !names.includes(storeName)) continue;
        const store = transaction.objectStore(storeName);
        if (store.keyPath) store.put(decode(value)); else store.put(decode(value), decode(key) as IDBValidKey);
      }
      await done(transaction);
    } finally { db.close(); }
  }
  // 备份提醒的设定跟着这台机器，不换成备份里的旧时间
  const entries = { ...backup.kv };
  if (backup.header.include.keys === false) for (const [key, text] of Object.entries(entries)) {
    const restored = parse(text), current = parse(kv.getItem(key));
    if (restored && typeof restored === 'object' && current !== undefined) entries[key] = JSON.stringify(keepSecrets(current, restored));
  }
  await replaceKv({ ...entries, ...(meta ? { [META]: meta } : {}) });
}
