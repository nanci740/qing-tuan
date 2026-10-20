/**
 * 聊天里的照片（家机发的、你发的）另外存在 IndexedDB（qingtuan_chat_photos_v1），聊天记录里只留照片编号和一个 blob: 网址。
 * 以前图片直接写进聊天记录，每张几百 KB，聊天一动就要整份比对、整份存，照片一多就卡。
 * 开机把全部照片读进来换成 blob: 网址；画面上的 <img> 每次整理消息时都按编号换成这次开机的网址。
 */
const DB_NAME = 'qingtuan_chat_photos_v1';
const STORE = 'photos';
const urls = new Map<string, string>();
let db: Promise<IDBDatabase> | null = null;

function open() {
  return db ??= new Promise((resolve, reject) => {
    if (!globalThis.indexedDB) { reject(new Error('IndexedDB unavailable')); return; }
    const request = indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = () => { if (!request.result.objectStoreNames.contains(STORE)) request.result.createObjectStore(STORE); };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}
function run<T>(mode: IDBTransactionMode, action: (store: IDBObjectStore) => IDBRequest<T>) {
  return open().then(database => new Promise<T>((resolve, reject) => {
    const transaction = database.transaction(STORE, mode), request = action(transaction.objectStore(STORE));
    transaction.oncomplete = () => resolve(request.result);
    transaction.onerror = () => reject(transaction.error);
    transaction.onabort = () => reject(transaction.error);
  }));
}

/** 开机读进全部照片。读不到也不挡开机，照片会显示成空的。 */
export async function initializeChatPhotos() {
  try {
    const [keys, values] = await Promise.all([run('readonly', store => store.getAllKeys()), run('readonly', store => store.getAll())]);
    keys.forEach((key, index) => { if (typeof key === 'string' && values[index] instanceof Blob) urls.set(key, URL.createObjectURL(values[index])); });
  } catch { /* 照片库打不开：聊天照常用。 */ }
  return '';
}

/** 这张照片这次开机的网址；没存过就回传空字符串。 */
export function chatPhotoUrl(id: string) { return urls.get(id) || ''; }

async function toBlob(source: Blob | string) { return source instanceof Blob ? source : (await fetch(source)).blob(); }

/** 存一张照片，回传可以放进 <img> 的 blob: 网址。 */
export async function saveChatPhoto(id: string, source: Blob | string) {
  const blob = await toBlob(source);
  await run('readwrite', store => store.put(blob, id));
  const old = urls.get(id);
  const url = URL.createObjectURL(blob);
  urls.set(id, url);
  if (old) URL.revokeObjectURL(old);
  return url;
}

/** 送给模型看图要 data: 网址。 */
export async function chatPhotoDataUrl(id: string) {
  const url = urls.get(id);
  if (!url) return '';
  const blob = await (await fetch(url)).blob();
  return await new Promise<string>((resolve, reject) => { const reader = new FileReader(); reader.onload = () => resolve(String(reader.result)); reader.onerror = () => reject(reader.error); reader.readAsDataURL(blob); });
}

/** 旧的照片（图片直接写在聊天记录里的）搬进照片库；搬好之后下次整理消息就会换成短网址。 */
const moving = new Set<string>();
export function adoptInlinePhoto(id: string, dataUrl: string) {
  if (urls.has(id) || moving.has(id) || !dataUrl.startsWith('data:image/')) return;
  moving.add(id);
  void saveChatPhoto(id, dataUrl).catch(() => {}).finally(() => moving.delete(id));
}
