import { CATALOG_TABLES, openAppDatabase } from './appDatabase.ts';
import { validateCatalogRows } from './catalogValidation.ts';
import type { CatalogKind, CatalogRow } from './catalogValidation.ts';

export const CATALOG_CONFLICT_MESSAGE = '其他青团机分页改过资料，请关掉其他分页，再重新打开';
export class CatalogConflictError extends Error { constructor() { super(CATALOG_CONFLICT_MESSAGE); } }
export interface CatalogSnapshot { rows: CatalogRow[]; revision: number }
interface CollectionRows { metadata: unknown; rows: unknown[] }
type DatabaseRows = Record<CatalogKind, CollectionRows>;

/** 收集请求和写入回调都在活跃事务中执行，完成事件之后才报告成功。 */
function transaction<T>(db: IDBDatabase, kinds: readonly CatalogKind[], mode: IDBTransactionMode,
  work: (tx: IDBTransaction, values: DatabaseRows) => T): Promise<T> {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(['metadata', ...kinds], mode);
    const values = {} as DatabaseRows;
    let remaining = kinds.length * 2, result: T, finished = false, cause: unknown;
    tx.onabort = () => reject(cause ?? tx.error ?? Error('资料事务失败'));
    tx.oncomplete = () => finished ? resolve(result) : reject(Error('资料读取未完成'));
    for (const kind of kinds) {
      values[kind] = { metadata: undefined, rows: [] };
      const collect = (request: IDBRequest, field: keyof CollectionRows) => {
        request.onsuccess = () => {
          values[kind][field] = request.result;
          if (--remaining) return;
          try { result = work(tx, values); finished = true; }
          catch (error) { cause = error; tx.abort(); }
        };
      };
      collect(tx.objectStore('metadata').get(kind), 'metadata');
      collect(tx.objectStore(kind).getAll(), 'rows');
    }
  });
}
export function catalogSnapshot(kind: CatalogKind, saved: CollectionRows): CatalogSnapshot | null {
  if (saved.metadata === undefined) {
    if (saved.rows.length) throw Error('资料迁移标记缺失');
    return null;
  }
  const meta = saved.metadata as Record<string, unknown>;
  if (!meta || meta.key !== kind || meta.formatVersion !== 1 || meta.migrated !== true ||
      typeof meta.revision !== 'number' || !Number.isSafeInteger(meta.revision) || meta.revision < 1 ||
      !Array.isArray(meta.order) || meta.order.length !== saved.rows.length ||
      meta.order.some(id => typeof id !== 'string') || new Set(meta.order).size !== meta.order.length) throw Error('资料版本或顺序异常');
  const rows = validateCatalogRows(kind, saved.rows), byId = new Map(rows.map(row => [row.id, row]));
  const ordered = (meta.order as string[]).map(id => {
    const row = byId.get(id); if (!row) throw Error('资料顺序编号异常'); return row;
  });
  return { rows: ordered, revision: meta.revision };
}
export async function readCatalogDatabase(factory?: IDBFactory) {
  const db = await openAppDatabase(factory);
  try { return await transaction(db, CATALOG_TABLES, 'readonly', (_tx, values) => values); }
  finally { db.close(); }
}
/** 各条只在内容不同或新增时 put；清单顺序存在独立 metadata，不因删除而重写其他记录。 */
function persist(tx: IDBTransaction, kind: CatalogKind, rows: CatalogRow[], old: CatalogRow[], revision: number) {
  const remaining = new Map(old.map(row => [row.id, row])), store = tx.objectStore(kind);
  for (const row of rows) {
    if (JSON.stringify(remaining.get(row.id)) !== JSON.stringify(row)) store.put(row);
    remaining.delete(row.id);
  }
  for (const id of remaining.keys()) store.delete(id);
  tx.objectStore('metadata').put({ key: kind, formatVersion: 1, revision, migrated: true, order: rows.map(row => row.id) });
}
export async function migrateCatalogDatabase(initial: Partial<Record<CatalogKind, CatalogRow[]>>, factory?: IDBFactory) {
  const kinds = CATALOG_TABLES.filter(kind => initial[kind] !== undefined);
  if (!kinds.length) return {} as Partial<Record<CatalogKind, CatalogSnapshot>>;
  for (const kind of kinds) validateCatalogRows(kind, initial[kind]);
  const db = await openAppDatabase(factory);
  try {
    return await transaction(db, kinds, 'readwrite', (tx, values) => {
      const result: Partial<Record<CatalogKind, CatalogSnapshot>> = {};
      // 先复查所有表，再开始写；其他分页已完成迁移时直接用其资料。
      for (const kind of kinds) result[kind] = catalogSnapshot(kind, values[kind]) ?? { rows: initial[kind]!, revision: 1 };
      for (const kind of kinds) if (values[kind].metadata === undefined) persist(tx, kind, initial[kind]!, [], 1);
      return result;
    });
  } finally { db.close(); }
}
export async function writeCatalogDatabase(kind: CatalogKind, rows: CatalogRow[], expectedRevision: number, factory?: IDBFactory) {
  const checked = validateCatalogRows(kind, rows), db = await openAppDatabase(factory);
  try {
    return await transaction(db, [kind], 'readwrite', (tx, values) => {
      const current = catalogSnapshot(kind, values[kind]);
      if (!current || current.revision !== expectedRevision) throw new CatalogConflictError();
      if (JSON.stringify(checked) === JSON.stringify(current.rows)) return current;
      const revision = current.revision + 1;
      if (!Number.isSafeInteger(revision)) throw Error('资料版本号超出范围');
      persist(tx, kind, checked, current.rows, revision);
      return { rows: checked, revision };
    });
  } finally { db.close(); }
}
/** 图片清理前从权威表检查关联；任一表损坏则停止清理，不能将它当作空表。 */
export async function readCatalogImageReferences(): Promise<string[]> {
  const values = await readCatalogDatabase(), refs: string[] = [];
  for (const kind of CATALOG_TABLES) {
    const snapshot = catalogSnapshot(kind, values[kind]);
    if (!snapshot) throw Error('资料迁移尚未完成，已停止图片清理');
    for (const row of snapshot.rows) {
      const image = row[kind === 'worldBooks' ? 'cover' : 'photoUrl'];
      if (typeof image === 'string' && image.startsWith('qt-image:')) refs.push(image);
    }
  }
  return refs;
}
