export const CUSTOM_FONT_FAMILY = 'SmallPhoneCustomFont';
const CUSTOM_FONT_DB = 'smallphone_custom_font_db', CUSTOM_FONT_STORE = 'font_store', CUSTOM_FONT_RECORD = 'active_font';
export interface LocalFontRecord {blob: Blob; name: string; type: string;}
function openFontDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (!window.indexedDB) return reject(new Error('当前浏览器不支持本地字体存储'));
    const request = indexedDB.open(CUSTOM_FONT_DB, 1);
    let blocked = false;
    request.onupgradeneeded = () => {if (!request.result.objectStoreNames.contains(CUSTOM_FONT_STORE)) request.result.createObjectStore(CUSTOM_FONT_STORE);};
    request.onsuccess = () => {if (blocked) request.result.close();else resolve(request.result);};
    request.onerror = () => reject(request.error || new Error('字体存储打开失败'));
    request.onblocked = () => {blocked = true;reject(new Error('请关闭其他青团机页面后重试'));};
  });
}
async function fontTransaction<T>(mode: IDBTransactionMode, action: (store: IDBObjectStore, result: (value: T) => void) => void): Promise<T> {
  const db = await openFontDb();
  try {
    return await new Promise<T>((resolve, reject) => {
      const tx = db.transaction(CUSTOM_FONT_STORE, mode);let value: T;
      tx.oncomplete = () => resolve(value);
      tx.onerror = tx.onabort = () => reject(tx.error || new Error('字体存储操作失败，请重试'));
      try {action(tx.objectStore(CUSTOM_FONT_STORE), next => {value = next;});}
      catch (error) {try {tx.abort();} catch {} reject(error);}
    });
  } finally {db.close();}
}
export function writeLocalFontRecord(record: LocalFontRecord | null): Promise<void> {
  return fontTransaction('readwrite', store => {if (record) store.put(record, CUSTOM_FONT_RECORD);else store.delete(CUSTOM_FONT_RECORD);});
}
export const saveLocalFontRecord = (file: File) => writeLocalFontRecord({blob: file, name: file.name, type: file.type});
export function readLocalFontRecord(): Promise<LocalFontRecord | null> {
  return fontTransaction('readonly', (store, result) => {const request = store.get(CUSTOM_FONT_RECORD);request.onsuccess = () => result(request.result || null);});
}
export const clearLocalFontRecord = () => writeLocalFontRecord(null);

export interface RestoredUiFont { face: FontFace; name: string; source: string; url: string; }
let restoredUiFont: RestoredUiFont | null = null;
export const getRestoredUiFont = () => restoredUiFont;

/** Restore before mounting the opening screen, so its first frame uses the saved font. */
export async function initializeUiFont(): Promise<string> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    const type = localStorage.getItem('smallphone_custom_font_type');
    if (type !== 'url' && type !== 'file') return '';
    const savedName = localStorage.getItem('smallphone_custom_font_name') || '';
    const load = async (): Promise<RestoredUiFont> => {
      if (type === 'url') {
        const url = new URL(localStorage.getItem('smallphone_custom_font_url') || '', window.location.href);
        if (!/^https?:$/.test(url.protocol)) throw Error('无效的字体地址');
        const face = await new FontFace(CUSTOM_FONT_FAMILY, `url(${JSON.stringify(url.href)})`).load();
        return { face, name: savedName || decodeURIComponent(url.pathname.split('/').pop() || url.hostname), source: `网络直链 · ${url.hostname}`, url: url.href };
      }
      const record = await readLocalFontRecord();
      if (!record) throw Error('找不到已保存的字体文件');
      const face = await new FontFace(CUSTOM_FONT_FAMILY, await record.blob.arrayBuffer()).load();
      const name = savedName || record.name;
      return { face, name, source: `本地文件 · ${name}`, url: '' };
    };
    const loaded = await Promise.race([load(), new Promise<never>((_, reject) => {
      timer = setTimeout(() => reject(Error('字体加载超时')), 5000);
    })]);
    document.fonts.add(loaded.face);
    restoredUiFont = loaded;
    return '';
  } catch {
    return '已保存的字体暂时无法载入，请重试';
  } finally { clearTimeout(timer); }
}
