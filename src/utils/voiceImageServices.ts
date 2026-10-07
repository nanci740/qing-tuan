import type { ImageCharacter, VoiceConfig, ImageConfig, VoiceImageSettings } from '../types/voiceImage';
import type { ChoiceOption } from '../providers/ChoiceProvider';
export const choiceMaps: Record<string,ChoiceOption[]> = {
  voiceProvider: [{
    value: 'openai-compatible',
    label: 'OpenAI Compatible'
  }, {
    value: 'grok',
    label: 'Grok / xAI'
  }, {
    value: 'moss',
    label: 'Moss / Mossland'
  }, {
    value: 'minimax',
    label: 'MiniMax'
  }, {
    value: 'gemini',
    label: 'Gemini'
  }, {
    value: 'custom-compatible',
    label: '自定义兼容接口'
  }],
  imageProvider: [{
    value: 'openai-compatible',
    label: 'OpenAI Compatible'
  }, {
    value: 'grok',
    label: 'Grok / xAI'
  }, {
    value: 'gemini',
    label: 'Gemini'
  }, {
    value: 'novelai',
    label: 'NovelAI / NAI'
  }, {
    value: 'custom-compatible',
    label: '自定义兼容接口'
  }],
  format: [{
    value: 'mp3',
    label: 'MP3'
  }, {
    value: 'wav',
    label: 'WAV'
  }, {
    value: 'aac',
    label: 'AAC'
  }, {
    value: 'flac',
    label: 'FLAC'
  }],
  size: [{
    value: '1024x1024',
    label: '1024 × 1024'
  }, {
    value: '1536x1024',
    label: '1536 × 1024'
  }, {
    value: '1024x1536',
    label: '1024 × 1536'
  }],
  quality: [{
    value: 'auto',
    label: 'Auto'
  }, {
    value: 'low',
    label: 'Low'
  }, {
    value: 'medium',
    label: 'Medium'
  }, {
    value: 'high',
    label: 'High'
  }]
};
export const VOICE_MODEL_PRESETS: Record<string,string[]> = {
  'openai-compatible': ['gpt-4o-mini-tts', 'tts-1', 'tts-1-hd'],
  'custom-compatible': ['gpt-4o-mini-tts', 'tts-1', 'tts-1-hd'],
  'grok': ['grok-tts'],
  'moss': ['moss-tts'],
  'minimax': ['speech-2.8-turbo', 'speech-2.8-hd', 'speech-2.5-turbo', 'speech-2.5-hd'],
  'gemini': ['gemini-2.5-flash-preview-tts', 'gemini-2.5-pro-preview-tts']
};
export const IMAGE_MODEL_PRESETS: Record<string,string[]> = {
  'openai-compatible': ['gpt-image-1.5', 'gpt-image-2', 'gpt-image-2.5', 'gpt-image-2.5-flare', 'gpt-image-2.5-sunburst', 'grok-imagine-image', 'grok-imagine-image-quality', 'grok-imagine-image-2.0'],
  'custom-compatible': ['gpt-image-1.5', 'gpt-image-2', 'gpt-image-2.5', 'gpt-image-2.5-flare', 'gpt-image-2.5-sunburst', 'grok-imagine-image', 'grok-imagine-image-quality', 'grok-imagine-image-2.0'],
  'gemini': ['gemini-2.5-flash-image', 'gemini-3.1-flash-image', 'gemini-3.1-flash-lite-image', 'gemini-3-pro-image'],
  'grok': ['grok-imagine-image-2.0', 'grok-imagine-image-quality', 'grok-imagine-image'],
  'novelai': ['nai-diffusion-5-full', 'nai-diffusion-5-curated', 'nai-diffusion-4-5-full', 'nai-diffusion-4-5-curated', 'nai-diffusion-4-full', 'nai-diffusion-4-curated-preview', 'nai-diffusion-3', 'nai-diffusion-furry-3']
};
export const defaults: VoiceImageSettings = {
  voice: {
    enabled: false,
    provider: 'openai-compatible',
    baseUrl: 'https://api.openai.com/v1',
    apiKey: '',
    model: 'gpt-4o-mini-tts',
    voice: 'alloy',
    format: 'mp3',
    speed: 1
  },
  image: {
    enabled: false,
    provider: 'openai-compatible',
    baseUrl: 'https://api.openai.com/v1',
    apiKey: '',
    model: 'gpt-image-2',
    size: '1024x1024',
    quality: 'auto',
    prompt: '',
    artistTags: '',
    negativePrompt: '',
    characters: [{
      role: 'user',
      name: '屏幕前的你',
      prompt: '',
      negativePrompt: ''
    }]
  }
};
export function normalizeImageCharacters(items: unknown) {
  const source = Array.isArray(items) ? items.slice(0, 3) as (Partial<ImageCharacter> & {negative?:string})[] : [];
  const normalized = source.map((item, index) => ({
    role: index === 0 ? 'user' : 'chat',
    name: String(item?.name || (index === 0 ? '屏幕前的你' : `角色 ${index}`)),
    prompt: String(item?.prompt || ''),
    negativePrompt: String(item?.negativePrompt || item?.negative || '')
  }));
  if (!normalized.length) normalized.push({
    role: 'user',
    name: '屏幕前的你',
    prompt: '',
    negativePrompt: ''
  });
  normalized[0].role = 'user';
  for (let index = 1; index < normalized.length; index += 1) normalized[index].role = 'chat';
  return normalized;
}
export function joinUrl(base: string, path: string) {
  const left = String(base || '').replace(/\/+$/, '');
  const right = String(path || '').replace(/^\/+/, '');
  return left + '/' + right;
}
export function labelFor(type: string, value: string) {
  return choiceMaps[type]?.find(x => x.value === value)?.label || value || '';
}
export function normalizeModelOptions(items: (string | ChoiceOption)[] = []) {
  return items.map(item => typeof item === 'string' ? {
    value: item,
    label: item
  } : item).filter(item => item && item.value).map(item => ({
    value: String(item.value),
    label: String(item.label || item.value)
  }));
}
export function filterFetchedModels(models: string[], kind: string, provider: string) {
  const presets = kind === 'voice' ? VOICE_MODEL_PRESETS[provider] || [] : IMAGE_MODEL_PRESETS[provider] || [];
  const lowerPresets = presets.map(x => x.toLowerCase());
  return (models || []).filter(id => {
    const v = String(id || '').toLowerCase();
    if (!v) return false;
    if (lowerPresets.includes(v)) return true;
    if (kind === 'voice') {
      if (provider === 'grok') return /grok.*voice|voice.*grok|tts/.test(v);
      if (provider === 'moss') return /moss.*tts|tts.*moss|moss-tts/.test(v);
      if (provider === 'minimax') return /speech|voice|tts|audio/.test(v);
      if (provider === 'gemini') return /tts/.test(v);
      return /tts|speech/.test(v) || /^tts-1/.test(v);
    }
    if (provider === 'grok') return /grok.*imagine.*image|imagine.*image/.test(v);
    if (provider === 'gemini') return /image/.test(v);
    return /image|imagine|flux|stable|sdxl|sd-|ideogram|dall/.test(v);
  });
}
export async function fetchOpenAICompatibleModels(baseUrl: string, apiKey: string) {
  const endpoint = /\/models$/i.test(baseUrl) ? baseUrl : /\/v1$/i.test(baseUrl) ? joinUrl(baseUrl, 'models') : joinUrl(baseUrl, 'v1/models');
  const res = await fetch(endpoint, {
    method: 'GET',
    headers: {
      'Authorization': 'Bearer ' + apiKey
    }
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data?.error?.message || `HTTP ${res.status}`);
  return Array.isArray(data?.data) ? data.data.map((item: {id?:string}) => item?.id).filter(Boolean) : [];
}
export async function fetchGeminiModels(baseUrl: string, apiKey: string) {
  const base = /\/models(\?|$)/i.test(baseUrl) ? baseUrl : joinUrl(baseUrl, 'models');
  const endpoint = base + (base.includes('?') ? '&' : '?') + 'key=' + encodeURIComponent(apiKey);
  const res = await fetch(endpoint, {
    method: 'GET'
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data?.error?.message || `HTTP ${res.status}`);
  return Array.isArray(data?.models) ? data.models.map((item: {name?:string}) => String(item?.name || '').replace(/^models\//, '')).filter(Boolean) : [];
}
export function hexToUint8Array(hex: string) {
  const clean = String(hex || '').replace(/\s+/g, '');
  const out = new Uint8Array(Math.floor(clean.length / 2));
  for (let i = 0; i < out.length; i++) {
    out[i] = parseInt(clean.substr(i * 2, 2), 16);
  }
  return out;
}
export function base64ToBlob(base64: string, mime = 'audio/mpeg') {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return new Blob([bytes], {
    type: mime
  });
}
export function formatAudioTime(seconds: number) {
  const value = Number.isFinite(seconds) && seconds > 0 ? Math.floor(seconds) : 0;
  const m = String(Math.floor(value / 60)).padStart(2, '0');
  const s = String(value % 60).padStart(2, '0');
  return `${m}:${s}`;
}
export function buildImageBasePrompt(cfg: ImageConfig) {
  return [String(cfg?.prompt || '').trim(), String(cfg?.artistTags || '').trim()].filter(Boolean).join('\n');
}
export function buildImagePositivePrompt(cfg: ImageConfig) {
  const lines = [buildImageBasePrompt(cfg)];
  normalizeImageCharacters(cfg?.characters).forEach((character, index) => {
    const prompt = String(character.prompt || '').trim();
    if (!prompt) return;
    lines.push(`${index === 0 ? 'User character' : `Chat character ${index}`} (${character.name}): ${prompt}`);
  });
  return lines.filter(Boolean).join('\n');
}
export function buildImageNegativePrompt(cfg: ImageConfig) {
  const lines = [];
  const globalNegative = String(cfg?.negativePrompt || '').trim();
  if (globalNegative) lines.push(globalNegative);
  normalizeImageCharacters(cfg?.characters).forEach((character, index) => {
    const negative = String(character.negativePrompt || '').trim();
    if (!negative) return;
    lines.push(`${index === 0 ? 'User character' : `Chat character ${index}`} (${character.name}): ${negative}`);
  });
  return lines.join('\n');
}
export function buildGenericImagePrompt(cfg: ImageConfig) {
  const positive = buildImagePositivePrompt(cfg);
  const negative = buildImageNegativePrompt(cfg);
  return negative ? `${positive}\nAvoid: ${negative}` : positive;
}
export // 用语音服务把一段文字念成音频（设置页试听和家机发语音共用），回传音频 Blob
async function synthesizeSpeech(cfg: VoiceConfig, speechText: string) {
  if (cfg.provider === 'grok') {
    if (!cfg.baseUrl || !cfg.apiKey || !cfg.voice) {
      throw new Error('请先填写 Grok API 地址、Key 与音色');
    }
  } else if (!cfg.baseUrl || !cfg.apiKey || !cfg.model || !cfg.voice) {
    throw new Error('请先填写语音 API 地址、Key、模型与音色');
  }
  if (cfg.provider === 'grok') {
    const endpoint = /\/v1\/tts$/i.test(cfg.baseUrl) ? cfg.baseUrl : /\/v1$/i.test(cfg.baseUrl) ? joinUrl(cfg.baseUrl, 'tts') : joinUrl(cfg.baseUrl, 'v1/tts');
    const res = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + cfg.apiKey
      },
      body: JSON.stringify({
        text: speechText,
        voice_id: cfg.voice || 'eve',
        language: 'zh',
        speed: Math.max(0.7, Math.min(1.5, cfg.speed || 1)),
        output_format: {
          codec: cfg.format === 'wav' ? 'wav' : cfg.format === 'flac' ? 'flac' : 'mp3'
        }
      })
    });
    if (!res.ok) {
      let detail = '';
      try {
        const data = await res.json();
        detail = data?.error?.message || data?.message || '';
      } catch (err) {}
      throw new Error(detail || `HTTP ${res.status}`);
    }
    return await res.blob();
  }
  if (cfg.provider === 'moss') {
    const endpoint = /\/audio\/speech$/i.test(cfg.baseUrl) ? cfg.baseUrl : /\/v1$/i.test(cfg.baseUrl) ? joinUrl(cfg.baseUrl, 'audio/speech') : joinUrl(cfg.baseUrl, 'v1/audio/speech');
    const res = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + cfg.apiKey
      },
      body: JSON.stringify({
        model: cfg.model || 'moss-tts',
        input: speechText,
        voice_id: cfg.voice,
        response_format: cfg.format,
        delivery_method: 'audio'
      })
    });
    if (!res.ok) {
      let detail = '';
      try {
        const data = await res.json();
        detail = data?.error?.message || data?.message || '';
      } catch (err) {}
      throw new Error(detail || `HTTP ${res.status}`);
    }
    return await res.blob();
  }
  if (cfg.provider === 'gemini') {
    const base = cfg.baseUrl.replace(/\/openai$/i, '');
    const model = cfg.model.replace(/^models\//, '');
    const res = await fetch(joinUrl(base, 'models/' + model + ':generateContent'), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-goog-api-key': cfg.apiKey
      },
      body: JSON.stringify({
        contents: [{
          parts: [{
            text: speechText
          }]
        }],
        generationConfig: {
          responseModalities: ['AUDIO'],
          speechConfig: {
            voiceConfig: {
              prebuiltVoiceConfig: {
                voiceName: cfg.voice || 'Kore'
              }
            }
          }
        }
      })
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data?.error?.message || `HTTP ${res.status}`);
    const part = (data?.candidates?.[0]?.content?.parts || []).find((item: {inlineData?: {data?:string};inline_data?:{data?:string}}) => item?.inlineData?.data || item?.inline_data?.data);
    const inline = part?.inlineData || part?.inline_data;
    if (!inline?.data) throw new Error('Gemini 没有返回音频数据');
    const rate = Number(String(inline.mimeType || inline.mime_type || '').match(/rate=(\d+)/)?.[1]) || 24000;
    const pcm = Uint8Array.from(atob(inline.data), c => c.charCodeAt(0));
    const wav = new Uint8Array(44 + pcm.length);
    const view = new DataView(wav.buffer);
    const tag = (offset: number, value: string) => {
      for (let i = 0; i < value.length; i++) view.setUint8(offset + i, value.charCodeAt(i));
    };
    tag(0, 'RIFF');
    view.setUint32(4, 36 + pcm.length, true);
    tag(8, 'WAVE');
    tag(12, 'fmt ');
    view.setUint32(16, 16, true);
    view.setUint16(20, 1, true);
    view.setUint16(22, 1, true);
    view.setUint32(24, rate, true);
    view.setUint32(28, rate * 2, true);
    view.setUint16(32, 2, true);
    view.setUint16(34, 16, true);
    tag(36, 'data');
    view.setUint32(40, pcm.length, true);
    wav.set(pcm, 44);
    return new Blob([wav], {
      type: 'audio/wav'
    });
  }
  if (cfg.provider === 'minimax') {
    const endpoint = /\/v1$/i.test(cfg.baseUrl) ? joinUrl(cfg.baseUrl, 't2a_v2') : joinUrl(cfg.baseUrl, 'v1/t2a_v2');
    const res = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + cfg.apiKey
      },
      body: JSON.stringify({
        model: cfg.model,
        text: speechText,
        stream: false,
        voice_setting: {
          voice_id: cfg.voice,
          speed: cfg.speed,
          vol: 1
        },
        audio_setting: {
          format: cfg.format
        }
      })
    });
    let data = null;
    try {
      data = await res.json();
    } catch (err) {}
    if (!res.ok || data?.base_resp?.status_code && data?.base_resp?.status_code !== 0) {
      throw new Error(data?.base_resp?.status_msg || data?.error?.message || `HTTP ${res.status}`);
    }
    const audioData = data?.data?.audio;
    if (!audioData) throw new Error('MiniMax 没有返回音频数据');
    let blob = null;
    if (/^[0-9a-fA-F]+$/.test(audioData.slice(0, 40))) {
      const bytes = hexToUint8Array(audioData);
      blob = new Blob([bytes], {
        type: 'audio/' + cfg.format
      });
    } else {
      blob = base64ToBlob(audioData, 'audio/' + cfg.format);
    }
    return blob;
  }
  const endpoint = /\/audio\/speech$/i.test(cfg.baseUrl) ? cfg.baseUrl : /\/v1$/i.test(cfg.baseUrl) ? joinUrl(cfg.baseUrl, 'audio/speech') : joinUrl(cfg.baseUrl, 'v1/audio/speech');
  const res = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer ' + cfg.apiKey
    },
    body: JSON.stringify({
      model: cfg.model,
      voice: cfg.voice,
      input: speechText,
      response_format: cfg.format,
      speed: cfg.speed
    })
  });
  if (!res.ok) {
    let detail = '';
    try {
      const data = await res.json();
      detail = data?.error?.message || '';
    } catch (err) {}
    throw new Error(detail || `HTTP ${res.status}`);
  }
  return await res.blob();
}
// 聊天用：照「语音与生图设置」存好的语音服务念一段文字；没开启或没设定好就回传 null
export async function inflateZipEntry(bytes: Uint8Array<ArrayBuffer>) {
  if (typeof DecompressionStream !== 'function') {
    throw new Error('当前浏览器不支持解压 NAI 返回的图片');
  }
  const stream = new Blob([bytes]).stream().pipeThrough(new DecompressionStream('deflate-raw'));
  return new Uint8Array(await new Response(stream).arrayBuffer());
}
export async function extractFirstImageFromZip(buffer: ArrayBuffer) {
  const bytes = new Uint8Array(buffer);
  const view = new DataView(buffer);
  let eocd = -1;
  const minOffset = Math.max(0, bytes.length - 65557);
  for (let i = bytes.length - 22; i >= minOffset; i -= 1) {
    if (view.getUint32(i, true) === 0x06054b50) {
      eocd = i;
      break;
    }
  }
  if (eocd < 0) throw new Error('NAI 返回的图片压缩包无法识别');
  const entryCount = view.getUint16(eocd + 10, true);
  let cursor = view.getUint32(eocd + 16, true);
  const decoder = new TextDecoder();
  for (let index = 0; index < entryCount; index += 1) {
    if (view.getUint32(cursor, true) !== 0x02014b50) break;
    const method = view.getUint16(cursor + 10, true);
    const compressedSize = view.getUint32(cursor + 20, true);
    const fileNameLength = view.getUint16(cursor + 28, true);
    const extraLength = view.getUint16(cursor + 30, true);
    const commentLength = view.getUint16(cursor + 32, true);
    const localOffset = view.getUint32(cursor + 42, true);
    const fileName = decoder.decode(bytes.slice(cursor + 46, cursor + 46 + fileNameLength));
    if (/\.(png|jpe?g|webp)$/i.test(fileName) && view.getUint32(localOffset, true) === 0x04034b50) {
      const localNameLength = view.getUint16(localOffset + 26, true);
      const localExtraLength = view.getUint16(localOffset + 28, true);
      const dataOffset = localOffset + 30 + localNameLength + localExtraLength;
      const compressed = bytes.slice(dataOffset, dataOffset + compressedSize);
      const output = method === 0 ? compressed : method === 8 ? await inflateZipEntry(compressed) : null;
      if (!output) throw new Error('NAI 返回了不支持的压缩格式');
      const mime = /\.jpe?g$/i.test(fileName) ? 'image/jpeg' : /\.webp$/i.test(fileName) ? 'image/webp' : 'image/png';
      return new Blob([output], {
        type: mime
      });
    }
    cursor += 46 + fileNameLength + extraLength + commentLength;
  }
  throw new Error('NAI 返回的数据中没有找到图片');
}
export async function testNovelAIImage(cfg: ImageConfig, basePrompt: string) {
  const base = cfg.baseUrl.replace(/\/+$/, '');
  const endpoint = /\/ai\/generate-image$/i.test(base) ? base : joinUrl(base, 'ai/generate-image');
  const [width, height] = String(cfg.size || '1024x1024').split('x').map(Number);
  const seed = Math.floor(Math.random() * 4294967295);
  const negativePrompt = buildImageNegativePrompt(cfg);
  const stepsByQuality = {
    low: 18,
    medium: 23,
    high: 28,
    auto: 28
  };
  const isV4OrV5 = /^nai-diffusion-(4|5)/i.test(cfg.model);
  const characters = normalizeImageCharacters(cfg.characters);
  const activeCharacters = characters.filter(character => character.prompt.trim() || character.negativePrompt.trim());
  const requestPrompt = isV4OrV5 ? basePrompt : buildImagePositivePrompt(cfg);
  const parameters: Record<string,unknown> = {
    width: width || 1024,
    height: height || 1024,
    n_samples: 1,
    seed,
    extra_noise_seed: seed,
    sampler: 'k_euler_ancestral',
    steps: (stepsByQuality as Record<string,number>)[cfg.quality] || 28,
    scale: 5,
    negative_prompt: negativePrompt,
    cfg_rescale: 0,
    prefer_brownian: false,
    noise_schedule: 'karras',
    params_version: /^nai-diffusion-5/i.test(cfg.model) ? 4 : 3,
    legacy: false,
    legacy_v3_extend: false
  };
  if (/^nai-diffusion-4-5/i.test(cfg.model)) parameters.skip_cfg_above_sigma = 58;else if (/^nai-diffusion-4/i.test(cfg.model)) parameters.skip_cfg_above_sigma = 19;
  if (isV4OrV5) {
    const charCaptions = activeCharacters.map((character, index) => ({
      char_caption: character.prompt.trim(),
      centers: [{
        x: (index + 1) / (activeCharacters.length + 1),
        y: 0.5
      }]
    }));
    const negativeCharCaptions = activeCharacters.map((character, index) => ({
      char_caption: character.negativePrompt.trim(),
      centers: [{
        x: (index + 1) / (activeCharacters.length + 1),
        y: 0.5
      }]
    }));
    parameters.add_original_image = true;
    parameters.legacy_uc = false;
    parameters.v4_prompt = {
      caption: {
        base_caption: basePrompt,
        char_captions: charCaptions
      },
      use_coords: activeCharacters.length > 0,
      use_order: true,
      legacy_uc: false
    };
    parameters.v4_negative_prompt = {
      caption: {
        base_caption: String(cfg.negativePrompt || '').trim(),
        char_captions: negativeCharCaptions
      },
      use_coords: activeCharacters.length > 0,
      use_order: false,
      legacy_uc: false
    };
  }
  const res = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer ' + cfg.apiKey
    },
    body: JSON.stringify({
      input: requestPrompt,
      model: cfg.model,
      action: 'generate',
      parameters
    })
  });
  if (!res.ok) {
    const raw = await res.text().catch(() => '');
    let message = raw;
    try {
      const data = JSON.parse(raw);
      message = data?.message || data?.error?.message || raw;
    } catch (err) {}
    throw new Error(message || `HTTP ${res.status}`);
  }
  const buffer = await res.arrayBuffer();
  const output = new Uint8Array(buffer);
  const isPng = output.length > 8 && output[0] === 0x89 && output[1] === 0x50 && output[2] === 0x4e && output[3] === 0x47;
  const imageBlob = isPng ? new Blob([buffer], {
    type: 'image/png'
  }) : await extractFirstImageFromZip(buffer);
  return {blob:imageBlob};
}
export async function testImage(cfg: ImageConfig) {
  
  if (!cfg.baseUrl || !cfg.apiKey || !cfg.model) {
    throw new Error('请先填写生图 API 地址、Key 与模型');
  }
  if (!cfg.prompt) {
    throw new Error('请先输入生图提示词');
  }
  const basePrompt = buildImageBasePrompt(cfg);
  const finalPrompt = cfg.provider === 'novelai' ? basePrompt : buildGenericImagePrompt(cfg);
  if (cfg.provider === 'novelai') {
    return await testNovelAIImage(cfg, basePrompt);
  }
  if (cfg.provider === 'gemini') {
    const base = cfg.baseUrl.replace(/\/+$/, '');
    const endpoint = /:generateContent/i.test(base) ? base : joinUrl(base, `models/${cfg.model}:generateContent`) + `?key=${encodeURIComponent(cfg.apiKey)}`;
    const res = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        contents: [{
          parts: [{
            text: finalPrompt
          }]
        }],
        generationConfig: {
          responseModalities: ['TEXT', 'IMAGE']
        }
      })
    });
    let data;
    try {
      data = await res.json();
    } catch (err) {}
    if (!res.ok) {
      throw new Error(data?.error?.message || `HTTP ${res.status}`);
    }
    const parts = data?.candidates?.[0]?.content?.parts || [];
    const imagePart = parts.find((part: {inlineData?:{data?:string;mimeType?:string}}) => part?.inlineData?.data && String(part?.inlineData?.mimeType || '').startsWith('image/'));
    if (!imagePart) {
      throw new Error('Gemini 没有返回可显示的图片');
    }
    return {src:`data:${imagePart.inlineData.mimeType};base64,${imagePart.inlineData.data}`};
    return;
  }
  const endpoint = /\/images\/generations$/i.test(cfg.baseUrl) ? cfg.baseUrl : /\/v1$/i.test(cfg.baseUrl) ? joinUrl(cfg.baseUrl, 'images/generations') : joinUrl(cfg.baseUrl, 'v1/images/generations');
  const sizeToRatio = {
    '1024x1024': '1:1',
    '1536x1024': '3:2',
    '1024x1536': '2:3'
  };
  const imageBody = cfg.provider === 'grok' ? {
    model: cfg.model,
    prompt: finalPrompt,
    aspect_ratio: (sizeToRatio as Record<string,string>)[cfg.size] || '1:1',
    resolution: '1k',
    quality: cfg.quality === 'auto' ? 'low' : cfg.quality,
    n: 1
  } : {
    model: cfg.model,
    prompt: finalPrompt,
    size: cfg.size,
    quality: cfg.quality,
    n: 1
  };
  const res = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer ' + cfg.apiKey
    },
    body: JSON.stringify(imageBody)
  });
  let data;
  try {
    data = await res.json();
  } catch (err) {}
  if (!res.ok) {
    throw new Error(data?.error?.message || `HTTP ${res.status}`);
  }
  const item = data?.data?.[0] || {};
  if (item.b64_json) {
    return {src:'data:image/png;base64,' + item.b64_json};
  } else if (item.url) {
    return {src:String(item.url)};
  } else {
    throw new Error('接口没有返回可显示的图片');
  }
}

// 页面进入 / 返回
export function loadVoiceImageSettings(): VoiceImageSettings { try {const stored=JSON.parse(localStorage.getItem('smallphone_voice_image_settings_v1')||'null');if(stored&&typeof stored==='object'){return{voice:{...defaults.voice,...(stored.voice||{})},image:{...defaults.image,...(stored.image||{}),characters:normalizeImageCharacters(stored.image?.characters||defaults.image.characters)}};}}catch{}return structuredClone(defaults);}
