import { kv } from './kvStorage';
import type { MessagePay } from '../types/chatMessages';

/** 「我」的钱包：所有角色共用一份。金额一律记「分」（整数），显示时再换成元。
    他那边的钱不算：他转给你、发红包都不扣他的。 */
export type PayKind = MessagePay['kind'];
/** pending 还没收（没拆）；done 收下了（拆开了）；returned 退回了（expired 表示是过了一天自动退的）。 */
export type PayState = 'pending' | 'done' | 'returned';
/** from：me 是你发给他的，peer 是他发给你的。 */
export interface PayRecord { id: string; kind: PayKind; from: 'me' | 'peer'; chatKey: string; name: string; amount: number; note: string; at: number; state: PayState; settledAt?: number; expired?: boolean }
export interface Wallet { balance: number; records: PayRecord[] }

const KEY = 'qingtuan_wallet_v1', EVENT = 'qingtuan:wallet-changed';
/** 转账、红包过了一天没收就退回。 */
export const PAY_EXPIRE_MS = 24 * 60 * 60 * 1000;
const text = (value: unknown, max: number) => String(value ?? '').trim().slice(0, max);
const cents = (value: unknown) => Math.max(0, Math.round(Number(value) || 0));

function clean(value: unknown): Wallet {
  const row = value && typeof value === 'object' ? value as Record<string, unknown> : {};
  const records = (Array.isArray(row.records) ? row.records : []).flatMap((item): PayRecord[] => {
    if (!item || typeof item !== 'object') return [];
    const record = item as Record<string, unknown>, id = text(record.id, 60);
    if (!id) return [];
    const state: PayState = record.state === 'done' || record.state === 'returned' ? record.state : 'pending';
    return [{ id, kind: record.kind === 'packet' ? 'packet' : 'transfer', from: record.from === 'peer' ? 'peer' : 'me', chatKey: text(record.chatKey, 120), name: text(record.name, 40),
      amount: cents(record.amount), note: text(record.note, 40), at: Number(record.at) || 0, state,
      ...(Number(record.settledAt) ? { settledAt: Number(record.settledAt) } : {}), ...(record.expired === true ? { expired: true } : {}) }];
  });
  return { balance: cents(row.balance), records };
}

let cache: Wallet | null = null;
export function readWallet(): Wallet {
  if (!cache) { try { cache = clean(JSON.parse(kv.getItem(KEY) || '{}')); } catch { cache = clean({}); } }
  return cache;
}
function write(next: Wallet) {
  cache = clean(next);
  kv.setItem(KEY, JSON.stringify(cache));
  window.dispatchEvent(new CustomEvent(EVENT));
}
export function subscribeWallet(listener: () => void) {
  window.addEventListener(EVENT, listener);
  return () => window.removeEventListener(EVENT, listener);
}
export function setBalance(amount: number) { write({ ...readWallet(), balance: cents(amount) }); }
export function payRecord(id: string) { return readWallet().records.find(record => record.id === id); }

/** 元的字串（可以带逗号、¥）换成分；看不懂或不是正数就是 0。 */
export function parseYuan(value: string) {
  const plain = String(value).replace(/[¥￥,，\s元]/g, '');
  if (!/^\d+(\.\d{0,2})?$/.test(plain)) return 0;
  return Math.round(Number(plain) * 100);
}
/** 分换成「5,200.00」。 */
export function yuan(amount: number) {
  return (cents(amount) / 100).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

/** 你发转账或红包：钱先从余额扣掉，等他收；余额不够就丢错。 */
export function sendPay(pay: MessagePay, chatKey: string, name: string) {
  const wallet = readWallet();
  if (pay.amount <= 0) throw Error('金额要大于 0');
  if (pay.amount > wallet.balance) throw Error('余额不够');
  write({ balance: wallet.balance - pay.amount, records: [{ ...pay, from: 'me', chatKey, name, at: Date.now(), state: 'pending' }, ...wallet.records] });
}
/** 他发来的转账或红包：先记下来，你收了才进余额。 */
export function receivePay(pay: MessagePay, chatKey: string, name: string) {
  const wallet = readWallet();
  if (wallet.records.some(record => record.id === pay.id)) return;
  write({ ...wallet, records: [{ ...pay, from: 'peer', chatKey, name, at: Date.now(), state: 'pending' }, ...wallet.records] });
}
/** 收下（拆开）或退回一笔还没收的。他收你的、你收他的都走这里；钱跟着进出余额。 */
export function settlePay(id: string, action: 'accept' | 'return', expired = false) {
  const wallet = readWallet(), record = wallet.records.find(item => item.id === id);
  if (!record || record.state !== 'pending') return false;
  // 红包不能退，只能拆或过期
  if (action === 'return' && record.kind === 'packet' && !expired) return false;
  const state: PayState = action === 'accept' ? 'done' : 'returned';
  const back = record.from === 'me' ? state === 'returned' : state === 'done';
  write({ balance: wallet.balance + (back ? record.amount : 0),
    records: wallet.records.map(item => item.id === id ? { ...item, state, settledAt: Date.now(), ...(expired ? { expired: true } : {}) } : item) });
  return true;
}
/** 他对你还没收的转账、红包表态：这个聊天里你发的、还没收的全部照办。 */
export function settlePendingFromMe(chatKey: string, action: 'accept' | 'return') {
  return readWallet().records.filter(record => record.from === 'me' && record.chatKey === chatKey && record.state === 'pending')
    .map(record => settlePay(record.id, action)).some(Boolean);
}
/** 过了一天还没收的自动退回：你发的退回你的余额，他发的就作废。 */
export function expireWalletPays(now = Date.now()) {
  for (const record of readWallet().records) if (record.state === 'pending' && now - record.at >= PAY_EXPIRE_MS) settlePay(record.id, 'return', true);
}
export function initializeWallet() {
  try { expireWalletPays(); } catch { /* 钱包读不到也不挡开机 */ }
  return '';
}
