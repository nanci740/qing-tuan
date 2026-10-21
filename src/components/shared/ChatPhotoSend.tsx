import './ChatPhotoViewer.css';
import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { PressedButton } from './PressedButton';
import { chatPhotoReady, generateUserPhoto, preparePickedPhoto } from '../../utils/chatPhoto';
import { showToast } from '../../utils/toast';

type Mode = 'pick' | 'draw';
interface Draft {
  mode: Mode; image: Blob | null; text: string; includeMe: boolean; busy: '' | 'expand' | 'draw'; error: string;
  /** 让 AI 补充描写：expanded 是补好的英文描述（可以改），expandedFrom 记下是照哪段话补的，话或「画面里有我」改了才重补。 */
  expand: boolean; expanded: string; expandedFrom: string;
}
type ChatBridge = Window & {
  smallphoneSendChatPhoto?: (image: Blob, caption: string) => Promise<void>;
  smallphoneWritePhotoPrompt?: (keywords: string, includeMe: boolean) => Promise<string>;
};

/** 聊天加号里的「图片」「拍照」「生图」：选图或画图，先看一眼、写句话，再发出去。外观跟照片预览一样。 */
export function ChatPhotoSend() {
  const [draft, setDraft] = useState<Draft | null>(null);
  const album = useRef<HTMLInputElement>(null), camera = useRef<HTMLInputElement>(null);
  const run = useRef(0);
  const [preview, setPreview] = useState('');
  useEffect(() => {
    if (!draft?.image) { setPreview(''); return; }
    const url = URL.createObjectURL(draft.image);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [draft?.image]);
  useLayoutEffect(() => {
    const start = (event: Event) => {
      const action = (event as CustomEvent<string>).detail;
      // 选档案窗口要在这次点击里直接打开，浏览器才肯开。
      if (action === 'image') album.current?.click();
      else if (action === 'camera') camera.current?.click();
      else if (action === 'draw') {
        if (!chatPhotoReady()) { showToast('请先在「语音与生图设置」开启生图并填好服务'); return; }
        setDraft({ mode: 'draw', image: null, text: '', includeMe: true, busy: '', error: '', expand: true, expanded: '', expandedFrom: '' });
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
    try { setDraft({ mode: 'pick', image: await preparePickedPhoto(file), text: '', includeMe: false, busy: '', error: '', expand: false, expanded: '', expandedFrom: '' }); }
    catch { showToast('这张图片读不出来，换一张试试'); }
  }
  const update = (patch: Partial<Draft>) => setDraft(current => current && { ...current, ...patch });
  async function drawNow() {
    if (!draft) return;
    const text = draft.text.trim();
    if (!text) { showToast('先写想画什么'); return; }
    const id = ++run.current, fail = (error: unknown) => { if (id === run.current) update({ busy: '', error: String((error as { message?: unknown } | null)?.message || error || '生图失败').slice(0, 120) }); };
    let prompt = text;
    if (draft.expand) {
      // 话没改过就沿用补好（可能也改过）的描述，重画不用再补一次。
      prompt = draft.expandedFrom === text + (draft.includeMe ? '\n#me' : '') && draft.expanded.trim() ? draft.expanded.trim() : '';
      if (!prompt) {
        update({ busy: 'expand', error: '' });
        try {
          const write = (window as ChatBridge).smallphoneWritePhotoPrompt;
          if (!write) throw new Error('先打开一个聊天，才能补充描写');
          prompt = await write(text, draft.includeMe);
        } catch (error) { fail(error); return; }
        if (id !== run.current) return;
        update({ expanded: prompt, expandedFrom: text + (draft.includeMe ? '\n#me' : '') });
      }
    }
    update({ busy: 'draw', error: '' });
    try {
      const image = await generateUserPhoto(prompt, draft.includeMe);
      if (id === run.current) update({ image, busy: '' });
    } catch (error) { fail(error); }
  }
  function close() { ++run.current; setDraft(null); }
  async function send() {
    if (!draft?.image) return;
    const { image, text } = draft;
    close();
    await (window as ChatBridge).smallphoneSendChatPhoto?.(image, text);
  }
  const inputs = <>
    <input ref={album} type="file" accept="image/*" hidden onChange={event => picked(event.currentTarget)} />
    <input ref={camera} type="file" accept="image/*" capture="environment" hidden onChange={event => picked(event.currentTarget)} />
  </>;
  if (!draft) return inputs;
  const drawing = draft.mode === 'draw', busy = !!draft.busy;
  return <>{inputs}{createPortal(<div className="sp-confirm-overlay chat-photo-viewer" onClick={event => { if (event.target === event.currentTarget && !busy) close(); }}>
    <div className="sp-confirm" role="dialog" aria-modal="true" aria-label={drawing ? '生图' : '发送照片'}>
      <div className="sp-confirm-bar"><span className="sp-confirm-title">{drawing ? '生图' : '发送照片'}</span></div>
      <div className="sp-confirm-body">
        {preview && !busy ? <img className="chat-photo-viewer-img" src={preview} alt="" />
          : busy ? <div className="chat-photo-viewer-wait"><span className="chat-photo-spinner" aria-hidden="true" />{draft.busy === 'expand' ? '正在补充描写…' : '正在画…'}</div>
          : draft.error ? <div className="sp-confirm-msg">{'没画出来：' + draft.error}</div> : null}
        <label className="chat-photo-viewer-label" htmlFor="chatPhotoSendText">{drawing ? (draft.expand ? '想画什么（发出去时也是这张照片的说明）' : '想画什么（会照这段描述画，发出去时也是这张照片的说明）') : '想说的话（可以不写）'}</label>
        <textarea id="chatPhotoSendText" className="chat-photo-viewer-prompt" rows={drawing && !draft.expand ? 4 : 2} value={draft.text} disabled={busy}
          onChange={event => update({ text: event.currentTarget.value })} />
        {drawing ? <>
          <label className="chat-photo-viewer-check"><input type="checkbox" checked={draft.expand} disabled={busy}
            onChange={event => update({ expand: event.currentTarget.checked })} /><span>让 AI 补充描写<small>简单写几个词就好，他会照你们的聊天把画面补完整</small></span></label>
          {draft.expand && draft.expanded ? <>
            <label className="chat-photo-viewer-label" htmlFor="chatPhotoSendExpanded">补充后的描述（给生图模型看的，可以改，重画会照这段）</label>
            <textarea id="chatPhotoSendExpanded" className="chat-photo-viewer-prompt" rows={4} value={draft.expanded} disabled={busy}
              onChange={event => update({ expanded: event.currentTarget.value })} />
          </> : null}
          <label className="chat-photo-viewer-check"><input type="checkbox" checked={draft.includeMe} disabled={busy}
            onChange={event => update({ includeMe: event.currentTarget.checked })} /><span>画面里有我<small>照生图设置里「你」的样子画</small></span></label>
        </> : null}
      </div>
      <div className="sp-confirm-actions">
        <PressedButton type="button" className="sp-confirm-btn" onClick={close}>取消</PressedButton>
        {drawing ? <PressedButton type="button" className="sp-confirm-btn" disabled={busy} onClick={drawNow}>{draft.image || draft.error ? '重画' : '生成'}</PressedButton> : null}
        <PressedButton type="button" className="sp-confirm-btn is-primary" disabled={!draft.image || busy} onClick={send}>发送</PressedButton>
      </div>
    </div>
  </div>, document.body)}</>;
}
