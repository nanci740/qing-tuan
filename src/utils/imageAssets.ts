/** 青团机图片库：数据库保存 Blob，界面继续使用可导出的 data URL。 */
const DB_NAME = 'qingtuan_image_assets_v1';
const PREFIX = 'qt-image:';
const images = new Map<string, string>();
const references = new Map<string, string>();
const slots = new Map<string, string>();
const pendingImages = new Set<string>();
const imageKeys = ['personal_profile_polaroid_photo', ...['chatMemoryStar','chatMemoryPolaroid','chatMemoryMoon','chatMemoryExtra'].map(id => `smallphone_chat_memory_photo_v1_${id}`), 'smallphone_main_wallpaper', 'smallphone_settings_profile_avatar_v1', 'avatar_star_custom', 'avatar_moon_custom', ...['ledger','memos','world','memories'].map(id => `smallphone_app_icon_${id}`), ...['home','chat','diary','space','settings'].map(id => `smallphone_dock_icon_${id}`)];
const recordKeys = ['smallphone_dossier_records_v1', 'smallphone_chat_characters_v1', 'smallphone_world_books_v1'];
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
  pendingImages.add(ref);
  try { await transaction(['images'], 'readwrite', tx => tx.objectStore('images').put(blob, ref)); }
  catch (error) { pendingImages.delete(ref); throw error; }
  images.set(ref, value); references.set(value, ref); pendingImages.delete(ref);
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
export function decodeCoverRecords<T extends {cover?: string}>(records: T[]): T[] { return records.map(record => ({...record, cover: record.cover ? resolveImage(record.cover) : record.cover})); }
export function encodeCoverRecords<T extends {cover?: string}>(records: T[]): T[] { return records.map(record => ({...record, cover: record.cover ? imageReference(record.cover) : record.cover})); }
export async function prepareCoverRecords(records: {cover?: string}[]) { for (const record of records) if (record.cover) await storeImage(record.cover); }
/** 渲染前恢复图片并迁移旧资料；任一步失败都保留旧资料。 */
export async function initializeImageAssets() {
  await acquireImageSession();
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
      const world = key === 'smallphone_world_books_v1';
      if (world) await prepareCoverRecords(records); else await preparePhotoRecords(records);
      const payload=JSON.stringify(world ? encodeCoverRecords(records) : encodePhotoRecords(records));
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

/** Shared for all module instances in a page. Other open pages prevent cleanup. */
type ImageSession = {ready?: Promise<void>; finished?: Promise<void>; release?: () => void};
const imageSessionHost = globalThis as typeof globalThis & {__qingtuanImageSession?: ImageSession};
const imageSession = imageSessionHost.__qingtuanImageSession ||= {};
const SESSION_LOCK = 'qingtuan-image-library-session';
function acquireImageSession(): Promise<void> {
  if (!navigator.locks) return Promise.resolve();
  if (imageSession.ready) return imageSession.ready;
  imageSession.ready = new Promise<void>((resolve, reject) => {
    imageSession.finished = navigator.locks.request(SESSION_LOCK, {mode:'shared'}, () => new Promise<void>(release => {
      imageSession.release = release;
      resolve();
    })).then(()=>undefined).catch(error => { imageSession.ready = undefined; reject(error); });
  });
  return imageSession.ready;
}
export type ImageLibraryStats = {
  totalCount:number; totalBytes:number;
  usedCount:number; usedBytes:number;
  protectedCount:number; protectedBytes:number;
  unusedCount:number; unusedBytes:number;
};
function persistedImageReferences(): Set<string> {
  const refs = new Set<string>();
  // Read failures and damaged records must stop cleanup, rather than treating them as empty.
  try {
    for (const key of recordKeys) {
      const value = localStorage.getItem(key);
      if (value && !Array.isArray(JSON.parse(value))) throw Error('图片关联资料无法读取，请先检查档案和世界书');
    }
    for (let index=0; index<localStorage.length; index++) {
      const key=localStorage.key(index); if(key===null)continue;
      const value=localStorage.getItem(key)||'';
      for (const ref of value.match(/qt-image:[a-f0-9]{64}/g)||[]) refs.add(ref);
      const ref=references.get(value);if(ref)refs.add(ref);
    }
    return refs;
  } catch {throw Error('图片关联资料无法读取，已停止检查和清理');}
}
async function inspectImages(remove:boolean) {
  let failure:unknown;
  const result = {stats:{totalCount:0,totalBytes:0,usedCount:0,usedBytes:0,protectedCount:0,protectedBytes:0,unusedCount:0,unusedBytes:0} as ImageLibraryStats, deletedCount:0,deletedBytes:0};
  await transaction(['slots','images'], remove?'readwrite':'readonly', tx => {
    const bindings=tx.objectStore('slots').getAll();
    bindings.onsuccess=()=>{
      try {
        const needed=persistedImageReferences();
        for(const value of bindings.result)if(typeof value==='string'&&value.startsWith(PREFIX))needed.add(value);
        const seen=new Set<string>();
        const cursorRequest=tx.objectStore('images').openCursor();
        cursorRequest.onsuccess=()=>{
          try {
            const cursor=cursorRequest.result;
            if(!cursor){if([...needed].some(ref=>!seen.has(ref)))throw Error('部分已保存图片无法读取，已停止清理');return;}
            const ref=String(cursor.key),blob=cursor.value;
            if(!(blob instanceof Blob)||!/^qt-image:[a-f0-9]{64}$/.test(ref))throw Error('图片库资料异常，已停止清理');
            seen.add(ref);
            const category=needed.has(ref)?'used':images.has(ref)||pendingImages.has(ref)?'protected':'unused';
            if(remove&&category==='unused'){cursor.delete();result.deletedCount++;result.deletedBytes+=blob.size;}
            else {result.stats.totalCount++;result.stats.totalBytes+=blob.size;result.stats[`${category}Count`]++;result.stats[`${category}Bytes`]+=blob.size;}
            cursor.continue();
          } catch(error) { failure=error;tx.abort(); }
        };
      } catch(error) { failure=error;tx.abort(); }
    };
  }).catch(()=>{throw failure||Error('图片库检查或清理失败，请稍后重试');});
  return result;
}
export async function getImageLibraryStats(): Promise<ImageLibraryStats> {
  await saveQueue;
  return (await inspectImages(false)).stats;
}
let cleanupBusy=false;
export async function cleanUnusedImages() {
  if(cleanupBusy)throw Error('图片清理正在进行，请稍候');
  if(!navigator.locks)throw Error('当前浏览器暂不支持安全清理，请使用支持此功能的浏览器');
  cleanupBusy=true;
  try {
    await acquireImageSession();
    await saveQueue;
    imageSession.release?.();
    await imageSession.finished;
    imageSession.release=undefined;imageSession.ready=undefined;
    return await navigator.locks.request(SESSION_LOCK,{mode:'exclusive',ifAvailable:true},async lock=>{
      if(!lock)throw Error('请先关闭其他青团机页面，再重新检查清理');
      return inspectImages(true);
    });
  } finally {try {await acquireImageSession();} finally {cleanupBusy=false;}}
}
