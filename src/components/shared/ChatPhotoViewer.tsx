import './ChatPhotoViewer.css';
import { useLayoutEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { PressedButton } from './PressedButton';
import type { MessagePhoto } from '../../types/chatMessages';

/** canDraw：生图设定好了没；没设定好，文字照片就不放「画出来」。 */
interface PhotoViewRequest { photo: MessagePhoto; redraw(prompt: string): void; canDraw?: boolean }

/** 点家机的照片：看大图、存图；画面描述可以改，改完重新生成。文字照片（预设图）可以直接画出来。外观跟聊天的确认窗口一样。 */
export function ChatPhotoViewer() {
  const [request, setRequest] = useState<PhotoViewRequest | null>(null);
  const [prompt, setPrompt] = useState('');
  useLayoutEffect(() => {
    const show = (event: Event) => {
      const detail = (event as CustomEvent<PhotoViewRequest>).detail;
      setRequest(detail); setPrompt(detail.photo.prompt);
    };
    window.addEventListener('qingtuan:chat-photo-view', show);
    return () => window.removeEventListener('qingtuan:chat-photo-view', show);
  }, []);
  if (!request) return null;
  const { photo } = request, close = () => setRequest(null), text = photo.state === 'text', canDraw = request.canDraw !== false;
  function save() {
    if (!photo.src) return;
    const link = document.createElement('a');
    link.href = photo.src; link.download = `照片-${Date.now()}.jpg`; link.rel = 'noopener';
    document.body.appendChild(link); link.click(); link.remove();
  }
  return createPortal(<div className="sp-confirm-overlay chat-photo-viewer" onClick={event => { if (event.target === event.currentTarget) close(); }}>
    <div className="sp-confirm" role="dialog" aria-modal="true" aria-label="照片">
      <div className="sp-confirm-bar"><span className="sp-confirm-title">{photo.mine ? '我发的照片' : photo.caption || '照片'}</span></div>
      <div className="sp-confirm-body">
        {photo.state === 'done' && photo.src
          ? <img className="chat-photo-viewer-img" src={photo.src} alt={photo.caption} />
          : text ? <>
            {photo.scene ? <div className="sp-confirm-msg chat-photo-viewer-scene">{photo.scene}</div> : null}
            <div className="sp-confirm-msg">{'这张照片还没画出来。' + (canDraw ? '' : '在「语音与生图设置」开好生图，就能把它画出来。')}</div>
          </>
          : <div className="sp-confirm-msg">{'这张照片没画出来' + (photo.error ? '：' + photo.error : '。')}</div>}
        {photo.mine ? (photo.caption ? <div className="sp-confirm-msg">{photo.caption}</div> : null) : <>
          <label className="chat-photo-viewer-label" htmlFor="chatPhotoPrompt">{prompt.trim() ? '画面描述（给生图模型看的，可以改）' : '画面描述（空着的话，画的时候会照说明补上）'}</label>
          <textarea id="chatPhotoPrompt" className="chat-photo-viewer-prompt" rows={4} value={prompt} onChange={event => setPrompt(event.currentTarget.value)} />
        </>}
      </div>
      <div className="sp-confirm-actions">
        <PressedButton type="button" className="sp-confirm-btn" onClick={close}>关闭</PressedButton>
        {photo.state === 'done' && photo.src ? <PressedButton type="button" className="sp-confirm-btn" onClick={save}>存图</PressedButton> : null}
        {photo.mine || text && !canDraw ? null : <PressedButton type="button" className="sp-confirm-btn is-primary" onClick={() => { request.redraw(prompt); close(); }}>{text ? '画出来' : '重新生成'}</PressedButton>}
      </div>
    </div>
  </div>, document.body);
}
