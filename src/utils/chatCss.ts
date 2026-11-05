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
  { name: '旧 iPhone', css: `/* 旧 iPhone：浅蓝底、亮亮的泡泡、带小尾巴 */
#chatRoomView {
  --cr-bg: #dde4ee;
}
.chat-message-list {
  background: #dde4ee;
}
/* 不显示名字和时间，像简讯那样 */
.chat-message-row > .chat-message-head {
  display: none;
}
.chat-message-row {
  padding: 4px 14px 4px 54px;
  min-height: 0;
}
/* 他的头像：圆圆的，白边 */
.chat-message-mini-avatar {
  top: 2px;
  left: 12px;
  width: 32px;
  height: 32px;
  border: 2px solid #fff;
  border-radius: 50%;
  box-shadow: 0 1px 3px rgba(60, 80, 110, .35);
}
/* 我的：靠右，不放头像 */
.chat-message-row.is-user {
  justify-content: flex-end;
  padding: 4px 16px 4px 60px;
}
.chat-message-row.is-user > .chat-message-mini-avatar {
  display: none;
}
/* 泡泡 */
.chat-message-row .chat-bubble {
  position: relative;
  display: inline-block;
  flex: 0 0 auto;
  max-width: 100%;
  margin: 2px 0;
  padding: 5px 13px;
  border: 1px solid #a9adb3;
  border-radius: 16px;
  background: linear-gradient(#ffffff, #f1f1f1 50%, #e3e3e3);
  box-shadow: inset 0 1px 0 #fff, 0 1px 1px rgba(0, 0, 0, .18);
  color: #2b2b2b;
}
.chat-message-row.is-user .chat-bubble {
  margin-left: auto;
  border-color: #8aa9cc;
  background: linear-gradient(#f3f9ff, #d9e9fa 50%, #bfd6f0);
}
/* 小尾巴：贴在泡泡下方的小三角 */
.chat-message-row .chat-bubble::after {
  content: '';
  position: absolute;
  bottom: 5px;
  left: -5px;
  width: 8px;
  height: 8px;
  border-left: 1px solid #a9adb3;
  border-bottom: 1px solid #a9adb3;
  background: #e7e7e7;
  transform: rotate(45deg);
}
.chat-message-row.is-user .chat-bubble::after {
  left: auto;
  right: -5px;
  border: 0;
  border-top: 1px solid #8aa9cc;
  border-right: 1px solid #8aa9cc;
  background: #c4d9f1;
}
/* 时间和已读，小小的放在泡泡下面 */
.chat-bubble-wrap > .chat-bubble-time {
  order: 3;
  flex: 0 0 100%;
  justify-content: flex-start;
  align-items: center;
  gap: 3px;
  margin: 1px 0 3px 6px;
  color: #8a94a3;
  font-size: 9px;
}
.chat-message-row.is-user .chat-bubble-wrap > .chat-bubble-time {
  justify-content: flex-end;
  margin: 1px 6px 3px 0;
}
/* 中间的日期 */
.chat-date-divider {
  border: 0;
  border-radius: 8px;
  background: rgba(255, 255, 255, .75);
  color: #6b7380;
}
/* 顶栏：亮面的银蓝 */
.chat-room-header {
  border-bottom: 1px solid #8b9bb0;
  background: linear-gradient(#e9eef5, #c4cfdd 50%, #b4c2d4 51%, #a9b8cc);
}
.chat-room-title {
  color: #3d4b5e;
  text-shadow: 0 1px 0 rgba(255, 255, 255, .7);
}
.chat-room-back, .chat-room-more {
  border: 1px solid #7f91a8;
  border-radius: 6px;
  background: linear-gradient(#d6dfea, #a7b6c9);
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, .7);
  color: #fff;
}
/* 输入区 */
.chat-composer {
  background: linear-gradient(#eef1f5, #d3d9e1);
}
.chat-compose-field {
  border: 1px solid #a9b3bf;
  border-radius: 14px;
  box-shadow: inset 0 1px 2px rgba(0, 0, 0, .15);
}
.chat-send-btn {
  border: 1px solid #5f86b8;
  border-radius: 14px;
  background: linear-gradient(#a9c8ec, #6f9bd2 50%, #5b8bc8 51%, #6c9ad3);
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, .5);
}
.chat-send-btn::after {
  content: 'Send';
  color: #fff;
  text-shadow: 0 -1px 0 rgba(0, 0, 0, .3);
}` }
];
