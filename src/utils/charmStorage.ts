import { kv } from './kvStorage';

/** 他送的手机挂件：
    items 每一件：kind 哪一种（CHARMS 的 key），from 谁送的（私聊的 archiveId），note 他附的一句话，at 什么时候送的，
      hung 现在挂着没有，hungAt 第一次挂上的时间（聊天里的卡片照这个显示「已挂上」），
      change 最近一次摘下或挂回去（seen 他已经注意到了，之后不再提）。
    最多同时挂三件；摘下的留在挂件盒里，随时能挂回去。 */
export interface CharmChange { kind: 'off' | 'on'; at: number; seen?: boolean }
export interface CharmGift { id: string; kind: string; from: string; note: string; at: number; hung: boolean; hungAt?: number; change?: CharmChange }
export type CharmShape = [tag: 'circle' | 'ellipse' | 'path' | 'rect' | 'polygon', attrs: Record<string, string | number>];
export const CHARM_MAX = 3;
const KEY = 'qingtuan_charms_v1', EVENT = 'qingtuan:charms-changed';

const line = (y: number, color = '#d8cfe6'): CharmShape => ['path', { d: `M0 0 L0 ${y}`, stroke: color, 'stroke-width': 1.2, fill: 'none' }];
const shine = (x: number, y: number, r = 1.2): CharmShape => ['circle', { cx: x, cy: y, r, fill: '#fff' }];
const edge = { stroke: '#fff', 'stroke-width': 1.1 };
const star = (cx: number, cy: number, r: number) => Array.from({ length: 10 }, (_, k) => { const a = -Math.PI / 2 + k * Math.PI / 5, rr = k % 2 ? r * .48 : r; return `${(cx + Math.cos(a) * rr).toFixed(1)},${(cy + Math.sin(a) * rr).toFixed(1)}`; }).join(' ');

