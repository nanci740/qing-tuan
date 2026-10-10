import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { PressedButton } from '../../components/shared/PressedButton';
import { confirmChat } from '../../utils/chatConfirm';
import { useLedger } from '../../hooks/useLedger';
import type { LedgerDraft, LedgerIcon, LedgerTransaction } from '../../types/ledger';
import { LEDGER_ICONS } from '../../utils/ledgerStorage.ts';
import { calculatorInput, formatLedgerMoney, groupLedgerDays, ledgerMonthSummary, localLedgerDate, mostUsedLedgerCurrency, parseLedgerAmount, shiftLedgerMonth, validLedgerMonth } from '../../utils/ledgerMath.ts';
import { LedgerCategoryIcon, LedgerToolIcon } from './LedgerIcon';
import './Ledger.css';

type View = 'home' | 'entry' | 'categories' | 'budget' | 'currencies';
function ReceiptEdge({ bottom = false }: { bottom?: boolean }) {
  const points = Array.from({ length: 49 }, (_, i) => `${i * 5},${i % 2 ? 6 : 0}`).join(' ');
  return <svg className={bottom ? 'ledger-receipt-edge is-bottom' : 'ledger-receipt-edge'} viewBox="0 0 240 6" preserveAspectRatio="none" aria-hidden="true"><polygon points={`0,0 ${points} 240,0`} fill="var(--color-page)" /><polyline points={points} fill="none" stroke="var(--color-divider)" strokeWidth=".5" /></svg>;
}

