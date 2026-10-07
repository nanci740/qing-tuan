export interface McpHeader { key: string; value: string }
export interface McpTool { name: string; description: string; enabled: boolean; inputSchema: unknown }
export interface McpService { id: string; name: string; description: string; url: string; transport: 'sse' | 'streamable-http'; token: string; headers: McpHeader[]; enabled: boolean; tools: McpTool[]; status: 'idle' | 'online' | 'error'; statusText: string; lastChecked: string }
export interface McpState { enabled: boolean; services: McpService[] }
export interface RawMcpTool { name?: string; description?: string; inputSchema?: unknown }
