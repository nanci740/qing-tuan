import { PressedButton } from '../../../components/shared/PressedButton';
import { useMcp } from '../../../providers/McpProvider';
export function McpServiceList() {
  const mcp = useMcp();
  if (!mcp.state.services.length) return <div className="mcp-card mcp-empty">还没有 MCP 服务。<br/>添加远程服务后，可以在这里管理工具与权限。</div>;
  return mcp.state.services.map(service => {
    const enabledTools = service.tools.filter(tool => tool.enabled !== false);
    return <div className="mcp-service-card" key={service.id}>
      <div className="mcp-service-head"><div className="mcp-service-icon"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 3h3a2 2 0 1 1 4 0h3a2 2 0 0 1 2 2v3h-1a2 2 0 1 0 0 4h1v5a2 2 0 0 1-2 2h-5v-1a2 2 0 1 0-4 0v1H5a2 2 0 0 1-2-2v-4h1a2 2 0 1 0 0-4H3V5a2 2 0 0 1 2-2h3Z"/></svg></div><div style={{minWidth:'0'}}><div className="mcp-service-name-row"><div className="mcp-service-name">{service.name || '未命名服务'}</div><span className="mcp-service-kind">{service.transport === 'sse' ? 'SSE' : '远程'}</span></div><div className="mcp-service-desc">{service.description || service.url || '未填写描述'}</div></div><input type="checkbox" className="mcp-switch" checked={service.enabled} onChange={event => mcp.setServiceEnabled(service.id, event.currentTarget.checked)}/></div>
      <div className="mcp-tools-row"><div className="mcp-tool-chips">{service.tools.length ? enabledTools.length ? enabledTools.slice(0,4).map(tool=><span className="mcp-tool-chip" key={tool.name}>{tool.name}</span>) : <span className="mcp-tools-empty">工具已全部关闭</span> : <span className="mcp-tools-empty">尚未获取工具</span>}</div><PressedButton type="button" className="mcp-tools-open" aria-label="打开工具权限" onClick={()=>mcp.openTools(service.id)}/></div>
      <div className="mcp-service-foot"><span className={`mcp-service-status ${service.status || 'idle'}`}>{service.statusText || '尚未测试'}</span><PressedButton type="button" className="mcp-edit-btn" onClick={()=>mcp.openModal(service.id)}>编辑</PressedButton></div>
    </div>;
  });
}
