import { readChatCharacters } from './chatCharacterStorage';
import { isGroup } from './chatGroups';
import { contactName, isBlocked, isBlockedBy, isDeleted } from './contactsStorage';
import { ask, personaOf, recentChat } from './friendRequests';
import { readMe } from './meStorage';
import { extractChatAiReply } from './chatReplyParser';
import type { ApiService } from '../types/api';
import { chatPhotoLook, chatPhotoReady, generateChatPhoto } from './chatPhoto';
import { saveChatPhoto } from './chatPhotoStore';
import { addComment, addPost, canSee, findPost, patchPost, queueTask, readMoments, toggleLike, updateMoments } from './momentsStorage';
import type { MomentPic, MomentPost } from './momentsStorage';

const MINUTE = 60000, HOUR = 60 * MINUTE;
/** 多久发一条：偶尔大约一两天一条，常常大约半天一条。 */
const GAP: Record<'some' | 'often', [number, number]> = { some: [20 * HOUR, 40 * HOUR], often: [6 * HOUR, 14 * HOUR] };
const between = (min: number, max: number) => min + Math.random() * (max - min);
const str = (value: unknown, max: number) => String(value ?? '').trim().slice(0, max);
const yes = (value: unknown) => value === true || value === 'true';

/** 朋友圈里有他们的人：私聊的角色，你没拉黑他、他没拉黑你、也没删掉。 */
export function momentPeople() {
  return readChatCharacters().filter(item => !isGroup(item) && !isBlocked(item.archiveId) && !isBlockedBy(item.archiveId) && !isDeleted(item.archiveId));
}
const npc = (key: string) => key.startsWith('npc:') ? key.slice(4) : '';
const nameOf = (key: string) => key === 'me' ? (readMe().name || '我') : npc(key) || contactName(key, String(readChatCharacters().find(item => item.archiveId === key)?.name || ''));
/** 给模型看的名字：你那边用你的名字，他们用本名（备注只有你看得到）。 */
const realName = (key: string) => key === 'me' ? (readMe().name || '对方') : npc(key) || String(readChatCharacters().find(item => item.archiveId === key)?.name || '');
/** 一条动态写成给模型看的样子：谁发的、什么时候、写了什么、照片、赞和评论。
    跟微信一样，不是自己发的就只看得到自己、发的人的赞和评论（还有回复自己的）；角色之间互相不认识。 */
export function describePost(post: MomentPost, viewer: string) {
  const sees = (by: string, to?: string) => viewer === post.by || by === viewer || by === post.by || to === viewer;
  const when = new Date(post.at), stamp = `${when.getMonth() + 1}月${when.getDate()}日 ${String(when.getHours()).padStart(2, '0')}:${String(when.getMinutes()).padStart(2, '0')}`;
  const who = (key: string) => key === viewer ? '你' : realName(key);
  const pics = post.pics.map(pic => `［照片${pic.caption ? '：' + pic.caption : ''}］`).join('');
  const lines = [`${who(post.by)}（${stamp}${post.place ? `，在${post.place}` : ''}）：${post.text || ''}${pics}`];
  const likes = post.likes.filter(key => sees(key));
  if (likes.length) lines.push(`  赞：${likes.map(who).join('、')}`);
  for (const comment of post.comments.filter(one => sees(one.by, one.to))) lines.push(`  ${who(comment.by)}${comment.to ? ` 回复 ${who(comment.to)}` : ''}：${comment.text}${comment.sticker ? `［表情：${comment.sticker.tag}］` : ''}${comment.photo ? '［图片］' : ''}`);
  return lines.join('\n');
}

