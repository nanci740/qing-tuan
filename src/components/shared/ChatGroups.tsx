import './ChatGroups.css';
import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { PressedButton } from './PressedButton';
import { readChatCharacters } from '../../utils/chatCharacterStorage';
import { DEFAULT_AVATAR } from '../../utils/defaultAvatar';
import { compressCharacterAvatar } from '../../utils/characterAvatar';
import { showToast } from '../../utils/toast';
import { confirmChat } from '../../utils/chatConfirm';
import { contactName } from '../../utils/contactsStorage';
import { MENTION_ALL, groupMembers, groupStrangers, isGroup, memberName, newGroup } from '../../utils/chatGroups';
import { STRANGER_MAX, announceJoin, makeStranger, nextJoin, strangerTick } from '../../utils/groupStrangers';
import type { ChatCharacter, GroupStranger } from '../../types/chatCharacters';

type Bridge = Window & {
  smallphoneOpenCharacterCard?: (id?: unknown) => void;
  smallphoneOpenCharacterChat?: (key: string) => unknown;
  smallphoneGetActiveCharacterProfile?: () => ChatCharacter | null;
  smallphoneSaveGroup?: (group: ChatCharacter) => Promise<boolean>;
  smallphoneRemoveGroup?: (id: string) => Promise<boolean>;
};
/** strangers 群里的陌生人，join 陌生人会不会自己加入，editing 正在改哪个陌生人。 */
interface Draft { id: string; name: string; photo: string; members: string[]; notice: string; nick: string; know: boolean; strangers: GroupStranger[]; join: boolean; editing?: string }
const people = () => readChatCharacters().filter(item => !item.group);
const shownName = (item: ChatCharacter) => contactName(item.archiveId, memberName(item));
const activeGroup = () => { const active = (window as Bridge).smallphoneGetActiveCharacterProfile?.() || null; return isGroup(active) ? active : null; };