/** 挂件的样子：挂钩在 (0,0)，往下画，大约 24×26。 */
export const CHARMS: Record<string, { name: string; shapes: CharmShape[] }> = {
  cherry: { name: '樱桃', shapes: [
    ['path', { d: 'M0 0 C-1 5 -4 8 -6 12 M0 0 C1 5 3 8 5 13', stroke: '#6fae5a', 'stroke-width': 1.3, fill: 'none' }],
    ['path', { d: 'M0 0 C3 -2 7 -1 8 2 C5 3 2 2 0 0Z', fill: '#8fd16f', stroke: '#fff', 'stroke-width': .8 }],
    ['circle', { cx: -6, cy: 15, r: 4.6, fill: '#ff6f8f', ...edge }], ['circle', { cx: 5, cy: 16, r: 4.6, fill: '#ff5f84', ...edge }], shine(-7.5, 13.5, 1.3), shine(3.5, 14.5, 1.3)] },
  strawberry: { name: '草莓', shapes: [line(5),
    ['path', { d: 'M0 24 C-8 18 -9 10 -6 7.5 C-3 5.5 3 5.5 6 7.5 C9 10 8 18 0 24Z', fill: '#ff6f8f', ...edge }],
    ['path', { d: 'M-5.5 7.5 L-2.5 4 L0 6.5 L2.5 4 L5.5 7.5 L0 9.5Z', fill: '#7cc96a', ...edge, 'stroke-width': .8 }],
    ['circle', { cx: -3, cy: 12, r: .9, fill: '#ffe08a' }], ['circle', { cx: 3, cy: 12.5, r: .9, fill: '#ffe08a' }], ['circle', { cx: 0, cy: 16, r: .9, fill: '#ffe08a' }], ['circle', { cx: -3.5, cy: 17.5, r: .9, fill: '#ffe08a' }], ['circle', { cx: 3.2, cy: 18, r: .9, fill: '#ffe08a' }]] },
  bear: { name: '小熊', shapes: [line(5),
    ['circle', { cx: -6.5, cy: 7.5, r: 3.4, fill: '#e8c9a8', ...edge }], ['circle', { cx: 6.5, cy: 7.5, r: 3.4, fill: '#e8c9a8', ...edge }],
    ['circle', { cx: 0, cy: 14, r: 8.6, fill: '#f2dcc4', ...edge }], ['circle', { cx: -3.2, cy: 13, r: 1.1, fill: '#5a4a4a' }], ['circle', { cx: 3.2, cy: 13, r: 1.1, fill: '#5a4a4a' }],
    ['ellipse', { cx: 0, cy: 17, rx: 3.2, ry: 2.3, fill: '#fff' }], ['circle', { cx: 0, cy: 16.2, r: .9, fill: '#5a4a4a' }],
    ['circle', { cx: -5.6, cy: 16.5, r: 1.6, fill: '#ffb3cc', opacity: .7 }], ['circle', { cx: 5.6, cy: 16.5, r: 1.6, fill: '#ffb3cc', opacity: .7 }]] },
  star: { name: '星星', shapes: [line(5), ['polygon', { points: star(0, 14.5, 9.5), fill: '#ffe08a', ...edge, 'stroke-linejoin': 'round' }], shine(-2.5, 12, 1.5)] },
  heartlock: { name: '爱心锁', shapes: [
    ['path', { d: 'M-4.2 10 L-4.2 5.5 C-4.2 1.2 4.2 1.2 4.2 5.5 L4.2 10', stroke: '#cfc8e0', 'stroke-width': 2.2, fill: 'none' }],
    ['path', { d: 'M0 25 L-8 17 C-12.5 12 -6.5 5.5 0 10.5 C6.5 5.5 12.5 12 8 17Z', fill: '#ff9cc4', ...edge }],
    ['circle', { cx: 0, cy: 14.5, r: 1.6, fill: '#fff' }], ['rect', { x: -.7, y: 15, width: 1.4, height: 3.6, rx: .6, fill: '#fff' }], shine(-5, 12, 1.2)] },
  fish: { name: '小鱼', shapes: [line(9),
    ['path', { d: 'M6.5 14.5 L12 9.5 L12 19.5Z', fill: '#7fbcf0', ...edge }], ['ellipse', { cx: -1, cy: 14.5, rx: 8.5, ry: 5.6, fill: '#a9d6ff', ...edge }],
    ['circle', { cx: -5, cy: 13.5, r: 1.2, fill: '#3a4a6a' }], ['path', { d: 'M1 11 C3 13 3 16 1 18', stroke: '#fff', 'stroke-width': 1, fill: 'none' }]] },
  bell: { name: '铃铛', shapes: [line(6),
    ['path', { d: 'M-7.5 20 C-7.5 11 -5 6.5 0 6.5 C5 6.5 7.5 11 7.5 20 L8.5 22 L-8.5 22Z', fill: '#ffe08a', ...edge }],
    ['circle', { cx: 0, cy: 23.5, r: 2.1, fill: '#f0c45a', ...edge, 'stroke-width': .8 }], ['path', { d: 'M-6.8 17 L6.8 17', stroke: '#ffd0e3', 'stroke-width': 1.6 }], shine(-3, 10.5, 1.3)] },
  ribbon: { name: '蝴蝶结', shapes: [line(10),
    ['path', { d: 'M-1.5 14 L-6 24 L-3.5 23 L-2 25 L0.5 15Z M1.5 14 L6 24 L3.5 23 L2 25 L-0.5 15Z', fill: '#ffb3d1', ...edge, 'stroke-width': .8 }],
    ['path', { d: 'M0 13 C-4 6 -12 6 -12 12 C-12 18 -4 17 0 14Z M0 13 C4 6 12 6 12 12 C12 18 4 17 0 14Z', fill: '#ffc7de', ...edge }],
    ['rect', { x: -2.6, y: 10.2, width: 5.2, height: 6, rx: 2, fill: '#ff9cc4', ...edge, 'stroke-width': .9 }]] },
  moon: { name: '月亮', shapes: [line(6),
    ['path', { d: 'M3 6.5 A9 9 0 1 0 9 21 A7 7 0 1 1 3 6.5Z', fill: '#fff0a8', ...edge }], ['circle', { cx: -2, cy: 17, r: 1, fill: '#ffb3cc', opacity: .8 }], ['circle', { cx: -3.2, cy: 13.5, r: .8, fill: '#8a7a5a' }]] },
  clover: { name: '幸运草', shapes: [line(6), ['path', { d: 'M0 15 C1 19 2 22 4 25', stroke: '#6fae5a', 'stroke-width': 1.2, fill: 'none' }],
    ...[[0, 10.5], [-4.5, 15], [4.5, 15], [0, 19.5]].map(([x, y]): CharmShape => ['circle', { cx: x, cy: y, r: 4, fill: '#9edb7c', ...edge, 'stroke-width': .9 }]), ['circle', { cx: 0, cy: 15, r: 1.6, fill: '#7cc96a' }]] },
  flower: { name: '小花', shapes: [line(5),
    ...[0, 72, 144, 216, 288].map((deg): CharmShape => ['circle', { cx: +(Math.sin(deg * Math.PI / 180) * 5).toFixed(2), cy: +(14 - Math.cos(deg * Math.PI / 180) * 5).toFixed(2), r: 4, fill: '#ffd6ea', ...edge, 'stroke-width': .9 }]),
    ['circle', { cx: 0, cy: 14, r: 2.8, fill: '#ffe08a', ...edge, 'stroke-width': .9 }]] },
  cat: { name: '小猫', shapes: [line(5),
    ['path', { d: 'M-8 12 L-7 4.5 L-2.5 8 Z M8 12 L7 4.5 L2.5 8 Z', fill: '#fff', stroke: '#e1d8ef', 'stroke-width': 1 }],
    ['circle', { cx: 0, cy: 14.5, r: 8.4, fill: '#fff', stroke: '#e1d8ef', 'stroke-width': 1 }],
    ['path', { d: 'M-6.6 8.5 L-6.2 6.2 L-4.6 7.6Z M6.6 8.5 L6.2 6.2 L4.6 7.6Z', fill: '#ffc7de' }],
    ['circle', { cx: -3, cy: 14, r: 1.1, fill: '#5a4a4a' }], ['circle', { cx: 3, cy: 14, r: 1.1, fill: '#5a4a4a' }], ['path', { d: 'M-.9 16.3 L.9 16.3 L0 17.4Z', fill: '#ff9cc4' }],
    ['circle', { cx: -5.4, cy: 17, r: 1.5, fill: '#ffc7de', opacity: .7 }], ['circle', { cx: 5.4, cy: 17, r: 1.5, fill: '#ffc7de', opacity: .7 }]] },
};
export const isCharmKind = (kind: unknown): kind is string => typeof kind === 'string' && kind in CHARMS;
export const charmName = (kind: string) => CHARMS[kind]?.name || '挂件';

