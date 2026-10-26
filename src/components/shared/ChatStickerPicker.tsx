import './ChatStickerPicker.css';
import { useEffect, useLayoutEffect, useState, useSyncExternalStore } from 'react';
import { createPortal } from 'react-dom';
import { PressedButton } from './PressedButton';
import { loadStickerImages, readStickers, stickerSrc, subscribeStickers } from '../../utils/stickerStorage';
import type { MessageSticker } from '../../types/chatMessages';

type Bridge = Window & { smallphoneSendChatSticker?: (sticker: MessageSticker) => void };
/** 别的地方（例如朋友圈评论）也要挑表情：发 qingtuan:sticker-pick，挑好的交给 done。 */
export function pickSticker(done: (sticker: MessageSticker) => void) { window.dispatchEvent(new CustomEvent('qingtuan:sticker-pick', { detail: done })); }

/** 聊天输入框下面的「表情」：点开挑一张表情发出去。所有分组都能用（家机能不能用只管他那边）；上面一排分组，下面一排四张。 */
export function ChatStickerPicker() {
  const groups = useSyncExternalStore(subscribeStickers, readStickers);
  const [open, setOpen] = useState(false), [groupId, setGroupId] = useState(''), [, setLoaded] = useState(0), [done, setDone] = useState<((sticker: MessageSticker) => void) | null>(null);
  useLayoutEffect(() => {
    const start = (event: Event) => { if ((event as CustomEvent<string>).detail === 'sticker') { setDone(null); setOpen(true); } };
    const pick = (event: Event) => { const callback = (event as CustomEvent<(sticker: MessageSticker) => void>).detail; setDone(() => callback); setOpen(true); };
    window.addEventListener('qingtuan:chat-action', start);
    window.addEventListener('qingtuan:sticker-pick', pick);
    return () => { window.removeEventListener('qingtuan:chat-action', start); window.removeEventListener('qingtuan:sticker-pick', pick); };
  }, []);
  // 打开时把上传的表情读出来（开机读过的会直接有）
  useEffect(() => { if (open) loadStickerImages(groups).then(() => setLoaded(value => value + 1), () => setLoaded(value => value + 1)); }, [open, groups]);
  if (!open) return null;
  const filled = groups.filter(group => group.items.length);
  const current = filled.find(group => group.id === groupId) || filled[0];
  function send(tag: string, image: string) {
    setOpen(false);
    if (done) { done({ tag, image }); setDone(null); return; }
    (window as Bridge).smallphoneSendChatSticker?.({ tag, image });
  }
  return createPortal(<div className="sp-confirm-overlay chat-sticker-picker" onClick={event => { if (event.target === event.currentTarget) setOpen(false); }}>
    <div className="sp-confirm" role="dialog" aria-modal="true" aria-label="挑表情">
      <div className="sp-confirm-bar"><span className="sp-confirm-title">表情</span></div>
      {filled.length > 1 ? <div className="chat-sticker-tabs" role="tablist">
        {filled.map(group => <button type="button" role="tab" key={group.id} aria-selected={group.id === current?.id} className={group.id === current?.id ? 'is-active' : ''} onClick={() => setGroupId(group.id)}>{group.name}</button>)}
      </div> : null}
      <div className="sp-confirm-body">
        {current ? <div className="chat-sticker-grid">
          {current.items.map(item => {
            const src = stickerSrc(item);
            return <button type="button" key={item.id} className="chat-sticker-cell" onClick={() => send(item.tag, item.image)} aria-label={'发送表情：' + item.tag}>
              <span className="chat-sticker-cell-pic">{src ? <img src={src} alt="" draggable={false} /> : <i>看不到</i>}</span>
              <b>{item.tag}</b>
            </button>;
          })}
        </div> : <div className="sp-confirm-msg">还没有表情。到聊天 App 的「我 → 表情」加几张，就能在这里挑。</div>}
      </div>
      <div className="sp-confirm-actions chat-sticker-actions"><PressedButton type="button" className="sp-confirm-btn" onClick={() => setOpen(false)}>关闭</PressedButton></div>
    </div>
  </div>, document.body);
}
