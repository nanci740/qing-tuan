import { useEffect, useState, useSyncExternalStore } from 'react';
import { createPortal } from 'react-dom';
import { PressedButton } from '../../../components/shared/PressedButton';
import { ChatPixelIcon } from '../../../components/shared/ChatPixelIcon';
import { showToast } from '../../../utils/toast';
import { expireWalletPays, parseYuan, readWallet, setBalance, subscribeWallet, yuan } from '../../../utils/walletStorage';
import type { PayRecord } from '../../../utils/walletStorage';

const monthOf = (at: number) => { const date = new Date(at); return date.getFullYear() * 12 + date.getMonth(); };
function when(at: number) {
  const date = new Date(at), today = new Date(), time = date.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit', hour12: false });
  const days = Math.round((new Date(today.toDateString()).getTime() - new Date(date.toDateString()).getTime()) / 86400000);
  return days === 0 ? '今天 ' + time : days === 1 ? '昨天 ' + time : `${date.getMonth() + 1}/${date.getDate()} ${time}`;
}
/** 账单一笔：标题、金额、金额底下的小字。退回的金额画删除线，不算进收支。 */
function describe(record: PayRecord) {
  const packet = record.kind === 'packet', name = record.name || '对方';
  const title = record.from === 'peer' ? `${name}的${packet ? '红包' : '转账'}` : packet ? `给${name}的红包` : `转账给${name}`;
  if (record.state === 'returned') return { title, sign: '', crossed: true, note: record.expired ? (record.from === 'me' ? '过期退回' : '已过期') : record.from === 'me' ? '已退回' : '你退回了' };
  if (record.from === 'peer') return record.state === 'done' ? { title, sign: '+', crossed: false, note: '' } : { title, sign: '', crossed: false, note: packet ? '还没拆' : '还没收' };
  return { title, sign: '-', crossed: false, note: record.state === 'pending' ? (packet ? '等对方拆' : '等对方收') : packet ? '已领取' : '已收款' };
}

/** 「我」→ 钱包：上面余额（可以自己改），本月收入、支出；下面按月份排的账单（转账、红包）。所有角色共用一个钱包。 */
export function MeWallet() {
  const wallet = useSyncExternalStore(subscribeWallet, readWallet);
  const [editing, setEditing] = useState<string | null>(null);
  useEffect(() => { expireWalletPays(); }, []);
  const now = monthOf(Date.now()), thisMonth = wallet.records.filter(record => monthOf(record.at) === now);
  const income = thisMonth.filter(record => record.from === 'peer' && record.state === 'done').reduce((sum, record) => sum + record.amount, 0);
  const spent = thisMonth.filter(record => record.from === 'me' && record.state !== 'returned').reduce((sum, record) => sum + record.amount, 0);
  const months: { label: string; records: PayRecord[] }[] = [];
  for (const record of [...wallet.records].sort((a, b) => b.at - a.at)) {
    const date = new Date(record.at), label = date.getFullYear() === new Date().getFullYear() ? `${date.getMonth() + 1} 月` : `${date.getFullYear()} 年 ${date.getMonth() + 1} 月`;
    if (months.at(-1)?.label !== label) months.push({ label, records: [] });
    months.at(-1)!.records.push(record);
  }
  function save() {
    if (editing === null) return;
    const amount = parseYuan(editing);
    if (!amount && editing.replace(/[\s0.¥]/g, '')) { showToast('金额写不对，例如 13140 或 520.50'); return; }
    setBalance(amount); setEditing(null);
  }

  return <div className="chat-me-wallet">
    <div className="chat-me-wallet-card">
      <small>余额（元）</small>
      <b><i>¥</i>{yuan(wallet.balance)}</b>
      <button type="button" className="chat-me-st-btn" onClick={() => setEditing((wallet.balance / 100).toFixed(2))}>改余额</button>
      <div className="chat-me-wallet-sum"><span>本月收入<em>+{yuan(income)}</em></span><span>本月支出<em>-{yuan(spent)}</em></span></div>
    </div>
    <div className="chat-me-wallet-head">账单</div>
    {months.length ? months.map(month => <div key={month.label}>
      <div className="chat-me-wallet-month">{month.label}</div>
      <div className="chat-me-wallet-list">
        {month.records.map(record => { const info = describe(record); return <div className="chat-me-wallet-row" key={record.id}>
          <span className="chat-me-wallet-icon"><ChatPixelIcon name={record.kind === 'packet' ? 'packet' : 'yuan'} /></span>
          <span className="chat-me-wallet-text"><b>{info.title}</b><small>{when(record.at)}{record.note ? ' · ' + record.note : ''}</small></span>
          <span className={'chat-me-wallet-num' + (info.sign === '+' ? ' is-in' : '')}>{info.crossed ? <s>{yuan(record.amount)}</s> : record.from === 'peer' && record.kind === 'packet' && record.state === 'pending' ? '¥?' : info.sign + yuan(record.amount)}{info.note ? <em>{info.note}</em> : null}</span>
        </div>; })}
      </div>
    </div>) : <p className="chat-me-note">还没有账单。在聊天里点输入框下面的 ¥ 给他转账、发红包，他给你的也会记在这里。</p>}

    {editing !== null ? createPortal(<div className="sp-confirm-overlay chat-me-dialog" onClick={event => { if (event.target === event.currentTarget) setEditing(null); }}>
      <div className="sp-confirm" role="dialog" aria-modal="true" aria-label="改余额">
        <div className="sp-confirm-bar"><span className="sp-confirm-title">改余额</span></div>
        <div className="sp-confirm-body chat-me-form">
          <label htmlFor="meWalletBalance">余额（元）<small>想要多少就写多少</small></label>
          <input id="meWalletBalance" inputMode="decimal" maxLength={14} value={editing} autoFocus onChange={event => setEditing(event.currentTarget.value.replace(/[^\d.]/g, ''))} />
        </div>
        <div className="sp-confirm-actions chat-me-form-actions">
          <PressedButton type="button" className="sp-confirm-btn" onClick={() => setEditing(null)}>取消</PressedButton>
          <PressedButton type="button" className="sp-confirm-btn is-primary" onClick={save}>保存</PressedButton>
        </div>
      </div>
    </div>, document.body) : null}
  </div>;
}
