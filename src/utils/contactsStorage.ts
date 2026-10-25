import { kv } from './kvStorage';
import type { CharacterDossier } from '../types/characterDossier';

/** 通讯录（key 是聊天的 archiveId）：
    remarks 你给角色取的备注——聊天列表、聊天室、消息上的名字换成备注，他那边照旧用本名；
    tags 你建的标签，tagged 谁贴了哪些标签；
    requests 新的朋友：in 别人来加你（陌生人有 profile，收下后建档案；被你删掉的好友有 chatKey），out 你去加别人（chatKey 是谁，due 他什么时候回）；
    stranger 陌生人多久来一个（off 关、some 偶尔、often 常常），nextStrangerAt 下一个最早什么时候来；
    blocked 你拉黑的（他发的私聊照样出现，只是被你拒收；tries、next 跟 deleted 一样，是他来申请加你的次数和下一次）、blockedBy 把你拉黑的（next 是下一次让他想想要不要放你出来的时间）；
    deleted 你删掉的好友（tries 他来加过几次，next 下一次想想要不要来加你，0 就是不来了）。都只管私聊，群里照常。 */
export interface ContactTag { id: string; name: string }
export interface FriendRequest {
  id: string; kind: 'in' | 'out'; at: number; state: 'pending' | 'accepted' | 'rejected';
  name: string; greeting: string; intro: string; meta: string; meet: string;
  profile?: Partial<CharacterDossier>; dossierId?: string; chatKey?: string; due?: number;
}
export type StrangerRate = 'off' | 'some' | 'often';
interface Contacts { remarks: Record<string, string>; tags: ContactTag[]; tagged: Record<string, string[]>; requests: FriendRequest[]; stranger: StrangerRate; nextStrangerAt: number;
  blocked: Record<string, { at: number; tries: number; next: number }>; blockedBy: Record<string, { at: number; next: number }>; deleted: Record<string, { at: number; tries: number; next: number }> }
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
    if (!entry?.id || !text(entry.name, 20) || entry.kind === 'out' && !entry.chatKey) return [];
    return [{ id: String(entry.id), kind: entry.kind === 'out' ? 'out' : 'in', at: Number(entry.at) || 0, state: entry.state === 'accepted' || entry.state === 'rejected' ? entry.state : 'pending',
      name: text(entry.name, 20), greeting: text(entry.greeting, 120), intro: text(entry.intro, 300), meta: text(entry.meta, 40), meet: text(entry.meet, 40),
      ...(entry.profile && typeof entry.profile === 'object' ? { profile: entry.profile as Partial<CharacterDossier> } : {}),
      ...(entry.dossierId ? { dossierId: String(entry.dossierId) } : {}), ...(entry.chatKey ? { chatKey: String(entry.chatKey) } : {}), ...(Number(entry.due) ? { due: Number(entry.due) } : {}) }];
  }).slice(-60);
  const record = (value: unknown) => value && typeof value === 'object' ? Object.entries(value as Record<string, Record<string, unknown>>).filter(([key, item]) => key && item && typeof item === 'object') : [];
  const blocked = Object.fromEntries(record(row.blocked).map(([key, item]) => [key, { at: Number(item.at) || 0, tries: Number(item.tries) || 0, next: Number(item.next) || 0 }]));
  const blockedBy = Object.fromEntries(record(row.blockedBy).map(([key, item]) => [key, { at: Number(item.at) || 0, next: Number(item.next) || 0 }]));
  const deleted = Object.fromEntries(record(row.deleted).map(([key, item]) => [key, { at: Number(item.at) || 0, tries: Number(item.tries) || 0, next: Number(item.next) || 0 }]));
  return { remarks, tags, tagged, requests, stranger: row.stranger === 'some' || row.stranger === 'often' ? row.stranger : 'off', nextStrangerAt: Number(row.nextStrangerAt) || 0, blocked, blockedBy, deleted };
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
/** 拉黑：你拉黑他、他拉黑你（next 是下一次让他想想要不要放你出来）。 */
export const isBlocked = (key: string) => !!readContacts().blocked[key];
export const isBlockedBy = (key: string) => !!readContacts().blockedBy[key];
export function setBlocked(key: string, on: boolean) {
  const blocked = { ...readContacts().blocked };
  if (on) blocked[key] = { at: Date.now(), tries: 0, next: Date.now() + (10 + Math.random() * 20) * MINUTE }; else delete blocked[key];
  updateContacts({ blocked });
}
const HOUR = 3600000, MINUTE = 60000;
export function setBlockedBy(key: string, on: boolean, now = Date.now()) {
  const blockedBy = { ...readContacts().blockedBy };
  if (on) blockedBy[key] = { at: now, next: now + (2 + Math.random() * 4) * HOUR }; else delete blockedBy[key];
  updateContacts({ blockedBy });
}
/** 他把你拉黑了、该让他想想了的那几个（拿了就排下一次：三到八小时后）。 */
export function dueUnblockChecks(now = Date.now()) {
  const { blockedBy } = readContacts(), due = Object.entries(blockedBy).filter(([, item]) => item.next <= now).map(([key]) => key);
  if (due.length) updateContacts({ blockedBy: Object.fromEntries(Object.entries(blockedBy).map(([key, item]) => [key, due.includes(key) ? { ...item, next: now + (3 + Math.random() * 5) * HOUR } : item])) });
  return due;
}
/** 删好友：删了以后十分钟到半小时，他想想要不要来加你（你拉黑他也一样，他会来申请让你放他出来）。 */
export const isDeleted = (key: string) => !!readContacts().deleted[key];
export function setDeleted(key: string, on: boolean, now = Date.now()) {
  const deleted = { ...readContacts().deleted };
  if (on) deleted[key] = { at: now, tries: 0, next: now + (10 + Math.random() * 20) * MINUTE }; else delete deleted[key];
  updateContacts({ deleted });
}
export type Cut = 'blocked' | 'deleted';
export function patchCut(kind: Cut, key: string, patch: Partial<{ tries: number; next: number }>) {
  const map = readContacts()[kind];
  if (map[key]) updateContacts({ [kind]: { ...map, [key]: { ...map[key], ...patch } } });
}
/** 你拉黑或删掉的人里，该想想要不要来加你的那几个（拿了就先排开，他想完再排下一次）。 */
export function dueReadds(now = Date.now()) {
  const contacts = readContacts(), due = (['blocked', 'deleted'] as Cut[]).flatMap(kind => Object.entries(contacts[kind]).filter(([, item]) => item.next && item.next <= now).map(([key]) => ({ key, kind })));
  due.forEach(item => patchCut(item.kind, item.key, { next: 0 }));
  return due;
}
/** 你发出去、该他回的申请（拿了就清掉 due，免得回两次）。 */
export function dueOutRequests(now = Date.now()) {
  const due = readContacts().requests.filter(item => item.kind === 'out' && item.state === 'pending' && item.due && item.due <= now);
  if (due.length) updateContacts({ requests: readContacts().requests.map(item => due.some(one => one.id === item.id) ? { ...item, due: 0 } : item) });
  return due;
}
/** 新的朋友那行的红点：还没处理的别人来加你。 */
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
