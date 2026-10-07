import { useLayoutEffect, useRef, useState } from 'react';
import type { HTMLAttributes, Ref } from 'react';
interface Props extends Omit<HTMLAttributes<HTMLElement>, 'onChange'> {
  as?: 'span' | 'div'; value: string; onChange: (value: string) => void;
  emptyClass?: string; singleLinePaste?: boolean;
}
/** contenteditable 用 ref 同步外部值，输入时保留浏览器的光标和撤销记录。 */
export function EditableText({ as: Tag = 'span', value, onChange, emptyClass, singleLinePaste, className, ...props }: Props) {
  const ref = useRef<HTMLElement>(null);
  const initial = useRef(value);
  const [focused, setFocused] = useState(false);
  useLayoutEffect(() => {
    const element = ref.current;
    if (element && document.activeElement !== element && element.textContent !== value) element.textContent = value;
  }, [value]);
  return <Tag {...props} ref={ref as Ref<HTMLDivElement> & Ref<HTMLSpanElement>} className={`${className || ''}${emptyClass && !focused && !value.trim() ? ` ${emptyClass}` : ''}`} contentEditable suppressContentEditableWarning onFocus={() => setFocused(true)} onInput={event => onChange(event.currentTarget.textContent || '')} onBlur={event => {
    setFocused(false); if (emptyClass && !event.currentTarget.textContent?.trim()) { event.currentTarget.textContent = ''; }
  }} onKeyDown={event => { if (event.key === 'Enter') { event.preventDefault(); event.currentTarget.blur(); } }} onPaste={singleLinePaste ? event => {
    event.preventDefault();
    const text = event.clipboardData.getData('text').replace(/\s*\n+\s*/g, ' ');
    document.execCommand('insertText', false, text);
    onChange(event.currentTarget.textContent || '');
  } : props.onPaste}>{initial.current}</Tag>;
}
