import type { ApiService } from '../types/api';
import type { CharacterDossier } from '../types/characterDossier';
import { extractChatAiReply } from './chatReplyParser';
import { readChatCharacters } from './chatCharacterStorage';
import { activePersonaPrompt, readMe } from './meStorage';
import { addFriendRequest, dueOutRequests, dueReadds, patchCut, patchFriendRequest, readContacts, setBlockedBy, setDeleted, updateContacts } from './contactsStorage';
import type { Cut } from './contactsStorage';
import { buildCharacterPrompt } from './characterPrompt';
import { readChatRecords } from './chatRecords';
import type { FriendRequest } from './contactsStorage';

type Bridge = Window & { smallphoneApi?: ApiService; smallphoneAppendBackgroundReply?: (detail: { chatKey: string; reply: string; sentAt: number }) => unknown };
const HOUR = 3600000;
/** 陌生人多久来一个：偶尔一两天一个，常常半天上下一个。 */
const GAP: Record<'some' | 'often', [number, number]> = { some: [24 * HOUR, 48 * HOUR], often: [8 * HOUR, 16 * HOUR] };

function api() {
  const service = (window as Bridge).smallphoneApi, config = service?.getConfig?.();
  if (!service?.requestChat || !config?.baseUrl || !config?.apiKey) throw new Error('先在设置里接好 API');
  return service;
}
/** 回复里的第一个 {…}：模型偶尔会包 ``` 或多说几句。 */
function readJson(raw: string): Record<string, unknown> {
  const start = raw.indexOf('{'), end = raw.lastIndexOf('}');
  if (start < 0 || end <= start) throw new Error('回复格式不对，再试一次');
  try { return JSON.parse(raw.slice(start, end + 1)); } catch { throw new Error('回复格式不对，再试一次'); }
}
export async function ask(prompt: string) {
  const data = await api().requestChat([{ role: 'user', content: prompt }], { temperature: 1 });
  return readJson(extractChatAiReply(data));
}
const str = (value: unknown, max: number) => String(value ?? '').trim().slice(0, max);

/** 生一个来加你的陌生人：照你的人设想一个你可能会遇到的普通人，名字不跟现有角色重复。 */
export async function generateStranger() {
  const taken = [...readChatCharacters().map(item => item.name), ...readContacts().requests.map(item => item.name)].filter(Boolean);
  const me = activePersonaPrompt(), name = readMe().name;
  const data = await ask([
    '请随机想一个会在聊天软件上来加对方好友的陌生人，是对方生活里可能真的会遇到的普通人（现代、写实），职业、年龄、性格、相遇的场合都随机，不要总是同一种类型。',
    me ? `对方的人设：\n${me}` : name ? `对方的名字：${name}` : '',
    taken.length ? `名字不要跟这些重复：${taken.join('、')}` : '',
    '只输出一个 JSON，不要别的字：{"name":"名字","gender":"男或女","age":27,"job":"职业","meet":"在哪里遇到或怎么拿到对方联系方式（10 字以内）","greeting":"加好友时打的招呼，一两句，像真人","intro":"给对方看的一句话简介","appearance":"外貌与气质","personality":"性格","speech":"说话习惯","likes":"喜欢的东西","quote":"个性签名"}',
  ].filter(Boolean).join('\n'));
  const strangerName = str(data.name, 20);
  if (!strangerName) throw new Error('没想出名字，再试一次');
  const age = Number(data.age) || 0, job = str(data.job, 20), meet = str(data.meet, 20), intro = str(data.intro, 120);
  const profile: Partial<CharacterDossier> = {
    name: strangerName, quote: str(data.quote, 40), appearanceText: str(data.appearance, 300), speechHabitsText: str(data.speech, 300),
    favoriteThings: str(data.likes, 200), relationship: '刚加好友的陌生人',
    otherSettingsText: [str(data.gender, 4) && '性别：' + str(data.gender, 4), age && `年龄：${age} 岁`, job && '职业：' + job, str(data.personality, 300) && '性格：' + str(data.personality, 300)].filter(Boolean).join('\n'),
    memoriesText: meet ? `${meet}。之后加了对方好友。` : '主动加了对方好友。',
  };
  return addFriendRequest({ kind: 'in', name: strangerName, greeting: str(data.greeting, 120), intro, meta: [age && `${age} 岁`, job].filter(Boolean).join(' · '), meet, profile });
}

