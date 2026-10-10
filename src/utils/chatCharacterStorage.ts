import { readCatalogRecords, writeCatalogRecords } from './catalogStorage';
import type { ChatCharacter } from '../types/chatCharacters';
export function readChatCharacters(): ChatCharacter[] { return readCatalogRecords('chatCharacters'); }
export function writeChatCharacters(records: ChatCharacter[]): Promise<boolean> { return writeCatalogRecords('chatCharacters', records); }
export function deleteCharacterArchive(id: unknown): Promise<boolean> {
  return writeCatalogRecords('characterRecords', readCatalogRecords('characterRecords').filter(item => String(item.id) !== String(id)));
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
