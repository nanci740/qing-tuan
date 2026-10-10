import type { LedgerCategory, LedgerCurrency, LedgerData, LedgerIcon, LedgerTransaction } from '../types/ledger';
import { ledgerMinor, LEDGER_MAX_MINOR, validLedgerDate } from './ledgerMath.ts';
import { LEDGER_TABLES, openAppDatabase } from './appDatabase.ts';

export const LEDGER_STORAGE_KEY = 'smallphone_ledger_v1';
export const LEDGER_ICONS: LedgerIcon[] = ['food', 'transport', 'shopping', 'fun', 'daily', 'home', 'medical', 'study', 'phone', 'clothes', 'merch', 'pet', 'salary', 'other'];
export const LEDGER_ICON_NAMES: Record<LedgerIcon, string> = {
  food: '饮食', transport: '交通', shopping: '购物', fun: '娱乐', daily: '日用', home: '居住', medical: '医疗',
  study: '学习', phone: '通讯', clothes: '服饰', merch: '周边', pet: '宠物', salary: '工资', other: '其他',
};
/** 表情只收一个字形，太长的直接拒绝。 */
export function ledgerEmoji(text: string): string {
  const value = text.trim();
  if (!value) return '';
  const first = typeof Intl.Segmenter === 'function' ? [...new Intl.Segmenter().segment(value)][0]?.segment ?? '' : Array.from(value)[0];
  return first.length <= 16 ? first : '';
}
export function ledgerId(): string { return globalThis.crypto?.randomUUID?.() ?? `ledger-${Date.now()}-${Math.random().toString(36).slice(2)}`; }
export function defaultLedgerData(): LedgerData {
  return {
    version: 1, transactions: [], budgets: [],
    categories: LEDGER_ICONS.map(icon => ({ id: `category-${icon}`, name: LEDGER_ICON_NAMES[icon], icon, emoji: '', archived: false })),
    currencies: [
      { code: 'CNY', name: '人民币', decimals: 2 }, { code: 'TWD', name: '新台币', decimals: 0 },
      { code: 'JPY', name: '日元', decimals: 0 }, { code: 'USD', name: '美元', decimals: 2 },
    ],
  };
}
const record = (v: unknown): v is Record<string, unknown> => !!v && typeof v === 'object' && !Array.isArray(v);
const timestamp = (v: unknown): v is number => typeof v === 'number' && Number.isSafeInteger(v) && v >= 0;
function validMoney(v: unknown, decimals: number, allowZero = false): v is number {
  return typeof v === 'number' && Number.isFinite(v) && (allowZero ? v >= 0 : v > 0) &&
    Number(v.toFixed(decimals)) === v && v * 10 ** decimals <= LEDGER_MAX_MINOR;
}

