import { readMe, readMeAvatar, saveMeAvatar, writeMe } from './meStorage';
import type { MeStore } from './meStorage';
import { loadStickerImages, readStickers, writeStickers } from './stickerStorage';
import type { StickerGroup } from './stickerStorage';
import { readWallet, replaceWallet } from './walletStorage';
import { resolveImage, storeImage } from './imageAssets';

/** 「我」的资料单独备份：人设和资料、头像、表情（上传的图一起包进去）、钱包。不含聊天记录和收藏。 */
const APP = 'qingtuan-me';
export async function exportMeData() {
  const groups = readStickers();
  try { await loadStickerImages(groups); } catch { /* 读不到的那几张就不包图 */ }
  const stickers = groups.map(group => ({ ...group, items: group.items.map(item => {
    if (!item.image.startsWith('qt-image:')) return item;
    let data = ''; try { data = resolveImage(item.image); } catch { /* 读不到 */ }
    return data.startsWith('data:') ? { ...item, image: data } : item;
  }) }));
  const data = { app: APP, version: 1, at: Date.now(), me: readMe(), avatar: readMeAvatar(), stickers, wallet: readWallet() };
  return new Blob([JSON.stringify(data)], { type: 'application/json' });
}
/** 读备份档换掉现在的「我」：不是这个格式就丢错。表情里包着的图先存回图片库。 */
export async function importMeData(file: File) {
  let data: Record<string, unknown>;
  try { data = JSON.parse(await file.text()); } catch { throw Error('这个文件读不懂'); }
  if (!data || data.app !== APP) throw Error('这不是「我」的备份文件');
  if (data.me && typeof data.me === 'object') writeMe(data.me as MeStore);
  if (typeof data.avatar === 'string' && data.avatar.startsWith('data:')) await saveMeAvatar(data.avatar);
  if (Array.isArray(data.stickers)) {
    const groups = await Promise.all((data.stickers as StickerGroup[]).map(async group => ({ ...group, items: await Promise.all((Array.isArray(group?.items) ? group.items : []).map(async item =>
      typeof item?.image === 'string' && item.image.startsWith('data:') ? { ...item, image: await storeImage(item.image) } : item)) })));
    writeStickers(groups);
  }
  if (data.wallet && typeof data.wallet === 'object') replaceWallet(data.wallet);
}
