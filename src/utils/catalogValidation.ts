import type { WorldBook } from '../types/world';
import type { ChatCharacter } from '../types/chatCharacters';
import type { CharacterDossier } from '../types/characterDossier';

export interface CatalogData { worldBooks: WorldBook[]; chatCharacters: ChatCharacter[]; characterRecords: CharacterDossier[] }
export type CatalogKind = keyof CatalogData;
export type CatalogRow = Record<string, unknown> & { id: string; cover?: string; photoUrl?: string };
const object = (v: unknown): v is Record<string, unknown> => !!v && typeof v === 'object' && !Array.isArray(v);
function fields(row: Record<string, unknown>, names: string[], type: 'string' | 'boolean' | 'number') {
  for (const name of names) if (row[name] !== undefined && (typeof row[name] !== type ||
      (type === 'number' && !Number.isFinite(row[name] as number)))) throw Error('资料字段格式异常');
}
function ids(rows: unknown): CatalogRow[] {
  if (!Array.isArray(rows)) throw Error('资料不是清单');
  const seen = new Set<string>();
  for (const row of rows) {
    if (!object(row) || typeof row.id !== 'string' || !row.id || seen.has(row.id)) throw Error('资料编号格式异常或重复');
    seen.add(row.id);
  }
  return structuredClone(rows) as CatalogRow[];
}
/** 校验整份资料，保留可选字段和旧档案的扩展字段；不筛掉坏记录，不重建编号。 */
export function validateCatalogRows(kind: CatalogKind, value: unknown): CatalogRow[] {
  const rows = ids(value), archiveIds = new Set<string>();
  for (const row of rows) {
    if (kind === 'worldBooks') {
      fields(row, ['name', 'description', 'bindId', 'cover'], 'string');
      fields(row, ['enabled'], 'boolean');
      for (const entry of ids(row.entries)) {
        fields(entry, ['title', 'keys', 'secondaryKeys', 'content', 'trigger', 'match', 'position', 'role'], 'string');
        fields(entry, ['enabled', 'caseSensitive', 'recursive'], 'boolean');
        fields(entry, ['probability', 'depth', 'sticky', 'priority'], 'number');
      }
    } else {
      fields(row, ['fileNo', 'tabLabel', 'sealNo', 'quote', 'photoUrl', 'photoCaption', 'name', 'nickname',
        'birthday', 'constellation', 'relationship', 'mbti', 'favoriteThings', 'tokenItem', 'dislikes',
        'onlineStyle', 'offlineStyle', 'relationshipNetworkText', 'activeNavTab', 'appearanceText',
        'speechHabitsText', 'memoriesText', 'otherSettingsText', 'secretMemo', 'stampDate', 'stampStyle'], 'string');
      fields(row, ['isStamped', 'pinned', 'favorite'], 'boolean');
      for (const name of ['customTags', 'selectedTags']) if (row[name] !== undefined &&
          (!Array.isArray(row[name]) || row[name].some(v => typeof v !== 'string'))) throw Error('档案标签格式异常');
      if (row.relationships !== undefined) {
        for (const relation of ids(row.relationships)) fields(relation, ['targetDossierId', 'targetName', 'relationType', 'note'], 'string');
      }
      for (const name of ['photoPositionX', 'photoPositionY']) if (row[name] !== undefined &&
          typeof row[name] !== 'string' && !(typeof row[name] === 'number' && Number.isFinite(row[name]))) throw Error('图片位置格式异常');
      if (kind === 'chatCharacters') {
        if (typeof row.archiveId !== 'string' || !row.archiveId || archiveIds.has(row.archiveId) ||
            typeof row.dossierId !== 'string' || !row.dossierId) throw Error('聊天角色编号格式异常');
        archiveIds.add(row.archiveId);
      }
    }
  }
  return rows;
}
