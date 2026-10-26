import './Diary.css';
import { useEffect, useLayoutEffect, useRef, useState, useSyncExternalStore } from 'react';
import { readChatCharacters } from '../../utils/chatCharacterStorage';
import { contactName } from '../../utils/contactsStorage';
import { DEFAULT_AVATAR } from '../../utils/defaultAvatar';
import { confirmChat } from '../../utils/chatConfirm';
import { showToast } from '../../utils/toast';
import { dayOf, readDiary, removeEntry, saveEntry, subscribeDiary } from '../../utils/diaryStorage';
import type { DiaryEntry } from '../../utils/diaryStorage';
import { diaryTick, writeDiary } from '../../utils/diaryEngine';
import { momentPeople } from '../../utils/momentsEngine';

type View = { kind: 'shelf' } | { kind: 'list'; key: string } | { kind: 'entry'; id: string } | { kind: 'edit'; draft: Draft };
interface Draft { id?: string; day: string; weather: string; mood: string; title: string; body: string; share: string[] }
const WEATHER = ['晴', '多云', '阴', '雨', '雪', '风', '雾'];
const WEEK = '日一二三四五六', MONTH = ['一', '二', '三', '四', '五', '六', '七', '八', '九', '十', '十一', '十二'];
const nameOf = (key: string) => key === 'me' ? '我' : contactName(key, String(readChatCharacters().find(item => item.archiveId === key)?.name || ''));
const photoOf = (key: string) => readChatCharacters().find(item => item.archiveId === key)?.photoUrl || DEFAULT_AVATAR;
/** 正文：~~字~~ 是写了又划掉的。 */
function Body({ text }: { text: string }) {
  return <>{text.split(/(~~.+?~~)/s).map((part, index) => part.startsWith('~~') && part.endsWith('~~') && part.length > 4 ? <s key={index}>{part.slice(2, -2)}</s> : <span key={index}>{part}</span>)}</>;
}
const plain = (text: string) => text.replace(/~~(.+?)~~/gs, '$1').replace(/\s+/g, ' ');
const dateParts = (day: string) => { const date = new Date(day + 'T12:00:00'); return { d: date.getDate(), m: MONTH[date.getMonth()] + '月', w: '周' + WEEK[date.getDay()], full: `${date.getFullYear()}.${String(date.getMonth() + 1).padStart(2, '0')}.${String(date.getDate()).padStart(2, '0')} 周${WEEK[date.getDay()]}` }; };
function ago(at: number) {
  const days = Math.round((new Date().setHours(0, 0, 0, 0) - new Date(at).setHours(0, 0, 0, 0)) / 86400000);
  return days <= 0 ? '今天' : days === 1 ? '昨天' : `${days} 天前`;
}

