import { kv } from './kvStorage';
import { scopeChatCss } from './chatCssScope';

/** 美化设置的「聊天美化 CSS」：套到全部聊天室。聊天设置里单独设的壁纸、字号、专属气泡还是会盖过它。 */
const KEY = 'qingtuan_chat_css_v1', TEMPLATES = 'qingtuan_chat_css_templates_v1';
export const CHAT_CSS_EVENT = 'qingtuan:chat-css';
export const TEMPLATE_LIMIT = 30;

export function readChatCss() { try { return kv.getItem(KEY) || ''; } catch { return ''; } }
export function writeChatCss(css: string) {
  const value = String(css || '').trim();
  if (value) { scopeChatCss(value); kv.setItem(KEY, value); } else kv.removeItem(KEY);
  try { kv.removeItem('qingtuan_chat_css_draft_v1'); } catch { /* 草稿清不掉没关系 */ }
  window.dispatchEvent(new CustomEvent(CHAT_CSS_EVENT));
}

/** 还没套用的草稿：离开美化设置、重新开启都还在。跟已套用的一样就不存。 */
const DRAFT = 'qingtuan_chat_css_draft_v1';
export function readDraft(): string | null { try { return kv.getItem(DRAFT); } catch { return null; } }
export function writeDraft(draft: string, applied: string) {
  try { if (draft.trim() === applied.trim()) kv.removeItem(DRAFT); else kv.setItem(DRAFT, draft.slice(0, 40000)); } catch { /* 存不了就算了 */ }
}

export interface ChatCssTemplate { id: string; name: string; css: string; at: number }
export function readTemplates(): ChatCssTemplate[] {
  try { const list = JSON.parse(kv.getItem(TEMPLATES) || '[]'); return Array.isArray(list) ? list.filter(item => item && typeof item.css === 'string' && item.name) : []; } catch { return []; }
}
function writeTemplates(list: ChatCssTemplate[]) { kv.setItem(TEMPLATES, JSON.stringify(list)); }
export function saveTemplate(name: string, css: string) {
  const list = readTemplates();
  if (list.length >= TEMPLATE_LIMIT) throw Error(`最多存 ${TEMPLATE_LIMIT} 个模板，先删掉不用的`);
  let next = String(name || '').trim().slice(0, 12) || '我的模板', index = 2;
  const base = next, names = new Set(list.map(item => item.name));
  while (names.has(next)) next = `${base.slice(0, 9)}(${index++})`;
  const item = { id: `css_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 5)}`, name: next, css: String(css || ''), at: Date.now() };
  writeTemplates([...list, item]);
  return item;
}
export function renameTemplate(id: string, name: string) { writeTemplates(readTemplates().map(item => item.id === id ? { ...item, name: String(name || '').trim().slice(0, 12) || item.name } : item)); }
export function deleteTemplate(id: string) { writeTemplates(readTemplates().filter(item => item.id !== id)); }

/* 检查、加范围的部分在 chatCssScope.ts（纯文字处理，可以单独测）。 */
export { CHAT_CSS_SCOPE, CHAT_CSS_LIMIT, scopeChatCss, strengthen } from './chatCssScope';

/* ---------- 类名小抄 ---------- */
export const CLASS_GROUPS: { label: string; items: [string, string][] }[] = [
  { label: '颜色（只想换颜色，改这几个就好）', items: [
    ['#chatRoomView { --cr-bg: ; }', '聊天室底色'], ['#chatRoomView { --cr-face: ; }', '顶栏、按钮的底色'], ['#chatRoomView { --cr-line: ; }', '框线'],
    ['#chatRoomView { --cr-title: ; }', '文字颜色'], ['#chatRoomView { --cr-peer: ; }', '他的名字颜色'], ['#chatRoomView { --cr-self: ; }', '我的名字颜色']] },
  { label: '顶栏', items: [
    ['.chat-room-header', '整条顶栏（background 换底色）'], ['.chat-room-title', '「与 XX 聊天中」的字'], ['.chat-room-back', '返回键'], ['.chat-room-more', '右上角「…」'],
    ['.chat-room-back svg, .chat-room-more svg', '返回、「…」的图示（color 换颜色）'],
    ['.chat-quick-actions', '生图、位置、世界书那一排'], ['.chat-quick-actions .chat-quick-action', '那一排的其中一颗'], ['.chat-quick-actions .chat-quick-action svg', '那一排的小图示（color 换颜色）']] },
  { label: '消息', items: [
    ['.chat-message-list', '放消息的大框'], ['.chat-message-row', '一则消息（整行）'], ['.chat-message-row.is-chat', '他发的'], ['.chat-message-row.is-user', '我发的'],
    ['.chat-message-row .chat-bubble', '消息文字（气泡）'], ['.chat-message-row.is-user .chat-bubble', '我的气泡'], ['.chat-message-row.is-chat .chat-bubble', '他的气泡'],
    ['.chat-message-name', '名字'], ['.chat-message-time', '时间'], ['.chat-message-mini-avatar', '头像'], ['.chat-date-divider', '中间的日期时间']] },
  { label: '底栏', items: [
    ['.chat-composer', '整个输入区'], ['.chat-composer .chat-quick-action', '麦克风、图片那一排小按钮（麦克风也会一起改）'], ['.chat-composer .chat-quick-action svg', '那排小按钮的图示（color 换颜色）'], ['.chat-mic-btn', '只改麦克风这一颗（录音红点在 ::before，别动它）'],
    ['.chat-compose-field', '输入框'], ['.chat-send-btn', '发送键（底色、圆角、阴影）'], ['.chat-send-btn::after', '发送键上的字（content: \'送出\' 换字）']] },
  { label: '右边那栏', items: [
    ['.cr-side', '整栏'], ['.cr-panel', '每一格（在线、动态）'], ['.cr-photo', '大头照']] }
];

