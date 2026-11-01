import { CHARMS, charmName, readCharms, seeCharmChange } from './charmStorage';

const DAY = 86400000, COOLDOWN = 3 * DAY, NOTICE_CHANCE = .35;
const day = (at: number) => { const d = new Date(at); return `${d.getMonth() + 1}月${d.getDate()}日`; };
const ago = (at: number) => { const m = Math.max(1, Math.round((Date.now() - at) / 60000)); return m < 60 ? `${m} 分钟前` : m < 1440 ? `${Math.round(m / 60)} 小时前` : `${Math.round(m / 1440)} 天前`; };

/** 私聊：他送过你的挂件现在在哪；三天内没送过才告诉他可以送；你摘下或挂回他送的，有机率被他注意到（注意到一次就不再提）。 */
export function charmPrompt(chatKey: string) {
  const mine = readCharms().filter(item => item.from === chatKey), lines: string[] = [];
  if (mine.length) lines.push('你送过对方的手机挂件（挂在对方小手机的挂链上）：' + mine.slice(-8).map(item =>
    `${charmName(item.kind)}（${day(item.at)}送的，${item.hung ? '现在挂着' : item.hungAt ? '对方摘下来收着了' : '对方还没挂上'}）`).join('、') + '。');
  const last = mine.at(-1)?.at || 0;
  if (Date.now() - last > COOLDOWN) lines.push('你可以送对方一个手机挂件，会出现在聊天里，对方点了就挂到小手机上：在某一条加上 "charm":{"kind":"cherry","note":"附的一句话"}，kind 只能从这些挑：' +
    Object.entries(CHARMS).map(([kind, item]) => `${kind}（${item.name}）`).join('、') + '。' +
    '有理由才送，例如对方累了、难过、过节、纪念日、你出门看到觉得适合对方；送不送、送什么、怎么说照你的人设，大多数时候不送，送过的不要再送一样的。挂件单独一条，text 可以留空，想说的话放在其他条。');
  const pending = mine.filter(item => item.change && !item.change.seen).at(-1);
  if (pending?.change && Math.random() < NOTICE_CHANCE) {
    seeCharmChange(pending.id);
    lines.push(pending.change.kind === 'off'
      ? `你注意到对方把你送的「${charmName(pending.kind)}」从手机挂链上摘下来了（大约${ago(pending.change.at)}）。要不要提、怎么提照你的人设和你们的关系（可能在意、可能装作没看到、也可能直接问）。`
      : `你注意到对方把你送的「${charmName(pending.kind)}」又挂回手机上了（大约${ago(pending.change.at)}）。要不要提、怎么提照你的人设。`);
  }
  return lines.join('\n');
}
