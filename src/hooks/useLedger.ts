import { useRef, useState } from 'react';
import type { LedgerCurrency, LedgerData, LedgerDraft, LedgerIcon } from '../types/ledger';
import { defaultLedgerData, LEDGER_STORAGE_KEY, ledgerEmoji, ledgerId, upgradeLedgerData, validateLedgerData, writeLedgerData } from '../utils/ledgerStorage.ts';
import { parseLedgerAmount, validLedgerDate } from '../utils/ledgerMath.ts';

function loadLedger() {
  try {
    const raw = localStorage.getItem(LEDGER_STORAGE_KEY);
    return { data: raw === null ? defaultLedgerData() : upgradeLedgerData(validateLedgerData(JSON.parse(raw))), raw, loadError: '' };
  } catch {
    return { data: defaultLedgerData(), raw: null, loadError: '记账数据暂时无法读取，原来的存档已保留。请重新读取后再记账。' };
  }
}
export function useLedger() {
  const [state, setState] = useState(loadLedger);
  const [error, setError] = useState('');
  const live = useRef(state.data), snapshot = useRef(state.raw);
  const active = useRef(true);

  function fail(message: string) { setError(message); return false; }
  function commit(next: LedgerData) {
    if (!active.current || state.loadError) return false;
    try {
      if (localStorage.getItem(LEDGER_STORAGE_KEY) !== snapshot.current)
        return fail('记账已在另一个页面更新，请重新读取，再保存这次修改。');
      const checked = writeLedgerData(next);
      live.current = checked;
      snapshot.current = JSON.stringify(checked);
      setState({ data: checked, raw: snapshot.current, loadError: '' });
      setError('');
      return true;
    } catch {
      return fail('保存失败，请检查浏览器存储空间后重试。原来的记录已保留。');
    }
  }
  function reload() {
    const next = loadLedger();
    live.current = next.data; snapshot.current = next.raw;
    setState(next); setError('');
  }
  function saveTransaction(draft: LedgerDraft) {
    const currency = live.current.currencies.find(c => c.code === draft.currencyCode);
    const category = live.current.categories.find(c => c.id === draft.categoryId);
    const old = live.current.transactions.find(entry => entry.id === draft.id);
    if (!currency || !category || (category.archived && old?.categoryId !== category.id)) return fail('请选择一个可用币种和分类。');
    const minor = parseLedgerAmount(draft.amount, currency.decimals);
    if (minor === null || minor <= 0) return fail(`请输入大于零的金额，${currency.name}最多 ${currency.decimals} 位小数。`);
    if (!validLedgerDate(draft.occurredOn)) return fail('请选择有效的发生日期。');
    if (draft.id && !old) return fail('这笔记录已不存在，请返回流水重新查看。');
    const now = Date.now();
    const next = { id: old?.id ?? ledgerId(), type: draft.type, amount: minor / 10 ** currency.decimals,
      currencyCode: currency.code, categoryId: category.id, note: draft.note.trim(), occurredOn: draft.occurredOn,
      createdAt: old?.createdAt ?? now, updatedAt: now };
    return commit({ ...live.current, transactions: old ? live.current.transactions.map(e => e.id === old.id ? next : e) : [...live.current.transactions, next] });
  }
  function deleteTransaction(id: string) {
    return commit({ ...live.current, transactions: live.current.transactions.filter(e => e.id !== id) });
  }
  function saveCategory(id: string | null, name: string, icon: LedgerIcon, emojiText = '') {
    const cleaned = name.trim(), emoji = ledgerEmoji(emojiText);
    if (emojiText.trim() && !emoji) return fail('表情请只放一个符号。');
    if (!cleaned || cleaned.length > 20) return fail('分类名称请填写 1–20 个字符。');
    if (live.current.categories.some(c => !c.archived && c.id !== id && c.name === cleaned)) return fail('已有同名分类。');
    const old = live.current.categories.find(c => c.id === id && !c.archived);
    if (id && !old) return fail('分类已不存在，请重新选择。');
    const category = { id: old?.id ?? ledgerId(), name: cleaned, icon, emoji, archived: false };
    return commit({ ...live.current, categories: old ? live.current.categories.map(c => c.id === id ? category : c) : [...live.current.categories, category] });
  }
  function deleteCategory(id: string) {
    if (live.current.categories.filter(c => !c.archived).length <= 1) return fail('请至少保留一个可用分类。');
    return commit({ ...live.current, categories: live.current.categories.map(c => c.id === id ? { ...c, archived: true } : c) });
  }
  function saveBudget(code: string, text: string) {
    const currency = live.current.currencies.find(c => c.code === code);
    if (!currency) return fail('请选择有效币种。');
    const minor = text.trim() ? parseLedgerAmount(text, currency.decimals) : 0;
    if (minor === null) return fail(`请输入有效预算，最多 ${currency.decimals} 位小数。`);
    const budgets = live.current.budgets.filter(b => b.currencyCode !== code);
    if (minor > 0) budgets.push({ currencyCode: code, monthlyAmount: minor / 10 ** currency.decimals });
    return commit({ ...live.current, budgets });
  }
  function addCurrency(currency: LedgerCurrency) {
    const code = currency.code.trim().toUpperCase(), name = currency.name.trim();
    if (!/^[A-Z]{3}$/.test(code) || !name || name.length > 30) return fail('请填写三位币种代码和 1–30 个字符的名称。');
    if (live.current.currencies.some(c => c.code === code)) return fail('这个币种已经存在。');
    return commit({ ...live.current, currencies: [...live.current.currencies, { code, name, decimals: currency.decimals }] });
  }
  return { data: state.data, loadError: state.loadError, error, clearError: () => setError(''), active,
    reload, saveTransaction, deleteTransaction, saveCategory, deleteCategory, saveBudget, addCurrency };
}
