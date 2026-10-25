import { kv } from './kvStorage';
import type { CharacterDossier } from '../types/characterDossier';

/** 通讯录（key 是聊天的 archiveId）：
    remarks 你给角色取的备注——聊天列表、聊天室、消息上的名字换成备注，他那边照旧用本名；
    tags 你建的标签，tagged 谁贴了哪些标签；
    requests 好友申请：in 是陌生人来加你（模型随机生成的人，profile 是收下后建档案用的资料），out 是你去加档案里的角色；
    stranger 陌生人多久来一个（off 关、some 偶尔、often 常常），nextStrangerAt 下一个最早什么时候来。 */
export interface ContactTag { id: string; name: string }
export interface FriendRequest {
  id: string; kind: 'in' | 'out'; at: number; state: 'pending' | 'accepted' | 'rejected';
  name: string; greeting: string; intro: string; meta: string; meet: string;
  profile?: Partial<CharacterDossier>; dossierId?: string; reply?: string;
}
export type StrangerRate = 'off' | 'some' | 'often';
interface Contacts { remarks: Record<string, string>; tags: ContactTag[]; tagged: Record<string, string[]>; requests: FriendRequest[]; stranger: StrangerRate; nextStrangerAt: number }
const KEY = 'qingtuan_contacts_v1', EVENT = 'qingtuan:contacts-changed';
let cache: Contacts | null = null;
const text = (value: unknown, max: number) => String(value ?? '').trim().slice(0, max);
function clean(value: unknown): Contacts {
  const row = value && typeof value === 'object' ? value as Record<string, unknown> : {}, remarks: Record<string, string> = {}, tagged: Record<string, string[]> = {};
  if (row.remarks && typeof row.remarks === 'object') for (const [key, remark] of Object.entries(row.remarks)) { const name = text(remark, 20); if (key && name) remarks[key] = name; }
  const tags = (Array.isArray(row.tags) ? row.tags : []).flatMap((item): ContactTag[] => { const tag = item as Record<string, unknown>, name = text(tag?.name, 12); return tag?.id && name ? [{ id: String(tag.id), name }] : []; }).slice(0, 50);
  if (row.tagged && typeof row.tagged === 'object') for (const [key, ids] of Object.entries(row.tagged)) { const kept = (Array.isArray(ids) ? ids : []).map(String).filter(id => tags.some(tag => tag.id === id)); if (key && kept.length) tagged[key] = [...new Set(kept)]; }
  const requests = (Array.isArray(row.requests) ? row.requests : []).flatMap((item): FriendRequest[] => {
    const entry = item as Record<string, unknown>;
    if (!entry?.id || !text(entry.name, 20)) return [];
    return [{ id: String(entry.id), kind: entry.kind === 'out' ? 'out' : 'in', at: Number(entry.at) || 0, state: entry.state === 'accepted' || entry.state === 'rejected' ? entry.state : 'pending',
      name: text(entry.name, 20), greeting: text(entry.greeting, 120), intro: text(entry.intro, 300), meta: text(entry.meta, 40), meet: text(entry.meet, 40),
      ...(entry.profile && typeof entry.profile === 'object' ? { profile: entry.profile as Partial<CharacterDossier> } : {}),
      ...(entry.dossierId ? { dossierId: String(entry.dossierId) } : {}), ...(entry.reply ? { reply: text(entry.reply, 200) } : {}) }];
  }).slice(-40);
  return { remarks, tags, tagged, requests, stranger: row.stranger === 'some' || row.stranger === 'often' ? row.stranger : 'off', nextStrangerAt: Number(row.nextStrangerAt) || 0 };
}
export function readContacts(): Contacts {
  if (!cache) { try { cache = clean(JSON.parse(kv.getItem(KEY) || '{}')); } catch { cache = clean({}); } }
  return cache;
}
function write(next: Contacts) { cache = clean(next); kv.setItem(KEY, JSON.stringify(cache)); window.dispatchEvent(new CustomEvent(EVENT)); }
export function updateContacts(patch: Partial<Contacts>) { write({ ...readContacts(), ...patch }); }
export function contactRemark(key: string) { return readContacts().remarks[key] || ''; }
/** 给你看的名字：有备注用备注，没有就用本名。 */
export function contactName(key: string, name: string) { return contactRemark(key) || name; }
/** 设备注；空字符串就是拿掉。 */
export function setContactRemark(key: string, remark: string) {
  const remarks = { ...readContacts().remarks }, name = remark.trim().slice(0, 20);
  if (name) remarks[key] = name; else delete remarks[key];
  updateContacts({ remarks });
}
export function subscribeContacts(listener: () => void) {
  window.addEventListener(EVENT, listener);
  return () => window.removeEventListener(EVENT, listener);
}

