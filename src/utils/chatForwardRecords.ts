import type { ForwardSourceItem, StoredForwardRecord } from '../types/chatForwardRecords';
export const FORWARD_RECORDS_KEY = 'smallphone_chat_forward_records_v1';
export type ForwardRecordsStorage = Record<string, StoredForwardRecord>;
export const FORWARD_SAVE_ERROR = '转发记录没有存进去，请再转发一次';
const object = (value: unknown): value is Record<string, unknown> => !!value && typeof value === 'object' && !Array.isArray(value);
function optionalText(value: unknown): string {
  if (value === undefined) return '';
  if (typeof value !== 'string') throw new Error('转发记录文字格式异常');
  return value;
}
/** 完整校验后才用于迁移或写入；兼容旧记录没有 sentAt/spoken 等字段的情况。 */
export function validateForwardRecord(value: unknown, expectedId?: string): StoredForwardRecord {
  if (!object(value)) throw new Error('转发记录格式异常');
  const id = value.id === undefined ? expectedId : value.id;
  if (typeof id !== 'string' || !id || (expectedId !== undefined && id !== expectedId) ||
      typeof value.title !== 'string' || !Array.isArray(value.items))
    throw new Error('转发记录编号或消息格式异常');
  return {
    id, title: optionalText(value.title), subtitle: optionalText(value.subtitle), sourceName: optionalText(value.sourceName),
    items: value.items.map(item => {
      if (!object(item) || typeof item.text !== 'string' ||
          (item.sentAt !== undefined && (typeof item.sentAt !== 'number' || !Number.isFinite(item.sentAt))))
        throw new Error('转发消息格式异常');
      return { speaker: optionalText(item.speaker), side: optionalText(item.side), text: optionalText(item.text),
        time: optionalText(item.time), spoken: optionalText(item.spoken), sentAt: item.sentAt === undefined ? 0 : item.sentAt as number };
    }),
  };
}
export function validateForwardRecords(value: unknown): ForwardRecordsStorage {
  if (!object(value) && !Array.isArray(value)) throw new Error('转发记录存档格式异常');
  const saved = Object.create(null) as ForwardRecordsStorage;
  for (const [key, item] of Object.entries(value)) {
    const record = validateForwardRecord(item, Array.isArray(value) ? undefined : key);
    if (Object.hasOwn(saved, record.id)) throw new Error('转发记录编号重复');
    saved[record.id] = record;
  }
  return saved;
}
/** 只在资料库确认没有转发记录、且未标记迁移时读取旧键；失败不能返回默认空存档。 */
export function loadLegacyForwardRecords(storage: Pick<Storage, 'getItem'> = localStorage): ForwardRecordsStorage {
  const raw = storage.getItem(FORWARD_RECORDS_KEY);
  return validateForwardRecords(raw === null ? {} : JSON.parse(raw));
}
export function createForwardRecord(items: ForwardSourceItem[], sourceChatName: unknown): StoredForwardRecord {
  const recordId = 'forward_record_' + Date.now() + '_' + Math.random().toString(36).slice(2, 8);
  const startLabel = items[0]?.time || '';
  const endLabel = items[items.length - 1]?.time || '';
  const subtitle = startLabel && endLabel ? `${startLabel}${startLabel !== endLabel ? ' 至 ' + endLabel : ''}` : '';
  return {
    id: recordId,
    title: `你与${sourceChatName || '当前聊天'}的聊天记录`,
    subtitle,
    sourceName: sourceChatName || '',
    items: items.map(item => ({
      speaker: item?.speaker || '消息',
      side: item?.side || '',
      sentAt: Number(item?.sentAt) || 0,
      text: item?.text || '[消息]',
      spoken: item?.spoken || '',
      time: item?.time || ''
    }))
  };
}
