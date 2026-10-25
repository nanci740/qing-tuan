import './ChatContactsPage.css';
import { useEffect, useLayoutEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react';
import { createPortal } from 'react-dom';
import { PressedButton } from '../../../components/shared/PressedButton';
import { readChatCharacters } from '../../../utils/chatCharacterStorage';
import { DEFAULT_AVATAR } from '../../../utils/defaultAvatar';
import { showToast } from '../../../utils/toast';
import { confirmChat } from '../../../utils/chatConfirm';
import { readMe } from '../../../utils/meStorage';
import { addContactTag, compareContactNames, contactInitial, patchFriendRequest, readContacts, removeContactTag, renameContactTag, setContactRemark, setContactTags, subscribeContacts, updateContacts } from '../../../utils/contactsStorage';
import type { FriendRequest, StrangerRate } from '../../../utils/contactsStorage';
import { acceptFriend, addableCharacters, generateStranger, sendFriendRequest, strangerTick } from '../../../utils/friendRequests';
import { useNativeRefs } from '../../../providers/NativeRefsProvider';
import type { ChatCharacter } from '../../../types/chatCharacters';
import type { CharacterDossier } from '../../../types/characterDossier';

type Bridge = Window & {
  smallphoneOpenChatApp?: () => void;
  smallphoneOpenCharacterChat?: (key: string) => unknown;
  smallphoneOpenCharacterCard?: (id?: unknown) => void;
  smallphonePatchCharacter?: (id: string, fields: { favorite?: boolean }) => void;
};
type View = 'all' | 'new' | 'add' | 'tags';
interface Contact { key: string; name: string; remark: string; shown: string; photo: string; star: boolean; sub: string; character: ChatCharacter }
const STAR = '★', ALL = '全部';
const errorText = (error: unknown) => String((error as Error)?.message || error).slice(0, 60);

/** 聊天 App 底下的「Contacts」：像纸本通讯录——上面一排索引标签（全部、星标、有人的字母，点了只看那一页），下面一张卡片。
    卡片可以换成新的朋友（陌生人来加你、你发出的申请）、添加朋友（右上角 ＋，搜档案里的角色）、标签。点一个人打开名片。 */
export function ChatContactsPage() {
  const [open, setOpen] = useState(false), [host, setHost] = useState<HTMLElement | null>(null), refs = useNativeRefs();
  const contacts = useSyncExternalStore(subscribeContacts, readContacts);
  const [characters, setCharacters] = useState<ChatCharacter[]>([]), [view, setView] = useState<View>('all'), [page, setPage] = useState(ALL);
  const [query, setQuery] = useState(''), [addQuery, setAddQuery] = useState(''), [folded, setFolded] = useState<Record<string, boolean>>({});
  const [viewing, setViewing] = useState(''), [remarkDraft, setRemarkDraft] = useState<string | null>(null);
  const [tagPick, setTagPick] = useState<{ ids: string[]; name: string } | null>(null), [tagEdit, setTagEdit] = useState<{ id: string; name: string } | null>(null);
  const [stranger, setStranger] = useState(''), [sending, setSending] = useState<{ record: CharacterDossier; greeting: string } | null>(null), [busy, setBusy] = useState('');
  const ticking = useRef(false);
  useLayoutEffect(() => {
    const onTab = (event: Event) => { const name = (event as CustomEvent<string>).detail; setOpen(name === 'Contacts'); if (name === 'Contacts') { setView('all'); setPage(ALL); } };
    // 角色新增、删除、改特别关注之后，聊天列表会重画一次：跟着重读
    const onThreads = () => setCharacters(readChatCharacters());
    // 横幅「新的朋友」点进来
    const onOpen = (event: Event) => {
      (window as Bridge).smallphoneOpenChatApp?.();
      window.dispatchEvent(new CustomEvent('qingtuan:chat-tab', { detail: 'Contacts' }));
      setView(((event as CustomEvent<View>).detail) || 'all');
    };
    window.addEventListener('qingtuan:chat-tab', onTab);
    window.addEventListener('qingtuan:chat-thread-snapshot', onThreads);
    window.addEventListener('qingtuan:open-contacts', onOpen);
    return () => { window.removeEventListener('qingtuan:chat-tab', onTab); window.removeEventListener('qingtuan:chat-thread-snapshot', onThreads); window.removeEventListener('qingtuan:open-contacts', onOpen); };
  }, []);
  // 陌生人来加你：开机过一下先看一次，之后每分钟看一次（设定是关就什么都不做）
  useEffect(() => {
    const check = () => {
      if (ticking.current) return;
      ticking.current = true;
      strangerTick().catch(() => {}).finally(() => { ticking.current = false; });
    };
    const first = setTimeout(check, 8000), timer = setInterval(check, 60000);
    return () => { clearTimeout(first); clearInterval(timer); };
  }, []);
  // 打开：跟「我」一样把列表中间那几块藏起来，通讯录放在底下分页的上面；右上角 ＋ 换成添加朋友
  useLayoutEffect(() => {
    const view = refs?.get('chatListView'), nav = view?.querySelector('.chat-subnav'), add = view?.querySelector<HTMLElement>('#chatAddCharacterBtn');
    if (!view || !nav || !open) { setHost(null); return; }
    setCharacters(readChatCharacters()); setQuery('');
    view.setAttribute('data-chat-tab', 'contacts');
    const box = document.createElement('div');
    box.className = 'chat-contacts-page';
    view.insertBefore(box, nav);
    setHost(box);
    const plus = (event: Event) => { event.stopPropagation(); event.preventDefault(); setAddQuery(''); setView('add'); };
    add?.addEventListener('click', plus);
    add?.setAttribute('aria-label', '添加朋友');
    return () => {
      box.remove(); add?.removeEventListener('click', plus); add?.setAttribute('aria-label', '新增角色');
      if (view.getAttribute('data-chat-tab') === 'contacts') view.removeAttribute('data-chat-tab');
    };
  }, [open]);

  const people = useMemo(() => characters.map((character): Contact => {
    const name = String(character.name || character.nickname || '未命名角色').trim(), remark = contacts.remarks[character.archiveId] || '';
    return { key: character.archiveId, name, remark, shown: remark || name, photo: character.photoUrl || DEFAULT_AVATAR, star: !!character.favorite, sub: String(character.quote || '').trim(), character };
  }).sort((a, b) => compareContactNames(a.shown, b.shown)), [characters, contacts]);
  const needle = query.trim().toLowerCase();
  const shown = needle ? people.filter(item => [item.name, item.remark, String(item.character.nickname || '')].some(text => text.toLowerCase().includes(needle))) : people;
  // 分组：星标在最上面，再照备注（没备注用本名）的拼音首字母，# 放最后
  const groups = useMemo(() => {
    const map = new Map<string, Contact[]>();
    if (!needle) { const stars = shown.filter(item => item.star); if (stars.length) map.set(STAR, stars); }
    for (const item of shown) { const letter = contactInitial(item.shown); map.set(letter, [...(map.get(letter) || []), item]); }
    return [...map.entries()].sort(([a], [b]) => a === STAR ? -1 : b === STAR ? 1 : a === '#' ? 1 : b === '#' ? -1 : a.localeCompare(b));
  }, [shown, needle]);
  // 索引标签是整组人（不跟搜索变）；选的那页没人了就回全部
  const letters = useMemo(() => [ALL, ...new Set([...(people.some(item => item.star) ? [STAR] : []), ...people.map(item => contactInitial(item.shown)).sort((a, b) => a === '#' ? 1 : b === '#' ? -1 : a.localeCompare(b))])], [people]);
  useEffect(() => { if (!letters.includes(page)) setPage(ALL); }, [letters, page]);
  const visible = page === ALL || needle ? groups : groups.filter(([letter]) => letter === page);

  const person = people.find(item => item.key === viewing), pending = contacts.requests.filter(item => item.kind === 'in' && item.state === 'pending');
  const request = contacts.requests.find(item => item.id === stranger);
  useEffect(() => { if (viewing && !person) setViewing(''); }, [viewing, person]);
  const tagsOf = (key: string) => (contacts.tagged[key] || []).map(id => contacts.tags.find(tag => tag.id === id)).filter((tag): tag is NonNullable<typeof tag> => !!tag);
  const addable = useMemo(() => view === 'add' ? addableCharacters() : [], [view, characters]);
  const addShown = addQuery.trim() ? addable.filter(record => String(record.name || record.nickname || '').toLowerCase().includes(addQuery.trim().toLowerCase())) : addable;

  function goChat(key: string) { setViewing(''); setOpen(false); (window as Bridge).smallphoneOpenCharacterChat?.(key); }
  function saveRemark() { if (!person || remarkDraft === null) return; setContactRemark(person.key, remarkDraft); setRemarkDraft(null); }
  function saveTags() {
    if (!person || !tagPick) return;
    const extra = tagPick.name.trim() ? addContactTag(tagPick.name) : null;
    setContactTags(person.key, [...new Set([...tagPick.ids, ...(extra ? [extra.id] : [])])]); setTagPick(null);
  }
  async function saveTagEdit() {
    if (!tagEdit) return;
    if (tagEdit.id) renameContactTag(tagEdit.id, tagEdit.name); else if (!addContactTag(tagEdit.name)) { showToast('先写标签名字'); return; }
    setTagEdit(null);
  }
  async function dropTag() {
    if (!tagEdit?.id || !await confirmChat({ title: '删掉这个标签？', message: `「${tagEdit.name}」会拿掉，人不会删。`, confirmText: '删除', danger: true })) return;
    removeContactTag(tagEdit.id); setTagEdit(null);
  }
  async function newStranger(replace?: FriendRequest) {
    setBusy('stranger');
    try {
      if (replace) patchFriendRequest(replace.id, { state: 'rejected' });
      const next = await generateStranger(); setStranger(next.id);
    } catch (error) { showToast(errorText(error)); if (replace) setStranger(''); }
    finally { setBusy(''); }
  }
  async function takeStranger(item: FriendRequest) {
    setBusy('accept');
    try { const key = await acceptFriend(item); setStranger(''); showToast(`${item.name} 加进来了`); if (key) goChat(key); }
    catch (error) { showToast(errorText(error)); } finally { setBusy(''); }
  }
  async function send() {
    if (!sending) return;
    setBusy('send');
    try {
      const result = await sendFriendRequest(sending.record, sending.greeting);
      setSending(null); setView('new');
      showToast(result.state === 'accepted' ? `${result.name} 接受了` : `${result.name} 没有接受`);
    } catch (error) { showToast(errorText(error)); } finally { setBusy(''); }
  }

  const row = (item: Contact) => <button type="button" className="chat-contacts-row" key={item.key} onClick={() => setViewing(item.key)}>
    <img className="chat-contacts-avatar" alt="" src={item.photo} />
    <span className="chat-contacts-text"><b>{item.shown}{item.remark ? <i>{item.name}</i> : null}</b>{item.sub ? <small>{item.sub}</small> : null}</span>
    {item.star ? <span className="chat-contacts-star" aria-label="星标">★</span> : null}
  </button>;
  const head = (key: string, label: string, count: number, tools?: React.ReactNode) => <div className="chat-contacts-head-row">
    <button type="button" className="chat-contacts-head" aria-expanded={!folded[key]} onClick={() => setFolded(state => ({ ...state, [key]: !state[key] }))}>
      <span aria-hidden="true">{folded[key] ? '▶' : '▼'}</span>{label}<small>({count})</small>
    </button>{tools}
  </div>;
  const back = (title: string) => <button type="button" className="chat-contacts-back" onClick={() => setView('all')}>‹ {title}</button>;
  const requestRow = (item: FriendRequest) => {
    const status = item.kind === 'in' ? (item.state === 'accepted' ? '已添加' : item.state === 'rejected' ? '已拒绝' : '')
      : item.state === 'accepted' ? '已添加' : item.state === 'rejected' ? '已拒绝 · 可再加' : '等对方回应';
    return <div className="chat-contacts-row is-static" key={item.id}>
      <img className="chat-contacts-avatar" alt="" src={DEFAULT_AVATAR} />
      <span className="chat-contacts-text"><b>{item.name}{item.kind === 'in' ? <i>陌生人</i> : null}</b>
        <small>{item.kind === 'out' && item.state === 'rejected' && item.reply ? `对方：「${item.reply}」` : item.greeting ? `「${item.greeting}」` : ''}</small></span>
      {item.kind === 'in' && item.state === 'pending' ? <button type="button" className="chat-contacts-btn is-primary" onClick={() => setStranger(item.id)}>查看</button> : <span className="chat-contacts-state">{status}</span>}
    </div>;
  };

  let body: React.ReactNode;
  if (view === 'new') {
    const incoming = contacts.requests.filter(item => item.kind === 'in').slice().reverse(), outgoing = contacts.requests.filter(item => item.kind === 'out').slice().reverse();
    body = <>
      <div className="chat-contacts-top">{back('新的朋友')}</div>
      <div className="chat-contacts-list">
        <div className="chat-contacts-sec">来加你的人</div>
        {incoming.length ? incoming.slice(0, 15).map(requestRow) : <p className="chat-contacts-empty">还没有人来加你。</p>}
        {outgoing.length ? <><div className="chat-contacts-sec">你发出的申请</div>{outgoing.slice(0, 15).map(requestRow)}</> : null}
        <div className="chat-contacts-sec">陌生人来加你</div>
        <div className="chat-contacts-set">
          <span>多久来一个<small>模型随机生成的人，收下就会变成新角色；小手机开着的时候才会来</small></span>
          <span className="chat-contacts-choices" role="radiogroup">
            {([['off', '关'], ['some', '偶尔'], ['often', '常常']] as [StrangerRate, string][]).map(([value, label]) => <button type="button" role="radio" key={value} aria-checked={contacts.stranger === value}
              onClick={() => updateContacts({ stranger: value, nextStrangerAt: 0 })}>{label}</button>)}
          </span>
        </div>
        <div className="chat-contacts-set">
          <span>现在就来一个<small>不想等的话</small></span>
          <button type="button" className="chat-contacts-btn" disabled={busy === 'stranger'} onClick={() => void newStranger()}>{busy === 'stranger' ? '想人中…' : '来一个'}</button>
        </div>
      </div>
    </>;
  } else if (view === 'add') {
    body = <>
      <div className="chat-contacts-top">{back('添加朋友')}
        <label className="chat-contacts-search"><span aria-hidden="true">⌕</span><input type="search" placeholder="搜档案里的角色" value={addQuery} autoFocus onChange={event => setAddQuery(event.currentTarget.value)} /></label>
      </div>
      <div className="chat-contacts-list">
        <button type="button" className="chat-contacts-row" onClick={() => { setOpen(false); (window as Bridge).smallphoneOpenCharacterCard?.(); }}>
          <span className="chat-contacts-icon" aria-hidden="true">＋</span><span className="chat-contacts-text"><b>新建角色档案</b><small>自己写一个新角色，存好就会进聊天</small></span>
        </button>
        <div className="chat-contacts-sec">档案里还没加的角色</div>
        {addShown.map(record => <div className="chat-contacts-row is-static" key={String(record.id)}>
          <img className="chat-contacts-avatar" alt="" src={String(record.photoUrl || '') || DEFAULT_AVATAR} />
          <span className="chat-contacts-text"><b>{String(record.name || record.nickname)}</b>{record.quote ? <small>{String(record.quote)}</small> : null}</span>
          <button type="button" className="chat-contacts-btn is-primary" onClick={() => setSending({ record, greeting: readMe().name ? `我是${readMe().name}` : '你好' })}>添加</button>
        </div>)}
        {!addShown.length ? <p className="chat-contacts-empty">{addable.length ? `找不到「${addQuery.trim()}」。` : '档案里的角色都加过了。'}</p> : null}
      </div>
    </>;
  } else if (view === 'tags') {
    body = <>
      <div className="chat-contacts-top">{back('标签')}<button type="button" className="chat-contacts-btn" onClick={() => setTagEdit({ id: '', name: '' })}>＋ 新标签</button></div>
      <div className="chat-contacts-list">
        {contacts.tags.map(tag => { const members = people.filter(item => contacts.tagged[item.key]?.includes(tag.id)); return <div className="chat-contacts-group" key={tag.id}>
          {head('tag:' + tag.id, tag.name, members.length, <button type="button" className="chat-contacts-more" aria-label="改标签" onClick={() => setTagEdit({ ...tag })}>⋯</button>)}
          {folded['tag:' + tag.id] ? null : members.map(row)}
        </div>; })}
        {!contacts.tags.length ? <p className="chat-contacts-empty">还没有标签。按右上角新建，或在名片里点「＋」给人贴标签。</p> : null}
      </div>
    </>;
  } else body = <>
    <div className="chat-contacts-top">
      <b>通讯录</b><small>{people.length} 人</small>
      <label className="chat-contacts-search"><span aria-hidden="true">⌕</span><input type="search" placeholder="搜索名字、备注" value={query} onChange={event => setQuery(event.currentTarget.value)} /></label>
    </div>
    <div className="chat-contacts-list">
      {needle || page !== ALL ? null : <>
        <button type="button" className="chat-contacts-row" onClick={() => setView('new')}><span className="chat-contacts-icon" aria-hidden="true">＋</span><span className="chat-contacts-text"><b>新的朋友</b></span>{pending.length ? <span className="chat-contacts-badge">{pending.length}</span> : null}</button>
        <button type="button" className="chat-contacts-row" onClick={() => setView('tags')}><span className="chat-contacts-icon" aria-hidden="true">#</span><span className="chat-contacts-text"><b>标签</b></span>
          {contacts.tags.length ? <span className="chat-contacts-state">{contacts.tags.slice(0, 3).map(tag => tag.name).join(' · ')}{contacts.tags.length > 3 ? ` 等 ${contacts.tags.length} 个` : ''}</span> : null}</button>
      </>}
      {visible.map(([letter, items]) => <div className="chat-contacts-group" key={letter}>{head(letter, letter === STAR ? '星标朋友' : letter, items.length)}{folded[letter] ? null : items.map(row)}</div>)}
      {!people.length ? <p className="chat-contacts-empty">还没有联系人。点右上角 ＋ 添加朋友，或去「新的朋友」看看谁来加你。</p>
        : !visible.length ? <p className="chat-contacts-empty">找不到「{query.trim()}」。</p> : null}
    </div>
  </>;

  if (!open || !host) return null;
  return <>{createPortal(<section className="chat-contacts" aria-label="通讯录">
    <div className="chat-contacts-tabs" role="tablist" aria-label="索引">
      {letters.map(letter => <button type="button" role="tab" key={letter} aria-selected={view === 'all' && letter === page} onClick={() => { setView('all'); setPage(letter); }}>{letter}</button>)}
    </div>
    <div className="chat-contacts-card">{body}</div>
  </section>, host)}

  {person && remarkDraft === null && !tagPick ? createPortal(<div className="sp-confirm-overlay chat-me-dialog chat-contacts-dialog" onClick={event => { if (event.target === event.currentTarget) setViewing(''); }}>
    <div className="sp-confirm" role="dialog" aria-modal="true" aria-label="名片">
      <div className="sp-confirm-bar"><span className="sp-confirm-title">名片</span></div>
      <div className="sp-confirm-body">
        <div className="chat-contacts-card-top">
          <img className="chat-contacts-avatar" alt="" src={person.photo} />
          <span><b>{person.shown}</b>{person.remark ? <small>本名：{person.name}</small> : null}{person.character.nickname ? <small>昵称：{String(person.character.nickname)}</small> : null}</span>
          <button type="button" className="chat-contacts-starbtn" aria-pressed={person.star} aria-label={person.star ? '取消星标' : '设为星标'}
            onClick={() => (window as Bridge).smallphonePatchCharacter?.(person.key, { favorite: !person.star })}>{person.star ? '★' : '☆'}</button>
        </div>
        <div className="chat-contacts-fields">
          <div><span>标签</span><span className="chat-contacts-tags">
            {tagsOf(person.key).map(tag => <i key={tag.id}>{tag.name}</i>)}
            <button type="button" aria-label="贴标签" onClick={() => setTagPick({ ids: contacts.tagged[person.key] || [], name: '' })}>＋</button>
          </span></div>
          {[['备注', person.remark], ['关系', person.character.relationship], ['生日', [person.character.birthday, person.character.constellation].filter(Boolean).join(' · ')], ['签名', person.character.quote]]
            .filter(([, value]) => String(value || '').trim()).map(([label, value]) => <div key={String(label)}><span>{label}</span>{String(value)}</div>)}
        </div>
      </div>
      <div className="sp-confirm-actions chat-me-form-actions">
        <PressedButton type="button" className="sp-confirm-btn" onClick={() => setRemarkDraft(person.remark)}>设备注</PressedButton>
        <PressedButton type="button" className="sp-confirm-btn" onClick={() => { setViewing(''); (window as Bridge).smallphoneOpenCharacterCard?.(person.character.dossierId); }}>看档案</PressedButton>
        <PressedButton type="button" className="sp-confirm-btn is-primary" onClick={() => goChat(person.key)}>发消息</PressedButton>
      </div>
    </div>
  </div>, document.body) : null}

  {person && remarkDraft !== null ? createPortal(<div className="sp-confirm-overlay chat-me-dialog" onClick={event => { if (event.target === event.currentTarget) setRemarkDraft(null); }}>
    <div className="sp-confirm" role="dialog" aria-modal="true" aria-label="设备注">
      <div className="sp-confirm-bar"><span className="sp-confirm-title">设备注</span></div>
      <div className="sp-confirm-body chat-me-form">
        <label htmlFor="contactRemark">备注<small>只有你看得到，他那边照旧用本名；留空就拿掉</small></label>
        <input id="contactRemark" maxLength={20} placeholder={person.name} value={remarkDraft} autoFocus onChange={event => setRemarkDraft(event.currentTarget.value)}
          onKeyDown={event => { if (event.key === 'Enter' && !event.nativeEvent.isComposing) saveRemark(); }} />
      </div>
      <div className="sp-confirm-actions chat-me-form-actions">
        <PressedButton type="button" className="sp-confirm-btn" onClick={() => setRemarkDraft(null)}>取消</PressedButton>
        <PressedButton type="button" className="sp-confirm-btn is-primary" onClick={saveRemark}>存好</PressedButton>
      </div>
    </div>
  </div>, document.body) : null}

  {person && tagPick ? createPortal(<div className="sp-confirm-overlay chat-me-dialog" onClick={event => { if (event.target === event.currentTarget) setTagPick(null); }}>
    <div className="sp-confirm" role="dialog" aria-modal="true" aria-label="贴标签">
      <div className="sp-confirm-bar"><span className="sp-confirm-title">贴标签</span></div>
      <div className="sp-confirm-body chat-me-form">
        {contacts.tags.length ? <div className="chat-contacts-pick">{contacts.tags.map(tag => { const on = tagPick.ids.includes(tag.id); return <button type="button" key={tag.id} aria-pressed={on} className={on ? 'is-active' : ''}
          onClick={() => setTagPick({ ...tagPick, ids: on ? tagPick.ids.filter(id => id !== tag.id) : [...tagPick.ids, tag.id] })}>{on ? '✓ ' : ''}{tag.name}</button>; })}</div> : null}
        <label htmlFor="contactNewTag">新标签<small>可以不写</small></label>
        <input id="contactNewTag" maxLength={12} placeholder="例如：家人、同事" value={tagPick.name} onChange={event => setTagPick({ ...tagPick, name: event.currentTarget.value })} />
      </div>
      <div className="sp-confirm-actions chat-me-form-actions">
        <PressedButton type="button" className="sp-confirm-btn" onClick={() => setTagPick(null)}>取消</PressedButton>
        <PressedButton type="button" className="sp-confirm-btn is-primary" onClick={saveTags}>存好</PressedButton>
      </div>
    </div>
  </div>, document.body) : null}

  {tagEdit ? createPortal(<div className="sp-confirm-overlay chat-me-dialog" onClick={event => { if (event.target === event.currentTarget) setTagEdit(null); }}>
    <div className="sp-confirm" role="dialog" aria-modal="true" aria-label={tagEdit.id ? '改标签' : '新标签'}>
      <div className="sp-confirm-bar"><span className="sp-confirm-title">{tagEdit.id ? '改标签' : '新标签'}</span></div>
      <div className="sp-confirm-body chat-me-form">
        <label htmlFor="contactTagName">标签名字</label>
        <input id="contactTagName" maxLength={12} placeholder="例如：家人、同事" value={tagEdit.name} autoFocus onChange={event => setTagEdit({ ...tagEdit, name: event.currentTarget.value })}
          onKeyDown={event => { if (event.key === 'Enter' && !event.nativeEvent.isComposing) void saveTagEdit(); }} />
      </div>
      <div className="sp-confirm-actions chat-me-form-actions">
        {tagEdit.id ? <PressedButton type="button" className="sp-confirm-btn is-danger" onClick={() => void dropTag()}>删除</PressedButton> : null}
        <PressedButton type="button" className="sp-confirm-btn" onClick={() => setTagEdit(null)}>取消</PressedButton>
        <PressedButton type="button" className="sp-confirm-btn is-primary" onClick={() => void saveTagEdit()}>存好</PressedButton>
      </div>
    </div>
  </div>, document.body) : null}

  {request ? createPortal(<div className="sp-confirm-overlay chat-me-dialog chat-contacts-dialog" onClick={event => { if (event.target === event.currentTarget && !busy) setStranger(''); }}>
    <div className="sp-confirm" role="dialog" aria-modal="true" aria-label="好友申请">
      <div className="sp-confirm-bar"><span className="sp-confirm-title">好友申请</span></div>
      <div className="sp-confirm-body">
        <div className="chat-contacts-card-top">
          <img className="chat-contacts-avatar" alt="" src={DEFAULT_AVATAR} />
          <span><b>{request.name}</b>{request.meta ? <small>{request.meta}</small> : null}{request.meet ? <small>来自：{request.meet}</small> : null}</span>
        </div>
        <div className="chat-contacts-fields">
          {request.greeting ? <div><span>招呼</span>{request.greeting}</div> : null}
          {request.intro ? <div><span>简介</span>{request.intro}</div> : null}
        </div>
      </div>
      <div className="sp-confirm-actions chat-me-form-actions">
        <PressedButton type="button" className="sp-confirm-btn" disabled={!!busy} onClick={() => { patchFriendRequest(request.id, { state: 'rejected' }); setStranger(''); }}>拒绝</PressedButton>
        <PressedButton type="button" className="sp-confirm-btn" disabled={!!busy} onClick={() => void newStranger(request)}>{busy === 'stranger' ? '想人中…' : '换一个'}</PressedButton>
        <PressedButton type="button" className="sp-confirm-btn is-primary" disabled={!!busy} onClick={() => void takeStranger(request)}>{busy === 'accept' ? '加入中…' : '接受'}</PressedButton>
      </div>
    </div>
  </div>, document.body) : null}

  {sending ? createPortal(<div className="sp-confirm-overlay chat-me-dialog" onClick={event => { if (event.target === event.currentTarget && !busy) setSending(null); }}>
    <div className="sp-confirm" role="dialog" aria-modal="true" aria-label="申请添加朋友">
      <div className="sp-confirm-bar"><span className="sp-confirm-title">申请添加朋友</span></div>
      <div className="sp-confirm-body chat-me-form">
        <label htmlFor="contactGreeting">跟「{String(sending.record.name || sending.record.nickname)}」打个招呼<small>他照人设决定接不接受</small></label>
        <input id="contactGreeting" maxLength={120} value={sending.greeting} autoFocus onChange={event => setSending({ ...sending, greeting: event.currentTarget.value })} />
      </div>
      <div className="sp-confirm-actions chat-me-form-actions">
        <PressedButton type="button" className="sp-confirm-btn" disabled={!!busy} onClick={() => setSending(null)}>取消</PressedButton>
        <PressedButton type="button" className="sp-confirm-btn is-primary" disabled={!!busy} onClick={() => void send()}>{busy === 'send' ? '等对方回应…' : '发送'}</PressedButton>
      </div>
    </div>
  </div>, document.body) : null}</>;
}
