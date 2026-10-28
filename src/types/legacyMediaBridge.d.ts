import type { VoiceConfig, ImageConfig } from './voiceImage';
declare global { interface Window { smallphoneVoiceReady?: () => boolean; smallphoneSynthesizeSpeech?: (text:string, voice?:string) => Promise<Blob|null>; smallphoneMediaServices?: {getVoiceConfig:()=>VoiceConfig;getImageConfig:()=>ImageConfig;isVoiceEnabled:()=>boolean;isImageEnabled:()=>boolean}; } }
