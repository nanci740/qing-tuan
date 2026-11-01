import { readDb, sizeOf } from './fullBackup';
import { flushKv, kv } from './kvStorage';
import { readChatRecords, saveChatRecords, waitForChatWrites } from './chatRecords';
import { deleteChatPhotos } from './chatPhotoStore';

/** 存储空间：浏览器给了多少、青团机用了多少，按类别分开算；聊天照片、语音可以按时间清掉。 */
export interface StorageUsage { used: number; quota: number; chatText: number; photos: number; voice: number; images: number; music: number; other: number }
export interface AgedItem { at: number; size: number }

const VOICE_SRC = /data:audio\//;
/** 每条语音：发的时间、音档大概多大（照目前的聊天记录算）。 */
export function voiceItems(): AgedItem[] {
  const out: AgedItem[] = [], template = document.createElement('template');
  for (const html of Object.values(readChatRecords().histories)) {
    if (!html.includes('data:audio/')) continue;
    template.innerHTML = html;
    template.content.querySelectorAll<HTMLElement>('.chat-message-row').forEach(row => {
      const src = row.querySelector('audio.chat-voice-audio')?.getAttribute('src') || '';
      if (VOICE_SRC.test(src)) out.push({ at: Number(row.dataset.sentAt) || 0, size: Math.round(src.length * .75) });
    });
  }
  return out;
}
/** 每张聊天照片：编号里带着时间（photo_时间_xxx）。 */
async function photoRows() {
  const read = await readDb('qingtuan_chat_photos_v1');
  return (read?.rows || []).map(row => ({ id: String(row.key), at: Number(String(row.key).split('_')[1]) || 0, size: sizeOf(row.value) }));
}
export async function photoItems(): Promise<AgedItem[]> { return (await photoRows()).map(({ at, size }) => ({ at, size })); }

export async function scanStorage(): Promise<StorageUsage> {
  await flushKv();
  const estimate = await navigator.storage?.estimate?.().catch(() => undefined);
  const sum = async (names: string[]) => { let total = 0; for (const name of names) for (const row of (await readDb(name))?.rows || []) total += sizeOf(row.value); return total; };
  const voice = voiceItems().reduce((total, item) => total + item.size, 0);
  let other = 0;
  for (let index = 0; index < kv.length; index++) { const key = kv.key(index); if (key) other += key.length + (kv.getItem(key)?.length || 0); }
  return {
    used: estimate?.usage || 0, quota: estimate?.quota || 0,
    chatText: Math.max(0, await sum(['qingtuan_chat_records_v1']) - Math.round(voice / .75)), photos: await sum(['qingtuan_chat_photos_v1']), voice,
    images: await sum(['qingtuan_image_assets_v1', 'smallphone_chat_assets_v1']), music: await sum(['smallphone_music_db']),
    other: other + await sum(['QingTuanDB', 'QingTuanSpaceDB', 'smallphone_custom_font_db']),
  };
}

/** 清掉 before 之前的聊天照片（聊天里会变成文字照片）。 */
export async function cleanPhotos(before: number) {
  await deleteChatPhotos((await photoRows()).filter(row => row.at < before).map(row => row.id));
}
/** 清掉 before 之前的语音音档（聊天里会变成文字，内容是转写的那段）。 */
export async function cleanVoice(before: number) {
  const { histories, times } = readChatRecords(), template = document.createElement('template'), next: Record<string, string> = {};
  for (const [key, html] of Object.entries(histories)) {
    if (!html.includes('data:audio/')) { next[key] = html; continue; }
    template.innerHTML = html;
    template.content.querySelectorAll<HTMLElement>('.chat-message-row').forEach(row => {
      const audio = row.querySelector('audio.chat-voice-audio');
      if (audio && VOICE_SRC.test(audio.getAttribute('src') || '') && (Number(row.dataset.sentAt) || 0) < before) audio.removeAttribute('src');
    });
    next[key] = template.innerHTML;
  }
  await saveChatRecords(next, times);
  await waitForChatWrites();
}
