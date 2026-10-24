import { kv } from './kvStorage';

/** 「我 → 设置」：所有角色共用的设定。
    proactive 家机主动找你：after 多久没聊（分钟）、who 哪些角色（聊天的 archiveId）、perDay 一天最多几次（0 是不限）、
      chase 你没回时还追几次（-1 是看人设，不设上限，每次他自己决定要不要发）；
    schedules 定时找你：几点（time「07:30」）、哪几天（days 1 是星期一 … 7 是星期日）、谁（chatKey）、想让他做什么（note）；
    notify 通知：preview 通知要不要写内容、quiet 勿扰时间（from、to 是「23:00」这种，可以跨过半夜）；
    wallet 钱包：hide 隐藏余额、remind 信用卡提前几天提醒（0 是不提醒）；
    privacy 隐私：presence 让他看到你的在线状态、personaFor 人设送给所有角色还是只送给 personaWho。 */
export interface MeSchedule { id: string; chatKey: string; time: string; days: number[]; note: string; enabled: boolean }
export interface MeSettings {
  proactive: { enabled: boolean; after: number; who: string[]; perDay: number; chase: number };
  schedules: MeSchedule[];
  notify: { preview: boolean; quiet: boolean; from: string; to: string };
  wallet: { hide: boolean; remind: number };
  privacy: { presence: boolean; personaFor: 'all' | 'some'; personaWho: string[] };
}
const KEY = 'qingtuan_me_settings_v1', EVENT = 'qingtuan:me-settings-changed';
export const PROACTIVE_AFTER = [30, 60, 180, 720] as const;
export const PROACTIVE_PER_DAY = [1, 3, 5, 0] as const;
export const PROACTIVE_CHASE = [0, 1, 2, -1] as const;
export const WALLET_REMIND = [0, 1, 3] as const;
const time = (value: unknown, fallback: string) => /^([01]\d|2[0-3]):[0-5]\d$/.test(String(value)) ? String(value) : fallback;
const keys = (value: unknown) => (Array.isArray(value) ? value : []).map(item => String(item)).filter(Boolean).slice(0, 200);
const pick = <T extends number>(value: unknown, list: readonly T[], fallback: T): T => list.includes(Number(value) as T) ? Number(value) as T : fallback;

function clean(value: unknown): MeSettings {
  const row = value && typeof value === 'object' ? value as Record<string, Record<string, unknown>> : {};
  const p = row.proactive || {}, n = row.notify || {}, w = row.wallet || {}, v = row.privacy || {};
  const schedules = (Array.isArray(row.schedules) ? row.schedules as unknown[] : []).flatMap((item): MeSchedule[] => {
    if (!item || typeof item !== 'object') return [];
    const entry = item as Record<string, unknown>, chatKey = String(entry.chatKey || ''), id = String(entry.id || '');
    const days = [...new Set((Array.isArray(entry.days) ? entry.days : []).map(Number).filter(day => day >= 1 && day <= 7))].sort();
    return chatKey && id ? [{ id, chatKey, time: time(entry.time, '08:00'), days: days.length ? days : [1, 2, 3, 4, 5, 6, 7], note: String(entry.note || '').trim().slice(0, 40), enabled: entry.enabled !== false }] : [];
  }).slice(0, 50);
  return {
    proactive: { enabled: p.enabled === true, after: pick(p.after, PROACTIVE_AFTER, 60), who: keys(p.who), perDay: pick(p.perDay, PROACTIVE_PER_DAY, 3), chase: pick(p.chase, PROACTIVE_CHASE, 1) },
    schedules,
    notify: { preview: n.preview !== false, quiet: n.quiet === true, from: time(n.from, '23:00'), to: time(n.to, '08:00') },
    wallet: { hide: w.hide === true, remind: pick(w.remind, WALLET_REMIND, 3) },
    privacy: { presence: v.presence !== false, personaFor: v.personaFor === 'some' ? 'some' : 'all', personaWho: keys(v.personaWho) },
  };
}
let cache: MeSettings | null = null;
export function readMeSettings(): MeSettings {
  if (!cache) { try { cache = clean(JSON.parse(kv.getItem(KEY) || '{}')); } catch { cache = clean({}); } }
  return cache;
}
export function writeMeSettings(next: MeSettings) {
  cache = clean(next);
  kv.setItem(KEY, JSON.stringify(cache));
  window.dispatchEvent(new CustomEvent(EVENT));
}
/** 改其中一块：updateMeSettings('notify', { quiet: true }) */
export function updateMeSettings<K extends keyof MeSettings>(part: K, patch: Partial<MeSettings[K]>) {
  const current = readMeSettings();
  writeMeSettings({ ...current, [part]: { ...current[part], ...patch } });
}
export function writeSchedules(schedules: MeSchedule[]) { writeMeSettings({ ...readMeSettings(), schedules }); }
export function subscribeMeSettings(listener: () => void) {
  window.addEventListener(EVENT, listener);
  return () => window.removeEventListener(EVENT, listener);
}

const minutes = (value: string) => { const [hour, minute] = value.split(':').map(Number); return hour * 60 + minute; };
/** 现在是不是勿扰时间（from 比 to 晚就是跨过半夜，例如 23:00 到 08:00）。 */
export function inQuietHours(at = Date.now()) {
  const { quiet, from, to } = readMeSettings().notify;
  if (!quiet || from === to) return false;
  const date = new Date(at), now = date.getHours() * 60 + date.getMinutes(), start = minutes(from), end = minutes(to);
  return start < end ? now >= start && now < end : now >= start || now < end;
}
/** 你的人设要不要送给这个角色。 */
export function personaAllowed(chatKey: string) {
  const { personaFor, personaWho } = readMeSettings().privacy;
  return personaFor === 'all' || personaWho.includes(chatKey);
}
