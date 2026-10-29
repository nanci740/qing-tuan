import './Memories.css';
import { useLayoutEffect, useState, useSyncExternalStore } from 'react';
import { createPortal } from 'react-dom';
import { PressedButton } from '../../components/shared/PressedButton';
import { readChatCharacters } from '../../utils/chatCharacterStorage';
import { groupMembers, isGroup } from '../../utils/chatGroups';
import { contactName } from '../../utils/contactsStorage';
import { DEFAULT_AVATAR } from '../../utils/defaultAvatar';
import { showToast } from '../../utils/toast';
import { addMemories, patchMemory, readMemories, removeMemory, subscribeMemories, updateMemories } from '../../utils/memoryStorage';
import type { MemoryItem, MemoryKind } from '../../utils/memoryStorage';
import { KIND_NAME, mergeDuplicates, sweepChat } from '../../utils/memoryEngine';
import { fillVectors, vectorModel } from '../../utils/memoryVectors';

type View = { kind: 'home' } | { kind: 'chat'; key: string };
interface Draft { id?: string; kind: MemoryKind; text: string; pinned: boolean }
const KINDS: MemoryKind[] = ['you', 'event', 'promise'];
/** 三种记忆的像素小图：关于你是爱心、发生过是铅笔、约定是星星（7×7，一格一点）。 */
const PIXELS: Record<MemoryKind, string[]> = {
  you: ['.XX.XX.', 'XXXXXXX', 'XXXXXXX', '.XXXXX.', '..XXX..', '...X...', '.......'],
  event: ['.....XX', '....X.X', '...X.X.', '..X.X..', '.XXX...', 'XXX....', 'X......'],
  promise: ['...X...', '...X...', 'XXXXXXX', '.XXXXX.', '..XXX..', '.XX.XX.', '.X...X.'],
};
function PixelIcon({ kind, x = 0, y = 0 }: { kind: MemoryKind; x?: number; y?: number }) {
  return <g className="mx-pixel">{PIXELS[kind].flatMap((row, top) => [...row].map((dot, left) => dot === 'X' ? <rect key={`${top}-${left}`} x={x + left} y={y + top} width="1" height="1" /> : null))}</g>;
}
/** 一条记忆的小文件：右上角往下折一个角，中间是像素图。 */
function FileIcon({ kind }: { kind: MemoryKind }) {
  return <svg className="mx-file" viewBox="0 0 16 19" shapeRendering="crispEdges" aria-hidden="true">
    <path className="mx-file-paper" d="M.5.5h10l5 5v13H.5z" /><path className="mx-file-fold" d="M10.5.5v5h5" />
    <PixelIcon kind={kind} x={4} y={8} />
  </svg>;
}
const FROM = { chat: '聊天时记下', sweep: '整理自聊天', mine: '你加的' };
const day = (at: number) => { const date = new Date(at); return `${date.getMonth() + 1}/${date.getDate()}`; };
const nameOf = (key: string) => { const item = readChatCharacters().find(one => one.archiveId === key); return item ? contactName(key, String(item.name || '')) : ''; };

