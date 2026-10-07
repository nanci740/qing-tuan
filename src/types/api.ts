export interface ApiConnection { provider: string; baseUrl: string; apiKey: string; model: string }
export interface ApiConfig extends ApiConnection { temperature: number; maxTokens: number; topP: number; contextMessages: number; timeoutSeconds: number; retryCount: number; stream: boolean; fallbackEnabled: boolean; fallback: ApiConnection; featureModels: Record<string, string> }
export interface ApiMessage { role: string; content: unknown }
export interface ApiUsage { prompt_tokens?: number; completion_tokens?: number; input_tokens?: number; output_tokens?: number; total_tokens?: number }
export interface ApiResponse { model?: string; text?: string; stream?: boolean; usage?: ApiUsage; choices?: { message?: { content?: string }; delta?: { content?: string } }[]; content?: { text?: string }[]; output_text?: string; delta?: { text?: string }; content_block?: { text?: string }; message?: { model?: string; usage?: ApiUsage } }
export type ApiChunkHandler = (chunk: string, collected: string) => void;
export type ApiOverrides = Partial<ApiConfig> & { feature?: string; onChunk?: ApiChunkHandler };
export interface ApiStats { requests: number; success: number; failed: number; inputTokens: number; outputTokens: number; totalTokens: number; lastLatency: number | null; lastAt: number | null }
export interface ApiLog { ok: boolean; model: string; latency: number; time: number; fallback: boolean; error?: string }
export interface ApiService { getConfig: () => ApiConfig; getSavedConfig: () => (ApiConfig & { lastOk?: boolean; updatedAt?: number }) | null; getStats: () => ApiStats; getLogs: () => ApiLog[]; getModelForFeature: (feature: string) => string; fetchModels: (config?: ApiConnection) => Promise<string[]>; requestChat: (messages: ApiMessage[], overrides?: ApiOverrides) => Promise<ApiResponse> }
