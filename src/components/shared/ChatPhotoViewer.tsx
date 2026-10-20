import './ChatPhotoViewer.css';
import { useLayoutEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { PressedButton } from './PressedButton';
import type { MessagePhoto } from '../../types/chatMessages';

interface PhotoViewRequest { photo: MessagePhoto; redraw(prompt: string): void }

/** 点家机的照片：看大图、存图；画面描述可以改，改完重新生成。外观跟聊天的确认窗口一样。 */
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
  const { photo } = request, close = () => setRequest(null);
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
          : <div className="sp-confirm-msg">{'这张照片没画出来' + (photo.error ? '：' + photo.error : '。')}</div>}
        {photo.mine ? (photo.caption ? <div className="sp-confirm-msg">{photo.caption}</div> : null) : <>
          <label className="chat-photo-viewer-label" htmlFor="chatPhotoPrompt">画面描述（给生图模型看的，可以改）</label>
          <textarea id="chatPhotoPrompt" className="chat-photo-viewer-prompt" rows={4} value={prompt} onChange={event => setPrompt(event.currentTarget.value)} />
        </>}
      </div>
      <div className="sp-confirm-actions">
        <PressedButton type="button" className="sp-confirm-btn" onClick={close}>关闭</PressedButton>
        {photo.state === 'done' && photo.src ? <PressedButton type="button" className="sp-confirm-btn" onClick={save}>存图</PressedButton> : null}
        {photo.mine ? null : <PressedButton type="button" className="sp-confirm-btn is-primary" onClick={() => { request.redraw(prompt); close(); }}>重新生成</PressedButton>}
      </div>
    </div>
  </div>, document.body);
}
