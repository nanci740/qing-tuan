export interface ChatPreferences {
  readReceipt: boolean; timeDisplay: 'all' | 'group' | 'hidden';
  segmented: boolean; segmentDelay: number; customModel: string; contextMessages: number;
  replyLength: 'short' | 'natural' | 'detailed'; quotePolicy: 'never' | 'necessary' | 'free';
  /** 这个聊天另选的预设；空字符串就用预设 App 里的默认预设。 */
  presetId: string;
  timeAware: boolean; voiceTranscribe: boolean; voiceDirect: boolean; aiVoice: boolean;
  /** 他发语音用的音色（MiniMax 的 Voice ID、OpenAI 的 alloy 这类）；空的就发不了语音。 */
  voiceName: string;
  /** 家机可以发照片（用「语音与生图设置」的生图服务）。 */
  aiPhoto: boolean;
  /** 聊到见面互动时多常发你们两个人的画面：rare 少、normal 适中、often 多。 */
  photoInteraction: 'rare' | 'normal' | 'often';
  voiceAutoText: boolean; voiceAutoTranslate: boolean; typingIndicator: boolean;
  linkedWorldBooks: string[];
  /** 世界书每次最多带多少字；0 表示不限。 */
  worldBookLimit: number;
  openingText: string; wallpaperFade: number; wallpaperBlur: number;
  fontSize: number; fontType: 'inherit' | 'file' | 'url'; fontName: string; fontUrl: string;
  bubbleCss: string; soundFeedback: boolean; vibrationFeedback: boolean;
  /** 拍一拍：开着才拍得了、他也才会拍你；patSuffix 是你拍他时接在他名字后面的字（例如「的脑袋」）。他拍你的后缀他自己决定。 */
  pat: boolean; patSuffix: string;
  /** 消息旁边显示头像。 */
  avatars: boolean;
}
export type BasicChatSetting = 'readReceipt' | 'timeDisplay' | 'typingIndicator' | 'soundFeedback' | 'vibrationFeedback' | 'pat' | 'patSuffix' | 'avatars';
export type ReplyChatSetting = 'segmented' | 'segmentDelay' | 'customModel' | 'contextMessages' | 'replyLength' | 'quotePolicy' | 'presetId' | 'timeAware' | 'photoInteraction';
export type VoiceChatSetting = 'voiceTranscribe' | 'voiceDirect' | 'aiVoice' | 'voiceName' | 'aiPhoto' | 'voiceAutoText' | 'voiceAutoTranslate';
export type MigratedChatSetting = BasicChatSetting | ReplyChatSetting | VoiceChatSetting | 'openingText' | 'fontSize' | 'wallpaperFade' | 'wallpaperBlur' | 'linkedWorldBooks' | 'worldBookLimit';
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
  appearance(): Promise<void>;
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
