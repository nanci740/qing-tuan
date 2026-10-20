import type { ApiConfig, ApiConnection, ApiMessage, ApiResponse, ApiChunkHandler } from '../types/api';
import { imagePartData, splitLeadingSystem } from './apiMessages';
import { isGeminiNative, geminiHeaders, geminiRequest, normalizeGeminiResponse, parseGeminiStream, fetchGeminiModels } from './geminiNative';

export function cleanBaseUrl(value: unknown) {
        return String(value || '').trim().replace(/\/+$/, '');
    }

    export function clampNumber(value: unknown, min: number, max: number, fallback: number) {
        const n = Number(value);
        if (!Number.isFinite(n)) return fallback;
        return Math.min(max, Math.max(min, n));
    }

export function validateConfig(config: ApiConnection, needsModel = false) {
        if (!config.baseUrl) throw new Error('请先填写 API 地址');
        if (!/^https?:\/\//i.test(config.baseUrl)) throw new Error('API 地址需要以 http:// 或 https:// 开头');
        if (!config.apiKey) throw new Error('请先填写 API Key');
        if (needsModel && !config.model) throw new Error('请先填写或获取模型名称');
    }

export function trimMessagesForContext(messages: ApiMessage[], limit: number) {
        const list = Array.isArray(messages) ? messages.filter(Boolean) : [];
        // 开头的 system 一定留着；夹在聊天记录中间的 system（世界书按深度插入的）留在原位，
        // 只算 user / assistant 的条数，裁掉的范围里的 system 跟着一起裁掉。
        let lead = 0;
        while (lead < list.length && list[lead].role === 'system') lead++;
        const rest = list.slice(lead), keep = Math.max(1, limit || 30);
        let start = rest.length, count = 0;
        for (let i = rest.length - 1; i >= 0; i--) {
            if (rest[i].role !== 'system') { if (count >= keep) break; count++; }
            start = i;
        }
        return [...list.slice(0, lead), ...rest.slice(start)];
    }

    export function getFeatureModel(config: ApiConfig, feature: string) {
        if (!feature) return config.model;
        const chosen = config.featureModels && config.featureModels[feature];
        return chosen || config.model;
    }

    export function buildFallbackConfig(config: ApiConfig) {
        if (!config.fallbackEnabled || !config.fallback) return null;
        const fb = config.fallback;
        if (!fb.baseUrl || !fb.apiKey || !fb.model) return null;
        return {
            ...config,
            provider: fb.provider || 'openai-compatible',
            baseUrl: fb.baseUrl,
            apiKey: fb.apiKey,
            model: fb.model,
            fallbackEnabled: false
        };
    }

    async function fetchWithTimeout(url: string, options: RequestInit, timeoutSeconds: number) {
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), Math.max(5, timeoutSeconds || 60) * 1000);
        try {
            return await fetch(url, { ...options, signal: controller.signal });
        } catch (err) {
            if (err instanceof Error && err.name === 'AbortError') throw new Error('请求超时');
            throw err;
        } finally {
            clearTimeout(timer);
        }
    }

    function authHeaders(config: ApiConnection): Record<string, string> {
        if (config.provider === 'claude') {
            return {
                'Content-Type': 'application/json',
                'x-api-key': config.apiKey,
                'anthropic-version': '2023-06-01'
            };
        }
        return {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${config.apiKey}`
        };
    }

    async function parseApiError(response: Response) {
        let detail = '';
        try {
            const data = await response.json();
            detail = data?.error?.message || data?.message || '';
        } catch (err) {}
        return detail || `HTTP ${response.status}`;
    }

    export async function fetchModels(config: ApiConnection): Promise<string[]> {
        validateConfig(config, false);
        if (isGeminiNative(config)) return fetchGeminiModels(config);
        let response;
        try {
            response = await fetch(`${config.baseUrl}/models`, {
                method: 'GET',
                headers: authHeaders(config)
            });
        } catch (err) {
            throw new Error('无法连接接口；请检查地址、网络或浏览器 CORS 限制');
        }
        if (!response.ok) throw new Error(await parseApiError(response));
        const data = await response.json();
        const list = Array.isArray(data?.data) ? data.data : (Array.isArray(data?.models) ? data.models : []);
        const models = list.map((item: string | { id?: string; name?: string } | null) => typeof item === 'string' ? item : item && (item.id || item.name)).filter((item: string | null | undefined): item is string => Boolean(item));
        return [...new Set<string>(models)].sort((a,b) => String(a).localeCompare(String(b)));
    }

    async function parseStreamResponse(response: Response, config: ApiConfig, onChunk?: ApiChunkHandler): Promise<ApiResponse> {
        const reader = response.body?.getReader();
        if (!reader) return response.json();

        const decoder = new TextDecoder();
        let buffer = '', raw = '', sawData = false;
        let collected = '', reasoning = '', finish = '';
        let finalModel = config.model;
        let inputTokens = 0, outputTokens = 0, totalTokens = 0;
        let streamError = '';

        const handle = (rawLine: string) => {
                const line = rawLine.trim();
                if (!line.startsWith('data:')) return;
                sawData = true;
                const payload = line.slice(5).trim();
                if (!payload || payload === '[DONE]') return;

                try {
                    const data: ApiResponse & { error?: { message?: string } | string; delta?: { stop_reason?: string; thinking?: string }; choices?: { delta?: { reasoning_content?: string; reasoning?: string } }[] } = JSON.parse(payload);
                    let chunk = '';
                    // 有的中转站把错误塞在串流里，照样当错误处理。
                    if (data?.error) { streamError = typeof data.error === 'string' ? data.error : data.error.message || '接口返回错误'; return; }

                    if (config.provider === 'claude') {
                        chunk = data?.delta?.text || data?.content_block?.text || '';
                        reasoning += data?.delta?.thinking || '';
                        finish = data?.delta?.stop_reason || finish;
                        finalModel = data?.message?.model || data?.model || finalModel;
                        if (data?.message?.usage) {
                            inputTokens = data.message.usage.input_tokens || inputTokens;
                            outputTokens = data.message.usage.output_tokens || outputTokens;
                        }
                        if (data?.usage) {
                            inputTokens = data.usage.input_tokens || inputTokens;
                            outputTokens = data.usage.output_tokens || outputTokens;
                        }
                    } else {
                        const choice = data?.choices?.[0];
                        chunk = choice?.delta?.content || '';
                        reasoning += choice?.delta?.reasoning_content || choice?.delta?.reasoning || '';
                        finish = choice?.finish_reason || finish;
                        finalModel = data?.model || finalModel;
                        if (data?.usage) {
                            inputTokens = data.usage.prompt_tokens || inputTokens;
                            outputTokens = data.usage.completion_tokens || outputTokens;
                            totalTokens = data.usage.total_tokens || totalTokens;
                        }
                    }

                    if (chunk) {
                        collected += chunk;
                        if (typeof onChunk === 'function') onChunk(chunk, collected);
                    }
                } catch (err) {}
        };

        while (true) {
            const { value, done } = await reader.read();
            if (done) break;
            const text = decoder.decode(value, { stream: true });
            if (!sawData && raw.length < 2000000) raw += text;
            buffer += text;
            const parts = buffer.split('\n');
            buffer = parts.pop() || '';
            parts.forEach(handle);
        }
        handle(buffer);

        if (streamError) throw new Error(streamError);
        // 接口不支持串流、直接回了一整段 JSON 时，照非串流的结果用。
        if (!sawData) {
            try { return JSON.parse(raw); } catch (err) {}
        }

        totalTokens = totalTokens || inputTokens + outputTokens;
        return {
            model: finalModel,
            text: collected,
            choices: [{ message: { content: collected, ...(reasoning ? { reasoning_content: reasoning } : {}) }, finish_reason: finish }],
            usage: { input_tokens: inputTokens, output_tokens: outputTokens, total_tokens: totalTokens },
            stream: true
        };
    }

    export async function performChatRequest(messages: ApiMessage[], config: ApiConfig, onChunk?: ApiChunkHandler): Promise<ApiResponse> {
        validateConfig(config, true);
        const inputMessages = trimMessagesForContext(messages, config.contextMessages);
        let endpoint = `${config.baseUrl}/chat/completions`;
        let body: Record<string, unknown>;
        // 单次回复上限留空或填 0 表示不限字数：OpenAI 兼容接口不送上限，用模型自己的；Claude 必须送，给 8192。
        // 思考型模型（如 Gemini 3.1 Pro）的思考也算在上限里，上限太小会想完就没额度，正文是空的。
        const unlimited = Number(config.maxTokens) === 0;

        if (isGeminiNative(config)) {
            const { url, body: nativeBody } = geminiRequest(inputMessages, config, unlimited);
            let nativeResponse;
            try {
                nativeResponse = await fetchWithTimeout(url, { method: 'POST', headers: geminiHeaders(config), body: JSON.stringify(nativeBody) }, config.timeoutSeconds);
            } catch (err) {
                if (err instanceof Error && err.message === '请求超时') throw err;
                throw new Error('无法连接接口；请检查地址、网络或浏览器 CORS 限制');
            }
            if (!nativeResponse.ok) throw new Error(await parseApiError(nativeResponse));
            return config.stream ? parseGeminiStream(nativeResponse, config.model, onChunk) : normalizeGeminiResponse(await nativeResponse.json(), config.model);
        }

        if (config.provider === 'claude') {
            endpoint = `${config.baseUrl}/messages`;

            const { system: systemParts, rest } = splitLeadingSystem(inputMessages);

            const claudeMessages = rest
                .filter(Boolean)
                .map(item => ({
                    role: item.role === 'assistant' ? 'assistant' : 'user',
                    // 带图片的消息拆成 Claude 的 text / image 区块；声音 Claude 收不了，略过。
                    content: typeof item.content === 'string' ? item.content : Array.isArray(item.content)
                        ? item.content.flatMap((part: { text?: unknown }): Record<string, unknown>[] => { const image = imagePartData(part); return image ? [{ type: 'image', source: { type: 'base64', media_type: image.mimeType, data: image.data } }] : typeof part?.text === 'string' ? [{ type: 'text', text: part.text }] : []; })
                        : String(item.content ?? '')
                }));

            body = {
                model: config.model,
                messages: claudeMessages,
                max_tokens: unlimited ? 8192 : Math.round(clampNumber(config.maxTokens, 1, 32768, 2048)),
                temperature: clampNumber(config.temperature, 0, 1, .8),
                top_p: clampNumber(config.topP, 0, 1, 1),
                stream: !!config.stream
            };
            if (systemParts.length) body.system = systemParts.join('\n\n');
        } else {
            const completionTokenKey = /\bgpt-5(?:[.\-]|$)|\bo[134](?:-|$)/i.test(String(config.model || '').trim())
                ? 'max_completion_tokens'
                : 'max_tokens';
            body = {
                model: config.model,
                messages: inputMessages,
                temperature: clampNumber(config.temperature, 0, 2, .8),
                top_p: clampNumber(config.topP, 0, 1, 1),
                stream: !!config.stream
            };
            if (!unlimited) body[completionTokenKey] = Math.round(clampNumber(config.maxTokens, 1, 32768, 2048));
            if (config.stream) body.stream_options = { include_usage: true };
        }

        let response;
        try {
            response = await fetchWithTimeout(endpoint, {
                method: 'POST',
                headers: authHeaders(config),
                body: JSON.stringify(body)
            }, config.timeoutSeconds);
        } catch (err) {
            if (err instanceof Error && err.message === '请求超时') throw err;
            throw new Error('无法连接接口；请检查地址、网络或浏览器 CORS 限制');
        }

        if (!response.ok) throw new Error(await parseApiError(response));
        return config.stream ? parseStreamResponse(response, config, onChunk) : response.json();
    }

    export function extractUsage(data: ApiResponse) {
        const usage = data?.usage || {};
        const input = Number(usage.prompt_tokens ?? usage.input_tokens ?? 0) || 0;
        const output = Number(usage.completion_tokens ?? usage.output_tokens ?? 0) || 0;
        const total = Number(usage.total_tokens ?? (input + output)) || 0;
        return { input, output, total };
    }
