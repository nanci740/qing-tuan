import { useRef, useState } from 'react';
import type { MouseEvent, PointerEvent, TouchEvent } from 'react';
const IGNORE = '#progressBarBg, .chat-app-page, .world-page, #dockBar, input, textarea, [contenteditable="true"]';
export function useHomePagination(count = 2) {
  const [page,setPage]=useState(0);
  const latest=useRef(page);latest.current=page;
  const gesture=useRef({x:0,y:0,tracking:false});
  const go=(n:number)=>setPage(((n%count)+count)%count);
  function start(x:number,y:number,target:EventTarget|null) { gesture.current={x,y,tracking:!(target instanceof Element && target.closest(IGNORE))}; }
  function end(x:number,y:number) {
    if(!gesture.current.tracking)return;
    const {x:sx,y:sy}=gesture.current;gesture.current.tracking=false;
    const dx=x-sx,dy=y-sy;
    if(Math.abs(dx)<50||Math.abs(dx)<Math.abs(dy)*1.5)return;
    go(dx<0?latest.current+1:latest.current-1);
  }
  return { page, go,
    select:(n:number,event:MouseEvent)=>{event.stopPropagation();go(n);},
    onTouchStart:(event:TouchEvent)=>{if(event.touches.length!==1){gesture.current.tracking=false;return;}start(event.touches[0].clientX,event.touches[0].clientY,event.target);},
    onTouchEnd:(event:TouchEvent)=>{const touch=event.changedTouches[0];if(touch)end(touch.clientX,touch.clientY);},
    onPointerDown:(event:PointerEvent)=>{if(event.pointerType==='mouse')start(event.clientX,event.clientY,event.target);},
    onPointerUp:(event:PointerEvent)=>{if(event.pointerType==='mouse')end(event.clientX,event.clientY);},
  };
}
