import {createContext,useContext,useEffect,useLayoutEffect,useRef,useState} from 'react';
import type {ReactNode} from 'react';
import {flushSync} from 'react-dom';
import type {ChatPinSlot,ChatPinsBridge,ChatPinsServices} from '../types/chatPins';
interface PinsView {slots:(ChatPinSlot&{key:number})[];text:string;hasPinned:boolean;}
const Context=createContext<{view:PinsView;click():void}|null>(null);
/** 置顶条和 SVG 图标由 React 渲染；现有消息行只提供稳定的时间标记挂载点。 */
export function ChatPinsProvider({children}:{children:ReactNode}) {
 const [view,setView]=useState<PinsView>({slots:[],text:'',hasPinned:false}),services=useRef<ChatPinsServices|null>(null),ready=useRef(false);
 const keys=useRef(new WeakMap<HTMLElement,number>()),owned=useRef(new WeakSet<HTMLElement>()),nextKey=useRef(0),timers=useRef(new Set<ReturnType<typeof setTimeout>>());
 useEffect(()=>{ready.current=true;return()=>{ready.current=false;for(const timer of timers.current)clearTimeout(timer);};},[]);
 useLayoutEffect(()=>{const connect=(event:Event)=>{const detail=(event as CustomEvent<{services:ChatPinsServices;accept(api:ChatPinsBridge):void}>).detail;services.current=detail.services;detail.accept({refresh});};window.addEventListener('qingtuan:chat-pins-connect',connect);return()=>window.removeEventListener('qingtuan:chat-pins-connect',connect);},[]);
 function refresh(){const service=services.current;if(!service)return;const slots=service.syncSlots().map(item=>{if(!owned.current.has(item.slot)){if(!service.canOwnSlot(item.slot))return null;service.clearSlot(item.slot);owned.current.add(item.slot);}if(!keys.current.has(item.slot))keys.current.set(item.slot,++nextKey.current);return {...item,key:keys.current.get(item.slot)!};}).filter((item):item is ChatPinSlot&{key:number}=>item!==null);const last=service.latest(),next={slots,text:last?`置顶 · ${service.quote(last)}`:'',hasPinned:Boolean(last)};if(ready.current)flushSync(()=>setView(next));else setView(next);}
 function click(){const service=services.current,row=service?.latest();if(!service||!row)return;
  // 跳到置顶条上写的那则（最后置顶的那则），并闪一下提示位置
  service.scroll(row);service.highlight(row,false);void row.offsetWidth;service.highlight(row,true);
  const timer=setTimeout(()=>{service.highlight(row,false);timers.current.delete(timer);},1300);timers.current.add(timer);
 }
 return <Context.Provider value={{view,click}}>{children}</Context.Provider>;
}
export function useChatPins(){const value=useContext(Context);if(!value)throw new Error('ChatPinsProvider is required');return value;}
