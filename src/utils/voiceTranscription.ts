import type { VoiceConfig } from '../types/voiceImage';

export function transcriptionConnection(config: Partial<VoiceConfig>) {
    const savedProvider = config.transcriptionProvider || config.provider || 'openai-compatible';
    const provider = savedProvider === 'openai' ? 'openai-compatible' : savedProvider;
    const baseUrl = (config.transcriptionBaseUrl || config.baseUrl || '').trim().replace(/\/+$/, '');
    const apiKey = (config.transcriptionApiKey || config.apiKey || '').trim();
    const model = (config.transcriptionModel || (provider === 'gemini' && !/tts/i.test(config.model || '') ? config.model : '') ||
        (provider === 'gemini' ? 'gemini-2.5-flash' : 'gpt-4o-mini-transcribe')).trim().replace(/^models\//, '');
    if (!apiKey || !baseUrl) throw Error('请在「语音与生图设置」保存转写地址和 Key');
    if (!/^https?:\/\//i.test(baseUrl)) throw Error('转写地址需要以 http:// 或 https:// 开头');
    if (!['gemini', 'openai-compatible', 'custom-compatible'].includes(provider)) {
        throw Error('当前语音连接用于合成；请单独设置支持音频转写的类型、地址、Key 和模型');
    }
    if (provider === 'gemini') {
        let base = baseUrl.replace(/\/models\/[^/]+:generateContent$/i, '').replace(/\/openai$/i, '');
        if (!/\/v1(?:beta)?$/i.test(base)) base += '/v1beta';
        return { provider, apiKey, model, endpoint: base + '/models/' + encodeURIComponent(model) + ':generateContent' };
    }
    let base = baseUrl.replace(/\/(?:audio\/(?:speech|transcriptions)|chat\/completions)$/i, '');
    // 自定义代理的前缀保持原样；只有裸域名补标准 /v1。
    if (new URL(base).pathname === '/') base += '/v1';
    return { provider, apiKey, model, endpoint: base + '/audio/transcriptions' };
}

export function recordingExtension(mime: string): string {
    if (/wav/i.test(mime)) return 'wav';
    if (/mp4|m4a/i.test(mime)) return 'm4a';
    if (/ogg/i.test(mime)) return 'ogg';
    if (/mpeg|mp3/i.test(mime)) return 'mp3';
    if (/flac/i.test(mime)) return 'flac';
    return 'webm';
}

export async function transcriptionError(response: Response): Promise<Error> {
    // 不显示接口返回的全文，避免把 Key 或录音内容带进错误提示。
    return Error(response.status === 404
        ? '转写失败（HTTP 404）：请检查转写地址和模型；该语音合成服务可能不提供转写接口'
        : '语音识别失败（HTTP ' + response.status + '）');
}
