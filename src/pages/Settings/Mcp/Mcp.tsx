import { PressedButton } from '../../../components/shared/PressedButton';
import { useMcp } from '../../../providers/McpProvider';
import { McpServiceList } from './McpServiceList';
/** 原页面的静态结构；所有页面保持挂载，由原脚本切换显示状态。 */
export function Mcp() {
 const mcp = useMcp();
  return <div className={`settings-page${mcp.pageOpen ? ' active' : ''}`} id="mcpSettingsPage" style={{
    "zIndex": "2050"
  }}>
      {"\n        "}
      <div className="settings-header">
        {"\n            "}
        <div style={{
        "display": "flex",
        "alignItems": "center",
        "gap": "8px"
      }}>
          {"\n                "}
          <PressedButton className="back-btn" id="mcpBackBtn" onClick={event=>{event.stopPropagation();mcp.closePage();}} type="button" aria-label="返回设置" data-title="返回设置">
            {"\n                    "}
            <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="15 18 9 12 15 6" />
            </svg>
            {"\n                "}
          </PressedButton>
          {"\n                "}
          <h2>
            {"MCP 设置"}
          </h2>
          {"\n            "}
        </div>
        {"\n        "}
      </div>
      {"\n        "}
      <div className="retro-address-bar" aria-hidden="true">
        {"\n            "}
        <span className="retro-address-label">
          {"地址"}
        </span>
        {"\n            "}
        <span className="retro-address-field">
          <span className="retro-address-icon" />
          {"C:\\青团\\设置\\MCP 设置\\"}
        </span>
        {"\n        "}
      </div>
      {"\n\n        "}
      <div className="mcp-settings-content">
        {"\n            "}
        <section className="mcp-setting-group">
          {"\n                "}
          <div className="mcp-setting-label">
            {"MCP 状态"}
          </div>
          {"\n                "}
          <div className="mcp-card mcp-master-card">
            {"\n                    "}
            <div>
              {"\n                        "}
              <div className="mcp-master-title">
                {"启用 MCP"}
              </div>
              {"\n                        "}
              <div className="mcp-master-desc">
                {"允许家机使用已启用服务提供的工具"}
              </div>
              {"\n                    "}
            </div>
            {"\n                    "}
            <div className="mcp-master-side">
              {"\n                        "}
              <span className="mcp-count" id="mcpCount">{`${mcp.state.enabled ? mcp.state.services.filter(s=>s.enabled).length : 0} / ${mcp.state.services.length}`}
              </span>
              {"\n                        "}
              <input className="mcp-switch" id="mcpMasterEnabled" checked={mcp.state.enabled} onChange={event=>mcp.setMaster(event.currentTarget.checked)} type="checkbox" />
              {"\n                    "}
            </div>
            {"\n                "}
          </div>
          {"\n            "}
        </section>
        {"\n\n            "}
        <section className="mcp-setting-group">
          {"\n                "}
          <div className="mcp-setting-label">
            {"已连接服务"}
          </div>
          {"\n                "}
          <div className="mcp-service-list" id="mcpServiceList"><McpServiceList/></div>
          {"\n                "}
          <PressedButton className="mcp-add-btn ui-cyan-btn" id="mcpAddServiceBtn" onClick={()=>mcp.openModal()} type="button">
            {"添加 MCP 服务"}
          </PressedButton>
          {"\n            "}
        </section>
        {"\n        "}
      </div>
      {"\n    "}
    </div>;
}
