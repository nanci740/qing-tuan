import { blobDataUrl } from './imageAssets';

/**
 * 美化素材：上传的图片存在手机里（IndexedDB），聊天美化、主画面美化的 CSS 用 url(asset:名字) 引用。
 * 套到画面上之前，把 url(asset:名字) 换成图片本身（blob: 网址）；找不到的换成透明小图。
 * 导出 .css、主题方案时把用到的图片一起打包（data:image），导入时放回素材库。
 */
const DB_NAME = 'qingtuan_css_assets_v1', STORE = 'assets';
export const CSS_ASSETS_EVENT = 'qingtuan:css-assets';
export const ASSET_LIMIT = 60;
/** 一张图最多多大（GIF、SVG 原样存；其他太大会缩小再存）。 */
const MAX_BYTES = 2 * 1024 * 1024, MAX_SIDE = 1600;
const BLANK = 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7';

export interface CssAsset { name: string; type: string; blob: Blob; width: number; height: number; at: number }
export interface CssAssetInfo { name: string; url: string; width: number; height: number; size: number }

const loaded = new Map<string, CssAssetInfo>();
let ready: Promise<void> | null = null;

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = () => { if (!request.result.objectStoreNames.contains(STORE)) request.result.createObjectStore(STORE, { keyPath: 'name' }); };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error || Error('素材库打不开'));
  });
}
async function run<T>(mode: IDBTransactionMode, action: (store: IDBObjectStore, done: (value: T) => void) => void): Promise<T> {
  const db = await openDb();
  try {
    return await new Promise<T>((resolve, reject) => {
      const tx = db.transaction(STORE, mode); let value: T;
      tx.oncomplete = () => resolve(value);
      tx.onerror = tx.onabort = () => reject(tx.error || Error('素材存不进去'));
      action(tx.objectStore(STORE), next => { value = next; });
    });
  } finally { db.close(); }
}
const info = (asset: CssAsset): CssAssetInfo => ({ name: asset.name, url: URL.createObjectURL(asset.blob), width: asset.width, height: asset.height, size: asset.blob.size });
function remember(asset: CssAsset) {
  const old = loaded.get(asset.name); if (old) URL.revokeObjectURL(old.url);
  loaded.set(asset.name, info(asset));
}
const changed = () => window.dispatchEvent(new CustomEvent(CSS_ASSETS_EVENT));

/** 开起来时读一次全部素材。读不到就当没有，CSS 里引用的地方会是透明的。 */
export function loadCssAssets() {
  return ready ||= run<CssAsset[]>('readonly', (store, done) => { const request = store.getAll(); request.onsuccess = () => done(request.result as CssAsset[]); })
    .then(rows => { (rows || []).forEach(remember); changed(); }, () => undefined);
}
export const listCssAssets = () => [...loaded.values()].sort((a, b) => a.name.localeCompare(b.name, 'zh'));

