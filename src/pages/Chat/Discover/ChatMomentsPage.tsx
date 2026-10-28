import './ChatMomentsPage.css';
import { useEffect, useLayoutEffect, useRef, useState, useSyncExternalStore } from 'react';
import { createPortal } from 'react-dom';
import { PressedButton } from '../../../components/shared/PressedButton';
import { useNativeRefs } from '../../../providers/NativeRefsProvider';
import { useProfileAvatar } from '../../../providers/ProfileAvatarProvider';
import { readChatCharacters } from '../../../utils/chatCharacterStorage';
import { chatPhotoUrl, saveChatPhoto } from '../../../utils/chatPhotoStore';
import { confirmChat } from '../../../utils/chatConfirm';
import { DEFAULT_AVATAR } from '../../../utils/defaultAvatar';
import { prepareImage } from '../../../utils/imageAssets';
import { readMe, subscribeMe } from '../../../utils/meStorage';
import { showToast } from '../../../utils/toast';
import { addComment, addPost, patchComment, hasNewMoments, unreadNotes, momentId, patchPost, readMoments, removeComment, removePost, subscribeMoments, toggleLike, updateMoments } from '../../../utils/momentsStorage';
import type { MomentComment, MomentPic, MomentPost } from '../../../utils/momentsStorage';
import type { MessageSticker } from '../../../types/chatMessages';
import { pickSticker } from '../../../components/shared/ChatStickerPicker';
import { stickerImageUrl } from '../../../utils/stickerStorage';
import { afterMyComment, afterMyPost, drawMomentPhoto, translateMoment, momentName, momentPeople, momentsTick } from '../../../utils/momentsEngine';

