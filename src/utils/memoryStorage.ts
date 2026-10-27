import { kv } from './kvStorage';

/** 记忆（Memories App）：
    items 一条条记忆：chat 是哪个聊天的（私聊是他的 archiveId，群聊是群的），kind 类型（you 关于你、event 发生过、promise 约定），
      from 怎么来的（chat 聊天时他自己悄悄记下、sweep 整理聊天记录、mine 你加的），pinned 钉住（每次都带上），
      who 群聊里谁记得（成员的 archiveId；空的是大家都记得）；
    auto 自动整理（聊天挤出上下文的部分攒够了就整理成记忆），swept 每个聊天整理到哪一条消息（消息编号）。 */
export type MemoryKind = 'you' | 'event' | 'promise';
export type MemoryFrom = 'chat' | 'sweep' | 'mine';
export interface MemoryItem { id: string; chat: string; kind: MemoryKind; text: string; at: number; from: MemoryFrom; pinned?: boolean; who?: string[] }
interface Memories { items: MemoryItem[]; auto: boolean; swept: Record<string, string> }
const KEY = 'qingtuan_memories_v1', EVENT = 'qingtuan:memories-changed';
let cache: Memories | null = null;
const text = (value: unknown, max: number) => String(value ?? '').trim().slice(0, max);
export const isKind = (value: unknown): value is MemoryKind => value === 'you' || value === 'event' || value === 'promise';
function clean(value: unknown): Memories {
  const row = value && typeof value === 'object' ? value as Record<string, unknown> : {};
  const items = (Array.isArray(row.items) ? row.items as Record<string, unknown>[] : []).flatMap((item): MemoryItem[] => {
    if (!item?.id || !item.chat || !text(item.text, 200)) return [];
    const who = Array.isArray(item.who) ? item.who.map(String) : [];
    return [{ id: String(item.id), chat: String(item.chat), kind: isKind(item.kind) ? item.kind : 'event', text: text(item.text, 200), at: Number(item.at) || 0,
      from: item.from === 'sweep' || item.from === 'mine' ? item.from : 'chat', ...(item.pinned ? { pinned: true } : {}), ...(who.length ? { who } : {}) }];
  }).slice(-1000);
  const swept = row.swept && typeof row.swept === 'object' ? Object.fromEntries(Object.entries(row.swept as Record<string, unknown>).map(([key, id]) => [key, String(id)])) : {};
  return { items, auto: row.auto !== false, swept };
}
export function readMemories(): Memories {
  if (!cache) { try { cache = clean(JSON.parse(kv.getItem(KEY) || '{}')); } catch { cache = clean({}); } }
  return cache;
}
function write(next: Memories) { cache = clean(next); kv.setItem(KEY, JSON.stringify(cache)); window.dispatchEvent(new CustomEvent(EVENT)); }
export function updateMemories(patch: Partial<Memories>) { write({ ...readMemories(), ...patch }); }
export function subscribeMemories(listener: () => void) {
  window.addEventListener(EVENT, listener);
  return () => window.removeEventListener(EVENT, listener);
}
/** 加几条（同一个聊天里一字不差的不重复记）。 */
export function addMemories(entries: Omit<MemoryItem, 'id' | 'at'>[]) {
  const { items } = readMemories(), now = Date.now();
  const fresh = entries.filter(entry => entry.text.trim() && !items.some(item => item.chat === entry.chat && item.text === entry.text.trim()))
    .map((entry, index) => ({ ...entry, text: entry.text.trim(), id: 'mm_' + now.toString(36) + index + Math.random().toString(36).slice(2, 5), at: now }));
  if (fresh.length) updateMemories({ items: [...items, ...fresh] });
  return fresh;
}
export function patchMemory(id: string, patch: Partial<MemoryItem>) { updateMemories({ items: readMemories().items.map(item => item.id === id ? { ...item, ...patch } : item) }); }
export function removeMemory(id: string) { updateMemories({ items: readMemories().items.filter(item => item.id !== id) }); }
