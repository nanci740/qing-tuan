import { useChatMyPresence } from '../hooks/useChatMyPresence';
import { createContext, useContext, useMemo, useRef } from 'react';
import type { ReactNode } from 'react';
function useSources(){const room=useRef<HTMLElement|null>(null),peerAvatar=useRef<HTMLImageElement|null>(null),peerName=useRef<HTMLElement|null>(null),selfAvatar=useRef<HTMLImageElement|null>(null);return useMemo(()=>({room,peerAvatar,peerName,selfAvatar}),[]);}
const Sources=createContext<ReturnType<typeof useSources>|null>(null),Presence=createContext<ReturnType<typeof useChatMyPresence>|null>(null);
export function ChatSidebarProvider({children}:{children:ReactNode}){const refs=useSources(),presence=useChatMyPresence();return <Sources.Provider value={refs}><Presence.Provider value={presence}>{children}</Presence.Provider></Sources.Provider>;}
export function useChatSidebarSources(){const refs=useContext(Sources);if(!refs)throw Error('ChatSidebarProvider is required');return refs;}
export function useChatMyPresenceState(){const state=useContext(Presence);if(!state)throw Error('ChatSidebarProvider is required');return state;}
