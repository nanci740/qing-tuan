import { ask, personaOf, recentChat } from './friendRequests';
import { describePost, momentPeople } from './momentsEngine';
import { readMoments } from './momentsStorage';
import { dayOf, readDiary, saveEntry, updateDiary } from './diaryStorage';
import type { DiaryEntry } from './diaryStorage';

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

/** 私聊时接在提示词后面：他一周内写的日记（最近三篇），还有你给他看的日记。 */
export function diaryMemory(chatKey: string) {
  const since = Date.now() - 7 * DAY, { entries } = readDiary();
  const his = entries.filter(entry => entry.by === chatKey && entry.at > since).slice(-3), shared = entries.filter(entry => entry.by === 'me' && entry.share?.includes(chatKey) && entry.at > since).slice(-2);
  const parts = [
    his.length ? `你最近写的日记（只有你自己知道写了什么，对方不知道你写日记；可以影响你的心情和说话，但不要直接念出来）：\n${his.map(describeEntry).join('\n\n')}` : '',
    shared.length ? `对方给你看过的日记（对方知道你看过）：\n${shared.map(describeEntry).join('\n\n')}` : '',
  ].filter(Boolean);
  return parts.join('\n\n');
}
