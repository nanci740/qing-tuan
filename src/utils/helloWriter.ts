import { kv } from './kvStorage';
import { ask, personaOf, recentChat } from './friendRequests';
import { inQuietHours } from './meSettingsStorage';
import { readChatCharacters } from './chatCharacterStorage';
import { isGroup } from './chatGroups';
import { contactName } from './contactsStorage';

/**
 * 主画面「一句话」交给角色写：他想换的时候自己换。
 * 每隔两到七个小时问他一次要不要换（勿扰时间不问）；他不想换就留着原本那句。还没写过的话第一次一定写。
 */
const KEY = 'qingtuan_home_hello_ai_v1';
export const HELLO_AI_EVENT = 'qingtuan:home-hello-ai';
const MINUTE = 60000, HOUR = 60 * MINUTE;
export interface HelloAi {
  /** self：自己写；ai：交给他写 */
  mode: 'self' | 'ai';
  /** 交给哪个角色（聊天的 archiveId） */
  who: string;
  /** 他现在留的那句、什么时候写的、下次什么时候问他 */
  text: string; at: number; next: number;
  /** 他之前写过的几句（叫他别重复） */
  history: string[];
}
const EMPTY: HelloAi = { mode: 'self', who: '', text: '', at: 0, next: 0, history: [] };

export function readHelloAi(): HelloAi {
  try {
    const raw = JSON.parse(kv.getItem(KEY) || 'null');
    if (!raw || typeof raw !== 'object') return EMPTY;
    return { mode: raw.mode === 'ai' ? 'ai' : 'self', who: String(raw.who || ''), text: String(raw.text || '').slice(0, 60), at: Number(raw.at) || 0, next: Number(raw.next) || 0,
      history: Array.isArray(raw.history) ? raw.history.map(String).slice(-5) : [] };
  } catch { return EMPTY; }
}
export function writeHelloAi(patch: Partial<HelloAi>) {
  const next = { ...readHelloAi(), ...patch };
  try { kv.setItem(KEY, JSON.stringify(next)); } catch { /* 存不了就只在这次有效 */ }
  window.dispatchEvent(new CustomEvent(HELLO_AI_EVENT));
  return next;
}

/** 可以交给谁写：私聊的角色（群聊不算）。 */
export function helloPeople() {
  return readChatCharacters().filter(item => !isGroup(item)).map(item => ({ key: item.archiveId, name: contactName(item.archiveId, String(item.name || item.nickname || '').trim()) || '未命名', photo: String(item.photoUrl || '') }));
}

function ago(ms: number) {
  const minutes = Math.round(ms / MINUTE);
  return minutes < 60 ? `${Math.max(1, minutes)} 分钟前` : minutes < 60 * 24 ? `${Math.round(minutes / 60)} 个小时前` : `${Math.round(minutes / 60 / 24)} 天前`;
}
const later = (now: number) => now + (2 + Math.random() * 5) * HOUR;

/** 问他一次。force：你按了「叫他现在写一句」，一定要写。回传有没有换。 */
export async function askHello(force = false): Promise<boolean> {
  const state = readHelloAi();
  if (!state.who) throw new Error('先选要交给谁');
  const { lines } = personaOf(state.who), recent = recentChat(state.who), now = new Date();
  const clock = `${now.getMonth() + 1}月${now.getDate()}日 ${now.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit', hour12: false })}`;
  const must = force || !state.text;
  const data = await ask([...lines,
    recent ? `你们最近的私聊：\n${recent}` : '',
    `现在是 ${clock}。对方的手机主画面上有一个小窗，会显示你留给对方的一句话，对方每次打开手机都会看到。`,
    state.text ? `你现在留在那里的是「${state.text}」（${ago(Date.now() - state.at)}写的）。` : '',
    state.history.length > 1 ? `你之前写过：${state.history.slice(0, -1).map(line => `「${line}」`).join('、')}，不要重复。` : '',
    must ? '现在写一句新的。' : '要不要换一句、换成什么，都由你照人设和心情决定；没什么特别想说的就不用换。',
    '要写的话，照你的人设、你们最近的事和现在的时间，写一句想让对方看到的话：像真人随手留的，口语，30 字以内，不要加引号，不要提到「主画面」「小窗」。',
    must ? '只输出一个 JSON：{"text":"那句话"}' : '只输出一个 JSON：想换就 {"write":true,"text":"那句话"}，不想换就 {"write":false}'
  ].filter(Boolean).join('\n'));
  const text = String(data.text ?? '').replace(/^["“「『]+|["”」』]+$/g, '').trim().slice(0, 60);
  if (!text || (!must && data.write === false)) return false;
  writeHelloAi({ text, at: Date.now(), history: [...readHelloAi().history, text].slice(-5) });
  return true;
}

let busy = false;
/** 主画面开着时每几分钟看一次：到时间了就问他要不要换。 */
export async function helloTick(now = Date.now()) {
  const state = readHelloAi();
  if (busy || state.mode !== 'ai' || !state.who) return;
  if (state.text && state.next > now) return;
  if (inQuietHours(now)) { writeHelloAi({ next: now + 30 * MINUTE }); return; }
  busy = true;
  writeHelloAi({ next: later(now) });
  try { await askHello(); }
  catch { writeHelloAi({ next: Date.now() + 20 * MINUTE }); }
  finally { busy = false; }
}
