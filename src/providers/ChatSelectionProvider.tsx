import {createContext,useContext,useEffect,useLayoutEffect,useRef,useState} from 'react';
import type {MouseEvent,ReactNode} from 'react';
import {flushSync} from 'react-dom';
import {useChatNavigation} from './ChatNavigationProvider';
import type {MessageSelectionApi,MessageSelectionServices} from '../types/chatSelection';
interface SelectionContext {view:{active:boolean;count:number};clickCapture(event:MouseEvent<HTMLDivElement>):void;}
const Context=createContext<SelectionContext|null>(null);
export function ChatSelectionProvider({children}:{children:ReactNode}){
 const navigation=useChatNavigation();
 const service=useRef<MessageSelectionServices|null>(null),mode=useRef(false),ready=useRef(false);
 const locks=useRef(new WeakMap<HTMLElement,number>()); // 多选时每则讯息「长按刚切换过」的截止时间
 const frames=useRef(new Set<number>());
 const [view,setView]=useState({active:false,count:0});
 function selectedRows(){const api=service.current;return api?api.allRows().filter(api.selected):[];}
 function publish(){const next={active:mode.current,count:selectedRows().length};const update=()=>setView(next);if(ready.current)flushSync(update);else update();}
 function frame(callback:()=>void){const id=requestAnimationFrame(()=>{frames.current.delete(id);callback();});frames.current.add(id);}
 // 进出多选时讯息左边多 / 少一个勾选框，长讯息会多折 / 少折一行，上面的讯息变高变矮会把画面推走。
 // 切换前记下一则讯息的位置（优先用刚按的那则 / 已勾选的那则，否则画面上第一则；在最底部就记「在底部」），切换后把它挪回原位
 function keepAnchor(change:()=>void,preferRow?:HTMLElement){
  const api=service.current,list=api?.list;if(!api||!list){change();return;}
  const atBottom=list.scrollHeight-list.scrollTop-list.clientHeight<4;
  const listTop=list.getBoundingClientRect().top,listBottom=list.getBoundingClientRect().bottom;
  const visible=(row?:HTMLElement)=>{const rect=row?.getBoundingClientRect();return !!rect&&rect.bottom>listTop&&rect.top<listBottom;};
  const anchor=(visible(preferRow)&&preferRow)||selectedRows().find(visible)||api.allRows().find(visible);
  const anchorTop=anchor?.getBoundingClientRect().top;
  const restore=()=>{if(atBottom)list.scrollTop=list.scrollHeight;else if(anchor?.isConnected)list.scrollTop+=anchor.getBoundingClientRect().top-anchorTop!;};
  change();restore();frame(()=>frame(restore)); // 等 refreshChatBubbleGroups 跑完再对一次
 }
 function clearNow(){mode.current=false;navigation.selectionMode(false);service.current?.clearSelected();publish();frame(()=>service.current?.refreshGroups());}
 function clear(){if(mode.current)keepAnchor(clearNow);else clearNow();}
 function begin(row?:HTMLElement){keepAnchor(()=>{mode.current=true;navigation.selectionMode(true);if(row)service.current?.setSelected(row,true);publish();frame(()=>service.current?.refreshGroups());service.current?.notice('点击消息可多选');},row);}
 function toggle(row:HTMLElement){const api=service.current;if(!api)return;api.setSelected(row,!api.selected(row));publish();}
 function longPress(row:HTMLElement){
  if(!mode.current)return false;
  // 多选中长按：计时器和手机自己的长按信号（contextmenu）会各来一次，之后可能还跟一个 click；
  // 只认第一次，700ms 内同一则的其他切换都略过，不然会勾上又取消
  if(Date.now()<(locks.current.get(row)||0))return true;
  locks.current.set(row,Date.now()+700);toggle(row);return true;
 }
 function clickCapture(event:MouseEvent<HTMLDivElement>){
  if(!mode.current)return;
  const row=(event.target as Element).closest<HTMLElement>('.chat-message-row');if(!row)return;
  event.stopPropagation();event.nativeEvent.stopImmediatePropagation();
  if(Date.now()<(locks.current.get(row)||0))return; // 刚被长按切换过，这个 click 是长按放手带出来的
  toggle(row);
 }
 useEffect(()=>{ready.current=true;return()=>{ready.current=false;for(const id of frames.current)cancelAnimationFrame(id);};},[]);
 useLayoutEffect(()=>{const connect=(event:Event)=>{const detail=(event as CustomEvent<{services:MessageSelectionServices;accept(api:MessageSelectionApi):void}>).detail;service.current=detail.services;detail.accept({active:()=>mode.current,rows:selectedRows,begin,clear,longPress});};window.addEventListener('qingtuan:message-selection-connect',connect);return()=>window.removeEventListener('qingtuan:message-selection-connect',connect);},[]);
 return <Context.Provider value={{view,clickCapture}}>{children}</Context.Provider>;
}
export function useChatSelection(){const value=useContext(Context);if(!value)throw Error('ChatSelectionProvider is required');return value;}
