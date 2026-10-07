import type { ComponentPropsWithRef } from 'react';
import { useButtonPress } from '../../hooks/useButtonPress';
/** 保留原 div 标签，只为原有按钮角色提供 React 按压状态。 */
export function PressedDiv({className,onPointerDownCapture,...props}:ComponentPropsWithRef<'div'>){const press=useButtonPress(className);return <div {...props} className={press.className} data-sp-press={press['data-sp-press']} onPointerDownCapture={event=>{press.onPointerDownCapture(event);onPointerDownCapture?.(event);}}/>;}
