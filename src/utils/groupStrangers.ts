import type { ChatCharacter, GroupStranger } from '../types/chatCharacters';
import { ask } from './friendRequests';
import { readChatCharacters } from './chatCharacterStorage';
import { groupMembers, groupStrangers, isGroup, memberName } from './chatGroups';
import { activePersonaPrompt } from './meStorage';

const HOUR = 3600000, MAX = 5;
const str = (value: unknown, max: number) => String(value ?? '').trim().slice(0, max);
type Bridge = Window & {
  smallphoneSaveGroup?: (group: ChatCharacter) => Promise<boolean>;
  smallphoneChatNotice?: (key: string, text: string) => void;
  smallphoneChatProactive?: (key: string, prompt: string) => void;
};

/** 照群名、群公告、群里的人，想一个会出现在这个群的陌生人：名字不跟群里的人重复，人设一两句。 */
export async function makeStranger(group: { name: string; notice: string; members: string[]; strangers: GroupStranger[] }): Promise<GroupStranger> {
  const characters = readChatCharacters(), people = group.members.map(key => characters.find(item => item.archiveId === key)).filter((item): item is ChatCharacter => !!item);
  const taken = [...people.map(memberName), ...group.strangers.map(item => item.name)];
  const me = activePersonaPrompt();
  const data = await ask([
    `有一个叫「${group.name || '群聊'}」的群聊${group.notice ? `，群公告：${group.notice}` : ''}。`,
    people.length ? `群里的人：${people.map(memberName).join('、')}。` : '',
    me ? `群主（用户）的设定：\n${me}` : '',
    `请想一个会出现在这个群里的陌生人：照群名和群里的人想一个合理的身份（现代、写实，职业、年龄、性格随机，不要总是同一种类型）。名字不要跟这些重复：${taken.join('、') || '（无）'}。`,
    '人设写一两句：身份、性格、说话习惯。',
    '只输出一个 JSON：{"name":"名字或网名（两到六个字）","persona":"人设"}',
  ].filter(Boolean).join('\n'));
  const name = str(data.name, 12);
  if (!name || taken.includes(name)) throw new Error('没想出名字，再试一次');
  return { key: 'stranger-' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6), name, persona: str(data.persona, 200) };
}

/** 有人进群：聊天里一行灰字，再请群里接着聊（新来的会先打招呼）。 */
export function announceJoin(groupKey: string, stranger: GroupStranger) {
  const bridge = window as Bridge;
  bridge.smallphoneChatNotice?.(groupKey, `${stranger.name}加入了群聊`);
  bridge.smallphoneChatProactive?.(groupKey, `[系统提示：这条不是用户说的话，不要回应这条本身] 「${stranger.name}」刚加入群聊。让${stranger.name}照自己的人设打个招呼，或接着大家的话题说一两句；其他成员可以自然地欢迎或不理。`);
}
/** 下一个陌生人什么时候来：两到三天后。 */
export const nextJoin = (now = Date.now()) => now + (48 + Math.random() * 24) * HOUR;

let busy = false;
/** 每分钟看一次：开着「陌生人会自己加入」、还不到五个、时间到了的群，来一个陌生人（一次一个群）；出错就一小时后再试。 */
export async function strangerTick(now = Date.now()) {
  if (busy) return;
  const group = readChatCharacters().find(item => isGroup(item) && item.group.strangerJoin && groupStrangers(item).length < MAX && (item.group.strangerNext || 0) <= now);
  if (!isGroup(group)) return;
  busy = true;
  const save = (patch: Partial<ChatCharacter['group'] & object>) => (window as Bridge).smallphoneSaveGroup?.({ ...group, group: { ...group.group, ...patch } });
  try {
    const stranger = await makeStranger({ name: group.name, notice: group.group.notice, members: groupMembers(group, readChatCharacters()).map(item => item.archiveId), strangers: groupStrangers(group) });
    if (await save({ strangers: [...groupStrangers(group), stranger], strangerNext: nextJoin(now) })) announceJoin(group.archiveId, stranger);
  } catch { await save({ strangerNext: now + HOUR }); }
  finally { busy = false; }
}
export const STRANGER_MAX = MAX;
