import { PressedButton } from './PressedButton';
import { useMcp } from '../../providers/McpProvider';
/** 原页面的静态结构；所有页面保持挂载，由原脚本切换显示状态。 */
export function McpToolsModal() {
 const mcp = useMcp();
  return <div className={`mcp-modal${mcp.toolsOpen ? ' open' : ''}`} id="mcpToolsModal" ref={mcp.toolsRef} aria-hidden={!mcp.toolsOpen} onClick={event=>{if(event.target===event.currentTarget)mcp.closeTools();}}>
      {"\n        "}
      <div className="mcp-modal-card mcp-tools-card" role="dialog" aria-modal="true" aria-label="MCP 工具权限">
        {"\n            "}
        <div className="mcp-modal-head">
          {"\n                "}
          <div className="mcp-modal-title" id="mcpToolsTitle">{mcp.toolPanel?.title || '工具权限'}
          </div>
          {"\n                "}
          <PressedButton className="mcp-modal-close" id="mcpToolsClose" onClick={mcp.closeTools} type="button" aria-label="关闭">
            {"×"}
          </PressedButton>
          {"\n            "}
        </div>
        {"\n            "}
        <div className="mcp-tool-list" id="mcpToolList">{mcp.toolPanel && (mcp.toolPanel.tools.length ? mcp.toolPanel.tools.map((tool,index)=><div className="mcp-tool-item" key={`${mcp.toolsRevision}-${index}`}><div><div className="mcp-tool-item-name">{tool.name}</div><div className="mcp-tool-item-desc">{tool.description || '未提供工具描述'}</div></div><input type="checkbox" className="mcp-switch" checked={tool.enabled!==false} onChange={event=>mcp.toggleTool(index,event.currentTarget.checked)}/></div>):<div className="mcp-empty">还没有工具信息，可以点“刷新工具”从服务读取。</div>)}</div>
        {"\n            "}
        <div className="mcp-tools-footer">
          {"\n                "}
          <PressedButton className="mcp-modal-btn" id="mcpRefreshToolsBtn" disabled={mcp.refreshing} onClick={mcp.refreshTools} type="button">{mcp.refreshing ? '刷新中…' : '刷新工具'}
          </PressedButton>
          {"\n                "}
          <PressedButton className="mcp-modal-btn primary ui-cyan-btn" id="mcpToolsDoneBtn" onClick={mcp.closeTools} type="button">
            {"完成"}
          </PressedButton>
          {"\n            "}
        </div>
        {"\n        "}
      </div>
      {"\n    "}
    </div>;
}