/** 他发一条：照人设、最近跟你聊的、自己最近发过的，决定发不发、写什么、配不配照片。 */
async function writePost(key: string) {
  const { lines } = personaOf(key), recent = recentChat(key), mine = readMoments().posts.filter(post => post.by === key).slice(-3);
  const look = chatPhotoLook(), now = new Date();
  const data = await ask([...lines,
    recent ? `你们最近的私聊：\n${recent}` : '',
    mine.length ? `你最近发过的朋友圈：\n${mine.map(post => describePost(post, key)).join('\n')}` : '',
    `现在是 ${now.getMonth() + 1}月${now.getDate()}日 ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}。你要不要发一条朋友圈？照你的人设和你现在的生活写，像真人发朋友圈：可以是日常、心情、看到的东西，一两句就好，不要每次都提到对方，不要跟之前发过的重复。`,
    `想配照片就写 photos，一到四张，不配就空着：每张 photo 是画面（${look.style === 'tags' ? '英文标签，逗号分隔' : '英文画面描述'}，画面里有你自己时写出你的外貌），caption 是中文，一句话说照片里是什么。想写在哪里就写 place（地名，简短），不写就空着。`,
    '只输出一个 JSON：{"post":true,"text":"朋友圈文字","photos":[{"photo":"","caption":""}],"place":""} 或 {"post":false}',
  ].filter(Boolean).join('\n'));
  if (!yes(data.post)) return null;
  // 照片：新的写法是 photos 一串；旧的写法（photo、caption 直接放外面）也收
  const raw = Array.isArray(data.photos) ? data.photos as Record<string, unknown>[] : data.photo || data.caption ? [data] : [];
  const draw = chatPhotoReady();
  const pics: MomentPic[] = raw.slice(0, 4).flatMap(one => { const prompt = str(one?.photo, 1500), caption = str(one?.caption, 200) || (prompt ? '一张照片' : '');
    return caption ? [{ caption, ...(prompt ? { prompt } : {}), ...(prompt && draw ? { drawing: 'pending' as const } : {}) }] : []; });
  const text = str(data.text, 500), place = str(data.place, 40);
  if (!text && !pics.length) return null;
  const post = addPost({ by: key, text, at: Date.now(), pics, ...(place ? { place } : {}), see: { mode: 'all', keys: [] } });
  void (async () => { for (const [index, pic] of post.pics.entries()) if (pic.drawing) await drawMomentPhoto(post.id, index); })();
  // 他自己认识的人（同事、朋友、家人……）陆续来看
  queueTask({ kind: 'crowd', post: post.id, who: key, at: Date.now() + between(5, 60) * MINUTE });
  return post;
}
/** 他第 index 张照片的画面描述画成图，存进照片库。 */
export async function drawMomentPhoto(id: string, index: number) {
  const prompt = findPost(id)?.pics[index]?.prompt;
  if (!prompt) return;
  const setPic = (patch: Partial<MomentPic>) => patchPost(id, post => ({ pics: post.pics.map((pic, at) => at === index ? { ...pic, ...patch } : pic) }));
  setPic({ drawing: 'pending' });
  try {
    const post = findPost(id), character = readChatCharacters().find(item => item.archiveId === post?.by);
    const photo = `moment_${id}_${index}`;
    await saveChatPhoto(photo, await generateChatPhoto(prompt, { name: String(character?.name || ''), appearance: String(character?.appearanceText || '') }));
    setPic({ photo, drawing: undefined });
  } catch { setPic({ drawing: 'failed' }); }
}

/** 你发了一条：看得到的人陆续来看（最多五个）。 */
export function afterMyPost(post: MomentPost) {
  const viewers = momentPeople().map(item => item.archiveId).filter(key => canSee(post, key)).sort(() => Math.random() - .5).slice(0, 5);
  viewers.forEach(key => queueTask({ kind: 'react', post: post.id, who: key, at: Date.now() + between(2, 30) * MINUTE }));
}
/** 你留了言：在他的动态底下就是他回你；你回复了谁，就是那个人回你。 */
export function afterMyComment(postId: string, commentId: string, to?: string) {
  const post = findPost(postId), who = to && to !== 'me' ? to : post && post.by !== 'me' ? post.by : '';
  if (who && post && momentPeople().some(item => item.archiveId === (npc(who) ? post.by : who))) queueTask({ kind: 'reply', post: postId, who, comment: commentId, at: Date.now() + between(1, 8) * MINUTE });
}

/** 他看到一条动态：点不点赞、留不留言。 */
async function react(who: string, post: MomentPost) {
  if (post.likes.includes(who) && post.comments.some(comment => comment.by === who)) return;
  const { lines } = personaOf(who), recent = post.by === 'me' ? recentChat(who) : '';
  const data = await ask([...lines,
    recent ? `你们最近的私聊：\n${recent}` : '',
    `你在朋友圈看到这一条：\n${describePost(post, who)}`,
    '照你的人设和你跟发的人的关系，决定要不要点赞、要不要留言（像真人，一句就好；不想留就空着，不是每条都要留）。',
    '只输出一个 JSON：{"like":true,"comment":""}',
  ].filter(Boolean).join('\n'));
  if (yes(data.like)) toggleLike(post.id, who, true);
  const said = str(data.comment, 200);
  if (said) addComment(post.id, { by: who, text: said });
}
/** 他的动态底下：他自己认识的人（模型照他的人设随机生成，常出现的人会沿用）来点赞、留言，他想回就回。 */
async function crowd(who: string, post: MomentPost) {
  const { lines } = personaOf(who), name = realName(who);
  const known = [...new Set(readMoments().posts.filter(one => one.by === who).flatMap(one => [...one.likes, ...one.comments.map(comment => comment.by)]).map(npc).filter(Boolean))].slice(-8);
  const data = await ask([...lines,
    `你刚发了一条朋友圈：
${describePost(post, who)}`,
    known.length ? `你朋友圈里常出现的人：${known.join('、')}（可以沿用，也可以有新的人）。` : '',
    `想一想你现实生活里认识的人（同事、朋友、家人、同学……照你的人设来，不是对方，也不是聊天软件里的其他角色）会不会来点赞、留言：0 到 4 个人，名字要像真人的微信昵称或你平常怎么备注他们；留言像真人，一句就好，不是每个人都留言。你想回谁就在 reply 写你的回复，不想回就空着。`,
    '只输出一个 JSON：{"people":[{"name":"名字","like":true,"comment":"","reply":""}]}',
  ].filter(Boolean).join('\n'));
  for (const person of (Array.isArray(data.people) ? data.people as Record<string, unknown>[] : []).slice(0, 4)) {
    const key = 'npc:' + str(person.name, 12).replace(/[:：]/g, '');
    if (key === 'npc:' || key === 'npc:' + name) continue;
    if (yes(person.like)) toggleLike(post.id, key, true);
    const said = str(person.comment, 200), answer = str(person.reply, 200);
    if (said) addComment(post.id, { by: key, text: said });
    if (said && answer) addComment(post.id, { by: who, text: answer, to: key });
  }
}
/** 有人在评论里跟他说话：他回一句（不想回可以不回）。 */
async function reply(who: string, post: MomentPost, commentId: string) {
  const target = post.comments.find(comment => comment.id === commentId);
  if (!target) return;
  // 认识他的人（npc:名字）回你：照发动态那个人的人设，扮演他认识的那个人
  const author = npc(who) ? personaOf(post.by) : null;
  const lines = author ? [`你现在扮演「${npc(who)}」，是「${realName(post.by)}」现实生活里认识的人（不是${realName(post.by)}本人，跟对方也不熟）。以下是${realName(post.by)}的人设，让你知道他是什么样的人：\n${author.lines[0]}`] : personaOf(who).lines;
  const recent = !author && target.by === 'me' ? recentChat(who) : '';
  const data = await ask([...lines,
    recent ? `你们最近的私聊：\n${recent}` : '',
    `朋友圈里的这一条：\n${describePost(post, who)}`,
    `${target.by === 'me' ? '对方' : realName(target.by)}在评论里对你说：「${target.text}${target.sticker ? `［表情：${target.sticker.tag}］` : ''}${target.photo ? '［图片］' : ''}」。照你的人设回一句（像真人在朋友圈回复，简短）；不想回就空着。`,
    '只输出一个 JSON：{"reply":"回复"}',
  ].filter(Boolean).join('\n'));
  const said = str(data.reply, 200);
  if (said) addComment(post.id, { by: who, text: said, to: target.by });
}