let cache: CharmGift[] | null = null;
function clean(value: unknown): CharmGift[] {
  const items = Array.isArray(value) ? value as Record<string, unknown>[] : [];
  return items.flatMap((item): CharmGift[] => {
    if (!item?.id || !isCharmKind(item.kind) || !item.from) return [];
    const change = item.change as Record<string, unknown> | undefined;
    return [{ id: String(item.id), kind: String(item.kind), from: String(item.from), note: String(item.note || '').slice(0, 60), at: Number(item.at) || 0, hung: !!item.hung,
      ...(Number(item.hungAt) ? { hungAt: Number(item.hungAt) } : {}),
      ...(change && (change.kind === 'off' || change.kind === 'on') ? { change: { kind: change.kind, at: Number(change.at) || 0, ...(change.seen ? { seen: true } : {}) } } : {}) }];
  }).slice(-200);
}
export function readCharms(): CharmGift[] {
  if (!cache) { try { cache = clean(JSON.parse(kv.getItem(KEY) || '[]')); } catch { cache = []; } }
  return cache;
}
function write(next: CharmGift[]) { cache = clean(next); kv.setItem(KEY, JSON.stringify(cache)); window.dispatchEvent(new CustomEvent(EVENT)); }
export function subscribeCharms(listener: () => void) {
  window.addEventListener(EVENT, listener);
  return () => window.removeEventListener(EVENT, listener);
}
export const charmById = (id: string) => readCharms().find(item => item.id === id);
export const hungCharms = () => readCharms().filter(item => item.hung);
/** 他送了一件（先不挂，等你在聊天里点）。 */
export function addCharm(kind: string, from: string, note: string) {
  const gift: CharmGift = { id: 'charm_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6), kind, from, note: note.trim(), at: Date.now(), hung: false };
  write([...readCharms(), gift]);
  return gift;
}
/** 挂上或摘下；挂满三件就挂不上（回 false）。摘了又挂回去、他还没注意到，就当没动过。 */
export function setCharmHung(id: string, hung: boolean) {
  const items = readCharms(), gift = items.find(item => item.id === id);
  if (!gift || gift.hung === hung) return !!gift;
  if (hung && items.filter(item => item.hung).length >= CHARM_MAX) return false;
  const now = Date.now(), first = hung && !gift.hungAt;
  const change: CharmChange | undefined = first ? gift.change : gift.change && !gift.change.seen && gift.change.kind !== (hung ? 'on' : 'off') ? undefined : { kind: hung ? 'on' : 'off', at: now };
  write(items.map(item => item.id === id ? { ...item, hung, ...(first ? { hungAt: now } : {}), change } : item));
  return true;
}
export function seeCharmChange(id: string) {
  write(readCharms().map(item => item.id === id && item.change ? { ...item, change: { ...item.change, seen: true } } : item));
}
