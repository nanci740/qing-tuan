import { kv } from './kvStorage';
import { readImageSlot, saveImageSlots } from './imageAssets';

/** 聊天 App「我」：名片（跟主画面的个人资料分开）和人设。人设可以有好几个，全部聊天同时只用一个。 */
export interface MePersona { id: string; name: string; appearance: string; about: string }
export interface MeStore { name: string; handle: string; signature: string; mood: string; personas: MePersona[]; activeId: string }

const KEY = 'qingtuan_me_v1', AVATAR_KEY = 'qingtuan_me_avatar', EVENT = 'qingtuan:me-changed';
const uid = () => 'me-' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
const text = (value: unknown, max: number) => String(value ?? '').slice(0, max);

function clean(value: unknown): MeStore {
  const raw = value && typeof value === 'object' ? value as Record<string, unknown> : {};
  const personas = (Array.isArray(raw.personas) ? raw.personas : []).flatMap((item): MePersona[] => {
    if (!item || typeof item !== 'object') return [];
    const row = item as Record<string, unknown>;
    return [{ id: typeof row.id === 'string' && row.id ? row.id : uid(), name: text(row.name, 40), appearance: text(row.appearance, 2000), about: text(row.about, 4000) }];
  });
  const activeId = personas.some(item => item.id === raw.activeId) ? String(raw.activeId) : '';
  return { name: text(raw.name, 40), handle: text(raw.handle, 30), signature: text(raw.signature, 60), mood: text(raw.mood, 20), personas, activeId };
}

let cache: MeStore | null = null;
export function readMe(): MeStore {
  if (!cache) { try { cache = clean(JSON.parse(kv.getItem(KEY) || 'null')); } catch { cache = clean(null); } }
  return cache;
}
export function writeMe(next: MeStore) {
  cache = clean(next);
  kv.setItem(KEY, JSON.stringify(cache));
  window.dispatchEvent(new CustomEvent(EVENT));
}
export function subscribeMe(listener: () => void) {
  window.addEventListener(EVENT, listener);
  return () => window.removeEventListener(EVENT, listener);
}
export function newPersona(): MePersona { return { id: uid(), name: '', appearance: '', about: '' }; }

/** 正在用的人设；没设就是 null。 */
export function activePersona(): MePersona | null {
  const store = readMe();
  return store.personas.find(item => item.id === store.activeId) || null;
}
/** 送给他的「你的人设」文字；没有就是空字符串。 */
export function activePersonaPrompt(): string {
  const persona = activePersona();
  if (!persona) return '';
  return [persona.name && '名字：' + persona.name, persona.appearance.trim() && '外貌：' + persona.appearance.trim(), persona.about.trim() && '关于对方：' + persona.about.trim()].filter(Boolean).join('\n');
}

export function readMeAvatar() { try { return readImageSlot(AVATAR_KEY) || ''; } catch { return ''; } }
export async function saveMeAvatar(dataUrl: string) {
  await saveImageSlots({ [AVATAR_KEY]: dataUrl });
  window.dispatchEvent(new CustomEvent(EVENT));
}
