import {useChatMyPresence} from '../hooks/useChatMyPresence';
import {createContext,useContext} from 'react';
import type {ReactNode} from 'react';
const Presence=createContext<ReturnType<typeof useChatMyPresence>|null>(null);
export function ChatSidebarProvider({children}:{children:ReactNode}){const presence=useChatMyPresence();return <Presence.Provider value={presence}>{children}</Presence.Provider>;}
export function useChatMyPresenceState(){const state=useContext(Presence);if(!state)throw Error('ChatSidebarProvider is required');return state;}
