import {useButtonPress} from '../../hooks/useButtonPress';
import {showToast} from '../../utils/toast';
import {useNativeRefs} from '../../providers/NativeRefsProvider';
import { createElement, useCallback, useState } from 'react';
import type { OriginalElementProps } from '../../types/dom';

/**
 * Preserve native HTML/SVG attributes, inline styles and native event attributes.
 * Static compatibility fields preserve their original default attributes.
 * Interactive features use native React controls and provider state.
 * This component adds no wrapper element and performs no design substitutions.
 */
export function OriginalElement({ tag, attributes = [], children, initialText, onClick, elementRef }: OriginalElementProps) {
  const registry=useNativeRefs();
  const baseClass=attributes.find(attribute=>attribute.name==='class')?.value;
  const press=useButtonPress(baseClass);
  const pressable=tag==='button'||attributes.some(attribute=>attribute.name==='role'&&attribute.value==='button')||baseClass?.split(/\s+/).some(token=>['btn','back-btn','vi-btn'].includes(token));
  const handleClick:typeof onClick=event=>{onClick?.(event);const action=attributes.find(attribute=>attribute.name==='data-chat-action')?.value;if(action){const labels:Record<string,string>={image:'图片',camera:'拍照',draw:'生图',location:'位置',world:'世界书'};showToast(`${labels[action]||'这个功能'}入口已留好，之后接入`);}if(event.currentTarget.matches('.chat-subnav-item:not(.active)'))showToast(`${event.currentTarget.querySelector('span')?.textContent||'这个页面'} 之后接入`);};
  const pressProps=pressable?{className:press.className,'data-sp-press':press['data-sp-press'],onPointerDownCapture:press.onPointerDownCapture}:{};
  const id=attributes.find(attribute=>attribute.name==='id')?.value;
  // 静态兼容输入保留原默认值，但 type 必须交给 React，避免输入事件后的恢复移除原生 type 属性。
  const [inputType, setInputType] = useState(() => attributes.find(attribute => attribute.name === 'type')?.value);
  const setNativeAttributes = useCallback((element: Element | null): void => {
    if(id)registry?.register(id,element);
    elementRef?.(element);
    if (!element) return;
    for (const attribute of attributes) {
      if (tag === 'input' && attribute.name === 'type') continue;
      const name = attribute.prefix ? `${attribute.prefix}:${attribute.name}` : attribute.name;
      if (attribute.namespace) element.setAttributeNS(attribute.namespace, name, attribute.value);
      else element.setAttribute(name, attribute.name==='class'&&pressable?(press.className??attribute.value):attribute.value);
    }
    // React initializes uncontrolled inputs before refs run. Restore parsed HTML
    // defaults explicitly so a native checked/value attribute keeps its state.
    if (element instanceof HTMLInputElement) {
      const value = attributes.find(attribute => attribute.name === 'value');
      if (value && element.type !== 'file') {
        element.defaultValue = value.value;
        element.value = value.value;
      }
      if (attributes.some(attribute => attribute.name === 'checked')) {
        element.defaultChecked = true;
        element.checked = true;
      }
    }
    if (element instanceof HTMLOptionElement && attributes.some(attribute => attribute.name === 'selected')) {
      element.defaultSelected = true;
      element.selected = true;
    }
  }, [attributes, tag, elementRef,registry,id,pressable,press.className]);

  if (tag === 'textarea') {
    return createElement(tag, { ref: setNativeAttributes, defaultValue: initialText ?? '' });
  }
  if (tag === 'input') return createElement(tag, { ref: setNativeAttributes, type: inputType, defaultValue: inputType === 'file' ? undefined : attributes.find(attribute => attribute.name === 'value')?.value, defaultChecked: attributes.some(attribute => attribute.name === 'checked') ? true : undefined, onClick, onChange: (event: React.ChangeEvent<HTMLInputElement>) => setInputType(event.currentTarget.type) }, children);
  return createElement(tag, { ref: setNativeAttributes,...pressProps, onClick:handleClick }, children);
}
