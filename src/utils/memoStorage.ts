import type { MemoFolder, MemoKind, MemoNote } from '../types/memos';
import { MEMO_TABLES, openAppDatabase } from './appDatabase.ts';

export const MEMO_STORAGE_KEY = 'smallphone_memos_v1';
export const MEMO_CONFLICT_MESSAGE = '其他青团机分页改过备忘录，请关掉其他分页，再重新打开备忘录';
export class MemoConflictError extends Error {
  constructor() { super(MEMO_CONFLICT_MESSAGE); this.name = 'MemoConflictError'; }
}
export interface MemoSnapshot { notes: MemoNote[]; revision: number }
interface MemoStorageOptions {
  factory?: IDBFactory;
  /** 只读迁移源；迁移后保留旧副本，不再用它保存。 */
  legacyStorage?: Pick<Storage, 'getItem'>;
}

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
export function validateMemoArchive(value: unknown): MemoNote[] {
  if (!value || typeof value !== 'object' || !('version' in value) || value.version !== 1 ||
      !('notes' in value) || !Array.isArray(value.notes)) throw new Error('Invalid memo archive');
  const ids = new Set<string>();
  return value.notes.map((note: unknown) => {
    if (!note || typeof note !== 'object') throw new Error('Invalid memo');
    const n = note as Record<string, unknown>;
    if (typeof n.id !== 'string' || !n.id || ids.has(n.id) || typeof n.title !== 'string' ||
        typeof n.body !== 'string' || (n.kind !== 'text' && n.kind !== 'checklist') ||
        (n.paper !== 'plain' && n.paper !== 'lined') || typeof n.pinned !== 'boolean' ||
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
    return { id: n.id, title: n.title, body: n.body, kind: n.kind, paper: n.paper, pinned: n.pinned,
      createdAt: n.createdAt, updatedAt: n.updatedAt, deletedAt: n.deletedAt,
      items: n.items.map(item => ({ id: item.id as string, text: item.text as string, done: item.done as boolean })) };
  });
}

/** 检查版本号、各条资料增删改、递增版本号都在同一事务里，完成后才算保存成功。 */
function memoTransaction<T>(db: IDBDatabase, mode: IDBTransactionMode,
  work: (transaction: IDBTransaction, metadata: unknown, notes: unknown[]) => T): Promise<T> {
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([...MEMO_TABLES], mode);
    let metadata: unknown, notes: unknown[] = [], remaining = 2, result: T, finished = false, cause: unknown;
    transaction.oncomplete = () => finished ? resolve(result) : reject(new Error('Memo read did not finish'));
    transaction.onabort = () => reject(cause ?? transaction.error ?? new Error('Memo transaction aborted'));
    const collect = (request: IDBRequest, isMetadata: boolean) => {
      request.onsuccess = () => {
        if (isMetadata) metadata = request.result; else notes = request.result;
        if (--remaining) return;
        try { result = work(transaction, metadata, notes); finished = true; }
        catch (error) { cause = error; try { transaction.abort(); } catch { reject(error); } }
      };
    };
    collect(transaction.objectStore('metadata').get('memos'), true);
    collect(transaction.objectStore('memoNotes').getAll(), false);
  });
}

function snapshotFromRows(metadata: unknown, rows: unknown[]): MemoSnapshot | null {
  if (metadata === undefined) {
    if (rows.length) throw new Error('Memo metadata missing');
    return null;
  }
  if (!metadata || typeof metadata !== 'object') throw new Error('Invalid memo metadata');
  const meta = metadata as Record<string, unknown>;
  if (meta.key !== 'memos' || meta.formatVersion !== 1 || typeof meta.revision !== 'number' ||
      !Number.isSafeInteger(meta.revision) || meta.revision < 1) throw new Error('Invalid memo metadata');
  const positions = new Set<number>();
  for (const row of rows) {
    if (!row || typeof row !== 'object') throw new Error('Invalid memo row');
    const position = (row as Record<string, unknown>)._position;
    if (typeof position !== 'number' || !Number.isSafeInteger(position) || position < 0 || position >= rows.length ||
        positions.has(position)) throw new Error('Invalid memo order');
    positions.add(position);
  }
  const sorted = [...rows].sort((a, b) => (a as Record<string, number>)._position - (b as Record<string, number>)._position);
  return { notes: validateMemoArchive({ version: 1, notes: sorted }), revision: meta.revision };
}

function persistNotes(transaction: IDBTransaction, notes: MemoNote[], previous: MemoNote[], revision: number) {
  const store = transaction.objectStore('memoNotes');
  const old = new Map(previous.map((note, position) => [note.id, { note, position }]));
  notes.forEach((note, position) => {
    const saved = old.get(note.id);
    if (!saved || saved.position !== position || JSON.stringify(saved.note) !== JSON.stringify(note)) store.put({ ...note, _position: position });
    old.delete(note.id);
  });
  for (const id of old.keys()) store.delete(id);
  transaction.objectStore('metadata').put({ key: 'memos', formatVersion: 1, revision });
}

export async function readMemos(options: MemoStorageOptions = {}): Promise<MemoSnapshot> {
  const db = await openAppDatabase(options.factory);
  try {
    const existing = await memoTransaction(db, 'readonly', (_transaction, metadata, notes) => snapshotFromRows(metadata, notes));
    if (existing) return existing;
    const raw = (options.legacyStorage ?? globalThis.localStorage).getItem(MEMO_STORAGE_KEY);
    const initial = raw === null ? [] : validateMemoArchive(JSON.parse(raw));
    return await memoTransaction(db, 'readwrite', (transaction, metadata, notes) => {
      const latest = snapshotFromRows(metadata, notes);
      if (latest) return latest;
      persistNotes(transaction, initial, [], 1);
      return { notes: initial, revision: 1 };
    });
  } finally { db.close(); }
}

export async function writeMemos(notes: MemoNote[], expectedRevision: number,
  options: Pick<MemoStorageOptions, 'factory'> = {}): Promise<MemoSnapshot> {
  const checked = validateMemoArchive({ version: 1, notes });
  const db = await openAppDatabase(options.factory);
  try {
    return await memoTransaction(db, 'readwrite', (transaction, metadata, rows) => {
      const current = snapshotFromRows(metadata, rows);
      if (!current || current.revision !== expectedRevision) throw new MemoConflictError();
      const revision = current.revision + 1;
      if (!Number.isSafeInteger(revision)) throw new Error('Memo revision exceeded safe range');
      persistNotes(transaction, checked, current.notes, revision);
      return { notes: checked, revision };
    });
  } finally { db.close(); }
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
