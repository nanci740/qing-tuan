/** 青团机图片库：数据库保存 Blob，界面继续使用可导出的 data URL。 */
const DB_NAME = 'qingtuan_image_assets_v1';
const PREFIX = 'qt-image:';
const images = new Map<string, string>();
const references = new Map<string, string>();
const slots = new Map<string, string>();
const imageKeys = ['smallphone_main_wallpaper', 'smallphone_settings_profile_avatar_v1', 'avatar_star_custom', 'avatar_moon_custom', ...['ledger','memos','world','memories'].map(id => `smallphone_app_icon_${id}`), ...['home','chat','diary','space','settings'].map(id => `smallphone_dock_icon_${id}`)];
const recordKeys = ['smallphone_dossier_records_v1', 'smallphone_chat_characters_v1'];
function legacy(key: string) { try { return localStorage.getItem(key) || ''; } catch { return ''; } }
function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = () => { request.result.createObjectStore('images'); request.result.createObjectStore('slots'); };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error || Error('图片数据库无法打开'));
    request.onblocked = () => reject(Error('请关闭其他青团机页面后重试'));
  });
}
async function transaction<T>(stores: string[], mode: IDBTransactionMode, run: (tx: IDBTransaction) => T): Promise<T> {
  const db = await openDb();
  try {
    return await new Promise<T>((resolve, reject) => {
      const tx = db.transaction(stores, mode);
      let result: T;
      tx.oncomplete = () => resolve(result);
      tx.onerror = tx.onabort = () => reject(tx.error || Error('图片保存失败'));
      try { result = run(tx); } catch (error) { tx.abort(); reject(error); }
    });
  } finally { db.close(); }
}
export function blobDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader(); reader.onload = () => resolve(String(reader.result)); reader.onerror = () => reject(reader.error); reader.readAsDataURL(blob);
  });
}
export function resolveImage(value: string) {
  if (!value.startsWith(PREFIX)) return value;
  const image = images.get(value);
  if (!image) throw Error('已保存的图片暂时无法读取，请重新打开页面');
  return image;
}
export function imageReference(value: string) { return references.get(value) || value; }
export function readImageSlot(key: string) { return resolveImage(slots.has(key) ? slots.get(key)! : legacy(key)); }
export async function storeImage(value: string): Promise<string> {
  if (!value || !value.startsWith('data:image/')) return value;
  const existing = references.get(value); if (existing) return existing;
  const blob = await fetch(value).then(response => response.blob());
  const digest = await crypto.subtle.digest('SHA-256', await blob.arrayBuffer());
  const ref = PREFIX + Array.from(new Uint8Array(digest), byte => byte.toString(16).padStart(2,'0')).join('');
  await transaction(['images'], 'readwrite', tx => tx.objectStore('images').put(blob, ref));
  images.set(ref, value); references.set(value, ref);
  return ref;
}
/** 一组图标整体提交，失败时界面和已保存的绑定保持原样。 */
let saveQueue: Promise<unknown> = Promise.resolve();
export function saveImageSlots(values: Record<string, string>) {
  const snapshot = {...values};
  const pending = saveQueue.then(() => commitImageSlots(snapshot));
  saveQueue = pending.catch(() => undefined);
  return pending;
}
async function commitImageSlots(values: Record<string, string>) {
  const entries: [string,string][] = [];
  for (const [key, value] of Object.entries(values)) {
    if (value && !/^(data:image\/|https?:\/\/|qt-image:)/i.test(value)) throw Error('请选择图片或填写 http/https 图片直链');
    if (value.startsWith(PREFIX)) resolveImage(value);
    entries.push([key, await storeImage(value)]);
  }
  await transaction(['slots'], 'readwrite', tx => { for (const [key, ref] of entries) tx.objectStore('slots').put(ref, key); });
  for (const [key, ref] of entries) {
    slots.set(key, ref);
    // 数据库事务已经成功；即使旧数据暂时删不掉，也不会覆盖新绑定。
    try { localStorage.setItem(key, ref); } catch { /* 数据库绑定仍为权威资料。 */ }
  }
}
export function decodePhotoRecords<T extends {photoUrl?: string}>(records: T[]): T[] { return records.map(record => ({...record, photoUrl: record.photoUrl ? resolveImage(record.photoUrl) : record.photoUrl})); }
export function encodePhotoRecords<T extends {photoUrl?: string}>(records: T[]): T[] { return records.map(record => ({...record, photoUrl: record.photoUrl ? imageReference(record.photoUrl) : record.photoUrl})); }
export async function preparePhotoRecords(records: {photoUrl?: string}[]) { for (const record of records) if (record.photoUrl) await storeImage(record.photoUrl); }
/** 渲染前恢复图片并迁移旧资料；任一步失败都保留旧资料。 */
export async function initializeImageAssets() {
  let error: unknown;
  let restored = false;
  try {
    const slotRows = await transaction(['slots'], 'readonly', tx => {
      const rows: [string,string][] = [];
      const request = tx.objectStore('slots').openCursor();
      request.onsuccess = () => { const cursor=request.result;if(cursor){rows.push([String(cursor.key),cursor.value]);cursor.continue();} };
      return rows;
    });
    slotRows.forEach(([key,ref])=>slots.set(key,ref));
    const needed = new Set([...slotRows.map(([,ref])=>ref), ...recordKeys.flatMap(key=>legacy(key).match(/qt-image:[a-f0-9]{64}/g)||[])].filter(ref=>ref.startsWith(PREFIX)));
    const imageRows = await transaction(['images'], 'readonly', tx => {
      const rows: [string,Blob][] = [];
      for(const ref of needed){const request=tx.objectStore('images').get(ref);request.onsuccess=()=>{if(request.result instanceof Blob)rows.push([ref,request.result]);};}
      return rows;
    });
    // 只恢复仍被设置/档案使用的图片，旧版本图片不进入显示缓存。
    for (const [ref, blob] of imageRows) { const value=await blobDataUrl(blob);images.set(ref,value);references.set(value,ref); }
    restored = true;
    for (const key of imageKeys) {
      if (slots.has(key)) { try { localStorage.setItem(key, slots.get(key)!); } catch {} continue; }
      const value = legacy(key); if(value) await saveImageSlots({[key]:value});
    }
    for (const key of recordKeys) {
      const original=legacy(key); if(!original)continue;
      const records=JSON.parse(original); if(!Array.isArray(records))continue;
      await preparePhotoRecords(records);
      const payload=JSON.stringify(encodePhotoRecords(records));
      // 防止迁移期间覆盖另一个页面的新修改。
      if(legacy(key)===original) localStorage.setItem(key,payload);
    }
  } catch (cause) { error=cause; }
  const persistedReferences = [...imageKeys,...recordKeys].flatMap(key => legacy(key).match(/qt-image:[a-f0-9]{64}/g) || []);
  if (persistedReferences.some(ref => !images.has(ref)) || (!restored && persistedReferences.length)) throw Error('已保存的图片暂时无法读取');
  return error ? '图片迁移暂未完成，旧资料已保留，请稍后重试' : '';
}
export async function prepareImage(file: File, maxSide: number, quality = .86): Promise<string> {
  if (!file.type.startsWith('image/')) throw Error('请选择图片文件');
  // SVG、GIF 原样保存，避免丢失矢量信息或动画。
  if (file.type === 'image/gif' || file.type === 'image/svg+xml') return blobDataUrl(file);
  const url=URL.createObjectURL(file);
  try {
    const image=await new Promise<HTMLImageElement>((resolve,reject)=>{const img=new Image();img.onload=()=>resolve(img);img.onerror=()=>reject(Error('图片读取失败'));img.src=url;});
    const scale=Math.min(1,maxSide/Math.max(image.naturalWidth,image.naturalHeight));
    const canvas=document.createElement('canvas');canvas.width=Math.max(1,Math.round(image.naturalWidth*scale));canvas.height=Math.max(1,Math.round(image.naturalHeight*scale));
    const ctx=canvas.getContext('2d');if(!ctx)throw Error('图片处理失败');ctx.drawImage(image,0,0,canvas.width,canvas.height);
    // WebP 保留透明通道；不支持时使用 PNG，避免透明图变黑底。
    const output=await new Promise<Blob>((resolve,reject)=>canvas.toBlob(blob=>blob?resolve(blob):reject(Error('图片处理失败')),'image/webp',quality));
    return blobDataUrl(output);
  } finally { URL.revokeObjectURL(url); }
}