function addToChat(detail: { fields?: Partial<CharacterDossier> }) {
  return new Promise<string>(resolve => window.dispatchEvent(new CustomEvent('qingtuan:character-add-to-chat', { detail: { ...detail, done: resolve } })));
}
/** 收下陌生人：照申请里的资料建档案、放进聊天，他的招呼就是第一句话。回传聊天的 archiveId。 */
export async function acceptFriend(request: FriendRequest) {
  const dossierId = await addToChat({ fields: request.profile });
  if (!dossierId) throw new Error('加不进聊天，检查一下储存空间');
  const chatKey = readChatCharacters().find(item => String(item.dossierId) === dossierId)?.archiveId || '';
  patchFriendRequest(request.id, { state: 'accepted', dossierId });
  if (chatKey && request.greeting) (window as Bridge).smallphoneAppendBackgroundReply?.({ chatKey, reply: request.greeting, sentAt: Date.now() });
  return chatKey;
}

/** 陌生人：到时间了（设定不是关、手边没有三个以上还没处理的）就生一个，弹横幅；下一个照设定的间隔随机排。 */
export async function strangerTick(now = Date.now()) {
  const { stranger, nextStrangerAt, requests } = readContacts();
  if (stranger === 'off') return null;
  const [min, max] = GAP[stranger];
  if (!nextStrangerAt) { updateContacts({ nextStrangerAt: now + min / 2 + Math.random() * (max - min) / 2 }); return null; }
  if (now < nextStrangerAt || requests.filter(item => item.kind === 'in' && item.state === 'pending').length >= 3) return null;
  updateContacts({ nextStrangerAt: now + min + Math.random() * (max - min) });
  const request = await generateStranger();
  window.dispatchEvent(new CustomEvent('qingtuan:system-banner', { detail: { title: '新的朋友', body: `${request.name} 请求添加你为朋友`,
    open: () => window.dispatchEvent(new CustomEvent('qingtuan:open-contacts', { detail: 'new' })) } }));
  return request;
}

type Peer = Window & { smallphoneChatNotice?: (key: string, text: string) => void; smallphonePeerSay?: (key: string, text: string) => void; smallphoneChatProactive?: (key: string, prompt: string) => void; smallphoneBlockContact?: (key: string, on: boolean) => void };
const MINUTE = 60000;
function banner(body: string) {
  window.dispatchEvent(new CustomEvent('qingtuan:system-banner', { detail: { title: '新的朋友', body, open: () => window.dispatchEvent(new CustomEvent('qingtuan:open-contacts', { detail: 'new' })) } }));
}
/** 你们最近的私聊（他没收到的不算），给他想事情用。 */
export function recentChat(chatKey: string) {
  const template = document.createElement('template');
  try { template.innerHTML = readChatRecords().histories[chatKey] || ''; } catch { /* 记录还没读好就当没有 */ }
  return Array.from(template.content.querySelectorAll<HTMLElement>('.chat-message-row, .chat-system-notice')).filter(row => !(row.dataset.rejected === 'true' && row.classList.contains('is-user'))).slice(-14)
    .map(row => row.classList.contains('chat-system-notice') ? `（${row.textContent?.trim()}）` : `${row.classList.contains('is-user') ? '对方' : '你'}：${String(row.dataset.chatAiContent || row.querySelector('.chat-bubble')?.textContent || '').trim().slice(0, 100)}`).join('\n');
}
export function personaOf(chatKey: string) {
  const character = readChatCharacters().find(item => item.archiveId === chatKey);
  if (!character) throw new Error('找不到这个角色');
  const me = activePersonaPrompt(), name = String(character.name || character.nickname || '').trim();
  return { name, lines: [`你是「${name}」，以下是你的人设：\n${buildCharacterPrompt(character)}`, me ? `对方的设定：\n${me}` : ''] };
}

