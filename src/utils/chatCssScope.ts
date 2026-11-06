/**
 * 聊天美化 CSS 的检查和加范围（纯文字处理，不碰画面，可以单独测）。
 * - 只作用在聊天室（#chatRoomView）里，聊天列表、聊天设置不受影响。
 * - 每一句补 !important；写了 color 顺便补 -webkit-text-fill-color。
 * - 返回键、顶栏、整个聊天室不让藏起来，免得写错就出不去。
 * - 写错时说第几行。
 */

/** 六个 #chatAppPage 再加 #chatRoomView：聊天室原本的样式最多到四层（像发送键），要盖得过去；专属气泡用八个，再盖过这里。 */
export const CHAT_CSS_SCOPE = '#chatAppPage'.repeat(6) + ' #chatRoomView';
export const CHAT_CSS_LIMIT = 30000;

class CssError extends Error {}
const lineOf = (text: string, index: number) => text.slice(0, Math.max(0, index)).split('\n').length;
const fail = (full: string, index: number, message: string): never => { throw new CssError(`第 ${lineOf(full, index)} 行：${message}`); };

/** 注解拿掉，但换行留着，行号才对得上；引号里的 /* 不算注解。 */
function stripComments(css: string) {
  let out = '', quote = '';
  for (let index = 0; index < css.length; index++) {
    const char = css[index];
    if (quote) { out += char; if (char === '\\') { out += css[++index] ?? ''; continue; } if (char === quote) quote = ''; continue; }
    if (char === '"' || char === "'") { quote = char; out += char; continue; }
    if (char === '/' && css[index + 1] === '*') {
      const end = css.indexOf('*/', index + 2);
      const comment = end < 0 ? css.slice(index) : css.slice(index, end + 2);
      out += comment.replace(/[^\n]/g, ' ');
      index += comment.length - 1;
      continue;
    }
    out += char;
  }
  return out;
}

interface Block { head: string; body: string; headAt: number; bodyAt: number }
/** 切出最外层的「选择器 { 内容 }」；引号里的大括号不算。 */
function blocks(css: string, offset: number, full: string): Block[] {
  const list: Block[] = []; let start = 0, open = -1, depth = 0, quote = '', quoteAt = 0;
  for (let index = 0; index < css.length; index++) {
    const char = css[index];
    if (quote) { if (char === '\\') { index++; continue; } if (char === quote || char === '\n') quote = ''; continue; }
    if (char === '"' || char === "'") { quote = char; quoteAt = index; continue; }
    if (char === '{') { if (depth === 0) open = index; depth++; }
    else if (char === '}') {
      if (depth === 0) fail(full, offset + index, '多了一个 }');
      if (--depth === 0) {
        const raw = css.slice(start, open), lead = raw.length - raw.trimStart().length;
        list.push({ head: raw.trim(), body: css.slice(open + 1, index), headAt: offset + start + lead, bodyAt: offset + open + 1 });
        start = index + 1;
      }
    } else if (char === ';' && depth === 0) {
      const text = css.slice(start, index).trim();
      if (text && !text.startsWith('@')) fail(full, offset + start + (css.slice(start, index).length - css.slice(start, index).trimStart().length), `「${text.slice(0, 20)}」没有放在 { } 里`);
      start = index + 1;
    }
  }
  if (quote) fail(full, offset + quoteAt, '引号没有关起来');
  if (depth > 0) fail(full, offset + open, '这个 { 没有关起来');
  const tail = css.slice(start);
  if (tail.trim()) fail(full, offset + start + (tail.length - tail.trimStart().length), '最后这段没有放在 { } 里');
  return list;
}

/** 逗号分开选择器，但 :is(a, b) 括号、[title="a,b"] 里的逗号不算。 */
function splitSelectors(head: string) {
  const parts: string[] = []; let depth = 0, start = 0, quote = '';
  for (let index = 0; index < head.length; index++) {
    const char = head[index];
    if (quote) { if (char === quote) quote = ''; continue; }
    if (char === '"' || char === "'") quote = char;
    else if (char === '(' || char === '[') depth++;
    else if (char === ')' || char === ']') depth--;
    else if (char === ',' && depth === 0) { parts.push(head.slice(start, index)); start = index + 1; }
  }
  parts.push(head.slice(start));
  return parts.map(part => part.trim()).filter(Boolean);
}