/** 整份存档校验失败则拒绝读取；不得用默认值覆盖损坏数据。 */
export function validateLedgerData(value: unknown): LedgerData {
  if (!record(value) || value.version !== 1 || !Array.isArray(value.transactions) || !Array.isArray(value.categories) ||
      !Array.isArray(value.currencies) || !Array.isArray(value.budgets)) throw new Error('记账存档格式不正确');
  const currencyCodes = new Set<string>(), categoryIds = new Set<string>(), transactionIds = new Set<string>(), budgetCodes = new Set<string>();
  const currencies = value.currencies.map((c: unknown): LedgerCurrency => {
    if (!record(c) || typeof c.code !== 'string' || !/^[A-Z]{3}$/.test(c.code) || currencyCodes.has(c.code) ||
        typeof c.name !== 'string' || !c.name.trim() || c.name.length > 30 ||
        typeof c.decimals !== 'number' || !Number.isInteger(c.decimals) || c.decimals < 0 || c.decimals > 3) throw new Error('币种数据不正确');
    currencyCodes.add(c.code);
    return { code: c.code, name: c.name, decimals: c.decimals };
  });
  if (!currencies.length) throw new Error('至少保留一个币种');
  const categories = value.categories.map((c: unknown): LedgerCategory => {
    if (!record(c) || typeof c.id !== 'string' || !c.id || categoryIds.has(c.id) || typeof c.name !== 'string' ||
        !c.name.trim() || c.name.length > 20 || !LEDGER_ICONS.includes((c.icon === 'gift' ? 'merch' : c.icon) as LedgerIcon) || typeof c.archived !== 'boolean' ||
        (c.emoji !== undefined && (typeof c.emoji !== 'string' || ledgerEmoji(c.emoji) !== c.emoji))) throw new Error('分类数据不正确');
    categoryIds.add(c.id);
    return { id: c.id, name: c.name, icon: (c.icon === 'gift' ? 'merch' : c.icon) as LedgerIcon, emoji: typeof c.emoji === 'string' ? c.emoji : '', archived: c.archived };
  });
  if (!categories.some(c => !c.archived)) throw new Error('至少保留一个可用分类');
  const totals = new Map<string, number>();
  const transactions = value.transactions.map((e: unknown): LedgerTransaction => {
    if (!record(e) || typeof e.id !== 'string' || !e.id || transactionIds.has(e.id) ||
        (e.type !== 'expense' && e.type !== 'income') || typeof e.currencyCode !== 'string' || !currencyCodes.has(e.currencyCode) ||
        typeof e.categoryId !== 'string' || !categoryIds.has(e.categoryId) || typeof e.note !== 'string' || e.note.length > 500 ||
        typeof e.occurredOn !== 'string' || !validLedgerDate(e.occurredOn) || !timestamp(e.createdAt) || !timestamp(e.updatedAt)) throw new Error('流水数据不正确');
    const currency = currencies.find(c => c.code === e.currencyCode)!;
    if (!validMoney(e.amount, currency.decimals)) throw new Error('流水金额不正确');
    const key = `${e.currencyCode}:${e.type}`, total = (totals.get(key) ?? 0) + ledgerMinor(e.amount, currency.decimals);
    if (!Number.isSafeInteger(total)) throw new Error('流水累计金额超出可精确计算范围');
    totals.set(key, total); transactionIds.add(e.id);
    return { id: e.id, type: e.type, amount: e.amount, currencyCode: e.currencyCode, categoryId: e.categoryId,
      note: e.note, occurredOn: e.occurredOn, createdAt: e.createdAt, updatedAt: e.updatedAt };
  });
  const budgets = value.budgets.map((b: unknown) => {
    if (!record(b) || typeof b.currencyCode !== 'string' || !currencyCodes.has(b.currencyCode) || budgetCodes.has(b.currencyCode)) throw new Error('预算数据不正确');
    const currency = currencies.find(c => c.code === b.currencyCode)!;
    if (!validMoney(b.monthlyAmount, currency.decimals)) throw new Error('预算金额不正确');
    budgetCodes.add(b.currencyCode);
    return { currencyCode: b.currencyCode, monthlyAmount: b.monthlyAmount };
  });
  return { version: 1, transactions, categories, currencies, budgets };
}
/** 旧存档补上后来加的预设分类，“吃饭”改叫“饮食”、“人情”改成“周边”；新台币没有用到小数时改成 0 位。只改内存，下次保存才写回。 */
export function upgradeLedgerData(data: LedgerData): LedgerData {
  const renamed: Record<string, [string, string]> = { 'category-food': ['吃饭', '饮食'], 'category-gift': ['人情', '周边'] };
  const categories = data.categories.map(c => {
    const [from, to] = renamed[c.id] ?? [];
    return from && c.name === from && !data.categories.some(o => o.name === to) ? { ...c, name: to } : c;
  });
  for (const icon of LEDGER_ICONS) {
    if (categories.some(c => c.id === `category-${icon}` || (!c.archived && c.name === LEDGER_ICON_NAMES[icon]))) continue;
    const other = categories.findIndex(c => c.id === 'category-other');
    categories.splice(other < 0 ? categories.length : other, 0, { id: `category-${icon}`, name: LEDGER_ICON_NAMES[icon], icon, emoji: '', archived: false });
  }
  const whole = (code: string) => data.transactions.every(e => e.currencyCode !== code || Number.isInteger(e.amount)) &&
    data.budgets.every(b => b.currencyCode !== code || Number.isInteger(b.monthlyAmount));
  const currencies = data.currencies.map(c => c.code === 'TWD' && c.name === '新台币' && c.decimals === 2 && whole('TWD') ? { ...c, decimals: 0 } : c);
  return { ...data, categories, currencies };
}
export const LEDGER_CONFLICT_MESSAGE = '其他青团机分页改过记账，请关掉其他分页，再重新打开记账';
export class LedgerConflictError extends Error {
  constructor() { super(LEDGER_CONFLICT_MESSAGE); this.name = 'LedgerConflictError'; }
}
export interface LedgerSnapshot { data: LedgerData; revision: number }
interface LedgerStorageOptions {
  factory?: IDBFactory;
  /** 只用于首次迁移。旧存档始终保留，正常读写不再访问 localStorage。 */
  legacyStorage?: Pick<Storage, 'getItem'>;
}
interface LedgerRows {
  metadata: unknown;
  transactions: unknown[];
  categories: unknown[];
  currencies: unknown[];
  budgets: unknown[];
}
const DATA_TABLES = ['ledgerTransactions', 'ledgerCategories', 'ledgerCurrencies', 'ledgerBudgets'] as const;
const ROW_FIELDS = ['transactions', 'categories', 'currencies', 'budgets'] as const;

