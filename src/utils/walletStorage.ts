import { kv } from './kvStorage';
import type { MessagePay } from '../types/chatMessages';

/** 「我」的钱包：所有角色共用一份。金额一律记「分」（整数），显示时再换成元。
    他那边的钱不算：他转给你、发红包、给你开亲属卡都不扣他的。 */
export type PayKind = MessagePay['kind'];
/** pending 还没收（没拆）；done 收下了（拆开了）；returned 退回了（expired 表示是过了一天自动退的）。 */
export type PayState = 'pending' | 'done' | 'returned';
/** from：me 是你发给他的，peer 是他发给你的。source：你付钱用的是哪张卡，空的是余额；sourceLabel 是当时卡的名字（卡删了账单照样看得懂）。
    亲属卡（kind family）的 amount 是每月额度。 */
export interface PayRecord { id: string; kind: PayKind; from: 'me' | 'peer'; chatKey: string; name: string; amount: number; note: string; at: number; state: PayState; settledAt?: number; expired?: boolean; source?: string; sourceLabel?: string }
/** 卡：debit 储蓄卡（balance 是卡里的钱）、credit 信用卡（limit 额度，used 已用，due 还款期限）、family 他给你的亲属卡（limit 每月额度，used 这个月用了多少，month 是哪个月）。 */
export type CardKind = 'debit' | 'credit' | 'family';
export interface WalletCard { id: string; kind: CardKind; bank: string; last4: string; at: number; balance: number; limit: number; used: number; due?: number; owner?: string; chatKey?: string; month?: string }
/** 余额和卡之间搬钱：in 从卡转进余额、out 从余额转到卡（信用卡就是还款）、fee 信用卡逾期手续费（记在卡上，不动余额）。 */
export interface WalletMove { id: string; type: 'in' | 'out' | 'fee'; cardId: string; label: string; credit: boolean; amount: number; at: number }
export interface Wallet { balance: number; records: PayRecord[]; cards: WalletCard[]; moves: WalletMove[] }

const KEY = 'qingtuan_wallet_v1', EVENT = 'qingtuan:wallet-changed';
/** 转账、红包、亲属卡过了一天没收就退回。 */
export const PAY_EXPIRE_MS = 24 * 60 * 60 * 1000;
/** 新卡里先放的钱（信用卡就是额度）。 */
export const NEW_CARD_AMOUNT = 520000;
/** 信用卡从开始欠钱算起多久要还清；过了没还清就加手续费，再给下一个期限。 */
export const CREDIT_DUE_MS = 30 * 24 * 60 * 60 * 1000;
export const CREDIT_LATE_FEE = 1000;
const text = (value: unknown, max: number) => String(value ?? '').trim().slice(0, max);
const cents = (value: unknown) => Math.max(0, Math.round(Number(value) || 0));
const uid = (prefix: string) => prefix + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
const monthKey = (at = Date.now()) => { const date = new Date(at); return date.getFullYear() + '-' + (date.getMonth() + 1); };

