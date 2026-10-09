import type { MemoFolder, MemoKind, MemoNote } from '../types/memos';

export const MEMO_STORAGE_KEY = 'smallphone_memos_v1';
type MemoStorage = Pick<Storage, 'getItem' | 'setItem'>;

export function memoId(): string {
  return globalThis.crypto?.randomUUID?.() ?? `memo-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

export function newMemo(kind: MemoKind, now = Date.now()): MemoNote {
  return {
    id: memoId(), title: '', body: '', kind, paper: 'lined',
    items: kind === 'checklist' ? [{ id: memoId(), text: '', done: false }] : [],
    pinned: false, createdAt: now, updatedAt: now, deletedAt: null,
  };
}

/** 拒绝损坏的存档，避免下次自动保存覆盖原始内容。 */
export function readMemos(storage: MemoStorage = localStorage): MemoNote[] {
  const raw = storage.getItem(MEMO_STORAGE_KEY);
  if (raw === null) return [];
  const value: unknown = JSON.parse(raw);
  if (!value || typeof value !== 'object' || !('version' in value) || value.version !== 1 ||
      !('notes' in value) || !Array.isArray(value.notes)) throw new Error('Invalid memo archive');
  const ids = new Set<string>();
  return value.notes.map((note: unknown) => {
    if (!note || typeof note !== 'object') throw new Error('Invalid memo');
    const n = note as Record<string, unknown>;
    if (typeof n.id !== 'string' || !n.id || ids.has(n.id) || typeof n.title !== 'string' ||
        typeof n.body !== 'string' || !['text', 'checklist'].includes(String(n.kind)) ||
        !['plain', 'lined'].includes(String(n.paper)) || typeof n.pinned !== 'boolean' ||
        typeof n.createdAt !== 'number' || !Number.isFinite(n.createdAt) ||
        typeof n.updatedAt !== 'number' || !Number.isFinite(n.updatedAt) ||
        !(n.deletedAt === null || (typeof n.deletedAt === 'number' && Number.isFinite(n.deletedAt))) ||
        !Array.isArray(n.items)) throw new Error('Invalid memo fields');
    const itemIds = new Set<string>();
    for (const item of n.items) {
      if (!item || typeof item !== 'object' || typeof item.id !== 'string' || !item.id ||
          itemIds.has(item.id) || typeof item.text !== 'string' || typeof item.done !== 'boolean')
        throw new Error('Invalid checklist');
      itemIds.add(item.id);
    }
    ids.add(n.id);
    return n as unknown as MemoNote;
  });
}

/** 单键写入；保存失败时不更改浏览器中上一份有效存档。 */
export function writeMemos(notes: MemoNote[], storage: MemoStorage = localStorage): void {
  storage.setItem(MEMO_STORAGE_KEY, JSON.stringify({ version: 1, notes }));
}

export function memoTitle(note: MemoNote): string {
  return note.title.trim() || '未命名备忘录';
}

export function memoSummary(note: MemoNote): string {
  if (note.kind === 'checklist') {
    const filled = note.items.filter(item => item.text.trim());
    const completed = filled.filter(item => item.done).length;
    const first = filled[0]?.text.trim();
    return `${completed}/${filled.length} 项完成${first ? ` · ${first}` : ''}`;
  }
  return note.body.trim().replace(/\s+/g, ' ') || '还没有写下内容';
}

export function selectMemos(notes: MemoNote[], folder: MemoFolder, search: string): MemoNote[] {
  const query = search.trim().toLocaleLowerCase();
  return notes.filter(note => {
    if (folder === 'trash' ? note.deletedAt === null : note.deletedAt !== null) return false;
    if (folder === 'pinned' && !note.pinned) return false;
    return !query || [note.title, note.body, ...note.items.map(item => item.text)]
      .some(text => text.toLocaleLowerCase().includes(query));
  }).sort((a, b) => folder === 'trash'
    ? (b.deletedAt ?? 0) - (a.deletedAt ?? 0)
    : Number(b.pinned) - Number(a.pinned) || b.updatedAt - a.updatedAt);
}
