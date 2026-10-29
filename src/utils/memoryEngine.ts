import type { ApiService } from '../types/api';
import type { ChatCharacter } from '../types/chatCharacters';
import { extractChatAiReply } from './chatReplyParser';
import { readChatCharacters } from './chatCharacterStorage';
import { readChatRecords } from './chatRecords';
import { loadChatPreferences } from './chatPreferences';
import { groupMembers, isGroup, memberName } from './chatGroups';
import { personaOf } from './friendRequests';
import { readMe } from './meStorage';
import { addMemories, isKind, readMemories, updateMemories } from './memoryStorage';
import type { MemoryItem, MemoryKind } from './memoryStorage';
import { fillVectors, rankByMeaning, similarPairs, vectorModel } from './memoryVectors';

export const KIND_NAME: Record<MemoryKind, string> = { you: '关于你', event: '发生过', promise: '约定' };
const str = (value: unknown, max: number) => String(value ?? '').trim().slice(0, max);
const day = (at: number) => { const date = new Date(at); return `${date.getMonth() + 1}/${date.getDate()}`; };
const characters = () => readChatCharacters();
const find = (key: string) => characters().find(item => item.archiveId === key) || null;
const userName = () => readMe().name || '对方';

/** 群里的成员名字 → archiveId（大家、所有人、没写的回传空的，就是大家都记得）。 */
function whoOf(group: ChatCharacter, name: unknown) {
  const wanted = str(name, 20);
  if (!wanted || /^(大家|所有人|全部)$/.test(wanted)) return [];
  const member = groupMembers(group, characters()).find(item => memberName(item) === wanted || item.name === wanted);
  return member ? [member.archiveId] : [];
}

/** 他这次能想起的：私聊是跟你的记忆，加上他在的群里他记得的；群聊是群里的记忆，加上每个成员私下记得关于你的事。
    钉住的、关于你、约定都带上（新的在前，最多十五条）；发生过的带最近几条，再加跟这次聊天相关的：
    设了向量模型就照意思挑（最近三条加最接近的六条），没设或算不出来就照字眼（最近六条加对得上字眼的四条）。 */
async function recall(chatKey: string, recentText: string) {
  const { items } = readMemories(), chat = find(chatKey), all = characters();
  const groups = isGroup(chat) ? [] : all.filter(item => isGroup(item) && item.group?.members.includes(chatKey)).map(item => item.archiveId);
  const memberKeys = isGroup(chat) ? groupMembers(chat, all).map(item => item.archiveId) : [];
  const mine = items.filter(item => item.chat === chatKey
    || groups.includes(item.chat) && (!item.who?.length || item.who.includes(chatKey))
    || memberKeys.includes(item.chat) && item.kind === 'you');
  const newest = (list: MemoryItem[]) => list.slice().sort((a, b) => b.at - a.at);
  const pinned = mine.filter(item => item.pinned), steady = newest(mine.filter(item => !item.pinned && item.kind !== 'event')).slice(0, 15);
  const events = newest(mine.filter(item => !item.pinned && item.kind === 'event'));
  const tail = recentText.slice(-600), hit = (item: MemoryItem) => { for (let i = 0; i + 2 <= item.text.length; i++) if (tail.includes(item.text.slice(i, i + 2))) return true; return false; };
  const ranked = events.length > 3 ? await rankByMeaning(recentText, events.slice(3).map(item => item.id)) : null;
  if (ranked) {
    const close = events.slice(3).filter(item => (ranked.get(item.id) ?? 0) > .3).sort((a, b) => (ranked.get(b.id) ?? 0) - (ranked.get(a.id) ?? 0)).slice(0, 6);
    return [...pinned, ...steady, ...events.slice(0, 3), ...close];
  }
  const recent = events.slice(0, 6), matched = events.slice(6).filter(hit).slice(0, 4);
  return [...pinned, ...steady, ...recent, ...matched];
}
const groupName = (key: string) => String(find(key)?.name || '群聊');
const nameOfKey = (key: string) => { const item = find(key); return item ? memberName(item) : ''; };

/** 主动提起旧事（私聊，开着「他会主动提起旧事」才有）：一天最多一次，每次回话两成机会；
    挑三天前、两周内没提过的发生过或约定，设了向量模型就挑跟这次聊天最接近的，没有就随便挑一条（约定优先）。回传那条，没挑到回传 null。 */
