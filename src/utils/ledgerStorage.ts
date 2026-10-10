import type { LedgerCategory, LedgerCurrency, LedgerData, LedgerIcon, LedgerTransaction } from '../types/ledger';
import { ledgerMinor, LEDGER_MAX_MINOR, validLedgerDate } from './ledgerMath.ts';

export const LEDGER_STORAGE_KEY = 'smallphone_ledger_v1';
export const LEDGER_ICONS: LedgerIcon[] = ['food', 'transport', 'shopping', 'fun', 'daily', 'home', 'medical', 'study', 'phone', 'clothes', 'gift', 'pet', 'salary', 'other'];
export const LEDGER_ICON_NAMES: Record<LedgerIcon, string> = {
  food: '饮食', transport: '交通', shopping: '购物', fun: '娱乐', daily: '日用', home: '居住', medical: '医疗',
  study: '学习', phone: '通讯', clothes: '服饰', gift: '人情', pet: '宠物', salary: '工资', other: '其他',
};
/** 表情只收一个字形，太长的直接拒绝。 */
export function ledgerEmoji(text: string): string {
  const value = text.trim();
  if (!value) return '';
  const first = typeof Intl.Segmenter === 'function' ? [...new Intl.Segmenter().segment(value)][0]?.segment ?? '' : Array.from(value)[0];
  return first.length <= 16 ? first : '';
}
type LedgerStorage = Pick<Storage, 'getItem' | 'setItem'>;
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
        !c.name.trim() || c.name.length > 20 || !LEDGER_ICONS.includes(c.icon as LedgerIcon) || typeof c.archived !== 'boolean' ||
        (c.emoji !== undefined && (typeof c.emoji !== 'string' || ledgerEmoji(c.emoji) !== c.emoji))) throw new Error('分类数据不正确');
    categoryIds.add(c.id);
    return { id: c.id, name: c.name, icon: c.icon as LedgerIcon, emoji: typeof c.emoji === 'string' ? c.emoji : '', archived: c.archived };
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
/** 旧存档补上后来加的预设分类，“吃饭”改叫“饮食”；新台币没有用到小数时改成 0 位。只改内存，下次保存才写回。 */
export function upgradeLedgerData(data: LedgerData): LedgerData {
  const categories = data.categories.map(c => c.id === 'category-food' && c.name === '吃饭' && !data.categories.some(o => o.name === '饮食') ? { ...c, name: '饮食' } : c);
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
export function readLedgerData(storage: LedgerStorage = localStorage): LedgerData {
  const raw = storage.getItem(LEDGER_STORAGE_KEY);
  return raw === null ? defaultLedgerData() : upgradeLedgerData(validateLedgerData(JSON.parse(raw)));
}
export function writeLedgerData(data: LedgerData, storage: LedgerStorage = localStorage): LedgerData {
  const checked = validateLedgerData(data);
  storage.setItem(LEDGER_STORAGE_KEY, JSON.stringify(checked));
  return checked;
}
