import './ChatMePage.css';
import { useEffect, useLayoutEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react';
import type { ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { PressedButton } from '../../../components/shared/PressedButton';
import { readChatRecords } from '../../../utils/chatRecords';
import { readChatCharacters } from '../../../utils/chatCharacterStorage';
import { prepareImage } from '../../../utils/imageAssets';
import { newPersona, readMe, readMeAvatar, saveMeAvatar, subscribeMe, writeMe } from '../../../utils/meStorage';
import type { MePersona, MeStore } from '../../../utils/meStorage';
import { showToast } from '../../../utils/toast';
import { confirmChat } from '../../../utils/chatConfirm';
import { DEFAULT_BIRD_AVATAR } from '../../../utils/defaultAvatar';
import { readMyPresence } from '../../../utils/chatPresence';
import { useNativeRefs } from '../../../providers/NativeRefsProvider';
import { MePixelIcon, MOODS } from './MePixelIcon';

type Bridge = Window & { smallphoneOpenCharacterChat?: (key: string) => unknown };
type Tab = 'me' | 'favorites';
const LATER = '之后开放';
const APPS = [['表情', 'sticker'], ['钱包', 'wallet']] as const;

/** 聊天记录里数出来的陪伴纪录：认识第几天、聊了几条、最常聊谁、上次聊天。 */
function companionStats() {
  let histories: Record<string, string> = {}, times: Record<string, number> = {};
  try { ({ histories, times } = readChatRecords()); } catch { /* 聊天记录还没准备好 */ }
  const names = new Map(readChatCharacters().map(item => [item.archiveId, item.name]));
  let first = Infinity, total = 0, top = { key: '', count: 0 }, last = 0;
  for (const [key, html] of Object.entries(histories)) {
    if (!names.has(key)) continue;
    const count = (html.match(/class="chat-message-row/g) || []).length;
    total += count;
    if (count > top.count) top = { key, count };
    const stamp = Number(/data-sent-at="(\d+)"/.exec(html)?.[1]);
    if (stamp > 0 && stamp < first) first = stamp;
    if (count && Number(times[key]) > last) last = Number(times[key]);
  }
  const days = Number.isFinite(first) ? Math.floor((Date.now() - first) / 86400000) + 1 : 0;
  return { days, total, top: top.count ? names.get(top.key) || '' : '', last };
}
/** 各个聊天里收藏的消息，照聊天对象分组。 */
function readFavorites() {
  let histories: Record<string, string> = {};
  try { ({ histories } = readChatRecords()); } catch { return []; }
  const names = new Map(readChatCharacters().map(item => [item.archiveId, item.name]));
  const template = document.createElement('template');
  return Object.entries(histories).filter(([key, html]) => names.has(key) && html.includes('data-favorite="true"')).map(([key, html]) => {
    template.innerHTML = html;
    const items = [...template.content.querySelectorAll<HTMLElement>('[data-favorite="true"]')].map(row => ({
      mine: row.classList.contains('is-user'), at: Number(row.dataset.sentAt) || 0,
      text: (row.dataset.chatAiContent || row.querySelector('.chat-bubble')?.textContent || '').trim(),
    })).sort((a, b) => b.at - a.at);
    return { key, name: names.get(key) || '', items };
  }).sort((a, b) => (b.items[0]?.at || 0) - (a.items[0]?.at || 0));
}
const when = (at: number) => at ? new Date(at).toLocaleString('zh-CN', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit', hour12: false }) : '';

/** 一组可以收起来的清单，标题前面一个小三角（像以前聊天软件的好友分组）。 */
function Group({ title, count, open, onToggle, children }: { title: string; count?: number; open: boolean; onToggle: () => void; children: ReactNode }) {
  return <div className="chat-me-group">
    <button type="button" className="chat-me-group-head" aria-expanded={open} onClick={onToggle}>
      <span className="chat-me-chev" aria-hidden="true">{open ? '▼' : '▶'}</span>{title}{count === undefined ? null : <small>({count})</small>}
    </button>
    {open ? children : null}
  </div>;
}

/** 聊天 App 底下的「Me」：照旧聊天软件主视窗的里面那几块排——资料小窗、陪伴纪录三张小卡、左边直排分页（我、收藏和之后的功能）、右边清单、底下状态列。 */
export function ChatMePage() {
  const [open, setOpen] = useState(false), [host, setHost] = useState<HTMLElement | null>(null);
  const me = useSyncExternalStore(subscribeMe, readMe), avatar = useSyncExternalStore(subscribeMe, readMeAvatar);
  const [tab, setTab] = useState<Tab>('me'), [folded, setFolded] = useState<Record<string, boolean>>({});
  const [editing, setEditing] = useState<MePersona | null>(null), [profile, setProfile] = useState<Pick<MeStore, 'name' | 'handle' | 'signature'> | null>(null);
  const file = useRef<HTMLInputElement>(null), refs = useNativeRefs();
  const stats = useMemo(() => open ? companionStats() : null, [open]);
  const favorites = useMemo(() => open && tab === 'favorites' ? readFavorites() : [], [open, tab]);
  useLayoutEffect(() => {
    const onTab = (event: Event) => {
      const name = (event as CustomEvent<string>).detail;
      if (name === 'Me') setOpen(true);
      else if (name === 'Chats') setOpen(false);
      else showToast(`${name === 'Contacts' ? '通讯录' : '发现'}${LATER}`);
    };
    window.addEventListener('qingtuan:chat-tab', onTab);
    return () => window.removeEventListener('qingtuan:chat-tab', onTab);
  }, []);
  // 打开「我」：列表中间那几块先藏起来，「我」放在底下分页的上面；分页亮起哪一格交给 CSS 看 data-chat-tab。
  // （列表和分页钮的 class 由 React 管，直接改 class 会被盖掉，所以用另外的属性。）
  useLayoutEffect(() => {
    const view = refs?.get('chatListView'), nav = view?.querySelector('.chat-subnav');
    if (!view || !nav) return;
    if (!open) { view.removeAttribute('data-chat-tab'); setHost(null); return; }
    view.setAttribute('data-chat-tab', 'me');
    const box = document.createElement('div');
    box.className = 'chat-me-page';
    view.insertBefore(box, nav);
    setHost(box);
    return () => { box.remove(); view.removeAttribute('data-chat-tab'); };
  }, [open]);
  useEffect(() => { if (open) setTab('me'); }, [open]);
  if (!open || !host) return null;

  const save = (patch: Partial<MeStore>) => writeMe({ ...readMe(), ...patch });
  const fold = (key: string) => setFolded(current => ({ ...current, [key]: !current[key] }));
  const later = (name: string) => showToast(name + LATER);
  async function pickAvatar(input: HTMLInputElement) {
    const picked = input.files?.[0]; input.value = '';
    if (!picked) return;
    try { await saveMeAvatar(await prepareImage(picked, 512)); } catch { showToast('头像存不进去，换一张试试'); }
  }
  function saveProfile(next: NonNullable<typeof profile>) {
    save({ name: next.name.trim(), handle: next.handle.trim().replace(/^@+/, ''), signature: next.signature.trim() });
    setProfile(null);
  }
  function savePersona(persona: MePersona) {
    if (!persona.name.trim() && !persona.about.trim() && !persona.appearance.trim()) { showToast('至少写一个名字'); return; }
    const exists = me.personas.some(item => item.id === persona.id);
    const personas = exists ? me.personas.map(item => item.id === persona.id ? persona : item) : [...me.personas, persona];
    save({ personas, activeId: me.activeId || persona.id });
    setEditing(null);
  }
  async function removePersona(persona: MePersona) {
    if (!await confirmChat({ title: '删除人设？', message: `「${persona.name || '未命名人设'}」会删掉，之后他不会再知道这个设定。`, confirmText: '删除', danger: true })) return;
    save({ personas: me.personas.filter(item => item.id !== persona.id), activeId: me.activeId === persona.id ? '' : me.activeId });
    setEditing(null);
  }
  const editProfile = () => setProfile({ name: me.name, handle: me.handle, signature: me.signature });
  const active = me.personas.find(item => item.id === me.activeId), presence = readMyPresence();
  // 名字旁边的表情：点一下换下一个，存在「我」的资料里；没选过就是笑脸。
  const mood = MOODS.find(item => item === me.mood) || MOODS[0];

  return createPortal(<>
    <section className="chat-me-buddy" aria-label="我">
      <div className="chat-me-profile-window">
        <div className="chat-memory-head"><span className="chat-memory-title">my_profile.exe</span><span className="chat-memory-subtitle">who you are here</span></div>
        <div className="chat-me-profile">
          <button type="button" className="chat-me-avatar" aria-label="换头像" onClick={() => file.current?.click()} style={{ backgroundImage: `url("${avatar || DEFAULT_BIRD_AVATAR}")` }} />
          <input ref={file} type="file" accept="image/*" hidden onChange={event => pickAvatar(event.currentTarget)} />
          <div className="chat-me-info">
            <button type="button" className="chat-me-mood" aria-label="换表情" onClick={() => save({ mood: MOODS[(MOODS.indexOf(mood) + 1) % MOODS.length] })}><MePixelIcon name={mood} size={20} /></button>
            <button type="button" className="chat-me-edit" aria-label="编辑资料" onClick={editProfile}>
              <span className="chat-me-name">[{me.name || '你的名字'}]</span>
              <span className="chat-me-handle">@{me.handle || 'your_id'}</span>
              <span className="chat-me-signature">{me.signature || '写一句个性签名…'}</span>
            </button>
          </div>
          <button type="button" className="chat-me-round" aria-label="新增人设" onClick={() => setEditing(newPersona())}><MePixelIcon name="personPlus" size={24} /></button>
        </div>
      </div>

      <div className="chat-me-cards" aria-label="陪伴纪录">
        <div><MePixelIcon name="star" size={24} /><b>{stats?.days || 0}</b><small>认识天数</small></div>
        <div><MePixelIcon name="bubble" size={24} /><b>{stats?.total || 0}</b><small>聊天条数</small></div>
        <div><MePixelIcon name="bubbleHeart" size={24} /><b className="is-text">{stats?.top || '—'}</b><small>最常聊</small></div>
      </div>

      <div className="chat-me-main">
        <div className="chat-me-side" role="tablist" aria-label="分页">
          <button type="button" role="tab" aria-selected={tab === 'me'} onClick={() => setTab('me')}><MePixelIcon name="person" />我</button>
          <button type="button" role="tab" aria-selected={tab === 'favorites'} onClick={() => setTab('favorites')}><MePixelIcon name="gift" />收藏</button>
          {APPS.map(([name, icon]) => <button type="button" key={name} onClick={() => later(name)}><MePixelIcon name={icon} />{name}</button>)}
          <span className="chat-me-side-fill" />
          <button type="button" className="chat-me-side-last" onClick={() => later('设置')}><MePixelIcon name="gear" />设置</button>
        </div>

        <div className="chat-me-content" role="tabpanel">
          {tab === 'me' ? <>
            <Group title="我的人设" count={me.personas.length} open={!folded.personas} onToggle={() => fold('personas')}>
              <div className="chat-me-rows">
                {me.personas.map(persona => {
                  const using = persona.id === me.activeId;
                  return <div className={'chat-me-row' + (using ? ' is-active' : '')} key={persona.id}>
                    <button type="button" className="chat-me-row-main" onClick={() => setEditing({ ...persona })}>
                      <MePixelIcon name="folder" size={22} />
                      <span>{persona.name || '未命名人设'}</span>
                    </button>
                    <button type="button" className="chat-me-row-state" onClick={() => save({ activeId: using ? '' : persona.id })}>{using ? '✓ 使用中' : '使用'}</button>
                  </div>;
                })}
                <button type="button" className="chat-me-row-add" onClick={() => setEditing(newPersona())}>＋ 新增人设</button>
              </div>
            </Group>
          </> : favorites.length ? favorites.map(group => <Group key={group.key} title={group.name} count={group.items.length} open={!folded['fav:' + group.key]} onToggle={() => fold('fav:' + group.key)}>
            <div className="chat-me-rows">
              {group.items.map((item, index) => <button type="button" className="chat-me-fav" key={index} onClick={() => (window as Bridge).smallphoneOpenCharacterChat?.(group.key)}>
                <span>{item.mine ? '我：' : ''}{item.text || '[消息]'}</span><small>{when(item.at)}</small>
              </button>)}
            </div>
          </Group>) : <p className="chat-me-note">还没有收藏的消息。在聊天里长按一条消息，选「收藏」就会出现在这里。</p>}
        </div>
      </div>

      <div className="chat-me-statusbar" aria-label="状态">
        <span data-state={presence.custom ? '自定义' : presence.online}><i className="chat-me-dot" aria-hidden="true" />{presence.online}</span>
        <span>{active ? `使用中：${active.name || '未命名人设'}` : '还没选人设'}</span>
        {stats?.last ? <span>上次聊天 {when(stats.last)}</span> : null}
      </div>
    </section>

    {profile ? createPortal(<div className="sp-confirm-overlay chat-me-dialog" onClick={event => { if (event.target === event.currentTarget) setProfile(null); }}>
      <div className="sp-confirm" role="dialog" aria-modal="true" aria-label="编辑资料">
        <div className="sp-confirm-bar"><span className="sp-confirm-title">编辑资料</span></div>
        <div className="sp-confirm-body chat-me-form">
          <label htmlFor="meProfileName">名字</label>
          <input id="meProfileName" maxLength={40} value={profile.name} onChange={event => { const name = event.currentTarget.value; setProfile(current => current && { ...current, name }); }} />
          <label htmlFor="meProfileHandle">ID<small>@ 后面那一串</small></label>
          <input id="meProfileHandle" maxLength={30} value={profile.handle} onChange={event => { const handle = event.currentTarget.value; setProfile(current => current && { ...current, handle }); }} />
          <label htmlFor="meProfileSignature">个性签名</label>
          <input id="meProfileSignature" maxLength={60} value={profile.signature} onChange={event => { const signature = event.currentTarget.value; setProfile(current => current && { ...current, signature }); }} />
        </div>
        <div className="sp-confirm-actions chat-me-form-actions">
          <PressedButton type="button" className="sp-confirm-btn" onClick={() => setProfile(null)}>取消</PressedButton>
          <PressedButton type="button" className="sp-confirm-btn is-primary" onClick={() => saveProfile(profile)}>保存</PressedButton>
        </div>
      </div>
    </div>, document.body) : null}

    {editing ? createPortal(<div className="sp-confirm-overlay chat-me-dialog" onClick={event => { if (event.target === event.currentTarget) setEditing(null); }}>
      <div className="sp-confirm" role="dialog" aria-modal="true" aria-label="人设">
        <div className="sp-confirm-bar"><span className="sp-confirm-title">{me.personas.some(item => item.id === editing.id) ? '编辑人设' : '新增人设'}</span></div>
        <div className="sp-confirm-body chat-me-form">
          <label htmlFor="mePersonaName">名字<small>他会这样叫你</small></label>
          <input id="mePersonaName" maxLength={40} value={editing.name} onChange={event => { const name = event.currentTarget.value; setEditing(current => current && { ...current, name }); }} />
          <label htmlFor="mePersonaLook">外貌<small>长什么样、平常怎么穿</small></label>
          <textarea id="mePersonaLook" rows={3} maxLength={2000} value={editing.appearance} onChange={event => { const appearance = event.currentTarget.value; setEditing(current => current && { ...current, appearance }); }} />
          <label htmlFor="mePersonaAbout">关于我<small>性格、职业、喜好、跟他的关系……</small></label>
          <textarea id="mePersonaAbout" rows={5} maxLength={4000} value={editing.about} onChange={event => { const about = event.currentTarget.value; setEditing(current => current && { ...current, about }); }} />
        </div>
        <div className="sp-confirm-actions chat-me-form-actions">
          {me.personas.some(item => item.id === editing.id) ? <PressedButton type="button" className="sp-confirm-btn is-primary is-danger" onClick={() => removePersona(editing)}>删除</PressedButton> : null}
          <PressedButton type="button" className="sp-confirm-btn" onClick={() => setEditing(null)}>取消</PressedButton>
          <PressedButton type="button" className="sp-confirm-btn is-primary" onClick={() => savePersona(editing)}>保存</PressedButton>
        </div>
      </div>
    </div>, document.body) : null}
  </>, host);
}
