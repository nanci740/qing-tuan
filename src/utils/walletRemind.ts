import { kv } from './kvStorage';
import { inQuietHours, readMeSettings } from './meSettingsStorage';
import { cardLabel, readWallet, yuan, CREDIT_LATE_FEE } from './walletStorage';

/** 信用卡还款提醒：快到期那几天、逾期之后，每张卡每天弹一次横幅；钱包分页亮小红点，进钱包看过才熄。 */
const KEY = 'qingtuan_wallet_remind_v1', EVENT = 'qingtuan:wallet-remind-changed';
interface State { sent: Record<string, string>; dot: boolean }
function read(): State {
  try { const saved = JSON.parse(kv.getItem(KEY) || '{}'); return { sent: saved?.sent && typeof saved.sent === 'object' ? saved.sent : {}, dot: saved?.dot === true }; }
  catch { return { sent: {}, dot: false }; }
}
function write(state: State) { kv.setItem(KEY, JSON.stringify(state)); window.dispatchEvent(new CustomEvent(EVENT)); }
export function walletDot() { return read().dot; }
export function clearWalletDot() { const state = read(); if (state.dot) write({ ...state, dot: false }); }
export function subscribeWalletDot(listener: () => void) {
  window.addEventListener(EVENT, listener);
  return () => window.removeEventListener(EVENT, listener);
}
const ICON = 'data:image/svg+xml,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" shape-rendering="crispEdges"><rect width="24" height="24" fill="#eef6f7"/><path transform="translate(2 6)" fill="#6f8587" fill-rule="evenodd" d="M0 0h20v2H0z M0 2h2v2H0z M18 2h2v2h-2z M0 4h20v2H0z M0 6h2v4H0z M18 6h2v4h-2z M4 8h6v2H4z M0 10h20v2H0z"/></svg>');

/** 看一下有没有该提醒的卡：勿扰时间先不发（也不记已发，等勿扰结束再补）；设定成不提醒就什么都不做。 */
export function remindWallet(now = Date.now()) {
  const days = readMeSettings().wallet.remind;
  if (!days || inQuietHours(now)) return;
  const state = read(), today = new Date(now).toDateString();
  let changed = false;
  for (const card of readWallet().cards) {
    if (card.kind !== 'credit' || !card.used || !card.due || state.sent[card.id] === today) continue;
    const left = card.due - now, late = left <= 0;
    if (!late && left > days * 86400000) continue;
    const body = late
      ? `已逾期 ${Math.floor(-left / 86400000) + 1} 天，每天加 ¥${yuan(CREDIT_LATE_FEE)}，现在欠 ¥${yuan(card.used)}`
      : `还有 ${Math.max(1, Math.ceil(left / 86400000))} 天到期，欠 ¥${yuan(card.used)}`;
    window.dispatchEvent(new CustomEvent('qingtuan:system-banner', { detail: { title: cardLabel(card), body, avatar: ICON,
      open: () => window.dispatchEvent(new CustomEvent('qingtuan:open-me-tab', { detail: 'wallet' })) } }));
    state.sent[card.id] = today; state.dot = true; changed = true;
  }
  if (changed) write(state);
}
