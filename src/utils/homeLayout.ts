/**
 * 主画面的排法：每页是一张 4 栏 × 7 列的格子，图标占 1 格、组件占好几格。
 * 预设就是原本的样子：第 1 页头像和播放器（4×4）、四个图标、电子宠物（2×2）；第 2 页消息小窗（4×1）、预设。
 * 图标只能换位置，不能收起来；组件可以收起来、再加回去。最多 3 页。
 * 后来加的组件（一句话、登录框、日历）一开始是收起来的，要自己从「加组件」加进来。
 */
export const COLS = 4, ROWS = 7, MAX_PAGES = 3;
/** 格子的大小（px）：一栏 82.5（四栏 330，跟原本图标区一样宽），一列 88；第一列上面留 22。 */
export const CELL_W = 82.5, CELL_H = 88, PAD_TOP = 22, GRID_W = COLS * CELL_W;

export type HomeItemId = 'main' | 'tama' | 'notice' | 'ledger' | 'memos' | 'world' | 'memories' | 'preset' | 'hello' | 'login' | 'calendar';
/** extra：后来加的组件，存的排法里没提到它就当作收起来（不会自己跑出来）。 */
export interface HomeItemInfo { id: HomeItemId; name: string; w: number; h: number; widget: boolean; extra?: boolean }
export const HOME_ITEMS: HomeItemInfo[] = [
  { id: 'main', name: '头像和播放器', w: 4, h: 4, widget: true },
  { id: 'tama', name: '电子宠物', w: 2, h: 2, widget: true },
  { id: 'notice', name: '消息小窗', w: 4, h: 1, widget: true },
  { id: 'hello', name: '一句话', w: 4, h: 2, widget: true, extra: true },
  { id: 'login', name: '登录框', w: 2, h: 3, widget: true, extra: true },
  { id: 'calendar', name: '日历', w: 4, h: 3, widget: true, extra: true },
  { id: 'ledger', name: 'Ledger', w: 1, h: 1, widget: false },
  { id: 'memos', name: 'Memos', w: 1, h: 1, widget: false },
  { id: 'world', name: 'World', w: 1, h: 1, widget: false },
  { id: 'memories', name: 'Memories', w: 1, h: 1, widget: false },
  { id: 'preset', name: 'Preset', w: 1, h: 1, widget: false }
];
export const itemInfo = (id: HomeItemId) => HOME_ITEMS.find(item => item.id === id)!;

export interface Placement { id: HomeItemId; page: number; col: number; row: number }
export interface HomeLayout { pages: number; items: Placement[]; hidden: HomeItemId[] }

export const EXTRA_ITEMS = HOME_ITEMS.filter(item => item.extra).map(item => item.id);
export const DEFAULT_LAYOUT: HomeLayout = { pages: 2, hidden: [...EXTRA_ITEMS], items: [
  { id: 'main', page: 0, col: 0, row: 0 },
  { id: 'ledger', page: 0, col: 0, row: 4 }, { id: 'memos', page: 0, col: 1, row: 4 },
  { id: 'world', page: 0, col: 0, row: 5 }, { id: 'memories', page: 0, col: 1, row: 5 },
  { id: 'tama', page: 0, col: 2, row: 4 },
  { id: 'notice', page: 1, col: 0, row: 0 }, { id: 'preset', page: 1, col: 0, row: 1 }
] };

const overlaps = (a: Placement, b: Placement) => {
  const x = itemInfo(a.id), y = itemInfo(b.id);
  return a.page === b.page && a.col < b.col + y.w && b.col < a.col + x.w && a.row < b.row + y.h && b.row < a.row + x.h;
};
const fits = (item: Placement) => { const info = itemInfo(item.id); return item.col >= 0 && item.row >= 0 && item.col + info.w <= COLS && item.row + info.h <= ROWS; };

/** 这一页有没有位子放得下 w×h：从上往下、从左往右找第一个空位。 */
export function firstFree(items: Placement[], id: HomeItemId, page: number): Placement | null {
  const info = itemInfo(id);
  for (let row = 0; row + info.h <= ROWS; row++) for (let col = 0; col + info.w <= COLS; col++) {
    const spot = { id, page, col, row };
    if (!items.some(other => other.id !== id && overlaps(spot, other))) return spot;
  }
  return null;
}
/** 先找 prefer 那页，再找别页，都没有就开新的一页（最多 3 页）。 */
function findSpot(layout: HomeLayout, items: Placement[], id: HomeItemId, prefer: number): { spot: Placement; pages: number } | null {
  const order = [prefer, ...Array.from({ length: layout.pages }, (_, page) => page).filter(page => page !== prefer)];
  for (const page of order) { const spot = firstFree(items, id, page); if (spot) return { spot, pages: layout.pages }; }
  if (layout.pages < MAX_PAGES) { const spot = firstFree(items, id, layout.pages); if (spot) return { spot, pages: layout.pages + 1 }; }
  return null;
}

