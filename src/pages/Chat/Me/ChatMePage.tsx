import './ChatMePage.css';
import { useEffect, useLayoutEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react';
import { createPortal } from 'react-dom';
import { PressedButton } from '../../../components/shared/PressedButton';
import { readChatRecords } from '../../../utils/chatRecords';
import { readChatCharacters } from '../../../utils/chatCharacterStorage';
import { prepareImage } from '../../../utils/imageAssets';
import { newPersona, readMe, readMeAvatar, saveMeAvatar, subscribeMe, writeMe } from '../../../utils/meStorage';
import type { MePersona, MeStore } from '../../../utils/meStorage';
import { showToast } from '../../../utils/toast';
import { confirmChat } from '../../../utils/chatConfirm';
import { readMyPresence } from '../../../utils/chatPresence';
import { useNativeRefs } from '../../../providers/NativeRefsProvider';

type Bridge = Window & { smallphoneOpenCharacterChat?: (key: string) => unknown };
const LATER = '之后开放';

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
  return { days, total, top: top.count ? `${names.get(top.key)}（${top.count} 条）` : '', last };
}
/** 各个聊天里收藏的消息。 */
function readFavorites() {
  let histories: Record<string, string> = {};
  try { ({ histories } = readChatRecords()); } catch { return []; }
  const names = new Map(readChatCharacters().map(item => [item.archiveId, item.name]));
  const template = document.createElement('template');
  return Object.entries(histories).filter(([key, html]) => names.has(key) && html.includes('data-favorite="true"')).flatMap(([key, html]) => {
    template.innerHTML = html;
    return [...template.content.querySelectorAll<HTMLElement>('[data-favorite="true"]')].map(row => ({
      key, who: row.classList.contains('is-user') ? '我' : names.get(key) || '',
      chat: names.get(key) || '', at: Number(row.dataset.sentAt) || 0,
      text: (row.dataset.chatAiContent || row.querySelector('.chat-bubble')?.textContent || '').trim(),
    }));
  }).sort((a, b) => b.at - a.at);
}
const when = (at: number) => at ? new Date(at).toLocaleString('zh-CN', { year: 'numeric', month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit', hour12: false }) : '';

/** 聊天 App 底下的「Me」：会员证（含陪伴纪录、状态列）、人设抽屉、收藏和之后的入口。整页都用旧电脑程序视窗的样子。 */
export function ChatMePage() {
  const [open, setOpen] = useState(false), [host, setHost] = useState<HTMLElement | null>(null);
  const me = useSyncExternalStore(subscribeMe, readMe), avatar = useSyncExternalStore(subscribeMe, readMeAvatar);
  const [editing, setEditing] = useState<MePersona | null>(null), [favorites, setFavorites] = useState<ReturnType<typeof readFavorites> | null>(null);
  const file = useRef<HTMLInputElement>(null), refs = useNativeRefs(), [picked, setPicked] = useState('');
  const stats = useMemo(() => open ? companionStats() : null, [open]);
  useLayoutEffect(() => {
    const tab = (event: Event) => {
      const name = (event as CustomEvent<string>).detail;
      if (name === 'Me') setOpen(true);
      else if (name === 'Chats') setOpen(false);
      else showToast(`${name === 'Contacts' ? '通讯录' : '发现'}之后开放`);
    };
    window.addEventListener('qingtuan:chat-tab', tab);
    return () => window.removeEventListener('qingtuan:chat-tab', tab);
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
  useEffect(() => { if (open && host) host.scrollTop = 0; }, [open, host]);
  if (!open || !host) return null;
  const save = (patch: Partial<MeStore>) => writeMe({ ...readMe(), ...patch });
  const active = me.personas.find(item => item.id === me.activeId) || null;
  async function pickAvatar(input: HTMLInputElement) {
    const picked = input.files?.[0]; input.value = '';
    if (!picked) return;
    try { await saveMeAvatar(await prepareImage(picked, 512)); } catch { showToast('头像存不进去，换一张试试'); }
  }
  function savePersona(persona: MePersona) {
    if (!persona.name.trim() && !persona.about.trim() && !persona.appearance.trim()) { showToast('至少写一个名字'); return; }
    const exists = me.personas.some(item => item.id === persona.id);
    const personas = exists ? me.personas.map(item => item.id === persona.id ? persona : item) : [...me.personas, persona];
    save({ personas, activeId: me.activeId || persona.id });
    setPicked(persona.id);
    setEditing(null);
  }
  async function removePersona(persona: MePersona) {
    if (!await confirmChat({ title: '删除人设？', message: `「${persona.name || '未命名人设'}」会删掉，之后他不会再知道这个设定。`, confirmText: '删除', danger: true })) return;
    save({ personas: me.personas.filter(item => item.id !== persona.id), activeId: me.activeId === persona.id ? '' : me.activeId });
    setEditing(null);
  }
  const status = active ? `使用中：${active.name || '未命名人设'}` : '还没选人设';
  // 人设清单：点一下选中（反白），工具列的「使用 / 停用」「编辑」对选中的那个动作；双击直接编辑。
  const selected = me.personas.find(item => item.id === picked) || active || me.personas[0] || null;
  const using = !!selected && selected.id === me.activeId;
  return createPortal(<>
    <section className="chat-memory-block chat-me-window chat-me-card" data-menu="Profile   Edit   Help" data-foot="">
      <div className="chat-memory-head"><span className="chat-memory-title">member_card.exe</span><span className="chat-memory-subtitle">who you are here</span></div>
      <div className="chat-me-card-body">
        <button type="button" className="chat-me-avatar" aria-label="换头像" onClick={() => file.current?.click()} style={avatar ? { backgroundImage: `url("${avatar}")` } : undefined}>{avatar ? null : <span>＋</span>}</button>
        <input ref={file} type="file" accept="image/*" hidden onChange={event => pickAvatar(event.currentTarget)} />
        <div className="chat-me-card-fields">
          <input className="chat-me-name" placeholder="你的名字" maxLength={40} defaultValue={me.name} onBlur={event => save({ name: event.currentTarget.value.trim() })} aria-label="名字" />
          <label className="chat-me-handle"><span>@</span><input placeholder="your_id" maxLength={30} defaultValue={me.handle} onBlur={event => { const handle = event.currentTarget.value.trim().replace(/^@+/, ''); event.currentTarget.value = handle; save({ handle }); }} aria-label="ID" /></label>
          <input className="chat-me-signature" placeholder="写一句个性签名…" maxLength={60} defaultValue={me.signature} onBlur={event => save({ signature: event.currentTarget.value.trim() })} aria-label="个性签名" />
        </div>
      </div>
      <fieldset className="chat-me-group">
        <legend>陪伴纪录</legend>
        {stats && stats.total ? <dl>
          <div><dt>认识</dt><dd>第 {stats.days} 天</dd></div>
          <div><dt>一共聊了</dt><dd>{stats.total} 条</dd></div>
          {stats.top ? <div><dt>最常聊</dt><dd>{stats.top}</dd></div> : null}
          {stats.last ? <div><dt>上次聊天</dt><dd>{when(stats.last)}</dd></div> : null}
        </dl> : <p className="chat-me-group-empty">还没开始聊天，第一条消息会从这里开始记。</p>}
      </fieldset>
      <div className="chat-me-statusbar"><span><i className="chat-me-dot" aria-hidden="true" />{readMyPresence().online}</span><span>{status}</span></div>
    </section>

    <section className="chat-memory-block chat-me-window chat-me-drawer" data-menu="File   Edit   View   Help" data-foot="✧ 同时只用一个人设，全部聊天一起换 · 双击可以编辑">
      <div className="chat-memory-head"><span className="chat-memory-title">persona_drawer</span><span className="chat-memory-subtitle">tell him who you are</span></div>
      <div className="chat-me-toolbar">
        <button type="button" onClick={() => setEditing(newPersona())}>新增</button>
        <button type="button" disabled={!selected} aria-pressed={using} onClick={() => selected && save({ activeId: using ? '' : selected.id })}>{using ? '停用' : '使用'}</button>
        <button type="button" disabled={!selected} onClick={() => selected && setEditing({ ...selected })}>编辑</button>
      </div>
      <div className="chat-me-listview" role="listbox" aria-label="人设">
        <div className="chat-me-listhead" aria-hidden="true"><span>名称</span><span>状态</span></div>
        {me.personas.length ? me.personas.map(persona => <button type="button" role="option" key={persona.id} aria-selected={persona.id === selected?.id}
          className="chat-me-listrow" onClick={() => setPicked(persona.id)} onDoubleClick={() => setEditing({ ...persona })}>
          <span className="chat-me-listicon" aria-hidden="true" />
          <span className="chat-me-listname">{persona.name || '未命名人设'}<small>{persona.about.trim() || persona.appearance.trim() || '还没写关于你的事'}</small></span>
          <span className="chat-me-liststate">{persona.id === me.activeId ? '使用中' : ''}</span>
        </button>) : <div className="chat-me-listempty">还没有人设，按「新增」建一个。</div>}
      </div>
    </section>

    <nav className="chat-me-entries" aria-label="更多">
      <PressedButton type="button" className="chat-me-entry" onClick={() => setFavorites(readFavorites())}><span>收藏</span><small>各个聊天里收藏的消息</small></PressedButton>
      <PressedButton type="button" className="chat-me-entry is-later" onClick={() => showToast('表情' + LATER)}><span>表情</span><small>{LATER}</small></PressedButton>
      <PressedButton type="button" className="chat-me-entry is-later" onClick={() => showToast('钱包' + LATER)}><span>钱包</span><small>{LATER}</small></PressedButton>
      <PressedButton type="button" className="chat-me-entry is-later" onClick={() => showToast('设置' + LATER)}><span>设置</span><small>{LATER}</small></PressedButton>
    </nav>

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

    {favorites ? createPortal(<div className="sp-confirm-overlay chat-me-dialog" onClick={event => { if (event.target === event.currentTarget) setFavorites(null); }}>
      <div className="sp-confirm" role="dialog" aria-modal="true" aria-label="收藏">
        <div className="sp-confirm-bar"><span className="sp-confirm-title">收藏</span></div>
        <div className="sp-confirm-body chat-me-favorites">
          {favorites.length ? <div className="chat-me-listview chat-me-favorite-list">
            <div className="chat-me-listhead chat-me-favorite-row" aria-hidden="true"><span>来自</span><span>内容</span><span>时间</span></div>
            {favorites.map((item, index) => <button type="button" className="chat-me-listrow chat-me-favorite-row" key={index} onClick={() => { setFavorites(null); (window as Bridge).smallphoneOpenCharacterChat?.(item.key); }}>
              <span>{item.who === '我' ? '我' : item.chat}</span><span>{item.text || '[消息]'}</span><span>{when(item.at).replace(/^\d+\//, '')}</span>
            </button>)}
          </div> : <div className="sp-confirm-msg">还没有收藏的消息。在聊天里长按一条消息，选「收藏」就会出现在这里。</div>}
        </div>
        <div className="sp-confirm-actions chat-me-form-actions"><PressedButton type="button" className="sp-confirm-btn is-primary" onClick={() => setFavorites(null)}>关闭</PressedButton></div>
      </div>
    </div>, document.body) : null}
  </>, host);
}