/** 群聊：右上角 ＋ 的小选单（新增角色、发起群聊）、发起群聊、群聊信息（改名、公告、成员、昵称、认不认识、解散），还有群里打 @ 跳出的成员名单。 */
export function ChatGroups() {
  const [menu, setMenu] = useState<{ top: number; right: number } | null>(null), [draft, setDraft] = useState<Draft | null>(null), [busy, setBusy] = useState(false);
  const photoInput = useRef<HTMLInputElement>(null);
  const [mention, setMention] = useState<{ query: string; left: number; bottom: number; field: HTMLTextAreaElement } | null>(null);
  useLayoutEffect(() => {
    const openMenu = (event: Event) => {
      const rect = (event as CustomEvent<DOMRect | null>).detail;
      setMenu({ top: rect ? rect.bottom + 4 : 56, right: rect ? Math.max(8, innerWidth - rect.right) : 8 });
    };
    const openInfo = () => {
      const group = activeGroup();
      if (group) setDraft({ id: group.archiveId, name: group.name, photo: group.photoUrl || '', members: group.group.members, notice: group.group.notice, nick: group.group.nick, know: group.group.know, strangers: groupStrangers(group), join: !!group.group.strangerJoin });
    };
    // 群里打 @：游标前面是「@字」就跳出成员名单，照打的字筛
    const typed = (event: Event) => {
      const field = event.target;
      if (!(field instanceof HTMLTextAreaElement) || field.id !== 'chatComposeField') return;
      const match = activeGroup() ? /@([^\s@]{0,12})$/.exec(field.value.slice(0, field.selectionStart ?? field.value.length)) : null;
      if (!match) { setMention(null); return; }
      const rect = field.getBoundingClientRect();
      setMention({ query: match[1], left: rect.left, bottom: innerHeight - rect.top + 4, field });
    };
    window.addEventListener('qingtuan:chat-add-menu', openMenu);
    window.addEventListener('qingtuan:group-info', openInfo);
    document.addEventListener('input', typed);
    return () => { window.removeEventListener('qingtuan:chat-add-menu', openMenu); window.removeEventListener('qingtuan:group-info', openInfo); document.removeEventListener('input', typed); };
  }, []);
  // 陌生人自己加入：开机过一下先看一次，之后每分钟看一次
  useEffect(() => {
    const first = setTimeout(() => void strangerTick(), 15000), timer = setInterval(() => void strangerTick(), 60000);
    return () => { clearTimeout(first); clearInterval(timer); };
  }, []);
  useEffect(() => {
    if (!menu) return;
    const close = () => setMenu(null);
    const timer = setTimeout(() => document.addEventListener('pointerdown', close, { once: true }), 0);
    return () => { clearTimeout(timer); document.removeEventListener('pointerdown', close); };
  }, [menu]);

  const characters = draft || mention ? people() : [];
  async function save() {
    if (!draft) return;
    if (draft.members.length < 2) { showToast('至少选两个人'); return; }
    const existing = readChatCharacters().find(item => item.archiveId === draft.id);
    const fallback = draft.members.map(key => characters.find(item => item.archiveId === key)).filter((item): item is ChatCharacter => !!item).map(shownName).slice(0, 3).join('、');
    const base = existing || newGroup(draft.name || fallback, draft.members);
    const strangers = draft.strangers.map(item => ({ ...item, name: item.name.trim().slice(0, 12) || '陌生人', persona: item.persona.trim().slice(0, 200) }));
    const before = isGroup(existing) ? groupStrangers(existing) : [], joined = strangers.filter(item => !before.some(one => one.key === item.key));
    const next = draft.join ? (isGroup(existing) && existing.group.strangerJoin && existing.group.strangerNext) || nextJoin() : undefined;
    const group: ChatCharacter = { ...base, name: draft.name.trim().slice(0, 20) || fallback || '群聊', photoUrl: draft.photo,
      group: { members: draft.members, notice: draft.notice.trim().slice(0, 300), nick: draft.nick.trim().slice(0, 12), know: draft.know, strangers, strangerJoin: draft.join, ...(next ? { strangerNext: next } : {}) } };
    setBusy(true);
    const ok = await (window as Bridge).smallphoneSaveGroup?.(group);
    setBusy(false);
    if (!ok) { showToast('群聊没存进去，再试一次'); return; }
    setDraft(null);
    if (!existing) (window as Bridge).smallphoneOpenCharacterChat?.(group.archiveId);
    // 新来的陌生人：聊天里一行灰字，再请他打个招呼
    for (const item of joined) announceJoin(group.archiveId, item);
  }
  // 随机一个陌生人：照群名、公告、成员想一个，先放进草稿，存好才算进群
  const [making, setMaking] = useState(false);
  async function addStranger() {
    if (!draft || making) return;
    if (draft.strangers.length >= STRANGER_MAX) { showToast(`陌生人最多 ${STRANGER_MAX} 个`); return; }
    setMaking(true);
    try { const stranger = await makeStranger(draft); setDraft(current => current && { ...current, strangers: [...current.strangers, stranger] }); }
    catch (error) { showToast(String((error as Error)?.message || error).slice(0, 60)); }
    finally { setMaking(false); }
  }
  const patchStranger = (key: string, patch: Partial<GroupStranger>) => setDraft(current => current && { ...current, strangers: current.strangers.map(item => item.key === key ? { ...item, ...patch } : item) });
  async function dissolve() {
    if (!draft || !await confirmChat({ title: '解散群聊？', message: `「${draft.name || '群聊'}」和群里的聊天记录会一起删掉，成员的私聊不受影响。`, confirmText: '解散', danger: true })) return;
    if (await (window as Bridge).smallphoneRemoveGroup?.(draft.id)) { setDraft(null); showToast('群聊解散了'); }
  }
  // 群头像：自己选一张图；不选就是成员头像拼起来
  async function choosePhoto(file?: File) {
    if (!draft || !file) return;
    try { setDraft({ ...draft, photo: await compressCharacterAvatar(file) }); } catch (error) { showToast(String((error as Error)?.message || error).slice(0, 60)); }
  }
  function pick(name: string) {
    if (!mention) return;
    const { field } = mention, caret = field.selectionStart ?? field.value.length, before = field.value.slice(0, caret).replace(/@([^\s@]{0,12})$/, `@${name} `);
    field.value = before + field.value.slice(caret);
    field.focus(); field.setSelectionRange(before.length, before.length);
    field.dispatchEvent(new Event('input', { bubbles: true }));
    setMention(null);
  }

  const isNew = !!draft && !readChatCharacters().some(item => item.archiveId === draft.id);
  const group = mention ? activeGroup() : null, members = group ? groupMembers(group, people()) : [];
  // @ 名单：正式成员在前，陌生人在后，都照打的字筛
  const options = [...members.map(item => ({ key: item.archiveId, name: shownName(item), alias: memberName(item), photo: item.photoUrl })),
    ...groupStrangers(group).map(item => ({ key: item.key, name: item.name, alias: item.name, photo: item.photoUrl }))]
    .filter(item => !mention?.query || item.name.includes(mention.query) || item.alias.includes(mention.query));
  return <>
    {menu ? createPortal(<div className="chat-add-menu" role="menu" style={{ top: menu.top, right: menu.right }} onPointerDown={event => event.stopPropagation()}>
      <button type="button" role="menuitem" onClick={() => { setMenu(null); (window as Bridge).smallphoneOpenCharacterCard?.(); }}><span aria-hidden="true">＋</span>新增角色</button>
      <button type="button" role="menuitem" onClick={() => { setMenu(null); setDraft({ id: 'new', name: '', photo: '', members: [], notice: '', nick: '', know: true, strangers: [], join: false }); }}><span aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-1a2 2 0 00-2-2H9a2 2 0 00-2 2v1" /><path d="M19 10h1a2 2 0 012 2v1" /><path d="M5 10H4a2 2 0 00-2 2v1" /><circle cx="12" cy="11" r="3" /><circle cx="18" cy="4" r="2" /><circle cx="6" cy="4" r="2" /></svg></span>发起群聊</button>
    </div>, document.body) : null}

    {mention && group && (options.length || !mention.query) ? createPortal(<div className="chat-mention" role="listbox" aria-label="提醒谁看" style={{ left: mention.left, bottom: mention.bottom }} onPointerDown={event => event.preventDefault()}>
      <small>提醒谁看</small>
      {options.map(item => <button type="button" role="option" key={item.key} onClick={() => pick(item.name)}><img alt="" src={item.photo || DEFAULT_AVATAR} />{item.name}</button>)}
      {!mention.query ? <button type="button" role="option" onClick={() => pick(MENTION_ALL)}><span className="chat-mention-all" aria-hidden="true">@</span>{MENTION_ALL}</button> : null}
    </div>, document.body) : null}

    {draft ? createPortal(<div className="sp-confirm-overlay chat-me-dialog chat-group-dialog" onClick={event => { if (event.target === event.currentTarget && !busy) setDraft(null); }}>
      <div className="sp-confirm" role="dialog" aria-modal="true" aria-label={isNew ? '发起群聊' : '群聊信息'}>
        <div className="sp-confirm-bar"><span className="sp-confirm-title">{isNew ? '发起群聊' : '群聊信息'}</span></div>
        <div className="sp-confirm-body chat-me-form">
          <label htmlFor="groupName">群名字{isNew ? <small>不填就用成员名字</small> : null}</label>
          <input id="groupName" maxLength={20} placeholder="例如：周末火锅群" value={draft.name} onChange={event => setDraft({ ...draft, name: event.currentTarget.value })} />
          <label>群头像<small>不换就用成员头像拼起来</small></label>
          <div className="chat-group-photo">
            {draft.photo ? <img alt="" src={draft.photo} /> : <span className="chat-group-grid" data-count={Math.min(4, draft.members.length)}>{draft.members.slice(0, 4).map(key => <img key={key} alt="" src={characters.find(item => item.archiveId === key)?.photoUrl || DEFAULT_AVATAR} />)}</span>}
            <button type="button" className="chat-group-photo-btn" onClick={() => photoInput.current?.click()}>换图片</button>
            <input ref={photoInput} type="file" accept="image/*" hidden onChange={event => { void choosePhoto(event.currentTarget.files?.[0]); event.currentTarget.value = ''; }} />
            {draft.photo ? <button type="button" className="chat-group-photo-btn" onClick={() => setDraft({ ...draft, photo: '' })}>用成员头像</button> : null}
          </div>
          <label>成员<small>{draft.members.length} 人，至少两个</small></label>
          {draft.members.length ? <div className="chat-group-chips">{draft.members.map(key => { const item = characters.find(one => one.archiveId === key); return item ? <button type="button" key={key} aria-label={`拿掉${shownName(item)}`}
            onClick={() => setDraft({ ...draft, members: draft.members.filter(one => one !== key) })}>{shownName(item)} ×</button> : null; })}</div> : null}
          <div className="chat-group-pick">
            {characters.map(item => { const on = draft.members.includes(item.archiveId); return <button type="button" key={item.archiveId} role="checkbox" aria-checked={on}
              onClick={() => setDraft({ ...draft, members: on ? draft.members.filter(one => one !== item.archiveId) : [...draft.members, item.archiveId] })}>
              <span className="chat-group-box" aria-hidden="true" /><img alt="" src={item.photoUrl || DEFAULT_AVATAR} />{shownName(item)}
            </button>; })}
            {!characters.length ? <small>还没有角色，先在 ＋ 新增角色。</small> : null}
          </div>
          <label>陌生人<small>只在这个群里，不能加好友、不发语音</small></label>
          {draft.strangers.length ? <div className="chat-group-strangers">{draft.strangers.map(item => draft.editing === item.key
            ? <div className="chat-group-stranger is-editing" key={item.key}>
              <input maxLength={12} aria-label="名字" value={item.name} onChange={event => patchStranger(item.key, { name: event.currentTarget.value })} />
              <textarea rows={2} maxLength={200} aria-label="人设" placeholder="身份、性格、说话习惯" value={item.persona} onChange={event => patchStranger(item.key, { persona: event.currentTarget.value })} />
              <PressedButton type="button" className="chat-group-photo-btn" onClick={() => setDraft({ ...draft, editing: undefined })}>好了</PressedButton>
            </div>
            : <div className="chat-group-stranger" key={item.key}>
              <img alt="" src={item.photoUrl || DEFAULT_AVATAR} />
              <span><b>{item.name}</b><small>{item.persona}</small></span>
              <PressedButton type="button" className="chat-group-stranger-act" aria-label={`改${item.name}`} onClick={() => setDraft({ ...draft, editing: item.key })}>✎</PressedButton>
              <PressedButton type="button" className="chat-group-stranger-act" aria-label={`把${item.name}踢出群`} onClick={() => setDraft({ ...draft, strangers: draft.strangers.filter(one => one.key !== item.key) })}>×</PressedButton>
            </div>)}</div> : null}
          <PressedButton type="button" className="chat-group-photo-btn chat-group-stranger-add" disabled={making} onClick={() => void addStranger()}>{making ? '想人中…' : '＋ 随机陌生人'}</PressedButton>
          <button type="button" className="chat-group-know" role="switch" aria-checked={draft.join} onClick={() => setDraft({ ...draft, join: !draft.join })}>
            <span className="chat-group-box" aria-hidden="true" /><span>陌生人会自己加入<small>{`偶尔有陌生人进群，两三天一个，最多 ${STRANGER_MAX} 个`}</small></span>
          </button>
          {isNew ? null : <>
            <label htmlFor="groupNotice">群公告<small>成员都看得到</small></label>
            <textarea id="groupNotice" rows={2} maxLength={300} placeholder="例如：周六晚上七点，老地方" value={draft.notice} onChange={event => setDraft({ ...draft, notice: event.currentTarget.value })} />
            <label htmlFor="groupNick">我在群里的昵称<small>可以不写</small></label>
            <input id="groupNick" maxLength={12} value={draft.nick} onChange={event => setDraft({ ...draft, nick: event.currentTarget.value })} />
          </>}
          <button type="button" className="chat-group-know" role="switch" aria-checked={draft.know} onClick={() => setDraft({ ...draft, know: !draft.know })}>
            <span className="chat-group-box" aria-hidden="true" /><span>他们认识彼此<small>照档案里写的关系；不勾就是在群里才认识</small></span>
          </button>
        </div>
        <div className="sp-confirm-actions chat-me-form-actions">
          {isNew ? null : <PressedButton type="button" className="sp-confirm-btn is-danger" disabled={busy} onClick={() => void dissolve()}>解散</PressedButton>}
          <PressedButton type="button" className="sp-confirm-btn" disabled={busy} onClick={() => setDraft(null)}>取消</PressedButton>
          <PressedButton type="button" className="sp-confirm-btn is-primary" disabled={busy} onClick={() => void save()}>{isNew ? `建群（${draft.members.length} 人）` : '存好'}</PressedButton>
        </div>
      </div>
    </div>, document.body) : null}
  </>;
}
