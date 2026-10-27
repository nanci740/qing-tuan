import { ask, personaOf, recentChat } from './friendRequests';
import { describePost, momentPeople } from './momentsEngine';
import { readMoments } from './momentsStorage';
import { dayOf, readDiary, saveEntry, updateDiary } from './diaryStorage';
import type { DiaryEntry } from './diaryStorage';
import { readChatCharacters } from './chatCharacterStorage';
import { showToast } from './toast';

const MINUTE = 60000, DAY = 24 * 60 * MINUTE;
const str = (value: unknown, max: number) => String(value ?? '').trim().slice(0, max);
const WEEK = '日一二三四五六';
/** 第 days 天之后的晚上九点到十一点半之间（他睡前写）。 */
function evening(now: number, days: number) {
  const date = new Date(now + days * DAY);
  date.setHours(21, 0, 0, 0);
  return date.getTime() + Math.random() * 150 * MINUTE;
}
/** 下一次写：每天就是今晚（过了九点就明晚），隔几天是两到四天后的晚上。 */
function nextTime(now: number, rate: 'daily' | 'sometimes', first: boolean) {
  if (rate === 'sometimes') return evening(now, first ? Math.floor(Math.random() * 2) : 2 + Math.floor(Math.random() * 3));
  const tonight = evening(now, 0);
  return first && tonight > now ? tonight : evening(now, 1);
}
/** 一篇写成给模型看的样子。 */
function describeEntry(entry: DiaryEntry) {
  return `${entry.day}${entry.weather ? ' ' + entry.weather : ''}${entry.mood ? ' ' + entry.mood : ''}《${entry.title || '无题'}》\n${entry.body.replace(/~~(.+?)~~/g, '（划掉了：$1）')}`;
}

/** 他写今天的日记：照人设、今天跟你聊的、今天朋友圈发生的事、前两篇日记、你给他看的日记，写他自己的一天。 */
export async function writeDiary(key: string) {
  const { lines } = personaOf(key), now = new Date(), today = dayOf(now.getTime());
  const recent = recentChat(key), { entries } = readDiary();
  const moments = readMoments().posts.filter(post => (post.by === key || post.by === 'me') && dayOf(post.at) === today).map(post => describePost(post, key));
  const mine = entries.filter(entry => entry.by === key).slice(-2), shared = entries.filter(entry => entry.by === 'me' && entry.share?.includes(key) && now.getTime() - entry.at < 7 * DAY).slice(-2);
  const data = await ask([...lines,
    recent ? `你们最近的私聊：\n${recent}` : '',
    moments.length ? `今天朋友圈里的事：\n${moments.join('\n')}` : '',
    shared.length ? `对方给你看过的日记：\n${shared.map(describeEntry).join('\n\n')}` : '',
    mine.length ? `你前几篇日记：\n${mine.map(describeEntry).join('\n\n')}` : '',
    `今天是 ${now.getMonth() + 1}月${now.getDate()}日 星期${WEEK[now.getDay()]}，晚上了。照你的人设写今天的日记：第一人称，写你自己这一天的生活、心情和想法，有时会写到对方（用你平常心里怎么称呼对方），但不要整篇都是对方。像真人写的日记，150 到 400 字，可以零碎、可以口是心非；写了又后悔的字用 ~~这样~~ 包起来（划掉，一篇最多一两处）。不要跟前几篇重复。`,
    '只输出一个 JSON：{"title":"标题（短，可以是无题）","weather":"天气（一两个字）","mood":"心情（两四个字）","body":"正文"}',
  ].filter(Boolean).join('\n'));
  const body = str(data.body, 4000);
  if (!body) throw new Error('没写出来，再试一次');
  return saveEntry({ by: key, at: Date.now(), day: today, title: str(data.title, 40) || '无题', weather: str(data.weather, 8), mood: str(data.mood, 12), body });
}

