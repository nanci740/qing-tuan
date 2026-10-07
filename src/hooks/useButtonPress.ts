import { PRESS_TARGET, PRESS_SKIP, buttonPressKind } from '../utils/buttonPress';
import { useState } from 'react';
import type { PointerEventHandler } from 'react';
/** 原按钮按下效果：首次按下依边框选择内凹或轻移；保留类名加入顺序。 */
export function useButtonPress(baseClass?:string){const [previous,setPrevious]=useState(baseClass),[tokens,setTokens]=useState(()=>baseClass?.split(/\s+/).filter(Boolean)||[]),[marked,setMarked]=useState(()=>!!baseClass?.split(/\s+/).some(token=>token==='sp-press'||token==='sp-press-bare')),[hadClass,setHadClass]=useState(baseClass!==undefined);
 if(previous!==baseClass){const required=baseClass?.split(/\s+/).filter(Boolean)||[],next=tokens.filter(token=>token==='sp-press'||token==='sp-press-bare'||required.includes(token));for(const token of required)if(!next.includes(token))next.push(token);setPrevious(baseClass);setTokens(next);if(baseClass!==undefined)setHadClass(true);}
 const onPointerDownCapture:PointerEventHandler<HTMLElement>=event=>{const element=event.currentTarget;if(marked||element.matches(PRESS_SKIP)||(event.target instanceof Element&&event.target.closest(PRESS_TARGET)!==element))return;const kind=element.classList.contains('sp-press')?'sp-press':element.classList.contains('sp-press-bare')?'sp-press-bare':buttonPressKind(element);setMarked(true);setHadClass(true);setTokens(current=>current.includes(kind)?current:[...current,kind]);};
 return {className:!marked&&baseClass!==undefined?baseClass:tokens.length?tokens.join(' '):hadClass?'':undefined,'data-sp-press':marked?'1':undefined,onPointerDownCapture};
}