function clean(value: unknown): Wallet {
  const row = value && typeof value === 'object' ? value as Record<string, unknown> : {};
  const list = (key: string) => (Array.isArray(row[key]) ? row[key] as unknown[] : []).filter((item): item is Record<string, unknown> => !!item && typeof item === 'object');
  const records = list('records').flatMap((record): PayRecord[] => {
    const id = text(record.id, 60);
    if (!id) return [];
    const state: PayState = record.state === 'done' || record.state === 'returned' ? record.state : 'pending';
    return [{ id, kind: record.kind === 'packet' || record.kind === 'family' ? record.kind : 'transfer', from: record.from === 'peer' ? 'peer' : 'me', chatKey: text(record.chatKey, 120), name: text(record.name, 40),
      amount: cents(record.amount), note: text(record.note, 40), at: Number(record.at) || 0, state,
      ...(Number(record.settledAt) ? { settledAt: Number(record.settledAt) } : {}), ...(record.expired === true ? { expired: true } : {}),
      ...(text(record.source, 60) ? { source: text(record.source, 60), sourceLabel: text(record.sourceLabel, 60) } : {}) }];
  });
  const cards = list('cards').flatMap((card): WalletCard[] => {
    const id = text(card.id, 60);
    if (!id) return [];
    const kind: CardKind = card.kind === 'credit' || card.kind === 'family' ? card.kind : 'debit';
    return [{ id, kind, bank: text(card.bank, 20) || '银行卡', last4: text(card.last4, 4).replace(/\D/g, '').padStart(4, '0'), at: Number(card.at) || 0,
      balance: cents(card.balance), limit: cents(card.limit), used: cents(card.used), ...(Number(card.due) ? { due: Number(card.due) } : {}),
      ...(kind === 'family' ? { owner: text(card.owner, 40), chatKey: text(card.chatKey, 120), month: text(card.month, 10) } : {}) }];
  });
  const moves = list('moves').flatMap((move): WalletMove[] => {
    const id = text(move.id, 60);
    return id ? [{ id, type: move.type === 'out' || move.type === 'fee' ? move.type : 'in', cardId: text(move.cardId, 60), label: text(move.label, 60), credit: move.credit === true, amount: cents(move.amount), at: Number(move.at) || 0 }] : [];
  });
  return { balance: cents(row.balance), records, cards, moves };
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

/** 卡的名字：招商银行 储蓄卡 7735、小鸟的亲属卡。 */
export function cardLabel(card: WalletCard) {
  return card.kind === 'family' ? `${card.owner || '对方'}的亲属卡` : `${card.bank} ${card.kind === 'credit' ? '信用卡' : '储蓄卡'} ${card.last4}`;
}
/** 这张卡现在还能花多少：储蓄卡是卡里的钱，信用卡、亲属卡是额度减掉用了的（亲属卡换了月份就从头算）。 */
export function cardAvailable(card: WalletCard) {
  if (card.kind === 'debit') return card.balance;
  const used = card.kind === 'family' && card.month !== monthKey() ? 0 : card.used;
  return Math.max(0, card.limit - used);
}
/** 付钱时能选的：余额和各张卡（id 空的是余额）。他给你的亲属卡不能拿来付给他本人。 */
export function paySources(chatKey: string) {
  const wallet = readWallet();
  return [{ id: '', label: '余额', available: wallet.balance },
    ...wallet.cards.filter(card => !(card.kind === 'family' && card.chatKey === chatKey)).map(card => ({ id: card.id, label: cardLabel(card), available: cardAvailable(card) }))];
}

/** 新增一张卡：储蓄卡先放 ¥5,200，信用卡额度 ¥5,200；后四位不填就随机。 */
export function addCard(bank: string, kind: 'debit' | 'credit', last4 = '') {
  const wallet = readWallet(), digits = last4.replace(/\D/g, '').slice(-4) || String(Math.floor(Math.random() * 10000)).padStart(4, '0');
  const card: WalletCard = { id: uid('card-'), kind, bank: bank.trim().slice(0, 20) || '银行卡', last4: digits.padStart(4, '0'), at: Date.now(),
    balance: kind === 'debit' ? NEW_CARD_AMOUNT : 0, limit: kind === 'credit' ? NEW_CARD_AMOUNT : 0, used: 0 };
  write({ ...wallet, cards: [...wallet.cards, card] });
  return card;
}
export function removeCard(id: string) {
  const wallet = readWallet(), card = wallet.cards.find(item => item.id === id);
  if (card?.kind === 'credit' && card.used > 0) throw Error('信用卡还有欠款，还清了才能删');
  write({ ...wallet, cards: wallet.cards.filter(item => item.id !== id) });
}
/** 信用卡用了钱：本来没欠款的话，从现在开始算还款期限。 */
function charge(card: WalletCard, amount: number, now = Date.now()): WalletCard {
  return { ...card, used: card.used + amount, ...(card.used === 0 || !card.due ? { due: now + CREDIT_DUE_MS } : {}) };
}
/** 卡里的钱退回来（信用卡、亲属卡就是把用掉的额度还回去；还清了就没有期限）。 */
function refund(card: WalletCard, amount: number): WalletCard {
  if (card.kind === 'debit') return { ...card, balance: card.balance + amount };
  const used = Math.max(0, card.used - amount);
  return { ...card, used, ...(card.kind === 'credit' && used === 0 ? { due: undefined } : {}) };
}
/** 余额和卡之间搬钱。in：从卡转进余额（信用卡就是预借，会开始算还款期限）；out：从余额转到卡（信用卡就是还款，最多还到不欠）。亲属卡不能搬。 */
export function moveMoney(cardId: string, type: 'in' | 'out', amount: number) {
  const wallet = readWallet(), card = wallet.cards.find(item => item.id === cardId);
  if (!card || card.kind === 'family') throw Error('这张卡不能转');
  if (amount <= 0) throw Error('金额要大于 0');
  let next: WalletCard, balance = wallet.balance;
  if (type === 'in') {
    if (amount > cardAvailable(card)) throw Error(card.kind === 'credit' ? '额度不够' : '卡里的钱不够');
    next = card.kind === 'credit' ? charge(card, amount) : { ...card, balance: card.balance - amount };
    balance += amount;
  } else {
    if (amount > balance) throw Error('余额不够');
    if (card.kind === 'credit' && amount > card.used) throw Error(card.used ? `只欠 ¥${yuan(card.used)}` : '这张信用卡没有欠款');
    next = refund(card, amount);
    balance -= amount;
  }
  write({ ...wallet, balance, cards: wallet.cards.map(item => item.id === cardId ? next : item),
    moves: [{ id: uid('mv-'), type, cardId, label: cardLabel(card), credit: card.kind === 'credit', amount, at: Date.now() }, ...wallet.moves] });
}

/** 你发转账或红包：从余额或选的那张卡扣钱，等他收；不够就丢错。 */
export function sendPay(pay: MessagePay, chatKey: string, name: string, source = '') {
  const wallet = readWallet();
  if (pay.amount <= 0) throw Error('金额要大于 0');
  const card = source ? wallet.cards.find(item => item.id === source) : undefined;
  if (source && (!card || card.kind === 'family' && card.chatKey === chatKey)) throw Error('这张卡不能用');
  const available = card ? cardAvailable(card) : wallet.balance;
  if (pay.amount > available) throw Error(card ? (card.kind === 'debit' ? '卡里的钱不够' : '额度不够') : '余额不够');
  let cards = wallet.cards;
  if (card) {
    const fresh = card.kind === 'family' && card.month !== monthKey() ? { ...card, used: 0, month: monthKey() } : card;
    const next = card.kind === 'debit' ? { ...card, balance: card.balance - pay.amount } : card.kind === 'credit' ? charge(card, pay.amount) : { ...fresh, used: fresh.used + pay.amount };
    cards = cards.map(item => item.id === card.id ? next : item);
  }
  write({ ...wallet, balance: wallet.balance - (card ? 0 : pay.amount), cards,
    records: [{ ...pay, from: 'me', chatKey, name, at: Date.now(), state: 'pending', ...(card ? { source: card.id, sourceLabel: cardLabel(card) } : {}) }, ...wallet.records] });
}
/** 他发来的转账、红包、亲属卡：先记下来，你收了才进余额（亲属卡收了才出现在钱包）。 */
export function receivePay(pay: MessagePay, chatKey: string, name: string) {
  const wallet = readWallet();
  if (wallet.records.some(record => record.id === pay.id)) return;
  write({ ...wallet, records: [{ ...pay, from: 'peer', chatKey, name, at: Date.now(), state: 'pending' }, ...wallet.records] });
}
/** 收下（拆开）或退回一笔还没收的。他收你的、你收他的都走这里；钱跟着进出余额或原本那张卡。 */
export function settlePay(id: string, action: 'accept' | 'return', expired = false) {
  const wallet = readWallet(), record = wallet.records.find(item => item.id === id);
  if (!record || record.state !== 'pending') return false;
  // 红包不能退，只能拆或过期
  if (action === 'return' && record.kind === 'packet' && !expired) return false;
  const state: PayState = action === 'accept' ? 'done' : 'returned';
  let balance = wallet.balance, cards = wallet.cards;
  if (record.from === 'peer' && state === 'done') {
    // 他给的亲属卡：收下就多一张卡；转账、红包进余额
    if (record.kind === 'family') cards = [...cards, { id: 'card-' + record.id, kind: 'family', bank: '亲属卡', last4: String(Math.floor(Math.random() * 10000)).padStart(4, '0'), at: Date.now(),
      balance: 0, limit: record.amount, used: 0, owner: record.name, chatKey: record.chatKey, month: monthKey() }];
    else balance += record.amount;
  }
  if (record.from === 'me' && state === 'returned') {
    const card = record.source ? cards.find(item => item.id === record.source) : undefined;
    if (card) cards = cards.map(item => item.id === card.id ? refund(card, record.amount) : item);
    else balance += record.amount;
  }
  write({ ...wallet, balance, cards,
    records: wallet.records.map(item => item.id === id ? { ...item, state, settledAt: Date.now(), ...(expired ? { expired: true } : {}) } : item) });
  return true;
}
/** 他对你还没收的转账、红包表态：这个聊天里你发的、还没收的全部照办。 */
export function settlePendingFromMe(chatKey: string, action: 'accept' | 'return') {
  return readWallet().records.filter(record => record.from === 'me' && record.chatKey === chatKey && record.state === 'pending')
    .map(record => settlePay(record.id, action)).some(Boolean);
}
/** 定时整理：过了一天还没收的自动退回；信用卡过了还款期限没还清就加 ¥10 手续费，再给下一个期限；亲属卡换月份就从头算。 */
export function expireWalletPays(now = Date.now()) {
  for (const record of readWallet().records) if (record.state === 'pending' && now - record.at >= PAY_EXPIRE_MS) settlePay(record.id, 'return', true);
  const wallet = readWallet(), moves: WalletMove[] = [];
  const cards = wallet.cards.map(card => {
    if (card.kind === 'family' && card.month !== monthKey(now)) return { ...card, used: 0, month: monthKey(now) };
    if (card.kind !== 'credit' || !card.used || !card.due || card.due > now) return card;
    let next = card;
    while (next.due && next.due <= now) {
      moves.push({ id: uid('mv-'), type: 'fee', cardId: card.id, label: cardLabel(card), credit: true, amount: CREDIT_LATE_FEE, at: next.due });
      next = { ...next, used: next.used + CREDIT_LATE_FEE, due: next.due + CREDIT_DUE_MS };
    }
    return next;
  });
  if (moves.length || cards.some((card, index) => card !== wallet.cards[index])) write({ ...wallet, cards, moves: [...moves, ...wallet.moves] });
}
/** 他给你开的亲属卡，写给他看：额度多少、这个月你用了多少。没有就是空字符串。 */
export function familyCardText(chatKey: string) {
  const card = readWallet().cards.find(item => item.kind === 'family' && item.chatKey === chatKey);
  if (!card) return '';
  const used = card.month === monthKey() ? card.used : 0;
  return `你之前给对方开了一张亲属卡，每月额度 ¥${yuan(card.limit)}，这个月对方已经用了 ¥${yuan(used)}（用你的亲属卡付给别人的钱）。`;
}
export function initializeWallet() {
  try { expireWalletPays(); } catch { /* 钱包读不到也不挡开机 */ }
  return '';
}
