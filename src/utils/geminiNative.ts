import type { ApiConfig, ApiConnection, ApiMessage, ApiResponse, ApiChunkHandler } from '../types/api';

// Google 官方的 Gemini 地址走原生接口（generateContent），才能设安全过滤；
// 中转站和其他地址照旧走 OpenAI 兼容格式。回来的结果整理成兼容格式的样子，其他地方不用改。
const GOOGLE_HOST = /^https?:\/\/generativelanguage\.googleapis\.com(\/|$)/i;

/** 能设的四类过滤全部不拦。Google 硬性规定的部分（例如涉及未成年人）关不掉。 */
const SAFETY_SETTINGS = ['HARM_CATEGORY_HARASSMENT', 'HARM_CATEGORY_HATE_SPEECH', 'HARM_CATEGORY_SEXUALLY_EXPLICIT', 'HARM_CATEGORY_DANGEROUS_CONTENT']
    .map(category => ({ category, threshold: 'BLOCK_NONE' }));

interface GeminiPart { text?: string; thought?: boolean; inlineData?: { mimeType: string; data: string } }
interface GeminiContent { role: 'user' | 'model'; parts: GeminiPart[] }
interface GeminiCandidate { content?: { parts?: GeminiPart[] }; finishReason?: string }
interface GeminiUsage { promptTokenCount?: number; candidatesTokenCount?: number; thoughtsTokenCount?: number; totalTokenCount?: number }
interface GeminiResponse { candidates?: GeminiCandidate[]; promptFeedback?: { blockReason?: string }; usageMetadata?: GeminiUsage; modelVersion?: string }

export function isGeminiNative(config: ApiConnection) {
    return config.provider === 'gemini' && GOOGLE_HOST.test(config.baseUrl);
}

/** 存的地址多半是兼容接口的 …/v1beta/openai，原生接口去掉最后的 /openai。 */
function nativeBase(config: ApiConnection) {
    return config.baseUrl.replace(/\/+$/, '').replace(/\/openai$/i, '');
}