/** 只在 transaction.complete 后报告成功；检查、增删改及 revision 写入一起提交。 */
function runLedgerTransaction<T>(db: IDBDatabase, mode: IDBTransactionMode,
  work: (transaction: IDBTransaction, rows: LedgerRows) => T): Promise<T> {
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([...LEDGER_TABLES], mode);
    let cause: unknown, result: T, completed = false, remaining = LEDGER_TABLES.length;
    const rows: LedgerRows = { metadata: undefined, transactions: [], categories: [], currencies: [], budgets: [] };
    const abort = (error: unknown) => {
      cause = error;
      try { transaction.abort(); } catch { reject(error); }
    };
    transaction.onabort = () => reject(cause ?? transaction.error ?? new Error('Ledger transaction aborted'));
    transaction.onerror = () => { /* 请求错误由数据库中止整笔事务，统一在 onabort 拒绝。 */ };
    transaction.oncomplete = () => completed ? resolve(result) : reject(new Error('Ledger read did not finish'));
    const collect = (request: IDBRequest, field: keyof LedgerRows) => {
      request.onsuccess = () => {
        Object.assign(rows, { [field]: request.result });
        if (--remaining !== 0) return;
        try { result = work(transaction, rows); completed = true; } catch (error) { abort(error); }
      };
    };
    collect(transaction.objectStore('metadata').get('ledger'), 'metadata');
    DATA_TABLES.forEach((table, index) => collect(transaction.objectStore(table).getAll(), ROW_FIELDS[index]));
  });
}

function snapshotFromRows(rows: LedgerRows): LedgerSnapshot | null {
  const metadata = rows.metadata;
  if (metadata === undefined) {
    if (ROW_FIELDS.some(field => rows[field].length)) throw new Error('Ledger metadata missing');
    return null;
  }
  if (!record(metadata) || metadata.key !== 'ledger' || metadata.formatVersion !== 1 ||
      typeof metadata.revision !== 'number' || !Number.isSafeInteger(metadata.revision) || metadata.revision < 1)
    throw new Error('Invalid ledger metadata');
  // getAll 按主键排序；保存内部位置，确保分类、币种和旧流水顺序与迁移前一致。
  const ordered = (values: unknown[]) => {
    const positions = new Set<number>();
    for (const value of values) {
      if (!record(value) || typeof value._position !== 'number' || !Number.isSafeInteger(value._position) ||
          value._position < 0 || value._position >= values.length || positions.has(value._position))
        throw new Error('Invalid ledger row order');
      positions.add(value._position);
    }
    return [...values].sort((a, b) => (a as Record<string, number>)._position - (b as Record<string, number>)._position);
  };
  const data = validateLedgerData({ version: metadata.formatVersion, transactions: ordered(rows.transactions),
    categories: ordered(rows.categories), currencies: ordered(rows.currencies), budgets: ordered(rows.budgets) });
  return { data, revision: metadata.revision };
}

function persistRows(transaction: IDBTransaction, data: LedgerData, previous: LedgerData | null, revision: number) {
  DATA_TABLES.forEach((table, index) => {
    const store = transaction.objectStore(table), field = ROW_FIELDS[index];
    const key = (row: Record<string, unknown>) => String(row[table === 'ledgerCurrencies' ? 'code' : table === 'ledgerBudgets' ? 'currencyCode' : 'id']);
    const old = new Map((previous?.[field] ?? []).map((row, position) => [key(row as unknown as Record<string, unknown>), { row, position }]));
    data[field].forEach((row, position) => {
      const id = key(row as unknown as Record<string, unknown>);
      const saved = old.get(id);
      if (!saved || saved.position !== position || JSON.stringify(saved.row) !== JSON.stringify(row)) store.put({ ...row, _position: position });
      old.delete(id);
    });
    for (const id of old.keys()) store.delete(id);
  });
  transaction.objectStore('metadata').put({ key: 'ledger', formatVersion: 1, revision });
}

export async function readLedgerData(options: LedgerStorageOptions = {}): Promise<LedgerSnapshot> {
  const db = await openAppDatabase(options.factory);
  try {
    const existing = await runLedgerTransaction(db, 'readonly', (_transaction, rows) => snapshotFromRows(rows));
    if (existing) return { ...existing, data: upgradeLedgerData(existing.data) };
    // 数据库确认尚未初始化后才读取旧键；读取或校验失败时不写入默认值。
    const raw = (options.legacyStorage ?? globalThis.localStorage).getItem(LEDGER_STORAGE_KEY);
    const initial = raw === null ? defaultLedgerData() : upgradeLedgerData(validateLedgerData(JSON.parse(raw)));
    return await runLedgerTransaction(db, 'readwrite', (transaction, rows) => {
      // 两个分页同时迁移时，后一个必须使用先完成者的资料，不得再次初始化。
      const latest = snapshotFromRows(rows);
      if (latest) return { ...latest, data: upgradeLedgerData(latest.data) };
      persistRows(transaction, initial, null, 1);
      return { data: initial, revision: 1 };
    });
  } finally { db.close(); }
}

export async function writeLedgerData(data: LedgerData, expectedRevision: number,
  options: Pick<LedgerStorageOptions, 'factory'> = {}): Promise<LedgerSnapshot> {
  const checked = validateLedgerData(data);
  const db = await openAppDatabase(options.factory);
  try {
    return await runLedgerTransaction(db, 'readwrite', (transaction, rows) => {
      const current = snapshotFromRows(rows);
      if (!current || current.revision !== expectedRevision) throw new LedgerConflictError();
      const revision = current.revision + 1;
      if (!Number.isSafeInteger(revision)) throw new Error('Ledger revision exceeded safe range');
      persistRows(transaction, checked, current.data, revision);
      return { data: checked, revision };
    });
  } finally { db.close(); }
}