let busy = false;
/** 每分钟看一次：该发朋友圈的人发一条（一次最多一个），排好的点赞、留言、回复做两件。出错就十分钟后再试。 */
export async function momentsTick(now = Date.now()) {
  if (busy) return;
  busy = true;
  try {
    const { rate, next } = readMoments(), people = momentPeople();
    if (rate !== 'off') {
      const [min, max] = GAP[rate], schedule = { ...next };
      for (const item of people) if (!schedule[item.archiveId]) schedule[item.archiveId] = now + between(.2, 1) * between(min, max);
      const due = people.find(item => schedule[item.archiveId] <= now);
      if (due) schedule[due.archiveId] = now + between(min, max);
      updateMoments({ next: schedule });
      if (due) { try { await writePost(due.archiveId); } catch { updateMoments({ next: { ...readMoments().next, [due.archiveId]: Date.now() + 10 * MINUTE } }); } }
    }
    const tasks = readMoments().queue.filter(task => task.at <= now).slice(0, 2);
    if (tasks.length) updateMoments({ queue: readMoments().queue.filter(task => !tasks.some(one => one.id === task.id)) });
    for (const task of tasks) {
      const post = findPost(task.post);
      if (!post || !people.some(item => item.archiveId === (npc(task.who) ? post.by : task.who)) || !npc(task.who) && !canSee(post, task.who)) continue;
      try { if (task.kind === 'react') await react(task.who, post); else if (task.kind === 'crowd') await crowd(task.who, post); else if (task.comment) await reply(task.who, post, task.comment); }
      catch { queueTask({ ...task, at: Date.now() + 10 * MINUTE }); }
    }
  } finally { busy = false; }
}

/** 私聊时接在提示词后面：他最近发的、你最近发的（他看得到的），一周内各三条。 */
export function momentsMemory(chatKey: string) {
  const since = Date.now() - 7 * 24 * HOUR, { posts } = readMoments();
  const his = posts.filter(post => post.by === chatKey && post.at > since).slice(-3), mine = posts.filter(post => post.by === 'me' && post.at > since && canSee(post, chatKey)).slice(-3);
  if (!his.length && !mine.length) return '';
  return `你们最近的朋友圈（你记得这些，可以自然地提起，但不用刻意提，也不要照抄这个格式）：\n${[...his, ...mine].sort((a, b) => a.at - b.at).map(post => describePost(post, chatKey)).join('\n')}`;
}
export { nameOf as momentName };

/** 翻译：人设是外国人的会发别的语言，翻成简体中文给你看。 */
export async function translateMoment(source: string) {
  const service = (window as Window & { smallphoneApi?: ApiService }).smallphoneApi, config = service?.getConfig?.();
  if (!service?.requestChat || !config?.baseUrl || !config?.apiKey) throw new Error('先在设置里接好 API');
  const data = await service.requestChat([{ role: 'system', content: 'Translate the user text into Simplified Chinese (zh-CN). Return only the translation without commentary.' }, { role: 'user', content: source }], { temperature: .2 });
  const translated = String(extractChatAiReply(data) || '').trim();
  if (!translated) throw new Error('接口没有返回译文');
  return translated;
}
