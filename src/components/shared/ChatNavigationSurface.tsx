import {useNativeRefs} from '../../providers/NativeRefsProvider';
import { createElement, useCallback, useRef, useState } from 'react';
import type { CSSProperties, ReactNode } from 'react';
import { useChatNavigation } from '../../providers/ChatNavigationProvider';
import type { ChatSurfaceKey } from '../../providers/ChatNavigationProvider';

/** 页面显示状态由 React 管理。尚未迁移的气泡、壁纸和选择模式类在切换时保留原顺序。 */
export function useChatNavigationSurface(surface: ChatSurfaceKey, initialClass: string, initialHidden?: boolean, elementRef?: (element: HTMLElement | null) => void) {
  const navigation = useChatNavigation();
  const element = useRef<HTMLElement | null>(null);
  const [data,setData]=useState<Record<string,string>>({});
  const [style, setStyle] = useState<CSSProperties>();
  const [state, setState] = useState({ className: initialClass, hidden: initialHidden });
  const forwardedRef = useRef(elementRef); forwardedRef.current = elementRef;
  const ref = useCallback((node: HTMLElement | null) => {
    element.current = node; forwardedRef.current?.(node);
    navigation.register(surface, node ? { data(key,value){setData(previous=>({...previous,[key]:value}));},style(key, value) { setStyle(previous=>({...previous,[key]:value})); }, measure() { element.current?.getBoundingClientRect(); }, toggle(token, enabled, hidden) {
      setState(previous=>{const tokens=previous.className.split(/\s+/).filter(Boolean),index=tokens.indexOf(token);if(enabled&&index<0)tokens.push(token);if(!enabled&&index>=0)tokens.splice(index,1);return {className:tokens.join(' '),hidden:hidden??previous.hidden};});
    } } : null);
  }, [navigation, surface, initialClass]);
  return { ...data,ref, style, className: state.className, 'aria-hidden': state.hidden };
}
export function ChatNavigationSurface({ surface, tag = 'div', id, className, hidden, children, elementRef, style }: {
  surface: ChatSurfaceKey; tag?: 'div' | 'section'; id: string; className: string; hidden?: boolean;
  style?: CSSProperties; children: ReactNode; elementRef?: (element: HTMLElement | null) => void;
}) {
  const registry=useNativeRefs();
  const forward=useCallback((element:HTMLElement|null)=>{registry?.register(id,element);elementRef?.(element);},[registry,id,elementRef]);
  const props = useChatNavigationSurface(surface, className, hidden, forward);
  return createElement(tag, { ...props, style: {...style,...props.style}, id }, children);
}
