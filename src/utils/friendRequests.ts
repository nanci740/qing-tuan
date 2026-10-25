import type { ApiService } from '../types/api';
import type { CharacterDossier } from '../types/characterDossier';
import { extractChatAiReply } from './chatReplyParser';
import { readChatCharacters } from './chatCharacterStorage';
import { activePersonaPrompt, readMe } from './meStorage';
import { addFriendRequest, patchFriendRequest, readContacts, updateContacts } from './contactsStorage';
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
async function ask(prompt: string) {
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
