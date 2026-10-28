import './Diary.css';
import { useEffect, useLayoutEffect, useRef, useState, useSyncExternalStore } from 'react';
import { createPortal } from 'react-dom';
import { PressedButton } from '../../components/shared/PressedButton';
import { readChatCharacters } from '../../utils/chatCharacterStorage';
import { contactName } from '../../utils/contactsStorage';
import { DEFAULT_AVATAR } from '../../utils/defaultAvatar';
import { confirmChat } from '../../utils/chatConfirm';
import { showToast } from '../../utils/toast';
import { dayOf, readDiary, removeEntry, saveEntry, subscribeDiary } from '../../utils/diaryStorage';
import type { DiaryEntry } from '../../utils/diaryStorage';
import { askCode, caughtSince, crackLock, diaryTick, ensureLock, lingerCheck, peekEntry, relockCracked, setMyCode, tryCode, writeDiary } from '../../utils/diaryEngine';
import { momentPeople } from '../../utils/momentsEngine';

/** 锁的弹窗：mode 是打开他的（open）、打开你自己的（mine）、设你的密码（set，再输一次确认）。 */
interface Lock { key: string; mode: 'open' | 'mine' | 'set'; digits: string; first?: string; note: string; busy?: boolean }
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
function LockIcon() { return <svg viewBox="0 0 24 24" aria-hidden="true"><rect x="4" y="11" width="16" height="10" rx="2" /><path d="M8 11V7a4 4 0 0 1 8 0v4" /></svg>; }
/** 被撬开偷看过的痕迹：每次撬开，他看的是那时最近的三篇，其中随机一两篇留下痕迹（折角、杯印、折痕和指印），杯印和指印的位置每篇不一样；不写是谁。 */
const hash = (text: string) => { let seed = 0; for (const char of text) seed = (seed * 31 + char.charCodeAt(0)) >>> 0; return seed; };
function Clues({ entry, mine, cracks }: { entry: DiaryEntry; mine: DiaryEntry[]; cracks: number[] }) {
  const hit = cracks.find(at => {
    const seen = mine.filter(item => item.at <= at).slice(-3), index = seen.indexOf(entry);
    if (index < 0) return false;
    return index === hash(String(at)) % seen.length || hash(entry.id + at) % 10 < 3;
  });
  if (hit === undefined) return null;
  let seed = hash(entry.id + hit);
  const roll = (max: number) => { seed = (seed * 1103515245 + 12345) >>> 0; return (seed >>> 8) % max; };
  const kinds = [roll(3)];
  if (roll(10) < 3) kinds.push((kinds[0] + 1 + roll(2)) % 3);
  const spot = () => ({ left: `${12 + roll(60)}%`, top: `${22 + roll(58)}%`, transform: `rotate(${roll(60) - 30}deg)` });
  return <>
    <span className="diary-clues" aria-hidden="true">{kinds.map(kind => kind === 1 ? <span key={kind} className="diary-clue-ring" style={spot()} />
      : kind === 2 ? <span key={kind}><span className="diary-clue-crease" style={{ top: `${30 + roll(50)}%`, transform: `rotate(${roll(12) - 6}deg)` }} /><span className="diary-clue-print" style={spot()} /></span> : null)}</span>
    {kinds.includes(0) ? <span className="diary-clue-fold" aria-hidden="true" /> : null}
  </>;
}
const plain = (text: string) => text.replace(/~~(.+?)~~/gs, '$1').replace(/\s+/g, ' ');
const dateParts = (day: string) => { const date = new Date(day + 'T12:00:00'); return { d: date.getDate(), m: MONTH[date.getMonth()] + '月', w: '周' + WEEK[date.getDay()], full: `${date.getFullYear()}.${String(date.getMonth() + 1).padStart(2, '0')}.${String(date.getDate()).padStart(2, '0')} 周${WEEK[date.getDay()]}` }; };
function ago(at: number) {
  const days = Math.round((new Date().setHours(0, 0, 0, 0) - new Date(at).setHours(0, 0, 0, 0)) / 86400000);
  return days <= 0 ? '今天' : days === 1 ? '昨天' : `${days} 天前`;
}

