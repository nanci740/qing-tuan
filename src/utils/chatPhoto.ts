import type { ImageCharacter, ImageConfig } from '../types/voiceImage';
import { loadVoiceImageSettings, normalizeImageCharacters, testImage } from './voiceImageServices';

/** 家机发照片：用「语音与生图设置」的生图服务把角色写的英文画面描述画出来。 */
export function chatPhotoReady() {
  const cfg = loadVoiceImageSettings().image;
  return !!(cfg.enabled && cfg.baseUrl && cfg.apiKey && cfg.model);
}
/** 告诉他照片怎么写：NovelAI 用英文标签；还有生图设置里「你」那一格，让他知道你长什么样。 */
export function chatPhotoLook() {
  const cfg = loadVoiceImageSettings().image;
  return { style: cfg.provider === 'novelai' ? 'tags' as const : 'sentence' as const, user: normalizeImageCharacters(cfg.characters)[0]?.prompt || '' };
}

/** 生图设置里的角色提示：名字跟这个角色一样的那一格拿来用；画面里写到 the user 才带上「你」那一格。 */
function pickCharacters(slots: ImageCharacter[], name: string, prompt: string) {
  const all = normalizeImageCharacters(slots);
  const user = all[0], wantUser = /\bthe user\b/i.test(prompt);
  const mine = all.slice(1).filter(slot => slot.name.trim() && slot.name.trim() === name.trim());
  return [wantUser ? user : { ...user, prompt: '', negativePrompt: '' }, ...mine];
}

/** 画好的图缩到长边 1024、转成 JPEG，存进照片库比较不占空间。 */
async function compress(source: Blob | string): Promise<Blob> {
  let blob: Blob;
  if (typeof source === 'string') {
    try { blob = await (await fetch(source)).blob(); }
    catch { throw new Error('图片下载不下来（接口回传的网址不让读取）'); }
  } else blob = source;
  try {
    const bitmap = await createImageBitmap(blob);
    const scale = Math.min(1, 1024 / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement('canvas');
    canvas.width = Math.round(bitmap.width * scale); canvas.height = Math.round(bitmap.height * scale);
    canvas.getContext('2d')!.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    bitmap.close();
    return await new Promise<Blob>((resolve, reject) => canvas.toBlob(result => result ? resolve(result) : reject(new Error('图片转换失败')), 'image/jpeg', 0.88));
  } catch {
    return blob;
  }
}

/** 回传画好的图片（JPEG Blob）；失败就丢出错误，原因写在 message 里。 */
export async function generateChatPhoto(prompt: string, character: { name: string; appearance: string }) {
  const cfg = loadVoiceImageSettings().image;
  if (!cfg.enabled) throw new Error('生图没有开启');
  const characters = pickCharacters(cfg.characters, character.name, prompt);
  // 生图设置里没有这个角色的提示，就用档案里的外貌，长相才不会每张都不一样。NovelAI 看不懂中文，外貌由他直接写在标签里。
  const appearance = cfg.provider !== 'novelai' && !characters.slice(1).some(slot => slot.prompt.trim()) && character.appearance.trim() ? `\nCharacter appearance (${character.name}): ${character.appearance.trim()}` : '';
  return draw({ ...cfg, prompt: scene(cfg, prompt) + appearance, characters });
}

/** 你自己在聊天里生图：照你写的描述画；勾了「画面里有我」才带上生图设置里「你」那一格的提示。 */
export async function generateUserPhoto(prompt: string, includeMe: boolean) {
  const cfg = loadVoiceImageSettings().image;
  if (!cfg.enabled) throw new Error('生图没有开启');
  const user = normalizeImageCharacters(cfg.characters)[0];
  return draw({ ...cfg, prompt: scene(cfg, prompt), characters: [includeMe ? user : { ...user, prompt: '', negativePrompt: '' }] });
}

/** NovelAI 的标签里那个 the user 只是让程序知道画面里有你，送出去前拿掉。 */
function scene(cfg: ImageConfig, prompt: string) {
  if (cfg.provider !== 'novelai') return prompt.trim();
  return prompt.split(',').map(tag => tag.trim()).filter(tag => tag && !/^the user$/i.test(tag)).join(', ');
}

async function draw(cfg: ImageConfig) {
  const result = await testImage(cfg);
  const image = result && 'blob' in result ? result.blob : result?.src;
  if (!image) throw new Error('接口没有返回图片');
  return compress(image);
}

/** 你从相册选的、拍的照片：一样缩到长边 1024 存成 JPEG。 */
export function preparePickedPhoto(file: Blob) { return compress(file); }
