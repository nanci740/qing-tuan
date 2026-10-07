import {createContext,useContext,useEffect,useLayoutEffect,useRef,useState} from 'react';
import type {ReactNode} from 'react';
import {flushSync} from 'react-dom';
import {getAutoReplyDelayMs,setAutoReplyDelay} from '../utils/chatReplyDelay';
import type {ChatReplyTriggerApi,ChatReplyTriggerServices} from '../types/chatReplyTriggers';
const Context=createContext<{pending:boolean|null;manual():void}|null>(null);
export function ChatReplyTriggersProvider({children}:{children:ReactNode}){
 const service=useRef<ChatReplyTriggerServices|null>(null),queue=useRef<Promise<unknown>>(Promise.resolve());
 const timer=useRef(0),chatKey=useRef(''),locked=useRef(false),ready=useRef(false);
 const [pending,setPending]=useState<boolean|null>(null);
 function busy(value:boolean){locked.current=value;const update=()=>setPending(value);if(ready.current)flushSync(update);else update();}
 function manual(){if(locked.current||!service.current)return;busy(true);queue.current=queue.current.catch(()=>{}).then(()=>service.current!.reply()).finally(()=>busy(false));}
 // ===== 停顿后自动回复（取代月亮按钮）=====
 // 发出讯息后开始倒数；倒数中又打字、又发讯息或按麦克风就重新倒数；停下来够久才让角色一次读完这一串讯息回复。
 // 秒数存在 localStorage（smallphone_chat_auto_reply_delay），之后聊天设置会做调整的画面；预设 7 秒。
 function schedule(){const api=service.current;if(!api)return;window.clearTimeout(timer.current);chatKey.current=api.currentKey();timer.current=window.setTimeout(()=>{
  timer.current=0;const key=chatKey.current;chatKey.current='';
  // 切到其他页面（聊天列表、桌面…）也照样回；只有聊天对象已经换掉（或被删掉）才不回——
  // 换聊天对象前会先由 smallphoneFlushAutoReply 把这一轮送出去，不会漏
  if(!key||key!==api.currentKey())return;if(api.recording())return;
  // 还没设定 API：安静跳过，不要每发一条就跳提示
  if(!api.configured())return;queue.current=queue.current.catch(()=>{}).then(()=>api.reply());
 },getAutoReplyDelayMs());}
 // 倒数还没完就要换到别的聊天对象：立刻把这一轮送出去回复（讯息还在画面上时先读好内容），回复之后会进背景
 function flush(nextKey:unknown){const api=service.current;if(!api||!timer.current||!chatKey.current||chatKey.current===String(nextKey))return;const key=chatKey.current;window.clearTimeout(timer.current);timer.current=0;chatKey.current='';if(key!==api.currentKey())return;if(!api.configured())return;void api.reply();}
 function input(){if(timer.current)schedule();}
 useEffect(()=>{ready.current=true;return()=>{ready.current=false;window.clearTimeout(timer.current);};},[]);
 useLayoutEffect(()=>{const connect=(event:Event)=>{const detail=(event as CustomEvent<{services:ChatReplyTriggerServices;accept(api:ChatReplyTriggerApi):void}>).detail;service.current=detail.services;detail.accept({schedule,input,flush,setDelay:setAutoReplyDelay});};window.addEventListener('qingtuan:chat-reply-triggers-connect',connect);return()=>window.removeEventListener('qingtuan:chat-reply-triggers-connect',connect);},[]);
 return <Context.Provider value={{pending,manual}}>{children}</Context.Provider>;
}
export function useChatReplyTriggers(){const value=useContext(Context);if(!value)throw Error('ChatReplyTriggersProvider is required');return value;}
