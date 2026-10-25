import './ChatContactsPage.css';
import { useEffect, useLayoutEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react';
import { createPortal } from 'react-dom';
import { PressedButton } from '../../../components/shared/PressedButton';
import { readChatCharacters } from '../../../utils/chatCharacterStorage';
import { DEFAULT_AVATAR } from '../../../utils/defaultAvatar';
import { showToast } from '../../../utils/toast';
import { confirmChat } from '../../../utils/chatConfirm';
import { addContactTag, compareContactNames, contactInitial, patchFriendRequest, readContacts, removeContactTag, renameContactTag, setContactRemark, setContactTags, subscribeContacts, updateContacts } from '../../../utils/contactsStorage';
import type { FriendRequest, StrangerRate } from '../../../utils/contactsStorage';
import { acceptFriend, answerReadd, friendTick, generateStranger, sendFriendRequest, strangerTick } from '../../../utils/friendRequests';
import { useNativeRefs } from '../../../providers/NativeRefsProvider';
import { readMe } from '../../../utils/meStorage';
import type { ChatCharacter } from '../../../types/chatCharacters';

type Bridge = Window & {
  smallphoneOpenChatApp?: () => void;
  smallphoneOpenCharacterChat?: (key: string) => unknown;
  smallphoneOpenCharacterCard?: (id?: unknown) => void;
  smallphonePatchCharacter?: (id: string, fields: { favorite?: boolean }) => void;
  smallphoneBlockContact?: (key: string, on: boolean) => void;
  smallphoneDeleteContact?: (key: string) => void;
};
type View = 'all' | 'new' | 'tags' | 'blocked';
interface Contact { key: string; name: string; remark: string; shown: string; photo: string; star: boolean; sub: string; character: ChatCharacter }
const STAR = '★', ALL = '全部';
const errorText = (error: unknown) => String((error as Error)?.message || error).slice(0, 60);

/** 聊天 App 底下的「Contacts」：像纸本通讯录——上面一排索引标签（全部、星标、有人的字母，点了只看那一页），下面一张卡片。
    卡片可以换成新的朋友（陌生人来加你）、标签。点一个人打开名片。 */
export function ChatContactsPage() {
  const [open, setOpen] = useState(false), [host, setHost] = useState<HTMLElement | null>(null), refs = useNativeRefs();
  const contacts = useSyncExternalStore(subscribeContacts, readContacts);
  const [characters, setCharacters] = useState<ChatCharacter[]>([]), [view, setView] = useState<View>('all'), [page, setPage] = useState(ALL);
  const [query, setQuery] = useState(''), [folded, setFolded] = useState<Record<string, boolean>>({});
  const [viewing, setViewing] = useState(''), [remarkDraft, setRemarkDraft] = useState<string | null>(null);
  const [tagPick, setTagPick] = useState<{ ids: string[]; name: string } | null>(null), [tagEdit, setTagEdit] = useState<{ id: string; name: string } | null>(null);
  const [stranger, setStranger] = useState(''), [busy, setBusy] = useState('');
  const [applying, setApplying] = useState<{ key: string; name: string; greeting: string } | null>(null);
  const ticking = useRef(false);
  useLayoutEffect(() => {
    const onTab = (event: Event) => { const name = (event as CustomEvent<string>).detail; setOpen(name === 'Contacts'); if (name === 'Contacts') { setView('all'); setPage(ALL); } };
    // 角色新增、删除、改特别关注之后，聊天列表会重画一次：跟着重读
    const onThreads = () => setCharacters(readChatCharacters().filter(item => !item.group));
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
  // 陌生人来加你、你发的申请该他回了、你删掉的人想不想来加你：开机过一下先看一次，之后每分钟看一次
  useEffect(() => {
    const check = () => {
      if (ticking.current) return;
      ticking.current = true;
      Promise.all([strangerTick().catch(() => {}), friendTick().catch(() => {})]).finally(() => { ticking.current = false; });
    };
    const first = setTimeout(check, 8000), timer = setInterval(check, 60000);
    return () => { clearTimeout(first); clearInterval(timer); };
  }, []);
  // 打开：跟「我」一样把列表中间那几块藏起来，通讯录放在底下分页的上面
  useLayoutEffect(() => {
    const view = refs?.get('chatListView'), nav = view?.querySelector('.chat-subnav');
    if (!view || !nav || !open) { setHost(null); return; }
    setCharacters(readChatCharacters().filter(item => !item.group)); setQuery('');
    view.setAttribute('data-chat-tab', 'contacts');
    const box = document.createElement('div');
    box.className = 'chat-contacts-page';
    view.insertBefore(box, nav);
    setHost(box);
    return () => {
      box.remove();
      if (view.getAttribute('data-chat-tab') === 'contacts') view.removeAttribute('data-chat-tab');
    };
  }, [open]);

  const people = useMemo(() => characters.filter(character => !contacts.deleted[character.archiveId]).map((character): Contact => {
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
  // 底栏 Contacts 的提醒：还没处理的新的朋友有几个
  useEffect(() => {
    const item = refs?.get('chatListView')?.querySelector('.chat-subnav-item[aria-label="Contacts"]');
    if (!item) return;
    if (pending.length) item.setAttribute('data-badge', String(pending.length)); else item.removeAttribute('data-badge');
  }, [pending.length, refs, characters]);
  const tagsOf = (key: string) => (contacts.tagged[key] || []).map(id => contacts.tags.find(tag => tag.id === id)).filter((tag): tag is NonNullable<typeof tag> => !!tag);

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

  async function block(item: Contact) {
    if (!await confirmChat({ title: `把${item.shown}拉黑？`, message: '他发的私聊都会被你拒收，群里照常。', confirmText: '拉黑', danger: true })) return;
    (window as Bridge).smallphoneBlockContact?.(item.key, true); showToast(`${item.shown} 拉黑了`);
  }
  async function remove(item: Contact) {
    if (!await confirmChat({ title: `删除${item.shown}？`, message: '他会从通讯录和聊天列表消失，聊天记录先留着，加回来就恢复。他可能会来加你。群里照常。', confirmText: '删除', danger: true })) return;
    setViewing(''); (window as Bridge).smallphoneDeleteContact?.(item.key); showToast(`${item.shown} 删掉了`);
  }
  function apply() {
    if (!applying) return;
    try { sendFriendRequest(applying.key, applying.greeting); setApplying(null); showToast('申请发出去了'); }
    catch (error) { showToast(errorText(error)); }
  }
  const startApply = (key: string, name: string) => setApplying({ key, name, greeting: (readMe().name ? `我是${readMe().name}` : '') });
  const stamp = (at: number) => { const date = new Date(at); return `${date.getMonth() + 1}/${date.getDate()}`; };
  const dayLabel = (at: number) => {
    const days = Math.round((new Date().setHours(0, 0, 0, 0) - new Date(at).setHours(0, 0, 0, 0)) / 86400000);
    return days <= 0 ? '今天' : days === 1 ? '昨天' : days < 7 ? `${'二三四五六'[days - 2]}天前` : stamp(at);
  };
  const lookup = (key?: string) => characters.find(item => item.archiveId === key);
  const outPending = (key: string) => contacts.requests.some(item => item.kind === 'out' && item.chatKey === key && item.state === 'pending');
  // 黑名单、删掉的好友那几行：有申请就写最近一笔的留言（他来加你写他的，你去加他写你的），没有就写哪天拉黑、删的
  const lastSaid = (key: string, kind: 'in' | 'out', name: string, fallback: string) => {
    const last = contacts.requests.filter(item => item.chatKey === key && item.kind === kind).sort((a, b) => b.at - a.at)[0];
    return last ? `${kind === 'out' ? '我' : name}：${last.greeting || '请求添加你为朋友'}` : fallback;
  };
  const inPending = (key: string) => contacts.requests.find(item => item.kind === 'in' && item.chatKey === key && item.state === 'pending');
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
  // 新的朋友一行：别人来加你写「他：留言」，你去加别人写「我：留言」，右边是查看或状态（你发的前面一个小箭头）
  const requestRow = (item: FriendRequest) => {
    const who = lookup(item.chatKey), name = item.chatKey ? contacts.remarks[item.chatKey] || item.name : item.name, out = item.kind === 'out';
    const status = out ? (item.state === 'accepted' ? '已添加' : item.state === 'rejected' ? '被拒绝' : '等待验证') : item.state === 'accepted' ? '已添加' : '已拒绝';
    return <div className="chat-contacts-row is-static" key={item.id}>
      <img className="chat-contacts-avatar" alt="" src={who?.photoUrl || DEFAULT_AVATAR} />
      <span className="chat-contacts-text"><b>{name}</b><small>{out ? '我' : item.name}：{item.greeting || '请求添加你为朋友'}</small></span>
      {!out && item.state === 'pending' ? <button type="button" className="chat-contacts-btn is-primary" onClick={() => setStranger(item.id)}>查看</button>
        : <span className="chat-contacts-state">{out ? <span aria-hidden="true">↗ </span> : null}{status}</span>}
    </div>;
  };

  let body: React.ReactNode;
  if (view === 'new') {
    const all = contacts.requests.slice().sort((a, b) => b.at - a.at).slice(0, 30), days = [...new Set(all.map(item => dayLabel(item.at)))];
    const gone = characters.filter(item => contacts.deleted[item.archiveId]);
    body = <>
      <div className="chat-contacts-top">{back('新的朋友')}</div>
      <div className="chat-contacts-list">
        {days.map(day => <div key={day}><div className="chat-contacts-sec">{day}</div>{all.filter(item => dayLabel(item.at) === day).map(requestRow)}</div>)}
        {!all.length ? <p className="chat-contacts-empty">还没有好友申请。</p> : null}
        {gone.length ? <><div className="chat-contacts-sec">删掉的好友</div>
          {gone.map(item => { const name = contacts.remarks[item.archiveId] || String(item.name || item.nickname || ''); return <div className="chat-contacts-row is-static" key={item.archiveId}>
            <img className="chat-contacts-avatar" alt="" src={item.photoUrl || DEFAULT_AVATAR} />
            <span className="chat-contacts-text"><b>{name}</b><small>{lastSaid(item.archiveId, 'out', name, `${stamp(contacts.deleted[item.archiveId].at)} 删除`)}</small></span>
            {outPending(item.archiveId) ? <span className="chat-contacts-state">↗ 等待验证</span> : <button type="button" className="chat-contacts-btn" onClick={() => startApply(item.archiveId, name)}>申请添加</button>}
          </div>; })}</> : null}
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
  } else if (view === 'blocked') {
    const mine = people.filter(item => contacts.blocked[item.key]), theirs = people.filter(item => contacts.blockedBy[item.key]);
    body = <>
      <div className="chat-contacts-top">{back('黑名单')}</div>
      <div className="chat-contacts-list">
        <div className="chat-contacts-sec">你拉黑的</div>
        {mine.map(item => <div className="chat-contacts-row is-static" key={item.key}>
          <img className="chat-contacts-avatar" alt="" src={item.photo} />
          <span className="chat-contacts-text"><b>{item.shown}</b><small>{lastSaid(item.key, 'in', item.name, `${stamp(contacts.blocked[item.key].at)} 拉黑`)}</small></span>
          {inPending(item.key) ? <button type="button" className="chat-contacts-btn" onClick={() => setStranger(inPending(item.key)!.id)}>查看</button> : null}
          <button type="button" className="chat-contacts-btn is-primary" onClick={() => { (window as Bridge).smallphoneBlockContact?.(item.key, false); showToast(`${item.shown} 放出来了`); }}>解除</button>
        </div>)}
        {!mine.length ? <p className="chat-contacts-empty">没有拉黑谁。</p> : null}
        <div className="chat-contacts-sec">把你拉黑的</div>
        {theirs.map(item => <div className="chat-contacts-row is-static" key={item.key}>
          <img className="chat-contacts-avatar" alt="" src={item.photo} />
          <span className="chat-contacts-text"><b>{item.shown}</b><small>{lastSaid(item.key, 'out', item.name, `${stamp(contacts.blockedBy[item.key].at)} 把你拉黑了`)}</small></span>
          {outPending(item.key) ? <span className="chat-contacts-state">↗ 等待验证</span> : <button type="button" className="chat-contacts-btn is-primary" onClick={() => startApply(item.key, item.shown)}>申请添加</button>}
        </div>)}
        {!theirs.length ? <p className="chat-contacts-empty">没有人拉黑你。</p> : null}
        <p className="chat-contacts-note">你拉黑的人，消息会被你拒收，他可能会来申请。<br />把你拉黑的人，收不到你的消息，可以申请加他。<br />群里照常。</p>
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
      <label className="chat-contacts-search"><span aria-hidden="true">⌕</span><input type="search" placeholder="搜索名字、备注" value={query} onChange={event => setQuery(event.currentTarget.value)} />{query ? <button type="button" className="chat-contacts-clear" aria-label="清除" onClick={() => setQuery('')}>×</button> : null}</label>
    </div>
    <div className="chat-contacts-list">
      {needle || page !== ALL ? null : <>
        <button type="button" className="chat-contacts-row" onClick={() => setView('new')}><span className="chat-contacts-icon" aria-hidden="true">＋</span><span className="chat-contacts-text"><b>新的朋友</b></span>{pending.length ? <span className="chat-contacts-badge">{pending.length}</span> : null}</button>
        <button type="button" className="chat-contacts-row" onClick={() => setView('tags')}><span className="chat-contacts-icon" aria-hidden="true">#</span><span className="chat-contacts-text"><b>标签</b></span>
          {contacts.tags.length ? <span className="chat-contacts-state">{contacts.tags.slice(0, 3).map(tag => tag.name).join(' · ')}{contacts.tags.length > 3 ? ` 等 ${contacts.tags.length} 个` : ''}</span> : null}</button>
        <button type="button" className="chat-contacts-row" onClick={() => setView('blocked')}><span className="chat-contacts-icon" aria-hidden="true">⊘</span><span className="chat-contacts-text"><b>黑名单</b></span>
          {Object.keys(contacts.blocked).length || Object.keys(contacts.blockedBy).length ? <span className="chat-contacts-state">你拉黑 {Object.keys(contacts.blocked).length} · 拉黑你 {Object.keys(contacts.blockedBy).length}</span> : null}</button>
      </>}
      {visible.map(([letter, items]) => <div className="chat-contacts-group" key={letter}>{head(letter, letter === STAR ? '星标朋友' : letter, items.length)}{folded[letter] ? null : items.map(row)}</div>)}
      {!people.length ? <p className="chat-contacts-empty">还没有联系人。点右上角 ＋ 新增角色，或去「新的朋友」看看谁来加你。</p>
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
      <div className="chat-contacts-cut">
        {contacts.blocked[person.key] ? <button type="button" className="chat-contacts-block" onClick={() => { (window as Bridge).smallphoneBlockContact?.(person.key, false); showToast(`${person.shown} 放出来了`); }}>移出黑名单</button>
          : <button type="button" className="chat-contacts-block is-danger" onClick={() => void block(person)}>加入黑名单</button>}
        <button type="button" className="chat-contacts-block is-danger" onClick={() => void remove(person)}>删除好友</button>
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

  {applying ? createPortal(<div className="sp-confirm-overlay chat-me-dialog" onClick={event => { if (event.target === event.currentTarget) setApplying(null); }}>
    <div className="sp-confirm" role="dialog" aria-modal="true" aria-label="申请添加朋友">
      <div className="sp-confirm-bar"><span className="sp-confirm-title">申请添加朋友</span></div>
      <div className="sp-confirm-body chat-me-form">
        <label htmlFor="contactApply">发送添加朋友申请<small>他会看到这句话</small></label>
        <textarea id="contactApply" rows={3} maxLength={120} value={applying.greeting} autoFocus onChange={event => setApplying({ ...applying, greeting: event.currentTarget.value })} />
      </div>
      <div className="sp-confirm-actions chat-me-form-actions">
        <PressedButton type="button" className="sp-confirm-btn" onClick={() => setApplying(null)}>取消</PressedButton>
        <PressedButton type="button" className="sp-confirm-btn is-primary" onClick={apply}>发送</PressedButton>
      </div>
    </div>
  </div>, document.body) : null}

  {request ? createPortal(<div className="sp-confirm-overlay chat-me-dialog chat-contacts-dialog" onClick={event => { if (event.target === event.currentTarget && !busy) setStranger(''); }}>
    <div className="sp-confirm" role="dialog" aria-modal="true" aria-label="好友申请">
      <div className="sp-confirm-bar"><span className="sp-confirm-title">好友申请</span></div>
      <div className="sp-confirm-body">
        <div className="chat-contacts-card-top">
          <img className="chat-contacts-avatar" alt="" src={lookup(request.chatKey)?.photoUrl || DEFAULT_AVATAR} />
          <span><b>{request.chatKey ? contacts.remarks[request.chatKey] || request.name : request.name}</b>{request.meta ? <small>{request.meta}</small> : null}{request.meet ? <small>来自：{request.meet}</small> : null}</span>
        </div>
        <div className="chat-contacts-fields">
          {request.greeting ? <div><span>{request.chatKey ? '留言' : '招呼'}</span>{request.greeting}</div> : null}
          {request.intro ? <div><span>简介</span>{request.intro}</div> : null}
        </div>
      </div>
      <div className="sp-confirm-actions chat-me-form-actions">
        {request.chatKey ? <>
          <PressedButton type="button" className="sp-confirm-btn" onClick={() => { answerReadd(request, false); setStranger(''); }}>拒绝</PressedButton>
          <PressedButton type="button" className="sp-confirm-btn is-primary" onClick={() => { const freed = !!contacts.blocked[request.chatKey || ''] && !contacts.deleted[request.chatKey || '']; answerReadd(request, true); setStranger(''); showToast(`${request.name} ${freed ? '放出来了' : '加回来了'}`); }}>通过</PressedButton>
        </> : <>
          <PressedButton type="button" className="sp-confirm-btn" disabled={!!busy} onClick={() => { patchFriendRequest(request.id, { state: 'rejected' }); setStranger(''); }}>拒绝</PressedButton>
          <PressedButton type="button" className="sp-confirm-btn" disabled={!!busy} onClick={() => void newStranger(request)}>{busy === 'stranger' ? '想人中…' : '换一个'}</PressedButton>
          <PressedButton type="button" className="sp-confirm-btn is-primary" disabled={!!busy} onClick={() => void takeStranger(request)}>{busy === 'accept' ? '加入中…' : '接受'}</PressedButton>
        </>}
      </div>
    </div>
  </div>, document.body) : null}
</>;
}
