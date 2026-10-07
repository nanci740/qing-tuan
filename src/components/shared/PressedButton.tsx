import type { ComponentPropsWithRef } from 'react';
import { useButtonPress } from '../../hooks/useButtonPress';
/** 按钮按下效果统一：首次按下按边框选择内凹或轻移；状态与事件由 React 管理。 */
export function PressedButton({className,onPointerDownCapture,...props}:ComponentPropsWithRef<'button'>&{'data-sp-press'?:string}){const press=useButtonPress(className);return <button {...props} className={press.className} data-sp-press={press['data-sp-press']??props['data-sp-press']} onPointerDownCapture={event=>{press.onPointerDownCapture(event);onPointerDownCapture?.(event);}}/>;}
