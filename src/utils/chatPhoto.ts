import type { ImageCharacter, ImageConfig } from '../types/voiceImage';
import type { ApiService } from '../types/api';
import { extractChatAiReply } from './chatReplyParser';
import { loadVoiceImageSettings, normalizeImageCharacters, testImage } from './voiceImageServices';

/** 家机发照片：用「语音与生图设置」的生图服务把角色写的英文画面描述画出来。 */
export function chatPhotoReady() {
  const cfg = loadVoiceImageSettings().image;
  return !!(cfg.enabled && cfg.baseUrl && cfg.apiKey && cfg.model);
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
  // 生图设置里没有这个角色的提示，就用档案里的外貌，长相才不会每张都不一样。
  const appearance = !characters.slice(1).some(slot => slot.prompt.trim()) && character.appearance.trim() ? `\nCharacter appearance (${character.name}): ${character.appearance.trim()}` : '';
  return draw({ ...cfg, prompt: prompt.trim() + appearance, characters });
}

/** 你自己在聊天里生图：照你写的描述画；勾了「画面里有我」才带上生图设置里「你」那一格的提示。 */
export async function generateUserPhoto(prompt: string, includeMe: boolean) {
  const cfg = loadVoiceImageSettings().image;
  if (!cfg.enabled) throw new Error('生图没有开启');
  const user = normalizeImageCharacters(cfg.characters)[0];
  return draw({ ...cfg, prompt: prompt.trim(), characters: [includeMe ? user : { ...user, prompt: '', negativePrompt: '' }] });
}

async function draw(cfg: ImageConfig) {
  const result = await testImage(cfg);
  const image = result && 'blob' in result ? result.blob : result?.src;
  if (!image) throw new Error('接口没有返回图片');
  return compress(image);
}

/** 你从相册选的、拍的照片：一样缩到长边 1024 存成 JPEG。 */
export function preparePickedPhoto(file: Blob) { return compress(file); }

/** 你写几个词，先请聊天模型扩写成完整的英文画面描述，再拿去画。character 是现在聊天的对象，画面里有他时照着外貌写。 */
export async function expandPhotoPrompt(text: string, character: { name: string; appearance: string } | null) {
  const api = (window as Window & { smallphoneApi?: ApiService }).smallphoneApi;
  const config = api?.getConfig?.();
  if (!api?.requestChat || !config?.baseUrl || !config?.apiKey) throw new Error('先在 API 设置填好聊天模型，才能补充描写');
  const who = character?.name ? `现在的聊天对象是「${character.name}」${character.appearance.trim() ? `，外貌：${character.appearance.trim()}` : ''}；画面里有他（她）时要写出外貌特征，不要只写名字。` : '';
  const data = await api.requestChat([
    { role: 'system', content: `你帮忙写生图提示词。用户会给几个关键词或一句很短的画面描述，请扩写成给生图模型看的英文画面描述：40 到 80 个英文单词，一段话，只写看得见的东西（画面主体、动作和表情、穿着、地点和环境、光线、镜头与构图），照用户的意思补上合理的细节，用户指定的内容不要改掉，不要写心理、声音、对话或剧情。画面里有用户本人时写 "the user"。${who}只输出描述本身，不要加引号、标题、JSON 或任何说明。` },
    { role: 'user', content: text.trim() },
  ], { feature: 'chat' });
  const result = extractChatAiReply(data).replace(/^```[a-z]*\s*|```$/gi, '').replace(/^["“]|["”]$/g, '').trim();
  if (!result) throw new Error('补充描写没有回传内容');
  return result;
}
