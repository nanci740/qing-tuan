import type { ForwardRecord, ForwardRecordItem } from './chatRecordDetail';
export interface ForwardSourceItem extends ForwardRecordItem { spoken?: unknown; }
export interface StoredForwardRecord extends ForwardRecord {
  id: string;
  title: string;
  subtitle: string;
  sourceName: unknown;
  items: (ForwardSourceItem & { sentAt: number })[];
}
export interface ForwardRecordsApi {
  read(id: string): ForwardRecord | undefined;
  create(items: ForwardSourceItem[], sourceChatName: unknown): StoredForwardRecord;
}
