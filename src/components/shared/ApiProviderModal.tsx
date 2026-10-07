import { useApi } from '../../providers/ApiProvider';
import { PROVIDER_OPTIONS, getProviderLabel } from '../../utils/apiStorage';
import { PressedButton } from './PressedButton';
/** React 管理选择、搜索和确认事件。 */
export function ApiProviderModal() {
  const api = useApi();
  return <div className={`api-model-modal${api.providerPicker.open ? ' open' : ''}`} id="apiProviderModal" ref={api.providerModalRef} aria-hidden={!api.providerPicker.open} onClick={event => { if(event.target === event.currentTarget) api.closeProvider(); }}>
      {"\n        "}
      <div className="api-model-sheet api-provider-sheet" role="dialog" aria-modal="true" aria-label="选择接口类型">
        {"\n            "}
        <div className="api-model-sheet-head">
          {"\n                "}
          <div className="api-model-sheet-title" id="apiProviderSheetTitle">{api.providerPicker.title}
          </div>
          {"\n                "}
          <PressedButton className="api-model-close" id="apiProviderClose" onClick={api.closeProvider} type="button" aria-label="关闭接口类型选择">
            {"×"}
          </PressedButton>
          {"\n            "}
        </div>
        {"\n            "}
        <div className="api-model-list api-provider-list" id="apiProviderList">{api.providerPicker.revision > 0 && PROVIDER_OPTIONS.filter(value => api.providerPicker.target === "provider" || value !== "grok").map(value => <PressedButton type="button" key={`${api.providerPicker.revision}-${value}`} className={`api-model-item${api.providerPicker.selected === value ? " selected" : ""}`} data-value={value} onClick={() => api.selectProvider(value)}><span className="api-model-check" aria-hidden="true" /><span className="api-model-name">{getProviderLabel(value)}</span></PressedButton>)}</div>
        {"\n            "}
        <div className="api-model-actions">
          {"\n                "}
          <PressedButton className="api-model-action" id="apiProviderCancel" onClick={api.closeProvider} type="button">
            {"取消"}
          </PressedButton>
          {"\n                "}
          <PressedButton className="api-model-action primary ui-cyan-btn" id="apiProviderConfirm" onClick={api.confirmProvider} disabled={api.providerPicker.revision > 0 && !api.providerPicker.selected} type="button">
            {"确定"}
          </PressedButton>
          {"\n            "}
        </div>
        {"\n        "}
      </div>
      {"\n    "}
    </div>;
}
