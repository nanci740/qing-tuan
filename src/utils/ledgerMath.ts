import type { LedgerCurrency, LedgerData, LedgerTransaction } from '../types/ledger';

export const LEDGER_MAX_MINOR = 999_999_999_999;
export function localLedgerDate(date = new Date()): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}
export function validLedgerDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [y, m, d] = value.split('-').map(Number);
  if (y < 1900 || y > 9999 || m < 1 || m > 12 || d < 1) return false;
  return d <= new Date(y, m, 0).getDate();
}
export function validLedgerMonth(value: string): boolean {
  return validLedgerDate(`${value}-01`);
}
export function shiftLedgerMonth(month: string, delta: number): string {
  const [year, m] = month.split('-').map(Number);
  const next = new Date(year, m - 1 + delta, 1);
  const value = localLedgerDate(next).slice(0, 7);
  return validLedgerMonth(value) ? value : month;
}

/** 从十进制字符串转换最小单位，不用浮点数逐笔相加。 */
export function parseLedgerAmount(text: string, decimals: number): number | null {
  const value = text.trim().replace(/^\.(?=\d)/, '0.').replace(/\.$/, '');
  if (!/^\d+(?:\.\d+)?$/.test(value)) return null;
  const [whole, fraction = ''] = value.split('.');
  if (fraction.length > decimals) return null;
  const minor = Number(whole + fraction.padEnd(decimals, '0'));
  return Number.isSafeInteger(minor) && minor >= 0 && minor <= LEDGER_MAX_MINOR ? minor : null;
}
export function ledgerMinor(amount: number, decimals: number): number {
  return parseLedgerAmount(amount.toFixed(decimals), decimals) ?? 0;
}
export function formatLedgerMoney(amount: number, currency: LedgerCurrency): string {
  return new Intl.NumberFormat('zh-CN', { minimumFractionDigits: currency.decimals, maximumFractionDigits: currency.decimals }).format(amount);
}
export function calculatorInput(value: string, key: string, decimals: number): string {
  if (key === 'AC') return '0';
  if (key === 'backspace') return value.length > 1 ? value.slice(0, -1) : '0';
  if (key === '.') return decimals > 0 && !value.includes('.') ? `${value}.` : value;
  if (!/^\d$/.test(key)) return value;
  const next = value === '0' ? key : value + key;
  const fraction = next.split('.')[1] ?? '';
  return fraction.length <= decimals && parseLedgerAmount(next, decimals) !== null ? next : value;
}
const LEDGER_OPS = ['+', '−', '×', '÷'];
/** 算式按先乘除后加减算，结果按币种小数位四舍五入；除以零或算出负数都不算数。 */
export function evaluateLedgerExpression(expr: string, decimals: number): string | null {
  const parts = expr.split(/([+−×÷])/).filter(Boolean);
  if (parts.length && LEDGER_OPS.includes(parts.at(-1)!)) parts.pop();
  const numbers = parts.filter((_, i) => i % 2 === 0).map(Number), ops = parts.filter((_, i) => i % 2 === 1);
  if (!numbers.length || numbers.some(n => !Number.isFinite(n)) || ops.some(op => !LEDGER_OPS.includes(op))) return null;
  const terms = [numbers[0]], signs: string[] = [];
  for (const [i, op] of ops.entries()) {
    const n = numbers[i + 1];
    if (op === '×') terms[terms.length - 1] *= n;
    else if (op === '÷') { if (n === 0) return null; terms[terms.length - 1] /= n; }
    else { signs.push(op); terms.push(n); }
  }
  const total = terms.reduce((sum, term, i) => i === 0 ? term : signs[i - 1] === '+' ? sum + term : sum - term, 0);
  const factor = 10 ** decimals, rounded = Math.round(total * factor) / factor;
  return Number.isFinite(rounded) && rounded >= 0 && rounded * factor <= LEDGER_MAX_MINOR ? rounded.toFixed(decimals) : null;
}
export function ledgerExpressionHasOps(expr: string): boolean {
  return /[+−×÷]/.test(expr);
}
export function calculatorPress(expr: string, key: string, decimals: number): string {
  if (key === 'AC') return '0';
  if (key === 'backspace') return expr.length > 1 ? expr.slice(0, -1) : '0';
  if (key === '=') {
    const result = evaluateLedgerExpression(expr, decimals);
    return result === null ? expr : result.includes('.') ? result.replace(/0+$/, '').replace(/\.$/, '') : result;
  }
  if (LEDGER_OPS.includes(key)) {
    if (expr.length >= 40) return expr;
    return LEDGER_OPS.includes(expr.at(-1)!) ? expr.slice(0, -1) + key : expr + key;
  }
  const cut = Math.max(...LEDGER_OPS.map(op => expr.lastIndexOf(op))) + 1;
  const head = expr.slice(0, cut), last = expr.slice(cut);
  if (head.length + last.length >= 40) return expr;
  const press = (value: string, k: string) => calculatorInput(value || '0', k, decimals);
  return head + (key === '00' ? press(press(last, '0'), '0') : press(last, key));
}
export function mostUsedLedgerCurrency(data: LedgerData): string {
  const counts = new Map<string, number>();
  for (const entry of data.transactions) counts.set(entry.currencyCode, (counts.get(entry.currencyCode) ?? 0) + 1);
  return [...data.currencies].sort((a, b) => (counts.get(b.code) ?? 0) - (counts.get(a.code) ?? 0))[0]?.code ?? 'CNY';
}
export function ledgerMonthEntries(data: LedgerData, month: string, code: string): LedgerTransaction[] {
  return data.transactions.filter(entry => entry.currencyCode === code && entry.occurredOn.startsWith(`${month}-`))
    .sort((a, b) => b.occurredOn.localeCompare(a.occurredOn) || b.createdAt - a.createdAt || b.id.localeCompare(a.id));
}
export function ledgerMonthSummary(data: LedgerData, month: string, currency: LedgerCurrency) {
  const entries = ledgerMonthEntries(data, month, currency.code);
  const totals = { income: 0, expense: 0 };
  const categories = new Map<string, number>();
  for (const entry of entries) {
    const minor = ledgerMinor(entry.amount, currency.decimals);
    totals[entry.type] += minor;
    if (entry.type === 'expense') categories.set(entry.categoryId, (categories.get(entry.categoryId) ?? 0) + minor);
  }
  const factor = 10 ** currency.decimals;
  const budget = data.budgets.find(value => value.currencyCode === currency.code)?.monthlyAmount ?? null;
  const budgetMinor = budget === null ? null : ledgerMinor(budget, currency.decimals);
  const ratio = budgetMinor ? totals.expense / budgetMinor : 0;
  return {
    entries, income: totals.income / factor, expense: totals.expense / factor, budget,
    remaining: budgetMinor === null ? null : (budgetMinor - totals.expense) / factor,
    budgetState: budgetMinor === null ? 'unset' : totals.expense > budgetMinor ? 'over' : ratio >= .8 ? 'warning' : 'normal',
    categories: [...categories.entries()].map(([id, amount]) => ({ id, amount: amount / factor, percent: totals.expense ? amount / totals.expense * 100 : 0 }))
      .sort((a, b) => b.amount - a.amount),
  };
}
export function groupLedgerDays(entries: LedgerTransaction[], currency: LedgerCurrency) {
  const groups = new Map<string, { date: string; entries: LedgerTransaction[]; income: number; expense: number }>();
  for (const entry of entries) {
    const group = groups.get(entry.occurredOn) ?? { date: entry.occurredOn, entries: [], income: 0, expense: 0 };
    group.entries.push(entry);
    group[entry.type] += ledgerMinor(entry.amount, currency.decimals);
    groups.set(entry.occurredOn, group);
  }
  return [...groups.values()].map(group => ({ ...group, income: group.income / 10 ** currency.decimals, expense: group.expense / 10 ** currency.decimals }));
}