/* ---------- 示例 ---------- */
export const EXAMPLES: { name: string; css: string }[] = [
  { name: '原本的', css: '' },
  { name: '只换颜色', css: `/* 只想换颜色：改这几行，删掉不想改的 */
#chatRoomView {
  --cr-bg: #fbf7f2;      /* 聊天室底色 */
  --cr-face: #f3e7dc;    /* 顶栏、按钮的底色 */
  --cr-line: #c9b3a2;    /* 框线 */
  --cr-title: #6b5a4e;   /* 文字 */
  --cr-peer: #b07d62;    /* 他的名字 */
  --cr-self: #8c9a6e;    /* 我的名字 */
}` },
  { name: '气泡框', css: `/* 名字、时间占一整行，气泡排在下面 */
.chat-message-row > .chat-message-head {
  flex-basis: 100%;
}
/* 文字放进气泡里 */
.chat-message-row .chat-bubble {
  display: inline-block;
  flex: 0 0 auto;          /* 气泡跟着字的长度，不要撑满一整行 */
  max-width: 100%;
  margin-top: 2px;
  padding: 4px 9px;
  border: 1px solid var(--cr-line);
  border-radius: 2px 10px 10px 10px;
  background: var(--color-surface);
}
/* 我的气泡用主题色 */
.chat-message-row.is-user .chat-bubble {
  border-radius: 10px 2px 10px 10px;
  background: color-mix(in srgb, var(--theme-color) 55%, #fff);
}` },
  { name: '便利贴', css: `/* 名字、时间占一整行，气泡排在下面 */
.chat-message-row > .chat-message-head {
  flex-basis: 100%;
}
/* 每一则像一张便利贴 */
.chat-message-row .chat-bubble {
  display: inline-block;
  flex: 0 0 auto;          /* 气泡跟着字的长度，不要撑满一整行 */
  max-width: 100%;
  margin-top: 3px;
  padding: 5px 10px;
  border: 1px solid #e4dcc0;
  background: #fffdf3;
  box-shadow: 2px 2px 0 #e9e2c9;
  transform: rotate(-.6deg);
}
.chat-message-row.is-user .chat-bubble {
  border-color: #ecc9d2;
  background: #fdf0f3;
  box-shadow: 2px 2px 0 #f0d6dd;
  transform: rotate(.6deg);
}` },
  { name: '像素方框', css: `/* 名字、时间占一整行，气泡排在下面 */
.chat-message-row > .chat-message-head {
  flex-basis: 100%;
}
/* 方方的像素框 */
.chat-message-row .chat-bubble {
  display: inline-block;
  flex: 0 0 auto;          /* 气泡跟着字的长度，不要撑满一整行 */
  max-width: 100%;
  margin: 3px 2px;
  padding: 4px 8px;
  background: var(--color-surface);
  box-shadow: 0 -2px 0 var(--cr-title), 0 2px 0 var(--cr-title), -2px 0 0 var(--cr-title), 2px 0 0 var(--cr-title);
}
.chat-message-row.is-user .chat-bubble {
  background: color-mix(in srgb, var(--theme-color) 50%, #fff);
}
.chat-message-mini-avatar {
  border-radius: 0;
}` }
];
