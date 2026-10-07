import { useEffect, useRef, useState } from 'react';
import type { MutableRefObject } from 'react';
import { flushSync } from 'react-dom';
import type { ChatPreferenceServices } from '../types/chatPreferences';
import type { ChatBackup, ImportedChatBackup } from '../types/chatBackup';
import type { useChatAppearance } from './useChatAppearance';
import { useChatNavigation } from '../providers/ChatNavigationProvider';
import { confirmChat } from '../utils/chatConfirm';
import { showToast } from '../utils/toast';
import { getChatPreferenceDefaults, saveChatPreferencesOrThrow } from '../utils/chatPreferences';
import { blobToDataUrl, sanitizeImportedChatHtml } from '../utils/chatBackup';
import { readChatWallpaper, readChatFont, updateChatAssets } from '../utils/chatAppearance';
export function useChatData(services: MutableRefObject<ChatPreferenceServices | null>, appearance: ReturnType<typeof useChatAppearance>) {
 const navigation = useChatNavigation();
 const input = useRef<HTMLInputElement | null>(null), downloadLink = useRef<HTMLAnchorElement | null>(null);
 const [download, setDownload] = useState<{url:string;name:string}|null>(null);
 const urls = useRef(new Map<ReturnType<typeof setTimeout>, string>());
 useEffect(()=>()=>{for(const [timer,url] of urls.current){clearTimeout(timer);URL.revokeObjectURL(url);}urls.current.clear();},[]);
 async function confirm(title:string,message:string,danger=false) {return confirmChat({title,message,confirmText:'确定',cancelText:'取消',danger});}
 async function exportCurrent() {
  const service=services.current;if(!service)return;
  const key=service.currentKey(), preferences={...service.readCurrent()}, html=service.readMessages(), chatName=service.chatName();
  try {
  let wallpaperDataUrl='',fontDataUrl='';
  const wallpaper=await readChatWallpaper(key);if(wallpaper)wallpaperDataUrl=await blobToDataUrl(wallpaper);
  if(preferences.fontType==='file'){const font=await readChatFont(key);if(!font)throw new Error('找不到已保存的字体，导出已停止');fontDataUrl=await blobToDataUrl(font);}
  const payload:ChatBackup={format:'qingtuan-chat',version:1,exportedAt:new Date().toISOString(),chatKey:key,chatName:chatName.trim()||'聊天',html,preferences,wallpaperDataUrl,fontDataUrl};
  const blob=new Blob([JSON.stringify(payload,null,2)],{type:'application/json;charset=utf-8'}),url=URL.createObjectURL(blob);
  const name=`qingtuan-chat-${payload.chatName.replace(/[\\/:*?"<>|]/g,'_')}-${new Date().toISOString().slice(0,10)}.json`;
  flushSync(()=>setDownload({url,name}));downloadLink.current!.click();flushSync(()=>setDownload(null));
  const timer=setTimeout(()=>{URL.revokeObjectURL(url);urls.current.delete(timer);},1000);urls.current.set(timer,url);
  showToast('当前聊天已导出');
  }catch(error){showToast((error as Error).message||'聊天资源读取失败，导出已停止');}
 }
 function chooseImport(){if(input.current){input.current.value='';input.current.click();}}
 async function importCurrent(file:File){
  const service=services.current;if(!service)return;
  const key=service.currentKey();
  try {
   const payload:ImportedChatBackup|null=JSON.parse(await file.text());
   if(payload?.format!=='qingtuan-chat'||typeof payload.html!=='string')throw new Error('不是有效的青团机聊天备份');
   if(!await confirm('导入聊天','导入会覆盖当前角色的聊天记录，其他角色不会受影响。',true))return;
   if(key!==service.currentKey())return;
   const assets:{wallpaper?:Blob;font?:Blob}={};
   if(typeof payload.wallpaperDataUrl==='string'&&payload.wallpaperDataUrl.startsWith('data:image/')){
    const blob=await fetch(payload.wallpaperDataUrl).then(response=>response.blob());assets.wallpaper=blob;
    const url=URL.createObjectURL(blob);
    try{const image=new Image();image.src=url;await image.decode();}finally{URL.revokeObjectURL(url);}
   }
   if(typeof payload.fontDataUrl==='string'&&payload.fontDataUrl.startsWith('data:')){
    const blob=await fetch(payload.fontDataUrl).then(response=>response.blob());assets.font=blob;
    await new FontFace('ChatBackupFontValidation',await blob.arrayBuffer()).load();
   }
   if(key!==service.currentKey())return;
   const [wallpaper,font]=await Promise.all([readChatWallpaper(key),readChatFont(key)]);
   // Store both resources together before replacing the visible chat or preferences.
   await updateChatAssets(key,assets);
   try{
    if(payload.preferences&&typeof payload.preferences==='object'&&!Array.isArray(payload.preferences))saveChatPreferencesOrThrow(key,{...getChatPreferenceDefaults(),...payload.preferences});
   }catch(error){
    try{await updateChatAssets(key,{wallpaper,font});}
    catch{throw new Error('导入失败，资源恢复失败，请重新选择壁纸和字体');}
    throw error;
   }
   if(key!==service.currentKey())return;
   service.replaceMessages(sanitizeImportedChatHtml(payload.html));service.apply();
   const loaded=await appearance.applyChatFont(true);await appearance.applyChatWallpaper();
   if(key!==service.currentKey())return;
   service.finishImport();navigation.closeSettings();showToast(loaded?'聊天记录已导入':'聊天记录已导入，字体载入失败，请检查字体设置');
  }catch(error){showToast((error as Error).message||'聊天记录导入失败');}
 }
 async function resetPreferences(){
  const service=services.current;if(!service)return;
  const key=service.currentKey();
  if(!await confirm('恢复聊天设置','恢复当前角色的聊天设置，并移除专属壁纸与字体。'))return;
  if(key!==service.currentKey())return;
  try {
   const [wallpaper,font]=await Promise.all([readChatWallpaper(key),readChatFont(key)]);
   await updateChatAssets(key,{wallpaper:null,font:null});
   try{saveChatPreferencesOrThrow(key,getChatPreferenceDefaults());}
   catch(error){
    try{await updateChatAssets(key,{wallpaper,font});}
    catch{throw new Error('设置恢复失败，资源恢复失败，请重新选择壁纸和字体');}
    throw error;
   }
   if(key!==service.currentKey())return;
   service.apply();showToast('当前角色设置已恢复默认');
  }catch(error){showToast((error as Error).message||'设置恢复失败，请重试');}
 }
 async function clearCurrent(){
  if(!await confirm('清空聊天','当前角色的全部聊天记录都会被清除，此操作无法撤销。',true))return;
  services.current?.clearMessages();navigation.closeSettings();showToast('当前聊天已清空');
 }
 return {input,download,downloadLink,exportCurrent,chooseImport,importCurrent,resetPreferences,clearCurrent};
}