/** 选日期的小窗：跟其他弹窗同一种窗口，不用系统的日期选择器；左右切月份，选中的那天是主题色，今天的字是主题色。 */
function DayPicker({ value, onPick, onClose }: { value: string; onPick: (day: string) => void; onClose: () => void }) {
  const [month, setMonth] = useState(() => { const [y, m] = value.split('-').map(Number); return new Date(y, m - 1, 1); });
  const today = dayOf(Date.now()), year = month.getFullYear(), index = month.getMonth();
  const lead = month.getDay(), count = new Date(year, index + 1, 0).getDate(), pad = (n: number) => String(n).padStart(2, '0');
  const arrow = (points: string) => <svg viewBox="0 0 24 24" aria-hidden="true"><polyline points={points} /></svg>;
  return createPortal(<div className="sp-confirm-overlay diary-picker" onClick={event => { if (event.target === event.currentTarget) onClose(); }}>
    <div className="sp-confirm" role="dialog" aria-modal="true" aria-label="选择日期">
      <div className="sp-confirm-bar"><span className="sp-confirm-title">选择日期</span></div>
      <div className="diary-picker-nav">
        <button type="button" className="diary-btn" aria-label="上个月" onClick={() => setMonth(new Date(year, index - 1, 1))}>{arrow('15 18 9 12 15 6')}</button>
        <strong aria-live="polite">{year}年{index + 1}月</strong>
        <button type="button" className="diary-btn" aria-label="下个月" onClick={() => setMonth(new Date(year, index + 1, 1))}>{arrow('9 18 15 12 9 6')}</button>
      </div>
      <div className="diary-picker-week" aria-hidden="true">{[...WEEK].map(day => <span key={day}>{day}</span>)}</div>
      <div className="diary-picker-days">
        {Array.from({ length: lead }, (_, i) => <span key={'blank' + i} />)}
        {Array.from({ length: count }, (_, i) => { const day = `${year}-${pad(index + 1)}-${pad(i + 1)}`;
          return <button type="button" key={day} aria-pressed={day === value} aria-current={day === today ? 'date' : undefined} aria-label={`${year}年${index + 1}月${i + 1}日`} onClick={() => onPick(day)}>{i + 1}</button>; })}
      </div>
      <div className="diary-picker-actions"><button type="button" className="diary-btn" onClick={() => onPick(today)}>今天</button></div>
    </div>
  </div>, document.body);
}

