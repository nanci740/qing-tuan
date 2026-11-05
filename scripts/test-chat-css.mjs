// 聊天美化 CSS 的检查和加范围：node --experimental-strip-types scripts/test-chat-css.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import { CHAT_CSS_SCOPE as S, scopeChatCss, scopeSelector, strengthen, withMic } from '../src/utils/chatCssScope.ts';

const err = (css, pattern) => assert.throws(() => scopeChatCss(css), error => pattern.test(error.message), `应该挡下：${css}`);

test('一般的规则加上范围和 !important', () => {
  assert.equal(scopeChatCss('.chat-bubble { color: red }'), `${S} .chat-bubble{color: red !important;-webkit-text-fill-color: red !important}`);
  assert.equal(scopeChatCss('.a, .b { margin: 0 !important; }'), `${S} .a,${S} .b{margin: 0 !important}`);
  assert.equal(scopeChatCss('   \n  '), '');
});

test(':root、html、body、#chatAppPage、#chatRoomView 都当成聊天室本身', () => {
  assert.equal(scopeSelector(':root'), S);
  assert.equal(scopeSelector('#chatRoomView'), S);
  assert.equal(scopeSelector('#chatAppPage #chatRoomView .x'), `${S} .x`);
  assert.equal(scopeSelector('#chatRoomView > .x'), `${S} > .x`);
  assert.equal(scopeSelector('#chatRoomView.chat-selection-mode .x'), `${S}.chat-selection-mode .x`);
  assert.equal(scopeSelector('body .x'), `${S} .x`);
  assert.equal(scopeSelector('.chat-roomy'), `${S} .chat-roomy`);
  assert.equal(scopeSelector('#chatRoomViewer'), `${S} #chatRoomViewer`);
});

test('注解、引号里的大括号和分号不会弄乱', () => {
  assert.equal(scopeChatCss('/* { 注解 } */ .a { content: "}{;" }'), `${S} .a{content: "}{;" !important}`);
  assert.equal(scopeChatCss(".a { content: '/* 不是注解 */' }"), `${S} .a{content: '/* 不是注解 */' !important}`);
  assert.equal(scopeChatCss('.a { background: url(data:image/png;base64,AAA;) }'), `${S} .a{background: url(data:image/png;base64,AAA;) !important}`);
  assert.equal(scopeChatCss('[title="a,b"], .c { color: red }').split('{')[0], `${S} [title="a,b"],${S} .c`);
  assert.equal(scopeChatCss(':is(.a, .b) .c { top: 0 }').split('{')[0], `${S} :is(.a, .b) .c`);
});

test('@media、@supports 里面也加范围；@keyframes 原样；@font-face 拿掉', () => {
  assert.equal(scopeChatCss('@media (max-width: 400px) { .a { top: 0 } }'), `@media (max-width: 400px){${S} .a{top: 0 !important}}`);
  assert.equal(scopeChatCss('@keyframes x { from { opacity: 0 } to { opacity: 1 } }'), '@keyframes x{ from { opacity: 0 } to { opacity: 1 } }');
  assert.equal(scopeChatCss('@font-face { font-family: x; src: local(x) } .a { top: 0 }'), `${S} .a{top: 0 !important}`);
});

test('写错时说第几行', () => {
  err('.a { color: red }\n.b { color: red', /^第 2 行：这个 \{ 没有关起来/);
  err('.a { color: red }\n}', /^第 2 行：多了一个 \}/);
  err('.a { color: red }\n\ncolor: blue;', /^第 3 行：「color: blue」没有放在/);
  err('.a {\n  .b { color: red }\n}', /^第 2 行：不支持把规则写在规则里面/);
  err('.a { content: "abc }', /^第 1 行：引号没有关起来/);
  err('{ color: red }', /^第 1 行：\{ 前面少了选择器/);
  err('.a { top: 0 }\n.b { top: 0 }\n.c', /^第 3 行：最后这段没有放在/);
});

test('挡掉外面的东西', () => {
  err('@import url(x.css);', /@import/);
  err('.a { background: url(https://x.com/a.png) }', /^第 1 行：图片只能用 data:image/);
  err(".a { background: url('//x.com/a.png') }", /data:image/);
  err('.a { width: expression(alert(1)) }', /不能用的写法/);
  err('</style><script>alert(1)</script>', /不能用的写法/);
  assert.doesNotThrow(() => scopeChatCss("/* url(https://x) 写在注解里没关系 */ .a { top: 0 }"));
  err('x'.repeat(30001), /太长/);
});

test('position: fixed 拿掉', () => {
  assert.equal(scopeChatCss('.a { position: fixed; top: 0 }'), `${S} .a{top: 0 !important}`);
});

test('返回键、顶栏、整个聊天室不让藏起来', () => {
  for (const selector of ['.chat-room-back', '.chat-room-header', '#chatRoomMore', '.chat-room-more', ':root', '#chatRoomView', '.chat-room-header .chat-room-back']) {
    const out = scopeChatCss(`${selector} { display: none; visibility: hidden; opacity: 0; pointer-events: none; color: red }`);
    assert.ok(!/display|visibility|opacity|pointer-events/.test(out), `${selector} 不该被藏：${out}`);
    assert.ok(out.includes('color: red'), `${selector} 其他的照套`);
  }
  // 别的地方照常可以藏；透明度不是 0 的也照常
  assert.ok(scopeChatCss('.chat-quick-actions { display: none }').includes('display: none'));
  assert.ok(scopeChatCss('.chat-room-back { opacity: .5 }').includes('opacity: .5'));
  assert.ok(scopeChatCss('.chat-room-back { opacity: 0.6 }').includes('opacity: 0.6'));
  assert.ok(scopeChatCss('.chat-room-back::after { display: none }').includes('display: none'));
  assert.ok(scopeChatCss('.chat-room-header .chat-room-title { display: none }').includes('display: none'));
});

test('写给那排小按钮的，麦克风也一起套（::before 不跟）', () => {
  assert.deepEqual(withMic('.chat-composer .chat-quick-action'), ['.chat-composer .chat-quick-action', '.chat-composer .chat-mic-btn']);
  assert.deepEqual(withMic('.chat-quick-actions .chat-quick-action'), ['.chat-quick-actions .chat-quick-action']);
  assert.deepEqual(withMic('.chat-quick-action::before'), ['.chat-quick-action::before']);
});

test('strengthen：已经有 !important 的不重复加', () => {
  assert.equal(strengthen('color: red !important; top: 0'), 'color: red !important;top: 0 !important;-webkit-text-fill-color: red !important');
  assert.equal(strengthen('color: red; -webkit-text-fill-color: blue'), 'color: red !important;-webkit-text-fill-color: blue !important');
});
