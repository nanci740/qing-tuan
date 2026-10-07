export interface ChatPreferences {
  readReceipt: boolean; timeDisplay: 'all' | 'group' | 'hidden';
  segmented: boolean; segmentDelay: number; customModel: string; contextMessages: number;
  replyLength: 'short' | 'natural' | 'detailed'; quotePolicy: 'never' | 'necessary' | 'free';
  timeAware: boolean; voiceTranscribe: boolean; voiceDirect: boolean; aiVoice: boolean;
  voiceAutoText: boolean; voiceAutoTranslate: boolean; typingIndicator: boolean;
  linkedWorldBooks: string[]; openingText: string; wallpaperFade: number; wallpaperBlur: number;
  fontSize: number; fontType: 'inherit' | 'file' | 'url'; fontName: string; fontUrl: string;
  bubbleCss: string; soundFeedback: boolean; vibrationFeedback: boolean;
}
export type BasicChatSetting = 'readReceipt' | 'timeDisplay' | 'typingIndicator' | 'soundFeedback' | 'vibrationFeedback';
export type ReplyChatSetting = 'segmented' | 'segmentDelay' | 'customModel' | 'contextMessages' | 'replyLength' | 'quotePolicy' | 'timeAware';
export type VoiceChatSetting = 'voiceTranscribe' | 'voiceDirect' | 'aiVoice' | 'voiceAutoText' | 'voiceAutoTranslate';
export type MigratedChatSetting = BasicChatSetting | ReplyChatSetting | VoiceChatSetting | 'openingText' | 'fontSize' | 'wallpaperFade' | 'wallpaperBlur' | 'linkedWorldBooks';
export type BooleanChatSetting = { [K in MigratedChatSetting]: ChatPreferences[K] extends boolean ? K : never }[MigratedChatSetting];
export type BasicChatSettings = Pick<ChatPreferences, BasicChatSetting>;
export interface ChatPreferenceServices {
  currentKey(): string;
  readCurrent(): ChatPreferences;
  adopt(preferences: ChatPreferences): void;
  apply(): void;
  hasMessages(): boolean;
  clearMessages(): void;
  appendOpening(text: string): void;
  chatName(): string;
  readMessages(): string;
  replaceMessages(html: string): void;
  finishImport(): void;
}
export interface ChatPreferenceBridge {
  appearance(): void;
  applyWallpaper(): Promise<void>;
  applyFont(force?: boolean): Promise<boolean>;
  assets: {writeWallpaper(key:string,file:Blob):Promise<void>;readWallpaper(key:string):Promise<Blob|null>;deleteWallpaper(key:string):Promise<void>;writeFont(key:string,file:Blob):Promise<void>;readFont(key:string):Promise<Blob|null>;deleteFont(key:string):Promise<void>};
  defaults(): ChatPreferences;
  load(key: string): ChatPreferences;
  save(key: string, preferences: ChatPreferences): void;
  sync(preferences: ChatPreferences): void;
  ensureOpening(reload: boolean): boolean;
  feedback(kind: 'send' | 'receive', preferences: ChatPreferences): void;
}
