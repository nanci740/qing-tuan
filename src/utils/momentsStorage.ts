import { kv } from './kvStorage';

/** 朋友圈（key 是聊天的 archiveId，你自己是 'me'）：
    posts 一条条动态（新的在后面）：photo 是照片库里的编号（你上传的、他发的照片画好的都放照片库），caption 是照片说明，
      prompt 是他写的画面描述（还没画、画失败可以再画）；see 谁看得到（all 所有人、only 只给这些人、except 不给这些人）；
      likes 谁点了赞，comments 评论（to 是回复谁），pinned 你的置顶；
    rate 他们多久发一条（off 关、some 偶尔、often 常常），next 每个人下一次发的时间；
    queue 之后要做的事：react 看到一条动态（点赞、评论），reply 有人在评论里跟他说话，到了 at 才做；
    cover 封面（照片库编号），seen 你上一次看朋友圈的时间（之后有新的，底栏 Discover 亮红点）。 */
export type MomentRate = 'off' | 'some' | 'often';
export interface MomentComment { id: string; by: string; text: string; at: number; to?: string }
export interface MomentPost {
  id: string; by: string; text: string; at: number;
  photo?: string; caption?: string; prompt?: string; drawing?: 'pending' | 'failed';
  see: { mode: 'all' | 'only' | 'except'; keys: string[] };
  likes: string[]; comments: MomentComment[]; pinned?: boolean;
}
export interface MomentTask { id: string; kind: 'react' | 'reply'; post: string; who: string; at: number; comment?: string }
interface Moments { posts: MomentPost[]; rate: MomentRate; next: Record<string, number>; queue: MomentTask[]; cover: string; seen: number }
const KEY = 'qingtuan_moments_v1', EVENT = 'qingtuan:moments-changed';
let cache: Moments | null = null;
const text = (value: unknown, max: number) => String(value ?? '').trim().slice(0, max);
const list = (value: unknown) => Array.isArray(value) ? value as Record<string, unknown>[] : [];
function clean(value: unknown): Moments {
  const row = value && typeof value === 'object' ? value as Record<string, unknown> : {};
  const posts = list(row.posts).flatMap((item): MomentPost[] => {
    if (!item?.id || !item.by || !text(item.text, 1000) && !item.photo && !item.caption) return [];
    const see = item.see as Record<string, unknown> | undefined, mode = see?.mode === 'only' || see?.mode === 'except' ? see.mode : 'all';
    return [{ id: String(item.id), by: String(item.by), text: text(item.text, 1000), at: Number(item.at) || 0,
      ...(item.photo ? { photo: String(item.photo) } : {}), ...(item.caption ? { caption: text(item.caption, 200) } : {}), ...(item.prompt ? { prompt: text(item.prompt, 1500) } : {}),
      ...(item.drawing === 'pending' || item.drawing === 'failed' ? { drawing: item.drawing } : {}),
      see: { mode, keys: (Array.isArray(see?.keys) ? see.keys : []).map(String) },
      likes: [...new Set((Array.isArray(item.likes) ? item.likes : []).map(String))],
      comments: list(item.comments).flatMap((one): MomentComment[] => one?.id && one.by && text(one.text, 300) ? [{ id: String(one.id), by: String(one.by), text: text(one.text, 300), at: Number(one.at) || 0, ...(one.to ? { to: String(one.to) } : {}) }] : []).slice(-60),
      ...(item.pinned ? { pinned: true } : {}) }];
  }).slice(-200);
  const next = row.next && typeof row.next === 'object' ? Object.fromEntries(Object.entries(row.next as Record<string, unknown>).map(([key, at]) => [key, Number(at) || 0])) : {};
  const queue = list(row.queue).flatMap((item): MomentTask[] => item?.id && item.post && item.who && (item.kind === 'react' || item.kind === 'reply')
    ? [{ id: String(item.id), kind: item.kind, post: String(item.post), who: String(item.who), at: Number(item.at) || 0, ...(item.comment ? { comment: String(item.comment) } : {}) }] : []).slice(-100);
  return { posts, rate: row.rate === 'off' || row.rate === 'often' ? row.rate : 'some', next, queue, cover: text(row.cover, 100), seen: Number(row.seen) || 0 };
}
export function readMoments(): Moments {
  if (!cache) { try { cache = clean(JSON.parse(kv.getItem(KEY) || '{}')); } catch { cache = clean({}); } }
  return cache;
}
function write(next: Moments) { cache = clean(next); kv.setItem(KEY, JSON.stringify(cache)); window.dispatchEvent(new CustomEvent(EVENT)); }
export function updateMoments(patch: Partial<Moments>) { write({ ...readMoments(), ...patch }); }
export function subscribeMoments(listener: () => void) {
  window.addEventListener(EVENT, listener);
  return () => window.removeEventListener(EVENT, listener);
}
export const momentId = (prefix: string) => prefix + '_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);

export function findPost(id: string) { return readMoments().posts.find(post => post.id === id) || null; }
export function addPost(post: Omit<MomentPost, 'id' | 'likes' | 'comments'> & { id?: string }) {
  const entry: MomentPost = { ...post, id: post.id || momentId('mo'), likes: [], comments: [] };
  updateMoments({ posts: [...readMoments().posts, entry] });
  return entry;
}
export function patchPost(id: string, patch: Partial<MomentPost> | ((post: MomentPost) => Partial<MomentPost>)) {
  updateMoments({ posts: readMoments().posts.map(post => post.id === id ? { ...post, ...(typeof patch === 'function' ? patch(post) : patch) } : post) });
}
export function removePost(id: string) {
  const { posts, queue } = readMoments();
  updateMoments({ posts: posts.filter(post => post.id !== id), queue: queue.filter(task => task.post !== id) });
}
export function toggleLike(id: string, who: string, on?: boolean) {
  patchPost(id, post => { const liked = post.likes.includes(who), want = on ?? !liked; return { likes: want ? (liked ? post.likes : [...post.likes, who]) : post.likes.filter(one => one !== who) }; });
}
export function addComment(id: string, comment: Omit<MomentComment, 'id' | 'at'>) {
  const entry: MomentComment = { ...comment, id: momentId('mc'), at: Date.now() };
  patchPost(id, post => ({ comments: [...post.comments, entry] }));
  return entry;
}
export function removeComment(id: string, commentId: string) { patchPost(id, post => ({ comments: post.comments.filter(one => one.id !== commentId) })); }
export function queueTask(task: Omit<MomentTask, 'id'>) { updateMoments({ queue: [...readMoments().queue, { ...task, id: momentId('mt') }] }); }

/** who 看不看得到这条：你自己的照「谁可以看」，他发的大家都看得到。 */
export function canSee(post: MomentPost, who: string) {
  if (post.by === who || who === 'me' || post.by !== 'me') return true;
  return post.see.mode === 'all' || (post.see.mode === 'only' ? post.see.keys.includes(who) : !post.see.keys.includes(who));
}
/** 底栏 Discover 的红点：你上次看过之后，别人发了新的。 */
export function hasNewMoments() { const { posts, seen } = readMoments(); return posts.some(post => post.by !== 'me' && post.at > seen); }
