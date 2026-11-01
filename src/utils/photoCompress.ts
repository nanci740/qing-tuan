import { kv } from './kvStorage';
import { readDb } from './fullBackup';
import { saveChatPhoto } from './chatPhotoStore';

/** 自动压缩旧照片：每天一次，把几天前的聊天照片缩小重存（头像、表情、壁纸不动）。
    days 压几天前的（0 不压），last 上次跑的时间，count、saved 上次压了几张、省下多少，done 压过（或不用压）的照片编号。 */
export interface CompressMeta { days: 0 | 3 | 7; last: number; count: number; saved: number; done: string[] }
const KEY = 'qingtuan_photo_compress_v1', DAY = 86400000, MAX_SIDE = 1280, MIN_SIZE = 150 * 1024;
export function readCompressMeta(): CompressMeta {
  let row: Record<string, unknown> = {};
  try { row = JSON.parse(kv.getItem(KEY) || '{}') || {}; } catch { /* 用默认值 */ }
  return { days: row.days === 0 || row.days === 3 ? row.days : 7, last: Number(row.last) || 0, count: Number(row.count) || 0, saved: Number(row.saved) || 0, done: Array.isArray(row.done) ? row.done.map(String) : [] };
}
export function updateCompressMeta(patch: Partial<CompressMeta>) { kv.setItem(KEY, JSON.stringify({ ...readCompressMeta(), ...patch })); }
export const compressDue = (meta = readCompressMeta()) => meta.days > 0 && Date.now() - meta.last > DAY;

/** 缩到最长边 1280，存成 WebP（不支持就 JPEG）；没有变小就回 null。 */
async function shrink(blob: Blob): Promise<Blob | null> {
  const bitmap = await createImageBitmap(blob);
  try {
    const scale = Math.min(1, MAX_SIDE / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.round(bitmap.width * scale)); canvas.height = Math.max(1, Math.round(bitmap.height * scale));
    canvas.getContext('2d')!.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    const encode = (type: string) => new Promise<Blob | null>(resolve => canvas.toBlob(resolve, type, .72));
    const out = await encode('image/webp').then(made => made?.type === 'image/webp' ? made : encode('image/jpeg'));
    return out && out.size < blob.size * .85 ? out : null;
  } finally { bitmap.close(); }
}

let running = false;
/** 压一轮：照设定的天数挑旧照片，一张一张慢慢压（每张之间让一下，不卡画面）。 */
export async function compressOldPhotos(daysOverride?: number) {
  if (running) return null;
  running = true;
  try {
    const meta = readCompressMeta(), days = daysOverride ?? meta.days, done = new Set(meta.done), before = Date.now() - days * DAY;
    let count = 0, saved = 0;
    const read = await readDb('qingtuan_chat_photos_v1');
    for (const row of read?.rows || []) {
      const id = String(row.key), at = Number(id.split('_')[1]) || 0, blob = row.value;
      if (done.has(id) || at >= before || !(blob instanceof Blob)) continue;
      if (blob.size >= MIN_SIZE && blob.type !== 'image/gif') {
        try {
          const smaller = await shrink(blob);
          if (smaller) { await saveChatPhoto(id, smaller, false); count++; saved += blob.size - smaller.size; }
        } catch { /* 这张解不开就跳过 */ }
      }
      done.add(id);
      await new Promise(resolve => setTimeout(resolve, 30));
    }
    updateCompressMeta({ last: Date.now(), count, saved, done: [...done].slice(-3000) });
    return { count, saved };
  } finally { running = false; }
}
