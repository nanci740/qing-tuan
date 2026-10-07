import type { McpService, McpState } from '../types/mcp';
const KEY = 'smallphone_mcp_settings_v1';
export function createMcpId() { return 'mcp_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 7); }
export function normalizeMcpService(service: Partial<McpService>): McpService {
  return {
    id: service.id || createMcpId(), name: String(service.name || '').trim(), description: String(service.description || '').trim(), url: String(service.url || '').trim(), transport: service.transport === 'sse' ? 'sse' : 'streamable-http', token: String(service.token || '').trim(),
    headers: Array.isArray(service.headers) ? service.headers.filter(h => h && (h.key || h.value)).map(h => ({ key: String(h.key || '').trim(), value: String(h.value || '').trim() })) : [],
    enabled: service.enabled !== false,
    tools: Array.isArray(service.tools) ? service.tools.map(t => ({ name: String(t.name || ''), description: String(t.description || ''), enabled: t.enabled !== false, inputSchema: t.inputSchema || null })) : [],
    status: ['online', 'error'].includes(service.status || '') ? service.status as 'online' | 'error' : 'idle', statusText: String(service.statusText || '尚未测试'), lastChecked: service.lastChecked || '',
  };
}
export function loadMcpState(): McpState {
  try { const saved = JSON.parse(localStorage.getItem(KEY) || 'null'); if (saved && typeof saved === 'object') return { enabled: saved.enabled === true, services: Array.isArray(saved.services) ? saved.services.map(normalizeMcpService) : [] }; } catch { /* 原存档回退。 */ }
  return { enabled: false, services: [] };
}
export function saveMcpState(state: McpState) { localStorage.setItem(KEY, JSON.stringify(state)); }
