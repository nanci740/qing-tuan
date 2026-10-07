import { createContext, useCallback, useContext, useEffect, useLayoutEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import type { ApiConfig, ApiConnection, ApiMessage, ApiOverrides, ApiResponse, ApiService } from '../types/api';
import { cleanBaseUrl, clampNumber, fetchModels, getFeatureModel, buildFallbackConfig, performChatRequest, extractUsage } from '../utils/apiClient';
import { API_STORAGE_KEY, API_PROVIDER_PRESETS, PROVIDER_OPTIONS, getSavedConfig, getApiStats, getApiLogs, saveApiStats, pushApiLog } from '../utils/apiStorage';
import { showToast } from '../utils/toast';
import { useSettingsNavigation } from './SettingsNavigationProvider';
const errMessage = (error: unknown) => error instanceof Error ? error.message : '';
export const API_DEFAULT_MODEL_SENTINEL = '__DEFAULT_MAIN_MODEL__';
export type ModelTarget = 'model' | 'fallbackModel' | 'chat' | 'diary' | 'summary';
interface ApiForm { provider: string; baseUrl: string; apiKey: string; model: string; temperature: string; maxTokens: string; topP: string; contextMessages: string; timeoutSeconds: string; retryCount: string; stream: boolean; fallbackEnabled: boolean; fallbackProvider: string; fallbackBaseUrl: string; fallbackApiKey: string; fallbackModel: string; chat: string; diary: string; summary: string }
const initialForm: ApiForm = { provider: 'openai-compatible', baseUrl: 'https://api.openai.com/v1', apiKey: '', model: '', temperature: '0.8', maxTokens: '2048', topP: '1', contextMessages: '30', timeoutSeconds: '60', retryCount: '1', stream: true, fallbackEnabled: false, fallbackProvider: 'openai-compatible', fallbackBaseUrl: '', fallbackApiKey: '', fallbackModel: '', chat: '', diary: '', summary: '' };
function loadForm(previous: ApiForm = initialForm): ApiForm {
  const saved = getSavedConfig();
  if (!saved || typeof saved !== 'object') return { ...previous, baseUrl: previous.baseUrl.trim() ? previous.baseUrl : (API_PROVIDER_PRESETS[previous.provider] || API_PROVIDER_PRESETS['custom-compatible']).baseUrl };
  const provider = PROVIDER_OPTIONS.includes(saved.provider || 'openai-compatible') ? (saved.provider || 'openai-compatible') : '';
  const fbProvider = PROVIDER_OPTIONS.filter(x => x !== 'grok').includes(saved.fallback?.provider || 'openai-compatible') ? (saved.fallback?.provider || 'openai-compatible') : '';
  return { provider, baseUrl: saved.baseUrl || (API_PROVIDER_PRESETS[provider] || API_PROVIDER_PRESETS['custom-compatible']).baseUrl, apiKey: saved.apiKey || '', model: saved.model || '', temperature: String(saved.temperature ?? .8), maxTokens: String(saved.maxTokens ?? 2048), topP: String(saved.topP ?? 1), contextMessages: String(saved.contextMessages ?? 30), timeoutSeconds: String(saved.timeoutSeconds ?? 60), retryCount: String(saved.retryCount ?? 1), stream: saved.stream !== false, fallbackEnabled: !!saved.fallbackEnabled, fallbackProvider: fbProvider, fallbackBaseUrl: saved.fallback?.baseUrl || '', fallbackApiKey: saved.fallback?.apiKey || '', fallbackModel: saved.fallback?.model || '', chat: saved.featureModels?.chat || '', diary: saved.featureModels?.diary || '', summary: saved.featureModels?.summary || '' };
}
function formConfig(form: ApiForm): ApiConfig {
  return { provider: form.provider, baseUrl: cleanBaseUrl(form.baseUrl), apiKey: form.apiKey.trim(), model: form.model.trim(), temperature: clampNumber(form.temperature, 0, 2, .8), maxTokens: Math.round(clampNumber(form.maxTokens,1,32768,2048)), topP: clampNumber(form.topP,0,1,1), contextMessages: Math.round(clampNumber(form.contextMessages,1,200,30)), timeoutSeconds: Math.round(clampNumber(form.timeoutSeconds,5,300,60)), retryCount: Math.round(clampNumber(form.retryCount,0,3,1)), stream: form.stream, fallbackEnabled: form.fallbackEnabled, fallback: { provider: form.fallbackProvider, baseUrl: cleanBaseUrl(form.fallbackBaseUrl), apiKey: form.fallbackApiKey.trim(), model: form.fallbackModel.trim() }, featureModels: { chat: form.chat.trim(), diary: form.diary.trim(), summary: form.summary.trim() } };
}
function useApiState() {
  const { registerDestination } = useSettingsNavigation();
  const [form, setForm] = useState(loadForm), formRef = useRef(form);
  const updateForm = useCallback((next: ApiForm) => { formRef.current = next; setForm(next); }, []);
  const field = <K extends keyof ApiForm>(key: K, value: ApiForm[K]) => updateForm({ ...formRef.current, [key]: value });
  const [pageOpen, setPageOpen] = useState(false), [keyVisible, setKeyVisible] = useState(false), [advancedOpen, setAdvancedOpen] = useState(false);
  const saved = getSavedConfig();
  const [status, setStatus] = useState(() => saved?.lastOk && saved.model ? { type: 'ok', title: '已保存连接', desc: saved.model, badge: 'READY' } : { type: '', title: '尚未测试', desc: '填写连接信息后可以测试接口。', badge: 'OFFLINE' });
  const statusRef = useRef(status); statusRef.current = status;
  const [stats, setStats] = useState(getApiStats), [logs, setLogs] = useState(getApiLogs);
  const [busy, setBusy] = useState<Partial<Record<ModelTarget | 'test' | 'refresh', boolean>>>({});
  const setLoading = (key: ModelTarget | 'test' | 'refresh', value: boolean) => setBusy(previous => ({ ...previous, [key]: value }));
  const pageRef = useRef<HTMLDivElement>(null);
  const modelModalRef = useRef<HTMLDivElement>(null), providerModalRef = useRef<HTMLDivElement>(null);
  const [providerPicker, setProviderPicker] = useState({ open: false, title: '选择接口类型', target: 'provider' as 'provider' | 'fallbackProvider', selected: '', revision: 0 });
  const [modelPicker, setModelPicker] = useState({ open: false, title: '可用模型列表', target: 'model' as ModelTarget, source: 'main', allowDefault: false, models: [] as string[], selected: '', query: '', filterQuery: '', revision: 0 });
  const pickerRef = useRef(modelPicker); pickerRef.current = modelPicker;
  const readFormConfig = useCallback(() => formConfig(formRef.current), []);
  const renderStats = useCallback(() => { setStats(getApiStats()); setLogs(getApiLogs()); }, []);
  const saveConfig = useCallback((lastOk = false) => {
    const stored = { ...readFormConfig(), lastOk: !!lastOk, updatedAt: Date.now() };
    try { localStorage.setItem(API_STORAGE_KEY, JSON.stringify(stored)); return stored; } catch { throw new Error('浏览器本地储存空间不足，无法保存设置'); }
  }, [readFormConfig]);
  const requestChat = useCallback(async (messages: ApiMessage[], overrides: ApiOverrides = {}): Promise<ApiResponse> => {
    const baseConfig = { ...readFormConfig(), ...overrides }; baseConfig.model = overrides.model || getFeatureModel(baseConfig, overrides.feature || '');
    const configs = [baseConfig], fallback = buildFallbackConfig(baseConfig); if (fallback) configs.push(fallback);
    let lastError: unknown = null;
    for (let configIndex = 0; configIndex < configs.length; configIndex++) {
      const config = configs[configIndex], attempts = Math.max(1,(Number(config.retryCount)||0)+1);
      for (let attempt = 0; attempt < attempts; attempt++) {
        const started = performance.now(), stats = getApiStats(); stats.requests += 1;
        try {
          const data = await performChatRequest(messages, config, overrides.onChunk), latency = Math.round(performance.now()-started), usage = extractUsage(data);
          stats.success += 1; stats.inputTokens += usage.input; stats.outputTokens += usage.output; stats.totalTokens += usage.total; stats.lastLatency = latency; stats.lastAt = Date.now(); saveApiStats(stats); renderStats();
          pushApiLog({ ok: true, model: data?.model || config.model, latency, time: Date.now(), fallback: configIndex > 0 }); renderStats(); return data;
        } catch (error) {
          const latency = Math.round(performance.now()-started); stats.failed += 1; stats.lastLatency = latency; stats.lastAt = Date.now(); saveApiStats(stats); renderStats(); lastError = error;
          pushApiLog({ ok: false, model: config.model, latency, time: Date.now(), fallback: configIndex > 0, error: String(errMessage(error) || error || '请求失败').slice(0,160) }); renderStats();
          if (attempt < attempts-1) await new Promise(resolve => setTimeout(resolve,450*(attempt+1)));
        }
      }
    }
    throw lastError || new Error('请求失败');
  }, [readFormConfig, renderStats]);
  const getModels = useCallback((config?: ApiConnection) => fetchModels(config || readFormConfig()), [readFormConfig]);
  const service: ApiService = { getConfig: readFormConfig, getSavedConfig, getStats: getApiStats, getLogs: getApiLogs, getModelForFeature: feature => getFeatureModel(readFormConfig(),feature), fetchModels: getModels, requestChat };
  // 尚未迁移的 Chat 模块暂时使用同一个 React 服务；最终迁移后删除这个兼容入口。
  useLayoutEffect(() => { const target = window as Window & { smallphoneApi?: ApiService }; target.smallphoneApi = service; return () => { if (target.smallphoneApi === service) delete target.smallphoneApi; }; }, [readFormConfig, getModels, requestChat]);
  const blurWithin = (container: HTMLDivElement | null) => { if (document.activeElement instanceof HTMLElement && container?.contains(document.activeElement)) document.activeElement.blur(); };
  const closeProvider = useCallback(() => { blurWithin(providerModalRef.current); setProviderPicker(previous => ({ ...previous, open: false })); }, []);
  const closeModel = useCallback(() => { blurWithin(modelModalRef.current); setModelPicker(previous => ({ ...previous, open: false, query: '', allowDefault: false, source: 'main' })); }, []);
  useEffect(() => {
    const unregister = registerDestination('settingApi', () => { const next = loadForm(formRef.current); updateForm(next); const saved = getSavedConfig(); if (saved?.lastOk && saved.model) setStatus({ type: 'ok', title: '已保存连接', desc: saved.model, badge: 'READY' }); setPageOpen(true); });
    const close = () => setPageOpen(false), keyboard = (event: KeyboardEvent) => { if (event.key === 'Escape') { closeProvider(); closeModel(); } };
    window.addEventListener('qingtuan:close-settings',close); document.addEventListener('keydown',keyboard);
    return () => { unregister(); window.removeEventListener('qingtuan:close-settings',close); document.removeEventListener('keydown',keyboard); };
  }, [registerDestination, updateForm, closeProvider, closeModel]);
  function changeProvider(target: 'provider' | 'fallbackProvider', value: string) {
    const preset = API_PROVIDER_PRESETS[value] || API_PROVIDER_PRESETS['custom-compatible'];
    if (target === 'provider') { updateForm({ ...formRef.current, provider: value, baseUrl: preset.baseUrl, model: '' }); setStatus({ type: '', title: '尚未测试', desc: '接口类型已切换，请填写 Key 并获取模型。', badge: 'OFFLINE' }); }
    else updateForm({ ...formRef.current, fallbackProvider: value, ...(preset.baseUrl ? { fallbackBaseUrl: preset.baseUrl } : {}) });
  }
  function changeFallback(enabled: boolean) {
    // 备用 API 开关单独即时保存；不需要再额外按“保存设置”
    try { let stored; try { stored = JSON.parse(localStorage.getItem(API_STORAGE_KEY) || '{}') || {}; } catch { stored = {}; } stored.fallbackEnabled = !!enabled; stored.updatedAt = Date.now(); localStorage.setItem(API_STORAGE_KEY,JSON.stringify(stored)); field('fallbackEnabled', enabled); } catch { showToast('备用 API 开关保存失败'); }
  }
  function openProvider(target: 'provider' | 'fallbackProvider') { setProviderPicker(previous => ({ open: true, target, title: target === 'provider' ? '选择接口类型' : '选择备用接口类型', selected: formRef.current[target] || 'openai-compatible', revision: previous.revision+1 })); }
  function openModels(models: string[], target: ModelTarget, title: string) {
    const allowDefault = !['model','fallbackModel'].includes(target), list = allowDefault ? [API_DEFAULT_MODEL_SENTINEL,...models.filter(m => m !== API_DEFAULT_MODEL_SENTINEL)] : [...models];
    let selected = allowDefault && !formRef.current[target].trim() ? API_DEFAULT_MODEL_SENTINEL : formRef.current[target].trim(); if (!list.includes(selected)) selected = allowDefault ? API_DEFAULT_MODEL_SENTINEL : '';
    setModelPicker(previous => ({ open: true, target, title, source: target === 'fallbackModel' ? 'fallback' : 'main', allowDefault, models: list, selected, query: '', filterQuery: '', revision: previous.revision+1 }));
  }
  async function loadModels(target: ModelTarget) {
    setLoading(target,true);
    if (target === 'model') setStatus({ type: '', title: '正在读取模型', desc: '正在连接 /models…', badge: 'WAIT' });
    try {
      const models = await getModels(target === 'fallbackModel' ? readFormConfig().fallback : readFormConfig());
      if (target === 'model') setStatus({ type: 'ok', title: '接口可访问', desc: models.length ? `读取到 ${models.length} 个模型` : '接口已连接，但没有返回模型列表', badge: 'ONLINE' });
      openModels(models,target,({ model: '选择主模型', fallbackModel: '选择备用模型', chat: '选择 Chat 模型', diary: '选择日记模型', summary: '选择总结模型' })[target]);
    } catch (error) { if (target === 'model') setStatus({ type: 'error', title: '获取模型失败', desc: errMessage(error)||'未知错误', badge: 'ERROR' }); else showToast(errMessage(error)||(target === 'fallbackModel' ? '获取备用模型失败' : '获取模型失败')); }
    finally { setLoading(target,false); }
  }
  async function refreshModels() {
    setLoading('refresh',true);
    try {
      const models = await getModels(pickerRef.current.source === 'fallback' ? readFormConfig().fallback : readFormConfig());
      setModelPicker(previous => { const list = previous.allowDefault ? [API_DEFAULT_MODEL_SENTINEL,...models.filter(m => m !== API_DEFAULT_MODEL_SENTINEL)] : models; return { ...previous, models: list, selected: list.includes(previous.selected) ? previous.selected : previous.allowDefault ? API_DEFAULT_MODEL_SENTINEL : '', revision: previous.revision+1 }; }); showToast(`已刷新 ${models.length} 个模型`);
    } catch (error) { showToast(errMessage(error)||'获取模型失败'); } finally { setLoading('refresh',false); }
  }
  function handleSave(mode = 'all') {
    try {
      const config = readFormConfig(); if (!config.baseUrl && !config.apiKey && !config.model) { if (mode === 'advanced') showToast('请先填写连接设置'); else setStatus({ type: 'error', title: '没有可保存的设置', desc: '至少填写 API 地址、Key 与模型。', badge: 'EMPTY' }); return; }
      saveConfig(statusRef.current.type === 'ok'); if (mode === 'advanced') { showToast('高级设置已保存'); return; }
      setStatus({ type: statusRef.current.type === 'ok' ? 'ok' : '', title: '设置已保存', desc: config.model || '尚未选择模型', badge: 'SAVED' });
    } catch (error) { if (mode === 'advanced') showToast('高级设置保存失败'); else setStatus({ type: 'error', title: '保存失败', desc: errMessage(error)||'未知错误', badge: 'ERROR' }); }
  }
  function resetAdvanced() {
    updateForm({ ...formRef.current, temperature: '0.8', maxTokens: '2048', topP: '1', contextMessages: '30', timeoutSeconds: '60', retryCount: '1', stream: true });
    try { saveConfig(statusRef.current.type === 'ok'); showToast('高级设置已重置'); } catch { showToast('重置失败'); }
  }
  async function testConnection() {
    setLoading('test',true); setStatus({ type: '', title: '正在测试连接', desc: '正在发送极短测试请求…', badge: 'WAIT' });
    try { const config = readFormConfig(), data = await requestChat([{ role: 'user', content: 'Reply with OK only.' }], { model: config.model, temperature: 0, maxTokens: 8, topP: 1, stream: false, fallbackEnabled: false }); setStatus({ type: 'ok', title: '连接正常', desc: data?.model || config.model || '接口返回成功', badge: 'ONLINE' }); saveConfig(true); }
    catch (error) { setStatus({ type: 'error', title: '连接失败', desc: errMessage(error)||'未知错误', badge: 'ERROR' }); } finally { setLoading('test',false); }
  }
  const query = modelPicker.filterQuery.trim().toLowerCase(), modelName = (model: string) => model === API_DEFAULT_MODEL_SENTINEL ? '默认主模型' : model;
  return { service, form, field, pageRef, pageOpen, closePage: () => { blurWithin(pageRef.current); setPageOpen(false); }, keyVisible, toggleKey: () => setKeyVisible(v=>!v), advancedOpen, toggleAdvanced: () => setAdvancedOpen(v=>!v), status, stats, logs, busy, modelPlaceholder: (API_PROVIDER_PRESETS[form.provider] || API_PROVIDER_PRESETS['custom-compatible']).modelPlaceholder,
    filterDecimal: (input: string) => { const value = input.replace(/[^0-9.]/g, ''); const dot = value.indexOf('.'); return dot === -1 ? value : value.slice(0, dot+1) + value.slice(dot+1).replace(/\./g, ''); },
    changeProvider, changeFallback, openProvider, closeProvider, providerPicker, providerModalRef, selectProvider: (selected: string) => setProviderPicker(previous=>({ ...previous, selected, revision: previous.revision+1 })), confirmProvider: () => { if (providerPicker.selected) { changeProvider(providerPicker.target,providerPicker.selected); closeProvider(); } },
    loadModels, refreshModels, modelPicker, modelModalRef, closeModel, modelName, visibleModels: modelPicker.models.filter(model=>!query || modelName(model).toLowerCase().includes(query)), searchModels: (query: string) => setModelPicker(previous=>({ ...previous, query, filterQuery: query, revision: previous.revision+1 })), selectModel: (selected: string) => setModelPicker(previous=>({ ...previous, selected, revision: previous.revision+1 })), confirmModel: () => { if (modelPicker.selected) { field(modelPicker.target,modelPicker.selected === API_DEFAULT_MODEL_SENTINEL ? '' : modelPicker.selected); closeModel(); } }, handleSave, resetAdvanced, testConnection };
}
const Context = createContext<ReturnType<typeof useApiState> | null>(null);
export function ApiProvider({ children }: { children: ReactNode }) { const value = useApiState(); return <Context.Provider value={value}>{children}</Context.Provider>; }
export function useApi() { const value = useContext(Context); if (!value) throw new Error('ApiProvider is required'); return value; }