/** 视窗标题栏上的三个小方块，只是装饰。 */
function WindowButtons() {
  return <span className="mx-deco" aria-hidden="true">
    <i><svg viewBox="0 0 10 10"><path d="M2 8.5h5.5" strokeWidth="1.6" /></svg></i>
    <i><svg viewBox="0 0 10 10"><rect x="1.5" y="1.5" width="7" height="7" strokeWidth="1.1" /><path d="M1.5 2.4h7" strokeWidth="1.4" /></svg></i>
    <i><svg viewBox="0 0 10 10"><path d="M2 2l6 6M8 2l-6 6" strokeWidth="1.3" /></svg></i>
  </span>;
}
/** 钉住的记忆：一颗像素图钉。 */
function Pin() {
  return <svg className="mx-pin" viewBox="0 0 12 12" shapeRendering="crispEdges" aria-label="钉住了">
    <rect x="4" y="1" width="4" height="1" /><rect x="3" y="2" width="6" height="3" /><rect x="2" y="5" width="8" height="1" /><rect x="5" y="6" width="2" height="1" /><rect className="mx-pin-needle" x="5.5" y="7" width="1" height="4" />
    <rect className="mx-pin-shine" x="4" y="2" width="1" height="2" />
  </svg>;
}
/** 资料夹：后面那片左上角有个耳朵，照片插在中间，前面那片右下角一颗爱心；群聊插两张。 */
function Folder({ photos }: { photos: string[] }) {
  const pic = (src: string, x: number, turn: number) => <g key={x} transform={`rotate(${turn} ${x + 13} 18)`}>
    <rect className="mx-folder-photo" x={x} y="4" width="26" height="28" /><image href={src} x={x + 2} y="6" width="22" height="22" preserveAspectRatio="xMidYMid slice" />
  </g>;
  return <svg className="mx-folder" viewBox="0 0 64 52" aria-hidden="true">
    <path className="mx-folder-back" d="M3 6h17l4 5h37v38H3z" />
    {photos.length > 1 ? [pic(photos[0], 20, -7), pic(photos[1], 31, 8)] : pic(photos[0] || DEFAULT_AVATAR, 26, 6)}
    <path className="mx-folder-front" d="M3 20h58v29H3z" /><path className="mx-folder-shine" d="M6 22.5h52" />
    <path className="mx-folder-heart" d="M53 40c-1.6-1.4-3.5-2.6-3.5-4.2 0-1 .8-1.8 1.8-1.8.7 0 1.3.4 1.7 1 .4-.6 1-1 1.7-1 1 0 1.8.8 1.8 1.8 0 1.6-1.9 2.8-3.5 4.2z" />
  </svg>;
}

