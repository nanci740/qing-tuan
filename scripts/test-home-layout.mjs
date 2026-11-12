// 主画面排法：node --experimental-strip-types scripts/test-home-layout.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import { DEFAULT_LAYOUT, EXTRA_ITEMS, normalize, moveItem, hideItem, addItem, dropEmptyPages, firstFree, ROWS, COLS, itemInfo } from '../src/utils/homeLayout.ts';

const at = (layout, id) => layout.items.find(item => item.id === id);
const valid = layout => {
  for (const a of layout.items) {
    const x = itemInfo(a.id);
    assert.ok(a.col >= 0 && a.row >= 0 && a.col + x.w <= COLS && a.row + x.h <= ROWS && a.page < layout.pages, `${a.id} 跑出格子`);
    for (const b of layout.items) if (a !== b) {
      const y = itemInfo(b.id);
      const hit = a.page === b.page && a.col < b.col + y.w && b.col < a.col + x.w && a.row < b.row + y.h && b.row < a.row + x.h;
      assert.ok(!hit, `${a.id} 跟 ${b.id} 叠在一起`);
    }
  }
};

test('预设：每个东西都在、没有叠在一起', () => {
  valid(DEFAULT_LAYOUT);
  assert.equal(DEFAULT_LAYOUT.items.length, 8);
  assert.deepEqual(normalize(DEFAULT_LAYOUT), DEFAULT_LAYOUT);
});

test('读回来坏掉的：缺的补回去、叠在一起的重新找位子、乱七八糟的用预设', () => {
  assert.deepEqual(normalize(null), DEFAULT_LAYOUT);
  assert.deepEqual(normalize({ items: 'x' }), DEFAULT_LAYOUT);
  const missing = normalize({ pages: 2, items: DEFAULT_LAYOUT.items.filter(item => item.id !== 'memos'), hidden: [] });
  valid(missing); assert.ok(at(missing, 'memos'));
  const stacked = normalize({ pages: 2, items: [...DEFAULT_LAYOUT.items.filter(item => item.id !== 'preset'), { id: 'preset', page: 0, col: 0, row: 4 }], hidden: [] });
  valid(stacked); assert.ok(at(stacked, 'preset'));
  // 图标不能收起来
  const hiddenApp = normalize({ ...DEFAULT_LAYOUT, hidden: ['ledger'] });
  assert.ok(at(hiddenApp, 'ledger')); assert.deepEqual(hiddenApp.hidden, EXTRA_ITEMS);
});

test('挪位置：放到空格；放到别人那里，别人往旁边找空位', () => {
  const a = moveItem(DEFAULT_LAYOUT, 'ledger', 0, 3, 6);
  valid(a); assert.deepEqual(at(a, 'ledger'), { id: 'ledger', page: 0, col: 3, row: 6 });
  const b = moveItem(DEFAULT_LAYOUT, 'ledger', 0, 1, 4);
  valid(b); assert.deepEqual(at(b, 'ledger'), { id: 'ledger', page: 0, col: 1, row: 4 }); assert.notDeepEqual(at(b, 'memos'), { id: 'memos', page: 0, col: 1, row: 4 });
  const c = moveItem(DEFAULT_LAYOUT, 'tama', 1, 2, 3);
  valid(c); assert.equal(at(c, 'tama').page, 1);
  assert.equal(moveItem(DEFAULT_LAYOUT, 'tama', 0, 3, 0), null, '超出格子');
});

test('挪到第 3 页会开新页；最多 3 页', () => {
  const a = moveItem(DEFAULT_LAYOUT, 'preset', 2, 0, 0);
  valid(a); assert.equal(a.pages, 3);
  assert.equal(moveItem(DEFAULT_LAYOUT, 'preset', 3, 0, 0), null);
});

test('收起、加回组件；空的页拿掉', () => {
  const hidden = hideItem(DEFAULT_LAYOUT, 'notice');
  assert.ok(!at(hidden, 'notice')); assert.deepEqual(hidden.hidden, [...EXTRA_ITEMS, 'notice']);
  assert.deepEqual(hideItem(DEFAULT_LAYOUT, 'ledger'), DEFAULT_LAYOUT, '图标不能收');
  const back = addItem(hidden, 'notice', 1);
  valid(back); assert.equal(at(back, 'notice').page, 1); assert.deepEqual(back.hidden, EXTRA_ITEMS);
  const full = addItem(hideItem(DEFAULT_LAYOUT, 'main'), 'main', 0);
  valid(full); assert.ok(at(full, 'main'));
  const empty = dropEmptyPages(moveItem(moveItem(hideItem(DEFAULT_LAYOUT, 'notice'), 'preset', 0, 3, 6), 'preset', 0, 3, 6));
  assert.equal(empty.pages, 1); valid(empty);
  const gap = dropEmptyPages({ ...moveItem(hideItem(DEFAULT_LAYOUT, 'notice'), 'preset', 2, 0, 0), pages: 3 });
  assert.equal(gap.pages, 2); assert.equal(at(gap, 'preset').page, 1);
});

test('找空位：从上往下、从左往右', () => {
  assert.deepEqual(firstFree(DEFAULT_LAYOUT.items, 'preset', 0), { id: 'preset', page: 0, col: 0, row: 6 });
  assert.deepEqual(firstFree(DEFAULT_LAYOUT.items, 'notice', 0), { id: 'notice', page: 0, col: 0, row: 6 });
  assert.equal(firstFree(DEFAULT_LAYOUT.items, 'tama', 0)?.row, 4, '自己原本的位子不算被占');
  assert.equal(firstFree(DEFAULT_LAYOUT.items.filter(item => item.id !== 'tama').concat({ id: 'tama', page: 0, col: 2, row: 4 }), 'main', 0)?.row, 0);
});

test('后来加的组件：以前存的排法里没有它们，就当作收起来，不会自己跑出来', () => {
  const old = { pages: 2, hidden: [], items: DEFAULT_LAYOUT.items };
  const read = normalize(old);
  for (const id of EXTRA_ITEMS) assert.ok(!at(read, id), `${id} 不该自己出来`);
  assert.deepEqual(read.hidden, EXTRA_ITEMS);
  // 加进来以后存回去再读，还在原位
  let next = addItem(read, 'calendar', 1); valid(next);
  next = addItem(next, 'hello', 0); valid(next);
  next = addItem(next, 'login', 1); valid(next);
  const again = normalize(JSON.parse(JSON.stringify(next)));
  assert.deepEqual(again, next);
  // 收起来再读，一样是收着
  assert.ok(!at(normalize(hideItem(next, 'calendar')), 'calendar'));
});
