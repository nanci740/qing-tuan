import { kv } from './kvStorage';

/** 通讯录：你给角色取的备注（key 是聊天的 archiveId）。备注只给你看——聊天列表、聊天室、消息上的名字换成备注，他那边照旧用本名。 */
interface Contacts { remarks: Record<string, string> }
const KEY = 'qingtuan_contacts_v1', EVENT = 'qingtuan:contacts-changed';
let cache: Contacts | null = null;
function clean(value: unknown): Contacts {
  const raw = value && typeof value === 'object' ? (value as Record<string, unknown>).remarks : null, remarks: Record<string, string> = {};
  if (raw && typeof raw === 'object') for (const [key, remark] of Object.entries(raw)) { const text = String(remark || '').trim().slice(0, 20); if (key && text) remarks[key] = text; }
  return { remarks };
}
export function readContacts(): Contacts {
  if (!cache) { try { cache = clean(JSON.parse(kv.getItem(KEY) || '{}')); } catch { cache = clean({}); } }
  return cache;
}
export function contactRemark(key: string) { return readContacts().remarks[key] || ''; }
/** 给你看的名字：有备注用备注，没有就用本名。 */
export function contactName(key: string, name: string) { return contactRemark(key) || name; }
/** 设备注；空字符串就是拿掉。 */
export function setContactRemark(key: string, remark: string) {
  const remarks = { ...readContacts().remarks }, text = remark.trim().slice(0, 20);
  if (text) remarks[key] = text; else delete remarks[key];
  cache = { remarks }; kv.setItem(KEY, JSON.stringify(cache));
  window.dispatchEvent(new CustomEvent(EVENT));
}
export function subscribeContacts(listener: () => void) {
  window.addEventListener(EVENT, listener);
  return () => window.removeEventListener(EVENT, listener);
}

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
