import type { ChatPreferences } from '../types/chatPreferences';
export const CHAT_PREFERENCES_KEY = 'smallphone_chat_preferences_v1';
export const CHAT_PREFERENCES_BY_CHAT_KEY = 'smallphone_chat_preferences_by_chat_v2';
export function getChatPreferenceDefaults(): ChatPreferences {
        return {
            readReceipt: true,
            timeDisplay: 'group',
            segmented: true,
            segmentDelay: 600,
            customModel: '',
            contextMessages: 30,
            replyLength: 'natural',
            quotePolicy: 'necessary',
            timeAware: true,
            voiceTranscribe: true,
            voiceDirect: false,
            aiVoice: false,
            voiceAutoText: false,
            voiceAutoTranslate: false,
            typingIndicator: true,
            linkedWorldBooks: [],
            openingText: '',
            wallpaperFade: 54,
            wallpaperBlur: 0,
            fontSize: 10.5,
            fontType: 'inherit',
            fontName: '',
            fontUrl: '',
            bubbleCss: '',
            soundFeedback: false,
            vibrationFeedback: false
        };
    }
export function loadChatPreferences(key: string): ChatPreferences {
        const defaults = getChatPreferenceDefaults();
        try {
            const store = JSON.parse(localStorage.getItem(CHAT_PREFERENCES_BY_CHAT_KEY) || '{}') as Record<string, Record<string, unknown>> | null;
            const legacy = JSON.parse(localStorage.getItem(CHAT_PREFERENCES_KEY) || '{}') as Record<string, unknown>;
            const saved = store?.[key] || (key === 'moon' ? legacy : {});
            return {
                readReceipt: saved.readReceipt !== false,
                timeDisplay: ['all','group','hidden'].includes(saved.timeDisplay as string) ? saved.timeDisplay as ChatPreferences['timeDisplay'] : defaults.timeDisplay,
                segmented: saved.segmented !== false,
                segmentDelay: Math.min(2000, Math.max(200, Number(saved.segmentDelay) || defaults.segmentDelay)),
                customModel: String(saved.customModel || '').trim(),
                contextMessages: Math.min(200, Math.max(10, Number(saved.contextMessages) || defaults.contextMessages)),
                replyLength: ['short','natural','detailed'].includes(saved.replyLength as string) ? saved.replyLength as ChatPreferences['replyLength'] : defaults.replyLength,
                quotePolicy: ['never','necessary','free'].includes(saved.quotePolicy as string) ? saved.quotePolicy as ChatPreferences['quotePolicy'] : defaults.quotePolicy,
                timeAware: saved.timeAware !== false,
                voiceTranscribe: saved.voiceTranscribe !== false,
                voiceDirect: saved.voiceDirect === true,
                aiVoice: saved.aiVoice === true,
                voiceAutoText: saved.voiceAutoText === true,
                voiceAutoTranslate: saved.voiceAutoTranslate === true,
                typingIndicator: saved.typingIndicator !== false,
                linkedWorldBooks: Array.isArray(saved.linkedWorldBooks) ? saved.linkedWorldBooks.map(String) : [],
                openingText: String(saved.openingText || '').slice(0, 800),
                wallpaperFade: Math.min(85, Math.max(0, Number.isFinite(Number(saved.wallpaperFade)) ? Number(saved.wallpaperFade) : defaults.wallpaperFade)),
                wallpaperBlur: Math.min(8, Math.max(0, Number.isFinite(Number(saved.wallpaperBlur)) ? Number(saved.wallpaperBlur) : defaults.wallpaperBlur)),
                fontSize: Math.min(16, Math.max(9, Number(saved.fontSize) || defaults.fontSize)),
                fontType: ['inherit','file','url'].includes(saved.fontType as string) ? saved.fontType as ChatPreferences['fontType'] : defaults.fontType,
                fontName: String(saved.fontName || '').slice(0, 160),
                fontUrl: String(saved.fontUrl || '').slice(0, 1800),
                bubbleCss: String(saved.bubbleCss || '').slice(0, 5000),
                soundFeedback: saved.soundFeedback === true,
                vibrationFeedback: saved.vibrationFeedback === true
            };
        } catch (error) {
            return defaults;
        }
    }

/** 原保存失败静默；数组与原始 JSON 值沿用原脚本的非严格赋值行为。 */
export function saveChatPreferences(key: string, preferences: ChatPreferences): void {
  try {
    const store: unknown = JSON.parse(localStorage.getItem(CHAT_PREFERENCES_BY_CHAT_KEY) || '{}');
    if (store === null) return;
    if (typeof store === 'object') (store as Record<string, unknown>)[key] = { ...preferences };
    localStorage.setItem(CHAT_PREFERENCES_BY_CHAT_KEY, JSON.stringify(store));
  } catch { /* 与原版一致：不改变提示或抛出异常。 */ }
}

/** Asset controls require a confirmed metadata write before reporting success. */
export function saveChatPreferencesOrThrow(key: string, preferences: ChatPreferences): void {
  const parsed: unknown = JSON.parse(localStorage.getItem(CHAT_PREFERENCES_BY_CHAT_KEY) || '{}');
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) throw new Error('聊天设置数据无法保存');
  localStorage.setItem(CHAT_PREFERENCES_BY_CHAT_KEY, JSON.stringify({...parsed, [key]: {...preferences}}));
}
