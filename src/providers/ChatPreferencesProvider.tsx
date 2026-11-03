import { useChatData } from '../hooks/useChatData';
import { useChatAppearance } from '../hooks/useChatAppearance';
import * as assets from '../utils/chatAppearance';
import { confirmChat } from '../utils/chatConfirm';
import { showToast } from '../utils/toast';
import { useChatNavigation } from './ChatNavigationProvider';
import { useChatFeedback } from '../hooks/useChatFeedback';
import { createContext, useContext, useEffect, useLayoutEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { flushSync } from 'react-dom';
import type { MigratedChatSetting, ChatPreferences, ChatPreferenceBridge, ChatPreferenceServices } from '../types/chatPreferences';
import { getChatPreferenceDefaults, loadChatPreferences, saveChatPreferences, withChatTheme } from '../utils/chatPreferences';
import { CHAT_THEME_KEY, writeChatTheme } from '../utils/chatTheme';
import type { ChatStyleGroup } from '../utils/chatTheme';
import { chatPhotoReady } from '../utils/chatPhoto';
interface PreferenceConnect { services: ChatPreferenceServices; accept(api: ChatPreferenceBridge): void; }
interface PreferenceContext {
  data: ReturnType<typeof useChatData>;
  appearance: ReturnType<typeof useChatAppearance>;
  values: ChatPreferences;
  syncVersion: number;
  restartOpening(): Promise<void>;
  followTheme(group: ChatStyleGroup): Promise<void>;
  shareStyle(): Promise<void>;
  change<K extends MigratedChatSetting>(key: K, value: ChatPreferences[K]): void;
}
const Context = createContext<PreferenceContext | null>(null);
export function ChatPreferencesProvider({ children }: { children: ReactNode }) {
  const feedback = useChatFeedback();
  const navigation = useChatNavigation();
  const [values, setValues] = useState(getChatPreferenceDefaults);
  const [syncVersion, setSyncVersion] = useState(0);
  const current = useRef(values), services = useRef<ChatPreferenceServices | null>(null), ready = useRef(false);
  const appearance = useChatAppearance(services);
  const data = useChatData(services, appearance);
  const publish = (preferences: ChatPreferences, resetDrafts = false) => {
    current.current = { ...preferences, linkedWorldBooks: [...preferences.linkedWorldBooks] };
    const update = () => { setValues(current.current); if (resetDrafts) setSyncVersion(version => version + 1); };
    if (ready.current) flushSync(update);
    else update();
  };
  useEffect(() => { ready.current = true; return () => { ready.current = false; }; }, []);
  useLayoutEffect(() => {
    const connect = (event: Event) => {
      const detail = (event as CustomEvent<PreferenceConnect>).detail;
      services.current = detail.services;
      detail.accept({ applyWallpaper: appearance.applyChatWallpaper, applyFont: appearance.applyChatFont, appearance: appearance.sync, assets: {writeWallpaper:assets.writeChatWallpaper,readWallpaper:assets.readChatWallpaper,deleteWallpaper:assets.deleteChatWallpaper,writeFont:assets.writeChatFont,readFont:assets.readChatFont,deleteFont:assets.deleteChatFont}, defaults: getChatPreferenceDefaults, load: loadChatPreferences,
        save: saveChatPreferences, sync: preferences => publish(preferences, true), feedback, ensureOpening });
    };
    window.addEventListener('qingtuan:chat-preferences-connect', connect);
    return () => { window.removeEventListener('qingtuan:chat-preferences-connect', connect); services.current = null; };
  }, []);
  function change<K extends MigratedChatSetting>(key: K, value: ChatPreferences[K]) {
    const service = services.current;
    if (!service) return;
    const preferences = { ...service.readCurrent(), [key]: value };
    // 字号、壁纸淡化／模糊动过，就是这个聊天自己的了
    const group = key === 'fontSize' ? 'size' : key === 'wallpaperFade' || key === 'wallpaperBlur' ? 'wallpaper' : '';
    if (group && !preferences.styleOwn[group]) {
      preferences.styleOwn = { ...preferences.styleOwn, [group]: true };
      if (group === 'wallpaper') void appearance.claimWallpaper(service.currentKey()).catch(() => {});
    }
    service.adopt(preferences);
    publish({ ...current.current, [key]: value, styleOwn: preferences.styleOwn });
    saveChatPreferences(service.currentKey(), preferences);
    if (key === 'soundFeedback' || key === 'vibrationFeedback') {
      if (value) feedback('send', preferences);
    } else if (key === 'wallpaperFade' || key === 'wallpaperBlur') {
      appearance.applyChatWallpaperEffects();
    } else if (key === 'linkedWorldBooks') {
      // 勾选世界书仅保存，不重新构造其他设置控件。
    } else if (key === 'linkedWorldBooks') {
      // 勾选世界书仅保存，不重新构造其他设置控件。
    } else if (key === 'voiceName') {
      // 音色只是存起来，发语音时才用
    } else if (key === 'openingText' || key === 'voiceTranscribe' || key === 'voiceDirect' || key === 'aiVoice' || key === 'aiPhoto' || key === 'voiceAutoText' || key === 'voiceAutoTranslate') {
      if (key === 'aiVoice' && value && !window.smallphoneVoiceReady?.()) {
        showToast('请先在「语音与生图设置」开启语音并填好服务，家机才发得出语音');
      } else if (key === 'aiVoice' && value && !(window as Window & { smallphoneGetActiveCharacterProfile?: () => { group?: unknown } | null }).smallphoneGetActiveCharacterProfile?.()?.group && !preferences.voiceName) {
        showToast('在下面填好他的音色，家机才发得出语音');
      }
      if (key === 'aiPhoto' && value && !chatPhotoReady()) {
        showToast('请先在「语音与生图设置」开启生图并填好服务，照片才画得出来');
      }
    } else service.apply();
  }
  function ensureOpening(reload: boolean): boolean {
    const service = services.current;
    if (!service) return false;
    if (reload) service.adopt(loadChatPreferences(service.currentKey()));
    if (service.hasMessages()) return false;
    const opening = String(service.readCurrent().openingText || '').trim();
    if (!opening) return false;
    service.appendOpening(opening);
    return true;
  }
  async function restartOpening() {
    const accepted = await confirmChat({ title: '重新开场', message: '目前的聊天记录会被清空，并从设置的对话起点重新开始。', confirmText: '确定', cancelText: '取消', danger: true });
    if (!accepted) return;
    const service = services.current;
    if (!service) return;
    service.clearMessages();
    ensureOpening(false);
    navigation.closeSettings();
    showToast(service.readCurrent().openingText.trim() ? '已重新开场' : '聊天已清空，请先设置对话起点');
  }
  /** 这一块改回跟着全部聊天的预设样式；自己的壁纸图、字体文件删掉。 */
  async function followTheme(group: ChatStyleGroup) {
    const service = services.current;
    if (!service) return;
    const key = service.currentKey(), prefs = service.readCurrent();
    try {
      if (group === 'wallpaper') await assets.deleteChatWallpaper(key);
      if (group === 'font') await assets.deleteChatFont(key);
    } catch { showToast('改回失败，请重试'); return; }
    if (key !== service.currentKey()) return;
    const next = withChatTheme({ ...prefs, styleOwn: { ...prefs.styleOwn, [group]: false } });
    service.adopt(next); saveChatPreferences(key, next); publish(next, true);
    await appearance.refresh();
    showToast('已改回跟着方案');
  }
  /** 把这个聊天现在的样子设成全部聊天的预设，没自己设过的聊天都会跟着变。 */
  async function shareStyle() {
    const service = services.current;
    if (!service) return;
    const ok = await confirmChat({ title: '设成全部聊天的样式', message: '壁纸、字号、字体、气泡会照这个聊天现在的样子，套到所有没有自己设过的聊天。\n存主题方案时，存的也是这一套。', confirmText: '设成预设', cancelText: '取消' });
    if (!ok) return;
    const key = service.currentKey(), prefs = service.readCurrent(), own = prefs.styleOwn;
    try {
      const wallpaper = await assets.readChatWallpaper(own.wallpaper ? key : CHAT_THEME_KEY);
      const font = prefs.fontType === 'file' ? await assets.readChatFont(own.font ? key : CHAT_THEME_KEY) : null;
      if (prefs.fontType === 'file' && !font) throw Error('字体文件读不到，先重新选一次字体');
      await assets.updateChatAssets(CHAT_THEME_KEY, { wallpaper: wallpaper || null, font: font || null });
      writeChatTheme({ wallpaperFade: prefs.wallpaperFade, wallpaperBlur: prefs.wallpaperBlur, fontSize: prefs.fontSize, fontType: prefs.fontType, fontName: prefs.fontName, fontUrl: prefs.fontUrl, bubbleCss: prefs.bubbleCss });
      await assets.updateChatAssets(key, { wallpaper: null, font: null });
    } catch (error) { showToast((error as Error).message || '设定失败，请重试'); return; }
    if (key !== service.currentKey()) return;
    const next = withChatTheme({ ...prefs, styleOwn: { wallpaper: false, size: false, font: false, bubble: false } });
    service.adopt(next); saveChatPreferences(key, next); publish(next, true);
    await appearance.refresh();
    showToast('已设成全部聊天的样式');
  }
  return <Context.Provider value={{ data, appearance, values, syncVersion, change, restartOpening, followTheme, shareStyle }}>{children}</Context.Provider>;
}
export function useChatPreferences() {
  const state = useContext(Context);
  if (!state) throw new Error('ChatPreferencesProvider is required');
  return state;
}
