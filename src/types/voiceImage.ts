export interface ImageCharacter { role: string; name: string; prompt: string; negativePrompt: string }
export interface VoiceConfig { transcriptionProvider?: string; transcriptionBaseUrl?: string; transcriptionApiKey?: string; transcriptionModel?: string; enabled: boolean; provider: string; baseUrl: string; apiKey: string; model: string; voice: string; format: string; speed: number }
export interface ImageConfig { enabled: boolean; provider: string; baseUrl: string; apiKey: string; model: string; size: string; quality: string; prompt: string; artistTags: string; negativePrompt: string; characters: ImageCharacter[] }
export interface VoiceImageSettings { voice: VoiceConfig; image: ImageConfig }
