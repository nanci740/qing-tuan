import {useLayoutEffect,useRef,useState} from 'react';
import {useChatSelection} from '../providers/ChatSelectionProvider';
import type {ChatSelectionServices,SelectionTool} from '../types/chatSelection';
export function useChatSelectionToolbar(){
 const [services,setServices]=useState<ChatSelectionServices|null>(null);
 const service=useRef<ChatSelectionServices|null>(null);
 const {view}=useChatSelection();
 const header=useRef<HTMLDivElement>(null),toolbar=useRef<HTMLDivElement>(null);
 const mounted=useRef(false);
 useLayoutEffect(()=>{
  const connect=(event:Event)=>{
   const detail=(event as CustomEvent<{services:ChatSelectionServices}>).detail;
   service.current=detail.services;setServices(detail.services);
  };
  window.addEventListener('qingtuan:selection-toolbar-connect',connect);
  return()=>window.removeEventListener('qingtuan:selection-toolbar-connect',connect);
 },[]);
 useLayoutEffect(()=>{
  if(!services||!header.current||!toolbar.current||mounted.current)return;
  services.host.insertBefore(header.current,services.headerAnchor);services.headerAnchor.remove();
  services.host.insertBefore(toolbar.current,services.toolbarAnchor);services.toolbarAnchor.remove();
  mounted.current=true;
 },[services]);
 async function action(tool:SelectionTool){
  const api=service.current;if(!api)return;
  if(tool==='cancel'){api.clear();return;}
  if(tool==='search'){api.clear();api.search();return;}
  const rows=api.rows();
  if(!rows.length){api.notice('请先选择消息');return;}
  try{
   if(tool==='copy'){await api.copy(rows.map(api.quote).join('\n'));api.notice('已复制');api.clear();return;}
   if(tool==='forward'){api.forward(rows);api.clear();return;}
   if(tool==='favorite'){
    const shouldFavorite=rows.some(row=>!api.favorite(row));
    rows.forEach(row=>api.setFavorite(row,shouldFavorite));
    api.notice(shouldFavorite?'已收藏所选消息':'已取消收藏');api.clear();return;
   }
   // 单条与多选消息共用青团机自定义磨砂删除弹窗，由 React 管理。
   if(tool==='delete'){void api.remove(rows);return;}
  }catch(error){api.notice(api.error(error));}
 }
 return {services,view,header,toolbar,action};
}
