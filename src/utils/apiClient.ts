import type { ApiConfig, ApiConnection, ApiMessage, ApiResponse, ApiChunkHandler } from '../types/api';

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
        const system = list.filter(item => item.role === 'system');
        const normal = list.filter(item => item.role !== 'system');
        return [...system, ...normal.slice(-Math.max(1, limit || 30))];
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
        let buffer = '';
        let collected = '';
        let finalModel = config.model;
        let inputTokens = 0, outputTokens = 0, totalTokens = 0;

        while (true) {
            const { value, done } = await reader.read();
            if (done) break;
            buffer += decoder.decode(value, { stream: true });
            const parts = buffer.split('\n');
            buffer = parts.pop() || '';

            for (const raw of parts) {
                const line = raw.trim();
                if (!line.startsWith('data:')) continue;
                const payload = line.slice(5).trim();
                if (!payload || payload === '[DONE]') continue;

                try {
                    const data: ApiResponse = JSON.parse(payload);
                    let chunk = '';

                    if (config.provider === 'claude') {
                        chunk = data?.delta?.text || data?.content_block?.text || '';
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
                        chunk = data?.choices?.[0]?.delta?.content || '';
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
            }
        }

        totalTokens = totalTokens || inputTokens + outputTokens;
        return {
            model: finalModel,
            text: collected,
            usage: { input_tokens: inputTokens, output_tokens: outputTokens, total_tokens: totalTokens },
            stream: true
        };
    }

    export async function performChatRequest(messages: ApiMessage[], config: ApiConfig, onChunk?: ApiChunkHandler): Promise<ApiResponse> {
        validateConfig(config, true);
        const inputMessages = trimMessagesForContext(messages, config.contextMessages);
        let endpoint = `${config.baseUrl}/chat/completions`;
        let body: Record<string, unknown>;

        if (config.provider === 'claude') {
            endpoint = `${config.baseUrl}/messages`;

            const systemParts = inputMessages
                .filter(item => item && item.role === 'system')
                .map(item => typeof item.content === 'string' ? item.content : '')
                .filter(Boolean);

            const claudeMessages = inputMessages
                .filter(item => item && item.role !== 'system')
                .map(item => ({
                    role: item.role === 'assistant' ? 'assistant' : 'user',
                    content: typeof item.content === 'string' ? item.content : String(item.content ?? '')
                }));

            body = {
                model: config.model,
                messages: claudeMessages,
                max_tokens: Math.round(clampNumber(config.maxTokens, 1, 32768, 2048)),
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
                [completionTokenKey]: Math.round(clampNumber(config.maxTokens, 1, 32768, 2048)),
                stream: !!config.stream
            };
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
