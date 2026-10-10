import { CATALOG_TABLES, APP_DATABASE_BLOCKED_MESSAGE } from './appDatabase.ts';
import { catalogSnapshot, CatalogConflictError, migrateCatalogDatabase, readCatalogDatabase, writeCatalogDatabase } from './catalogDatabase.ts';
import type { CatalogSnapshot } from './catalogDatabase.ts';
import { validateCatalogRows } from './catalogValidation.ts';
import type { CatalogData, CatalogKind, CatalogRow } from './catalogValidation.ts';
import { decodeCoverRecords, decodePhotoRecords, encodeCoverRecords, encodePhotoRecords,
  prepareCoverRecords, preparePhotoRecords, restoreImageReferences } from './imageAssets';
import { showToast } from './toast';

const keys: Record<CatalogKind, string> = {
  worldBooks: 'smallphone_world_books_v1', chatCharacters: 'smallphone_chat_characters_v1', characterRecords: 'smallphone_dossier_records_v1',
};
const labels: Record<CatalogKind, string> = { worldBooks: '世界书', chatCharacters: '角色卡', characterRecords: '档案记录' };
interface State { snapshot: CatalogSnapshot | null; failure: string; lastFailure: string; queue: Promise<unknown>; generation: number }
const states = Object.fromEntries(CATALOG_TABLES.map(kind => [kind,
  { snapshot: null, failure: '', lastFailure: '', queue: Promise.resolve(), generation: 0 }])) as Record<CatalogKind, State>;
let initialization: Promise<string> | undefined;
function unreadable(kind: CatalogKind) { return `${labels[kind]}资料无法读取，原资料已保留，请重新打开`; }
function saveFailure(kind: CatalogKind) { return `${labels[kind]}没有存进去，请重试`; }
async function prepare(kind: CatalogKind, rows: CatalogRow[]): Promise<CatalogRow[]> {
  if (kind === 'worldBooks') {
    await prepareCoverRecords(rows);
    const encoded = encodeCoverRecords(rows);
    await restoreImageReferences(encoded.map(row => typeof row.cover === 'string' ? row.cover : ''));
    return encoded;
  }
  await preparePhotoRecords(rows);
  const encoded = encodePhotoRecords(rows);
  await restoreImageReferences(encoded.map(row => typeof row.photoUrl === 'string' ? row.photoUrl : ''));
  return encoded;
}
/** App 挂载前读入全部资料；坏清单保持锁定，健康清单仍可使用，警告交给开机统一 showToast。 */
export function initializeCatalogStorage(): Promise<string> {
  return initialization ??= initialize();
}
async function initialize(): Promise<string> {
  const values = await readCatalogDatabase(), initial: Partial<Record<CatalogKind, CatalogRow[]>> = {};
  for (const kind of CATALOG_TABLES) {
    try {
      const saved = catalogSnapshot(kind, values[kind]);
      if (saved) {
        await prepare(kind, saved.rows);
        states[kind].snapshot = saved;
      } else {
        // 未迁移且数据库为空才访问旧键；整个清单通过检查后才处理图片。
        const raw = localStorage.getItem(keys[kind]);
        const checked = validateCatalogRows(kind, raw === null ? [] : JSON.parse(raw));
        initial[kind] = await prepare(kind, checked);
      }
    } catch (error) {
      if (error instanceof Error && error.message === APP_DATABASE_BLOCKED_MESSAGE) throw error;
      states[kind].failure = unreadable(kind);
    }
  }
  try {
    const migrated = await migrateCatalogDatabase(initial);
    for (const kind of CATALOG_TABLES) if (migrated[kind]) {
      // 另一分页可能已完成迁移；恢复其图片后才能开放读写。
      await prepare(kind, migrated[kind]!.rows);
      states[kind].snapshot = migrated[kind]!;
    }
  } catch (error) {
    if (error instanceof Error && error.message === APP_DATABASE_BLOCKED_MESSAGE) throw error;
    for (const kind of CATALOG_TABLES) if (!states[kind].snapshot) states[kind].failure ||= unreadable(kind);
  }
  return CATALOG_TABLES.map(kind => states[kind].failure).filter(Boolean).join('；');
}
/** 同步读永远来自开机缓存；克隆避免编辑草稿污染最后一次成功保存的资料。 */
export function readCatalogRecords<K extends CatalogKind>(kind: K): CatalogData[K] {
  const rows = structuredClone(states[kind].snapshot?.rows ?? []);
  return (kind === 'worldBooks' ? decodeCoverRecords(rows) : decodePhotoRecords(rows)) as unknown as CatalogData[K];
}
export function subscribeCatalog(listener: () => void): () => void {
  window.addEventListener('qingtuan:catalog-changed', listener);
  return () => window.removeEventListener('qingtuan:catalog-changed', listener);
}
export function catalogRevision(kind: CatalogKind): number { return states[kind].snapshot?.revision ?? 0; }
export function catalogSaveError(kind: CatalogKind): string { return states[kind].lastFailure || states[kind].failure || saveFailure(kind); }
/** 同一分页串行保存，跨分页在同一数据库事务中比对 revision；失败会取消依赖它的排队保存。 */
export async function writeCatalogRecords<K extends CatalogKind>(kind: K, records: CatalogData[K]): Promise<boolean> {
  const state = states[kind], generation = state.generation;
  let checked: CatalogRow[];
  try { checked = validateCatalogRows(kind, records); }
  catch { state.lastFailure = state.failure || saveFailure(kind); showToast(state.lastFailure); return false; }
  const pending = state.queue.then(async () => {
    if (state.failure) throw Error(state.failure);
    if (!state.snapshot || generation !== state.generation) throw Error(saveFailure(kind));
    const rows = await prepare(kind, checked);
    state.snapshot = await writeCatalogDatabase(kind, rows, state.snapshot.revision);
    window.dispatchEvent(new CustomEvent('qingtuan:catalog-changed', { detail: kind }));
  });
  state.queue = pending.catch(() => undefined);
  try { await pending; state.lastFailure = ''; return true; }
  catch (error) {
    state.generation++;
    if (error instanceof CatalogConflictError) state.failure = error.message;
    const message = state.failure || (error instanceof Error && error.message === APP_DATABASE_BLOCKED_MESSAGE
      ? APP_DATABASE_BLOCKED_MESSAGE : saveFailure(kind));
    state.lastFailure = message;
    showToast(message);
    return false;
  }
}