export function Ledger({ onClose }: { onClose: () => void }) {
  const ledger = useLedger();
  const [view, setView] = useState<View>('home');
  const [month, setMonth] = useState(() => localLedgerDate().slice(0, 7));
  const [code, setCode] = useState(() => mostUsedLedgerCurrency(ledger.data));
  const [draft, setDraft] = useState<LedgerDraft | null>(null);
  const originalDraft = useRef('');
  const [categoryDraft, setCategoryDraft] = useState({ id: null as string | null, name: '', icon: 'other' as LedgerIcon });
  const [budget, setBudget] = useState('');
  const [currencyDraft, setCurrencyDraft] = useState({ code: '', name: '', decimals: 2 });
  const [closing, setClosing] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [message, setMessage] = useState('');
  const root = useRef<HTMLElement>(null), backButton = useRef<HTMLButtonElement>(null);
  const closingTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const confirmationBusy = useRef(false), alive = useRef(true);
  const currency = ledger.data.currencies.find(c => c.code === code) ?? ledger.data.currencies[0];
  const entryCurrency = ledger.data.currencies.find(c => c.code === draft?.currencyCode) ?? currency;
  const categories = ledger.data.categories.filter(c => !c.archived);
  const summary = ledgerMonthSummary(ledger.data, month, currency);
  const days = groupLedgerDays(summary.entries, currency);
  const readonly = Boolean(ledger.loadError);

  useEffect(() => {
    alive.current = true; ledger.active.current = true;
    const focused = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden'; backButton.current?.focus();
    return () => {
      alive.current = false; ledger.active.current = false;
      if (closingTimer.current) clearTimeout(closingTimer.current);
      document.body.style.overflow = overflow; focused?.focus();
    };
  }, []);
  useEffect(() => { backButton.current?.focus(); }, [view]);
  useEffect(() => {
    if (!confirming) return;
    const dialog = () => Array.from(document.querySelectorAll<HTMLElement>('.sp-confirm-overlay')).at(-1);
    const frame = requestAnimationFrame(() => dialog()?.querySelector<HTMLButtonElement>('button')?.focus());
    const keydown = (event: KeyboardEvent) => {
      const buttons = Array.from(dialog()?.querySelectorAll<HTMLButtonElement>('button:not(:disabled)') ?? []);
      if (event.key === 'Escape') {
        event.preventDefault(); event.stopImmediatePropagation(); buttons[0]?.click();
      } else if (event.key === 'Tab' && buttons.length) {
        const index = buttons.indexOf(document.activeElement as HTMLButtonElement);
        event.preventDefault(); event.stopImmediatePropagation();
        buttons[(index + (event.shiftKey ? -1 : 1) + buttons.length) % buttons.length]?.focus();
      }
    };
    window.addEventListener('keydown', keydown, true);
    return () => { cancelAnimationFrame(frame); window.removeEventListener('keydown', keydown, true); };
  }, [confirming]);

  async function ask(title: string, text: string, danger = false) {
    if (confirmationBusy.current) return false;
    confirmationBusy.current = true; setConfirming(true);
    const focus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    try {
      const result = await confirmChat({ title, message: text, danger, confirmText: danger ? '删除' : '放弃修改' });
      return alive.current && result;
    } finally {
      confirmationBusy.current = false;
      if (alive.current) { setConfirming(false); requestAnimationFrame(() => focus?.isConnected && focus.focus()); }
    }
  }
  async function back() {
    if (closing || confirmationBusy.current) return;
    if (view === 'entry' && draft && JSON.stringify(draft) !== originalDraft.current &&
        !await ask('返回流水', '这次修改还没有保存，要放弃修改吗？')) return;
    if (!alive.current) return;
    ledger.clearError(); setMessage('');
    if (view !== 'home') { setView('home'); setDraft(null); }
    else { setClosing(true); closingTimer.current = setTimeout(onClose, 380); }
  }
  function navigate(next: View) { ledger.clearError(); setMessage(''); setView(next); }
  function startEntry(entry?: LedgerTransaction) {
    const next: LedgerDraft = entry ? { id: entry.id, type: entry.type, amount: entry.amount.toFixed(ledger.data.currencies.find(c => c.code === entry.currencyCode)!.decimals),
      currencyCode: entry.currencyCode, categoryId: entry.categoryId, note: entry.note, occurredOn: entry.occurredOn } :
      { id: null, type: 'expense', amount: '0', currencyCode: currency.code, categoryId: categories[0].id, note: '', occurredOn: localLedgerDate() };
    originalDraft.current = JSON.stringify(next); setDraft(next); navigate('entry');
  }
  function patchDraft(values: Partial<LedgerDraft>) {
    setDraft(current => current ? { ...current, ...values } : null); setMessage(''); ledger.clearError();
  }
  function changeEntryCurrency(nextCode: string) {
    const nextCurrency = ledger.data.currencies.find(c => c.code === nextCode)!;
    if (draft && parseLedgerAmount(draft.amount, nextCurrency.decimals) === null) {
      patchDraft({ currencyCode: nextCode, amount: '0' }); setMessage('币种精度不同，请重新输入金额。');
    } else patchDraft({ currencyCode: nextCode });
  }
  function saveEntry() {
    if (!draft || !ledger.saveTransaction(draft)) return;
    setCode(draft.currencyCode); setMonth(draft.occurredOn.slice(0, 7)); setDraft(null); setView('home'); setMessage('这笔记录已保存。');
  }
  async function removeEntry(entry: LedgerTransaction) {
    if (await ask('删除记录', `删除 ${entry.occurredOn} 的这笔${entry.type === 'expense' ? '支出' : '收入'}？删除后无法恢复。`, true) && ledger.deleteTransaction(entry.id)) {
      setDraft(null); setView('home'); setMessage('记录已删除。');
    }
  }
  function openBudget() {
    setBudget(String(ledger.data.budgets.find(b => b.currencyCode === currency.code)?.monthlyAmount ?? '')); navigate('budget');
  }
  const title: Record<View, string> = { home: '记账', entry: draft?.id ? '修改记录' : '记一笔', categories: '分类管理', budget: '每月预算', currencies: '币种管理' };

  return createPortal(<section className={closing ? 'ledger-page is-closing' : 'ledger-page'} ref={root} role="dialog" aria-modal="true" aria-labelledby="ledgerTitle" aria-hidden={confirming || closing} inert={confirming || closing}
    onTouchStart={event => event.stopPropagation()} onTouchEnd={event => event.stopPropagation()} onPointerDown={event => event.stopPropagation()} onPointerUp={event => event.stopPropagation()}
    onKeyDown={event => {
      if (confirming || closing) return;
      if (event.key === 'Escape') { event.preventDefault(); event.stopPropagation(); void back(); }
      if (event.key === 'Tab') {
        const elements = Array.from(root.current?.querySelectorAll<HTMLElement>('button:not(:disabled), input:not(:disabled), select:not(:disabled), textarea:not(:disabled)') ?? []).filter(el => el.getClientRects().length);
        const first = elements[0], last = elements.at(-1);
        if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
        else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
      }
    }}>
    <header className="ledger-titlebar">
      <PressedButton className="ledger-back" ref={backButton} type="button" aria-label={view === 'home' ? '返回主页' : '返回记账首页'} onClick={() => void back()}><LedgerToolIcon name="back" /></PressedButton>
      <h1 id="ledgerTitle">{title[view]}<small>.csv</small></h1>
      {view === 'home' && <PressedButton className="ledger-header-action" type="button" disabled={readonly} onClick={() => { setCategoryDraft({ id: null, name: '', icon: 'other' }); navigate('categories'); }}>分类</PressedButton>}
    </header>
    <main className="ledger-content">
      {(ledger.loadError || ledger.error || message) && <div className="ledger-notice" role={ledger.loadError || ledger.error ? 'alert' : 'status'}>{ledger.loadError || ledger.error || message}{(ledger.loadError || ledger.error) && <PressedButton className="ledger-button" type="button" onClick={ledger.reload}>重新读取</PressedButton>}</div>}
      {view === 'home' && <>
        <div className="ledger-filters">
          <div className="ledger-month-control"><PressedButton className="ledger-small-button" type="button" aria-label="上个月" onClick={() => setMonth(shiftLedgerMonth(month, -1))}><LedgerToolIcon name="previous" /></PressedButton><input type="month" aria-label="查看月份" value={month} min="1900-01" max="9999-12" onChange={event => { if (validLedgerMonth(event.target.value)) setMonth(event.target.value); }} /><PressedButton className="ledger-small-button" type="button" aria-label="下个月" onClick={() => setMonth(shiftLedgerMonth(month, 1))}><LedgerToolIcon name="next" /></PressedButton></div>
          <label className="ledger-currency-select"><span className="ledger-sr-only">查看币种</span><select value={currency.code} onChange={event => setCode(event.target.value)}>{ledger.data.currencies.map(c => <option key={c.code} value={c.code}>{c.name} · {c.code}</option>)}</select></label>
        </div>
        <section className="ledger-summary" aria-label="本月汇总"><div className="ledger-summary-label">MONTHLY RECEIPT <span>{currency.code}</span></div><div className="ledger-totals"><div><span>本月支出</span><strong className="ledger-expense">{formatLedgerMoney(summary.expense, currency)}</strong></div><div><span>本月收入</span><strong>{formatLedgerMoney(summary.income, currency)}</strong></div></div>
          <div className="ledger-budget" style={{ color: summary.budgetState === 'warning' || summary.budgetState === 'over' ? 'var(--color-danger)' : 'var(--color-text)' }}><span>预算剩余<strong>{summary.remaining === null ? '未设置' : formatLedgerMoney(summary.remaining, currency)}</strong></span><PressedButton className="ledger-button" type="button" disabled={readonly} onClick={openBudget}>{summary.budget === null ? '设置预算' : '调整预算'}</PressedButton></div>
          {summary.budgetState === 'warning' || summary.budgetState === 'over' ? <p className="ledger-budget-warning" role="status">{summary.budgetState === 'over' ? '本月支出已超出预算。' : '本月预算已使用 80% 或以上。'}</p> : null}
        </section>
        <div className="ledger-home-actions"><PressedButton className="ledger-button ledger-primary" type="button" disabled={readonly} onClick={() => startEntry()}><LedgerToolIcon name="plus" />记一笔</PressedButton><PressedButton className="ledger-button" type="button" disabled={readonly} onClick={() => navigate('currencies')}>管理币种</PressedButton></div>
        <section className="ledger-breakdown"><h2>分类支出<span>{currency.code}</span></h2>{summary.categories.length ? summary.categories.map(item => { const category = ledger.data.categories.find(c => c.id === item.id)!; return <div className="ledger-category-stat" key={item.id}><LedgerCategoryIcon name={category.icon} /><div><span>{category.name}{category.archived ? '（已停用）' : ''}<small>{item.percent.toFixed(1)}%</small></span><div className="ledger-category-bar"><i style={{ width: `${item.percent}%` }} /></div></div><strong>{formatLedgerMoney(item.amount, currency)}</strong></div>; }) : <p className="ledger-muted">这个月还没有支出。</p>}</section>
        <section className="ledger-journal"><h2>本月流水<span>{summary.entries.length} 笔</span></h2>{days.length ? days.map(day => <div className="ledger-day" key={day.date}><div className="ledger-day-heading"><time>{day.date}</time><span>支出 {formatLedgerMoney(day.expense, currency)} · 收入 {formatLedgerMoney(day.income, currency)}</span></div>{day.entries.map(entry => { const category = ledger.data.categories.find(c => c.id === entry.categoryId)!; return <PressedButton key={entry.id} type="button" className="ledger-receipt" onClick={() => startEntry(entry)} aria-label={`${entry.occurredOn} ${category.name} ${entry.type === 'expense' ? '支出' : '收入'} ${entry.amount} ${currency.code}，修改记录`}><ReceiptEdge /><div className="ledger-receipt-body"><LedgerCategoryIcon name={category.icon} /><div className="ledger-receipt-copy"><strong>{category.name}</strong><span>{entry.note || (entry.type === 'expense' ? '支出记录' : '收入记录')}</span></div><div className="ledger-receipt-amount"><strong className={entry.type === 'expense' ? 'ledger-expense' : undefined}>{entry.type === 'expense' ? '−' : '+'}{formatLedgerMoney(entry.amount, currency)}</strong><small>{currency.code}</small></div></div><ReceiptEdge bottom /></PressedButton>; })}</div>) : <div className="ledger-empty"><LedgerCategoryIcon name="other" /><p>这个月的小票还是空的。</p><span>记下一笔，留下生活的小记录。</span></div>}</section>
      </>}
      {view === 'entry' && draft && <>
        <section className="ledger-calculator"><div className="ledger-calculator-label">QINGTUAN CALCULATOR <span>{entryCurrency.code}</span></div><div className="ledger-type-switch">{(['expense', 'income'] as const).map(type => <PressedButton key={type} type="button" className="ledger-button" aria-pressed={draft.type === type} onClick={() => patchDraft({ type })}>{type === 'expense' ? '支出' : '收入'}</PressedButton>)}<select aria-label="记录币种" value={draft.currencyCode} onChange={event => changeEntryCurrency(event.target.value)}>{ledger.data.currencies.map(c => <option key={c.code} value={c.code}>{c.code} · {c.name}</option>)}</select></div>
          <label className="ledger-display"><span>金额 / {entryCurrency.code}</span><input aria-label="金额" inputMode={entryCurrency.decimals ? 'decimal' : 'numeric'} value={draft.amount} onChange={event => { const value = event.target.value; if (!value || /^\d*(?:\.\d*)?$/.test(value)) patchDraft({ amount: value.startsWith('.') ? `0${value}` : value }); }} /></label>
          <div className="ledger-keypad">{['7','8','9','AC','4','5','6','backspace','1','2','3','.','0','00'].map(key => <PressedButton key={key} type="button" className={`ledger-key${key === '0' ? ' ledger-key-zero' : ''}`} aria-label={key === 'backspace' ? '删除最后一位' : key === 'AC' ? '清空金额' : key === '.' ? '小数点' : key} disabled={key === '.' && entryCurrency.decimals === 0} onClick={() => { const value = draft.amount || '0'; patchDraft({ amount: key === '00' ? calculatorInput(calculatorInput(value, '0', entryCurrency.decimals), '0', entryCurrency.decimals) : calculatorInput(value, key, entryCurrency.decimals) }); }}>{key === 'backspace' ? <LedgerToolIcon name="backspace" /> : key}</PressedButton>)}</div>
        </section>
        <section className="ledger-entry-details"><h2>这笔小票</h2><div className="ledger-field-heading"><span>分类</span><PressedButton className="ledger-button" type="button" onClick={async () => { if (JSON.stringify(draft) === originalDraft.current || await ask('管理分类', '这次记账还没有保存，要放弃修改并管理分类吗？')) { if (alive.current) { setDraft(null); navigate('categories'); } } }}>管理</PressedButton></div><div className="ledger-category-grid">{ledger.data.categories.filter(c => !c.archived || c.id === draft.categoryId).map(category => <PressedButton key={category.id} type="button" className="ledger-category-choice" aria-pressed={draft.categoryId === category.id} onClick={() => patchDraft({ categoryId: category.id })}><LedgerCategoryIcon name={category.icon} /><span>{category.name}{category.archived ? '（已停用）' : ''}</span></PressedButton>)}</div><label className="ledger-field"><span>发生日期</span><input type="date" min="1900-01-01" max="9999-12-31" value={draft.occurredOn} onChange={event => patchDraft({ occurredOn: event.target.value })} /></label><label className="ledger-field"><span>备注</span><textarea rows={2} maxLength={500} placeholder="这笔花在哪里？" value={draft.note} onChange={event => patchDraft({ note: event.target.value })} /></label></section>
        <div className="ledger-form-actions">{draft.id && <PressedButton className="ledger-button ledger-danger" type="button" onClick={() => { const entry = ledger.data.transactions.find(e => e.id === draft.id); if (entry) void removeEntry(entry); }}><LedgerToolIcon name="trash" />删除</PressedButton>}<PressedButton className="ledger-button ledger-primary" type="button" disabled={readonly} onClick={saveEntry}>保存这笔</PressedButton></div>
      </>}
      {view === 'categories' && <section className="ledger-manager"><h2>分类管理</h2><p className="ledger-muted">删除分类后，旧流水仍保留原分类。至少保留一个分类。</p><ul className="ledger-management-list">{categories.map(category => <li key={category.id}><LedgerCategoryIcon name={category.icon} /><span>{category.name}</span><PressedButton className="ledger-button" type="button" disabled={readonly} onClick={() => { setCategoryDraft({ id: category.id, name: category.name, icon: category.icon }); ledger.clearError(); }}>修改</PressedButton><PressedButton className="ledger-small-button ledger-danger" type="button" disabled={readonly || categories.length === 1} aria-label={`删除${category.name}分类`} onClick={async () => { if (await ask('删除分类', `删除“${category.name}”分类？旧流水不会删除。`, true) && ledger.deleteCategory(category.id)) { if (categoryDraft.id === category.id) setCategoryDraft({ id: null, name: '', icon: 'other' }); } }}><LedgerToolIcon name="trash" /></PressedButton></li>)}</ul><form className="ledger-manager-form" onSubmit={event => { event.preventDefault(); if (ledger.saveCategory(categoryDraft.id, categoryDraft.name, categoryDraft.icon)) { setCategoryDraft({ id: null, name: '', icon: 'other' }); setMessage('分类已保存。'); } }}><h3>{categoryDraft.id ? '修改分类' : '新增分类'}</h3><label className="ledger-field"><span>名称</span><input maxLength={20} required value={categoryDraft.name} onChange={event => setCategoryDraft({ ...categoryDraft, name: event.target.value })} /></label><div className="ledger-icon-choices" aria-label="分类图标">{LEDGER_ICONS.map((icon, index) => <PressedButton key={icon} className="ledger-icon-choice" type="button" aria-label={`分类图标 ${['吃饭','交通','购物','娱乐','日用','其他'][index]}`} aria-pressed={categoryDraft.icon === icon} onClick={() => setCategoryDraft({ ...categoryDraft, icon })}><LedgerCategoryIcon name={icon} /></PressedButton>)}</div><div className="ledger-form-actions">{categoryDraft.id && <PressedButton type="button" className="ledger-button" onClick={() => setCategoryDraft({ id: null, name: '', icon: 'other' })}>取消修改</PressedButton>}<PressedButton type="submit" className="ledger-button ledger-primary" disabled={readonly}>保存分类</PressedButton></div></form></section>}
      {view === 'budget' && <section className="ledger-manager"><h2>{currency.name}每月预算</h2><p className="ledger-muted">每个币种独立设置；用于每个月的支出提醒，不计入收入，也不换算汇率。</p><form onSubmit={event => { event.preventDefault(); if (ledger.saveBudget(currency.code, budget)) { setView('home'); setMessage('每月预算已保存。'); } }}><label className="ledger-field"><span>金额 · {currency.code}</span><input inputMode={currency.decimals ? 'decimal' : 'numeric'} value={budget} placeholder="留空或填 0 取消预算" onChange={event => setBudget(event.target.value)} /></label><div className="ledger-form-actions"><PressedButton type="submit" className="ledger-button ledger-primary" disabled={readonly}>保存预算</PressedButton></div></form></section>}
      {view === 'currencies' && <section className="ledger-manager"><h2>可用币种</h2><p className="ledger-muted">不同币种分开统计。默认显示记录数量最多的币种，不做汇率换算。</p><ul className="ledger-currencies">{ledger.data.currencies.map(c => <li key={c.code}><strong>{c.code}</strong><span>{c.name}</span><small>{c.decimals} 位小数</small></li>)}</ul><form className="ledger-manager-form" onSubmit={event => { event.preventDefault(); if (ledger.addCurrency(currencyDraft)) { setCurrencyDraft({ code: '', name: '', decimals: 2 }); setMessage('币种已新增，可在首页和记一笔中选择。'); } }}><h3>新增币种</h3><label className="ledger-field"><span>代码</span><input maxLength={3} required placeholder="如 HKD" value={currencyDraft.code} onChange={event => setCurrencyDraft({ ...currencyDraft, code: event.target.value.toUpperCase() })} /></label><label className="ledger-field"><span>名称</span><input maxLength={30} required placeholder="如 港元" value={currencyDraft.name} onChange={event => setCurrencyDraft({ ...currencyDraft, name: event.target.value })} /></label><label className="ledger-field"><span>小数位</span><select value={currencyDraft.decimals} onChange={event => setCurrencyDraft({ ...currencyDraft, decimals: Number(event.target.value) })}>{[0,1,2,3].map(n => <option key={n} value={n}>{n} 位</option>)}</select></label><div className="ledger-form-actions"><PressedButton type="submit" className="ledger-button ledger-primary" disabled={readonly}>新增币种</PressedButton></div></form></section>}
    </main>
    <footer className="ledger-status"><span>{readonly ? '读取失败 · 原存档已保留' : ledger.error ? '尚未保存，请重试' : '本地记账'}</span><span>共 {ledger.data.transactions.length} 笔记录</span></footer>
  </section>, document.body);
}
