import {createContext,useContext,useLayoutEffect} from 'react';
import type {ReactNode} from 'react';
import {useChatVoice} from '../hooks/useChatVoice';
import type {ChatVoiceServices,ChatVoiceApi} from '../hooks/useChatVoice';
import {useChatMessages} from './ChatMessagesProvider';
const Context=createContext<ReturnType<typeof useChatVoice>|null>(null);
export function ChatVoiceProvider({children}:{children:ReactNode}){const {api:messages}=useChatMessages();const voice=useChatVoice(messages);useLayoutEffect(()=>{const connect=(event:Event)=>{const detail=(event as CustomEvent<{services:ChatVoiceServices;accept(api:ChatVoiceApi):void}>).detail;voice.services.current=detail.services;detail.accept(voice.api);};window.addEventListener('qingtuan:chat-voice-connect',connect);return()=>window.removeEventListener('qingtuan:chat-voice-connect',connect);},[voice.api,voice.services]);return <Context.Provider value={voice}>{children}</Context.Provider>;}
export function useChatVoiceState(){const value=useContext(Context);if(!value)throw Error('ChatVoiceProvider is required');return value;}
