import { PressedButton } from '../../../components/shared/PressedButton';
import { useApi } from '../../../providers/ApiProvider';
import { getProviderLabel } from '../../../utils/apiStorage';
/** API 连接、模型分配及高级参数由 React 状态管理。 */
export function Api() {
  const api = useApi();
  const last = Array.isArray(api.logs) ? api.logs[0] : null;
  const lastRequest = last ? `${last.ok ? '成功' : '失败'} · ${last.model || '未知模型'} · ${last.latency ?? '—'}ms · ${new Date(last.time).toLocaleString([], {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  })}` : '还没有请求记录。';
  return <div id="apiSettingsPage" ref={api.pageRef} className={`settings-page${api.pageOpen ? ' active' : ''}`} style={{
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
          <PressedButton className="back-btn" id="apiBackBtn" onClick={event => {
          event.stopPropagation();
          api.closePage();
        }} type="button" aria-label="返回设置" data-title="返回设置">
            {"\n                    "}
            <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              {"\n                        "}
              <polyline points="15 18 9 12 15 6" />
              {"\n                    "}
            </svg>
            {"\n                "}
          </PressedButton>
          {"\n                "}
          <h2>
            {"API 设置"}
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
          {"C:\\青团\\设置\\API 设置\\"}
        </span>
        {"\n        "}
      </div>
      {"\n\n        "}
      <div className="api-settings-content">
        {"\n            "}
        <section className="api-setting-group">
          {"\n                "}
          <div className="api-setting-label">
            {"使用状态"}
          </div>
          {"\n                "}
          <div className="api-stats-grid">
            {"\n                    "}
            <div className="api-stat-chip">
              <strong id="apiStatRequests">{String(api.stats.requests || 0)}
              </strong>
              <span>
                {"请求次数"}
              </span>
            </div>
            {"\n                    "}
            <div className="api-stat-chip">
              <strong id="apiStatTokens">{String(api.stats.totalTokens || 0)}
              </strong>
              <span>
                {"累计 Tokens"}
              </span>
            </div>
            {"\n                    "}
            <div className="api-stat-chip">
              <strong id="apiStatLatency">{Number.isFinite(api.stats.lastLatency) ? `${api.stats.lastLatency}ms` : '—'}
              </strong>
              <span>
                {"最近延迟"}
              </span>
            </div>
            {"\n                "}
          </div>
          {"\n                "}
          <div className="api-last-request" id="apiLastRequest">{lastRequest}
          </div>
          {"\n            "}
        </section>
        {"\n\n            "}
        <section className="api-setting-group">
          {"\n                "}
          <div className="api-setting-label">
            {"连接设置"}
          </div>
          {"\n                "}
          <div className="api-setting-card">
            {"\n                    "}
            <div className="api-row">
              {"\n                        "}
              <span className="api-row-label">
                {"接口类型"}
              </span>
              {"\n                        "}
              <PressedButton className="api-model-select-btn" id="apiProviderTypeBtn" onClick={() => api.openProvider('provider')} type="button">{getProviderLabel(api.form.provider)}</PressedButton>
              {"\n                        "}
              <select className="api-select" id="apiProviderType" value={api.form.provider} onChange={event => api.changeProvider('provider', event.currentTarget.value)} hidden>
                {"\n                            "}
                <option value="openai-compatible">
                  {"OpenAI Compatible"}
                </option>
                {"\n                            "}
                <option value="gemini">
                  {"Gemini"}
                </option>
                {"\n                            "}
                <option value="grok">
                  {"Grok / xAI"}
                </option>
                {"\n                            "}
                <option value="deepseek">
                  {"DeepSeek"}
                </option>
                {"\n                            "}
                <option value="claude">
                  {"Claude / Anthropic"}
                </option>
                {"\n                            "}
                <option value="custom-compatible">
                  {"自定义兼容接口"}
                </option>
                {"\n                        "}
              </select>
              {"\n                    "}
            </div>
            {"\n                    "}
            <label className="api-row">
              {"\n                        "}
              <span className="api-row-label">
                {"API 地址"}
              </span>
              {"\n                        "}
              <input className="api-input" id="apiBaseUrl" value={api.form.baseUrl} onChange={event => api.field('baseUrl', event.currentTarget.value)} type="url" inputMode="url" autoComplete="off" placeholder="https://example.com/v1" />
              {"\n                    "}
            </label>
            {"\n                    "}
            <label className="api-row">
              {"\n                        "}
              <span className="api-row-label">
                {"API Key"}
              </span>
              {"\n                        "}
              <span className="api-input-wrap">
                {"\n                            "}
                <input className="api-input" id="apiKeyInput" value={api.form.apiKey} onChange={event => api.field('apiKey', event.currentTarget.value)} type={api.keyVisible ? 'text' : 'password'} autoComplete="off" placeholder="sk-..." />
                {"\n                            "}
                <PressedButton className="api-key-toggle" id="apiKeyToggle" onClick={api.toggleKey} type="button" aria-label="显示或隐藏 API Key" data-title="显示或隐藏 API Key">
                  {"\n                                "}
                  <svg id="apiKeyEyeIcon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6S2 12 2 12z" />
                    <circle cx="12" cy="12" r="2.7" />
                  </svg>
                  {"\n                            "}
                </PressedButton>
                {"\n                        "}
              </span>
              {"\n                    "}
            </label>
            {"\n                    "}
            <label className="api-row">
              {"\n                        "}
              <span className="api-row-label">
                {"模型"}
              </span>
              {"\n                        "}
              <span className="api-input-wrap">
                {"\n                            "}
                <input className="api-input" id="apiModelInput" value={api.form.model} onChange={event => api.field('model', event.currentTarget.value)} type="text" autoComplete="off" placeholder={api.modelPlaceholder} />
                {"\n                            "}
                <PressedButton className={`api-mini-btn api-chevron-btn${api.busy.model ? ' is-loading' : ''}`} id="apiFetchModelsBtn" disabled={!!api.busy.model} onClick={() => api.loadModels('model')} type="button" aria-label="获取模型列表" data-title="获取模型列表" />
                {"\n                        "}
              </span>
              {"\n                    "}
            </label>
            {"\n                    "}
            <span className="api-hint">
              {"API Key 只保存在这台浏览器的本地储存中。测试连接会发送一条很短的请求。"}
            </span>
            {"\n                "}
          </div>
          {"\n            "}
        </section>
        {"\n\n            "}
        <section className="api-setting-group">
          {"\n                "}
          <div className="api-setting-label">
            {"备用连接"}
          </div>
          {"\n                "}
          <div className={`api-setting-card${api.form.fallbackEnabled ? '' : ' api-fallback-collapsed'}`}>
            {"\n                    "}
            <label className="api-row">
              {"\n                        "}
              <span className="api-row-label">
                {"启用备用 API"}
              </span>
              {"\n                        "}
              <input className="api-toggle-input" id="apiFallbackEnabled" checked={api.form.fallbackEnabled} onChange={event => api.changeFallback(event.currentTarget.checked)} type="checkbox" />
              {"\n                    "}
            </label>
            {"\n                    "}
            <div className={`api-fallback-box${api.form.fallbackEnabled ? ' open' : ''}`} id="apiFallbackBox">
              {"\n                        "}
              <div className="api-row">
                {"\n                            "}
                <span className="api-row-label">
                  {"接口类型"}
                </span>
                {"\n                            "}
                <PressedButton className="api-model-select-btn" id="apiFallbackProviderBtn" onClick={() => api.openProvider('fallbackProvider')} type="button">{getProviderLabel(api.form.fallbackProvider)}</PressedButton>
                {"\n                            "}
                <select className="api-select" id="apiFallbackProvider" value={api.form.fallbackProvider} onChange={event => api.changeProvider('fallbackProvider', event.currentTarget.value)} hidden>
                  {"\n                                "}
                  <option value="openai-compatible">
                    {"OpenAI Compatible"}
                  </option>
                  {"\n                                "}
                  <option value="gemini">
                    {"Gemini"}
                  </option>
                  {"\n                                "}
                  <option value="deepseek">
                    {"DeepSeek"}
                  </option>
                  {"\n                                "}
                  <option value="claude">
                    {"Claude / Anthropic"}
                  </option>
                  {"\n                                "}
                  <option value="custom-compatible">
                    {"自定义兼容接口"}
                  </option>
                  {"\n                            "}
                </select>
                {"\n                        "}
              </div>
              {"\n                        "}
              <label className="api-row">
                {"\n                            "}
                <span className="api-row-label">
                  {"API 地址"}
                </span>
                {"\n                            "}
                <input className="api-input" id="apiFallbackBaseUrl" value={api.form.fallbackBaseUrl} onChange={event => api.field('fallbackBaseUrl', event.currentTarget.value)} type="url" autoComplete="off" placeholder="https://..." />
                {"\n                        "}
              </label>
              {"\n                        "}
              <label className="api-row">
                {"\n                            "}
                <span className="api-row-label">
                  {"API Key"}
                </span>
                {"\n                            "}
                <input className="api-input" id="apiFallbackApiKey" value={api.form.fallbackApiKey} onChange={event => api.field('fallbackApiKey', event.currentTarget.value)} type="password" autoComplete="off" placeholder="sk-..." />
                {"\n                        "}
              </label>
              {"\n                        "}
              <div className="api-row">
                {"\n                            "}
                <span className="api-row-label">
                  {"备用模型"}
                </span>
                {"\n                            "}
                <PressedButton className={`api-model-select-btn${!api.form.fallbackModel.trim() ? ' is-default' : ''}${api.busy.fallbackModel ? ' is-loading' : ''}`} id="apiFallbackModelBtn" disabled={!!api.busy.fallbackModel} onClick={() => api.loadModels('fallbackModel')} type="button">{api.form.fallbackModel.trim() || '选择备用模型'}</PressedButton>
                {"\n                            "}
                <input id="apiFallbackModel" value={api.form.fallbackModel} onChange={event => api.field('fallbackModel', event.currentTarget.value)} type="hidden" />
                {"\n                        "}
              </div>
              {"\n                    "}
            </div>
            {"\n                "}
          </div>
          {"\n            "}
        </section>
        {"\n\n            "}
        <section className="api-setting-group">
          {"\n                "}
          <div className="api-setting-label">
            {"模型分配"}
          </div>
          {"\n                "}
          <div className="api-setting-card"><div className="api-sheet-head" aria-hidden="true"><span /><span>A 用途</span><span>B 模型</span></div>
            {"\n                    "}
            <div className="api-row">
              {"\n                        "}
              <span className="api-row-label">
                {"Chat 模型"}
              </span>
              {"\n                        "}
              <PressedButton className={`api-model-select-btn${!api.form.chat.trim() ? ' is-default' : ''}${api.busy.chat ? ' is-loading' : ''}`} id="apiChatModelBtn" disabled={!!api.busy.chat} onClick={() => api.loadModels('chat')} type="button">{api.form.chat.trim() || '默认主模型'}</PressedButton>
              {"\n                        "}
              <input id="apiChatModel" value={api.form.chat} onChange={event => api.field('chat', event.currentTarget.value)} type="hidden" />
              {"\n                    "}
            </div>
            {"\n                    "}
            <div className="api-row">
              {"\n                        "}
              <span className="api-row-label">
                {"日记模型"}
              </span>
              {"\n                        "}
              <PressedButton className={`api-model-select-btn${!api.form.diary.trim() ? ' is-default' : ''}${api.busy.diary ? ' is-loading' : ''}`} id="apiDiaryModelBtn" disabled={!!api.busy.diary} onClick={() => api.loadModels('diary')} type="button">{api.form.diary.trim() || '默认主模型'}</PressedButton>
              {"\n                        "}
              <input id="apiDiaryModel" value={api.form.diary} onChange={event => api.field('diary', event.currentTarget.value)} type="hidden" />
              {"\n                    "}
            </div>
            {"\n                    "}
            <div className="api-row">
              {"\n                        "}
              <span className="api-row-label">
                {"总结模型"}
              </span>
              {"\n                        "}
              <PressedButton className={`api-model-select-btn${!api.form.summary.trim() ? ' is-default' : ''}${api.busy.summary ? ' is-loading' : ''}`} id="apiSummaryModelBtn" disabled={!!api.busy.summary} onClick={() => api.loadModels('summary')} type="button">{api.form.summary.trim() || '默认主模型'}</PressedButton>
              {"\n                        "}
              <input id="apiSummaryModel" value={api.form.summary} onChange={event => api.field('summary', event.currentTarget.value)} type="hidden" />
              {"\n                    "}
            </div>
            {"\n                "}
          </div>
          {"\n            "}
        </section>
        {"\n\n            "}
        <section className="api-setting-group">
          {"\n                "}
          <div className="api-setting-label">
            {"连接状态"}
          </div>
          {"\n                "}
          <div className={`api-status-card${api.status.badge === 'WAIT' ? ' is-waiting' : ''}${api.status.type === 'ok' ? ' is-ok' : api.status.type === 'error' ? ' is-error' : ''}`} id="apiStatusCard">
            {"\n                    "}
            <div className="api-status-left">
              {"\n                        "}
              <div className="api-status-title">
                <span className="api-status-dot" />
                <span id="apiStatusTitle">{api.status.title}
                </span>
              </div>
              {"\n                        "}
              <div className="api-status-desc" id="apiStatusDesc">{api.status.desc}
              </div>
              {"\n                    "}
            </div>
            {"\n                    "}
            <span className={`api-status-badge${api.status.badge === 'SAVED' ? ' is-saved' : ''}`} id="apiStatusBadge">{api.status.badge}
            </span>
            {"\n                "}
          </div>
          {"\n                "}
          <div className="api-actions">
            {"\n                    "}
            <PressedButton className="api-action-btn ui-cyan-btn" id="apiTestBtn" disabled={!!api.busy.test} onClick={api.testConnection} type="button">{api.busy.test ? '测试中…' : '测试连接'}
            </PressedButton>
            {"\n                    "}
            <PressedButton className="api-action-btn primary ui-cyan-btn" id="apiSaveBtn" onClick={() => api.handleSave()} type="button">
              {"保存设置"}
            </PressedButton>
            {"\n                "}
          </div>
          {"\n            "}
        </section>
        {"\n\n            "}
        <section className="api-setting-group">
          {"\n                "}
          <div className="api-setting-label">
            {"模型参数"}
          </div>
          {"\n                "}
          <div className="api-setting-card">
            {"\n                    "}
            <PressedButton className={`api-advanced-toggle${api.advancedOpen ? ' open' : ''}`} id="apiAdvancedToggle" onClick={api.toggleAdvanced} type="button">
              {"\n                        "}
              <span>
                {"高级设置"}
              </span>
              <span className="api-advanced-arrow" />
              {"\n                    "}
            </PressedButton>
            {"\n                    "}
            <div className={`api-advanced-body${api.advancedOpen ? ' open' : ''}`} id="apiAdvancedBody">
              {"\n                        "}
              <div className="api-subsection-title">
                {"生成参数"}
              </div>
              {"\n                        "}
              <label className="api-param-row">
                {"\n                            "}
                <span className="api-param-copy">
                  <strong>
                    {"Temperature"}
                  </strong>
                  <span>
                    {"回复随机程度"}
                  </span>
                </span>
                {"\n                            "}
                <input className="api-number-input" id="apiTemperature" value={api.form.temperature} onChange={event => api.field('temperature', api.filterDecimal(event.currentTarget.value))} type="text" inputMode="decimal" min="0" max="2" step="0.1" placeholder="范围 0–2；常用 0.7–1" />
                {"\n                        "}
              </label>
              {"\n                        "}
              <label className="api-param-row">
                {"\n                            "}
                <span className="api-param-copy">
                  <strong>
                    {"Max Tokens"}
                  </strong>
                  <span>
                    {"单次回复上限"}
                  </span>
                </span>
                {"\n                            "}
                <input className="api-number-input" id="apiMaxTokens" value={api.form.maxTokens} onChange={event => api.field('maxTokens', event.currentTarget.value.replace(/\D/g, ''))} type="text" inputMode="numeric" min="1" max="32768" step="1" placeholder="范围 1–32768；常用 512–4096" />
                {"\n                        "}
              </label>
              {"\n                        "}
              <label className="api-param-row">
                {"\n                            "}
                <span className="api-param-copy">
                  <strong>
                    {"Top P"}
                  </strong>
                  <span>
                    {"采样范围"}
                  </span>
                </span>
                {"\n                            "}
                <input className="api-number-input" id="apiTopP" value={api.form.topP} onChange={event => api.field('topP', api.filterDecimal(event.currentTarget.value))} type="text" inputMode="decimal" min="0" max="2" step="0.05" placeholder="范围 0–2；常用 0.7–1" />
                {"\n                        "}
              </label>
              {"\n\n                        "}
              <div className="api-subsection-title">
                {"请求控制"}
              </div>
              {"\n                        "}
              <label className="api-param-row">
                {"\n                            "}
                <span className="api-param-copy">
                  <strong>
                    {"上下文消息"}
                  </strong>
                  <span>
                    {"保留最近消息数量"}
                  </span>
                </span>
                {"\n                            "}
                <input className="api-number-input" id="apiContextMessages" value={api.form.contextMessages} onChange={event => api.field('contextMessages', event.currentTarget.value.replace(/\D/g, ''))} type="text" inputMode="numeric" min="1" max="200" step="1" />
                {"\n                        "}
              </label>
              {"\n                        "}
              <label className="api-param-row">
                {"\n                            "}
                <span className="api-param-copy">
                  <strong>
                    {"超时时间"}
                  </strong>
                  <span>
                    {"单次请求秒数"}
                  </span>
                </span>
                {"\n                            "}
                <input className="api-number-input" id="apiTimeoutSeconds" value={api.form.timeoutSeconds} onChange={event => api.field('timeoutSeconds', event.currentTarget.value.replace(/\D/g, ''))} type="text" inputMode="numeric" min="5" max="300" step="5" />
                {"\n                        "}
              </label>
              {"\n                        "}
              <label className="api-param-row">
                {"\n                            "}
                <span className="api-param-copy">
                  <strong>
                    {"失败重试"}
                  </strong>
                  <span>
                    {"失败后自动重试次数"}
                  </span>
                </span>
                {"\n                            "}
                <input className="api-number-input" id="apiRetryCount" value={api.form.retryCount} onChange={event => api.field('retryCount', event.currentTarget.value.replace(/\D/g, ''))} type="text" inputMode="numeric" min="0" max="3" step="1" />
                {"\n                        "}
              </label>
              {"\n                        "}
              <label className="api-param-row">
                {"\n                            "}
                <span className="api-param-copy">
                  <strong>
                    {"流式输出"}
                  </strong>
                  <span>
                    {"逐段返回生成内容"}
                  </span>
                </span>
                {"\n                            "}
                <input className="api-toggle-input" id="apiStreamEnabled" checked={api.form.stream} onChange={event => api.field('stream', event.currentTarget.checked)} type="checkbox" />
                {"\n                        "}
              </label>
              {"\n                        "}
              <div className="api-advanced-actions api-advanced-actions-pair">
                {"\n                            "}
                <PressedButton className="api-action-btn ui-cyan-btn" id="apiAdvancedResetBtn" onClick={api.resetAdvanced} type="button">
                  {"重置"}
                </PressedButton>
                {"\n                            "}
                <PressedButton className="api-action-btn primary ui-cyan-btn" id="apiAdvancedSaveBtn" onClick={() => api.handleSave('advanced')} type="button">
                  {"保存高级设置"}
                </PressedButton>
                {"\n                        "}
              </div>
              {"\n                    "}
            </div>
            {"\n                "}
          </div>
          {"\n            "}
        </section>
        {"\n        "}
      </div>
      {"\n    "}
    </div>;
}
