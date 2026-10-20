import './ChatPhotoViewer.css';
import { useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { PressedButton } from './PressedButton';
import { chatPhotoReady, generateUserPhoto, preparePickedPhoto } from '../../utils/chatPhoto';
import { showToast } from '../../utils/toast';

type Mode = 'pick' | 'draw';
interface Draft { mode: Mode; src: string; text: string; includeMe: boolean; busy: boolean; error: string }

/** 聊天加号里的「图片」「拍照」「生图」：选图或画图，先看一眼、写句话，再发出去。外观跟照片预览一样。 */
export function ChatPhotoSend() {
  const [draft, setDraft] = useState<Draft | null>(null);
  const album = useRef<HTMLInputElement>(null), camera = useRef<HTMLInputElement>(null);
  const run = useRef(0);
  useLayoutEffect(() => {
    const start = (event: Event) => {
      const action = (event as CustomEvent<string>).detail;
      // 选档案窗口要在这次点击里直接打开，浏览器才肯开。
      if (action === 'image') album.current?.click();
      else if (action === 'camera') camera.current?.click();
      else if (action === 'draw') {
        if (!chatPhotoReady()) { showToast('请先在「语音与生图设置」开启生图并填好服务'); return; }
        setDraft({ mode: 'draw', src: '', text: '', includeMe: true, busy: false, error: '' });
      }
    };
    window.addEventListener('qingtuan:chat-action', start);
    return () => window.removeEventListener('qingtuan:chat-action', start);
  }, []);
  async function picked(input: HTMLInputElement) {
    const file = input.files?.[0];
    input.value = '';
    if (!file) return;
    if (!file.type.startsWith('image/')) { showToast('请选一张图片'); return; }
    try { setDraft({ mode: 'pick', src: await preparePickedPhoto(file), text: '', includeMe: false, busy: false, error: '' }); }
    catch { showToast('这张图片读不出来，换一张试试'); }
  }
  async function drawNow() {
    if (!draft || !draft.text.trim()) { showToast('先写想画什么'); return; }
    const id = ++run.current;
    setDraft({ ...draft, busy: true, error: '' });
    try {
      const src = await generateUserPhoto(draft.text, draft.includeMe);
      if (id === run.current) setDraft(current => current && { ...current, src, busy: false });
    } catch (error) {
      if (id === run.current) setDraft(current => current && { ...current, busy: false, error: String((error as { message?: unknown } | null)?.message || error || '生图失败').slice(0, 120) });
    }
  }
  function close() { ++run.current; setDraft(null); }
  function send() {
    if (!draft?.src) return;
    (window as Window & { smallphoneSendChatPhoto?: (src: string, caption: string) => void }).smallphoneSendChatPhoto?.(draft.src, draft.text);
    close();
  }
  const inputs = <>
    <input ref={album} type="file" accept="image/*" hidden onChange={event => picked(event.currentTarget)} />
    <input ref={camera} type="file" accept="image/*" capture="environment" hidden onChange={event => picked(event.currentTarget)} />
  </>;
  if (!draft) return inputs;
  const drawing = draft.mode === 'draw';
  return <>{inputs}{createPortal(<div className="sp-confirm-overlay chat-photo-viewer" onClick={event => { if (event.target === event.currentTarget && !draft.busy) close(); }}>
    <div className="sp-confirm" role="dialog" aria-modal="true" aria-label={drawing ? '生图' : '发送照片'}>
      <div className="sp-confirm-bar"><span className="sp-confirm-title">{drawing ? '生图' : '发送照片'}</span></div>
      <div className="sp-confirm-body">
        {draft.src ? <img className="chat-photo-viewer-img" src={draft.src} alt="" />
          : draft.busy ? <div className="chat-photo-viewer-wait"><span className="chat-photo-spinner" aria-hidden="true" />正在画…</div>
          : draft.error ? <div className="sp-confirm-msg">{'没画出来：' + draft.error}</div> : null}
        <label className="chat-photo-viewer-label" htmlFor="chatPhotoSendText">{drawing ? '想画什么（会照这段描述画，发出去时也是这张照片的说明）' : '想说的话（可以不写）'}</label>
        <textarea id="chatPhotoSendText" className="chat-photo-viewer-prompt" rows={drawing ? 4 : 2} value={draft.text} disabled={draft.busy}
          onChange={event => { const text = event.currentTarget.value; setDraft(current => current && { ...current, text }); }} />
        {drawing ? <label className="chat-photo-viewer-check"><input type="checkbox" checked={draft.includeMe} disabled={draft.busy}
          onChange={event => { const includeMe = event.currentTarget.checked; setDraft(current => current && { ...current, includeMe }); }} />画面里有我（带上生图设置里「你」的提示）</label> : null}
      </div>
      <div className="sp-confirm-actions">
        <PressedButton type="button" className="sp-confirm-btn" onClick={close}>取消</PressedButton>
        {drawing ? <PressedButton type="button" className="sp-confirm-btn" disabled={draft.busy} onClick={drawNow}>{draft.src || draft.error ? '重画' : '生成'}</PressedButton> : null}
        <PressedButton type="button" className="sp-confirm-btn is-primary" disabled={!draft.src || draft.busy} onClick={send}>发送</PressedButton>
      </div>
    </div>
  </div>, document.body)}</>;
}
