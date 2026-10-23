import { useEffect, useState, useSyncExternalStore } from 'react';
import { createPortal } from 'react-dom';
import { PressedButton } from '../../../components/shared/PressedButton';
import { ChatPixelIcon } from '../../../components/shared/ChatPixelIcon';
import { showToast } from '../../../utils/toast';
import { confirmChat } from '../../../utils/chatConfirm';
import { readMe } from '../../../utils/meStorage';
import { addCard, cardAvailable, cardLabel, cardNumber, expireWalletPays, moveMoney, parseYuan, readWallet, removeCard, subscribeWallet, yuan, CREDIT_LATE_FEE } from '../../../utils/walletStorage';
import type { PayRecord, WalletCard, WalletMove } from '../../../utils/walletStorage';

type Move = { type: 'in' | 'out'; cardId: string; amount: string };
type AddDraft = { bank: string; kind: 'debit' | 'credit'; last4: string };
const monthOf = (at: number) => { const date = new Date(at); return date.getFullYear() * 12 + date.getMonth(); };
function when(at: number) {
  const date = new Date(at), today = new Date(), time = date.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit', hour12: false });
  const days = Math.round((new Date(today.toDateString()).getTime() - new Date(date.toDateString()).getTime()) / 86400000);
  return days === 0 ? '今天 ' + time : days === 1 ? '昨天 ' + time : `${date.getMonth() + 1}/${date.getDate()} ${time}`;
}
const day = (at: number) => { const date = new Date(at); return `${date.getFullYear()}/${date.getMonth() + 1}/${date.getDate()}`; };
const kindName = (card: WalletCard) => card.kind === 'credit' ? '信用卡' : card.kind === 'family' ? '亲属卡' : '储蓄卡';
/** 账单一行：转账、红包、亲属卡（PayRecord）和余额跟卡之间搬钱（WalletMove）放在一起排。in 表示算收入那一边。 */
type Bill = { id: string; at: number; in: boolean; icon: 'yuan' | 'packet' | 'card'; title: string; sub: string; amount: string; crossed: boolean; note: string };
function payBill(record: PayRecord): Bill {
  const packet = record.kind === 'packet', name = record.name || '对方', peer = record.from === 'peer';
  const base = { id: record.id, at: record.at, in: peer, icon: packet ? 'packet' : record.kind === 'family' ? 'card' : 'yuan', crossed: false,
    sub: [when(record.at), record.note, record.sourceLabel].filter(Boolean).join(' · ') } as const;
  if (record.kind === 'family') return { ...base, title: `${name}给你开的亲属卡`, amount: '每月 ' + yuan(record.amount), crossed: record.state === 'returned',
    note: record.state === 'pending' ? '还没收' : record.state === 'done' ? '已收下' : record.expired ? '已过期' : '你退回了' };
  const title = peer ? `${name}的${packet ? '红包' : '转账'}` : packet ? `给${name}的红包` : `转账给${name}`;
  if (record.state === 'returned') return { ...base, title, amount: yuan(record.amount), crossed: true, note: record.expired ? (peer ? '已过期' : '过期退回') : peer ? '你退回了' : '已退回' };
  if (peer) return record.state === 'done' ? { ...base, title, amount: '+' + yuan(record.amount), note: '' } : { ...base, title, amount: packet ? '¥?' : yuan(record.amount), note: packet ? '还没拆' : '还没收' };
  return { ...base, title, amount: '-' + yuan(record.amount), note: record.state === 'pending' ? (packet ? '等对方拆' : '等对方收') : packet ? '已领取' : '已收款' };
}
function moveBill(move: WalletMove): Bill {
  const base = { id: move.id, at: move.at, icon: 'card' as const, crossed: false, sub: when(move.at) };
  if (move.type === 'fee') return { ...base, in: false, title: `${move.label} 逾期手续费`, amount: '-' + yuan(move.amount), note: '记在信用卡' };
  if (move.type === 'in') return { ...base, in: true, title: `从 ${move.label} 转入`, amount: '+' + yuan(move.amount), note: move.credit ? '信用卡预借' : '' };
  return { ...base, in: false, title: move.credit ? `还款 ${move.label}` : `提现到 ${move.label}`, amount: '-' + yuan(move.amount), note: '' };
}