/** 底栏的「Diary」：一整页日记 App。书架上每人一本（第一本是你的），点进去照日期排；他的日记他不知道你在看，你的日记可以勾给谁看。 */
export function Diary() {
  const [open, setOpen] = useState(false), [view, setView] = useState<View>({ kind: 'shelf' }), [busy, setBusy] = useState('');
  const diary = useSyncExternalStore(subscribeDiary, readDiary), ticking = useRef(false);
  // lock 是锁的弹窗；mineOpen 这次打开日记 App 以后，你的本子输过密码了
  const [lock, setLock] = useState<Lock | null>(null), [mineOpen, setMineOpen] = useState(false), digitsRef = useRef<HTMLInputElement>(null);
  // visitAt 这次点开他本子的时间（这之后被他发现，本子里写「他发现你在看了」）
  const visitAt = useRef(0);
  // picking 写日记时选日期的小窗开着
  const [picking, setPicking] = useState(false);
  useLayoutEffect(() => {
    const show = () => { relockCracked(); setView({ kind: 'shelf' }); setMineOpen(false); setOpen(true); };
    window.addEventListener('qingtuan:open-diary', show);
    return () => window.removeEventListener('qingtuan:open-diary', show);
  }, []);
  // 他们写日记：开机过一下先看一次，之后每分钟看一次（设定是关就什么都不做）
  useEffect(() => {
    const check = () => { if (ticking.current) return; ticking.current = true; diaryTick().catch(() => {}).finally(() => { ticking.current = false; }); };
    const first = setTimeout(check, 12000), timer = setInterval(check, 60000);
    return () => { clearTimeout(first); clearInterval(timer); };
  }, []);
  useEffect(() => { if (lock) setTimeout(() => digitsRef.current?.focus(), 50); }, [lock?.key, lock?.mode]);
  // 待在他的本子里（列表或某一篇）：偷看的话，久了也可能被他发现
  const inside = !open ? '' : view.kind === 'list' && view.key !== 'me' ? view.key : view.kind === 'entry' ? diary.entries.find(item => item.id === view.id)?.by || '' : '';
  useEffect(() => {
    if (!inside || inside === 'me') return;
    const timer = setInterval(() => lingerCheck(inside, visitAt.current), 20000);
    return () => clearInterval(timer);
  }, [inside]);
  if (!open) return null;

  const people = momentPeople(), books = ['me', ...people.map(item => item.archiveId)];
  const entriesOf = (key: string) => diary.entries.filter(entry => entry.by === key);
  const entry = view.kind === 'entry' ? diary.entries.find(item => item.id === view.id) || null : null;
  function back() {
    if (view.kind === 'shelf') { setOpen(false); return; }
    if (view.kind === 'entry' && entry) { setView({ kind: 'list', key: entry.by }); return; }
    if (view.kind === 'edit') { setView(view.draft.id ? { kind: 'entry', id: view.draft.id } : { kind: 'list', key: 'me' }); return; }
    relockCracked(); setView({ kind: 'shelf' });
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
  // 点一本：他的没打开过就先跳锁（第一次会先想好密码），你的没设密码先设，设了要输一次
  async function openBook(key: string) {
    if (key === 'me') {
      if (!diary.locks.me) { setLock({ key, mode: 'set', digits: '', note: '先给你的日记设一个四位数字密码。' }); return; }
      if (mineOpen) { setView({ kind: 'list', key }); return; }
      setLock({ key, mode: 'mine', digits: '', note: '' }); return;
    }
    visitAt.current = Date.now();
    if (diary.access[key]) { setView({ kind: 'list', key }); return; }
    setLock({ key, mode: 'open', digits: '', note: '', busy: true });
    try { await ensureLock(key); setLock(current => current && { ...current, busy: false }); }
    catch (error) { setLock(null); showToast(String((error as Error)?.message || error).slice(0, 60)); }
  }
  function submitLock() {
    if (!lock || lock.digits.length !== 4) return;
    if (lock.mode === 'set') {
      if (!lock.first) { setLock({ ...lock, first: lock.digits, digits: '', note: '再输一次确认。' }); return; }
      if (lock.first !== lock.digits) { setLock({ ...lock, first: undefined, digits: '', note: '两次不一样，重新设一次。' }); return; }
      setMyCode(lock.digits); setLock(null); setMineOpen(true); setView({ kind: 'list', key: 'me' }); showToast('密码设好了'); return;
    }
    if (lock.mode === 'mine') {
      if (diary.locks.me?.code !== lock.digits) { setLock({ ...lock, digits: '', note: '不对，再想想。' }); return; }
      setLock(null); setMineOpen(true); setView({ kind: 'list', key: 'me' }); return;
    }
    const missed = tryCode(lock.key, lock.digits);
    if (!missed) { setLock(null); setView({ kind: 'list', key: lock.key }); showToast('打开了'); return; }
    setLock({ ...lock, digits: '', note: '密码错误。' });
  }
  async function crack(key: string) {
    if (!await confirmChat({ title: '强行撬开？', message: '不一定撬得开，撬的时候可能被他发现。撬开了也只能看这一次，退出就又锁上。', confirmText: '撬', danger: true })) return;
    setLock(current => current && { ...current, busy: true, digits: '', note: '在撬…' });
    await new Promise(done => setTimeout(done, 1200));
    if (crackLock(key)) { setLock(null); setView({ kind: 'list', key }); return; }
    setLock(current => current && { ...current, busy: false, note: '没撬开，锁还是好好的。' });
  }
  function openEntry(item: DiaryEntry) { if (item.by !== 'me') peekEntry(item, visitAt.current); setView({ kind: 'entry', id: item.id }); }
  const newDraft = (): Draft => ({ day: dayOf(Date.now()), weather: '', mood: '', title: '', body: '', share: [] });

  const now = new Date(), today = <>{String(now.getMonth() + 1).padStart(2, '0')}.{String(now.getDate()).padStart(2, '0')}<br />{['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'][now.getDay()]}</>;
  let title = 'Diary', body: React.ReactNode;
  if (view.kind === 'list') {
    const list = entriesOf(view.key).slice().reverse(), mine = view.key === 'me';
    title = mine ? '我的日记' : `${nameOf(view.key)}的日记`;
    body = <>
      {!mine && diary.access[view.key] === 'crack' ? <p className="diary-warn">你是撬开的，退出就又锁上。每翻开一篇，都可能被他发现。</p> : null}
      <div className="diary-tools">
        <span>{list.length} 篇{mine && diary.locks.me ? '　·　密码 ****' : ''}</span>
        {mine ? <button type="button" className="diary-btn" onClick={() => setLock({ key: 'me', mode: 'set', digits: '', note: '设一个新的四位数字密码。之后他们都要重新问你。' })}>改密码</button> : null}
        {mine ? <button type="button" className="diary-btn is-primary" onClick={() => setView({ kind: 'edit', draft: newDraft() })}>写日记</button>
          : <button type="button" className="diary-btn is-primary" disabled={!!busy} onClick={() => void askWrite(view.key)}>{busy === view.key ? '他在写…' : '让他写一篇'}</button>}
      </div>
      {list.map(item => { const date = dateParts(item.day); return <button type="button" className="diary-row" key={item.id} onClick={() => openEntry(item)}>
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
        {mine ? <Clues entry={entry} mine={entriesOf('me')} cracks={diary.traces.filter(item => item.kind === 'crack' && item.at > diary.lockedAt).map(item => item.at)} /> : null}
      </article>
      {mine ? <div className="diary-foot">
        <span>{entry.share?.length ? `给${entry.share.map(nameOf).join('、')}看过` : '只有你看得到'}</span>
        <button type="button" className="diary-btn" onClick={() => setView({ kind: 'edit', draft: { id: entry.id, day: entry.day, weather: entry.weather, mood: entry.mood, title: entry.title, body: entry.body, share: entry.share || [] } })}>编辑</button>
        <button type="button" className="diary-btn is-danger" onClick={() => void drop(entry)}>删除</button>
      </div> : <p className="diary-foot is-quiet">{diary.given[entry.by] ? '他把密码给了你。' : caughtSince(entry.by, visitAt.current) ? '他发现你在看了。' : caughtSince(entry.by, Date.now() - 3 * 86400000) ? '他之前发现过你偷看。' : '他不知道你看过。'}</p>}
    </>;
  } else if (view.kind === 'edit') {
    const draft = view.draft, set = (patch: Partial<Draft>) => setView({ kind: 'edit', draft: { ...draft, ...patch } });
    title = draft.id ? '改日记' : '写日记';
    body = <div className="diary-form">
      <label htmlFor="diaryDay">日期</label>
      <button type="button" id="diaryDay" className="diary-day-field" aria-haspopup="dialog" onClick={() => setPicking(true)}>{dateParts(draft.day).full}
        <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 6h16v14H4z M4 10h16 M8 3v5 M16 3v5" /></svg></button>
      {picking ? <DayPicker value={draft.day} onPick={day => { set({ day }); setPicking(false); }} onClose={() => setPicking(false)} /> : null}
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
      {books.map(key => { const list = entriesOf(key), last = list[list.length - 1]; return <button type="button" className="diary-book" key={key} onClick={() => void openBook(key)}>
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
    {lock ? createPortal(<div className="sp-confirm-overlay chat-me-dialog diary-lock-dialog" onClick={event => { if (event.target === event.currentTarget) setLock(null); }}>
      <div className="sp-confirm" role="dialog" aria-modal="true" aria-label="日记的锁">
        <div className="sp-confirm-bar"><span className="sp-confirm-title">{lock.mode === 'set' ? '设密码' : lock.key === 'me' ? '我的日记' : `${nameOf(lock.key)}的日记`}</span></div>
        <div className="sp-confirm-body diary-lock">
          <span className="diary-lock-pad"><LockIcon /></span>
          {lock.mode === 'open' ? (lock.busy && !diary.locks[lock.key] ? <p className="diary-lock-hint">他在想密码…</p> : <p className="diary-lock-hint">提示：{diary.locks[lock.key]?.hint}</p>) : null}
          <label className="diary-lock-digits">
            {[0, 1, 2, 3].map(index => <i key={index} className={lock.digits.length === index ? 'is-now' : ''}>{lock.digits[index] || ''}</i>)}
            <input ref={digitsRef} inputMode="numeric" autoComplete="off" maxLength={4} aria-label="四位数字密码" value={lock.digits} disabled={lock.busy}
              onChange={event => setLock({ ...lock, digits: event.currentTarget.value.replace(/\D/g, '').slice(0, 4) })} onKeyDown={event => { if (event.key === 'Enter') submitLock(); }} />
          </label>
          <p className={'diary-lock-note' + (/不对|不一样|没撬开|错误/.test(lock.note) ? ' is-error' : '')}>{lock.note || (lock.mode === 'open' ? '猜错的话，他可能会知道。' : ' ')}</p>
          {lock.mode === 'open' ? <div className="diary-lock-more">
            <button type="button" disabled={lock.busy} onClick={() => { askCode(lock.key); setLock(null); showToast('去聊天里问他了'); }}>跟他要密码</button>
            <button type="button" className="is-danger" disabled={lock.busy} onClick={() => void crack(lock.key)}>强行撬开</button>
          </div> : null}
        </div>
        <div className="sp-confirm-actions chat-me-form-actions">
          <PressedButton type="button" className="sp-confirm-btn" onClick={() => setLock(null)}>取消</PressedButton>
          <PressedButton type="button" className="sp-confirm-btn is-primary" disabled={lock.busy || lock.digits.length !== 4} onClick={submitLock}>{lock.mode === 'set' ? (lock.first ? '确定' : '下一步') : '打开'}</PressedButton>
        </div>
      </div>
    </div>, document.body) : null}
  </section>;
}