/** 主画面的「Memories」：一个老电脑的资料夹程序。首页每个聊天一个资料夹，点进去是他记得的事，可以改、钉住、删、自己加，或叫他现在整理一次。 */
export function Memories() {
  const [open, setOpen] = useState(false), [view, setView] = useState<View>({ kind: 'home' });
  const [tab, setTab] = useState<MemoryKind | ''>(''), [draft, setDraft] = useState<Draft | null>(null), [sweeping, setSweeping] = useState('');
  const memories = useSyncExternalStore(subscribeMemories, readMemories);
  useLayoutEffect(() => {
    const show = () => { setView({ kind: 'home' }); setOpen(true); void mergeDuplicates().then(() => fillVectors()); };
    window.addEventListener('qingtuan:open-memories', show);
    return () => window.removeEventListener('qingtuan:open-memories', show);
  }, []);
  // 搜索：只在手机里找包含这些字的记忆，不用 API
  const [search, setSearch] = useState('');
  if (!open) return null;

  const characters = readChatCharacters();
  const photosOf = (key: string) => {
    const item = characters.find(one => one.archiveId === key);
    if (!item) return [DEFAULT_AVATAR];
    if (isGroup(item)) return item.photoUrl ? [item.photoUrl] : groupMembers(item, characters).slice(0, 2).map(member => member.photoUrl || DEFAULT_AVATAR);
    return [item.photoUrl || DEFAULT_AVATAR];
  };
  const itemsOf = (key: string) => memories.items.filter(item => item.chat === key);
  const chats = characters.filter(item => item.archiveId && (isGroup(item) || !item.group));
  const openChat = (key: string) => { setView({ kind: 'chat', key }); setTab(''); setSearch(''); };
  async function sweep(key: string) {
    setSweeping(key);
    try { const count = await sweepChat(key, true); showToast(count ? `记下了 ${count} 条` : '没有新的可以记'); void mergeDuplicates(); }
    catch (error) { showToast(String((error as Error)?.message || error).slice(0, 60)); }
    finally { setSweeping(''); }
  }
  function save() {
    if (!draft || view.kind !== 'chat') return;
    const text = draft.text.trim().slice(0, 200);
    if (!text) { showToast('写点什么'); return; }
    if (draft.id) patchMemory(draft.id, { kind: draft.kind, text, pinned: draft.pinned || undefined });
    else addMemories([{ chat: view.key, kind: draft.kind, text, from: 'mine', ...(draft.pinned ? { pinned: true } : {}) }]);
    setDraft(null);
  }

  const inside = view.kind === 'chat', key = inside ? view.key : '', group = inside && isGroup(characters.find(one => one.archiveId === key));
  const title = inside ? `${nameOf(key)} - memories.exe` : 'memories.exe', address = inside ? `C:\\My Memories\\${nameOf(key)}\\` : 'C:\\My Memories\\';
  const searching = inside && !!search.trim();
  const list = !inside ? [] : searching
    ? itemsOf(key).filter(item => item.text.includes(search.trim()) && (!tab || item.kind === tab)).sort((a, b) => b.at - a.at)
    : itemsOf(key).filter(item => !tab || item.kind === tab).sort((a, b) => Number(!!b.pinned) - Number(!!a.pinned) || b.at - a.at);
  const whoText = (item: MemoryItem) => group ? (item.who?.length ? `${item.who.map(nameOf).filter(Boolean).join('、')}记得` : '大家都记得') : FROM[item.from];

  return <section className="mx-page" role="dialog" aria-modal="true" aria-label="Memories">
    <header className="mx-bar">
      {inside ? null : <button type="button" className="mx-back" aria-label="返回主画面" onClick={() => setOpen(false)}>
        <svg viewBox="0 0 24 24" aria-hidden="true"><polyline points="15 18 9 12 15 6" /></svg>
      </button>}
      <b>{title}</b>
      <WindowButtons />
    </header>
    <div className="mx-menu" aria-hidden="true"><span><u>F</u>ile</span><span><u>E</u>dit</span><span><u>V</u>iew</span><span><u>H</u>elp</span></div>
    <div className="mx-address">
      {inside ? <PressedButton type="button" className="mx-btn mx-up" onClick={() => setView({ kind: 'home' })}>↑ 上一层</PressedButton> : null}
      <span>Address</span><code>{address}</code>
    </div>
    {inside ? <div className="mx-address mx-search">
      <span>Search</span><input type="search" value={search} placeholder="找包含这些字的" aria-label="搜索记忆" onChange={event => setSearch(event.currentTarget.value)} />
      {search ? <PressedButton type="button" className="mx-btn mx-up" aria-label="清掉" onClick={() => setSearch('')}>✕</PressedButton> : null}
    </div> : null}
    {inside ? <div className="mx-tabs" role="tablist">
      {(['', ...KINDS] as (MemoryKind | '')[]).map(kind => <button type="button" role="tab" key={kind || 'all'} aria-selected={tab === kind} onClick={() => setTab(kind)}>{kind ? KIND_NAME[kind] : '全部'}</button>)}
    </div> : null}
    <div className={'mx-pane' + (inside ? ' is-list' : '')}>
      {inside ? <>
        {searching ? <p className="mx-found">{`找到 ${list.length} 条`}</p> : null}
        {list.map(item => <button type="button" className="mx-row" key={item.id} onClick={() => setDraft({ id: item.id, kind: item.kind, text: item.text, pinned: !!item.pinned })}>
          <FileIcon kind={item.kind} />
          <span className="mx-row-text">{item.text}<small>{KIND_NAME[item.kind]} · {day(item.at)} · {whoText(item)}</small></span>
          {item.pinned ? <Pin /> : null}
        </button>)}
        {!list.length && !searching ? <p className="mx-empty">{tab ? '这一类还没有。' : group ? '群里还没记下什么。聊一阵子会自己记，也可以按「整理一次」。' : '他还没记下什么。聊一阵子会自己记，也可以按「整理一次」。'}</p> : null}
      </> : <>
        <div className="mx-grid">
          {chats.map(item => <button type="button" key={item.archiveId} className="mx-folder-item" onClick={() => openChat(item.archiveId)}>
            <Folder photos={photosOf(item.archiveId)} />
            <b>{nameOf(item.archiveId) || item.name}</b><small>{itemsOf(item.archiveId).length} files</small>
          </button>)}
        </div>
        {!chats.length ? <p className="mx-empty">还没有聊天。</p> : null}
        <label className="mx-check">
          <input type="checkbox" checked={memories.auto} onChange={event => updateMemories({ auto: event.currentTarget.checked })} />
          <i aria-hidden="true" />自动整理：聊天挤出上下文时，整理成记忆
        </label>
        <label className="mx-check">
          <input type="checkbox" checked={memories.recallOld} onChange={event => updateMemories({ recallOld: event.currentTarget.checked })} />
          <i aria-hidden="true" />主动提起旧事：聊着聊着，他偶尔会自己想起以前的事
        </label>
        <p className="mx-vector">{vectorModel() ? <>向量召回：<b>{vectorModel()}</b>　按意思想起相关的记忆</> : '向量召回：没设，照字眼比对'}
          <small>在「API 设置 → 向量模型」换</small></p>
      </>}
    </div>
    {inside ? <div className="mx-tools">
      <PressedButton type="button" className="mx-btn" onClick={() => setDraft({ kind: 'you', text: '', pinned: false })}>＋ 新增</PressedButton>
      <PressedButton type="button" className="mx-btn" disabled={sweeping === key} onClick={() => void sweep(key)}>{sweeping === key ? '整理中…' : '整理一次'}</PressedButton>
    </div> : null}
    <footer className="mx-status">
      <span>{inside ? `${itemsOf(key).length} object(s)` : `${chats.length} object(s)`}</span>
      <span>{inside ? `${itemsOf(key).filter(item => item.pinned).length} pinned` : `${memories.items.length} memories`}</span>
    </footer>

    {draft ? createPortal(<div className="sp-confirm-overlay mx-dialog" onClick={event => { if (event.target === event.currentTarget) setDraft(null); }}>
      <div className="sp-confirm" role="dialog" aria-modal="true" aria-label={draft.id ? '改这条记忆' : '新增记忆'}>
        <div className="sp-confirm-bar"><span className="sp-confirm-title">{draft.id ? '改这条记忆' : '新增记忆'}</span></div>
        <div className="sp-confirm-body mx-form">
          <b>类型</b>
          <div className="mx-kinds">{KINDS.map(kind => <PressedButton type="button" key={kind} aria-pressed={draft.kind === kind} onClick={() => setDraft({ ...draft, kind })}><svg viewBox="0 0 7 7" shapeRendering="crispEdges" aria-hidden="true"><PixelIcon kind={kind} /></svg>{KIND_NAME[kind]}</PressedButton>)}</div>
          <b>内容</b>
          <textarea rows={3} maxLength={200} value={draft.text} placeholder={group ? '例如：说好周末一起去吃火锅' : '例如：她不吃香菜'} onChange={event => setDraft({ ...draft, text: event.currentTarget.value })} />
          <label className="mx-check"><input type="checkbox" checked={draft.pinned} onChange={event => setDraft({ ...draft, pinned: event.currentTarget.checked })} /><i aria-hidden="true" />钉住，每次都记得</label>
          {draft.id ? <PressedButton type="button" className="mx-delete" onClick={() => { removeMemory(draft.id!); setDraft(null); }}>删掉这条</PressedButton> : null}
        </div>
        <div className="sp-confirm-actions">
          <PressedButton type="button" className="sp-confirm-btn" onClick={() => setDraft(null)}>取消</PressedButton>
          <PressedButton type="button" className="sp-confirm-btn is-primary" onClick={save}>存好</PressedButton>
        </div>
      </div>
    </div>, document.body) : null}
  </section>;
}
