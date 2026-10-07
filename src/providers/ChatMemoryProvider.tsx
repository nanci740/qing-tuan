import {createContext,useContext,useRef,useState} from 'react';
import type {ReactNode,ChangeEvent} from 'react';
import {showToast} from '../utils/toast';
import { prepareImage, readImageSlot, saveImageSlots } from '../utils/imageAssets';
const PHOTO_IDS=['chatMemoryStar','chatMemoryPolaroid','chatMemoryMoon','chatMemoryExtra'];
const photoKey=(id:string)=>'smallphone_chat_memory_photo_v1_'+id;
const Context=createContext<ReturnType<typeof useMemory>|null>(null);
function useMemory(){
 const input=useRef<HTMLInputElement|null>(null),editing=useRef(''),saving=useRef(new Set<string>());
 const [photos,setPhotos]=useState<Record<string,string>>(()=>Object.fromEntries(PHOTO_IDS.map(id=>[id,readImageSlot(photoKey(id))])));
 function open(id:string){editing.current=id;if(input.current){input.current.value='';input.current.click();}}
 async function change(event:ChangeEvent<HTMLInputElement>){
  const id=editing.current,file=event.currentTarget.files?.[0];event.currentTarget.value='';
  if(!file||!PHOTO_IDS.includes(id)||saving.current.has(id))return;
  saving.current.add(id);
  try{const data=await prepareImage(file,1000,.82);await saveImageSlots({[photoKey(id)]:data});setPhotos(previous=>({...previous,[id]:data}));showToast('照片已保存');}
  catch{showToast('照片保存失败，请检查图片或浏览器存储空间');}
  finally{saving.current.delete(id);}
 }
 return {photos,input,open,change};
}
export function ChatMemoryProvider({children}:{children:ReactNode}){const state=useMemory();return <Context.Provider value={state}>{children}</Context.Provider>;}
export function useChatMemory(){const state=useContext(Context);if(!state)throw Error('ChatMemoryProvider is required');return state;}
