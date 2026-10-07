import type { McpService, McpTool, RawMcpTool } from '../types/mcp';
interface RpcResponse { result?: { tools?: RawMcpTool[] }; error?: { message?: string } }
function parseMcpResponse(text: string): RpcResponse | null {
  const trimmed = String(text || '').trim(); if (!trimmed) return null;
  try { return JSON.parse(trimmed); } catch { /* 部分服务以 SSE data 行返回。 */ }
  const lines = trimmed.split(/\r?\n/).filter(line => line.startsWith('data:')).map(line => line.slice(5).trim()).filter(Boolean);
  for (const line of lines) { try { const parsed = JSON.parse(line); if (parsed && (parsed.result !== undefined || parsed.error)) return parsed; } catch { /* 保留原逐行尝试。 */ } }
  return null;
}
function buildHeaders(service: McpService, extra: Record<string, string> = {}) {
  const headers: Record<string, string> = { 'Content-Type': 'application/json', Accept: 'application/json, text/event-stream' };
  if (service.token) headers.Authorization = service.token.startsWith('Bearer ') ? service.token : `Bearer ${service.token}`;
  service.headers.forEach(h => { if (h.key) headers[h.key] = h.value || ''; }); return Object.assign(headers, extra);
}
async function postRpc(service: McpService, body: Record<string, unknown>, extra: Record<string, string> = {}) {
  let response: Response;
  try { response = await fetch(service.url, { method: 'POST', headers: buildHeaders(service, extra), body: JSON.stringify(body) }); }
  catch { throw new Error('无法连接服务；如果地址可用，可能被浏览器 CORS 跨域限制'); }
  const data = parseMcpResponse(await response.text());
  if (!response.ok) throw Object.assign(new Error(data?.error?.message || `HTTP ${response.status}`), { status: response.status, data });
  if (data?.error) throw new Error(data.error.message || 'MCP 返回错误');
  return { data, response };
}
async function listToolsModern(service: McpService) {
  const { data } = await postRpc(service, { jsonrpc: '2.0', id: Date.now(), method: 'tools/list', params: { _meta: { 'io.modelcontextprotocol/clientInfo': { name: 'Qingtuan Phone', version: '1.0.0' }, 'io.modelcontextprotocol/clientCapabilities': {} } } }, { 'MCP-Protocol-Version': '2026-07-28', 'Mcp-Method': 'tools/list' });
  if (!data?.result) throw new Error('服务没有返回 tools/list 结果'); return data.result.tools || [];
}
async function listToolsLegacy(service: McpService) {
  const init = await postRpc(service, { jsonrpc: '2.0', id: Date.now(), method: 'initialize', params: { protocolVersion: '2025-11-25', capabilities: {}, clientInfo: { name: 'Qingtuan Phone', version: '1.0.0' } } });
  const sessionId = init.response.headers.get('Mcp-Session-Id') || init.response.headers.get('mcp-session-id') || '';
  const extra: Record<string, string> = sessionId ? { 'Mcp-Session-Id': sessionId } : {};
  try { await fetch(service.url, { method: 'POST', headers: buildHeaders(service, extra), body: JSON.stringify({ jsonrpc: '2.0', method: 'notifications/initialized', params: {} }) }); } catch { /* 原通知失败回退。 */ }
  const { data } = await postRpc(service, { jsonrpc: '2.0', id: Date.now() + 1, method: 'tools/list', params: {} }, extra);
  if (!data?.result) throw new Error('服务没有返回 tools/list 结果'); return data.result.tools || [];
}
export async function fetchServiceTools(service: McpService) {
  if (!service.url) throw new Error('请先填写主机地址');
  if (service.transport === 'sse') throw new Error('SSE 旧式连接可保存；当前浏览器内测试先支持 Streamable HTTP');
  try { return await listToolsModern(service); } catch (modernError) { try { return await listToolsLegacy(service); } catch (legacyError) { throw legacyError instanceof Error && legacyError.message ? legacyError : modernError; } }
}
export function mergeMcpTools(service: McpService, rawTools: RawMcpTool[]): McpTool[] {
  const previous = new Map(service.tools.map(t => [t.name, t]));
  return (rawTools || []).map(t => ({ name: String(t.name || ''), description: String(t.description || ''), enabled: previous.has(t.name || '') ? previous.get(t.name || '')?.enabled !== false : true, inputSchema: t.inputSchema || null })).filter(t => t.name);
}
