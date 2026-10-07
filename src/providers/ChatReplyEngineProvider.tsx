import {createContext,useContext,useLayoutEffect} from 'react';
import type {ReactNode} from 'react';
import {useChatReplyEngine} from '../hooks/useChatReplyEngine';
import type {ChatReplyEngineServices,ChatReplyEngineApi} from '../hooks/useChatReplyEngine';
import {useChatMessages} from './ChatMessagesProvider';
import {useChatVoiceState} from './ChatVoiceProvider';
const Context=createContext<ReturnType<typeof useChatReplyEngine>|null>(null);
export function ChatReplyEngineProvider({children}:{children:ReactNode}){const {api:messages}=useChatMessages();const {api:voice}=useChatVoiceState();const engine=useChatReplyEngine(messages,voice);useLayoutEffect(()=>{const connect=(event:Event)=>{const detail=(event as CustomEvent<{services:ChatReplyEngineServices;accept(api:ChatReplyEngineApi):void}>).detail;engine.services.current=detail.services;detail.accept(engine.api);};window.addEventListener('qingtuan:chat-reply-engine-connect',connect);return()=>window.removeEventListener('qingtuan:chat-reply-engine-connect',connect);},[engine.api,engine.services]);return <Context.Provider value={engine}>{children}</Context.Provider>;}
export function useChatReplyEngineState(){const value=useContext(Context);if(!value)throw Error('ChatReplyEngineProvider is required');return value;}
