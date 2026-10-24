import { kv } from './kvStorage';
import { inQuietHours, readMeSettings } from './meSettingsStorage';

/** 家机主动找你：每个聊天记今天找过几次、上次什么时候找、连着几次你都没回。 */
interface Log { day: string; count: number; lastAt: number; streak: number }
const KEY = 'qingtuan_proactive_log_v1';
/** 你一直没回，最多连着找你几次就停（等你回了再算）。 */
const MAX_STREAK = 2;
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

/** 现在该不该有人主动找你：设定里勾的角色、过了设定的时间没聊、今天还没找满、你没有一直不回、不在勿扰时间。挑最久没聊的那个。 */
export function pickProactive(chats: { key: string; html: string; time: number }[], now = Date.now()) {
  const { enabled, after, who, perDay } = readMeSettings().proactive;
  if (!enabled || inQuietHours(now)) return null;
  const log = readLog();
  let best: { key: string; idle: number; lastUser: number; streak: number } | null = null;
  for (const chat of chats) {
    if (!who.includes(chat.key) || !chat.html.includes('chat-message-row')) continue;
    const last = Math.max(chat.time, lastSent(chat.html, '.chat-message-row')), idle = now - last;
    if (idle < after * 60000) continue;
    const entry = log[chat.key], lastUser = lastSent(chat.html, '.chat-message-row.is-user');
    if (entry && entry.day === today(now) && perDay && entry.count >= perDay) continue;
    const streak = entry && entry.lastAt > lastUser ? entry.streak : 0;
    if (streak >= MAX_STREAK) continue;
    if (!best || idle > best.idle) best = { key: chat.key, idle, lastUser, streak };
  }
  if (!best) return null;
  const clock = new Date(now).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit', hour12: false });
  const prompt = `[系统提示：这条不是对方说的话，不要回应这条本身] 对方已经 ${gapText(best.idle)}没在聊天里说话了，现在是 ${clock}。` +
    (best.streak ? '你上次主动发的消息对方还没回。' : '') +
    '你想主动找对方：可以接着之前没聊完的话、分享你正在做的事或看到的东西、问对方在忙什么，或者照时间关心对方吃饭、睡觉，照你的人设和你们的关系决定说什么、语气怎么样，像真人一样自然地开口。不要提到「系统提示」，也不要一开口就抱怨对方不理你，除非那很符合你的人设。';
  return { chatKey: best.key, prompt };
}
/** 记下这次主动找了谁（今天第几次、你没回的话连着第几次）。 */
export function noteProactive(chatKey: string, html: string, now = Date.now()) {
  const log = readLog(), entry = log[chatKey], lastUser = lastSent(html, '.chat-message-row.is-user');
  log[chatKey] = { day: today(now), count: entry && entry.day === today(now) ? entry.count + 1 : 1, lastAt: now, streak: entry && entry.lastAt > lastUser ? entry.streak + 1 : 1 };
  kv.setItem(KEY, JSON.stringify(log));
}