const ROOT = /^(?::root|html|body|#chatAppPage|#chatRoomView)(?![\w-])/i;
/** :root、html、body、#chatAppPage、#chatRoomView 都当成聊天室本身。 */
export function scopeSelector(selector: string, scope = CHAT_CSS_SCOPE) {
  let rest = selector, stripped = false, spaced = false;
  for (let match = rest.match(ROOT); match; match = rest.match(ROOT)) {
    stripped = true; rest = rest.slice(match[0].length);
    const space = rest.match(/^\s+/); spaced = !!space; if (space) rest = rest.slice(space[0].length);
  }
  if (!stripped) return `${scope} ${selector}`;
  if (!rest) return scope;
  return spaced ? `${scope} ${rest}` : scope + rest;
}

/** 麦克风跟图片、相机排在同一排，写法却不一样（.chat-mic-btn）：写给那排小按钮的，麦克风也一起套。上面生图那排（.chat-quick-actions）不算，::before／::after 也不算（录音红点是 ::before 画的）。 */
export function withMic(selector: string) {
  if (!/\.chat-quick-action(?![\w-])/.test(selector) || /\.chat-quick-actions(?![\w-])/.test(selector)) return [selector];
  if (/::?(before|after)\b/i.test(selector)) return [selector];
  return [selector, selector.replace(/\.chat-quick-action(?![\w-])/g, '.chat-mic-btn')];
}

/** 这几个藏起来就出不了聊天室：整个聊天室、顶栏、返回键、右上角「…」。 */
function guarded(selector: string) {
  if (/::?(before|after)\b/i.test(selector)) return false;
  if (scopeSelector(selector, '@') === '@') return true;
  return /(^|[\s>+~])(\.chat-room-header|\.chat-room-back|\.chat-room-more|#chatRoomBack|#chatRoomMore)(?![\w-])[^\s>+~]*$/.test(selector);
}
const HIDE = /^(display\s*:\s*none|visibility\s*:\s*(hidden|collapse)|opacity\s*:\s*0*(\.0*)?(?![\d.])|pointer-events\s*:\s*none|content-visibility\s*:\s*hidden)\b/i;

/** 每一句都加 !important（分号在括号、引号里的不算，像 data:image;base64）。guard 时把「藏起来」的几句拿掉。 */
export function strengthen(body: string, guard = false) {
  const parts: string[] = []; let depth = 0, quote = '', start = 0;
  for (let index = 0; index < body.length; index++) {
    const char = body[index];
    if (quote) { if (char === '\\') { index++; continue; } if (char === quote) quote = ''; continue; }
    if (char === '"' || char === "'") quote = char;
    else if (char === '(') depth++;
    else if (char === ')') depth--;
    else if (char === ';' && depth === 0) { parts.push(body.slice(start, index)); start = index + 1; }
  }
  parts.push(body.slice(start));
  const list = parts.map(part => part.trim()).filter(text => text && text.includes(':') && !/^position\s*:\s*fixed\b/i.test(text) && !(guard && HIDE.test(text.replace(/\s*!important$/i, ''))));
  // 聊天室很多字用 -webkit-text-fill-color 上色，只写 color 会没反应：写了 color 就顺便补上
  const color = list.find(text => /^color\s*:/i.test(text));
  if (color && !list.some(text => /^-webkit-text-fill-color\s*:/i.test(text))) list.push(color.replace(/^color/i, '-webkit-text-fill-color'));
  return list.map(text => /!important$/i.test(text) ? text : `${text} !important`).join(';');
}

function hasBrace(body: string) {
  let quote = '';
  for (let index = 0; index < body.length; index++) {
    const char = body[index];
    if (quote) { if (char === '\\') { index++; continue; } if (char === quote) quote = ''; continue; }
    if (char === '"' || char === "'") quote = char;
    else if (char === '{') return index;
  }
  return -1;
}

function scopeRules(css: string, offset: number, full: string, scope: string): string {
  let out = '';
  for (const block of blocks(css, offset, full)) {
    const { head, body } = block;
    if (!head) fail(full, block.bodyAt - 1, '{ 前面少了选择器');
    if (head.startsWith('@')) {
      if (/^@(media|supports|container|layer)\b/i.test(head)) out += `${head}{${scopeRules(body, block.bodyAt, full, scope)}}`;
      else if (/^@(-webkit-)?keyframes\b/i.test(head)) out += `${head}{${body}}`;
      // @font-face、@page 这些不收
      continue;
    }
    const inner = hasBrace(body);
    if (inner >= 0) fail(full, block.bodyAt + inner, '不支持把规则写在规则里面，请拆开写');
    const selectors = splitSelectors(head).flatMap(withMic);
    if (!selectors.length) fail(full, block.headAt, '选择器是空的');
    out += `${selectors.map(item => scopeSelector(item, scope)).join(',')}{${strengthen(body, selectors.some(guarded))}}`;
  }
  return out;
}

/** 检查、加范围。会去外面抓东西的写法挡掉；图片只收 data:image。写错就丢出「第几行：哪里错」。 */
export function scopeChatCss(source: string, scope = CHAT_CSS_SCOPE) {
  const raw = String(source || '');
  if (!raw.trim()) return '';
  if (raw.length > CHAT_CSS_LIMIT) throw new CssError('写太长了，最多 3 万字');
  const css = stripComments(raw);
  const banned = css.search(/@import|expression\s*\(|javascript:|behavior\s*:|<\/?style|<script/i);
  if (banned >= 0) fail(css, banned, '这里有不能用的写法（@import、script 这类）');
  const url = /url\s*\(\s*(['"]?)\s*([^'")\s]*)/gi;
  for (let match = url.exec(css); match; match = url.exec(css)) {
    if (!/^data:image\//i.test(match[2])) fail(css, match.index, '图片只能用 data:image 开头的，不能连到外面的网址');
  }
  return scopeRules(css, 0, css, scope);
}
