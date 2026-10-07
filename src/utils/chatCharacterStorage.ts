import { decodePhotoRecords, encodePhotoRecords } from './imageAssets';
import type { ChatCharacter } from '../types/chatCharacters';
const CHAT_CHARACTERS_KEY = 'smallphone_chat_characters_v1';
export function readChatCharacters(): ChatCharacter[] {
  try {
    const saved: unknown = JSON.parse(localStorage.getItem(CHAT_CHARACTERS_KEY) || '[]');
    return Array.isArray(saved) ? decodePhotoRecords(saved as ChatCharacter[]) : [];
  } catch {
    return [];
  }
}
export function writeChatCharacters(records: ChatCharacter[]) {
  try {
    const payload = JSON.stringify(encodePhotoRecords(records));
    localStorage.setItem(CHAT_CHARACTERS_KEY, payload);
    return localStorage.getItem(CHAT_CHARACTERS_KEY) === payload;
  } catch {
    return false;
  }
}
export function deleteCharacterArchive(id: unknown) {
  try {
    const key = 'smallphone_dossier_records_v1';
    const saved: unknown = JSON.parse(localStorage.getItem(key) || '[]');
    if (!Array.isArray(saved)) return;
    localStorage.setItem(key, JSON.stringify(saved.filter(item => String(item?.id) !== String(id))));
  } catch {/* 原聊天删除失败时仍继续清理聊天清单。 */}
}
/** 聊天头像保持原最长边 320px、WebP/JPEG .78；压缩后更大时保留原资料。 */
export function shrinkChatCharacterAvatar(dataUrl: string): Promise<string> {
  if (typeof dataUrl !== 'string' || !dataUrl.startsWith('data:image/')) return Promise.resolve(dataUrl);
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      try {
        const scale = Math.min(1, 320 / Math.max(img.naturalWidth, img.naturalHeight));
        const canvas = document.createElement('canvas');
        canvas.width = Math.max(1, Math.round(img.naturalWidth * scale));
        canvas.height = Math.max(1, Math.round(img.naturalHeight * scale));
        canvas.getContext('2d')!.drawImage(img, 0, 0, canvas.width, canvas.height);
        let reduced = canvas.toDataURL('image/webp', .78);
        if (!reduced.startsWith('data:image/webp')) reduced = canvas.toDataURL('image/jpeg', .78);
        resolve(reduced.length < dataUrl.length ? reduced : dataUrl);
      } catch (error) {
        reject(error);
      }
    };
    img.onerror = () => reject(new Error('图片读取失败'));
    img.src = dataUrl;
  });
}
