import { useLayoutEffect, useRef, useState } from 'react';
import { flushSync } from 'react-dom';
import { useChatNavigation } from '../providers/ChatNavigationProvider';
import type { ForwardPayload, ForwardPickerApi, ForwardPickerServices, ForwardTarget } from '../types/chatForward';

const RECENTS_KEY = 'smallphone_chat_forward_recent_targets_v1';
function loadRecents(): unknown[] {
  try {
    const data: unknown = JSON.parse(localStorage.getItem(RECENTS_KEY) || '[]');
    return Array.isArray(data) ? data : [];
  } catch { return []; }
}

/** 转发对象的搜索、选择和最近记录由 React 持有；历史渲染仍由明确的数据服务提供。 */
export function useChatForwardPicker() {
  const navigation = useChatNavigation();
  const [services, setServices] = useState<ForwardPickerServices | null>(null);
  const service = useRef<ForwardPickerServices | null>(null);
  const element = useRef<HTMLDivElement>(null), input = useRef<HTMLInputElement>(null);
  const mounted = useRef(false), payload = useRef<ForwardPayload>(null);
  const [open, setOpen] = useState(false), [multi, setMulti] = useState(false);
  const mode = useRef(false);
  const [selected, setSelected] = useState(new Set<string>());
  const selection = useRef(selected);
  const [generation, setGeneration] = useState(0), [rendered, setRendered] = useState(false);
  const [list, setList] = useState<ForwardTarget[]>([]), [recent, setRecent] = useState<ForwardTarget[]>([]);
  const recents = useRef<unknown[]>([]);

  function clearSelection() {
    selection.current = new Set();
    setSelected(selection.current);
  }
  function search(query: string) {
    setGeneration(value => value + 1);
    setRendered(true);
    const all = service.current?.targets() || [];
    const normalized = String(query || '').trim().toLowerCase();
    const filtered = normalized ? all.filter(item => item.name.toLowerCase().includes(normalized)) : all.slice();
    const found = recents.current
      .map(key => filtered.find(item => item.key === key) || all.find(item => item.key === key))
      .filter((item): item is ForwardTarget => Boolean(item))
      .slice(0, 6);
    setRecent(found.length ? found : filtered.slice().sort((a, b) => b.lastTime - a.lastTime).slice(0, 6));
    setList(filtered.slice().sort((a, b) => b.lastTime - a.lastTime));
  }
  function close() {
    setOpen(false);
    payload.current = null;
    mode.current = false;
    setMulti(false);
    clearSelection();
    if (input.current) input.current.value = '';
  }
  function show(value: ForwardPayload) {
    payload.current = value || null;
    mode.current = false;
    setMulti(false);
    clearSelection();
    if (input.current) input.current.value = '';
    setOpen(true);
    search('');
  }
  function toggleMode() {
    mode.current = !mode.current;
    setMulti(mode.current);
    if (!mode.current) clearSelection();
  }
  function send(keys: string[]) {
    if (!payload.current || !keys.length) return;
    for (const targetKey of keys) {
      recents.current = [targetKey, ...recents.current.filter(key => key !== targetKey)].slice(0, 8);
      window.dispatchEvent(new CustomEvent('smallphone-forward-message', { detail: { ...payload.current, targetKey } }));
    }
    try { localStorage.setItem(RECENTS_KEY, JSON.stringify(recents.current)); }
    catch { /* 原存储失败继续关闭。 */ }
    close();
    // 转发完成后明确恢复原聊天页面，而不是停留在选择聊天层。
    navigation.restoreForwardRoom();
    window.dispatchEvent(new CustomEvent('qingtuan:toast', {
      detail: keys.length > 1 ? `已转发至 ${keys.length} 个聊天` : '已转发'
    }));
  }
  function pick(key: string) {
    if (!key) return;
    if (mode.current) {
      const next = new Set(selection.current);
      if (next.has(key)) next.delete(key); else next.add(key);
      selection.current = next;
      setSelected(next);
    } else send([key]);
  }
  useLayoutEffect(() => {
    const connect = (event: Event) => {
      const detail = (event as CustomEvent<ForwardPickerServices & { accept(api: ForwardPickerApi): void }>).detail;
      service.current = detail;
      recents.current = loadRecents();
      setServices(detail);
      detail.accept({ open: value => flushSync(() => show(value)), close: () => flushSync(close) });
    };
    window.addEventListener('qingtuan:forward-picker-connect', connect);
    return () => window.removeEventListener('qingtuan:forward-picker-connect', connect);
  }, []);
  useLayoutEffect(() => {
    if (!services || !element.current || mounted.current) return;
    services.anchor.parentNode!.insertBefore(element.current, services.anchor);
    services.anchor.remove();
    mounted.current = true;
  }, [services]);
  return {
    generation, rendered, services, element, input, open, multi, selected, list, recent,
    close, toggleMode, search, pick,
    sendSelected: () => { if (mode.current && selection.current.size) send([...selection.current]); }
  };
}