/** 卡面：不写钱。上面银行和卡种，左边中间芯片，左下完整卡号，右下持卡人（亲属卡写谁开的）。 */
function CardFace({ card, holder, active, onPick }: { card: WalletCard; holder: string; active: boolean; onPick: () => void }) {
  return <button type="button" className={`chat-me-card is-${card.kind}` + (active ? ' is-active' : '')} aria-pressed={active} onClick={onPick}>
    <span className="chat-me-card-top"><b>{card.kind === 'family' ? `${card.owner || '对方'}的亲属卡` : card.bank}</b><em>{kindName(card)}</em></span>
    <span className="chat-me-card-chip" aria-hidden="true" />
    <span className="chat-me-card-bottom">
      <span className="chat-me-card-no">{cardNumber(card)}</span>
      <span className="chat-me-card-name"><small>{card.kind === 'family' ? 'FROM' : 'HOLDER'}</small>{card.kind === 'family' ? card.owner || '对方' : holder}</span>
    </span>
  </button>;
}

/** 「我」→ 钱包：上面余额（转入、提现），中间一排银行卡和亲属卡（点一张看详情），下面按月份排的账单。所有角色共用一个钱包。 */
export function MeWallet() {
  const wallet = useSyncExternalStore(subscribeWallet, readWallet);
  const [filter, setFilter] = useState<'all' | 'in' | 'out'>('all'), [picked, setPicked] = useState('');
  const [move, setMove] = useState<Move | null>(null), [adding, setAdding] = useState<AddDraft | null>(null);
  useEffect(() => { expireWalletPays(); }, []);
  const holder = readMe().name || '我';
  const card = wallet.cards.find(item => item.id === picked) || wallet.cards[0];
  const now = monthOf(Date.now()), thisMonth = wallet.records.filter(record => monthOf(record.at) === now && record.kind !== 'family');
  const income = thisMonth.filter(record => record.from === 'peer' && record.state === 'done').reduce((sum, record) => sum + record.amount, 0);
  const spent = thisMonth.filter(record => record.from === 'me' && record.state !== 'returned').reduce((sum, record) => sum + record.amount, 0);
  const months: { label: string; bills: Bill[] }[] = [];
  for (const bill of [...wallet.records.map(payBill), ...wallet.moves.map(moveBill)].filter(bill => filter === 'all' || (filter === 'in') === bill.in).sort((a, b) => b.at - a.at)) {
    const date = new Date(bill.at), label = date.getFullYear() === new Date().getFullYear() ? `${date.getMonth() + 1} 月` : `${date.getFullYear()} 年 ${date.getMonth() + 1} 月`;
    if (months.at(-1)?.label !== label) months.push({ label, bills: [] });
    months.at(-1)!.bills.push(bill);
  }
  // 转入、提现能选的卡：亲属卡不能搬；提现到信用卡就是还款，只有欠钱的信用卡才列出来
  const movable = (type: 'in' | 'out') => wallet.cards.filter(item => item.kind === 'debit' || item.kind === 'credit' && (type === 'in' || item.used > 0));
  function openMove(type: 'in' | 'out', cardId = '') {
    const list = movable(type);
    if (!list.length) { showToast(type === 'in' ? '先新增一张银行卡' : wallet.cards.length ? '没有能转过去的卡' : '先新增一张银行卡'); return; }
    setMove({ type, cardId: cardId || list[0].id, amount: '' });
  }
  function saveMove() {
    if (!move) return;
    const amount = parseYuan(move.amount);
    if (!amount) { showToast('先写金额'); return; }
    try { moveMoney(move.cardId, move.type, amount); setMove(null); } catch (error) { showToast(String((error as Error)?.message || error)); }
  }
  function saveCard() {
    if (!adding) return;
    if (!adding.bank.trim()) { showToast('先写银行名字'); return; }
    const added = addCard(adding.bank, adding.kind, adding.last4);
    setPicked(added.id); setAdding(null);
  }
  async function dropCard(target: WalletCard) {
    const message = target.kind === 'family' ? `「${cardLabel(target)}」会退回去，之后要用得再跟他要。` : target.kind === 'debit' && target.balance ? `卡里还有 ¥${yuan(target.balance)}，删掉就没了。` : `「${cardLabel(target)}」会从钱包拿掉。`;
    if (!await confirmChat({ title: target.kind === 'family' ? '退回这张卡？' : '删除这张卡？', message, confirmText: target.kind === 'family' ? '退回' : '删除', danger: true })) return;
    try { removeCard(target.id); } catch (error) { showToast(String((error as Error)?.message || error)); }
  }

  const moveCard = move ? wallet.cards.find(item => item.id === move.cardId) : undefined;
  return <div className="chat-me-wallet">
    <div className="chat-me-wallet-card">
      <small>余额（元）</small>
      <b><i>¥</i>{yuan(wallet.balance)}</b>
      <div className="chat-me-wallet-sum">
        <span>本月收入<em>+{yuan(income)}</em></span><span>本月支出<em>-{yuan(spent)}</em></span>
        <span className="chat-me-wallet-ops"><button type="button" className="chat-me-st-btn" onClick={() => openMove('in')}>↓ 转入</button><button type="button" className="chat-me-st-btn" onClick={() => openMove('out')}>↑ 提现</button></span>
      </div>
    </div>

    <div className="chat-me-wallet-head">银行卡<button type="button" className="chat-me-st-btn" onClick={() => setAdding({ bank: '', kind: 'debit', last4: '' })}>＋ 新增卡</button></div>
    {wallet.cards.length ? <div className="chat-me-cards-row">{wallet.cards.map(item => <CardFace key={item.id} card={item} holder={holder} active={item === card} onPick={() => setPicked(item.id)} />)}</div>
      : <p className="chat-me-note">还没有卡。按「新增卡」加一张，新卡里先放 ¥5,200（信用卡就是额度 5,200）。亲属卡要在聊天里跟他要。</p>}
    {card ? <div className="chat-me-card-detail">
      {card.kind === 'debit' ? <>
        <small>{cardLabel(card)} · 余额</small><b>¥{yuan(card.balance)}</b>
        <span className="chat-me-card-kv"><span>卡号</span><span>{cardNumber(card)}</span></span>
        <span className="chat-me-card-kv"><span>持卡人</span><span>{holder}</span></span>
        <span className="chat-me-wallet-ops"><button type="button" className="chat-me-st-btn" onClick={() => openMove('in', card.id)}>↓ 转进余额</button><button type="button" className="chat-me-st-btn" onClick={() => openMove('out', card.id)}>↑ 从余额转入</button><button type="button" className="chat-me-st-btn is-danger" onClick={() => dropCard(card)}>删除</button></span>
      </> : card.kind === 'credit' ? <>
        <small>{cardLabel(card)} · 可用额度</small><b>¥{yuan(cardAvailable(card))}</b>
        <span className="chat-me-card-bar"><i style={{ width: `${Math.min(100, card.limit ? card.used / card.limit * 100 : 0)}%` }} /></span>
        <span className="chat-me-card-kv"><span>额度</span><span>¥{yuan(card.limit)}</span></span>
        <span className="chat-me-card-kv"><span>欠款</span><span>¥{yuan(card.used)}</span></span>
        <span className="chat-me-card-kv"><span>还款期限</span><span className={card.due && card.due < Date.now() + 3 * 86400000 ? 'is-warn' : ''}>{card.used && card.due ? day(card.due) + (card.due <= Date.now() ? ` 已逾期 ${Math.floor((Date.now() - card.due) / 86400000) + 1} 天` : ' 前') : '没有欠款'}</span></span>
        <small>过了期限没还清，每天多收 ¥{yuan(CREDIT_LATE_FEE)} 手续费，直到还清。</small>
        <span className="chat-me-wallet-ops"><button type="button" className="chat-me-st-btn" onClick={() => card.used ? openMove('out', card.id) : showToast('这张信用卡没有欠款')}>还款</button><button type="button" className="chat-me-st-btn" onClick={() => openMove('in', card.id)}>↓ 预借到余额</button><button type="button" className="chat-me-st-btn is-danger" onClick={() => dropCard(card)}>删除</button></span>
      </> : <>
        <small>{cardLabel(card)} · 本月还能用</small><b>¥{yuan(cardAvailable(card))}</b>
        <span className="chat-me-card-bar"><i style={{ width: `${Math.min(100, card.limit ? (card.limit - cardAvailable(card)) / card.limit * 100 : 0)}%` }} /></span>
        <span className="chat-me-card-kv"><span>每月额度</span><span>¥{yuan(card.limit)}</span></span>
        <span className="chat-me-card-kv"><span>本月已用</span><span>¥{yuan(card.limit - cardAvailable(card))}</span></span>
        <span className="chat-me-card-kv"><span>开卡人</span><span>{card.owner || '对方'}</span></span>
        <span className="chat-me-card-kv"><span>额度重置</span><span>每月 1 号</span></span>
        <small>转账、发红包时可以选这张卡付，付给开卡的本人也可以。</small>
        <span className="chat-me-wallet-ops"><button type="button" className="chat-me-st-btn is-danger" onClick={() => dropCard(card)}>退回这张卡</button></span>
      </>}
    </div> : null}

    <div className="chat-me-wallet-head">账单
      <span className="chat-me-wallet-filter" role="tablist">
        {([['all', '全部'], ['in', '收入'], ['out', '支出']] as const).map(([value, label]) => <button type="button" role="tab" key={value} aria-selected={filter === value} className={filter === value ? 'is-active' : ''} onClick={() => setFilter(value)}>{label}</button>)}
      </span>
    </div>
    {months.length ? months.map(month => <div key={month.label}>
      <div className="chat-me-wallet-month">{month.label}</div>
      <div className="chat-me-wallet-list">
        {month.bills.map(bill => <div className="chat-me-wallet-row" key={bill.id}>
          <span className={'chat-me-wallet-icon ' + (bill.in ? 'is-in' : 'is-out')} title={bill.in ? '进来的' : '出去的'}>
            <ChatPixelIcon name={bill.icon} /><i><ChatPixelIcon name={bill.in ? 'arrowIn' : 'arrowOut'} /></i>
          </span>
          <span className="chat-me-wallet-text"><b>{bill.title}</b><small>{bill.sub}</small></span>
          <span className={'chat-me-wallet-num' + (bill.amount.startsWith('+') ? ' is-in' : '')}>{bill.crossed ? <s>{bill.amount}</s> : bill.amount}{bill.note ? <em>{bill.note}</em> : null}</span>
        </div>)}
      </div>
    </div>) : <p className="chat-me-note">{filter === 'all' ? '还没有账单。在聊天里点输入框下面的 ¥ 给他转账、发红包，他给你的也会记在这里。' : filter === 'in' ? '还没有收入。' : '还没有支出。'}</p>}

    {move ? createPortal(<div className="sp-confirm-overlay chat-me-dialog" onClick={event => { if (event.target === event.currentTarget) setMove(null); }}>
      <div className="sp-confirm" role="dialog" aria-modal="true" aria-label={move.type === 'in' ? '转入余额' : '从余额转出'}>
        <div className="sp-confirm-bar"><span className="sp-confirm-title">{move.type === 'in' ? '转入余额' : moveCard?.kind === 'credit' ? '还信用卡' : '提现'}</span></div>
        <div className="sp-confirm-body chat-me-form">
          <label>{move.type === 'in' ? '从哪张卡转' : '转到哪张卡'}</label>
          <div className="chat-me-card-pick" role="radiogroup">
            {movable(move.type).map(item => <button type="button" role="radio" key={item.id} aria-checked={item.id === move.cardId} className={item.id === move.cardId ? 'is-active' : ''} onClick={() => setMove({ ...move, cardId: item.id })}>
              <span>{cardLabel(item)}</span><small>{item.kind === 'credit' ? (move.type === 'in' ? `可用 ¥${yuan(cardAvailable(item))}` : `欠 ¥${yuan(item.used)}`) : `¥${yuan(item.balance)}`}</small>
            </button>)}
          </div>
          <label htmlFor="meWalletMove">金额<small>余额 ¥{yuan(wallet.balance)}</small></label>
          <input id="meWalletMove" inputMode="decimal" maxLength={12} value={move.amount} autoFocus placeholder="0.00" onChange={event => setMove({ ...move, amount: event.currentTarget.value.replace(/[^\d.]/g, '') })} />
        </div>
        <div className="sp-confirm-actions chat-me-form-actions">
          <PressedButton type="button" className="sp-confirm-btn" onClick={() => setMove(null)}>取消</PressedButton>
          <PressedButton type="button" className="sp-confirm-btn is-primary" onClick={saveMove}>{move.type === 'in' ? '转入' : moveCard?.kind === 'credit' ? '还款' : '提现'}</PressedButton>
        </div>
      </div>
    </div>, document.body) : null}

    {adding ? createPortal(<div className="sp-confirm-overlay chat-me-dialog" onClick={event => { if (event.target === event.currentTarget) setAdding(null); }}>
      <div className="sp-confirm" role="dialog" aria-modal="true" aria-label="新增银行卡">
        <div className="sp-confirm-bar"><span className="sp-confirm-title">新增银行卡</span></div>
        <div className="chat-me-st-tabs">
          <button type="button" className={adding.kind === 'debit' ? 'is-active' : ''} onClick={() => setAdding({ ...adding, kind: 'debit' })}>储蓄卡</button>
          <button type="button" className={adding.kind === 'credit' ? 'is-active' : ''} onClick={() => setAdding({ ...adding, kind: 'credit' })}>信用卡</button>
        </div>
        <div className="sp-confirm-body chat-me-form">
          <label htmlFor="meCardBank">银行名字</label>
          <input id="meCardBank" maxLength={20} placeholder="例如：招商银行" value={adding.bank} autoFocus onChange={event => setAdding({ ...adding, bank: event.currentTarget.value })} />
          <label htmlFor="meCardLast4">卡号后四位<small>不填就随机</small></label>
          <input id="meCardLast4" inputMode="numeric" maxLength={4} placeholder="例如：7735" value={adding.last4} onChange={event => setAdding({ ...adding, last4: event.currentTarget.value.replace(/\D/g, '') })} />
          <p className="chat-me-note">{adding.kind === 'debit' ? '新卡里先放 ¥5,200。' : '额度 ¥5,200。用了以后 30 天内要还清，过了期限每天多收 ¥10 手续费，直到还清。'}</p>
        </div>
        <div className="sp-confirm-actions chat-me-form-actions">
          <PressedButton type="button" className="sp-confirm-btn" onClick={() => setAdding(null)}>取消</PressedButton>
          <PressedButton type="button" className="sp-confirm-btn is-primary" onClick={saveCard}>新增</PressedButton>
        </div>
      </div>
    </div>, document.body) : null}
  </div>;
}