/** 你去加他（他把你拉黑了，或你删了他想加回来）：申请先放进新的朋友，他过两到十分钟才回。 */
export function sendFriendRequest(chatKey: string, greeting: string) {
  const { name } = personaOf(chatKey);
  return addFriendRequest({ kind: 'out', chatKey, name, greeting: greeting.trim().slice(0, 120), intro: '', meta: '', meet: '', due: Date.now() + (2 + Math.random() * 8) * MINUTE });
}
/** 他回你的申请：照他的人设、你们最近的私聊和你写的话决定。通过了就解除拉黑或加回来，他的回话是第一句。 */
async function answerRequest(request: FriendRequest) {
  const chatKey = request.chatKey || '', { name, lines } = personaOf(chatKey), { blockedBy, deleted } = readContacts();
  const why = blockedBy[chatKey] ? '后来你把对方拉黑了' : deleted[chatKey] ? '后来对方把你删了' : '';
  const recent = recentChat(chatKey);
  const data = await ask([...lines,
    recent ? `你们之前的私聊${why ? `（${why}）` : ''}：\n${recent}` : why ? why + '。' : '',
    `现在对方来加你好友，申请里写着：「${request.greeting || '（没写话）'}」。照你的人设、你们之间发生的事和对方的态度，决定要不要通过。`,
    '只输出一个 JSON：{"accept":true,"reply":"通过的话，是你加回来后发的第一句话；不通过就空着"}',
  ].filter(Boolean).join('\n'));
  const accept = data.accept === true || data.accept === 'true', reply = str(data.reply, 200);
  patchFriendRequest(request.id, { state: accept ? 'accepted' : 'rejected' });
  if (accept) {
    if (blockedBy[chatKey]) setBlockedBy(chatKey, false);
    if (deleted[chatKey]) setDeleted(chatKey, false);
    (window as Peer).smallphoneChatNotice?.(chatKey, `${name} 通过了你的好友申请`);
    if (reply) (window as Peer).smallphonePeerSay?.(chatKey, reply);
  }
  banner(accept ? `${name} 通过了你的好友申请` : `${name} 没有通过你的好友申请`);
}
const cutOf = (chatKey: string): Cut | null => readContacts().deleted[chatKey] ? 'deleted' : readContacts().blocked[chatKey] ? 'blocked' : null;
/** 他来加你（你删了他、或你把他拉黑了想让你放他出来）：已经有一笔还没处理的就不再加。回传有没有加。 */
export function peerApply(chatKey: string, message: string) {
  const kind = cutOf(chatKey), name = readChatCharacters().find(item => item.archiveId === chatKey)?.name || '';
  if (!kind || !name || readContacts().requests.some(item => item.kind === 'in' && item.chatKey === chatKey && item.state === 'pending')) return false;
  patchCut(kind, chatKey, { tries: (readContacts()[kind][chatKey]?.tries || 0) + 1 });
  addFriendRequest({ kind: 'in', chatKey, name, greeting: message.trim().slice(0, 120), intro: '', meta: '', meet: '' });
  banner(`${name} 请求添加你为朋友`);
  return true;
}
/** 你删了他、或拉黑了他：他照人设决定要不要来加你、写什么（最多来三次）。 */
async function tryReadd(chatKey: string, kind: Cut) {
  const { lines } = personaOf(chatKey), tries = readContacts()[kind][chatKey]?.tries || 0, recent = recentChat(chatKey);
  const what = kind === 'deleted' ? '把你从好友里删掉了' : '在私聊里把你拉黑了，你发的消息对方都拒收';
  const data = await ask([...lines,
    recent ? `你们之前的私聊：\n${recent}` : '',
    tries ? `对方${what}，你去申请加对方好友 ${tries} 次，都被拒绝了。` : `对方刚刚${what}。`,
    `照你的人设和你们之间发生的事，决定要不要去申请加对方好友${kind === 'blocked' ? '（请对方把你放出来）' : ''}，要加就写一句申请时的留言（像真人，一两句）。不想加、或照人设会放弃，就不加。`,
    '只输出一个 JSON：{"add":true,"message":"留言"} 或 {"add":false}',
  ].filter(Boolean).join('\n'));
  if (data.add === true || data.add === 'true') peerApply(chatKey, str(data.message, 120));
}
/** 他来加你、你通过：删掉的加回来（他先开口），拉黑的放出来（他会知道）。拒绝：还没满三次就过一阵子再想想。 */
export function answerReadd(request: FriendRequest, accept: boolean) {
  const chatKey = request.chatKey || '', kind = cutOf(chatKey);
  patchFriendRequest(request.id, { state: accept ? 'accepted' : 'rejected' });
  if (!kind) return;
  if (accept) {
    (window as Peer).smallphoneChatNotice?.(chatKey, `你通过了${request.name}的好友申请`);
    if (kind === 'blocked') { (window as Peer).smallphoneBlockContact?.(chatKey, false); return; }
    setDeleted(chatKey, false);
    (window as Peer).smallphoneChatProactive?.(chatKey, `[系统提示：这条不是对方说的话，不要回应这条本身] 对方通过了你的好友申请，你们又是好友了。照你的人设说点什么。`);
  } else {
    const tries = readContacts()[kind][chatKey]?.tries || 0;
    patchCut(kind, chatKey, { next: tries < 3 ? Date.now() + (30 + Math.random() * 150) * MINUTE : 0 });
  }
}
/** 每分钟看一次：该回的申请、该想想要不要来加你的人。出错就十分钟后再试。 */
export async function friendTick(now = Date.now()) {
  for (const request of dueOutRequests(now)) {
    try { await answerRequest(request); } catch { patchFriendRequest(request.id, { due: Date.now() + 10 * MINUTE }); }
  }
  for (const { key, kind } of dueReadds(now)) {
    try { await tryReadd(key, kind); } catch { patchCut(kind, key, { next: Date.now() + 10 * MINUTE }); }
  }
}