function modelPath(model: string) {
    return encodeURIComponent(String(model || '').trim().replace(/^models\//, ''));
}

export function geminiHeaders(config: ApiConnection): Record<string, string> {
    return { 'Content-Type': 'application/json', 'x-goog-api-key': config.apiKey };
}

function toParts(content: unknown): GeminiPart[] {
    if (!Array.isArray(content)) return [{ text: typeof content === 'string' ? content : String(content ?? '') }];
    return content.flatMap((part): GeminiPart[] => {
        if (part?.type === 'input_audio' && part.input_audio?.data)
            return [{ inlineData: { mimeType: `audio/${part.input_audio.format || 'wav'}`, data: part.input_audio.data } }];
        if (typeof part?.text === 'string') return [{ text: part.text }];
        return [];
    });
}

export function geminiRequest(messages: ApiMessage[], config: ApiConfig, unlimited: boolean) {
    const system = messages.filter(item => item.role === 'system').map(item => typeof item.content === 'string' ? item.content : '').filter(Boolean);
    const contents: GeminiContent[] = [];
    for (const item of messages) {
        if (item.role === 'system') continue;
        const role = item.role === 'assistant' ? 'model' : 'user', parts = toParts(item.content);
        if (!parts.length) continue;
        // 同一方连续几条并成一段，Gemini 要求一问一答交替。
        const last = contents[contents.length - 1];
        if (last && last.role === role) last.parts.push(...parts); else contents.push({ role, parts });
    }
    const generationConfig: Record<string, number> = {
        temperature: Math.min(2, Math.max(0, Number(config.temperature) || 0)),
        topP: Math.min(1, Math.max(0, Number.isFinite(Number(config.topP)) ? Number(config.topP) : 1))
    };
    if (!unlimited) generationConfig.maxOutputTokens = Math.round(Math.min(32768, Math.max(1, Number(config.maxTokens) || 2048)));
    const body: Record<string, unknown> = { contents, generationConfig, safetySettings: SAFETY_SETTINGS };
    if (system.length) body.systemInstruction = { parts: [{ text: system.join('\n\n') }] };
    const method = config.stream ? 'streamGenerateContent?alt=sse' : 'generateContent';
    return { url: `${nativeBase(config)}/models/${modelPath(config.model)}:${method}`, body };
}

/** 正文和思考分开：思考的部分不算回复。 */
function splitParts(parts: GeminiPart[] | undefined) {
    let text = '', thought = '';
    for (const part of parts || []) {
        if (typeof part?.text !== 'string') continue;
        if (part.thought) thought += part.text; else text += part.text;
    }
    return { text, thought };
}

function usageOf(meta: GeminiUsage | undefined) {
    const input = meta?.promptTokenCount || 0, thoughts = meta?.thoughtsTokenCount || 0, output = (meta?.candidatesTokenCount || 0) + thoughts;
    return { prompt_tokens: input, completion_tokens: output, total_tokens: meta?.totalTokenCount || input + output, completion_tokens_details: { reasoning_tokens: thoughts } };
}

/** 整理成兼容格式：choices[0].message.content 是正文，finish_reason 是 Gemini 的结束原因。 */
export function normalizeGeminiResponse(data: GeminiResponse, model: string): ApiResponse {
    const candidate = data?.candidates?.[0], { text, thought } = splitParts(candidate?.content?.parts);
    return {
        model: data?.modelVersion || model,
        choices: [{ message: { content: text, ...(thought ? { reasoning_content: thought } : {}) }, finish_reason: candidate?.finishReason || '' }],
        ...(data?.promptFeedback ? { promptFeedback: data.promptFeedback } : {}),
        usage: usageOf(data?.usageMetadata)
    };
}

export async function parseGeminiStream(response: Response, model: string, onChunk?: ApiChunkHandler): Promise<ApiResponse> {
    const reader = response.body?.getReader();
    if (!reader) return normalizeGeminiResponse(await response.json(), model);
    const decoder = new TextDecoder();
    let buffer = '', collected = '', finish = '', finalModel = model;
    let meta: GeminiUsage | undefined, feedback: GeminiResponse['promptFeedback'];
    const handle = (line: string) => {
        if (!line.startsWith('data:')) return;
        try {
            const data: GeminiResponse = JSON.parse(line.slice(5).trim());
            const candidate = data?.candidates?.[0], { text } = splitParts(candidate?.content?.parts);
            if (candidate?.finishReason) finish = candidate.finishReason;
            if (data?.usageMetadata) meta = data.usageMetadata;
            if (data?.promptFeedback) feedback = data.promptFeedback;
            if (data?.modelVersion) finalModel = data.modelVersion;
            if (text) { collected += text; onChunk?.(text, collected); }
        } catch (err) {}
    };
    while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';
        lines.forEach(line => handle(line.trim()));
    }
    handle(buffer.trim());
    return {
        model: finalModel, text: collected, stream: true,
        choices: [{ message: { content: collected }, finish_reason: finish }],
        ...(feedback ? { promptFeedback: feedback } : {}),
        usage: usageOf(meta)
    };
}

/** 模型列表：只留能聊天（generateContent）的，去掉前面的 models/。 */
export async function fetchGeminiModels(config: ApiConnection): Promise<string[]> {
    let response;
    try {
        response = await fetch(`${nativeBase(config)}/models?pageSize=1000`, { method: 'GET', headers: geminiHeaders(config) });
    } catch (err) {
        throw new Error('无法连接接口；请检查地址、网络或浏览器 CORS 限制');
    }
    if (!response.ok) {
        let detail = '';
        try { const data = await response.json(); detail = data?.error?.message || ''; } catch (err) {}
        throw new Error(detail || `HTTP ${response.status}`);
    }
    const data = await response.json();
    const list: { name?: string; supportedGenerationMethods?: string[] }[] = Array.isArray(data?.models) ? data.models : [];
    return [...new Set(list
        .filter(item => !Array.isArray(item?.supportedGenerationMethods) || item.supportedGenerationMethods.includes('generateContent'))
        .map(item => String(item?.name || '').replace(/^models\//, ''))
        .filter(Boolean))].sort((a, b) => a.localeCompare(b));
}
