import './ChatWorldPanel.css';
import { useLayoutEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react';
import { createPortal } from 'react-dom';
import { PressedButton } from './PressedButton';
import { useChatPreferences } from '../../providers/ChatPreferencesProvider';
import { catalogRevision, subscribeCatalog } from '../../utils/catalogStorage';
import { readChatWorldBooks, readWorldReport } from '../../utils/chatWorldContext';
import { worldBookBoundTo } from '../../utils/worldStorage';

type Tab = 'books' | 'read';
const activeChatKey = () => String((window as Window & { smallphoneGetActiveChatKey?: () => unknown }).smallphoneGetActiveChatKey?.() || '');
const timeText = (at: number) => new Date(at).toLocaleString('zh-CN', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit', hour12: false });

/** 聊天室加号里的「世界书」：这个聊天用哪几本（跟聊天设置同一份），以及上一次回复实际读到哪些条目。 */
export function ChatWorldPanel() {
  const [open, setOpen] = useState(false), [tab, setTab] = useState<Tab>('books'), [chatKey, setChatKey] = useState('');
  const { values, change } = useChatPreferences();
  const revision = useSyncExternalStore(subscribeCatalog, () => catalogRevision('worldBooks'));
  const books = useMemo(() => open ? readChatWorldBooks() : [], [open, revision]);
  const report = useMemo(() => open ? readWorldReport(chatKey) : null, [open, chatKey]);
  const limitInput = useRef<HTMLInputElement>(null);
  useLayoutEffect(() => {
    const start = (event: Event) => { if ((event as CustomEvent<string>).detail !== 'world') return; setChatKey(activeChatKey()); setTab('books'); setOpen(true); };
    window.addEventListener('qingtuan:chat-action', start);
    return () => window.removeEventListener('qingtuan:chat-action', start);
  }, []);
  useLayoutEffect(() => { if (open && limitInput.current) limitInput.current.value = values.worldBookLimit ? String(values.worldBookLimit) : ''; }, [open, values.worldBookLimit]);
  if (!open) return null;
  function toggle(id: string, on: boolean) {
    const ids = new Set(values.linkedWorldBooks);
    if (on) ids.add(id); else ids.delete(id);
    change('linkedWorldBooks', [...ids]);
  }
  function commitLimit() {
    // 只有「这个聊天用的」那页才有字数框；在另一页关掉时不要把上限当成清空。
    if (!limitInput.current) return;
    const raw = limitInput.current.value.trim(), next = Math.min(200000, Math.max(0, Math.floor(Number(raw)) || 0));
    if (limitInput.current) limitInput.current.value = next ? String(next) : '';
    if (next !== values.worldBookLimit) change('worldBookLimit', next);
  }
  const close = () => { commitLimit(); setOpen(false); };
  return createPortal(<div className="sp-confirm-overlay chat-world-panel" onClick={event => { if (event.target === event.currentTarget) close(); }}>
    <div className="sp-confirm" role="dialog" aria-modal="true" aria-label="世界书">
      <div className="sp-confirm-bar"><span className="sp-confirm-title">世界书</span></div>
      <div className="chat-world-tabs" role="tablist">
        <button type="button" role="tab" aria-selected={tab === 'books'} className={tab === 'books' ? 'is-active' : ''} onClick={() => setTab('books')}>这个聊天用的</button>
        <button type="button" role="tab" aria-selected={tab === 'read'} className={tab === 'read' ? 'is-active' : ''} onClick={() => setTab('read')}>上次读到的</button>
      </div>
      <div className="sp-confirm-body chat-world-body">
        {tab === 'books' ? <>
          {books.length ? books.map(book => {
            const id = String(book.id), bound = worldBookBoundTo(book, chatKey), off = book.enabled === false;
            return <label className={'chat-world-check' + (off ? ' is-off' : '')} key={id}>
              <input type="checkbox" disabled={bound} checked={bound || values.linkedWorldBooks.includes(id)} onChange={event => toggle(id, event.currentTarget.checked)} />
              <span>{String(book.name || '未命名世界书')}<small>{off ? '这本书在世界书里关着，勾了也不会读' : bound ? (book.bindId === 'all' ? '关联了全部角色，自动带上' : '关联了这个角色，自动带上') : '勾选才会带上'}</small></span>
            </label>;
          }) : <div className="sp-confirm-msg">还没有世界书，去主画面的「世界书」新建一本吧。</div>}
          <label className="chat-world-limit"><span>每次最多带<small>留空或 0 是不限</small></span>
            <input ref={limitInput} type="text" inputMode="numeric" autoComplete="off" placeholder="不限" onBlur={commitLimit}
              onKeyDown={event => { if (event.key === 'Enter' && !event.nativeEvent.isComposing) commitLimit(); }} /><em>字</em></label>
        </> : !report ? <div className="sp-confirm-msg">这个聊天还没有回复过，回一次之后这里会列出他读到的条目。</div> : <>
          <div className="chat-world-summary">{timeText(report.at)} 那次回复 · 带了 {report.items.length} 条，共 {report.used} 字{report.limit > 0 ? `（上限 ${report.limit}）` : '（不限字数）'}</div>
          {report.items.length ? report.items.map((item, index) => <div className="chat-world-item" key={index}>
            <b>{item.title}</b><span className="chat-world-book">{item.book}</span>
            <small>{item.reason}</small><small>放在：{item.place} · {item.chars} 字</small>
          </div>) : <div className="sp-confirm-msg">上次没有条目被带上：没有勾选的书，或关键词都没对上。</div>}
          {report.skipped.length ? <>
            <div className="chat-world-summary is-warn">超过字数上限，下面 {report.skipped.length} 条触发了但没带上</div>
            {report.skipped.map((item, index) => <div className="chat-world-item is-skipped" key={index}><b>{item.title}</b><span className="chat-world-book">{item.book}</span><small>{item.reason}</small></div>)}
          </> : null}
        </>}
      </div>
      <div className="sp-confirm-actions chat-world-actions">
        <PressedButton type="button" className="sp-confirm-btn is-primary" onClick={close}>关闭</PressedButton>
      </div>
    </div>
  </div>, document.body);
}
