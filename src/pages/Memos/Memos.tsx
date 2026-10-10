import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useMemos } from '../../hooks/useMemos';
import type { MemoFolder, MemoKind, MemoNote } from '../../types/memos';
import { memoSummary, memoTitle, selectMemos } from '../../utils/memoStorage';
import { confirmChat } from '../../utils/chatConfirm';
import './Memos.css';

type SymbolName = 'note' | 'list' | 'plus' | 'pin' | 'trash' | 'search' | 'disk' | 'close';
const symbols = {
  note: 'M3 1h7v1h1v1h1v11H3z M4 2v11h7V5H8V2z M9 2v2h2V3h-1V2z M5 7h5v1H5z M5 9h5v1H5z M5 11h3v1H5z',
  list: 'M2 1h12v14H2z M3 2v12h10V2z M4 4h2v2H4z M7 4h5v1H7z M4 7h2v2H4z M7 7h5v1H7z M4 10h2v2H4z M7 10h5v1H7z',
} as const;
const outlineSymbols = {
  search: 'M21 21l-5-5 M17 10a7 7 0 1 1-14 0 7 7 0 0 1 14 0',
  disk: 'M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h12l4 4v12a2 2 0 0 1-2 2z M7 3v6h10V3 M7 21v-8h10v8',
  close: 'M6 6l12 12 M18 6 6 18',
  plus: 'M12 5v14 M5 12h14',
  trash: 'M10 11v6 M14 11v6 M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6 M3 6h18 M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2',
} as const;
function MemoSymbol({ name }: { name: SymbolName }) {
  if (name === 'pin') {
    return <svg className="memos-symbol" viewBox="0 0 10 10" aria-hidden="true"><path d="M3 0h4v1H6.5v3l1.5 1.5V6H5.5v4h-1V6H2v-.5L3.5 4V1H3z" fill="currentColor" /></svg>;
  }
  if (name !== 'note' && name !== 'list') {
    return <svg className="memos-symbol" viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d={outlineSymbols[name]} />
    </svg>;
  }
  return <svg className="memos-symbol" viewBox="0 0 16 16" aria-hidden="true" shapeRendering="crispEdges">
    <path d={symbols[name]} fill="currentColor" fillRule="evenodd" />
  </svg>;
}
const pixels = {
  note: 'M6 2h10v2h2v2h2v14h-2v2H6v-2H4V4h2z M6 4v16h12V10h-4V4z M16 4v4h2V6h-2z M8 12h8v2H8z M8 16h6v2H8z',
  list: 'M4 3h16v2h2v14h-2v2H4v-2H2V5h2z M4 5v14h16V5z M6 7h2v2H6z M10 7h8v2h-8z M6 11h2v2H6z M10 11h8v2h-8z M6 15h2v2H6z M10 15h6v2h-6z',
  trash: 'M9 2h6v2H9z M5 4h14v2H5z M5 8h14v12h-2v2H7v-2H5z M7 10v10h10V10z M9 12h2v6H9z M13 12h2v6h-2z',
};
function MemoPixel({ name }: { name: keyof typeof pixels }) {
  return <svg className="memos-pixel" viewBox="-1 -1 26 26" aria-hidden="true" shapeRendering="crispEdges">
    <path d={pixels[name]} fill="currentColor" fillRule="evenodd" />
  </svg>;
}
function dateLabel(time: number, full = false) {
  const date = new Date(time);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${full ? `${date.getFullYear()}.` : ''}${pad(date.getMonth() + 1)}.${pad(date.getDate())}`;
}
const folderNames: Record<MemoFolder, string> = { all: '全部记录', pinned: '置顶', trash: '回收站' };

export function Memos({ onClose }: { onClose: () => void }) {
  const memos = useMemos();
  const [folder, setFolder] = useState<MemoFolder>('all');
  const [search, setSearch] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [newMenu, setNewMenu] = useState(false);
  const [folderMenu, setFolderMenu] = useState(false);
  const root = useRef<HTMLElement>(null);
  const titleInput = useRef<HTMLInputElement>(null);
  const newArea = useRef<HTMLDivElement>(null);
  const folderArea = useRef<HTMLDivElement>(null);
  const newButton = useRef<HTMLButtonElement>(null);
  const backButton = useRef<HTMLButtonElement>(null);
  const selected = memos.notes.find(note => note.id === selectedId && note.deletedAt === null);
  const visible = selectMemos(memos.notes, folder, search);
  const count = memos.notes.filter(note => note.deletedAt === null).length;

  function back() {
    if (!memos.flush()) return;
    if (selectedId) setSelectedId(null);
    else onClose();
  }
  function create(kind: MemoKind) {
    const id = memos.create(kind);
    if (id) { setSelectedId(id); setNewMenu(false); }
  }
  function changeFolder(next: MemoFolder) {
    setFolder(next); setSearch(''); setNewMenu(false); setFolderMenu(false);
  }

  useEffect(() => {
    const previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    backButton.current?.focus();
    return () => { document.body.style.overflow = previousOverflow; previousFocus?.focus(); };
  }, []);
  useEffect(() => {
    if (selectedId) titleInput.current?.focus();
    else backButton.current?.focus();
  }, [selectedId]);
  useEffect(() => {
    if (!newMenu && !folderMenu) return;
    const outside = (event: PointerEvent) => {
      if (!newArea.current?.contains(event.target as Node)) setNewMenu(false);
      if (!folderArea.current?.contains(event.target as Node)) setFolderMenu(false);
    };
    document.addEventListener('pointerdown', outside, true);
    return () => document.removeEventListener('pointerdown', outside, true);
  }, [newMenu, folderMenu]);

  function checklistChange(note: MemoNote, id: string, values: { text?: string; done?: boolean }) {
    memos.update(note.id, { items: note.items.map(item => item.id === id ? { ...item, ...values } : item) });
  }
  const saveLabel = memos.saveState === 'error' ? '保存失败' : memos.saveState === 'pending' ? '保存中…' : '已保存';

  return createPortal(<section className="memos-page" ref={root} role="dialog" aria-modal="true" aria-labelledby="memosHeading"
    onTouchStart={event => event.stopPropagation()} onTouchEnd={event => event.stopPropagation()}
    onPointerDown={event => event.stopPropagation()} onPointerUp={event => event.stopPropagation()}
    onKeyDown={event => {
      if (event.key === 'Escape') {
        event.preventDefault(); event.stopPropagation();
        if (newMenu) { setNewMenu(false); newButton.current?.focus(); }
        else if (folderMenu) setFolderMenu(false);
        else back();
      }
      if (event.key === 'Tab') {
        const scope = root.current;
        const elements = Array.from(scope?.querySelectorAll<HTMLElement>('button:not(:disabled), input:not(:disabled), textarea:not(:disabled)') ?? [])
          .filter(element => element.getClientRects().length > 0);
        const first = elements[0], last = elements.at(-1);
        if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
        else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
      }
    }}>
    <header className="memos-titlebar">
      <button type="button" className="memos-button memos-back" ref={backButton} onClick={back} aria-label={selected ? '返回备忘录目录' : '返回主页'}><svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><polyline points="15 18 9 12 15 6" /></svg></button>
      <h1 id="memosHeading"><span>{selected ? memoTitle(selected) : 'Memo'}</span><small>{selected?.kind === 'checklist' ? '.list' : '.txt'}</small></h1>
      {!selected && <div className="memos-folder-area" ref={folderArea}>
        <button type="button" className="memos-folder-button" aria-expanded={folderMenu} aria-controls="memosFolderChoices" aria-label="切换备忘录分类" onClick={() => setFolderMenu(!folderMenu)}>{folderNames[folder]}<span aria-hidden="true">▾</span></button>
        {folderMenu && <div id="memosFolderChoices" className="memos-folder-menu">{(['all', 'pinned', 'trash'] as const).map(value => <button type="button" key={value} aria-pressed={folder === value} onClick={() => changeFolder(value)}>{folderNames[value]}<span>{memos.notes.filter(note => value === 'trash' ? note.deletedAt !== null : note.deletedAt === null && (value !== 'pinned' || note.pinned)).length}</span></button>)}</div>}
      </div>}
    </header>
    <div className="memos-binding" aria-hidden="true">{Array.from({ length: 12 }, (_, i) => <i key={i} />)}</div>
    <main className="memos-window">
      {memos.loadError && <div className="memos-notice" role="alert">{memos.loadError}<button type="button" className="memos-button" onClick={memos.retryRead}>重新读取</button></div>}
      {memos.saveState === 'error' && <div className="memos-notice" role="alert">保存失败，当前内容仍在。请重试后再退出。<button type="button" className="memos-button" onClick={memos.flush}>重试保存</button></div>}
      {selected ? <>
        <div className="memos-editor-tools">
          <span className="memos-tag">{selected.kind === 'text' ? '文字记录' : '勾选清单'}</span>
          <time>{dateLabel(selected.createdAt, true)}</time>
          <button type="button" className="memos-button" aria-pressed={selected.pinned} onClick={() => memos.update(selected.id, { pinned: !selected.pinned })}><MemoSymbol name="pin" />{selected.pinned ? '已置顶' : '置顶'}</button>
          <button type="button" className="memos-button" onClick={() => { memos.trash(selected.id); setSelectedId(null); }} aria-label="移入回收站"><MemoSymbol name="trash" /></button>
        </div>
        <div className={`memos-paper memos-paper-${selected.paper}`}>
          <label className="memos-title-field"><span className="memos-sr-only">备忘录标题</span><input ref={titleInput} value={selected.title} placeholder="给这一页起个名字" maxLength={120} onChange={event => memos.update(selected.id, { title: event.target.value })} onBlur={memos.flush} /></label>
          {selected.kind === 'text' ? <textarea className="memos-body-field" aria-label="备忘录正文" value={selected.body} placeholder="从这里开始写…" onChange={event => memos.update(selected.id, { body: event.target.value })} onBlur={memos.flush} /> :
            <div className="memos-checklist">
              {selected.items.map((item, index) => <div key={item.id} className={`memos-check-row${item.done ? ' is-done' : ''}`}>
                <input className="memos-checkbox" type="checkbox" checked={item.done} aria-label={`完成第 ${index + 1} 项`} onChange={event => checklistChange(selected, item.id, { done: event.target.checked })} />
                <input className="memos-check-text" value={item.text} aria-label={`第 ${index + 1} 项内容`} placeholder="记下一件要做的事" onChange={event => checklistChange(selected, item.id, { text: event.target.value })} onBlur={memos.flush} />
                <button type="button" className="memos-item-remove" aria-label={`删除第 ${index + 1} 项`} onClick={() => memos.update(selected.id, { items: selected.items.filter(value => value.id !== item.id) })}><MemoSymbol name="close" /></button>
              </div>)}
              <button type="button" className="memos-add-item" onClick={() => memos.addItem(selected.id)}><MemoSymbol name="plus" />添加一项</button>
            </div>}
        </div>
        <div className="memos-paper-options"><span>纸张</span>{(['lined', 'plain'] as const).map(paper => <button type="button" key={paper} className="memos-button" aria-pressed={selected.paper === paper} onClick={() => memos.update(selected.id, { paper })}>{paper === 'lined' ? '横线' : '空白'}</button>)}</div>
      </> : <>
        <div className="memos-toolbar">
          <label className="memos-search"><MemoSymbol name="search" /><input type="search" value={search} onChange={event => setSearch(event.target.value)} placeholder="查找这一页记录" aria-label="搜索备忘录" /></label>
          <div className="memos-new-area" ref={newArea}>
            <button type="button" ref={newButton} className="memos-button memos-new-button" disabled={Boolean(memos.loadError)} aria-expanded={newMenu} aria-controls="memosNewChoices" onClick={() => setNewMenu(!newMenu)}><MemoSymbol name="plus" />新建</button>
            {newMenu && <div id="memosNewChoices" className="memos-new-menu"><button type="button" onClick={() => create('text')}><MemoSymbol name="note" />文字记录</button><button type="button" onClick={() => create('checklist')}><MemoSymbol name="list" />勾选清单</button></div>}
          </div>
        </div>
        <div className="memos-tagline"><span className="memos-tag">{folderNames[folder]}</span><span>{folder === 'trash' ? '删除日期' : `${visible.length} 条`}</span></div>
        <div className="memos-directory">
          {visible.length ? <ul className="memos-note-list">{visible.map(note => <li key={note.id} className="memos-note-row">
            {folder === 'trash' ? <div className="memos-note-entry"><MemoPixel name={note.kind === 'text' ? 'note' : 'list'} /><div className="memos-note-copy"><strong>{memoTitle(note)}</strong><span>{memoSummary(note)}</span></div><time>{dateLabel(note.deletedAt ?? note.updatedAt)}</time></div> :
              <button type="button" className="memos-note-entry" onClick={() => setSelectedId(note.id)}><MemoPixel name={note.kind === 'text' ? 'note' : 'list'} /><div className="memos-note-copy"><strong>{note.pinned && <MemoSymbol name="pin" />}{memoTitle(note)}</strong><span>{memoSummary(note)}</span></div><time>{dateLabel(note.updatedAt)}</time></button>}
            {folder === 'trash' && <div className="memos-trash-tools"><button type="button" className="memos-button" onClick={() => memos.restore(note.id)}>恢复</button><button type="button" className="memos-button memos-danger" onClick={() => { void confirmChat({ title: '彻底删除', message: '这条备忘录删除后将无法恢复。', confirmText: '删除', danger: true }).then(ok => { if (ok) memos.erase(note.id); }); }}>彻底删除</button></div>}
          </li>)}</ul> : <div className="memos-empty"><MemoPixel name={folder === 'trash' ? 'trash' : 'note'} /><strong>{search ? '没有找到这条记录' : folder === 'trash' ? '回收站是空的' : folder === 'pinned' ? '还没有置顶的记录' : '还没有写下什么'}</strong><p>{search ? '换个关键词再找找。' : folder === 'trash' ? '删除的记录会先放到这里。' : folder === 'pinned' ? '编辑时点一下置顶，就能在这里找到。' : '一句灵感、一张清单，都可以记下来。'}</p>{!search && folder === 'all' && <button type="button" className="memos-button" disabled={Boolean(memos.loadError)} onClick={() => create('text')}><MemoSymbol name="plus" />写第一条备忘录</button>}</div>}
        </div>
      </>}
      <footer className="memos-status"><span role="status"><MemoSymbol name="disk" />{memos.loadError ? '读取失败' : saveLabel}</span><span>{selected ? selected.kind === 'text' ? `${Array.from(selected.body).length} 字` : `${selected.items.filter(item => item.done && item.text.trim()).length}/${selected.items.filter(item => item.text.trim()).length} 项完成` : `${count} 条记录`}</span><svg className="memos-grip" viewBox="0 0 12 12" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1"><path d="M2 10l8-8 M5 10l5-5 M8 10l2-2" /></svg></footer>
    </main>
  </section>, document.body);
}

