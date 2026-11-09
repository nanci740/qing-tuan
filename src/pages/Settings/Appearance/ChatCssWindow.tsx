import { DEFAULT_AVATAR } from '../../../utils/defaultAvatar';
import { CLASS_GROUPS, EXAMPLES, chatCssStore, scopeChatCss } from '../../../utils/chatCss';
import { CssWindow, escapeHtml as escape, pageStyles, previewDocument } from './CssWindow';
import type { CssWindowConfig } from './CssWindow';

/** 预览里的几则假消息（跟真的聊天室同一套结构）。 */
function sampleRows(name: string, peer: string, self: string) {
  const row = (user: boolean, text: string, time: string, tail = false) => {
    const head = `<div class="chat-message-head"><span class="chat-message-name">${escape(user ? '我' : name)}</span><span class="chat-message-time">${time}</span></div>`;
    // 跟真的消息一样：泡泡后面接一个时间（含已读）的小格
    const receipt = user ? '<span class="chat-read-receipt" aria-label="已读"><svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M1.5 8.5l3 3 6-7M7 11.5l1 1 6-8"/></svg></span>' : '';
    const wrap = `<div class="chat-bubble-wrap"><div class="chat-bubble"><div>${escape(text)}</div></div><div class="chat-bubble-time">${time.slice(0, 5)}${receipt}</div></div>`;
    const avatar = `<img class="chat-message-mini-avatar" src="${escape(user ? self : peer)}" alt="">`;
    return `<div class="chat-message-row ${user ? 'is-user' : 'is-chat'}${tail ? ' is-tail' : ''}${user ? ' is-read' : ''}">${user ? head + wrap + avatar : avatar + head + wrap}</div>`;
  };
  return `<div class="chat-date-divider" role="separator">16:54</div>${row(false, '今天吃饭了没？', '16:54:02', true)}${row(true, '吃啦，你呢', '16:54:30', true)}${row(false, '刚开完会。', '16:55:11')}${row(false, '晚点有空的话，陪我散个步。', '16:55:13', true)}${row(true, '好呀', '16:56:40', true)}`;
}

/** 预览：用真的聊天室样式，放在一个小框里（iframe），不会动到真的聊天。 */
function buildPreview(frame: HTMLIFrameElement) {
  const app = document.querySelector<HTMLElement>('#chatAppPage'), room = app?.querySelector<HTMLElement>('#chatRoomView');
  let roomHtml = '<div id="chatRoomView" class="chat-view chat-room-view"><div id="chatMessageList" class="chat-message-list"></div></div>';
  let name = '他';
  if (room) {
    const copy = room.cloneNode(true) as HTMLElement;
    copy.classList.remove('is-hidden', 'chat-selection-mode');
    copy.querySelectorAll('.chat-message-wallpaper img, .chat-history-results > *').forEach(node => node.remove());
    // 名字照最后开过的那个聊天（「与」「聊天中」是样式画的）；还没开过就叫「他」
    const title = copy.querySelector('.chat-room-title'), current = (title?.textContent || '').trim();
    name = current && current !== '聊天' ? current : '他';
    if (title) title.textContent = name;
    copy.querySelectorAll('.cr-peer-panel .cr-panel-name').forEach(node => { node.textContent = name; });
    roomHtml = copy.outerHTML;
  }
  // 头像用右边那栏的大头照（他、我各一张）
  const photo = (selector: string) => { const node = room?.querySelector<HTMLElement>(selector); return (node ? getComputedStyle(node).backgroundImage.match(/url\("?(.+?)"?\)/)?.[1] : '') || DEFAULT_AVATAR; };
  const peer = photo('[data-cr-peer-photo]'), self = photo('[data-cr-self-photo]');
  const doc = frame.contentDocument; if (!doc) return;
  doc.open();
  doc.write(previewDocument(pageStyles(['chatGlobalCss', 'chatCustomBubbleStyle']), `<div id="main-content" class="visible"><div id="chatAppPage" class="${escape(app?.className || 'chat-app-page')} active chat-room-open">${roomHtml}</div></div>`));
  doc.close();
  const list = doc.querySelector('#chatMessageList');
  if (list) list.innerHTML = sampleRows(name, peer, self);
}

const CONFIG: CssWindowConfig = {
  id: 'chatCssGroup', label: '聊天美化 CSS', store: chatCssStore, scope: scopeChatCss, examples: EXAMPLES, groups: CLASS_GROUPS,
  shortVar: /^#chatRoomView \{ (--[\w-]+).*/, cheatTip: '点一行就加进编辑框。颜色那几行要写在同一个 #chatRoomView { } 里。',
  phone: { width: 390, height: 540, maxScale: 1 }, buildPreview, previewTitle: '聊天预览',
  placeholder: '在这里写 CSS，例如：\n.chat-message-row.is-user .chat-bubble {\n  color: #c58;\n}',
  note: '套用后全部聊天室一起换，只会改到聊天室里面。聊天设置里单独设的壁纸、字号、专属气泡，还是会盖过这里。',
  words: { applied: '已套用到全部聊天', cleared: '已拿掉聊天美化 CSS', none: '现在没有套用任何聊天美化。', file: '青团聊天美化' }
};

/** 美化设置：「聊天美化 CSS」，写好按套用，全部聊天室一起换。 */
export function ChatCssWindow() { return <CssWindow config={CONFIG} />; }
