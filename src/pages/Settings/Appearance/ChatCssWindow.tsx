import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import type { ChangeEvent } from 'react';
import { PressedButton } from '../../../components/shared/PressedButton';
import { useAppearance } from '../../../providers/AppearanceProvider';
import { useChoice } from '../../../providers/ChoiceProvider';
import { DEFAULT_AVATAR } from '../../../utils/defaultAvatar';
import { showToast } from '../../../utils/toast';
import { CHAT_CSS_EVENT, CLASS_GROUPS, EXAMPLES, deleteTemplate, readChatCss, readTemplates, renameTemplate, saveTemplate, scopeChatCss, writeChatCss } from '../../../utils/chatCss';
import type { ChatCssTemplate } from '../../../utils/chatCss';

const PHONE_W = 390, PHONE_H = 540;
const escape = (text: string) => text.replace(/[&<>"]/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[char]!));

/** 预览里的几则假消息（跟真的聊天室同一套结构）。 */
function sampleRows(name: string, peer: string, self: string) {
  const row = (user: boolean, text: string, time: string, tail = false) => {
    const head = `<div class="chat-message-head"><span class="chat-message-name">${escape(user ? '我' : name)}</span><span class="chat-message-time">${time}</span></div>`;
    const wrap = `<div class="chat-bubble-wrap"><div class="chat-bubble">${escape(text)}</div></div>`;
    const avatar = `<img class="chat-message-mini-avatar" src="${escape(user ? self : peer)}" alt="">`;
    return `<div class="chat-message-row ${user ? 'is-user' : 'is-chat'}${tail ? ' is-tail' : ''}${user ? ' is-read' : ''}">${user ? head + wrap + avatar : avatar + head + wrap}</div>`;
  };
  return `<div class="chat-date-divider" role="separator">16:54</div>${row(false, '今天吃饭了没？', '16:54:02', true)}${row(true, '吃啦，你呢', '16:54:30', true)}${row(false, '刚开完会。', '16:55:11')}${row(false, '晚点有空的话，陪我散个步。', '16:55:13', true)}${row(true, '好呀', '16:56:40', true)}`;
}

/** 预览：用真的聊天室样式，放在一个小框里（iframe），不会动到真的聊天。 */
function buildPreview(frame: HTMLIFrameElement) {
  const app = document.querySelector<HTMLElement>('#chatAppPage'), room = app?.querySelector<HTMLElement>('#chatRoomView');
  const styles = [...document.querySelectorAll<HTMLElement>('link[rel="stylesheet"], style')].filter(node => !['chatGlobalCss', 'chatCustomBubbleStyle'].includes(node.id)).map(node => node.outerHTML).join('');
  const root = document.documentElement, body = document.body;
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
  doc.write(`<!doctype html><html class="${escape(root.className)}" style="${escape(root.getAttribute('style') || '')}"><head><meta charset="utf-8">${styles}<style>html,body{margin:0;overflow:hidden}*{transition:none!important}</style><style id="chatCssDraft"></style></head><body class="${escape(body.className)}" style="${escape(body.getAttribute('style') || '')}"><div id="main-content" class="visible"><div id="chatAppPage" class="${escape(app?.className || 'chat-app-page')} active chat-room-open">${roomHtml}</div></div></body></html>`);
  doc.close();
  const list = doc.querySelector('#chatMessageList');
  if (list) list.innerHTML = sampleRows(name, peer, self);
}

/** 美化设置：「聊天美化 CSS」，写好按套用，全部聊天室一起换。 */
export function ChatCssWindow() {
  const appearance = useAppearance(), choice = useChoice();
  const [applied, setApplied] = useState(readChatCss), [draft, setDraft] = useState(readChatCss), [error, setError] = useState('');
  const [templates, setTemplates] = useState<ChatCssTemplate[]>(readTemplates);
  const frame = useRef<HTMLIFrameElement>(null), box = useRef<HTMLDivElement>(null), code = useRef<HTMLTextAreaElement>(null), file = useRef<HTMLInputElement>(null);
  const caret = useRef(-1), press = useRef(0), pressed = useRef(false), [scale, setScale] = useState(.8);

  // 打开美化设置时重做预览（主题色、字体可能换过）
  useEffect(() => {
    if (!appearance.pageOpen || !frame.current) return;
    const current = readChatCss(); setApplied(current); setTemplates(readTemplates());
    buildPreview(frame.current); paint(draft);
  }, [appearance.pageOpen, appearance.color, appearance.tone]);
  useEffect(() => { const sync = () => setApplied(readChatCss()); window.addEventListener(CHAT_CSS_EVENT, sync); return () => window.removeEventListener(CHAT_CSS_EVENT, sync); }, []);
  useLayoutEffect(() => {
    const node = box.current; if (!node) return;
    const fit = () => setScale(Math.min(1, node.clientWidth / PHONE_W));
    fit(); const observer = new ResizeObserver(fit); observer.observe(node);
    return () => observer.disconnect();
  }, []);
  /** 把草稿套到预览里；写错了就保留上一次的样子，下面提示哪里错。 */
  function paint(css: string) {
    const target = frame.current?.contentDocument?.querySelector('#chatCssDraft');
    try { const scoped = scopeChatCss(css); if (target) target.textContent = scoped; setError(''); }
    catch (problem) { setError((problem as Error).message); }
  }
  useEffect(() => { const timer = window.setTimeout(() => paint(draft), 250); return () => window.clearTimeout(timer); }, [draft]);

  function apply() {
    try { writeChatCss(draft); setApplied(draft.trim()); showToast(draft.trim() ? '已套用到全部聊天' : '已拿掉聊天美化 CSS'); }
    catch (problem) { showToast((problem as Error).message); }
  }
  function insert(text: string) {
    const area = code.current, at = caret.current >= 0 ? caret.current : draft.length;
    const before = draft.slice(0, at), after = draft.slice(at);
    const piece = (before && !before.endsWith('\n') ? '\n' : '') + text + '\n';
    setDraft(before + piece + after);
    const next = (before + piece).length - (text.endsWith('}') ? 3 : 1);
    requestAnimationFrame(() => { if (area) { area.focus(); area.setSelectionRange(next, next); caret.current = next; } });
  }
  function cheatSheet() {
    choice.openChoice({ style: 'settings', title: '类名小抄', options: [], selected: '', confirmText: '好了', confirm: () => {},
      content: <div className="chat-css-cheat">{CLASS_GROUPS.map(group => <div key={group.label}>
        <p className="chat-css-cheat-title">{group.label}</p>
        {group.items.map(([selector, note]) => <button type="button" key={selector} className="chat-css-cheat-row" onClick={() => { choice.close(); insert(selector.includes('{') ? selector.replace('{ ', '{\n  ').replace('; }', ';\n}') : `${selector} {\n  \n}`); }}>
          <code>{selector.replace(/^#chatRoomView \{ (--[\w-]+).*/, '$1')}</code><span>{note}</span></button>)}
      </div>)}<p className="chat-css-cheat-tip">点一行就加进编辑框。颜色那几行要写在同一个 #chatRoomView {'{ }'} 里。</p></div> });
  }
  function startPress(item: ChatCssTemplate) {
    window.clearTimeout(press.current); pressed.current = false;
    press.current = window.setTimeout(() => { pressed.current = true; templateMenu(item); }, 480);
  }
  const endPress = () => window.clearTimeout(press.current);
  function templateMenu(item: ChatCssTemplate) {
    choice.openChoice({ style: 'settings', title: item.name, options: [{ value: 'rename', label: '改名' }, { value: 'save', label: '用编辑框现在的内容覆盖' }, { value: 'export', label: '导出 .css' }, { value: 'delete', label: '删除' }], selected: '',
      confirm: value => { window.setTimeout(() => {
        if (value === 'rename') nameDialog('改名', item.name, name => { renameTemplate(item.id, name); setTemplates(readTemplates()); });
        if (value === 'save') { deleteTemplate(item.id); saveTemplate(item.name, draft); setTemplates(readTemplates()); showToast('覆盖好了'); }
        if (value === 'export') download(item.css, item.name);
        if (value === 'delete') { deleteTemplate(item.id); setTemplates(readTemplates()); showToast('删掉了'); }
      }, 280); } });
  }
  function nameDialog(title: string, initial: string, done: (name: string) => void) {
    const store = { name: initial };
    choice.openChoice({ style: 'settings', title, options: [], selected: '', confirmText: '好了',
      content: <NameField store={store} />, confirm: () => { if (!store.name.trim()) { showToast('先取个名字'); return false; } done(store.name); } });
  }
  function download(css: string, name: string) {
    const url = URL.createObjectURL(new Blob([css], { type: 'text/css' })), link = document.createElement('a');
    link.href = url; link.download = `青团聊天美化-${name.replace(/[\\/:*?"<>|]/g, '') || '未命名'}.css`; document.body.append(link); link.click(); link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 2000);
  }
  async function onFile(event: ChangeEvent<HTMLInputElement>) {
    const picked = event.currentTarget.files?.[0]; event.currentTarget.value = '';
    if (!picked) return;
    if (picked.size > 200 * 1024) { showToast('文件太大了'); return; }
    setDraft(await picked.text()); showToast('已放进编辑框，按「套用」才会换');
  }

  const status = error ? `写错了：${error}` : draft.trim() === applied.trim() ? (applied.trim() ? '这就是现在套用的样子。' : '现在没有套用任何聊天美化。') : '上面是预览，还没套用。';
  return <section className="theme-setting-group chat-css-group" id="chatCssGroup">
    <div className="theme-setting-label">聊天美化 CSS</div>
    <div className="theme-setting-card">
      <div className="chat-css-phone" ref={box} style={{ height: PHONE_H * scale }}>
        <iframe ref={frame} title="聊天预览" tabIndex={-1} aria-hidden="true" style={{ width: PHONE_W, height: PHONE_H, transform: `scale(${scale})` }} />
      </div>
      <p className={'chat-css-status' + (error ? ' is-error' : '')}>{status}</p>
      <div className="chat-css-chips">
        {EXAMPLES.map(item => <button type="button" key={item.name} className={'chat-css-chip' + (draft.trim() === item.css.trim() ? ' active' : '')} onClick={() => setDraft(item.css)}>{item.name}</button>)}
        {templates.map(item => <button type="button" key={item.id} className={'chat-css-chip is-mine' + (draft.trim() === item.css.trim() ? ' active' : '')}
          onClick={() => { if (pressed.current) { pressed.current = false; return; } setDraft(item.css); }}
          onPointerDown={() => startPress(item)} onPointerUp={endPress} onPointerLeave={endPress} onPointerCancel={endPress}
          onContextMenu={event => { event.preventDefault(); endPress(); templateMenu(item); }}>{item.name}</button>)}
        <button type="button" className="chat-css-chip is-add" onClick={() => { if (!draft.trim()) { showToast('编辑框是空的'); return; } nameDialog('存成模板', '', name => { try { saveTemplate(name, draft); setTemplates(readTemplates()); showToast('存好了，长按可以改名、导出、删除'); } catch (problem) { showToast((problem as Error).message); } }); }}>＋ 存成模板</button>
      </div>
      <textarea ref={code} className="chat-css-code" value={draft} spellCheck={false} autoCapitalize="off" autoCorrect="off" placeholder={'在这里写 CSS，例如：\n.chat-message-row.is-user .chat-bubble {\n  color: #c58;\n}'}
        onChange={event => { setDraft(event.currentTarget.value); caret.current = event.currentTarget.selectionStart; }}
        onBlur={event => { caret.current = event.currentTarget.selectionStart; }} onSelect={event => { caret.current = event.currentTarget.selectionStart; }} />
      <div className="theme-font-actions chat-css-actions">
        <PressedButton type="button" className="theme-font-btn secondary" onClick={cheatSheet}>类名小抄</PressedButton>
        <PressedButton type="button" className="theme-font-btn secondary" onClick={() => setDraft('')}>清除</PressedButton>
        <PressedButton type="button" className="theme-font-btn ui-cyan-btn" disabled={!!error} onClick={apply}>套用</PressedButton>
      </div>
      <div className="chat-css-links">
        <PressedButton type="button" className="chat-css-link" onClick={() => file.current?.click()}>导入 .css</PressedButton>
        <span aria-hidden="true">·</span>
        <PressedButton type="button" className="chat-css-link" onClick={() => draft.trim() ? download(draft, '目前的') : showToast('编辑框是空的')}>导出 .css</PressedButton>
      </div>
      <input ref={file} type="file" accept=".css,text/css,text/plain" hidden onChange={event => void onFile(event)} />
      <p className="theme-scheme-note">套用后全部聊天室一起换，只会改到聊天室里面。聊天设置里单独设的壁纸、字号、专属气泡，还是会盖过这里。</p>
    </div>
  </section>;
}

function NameField({ store }: { store: { name: string } }) {
  const [name, setName] = useState(store.name), choice = useChoice();
  store.name = name;
  return <div className="choice-field"><input className="choice-input" value={name} maxLength={12} placeholder="模板名字，例如：粉色便利贴" autoFocus onChange={event => setName(event.currentTarget.value)} onKeyDown={event => { if (event.key === 'Enter') void choice.confirm(); }} /></div>;
}