async function pickOld(chatKey: string, recentText: string) {
  const { items, recallOld, nudged } = readMemories(), now = Date.now(), DAY = 86400000;
  if (!recallOld || now - (nudged[chatKey] || 0) < DAY || Math.random() >= .2) return null;
  const pool = items.filter(item => item.chat === chatKey && item.kind !== 'you' && now - item.at > 3 * DAY && now - (item.mentioned || 0) > 14 * DAY);
  if (!pool.length) return null;
  const ranked = await rankByMeaning(recentText, pool.map(item => item.id));
  const close = ranked ? pool.filter(item => (ranked.get(item.id) ?? 0) > .25).sort((a, b) => (ranked.get(b.id) ?? 0) - (ranked.get(a.id) ?? 0))[0] : null;
  const promises = pool.filter(item => item.kind === 'promise'), pick = close || (promises.length ? promises : pool)[Math.floor(Math.random() * (promises.length || pool.length))];
  if (!pick) return null;
  updateMemories({ nudged: { ...readMemories().nudged, [chatKey]: now }, items: readMemories().items.map(item => item.id === pick.id ? { ...item, mentioned: now } : item) });
  return pick;
}
/** 接在系统提示词后面：他记得的事，加上他可以悄悄记下新的事的说明。 */
export async function memoryPrompt(chatKey: string, recentText: string) {
  const chat = find(chatKey), group = isGroup(chat), you = userName();
  const lines = (await recall(chatKey, recentText)).map(item => {
    const where = item.chat !== chatKey ? (find(item.chat)?.group ? `（在「${groupName(item.chat)}」里）` : `（${nameOfKey(item.chat)}私下记得）`) : '';
    const who = group && item.chat === chatKey && item.who?.length ? `（${item.who.map(nameOfKey).filter(Boolean).join('、')}记得）` : '';
    return `- [${KIND_NAME[item.kind]}] ${item.text}${where}${who}（${day(item.at)}）`;
  });
  let text = lines.join('\n');
  if (text.length > 2000) text = text.slice(0, 2000).replace(/\n[^\n]*$/, '');
  const remember = group
    ? `聊天里出现以后还用得上的事（${you}的喜好、习惯、近况，发生的事，说好的约定），成员可以悄悄记下：在 JSON 最外层加 "remember":[{"kind":"you 或 event 或 promise","text":"一句话，二十字上下","who":"记得的成员名字，大家都记得就写大家"}]。不用每次都记，记过的不要重复，也不要在聊天里提到你在记。`
    : `聊天里出现以后还用得上的事（${you}的喜好、习惯、近况，你们之间发生的事，说好的约定），你可以悄悄记下：在 JSON 最外层加 "remember":[{"kind":"you 或 event 或 promise","text":"一句话，用你的口吻，二十字上下"}]。不用每次都记，记过的不要重复，也不要在聊天里提到你在记。`;
  const old = group ? null : await pickOld(chatKey, recentText);
  const nudge = old ? `这次如果接得上，可以自然地主动提起一件以前的事（像真人突然想起来那样，例如「对了，你上次说的…」；接不上就别硬提）：「${old.text}」（${day(old.at)}）` : '';
  return [text ? `${group ? '群里大家记得的事' : '你记得的事'}（长期记忆，自然地带进聊天，不要一条条念出来，也不要说「我记得你说过」这种话太多次）：\n${text}` : '', nudge, remember].filter(Boolean).join('\n');
}

/** 他回话里悄悄记下的（"remember":[…]）。 */
export function memoryAction(chatKey: string, raw: string) {
  const at = raw.indexOf('"remember"');
  if (at < 0) return;
  const start = raw.indexOf('[', at);
  let depth = 0, end = -1;
  for (let i = start; i >= 0 && i < raw.length; i++) { if (raw[i] === '[') depth++; else if (raw[i] === ']' && !--depth) { end = i; break; } }
  if (start < 0 || end < 0) return;
  let list: unknown;
  try { list = JSON.parse(raw.slice(start, end + 1)); } catch { return; }
  const chat = find(chatKey);
  addMemories((Array.isArray(list) ? list : []).slice(0, 4).flatMap(item => {
    const row = item as Record<string, unknown>, text = str(row?.text, 80);
    if (!text) return [];
    const who = isGroup(chat) ? whoOf(chat, row.who) : [];
    return [{ chat: chatKey, kind: isKind(row.kind) ? row.kind : 'event', text, from: 'chat' as const, ...(who.length ? { who } : {}) }];
  }));
}