let busy = false;
/** 每分钟看一次：该写日记的人写一篇（一次最多一个）；出错就十分钟后再试。 */
export async function diaryTick(now = Date.now()) {
  const { rate, next } = readDiary();
  if (busy || rate === 'off') return;
  busy = true;
  try {
    const people = momentPeople(), schedule = { ...next };
    for (const item of people) if (!schedule[item.archiveId]) schedule[item.archiveId] = nextTime(now, rate, true);
    const due = people.find(item => schedule[item.archiveId] <= now);
    if (due) schedule[due.archiveId] = nextTime(now, rate, false);
    updateDiary({ next: schedule });
    if (due) { try { await writeDiary(due.archiveId); } catch { updateDiary({ next: { ...readDiary().next, [due.archiveId]: Date.now() + 10 * MINUTE } }); } }
  } finally { busy = false; }
}

/** 私聊时接在提示词后面：他一周内写的日记（最近三篇）、你给他看的日记；两本日记的锁（他的密码、你的本子他打不打得开、他撬过没有、他发现你撬他的没有）。 */
export function diaryMemory(chatKey: string) {
  const now = Date.now(), since = now - 7 * DAY, { entries, locks, seenBy, caught } = readDiary(), lock = locks[chatKey];
  const his = entries.filter(entry => entry.by === chatKey && entry.at > since).slice(-3), shared = entries.filter(entry => entry.by === 'me' && entry.share?.includes(chatKey) && entry.at > since).slice(-2);
  const mine = seenBy[chatKey] ? entries.filter(entry => entry.by === 'me').slice(-3) : [];
  const parts = [
    his.length ? `你最近写的日记（只有你自己知道写了什么，对方不知道你写日记；可以影响你的心情和说话，但不要直接念出来）：\n${his.map(describeEntry).join('\n\n')}` : '',
    lock ? `你的日记上了锁，密码是 ${lock.code}（你留给对方的提示：「${lock.hint}」）。只有你知道；对方跟你要的话，照你的人设决定给不给，要给就把四位数字直接写在回话里。想换密码就在 JSON 最外层加 "diary_code":"新的四位数字"，换了以后对方就打不开了。` : '',
    lock && caught[chatKey] && now - caught[chatKey] < 3 * DAY ? '你之前发现对方撬开你的日记偷看过，你记得这件事。' : '',
    shared.length ? `对方给你看过的日记（对方知道你看过）：\n${shared.map(describeEntry).join('\n\n')}` : '',
    mine.length ? `你${seenBy[chatKey] === 'crack' ? '偷偷撬开过对方上锁的日记（对方的本子上留了痕迹，可能已经发现了）' : '用对方给你的密码打开过对方的日记'}，里面最近写的是：\n${mine.map(describeEntry).join('\n\n')}` : '',
    !seenBy[chatKey] && locks.me ? '对方也有一本上锁的日记，你不知道密码。想看可以跟对方要；照你的人设，很偶尔也可以偷偷撬开：在 JSON 最外层加 "diary":"crack"（会在对方本子上留下痕迹，对方会发现）。这是很少做的事，平常不要加。' : '',
  ].filter(Boolean);
  return parts.join('\n\n');
}

