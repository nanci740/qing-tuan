import { useRef, useState } from 'react';
import { flushSync } from 'react-dom';
import type { PointerEvent } from 'react';
import type { ChatThreadSnapshot } from '../../../types/chatThread';
import { DEFAULT_AVATAR } from '../../../utils/defaultAvatar';
import { useButtonPress } from '../../../hooks/useButtonPress';

/** 会话卡片、搜索结果类名和长按事件由 React 管理，聊天打开与操作暂接聊天服务。 */
export function ChatThread({
  thread,
  miss
}: {
  thread: ChatThreadSnapshot;
  miss: boolean;
}) {
  const [holding, setHolding] = useState(false);
  const press = useButtonPress('chat-thread-card chat-generated-thread' + (holding ? ' is-long-pressing' : '') + (miss ? ' is-search-miss' : ''));
  const timer = useRef<number | null>(null);
  const start = useRef({
    x: 0,
    y: 0
  });
  const triggered = useRef(false);
  function clear() {
    if (timer.current) window.clearTimeout(timer.current);
    timer.current = null;
    setHolding(false);
  }
  function down(event: PointerEvent<HTMLButtonElement>) {
    if (!(event.pointerType === 'mouse' && event.button !== 0)) {
      start.current = {
        x: event.clientX,
        y: event.clientY
      };
      triggered.current = false;
      flushSync(() => setHolding(true));
      timer.current = window.setTimeout(() => {
        triggered.current = true;
        setHolding(false);
        thread.openActions(start.current.x, start.current.y);
      }, 520);
    }
    press.onPointerDownCapture(event);
  }
  return <button className={press.className} data-sp-press={press['data-sp-press']} type="button" data-character-id={thread.id} onPointerDown={down} onPointerMove={event => {
    if (timer.current && Math.hypot(event.clientX - start.current.x, event.clientY - start.current.y) > 9) clear();
  }} onPointerUp={clear} onPointerCancel={clear} onPointerLeave={clear} onContextMenu={event => {
    event.preventDefault();
    clear();
    triggered.current = true;
    thread.openActions(event.clientX, event.clientY);
  }} onClick={event => {
    if (triggered.current) {
      event.preventDefault();
      event.stopPropagation();
      triggered.current = false;
      return;
    }
    thread.activate();
  }}>
    <span className="chat-avatar-wrap"><img className="chat-avatar" alt="角色头像" src={thread.photoUrl || DEFAULT_AVATAR} /><span className="chat-online-dot" aria-hidden="true" /></span>
    <span className="chat-thread-copy"><span className="chat-thread-name-row"><span className="chat-thread-name">{thread.name}</span>{thread.favorite && <span className="chat-thread-favorite" aria-label="特别关注" data-title="特别关注"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78L12 21.23l8.84-8.84a5.5 5.5 0 0 0 0-7.78z" /></svg></span>}{thread.pinned && <span className="chat-thread-pin">置顶</span>}</span><span className={'chat-thread-preview' + (thread.draft ? ' is-draft' : '')}>{thread.preview}</span></span>
    <span className="chat-thread-meta"><span className="chat-thread-time">{thread.time}</span><span className="chat-unread-dot" hidden={!thread.unread}>{thread.unread ? thread.unread > 99 ? '99+' : String(thread.unread) : ''}</span></span>
  </button>;
}