/** 存着的聊天记录，一行一行（只要你们说的话，旁白提示不算）。 */
function rowsOf(chatKey: string) {
  const template = document.createElement('template');
  try { template.innerHTML = readChatRecords().histories[chatKey] || ''; } catch { /* 记录还没读好就当没有 */ }
  return Array.from(template.content.querySelectorAll<HTMLElement>('.chat-message-row')).filter(row => row.dataset.messageId && !(row.dataset.rejected === 'true' && row.classList.contains('is-user')));
}
/** 还没整理过的：auto 只算已经挤出上下文的部分，手动整理连最近的也算。 */
function pending(chatKey: string, all: boolean) {
  const rows = rowsOf(chatKey), done = readMemories().swept[chatKey], from = done ? rows.findIndex(row => row.dataset.messageId === done) + 1 : 0;
  const keep = all ? 0 : Math.max(1, Number(loadChatPreferences(chatKey).contextMessages) || 30);
  return rows.slice(from, Math.max(from, rows.length - keep));
}
function api() {
  const service = (window as Window & { smallphoneApi?: ApiService }).smallphoneApi, config = service?.getConfig?.();
  if (!service?.requestChat || !config?.baseUrl || !config?.apiKey) throw new Error('先在设置里接好 API');
  return service;
}
const busy = new Set<string>();
/** 整理：把还没整理过的聊天（一次最多八十条）交给总结模型，整理成几条记忆；整理到哪一条记下来，下次接着整理。回传新记下几条。 */
export async function sweepChat(chatKey: string, all = false) {
  if (busy.has(chatKey)) throw new Error('正在整理了');
  const rows = pending(chatKey, all).slice(-80);
  if (!rows.length) return 0;
  busy.add(chatKey);
  try {
    const chat = find(chatKey), group = isGroup(chat), you = userName();
    const say = (row: HTMLElement) => {
      const content = String(row.dataset.chatAiContent || row.querySelector('.chat-bubble')?.textContent || '').trim().slice(0, 160);
      const speaker = row.classList.contains('is-user') ? you : group ? nameOfKey(row.dataset.speaker || '') || '成员' : String(chat?.name || '他');
      return `${speaker}：${content}`;
    };
    const known = readMemories().items.filter(item => item.chat === chatKey).slice(-40).map(item => `- ${item.text}`).join('\n');
    const head = group
      ? [`这是群聊「${chat?.name || '群聊'}」的聊天记录，成员有：${groupMembers(chat!, characters()).map(memberName).join('、')}，还有${you}。`]
      : [...personaOf(chatKey).lines, `下面是你跟${you}的聊天记录。`];
    const service = api();
    const data = await service.requestChat([{ role: 'user', content: [...head,
      rows.map(say).join('\n'),
      known ? `已经记下的（不要重复）：\n${known}` : '',
      group
        ? `把以后还用得上的事整理成记忆：${you}的喜好、习惯、近况（you），群里发生的事（event），说好的约定（promise）。每条一句话，二十字上下；who 写记得这件事的成员名字，大家都知道就写大家。闲聊、没有后续意义的就不要记，零到八条。`
        : `用你的口吻（第一人称，提到${you}就照你平常心里怎么称呼），把以后还用得上的事整理成记忆：${you}的喜好、习惯、近况（you），你们之间发生的事（event），说好的约定（promise）。每条一句话，二十字上下。闲聊、没有后续意义的就不要记，零到八条。`,
      `只输出一个 JSON：{"memories":[{"kind":"you 或 event 或 promise","text":"…"${group ? ',"who":"…"' : ''}}]}`,
    ].filter(Boolean).join('\n\n') }], { feature: 'summary', temperature: .5 });
    const raw = extractChatAiReply(data), start = raw.indexOf('{'), end = raw.lastIndexOf('}');
    if (start < 0 || end <= start) throw new Error('整理的回复格式不对，再试一次');
    let parsed: Record<string, unknown>;
    try { parsed = JSON.parse(raw.slice(start, end + 1)); } catch { throw new Error('整理的回复格式不对，再试一次'); }
    const fresh = addMemories((Array.isArray(parsed.memories) ? parsed.memories : []).slice(0, 8).flatMap(item => {
      const row = item as Record<string, unknown>, text = str(row?.text, 80);
      if (!text) return [];
      const who = group ? whoOf(chat!, row.who) : [];
      return [{ chat: chatKey, kind: isKind(row.kind) ? row.kind : 'event', text, from: 'sweep' as const, ...(who.length ? { who } : {}) }];
    }));
    updateMemories({ swept: { ...readMemories().swept, [chatKey]: rows[rows.length - 1].dataset.messageId! } });
    return fresh.length;
  } finally { busy.delete(chatKey); }
}
/** 他回完话以后：自动整理开着，挤出上下文的还没整理的攒到二十条，就在背后整理。 */
let merging = false;
/** 合并重复的记忆：先补算向量，挑出意思很像的两条（新的跟旧的），交给总结模型判断是不是同一件事；是的话合成一条（留旧的那条，字换成合并后的说法，时间换成新的，钉住的照留），不是就都留着。比过的打勾，之后不再比。 */
export async function mergeDuplicates() {
  if (merging || !vectorModel()) return 0;
  merging = true;
  try {
    await fillVectors();
    const { pairs, considered } = similarPairs();
    let merged = 0;
    for (let start = 0; start < pairs.length; start += 10) {
      const batch = pairs.slice(start, start + 10), byId = new Map(readMemories().items.map(item => [item.id, item]));
      const groups = batch.map(pair => [byId.get(pair.old), byId.get(pair.fresh)] as const).filter((pair): pair is readonly [MemoryItem, MemoryItem] => !!pair[0] && !!pair[1]);
      if (!groups.length) continue;
      const data = await api().requestChat([{ role: 'user', content: [
        '下面每组是同一个聊天里记下的两条记忆。判断每组是不是在说同一件事（意思一样，或一条已经包含另一条）。',
        '是的话写一句合并后的（保留比较新、比较完整的说法，口吻跟原本一样，二十字上下）；意思相反、或是不同的事，就不是。',
        groups.map(([old, fresh], index) => `${index + 1}. 旧：${old.text}\n   新：${fresh.text}`).join('\n'),
        '只输出一个 JSON，照组的顺序：{"groups":[{"same":true,"text":"合并后的一句"},{"same":false}]}',
      ].join('\n\n') }], { feature: 'summary', temperature: .2 });
      const raw = extractChatAiReply(data), from = raw.indexOf('{'), to = raw.lastIndexOf('}');
      let answers: { same?: unknown; text?: unknown }[] = [];
      try { answers = JSON.parse(raw.slice(from, to + 1)).groups || []; } catch { continue; }
      const drop = new Set<string>(), patch = new Map<string, Partial<MemoryItem>>();
      groups.forEach(([old, fresh], index) => {
        const answer = answers[index], text = str(answer?.text, 80);
        if (answer?.same !== true || !text) return;
        drop.add(fresh.id);
        patch.set(old.id, { text, at: Math.max(old.at, fresh.at), ...(old.pinned || fresh.pinned ? { pinned: true } : {}), checked: true });
      });
      if (!drop.size) continue;
      merged += drop.size;
      updateMemories({ items: readMemories().items.filter(item => !drop.has(item.id)).map(item => patch.has(item.id) ? { ...item, ...patch.get(item.id) } : item) });
    }
    const done = new Set(considered);
    if (done.size) updateMemories({ items: readMemories().items.map(item => done.has(item.id) ? { ...item, checked: true } : item) });
    return merged;
  } catch { return 0; }
  finally { merging = false; }
}
export function memoryAfterReply(chatKey: string) {
  void mergeDuplicates();
  if (!readMemories().auto || busy.has(chatKey) || pending(chatKey, false).length < 20) return;
  void sweepChat(chatKey).catch(() => { /* 下次回话再试 */ });
}