type Peer = Window & { smallphoneChatProactive?: (key: string, prompt: string) => void; smallphoneChatNotice?: (key: string, text: string) => void };
const tell = (key: string, prompt: string) => (window as Peer).smallphoneChatProactive?.(key, `[系统提示：这条不是对方说的话，不要回应这条本身] ${prompt}`);
const nameOf = (key: string) => String(readChatCharacters().find(item => item.archiveId === key)?.name || '');
/** 他的锁：第一次要用的时候，照他的人设想一个四位数字密码和一句留给你的提示。 */
export async function ensureLock(key: string) {
  const existing = readDiary().locks[key];
  if (existing) return existing;
  const { lines } = personaOf(key);
  const data = await ask([...lines,
    '你的日记本上了一把四位数字的密码锁。照你的人设想一个密码（可以是对你有意义的日期、数字），再写一句留给对方的提示，让对方有机会猜到，但不能直接写出数字。',
    '只输出一个 JSON：{"code":"四位数字","hint":"提示（一句话）"}',
  ].join('\n'));
  const code = /^\d{4}$/.test(String(data.code)) ? String(data.code) : String(Math.floor(1000 + Math.random() * 9000));
  const lock = { code, hint: str(data.hint, 40) || '你猜' };
  updateDiary({ locks: { ...readDiary().locks, [key]: lock } });
  return lock;
}
/** 你猜他的密码：猜对了以后都打得开；猜错了他会知道你猜了什么。 */
export function tryCode(key: string, guess: string) {
  const { locks, access, misses } = readDiary();
  if (locks[key]?.code === guess) { updateDiary({ access: { ...access, [key]: 'code' }, misses: { ...misses, [key]: 0 } }); return 0; }
  const count = (misses[key] || 0) + 1;
  updateDiary({ misses: { ...misses, [key]: count } });
  tell(key, `对方刚刚在偷偷猜你日记的密码，猜了「${guess}」，猜错了（这是第 ${count} 次）。照你的人设对这件事做出反应。`);
  return count;
}
/** 跟他要密码：聊天里留一行灰字，他照人设决定给不给。 */
export function askCode(key: string) {
  (window as Peer).smallphoneChatNotice?.(key, `你跟${nameOf(key)}要了日记的密码`);
  tell(key, '对方跟你要你日记的密码。照你的人设决定给不给；要给的话就把四位数字直接写在回话里。');
}
/** 他发现你撬他的日记：记下来，他在聊天里反应，可能换密码。 */
function caughtBy(key: string, how: string) {
  updateDiary({ caught: { ...readDiary().caught, [key]: Date.now() } });
  tell(key, `你发现对方撬开了你上锁的日记在偷看（${how}被你发现的）。照你的人设反应；想换密码就在 JSON 最外层加 "diary_code":"新的四位数字"。`);
}
/** 你撬开他的：马上能看；撬的那一下 30% 会被发现。 */
export function crackLock(key: string) {
  updateDiary({ access: { ...readDiary().access, [key]: 'crack' } });
  if (Math.random() < .3) caughtBy(key, '撬锁的时候');
}
/** 撬开以后每翻开一篇，15% 会被发现。 */
export function peekEntry(entry: DiaryEntry) {
  if (readDiary().access[entry.by] === 'crack' && Math.random() < .15) caughtBy(entry.by, `翻开《${entry.title || '无题'}》的时候`);
}
/** 你的锁：设、改密码；改了以后他们都要重新问（撬过的也打不开了）。 */
export function setMyCode(code: string) { updateDiary({ locks: { ...readDiary().locks, me: { code, hint: '' } }, lockedAt: Date.now(), seenBy: {} }); }

/** 聊天里说出来的话：你说出你的密码，他就知道了；他说出他的密码，你就知道了。 */
export function diaryHeard(key: string, said: string, from: 'user' | 'peer') {
  const { locks, seenBy, access, traces } = readDiary();
  if (from === 'user' && locks.me && said.includes(locks.me.code) && seenBy[key] !== 'code') {
    updateDiary({ seenBy: { ...seenBy, [key]: 'code' }, traces: [...traces, { by: key, kind: 'code', at: Date.now() }] });
  }
  if (from === 'peer' && locks[key] && said.includes(locks[key].code) && access[key] !== 'code') {
    updateDiary({ access: { ...access, [key]: 'code' } });
    showToast(`拿到${nameOf(key)}日记的密码了`);
  }
}
/** 他回话里的动作：撬开你的日记（留下痕迹）、换他的密码（你又打不开了）。 */
export function diaryAction(key: string, raw: string) {
  const { locks, seenBy, traces, access } = readDiary();
  if (/"diary"\s*:\s*"crack"/.test(raw) && locks.me && !seenBy[key]) updateDiary({ seenBy: { ...seenBy, [key]: 'crack' }, traces: [...traces, { by: key, kind: 'crack', at: Date.now() }] });
  const code = /"diary_code"\s*:\s*"(\d{4})"/.exec(raw)?.[1];
  if (code && locks[key] && locks[key].code !== code) {
    const rest = { ...access }; delete rest[key];
    updateDiary({ locks: { ...readDiary().locks, [key]: { ...locks[key], code } }, access: rest, misses: { ...readDiary().misses, [key]: 0 } });
  }
}
