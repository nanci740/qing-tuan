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
import { getChatPreferenceDefaults, loadChatPreferences, saveChatPreferences } from '../utils/chatPreferences';
interface PreferenceConnect { services: ChatPreferenceServices; accept(api: ChatPreferenceBridge): void; }
interface PreferenceContext {
  data: ReturnType<typeof useChatData>;
  appearance: ReturnType<typeof useChatAppearance>;
  values: ChatPreferences;
  syncVersion: number;
  restartOpening(): Promise<void>;
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
    service.adopt(preferences);
    publish({ ...current.current, [key]: value });
    saveChatPreferences(service.currentKey(), preferences);
    if (key === 'soundFeedback' || key === 'vibrationFeedback') {
      if (value) feedback('send', preferences);
    } else if (key === 'wallpaperFade' || key === 'wallpaperBlur') {
      appearance.applyChatWallpaperEffects();
    } else if (key === 'linkedWorldBooks') {
      // 勾选世界书仅保存，不重新构造其他设置控件。
    } else if (key === 'linkedWorldBooks') {
      // 勾选世界书仅保存，不重新构造其他设置控件。
    } else if (key === 'openingText' || key === 'voiceTranscribe' || key === 'voiceDirect' || key === 'aiVoice' || key === 'voiceAutoText' || key === 'voiceAutoTranslate') {
      if (key === 'aiVoice' && value && !window.smallphoneVoiceReady?.()) {
        showToast('请先在「语音与生图设置」开启语音并填好服务，家机才发得出语音');
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
  return <Context.Provider value={{ data, appearance, values, syncVersion, change, restartOpening }}>{children}</Context.Provider>;
}
export function useChatPreferences() {
  const state = useContext(Context);
  if (!state) throw new Error('ChatPreferencesProvider is required');
  return state;
}
