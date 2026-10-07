import type { ForwardSourceItem, StoredForwardRecord } from '../types/chatForwardRecords';
export const FORWARD_RECORDS_KEY = 'smallphone_chat_forward_records_v1';
export type ForwardRecordsStorage = Record<string, unknown>;
export function loadForwardRecords(): ForwardRecordsStorage {
  try {
    const saved: unknown = JSON.parse(localStorage.getItem(FORWARD_RECORDS_KEY) || '{}');
    return saved && typeof saved === 'object' ? saved as ForwardRecordsStorage : {};
  } catch { return {}; }
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
export function appendForwardRecord(saved: ForwardRecordsStorage, record: StoredForwardRecord): ForwardRecordsStorage {
  // 旧数组存储仍保持数组：非数字记录 id 不会写进 JSON，但本次会话内仍能读取。
  const next = Array.isArray(saved) ? Object.assign(saved.slice(), saved) : { ...saved };
  Object.assign(next, { [record.id]: record });
  return next as ForwardRecordsStorage;
}
export function saveForwardRecords(saved: ForwardRecordsStorage): void {
  try { localStorage.setItem(FORWARD_RECORDS_KEY, JSON.stringify(saved)); }
  catch { /* 保存失败仍保留本次会话内记录，原版不弹提示。 */ }
}
