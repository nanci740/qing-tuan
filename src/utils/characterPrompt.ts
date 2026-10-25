import type { CharacterDossier } from '../types/characterDossier';

const text = (value: unknown, fallback: unknown = '') => String(value ?? '').trim() || String(fallback ?? '').trim();
/** 角色档案整理成给模型看的人设；没填的栏位不写。 */
export function buildCharacterPrompt(character: CharacterDossier | null) {
  if (!character) return '';
  const lines = [
    '角色姓名：' + text(character.name, character.nickname),
    '昵称：' + text(character.nickname),
    '与你的关系：' + text(character.relationship),
    '生日与星座：' + [text(character.birthday), text(character.constellation)].filter(Boolean).join(' '),
    'MBTI：' + text(character.mbti),
    '外貌与气质：' + text(character.appearanceText),
    '性格标签：' + (character.selectedTags || []).join('、'),
    '说话习惯：' + text(character.speechHabitsText),
    '线上相处：' + text(character.onlineStyle),
    '线下相处：' + text(character.offlineStyle),
    '喜欢：' + text(character.favoriteThings),
    '不喜欢：' + text(character.dislikes),
    '随身信物：' + text(character.tokenItem),
    '共同回忆：' + text(character.memoriesText),
    '其他设定：' + text(character.otherSettingsText),
    '私密备忘：' + text(character.secretMemo),
  ];
  return lines.filter(line => !line.endsWith('：')).join('\n');
}
