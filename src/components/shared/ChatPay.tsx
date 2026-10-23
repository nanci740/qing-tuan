import './ChatPhotoViewer.css';
import './ChatPay.css';
import { useEffect, useLayoutEffect, useState, useSyncExternalStore } from 'react';
import { createPortal } from 'react-dom';
import { PressedButton } from './PressedButton';
import { ChatPixelIcon } from './ChatPixelIcon';
import { showToast } from '../../utils/toast';
import { expireWalletPays, parseYuan, payRecord, readWallet, settlePay, subscribeWallet, yuan } from '../../utils/walletStorage';
import type { MessagePay } from '../../types/chatMessages';

type Bridge = Window & { smallphoneSendChatPay?: (pay: Omit<MessagePay, 'id'>) => void };
interface Draft { kind: MessagePay['kind']; amount: string; note: string }

/** 聊天输入框下面的 ¥：给他转账、发红包。钱从「我 → 钱包」的余额扣，余额不够发不出去。
    点聊天里的转账、红包卡片：他发的还没收就可以收下（拆开）或退回，其他的看一下状态。 */
export function ChatPay() {
  const wallet = useSyncExternalStore(subscribeWallet, readWallet);
  const [draft, setDraft] = useState<Draft | null>(null), [viewing, setViewing] = useState('');
  useLayoutEffect(() => {
    const start = (event: Event) => { if ((event as CustomEvent<string>).detail === 'pay') setDraft({ kind: 'transfer', amount: '', note: '' }); };
    const open = (event: Event) => { expireWalletPays(); setViewing(String((event as CustomEvent<{ id: string }>).detail?.id || '')); };
    window.addEventListener('qingtuan:chat-action', start);
    window.addEventListener('qingtuan:chat-pay-open', open);
    return () => { window.removeEventListener('qingtuan:chat-action', start); window.removeEventListener('qingtuan:chat-pay-open', open); };
  }, []);
  // 过了一天没收的转账、红包自动退回：开着的时候每分钟看一次
  useEffect(() => { const timer = setInterval(() => expireWalletPays(), 60000); return () => clearInterval(timer); }, []);

  const update = (patch: Partial<Draft>) => setDraft(current => current && { ...current, ...patch });
  const amount = draft ? parseYuan(draft.amount) : 0, short = amount > wallet.balance;
  function send() {
    if (!draft) return;
    if (!amount) { showToast('先写金额'); return; }
    if (short) { showToast('余额不够，到「我 → 钱包」改余额'); return; }
    try { (window as Bridge).smallphoneSendChatPay?.({ kind: draft.kind, amount, note: draft.note.trim().slice(0, 40) }); setDraft(null); }
    catch (error) { showToast(String((error as Error)?.message || error)); }
  }

  const record = viewing ? payRecord(viewing) : undefined;
  useEffect(() => { if (viewing && !record) { showToast('这笔转账的记录找不到了'); setViewing(''); } }, [viewing, record]);
  function settle(action: 'accept' | 'return') {
    if (!record) return;
    if (settlePay(record.id, action)) showToast(action === 'return' ? '已退回' : `¥${yuan(record.amount)} 已存进钱包`);
    if (action === 'return' || record.kind === 'transfer') setViewing('');
  }

  if (draft) return createPortal(<div className="sp-confirm-overlay chat-photo-viewer chat-pay-send" onClick={event => { if (event.target === event.currentTarget) setDraft(null); }}>
    <div className="sp-confirm" role="dialog" aria-modal="true" aria-label={draft.kind === 'packet' ? '发红包' : '转账'}>
      <div className="sp-confirm-bar"><span className="sp-confirm-title">{draft.kind === 'packet' ? '发红包' : '转账'}</span></div>
      <div className="chat-pay-tabs" role="tablist">
        <button type="button" role="tab" aria-selected={draft.kind === 'transfer'} className={draft.kind === 'transfer' ? 'is-active' : ''} onClick={() => update({ kind: 'transfer' })}>转账</button>
        <button type="button" role="tab" aria-selected={draft.kind === 'packet'} className={draft.kind === 'packet' ? 'is-active' : ''} onClick={() => update({ kind: 'packet' })}>红包</button>
      </div>
      <div className="sp-confirm-body">
        <label className="chat-photo-viewer-label" htmlFor="chatPayAmount">金额</label>
        <span className={'chat-pay-amount' + (short ? ' is-short' : '')}>¥<input id="chatPayAmount" inputMode="decimal" maxLength={12} placeholder="0.00" value={draft.amount} autoFocus
          onChange={event => update({ amount: event.currentTarget.value.replace(/[^\d.]/g, '') })} /></span>
        <label className="chat-photo-viewer-label" htmlFor="chatPayNote">留言（可以不写）</label>
        <input id="chatPayNote" className="chat-photo-viewer-prompt" maxLength={40} placeholder={draft.kind === 'packet' ? '恭喜发财，大吉大利' : '转账给对方'} value={draft.note} onChange={event => update({ note: event.currentTarget.value })} />
        <small className={'chat-pay-balance' + (short ? ' is-short' : '')}>{short ? '余额不够：' : '余额 '}¥{yuan(wallet.balance)}</small>
      </div>
      <div className="sp-confirm-actions">
        <PressedButton type="button" className="sp-confirm-btn" onClick={() => setDraft(null)}>取消</PressedButton>
        <PressedButton type="button" className="sp-confirm-btn is-primary" disabled={!amount || short} onClick={send}>{draft.kind === 'packet' ? '塞钱进红包' : '转账'}</PressedButton>
      </div>
    </div>
  </div>, document.body);

  if (!record) return null;
  const mine = record.from === 'me', packet = record.kind === 'packet', pending = record.state === 'pending';
  // 他发的红包拆开之前看不到金额
  const hidden = packet && !mine && pending;
  const status = pending ? (mine ? `等${record.name || '对方'}${packet ? '拆开' : '收款'}` : '一天内没收会自动退回')
    : record.state === 'done' ? (mine ? `${record.name || '对方'}已${packet ? '领取' : '收款'}` : packet ? '已拆开，钱在钱包里' : '已收款，钱在钱包里')
    : record.expired ? (mine ? '过了一天没收，钱退回钱包了' : '过了一天没收，已经退回') : mine ? '对方退回了，钱回到钱包' : '你退回了';
  return createPortal(<div className="sp-confirm-overlay chat-photo-viewer chat-pay-view" onClick={event => { if (event.target === event.currentTarget) setViewing(''); }}>
    <div className="sp-confirm" role="dialog" aria-modal="true" aria-label={packet ? '红包' : '转账'}>
      <div className="sp-confirm-bar"><span className="sp-confirm-title">{packet ? '红包' : '转账'}</span></div>
      <div className="sp-confirm-body chat-pay-detail">
        <span className="chat-pay-detail-icon"><ChatPixelIcon name={packet ? 'packet' : 'yuan'} /></span>
        <span>{mine ? `${packet ? '发给' : '转账给'}${record.name || '对方'}` : `${record.name || '对方'}${packet ? '的红包' : '转账给你'}`}</span>
        {hidden ? <b className="is-note">{record.note || '恭喜发财，大吉大利'}</b> : <b>¥{yuan(record.amount)}</b>}
        {!hidden && record.note ? <small>「{record.note}」</small> : null}
        <small>{status}</small>
      </div>
      <div className="sp-confirm-actions">
        {!mine && pending ? <>
          {packet ? <PressedButton type="button" className="sp-confirm-btn" onClick={() => setViewing('')}>关闭</PressedButton>
            : <PressedButton type="button" className="sp-confirm-btn" onClick={() => settle('return')}>退回</PressedButton>}
          <PressedButton type="button" className="sp-confirm-btn is-primary" onClick={() => settle('accept')}>{packet ? '拆开' : '收下'}</PressedButton>
        </> : <PressedButton type="button" className="sp-confirm-btn" onClick={() => setViewing('')}>关闭</PressedButton>}
      </div>
    </div>
  </div>, document.body);
}
