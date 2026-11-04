import { kv, flushKv } from './kvStorage';
import { writeSettingsBatch } from './settingsPersistence';
import { readImageSlot, saveImageSlots, blobDataUrl } from './imageAssets';
import { readLocalFontRecord, writeLocalFontRecord } from './appearanceStorage';

/** 主题方案：主画面（配色、质感、字体、文字、背景、图标）、开屏，存成一套随时换。聊天的样式之后用美化设置的 CSS 加进来。 */
const DB_NAME = 'qingtuan_theme_schemes_v1', STORE = 'schemes';
export const SCHEME_LIMIT = 20;
const HOME_KEYS = ['smallphone_theme_color', 'smallphone_theme_tone', 'smallphone_glass_strength', 'smallphone_wallpaper_opacity',
  'bubble_star_custom', 'bubble_moon_custom', 'main_subtitle_custom', 'player_song_details', 'player_mp3_brand',
  'smallphone_custom_font_type', 'smallphone_custom_font_name', 'smallphone_custom_font_url'];
const APP_ICONS = ['ledger', 'memos', 'world', 'memories'].map(id => `smallphone_app_icon_${id}`);
const HOME_IMAGES = ['smallphone_main_wallpaper', ...APP_ICONS, ...['home', 'chat', 'diary', 'space', 'settings'].map(id => `smallphone_dock_icon_${id}`)];
const SPLASH_KEY = 'smallphone_splash_mode';
/** 换方案后重新开启：这次不放开屏，开好后回到美化设置。 */
export const AFTER_THEME_FLAG = 'qingtuan_after_theme';

export type SchemePart = 'home' | 'splash';
const PART_KEYS: SchemePart[] = ['home', 'splash'];
export interface HomeData { kv: Record<string, string | null>; images: Record<string, Blob | null>; font: { name: string; type: string; blob: Blob } | null }
export interface SchemePreview { color: string; wallpaper: string; icons: string[]; chatWallpaper: string; radius: number }
export interface ThemeScheme {
  id: string; name: string; createdAt: number; updatedAt: number; imported?: boolean;
  home?: HomeData; splash?: string | null;
  prints: Partial<Record<SchemePart, string>>; preview: SchemePreview;
}
type SchemeData = Pick<ThemeScheme, 'home' | 'splash'>;

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = () => { if (!request.result.objectStoreNames.contains(STORE)) request.result.createObjectStore(STORE, { keyPath: 'id' }); };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error || Error('主题方案打不开'));
    request.onblocked = () => reject(Error('请关闭其他青团机页面后重试'));
  });
}
async function run<T>(mode: IDBTransactionMode, action: (store: IDBObjectStore, done: (value: T) => void) => void): Promise<T> {
  const db = await openDb();
  try {
    return await new Promise<T>((resolve, reject) => {
      const tx = db.transaction(STORE, mode); let value: T;
      tx.oncomplete = () => resolve(value);
      tx.onerror = tx.onabort = () => reject(tx.error || Error('主题方案保存失败'));
      action(tx.objectStore(STORE), next => { value = next; });
    });
  } finally { db.close(); }
}
export async function listSchemes(): Promise<ThemeScheme[]> {
  const rows = await run<ThemeScheme[]>('readonly', (store, done) => { const request = store.getAll(); request.onsuccess = () => done(request.result as ThemeScheme[]); });
  return (rows || []).sort((a, b) => a.createdAt - b.createdAt);
}
const putScheme = (scheme: ThemeScheme) => run<void>('readwrite', store => { store.put(scheme); });
export const deleteScheme = (id: string) => run<void>('readwrite', store => { store.delete(id); });
export async function renameScheme(scheme: ThemeScheme, name: string) { await putScheme({ ...scheme, name: cleanName(name) || scheme.name, updatedAt: Date.now() }); }

const cleanName = (name: string) => String(name || '').replace(/\s+/g, ' ').trim().slice(0, 16);
const dataBlob = (value: string) => fetch(value).then(response => response.blob());
function slotBlob(slot: string): Promise<Blob | null> {
  const value = readImageSlot(slot);
  return value ? dataBlob(value) : Promise.resolve(null);
}

/** 现在手机上的样子（只读要的那几块）。 */
async function captureCurrent(parts: SchemePart[]): Promise<SchemeData> {
  const data: SchemeData = {};
  if (parts.includes('home')) {
    const values = Object.fromEntries(HOME_KEYS.map(key => [key, kv.getItem(key)]));
    const images: Record<string, Blob | null> = {};
    for (const slot of HOME_IMAGES) images[slot] = await slotBlob(slot);
    let font: HomeData['font'] = null;
    if (values.smallphone_custom_font_type === 'file') {
      const record = await readLocalFontRecord();
      if (!record) throw Error('主画面的字体文件读不到，先到「字体样式」重新选一次');
      font = { name: record.name, type: record.type, blob: record.blob };
    }
    data.home = { kv: values, images, font };
  }
  if (parts.includes('splash')) data.splash = kv.getItem(SPLASH_KEY);
  return data;
}

