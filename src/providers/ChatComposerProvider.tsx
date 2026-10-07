import {createContext,useContext,useEffect,useLayoutEffect,useRef,useState} from 'react';
import type {FormEvent,KeyboardEvent,ReactNode,RefObject} from 'react';
import {flushSync} from 'react-dom';
import {readChatDraft,writeChatDraft} from '../utils/chatDrafts';
import type {ChatComposerApi,ChatComposerServices} from '../types/chatComposer';
interface ComposerContext {field:RefObject<HTMLTextAreaElement|null>;view:{text:string;height:string|undefined;disabled:boolean};change(event:FormEvent<HTMLTextAreaElement>):void;keyDown(event:KeyboardEvent<HTMLTextAreaElement>):void;send():void;}
const Context=createContext<ComposerContext|null>(null);
export function ChatComposerProvider({children}:{children:ReactNode}){
 const field=useRef<HTMLTextAreaElement>(null),service=useRef<ChatComposerServices|null>(null),ready=useRef(false);
 const [view,setView]=useState({text:'',height:undefined as string|undefined,disabled:true});
 function currentKey(){return service.current?.currentKey()||'';}
 function resize(){const input=field.current;if(!input)return;
  // 先以 auto 测量内容高度，再把测量结果交给 React；保留原 36–92px 范围。
  input.style.height='auto';const height=Math.min(Math.max(input.scrollHeight,36),92)+'px';input.style.height=height;
  const next={text:'',height,disabled:!input.value.trim()&&!service.current?.voiceReady()};
  const update=()=>setView(previous=>previous.text===next.text&&previous.height===next.height&&previous.disabled===next.disabled?previous:next);if(ready.current)flushSync(update);else update();
 }
 function read(key=currentKey()){return readChatDraft(key);}
 function load(){if(!field.current)return;field.current.value=read();resize();}
 function sentText(){if(field.current)field.current.value='';writeChatDraft(currentKey(),'');}
 function change(event:FormEvent<HTMLTextAreaElement>){resize();writeChatDraft(currentKey(),event.currentTarget.value);service.current?.inputDelay();}
 function send(){service.current?.send();}
 function keyDown(event:KeyboardEvent<HTMLTextAreaElement>){if(event.key==='Enter'&&!event.shiftKey){event.preventDefault();send();}}
 useEffect(()=>{ready.current=true;return()=>{ready.current=false;};},[]);
 useLayoutEffect(()=>{const connect=(event:Event)=>{const detail=(event as CustomEvent<{services:ChatComposerServices;accept(api:ChatComposerApi):void}>).detail;service.current=detail.services;detail.accept({hasField:()=>!!field.current,text:()=>field.current?.value||'',focus:()=>field.current?.focus(),resize,load,sentText,read,erase:key=>writeChatDraft(String(key||''),'')});};window.addEventListener('qingtuan:chat-composer-connect',connect);return()=>window.removeEventListener('qingtuan:chat-composer-connect',connect);},[]);
 return <Context.Provider value={{field,view,change,keyDown,send}}>{children}</Context.Provider>;
}
export function useChatComposer(){const value=useContext(Context);if(!value)throw Error('ChatComposerProvider is required');return value;}