/** 底栏的「Diary」：一整页日记 App。书架上每人一本（第一本是你的），点进去照日期排；他的日记他不知道你在看，你的日记可以勾给谁看。 */
export function Diary() {
  const [open, setOpen] = useState(false), [view, setView] = useState<View>({ kind: 'shelf' }), [busy, setBusy] = useState('');
  const diary = useSyncExternalStore(subscribeDiary, readDiary), ticking = useRef(false);
  useLayoutEffect(() => {
    const show = () => { setView({ kind: 'shelf' }); setOpen(true); };
    window.addEventListener('qingtuan:open-diary', show);
    return () => window.removeEventListener('qingtuan:open-diary', show);
  }, []);
  // 他们写日记：开机过一下先看一次，之后每分钟看一次（设定是关就什么都不做）
  useEffect(() => {
    const check = () => { if (ticking.current) return; ticking.current = true; diaryTick().catch(() => {}).finally(() => { ticking.current = false; }); };
    const first = setTimeout(check, 12000), timer = setInterval(check, 60000);
    return () => { clearTimeout(first); clearInterval(timer); };
  }, []);
  if (!open) return null;

  const people = momentPeople(), books = ['me', ...people.map(item => item.archiveId)];
  const entriesOf = (key: string) => diary.entries.filter(entry => entry.by === key);
  const entry = view.kind === 'entry' ? diary.entries.find(item => item.id === view.id) || null : null;
  function back() {
    if (view.kind === 'shelf') { setOpen(false); return; }
    if (view.kind === 'entry' && entry) { setView({ kind: 'list', key: entry.by }); return; }
    if (view.kind === 'edit') { setView(view.draft.id ? { kind: 'entry', id: view.draft.id } : { kind: 'list', key: 'me' }); return; }
    setView({ kind: 'shelf' });
  }
  async function askWrite(key: string) {
    setBusy(key);
    try { const written = await writeDiary(key); setView({ kind: 'entry', id: written.id }); } catch (error) { showToast(String((error as Error)?.message || error).slice(0, 60)); }
    finally { setBusy(''); }
  }
  function save(draft: Draft) {
    if (!draft.body.trim() && !draft.title.trim()) { showToast('写点什么'); return; }
    const old = draft.id ? diary.entries.find(item => item.id === draft.id) : null;
    const saved = saveEntry({ ...(draft.id ? { id: draft.id } : {}), by: 'me', at: old?.at || Date.now(), day: draft.day, title: draft.title.trim().slice(0, 40), weather: draft.weather, mood: draft.mood.trim().slice(0, 12), body: draft.body.trim().slice(0, 4000), ...(draft.share.length ? { share: draft.share } : {}) });
    setView({ kind: 'entry', id: saved.id });
  }
  async function drop(item: DiaryEntry) {
    if (!await confirmChat({ title: '删除这篇日记？', message: '删掉就找不回来了。', confirmText: '删除', danger: true })) return;
    removeEntry(item.id); setView({ kind: 'list', key: item.by });
  }
  const newDraft = (): Draft => ({ day: dayOf(Date.now()), weather: '', mood: '', title: '', body: '', share: [] });

  const now = new Date(), today = <>{String(now.getMonth() + 1).padStart(2, '0')}.{String(now.getDate()).padStart(2, '0')}<br />{['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'][now.getDay()]}</>;
  let title = 'Diary', body: React.ReactNode;
  if (view.kind === 'list') {
    const list = entriesOf(view.key).slice().reverse(), mine = view.key === 'me';
    title = mine ? '我的日记' : `${nameOf(view.key)}的日记`;
    body = <>
      <div className="diary-tools">
        <span>{list.length} 篇</span>
        {mine ? <button type="button" className="diary-btn is-primary" onClick={() => setView({ kind: 'edit', draft: newDraft() })}>写日记</button>
          : <button type="button" className="diary-btn is-primary" disabled={!!busy} onClick={() => void askWrite(view.key)}>{busy === view.key ? '他在写…' : '让他写一篇'}</button>}
      </div>
      {list.map(item => { const date = dateParts(item.day); return <button type="button" className="diary-row" key={item.id} onClick={() => setView({ kind: 'entry', id: item.id })}>
        <span className="diary-date"><b>{date.d}</b><small>{date.m} {date.w}</small></span>
        <span className="diary-row-text"><b>{item.title || '无题'}</b>{[item.weather, item.mood].filter(Boolean).length ? <em>{[item.weather, item.mood].filter(Boolean).join(' · ')}</em> : null}
          <small>{plain(item.body)}</small></span>
      </button>; })}
      {!list.length ? <p className="diary-empty">{mine ? '还没写过。点右上角写第一篇。' : '他还没写过日记。可以等他晚上写，或点「让他写一篇」。'}</p> : null}
    </>;
  } else if (view.kind === 'entry' && entry) {
    const date = dateParts(entry.day), mine = entry.by === 'me';
    title = `${date.m}${date.d}日`;
    body = <>
      <article className="diary-paper">
        <div className="diary-paper-head"><span>{date.full}</span>{entry.weather ? <span>{entry.weather}</span> : null}{entry.mood ? <span>{entry.mood}</span> : null}</div>
        <h3>{entry.title || '无题'}</h3>
        <p><Body text={entry.body} /></p>
      </article>
      {mine ? <div className="diary-foot">
        <span>{entry.share?.length ? `给${entry.share.map(nameOf).join('、')}看过` : '只有你看得到'}</span>
        <button type="button" className="diary-btn" onClick={() => setView({ kind: 'edit', draft: { id: entry.id, day: entry.day, weather: entry.weather, mood: entry.mood, title: entry.title, body: entry.body, share: entry.share || [] } })}>编辑</button>
        <button type="button" className="diary-btn is-danger" onClick={() => void drop(entry)}>删除</button>
      </div> : <p className="diary-foot is-quiet">他不知道你看过。</p>}
    </>;
  } else if (view.kind === 'edit') {
    const draft = view.draft, set = (patch: Partial<Draft>) => setView({ kind: 'edit', draft: { ...draft, ...patch } });
    title = draft.id ? '改日记' : '写日记';
    body = <div className="diary-form">
      <label htmlFor="diaryDay">日期</label>
      <input id="diaryDay" type="date" value={draft.day} onChange={event => set({ day: event.currentTarget.value || draft.day })} />
      <label>天气</label>
      <div className="diary-chips">{WEATHER.map(item => <button type="button" key={item} aria-pressed={draft.weather === item} onClick={() => set({ weather: draft.weather === item ? '' : item })}>{item}</button>)}</div>
      <label htmlFor="diaryMood">心情</label>
      <input id="diaryMood" maxLength={12} placeholder="例如：开心" value={draft.mood} onChange={event => set({ mood: event.currentTarget.value })} />
      <label htmlFor="diaryTitle">标题<small>可以不写</small></label>
      <input id="diaryTitle" maxLength={40} value={draft.title} onChange={event => set({ title: event.currentTarget.value })} />
      <label htmlFor="diaryBody">内容<small>用 ~~字~~ 包起来就是划掉</small></label>
      <textarea id="diaryBody" rows={9} maxLength={4000} value={draft.body} onChange={event => set({ body: event.currentTarget.value })} />
      <label>给谁看<small>勾了的人会知道你写了这篇，聊天时可能会提起</small></label>
      <div className="diary-chips">
        <button type="button" aria-pressed={!draft.share.length} onClick={() => set({ share: [] })}>只有自己</button>
        {people.map(item => { const on = draft.share.includes(item.archiveId); return <button type="button" key={item.archiveId} aria-pressed={on}
          onClick={() => set({ share: on ? draft.share.filter(key => key !== item.archiveId) : [...draft.share, item.archiveId] })}>{nameOf(item.archiveId)}</button>; })}
      </div>
      <div className="diary-form-actions"><button type="button" className="diary-btn" onClick={back}>取消</button><button type="button" className="diary-btn is-primary" onClick={() => save(draft)}>存好</button></div>
    </div>;
  } else {
    body = <div className="diary-shelf">
      {books.map(key => { const list = entriesOf(key), last = list[list.length - 1]; return <button type="button" className="diary-book" key={key} onClick={() => setView({ kind: 'list', key })}>
        <span className="diary-book-tag">{nameOf(key) === '我' ? '我的日记' : nameOf(key)}<small>{key === 'me' ? 'ONLY ME' : 'DIARY'}</small></span>
        <span className="diary-book-belt" aria-hidden="true" />
        {key === 'me' ? null : <img className="diary-book-photo" alt="" src={photoOf(key)} />}
        <span className="diary-book-meta">{list.length} 篇{last ? <><br />{ago(last.at)}</> : null}</span>
      </button>; })}
    </div>;
  }

  return <section className="diary-page" role="dialog" aria-modal="true" aria-label="日记">
    <header className="diary-titlebar">
      <button type="button" className="diary-back" aria-label={view.kind === 'shelf' ? '返回主页' : '返回'} onClick={back}>
        <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><polyline points="15 18 9 12 15 6" /></svg>
      </button>
      <h1 className="diary-strip">{title}</h1>
      <span className="diary-today">{today}</span>
    </header>
    <div className="diary-body">{body}</div>
  </section>;
}