async function digest(input: BufferSource) { return Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', input)), byte => byte.toString(16).padStart(2, '0')).join(''); }
const blobPrint = async (blob: Blob | null | undefined) => blob ? (await digest(await blob.arrayBuffer())).slice(0, 24) : '';
const textPrint = (value: unknown) => digest(new TextEncoder().encode(JSON.stringify(value)));
/** 指纹：拿来认「现在的样子是哪个方案」。 */
async function printsOf(data: SchemeData): Promise<ThemeScheme['prints']> {
  const prints: ThemeScheme['prints'] = {};
  if (data.home) {
    const images: Record<string, string> = {};
    for (const slot of HOME_IMAGES) images[slot] = await blobPrint(data.home.images[slot]);
    prints.home = await textPrint({ kv: HOME_KEYS.map(key => data.home!.kv[key] ?? null), images, font: await blobPrint(data.home.font?.blob) });
  }
  if ('splash' in data) prints.splash = await textPrint(data.splash ?? null);
  return prints;
}
/** 现在这个样子的指纹，三块都算。 */
export async function currentPrints() { return printsOf(await captureCurrent(['home', 'splash'])); }
/** 方案存的每一块都跟现在一样，就是「目前用的」。 */
export function matches(scheme: ThemeScheme, prints: ThemeScheme['prints']) {
  const parts = (Object.keys(scheme.prints) as SchemePart[]).filter(part => PART_KEYS.includes(part));
  return parts.length > 0 && parts.every(part => scheme.prints[part] === prints[part]);
}

async function thumb(blob: Blob | null | undefined, size: number, square = true): Promise<string> {
  if (!blob) return '';
  try {
    const bitmap = await createImageBitmap(blob);
    const canvas = document.createElement('canvas'), ratio = square ? 1 : 1.6;
    canvas.width = size; canvas.height = Math.round(size * ratio);
    const scale = Math.max(canvas.width / bitmap.width, canvas.height / bitmap.height), w = bitmap.width * scale, h = bitmap.height * scale;
    canvas.getContext('2d')!.drawImage(bitmap, (canvas.width - w) / 2, (canvas.height - h) / 2, w, h);
    bitmap.close();
    return canvas.toDataURL(square ? 'image/png' : 'image/jpeg', .8);
  } catch { return ''; }
}
async function previewOf(data: SchemeData): Promise<SchemePreview> {
  const home = data.home;
  return {
    color: home?.kv.smallphone_theme_color || kv.getItem('smallphone_theme_color') || '#DDF2F4',
    wallpaper: await thumb(home?.images.smallphone_main_wallpaper, 72, false),
    icons: home ? await Promise.all(APP_ICONS.map(slot => thumb(home.images[slot], 24))) : [],
    chatWallpaper: '',
    radius: 2
  };
}

async function uniqueName(name: string, skip = '') {
  const names = new Set((await listSchemes()).filter(item => item.id !== skip).map(item => item.name));
  let next = cleanName(name) || '我的方案', index = 2;
  const base = next;
  while (names.has(next)) next = `${base.slice(0, 13)}(${index++})`;
  return next;
}
const newId = () => `theme_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;

/** 把现在的样子存成新方案。 */
export async function saveCurrent(name: string, parts: SchemePart[]) {
  if ((await listSchemes()).length >= SCHEME_LIMIT) throw Error(`最多存 ${SCHEME_LIMIT} 个方案，先删掉不用的`);
  const data = await captureCurrent(parts), now = Date.now();
  const scheme: ThemeScheme = { id: newId(), name: await uniqueName(name), createdAt: now, updatedAt: now, ...data, prints: await printsOf(data), preview: await previewOf(data) };
  await putScheme(scheme);
  return scheme;
}
/** 用现在的样子覆盖这个方案（存的那几块不变）。 */
export async function overwrite(scheme: ThemeScheme) {
  const parts = (Object.keys(scheme.prints) as SchemePart[]).filter(part => PART_KEYS.includes(part)), data = await captureCurrent(parts);
  const next: ThemeScheme = { id: scheme.id, name: scheme.name, createdAt: scheme.createdAt, updatedAt: Date.now(), ...data, prints: await printsOf(data), preview: await previewOf(data) };
  await putScheme(next);
  return next;
}

async function write(data: SchemeData) {
  if (data.home) {
    const values: Record<string, string | null> = Object.fromEntries(HOME_KEYS.map(key => [key, data.home!.kv[key] ?? null]));
    const images: Record<string, string> = {};
    for (const slot of HOME_IMAGES) { const blob = data.home.images[slot]; images[slot] = blob ? await blobDataUrl(blob) : ''; }
    await saveImageSlots(images);
    await writeLocalFontRecord(values.smallphone_custom_font_type === 'file' && data.home.font ? { blob: data.home.font.blob, name: data.home.font.name, type: data.home.font.type } : null);
    if (values.smallphone_custom_font_type === 'file' && !data.home.font) { values.smallphone_custom_font_type = null; values.smallphone_custom_font_name = null; }
    writeSettingsBatch(values);
  }
  if ('splash' in data && data.splash !== undefined) writeSettingsBatch({ [SPLASH_KEY]: ['always', 'daily', 'off'].includes(String(data.splash)) ? data.splash! : null });
  await flushKv();
}
function restart() {
  try { sessionStorage.setItem(AFTER_THEME_FLAG, '1'); } catch { /* 读不到就照常开屏 */ }
  location.reload();
}
/** 换成这个方案：写进去以后重新开启，整台一起换。 */
export async function applyScheme(scheme: ThemeScheme) { await write(scheme); restart(); }
/** 恢复默认样子：主画面回到原本的（开屏设定不动）。 */
export async function resetLook() {
  await write({ home: { kv: {}, images: {}, font: null } });
  restart();
}

/* ---------- 导出、导入：一个 .json 文件，图片和字体都在里面 ---------- */
interface ExportFile {
  app: 'qingtuan-theme'; version: 1; name: string; at: number;
  home?: { kv: Record<string, string | null>; images: Record<string, string | null>; font: { name: string; type: string; data: string } | null };
  splash?: string | null;
}
export async function exportScheme(scheme: ThemeScheme): Promise<{ blob: Blob; fileName: string }> {
  const file: ExportFile = { app: 'qingtuan-theme', version: 1, name: scheme.name, at: Date.now() };
  if (scheme.home) {
    const images: Record<string, string | null> = {};
    for (const slot of HOME_IMAGES) { const blob = scheme.home.images[slot]; images[slot] = blob ? await blobDataUrl(blob) : null; }
    file.home = { kv: scheme.home.kv, images, font: scheme.home.font ? { name: scheme.home.font.name, type: scheme.home.font.type, data: await blobDataUrl(scheme.home.font.blob) } : null };
  }
  if ('splash' in scheme && scheme.splash !== undefined) file.splash = scheme.splash;
  const safe = scheme.name.replace(/[\\/:*?"<>|]/g, '').trim() || '方案';
  return { blob: new Blob([JSON.stringify(file)], { type: 'application/json' }), fileName: `青团主题-${safe}.json` };
}
/** 现在的样子直接导出（不用先存）。 */
export async function exportCurrent(name = '目前的样子') {
  const data = await captureCurrent(['home']);
  return exportScheme({ id: '', name, createdAt: 0, updatedAt: 0, ...data, prints: {}, preview: { color: '', wallpaper: '', icons: [], chatWallpaper: '', radius: 2 } });
}
const isRecord = (value: unknown): value is Record<string, unknown> => !!value && typeof value === 'object' && !Array.isArray(value);
async function imageFrom(value: unknown): Promise<Blob | null> {
  if (typeof value !== 'string' || !value) return null;
  if (!/^data:image\/(png|jpe?g|webp|gif|avif|svg\+xml);base64,/i.test(value)) throw Error('文件里有看不懂的图片');
  return dataBlob(value);
}
async function fontFrom(value: unknown): Promise<Blob | null> {
  if (typeof value !== 'string' || !value) return null;
  if (!/^data:[\w.+/-]*;base64,/i.test(value)) throw Error('文件里有看不懂的字体');
  return dataBlob(value);
}
/** 读进一个方案文件，存成新方案（不会马上换）。 */
export async function importScheme(file: File) {
  if (file.size > 60 * 1024 * 1024) throw Error('文件太大了');
  let raw: unknown;
  try { raw = JSON.parse(await file.text()); } catch { throw Error('这不是青团机的主题文件'); }
  if (!isRecord(raw) || raw.app !== 'qingtuan-theme') throw Error('这不是青团机的主题文件');
  if ((await listSchemes()).length >= SCHEME_LIMIT) throw Error(`最多存 ${SCHEME_LIMIT} 个方案，先删掉不用的`);
  const data: SchemeData = {};
  if (isRecord(raw.home)) {
    const source = isRecord(raw.home.kv) ? raw.home.kv : {}, images = isRecord(raw.home.images) ? raw.home.images : {};
    const values = Object.fromEntries(HOME_KEYS.map(key => [key, typeof source[key] === 'string' ? String(source[key]).slice(0, 2000) : null]));
    if (values.smallphone_custom_font_url && !/^https?:\/\//i.test(values.smallphone_custom_font_url)) values.smallphone_custom_font_url = null;
    const blobs: Record<string, Blob | null> = {};
    for (const slot of HOME_IMAGES) blobs[slot] = await imageFrom(images[slot]);
    const font = isRecord(raw.home.font) ? await fontFrom(raw.home.font.data) : null;
    data.home = { kv: values, images: blobs, font: font && isRecord(raw.home.font) ? { name: String(raw.home.font.name || '字体').slice(0, 160), type: String(raw.home.font.type || ''), blob: font } : null };
  }
  if ('splash' in raw) data.splash = ['always', 'daily', 'off'].includes(String(raw.splash)) ? String(raw.splash) : null;
  if (!data.home && !('splash' in data)) throw Error('这个文件里没有东西');
  const now = Date.now();
  const scheme: ThemeScheme = { id: newId(), name: await uniqueName(String(raw.name || '导入的方案')), createdAt: now, updatedAt: now, imported: true, ...data, prints: await printsOf(data), preview: await previewOf(data) };
  await putScheme(scheme);
  return scheme;
}