type Bridge = Window & { smallphoneOpenChatApp?: () => void };
interface Draft { text: string; photos: string[]; place: string; mode: 'all' | 'only' | 'except'; keys: string[] }
const errorText = (error: unknown) => String((error as Error)?.message || error).slice(0, 60);
/** 几分钟前、几小时前、昨天、几月几号。 */
function ago(at: number) {
  const gap = Date.now() - at, date = new Date(at), time = `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
  if (gap < 60000) return '刚刚';
  if (gap < 3600000) return `${Math.floor(gap / 60000)} 分钟前`;
  const days = Math.round((new Date().setHours(0, 0, 0, 0) - new Date(at).setHours(0, 0, 0, 0)) / 86400000);
  if (days <= 0) return `${Math.floor(gap / 3600000)} 小时前`;
  return days === 1 ? `昨天 ${time}` : `${date.getMonth() + 1}月${date.getDate()}日 ${time}`;
}

/** 聊天 App 底下的「Discover」：整页就是朋友圈——封面（你的名字、头像、签名，右上角的 ＋ 是发动态），你的置顶，下面一条条动态（赞、评论、回复）。 */
export function ChatMomentsPage() {
  const [open, setOpen] = useState(false), [host, setHost] = useState<HTMLElement | null>(null), refs = useNativeRefs(), avatar = useProfileAvatar();
  const moments = useSyncExternalStore(subscribeMoments, readMoments), me = useSyncExternalStore(subscribeMe, readMe);
  const [menu, setMenu] = useState(''), [typing, setTyping] = useState<{ post: string; to?: string; text: string; sticker?: MessageSticker; image?: string } | null>(null);
  const [notesOpen, setNotesOpen] = useState(false);
  const [draft, setDraft] = useState<Draft | null>(null), [viewing, setViewing] = useState(''), [busy, setBusy] = useState(false);
  const [pop, setPop] = useState<{ post: MomentPost; comment: MomentComment | null; x: number; y: number } | null>(null), commentFile = useRef<HTMLInputElement>(null);
  const cover = useRef<HTMLInputElement>(null), photo = useRef<HTMLInputElement>(null), list = useRef<HTMLDivElement>(null), ticking = useRef(false);
  useLayoutEffect(() => {
    const onTab = (event: Event) => setOpen((event as CustomEvent<string>).detail === 'Discover');
    window.addEventListener('qingtuan:chat-tab', onTab);
    return () => window.removeEventListener('qingtuan:chat-tab', onTab);
  }, []);
  // 他们发朋友圈、点赞、留言、回复：开机过一下先看一次，之后每分钟看一次
  useEffect(() => {
    const check = () => { if (ticking.current) return; ticking.current = true; momentsTick().catch(() => {}).finally(() => { ticking.current = false; }); };
    const first = setTimeout(check, 10000), timer = setInterval(check, 60000);
    return () => { clearTimeout(first); clearInterval(timer); };
  }, []);
  // 打开：跟通讯录一样把列表中间那几块藏起来，朋友圈放在底下分页的上面
  useLayoutEffect(() => {
    const view = refs?.get('chatListView'), nav = view?.querySelector('.chat-subnav');
    if (!view || !nav || !open) { setHost(null); return; }
    view.setAttribute('data-chat-tab', 'discover');
    const box = document.createElement('div');
    box.className = 'chat-moments-page';
    view.insertBefore(box, nav);
    setHost(box);
    return () => { box.remove(); if (view.getAttribute('data-chat-tab') === 'discover') view.removeAttribute('data-chat-tab'); setMenu(''); setTyping(null); setNotesOpen(false); };
  }, [open]);
  // 看着朋友圈就算看过了；打开新消息就算新消息看过了。
  // 底栏 Discover：有没看过的新消息写几条（白字红底），没有的话，没在看、别人又发了新的就亮红点
  useEffect(() => {
    if (open && moments.posts.some(post => post.by !== 'me' && post.at > moments.seen)) updateMoments({ seen: Date.now() });
    if (open && notesOpen && moments.notes.some(item => item.at > moments.notesSeen)) updateMoments({ notesSeen: Date.now() });
    const item = refs?.get('chatListView')?.querySelector('.chat-subnav-item[aria-label="Discover"]');
    if (!item) return;
    const unread = unreadNotes();
    if (unread) item.setAttribute('data-badge', String(unread)); else item.removeAttribute('data-badge');
    item.toggleAttribute('data-dot', !unread && !open && hasNewMoments());
  }, [open, notesOpen, moments, refs]);
  useEffect(() => {
    if (!menu) return;
    const close = () => setMenu('');
    const timer = setTimeout(() => document.addEventListener('pointerdown', close, { once: true }), 0);
    return () => { clearTimeout(timer); document.removeEventListener('pointerdown', close); };
  }, [menu]);

  const people = momentPeople(), shownKeys = new Set(['me', ...people.map(item => item.archiveId)]);
  const posts = moments.posts.filter(post => shownKeys.has(post.by)).slice().reverse(), pinned = posts.filter(post => post.by === 'me' && post.pinned);
  const photoOf = (key: string) => key === 'me' ? avatar.api.sidebarAvatar() : readChatCharacters().find(item => item.archiveId === key)?.photoUrl || DEFAULT_AVATAR;

  async function changeCover(file?: File) {
    if (!file) return;
    try { const id = 'moments_cover'; await saveChatPhoto(id, await prepareImage(file, 1280, .84)); updateMoments({ cover: id + '#' + Date.now().toString(36) }); }
    catch (error) { showToast(errorText(error)); }
  }
  // 发动态的照片：一次可以选好几张，最多九张
  async function pickPhotos(files: File[]) {
    if (!draft || !files.length) return;
    try {
      const room = 9 - draft.photos.length, picked = await Promise.all(files.slice(0, room).map(file => prepareImage(file, 1280, .84)));
      if (files.length > room) showToast('最多九张');
      setDraft(current => current && { ...current, photos: [...current.photos, ...picked].slice(0, 9) });
    } catch (error) { showToast(errorText(error)); }
  }
  async function publish() {
    if (!draft || busy) return;
    if (!draft.text.trim() && !draft.photos.length) { showToast('写点什么，或放一张照片'); return; }
    if (draft.mode !== 'all' && !draft.keys.length) { showToast(draft.mode === 'only' ? '选几个人看' : '选不给谁看'); return; }
    setBusy(true);
    try {
      const id = momentId('mo'), pics = draft.photos.map((_, index) => ({ photo: `moment_${id}_${index}` }));
      await Promise.all(draft.photos.map((image, index) => saveChatPhoto(pics[index].photo, image)));
      const place = draft.place.trim().slice(0, 40);
      const post = addPost({ id, by: 'me', text: draft.text.trim().slice(0, 1000), at: Date.now(), pics, ...(place ? { place } : {}), see: { mode: draft.mode, keys: draft.keys } });
      afterMyPost(post); setDraft(null); list.current?.scrollTo({ top: 0 });
    } catch (error) { showToast(errorText(error)); } finally { setBusy(false); }
  }
  /** 送出评论：打的字，加上先放着的那张表情或图片（选了表情或图片不会马上送，按发送才一起送）。 */
  async function sendComment() {
    if (!typing || !typing.text.trim() && !typing.sticker && !typing.image) return;
    try {
      const photo = typing.image ? momentId('mcp') : '';
      if (photo) await saveChatPhoto(photo, typing.image!);
      const comment = addComment(typing.post, { by: 'me', text: typing.text.trim().slice(0, 300), ...(typing.to ? { to: typing.to } : {}), ...(typing.sticker ? { sticker: typing.sticker } : {}), ...(photo ? { photo } : {}) });
      afterMyComment(typing.post, comment.id, typing.to); setTyping(null);
    } catch (error) { showToast(errorText(error)); }
  }
  async function commentPhoto(file?: File) {
    if (!file) return;
    try { const image = await prepareImage(file, 1080, .84); setTyping(current => current && { ...current, image, sticker: undefined }); } catch (error) { showToast(errorText(error)); }
  }
  // 长按评论：手指旁边跳出复制、翻译、回复、删除（自己的评论，或在你自己的动态底下的都能删）；长按动态的字是复制、翻译
  const press = useRef<number | null>(null);
  function holdComment(event: React.PointerEvent, post: MomentPost, comment: MomentComment | null) {
    const { clientX: x, clientY: y } = event;
    press.current = window.setTimeout(() => { press.current = -1; setPop({ post, comment, x: Math.min(x, innerWidth - 110), y: Math.min(y, innerHeight - 130) }); }, 480);
  }
  function release() { if (press.current && press.current > 0) clearTimeout(press.current); }
  function tapComment(post: MomentPost, comment: MomentComment) {
    if (press.current === -1) { press.current = null; return; }
    press.current = null;
    if (comment.by !== 'me') setTyping({ post: post.id, to: comment.by, text: '' });
  }
  async function dropPost(post: MomentPost) {
    if (await confirmChat({ title: '删除这条朋友圈？', message: '赞和评论会一起删掉。', confirmText: '删除', danger: true })) removePost(post.id);
  }
  function dropComment(post: MomentPost, id: string) { removeComment(post.id, id); }
  async function translate(post: MomentPost, comment: MomentComment | null) {
    const source = comment ? comment.text : post.text;
    if (!source) return;
    showToast('翻译中…');
    try { const translation = await translateMoment(source); if (comment) patchComment(post.id, comment.id, { translation }); else patchPost(post.id, { translation }); }
    catch (error) { showToast(errorText(error)); }
  }

  const card = (post: MomentPost) => {
    const mine = post.by === 'me', liked = post.likes.includes('me');
    // 一张照片：照原本比例放大一点；好几张：三张一排的方格，刚好四张排成两排两张；没画出来的照片是一格文字卡
    const pic = (item: MomentPic, index: number, single: boolean) => {
      const url = item.photo ? chatPhotoUrl(item.photo) : '';
      if (url) return <button type="button" key={index} className={'chat-moment-photo' + (single ? '' : ' is-cell')} onClick={() => setViewing(url)}><img alt={item.caption || '照片'} src={url} /></button>;
      return <div key={index} className={'chat-moment-photo is-text' + (single ? '' : ' is-cell')}>
        <span>［照片］{item.caption}</span>
        {item.drawing === 'pending' ? <small>画照片中…</small> : item.drawing === 'failed' ? <button type="button" onClick={() => void drawMomentPhoto(post.id, index)}>没画出来，再画一次</button> : null}
      </div>;
    };
    return <article className="chat-moment" key={post.id} data-moment={post.id}>
      <img className="chat-moment-avatar" alt="" src={photoOf(post.by)} />
      <div className="chat-moment-body">
        <b className="chat-moment-name">{momentName(post.by)}</b>
        {post.text ? <p className="chat-moment-text" onPointerDown={event => holdComment(event, post, null)} onPointerUp={release} onPointerLeave={release} onPointerCancel={release}
          onContextMenu={event => event.preventDefault()}>{post.text}</p> : null}
        {post.translation ? <p className="chat-moment-trans">[译] {post.translation}</p> : null}
        {post.pics.length === 1 ? pic(post.pics[0], 0, true)
          : post.pics.length ? <div className={'chat-moment-grid' + (post.pics.length === 4 ? ' is-four' : '')}>{post.pics.map((item, index) => pic(item, index, false))}</div> : null}
        {post.place ? <span className="chat-moment-place"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20 10c0 6-8 12-8 12S4 16 4 10a8 8 0 0 1 16 0Z" /><circle cx="12" cy="10" r="3" /></svg>{post.place}</span> : null}
        <div className="chat-moment-meta">
          <span>{ago(post.at)}</span>
          {mine && post.see.mode !== 'all' ? <span title={post.see.mode === 'only' ? '部分可见' : '不给谁看'}>{post.see.mode === 'only' ? '部分可见' : '部分不可见'}</span> : null}
          {mine ? <PressedButton type="button" className="chat-moment-del" onClick={() => void dropPost(post)}>删除</PressedButton> : null}
          <span className="chat-moment-tools">
            {menu === post.id ? <span className="chat-moment-menu" onPointerDown={event => event.stopPropagation()}>
              <PressedButton type="button" onClick={() => { toggleLike(post.id, 'me'); setMenu(''); }}>{liked ? '取消' : '♡ 赞'}</PressedButton>
              <PressedButton type="button" onClick={() => { setTyping({ post: post.id, text: '' }); setMenu(''); }}>评论</PressedButton>
              {mine ? <PressedButton type="button" onClick={() => { patchPost(post.id, { pinned: !post.pinned }); setMenu(''); }}>{post.pinned ? '取消置顶' : '置顶'}</PressedButton> : null}
            </span> : null}
            <PressedButton type="button" className="chat-moment-act" aria-label="点赞、评论" onClick={() => setMenu(menu === post.id ? '' : post.id)}><i /><i /></PressedButton>
          </span>
        </div>
        {post.likes.length || post.comments.length ? <div className="chat-moment-box">
          {post.likes.length ? <div className="chat-moment-likes">♡ {post.likes.map(momentName).join('，')}</div> : null}
          {post.comments.map(comment => <button type="button" className="chat-moment-comment" key={comment.id}
            onPointerDown={event => holdComment(event, post, comment)} onPointerUp={release} onPointerLeave={release} onPointerCancel={release}
            onContextMenu={event => event.preventDefault()} onClick={() => tapComment(post, comment)}>
            <i>{momentName(comment.by)}</i>{comment.to ? <> 回复 <i>{momentName(comment.to)}</i></> : null}：{comment.text}
            {comment.translation ? <span className="chat-moment-trans">[译] {comment.translation}</span> : null}
            {comment.sticker ? <img className="is-sticker" alt={comment.sticker.tag} src={stickerImageUrl(comment.sticker.image)} /> : null}
            {comment.photo ? <img alt="图片" src={chatPhotoUrl(comment.photo)} onClick={event => { event.stopPropagation(); setViewing(chatPhotoUrl(comment.photo!)); }} /> : null}
          </button>)}
        </div> : null}
      </div>
    </article>;
  };

  const coverUrl = moments.cover ? chatPhotoUrl(moments.cover.split('#')[0]) : '';
  return <>
    {open && host ? createPortal(<section className="chat-moments" aria-label="朋友圈">
      <div className="chat-moments-card" ref={list}>
        {notesOpen ? <>
          <div className="chat-moments-notes-top">
            <PressedButton type="button" className="chat-moments-back" onClick={() => setNotesOpen(false)}>‹ 新消息</PressedButton>
            {moments.notes.length ? <PressedButton type="button" className="chat-moments-clear" onClick={() => updateMoments({ notes: [] })}>清空</PressedButton> : null}
          </div>
          {moments.notes.slice().reverse().map(item => {
            const post = moments.posts.find(one => one.id === item.post), comment = post?.comments.find(one => one.id === item.comment);
            if (!post || item.kind === 'comment' && !comment) return null;
            const thumb = post.pics[0]?.photo ? chatPhotoUrl(post.pics[0].photo) : '';
            return <button type="button" className="chat-moments-note" key={item.id} onClick={() => { setNotesOpen(false); setTimeout(() => list.current?.querySelector(`[data-moment="${post.id}"]`)?.scrollIntoView({ block: 'start' }), 0); }}>
              <img className="chat-moment-avatar" alt="" src={photoOf(item.by)} />
              <span className="chat-moments-note-body"><b>{momentName(item.by)}</b>
                <span>{item.kind === 'like' ? '♡' : <>{comment!.to === 'me' && post.by !== 'me' ? '回复你：' : ''}{comment!.text}{comment!.sticker ? '［表情］' : ''}{comment!.photo ? '［图片］' : ''}</>}</span>
                <small>{ago(item.at)}</small></span>
              <span className="chat-moments-note-thumb">{thumb ? <img alt="" src={thumb} /> : post.text}</span>
            </button>;
          })}
          {!moments.notes.length ? <p className="chat-moments-empty">没有新消息。</p> : null}
        </> : <>
        <div className="chat-moments-cover">
          <button type="button" className="chat-moments-cover-pic" aria-label="换封面" onClick={() => cover.current?.click()}>{coverUrl ? <img alt="" src={coverUrl} /> : <small>MOMENTS · 点一下换封面</small>}</button>
          <PressedButton type="button" className="chat-moments-write" aria-label="发动态" onClick={() => setDraft({ text: '', photos: [], place: '', mode: 'all', keys: [] })}>＋</PressedButton>
          <span className="chat-moments-me"><b>{me.name || '我'}</b><img alt="" src={avatar.api.sidebarAvatar()} /></span>
          <input ref={cover} type="file" accept="image/*" hidden onChange={event => { void changeCover(event.currentTarget.files?.[0]); event.currentTarget.value = ''; }} />
        </div>
        <p className="chat-moments-sign">{me.signature}</p>
        {unreadNotes() ? (() => { const last = moments.notes[moments.notes.length - 1]; return <PressedButton type="button" className="chat-moments-pill" onClick={() => setNotesOpen(true)}>
          <img alt="" src={photoOf(last.by)} />{unreadNotes()} 条新消息</PressedButton>; })() : null}
        {pinned.length ? <div className="chat-moments-pinned">
          <span>置顶</span>
          <div>{pinned.slice(0, 3).map(post => <button type="button" key={post.id} onClick={() => list.current?.querySelector(`[data-moment="${post.id}"]`)?.scrollIntoView({ block: 'start', behavior: 'smooth' })}>
            {post.pics[0]?.photo ? <img alt="" src={chatPhotoUrl(post.pics[0].photo)} /> : <span>{post.text}</span>}
          </button>)}</div>
        </div> : null}
        {posts.map(card)}
        {!posts.length ? <p className="chat-moments-empty">还没有动态。点右上角的 ＋ 发第一条；他们也会照「我 → 设置」里的频率发。</p> : null}
        </>}
      </div>
      {typing ? <div className="chat-moments-reply">
        {typing.sticker || typing.image ? <div className="chat-moments-attach"><span>
          <img className={typing.sticker ? 'is-sticker' : ''} alt="" src={typing.sticker ? stickerImageUrl(typing.sticker.image) : typing.image} />
          <button type="button" aria-label="拿掉" onClick={() => setTyping({ ...typing, sticker: undefined, image: undefined })} />
        </span></div> : null}
        <input autoFocus maxLength={300} placeholder={typing.to ? `回复 ${momentName(typing.to)}` : '评论'} value={typing.text}
          onChange={event => setTyping({ ...typing, text: event.currentTarget.value })} onKeyDown={event => { if (event.key === 'Enter' && !event.nativeEvent.isComposing) void sendComment(); if (event.key === 'Escape') setTyping(null); }} />
        <PressedButton type="button" className="chat-moments-reply-tool" aria-label="表情" onClick={() => pickSticker(sticker => setTyping(current => current && { ...current, sticker, image: undefined }))}><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><path d="M8 14s1.5 2 4 2 4-2 4-2" /><line x1="9" x2="9.01" y1="9" y2="9" /><line x1="15" x2="15.01" y1="9" y2="9" /></svg></PressedButton>
        <PressedButton type="button" className="chat-moments-reply-tool" aria-label="图片" onClick={() => commentFile.current?.click()}><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="18" height="18" x="3" y="3" rx="2" ry="2" /><circle cx="9" cy="9" r="2" /><path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21" /></svg></PressedButton>
        <input ref={commentFile} type="file" accept="image/*" hidden onChange={event => { void commentPhoto(event.currentTarget.files?.[0]); event.currentTarget.value = ''; }} />
        <PressedButton type="button" onClick={() => setTyping(null)}>取消</PressedButton>
        <PressedButton type="button" className="is-primary" onClick={() => void sendComment()}>发送</PressedButton>
      </div> : null}
    </section>, host) : null}

    {pop ? createPortal(<div className="sp-confirm-overlay chat-moments-pop-mask" onPointerDown={event => { if (event.target === event.currentTarget) setPop(null); }}>
      <div className="chat-moments-pop" role="menu" style={{ left: pop.x, top: pop.y }}>
        {(pop.comment ? pop.comment.text : pop.post.text) ? <PressedButton type="button" role="menuitem" onClick={() => { void navigator.clipboard?.writeText(pop.comment ? pop.comment.text : pop.post.text).then(() => showToast('复制好了'), () => showToast('复制不了')); setPop(null); }}>复制</PressedButton> : null}
        {(pop.comment ? pop.comment.by : pop.post.by) !== 'me' && (pop.comment ? pop.comment.text : pop.post.text) ? <PressedButton type="button" role="menuitem" onClick={() => { const { post, comment } = pop; setPop(null);
          if (comment?.translation) patchComment(post.id, comment.id, { translation: undefined }); else if (!comment && post.translation) patchPost(post.id, { translation: undefined }); else void translate(post, comment); }}>
          {(pop.comment ? pop.comment.translation : pop.post.translation) ? '收起翻译' : '翻译'}</PressedButton> : null}
        {pop.comment && pop.comment.by !== 'me' ? <PressedButton type="button" role="menuitem" onClick={() => { setTyping({ post: pop.post.id, to: pop.comment!.by, text: '' }); setPop(null); }}>回复</PressedButton> : null}
        {pop.comment && (pop.comment.by === 'me' || pop.post.by === 'me') ? <PressedButton type="button" role="menuitem" className="is-danger" onClick={() => { dropComment(pop.post, pop.comment!.id); setPop(null); }}>删除</PressedButton> : null}
      </div>
    </div>, document.body) : null}

    {viewing ? createPortal(<div className="sp-confirm-overlay chat-moments-viewer" onClick={() => setViewing('')}><img alt="" src={viewing} /></div>, document.body) : null}

    {draft ? createPortal(<div className="sp-confirm-overlay chat-me-dialog" onClick={event => { if (event.target === event.currentTarget && !busy) setDraft(null); }}>
      <div className="sp-confirm" role="dialog" aria-modal="true" aria-label="发动态">
        <div className="sp-confirm-bar"><span className="sp-confirm-title">发动态</span></div>
        <div className="sp-confirm-body chat-me-form chat-moments-form">
          <textarea rows={4} maxLength={1000} placeholder="这一刻的想法…" autoFocus value={draft.text} onChange={event => setDraft({ ...draft, text: event.currentTarget.value })} />
          <div className="chat-moments-addphoto">
            {draft.photos.map((image, index) => <span key={index}><img alt="" src={image} />
              <button type="button" aria-label="拿掉这张" onClick={() => setDraft({ ...draft, photos: draft.photos.filter((_, at) => at !== index) })} /></span>)}
            {draft.photos.length < 9 ? <button type="button" className="chat-moments-plus" onClick={() => photo.current?.click()}>＋<small>照片</small></button> : null}
            <input ref={photo} type="file" accept="image/*" multiple hidden onChange={event => { void pickPhotos(Array.from(event.currentTarget.files || [])); event.currentTarget.value = ''; }} />
          </div>
          <label htmlFor="momentPlace">所在位置<small>可以不写</small></label>
          <input id="momentPlace" maxLength={40} placeholder="例如：厦门 · 曾厝垵" value={draft.place} onChange={event => setDraft({ ...draft, place: event.currentTarget.value })} />
          <label>谁可以看<small>拉黑和删掉的人本来就看不到</small></label>
          <span className="chat-moments-choices" role="radiogroup">
            {([['all', '所有人'], ['only', '选人看'], ['except', '不给谁看']] as const).map(([mode, label]) => <button type="button" role="radio" key={mode} aria-checked={draft.mode === mode} onClick={() => setDraft({ ...draft, mode })}>{label}</button>)}
          </span>
          {draft.mode !== 'all' ? <div className="chat-group-pick">
            {people.map(item => { const on = draft.keys.includes(item.archiveId); return <button type="button" key={item.archiveId} role="checkbox" aria-checked={on}
              onClick={() => setDraft({ ...draft, keys: on ? draft.keys.filter(key => key !== item.archiveId) : [...draft.keys, item.archiveId] })}>
              <span className="chat-group-box" aria-hidden="true" /><img alt="" src={item.photoUrl || DEFAULT_AVATAR} />{momentName(item.archiveId)}
            </button>; })}
          </div> : null}
        </div>
        <div className="sp-confirm-actions chat-me-form-actions">
          <PressedButton type="button" className="sp-confirm-btn" disabled={busy} onClick={() => setDraft(null)}>取消</PressedButton>
          <PressedButton type="button" className="sp-confirm-btn is-primary" disabled={busy} onClick={() => void publish()}>{busy ? '发表中…' : '发表'}</PressedButton>
        </div>
      </div>
    </div>, document.body) : null}
  </>;
}