/** 标签：新建（同名的直接回传原本那个）、改名、删掉（贴过的人一起拿掉）、给某人贴上的标签整组换掉。 */
export function addContactTag(name: string) {
  const label = name.trim().slice(0, 12), { tags } = readContacts();
  if (!label) return null;
  const found = tags.find(tag => tag.name === label);
  if (found) return found;
  const tag = { id: 'tag_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 5), name: label };
  updateContacts({ tags: [...tags, tag] });
  return tag;
}
export function renameContactTag(id: string, name: string) {
  const label = name.trim().slice(0, 12);
  if (label) updateContacts({ tags: readContacts().tags.map(tag => tag.id === id ? { ...tag, name: label } : tag) });
}
export function removeContactTag(id: string) {
  const { tags, tagged } = readContacts();
  updateContacts({ tags: tags.filter(tag => tag.id !== id), tagged: Object.fromEntries(Object.entries(tagged).map(([key, ids]) => [key, ids.filter(item => item !== id)])) });
}
export function setContactTags(key: string, ids: string[]) { updateContacts({ tagged: { ...readContacts().tagged, [key]: ids } }); }

/** 好友申请：加一笔、改一笔。 */
export function addFriendRequest(request: Omit<FriendRequest, 'id' | 'at' | 'state'>) {
  const entry: FriendRequest = { ...request, id: 'fr_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 5), at: Date.now(), state: 'pending' };
  updateContacts({ requests: [...readContacts().requests, entry] });
  return entry;
}
export function patchFriendRequest(id: string, patch: Partial<FriendRequest>) {
  updateContacts({ requests: readContacts().requests.map(item => item.id === id ? { ...item, ...patch } : item) });
}
/** 新的朋友那行的红点：还没处理的陌生人申请。 */
export function pendingFriendCount() { return readContacts().requests.filter(item => item.kind === 'in' && item.state === 'pending').length; }

/** 名字第一个字的拼音首字母：照拼音排序，跟每个字母的第一个字比（I、U、V 没有汉字开头）；英文照字母，其他放 #。 */
const LETTERS = 'ABCDEFGHJKLMNOPQRSTWXYZ', FIRSTS = '阿八嚓哒妸发旮哈讥咔垃妈拏噢妑七呥扨它穵夕丫帀';
let collator: Intl.Collator | null = null;
export function contactInitial(name: string) {
  const first = name.trim()[0] || '';
  if (/[a-z]/i.test(first)) return first.toUpperCase();
  if (!/[㐀-鿿]/.test(first)) return '#';
  collator ||= new Intl.Collator('zh-Hans-CN-u-co-pinyin');
  let letter = '#';
  for (let i = 0; i < FIRSTS.length; i++) { if (collator.compare(first, FIRSTS[i]) >= 0) letter = LETTERS[i]; else break; }
  return letter;
}
/** 照拼音排名字。 */
export function compareContactNames(a: string, b: string) {
  collator ||= new Intl.Collator('zh-Hans-CN-u-co-pinyin');
  return collator.compare(a, b);
}
