import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { flushSync } from 'react-dom';
import type { SettingsDestination } from '../utils/settingsPageBridge';
function useNavigationState() {
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [aboutOpen, setAboutOpen] = useState(false);
  const [activeDock, setActiveDockState] = useState('home');
  const [spaceOpen, setSpaceOpen] = useState(false);
  const setActiveDock = useCallback((key: string) => { setActiveDockState(key); if (key !== 'space') setSpaceOpen(false); }, []);
  const openSpace = useCallback(() => { setSettingsOpen(false); setActiveDock('space'); setSpaceOpen(true); }, [setActiveDock]);
  const closeSpace = useCallback(() => { setSpaceOpen(false); setActiveDock('home'); }, [setActiveDock]);
  const aboutSource = useRef<HTMLElement | null>(null);
  const destinations = useRef(new Map<SettingsDestination, () => void | Promise<void>>());
  const registerDestination = useCallback((key: SettingsDestination, enter: () => void | Promise<void>) => {
    destinations.current.set(key, enter);
    return () => { if (destinations.current.get(key) === enter) destinations.current.delete(key); };
  }, []);
  const openDestination = useCallback(async (key: SettingsDestination) => {
    const enter = destinations.current.get(key) || window.qtSettingsPageEntries?.[key];
    await enter?.();
  }, []);
  const openSettings = useCallback(async () => {
    if (document.fonts?.load) { try { await document.fonts.load('16px "LXGW WenKai TC"', '设置个人信息美化音乐智能连接与服务系统与存储关于'); } catch { /* 原字体加载回退。 */ } }
    setSettingsOpen(true); document.body.style.overflow = 'hidden';
  }, []);
  const closeSettings = useCallback(() => {
    flushSync(() => { setSettingsOpen(false); setActiveDock('home'); });
    document.body.style.overflow = '';
    window.dispatchEvent(new Event('qingtuan:close-settings'));
  }, []);
  const openAbout = useCallback((source: HTMLElement) => { aboutSource.current = source; setAboutOpen(true); }, []);
  const closeAbout = useCallback(() => { setAboutOpen(false); aboutSource.current?.focus(); }, []);
  useEffect(() => {
    const dock = (event: Event) => setActiveDock(String((event as CustomEvent<string>).detail || 'home'));
    window.addEventListener('qingtuan:dock', dock);
    return () => window.removeEventListener('qingtuan:dock', dock);
  }, [setActiveDock]);
  return { settingsOpen, aboutOpen, activeDock, setActiveDock, spaceOpen, openSpace, closeSpace, openSettings, closeSettings, openAbout, closeAbout, openDestination, registerDestination };
}
const NavigationContext = createContext<ReturnType<typeof useNavigationState> | null>(null);
export function SettingsNavigationProvider({ children }: { children: ReactNode }) {
  const state = useNavigationState();
  return <NavigationContext.Provider value={state}>{children}</NavigationContext.Provider>;
}
export function useSettingsNavigation() {
  const state = useContext(NavigationContext);
  if (!state) throw new Error('SettingsNavigationProvider is required');
  return state;
}
