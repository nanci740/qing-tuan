import './ChatPhotoViewer.css';
import './ChatPay.css';
import { useEffect, useLayoutEffect, useState, useSyncExternalStore } from 'react';
import { createPortal } from 'react-dom';
import { PressedButton } from './PressedButton';
import { ChatPixelIcon } from './ChatPixelIcon';
import { showToast } from '../../utils/toast';
import { claimPacket, expireWalletPays, luckiest, parseYuan, payRecord, paySources, readWallet, settlePay, subscribeWallet, yuan } from '../../utils/walletStorage';
import type { MessagePay } from '../../types/chatMessages';
import type { ChatCharacter } from '../../types/chatCharacters';
import { remindWallet } from '../../utils/walletRemind';
import { readChatCharacters } from '../../utils/chatCharacterStorage';
import { groupMembers, isGroup, memberName } from '../../utils/chatGroups';
import { contactName } from '../../utils/contactsStorage';

type Bridge = Window & { smallphoneSendChatPay?: (pay: Omit<MessagePay, 'id'>, source?: string) => void; smallphoneGetActiveCharacterProfile?: () => ChatCharacter | null;
  smallphoneChatNotice?: (chatKey: string, text: string) => void };
/** 群聊才用得到：to 转给哪个成员、count 红包几个、split 拼手气或平分。 */
interface Draft { kind: 'transfer' | 'packet'; amount: string; note: string; source: string; to: string; count: string; split: 'lucky' | 'even' }
/** 现在开着的是群聊的话，成员（给你看的名字）。 */
function activeMembers() {
  const active = (window as Bridge).smallphoneGetActiveCharacterProfile?.() || null;
  return isGroup(active) ? groupMembers(active, readChatCharacters()).map(member => ({ key: member.archiveId, name: contactName(member.archiveId, memberName(member)) })) : null;
}

/** 聊天输入框下面的 ¥：给他转账、发红包。钱从余额或选的那张卡扣（他给你的亲属卡也能付给他本人），不够发不出去。
    点聊天里的转账、红包、亲属卡卡片：他发的还没收就可以收下（拆开）或退回，其他的看一下状态。 */