/** 名字：中英文、数字、- 和 _，最多 16 个字。 */
export const cleanAssetName = (name: string) => String(name || '').replace(/\.[a-z0-9]+$/i, '').replace(/[^\p{L}\p{N}_-]+/gu, '').slice(0, 16);
function uniqueName(name: string, taken = new Set(loaded.keys())) {
  const base = cleanAssetName(name) || '素材';
  let next = base, index = 2;
  while (taken.has(next)) next = `${base.slice(0, 12)}${index++}`;
  return next;
}
function measure(blob: Blob): Promise<{ width: number; height: number }> {
  const url = URL.createObjectURL(blob);
  return new Promise<{ width: number; height: number }>((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve({ width: image.naturalWidth, height: image.naturalHeight });
    image.onerror = () => reject(Error('这张图片读不出来'));
    image.src = url;
  }).finally(() => URL.revokeObjectURL(url));
}
/** 太大的图缩小一点（WebP 保留透明）；GIF、SVG 原样存，太大就不收。 */
async function shrink(blob: Blob): Promise<Blob> {
  if (blob.size <= MAX_BYTES) return blob;
  if (blob.type === 'image/gif' || blob.type === 'image/svg+xml') throw Error('这张图太大了（GIF、SVG 最多 2MB）');
  const url = URL.createObjectURL(blob);
  try {
    const image = await new Promise<HTMLImageElement>((resolve, reject) => { const img = new Image(); img.onload = () => resolve(img); img.onerror = () => reject(Error('这张图片读不出来')); img.src = url; });
    const scale = Math.min(1, MAX_SIDE / Math.max(image.naturalWidth, image.naturalHeight));
    const canvas = document.createElement('canvas'); canvas.width = Math.max(1, Math.round(image.naturalWidth * scale)); canvas.height = Math.max(1, Math.round(image.naturalHeight * scale));
    const context = canvas.getContext('2d'); if (!context) throw Error('图片处理失败');
    context.drawImage(image, 0, 0, canvas.width, canvas.height);
    const out = await new Promise<Blob>((resolve, reject) => canvas.toBlob(next => next ? resolve(next) : reject(Error('图片处理失败')), 'image/webp', .88));
    if (out.size > MAX_BYTES) throw Error('这张图太大了，换一张小一点的');
    return out;
  } finally { URL.revokeObjectURL(url); }
}
async function put(name: string, source: Blob) {
  if (!/^image\//.test(source.type)) throw Error('只能放图片');
  const blob = await shrink(source), size = await measure(blob);
  const asset: CssAsset = { name, type: blob.type, blob, width: size.width, height: size.height, at: Date.now() };
  await run<void>('readwrite', store => { store.put(asset); });
  remember(asset);
  return name;
}

/** 上传：名字从档名来，重复就加数字。回传最后用的名字。 */
export async function addCssAsset(file: Blob, name = (file as File).name || '素材') {
  await loadCssAssets();
  if (loaded.size >= ASSET_LIMIT) throw Error(`素材最多 ${ASSET_LIMIT} 张，先删掉不用的`);
  const final = await put(uniqueName(name), file); changed(); return final;
}
export async function renameCssAsset(from: string, to: string) {
  const name = cleanAssetName(to);
  if (!name) throw Error('名字只能用中英文、数字、- 和 _');
  if (name === from) return name;
  if (loaded.has(name)) throw Error('已经有这个名字了');
  const asset = await run<CssAsset | undefined>('readonly', (store, done) => { const request = store.get(from); request.onsuccess = () => done(request.result as CssAsset | undefined); });
  if (!asset) throw Error('找不到这张素材');
  await run<void>('readwrite', store => { store.delete(from); store.put({ ...asset, name }); });
  const old = loaded.get(from); if (old) { loaded.delete(from); loaded.set(name, { ...old, name }); }
  changed(); return name;
}
export async function deleteCssAsset(name: string) {
  await run<void>('readwrite', store => { store.delete(name); });
  const old = loaded.get(name); if (old) URL.revokeObjectURL(old.url);
  loaded.delete(name); changed();
}

/* ---------- CSS 里的写法 ---------- */
const REF = /url\(\s*(['"]?)asset:([\p{L}\p{N}_-]+)\1\s*\)/giu;
export const assetRef = (name: string) => `url(asset:${name})`;
/** CSS 里用到哪些素材。 */
export function usedAssets(css: string) { return [...new Set([...String(css || '').matchAll(REF)].map(match => match[2]))]; }
/** 套到画面上之前：url(asset:名字) 换成图片本身。 */
export function resolveAssets(css: string) { return css.replace(REF, (_, __, name: string) => `url("${loaded.get(name)?.url || BLANK}")`); }
/** 改名以后，CSS 里的写法跟着改。 */
export function renameInCss(css: string, from: string, to: string) { return css.replace(REF, (whole, quote: string, name: string) => name === from ? `url(${quote}asset:${to}${quote})` : whole); }

/* ---------- 打包：导出时把用到的图片带上，导入时放回素材库 ---------- */
export async function packAssets(names: string[]): Promise<Record<string, string>> {
  await loadCssAssets();
  const out: Record<string, string> = {};
  for (const name of names) {
    const asset = await run<CssAsset | undefined>('readonly', (store, done) => { const request = store.get(name); request.onsuccess = () => done(request.result as CssAsset | undefined); });
    if (asset) out[name] = await blobDataUrl(asset.blob);
  }
  return out;
}
/** 放回素材库：一模一样的图就用原本的；名字被别的图占了就换个名字。回传「旧名字 → 新名字」。 */
export async function unpackAssets(pack: Record<string, unknown>): Promise<Record<string, string>> {
  await loadCssAssets();
  const renamed: Record<string, string> = {};
  for (const [raw, value] of Object.entries(pack || {})) {
    const name = cleanAssetName(raw);
    if (!name || typeof value !== 'string' || !/^data:image\/(png|jpe?g|webp|gif|avif|svg\+xml);base64,/i.test(value)) continue;
    const blob = await fetch(value).then(response => response.blob());
    const same = loaded.get(name);
    if (same && same.size === blob.size && await sameBytes(name, blob)) { renamed[raw] = name; continue; }
    if (!same && loaded.size >= ASSET_LIMIT) throw Error(`素材最多 ${ASSET_LIMIT} 张，先删掉不用的再导入`);
    renamed[raw] = await put(same ? uniqueName(name) : name, blob);
  }
  changed();
  return renamed;
}
async function sameBytes(name: string, blob: Blob) {
  const asset = await run<CssAsset | undefined>('readonly', (store, done) => { const request = store.get(name); request.onsuccess = () => done(request.result as CssAsset | undefined); });
  if (!asset) return false;
  const [a, b] = await Promise.all([asset.blob.arrayBuffer(), blob.arrayBuffer()]);
  if (a.byteLength !== b.byteLength) return false;
  const x = new Uint8Array(a), y = new Uint8Array(b);
  for (let index = 0; index < x.length; index++) if (x[index] !== y[index]) return false;
  return true;
}
export function applyRenames(css: string, renamed: Record<string, string>) {
  return Object.entries(renamed).reduce((text, [from, to]) => from === to ? text : renameInCss(text, from, to), css);
}

/** 导出 .css：用到的图片放在最后一段注解里。 */
const PACK_START = '/* qingtuan-assets', PACK_END = '*/';
export async function cssWithAssets(css: string) {
  const pack = await packAssets(usedAssets(css));
  if (!Object.keys(pack).length) return css;
  return `${css.trimEnd()}\n\n${PACK_START}\n用到的美化素材（导入时会放回素材库，不用动这一段）\n${Object.entries(pack).map(([name, url]) => `${name}: ${url}`).join('\n')}\n${PACK_END}\n`;
}
/** 导入 .css：拿出最后那段素材，放回素材库，回传整理好的 CSS（不含那一段）。 */
export async function cssFromFile(text: string) {
  const at = text.lastIndexOf(PACK_START);
  if (at < 0) return text;
  const end = text.indexOf(PACK_END, at + PACK_START.length);
  const block = text.slice(at + PACK_START.length, end < 0 ? undefined : end);
  const pack: Record<string, string> = {};
  for (const line of block.split('\n')) { const match = line.match(/^\s*([\p{L}\p{N}_-]+):\s*(data:image\/\S+)\s*$/u); if (match) pack[match[1]] = match[2]; }
  const css = (text.slice(0, at) + (end < 0 ? '' : text.slice(end + PACK_END.length))).trimEnd();
  return applyRenames(css, await unpackAssets(pack));
}
