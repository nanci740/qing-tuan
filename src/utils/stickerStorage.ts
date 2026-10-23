import { kv } from './kvStorage';
import { blobDataUrl, prepareImage, resolveImage, restoreImageReferences, storeImage } from './imageAssets';

/** 「我」的表情：所有角色共用一份，按分组放。每张一个标签（他照标签挑表情）；
    图片是上传的（存进图片库，这里记 qt-image: 编号）或网址（http/https 原样记着）。 */
export interface Sticker { id: string; tag: string; image: string }
/** ai：家机能不能用这一组。 */
export interface StickerGroup { id: string; name: string; ai: boolean; items: Sticker[] }

const KEY = 'qingtuan_stickers_v1', EVENT = 'qingtuan:stickers-changed';
/** 上传的动图原样保存，超过这个大小就不收。 */
export const STICKER_GIF_LIMIT = 1024 * 1024;
const uid = (prefix: string) => prefix + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
const text = (value: unknown, max: number) => String(value ?? '').trim().slice(0, max);
const usable = (image: string) => /^(qt-image:[a-f0-9]{64}|https?:\/\/\S+)$/i.test(image);

function clean(value: unknown): StickerGroup[] {
  return (Array.isArray(value) ? value : []).flatMap((group): StickerGroup[] => {
    if (!group || typeof group !== 'object') return [];
    const row = group as Record<string, unknown>;
    const items = (Array.isArray(row.items) ? row.items : []).flatMap((item): Sticker[] => {
      if (!item || typeof item !== 'object') return [];
      const sticker = item as Record<string, unknown>, image = text(sticker.image, 2000);
      return usable(image) ? [{ id: typeof sticker.id === 'string' && sticker.id ? sticker.id : uid('st-'), tag: text(sticker.tag, 20), image }] : [];
    });
    return [{ id: typeof row.id === 'string' && row.id ? row.id : uid('sg-'), name: text(row.name, 20) || '表情', ai: row.ai !== false, items }];
  });
}

let cache: StickerGroup[] | null = null;
export function readStickers(): StickerGroup[] {
  if (!cache) { try { cache = clean(JSON.parse(kv.getItem(KEY) || '[]')); } catch { cache = []; } }
  return cache;
}
export function writeStickers(groups: StickerGroup[]) {
  cache = clean(groups);
  kv.setItem(KEY, JSON.stringify(cache));
  window.dispatchEvent(new CustomEvent(EVENT));
}
export function subscribeStickers(listener: () => void) {
  window.addEventListener(EVENT, listener);
  return () => window.removeEventListener(EVENT, listener);
}
export function newStickerGroup(name: string, ai: boolean): StickerGroup { return { id: uid('sg-'), name: name.trim().slice(0, 20) || '表情', ai, items: [] }; }
export function newSticker(tag: string, image: string): Sticker { return { id: uid('st-'), tag: tag.trim().slice(0, 20), image }; }

/** 打开表情页前先把上传的图从图片库读出来，之后 stickerSrc 才拿得到。 */
export function loadStickerImages(groups: StickerGroup[]) {
  return restoreImageReferences(groups.flatMap(group => group.items.map(item => item.image)));
}
/** 显示用的图片：网址原样；上传的换成图片库里的图，读不到就是空字符串。 */
export function stickerSrc(sticker: Sticker) {
  try { return resolveImage(sticker.image); } catch { return ''; }
}
/** 上传的一张图：缩到 200px（动图原样，太大不收），存进图片库，回传编号。 */
export async function prepareStickerFile(file: File) {
  if (file.type === 'image/gif' && file.size > STICKER_GIF_LIMIT) throw Error(`「${file.name}」超过 1MB，动图太大放不进来`);
  return file.type === 'image/gif' ? blobDataUrl(file) : prepareImage(file, 200);
}
export function saveStickerImage(dataUrl: string) { return storeImage(dataUrl); }
/** 贴网址：一行一张「标签 网址」，标签和网址之间空一格（或冒号）；认不出来的行略过。 */
export function parseStickerLines(value: string) {
  return value.split(/\r?\n/).flatMap(line => {
    const match = /^\s*(.+?)[\s:：]+(https?:\/\/\S+)\s*$/i.exec(line);
    return match ? [{ tag: match[1].trim().slice(0, 20), image: match[2] }] : [];
  });
}
