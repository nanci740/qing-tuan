import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { readMyPresence, persistMyPresence } from '../utils/chatPresence';
export function useChatMyPresence(){const [me,setMe]=useState(readMyPresence),[open,setOpen]=useState(false),[selection,setSelection]=useState<string|null>(null),[custom,setCustom]=useState(''),[position,setPosition]=useState<{left:string;top:string}>(),button=useRef<HTMLButtonElement>(null),menu=useRef<HTMLDivElement>(null),input=useRef<HTMLInputElement>(null);
 const openRef=useRef(open);openRef.current=open;
 function place(){if(!button.current||!menu.current)return;const rect=button.current.getBoundingClientRect(),menuRect=menu.current.getBoundingClientRect();let top=rect.top-menuRect.height-2;if(top<8)top=rect.bottom+2;setPosition({left:Math.max(8,Math.min(window.innerWidth-menuRect.width-8,rect.right-menuRect.width))+'px',top:top+'px'});}
 function toggle(){if(open){setOpen(false);return;}const current=readMyPresence();setSelection(current.custom?null:current.online);setCustom(current.custom?current.online:'');setOpen(true);}
 function choose(online:string){setMe(persistMyPresence(online));setOpen(false);}
 function saveCustom(){const text=custom.trim().slice(0,8);if(!text){input.current?.focus();return;}choose(text);}
 useLayoutEffect(()=>{if(open)place();else if(menu.current?.contains(document.activeElement)&&document.activeElement instanceof HTMLElement)document.activeElement.blur();},[open]);
 useEffect(()=>{const outside=()=>setOpen(false),resize=()=>{if(!openRef.current)return;if(document.activeElement===input.current)place();else setOpen(false);};document.addEventListener('click',outside);window.addEventListener('resize',resize);return()=>{document.removeEventListener('click',outside);window.removeEventListener('resize',resize);};},[]);
 return {me,open,selection,custom,position,button,menu,input,toggle,choose,saveCustom,setCustom,setOpen};
}
