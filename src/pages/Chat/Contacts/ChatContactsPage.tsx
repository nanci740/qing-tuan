import './ChatContactsPage.css';
import { useEffect, useLayoutEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react';
import { createPortal } from 'react-dom';
import { PressedButton } from '../../../components/shared/PressedButton';
import { readChatCharacters } from '../../../utils/chatCharacterStorage';
import { DEFAULT_AVATAR } from '../../../utils/defaultAvatar';
import { compareContactNames, contactInitial, readContacts, setContactRemark, subscribeContacts } from '../../../utils/contactsStorage';
import { useNativeRefs } from '../../../providers/NativeRefsProvider';
import type { ChatCharacter } from '../../../types/chatCharacters';

type Bridge = Window & {
  smallphoneOpenCharacterChat?: (key: string) => unknown;
  smallphoneOpenCharacterCard?: (id?: unknown) => void;
  smallphonePatchCharacter?: (id: string, fields: { favorite?: boolean }) => void;
};
interface Contact { key: string; name: string; remark: string; shown: string; photo: string; star: boolean; sub: string; character: ChatCharacter }
const STAR = '★';

/** 聊天 App 底下的「Contacts」：像纸本通讯录——上面一排索引标签（只有有人的字母），下面一张卡片照拼音分组；点一个人打开名片。 */
export function ChatContactsPage() {
  const [open, setOpen] = useState(false), [host, setHost] = useState<HTMLElement | null>(null), refs = useNativeRefs();
  const contacts = useSyncExternalStore(subscribeContacts, readContacts);
  const [characters, setCharacters] = useState<ChatCharacter[]>([]), [query, setQuery] = useState(''), [folded, setFolded] = useState<Record<string, boolean>>({});
  const [current, setCurrent] = useState(STAR), [viewing, setViewing] = useState(''), [remarkDraft, setRemarkDraft] = useState<string | null>(null);
  const list = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => {
    const onTab = (event: Event) => setOpen((event as CustomEvent<string>).detail === 'Contacts');
    // 角色新增、删除、改特别关注之后，聊天列表会重画一次：跟着重读
    const onThreads = () => setCharacters(readChatCharacters());
    window.addEventListener('qingtuan:chat-tab', onTab);
    window.addEventListener('qingtuan:chat-thread-snapshot', onThreads);
    return () => { window.removeEventListener('qingtuan:chat-tab', onTab); window.removeEventListener('qingtuan:chat-thread-snapshot', onThreads); };
  }, []);
  // 打开：跟「我」一样把列表中间那几块藏起来，通讯录放在底下分页的上面
  useLayoutEffect(() => {
    const view = refs?.get('chatListView'), nav = view?.querySelector('.chat-subnav');
    if (!view || !nav || !open) { setHost(null); return; }
    setCharacters(readChatCharacters()); setQuery('');
    view.setAttribute('data-chat-tab', 'contacts');
    const box = document.createElement('div');
    box.className = 'chat-contacts-page';
    view.insertBefore(box, nav);
    setHost(box);
    return () => { box.remove(); if (view.getAttribute('data-chat-tab') === 'contacts') view.removeAttribute('data-chat-tab'); };
  }, [open]);

  const people = useMemo(() => characters.map((character): Contact => {
    const name = String(character.name || character.nickname || '未命名角色').trim(), remark = contacts.remarks[character.archiveId] || '';
    return { key: character.archiveId, name, remark, shown: remark || name, photo: character.photoUrl || DEFAULT_AVATAR, star: !!character.favorite,
      sub: String(character.quote || '').trim(), character };
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
  // 捲动时，最上面那一组的标签亮起来
  function track() {
    const box = list.current; if (!box) return;
    let top = groups[0]?.[0] || STAR;
    for (const head of box.querySelectorAll<HTMLElement>('[data-contact-group]')) if (head.offsetTop - box.offsetTop <= box.scrollTop + 4) top = head.dataset.contactGroup || top;
    setCurrent(top);
  }
  useEffect(track, [groups]);
  function jump(letter: string) {
    const box = list.current, head = box?.querySelector<HTMLElement>(`[data-contact-group="${CSS.escape(letter)}"]`);
    if (box && head) { box.scrollTop = head.offsetTop - box.offsetTop; setCurrent(letter); }
  }

  const person = people.find(item => item.key === viewing);
  useEffect(() => { if (viewing && !person) setViewing(''); }, [viewing, person]);
  function chat(item: Contact) {
    setViewing(''); setOpen(false);
    (window as Bridge).smallphoneOpenCharacterChat?.(item.key);
  }
  function saveRemark() {
    if (!person || remarkDraft === null) return;
    setContactRemark(person.key, remarkDraft); setRemarkDraft(null);
  }

  if (!open || !host) return null;
  return <>{createPortal(<section className="chat-contacts" aria-label="通讯录">
    <div className="chat-contacts-tabs" role="tablist" aria-label="索引">
      {groups.map(([letter]) => <button type="button" role="tab" key={letter} aria-selected={letter === current} onClick={() => jump(letter)}>{letter}</button>)}
    </div>
    <div className="chat-contacts-card">
      <div className="chat-contacts-top">
        <b>通讯录</b><small>{people.length} 人</small>
        <label className="chat-contacts-search"><span aria-hidden="true">⌕</span><input type="search" placeholder="搜索名字、备注" value={query} onChange={event => setQuery(event.currentTarget.value)} /></label>
      </div>
      <div className="chat-contacts-list" ref={list} onScroll={track}>
        {groups.map(([letter, items]) => <div className="chat-contacts-group" key={letter}>
          <button type="button" className="chat-contacts-head" data-contact-group={letter} aria-expanded={!folded[letter]} onClick={() => setFolded(state => ({ ...state, [letter]: !state[letter] }))}>
            <span aria-hidden="true">{folded[letter] ? '▶' : '▼'}</span>{letter === STAR ? '星标朋友' : letter}<small>({items.length})</small>
          </button>
          {folded[letter] ? null : items.map(item => <button type="button" className="chat-contacts-row" key={item.key} onClick={() => setViewing(item.key)}>
            <img className="chat-contacts-avatar" alt="" src={item.photo} />
            <span className="chat-contacts-text"><b>{item.shown}{item.remark ? <i>{item.name}</i> : null}</b>{item.sub ? <small>{item.sub}</small> : null}</span>
            {item.star ? <span className="chat-contacts-star" aria-label="星标">★</span> : null}
          </button>)}
        </div>)}
        {!people.length ? <p className="chat-contacts-empty">还没有联系人。在 Chats 右上角的 ＋ 新增角色，就会出现在这里。</p>
          : !groups.length ? <p className="chat-contacts-empty">找不到「{query.trim()}」。</p> : null}
      </div>
    </div>
  </section>, host)}
  {person && remarkDraft === null ? createPortal(<div className="sp-confirm-overlay chat-me-dialog chat-contacts-dialog" onClick={event => { if (event.target === event.currentTarget) setViewing(''); }}>
    <div className="sp-confirm" role="dialog" aria-modal="true" aria-label="名片">
      <div className="sp-confirm-bar"><span className="sp-confirm-title">名片</span></div>
      <div className="sp-confirm-body">
        <div className="chat-contacts-card-top">
          <img className="chat-contacts-avatar" alt="" src={person.photo} />
          <span><b>{person.shown}</b>{person.remark ? <small>本名：{person.name}</small> : null}{person.character.nickname ? <small>昵称：{String(person.character.nickname)}</small> : null}</span>
          <button type="button" className={'chat-contacts-starbtn' + (person.star ? ' is-on' : '')} aria-pressed={person.star} aria-label={person.star ? '取消星标' : '设为星标'}
            onClick={() => (window as Bridge).smallphonePatchCharacter?.(person.key, { favorite: !person.star })}>{person.star ? '★' : '☆'}</button>
        </div>
        <div className="chat-contacts-fields">
          {[['备注', person.remark], ['关系', person.character.relationship], ['生日', [person.character.birthday, person.character.constellation].filter(Boolean).join(' · ')], ['签名', person.character.quote]]
            .filter(([, value]) => String(value || '').trim()).map(([label, value]) => <div key={String(label)}><span>{label}</span>{String(value)}</div>)}
        </div>
      </div>
      <div className="sp-confirm-actions chat-me-form-actions">
        <PressedButton type="button" className="sp-confirm-btn" onClick={() => setRemarkDraft(person.remark)}>设备注</PressedButton>
        <PressedButton type="button" className="sp-confirm-btn" onClick={() => { setViewing(''); (window as Bridge).smallphoneOpenCharacterCard?.(person.character.dossierId); }}>看档案</PressedButton>
        <PressedButton type="button" className="sp-confirm-btn is-primary" onClick={() => chat(person)}>发消息</PressedButton>
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
  </div>, document.body) : null}</>;
}
