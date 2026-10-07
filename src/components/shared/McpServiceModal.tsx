import { PressedButton } from './PressedButton';
import { useMcp } from '../../providers/McpProvider';
/** 原页面的静态结构；所有页面保持挂载，由原脚本切换显示状态。 */
export function McpServiceModal() {
 const mcp = useMcp();
  return <div className={`mcp-modal${mcp.modalOpen ? ' open' : ''}`} id="mcpServiceModal" ref={mcp.modalRef} aria-hidden={!mcp.modalOpen} onClick={event=>{if(event.target===event.currentTarget)mcp.closeModal();}}>
      {"\n        "}
      <div className="mcp-modal-card" role="dialog" aria-modal="true" aria-label="编辑 MCP 服务">
        {"\n            "}
        <div className="mcp-modal-head">
          {"\n                "}
          <div className="mcp-modal-title" id="mcpServiceModalTitle">{mcp.modalTitle}
          </div>
          {"\n                "}
          <PressedButton className="mcp-modal-close" id="mcpServiceModalClose" onClick={mcp.closeModal} type="button" aria-label="关闭">
            {"×"}
          </PressedButton>
          {"\n            "}
        </div>
        {"\n            "}
        <div className="mcp-wizard-band" aria-hidden="true">
          {"\n                "}
          <div>
            <b>
              {"连接远程服务"}
            </b>
            <span>
              {"填写服务器信息，保存后就能使用它提供的工具。"}
            </span>
          </div>
          {"\n                "}
          <i />
          {"\n            "}
        </div>
        {"\n            "}
        <div className="mcp-modal-body">
          {"\n                "}
          <label className="mcp-field">
            {"\n                    "}
            <span className="mcp-field-label">
              {"名称"}
            </span>
            {"\n                    "}
            <input className="mcp-input" id="mcpNameInput" value={mcp.draft.name} onChange={event=>mcp.field('name', event.currentTarget.value)} type="text" autoComplete="off" placeholder="例如：4399" />
            {"\n                "}
          </label>
          {"\n                "}
          <label className="mcp-field">
            {"\n                    "}
            <span className="mcp-field-label">
              {"描述"}
            </span>
            {"\n                    "}
            <textarea className="mcp-textarea" id="mcpDescriptionInput" value={mcp.draft.description} onChange={event=>mcp.field('description', event.currentTarget.value)} placeholder="简单说明这个 MCP 服务提供什么功能" />
            {"\n                "}
          </label>
          {"\n                "}
          <div className="mcp-desc-actions">
            {"\n                    "}
            <PressedButton className="mcp-ai-desc-btn ui-cyan-btn" id="mcpGenerateDescBtn" disabled={mcp.generating} onClick={mcp.generateDescription} type="button">{mcp.generating ? '生成中…' : '家机生成描述'}
            </PressedButton>
            {"\n                "}
          </div>
          {"\n                "}
          <label className="mcp-field">
            {"\n                    "}
            <span className="mcp-field-label">
              {"主机地址"}
            </span>
            {"\n                    "}
            <input className="mcp-input" id="mcpUrlInput" value={mcp.draft.url} onChange={event=>mcp.field('url', event.currentTarget.value)} type="url" inputMode="url" autoComplete="off" placeholder="https://example.com/mcp" />
            {"\n                "}
          </label>
          {"\n                "}
          <label className="mcp-field">
            {"\n                    "}
            <span className="mcp-field-label">
              {"连接类型"}
            </span>
            {"\n                    "}
            <PressedButton className="mcp-select-btn" id="mcpTransportBtn" onClick={mcp.selectTransport} type="button">{mcp.draft.transport === 'sse' ? 'SSE（兼容旧服务）' : 'Streamable HTTP'}
            </PressedButton>
            {"\n                    "}
            <select className="mcp-select" id="mcpTransportSelect" value={mcp.draft.transport} onChange={event=>mcp.field('transport', event.currentTarget.value === 'sse' ? 'sse' : 'streamable-http')} hidden>
              {"\n                        "}
              <option value="streamable-http">
                {"Streamable HTTP"}
              </option>
              {"\n                        "}
              <option value="sse">
                {"SSE（兼容旧服务）"}
              </option>
              {"\n                    "}
            </select>
            {"\n                "}
          </label>
          {"\n                "}
          <label className="mcp-field">
            {"\n                    "}
            <span className="mcp-field-label">
              {"Bearer Token（可选）"}
            </span>
            {"\n                    "}
            <input className="mcp-input" id="mcpTokenInput" value={mcp.draft.token} onChange={event=>mcp.field('token', event.currentTarget.value)} type="password" autoComplete="off" placeholder="Bearer Token" />
            {"\n                "}
          </label>
          {"\n\n                "}
          <div className="mcp-header-title-row">
            {"\n                    "}
            <span className="mcp-header-title">
              {"自定义请求头"}
            </span>
            {"\n                    "}
            <PressedButton className="mcp-header-add-btn ui-cyan-btn" id="mcpAddHeaderBtn" onClick={()=>mcp.field('headers',[...mcp.draft.headers,{key:'',value:''}])} type="button">
              {"添加请求头"}
            </PressedButton>
            {"\n                "}
          </div>
          {"\n                "}
          <div className="mcp-header-list" id="mcpHeaderList">{mcp.draft.headers.map((header,index)=><div className="mcp-header-row" key={index}><input className="mcp-input" type="text" placeholder="Header" value={header.key} onChange={event=>mcp.field('headers',mcp.draft.headers.map((h,i)=>i===index?{...h,key:event.currentTarget.value}:h))}/><input className="mcp-input" type="text" placeholder="Value" value={header.value} onChange={event=>mcp.field('headers',mcp.draft.headers.map((h,i)=>i===index?{...h,value:event.currentTarget.value}:h))}/><PressedButton type="button" className="mcp-header-remove" onClick={()=>mcp.field('headers',mcp.draft.headers.filter((_,i)=>i!==index))}>×</PressedButton></div>)}</div>
          {"\n\n                "}
          <div className="mcp-modal-tools">
            {"\n                    "}
            <PressedButton className="mcp-modal-tool-btn" id="mcpTestBtn" disabled={mcp.testing} onClick={mcp.testService} type="button">{mcp.testing ? '连接中…' : '测试连接'}
            </PressedButton>
            {"\n                    "}
            <PressedButton className="mcp-modal-tool-btn danger" id="mcpDeleteBtn" onClick={mcp.deleteService} type="button" hidden={!mcp.deleteVisible}>
              {"删除服务"}
            </PressedButton>
            {"\n                "}
          </div>
          {"\n                "}
          <div className={`mcp-modal-status${mcp.status.type ? ' '+mcp.status.type : ''}`} id="mcpModalStatus" aria-live="polite">{mcp.status.message}</div>
          {"\n            "}
        </div>
        {"\n            "}
        <div className="mcp-modal-actions">
          {"\n                "}
          <PressedButton className="mcp-modal-btn" id="mcpCancelBtn" onClick={mcp.closeModal} type="button">
            {"取消"}
          </PressedButton>
          {"\n                "}
          <PressedButton className="mcp-modal-btn primary ui-cyan-btn" id="mcpSaveBtn" onClick={mcp.saveService} type="button">
            {"保存"}
          </PressedButton>
          {"\n            "}
        </div>
        {"\n        "}
      </div>
      {"\n    "}
    </div>;
}
