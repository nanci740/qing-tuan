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
    ['#chatRoomView { --cr-bg: ; }', '聊天室底色'], ['#chatRoomView { --theme-color: ; }', '顶栏、按钮、在线圆点（这个聊天室自己的主题色，泡泡示例也会跟着）'], ['#chatRoomView { --cr-line: ; }', '框线'],
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
  --theme-color: #e3c6b0; /* 顶栏、按钮、在线圆点（这个聊天室自己的主题色） */
  --cr-line: #c9b3a2;    /* 框线 */
  --cr-title: #6b5a4e;   /* 文字 */
  --cr-peer: #b07d62;    /* 他的名字 */
  --cr-self: #8c9a6e;    /* 我的名字 */
}` },
  { name: '旧 iPhone', css: `/* 复古玻璃泡泡：他的灰色、我的跟着主题色；弯弯的小尾巴跟外框连在一起，字多字少都拉得开 */
.chat-message-row .chat-bubble > div:last-child:not([class]),
.chat-message-row .chat-bubble--voice {
  position: relative;
  isolation: isolate;
  display: inline-block;
  max-width: calc(100% - 1em);
  /* 上面多空一点，一行字的泡泡跟头像中间对齐（头像 30px 高） */
  margin: calc(2px + max(0px, 15px - 1.21em)) 0 2px .7em;
  padding: .4em .65em .42em;
  color: #3f373d;
  text-shadow: 0 1px 0 rgba(255, 255, 255, .45);
  text-align: left;
}
/* 他的：灰色泡泡（一张图的九宫格，中间跟着字拉长） */
.chat-message-row .chat-bubble > div:last-child:not([class])::before,
.chat-message-row .chat-bubble--voice::before {
  content: '';
  position: absolute;
  z-index: -1;
  inset: 0 0 0 -.34em;
  border-style: solid;
  border-color: transparent;
  border-width: .83em 1.11em .83em 1.33em;
  border-image: url("data:image/svg+xml,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%2280%22%20height%3D%2240%22%20viewBox%3D%220%200%2080%2040%22%3E%3Cdefs%3E%3ClinearGradient%20id%3D%22h%22%20x1%3D%220%22%20y1%3D%220%22%20x2%3D%220%22%20y2%3D%221%22%3E%3Cstop%20stop-color%3D%22%23fff%22%20stop-opacity%3D%22.96%22%2F%3E%3Cstop%20offset%3D%22.55%22%20stop-color%3D%22%23fff%22%20stop-opacity%3D%22.7%22%2F%3E%3Cstop%20offset%3D%221%22%20stop-color%3D%22%23fff%22%20stop-opacity%3D%22.22%22%2F%3E%3C%2FlinearGradient%3E%3ClinearGradient%20id%3D%22g%22%20x1%3D%220%22%20y1%3D%220%22%20x2%3D%220%22%20y2%3D%221%22%3E%3Cstop%20stop-color%3D%22%23fff%22%20stop-opacity%3D%220%22%2F%3E%3Cstop%20offset%3D%221%22%20stop-color%3D%22%23fff%22%20stop-opacity%3D%22.75%22%2F%3E%3C%2FlinearGradient%3E%3ClinearGradient%20id%3D%22f%22%20x1%3D%220%22%20y1%3D%220%22%20x2%3D%220%22%20y2%3D%221%22%3E%3Cstop%20stop-color%3D%22%23cdcdd0%22%2F%3E%3Cstop%20offset%3D%22.5%22%20stop-color%3D%22%23e6e6e8%22%2F%3E%3Cstop%20offset%3D%221%22%20stop-color%3D%22%23f4f4f5%22%2F%3E%3C%2FlinearGradient%3E%3C%2Fdefs%3E%3Cpath%20d%3D%22M27%201H59C69.5%201%2078%209.5%2078%2020S69.5%2039%2059%2039H27C20.8%2039%2015.5%2036.6%2012.2%2032.2C9.8%2034.5%206.6%2035.9%203.7%2035.4C3.3%2035.3%203.2%2035%203.6%2034.7C6.2%2032.9%207.9%2030.4%208.6%2027.2C7.6%2024.9%207%2022.5%207%2020C7%209.5%2016.5%201%2027%201Z%22%20fill%3D%22url%28%23f%29%22%20stroke%3D%22%239c9a9e%22%20stroke-width%3D%221.1%22%2F%3E%3Crect%20x%3D%2215.5%22%20y%3D%223.4%22%20width%3D%2254%22%20height%3D%2215%22%20rx%3D%227.5%22%20fill%3D%22url%28%23h%29%22%2F%3E%3Crect%20x%3D%2218%22%20y%3D%2225%22%20width%3D%2249%22%20height%3D%2211%22%20rx%3D%225.5%22%20fill%3D%22url%28%23g%29%22%2F%3E%3C%2Fsvg%3E") 15 20 15 24 fill / / 0 stretch;
  filter: drop-shadow(0 1.4px 1px rgba(126, 136, 155, .28));
  pointer-events: none;
}
/* 我的：靠右，同一个形状翻过来，底色用主题色 */
.chat-message-row.is-user .chat-bubble {
  text-align: right;
}
.chat-message-row.is-user .chat-bubble > div:last-child:not([class]),
.chat-message-row.is-user .chat-bubble--voice {
  margin: 2px .7em 2px 0;
}
.chat-message-row.is-user .chat-bubble > div:last-child:not([class])::before,
.chat-message-row.is-user .chat-bubble--voice::before {
  inset: 0 -.34em 0 0;
  transform: scaleX(-1);
  border: 0;
  border-image: none;
  background: linear-gradient(color-mix(in srgb, var(--theme-color) 70%, #4f6a8c), color-mix(in srgb, var(--theme-color) 80%, #fff) 45%, color-mix(in srgb, var(--theme-color) 45%, #fff));
  -webkit-mask-box-image: url("data:image/svg+xml,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%2280%22%20height%3D%2240%22%20viewBox%3D%220%200%2080%2040%22%3E%3Cpath%20d%3D%22M27%201H59C69.5%201%2078%209.5%2078%2020S69.5%2039%2059%2039H27C20.8%2039%2015.5%2036.6%2012.2%2032.2C9.8%2034.5%206.6%2035.9%203.7%2035.4C3.3%2035.3%203.2%2035%203.6%2034.7C6.2%2032.9%207.9%2030.4%208.6%2027.2C7.6%2024.9%207%2022.5%207%2020C7%209.5%2016.5%201%2027%201Z%22%20fill%3D%22black%22%2F%3E%3C%2Fsvg%3E") 15 20 15 24 / .83em 1.11em .83em 1.33em stretch;
  filter: none;
}
/* 我的：外框和亮光叠在上面 */
.chat-message-row.is-user .chat-bubble > div:last-child:not([class])::after,
.chat-message-row.is-user .chat-bubble--voice::after {
  content: '';
  position: absolute;
  z-index: -1;
  inset: 0 -.34em 0 0;
  transform: scaleX(-1);
  border-style: solid;
  border-color: transparent;
  border-width: .83em 1.11em .83em 1.33em;
  border-image: url("data:image/svg+xml,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%2280%22%20height%3D%2240%22%20viewBox%3D%220%200%2080%2040%22%3E%3Cdefs%3E%3ClinearGradient%20id%3D%22h%22%20x1%3D%220%22%20y1%3D%220%22%20x2%3D%220%22%20y2%3D%221%22%3E%3Cstop%20stop-color%3D%22%23fff%22%20stop-opacity%3D%22.96%22%2F%3E%3Cstop%20offset%3D%22.55%22%20stop-color%3D%22%23fff%22%20stop-opacity%3D%22.7%22%2F%3E%3Cstop%20offset%3D%221%22%20stop-color%3D%22%23fff%22%20stop-opacity%3D%22.22%22%2F%3E%3C%2FlinearGradient%3E%3ClinearGradient%20id%3D%22g%22%20x1%3D%220%22%20y1%3D%220%22%20x2%3D%220%22%20y2%3D%221%22%3E%3Cstop%20stop-color%3D%22%23fff%22%20stop-opacity%3D%220%22%2F%3E%3Cstop%20offset%3D%221%22%20stop-color%3D%22%23fff%22%20stop-opacity%3D%22.75%22%2F%3E%3C%2FlinearGradient%3E%3C%2Fdefs%3E%3Crect%20x%3D%2215.5%22%20y%3D%223.4%22%20width%3D%2254%22%20height%3D%2215%22%20rx%3D%227.5%22%20fill%3D%22url%28%23h%29%22%2F%3E%3Crect%20x%3D%2218%22%20y%3D%2225%22%20width%3D%2249%22%20height%3D%2211%22%20rx%3D%225.5%22%20fill%3D%22url%28%23g%29%22%2F%3E%3Cpath%20d%3D%22M27%201H59C69.5%201%2078%209.5%2078%2020S69.5%2039%2059%2039H27C20.8%2039%2015.5%2036.6%2012.2%2032.2C9.8%2034.5%206.6%2035.9%203.7%2035.4C3.3%2035.3%203.2%2035%203.6%2034.7C6.2%2032.9%207.9%2030.4%208.6%2027.2C7.6%2024.9%207%2022.5%207%2020C7%209.5%2016.5%201%2027%201Z%22%20fill%3D%22none%22%20stroke%3D%22%232f3e52%22%20stroke-opacity%3D%22.45%22%20stroke-width%3D%221.1%22%2F%3E%3C%2Fsvg%3E") 15 20 15 24 fill / / 0 stretch;
  filter: drop-shadow(0 1.4px 1px rgba(126, 136, 155, .28));
  pointer-events: none;
}
/* 一两个字的泡泡：至少跟高度一样宽，不然泡泡的图会被挤变形；纯文字的把字放中间 */
.chat-message-row .chat-bubble > div:last-child:not([class]) {
  min-width: 2.42em;
}
.chat-message-row .chat-bubble > div:last-child:not([class]):not(:has(*)) {
  display: inline-flex;
  justify-content: center;
}
/* 语音：整条（含转文字）放进同一个泡泡里 */
.chat-message-row .chat-bubble--voice {
  flex: 0 1 auto;
  width: fit-content;
  text-align: left;
}
.chat-message-row.is-user .chat-bubble--voice {
  margin-left: auto;
}
.chat-message-row .chat-bubble--voice .chat-voice-length,
.chat-message-row .chat-bubble--voice .chat-voice-text-result,
.chat-message-row .chat-bubble--voice .chat-voice-wave,
.chat-message-row .chat-bubble--voice .chat-voice-control {
  color: inherit;
}
/* 语音和转文字中间一条很淡的分隔线（跟着字色，只留 18%） */
.chat-message-row .chat-bubble--voice .chat-voice-text-result:not(.is-collapsed) {
  margin-top: 3px;
  padding-top: 3px;
  border-top: 1px solid color-mix(in srgb, currentColor 18%, transparent);
}
/* 语音条的竖条和播放小三角跟着字色，浅色泡泡上才看得清；淡一点不抢字（想再淡把 .6 调小） */
.chat-message-row .chat-bubble--voice .chat-voice-wave,
.chat-message-row .chat-bubble--voice .chat-voice-control::before {
  opacity: .6;
}
.chat-message-row .chat-bubble--voice .chat-voice-control::before {
  border-left-color: currentColor;
}
.chat-message-row .chat-bubble--voice .chat-voice-control.is-playing::before {
  background: currentColor;
}
/* 照片、表情包、转账、红包、定位、聊天记录：我的靠右；定位的圆角和影子跟泡泡搭 */
.chat-message-row.is-user .chat-bubble > :is(.chat-pay, .chat-location, .chat-forward-record-card, .chat-photo, .chat-sticker) {
  margin-left: auto;
  margin-right: 0;
}
.chat-message-row .chat-bubble > :is(.chat-sticker, .chat-photo) {
  width: fit-content;
}
.chat-message-row .chat-bubble > .chat-location {
  border-radius: 8px;
  box-shadow: 0 1px 2px rgba(0, 0, 0, .12);
}
/* 转账、红包、亲属卡：一整块卡片，金额大字，种类和状态是底下的小灰字 */
.chat-message-row .chat-pay {
  border-radius: 8px;
}
.chat-message-row .chat-pay .chat-pay-top,
.chat-message-row .chat-pay .chat-pay-foot {
  background: none;
}
.chat-message-row .chat-pay .chat-pay-top {
  padding: 11px 11px 4px;
}
.chat-message-row .chat-pay .chat-pay-info b {
  font-family: inherit;
  font-size: 16px;
  font-weight: 700;
}
.chat-message-row .chat-pay.is-packet .chat-pay-info b {
  font-size: 13.5px;
}
.chat-message-row .chat-pay .chat-pay-info small {
  margin-top: 2px;
  font-size: 11px;
  font-weight: 600;
}
.chat-message-row .chat-pay .chat-pay-foot {
  padding: 2px 11px 8px;
  font-size: 9.5px;
}
/* 图标：亮面的小方块，上半截一道亮光，中间换成白色的图案（转账两个箭头、红包礼物盒、亲属卡一张卡） */
.chat-message-row .chat-pay .chat-pay-icon {
  position: relative;
  width: 34px;
  height: 34px;
  border-radius: 8px;
  filter: drop-shadow(0 1px 0 rgba(0, 0, 0, .18));
}
.chat-message-row .chat-pay .chat-pay-icon svg {
  display: none;
}
.chat-message-row .chat-pay .chat-pay-icon::before {
  content: '';
  position: absolute;
  left: 2px;
  right: 2px;
  top: 1.5px;
  height: 48%;
  border-radius: calc(8px - 1.5px) calc(8px - 1.5px) 3px 3px;
  background: linear-gradient(rgba(255, 255, 255, .9), rgba(255, 255, 255, .15));
}
.chat-message-row .chat-pay .chat-pay-icon::after {
  content: '';
  position: relative;
  width: 17px;
  height: 17px;
  background: currentColor;
  -webkit-mask: url("data:image/svg+xml,%3Csvg%20xmlns%3D%27http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%27%20viewBox%3D%270%200%2024%2024%27%20fill%3D%27none%27%20stroke%3D%27black%27%20stroke-width%3D%272.4%27%20stroke-linecap%3D%27round%27%20stroke-linejoin%3D%27round%27%3E%3Cpath%20d%3D%27M4%208h15l-4-4M20%2016H5l4%204%27%2F%3E%3C%2Fsvg%3E") center / contain no-repeat;
  mask: url("data:image/svg+xml,%3Csvg%20xmlns%3D%27http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%27%20viewBox%3D%270%200%2024%2024%27%20fill%3D%27none%27%20stroke%3D%27black%27%20stroke-width%3D%272.4%27%20stroke-linecap%3D%27round%27%20stroke-linejoin%3D%27round%27%3E%3Cpath%20d%3D%27M4%208h15l-4-4M20%2016H5l4%204%27%2F%3E%3C%2Fsvg%3E") center / contain no-repeat;
}
.chat-message-row .chat-pay.is-packet .chat-pay-icon::after {
  -webkit-mask-image: url("data:image/svg+xml,%3Csvg%20xmlns%3D%27http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%27%20viewBox%3D%270%200%2024%2024%27%20fill%3D%27none%27%20stroke%3D%27black%27%20stroke-width%3D%272.2%27%20stroke-linecap%3D%27round%27%20stroke-linejoin%3D%27round%27%3E%3Crect%20x%3D%274%27%20y%3D%279%27%20width%3D%2716%27%20height%3D%2711%27%20rx%3D%271%27%2F%3E%3Cpath%20d%3D%27M4%2013h16M12%209v11M12%209c-2-4-6-4-6-1s6%201%206%201c2-4%206-4%206-1s-6%201-6%201%27%2F%3E%3C%2Fsvg%3E");
  mask-image: url("data:image/svg+xml,%3Csvg%20xmlns%3D%27http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%27%20viewBox%3D%270%200%2024%2024%27%20fill%3D%27none%27%20stroke%3D%27black%27%20stroke-width%3D%272.2%27%20stroke-linecap%3D%27round%27%20stroke-linejoin%3D%27round%27%3E%3Crect%20x%3D%274%27%20y%3D%279%27%20width%3D%2716%27%20height%3D%2711%27%20rx%3D%271%27%2F%3E%3Cpath%20d%3D%27M4%2013h16M12%209v11M12%209c-2-4-6-4-6-1s6%201%206%201c2-4%206-4%206-1s-6%201-6%201%27%2F%3E%3C%2Fsvg%3E");
}
.chat-message-row .chat-pay.is-family .chat-pay-icon::after {
  -webkit-mask-image: url("data:image/svg+xml,%3Csvg%20xmlns%3D%27http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%27%20viewBox%3D%270%200%2024%2024%27%20fill%3D%27none%27%20stroke%3D%27black%27%20stroke-width%3D%272.2%27%20stroke-linecap%3D%27round%27%20stroke-linejoin%3D%27round%27%3E%3Crect%20x%3D%273%27%20y%3D%276%27%20width%3D%2718%27%20height%3D%2712%27%20rx%3D%272%27%2F%3E%3Cpath%20d%3D%27M3%2010h18M7%2015h4%27%2F%3E%3C%2Fsvg%3E");
  mask-image: url("data:image/svg+xml,%3Csvg%20xmlns%3D%27http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%27%20viewBox%3D%270%200%2024%2024%27%20fill%3D%27none%27%20stroke%3D%27black%27%20stroke-width%3D%272.2%27%20stroke-linecap%3D%27round%27%20stroke-linejoin%3D%27round%27%3E%3Crect%20x%3D%273%27%20y%3D%276%27%20width%3D%2718%27%20height%3D%2712%27%20rx%3D%272%27%2F%3E%3Cpath%20d%3D%27M3%2010h18M7%2015h4%27%2F%3E%3C%2Fsvg%3E");
}
/* 聊天记录：同一种卡片，字靠左 */
.chat-message-row .chat-bubble > .chat-forward-record-card {
  padding: 8px 11px 7px;
  border-radius: 8px;
  text-align: left;
}
.chat-message-row .chat-forward-record-title {
  font-size: 12px;
  color: #333;
}
.chat-message-row .chat-forward-record-preview {
  font-size: 10.5px;
  line-height: 1.6;
  color: #888;
}
.chat-message-row .chat-forward-record-footer {
  font-size: 9.5px;
  color: #9a9a9a;
}
/* 卡片颜色：淡淡的主题色，上浅下深；红包浓一点 */
.chat-message-row .chat-pay,
.chat-message-row .chat-bubble > .chat-forward-record-card {
  border: 1px solid color-mix(in srgb, var(--theme-color) 45%, #c9c9c9);
  background: linear-gradient(color-mix(in srgb, var(--theme-color) 12%, #fff), color-mix(in srgb, var(--theme-color) 38%, #fff));
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, .9), 0 1px 3px rgba(0, 0, 0, .14);
}
.chat-message-row .chat-pay.is-packet {
  border: 1px solid color-mix(in srgb, var(--theme-color) 60%, #b5b5b5);
  background: linear-gradient(color-mix(in srgb, var(--theme-color) 40%, #fff), color-mix(in srgb, var(--theme-color) 75%, #fff));
}
.chat-message-row .chat-pay .chat-pay-info b {
  color: #333;
}
.chat-message-row .chat-pay .chat-pay-info small {
  color: color-mix(in srgb, var(--theme-color) 35%, #5b4a50);
}
.chat-message-row .chat-pay .chat-pay-foot {
  color: #9a9a9a;
}
.chat-message-row .chat-pay .chat-pay-icon {
  color: #fff;
  background: radial-gradient(circle at 50% 120%, color-mix(in srgb, var(--theme-color) 60%, #fff), transparent 60%), linear-gradient(color-mix(in srgb, var(--theme-color) 68%, #8299ad), color-mix(in srgb, var(--theme-color) 78%, #a9bbcb));
  box-shadow: 0 1px 2px rgba(0, 0, 0, .25), inset 0 -1px 2px rgba(0, 0, 0, .08);
}
.chat-message-row .chat-forward-record-divider {
  border-top: 1px solid color-mix(in srgb, var(--theme-color) 40%, #ddd);
}
/* 引用：挪到泡泡下面，小小的灰底一块，不影响泡泡跟头像对齐 */
.chat-message-row .chat-bubble:has(> .chat-quoted-message) {
  display: flex;
  flex-direction: column;
}
.chat-message-row .chat-bubble:has(> .chat-quoted-message) > * {
  align-self: flex-start;
}
.chat-message-row.is-user .chat-bubble:has(> .chat-quoted-message) > * {
  align-self: flex-end;
}
.chat-message-row .chat-bubble > .chat-quoted-message {
  order: 2;
  display: -webkit-box;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
  overflow: hidden;
  max-width: calc(100% - 1.5em);
  margin: 3px .6em 0;
  padding: .25em .6em;
  border: 0;
  border-radius: 7px;
  background: rgba(0, 0, 0, .06);
  font-size: .9em;
  line-height: 1.45;
  text-align: left;
}
/* 翻译：泡泡下面一块淡淡的主题色底 */
.chat-message-row .chat-message-translation-card {
  flex: 0 1 auto;
  width: fit-content;
  max-width: calc(100% - 1.5em);
  margin: 3px .6em 0;
  padding: .3em .65em;
  border: 1px solid color-mix(in srgb, var(--theme-color) 35%, #d8d8d8);
  border-radius: 7px;
  background: color-mix(in srgb, var(--theme-color) 12%, #fff);
  color: #555;
}
.chat-message-row.is-user .chat-message-translation-card {
  margin-left: auto;
}
/* 名字不放，上面的时间也拿掉（时间挪到泡泡下面） */
.chat-message-row > .chat-message-head {
  display: none;
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
/* 群聊：他的名字小小的放在泡泡上面（才分得出是谁说的），泡泡贴着名字 */
:root:has(.cr-group-panel) .chat-message-row:not(.is-user) > .chat-message-head {
  display: flex;
  margin: 0 0 1px .9em;
  font-size: 10px;
}
:root:has(.cr-group-panel) .chat-message-row:not(.is-user) > .chat-message-head .chat-message-time {
  display: none;
}
:root:has(.cr-group-panel) .chat-message-row:not(.is-user) .chat-message-name {
  color: #999;
  font-weight: 400;
}
:root:has(.cr-group-panel) .chat-message-row:not(.is-user) .chat-bubble > div:last-child:not([class]),
:root:has(.cr-group-panel) .chat-message-row:not(.is-user) .chat-bubble--voice {
  margin-top: 0;
}
/* 置顶的图钉、收藏的 ♡ 紧跟在时间后面，不要被推到最旁边 */
.chat-bubble-time .chat-message-pin-indicator,
.chat-message-row[data-favorite="true"] .chat-bubble-time .chat-message-pin-indicator,
.chat-message-row[data-favorite="true"] .chat-bubble-time::after {
  margin: 0;
}
/* 我的：图标放在时间左边，时间一直贴着右边不被推走（顺序：图钉、♡、已编辑、时间、已读） */
.chat-message-row.is-user .chat-bubble-time .chat-message-pin-indicator {
  order: -3;
}
.chat-message-row.is-user[data-favorite="true"] .chat-bubble-time::after {
  order: -2;
}
.chat-message-row.is-user[data-edited="true"] .chat-bubble-time::before {
  order: -1;
  margin: 0 2px 0 0;
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
}` },
  { name: '无尾巴', css: `/* 复古玻璃泡泡（没有尾巴）：圆圆的胶囊，他的淡淡带一点主题色、我的跟着主题色 */
.chat-message-row .chat-bubble > div:last-child:not([class]),
.chat-message-row .chat-bubble--voice {
  position: relative;
  isolation: isolate;
  display: inline-block;
  max-width: calc(100% - 1em);
  /* 上面多空一点，一行字的泡泡跟头像中间对齐（头像 30px 高） */
  margin: calc(2px + max(0px, 15px - 1.21em)) 0 2px .2em;
  padding: .4em .65em .42em;
  color: #3f373d;
  text-shadow: 0 1px 0 rgba(255, 255, 255, .45);
  text-align: left;
}
/* 底色：胶囊形状剪出来，他的是很淡的主题色（想更白就把 36%、25%、15% 调小） */
.chat-message-row .chat-bubble > div:last-child:not([class])::before,
.chat-message-row .chat-bubble--voice::before {
  content: '';
  position: absolute;
  z-index: -1;
  inset: 0;
  background: linear-gradient(color-mix(in srgb, var(--theme-color) 36%, #cdcdd0), color-mix(in srgb, var(--theme-color) 25%, #e6e6e8) 50%, color-mix(in srgb, var(--theme-color) 15%, #f4f4f5));
  -webkit-mask-box-image: url("data:image/svg+xml,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%2280%22%20height%3D%2240%22%20viewBox%3D%220%200%2080%2040%22%3E%3Cpath%20d%3D%22M20%201H60C70.5%201%2079%209.5%2079%2020S70.5%2039%2060%2039H20C9.5%2039%201%2030.5%201%2020S9.5%201%2020%201Z%22%20fill%3D%22black%22%2F%3E%3C%2Fsvg%3E") 15 20 15 20 / .83em 1.11em .83em 1.11em stretch;
  pointer-events: none;
}
/* 外框和亮光叠在上面（一张图的九宫格，中间跟着字拉长） */
.chat-message-row .chat-bubble > div:last-child:not([class])::after,
.chat-message-row .chat-bubble--voice::after {
  content: '';
  position: absolute;
  z-index: -1;
  inset: 0;
  border-style: solid;
  border-color: transparent;
  border-width: .83em 1.11em .83em 1.11em;
  border-image: url("data:image/svg+xml,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%2280%22%20height%3D%2240%22%20viewBox%3D%220%200%2080%2040%22%3E%3Cdefs%3E%3ClinearGradient%20id%3D%22h%22%20x1%3D%220%22%20y1%3D%220%22%20x2%3D%220%22%20y2%3D%221%22%3E%3Cstop%20stop-color%3D%22%23fff%22%20stop-opacity%3D%22.96%22%2F%3E%3Cstop%20offset%3D%22.55%22%20stop-color%3D%22%23fff%22%20stop-opacity%3D%22.7%22%2F%3E%3Cstop%20offset%3D%221%22%20stop-color%3D%22%23fff%22%20stop-opacity%3D%22.22%22%2F%3E%3C%2FlinearGradient%3E%3ClinearGradient%20id%3D%22g%22%20x1%3D%220%22%20y1%3D%220%22%20x2%3D%220%22%20y2%3D%221%22%3E%3Cstop%20stop-color%3D%22%23fff%22%20stop-opacity%3D%220%22%2F%3E%3Cstop%20offset%3D%221%22%20stop-color%3D%22%23fff%22%20stop-opacity%3D%22.75%22%2F%3E%3C%2FlinearGradient%3E%3C%2Fdefs%3E%3Crect%20x%3D%229.5%22%20y%3D%223.4%22%20width%3D%2261%22%20height%3D%2215%22%20rx%3D%227.5%22%20fill%3D%22url%28%23h%29%22%2F%3E%3Crect%20x%3D%2212%22%20y%3D%2225%22%20width%3D%2256%22%20height%3D%2211%22%20rx%3D%225.5%22%20fill%3D%22url%28%23g%29%22%2F%3E%3Cpath%20d%3D%22M20%201H60C70.5%201%2079%209.5%2079%2020S70.5%2039%2060%2039H20C9.5%2039%201%2030.5%201%2020S9.5%201%2020%201Z%22%20fill%3D%22none%22%20stroke%3D%22%232f3e52%22%20stroke-opacity%3D%22.45%22%20stroke-width%3D%221.1%22%2F%3E%3C%2Fsvg%3E") 15 20 15 20 fill / / 0 stretch;
  filter: drop-shadow(0 1.4px 1px rgba(126, 136, 155, .28));
  pointer-events: none;
}
/* 我的：靠右，底色换成主题色 */
.chat-message-row.is-user .chat-bubble {
  text-align: right;
}
.chat-message-row.is-user .chat-bubble > div:last-child:not([class]),
.chat-message-row.is-user .chat-bubble--voice {
  margin: 2px .2em 2px 0;
}
.chat-message-row.is-user .chat-bubble > div:last-child:not([class])::before,
.chat-message-row.is-user .chat-bubble--voice::before {
  background: linear-gradient(color-mix(in srgb, var(--theme-color) 70%, #4f6a8c), color-mix(in srgb, var(--theme-color) 80%, #fff) 45%, color-mix(in srgb, var(--theme-color) 45%, #fff));
}
/* 一两个字的泡泡：至少跟高度一样宽，不然泡泡的图会被挤变形；纯文字的把字放中间 */
.chat-message-row .chat-bubble > div:last-child:not([class]) {
  min-width: 2.42em;
}
.chat-message-row .chat-bubble > div:last-child:not([class]):not(:has(*)) {
  display: inline-flex;
  justify-content: center;
}
/* 语音：整条（含转文字）放进同一个泡泡里 */
.chat-message-row .chat-bubble--voice {
  flex: 0 1 auto;
  width: fit-content;
  text-align: left;
}
.chat-message-row.is-user .chat-bubble--voice {
  margin-left: auto;
}
.chat-message-row .chat-bubble--voice .chat-voice-length,
.chat-message-row .chat-bubble--voice .chat-voice-text-result,
.chat-message-row .chat-bubble--voice .chat-voice-wave,
.chat-message-row .chat-bubble--voice .chat-voice-control {
  color: inherit;
}
/* 语音和转文字中间一条很淡的分隔线（跟着字色，只留 18%） */
.chat-message-row .chat-bubble--voice .chat-voice-text-result:not(.is-collapsed) {
  margin-top: 3px;
  padding-top: 3px;
  border-top: 1px solid color-mix(in srgb, currentColor 18%, transparent);
}
/* 语音条的竖条和播放小三角跟着字色，浅色泡泡上才看得清；淡一点不抢字（想再淡把 .6 调小） */
.chat-message-row .chat-bubble--voice .chat-voice-wave,
.chat-message-row .chat-bubble--voice .chat-voice-control::before {
  opacity: .6;
}
.chat-message-row .chat-bubble--voice .chat-voice-control::before {
  border-left-color: currentColor;
}
.chat-message-row .chat-bubble--voice .chat-voice-control.is-playing::before {
  background: currentColor;
}
/* 照片、表情包、转账、红包、定位、聊天记录：我的靠右；定位的圆角和影子跟泡泡搭 */
.chat-message-row.is-user .chat-bubble > :is(.chat-pay, .chat-location, .chat-forward-record-card, .chat-photo, .chat-sticker) {
  margin-left: auto;
  margin-right: 0;
}
.chat-message-row .chat-bubble > :is(.chat-sticker, .chat-photo) {
  width: fit-content;
}
.chat-message-row .chat-bubble > .chat-location {
  border-radius: 8px;
  box-shadow: 0 1px 2px rgba(0, 0, 0, .12);
}
/* 转账、红包、亲属卡：一整块卡片，金额大字，种类和状态是底下的小灰字 */
.chat-message-row .chat-pay {
  border-radius: 8px;
}
.chat-message-row .chat-pay .chat-pay-top,
.chat-message-row .chat-pay .chat-pay-foot {
  background: none;
}
.chat-message-row .chat-pay .chat-pay-top {
  padding: 11px 11px 4px;
}
.chat-message-row .chat-pay .chat-pay-info b {
  font-family: inherit;
  font-size: 16px;
  font-weight: 700;
}
.chat-message-row .chat-pay.is-packet .chat-pay-info b {
  font-size: 13.5px;
}
.chat-message-row .chat-pay .chat-pay-info small {
  margin-top: 2px;
  font-size: 11px;
  font-weight: 600;
}
.chat-message-row .chat-pay .chat-pay-foot {
  padding: 2px 11px 8px;
  font-size: 9.5px;
}
/* 图标：亮面的小方块，上半截一道亮光，中间换成白色的图案（转账两个箭头、红包礼物盒、亲属卡一张卡） */
.chat-message-row .chat-pay .chat-pay-icon {
  position: relative;
  width: 34px;
  height: 34px;
  border-radius: 8px;
  filter: drop-shadow(0 1px 0 rgba(0, 0, 0, .18));
}
.chat-message-row .chat-pay .chat-pay-icon svg {
  display: none;
}
.chat-message-row .chat-pay .chat-pay-icon::before {
  content: '';
  position: absolute;
  left: 2px;
  right: 2px;
  top: 1.5px;
  height: 48%;
  border-radius: calc(8px - 1.5px) calc(8px - 1.5px) 3px 3px;
  background: linear-gradient(rgba(255, 255, 255, .9), rgba(255, 255, 255, .15));
}
.chat-message-row .chat-pay .chat-pay-icon::after {
  content: '';
  position: relative;
  width: 17px;
  height: 17px;
  background: currentColor;
  -webkit-mask: url("data:image/svg+xml,%3Csvg%20xmlns%3D%27http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%27%20viewBox%3D%270%200%2024%2024%27%20fill%3D%27none%27%20stroke%3D%27black%27%20stroke-width%3D%272.4%27%20stroke-linecap%3D%27round%27%20stroke-linejoin%3D%27round%27%3E%3Cpath%20d%3D%27M4%208h15l-4-4M20%2016H5l4%204%27%2F%3E%3C%2Fsvg%3E") center / contain no-repeat;
  mask: url("data:image/svg+xml,%3Csvg%20xmlns%3D%27http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%27%20viewBox%3D%270%200%2024%2024%27%20fill%3D%27none%27%20stroke%3D%27black%27%20stroke-width%3D%272.4%27%20stroke-linecap%3D%27round%27%20stroke-linejoin%3D%27round%27%3E%3Cpath%20d%3D%27M4%208h15l-4-4M20%2016H5l4%204%27%2F%3E%3C%2Fsvg%3E") center / contain no-repeat;
}
.chat-message-row .chat-pay.is-packet .chat-pay-icon::after {
  -webkit-mask-image: url("data:image/svg+xml,%3Csvg%20xmlns%3D%27http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%27%20viewBox%3D%270%200%2024%2024%27%20fill%3D%27none%27%20stroke%3D%27black%27%20stroke-width%3D%272.2%27%20stroke-linecap%3D%27round%27%20stroke-linejoin%3D%27round%27%3E%3Crect%20x%3D%274%27%20y%3D%279%27%20width%3D%2716%27%20height%3D%2711%27%20rx%3D%271%27%2F%3E%3Cpath%20d%3D%27M4%2013h16M12%209v11M12%209c-2-4-6-4-6-1s6%201%206%201c2-4%206-4%206-1s-6%201-6%201%27%2F%3E%3C%2Fsvg%3E");
  mask-image: url("data:image/svg+xml,%3Csvg%20xmlns%3D%27http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%27%20viewBox%3D%270%200%2024%2024%27%20fill%3D%27none%27%20stroke%3D%27black%27%20stroke-width%3D%272.2%27%20stroke-linecap%3D%27round%27%20stroke-linejoin%3D%27round%27%3E%3Crect%20x%3D%274%27%20y%3D%279%27%20width%3D%2716%27%20height%3D%2711%27%20rx%3D%271%27%2F%3E%3Cpath%20d%3D%27M4%2013h16M12%209v11M12%209c-2-4-6-4-6-1s6%201%206%201c2-4%206-4%206-1s-6%201-6%201%27%2F%3E%3C%2Fsvg%3E");
}
.chat-message-row .chat-pay.is-family .chat-pay-icon::after {
  -webkit-mask-image: url("data:image/svg+xml,%3Csvg%20xmlns%3D%27http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%27%20viewBox%3D%270%200%2024%2024%27%20fill%3D%27none%27%20stroke%3D%27black%27%20stroke-width%3D%272.2%27%20stroke-linecap%3D%27round%27%20stroke-linejoin%3D%27round%27%3E%3Crect%20x%3D%273%27%20y%3D%276%27%20width%3D%2718%27%20height%3D%2712%27%20rx%3D%272%27%2F%3E%3Cpath%20d%3D%27M3%2010h18M7%2015h4%27%2F%3E%3C%2Fsvg%3E");
  mask-image: url("data:image/svg+xml,%3Csvg%20xmlns%3D%27http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%27%20viewBox%3D%270%200%2024%2024%27%20fill%3D%27none%27%20stroke%3D%27black%27%20stroke-width%3D%272.2%27%20stroke-linecap%3D%27round%27%20stroke-linejoin%3D%27round%27%3E%3Crect%20x%3D%273%27%20y%3D%276%27%20width%3D%2718%27%20height%3D%2712%27%20rx%3D%272%27%2F%3E%3Cpath%20d%3D%27M3%2010h18M7%2015h4%27%2F%3E%3C%2Fsvg%3E");
}
/* 聊天记录：同一种卡片，字靠左 */
.chat-message-row .chat-bubble > .chat-forward-record-card {
  padding: 8px 11px 7px;
  border-radius: 8px;
  text-align: left;
}
.chat-message-row .chat-forward-record-title {
  font-size: 12px;
  color: #333;
}
.chat-message-row .chat-forward-record-preview {
  font-size: 10.5px;
  line-height: 1.6;
  color: #888;
}
.chat-message-row .chat-forward-record-footer {
  font-size: 9.5px;
  color: #9a9a9a;
}
/* 卡片颜色：淡淡的主题色，上浅下深；红包浓一点 */
.chat-message-row .chat-pay,
.chat-message-row .chat-bubble > .chat-forward-record-card {
  border: 1px solid color-mix(in srgb, var(--theme-color) 45%, #c9c9c9);
  background: linear-gradient(color-mix(in srgb, var(--theme-color) 12%, #fff), color-mix(in srgb, var(--theme-color) 38%, #fff));
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, .9), 0 1px 3px rgba(0, 0, 0, .14);
}
.chat-message-row .chat-pay.is-packet {
  border: 1px solid color-mix(in srgb, var(--theme-color) 60%, #b5b5b5);
  background: linear-gradient(color-mix(in srgb, var(--theme-color) 40%, #fff), color-mix(in srgb, var(--theme-color) 75%, #fff));
}
.chat-message-row .chat-pay .chat-pay-info b {
  color: #333;
}
.chat-message-row .chat-pay .chat-pay-info small {
  color: color-mix(in srgb, var(--theme-color) 35%, #5b4a50);
}
.chat-message-row .chat-pay .chat-pay-foot {
  color: #9a9a9a;
}
.chat-message-row .chat-pay .chat-pay-icon {
  color: #fff;
  background: radial-gradient(circle at 50% 120%, color-mix(in srgb, var(--theme-color) 60%, #fff), transparent 60%), linear-gradient(color-mix(in srgb, var(--theme-color) 68%, #8299ad), color-mix(in srgb, var(--theme-color) 78%, #a9bbcb));
  box-shadow: 0 1px 2px rgba(0, 0, 0, .25), inset 0 -1px 2px rgba(0, 0, 0, .08);
}
.chat-message-row .chat-forward-record-divider {
  border-top: 1px solid color-mix(in srgb, var(--theme-color) 40%, #ddd);
}
/* 引用：挪到泡泡下面，小小的灰底一块，不影响泡泡跟头像对齐 */
.chat-message-row .chat-bubble:has(> .chat-quoted-message) {
  display: flex;
  flex-direction: column;
}
.chat-message-row .chat-bubble:has(> .chat-quoted-message) > * {
  align-self: flex-start;
}
.chat-message-row.is-user .chat-bubble:has(> .chat-quoted-message) > * {
  align-self: flex-end;
}
.chat-message-row .chat-bubble > .chat-quoted-message {
  order: 2;
  display: -webkit-box;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
  overflow: hidden;
  max-width: calc(100% - 1.5em);
  margin: 3px .6em 0;
  padding: .25em .6em;
  border: 0;
  border-radius: 7px;
  background: rgba(0, 0, 0, .06);
  font-size: .9em;
  line-height: 1.45;
  text-align: left;
}
/* 翻译：泡泡下面一块淡淡的主题色底 */
.chat-message-row .chat-message-translation-card {
  flex: 0 1 auto;
  width: fit-content;
  max-width: calc(100% - 1.5em);
  margin: 3px .6em 0;
  padding: .3em .65em;
  border: 1px solid color-mix(in srgb, var(--theme-color) 35%, #d8d8d8);
  border-radius: 7px;
  background: color-mix(in srgb, var(--theme-color) 12%, #fff);
  color: #555;
}
.chat-message-row.is-user .chat-message-translation-card {
  margin-left: auto;
}
/* 名字不放，上面的时间也拿掉（时间挪到泡泡下面） */
.chat-message-row > .chat-message-head {
  display: none;
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
/* 群聊：他的名字小小的放在泡泡上面（才分得出是谁说的），泡泡贴着名字 */
:root:has(.cr-group-panel) .chat-message-row:not(.is-user) > .chat-message-head {
  display: flex;
  margin: 0 0 1px .6em;
  font-size: 10px;
}
:root:has(.cr-group-panel) .chat-message-row:not(.is-user) > .chat-message-head .chat-message-time {
  display: none;
}
:root:has(.cr-group-panel) .chat-message-row:not(.is-user) .chat-message-name {
  color: #999;
  font-weight: 400;
}
:root:has(.cr-group-panel) .chat-message-row:not(.is-user) .chat-bubble > div:last-child:not([class]),
:root:has(.cr-group-panel) .chat-message-row:not(.is-user) .chat-bubble--voice {
  margin-top: 0;
}
/* 置顶的图钉、收藏的 ♡ 紧跟在时间后面，不要被推到最旁边 */
.chat-bubble-time .chat-message-pin-indicator,
.chat-message-row[data-favorite="true"] .chat-bubble-time .chat-message-pin-indicator,
.chat-message-row[data-favorite="true"] .chat-bubble-time::after {
  margin: 0;
}
/* 我的：图标放在时间左边，时间一直贴着右边不被推走（顺序：图钉、♡、已编辑、时间、已读） */
.chat-message-row.is-user .chat-bubble-time .chat-message-pin-indicator {
  order: -3;
}
.chat-message-row.is-user[data-favorite="true"] .chat-bubble-time::after {
  order: -2;
}
.chat-message-row.is-user[data-edited="true"] .chat-bubble-time::before {
  order: -1;
  margin: 0 2px 0 0;
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
}` },
  { name: '复古方框', css: `/* 复古方框泡泡：他的深色（跟着主题色）、我的白色；尖尖的小尾巴对着第一行字（一行字时就是中间、对着头像）
   泡泡和尾巴是一整块剪出来的：外面一层是框线，里面一层是渐层，影子一起打 */
.chat-message-row .chat-bubble > div:last-child:not([class]),
.chat-message-row .chat-bubble--voice {
  position: relative;
  isolation: isolate;
  display: inline-block;
  max-width: calc(100% - 1em);
  /* 上面多空一点，一行字的泡泡跟头像中间对齐（头像 30px 高） */
  margin: calc(2px + max(0px, 15px - 1.3em)) 0 2px;
  padding: .5em .8em .5em calc(.8em + 7px);
  filter: drop-shadow(0 1px 1.5px rgba(0, 0, 0, .3));
  color: #fff;
  text-shadow: 0 -1px 0 rgba(0, 0, 0, .35);
  text-align: left;
}
.chat-message-row .chat-bubble > div:last-child:not([class])::before,
.chat-message-row .chat-bubble > div:last-child:not([class])::after,
.chat-message-row .chat-bubble--voice::before,
.chat-message-row .chat-bubble--voice::after {
  content: '';
  position: absolute;
  z-index: -1;
  pointer-events: none;
}
/* 外面一层：框线的颜色 */
.chat-message-row .chat-bubble > div:last-child:not([class])::before,
.chat-message-row .chat-bubble--voice::before {
  inset: 0;
  background: color-mix(in srgb, var(--theme-color) 30%, #3b3b3b);
  clip-path: polygon(7px 3px, 7.9px .9px, 10px 0, calc(100% - 3px) 0, calc(100% - .9px) .9px, 100% 3px, 100% calc(100% - 3px), calc(100% - .9px) calc(100% - .9px), calc(100% - 3px) 100%, 10px 100%, 7.9px calc(100% - .9px), 7px calc(100% - 3px), 7px calc(1.3em + 6px), 0 1.3em, 7px calc(1.3em - 6px));
}
/* 里面一层：缩进 1px，渐层连着尾巴一起，上面一道亮线 */
.chat-message-row .chat-bubble > div:last-child:not([class])::after,
.chat-message-row .chat-bubble--voice::after {
  inset: 1px;
  background: linear-gradient(color-mix(in srgb, var(--theme-color) 35%, #858585), color-mix(in srgb, var(--theme-color) 28%, #4d4d4d));
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, .35);
  clip-path: polygon(7px 2px, 7.6px .6px, 9px 0, calc(100% - 2px) 0, calc(100% - .6px) .6px, 100% 2px, 100% calc(100% - 2px), calc(100% - .6px) calc(100% - .6px), calc(100% - 2px) 100%, 9px 100%, 7.6px calc(100% - .6px), 7px calc(100% - 2px), 7px calc(1.3em + 4.5px), .55px calc(1.3em - 1px), 7px calc(1.3em - 6.5px));
}
/* 我的：白色，靠右，同一个形状翻过来 */
.chat-message-row.is-user .chat-bubble {
  text-align: right;
}
.chat-message-row.is-user .chat-bubble > div:last-child:not([class]),
.chat-message-row.is-user .chat-bubble--voice {
  padding: .5em calc(.8em + 7px) .5em .8em;
  filter: drop-shadow(0 1px 1.5px rgba(0, 0, 0, .2));
  color: #333;
  text-shadow: 0 1px 0 #fff;
}
.chat-message-row.is-user .chat-bubble > div:last-child:not([class])::before,
.chat-message-row.is-user .chat-bubble--voice::before {
  background: #c4c4c4;
  clip-path: polygon(calc(100% - 7px) 3px, calc(100% - 7.9px) .9px, calc(100% - 10px) 0, 3px 0, .9px .9px, 0 3px, 0 calc(100% - 3px), .9px calc(100% - .9px), 3px 100%, calc(100% - 10px) 100%, calc(100% - 7.9px) calc(100% - .9px), calc(100% - 7px) calc(100% - 3px), calc(100% - 7px) calc(1.3em + 6px), 100% 1.3em, calc(100% - 7px) calc(1.3em - 6px));
}
.chat-message-row.is-user .chat-bubble > div:last-child:not([class])::after,
.chat-message-row.is-user .chat-bubble--voice::after {
  background: linear-gradient(#ffffff, #f5f5f5 50%, #e6e6e6);
  box-shadow: inset 0 1px 0 #fff;
  clip-path: polygon(calc(100% - 7px) 2px, calc(100% - 7.6px) .6px, calc(100% - 9px) 0, 2px 0, .6px .6px, 0 2px, 0 calc(100% - 2px), .6px calc(100% - .6px), 2px 100%, calc(100% - 9px) 100%, calc(100% - 7.6px) calc(100% - .6px), calc(100% - 7px) calc(100% - 2px), calc(100% - 7px) calc(1.3em + 4.5px), calc(100% - .55px) calc(1.3em - 1px), calc(100% - 7px) calc(1.3em - 6.5px));
}
/* 一两个字的泡泡：至少跟高度一样宽，不然泡泡的图会被挤变形；纯文字的把字放中间 */
.chat-message-row .chat-bubble > div:last-child:not([class]) {
  min-width: calc(2.6em + 7px);
}
.chat-message-row .chat-bubble > div:last-child:not([class]):not(:has(*)) {
  display: inline-flex;
  justify-content: center;
}
/* 语音：整条（含转文字）放进同一个泡泡里 */
.chat-message-row .chat-bubble--voice {
  flex: 0 1 auto;
  width: fit-content;
  text-align: left;
}
.chat-message-row.is-user .chat-bubble--voice {
  margin-left: auto;
}
.chat-message-row .chat-bubble--voice .chat-voice-length,
.chat-message-row .chat-bubble--voice .chat-voice-text-result,
.chat-message-row .chat-bubble--voice .chat-voice-wave,
.chat-message-row .chat-bubble--voice .chat-voice-control {
  color: inherit;
}
/* 语音和转文字中间一条很淡的分隔线（跟着字色，只留 18%） */
.chat-message-row .chat-bubble--voice .chat-voice-text-result:not(.is-collapsed) {
  margin-top: 3px;
  padding-top: 3px;
  border-top: 1px solid color-mix(in srgb, currentColor 18%, transparent);
}
/* 语音条的竖条和播放小三角跟着字色，浅色泡泡上才看得清；淡一点不抢字（想再淡把 .6 调小） */
.chat-message-row .chat-bubble--voice .chat-voice-wave,
.chat-message-row .chat-bubble--voice .chat-voice-control::before {
  opacity: .6;
}
.chat-message-row .chat-bubble--voice .chat-voice-control::before {
  border-left-color: currentColor;
}
.chat-message-row .chat-bubble--voice .chat-voice-control.is-playing::before {
  background: currentColor;
}
/* 照片、表情包、转账、红包、定位、聊天记录：我的靠右；定位的圆角和影子跟泡泡搭 */
.chat-message-row.is-user .chat-bubble > :is(.chat-pay, .chat-location, .chat-forward-record-card, .chat-photo, .chat-sticker) {
  margin-left: auto;
  margin-right: 0;
}
.chat-message-row .chat-bubble > :is(.chat-sticker, .chat-photo) {
  width: fit-content;
}
.chat-message-row .chat-bubble > .chat-location {
  border-radius: 3px;
  box-shadow: 0 1px 2px rgba(0, 0, 0, .12);
}
/* 转账、红包、亲属卡：一整块卡片，金额大字，种类和状态是底下的小灰字 */
.chat-message-row .chat-pay {
  border-radius: 3px;
}
.chat-message-row .chat-pay .chat-pay-top,
.chat-message-row .chat-pay .chat-pay-foot {
  background: none;
}
.chat-message-row .chat-pay .chat-pay-top {
  padding: 11px 11px 4px;
}
.chat-message-row .chat-pay .chat-pay-info b {
  font-family: inherit;
  font-size: 16px;
  font-weight: 700;
}
.chat-message-row .chat-pay.is-packet .chat-pay-info b {
  font-size: 13.5px;
}
.chat-message-row .chat-pay .chat-pay-info small {
  margin-top: 2px;
  font-size: 11px;
  font-weight: 600;
}
.chat-message-row .chat-pay .chat-pay-foot {
  padding: 2px 11px 8px;
  font-size: 9.5px;
}
/* 图标：亮面的小方块，上半截一道亮光，中间换成白色的图案（转账两个箭头、红包礼物盒、亲属卡一张卡） */
.chat-message-row .chat-pay .chat-pay-icon {
  position: relative;
  width: 34px;
  height: 34px;
  border-radius: 4px;
  filter: drop-shadow(0 1px 0 rgba(0, 0, 0, .18));
}
.chat-message-row .chat-pay .chat-pay-icon svg {
  display: none;
}
.chat-message-row .chat-pay .chat-pay-icon::before {
  content: '';
  position: absolute;
  left: 2px;
  right: 2px;
  top: 1.5px;
  height: 48%;
  border-radius: calc(4px - 1.5px) calc(4px - 1.5px) 3px 3px;
  background: linear-gradient(rgba(255, 255, 255, .9), rgba(255, 255, 255, .15));
}
.chat-message-row .chat-pay .chat-pay-icon::after {
  content: '';
  position: relative;
  width: 17px;
  height: 17px;
  background: currentColor;
  -webkit-mask: url("data:image/svg+xml,%3Csvg%20xmlns%3D%27http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%27%20viewBox%3D%270%200%2024%2024%27%20fill%3D%27none%27%20stroke%3D%27black%27%20stroke-width%3D%272.4%27%20stroke-linecap%3D%27round%27%20stroke-linejoin%3D%27round%27%3E%3Cpath%20d%3D%27M4%208h15l-4-4M20%2016H5l4%204%27%2F%3E%3C%2Fsvg%3E") center / contain no-repeat;
  mask: url("data:image/svg+xml,%3Csvg%20xmlns%3D%27http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%27%20viewBox%3D%270%200%2024%2024%27%20fill%3D%27none%27%20stroke%3D%27black%27%20stroke-width%3D%272.4%27%20stroke-linecap%3D%27round%27%20stroke-linejoin%3D%27round%27%3E%3Cpath%20d%3D%27M4%208h15l-4-4M20%2016H5l4%204%27%2F%3E%3C%2Fsvg%3E") center / contain no-repeat;
}
.chat-message-row .chat-pay.is-packet .chat-pay-icon::after {
  -webkit-mask-image: url("data:image/svg+xml,%3Csvg%20xmlns%3D%27http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%27%20viewBox%3D%270%200%2024%2024%27%20fill%3D%27none%27%20stroke%3D%27black%27%20stroke-width%3D%272.2%27%20stroke-linecap%3D%27round%27%20stroke-linejoin%3D%27round%27%3E%3Crect%20x%3D%274%27%20y%3D%279%27%20width%3D%2716%27%20height%3D%2711%27%20rx%3D%271%27%2F%3E%3Cpath%20d%3D%27M4%2013h16M12%209v11M12%209c-2-4-6-4-6-1s6%201%206%201c2-4%206-4%206-1s-6%201-6%201%27%2F%3E%3C%2Fsvg%3E");
  mask-image: url("data:image/svg+xml,%3Csvg%20xmlns%3D%27http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%27%20viewBox%3D%270%200%2024%2024%27%20fill%3D%27none%27%20stroke%3D%27black%27%20stroke-width%3D%272.2%27%20stroke-linecap%3D%27round%27%20stroke-linejoin%3D%27round%27%3E%3Crect%20x%3D%274%27%20y%3D%279%27%20width%3D%2716%27%20height%3D%2711%27%20rx%3D%271%27%2F%3E%3Cpath%20d%3D%27M4%2013h16M12%209v11M12%209c-2-4-6-4-6-1s6%201%206%201c2-4%206-4%206-1s-6%201-6%201%27%2F%3E%3C%2Fsvg%3E");
}
.chat-message-row .chat-pay.is-family .chat-pay-icon::after {
  -webkit-mask-image: url("data:image/svg+xml,%3Csvg%20xmlns%3D%27http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%27%20viewBox%3D%270%200%2024%2024%27%20fill%3D%27none%27%20stroke%3D%27black%27%20stroke-width%3D%272.2%27%20stroke-linecap%3D%27round%27%20stroke-linejoin%3D%27round%27%3E%3Crect%20x%3D%273%27%20y%3D%276%27%20width%3D%2718%27%20height%3D%2712%27%20rx%3D%272%27%2F%3E%3Cpath%20d%3D%27M3%2010h18M7%2015h4%27%2F%3E%3C%2Fsvg%3E");
  mask-image: url("data:image/svg+xml,%3Csvg%20xmlns%3D%27http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%27%20viewBox%3D%270%200%2024%2024%27%20fill%3D%27none%27%20stroke%3D%27black%27%20stroke-width%3D%272.2%27%20stroke-linecap%3D%27round%27%20stroke-linejoin%3D%27round%27%3E%3Crect%20x%3D%273%27%20y%3D%276%27%20width%3D%2718%27%20height%3D%2712%27%20rx%3D%272%27%2F%3E%3Cpath%20d%3D%27M3%2010h18M7%2015h4%27%2F%3E%3C%2Fsvg%3E");
}
/* 聊天记录：同一种卡片，字靠左 */
.chat-message-row .chat-bubble > .chat-forward-record-card {
  padding: 8px 11px 7px;
  border-radius: 3px;
  text-align: left;
}
.chat-message-row .chat-forward-record-title {
  font-size: 12px;
  color: #333;
}
.chat-message-row .chat-forward-record-preview {
  font-size: 10.5px;
  line-height: 1.6;
  color: #888;
}
.chat-message-row .chat-forward-record-footer {
  font-size: 9.5px;
  color: #9a9a9a;
}
/* 卡片颜色跟泡泡一样：我的白色、他的深色（跟着主题色）；图标跟卡片同色系 */
.chat-message-row.is-user .chat-pay,
.chat-message-row .chat-bubble > .chat-forward-record-card {
  border: 1px solid #c4c4c4;
  background: linear-gradient(#ffffff, #f5f5f5 50%, #e6e6e6);
  box-shadow: inset 0 1px 0 #fff, 0 1px 2px rgba(0, 0, 0, .2);
}
.chat-message-row.is-user .chat-pay .chat-pay-info b {
  color: #333;
}
.chat-message-row.is-user .chat-pay .chat-pay-info small {
  color: #666;
}
.chat-message-row.is-user .chat-pay .chat-pay-foot {
  color: #9a9a9a;
}
.chat-message-row.is-user .chat-pay .chat-pay-icon {
  color: color-mix(in srgb, var(--theme-color) 30%, #555);
  background: linear-gradient(#fdfdfd, #ececec 50%, #d6d6d6);
  box-shadow: 0 1px 1.5px rgba(0, 0, 0, .22), inset 0 0 0 1px #bdbdbd;
  filter: drop-shadow(0 1px 0 #fff);
}
.chat-message-row:not(.is-user) .chat-pay {
  border: 1px solid color-mix(in srgb, var(--theme-color) 30%, #3b3b3b);
  background: linear-gradient(color-mix(in srgb, var(--theme-color) 35%, #858585), color-mix(in srgb, var(--theme-color) 28%, #4d4d4d));
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, .35), 0 1px 2px rgba(0, 0, 0, .3);
}
.chat-message-row:not(.is-user) .chat-pay .chat-pay-info b {
  color: #fff;
  text-shadow: 0 -1px 0 rgba(0, 0, 0, .35);
}
.chat-message-row:not(.is-user) .chat-pay .chat-pay-info small {
  color: #e6e6e6;
  text-shadow: 0 -1px 0 rgba(0, 0, 0, .3);
}
.chat-message-row:not(.is-user) .chat-pay .chat-pay-foot {
  color: rgba(255, 255, 255, .65);
}
.chat-message-row:not(.is-user) .chat-pay .chat-pay-icon {
  color: #fff;
  background: linear-gradient(color-mix(in srgb, var(--theme-color) 32%, #9a9a9a), color-mix(in srgb, var(--theme-color) 26%, #5a5a5a));
  box-shadow: 0 1px 2px rgba(0, 0, 0, .35), inset 0 0 0 1px color-mix(in srgb, var(--theme-color) 25%, #2e2e2e);
}
.chat-message-row:not(.is-user) .chat-pay .chat-pay-icon::before {
  background: linear-gradient(rgba(255, 255, 255, .5), rgba(255, 255, 255, .06));
}
.chat-message-row .chat-forward-record-divider {
  border-top: 1px solid #d4d4d4;
}
/* 引用：挪到泡泡下面，小小的灰底一块，不影响泡泡跟头像对齐 */
.chat-message-row .chat-bubble:has(> .chat-quoted-message) {
  display: flex;
  flex-direction: column;
}
.chat-message-row .chat-bubble:has(> .chat-quoted-message) > * {
  align-self: flex-start;
}
.chat-message-row.is-user .chat-bubble:has(> .chat-quoted-message) > * {
  align-self: flex-end;
}
.chat-message-row .chat-bubble > .chat-quoted-message {
  order: 2;
  display: -webkit-box;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
  overflow: hidden;
  max-width: calc(100% - 1.5em);
  margin: 3px .6em 0;
  padding: .25em .6em;
  border: 0;
  border-radius: 3px;
  background: rgba(0, 0, 0, .06);
  font-size: .9em;
  line-height: 1.45;
  text-align: left;
}
/* 翻译：泡泡下面一块淡淡的主题色底 */
.chat-message-row .chat-message-translation-card {
  flex: 0 1 auto;
  width: fit-content;
  max-width: calc(100% - 1.5em);
  margin: 3px .6em 0;
  padding: .3em .65em;
  border: 1px solid color-mix(in srgb, var(--theme-color) 35%, #d8d8d8);
  border-radius: 3px;
  background: color-mix(in srgb, var(--theme-color) 12%, #fff);
  color: #555;
}
.chat-message-row.is-user .chat-message-translation-card {
  margin-left: auto;
}
/* 名字不放，上面的时间也拿掉（时间挪到泡泡下面） */
.chat-message-row > .chat-message-head {
  display: none;
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
/* 群聊：他的名字小小的放在泡泡上面（才分得出是谁说的），泡泡贴着名字 */
:root:has(.cr-group-panel) .chat-message-row:not(.is-user) > .chat-message-head {
  display: flex;
  margin: 0 0 1px calc(7px + .4em);
  font-size: 10px;
}
:root:has(.cr-group-panel) .chat-message-row:not(.is-user) > .chat-message-head .chat-message-time {
  display: none;
}
:root:has(.cr-group-panel) .chat-message-row:not(.is-user) .chat-message-name {
  color: #999;
  font-weight: 400;
}
:root:has(.cr-group-panel) .chat-message-row:not(.is-user) .chat-bubble > div:last-child:not([class]),
:root:has(.cr-group-panel) .chat-message-row:not(.is-user) .chat-bubble--voice {
  margin-top: 0;
}
/* 置顶的图钉、收藏的 ♡ 紧跟在时间后面，不要被推到最旁边 */
.chat-bubble-time .chat-message-pin-indicator,
.chat-message-row[data-favorite="true"] .chat-bubble-time .chat-message-pin-indicator,
.chat-message-row[data-favorite="true"] .chat-bubble-time::after {
  margin: 0;
}
/* 我的：图标放在时间左边，时间一直贴着右边不被推走（顺序：图钉、♡、已编辑、时间、已读） */
.chat-message-row.is-user .chat-bubble-time .chat-message-pin-indicator {
  order: -3;
}
.chat-message-row.is-user[data-favorite="true"] .chat-bubble-time::after {
  order: -2;
}
.chat-message-row.is-user[data-edited="true"] .chat-bubble-time::before {
  order: -1;
  margin: 0 2px 0 0;
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
