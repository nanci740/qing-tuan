import { useApi } from './ApiProvider';
import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import type { McpService, McpState, McpTool } from '../types/mcp';
import { createMcpId, loadMcpState, normalizeMcpService, saveMcpState } from '../utils/mcpStorage';
import { fetchServiceTools, mergeMcpTools } from '../utils/mcpClient';
import { showToast } from '../utils/toast';
import { useSettingsNavigation } from './SettingsNavigationProvider';
import { useChoice } from './ChoiceProvider';
const errorMessage = (err: unknown, fallback: string) => err instanceof Error && err.message ? err.message : fallback;
function useMcpState() {
  const { registerDestination } = useSettingsNavigation();
  const choice = useChoice();
  const api = useApi().service;
  const [state, setState] = useState(loadMcpState);
  const current = useRef(state);
  const [pageOpen, setPageOpen] = useState(false);
  const modalRef = useRef<HTMLDivElement>(null);
  const toolsRef = useRef<HTMLDivElement>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [modalTitle, setModalTitle] = useState('添加远程服务');
  const [deleteVisible, setDeleteVisible] = useState(false);
  const [draft, setDraft] = useState(() => normalizeMcpService({ id: 'draft' }));
  const [status, setStatus] = useState({ message: '', type: '' });
  const [testing, setTesting] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [toolsRevision, setToolsRevision] = useState(0);
  const [toolsId, setToolsId] = useState<string | null>(null);
  const [toolsOpen, setToolsOpen] = useState(false);
  const [toolPanel, setToolPanel] = useState<{ title: string; tools: McpTool[] } | null>(null);
  const save = useCallback((next: McpState) => {try{saveMcpState(next);current.current=next;setState(next);return true;}catch{showToast('MCP 设置保存失败，请重试');return false;}}, []);
  const changeService = useCallback((service: McpService) => {
    return save({ ...current.current, services: current.current.services.map(old => old.id === service.id ? service : old) });
  }, [save]);
  const closeModal = useCallback(() => { if (document.activeElement instanceof HTMLElement && modalRef.current?.contains(document.activeElement)) document.activeElement.blur(); setModalOpen(false); setEditingId(null); setStatus({ message: '', type: '' }); }, []);
  const closeTools = useCallback(() => { if (document.activeElement instanceof HTMLElement && toolsRef.current?.contains(document.activeElement)) document.activeElement.blur(); setToolsOpen(false); setToolsId(null); }, []);
  useEffect(() => {
    const enter = () => { const next = loadMcpState(); current.current = next; setState(next); setPageOpen(true); };
    const unregister = registerDestination('settingMcp', enter);
    const close = () => setPageOpen(false);
    const keyboard = (event: KeyboardEvent) => { if (event.key === 'Escape') { closeModal(); closeTools(); } };
    window.addEventListener('qingtuan:close-settings', close); document.addEventListener('keydown', keyboard);
    return () => { unregister(); window.removeEventListener('qingtuan:close-settings', close); document.removeEventListener('keydown', keyboard); };
  }, [registerDestination, closeModal, closeTools]);
  function openModal(id: string | null = null) {
    const service = id ? current.current.services.find(s => s.id === id) : null;
    setEditingId(id); setModalTitle(service ? '编辑远程服务' : '添加远程服务'); setDeleteVisible(Boolean(service));
    setDraft(service ? { ...service, headers: service.headers.map(h => ({ ...h })) } : normalizeMcpService({ id: 'draft' }));
    setStatus({ message: service?.statusText || '', type: '' }); setModalOpen(true);
  }
  function readModalService() {
    const previous = editingId ? current.current.services.find(s => s.id === editingId) : null;
    return normalizeMcpService({ ...draft, id: editingId || createMcpId(), enabled: previous?.enabled !== false, tools: previous?.tools || [], status: previous?.status || 'idle', statusText: previous?.statusText || '尚未测试', lastChecked: previous?.lastChecked || '' });
  }
  function validate(service: McpService, testing = false) {
    if (!service.name) throw new Error(testing ? '请先填写名称' : '请填写服务名称');
    if (!service.url) throw new Error(testing ? '请先填写主机地址' : '请填写主机地址');
    if (!/^https?:\/\//i.test(service.url)) throw new Error('主机地址需要以 http:// 或 https:// 开头');
  }
  function saveService() {
    const service = readModalService();
    try { validate(service); } catch (err) { setStatus({ message: errorMessage(err, ''), type: 'error' }); return; }
    const ok=editingId?changeService(service):save({ ...current.current, services: [...current.current.services, service] });
    if(!ok){setStatus({message:'MCP 设置保存失败，请重试',type:'error'});return;}
    closeModal(); showToast('MCP 服务已保存');
  }
  function deleteService() {
    if (!editingId) return;
    if(!save({ ...current.current, services: current.current.services.filter(s => s.id !== editingId) }))return;
    closeModal(); showToast('MCP 服务已删除');
  }
  async function testService() {
    setTesting(true);
    try {
      const service = readModalService(); validate(service, true);
      setStatus({ message: '正在连接并读取工具…', type: '' });
      const tools = await fetchServiceTools(service);
      const next: McpService = { ...service, tools: mergeMcpTools(service, tools), status: 'online', statusText: tools.length ? `连接正常 · ${tools.length} 个工具` : '连接正常 · 暂无工具', lastChecked: new Date().toISOString() };
      if(editingId&&!changeService(next)){setStatus({message:'连接正常，但设置保存失败，请重试',type:'error'});return;}
      setStatus({ message: next.statusText, type: 'ok' });
    } catch (err) { setStatus({ message: errorMessage(err, '连接失败'), type: 'error' }); }
    finally { setTesting(false); }
  }
  async function generateDescription() {
    const name = draft.name.trim(), url = draft.url.trim();
    if (!name && !url) { setStatus({ message: '先填写名称或主机地址，再生成描述', type: 'error' }); return; }
    setGenerating(true);
    try {
      const result = await api.requestChat([{ role: 'user', content: `请为一个 MCP 远程服务写一句简短中文描述，只输出描述本身。服务名称：${name || '未填写'}；地址：${url || '未填写'}。` }], { feature: 'summary', maxTokens: 120, temperature: 0.5, stream: false });
      const content = result?.choices?.[0]?.message?.content || result?.content?.[0]?.text || result?.output_text || '';
      if (!content) throw new Error('接口没有返回描述');
      setDraft(current => ({ ...current, description: String(content).trim().replace(/^["“]|["”]$/g, '') })); setStatus({ message: '描述已生成', type: 'ok' });
    } catch (err) { setStatus({ message: errorMessage(err, '生成描述失败'), type: 'error' }); }
    finally { setGenerating(false); }
  }
  function openTools(id: string) {
    const service = current.current.services.find(s => s.id === id); if (!service) return;
    setToolsId(id); setToolPanel({ title: `${service.name || 'MCP'} · 工具权限`, tools: service.tools.map(t => ({ ...t })) }); setToolsOpen(true);
  }
  function toggleTool(index: number, enabled: boolean) {
    const service = current.current.services.find(s => s.id === toolsId); if (!service) return;
    const tools = service.tools.map((tool, i) => i === index ? { ...tool, enabled } : tool);
    if(!changeService({ ...service, tools }))return; setToolPanel(panel => panel ? { ...panel, tools } : panel);
  }
  async function refreshTools() {
    const service = current.current.services.find(s => s.id === toolsId); if (!service) return;
    setRefreshing(true);
    try {
      const raw = await fetchServiceTools(service), tools = mergeMcpTools(service, raw);
      if(!changeService({ ...service, tools, status: 'online', statusText: raw.length ? `连接正常 · ${raw.length} 个工具` : '连接正常 · 暂无工具', lastChecked: new Date().toISOString() }))return;
      setToolsRevision(revision => revision + 1); setToolPanel(panel => panel ? { ...panel, tools } : panel); showToast(`已刷新 ${raw.length} 个工具`);
    } catch (err) { changeService({ ...service, status: 'error', statusText: '连接失败' }); showToast(errorMessage(err, '刷新工具失败')); }
    finally { setRefreshing(false); }
  }
  const field = <K extends keyof McpService>(key: K, value: McpService[K]) => setDraft(current => ({ ...current, [key]: value }));
  function selectTransport() {
    choice.openChoice({style:'settings', title: '选择连接类型', options: [{ value: 'streamable-http', label: 'Streamable HTTP' }, { value: 'sse', label: 'SSE（兼容旧服务）' }], selected: draft.transport, confirm: value => field('transport', value === 'sse' ? 'sse' : 'streamable-http') });
  }
  return { state, modalRef, toolsRef, pageOpen, closePage: () => setPageOpen(false), modalOpen, modalTitle, deleteVisible, draft, status, testing, generating, refreshing, toolsOpen, toolsRevision, toolPanel,
    openModal, closeModal, saveService, deleteService, testService, generateDescription, openTools, closeTools, refreshTools, toggleTool, field, selectTransport,
    setMaster: (enabled: boolean) => save({ ...current.current, enabled }),
    setServiceEnabled: (id: string, enabled: boolean) => { const service = current.current.services.find(s => s.id === id); if (service) changeService({ ...service, enabled }); },
    getState: () => JSON.parse(JSON.stringify(current.current)) as McpState,
    getEnabledServices: () => current.current.enabled ? JSON.parse(JSON.stringify(current.current.services.filter(s => s.enabled))) as McpService[] : [],
    getEnabledTools: () => current.current.enabled ? current.current.services.filter(s => s.enabled).flatMap(s => s.tools.filter(t => t.enabled !== false).map(t => ({ serviceId: s.id, serviceName: s.name, name: t.name, description: t.description, inputSchema: t.inputSchema }))) : [],
  };
}
const Context = createContext<ReturnType<typeof useMcpState> | null>(null);
export function McpProvider({ children }: { children: ReactNode }) { const state = useMcpState(); return <Context.Provider value={state}>{children}</Context.Provider>; }
export function useMcp() { const state = useContext(Context); if (!state) throw new Error('McpProvider is required'); return state; }
