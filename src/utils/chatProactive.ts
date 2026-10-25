import { kv } from './kvStorage';
import { inQuietHours, readMeSettings } from './meSettingsStorage';

/** 家机主动找你：每个聊天记今天找过几次、上次什么时候找、连着几次你都没回。 */
interface Log { day: string; count: number; lastAt: number; streak: number }
const KEY = 'qingtuan_proactive_log_v1', SCHEDULE_KEY = 'qingtuan_schedule_log_v1';
/** 定时找你：到点过了多久还补发（小手机那时候没开着）。 */
const SCHEDULE_GRACE = 30 * 60000;
const today = (at = Date.now()) => new Date(at).toDateString();
function readLog(): Record<string, Log> {
  try { const saved = JSON.parse(kv.getItem(KEY) || '{}'); return saved && typeof saved === 'object' ? saved : {}; } catch { return {}; }
}
const lastSent = (html: string, selector: string) => {
  const template = document.createElement('template'); template.innerHTML = html;
  const rows = template.content.querySelectorAll<HTMLElement>(selector);
  return Number(rows[rows.length - 1]?.dataset.sentAt) || 0;
};
function gapText(ms: number) {
  const minutes = Math.round(ms / 60000);
  return minutes < 60 ? `${minutes} 分钟` : minutes < 60 * 24 ? `${Math.round(minutes / 60)} 个小时` : `${Math.round(minutes / 60 / 24)} 天`;
}

/** 现在该不该有人主动找你：设定里勾的角色、过了设定的时间没聊、今天还没找满、你没回的话还在追发的次数内、不在勿扰时间。挑最久没聊的那个。
    你没回时他再追：每追一次要等的时间翻倍（1 小时、2 小时、4 小时…）；追几次照设定，看人设就不设上限，由他自己决定要不要发。 */
export function pickProactive(chats: { key: string; html: string; time: number; group?: boolean }[], now = Date.now()) {
  const { enabled, after, who, perDay, chase } = readMeSettings().proactive;
  if (!enabled || inQuietHours(now)) return null;
  const log = readLog();
  let best: { key: string; idle: number; lastUser: number; streak: number; group: boolean } | null = null;
  for (const chat of chats) {
    if (!who.includes(chat.key) || !chat.html.includes('chat-message-row')) continue;
    const entry = log[chat.key], lastUser = lastSent(chat.html, '.chat-message-row.is-user');
    if (entry && entry.day === today(now) && perDay && entry.count >= perDay) continue;
    const streak = entry && entry.lastAt > lastUser ? entry.streak : 0;
    if (chase >= 0 && streak > chase) continue;
    const last = Math.max(chat.time, lastSent(chat.html, '.chat-message-row'), streak ? entry!.lastAt : 0), idle = now - last;
    if (idle < after * 60000 * 2 ** streak) continue;
    if (!best || idle > best.idle) best = { key: chat.key, idle, lastUser, streak, group: !!chat.group };
  }
  if (!best) return null;
  const clock = new Date(now).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit', hour12: false });
  // 群聊：冷场了，成员自己聊起来
  if (best.group) return { chatKey: best.key, prompt: `[系统提示：这条不是用户说的话，不要回应这条本身] 群里已经 ${gapText(best.idle)}没人说话了，现在是 ${clock}。` +
    (best.streak ? `之前群里的人冒泡，用户已经连着 ${best.streak} 次没接话。` + (chase < 0 ? '这次要不要再冒泡由成员照人设决定：都不想说就回 {"replies":[]}，什么都不会发出去。' : '') : '') +
    '让一两个成员照自己的人设自然地冒泡：分享在做的事、看到的东西、接着之前的话题，或成员之间聊起来，也可以 @用户；不用每个人都说，不要提到「系统提示」。' };
  const prompt = `[系统提示：这条不是对方说的话，不要回应这条本身] 对方已经 ${gapText(best.idle)}没在聊天里说话了，现在是 ${clock}。` +
    (best.streak ? `你之前主动找对方，对方已经连着 ${best.streak} 次没回了。` + (chase < 0 ? '这次要不要再发由你照人设决定：不想发就回 {"replies":[]}，什么都不会发出去。' : '') : '') +
    '你想主动找对方：可以接着之前没聊完的话、分享你正在做的事或看到的东西、问对方在忙什么，或者照时间关心对方吃饭、睡觉，照你的人设和你们的关系决定说什么、语气怎么样，像真人一样自然地开口。不要提到「系统提示」，也不要一开口就抱怨对方不理你，除非那很符合你的人设。';
  return { chatKey: best.key, prompt };
}
/** 记下这次主动找了谁（今天第几次、你没回的话连着第几次）。 */
export function noteProactive(chatKey: string, html: string, now = Date.now()) {
  const log = readLog(), entry = log[chatKey], lastUser = lastSent(html, '.chat-message-row.is-user');
  log[chatKey] = { day: today(now), count: entry && entry.day === today(now) ? entry.count + 1 : 1, lastAt: now, streak: entry && entry.lastAt > lastUser ? entry.streak + 1 : 1 };
  kv.setItem(KEY, JSON.stringify(log));
}

/** 定时找你：今天该响、到点了、还在补发时间内、今天还没响过的那几条（照到点时间排）。拿到就算响过，同一条一天只响一次。勿扰时间照样响，是你自己定的。 */
export function dueSchedules(now = Date.now()) {
  let fired: Record<string, string> = {};
  try { const saved = JSON.parse(kv.getItem(SCHEDULE_KEY) || '{}'); if (saved && typeof saved === 'object') fired = saved; } catch { /* 当作都没响过 */ }
  const date = new Date(now), weekday = date.getDay() || 7, day = today(now);
  const due = readMeSettings().schedules.filter(item => {
    if (!item.enabled || !item.days.includes(weekday) || fired[item.id] === day) return false;
    const [hour, minute] = item.time.split(':').map(Number), at = new Date(date.getFullYear(), date.getMonth(), date.getDate(), hour, minute).getTime();
    return now >= at && now - at <= SCHEDULE_GRACE;
  }).sort((a, b) => a.time.localeCompare(b.time));
  if (!due.length) return [];
  for (const item of due) fired[item.id] = day;
  kv.setItem(SCHEDULE_KEY, JSON.stringify(fired));
  return due.map(item => ({ chatKey: item.chatKey, prompt: `[系统提示：这条不是对方说的话，不要回应这条本身] 现在是 ${item.time}，对方之前跟你约好这个时间你会主动来找对方` +
    (item.note ? `，要你：${item.note}` : '') + '。照你的人设和你们的关系，像真人一样自然地开口，不管你们刚刚有没有在聊。不要提到「系统提示」或「约好的定时」这种字眼。' }));
}
