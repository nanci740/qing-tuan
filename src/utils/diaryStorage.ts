import { kv } from './kvStorage';

/** 日记（key 是聊天的 archiveId，你自己是 'me'）：
    entries 一篇篇日记（新的在后面）：day 是哪一天（YYYY-MM-DD），body 里 ~~字~~ 是写了又划掉的；share 你的日记给谁看（勾了的人知道你写了这篇）；
    rate 他们多久写一篇（off 关、daily 每天、sometimes 隔几天），next 每个人下一次写的时间（都排在晚上）。 */
export type DiaryRate = 'off' | 'daily' | 'sometimes';
export interface DiaryEntry { id: string; by: string; at: number; day: string; title: string; weather: string; mood: string; body: string; share?: string[] }
interface Diary { entries: DiaryEntry[]; rate: DiaryRate; next: Record<string, number> }
const KEY = 'qingtuan_diary_v1', EVENT = 'qingtuan:diary-changed';
let cache: Diary | null = null;
const text = (value: unknown, max: number) => String(value ?? '').trim().slice(0, max);
function clean(value: unknown): Diary {
  const row = value && typeof value === 'object' ? value as Record<string, unknown> : {};
  const entries = (Array.isArray(row.entries) ? row.entries as Record<string, unknown>[] : []).flatMap((item): DiaryEntry[] => {
    if (!item?.id || !item.by || !text(item.body, 4000) && !text(item.title, 40)) return [];
    const share = Array.isArray(item.share) ? item.share.map(String) : [];
    return [{ id: String(item.id), by: String(item.by), at: Number(item.at) || 0, day: text(item.day, 10) || dayOf(Number(item.at) || Date.now()),
      title: text(item.title, 40), weather: text(item.weather, 8), mood: text(item.mood, 12), body: text(item.body, 4000), ...(share.length ? { share } : {}) }];
  }).slice(-300);
  const next = row.next && typeof row.next === 'object' ? Object.fromEntries(Object.entries(row.next as Record<string, unknown>).map(([key, at]) => [key, Number(at) || 0])) : {};
  return { entries, rate: row.rate === 'off' || row.rate === 'sometimes' ? row.rate : 'daily', next };
}
export function readDiary(): Diary {
  if (!cache) { try { cache = clean(JSON.parse(kv.getItem(KEY) || '{}')); } catch { cache = clean({}); } }
  return cache;
}
function write(next: Diary) { cache = clean(next); kv.setItem(KEY, JSON.stringify(cache)); window.dispatchEvent(new CustomEvent(EVENT)); }
export function updateDiary(patch: Partial<Diary>) { write({ ...readDiary(), ...patch }); }
export function subscribeDiary(listener: () => void) {
  window.addEventListener(EVENT, listener);
  return () => window.removeEventListener(EVENT, listener);
}
/** 那天是哪一天（本地时间）。 */
export function dayOf(at: number) { const date = new Date(at); return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`; }
export function saveEntry(entry: Omit<DiaryEntry, 'id'> & { id?: string }) {
  const id = entry.id || 'dy_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6), { entries } = readDiary();
  const saved = { ...entry, id };
  updateDiary({ entries: entries.some(item => item.id === id) ? entries.map(item => item.id === id ? saved : item) : [...entries, saved] });
  return saved;
}
export function removeEntry(id: string) { updateDiary({ entries: readDiary().entries.filter(item => item.id !== id) }); }
