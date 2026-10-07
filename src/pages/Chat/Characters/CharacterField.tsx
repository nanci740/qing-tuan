import { useCallback, useLayoutEffect, useRef } from 'react';
import type { KeyboardEventHandler } from 'react';
interface FieldProps {
  as: 'input' | 'textarea';
  value: unknown;
  version?: number;
  placeholder?: string;
  rows?: number;
  className?: string;
  'data-field'?: string;
  onValue: (value: string) => void;
  onKeyDown?: KeyboardEventHandler<HTMLInputElement | HTMLTextAreaElement>;
}
/** 原输入的 value 是 DOM 属性而非 HTML attribute；ref 同步外部档案切换，编辑由 React 状态接收。 */
export function CharacterField({
  as,
  value,
  version,
  onValue,
  ...props
}: FieldProps) {
  const ref = useRef<HTMLInputElement | HTMLTextAreaElement | null>(null);
  useLayoutEffect(() => {
    const next = String(value || '');
    if (ref.current && ref.current.value !== next) ref.current.value = next;
  }, [value, version]);
  const bind = useCallback((node: HTMLInputElement | HTMLTextAreaElement | null) => {
    ref.current = node;
    if (props['data-field'] === 'name') window.dispatchEvent(new CustomEvent('qingtuan:character-name-input', {
      detail: node
    }));
  }, [props['data-field']]);
  const shared = {
    ...props,
    onInput: (event: React.FormEvent<HTMLInputElement | HTMLTextAreaElement>) => onValue(event.currentTarget.value)
  };
  return as === 'input' ? <input {...shared} ref={bind} /> : <textarea {...shared} ref={bind} />;
}
