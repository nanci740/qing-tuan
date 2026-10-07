import type { ApiConfig, ApiStats, ApiLog } from '../types/api';
export const API_STORAGE_KEY = 'smallphone_api_settings_v1';
export const API_STATS_KEY = 'smallphone_api_stats_v1';
export const API_LOG_KEY = 'smallphone_api_log_v1';
export function getSavedConfig(): (ApiConfig & { lastOk?: boolean; updatedAt?: number }) | null { try { return JSON.parse(localStorage.getItem(API_STORAGE_KEY) || 'null'); } catch { return null; } }
export function getApiStats(): ApiStats { try { return JSON.parse(localStorage.getItem(API_STATS_KEY) || 'null') || emptyStats(); } catch { return emptyStats(); } }
function emptyStats(): ApiStats { return { requests: 0, success: 0, failed: 0, inputTokens: 0, outputTokens: 0, totalTokens: 0, lastLatency: null, lastAt: null }; }
export function getApiLogs(): ApiLog[] { try { return JSON.parse(localStorage.getItem(API_LOG_KEY) || '[]'); } catch { return []; } }
export function saveApiStats(stats: ApiStats) { try { localStorage.setItem(API_STATS_KEY, JSON.stringify(stats)); } catch {} }
export function pushApiLog(entry: ApiLog) { try { const logs = getApiLogs(); localStorage.setItem(API_LOG_KEY, JSON.stringify([entry, ...(Array.isArray(logs) ? logs : [])].slice(0, 12))); } catch {} }
export const API_PROVIDER_PRESETS: Record<string, { baseUrl: string; modelPlaceholder: string }> = {
  'openai-compatible': { baseUrl: 'https://api.openai.com/v1', modelPlaceholder: '输入或获取模型名称' },
  gemini: { baseUrl: 'https://generativelanguage.googleapis.com/v1beta/openai', modelPlaceholder: 'gemini-3.8-flash' },
  grok: { baseUrl: 'https://api.x.ai/v1', modelPlaceholder: 'grok-4.6' },
  deepseek: { baseUrl: 'https://api.deepseek.com', modelPlaceholder: 'deepseek-flash' },
  claude: { baseUrl: 'https://api.anthropic.com/v1', modelPlaceholder: '选择或输入 Claude 模型' },
  'custom-compatible': { baseUrl: '', modelPlaceholder: '输入或获取模型名称' },
};
export function getProviderLabel(value: string) { return ({ gemini: 'Gemini', grok: 'Grok / xAI', deepseek: 'DeepSeek', claude: 'Claude / Anthropic', 'custom-compatible': '自定义兼容接口' } as Record<string,string>)[value] || 'OpenAI Compatible'; }
export const PROVIDER_OPTIONS = ['openai-compatible', 'gemini', 'grok', 'deepseek', 'claude', 'custom-compatible'];
