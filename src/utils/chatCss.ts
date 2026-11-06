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
  { name: '旧 iPhone', css: `/* 复古玻璃泡泡：他的灰色、我的跟着主题色；弯弯的小尾巴跟外框连在一起，字多字少都拉得开 */
.chat-message-row .chat-bubble > div:last-child {
  position: relative;
  isolation: isolate;
  display: inline-block;
  max-width: calc(100% - 1em);
  margin: 2px 0 2px .7em;
  padding: .4em .65em .42em;
  color: #3f373d;
  text-shadow: 0 1px 0 rgba(255, 255, 255, .45);
  text-align: left;
}
/* 他的：灰色泡泡（一张图的九宫格，中间跟着字拉长） */
.chat-message-row .chat-bubble > div:last-child::before {
  content: '';
  position: absolute;
  z-index: -1;
  inset: 0 0 0 -.34em;
  border-style: solid;
  border-color: transparent;
  border-width: .83em 1.11em .83em 1.33em;
  border-image: url("data:image/svg+xml,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%2280%22%20height%3D%2240%22%20viewBox%3D%220%200%2080%2040%22%3E%3Cdefs%3E%3ClinearGradient%20id%3D%22f%22%20x1%3D%220%22%20y1%3D%220%22%20x2%3D%220%22%20y2%3D%221%22%3E%3Cstop%20stop-color%3D%22%23f7f6f5%22%2F%3E%3Cstop%20offset%3D%22.4%22%20stop-color%3D%22%23f0efee%22%2F%3E%3Cstop%20offset%3D%22.73%22%20stop-color%3D%22%23e8e7e5%22%2F%3E%3Cstop%20offset%3D%221%22%20stop-color%3D%22%23f8f8f5%22%2F%3E%3C%2FlinearGradient%3E%3C%2Fdefs%3E%3Cpath%20d%3D%22M27%201H59C69.5%201%2078%209.5%2078%2020S69.5%2039%2059%2039H27C20.8%2039%2015.5%2036.6%2012.2%2032.2C9.8%2034.5%206.6%2035.9%203.7%2035.4C3.3%2035.3%203.2%2035%203.6%2034.7C6.2%2032.9%207.9%2030.4%208.6%2027.2C7.6%2024.9%207%2022.5%207%2020C7%209.5%2016.5%201%2027%201Z%22%20fill%3D%22url%28%23f%29%22%20stroke%3D%22%23aaa7aa%22%20stroke-width%3D%221.1%22%2F%3E%3Cpath%20d%3D%22M27%202.4H59C64.5%202.4%2069.4%204.8%2072.6%208.8C66%2012.3%2020%2013.3%2012.5%2011C15.8%205.8%2021%202.4%2027%202.4Z%22%20fill%3D%22white%22%20opacity%3D%220.36%22%2F%3E%3Cpath%20d%3D%22M14%2032.2C17.3%2035.9%2022.3%2037.6%2027%2037.6H59C64.5%2037.6%2069.8%2035.1%2073%2030.8%22%20fill%3D%22none%22%20stroke%3D%22white%22%20stroke-opacity%3D%22.57%22%20stroke-width%3D%221%22%2F%3E%3C%2Fsvg%3E") 15 20 15 24 fill / / 0 stretch;
  filter: drop-shadow(0 1.4px 1px rgba(126, 136, 155, .28));
  pointer-events: none;
}
/* 我的：靠右，同一个形状翻过来，底色用主题色 */
.chat-message-row.is-user .chat-bubble {
  text-align: right;
}
.chat-message-row.is-user .chat-bubble > div:last-child {
  margin: 2px .7em 2px 0;
}
.chat-message-row.is-user .chat-bubble > div:last-child::before {
  inset: 0 -.34em 0 0;
  transform: scaleX(-1);
  border: 0;
  border-image: none;
  background: linear-gradient(color-mix(in srgb, var(--theme-color) 85%, #8aa0bd), color-mix(in srgb, var(--theme-color) 70%, #fff) 40%, color-mix(in srgb, var(--theme-color) 50%, #fff) 73%, color-mix(in srgb, var(--theme-color) 30%, #fff));
  -webkit-mask-box-image: url("data:image/svg+xml,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%2280%22%20height%3D%2240%22%20viewBox%3D%220%200%2080%2040%22%3E%3Cpath%20d%3D%22M27%201H59C69.5%201%2078%209.5%2078%2020S69.5%2039%2059%2039H27C20.8%2039%2015.5%2036.6%2012.2%2032.2C9.8%2034.5%206.6%2035.9%203.7%2035.4C3.3%2035.3%203.2%2035%203.6%2034.7C6.2%2032.9%207.9%2030.4%208.6%2027.2C7.6%2024.9%207%2022.5%207%2020C7%209.5%2016.5%201%2027%201Z%22%20fill%3D%22black%22%2F%3E%3C%2Fsvg%3E") 15 20 15 24 / .83em 1.11em .83em 1.33em stretch;
  filter: none;
}
/* 我的：外框和亮光叠在上面 */
.chat-message-row.is-user .chat-bubble > div:last-child::after {
  content: '';
  position: absolute;
  z-index: -1;
  inset: 0 -.34em 0 0;
  transform: scaleX(-1);
  border-style: solid;
  border-color: transparent;
  border-width: .83em 1.11em .83em 1.33em;
  border-image: url("data:image/svg+xml,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%2280%22%20height%3D%2240%22%20viewBox%3D%220%200%2080%2040%22%3E%3Cpath%20d%3D%22M27%201H59C69.5%201%2078%209.5%2078%2020S69.5%2039%2059%2039H27C20.8%2039%2015.5%2036.6%2012.2%2032.2C9.8%2034.5%206.6%2035.9%203.7%2035.4C3.3%2035.3%203.2%2035%203.6%2034.7C6.2%2032.9%207.9%2030.4%208.6%2027.2C7.6%2024.9%207%2022.5%207%2020C7%209.5%2016.5%201%2027%201Z%22%20fill%3D%22none%22%20stroke%3D%22%233c4a5c%22%20stroke-opacity%3D%22.4%22%20stroke-width%3D%221.1%22%2F%3E%3Cpath%20d%3D%22M27%202.4H59C64.5%202.4%2069.4%204.8%2072.6%208.8C66%2012.3%2020%2013.3%2012.5%2011C15.8%205.8%2021%202.4%2027%202.4Z%22%20fill%3D%22white%22%20opacity%3D%220.31%22%2F%3E%3Cpath%20d%3D%22M14%2032.2C17.3%2035.9%2022.3%2037.6%2027%2037.6H59C64.5%2037.6%2069.8%2035.1%2073%2030.8%22%20fill%3D%22none%22%20stroke%3D%22white%22%20stroke-opacity%3D%22.57%22%20stroke-width%3D%221%22%2F%3E%3C%2Fsvg%3E") 15 20 15 24 fill / / 0 stretch;
  filter: drop-shadow(0 1.4px 1px rgba(126, 136, 155, .28));
  pointer-events: none;
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
