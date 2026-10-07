import { useApi } from '../../providers/ApiProvider';
import { PressedButton } from './PressedButton';
/** React 管理选择、搜索和确认事件。 */
export function ApiModelModal() {
  const api = useApi();
  return <div className={`api-model-modal${api.modelPicker.open ? ' open' : ''}`} id="apiModelModal" ref={api.modelModalRef} aria-hidden={!api.modelPicker.open} onClick={event => { if(event.target === event.currentTarget) api.closeModel(); }}>
      {"\n        "}
      <div className="api-model-sheet" role="dialog" aria-modal="true" aria-label="选择模型">
        {"\n            "}
        <div className="api-model-sheet-head">
          {"\n                "}
          <div className="api-model-sheet-title" id="apiModelSheetTitle">{api.modelPicker.title}
          </div>
          {"\n                "}
          <PressedButton className="api-model-refresh" id="apiModelRefreshBtn" onClick={api.refreshModels} disabled={!!api.busy.refresh} type="button" aria-label="重新获取模型" data-title="重新获取模型">
            {"\n                    "}
            <svg viewBox="0 0 24 24" aria-hidden="true">
              {"\n                        "}
              <path d="M20 11a8 8 0 1 0-2.34 5.66" />
              {"\n                        "}
              <polyline points="20 4 20 11 13 11" />
              {"\n                    "}
            </svg>
            {"\n                "}
          </PressedButton>
          {"\n            "}
        </div>
        {"\n\n            "}
        <div className="api-model-search-wrap">
          {"\n                "}
          <svg viewBox="0 0 24 24" aria-hidden="true">
            {"\n                    "}
            <circle cx="11" cy="11" r="6.5" />
            {"\n                    "}
            <path d="M16 16l4 4" />
            {"\n                "}
          </svg>
          {"\n                "}
          <input className="api-model-search" id="apiModelSearchInput" value={api.modelPicker.query} onChange={event => api.searchModels(event.currentTarget.value)} type="search" autoComplete="off" placeholder="搜索模型" />
          {"\n            "}
        </div>
        {"\n\n            "}
        <div className="api-model-list" id="apiModelList">{api.visibleModels.length ? api.visibleModels.map(model => <PressedButton type="button" key={`${api.modelPicker.revision}-${model}`} className={`api-model-item${api.modelPicker.selected === model ? " selected" : ""}`} data-model={model} onClick={() => api.selectModel(model)}><span className="api-model-check" aria-hidden="true" /><span className="api-model-name">{api.modelName(model)}</span></PressedButton>) : api.modelPicker.revision > 0 ? <div className="api-model-empty">{api.modelPicker.models.length ? "没有符合搜索条件的模型" : "接口没有返回可用模型"}</div> : null}</div>
        {"\n\n            "}
        <div className="api-model-footer">
          {"\n                "}
          <div className="api-model-meta" id="apiModelMeta">
            {`已显示 ${api.visibleModels.length} 个模型 · ${api.modelPicker.selected ? "已选中 1 个" : "未选择"}`}
          </div>
          {"\n                "}
          <div className="api-model-actions">
            {"\n                    "}
            <PressedButton className="api-model-action" id="apiModelClose" onClick={api.closeModel} type="button">
              {"关闭"}
            </PressedButton>
            {"\n                    "}
            <PressedButton className="api-model-action primary ui-cyan-btn" id="apiModelConfirm" onClick={api.confirmModel} type="button" disabled={!api.modelPicker.selected}>
              {"确定"}
            </PressedButton>
            {"\n                "}
          </div>
          {"\n            "}
        </div>
        {"\n        "}
      </div>
      {"\n    "}
    </div>;
}
