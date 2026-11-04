import { kv } from './kvStorage';
import { readChatWallpaper, updateChatAssets } from './chatAppearance';

const OLD_KEY = 'qingtuan_chat_theme_v1', OLD_ASSET = '__theme__', PREFS = 'smallphone_chat_preferences_by_chat_v2';
type Saved = Record<string, unknown> & { styleOwn?: Record<string, unknown> };

/** 「全部聊天的样式」拿掉了：原本跟着它的聊天，把它的样子写回自己身上，再把它清掉。聊天设置只管自己这一个聊天。 */
export async function flattenChatTheme() {
  let theme: Record<string, unknown> | null = null, store: Record<string, Saved> = {};
  try { theme = JSON.parse(kv.getItem(OLD_KEY) || 'null'); } catch { theme = null; }
  try { store = JSON.parse(kv.getItem(PREFS) || '{}') || {}; } catch { return; }
  const wallpaper = await readChatWallpaper(OLD_ASSET).catch(() => null);
  let changed = false;
  for (const [key, saved] of Object.entries(store)) {
    const own = saved && typeof saved === 'object' ? saved.styleOwn : undefined;
    if (!own || typeof own !== 'object') continue;
    if (theme) {
      if (own.wallpaper !== true) { saved.wallpaperFade = theme.wallpaperFade ?? 54; saved.wallpaperBlur = theme.wallpaperBlur ?? 0; }
      if (own.size !== true) saved.fontSize = theme.fontSize ?? 10.5;
      if (own.bubble !== true) saved.bubbleCss = theme.bubbleCss || '';
    }
    if (own.wallpaper !== true && wallpaper && !await readChatWallpaper(key).catch(() => null)) await updateChatAssets(key, { wallpaper });
    delete saved.styleOwn; changed = true;
  }
  if (changed) kv.setItem(PREFS, JSON.stringify(store));
  if (wallpaper) await updateChatAssets(OLD_ASSET, { wallpaper: null });
  kv.removeItem(OLD_KEY);
}
