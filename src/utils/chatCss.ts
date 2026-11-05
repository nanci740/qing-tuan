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
  { name: '旧 iPhone', css: `/* 旧 iPhone 泡泡：亮面、带小尾巴。他的在左边白色，我的在右边跟着主题色 */
.chat-message-row .chat-bubble > div:last-child {
  position: relative;
  display: inline-block;
  max-width: 100%;
  margin: 1px 6px;
  padding: 5px 13px;
  border: 1px solid #a9adb3;
  border-radius: 16px;
  background: linear-gradient(#ffffff, #f1f1f1 50%, #e3e3e3);
  box-shadow: inset 0 1px 0 #fff, 0 1px 1px rgba(0, 0, 0, .18);
  text-align: left;
}
.chat-message-row.is-user .chat-bubble > div:last-child {
  border-color: color-mix(in srgb, var(--theme-color) 55%, #5d6b7a);
  background: linear-gradient(color-mix(in srgb, var(--theme-color) 20%, #fff), color-mix(in srgb, var(--theme-color) 55%, #fff) 50%, var(--theme-color));
}
/* 小尾巴：从泡泡底部弯出去的小勾（他的在左下，我的在右下） */
.chat-message-row .chat-bubble > div:last-child {
  border-bottom-left-radius: 5px;
}
.chat-message-row.is-user .chat-bubble > div:last-child {
  border-bottom-left-radius: 16px;
  border-bottom-right-radius: 5px;
}
.chat-message-row .chat-bubble > div:last-child::after {
  content: '';
  position: absolute;
  bottom: -1px;
  left: -11px;
  width: 15px;
  height: 14px;
  border-bottom: 1px solid #a9adb3;
  background: radial-gradient(ellipse 11px 13px at 0 0, transparent 91%, #a9adb3 92%, #a9adb3 99%, transparent 101%), linear-gradient(#efefef, #e3e3e3);
  -webkit-mask: radial-gradient(ellipse 11px 13px at 0 0, transparent 90%, #000 92%);
  mask: radial-gradient(ellipse 11px 13px at 0 0, transparent 90%, #000 92%);
}
.chat-message-row.is-user .chat-bubble > div:last-child::after {
  left: auto;
  right: -11px;
  border-bottom-color: color-mix(in srgb, var(--theme-color) 55%, #5d6b7a);
  background: radial-gradient(ellipse 11px 13px at 100% 0, transparent 91%, color-mix(in srgb, var(--theme-color) 55%, #5d6b7a) 92%, color-mix(in srgb, var(--theme-color) 55%, #5d6b7a) 99%, transparent 101%), linear-gradient(color-mix(in srgb, var(--theme-color) 65%, #fff), var(--theme-color));
  -webkit-mask: radial-gradient(ellipse 11px 13px at 100% 0, transparent 90%, #000 92%);
  mask: radial-gradient(ellipse 11px 13px at 100% 0, transparent 90%, #000 92%);
}
/* 我的靠右 */
.chat-message-row.is-user .chat-bubble {
  text-align: right;
}
/* 名字：我的不用写；他的留着（群聊才分得出是谁），时间挪到泡泡下面 */
.chat-message-row.is-user > .chat-message-head,
.chat-message-row > .chat-message-head .chat-message-time {
  display: none;
}
.chat-message-row > .chat-message-head {
  margin: 0 0 1px 8px;
  font-size: 10px;
}
/* 时间和已读：小小的放在泡泡下面 */
.chat-bubble-wrap > .chat-bubble-time {
  order: 3;
  flex: 0 0 100%;
  justify-content: flex-start;
  align-items: center;
  gap: 3px;
  margin: 1px 0 2px 10px;
  font-size: 9px;
}
.chat-message-row.is-user .chat-bubble-wrap > .chat-bubble-time {
  justify-content: flex-end;
  margin: 1px 10px 2px 0;
}
/* 头像：圆圆的白边 */
.chat-message-mini-avatar {
  width: 30px;
  height: 30px;
  border: 2px solid #fff;
  border-radius: 50%;
  box-shadow: 0 1px 3px rgba(60, 80, 110, .3);
}
/* 我的不放头像 */
.chat-message-row.is-user {
  padding: 3px 12px 5px 48px;
}
.chat-message-row.is-user > .chat-message-mini-avatar {
  display: none;
}` }
];
