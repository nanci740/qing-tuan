import {createContext,useContext,useEffect,useLayoutEffect,useRef,useState} from 'react';
import type {ReactNode} from 'react';
import {flushSync} from 'react-dom';
import {useChatMessages} from './ChatMessagesProvider';
import {useChatNavigation} from './ChatNavigationProvider';
import {useNativeRefs} from './NativeRefsProvider';
export interface RoomToolsServices {closeMessage():void;text(row:HTMLElement):string;}
export interface RoomToolsApi {closeMore():void;closeSearch():void;openSearch(text?:string):void;closeQuick():void;}
interface SearchResult {row:HTMLElement;avatar:string;name:string;time:string;parts:{text:string;marked:boolean}[];}
const Context=createContext<ReturnType<typeof useRoomTools>|null>(null);
function useRoomTools(){const {api:messages}=useChatMessages();const navigation=useChatNavigation();const refs=useNativeRefs()!;
 const [view,setView]=useState({more:false,search:false,quick:false,quickTouched:false,query:'',count:'0/0',results:false,rows:[] as SearchResult[]});
 const state=useRef(view),services=useRef<RoomToolsServices|null>(null),matches=useRef<HTMLElement[]>([]),index=useRef(-1),input=useRef<HTMLInputElement|null>(null),quick=useRef<HTMLDivElement|null>(null),timers=useRef(new Set<ReturnType<typeof setTimeout>>());
 const update=(patch:Partial<typeof view>)=>{state.current={...state.current,...patch};flushSync(()=>setView(state.current));};
 function clearHighlight(){messages.rows().filter(row=>row.classList.contains('is-search-current')).forEach(row=>messages.toggle(row,'is-search-current',false));}
 function closeMore(){update({more:false});}
 function closeSearch(){update({search:false,results:false,rows:[],query:'',count:''});matches.current=[];index.current=-1;clearHighlight();}
 function openMore(){services.current?.closeMessage();closeSearch();update({more:true});}
 function search(value:string){const query=value.trim().toLocaleLowerCase();clearHighlight();matches.current=query?messages.rows().filter(row=>row.classList.contains('chat-message-row')&&!row.querySelector('.chat-voice-control,.chat-voice-audio')&&services.current!.text(row).toLocaleLowerCase().includes(query)):[];index.current=matches.current.length?0:-1;
  const peer=refs.get('chatRoomName')?.textContent?.trim()||'对方',room=refs.get('chatRoomView');
  const rows=matches.current.slice().reverse().map(row=>{const full=services.current!.text(row),lower=full.toLocaleLowerCase(),parts:SearchResult['parts']=[];let from=0,at=lower.indexOf(query,from);while(at!==-1){if(at>from)parts.push({text:full.slice(from,at),marked:false});parts.push({text:full.slice(at,at+query.length),marked:true});from=at+query.length;at=lower.indexOf(query,from);}if(from<full.length)parts.push({text:full.slice(from),marked:false});const date=new Date(Number(row.dataset.sentAt)),pad=(n:number)=>String(n).padStart(2,'0'),time=Number.isFinite(date.getTime())&&Number(row.dataset.sentAt)?`${date.getFullYear()}-${pad(date.getMonth()+1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}`:'';return {row,parts,time,name:row.dataset.sender||(row.classList.contains('is-user')?'我':peer),avatar:room?.querySelector<HTMLElement>(row.classList.contains('is-user')?'[data-cr-self-photo]':'[data-cr-peer-photo]')?.style.backgroundImage||''};});
  update({query:value,count:query?`${matches.current.length} 条`:'',results:!!query,rows});
 }
 function openSearch(text=''){closeMore();services.current?.closeMessage();update({search:true,query:text});if(text)search(text);else{matches.current=[];index.current=-1;clearHighlight();update({count:''});}requestAnimationFrame(()=>input.current?.focus());}
 function navigate(step:number){if(!matches.current.length)return;clearHighlight();index.current=(index.current+step+matches.current.length)%matches.current.length;const row=matches.current[index.current];messages.toggle(row,'is-search-current',true);update({count:`${index.current+1}/${matches.current.length}`});messages.scrollTo(row);}
 function jump(row:HTMLElement){closeSearch();messages.scrollTo(row);messages.toggle(row,'is-quote-target',false);void row.offsetWidth;messages.toggle(row,'is-quote-target',true);const timer=setTimeout(()=>{messages.toggle(row,'is-quote-target',false);timers.current.delete(timer);},1300);timers.current.add(timer);}
 const api=useRef<RoomToolsApi|null>(null);if(!api.current)api.current={closeMore,closeSearch,openSearch,closeQuick:()=>update({quick:false,quickTouched:true})};
 useEffect(()=>{const key=(event:KeyboardEvent)=>{if(event.key!=='Escape')return;if(state.current.more){event.preventDefault();closeMore();}else if(state.current.search){event.preventDefault();closeSearch();}};document.addEventListener('keydown',key);return()=>{document.removeEventListener('keydown',key);timers.current.forEach(clearTimeout);};},[]);
 return {view,services,api:api.current,input,quick,search,navigate,jump,toggleMore(){if(state.current.more)closeMore();else openMore();},toggleQuick(){const opened=!state.current.quick;update({quick:opened});if(opened&&quick.current)quick.current.scrollLeft=0;},settings:()=>navigation.openSettings()};
}
export function ChatRoomToolsProvider({children}:{children:ReactNode}){const tools=useRoomTools();useLayoutEffect(()=>{const connect=(event:Event)=>{const detail=(event as CustomEvent<{services:RoomToolsServices;accept(api:RoomToolsApi):void}>).detail;tools.services.current=detail.services;detail.accept(tools.api);};window.addEventListener('qingtuan:chat-room-tools-connect',connect);return()=>window.removeEventListener('qingtuan:chat-room-tools-connect',connect);},[tools.api,tools.services]);return <Context.Provider value={tools}>{children}</Context.Provider>;}
export function useChatRoomTools(){const tools=useContext(Context);if(!tools)throw Error('ChatRoomToolsProvider is required');return tools;}
