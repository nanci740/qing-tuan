/** 业务数据共用数据库；各功能分表，资产类现有数据库保持原样。 */
export const APP_DATABASE_NAME = 'QingTuanDB';
export const APP_DATABASE_VERSION = 3;
export const APP_DATABASE_BLOCKED_MESSAGE = '请关闭其他青团机页面后重试';
export const CATALOG_TABLES = ['worldBooks', 'chatCharacters', 'characterRecords'] as const;
export const LEDGER_TABLES = ['metadata', 'ledgerTransactions', 'ledgerCategories', 'ledgerCurrencies', 'ledgerBudgets'] as const;
export const MEMO_TABLES = ['metadata', 'memoNotes'] as const;

export function openAppDatabase(factory: IDBFactory = globalThis.indexedDB): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (!factory) { reject(new Error('IndexedDB unavailable')); return; }
    let finished = false;
    const request = factory.open(APP_DATABASE_NAME, APP_DATABASE_VERSION);
    const fail = (error: unknown) => {
      if (finished) return;
      finished = true; clearTimeout(timer); reject(error);
    };
    const timer = setTimeout(() => fail(new Error('IndexedDB open timed out')), 10000);
    request.onupgradeneeded = () => {
      if (finished) { request.transaction?.abort(); return; }
      const db = request.result;
      for (const name of [...LEDGER_TABLES, 'memoNotes', ...CATALOG_TABLES]) {
        if (db.objectStoreNames.contains(name)) continue;
        const keyPath = name === 'metadata' ? 'key' : name === 'ledgerCurrencies' ? 'code' : name === 'ledgerBudgets' ? 'currencyCode' : 'id';
        db.createObjectStore(name, { keyPath });
      }
    };
    request.onerror = () => fail(request.error ?? new Error('IndexedDB open failed'));
    request.onblocked = () => fail(new Error(APP_DATABASE_BLOCKED_MESSAGE));
    request.onsuccess = () => {
      const db = request.result;
      if (finished) { db.close(); return; }
      finished = true; clearTimeout(timer);
      db.onversionchange = () => db.close();
      resolve(db);
    };
  });
}
