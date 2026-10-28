import type { ChatCharacter } from '../types/chatCharacters';
import { buildCharacterPrompt } from './characterPrompt';
import { contactName } from './contactsStorage';

/** 群聊：跟角色放在同一份聊天清单，靠 group 栏位分辨。 */
export const isGroup = (character: ChatCharacter | null | undefined): character is ChatCharacter & { group: NonNullable<ChatCharacter['group']> } => !!character?.group;
export const MENTION_ALL = '所有人';

export function newGroup(name: string, members: string[]): ChatCharacter {
  const id = 'group-' + Date.now() + '-' + Math.random().toString(36).slice(2, 7);
  return { id, archiveId: id, dossierId: id, name: name.trim().slice(0, 20) || '群聊', photoUrl: '', archivedAt: new Date().toISOString(), pinned: false, favorite: false,
    group: { members: [...new Set(members)], notice: '', nick: '', know: true } };
}
/** 群里还在的成员（角色被删掉的就不算）。 */
export function groupMembers(group: ChatCharacter, characters: ChatCharacter[]) {
  return (group.group?.members || []).map(key => characters.find(item => item.archiveId === key && !item.group)).filter((item): item is ChatCharacter => !!item);
}
/** 群里的陌生人（没有就是空的）。 */
export const groupStrangers = (group: ChatCharacter | null | undefined) => group?.group?.strangers || [];
export const isStrangerKey = (key: string) => key.startsWith('stranger-');
/** 成员的本名（给模型看、他们在群里说话用的名字）。 */
export const memberName = (member: ChatCharacter) => String(member.name || member.nickname || '未命名角色').trim();

/** 群聊送给模型的「角色设定」：每个成员的人设，加上成员之间的关系（开着「认识彼此」才送）和群公告。 */
export function groupPersona(group: ChatCharacter, characters: ChatCharacter[]) {
  const members = groupMembers(group, characters), info = group.group!;
  const blocks = members.map(member => `【${memberName(member)}】\n${buildCharacterPrompt(member)}`);
  const relations: string[] = [];
  if (info.know) for (const member of members) for (const link of member.relationships || []) {
    const target = members.find(other => other !== member && (String(other.dossierId) === String(link.targetDossierId) || memberName(other) === String(link.targetName || '').trim()));
    if (target && link.relationType) relations.push(`${memberName(member)} 是 ${memberName(target)} 的${link.relationType}${link.note ? `（${link.note}）` : ''}`);
  }
  const strangers = groupStrangers(group).map(item => `【${item.name}】（群里的陌生人，跟其他人不熟，是在这个群里才认识的）\n${item.persona || '普通人，照名字和群的气氛自然说话。'}`);
  return [[...blocks, ...strangers].join('\n\n'),
    info.know ? (relations.length ? `成员之间的关系：\n${relations.join('\n')}` : '成员之间互相认识，但档案里没写具体关系，照各自的人设自然相处。') : '成员之间原本互不认识，是在这个群里才碰到的。',
    info.notice.trim() ? `群公告：${info.notice.trim()}` : ''].filter(Boolean).join('\n\n');
}
/** 你最后这一轮 @ 了谁（回传成员本名；@所有人 回传全部）。 */
export function mentionedNames(texts: string[], members: ChatCharacter[]) {
  const joined = texts.join('\n'), names = new Set<string>();
  if (joined.includes('@' + MENTION_ALL)) return members.map(memberName);
  for (const member of members) for (const name of new Set([memberName(member), contactName(member.archiveId, memberName(member))])) if (joined.includes('@' + name)) names.add(memberName(member));
  return [...names];
}