/** 读回来的排法：每个东西都要在、不能叠在一起、不能跑出格子；有问题的那几个重新找位子，还不行就用预设。 */
export function normalize(raw: unknown): HomeLayout {
  try {
    const data = raw as Partial<HomeLayout>;
    if (!data || !Array.isArray(data.items)) return DEFAULT_LAYOUT;
    let layout: HomeLayout = { pages: Math.min(MAX_PAGES, Math.max(1, Math.round(Number(data.pages)) || 1)), items: [], hidden: [] };
    const ids = new Set(HOME_ITEMS.map(item => item.id));
    layout.hidden = [...new Set((Array.isArray(data.hidden) ? data.hidden : []).filter(id => ids.has(id) && itemInfo(id).widget))];
    const pending: HomeItemId[] = [];
    for (const item of data.items) {
      if (!item || !ids.has(item.id) || layout.hidden.includes(item.id) || layout.items.some(other => other.id === item.id)) continue;
      const spot = { id: item.id, page: Math.round(Number(item.page)), col: Math.round(Number(item.col)), row: Math.round(Number(item.row)) };
      if (spot.page >= 0 && spot.page < layout.pages && fits(spot) && !layout.items.some(other => overlaps(spot, other))) layout.items.push(spot);
      else pending.push(item.id);
    }
    for (const info of HOME_ITEMS) {
      if (layout.hidden.includes(info.id) || layout.items.some(item => item.id === info.id) || pending.includes(info.id)) continue;
      if (info.extra) layout.hidden.push(info.id); else pending.push(info.id);
    }
    for (const id of pending) {
      const found = findSpot(layout, layout.items, id, 0);
      if (!found) return DEFAULT_LAYOUT;
      layout = { ...layout, pages: found.pages, items: [...layout.items, found.spot] };
    }
    return layout;
  } catch { return DEFAULT_LAYOUT; }
}
/** 把一个东西挪到 (page, col, row)：原本在那里的往旁边找空位（同一页优先），都放不下就回传 null。 */
export function moveItem(layout: HomeLayout, id: HomeItemId, page: number, col: number, row: number): HomeLayout | null {
  const target: Placement = { id, page, col, row };
  if (!fits(target) || page < 0 || page >= MAX_PAGES) return null;
  let next: HomeLayout = { ...layout, pages: Math.max(layout.pages, page + 1), items: layout.items.filter(item => item.id !== id) };
  const pushed = next.items.filter(item => overlaps(target, item));
  next.items = [...next.items.filter(item => !pushed.includes(item)), target];
  for (const item of pushed) {
    const found = findSpot(next, next.items, item.id, page);
    if (!found) return null;
    next = { ...next, pages: found.pages, items: [...next.items, found.spot] };
  }
  return next;
}
/** 收起一个组件。 */
export const hideItem = (layout: HomeLayout, id: HomeItemId): HomeLayout => itemInfo(id).widget ? { ...layout, items: layout.items.filter(item => item.id !== id), hidden: [...layout.hidden.filter(other => other !== id), id] } : layout;
/** 把收起来的组件加回来：先放现在这页，没位子就放别页、开新页。 */
export function addItem(layout: HomeLayout, id: HomeItemId, page: number): HomeLayout | null {
  const items = layout.items.filter(item => item.id !== id);
  const found = findSpot(layout, items, id, page);
  return found ? { pages: found.pages, items: [...items, found.spot], hidden: layout.hidden.filter(other => other !== id) } : null;
}
/** 拿掉空的页（至少留一页），后面的页往前补。 */
export function dropEmptyPages(layout: HomeLayout): HomeLayout {
  const used = [...new Set(layout.items.map(item => item.page))].sort((a, b) => a - b);
  if (!used.length) return { ...layout, pages: 1 };
  const map = new Map(used.map((page, index) => [page, index]));
  return { ...layout, pages: used.length, items: layout.items.map(item => ({ ...item, page: map.get(item.page)! })) };
}
