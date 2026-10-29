import { readDiary } from './diaryStorage';
import type { DiaryEntry } from './diaryStorage';
import { canSee, readMoments } from './momentsStorage';
import { describePost } from './momentsEngine';
import { meaningScores } from './memoryVectors';

const WEEK = 7 * 86400000;
const plainDiary = (entry: DiaryEntry) => `${entry.day}《${entry.title || '无题'}》\n${entry.body.replace(/~~(.+?)~~/g, '（划掉了：$1）')}`;

/** 私聊时，照意思想起以前的日记和朋友圈（要设向量模型）：一周前的（一周内的本来就带了），跟这次聊天意思够接近的，
    日记最多两篇（他自己的，和你给他看过的），朋友圈最多两条（他发的，和你发的他看得到的）。算不出来就什么都不加。 */
export async function meaningRecall(chatKey: string, recentText: string) {
  const old = Date.now() - WEEK, { entries } = readDiary(), { posts } = readMoments();
  const diaries = entries.filter(entry => entry.at < old && (entry.by === chatKey || entry.by === 'me' && entry.share?.includes(chatKey))).slice(-60);
  const moments = posts.filter(post => post.at < old && (post.by === chatKey || post.by === 'me' && canSee(post, chatKey))).slice(-60);
  if (!diaries.length && !moments.length) return '';
  const texts = [...diaries.map(entry => `${entry.title}\n${entry.body}`.slice(0, 500)), ...moments.map(post => [post.text, ...post.pics.map(pic => pic.caption || '')].join(' ').slice(0, 500))];
  const scores = await meaningScores(recentText, texts);
  if (!scores) return '';
  const pick = <T,>(list: T[], offset: number) => list.map((item, index) => ({ item, score: scores[offset + index] })).filter(row => row.score >= .45).sort((a, b) => b.score - a.score).slice(0, 2).map(row => row.item);
  const diaryHits = pick(diaries, 0), momentHits = pick(moments, diaries.length);
  return [
    diaryHits.length ? `跟这次聊天有关的旧日记（以前写的，你记得；${diaryHits.some(entry => entry.by === 'me') ? '对方给你看过的那篇对方知道你看过，' : ''}自己写的对方不知道，不要直接念出来）：\n${diaryHits.map(entry => `${entry.by === 'me' ? '对方的日记 ' : '你的日记 '}${plainDiary(entry)}`).join('\n\n')}` : '',
    momentHits.length ? `跟这次聊天有关的旧朋友圈（你记得这些，可以自然地提起）：\n${momentHits.map(post => describePost(post, chatKey)).join('\n')}` : '',
  ].filter(Boolean).join('\n\n');
}
