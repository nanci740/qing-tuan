import { PRESS_TARGET, PRESS_SKIP, buttonPressKind } from '../utils/buttonPress';
import { useEffect, useRef, useState } from 'react';
import { flushSync } from 'react-dom';
import type { PointerEventHandler } from 'react';
/** 按下立即反馈，短点保留 120ms；不延迟点击操作，滑动及取消立即释放。 */
export function useButtonPress(baseClass?:string){
 const [previous,setPrevious]=useState(baseClass),[tokens,setTokens]=useState(()=>baseClass?.split(/\s+/).filter(Boolean)||[]),[marked,setMarked]=useState(()=>!!baseClass?.split(/\s+/).some(token=>token==='sp-press'||token==='sp-press-bare')),[hadClass,setHadClass]=useState(baseClass!==undefined);
 const [pressed,setPressed]=useState(false);
 const cleanup=useRef<()=>void>(()=>{});
 useEffect(()=>()=>cleanup.current(),[]);
 if(previous!==baseClass){const required=baseClass?.split(/\s+/).filter(Boolean)||[],next=tokens.filter(token=>token==='sp-press'||token==='sp-press-bare'||required.includes(token));for(const token of required)if(!next.includes(token))next.push(token);setPrevious(baseClass);setTokens(next);if(baseClass!==undefined)setHadClass(true);}
 const onPointerDownCapture:PointerEventHandler<HTMLElement>=event=>{
  const element=event.currentTarget;
  if(!event.isPrimary||(event.pointerType==='mouse'&&event.button!==0)||element.matches(':disabled,[aria-disabled="true"]')||element.matches(PRESS_SKIP)||(event.target instanceof Element&&event.target.closest(PRESS_TARGET)!==element))return;
  cleanup.current();
  const kind=element.classList.contains('sp-press')?'sp-press':element.classList.contains('sp-press-bare')?'sp-press-bare':buttonPressKind(element);
  const started=performance.now(),id=event.pointerId,x=event.clientX,y=event.clientY;
  let timer:ReturnType<typeof setTimeout>|undefined;
  const detach=()=>{window.removeEventListener('pointerup',up);window.removeEventListener('pointercancel',cancel);window.removeEventListener('pointermove',move);window.removeEventListener('blur',blur);};
  const release=(immediate:boolean)=>{detach();clearTimeout(timer);const wait=immediate?0:Math.max(0,120-(performance.now()-started));if(wait)timer=setTimeout(()=>setPressed(false),wait);else setPressed(false);};
  const up=(e:globalThis.PointerEvent)=>{if(e.pointerId===id)release(false);};
  const cancel=(e:globalThis.PointerEvent)=>{if(e.pointerId===id)release(true);};
  const move=(e:globalThis.PointerEvent)=>{if(e.pointerId===id&&(Math.hypot(e.clientX-x,e.clientY-y)>9||!element.contains(e.target as Node)))release(true);};
  const blur=()=>release(true);
  cleanup.current=()=>{detach();clearTimeout(timer);};
  window.addEventListener('pointerup',up);window.addEventListener('pointercancel',cancel);window.addEventListener('pointermove',move);window.addEventListener('blur',blur);
  flushSync(()=>{setMarked(true);setHadClass(true);setTokens(current=>current.includes(kind)?current:[...current,kind]);setPressed(true);});
 };
 const className=!marked&&baseClass!==undefined?baseClass:tokens.length?tokens.join(' '):hadClass?'':undefined;
 return {className:pressed?[className,'sp-is-pressed'].filter(Boolean).join(' '):className,'data-sp-press':marked?'1':undefined,onPointerDownCapture};
}
