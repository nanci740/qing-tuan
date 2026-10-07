import type { VoiceConfig, ImageConfig } from '../types/voiceImage';
export function applyVoiceProviderPreset(current: VoiceConfig, provider: string, force = false) {
const next={...current,provider};
const meta={voicePlaceholder:'',modelPlaceholder:'',fetchDisabled:false,fetchLabel:'获取可用语音模型'};
  const currentBase = next.baseUrl.trim();
  const currentModel = next.model.trim();
  const currentVoice = next.voice.trim();
  if (provider === 'grok') {
    if (force || !currentBase || currentBase === 'https://api.openai.com/v1' || currentBase === 'https://api-uw.minimax.io' || currentBase === 'https://generativelanguage.googleapis.com/v1beta') next.baseUrl = 'https://api.x.ai';
    if (force || !currentModel || currentModel === 'gpt-4o-mini-tts' || /^speech-/.test(currentModel) || /^gemini-/i.test(currentModel)) next.model = 'grok-tts';
    if (force || !currentVoice || currentVoice === 'alloy' || currentVoice === 'male-qn-qingse' || currentVoice === 'Kore') next.voice = 'eve';
    meta.voicePlaceholder = 'eve';
    meta.modelPlaceholder = 'grok-tts';
    meta.fetchDisabled = true;
    meta.fetchLabel = 'Grok TTS 不需要选择模型';
    
  } else if (provider === 'moss') {
    meta.fetchDisabled = false;
    meta.fetchLabel = '获取可用语音模型';
    
    if (force || !currentBase || currentBase === 'https://api.openai.com/v1' || currentBase === 'https://api.x.ai' || currentBase === 'https://api-uw.minimax.io' || currentBase === 'https://generativelanguage.googleapis.com/v1beta') next.baseUrl = 'https://api.mosi.cn/v1';
    if (force || !currentModel || currentModel === 'gpt-4o-mini-tts' || currentModel === 'grok-tts' || /^speech-/.test(currentModel) || /^gemini-/i.test(currentModel)) next.model = 'moss-tts';
    if (force || !currentVoice || currentVoice === 'alloy' || currentVoice === 'eve' || currentVoice === 'male-qn-qingse') next.voice = '';
    meta.voicePlaceholder = '输入 Mossland Voice ID';
    meta.modelPlaceholder = 'moss-tts';
  } else if (provider === 'gemini') {
    meta.fetchDisabled = false;
    meta.fetchLabel = '获取可用语音模型';
    
    if (force || !currentBase || /^https:\/\/(api\.openai\.com\/v1|api\.x\.ai|api\.mosi\.cn\/v1|api-uw\.minimax\.io)$/.test(currentBase)) next.baseUrl = 'https://generativelanguage.googleapis.com/v1beta';
    if (force || !currentModel || !/^gemini-/i.test(currentModel)) next.model = 'gemini-2.5-flash-preview-tts';
    if (force || !currentVoice || ['alloy', 'eve', 'male-qn-qingse'].includes(currentVoice)) next.voice = 'Kore';
    meta.voicePlaceholder = 'Kore';
    meta.modelPlaceholder = 'gemini-2.5-flash-preview-tts';
  } else if (provider === 'minimax') {
    meta.fetchDisabled = false;
    meta.fetchLabel = '获取可用语音模型';
    
    if (force || !currentBase || currentBase === 'https://api.openai.com/v1' || currentBase === 'https://api.x.ai' || currentBase === 'https://api.mosi.cn/v1' || currentBase === 'https://generativelanguage.googleapis.com/v1beta') next.baseUrl = 'https://api-uw.minimax.io';
    if (force || !currentModel || currentModel === 'gpt-4o-mini-tts' || currentModel === 'grok-tts' || currentModel === 'moss-tts' || /^gemini-/i.test(currentModel)) next.model = 'speech-2.8-turbo';
    if (force || !currentVoice || currentVoice === 'alloy' || currentVoice === 'eve' || currentVoice === 'Kore') next.voice = 'male-qn-qingse';
    meta.voicePlaceholder = '输入 MiniMax Voice ID';
    meta.modelPlaceholder = 'speech-2.8-turbo';
  } else {
    meta.fetchDisabled = false;
    meta.fetchLabel = '获取可用语音模型';
    
    if (force || !currentBase || currentBase === 'https://api-uw.minimax.io' || currentBase === 'https://api.x.ai' || currentBase === 'https://api.mosi.cn/v1' || currentBase === 'https://generativelanguage.googleapis.com/v1beta') next.baseUrl = 'https://api.openai.com/v1';
    if (force || !currentModel || currentModel === 'speech-2.8-turbo' || currentModel === 'speech-2.8-hd' || currentModel === 'speech-2.5-turbo' || currentModel === 'speech-2.5-hd' || currentModel === 'grok-tts' || currentModel === 'moss-tts' || /^gemini-/i.test(currentModel)) next.model = 'gpt-4o-mini-tts';
    if (force || !currentVoice || currentVoice === 'male-qn-qingse' || currentVoice === 'eve' || currentVoice === 'Kore') next.voice = 'alloy';
    meta.voicePlaceholder = 'alloy';
    meta.modelPlaceholder = 'gpt-4o-mini-tts';
  }
return {next,meta};
}
export function applyImageProviderPreset(current: ImageConfig, provider: string, force = false) {
const next={...current,provider};
const meta={voicePlaceholder:'',modelPlaceholder:'',fetchDisabled:false,fetchLabel:'获取可用语音模型'};
  const currentBase = next.baseUrl.trim();
  const currentModel = next.model.trim();
  if (provider === 'grok') {
    if (force || !currentBase || currentBase === 'https://api.openai.com/v1' || currentBase === 'https://generativelanguage.googleapis.com/v1beta') next.baseUrl = 'https://api.x.ai';
    if (force || !currentModel || currentModel === 'gpt-image-2' || /^gemini-.*-image$/i.test(currentModel)) next.model = 'grok-imagine-image-2.0';
    meta.modelPlaceholder = 'grok-imagine-image-2.0';
  } else if (provider === 'gemini') {
    if (force || !currentBase || currentBase === 'https://api.openai.com/v1' || currentBase === 'https://api.x.ai') next.baseUrl = 'https://generativelanguage.googleapis.com/v1beta';
    if (force || !currentModel || currentModel === 'gpt-image-2' || /^grok-imagine/i.test(currentModel)) next.model = 'gemini-3.1-flash-image';
    meta.modelPlaceholder = 'gemini-3.1-flash-image';
  } else if (provider === 'novelai') {
    if (force || !currentBase || currentBase === 'https://api.openai.com/v1' || currentBase === 'https://api.x.ai' || currentBase === 'https://generativelanguage.googleapis.com/v1beta') next.baseUrl = 'https://image.novelai.net';
    if (force || !currentModel || currentModel === 'gpt-image-2' || /^grok-imagine/i.test(currentModel) || /^gemini-.*-image$/i.test(currentModel)) next.model = 'nai-diffusion-5-full';
    meta.modelPlaceholder = 'nai-diffusion-5-full';
  } else {
    if (force || !currentBase || currentBase === 'https://generativelanguage.googleapis.com/v1beta' || currentBase === 'https://api.x.ai' || currentBase === 'https://image.novelai.net') next.baseUrl = 'https://api.openai.com/v1';
    if (force || !currentModel || /^gemini-.*-image$/i.test(currentModel) || /^grok-imagine/i.test(currentModel) || /^nai-diffusion/i.test(currentModel)) next.model = 'gpt-image-2';
    meta.modelPlaceholder = 'gpt-image-2';
  }
return {next,meta};
}
