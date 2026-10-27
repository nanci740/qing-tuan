import { kv } from './kvStorage';

/** 日记（key 是聊天的 archiveId，你自己是 'me'）：
    entries 一篇篇日记（新的在后面）：day 是哪一天（YYYY-MM-DD），body 里 ~~字~~ 是写了又划掉的；share 你的日记给谁看（勾了的人知道你写了这篇）；
    rate 他们多久写一篇（off 关、daily 每天、sometimes 隔几天），next 每个人下一次写的时间（都排在晚上）；
    locks 每本的锁（四位数字 code，他的还有一句提示 hint；你的是你自己设的）；
    access 你怎么打开他的（code 知道密码、crack 撬开的，只算这一次，退出他的本子就又锁上），seenBy 他怎么打开你的（撬开的也只看到撬开那时候最近的三篇）；
    traces 你的本子上留下的痕迹（谁、用密码还是撬开、什么时候），lockedAt 你上一次设密码的时间（之后被撬过，他撬开时最近的三篇和之后写的，纸上会有折角、杯印、指印之类的痕迹，不写是谁）；
    misses 你猜错他的密码几次（每次猜错 40% 会被他知道），caught 他发现你偷看他的日记（撬开的、猜中密码的）的时间，given 他把密码给你的时间（猜中的、撬开的没有），tries 他上一次试着撬你日记的时间（有机率起念头，照人设决定撬不撬；撬没撬开都算）。 */
export type DiaryOpen = 'code' | 'crack';
export interface DiaryLock { code: string; hint: string }
export interface DiaryTrace { by: string; kind: DiaryOpen; at: number }
export type DiaryRate = 'off' | 'daily' | 'sometimes';
export interface DiaryEntry { id: string; by: string; at: number; day: string; title: string; weather: string; mood: string; body: string; share?: string[] }
interface Diary { entries: DiaryEntry[]; rate: DiaryRate; next: Record<string, number>; locks: Record<string, DiaryLock>; access: Record<string, DiaryOpen>; seenBy: Record<string, DiaryOpen>;
  traces: DiaryTrace[]; lockedAt: number; misses: Record<string, number>; caught: Record<string, number>; given: Record<string, number>; tries: Record<string, number> }
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
  const map = <T,>(value: unknown, pick: (item: unknown) => T | null) => Object.fromEntries((value && typeof value === 'object' ? Object.entries(value as Record<string, unknown>) : []).flatMap(([key, item]) => { const got = pick(item); return got === null ? [] : [[key, got]]; })) as Record<string, T>;
  const open = (item: unknown): DiaryOpen | null => item === 'code' || item === 'crack' ? item : null;
  const locks = map(row.locks, item => { const lock = item as Record<string, unknown>; return /^\d{4}$/.test(String(lock?.code)) ? { code: String(lock.code), hint: text(lock.hint, 40) } : null; });
  const traces = (Array.isArray(row.traces) ? row.traces as Record<string, unknown>[] : []).flatMap((item): DiaryTrace[] => item?.by && open(item.kind) ? [{ by: String(item.by), kind: open(item.kind)!, at: Number(item.at) || 0 }] : []).slice(-30);
  return { entries, rate: row.rate === 'off' || row.rate === 'sometimes' ? row.rate : 'daily', next, locks, access: map(row.access, open), seenBy: map(row.seenBy, open), traces,
    lockedAt: Number(row.lockedAt) || 0, misses: map(row.misses, item => Number(item) || null), caught: map(row.caught, item => Number(item) || null), given: map(row.given, item => Number(item) || null), tries: map(row.tries, item => Number(item) || null) };
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
