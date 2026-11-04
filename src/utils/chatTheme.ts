import { kv } from './kvStorage';

/** 全部聊天共用的预设样式。聊天资源库里用这个键存它的壁纸。 */
export const CHAT_THEME_KEY = '__theme__';
const KEY = 'qingtuan_chat_theme_v1';

/** 聊天个性化的三块：壁纸（含淡化、模糊）、字号、气泡。字体跟着美化设置的全站字体。 */
export type ChatStyleGroup = 'wallpaper' | 'size' | 'bubble';
export type ChatStyleOwn = Record<ChatStyleGroup, boolean>;
export const CHAT_STYLE_GROUPS: ChatStyleGroup[] = ['wallpaper', 'size', 'bubble'];

export interface ChatThemeStyle {
  wallpaperFade: number; wallpaperBlur: number; fontSize: number; bubbleCss: string;
}
export const CHAT_THEME_DEFAULTS: ChatThemeStyle = { wallpaperFade: 54, wallpaperBlur: 0, fontSize: 10.5, bubbleCss: '' };

export function normalizeChatTheme(raw: unknown): ChatThemeStyle {
  const saved = raw && typeof raw === 'object' ? raw as Record<string, unknown> : {};
  const number = (value: unknown, fallback: number, min: number, max: number) => Number.isFinite(Number(value)) && value !== '' && value !== null ? Math.min(max, Math.max(min, Number(value))) : fallback;
  return {
    wallpaperFade: number(saved.wallpaperFade, CHAT_THEME_DEFAULTS.wallpaperFade, 0, 85),
    wallpaperBlur: number(saved.wallpaperBlur, CHAT_THEME_DEFAULTS.wallpaperBlur, 0, 8),
    fontSize: number(saved.fontSize, CHAT_THEME_DEFAULTS.fontSize, 9, 16),
    bubbleCss: String(saved.bubbleCss || '').slice(0, 5000)
  };
}
export function readChatTheme(): ChatThemeStyle {
  try { return normalizeChatTheme(JSON.parse(kv.getItem(KEY) || 'null')); } catch { return { ...CHAT_THEME_DEFAULTS }; }
}
export function writeChatTheme(style: ChatThemeStyle | null) {
  if (style) kv.setItem(KEY, JSON.stringify(normalizeChatTheme(style))); else kv.removeItem(KEY);
}

/** 每一块是这个聊天自己设的（true），还是跟着全部聊天的预设（false）。 */
export function readStyleOwn(saved: Record<string, unknown>, existed: boolean): ChatStyleOwn {
  const own = saved.styleOwn;
  if (own && typeof own === 'object') {
    const value = own as Record<string, unknown>;
    return { wallpaper: value.wallpaper === true, size: value.size === true, bubble: value.bubble === true };
  }
  // 新的聊天全部跟着预设
  if (!existed) return { wallpaper: false, size: false, bubble: false };
  // 加这个功能以前就有的聊天：设过的那几块算它自己的。有没有自己的壁纸图要读资料库才知道，读到时再补上。
  const fade = Number(saved.wallpaperFade), blur = Number(saved.wallpaperBlur), size = Number(saved.fontSize);
  return {
    wallpaper: Number.isFinite(fade) && fade !== CHAT_THEME_DEFAULTS.wallpaperFade || Number.isFinite(blur) && blur !== CHAT_THEME_DEFAULTS.wallpaperBlur,
    size: Number.isFinite(size) && size !== CHAT_THEME_DEFAULTS.fontSize,
    bubble: String(saved.bubbleCss || '').trim() !== ''
  };
}
