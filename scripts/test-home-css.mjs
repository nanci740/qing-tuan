// 主画面美化 CSS 的加范围：node --experimental-strip-types scripts/test-home-css.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import { HOME_CSS_SCOPE as S, scopeHomeCss } from '../src/utils/homeCssScope.ts';

const NOT = ':not(:is(#chatAppPage, #worldPage) *)';

test(':root、body、#main-content 当成主画面本身，不加排除', () => {
  assert.equal(scopeHomeCss(':root { --theme-accent: red }'), `${S}{--theme-accent: red !important}`);
  assert.equal(scopeHomeCss('#main-content { background: #fff }'), `${S}{background: #fff !important}`);
  assert.equal(scopeHomeCss('body .dock-bar { color: red }').split('{')[0], `${S} .dock-bar${NOT}`);
});

test('一般的选择器加范围，再把聊天、世界书排除掉', () => {
  assert.equal(scopeHomeCss('.app-card { border-radius: 8px }'), `${S} .app-card${NOT}{border-radius: 8px !important}`);
  assert.equal(scopeHomeCss('.a, .b { top: 0 }').split('{')[0], `${S} .a${NOT},${S} .b${NOT}`);
});

test('伪元素结尾的，排除加在伪元素前面', () => {
  assert.equal(scopeHomeCss('.app-card::before { content: "" }').split('{')[0], `${S} .app-card${NOT}::before`);
  assert.equal(scopeHomeCss('.subtitle:after { content: "" }').split('{')[0], `${S} .subtitle${NOT}:after`);
  assert.equal(scopeHomeCss('.app-item:hover { top: 0 }').split('{')[0], `${S} .app-item:hover${NOT}`);
});

test('底下那排、整个主画面不让藏起来', () => {
  for (const selector of ['.dock-bar', '#dockBar', '.dock-item', '.dock-item span', '#navSettingsBtn', '[data-dock-icon-key="settings"]', ':root', '#main-content']) {
    const out = scopeHomeCss(`${selector} { display: none; visibility: hidden; opacity: 0; pointer-events: none; color: red }`);
    assert.ok(!/display|visibility|opacity|pointer-events/.test(out), `${selector} 不该被藏：${out}`);
    assert.ok(out.includes('color: red'), `${selector} 其他的照套`);
  }
  assert.ok(scopeHomeCss('.app-label-cn { display: none }').includes('display: none'));
  assert.ok(scopeHomeCss('.home-dots { opacity: 0 }').includes('opacity: 0'));
  assert.ok(scopeHomeCss('.dock-item::after { display: none }').includes('display: none'));
});

test('检查跟聊天美化一样：写错说第几行、外面的网址挡掉', () => {
  assert.throws(() => scopeHomeCss('.a { top: 0 }\n.b { top: 0'), /^Error: 第 2 行|第 2 行/);
  assert.throws(() => scopeHomeCss('.a { background: url(https://x.com/a.png) }'), /data:image/);
  assert.equal(scopeHomeCss('   '), '');
});
