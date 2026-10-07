import { createContext, useContext, useLayoutEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { flushSync } from 'react-dom';

export type ChatSurfaceKey = 'app' | 'list' | 'room' | 'settings' | 'dock';
export interface ChatNavigationServices {
  prepareList(): void;
  finishList(): void;
  prepareRoom(): void;
  finishRoom(): void;
  syncIdentity(): void;
  prepareSettings(): void;
}
export interface ChatSurfaceHandle { data?(key:string,value:string):void; style?(key: string, value: string): void; toggle(token: string, enabled: boolean, hidden?: boolean): void; }
export interface ChatNavigationApi {
  activeKey(value:string):void;
  selectionMode(enabled:boolean):void;
  restoreForwardRoom(): void;
  showList(): void; showRoom(): void; openApp(): void; closeApp(): void;
  openSettings(): void; closeSettings(): void;
  appearanceClass(token: string, enabled: boolean): void;
  appearanceStyle(key: string, value: string): void;
  register(key: ChatSurfaceKey, handle: ChatSurfaceHandle | null): void;
}
interface NavigationConnect { services: ChatNavigationServices; accept(api: ChatNavigationApi): void; }
const RoomRevision=createContext(0);
const Context = createContext<ChatNavigationApi | null>(null);
export function ChatNavigationProvider({ children }: { children: ReactNode }) {
  const [roomRevision,setRoomRevision]=useState(0);
  const services = useRef<ChatNavigationServices | null>(null);
  const surfaces = useRef(new Map<ChatSurfaceKey, ChatSurfaceHandle>());
  const api = useRef<ChatNavigationApi | null>(null);
  if (!api.current) {
    const toggle = (key: ChatSurfaceKey, token: string, enabled: boolean, hidden?: boolean) => {
      flushSync(() => {surfaces.current.get(key)?.toggle(token, enabled, hidden);if(key==='room')setRoomRevision(value=>value+1);});
    };
    const closeSettings = () => toggle('settings', 'active', false, true);
    const showList = () => {
      // 回到聊天列表不取消自动回复：倒数完照样回（回复会进背景、算未读）
      services.current?.prepareList();
      closeSettings();
      toggle('app', 'chat-room-open', false);
      toggle('room', 'is-hidden', true);
      toggle('list', 'is-hidden', false);
      services.current?.finishList();
    };
    api.current = {
      activeKey(value){flushSync(()=>surfaces.current.get('app')?.data?.('data-active-chat-key',value));},
      appearanceClass(token, enabled) { toggle('app', token, enabled); },
      appearanceStyle(key, value) { flushSync(()=>surfaces.current.get('app')?.style?.(key,value)); },
      register(key, handle) { if (handle) surfaces.current.set(key, handle); else surfaces.current.delete(key); },
      selectionMode(enabled) { toggle('room','chat-selection-mode',enabled); },
      closeSettings, showList,
      restoreForwardRoom() {
        toggle('app', 'active', true, false);
        toggle('app', 'chat-room-open', true);
        toggle('list', 'is-hidden', true);
        toggle('room', 'is-hidden', false);
      },
      showRoom() {
        services.current?.prepareRoom();
        toggle('app', 'chat-room-open', true);
        toggle('list', 'is-hidden', true);
        toggle('room', 'is-hidden', false);
        services.current?.finishRoom();
      },
      openApp() {
        services.current?.syncIdentity();
        toggle('app', 'active', true, false);
        showList();
        window.dispatchEvent(new CustomEvent('qingtuan:dock', { detail: 'chat' }));
        toggle('dock', 'chat-hidden', true, true);
      },
      closeApp() {
        closeSettings();
        toggle('app', 'active', false, true);
        showList();
        window.dispatchEvent(new CustomEvent('qingtuan:dock', { detail: 'home' }));
        toggle('dock', 'chat-hidden', false, false);
      },
      openSettings() { services.current?.prepareSettings(); toggle('settings', 'active', true, false); },
    };
  }
  useLayoutEffect(() => {
    const connect = (event: Event) => {
      const detail = (event as CustomEvent<NavigationConnect>).detail;
      services.current = detail.services;
      detail.accept(api.current!);
    };
    window.addEventListener('qingtuan:chat-navigation-connect', connect);
    return () => { window.removeEventListener('qingtuan:chat-navigation-connect', connect); services.current = null; };
  }, []);
  return <Context.Provider value={api.current}><RoomRevision.Provider value={roomRevision}>{children}</RoomRevision.Provider></Context.Provider>;
}
export function useChatNavigation() {
  const api = useContext(Context);
  if (!api) throw new Error('ChatNavigationProvider is required');
  return api;
}

export function useChatRoomRevision(){return useContext(RoomRevision);}
