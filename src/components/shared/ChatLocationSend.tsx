import './ChatPhotoViewer.css';
import './ChatLocation.css';
import { useLayoutEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { PressedButton } from './PressedButton';
import { showToast } from '../../utils/toast';
import type { MessageLocation } from '../../types/chatMessages';

interface Draft { place: string; address: string; distance: string; unit: '米' | '公里' }

/** 聊天加号里的「位置」：写一个地点发出去，变成一张定位卡片。不读真实定位，写什么都可以。 */
export function ChatLocationSend() {
  const [draft, setDraft] = useState<Draft | null>(null);
  useLayoutEffect(() => {
    const start = (event: Event) => { if ((event as CustomEvent<string>).detail === 'location') setDraft({ place: '', address: '', distance: '', unit: '公里' }); };
    window.addEventListener('qingtuan:chat-action', start);
    return () => window.removeEventListener('qingtuan:chat-action', start);
  }, []);
  if (!draft) return null;
  const update = (patch: Partial<Draft>) => setDraft(current => current && { ...current, ...patch });
  function send() {
    if (!draft) return;
    const place = draft.place.trim();
    if (!place) { showToast('先写地点'); return; }
    const amount = draft.distance.trim();
    const location: MessageLocation = { place: place.slice(0, 60), ...(draft.address.trim() ? { address: draft.address.trim().slice(0, 80) } : {}), ...(amount ? { distance: amount + ' ' + draft.unit } : {}) };
    setDraft(null);
    (window as Window & { smallphoneSendChatLocation?: (location: MessageLocation) => void }).smallphoneSendChatLocation?.(location);
  }
  return createPortal(<div className="sp-confirm-overlay chat-photo-viewer chat-location-send" onClick={event => { if (event.target === event.currentTarget) setDraft(null); }}>
    <div className="sp-confirm" role="dialog" aria-modal="true" aria-label="发送位置">
      <div className="sp-confirm-bar"><span className="sp-confirm-title">发送位置</span></div>
      <div className="sp-confirm-body">
        <div className="chat-location-preview" aria-hidden="true"><span className="chat-location-pin" /></div>
        <label className="chat-photo-viewer-label" htmlFor="chatLocationPlace">地点（例如：学校门口的便利店、家里、海边）</label>
        <input id="chatLocationPlace" className="chat-photo-viewer-prompt chat-location-input" maxLength={60} value={draft.place} onChange={event => update({ place: event.currentTarget.value })} autoFocus />
        <label className="chat-photo-viewer-label" htmlFor="chatLocationAddress">详细地址（可以不写）</label>
        <input id="chatLocationAddress" className="chat-photo-viewer-prompt chat-location-input" maxLength={80} value={draft.address} onChange={event => update({ address: event.currentTarget.value })} />
        <label className="chat-photo-viewer-label" htmlFor="chatLocationDistance">离他多远（可以不写）</label>
        <div className="chat-location-distance-row">
          <input id="chatLocationDistance" className="chat-photo-viewer-prompt chat-location-input" inputMode="decimal" maxLength={8} value={draft.distance} onChange={event => update({ distance: event.currentTarget.value.replace(/[^\d.]/g, '') })} />
          <div className="chat-location-units" role="group" aria-label="距离单位">
            {(['米', '公里'] as const).map(unit => <button key={unit} type="button" aria-pressed={draft.unit === unit} onClick={() => update({ unit })}>{unit}</button>)}
          </div>
        </div>
      </div>
      <div className="sp-confirm-actions">
        <PressedButton type="button" className="sp-confirm-btn" onClick={() => setDraft(null)}>取消</PressedButton>
        <PressedButton type="button" className="sp-confirm-btn is-primary" onClick={send}>发送</PressedButton>
      </div>
    </div>
  </div>, document.body);
}