export function ChatPay() {
  const wallet = useSyncExternalStore(subscribeWallet, readWallet);
  const [draft, setDraft] = useState<Draft | null>(null), [viewing, setViewing] = useState('');
  useLayoutEffect(() => {
    const start = (event: Event) => { if ((event as CustomEvent<string>).detail === 'pay') { expireWalletPays(); const members = activeMembers();
      setDraft({ kind: members ? 'packet' : 'transfer', amount: '', note: '', source: '', to: members?.[0]?.key || '', count: String(members?.length || 1), split: 'lucky' }); } };
    const open = (event: Event) => { expireWalletPays(); setViewing(String((event as CustomEvent<{ id: string }>).detail?.id || '')); };
    window.addEventListener('qingtuan:chat-action', start);
    window.addEventListener('qingtuan:chat-pay-open', open);
    return () => { window.removeEventListener('qingtuan:chat-action', start); window.removeEventListener('qingtuan:chat-pay-open', open); };
  }, []);
  // 过了一天没收的自动退回、信用卡逾期手续费、亲属卡换月、还款提醒：开机过一下先看一次，之后开着的时候每分钟看一次
  useEffect(() => {
    const check = () => { expireWalletPays(); remindWallet(); };
    const first = setTimeout(check, 3000), timer = setInterval(check, 60000);
    return () => { clearTimeout(first); clearInterval(timer); };
  }, []);

  const update = (patch: Partial<Draft>) => setDraft(current => current && { ...current, ...patch });
  // wallet 变了（例如转进余额）付款方式要跟着更新，所以每次画都重新算
  const sources = draft ? paySources() : [], picked = sources.find(item => item.id === draft?.source) || sources[0];
  const amount = draft ? parseYuan(draft.amount) : 0, short = !!picked && amount > picked.available;
  const members = draft ? activeMembers() : null, count = Math.min(100, Math.max(1, Math.floor(Number(draft?.count) || 1)));
  function send() {
    if (!draft) return;
    if (!amount) { showToast('先写金额'); return; }
    if (short) { showToast(`${picked?.label || '余额'}不够，换一个付款方式`); return; }
    if (members && draft.kind === 'packet' && amount < count) { showToast('每个红包至少 ¥0.01'); return; }
    if (members && draft.kind === 'transfer' && !draft.to) { showToast('先选转给谁'); return; }
    const extra = !members ? {} : draft.kind === 'packet' ? (count > 1 ? { count, split: draft.split } : {}) : { to: draft.to };
    try { (window as Bridge).smallphoneSendChatPay?.({ kind: draft.kind, amount, note: draft.note.trim().slice(0, 40), ...extra }, picked?.id || ''); setDraft(null); }
    catch (error) { showToast(String((error as Error)?.message || error)); }
  }

  const record = viewing ? payRecord(viewing) : undefined;
  useEffect(() => { if (viewing && !record) { showToast('这笔的记录找不到了'); setViewing(''); } }, [viewing, record]);
  function grab() {
    if (!record) return;
    const got = claimPacket(record.id, 'me', '我');
    if (!got) { showToast(record.state === 'pending' ? '你已经领过了' : '红包已经领完了'); return; }
    showToast(`抢到 ¥${yuan(got.claim.amount)}，存进钱包了`);
    (window as Bridge).smallphoneChatNotice?.(record.chatKey, `你领取了${record.name}的红包${got.full ? '，红包已被领完' : ''}`);
  }
  function settle(action: 'accept' | 'return') {
    if (!record) return;
    if (settlePay(record.id, action)) showToast(action === 'return' ? '已退回' : record.kind === 'family' ? '亲属卡放进钱包了' : `¥${yuan(record.amount)} 已存进钱包`);
    if (record.kind !== 'packet' || action === 'return') setViewing('');
  }

  if (draft) return createPortal(<div className="sp-confirm-overlay chat-photo-viewer chat-pay-send" onClick={event => { if (event.target === event.currentTarget) setDraft(null); }}>
    <div className="sp-confirm" role="dialog" aria-modal="true" aria-label={draft.kind === 'packet' ? '发红包' : '转账'}>
      <div className="sp-confirm-bar"><span className="sp-confirm-title">{draft.kind === 'packet' ? '发红包' : '转账'}</span></div>
      <div className="chat-pay-tabs" role="tablist">
        <button type="button" role="tab" aria-selected={draft.kind === 'transfer'} className={draft.kind === 'transfer' ? 'is-active' : ''} onClick={() => update({ kind: 'transfer' })}>转账</button>
        <button type="button" role="tab" aria-selected={draft.kind === 'packet'} className={draft.kind === 'packet' ? 'is-active' : ''} onClick={() => update({ kind: 'packet' })}>红包</button>
      </div>
      <div className="sp-confirm-body">
        {members && draft.kind === 'transfer' ? <><span className="chat-photo-viewer-label">转给谁</span>
          <div className="chat-pay-to" role="radiogroup" aria-label="转给谁">{members.map(member => <button type="button" role="radio" key={member.key} aria-checked={draft.to === member.key}
            className={draft.to === member.key ? 'is-active' : ''} onClick={() => update({ to: member.key })}>{member.name}</button>)}</div></> : null}
        {members && draft.kind === 'packet' ? <>
          <label className="chat-photo-viewer-label" htmlFor="chatPayCount">红包个数<small>群里 {members.length} 人</small></label>
          <div className="chat-pay-count">
            <input id="chatPayCount" className="chat-photo-viewer-prompt" inputMode="numeric" maxLength={3} value={draft.count} onChange={event => update({ count: event.currentTarget.value.replace(/\D/g, '') })} /><span>个</span>
            <span className="chat-pay-tabs chat-pay-split" role="radiogroup" aria-label="怎么分">
              {([['lucky', '拼手气'], ['even', '平分']] as const).map(([value, label]) => <button type="button" role="radio" key={value} aria-checked={draft.split === value} className={draft.split === value ? 'is-active' : ''} onClick={() => update({ split: value })}>{label}</button>)}
            </span>
          </div>
        </> : null}
        <label className="chat-photo-viewer-label" htmlFor="chatPayAmount">{members && draft.kind === 'packet' ? '总金额' : '金额'}</label>
        <span className={'chat-pay-amount' + (short ? ' is-short' : '')}>¥<input id="chatPayAmount" inputMode="decimal" maxLength={12} placeholder="0.00" value={draft.amount} autoFocus
          onChange={event => update({ amount: event.currentTarget.value.replace(/[^\d.]/g, '') })} /></span>
        <label className="chat-photo-viewer-label" htmlFor="chatPayNote">留言（可以不写）</label>
        <input id="chatPayNote" className="chat-photo-viewer-prompt" maxLength={40} placeholder={draft.kind === 'packet' ? '恭喜发财，大吉大利' : '转账给对方'} value={draft.note} onChange={event => update({ note: event.currentTarget.value })} />
        <span className="chat-photo-viewer-label">付款方式</span>
        <div className="chat-pay-sources" role="radiogroup" aria-label="付款方式">
          {sources.map(item => { const lacking = amount > item.available; return <button type="button" role="radio" key={item.id || 'balance'} aria-checked={item === picked}
            className={'chat-pay-source' + (item === picked ? ' is-active' : '') + (lacking ? ' is-short' : '')} onClick={() => update({ source: item.id })}>
            <span>{item.label}</span><small>{item.id && !item.label.includes('储蓄卡') ? '可用 ' : ''}¥{yuan(item.available)}{lacking ? ' 不够' : ''}</small>
          </button>; })}
        </div>
      </div>
      <div className="sp-confirm-actions">
        <PressedButton type="button" className="sp-confirm-btn" onClick={() => setDraft(null)}>取消</PressedButton>
        <PressedButton type="button" className="sp-confirm-btn is-primary" disabled={!amount || short} onClick={send}>{draft.kind === 'packet' ? '塞钱进红包' : '转账'}</PressedButton>
      </div>
    </div>
  </div>, document.body);

  if (!record) return null;
  // 群红包：谁领了多少、手气最佳，别人发的还没领完、你还没抢就可以抢
  if (record.count) {
    const mine = record.from === 'me', claims = record.claims || [], best = luckiest(record), took = claims.find(claim => claim.key === 'me');
    const sum = claims.reduce((total, claim) => total + claim.amount, 0);
    const status = record.state === 'pending' ? `已领 ${claims.length}/${record.count}，共 ¥${yuan(sum)}；一天内没领完${mine ? '，剩下的退回给你' : '就过期'}` : record.state === 'done' ? `${record.count} 个红包都被领完了` : `过了一天没领完${mine ? `，剩下的 ¥${yuan(record.amount - sum)} 退回给你了` : ''}`;
    return createPortal(<div className="sp-confirm-overlay chat-photo-viewer chat-pay-view" onClick={event => { if (event.target === event.currentTarget) setViewing(''); }}>
      <div className="sp-confirm" role="dialog" aria-modal="true" aria-label="红包">
        <div className="sp-confirm-bar"><span className="sp-confirm-title">红包</span></div>
        <div className="sp-confirm-body chat-pay-detail">
          <span className="chat-pay-detail-icon"><ChatPixelIcon name="packet" /></span>
          <span>{mine ? '我' : record.name}发的{record.split === 'even' ? '' : '拼手气'}红包</span>
          <b>{took ? `¥${yuan(took.amount)}` : mine ? `¥${yuan(record.amount)}` : record.note || '恭喜发财，大吉大利'}</b>
          {took ? <small>你抢到的，存进钱包了</small> : record.note && (mine || took) ? <small>「{record.note}」</small> : null}
          {claims.length ? <div className="chat-pay-claims">{claims.map(claim => <div key={claim.key}><span>{claim.key === 'me' ? '我' : contactName(claim.key, claim.name)}{claim.key === best ? <i>手气最佳</i> : null}</span><span>¥{yuan(claim.amount)}</span></div>)}</div> : null}
          <small>{status}</small>
        </div>
        <div className="sp-confirm-actions">
          {!mine && !took && record.state === 'pending' ? <><PressedButton type="button" className="sp-confirm-btn" onClick={() => setViewing('')}>关闭</PressedButton>
            <PressedButton type="button" className="sp-confirm-btn is-primary" onClick={grab}>抢</PressedButton></>
            : <PressedButton type="button" className="sp-confirm-btn" onClick={() => setViewing('')}>关闭</PressedButton>}
        </div>
      </div>
    </div>, document.body);
  }
  const mine = record.from === 'me', packet = record.kind === 'packet', family = record.kind === 'family', pending = record.state === 'pending', who = record.name || '对方';
  const title = packet ? '红包' : family ? '亲属卡' : '转账';
  // 他发的红包拆开之前看不到金额
  const hidden = packet && !mine && pending;
  const status = family ? (pending ? '收下了就会出现在钱包里，一天内没收会自动退回' : record.state === 'done' ? '已收下，卡在钱包里' : record.expired ? '过了一天没收，已经退回' : '你退回了')
    : pending ? (mine ? `等${who}${packet ? '拆开' : '收款'}` : '一天内没收会自动退回')
    : record.state === 'done' ? (mine ? `${who}已${packet ? '领取' : '收款'}` : packet ? '已拆开，钱在钱包里' : '已收款，钱在钱包里')
    : record.expired ? (mine ? '过了一天没收，钱退回去了' : '过了一天没收，已经退回') : mine ? '对方退回了，钱退回去了' : '你退回了';
  return createPortal(<div className="sp-confirm-overlay chat-photo-viewer chat-pay-view" onClick={event => { if (event.target === event.currentTarget) setViewing(''); }}>
    <div className="sp-confirm" role="dialog" aria-modal="true" aria-label={title}>
      <div className="sp-confirm-bar"><span className="sp-confirm-title">{title}</span></div>
      <div className="sp-confirm-body chat-pay-detail">
        <span className="chat-pay-detail-icon"><ChatPixelIcon name={packet ? 'packet' : family ? 'card' : 'yuan'} /></span>
        <span>{family ? `${who}给你开的亲属卡` : mine ? `${packet ? '发给' : '转账给'}${record.to ? contactName(record.to, who) : who}` : `${record.by ? contactName(record.by, who) : who}${packet ? '的红包' : '转账给你'}`}</span>
        {hidden ? <b className="is-note">{record.note || '恭喜发财，大吉大利'}</b> : <b>{family ? '每月 ' : ''}¥{yuan(record.amount)}</b>}
        {!hidden && record.note ? <small>「{record.note}」</small> : null}
        {mine && record.sourceLabel ? <small>用 {record.sourceLabel} 付的</small> : null}
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
